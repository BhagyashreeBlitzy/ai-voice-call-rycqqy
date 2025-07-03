// Express middleware aggregator for the Node.js tutorial backend
// Centralizes import and export of all core middleware functions to provide
// a single, ordered array or object for streamlined integration into the main Express app
// Ensures correct middleware order for security, observability, performance, and error handling

// Internal middleware imports - core Express middleware functions
// Import security middleware factory for HTTP security headers and CORS policy
const { securityMiddleware } = require('./security.js');

// Import request logging middleware for HTTP request/response observability  
const { requestLoggerMiddleware } = require('./logging.js');

// Import compression middleware factory for HTTP response compression
const { compressionMiddleware } = require('./compression.js');

// Import request timeout middleware and timeout error handler
const { 
    requestTimeout, 
    handleTimeoutError,
    DEFAULT_REQUEST_TIMEOUT_MS 
} = require('./requestTimeout.js');

// Import centralized error handling middleware
const { errorHandler } = require('./errorHandler.js');

// Internal utility imports for logging and observability
const { logger } = require('../utils/logger.js');

/**
 * Factory function that creates and returns an ordered array of core Express middleware functions
 * for use in the main Express application. This function enforces best practices for middleware
 * order and ensures consistent security, observability, performance, and reliability configuration.
 * 
 * Middleware Order (Critical for Security and Performance):
 * 1. Security Middleware (helmet + CORS) - Must be first to protect all subsequent middleware
 * 2. Request Logging Middleware - Logs all requests for observability and debugging  
 * 3. Compression Middleware - Applies response compression for performance optimization
 * 4. Request Timeout Middleware - Enforces per-request timeouts to prevent resource exhaustion
 * 
 * This ordering ensures that:
 * - Security headers are applied before any request processing occurs
 * - All requests are logged regardless of processing outcome
 * - Response compression is applied after security but before timeout handling
 * - Request timeouts protect against long-running operations
 * 
 * @param {Object} [options={}] - Configuration options for middleware behavior
 * @param {Object} [options.helmetOptions={}] - Custom helmet configuration for security headers
 * @param {Object} [options.corsOptions={}] - Custom CORS configuration for cross-origin requests
 * @param {Object} [options.compressionOptions={}] - Custom compression configuration for response optimization
 * @param {number} [options.timeoutMs=5000] - Request timeout duration in milliseconds
 * @param {boolean} [options.enableLogging=true] - Enable or disable request logging middleware
 * @param {boolean} [options.enableCompression=true] - Enable or disable response compression
 * @param {boolean} [options.enableTimeout=true] - Enable or disable request timeout enforcement
 * 
 * @returns {Array<Function>} Ordered array of Express middleware functions ready for app.use()
 * 
 * @example
 * // Basic usage with default configuration
 * const { getMiddlewareStack } = require('./middleware');
 * const middlewareStack = getMiddlewareStack();
 * app.use(...middlewareStack);
 * 
 * @example
 * // Advanced usage with custom configuration
 * const { getMiddlewareStack } = require('./middleware');
 * const middlewareStack = getMiddlewareStack({
 *   helmetOptions: { 
 *     contentSecurityPolicy: false 
 *   },
 *   corsOptions: { 
 *     origin: ['http://localhost:3000', 'https://myapp.com'] 
 *   },
 *   compressionOptions: { 
 *     threshold: 2048 
 *   },
 *   timeoutMs: 10000
 * });
 * app.use(...middlewareStack);
 * 
 * @throws {TypeError} When options parameter is not an object
 * @throws {RangeError} When timeoutMs is not a positive number
 */
