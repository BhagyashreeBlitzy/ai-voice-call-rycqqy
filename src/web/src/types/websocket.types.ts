/**
 * @fileoverview TypeScript type definitions for WebSocket communication in the web client
 * Provides type-safe interfaces for real-time voice interaction with comprehensive security features
 * @version 1.0.0
 */

// Internal imports
import type { AudioChunk, AudioFormat } from '../types/audio.types';
import type { Message, MessageRole } from '../types/conversation.types';

/**
 * Enum representing possible WebSocket connection states
 */
export enum WebSocketState {
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected'
}

/**
 * Enum defining supported WebSocket message types for voice interaction
 */
export enum WebSocketMessageType {
    AUDIO = 'audio',
    TRANSCRIPT = 'transcript',
    ERROR = 'error',
    HEARTBEAT = 'heartbeat'
}

/**
 * Base interface for all WebSocket messages with security features
 */
export interface WebSocketMessage {
    /** Message type identifier */
    type: WebSocketMessageType;
    /** Message payload - type varies by message type */
    payload: unknown;
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Unique message identifier for tracking */
    messageId: string;
    /** SHA-256 checksum for message integrity */
    checksum: string;
}

/**
 * Specialized interface for audio streaming messages
 * Extends base message with audio-specific fields
 */
export interface WebSocketAudioMessage extends WebSocketMessage {
    type: WebSocketMessageType.AUDIO;
    payload: AudioChunk;
    /** Sequence number for ordering audio chunks */
    sequenceNumber: number;
}

/**
 * Specialized interface for transcript messages
 * Contains processed speech-to-text results
 */
export interface WebSocketTranscriptMessage extends WebSocketMessage {
    type: WebSocketMessageType.TRANSCRIPT;
    payload: Message;
    /** Associated conversation identifier */
    conversationId: string;
}

/**
 * Enhanced error message interface with detailed error information
 */
export interface WebSocketErrorMessage extends WebSocketMessage {
    type: WebSocketMessageType.ERROR;
    payload: {
        /** Error code for categorization */
        code: string;
        /** Human-readable error message */
        message: string;
        /** Error category for grouping */
        category: string;
        /** Error severity level */
        severity: string;
    };
}

/**
 * Interface for heartbeat messages to maintain connection
 */
export interface WebSocketHeartbeatMessage extends WebSocketMessage {
    type: WebSocketMessageType.HEARTBEAT;
    payload: {
        /** Client timestamp for latency calculation */
        clientTime: number;
        /** Connection uptime in seconds */
        uptime: number;
    };
}

/**
 * Type guard to check if a message is an audio message
 */
export function isAudioMessage(message: WebSocketMessage): message is WebSocketAudioMessage {
    return message.type === WebSocketMessageType.AUDIO;
}

/**
 * Type guard to check if a message is a transcript message
 */
export function isTranscriptMessage(message: WebSocketMessage): message is WebSocketTranscriptMessage {
    return message.type === WebSocketMessageType.TRANSCRIPT;
}

/**
 * Type guard to check if a message is an error message
 */
export function isErrorMessage(message: WebSocketMessage): message is WebSocketErrorMessage {
    return message.type === WebSocketMessageType.ERROR;
}

/**
 * Comprehensive interface for WebSocket event handling with enhanced error handling
 */
export interface WebSocketEventHandlers {
    /** Handler for incoming messages */
    onMessage: (message: WebSocketMessage) => void;
    /** Handler for error messages */
    onError: (error: WebSocketErrorMessage) => void;
    /** Handler for connection closure */
    onClose: (code: number, reason: string) => void;
    /** Handler for connection state changes */
    onStateChange: (state: WebSocketState) => void;
    /** Handler for reconnection attempts */
    onReconnect: (attempt: number) => void;
}

/**
 * Configuration options for WebSocket connection
 */
export interface WebSocketConfig {
    /** URL for WebSocket connection */
    url: string;
    /** Maximum reconnection attempts */
    maxReconnectAttempts: number;
    /** Base delay between reconnection attempts (ms) */
    reconnectBaseDelay: number;
    /** Maximum delay between reconnection attempts (ms) */
    reconnectMaxDelay: number;
    /** Heartbeat interval in milliseconds */
    heartbeatInterval: number;
    /** Connection timeout in milliseconds */
    connectionTimeout: number;
}

/**
 * Interface for WebSocket connection statistics
 */
export interface WebSocketStats {
    /** Total messages sent */
    messagesSent: number;
    /** Total messages received */
    messagesReceived: number;
    /** Current connection uptime in seconds */
    uptime: number;
    /** Last recorded latency in milliseconds */
    latency: number;
    /** Number of reconnection attempts */
    reconnectAttempts: number;
}