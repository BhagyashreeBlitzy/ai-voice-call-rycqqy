/**
 * Message-related constants and configurations for the voice conversation system
 * Defines validation rules, error messages, and system message templates
 * @version 1.0.0
 */

import { MessageRole } from '../interfaces/message.interface';

/**
 * Message content validation constraints
 * Enforces security and performance boundaries for message handling
 */
export const MESSAGE_VALIDATION = {
  /** Maximum allowed message content length in characters */
  MAX_CONTENT_LENGTH: 4000,
  /** Minimum required message content length in characters */
  MIN_CONTENT_LENGTH: 1,
  /** Maximum allowed audio duration in milliseconds (5 minutes) */
  MAX_AUDIO_DURATION_MS: 300000,
  /** Supported audio formats for voice messages */
  ALLOWED_AUDIO_FORMATS: ['audio/wav', 'audio/opus', 'audio/webm', 'audio/ogg']
} as const;

/**
 * Error message constants for message validation failures
 * Provides consistent error messaging across the application
 */
export const MESSAGE_ERROR_MESSAGES = {
  /** Error message for content exceeding maximum length */
  CONTENT_TOO_LONG: `Message content cannot exceed ${MESSAGE_VALIDATION.MAX_CONTENT_LENGTH} characters`,
  /** Error message for content below minimum length */
  CONTENT_TOO_SHORT: 'Message content cannot be empty',
  /** Error message for invalid message role */
  INVALID_ROLE: 'Invalid message role specified',
  /** Error message for invalid conversation reference */
  INVALID_CONVERSATION_ID: 'Invalid or missing conversation ID',
  /** Error message for unsupported audio format */
  INVALID_AUDIO_FORMAT: `Audio format must be one of: ${MESSAGE_VALIDATION.ALLOWED_AUDIO_FORMATS.join(', ')}`,
  /** Error message for audio exceeding duration limit */
  AUDIO_TOO_LONG: `Audio recording cannot exceed ${MESSAGE_VALIDATION.MAX_AUDIO_DURATION_MS / 1000} seconds`,
  /** Error message for general processing failures */
  PROCESSING_ERROR: 'An error occurred while processing the message'
} as const;

/**
 * System-generated message templates
 * Ensures consistent system communication across the application
 */
export const SYSTEM_MESSAGES = {
  /** Welcome message for new users */
  WELCOME: 'Welcome to AI Voice Agent! How can I assist you today?',
  /** Message indicating the start of a new conversation */
  CONVERSATION_START: 'Starting a new conversation. You can begin speaking or typing at any time.',
  /** Message indicating the end of a conversation */
  CONVERSATION_END: 'Conversation ended. Thank you for using AI Voice Agent.',
  /** Generic error notification message */
  ERROR_OCCURRED: 'An error occurred. Please try again or contact support if the problem persists.',
  /** Audio processing status message */
  PROCESSING_AUDIO: 'Processing your voice message...',
  /** Connection loss notification */
  CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',
  /** Reconnection attempt notification */
  RECONNECTING: 'Reconnecting to the service...'
} as const;

/**
 * Default values for message properties
 * Provides fallback values and standard configurations
 */
export const MESSAGE_DEFAULTS = {
  /** Default message role when not specified */
  DEFAULT_ROLE: MessageRole.SYSTEM,
  /** Default metadata structure for new messages */
  DEFAULT_METADATA: {
    duration: 0,
    wordCount: 0,
    processingTime: 0,
    audioFormat: null,
    transcriptionConfidence: null
  },
  /** Default audio configuration for voice messages */
  DEFAULT_AUDIO_CONFIG: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    encoding: 'LINEAR16'
  }
} as const;