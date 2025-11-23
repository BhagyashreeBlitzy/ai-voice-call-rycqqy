// Import error handling utilities for normalization and secure response generation
const { normalizeError, errorResponse } = require('../utils/errors.js');

/**
 * Centralized Express error-handling middleware for the Node.js tutorial backend
 * 
 * This middleware serves as the last line of defense for error handling in the Express application.
 * It catches all errors propagated through the middleware chain, normalizes them into standardized
 * AppError instances, logs them for observability, and sends secure error responses to clients.
 * 
 * Key Features:
 * - Handles both synchronous and asynchronous errors
 * - Normalizes all error types into consistent AppError instances
 * - Prevents stack trace and sensitive information leakage
 * - Provides comprehensive error logging for debugging and monitoring
 * - Sends standardized HTTP error responses with appropriate status codes
 * - Terminates the request/response cycle after error handling
 * 
 * Security Considerations:
 * - Never exposes stack traces or internal system details to clients
 * - Sanitizes error messages to prevent information disclosure
 * - Logs full error details internally for debugging while keeping client responses secure
 * - Follows OWASP guidelines for secure error handling
 * 
 * Usage:
 * This middleware should be registered as the last middleware in the Express application:
 * app.use(errorHandler);
 * 
 * Express will automatically forward errors to this middleware when:
 * - An error is thrown in synchronous middleware/route handlers
 * - next(error) is called with an error argument
 * - A Promise is rejected in async middleware/route handlers (Express 5+)
 * 
 * @param {any} err - The error object, string, or value that was thrown or passed to next()
 * @param {object} req - Express Request object containing client request information
 * @param {object} res - Express Response object for sending HTTP responses
 * @param {function} next - Express NextFunction for middleware chain continuation (not used here)
 * @returns {void} Sends an error response to the client and terminates the request/response cycle
 */
function errorHandler(err, req, res, next) {
    // Step 1: Normalize the error into a standardized AppError instance
    // This ensures consistent error handling regardless of the original error type
    // (Error objects, strings, custom errors, or any other thrown values)
    const normalizedError = normalizeError(err);
    
    // Step 2: Generate and send a secure error response to the client
    // This function handles logging, response formatting, and secure information filtering
    // It ensures that no sensitive details like stack traces or internal system information
    // are leaked to the client while providing meaningful error information
    errorResponse(normalizedError, res, req);
    
    // Step 3: Do NOT call next() after sending the response
    // The error has been fully handled and the response has been sent to the client
    // Calling next() would attempt to continue the middleware chain, which is incorrect
    // for error handling middleware as it should terminate the request/response cycle
    
    // Note: The errorResponse function internally:
    // - Logs the complete error details (including stack trace) for debugging
    // - Formats a secure response object with status code, message, and timestamp
    // - Sends the response to the client with appropriate HTTP status code
    // - Includes request context information in the logs for traceability
    
    // No return value needed as errorResponse handles the complete response cycle
}

// Export the error handler middleware for use in the Express application
// This should be imported and used as the last middleware in the Express app setup:
// const { errorHandler } = require('./middleware/errorHandler');
// app.use(errorHandler);
module.exports = {
    errorHandler
};