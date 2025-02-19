/**
 * API Constants
 * Defines core API-related constants for frontend application communication
 * @version 1.0.0
 */

// Base URLs for API and WebSocket connections
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000/ws/v1';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify'
  },
  SESSIONS: {
    CREATE: '/sessions',
    GET: '/sessions',
    DELETE: '/sessions/:id'
  },
  CONVERSATIONS: {
    CREATE: '/conversations',
    LIST: '/conversations',
    GET: '/conversations/:id',
    MESSAGES: '/conversations/:id/messages',
    AUDIO: '/conversations/:id/audio'
  },
  VOICES: {
    LIST: '/voices',
    GET: '/voices/:id',
    SETTINGS: '/voices/settings'
  }
} as const;

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
} as const;

// HTTP Headers
export const HTTP_HEADERS = {
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  ACCEPT: 'Accept',
  X_CSRF_TOKEN: 'X-CSRF-Token',
  X_REQUEST_ID: 'X-Request-ID'
} as const;

// Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  AUDIO_WAV: 'audio/wav',
  AUDIO_OPUS: 'audio/opus',
  AUDIO_PCM: 'audio/l16' // 16-bit Linear PCM
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success Codes
  OK: 200,
  CREATED: 201,
  
  // Client Error Codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  
  // Server Error Codes
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Type definitions for better TypeScript support
export type ApiEndpoints = typeof API_ENDPOINTS;
export type HttpMethods = typeof HTTP_METHODS;
export type HttpHeaders = typeof HTTP_HEADERS;
export type ContentTypes = typeof CONTENT_TYPES;
export type HttpStatus = typeof HTTP_STATUS;

// Ensure all constants are read-only
Object.freeze(API_ENDPOINTS);
Object.freeze(HTTP_METHODS);
Object.freeze(HTTP_HEADERS);
Object.freeze(CONTENT_TYPES);
Object.freeze(HTTP_STATUS);