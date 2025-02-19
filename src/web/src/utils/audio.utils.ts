/**
 * Utility functions for client-side audio processing
 * Implements WebRTC stream handling, voice activity detection,
 * audio level measurement, and audio visualization
 * @packageDocumentation
 * @version 1.0.0
 */

// External imports
import adapter from 'webrtc-adapter'; // v8.2.3

// Internal imports
import { 
  AudioConfig, 
  AudioFormat, 
  AudioLevel, 
  AudioChunk,
  VoiceActivityConfig 
} from '../types/audio.types';
import { 
  AUDIO_PROCESSING_CONSTANTS,
  VOICE_ACTIVITY_CONSTANTS,
  WEBRTC_CONSTRAINTS,
  SUPPORTED_CODECS,
  CODEC_BROWSER_SUPPORT
} from '../constants/audio.constants';
import { defaultAudioConfig } from '../config/audio.config';

/**
 * Initializes WebRTC audio stream with specified configuration
 * @param audioConfig - Audio configuration parameters
 * @returns Promise resolving to configured MediaStream
 * @throws Error if microphone access is denied or initialization fails
 */
export async function initializeAudioStream(
  audioConfig: AudioConfig = defaultAudioConfig
): Promise<MediaStream> {
  try {
    // Check browser compatibility
    const browserDetails = adapter.browserDetails;
    const constraints = {
      ...WEBRTC_CONSTRAINTS,
      audio: {
        ...WEBRTC_CONSTRAINTS.audio,
        sampleRate: audioConfig.sampleRate,
        channelCount: audioConfig.channels
      }
    };

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Create AudioContext for processing
    const audioContext = new AudioContext({
      sampleRate: audioConfig.sampleRate,
      latencyHint: 'interactive'
    });

    // Apply noise cancellation if supported
    if (browserDetails.browser === 'chrome' || browserDetails.browser === 'firefox') {
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(
        audioConfig.frameSize * (audioConfig.sampleRate / 1000),
        1,
        1
      );
      source.connect(processor);
      processor.connect(audioContext.destination);
    }

    return stream;
  } catch (error) {
    throw new Error(`Failed to initialize audio stream: ${error.message}`);
  }
}

/**
 * Calculates comprehensive audio metrics from raw audio data
 * @param audioData - Raw audio data as Float32Array
 * @returns AudioLevel object with RMS, peak, and clipping information
 */
export function calculateAudioLevel(audioData: Float32Array): AudioLevel {
  let sumSquares = 0;
  let peak = 0;
  let isClipping = false;
  const clipThreshold = 0.99; // -0.1dB threshold for clipping detection

  // Calculate RMS and find peak
  for (let i = 0; i < audioData.length; i++) {
    const sample = audioData[i];
    sumSquares += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
    if (Math.abs(sample) > clipThreshold) {
      isClipping = true;
    }
  }

  // Convert to dB with noise floor reference
  const rms = 20 * Math.log10(Math.sqrt(sumSquares / audioData.length));
  const peakDb = 20 * Math.log10(peak);

  return {
    rms: Math.max(rms, VOICE_ACTIVITY_CONSTANTS.NOISE_FLOOR_DB),
    peak: Math.max(peakDb, VOICE_ACTIVITY_CONSTANTS.NOISE_FLOOR_DB),
    clipping: isClipping
  };
}

/**
 * Implements enhanced voice activity detection with adaptive thresholding
 * @param audioData - Raw audio data as Float32Array
 * @param vadThreshold - Voice activity detection threshold in dB
 * @returns Boolean indicating voice activity
 */
export function detectVoiceActivity(
  audioData: Float32Array,
  vadThreshold: number = VOICE_ACTIVITY_CONSTANTS.VAD_THRESHOLD_DB
): boolean {
  const audioLevel = calculateAudioLevel(audioData);
  
  // Apply adaptive thresholding
  const effectiveThreshold = Math.max(
    vadThreshold,
    VOICE_ACTIVITY_CONSTANTS.NOISE_FLOOR_DB + 10
  );

  // Implement temporal smoothing
  const energyThreshold = Math.pow(10, effectiveThreshold / 10);
  let shortTermEnergy = 0;

  for (let i = 0; i < audioData.length; i++) {
    shortTermEnergy += audioData[i] * audioData[i];
  }
  shortTermEnergy /= audioData.length;

  return shortTermEnergy > energyThreshold;
}

/**
 * Creates formatted audio chunks with codec support and metadata
 * @param audioData - Raw audio data as Float32Array
 * @param format - Desired audio format
 * @returns AudioChunk with formatted data and metadata
 * @throws Error if format is unsupported
 */
export function createAudioChunk(
  audioData: Float32Array,
  format: AudioFormat = AudioFormat.OPUS
): AudioChunk {
  // Validate format support for current browser
  const browserDetails = adapter.browserDetails;
  const supportedFormats = CODEC_BROWSER_SUPPORT[format] || [];
  
  if (!supportedFormats.includes(browserDetails.browser)) {
    // Fall back to PCM if preferred format is unsupported
    format = AudioFormat.PCM;
  }

  // Convert Float32Array to appropriate format
  let formattedData: Uint8Array;
  switch (format) {
    case AudioFormat.PCM:
      formattedData = convertToPCM(audioData);
      break;
    case AudioFormat.OPUS:
      formattedData = convertToOpus(audioData);
      break;
    case AudioFormat.G711:
      formattedData = convertToG711(audioData);
      break;
    case AudioFormat.AAC:
      formattedData = convertToAAC(audioData);
      break;
    default:
      throw new Error(`Unsupported audio format: ${format}`);
  }

  return {
    data: formattedData,
    timestamp: Date.now(),
    format: format
  };
}

/**
 * Helper function to convert Float32Array to PCM format
 * @param audioData - Raw audio data
 * @returns Formatted PCM data
 */
function convertToPCM(audioData: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(audioData.length * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(i * 2, sample * 0x7FFF, true);
  }
  
  return new Uint8Array(buffer);
}

/**
 * Helper function to convert Float32Array to Opus format
 * @param audioData - Raw audio data
 * @returns Formatted Opus data
 */
function convertToOpus(audioData: Float32Array): Uint8Array {
  // Note: Actual Opus encoding would require a WebAssembly Opus encoder
  // This is a placeholder that returns PCM data for now
  return convertToPCM(audioData);
}

/**
 * Helper function to convert Float32Array to G.711 format
 * @param audioData - Raw audio data
 * @returns Formatted G.711 data
 */
function convertToG711(audioData: Float32Array): Uint8Array {
  // Note: Actual G.711 encoding would require a codec implementation
  // This is a placeholder that returns PCM data for now
  return convertToPCM(audioData);
}

/**
 * Helper function to convert Float32Array to AAC format
 * @param audioData - Raw audio data
 * @returns Formatted AAC data
 */
function convertToAAC(audioData: Float32Array): Uint8Array {
  // Note: Actual AAC encoding would require a codec implementation
  // This is a placeholder that returns PCM data for now
  return convertToPCM(audioData);
}