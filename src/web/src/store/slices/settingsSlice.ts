/**
 * Redux slice for managing application settings with enhanced validation,
 * persistence, and system preference detection capabilities.
 * @packageDocumentation
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings, ThemeSettings, AudioSettings, VoiceSettings, LanguageSettings } from '../../types/settings.types';
import { ThemeMode } from '../../constants/theme.constants';

/**
 * Default audio configuration based on technical specifications
 */
const DEFAULT_AUDIO_CONFIG = {
  sampleRate: 16000,
  frameSize: 20,
  bitDepth: 16,
  channels: 1,
  vadThreshold: -26,
  noiseFloor: -45,
  latencyBudget: 500
};

/**
 * Initial state configuration for settings slice
 */
const initialState: AppSettings = {
  theme: {
    mode: ThemeMode.SYSTEM,
    useSystemPreference: true
  },
  audio: {
    inputVolume: 75,
    outputVolume: 75,
    noiseReduction: true,
    config: DEFAULT_AUDIO_CONFIG,
    latencyBudget: 500
  },
  voice: {
    config: {
      audioConfig: DEFAULT_AUDIO_CONFIG,
      preferredFormat: 'audio/opus',
      vadEnabled: true,
      vadThreshold: -26,
      noiseFloor: -45
    },
    autoMuteAfterResponse: true,
    wakeWordDetection: false,
    wakeWordSensitivity: 75
  },
  language: {
    primaryLanguage: 'en-US',
    secondaryLanguage: '',
    useSystemLanguage: true,
    rtlSupport: false
  }
};

/**
 * Settings slice with reducers for theme, language, audio, and voice preferences
 */
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeSettings>) => {
      const { mode, useSystemPreference } = action.payload;
      state.theme = {
        mode,
        useSystemPreference
      };

      // Apply theme changes to DOM
      if (useSystemPreference) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', mode.toLowerCase());
      }

      // Persist theme settings
      localStorage.setItem('theme-settings', JSON.stringify(state.theme));
    },

    setLanguage: (state, action: PayloadAction<LanguageSettings>) => {
      const { primaryLanguage, secondaryLanguage, useSystemLanguage, rtlSupport } = action.payload;
      state.language = {
        primaryLanguage,
        secondaryLanguage,
        useSystemLanguage,
        rtlSupport
      };

      // Apply language settings
      if (useSystemLanguage) {
        const systemLanguage = navigator.language;
        document.documentElement.lang = systemLanguage;
      } else {
        document.documentElement.lang = primaryLanguage;
      }

      // Handle RTL support
      if (rtlSupport) {
        document.documentElement.dir = primaryLanguage.startsWith('ar') || 
                                     primaryLanguage.startsWith('he') ? 'rtl' : 'ltr';
      }

      // Persist language settings
      localStorage.setItem('language-settings', JSON.stringify(state.language));
    },

    setAudioSettings: (state, action: PayloadAction<AudioSettings>) => {
      const { inputVolume, outputVolume, noiseReduction, config, latencyBudget } = action.payload;
      
      // Validate audio configuration
      if (config.sampleRate !== DEFAULT_AUDIO_CONFIG.sampleRate ||
          config.frameSize !== DEFAULT_AUDIO_CONFIG.frameSize ||
          config.bitDepth !== DEFAULT_AUDIO_CONFIG.bitDepth) {
        console.warn('Audio configuration does not match recommended specifications');
      }

      state.audio = {
        inputVolume: Math.max(0, Math.min(100, inputVolume)),
        outputVolume: Math.max(0, Math.min(100, outputVolume)),
        noiseReduction,
        config: {
          ...DEFAULT_AUDIO_CONFIG,
          ...config
        },
        latencyBudget: Math.max(0, Math.min(1000, latencyBudget))
      };

      // Persist audio settings
      localStorage.setItem('audio-settings', JSON.stringify(state.audio));
    },

    setVoicePreferences: (state, action: PayloadAction<VoiceSettings>) => {
      const { config, autoMuteAfterResponse, wakeWordDetection, wakeWordSensitivity } = action.payload;
      
      state.voice = {
        config: {
          ...state.voice.config,
          ...config,
          // Ensure VAD settings match technical specifications
          vadThreshold: DEFAULT_AUDIO_CONFIG.vadThreshold,
          noiseFloor: DEFAULT_AUDIO_CONFIG.noiseFloor
        },
        autoMuteAfterResponse,
        wakeWordDetection,
        wakeWordSensitivity: Math.max(0, Math.min(100, wakeWordSensitivity))
      };

      // Persist voice settings
      localStorage.setItem('voice-settings', JSON.stringify(state.voice));
    },

    // Hydrate settings from localStorage on app initialization
    hydrateSettings: (state) => {
      const themeSettings = localStorage.getItem('theme-settings');
      const languageSettings = localStorage.getItem('language-settings');
      const audioSettings = localStorage.getItem('audio-settings');
      const voiceSettings = localStorage.getItem('voice-settings');

      if (themeSettings) state.theme = JSON.parse(themeSettings);
      if (languageSettings) state.language = JSON.parse(languageSettings);
      if (audioSettings) state.audio = JSON.parse(audioSettings);
      if (voiceSettings) state.voice = JSON.parse(voiceSettings);
    }
  }
});

// Export actions and reducer
export const { 
  setTheme, 
  setLanguage, 
  setAudioSettings, 
  setVoicePreferences, 
  hydrateSettings 
} = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;

// Memoized selector for settings state
export const selectSettings = (state: { settings: AppSettings }) => state.settings;

// Export the entire slice for store configuration
export default settingsSlice;