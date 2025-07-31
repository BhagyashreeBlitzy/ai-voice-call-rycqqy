/**
 * Express.js Request Logging Middleware for Node.js Tutorial Application
 * 
 * This module provides comprehensive HTTP request/response logging capabilities for the Node.js 
 * tutorial application. The middleware logs incoming HTTP requests with method, URL, headers, 
 * response status, response time, and user agent information using structured console output 
 * for educational debugging and development monitoring.
 * 
 * Supports configurable logging levels, environment-specific behavior, and integration with 
 * the application's logging system using Express.js 5.1.0 middleware patterns and Node.js 
 * v22.x LTS performance optimizations.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import logger factory function for creating component-specific logger
const { getLogger } = require('../utils/logger.js');

// Import HTTP status code constants for response status logging and classification
const { 
    HTTP_STATUS: { OK, INTERNAL_SERVER_ERROR } 
} = require('../utils/constants.js');

// Import HTTP method constants for request method logging and validation
const { 
    HTTP_METHODS: { GET, POST } 
} = require('../utils/constants.js');

// Import environment detection utilities for development-specific logging behavior
const { 
    isDevelopmentEnvironment,
    isTestEnvironment 
} = require('../utils/environment.js');

/**
 * Global component-specific logger instance for request logging operations.
 * Uses getLogger factory to create consistent logging interface with other application components.
 * @type {Logger}
 */
const logger = getLogger('requestLogger');

/**
 * Global request counter for tracking total number of requests processed by the application.
 * Provides unique request identification and helps with debugging and monitoring.
 * @type {number}
 */
let requestCount = 0;

/**
 * Global verbose logging flag based on development environment detection.
 * Enables detailed logging output in development environments for enhanced debugging.
 * @type {boolean}
 */
const isVerboseLogging = isDevelopmentEnvironment();

/**
 * Main Express.js middleware function for HTTP request logging that logs incoming requests 
 * with method, URL, timestamp, and response information for development debugging and monitoring.
 * 
 * This middleware integrates with the Express.js request-response cycle to provide comprehensive
 * logging of HTTP transactions including request details, response status, and performance metrics.
 * 
 * @param {Object} req - Express.js request object containing HTTP request information
 * @param {Object} res - Express.js response object for HTTP response operations
 * @param {Function} next - Express.js next function to continue middleware chain execution
 * @returns {void} Calls next() to continue middleware chain execution
 */
function requestLoggerMiddleware(req, res, next) {
    // Increment global request counter for request tracking and monitoring
    requestCount++;
    
    // Record request start timestamp using Date.now() for response time calculation
    const requestStartTime = Date.now();
    
    // Generate unique request identifier for correlation between request and response logs
    const requestId = createRequestId();
    
    // Extract request method, URL, user agent, and IP address from request object
    const requestMethod = req.method || 'UNKNOWN';
    const requestUrl = req.url || '/';
    const userAgent = req.get('User-Agent') || 'Unknown';
    const clientIp = req.ip || req.connection.remoteAddress || 'Unknown';
    
    // Log incoming request information including method, URL, user agent, and request ID
    if (shouldLogRequest(req, { verbose: isVerboseLogging })) {
        const requestInfo = formatRequestInfo(req, requestId);
        logger.info(`Incoming request: ${requestInfo}`);
        
        // Log additional verbose information in development environment
        if (isVerboseLogging) {
            logger.debug(`Request details - ID: ${requestId}, Count: ${requestCount}, IP: ${clientIp}, User-Agent: ${userAgent}`);
        }
    }
    
    // Attach request start time and request ID to request object for response logging
    req.requestStartTime = requestStartTime;
    req.requestId = requestId;
    req.requestCount = requestCount;
    
    // Store original res.end method to intercept response completion
    const originalResEnd = res.end;
    
    // Override res.end method to capture response information when request completes
    res.end = function(chunk, encoding) {
        // Calculate response time and log request completion
        const responseTime = Date.now() - requestStartTime;
        const statusCode = res.statusCode || INTERNAL_SERVER_ERROR;
        
        // Log response status code, response time, and request completion information
        if (shouldLogRequest(req, { verbose: isVerboseLogging })) {
            const responseInfo = formatResponseInfo(req, res, responseTime, requestId);
            const logLevel = getLogLevel(statusCode, responseTime, { verbose: isVerboseLogging });
            
            // Use appropriate log level based on response status and performance
            switch (logLevel) {
                case 'ERROR':
                    logger.error(`Request completed: ${responseInfo}`);
                    break;
                case 'WARN':
                    logger.warn(`Request completed: ${responseInfo}`);
                    break;
                case 'DEBUG':
                    logger.debug(`Request completed: ${responseInfo}`);
                    break;
                default:
                    logger.info(`Request completed: ${responseInfo}`);
            }
        }
        
        // Call original res.end to complete the HTTP response
        originalResEnd.call(this, chunk, encoding);
    };
    
    // Call next() to continue to next middleware in Express.js pipeline
    next();
}

