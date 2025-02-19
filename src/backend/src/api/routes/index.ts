/**
 * Main Router Configuration
 * Aggregates and exports all API routes with comprehensive security,
 * monitoring, and error handling features for the AI Voice Agent
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import compression from 'compression'; // ^1.7.4
import helmet from 'helmet'; // ^7.0.0
import morgan from 'morgan'; // ^1.10.0
import { v4 as uuidv4 } from 'uuid';

import authRouter from './auth.routes';
import conversationRouter from './conversation.routes';
import sessionRouter from './session.routes';
import voiceRouter from './voice.routes';
import { logger } from '../../utils/logger.utils';
import { createError } from '../../utils/error.utils';
import { ERROR_CODES } from '../../constants/error.constants';

/**
 * Initializes and configures the main application router with security
 * and monitoring features
 */
const initializeRoutes = (): Router => {
  const router = Router();

  // Apply security headers
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    expectCt: { enforce: true, maxAge: 30 },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "same-origin" },
    xssFilter: true
  }));

  // Enable response compression
  router.use(compression());

  // Add correlation ID to requests
  router.use((req, res, next) => {
    req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
    next();
  });

  // Configure request logging
  router.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    },
    skip: (req) => req.path === '/health'
  }));

  // Configure global rate limiting
  const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  });
  router.use(globalRateLimiter);

  // Health check endpoint
  router.get('/health', async (req, res) => {
    try {
      // Add basic health checks here
      const healthy = true;
      
      if (healthy) {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.APP_VERSION
        });
      } else {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({
        status: 'error',
        message: 'Health check failed'
      });
    }
  });

  // API Documentation endpoint
  router.get('/docs', (req, res) => {
    res.status(200).json({
      version: process.env.APP_VERSION,
      endpoints: {
        '/api/auth': 'Authentication endpoints',
        '/api/conversations': 'Conversation management',
        '/api/sessions': 'Session handling',
        '/api/voice': 'Voice processing and synthesis'
      }
    });
  });

  // Mount route modules
  router.use('/auth', authRouter);
  router.use('/conversations', conversationRouter);
  router.use('/sessions', sessionRouter);
  router.use('/voice', voiceRouter);

  // Global error handling
  router.use((err: Error, req: any, res: any, next: any) => {
    logger.error('Unhandled error', {
      error: err,
      path: req.path,
      method: req.method,
      correlationId: req.headers['x-correlation-id']
    });

    res.status(500).json({
      success: false,
      error: createError(ERROR_CODES.SYSTEM_ERROR, {
        message: 'An unexpected error occurred',
        path: req.path,
        method: req.method
      })
    });
  });

  // 404 handler
  router.use((req, res) => {
    res.status(404).json({
      success: false,
      error: createError(ERROR_CODES.NOT_FOUND, {
        message: 'Resource not found',
        path: req.path,
        method: req.method
      })
    });
  });

  return router;
};

// Create and export configured router
const router = initializeRoutes();
export default router;