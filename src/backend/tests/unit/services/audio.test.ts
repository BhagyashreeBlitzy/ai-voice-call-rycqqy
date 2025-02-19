import { jest } from '@jest/globals';
import { AudioProcessor } from '../../../src/services/audio/audioProcessor.service';
import { SpeechRecognitionService } from '../../../src/services/audio/speechRecognition.service';
import { SpeechSynthesisService } from '../../../src/services/audio/speechSynthesis.service';
import { AudioConfig } from '../../../src/types/audio.types';
import { VoiceActivityDetector } from '../../../src/services/audio/voiceActivity.service';
import { AUDIO_PROCESSING, VOICE_ACTIVITY } from '../../../src/constants/voice.constants';

// Mock WebAssembly for testing
const mockWebAssembly = {
  compile: jest.fn(),
  instantiate: jest.fn(),
  Memory: jest.fn()
};
global.WebAssembly = mockWebAssembly as any;

describe('AudioProcessor Tests', () => {
  let audioProcessor: AudioProcessor;
  let vadDetector: VoiceActivityDetector;
  const testConfig: AudioConfig = {
    sampleRate: AUDIO_PROCESSING.SAMPLE_RATE,
    frameSize: AUDIO_PROCESSING.FRAME_SIZE,
    bitDepth: AUDIO_PROCESSING.BIT_DEPTH,
    channels: AUDIO_PROCESSING.CHANNELS,
    latencyBudget: 500
  };

  beforeEach(() => {
    vadDetector = new VoiceActivityDetector({
      vadThreshold: VOICE_ACTIVITY.VAD_THRESHOLD,
      noiseFloor: VOICE_ACTIVITY.NOISE_FLOOR,
      silenceTimeout: VOICE_ACTIVITY.SILENCE_TIMEOUT,
      minSpeechDuration: VOICE_ACTIVITY.MIN_SPEECH_DURATION
    });
    audioProcessor = new AudioProcessor(testConfig, vadDetector);
  });

  test('should process audio chunks with correct sample rate and frame size', async () => {
    const testChunk = {
      data: new Uint8Array(320), // 20ms at 16kHz
      timestamp: Date.now(),
      format: 'audio/pcm',
      sequence: 1
    };

    const result = await audioProcessor.processAudioChunk(testChunk);
    expect(result.success).toBe(true);
    expect(result.data.data.length).toBe(320);
    expect(result.metadata.processingTime).toBeLessThan(testConfig.latencyBudget);
  });

  test('should detect voice activity with configured threshold', async () => {
    const activeChunk = {
      data: new Uint8Array(320).fill(128), // Simulated voice activity
      timestamp: Date.now(),
      format: 'audio/pcm',
      sequence: 1
    };

    const result = await audioProcessor.processAudioChunk(activeChunk);
    expect(result.success).toBe(true);
    expect(result.metadata.voiceActivity).toBeDefined();
  });

  test('should calculate accurate audio levels', async () => {
    const testChunk = {
      data: new Uint8Array(320).fill(64), // Quarter amplitude
      timestamp: Date.now(),
      format: 'audio/pcm',
      sequence: 1
    };

    const result = await audioProcessor.processAudioChunk(testChunk);
    expect(result.success).toBe(true);
    expect(result.metadata.audioLevel).toBeDefined();
    expect(result.metadata.audioLevel.rms).toBeLessThan(0);
  });

  test('should complete processing within latency budget', async () => {
    const testChunk = {
      data: new Uint8Array(320),
      timestamp: Date.now(),
      format: 'audio/pcm',
      sequence: 1
    };

    const startTime = performance.now();
    await audioProcessor.processAudioChunk(testChunk);
    const processingTime = performance.now() - startTime;
    
    expect(processingTime).toBeLessThan(testConfig.latencyBudget);
  });
});

