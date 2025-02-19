/**
 * Session validation module for the AI Voice Agent
 * Implements comprehensive validation logic for session operations
 * with enhanced security and privacy compliance
 * @version 1.0.0
 */

import { validate } from 'jsonschema'; // v1.4.1
import { validateSchema, validateUUID, sanitizeInput } from '../../utils/validation.utils';
import { ISessionState, SessionStatus } from '../../interfaces/session.interface';
import { Result } from '../../types/common.types';
import { ERROR_CODES } from '../../constants/error.constants';

// Session metadata JSON schema with enhanced security rules
const sessionMetadataSchema = {
  type: 'object',
  required: ['userAgent', 'ipAddress', 'deviceId', 'lastLocation', 'securityFlags'],
  properties: {
    userAgent: {
      type: 'string',
      minLength: 1,
      maxLength: 512,
      pattern: '^[\\x20-\\x7E]+$' // Printable ASCII only
    },
    ipAddress: {
      type: 'string',
      pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    },
    deviceId: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]{16,64}$'
    },
    lastLocation: {
      type: 'string',
      maxLength: 256
    },
    securityFlags: {
      type: 'object',
      properties: {
        isSecureContext: { type: 'boolean' },
        hasMediaPermissions: { type: 'boolean' },
        isHttps: { type: 'boolean' },
        isAuthenticated: { type: 'boolean' }
      },
      required: ['isSecureContext', 'hasMediaPermissions', 'isHttps', 'isAuthenticated']
    }
  },
  additionalProperties: false
};

/**
 * Validates session creation request data with enhanced security checks
 * @param data Session creation request data
 * @returns Validation result with detailed error collection
 */
export const validateSessionCreate = (data: unknown): Result<boolean> => {
  try {
    // Validate basic structure
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid session creation data',
          details: { value: data },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const sessionData = data as Partial<ISessionState>;

    // Validate user ID
    const userIdValidation = validateUUID(sessionData.userId as string);
    if (!userIdValidation.success) {
      return userIdValidation;
    }

    // Validate WebSocket connection ID if present
    if (sessionData.wsConnectionId) {
      if (!/^[a-zA-Z0-9-_]{8,64}$/.test(sessionData.wsConnectionId)) {
        return {
          success: false,
          data: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid WebSocket connection ID format',
            details: { wsConnectionId: sessionData.wsConnectionId },
            timestamp: Date.now()
          },
          metadata: {}
        };
      }
    }

    // Validate session metadata
    if (sessionData.metadata) {
      const metadataValidation = validateSessionMetadata(sessionData.metadata);
      if (!metadataValidation.success) {
        return metadataValidation;
      }
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
        message: 'Session creation validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};

/**
 * Validates session update request data with connection state tracking
 * @param data Session update request data
 * @returns Validation result with detailed error collection
 */
export const validateSessionUpdate = (data: unknown): Result<boolean> => {
  try {
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid session update data',
          details: { value: data },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const updateData = data as Partial<ISessionState>;

    // Validate session ID
    const sessionIdValidation = validateUUID(updateData.id as string);
    if (!sessionIdValidation.success) {
      return sessionIdValidation;
    }

    // Validate session status
    if (updateData.status && !Object.values(SessionStatus).includes(updateData.status)) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid session status',
          details: { status: updateData.status },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    // Validate timestamps
    const now = Date.now();
    if (updateData.lastActiveTime && (
      typeof updateData.lastActiveTime !== 'number' ||
      updateData.lastActiveTime > now ||
      updateData.lastActiveTime < now - 86400000 // Max 24 hours in the past
    )) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid last active timestamp',
          details: { lastActiveTime: updateData.lastActiveTime },
          timestamp: now
        },
        metadata: {}
      };
    }

    // Validate expiry time
    if (updateData.expiryTime && (
      typeof updateData.expiryTime !== 'number' ||
      updateData.expiryTime < now ||
      updateData.expiryTime > now + 900000 // Max 15 minutes in the future
    )) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid expiry timestamp',
          details: { expiryTime: updateData.expiryTime },
          timestamp: now
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
        message: 'Session update validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};

/**
 * Validates session metadata with enhanced security and privacy checks
 * @param metadata Session metadata to validate
 * @returns Validation result with detailed error collection
 */
export const validateSessionMetadata = (metadata: unknown): Result<boolean> => {
  try {
    const schemaValidation = validateSchema(metadata, sessionMetadataSchema);
    if (!schemaValidation.success) {
      return schemaValidation;
    }

    const metadataObj = metadata as ISessionState['metadata'];

    // Sanitize and validate user agent
    const sanitizedUserAgent = sanitizeInput(metadataObj.userAgent);
    if (sanitizedUserAgent !== metadataObj.userAgent) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid user agent string',
          details: { userAgent: metadataObj.userAgent },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    // Validate IP address with geographic restrictions
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(metadataObj.ipAddress)) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid IP address format',
          details: { ipAddress: metadataObj.ipAddress },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    // Validate device ID format
    const deviceIdRegex = /^[a-zA-Z0-9-_]{16,64}$/;
    if (!deviceIdRegex.test(metadataObj.deviceId)) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid device ID format',
          details: { deviceId: metadataObj.deviceId },
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
        message: 'Session metadata validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};