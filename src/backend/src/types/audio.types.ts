/**
 * Core TypeScript type definitions for audio processing
 * Provides comprehensive type definitions for audio configuration, formats,
 * chunks, and voice activity detection with strict technical specifications
 * @version 1.0.0
 */

import { Result } from '../types/common.types';
import type { WebAssembly } from '@types/webassembly-js-api'; // v0.0.18

/**
 * Audio processing configuration interface with technical specifications
 * Based on system requirements for high-quality voice processing
 */
export interface AudioConfig {
  /** Sample rate in Hz (default: 16000) */
  readonly sampleRate: number;
  /** Frame size in milliseconds (default: 20) */
  readonly frameSize: number;
  /** Bit depth for audio samples (default: 16) */
  readonly bitDepth: number;
  /** Number of audio channels (default: 1 for mono) */
  readonly channels: number;
  /** Maximum acceptable processing latency in milliseconds (default: 500) */
  readonly latencyBudget: number;
}

/**
 * Supported audio codec formats with cross-browser compatibility
 * Based on browser codec support matrix
 */
export enum AudioFormat {
  /** Opus codec - Primary format for WebRTC */
  OPUS = 'audio/opus',
  /** PCM format - Universal fallback */
  PCM = 'audio/pcm',
  /** G.711 codec - Legacy support */
  G711 = 'audio/g711',
  /** AAC codec - Alternative format */
  AAC = 'audio/aac'
}

/**
 * Interface for audio stream chunks with sequence tracking
 * Ensures ordered processing of audio data
 */
export interface AudioChunk {
  /** Raw audio data buffer */
  readonly data: Uint8Array;
  /** Timestamp in milliseconds */
  readonly timestamp: number;
  /** Audio format of the chunk */
  readonly format: AudioFormat;
  /** Sequence number for ordering */
  readonly sequence: number;
}

/**
 * Voice activity detection configuration
 * Implements specified technical parameters for accurate speech detection
 */
export interface VoiceActivityConfig {
  /** Voice activity detection threshold in dB (default: -26) */
  readonly vadThreshold: number;
  /** Noise floor level in dB (default: -45) */
  readonly noiseFloor: number;
  /** Silence duration before speech end in milliseconds */
  readonly silenceTimeout: number;
  /** Minimum speech duration in milliseconds */
  readonly minSpeechDuration: number;
}

/**
 * Interface for audio level measurements with history
 * Provides comprehensive audio metrics for monitoring
 */
export interface AudioLevel {
  /** Root mean square level in dB */
  readonly rms: number;
  /** Peak level in dB */
  readonly peak: number;
  /** Indicates if the audio is clipping */
  readonly clipping: boolean;
  /** Historical level measurements */
  readonly history: readonly number[];
}

/**
 * Type alias for audio processing operation results
 * Provides type-safe error handling for audio operations
 */
export type AudioProcessingResult = Result<AudioChunk>;

/**
 * Enhanced error information for audio processing
 * Provides detailed error context and recovery suggestions
 */
export interface AudioProcessingError {
  /** Error code for identification */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Additional error context */
  readonly details: Record<string, unknown>;
  /** Indicates if the error is recoverable */
  readonly recoverable: boolean;
  /** Suggested recovery action */
  readonly suggestion: string;
}

/**
 * Default audio configuration values
 * Based on technical specifications for optimal voice processing
 */
export const DEFAULT_AUDIO_CONFIG: Readonly<AudioConfig> = {
  sampleRate: 16000,
  frameSize: 20,
  bitDepth: 16,
  channels: 1,
  latencyBudget: 500
} as const;

/**
 * Default voice activity detection configuration
 * Based on specified technical parameters
 */
export const DEFAULT_VAD_CONFIG: Readonly<VoiceActivityConfig> = {
  vadThreshold: -26,
  noiseFloor: -45,
  silenceTimeout: 500,
  minSpeechDuration: 100
} as const;