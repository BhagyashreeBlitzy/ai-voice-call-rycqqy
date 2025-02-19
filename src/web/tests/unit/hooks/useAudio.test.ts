/**
 * Unit tests for useAudio hook
 * Tests voice processing, audio recording, and performance monitoring
 * @packageDocumentation
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { jest } from '@jest/globals';
import { useAudio } from '../../src/hooks/useAudio';
import { AudioService } from '../../src/services/audio.service';
import { defaultAudioConfig } from '../../src/config/audio.config';
import { AUDIO_PROCESSING_CONSTANTS, VOICE_ACTIVITY_CONSTANTS } from '../../src/constants/audio.constants';

// Mock AudioService
jest.mock('../../src/services/audio.service');

describe('useAudio Hook', () => {
  // Mock implementations
  let mockAudioService: jest.Mocked<AudioService>;
  let mockMediaStream: MediaStream;
  let mockAudioContext: AudioContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock MediaStream API
    mockMediaStream = {
      getTracks: jest.fn().mockReturnValue([{
        stop: jest.fn(),
        getSettings: jest.fn().mockReturnValue({
          sampleRate: AUDIO_PROCESSING_CONSTANTS.SAMPLE_RATE
        })
      }])
    } as unknown as MediaStream;

    // Mock AudioContext
    mockAudioContext = {
      createMediaStreamSource: jest.fn(),
      createAnalyser: jest.fn(),
      close: jest.fn(),
      resume: jest.fn(),
      suspend: jest.fn()
    } as unknown as AudioContext;

    // Setup AudioService mock
    mockAudioService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue(undefined),
      pauseRecording: jest.fn().mockResolvedValue(undefined),
      resumeRecording: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      getAudioLevel: jest.fn().mockReturnValue({
        rms: -30,
        peak: -20,
        clipping: false
      }),
      isVoiceDetected: jest.fn().mockReturnValue(false),
      getMetrics: jest.fn().mockReturnValue({
        averageLatency: 15,
        peakLatency: 30,
        dropouts: 0
      }),
      on: jest.fn()
    } as unknown as jest.Mocked<AudioService>;

    // Mock AudioService constructor
    (AudioService as jest.Mock).mockImplementation(() => mockAudioService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with correct audio parameters', async () => {
    const customConfig = {
      sampleRate: 16000,
      frameSize: 20,
      bitDepth: 16,
      channels: 1
    };

    const { result, waitForNextUpdate } = renderHook(() => useAudio(customConfig));

    // Wait for initialization
    await waitForNextUpdate();

    expect(AudioService).toHaveBeenCalledWith({
      ...defaultAudioConfig,
      ...customConfig
    });
    expect(mockAudioService.initialize).toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle recording state transitions correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudio());
    await waitForNextUpdate();

    // Start recording
    await act(async () => {
      await result.current.startRecording();
    });

    expect(mockAudioService.startRecording).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
    expect(result.current.isPaused).toBe(false);

    // Pause recording
    await act(async () => {
      await result.current.pauseRecording();
    });

    expect(mockAudioService.pauseRecording).toHaveBeenCalled();
    expect(result.current.isPaused).toBe(true);

    // Resume recording
    await act(async () => {
      await result.current.resumeRecording();
    });

    expect(mockAudioService.resumeRecording).toHaveBeenCalled();
    expect(result.current.isPaused).toBe(false);

    // Stop recording
    await act(async () => {
      await result.current.stopRecording();
    });

    expect(mockAudioService.stopRecording).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
  });

  it('should detect voice activity accurately', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudio());
    await waitForNextUpdate();

    // Start recording
    await act(async () => {
      await result.current.startRecording();
    });

    // Simulate no voice activity
    mockAudioService.isVoiceDetected.mockReturnValue(false);
    mockAudioService.getAudioLevel.mockReturnValue({
      rms: VOICE_ACTIVITY_CONSTANTS.NOISE_FLOOR_DB,
      peak: VOICE_ACTIVITY_CONSTANTS.NOISE_FLOOR_DB,
      clipping: false
    });

    // Wait for next update cycle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isVoiceDetected).toBe(false);

    // Simulate voice activity
    mockAudioService.isVoiceDetected.mockReturnValue(true);
    mockAudioService.getAudioLevel.mockReturnValue({
      rms: VOICE_ACTIVITY_CONSTANTS.VAD_THRESHOLD_DB + 10,
      peak: VOICE_ACTIVITY_CONSTANTS.VAD_THRESHOLD_DB + 15,
      clipping: false
    });

    // Wait for next update cycle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isVoiceDetected).toBe(true);
  });

  it('should monitor performance metrics', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudio());
    await waitForNextUpdate();

    await act(async () => {
      await result.current.startRecording();
    });

    // Simulate performance metrics
    mockAudioService.getMetrics.mockReturnValue({
      averageLatency: 15,
      peakLatency: 30,
      dropouts: 0
    });

    // Wait for metrics update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.performance).toEqual({
      averageLatency: 15,
      peakLatency: 30,
      dropouts: 0
    });
  });

  it('should handle errors gracefully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudio());
    await waitForNextUpdate();

    // Simulate initialization error
    const error = new Error('Failed to access microphone');
    mockAudioService.initialize.mockRejectedValueOnce(error);

    const { result: errorResult, waitForNextUpdate: waitForError } = renderHook(() => useAudio());
    await waitForError();

    expect(errorResult.current.error).toBeTruthy();
    expect(errorResult.current.isInitialized).toBe(false);

    // Simulate recording error
    mockAudioService.startRecording.mockRejectedValueOnce(new Error('Recording failed'));

    await act(async () => {
      try {
        await result.current.startRecording();
      } catch (e) {
        expect(e).toBeTruthy();
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isRecording).toBe(false);
  });

  it('should clean up resources on unmount', async () => {
    const { result, waitForNextUpdate, unmount } = renderHook(() => useAudio());
    await waitForNextUpdate();

    // Start recording
    await act(async () => {
      await result.current.startRecording();
    });

    // Unmount component
    unmount();

    expect(mockAudioService.cleanup).toHaveBeenCalled();
  });

  it('should handle audio level monitoring', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudio());
    await waitForNextUpdate();

    await act(async () => {
      await result.current.startRecording();
    });

    // Simulate different audio levels
    mockAudioService.getAudioLevel.mockReturnValue({
      rms: -20,
      peak: -10,
      clipping: true
    });

    // Wait for level update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.audioLevel).toEqual({
      rms: -20,
      peak: -10,
      clipping: true
    });
  });
});