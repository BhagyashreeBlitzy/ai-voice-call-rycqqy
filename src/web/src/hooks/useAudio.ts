/**
 * React hook for managing audio recording, voice activity detection,
 * and real-time audio processing in the web client.
 * @packageDocumentation
 * @version 1.0.0
 */

// External imports - React v18.2.0
import { useState, useEffect, useCallback } from 'react';

// Internal imports
import { AudioService } from '../services/audio.service';
import { AudioConfig } from '../types/audio.types';
import { defaultAudioConfig } from '../config/audio.config';

/**
 * Interface for hook return values
 */
interface UseAudioReturn {
  isInitialized: boolean;
  isRecording: boolean;
  isPaused: boolean;
  audioLevel: {
    rms: number;
    peak: number;
    clipping: boolean;
  };
  isVoiceDetected: boolean;
  error: Error | null;
  performance: {
    averageLatency: number;
    peakLatency: number;
    dropouts: number;
  };
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
}

/**
 * Custom hook for managing audio recording and processing
 * @param config - Optional audio configuration parameters
 * @returns Audio control interface and state
 */
export function useAudio(config?: Partial<AudioConfig>): UseAudioReturn {
  // Initialize state
  const [audioService] = useState(() => new AudioService({
    ...defaultAudioConfig,
    ...config
  }));
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState({ rms: -Infinity, peak: -Infinity, clipping: false });
  const [isVoiceDetected, setIsVoiceDetected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [performance, setPerformance] = useState({
    averageLatency: 0,
    peakLatency: 0,
    dropouts: 0
  });

  /**
   * Initialize audio service on mount
   */
  useEffect(() => {
    let mounted = true;

    const initializeAudio = async () => {
      try {
        await audioService.initialize();
        if (mounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize audio'));
          setIsInitialized(false);
        }
      }
    };

    initializeAudio();

    // Set up event listeners
    audioService.on('voiceDetected', () => {
      if (mounted) setIsVoiceDetected(true);
    });

    audioService.on('error', (err: Error) => {
      if (mounted) setError(err);
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
      audioService.cleanup().catch(console.error);
    };
  }, [audioService]);

  /**
   * Start recording with error handling
   */
  const startRecording = useCallback(async () => {
    try {
      if (!isInitialized) {
        throw new Error('Audio service not initialized');
      }
      await audioService.startRecording();
      setIsRecording(true);
      setIsPaused(false);
      setError(null);

      // Start monitoring audio levels
      const levelMonitorId = setInterval(() => {
        const level = audioService.getAudioLevel();
        setAudioLevel(level);
        setIsVoiceDetected(audioService.isVoiceDetected());
        
        // Update performance metrics
        const metrics = audioService.getMetrics();
        setPerformance({
          averageLatency: metrics.averageLatency,
          peakLatency: metrics.peakLatency,
          dropouts: metrics.dropouts
        });
      }, 50); // 20Hz update rate

      return () => clearInterval(levelMonitorId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start recording'));
      setIsRecording(false);
      throw err;
    }
  }, [audioService, isInitialized]);

  /**
   * Stop recording with cleanup
   */
  const stopRecording = useCallback(async () => {
    try {
      await audioService.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      setIsVoiceDetected(false);
      setAudioLevel({ rms: -Infinity, peak: -Infinity, clipping: false });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to stop recording'));
      throw err;
    }
  }, [audioService]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(async () => {
    try {
      if (!isRecording) return;
      await audioService.pauseRecording();
      setIsPaused(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to pause recording'));
      throw err;
    }
  }, [audioService, isRecording]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(async () => {
    try {
      if (!isRecording || !isPaused) return;
      await audioService.resumeRecording();
      setIsPaused(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to resume recording'));
      throw err;
    }
  }, [audioService, isRecording, isPaused]);

  return {
    isInitialized,
    isRecording,
    isPaused,
    audioLevel,
    isVoiceDetected,
    error,
    performance,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  };
}