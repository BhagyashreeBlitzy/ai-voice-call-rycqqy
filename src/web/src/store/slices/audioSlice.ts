/**
 * Redux Toolkit slice for managing audio state in the web application
 * Handles microphone status, audio levels, voice activity detection, and recording state
 * @packageDocumentation
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { AudioConfig, AudioLevel } from '../../types/audio.types';
import { defaultAudioConfig } from '../../config/audio.config';
import { VOICE_ACTIVITY_CONSTANTS } from '../../constants/audio.constants';

/**
 * Error payload interface for audio-related errors
 */
interface AudioError {
  code: string | null;
  message: string | null;
  category: 'device' | 'network' | 'processing' | null;
  timestamp: number | null;
}

/**
 * Processing metadata interface for performance monitoring
 */
interface ProcessingMetadata {
  lastProcessingTime: number;
  bufferSize: number;
  deviceId: string | null;
}

/**
 * Interface for the audio state slice
 */
interface AudioState {
  microphoneEnabled: boolean;
  isRecording: boolean;
  audioLevel: AudioLevel & { lastUpdate: number };
  error: AudioError;
  config: AudioConfig;
  processingMetadata: ProcessingMetadata;
}

/**
 * Initial state for the audio slice
 */
const initialState: AudioState = {
  microphoneEnabled: false,
  isRecording: false,
  audioLevel: {
    rms: 0,
    peak: 0,
    clipping: false,
    lastUpdate: 0
  },
  error: {
    code: null,
    message: null,
    category: null,
    timestamp: null
  },
  config: defaultAudioConfig,
  processingMetadata: {
    lastProcessingTime: 0,
    bufferSize: 0,
    deviceId: null
  }
};

/**
 * Redux slice for audio state management
 */
const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    /**
     * Updates microphone permission and connection status
     */
    setMicrophoneStatus(
      state,
      action: PayloadAction<{ status: boolean; deviceId?: string }>
    ) {
      state.microphoneEnabled = action.payload.status;
      if (action.payload.deviceId) {
        state.processingMetadata.deviceId = action.payload.deviceId;
      }
      if (action.payload.status) {
        state.error = initialState.error;
      }
      state.processingMetadata.lastProcessingTime = Date.now();
    },

    /**
     * Updates the current recording state
     */
    setRecordingStatus(state, action: PayloadAction<boolean>) {
      if (!state.microphoneEnabled && action.payload) {
        state.error = {
          code: 'MIC_NOT_ENABLED',
          message: 'Microphone must be enabled before recording',
          category: 'device',
          timestamp: Date.now()
        };
        return;
      }
      state.isRecording = action.payload;
      if (!action.payload) {
        state.audioLevel = { ...initialState.audioLevel, lastUpdate: Date.now() };
      }
      state.processingMetadata.lastProcessingTime = Date.now();
    },

    /**
     * Updates current audio input levels with performance optimization
     */
    updateAudioLevel(state, action: PayloadAction<AudioLevel>) {
      const now = Date.now();
      // Throttle updates to maintain performance
      if (now - state.audioLevel.lastUpdate < VOICE_ACTIVITY_CONSTANTS.UPDATE_INTERVAL_MS) {
        return;
      }
      
      state.audioLevel = {
        ...action.payload,
        lastUpdate: now
      };
      state.processingMetadata.lastProcessingTime = now;
    },

    /**
     * Sets audio-related error state with enhanced categorization
     */
    setError(state, action: PayloadAction<Omit<AudioError, 'timestamp'>>) {
      state.error = {
        ...action.payload,
        timestamp: Date.now()
      };

      // Reset recording state on critical errors
      if (action.payload.category === 'device' || action.payload.category === 'network') {
        state.isRecording = false;
      }

      state.processingMetadata.lastProcessingTime = Date.now();
    },

    /**
     * Updates audio configuration parameters
     */
    updateConfig(state, action: PayloadAction<Partial<AudioConfig>>) {
      state.config = {
        ...state.config,
        ...action.payload
      };
      state.processingMetadata.lastProcessingTime = Date.now();
    },

    /**
     * Resets the audio state to initial values
     */
    resetAudioState(state) {
      return {
        ...initialState,
        config: state.config, // Preserve config settings
        processingMetadata: {
          ...initialState.processingMetadata,
          deviceId: state.processingMetadata.deviceId // Preserve device ID
        }
      };
    }
  }
});

// Export actions
export const {
  setMicrophoneStatus,
  setRecordingStatus,
  updateAudioLevel,
  setError,
  updateConfig,
  resetAudioState
} = audioSlice.actions;

// Export reducer
export default audioSlice.reducer;

// Export selectors
export const selectMicrophoneEnabled = (state: { audio: AudioState }) => 
  state.audio.microphoneEnabled;

export const selectIsRecording = (state: { audio: AudioState }) => 
  state.audio.isRecording;

export const selectAudioLevel = (state: { audio: AudioState }) => 
  state.audio.audioLevel;

export const selectAudioError = (state: { audio: AudioState }) => 
  state.audio.error;

export const selectAudioConfig = (state: { audio: AudioState }) => 
  state.audio.config;

export const selectProcessingMetadata = (state: { audio: AudioState }) => 
  state.audio.processingMetadata;