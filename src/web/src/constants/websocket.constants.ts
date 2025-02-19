/**
 * @fileoverview WebSocket-related constants for real-time voice communication
 * Defines connection parameters, message types, protocols, and configuration values
 * @version 1.0.0
 */

import { WebSocketState, WebSocketMessageType } from '../types/websocket.types';

// Base WebSocket URL with environment-specific configuration
export const WEBSOCKET_BASE_URL = process.env.REACT_APP_WEBSOCKET_URL || 'wss://api.voiceagent.com/ws';
export const WEBSOCKET_VERSION = 'v1';

/**
 * Default configuration values for WebSocket connections
 * Tuned for optimal real-time voice communication performance
 */
export const WEBSOCKET_DEFAULTS = {
    /** Heartbeat interval (15 seconds) for connection health monitoring */
    HEARTBEAT_INTERVAL: 15000,
    /** Maximum reconnection attempts before failing */
    RECONNECT_ATTEMPTS: 5,
    /** Base reconnection interval (1 second) with exponential backoff */
    RECONNECT_INTERVAL: 1000,
    /** Maximum message size (64KB) for audio chunks */
    MAX_MESSAGE_SIZE: 64 * 1024,
    /** Connection timeout (5 seconds) */
    CONNECTION_TIMEOUT: 5000,
    /** Maximum latency threshold (2 seconds) per requirements */
    MAX_LATENCY_THRESHOLD: 2000,
    /** Buffer size for audio streaming (2 seconds of audio) */
    AUDIO_BUFFER_SIZE: 32 * 1024
} as const;

/**
 * WebSocket subprotocol identifiers for different communication channels
 * Ensures proper message routing and handling
 */
export const WEBSOCKET_PROTOCOLS = {
    /** Protocol for real-time audio streaming */
    AUDIO_STREAM: `${WEBSOCKET_VERSION}.audio-stream`,
    /** Protocol for voice control commands */
    VOICE_CONTROL: `${WEBSOCKET_VERSION}.voice-control`,
    /** Protocol for secure message exchange */
    SECURE_MESSAGE: `${WEBSOCKET_VERSION}.secure-msg`
} as const;

/**
 * Event type constants for WebSocket event handling
 * Standardizes event names across the application
 */
export const WEBSOCKET_EVENTS = {
    /** Connection established event */
    CONNECT: 'connect',
    /** Connection terminated event */
    DISCONNECT: 'disconnect',
    /** Message received event */
    MESSAGE: 'message',
    /** Error occurred event */
    ERROR: 'error',
    /** State change event */
    STATE_CHANGE: 'stateChange',
    /** Reconnection attempt event */
    RECONNECT: 'reconnect',
    /** Audio streaming started event */
    STREAM_START: 'streamStart',
    /** Audio streaming ended event */
    STREAM_END: 'streamEnd'
} as const;

/**
 * Error code constants for WebSocket error handling
 * Provides standardized error categorization
 */
export const WEBSOCKET_ERROR_CODES = {
    /** General connection error */
    CONNECTION_ERROR: 'WS_CONNECTION_ERROR',
    /** Message size exceeded maximum limit */
    MESSAGE_SIZE_EXCEEDED: 'WS_MESSAGE_SIZE_EXCEEDED',
    /** Invalid message format or content */
    INVALID_MESSAGE: 'WS_INVALID_MESSAGE',
    /** Protocol violation error */
    PROTOCOL_ERROR: 'WS_PROTOCOL_ERROR',
    /** Authentication error */
    AUTH_ERROR: 'WS_AUTH_ERROR',
    /** Encryption error */
    ENCRYPTION_ERROR: 'WS_ENCRYPTION_ERROR',
    /** Rate limit exceeded */
    RATE_LIMIT_EXCEEDED: 'WS_RATE_LIMIT_EXCEEDED'
} as const;

/**
 * Standard WebSocket status codes for connection state management
 * Based on RFC 6455 WebSocket Protocol specification
 */
export const WEBSOCKET_STATUS = {
    /** Normal closure (1000) */
    NORMAL_CLOSURE: 1000,
    /** Endpoint going away (1001) */
    GOING_AWAY: 1001,
    /** Protocol error (1002) */
    PROTOCOL_ERROR: 1002,
    /** Unsupported data (1003) */
    UNSUPPORTED_DATA: 1003,
    /** No status received (1005) */
    NO_STATUS: 1005,
    /** Abnormal closure (1006) */
    ABNORMAL_CLOSURE: 1006,
    /** Invalid message (1007) */
    INVALID_MESSAGE: 1007,
    /** Policy violation (1008) */
    POLICY_VIOLATION: 1008,
    /** Message too big (1009) */
    MESSAGE_TOO_BIG: 1009,
    /** Extension required (1010) */
    EXTENSION_REQUIRED: 1010,
    /** Internal server error (1011) */
    INTERNAL_ERROR: 1011
} as const;

/**
 * Security-related constants for WebSocket communication
 * Implements required security measures
 */
export const WEBSOCKET_SECURITY = {
    /** Required TLS version */
    MIN_TLS_VERSION: 'TLSv1.3',
    /** Encryption algorithm for messages */
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    /** Maximum token lifetime */
    TOKEN_EXPIRY: 900, // 15 minutes in seconds
    /** Required security headers */
    REQUIRED_HEADERS: ['Sec-WebSocket-Protocol', 'Sec-WebSocket-Key']
} as const;

/**
 * Performance monitoring thresholds
 * Ensures compliance with performance requirements
 */
export const WEBSOCKET_PERFORMANCE = {
    /** Maximum acceptable latency */
    MAX_LATENCY: WEBSOCKET_DEFAULTS.MAX_LATENCY_THRESHOLD,
    /** Warning threshold for latency (80% of max) */
    LATENCY_WARNING: WEBSOCKET_DEFAULTS.MAX_LATENCY_THRESHOLD * 0.8,
    /** Maximum message queue size */
    MAX_QUEUE_SIZE: 100,
    /** Minimum uptime requirement (99.9%) */
    MIN_UPTIME: 99.9
} as const;