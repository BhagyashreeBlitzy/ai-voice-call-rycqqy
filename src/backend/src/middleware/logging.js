/**
 * Express.js Logging Middleware for Node.js Tutorial Application
 * 
 * This middleware provides comprehensive HTTP request/response logging with performance tracking,
 * request correlation, and educational value while demonstrating production-ready logging middleware
 * patterns. It integrates seamlessly with Express.js 5.1.0 automatic promise error handling and
 * structured logging utilities to deliver robust observability for the Node.js tutorial application.
 * 
 * Features:
 * - Request correlation IDs for distributed tracing and debugging
 * - High-precision performance timing using Node.js Performance API
 * - Comprehensive HTTP request/response logging with metadata
 * - Environment-aware logging behavior with configuration management
 * - Memory-efficient request tracking with automatic cleanup
 * - Integration with Express.js 5.1.0 async/await error handling patterns
 * - Educational design prioritizing clarity while demonstrating production patterns
 * 
 * Compatible with:
 * - Express.js 5.1.0 with automatic promise error handling and enhanced async support
 * - Node.js 22.11.0 LTS with Active LTS support and security enhancements
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js middleware patterns, HTTP logging, and request correlation concepts
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Node.js crypto module for generating secure correlation IDs and request tracking identifiers
const crypto = require('crypto'); // Node.js Built-in

// Node.js Performance API for high-resolution request timing measurement
const { performance } = require('perf_hooks'); // Node.js Built-in

// Node.js process module for process information and resource usage tracking
const process = require('process'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import structured logging utility for HTTP request/response logging with performance metrics and correlation tracking
const { 
    logger, 
    createRequestLogger, 
    startTimer, 
    stopTimer, 
    cleanupRequestLogger 
} = require('../utils/logger.js');

// Import configuration factory to access logging middleware settings and environment-specific behavior
const { getConfig } = require('../utils/config.js');

// Import HTTP method constants for request method validation and logging
const { HTTP_METHODS } = require('../utils/constants.js');

// Import logging level constants for middleware log level management
const { LOGGING_LEVELS } = require('../utils/constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached logging middleware configuration from environment settings
 * Prevents repeated configuration loading and improves performance
 * @type {Object|null}
 */
let LOGGING_CONFIG = null;

/**
 * Request statistics tracking for monitoring and operational insights
 * Tracks total requests, requests by method, and requests by status code
 * @type {Object}
 */
const REQUEST_COUNTERS = {
    total: 0,
    by_method: {},
    by_status: {}
};

/**
 * Flag indicating if logging middleware is properly initialized
 * Used to prevent duplicate initialization and ensure proper setup
 * @type {boolean}
 */
let MIDDLEWARE_INITIALIZED = false;

/**
 * Map tracking currently active requests with correlation IDs
 * Enables request lifecycle monitoring and memory leak prevention
 * @type {Map<string, Object>}
 */
const ACTIVE_REQUESTS = new Map();

// =============================================================================
// MIDDLEWARE INITIALIZATION
// =============================================================================

/**
 * Initializes logging middleware by loading configuration, setting up request tracking, and configuring performance monitoring.
 * This function loads application configuration using getConfig(), extracts logging middleware configuration,
 * caches configuration for performance optimization, initializes request tracking structures, and sets up
 * performance monitoring based on environment settings.
 * 
 * The initialization process includes:
 * - Configuration loading with error handling and fallback to default settings
 * - Request counter initialization for method and status code tracking
 * - Active request Map setup for correlation ID tracking and lifecycle management
 * - Performance monitoring configuration based on environment requirements
 * - Logging middleware configuration caching for optimal runtime performance
 * 
 * @returns {void} No return value - initializes global logging middleware state
 */
