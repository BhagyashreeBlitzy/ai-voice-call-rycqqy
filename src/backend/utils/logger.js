// External dependencies
const chalk = require('chalk'); // ^5.3.0 - Provides colorized console output for improved log readability in development environments
const util = require('node:util'); // builtin - Used for formatting log messages and supporting object inspection in debug logs

// Internal dependencies
const { ENVIRONMENT } = require('../config/index.js'); // Determines the current environment (development, production, test) to adjust log verbosity and format

// Global constants for log level management
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const DEFAULT_LOG_LEVEL = 'info';

// Log level names for reverse lookup
const LOG_LEVEL_NAMES = Object.keys(LOG_LEVELS);

/**
 * Determines the current log level based on environment variables or defaults.
 * Allows for environment-based log verbosity configuration.
 * 
 * @returns {string} Current log level (e.g., 'info', 'debug', 'warn', 'error')
 * @example
 * // LOG_LEVEL=debug
 * const level = getLogLevel(); // Returns 'debug'
 * 
 * // LOG_LEVEL not set, ENVIRONMENT=development
 * const level = getLogLevel(); // Returns 'debug'
 * 
 * // LOG_LEVEL not set, ENVIRONMENT=production
 * const level = getLogLevel(); // Returns 'info'
 */
function getLogLevel() {
    // Check process.env.LOG_LEVEL first
    const envLogLevel = process.env.LOG_LEVEL;
    
    // If set and valid, return its value
    if (envLogLevel && LOG_LEVEL_NAMES.includes(envLogLevel.toLowerCase())) {
        return envLogLevel.toLowerCase();
    }
    
    // If ENVIRONMENT is 'development', return 'debug'
    if (ENVIRONMENT === 'development') {
        return 'debug';
    }
    
    // Otherwise, return DEFAULT_LOG_LEVEL ('info')
    return DEFAULT_LOG_LEVEL;
}

/**
 * Centralized logger class providing structured, environment-aware logging methods
 * for info, warn, error, and debug. Supports colorized output in development,
 * log level filtering, and integration with Express middleware and error handling.
 * 
 * @class Logger
 * @example
 * const logger = new Logger();
 * logger.info('Server started successfully');
 * logger.error('Database connection failed', { error: dbError });
 * logger.debug('Request processing details', { requestId: 'abc123' });
 */
class Logger {
    /**
     * Initializes the Logger instance with the appropriate log level and environment settings.
     * Sets up colorized output configuration based on environment.
     * 
     * @constructor
     * @example
     * const logger = new Logger();
     * console.log(logger.level); // 'info' or 'debug' depending on environment
     */
    constructor() {
        // Determine the log level using getLogLevel()
        this.level = getLogLevel();
        
        // Store the numeric level for efficient comparison
        this.numericLevel = LOG_LEVELS[this.level];
        
        // Detect if colorized output should be enabled (ENVIRONMENT !== 'production')
        this.shouldColorize = ENVIRONMENT !== 'production';
        
        // Cache the environment for performance
        this.environment = ENVIRONMENT;
        
        // Initialize color mappings for different log levels
        this.colors = {
            error: chalk.red,
            warn: chalk.yellow,
            info: chalk.blue,
            debug: chalk.gray
        };
    }

    /**
     * Formats a log message with timestamp, level, and metadata.
     * Provides consistent formatting across all log levels.
     * 
     * @private
     * @param {string} level - Log level (error, warn, info, debug)
     * @param {string} message - Primary log message
     * @param {Object} meta - Additional metadata or context
     * @returns {string} Formatted log message
     */
    _formatMessage(level, message, meta) {
        // Create ISO timestamp for consistent time formatting
        const timestamp = new Date().toISOString();
        
        // Format the basic log structure
        let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        // Add metadata if provided
        if (meta && Object.keys(meta).length > 0) {
            // Use util.inspect for proper object formatting
            const metaString = util.inspect(meta, {
                depth: 3,
                colors: this.shouldColorize,
                compact: true,
                breakLength: 80
            });
            formattedMessage += ` ${metaString}`;
        }
        
        return formattedMessage;
    }

    /**
     * Applies colorization to log messages in development environments.
     * 
     * @private
     * @param {string} level - Log level for color selection
     * @param {string} message - Formatted message to colorize
     * @returns {string} Colorized or plain message based on environment
     */
    _colorizeMessage(level, message) {
        if (this.shouldColorize && this.colors[level]) {
            return this.colors[level](message);
        }
        return message;
    }

    /**
     * Checks if logging should occur for the given level.
     * Implements log level filtering based on current configuration.
     * 
     * @private
     * @param {string} level - Log level to check
     * @returns {boolean} True if logging should occur, false otherwise
     */
    _shouldLog(level) {
        return LOG_LEVELS[level] <= this.numericLevel;
    }

    /**
     * Logs informational messages. Used for standard operational events 
     * (e.g., server startup, request logs).
     * 
     * @param {string} message - Primary log message
     * @param {...Object} meta - Optional additional context
     * @returns {void} Outputs the log message to stdout if log level allows
     * @example
     * logger.info('Server started successfully');
     * logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
     */
    info(message, ...meta) {
        // Check if current log level allows 'info' logs
        if (!this._shouldLog('info')) {
            return;
        }
        
        // Combine all meta arguments into single object
        const combinedMeta = meta.length > 0 ? Object.assign({}, ...meta) : {};
        
        // Format the message with timestamp, level, and optional meta/context
        const formattedMessage = this._formatMessage('info', message, combinedMeta);
        
        // If in development, colorize the output using chalk
        const outputMessage = this._colorizeMessage('info', formattedMessage);
        
        // Output to console.log
        console.log(outputMessage);
    }

