import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorInfo } from '../../types/common.types';
import { HTTP_STATUS, ERROR_CODES } from '../../constants/error.constants';
import { sanitizeError } from '../../utils/error.utils';
import { logger } from '../../utils/logger.utils';

/**
 * Maps error codes to appropriate HTTP status codes
 * @param errorCode - Application error code
 * @returns Corresponding HTTP status code
 */
const getHttpStatus = (errorCode: string): number => {
  switch (errorCode) {
    case ERROR_CODES.VALIDATION_ERROR:
      return HTTP_STATUS.BAD_REQUEST;
    case ERROR_CODES.AUTH_ERROR:
      return HTTP_STATUS.UNAUTHORIZED;
    case ERROR_CODES.FORBIDDEN:
      return HTTP_STATUS.FORBIDDEN;
    case ERROR_CODES.NOT_FOUND:
      return HTTP_STATUS.NOT_FOUND;
    case ERROR_CODES.RATE_LIMIT_ERROR:
      return HTTP_STATUS.TOO_MANY_REQUESTS;
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return HTTP_STATUS.SERVICE_UNAVAILABLE;
    default:
      return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
};

/**
 * Centralized error handling middleware
 * Implements comprehensive error recovery, sanitization, and security controls
 */
export const errorMiddleware = (
  error: Error | ErrorInfo,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate correlation ID for error tracking
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Determine if error is already formatted
  const isErrorInfo = (error as ErrorInfo).code !== undefined;
  
  // Create standardized error info
  const errorInfo: ErrorInfo = isErrorInfo 
    ? error as ErrorInfo 
    : {
        code: ERROR_CODES.SYSTEM_ERROR,
        message: error.message || 'An unexpected error occurred',
        details: {
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        correlationId
      };

  // Log error with correlation ID and request context
  logger.error(errorInfo.message, {
    correlationId,
    errorCode: errorInfo.code,
    errorDetails: errorInfo.details,
    path: req.path,
    method: req.method,
    requestId: req.id,
    userId: req.user?.id
  });

  // Check for security-sensitive errors
  if (
    errorInfo.code === ERROR_CODES.AUTH_ERROR ||
    errorInfo.code === ERROR_CODES.FORBIDDEN
  ) {
    logger.security(errorInfo.message, {
      correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    });
  }

  // Get appropriate HTTP status code
  const statusCode = getHttpStatus(errorInfo.code);

  // Sanitize error information
  const sanitizedError = sanitizeError(errorInfo);

  // Format error response based on environment
  const errorResponse = {
    error: {
      code: sanitizedError.code,
      message: sanitizedError.message,
      ...(process.env.NODE_ENV === 'development' && {
        details: sanitizedError.details,
        stack: sanitizedError.stack
      })
    },
    correlationId,
    timestamp: new Date().toISOString()
  };

  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);

  // Send error response
  res.status(statusCode).json(errorResponse);

  // Ensure express continues
  next();
};