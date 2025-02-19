import { GenericContainer, StartedTestContainer } from 'testcontainers'; // v9.0.0
import { ConversationService } from '../../src/services/conversation/conversation.service';
import { MessageService } from '../../src/services/conversation/message.service';
import { AudioStorageService } from '../../src/services/storage/audioStorage.service';
import { ConversationRepository } from '../../db/repositories/conversation.repository';
import { MessageRepository } from '../../db/repositories/message.repository';
import { ConversationStatus } from '../../interfaces/conversation.interface';
import { MessageRole } from '../../interfaces/message.interface';
import { SessionStatus } from '../../interfaces/session.interface';
import { prisma } from '../../config/database.config';
import Redis from 'ioredis'; // v5.3.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

describe('Conversation Integration Tests', () => {
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let conversationService: ConversationService;
  let messageService: MessageService;
  let redisClient: Redis;
  let testUser: { id: string; email: string };
  let testSession: { id: string; token: string };

  const TEST_TIMEOUT = 30000;
  const POSTGRES_VERSION = '15-alpine';
  const REDIS_VERSION = '7-alpine';

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new GenericContainer(`postgres:${POSTGRES_VERSION}`)
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'testdb'
      })
      .withExposedPorts(5432)
      .start();

    // Start Redis container
    redisContainer = await new GenericContainer(`redis:${REDIS_VERSION}`)
      .withExposedPorts(6379)
      .start();

    // Configure database connection
    const dbConfig = {
      host: postgresContainer.getHost(),
      port: postgresContainer.getMappedPort(5432),
      username: 'test',
      password: 'test',
      database: 'testdb'
    };

    // Configure Redis connection
    redisClient = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379)
    });

    // Initialize repositories
    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();
    const audioStorage = new AudioStorageService({
      region: 'local',
      bucketName: 'test-bucket',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });

    // Initialize services
    messageService = new MessageService(messageRepo, audioStorage);
    conversationService = new ConversationService(
      conversationRepo,
      messageService,
      redisClient
    );

    // Create test user and session
    testUser = {
      id: uuidv4(),
      email: 'test@example.com'
    };

    testSession = {
      id: uuidv4(),
      token: uuidv4()
    };

    // Apply database migrations
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL,
        status TEXT NOT NULL,
        context JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup resources
    await redisClient.quit();
    await prisma.$disconnect();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  describe('Conversation Lifecycle', () => {
    let conversationId: string;

    it('should create a new conversation', async () => {
      const result = await conversationService.createConversation({
        sessionId: testSession.id,
        initialContext: {
          userId: testUser.id,
          language: 'en-US'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe(ConversationStatus.ACTIVE);
      expect(result.data.sessionId).toBe(testSession.id);

      conversationId = result.data.id;

      // Verify Redis cache
      const cachedContext = await redisClient.get(`conversation:${conversationId}:context`);
      expect(cachedContext).toBeDefined();
      expect(JSON.parse(cachedContext!)).toMatchObject({
        userId: testUser.id,
        language: 'en-US'
      });
    });

    it('should add messages to the conversation', async () => {
      // Add user message
      const userMessage = await messageService.createMessage({
        conversationId,
        role: MessageRole.USER,
        content: 'Hello AI assistant',
        metadata: {
          timestamp: Date.now(),
          deviceInfo: 'test-device'
        }
      });

      expect(userMessage.success).toBe(true);
      expect(userMessage.data.role).toBe(MessageRole.USER);

      // Add AI response
      const aiMessage = await messageService.createMessage({
        conversationId,
        role: MessageRole.AI,
        content: 'Hello! How can I help you today?',
        metadata: {
          timestamp: Date.now(),
          processingTime: 150
        }
      });

      expect(aiMessage.success).toBe(true);
      expect(aiMessage.data.role).toBe(MessageRole.AI);

      // Verify message retrieval
      const messages = await messageService.getMessagesByConversation(conversationId);
      expect(messages.success).toBe(true);
      expect(messages.data).toHaveLength(2);
      expect(messages.data[0].content).toBe('Hello AI assistant');
      expect(messages.data[1].content).toBe('Hello! How can I help you today?');
    });

    it('should update conversation context', async () => {
      const updateResult = await conversationService.updateContext(conversationId, {
        lastTopic: 'greeting',
        messageCount: 2,
        lastActivity: Date.now()
      });

      expect(updateResult.success).toBe(true);

      // Verify database update
      const conversation = await conversationService.getConversation(conversationId);
      expect(conversation.success).toBe(true);
      expect(conversation.data.context).toMatchObject({
        lastTopic: 'greeting',
        messageCount: 2
      });

      // Verify Redis cache update
      const cachedContext = await redisClient.get(`conversation:${conversationId}:context`);
      expect(JSON.parse(cachedContext!)).toMatchObject({
        lastTopic: 'greeting',
        messageCount: 2
      });
    });

    it('should end the conversation', async () => {
      const endResult = await conversationService.endConversation(conversationId);
      expect(endResult.success).toBe(true);

      const conversation = await conversationService.getConversation(conversationId);
      expect(conversation.data.status).toBe(ConversationStatus.COMPLETED);

      // Verify Redis cache cleanup
      const cachedContext = await redisClient.get(`conversation:${conversationId}:context`);
      expect(cachedContext).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session creation', async () => {
      const result = await conversationService.createConversation({
        sessionId: 'invalid-session',
        initialContext: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('VALIDATION_ERROR');
    });

    it('should handle concurrent message creation', async () => {
      const conversationId = uuidv4();
      const promises = Array(5).fill(null).map(() => 
        messageService.createMessage({
          conversationId,
          role: MessageRole.USER,
          content: 'Concurrent message',
          metadata: { timestamp: Date.now() }
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(5);
    });

    it('should handle Redis connection failure', async () => {
      await redisClient.disconnect();

      const result = await conversationService.createConversation({
        sessionId: testSession.id,
        initialContext: {}
      });

      expect(result.success).toBe(true); // Should succeed with fallback
      await redisClient.connect();
    });
  });

  describe('Performance', () => {
    it('should handle message retrieval with pagination', async () => {
      const conversationId = uuidv4();
      
      // Create 100 messages
      const createPromises = Array(100).fill(null).map((_, i) =>
        messageService.createMessage({
          conversationId,
          role: i % 2 === 0 ? MessageRole.USER : MessageRole.AI,
          content: `Message ${i}`,
          metadata: { timestamp: Date.now() }
        })
      );

      await Promise.all(createPromises);

      // Test pagination
      const page1 = await messageService.getMessagesByConversation(conversationId, { limit: 20, offset: 0 });
      const page2 = await messageService.getMessagesByConversation(conversationId, { limit: 20, offset: 20 });

      expect(page1.data).toHaveLength(20);
      expect(page2.data).toHaveLength(20);
      expect(page1.data[0].content).toBe('Message 0');
      expect(page2.data[0].content).toBe('Message 20');
    });

    it('should maintain performance under load', async () => {
      const start = Date.now();
      const operations = Array(50).fill(null).map(() =>
        conversationService.createConversation({
          sessionId: uuidv4(),
          initialContext: { timestamp: Date.now() }
        })
      );

      await Promise.all(operations);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});