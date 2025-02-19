/**
 * Type definitions for voice processing and synthesis
 * @packageDocumentation
 * @version 1.0.0
 */

import { AudioConfig, AudioFormat } from './audio.types';

/**
 * Available voice synthesis options
 */
export enum VoiceId {
  MALE_1 = 'en-US-Male-1',
  MALE_2 = 'en-US-Male-2',
  FEMALE_1 = 'en-US-Female-1',
  FEMALE_2 = 'en-US-Female-2'
}

/**
 * Voice processing configuration with enhanced VAD controls
 */
export interface VoiceConfig {
  /** Core audio configuration parameters */
  audioConfig: AudioConfig;
  /** Preferred audio codec format */
  preferredFormat: AudioFormat;
  /** Enable/disable voice activity detection */
  vadEnabled: boolean;
  /** Voice activity detection threshold in dB (default: -26) */
  vadThreshold: number;
  /** Noise floor level in dB (default: -45) */
  noiseFloor: number;
}

/**
 * Text-to-speech synthesis configuration options
 */
export interface VoiceSynthesisOptions {
  /** Selected voice identifier */
  voiceId: VoiceId;
  /** Speaking rate (0.5 to 2.0, default: 1.0) */
  speakingRate: number;
  /** Voice pitch (-20 to 20, default: 0) */
  pitch: number;
  /** Voice volume (0 to 100, default: 100) */
  volume: number;
}

/**
 * Enhanced metadata for available voice options
 */
export interface VoiceMetadata {
  /** Voice identifier */
  voiceId: VoiceId;
  /** Display name of the voice */
  name: string;
  /** Language code (e.g., 'en-US') */
  language: string;
  /** Voice gender ('male' | 'female') */
  gender: string;
  /** Human-readable description */
  description: string;
  /** List of supported SSML features */
  supportedFeatures: string[];
}

/**
 * Voice processing error details
 */
export interface VoiceError {
  /** Error code identifier */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context and details */
  details: Record<string, unknown>;
}

/**
 * Voice processing state tracking
 */
export interface VoiceState {
  /** Indicates if voice processing is enabled */
  isActive: boolean;
  /** Indicates if voice input is currently detected */
  isSpeaking: boolean;
  /** Currently selected voice for synthesis */
  currentVoiceId: VoiceId;
  /** Indicates if audio is being processed */
  isProcessing: boolean;
  /** Current error state, if any */
  error: VoiceError | null;
}

/**
 * Voice quality metrics for monitoring
 */
export interface VoiceQualityMetrics {
  /** Speech recognition confidence score (0-1) */
  recognitionConfidence: number;
  /** End-to-end latency in milliseconds */
  latency: number;
  /** Packet loss percentage (0-100) */
  packetLoss: number;
  /** Mean Opinion Score for voice quality (1-5) */
  mos: number;
}

/**
 * SSML configuration options for voice synthesis
 */
export interface SSMLOptions {
  /** Enable/disable SSML processing */
  enabled: boolean;
  /** Supported SSML tags */
  supportedTags: string[];
  /** Custom SSML markers */
  markers: Record<string, string>;
}

/**
 * Voice session configuration
 */
export interface VoiceSessionConfig {
  /** Maximum session duration in seconds */
  maxDuration: number;
  /** Inactivity timeout in seconds */
  inactivityTimeout: number;
  /** Enable/disable session persistence */
  persistSession: boolean;
  /** Session metadata */
  metadata: Record<string, unknown>;
}