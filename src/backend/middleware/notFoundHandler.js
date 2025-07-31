/**
 * Express.js 404 Not Found Handler Middleware for Node.js Tutorial Application
 * 
 * This middleware provides comprehensive 404 error handling for requests to non-existent routes
 * in the Node.js tutorial application. Serves as the final route handler before error middleware
 * in the Express.js middleware stack, catching all unmatched routes and providing consistent
 * 404 error responses with structured logging, response formatting, and request context tracking.
 * 
 * Demonstrates proper Express.js 5.1.0 middleware patterns and educational best practices for
 * handling missing endpoints with debugging information, educational context, and production-ready
 * error handling suitable for learning environments and development workflows.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import logger factory for 404 not found handler middleware logging and request tracking
const { getLogger } = require('../utils/logger.js');

// Import HTTP status code constants for standardized 404 Not Found response status
const { HTTP_STATUS } = require('../utils/constants.js');

// Import standardized error message constants for consistent 404 not found error responses
const { ERROR_MESSAGES } = require('../utils/constants.js');

// Import error response formatting utility for standardized 404 error response structure and metadata
const { formatErrorResponse } = require('./responseHandler.js');

// Import request context extraction utility for 404 error response metadata enrichment with request information
const { extractRequestContext } = require('./responseHandler.js');

// Import environment detection utility for development-specific 404 error handling and debugging information
const { isDevelopmentEnvironment } = require('../utils/environment.js');

// Initialize component-specific logger for 404 not found handler operations and debugging
const logger = getLogger('notFoundHandler');

// Middleware name constant for consistent identification across logging and metadata
const MIDDLEWARE_NAME = 'notFoundHandler';

/**
 * Factory function that creates the main 404 not found handler middleware function for Express.js
 * application integration, providing configurable 404 error handling with logging, response formatting,
 * and educational debugging information suitable for development and learning purposes.
 * 
 * @param {Object} options - Configuration options for the not found handler middleware
 * @param {boolean} options.includeDebugInfo - Whether to include debugging information in responses
 * @param {string} options.logLevel - Log level for 404 error logging (info, warn, error)
 * @param {boolean} options.includeRequestDetails - Whether to include detailed request information
 * @param {Object} options.customErrorMessage - Custom error message override for 404 responses
 * @returns {Function} Express.js middleware function with (req, res, next) signature for 404 not found handling
 */
function createNotFoundHandler(options = {}) {
    // Extract configuration options or use default not found handler settings
    logger.debug('Creating not found handler middleware', { 
        hasOptions: Object.keys(options).length > 0,
        includeDebugInfo: options.includeDebugInfo,
        logLevel: options.logLevel 
    });
    
    // Initialize component logger for 404 error tracking and debugging
    const componentLogger = options.logger || logger;
    
    // Configure 404 error response formatting options and environment-specific behaviors
    const handlerConfig = {
        includeDebugInfo: options.includeDebugInfo !== false,
        logLevel: options.logLevel || 'warn',
        includeRequestDetails: options.includeRequestDetails !== false,
        customErrorMessage: options.customErrorMessage || ERROR_MESSAGES.ROUTE_NOT_FOUND,
        enableResponseHelpers: options.enableResponseHelpers !== false,
        ...options
    };
    
    // Set up 404 error logging configuration with appropriate log levels for educational purposes
    componentLogger.debug('Not found handler configured', {
        middlewareName: MIDDLEWARE_NAME,
        config: handlerConfig
    });
    
    // Configure request context extraction for 404 error response metadata
    const contextOptions = {
        includeHeaders: handlerConfig.includeRequestDetails,
        includeQuery: handlerConfig.includeRequestDetails,
        sanitizeSensitive: !isDevelopmentEnvironment()
    };
    
    // Return configured not found middleware function ready for Express.js application use
    return function notFoundHandler(req, res, next) {
        // Check if response has already been sent to prevent double response errors
        if (res.headersSent) {
            componentLogger.warn('Headers already sent, skipping 404 handler', {
                method: req.method,
                path: req.path,
                middlewareName: MIDDLEWARE_NAME
            });
            return next();
        }
        
        // Extract request context information including method, path, headers, and client details
        const requestContext = extractRequestContext(req);
        
        // Log 404 error with request details using appropriate log level for educational monitoring
        logNotFoundRequest(req, requestContext, componentLogger, handlerConfig);
        
        // Create 404 error object with standardized error message and NOT_FOUND status code
        const notFoundError = create404Error(req, {
            message: handlerConfig.customErrorMessage,
            includeRequestInfo: handlerConfig.includeRequestDetails
        });
        
        // Format 404 error response using formatErrorResponse utility for consistent structure
        const errorResponse = formatErrorResponse(
            notFoundError,
            req,
            HTTP_STATUS.NOT_FOUND,
            {
                includeDebugInfo: handlerConfig.includeDebugInfo && isDevelopmentEnvironment(),
                metadata: {
                    middlewareName: MIDDLEWARE_NAME,
                    handlerType: '404NotFound',
                    requestProcessed: true
                }
            }
        );
        
        // Include development-specific debugging information if in development environment
        if (isDevelopmentEnvironment() && handlerConfig.includeDebugInfo) {
            errorResponse.debug = {
                ...errorResponse.debug,
                availableRoutes: getAvailableRoutes(req),
                routeParameters: req.params,
                queryParameters: req.query,
                middleware: MIDDLEWARE_NAME
            };
        }
        
        // Add response helpers to res object if enabled
        if (handlerConfig.enableResponseHelpers) {
            addNotFoundHelpers(res);
        }
        
        // Set response status to HTTP_STATUS.NOT_FOUND and send formatted error response
        res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
        
        // Log 404 error resolution and response completion for monitoring and educational purposes
        componentLogger.debug('404 response sent successfully', {
            correlationId: requestContext.correlationId,
            responseStatus: HTTP_STATUS.NOT_FOUND,
            middlewareName: MIDDLEWARE_NAME,
            processingTime: extractProcessingTime(req)
        });
    };
}

