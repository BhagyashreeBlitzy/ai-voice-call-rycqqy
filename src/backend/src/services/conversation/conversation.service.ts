import { Redis } from 'ioredis'; // v5.3.0
import { Counter, Histogram, Registry } from 'prom-client'; // v14.0.0
import CircuitBreaker from 'opossum'; // v6.0.0
import { createLogger, format, transports } from 'winston'; // v3.8.0

import { Conversation, ConversationStatus, ConversationCreateParams } from '../../interfaces/conversation.interface';
import { ConversationRepository } from '../../db/repositories/conversation.repository';
import { Result } from '../../types/common.types';
import { Message, MessageRole } from '../../interfaces/message.interface';
import { SessionStatus } from '../../interfaces/session.interface';

/**
 * Enhanced service class for managing AI voice conversations with comprehensive
 * monitoring, performance tracking, and resilience features
 */
export class ConversationService {
  private readonly logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [
      new transports.Console(),
      new transports.File({ filename: 'conversation-service.log' })
    ]
  });

  private readonly metrics = {
    activeConversations: new Counter({
      name: 'conversation_active_total',
      help: 'Number of active conversations'
    }),
    conversationDuration: new Histogram({
      name: 'conversation_duration_seconds',
      help: 'Conversation duration in seconds',
      buckets: [30, 60, 120, 300, 600]
    }),
    responseLatency: new Histogram({
      name: 'conversation_response_latency_ms',
      help: 'AI response latency in milliseconds',
      buckets: [100, 250, 500, 1000, 2000]
    })
  };

  private readonly redisClient: Redis;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageService: any,
    private readonly sessionService: any,
    config: any
  ) {
    // Initialize Redis client with retry strategy
    this.redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    // Initialize circuit breaker for resilience
    this.circuitBreaker = new CircuitBreaker(
      async (operation: Function) => await operation(),
      {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      }
    );

    this.setupErrorHandlers();
  }

  /**
   * Creates a new conversation with enhanced monitoring and performance tracking
   */
  async createConversation(params: ConversationCreateParams): Promise<Result<Conversation>> {
    const startTime = Date.now();
    
    try {
      // Verify session status
      const sessionResult = await this.sessionService.getSession(params.sessionId);
      if (!sessionResult.success || sessionResult.data.status !== SessionStatus.ACTIVE) {
        throw new Error('Invalid or inactive session');
      }

      // Create conversation with monitoring
      const conversationResult = await this.circuitBreaker.fire(async () => {
        return await this.conversationRepository.create({
          sessionId: params.sessionId,
          status: ConversationStatus.ACTIVE,
          context: {
            initialContext: params.initialContext || {},
            preferredLanguage: params.preferredLanguage,
            startTime: Date.now(),
            messageCount: 0,
            turnCount: 0
          }
        });
      });

      if (!conversationResult.success) {
        throw new Error('Failed to create conversation');
      }

      // Initialize conversation cache
      await this.redisClient.setex(
        `conversation:${conversationResult.data.id}:context`,
        3600,
        JSON.stringify(conversationResult.data.context)
      );

      // Update metrics
      this.metrics.activeConversations.inc();
      
      this.logger.info('Conversation created', {
        conversationId: conversationResult.data.id,
        sessionId: params.sessionId,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        data: conversationResult.data,
        metadata: {
          creationTime: startTime,
          processingDuration: Date.now() - startTime
        }
      };
    } catch (error) {
      this.logger.error('Failed to create conversation', {
        error: error.message,
        params
      });

      return {
        success: false,
        error: {
          message: 'Failed to create conversation',
          details: error.message
        }
      };
    }
  }

  /**
   * Retrieves conversation metrics and performance data
   */
  async getConversationMetrics(conversationId: string): Promise<Result<any>> {
    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation.success) {
        throw new Error('Conversation not found');
      }

      const cachedMetrics = await this.redisClient.get(`conversation:${conversationId}:metrics`);
      const metrics = cachedMetrics ? JSON.parse(cachedMetrics) : {};

      const currentMetrics = {
        duration: Date.now() - conversation.data.context.startTime,
        messageCount: conversation.data.context.messageCount,
        turnCount: conversation.data.context.turnCount,
        averageResponseTime: metrics.totalResponseTime / metrics.responseCount || 0
      };

      return {
        success: true,
        data: currentMetrics
      };
    } catch (error) {
      this.logger.error('Failed to retrieve conversation metrics', {
        conversationId,
        error: error.message
      });

      return {
        success: false,
        error: {
          message: 'Failed to retrieve metrics',
          details: error.message
        }
      };
    }
  }

  /**
   * Performs health check of the conversation service
   */
  async healthCheck(): Promise<Result<any>> {
    try {
      const checks = await Promise.all([
        this.redisClient.ping(),
        this.conversationRepository.findById('test-id'),
        this.messageService.healthCheck()
      ]);

      const status = checks.every(check => check !== null);

      return {
        success: true,
        data: {
          status: status ? 'healthy' : 'degraded',
          timestamp: Date.now(),
          checks: {
            redis: checks[0] === 'PONG',
            database: checks[1] !== null,
            messageService: checks[2] !== null
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'Health check failed',
          details: error.message
        }
      };
    }
  }

  private setupErrorHandlers(): void {
    this.redisClient.on('error', (error) => {
      this.logger.error('Redis client error', { error: error.message });
    });

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-opened');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed');
    });
  }
}