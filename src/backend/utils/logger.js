/**
 * Comprehensive Logging Utility Module for Node.js Tutorial Application
 * 
 * This module provides structured console-based logging capabilities for the Node.js tutorial
 * application. Implements a Logger class with configurable log levels, environment-specific
 * formatting, component-scoped logging, and educational-focused output for development
 * debugging and operational monitoring.
 * 
 * Supports Express.js 5.1.0 framework integration and Node.js v22.x LTS runtime optimization
 * with performance-efficient logging patterns and minimal external dependencies. Demonstrates
 * logging best practices suitable for educational environments while providing production-ready
 * foundations.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import log level constants for consistent level management and priority comparison
const { 
    LOG_LEVELS, 
    LOGGING 
} = require('./constants.js');

// Import logging configuration and factory function for component-specific loggers
const { 
    loggingConfig, 
    createLoggerFactory 
} = require('../config/logging.js');

// Import environment detection utilities for development-specific logging behavior
const { 
    isDevelopmentEnvironment, 
    isTestEnvironment, 
    isProductionEnvironment 
} = require('./environment.js');

/**
 * Global logger instances cache to prevent duplicate logger creation and improve performance.
 * Maintains singleton pattern for component-specific loggers with consistent configuration.
 * @type {Map<string, Logger>}
 */
const loggerInstances = new Map();

/**
 * Global log level configuration affecting all existing and future logger instances.
 * Defaults to configuration value or system default if configuration is unavailable.
 * @type {string}
 */
let globalLogLevel = loggingConfig.level || LOGGING.DEFAULT_LOG_LEVEL;

/**
 * Color support detection based on terminal capabilities and environment settings.
 * Enables ANSI color codes for development environments with TTY support.
 * @type {boolean}
 */
const colorSupport = process.stdout.isTTY && !process.env.NO_COLOR;

/**
 * Logger factory instance configured with application logging settings.
 * Used for creating component-specific loggers with consistent configuration.
 * @type {Function}
 */
const loggerFactory = createLoggerFactory(loggingConfig);

/**
 * Formats current timestamp for log entries using ISO string format with millisecond
 * precision for debugging and development purposes. Provides consistent timestamp
 * formatting across all log messages.
 * 
 * @param {Object} options - Formatting options for timestamp generation
 * @param {string} options.format - Custom timestamp format (defaults to ISO)
 * @param {string} options.timezone - Timezone for timestamp (defaults to UTC)
 * @returns {string} Formatted timestamp string in ISO format or custom format
 */
function formatTimestamp(options = {}) {
    // Get current timestamp using Date.now() for high precision
    const now = new Date();
    
    // Convert timestamp to Date object for formatting
    if (options.format && options.format !== 'iso') {
        // Apply custom format if specified in options
        try {
            return now.toLocaleString(undefined, { 
                timeZone: options.timezone || 'UTC',
                hour12: false 
            });
        } catch (error) {
            // Handle timezone considerations for consistent logging - fallback to ISO
            console.warn(`[WARN] Invalid timezone format, using ISO: ${error.message}`);
        }
    }
    
    // Apply ISO string formatting for international compatibility and sorting
    const isoTimestamp = now.toISOString();
    
    // Return formatted timestamp string ready for log message inclusion
    return isoTimestamp;
}

/**
 * Formats log level strings with appropriate padding, case normalization, and color
 * coding for consistent console output display in development environments. Ensures
 * visual distinction between different log levels.
 * 
 * @param {string} level - Log level string to format (ERROR, WARN, INFO, DEBUG)
 * @param {boolean} useColors - Whether to apply ANSI color codes for terminal output
 * @returns {string} Formatted log level string with colors and padding
 */
function formatLogLevel(level, useColors = false) {
    // Normalize log level string to uppercase for consistency
    const normalizedLevel = level.toUpperCase();
    
    // Apply appropriate padding to ensure consistent column alignment
    const paddedLevel = normalizedLevel.padEnd(5, ' ');
    
    // Return formatted level without colors if colors are disabled
    if (!useColors) {
        return paddedLevel;
    }
    
    // Add ANSI color codes based on log level if colors are enabled
    const colorCodes = {
        ERROR: '\x1b[31m', // Red for critical errors
        WARN: '\x1b[33m',  // Yellow for warnings
        INFO: '\x1b[34m',  // Blue for information
        DEBUG: '\x1b[90m'  // Gray for debug information
    };
    
    const colorCode = colorCodes[normalizedLevel] || '';
    const resetCode = '\x1b[0m'; // ANSI reset code
    
    // Include ANSI reset codes to prevent color bleeding in terminal
    return `${colorCode}${paddedLevel}${resetCode}`;
}

