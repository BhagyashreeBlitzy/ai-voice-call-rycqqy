import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Container, 
  Typography, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

import MainLayout from '../components/layout/MainLayout';
import SettingsPanel from '../components/settings/SettingsPanel';
import { useSettings } from '../hooks/useSettings';

/**
 * Settings page component that provides a comprehensive interface for managing
 * application settings including audio configuration, voice preferences,
 * and language options.
 */
const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings, isLoading, errors } = useSettings();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [error, setError] = useState<Error | null>(null);

  // Handle settings panel close
  const handleSettingsClose = useCallback(() => {
    try {
      // Navigate back to previous page
      window.history.back();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to close settings'));
    }
  }, []);

  // Handle settings-related errors
  const handleSettingsError = useCallback((error: Error) => {
    setError(error);
    // Announce error to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.className = 'sr-only';
    announcement.textContent = error.message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }, []);

  // Clean up error state when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  // Error boundary fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <Box 
      p={3} 
      display="flex" 
      flexDirection="column" 
      alignItems="center"
      role="alert"
    >
      <Typography variant="h6" color="error" gutterBottom>
        {t('settings.errors.title')}
      </Typography>
      <Typography color="textSecondary">
        {error.message}
      </Typography>
    </Box>
  );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        console.error('Settings Error:', error);
        handleSettingsError(error);
      }}
    >
      <MainLayout>
        <Container 
          maxWidth="lg" 
          sx={{ 
            py: { xs: 2, sm: 3 },
            minHeight: '100vh'
          }}
        >
          {isLoading ? (
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              minHeight="200px"
            >
              <CircularProgress 
                size={40}
                aria-label={t('common.loading')}
              />
            </Box>
          ) : (
            <>
              {(error || errors) && (
                <Alert 
                  severity="error" 
                  sx={{ mb: 2 }}
                  onClose={() => setError(null)}
                >
                  {error?.message || errors?.message}
                </Alert>
              )}

              <Box
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: (theme) => theme.shadows[1],
                  width: '100%',
                  maxWidth: isMobile ? '100%' : '600px',
                  margin: '0 auto'
                }}
              >
                <SettingsPanel
                  onClose={handleSettingsClose}
                  className="settings-panel"
                />
              </Box>
            </>
          )}
        </Container>
      </MainLayout>
    </ErrorBoundary>
  );
};

export default SettingsPage;