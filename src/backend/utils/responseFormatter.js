/**
 * Response Formatter Utility Module
 * 
 * This module provides centralized response formatting utilities for the Node.js tutorial
 * backend application. It implements standardized response structures for both successful
 * and error HTTP responses, ensuring consistency across all API endpoints and middleware.
 * 
 * The module integrates with Express 5's enhanced error handling capabilities and custom
 * AppError types to provide secure, educational, and production-ready API responses.
 * 
 * Key Features:
 * - Standardized success and error response structures
 * - Integration with custom AppError types and Express 5 error handling
 * - Secure error response generation with sensitive information redaction
 * - Consistent API response format for improved client integration
 * - Educational clarity demonstrating proper response formatting patterns
 * - Production-ready error handling with security best practices
 * 
 * Usage Examples:
 * - Success Response: res.status(200).json(formatSuccess(data, 'Operation successful'));
 * - Error Response: res.status(err.status || 500).json(formatError(err));
 * - Custom Success: res.status(201).json(formatSuccess(newUser, 'User created', 201));
 * - Generic Error: res.status(500).json(formatError(new Error('Something went wrong')));
 * 
 * Security Considerations:
 * - Sensitive fields are automatically redacted from error responses
 * - Stack traces are never exposed in production error responses
 * - Error messages are sanitized to prevent information disclosure
 * - Integration with Express 5's security enhancements
 * 
 * @fileoverview Centralized response formatting utility for HTTP responses
 * @author Node.js Tutorial Application
 * @version 1.0.0
 */

// Import custom AppError class for error type checking and structured error handling
import { AppError } from './errorTypes.js';

// Import standardized error code constants for consistent error identification
import { ERROR_CODES } from './errorTypes.js';

/**
 * Global Constants for Response Formatting
 * 
 * These constants define configuration values used throughout the response
 * formatting process, particularly for security and data sanitization.
 */

/**
 * Fields to be redacted from error responses for security purposes
 * 
 * This array contains field names that should be removed from error details
 * before sending responses to clients. These fields typically contain sensitive
 * information that should not be exposed in production environments.
 * 
 * @constant {string[]} REDACTED_FIELDS
 * @default ['stack', 'internalDetails']
 */
const REDACTED_FIELDS = ['stack', 'internalDetails'];

/**
 * Format Success Response
 * 
 * Creates a standardized success response object with consistent structure
 * across all API endpoints. This function is used by route handlers to return
 * uniform successful responses, supporting both plain text and JSON formats.
 * 
 * The response structure follows REST API best practices and provides clear
 * indication of success status, descriptive messages, and optional data payload.
 * This standardization facilitates easier client integration, testing, and
 * debugging of API responses.
 * 
 * Response Structure:
 * - success: boolean (always true for success responses)
 * - message: string (descriptive success message)
 * - data: any (optional response payload)
 * - status: number (HTTP status code)
 * 
 * @param {any} [data=null] - Optional response data payload (can be object, array, string, etc.)
 * @param {string} [message='Success'] - Descriptive success message for the response
 * @param {number} [status=200] - HTTP status code for the response (default: 200 OK)
 * 
 * @returns {Object} Standardized success response object with consistent structure
 * 
 * @example
 * // Basic success response with default values
 * const response = formatSuccess();
 * // Returns: { success: true, message: 'Success', data: null, status: 200 }
 * 
 * @example
 * // Success response with custom data and message
 * const userData = { id: 1, name: 'John Doe' };
 * const response = formatSuccess(userData, 'User retrieved successfully');
 * // Returns: { success: true, message: 'User retrieved successfully', data: userData, status: 200 }
 * 
 * @example
 * // Success response with custom status code
 * const newUser = { id: 2, name: 'Jane Smith' };
 * const response = formatSuccess(newUser, 'User created successfully', 201);
 * // Returns: { success: true, message: 'User created successfully', data: newUser, status: 201 }
 * 
 * @example
 * // Usage in Express route handler
 * app.get('/hello', (req, res) => {
 *   const response = formatSuccess(null, 'Hello world');
 *   res.status(response.status).json(response);
 * });
 */
function formatSuccess(data = null, message = 'Success', status = 200) {
    // Create and return the standardized success response object
    // This structure ensures consistency across all successful API responses
    return {
        // Indicate successful operation
        success: true,
        
        // Provide descriptive message about the operation result
        message: message,
        
        // Include optional data payload (null if no data provided)
        data: data,
        
        // Include HTTP status code for client reference
        status: status
    };
}

