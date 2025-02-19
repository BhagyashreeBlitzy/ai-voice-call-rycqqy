import { jest } from '@jest/globals';
import { SessionService } from '../../../src/services/session/session.service';
import { SessionRepository } from '../../../src/db/repositories/session.repository';
import { JWTService } from '../../../src/services/auth/jwt.service';
import { ISessionState, SessionStatus } from '../../../src/interfaces/session.interface';
import { ERROR_CODES } from '../../../src/constants/error.constants';
import { UUID } from '../../../src/types/common.types';
import { logger } from '../../../src/utils/logger.utils';

// Mock dependencies
jest.mock('../../../src/db/repositories/session.repository');
jest.mock('../../../src/services/auth/jwt.service');
jest.mock('../../../src/utils/logger.utils');

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockSessionRepository: jest.Mocked<SessionRepository>;
  let mockJWTService: jest.Mocked<typeof JWTService>;
  let mockLogger: jest.Mocked<typeof logger>;

  // Test data
  const testUserId = 'test-user-123' as UUID;
  const testSessionId = 'test-session-456' as UUID;
  const testToken = 'test-jwt-token';
  const testMetadata = {
    userAgent: 'test-browser',
    ipAddress: '127.0.0.1',
    deviceId: 'test-device',
    location: 'test-location',
    isSecure: true,
    isTrusted: true,
    email: 'test@example.com',
    role: 'user'
  };

  const mockSession: ISessionState = {
    id: testSessionId,
    userId: testUserId,
    status: SessionStatus.ACTIVE,
    startTime: Date.now(),
    lastActiveTime: Date.now(),
    expiryTime: Date.now() + 900000, // 15 minutes
    metadata: {
      userAgent: testMetadata.userAgent,
      ipAddress: testMetadata.ipAddress,
      deviceId: testMetadata.deviceId,
      lastLocation: testMetadata.location,
      securityFlags: {
        isSecureContext: testMetadata.isSecure,
        isTrustedDevice: testMetadata.isTrusted
      }
    },
    wsConnectionId: null
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize mocked dependencies
    mockSessionRepository = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn()
    } as unknown as jest.Mocked<SessionRepository>;

    mockJWTService = {
      generateAuthTokens: jest.fn(),
      verifyToken: jest.fn()
    } as unknown as jest.Mocked<typeof JWTService>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as jest.Mocked<typeof logger>;

    // Create service instance with mocked dependencies
    sessionService = new SessionService(
      mockSessionRepository,
      mockLogger,
      mockJWTService as any
    );
  });

  describe('createUserSession', () => {
    it('should create a new session successfully', async () => {
      // Arrange
      mockSessionRepository.createSession.mockResolvedValue(mockSession);
      mockJWTService.generateAuthTokens.mockResolvedValue({
        accessToken: testToken,
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });

      // Act
      const result = await sessionService.createUserSession(testUserId, testMetadata);

      // Assert
      expect(result.session).toEqual(mockSession);
      expect(result.tokens).toBeDefined();
      expect(mockSessionRepository.createSession).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          userAgent: testMetadata.userAgent,
          ipAddress: testMetadata.ipAddress
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Session created successfully',
        expect.any(Object)
      );
    });

    it('should handle session creation failure', async () => {
      // Arrange
      const error = new Error('Database error');
      mockSessionRepository.createSession.mockRejectedValue(error);

      // Act & Assert
      await expect(
        sessionService.createUserSession(testUserId, testMetadata)
      ).rejects.toMatchObject({
        code: ERROR_CODES.SYSTEM_ERROR
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Session creation failed',
        expect.any(Object)
      );
    });
  });

  describe('validateSession', () => {
    it('should validate an active session successfully', async () => {
      // Arrange
      mockJWTService.verifyToken.mockResolvedValue({
        userId: testUserId,
        sessionId: testSessionId
      });
      mockSessionRepository.getSession.mockResolvedValue(mockSession);
      mockSessionRepository.updateSession.mockResolvedValue(mockSession);

      // Act
      const result = await sessionService.validateSession(testSessionId, testToken);

      // Assert
      expect(result).toEqual(mockSession);
      expect(mockSessionRepository.updateSession).toHaveBeenCalledWith(
        testSessionId,
        expect.objectContaining({
          status: SessionStatus.ACTIVE
        })
      );
    });

    it('should reject expired sessions', async () => {
      // Arrange
      const expiredSession = {
        ...mockSession,
        status: SessionStatus.EXPIRED
      };
      mockJWTService.verifyToken.mockResolvedValue({
        userId: testUserId,
        sessionId: testSessionId
      });
      mockSessionRepository.getSession.mockResolvedValue(expiredSession);

      // Act & Assert
      await expect(
        sessionService.validateSession(testSessionId, testToken)
      ).rejects.toMatchObject({
        code: ERROR_CODES.AUTH_ERROR
      });
    });

    it('should handle non-existent sessions', async () => {
      // Arrange
      mockJWTService.verifyToken.mockResolvedValue({
        userId: testUserId,
        sessionId: testSessionId
      });
      mockSessionRepository.getSession.mockResolvedValue(null);

      // Act & Assert
      await expect(
        sessionService.validateSession(testSessionId, testToken)
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND
      });
    });
  });

  describe('endSession', () => {
    it('should end an active session successfully', async () => {
      // Arrange
      mockSessionRepository.getSession.mockResolvedValue(mockSession);
      mockSessionRepository.updateSession.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.EXPIRED
      });

      // Act
      await sessionService.endSession(testSessionId);

      // Assert
      expect(mockSessionRepository.updateSession).toHaveBeenCalledWith(
        testSessionId,
        expect.objectContaining({
          status: SessionStatus.EXPIRED
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Session ended successfully',
        expect.any(Object)
      );
    });

    it('should handle non-existent session gracefully', async () => {
      // Arrange
      mockSessionRepository.getSession.mockResolvedValue(null);

      // Act
      await sessionService.endSession(testSessionId);

      // Assert
      expect(mockSessionRepository.updateSession).not.toHaveBeenCalled();
    });

    it('should handle session termination failure', async () => {
      // Arrange
      const error = new Error('Database error');
      mockSessionRepository.getSession.mockRejectedValue(error);

      // Act & Assert
      await expect(sessionService.endSession(testSessionId)).rejects.toMatchObject({
        code: ERROR_CODES.SYSTEM_ERROR
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to end session',
        expect.any(Object)
      );
    });
  });

  describe('Session Metrics', () => {
    it('should track session metrics correctly', async () => {
      // Arrange
      mockSessionRepository.createSession.mockResolvedValue(mockSession);
      mockJWTService.generateAuthTokens.mockResolvedValue({
        accessToken: testToken,
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });

      // Act
      await sessionService.createUserSession(testUserId, testMetadata);
      const metrics = sessionService.getSessionMetrics();

      // Assert
      expect(metrics.activeCount).toBe(1);
      expect(metrics.totalCreated).toBe(1);
      expect(metrics.totalExpired).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should return circuit breaker health status', async () => {
      // Act
      const isHealthy = await sessionService.checkHealth();

      // Assert
      expect(typeof isHealthy).toBe('boolean');
    });
  });
});