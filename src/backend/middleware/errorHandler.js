// External dependencies - Express 5.1.0 for enhanced error handling with automatic promise rejection forwarding
const express = require('express'); // ^5.1.0 - Web application framework with improved error handling capabilities

// Internal dependencies - Centralized utilities for logging and response formatting
const { Logger } = require('../utils/logger.js'); // Provides environment-aware structured logging for error tracking and monitoring
const { formatError } = require('../utils/responseFormatter.js'); // Formats error responses in standardized, secure JSON structure
const { AppError } = require('../utils/errorTypes.js'); // Custom application error class for structured error handling

// Global logger instance for error logging and monitoring
const logger = new Logger();

/**
 * Express Global Error-Handling Middleware
 * 
 * This middleware serves as the central error handling component for the Node.js tutorial
 * application, implementing Express 5's enhanced error handling capabilities with automatic
 * promise rejection forwarding. It catches all unhandled errors and rejected promises,
 * logs them with structured information, and returns standardized, secure error responses.
 * 
 * Key Features:
 * - Automatic catching of all errors and promise rejections (Express 5 feature)
 * - Structured error logging with request context for debugging and monitoring
 * - Standardized error response formatting using responseFormatter utility
 * - Integration with custom AppError types for enhanced error classification
 * - Security-focused error handling with sensitive information redaction
 * - Production-ready error responses without exposing internal system details
 * - Educational clarity demonstrating proper error handling patterns
 * 
 * Express 5 Integration:
 * - Leverages Express 5's automatic promise rejection handling
 * - No need for explicit try/catch blocks in async route handlers
 * - Seamless integration with Express error handling pipeline
 * - Enhanced security with improved error information handling
 * 
 * Security Considerations:
 * - Stack traces and sensitive details are never exposed in production
 * - Error messages are sanitized to prevent information disclosure
 * - Request context is logged for debugging but not exposed to clients
 * - Headers are checked to prevent double responses and response corruption
 * 
 * @param {Error|AppError} err - Error object (either custom AppError or generic Error)
 * @param {express.Request} req - Express request object with client request information
 * @param {express.Response} res - Express response object for sending client responses
 * @param {express.NextFunction} next - Express next function for middleware pipeline control
 * 
 * @returns {void} Sends a formatted error response and terminates the request/response cycle
 * 
 * @example
 * // Register as the last middleware in Express app
 * app.use(errorHandler);
 * 
 * @example
 * // Express 5 automatically forwards promise rejections
 * app.get('/async-route', async (req, res) => {
 *   throw new Error('This will be caught by errorHandler');
 * });
 * 
 * @example
 * // Custom AppError integration
 * app.get('/custom-error', (req, res, next) => {
 *   const error = new BadRequestError('Invalid input data', { field: 'email' });
 *   next(error); // Will be handled by errorHandler
 * });
 * 
 * @example
 * // Manual error forwarding (though not required with Express 5)
 * app.get('/manual-error', (req, res, next) => {
 *   try {
 *     riskyOperation();
 *   } catch (error) {
 *     next(error); // Will be handled by errorHandler
 *   }
 * });
 */
function errorHandler(err, req, res, next) {
    // Step 1: Check if headers have already been sent to prevent double responses
    // If headers are already sent, delegate to Express's default error handler
    // This prevents "Cannot set headers after they are sent" errors and ensures
    // proper error handling even when responses are partially sent
    if (res.headersSent) {
        // Log that we're delegating to Express default handler
        logger.warn('Headers already sent, delegating to Express default error handler', {
            error: err.message,
            url: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        
        // Forward to Express default error handler
        return next(err);
    }
    
    // Step 2: Extract request context for comprehensive error logging
    // Gather relevant request information for debugging and monitoring
    // This context helps with troubleshooting and identifying error patterns
    const requestContext = {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent') || 'Unknown',
        ip: req.ip || req.connection.remoteAddress || 'Unknown',
        headers: req.headers,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown', // If request ID middleware is used
        query: req.query,
        params: req.params
    };
    
    // Additional context for POST/PUT/PATCH requests (body information)
    if (req.body && Object.keys(req.body).length > 0) {
        // Log body presence but not actual content for security
        requestContext.hasBody = true;
        requestContext.bodyKeys = Object.keys(req.body);
    }
    
    // Step 3: Determine error type and extract relevant information
    // Check if this is a custom AppError or generic Error for proper handling
    let errorType = 'Generic Error';
    let errorDetails = null;
    
    if (err instanceof AppError) {
        errorType = 'AppError';
        errorDetails = {
            code: err.code,
            status: err.status,
            details: err.details
        };
    } else {
        // For generic errors, capture basic information
        errorDetails = {
            name: err.name || 'Error',
            message: err.message || 'Unknown error'
        };
    }
    
    // Step 4: Log the error with comprehensive context using the centralized logger
    // Include error message, stack trace, and request context for debugging
    // Use structured logging for better monitoring and observability
    logger.error('Unhandled error caught by global error handler', {
        error: {
            message: err.message,
            type: errorType,
            name: err.name,
            stack: err.stack, // Stack trace for debugging (only in logs, not response)
            details: errorDetails
        },
        request: requestContext,
        timestamp: new Date().toISOString()
    });
    
    // Step 5: Format the error response using the responseFormatter utility
    // This ensures consistent error response structure across the application
    // The formatError function handles AppError vs generic Error differentiation
    const formattedErrorResponse = formatError(err);
    
    // Step 6: Determine the appropriate HTTP status code
    // Use the error's status if available, otherwise default to 500
    // AppErrors have specific status codes, generic errors default to 500
    const statusCode = err.status || formattedErrorResponse.status || 500;
    
    // Step 7: Set security headers for error responses
    // Prevent caching of error responses and set secure headers
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff'
    });
    
    // Step 8: Send the formatted error response as JSON
    // Use the determined status code and formatted response structure
    // This terminates the request/response cycle
    res.status(statusCode).json(formattedErrorResponse);
    
    // Step 9: Log successful error response for monitoring
    // Track that the error was handled and response was sent
    logger.info('Error response sent successfully', {
        statusCode: statusCode,
        errorCode: formattedErrorResponse.code,
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        processingTime: Date.now() - (req.startTime || Date.now())
    });
}

/**
 * Module Exports
 * 
 * Export the errorHandler function for use as Express middleware.
 * This middleware should be registered as the last middleware in the Express app
 * to ensure it catches all errors and rejected promises from routes and other middleware.
 * 
 * Usage:
 * const { errorHandler } = require('./middleware/errorHandler.js');
 * app.use(errorHandler);
 * 
 * Integration with Express 5:
 * - Express 5 automatically forwards rejected promises to this middleware
 * - No need to manually catch and forward promise rejections
 * - Seamless integration with async/await route handlers
 * - Enhanced error handling pipeline with automatic promise rejection forwarding
 * 
 * Educational Value:
 * - Demonstrates proper global error handling patterns
 * - Shows integration with structured logging and response formatting
 * - Illustrates security considerations in error handling
 * - Provides comprehensive error context for debugging and monitoring
 * 
 * Production Considerations:
 * - Sensitive information is never exposed in error responses
 * - Comprehensive error logging for debugging and monitoring
 * - Proper HTTP status codes and security headers
 * - Integration with monitoring and observability systems
 * 
 * Testing Strategy:
 * - Unit tests for error handling logic and response formatting
 * - Integration tests with Express application and various error scenarios
 * - Security tests to ensure sensitive information is not exposed
 * - Performance tests to verify error handling overhead is minimal
 */
module.exports = {
    errorHandler
};