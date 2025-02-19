/**
 * @fileoverview Unit tests for useConversation hook
 * Tests conversation management, WebSocket communication, and voice processing
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import conversationReducer, { 
    VoiceProcessingStatus,
    setConversation,
    addMessage,
    setError,
    setVoiceProcessingStatus
} from '../../../store/slices/conversationSlice';
import { useConversation } from '../../../src/hooks/useConversation';
import { ConversationService } from '../../../src/services/conversation.service';
import { 
    ConversationStatus,
    MessageRole 
} from '../../../types/conversation.types';
import { 
    WebSocketState,
    WebSocketMessageType,
    AudioFormat 
} from '../../../types/websocket.types';
import { WEBSOCKET_DEFAULTS } from '../../../constants/websocket.constants';

// Mock WebSocket
class MockWebSocket {
    onopen: (() => void) | null = null;
    onmessage: ((event: any) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: ((error: any) => void) | null = null;
    readyState = WebSocket.CONNECTING;
    send = jest.fn();
    close = jest.fn();
}

// Mock performance.now for latency measurements
const mockPerformanceNow = jest.fn();
global.performance.now = mockPerformanceNow;

describe('useConversation', () => {
    let store: any;
    let mockWebSocket: MockWebSocket;
    let mockConversationService: jest.Mocked<ConversationService>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockPerformanceNow.mockReturnValue(Date.now());

        // Initialize mock WebSocket
        mockWebSocket = new MockWebSocket();
        (global as any).WebSocket = jest.fn(() => mockWebSocket);

        // Mock ConversationService
        mockConversationService = {
            startConversation: jest.fn(),
            sendMessage: jest.fn(),
            sendAudioMessage: jest.fn(),
            endConversation: jest.fn()
        } as any;

        // Configure Redux store
        store = configureStore({
            reducer: {
                conversation: conversationReducer
            }
        });
    });

    const renderConversationHook = () => {
        return renderHook(() => useConversation(), {
            wrapper: ({ children }) => (
                <Provider store={store}>{children}</Provider>
            )
        });
    };

    it('should handle conversation lifecycle', async () => {
        const { result } = renderConversationHook();
        const sessionId = 'test-session-123';
        const mockConversation = {
            id: 'conv-123',
            sessionId,
            status: ConversationStatus.ACTIVE,
            messages: []
        };

        // Mock successful conversation start
        mockConversationService.startConversation.mockResolvedValue(mockConversation);

        // Start conversation
        await act(async () => {
            await result.current.startNewConversation(sessionId);
        });

        expect(result.current.conversation).toEqual(mockConversation);
        expect(result.current.isProcessing).toBe(false);
        expect(result.current.error).toBeNull();

        // Send text message
        const messageContent = 'Hello AI';
        const mockMessage = {
            id: 'msg-123',
            content: messageContent,
            role: MessageRole.USER,
            timestamp: Date.now()
        };

        mockConversationService.sendMessage.mockResolvedValue(mockMessage);

        await act(async () => {
            await result.current.sendMessage(messageContent);
        });

        expect(mockConversationService.sendMessage).toHaveBeenCalledWith(
            messageContent,
            MessageRole.USER
        );

        // End conversation
        await act(async () => {
            await result.current.endCurrentConversation();
        });

        expect(mockConversationService.endConversation).toHaveBeenCalled();
        expect(result.current.conversation).toBeNull();
    });

    it('should process audio messages with latency checks', async () => {
        const { result } = renderConversationHook();
        
        // Simulate WebSocket connection
        act(() => {
            mockWebSocket.readyState = WebSocket.OPEN;
            mockWebSocket.onopen?.();
        });

        // Create mock audio chunk
        const audioChunk = {
            data: new Uint8Array([1, 2, 3]),
            timestamp: Date.now(),
            format: AudioFormat.OPUS
        };

        // Send audio message
        await act(async () => {
            await result.current.sendAudioMessage(audioChunk);
        });

        // Verify WebSocket message was sent
        expect(mockWebSocket.send).toHaveBeenCalled();
        const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
        expect(sentMessage.type).toBe('audio');
        expect(sentMessage.payload).toEqual(audioChunk);

        // Verify latency tracking
        expect(result.current.latencyMetrics.samples.length).toBeGreaterThan(0);
        expect(result.current.latencyMetrics.current).toBeLessThan(WEBSOCKET_DEFAULTS.MAX_LATENCY_THRESHOLD);
    });

    it('should handle errors and recovery', async () => {
        const { result } = renderConversationHook();

        // Simulate network error
        const networkError = new Error('Network failure');
        mockConversationService.startConversation.mockRejectedValue(networkError);

        await act(async () => {
            try {
                await result.current.startNewConversation('test-session');
            } catch (error) {
                // Error expected
            }
        });

        expect(result.current.error).toBeTruthy();
        expect(result.current.isProcessing).toBe(false);

        // Test error recovery
        await act(async () => {
            result.current.resetErrorState();
        });

        expect(result.current.error).toBeNull();
    });

    it('should handle WebSocket reconnection', async () => {
        const { result } = renderConversationHook();

        // Simulate initial connection
        act(() => {
            mockWebSocket.readyState = WebSocket.OPEN;
            mockWebSocket.onopen?.();
        });

        // Simulate disconnection
        act(() => {
            mockWebSocket.readyState = WebSocket.CLOSED;
            mockWebSocket.onclose?.();
        });

        // Verify reconnection attempt
        expect(global.WebSocket).toHaveBeenCalledTimes(2);

        // Simulate successful reconnection
        act(() => {
            mockWebSocket.readyState = WebSocket.OPEN;
            mockWebSocket.onopen?.();
        });

        expect(result.current.error).toBeNull();
    });

    it('should maintain message queue during disconnection', async () => {
        const { result } = renderConversationHook();
        const message = 'Test message during offline';

        // Simulate disconnection
        act(() => {
            mockWebSocket.readyState = WebSocket.CLOSED;
            mockWebSocket.onclose?.();
        });

        // Attempt to send message during disconnection
        await act(async () => {
            try {
                await result.current.sendMessage(message);
            } catch (error) {
                // Error expected
            }
        });

        // Verify message was queued
        expect(store.getState().conversation.messageQueue.length).toBeGreaterThan(0);

        // Simulate reconnection
        act(() => {
            mockWebSocket.readyState = WebSocket.OPEN;
            mockWebSocket.onopen?.();
        });

        // Verify queued message was sent
        expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should enforce latency requirements', async () => {
        const { result } = renderConversationHook();
        
        // Simulate high-latency response
        const highLatency = WEBSOCKET_DEFAULTS.MAX_LATENCY_THRESHOLD + 1000;
        mockPerformanceNow
            .mockReturnValueOnce(Date.now())
            .mockReturnValueOnce(Date.now() + highLatency);

        // Send message
        const message = {
            type: WebSocketMessageType.TRANSCRIPT,
            payload: 'Test response',
            timestamp: Date.now()
        };

        act(() => {
            mockWebSocket.onmessage?.({ data: JSON.stringify(message) });
        });

        // Verify error was set due to high latency
        expect(result.current.error).toBeTruthy();
        expect(result.current.latencyMetrics.current).toBeGreaterThan(WEBSOCKET_DEFAULTS.MAX_LATENCY_THRESHOLD);
    });
});