/**
 * Main Express.js middleware function for handling 404 Not Found errors when requests are made to
 * non-existent routes, providing comprehensive 404 error logging, response formatting, and educational
 * debugging information with demonstration of proper Express.js middleware patterns.
 * 
 * @param {Object} req - Express.js request object containing HTTP request information
 * @param {Object} res - Express.js response object for sending HTTP responses
 * @param {Function} next - Express.js next function for passing control to next middleware
 * @returns {void} Sends formatted 404 error response to client and logs 404 error details for debugging and educational monitoring
 */
function notFoundHandler(req, res, next) {
    // Check if response has already been sent to prevent double response errors
    if (res.headersSent) {
        logger.warn('Response headers already sent, cannot send 404 response', {
            method: req.method,
            path: req.path,
            middlewareName: MIDDLEWARE_NAME
        });
        return next();
    }
    
    // Extract request context information including method, path, headers, and client details
    const requestContext = extractRequestContext(req);
    
    // Log 404 error with request details using appropriate log level for educational monitoring
    logNotFoundRequest(req, requestContext);
    
    // Create 404 error object with standardized error message and NOT_FOUND status code
    const notFoundError = create404Error(req, {
        message: ERROR_MESSAGES.ROUTE_NOT_FOUND,
        includeRequestInfo: true
    });
    
    // Format 404 error response using formatErrorResponse utility for consistent structure
    const errorResponse = formatErrorResponse(
        notFoundError,
        req,
        HTTP_STATUS.NOT_FOUND,
        {
            includeDebugInfo: isDevelopmentEnvironment(),
            metadata: {
                middlewareName: MIDDLEWARE_NAME,
                handlerType: '404NotFound',
                timestamp: new Date().toISOString()
            }
        }
    );
    
    // Include development-specific debugging information if in development environment
    if (isDevelopmentEnvironment()) {
        errorResponse.debug = {
            ...errorResponse.debug,
            availableRoutes: getAvailableRoutes(req),
            routeParameters: req.params,
            queryParameters: req.query,
            requestHeaders: sanitizeHeaders(req.headers),
            middleware: MIDDLEWARE_NAME,
            suggestions: generateRouteSuggestions(req.path)
        };
    }
    
    // Set response status to HTTP_STATUS.NOT_FOUND and send formatted error response
    res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
    
    // Log 404 error resolution and response completion for monitoring and educational purposes
    logger.info('404 Not Found response sent', {
        method: req.method,
        path: req.path,
        correlationId: requestContext.correlationId,
        processingTime: extractProcessingTime(req),
        middlewareName: MIDDLEWARE_NAME
    });
}

/**
 * Logs 404 not found request details with structured logging format including request method, path,
 * headers, client information, and timing data for debugging and educational monitoring purposes.
 * 
 * @param {Object} req - Express.js request object containing request information
 * @param {Object} requestContext - Extracted request context with normalized information
 * @param {Object} customLogger - Optional custom logger instance for component-specific logging
 * @param {Object} config - Logging configuration options
 * @returns {void} Outputs structured log entry for 404 not found request with context and debugging information
 */
