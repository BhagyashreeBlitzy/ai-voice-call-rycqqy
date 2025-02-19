/**
 * @fileoverview Comprehensive test suite for conversation-related React components
 * Tests MessageBubble, MessageList, and ConversationHistory components
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { v4 as uuidv4 } from 'uuid';

import { MessageBubble } from '../../src/components/conversation/MessageBubble';
import { MessageList } from '../../src/components/conversation/MessageList';
import { ConversationHistory } from '../../src/components/conversation/ConversationHistory';
import { Message, MessageRole, ConversationStatus } from '../../src/types/conversation.types';
import { THEME_COLORS } from '../../src/constants/theme.constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock functions and data
const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: uuidv4(),
  content: 'Test message content',
  role: MessageRole.USER,
  timestamp: Date.now(),
  hasAudio: false,
  ...overrides
});

const createMockConversation = (messages: Message[] = [], overrides = {}) => ({
  id: uuidv4(),
  sessionId: uuidv4(),
  status: ConversationStatus.ACTIVE,
  messages,
  context: {
    lastMessageId: messages[messages.length - 1]?.id || '',
    turnCount: messages.length,
    state: {}
  },
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    duration: 0
  },
  ...overrides
});

// Utility function to render with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <div data-testid="theme-wrapper">
      {component}
    </div>
  );
};

describe('MessageBubble Component', () => {
  it('renders user message with correct styling', () => {
    const message = createMockMessage({ role: MessageRole.USER });
    const { container } = renderWithTheme(<MessageBubble message={message} />);
    
    const bubble = screen.getByRole('listitem');
    expect(bubble).toHaveStyle(`justify-content: flex-end`);
    expect(container).toHaveTextContent(message.content);
  });

  it('renders AI message with correct styling', () => {
    const message = createMockMessage({ role: MessageRole.AI });
    const { container } = renderWithTheme(<MessageBubble message={message} />);
    
    const bubble = screen.getByRole('listitem');
    expect(bubble).toHaveStyle(`justify-content: flex-start`);
    expect(container).toHaveTextContent(message.content);
  });

  it('shows typing animation when isTyping is true', () => {
    const message = createMockMessage({ role: MessageRole.AI });
    renderWithTheme(<MessageBubble message={message} isTyping={true} />);
    
    const content = screen.getByText(message.content);
    expect(content.parentElement).toHaveStyle('animation: typing 1s infinite');
  });

  it('meets accessibility requirements', async () => {
    const message = createMockMessage();
    const { container } = renderWithTheme(<MessageBubble message={message} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('MessageList Component', () => {
  const mockMessages = [
    createMockMessage({ role: MessageRole.USER }),
    createMockMessage({ role: MessageRole.AI }),
    createMockMessage({ role: MessageRole.USER })
  ];

  it('renders messages in correct order', () => {
    renderWithTheme(
      <MessageList 
        messages={mockMessages}
        maxHeight="500px"
      />
    );

    const messageElements = screen.getAllByRole('listitem');
    expect(messageElements).toHaveLength(mockMessages.length);
    expect(messageElements[0]).toHaveTextContent(mockMessages[0].content);
  });

  it('handles scroll events correctly', async () => {
    const onScrollEnd = jest.fn();
    const { container } = renderWithTheme(
      <MessageList 
        messages={mockMessages}
        maxHeight="200px"
        onScrollEnd={onScrollEnd}
      />
    );

    const listContainer = container.querySelector('[role="log"]');
    fireEvent.scroll(listContainer!, { target: { scrollTop: 1000 } });
    
    await waitFor(() => {
      expect(onScrollEnd).toHaveBeenCalledWith(true);
    });
  });

  it('shows scroll to bottom button when not at bottom', async () => {
    const { container } = renderWithTheme(
      <MessageList 
        messages={mockMessages}
        maxHeight="200px"
      />
    );

    const listContainer = container.querySelector('[role="log"]');
    fireEvent.scroll(listContainer!, { target: { scrollTop: 0 } });
    
    const scrollButton = await screen.findByRole('button', { name: /scroll to latest/i });
    expect(scrollButton).toBeVisible();
  });

  it('handles error states appropriately', () => {
    const errorRetryCallback = jest.fn();
    renderWithTheme(
      <MessageList 
        messages={[]}
        maxHeight="200px"
        errorRetryCallback={errorRetryCallback}
      />
    );

    const errorMessage = screen.getByRole('alert');
    const retryButton = within(errorMessage).getByRole('button');
    
    fireEvent.click(retryButton);
    expect(errorRetryCallback).toHaveBeenCalled();
  });
});

describe('ConversationHistory Component', () => {
  const mockConversation = createMockConversation([
    createMockMessage({ role: MessageRole.USER }),
    createMockMessage({ role: MessageRole.AI })
  ]);

  it('renders conversation with loading state', () => {
    renderWithTheme(
      <ConversationHistory 
        maxMessages={100}
        loadingBatchSize={20}
      />
    );

    const loadingOverlay = screen.getByRole('status', { name: /loading messages/i });
    expect(loadingOverlay).toBeInTheDocument();
  });

  it('handles real-time message updates', async () => {
    const { rerender } = renderWithTheme(
      <ConversationHistory maxMessages={100} />
    );

    const newMessage = createMockMessage({ role: MessageRole.AI });
    const updatedConversation = {
      ...mockConversation,
      messages: [...mockConversation.messages, newMessage]
    };

    rerender(
      <ConversationHistory 
        maxMessages={100}
        conversation={updatedConversation}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(newMessage.content)).toBeInTheDocument();
    });
  });

  it('implements error recovery', async () => {
    const { rerender } = renderWithTheme(
      <ConversationHistory maxMessages={100} />
    );

    // Simulate error state
    rerender(
      <ConversationHistory 
        maxMessages={100}
        error={new Error('Test error')}
      />
    );

    const errorMessage = screen.getByRole('alert');
    const retryButton = within(errorMessage).getByRole('button', { name: /retry/i });
    
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  it('meets accessibility requirements for keyboard navigation', async () => {
    const { container } = renderWithTheme(
      <ConversationHistory 
        maxMessages={100}
        conversation={mockConversation}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const messages = screen.getAllByRole('listitem');
    await userEvent.tab();
    expect(messages[0]).toHaveFocus();
  });
});