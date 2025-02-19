import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { useVoiceActivity } from '../../hooks/useVoiceActivity';
import WaveformVisualizer from './WaveformVisualizer';
import type { AudioLevel } from '../../types/audio.types';

// Constants for visual thresholds
const CLIPPING_THRESHOLD = -3; // dB
const HIGH_LEVEL_THRESHOLD = -12; // dB
const LOW_LEVEL_THRESHOLD = -30; // dB

interface VoiceActivityDisplayProps {
  audioService: AudioService;
  width: number;
  height: number;
  className?: string;
  theme?: {
    colors: {
      primary: string;
      error: string;
      warning: string;
      inactive: string;
      background: string;
      focus: string;
    };
  };
  devicePixelRatio?: number;
  ariaLabel?: string;
  onError?: (error: Error) => void;
}

const getDisplayColor = (
  isVoiceDetected: boolean,
  audioLevel: AudioLevel,
  theme: VoiceActivityDisplayProps['theme']
): string => {
  if (!theme) return '#2196F3';

  if (audioLevel.clipping) {
    return theme.colors.error;
  }

  if (!isVoiceDetected) {
    return theme.colors.inactive;
  }

  if (audioLevel.peak > CLIPPING_THRESHOLD) {
    return theme.colors.error;
  }

  if (audioLevel.peak > HIGH_LEVEL_THRESHOLD) {
    return theme.colors.warning;
  }

  return theme.colors.primary;
};

const Container = styled.div<{ theme?: VoiceActivityDisplayProps['theme'] }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: ${({ theme }) => theme?.colors.background || '#f5f5f5'};
  padding: 16px;
  transition: background-color 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StatusIndicator = styled.div<{
  status: 'active' | 'inactive' | 'error';
  theme?: VoiceActivityDisplayProps['theme'];
}>`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
  background-color: ${({ status, theme }) => {
    if (!theme) return status === 'active' ? '#4caf50' : status === 'error' ? '#f44336' : '#9e9e9e';
    return status === 'active' 
      ? theme.colors.primary 
      : status === 'error' 
        ? theme.colors.error 
        : theme.colors.inactive;
  }};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme?.colors.focus || '#2196F3'};
  }
`;

export const VoiceActivityDisplay: React.FC<VoiceActivityDisplayProps> = ({
  audioService,
  width,
  height,
  className = '',
  theme,
  devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  ariaLabel = 'Voice activity visualization',
  onError
}) => {
  const { isVoiceDetected, audioLevel, isProcessing, error } = useVoiceActivity(
    audioService,
    {
      vadThreshold: -26,
      noiseFloor: -45,
      silenceTimeout: 1500
    }
  );

  const handleError = useCallback((err: Error) => {
    console.error('Voice activity display error:', err);
    onError?.(err);
  }, [onError]);

  const displayColor = useMemo(() => 
    getDisplayColor(isVoiceDetected, audioLevel, theme),
    [isVoiceDetected, audioLevel, theme]
  );

  const status = useMemo(() => {
    if (error) return 'error';
    return isVoiceDetected ? 'active' : 'inactive';
  }, [error, isVoiceDetected]);

  const statusMessage = useMemo(() => {
    if (error) return `Error: ${error.message}`;
    if (isProcessing) return 'Processing audio...';
    if (isVoiceDetected) return 'Voice detected';
    return 'No voice detected';
  }, [error, isProcessing, isVoiceDetected]);

  return (
    <Container 
      className={className}
      theme={theme}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <StatusIndicator
        status={status}
        theme={theme}
        aria-label={statusMessage}
        tabIndex={0}
      />
      <WaveformVisualizer
        width={width}
        height={height}
        color={displayColor}
        devicePixelRatio={devicePixelRatio}
        theme={theme?.colors.background ? 'dark' : 'light'}
      />
      <div aria-hidden="true" style={{ display: 'none' }}>
        {statusMessage}
      </div>
    </Container>
  );
};

VoiceActivityDisplay.displayName = 'VoiceActivityDisplay';

export default React.memo(VoiceActivityDisplay);