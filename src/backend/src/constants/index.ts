/**
 * Central export point for all constant values used throughout the AI Voice Agent backend
 * Aggregates and re-exports constants from error handling, message processing, and voice processing modules
 * @version 1.0.0
 */

// Error Constants
export * as ErrorConstants from './error.constants';

// Message Constants
export * as MessageConstants from './message.constants';

// Voice Constants
export * as VoiceConstants from './voice.constants';

/**
 * Re-export specific constants for direct access when needed
 * while maintaining namespace organization through the above exports
 */

// Error handling re-exports
export {
  HTTP_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  createErrorInfo
} from './error.constants';

// Message processing re-exports
export {
  MESSAGE_VALIDATION,
  MESSAGE_ERROR_MESSAGES,
  SYSTEM_MESSAGES,
  MESSAGE_DEFAULTS
} from './message.constants';

// Voice processing re-exports
export {
  VOICE_IDS,
  VOICE_NAMES,
  AUDIO_PROCESSING,
  VOICE_ACTIVITY,
  SYNTHESIS_FORMATS,
  VOICE_LANGUAGES,
  SSML_TAGS
} from './voice.constants';

/**
 * Version information for the constants module
 * Used for tracking compatibility and updates
 */
export const CONSTANTS_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  toString: () => '1.0.0'
} as const;

/**
 * Timestamp of the last constants update
 * Useful for cache invalidation and version tracking
 */
export const CONSTANTS_LAST_UPDATED = Date.now() as number;