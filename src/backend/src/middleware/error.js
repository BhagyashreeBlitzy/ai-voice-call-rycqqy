/**
 * Express.js Error Handling Middleware for Node.js Tutorial Application
 * 
 * This middleware provides comprehensive error management for the Node.js tutorial application, implementing 
 * Express.js 5.1.0 compatible error handling with automatic promise error forwarding, 404 route not found 
 * handling, and production-safe error responses. The implementation integrates with the application logging 
 * system and provides consistent error response formatting while maintaining educational clarity and security 
 * best practices for Node.js web development fundamentals.
 * 
 * Features:
 * - Express.js 5.1.0 automatic promise rejection forwarding to error handling middleware
 * - Comprehensive 404 Not Found handling for unmatched routes with proper HTTP status responses
 * - Production-safe error response sanitization to prevent information disclosure vulnerabilities
 * - Integration with structured logging utility for comprehensive error tracking and monitoring
 * - Error statistics tracking for operational monitoring and performance insights
 * - Custom error creation factory with status codes and metadata for enhanced debugging
 * - HTTP status code standards compliance following RFC specifications
 * - Security considerations including error message sanitization and stack trace filtering
 * - Educational design prioritizing code clarity while demonstrating enterprise-grade error handling
 * 
 * Architecture:
 * - Express.js middleware pattern with standard four-parameter error handler signature
 * - Environment-aware error handling with development vs production response formatting
 * - Structured error response formatting with consistent JSON payload structure
 * - Performance-optimized error statistics tracking with minimal overhead
 * - Memory-efficient error handling with automatic cleanup and resource management
 * 
 * Compatible with:
 * - Express.js 5.1.0 with automatic promise error handling and enhanced async/await support
 * - Node.js 22.11.0 LTS with Active LTS support, improved performance, and security enhancements
 * - HTTP/1.1 protocol with standard status codes and proper error response formatting
 * 
 * Security:
 * - Stack traces hidden in production environment for security
 * - Error messages sanitized to prevent information disclosure
 * - Sensitive request data filtered from error logs
 * - Custom error creation validates input to prevent injection attacks
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js error handling patterns, HTTP status codes, and production security practices
 */

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import structured logging utility for comprehensive error logging with environment-aware formatting and error metadata tracking
const { logger } = require('../utils/logger.js');

// Import standard HTTP status codes for consistent error response status codes following RFC standards
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import standardized error messages for consistent error responses that prevent information disclosure
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import Content-Type header constants for proper HTTP response header configuration
const { 
    CONTENT_TYPES 
} = require('../utils/constants.js');

