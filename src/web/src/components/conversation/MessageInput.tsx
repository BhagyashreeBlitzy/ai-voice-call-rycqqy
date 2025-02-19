/**
 * MessageInput Component
 * A fully accessible, real-time validated message input component supporting both text and voice input
 * @version 1.0.0
 */

import React, { useState, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import debounce from 'lodash/debounce'; // v4.0.8
import { useDispatch, useSelector } from '../../store';
import { Message, MessageRole } from '../../types/conversation.types';
import { Button } from '../shared/Button';
import { 
  addMessage, 
  setError,
  selectVoiceProcessingStatus,
  VoiceProcessingStatus 
} from '../../store/slices/conversationSlice';

// Styled components with Material Design principles
const InputContainer = styled.form`
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--background-paper);
  border-top: 1px solid var(--divider);
`;

const TextInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const StyledInput = styled.input<{ isValid: boolean }>`
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid ${({ isValid }) => isValid ? 'var(--color-primary-main)' : 'var(--color-error-main)'};
  border-radius: 4px;
  font-size: 1rem;
  line-height: 1.5;
  background: var(--background-default);
  color: var(--text-primary);
  transition: border-color 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: var(--color-primary-main);
    box-shadow: 0 0 0 2px var(--color-primary-main)1A;
  }

  &:disabled {
    background: var(--background-paper);
    cursor: not-allowed;
  }
`;

const CharacterCount = styled.span<{ isNearLimit: boolean }>`
  position: absolute;
  right: var(--spacing-sm);
  bottom: -20px;
  font-size: 0.75rem;
  color: ${({ isNearLimit }) => isNearLimit ? 'var(--color-error-main)' : 'var(--text-secondary)'};
`;

const ErrorMessage = styled.div`
  color: var(--color-error-main);
  font-size: 0.75rem;
  margin-top: var(--spacing-xs);
  position: absolute;
`;

// Component props interface
interface MessageInputProps {
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  onSubmit?: (message: Message) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = 1000,
  onSubmit
}) => {
  // State management
  const [messageContent, setMessageContent] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const voiceStatus = useSelector(selectVoiceProcessingStatus);

  // Character count calculation
  const characterCount = messageContent.length;
  const isNearLimit = characterCount > maxLength * 0.9;

  // Debounced validation
  const validateInput = useCallback(
    debounce((content: string) => {
      if (content.trim().length === 0) {
        setIsValid(false);
        setValidationError('Message cannot be empty');
        return;
      }

      if (content.length > maxLength) {
        setIsValid(false);
        setValidationError(`Message exceeds maximum length of ${maxLength} characters`);
        return;
      }

      setIsValid(true);
      setValidationError(null);
    }, 300),
    [maxLength]
  );

  // Input change handler
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const content = event.target.value;
    setMessageContent(content);
    validateInput(content);

    // Announce character count for screen readers when near limit
    if (isNearLimit) {
      const remainingChars = maxLength - content.length;
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = `${remainingChars} characters remaining`;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);
    }
  };

  // Form submission handler
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValid || disabled || voiceStatus === VoiceProcessingStatus.PROCESSING) {
      return;
    }

    const trimmedContent = messageContent.trim();
    if (!trimmedContent) {
      setIsValid(false);
      setValidationError('Message cannot be empty');
      return;
    }

    try {
      const message: Message = {
        id: crypto.randomUUID(),
        content: trimmedContent,
        role: MessageRole.USER,
        timestamp: Date.now(),
        hasAudio: false
      };

      dispatch(addMessage(message));
      onSubmit?.(message);
      setMessageContent('');
      setIsValid(true);
      setValidationError(null);
      inputRef.current?.focus();
    } catch (error) {
      dispatch(setError('Failed to send message. Please try again.'));
    }
  };

  // Keyboard event handler
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <InputContainer onSubmit={handleSubmit} role="form" aria-label="Message input form">
      <TextInputWrapper>
        <StyledInput
          ref={inputRef}
          type="text"
          value={messageContent}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || voiceStatus === VoiceProcessingStatus.PROCESSING}
          aria-label="Message input"
          aria-invalid={!isValid}
          aria-describedby={error ? 'message-error' : undefined}
          isValid={isValid}
          maxLength={maxLength}
          data-testid="message-input"
        />
        <CharacterCount 
          isNearLimit={isNearLimit}
          role="status"
          aria-live="polite"
        >
          {characterCount}/{maxLength}
        </CharacterCount>
        {error && (
          <ErrorMessage id="message-error" role="alert">
            {error}
          </ErrorMessage>
        )}
      </TextInputWrapper>
      <Button
        type="submit"
        disabled={!isValid || disabled || voiceStatus === VoiceProcessingStatus.PROCESSING}
        ariaLabel="Send message"
        variant="contained"
        color="primary"
        data-testid="send-button"
      >
        Send
      </Button>
    </InputContainer>
  );
};

export default MessageInput;