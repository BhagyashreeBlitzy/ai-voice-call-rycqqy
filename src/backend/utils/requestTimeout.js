// Built-in Node.js AbortController for request timeout management
// AbortController is available natively in Node.js v18+ as a global

// Internal utilities for error handling and logging
const { AppError } = require('./errors.js');
const { logger } = require('./logger.js');

// Global constants for standardized timeout handling
// These values ensure consistent timeout behavior across the application
const DEFAULT_TIMEOUT_MS = 5000; // 5 seconds default timeout for requests
const GATEWAY_TIMEOUT_STATUS = 504; // HTTP 504 Gateway Timeout status code
const GATEWAY_TIMEOUT_MESSAGE = "Request timed out"; // Standardized timeout error message

/**
 * Creates an AbortController with an associated timeout timer for request lifecycle management
 * This function provides the core timeout mechanism used by middleware and async handlers
 * to enforce maximum request processing durations and prevent resource exhaustion
 * 
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Timeout duration in milliseconds
 * @returns {object} Object containing AbortController instance and timeout timer ID
 * @returns {AbortController} returns.controller - AbortController for signal-based cancellation
 * @returns {NodeJS.Timeout} returns.timeoutId - Timer ID for cleanup operations
 */
function createRequestTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
    // Validate timeout parameter to ensure it's a positive number
    // This prevents configuration errors and ensures predictable behavior
    if (typeof timeoutMs !== 'number' || timeoutMs <= 0) {
        // Log warning about invalid timeout value and fall back to default
        logger.warn('Invalid timeout value provided, using default timeout', {
            providedTimeout: timeoutMs,
            defaultTimeout: DEFAULT_TIMEOUT_MS,
            action: 'fallback_to_default'
        });
        timeoutMs = DEFAULT_TIMEOUT_MS;
    }
    
    // Create new AbortController instance for this specific request
    // AbortController provides modern, standard-compliant cancellation mechanism
    const controller = new AbortController();
    
    // Set up timeout timer that will automatically abort the controller
    // This ensures requests don't run indefinitely and consume server resources
    const timeoutId = setTimeout(() => {
        // Log timeout event for observability and debugging
        logger.warn('Request timeout triggered, aborting controller', {
            timeoutMs: timeoutMs,
            timestamp: new Date().toISOString(),
            action: 'abort_request'
        });
        
        // Abort the controller, which will trigger 'abort' event on the signal
        // This allows all async operations using this signal to be cancelled
        controller.abort();
    }, timeoutMs);
    
    // Log successful timeout creation for debugging purposes
    logger.info('Request timeout created successfully', {
        timeoutMs: timeoutMs,
        controllerId: controller.signal.aborted ? 'already_aborted' : 'active',
        action: 'timeout_created'
    });
    
    // Return both controller and timeoutId for downstream usage
    // Controller provides the abort signal, timeoutId enables cleanup
    return {
        controller: controller,
        timeoutId: timeoutId
    };
}

/**
 * Clears the timeout timer to prevent unnecessary abort operations and memory leaks
 * This function should be called when requests complete successfully or are manually cancelled
 * Prevents the timeout from firing after the request has already been processed
 * 
 * @param {NodeJS.Timeout} timeoutId - Timer ID returned by createRequestTimeout
 * @returns {void} No return value, performs cleanup operation
 */
function clearRequestTimeout(timeoutId) {
    // Validate that timeoutId is provided and is a valid timeout reference
    // This prevents errors when clearing already-cleared or invalid timeouts
    if (timeoutId && typeof timeoutId === 'object') {
        // Clear the timeout to prevent the abort callback from executing
        // This is crucial for preventing false timeout events after request completion
        clearTimeout(timeoutId);
        
        // Log successful timeout clearance for debugging and observability
        logger.info('Request timeout cleared successfully', {
            timeoutId: timeoutId.toString(),
            timestamp: new Date().toISOString(),
            action: 'timeout_cleared'
        });
    } else {
        // Log warning about invalid timeout ID for debugging purposes
        logger.warn('Invalid timeout ID provided for clearance', {
            timeoutId: timeoutId,
            type: typeof timeoutId,
            action: 'invalid_timeout_clear'
        });
    }
}

/**
 * Express error handler middleware for processing request timeout errors
 * Detects timeout conditions, logs events, and forwards standardized errors to error middleware
 * Ensures consistent 504 Gateway Timeout responses for all timeout scenarios
 * 
 * @param {any} err - Error object or value that may indicate a timeout condition
 * @param {object} req - Express Request object containing request context
 * @param {object} res - Express Response object for sending HTTP responses
 * @param {function} next - Express next function for forwarding to subsequent middleware
 * @returns {void} Forwards processed error to next middleware or handles directly
 */
function handleTimeoutError(err, req, res, next) {
    // Check for timeout conditions using multiple detection methods
    // AbortError indicates controller.abort() was called due to timeout
    // req.timedOut is a custom flag that can be set by timeout middleware
    const isAbortError = err && err.name === 'AbortError';
    const isCustomTimeout = req && req.timedOut === true;
    const isTimeoutError = isAbortError || isCustomTimeout;
    
    // If this is a timeout error, handle it specially
    if (isTimeoutError) {
        // Build comprehensive request context for timeout logging
        const requestContext = {
            method: req.method || 'UNKNOWN',
            url: req.originalUrl || req.url || 'UNKNOWN',
            userAgent: req.get('User-Agent') || 'UNKNOWN',
            ip: req.ip || req.connection?.remoteAddress || 'UNKNOWN',
            timestamp: new Date().toISOString(),
            timeout: req.timeoutMs || DEFAULT_TIMEOUT_MS,
            duration: req.startTime ? Date.now() - req.startTime : 'UNKNOWN'
        };
        
        // Log timeout event with comprehensive context for observability
        logger.warn('Request timeout detected, generating 504 response', {
            error: {
                name: err.name,
                message: err.message,
                type: isAbortError ? 'AbortError' : 'CustomTimeout'
            },
            request: requestContext,
            action: 'timeout_error_handling'
        });
        
        // Create standardized AppError with Gateway Timeout status
        // This ensures consistent error structure and secure error propagation
        const timeoutError = new AppError(
            GATEWAY_TIMEOUT_MESSAGE,
            GATEWAY_TIMEOUT_STATUS,
            {
                originalError: err.name,
                timeoutDuration: requestContext.timeout,
                requestUrl: requestContext.url,
                requestMethod: requestContext.method
            }
        );
        
        // Forward the standardized timeout error to the main error handling middleware
        // This ensures consistent error response formatting and logging
        next(timeoutError);
        return;
    }
    
    // If not a timeout error, forward the original error unchanged
    // This preserves the original error context for other error handlers
    logger.info('Non-timeout error passed through timeout handler', {
        error: {
            name: err?.name || 'UNKNOWN',
            message: err?.message || 'UNKNOWN',
            type: typeof err
        },
        request: {
            method: req?.method || 'UNKNOWN',
            url: req?.originalUrl || req?.url || 'UNKNOWN'
        },
        action: 'passthrough_error'
    });
    
    // Pass the original error to the next error handler in the chain
    next(err);
}

// Export all functions as named exports for flexible import patterns
// This enables both destructured imports and full module imports
module.exports = {
    createRequestTimeout,
    clearRequestTimeout,
    handleTimeoutError,
    // Export constants for use in other modules that need timeout configuration
    DEFAULT_TIMEOUT_MS,
    GATEWAY_TIMEOUT_STATUS,
    GATEWAY_TIMEOUT_MESSAGE
};