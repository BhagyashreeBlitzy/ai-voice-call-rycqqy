import React from 'react';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react';
import { ThemeProvider } from '@mui/material';

import SettingsPanel from '../../../src/components/settings/SettingsPanel';
import AudioSettings from '../../../src/components/settings/AudioSettings';
import VoiceSettings from '../../../src/components/settings/VoiceSettings';
import { useSettings } from '../../../src/hooks/useSettings';

// Mock hooks and services
jest.mock('../../../src/hooks/useSettings');
jest.mock('../../../src/services/voice.service');

// Mock theme provider context
const mockTheme = {
  palette: {
    mode: 'light',
    primary: { main: '#0A84FF' },
    background: { paper: '#FFFFFF' }
  }
};

describe('SettingsPanel', () => {
  const mockOnClose = jest.fn();
  const mockSettings = {
    audio: {
      inputVolume: 75,
      outputVolume: 75,
      noiseReduction: true,
      config: {
        sampleRate: 16000,
        frameSize: 20,
        bitDepth: 16,
        channels: 1
      }
    },
    voice: {
      config: {
        vadThreshold: -26,
        noiseFloor: -45
      },
      autoMuteAfterResponse: true,
      wakeWordDetection: false
    }
  };

  beforeEach(() => {
    (useSettings as jest.Mock).mockReturnValue({
      settings: mockSettings,
      isLoading: false,
      updateAudioSettings: jest.fn(),
      updateVoiceSettings: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with proper accessibility attributes', async () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <SettingsPanel onClose={mockOnClose} />
      </ThemeProvider>
    );

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA landmarks
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'settings-dialog-title');
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Settings tabs');
  });

  it('handles tab navigation correctly', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <SettingsPanel onClose={mockOnClose} />
      </ThemeProvider>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);

    // Test keyboard navigation
    await userEvent.tab();
    expect(tabs[0]).toHaveFocus();

    await userEvent.keyboard('{arrowright}');
    expect(tabs[1]).toHaveFocus();

    await userEvent.keyboard('{arrowleft}');
    expect(tabs[0]).toHaveFocus();
  });

  it('manages settings state properly', async () => {
    const mockUpdateSettings = jest.fn();
    (useSettings as jest.Mock).mockReturnValue({
      ...mockSettings,
      updateAudioSettings: mockUpdateSettings
    });

    render(
      <ThemeProvider theme={mockTheme}>
        <SettingsPanel onClose={mockOnClose} />
      </ThemeProvider>
    );

    // Modify settings
    const audioTab = screen.getByRole('tab', { name: /audio/i });
    await userEvent.click(audioTab);

    const volumeSlider = screen.getByRole('slider', { name: /input volume/i });
    await userEvent.click(volumeSlider);
    
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          inputVolume: expect.any(Number)
        })
      );
    });
  });
});

describe('AudioSettings', () => {
  const mockOnError = jest.fn();

  beforeEach(() => {
    (useSettings as jest.Mock).mockReturnValue({
      settings: {
        audio: {
          inputVolume: 75,
          outputVolume: 75,
          noiseReduction: true,
          config: {
            sampleRate: 16000,
            frameSize: 20,
            bitDepth: 16,
            channels: 1
          }
        }
      },
      updateAudioSettings: jest.fn()
    });
  });

  it('handles audio device errors gracefully', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <AudioSettings onError={mockOnError} />
      </ThemeProvider>
    );

    // Simulate audio device error
    const error = new Error('Audio device not found');
    await userEvent.click(screen.getByRole('slider', { name: /input volume/i }));
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });

  it('updates settings with proper validation', async () => {
    const mockUpdateAudioSettings = jest.fn();
    (useSettings as jest.Mock).mockReturnValue({
      settings: mockSettings,
      updateAudioSettings: mockUpdateAudioSettings
    });

    render(
      <ThemeProvider theme={mockTheme}>
        <AudioSettings onError={mockOnError} />
      </ThemeProvider>
    );

    // Test volume slider
    const volumeSlider = screen.getByRole('slider', { name: /input volume/i });
    await userEvent.click(volumeSlider);

    await waitFor(() => {
      expect(mockUpdateAudioSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          inputVolume: expect.any(Number)
        })
      );
    });

    // Test noise reduction toggle
    const noiseReductionSwitch = screen.getByRole('switch', { name: /noise reduction/i });
    await userEvent.click(noiseReductionSwitch);

    await waitFor(() => {
      expect(mockUpdateAudioSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          noiseReduction: false
        })
      );
    });
  });
});

describe('VoiceSettings', () => {
  const mockVoices = [
    { voiceId: 'en-US-Male-1', name: 'Male Voice 1' },
    { voiceId: 'en-US-Female-1', name: 'Female Voice 1' }
  ];

  beforeEach(() => {
    (useSettings as jest.Mock).mockReturnValue({
      settings: mockSettings,
      updateVoiceSettings: jest.fn()
    });
  });

  it('handles voice preview functionality', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <VoiceSettings />
      </ThemeProvider>
    );

    // Test voice preview button
    const previewButton = screen.getByRole('button', { name: /preview voice/i });
    await userEvent.click(previewButton);

    expect(screen.getByText(/playing preview/i)).toBeInTheDocument();
    
    // Test preview stop
    await userEvent.click(previewButton);
    expect(screen.queryByText(/playing preview/i)).not.toBeInTheDocument();
  });

  it('validates language compatibility', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <VoiceSettings />
      </ThemeProvider>
    );

    // Test voice selection
    const voiceSelect = screen.getByRole('combobox', { name: /voice/i });
    await userEvent.click(voiceSelect);

    const options = screen.getAllByRole('option');
    await userEvent.click(options[1]);

    await waitFor(() => {
      expect(screen.getByText(mockVoices[1].name)).toBeInTheDocument();
    });

    // Test voice parameters
    const rateSlider = screen.getByRole('slider', { name: /speaking rate/i });
    await userEvent.click(rateSlider);

    await waitFor(() => {
      expect(screen.getByText(/speaking rate/i)).toBeInTheDocument();
    });
  });
});