/**
 * Conversation Routes Configuration
 * Implements secure, monitored routes for managing voice-based AI conversations
 * with comprehensive error handling and audit logging
 * @version 1.0.0
 */

import express from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import { ConversationController } from '../controllers/conversation.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { textRateLimiter } from '../middlewares/rateLimiter.middleware';
import { validateConversation } from '../validators/conversation.validator';
import { logger } from '../../utils/logger.utils';
import { HTTP_STATUS } from '../../constants/error.constants';

// Initialize router with strict routing
const router = express.Router({ strict: true });

// Apply security headers
router.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
}));

// Configure CORS with strict options
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 900 // 15 minutes
}));

/**
 * Create a new conversation
 * POST /conversations
 * @security JWT
 * @rateLimit 100 requests per minute
 */
router.post('/',
  authMiddleware,
  textRateLimiter,
  async (req, res, next) => {
    const startTime = Date.now();
    try {
      // Validate request payload
      const validationResult = await validateConversation(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(validationResult);
      }

      const controller = new ConversationController();
      const result = await controller.createConversation(req, res, next);

      // Log successful creation
      logger.info('Conversation created', {
        userId: req.user?.id,
        duration: Date.now() - startTime,
        conversationId: result?.data?.id
      });

      return result;
    } catch (error) {
      logger.error('Failed to create conversation', {
        error,
        userId: req.user?.id,
        duration: Date.now() - startTime
      });
      next(error);
    }
  }
);

/**
 * Get conversation by ID
 * GET /conversations/:id
 * @security JWT
 * @rateLimit 100 requests per minute
 */
router.get('/:id',
  authMiddleware,
  textRateLimiter,
  async (req, res, next) => {
    const startTime = Date.now();
    try {
      const controller = new ConversationController();
      const result = await controller.getConversation(req, res, next);

      // Log successful retrieval
      logger.info('Conversation retrieved', {
        userId: req.user?.id,
        conversationId: req.params.id,
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      logger.error('Failed to retrieve conversation', {
        error,
        userId: req.user?.id,
        conversationId: req.params.id,
        duration: Date.now() - startTime
      });
      next(error);
    }
  }
);

/**
 * Update conversation
 * PUT /conversations/:id
 * @security JWT
 * @rateLimit 100 requests per minute
 */
router.put('/:id',
  authMiddleware,
  textRateLimiter,
  async (req, res, next) => {
    const startTime = Date.now();
    try {
      // Validate request payload
      const validationResult = await validateConversation(req.body);
      if (!validationResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(validationResult);
      }

      const controller = new ConversationController();
      const result = await controller.updateConversation(req, res, next);

      // Log successful update
      logger.info('Conversation updated', {
        userId: req.user?.id,
        conversationId: req.params.id,
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      logger.error('Failed to update conversation', {
        error,
        userId: req.user?.id,
        conversationId: req.params.id,
        duration: Date.now() - startTime
      });
      next(error);
    }
  }
);

/**
 * End conversation
 * DELETE /conversations/:id
 * @security JWT
 * @rateLimit 100 requests per minute
 */
router.delete('/:id',
  authMiddleware,
  textRateLimiter,
  async (req, res, next) => {
    const startTime = Date.now();
    try {
      const controller = new ConversationController();
      const result = await controller.endConversation(req, res, next);

      // Log successful deletion
      logger.info('Conversation ended', {
        userId: req.user?.id,
        conversationId: req.params.id,
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      logger.error('Failed to end conversation', {
        error,
        userId: req.user?.id,
        conversationId: req.params.id,
        duration: Date.now() - startTime
      });
      next(error);
    }
  }
);

// Error handling middleware
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Route error handler', {
    error: err,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

export default router;