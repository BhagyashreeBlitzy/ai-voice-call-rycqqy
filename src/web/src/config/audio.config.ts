/**
 * Core audio configuration settings for the web client
 * Implements voice processing parameters, codec support, and audio processing options
 * @packageDocumentation
 * @version 1.0.0
 */

// External imports
import adapter from 'webrtc-adapter'; // v8.2.3 - WebRTC compatibility shim

// Internal imports
import { AudioConfig } from '../types/audio.types';
import { AUDIO_PROCESSING_CONSTANTS } from '../constants/audio.constants';

/**
 * Default audio configuration with optimized parameters for voice processing
 */
export const defaultAudioConfig: AudioConfig = {
  sampleRate: AUDIO_PROCESSING_CONSTANTS.SAMPLE_RATE, // 16kHz
  frameSize: AUDIO_PROCESSING_CONSTANTS.FRAME_SIZE_MS, // 20ms
  bitDepth: AUDIO_PROCESSING_CONSTANTS.BIT_DEPTH, // 16-bit
  channels: AUDIO_PROCESSING_CONSTANTS.CHANNELS, // Mono
};

/**
 * WebRTC configuration for audio streaming
 */
export const webrtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  audio: {
    sampleRate: defaultAudioConfig.sampleRate,
    channelCount: defaultAudioConfig.channels,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    latencyHint: 0.0 // Minimum latency for real-time processing
  },
  codecPreferences: [
    'audio/opus',
    'audio/pcm',
    'audio/g711',
    'audio/aac'
  ],
  bandwidthConstraints: {
    audio: {
      ideal: 32000, // 32 kbps for voice
      max: 64000    // 64 kbps maximum
    }
  }
};

/**
 * Voice activity detection configuration
 */
export const voiceActivityConfig = {
  vadThreshold: -26, // Voice activity detection threshold in dB
  noiseFloor: -45,   // Noise floor level in dB
  silenceTimeout: 1500, // Silence timeout in ms
  smoothingTimeConstant: 0.95, // Smoothing factor for VAD
};

/**
 * Audio visualization configuration for real-time waveform display
 */
export const audioVisualizerConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10
};

/**
 * Retrieves optimized audio configuration based on browser capabilities
 */
export function getAudioConfig(): AudioConfig {
  const browserConfig = adapter.browserDetails;
  const config = { ...defaultAudioConfig };

  // Browser-specific optimizations
  if (browserConfig.browser === 'chrome') {
    config.sampleRate = Math.min(48000, config.sampleRate); // Chrome supports up to 48kHz
  } else if (browserConfig.browser === 'firefox') {
    config.sampleRate = Math.min(44100, config.sampleRate); // Firefox optimal at 44.1kHz
  } else if (browserConfig.browser === 'safari') {
    config.sampleRate = 44100; // Safari works best with 44.1kHz
  }

  return config;
}

/**
 * Export audio processing constants for external use
 */
export const AUDIO_CONSTANTS = {
  DEFAULT_LATENCY_HINT: 0.0,
  DEFAULT_SAMPLE_RATE: defaultAudioConfig.sampleRate,
  DEFAULT_FRAME_SIZE: defaultAudioConfig.frameSize,
  DEFAULT_VAD_THRESHOLD: voiceActivityConfig.vadThreshold,
  DEFAULT_NOISE_FLOOR: voiceActivityConfig.noiseFloor,
  DEFAULT_FFT_SIZE: audioVisualizerConfig.fftSize
} as const;