/**
 * Returns numeric priority value for log levels enabling level-based filtering and
 * comparison for determining whether messages should be logged. Uses LOG_LEVELS
 * constants for consistent priority determination.
 * 
 * @param {string} level - Log level string to get priority for
 * @returns {number} Numeric priority value for log level comparison
 */
function getLogLevelPriority(level) {
    // Normalize log level string to uppercase
    const normalizedLevel = level.toUpperCase();
    
    // Look up priority value from LOG_LEVELS constants
    const priority = LOG_LEVELS[normalizedLevel];
    
    // Handle invalid log levels with default error level priority
    if (priority === undefined) {
        console.warn(`[WARN] Unknown log level: ${level}, defaulting to ERROR priority`);
        return LOG_LEVELS.ERROR;
    }
    
    // Return numeric priority for level comparison
    return priority;
}

/**
 * Determines whether a log message should be output based on current log level
 * configuration and message priority for performance optimization and log filtering.
 * Compares message priority against current threshold.
 * 
 * @param {string} messageLevel - Log level of the message to check
 * @param {string} currentLevel - Currently configured log level threshold
 * @returns {boolean} True if message should be logged, false if it should be filtered
 */
function shouldLogMessage(messageLevel, currentLevel = globalLogLevel) {
    // Get priority values for both message level and current log level
    const messagePriority = getLogLevelPriority(messageLevel);
    const currentLevelPriority = getLogLevelPriority(currentLevel);
    
    // Compare message priority against current level threshold
    // Lower numeric values have higher priority (ERROR=0, WARN=1, INFO=2, DEBUG=3)
    const shouldLog = messagePriority <= currentLevelPriority;
    
    // Return true if message priority is equal or higher than threshold
    return shouldLog;
}

/**
 * Formats complete log messages with timestamp, level, component name, and message
 * content using structured format for educational clarity and debugging support.
 * Provides consistent message formatting across all logger instances.
 * 
 * @param {string} level - Log level for the message (ERROR, WARN, INFO, DEBUG)
 * @param {string} component - Component name generating the log message
 * @param {string} message - Actual log message content
 * @param {Object} metadata - Additional key-value pairs for debugging context
 * @returns {string} Complete formatted log message ready for console output
 */
function formatLogMessage(level, component, message, metadata = {}) {
    // Generate timestamp using formatTimestamp function
    const timestamp = formatTimestamp();
    
    // Format log level with padding and colors using formatLogLevel
    const formattedLevel = formatLogLevel(level, colorSupport);
    
    // Include component name with consistent bracket formatting
    const componentSection = component ? `[${component}]` : '';
    
    // Combine timestamp, level, component, and message with proper spacing
    let formattedMessage = `${formattedLevel} ${timestamp} ${componentSection} ${message}`;
    
    // Append metadata as formatted key-value pairs if provided
    if (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) {
        try {
            const metadataString = JSON.stringify(metadata);
            formattedMessage += ` ${metadataString}`;
        } catch (error) {
            // Handle metadata serialization errors gracefully
            formattedMessage += ` [metadata serialization error: ${error.message}]`;
        }
    }
    
    // Apply environment-specific formatting enhancements for development
    if (isDevelopmentEnvironment() && metadata.stack) {
        formattedMessage += `\n${metadata.stack}`;
    }
    
    // Return complete formatted log message string
    return formattedMessage;
}

/**
 * Creates a component-specific logger instance with scoped logging methods and
 * consistent configuration for use throughout the application with caching for
 * performance. Implements singleton pattern for component loggers.
 * 
 * @param {string} componentName - Name of the component for scoped logging
 * @param {Object} options - Additional configuration options for the logger
 * @returns {Logger} Logger instance with error, warn, info, debug methods and component context
 */
function createComponentLogger(componentName, options = {}) {
    // Check logger instance cache for existing logger with same component name
    if (loggerInstances.has(componentName)) {
        return loggerInstances.get(componentName);
    }
    
    // Create new Logger instance if not cached with component-specific configuration
    const loggerConfig = {
        ...loggingConfig,
        ...options,
        componentName: componentName
    };
    
    // Configure logger methods with component name scoping
    const logger = new Logger(componentName, loggerConfig);
    
    // Set up log level inheritance from global configuration
    logger.setLevel(options.level || globalLogLevel);
    
    // Cache logger instance for performance optimization on repeated access
    loggerInstances.set(componentName, logger);
    
    // Return configured logger instance ready for component use
    return logger;
}

