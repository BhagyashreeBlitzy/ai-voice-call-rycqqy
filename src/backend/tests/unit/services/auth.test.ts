/**
 * Authentication Service Unit Tests
 * Comprehensive test suite for authentication flows, token management, and security controls
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals'; // v29.0.0
import { AuthService } from '../../../src/services/auth/auth.service';
import { UserRepository } from '../../../src/db/repositories/user.repository';
import { jwtService } from '../../../src/services/auth/jwt.service';
import { ERROR_CODES } from '../../../src/constants/error.constants';
import { IAuthCredentials, IAuthResult, ITokenPayload } from '../../../src/interfaces/auth.interface';
import { Result } from '../../../src/types/common.types';

// Mock dependencies
jest.mock('../../../src/services/auth/jwt.service');
jest.mock('../../../src/db/repositories/user.repository');

// Test data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password: '$argon2id$v=19$m=65536,t=3,p=4$hash',
  role: 'user',
  status: 'ACTIVE',
  tokenVersion: '1',
  lastLogin: new Date()
};

const mockTokens = {
  accessToken: 'mock.access.token',
  refreshToken: 'mock.refresh.token',
  expiresIn: 900,
  tokenType: 'Bearer' as const
};

const mockContext = {
  ip: '127.0.0.1',
  userAgent: 'test-agent'
};

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocked dependencies
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthService(userRepository);

    // Setup common mock implementations
    (jwtService.generateAuthTokens as jest.Mock).mockResolvedValue(mockTokens);
    (jwtService.verifyToken as jest.Mock).mockResolvedValue({
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      version: mockUser.tokenVersion
    });
  });

  describe('login', () => {
    test('successful login with security validation', async () => {
      // Setup
      const credentials: IAuthCredentials = {
        email: mockUser.email,
        password: 'ValidPass123!'
      };

      userRepository.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
        metadata: {}
      });

      // Execute
      const result: Result<IAuthResult> = await authService.login(credentials, mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.tokens).toEqual(mockTokens);
      expect(result.data.user.id).toBe(mockUser.id);
      expect(result.data.metadata.ipAddress).toBe(mockContext.ip);

      // Verify security checks
      expect(userRepository.getUserByEmail).toHaveBeenCalledWith(credentials.email);
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(jwtService.generateAuthTokens).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUser.id,
        version: mockUser.tokenVersion
      }));
    });

    test('login failure - invalid credentials', async () => {
      // Setup
      const credentials: IAuthCredentials = {
        email: 'invalid@example.com',
        password: 'WrongPass123!'
      };

      userRepository.getUserByEmail.mockResolvedValue({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'User not found',
          details: {},
          timestamp: Date.now()
        },
        data: null,
        metadata: {}
      });

      // Execute
      const result = await authService.login(credentials, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.data).toBeNull();

      // Verify security logging
      expect(userRepository.updateLoginAttempts).toHaveBeenCalledWith(
        credentials.email,
        expect.any(Number)
      );
    });

    test('login failure - rate limit exceeded', async () => {
      // Setup
      const credentials: IAuthCredentials = {
        email: mockUser.email,
        password: 'ValidPass123!'
      };

      // Mock rate limit exceeded
      jest.spyOn(authService['loginRateLimiter'], 'consume')
        .mockRejectedValue(new Error('Rate limit exceeded'));

      // Execute
      const result = await authService.login(credentials, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.RATE_LIMIT_ERROR);
      expect(result.data).toBeNull();
    });

    test('login failure - inactive account', async () => {
      // Setup
      const credentials: IAuthCredentials = {
        email: mockUser.email,
        password: 'ValidPass123!'
      };

      userRepository.getUserByEmail.mockResolvedValue({
        success: true,
        data: { ...mockUser, status: 'INACTIVE' },
        error: null,
        metadata: {}
      });

      // Execute
      const result = await authService.login(credentials, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.error?.message).toContain('Account is not active');
    });
  });

  describe('refreshToken', () => {
    test('successful token refresh with rotation', async () => {
      // Setup
      const refreshToken = 'valid.refresh.token';
      const decodedToken: ITokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        version: mockUser.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900
      };

      (jwtService.verifyToken as jest.Mock).mockResolvedValue(decodedToken);
      userRepository.getUserById.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
        metadata: {}
      });

      // Execute
      const result = await authService.refreshToken(refreshToken, mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTokens);

      // Verify token rotation
      expect(authService['tokenBlacklist'].has(refreshToken)).toBe(true);
      expect(jwtService.generateAuthTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          version: mockUser.tokenVersion
        })
      );
    });

    test('refresh failure - blacklisted token', async () => {
      // Setup
      const refreshToken = 'blacklisted.token';
      authService['tokenBlacklist'].add(refreshToken);

      // Execute
      const result = await authService.refreshToken(refreshToken, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.error?.message).toContain('Invalid refresh token');
    });

    test('refresh failure - token version mismatch', async () => {
      // Setup
      const refreshToken = 'valid.refresh.token';
      const decodedToken: ITokenPayload = {
        ...mockUser,
        version: 'old-version',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900
      };

      (jwtService.verifyToken as jest.Mock).mockResolvedValue(decodedToken);
      userRepository.getUserById.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
        metadata: {}
      });

      // Execute
      const result = await authService.refreshToken(refreshToken, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.error?.message).toContain('Token is no longer valid');
    });
  });

  describe('validateToken', () => {
    test('successful token validation', async () => {
      // Setup
      const token = 'valid.access.token';
      const decodedToken: ITokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        version: mockUser.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900
      };

      (jwtService.verifyToken as jest.Mock).mockResolvedValue(decodedToken);

      // Execute
      const result = await authService.validateToken(token);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(decodedToken);
    });

    test('validation failure - invalid token', async () => {
      // Setup
      const token = 'invalid.token';
      (jwtService.verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // Execute
      const result = await authService.validateToken(token);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.error?.message).toContain('Invalid token');
    });
  });
});