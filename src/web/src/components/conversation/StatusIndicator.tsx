import React from 'react'; // ^18.2.0
import { useSelector } from 'react-redux'; // ^9.0.0
import { ConversationStatus } from '../../types/conversation.types';
import { Tooltip } from '../shared/Tooltip';
import { selectCurrentConversation } from '../../store/slices/conversationSlice';

// Status color mapping using CSS variables from theme
const STATUS_COLORS = {
  [ConversationStatus.ACTIVE]: 'var(--color-success-main)',
  [ConversationStatus.PAUSED]: 'var(--color-warning-main)',
  [ConversationStatus.COMPLETED]: 'var(--color-info-main)',
  ERROR: 'var(--color-error-main)'
} as const;

// Status message mapping for tooltips
const STATUS_MESSAGES = {
  [ConversationStatus.ACTIVE]: 'Conversation active and ready',
  [ConversationStatus.PAUSED]: 'Conversation paused - click to resume',
  [ConversationStatus.COMPLETED]: 'Conversation completed',
  ERROR: 'Connection error - try refreshing'
} as const;

// Props interface for the StatusIndicator component
interface StatusIndicatorProps {
  className?: string;
}

/**
 * Gets the appropriate color for the current conversation status
 * @param status - Current conversation status
 * @returns CSS color variable
 */
const getStatusColor = (status: ConversationStatus | null): string => {
  if (!status) return STATUS_COLORS.ERROR;
  return STATUS_COLORS[status];
};

/**
 * Gets the appropriate message for the current conversation status
 * @param status - Current conversation status
 * @returns Status description message
 */
const getStatusMessage = (status: ConversationStatus | null): string => {
  if (!status) return STATUS_MESSAGES.ERROR;
  return STATUS_MESSAGES[status];
};

/**
 * A component that displays the current status of a voice conversation
 * with visual indicators and tooltips.
 * 
 * @component
 * @param props - Component props
 * @returns JSX.Element
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ className = '' }) => {
  // Get current conversation from Redux store
  const conversation = useSelector(selectCurrentConversation);
  
  // Get status color and message
  const statusColor = getStatusColor(conversation?.status ?? null);
  const statusMessage = getStatusMessage(conversation?.status ?? null);

  return (
    <Tooltip
      content={statusMessage}
      placement="top"
    >
      <div
        className={`status-indicator ${className}`}
        role="status"
        aria-label={statusMessage}
        style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          transition: 'background-color 200ms ease-in-out',
          boxShadow: `0 0 8px ${statusColor}`,
          // Pulse animation for active status
          animation: conversation?.status === ConversationStatus.ACTIVE
            ? 'pulse 2s infinite'
            : 'none'
        }}
      />
      <style>
        {`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 8px ${statusColor};
            }
            50% {
              box-shadow: 0 0 16px ${statusColor};
            }
            100% {
              box-shadow: 0 0 8px ${statusColor};
            }
          }
          
          .status-indicator {
            cursor: help;
          }
          
          .status-indicator:focus {
            outline: 2px solid var(--color-primary-main);
            outline-offset: 2px;
          }
          
          @media (prefers-reduced-motion: reduce) {
            .status-indicator {
              animation: none;
              transition: none;
            }
          }
        `}
      </style>
    </Tooltip>
  );
};

export default StatusIndicator;