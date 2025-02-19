import { jest } from '@jest/globals';
import { Redis } from 'ioredis-mock';
import { ConversationService } from '../../../src/services/conversation/conversation.service';
import { MessageService } from '../../../src/services/conversation/message.service';
import { SessionService } from '../../../src/services/session/session.service';
import { ConversationRepository } from '../../../db/repositories/conversation.repository';
import { ConversationStatus } from '../../../interfaces/conversation.interface';
import { MessageRole } from '../../../interfaces/message.interface';
import { SessionStatus } from '../../../interfaces/session.interface';
import { ERROR_CODES } from '../../../constants/error.constants';

describe('ConversationService', () => {
  let conversationService: ConversationService;
  let mockConversationRepository: jest.Mocked<ConversationRepository>;
  let mockMessageService: jest.Mocked<MessageService>;
  let mockSessionService: jest.Mocked<SessionService>;
  let mockRedis: Redis;

  const mockConfig = {
    redis: {
      host: 'localhost',
      port: 6379,
      password: '',
    }
  };

  const mockSessionId = 'test-session-123';
  const mockConversationId = 'test-conversation-123';
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    // Initialize mocks
    mockConversationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockMessageService = {
      createMessage: jest.fn(),
      getMessagesByConversation: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    mockSessionService = {
      getSession: jest.fn(),
      validateSession: jest.fn(),
    } as any;

    mockRedis = new Redis();

    // Initialize service
    conversationService = new ConversationService(
      mockConversationRepository,
      mockMessageService,
      mockSessionService,
      mockConfig
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRedis.flushall();
  });

  describe('createConversation', () => {
    const createParams = {
      sessionId: mockSessionId,
      initialContext: { language: 'en-US' },
      preferredLanguage: 'en-US',
    };

    it('should create new conversation with valid session within 2s', async () => {
      // Setup mocks
      mockSessionService.getSession.mockResolvedValue({
        success: true,
        data: {
          id: mockSessionId,
          status: SessionStatus.ACTIVE,
          userId: mockUserId,
        },
      });

      mockConversationRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: mockConversationId,
          sessionId: mockSessionId,
          status: ConversationStatus.ACTIVE,
          context: createParams.initialContext,
        },
      });

      // Execute with timer
      const startTime = Date.now();
      const result = await conversationService.createConversation(createParams);
      const duration = Date.now() - startTime;

      // Verify
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockConversationId);
      expect(duration).toBeLessThan(2000);
      expect(mockSessionService.getSession).toHaveBeenCalledWith(mockSessionId);
      expect(mockConversationRepository.create).toHaveBeenCalled();
    });

    it('should reject creation with invalid session token', async () => {
      mockSessionService.getSession.mockResolvedValue({
        success: false,
        error: {
          code: ERROR_CODES.AUTH_ERROR,
          message: 'Invalid session',
        },
      });

      const result = await conversationService.createConversation(createParams);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid or inactive session');
    });

    it('should initialize conversation context with default values', async () => {
      mockSessionService.getSession.mockResolvedValue({
        success: true,
        data: {
          id: mockSessionId,
          status: SessionStatus.ACTIVE,
          userId: mockUserId,
        },
      });

      mockConversationRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: mockConversationId,
          sessionId: mockSessionId,
          status: ConversationStatus.ACTIVE,
          context: {
            initialContext: {},
            preferredLanguage: 'en-US',
            startTime: expect.any(Number),
            messageCount: 0,
            turnCount: 0,
          },
        },
      });

      const result = await conversationService.createConversation({
        sessionId: mockSessionId,
        preferredLanguage: 'en-US',
      });

      expect(result.success).toBe(true);
      expect(result.data.context).toMatchObject({
        messageCount: 0,
        turnCount: 0,
        preferredLanguage: 'en-US',
      });
    });
  });

  describe('getConversationMetrics', () => {
    it('should retrieve conversation metrics within 2s', async () => {
      const mockMetrics = {
        duration: 1000,
        messageCount: 5,
        turnCount: 3,
        averageResponseTime: 250,
      };

      mockConversationRepository.findById.mockResolvedValue({
        success: true,
        data: {
          id: mockConversationId,
          context: {
            startTime: Date.now() - 1000,
            messageCount: 5,
            turnCount: 3,
          },
        },
      });

      const startTime = Date.now();
      const result = await conversationService.getConversationMetrics(mockConversationId);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        messageCount: mockMetrics.messageCount,
        turnCount: mockMetrics.turnCount,
      });
      expect(duration).toBeLessThan(2000);
    });

    it('should return 404 for non-existent conversation', async () => {
      mockConversationRepository.findById.mockResolvedValue({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Conversation not found',
        },
      });

      const result = await conversationService.getConversationMetrics('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Conversation not found');
    });
  });

  describe('healthCheck', () => {
    it('should perform health check of all dependencies', async () => {
      mockRedis.ping = jest.fn().mockResolvedValue('PONG');
      mockMessageService.healthCheck.mockResolvedValue(true);
      mockConversationRepository.findById.mockResolvedValue({ success: true });

      const result = await conversationService.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('healthy');
      expect(result.data.checks).toEqual({
        redis: true,
        database: true,
        messageService: true,
      });
    });

    it('should report degraded status when dependencies fail', async () => {
      mockRedis.ping = jest.fn().mockRejectedValue(new Error('Redis error'));
      mockMessageService.healthCheck.mockResolvedValue(false);
      mockConversationRepository.findById.mockResolvedValue({ success: false });

      const result = await conversationService.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('degraded');
    });
  });

  // Circuit breaker tests
  describe('circuit breaker', () => {
    it('should handle service failures gracefully', async () => {
      // Simulate multiple failures to trigger circuit breaker
      mockConversationRepository.create.mockRejectedValue(new Error('Service error'));

      for (let i = 0; i < 6; i++) {
        const result = await conversationService.createConversation({
          sessionId: mockSessionId,
          preferredLanguage: 'en-US',
        });
        expect(result.success).toBe(false);
      }

      // Verify circuit breaker metrics are tracked
      const healthCheck = await conversationService.healthCheck();
      expect(healthCheck.data.status).toBe('degraded');
    });
  });

  // Performance tests
  describe('performance requirements', () => {
    it('should maintain response times under 2 seconds under load', async () => {
      mockSessionService.getSession.mockResolvedValue({
        success: true,
        data: {
          id: mockSessionId,
          status: SessionStatus.ACTIVE,
          userId: mockUserId,
        },
      });

      mockConversationRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: mockConversationId,
          sessionId: mockSessionId,
          status: ConversationStatus.ACTIVE,
          context: {},
        },
      });

      const requests = Array(10).fill(null).map(() => 
        conversationService.createConversation({
          sessionId: mockSessionId,
          preferredLanguage: 'en-US',
        })
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});