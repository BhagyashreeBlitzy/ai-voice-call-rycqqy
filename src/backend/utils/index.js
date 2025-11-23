// Centralized utility index for the Node.js tutorial backend
// This module serves as the canonical import point for all backend utility functions and classes
// Re-exports all core utility modules to provide a single, discoverable import location

// Import error handling utilities from the errors module
const { 
    AppError, 
    normalizeError, 
    errorResponse,
    DEFAULT_ERROR_STATUS,
    DEFAULT_ERROR_MESSAGE 
} = require('./errors.js');

// Import logging utilities from the logger module
const { 
    logger,
    info,
    warn,
    error,
    level 
} = require('./logger.js');

// Import request timeout utilities from the requestTimeout module
const { 
    createRequestTimeout,
    clearRequestTimeout,
    handleTimeoutError,
    DEFAULT_TIMEOUT_MS,
    GATEWAY_TIMEOUT_STATUS,
    GATEWAY_TIMEOUT_MESSAGE 
} = require('./requestTimeout.js');

// Import graceful shutdown utilities from the shutdown module
const { 
    shutdown,
    setupShutdownHooks 
} = require('./shutdown.js');

// Re-export all utility functions and classes for centralized access
// This enables consistent imports throughout the backend: import { AppError, logger, createRequestTimeout } from './utils'

// Error handling utilities - provides robust error management and secure error response formatting
module.exports = {
    // Custom error class for application-specific errors with HTTP status support
    // Used throughout the backend for consistent error handling and propagation
    AppError,
    
    // Utility to standardize error objects for consistent error handling
    // Normalizes any thrown error or value into an AppError instance
    normalizeError,
    
    // Formats and sends error responses to clients in a secure, consistent manner
    // Ensures no sensitive details are leaked while providing useful error information
    errorResponse,
    
    // Logging utilities - provides centralized, consistent logging throughout the backend
    // Singleton logger instance for info, warn, and error logging with log level filtering
    logger,
    
    // Individual logger methods for named import flexibility
    // Bound to the logger instance to maintain proper context
    info,
    warn,
    error,
    
    // Logger level property for runtime configuration
    level,
    
    // Request timeout utilities - provides robust request lifecycle management
    // Utility to create and manage per-request timeouts using AbortController
    createRequestTimeout,
    
    // Allows cleanup of request timeout timers to prevent memory leaks
    clearRequestTimeout,
    
    // Express error handler for request timeouts, forwarding standardized errors to error middleware
    handleTimeoutError,
    
    // Graceful shutdown utilities - supports robust server lifecycle control
    // Main entry point for initiating graceful server shutdown
    shutdown,
    
    // Registers process signal handlers to automatically trigger shutdown on SIGTERM/SIGINT
    setupShutdownHooks,
    
    // Export utility constants for advanced configuration and consistency
    DEFAULT_ERROR_STATUS,
    DEFAULT_ERROR_MESSAGE,
    DEFAULT_TIMEOUT_MS,
    GATEWAY_TIMEOUT_STATUS,
    GATEWAY_TIMEOUT_MESSAGE
};