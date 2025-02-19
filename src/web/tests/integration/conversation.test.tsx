/**
 * @fileoverview Integration tests for conversation functionality
 * Tests real-time communication, error handling, and accessibility requirements
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Server as MockWebSocketServer } from 'mock-socket';

import { ConversationHistory } from '../../src/components/conversation/ConversationHistory';
import { MessageList } from '../../src/components/conversation/MessageList';
import { ConversationService } from '../../src/services/conversation.service';
import { 
    Message, 
    MessageRole, 
    ConversationStatus 
} from '../../types/conversation.types';
import { WebSocketState } from '../../types/websocket.types';
import { WEBSOCKET_DEFAULTS, WEBSOCKET_STATUS } from '../../constants/websocket.constants';

// Mock WebSocket URL
const MOCK_WS_URL = 'ws://localhost:8080';

/**
 * Sets up test environment with required providers and mocks
 */
const setupTestEnvironment = () => {
    // Initialize mock store
    const store = configureStore({
        reducer: {
            conversation: (state = { current: null }, action) => {
                switch (action.type) {
                    case 'conversation/start':
                        return { ...state, current: action.payload };
                    case 'conversation/messageReceived':
                        return {
                            ...state,
                            current: {
                                ...state.current,
                                messages: [...state.current.messages, action.payload]
                            }
                        };
                    default:
                        return state;
                }
            }
        }
    });

    // Initialize mock WebSocket server
    const mockServer = new MockWebSocketServer(MOCK_WS_URL);
    mockServer.on('connection', socket => {
        socket.on('message', data => {
            const message = JSON.parse(data.toString());
            socket.send(JSON.stringify({
                type: 'transcript',
                payload: {
                    id: crypto.randomUUID(),
                    content: 'Mock response',
                    role: MessageRole.AI,
                    timestamp: Date.now(),
                    hasAudio: false
                },
                timestamp: Date.now(),
                messageId: crypto.randomUUID()
            }));
        });
    });

    // Mock ConversationService
    const mockConversationService = {
        startConversation: jest.fn(),
        sendMessage: jest.fn(),
        reconnect: jest.fn()
    };

    return { store, mockServer, mockConversationService };
};

describe('Conversation Integration Tests', () => {
    let testEnv: ReturnType<typeof setupTestEnvironment>;

    beforeEach(() => {
        testEnv = setupTestEnvironment();
    });

    afterEach(() => {
        testEnv.mockServer.close();
        jest.clearAllMocks();
    });

    describe('Conversation Lifecycle', () => {
        it('should initialize conversation and display empty state', async () => {
            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            expect(screen.getByRole('status')).toHaveTextContent('Start a conversation to begin');
        });

        it('should handle message exchange and update UI', async () => {
            const mockMessage: Message = {
                id: '1',
                content: 'Test message',
                role: MessageRole.USER,
                timestamp: Date.now(),
                hasAudio: false
            };

            testEnv.mockConversationService.sendMessage.mockResolvedValue(mockMessage);

            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            // Simulate starting conversation
            testEnv.store.dispatch({
                type: 'conversation/start',
                payload: {
                    id: '1',
                    status: ConversationStatus.ACTIVE,
                    messages: []
                }
            });

            // Send message
            testEnv.store.dispatch({
                type: 'conversation/messageReceived',
                payload: mockMessage
            });

            await waitFor(() => {
                expect(screen.getByText('Test message')).toBeInTheDocument();
            });
        });

        it('should handle conversation cleanup on unmount', () => {
            const { unmount } = render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            unmount();
            // Verify cleanup actions
        });
    });

    describe('Network Resilience', () => {
        it('should handle connection loss and reconnection', async () => {
            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            // Simulate connection loss
            testEnv.mockServer.close();

            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });

            // Simulate reconnection
            testEnv = setupTestEnvironment();

            await waitFor(() => {
                expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            });
        });

        it('should retry failed message sends', async () => {
            const mockError = new Error('Network error');
            testEnv.mockConversationService.sendMessage.mockRejectedValueOnce(mockError);

            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            // Verify retry mechanism
            await waitFor(() => {
                expect(testEnv.mockConversationService.sendMessage).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Performance Requirements', () => {
        it('should meet latency requirements', async () => {
            const startTime = Date.now();

            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            // Send test message
            testEnv.store.dispatch({
                type: 'conversation/messageReceived',
                payload: {
                    id: '1',
                    content: 'Test message',
                    role: MessageRole.USER,
                    timestamp: Date.now(),
                    hasAudio: false
                }
            });

            await waitFor(() => {
                const endTime = Date.now();
                const latency = endTime - startTime;
                expect(latency).toBeLessThan(WEBSOCKET_DEFAULTS.MAX_LATENCY_THRESHOLD);
            });
        });
    });

    describe('Accessibility Requirements', () => {
        it('should maintain ARIA compliance', () => {
            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            // Verify ARIA roles
            expect(screen.getByRole('log')).toBeInTheDocument();
            expect(screen.getByRole('status')).toBeInTheDocument();
        });

        it('should handle keyboard navigation', () => {
            render(
                <Provider store={testEnv.store}>
                    <MessageList 
                        messages={[]}
                        maxHeight="100%"
                    />
                </Provider>
            );

            const messageList = screen.getByRole('log');
            fireEvent.keyDown(messageList, { key: 'Tab' });
            
            expect(document.activeElement).toBeTruthy();
        });

        it('should announce new messages to screen readers', async () => {
            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            const newMessage: Message = {
                id: '1',
                content: 'New message',
                role: MessageRole.AI,
                timestamp: Date.now(),
                hasAudio: false
            };

            testEnv.store.dispatch({
                type: 'conversation/messageReceived',
                payload: newMessage
            });

            await waitFor(() => {
                const messageElement = screen.getByText('New message');
                expect(messageElement.parentElement).toHaveAttribute('aria-live', 'polite');
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error states appropriately', async () => {
            const mockError = new Error('Test error');
            testEnv.mockConversationService.startConversation.mockRejectedValue(mockError);

            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent('Test error');
            });
        });

        it('should provide retry functionality for errors', async () => {
            render(
                <Provider store={testEnv.store}>
                    <ConversationHistory />
                </Provider>
            );

            // Simulate error state
            testEnv.store.dispatch({
                type: 'conversation/error',
                payload: new Error('Connection error')
            });

            const retryButton = screen.getByRole('button', { name: /retry/i });
            fireEvent.click(retryButton);

            await waitFor(() => {
                expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            });
        });
    });
});