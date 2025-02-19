/**
 * @fileoverview Date and time utility functions for the AI Voice Agent application
 * Provides comprehensive date formatting, timezone handling, and accessibility support
 * @version 1.0.0
 */

import { format, formatDistance } from 'date-fns'; // ^2.30.0
import { Message, ConversationMetadata } from '../types/conversation.types';

/**
 * Options for timestamp formatting
 */
interface TimestampFormatOptions {
  locale?: Locale;
  timezone?: string;
  includeTime?: boolean;
  addAria?: boolean;
}

/**
 * Options for relative time formatting
 */
interface RelativeTimeOptions {
  locale?: Locale;
  addSuffix?: boolean;
  includeSeconds?: boolean;
}

/**
 * Options for duration formatting
 */
interface DurationFormatOptions {
  precision?: 'seconds' | 'milliseconds';
  locale?: Locale;
  compact?: boolean;
}

/**
 * Error class for invalid timestamp handling
 */
class InvalidTimestampError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTimestampError';
  }
}

/**
 * Formats a Unix timestamp into a human-readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @param formatString - Optional date-fns format string
 * @param options - Formatting options
 * @returns Formatted date string with accessibility support
 * @throws {InvalidTimestampError} If timestamp is invalid
 */
export const formatTimestamp = (
  timestamp: number,
  formatString: string = 'PPpp',
  options: TimestampFormatOptions = {}
): string => {
  if (!timestamp || isNaN(timestamp)) {
    throw new InvalidTimestampError('Invalid timestamp provided');
  }

  const {
    locale,
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    includeTime = true,
    addAria = true
  } = options;

  const date = new Date(timestamp);
  
  // Format the date using date-fns
  const formattedDate = format(date, formatString, {
    locale,
    timeZone: timezone
  });

  // Add accessibility support
  if (addAria) {
    return `<time datetime="${date.toISOString()}" aria-label="${formattedDate}">${formattedDate}</time>`;
  }

  return formattedDate;
};

/**
 * Converts a timestamp to a relative time string
 * @param timestamp - Unix timestamp in milliseconds
 * @param options - Formatting options
 * @returns Localized relative time string
 * @throws {InvalidTimestampError} If timestamp is invalid
 */
export const getRelativeTime = (
  timestamp: number,
  options: RelativeTimeOptions = {}
): string => {
  if (!timestamp || isNaN(timestamp)) {
    throw new InvalidTimestampError('Invalid timestamp provided');
  }

  const { locale, addSuffix = true, includeSeconds = true } = options;
  const date = new Date(timestamp);
  const now = new Date();

  return formatDistance(date, now, {
    locale,
    addSuffix,
    includeSeconds
  });
};

/**
 * Formats a duration in milliseconds to a readable string
 * @param durationMs - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted duration string
 * @throws {Error} If duration is negative
 */
export const formatDuration = (
  durationMs: number,
  options: DurationFormatOptions = {}
): string => {
  if (durationMs < 0) {
    throw new Error('Duration cannot be negative');
  }

  const { precision = 'seconds', compact = false } = options;

  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const milliseconds = durationMs % 1000;

  if (compact) {
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    if (precision === 'milliseconds') {
      return `${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
    }
    return `${seconds}s`;
  }

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0 || parts.length === 0) {
    if (precision === 'milliseconds' && milliseconds > 0) {
      parts.push(`${seconds}.${milliseconds.toString().padStart(3, '0')} seconds`);
    } else {
      parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
    }
  }

  return parts.join(' ');
};

/**
 * Checks if a timestamp is from the current day
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Boolean indicating if timestamp is from today
 */
export const isToday = (timestamp: number): boolean => {
  if (!timestamp || isNaN(timestamp)) {
    throw new InvalidTimestampError('Invalid timestamp provided');
  }

  const date = new Date(timestamp);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

/**
 * Converts a Date object to a Unix timestamp in milliseconds
 * @param date - Date object to convert
 * @returns Unix timestamp in milliseconds
 * @throws {Error} If date is invalid
 */
export const getTimestampFromDate = (date: Date): number => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided');
  }

  return date.getTime();
};

/**
 * Type guard to check if an object is a valid Message
 * @param obj - Object to check
 * @returns Type predicate for Message interface
 */
export const isValidMessage = (obj: any): obj is Message => {
  return (
    obj &&
    typeof obj.timestamp === 'number' &&
    !isNaN(obj.timestamp) &&
    obj.timestamp > 0
  );
};

/**
 * Type guard to check if an object is valid ConversationMetadata
 * @param obj - Object to check
 * @returns Type predicate for ConversationMetadata interface
 */
export const isValidConversationMetadata = (obj: any): obj is ConversationMetadata => {
  return (
    obj &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number' &&
    !isNaN(obj.createdAt) &&
    !isNaN(obj.updatedAt) &&
    obj.createdAt > 0 &&
    obj.updatedAt >= obj.createdAt
  );
};