function initializeLoggingMiddleware() {
    try {
        // Load application configuration using getConfig() and extract logging middleware settings
        const appConfig = getConfig();
        LOGGING_CONFIG = appConfig.logging || {};
        
        // Initialize REQUEST_COUNTERS with method and status tracking objects
        REQUEST_COUNTERS.total = 0;
        REQUEST_COUNTERS.by_method = {};
        REQUEST_COUNTERS.by_status = {};
        
        // Initialize method counters for all HTTP methods to prevent undefined access
        Object.values(HTTP_METHODS).forEach(method => {
            REQUEST_COUNTERS.by_method[method] = 0;
        });
        
        // Set up ACTIVE_REQUESTS Map for correlation ID tracking and lifecycle management
        ACTIVE_REQUESTS.clear();
        
        // Configure performance monitoring based on environment settings
        const performanceConfig = {
            enabled: LOGGING_CONFIG.performance_logging !== false,
            highResolution: LOGGING_CONFIG.high_resolution_timing !== false,
            memoryTracking: LOGGING_CONFIG.memory_tracking === true
        };
        
        // Log middleware initialization with configuration summary for operational visibility
        logger.info('Logging middleware initialized successfully', {
            configuration: {
                level: LOGGING_CONFIG.level || LOGGING_LEVELS.INFO,
                performanceLogging: performanceConfig.enabled,
                requestLogging: LOGGING_CONFIG.request_logging !== false,
                correlationTracking: LOGGING_CONFIG.correlation_tracking !== false
            },
            counters: {
                totalRequests: REQUEST_COUNTERS.total,
                activeRequests: ACTIVE_REQUESTS.size,
                trackedMethods: Object.keys(REQUEST_COUNTERS.by_method).length
            },
            timestamp: new Date().toISOString()
        });
        
        // Set MIDDLEWARE_INITIALIZED flag to true for initialization status tracking
        MIDDLEWARE_INITIALIZED = true;
        
    } catch (error) {
        // Handle initialization errors gracefully - log error and continue with basic functionality
        logger.error('Failed to initialize logging middleware', {
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Set minimal fallback configuration to ensure continued operation
        LOGGING_CONFIG = {
            level: LOGGING_LEVELS.INFO,
            request_logging: true,
            performance_logging: true,
            correlation_tracking: true
        };
        
        // Ensure request tracking structures are initialized even in error case
        REQUEST_COUNTERS.total = 0;
        REQUEST_COUNTERS.by_method = {};
        REQUEST_COUNTERS.by_status = {};
        ACTIVE_REQUESTS.clear();
        
        // Mark as initialized with fallback configuration
        MIDDLEWARE_INITIALIZED = true;
    }
}

// =============================================================================
// CORRELATION ID GENERATION
// =============================================================================

/**
 * Generates a unique correlation ID for request tracking using secure random generation.
 * This function creates a unique correlation ID using Node.js crypto.randomBytes() for secure
 * random generation with timestamp prefix for temporal ordering and uniqueness verification.
 * The correlation ID format enables request tracing across middleware and log correlation.
 * 
 * Correlation ID generation features:
 * - Secure random byte generation using crypto.randomBytes() for unpredictability
 * - Timestamp prefix for temporal ordering and correlation timeline analysis
 * - Hexadecimal string format for URL-safe and log-friendly representation
 * - Appropriate length for uniqueness while maintaining readability
 * - High entropy to prevent collision in high-throughput environments
 * 
 * @returns {string} Unique correlation ID string for request tracking and log correlation
 */
function generateCorrelationId() {
    try {
        // Generate random bytes using crypto.randomBytes() for secure randomness
        const randomBytes = crypto.randomBytes(8);
        
        // Convert random bytes to hexadecimal string for URL-safe representation
        const randomHex = randomBytes.toString('hex');
        
        // Add timestamp prefix for temporal ordering and correlation timeline analysis
        const timestamp = Date.now().toString(36); // Base36 for compact representation
        
        // Combine timestamp and random components for unique correlation ID
        const correlationId = `${timestamp}-${randomHex}`;
        
        // Return formatted correlation ID string ready for request tracking
        return correlationId;
        
    } catch (error) {
        // Handle correlation ID generation errors gracefully - use fallback method
        logger.warn('Failed to generate secure correlation ID, using fallback method', {
            error: error.message,
            errorType: error.constructor.name,
            timestamp: new Date().toISOString()
        });
        
        // Fallback to timestamp-based ID with Math.random() for continued operation
        const fallbackTimestamp = Date.now().toString(36);
        const fallbackRandom = Math.random().toString(36).substring(2, 10);
        
        return `${fallbackTimestamp}-${fallbackRandom}`;
    }
}

// =============================================================================
// REQUEST METADATA EXTRACTION
// =============================================================================

/**
 * Extracts relevant metadata from HTTP request object for logging and monitoring purposes.
 * This function captures comprehensive request context including HTTP method, path, headers,
 * client IP address, and other relevant request information for structured logging and
 * monitoring analysis. It filters sensitive headers in production environments for security.
 * 
 * Request metadata extraction features:
 * - HTTP method, path, and query parameter extraction with validation
 * - Client IP address capture with proxy header support for load balancer environments
 * - Request header extraction with sensitive data filtering for security compliance
 * - Request timestamp and content length inclusion for performance analysis
 * - User-Agent and Accept header capture for client identification and debugging
 * - Request size and timing information for performance monitoring
 * 
 * @param {Object} req - Express.js request object with HTTP request information
 * @returns {Object} Request metadata object with method, path, headers, IP, and other relevant information
 */
function extractRequestMetadata(req) {
    try {
        // Extract HTTP method with validation against HTTP_METHODS constants
        const method = req.method && Object.values(HTTP_METHODS).includes(req.method) 
            ? req.method 
            : 'UNKNOWN';
        
        // Extract request path and query parameters with proper encoding
        const path = req.path || req.url || '/';
        const query = req.query || {};
        const queryString = req.url ? req.url.split('?')[1] : '';
        
        // Capture client IP address with proxy header support for load balancer environments
        const clientIp = req.ip || 
                         req.connection?.remoteAddress || 
                         req.socket?.remoteAddress || 
                         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         'unknown';
        
        // Extract relevant headers with sensitive data filtering for security compliance
        const headers = { ...req.headers };
        
        // Filter sensitive headers in production environment for security
        if (process.env.NODE_ENV === 'production') {
            // Remove authentication and sensitive headers from logs
            delete headers.authorization;
            delete headers.cookie;
            delete headers['x-api-key'];
            delete headers['x-auth-token'];
            delete headers['proxy-authorization'];
        }
        
        // Extract User-Agent and Accept headers for client identification
        const userAgent = req.headers['user-agent'] || 'unknown';
        const acceptHeader = req.headers.accept || 'unknown';
        
        // Include request timestamp and content length for performance analysis
        const requestTimestamp = new Date().toISOString();
        const contentLength = req.headers['content-length'] || 0;
        
        // Create structured metadata object for comprehensive request tracking
        const requestMetadata = {
            method: method,
            path: path,
            query: query,
            queryString: queryString,
            headers: headers,
            client: {
                ip: clientIp,
                userAgent: userAgent,
                acceptHeader: acceptHeader
            },
            timing: {
                requestTimestamp: requestTimestamp,
                startTime: Date.now()
            },
            content: {
                length: parseInt(contentLength) || 0,
                type: req.headers['content-type'] || 'unknown'
            },
            connection: {
                httpVersion: req.httpVersion || '1.1',
                secure: req.secure || false,
                remoteAddress: req.connection?.remoteAddress || 'unknown'
            },
            metadata: {
                extractedAt: requestTimestamp,
                environment: process.env.NODE_ENV || 'development'
            }
        };
        
        // Return comprehensive request metadata object ready for logging
        return requestMetadata;
        
    } catch (error) {
        // Handle metadata extraction errors gracefully - return minimal metadata
        logger.warn('Failed to extract complete request metadata', {
            error: error.message,
            errorType: error.constructor.name,
            requestUrl: req.url || 'unknown',
            requestMethod: req.method || 'unknown',
            timestamp: new Date().toISOString()
        });
        
        // Return minimal fallback metadata for continued operation
        return {
            method: req.method || 'UNKNOWN',
            path: req.path || req.url || '/',
            client: {
                ip: req.ip || 'unknown',
                userAgent: req.headers?.['user-agent'] || 'unknown'
            },
            timing: {
                requestTimestamp: new Date().toISOString(),
                startTime: Date.now()
            },
            metadata: {
                extractedAt: new Date().toISOString(),
                extractionError: true,
                environment: process.env.NODE_ENV || 'development'
            }
        };
    }
}

// =============================================================================
// REQUEST STATISTICS TRACKING
// =============================================================================

/**
 * Updates request statistics counters for monitoring and operational metrics.
 * This function increments total request counter, updates method-specific counters,
 * and tracks status code distributions for operational monitoring and performance
 * analysis. It provides essential metrics for understanding application usage patterns.
 * 
 * Request statistics tracking includes:
 * - Total request counter increment for overall traffic measurement
 * - HTTP method-specific counter updates for method distribution analysis
 * - Status code counter updates for error rate and success rate monitoring
 * - Request processing trend tracking for performance optimization
 * - Counter validation and error handling for data integrity
 * 
 * @param {string} method - HTTP method string for method-specific counter updates
 * @param {number} statusCode - HTTP status code for status distribution tracking
 * @returns {void} No return value - updates global request counters
 */
function updateRequestCounters(method, statusCode) {
    try {
        // Increment total request counter for overall traffic measurement
        REQUEST_COUNTERS.total += 1;
        
        // Validate and normalize method parameter for consistent tracking
        const normalizedMethod = method && typeof method === 'string' 
            ? method.toUpperCase() 
            : 'UNKNOWN';
        
        // Update method-specific counter with initialization if needed
        if (!REQUEST_COUNTERS.by_method[normalizedMethod]) {
            REQUEST_COUNTERS.by_method[normalizedMethod] = 0;
        }
        REQUEST_COUNTERS.by_method[normalizedMethod] += 1;
        
        // Validate and normalize status code parameter for consistent tracking
        const normalizedStatusCode = typeof statusCode === 'number' && statusCode > 0 
            ? statusCode 
            : 'unknown';
        
        // Update status code counter with initialization if needed
        if (!REQUEST_COUNTERS.by_status[normalizedStatusCode]) {
            REQUEST_COUNTERS.by_status[normalizedStatusCode] = 0;
        }
        REQUEST_COUNTERS.by_status[normalizedStatusCode] += 1;
        
        // Log counter updates if debug logging enabled for troubleshooting
        if (LOGGING_CONFIG?.debug_counters === true) {
            logger.debug('Request counters updated', {
                method: normalizedMethod,
                statusCode: normalizedStatusCode,
                counters: {
                    total: REQUEST_COUNTERS.total,
                    methodCount: REQUEST_COUNTERS.by_method[normalizedMethod],
                    statusCount: REQUEST_COUNTERS.by_status[normalizedStatusCode]
                },
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        // Handle counter update errors gracefully - log error without affecting request processing
        logger.error('Failed to update request counters', {
            error: error.message,
            errorType: error.constructor.name,
            method: method,
            statusCode: statusCode,
            timestamp: new Date().toISOString()
        });
    }
}

// =============================================================================
// REQUEST LOGGING FUNCTIONS
// =============================================================================

/**
 * Logs the start of HTTP request processing with request details and correlation tracking.
 * This function creates a structured log entry for request initiation including correlation ID,
 * request metadata, client information, and performance measurement initialization. It establishes
 * request-scoped logger context for consistent correlation across request lifecycle.
 * 
 * Request start logging features:
 * - Correlation ID inclusion for request tracing and distributed system debugging
 * - Request metadata logging with method, path, and client information
 * - Request-scoped logger creation for consistent correlation context
 * - Performance timer initialization for request duration measurement
 * - Request header logging if debug mode enabled for detailed troubleshooting
 * - Request counter updates for operational statistics and monitoring
 * 
 * @param {Object} req - Express.js request object with HTTP request information
 * @param {string} correlationId - Unique correlation ID for request tracking across log entries
 * @param {Object} requestMetadata - Request metadata object with method, path, client info, and timing
 * @returns {void} No return value - logs request start and creates request-scoped logger
 */
function logRequestStart(req, correlationId, requestMetadata) {
    try {
        // Create structured log entry for request initiation with correlation context
        const requestStartMessage = `HTTP request started: ${requestMetadata.method} ${requestMetadata.path}`;
        
        // Prepare comprehensive request start metadata for structured logging
        const logMetadata = {
            correlationId: correlationId,
            http: {
                method: requestMetadata.method,
                path: requestMetadata.path,
                queryString: requestMetadata.queryString,
                httpVersion: requestMetadata.connection.httpVersion,
                secure: requestMetadata.connection.secure
            },
            client: {
                ip: requestMetadata.client.ip,
                userAgent: requestMetadata.client.userAgent,
                acceptHeader: requestMetadata.client.acceptHeader
            },
            timing: {
                requestStart: requestMetadata.timing.requestTimestamp,
                startTime: requestMetadata.timing.startTime
            },
            content: {
                type: requestMetadata.content.type,
                length: requestMetadata.content.length
            },
            tracking: {
                activeRequests: ACTIVE_REQUESTS.size + 1,
                totalProcessed: REQUEST_COUNTERS.total + 1
            }
        };
        
        // Include request headers if debug logging enabled for detailed troubleshooting
        if (LOGGING_CONFIG?.debug_headers === true && requestMetadata.headers) {
            logMetadata.headers = requestMetadata.headers;
        }
        
        // Log request start using structured logging with INFO level for operational visibility
        logger.info(requestStartMessage, logMetadata);
        
        // Create request-scoped logger with correlation context for downstream middleware
        const requestLogger = createRequestLogger(correlationId, {
            method: requestMetadata.method,
            path: requestMetadata.path,
            clientIp: requestMetadata.client.ip,
            userAgent: requestMetadata.client.userAgent
        });
        
        // Store request-scoped logger in request object for downstream access
        req.logger = requestLogger;
        req.correlationId = correlationId;
        
        // Store request start time for performance measurement completion
        req.startTime = requestMetadata.timing.startTime;
        
    } catch (error) {
        // Handle request start logging errors gracefully - continue with basic logging
        logger.error('Failed to log request start', {
            error: error.message,
            errorType: error.constructor.name,
            correlationId: correlationId,
            requestPath: req.path || req.url || 'unknown',
            requestMethod: req.method || 'unknown',
            timestamp: new Date().toISOString()
        });
        
        // Ensure minimal request context is available even with logging errors
        req.correlationId = correlationId;
        req.startTime = Date.now();
    }
}

/**
 * Logs the completion of HTTP request processing with response details and performance metrics.
 * This function creates a comprehensive log entry for request completion including response status,
 * performance timing, client information, and operational metrics. It uses structured HTTP logging
 * format optimized for monitoring and analytics systems.
 * 
 * Request completion logging features:
 * - Response status code and content-type logging for response analysis
 * - Performance metrics with high-precision duration calculation
 * - Client information preservation for request correlation and debugging
 * - Structured HTTP logging format for monitoring system integration
 * - Request lifecycle completion tracking with cleanup coordination
 * - Response size and timing information for performance optimization
 * 
 * @param {Object} req - Express.js request object with HTTP request information
 * @param {Object} res - Express.js response object with HTTP response information
 * @param {string} correlationId - Unique correlation ID for request tracking consistency
 * @param {number} duration - Request processing duration in milliseconds with high precision
 * @returns {void} No return value - logs request completion with performance metrics
 */
function logRequestEnd(req, res, correlationId, duration) {
    try {
        // Extract response status code and content information for logging
        const statusCode = res.statusCode || 0;
        const contentType = res.getHeader('content-type') || 'unknown';
        const contentLength = res.getHeader('content-length') || 'unknown';
        
        // Create structured response metadata for comprehensive logging
        const responseMetadata = {
            status: statusCode,
            contentType: contentType,
            contentLength: contentLength,
            headers: {}
        };
        
        // Include response headers if debug logging enabled for detailed troubleshooting
        if (LOGGING_CONFIG?.debug_headers === true) {
            // Get response headers safely to avoid circular reference issues
            const responseHeaders = res.getHeaders ? res.getHeaders() : {};
            responseMetadata.headers = responseHeaders;
        }
        
        // Create enhanced request data with response information for HTTP logging
        const httpRequestData = {
            method: req.method,
            path: req.path || req.url,
            statusCode: statusCode,
            httpVersion: req.httpVersion,
            clientIp: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers?.['user-agent'],
            contentLength: contentLength,
            headers: req.headers
        };
        
        // Log request completion using specialized HTTP logging with performance metrics
        logger.httpRequest(httpRequestData, duration, correlationId);
        
        // Update request completion statistics for operational monitoring
        updateRequestCounters(req.method, statusCode);
        
        // Clean up request-scoped logger to prevent memory leaks
        cleanupRequestLogger(correlationId);
        
    } catch (error) {
        // Handle request end logging errors gracefully - continue with basic logging
        logger.error('Failed to log request end', {
            error: error.message,
            errorType: error.constructor.name,
            correlationId: correlationId,
            requestPath: req.path || req.url || 'unknown',
            requestMethod: req.method || 'unknown',
            statusCode: res?.statusCode || 'unknown',
            duration: duration,
            timestamp: new Date().toISOString()
        });
        
        // Ensure cleanup occurs even with logging errors to prevent memory leaks
        try {
            cleanupRequestLogger(correlationId);
            updateRequestCounters(req.method, res?.statusCode);
        } catch (cleanupError) {
            logger.warn('Failed to cleanup after request end logging error', {
                cleanupError: cleanupError.message,
                originalError: error.message,
                correlationId: correlationId
            });
        }
    }
}

// =============================================================================
// MIDDLEWARE IMPLEMENTATION
// =============================================================================

/**
 * Express middleware function that provides comprehensive HTTP request/response logging with performance tracking and correlation IDs.
 * This is the primary middleware function that integrates with Express.js request/response cycle to provide
 * comprehensive logging, performance measurement, and request correlation. It sets up request context,
 * initializes performance timing, and coordinates request lifecycle logging with automatic cleanup.
 * 
 * Middleware functionality includes:
 * - Initialization status verification to ensure proper middleware setup
 * - Unique correlation ID generation for request tracing and debugging
 * - Request metadata extraction and structured logging initialization
 * - Performance timer setup using high-resolution Node.js Performance API
 * - Request-scoped logger creation for consistent correlation context
 * - Response event handler setup for request completion logging and cleanup
 * - Integration with Express.js 5.1.0 async/await and automatic error handling
 * 
 * @param {Object} req - Express.js request object with HTTP request information
 * @param {Object} res - Express.js response object with HTTP response capabilities
 * @param {Function} next - Express.js next function for middleware chain continuation
 * @returns {void} Calls next() middleware function after setting up logging context
 */
function requestLoggingMiddleware(req, res, next) {
    try {
        // Check if logging middleware is properly initialized before proceeding
        if (!MIDDLEWARE_INITIALIZED) {
            logger.warn('Logging middleware not initialized, initializing now', {
                requestPath: req.path || req.url,
                requestMethod: req.method,
                timestamp: new Date().toISOString()
            });
            initializeLoggingMiddleware();
        }
        
        // Generate unique correlation ID for request tracking and log correlation
        const correlationId = generateCorrelationId();
        
        // Extract comprehensive request metadata for structured logging and monitoring
        const requestMetadata = extractRequestMetadata(req);
        
        // Start performance timer for request duration measurement
        startTimer(correlationId);
        
        // Log request start with correlation ID and structured metadata
        logRequestStart(req, correlationId, requestMetadata);
        
        // Store active request in ACTIVE_REQUESTS Map for lifecycle tracking
        ACTIVE_REQUESTS.set(correlationId, {
            method: req.method,
            path: req.path || req.url,
            startTime: Date.now(),
            clientIp: requestMetadata.client.ip,
            userAgent: requestMetadata.client.userAgent
        });
        
        // Set up response logging using res.on('finish') event for completion tracking
        res.on('finish', () => {
            responseLoggingHandler(req, res, correlationId);
        });
        
        // Set up response error handling for cases where response doesn't complete normally
        res.on('close', () => {
            // Handle premature connection close
            if (!res.headersSent) {
                logger.warn('Request connection closed before response sent', {
                    correlationId: correlationId,
                    method: req.method,
                    path: req.path || req.url,
                    timestamp: new Date().toISOString()
                });
                
                // Clean up resources for prematurely closed requests
                responseLoggingHandler(req, res, correlationId);
            }
        });
        
        // Continue to next middleware in Express.js chain
        next();
        
    } catch (error) {
        // Handle middleware errors gracefully without affecting request processing
        handleLoggingError(error, 'requestLoggingMiddleware', req.correlationId || 'unknown');
        
        // Continue middleware chain even if logging setup fails
        next();
    }
}

/**
 * Response event handler that logs request completion when response is finished being sent to client.
 * This function handles the response completion phase of request lifecycle logging by calculating
 * duration, extracting response information, logging completion metrics, and performing cleanup
 * operations to prevent memory leaks in long-running applications.
 * 
 * Response completion handling includes:
 * - Performance timer completion and duration calculation using high-precision timing
 * - Response status code and header extraction for completion logging
 * - Request completion logging with performance metrics and response information
 * - Request counter updates for operational statistics and monitoring
 * - Active request cleanup from ACTIVE_REQUESTS Map for memory management
 * - Request-scoped logger cleanup to prevent memory leaks
 * - Error handling for logging failures without affecting response transmission
 * 
 * @param {Object} req - Express.js request object with HTTP request information and logging context
 * @param {Object} res - Express.js response object with HTTP response information and headers
 * @param {string} correlationId - Unique correlation ID for request tracking and log correlation
 * @returns {void} No return value - performs request completion logging and resource cleanup
 */
function responseLoggingHandler(req, res, correlationId) {
    try {
        // Calculate request processing duration using high-precision performance timer
        const duration = stopTimer(correlationId);
        
        // Log request completion with performance metrics and response information
        logRequestEnd(req, res, correlationId, duration);
        
        // Remove request from ACTIVE_REQUESTS Map to prevent memory leaks
        ACTIVE_REQUESTS.delete(correlationId);
        
    } catch (error) {
        // Handle response logging errors gracefully without affecting response transmission
        handleLoggingError(error, 'responseLoggingHandler', correlationId);
        
        // Ensure cleanup occurs even with logging errors to prevent memory leaks
        try {
            ACTIVE_REQUESTS.delete(correlationId);
            stopTimer(correlationId); // Clean up timer even if logging failed
            cleanupRequestLogger(correlationId); // Clean up request logger
        } catch (cleanupError) {
            logger.error('Failed to cleanup resources after response logging error', {
                cleanupError: cleanupError.message,
                originalError: error.message,
                correlationId: correlationId,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// =============================================================================
// MIDDLEWARE FACTORY AND CUSTOMIZATION
// =============================================================================

/**
 * Factory function that creates customized logging middleware with configurable options and behavior.
 * This function provides a factory pattern for creating logging middleware instances with custom
 * configuration options, enabling different logging behaviors for different routes or environments
 * while maintaining consistent logging patterns and performance characteristics.
 * 
 * Factory function capabilities include:
 * - Logging middleware initialization with custom configuration options
 * - Configuration option merging with default middleware settings and validation
 * - Environment-specific logging behavior customization for development and production
 * - Custom middleware function creation with options context and behavior modification
 * - Configuration validation and error handling for invalid options
 * - Middleware creation logging for operational tracking and debugging
 * 
 * @param {Object} options - Configuration options object for customizing middleware behavior
 * @returns {Function} Express middleware function configured with provided options
 */
function createLoggingMiddleware(options = {}) {
    try {
        // Initialize logging middleware if not already initialized
        if (!MIDDLEWARE_INITIALIZED) {
            initializeLoggingMiddleware();
        }
        
        // Merge provided options with default middleware configuration
        const middlewareConfig = {
            // Default configuration options with fallbacks
            enabled: options.enabled !== false,
            performanceLogging: options.performanceLogging !== false,
            correlationTracking: options.correlationTracking !== false,
            debugHeaders: options.debugHeaders === true,
            debugCounters: options.debugCounters === true,
            
            // Advanced configuration options
            requestFiltering: options.requestFiltering || null,
            responseFiltering: options.responseFiltering || null,
            logLevel: options.logLevel || LOGGING_LEVELS.INFO,
            
            // Performance and resource options
            memoryTracking: options.memoryTracking === true,
            highResolutionTiming: options.highResolutionTiming !== false,
            maxActiveRequests: options.maxActiveRequests || 1000
        };
        
        // Validate logging options and configuration settings
        if (typeof middlewareConfig.enabled !== 'boolean') {
            throw new Error('Invalid enabled option - must be boolean');
        }
        
        if (middlewareConfig.logLevel && !Object.values(LOGGING_LEVELS).includes(middlewareConfig.logLevel)) {
            throw new Error(`Invalid logLevel option - must be one of: ${Object.values(LOGGING_LEVELS).join(', ')}`);
        }
        
        // Create customized middleware function with options context
        const customMiddleware = function(req, res, next) {
            // Check if middleware is enabled before processing
            if (!middlewareConfig.enabled) {
                return next();
            }
            
            // Apply request filtering if configured
            if (middlewareConfig.requestFiltering && typeof middlewareConfig.requestFiltering === 'function') {
                if (!middlewareConfig.requestFiltering(req)) {
                    return next();
                }
            }
            
            // Check active request limits for resource management
            if (ACTIVE_REQUESTS.size >= middlewareConfig.maxActiveRequests) {
                logger.warn('Maximum active requests exceeded, skipping detailed logging', {
                    activeRequests: ACTIVE_REQUESTS.size,
                    maxActiveRequests: middlewareConfig.maxActiveRequests,
                    requestMethod: req.method,
                    requestPath: req.path || req.url
                });
                return next();
            }
            
            // Store middleware configuration in request object for handler access
            req.loggingConfig = middlewareConfig;
            
            // Call standard request logging middleware with custom configuration
            requestLoggingMiddleware(req, res, next);
        };
        
        // Log middleware creation with configuration summary
        logger.info('Custom logging middleware created', {
            configuration: middlewareConfig,
            timestamp: new Date().toISOString()
        });
        
        // Return configured middleware function ready for Express use
        return customMiddleware;
        
    } catch (error) {
        // Handle middleware creation errors with detailed error context
        logger.error('Failed to create custom logging middleware', {
            error: error.message,
            errorType: error.constructor.name,
            options: options,
            timestamp: new Date().toISOString()
        });
        
        // Return basic middleware as fallback for continued operation
        return requestLoggingMiddleware;
    }
}

// =============================================================================
// MONITORING AND STATISTICS
// =============================================================================

/**
 * Returns current logging middleware statistics for monitoring and operational insights.
 * This function provides comprehensive operational statistics about the logging middleware
 * including request counts, active requests, performance metrics, and system health indicators
 * for monitoring dashboards, operational analysis, and debugging assistance.
 * 
 * Statistics collection includes:
 * - Request counter statistics with total and method/status breakdowns
 * - Active request tracking with correlation ID enumeration and lifecycle analysis
 * - Middleware initialization status and configuration summary for system health
 * - Performance metrics including request processing rates and response times
 * - Memory usage patterns and resource utilization for optimization guidance
 * - System timing information for operational monitoring and trend analysis
 * 
 * @returns {Object} Logging statistics object with request counts, active requests, and performance metrics
 */
function getLoggingStats() {
    try {
        // Create copy of REQUEST_COUNTERS to prevent external modification
        const requestCounters = JSON.parse(JSON.stringify(REQUEST_COUNTERS));
        
        // Calculate request processing rates and performance metrics
        const processingStats = {
            totalRequests: requestCounters.total,
            activeRequests: ACTIVE_REQUESTS.size,
            completedRequests: requestCounters.total - ACTIVE_REQUESTS.size,
            
            // Method distribution analysis
            methodDistribution: { ...requestCounters.by_method },
            topMethod: Object.keys(requestCounters.by_method).reduce((a, b) => 
                requestCounters.by_method[a] > requestCounters.by_method[b] ? a : b, 'GET'),
            
            // Status code distribution analysis
            statusDistribution: { ...requestCounters.by_status },
            successRate: calculateSuccessRate(requestCounters.by_status),
            errorRate: calculateErrorRate(requestCounters.by_status)
        };
        
        // Collect active request information with correlation tracking
        const activeRequestInfo = [];
        for (const [correlationId, requestInfo] of ACTIVE_REQUESTS) {
            activeRequestInfo.push({
                correlationId: correlationId,
                method: requestInfo.method,
                path: requestInfo.path,
                startTime: requestInfo.startTime,
                duration: Date.now() - requestInfo.startTime,
                clientIp: requestInfo.clientIp,
                userAgent: requestInfo.userAgent
            });
        }
        
        // Sort active requests by duration for performance analysis
        activeRequestInfo.sort((a, b) => b.duration - a.duration);
        
        // Include middleware configuration and system health information
        const systemHealth = {
            middlewareInitialized: MIDDLEWARE_INITIALIZED,
            configurationLoaded: LOGGING_CONFIG !== null,
            currentLogLevel: LOGGING_CONFIG?.level || 'unknown',
            performanceLogging: LOGGING_CONFIG?.performance_logging !== false,
            correlationTracking: LOGGING_CONFIG?.correlation_tracking !== false
        };
        
        // Add system resource information for operational monitoring
        const resourceUtilization = {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        };
        
        // Create comprehensive statistics object with operational metrics
        const loggingStatistics = {
            processing: processingStats,
            activeRequests: {
                count: ACTIVE_REQUESTS.size,
                requests: activeRequestInfo.slice(0, 10), // Top 10 longest running requests
                oldestRequest: activeRequestInfo.length > 0 ? activeRequestInfo[0] : null
            },
            system: systemHealth,
            resources: resourceUtilization,
            counters: requestCounters,
            metadata: {
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                statisticsVersion: '1.0.0'
            }
        };
        
        // Return comprehensive logging statistics for monitoring and analysis
        return Object.freeze(loggingStatistics);
        
    } catch (error) {
        // Handle statistics generation errors gracefully - return basic stats
        logger.error('Failed to generate logging statistics', {
            error: error.message,
            errorType: error.constructor.name,
            timestamp: new Date().toISOString()
        });
        
        // Return minimal fallback statistics for continued monitoring
        return {
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            fallback: {
                totalRequests: REQUEST_COUNTERS.total || 0,
                activeRequests: ACTIVE_REQUESTS.size || 0,
                middlewareInitialized: MIDDLEWARE_INITIALIZED,
                configurationLoaded: LOGGING_CONFIG !== null
            }
        };
    }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Handles errors that occur within logging middleware without affecting request processing.
 * This function provides centralized error handling for logging middleware operations,
 * ensuring that logging failures do not impact application functionality while maintaining
 * error visibility for debugging and operational monitoring.
 * 
 * Error handling features include:
 * - Centralized error logging with context information and correlation tracking
 * - Error classification and severity determination for appropriate response
 * - Graceful degradation to prevent logging errors from affecting request processing
 * - Error statistics tracking for monitoring and operational analysis
 * - Context preservation including correlation IDs and error circumstances
 * - Prevention of logging error propagation to Express.js error handling middleware
 * 
 * @param {Error} error - Error object with message, stack trace, and error context information
 * @param {string} context - Context string describing where the error occurred for debugging assistance
 * @param {string} correlationId - Correlation ID for request tracking and error correlation
 * @returns {void} No return value - logs error information without affecting request processing
 */
function handleLoggingError(error, context, correlationId) {
    try {
        // Create comprehensive error context for debugging and monitoring
        const errorContext = {
            error: {
                message: error.message || 'Unknown error occurred',
                name: error.name || 'Error',
                stack: error.stack || 'No stack trace available',
                type: error.constructor.name || 'Error'
            },
            context: {
                location: context || 'unknown',
                correlationId: correlationId || 'unknown',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            },
            system: {
                activeRequests: ACTIVE_REQUESTS.size,
                totalRequests: REQUEST_COUNTERS.total,
                middlewareInitialized: MIDDLEWARE_INITIALIZED,
                memoryUsage: process.memoryUsage()
            }
        };
        
        // Log error using structured logging with ERROR level for operational visibility
        logger.error(`Logging middleware error in ${context}`, errorContext);
        
        // Update error statistics if tracking is enabled for operational monitoring
        if (LOGGING_CONFIG?.error_tracking === true) {
            // Increment error counter for context if it exists
            if (!REQUEST_COUNTERS.by_error) {
                REQUEST_COUNTERS.by_error = {};
            }
            if (!REQUEST_COUNTERS.by_error[context]) {
                REQUEST_COUNTERS.by_error[context] = 0;
            }
            REQUEST_COUNTERS.by_error[context] += 1;
        }
        
    } catch (errorHandlingError) {
        // Handle errors in error handling - use console as ultimate fallback
        try {
            console.error('[LOGGING MIDDLEWARE] Error in error handler:', {
                originalError: error.message,
                handlingError: errorHandlingError.message,
                context: context,
                correlationId: correlationId,
                timestamp: new Date().toISOString()
            });
        } catch (consoleError) {
            // If even console logging fails, there's not much more we can do
            // Continue silently to avoid affecting application operation
        }
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculates success rate based on status code distribution for monitoring metrics.
 * @param {Object} statusDistribution - Object with status codes as keys and counts as values
 * @returns {number} Success rate as percentage (0-100)
 */
function calculateSuccessRate(statusDistribution) {
    const totalRequests = Object.values(statusDistribution).reduce((sum, count) => sum + count, 0);
    if (totalRequests === 0) return 100;
    
    const successRequests = Object.keys(statusDistribution)
        .filter(status => parseInt(status) >= 200 && parseInt(status) < 400)
        .reduce((sum, status) => sum + statusDistribution[status], 0);
    
    return Math.round((successRequests / totalRequests) * 100);
}

/**
 * Calculates error rate based on status code distribution for monitoring metrics.
 * @param {Object} statusDistribution - Object with status codes as keys and counts as values
 * @returns {number} Error rate as percentage (0-100)
 */
function calculateErrorRate(statusDistribution) {
    const totalRequests = Object.values(statusDistribution).reduce((sum, count) => sum + count, 0);
    if (totalRequests === 0) return 0;
    
    const errorRequests = Object.keys(statusDistribution)
        .filter(status => parseInt(status) >= 400)
        .reduce((sum, status) => sum + statusDistribution[status], 0);
    
    return Math.round((errorRequests / totalRequests) * 100);
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Primary Express middleware function for comprehensive HTTP request/response logging with performance tracking
    requestLoggingMiddleware,
    
    // Factory function for creating customized logging middleware with configurable options and behavior
    createLoggingMiddleware,
    
    // Utility function to retrieve logging middleware statistics for monitoring and operational insights
    getLoggingStats,
    
    // Initialization function for setting up logging middleware configuration and request tracking
    initializeLoggingMiddleware,
    
    // Utility function for generating unique correlation IDs for request tracking and log correlation
    generateCorrelationId
};