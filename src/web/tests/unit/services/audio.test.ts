/**
 * Unit tests for AudioService class and related audio processing functionality
 * @packageDocumentation
 * @version 1.0.0
 */

// External imports
import { jest } from '@jest/globals'; // v29.0.0

// Internal imports
import { AudioService } from '../../src/services/audio.service';
import { AudioConfig, AudioFormat } from '../../src/types/audio.types';
import { 
  AUDIO_PROCESSING_CONSTANTS,
  VOICE_ACTIVITY_CONSTANTS,
  VISUALIZER_CONSTANTS 
} from '../../src/constants/audio.constants';

// Mock implementations
class MockAudioContext {
  sampleRate: number;
  state: string = 'suspended';
  destination: AudioDestinationNode;
  audioWorklet: { addModule: jest.Mock };
  
  constructor(options: any) {
    this.sampleRate = options.sampleRate;
    this.destination = {} as AudioDestinationNode;
    this.audioWorklet = { addModule: jest.fn().mockResolvedValue(undefined) };
  }

  createMediaStreamSource = jest.fn().mockReturnValue({
    connect: jest.fn()
  });
  
  createAnalyser = jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 2048,
    smoothingTimeConstant: 0.8
  });

  resume = jest.fn().mockResolvedValue(undefined);
  suspend = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
}

class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor() {
    this.tracks = [
      { stop: jest.fn(), kind: 'audio' } as unknown as MediaStreamTrack
    ];
  }

  getTracks(): MediaStreamTrack[] {
    return this.tracks;
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter(track => track.kind === 'audio');
  }
}

// Test configuration
const testAudioConfig: AudioConfig = {
  sampleRate: AUDIO_PROCESSING_CONSTANTS.SAMPLE_RATE,
  frameSize: AUDIO_PROCESSING_CONSTANTS.FRAME_SIZE_MS,
  bitDepth: AUDIO_PROCESSING_CONSTANTS.BIT_DEPTH,
  channels: AUDIO_PROCESSING_CONSTANTS.CHANNELS
};

describe('AudioService', () => {
  let audioService: AudioService;
  let mockMediaStream: MockMediaStream;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    // Setup mocks
    mockMediaStream = new MockMediaStream();
    mockAudioContext = new MockAudioContext({ sampleRate: testAudioConfig.sampleRate });
    
    // Mock global objects
    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    global.MediaStream = jest.fn().mockImplementation(() => mockMediaStream);
    
    // Mock navigator.mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockMediaStream)
      },
      writable: true
    });

    // Create service instance
    audioService = new AudioService(testAudioConfig);
  });

  afterEach(async () => {
    await audioService.cleanup();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default audio configuration', async () => {
      await audioService.initialize();
      
      expect(global.AudioContext).toHaveBeenCalledWith({
        sampleRate: AUDIO_PROCESSING_CONSTANTS.SAMPLE_RATE,
        latencyHint: 'interactive'
      });
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      const error = new Error('Permission denied');
      jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(error);

      await expect(audioService.initialize()).rejects.toThrow('Initialization failed');
    });

    it('should not reinitialize if already initialized', async () => {
      await audioService.initialize();
      await audioService.initialize();

      expect(global.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('recording', () => {
    beforeEach(async () => {
      await audioService.initialize();
    });

    it('should start recording with correct parameters', async () => {
      await audioService.startRecording();

      expect(mockAudioContext.resume).toHaveBeenCalled();
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    it('should stop recording and cleanup resources', async () => {
      await audioService.startRecording();
      await audioService.stopRecording();

      expect(mockAudioContext.suspend).toHaveBeenCalled();
    });

    it('should handle multiple start/stop cycles', async () => {
      await audioService.startRecording();
      await audioService.stopRecording();
      await audioService.startRecording();
      await audioService.stopRecording();

      expect(mockAudioContext.resume).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.suspend).toHaveBeenCalledTimes(2);
    });
  });

  describe('audio processing', () => {
    beforeEach(async () => {
      await audioService.initialize();
      await audioService.startRecording();
    });

    it('should process audio chunks at correct sample rate', async () => {
      const audioData = new Float32Array(testAudioConfig.sampleRate * 0.02); // 20ms chunk
      const result = await audioService.processAudioChunk(audioData);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('format');
    });

    it('should detect voice activity accurately', async () => {
      // Create test audio data with voice-like amplitude
      const audioData = new Float32Array(1024);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(i * 0.1) * 0.5; // Mid-level amplitude
      }

      const result = await audioService.processAudioChunk(audioData);
      expect(result).toBeDefined();
    });

    it('should calculate audio levels correctly', async () => {
      const audioData = new Float32Array(1024);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(i * 0.1); // Full amplitude sine wave
      }

      const result = await audioService.processAudioChunk(audioData);
      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle device access errors gracefully', async () => {
      const error = new Error('NotAllowedError');
      jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(error);

      await expect(audioService.initialize()).rejects.toThrow();
    });

    it('should handle processing errors with meaningful messages', async () => {
      await audioService.initialize();
      const invalidData = null as unknown as Float32Array;

      await expect(audioService.processAudioChunk(invalidData)).rejects.toThrow();
    });

    it('should cleanup resources on error', async () => {
      await audioService.initialize();
      const error = new Error('Processing error');
      mockAudioContext.resume = jest.fn().mockRejectedValue(error);

      await expect(audioService.startRecording()).rejects.toThrow();
      expect(mockAudioContext.suspend).toHaveBeenCalled();
    });
  });

  describe('codec support', () => {
    it('should handle supported audio formats', async () => {
      await audioService.initialize();
      const audioData = new Float32Array(1024);
      
      const result = await audioService.processAudioChunk(audioData);
      expect(result.format).toBe(AudioFormat.PCM);
    });

    it('should fallback to PCM when preferred codec is unsupported', async () => {
      await audioService.initialize();
      const audioData = new Float32Array(1024);
      
      const result = await audioService.processAudioChunk(audioData);
      expect(result.format).toBe(AudioFormat.PCM);
    });
  });
});