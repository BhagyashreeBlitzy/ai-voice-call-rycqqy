/**
 * @fileoverview WebSocket configuration module for real-time voice communication
 * Provides secure connection parameters, protocols, and event handling settings
 * @version 1.0.0
 */

import type { WebSocket } from 'typescript'; // v5.0.0
import { 
    WebSocketState, 
    WebSocketMessageType 
} from '../types/websocket.types';
import { 
    WEBSOCKET_DEFAULTS,
    WEBSOCKET_BASE_URL,
    WEBSOCKET_VERSION,
    WEBSOCKET_PROTOCOLS,
    WEBSOCKET_SECURITY,
    WEBSOCKET_PERFORMANCE
} from '../constants/websocket.constants';

/**
 * Interface for message size limits configuration
 */
interface MessageLimitsConfig {
    maxSize: number;
    bufferSize: number;
    queueSize: number;
}

/**
 * Interface for compression configuration
 */
interface CompressionConfig {
    enabled: boolean;
    threshold: number;
    algorithm: string;
}

/**
 * Interface for encryption configuration
 */
interface EncryptionConfig {
    algorithm: string;
    keySize: number;
    ivSize: number;
}

/**
 * Interface for telemetry configuration
 */
interface TelemetryConfig {
    latencyThreshold: number;
    samplingRate: number;
    metricsInterval: number;
}

/**
 * Interface for circuit breaker configuration
 */
interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
}

/**
 * Interface for regional failover configuration
 */
interface FailoverConfig {
    enabled: boolean;
    regions: string[];
    failoverDelay: number;
}

/**
 * Comprehensive WebSocket configuration interface
 */
export interface WebSocketConfig {
    url: string;
    protocols: string[];
    heartbeatInterval: number;
    reconnection: ReconnectionConfig;
    encryption: EncryptionConfig;
    compression: CompressionConfig;
    messageLimits: MessageLimitsConfig;
    telemetry: TelemetryConfig;
}

/**
 * Advanced reconnection configuration interface
 */
export interface ReconnectionConfig {
    maxAttempts: number;
    interval: number;
    backoffMultiplier: number;
    jitterFactor: number;
    maxRetryDuration: number;
    circuitBreaker: CircuitBreakerConfig;
    regionalFailover: FailoverConfig;
}

/**
 * Returns WebSocket configuration with secure connection parameters
 * @param sessionId - Active session identifier
 * @param region - Geographic region for connection
 * @param encryptionConfig - Custom encryption settings
 * @returns Complete WebSocket configuration
 */
export function getWebSocketConfig(
    sessionId: string,
    region: string,
    encryptionConfig: EncryptionConfig
): WebSocketConfig {
    // Construct secure WebSocket URL
    const wsUrl = new URL(`${WEBSOCKET_BASE_URL}/${WEBSOCKET_VERSION}`);
    wsUrl.searchParams.append('session', sessionId);
    wsUrl.searchParams.append('region', region);

    // Configure message limits
    const messageLimits: MessageLimitsConfig = {
        maxSize: WEBSOCKET_DEFAULTS.MAX_MESSAGE_SIZE,
        bufferSize: WEBSOCKET_DEFAULTS.AUDIO_BUFFER_SIZE,
        queueSize: WEBSOCKET_PERFORMANCE.MAX_QUEUE_SIZE
    };

    // Configure compression settings
    const compression: CompressionConfig = {
        enabled: true,
        threshold: 1024, // Compress messages larger than 1KB
        algorithm: 'deflate'
    };

    // Configure telemetry settings
    const telemetry: TelemetryConfig = {
        latencyThreshold: WEBSOCKET_PERFORMANCE.MAX_LATENCY,
        samplingRate: 0.1, // 10% sampling rate
        metricsInterval: 60000 // 1 minute interval
    };

    return {
        url: wsUrl.toString(),
        protocols: [
            WEBSOCKET_PROTOCOLS.AUDIO_STREAM,
            WEBSOCKET_PROTOCOLS.SECURE_MESSAGE
        ],
        heartbeatInterval: WEBSOCKET_DEFAULTS.HEARTBEAT_INTERVAL,
        reconnection: getReconnectionConfig({
            failureThreshold: 3,
            resetTimeout: 30000,
            halfOpenRequests: 1
        }),
        encryption: encryptionConfig,
        compression,
        messageLimits,
        telemetry
    };
}

/**
 * Returns advanced reconnection configuration with exponential backoff
 * @param circuitConfig - Circuit breaker configuration
 * @returns Comprehensive reconnection configuration
 */
export function getReconnectionConfig(
    circuitConfig: CircuitBreakerConfig
): ReconnectionConfig {
    return {
        maxAttempts: WEBSOCKET_DEFAULTS.RECONNECT_ATTEMPTS,
        interval: WEBSOCKET_DEFAULTS.RECONNECT_INTERVAL,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        maxRetryDuration: 300000, // 5 minutes
        circuitBreaker: circuitConfig,
        regionalFailover: {
            enabled: true,
            regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
            failoverDelay: 5000
        }
    };
}