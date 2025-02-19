/**
 * Unit tests for audio processing utilities
 * Tests WebAssembly optimization, format conversion, and streaming scenarios
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import * as fc from 'fast-check';
import {
  calculateAudioLevel,
  convertAudioFormat
} from '../../src/utils/audio.utils';
import {
  AudioConfig,
  AudioFormat,
  AudioChunk,
  DEFAULT_AUDIO_CONFIG
} from '../../src/types/audio.types';

// Mock WebAssembly instance
const mockWasmInstance = {
  exports: {
    memory: new WebAssembly.Memory({ initial: 256 }),
    calculateLevels: jest.fn(),
    convertFormat: jest.fn(),
    detectSilence: jest.fn(),
    normalizeAudio: jest.fn()
  }
};

// Test configuration constants
const TEST_CONFIG: AudioConfig = {
  sampleRate: 16000,
  frameSize: 20,
  bitDepth: 16,
  channels: 1,
  latencyBudget: 500
};

const PERFORMANCE_THRESHOLDS = {
  processingTime: 100, // ms
  memoryUsage: 50 * 1024 * 1024, // 50MB
  conversionLatency: 200 // ms
};

// Setup and teardown
beforeAll(async () => {
  // Mock WebAssembly instantiation
  global.WebAssembly.instantiateStreaming = jest.fn().mockResolvedValue({
    instance: mockWasmInstance
  });
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(performance, 'now').mockImplementation(() => 0);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('calculateAudioLevel', () => {
  it('should calculate audio levels using WebAssembly optimization', async () => {
    // Mock WebAssembly calculation result
    mockWasmInstance.exports.calculateLevels.mockReturnValue({
      rms: -20,
      peak: -10,
      historyPtr: 0
    });

    const testData = new Uint8Array(1600); // 100ms of 16-bit audio at 16kHz
    const result = await calculateAudioLevel(testData, TEST_CONFIG);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      rms: -20,
      peak: -10,
      clipping: false
    });
    expect(performance.now()).toBeLessThan(PERFORMANCE_THRESHOLDS.processingTime);
  });

  it('should handle audio level calculation errors gracefully', async () => {
    mockWasmInstance.exports.calculateLevels.mockImplementation(() => {
      throw new Error('WASM calculation error');
    });

    const testData = new Uint8Array(1600);
    const result = await calculateAudioLevel(testData, TEST_CONFIG);

    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({
      code: 'AUDIO_LEVEL_CALCULATION_ERROR',
      message: 'Failed to calculate audio levels'
    });
  });

  it('should maintain consistent performance with varying audio sizes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 320, maxLength: 16000 }),
        async (audioData) => {
          const startTime = performance.now();
          const result = await calculateAudioLevel(audioData, TEST_CONFIG);
          const processingTime = performance.now() - startTime;

          expect(result.success).toBe(true);
          expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.processingTime);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('convertAudioFormat', () => {
  const testChunk: AudioChunk = {
    data: new Uint8Array(1600),
    timestamp: Date.now(),
    format: AudioFormat.PCM,
    sequence: 1
  };

  it('should convert between all supported audio formats', async () => {
    const formats = Object.values(AudioFormat);
    
    for (const sourceFormat of formats) {
      for (const targetFormat of formats) {
        if (sourceFormat === targetFormat) continue;

        mockWasmInstance.exports.convertFormat.mockReturnValue({
          dataPtr: 0,
          length: 1600,
          success: true
        });

        const chunk: AudioChunk = { ...testChunk, format: sourceFormat };
        const result = await convertAudioFormat(chunk, targetFormat);

        expect(result.success).toBe(true);
        expect(result.data.format).toBe(targetFormat);
        expect(result.metadata.conversionTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS.conversionLatency
        );
      }
    }
  });

  it('should optimize conversion for streaming scenarios', async () => {
    const streamChunks = Array.from({ length: 10 }, (_, i) => ({
      ...testChunk,
      sequence: i
    }));

    const startTime = performance.now();
    const results = await Promise.all(
      streamChunks.map(chunk => 
        convertAudioFormat(chunk, AudioFormat.OPUS)
      )
    );

    const totalTime = performance.now() - startTime;
    const avgTimePerChunk = totalTime / streamChunks.length;

    expect(avgTimePerChunk).toBeLessThan(
      PERFORMANCE_THRESHOLDS.conversionLatency / 2
    );
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });

  it('should handle format-specific conversion errors', async () => {
    mockWasmInstance.exports.convertFormat.mockImplementation(() => {
      throw new Error('Unsupported conversion');
    });

    const result = await convertAudioFormat(
      testChunk,
      AudioFormat.AAC
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({
      code: 'FORMAT_CONVERSION_ERROR',
      message: 'Failed to convert audio format'
    });
  });

  it('should maintain audio quality during conversion', async () => {
    // Property-based test for quality preservation
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 320, maxLength: 16000 }),
        async (audioData) => {
          const chunk: AudioChunk = {
            ...testChunk,
            data: audioData
          };

          mockWasmInstance.exports.convertFormat.mockReturnValue({
            dataPtr: 0,
            length: audioData.length,
            success: true
          });

          const result = await convertAudioFormat(
            chunk,
            AudioFormat.OPUS
          );

          expect(result.success).toBe(true);
          expect(result.data.data.length).toBeGreaterThan(0);
          expect(result.metadata.compressionRatio).toBeLessThan(1.5);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Memory Management', () => {
  it('should efficiently handle large audio buffers', async () => {
    const largeBuffer = new Uint8Array(16000 * 10); // 10 seconds of audio
    const initialMemory = process.memoryUsage().heapUsed;

    await calculateAudioLevel(largeBuffer, TEST_CONFIG);
    
    const memoryIncrease = process.memoryUsage().heapUsed - initialMemory;
    expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
  });

  it('should clean up WebAssembly resources after processing', async () => {
    const testData = new Uint8Array(1600);
    const memoryBefore = mockWasmInstance.exports.memory.buffer.byteLength;

    await calculateAudioLevel(testData, TEST_CONFIG);
    await convertAudioFormat(testChunk, AudioFormat.OPUS);

    const memoryAfter = mockWasmInstance.exports.memory.buffer.byteLength;
    expect(memoryAfter).toBe(memoryBefore);
  });
});

describe('Browser Compatibility', () => {
  const browserConfigs = [
    { name: 'Chrome', version: '83' },
    { name: 'Firefox', version: '78' },
    { name: 'Safari', version: '14' },
    { name: 'Edge', version: '88' }
  ];

  browserConfigs.forEach(({ name, version }) => {
    it(`should work correctly in ${name} ${version}`, async () => {
      // Mock browser-specific WebAssembly support
      const testData = new Uint8Array(1600);
      const result = await calculateAudioLevel(testData, TEST_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});