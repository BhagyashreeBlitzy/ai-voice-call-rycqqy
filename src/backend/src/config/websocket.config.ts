/**
 * WebSocket Server Configuration Module
 * Defines secure and optimized settings for real-time voice communication
 * 
 * @module config/websocket
 * @version 1.0.0
 */

import { config } from 'dotenv'; // ^16.0.3
import { WebSocketConfig } from '../types/config.types';

// Load environment variables
config();

/**
 * Production-ready WebSocket server configuration
 * Implements secure defaults and performance optimizations for voice streaming
 */
export const websocketConfig: WebSocketConfig = {
  // WebSocket endpoint path
  path: process.env.WS_PATH || '/ws',

  // Connection health monitoring
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10), // 30 seconds
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10), // 5 seconds
  heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '25000', 10), // 25 seconds

  // Payload and performance settings
  maxPayloadSize: parseInt(process.env.WS_MAX_PAYLOAD_SIZE || '65536', 10), // 64KB - optimized for voice data chunks
  compressionLevel: parseInt(process.env.WS_COMPRESSION_LEVEL || '6', 10), // Balance between compression and CPU usage

  // Reconnection settings
  reconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS || '5', 10),
  reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '1000', 10), // 1 second
  maxBackoffDelay: parseInt(process.env.WS_MAX_BACKOFF_DELAY || '30000', 10), // 30 seconds

  // Security settings
  securityOptions: {
    requireTLS: process.env.WS_REQUIRE_TLS !== 'false', // Enforce WSS
    allowedOrigins: (process.env.WS_ALLOWED_ORIGINS || 'https://*.example.com').split(','),
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    }
  },

  // Rate limiting settings
  rateLimiting: {
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '1000', 10),
    maxConnectionsPerIP: parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '5', 10),
    messageRateLimit: parseInt(process.env.WS_MESSAGE_RATE_LIMIT || '100', 10), // messages
    messageRatePeriod: parseInt(process.env.WS_MESSAGE_RATE_PERIOD || '60000', 10), // per minute
  }
};

// Type assertion to ensure all required fields are present
const validateConfig = (config: WebSocketConfig): void => {
  const requiredFields: (keyof WebSocketConfig)[] = [
    'path',
    'pingInterval',
    'pingTimeout',
    'maxPayloadSize',
    'heartbeatInterval',
    'reconnectAttempts',
    'reconnectInterval',
    'compressionLevel',
    'maxBackoffDelay',
    'securityOptions',
    'rateLimiting'
  ];

  requiredFields.forEach(field => {
    if (config[field] === undefined) {
      throw new Error(`Missing required WebSocket configuration field: ${field}`);
    }
  });
};

// Validate configuration on module load
validateConfig(websocketConfig);

export default websocketConfig;