/**
 * Primary factory function for creating or retrieving cached component-specific
 * loggers with consistent configuration and automatic component name scoping for
 * application-wide logging. Main entry point for logger creation.
 * 
 * @param {string} componentName - Name of the component requesting a logger
 * @returns {Logger} Component-scoped Logger instance with all logging methods
 */
function getLogger(componentName) {
    // Validate component name parameter for proper string format
    if (!componentName || typeof componentName !== 'string') {
        throw new Error('Component name must be a non-empty string');
    }
    
    // Check loggerInstances cache for existing logger instance
    if (loggerInstances.has(componentName)) {
        // Return cached logger if found to improve performance
        return loggerInstances.get(componentName);
    }
    
    // Create new component logger using createComponentLogger if not cached
    const logger = createComponentLogger(componentName);
    
    // Store new logger instance in cache with component name as key
    loggerInstances.set(componentName, logger);
    
    // Return logger instance ready for component use
    return logger;
}

/**
 * Direct logger creation function with custom configuration support for specialized
 * logging requirements bypassing the global configuration and caching mechanism.
 * Allows for fine-grained logger customization.
 * 
 * @param {Object} customConfig - Custom configuration object for logger creation
 * @returns {Logger} Logger instance with custom configuration applied
 */
function createLogger(customConfig = {}) {
    // Validate custom configuration object for required properties
    if (!customConfig || typeof customConfig !== 'object') {
        throw new Error('Custom configuration must be a valid object');
    }
    
    // Merge custom configuration with default logging settings
    const mergedConfig = {
        ...loggingConfig,
        ...customConfig
    };
    
    // Create new Logger instance with merged configuration
    const componentName = customConfig.componentName || 'CustomLogger';
    const logger = new Logger(componentName, mergedConfig);
    
    // Configure logger methods with custom level and format settings
    if (customConfig.level) {
        logger.setLevel(customConfig.level);
    }
    
    // Apply custom color and output settings if specified
    if (customConfig.colors !== undefined) {
        logger.colorsEnabled = Boolean(customConfig.colors);
    }
    
    // Return configured logger instance without caching
    return logger;
}

/**
 * Updates the global log level configuration affecting all existing and future
 * logger instances for runtime log level management and debugging control.
 * Provides centralized log level management.
 * 
 * @param {string} newLevel - New log level (ERROR, WARN, INFO, DEBUG)
 * @returns {boolean} True if log level was successfully updated, false if invalid level provided
 */
function setLogLevel(newLevel) {
    // Validate new log level against supported levels in LOG_LEVELS constants
    const validLevels = Object.keys(LOG_LEVELS).map(level => level.toLowerCase());
    const normalizedLevel = newLevel?.toLowerCase();
    
    if (!normalizedLevel || !validLevels.includes(normalizedLevel)) {
        console.error(`[ERROR] Invalid log level: ${newLevel}. Valid levels: ${validLevels.join(', ')}`);
        return false;
    }
    
    // Update globalLogLevel variable with new level if valid
    const previousLevel = globalLogLevel;
    globalLogLevel = normalizedLevel;
    
    // Update existing logger instances with new level configuration
    for (const [componentName, logger] of loggerInstances) {
        if (logger && typeof logger.setLevel === 'function') {
            logger.setLevel(normalizedLevel);
        }
    }
    
    // Log level change event for debugging and audit purposes
    console.info(`[INFO] Global log level changed from ${previousLevel} to ${normalizedLevel}`);
    
    // Return success status indicating whether level change was applied
    return true;
}

/**
 * Clears the logger instance cache forcing recreation of loggers with current
 * configuration for testing and runtime configuration updates. Useful for
 * development and testing scenarios.
 * 
 * @returns {void} Clears internal logger cache
 */
function clearLoggerCache() {
    // Clear loggerInstances Map to remove all cached logger instances
    const cacheSize = loggerInstances.size;
    loggerInstances.clear();
    
    // Log cache clearing operation for debugging purposes
    console.debug(`[DEBUG] Logger cache cleared, removed ${cacheSize} cached instances`);
    
    // Force re-evaluation of logger configuration on next getLogger calls
    // Next calls to getLogger will create fresh logger instances
}

/**
 * Returns array of supported log level names for configuration validation and
 * user interface display purposes in educational and debugging contexts.
 * Provides enumeration of available log levels.
 * 
 * @returns {Array<string>} Array of supported log level strings (ERROR, WARN, INFO, DEBUG)
 */
