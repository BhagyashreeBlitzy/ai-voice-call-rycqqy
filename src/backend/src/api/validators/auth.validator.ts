/**
 * Authentication request validators for the AI Voice Agent
 * Implements comprehensive JSON schema validation with enhanced security controls
 * @version 1.0.0
 */

import { Schema } from 'jsonschema'; // v1.4.1
import { IAuthCredentials } from '../../interfaces/auth.interface';
import { validateEmail, validateSchema } from '../../utils/validation.utils';
import { Result } from '../../types/common.types';

/**
 * JSON Schema for login request validation
 * Enforces strict email format and password requirements
 */
const loginSchema: Schema = {
  $id: 'loginSchema',
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      minLength: 5,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128
    }
  },
  additionalProperties: false
};

/**
 * Enhanced JSON Schema for registration with strict validation rules
 */
const registerSchema: Schema = {
  $id: 'registerSchema',
  type: 'object',
  required: ['email', 'password', 'confirmPassword'],
  properties: {
    email: {
      type: 'string',
      minLength: 5,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128
    },
    metadata: {
      type: 'object',
      properties: {
        deviceInfo: { type: 'string', maxLength: 1024 },
        timezone: { type: 'string', maxLength: 64 },
        preferredLanguage: { type: 'string', maxLength: 10 }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

/**
 * JSON Schema for refresh token validation
 */
const refreshTokenSchema: Schema = {
  $id: 'refreshTokenSchema',
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: {
      type: 'string',
      minLength: 32,
      maxLength: 512,
      pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]*$'
    }
  },
  additionalProperties: false
};

/**
 * Validates login request credentials with enhanced security checks
 * @param credentials Login credentials to validate
 * @returns Validation result with detailed error collection
 */
export const validateLoginRequest = async (
  credentials: IAuthCredentials
): Promise<Result<boolean>> => {
  // Validate schema structure
  const schemaResult = validateSchema<IAuthCredentials>(credentials, loginSchema);
  if (!schemaResult.success) {
    return schemaResult;
  }

  // Enhanced email validation
  const emailResult = validateEmail(credentials.email);
  if (!emailResult.success) {
    return emailResult;
  }

  return {
    success: true,
    data: true,
    error: null,
    metadata: {}
  };
};

/**
 * Validates registration data with comprehensive security checks
 * @param registrationData Registration request data to validate
 * @returns Validation result with detailed error collection
 */
export const validateRegistrationRequest = async (
  registrationData: Record<string, unknown>
): Promise<Result<boolean>> => {
  // Validate schema structure
  const schemaResult = validateSchema(registrationData, registerSchema);
  if (!schemaResult.success) {
    return schemaResult;
  }

  // Enhanced email validation
  const emailResult = validateEmail(registrationData.email as string);
  if (!emailResult.success) {
    return emailResult;
  }

  // Password match validation
  if (registrationData.password !== registrationData.confirmPassword) {
    return {
      success: false,
      data: false,
      error: {
        code: 'VAL_001',
        message: 'Passwords do not match',
        details: {},
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
};

/**
 * Validates refresh token requests with format and structure checks
 * @param refreshTokenData Refresh token data to validate
 * @returns Validation result with token-specific error details
 */
export const validateRefreshTokenRequest = async (
  refreshTokenData: Record<string, unknown>
): Promise<Result<boolean>> => {
  // Validate schema structure
  const schemaResult = validateSchema(refreshTokenData, refreshTokenSchema);
  if (!schemaResult.success) {
    return schemaResult;
  }

  // Validate token format
  const token = refreshTokenData.refreshToken as string;
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return {
      success: false,
      data: false,
      error: {
        code: 'VAL_001',
        message: 'Invalid token format',
        details: {},
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
};