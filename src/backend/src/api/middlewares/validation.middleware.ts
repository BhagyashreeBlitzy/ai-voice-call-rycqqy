/**
 * Express middleware for comprehensive request validation and sanitization
 * Implements enterprise-grade security controls with performance optimizations
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimit } from 'express-rate-limit';
import { Schema } from 'jsonschema';
import { v4 as uuidv4 } from 'uuid';
import { validateSchema, sanitizeInput } from '../../utils/validation.utils';
import { createError } from '../../utils/error.utils';
import { ValidationError } from '../../types/common.types';
import { ERROR_CODES } from '../../constants/error.constants';
import { logger } from '../../utils/logger.utils';

// Cache for validated request schemas
const validationCache = new Map<string, boolean>();

// Interface for validation middleware options
interface ValidationOptions {
  /** Enable caching of validation results */
  enableCache?: boolean;
  /** Maximum depth for recursive validation */
  maxDepth?: number;
  /** Maximum validation attempts per IP */
  maxAttempts?: number;
  /** Time window for rate limiting (in minutes) */
  timeWindow?: number;
  /** Skip validation for specific fields */
  skipFields?: string[];
  /** Version of validation rules to apply */
  version?: string;
}

// Default validation options
const DEFAULT_OPTIONS: ValidationOptions = {
  enableCache: true,
  maxDepth: 10,
  maxAttempts: 100,
  timeWindow: 15,
  skipFields: [],
  version: '1.0'
};

/**
 * Creates rate limiter for validation attempts
 * @param options Validation options
 * @returns RateLimit middleware
 */
const createRateLimiter = (options: ValidationOptions): RateLimit => {
  return new RateLimit({
    windowMs: options.timeWindow! * 60 * 1000,
    max: options.maxAttempts,
    message: 'Too many validation failures. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * Generates cache key for validation results
 * @param schema JSON schema
 * @param data Request data
 * @returns Cache key string
 */
const generateCacheKey = (schema: Schema, data: unknown): string => {
  return `${schema.$id || ''}-${JSON.stringify(data)}`;
};

/**
 * Enhanced request validation middleware factory
 * @param schema JSON schema for validation
 * @param options Validation options
 * @returns Express middleware function
 */
export const validateRequest = (
  schema: Schema,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const rateLimiter = createRateLimiter(mergedOptions);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const correlationId = uuidv4();
      const startTime = Date.now();

      // Apply rate limiting
      await new Promise((resolve) => rateLimiter(req, res, resolve));

      // Check cache if enabled
      if (mergedOptions.enableCache) {
        const cacheKey = generateCacheKey(schema, req.body);
        if (validationCache.has(cacheKey)) {
          return next();
        }
      }

      // Validate request data
      const validationResult = validateSchema(req.body, schema);

      if (!validationResult.success) {
        const errors = validationResult.error?.details?.errors as ValidationError[];
        
        logger.warn('Request validation failed', {
          correlationId,
          errors,
          path: req.path,
          method: req.method,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            errors,
            correlationId
          })
        });
      }

      // Cache successful validation result
      if (mergedOptions.enableCache) {
        const cacheKey = generateCacheKey(schema, req.body);
        validationCache.set(cacheKey, true);
      }

      // Track validation metrics
      logger.info('Request validation successful', {
        correlationId,
        duration: Date.now() - startTime,
        path: req.path,
        method: req.method
      });

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error,
        path: req.path,
        method: req.method
      });

      res.status(500).json({
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR)
      });
    }
  };
};

/**
 * Enhanced request sanitization middleware
 * Implements recursive sanitization with security pattern matching
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const correlationId = uuidv4();
    const startTime = Date.now();

    /**
     * Recursively sanitize object values
     * @param obj Object to sanitize
     * @param depth Current depth
     * @returns Sanitized object
     */
    const sanitizeObject = (
      obj: Record<string, unknown>,
      depth: number = 0
    ): Record<string, unknown> => {
      if (depth > DEFAULT_OPTIONS.maxDepth!) {
        return obj;
      }

      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        if (DEFAULT_OPTIONS.skipFields?.includes(key)) {
          sanitized[key] = value;
          continue;
        }

        if (typeof value === 'string') {
          sanitized[key] = sanitizeInput(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(item =>
            typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>, depth + 1) : item
          );
        } else if (value && typeof value === 'object') {
          sanitized[key] = sanitizeObject(value as Record<string, unknown>, depth + 1);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    };

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Track sanitization metrics
    logger.info('Request sanitization completed', {
      correlationId,
      duration: Date.now() - startTime,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.error('Sanitization middleware error', {
      error,
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      success: false,
      error: createError(ERROR_CODES.SYSTEM_ERROR)
    });
  }
};