function getAvailableLogLevels() {
    // Extract log level names from LOG_LEVELS constants
    const levelNames = Object.keys(LOG_LEVELS);
    
    // Return array of level names in priority order from highest to lowest
    return levelNames.sort((a, b) => LOG_LEVELS[a] - LOG_LEVELS[b]);
}

/**
 * Main Logger class that provides structured logging capabilities with level-based
 * filtering, environment-specific formatting, and console output for educational
 * and development purposes. Implements comprehensive logging interface.
 */
class Logger {
    /**
     * Creates a new Logger instance with component name, configuration, and
     * environment-specific settings for structured logging.
     * 
     * @param {string} componentName - Name of the component using this logger
     * @param {Object} config - Logger configuration object with level, format, and output settings
     */
    constructor(componentName, config = {}) {
        // Set componentName property from parameter with validation
        if (!componentName || typeof componentName !== 'string') {
            throw new Error('Component name must be a non-empty string');
        }
        this.componentName = componentName;
        
        // Store configuration object with defaults applied for missing values
        this.config = {
            ...loggingConfig,
            ...config
        };
        
        // Initialize logLevel from config or global configuration
        this.logLevel = config.level || globalLogLevel;
        
        // Configure color support based on environment and terminal capabilities
        this.colorsEnabled = config.colors !== undefined ? config.colors : colorSupport;
        
        // Set up format options for timestamp and message formatting
        this.formatOptions = {
            timestamp: config.timestampFormat || 'iso',
            verbose: isDevelopmentEnvironment(),
            includeMetadata: config.includeMetadata !== false
        };
        
        // Validate constructor parameters and apply fallbacks for invalid inputs
        if (!this.config || typeof this.config !== 'object') {
            console.warn(`[WARN] Invalid configuration for logger ${componentName}, using defaults`);
            this.config = { ...loggingConfig };
        }
    }
    
    /**
     * Logs error-level messages with ERROR priority, always displayed unless explicitly
     * disabled, for critical errors and application failures. Highest priority logging.
     * 
     * @param {string} message - Error message to log
     * @param {Object} metadata - Additional debugging context and error details
     * @returns {void} Outputs formatted error message to console.error
     */
    error(message, metadata = {}) {
        // Check if ERROR level logging is enabled using shouldLogMessage
        if (!shouldLogMessage('ERROR', this.logLevel)) {
            return;
        }
        
        // Format complete log message with ERROR level and component name
        const formattedMessage = formatLogMessage('ERROR', this.componentName, message, metadata);
        
        // Include stack trace in metadata if error object is provided
        if (metadata.error && metadata.error.stack) {
            const errorWithStack = { ...metadata, stack: metadata.error.stack };
            const messageWithStack = formatLogMessage('ERROR', this.componentName, message, errorWithStack);
            console.error(messageWithStack);
            return;
        }
        
        // Output formatted message to console.error for proper error stream handling
        console.error(formattedMessage);
    }
    
    /**
     * Logs warning-level messages with WARN priority for non-critical issues,
     * configuration problems, and recoverable errors that need attention.
     * 
     * @param {string} message - Warning message to log
     * @param {Object} metadata - Additional context for debugging and troubleshooting
     * @returns {void} Outputs formatted warning message to console.warn
     */
    warn(message, metadata = {}) {
        // Check if WARN level logging is enabled using shouldLogMessage
        if (!shouldLogMessage('WARN', this.logLevel)) {
            return;
        }
        
        // Format complete log message with WARN level and component name
        const formattedMessage = formatLogMessage('WARN', this.componentName, message, metadata);
        
        // Output formatted message to console.warn for appropriate warning handling
        console.warn(formattedMessage);
    }
    
    /**
     * Logs informational messages with INFO priority for normal operations,
     * lifecycle events, and general application status updates.
     * 
     * @param {string} message - Information message to log
     * @param {Object} metadata - Additional operational context for monitoring
     * @returns {void} Outputs formatted info message to console.log
     */
    info(message, metadata = {}) {
        // Check if INFO level logging is enabled using shouldLogMessage
        if (!shouldLogMessage('INFO', this.logLevel)) {
            return;
        }
        
        // Format complete log message with INFO level and component name
        const formattedMessage = formatLogMessage('INFO', this.componentName, message, metadata);
        
        // Output formatted message to console.log for standard output handling
        console.log(formattedMessage);
    }
    
