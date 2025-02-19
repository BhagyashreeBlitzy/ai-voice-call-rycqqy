/**
 * Error constants and standardized error handling definitions for the AI Voice Agent
 * Provides consistent error codes, HTTP status codes, and error messages across the system
 * @version 1.0.0
 */

import { ErrorInfo } from '../types/common.types';

/**
 * Standard HTTP status codes used in API responses
 */
export enum HTTP_STATUS {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Standardized error codes for the application
 * Used to identify specific error types and map to appropriate messages
 */
export enum ERROR_CODES {
  SYSTEM_ERROR = 'SYSTEM_001',
  VALIDATION_ERROR = 'VAL_001',
  AUTH_ERROR = 'AUTH_001',
  NOT_FOUND = 'NF_001',
  AUDIO_DEVICE_ERROR = 'AUDIO_001',
  SPEECH_RECOGNITION_ERROR = 'SPEECH_001',
  VOICE_SYNTHESIS_ERROR = 'VOICE_001',
  WEBSOCKET_ERROR = 'WS_001',
  RATE_LIMIT_ERROR = 'RATE_001',
  NETWORK_ERROR = 'NET_001',
  SERVICE_UNAVAILABLE = 'SVC_001'
}

/**
 * Error message prefix for consistent error formatting
 */
const ERROR_MESSAGE_PREFIX = 'AI Voice Agent Error:';

/**
 * Mapping of error codes to human-readable error messages
 * Messages should be clear, actionable, and user-friendly
 */
export const ERROR_MESSAGES: Record<ERROR_CODES, string> = {
  [ERROR_CODES.SYSTEM_ERROR]: `${ERROR_MESSAGE_PREFIX} An unexpected system error occurred. Please try again later.`,
  [ERROR_CODES.VALIDATION_ERROR]: `${ERROR_MESSAGE_PREFIX} The provided input is invalid. Please check your input and try again.`,
  [ERROR_CODES.AUTH_ERROR]: `${ERROR_MESSAGE_PREFIX} Authentication failed. Please sign in and try again.`,
  [ERROR_CODES.NOT_FOUND]: `${ERROR_MESSAGE_PREFIX} The requested resource was not found.`,
  [ERROR_CODES.AUDIO_DEVICE_ERROR]: `${ERROR_MESSAGE_PREFIX} Unable to access audio device. Please check your microphone permissions and settings.`,
  [ERROR_CODES.SPEECH_RECOGNITION_ERROR]: `${ERROR_MESSAGE_PREFIX} Speech recognition failed. Please try speaking again or switch to text input.`,
  [ERROR_CODES.VOICE_SYNTHESIS_ERROR]: `${ERROR_MESSAGE_PREFIX} Voice synthesis failed. Please try again or contact support if the issue persists.`,
  [ERROR_CODES.WEBSOCKET_ERROR]: `${ERROR_MESSAGE_PREFIX} Real-time communication error. Please check your connection and try again.`,
  [ERROR_CODES.RATE_LIMIT_ERROR]: `${ERROR_MESSAGE_PREFIX} Too many requests. Please wait a moment before trying again.`,
  [ERROR_CODES.NETWORK_ERROR]: `${ERROR_MESSAGE_PREFIX} Network connection error. Please check your internet connection and try again.`,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: `${ERROR_MESSAGE_PREFIX} Service is temporarily unavailable. Please try again later.`
};

/**
 * Helper function to create standardized error info objects
 * @param code Error code from ERROR_CODES enum
 * @param details Optional additional error details
 * @returns ErrorInfo object with standardized format
 */
export const createErrorInfo = (
  code: ERROR_CODES,
  details?: Record<string, unknown>
): ErrorInfo => ({
  code,
  message: ERROR_MESSAGES[code],
  details: details || {},
  timestamp: Date.now() as number,
  stack: process.env.NODE_ENV === 'development' ? new Error().stack : undefined
});