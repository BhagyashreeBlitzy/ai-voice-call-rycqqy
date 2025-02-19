/**
 * Central export file for all application constants
 * Aggregates and re-exports constants from domain-specific files
 * @packageDocumentation
 * @version 1.0.0
 */

// API Constants - v1.0.0
export {
  API_BASE_URL,
  WS_BASE_URL,
  API_ENDPOINTS,
  HTTP_METHODS,
  HTTP_HEADERS,
  CONTENT_TYPES,
  HTTP_STATUS,
  type ApiEndpoints,
  type HttpMethods,
  type HttpHeaders,
  type ContentTypes,
  type HttpStatus
} from './api.constants';

// Audio Constants - v1.0.0
export {
  AUDIO_PROCESSING_CONSTANTS,
  VOICE_ACTIVITY_CONSTANTS,
  WEBRTC_CONSTRAINTS,
  SUPPORTED_CODECS,
  VISUALIZER_CONSTANTS,
  CODEC_BROWSER_SUPPORT
} from './audio.constants';

// Theme Constants - v1.0.0
export {
  THEME_COLORS,
  SPACING_UNIT,
  BREAKPOINTS,
  Z_INDEX,
  type ThemeColors,
  type ColorVariant,
  type Breakpoint,
  type ZIndexLayer
} from './theme.constants';

// Voice Constants - v1.0.0
export {
  VOICE_PROCESSING_CONFIG,
  VOICE_ACTIVITY_THRESHOLDS,
  VOICE_SYNTHESIS_CONFIG,
  SUPPORTED_VOICE_IDS,
  VOICE_DISPLAY_NAMES,
  SUPPORTED_AUDIO_FORMATS,
  type AudioFormatConfig
} from './voice.constants';

// WebSocket Constants - v1.0.0
export {
  WEBSOCKET_BASE_URL,
  WEBSOCKET_VERSION,
  WEBSOCKET_DEFAULTS,
  WEBSOCKET_PROTOCOLS,
  WEBSOCKET_EVENTS,
  WEBSOCKET_ERROR_CODES,
  WEBSOCKET_STATUS,
  WEBSOCKET_SECURITY,
  WEBSOCKET_PERFORMANCE
} from './websocket.constants';

/**
 * Namespace groupings for better organization and access
 * Provides logical grouping of related constants
 */
export const API = {
  BASE_URL: API_BASE_URL,
  WS_BASE_URL: WS_BASE_URL,
  ENDPOINTS: API_ENDPOINTS,
  METHODS: HTTP_METHODS,
  HEADERS: HTTP_HEADERS,
  CONTENT_TYPES: CONTENT_TYPES,
  STATUS: HTTP_STATUS
} as const;

export const AUDIO = {
  PROCESSING: AUDIO_PROCESSING_CONSTANTS,
  VAD: VOICE_ACTIVITY_CONSTANTS,
  WEBRTC: WEBRTC_CONSTRAINTS,
  CODECS: SUPPORTED_CODECS,
  VISUALIZER: VISUALIZER_CONSTANTS,
  BROWSER_SUPPORT: CODEC_BROWSER_SUPPORT
} as const;

export const THEME = {
  COLORS: THEME_COLORS,
  SPACING: SPACING_UNIT,
  BREAKPOINTS: BREAKPOINTS,
  Z_INDEX: Z_INDEX
} as const;

export const VOICE = {
  PROCESSING: VOICE_PROCESSING_CONFIG,
  ACTIVITY: VOICE_ACTIVITY_THRESHOLDS,
  SYNTHESIS: VOICE_SYNTHESIS_CONFIG,
  VOICES: SUPPORTED_VOICE_IDS,
  DISPLAY_NAMES: VOICE_DISPLAY_NAMES,
  FORMATS: SUPPORTED_AUDIO_FORMATS
} as const;

export const WEBSOCKET = {
  BASE_URL: WEBSOCKET_BASE_URL,
  VERSION: WEBSOCKET_VERSION,
  DEFAULTS: WEBSOCKET_DEFAULTS,
  PROTOCOLS: WEBSOCKET_PROTOCOLS,
  EVENTS: WEBSOCKET_EVENTS,
  ERROR_CODES: WEBSOCKET_ERROR_CODES,
  STATUS: WEBSOCKET_STATUS,
  SECURITY: WEBSOCKET_SECURITY,
  PERFORMANCE: WEBSOCKET_PERFORMANCE
} as const;

// Freeze all namespace objects to prevent runtime modifications
Object.freeze(API);
Object.freeze(AUDIO);
Object.freeze(THEME);
Object.freeze(VOICE);
Object.freeze(WEBSOCKET);