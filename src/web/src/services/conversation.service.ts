/**
 * @fileoverview Enhanced conversation service for managing real-time voice interactions
 * Implements secure WebSocket communication with comprehensive state management
 * @version 1.0.0
 */

import EventEmitter from 'events';
import { 
    Conversation, 
    Message, 
    ConversationStatus, 
    MessageRole 
} from '../types/conversation.types';
import { ApiService } from './api.service';
import { WebSocketService } from './websocket.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { WebSocketMessageType, WebSocketState } from '../types/websocket.types';

/**
 * Interface for conversation options
 */
interface ConversationOptions {
    sessionId: string;
    initialContext?: Record<string, unknown>;
}

/**
 * Enhanced conversation service for managing real-time voice interactions
 */
export class ConversationService {
    private currentConversation: Conversation | null = null;
    private readonly messageCache: Map<string, Message> = new Map();
    private readonly messageQueue: Array<{ message: Message; retries: number }> = [];
    private readonly events: EventEmitter = new EventEmitter();
    private readonly MAX_RETRIES = 3;
    private readonly MESSAGE_TIMEOUT = 5000;
    private readonly QUEUE_PROCESSING_INTERVAL = 100;

    constructor(
        private readonly apiService: ApiService,
        private readonly wsService: WebSocketService
    ) {
        this.setupWebSocketHandlers();
        this.startQueueProcessor();
    }

    /**
     * Initializes a new conversation session
     * @param options - Conversation configuration options
     * @returns Promise resolving to the created conversation
     */
    public async startConversation(options: ConversationOptions): Promise<Conversation> {
        try {
            const conversation = await this.apiService.post<Conversation>(
                API_ENDPOINTS.CONVERSATIONS.CREATE,
                {
                    sessionId: options.sessionId,
                    context: options.initialContext || {}
                }
            );

            this.currentConversation = conversation;
            this.events.emit('conversationStarted', conversation);

            return conversation;
        } catch (error) {
            throw new Error(`Failed to start conversation: ${error.message}`);
        }
    }

    /**
     * Sends a message with optimistic updates and retry logic
     * @param content - Message content
     * @param role - Message sender role
     * @returns Promise resolving to the sent message
     */
    public async sendMessage(content: string, role: MessageRole): Promise<Message> {
        if (!this.currentConversation) {
            throw new Error('No active conversation');
        }

        const optimisticMessage: Message = {
            id: crypto.randomUUID(),
            content,
            role,
            timestamp: Date.now(),
            hasAudio: false
        };

        // Optimistic update
        this.messageCache.set(optimisticMessage.id, optimisticMessage);
        this.events.emit('messageQueued', optimisticMessage);

        try {
            await this.enqueueMessage(optimisticMessage);
            return optimisticMessage;
        } catch (error) {
            this.messageCache.delete(optimisticMessage.id);
            this.events.emit('messageError', { messageId: optimisticMessage.id, error });
            throw error;
        }
    }

    /**
     * Retrieves conversation history with pagination
     * @param limit - Maximum number of messages to retrieve
     * @param before - Timestamp to fetch messages before
     * @returns Promise resolving to array of messages
     */
    public async getConversationHistory(
        limit: number = 50,
        before?: number
    ): Promise<Message[]> {
        if (!this.currentConversation) {
            throw new Error('No active conversation');
        }

        const params = {
            conversationId: this.currentConversation.id,
            limit,
            before
        };

        try {
            const messages = await this.apiService.get<Message[]>(
                API_ENDPOINTS.CONVERSATIONS.MESSAGES,
                { params }
            );
            
            messages.forEach(message => this.messageCache.set(message.id, message));
            return messages;
        } catch (error) {
            throw new Error(`Failed to fetch conversation history: ${error.message}`);
        }
    }

    /**
     * Ends the current conversation
     * @returns Promise resolving when conversation is ended
     */
    public async endConversation(): Promise<void> {
        if (!this.currentConversation) {
            return;
        }

        try {
            await this.apiService.post(
                `${API_ENDPOINTS.CONVERSATIONS.GET}/${this.currentConversation.id}/end`
            );
            
            this.currentConversation = null;
            this.messageCache.clear();
            this.events.emit('conversationEnded');
        } catch (error) {
            throw new Error(`Failed to end conversation: ${error.message}`);
        }
    }

    /**
     * Subscribes to conversation events
     * @param event - Event type to subscribe to
     * @param handler - Event handler function
     */
    public on(event: string, handler: (...args: any[]) => void): void {
        this.events.on(event, handler);
    }

    /**
     * Unsubscribes from conversation events
     * @param event - Event type to unsubscribe from
     * @param handler - Event handler function
     */
    public off(event: string, handler: (...args: any[]) => void): void {
        this.events.off(event, handler);
    }

    /**
     * Sets up WebSocket message handlers
     */
    private setupWebSocketHandlers(): void {
        this.wsService.on('message', (message: any) => {
            if (message.type === WebSocketMessageType.TRANSCRIPT) {
                this.handleTranscriptMessage(message.payload);
            }
        });

        this.wsService.on('error', (error: Error) => {
            this.events.emit('error', error);
        });

        this.wsService.on('stateChange', (state: WebSocketState) => {
            this.events.emit('connectionStateChange', state);
        });
    }

    /**
     * Handles incoming transcript messages
     */
    private handleTranscriptMessage(message: Message): void {
        this.messageCache.set(message.id, message);
        this.events.emit('messageReceived', message);
    }

    /**
     * Enqueues a message for sending with retry logic
     */
    private async enqueueMessage(message: Message): Promise<void> {
        return new Promise((resolve, reject) => {
            const queueItem = {
                message,
                retries: 0,
                resolve,
                reject,
                timestamp: Date.now()
            };

            this.messageQueue.push(queueItem);
        });
    }

    /**
     * Starts the message queue processor
     */
    private startQueueProcessor(): void {
        setInterval(() => {
            if (this.messageQueue.length === 0) return;

            const item = this.messageQueue[0];
            const age = Date.now() - item.timestamp;

            if (age > this.MESSAGE_TIMEOUT) {
                if (item.retries < this.MAX_RETRIES) {
                    item.retries++;
                    item.timestamp = Date.now();
                    this.events.emit('messageRetry', { 
                        messageId: item.message.id, 
                        attempt: item.retries 
                    });
                } else {
                    this.messageQueue.shift();
                    item.reject(new Error('Message sending timeout exceeded'));
                }
            }

            this.processQueueItem(item);
        }, this.QUEUE_PROCESSING_INTERVAL);
    }

    /**
     * Processes a single queue item
     */
    private async processQueueItem(item: any): Promise<void> {
        try {
            if (!this.currentConversation) {
                throw new Error('No active conversation');
            }

            await this.wsService.sendMessage({
                type: WebSocketMessageType.TRANSCRIPT,
                payload: item.message,
                timestamp: Date.now(),
                messageId: item.message.id,
                conversationId: this.currentConversation.id
            });

            this.messageQueue.shift();
            item.resolve();
        } catch (error) {
            if (item.retries >= this.MAX_RETRIES) {
                this.messageQueue.shift();
                item.reject(error);
            }
        }
    }
}