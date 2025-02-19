import React, { useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';

// Props interface for the ErrorPage component
interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
  errorCode?: string;
  retryCount?: number;
}

// Styled components with Material Design principles
const ErrorContainer = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-md);
  background-color: var(--background-default);
  color: var(--text-primary);
`;

const ErrorContent = styled.div`
  max-width: 600px;
  text-align: center;
  padding: var(--spacing-lg);
  background-color: var(--background-paper);
  border-radius: 8px;
  box-shadow: var(--shadows-md);
`;

const ErrorTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
  color: var(--color-error-main);
`;

const ErrorMessage = styled.p`
  font-size: 1.125rem;
  margin-bottom: var(--spacing-lg);
  color: var(--text-secondary);
`;

const ErrorDetails = styled.pre`
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background-color: var(--background-elevated);
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  justify-content: center;

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_COOLDOWN_MS = 5000;

export const ErrorPage: React.FC<ErrorPageProps> = ({
  error,
  resetError,
  errorCode = 'UNKNOWN_ERROR',
  retryCount = 0
}) => {
  const navigate = useNavigate();
  const [lastRetryTime, setLastRetryTime] = React.useState<number>(0);

  // Handle error tracking and analytics
  useEffect(() => {
    if (error) {
      // Log error to analytics/monitoring service
      console.error('Error occurred:', {
        error,
        errorCode,
        retryCount,
        timestamp: new Date().toISOString()
      });
    }
  }, [error, errorCode, retryCount]);

  // Announce error to screen readers
  useEffect(() => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.className = 'sr-only';
    announcement.textContent = `Error occurred: ${error?.message || 'An unexpected error occurred'}`;
    document.body.appendChild(announcement);

    return () => announcement.remove();
  }, [error]);

  const handleRetry = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    const now = Date.now();
    if (now - lastRetryTime < RETRY_COOLDOWN_MS) {
      return; // Prevent rapid retries
    }

    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      // Show max retries reached message
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.textContent = 'Maximum retry attempts reached. Please try again later.';
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 3000);
      return;
    }

    setLastRetryTime(now);
    resetError?.();
  }, [resetError, retryCount, lastRetryTime]);

  const handleNavigateHome = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    // Clear any error states before navigation
    resetError?.();
    navigate('/', { replace: true });
  }, [navigate, resetError]);

  // Get user-friendly error message
  const getErrorMessage = () => {
    if (error instanceof TypeError) {
      return 'There was a problem processing your request. Please check your input and try again.';
    }
    if (error instanceof NetworkError) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    return error?.message || 'An unexpected error occurred. Please try again later.';
  };

  return (
    <ErrorContainer role="main" aria-labelledby="error-title">
      <ErrorContent>
        <ErrorTitle id="error-title" tabIndex={-1}>
          Oops! Something went wrong
        </ErrorTitle>
        
        <ErrorMessage role="status" aria-live="polite">
          {getErrorMessage()}
        </ErrorMessage>

        {process.env.NODE_ENV === 'development' && error?.stack && (
          <ErrorDetails aria-label="Error details">
            {error.stack}
          </ErrorDetails>
        )}

        <ButtonContainer>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRetry}
            disabled={retryCount >= MAX_RETRY_ATTEMPTS}
            aria-label="Try again"
            data-testid="retry-button"
          >
            Try Again
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleNavigateHome}
            aria-label="Return to home page"
            data-testid="home-button"
          >
            Return Home
          </Button>
        </ButtonContainer>

        {retryCount > 0 && (
          <ErrorMessage aria-live="polite">
            Retry attempt {retryCount} of {MAX_RETRY_ATTEMPTS}
          </ErrorMessage>
        )}
      </ErrorContent>
    </ErrorContainer>
  );
};

// Custom error type for network-related errors
class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export default ErrorPage;