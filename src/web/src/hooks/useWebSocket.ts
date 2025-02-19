/**
 * @fileoverview Enhanced React hook for managing WebSocket connections in voice agent application
 * Provides secure real-time communication with performance monitoring and compression
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react'; // v18.2.0
import { 
    WebSocketService,
    WebSocketState,
    WebSocketMessage,
    getWebSocketConfig
} from '../services/websocket.service';

/**
 * Interface for hook configuration options
 */
interface WebSocketOptions {
    enableCompression?: boolean;
    enableMetrics?: boolean;
    reconnectOnError?: boolean;
    region?: string;
}

/**
 * Interface for connection metrics
 */
interface ConnectionMetrics {
    latency: number;
    messagesSent: number;
    messagesReceived: number;
    uptime: number;
    errors: number;
}

/**
 * Enhanced WebSocket hook for secure real-time communication
 * @param sessionId - Active session identifier
 * @param eventHandlers - WebSocket event handlers
 * @param options - Configuration options
 */
export function useWebSocket(
    sessionId: string,
    eventHandlers: WebSocketEventHandlers,
    options: WebSocketOptions = {}
) {
    // Initialize state
    const [connectionState, setConnectionState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
    const [metrics, setMetrics] = useState<ConnectionMetrics>({
        latency: 0,
        messagesSent: 0,
        messagesReceived: 0,
        uptime: 0,
        errors: 0
    });

    // Initialize WebSocket service with configuration
    const wsService = useCallback(() => {
        const config = getWebSocketConfig(
            sessionId,
            options.region || 'us-east-1',
            {
                algorithm: WEBSOCKET_SECURITY.ENCRYPTION_ALGORITHM,
                keySize: 256,
                ivSize: 96
            }
        );
        return new WebSocketService(config);
    }, [sessionId, options.region]);

    // Handle WebSocket state changes
    const handleStateChange = useCallback((newState: WebSocketState) => {
        setConnectionState(newState);
        eventHandlers.onStateChange?.(newState);
    }, [eventHandlers]);

    // Handle incoming messages with error boundary
    const handleMessage = useCallback((message: WebSocketMessage) => {
        try {
            if (options.enableMetrics) {
                setMetrics(prev => ({
                    ...prev,
                    messagesReceived: prev.messagesReceived + 1,
                    latency: Date.now() - message.timestamp
                }));
            }
            eventHandlers.onMessage(message);
        } catch (error) {
            handleError(new Error(WEBSOCKET_ERROR_CODES.INVALID_MESSAGE));
        }
    }, [eventHandlers, options.enableMetrics]);

    // Enhanced error handler with reconnection logic
    const handleError = useCallback((error: Error) => {
        setMetrics(prev => ({
            ...prev,
            errors: prev.errors + 1
        }));

        if (options.reconnectOnError && connectionState === WebSocketState.CONNECTED) {
            handleReconnection();
        }

        eventHandlers.onError?.({
            type: WebSocketMessageType.ERROR,
            payload: {
                code: WEBSOCKET_ERROR_CODES.CONNECTION_ERROR,
                message: error.message,
                category: 'connection',
                severity: 'error'
            },
            timestamp: Date.now(),
            messageId: crypto.randomUUID()
        });
    }, [connectionState, eventHandlers, options.reconnectOnError]);

    // Implement reconnection with exponential backoff
    const handleReconnection = useCallback(async () => {
        handleStateChange(WebSocketState.RECONNECTING);
        try {
            await wsService().connect(sessionId);
            handleStateChange(WebSocketState.CONNECTED);
        } catch (error) {
            handleError(error as Error);
        }
    }, [sessionId, wsService, handleStateChange, handleError]);

    // Connect to WebSocket server
    const connect = useCallback(async () => {
        try {
            handleStateChange(WebSocketState.CONNECTING);
            await wsService().connect(sessionId);
            handleStateChange(WebSocketState.CONNECTED);
        } catch (error) {
            handleError(error as Error);
        }
    }, [sessionId, wsService, handleStateChange, handleError]);

    // Disconnect from WebSocket server
    const disconnect = useCallback(() => {
        wsService().disconnect();
        handleStateChange(WebSocketState.DISCONNECTED);
    }, [wsService, handleStateChange]);

    // Send message with compression and metrics
    const sendMessage = useCallback(async (message: WebSocketMessage) => {
        try {
            await wsService().sendMessage(message);
            if (options.enableMetrics) {
                setMetrics(prev => ({
                    ...prev,
                    messagesSent: prev.messagesSent + 1
                }));
            }
        } catch (error) {
            handleError(error as Error);
        }
    }, [wsService, options.enableMetrics, handleError]);

    // Send audio chunk with optimized handling
    const sendAudioChunk = useCallback(async (chunk: AudioChunk) => {
        try {
            await wsService().sendAudioChunk(chunk);
            if (options.enableMetrics) {
                setMetrics(prev => ({
                    ...prev,
                    messagesSent: prev.messagesSent + 1
                }));
            }
        } catch (error) {
            handleError(error as Error);
        }
    }, [wsService, options.enableMetrics, handleError]);

    // Configure compression settings
    const setCompression = useCallback((enabled: boolean) => {
        wsService().enableCompression(enabled);
    }, [wsService]);

    // Initialize WebSocket connection
    useEffect(() => {
        if (sessionId) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [sessionId, connect, disconnect]);

    // Return hook interface
    return {
        connectionState,
        connect,
        disconnect,
        sendMessage,
        sendAudioChunk,
        getMetrics: () => metrics,
        setCompression
    };
}

export type { WebSocketOptions, ConnectionMetrics };