function logNotFoundRequest(req, requestContext, customLogger = logger, config = {}) {
    // Extract detailed request information including HTTP method, requested path, and query parameters
    const requestDetails = {
        method: req.method || 'UNKNOWN',
        path: req.path || req.url || 'UNKNOWN',
        originalUrl: req.originalUrl,
        query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
        params: Object.keys(req.params || {}).length > 0 ? req.params : undefined
    };
    
    // Include client information such as user-agent, IP address, and referrer if available
    const clientInfo = {
        userAgent: req.get('User-Agent') || 'Unknown',
        ip: req.ip || req.connection?.remoteAddress || 'Unknown',
        referrer: req.get('Referer') || req.get('Referrer') || 'None',
        host: req.get('Host') || 'Unknown'
    };
    
    // Add request timing information and correlation ID for tracking and debugging
    const timingInfo = {
        timestamp: new Date().toISOString(),
        correlationId: requestContext.correlationId,
        processingTime: extractProcessingTime(req),
        uptime: process.uptime()
    };
    
    // Format 404 log message with request context and educational debugging details
    const logMessage = `Route not found: ${requestDetails.method} ${requestDetails.path}`;
    
    const logMetadata = {
        request: requestDetails,
        client: clientInfo,
        timing: timingInfo,
        middleware: MIDDLEWARE_NAME,
        type: '404NotFound'
    };
    
    // Include additional debug information in development environment
    if (isDevelopmentEnvironment()) {
        logMetadata.debug = {
            headers: sanitizeHeaders(req.headers),
            baseUrl: req.baseUrl,
            protocol: req.protocol,
            secure: req.secure,
            fresh: req.fresh,
            stale: req.stale,
            cookies: req.cookies ? Object.keys(req.cookies) : []
        };
    }
    
    // Use WARN log level for 404 errors as they indicate client-side routing issues
    const logLevel = config.logLevel || 'warn';
    
    // Output structured log entry using component logger for consistent logging format
    customLogger[logLevel](logMessage, logMetadata);
}

/**
 * Creates a standardized 404 error object with consistent properties, message formatting, and metadata
 * for use in not found error handling and response generation with educational context and debugging support.
 * 
 * @param {Object} req - Express.js request object for context extraction
 * @param {Object} options - Options for error creation including message customization and metadata inclusion
 * @param {string} options.message - Custom error message override
 * @param {boolean} options.includeRequestInfo - Whether to include detailed request information
 * @returns {Error} Standardized 404 error object with message, status code, and request context
 */
function create404Error(req, options = {}) {
    // Create new Error object with standardized 404 not found message
    const errorMessage = options.message || ERROR_MESSAGES.ROUTE_NOT_FOUND;
    const notFoundError = new Error(errorMessage);
    
    // Set error status property to HTTP_STATUS.NOT_FOUND for proper status code handling
    notFoundError.status = HTTP_STATUS.NOT_FOUND;
    notFoundError.statusCode = HTTP_STATUS.NOT_FOUND;
    
    // Add error name property as 'NotFoundError' for error classification
    notFoundError.name = 'NotFoundError';
    
    // Include request path and method in error message for debugging clarity
    if (req) {
        const requestInfo = `${req.method || 'UNKNOWN'} ${req.path || req.url || 'UNKNOWN'}`;
        notFoundError.message = `${errorMessage}: ${requestInfo}`;
        
        // Add request context and correlation ID to error object for tracking
        if (options.includeRequestInfo) {
            notFoundError.requestContext = {
                method: req.method,
                path: req.path || req.url,
                originalUrl: req.originalUrl,
                query: req.query,
                params: req.params,
                headers: sanitizeHeaders(req.headers),
                timestamp: new Date().toISOString()
            };
        }
    }
    
    // Set error type property for consistent error categorization
    notFoundError.type = 'NotFoundError';
    notFoundError.code = 'ROUTE_NOT_FOUND';
    
    // Add middleware identification for error tracking
    notFoundError.middleware = MIDDLEWARE_NAME;
    
    // Include educational context for learning purposes
    notFoundError.educational = {
        description: 'This error occurs when a client requests a route that does not exist on the server',
        commonCauses: [
            'Typo in the URL path',
            'Route not registered in Express application',
            'Incorrect HTTP method used',
            'Route handler not properly configured'
        ],
        suggestions: generateRouteSuggestions(req?.path || req?.url)
    };
    
    // Return standardized 404 error object ready for response formatting
    return notFoundError;
}

/**
 * Extends Express.js response object with 404-specific helper methods for consistent not found error
 * response formatting and handling throughout the application with educational context and debugging support.
 * 
 * @param {Object} res - Express.js response object to extend with helper methods
 * @returns {void} Modifies Express.js response object by adding 404 not found helper methods
 */
