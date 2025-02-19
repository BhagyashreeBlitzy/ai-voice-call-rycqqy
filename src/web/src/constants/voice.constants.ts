/**
 * Voice processing and synthesis constants
 * @packageDocumentation
 * @version 1.0.0
 */

import { VoiceId } from '../types/voice.types';

/**
 * Core voice processing configuration parameters
 * Optimized for real-time speech recognition with minimal latency
 */
export const VOICE_PROCESSING_CONFIG = {
  /** Sample rate in Hz for audio capture */
  SAMPLE_RATE: 16000,
  /** Frame size for audio processing in milliseconds */
  FRAME_SIZE_MS: 20,
  /** Bit depth for audio samples */
  BIT_DEPTH: 16,
  /** Number of audio channels (mono) */
  CHANNELS: 1,
  /** Audio processing buffer size in samples */
  BUFFER_SIZE: 2048,
  /** Maximum number of buffers to queue */
  MAX_BUFFER_COUNT: 128,
  /** Processing interval for audio analysis in milliseconds */
  PROCESSING_INTERVAL_MS: 10
} as const;

/**
 * Voice activity detection thresholds and parameters
 * Calibrated for optimal speech detection in typical environments
 */
export const VOICE_ACTIVITY_THRESHOLDS = {
  /** Voice activity detection threshold in dB */
  VAD_THRESHOLD_DB: -26,
  /** Noise floor level in dB */
  NOISE_FLOOR_DB: -45,
  /** Duration of silence before speech end detection (ms) */
  SILENCE_DURATION_MS: 1500,
  /** Minimum duration for valid speech segment (ms) */
  MIN_SPEECH_DURATION_MS: 100,
  /** Maximum duration for single speech segment (ms) */
  MAX_SPEECH_DURATION_MS: 15000,
  /** Smoothing factor for energy level calculation */
  ENERGY_SMOOTHING_FACTOR: 0.85
} as const;

/**
 * Voice synthesis configuration parameters
 * Controls speech generation quality and characteristics
 */
export const VOICE_SYNTHESIS_CONFIG = {
  /** Default speaking rate */
  DEFAULT_RATE: 1.0,
  /** Minimum speaking rate */
  MIN_RATE: 0.5,
  /** Maximum speaking rate */
  MAX_RATE: 2.0,
  /** Default voice pitch */
  DEFAULT_PITCH: 1.0,
  /** Minimum voice pitch */
  MIN_PITCH: 0.5,
  /** Maximum voice pitch */
  MAX_PITCH: 2.0,
  /** Default voice volume */
  DEFAULT_VOLUME: 1.0,
  /** Enable SSML support */
  SSML_ENABLED: true,
  /** Supported SSML tags for voice synthesis */
  SUPPORTED_SSML_TAGS: ['speak', 'break', 'prosody', 'say-as', 'emphasis'] as const,
  /** Fallback voice if preferred voice is unavailable */
  FALLBACK_VOICE: 'en-US-Standard-B'
} as const;

/**
 * Mapping of internal voice IDs to cloud provider voice identifiers
 * Supports multiple voice options for variety
 */
export const SUPPORTED_VOICE_IDS = {
  [VoiceId.MALE_1]: 'en-US-Standard-B',
  [VoiceId.FEMALE_1]: 'en-US-Standard-C',
  [VoiceId.MALE_2]: 'en-US-Standard-D',
  [VoiceId.FEMALE_2]: 'en-US-Standard-E'
} as const;

/**
 * User-friendly display names for voice options
 * Used in UI for voice selection
 */
export const VOICE_DISPLAY_NAMES = {
  [VoiceId.MALE_1]: 'Male Voice 1',
  [VoiceId.FEMALE_1]: 'Female Voice 1',
  [VoiceId.MALE_2]: 'Male Voice 2',
  [VoiceId.FEMALE_2]: 'Female Voice 2'
} as const;

/**
 * Supported audio format configurations
 * Defines codec-specific parameters for different browsers
 */
export const SUPPORTED_AUDIO_FORMATS = {
  /** Opus codec configuration for modern browsers */
  OPUS: {
    codec: 'opus',
    sampleRate: 48000,
    channels: 1,
    bitRate: 24000
  },
  /** PCM format configuration for universal compatibility */
  PCM: {
    codec: 'pcm',
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16
  }
} as const;

/**
 * Type definitions for audio format configurations
 */
interface AudioFormatConfig {
  codec: string;
  sampleRate: number;
  channels: number;
  bitRate?: number;
  bitDepth?: number;
}