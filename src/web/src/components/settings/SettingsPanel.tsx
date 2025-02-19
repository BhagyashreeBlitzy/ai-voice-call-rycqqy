import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import { 
  Box, 
  Tabs, 
  Tab, 
  Button, 
  CircularProgress, 
  Dialog,
  styled
} from '@mui/material'; // v5.14.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11

import AudioSettings from './AudioSettings';
import VoiceSettings from './VoiceSettings';
import LanguageSettings from './LanguageSettings';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';

// Styled components for enhanced visual hierarchy
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '100%',
    maxWidth: 600,
    margin: 16,
    borderRadius: 8,
    backgroundColor: 'var(--background-paper)',
    color: 'var(--text-primary)'
  }
}));

const TabPanel = styled(Box)({
  padding: 0,
  height: '100%',
  overflow: 'auto'
});

const ButtonContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 16,
  padding: 16,
  borderTop: '1px solid var(--divider)'
});

interface SettingsPanelProps {
  onClose: () => void;
  className?: string;
}

// Error fallback component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <Box p={3} color="error.main">
    <h3>Settings Error</h3>
    <p>{error.message}</p>
  </Box>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = React.memo(({ onClose, className }) => {
  const { t } = useTranslation();
  const { settings, isLoading } = useSettings();
  const { theme, themeMode } = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset error state when changing tabs
  useEffect(() => {
    setError(null);
  }, [selectedTab]);

  // Handle tab change with unsaved changes check
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
      return;
    }
    setSelectedTab(newValue);
  }, [hasUnsavedChanges]);

  // Handle settings save
  const handleSave = useCallback(async () => {
    try {
      setHasUnsavedChanges(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save settings'));
    }
  }, [onClose]);

  // Handle dialog close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <StyledDialog 
        open={true} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        className={className}
        aria-labelledby="settings-dialog-title"
      >
        <Box display="flex" flexDirection="column" height="600px">
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            aria-label="Settings tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={t('settings.tabs.audio')} id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label={t('settings.tabs.voice')} id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab label={t('settings.tabs.language')} id="settings-tab-2" aria-controls="settings-tabpanel-2" />
          </Tabs>

          <TabPanel
            role="tabpanel"
            hidden={selectedTab !== 0}
            id="settings-tabpanel-0"
            aria-labelledby="settings-tab-0"
          >
            <AudioSettings onError={setError} />
          </TabPanel>

          <TabPanel
            role="tabpanel"
            hidden={selectedTab !== 1}
            id="settings-tabpanel-1"
            aria-labelledby="settings-tab-1"
          >
            <VoiceSettings />
          </TabPanel>

          <TabPanel
            role="tabpanel"
            hidden={selectedTab !== 2}
            id="settings-tabpanel-2"
            aria-labelledby="settings-tab-2"
          >
            <LanguageSettings />
          </TabPanel>

          <ButtonContainer>
            {error && (
              <Box color="error.main" mr="auto" display="flex" alignItems="center">
                {error.message}
              </Box>
            )}
            <Button
              onClick={handleClose}
              color="secondary"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              color="primary"
              variant="contained"
              disabled={isLoading || !hasUnsavedChanges}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {t('common.save')}
            </Button>
          </ButtonContainer>
        </Box>

        <Dialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          aria-labelledby="confirm-dialog-title"
        >
          <Box p={3}>
            <h2 id="confirm-dialog-title">{t('settings.confirmDialog.title')}</h2>
            <p>{t('settings.confirmDialog.message')}</p>
            <ButtonContainer>
              <Button
                onClick={() => setShowConfirmDialog(false)}
                color="secondary"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setHasUnsavedChanges(false);
                  onClose();
                }}
                color="primary"
                variant="contained"
              >
                {t('common.discard')}
              </Button>
            </ButtonContainer>
          </Box>
        </Dialog>
      </StyledDialog>
    </ErrorBoundary>
  );
});

SettingsPanel.displayName = 'SettingsPanel';

export default SettingsPanel;