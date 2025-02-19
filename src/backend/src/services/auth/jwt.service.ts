/**
 * JWT Service Implementation
 * Handles secure token generation, validation, and management with enhanced security features
 * @version 1.0.0
 */

import { sign, verify } from 'jsonwebtoken'; // v9.0.0
import NodeCache from 'node-cache'; // v5.1.2
import { ITokenPayload, IAuthToken } from '../../interfaces/auth.interface';
import { authConfig } from '../../config/auth.config';
import { createError } from '../../utils/error.utils';
import { logger } from '../../utils/logger.utils';
import { ERROR_CODES } from '../../constants/error.constants';

// Token cache for performance optimization
const tokenCache = new NodeCache({
  stdTTL: 900, // 15 minutes
  checkperiod: 120, // Check for expired tokens every 2 minutes
  maxKeys: 10000 // Maximum number of cached tokens
});

// Token blacklist for revoked tokens
const tokenBlacklist = new Set<string>();

/**
 * JWT Service with enhanced security features
 */
class JWTService {
  private static instance: JWTService;
  private readonly jwtOptions: any;

  private constructor() {
    this.jwtOptions = {
      issuer: authConfig.tokenIssuer,
      audience: authConfig.tokenAudience,
      algorithm: 'HS256',
      expiresIn: authConfig.jwtExpiresIn
    };
  }

  /**
   * Get singleton instance of JWTService
   */
  public static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  /**
   * Generates a new JWT access token with enhanced security features
   * @param payload Token payload with user information
   * @returns Promise resolving to signed JWT token
   */
  public async generateToken(payload: ITokenPayload): Promise<string> {
    try {
      // Validate required payload fields
      if (!payload.userId || !payload.email || !payload.roles) {
        throw createError(ERROR_CODES.VALIDATION_ERROR, {
          message: 'Invalid token payload'
        });
      }

      // Add security enhancements to payload
      const enhancedPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID(), // Unique token identifier
        fingerprint: this.generateTokenFingerprint(payload)
      };

      // Sign token with enhanced options
      const token = sign(enhancedPayload, authConfig.jwtSecret, this.jwtOptions);

      // Cache token for performance
      tokenCache.set(enhancedPayload.jti, token);

      // Log token generation
      logger.info('JWT token generated', {
        userId: payload.userId,
        tokenId: enhancedPayload.jti
      });

      return token;
    } catch (error) {
      logger.error('Token generation failed', { error });
      throw createError(ERROR_CODES.AUTH_ERROR, {
        message: 'Failed to generate token'
      });
    }
  }

  /**
   * Verifies and decodes a JWT token with enhanced security checks
   * @param token JWT token to verify
   * @returns Promise resolving to decoded token payload
   */
  public async verifyToken(token: string): Promise<ITokenPayload> {
    try {
      // Check token blacklist
      if (this.isTokenBlacklisted(token)) {
        throw createError(ERROR_CODES.AUTH_ERROR, {
          message: 'Token has been revoked'
        });
      }

      // Verify token signature and expiration
      const decoded = verify(token, authConfig.jwtSecret, this.jwtOptions) as ITokenPayload;

      // Verify token fingerprint
      if (!this.verifyTokenFingerprint(decoded)) {
        throw createError(ERROR_CODES.AUTH_ERROR, {
          message: 'Invalid token fingerprint'
        });
      }

      // Check token cache
      if (!tokenCache.has(decoded.jti)) {
        throw createError(ERROR_CODES.AUTH_ERROR, {
          message: 'Token not found in cache'
        });
      }

      return decoded;
    } catch (error) {
      logger.error('Token verification failed', { error });
      throw createError(ERROR_CODES.AUTH_ERROR, {
        message: 'Invalid or expired token'
      });
    }
  }

  /**
   * Generates complete authentication tokens including access and refresh tokens
   * @param payload User information for token generation
   * @returns Promise resolving to authentication tokens
   */
  public async generateAuthTokens(payload: ITokenPayload): Promise<IAuthToken> {
    try {
      const accessToken = await this.generateToken(payload);
      const refreshToken = await this.generateRefreshToken(payload);

      return {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Auth token generation failed', { error });
      throw createError(ERROR_CODES.AUTH_ERROR, {
        message: 'Failed to generate auth tokens'
      });
    }
  }

  /**
   * Invalidates a token by adding it to the blacklist
   * @param token Token to invalidate
   */
  public async invalidateToken(token: string): Promise<void> {
    try {
      const decoded = await this.verifyToken(token);
      tokenBlacklist.add(decoded.jti);
      tokenCache.del(decoded.jti);

      logger.info('Token invalidated', {
        tokenId: decoded.jti,
        userId: decoded.userId
      });
    } catch (error) {
      logger.error('Token invalidation failed', { error });
      throw createError(ERROR_CODES.AUTH_ERROR, {
        message: 'Failed to invalidate token'
      });
    }
  }

  /**
   * Refreshes authentication tokens using a valid refresh token
   * @param refreshToken Current refresh token
   * @returns Promise resolving to new authentication tokens
   */
  public async refreshTokens(refreshToken: string): Promise<IAuthToken> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      await this.invalidateToken(refreshToken);

      return this.generateAuthTokens(decoded);
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw createError(ERROR_CODES.AUTH_ERROR, {
        message: 'Failed to refresh tokens'
      });
    }
  }

  /**
   * Generates a unique token fingerprint for additional security
   * @param payload Token payload
   * @returns Token fingerprint string
   */
  private generateTokenFingerprint(payload: ITokenPayload): string {
    const data = `${payload.userId}:${payload.email}:${payload.tokenVersion}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verifies token fingerprint matches expected value
   * @param payload Decoded token payload
   * @returns Boolean indicating fingerprint validity
   */
  private verifyTokenFingerprint(payload: ITokenPayload): boolean {
    const expectedFingerprint = this.generateTokenFingerprint(payload);
    return payload.fingerprint === expectedFingerprint;
  }

  /**
   * Checks if a token has been blacklisted
   * @param token Token to check
   * @returns Boolean indicating if token is blacklisted
   */
  private isTokenBlacklisted(token: string): boolean {
    try {
      const decoded = verify(token, authConfig.jwtSecret, this.jwtOptions) as ITokenPayload;
      return tokenBlacklist.has(decoded.jti);
    } catch {
      return false;
    }
  }

  /**
   * Generates a refresh token with extended expiration
   * @param payload User information for token generation
   * @returns Promise resolving to refresh token
   */
  private async generateRefreshToken(payload: ITokenPayload): Promise<string> {
    const refreshPayload = {
      ...payload,
      tokenType: 'refresh'
    };

    return sign(refreshPayload, authConfig.jwtSecret, {
      ...this.jwtOptions,
      expiresIn: authConfig.refreshTokenExpiresIn
    });
  }

  /**
   * Verifies a refresh token
   * @param token Refresh token to verify
   * @returns Promise resolving to decoded token payload
   */
  private async verifyRefreshToken(token: string): Promise<ITokenPayload> {
    try {
      const decoded = verify(token, authConfig.jwtSecret, {
        ...this.jwtOptions,
        ignoreExpiration: false
      }) as ITokenPayload;

      if (decoded.tokenType !== 'refresh') {
        throw createError(ERROR_CODES.AUTH_ERROR, {
          message: 'Invalid token type'
        });
      }

      return decoded;
    } catch (error) {
      logger.error('Refresh token verification failed', { error });
      throw createError(ERROR_CODES.AUTH_ERROR, {
        message: 'Invalid refresh token'
      });
    }
  }
}

// Export singleton instance
export const jwtService = JWTService.getInstance();