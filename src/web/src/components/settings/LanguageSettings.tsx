import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  Select,
  MenuItem,
  Switch,
  CircularProgress,
  Alert,
  FormControlLabel,
  Typography,
  Box
} from '@mui/material';
import { useSettings } from '../../hooks/useSettings';

// Supported languages based on technical specifications
const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'ar-SA', name: 'العربية' },
  { code: 'he-IL', name: 'עברית' }
] as const;

// RTL languages
const RTL_LANGUAGES = ['ar-SA', 'he-IL'];

/**
 * Language settings component for managing language preferences
 * with system detection and RTL support
 */
const LanguageSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateLanguage, isLoading } = useSettings();
  const [error, setError] = useState<string | null>(null);

  /**
   * Detect system language on mount if enabled
   */
  useEffect(() => {
    if (settings.language.useSystemLanguage) {
      const systemLanguage = navigator.language;
      const isSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === systemLanguage);
      
      if (isSupported && systemLanguage !== settings.language.primaryLanguage) {
        handlePrimaryLanguageChange({ target: { value: systemLanguage } } as React.ChangeEvent<HTMLSelectElement>);
      }
    }
  }, [settings.language.useSystemLanguage]);

  /**
   * Handle RTL layout changes based on selected language
   */
  useEffect(() => {
    const isRTL = RTL_LANGUAGES.includes(settings.language.primaryLanguage);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [settings.language.primaryLanguage]);

  /**
   * Handle primary language change with validation
   */
  const handlePrimaryLanguageChange = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    setError(null);

    try {
      // Validate language selection
      if (!SUPPORTED_LANGUAGES.some(lang => lang.code === newLanguage)) {
        throw new Error(t('settings.language.errors.unsupported'));
      }

      // Check if secondary language needs to be cleared
      const updatedSettings = {
        ...settings.language,
        primaryLanguage: newLanguage,
        secondaryLanguage: newLanguage === settings.language.secondaryLanguage ? '' : settings.language.secondaryLanguage,
        rtlSupport: RTL_LANGUAGES.includes(newLanguage)
      };

      await updateLanguage(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.language.errors.updateFailed'));
    }
  }, [settings.language, updateLanguage, t]);

  /**
   * Handle secondary language change with validation
   */
  const handleSecondaryLanguageChange = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    setError(null);

    try {
      if (newLanguage && newLanguage === settings.language.primaryLanguage) {
        throw new Error(t('settings.language.errors.duplicateLanguage'));
      }

      await updateLanguage({
        ...settings.language,
        secondaryLanguage: newLanguage
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.language.errors.updateFailed'));
    }
  }, [settings.language, updateLanguage, t]);

  /**
   * Handle system language detection toggle
   */
  const handleSystemLanguageToggle = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const useSystem = event.target.checked;
    setError(null);

    try {
      if (useSystem) {
        const systemLanguage = navigator.language;
        const isSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === systemLanguage);

        await updateLanguage({
          ...settings.language,
          useSystemLanguage: true,
          primaryLanguage: isSupported ? systemLanguage : settings.language.primaryLanguage
        });
      } else {
        await updateLanguage({
          ...settings.language,
          useSystemLanguage: false
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.language.errors.updateFailed'));
    }
  }, [settings.language, updateLanguage, t]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('settings.language.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('settings.language.primary')}
        </Typography>
        <Select
          value={settings.language.primaryLanguage}
          onChange={handlePrimaryLanguageChange}
          disabled={isLoading || settings.language.useSystemLanguage}
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <MenuItem key={lang.code} value={lang.code}>
              {lang.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('settings.language.secondary')}
        </Typography>
        <Select
          value={settings.language.secondaryLanguage}
          onChange={handleSecondaryLanguageChange}
          disabled={isLoading}
        >
          <MenuItem value="">
            <em>{t('settings.language.none')}</em>
          </MenuItem>
          {SUPPORTED_LANGUAGES.map(lang => (
            <MenuItem 
              key={lang.code} 
              value={lang.code}
              disabled={lang.code === settings.language.primaryLanguage}
            >
              {lang.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={settings.language.useSystemLanguage}
            onChange={handleSystemLanguageToggle}
            disabled={isLoading}
          />
        }
        label={t('settings.language.useSystem')}
      />

      {isLoading && (
        <Box display="flex" justifyContent="center" mt={2}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

export default LanguageSettings;