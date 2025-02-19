import Redis from 'ioredis'; // v5.3.2
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import winston from 'winston'; // v3.10.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

import { ISessionState, SessionStatus, ISessionMetadata } from '../../interfaces/session.interface';
import { prisma } from '../../config/database.config';
import redisConfig from '../../config/redis.config';
import { UUID } from '../../types/common.types';

/**
 * Production-ready repository for managing user sessions with dual storage
 * Implements comprehensive security controls and performance optimization
 */
export class SessionRepository {
  private redisClient: Redis.Cluster | Redis;
  private readonly sessionExpiry: number = 15 * 60; // 15 minutes in seconds
  private rateLimiter: RateLimiterRedis;
  private logger: winston.Logger;

  constructor() {
    // Initialize Redis client with cluster support
    this.redisClient = redisConfig.cluster.nodes.length > 1
      ? new Redis.Cluster(redisConfig.cluster.nodes, {
          ...redisConfig.cluster,
          redisOptions: {
            password: redisConfig.password,
            tls: redisConfig.tls
          }
        })
      : new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          retryStrategy: redisConfig.retryStrategy,
          tls: redisConfig.tls
        });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'ratelimit:session:',
      points: 100, // Number of points
      duration: 60 // Per 60 seconds
    });

    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'session-repository' },
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });

    // Add connection monitoring
    redisConfig.connectionListener(this.redisClient);
  }

  /**
   * Creates a new session with validation and rate limiting
   * @param userId - User ID for session creation
   * @param metadata - Session metadata
   * @returns Promise resolving to created session state
   * @throws Error if rate limit exceeded or creation fails
   */
  async createSession(userId: UUID, metadata: ISessionMetadata): Promise<ISessionState> {
    try {
      // Check rate limit
      await this.rateLimiter.consume(userId);

      const sessionId = uuidv4() as UUID;
      const now = Date.now();
      const expiryTime = now + (this.sessionExpiry * 1000);

      const sessionState: ISessionState = {
        id: sessionId,
        userId,
        status: SessionStatus.ACTIVE,
        startTime: now,
        lastActiveTime: now,
        expiryTime,
        metadata,
        wsConnectionId: null
      };

      // Create session in PostgreSQL within transaction
      await prisma.$transaction(async (tx) => {
        await tx.session.create({
          data: {
            id: sessionId,
            userId,
            status: SessionStatus.ACTIVE,
            startTime: new Date(now),
            lastActiveTime: new Date(now),
            expiryTime: new Date(expiryTime),
            metadata: metadata as any,
            wsConnectionId: null
          }
        });

        // Cache in Redis
        await this.redisClient.setex(
          `session:${sessionId}`,
          this.sessionExpiry,
          JSON.stringify(sessionState)
        );
      });

      this.logger.info('Session created', { sessionId, userId });
      return sessionState;

    } catch (error) {
      this.logger.error('Session creation failed', { error, userId });
      throw error;
    }
  }

  /**
   * Retrieves session with cache optimization
   * @param sessionId - Session ID to retrieve
   * @returns Promise resolving to session state or null
   */
  async getSession(sessionId: UUID): Promise<ISessionState | null> {
    try {
      // Check rate limit
      await this.rateLimiter.consume(sessionId);

      // Try cache first
      const cachedSession = await this.redisClient.get(`session:${sessionId}`);
      if (cachedSession) {
        return JSON.parse(cachedSession);
      }

      // Fallback to database
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        return null;
      }

      const sessionState: ISessionState = {
        id: session.id as UUID,
        userId: session.userId as UUID,
        status: session.status as SessionStatus,
        startTime: session.startTime.getTime(),
        lastActiveTime: session.lastActiveTime.getTime(),
        expiryTime: session.expiryTime.getTime(),
        metadata: session.metadata as ISessionMetadata,
        wsConnectionId: session.wsConnectionId
      };

      // Update cache
      await this.redisClient.setex(
        `session:${sessionId}`,
        this.sessionExpiry,
        JSON.stringify(sessionState)
      );

      return sessionState;

    } catch (error) {
      this.logger.error('Session retrieval failed', { error, sessionId });
      throw error;
    }
  }

  /**
   * Updates session state with validation
   * @param sessionId - Session ID to update
   * @param updates - Partial session state updates
   * @returns Promise resolving to updated session state
   */
  async updateSession(
    sessionId: UUID,
    updates: Partial<Omit<ISessionState, 'id' | 'userId'>>
  ): Promise<ISessionState> {
    try {
      await this.rateLimiter.consume(sessionId);

      const now = Date.now();
      updates.lastActiveTime = now;
      updates.expiryTime = now + (this.sessionExpiry * 1000);

      // Update in transaction
      const updatedSession = await prisma.$transaction(async (tx) => {
        const session = await tx.session.update({
          where: { id: sessionId },
          data: {
            ...updates,
            lastActiveTime: new Date(updates.lastActiveTime),
            expiryTime: new Date(updates.expiryTime)
          }
        });

        return session;
      });

      const sessionState: ISessionState = {
        id: updatedSession.id as UUID,
        userId: updatedSession.userId as UUID,
        status: updatedSession.status as SessionStatus,
        startTime: updatedSession.startTime.getTime(),
        lastActiveTime: updatedSession.lastActiveTime.getTime(),
        expiryTime: updatedSession.expiryTime.getTime(),
        metadata: updatedSession.metadata as ISessionMetadata,
        wsConnectionId: updatedSession.wsConnectionId
      };

      // Update cache
      await this.redisClient.setex(
        `session:${sessionId}`,
        this.sessionExpiry,
        JSON.stringify(sessionState)
      );

      return sessionState;

    } catch (error) {
      this.logger.error('Session update failed', { error, sessionId });
      throw error;
    }
  }

  /**
   * Deletes session and cleans up cache
   * @param sessionId - Session ID to delete
   */
  async deleteSession(sessionId: UUID): Promise<void> {
    try {
      await this.rateLimiter.consume(sessionId);

      await prisma.$transaction(async (tx) => {
        await tx.session.delete({
          where: { id: sessionId }
        });

        await this.redisClient.del(`session:${sessionId}`);
      });

      this.logger.info('Session deleted', { sessionId });

    } catch (error) {
      this.logger.error('Session deletion failed', { error, sessionId });
      throw error;
    }
  }

  /**
   * Cleans up expired sessions with batching
   */
  async cleanExpiredSessions(): Promise<void> {
    try {
      const batchSize = 100;
      let processed = 0;

      while (true) {
        const expiredSessions = await prisma.session.findMany({
          where: {
            expiryTime: {
              lt: new Date()
            }
          },
          take: batchSize,
          select: { id: true }
        });

        if (expiredSessions.length === 0) {
          break;
        }

        await prisma.$transaction(async (tx) => {
          await tx.session.deleteMany({
            where: {
              id: {
                in: expiredSessions.map(s => s.id)
              }
            }
          });

          // Clean up Redis cache
          await Promise.all(
            expiredSessions.map(s => 
              this.redisClient.del(`session:${s.id}`)
            )
          );
        });

        processed += expiredSessions.length;
        this.logger.info('Cleaned expired sessions', { count: expiredSessions.length });
      }

      this.logger.info('Session cleanup completed', { totalProcessed: processed });

    } catch (error) {
      this.logger.error('Session cleanup failed', { error });
      throw error;
    }
  }
}