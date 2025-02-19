/**
 * Type definitions for application configuration interfaces
 * Defines comprehensive type interfaces for core system components including:
 * - Authentication and JWT settings
 * - Database connection and pooling
 * - Redis caching and session management  
 * - Speech processing parameters
 * - WebSocket server configuration
 */

/**
 * Authentication configuration interface for JWT settings
 * Defines security parameters for token generation and validation
 */
export interface AuthConfig {
  /** Secret key used for signing JWTs */
  jwtSecret: string;
  /** JWT expiration time (e.g. "15m", "1h", "7d") */
  jwtExpiresIn: string;
  /** Refresh token expiration time */
  refreshTokenExpiresIn: string;
  /** JWT issuer identifier */
  tokenIssuer: string;
  /** JWT audience identifier */
  tokenAudience: string;
}

/**
 * Database configuration interface for PostgreSQL
 * Defines connection parameters and pool settings
 */
export interface DatabaseConfig {
  /** Database host address */
  host: string;
  /** Database port number */
  port: number;
  /** Database username */
  username: string;
  /** Database password */
  password: string;
  /** Database name */
  database: string;
  /** Enable SSL connection */
  ssl: boolean;
  /** Maximum number of clients in the connection pool */
  poolSize: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMs: number;
}

/**
 * Redis configuration interface for caching and session store
 * Defines connection, retry and prefix settings
 */
export interface RedisConfig {
  /** Redis host address */
  host: string;
  /** Redis port number */
  port: number;
  /** Redis password */
  password: string;
  /** Retry strategy function for failed connections */
  retryStrategy: (retries: number) => number | null;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Connection timeout in milliseconds */
  connectTimeout: number;
  /** Key prefix for namespacing */
  keyPrefix: string;
}

/**
 * Speech processing configuration interface
 * Defines audio processing and recognition parameters
 */
export interface SpeechConfig {
  /** Audio sample rate in Hz */
  sampleRate: number;
  /** Audio encoding format */
  encoding: string;
  /** Speech recognition language code */
  languageCode: string;
  /** Voice activity detection threshold in dB */
  vadThreshold: number;
  /** Noise floor level in dB */
  noiseFloor: number;
  /** Audio frame size in milliseconds */
  frameSize: number;
  /** Audio bit depth */
  bitDepth: number;
}

/**
 * WebSocket server configuration interface
 * Defines connection, performance and reliability settings
 */
export interface WebSocketConfig {
  /** WebSocket endpoint path */
  path: string;
  /** Ping interval in milliseconds */
  pingInterval: number;
  /** Ping timeout in milliseconds */
  pingTimeout: number;
  /** Maximum WebSocket payload size in bytes */
  maxPayloadSize: number;
  /** Client heartbeat interval in milliseconds */
  heartbeatInterval: number;
  /** Maximum reconnection attempts */
  reconnectAttempts: number;
  /** Reconnection interval in milliseconds */
  reconnectInterval: number;
  /** WebSocket compression level (0-9) */
  compressionLevel: number;
  /** Maximum backoff delay for reconnection in milliseconds */
  maxBackoffDelay: number;
}