/**
 * Factory function for creating configurable request logger middleware with custom options 
 * for logging level, format, and filtering based on environment and configuration requirements.
 * 
 * This function provides flexibility for different logging configurations while maintaining
 * consistent behavior and integration with the application's logging system.
 * 
 * @param {Object} options - Configuration options for the request logger middleware
 * @param {string} options.logLevel - Minimum log level for request logging (DEBUG, INFO, WARN, ERROR)
 * @param {boolean} options.verbose - Enable verbose logging with additional request details
 * @param {Array<string>} options.excludePaths - Array of URL paths to exclude from logging
 * @param {Array<string>} options.excludeMethods - Array of HTTP methods to exclude from logging
 * @param {boolean} options.logHeaders - Enable logging of request headers
 * @param {boolean} options.logUserAgent - Enable logging of user agent information
 * @returns {Function} Configured Express.js middleware function for request logging
 */
function createRequestLogger(options = {}) {
    // Extract and validate configuration options including log level and format preferences
    const config = {
        logLevel: options.logLevel || 'INFO',
        verbose: options.verbose !== undefined ? options.verbose : isDevelopmentEnvironment(),
        excludePaths: options.excludePaths || [],
        excludeMethods: options.excludeMethods || [],
        logHeaders: options.logHeaders || false,
        logUserAgent: options.logUserAgent !== false,
        includeResponseTime: options.includeResponseTime !== false
    };
    
    // Create component-specific logger with provided options using getLogger factory
    const configuredLogger = getLogger(`requestLogger-${Date.now()}`);
    
    // Determine logging verbosity based on environment and configuration options
    const verboseLogging = config.verbose || isDevelopmentEnvironment();
    
    // Log configuration initialization for debugging purposes
    if (verboseLogging) {
        configuredLogger.debug(`Request logger configured with options: ${JSON.stringify(config)}`);
    }
    
    // Return configured middleware function with captured configuration closure
    return function configuredRequestLoggerMiddleware(req, res, next) {
        try {
            // Apply environment-specific behavior for development vs production logging
            if (isTestEnvironment() && !config.verbose) {
                // Skip detailed logging in test environment unless explicitly enabled
                return next();
            }
            
            // Increment request counter and generate request ID
            requestCount++;
            const requestStartTime = Date.now();
            const requestId = createRequestId();
            
            // Apply request filtering options for selective request logging if specified
            if (!shouldLogRequest(req, config)) {
                req.requestStartTime = requestStartTime;
                req.requestId = requestId;
                return next();
            }
            
            // Log incoming request with configured verbosity level
            const requestInfo = formatRequestInfo(req, requestId);
            configuredLogger.info(`Incoming request: ${requestInfo}`);
            
            // Include additional verbose information if enabled
            if (verboseLogging) {
                const clientIp = req.ip || req.connection.remoteAddress || 'Unknown';
                const userAgent = config.logUserAgent ? (req.get('User-Agent') || 'Unknown') : 'Hidden';
                configuredLogger.debug(`Request details - ID: ${requestId}, Count: ${requestCount}, IP: ${clientIp}, User-Agent: ${userAgent}`);
                
                // Log request headers if enabled
                if (config.logHeaders) {
                    configuredLogger.debug(`Request headers: ${JSON.stringify(req.headers)}`);
                }
            }
            
            // Attach request metadata to request object
            req.requestStartTime = requestStartTime;
            req.requestId = requestId;
            req.requestCount = requestCount;
            
            // Override response end method for response logging
            const originalResEnd = res.end;
            res.end = function(chunk, encoding) {
                const responseTime = Date.now() - requestStartTime;
                const statusCode = res.statusCode || INTERNAL_SERVER_ERROR;
                
                // Log response completion with configured detail level
                const responseInfo = formatResponseInfo(req, res, responseTime, requestId);
                const logLevel = getLogLevel(statusCode, responseTime, config);
                
                switch (logLevel) {
                    case 'ERROR':
                        configuredLogger.error(`Request completed: ${responseInfo}`);
                        break;
                    case 'WARN':
                        configuredLogger.warn(`Request completed: ${responseInfo}`);
                        break;
                    case 'DEBUG':
                        configuredLogger.debug(`Request completed: ${responseInfo}`);
                        break;
                    default:
                        configuredLogger.info(`Request completed: ${responseInfo}`);
                }
                
                // Call original response end method
                originalResEnd.call(this, chunk, encoding);
            };
            
            // Continue to next middleware
            next();
            
        } catch (error) {
            // Include error handling for logging failures to prevent middleware interruption
            configuredLogger.error(`Request logger error: ${error.message}`);
            
            // Ensure request processing continues even if logging fails
            next();
        }
    };
}

