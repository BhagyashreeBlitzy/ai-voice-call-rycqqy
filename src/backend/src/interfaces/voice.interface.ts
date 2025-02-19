/**
 * Voice processing and synthesis interfaces for the AI Voice Agent
 * Defines comprehensive TypeScript interfaces for voice configuration, processing,
 * and synthesis based on technical specifications
 * @version 1.0.0
 */

import { AudioConfig, AudioFormat } from '../types/audio.types';

/**
 * Voice processing configuration interface
 * Based on technical specifications for high-quality voice processing
 */
export interface VoiceConfig {
  /** Core audio configuration settings */
  readonly audioConfig: AudioConfig;
  /** Preferred audio codec format */
  readonly preferredFormat: AudioFormat;
  /** Enable/disable voice activity detection */
  readonly vadEnabled: boolean;
  /** Voice activity detection threshold in dB (default: -26dB) */
  readonly vadThreshold: number;
  /** Noise floor level in dB (default: -45dB) */
  readonly noiseFloor: number;
  /** Maximum acceptable processing latency in ms (default: 500ms) */
  readonly latencyBudget: number;
  /** Enable/disable noise cancellation */
  readonly noiseCancellation: boolean;
}

/**
 * Text-to-speech synthesis configuration options
 * Supports multiple voice options with customizable parameters
 */
export interface VoiceSynthesisOptions {
  /** Unique identifier for the selected voice */
  readonly voiceId: string;
  /** Speech rate multiplier (0.5 to 2.0) */
  readonly rate: number;
  /** Voice pitch adjustment (-20 to 20) */
  readonly pitch: number;
  /** Voice volume level (0 to 100) */
  readonly volume: number;
  /** Language code (e.g., 'en-US') */
  readonly languageCode: string;
  /** Enable/disable SSML support */
  readonly ssmlEnabled: boolean;
  /** Audio effects to apply (e.g., 'telephony', 'studio') */
  readonly effectsProfile: string[];
}

/**
 * Metadata interface for available voice options
 * Provides detailed information about each available voice
 */
export interface VoiceMetadata {
  /** Unique identifier for the voice */
  readonly voiceId: string;
  /** Display name of the voice */
  readonly name: string;
  /** Supported language code */
  readonly language: string;
  /** Voice gender ('male', 'female', 'neutral') */
  readonly gender: string;
  /** List of supported audio effects */
  readonly supportedEffects: string[];
  /** Supported sample rate in Hz */
  readonly sampleRate: number;
  /** Supported audio codecs */
  readonly codecSupport: AudioFormat[];
}

/**
 * Voice processing state interface
 * Tracks real-time voice processing status and metrics
 */
export interface VoiceState {
  /** Indicates if voice processing is active */
  readonly isActive: boolean;
  /** Indicates if speech is currently detected */
  readonly isSpeaking: boolean;
  /** Currently selected voice ID */
  readonly currentVoiceId: string;
  /** Current error state, if any */
  readonly errorState: {
    code: string;
    message: string;
  } | null;
  /** Timestamp of last voice activity */
  readonly lastActivity: Date;
  /** Real-time processing statistics */
  readonly processingStats: {
    /** End-to-end latency in milliseconds */
    latency: number;
    /** Packet loss percentage */
    packetLoss: number;
    /** Voice quality score (0-100) */
    quality: number;
  };
}