/**
 * Authentication Routes Configuration
 * Implements secure JWT-based authentication flow with comprehensive security controls
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import { v4 as uuidv4 } from 'uuid';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest, sanitizeRequest } from '../middlewares/validation.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';
import { logger } from '../../utils/logger.utils';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema 
} from '../validators/auth.validator';

// Initialize router with strict routing
const router = Router({ strict: true, caseSensitive: true });

// Security middleware chain
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

// CORS configuration
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 900 // 15 minutes
}));

// Request size limits
router.use(express.json({ limit: '100kb' }));
router.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request correlation ID
router.use((req, res, next) => {
  req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
  next();
});

// Request timeout
router.use((req, res, next) => {
  res.setTimeout(30000, () => {
    logger.warn('Request timeout', {
      path: req.path,
      method: req.method,
      correlationId: req.headers['x-correlation-id']
    });
    res.status(408).json({
      success: false,
      error: {
        code: 'TIMEOUT_ERROR',
        message: 'Request timeout'
      }
    });
  });
  next();
});

/**
 * POST /login
 * Authenticates user credentials and returns JWT tokens
 */
router.post('/login',
  authRateLimiter,
  sanitizeRequest,
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const result = await AuthController.login(req, res);
      logger.info('Login attempt processed', {
        success: result.success,
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      });
      return result;
    } catch (error) {
      logger.error('Login error', {
        error,
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed'
        }
      });
    }
  }
);

/**
 * POST /register
 * Creates new user account with secure password hashing
 */
router.post('/register',
  authRateLimiter,
  sanitizeRequest,
  validateRequest(registerSchema),
  async (req, res) => {
    try {
      const result = await AuthController.register(req, res);
      logger.info('Registration attempt processed', {
        success: result.success,
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      });
      return result;
    } catch (error) {
      logger.error('Registration error', {
        error,
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Registration failed'
        }
      });
    }
  }
);

/**
 * POST /refresh-token
 * Refreshes expired access token using valid refresh token
 */
router.post('/refresh-token',
  authRateLimiter,
  sanitizeRequest,
  validateRequest(refreshTokenSchema),
  async (req, res) => {
    try {
      const result = await AuthController.refreshToken(req, res);
      logger.info('Token refresh processed', {
        success: result.success,
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      });
      return result;
    } catch (error) {
      logger.error('Token refresh error', {
        error,
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Token refresh failed'
        }
      });
    }
  }
);

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Route error', {
    error: err,
    path: req.path,
    method: req.method,
    correlationId: req.headers['x-correlation-id']
  });
  
  res.status(500).json({
    success: false,
    error: {
      code: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

export default router;