/**
 * Error Types and Constants Module
 * 
 * This module defines standardized error types and error code constants for the 
 * Node.js tutorial application's backend. It provides a base AppError class for 
 * structured error handling, specific error subclasses for common HTTP error 
 * scenarios, and a set of error code constants.
 * 
 * Key Features:
 * - Consistent error object structure with code, message, status, and details
 * - Integration with Express 5's automatic promise rejection handling
 * - Secure error handling without sensitive information disclosure
 * - Structured error responses for monitoring and logging
 * - Educational clarity with comprehensive error management patterns
 * 
 * Usage:
 * - Import specific error classes: import { BadRequestError, NotFoundError } from './errorTypes.js'
 * - Import error codes: import { ERROR_CODES } from './errorTypes.js'
 * - Throw errors: throw new BadRequestError('Invalid input data', { field: 'email' })
 * - Handle in middleware: error instanceof AppError
 * 
 * @fileoverview Standardized error types for structured error handling
 * @author Node.js Tutorial Application
 * @version 1.0.0
 */

/**
 * Standardized Error Code Constants
 * 
 * Provides a centralized set of error code constants used throughout the application
 * for consistent error identification, logging, and client-side error handling.
 * These constants are used by all error classes and middleware for standardized
 * error response generation.
 * 
 * @constant {Object} ERROR_CODES
 * @property {string} BAD_REQUEST - Client error for invalid requests (400)
 * @property {string} NOT_FOUND - Resource not found error (404)
 * @property {string} INTERNAL_ERROR - Server internal error (500)
 * @property {string} VALIDATION_ERROR - Input validation failure (422)
 * @property {string} UNAUTHORIZED - Authentication required/failed (401)
 * @property {string} FORBIDDEN - Insufficient permissions (403)
 */
const ERROR_CODES = {
    BAD_REQUEST: 'BAD_REQUEST',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN'
};

/**
 * Base Application Error Class
 * 
 * Extends the built-in Error class to provide structured error handling with
 * consistent properties for all application errors. This class serves as the
 * foundation for all custom error types and ensures integration with Express 5's
 * automatic promise rejection handling and error middleware pipeline.
 * 
 * Features:
 * - Consistent error object structure across the application
 * - Integration with Express error handling middleware
 * - Support for additional error details and context
 * - Proper stack trace capture for debugging
 * - Educational clarity for error handling patterns
 * 
 * @class AppError
 * @extends {Error}
 */
