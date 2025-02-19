/**
 * Validation utilities for the AI Voice Agent backend services
 * Provides comprehensive input validation, schema validation, and data sanitization
 * @version 1.0.0
 */

import { validate as jsonValidate, Schema, ValidatorResult } from 'jsonschema'; // v1.4.1
import validator from 'validator'; // v13.9.0
import { ValidationError, Result } from '../types/common.types';
import { ERROR_CODES } from '../constants/error.constants';

// Cache for compiled JSON schemas to improve performance
const schemaCache = new Map<string, Schema>();

/**
 * Validates input data against a JSON schema with caching and performance optimization
 * @param data Input data to validate
 * @param schema JSON schema definition
 * @returns Validation result with detailed error collection
 */
export const validateSchema = <T>(data: unknown, schema: Schema): Result<T> => {
  try {
    const schemaId = schema.$id || JSON.stringify(schema);
    let compiledSchema = schemaCache.get(schemaId);

    if (!compiledSchema) {
      compiledSchema = schema;
      schemaCache.set(schemaId, compiledSchema);
    }

    const validationResult: ValidatorResult = jsonValidate(data, compiledSchema);

    if (!validationResult.valid) {
      const errors: ValidationError[] = validationResult.errors.map(error => ({
        field: error.property.replace('instance.', ''),
        message: error.message,
        value: error.instance,
        constraint: error.name,
        context: {
          schema: error.schema,
          argument: error.argument,
          stack: error.stack
        }
      }));

      return {
        success: false,
        data: null as unknown as T,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Schema validation failed',
          details: { errors },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    return {
      success: true,
      data: data as T,
      error: null,
      metadata: {}
    };
  } catch (error) {
    return {
      success: false,
      data: null as unknown as T,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Schema validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};

/**
 * Comprehensive input sanitization for XSS and injection prevention
 * @param input String input to sanitize
 * @returns Sanitized string safe for use
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  let sanitized = input.trim();

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Escape HTML special characters
  sanitized = validator.escape(sanitized);

  // Remove potential script tags and other dangerous patterns
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '');

  return sanitized;
};

/**
 * RFC 5322 compliant email validation with additional security checks
 * @param email Email address to validate
 * @returns Validation result with detailed error information
 */
export const validateEmail = (email: string): Result<boolean> => {
  try {
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid email format',
          details: { value: email },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    // Comprehensive email validation using multiple checks
    const isValid = validator.isEmail(sanitizedEmail, {
      allow_utf8_local_part: false,
      require_tld: true,
      allow_ip_domain: false,
      domain_specific_validation: true,
      blacklisted_chars: '<>()[]\\,;:'
    });

    if (!isValid) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid email format',
          details: { value: sanitizedEmail },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    return {
      success: true,
      data: true,
      error: null,
      metadata: {}
    };
  } catch (error) {
    return {
      success: false,
      data: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Email validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};

/**
 * Strict UUID v4 format validation
 * @param uuid UUID string to validate
 * @returns Validation result
 */
export const validateUUID = (uuid: string): Result<boolean> => {
  try {
    if (!uuid || typeof uuid !== 'string') {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid UUID format',
          details: { value: uuid },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const sanitizedUUID = sanitizeInput(uuid);
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidV4Regex.test(sanitizedUUID);

    if (!isValid) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid UUID format',
          details: { value: sanitizedUUID },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    return {
      success: true,
      data: true,
      error: null,
      metadata: {}
    };
  } catch (error) {
    return {
      success: false,
      data: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'UUID validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};