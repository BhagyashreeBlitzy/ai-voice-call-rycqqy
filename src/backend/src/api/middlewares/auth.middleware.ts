/**
 * Authentication Middleware for AI Voice Agent
 * Implements JWT token validation with enhanced security features
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { jwtService } from '../../services/auth/jwt.service';
import { IAuthRequest } from '../../interfaces/auth.interface';
import { HTTP_STATUS } from '../../constants/error.constants';
import { logger } from '../../utils/logger.utils';
import { createError } from '../../utils/error.utils';
import { UUID } from '../../types/common.types';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Token extraction regex
const TOKEN_REGEX = /^Bearer\s+([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*)$/;

/**
 * Extracts JWT token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Extracted token or null if invalid
 */
const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  const match = authHeader.match(TOKEN_REGEX);
  if (!match) return null;

  const token = match[1];
  if (token.length > 1024) return null; // Prevent token length attacks

  return token;
};

/**
 * Checks rate limiting for client IP
 * @param clientIp - Client IP address
 * @returns Boolean indicating if request should be rate limited
 */
const checkRateLimit = (clientIp: string): boolean => {
  const now = Date.now();
  const clientLimit = rateLimitMap.get(clientIp);

  if (!clientLimit || now > clientLimit.resetTime) {
    rateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return false;
  }

  if (clientLimit.count >= MAX_REQUESTS) {
    return true;
  }

  clientLimit.count++;
  return false;
};

/**
 * Generates security metadata for request tracking
 * @param req - Express request object
 * @returns Security metadata object
 */
const generateSecurityMetadata = (req: Request) => ({
  clientIp: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
  requestId: req.headers['x-request-id'] as string || crypto.randomUUID(),
  sessionId: req.headers['x-session-id'] as string
});

/**
 * Authentication middleware with enhanced security features
 * Validates JWT tokens and enforces security policies
 */
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const securityMetadata = generateSecurityMetadata(req);

  try {
    // Check rate limiting
    if (checkRateLimit(req.ip)) {
      logger.warn('Rate limit exceeded', { clientIp: req.ip, ...securityMetadata });
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        error: createError('RATE_LIMIT_ERROR', {
          retryAfter: Math.ceil((rateLimitMap.get(req.ip)?.resetTime || 0 - Date.now()) / 1000)
        })
      });
      return;
    }

    // Extract and validate token
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      throw createError('AUTH_ERROR', { message: 'Missing or invalid authorization token' });
    }

    // Verify token is not blacklisted
    if (await jwtService.isTokenBlacklisted(token)) {
      throw createError('AUTH_ERROR', { message: 'Token has been revoked' });
    }

    // Verify token and extract payload
    const decodedToken = await jwtService.verifyToken(token);

    // Enhance request with authenticated user context
    (req as IAuthRequest).user = {
      id: decodedToken.userId as UUID,
      email: decodedToken.email,
      role: decodedToken.role,
      securityMetadata: {
        ...securityMetadata,
        lastActivity: new Date().toISOString(),
        tokenFingerprint: decodedToken.fingerprint
      }
    };

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: decodedToken.userId,
      role: decodedToken.role,
      ...securityMetadata
    });

    // Track authentication performance
    const authDuration = Date.now() - startTime;
    logger.debug('Authentication performance', {
      duration: authDuration,
      ...securityMetadata
    });

    next();
  } catch (error) {
    // Handle various authentication errors
    logger.error('Authentication failed', {
      error,
      ...securityMetadata
    });

    if (error.code === 'TOKEN_EXPIRED') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: createError('AUTH_ERROR', { message: 'Token has expired' })
      });
      return;
    }

    if (error.code === 'TOKEN_INVALID') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: createError('AUTH_ERROR', { message: 'Invalid token' })
      });
      return;
    }

    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: createError('AUTH_ERROR', { message: 'Authentication failed' })
    });
  }
};

export default authMiddleware;