/**
 * Formats HTTP request information into structured log message format including method, 
 * URL, headers, and metadata for consistent logging output.
 * 
 * This function creates standardized request log entries that provide comprehensive
 * information for debugging and monitoring purposes while maintaining readability.
 * 
 * @param {Object} req - Express.js request object containing HTTP request data
 * @param {string} requestId - Unique request identifier for log correlation
 * @returns {string} Formatted request information string for logging
 */
function formatRequestInfo(req, requestId) {
    // Extract HTTP method, URL path, and query parameters from request object
    const method = req.method || 'UNKNOWN';
    const url = req.url || '/';
    const protocol = req.protocol || 'http';
    const host = req.get('Host') || 'localhost';
    
    // Include user agent information if available for client identification
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // Add client IP address and request headers for comprehensive request context
    const clientIp = req.ip || req.connection.remoteAddress || 'Unknown';
    const contentLength = req.get('Content-Length') || '0';
    
    // Format request ID for correlation with response logs
    const correlationId = requestId || 'unknown';
    
    // Include request timestamp for request timing analysis
    const timestamp = new Date().toISOString();
    
    // Create structured log message with consistent formatting for readability
    let formattedInfo = `${method} ${url} - ID: ${correlationId}`;
    
    // Add protocol and host information
    formattedInfo += ` - ${protocol}://${host}`;
    
    // Include client identification details if available
    if (clientIp !== 'Unknown') {
        formattedInfo += ` - IP: ${clientIp}`;
    }
    
    // Add content length for request size tracking
    if (contentLength !== '0') {
        formattedInfo += ` - Content-Length: ${contentLength}`;
    }
    
    // Include user agent for client type identification (abbreviated for readability)
    if (userAgent !== 'Unknown' && isVerboseLogging) {
        const shortUserAgent = userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;
        formattedInfo += ` - User-Agent: ${shortUserAgent}`;
    }
    
    // Return formatted request information string ready for logger output
    return formattedInfo;
}