function addNotFoundHelpers(res) {
    // Add res.notFound() helper method for standard 404 Not Found responses
    res.notFound = function(message, options = {}) {
        const errorMessage = message || ERROR_MESSAGES.ROUTE_NOT_FOUND;
        const notFoundError = new Error(errorMessage);
        notFoundError.status = HTTP_STATUS.NOT_FOUND;
        notFoundError.name = 'NotFoundError';
        
        const errorResponse = formatErrorResponse(
            notFoundError,
            this.req,
            HTTP_STATUS.NOT_FOUND,
            {
                includeDebugInfo: isDevelopmentEnvironment(),
                metadata: {
                    helperMethod: 'res.notFound',
                    middlewareName: MIDDLEWARE_NAME,
                    ...options.metadata
                }
            }
        );
        
        return this.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
    };
    
    // Add res.routeNotFound() helper method with route-specific 404 error messages
    res.routeNotFound = function(routePath, options = {}) {
        const message = `Route not found: ${routePath || 'Unknown route'}`;
        const errorOptions = {
            ...options,
            metadata: {
                routePath,
                helperMethod: 'res.routeNotFound',
                middlewareName: MIDDLEWARE_NAME,
                ...options.metadata
            }
        };
        
        return this.notFound(message, errorOptions);
    };
    
    // Add res.customNotFound() helper method for custom 404 error response formatting
    res.customNotFound = function(customError, options = {}) {
        const errorResponse = formatErrorResponse(
            customError,
            this.req,
            HTTP_STATUS.NOT_FOUND,
            {
                includeDebugInfo: isDevelopmentEnvironment(),
                metadata: {
                    helperMethod: 'res.customNotFound',
                    middlewareName: MIDDLEWARE_NAME,
                    customError: true,
                    ...options.metadata
                }
            }
        );
        
        return this.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
    };
    
    // Configure helper methods to use consistent 404 error formatting and logging
    logger.debug('404 response helper methods added to response object', {
        methods: ['res.notFound', 'res.routeNotFound', 'res.customNotFound'],
        middlewareName: MIDDLEWARE_NAME
    });
}

/**
 * Returns default configuration object for the not found handler middleware with environment-specific
 * settings and educational defaults for the tutorial application with comprehensive options for
 * logging, debugging, and response formatting.
 * 
 * @param {string} environment - Target environment override (development, test, production)
 * @returns {Object} Default not found handler configuration with logging, response formatting, and debugging options
 */
function getDefaultNotFoundConfig(environment = null) {
    // Define default logging configuration for 404 error tracking with appropriate log levels
    const loggingConfig = {
        logLevel: isDevelopmentEnvironment() ? 'debug' : 'warn',
        includeRequestDetails: true,
        includeTimingInfo: true,
        structuredLogging: true
    };
    
    // Set default response formatting options for consistent 404 error responses
    const responseConfig = {
        includeDebugInfo: isDevelopmentEnvironment(),
        includeStackTrace: isDevelopmentEnvironment(),
        sanitizeHeaders: !isDevelopmentEnvironment(),
        customErrorMessage: ERROR_MESSAGES.ROUTE_NOT_FOUND,
        includeEducationalInfo: true
    };
    
    // Configure environment-specific debugging options for development and production
    const debugConfig = {
        includeAvailableRoutes: isDevelopmentEnvironment(),
        includeRouteSuggestions: isDevelopmentEnvironment(),
        includeRequestContext: true,
        includePerformanceMetrics: isDevelopmentEnvironment(),
        verboseErrorMessages: isDevelopmentEnvironment()
    };
    
    // Set default request context extraction options for 404 error metadata
    const contextConfig = {
        includeHeaders: true,
        includeQuery: true,
        includeParams: true,
        includeCookies: isDevelopmentEnvironment(),
        sanitizeSensitive: !isDevelopmentEnvironment()
    };
    
    // Apply educational-focused default settings for tutorial application requirements
    const educationalConfig = {
        provideSuggestions: true,
        explainErrorCause: true,
        includeCommonFixes: true,
        demonstrateMiddlewarePattern: true,
        showExpressJSBestPractices: true
    };
    
    // Configure response helper settings
    const helperConfig = {
        enableResponseHelpers: true,
        addCustomMethods: true,
        includeUtilityMethods: isDevelopmentEnvironment()
    };
    
    // Return comprehensive default configuration object for not found handler middleware
    const defaultConfig = {
        middlewareName: MIDDLEWARE_NAME,
        version: '1.0.0',
        logging: loggingConfig,
        response: responseConfig,
        debug: debugConfig,
        context: contextConfig,
        educational: educationalConfig,
        helpers: helperConfig,
        
        // Top-level convenience properties
        includeDebugInfo: responseConfig.includeDebugInfo,
        logLevel: loggingConfig.logLevel,
        includeRequestDetails: loggingConfig.includeRequestDetails,
        customErrorMessage: responseConfig.customErrorMessage,
        enableResponseHelpers: helperConfig.enableResponseHelpers,
        
        // Environment detection
        environment: {
            isDevelopment: isDevelopmentEnvironment(),
            current: process.env.NODE_ENV || 'development'
        }
    };
    
    // Log default configuration creation for debugging
    logger.debug('Default not found handler configuration created', {
        middlewareName: MIDDLEWARE_NAME,
        environment: defaultConfig.environment.current,
        debugMode: defaultConfig.includeDebugInfo,
        logLevel: defaultConfig.logLevel
    });
    
    return defaultConfig;
}

