/**
 * Type definitions for application settings and configuration
 * @packageDocumentation
 * @version 1.0.0
 */

import { ThemeMode } from '../constants/theme.constants';
import { VoiceConfig } from './voice.types';
import { AudioConfig } from './audio.types';

/**
 * Theme-related settings interface for appearance configuration
 */
export interface ThemeSettings {
  /** Selected theme mode (light/dark/system) */
  mode: ThemeMode;
  /** Whether to use system preference for theme */
  useSystemPreference: boolean;
}

/**
 * Audio processing settings interface with enhanced controls
 */
export interface AudioSettings {
  /** Input volume level (0-100) */
  inputVolume: number;
  /** Output volume level (0-100) */
  outputVolume: number;
  /** Enable/disable noise reduction */
  noiseReduction: boolean;
  /** Core audio configuration parameters */
  config: AudioConfig;
  /** Maximum acceptable processing delay in milliseconds */
  latencyBudget: number;
}

/**
 * Voice synthesis settings interface with wake word and auto-mute features
 */
export interface VoiceSettings {
  /** Voice synthesis configuration */
  config: VoiceConfig;
  /** Enable/disable auto-mute after AI response */
  autoMuteAfterResponse: boolean;
  /** Enable/disable wake word detection */
  wakeWordDetection: boolean;
  /** Wake word detection sensitivity (0-100) */
  wakeWordSensitivity: number;
}

/**
 * Language preference settings interface with RTL support
 */
export interface LanguageSettings {
  /** Primary language code (e.g., 'en-US') */
  primaryLanguage: string;
  /** Secondary language code (optional) */
  secondaryLanguage: string;
  /** Whether to use system language preference */
  useSystemLanguage: boolean;
  /** Enable/disable RTL (Right-to-Left) support */
  rtlSupport: boolean;
}

/**
 * Main application settings interface combining all setting categories
 */
export interface AppSettings {
  /** Theme and appearance settings */
  theme: ThemeSettings;
  /** Audio processing settings */
  audio: AudioSettings;
  /** Voice synthesis settings */
  voice: VoiceSettings;
  /** Language and localization settings */
  language: LanguageSettings;
}