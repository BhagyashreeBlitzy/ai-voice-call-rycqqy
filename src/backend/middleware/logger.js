// External dependencies
const onHeaders = require('on-headers'); // ^1.0.2 - Allows execution of a callback just before HTTP headers are written, enabling accurate response time logging

// Internal dependencies
const { Logger } = require('../utils/logger.js'); // Provides structured, environment-aware logging methods for info, warn, error, and debug. Used to log HTTP requests, responses, and errors from middleware
const { ENVIRONMENT } = require('../config/index.js'); // Determines the current environment (development, production, test) to adjust log verbosity and format

// Initialize global logger instance for consistent logging across the middleware
const logger = new Logger();

/**
 * Express middleware function that logs all incoming HTTP requests and outgoing responses.
 * Captures method, path, status, response time, and error context. Supports colorized output
 * and log level filtering based on environment. Integrates with the centralized Logger utility
 * to provide structured, environment-aware logs for all HTTP interactions.
 * 
 * This middleware is designed to be used as one of the first middleware in the Express app
 * (before route handlers and error handlers) to ensure all requests are logged. It leverages
 * the centralized Logger utility for consistent log formatting and log level control.
 * 
 * The middleware is environment-aware: in development, logs are more verbose and colorized;
 * in production, logs are concise and structured for monitoring. The use of on-headers
 * ensures accurate response time measurement. The logger does not log sensitive data by
 * default and is designed to be safe for production use.
 * 
 * @param {Object} req - Express Request object containing HTTP request data
 * @param {Object} res - Express Response object for HTTP response handling
 * @param {Function} next - Express next middleware function to pass control to next middleware
 * @returns {void} Passes control to the next middleware after logging
 * 
 * @example
 * const express = require('express');
 * const { requestLogger } = require('./middleware/logger');
 * 
 * const app = express();
 * app.use(requestLogger); // Apply as early middleware
 * 
 * @example
 * // Development environment log output (colorized):
 * // [2024-01-15T10:30:45.123Z] [INFO] GET /hello - 200 - 15.24ms
 * // [2024-01-15T10:30:45.123Z] [DEBUG] Request details { headers: {...}, query: {...} }
 * 
 * // Production environment log output (structured):
 * // [2024-01-15T10:30:45.123Z] [INFO] GET /hello - 200 - 15.24ms
 * // [2024-01-15T10:30:45.125Z] [WARN] GET /api/nonexistent - 404 - 2.1ms
 */
