import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

import { AudioLevel } from '../../../src/components/audio/AudioLevel';
import { MicrophoneButton } from '../../../src/components/audio/MicrophoneButton';
import { VoiceActivityDisplay } from '../../../src/components/audio/VoiceActivityDisplay';
import { WaveformVisualizer } from '../../../src/components/audio/WaveformVisualizer';
import { useAudio } from '../../../hooks/useAudio';
import { ThemeProvider } from '../../../theme/themeProvider';

// Mock hooks and services
jest.mock('../../../hooks/useAudio');
jest.mock('../../../hooks/useVoiceActivity');

// Mock canvas API
const mockGetContext = jest.fn();
HTMLCanvasElement.prototype.getContext = mockGetContext;

describe('AudioLevel Component', () => {
  const defaultProps = {
    audioLevel: {
      rms: -30,
      peak: -20,
      clipping: false
    },
    isActive: true,
    width: 20,
    height: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with default props', () => {
    const { container } = render(<AudioLevel {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector('[role="meter"]')).toBeInTheDocument();
  });

  test('displays correct color based on audio level', () => {
    const highLevel = {
      ...defaultProps,
      audioLevel: { rms: -5, peak: -3, clipping: false }
    };
    const { container: highContainer } = render(<AudioLevel {...highLevel} />);
    expect(highContainer.querySelector('.level-indicator')).toHaveStyle({
      backgroundColor: 'rgba(255, 215, 0, 0.8)'
    });

    const clipping = {
      ...defaultProps,
      audioLevel: { rms: 0, peak: 0, clipping: true }
    };
    const { container: clippingContainer } = render(<AudioLevel {...clipping} />);
    expect(clippingContainer.querySelector('.level-indicator')).toHaveStyle({
      backgroundColor: 'rgba(255, 0, 0, 0.8)'
    });
  });

  test('handles inactive state correctly', () => {
    const { container } = render(<AudioLevel {...defaultProps} isActive={false} />);
    expect(container.querySelector('.level-indicator')).not.toBeInTheDocument();
  });

  test('updates ARIA values correctly', () => {
    const { getByRole } = render(<AudioLevel {...defaultProps} />);
    const meter = getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '-30');
    expect(meter).toHaveAttribute('aria-valuemin', '-90');
    expect(meter).toHaveAttribute('aria-valuemax', '0');
  });
});

describe('MicrophoneButton Component', () => {
  const mockStartRecording = jest.fn();
  const mockStopRecording = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAudio as jest.Mock).mockReturnValue({
      isRecording: false,
      audioLevel: { rms: -30, peak: -20, clipping: false },
      isVoiceDetected: false,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
      error: null
    });
  });

  test('renders in initial state', () => {
    const { getByRole } = render(
      <ThemeProvider>
        <MicrophoneButton onError={mockOnError} />
      </ThemeProvider>
    );
    expect(getByRole('button')).toBeInTheDocument();
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('handles recording state changes', async () => {
    const { getByRole, rerender } = render(
      <ThemeProvider>
        <MicrophoneButton onError={mockOnError} />
      </ThemeProvider>
    );
    
    const button = getByRole('button');
    await userEvent.click(button);
    expect(mockStartRecording).toHaveBeenCalled();

    // Simulate recording state
    (useAudio as jest.Mock).mockReturnValue({
      isRecording: true,
      audioLevel: { rms: -30, peak: -20, clipping: false },
      isVoiceDetected: true,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
      error: null
    });

    rerender(
      <ThemeProvider>
        <MicrophoneButton onError={mockOnError} />
      </ThemeProvider>
    );
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('handles errors correctly', async () => {
    const error = new Error('Microphone access denied');
    (useAudio as jest.Mock).mockReturnValue({
      isRecording: false,
      audioLevel: { rms: -30, peak: -20, clipping: false },
      isVoiceDetected: false,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
      error
    });

    const { getByRole, getByText } = render(
      <ThemeProvider>
        <MicrophoneButton onError={mockOnError} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByText(error.message)).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });
});

describe('VoiceActivityDisplay Component', () => {
  const mockAudioService = {
    getAudioLevel: jest.fn(),
    isVoiceDetected: jest.fn(),
    onError: jest.fn()
  };

  const defaultProps = {
    audioService: mockAudioService,
    width: 300,
    height: 150,
    theme: {
      colors: {
        primary: '#2196F3',
        error: '#f44336',
        warning: '#ff9800',
        inactive: '#9e9e9e',
        background: '#ffffff',
        focus: '#2196F3'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with correct dimensions', () => {
    const { container } = render(<VoiceActivityDisplay {...defaultProps} />);
    const visualizer = container.querySelector('canvas');
    expect(visualizer).toHaveStyle({
      width: '300px',
      height: '150px'
    });
  });

  test('updates status indicator based on voice detection', async () => {
    const { getByRole, rerender } = render(<VoiceActivityDisplay {...defaultProps} />);
    
    const statusIndicator = getByRole('status');
    expect(statusIndicator).toHaveTextContent('No voice detected');

    mockAudioService.isVoiceDetected.mockReturnValue(true);
    mockAudioService.getAudioLevel.mockReturnValue({ rms: -20, peak: -15, clipping: false });

    rerender(<VoiceActivityDisplay {...defaultProps} />);
    await waitFor(() => {
      expect(statusIndicator).toHaveTextContent('Voice detected');
    });
  });

  test('handles errors gracefully', async () => {
    const error = new Error('Audio processing failed');
    mockAudioService.getAudioLevel.mockRejectedValue(error);

    const { getByRole } = render(<VoiceActivityDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(getByRole('status')).toHaveTextContent(`Error: ${error.message}`);
    });
  });
});

describe('WaveformVisualizer Component', () => {
  const mockCtx = {
    scale: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContext.mockReturnValue(mockCtx);
  });

  test('initializes canvas with correct settings', () => {
    render(<WaveformVisualizer width={300} height={150} />);
    expect(mockGetContext).toHaveBeenCalledWith('2d', { alpha: true });
    expect(mockCtx.scale).toHaveBeenCalledWith(window.devicePixelRatio, window.devicePixelRatio);
  });

  test('handles theme changes correctly', () => {
    const { rerender } = render(<WaveformVisualizer theme="light" />);
    expect(screen.getByRole('img')).toHaveStyle({
      backgroundColor: 'rgba(255, 255, 255, 0.1)'
    });

    rerender(<WaveformVisualizer theme="dark" />);
    expect(screen.getByRole('img')).toHaveStyle({
      backgroundColor: 'rgba(0, 0, 0, 0.1)'
    });
  });

  test('cleans up animation frame on unmount', () => {
    const { unmount } = render(<WaveformVisualizer />);
    const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');
    
    unmount();
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
  });
});