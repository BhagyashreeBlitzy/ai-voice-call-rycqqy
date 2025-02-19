/**
 * Core authentication interfaces for the AI Voice Agent application
 * Defines comprehensive type-safe structures for authentication flows,
 * token management, and user authorization
 * @version 1.0.0
 */

import { Result, UUID } from '../types/common.types';

/**
 * User authentication credentials with strict validation requirements
 * @interface IAuthCredentials
 */
export interface IAuthCredentials {
  /** User's email address (must be valid email format) */
  readonly email: string;
  /** User's password (must meet security requirements) */
  readonly password: string;
}

/**
 * Enhanced JWT token payload with role-based access control
 * Implements 15-minute token expiry as per security requirements
 * @interface ITokenPayload
 */
export interface ITokenPayload {
  /** Unique user identifier */
  readonly userId: UUID;
  /** User's email address */
  readonly email: string;
  /** Token issued at timestamp */
  readonly iat: number;
  /** Token expiration timestamp (15 minutes from issuance) */
  readonly exp: number;
  /** Token version for invalidation support */
  readonly version: string;
  /** User's role for authorization */
  readonly role: 'user' | 'premium' | 'admin';
}

/**
 * Comprehensive authentication token response
 * Includes both access and refresh tokens with expiry information
 * @interface IAuthToken
 */
export interface IAuthToken {
  /** JWT access token */
  readonly accessToken: string;
  /** Long-lived refresh token for token renewal */
  readonly refreshToken: string;
  /** Token expiration time in seconds */
  readonly expiresIn: number;
  /** Token type for Authorization header */
  readonly tokenType: 'Bearer';
}

/**
 * Extended authentication result with user information and metadata
 * Provides comprehensive context for authenticated sessions
 * @interface IAuthResult
 */
export interface IAuthResult {
  /** Authenticated user information */
  readonly user: {
    /** User's unique identifier */
    readonly id: UUID;
    /** User's email address */
    readonly email: string;
    /** User's role */
    readonly role: string;
    /** Last successful login timestamp */
    readonly lastLogin: Date;
  };
  /** Authentication tokens */
  readonly tokens: IAuthToken;
  /** Session metadata */
  readonly metadata: {
    /** Client device information */
    readonly deviceInfo: string;
    /** Client IP address */
    readonly ipAddress: string;
    /** Login timestamp */
    readonly loginTimestamp: Date;
  };
}

/**
 * Enhanced Express Request interface with authenticated user context
 * Extends the base Request type with authentication information
 * @interface IAuthRequest
 */
export interface IAuthRequest {
  /** Authenticated user information */
  readonly user: {
    /** User's unique identifier */
    readonly id: UUID;
    /** User's email address */
    readonly email: string;
    /** User's role */
    readonly role: string;
  };
  /** Active session information */
  readonly session: {
    /** Session identifier */
    readonly id: string;
    /** Session creation timestamp */
    readonly createdAt: Date;
    /** Session expiration timestamp */
    readonly expiresAt: Date;
  };
}

/**
 * Type alias for authentication operation results
 * Provides type-safe result handling for auth operations
 */
export type AuthenticationResult = Result<IAuthResult>;