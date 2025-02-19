/**
 * @fileoverview MessageList component for rendering virtualized conversation messages
 * Implements accessible, performant message list with real-time updates and error handling
 * @version 1.0.0
 */

import React, { useRef, useCallback, useState, useEffect } from 'react'; // ^18.2.0
import styled from '@emotion/styled'; // ^11.11.0
import { useVirtualizer } from '@tanstack/react-virtual'; // ^3.0.0
import { useIntersectionObserver } from '@react-hooks/intersection-observer'; // ^1.0.0
import { Message, MessageRole } from '../../types/conversation.types';
import { MessageBubble } from './MessageBubble';
import { THEME_COLORS, SPACING_UNIT } from '../../constants/theme.constants';

// Styled components for message list layout
const ListContainer = styled.div<{ maxHeight: string | number }>`
  height: ${props => typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight};
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: ${THEME_COLORS.secondary.light} transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${THEME_COLORS.secondary.light};
    border-radius: 3px;
  }
`;

const VirtualList = styled.div`
  width: 100%;
  position: relative;
  padding: ${SPACING_UNIT}px;
`;

const ScrollToBottomButton = styled.button`
  position: absolute;
  bottom: ${SPACING_UNIT * 2}px;
  right: ${SPACING_UNIT * 2}px;
  background: ${THEME_COLORS.primary.main};
  color: ${THEME_COLORS.primary.contrastText};
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 1;

  &.visible {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    background: ${THEME_COLORS.primary.dark};
  }
`;

const ErrorMessage = styled.div`
  padding: ${SPACING_UNIT}px;
  margin: ${SPACING_UNIT}px;
  background: ${THEME_COLORS.error.light};
  color: ${THEME_COLORS.error.contrastText};
  border-radius: 4px;
  text-align: center;
`;

// Props interface for MessageList component
interface MessageListProps {
  messages: Message[];
  className?: string;
  ariaLabel?: string;
  maxHeight: string | number;
  onScrollEnd?: (endReached: boolean) => void;
  errorRetryCallback?: () => void;
}

/**
 * Custom hook for managing message list state and handlers
 */
const useMessageListHandlers = (
  messages: Message[],
  onScrollEnd?: (endReached: boolean) => void
) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrolledToBottom = 
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 1;
    
    setIsAtBottom(scrolledToBottom);
    setShowScrollButton(!scrolledToBottom);
    
    if (scrolledToBottom && onScrollEnd) {
      onScrollEnd(true);
    }
  }, [onScrollEnd]);

  const scrollToBottom = useCallback(() => {
    setIsAtBottom(true);
    setShowScrollButton(false);
  }, []);

  return {
    isAtBottom,
    showScrollButton,
    hasError,
    setHasError,
    handleScroll,
    scrollToBottom
  };
};

/**
 * MessageList component for rendering virtualized conversation messages
 * Implements WCAG 2.1 Level AA compliance with virtual scrolling
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  className,
  ariaLabel = 'Conversation messages',
  maxHeight,
  onScrollEnd,
  errorRetryCallback
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const virtualListRef = useRef<HTMLDivElement>(null);
  
  const {
    isAtBottom,
    showScrollButton,
    hasError,
    setHasError,
    handleScroll,
    scrollToBottom
  } = useMessageListHandlers(messages, onScrollEnd);

  // Set up virtualizer for efficient message rendering
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 80,
    overscan: 5
  });

  // Set up intersection observer for infinite scroll
  const [intersectionRef, entry] = useIntersectionObserver({
    threshold: 0.5,
    root: containerRef.current
  });

  // Handle automatic scrolling for new messages
  useEffect(() => {
    if (isAtBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  // Error boundary effect
  useEffect(() => {
    const handleError = () => {
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <ListContainer
      ref={containerRef}
      className={className}
      maxHeight={maxHeight}
      onScroll={handleScroll}
      role="log"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <VirtualList
        ref={virtualListRef}
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index];
          const isLastMessage = virtualRow.index === messages.length - 1;
          
          return (
            <div
              key={message.id}
              ref={isLastMessage ? intersectionRef : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageBubble
                message={message}
                isTyping={message.role === MessageRole.AI && isLastMessage}
              />
            </div>
          );
        })}
      </VirtualList>

      {showScrollButton && (
        <ScrollToBottomButton
          onClick={scrollToBottom}
          className={showScrollButton ? 'visible' : ''}
          aria-label="Scroll to latest messages"
        >
          ↓
        </ScrollToBottomButton>
      )}

      {hasError && (
        <ErrorMessage role="alert">
          An error occurred while loading messages.
          {errorRetryCallback && (
            <button onClick={errorRetryCallback}>
              Retry
            </button>
          )}
        </ErrorMessage>
      )}
    </ListContainer>
  );
};

// Display name for debugging
MessageList.displayName = 'MessageList';

// Default export
export default MessageList;