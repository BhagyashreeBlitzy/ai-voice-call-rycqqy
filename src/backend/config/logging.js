/**
 * Logging Configuration Module for Node.js Tutorial Application
 * 
 * Provides centralized logging settings, format specifications, and environment-specific
 * log level management for the Node.js tutorial application. This module defines console-based
 * logging configuration with structured output formatting, color coding for development
 * environments, and component-scoped logger factory functions.
 * 
 * Serves as the primary configuration interface for the application's educational logging
 * system with focus on development debugging and operational monitoring.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import log level constants and logging configuration from constants module
const { 
    LOG_LEVELS, 
    LOGGING 
} = require('../utils/constants.js');

// Import environment detection utilities for environment-specific configuration
const { 
    isDevelopmentEnvironment, 
    isTestEnvironment, 
    isProductionEnvironment 
} = require('../utils/environment.js');

/**
 * ANSI color codes for terminal output formatting and development environment visual feedback.
 * These colors provide visual distinction between different log levels in console output.
 */
const LOG_COLORS = {
    /**
     * Red color for ERROR level messages - highest visibility for critical issues
     * @type {string}
     */
    ERROR: '\x1b[31m',

    /**
     * Yellow color for WARN level messages - moderate visibility for warnings
     * @type {string}
     */
    WARN: '\x1b[33m',

    /**
     * Blue color for INFO level messages - normal visibility for information
     * @type {string}
     */
    INFO: '\x1b[34m',

    /**
     * Gray color for DEBUG level messages - subtle visibility for debug information
     * @type {string}
     */
    DEBUG: '\x1b[90m',

    /**
     * Reset ANSI code to clear color formatting and prevent color bleeding
     * @type {string}
     */
    RESET: '\x1b[0m'
};

/**
 * Default timestamp format template for consistent log entry formatting.
 * Uses ISO 8601 format for international compatibility and sorting.
 */
const DEFAULT_TIMESTAMP_FORMAT = 'YYYY-MM-DDTHH:mm:ss.sssZ';

/**
 * Default console format template for structured log message output.
 * Provides consistent formatting across all log levels and components.
 */
const DEFAULT_CONSOLE_FORMAT = '[{level}] {timestamp} - {component}: {message}';

/**
 * Current environment variable for environment-specific configuration.
 * Falls back to 'development' if NODE_ENV is not set.
 * @type {string}
 */
const currentEnvironment = process.env.NODE_ENV || 'development';

/**
 * Log level cache for performance optimization to avoid repeated environment detection.
 * Caches computed log levels to reduce overhead during high-frequency logging.
 * @type {Map<string, string>}
 */
const logLevelCache = new Map();

/**
 * Logger instances cache to prevent duplicate logger creation for the same component.
 * Maintains singleton pattern for component-specific loggers.
 * @type {Map<string, Object>}
 */
const loggerInstances = new Map();

/**
 * Creates and configures the main logging configuration object based on current environment
 * settings with appropriate log levels, formatting, and output options.
 * 
 * @param {string} environment - Target environment (development, test, production)
 * @param {Object} options - Additional configuration options
 * @param {boolean} options.forceColors - Force enable colors regardless of environment
 * @param {string} options.timestampFormat - Custom timestamp format override
 * @param {string} options.consoleFormat - Custom console format override
 * @returns {Object} Complete logging configuration object with level, format, console, and colors settings
 */
function createLoggingConfig(environment = currentEnvironment, options = {}) {
    // Determine environment-specific log level using environment detection utilities
    const logLevel = getEnvironmentLogLevel(environment);
    
    // Configure console output settings based on environment (colors for development)
    const enableColors = shouldUseColors(environment, options.forceColors);
    
    // Set up timestamp and message formatting templates for structured output
    const timestampFormat = options.timestampFormat || DEFAULT_TIMESTAMP_FORMAT;
    const consoleFormat = options.consoleFormat || DEFAULT_CONSOLE_FORMAT;
    
    // Apply environment-specific logging verbosity and detail levels
    const verboseLogging = isDevelopmentEnvironment() || isTestEnvironment();
    
    // Configure color coding based on terminal support and environment type
    const colorConfiguration = {
        enabled: enableColors,
        colors: enableColors ? LOG_COLORS : {}
    };
    
    // Create complete logging configuration object with all settings
    const loggingConfig = {
        level: logLevel,
        format: {
            timestamp: timestampFormat,
            console: consoleFormat,
            colorize: enableColors,
            verbose: verboseLogging
        },
        console: {
            enabled: true,
            level: logLevel,
            colors: colorConfiguration.enabled,
            handleExceptions: true,
            handleRejections: true
        },
        colors: colorConfiguration.enabled,
        environment: environment,
        metadata: {
            application: 'nodejs-tutorial-app',
            version: '1.0.0',
            configuredAt: new Date().toISOString()
        }
    };
    
    // Return configured logging object ready for logger initialization
    return loggingConfig;
}

