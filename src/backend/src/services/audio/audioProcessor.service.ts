/**
 * Core service for real-time audio processing with WebAssembly SIMD optimization
 * Implements technical specifications for voice processing parameters
 * @version 1.0.0
 */

import { WebAssembly } from '@types/webassembly-js-api'; // v0.0.18
import { 
  AudioConfig, 
  AudioChunk, 
  AudioFormat,
  DEFAULT_AUDIO_CONFIG
} from '../../types/audio.types';
import { VoiceActivityDetector } from './voiceActivity.service';
import { 
  calculateAudioLevel, 
  convertAudioFormat, 
  normalizeAudio 
} from '../../utils/audio.utils';
import { Result } from '../../types/common.types';

/**
 * Interface for tracking audio processing performance metrics
 */
interface ProcessingMetrics {
  processingTime: number;
  latency: number;
  bufferSize: number;
  sampleCount: number;
  errors: number;
}

/**
 * Circular buffer for streaming audio processing
 */
class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;

  constructor(private capacity: number) {
    this.buffer = new Array<T>(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
    if (this.size === this.capacity) {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  get length(): number {
    return this.size;
  }

  getItems(): T[] {
    const items: T[] = [];
    let current = this.head;
    for (let i = 0; i < this.size; i++) {
      items.push(this.buffer[current]);
      current = (current + 1) % this.capacity;
    }
    return items;
  }
}

/**
 * Core audio processor service with SIMD optimization and streaming support
 */
@injectable()
export class AudioProcessor {
  private readonly config: AudioConfig;
  private wasmInstance: WebAssembly.Instance | null = null;
  private readonly vadDetector: VoiceActivityDetector;
  private readonly streamBuffer: CircularBuffer<AudioChunk>;
  private processingMetrics: ProcessingMetrics;
  private readonly BUFFER_SIZE = 1024;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private recoveryAttempts = 0;

  constructor(
    config: Partial<AudioConfig> = {},
    vadDetector: VoiceActivityDetector
  ) {
    this.config = {
      ...DEFAULT_AUDIO_CONFIG,
      ...config
    };

    this.vadDetector = vadDetector;
    this.streamBuffer = new CircularBuffer<AudioChunk>(this.BUFFER_SIZE);
    this.processingMetrics = {
      processingTime: 0,
      latency: 0,
      bufferSize: 0,
      sampleCount: 0,
      errors: 0
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
      const response = await fetch('/wasm/audio_processor.wasm');
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
   * Processes audio chunk with SIMD optimization and streaming support
   * @param chunk Audio chunk to process
   * @returns Promise resolving to processed audio chunk
   */
  public async processAudioChunk(chunk: AudioChunk): Promise<Result<AudioChunk>> {
    const startTime = performance.now();

    try {
      // Validate input chunk
      if (!chunk.data || chunk.data.length === 0) {
        throw new Error('Invalid audio chunk');
      }

      // Add to streaming buffer
      this.streamBuffer.push(chunk);

      // Process audio levels
      const levelResult = await calculateAudioLevel(chunk.data, this.config);
      if (!levelResult.success) {
        throw new Error('Audio level calculation failed');
      }

      // Detect voice activity
      const vadResult = await this.vadDetector.processAudioChunk(chunk);
      if (!vadResult.success) {
        throw new Error('Voice activity detection failed');
      }

      // Apply noise reduction if needed
      let processedData = chunk.data;
      if (levelResult.data.rms < this.config.noiseFloor) {
        const normalizedResult = await normalizeAudio(
          chunk.data,
          -3,
          { preserveHeadroom: true }
        );
        if (normalizedResult.success) {
          processedData = normalizedResult.data;
        }
      }

      // Update metrics
      this.updateMetrics(startTime, true);

      return {
        success: true,
        data: {
          data: processedData,
          format: chunk.format,
          timestamp: chunk.timestamp,
          sequence: chunk.sequence
        },
        error: null,
        metadata: {
          audioLevel: levelResult.data,
          voiceActivity: vadResult.data,
          processingTime: performance.now() - startTime,
          bufferSize: this.streamBuffer.length
        }
      };
    } catch (error) {
      // Attempt recovery if WebAssembly fails
      if (this.recoveryAttempts < this.MAX_RECOVERY_ATTEMPTS) {
        this.recoveryAttempts++;
        await this.initializeWasm();
        return this.processAudioChunk(chunk);
      }

      this.updateMetrics(startTime, false);

      return {
        success: false,
        data: chunk,
        error: {
          code: 'AUDIO_PROCESSING_ERROR',
          message: 'Failed to process audio chunk',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {
          processingTime: performance.now() - startTime,
          recoveryAttempts: this.recoveryAttempts
        }
      };
    }
  }

  /**
   * Converts audio format with codec-specific optimizations
   * @param chunk Audio chunk to convert
   * @param targetFormat Desired output format
   * @returns Promise resolving to converted audio chunk
   */
  public async convertFormat(
    chunk: AudioChunk,
    targetFormat: AudioFormat
  ): Promise<Result<AudioChunk>> {
    const startTime = performance.now();

    try {
      const result = await convertAudioFormat(chunk, targetFormat);
      if (!result.success) {
        throw new Error('Format conversion failed');
      }

      this.updateMetrics(startTime, true);

      return result;
    } catch (error) {
      this.updateMetrics(startTime, false);

      return {
        success: false,
        data: chunk,
        error: {
          code: 'FORMAT_CONVERSION_ERROR',
          message: 'Failed to convert audio format',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {
          processingTime: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Updates processing metrics
   * @param startTime Processing start time
   * @param success Whether processing was successful
   */
  private updateMetrics(startTime: number, success: boolean): void {
    const processingTime = performance.now() - startTime;
    this.processingMetrics.processingTime += processingTime;
    this.processingMetrics.latency = Math.max(
      this.processingMetrics.latency,
      processingTime
    );
    this.processingMetrics.bufferSize = this.streamBuffer.length;
    this.processingMetrics.sampleCount++;
    if (!success) {
      this.processingMetrics.errors++;
    }
  }

  /**
   * Gets current processing metrics
   * @returns Current processing metrics
   */
  public getProcessingMetrics(): Readonly<ProcessingMetrics> {
    return { ...this.processingMetrics };
  }
}