/**
 * Core TypeScript type definitions for WebSocket communication
 * Provides comprehensive type definitions for real-time voice communication
 * with enhanced security, monitoring, and error handling capabilities
 * @version 1.0.0
 */

import { WebSocket } from 'ws'; // ^8.13.0
import { AudioChunk } from '../types/audio.types';
import { Result } from '../types/common.types';

/**
 * WebSocket connection states aligned with WebSocket protocol
 */
export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}

/**
 * Supported WebSocket message types for voice communication
 */
export enum WebSocketMessageType {
  AUDIO = 'AUDIO',
  TRANSCRIPT = 'TRANSCRIPT',
  ERROR = 'ERROR',
  HEARTBEAT = 'HEARTBEAT'
}

/**
 * Message metadata for tracking and debugging
 */
export interface MessageMetadata {
  readonly userId: string;
  readonly sessionId: string;
  readonly clientInfo: {
    readonly userAgent: string;
    readonly platform: string;
    readonly networkType?: string;
  };
  readonly processingMetrics?: {
    readonly latency: number;
    readonly processingTime: number;
  };
}

/**
 * Base WebSocket message interface with enhanced tracking
 */
export interface WebSocketMessage {
  readonly type: WebSocketMessageType;
  readonly payload: any;
  readonly timestamp: number;
  readonly messageId: string;
  readonly version: string;
  readonly metadata: MessageMetadata;
}

/**
 * Audio metadata for streaming configuration
 */
export interface AudioMetadata {
  readonly sampleRate: number;
  readonly channels: number;
  readonly encoding: string;
  readonly frameSize: number;
  readonly vadLevel?: number;
}

/**
 * Specialized message type for audio streaming
 */
export interface WebSocketAudioMessage extends WebSocketMessage {
  readonly type: WebSocketMessageType.AUDIO;
  readonly payload: AudioChunk;
  readonly sequenceNumber: number;
  readonly audioMetadata: AudioMetadata;
}

/**
 * Error categories for structured error handling
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUDIO = 'AUDIO',
  PROTOCOL = 'PROTOCOL',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM'
}

/**
 * Enhanced error information
 */
export interface ErrorInfo {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly timestamp: number;
  readonly recoverable: boolean;
}

/**
 * Specialized error message with recovery suggestions
 */
export interface WebSocketErrorMessage extends WebSocketMessage {
  readonly type: WebSocketMessageType.ERROR;
  readonly payload: ErrorInfo;
  readonly errorCategory: ErrorCategory;
  readonly recoverySuggestion: string;
}

/**
 * Connection quality metrics for monitoring
 */
export interface ConnectionQualityMetrics {
  readonly latency: number;
  readonly jitter: number;
  readonly packetLoss: number;
  readonly bandwidth: number;
  readonly signalStrength?: number;
}

/**
 * Heartbeat message for connection monitoring
 */
export interface WebSocketHeartbeatMessage extends WebSocketMessage {
  readonly type: WebSocketMessageType.HEARTBEAT;
  readonly latency: number;
  readonly connectionQuality: ConnectionQualityMetrics;
}

/**
 * Interface for WebSocket event handlers with async support
 */
export interface WebSocketHandler {
  onMessage(message: WebSocketMessage): Promise<void>;
  onError(error: Error): void;
  onClose(): void;
}

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
  readonly pingInterval: number;
  readonly pongTimeout: number;
  readonly reconnectAttempts: number;
  readonly reconnectInterval: number;
  readonly maxMessageSize: number;
}

/**
 * Default WebSocket configuration values
 */
export const DEFAULT_WEBSOCKET_CONFIG: Readonly<WebSocketConfig> = {
  pingInterval: 30000,
  pongTimeout: 5000,
  reconnectAttempts: 3,
  reconnectInterval: 5000,
  maxMessageSize: 1024 * 1024 // 1MB
} as const;