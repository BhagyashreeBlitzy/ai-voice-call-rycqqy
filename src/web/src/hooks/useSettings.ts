/**
 * Custom React hook for managing application settings with enhanced validation,
 * persistence, system preference detection, and cross-tab synchronization.
 * @packageDocumentation
 * @version 1.0.0
 */

import { useCallback, useEffect, useState } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import { AppSettings } from '../types/settings.types';
import { 
  settingsActions, 
  selectSettings 
} from '../store/slices/settingsSlice';
import { STORAGE_KEYS } from '../utils/storage.utils';

/**
 * Error states for settings operations
 */
interface SettingsError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Custom hook for managing application settings
 */
export const useSettings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<SettingsError | null>(null);

  /**
   * System preference detection setup
   */
  useEffect(() => {
    // Theme preference detection
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (settings.theme.useSystemPreference) {
        dispatch(settingsActions.setTheme({
          ...settings.theme,
          mode: e.matches ? 'dark' : 'light'
        }));
      }
    };
    darkModeMediaQuery.addEventListener('change', handleThemeChange);

    // Language preference detection
    if (settings.language.useSystemLanguage) {
      dispatch(settingsActions.setLanguage({
        ...settings.language,
        primaryLanguage: navigator.language
      }));
    }

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [settings.theme.useSystemPreference, settings.language.useSystemLanguage]);

  /**
   * Cross-tab synchronization
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SETTINGS && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          dispatch(settingsActions.hydrateSettings(newSettings));
        } catch (error) {
          setErrors({
            code: 'SYNC_ERROR',
            message: 'Failed to sync settings across tabs',
            details: { error }
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Theme settings update handler
   */
  const updateTheme = useCallback(async (themeSettings: AppSettings['theme']) => {
    setIsLoading(true);
    try {
      await dispatch(settingsActions.setTheme(themeSettings));
      setErrors(null);
    } catch (error) {
      setErrors({
        code: 'THEME_UPDATE_ERROR',
        message: 'Failed to update theme settings',
        details: { error }
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Language settings update handler
   */
  const updateLanguage = useCallback(async (languageSettings: AppSettings['language']) => {
    setIsLoading(true);
    try {
      await dispatch(settingsActions.setLanguage(languageSettings));
      setErrors(null);
    } catch (error) {
      setErrors({
        code: 'LANGUAGE_UPDATE_ERROR',
        message: 'Failed to update language settings',
        details: { error }
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Audio settings update handler with validation
   */
  const updateAudioSettings = useCallback(async (audioSettings: AppSettings['audio']) => {
    setIsLoading(true);
    try {
      // Validate against technical specifications
      if (
        audioSettings.config.sampleRate !== 16000 ||
        audioSettings.config.frameSize !== 20 ||
        audioSettings.config.bitDepth !== 16 ||
        audioSettings.latencyBudget > 500
      ) {
        throw new Error('Audio settings do not meet technical specifications');
      }

      await dispatch(settingsActions.setAudioSettings(audioSettings));
      setErrors(null);
    } catch (error) {
      setErrors({
        code: 'AUDIO_UPDATE_ERROR',
        message: 'Failed to update audio settings',
        details: { error }
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Voice settings update handler with validation
   */
  const updateVoiceSettings = useCallback(async (voiceSettings: AppSettings['voice']) => {
    setIsLoading(true);
    try {
      // Validate against technical specifications
      if (
        voiceSettings.config.vadThreshold !== -26 ||
        voiceSettings.config.noiseFloor !== -45
      ) {
        throw new Error('Voice settings do not meet technical specifications');
      }

      await dispatch(settingsActions.setVoicePreferences(voiceSettings));
      setErrors(null);
    } catch (error) {
      setErrors({
        code: 'VOICE_UPDATE_ERROR',
        message: 'Failed to update voice settings',
        details: { error }
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    settings,
    updateTheme,
    updateLanguage,
    updateAudioSettings,
    updateVoiceSettings,
    errors,
    isLoading
  };
};