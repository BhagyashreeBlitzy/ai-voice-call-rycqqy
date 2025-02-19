/**
 * Authentication Controller Implementation
 * Handles HTTP requests for user authentication with enhanced security features
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // v4.18.2
import winston from 'winston'; // v3.8.2
import { RateLimit } from 'express-rate-limit'; // v6.7.0

import { AuthService } from '../../services/auth/auth.service';
import {
  validateLoginRequest,
  validateRegistrationRequest,
  validateRefreshTokenRequest
} from '../validators/auth.validator';
import { IAuthCredentials } from '../../interfaces/auth.interface';
import { logger } from '../../utils/logger.utils';
import { createError } from '../../utils/error.utils';
import { ERROR_CODES } from '../../constants/error.constants';

export class AuthController {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Handles user login requests with enhanced security
   * @param req Express request object
   * @param res Express response object
   */
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      // Extract request context for security logging
      const context = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        correlationId: req.headers['x-correlation-id'] as string
      };

      logger.info('Login attempt received', {
        ip: context.ip,
        userAgent: context.userAgent,
        correlationId: context.correlationId
      });

      // Validate request credentials
      const credentials: IAuthCredentials = {
        email: req.body.email,
        password: req.body.password
      };

      const validationResult = await validateLoginRequest(credentials);
      if (!validationResult.success) {
        logger.warn('Login validation failed', {
          error: validationResult.error,
          context
        });
        return res.status(400).json(validationResult);
      }

      // Attempt authentication
      const authResult = await this.authService.login(credentials, context);
      if (!authResult.success) {
        return res.status(401).json(authResult);
      }

      // Set secure cookie with access token
      res.cookie('access_token', authResult.data.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 900000 // 15 minutes
      });

      // Return success response with user info and refresh token
      return res.status(200).json({
        success: true,
        data: {
          user: authResult.data.user,
          refreshToken: authResult.data.tokens.refreshToken
        },
        error: null,
        metadata: {
          sessionInfo: {
            expiresIn: 900,
            lastLogin: new Date()
          }
        }
      });
    } catch (error) {
      logger.error('Login error', { error });
      return res.status(500).json({
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          message: 'Authentication failed'
        }),
        data: null,
        metadata: {}
      });
    }
  }

  /**
   * Handles user registration with enhanced security validation
   * @param req Express request object
   * @param res Express response object
   */
  public async register(req: Request, res: Response): Promise<Response> {
    try {
      const context = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        correlationId: req.headers['x-correlation-id'] as string
      };

      logger.info('Registration attempt received', { context });

      // Validate registration data
      const validationResult = await validateRegistrationRequest(req.body);
      if (!validationResult.success) {
        logger.warn('Registration validation failed', {
          error: validationResult.error,
          context
        });
        return res.status(400).json(validationResult);
      }

      // Attempt registration
      const registrationResult = await this.authService.register({
        email: req.body.email,
        password: req.body.password,
        metadata: req.body.metadata
      }, context);

      if (!registrationResult.success) {
        return res.status(400).json(registrationResult);
      }

      // Set secure cookie with access token
      res.cookie('access_token', registrationResult.data.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 900000 // 15 minutes
      });

      // Return success response
      return res.status(201).json({
        success: true,
        data: {
          user: registrationResult.data.user,
          refreshToken: registrationResult.data.tokens.refreshToken
        },
        error: null,
        metadata: {
          accountCreated: new Date()
        }
      });
    } catch (error) {
      logger.error('Registration error', { error });
      return res.status(500).json({
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          message: 'Registration failed'
        }),
        data: null,
        metadata: {}
      });
    }
  }

  /**
   * Handles token refresh requests with security validation
   * @param req Express request object
   * @param res Express response object
   */
  public async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const context = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        correlationId: req.headers['x-correlation-id'] as string
      };

      // Validate refresh token request
      const validationResult = await validateRefreshTokenRequest(req.body);
      if (!validationResult.success) {
        logger.warn('Token refresh validation failed', {
          error: validationResult.error,
          context
        });
        return res.status(400).json(validationResult);
      }

      // Attempt token refresh
      const refreshResult = await this.authService.refreshToken(
        req.body.refreshToken,
        context
      );

      if (!refreshResult.success) {
        return res.status(401).json(refreshResult);
      }

      // Set new secure cookie with access token
      res.cookie('access_token', refreshResult.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 900000 // 15 minutes
      });

      // Return new tokens
      return res.status(200).json({
        success: true,
        data: {
          accessToken: refreshResult.data.accessToken,
          refreshToken: refreshResult.data.refreshToken,
          expiresIn: refreshResult.data.expiresIn
        },
        error: null,
        metadata: {
          tokenRefreshed: new Date()
        }
      });
    } catch (error) {
      logger.error('Token refresh error', { error });
      return res.status(500).json({
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          message: 'Token refresh failed'
        }),
        data: null,
        metadata: {}
      });
    }
  }
}