function getMiddlewareStack(options = {}) {
    // Validate options parameter to ensure it's an object
    if (options !== null && typeof options !== 'object') {
        const error = new TypeError('Options parameter must be an object or null');
        logger.error('Invalid options parameter provided to getMiddlewareStack', {
            providedType: typeof options,
            providedValue: options,
            error: error.message,
            action: 'getMiddlewareStack_validation_failed'
        });
        throw error;
    }

    // Extract and validate configuration options with secure defaults
    const {
        helmetOptions = {},
        corsOptions = {},
        compressionOptions = {},
        timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
        enableLogging = true,
        enableCompression = true,
        enableTimeout = true
    } = options;

    // Validate timeout configuration to ensure it's a positive number
    if (typeof timeoutMs !== 'number' || timeoutMs <= 0) {
        const error = new RangeError('Timeout duration must be a positive number');
        logger.error('Invalid timeout configuration provided to getMiddlewareStack', {
            providedTimeoutMs: timeoutMs,
            expectedType: 'positive number',
            error: error.message,
            action: 'getMiddlewareStack_timeout_validation_failed'
        });
        throw error;
    }

    // Log middleware stack initialization for debugging and observability
    logger.info('Initializing Express middleware stack with configuration', {
        configuration: {
            helmetOptionsProvided: Object.keys(helmetOptions).length > 0,
            corsOptionsProvided: Object.keys(corsOptions).length > 0,
            compressionOptionsProvided: Object.keys(compressionOptions).length > 0,
            timeoutMs: timeoutMs,
            enableLogging: enableLogging,
            enableCompression: enableCompression,
            enableTimeout: enableTimeout
        },
        middlewareOrder: [
            'securityMiddleware (helmet + CORS)',
            enableLogging ? 'requestLoggerMiddleware' : 'requestLoggerMiddleware (disabled)',
            enableCompression ? 'compressionMiddleware' : 'compressionMiddleware (disabled)',
            enableTimeout ? 'requestTimeout' : 'requestTimeout (disabled)'
        ],
        action: 'middleware_stack_initialization'
    });

    // Initialize ordered middleware array with proper sequencing
    const middlewareStack = [];

    try {
        // Step 1: Security Middleware (MUST be first in the stack)
        // Apply comprehensive HTTP security headers and CORS policy
        // This protects all subsequent middleware and route handlers
        logger.info('Adding security middleware to stack', {
            helmetOverrides: Object.keys(helmetOptions),
            corsOverrides: Object.keys(corsOptions),
            position: 'first',
            action: 'security_middleware_added'
        });

        const securityMiddlewareStack = securityMiddleware(helmetOptions, corsOptions);
        middlewareStack.push(...securityMiddlewareStack);

        // Step 2: Request Logging Middleware (second for comprehensive coverage)
        // Log all HTTP requests and responses for observability and debugging
        // Positioned after security to log security-enhanced requests
        if (enableLogging) {
            logger.info('Adding request logging middleware to stack', {
                position: 'second',
                purpose: 'HTTP request/response observability',
                action: 'logging_middleware_added'
            });
            middlewareStack.push(requestLoggerMiddleware);
        } else {
            logger.warn('Request logging middleware disabled by configuration', {
                position: 'second',
                action: 'logging_middleware_skipped'
            });
        }

        // Step 3: Compression Middleware (third for performance optimization)
        // Apply gzip/deflate compression to eligible HTTP responses
        // Positioned after logging to compress logged responses
        if (enableCompression) {
            logger.info('Adding compression middleware to stack', {
                compressionOptions: Object.keys(compressionOptions),
                position: 'third',
                purpose: 'HTTP response compression for performance',
                action: 'compression_middleware_added'
            });
            const compression = compressionMiddleware(compressionOptions);
            middlewareStack.push(compression);
        } else {
            logger.warn('Compression middleware disabled by configuration', {
                position: 'third',
                action: 'compression_middleware_skipped'
            });
        }

        // Step 4: Request Timeout Middleware (fourth for request lifecycle management)
        // Enforce per-request timeouts using AbortController for resource protection
        // Positioned last to timeout all previous middleware processing
        if (enableTimeout) {
            logger.info('Adding request timeout middleware to stack', {
                timeoutMs: timeoutMs,
                position: 'fourth',
                purpose: 'Request timeout enforcement and resource protection',
                action: 'timeout_middleware_added'
            });
            const timeoutMiddleware = requestTimeout({ timeoutMs: timeoutMs });
            middlewareStack.push(timeoutMiddleware);
        } else {
            logger.warn('Request timeout middleware disabled by configuration', {
                position: 'fourth',
                action: 'timeout_middleware_skipped'
            });
        }

        // Log successful middleware stack creation with comprehensive details
        logger.info('Express middleware stack created successfully', {
            totalMiddleware: middlewareStack.length,
            enabledMiddleware: {
                security: true, // Always enabled for security
                logging: enableLogging,
                compression: enableCompression,
                timeout: enableTimeout
            },
            configuration: {
                timeoutMs: timeoutMs,
                hasCustomHelmetOptions: Object.keys(helmetOptions).length > 0,
                hasCustomCorsOptions: Object.keys(corsOptions).length > 0,
                hasCustomCompressionOptions: Object.keys(compressionOptions).length > 0
            },
            action: 'middleware_stack_creation_success'
        });

        // Return the ordered middleware array for Express application integration
        return middlewareStack;

    } catch (middlewareError) {
        // Handle any errors that occur during middleware stack creation
        // Log comprehensive error details for debugging and monitoring
        logger.error('Failed to create Express middleware stack', {
            error: {
                message: middlewareError.message,
                name: middlewareError.name,
                stack: middlewareError.stack
            },
            configuration: {
                helmetOptions: Object.keys(helmetOptions),
                corsOptions: Object.keys(corsOptions),
                compressionOptions: Object.keys(compressionOptions),
                timeoutMs: timeoutMs,
                enabledFlags: {
                    logging: enableLogging,
                    compression: enableCompression,
                    timeout: enableTimeout
                }
            },
            action: 'middleware_stack_creation_failed'
        });

        // Re-throw the error to allow upstream error handling
        // This ensures that middleware stack creation failures are properly handled
        throw middlewareError;
    }
}

