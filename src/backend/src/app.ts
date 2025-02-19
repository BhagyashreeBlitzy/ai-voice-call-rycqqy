/**
 * Main application entry point for AI Voice Agent
 * Initializes and configures Express server with comprehensive security,
 * monitoring, and error handling features
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import cors from 'cors'; // ^2.8.5
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^3.0.0
import { v4 as uuidv4 } from 'uuid';

import router from './api/routes';
import { config } from './config';
import { WebSocketService } from './services/websocket/websocket.service';
import { logger } from './utils/logger.utils';
import { createError } from './utils/error.utils';
import { ERROR_CODES } from './constants/error.constants';

export class App {
  private readonly express: Application;
  private readonly websocketService: WebSocketService;

  constructor() {
    this.express = express();
    this.websocketService = new WebSocketService();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initializes application middleware with security and performance features
   */
  private initializeMiddleware(): void {
    // Security headers
    this.express.use(helmet({
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
    this.express.use(cors({
      origin: config.auth.tokenAudience,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials: true,
      maxAge: 900 // 15 minutes
    }));

    // Request compression
    this.express.use(compression());

    // Request logging with correlation IDs
    this.express.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
      next();
    });

    this.express.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      },
      skip: (req: Request) => req.path === '/health'
    }));

    // Body parsing with size limits
    this.express.use(express.json({ limit: '100kb' }));
    this.express.use(express.urlencoded({ extended: true, limit: '100kb' }));

    // Request timeout
    this.express.use((req: Request, res: Response, next: NextFunction) => {
      res.setTimeout(30000, () => {
        res.status(408).json({
          success: false,
          error: createError(ERROR_CODES.SYSTEM_ERROR, {
            message: 'Request timeout'
          })
        });
      });
      next();
    });
  }

  /**
   * Initializes application routes and WebSocket handlers
   */
  private initializeRoutes(): void {
    // API routes
    this.express.use('/api/v1', router);

    // Health check endpoint
    this.express.get('/health', async (req: Request, res: Response) => {
      try {
        const wsHealth = await this.websocketService.checkHealth();
        
        res.status(200).json({
          status: 'healthy',
          version: process.env.APP_VERSION,
          timestamp: new Date().toISOString(),
          websocket: wsHealth ? 'connected' : 'disconnected'
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: createError(ERROR_CODES.SYSTEM_ERROR, {
            message: 'Health check failed'
          })
        });
      }
    });

    // 404 handler
    this.express.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: createError(ERROR_CODES.NOT_FOUND, {
          message: 'Resource not found',
          path: req.path
        })
      });
    });
  }

  /**
   * Initializes comprehensive error handling
   */
  private initializeErrorHandling(): void {
    this.express.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error', {
        error: err,
        path: req.path,
        method: req.method,
        correlationId: req.headers['x-correlation-id']
      });

      res.status(500).json({
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          message: 'An unexpected error occurred'
        })
      });
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Promise rejection', { reason });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });
  }

  /**
   * Starts the HTTP and WebSocket servers
   * @param port Port number to listen on
   */
  public async listen(port: number): Promise<void> {
    try {
      // Initialize WebSocket service
      await this.websocketService.initialize({
        port: port + 1,
        path: '/ws'
      });

      // Start HTTP server
      this.express.listen(port, () => {
        logger.info('Server started', { port });
      });

      // Graceful shutdown handler
      process.on('SIGTERM', async () => {
        await this.websocketService.shutdown();
        process.exit(0);
      });
    } catch (error) {
      logger.error('Server startup failed', { error });
      throw error;
    }
  }
}

export default App;