// Helper utility functions for internal use

/**
 * Extracts processing time from request object if available
 * @param {Object} req - Express.js request object
 * @returns {number|null} Processing time in milliseconds or null if not available
 */
function extractProcessingTime(req) {
    const startTime = req._startTime || req.startTime;
    return startTime ? Date.now() - startTime : null;
}

/**
 * Sanitizes request headers by removing or redacting sensitive information
 * @param {Object} headers - Request headers object
 * @returns {Object} Sanitized headers object
 */
function sanitizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') return {};
    
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = {};
    
    Object.keys(headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveHeaders.includes(lowerKey)) {
            sanitized[key] = '[REDACTED]';
        } else {
            sanitized[key] = headers[key];
        }
    });
    
    return sanitized;
}

/**
 * Attempts to extract available routes from Express application for debugging
 * @param {Object} req - Express.js request object
 * @returns {Array} Array of available route information
 */
function getAvailableRoutes(req) {
    try {
        const routes = [];
        
        // Try to extract routes from Express app
        if (req.app && req.app._router && req.app._router.stack) {
            req.app._router.stack.forEach(layer => {
                if (layer.route) {
                    const methods = Object.keys(layer.route.methods);
                    routes.push({
                        path: layer.route.path,
                        methods: methods
                    });
                }
            });
        }
        
        // Add common tutorial routes if no routes found
        if (routes.length === 0) {
            routes.push(
                { path: '/hello', methods: ['get'] },
                { path: '/health', methods: ['get'] }
            );
        }
        
        return routes;
    } catch (error) {
        logger.debug('Could not extract available routes', { error: error.message });
        return [
            { path: '/hello', methods: ['get'] },
            { path: '/health', methods: ['get'] }
        ];
    }
}

/**
 * Generates helpful route suggestions based on the requested path
 * @param {string} requestedPath - The path that was not found
 * @returns {Array} Array of suggested routes
 */
function generateRouteSuggestions(requestedPath) {
    if (!requestedPath || typeof requestedPath !== 'string') {
        return ['Try /hello for the main tutorial endpoint'];
    }
    
    const suggestions = [];
    const path = requestedPath.toLowerCase();
    
    // Suggest common variations
    if (path.includes('hello')) {
        suggestions.push('Did you mean /hello?');
    }
    
    if (path.includes('health')) {
        suggestions.push('Did you mean /health?');
    }
    
    // Suggest removing trailing slashes
    if (path.endsWith('/') && path.length > 1) {
        suggestions.push(`Try ${requestedPath.slice(0, -1)} (without trailing slash)`);
    }
    
    // Suggest adding leading slash
    if (!path.startsWith('/')) {
        suggestions.push(`Try /${requestedPath} (with leading slash)`);
    }
    
    // Default suggestions
    if (suggestions.length === 0) {
        suggestions.push(
            'Try /hello for the main tutorial endpoint',
            'Check the URL spelling and case sensitivity',
            'Verify the HTTP method (GET, POST, etc.)'
        );
    }
    
    return suggestions;
}

// Export middleware functions and utilities for application use
module.exports = {
    // Main Express.js middleware function for handling 404 Not Found errors for non-existent routes
    notFoundHandler,
    
    // Factory function for creating configured not found handler middleware with custom options
    createNotFoundHandler,
    
    // Logging utility function for structured 404 error request logging with context information  
    logNotFoundRequest,
    
    // Utility function for creating standardized 404 error objects with consistent properties and metadata
    create404Error,
    
    // Configuration utility function returning default settings for not found handler middleware
    getDefaultNotFoundConfig
};