/**
 * Session Management Routes
 * Implements secure session handling with Redis + JWT, rate limiting,
 * and comprehensive validation for the AI Voice Agent
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import { SessionController } from '../controllers/session.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';
import { validateRequest, sanitizeRequest } from '../middlewares/validation.middleware';

// Session validation schemas
const createSessionSchema = {
  $id: 'createSession',
  type: 'object',
  required: ['userId', 'metadata'],
  properties: {
    userId: { type: 'string', format: 'uuid' },
    metadata: {
      type: 'object',
      required: ['userAgent', 'ipAddress', 'deviceId'],
      properties: {
        userAgent: { type: 'string', minLength: 1 },
        ipAddress: { 
          type: 'string',
          pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$'
        },
        deviceId: { type: 'string', minLength: 8 },
        location: { type: 'string' },
        isSecure: { type: 'boolean' },
        isTrusted: { type: 'boolean' }
      }
    }
  }
};

const validateSessionSchema = {
  $id: 'validateSession',
  type: 'object',
  required: ['sessionId'],
  properties: {
    sessionId: { type: 'string', format: 'uuid' }
  }
};

const refreshSessionSchema = {
  $id: 'refreshSession',
  type: 'object',
  required: ['sessionId', 'refreshToken'],
  properties: {
    sessionId: { type: 'string', format: 'uuid' },
    refreshToken: { type: 'string', minLength: 1 }
  }
};

const endSessionSchema = {
  $id: 'endSession',
  type: 'object',
  required: ['sessionId'],
  properties: {
    sessionId: { type: 'string', format: 'uuid' }
  }
};

/**
 * Initializes session management routes with security middleware chain
 * @param sessionController Initialized session controller instance
 * @returns Configured Express router
 */
const initializeRoutes = (sessionController: SessionController): Router => {
  const router = Router({ strict: true });

  // Apply security headers
  router.use(helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true
  }));

  // Apply global rate limiter to all session routes
  router.use(authRateLimiter);

  // Create new session
  router.post('/create',
    sanitizeRequest,
    validateRequest(createSessionSchema),
    async (req, res, next) => {
      await sessionController.createSession(req, res, next);
    }
  );

  // Validate existing session
  router.post('/validate',
    authMiddleware,
    sanitizeRequest,
    validateRequest(validateSessionSchema),
    async (req, res, next) => {
      await sessionController.validateSession(req, res, next);
    }
  );

  // Refresh session tokens
  router.post('/refresh',
    sanitizeRequest,
    validateRequest(refreshSessionSchema),
    async (req, res, next) => {
      await sessionController.refreshSession(req, res, next);
    }
  );

  // End session
  router.post('/end',
    authMiddleware,
    sanitizeRequest,
    validateRequest(endSessionSchema),
    async (req, res, next) => {
      await sessionController.endSession(req, res, next);
    }
  );

  // Error handling middleware
  router.use((err: Error, req: any, res: any, next: any) => {
    console.error('Session route error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'An unexpected error occurred',
        timestamp: Date.now()
      }
    });
  });

  return router;
};

// Create and export configured router
const sessionRouter = initializeRoutes(new SessionController());
export default sessionRouter;