/**
 * Formats HTTP response information including status code, response time, and completion 
 * details for structured response logging and performance monitoring.
 * 
 * This function creates comprehensive response log entries that track performance
 * metrics and response characteristics for debugging and monitoring purposes.
 * 
 * @param {Object} req - Express.js request object for request correlation
 * @param {Object} res - Express.js response object containing response data
 * @param {number} responseTime - Response processing time in milliseconds
 * @param {string} requestId - Unique request identifier for log correlation
 * @returns {string} Formatted response information string for logging
 */
function formatResponseInfo(req, res, responseTime, requestId) {
    // Extract HTTP status code from response object for status logging
    const statusCode = res.statusCode || INTERNAL_SERVER_ERROR;
    
    // Calculate and format response time in milliseconds for performance monitoring
    const duration = Math.round(responseTime) || 0;
    
    // Include request method and URL for response correlation with request logs
    const method = req.method || 'UNKNOWN';
    const url = req.url || '/';
    
    // Add response content length if available for response size tracking
    const contentLength = res.get('Content-Length') || 'Unknown';
    
    // Format request ID for correlation between request and response log entries
    const correlationId = requestId || 'unknown';
    
    // Get response content type for response format identification
    const contentType = res.get('Content-Type') || 'Unknown';
    
    // Create structured response log message with performance and status information
    let formattedInfo = `${method} ${url} - ID: ${correlationId}`;
    
    // Add response status code with status description
    formattedInfo += ` - Status: ${statusCode}`;
    
    // Include response time for performance monitoring
    formattedInfo += ` - Duration: ${duration}ms`;
    
    // Add content information if available
    if (contentLength !== 'Unknown') {
        formattedInfo += ` - Size: ${contentLength}`;
    }
    
    // Include content type for response format tracking
    if (contentType !== 'Unknown' && isVerboseLogging) {
        const shortContentType = contentType.split(';')[0]; // Remove charset info for brevity
        formattedInfo += ` - Type: ${shortContentType}`;
    }
    
    // Add performance indicators for response time analysis
    if (duration > 1000) {
        formattedInfo += ' [SLOW]';
    } else if (duration > 500) {
        formattedInfo += ' [MODERATE]';
    }
    
    // Return formatted response information string ready for logger output
    return formattedInfo;
}

/**
 * Determines appropriate log level for request logging based on HTTP status code, 
 * response time, and request characteristics for intelligent logging level assignment.
 * 
 * This function implements logging level logic that prioritizes important events
 * while maintaining appropriate verbosity for different types of requests and responses.
 * 
 * @param {number} statusCode - HTTP response status code for error condition evaluation
 * @param {number} responseTime - Response processing time in milliseconds
 * @param {Object} options - Configuration options for log level determination
 * @param {boolean} options.verbose - Enable verbose logging mode
 * @returns {string} Appropriate log level (ERROR, WARN, INFO, DEBUG) for the request
 */
function getLogLevel(statusCode, responseTime, options = {}) {
    // Check HTTP status code for error conditions (4xx, 5xx) requiring ERROR or WARN level
    if (statusCode >= 500) {
        // Server errors require ERROR level logging
        return 'ERROR';
    } else if (statusCode >= 400) {
        // Client errors require WARN level logging
        return 'WARN';
    }
    
    // Evaluate response time against performance thresholds for slow request warnings
    if (responseTime > 5000) {
        // Very slow responses warrant WARNING level
        return 'WARN';
    } else if (responseTime > 1000) {
        // Moderately slow responses use INFO level in verbose mode, DEBUG otherwise
        return options.verbose ? 'INFO' : 'DEBUG';
    }
    
    // Consider request method and endpoint importance for log level determination
    // Successful responses with normal timing use INFO level in verbose mode
    if (options.verbose) {
        return 'INFO';
    }
    
    // Apply environment-specific log level rules (verbose in development, minimal in production)
    if (isDevelopmentEnvironment()) {
        return 'INFO';
    } else if (isTestEnvironment()) {
        return 'DEBUG';
    }
    
    // Use INFO level for successful requests with normal response times
    return 'INFO';
}

