import { Request, Response, NextFunction } from 'express'; // v4.18.2
import RateLimiter from 'express-rate-limit'; // v6.7.0
import CircuitBreaker from 'opossum'; // v6.0.0
import PerformanceMonitor from 'performance-monitor'; // v2.0.0

import { ConversationService } from '../../services/conversation/conversation.service';
import { 
  validateCreateConversation, 
  validateUpdateConversation, 
  validateConversationId 
} from '../validators/conversation.validator';
import { HTTP_STATUS, ERROR_CODES, createErrorInfo } from '../../constants/error.constants';
import { ConversationStatus } from '../../interfaces/conversation.interface';
import { Result } from '../../types/common.types';

/**
 * Enhanced controller handling HTTP endpoints for conversation management
 * Implements comprehensive security, monitoring, and reliability features
 */
export class ConversationController {
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RateLimiter;

  constructor(private readonly conversationService: ConversationService) {
    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor({
      metricPrefix: 'conversation_controller',
      sampleRate: 1.0,
      tags: ['api', 'conversation']
    });

    // Configure circuit breaker for service resilience
    this.circuitBreaker = new CircuitBreaker(async (operation: Function) => operation(), {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      name: 'conversation-service'
    });

    // Configure rate limiting
    this.rateLimiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false
    });

    this.setupErrorHandlers();
  }

  /**
   * Creates a new conversation with comprehensive validation and monitoring
   */
  public createConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      // Apply rate limiting
      await this.rateLimiter(req, res, () => {});

      // Validate request payload
      const validationResult = validateCreateConversation(req.body);
      if (!validationResult.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationResult);
        return;
      }

      // Execute service call with circuit breaker
      const result = await this.circuitBreaker.fire(async () => 
        await this.conversationService.createConversation(req.body)
      );

      // Track performance metrics
      this.performanceMonitor.recordMetric('create_conversation', Date.now() - startTime);

      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves conversation details with security validation
   */
  public getConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { conversationId } = req.params;

      // Validate conversation ID
      const validationResult = validateConversationId(conversationId);
      if (!validationResult.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationResult);
        return;
      }

      const result = await this.circuitBreaker.fire(async () =>
        await this.conversationService.getConversationMetrics(conversationId)
      );

      if (!result.success) {
        res.status(HTTP_STATUS.NOT_FOUND).json(result);
        return;
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates conversation status and context with validation
   */
  public updateConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { conversationId } = req.params;

      // Validate request payload and conversation ID
      const validationResult = validateUpdateConversation(req.body, conversationId);
      if (!validationResult.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationResult);
        return;
      }

      const result = await this.circuitBreaker.fire(async () =>
        await this.conversationService.updateContext(conversationId, req.body)
      );

      // Track performance metrics
      this.performanceMonitor.recordMetric('update_conversation', Date.now() - startTime);

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Ends a conversation and updates its status to COMPLETED
   */
  public endConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { conversationId } = req.params;

      // Validate conversation ID
      const validationResult = validateConversationId(conversationId);
      if (!validationResult.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationResult);
        return;
      }

      const result = await this.circuitBreaker.fire(async () =>
        await this.conversationService.endConversation(conversationId)
      );

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Sets up error handlers for circuit breaker and performance monitoring
   */
  private setupErrorHandlers(): void {
    this.circuitBreaker.on('open', () => {
      console.warn('Conversation service circuit breaker opened');
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.info('Conversation service circuit breaker half-opened');
    });

    this.circuitBreaker.on('close', () => {
      console.info('Conversation service circuit breaker closed');
    });

    this.performanceMonitor.on('error', (error: Error) => {
      console.error('Performance monitoring error:', error);
    });
  }
}