/**
 * Validates logging configuration object to ensure all required properties are present
 * and valid, with appropriate error handling and default value application.
 * 
 * @param {Object} config - Logging configuration object to validate
 * @returns {Object} Validation result with isValid boolean, errors array, and sanitized config
 */
function validateLoggingConfig(config) {
    // Initialize validation result object
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedConfig: null
    };
    
    // Check if config object contains required properties (level, format, console)
    if (!config || typeof config !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Configuration must be a valid object');
        return validationResult;
    }
    
    // Validate log level is one of the supported levels (ERROR, WARN, INFO, DEBUG)
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!config.level || !validLogLevels.includes(config.level.toLowerCase())) {
        validationResult.isValid = false;
        validationResult.errors.push(`Invalid log level: ${config.level}. Must be one of: ${validLogLevels.join(', ')}`);
    }
    
    // Verify format configuration contains required template strings
    if (!config.format || typeof config.format !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Format configuration is required and must be an object');
    } else {
        if (!config.format.timestamp) {
            validationResult.warnings.push('Missing timestamp format, using default');
        }
        if (!config.format.console) {
            validationResult.warnings.push('Missing console format, using default');
        }
    }
    
    // Validate console configuration has appropriate output stream settings
    if (!config.console || typeof config.console !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Console configuration is required and must be an object');
    }
    
    // Check color configuration is boolean and appropriate for environment
    if (config.colors !== undefined && typeof config.colors !== 'boolean') {
        validationResult.warnings.push('Colors configuration should be boolean, converting to boolean');
        config.colors = Boolean(config.colors);
    }
    
    // Create sanitized configuration with validated values
    const sanitizedConfig = {
        level: config.level ? config.level.toLowerCase() : 'info',
        format: {
            timestamp: config.format?.timestamp || DEFAULT_TIMESTAMP_FORMAT,
            console: config.format?.console || DEFAULT_CONSOLE_FORMAT,
            colorize: Boolean(config.format?.colorize),
            verbose: Boolean(config.format?.verbose)
        },
        console: {
            enabled: config.console?.enabled !== false,
            level: config.console?.level || config.level || 'info',
            colors: Boolean(config.console?.colors),
            handleExceptions: Boolean(config.console?.handleExceptions),
            handleRejections: Boolean(config.console?.handleRejections)
        },
        colors: Boolean(config.colors),
        environment: config.environment || currentEnvironment,
        metadata: config.metadata || {}
    };
    
    // Compile validation errors and warnings into result object
    validationResult.sanitizedConfig = sanitizedConfig;
    
    // Return validation result with sanitized configuration object
    return validationResult;
}

/**
 * Determines appropriate log level for current environment using environment detection
 * utilities and configuration constants.
 * 
 * @param {string} nodeEnv - Node.js environment string (development, test, production)
 * @returns {string} Environment-appropriate log level string (ERROR, WARN, INFO, DEBUG)
 */
