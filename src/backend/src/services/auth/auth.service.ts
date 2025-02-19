/**
 * Enhanced Authentication Service Implementation
 * Provides secure user authentication, token management, and session handling
 * with comprehensive security features including token rotation and rate limiting
 * @version 1.0.0
 */

import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import winston from 'winston'; // v3.8.0
import argon2 from 'argon2'; // v0.30.3
import { v4 as uuidv4 } from 'uuid';

import { UserRepository } from '../../db/repositories/user.repository';
import { jwtService } from './jwt.service';
import { logger } from '../../utils/logger.utils';
import { createError } from '../../utils/error.utils';
import { validateEmail } from '../../utils/validation.utils';
import { ERROR_CODES } from '../../constants/error.constants';
import {
  IAuthCredentials,
  IAuthResult,
  IAuthToken,
  ITokenPayload
} from '../../interfaces/auth.interface';
import { Result } from '../../types/common.types';

// Rate limiter configuration for login attempts
const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 300, // per 5 minutes
  blockDuration: 900 // 15 minutes block
});

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly tokenBlacklist: Set<string>;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
    this.tokenBlacklist = new Set<string>();
  }

  /**
   * Authenticates user credentials with rate limiting and security logging
   * @param credentials User login credentials
   * @param context Request context for logging
   * @returns Authentication result with tokens
   */
  public async login(
    credentials: IAuthCredentials,
    context: { ip: string; userAgent: string }
  ): Promise<Result<IAuthResult>> {
    try {
      // Check rate limit
      try {
        await loginRateLimiter.consume(context.ip);
      } catch (error) {
        logger.warn('Rate limit exceeded for login', {
          ip: context.ip,
          userAgent: context.userAgent
        });
        return {
          success: false,
          error: createError(ERROR_CODES.RATE_LIMIT_ERROR, {
            message: 'Too many login attempts. Please try again later.'
          }),
          data: null as unknown as IAuthResult,
          metadata: {}
        };
      }

      // Validate email format
      const emailValidation = validateEmail(credentials.email);
      if (!emailValidation.success) {
        return {
          success: false,
          error: emailValidation.error,
          data: null as unknown as IAuthResult,
          metadata: {}
        };
      }

      // Get user by email
      const userResult = await this.userRepository.getUserByEmail(credentials.email);
      if (!userResult.success || !userResult.data) {
        // Use same error message for security
        return {
          success: false,
          error: createError(ERROR_CODES.AUTH_ERROR, {
            message: 'Invalid email or password'
          }),
          data: null as unknown as IAuthResult,
          metadata: {}
        };
      }

      const user = userResult.data;

      // Verify password hash
      const isPasswordValid = await argon2.verify(
        user.password,
        credentials.password,
        {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3
        }
      );

      if (!isPasswordValid) {
        logger.warn('Invalid password attempt', {
          userId: user.id,
          ip: context.ip
        });
        return {
          success: false,
          error: createError(ERROR_CODES.AUTH_ERROR, {
            message: 'Invalid email or password'
          }),
          data: null as unknown as IAuthResult,
          metadata: {}
        };
      }

      // Check account status
      if (user.status !== 'ACTIVE') {
        logger.warn('Login attempt on inactive account', {
          userId: user.id,
          status: user.status
        });
        return {
          success: false,
          error: createError(ERROR_CODES.AUTH_ERROR, {
            message: 'Account is not active'
          }),
          data: null as unknown as IAuthResult,
          metadata: {}
        };
      }

      // Generate auth tokens
      const tokenPayload: ITokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        version: user.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900 // 15 minutes
      };

      const tokens = await jwtService.generateAuthTokens(tokenPayload);

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent
      });

      // Return auth result
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            lastLogin: new Date()
          },
          tokens,
          metadata: {
            deviceInfo: context.userAgent,
            ipAddress: context.ip,
            loginTimestamp: new Date()
          }
        },
        error: null,
        metadata: {}
      };
    } catch (error) {
      logger.error('Login error', {
        error,
        email: credentials.email,
        ip: context.ip
      });
      return {
        success: false,
        error: createError(ERROR_CODES.AUTH_ERROR, {
          message: 'Authentication failed'
        }),
        data: null as unknown as IAuthResult,
        metadata: {}
      };
    }
  }

  /**
   * Refreshes authentication tokens with security checks
   * @param refreshToken Current refresh token
   * @param context Request context for logging
   * @returns New authentication tokens
   */
  public async refreshToken(
    refreshToken: string,
    context: { ip: string; userAgent: string }
  ): Promise<Result<IAuthToken>> {
    try {
      // Verify refresh token is not blacklisted
      if (this.tokenBlacklist.has(refreshToken)) {
        logger.warn('Attempt to use blacklisted refresh token', { context });
        return {
          success: false,
          error: createError(ERROR_CODES.AUTH_ERROR, {
            message: 'Invalid refresh token'
          }),
          data: null as unknown as IAuthToken,
          metadata: {}
        };
      }

      // Verify and decode refresh token
      const decoded = await jwtService.verifyToken(refreshToken);
      
      // Get user and verify status
      const userResult = await this.userRepository.getUserById(decoded.userId);
      if (!userResult.success || !userResult.data) {
        return {
          success: false,
          error: createError(ERROR_CODES.AUTH_ERROR, {
            message: 'User not found'
          }),
          data: null as unknown as IAuthToken,
          metadata: {}
        };
      }

      const user = userResult.data;

      // Verify token version matches user's current version
      if (decoded.version !== user.tokenVersion) {
        logger.warn('Token version mismatch', {
          userId: user.id,
          tokenVersion: decoded.version,
          currentVersion: user.tokenVersion
        });
        return {
          success: false,
          error: createError(ERROR_CODES.AUTH_ERROR, {
            message: 'Token is no longer valid'
          }),
          data: null as unknown as IAuthToken,
          metadata: {}
        };
      }

      // Generate new tokens
      const tokenPayload: ITokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        version: user.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900
      };

      const tokens = await jwtService.generateAuthTokens(tokenPayload);

      // Blacklist old refresh token
      this.tokenBlacklist.add(refreshToken);

      // Log token refresh
      logger.info('Tokens refreshed successfully', {
        userId: user.id,
        ip: context.ip
      });

      return {
        success: true,
        data: tokens,
        error: null,
        metadata: {}
      };
    } catch (error) {
      logger.error('Token refresh error', { error, context });
      return {
        success: false,
        error: createError(ERROR_CODES.AUTH_ERROR, {
          message: 'Failed to refresh tokens'
        }),
        data: null as unknown as IAuthToken,
        metadata: {}
      };
    }
  }

  /**
   * Validates an access token
   * @param token Access token to validate
   * @returns Validation result with decoded payload
   */
  public async validateToken(token: string): Promise<Result<ITokenPayload>> {
    try {
      const decoded = await jwtService.verifyToken(token);
      return {
        success: true,
        data: decoded,
        error: null,
        metadata: {}
      };
    } catch (error) {
      return {
        success: false,
        error: createError(ERROR_CODES.AUTH_ERROR, {
          message: 'Invalid token'
        }),
        data: null as unknown as ITokenPayload,
        metadata: {}
      };
    }
  }
}