function requestLogger(req, res, next) {
    // Record the start time of the request using process.hrtime for high-resolution timing
    // process.hrtime() provides nanosecond precision and is not affected by clock drift
    const startTime = process.hrtime();
    
    // Store the start timestamp for logging purposes
    const startTimestamp = new Date().toISOString();
    
    // Generate a unique request ID for tracing (useful for debugging and monitoring)
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store request metadata for logging
    const requestMeta = {
        method: req.method,
        url: req.originalUrl || req.url,
        userAgent: req.get('User-Agent') || 'unknown',
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        requestId: requestId,
        timestamp: startTimestamp
    };
    
    // Log the incoming request with basic information
    logger.info(`Incoming request: ${req.method} ${req.originalUrl || req.url}`, {
        requestId: requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        userAgent: requestMeta.userAgent,
        ip: requestMeta.ip,
        timestamp: startTimestamp
    });
    
    // If in development environment, log additional debug information
    if (ENVIRONMENT === 'development') {
        // Log request headers (excluding sensitive headers)
        const safeHeaders = {};
        Object.keys(req.headers).forEach(key => {
            // Exclude potentially sensitive headers from logging
            if (!['authorization', 'cookie', 'x-api-key', 'x-auth-token'].includes(key.toLowerCase())) {
                safeHeaders[key] = req.headers[key];
            }
        });
        
        logger.debug('Request headers and query parameters', {
            requestId: requestId,
            headers: safeHeaders,
            query: req.query,
            params: req.params,
            protocol: req.protocol,
            secure: req.secure,
            xhr: req.xhr
        });
    }
    
    // Attach a listener to the response using onHeaders to execute callback just before headers are sent
    // This ensures we capture the exact moment when the response is ready to be sent
    onHeaders(res, function() {
        // Calculate the response time using high-resolution timer
        const diff = process.hrtime(startTime);
        // Convert nanoseconds to milliseconds for human-readable format
        const responseTime = diff[0] * 1000 + diff[1] * 1e-6;
        
        // Get the response status code
        const statusCode = res.statusCode;
        
        // Prepare comprehensive logging metadata
        const logMeta = {
            requestId: requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: statusCode,
            responseTime: parseFloat(responseTime.toFixed(2)),
            contentLength: res.get('Content-Length') || 'unknown',
            userAgent: requestMeta.userAgent,
            ip: requestMeta.ip,
            timestamp: new Date().toISOString()
        };
        
        // Create a human-readable log message
        const logMessage = `${req.method} ${req.originalUrl || req.url} - ${statusCode} - ${responseTime.toFixed(2)}ms`;
        
        // Log based on response status code and severity
        if (statusCode >= 500) {
            // Server errors (5xx) - log as error
            logger.error(`Server error: ${logMessage}`, {
                ...logMeta,
                errorType: 'server_error',
                severity: 'high'
            });
        } else if (statusCode >= 400) {
            // Client errors (4xx) - log as warning
            logger.warn(`Client error: ${logMessage}`, {
                ...logMeta,
                errorType: 'client_error',
                severity: 'medium'
            });
        } else {
            // Success responses (2xx and 3xx) - log as info
            logger.info(`Request completed: ${logMessage}`, logMeta);
        }
        
        // In development environment, log additional response details
        if (ENVIRONMENT === 'development') {
            const responseHeaders = {};
            // Get response headers for debugging (excluding sensitive ones)
            res.getHeaderNames().forEach(headerName => {
                if (!['set-cookie', 'x-powered-by'].includes(headerName.toLowerCase())) {
                    responseHeaders[headerName] = res.getHeader(headerName);
                }
            });
            
            logger.debug('Response details', {
                requestId: requestId,
                statusCode: statusCode,
                headers: responseHeaders,
                responseTime: responseTime.toFixed(2) + 'ms',
                contentType: res.get('Content-Type') || 'unknown'
            });
        }
        
        // Performance monitoring - log warnings for slow responses
        if (responseTime > 1000) {
            logger.warn(`Slow response detected: ${logMessage}`, {
                ...logMeta,
                performanceIssue: 'slow_response',
                threshold: '1000ms'
            });
        }
        
        // Monitor high response times for potential performance issues
        if (responseTime > 5000) {
            logger.error(`Very slow response: ${logMessage}`, {
                ...logMeta,
                performanceIssue: 'very_slow_response',
                threshold: '5000ms',
                severity: 'high'
            });
        }
    });
    
    // Handle request errors and timeouts
    req.on('error', function(err) {
        logger.error('Request error occurred', {
            requestId: requestId,
            error: err.message,
            stack: err.stack,
            method: req.method,
            url: req.originalUrl || req.url,
            timestamp: new Date().toISOString()
        });
    });
    
    // Handle response errors
    res.on('error', function(err) {
        logger.error('Response error occurred', {
            requestId: requestId,
            error: err.message,
            stack: err.stack,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
        });
    });
    
    // Handle connection close events (client disconnections)
    req.on('close', function() {
        if (!res.headersSent) {
            logger.warn('Client disconnected before response', {
                requestId: requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Call next() to pass control to the next middleware in the pipeline
    // This ensures the request continues processing through the Express middleware stack
    next();
}

// Export the requestLogger function as a named export for use in Express applications
// This allows the middleware to be imported and used in app.js to provide traceability
// and monitoring for all API interactions
module.exports = {
    requestLogger
};