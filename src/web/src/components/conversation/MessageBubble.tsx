/**
 * @fileoverview MessageBubble component for rendering conversation messages
 * Implements Material Design principles with accessibility support and animations
 * @version 1.0.0
 */

import React from 'react'; // ^18.2.0
import styled from '@emotion/styled'; // ^11.11.0
import { Message, MessageRole } from '../../types/conversation.types';
import { THEME_COLORS } from '../../constants/theme.constants';
import { getRelativeTime } from '../../utils/date.utils';

// Props interface for the MessageBubble component
interface MessageBubbleProps {
  message: Message;
  isTyping?: boolean;
}

// Styled components for message bubble layout and styling
const BubbleContainer = styled.div<{ alignment: string }>`
  display: flex;
  justify-content: ${props => props.alignment};
  margin: 8px 0;
  width: 100%;
  transition: opacity 0.3s ease-in-out;
`;

const BubbleContent = styled.div<{ role: MessageRole; isTyping: boolean }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: ${props => getMessageColor(props.role)};
  color: ${props => getMessageTextColor(props.role)};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  opacity: ${props => props.isTyping ? 0.7 : 1};
  animation: ${props => props.isTyping ? 'typing 1s infinite' : 'none'};

  @keyframes typing {
    0% { opacity: 0.7; }
    50% { opacity: 0.4; }
    100% { opacity: 0.7; }
  }
`;

const MessageText = styled.p`
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Timestamp = styled.span`
  display: block;
  font-size: 0.75rem;
  margin-top: 4px;
  opacity: 0.7;
  color: inherit;
`;

// Helper function to determine message alignment
const getMessageAlignment = (role: MessageRole): string => {
  switch (role) {
    case MessageRole.USER:
      return 'flex-end';
    case MessageRole.AI:
      return 'flex-start';
    case MessageRole.SYSTEM:
      return 'center';
    default:
      return 'flex-start';
  }
};

// Helper function to determine message background color
const getMessageColor = (role: MessageRole): string => {
  switch (role) {
    case MessageRole.USER:
      return THEME_COLORS.primary.main;
    case MessageRole.AI:
      return THEME_COLORS.secondary.light;
    case MessageRole.SYSTEM:
      return THEME_COLORS.secondary.dark;
    default:
      return THEME_COLORS.background.main;
  }
};

// Helper function to determine message text color
const getMessageTextColor = (role: MessageRole): string => {
  switch (role) {
    case MessageRole.USER:
      return THEME_COLORS.primary.contrastText;
    case MessageRole.AI:
      return THEME_COLORS.secondary.contrastText;
    case MessageRole.SYSTEM:
      return THEME_COLORS.secondary.contrastText;
    default:
      return THEME_COLORS.secondary.contrastText;
  }
};

/**
 * MessageBubble component for rendering individual conversation messages
 * Implements WCAG 2.1 Level AA compliance and supports animations
 */
export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ 
  message, 
  isTyping = false 
}) => {
  const alignment = getMessageAlignment(message.role);
  const relativeTime = getRelativeTime(message.timestamp);

  return (
    <BubbleContainer
      alignment={alignment}
      role="listitem"
      aria-label={`${message.role} message from ${relativeTime}`}
    >
      <BubbleContent
        role={message.role}
        isTyping={isTyping}
        aria-live={message.role === MessageRole.AI ? "polite" : "off"}
      >
        <MessageText>
          {message.content}
        </MessageText>
        <Timestamp
          aria-label={`Sent ${relativeTime}`}
          title={new Date(message.timestamp).toLocaleString()}
        >
          {relativeTime}
        </Timestamp>
      </BubbleContent>
    </BubbleContainer>
  );
});

// Display name for debugging
MessageBubble.displayName = 'MessageBubble';