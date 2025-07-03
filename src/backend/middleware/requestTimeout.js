// Express middleware for enforcing per-request timeouts in Node.js tutorial backend
// Integrates with AbortController for signal-based request cancellation and implements
// robust timeout handling with proper cleanup and error forwarding

// Import utility functions for timeout management and error handling
// These provide the core timeout logic and standardized error processing
const { 
    createRequestTimeout, 
    clearRequestTimeout, 
    handleTimeoutError,
    DEFAULT_TIMEOUT_MS 
} = require('../utils/requestTimeout.js');

// Import logging utility for comprehensive observability and debugging
const { logger } = require('../utils/logger.js');

// Global configuration constant for default timeout duration
// This ensures consistent timeout behavior across all requests when no custom timeout is specified
const DEFAULT_REQUEST_TIMEOUT_MS = DEFAULT_TIMEOUT_MS; // 5000ms (5 seconds)

/**
 * Express middleware factory function that creates request timeout enforcement middleware
 * 
 * This middleware enforces maximum request processing durations using AbortController
 * for signal-based cancellation. It prevents resource exhaustion from long-running requests
 * and ensures timely responses to clients. The middleware integrates with the Express.js
 * error handling system for consistent timeout error responses.
 * 
 * Key Features:
 * - Signal-based request cancellation using AbortController
 * - Automatic timer cleanup on request completion
 * - Express.js error middleware integration
 * - Comprehensive logging for observability
 * - Production-ready error handling and security
 * 
 * @param {object} [options={}] - Configuration options for timeout behavior
 * @param {number} [options.timeoutMs=DEFAULT_REQUEST_TIMEOUT_MS] - Timeout duration in milliseconds
 * @returns {function} Express middleware function with signature (req, res, next)
 * 
 * @example
 * // Basic usage with default timeout (5 seconds)
 * app.use(requestTimeout());
 * 
 * @example
 * // Custom timeout duration
 * app.use(requestTimeout({ timeoutMs: 10000 })); // 10 seconds
 * 
 * @example
 * // Using in route-specific middleware
 * app.get('/api/data', requestTimeout({ timeoutMs: 30000 }), dataHandler);
 */
