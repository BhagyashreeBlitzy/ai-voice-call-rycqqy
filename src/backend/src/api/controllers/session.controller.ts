import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { RateLimiter } from 'express-rate-limit'; // ^6.7.0
import { SecurityHeaders } from '@types/helmet'; // ^4.0.0
import { SessionService } from '../../services/session/session.service';
import { Logger } from '../../utils/logger.utils';
import { createError } from '../../utils/error.utils';
import { ERROR_CODES } from '../../constants/error.constants';
import { ISessionState, ISessionMetadata } from '../../interfaces/session.interface';
import { UUID } from '../../types/common.types';

/**
 * Controller handling session management endpoints with enhanced security and monitoring
 * Implements 15-minute session expiry and comprehensive security controls
 */
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly logger: Logger,
    private readonly rateLimiter: RateLimiter,
    private readonly securityHeaders: SecurityHeaders
  ) {
    // Initialize rate limiter for session endpoints
    this.rateLimiter = new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many session requests, please try again later'
    });
  }

  /**
   * Creates a new user session with enhanced security controls
   * @param req Express request
   * @param res Express response
   */
  public async createSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Apply security headers
      this.securityHeaders.frameguard(req, res, () => {});
      this.securityHeaders.noSniff(req, res, () => {});
      this.securityHeaders.hsts(req, res, () => {});

      // Validate request body
      const { userId, metadata } = req.body;
      if (!userId || !metadata) {
        throw createError(ERROR_CODES.VALIDATION_ERROR, {
          message: 'Missing required session parameters'
        });
      }

      // Validate metadata
      this.validateSessionMetadata(metadata);

      // Create session with monitoring
      const startTime = Date.now();
      const { session, tokens } = await this.sessionService.createUserSession(
        userId as UUID,
        metadata as ISessionMetadata
      );

      // Log successful creation
      this.logger.info('Session created successfully', {
        sessionId: session.id,
        userId: session.userId,
        duration: Date.now() - startTime
      });

      res.status(201).json({ session, tokens });
    } catch (error) {
      this.logger.error('Session creation failed', {
        error,
        userId: req.body.userId
      });
      next(error);
    }
  }

  /**
   * Validates an existing session with security checks
   * @param req Express request
   * @param res Express response
   */
  public async validateSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const token = req.headers.authorization?.split(' ')[1];

      if (!sessionId || !token) {
        throw createError(ERROR_CODES.VALIDATION_ERROR, {
          message: 'Missing session ID or token'
        });
      }

      const session = await this.sessionService.validateSession(
        sessionId as UUID,
        token
      );

      this.logger.info('Session validated successfully', {
        sessionId: session.id,
        userId: session.userId
      });

      res.status(200).json({ session });
    } catch (error) {
      this.logger.error('Session validation failed', {
        error,
        sessionId: req.params.sessionId
      });
      next(error);
    }
  }

  /**
   * Refreshes session tokens with security validation
   * @param req Express request
   * @param res Express response
   */
  public async refreshSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { refreshToken } = req.body;

      if (!sessionId || !refreshToken) {
        throw createError(ERROR_CODES.VALIDATION_ERROR, {
          message: 'Missing session ID or refresh token'
        });
      }

      const session = await this.sessionService.validateSession(
        sessionId as UUID,
        refreshToken
      );

      // Generate new tokens
      const tokens = await this.sessionService.refreshTokens(session);

      this.logger.info('Session refreshed successfully', {
        sessionId: session.id,
        userId: session.userId
      });

      res.status(200).json({ tokens });
    } catch (error) {
      this.logger.error('Session refresh failed', {
        error,
        sessionId: req.params.sessionId
      });
      next(error);
    }
  }

  /**
   * Ends user session with cleanup
   * @param req Express request
   * @param res Express response
   */
  public async endSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        throw createError(ERROR_CODES.VALIDATION_ERROR, {
          message: 'Missing session ID'
        });
      }

      await this.sessionService.endSession(sessionId as UUID);

      this.logger.info('Session ended successfully', {
        sessionId
      });

      res.status(204).send();
    } catch (error) {
      this.logger.error('Session end failed', {
        error,
        sessionId: req.params.sessionId
      });
      next(error);
    }
  }

  /**
   * Validates session metadata for security compliance
   * @param metadata Session metadata to validate
   * @throws Error if metadata is invalid
   */
  private validateSessionMetadata(metadata: ISessionMetadata): void {
    const requiredFields = ['userAgent', 'ipAddress', 'deviceId'];
    const missingFields = requiredFields.filter(field => !metadata[field]);

    if (missingFields.length > 0) {
      throw createError(ERROR_CODES.VALIDATION_ERROR, {
        message: `Missing required metadata fields: ${missingFields.join(', ')}`
      });
    }

    // Validate IP address format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(metadata.ipAddress)) {
      throw createError(ERROR_CODES.VALIDATION_ERROR, {
        message: 'Invalid IP address format'
      });
    }

    // Validate device ID format
    if (typeof metadata.deviceId !== 'string' || metadata.deviceId.length < 8) {
      throw createError(ERROR_CODES.VALIDATION_ERROR, {
        message: 'Invalid device ID format'
      });
    }
  }
}