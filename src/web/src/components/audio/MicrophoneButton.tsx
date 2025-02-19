import React, { useCallback, useEffect, useState, useContext } from 'react';
import styled from '@emotion/styled';
import MicIcon from '@mui/icons-material/Mic';
import { useAudio } from '../../hooks/useAudio';
import { Button } from '../shared/Button';
import { VoiceActivityDisplay } from './VoiceActivityDisplay';
import { ThemeContext } from '../../theme/themeProvider';

// Constants for button states and animations
const DEBOUNCE_DELAY = 300;
const ERROR_DISPLAY_DURATION = 5000;
const PULSE_ANIMATION_DURATION = '1.5s';

interface MicrophoneButtonProps {
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  onError?: (error: Error) => void;
}

// Styled components for enhanced visual feedback
const Container = styled.div<{ size: string }>`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ size }) => size === 'large' ? '16px' : '12px'};
`;

const StyledButton = styled(Button)<{
  $isRecording: boolean;
  $hasError: boolean;
  $isVoiceDetected: boolean;
}>`
  border-radius: 50%;
  padding: 0;
  aspect-ratio: 1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: ${({ $isRecording, $hasError, theme }) =>
    $hasError ? 'var(--color-error-main)' :
    $isRecording ? 'var(--color-primary-main)' :
    'var(--color-secondary-main)'};

  &:hover {
    background-color: ${({ $isRecording, $hasError, theme }) =>
      $hasError ? 'var(--color-error-dark)' :
      $isRecording ? 'var(--color-primary-dark)' :
      'var(--color-secondary-dark)'};
  }

  ${({ $isRecording, $isVoiceDetected }) => $isRecording && $isVoiceDetected && `
    animation: pulse ${PULSE_ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.6, 1) infinite;
  `}

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-error-main);
  font-size: 0.875rem;
  text-align: center;
  margin-top: 8px;
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const VoiceActivityWrapper = styled.div<{ size: string }>`
  position: absolute;
  bottom: ${({ size }) => size === 'large' ? '-48px' : '-36px'};
  width: 100%;
  display: flex;
  justify-content: center;
`;

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = React.memo(({
  size = 'medium',
  disabled = false,
  className = '',
  onError
}) => {
  const {
    isRecording,
    audioLevel,
    isVoiceDetected,
    startRecording,
    stopRecording,
    error,
    retryRecording
  } = useAudio();

  const { currentTheme } = useContext(ThemeContext);
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayError, setDisplayError] = useState<Error | null>(null);

  // Handle errors with automatic retry
  useEffect(() => {
    if (error) {
      setDisplayError(error);
      onError?.(error);

      const timer = setTimeout(() => {
        setDisplayError(null);
      }, ERROR_DISPLAY_DURATION);

      return () => clearTimeout(timer);
    }
  }, [error, onError]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording().catch(console.error);
      }
    };
  }, [isRecording, stopRecording]);

  // Handle microphone button click with debouncing
  const handleMicrophoneClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    
    if (isProcessing || disabled) return;
    
    setIsProcessing(true);
    
    try {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle recording');
      setDisplayError(error);
      onError?.(error);
      
      // Attempt automatic retry
      try {
        await retryRecording();
      } catch (retryErr) {
        console.error('Retry failed:', retryErr);
      }
    } finally {
      setTimeout(() => setIsProcessing(false), DEBOUNCE_DELAY);
    }
  }, [isRecording, isProcessing, disabled, startRecording, stopRecording, retryRecording, onError]);

  // Calculate button dimensions based on size
  const buttonSize = {
    small: { button: 40, icon: 20 },
    medium: { button: 56, icon: 24 },
    large: { button: 72, icon: 32 }
  }[size];

  return (
    <Container size={size} className={className}>
      <StyledButton
        variant="contained"
        size={size}
        disabled={disabled || isProcessing}
        onClick={handleMicrophoneClick}
        $isRecording={isRecording}
        $hasError={!!error}
        $isVoiceDetected={isVoiceDetected}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        aria-pressed={isRecording}
        aria-disabled={disabled || isProcessing}
        style={{
          width: buttonSize.button,
          height: buttonSize.button,
          minWidth: buttonSize.button
        }}
      >
        <MicIcon
          sx={{
            fontSize: buttonSize.icon,
            transition: 'color 0.2s ease',
            color: isRecording ? '#fff' : 'inherit'
          }}
        />
      </StyledButton>

      {isRecording && (
        <VoiceActivityWrapper size={size}>
          <VoiceActivityDisplay
            width={buttonSize.button * 2}
            height={buttonSize.button / 2}
            theme={{
              colors: {
                primary: 'var(--color-primary-main)',
                error: 'var(--color-error-main)',
                warning: 'var(--color-warning-main)',
                inactive: 'var(--color-secondary-main)',
                background: currentTheme === 'dark' ? '#1E1E1E' : '#F5F5F5',
                focus: 'var(--color-primary-light)'
              }
            }}
          />
        </VoiceActivityWrapper>
      )}

      {displayError && (
        <ErrorMessage role="alert">
          {displayError.message}
        </ErrorMessage>
      )}
    </Container>
  );
});

MicrophoneButton.displayName = 'MicrophoneButton';

export default MicrophoneButton;