// Import configuration factory to access environment-specific error handling settings and security configurations
const { getConfig } = require('../utils/config.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Error statistics tracking object for monitoring and operational insights
 * Tracks total error counts, breakdown by status code, and recent error patterns
 * @type {Object}
 */
let ERROR_STATS = {
    total: 0,
    by_status: {},
    recent_errors: []
};

/**
 * Cached configuration for error handling behavior to prevent repeated config loading
 * Contains environment-specific error handling settings and security configurations
 * @type {Object|null}
 */
let CONFIG = null;

/**
 * Standardized response payloads for consistent JSON error response formatting
 * Provides structured error responses for different error types and HTTP status codes
 * @type {Object}
 */
const RESPONSES = {
    NOT_FOUND: {
        status: 'error',
        code: 'ROUTE_NOT_FOUND',
        message: ERROR_MESSAGES.ROUTE_NOT_FOUND,
        timestamp: null
    },
    INTERNAL_ERROR: {
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        timestamp: null
    },
    METHOD_NOT_ALLOWED: {
        status: 'error',
        code: 'METHOD_NOT_ALLOWED',
        message: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
        timestamp: null
    }
};

// =============================================================================
// INITIALIZATION AND CONFIGURATION
// =============================================================================

/**
 * Initializes error handling configuration and statistics tracking for the middleware system.
 * This function loads application configuration using getConfig(), caches configuration in CONFIG 
 * global variable, initializes ERROR_STATS tracking object, sets up error statistics counters for 
 * different status codes, configures environment-specific error handling behavior, and logs error 
 * handling middleware initialization with comprehensive setup validation.
 * 
 * The initialization process includes:
 * - Application configuration loading with error handling and fallback to default settings
 * - Error statistics object initialization with counters and recent error tracking array
 * - Environment-specific error handling behavior configuration based on NODE_ENV
 * - Error response formatting configuration for development vs production environments
 * - Security settings configuration for production-safe error message sanitization
 * 
 * @returns {void} No return value - initializes global error handling state and configuration
 */
function initializeErrorHandling() {
    try {
        // Load application configuration using getConfig() for environment-specific error handling settings
        CONFIG = getConfig();
        
        // Initialize ERROR_STATS tracking object with comprehensive error monitoring structure
        ERROR_STATS = {
            total: 0,
            by_status: {
                [HTTP_STATUS.BAD_REQUEST]: 0,
                [HTTP_STATUS.NOT_FOUND]: 0,
                [HTTP_STATUS.METHOD_NOT_ALLOWED]: 0,
                [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 0,
                [HTTP_STATUS.SERVICE_UNAVAILABLE]: 0
            },
            recent_errors: [],
            started_at: new Date().toISOString(),
            last_error: null
        };
        
        // Configure environment-specific error handling behavior based on application environment
        const environment = CONFIG?.app?.env || process.env.NODE_ENV || 'development';
        const isDevelopment = environment === 'development';
        const isProduction = environment === 'production';
        
        // Log error handling middleware initialization with configuration summary
        logger.info('Error handling middleware initialized', {
            environment: environment,
            isDevelopment: isDevelopment,
            isProduction: isProduction,
            errorStatsInitialized: true,
            configurationLoaded: !!CONFIG,
            statisticsEnabled: true,
            securityModeEnabled: isProduction,
            stackTraceEnabled: isDevelopment
        });
        
    } catch (error) {
        // Handle initialization errors gracefully with fallback configuration
        console.error('[Error Middleware] Failed to initialize error handling:', error.message);
        
        // Set fallback configuration to ensure middleware continues to function
        CONFIG = {
            app: { env: 'development' },
            logging: { level: 'info' },
            security: { error_disclosure: false }
        };
        
        // Initialize basic error statistics structure as fallback
        ERROR_STATS = {
            total: 0,
            by_status: {},
            recent_errors: [],
            started_at: new Date().toISOString(),
            initialization_error: error.message
        };
        
        console.warn('[Error Middleware] Using fallback configuration due to initialization failure');
    }
}

// =============================================================================
// ERROR LOGGING AND CONTEXT MANAGEMENT
// =============================================================================

/**
 * Logs error information with appropriate metadata and context for debugging and monitoring.
 * This function extracts error message and stack trace from error object, creates error metadata with 
 * request details (method, path, headers), includes timestamp and correlation ID if available, filters 
 * sensitive information in production environment, updates ERROR_STATS with error occurrence data, logs 
 * error using logger.error() with structured metadata, and tracks error in recent_errors array for monitoring.
 * 
 * Error logging features:
 * - Comprehensive error context extraction including request method, path, and client information
 * - Stack trace preservation with production-safe filtering for security compliance
 * - Correlation ID inclusion for distributed system tracing and request correlation
 * - Sensitive data filtering to prevent information disclosure in production logs
 * - Structured metadata formatting for log aggregation and analysis systems
 * - Error occurrence tracking with timing and frequency analysis
 * 
 * @param {Error|string} error - Error object or string containing error information and context
 * @param {Object} req - Express.js request object containing HTTP request details and metadata
 * @param {number} statusCode - HTTP status code for error classification and response handling
 * @returns {void} No return value - logs error information and updates error tracking statistics
 */
function logError(error, req, statusCode) {
    try {
        // Extract error message and stack trace from error object for comprehensive logging
        let errorMessage = '';
        let errorStack = null;
        let errorName = 'UnknownError';
        let errorCode = null;
        
        if (error instanceof Error) {
            errorMessage = error.message || 'Unknown error occurred';
            errorStack = error.stack || null;
            errorName = error.name || 'Error';
            errorCode = error.code || null;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else {
            errorMessage = 'Unspecified error condition';
        }
        
        // Create comprehensive error metadata with request details for debugging and monitoring
        const errorMetadata = {
            error: {
                message: errorMessage,
                name: errorName,
                code: errorCode,
                statusCode: statusCode,
                stack: errorStack
            },
            request: {
                method: req?.method || 'UNKNOWN',
                path: req?.path || req?.url || '/',
                originalUrl: req?.originalUrl || req?.url || '/',
                baseUrl: req?.baseUrl || '',
                query: req?.query || {},
                params: req?.params || {},
                httpVersion: req?.httpVersion || '1.1',
                protocol: req?.protocol || 'http'
            },
            client: {
                ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
                userAgent: req?.get?.('user-agent') || req?.headers?.['user-agent'] || 'unknown',
                referer: req?.get?.('referer') || req?.headers?.referer || null,
                contentType: req?.get?.('content-type') || req?.headers?.['content-type'] || null
            },
            timestamp: new Date().toISOString(),
            correlationId: req?.correlationId || req?.id || null
        };
        
        // Filter sensitive information in production environment for security compliance
        const environment = CONFIG?.app?.env || process.env.NODE_ENV || 'development';
        if (environment === 'production') {
            // Remove potentially sensitive headers and request data in production
            const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
            if (req?.headers) {
                Object.keys(req.headers).forEach(header => {
                    if (sensitiveHeaders.includes(header.toLowerCase())) {
                        delete errorMetadata.client[header];
                    }
                });
            }
            
            // Remove query parameters that might contain sensitive data
            if (errorMetadata.request.query) {
                const sensitiveParams = ['password', 'token', 'secret', 'key', 'auth'];
                Object.keys(errorMetadata.request.query).forEach(param => {
                    if (sensitiveParams.some(sensitive => param.toLowerCase().includes(sensitive))) {
                        errorMetadata.request.query[param] = '[REDACTED]';
                    }
                });
            }
            
            // Sanitize error stack trace for production security
            if (errorMetadata.error.stack) {
                // Remove file paths that might reveal server structure
                errorMetadata.error.stack = errorMetadata.error.stack
                    .split('\n')
                    .map(line => line.replace(/\/[^\/\s]+\/[^\/\s]+\//g, '/[path]/'))
                    .join('\n');
            }
        }
        
        // Include performance context if available for debugging and optimization
        if (req?.performance) {
            errorMetadata.performance = {
                startTime: req.performance.startTime,
                duration: Date.now() - (req.performance.startTime || Date.now())
            };
        }
        
        // Update ERROR_STATS with error occurrence data for monitoring and analytics
        updateErrorStats(statusCode, errorName);
        
        // Log error using logger.error() with structured metadata for monitoring and debugging
        logger.error(`HTTP ${statusCode} Error: ${errorMessage}`, errorMetadata);
        
        // Track error in recent_errors array for trend analysis and monitoring (limit to last 100)
        ERROR_STATS.recent_errors.push({
            timestamp: new Date().toISOString(),
            statusCode: statusCode,
            message: errorMessage,
            path: errorMetadata.request.path,
            method: errorMetadata.request.method,
            clientIp: errorMetadata.client.ip,
            correlationId: errorMetadata.correlationId
        });
        
        // Keep recent errors array size manageable for memory efficiency
        if (ERROR_STATS.recent_errors.length > 100) {
            ERROR_STATS.recent_errors = ERROR_STATS.recent_errors.slice(-100);
        }
        
        // Update last error timestamp for monitoring
        ERROR_STATS.last_error = new Date().toISOString();
        
    } catch (loggingError) {
        // Handle error logging failures gracefully to prevent cascading errors
        console.error('[Error Middleware] Failed to log error:', loggingError.message);
        console.error('[Error Middleware] Original error:', error);
        
        // Attempt basic error logging as fallback
        try {
            logger.error('Error logging failed - fallback logging', {
                originalError: error instanceof Error ? error.message : String(error),
                loggingError: loggingError.message,
                statusCode: statusCode,
                timestamp: new Date().toISOString()
            });
        } catch (fallbackError) {
            // If even fallback logging fails, use console output as last resort
            console.error('[Error Middleware] Fallback logging also failed:', fallbackError.message);
        }
    }
}

/**
 * Formats error responses based on environment configuration and security requirements.
 * This function determines if stack trace should be included based on environment, creates base error 
 * response object with status and message, adds timestamp and correlation ID to response, includes stack 
 * trace only in development environment, sanitizes error message for production security, applies 
 * standardized error response format from constants, and returns formatted error response object.
 * 
 * Error response formatting features:
 * - Environment-aware response formatting with development vs production considerations
 * - Security-compliant error message sanitization to prevent information disclosure
 * - Structured JSON response format with consistent error response schema
 * - Stack trace inclusion control based on environment for debugging vs security
 * - Correlation ID integration for request tracing and distributed system debugging
 * - Timestamp inclusion for error occurrence tracking and debugging
 * 
 * @param {Error|string} error - Error object or string containing error information
 * @param {number} statusCode - HTTP status code for error response classification
 * @param {boolean} includeStack - Whether to include stack trace in response (development only)
 * @returns {Object} Formatted error response object ready for HTTP transmission with proper structure
 */
function formatErrorResponse(error, statusCode, includeStack) {
    try {
        // Determine environment for response formatting decisions
        const environment = CONFIG?.app?.env || process.env.NODE_ENV || 'development';
        const isDevelopment = environment === 'development';
        const isProduction = environment === 'production';
        
        // Extract error information from error object or string
        let errorMessage = '';
        let errorName = 'Error';
        let errorStack = null;
        
        if (error instanceof Error) {
            errorMessage = error.message || 'An error occurred';
            errorName = error.name || 'Error';
            errorStack = error.stack || null;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else {
            errorMessage = 'An error occurred while processing your request';
        }
        
        // Sanitize error message for production security to prevent information disclosure
        if (isProduction) {
            // Use generic error messages for common error types in production
            switch (statusCode) {
                case HTTP_STATUS.NOT_FOUND:
                    errorMessage = ERROR_MESSAGES.ROUTE_NOT_FOUND;
                    break;
                case HTTP_STATUS.METHOD_NOT_ALLOWED:
                    errorMessage = ERROR_MESSAGES.METHOD_NOT_ALLOWED;
                    break;
                case HTTP_STATUS.INTERNAL_SERVER_ERROR:
                    errorMessage = ERROR_MESSAGES.INTERNAL_ERROR;
                    break;
                case HTTP_STATUS.SERVICE_UNAVAILABLE:
                    errorMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
                    break;
                default:
                    errorMessage = 'An error occurred while processing your request';
            }
        }
        
        // Create base error response object with standardized structure
        const errorResponse = {
            status: 'error',
            error: {
                message: errorMessage,
                code: statusCode,
                type: errorName
            },
            timestamp: new Date().toISOString(),
            path: null,
            method: null
        };
        
        // Include stack trace only in development environment for debugging
        if (isDevelopment && includeStack && errorStack) {
            errorResponse.error.stack = errorStack.split('\n').map(line => line.trim());
        }
        
        // Add environment-specific error details for debugging assistance
        if (isDevelopment) {
            errorResponse.debug = {
                environment: environment,
                nodeVersion: process.version,
                platform: process.platform
            };
        }
        
        // Include helpful error codes for client-side error handling
        let errorCode = 'UNKNOWN_ERROR';
        switch (statusCode) {
            case HTTP_STATUS.BAD_REQUEST:
                errorCode = 'BAD_REQUEST';
                break;
            case HTTP_STATUS.NOT_FOUND:
                errorCode = 'NOT_FOUND';
                break;
            case HTTP_STATUS.METHOD_NOT_ALLOWED:
                errorCode = 'METHOD_NOT_ALLOWED';
                break;
            case HTTP_STATUS.INTERNAL_SERVER_ERROR:
                errorCode = 'INTERNAL_SERVER_ERROR';
                break;
            case HTTP_STATUS.SERVICE_UNAVAILABLE:
                errorCode = 'SERVICE_UNAVAILABLE';
                break;
        }
        errorResponse.error.errorCode = errorCode;
        
        // Return frozen error response object to prevent modification
        return Object.freeze(errorResponse);
        
    } catch (formattingError) {
        // Handle response formatting errors gracefully with minimal fallback response
        console.error('[Error Middleware] Failed to format error response:', formattingError.message);
        
        // Return minimal error response as fallback
        return Object.freeze({
            status: 'error',
            error: {
                message: 'An error occurred while processing your request',
                code: statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                type: 'FormattingError'
            },
            timestamp: new Date().toISOString(),
            errorCode: 'RESPONSE_FORMAT_ERROR'
        });
    }
}

/**
 * Updates error statistics for monitoring and operational insights.
 * This function increments total error counter in ERROR_STATS, updates by_status counter for specific 
 * HTTP status code, tracks error type (route_not_found, server_error, etc.), maintains recent_errors 
 * sliding window for trend analysis, prunes old errors from recent_errors array, and logs error 
 * statistics if debug logging is enabled for operational monitoring.
 * 
 * Error statistics tracking features:
 * - Total error count tracking for overall application health monitoring
 * - Status code breakdown for error pattern analysis and troubleshooting
 * - Error type classification for specific error condition tracking
 * - Recent errors sliding window for trend analysis and operational monitoring
 * - Memory-efficient statistics storage with automatic cleanup
 * - Debug logging integration for development troubleshooting
 * 
 * @param {number} statusCode - HTTP status code for error classification and counting
 * @param {string} errorType - Error type classification for specific error tracking
 * @returns {void} No return value - updates ERROR_STATS global object for monitoring
 */
function updateErrorStats(statusCode, errorType) {
    try {
        // Increment total error counter for overall error tracking
        ERROR_STATS.total += 1;
        
        // Update status code specific counter for error pattern analysis
        if (typeof statusCode === 'number') {
            if (!ERROR_STATS.by_status[statusCode]) {
                ERROR_STATS.by_status[statusCode] = 0;
            }
            ERROR_STATS.by_status[statusCode] += 1;
        }
        
        // Track error type frequency for specific error condition monitoring
        if (errorType && typeof errorType === 'string') {
            if (!ERROR_STATS.error_types) {
                ERROR_STATS.error_types = {};
            }
            if (!ERROR_STATS.error_types[errorType]) {
                ERROR_STATS.error_types[errorType] = 0;
            }
            ERROR_STATS.error_types[errorType] += 1;
        }
        
        // Update hourly error tracking for trend analysis
        const currentHour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH format
        if (!ERROR_STATS.hourly_counts) {
            ERROR_STATS.hourly_counts = {};
        }
        if (!ERROR_STATS.hourly_counts[currentHour]) {
            ERROR_STATS.hourly_counts[currentHour] = 0;
        }
        ERROR_STATS.hourly_counts[currentHour] += 1;
        
        // Maintain only last 24 hours of hourly data for memory efficiency
        const hourlyKeys = Object.keys(ERROR_STATS.hourly_counts);
        if (hourlyKeys.length > 24) {
            const sortedKeys = hourlyKeys.sort();
            const keysToRemove = sortedKeys.slice(0, sortedKeys.length - 24);
            keysToRemove.forEach(key => delete ERROR_STATS.hourly_counts[key]);
        }
        
        // Update last updated timestamp for monitoring freshness
        ERROR_STATS.last_updated = new Date().toISOString();
        
        // Log error statistics update if debug logging enabled
        const environment = CONFIG?.app?.env || process.env.NODE_ENV || 'development';
        if (environment === 'development') {
            logger.debug('Error statistics updated', {
                totalErrors: ERROR_STATS.total,
                statusCode: statusCode,
                errorType: errorType,
                recentErrorCount: ERROR_STATS.recent_errors.length,
                hourlyCount: ERROR_STATS.hourly_counts[currentHour]
            });
        }
        
    } catch (statsError) {
        // Handle statistics update errors gracefully to prevent cascading failures
        console.error('[Error Middleware] Failed to update error statistics:', statsError.message);
        
        // Ensure total counter is at least updated as basic fallback
        try {
            if (typeof ERROR_STATS.total === 'number') {
                ERROR_STATS.total += 1;
            } else {
                ERROR_STATS.total = 1;
            }
        } catch (fallbackError) {
            console.error('[Error Middleware] Failed to update even basic error statistics:', fallbackError.message);
        }
    }
}

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Express middleware function that handles 404 Not Found errors for unmatched routes.
 * This function extracts request method and path from req object, logs route not found warning with 
 * request details, updates error statistics using updateErrorStats(), creates 404 error response using 
 * formatErrorResponse(), sets HTTP status code to 404 using res.status(), sets Content-Type header to 
 * application/json, sends formatted NOT_FOUND response using res.json(), and does not call next() as 
 * this terminates the middleware chain for unmatched routes.
 * 
 * Route not found handling features:
 * - Comprehensive request context logging for debugging unmatched routes
 * - Error statistics integration for 404 tracking and monitoring
 * - Standardized JSON error response formatting for consistent client handling
 * - Proper HTTP status code and Content-Type header configuration
 * - Security-compliant error message formatting for production environments
 * - Request correlation for distributed system tracing and debugging
 * 
 * @param {Object} req - Express.js request object containing HTTP request details
 * @param {Object} res - Express.js response object for sending HTTP response
 * @param {Function} next - Express.js next middleware function (not called for route termination)
 * @returns {void} No return value - sends HTTP response and terminates middleware chain
 */
function handleRouteNotFound(req, res, next) {
    try {
        // Extract request details for logging and response context
        const method = req.method || 'UNKNOWN';
        const path = req.path || req.url || '/';
        const originalUrl = req.originalUrl || path;
        
        // Create request context for correlation and debugging
        const requestContext = {
            method: method,
            path: path,
            originalUrl: originalUrl,
            baseUrl: req.baseUrl || '',
            query: req.query || {},
            ip: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            correlationId: req.correlationId || req.id || null
        };
        
        // Log route not found warning with comprehensive request details
        logger.warn(`Route not found: ${method} ${originalUrl}`, {
            request: requestContext,
            timestamp: new Date().toISOString(),
            statusCode: HTTP_STATUS.NOT_FOUND,
            errorType: 'route_not_found',
            clientInfo: {
                ip: requestContext.ip,
                userAgent: requestContext.userAgent,
                referer: req.get('referer') || null
            }
        });
        
        // Update error statistics for 404 tracking and monitoring
        updateErrorStats(HTTP_STATUS.NOT_FOUND, 'route_not_found');
        
        // Create standardized 404 error response using formatErrorResponse()
        const errorResponse = formatErrorResponse(
            new Error(ERROR_MESSAGES.ROUTE_NOT_FOUND),
            HTTP_STATUS.NOT_FOUND,
            false // Never include stack trace for 404 errors
        );
        
        // Add request-specific context to error response for debugging
        errorResponse.path = originalUrl;
        errorResponse.method = method;
        
        // Set HTTP status code to 404 Not Found
        res.status(HTTP_STATUS.NOT_FOUND);
        
        // Set Content-Type header to application/json for proper response formatting
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        
        // Set additional security headers for production safety
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        // Send formatted JSON error response to client
        res.json(errorResponse);
        
        // Note: Do not call next() as this terminates the middleware chain for unmatched routes
        
    } catch (handlerError) {
        // Handle route not found handler errors gracefully
        console.error('[Error Middleware] Error in handleRouteNotFound:', handlerError.message);
        
        // Log the handler error for debugging
        try {
            logger.error('Route not found handler failed', {
                handlerError: handlerError.message,
                originalRequest: {
                    method: req?.method,
                    path: req?.path || req?.url,
                    ip: req?.ip
                },
                timestamp: new Date().toISOString()
            });
        } catch (loggingError) {
            console.error('[Error Middleware] Failed to log handler error:', loggingError.message);
        }
        
        // Send basic 404 response as fallback
        try {
            if (!res.headersSent) {
                res.status(HTTP_STATUS.NOT_FOUND);
                res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
                res.json({
                    status: 'error',
                    error: {
                        message: ERROR_MESSAGES.ROUTE_NOT_FOUND,
                        code: HTTP_STATUS.NOT_FOUND,
                        errorCode: 'NOT_FOUND'
                    },
                    timestamp: new Date().toISOString()
                });
            }
        } catch (fallbackError) {
            console.error('[Error Middleware] Fallback response also failed:', fallbackError.message);
        }
    }
}

/**
 * Express.js 5.1.0 compatible error handling middleware that processes all application errors with automatic promise support.
 * This function checks if response has already been sent to client, determines HTTP status code from error object or 
 * defaults to 500, logs error with full context using logError(), updates error statistics using updateErrorStats(), 
 * formats error response based on environment using formatErrorResponse(), sets HTTP status code using res.status(), 
 * sets Content-Type header to application/json, sends formatted error response using res.json(), and handles Express 
 * 5.1.0 automatic promise rejection forwarding for comprehensive error management.
 * 
 * Error handling middleware features:
 * - Express.js 5.1.0 automatic promise rejection forwarding for async/await error handling
 * - Comprehensive error logging with request context and correlation tracking
 * - Environment-aware error response formatting with security considerations
 * - HTTP status code determination from error objects with fallback handling
 * - Duplicate response prevention with headersSent checking
 * - Error statistics integration for operational monitoring and insights
 * - Security-compliant error response formatting for production environments
 * 
 * @param {Error} err - Error object containing error information, stack trace, and optional status code
 * @param {Object} req - Express.js request object containing HTTP request details and metadata
 * @param {Object} res - Express.js response object for sending HTTP error response
 * @param {Function} next - Express.js next middleware function (not typically called in error handlers)
 * @returns {void} No return value - sends HTTP error response with proper status codes and formatting
 */
function expressErrorHandler(err, req, res, next) {
    try {
        // Check if response has already been sent to prevent duplicate responses
        if (res.headersSent) {
            // If headers are already sent, delegate to Express default error handler
            logger.warn('Attempted to send error response after headers were sent', {
                error: err?.message || 'Unknown error',
                method: req?.method,
                path: req?.path || req?.url,
                correlationId: req?.correlationId || req?.id
            });
            return next(err);
        }
        
        // Determine HTTP status code from error object or default to 500 Internal Server Error
        let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
        // Check various properties where status code might be stored
        if (err.statusCode && typeof err.statusCode === 'number') {
            statusCode = err.statusCode;
        } else if (err.status && typeof err.status === 'number') {
            statusCode = err.status;
        } else if (err.code && typeof err.code === 'number') {
            statusCode = err.code;
        }
        
        // Ensure status code is within valid HTTP range
        if (statusCode < 400 || statusCode > 599) {
            statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        }
        
        // Log error with comprehensive context using logError() for debugging and monitoring
        logError(err, req, statusCode);
        
        // Update error statistics for operational monitoring using updateErrorStats()
        const errorType = err?.name || err?.constructor?.name || 'UnknownError';
        updateErrorStats(statusCode, errorType);
        
        // Determine if stack trace should be included based on environment
        const environment = CONFIG?.app?.env || process.env.NODE_ENV || 'development';
        const includeStack = environment === 'development';
        
        // Format error response based on environment using formatErrorResponse()
        const errorResponse = formatErrorResponse(err, statusCode, includeStack);
        
        // Add request-specific context to error response for debugging assistance
        errorResponse.path = req.originalUrl || req.path || req.url;
        errorResponse.method = req.method;
        
        // Include correlation ID if available for distributed system tracing
        if (req.correlationId || req.id) {
            errorResponse.correlationId = req.correlationId || req.id;
        }
        
        // Add timestamp for error occurrence tracking
        errorResponse.timestamp = new Date().toISOString();
        
        // Set HTTP status code for proper error response classification
        res.status(statusCode);
        
        // Set Content-Type header to application/json for structured error response
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        
        // Set security headers for production error response safety
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        // Remove any potentially sensitive headers in error responses
        res.removeHeader('X-Powered-By');
        res.removeHeader('Server');
        
        // Send formatted JSON error response to client
        res.json(errorResponse);
        
        // Note: Express 5.1.0 automatically handles promise rejections by forwarding to this middleware
        
    } catch (middlewareError) {
        // Handle error middleware failures gracefully to prevent cascading errors
        console.error('[Error Middleware] Error in expressErrorHandler:', middlewareError.message);
        
        // Log the middleware error for debugging and monitoring
        try {
            logger.error('Express error handler failed', {
                middlewareError: middlewareError.message,
                originalError: err?.message || 'Unknown error',
                request: {
                    method: req?.method,
                    path: req?.path || req?.url,
                    ip: req?.ip
                },
                timestamp: new Date().toISOString()
            });
        } catch (loggingError) {
            console.error('[Error Middleware] Failed to log middleware error:', loggingError.message);
        }
        
        // Attempt to send basic error response as fallback
        try {
            if (!res.headersSent) {
                res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR);
                res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
                res.json({
                    status: 'error',
                    error: {
                        message: ERROR_MESSAGES.INTERNAL_ERROR,
                        code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        errorCode: 'INTERNAL_SERVER_ERROR'
                    },
                    timestamp: new Date().toISOString()
                });
            }
        } catch (fallbackError) {
            console.error('[Error Middleware] Fallback error response failed:', fallbackError.message);
            // If even basic response fails, delegate to Express default error handler
            return next(middlewareError);
        }
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Factory function for creating custom error objects with specific status codes and metadata.
 * This function creates new Error instance with provided message, attaches statusCode property to error object, 
 * attaches metadata object for additional context, sets error name property for error type identification, 
 * configures error stack trace for debugging, and returns enhanced error object with comprehensive context 
 * for consistent error handling throughout the application.
 * 
 * Custom error creation features:
 * - Enhanced Error objects with HTTP status code integration for proper response handling
 * - Metadata attachment for additional context and debugging information
 * - Error name and type configuration for error classification and handling
 * - Stack trace preservation for development debugging and troubleshooting
 * - Input validation to prevent error object corruption and injection attacks
 * - Consistent error object structure for standardized error handling patterns
 * 
 * @param {string} message - Error message describing the error condition or failure
 * @param {number} statusCode - HTTP status code associated with the error for response handling
 * @param {Object} metadata - Optional metadata object containing additional error context and debugging information
 * @returns {Error} Enhanced error object with statusCode property, metadata, and proper error classification
 */
function createCustomError(message, statusCode, metadata = {}) {
    try {
        // Validate input parameters to prevent error object corruption
        const errorMessage = typeof message === 'string' && message.trim().length > 0 
            ? message.trim() 
            : 'Custom error occurred';
            
        const errorStatusCode = typeof statusCode === 'number' && statusCode >= 400 && statusCode <= 599 
            ? statusCode 
            : HTTP_STATUS.INTERNAL_SERVER_ERROR;
            
        const errorMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) 
            ? metadata 
            : {};
        
        // Create new Error instance with validated message
        const customError = new Error(errorMessage);
        
        // Attach HTTP status code property for Express.js error handling integration
        customError.statusCode = errorStatusCode;
        customError.status = errorStatusCode; // Alternative property name for compatibility
        
        // Attach metadata object for additional context and debugging information
        customError.metadata = { ...errorMetadata };
        
        // Set error name property for error type identification and classification
        customError.name = 'CustomError';
        
        // Add error creation timestamp for debugging and monitoring
        customError.createdAt = new Date().toISOString();
        
        // Add error code based on status code for programmatic error handling
        let errorCode = 'CUSTOM_ERROR';
        switch (errorStatusCode) {
            case HTTP_STATUS.BAD_REQUEST:
                errorCode = 'BAD_REQUEST_ERROR';
                customError.name = 'BadRequestError';
                break;
            case HTTP_STATUS.NOT_FOUND:
                errorCode = 'NOT_FOUND_ERROR';
                customError.name = 'NotFoundError';
                break;
            case HTTP_STATUS.METHOD_NOT_ALLOWED:
                errorCode = 'METHOD_NOT_ALLOWED_ERROR';
                customError.name = 'MethodNotAllowedError';
                break;
            case HTTP_STATUS.INTERNAL_SERVER_ERROR:
                errorCode = 'INTERNAL_SERVER_ERROR';
                customError.name = 'InternalServerError';
                break;
            case HTTP_STATUS.SERVICE_UNAVAILABLE:
                errorCode = 'SERVICE_UNAVAILABLE_ERROR';
                customError.name = 'ServiceUnavailableError';
                break;
        }
        customError.code = errorCode;
        
        // Preserve proper stack trace for debugging (Node.js specific)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(customError, createCustomError);
        }
        
        // Add helpful debugging information for development environments
        const environment = CONFIG?.app?.env || process.env.NODE_ENV || 'development';
        if (environment === 'development') {
            customError.debug = {
                createdBy: 'createCustomError',
                environment: environment,
                nodeVersion: process.version,
                timestamp: customError.createdAt
            };
        }
        
        // Return enhanced error object ready for Express.js error handling
        return customError;
        
    } catch (creationError) {
        // Handle custom error creation failures gracefully
        console.error('[Error Middleware] Failed to create custom error:', creationError.message);
        
        // Return basic error object as fallback to ensure error handling continues
        const fallbackError = new Error(message || 'Error creation failed');
        fallbackError.statusCode = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
        fallbackError.status = fallbackError.statusCode;
        fallbackError.name = 'ErrorCreationFailure';
        fallbackError.metadata = { creationError: creationError.message };
        fallbackError.createdAt = new Date().toISOString();
        
        return fallbackError;
    }
}

/**
 * Returns current error statistics for monitoring and health check purposes.
 * This function returns deep copy of ERROR_STATS object, includes total error count and breakdown by status codes, 
 * includes recent errors summary for trend analysis, adds timestamp of statistics snapshot, and returns comprehensive 
 * statistics object for operational monitoring, health checks, and system observability with complete error tracking data.
 * 
 * Error statistics features:
 * - Comprehensive error count reporting with total and status code breakdown
 * - Recent error trend analysis with sliding window for operational monitoring
 * - Error type frequency reporting for pattern analysis and troubleshooting
 * - Hourly error distribution for trend analysis and capacity planning
 * - Statistics snapshot timestamp for monitoring freshness and accuracy
 * - Memory usage reporting for error tracking overhead assessment
 * 
 * @returns {Object} Comprehensive error statistics object with counts, trends, and operational metrics
 */
function getErrorStats() {
    try {
        // Create deep copy of ERROR_STATS to prevent external modification
        const statsSnapshot = JSON.parse(JSON.stringify(ERROR_STATS));
        
        // Add statistics snapshot timestamp for monitoring freshness
        statsSnapshot.snapshot_timestamp = new Date().toISOString();
        
        // Calculate additional statistics for enhanced monitoring
        const currentTime = Date.now();
        const oneHourAgo = currentTime - (60 * 60 * 1000);
        const oneDayAgo = currentTime - (24 * 60 * 60 * 1000);
        
        // Count recent errors for trend analysis
        const recentErrorsLastHour = statsSnapshot.recent_errors.filter(error => {
            const errorTime = new Date(error.timestamp).getTime();
            return errorTime >= oneHourAgo;
        }).length;
        
        const recentErrorsLastDay = statsSnapshot.recent_errors.filter(error => {
            const errorTime = new Date(error.timestamp).getTime();
            return errorTime >= oneDayAgo;
        }).length;
        
        // Add computed statistics for operational insights
        statsSnapshot.computed = {
            errors_last_hour: recentErrorsLastHour,
            errors_last_24_hours: recentErrorsLastDay,
            error_rate_per_hour: recentErrorsLastHour / 1, // Errors per hour
            error_rate_per_day: recentErrorsLastDay / 24, // Errors per day average
            most_common_status: null,
            most_common_error_type: null,
            uptime_since_start: null
        };
        
        // Find most common status code for pattern analysis
        let maxCount = 0;
        let mostCommonStatus = null;
        Object.entries(statsSnapshot.by_status || {}).forEach(([status, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommonStatus = status;
            }
        });
        statsSnapshot.computed.most_common_status = mostCommonStatus;
        
        // Find most common error type for pattern analysis
        if (statsSnapshot.error_types) {
            let maxTypeCount = 0;
            let mostCommonType = null;
            Object.entries(statsSnapshot.error_types).forEach(([type, count]) => {
                if (count > maxTypeCount) {
                    maxTypeCount = count;
                    mostCommonType = type;
                }
            });
            statsSnapshot.computed.most_common_error_type = mostCommonType;
        }
        
        // Calculate uptime since error tracking started
        if (statsSnapshot.started_at) {
            const startTime = new Date(statsSnapshot.started_at).getTime();
            const uptimeMs = currentTime - startTime;
            statsSnapshot.computed.uptime_since_start = {
                milliseconds: uptimeMs,
                seconds: Math.floor(uptimeMs / 1000),
                minutes: Math.floor(uptimeMs / (1000 * 60)),
                hours: Math.floor(uptimeMs / (1000 * 60 * 60)),
                human_readable: `${Math.floor(uptimeMs / (1000 * 60 * 60))}h ${Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))}m`
            };
        }
        
        // Add memory usage estimates for error tracking overhead
        statsSnapshot.memory_usage = {
            estimated_bytes: JSON.stringify(ERROR_STATS).length,
            recent_errors_count: statsSnapshot.recent_errors.length,
            status_codes_tracked: Object.keys(statsSnapshot.by_status || {}).length,
            error_types_tracked: Object.keys(statsSnapshot.error_types || {}).length
        };
        
        // Add health indicators based on error statistics
        statsSnapshot.health = {
            status: statsSnapshot.total > 1000 ? 'warning' : 'healthy',
            error_rate_status: recentErrorsLastHour > 10 ? 'high' : recentErrorsLastHour > 5 ? 'medium' : 'low',
            tracking_healthy: true,
            recommendations: []
        };
        
        // Add recommendations based on error patterns
        if (recentErrorsLastHour > 10) {
            statsSnapshot.health.recommendations.push('High error rate detected - investigate recent errors');
        }
        if (statsSnapshot.by_status && statsSnapshot.by_status[HTTP_STATUS.INTERNAL_SERVER_ERROR] > 10) {
            statsSnapshot.health.recommendations.push('High number of 500 errors - check application health');
        }
        if (statsSnapshot.recent_errors.length >= 100) {
            statsSnapshot.health.recommendations.push('Recent errors buffer is full - consider log aggregation');
        }
        
        // Return comprehensive statistics object ready for monitoring and analysis
        return Object.freeze(statsSnapshot);
        
    } catch (statsError) {
        // Handle statistics retrieval errors gracefully
        console.error('[Error Middleware] Failed to get error statistics:', statsError.message);
        
        // Return minimal statistics as fallback
        return Object.freeze({
            error: {
                occurred: true,
                message: statsError.message,
                timestamp: new Date().toISOString()
            },
            fallback: {
                total: ERROR_STATS?.total || 0,
                last_error: ERROR_STATS?.last_error || null,
                statistics_available: false
            },
            snapshot_timestamp: new Date().toISOString()
        });
    }
}

// =============================================================================
// INITIALIZATION AND MODULE EXPORTS
// =============================================================================

// Initialize error handling system when module is loaded
initializeErrorHandling();

// Export all error handling middleware functions and utilities
module.exports = {
    // Express middleware for handling 404 Not Found errors on unmatched routes
    handleRouteNotFound,
    
    // Express 5.1.0 compatible error handling middleware with automatic promise error support
    expressErrorHandler,
    
    // Factory function for creating custom error objects with status codes and metadata
    createCustomError,
    
    // Utility function to retrieve error statistics for monitoring and health checks
    getErrorStats,
    
    // Initialization function for setting up error handling configuration and statistics
    initializeErrorHandling
};