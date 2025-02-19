/**
 * Core service for managing client-side audio processing, WebRTC streams,
 * voice activity detection, and audio visualization.
 * @packageDocumentation
 * @version 1.0.0
 */

// External imports
import adapter from 'webrtc-adapter'; // v8.2.3

// Internal imports
import { AudioConfig, AudioChunk, AudioLevel, AudioFormat } from '../types/audio.types';
import { defaultAudioConfig } from '../config/audio.config';
import { initializeAudioStream } from '../utils/audio.utils';
import { requestUserMedia } from '../utils/webrtc.utils';
import { 
  AUDIO_PROCESSING_CONSTANTS,
  VOICE_ACTIVITY_CONSTANTS,
  VISUALIZER_CONSTANTS
} from '../constants/audio.constants';

/**
 * Events emitted by AudioService
 */
enum AudioServiceEvent {
  INITIALIZED = 'initialized',
  RECORDING_STARTED = 'recordingStarted',
  RECORDING_STOPPED = 'recordingStopped',
  VOICE_DETECTED = 'voiceDetected',
  ERROR = 'error'
}

/**
 * Enhanced service class for managing audio processing with robust error handling
 * and resource management
 */
export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: AudioWorkletNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private config: AudioConfig;
  private isInitialized: boolean = false;
  private isRecording: boolean = false;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private performanceMetrics: {
    startTime: number;
    processedFrames: number;
    averageLatency: number;
    peakLatency: number;
    dropouts: number;
  } = {
    startTime: 0,
    processedFrames: 0,
    averageLatency: 0,
    peakLatency: 0,
    dropouts: 0
  };

  constructor(config: AudioConfig = defaultAudioConfig) {
    this.config = {
      ...defaultAudioConfig,
      ...config
    };
    this.validateConfig();
  }

  /**
   * Initializes audio context and media stream with comprehensive error handling
   */
  public async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Create AudioContext
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      });

      // Request microphone access
      this.mediaStream = await requestUserMedia(this.config);

      // Initialize audio processing pipeline
      await this.setupAudioProcessing();

      this.isInitialized = true;
      this.emit(AudioServiceEvent.INITIALIZED);
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  /**
   * Starts audio recording with enhanced error handling and monitoring
   */
  public async startRecording(): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('AudioService not initialized');
      }

      if (this.isRecording) {
        return;
      }

      await this.audioContext?.resume();
      this.setupAnalyser();
      this.startPerformanceMonitoring();

      this.isRecording = true;
      this.emit(AudioServiceEvent.RECORDING_STARTED);
    } catch (error) {
      this.handleError('Failed to start recording', error);
    }
  }

  /**
   * Stops recording with proper resource cleanup
   */
  public async stopRecording(): Promise<void> {
    try {
      if (!this.isRecording) {
        return;
      }

      await this.audioContext?.suspend();
      this.isRecording = false;
      this.stopPerformanceMonitoring();
      this.emit(AudioServiceEvent.RECORDING_STOPPED);
    } catch (error) {
      this.handleError('Failed to stop recording', error);
    }
  }

  /**
   * Processes audio data with enhanced error handling and monitoring
   */
  public async processAudioChunk(audioData: Float32Array): Promise<AudioChunk> {
    try {
      const startTime = performance.now();
      
      // Perform voice activity detection
      const isVoiceDetected = this.detectVoiceActivity(audioData);
      if (isVoiceDetected) {
        this.emit(AudioServiceEvent.VOICE_DETECTED);
      }

      // Calculate audio levels
      const levels = this.calculateAudioLevels(audioData);
      
      // Create formatted audio chunk
      const chunk = this.createAudioChunk(audioData);
      
      // Update performance metrics
      this.updateProcessingMetrics(performance.now() - startTime);
      
      return chunk;
    } catch (error) {
      this.handleError('Audio processing failed', error);
      throw error;
    }
  }

  /**
   * Comprehensive resource cleanup and state reset
   */
  public async cleanup(): Promise<void> {
    try {
      await this.stopRecording();
      
      this.mediaStream?.getTracks().forEach(track => track.stop());
      this.processorNode?.disconnect();
      this.analyserNode?.disconnect();
      await this.audioContext?.close();
      
      this.resetState();
    } catch (error) {
      this.handleError('Cleanup failed', error);
    }
  }

  /**
   * Event subscription method
   */
  public on(event: AudioServiceEvent, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  /**
   * Returns current performance metrics
   */
  public getMetrics() {
    return { ...this.performanceMetrics };
  }

  private validateConfig(): void {
    const { sampleRate, frameSize, bitDepth } = this.config;
    
    if (sampleRate !== AUDIO_PROCESSING_CONSTANTS.SAMPLE_RATE) {
      console.warn(`Non-standard sample rate: ${sampleRate}Hz`);
    }
    
    if (frameSize !== AUDIO_PROCESSING_CONSTANTS.FRAME_SIZE_MS) {
      console.warn(`Non-standard frame size: ${frameSize}ms`);
    }
    
    if (bitDepth !== AUDIO_PROCESSING_CONSTANTS.BIT_DEPTH) {
      console.warn(`Non-standard bit depth: ${bitDepth}-bit`);
    }
  }

  private async setupAudioProcessing(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('AudioContext or MediaStream not initialized');
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Load and initialize audio worklet
    await this.audioContext.audioWorklet.addModule('audio-processor.js');
    this.processorNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
    
    // Connect nodes
    source.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  private setupAnalyser(): void {
    if (!this.audioContext || !this.processorNode) {
      throw new Error('Audio processing chain not initialized');
    }

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = VISUALIZER_CONSTANTS.FFT_SIZE;
    this.analyserNode.smoothingTimeConstant = VISUALIZER_CONSTANTS.SMOOTHING_TIME_CONSTANT;
    
    this.processorNode.connect(this.analyserNode);
  }

  private detectVoiceActivity(audioData: Float32Array): boolean {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const db = 20 * Math.log10(rms);
    
    return db > VOICE_ACTIVITY_CONSTANTS.VAD_THRESHOLD_DB;
  }

  private calculateAudioLevels(audioData: Float32Array): AudioLevel {
    let sum = 0;
    let peak = 0;
    let isClipping = false;

    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.abs(audioData[i]);
      sum += sample * sample;
      peak = Math.max(peak, sample);
      if (sample >= 1.0) isClipping = true;
    }

    return {
      rms: Math.sqrt(sum / audioData.length),
      peak,
      clipping: isClipping
    };
  }

  private createAudioChunk(audioData: Float32Array): AudioChunk {
    return {
      data: new Uint8Array(audioData.buffer),
      timestamp: Date.now(),
      format: AudioFormat.PCM
    };
  }

  private startPerformanceMonitoring(): void {
    this.performanceMetrics.startTime = performance.now();
    this.performanceMetrics.processedFrames = 0;
    this.performanceMetrics.averageLatency = 0;
    this.performanceMetrics.peakLatency = 0;
    this.performanceMetrics.dropouts = 0;
  }

  private stopPerformanceMonitoring(): void {
    const duration = performance.now() - this.performanceMetrics.startTime;
    console.log('Audio Processing Metrics:', {
      ...this.performanceMetrics,
      duration,
      framesPerSecond: (this.performanceMetrics.processedFrames * 1000) / duration
    });
  }

  private updateProcessingMetrics(latency: number): void {
    this.performanceMetrics.processedFrames++;
    this.performanceMetrics.averageLatency = 
      (this.performanceMetrics.averageLatency * (this.performanceMetrics.processedFrames - 1) + latency) / 
      this.performanceMetrics.processedFrames;
    this.performanceMetrics.peakLatency = Math.max(this.performanceMetrics.peakLatency, latency);
  }

  private emit(event: AudioServiceEvent, data?: any): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.emit(AudioServiceEvent.ERROR, { message, error });
    throw error;
  }

  private resetState(): void {
    this.audioContext = null;
    this.mediaStream = null;
    this.processorNode = null;
    this.analyserNode = null;
    this.isInitialized = false;
    this.isRecording = false;
    this.eventListeners.clear();
  }
}