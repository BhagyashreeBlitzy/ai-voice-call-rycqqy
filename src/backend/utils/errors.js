// Import the logger error function for centralized error logging
const { error } = require('./logger.js');

// Global constants for standardized error handling
const DEFAULT_ERROR_STATUS = 500;
const DEFAULT_ERROR_MESSAGE = "Internal Server Error";

/**
 * Custom error class for application-specific errors with HTTP status support
 * Used for all operational errors and for propagating error details in a secure, standardized way
 * Extends the built-in Error class to maintain standard error behavior while adding HTTP-specific features
 */
class AppError extends Error {
    /**
     * Initializes the AppError with a message, HTTP status, and optional internal details
     * 
     * @param {string} message - The error message to be displayed or logged
     * @param {number} [status=500] - HTTP status code associated with this error
     * @param {object} [details] - Optional internal details for debugging (not exposed to client)
     */
    constructor(message, status = DEFAULT_ERROR_STATUS, details = null) {
        // Call parent Error constructor with the message
        super(message);
        
        // Set the error name to match the class name for better debugging
        this.name = this.constructor.name;
        
        // Assign message to this.message (redundant but explicit for clarity)
        this.message = message;
        
        // Assign status to this.status (default to 500 if not provided)
        this.status = status;
        
        // Assign details to this.details (optional, not exposed to client)
        this.details = details;
        
        // Capture stack trace for internal logging (not sent to client)
        // This helps with debugging by maintaining the call stack information
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    
    /**
     * Returns a safe, serializable representation of the error for client responses
     * Ensures no sensitive information like stack traces or internal details are exposed
     * 
     * @returns {object} Safe error object with error: true, message, and status
     */
    toJSON() {
        // Return an object with error: true, message, and status
        // Do not include stack trace, details, or internal properties
        return {
            error: true,
            message: this.message,
            status: this.status
        };
    }
}

/**
 * Normalizes any thrown error or value into an AppError instance for consistent downstream handling
 * Ensures all errors have a status and message, and strips sensitive details for security
 * 
 * @param {any} err - The error or value to normalize (can be Error, string, or any other type)
 * @returns {AppError} A standardized AppError instance with status, message, and safe details
 */
function normalizeError(err) {
    // If err is already an AppError, return as-is to avoid double wrapping
    if (err instanceof AppError) {
        return err;
    }
    
    // If err is an Error object, extract message and stack, assign status if present
    if (err instanceof Error) {
        // Extract the error message, defaulting to a generic message if empty
        const message = err.message || DEFAULT_ERROR_MESSAGE;
        
        // Extract status code if present (common in HTTP errors), otherwise use default
        const status = err.status || err.statusCode || DEFAULT_ERROR_STATUS;
        
        // Create AppError with extracted information
        // Include the original error name in details for internal debugging
        const details = {
            originalError: err.name,
            originalMessage: err.message
        };
        
        return new AppError(message, status, details);
    }
    
    // If err is a string, treat as message and create new AppError with default status
    if (typeof err === 'string') {
        // Use the string as the error message with default status
        return new AppError(err, DEFAULT_ERROR_STATUS);
    }
    
    // For any other value, create new AppError with default status and generic message
    // This handles cases where non-standard values are thrown (numbers, objects, etc.)
    return new AppError(DEFAULT_ERROR_MESSAGE, DEFAULT_ERROR_STATUS, { originalValue: err });
}

/**
 * Formats and sends a secure, standardized error response to the client
 * Ensures no sensitive details are leaked and logs the error event for observability
 * 
 * @param {AppError} err - The normalized AppError instance to respond with
 * @param {object} res - Express Response object for sending the HTTP response
 * @param {object} [req] - Express Request object for logging context (optional)
 * @returns {void} Sends an error response to the client and logs the error
 */
function errorResponse(err, res, req = null) {
    // Ensure the error is normalized to an AppError instance
    const normalizedError = normalizeError(err);
    
    // Build request context for logging if request object is available
    const requestContext = req ? {
        method: req.method,
        url: req.originalUrl || req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    } : {
        timestamp: new Date().toISOString()
    };
    
    // Log the error using logger.error, including request context for debugging
    // This provides comprehensive error tracking for observability
    error('Error occurred during request processing', {
        error: {
            message: normalizedError.message,
            status: normalizedError.status,
            stack: normalizedError.stack,
            details: normalizedError.details
        },
        request: requestContext
    });
    
    // Set the response status to err.status (default to DEFAULT_ERROR_STATUS if missing)
    const statusCode = normalizedError.status || DEFAULT_ERROR_STATUS;
    res.status(statusCode);
    
    // Build the secure error response object
    const errorResponseBody = {
        error: true,
        message: normalizedError.message,
        status: statusCode,  // Legacy key for backward compatibility
        statusCode: statusCode,  // Standard key matching HTTP conventions
        timestamp: new Date().toISOString()
    };
    
    // Include request path and method if available for client debugging assistance
    if (req) {
        if (req.path) {
            errorResponseBody.path = req.path;
        }
        if (req.method) {
            errorResponseBody.method = req.method;
        }
    }
    
    // Send a JSON response with secure error information
    // Do not include stack traces, internal details, or sensitive information
    res.json(errorResponseBody);
}

// Export the custom error class and utility functions for use throughout the application
module.exports = {
    AppError,
    normalizeError,
    errorResponse,
    // Export constants for potential use in other modules
    DEFAULT_ERROR_STATUS,
    DEFAULT_ERROR_MESSAGE
};