/**
 * Format Error Response
 * 
 * Creates a standardized error response object with consistent structure and
 * secure error information handling. This function integrates with custom AppError
 * types and Express 5's error handling pipeline to provide structured, secure,
 * and educational error responses.
 * 
 * The function handles both custom AppError instances and generic Error objects,
 * ensuring that all errors are properly formatted and sensitive information is
 * redacted before being sent to clients. This approach follows security best
 * practices while maintaining educational value.
 * 
 * Error Response Structure:
 * - success: boolean (always false for error responses)
 * - message: string (user-friendly error message)
 * - code: string (error code for programmatic handling)
 * - status: number (HTTP status code)
 * - details: object (optional, sanitized error details)
 * 
 * Security Features:
 * - Automatic redaction of sensitive fields (stack traces, internal details)
 * - Sanitized error messages to prevent information disclosure
 * - Consistent error structure for monitoring and logging
 * - Integration with Express 5's security enhancements
 * 
 * @param {Error|AppError} err - Error object (either custom AppError or generic Error)
 * @param {number} [status=500] - Default HTTP status code if not provided by error
 * 
 * @returns {Object} Standardized error response object with secure error information
 * 
 * @example
 * // Format custom AppError
 * const appError = new BadRequestError('Invalid input data', { field: 'email' });
 * const response = formatError(appError);
 * // Returns: { success: false, message: 'Invalid input data', code: 'BAD_REQUEST', status: 400, details: { field: 'email' } }
 * 
 * @example
 * // Format generic Error
 * const genericError = new Error('Database connection failed');
 * const response = formatError(genericError);
 * // Returns: { success: false, message: 'An internal server error occurred', code: 'INTERNAL_ERROR', status: 500, details: null }
 * 
 * @example
 * // Format error with custom status override
 * const error = new Error('Service unavailable');
 * const response = formatError(error, 503);
 * // Returns: { success: false, message: 'An internal server error occurred', code: 'INTERNAL_ERROR', status: 503, details: null }
 * 
 * @example
 * // Usage in Express error middleware
 * app.use((err, req, res, next) => {
 *   const errorResponse = formatError(err);
 *   res.status(errorResponse.status).json(errorResponse);
 * });
 */
function formatError(err, status = 500) {
    // Initialize response object with default error structure
    let response = {
        success: false,
        message: '',
        code: '',
        status: status,
        details: null
    };
    
    // Check if the error is an instance of our custom AppError class
    // This allows us to extract structured error information for proper formatting
    if (err instanceof AppError) {
        // Extract structured error information from AppError instance
        // AppError provides consistent error structure with code, message, status, and details
        response.message = err.message;
        response.code = err.code;
        response.status = err.status;
        response.details = err.details;
    } else {
        // Handle generic Error objects that don't extend AppError
        // This ensures all errors are properly formatted even if they don't use our custom error types
        
        // Use generic error message to avoid exposing internal system details
        response.message = 'An internal server error occurred';
        
        // Assign internal error code for generic errors
        response.code = ERROR_CODES.INTERNAL_ERROR;
        
        // Use provided status or default to 500 for generic errors
        response.status = status;
        
        // Don't include details for generic errors to prevent information disclosure
        response.details = null;
    }
    
    // Redact sensitive fields from error details for security
    // This prevents sensitive information like stack traces from being exposed to clients
    if (response.details && typeof response.details === 'object') {
        // Create a copy of the details object to avoid modifying the original
        const sanitizedDetails = { ...response.details };
        
        // Remove each field listed in REDACTED_FIELDS
        REDACTED_FIELDS.forEach(field => {
            // Delete the field if it exists in the details object
            if (sanitizedDetails.hasOwnProperty(field)) {
                delete sanitizedDetails[field];
            }
        });
        
        // Update the response with sanitized details
        response.details = sanitizedDetails;
    }
    
    // Return the standardized error response object
    return response;
}

/**
 * Module Exports
 * 
 * Export the response formatting functions for use throughout the application.
 * These functions serve as the single source of truth for response formatting
 * in the backend application, ensuring consistency across all API endpoints,
 * middleware, and error handling.
 * 
 * Export Structure:
 * - formatSuccess: Function for formatting successful HTTP responses
 * - formatError: Function for formatting error HTTP responses
 * 
 * Usage Examples:
 * - import { formatSuccess, formatError } from './responseFormatter.js'
 * - const { formatSuccess } = require('./responseFormatter.js')
 * - import * as ResponseFormatter from './responseFormatter.js'
 */

// Export the formatSuccess function for creating standardized success responses
export { formatSuccess };

// Export the formatError function for creating standardized error responses
export { formatError };

/**
 * Additional Implementation Notes for Educational Purposes:
 * 
 * 1. Response Formatting Best Practices:
 *    - Always use consistent response structures across all API endpoints
 *    - Include meaningful status codes and messages for client consumption
 *    - Separate success and error response handling for clarity
 *    - Implement proper error sanitization to prevent information disclosure
 * 
 * 2. Integration with Express 5 Features:
 *    - Leverages Express 5's automatic promise rejection handling
 *    - Works seamlessly with Express error handling middleware
 *    - Supports both synchronous and asynchronous error scenarios
 *    - Integrates with Express 5's security enhancements
 * 
 * 3. Security Considerations:
 *    - Sensitive fields are automatically redacted from error responses
 *    - Generic error messages prevent internal system information disclosure
 *    - Proper error logging should be implemented separately for debugging
 *    - Error details should only include client-safe information
 * 
 * 4. Testing Strategy:
 *    - Test both formatSuccess and formatError functions independently
 *    - Verify proper handling of AppError instances vs generic errors
 *    - Test field redaction functionality for security compliance
 *    - Validate response structure consistency across different scenarios
 * 
 * 5. Monitoring and Observability:
 *    - Standardized response format enables effective logging and monitoring
 *    - Error codes facilitate error tracking and alerting systems
 *    - Consistent structure supports automated error analysis and reporting
 *    - Response timing and status tracking for performance monitoring
 * 
 * 6. Production Deployment Considerations:
 *    - Ensure sensitive information is never exposed in production error responses
 *    - Implement comprehensive error logging separate from client responses
 *    - Consider rate limiting and error throttling for security
 *    - Monitor error rates and patterns for system health assessment
 * 
 * 7. Future Enhancement Possibilities:
 *    - Add support for multiple language error messages
 *    - Implement request correlation IDs for distributed tracing
 *    - Add structured logging integration for better observability
 *    - Support for custom response headers and metadata
 */