// Express middleware for logging HTTP requests and responses
// Integrates with centralized logger utility for structured, timestamped logging
// Supports observability, debugging, and performance monitoring

// Internal imports - centralized logger utility
const { logger } = require('../utils/logger.js');

// External imports - HTTP response completion detection
const onFinished = require('on-finished'); // ^2.4.1 - Detects when HTTP response has finished

// Global request log format template for consistent log message formatting
// Supports placeholder substitution for dynamic request/response data
const REQUEST_LOG_FORMAT = '[:timestamp] :method :url :status :responseTime ms - :userAgent';

/**
 * Express middleware function that logs all incoming HTTP requests and their corresponding responses
 * Provides comprehensive observability for HTTP traffic through structured logging
 * 
 * Captures essential request/response metrics including:
 * - HTTP method and URL path
 * - Response status code and processing time
 * - User agent string for client identification
 * - Request timestamp for temporal tracking
 * 
 * Log levels are determined by HTTP response status codes:
 * - INFO: Successful responses (status < 400)
 * - WARN: Client errors (status 400-499)
 * - ERROR: Server errors (status >= 500)
 * 
 * @param {Object} req - Express Request object containing HTTP request details
 * @param {Object} res - Express Response object for HTTP response handling
 * @param {Function} next - Express NextFunction to pass control to next middleware
 * @returns {void} Passes control to next middleware and logs request/response after completion
 */
function requestLoggerMiddleware(req, res, next) {
    // Record high-resolution start time for accurate response time calculation
    // Using process.hrtime.bigint() for nanosecond precision timing
    const startTime = process.hrtime.bigint();
    
    // Record request start timestamp in ISO 8601 format for log message formatting
    const requestTimestamp = new Date().toISOString();
    
    // Attach response completion listener using on-finished to execute logging after response is sent
    // This ensures all response data is available when logging occurs
    onFinished(res, function onResponseFinished(err, res) {
        // Calculate response time in milliseconds from high-resolution start time
        const endTime = process.hrtime.bigint();
        const responseTimeNs = endTime - startTime;
        const responseTimeMs = Math.round(Number(responseTimeNs) / 1000000); // Convert nanoseconds to milliseconds
        
        // Extract HTTP method from request object (GET, POST, PUT, DELETE, etc.)
        const method = req.method || 'UNKNOWN';
        
        // Extract original URL path from request, preserving query parameters
        // originalUrl includes the full path with query string, path excludes query string
        const url = req.originalUrl || req.url || '/';
        
        // Extract HTTP status code from response object
        const statusCode = res.statusCode || 500;
        
        // Extract User-Agent header for client identification and debugging
        // Fallback to 'Unknown' if User-Agent header is not present
        const userAgent = req.get('User-Agent') || 'Unknown';
        
        // Determine appropriate log level based on HTTP status code ranges
        // Following HTTP status code semantics for error classification
        let logLevel = 'info'; // Default to info level
        
        if (statusCode >= 400 && statusCode < 500) {
            // Client errors (4xx) - requests with client-side issues
            logLevel = 'warn';
        } else if (statusCode >= 500) {
            // Server errors (5xx) - requests with server-side issues
            logLevel = 'error';
        }
        // Status codes < 400 remain at 'info' level (successful responses)
        
        // Format log message using REQUEST_LOG_FORMAT template with placeholder substitution
        // Replace placeholders with actual request/response values for structured logging
        const logMessage = REQUEST_LOG_FORMAT
            .replace(':timestamp', requestTimestamp)
            .replace(':method', method)
            .replace(':url', url)
            .replace(':status', statusCode.toString())
            .replace(':responseTime', responseTimeMs.toString())
            .replace(':userAgent', userAgent);
        
        // Create metadata object for structured logging with additional context
        const logMetadata = {
            requestId: req.headers['x-request-id'] || 'unknown', // Request correlation ID if available
            remoteAddress: req.ip || req.connection.remoteAddress || 'unknown', // Client IP address
            method: method,
            url: url,
            statusCode: statusCode,
            responseTime: responseTimeMs,
            userAgent: userAgent,
            timestamp: requestTimestamp
        };
        
        // Log the formatted message using the appropriate logger method based on determined log level
        // This provides consistent logging behavior across all request processing
        if (logLevel === 'info') {
            logger.info(logMessage, logMetadata);
        } else if (logLevel === 'warn') {
            logger.warn(logMessage, logMetadata);
        } else if (logLevel === 'error') {
            logger.error(logMessage, logMetadata);
        }
        
        // Handle potential errors from the on-finished callback
        // Log any errors that occurred during response processing
        if (err) {
            logger.error('Error during request processing completion', {
                error: err.message,
                stack: err.stack,
                requestId: logMetadata.requestId,
                url: url,
                method: method
            });
        }
    });
    
    // Continue to next middleware in the Express middleware chain
    // This ensures the logging middleware doesn't interrupt request processing
    next();
}

// Export the request logger middleware function for use in Express application
// Designed to be mounted early in the middleware stack for comprehensive logging coverage
module.exports = {
    requestLoggerMiddleware
};