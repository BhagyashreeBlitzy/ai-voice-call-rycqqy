/**
 * Core utility functions for audio processing with WebAssembly optimization
 * Implements technical specifications for voice processing parameters
 * @version 1.0.0
 */

import { WebAssembly } from '@types/webassembly-js-api'; // v0.0.18
import {
  AudioConfig,
  AudioFormat,
  AudioChunk,
  AudioLevel,
  DEFAULT_AUDIO_CONFIG
} from '../types/audio.types';
import { Result } from '../types/common.types';

// WebAssembly module instance for optimized audio processing
let wasmInstance: WebAssembly.Instance | null = null;

/**
 * Initializes WebAssembly module for audio processing
 * Loads and instantiates the WASM module with SIMD optimization
 */
async function initializeWasmModule(): Promise<void> {
  if (wasmInstance) return;
  
  try {
    const response = await fetch('/wasm/audio_processing.wasm');
    const wasmBuffer = await response.arrayBuffer();
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    wasmInstance = await WebAssembly.instantiate(wasmModule, {
      env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
        abort: () => console.error('WASM abort called')
      }
    });
  } catch (error) {
    console.error('Failed to initialize WebAssembly module:', error);
    throw new Error('WebAssembly initialization failed');
  }
}

/**
 * Calculates RMS and peak levels from audio data using WebAssembly optimization
 * @param audioData Raw audio data buffer
 * @param config Audio configuration parameters
 * @returns Result containing audio level measurements
 */
export async function calculateAudioLevel(
  audioData: Uint8Array,
  config: AudioConfig = DEFAULT_AUDIO_CONFIG
): Promise<Result<AudioLevel>> {
  try {
    await initializeWasmModule();
    
    if (!wasmInstance) {
      throw new Error('WebAssembly module not initialized');
    }

    const { memory, calculateLevels } = wasmInstance.exports as any;
    const dataPtr = (memory as WebAssembly.Memory).buffer.byteLength;
    
    // Copy audio data to WebAssembly memory
    new Uint8Array(memory.buffer, dataPtr, audioData.length).set(audioData);
    
    // Calculate levels using SIMD-optimized WebAssembly function
    const result = calculateLevels(dataPtr, audioData.length, config.bitDepth);
    
    return {
      success: true,
      data: {
        rms: result.rms,
        peak: result.peak,
        clipping: result.peak >= 0,
        history: Array.from(new Float32Array(memory.buffer, result.historyPtr, 10))
      },
      error: null,
      metadata: {
        processingTime: performance.now(),
        sampleCount: audioData.length / (config.bitDepth / 8)
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null as any,
      error: {
        code: 'AUDIO_LEVEL_CALCULATION_ERROR',
        message: 'Failed to calculate audio levels',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}

/**
 * Converts audio data between supported formats with WebAssembly optimization
 * @param chunk Audio chunk to convert
 * @param targetFormat Desired output format
 * @param options Conversion options
 * @returns Result containing converted audio chunk
 */
export async function convertAudioFormat(
  chunk: AudioChunk,
  targetFormat: AudioFormat,
  options: Record<string, unknown> = {}
): Promise<Result<AudioChunk>> {
  try {
    await initializeWasmModule();
    
    if (!wasmInstance) {
      throw new Error('WebAssembly module not initialized');
    }

    const { memory, convertFormat } = wasmInstance.exports as any;
    const dataPtr = (memory as WebAssembly.Memory).buffer.byteLength;
    
    // Copy input data to WebAssembly memory
    new Uint8Array(memory.buffer, dataPtr, chunk.data.length).set(chunk.data);
    
    // Perform format conversion using WebAssembly
    const result = convertFormat(
      dataPtr,
      chunk.data.length,
      chunk.format,
      targetFormat,
      JSON.stringify(options)
    );
    
    const convertedData = new Uint8Array(
      memory.buffer,
      result.dataPtr,
      result.length
    );
    
    return {
      success: true,
      data: {
        data: convertedData,
        format: targetFormat,
        timestamp: chunk.timestamp,
        sequence: chunk.sequence
      },
      error: null,
      metadata: {
        conversionTime: performance.now(),
        originalFormat: chunk.format,
        compressionRatio: result.length / chunk.data.length
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null as any,
      error: {
        code: 'FORMAT_CONVERSION_ERROR',
        message: 'Failed to convert audio format',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}

/**
 * Detects silence in audio data using WebAssembly optimization
 * @param audioData Raw audio data buffer
 * @param threshold Silence threshold in dB
 * @param options Additional silence detection options
 * @returns Result containing silence detection information
 */
export async function detectSilence(
  audioData: Uint8Array,
  threshold: number = -45,
  options: Record<string, unknown> = {}
): Promise<Result<Record<string, unknown>>> {
  try {
    await initializeWasmModule();
    
    if (!wasmInstance) {
      throw new Error('WebAssembly module not initialized');
    }

    const { memory, detectSilence } = wasmInstance.exports as any;
    const dataPtr = (memory as WebAssembly.Memory).buffer.byteLength;
    
    // Copy audio data to WebAssembly memory
    new Uint8Array(memory.buffer, dataPtr, audioData.length).set(audioData);
    
    // Perform silence detection using WebAssembly
    const result = detectSilence(dataPtr, audioData.length, threshold);
    
    return {
      success: true,
      data: {
        isSilent: result.isSilent,
        silenceDuration: result.duration,
        avgLevel: result.averageLevel,
        segments: Array.from(new Float32Array(memory.buffer, result.segmentsPtr, result.segmentCount))
      },
      error: null,
      metadata: {
        processingTime: performance.now(),
        threshold
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null as any,
      error: {
        code: 'SILENCE_DETECTION_ERROR',
        message: 'Failed to detect silence',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}

/**
 * Normalizes audio data to target peak level using WebAssembly optimization
 * @param audioData Raw audio data buffer
 * @param targetPeakDb Target peak level in dB
 * @param options Normalization options
 * @returns Result containing normalized audio data
 */
export async function normalizeAudio(
  audioData: Uint8Array,
  targetPeakDb: number = -3,
  options: Record<string, unknown> = {}
): Promise<Result<Uint8Array>> {
  try {
    await initializeWasmModule();
    
    if (!wasmInstance) {
      throw new Error('WebAssembly module not initialized');
    }

    const { memory, normalizeAudio } = wasmInstance.exports as any;
    const dataPtr = (memory as WebAssembly.Memory).buffer.byteLength;
    
    // Copy audio data to WebAssembly memory
    new Uint8Array(memory.buffer, dataPtr, audioData.length).set(audioData);
    
    // Perform normalization using WebAssembly
    const result = normalizeAudio(dataPtr, audioData.length, targetPeakDb);
    
    const normalizedData = new Uint8Array(
      memory.buffer,
      result.dataPtr,
      audioData.length
    );
    
    return {
      success: true,
      data: normalizedData,
      error: null,
      metadata: {
        processingTime: performance.now(),
        gainApplied: result.gainFactor,
        peakLevel: result.resultingPeak
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null as any,
      error: {
        code: 'NORMALIZATION_ERROR',
        message: 'Failed to normalize audio',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}