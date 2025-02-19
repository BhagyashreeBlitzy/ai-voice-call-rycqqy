/**
 * Conversation interface definitions for AI Voice Agent
 * Provides comprehensive type definitions for managing voice-based AI conversations
 * with enhanced support for real-time dialog tracking and analytics
 * @version 1.0.0
 */

import { Result } from '../types/common.types';
import { Message } from './message.interface';
import { ISessionState } from './session.interface';

/**
 * Enum defining possible states of a conversation
 */
export enum ConversationStatus {
  /** Conversation is currently active with ongoing interaction */
  ACTIVE = 'ACTIVE',
  /** Conversation temporarily suspended but can be resumed */
  PAUSED = 'PAUSED',
  /** Conversation has ended and is archived */
  COMPLETED = 'COMPLETED'
}

/**
 * Enhanced conversation context for maintaining dialog state with timing metrics
 */
export interface ConversationContext {
  /** ID of the last message in the conversation */
  lastMessageId: string;
  /** Number of conversation turns completed */
  turnCount: number;
  /** Dynamic state object for conversation context */
  state: Record<string, unknown>;
  /** Duration of the last user speech input in milliseconds */
  lastUserSpeechDuration: number;
  /** Duration of the last AI response in milliseconds */
  lastAIResponseDuration: number;
}

/**
 * Extended metadata for conversation tracking and analytics
 */
export interface ConversationMetadata {
  /** Conversation creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Total conversation duration in milliseconds */
  duration: number;
  /** Total number of messages exchanged */
  messageCount: number;
  /** Average AI response time in milliseconds */
  averageResponseTime: number;
}

/**
 * Main conversation interface representing an AI voice conversation
 */
export interface Conversation {
  /** Unique conversation identifier */
  id: string;
  /** Associated session identifier */
  sessionId: string;
  /** Current conversation status */
  status: ConversationStatus;
  /** Array of messages in the conversation */
  messages: Message[];
  /** Conversation context and state tracking */
  context: ConversationContext;
  /** Conversation metadata and analytics */
  metadata: ConversationMetadata;
}

/**
 * Parameters for creating a new conversation with enhanced options
 */
export interface ConversationCreateParams {
  /** Associated session identifier */
  sessionId: string;
  /** Initial conversation context state */
  initialContext?: Record<string, unknown>;
  /** Preferred language for the conversation */
  preferredLanguage: string;
}

/**
 * Comprehensive service interface for conversation management
 */
export interface IConversationService {
  /**
   * Creates a new conversation
   * @param params Conversation creation parameters
   * @returns Promise resolving to the created conversation
   */
  createConversation(params: ConversationCreateParams): Promise<Result<Conversation>>;

  /**
   * Retrieves a conversation by ID
   * @param id Conversation identifier
   * @returns Promise resolving to the requested conversation
   */
  getConversation(id: string): Promise<Result<Conversation>>;

  /**
   * Updates an existing conversation
   * @param id Conversation identifier
   * @param updates Partial conversation updates
   * @returns Promise resolving to the updated conversation
   */
  updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<Result<Conversation>>;

  /**
   * Ends a conversation and updates its status to COMPLETED
   * @param id Conversation identifier
   * @returns Promise resolving to void on successful completion
   */
  endConversation(id: string): Promise<Result<void>>;

  /**
   * Retrieves conversation metrics and analytics
   * @param id Conversation identifier
   * @returns Promise resolving to conversation metadata
   */
  getConversationMetrics(id: string): Promise<Result<ConversationMetadata>>;
}