describe('SpeechRecognitionService Tests', () => {
  let recognitionService: SpeechRecognitionService;
  let audioProcessor: AudioProcessor;

  beforeEach(() => {
    audioProcessor = new AudioProcessor(undefined, new VoiceActivityDetector({
      vadThreshold: VOICE_ACTIVITY.VAD_THRESHOLD,
      noiseFloor: VOICE_ACTIVITY.NOISE_FLOOR,
      silenceTimeout: VOICE_ACTIVITY.SILENCE_TIMEOUT,
      minSpeechDuration: VOICE_ACTIVITY.MIN_SPEECH_DURATION
    }));
    recognitionService = new SpeechRecognitionService(audioProcessor);
  });

  test('should achieve >95% recognition accuracy', async () => {
    const recognitionStream = recognitionService.startRecognition('en-US');
    const metrics = recognitionService.getMetrics();
    
    expect(metrics.accuracy).toBeGreaterThan(0.95);
  });

  test('should complete recognition within 2-second latency', async () => {
    const testChunk = {
      data: new Uint8Array(320),
      timestamp: Date.now(),
      format: 'audio/pcm',
      sequence: 1
    };

    const startTime = performance.now();
    await recognitionService.processAudioChunk(testChunk);
    const processingTime = performance.now() - startTime;

    expect(processingTime).toBeLessThan(2000);
  });

  test('should maintain error rate below 0.1%', async () => {
    const metrics = recognitionService.getMetrics();
    expect(metrics.errorRate).toBeLessThan(0.001);
  });

  test('should recover from recognition errors', async () => {
    // Simulate error condition
    const errorChunk = {
      data: new Uint8Array(0), // Invalid chunk
      timestamp: Date.now(),
      format: 'audio/pcm',
      sequence: 1
    };

    const result = await recognitionService.processAudioChunk(errorChunk);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.metadata.retryCount).toBeGreaterThan(0);
  });
});

describe('SpeechSynthesisService Tests', () => {
  let synthesisService: SpeechSynthesisService;

  beforeEach(() => {
    synthesisService = new SpeechSynthesisService();
  });

  test('should synthesize speech with high quality', async () => {
    const text = 'Hello, world!';
    const options = {
      voiceId: 'en-US-Standard-B',
      rate: 1.0,
      pitch: 0,
      volume: 100,
      languageCode: 'en-US',
      ssmlEnabled: false,
      effectsProfile: []
    };

    const result = await synthesisService.synthesizeSpeech(text, options);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should process SSML markup correctly', async () => {
    const ssml = '<speak>Hello <break time="1s"/> world!</speak>';
    const options = {
      voiceId: 'en-US-Standard-B',
      rate: 1.0,
      pitch: 0,
      volume: 100,
      languageCode: 'en-US',
      ssmlEnabled: true,
      effectsProfile: []
    };

    const result = await synthesisService.synthesizeSSML(ssml, options);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should implement efficient caching', async () => {
    const text = 'Cached speech test';
    const options = {
      voiceId: 'en-US-Standard-B',
      rate: 1.0,
      pitch: 0,
      volume: 100,
      languageCode: 'en-US',
      ssmlEnabled: false,
      effectsProfile: []
    };

    // First synthesis
    const startTime1 = performance.now();
    await synthesisService.synthesizeSpeech(text, options);
    const firstDuration = performance.now() - startTime1;

    // Cached synthesis
    const startTime2 = performance.now();
    await synthesisService.synthesizeSpeech(text, options);
    const secondDuration = performance.now() - startTime2;

    expect(secondDuration).toBeLessThan(firstDuration);
  });

  test('should handle synthesis errors gracefully', async () => {
    const invalidSSML = '<speak>Invalid SSML';
    const options = {
      voiceId: 'en-US-Standard-B',
      rate: 1.0,
      pitch: 0,
      volume: 100,
      languageCode: 'en-US',
      ssmlEnabled: true,
      effectsProfile: []
    };

    await expect(synthesisService.synthesizeSSML(invalidSSML, options))
      .rejects
      .toThrow('Invalid SSML: Missing speak tags');
  });
});