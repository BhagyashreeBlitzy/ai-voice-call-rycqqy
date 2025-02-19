import React, { useCallback, useEffect, useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import MainLayout from '../components/layout/MainLayout';
import { ConversationHistory } from '../components/conversation/ConversationHistory';
import { MicrophoneButton } from '../components/audio/MicrophoneButton';
import { useConversation } from '../hooks/useConversation';
import { useAudio } from '../hooks/useAudio';
import { ThemeContext } from '../theme/themeProvider';

// Styled components for layout
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-default);
  color: var(--text-primary);
`;

const ConversationContainer = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background-color: var(--background-paper);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
`;

const ErrorMessage = styled.div`
  color: var(--color-error-main);
  text-align: center;
  padding: 8px 16px;
  margin: 8px 0;
  background-color: var(--color-error-light);
  border-radius: 4px;
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ConversationPage: React.FC = React.memo(() => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAuthenticated = useSelector((state: any) => state.user.isAuthenticated);

  // Initialize conversation hook
  const {
    conversation,
    isProcessing,
    error: conversationError,
    startNewConversation,
    sendAudioMessage,
    endCurrentConversation,
    resetErrorState
  } = useConversation();

  // Initialize audio hook with error handling
  const {
    isRecording,
    audioLevel,
    error: audioError,
    startRecording,
    stopRecording
  } = useAudio();

  // Handle audio capture from microphone
  const handleAudioCapture = useCallback(async (audioData: Blob) => {
    try {
      if (!conversation) {
        await startNewConversation(crypto.randomUUID());
      }
      await sendAudioMessage({
        data: new Uint8Array(await audioData.arrayBuffer()),
        timestamp: Date.now(),
        format: 'audio/opus'
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process audio');
      console.error('Audio capture error:', error);
    }
  }, [conversation, startNewConversation, sendAudioMessage]);

  // Handle errors from conversation or audio processing
  useEffect(() => {
    const error = conversationError || audioError;
    if (error) {
      setErrorMessage(error.message);
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [conversationError, audioError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording().catch(console.error);
      }
      if (conversation) {
        endCurrentConversation().catch(console.error);
      }
    };
  }, [isRecording, conversation, stopRecording, endCurrentConversation]);

  // Memoize conversation history props
  const historyProps = useMemo(() => ({
    messages: conversation?.messages || [],
    loading: isProcessing,
    maxMessages: 100,
    retryAttempts: 3
  }), [conversation, isProcessing]);

  return (
    <MainLayout>
      <PageContainer role="main" aria-label="Voice conversation interface">
        <ConversationContainer>
          {errorMessage && (
            <ErrorMessage role="alert" aria-live="polite">
              {errorMessage}
            </ErrorMessage>
          )}
          
          <ConversationHistory
            {...historyProps}
            className="conversation-history"
          />
        </ConversationContainer>

        <ControlsContainer>
          <MicrophoneButton
            size="large"
            disabled={!isAuthenticated || isProcessing}
            onError={(error) => setErrorMessage(error.message)}
          />
        </ControlsContainer>
      </PageContainer>
    </MainLayout>
  );
});

ConversationPage.displayName = 'ConversationPage';

export default ConversationPage;