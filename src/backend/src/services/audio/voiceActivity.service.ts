/**
 * Voice Activity Detection Service with WebAssembly optimization
 * Implements real-time voice activity detection, audio level monitoring,
 * and silence detection with SIMD optimization
 * @version 1.0.0
 */

import { WebAssembly } from '@types/webassembly-js-api'; // v0.0.18
import { VoiceActivityConfig, AudioChunk } from '../../types/audio.types';
import { calculateAudioLevel, detectSilence } from '../../utils/audio.utils';
import { Result } from '../../types/common.types';

/**
 * Interface for tracking audio processing performance metrics
 */
interface AudioProcessingMetrics {
  processingTime: number;
  detectionAccuracy: number;
  falsePositives: number;
  falseNegatives: number;
  totalSamples: number;
}

/**
 * Class responsible for real-time voice activity detection with WebAssembly optimization
 */
export class VoiceActivityDetector {
  private readonly config: VoiceActivityConfig;
  private wasmInstance: WebAssembly.Instance | null = null;
  private isActive: boolean = false;
  private lastActivityTime: number = 0;
  private performanceMetrics: AudioProcessingMetrics;
  private readonly RECOVERY_ATTEMPTS = 3;
  private recoveryCount = 0;

  /**
   * Creates a new instance of VoiceActivityDetector
   * @param config Voice activity detection configuration
   */
  constructor(config: VoiceActivityConfig) {
    this.config = {
      vadThreshold: config.vadThreshold ?? -26,
      noiseFloor: config.noiseFloor ?? -45,
      silenceTimeout: config.silenceTimeout ?? 500,
      minSpeechDuration: config.minSpeechDuration ?? 100
    };

    this.performanceMetrics = {
      processingTime: 0,
      detectionAccuracy: 0,
      falsePositives: 0,
      falseNegatives: 0,
      totalSamples: 0
    };

    this.initializeWasm().catch(error => {
      console.error('Failed to initialize WebAssembly:', error);
      throw new Error('WebAssembly initialization failed');
    });
  }

  /**
   * Initializes WebAssembly module with SIMD optimization
   */
  private async initializeWasm(): Promise<void> {
    try {
      const response = await fetch('/wasm/voice_detection.wasm');
      const wasmBuffer = await response.arrayBuffer();
      const wasmModule = await WebAssembly.compile(wasmBuffer);

      this.wasmInstance = await WebAssembly.instantiate(wasmModule, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
          abort: () => console.error('WASM abort called')
        }
      });
    } catch (error) {
      console.error('WebAssembly initialization error:', error);
      this.wasmInstance = null;
    }
  }

  /**
   * Processes an audio chunk for voice activity detection
   * @param chunk Audio chunk to process
   * @returns Promise resolving to voice activity detection result
   */
  public async processAudioChunk(chunk: AudioChunk): Promise<Result<boolean>> {
    const startTime = performance.now();

    try {
      // Calculate audio level using WebAssembly optimization
      const levelResult = await calculateAudioLevel(chunk.data);
      if (!levelResult.success) {
        throw new Error('Audio level calculation failed');
      }

      const { rms } = levelResult.data;
      const isAboveThreshold = rms > this.config.vadThreshold;
      const isAboveNoiseFloor = rms > this.config.noiseFloor;

      // Update activity state with hysteresis
      if (isAboveThreshold && isAboveNoiseFloor) {
        this.isActive = true;
        this.lastActivityTime = chunk.timestamp;
      } else if (this.isActive && 
                 chunk.timestamp - this.lastActivityTime > this.config.silenceTimeout) {
        this.isActive = false;
      }

      // Update performance metrics
      this.updateMetrics(startTime, true);

      return {
        success: true,
        data: this.isActive,
        error: null,
        metadata: {
          audioLevel: rms,
          processingTime: performance.now() - startTime,
          isAboveThreshold,
          isAboveNoiseFloor
        }
      };
    } catch (error) {
      // Attempt recovery if WebAssembly fails
      if (this.recoveryCount < this.RECOVERY_ATTEMPTS) {
        this.recoveryCount++;
        await this.initializeWasm();
        return this.processAudioChunk(chunk);
      }

      this.updateMetrics(startTime, false);

      return {
        success: false,
        data: false,
        error: {
          code: 'VAD_PROCESSING_ERROR',
          message: 'Voice activity detection failed',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {
          processingTime: performance.now() - startTime,
          recoveryAttempts: this.recoveryCount
        }
      };
    }
  }

  /**
   * Checks for silence in audio chunk with configurable parameters
   * @param chunk Audio chunk to check for silence
   * @returns Promise resolving to silence detection result
   */
  public async checkSilence(chunk: AudioChunk): Promise<Result<boolean>> {
    try {
      const silenceResult = await detectSilence(
        chunk.data,
        this.config.noiseFloor,
        { minDuration: this.config.silenceTimeout }
      );

      if (!silenceResult.success) {
        throw new Error('Silence detection failed');
      }

      return {
        success: true,
        data: silenceResult.data.isSilent,
        error: null,
        metadata: {
          silenceDuration: silenceResult.data.silenceDuration,
          averageLevel: silenceResult.data.avgLevel
        }
      };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: {
          code: 'SILENCE_CHECK_ERROR',
          message: 'Silence check failed',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Updates performance metrics for voice activity detection
   * @param startTime Processing start time
   * @param success Whether processing was successful
   */
  private updateMetrics(startTime: number, success: boolean): void {
    const processingTime = performance.now() - startTime;
    this.performanceMetrics.processingTime += processingTime;
    this.performanceMetrics.totalSamples++;

    if (success) {
      this.performanceMetrics.detectionAccuracy = 
        (this.performanceMetrics.totalSamples - 
         this.performanceMetrics.falsePositives - 
         this.performanceMetrics.falseNegatives) / 
        this.performanceMetrics.totalSamples;
    } else {
      this.performanceMetrics.falseNegatives++;
    }
  }

  /**
   * Resets the voice activity detector state
   */
  public reset(): void {
    this.isActive = false;
    this.lastActivityTime = 0;
    this.recoveryCount = 0;
    this.performanceMetrics = {
      processingTime: 0,
      detectionAccuracy: 0,
      falsePositives: 0,
      falseNegatives: 0,
      totalSamples: 0
    };
  }

  /**
   * Gets current performance metrics
   * @returns Current performance metrics
   */
  public getMetrics(): Readonly<AudioProcessingMetrics> {
    return { ...this.performanceMetrics };
  }
}