function getEnvironmentLogLevel(nodeEnv = currentEnvironment) {
    // Check cache first for performance optimization
    if (logLevelCache.has(nodeEnv)) {
        return logLevelCache.get(nodeEnv);
    }
    
    let logLevel;
    
    // Check current environment using environment detection functions
    if (isDevelopmentEnvironment()) {
        // Apply development log level (DEBUG) for development environment
        logLevel = LOGGING.DEVELOPMENT_LOG_LEVEL;
    } else if (isTestEnvironment()) {
        // Apply test log level (ERROR) for test environment to reduce output
        logLevel = LOGGING.TEST_LOG_LEVEL;
    } else if (isProductionEnvironment()) {
        // Apply production log level (INFO) for production environment
        logLevel = LOGGING.PRODUCTION_LOG_LEVEL;
    } else {
        // Fall back to default log level if environment is unrecognized
        logLevel = LOGGING.DEFAULT_LOG_LEVEL;
    }
    
    // Cache the result for future lookups
    logLevelCache.set(nodeEnv, logLevel);
    
    // Return appropriate log level string for environment
    return logLevel;
}

/**
 * Factory function that creates component-specific logger instances with consistent
 * configuration and scoped naming for the tutorial application.
 * 
 * @param {Object} loggingConfig - Main logging configuration object
 * @returns {Function} Logger factory function that creates component-specific loggers
 */
function createLoggerFactory(loggingConfig) {
    // Validate logging configuration before creating factory
    const validation = validateLoggingConfig(loggingConfig);
    if (!validation.isValid) {
        console.error('[ERROR] Invalid logging configuration:', validation.errors.join(', '));
        throw new Error('Cannot create logger factory with invalid configuration');
    }
    
    const config = validation.sanitizedConfig;
    
    // Create closure with logging configuration for consistent logger creation
    return function loggerFactory(componentName) {
        // Implement logger instance caching to prevent duplicate loggers
        if (loggerInstances.has(componentName)) {
            return loggerInstances.get(componentName);
        }
        
        // Configure component-specific logger with provided configuration
        const logger = {
            /**
             * Log error messages with ERROR level priority
             * @param {string} message - Error message to log
             * @param {Object} meta - Additional metadata for the log entry
             */
            error: (message, meta = {}) => {
                if (shouldLogLevel('error', config.level)) {
                    const formattedMessage = formatLogMessage('ERROR', componentName, message, config, meta);
                    console.error(formattedMessage);
                }
            },
            
            /**
             * Log warning messages with WARN level priority
             * @param {string} message - Warning message to log
             * @param {Object} meta - Additional metadata for the log entry
             */
            warn: (message, meta = {}) => {
                if (shouldLogLevel('warn', config.level)) {
                    const formattedMessage = formatLogMessage('WARN', componentName, message, config, meta);
                    console.warn(formattedMessage);
                }
            },
            
            /**
             * Log informational messages with INFO level priority
             * @param {string} message - Information message to log
             * @param {Object} meta - Additional metadata for the log entry
             */
            info: (message, meta = {}) => {
                if (shouldLogLevel('info', config.level)) {
                    const formattedMessage = formatLogMessage('INFO', componentName, message, config, meta);
                    console.info(formattedMessage);
                }
            },
            
            /**
             * Log debug messages with DEBUG level priority
             * @param {string} message - Debug message to log
             * @param {Object} meta - Additional metadata for the log entry
             */
            debug: (message, meta = {}) => {
                if (shouldLogLevel('debug', config.level)) {
                    const formattedMessage = formatLogMessage('DEBUG', componentName, message, config, meta);
                    console.debug(formattedMessage);
                }
            }
        };
        
        // Cache the logger instance
        loggerInstances.set(componentName, logger);
        
        // Return configured logger factory function for application use
        return logger;
    };
}

/**
 * Formats log level strings with appropriate padding, case, and color coding for
 * consistent console output display.
 * 
 * @param {string} level - Log level string to format
 * @param {boolean} useColors - Whether to apply color coding
 * @returns {string} Formatted log level string with colors and padding
 */
function formatLogLevel(level, useColors = false) {
    // Normalize log level string to uppercase for consistency
    const normalizedLevel = level.toUpperCase().padEnd(5, ' ');
    
    // Apply appropriate padding to ensure consistent column alignment
    if (!useColors) {
        return normalizedLevel;
    }
    
    // Add color coding based on log level if colors are enabled
    const colorCode = LOG_COLORS[level.toUpperCase()] || '';
    const resetCode = LOG_COLORS.RESET;
    
    // Include ANSI reset codes to prevent color bleeding
    return `${colorCode}${normalizedLevel}${resetCode}`;
}