// Export all middleware functions and utilities for flexible usage patterns
// This enables both all-in-one stack usage and granular control for advanced scenarios

// Export the main middleware stack factory function
module.exports = {
    // Primary export - middleware stack factory function
    // Provides ordered array of core middleware for Express application integration
    getMiddlewareStack,

    // Individual middleware exports for direct usage and advanced customization
    // These can be used independently when custom middleware ordering is required

    // Security middleware factory - applies HTTP security headers and CORS policy
    // Must be used first in any custom middleware stack for comprehensive protection
    securityMiddleware,

    // Request logging middleware - provides HTTP request/response observability
    // Essential for debugging, monitoring, and performance analysis
    requestLoggerMiddleware,

    // Compression middleware factory - applies HTTP response compression
    // Improves performance by reducing response payload size
    compressionMiddleware,

    // Request timeout middleware factory - enforces per-request timeouts
    // Prevents resource exhaustion from long-running requests
    requestTimeout,

    // Error handling middleware exports for complete error management
    // These should be mounted after all routes for proper error processing

    // Timeout-specific error handler - processes request timeout errors
    // Should be mounted after all routes but before the main error handler
    handleTimeoutError,

    // Main error handler - centralized error processing and secure response generation
    // Must be mounted as the last middleware in the Express application
    errorHandler,

    // Configuration constants for reference and validation
    // Default timeout constant for consistent timeout configuration
    DEFAULT_REQUEST_TIMEOUT_MS
};

// Add comprehensive JSDoc documentation for the module
/**
 * @fileoverview Express Middleware Aggregator Module
 * 
 * This module serves as the central aggregator for all core Express middleware functions
 * used in the Node.js tutorial backend. It provides both a convenient factory function
 * for creating ordered middleware stacks and individual middleware exports for advanced
 * customization scenarios.
 * 
 * Key Features:
 * - Enforces security-first middleware ordering
 * - Provides comprehensive configuration options
 * - Includes extensive logging for observability
 * - Supports both all-in-one and granular usage patterns
 * - Implements production-ready error handling
 * - Maintains backward compatibility for future enhancements
 * 
 * Usage Patterns:
 * 1. All-in-one stack: Use getMiddlewareStack() for standard middleware application
 * 2. Custom ordering: Import individual middleware for advanced scenarios
 * 3. Error handling: Import error handlers for proper error middleware mounting
 * 
 * Security Considerations:
 * - Security middleware must always be first in any middleware stack
 * - Error handlers should be mounted after all routes for proper error processing
 * - Configuration validation prevents insecure or invalid middleware configuration
 * 
 * Performance Considerations:
 * - Middleware ordering optimized for minimal performance overhead
 * - Compression middleware positioned for optimal response processing
 * - Request timeout middleware provides resource protection without blocking
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Backend Team
 * @requires express
 * @requires helmet
 * @requires cors
 * @requires compression
 * @requires on-finished
 * @since 1.0.0
 */