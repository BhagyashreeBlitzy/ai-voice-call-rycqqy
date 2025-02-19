/**
 * Core TypeScript type definitions and interfaces for backend services
 * Provides comprehensive type safety and standardization for API responses,
 * error handling, and common utility types
 * @version 1.0.0
 */

/**
 * Branded type for UNIX timestamps ensuring type safety
 */
export type Timestamp = number & { readonly __brand: unique symbol };

/**
 * Branded type for UUID strings with format validation
 */
export type UUID = string & { readonly __brand: unique symbol };

/**
 * Generic result wrapper providing type-safe operation results with optional metadata
 * @template T The type of the successful result data
 */
export interface Result<T> {
  /** Indicates whether the operation was successful */
  readonly success: boolean;
  /** The result data (only present if success is true) */
  readonly data: T;
  /** Error information (only present if success is false) */
  readonly error: ErrorInfo | null;
  /** Optional metadata associated with the result */
  readonly metadata: Record<string, unknown>;
}

/**
 * Comprehensive error information structure with debugging support
 */
export interface ErrorInfo {
  /** Unique error code for the specific error type */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Additional error details and context */
  readonly details: Record<string, unknown>;
  /** Stack trace (only included in development environment) */
  readonly stack?: string;
  /** Error occurrence timestamp */
  readonly timestamp: Timestamp;
}

/**
 * Enhanced pagination structure with navigation helpers
 */
export interface Pagination {
  /** Current page number (1-based) */
  readonly page: number;
  /** Number of items per page */
  readonly limit: number;
  /** Total number of pages available */
  readonly totalPages: number;
  /** Total number of items across all pages */
  readonly totalItems: number;
  /** Indicates if there is a next page available */
  readonly hasNext: boolean;
  /** Indicates if there is a previous page available */
  readonly hasPrevious: boolean;
}

/**
 * Immutable paginated result wrapper with type safety
 * @template T The type of items in the paginated result
 */
export interface PaginatedResult<T> {
  /** Array of items for the current page */
  readonly items: readonly T[];
  /** Pagination information */
  readonly pagination: Readonly<Pagination>;
}

/**
 * Detailed validation error structure with constraint information
 */
export interface ValidationError {
  /** Name of the field that failed validation */
  readonly field: string;
  /** Human-readable validation error message */
  readonly message: string;
  /** The invalid value that was provided */
  readonly value: unknown;
  /** The validation constraint that was violated */
  readonly constraint: string;
  /** Additional validation context */
  readonly context: Record<string, unknown>;
}

/**
 * Comprehensive HTTP status codes enum with common codes
 */
export enum HttpStatusCode {
  /** Request succeeded */
  OK = 200,
  /** Resource created successfully */
  CREATED = 201,
  /** Invalid request parameters */
  BAD_REQUEST = 400,
  /** Authentication required */
  UNAUTHORIZED = 401,
  /** Insufficient permissions */
  FORBIDDEN = 403,
  /** Resource not found */
  NOT_FOUND = 404,
  /** Server encountered an error */
  INTERNAL_SERVER_ERROR = 500,
  /** Service is temporarily unavailable */
  SERVICE_UNAVAILABLE = 503
}