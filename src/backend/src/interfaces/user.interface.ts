/**
 * User-related interfaces and types for the AI Voice Agent system
 * Provides comprehensive type definitions for user management with strict type safety
 * @version 1.0.0
 */

import { UUID, Result } from '../types/common.types';

/**
 * Supported voice IDs for text-to-speech synthesis
 */
export type VoiceId = 'neural-1' | 'neural-2' | 'standard-1' | 'standard-2';

/**
 * ISO 639-1 language codes supported by the system
 */
export type LanguageCode = 'en-US' | 'en-GB' | 'es-ES' | 'fr-FR' | 'de-DE';

/**
 * Available UI theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * User account status enumeration
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

/**
 * User preferences configuration interface
 */
export interface IUserPreferences {
  /** Selected voice for TTS synthesis */
  readonly voiceId: VoiceId;
  /** Preferred interface language */
  readonly language: LanguageCode;
  /** UI theme selection */
  readonly theme: Theme;
  /** Notification preferences */
  readonly notifications: boolean;
}

/**
 * Core user interface with immutable properties
 */
export interface IUser {
  /** Unique user identifier */
  readonly id: UUID;
  /** User's email address */
  readonly email: string;
  /** Current account status */
  readonly status: UserStatus;
  /** User preferences with immutability */
  readonly preferences: Readonly<IUserPreferences>;
  /** Account creation timestamp */
  readonly createdAt: number;
  /** Last update timestamp */
  readonly updatedAt: number;
}

/**
 * Parameters required for user creation
 */
export interface IUserCreateParams {
  /** User's email address */
  email: string;
  /** User's password (will be hashed) */
  password: string;
  /** Optional initial preferences */
  preferences?: Partial<IUserPreferences>;
}

/**
 * Parameters for updating user information
 */
export interface IUserUpdateParams {
  /** Updated email address */
  email?: string;
  /** Updated preferences (partial updates supported) */
  preferences?: Partial<IUserPreferences>;
  /** Updated account status */
  status?: UserStatus;
}

/**
 * Database transaction type for atomic operations
 */
export type Transaction = unknown;

/**
 * User service interface for managing user operations
 */
export interface IUserService {
  /**
   * Creates a new user account
   * @param params User creation parameters
   * @param transaction Optional transaction for atomic operations
   * @returns Promise resolving to Result containing the created user
   */
  createUser(params: IUserCreateParams, transaction?: Transaction): Promise<Result<IUser>>;

  /**
   * Retrieves a user by their ID
   * @param id User's UUID
   * @returns Promise resolving to Result containing the user if found
   */
  getUser(id: UUID): Promise<Result<IUser>>;

  /**
   * Updates an existing user's information
   * @param id User's UUID
   * @param params Update parameters
   * @param transaction Optional transaction for atomic operations
   * @returns Promise resolving to Result containing the updated user
   */
  updateUser(id: UUID, params: IUserUpdateParams, transaction?: Transaction): Promise<Result<IUser>>;

  /**
   * Deletes a user account
   * @param id User's UUID
   * @param transaction Optional transaction for atomic operations
   * @returns Promise resolving to Result indicating deletion success
   */
  deleteUser(id: UUID, transaction?: Transaction): Promise<Result<void>>;
}