class AppError extends Error {
    /**
     * Creates a new AppError instance with structured error information
     * 
     * Initializes the base Error class and adds custom properties for
     * standardized error handling. Captures stack trace for debugging
     * and sets up the error object structure used throughout the application.
     * 
     * @param {string} message - Human-readable error message
     * @param {string} code - Error code constant from ERROR_CODES
     * @param {number} status - HTTP status code for the error
     * @param {Object} [details=null] - Additional error details and context
     * 
     * @example
     * // Create a custom application error
     * const error = new AppError(
     *   'Database connection failed',
     *   ERROR_CODES.INTERNAL_ERROR,
     *   500,
     *   { database: 'users', timeout: 5000 }
     * );
     */
    constructor(message, code, status, details = null) {
        // Initialize the base Error class with the provided message
        super(message);
        
        // Set the error name to the class name for proper error identification
        this.name = this.constructor.name;
        
        // Assign the error message (redundant but explicit for clarity)
        this.message = message;
        
        // Set the error code for consistent error identification
        this.code = code;
        
        // Set the HTTP status code for response generation
        this.status = status;
        
        // Add additional error details if provided
        this.details = details;
        
        // Capture the stack trace for debugging purposes
        // This excludes the constructor call from the stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Bad Request Error (400)
 * 
 * Represents a 400 Bad Request error for invalid client input or malformed requests.
 * This error is used when the client sends a request that the server cannot or
 * will not process due to client error (e.g., malformed request syntax, invalid
 * request message framing, or deceptive request routing).
 * 
 * Common use cases:
 * - Invalid request format or syntax
 * - Missing required parameters
 * - Malformed JSON in request body
 * - Invalid query parameters
 * 
 * @class BadRequestError
 * @extends {AppError}
 */
class BadRequestError extends AppError {
    /**
     * Creates a new BadRequestError instance
     * 
     * Initializes a Bad Request error with appropriate HTTP status code and
     * error code constant. Provides a default error message while allowing
     * customization for specific error scenarios.
     * 
     * @param {string} [message='Bad request'] - Error message (default: 'Bad request')
     * @param {Object} [details=null] - Additional error details and context
     * 
     * @example
     * // Basic bad request error
     * throw new BadRequestError();
     * 
     * @example
     * // Bad request with custom message and details
     * throw new BadRequestError(
     *   'Invalid request format',
     *   { expected: 'JSON', received: 'XML' }
     * );
     */
    constructor(message = 'Bad request', details = null) {
        // Call the parent AppError constructor with appropriate parameters
        super(message, ERROR_CODES.BAD_REQUEST, 400, details);
    }
}

/**
 * Not Found Error (404)
 * 
 * Represents a 404 Not Found error when a requested resource or route does not exist.
 * This error is used when the server can't find the requested resource, whether it's
 * a route, file, or data entity that the client is trying to access.
 * 
 * Common use cases:
 * - Undefined API routes
 * - Missing resources or entities
 * - Incorrect URL paths
 * - Deleted or moved resources
 * 
 * @class NotFoundError
 * @extends {AppError}
 */
class NotFoundError extends AppError {
    /**
     * Creates a new NotFoundError instance
     * 
     * Initializes a Not Found error with appropriate HTTP status code and
     * error code constant. Provides a default error message while allowing
     * customization for specific resource types.
     * 
     * @param {string} [message='Not found'] - Error message (default: 'Not found')
     * @param {Object} [details=null] - Additional error details and context
     * 
     * @example
     * // Basic not found error
     * throw new NotFoundError();
     * 
     * @example
     * // Not found with custom message and details
     * throw new NotFoundError(
     *   'User not found',
     *   { userId: 123, resource: 'users' }
     * );
     */
    constructor(message = 'Not found', details = null) {
        // Call the parent AppError constructor with appropriate parameters
        super(message, ERROR_CODES.NOT_FOUND, 404, details);
    }
}

/**
 * Internal Server Error (500)
 * 
 * Represents a 500 Internal Server Error for unexpected or unhandled server errors.
 * This error is used when the server encounters an unexpected condition that prevents
 * it from fulfilling the request. It indicates a server-side error that is not
 * specifically addressed by other error types.
 * 
 * Common use cases:
 * - Unexpected exceptions and runtime errors
 * - Database connection failures
 * - External service unavailability
 * - Configuration errors
 * 
 * @class InternalServerError
 * @extends {AppError}
 */
class InternalServerError extends AppError {
    /**
     * Creates a new InternalServerError instance
     * 
     * Initializes an Internal Server Error with appropriate HTTP status code and
     * error code constant. Provides a default error message while allowing
     * customization for specific error scenarios.
     * 
     * @param {string} [message='Internal server error'] - Error message (default: 'Internal server error')
     * @param {Object} [details=null] - Additional error details and context
     * 
     * @example
     * // Basic internal server error
     * throw new InternalServerError();
     * 
     * @example
     * // Internal server error with custom message and details
     * throw new InternalServerError(
     *   'Database connection failed',
     *   { database: 'users', error: 'timeout' }
     * );
     */
    constructor(message = 'Internal server error', details = null) {
        // Call the parent AppError constructor with appropriate parameters
        super(message, ERROR_CODES.INTERNAL_ERROR, 500, details);
    }
}

/**
 * Validation Error (422)
 * 
 * Represents a 422 Validation Error for input validation failures.
 * This error is used when the server understands the content type of the request
 * entity and the syntax is correct, but it was unable to process the contained
 * instructions due to semantic errors or validation failures.
 * 
 * Common use cases:
 * - Form validation failures
 * - Schema validation errors
 * - Business rule violations
 * - Data format validation errors
 * 
 * @class ValidationError
 * @extends {AppError}
 */
class ValidationError extends AppError {
    /**
     * Creates a new ValidationError instance
     * 
     * Initializes a Validation Error with appropriate HTTP status code and
     * error code constant. Provides a default error message while allowing
     * customization for specific validation scenarios.
     * 
     * @param {string} [message='Validation error'] - Error message (default: 'Validation error')
     * @param {Object} [details=null] - Additional error details and context
     * 
     * @example
     * // Basic validation error
     * throw new ValidationError();
     * 
     * @example
     * // Validation error with custom message and details
     * throw new ValidationError(
     *   'Invalid email format',
     *   { field: 'email', value: 'invalid-email', rule: 'email_format' }
     * );
     */
    constructor(message = 'Validation error', details = null) {
        // Call the parent AppError constructor with appropriate parameters
        super(message, ERROR_CODES.VALIDATION_ERROR, 422, details);
    }
}

/**
 * Unauthorized Error (401)
 * 
 * Represents a 401 Unauthorized error when authentication is required and has
 * failed or not been provided. This error indicates that the request has not
 * been applied because it lacks valid authentication credentials for the target
 * resource.
 * 
 * Common use cases:
 * - Missing authentication tokens
 * - Invalid or expired credentials
 * - Failed login attempts
 * - Unauthenticated access to protected resources
 * 
 * @class UnauthorizedError
 * @extends {AppError}
 */
class UnauthorizedError extends AppError {
    /**
     * Creates a new UnauthorizedError instance
     * 
     * Initializes an Unauthorized Error with appropriate HTTP status code and
     * error code constant. Provides a default error message while allowing
     * customization for specific authentication scenarios.
     * 
     * @param {string} [message='Unauthorized'] - Error message (default: 'Unauthorized')
     * @param {Object} [details=null] - Additional error details and context
     * 
     * @example
     * // Basic unauthorized error
     * throw new UnauthorizedError();
     * 
     * @example
     * // Unauthorized error with custom message and details
     * throw new UnauthorizedError(
     *   'Invalid authentication token',
     *   { token: 'expired', expiresAt: '2024-01-01T00:00:00Z' }
     * );
     */
    constructor(message = 'Unauthorized', details = null) {
        // Call the parent AppError constructor with appropriate parameters
        super(message, ERROR_CODES.UNAUTHORIZED, 401, details);
    }
}

/**
 * Forbidden Error (403)
 * 
 * Represents a 403 Forbidden error when the authenticated user does not have
 * permission to access the resource. This error indicates that the server
 * understood the request but refuses to authorize it, typically due to
 * insufficient permissions or access rights.
 * 
 * Common use cases:
 * - Insufficient user permissions
 * - Role-based access control violations
 * - Resource access restrictions
 * - Administrative privilege requirements
 * 
 * @class ForbiddenError
 * @extends {AppError}
 */
class ForbiddenError extends AppError {
    /**
     * Creates a new ForbiddenError instance
     * 
     * Initializes a Forbidden Error with appropriate HTTP status code and
     * error code constant. Provides a default error message while allowing
     * customization for specific authorization scenarios.
     * 
     * @param {string} [message='Forbidden'] - Error message (default: 'Forbidden')
     * @param {Object} [details=null] - Additional error details and context
     * 
     * @example
     * // Basic forbidden error
     * throw new ForbiddenError();
     * 
     * @example
     * // Forbidden error with custom message and details
     * throw new ForbiddenError(
     *   'Insufficient permissions to access resource',
     *   { resource: 'admin_panel', userRole: 'user', requiredRole: 'admin' }
     * );
     */
    constructor(message = 'Forbidden', details = null) {
        // Call the parent AppError constructor with appropriate parameters
        super(message, ERROR_CODES.FORBIDDEN, 403, details);
    }
}

/**
 * Module Exports
 * 
 * Exports all error classes and constants for use throughout the application.
 * This provides a single source of truth for error types and error codes,
 * enabling consistent error handling across middleware, route handlers, and
 * response formatting utilities.
 * 
 * Export Structure:
 * - ERROR_CODES: Object containing all error code constants
 * - AppError: Base error class for all custom application errors
 * - Specific Error Classes: All HTTP error scenario classes
 * 
 * Usage Examples:
 * - import { ERROR_CODES, AppError } from './errorTypes.js'
 * - import { BadRequestError, NotFoundError } from './errorTypes.js'
 * - const { InternalServerError } = require('./errorTypes.js')
 */

// Export the error code constants object
export { ERROR_CODES };

// Export the base AppError class
export { AppError };

// Export all specific error classes
export { BadRequestError };
export { NotFoundError };
export { InternalServerError };
export { ValidationError };
export { UnauthorizedError };
export { ForbiddenError };

/**
 * Additional Notes for Educational Purposes:
 * 
 * 1. Error Handling Best Practices:
 *    - Always extend from AppError for consistent error structure
 *    - Use appropriate HTTP status codes for different error scenarios
 *    - Include relevant details for debugging without exposing sensitive information
 *    - Leverage Express 5's automatic promise rejection handling
 * 
 * 2. Integration with Express Middleware:
 *    - These errors work seamlessly with Express 5's error handling pipeline
 *    - Automatic forwarding of rejected promises to error middleware
 *    - Consistent error object structure for response formatting
 * 
 * 3. Security Considerations:
 *    - Error messages should be user-friendly but not expose system internals
 *    - Use the details property for additional context in development/logging
 *    - Implement proper error logging for monitoring and debugging
 * 
 * 4. Monitoring and Observability:
 *    - Structured error format enables effective logging and monitoring
 *    - Error codes facilitate error tracking and alerting
 *    - Stack traces and details support debugging and issue resolution
 * 
 * 5. Testing Strategy:
 *    - Each error class can be easily tested with instanceof checks
 *    - Error properties can be validated for proper error handling
 *    - Integration tests can verify error responses in HTTP scenarios
 */