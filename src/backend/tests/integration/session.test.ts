import { GenericContainer, StartedTestContainer } from 'testcontainers'; // v9.0.0
import Redis from 'ioredis'; // v5.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { SessionService } from '../../src/services/session/session.service';
import { SessionRepository } from '../../src/db/repositories/session.repository';
import { prisma } from '../../src/config/database.config';
import { ISessionState, SessionStatus } from '../../src/interfaces/session.interface';
import { UUID } from '../../src/types/common.types';
import { logger } from '../../src/utils/logger.utils';
import { ERROR_CODES } from '../../src/constants/error.constants';

describe('Session Integration Tests', () => {
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let sessionService: SessionService;
  let sessionRepository: SessionRepository;
  let redisClient: Redis;

  // Test data generators
  const generateTestUser = () => ({
    id: uuidv4() as UUID,
    email: `test-${uuidv4()}@example.com`,
    role: 'user'
  });

  const generateSessionMetadata = () => ({
    userAgent: 'Mozilla/5.0 Test Browser',
    ipAddress: '127.0.0.1',
    deviceId: uuidv4(),
    lastLocation: 'Test Location',
    securityFlags: {
      isSecureContext: true,
      isTrustedDevice: true
    }
  });

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'testdb'
      })
      .withExposedPorts(5432)
      .start();

    // Start Redis container
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    // Configure test database connection
    process.env.DATABASE_URL = `postgresql://test:test@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/testdb`;

    // Initialize Redis client
    redisClient = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379)
    });

    // Initialize repository and service
    sessionRepository = new SessionRepository();
    sessionService = new SessionService(sessionRepository, logger);

    // Apply database migrations
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      status TEXT NOT NULL,
      start_time TIMESTAMP NOT NULL,
      last_active_time TIMESTAMP NOT NULL,
      expiry_time TIMESTAMP NOT NULL,
      metadata JSONB NOT NULL,
      ws_connection_id TEXT
    )`;
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
    await redisClient.quit();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.$executeRaw`TRUNCATE TABLE sessions`;
    await redisClient.flushall();
  });

  describe('Session Creation', () => {
    it('should create a new session with proper security controls', async () => {
      // Arrange
      const testUser = generateTestUser();
      const metadata = generateSessionMetadata();

      // Act
      const result = await sessionService.createUserSession(testUser.id, metadata);

      // Assert
      expect(result.session).toBeDefined();
      expect(result.session.id).toBeDefined();
      expect(result.session.userId).toBe(testUser.id);
      expect(result.session.status).toBe(SessionStatus.ACTIVE);
      expect(result.session.metadata).toEqual(metadata);

      // Verify database record
      const dbSession = await prisma.session.findUnique({
        where: { id: result.session.id }
      });
      expect(dbSession).toBeDefined();
      expect(dbSession?.userId).toBe(testUser.id);

      // Verify Redis cache
      const cachedSession = await redisClient.get(`session:${result.session.id}`);
      expect(cachedSession).toBeDefined();
      expect(JSON.parse(cachedSession!)).toMatchObject({
        id: result.session.id,
        userId: testUser.id
      });
    });

    it('should handle concurrent session creation correctly', async () => {
      // Arrange
      const testUser = generateTestUser();
      const metadata = generateSessionMetadata();
      const concurrentRequests = 5;

      // Act
      const sessionPromises = Array(concurrentRequests).fill(null).map(() =>
        sessionService.createUserSession(testUser.id, metadata)
      );
      const sessions = await Promise.all(sessionPromises);

      // Assert
      const uniqueSessionIds = new Set(sessions.map(s => s.session.id));
      expect(uniqueSessionIds.size).toBe(concurrentRequests);

      // Verify all sessions in database
      const dbSessions = await prisma.session.findMany({
        where: { userId: testUser.id }
      });
      expect(dbSessions.length).toBe(concurrentRequests);
    });
  });

  describe('Session Validation', () => {
    it('should validate session tokens and handle security checks', async () => {
      // Arrange
      const testUser = generateTestUser();
      const session = await sessionService.createUserSession(
        testUser.id,
        generateSessionMetadata()
      );

      // Act
      const validatedSession = await sessionService.validateSession(
        session.session.id,
        session.tokens.accessToken
      );

      // Assert
      expect(validatedSession).toBeDefined();
      expect(validatedSession.id).toBe(session.session.id);
      expect(validatedSession.status).toBe(SessionStatus.ACTIVE);

      // Verify last active time update
      const dbSession = await prisma.session.findUnique({
        where: { id: session.session.id }
      });
      expect(dbSession?.lastActiveTime).toBeInstanceOf(Date);
      expect(dbSession?.lastActiveTime.getTime()).toBeGreaterThan(
        session.session.lastActiveTime
      );
    });

    it('should reject expired sessions', async () => {
      // Arrange
      const testUser = generateTestUser();
      const session = await sessionService.createUserSession(
        testUser.id,
        generateSessionMetadata()
      );

      // Manually expire the session
      await prisma.session.update({
        where: { id: session.session.id },
        data: {
          status: SessionStatus.EXPIRED,
          expiryTime: new Date(Date.now() - 1000)
        }
      });

      // Act & Assert
      await expect(
        sessionService.validateSession(session.session.id, session.tokens.accessToken)
      ).rejects.toThrow(ERROR_CODES.AUTH_ERROR);
    });
  });

  describe('Session Termination', () => {
    it('should properly end active sessions', async () => {
      // Arrange
      const testUser = generateTestUser();
      const session = await sessionService.createUserSession(
        testUser.id,
        generateSessionMetadata()
      );

      // Act
      await sessionService.endSession(session.session.id);

      // Assert
      const dbSession = await prisma.session.findUnique({
        where: { id: session.session.id }
      });
      expect(dbSession?.status).toBe(SessionStatus.EXPIRED);

      // Verify cache removal
      const cachedSession = await redisClient.get(`session:${session.session.id}`);
      expect(cachedSession).toBeNull();
    });

    it('should handle concurrent session termination requests', async () => {
      // Arrange
      const testUser = generateTestUser();
      const session = await sessionService.createUserSession(
        testUser.id,
        generateSessionMetadata()
      );

      // Act
      const terminationPromises = Array(3).fill(null).map(() =>
        sessionService.endSession(session.session.id)
      );
      await Promise.all(terminationPromises);

      // Assert
      const dbSession = await prisma.session.findUnique({
        where: { id: session.session.id }
      });
      expect(dbSession?.status).toBe(SessionStatus.EXPIRED);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Arrange
      const testUser = generateTestUser();
      await postgresContainer.stop();

      // Act & Assert
      await expect(
        sessionService.createUserSession(testUser.id, generateSessionMetadata())
      ).rejects.toThrow();

      // Cleanup
      await postgresContainer.start();
    });

    it('should handle Redis cluster failures gracefully', async () => {
      // Arrange
      const testUser = generateTestUser();
      await redisContainer.stop();

      // Act
      const session = await sessionService.createUserSession(
        testUser.id,
        generateSessionMetadata()
      );

      // Assert - Should still create session in database despite Redis failure
      const dbSession = await prisma.session.findUnique({
        where: { id: session.session.id }
      });
      expect(dbSession).toBeDefined();

      // Cleanup
      await redisContainer.start();
    });
  });
});