/**
 * @fileoverview Unit tests for ConversationService
 * Tests conversation management, real-time communication, and performance requirements
 * @version 1.0.0
 */

import { ConversationService } from '../../../src/services/conversation.service';
import { ApiService } from '../../../src/services/api.service';
import { WebSocketService } from '../../../src/services/websocket.service';
import { 
    ConversationStatus, 
    MessageRole,
    type Message,
    type Conversation 
} from '../../../src/types/conversation.types';
import { WebSocketMessageType, WebSocketState } from '../../../src/types/websocket.types';

// Mock implementations
jest.mock('../../../src/services/api.service');
jest.mock('../../../src/services/websocket.service');

describe('ConversationService', () => {
    let conversationService: ConversationService;
    let apiServiceMock: jest.Mocked<ApiService>;
    let webSocketServiceMock: jest.Mocked<WebSocketService>;
    let performanceNow: number;

    // Test fixtures
    const mockSessionId = 'test-session-123';
    const mockConversationId = 'conv-123';
    const mockMessageId = 'msg-123';

    const mockConversation: Conversation = {
        id: mockConversationId,
        sessionId: mockSessionId,
        status: ConversationStatus.ACTIVE,
        messages: [],
        context: {
            lastMessageId: '',
            turnCount: 0,
            state: {}
        },
        metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            duration: 0
        }
    };

    const mockMessage: Message = {
        id: mockMessageId,
        content: 'Test message',
        role: MessageRole.USER,
        timestamp: Date.now(),
        hasAudio: false
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        performanceNow = Date.now();

        // Initialize mocks
        apiServiceMock = {
            post: jest.fn(),
            get: jest.fn(),
            delete: jest.fn()
        } as unknown as jest.Mocked<ApiService>;

        webSocketServiceMock = {
            connect: jest.fn(),
            sendMessage: jest.fn(),
            on: jest.fn(),
            off: jest.fn()
        } as unknown as jest.Mocked<WebSocketService>;

        // Initialize service
        conversationService = new ConversationService(
            apiServiceMock,
            webSocketServiceMock
        );

        // Mock performance.now
        jest.spyOn(performance, 'now').mockImplementation(() => performanceNow);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('startConversation', () => {
        it('should successfully start a new conversation', async () => {
            apiServiceMock.post.mockResolvedValue(mockConversation);

            const result = await conversationService.startConversation({
                sessionId: mockSessionId
            });

            expect(result).toEqual(mockConversation);
            expect(apiServiceMock.post).toHaveBeenCalledWith(
                expect.any(String),
                {
                    sessionId: mockSessionId,
                    context: {}
                }
            );
        });

        it('should handle API errors when starting conversation', async () => {
            const error = new Error('API Error');
            apiServiceMock.post.mockRejectedValue(error);

            await expect(
                conversationService.startConversation({ sessionId: mockSessionId })
            ).rejects.toThrow('Failed to start conversation');
        });

        it('should meet latency requirements for conversation start', async () => {
            apiServiceMock.post.mockResolvedValue(mockConversation);
            const startTime = Date.now();

            await conversationService.startConversation({
                sessionId: mockSessionId
            });

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(2000); // <2 seconds per requirements
        });
    });

    describe('sendMessage', () => {
        beforeEach(async () => {
            apiServiceMock.post.mockResolvedValue(mockConversation);
            await conversationService.startConversation({ sessionId: mockSessionId });
        });

        it('should successfully send a message', async () => {
            webSocketServiceMock.sendMessage.mockResolvedValue(undefined);

            const result = await conversationService.sendMessage(
                'Test message',
                MessageRole.USER
            );

            expect(result).toMatchObject({
                content: 'Test message',
                role: MessageRole.USER
            });
            expect(webSocketServiceMock.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: WebSocketMessageType.TRANSCRIPT
                })
            );
        });

        it('should handle message sending errors', async () => {
            webSocketServiceMock.sendMessage.mockRejectedValue(new Error('Send error'));

            await expect(
                conversationService.sendMessage('Test message', MessageRole.USER)
            ).rejects.toThrow();
        });

        it('should implement retry logic for failed messages', async () => {
            webSocketServiceMock.sendMessage
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockResolvedValueOnce(undefined);

            const result = await conversationService.sendMessage(
                'Test message',
                MessageRole.USER
            );

            expect(result).toBeDefined();
            expect(webSocketServiceMock.sendMessage).toHaveBeenCalledTimes(2);
        });

        it('should meet real-time latency requirements', async () => {
            webSocketServiceMock.sendMessage.mockResolvedValue(undefined);
            const startTime = Date.now();

            await conversationService.sendMessage('Test message', MessageRole.USER);

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(500); // <500ms per requirements
        });
    });

    describe('getConversationHistory', () => {
        beforeEach(async () => {
            apiServiceMock.post.mockResolvedValue(mockConversation);
            await conversationService.startConversation({ sessionId: mockSessionId });
        });

        it('should retrieve conversation history', async () => {
            const mockMessages = [mockMessage];
            apiServiceMock.get.mockResolvedValue(mockMessages);

            const result = await conversationService.getConversationHistory();

            expect(result).toEqual(mockMessages);
            expect(apiServiceMock.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: expect.objectContaining({
                        conversationId: mockConversationId
                    })
                })
            );
        });

        it('should handle pagination parameters', async () => {
            apiServiceMock.get.mockResolvedValue([mockMessage]);

            await conversationService.getConversationHistory(10, 123456789);

            expect(apiServiceMock.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: expect.objectContaining({
                        limit: 10,
                        before: 123456789
                    })
                })
            );
        });

        it('should handle errors when fetching history', async () => {
            apiServiceMock.get.mockRejectedValue(new Error('API Error'));

            await expect(
                conversationService.getConversationHistory()
            ).rejects.toThrow('Failed to fetch conversation history');
        });
    });

    describe('endConversation', () => {
        beforeEach(async () => {
            apiServiceMock.post.mockResolvedValue(mockConversation);
            await conversationService.startConversation({ sessionId: mockSessionId });
        });

        it('should successfully end conversation', async () => {
            apiServiceMock.post.mockResolvedValue(undefined);

            await conversationService.endConversation();

            expect(apiServiceMock.post).toHaveBeenCalledWith(
                expect.stringContaining(`/${mockConversationId}/end`)
            );
        });

        it('should handle errors when ending conversation', async () => {
            apiServiceMock.post.mockRejectedValue(new Error('API Error'));

            await expect(
                conversationService.endConversation()
            ).rejects.toThrow('Failed to end conversation');
        });

        it('should clean up resources after ending conversation', async () => {
            apiServiceMock.post.mockResolvedValue(undefined);

            await conversationService.endConversation();

            // Attempt to send message after end should fail
            await expect(
                conversationService.sendMessage('Test', MessageRole.USER)
            ).rejects.toThrow('No active conversation');
        });
    });

    describe('WebSocket Integration', () => {
        it('should handle WebSocket state changes', () => {
            const stateChangeHandler = jest.fn();
            conversationService.on('connectionStateChange', stateChangeHandler);

            // Simulate WebSocket state change
            const wsHandler = webSocketServiceMock.on.mock.calls.find(
                call => call[0] === 'stateChange'
            )?.[1];
            
            if (wsHandler) {
                wsHandler(WebSocketState.CONNECTED);
                expect(stateChangeHandler).toHaveBeenCalledWith(WebSocketState.CONNECTED);
            }
        });

        it('should handle incoming WebSocket messages', () => {
            const messageHandler = jest.fn();
            conversationService.on('messageReceived', messageHandler);

            // Simulate incoming message
            const wsHandler = webSocketServiceMock.on.mock.calls.find(
                call => call[0] === 'message'
            )?.[1];
            
            if (wsHandler) {
                wsHandler({
                    type: WebSocketMessageType.TRANSCRIPT,
                    payload: mockMessage
                });
                expect(messageHandler).toHaveBeenCalledWith(mockMessage);
            }
        });

        it('should handle WebSocket errors', () => {
            const errorHandler = jest.fn();
            conversationService.on('error', errorHandler);

            // Simulate WebSocket error
            const wsHandler = webSocketServiceMock.on.mock.calls.find(
                call => call[0] === 'error'
            )?.[1];
            
            if (wsHandler) {
                const error = new Error('WebSocket Error');
                wsHandler(error);
                expect(errorHandler).toHaveBeenCalledWith(error);
            }
        });
    });

    describe('Performance Requirements', () => {
        it('should maintain message delivery success rate', async () => {
            const totalMessages = 100;
            const successfulMessages = [];
            
            for (let i = 0; i < totalMessages; i++) {
                try {
                    const result = await conversationService.sendMessage(
                        `Message ${i}`,
                        MessageRole.USER
                    );
                    if (result) successfulMessages.push(result);
                } catch (error) {
                    // Message failed
                }
            }

            const successRate = (successfulMessages.length / totalMessages) * 100;
            expect(successRate).toBeGreaterThan(99.9); // >99.9% success rate
        });

        it('should handle high-frequency message sending', async () => {
            const messages = Array(10).fill('Test message');
            const startTime = Date.now();

            await Promise.all(
                messages.map(msg => 
                    conversationService.sendMessage(msg, MessageRole.USER)
                )
            );

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(2000); // <2 seconds for batch
        });
    });
});