/**
 * Determines whether a specific HTTP request should be logged based on filtering criteria, 
 * environment settings, and request characteristics for selective logging.
 * 
 * This function implements request filtering logic to reduce log noise while ensuring
 * important requests are always logged for debugging and monitoring purposes.
 * 
 * @param {Object} req - Express.js request object containing request data
 * @param {Object} options - Configuration options for request filtering
 * @param {Array<string>} options.excludePaths - URL paths to exclude from logging
 * @param {Array<string>} options.excludeMethods - HTTP methods to exclude from logging
 * @param {boolean} options.verbose - Enable verbose logging mode
 * @returns {boolean} True if request should be logged, false if it should be filtered
 */
function shouldLogRequest(req, options = {}) {
    const { excludePaths = [], excludeMethods = [], verbose = false } = options;
    
    // Check if request matches any configured filter patterns for URL or method exclusion
    const requestPath = req.url || '/';
    const requestMethod = req.method || 'GET';
    
    // Apply path exclusion filters
    if (excludePaths.length > 0) {
        const isExcludedPath = excludePaths.some(excludePath => {
            if (typeof excludePath === 'string') {
                return requestPath.startsWith(excludePath);
            } else if (excludePath instanceof RegExp) {
                return excludePath.test(requestPath);
            }
            return false;
        });
        
        if (isExcludedPath) {
            return false;
        }
    }
    
    // Apply method exclusion filters
    if (excludeMethods.length > 0 && excludeMethods.includes(requestMethod)) {
        return false;
    }
    
    // Evaluate environment-specific logging settings (verbose in development, selective in production)
    if (isTestEnvironment() && !verbose) {
        // Reduce logging in test environment unless verbose mode is explicitly enabled
        return false;
    }
    
    // Consider request characteristics like health checks or static assets for filtering
    const commonUtilityPaths = ['/favicon.ico', '/robots.txt', '/sitemap.xml'];
    if (commonUtilityPaths.includes(requestPath) && !verbose) {
        return false;
    }
    
    // Apply rate limiting for high-frequency requests to prevent log spam
    // For this tutorial application, we'll use a simple counter-based approach
    if (requestCount > 1000 && !isDevelopmentEnvironment()) {
        // In production-like environments, sample requests after high volume
        return requestCount % 10 === 0; // Log every 10th request
    }
    
    // Return boolean decision for request logging based on all filtering criteria
    return true;
}

/**
 * Generates unique request identifier for correlating request and response log entries 
 * and tracking individual request lifecycle through the application.
 * 
 * This function creates compact, URL-safe request identifiers that are suitable for
 * log correlation and debugging purposes while ensuring uniqueness under concurrent load.
 * 
 * @returns {string} Unique request identifier for log correlation
 */
function createRequestId() {
    // Generate timestamp-based component for request ID uniqueness
    const timestamp = Date.now().toString(36);
    
    // Include random component to ensure uniqueness under high concurrency
    const randomComponent = Math.random().toString(36).substring(2, 8);
    
    // Add request counter component for additional uniqueness
    const counterComponent = requestCount.toString(36);
    
    // Create compact request ID format suitable for log output and correlation
    const requestId = `req-${timestamp}-${counterComponent}-${randomComponent}`;
    
    // Ensure request ID is URL-safe and easily readable in logs
    return requestId.toLowerCase();
}

// Export main request logging middleware function for Express.js integration
module.exports = {
    // Main Express.js middleware function for HTTP request logging with comprehensive request/response information
    requestLoggerMiddleware,
    
    // Factory function for creating configurable request logger middleware with custom options and filtering
    createRequestLogger,
    
    // Alias for requestLoggerMiddleware providing convenient access to default request logging middleware
    requestLogger: requestLoggerMiddleware
};