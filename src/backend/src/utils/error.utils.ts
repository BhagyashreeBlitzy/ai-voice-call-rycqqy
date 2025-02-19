/**
 * Error handling utilities for the AI Voice Agent backend system
 * Provides standardized error creation, handling, and sanitization
 * @version 1.0.0
 */

import { ErrorInfo, Result } from '../types/common.types';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/error.constants';
import { logger } from './logger.utils';

// Sensitive data patterns for error sanitization
const SENSITIVE_PATTERNS = [
  /(password|token|secret|key|auth).*?[:=]\s*['"].*?['"]/gi,
  /([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?/g, // Base64
  /[0-9]{3}-[0-9]{2}-[0-9]{4}/g, // SSN
  /[0-9]{16}/g, // Credit Card
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g // Email
];

// Stack trace patterns to remove
const STACK_PATTERNS = [
  /at .* \(.*\)/g,
  /at .*/g
];

/**
 * Creates a standardized error object with code, message and optional details
 * @param code - Error code from ERROR_CODES enum
 * @param details - Optional additional error context
 * @returns Standardized ErrorInfo object
 */
export const createError = (
  code: ERROR_CODES,
  details?: Record<string, unknown>
): ErrorInfo => {
  const error: ErrorInfo = {
    code,
    message: ERROR_MESSAGES[code],
    details: details || {},
    timestamp: Date.now() as number
  };

  if (process.env.NODE_ENV === 'development') {
    error.stack = new Error().stack;
  }

  return error;
};

/**
 * Type guard to check if an error is an ErrorInfo object
 * @param error - Error to check
 * @returns Boolean indicating if error is ErrorInfo
 */
export const isErrorInfo = (error: unknown): error is ErrorInfo => {
  if (!error || typeof error !== 'object') return false;
  
  const errorObj = error as ErrorInfo;
  return (
    typeof errorObj.code === 'string' &&
    typeof errorObj.message === 'string' &&
    typeof errorObj.details === 'object'
  );
};

/**
 * Enhanced error sanitization with security features
 * Removes sensitive data, stack traces, and internal information
 * @param error - Error to sanitize
 * @returns Sanitized error object
 */
export const sanitizeError = (error: ErrorInfo): ErrorInfo => {
  const sanitized: ErrorInfo = {
    ...error,
    message: error.message,
    details: { ...error.details }
  };

  // Sanitize message
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized.message = sanitized.message.replace(pattern, '[REDACTED]');
  });

  // Sanitize details recursively
  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      let sanitizedValue = value;
      SENSITIVE_PATTERNS.forEach(pattern => {
        sanitizedValue = sanitizedValue.replace(pattern, '[REDACTED]');
      });
      return sanitizedValue;
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      Object.entries(value).forEach(([key, val]) => {
        sanitizedObj[key] = sanitizeValue(val);
      });
      return sanitizedObj;
    }
    return value;
  };

  sanitized.details = sanitizeValue(sanitized.details) as Record<string, unknown>;

  // Remove stack traces in production
  if (process.env.NODE_ENV === 'production') {
    delete sanitized.stack;
  } else if (sanitized.stack) {
    STACK_PATTERNS.forEach(pattern => {
      sanitized.stack = sanitized.stack?.replace(pattern, '[STACK TRACE REMOVED]');
    });
  }

  return sanitized;
};

/**
 * Processes an error and returns a standardized Result object
 * Handles both ErrorInfo and standard Error objects
 * @param error - Error to handle
 * @param context - Additional context for logging
 * @returns Standardized Result object
 */
export const handleError = (
  error: Error | ErrorInfo,
  context: Record<string, unknown> = {}
): Result<void> => {
  let errorInfo: ErrorInfo;

  // Convert standard Error to ErrorInfo if needed
  if (!isErrorInfo(error)) {
    errorInfo = createError(
      ERROR_CODES.SYSTEM_ERROR,
      {
        originalError: {
          message: error.message,
          name: error.name,
          ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
        },
        ...context
      }
    );
  } else {
    errorInfo = error;
  }

  // Sanitize error before logging
  const sanitizedError = sanitizeError(errorInfo);

  // Log error with context
  logger.error(sanitizedError.message, {
    errorCode: sanitizedError.code,
    errorDetails: sanitizedError.details,
    ...context
  });

  // Return standardized result
  return {
    success: false,
    error: sanitizedError,
    data: undefined,
    metadata: context
  };
};