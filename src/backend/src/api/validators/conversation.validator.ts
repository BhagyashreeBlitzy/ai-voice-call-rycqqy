/**
 * Conversation validator implementation for the AI Voice Agent
 * Provides comprehensive validation rules and schemas for conversation-related API requests
 * with strict security controls and detailed error handling
 * @version 1.0.0
 */

import { validateSchema, validateUUID, sanitizeInput } from '../../utils/validation.utils';
import { ConversationStatus, ConversationCreateParams } from '../../interfaces/conversation.interface';
import { Result } from '../../types/common.types';
import { ERROR_CODES } from '../../constants/error.constants';

// JSON Schema for conversation creation validation
const createConversationSchema = {
  type: 'object',
  properties: {
    sessionId: {
      type: 'string',
      format: 'uuid',
      description: 'Valid UUID v4 format session identifier'
    },
    initialContext: {
      type: 'object',
      additionalProperties: true,
      description: 'Optional initial conversation context'
    },
    preferredLanguage: {
      type: 'string',
      minLength: 2,
      maxLength: 5,
      pattern: '^[a-zA-Z-]+$',
      description: 'ISO language code'
    }
  },
  required: ['sessionId', 'preferredLanguage'],
  additionalProperties: false
};

// JSON Schema for conversation update validation
const updateConversationSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: [ConversationStatus.ACTIVE, ConversationStatus.PAUSED, ConversationStatus.COMPLETED],
      description: 'Conversation status value'
    },
    context: {
      type: 'object',
      additionalProperties: true,
      description: 'Updated conversation context'
    }
  },
  additionalProperties: false,
  minProperties: 1
};

/**
 * Validates the request payload for creating a new conversation
 * Implements comprehensive validation with security controls
 * @param payload Request payload for conversation creation
 * @returns Validation result with detailed error information
 */
export const validateCreateConversation = (
  payload: unknown
): Result<boolean> => {
  try {
    // Initial schema validation
    const schemaResult = validateSchema<ConversationCreateParams>(payload, createConversationSchema);
    if (!schemaResult.success) {
      return schemaResult;
    }

    const { sessionId, initialContext, preferredLanguage } = schemaResult.data;

    // Validate sessionId format
    const sessionIdResult = validateUUID(sessionId);
    if (!sessionIdResult.success) {
      return sessionIdResult;
    }

    // Sanitize and validate preferredLanguage
    const sanitizedLanguage = sanitizeInput(preferredLanguage);
    if (!/^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/.test(sanitizedLanguage)) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid language format',
          details: { value: preferredLanguage },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    // Validate initialContext if provided
    if (initialContext) {
      try {
        JSON.stringify(initialContext);
      } catch (error) {
        return {
          success: false,
          data: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid context format',
            details: { error: 'Context must be JSON serializable' },
            timestamp: Date.now()
          },
          metadata: {}
        };
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
        message: 'Conversation validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};

/**
 * Validates the request payload for updating an existing conversation
 * Implements strict validation rules with comprehensive error handling
 * @param payload Request payload for conversation update
 * @param conversationId Conversation identifier to update
 * @returns Validation result with detailed error information
 */
export const validateUpdateConversation = (
  payload: unknown,
  conversationId: string
): Result<boolean> => {
  try {
    // Validate conversationId format
    const conversationIdResult = validateUUID(conversationId);
    if (!conversationIdResult.success) {
      return conversationIdResult;
    }

    // Schema validation
    const schemaResult = validateSchema(payload, updateConversationSchema);
    if (!schemaResult.success) {
      return schemaResult;
    }

    const { status, context } = schemaResult.data as {
      status?: ConversationStatus;
      context?: Record<string, unknown>;
    };

    // Validate status if provided
    if (status && !Object.values(ConversationStatus).includes(status)) {
      return {
        success: false,
        data: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid conversation status',
          details: { value: status },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    // Validate context if provided
    if (context) {
      try {
        JSON.stringify(context);
      } catch (error) {
        return {
          success: false,
          data: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid context format',
            details: { error: 'Context must be JSON serializable' },
            timestamp: Date.now()
          },
          metadata: {}
        };
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
        message: 'Conversation update validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};

/**
 * Validates a conversation ID format ensuring UUID compliance
 * @param conversationId Conversation identifier to validate
 * @returns Validation result with detailed error information
 */
export const validateConversationId = (conversationId: string): Result<boolean> => {
  try {
    // Sanitize input
    const sanitizedId = sanitizeInput(conversationId);
    
    // Validate UUID format
    return validateUUID(sanitizedId);
  } catch (error) {
    return {
      success: false,
      data: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Conversation ID validation error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
};