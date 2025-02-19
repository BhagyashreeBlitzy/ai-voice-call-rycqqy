/**
 * @fileoverview ConversationHistory component for managing and displaying conversation history
 * Implements real-time updates, accessibility features, and optimized performance
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { useVirtualizer } from '@tanstack/react-virtual';

import { MessageList } from './MessageList';
import { Conversation, ConversationStatus } from '../../types/conversation.types';
import { useConversation } from '../../hooks/useConversation';
import { THEME_COLORS, SPACING_UNIT } from '../../constants/theme.constants';

// Styled components for conversation layout
const ConversationContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${THEME_COLORS.background};
  position: relative;
`;

const LoadingOverlay = styled.div<{ visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.visible ? 1 : 0};
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  transition: opacity 0.3s ease;
  z-index: 1;
`;

const ErrorContainer = styled.div`
  padding: ${SPACING_UNIT * 2}px;
  margin: ${SPACING_UNIT}px;
  background: ${THEME_COLORS.error.light};
  color: ${THEME_COLORS.error.contrastText};
  border-radius: 4px;
  text-align: center;
`;

const RetryButton = styled.button`
  margin-top: ${SPACING_UNIT}px;
  padding: ${SPACING_UNIT}px ${SPACING_UNIT * 2}px;
  background: ${THEME_COLORS.primary.main};
  color: ${THEME_COLORS.primary.contrastText};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background: ${THEME_COLORS.primary.dark};
  }
`;

// Props interface
interface ConversationHistoryProps {
  className?: string;
  maxMessages?: number;
  loadingBatchSize?: number;
  retryAttempts?: number;
}

/**
 * ConversationHistory component for displaying and managing conversation messages
 * Implements virtualization, real-time updates, and accessibility features
 */
export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  className,
  maxMessages = 100,
  loadingBatchSize = 20,
  retryAttempts = 3
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const { conversation, isProcessing, error, resetErrorState } = useConversation();

  // Set up virtualizer for efficient message rendering
  const rowVirtualizer = useVirtualizer({
    count: conversation?.messages?.length || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 80,
    overscan: 5
  });

  /**
   * Handles scroll events for progressive loading and scroll position management
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrolledToBottom = 
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 1;
    
    setIsScrolledToBottom(scrolledToBottom);
  }, []);

  /**
   * Scrolls to bottom when new messages arrive and user was already at bottom
   */
  useEffect(() => {
    if (isScrolledToBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [conversation?.messages, isScrolledToBottom]);

  /**
   * Renders empty state when no conversation exists
   */
  const renderEmptyState = () => (
    <div 
      role="status" 
      aria-label="No conversation started"
      style={{ padding: SPACING_UNIT * 2 }}
    >
      <p>Start a conversation to begin</p>
    </div>
  );

  /**
   * Renders error state with retry option
   */
  const renderError = () => (
    <ErrorContainer role="alert">
      <p>{error?.message || 'An error occurred while loading messages'}</p>
      <RetryButton 
        onClick={resetErrorState}
        aria-label="Retry loading messages"
      >
        Retry
      </RetryButton>
    </ErrorContainer>
  );

  return (
    <ConversationContainer 
      ref={containerRef}
      className={className}
      role="log"
      aria-live="polite"
      aria-label="Conversation history"
    >
      {conversation ? (
        <MessageList
          messages={conversation.messages}
          className="conversation-messages"
          onScroll={handleScroll}
          virtualized
          maxHeight="100%"
        />
      ) : (
        renderEmptyState()
      )}

      <LoadingOverlay 
        visible={isProcessing}
        aria-hidden={!isProcessing}
      >
        <div role="status" aria-label="Loading messages">
          Loading...
        </div>
      </LoadingOverlay>

      {error && renderError()}
    </ConversationContainer>
  );
};

// Display name for debugging
ConversationHistory.displayName = 'ConversationHistory';

// Default export
export default ConversationHistory;