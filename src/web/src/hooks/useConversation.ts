/**
 * @fileoverview Enhanced React hook for managing voice-based AI conversations
 * Implements real-time conversation state management with comprehensive error recovery
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useWebSocket } from 'react-use-websocket'; // v4.5.0
import CircuitBreaker from 'circuit-breaker-js'; // v0.3.0

import { ConversationService } from '../services/conversation.service';
import { 
    Conversation,
    Message,
    MessageRole,
    ConversationStatus
} from '../types/conversation.types';
import { 
    WebSocketState,
    WebSocketMessage,
    WebSocketConfig
} from '../types/websocket.types';
import { AudioChunk, AudioFormat } from '../types/audio.types';
import { WEBSOCKET_DEFAULTS, WEBSOCKET_PERFORMANCE } from '../constants/websocket.constants';

// Interface for hook return value
interface UseConversationReturn {
    conversation: Conversation | null;
    isProcessing: boolean;
    error: Error | null;
    latencyMetrics: LatencyMetrics;
    startNewConversation: (sessionId: string) => Promise<void>;
    sendMessage: (content: string) => Promise<void>;
    sendAudioMessage: (audioChunk: AudioChunk) => Promise<void>;
    endCurrentConversation: () => Promise<void>;
    resetErrorState: () => void;
}

// Interface for latency tracking
interface LatencyMetrics {
    current: number;
    average: number;
    max: number;
    samples: number[];
}

/**
 * Enhanced conversation management hook with voice processing capabilities
 * Implements comprehensive error recovery and performance monitoring
 */
export function useConversation(): UseConversationReturn {
    const dispatch = useDispatch();
    const conversationService = useRef<ConversationService>(new ConversationService());
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics>({
        current: 0,
        average: 0,
        max: 0,
        samples: []
    });

    // Circuit breaker for error recovery
    const circuitBreaker = useRef(new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 30000,
        timeout: WEBSOCKET_DEFAULTS.CONNECTION_TIMEOUT
    }));

    // Message queue for reliability
    const messageQueue = useRef<Message[]>([]);
    const processingQueue = useRef<boolean>(false);

    // WebSocket connection with reconnection logic
    const { 
        sendMessage: wsSendMessage,
        lastMessage,
        readyState
    } = useWebSocket(process.env.REACT_APP_WEBSOCKET_URL || '', {
        reconnectAttempts: WEBSOCKET_DEFAULTS.RECONNECT_ATTEMPTS,
        reconnectInterval: WEBSOCKET_DEFAULTS.RECONNECT_INTERVAL,
        shouldReconnect: true
    });

    /**
     * Starts a new conversation with enhanced error recovery
     */
    const startNewConversation = useCallback(async (sessionId: string): Promise<void> => {
        if (readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket connection not established');
        }

        setIsProcessing(true);
        setError(null);

        try {
            await circuitBreaker.current.execute(async () => {
                const conversation = await conversationService.current.startConversation({
                    sessionId,
                    initialContext: {}
                });

                dispatch({ type: 'conversation/start', payload: conversation });
            });
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to start conversation'));
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [dispatch, readyState]);

    /**
     * Sends a message with voice processing capabilities
     */
    const sendMessage = useCallback(async (content: string): Promise<void> => {
        if (!content.trim()) {
            throw new Error('Message content cannot be empty');
        }

        setIsProcessing(true);

        try {
            const message = await conversationService.current.sendMessage(
                content,
                MessageRole.USER
            );

            messageQueue.current.push(message);
            processMessageQueue();
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to send message'));
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    /**
     * Sends an audio message with enhanced reliability
     */
    const sendAudioMessage = useCallback(async (audioChunk: AudioChunk): Promise<void> => {
        if (!audioChunk.data.length) {
            throw new Error('Audio chunk cannot be empty');
        }

        setIsProcessing(true);

        try {
            await circuitBreaker.current.execute(async () => {
                const message = {
                    type: 'audio',
                    payload: audioChunk,
                    timestamp: Date.now()
                };

                wsSendMessage(JSON.stringify(message));
                updateLatencyMetrics(Date.now() - message.timestamp);
            });
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to send audio message'));
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [wsSendMessage]);

    /**
     * Ends the current conversation
     */
    const endCurrentConversation = useCallback(async (): Promise<void> => {
        setIsProcessing(true);

        try {
            await conversationService.current.endConversation();
            dispatch({ type: 'conversation/end' });
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to end conversation'));
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [dispatch]);

    /**
     * Processes message queue with retry logic
     */
    const processMessageQueue = useCallback(async (): Promise<void> => {
        if (processingQueue.current || messageQueue.current.length === 0) {
            return;
        }

        processingQueue.current = true;

        try {
            while (messageQueue.current.length > 0) {
                const message = messageQueue.current[0];
                await circuitBreaker.current.execute(async () => {
                    wsSendMessage(JSON.stringify({
                        type: 'message',
                        payload: message,
                        timestamp: Date.now()
                    }));
                });
                messageQueue.current.shift();
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to process message queue'));
        } finally {
            processingQueue.current = false;
        }
    }, [wsSendMessage]);

    /**
     * Updates latency metrics
     */
    const updateLatencyMetrics = useCallback((latency: number): void => {
        setLatencyMetrics(prev => {
            const samples = [...prev.samples, latency].slice(-100);
            const average = samples.reduce((a, b) => a + b, 0) / samples.length;
            return {
                current: latency,
                average,
                max: Math.max(prev.max, latency),
                samples
            };
        });
    }, []);

    /**
     * Resets error state
     */
    const resetErrorState = useCallback((): void => {
        setError(null);
    }, []);

    // Handle WebSocket messages
    useEffect(() => {
        if (lastMessage) {
            try {
                const message = JSON.parse(lastMessage.data) as WebSocketMessage;
                updateLatencyMetrics(Date.now() - message.timestamp);
                dispatch({ type: 'conversation/messageReceived', payload: message });
            } catch (err) {
                setError(new Error('Failed to process WebSocket message'));
            }
        }
    }, [lastMessage, dispatch]);

    // Monitor connection state
    useEffect(() => {
        if (readyState === WebSocket.CLOSED) {
            setError(new Error('WebSocket connection closed'));
        }
    }, [readyState]);

    return {
        conversation: useSelector((state: any) => state.conversation.current),
        isProcessing,
        error,
        latencyMetrics,
        startNewConversation,
        sendMessage,
        sendAudioMessage,
        endCurrentConversation,
        resetErrorState
    };
}