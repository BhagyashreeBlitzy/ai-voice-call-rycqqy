/**
 * @fileoverview TypeScript type definitions for client-side conversation management
 * Defines core data structures for managing AI voice conversations and dialog flow
 * @version 1.0.0
 */

/**
 * Enum defining possible states of a conversation
 */
export enum ConversationStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    COMPLETED = 'completed'
}

/**
 * Enum defining possible roles for message senders
 */
export enum MessageRole {
    USER = 'user',
    AI = 'ai',
    SYSTEM = 'system'
}

/**
 * Interface representing a single message in a conversation
 */
export interface Message {
    /** Unique identifier for the message */
    id: string;
    /** Text content of the message */
    content: string;
    /** Role of the message sender */
    role: MessageRole;
    /** Unix timestamp of message creation */
    timestamp: number;
    /** Indicates if message has associated audio recording */
    hasAudio: boolean;
}

/**
 * Interface for maintaining conversation context and state
 */
export interface ConversationContext {
    /** ID of the most recent message */
    lastMessageId: string;
    /** Number of conversation turns completed */
    turnCount: number;
    /** Arbitrary state data for conversation tracking */
    state: Record<string, unknown>;
}

/**
 * Interface for conversation timing and metadata
 */
export interface ConversationMetadata {
    /** Unix timestamp of conversation creation */
    createdAt: number;
    /** Unix timestamp of last update */
    updatedAt: number;
    /** Total duration of conversation in milliseconds */
    duration: number;
}

/**
 * Main interface representing a client-side conversation
 */
export interface Conversation {
    /** Unique identifier for the conversation */
    id: string;
    /** Associated session identifier */
    sessionId: string;
    /** Current status of the conversation */
    status: ConversationStatus;
    /** Array of messages in the conversation */
    messages: Message[];
    /** Conversation context data */
    context: ConversationContext;
    /** Conversation metadata */
    metadata: ConversationMetadata;
}

/**
 * Interface for conversation-related events
 */
export interface ConversationEvent {
    /** Type of the event */
    type: string;
    /** Event payload - can be a Message, Error, or ConversationStatus */
    payload: Message | Error | ConversationStatus;
    /** Unix timestamp of the event */
    timestamp: number;
}