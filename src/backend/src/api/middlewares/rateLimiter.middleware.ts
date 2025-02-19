import Redis from 'ioredis'; // v5.3.2
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { redisConfig } from '../../config/redis.config';
import { createError } from '../../utils/error.utils';
import { ERROR_CODES } from '../../constants/error.constants';
import { logger } from '../../utils/logger.utils';

// Redis key prefix for rate limiting
const RATE_LIMIT_PREFIX = 'rate_limit:';

// Redis client instance for rate limiting
const redisClient = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  keyPrefix: RATE_LIMIT_PREFIX,
  retryStrategy: redisConfig.retryStrategy,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false
});

// Add Redis connection monitoring
redisConfig.connectionListener(redisClient);

/**
 * Generates a unique Redis key for rate limiting
 * @param ip - Client IP address
 * @param category - Rate limit category
 * @returns Formatted Redis key
 */
const getRateLimitKey = (ip: string, category: string): string => {
  const sanitizedIp = ip.replace(/[^0-9a-zA-Z:.]/g, '');
  return `${sanitizedIp}:${category}`;
};

/**
 * Factory function to create rate limiter middleware with configurable limits
 * @param options Rate limiter configuration options
 * @returns Express middleware function
 */
const createRateLimiter = (options: {
  limit: number;
  windowMs: number;
  burstAllowance: number;
  category: string;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get client IP with proxy support
      const clientIp = req.ip || 
                      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      '0.0.0.0';

      const key = getRateLimitKey(clientIp, options.category);
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Multi command for atomic operations
      const multi = redisClient.multi();
      
      // Remove old requests outside window
      multi.zremrangebyscore(key, 0, windowStart);
      // Count requests in current window
      multi.zcard(key);
      // Add current request
      multi.zadd(key, now, `${now}:${Math.random()}`);
      // Set key expiration
      multi.expire(key, Math.ceil(options.windowMs / 1000));

      const [, requestCount] = await multi.exec() as [any, [null, number]];
      const currentCount = requestCount[1];

      // Calculate remaining requests including burst allowance
      const remaining = options.limit + options.burstAllowance - currentCount;
      const resetTime = now + options.windowMs;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.limit + options.burstAllowance);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      if (currentCount > options.limit + options.burstAllowance) {
        // Log rate limit violation
        logger.warn('Rate limit exceeded', {
          ip: clientIp,
          category: options.category,
          count: currentCount,
          limit: options.limit,
          burst: options.burstAllowance
        });

        // Return rate limit error
        const retryAfter = Math.ceil(options.windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        
        const error = createError(ERROR_CODES.RATE_LIMIT_ERROR, {
          retryAfter,
          limit: options.limit,
          remaining: 0,
          reset: resetTime
        });
        
        return res.status(429).json(error);
      }

      next();
    } catch (error) {
      // Log Redis errors but allow request to proceed
      logger.error('Rate limiter error', { error });
      next();
    }
  };
};

// Export configured rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
  burstAllowance: 2,
  category: 'auth'
});

export const voiceRateLimiter = createRateLimiter({
  limit: 100,
  windowMs: 60 * 1000, // 1 minute
  burstAllowance: 10,
  category: 'voice'
});

export const textRateLimiter = createRateLimiter({
  limit: 1000,
  windowMs: 60 * 1000, // 1 minute
  burstAllowance: 50,
  category: 'text'
});