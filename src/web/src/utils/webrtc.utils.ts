/**
 * WebRTC and Audio Processing Utilities
 * Provides core functionality for voice-based interaction features
 * @packageDocumentation
 * @version 1.0.0
 */

import type { AudioConfig, AudioStreamConfig } from '../types/audio.types';

// Browser compatibility constants
const REQUIRED_SAMPLE_RATE = 16000;
const DEFAULT_FRAME_SIZE = 20;
const DEFAULT_BIT_DEPTH = 16;

/**
 * Error types for WebRTC operations
 */
enum WebRTCError {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED'
}

/**
 * Requests access to user's microphone with enhanced error handling
 * @param config - Audio configuration parameters
 * @returns Promise resolving to configured MediaStream
 * @throws {Error} If permission denied or device not available
 */
export async function requestUserMedia(config: AudioConfig): Promise<MediaStream> {
  try {
    // Validate configuration
    const constraints: MediaStreamConstraints = {
      audio: {
        sampleRate: config.sampleRate || REQUIRED_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: config.autoGainControl ?? true
      },
      video: false
    };

    // Check for available devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudioDevice = devices.some(device => device.kind === 'audioinput');
    
    if (!hasAudioDevice) {
      throw new Error(WebRTCError.DEVICE_NOT_FOUND);
    }

    // Request media stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Verify stream properties
    const track = stream.getAudioTracks()[0];
    const settings = track.getSettings();
    
    if (settings.sampleRate !== config.sampleRate) {
      console.warn(`Requested sample rate ${config.sampleRate}Hz, but got ${settings.sampleRate}Hz`);
    }

    return stream;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        throw new Error(WebRTCError.PERMISSION_DENIED);
      }
      if (error.name === 'NotFoundError') {
        throw new Error(WebRTCError.DEVICE_NOT_FOUND);
      }
    }
    throw error;
  }
}

/**
 * Creates and configures an AudioContext with enhanced processing capabilities
 * @param config - Audio configuration parameters
 * @returns Configured AudioContext
 */
export function createAudioContext(config: AudioConfig): AudioContext {
  const context = new AudioContext({
    sampleRate: config.sampleRate || REQUIRED_SAMPLE_RATE,
    latencyHint: 'interactive'
  });

  // Suspend context by default to save resources
  context.suspend();

  return context;
}

/**
 * Sets up a WebRTC media stream with advanced audio processing pipeline
 * @param stream - MediaStream from getUserMedia
 * @param context - Configured AudioContext
 * @returns Promise resolving to complete stream configuration
 */
export async function setupMediaStream(
  stream: MediaStream,
  context: AudioContext
): Promise<AudioStreamConfig> {
  // Create source node
  const source = context.createMediaStreamSource(stream);

  // Create analyzer node for monitoring levels
  const analyzer = context.createAnalyser();
  analyzer.fftSize = 2048;
  analyzer.smoothingTimeConstant = 0.8;

  // Create gain node for volume control
  const gainNode = context.createGain();
  gainNode.gain.value = 1.0;

  // Connect nodes
  source.connect(analyzer);
  analyzer.connect(gainNode);
  gainNode.connect(context.destination);

  return {
    mediaStream: stream,
    audioContext: context,
    audioNodes: [source, analyzer, gainNode],
    processingConfig: {
      fftSize: analyzer.fftSize,
      smoothingTimeConstant: analyzer.smoothingTimeConstant
    }
  };
}

/**
 * Checks browser compatibility for WebRTC and audio processing features
 * @returns Object containing detailed browser capability information
 */
export function checkBrowserSupport(): {
  webrtc: boolean;
  audioContext: boolean;
  mediaDevices: boolean;
  audioWorklet: boolean;
  requiredCodecs: boolean;
} {
  const support = {
    webrtc: 'RTCPeerConnection' in window,
    audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    mediaDevices: 'mediaDevices' in navigator,
    audioWorklet: 'AudioWorklet' in window,
    requiredCodecs: false
  };

  // Check codec support
  if ('MediaRecorder' in window) {
    const codecs = [
      'audio/opus',
      'audio/pcm',
      'audio/aac'
    ];
    support.requiredCodecs = codecs.some(codec => 
      MediaRecorder.isTypeSupported(codec)
    );
  }

  return support;
}

/**
 * Safely cleans up media streams and audio resources
 * @param streamConfig - Stream configuration to cleanup
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupMediaStream(streamConfig: AudioStreamConfig): Promise<void> {
  try {
    // Stop all tracks
    streamConfig.mediaStream.getTracks().forEach(track => {
      track.stop();
    });

    // Disconnect all nodes
    if (streamConfig.audioNodes) {
      streamConfig.audioNodes.forEach(node => {
        node.disconnect();
      });
    }

    // Close audio context
    if (streamConfig.audioContext.state !== 'closed') {
      await streamConfig.audioContext.close();
    }

    // Clear processor if exists
    if (streamConfig.processor) {
      streamConfig.processor.disconnect();
    }
  } catch (error) {
    console.error('Error during stream cleanup:', error);
    throw error;
  }
}

// Export error types for external use
export { WebRTCError };