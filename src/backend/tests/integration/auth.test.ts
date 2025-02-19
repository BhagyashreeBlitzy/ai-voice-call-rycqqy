/**
 * Integration Tests for Authentication Service
 * Tests authentication flows including registration, login, token refresh and validation
 * with comprehensive security and error handling coverage
 * @version 1.0.0
 */

import { AuthService } from '../../src/services/auth/auth.service';
import { UserRepository } from '../../src/db/repositories/user.repository';
import { prisma } from '../../src/config/database.config';
import { logger } from '../../src/utils/logger.utils';
import { IAuthCredentials, IAuthResult } from '../../src/interfaces/auth.interface';
import { ERROR_CODES } from '../../src/constants/error.constants';

// Test timeouts and retry configuration
const TEST_TIMEOUT = 30000;
const RETRY_OPTIONS = { retries: 3, minTimeout: 1000 };

describe('Authentication Integration Tests', () => {
  let authService: AuthService;
  let userRepository: UserRepository;
  let testUser: { email: string; password: string };

  beforeAll(async () => {
    // Initialize test dependencies
    userRepository = new UserRepository();
    authService = new AuthService(userRepository);

    // Configure test user
    testUser = {
      email: `test.${Date.now()}@example.com`,
      password: 'Test@123456'
    };

    // Ensure clean test environment
    await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "sessions" CASCADE`;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup test data
    await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "sessions" CASCADE`;
    await prisma.$disconnect();
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      // Test registration with valid credentials
      const result = await authService.register(testUser);

      // Verify successful registration
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();

      // Verify user data
      const user = result.data;
      expect(user.email).toBe(testUser.email);
      expect(user.status).toBe('ACTIVE');

      // Verify tokens
      expect(user.tokens).toBeDefined();
      expect(user.tokens.accessToken).toBeDefined();
      expect(user.tokens.refreshToken).toBeDefined();
      expect(user.tokens.expiresIn).toBe(900); // 15 minutes
    });

    it('should prevent duplicate email registration', async () => {
      // Attempt to register with existing email
      const result = await authService.register(testUser);

      // Verify registration failure
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error?.message).toContain('Email already exists');
    });

    it('should validate email format', async () => {
      // Test with invalid email format
      const result = await authService.register({
        email: 'invalid.email',
        password: testUser.password
      });

      // Verify validation failure
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error?.message).toContain('Invalid email format');
    });

    it('should enforce password requirements', async () => {
      // Test with weak password
      const result = await authService.register({
        email: 'test2@example.com',
        password: 'weak'
      });

      // Verify password validation
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error?.message).toContain('Password requirements not met');
    });
  });

  describe('User Login', () => {
    it('should successfully authenticate valid credentials', async () => {
      // Test login with valid credentials
      const result = await authService.login(testUser, {
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Verify successful login
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();

      // Verify authentication result
      const auth = result.data as IAuthResult;
      expect(auth.user.email).toBe(testUser.email);
      expect(auth.tokens.accessToken).toBeDefined();
      expect(auth.tokens.refreshToken).toBeDefined();
      expect(auth.metadata.ipAddress).toBe('127.0.0.1');
    });

    it('should handle invalid credentials', async () => {
      // Test login with wrong password
      const result = await authService.login({
        email: testUser.email,
        password: 'wrongpassword'
      }, {
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Verify authentication failure
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.error?.message).toContain('Invalid email or password');
    });

    it('should implement rate limiting', async () => {
      // Attempt multiple failed logins
      const attempts = Array(6).fill({
        email: testUser.email,
        password: 'wrongpassword'
      });

      for (const attempt of attempts) {
        await authService.login(attempt, {
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        });
      }

      // Verify rate limit enforcement
      const result = await authService.login(testUser, {
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.RATE_LIMIT_ERROR);
    });
  });

  describe('Token Management', () => {
    let validTokens: { accessToken: string; refreshToken: string };

    beforeAll(async () => {
      // Get valid tokens for testing
      const loginResult = await authService.login(testUser, {
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });
      validTokens = loginResult.data.tokens;
    });

    it('should successfully refresh tokens', async () => {
      // Test token refresh
      const result = await authService.refreshToken(
        validTokens.refreshToken,
        {
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        }
      );

      // Verify successful refresh
      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(result.data.accessToken).not.toBe(validTokens.accessToken);
    });

    it('should prevent refresh token reuse', async () => {
      // Attempt to reuse refresh token
      const result = await authService.refreshToken(
        validTokens.refreshToken,
        {
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        }
      );

      // Verify token reuse prevention
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.error?.message).toContain('Invalid refresh token');
    });

    it('should validate access tokens', async () => {
      // Test token validation
      const result = await authService.validateToken(validTokens.accessToken);

      // Verify token validation
      expect(result.success).toBe(true);
      expect(result.data.email).toBe(testUser.email);
      expect(result.data.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should handle expired tokens', async () => {
      // Wait for token expiration
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test expired token validation
      const result = await authService.validateToken('expired.token.here');

      // Verify expired token handling
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(result.error?.message).toContain('Invalid token');
    });
  });

  describe('Security Features', () => {
    it('should protect against SQL injection', async () => {
      // Test SQL injection attempt
      const result = await authService.login({
        email: "' OR '1'='1",
        password: "' OR '1'='1"
      }, {
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Verify SQL injection protection
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should protect against XSS attacks', async () => {
      // Test XSS attempt
      const result = await authService.register({
        email: '<script>alert("xss")</script>@example.com',
        password: testUser.password
      });

      // Verify XSS protection
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should log security events', async () => {
      // Spy on logger
      const loggerSpy = jest.spyOn(logger, 'warn');

      // Trigger security event
      await authService.login({
        email: testUser.email,
        password: 'wrongpassword'
      }, {
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Verify security logging
      expect(loggerSpy).toHaveBeenCalled();
      expect(loggerSpy.mock.calls[0][0]).toContain('Invalid password attempt');
    });
  });
});