// Node.js built-in modules for log output and message formatting
const process = require('process'); // Built-in Node.js module
const util = require('node:util'); // Built-in Node.js module

// Global log level configuration with numeric priority values
// Higher numeric values indicate more severe log levels
const LOG_LEVELS = {
    info: 20,
    warn: 30,
    error: 40
};

// Default log level for the application
// Can be overridden by process.env.LOG_LEVEL environment variable
const DEFAULT_LOG_LEVEL = 'info';

/**
 * Formats a log message with ISO timestamp, log level, message, and optional metadata
 * Ensures consistent output format for all logger methods across the application
 * 
 * @param {string} level - The log level (info, warn, error)
 * @param {string} message - The log message to format
 * @param {object} [meta] - Optional metadata object to append to the log message
 * @returns {string} Formatted log line including timestamp, level, message, and JSON-stringified metadata
 */
function formatLogMessage(level, message, meta) {
    // Get current timestamp in ISO 8601 format for consistent temporal tracking
    const timestamp = new Date().toISOString();
    
    // Build log prefix with timestamp and level for structured logging
    const logPrefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    // If metadata is provided and not empty, append JSON.stringify(meta) to the message
    // This enables structured logging with additional context information
    if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
        // Use util.inspect for safe and readable formatting of complex objects
        const metaString = util.inspect(meta, { 
            depth: null, 
            colors: false, 
            compact: true,
            breakLength: Infinity 
        });
        return `${logPrefix} ${message} ${metaString}`;
    }
    
    // Return the concatenated log line without metadata
    return `${logPrefix} ${message}`;
}

/**
 * Determines if a message at the given level should be logged based on the current logger level
 * Implements log level filtering to control output verbosity based on environment configuration
 * 
 * @param {string} level - The log level to check (info, warn, error)
 * @returns {boolean} True if the message should be logged, false otherwise
 */
function shouldLog(level) {
    // Look up numeric value for the provided level and the current logger.level
    const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.info;
    const currentLevel = LOG_LEVELS[logger.level] || LOG_LEVELS[DEFAULT_LOG_LEVEL];
    
    // Return true if the message level is greater than or equal to the logger.level
    // This enables log level filtering where higher severity messages are always logged
    return messageLevel >= currentLevel;
}

/**
 * Singleton logger object with info, warn, and error methods
 * Provides centralized logging functionality throughout the backend application
 * Supports log level filtering, timestamped output, and optional metadata attachment
 * Routes info to stdout, warn/error to stderr following best practices for containerized environments
 */
const logger = {
    // Logger level property - configurable via environment variable or at runtime
    // Controls which log messages are output based on severity
    level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
    
    /**
     * Logs an informational message to stdout if the logger level allows
     * Used for general application information like server startup, request processing
     * Includes timestamp, level, message, and optional metadata for observability
     * 
     * @param {string} message - The informational message to log
     * @param {object} [meta] - Optional metadata object for structured logging
     * @returns {void} Writes formatted log line to process.stdout
     */
    info: function(message, meta) {
        // Check if shouldLog('info') returns true for log level filtering
        if (shouldLog('info')) {
            // Format the log message using formatLogMessage('info', message, meta)
            const formattedMessage = formatLogMessage('info', message, meta);
            
            // Write the log line to process.stdout with a newline
            // Info messages go to stdout for proper log stream separation
            process.stdout.write(formattedMessage + '\n');
        }
    },
    
    /**
     * Logs a warning message to stderr if the logger level allows
     * Used for non-critical issues that should be noted but don't stop operation
     * Includes timestamp, level, message, and optional metadata for troubleshooting
     * 
     * @param {string} message - The warning message to log
     * @param {object} [meta] - Optional metadata object for structured logging
     * @returns {void} Writes formatted log line to process.stderr
     */
    warn: function(message, meta) {
        // Check if shouldLog('warn') returns true for log level filtering
        if (shouldLog('warn')) {
            // Format the log message using formatLogMessage('warn', message, meta)
            const formattedMessage = formatLogMessage('warn', message, meta);
            
            // Write the log line to process.stderr with a newline
            // Warning messages go to stderr for proper error stream handling
            process.stderr.write(formattedMessage + '\n');
        }
    },
    
    /**
     * Logs an error message to stderr regardless of logger level
     * Always outputs error messages as they indicate critical issues requiring attention
     * Includes timestamp, level, message, and optional metadata for debugging
     * 
     * @param {string} message - The error message to log
     * @param {object} [meta] - Optional metadata object for structured logging
     * @returns {void} Writes formatted log line to process.stderr
     */
    error: function(message, meta) {
        // Error messages are always logged regardless of log level
        // Format the log message using formatLogMessage('error', message, meta)
        const formattedMessage = formatLogMessage('error', message, meta);
        
        // Write the log line to process.stderr with a newline
        // Error messages go to stderr for proper error stream handling
        process.stderr.write(formattedMessage + '\n');
    }
};

// Export the singleton logger instance for use throughout the backend
// Provides consistent logging behavior and configuration across all modules
module.exports = {
    logger,
    // Export individual logger methods for named import flexibility
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    // Export logger level property for runtime configuration
    level: logger.level
};