/**
 * Generates formatted timestamp strings for log entries using configurable format
 * templates and timezone handling.
 * 
 * @param {string} format - Timestamp format template (currently supports ISO format)
 * @returns {string} Formatted timestamp string for log entry
 */
function createTimestamp(format = DEFAULT_TIMESTAMP_FORMAT) {
    // Get current timestamp using Date.now() for precision
    const now = new Date();
    
    // Apply timestamp format template (ISO string or custom format)
    // For simplicity in tutorial application, we use ISO string format
    let formattedTimestamp;
    
    if (format === DEFAULT_TIMESTAMP_FORMAT || format.includes('YYYY')) {
        // Handle timezone considerations for consistent logging
        formattedTimestamp = now.toISOString();
    } else {
        // Format timestamp according to specified template
        formattedTimestamp = now.toLocaleString();
    }
    
    // Return formatted timestamp string for log message inclusion
    return formattedTimestamp;
}

/**
 * Determines whether to enable color output based on environment type, terminal support,
 * and configuration settings.
 * 
 * @param {string} environment - Current environment (development, test, production)
 * @param {boolean} forceColors - Force enable colors regardless of other factors
 * @returns {boolean} True if colors should be enabled, false otherwise
 */
function shouldUseColors(environment = currentEnvironment, forceColors = false) {
    // Check if force colors option is explicitly set
    if (forceColors === true) {
        return true;
    }
    
    // Check environment variables that might disable colors (NO_COLOR, CI)
    if (process.env.NO_COLOR || process.env.CI) {
        return false;
    }
    
    // Detect if current environment is development for color enablement
    const isDev = isDevelopmentEnvironment();
    
    // Verify terminal supports ANSI color codes (process.stdout.isTTY)
    const isTTY = process.stdout && process.stdout.isTTY;
    
    // Return boolean decision for color output enablement
    return isDev && isTTY;
}

/**
 * Helper function to determine if a message should be logged based on current log level
 * @param {string} messageLevel - Level of the message being logged
 * @param {string} configuredLevel - Currently configured log level
 * @returns {boolean} True if message should be logged
 */
function shouldLogLevel(messageLevel, configuredLevel) {
    const messagePriority = LOG_LEVELS[messageLevel.toUpperCase()];
    const configuredPriority = LOG_LEVELS[configuredLevel.toUpperCase()];
    return messagePriority <= configuredPriority;
}

/**
 * Formats a complete log message with level, timestamp, component, and message content
 * @param {string} level - Log level for the message
 * @param {string} component - Component name generating the log
 * @param {string} message - Actual log message content
 * @param {Object} config - Logging configuration object
 * @param {Object} meta - Additional metadata for the log entry
 * @returns {string} Formatted log message ready for output
 */
function formatLogMessage(level, component, message, config, meta = {}) {
    const timestamp = createTimestamp(config.format.timestamp);
    const formattedLevel = formatLogLevel(level, config.colors);
    
    // Basic template substitution for log format
    let formattedMessage = config.format.console
        .replace('{level}', formattedLevel)
        .replace('{timestamp}', timestamp)
        .replace('{component}', component)
        .replace('{message}', message);
    
    // Add metadata if verbose logging is enabled
    if (config.format.verbose && Object.keys(meta).length > 0) {
        const metaString = JSON.stringify(meta);
        formattedMessage += ` ${metaString}`;
    }
    
    return formattedMessage;
}

// Create default logging configuration for immediate use
const loggingConfig = createLoggingConfig();

// Re-export log level constants for consistent level management across the application
const logLevels = LOG_LEVELS;

// Export all functions and configuration objects
module.exports = {
    // Main logging configuration object with all logging settings for application use
    loggingConfig,
    
    // Re-exported log level constants for consistent level management across the application
    logLevels,
    
    // Factory function for creating component-specific loggers with consistent configuration
    createLoggerFactory,
    
    // Logging configuration validation utility function for configuration integrity
    validateLoggingConfig,
    
    // Environment-specific log level determination utility function
    getEnvironmentLogLevel,
    
    // Logging configuration creation utility with environment-specific settings
    createLoggingConfig,
    
    // Utility functions for advanced logging configuration
    formatLogLevel,
    createTimestamp,
    shouldUseColors
};