    /**
     * Logs warning messages. Used for non-critical issues or potential problems.
     * 
     * @param {string} message - Primary log message
     * @param {...Object} meta - Optional additional context
     * @returns {void} Outputs the log message to stdout if log level allows
     * @example
     * logger.warn('Deprecated API usage detected');
     * logger.warn('High memory usage', { memoryUsage: '85%' });
     */
    warn(message, ...meta) {
        // Check if current log level allows 'warn' logs
        if (!this._shouldLog('warn')) {
            return;
        }
        
        // Combine all meta arguments into single object
        const combinedMeta = meta.length > 0 ? Object.assign({}, ...meta) : {};
        
        // Format the message with timestamp, level, and optional meta/context
        const formattedMessage = this._formatMessage('warn', message, combinedMeta);
        
        // If in development, colorize the output using chalk
        const outputMessage = this._colorizeMessage('warn', formattedMessage);
        
        // Output to console.warn
        console.warn(outputMessage);
    }

    /**
     * Logs error messages. Used for application errors, uncaught exceptions,
     * and error-handling middleware. Always logs regardless of log level.
     * 
     * @param {string} message - Primary log message
     * @param {...Object} meta - Optional error object, stack trace, or context
     * @returns {void} Outputs the log message to stderr
     * @example
     * logger.error('Database connection failed');
     * logger.error('Unhandled exception', { error: err, stack: err.stack });
     */
    error(message, ...meta) {
        // Always log error messages regardless of log level
        
        // Combine all meta arguments into single object
        const combinedMeta = meta.length > 0 ? Object.assign({}, ...meta) : {};
        
        // If meta includes an Error object, include stack trace
        if (combinedMeta.error instanceof Error) {
            combinedMeta.stack = combinedMeta.error.stack;
            combinedMeta.errorMessage = combinedMeta.error.message;
            combinedMeta.errorName = combinedMeta.error.name;
        }
        
        // Check if any meta argument is an Error object directly
        for (const item of meta) {
            if (item instanceof Error) {
                combinedMeta.error = item.message;
                combinedMeta.stack = item.stack;
                combinedMeta.errorName = item.name;
                break;
            }
        }
        
        // Format the message with timestamp, level, and optional meta/context
        const formattedMessage = this._formatMessage('error', message, combinedMeta);
        
        // If in development, colorize the output using chalk
        const outputMessage = this._colorizeMessage('error', formattedMessage);
        
        // Output to console.error
        console.error(outputMessage);
    }

    /**
     * Logs debug messages. Used for verbose output in development and troubleshooting.
     * Only logs when log level is 'debug'.
     * 
     * @param {string} message - Primary log message
     * @param {...Object} meta - Optional additional context
     * @returns {void} Outputs the log message to stdout if log level is 'debug'
     * @example
     * logger.debug('Processing request details', { requestId: 'abc123' });
     * logger.debug('Cache hit', { key: 'user:123', ttl: 300 });
     */
    debug(message, ...meta) {
        // Check if current log level is 'debug'
        if (!this._shouldLog('debug')) {
            return;
        }
        
        // Combine all meta arguments into single object
        const combinedMeta = meta.length > 0 ? Object.assign({}, ...meta) : {};
        
        // Format the message with timestamp, level, and optional meta/context
        const formattedMessage = this._formatMessage('debug', message, combinedMeta);
        
        // If in development, colorize the output using chalk
        const outputMessage = this._colorizeMessage('debug', formattedMessage);
        
        // Output to console.debug or console.log
        console.debug(outputMessage);
    }

    /**
     * Gets the current log level configuration.
     * 
     * @returns {string} Current log level
     * @example
     * const currentLevel = logger.getLevel();
     * console.log(`Logging at level: ${currentLevel}`);
     */
    getLevel() {
        return this.level;
    }

    /**
     * Sets a new log level dynamically.
     * Useful for runtime log level adjustments.
     * 
     * @param {string} newLevel - New log level to set
     * @returns {boolean} True if level was set successfully, false otherwise
     * @example
     * const success = logger.setLevel('debug');
     * if (success) {
     *     logger.debug('Debug logging enabled');
     * }
     */
    setLevel(newLevel) {
        if (LOG_LEVEL_NAMES.includes(newLevel.toLowerCase())) {
            this.level = newLevel.toLowerCase();
            this.numericLevel = LOG_LEVELS[this.level];
            return true;
        }
        return false;
    }

    /**
     * Creates a child logger with additional context that will be included
     * in all log messages. Useful for request tracing and contextual logging.
     * 
     * @param {Object} context - Additional context to include in all logs
     * @returns {Object} Child logger with bound context
     * @example
     * const requestLogger = logger.child({ requestId: 'abc123' });
     * requestLogger.info('Processing request'); // Will include requestId in output
     */
    child(context) {
        const parentLogger = this;
        
        return {
            info: (message, ...meta) => parentLogger.info(message, context, ...meta),
            warn: (message, ...meta) => parentLogger.warn(message, context, ...meta),
            error: (message, ...meta) => parentLogger.error(message, context, ...meta),
            debug: (message, ...meta) => parentLogger.debug(message, context, ...meta),
            getLevel: () => parentLogger.getLevel(),
            setLevel: (level) => parentLogger.setLevel(level)
        };
    }

    /**
     * Logs system information and configuration details.
     * Useful for startup logging and debugging configuration issues.
     * 
     * @example
     * logger.logSystemInfo();
     * // Outputs system details, log level, environment, etc.
     */
    logSystemInfo() {
        this.info('Logger initialized', {
            logLevel: this.level,
            environment: this.environment,
            colorized: this.shouldColorize,
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        });
    }
}

// Export the Logger class and utility functions
module.exports = {
    Logger,
    getLogLevel,
    LOG_LEVELS,
    DEFAULT_LOG_LEVEL
};