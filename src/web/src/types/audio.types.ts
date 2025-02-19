/**
 * Type definitions for client-side audio processing
 * @packageDocumentation
 * @version 1.0.0
 */

// External imports from typescript v5.0.0
import type { MediaStream } from 'typescript';
import type { AudioWorkletNode } from 'typescript';

/**
 * Core audio processing configuration parameters
 */
export interface AudioConfig {
  /** Sample rate in Hz (default: 16000) */
  sampleRate: number;
  /** Frame size in milliseconds (default: 20) */
  frameSize: number;
  /** Bit depth for audio samples (default: 16) */
  bitDepth: number;
  /** Number of audio channels (default: 1 for mono) */
  channels: number;
}

/**
 * Supported audio codec formats across browsers
 */
export enum AudioFormat {
  /** Opus codec - supported in Chrome, Firefox, Safari */
  OPUS = 'audio/opus',
  /** PCM format - universal support */
  PCM = 'audio/pcm',
  /** G.711 codec - supported in Chrome, Firefox */
  G711 = 'audio/g711',
  /** AAC codec - supported in Chrome, Safari */
  AAC = 'audio/aac'
}

/**
 * Interface representing a chunk of audio data in the stream
 */
export interface AudioChunk {
  /** Raw audio data */
  data: Uint8Array;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Audio format of the chunk */
  format: AudioFormat;
}

/**
 * Voice Activity Detection configuration parameters
 */
export interface VoiceActivityConfig {
  /** Voice activity detection threshold in dB (default: -26) */
  vadThreshold: number;
  /** Noise floor level in dB (default: -45) */
  noiseFloor: number;
  /** Silence timeout in milliseconds */
  silenceTimeout: number;
}

/**
 * Audio level measurement interface
 */
export interface AudioLevel {
  /** Root mean square level in dB */
  rms: number;
  /** Peak level in dB */
  peak: number;
  /** Indicates if the audio is clipping */
  clipping: boolean;
}

/**
 * WebRTC audio stream configuration
 */
export interface AudioStreamConfig {
  /** Browser MediaStream instance */
  mediaStream: MediaStream;
  /** Web Audio API context */
  audioContext: AudioContext;
  /** Audio processing worklet */
  processor: AudioWorkletNode;
}

/**
 * Configuration for audio visualization
 */
export interface AudioVisualizerConfig {
  /** FFT size for frequency analysis (must be power of 2) */
  fftSize: number;
  /** Smoothing time constant (0-1) */
  smoothingTimeConstant: number;
  /** Minimum decibel value for visualization */
  minDecibels: number;
  /** Maximum decibel value for visualization */
  maxDecibels: number;
}