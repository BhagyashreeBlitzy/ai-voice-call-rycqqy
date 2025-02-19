/**
 * Audio processing constants for voice interaction features
 * @packageDocumentation
 * @version 1.0.0
 */

import { AudioFormat } from '../types/audio.types';

/**
 * Core audio processing parameters based on technical specifications
 */
export const AUDIO_PROCESSING_CONSTANTS = {
  /** Sample rate in Hz for speech recognition */
  SAMPLE_RATE: 16000,
  /** Frame size for audio processing in milliseconds */
  FRAME_SIZE_MS: 20,
  /** Bit depth for audio samples */
  BIT_DEPTH: 16,
  /** Number of audio channels (mono) */
  CHANNELS: 1,
} as const;

/**
 * Voice activity detection parameters
 */
export const VOICE_ACTIVITY_CONSTANTS = {
  /** Voice activity detection threshold in decibels */
  VAD_THRESHOLD_DB: -26,
  /** Noise floor level in decibels */
  NOISE_FLOOR_DB: -45,
  /** Silence timeout before stopping recording (ms) */
  SILENCE_TIMEOUT_MS: 1500,
  /** Maximum recording duration (ms) */
  MAX_RECORDING_DURATION_MS: 60000,
  /** Size of audio chunks for processing (bytes) */
  AUDIO_CHUNK_SIZE_BYTES: 3200, // Calculated from sample rate * frame size
} as const;

/**
 * WebRTC constraints for optimal voice capture
 */
export const WEBRTC_CONSTRAINTS = {
  audio: {
    sampleRate: AUDIO_PROCESSING_CONSTANTS.SAMPLE_RATE,
    channelCount: AUDIO_PROCESSING_CONSTANTS.CHANNELS,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
} as const;

/**
 * Prioritized list of supported audio codecs for cross-browser compatibility
 * Ordered by preference and browser support coverage
 */
export const SUPPORTED_CODECS = [
  AudioFormat.OPUS, // Preferred - Chrome, Firefox, Safari
  AudioFormat.PCM,  // Universal fallback
  AudioFormat.G711, // Chrome, Firefox
  AudioFormat.AAC   // Chrome, Safari
] as const;

/**
 * Audio visualization parameters for real-time waveform display
 */
export const VISUALIZER_CONSTANTS = {
  /** FFT size for frequency analysis (power of 2) */
  FFT_SIZE: 2048,
  /** Smoothing time constant for visualization (0-1) */
  SMOOTHING_TIME_CONSTANT: 0.8,
  /** Minimum decibel value for visualization scale */
  MIN_DECIBELS: -90,
  /** Maximum decibel value for visualization scale */
  MAX_DECIBELS: -10,
  /** Visualization update interval (ms) */
  UPDATE_INTERVAL_MS: 50,
} as const;

/**
 * Browser compatibility matrix for audio codecs
 * Used for runtime codec selection
 */
export const CODEC_BROWSER_SUPPORT = {
  [AudioFormat.OPUS]: ['chrome', 'firefox', 'safari'],
  [AudioFormat.PCM]: ['chrome', 'firefox', 'safari'],
  [AudioFormat.G711]: ['chrome', 'firefox'],
  [AudioFormat.AAC]: ['chrome', 'safari'],
} as const;