    /**
     * Logs debug-level messages with DEBUG priority for detailed execution flow,
     * variable states, and development troubleshooting information.
     * 
     * @param {string} message - Debug message to log
     * @param {Object} metadata - Detailed debugging context and variable states
     * @returns {void} Outputs formatted debug message to console.log
     */
    debug(message, metadata = {}) {
        // Check if DEBUG level logging is enabled using shouldLogMessage
        if (!shouldLogMessage('DEBUG', this.logLevel)) {
            return;
        }
        
        // Format complete log message with DEBUG level and component name
        const formattedMessage = formatLogMessage('DEBUG', this.componentName, message, metadata);
        
        // Output formatted message to console.log with debug-specific formatting
        console.log(formattedMessage);
    }
    
    /**
     * Generic logging method that accepts level parameter for flexible logging
     * with dynamic level determination and message routing to appropriate console methods.
     * 
     * @param {string} level - Log level for the message (ERROR, WARN, INFO, DEBUG)
     * @param {string} message - Message content to log
     * @param {Object} metadata - Additional context for the log entry
     * @returns {void} Outputs formatted message to appropriate console method
     */
    log(level, message, metadata = {}) {
        // Validate log level parameter against supported levels
        const normalizedLevel = level?.toUpperCase();
        const validLevels = Object.keys(LOG_LEVELS);
        
        if (!normalizedLevel || !validLevels.includes(normalizedLevel)) {
            // Fall back to info level if invalid level is provided
            console.warn(`[WARN] Invalid log level: ${level}, falling back to INFO`);
            this.info(message, metadata);
            return;
        }
        
        // Route to appropriate specific logging method (error, warn, info, debug)
        switch (normalizedLevel) {
            case 'ERROR':
                this.error(message, metadata);
                break;
            case 'WARN':
                this.warn(message, metadata);
                break;
            case 'INFO':
                this.info(message, metadata);
                break;
            case 'DEBUG':
                this.debug(message, metadata);
                break;
            default:
                // Apply same formatting and filtering logic as specific level methods
                this.info(message, metadata);
                break;
        }
    }
    
    /**
     * Updates the log level for this specific logger instance allowing per-component
     * log level control without affecting global settings. Provides fine-grained control.
     * 
     * @param {string} newLevel - New log level for this logger instance
     * @returns {boolean} True if level was successfully updated, false if invalid
     */
    setLevel(newLevel) {
        // Validate new log level against LOG_LEVELS constants
        const validLevels = Object.keys(LOG_LEVELS).map(level => level.toLowerCase());
        const normalizedLevel = newLevel?.toLowerCase();
        
        if (!normalizedLevel || !validLevels.includes(normalizedLevel)) {
            console.error(`[ERROR] Invalid log level for ${this.componentName}: ${newLevel}`);
            return false;
        }
        
        // Update logLevel property if valid level provided
        const previousLevel = this.logLevel;
        this.logLevel = normalizedLevel;
        
        // Log level change event for debugging and audit trail
        this.debug(`Log level changed from ${previousLevel} to ${normalizedLevel}`);
        
        // Return success status indicating whether change was applied
        return true;
    }
    
    /**
     * Returns the current log level for this logger instance for configuration
     * inspection and debugging purposes.
     * 
     * @returns {string} Current log level string (ERROR, WARN, INFO, DEBUG)
     */
    getLevel() {
        // Return current logLevel property value
        return this.logLevel;
    }
    
    /**
     * Checks if a specific log level is enabled for this logger instance to optimize
     * performance by avoiding expensive log message construction when not needed.
     * 
     * @param {string} level - Log level to check (ERROR, WARN, INFO, DEBUG)
     * @returns {boolean} True if specified level is enabled, false otherwise
     */
    isLevelEnabled(level) {
        // Use shouldLogMessage function to check if level is enabled
        const isEnabled = shouldLogMessage(level, this.logLevel);
        
        // Return boolean result for level enablement status
        return isEnabled;
    }
}

// Export main functions and classes for application use
module.exports = {
    // Primary factory function for creating or retrieving cached component-specific loggers
    getLogger,
    
    // Direct logger creation function with custom configuration support
    createLogger,
    
    // Logger class for direct instantiation with custom configuration
    Logger,
    
    // Global log level management function for runtime configuration updates
    setLogLevel,
    
    // Cache management utility for clearing logger instances and forcing reconfiguration
    clearLoggerCache,
    
    // Utility function for retrieving supported log level names for configuration validation
    getAvailableLogLevels
};