function requestTimeout(options = {}) {
    // Extract and validate timeout configuration from options
    // Default to global constant if not specified or invalid
    const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0 
        ? options.timeoutMs 
        : DEFAULT_REQUEST_TIMEOUT_MS;
    
    // Log middleware initialization for debugging and observability
    logger.info('Request timeout middleware initialized', {
        timeoutMs: timeoutMs,
        defaultTimeout: DEFAULT_REQUEST_TIMEOUT_MS,
        hasCustomTimeout: options.timeoutMs !== undefined,
        action: 'middleware_init'
    });
    
    // Return the Express middleware function
    // This function will be called for each request that passes through this middleware
    return function requestTimeoutMiddleware(req, res, next) {
        // Record request start time for duration calculation and performance monitoring
        const requestStartTime = Date.now();
        req.startTime = requestStartTime;
        
        // Store timeout configuration on request object for downstream access
        req.timeoutMs = timeoutMs;
        
        // Build comprehensive request context for logging and debugging
        const requestContext = {
            method: req.method || 'UNKNOWN',
            url: req.originalUrl || req.url || 'UNKNOWN',
            userAgent: req.get('User-Agent') || 'UNKNOWN',
            ip: req.ip || req.connection?.remoteAddress || 'UNKNOWN',
            contentLength: req.get('Content-Length') || 'UNKNOWN',
            timestamp: new Date().toISOString(),
            timeoutMs: timeoutMs,
            startTime: requestStartTime
        };
        
        // Log request timeout middleware activation for observability
        logger.info('Request timeout middleware activated', {
            request: requestContext,
            action: 'timeout_middleware_start'
        });
        
        // Create AbortController and timeout timer using utility function
        // This provides the core timeout mechanism for request cancellation
        let timeoutData;
        try {
            timeoutData = createRequestTimeout(timeoutMs);
        } catch (error) {
            // Handle timeout creation failure gracefully
            logger.error('Failed to create request timeout controller', {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                request: requestContext,
                action: 'timeout_creation_failed'
            });
            
            // Continue without timeout if creation fails
            // This prevents the middleware from blocking requests entirely
            next();
            return;
        }
        
        // Extract controller and timeoutId from timeout creation result
        const { controller, timeoutId } = timeoutData;
        
        // Attach abort signal to request object for downstream async handlers
        // This enables route handlers and other middleware to use the signal for cancellation
        req.abortSignal = controller.signal;
        req.signal = controller.signal; // Alternative property name for compatibility
        
        // Store timeout ID on request for cleanup operations
        req.timeoutId = timeoutId;
        
        // Initialize timeout flag to track if request has timed out
        req.timedOut = false;
        
        // Set up abort signal event listener to detect timeout occurrence
        // This listener is triggered when the timeout timer expires and calls controller.abort()
        const abortListener = () => {
            // Set timeout flag to indicate request has timed out
            req.timedOut = true;
            
            // Calculate request duration for logging and analysis
            const requestDuration = Date.now() - requestStartTime;
            
            // Log timeout event with comprehensive context
            logger.warn('Request timeout occurred, signal aborted', {
                request: requestContext,
                timeout: {
                    duration: requestDuration,
                    timeoutMs: timeoutMs,
                    exceeded: requestDuration >= timeoutMs
                },
                action: 'request_timeout_triggered'
            });
            
            // Forward timeout to error handling middleware
            // This ensures consistent error response formatting and logging
            next(new Error('AbortError: Request timeout'));
        };
        
        // Add abort event listener if signal is not already aborted
        if (!controller.signal.aborted) {
            controller.signal.addEventListener('abort', abortListener);
        } else {
            // If signal is already aborted, handle immediately
            abortListener();
            return;
        }
        
        // Define cleanup function to remove timers and event listeners
        // This prevents memory leaks and ensures proper resource cleanup
        const cleanup = () => {
            // Remove abort event listener to prevent memory leaks
            if (controller.signal && abortListener) {
                controller.signal.removeEventListener('abort', abortListener);
            }
            
            // Clear timeout timer to prevent unnecessary abort calls
            if (timeoutId) {
                clearRequestTimeout(timeoutId);
            }
            
            // Calculate final request duration for logging
            const finalDuration = Date.now() - requestStartTime;
            
            // Log successful cleanup for debugging and observability
            logger.info('Request timeout cleanup completed', {
                request: requestContext,
                duration: finalDuration,
                timedOut: req.timedOut,
                action: 'timeout_cleanup_complete'
            });
        };
        
        // Set up response event listeners for automatic cleanup
        // These listeners ensure cleanup occurs when the request completes normally
        
        // Listen for 'finish' event - fired when response is fully sent
        const onFinish = () => {
            logger.info('Response finished, cleaning up timeout', {
                request: requestContext,
                duration: Date.now() - requestStartTime,
                action: 'response_finished'
            });
            cleanup();
        };
        
        // Listen for 'close' event - fired when response connection is closed
        const onClose = () => {
            logger.info('Response connection closed, cleaning up timeout', {
                request: requestContext,
                duration: Date.now() - requestStartTime,
                action: 'response_closed'
            });
            cleanup();
        };
        
        // Listen for 'error' event - fired when response encounters an error
        const onError = (error) => {
            logger.warn('Response error occurred, cleaning up timeout', {
                request: requestContext,
                error: {
                    message: error.message,
                    name: error.name
                },
                duration: Date.now() - requestStartTime,
                action: 'response_error'
            });
            cleanup();
        };
        
        // Register event listeners for automatic cleanup
        res.on('finish', onFinish);
        res.on('close', onClose);
        res.on('error', onError);
        
        // Store cleanup function on request object for manual cleanup if needed
        req.timeoutCleanup = cleanup;
        
        // Continue to next middleware in the chain
        // At this point, the request has timeout protection activated
        next();
    };
}

// Export the middleware function and re-export error handler for convenience
// This enables both the middleware and error handler to be imported from this module
module.exports = {
    // Main middleware factory function
    requestTimeout,
    
    // Re-export error handler for convenience and consistency
    // This allows applications to import both the middleware and error handler from one module
    handleTimeoutError,
    
    // Export default timeout constant for configuration reference
    DEFAULT_REQUEST_TIMEOUT_MS
};