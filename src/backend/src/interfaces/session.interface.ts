/**
 * Session management interfaces and types for the AI Voice Agent
 * Provides comprehensive session state tracking, metadata, and status management
 * for secure WebSocket-based voice interactions
 * @version 1.0.0
 */

import { UUID, Result } from '../types/common.types';

/**
 * Enum defining possible session states with WebSocket connection tracking
 */
export enum SessionStatus {
  /** Session is active with ongoing voice interaction */
  ACTIVE = 'ACTIVE',
  /** Session exists but no active voice interaction */
  IDLE = 'IDLE',
  /** Session has exceeded its maximum lifetime */
  EXPIRED = 'EXPIRED',
  /** WebSocket connection lost or terminated */
  DISCONNECTED = 'DISCONNECTED'
}

/**
 * Enhanced session metadata interface for security tracking and device management
 */
export interface ISessionMetadata {
  /** Client browser/application identifier */
  userAgent: string;
  /** Client IP address for security tracking */
  ipAddress: string;
  /** Unique device identifier for session binding */
  deviceId: string;
  /** Last known geographic location */
  lastLocation: string;
  /** Security-related flags for session monitoring */
  securityFlags: Record<string, boolean>;
}

/**
 * Core session state interface with comprehensive tracking
 * Implements session management requirements with enhanced security features
 */
export interface ISessionState {
  /** Unique session identifier */
  id: UUID;
  /** Associated user identifier */
  userId: UUID;
  /** Current session status */
  status: SessionStatus;
  /** Session creation timestamp (Unix ms) */
  startTime: number;
  /** Last activity timestamp (Unix ms) */
  lastActiveTime: number;
  /** Session expiry timestamp (Unix ms) - 15 minutes from last activity */
  expiryTime: number;
  /** Enhanced session metadata */
  metadata: ISessionMetadata;
  /** WebSocket connection identifier for real-time communication */
  wsConnectionId: string | null;
}

/**
 * Type alias for session operation results with proper error handling
 */
export type SessionResult = Result<ISessionState>;