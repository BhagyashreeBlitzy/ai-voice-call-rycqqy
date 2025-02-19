/**
 * React hook for managing voice activity detection and audio level monitoring
 * Provides real-time voice detection state and audio level measurements
 * @packageDocumentation
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import type { VoiceActivityConfig, AudioLevel } from '../types/audio.types';
import type { AudioService } from '../services/audio.service';

// Polling interval for voice activity detection (ms)
const POLLING_INTERVAL = 50;

// Maximum number of retries for error recovery
const MAX_RETRIES = 3;

interface VoiceActivityState {
  isVoiceDetected: boolean;
  audioLevel: AudioLevel;
  isProcessing: boolean;
  error: Error | null;
}

/**
 * Custom hook for managing voice activity detection and audio levels
 * @param audioService - Initialized AudioService instance
 * @param config - Voice activity detection configuration
 * @returns Voice activity state and audio level information
 */
export function useVoiceActivity(
  audioService: AudioService,
  config: VoiceActivityConfig
): VoiceActivityState {
  // Initialize state with default values
  const [state, setState] = useState<VoiceActivityState>({
    isVoiceDetected: false,
    audioLevel: {
      rms: config.noiseFloor,
      peak: config.noiseFloor,
      clipping: false
    },
    isProcessing: false,
    error: null
  });

  // Validate configuration parameters
  useEffect(() => {
    if (config.vadThreshold > -20 || config.vadThreshold < -60) {
      console.warn(`VAD threshold ${config.vadThreshold}dB outside recommended range (-60dB to -20dB)`);
    }
    if (config.noiseFloor > -40 || config.noiseFloor < -90) {
      console.warn(`Noise floor ${config.noiseFloor}dB outside recommended range (-90dB to -40dB)`);
    }
  }, [config]);

  // Memoized polling callback for performance
  const pollVoiceActivity = useCallback(async () => {
    if (!audioService || state.error) return;

    try {
      setState(prevState => ({ ...prevState, isProcessing: true }));

      // Get current audio measurements
      const audioLevel = await audioService.getAudioLevel();
      const isVoiceDetected = audioLevel.rms > config.vadThreshold;

      setState(prevState => ({
        ...prevState,
        isVoiceDetected,
        audioLevel,
        isProcessing: false,
        error: null
      }));
    } catch (error) {
      console.error('Voice activity detection error:', error);
      setState(prevState => ({
        ...prevState,
        isProcessing: false,
        error: error as Error
      }));
    }
  }, [audioService, config.vadThreshold, state.error]);

  // Set up polling interval and cleanup
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let retryCount = 0;

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          await pollVoiceActivity();
          retryCount = 0; // Reset retry count on successful poll
        } catch (error) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            clearInterval(pollInterval);
            setState(prevState => ({
              ...prevState,
              error: new Error('Max retry attempts exceeded')
            }));
          }
        }
      }, POLLING_INTERVAL);
    };

    // Start polling if service is available
    if (audioService) {
      startPolling();

      // Set up error handler
      const handleError = (error: Error) => {
        setState(prevState => ({
          ...prevState,
          error,
          isProcessing: false
        }));
      };

      audioService.onError(handleError);

      // Cleanup function
      return () => {
        clearInterval(pollInterval);
        audioService.removeErrorListener(handleError);
      };
    }
  }, [audioService, pollVoiceActivity]);

  // Handle browser visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setState(prevState => ({
          ...prevState,
          isProcessing: false
        }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return state;
}