/**
 * Comprehensive Logging Utility for Node.js Tutorial Application
 * 
 * This utility provides structured, environment-aware logging capabilities for the Node.js tutorial 
 * application. It implements multiple log levels (error, warn, info, debug) with console-based output, 
 * HTTP request/response logging, performance timing, and request correlation tracking. The implementation 
 * integrates seamlessly with Express.js 5.1.0 middleware patterns while maintaining educational simplicity 
 * and production-ready logging patterns that demonstrate enterprise-grade observability practices.
 * 
 * Key Features:
 * - Environment-aware structured logging with configurable output formatting
 * - Multi-level logging hierarchy with dynamic log level filtering (error, warn, info, debug)
 * - HTTP request/response logging with performance metrics and correlation tracking
 * - High-resolution performance timing using Node.js Performance API for request duration measurement
 * - Request-scoped logger instances with correlation IDs for distributed system debugging
 * - Console-based output optimized for development environments with production-ready patterns
 * - Comprehensive error context preservation with stack trace handling and production-safe disclosure
 * - Memory-efficient operation with automatic cleanup to prevent memory leaks in long-running applications
 * - Educational design prioritizing code clarity while demonstrating production logging architectures
 * 
 * Architecture:
 * - Event-driven logging with lazy initialization and performance-optimized caching
 * - Configuration integration using environment-specific settings from config.js
 * - Express.js middleware integration for automatic request lifecycle logging
 * - Node.js 22.x LTS compatibility with enhanced performance optimizations
 * - Production-ready error handling with graceful degradation for logging failures
 * 
 * Compatible with:
 * - Express.js 5.1.0 with automatic promise error handling and enhanced async/await support
 * - Node.js 22.11.0 LTS with Active LTS support, improved performance, and security enhancements
 * - Development, production, and test environments with environment-specific configuration
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Core Node.js logging patterns, HTTP request tracing, and observability fundamentals
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Node.js built-in util module for object inspection and formatting in log entries
const util = require('util'); // Node.js Built-in

// Node.js Performance API for high-resolution timing measurement in HTTP request logging
const { performance } = require('perf_hooks'); // Node.js Built-in

// Node.js process module for process information, stdout/stderr access, and environment variables
const process = require('process'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import configuration factory to access environment-specific logging settings including level, format, and output configuration
const { getConfig } = require('./config.js');

// Import logging level constants for consistent log level management and validation across the application
const { 
    LOGGING_LEVELS 
} = require('./constants.js');

// Import application metadata constants for including application context in log entries
const { 
    APPLICATION_METADATA 
} = require('./constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached logging configuration from environment-specific settings
 * Prevents repeated configuration loading and improves performance
 * @type {Object|null}
 */
let LOGGER_CONFIG = null;

/**
 * Numeric log level mapping for filtering - lower numbers have higher priority
 * Used for efficient log level threshold comparison and filtering decisions
 * @type {Object}
 */
const LOG_LEVEL_NUMERIC = { 
    error: 0, 
    warn: 1, 
    info: 2, 
    debug: 3 
};

/**
 * Current numeric log level threshold for output filtering
 * Only messages at or below this threshold will be output to console
 * @type {number}
 */
let CURRENT_LOG_LEVEL = 2; // Default to 'info' level

/**
 * Active performance timers for request duration measurement
 * Uses Map for efficient O(1) timer lookup and cleanup operations
 * @type {Map<string, number>}
 */
const TIMERS = new Map();

/**
 * Request-scoped logger instances with correlation IDs
 * Enables request tracking across middleware and route handlers
 * @type {Map<string, Object>}
 */
const REQUEST_LOGGERS = new Map();

// =============================================================================
// CORE LOGGING INITIALIZATION
// =============================================================================

/**
 * Initializes the logging system by loading configuration and setting up log level filtering.
 * This function loads environment-specific logging configuration, maps the current log level 
 * to numeric values for efficient filtering, validates configuration against logging level 
 * constants, and initializes tracking structures for performance measurement and request correlation.
 * 
 * The initialization process includes:
 * - Configuration loading with error handling and fallback to default console logging
 * - Log level validation against LOGGING_LEVELS constants with warning for invalid levels
 * - Performance timer Map initialization for HTTP request duration tracking
 * - Request logger Map setup for correlation ID-based request tracking
 * - Console output formatting configuration based on environment settings
 * 
 * This function implements graceful degradation - if configuration loading fails, 
 * it continues operation with basic console logging to ensure application startup succeeds.
 * 
 * @returns {void} No return value - initializes global logging state and configuration
 */
function initializeLogger() {
    try {
        // Load logging configuration using getConfig() and cache in LOGGER_CONFIG for performance
        const config = getConfig();
        LOGGER_CONFIG = config.logging || {};
        
        // Map current log level string to numeric value for efficient filtering comparisons
        const currentLevel = LOGGER_CONFIG.level || LOGGING_LEVELS.INFO;
        
        // Validate current log level against LOGGING_LEVELS constants and set numeric threshold
        if (LOG_LEVEL_NUMERIC.hasOwnProperty(currentLevel)) {
            CURRENT_LOG_LEVEL = LOG_LEVEL_NUMERIC[currentLevel];
        } else {
            // Warn about invalid log level and fall back to 'info' level
            console.warn(`[Logger] Invalid log level: ${currentLevel}. Falling back to 'info' level.`);
            CURRENT_LOG_LEVEL = LOG_LEVEL_NUMERIC[LOGGING_LEVELS.INFO];
        }
        
        // Initialize performance timer tracking Map for HTTP request duration measurement
        // Clear any existing timers to ensure clean state
        TIMERS.clear();
        
        // Initialize request logger tracking Map for correlation ID-based request tracking
        // Clear any existing request loggers to prevent memory leaks
        REQUEST_LOGGERS.clear();
        
        // Log logger initialization completion with current configuration settings
        const initMessage = `Logger initialized - Level: ${currentLevel} (${CURRENT_LOG_LEVEL}), ` +
                          `Format: ${LOGGER_CONFIG.format || 'console'}, ` +
                          `Colorize: ${LOGGER_CONFIG.colorize !== false}`;
        
        // Use direct console output during initialization to avoid circular initialization
        console.log(`[${formatTimestamp()}] [INFO] [${APPLICATION_METADATA.NAME}] ${initMessage}`);
        
    } catch (error) {
        // Handle initialization errors gracefully - continue with basic console logging
        console.error(`[Logger] Failed to initialize logger: ${error.message}`);
        console.error('[Logger] Continuing with basic console logging as fallback');
        
        // Set safe fallback values for continued operation
        LOGGER_CONFIG = { 
            level: LOGGING_LEVELS.INFO,
            format: 'console',
            colorize: true,
            timestamp: true 
        };
        CURRENT_LOG_LEVEL = LOG_LEVEL_NUMERIC[LOGGING_LEVELS.INFO];
        
        // Ensure Maps are initialized even in error case
        TIMERS.clear();
        REQUEST_LOGGERS.clear();
    }
}

// =============================================================================
// LOG LEVEL FILTERING AND UTILITIES
// =============================================================================

/**
 * Determines if a message should be logged based on current log level configuration.
 * This function compares the input log level against the current log level threshold 
 * using numeric comparison for performance efficiency. Messages are logged if their 
 * severity level is at or above the current threshold (lower numeric values indicate higher severity).
 * 
 * The function provides:
 * - Efficient numeric comparison instead of string comparison for performance
 * - Proper handling of invalid log levels with graceful fallback behavior
 * - Support for dynamic log level changes during runtime operation
 * - Consistent log level hierarchy enforcement across all logging methods
 * 
 * @param {string} level - Log level string (error, warn, info, debug) to check against current threshold
 * @returns {boolean} True if message should be logged based on current log level threshold, false otherwise
 */
function shouldLog(level) {
    // Convert input level string to numeric value using LOG_LEVEL_NUMERIC mapping
    const inputLevelNumeric = LOG_LEVEL_NUMERIC[level];
    
    // Return false for undefined or invalid log levels to prevent logging invalid entries
    if (inputLevelNumeric === undefined) {
        return false;
    }
    
    // Compare input level numeric value against CURRENT_LOG_LEVEL threshold
    // Return true if input level is at or below current threshold (higher or equal priority)
    return inputLevelNumeric <= CURRENT_LOG_LEVEL;
}

/**
 * Formats current timestamp according to logging configuration and environment settings.
 * This function generates timestamps for log entries using either ISO 8601 format for 
 * production environments or human-readable format for development environments. The 
 * formatting choice is determined by the logging configuration and current environment settings.
 * 
 * Timestamp formatting features:
 * - ISO 8601 format for production environments with timezone information
 * - Human-readable format for development environments with local time display
 * - Consistent timestamp precision across all log entries for correlation
 * - Timezone awareness for distributed system debugging and log aggregation
 * 
 * @returns {string} Formatted timestamp string ready for inclusion in log entries
 */
function formatTimestamp() {
    // Get current timestamp using new Date() for consistent time reference
    const now = new Date();
    
    // Check logging configuration for timestamp format preference
    const useISO = LOGGER_CONFIG?.timestamp_format === 'iso' || 
                   LOGGER_CONFIG?.format === 'json' ||
                   process.env.NODE_ENV === 'production';
    
    if (useISO) {
        // Format as ISO string for production environments and structured logging
        return now.toISOString();
    } else {
        // Format as human-readable string for development environments
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
}

/**
 * Formats a complete log entry with timestamp, level, message, and optional metadata.
 * This function creates structured log entries that include all necessary context information 
 * for effective debugging and monitoring. It handles application metadata inclusion, 
 * color coding for development environments, and proper metadata formatting using Node.js util.inspect().
 * 
 * Log entry formatting includes:
 * - Timestamp generation using formatTimestamp() for temporal context
 * - Log level formatting with optional color coding for visual distinction
 * - Application context (name, version) for log source identification
 * - Message content with proper string handling and encoding
 * - Structured metadata appendage using util.inspect() for object representation
 * - Environment-specific formatting (colorized for development, plain for production)
 * 
 * @param {string} level - Log level string (error, warn, info, debug) for entry classification
 * @param {string} message - Primary log message content describing the event or condition
 * @param {Object} [metadata={}] - Optional structured metadata object for additional context
 * @returns {string} Complete formatted log entry ready for console output
 */
function formatLogEntry(level, message, metadata = {}) {
    try {
        // Generate timestamp using formatTimestamp() for consistent temporal context
        const timestamp = formatTimestamp();
        
        // Determine color formatting based on log level and configuration
        let colorizedLevel = level.toUpperCase();
        
        // Apply color coding for development environments if colorize is enabled
        if (LOGGER_CONFIG?.colorize !== false && process.env.NODE_ENV !== 'production') {
            switch (level) {
                case LOGGING_LEVELS.ERROR:
                    colorizedLevel = `\x1b[31m${colorizedLevel}\x1b[0m`; // Red
                    break;
                case LOGGING_LEVELS.WARN:
                    colorizedLevel = `\x1b[33m${colorizedLevel}\x1b[0m`; // Yellow
                    break;
                case LOGGING_LEVELS.INFO:
                    colorizedLevel = `\x1b[36m${colorizedLevel}\x1b[0m`; // Cyan
                    break;
                case LOGGING_LEVELS.DEBUG:
                    colorizedLevel = `\x1b[35m${colorizedLevel}\x1b[0m`; // Magenta
                    break;
            }
        }
        
        // Format application metadata (name, version) if enabled in configuration
        let applicationContext = '';
        if (LOGGER_CONFIG?.include_app_metadata !== false) {
            applicationContext = `[${APPLICATION_METADATA.NAME}:${APPLICATION_METADATA.VERSION}]`;
        }
        
        // Combine timestamp, level, application context, and message into base log entry
        let logEntry = `[${timestamp}] [${colorizedLevel}]${applicationContext ? ' ' + applicationContext : ''} ${message}`;
        
        // Append structured metadata using util.inspect() if provided and not empty
        if (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) {
            // Use util.inspect() for clean object representation with proper formatting
            const metadataString = util.inspect(metadata, {
                colors: LOGGER_CONFIG?.colorize !== false && process.env.NODE_ENV !== 'production',
                depth: 3, // Limit depth to prevent excessive output
                compact: true, // Compact formatting for readability
                breakLength: 80 // Line break length for better formatting
            });
            
            logEntry += ` | ${metadataString}`;
        }
        
        // Return complete formatted log entry string ready for output
        return logEntry;
        
    } catch (error) {
        // Handle log entry formatting errors gracefully - return basic formatted entry
        const basicTimestamp = new Date().toISOString();
        return `[${basicTimestamp}] [${level.toUpperCase()}] ${message} | [LOG_FORMAT_ERROR: ${error.message}]`;
    }
}

/**
 * Writes formatted log entry to appropriate output stream (stdout or stderr).
 * This function determines the correct output stream based on log level severity 
 * and writes the formatted log entry with proper error handling. Error-level messages 
 * are written to stderr while all other levels use stdout for proper stream separation.
 * 
 * Output stream selection and writing includes:
 * - stderr for error-level messages following UNIX convention for error output
 * - stdout for warn, info, and debug messages for standard application output
 * - Graceful error handling for write failures without throwing exceptions
 * - Proper newline character inclusion for terminal formatting
 * - Optional stream flushing based on configuration requirements
 * 
 * @param {string} level - Log level string to determine appropriate output stream (stderr vs stdout)
 * @param {string} formattedEntry - Complete formatted log entry ready for stream output
 * @returns {void} No return value - writes to console output stream
 */
function writeLogEntry(level, formattedEntry) {
    try {
        // Determine output stream based on log level (stderr for errors, stdout for others)
        const outputStream = (level === LOGGING_LEVELS.ERROR) ? process.stderr : process.stdout;
        
        // Write formatted entry to appropriate stream with newline character
        outputStream.write(formattedEntry + '\n');
        
        // Flush output stream if required by configuration for immediate output
        if (LOGGER_CONFIG?.flush_immediately === true) {
            // Use process.nextTick to avoid blocking while ensuring flush completion
            process.nextTick(() => {
                if (typeof outputStream.flush === 'function') {
                    outputStream.flush();
                }
            });
        }
        
    } catch (error) {
        // Handle write errors gracefully without throwing exceptions to prevent logging failures
        // from crashing the application - fall back to basic console methods
        try {
            if (level === LOGGING_LEVELS.ERROR) {
                console.error(formattedEntry);
            } else {
                console.log(formattedEntry);
            }
        } catch (fallbackError) {
            // If even basic console methods fail, there's not much we can do
            // but we should not crash the application due to logging issues
        }
    }
}

// =============================================================================
// CORE LOGGING METHODS
// =============================================================================

/**
 * Logs error level messages with stack trace support and error context preservation.
 * This function handles error-level logging with comprehensive error object processing, 
 * including stack trace extraction, error context preservation, and production-safe 
 * error information disclosure. It supports both Error objects and string messages 
 * with optional metadata for debugging context.
 * 
 * Error logging features:
 * - Automatic Error object detection and stack trace extraction
 * - Error context preservation including error name, message, and stack trace
 * - Correlation ID inclusion if available in current request context
 * - Production-safe error information disclosure without sensitive data exposure
 * - Comprehensive error metadata for debugging and incident response
 * 
 * @param {string|Error} message - Error message string or Error object with stack trace information
 * @param {Object} [metadata={}] - Optional metadata object for additional error context and debugging information
 * @returns {void} No return value - outputs error log entry to stderr
 */
function error(message, metadata = {}) {
    // Check if logging should occur using shouldLog() for level-based filtering
    if (!shouldLog(LOGGING_LEVELS.ERROR)) {
        return;
    }
    
    try {
        let errorMessage = '';
        let errorMetadata = { ...metadata };
        
        // Extract error message and stack trace if Error object provided
        if (message instanceof Error) {
            errorMessage = message.message || 'Unknown error occurred';
            
            // Add comprehensive error context to metadata
            errorMetadata.error = {
                name: message.name || 'Error',
                message: message.message || 'Unknown error',
                stack: message.stack || 'No stack trace available',
                code: message.code || undefined,
                errno: message.errno || undefined,
                syscall: message.syscall || undefined,
                path: message.path || undefined
            };
            
            // Include error constructor name for debugging
            if (message.constructor && message.constructor.name !== 'Error') {
                errorMetadata.error.type = message.constructor.name;
            }
        } else {
            // Handle string messages
            errorMessage = String(message || 'Unspecified error');
        }
        
        // Include correlation ID if available in current context for request tracing
        if (metadata.correlationId || metadata.requestId) {
            errorMetadata.correlationId = metadata.correlationId || metadata.requestId;
        }
        
        // Add timestamp for error occurrence tracking
        errorMetadata.timestamp = new Date().toISOString();
        
        // Format complete log entry using formatLogEntry() with error context
        const formattedEntry = formatLogEntry(LOGGING_LEVELS.ERROR, errorMessage, errorMetadata);
        
        // Write log entry using writeLogEntry() to stderr for proper error stream handling
        writeLogEntry(LOGGING_LEVELS.ERROR, formattedEntry);
        
    } catch (loggingError) {
        // Handle logging errors gracefully - use basic console.error as fallback
        try {
            console.error(`[ERROR] ${message instanceof Error ? message.message : message}`);
            if (metadata && Object.keys(metadata).length > 0) {
                console.error('[ERROR] Metadata:', metadata);
            }
        } catch (fallbackError) {
            // If even console.error fails, there's nothing more we can do
        }
    }
}

/**
 * Logs warning level messages for non-critical issues and operational warnings.
 * This function handles warning-level logging for conditions that deserve attention 
 * but don't represent errors or failures. It includes contextual information for 
 * operational awareness and supports metadata for additional debugging context.
 * 
 * Warning logging features:
 * - Non-critical issue reporting for operational monitoring
 * - Contextual information inclusion for better understanding of warning conditions
 * - Metadata support for additional debugging and operational context
 * - Integration with request correlation for distributed system tracing
 * - Performance-optimized logging with level-based filtering
 * 
 * @param {string} message - Warning message describing the non-critical issue or operational condition
 * @param {Object} [metadata={}] - Optional metadata object for additional warning context
 * @returns {void} No return value - outputs warning log entry to stdout
 */
function warn(message, metadata = {}) {
    // Check if logging should occur using shouldLog() for level-based filtering
    if (!shouldLog(LOGGING_LEVELS.WARN)) {
        return;
    }
    
    try {
        let warningMetadata = { ...metadata };
        
        // Include correlation ID if available in current context
        if (metadata.correlationId || metadata.requestId) {
            warningMetadata.correlationId = metadata.correlationId || metadata.requestId;
        }
        
        // Add timestamp for warning occurrence tracking
        warningMetadata.timestamp = new Date().toISOString();
        
        // Format warning message with appropriate metadata context
        const warningMessage = String(message || 'Unspecified warning');
        
        // Format complete log entry using formatLogEntry() with warning context
        const formattedEntry = formatLogEntry(LOGGING_LEVELS.WARN, warningMessage, warningMetadata);
        
        // Write log entry using writeLogEntry() to stdout for standard warning output
        writeLogEntry(LOGGING_LEVELS.WARN, formattedEntry);
        
    } catch (loggingError) {
        // Handle logging errors gracefully - use basic console.warn as fallback
        try {
            console.warn(`[WARN] ${message}`);
            if (metadata && Object.keys(metadata).length > 0) {
                console.warn('[WARN] Metadata:', metadata);
            }
        } catch (fallbackError) {
            // If even console.warn fails, continue silently to avoid application disruption
        }
    }
}

/**
 * Logs informational messages for general application events and operational information.
 * This function handles info-level logging for normal application operations, user actions, 
 * and system events that provide operational visibility. It includes contextual metadata 
 * for monitoring and debugging while maintaining performance efficiency.
 * 
 * Info logging features:
 * - General application event logging for operational monitoring
 * - User action tracking and system event recording
 * - Operational context inclusion for monitoring and debugging assistance
 * - Request correlation support for distributed system tracing
 * - Performance-optimized output with configurable formatting
 * 
 * @param {string} message - Informational message describing the application event or operational information
 * @param {Object} [metadata={}] - Optional metadata object for additional operational context
 * @returns {void} No return value - outputs info log entry to stdout
 */
function info(message, metadata = {}) {
    // Check if logging should occur using shouldLog() for level-based filtering
    if (!shouldLog(LOGGING_LEVELS.INFO)) {
        return;
    }
    
    try {
        let infoMetadata = { ...metadata };
        
        // Include correlation ID if available in current context for request tracing
        if (metadata.correlationId || metadata.requestId) {
            infoMetadata.correlationId = metadata.correlationId || metadata.requestId;
        }
        
        // Add timestamp for event occurrence tracking
        infoMetadata.timestamp = new Date().toISOString();
        
        // Format informational message with metadata context
        const infoMessage = String(message || 'Informational message');
        
        // Format complete log entry using formatLogEntry() with info context
        const formattedEntry = formatLogEntry(LOGGING_LEVELS.INFO, infoMessage, infoMetadata);
        
        // Write log entry using writeLogEntry() to stdout for standard info output
        writeLogEntry(LOGGING_LEVELS.INFO, formattedEntry);
        
    } catch (loggingError) {
        // Handle logging errors gracefully - use basic console.log as fallback
        try {
            console.log(`[INFO] ${message}`);
            if (metadata && Object.keys(metadata).length > 0) {
                console.log('[INFO] Metadata:', metadata);
            }
        } catch (fallbackError) {
            // If even console.log fails, continue silently to avoid application disruption
        }
    }
}

/**
 * Logs debug level messages for detailed troubleshooting and development information.
 * This function handles debug-level logging for fine-grained application behavior tracking, 
 * detailed troubleshooting information, and development debugging assistance. It includes 
 * verbose metadata inspection and comprehensive context for debugging complex issues.
 * 
 * Debug logging features:
 * - Fine-grained application behavior tracking for development debugging
 * - Detailed troubleshooting information with verbose metadata inspection
 * - Comprehensive context inclusion for debugging complex application issues
 * - Performance data and execution flow tracking for optimization
 * - Development-optimized output with enhanced formatting and color coding
 * 
 * @param {string} message - Debug message describing detailed application behavior or troubleshooting information
 * @param {Object} [metadata={}] - Optional metadata object with detailed debugging context and information
 * @returns {void} No return value - outputs debug log entry to stdout
 */
function debug(message, metadata = {}) {
    // Check if logging should occur using shouldLog() for level-based filtering
    if (!shouldLog(LOGGING_LEVELS.DEBUG)) {
        return;
    }
    
    try {
        let debugMetadata = { ...metadata };
        
        // Include correlation ID if available in current context for request tracing
        if (metadata.correlationId || metadata.requestId) {
            debugMetadata.correlationId = metadata.correlationId || metadata.requestId;
        }
        
        // Add timestamp for debug event occurrence tracking
        debugMetadata.timestamp = new Date().toISOString();
        
        // Add additional debug context for troubleshooting
        debugMetadata.debug = {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            pid: process.pid
        };
        
        // Format debug message with detailed metadata inspection
        const debugMessage = String(message || 'Debug message');
        
        // Format complete log entry using formatLogEntry() with verbose debug context
        const formattedEntry = formatLogEntry(LOGGING_LEVELS.DEBUG, debugMessage, debugMetadata);
        
        // Write log entry using writeLogEntry() to stdout for debug output
        writeLogEntry(LOGGING_LEVELS.DEBUG, formattedEntry);
        
    } catch (loggingError) {
        // Handle logging errors gracefully - use basic console.debug as fallback
        try {
            if (typeof console.debug === 'function') {
                console.debug(`[DEBUG] ${message}`);
            } else {
                console.log(`[DEBUG] ${message}`);
            }
            if (metadata && Object.keys(metadata).length > 0) {
                console.log('[DEBUG] Metadata:', metadata);
            }
        } catch (fallbackError) {
            // If even console methods fail, continue silently
        }
    }
}

// =============================================================================
// HTTP REQUEST LOGGING
// =============================================================================

/**
 * Specialized logging function for HTTP request/response events with performance metrics.
 * This function provides comprehensive HTTP request logging with structured format including 
 * request details, response information, performance timing, client identification, and 
 * correlation tracking for distributed system debugging and monitoring.
 * 
 * HTTP request logging features:
 * - Comprehensive HTTP request/response context including method, path, status code, and headers
 * - Performance metrics with response time measurement and precision timing
 * - Client identification through IP address and User-Agent header extraction
 * - Correlation ID tracking for request tracing across middleware and handlers
 * - Structured logging format optimized for HTTP monitoring and analytics
 * - Response status code-based log level determination for error detection
 * 
 * @param {Object} requestData - HTTP request data object containing method, path, headers, IP, and response status
 * @param {number} responseTime - Response time in milliseconds with high precision from performance measurement
 * @param {string} correlationId - Unique correlation ID for request tracking across log entries and system components
 * @returns {void} No return value - outputs structured HTTP log entry with performance and correlation data
 */
function httpRequest(requestData, responseTime, correlationId) {
    try {
        // Extract HTTP request details (method, path, status code) for structured logging
        const method = requestData.method || 'UNKNOWN';
        const path = requestData.path || requestData.url || '/';
        const statusCode = requestData.statusCode || requestData.status || 0;
        const httpVersion = requestData.httpVersion || '1.1';
        
        // Format response time with appropriate precision and units (milliseconds)
        const formattedResponseTime = typeof responseTime === 'number' ? 
                                    responseTime.toFixed(2) + 'ms' : 
                                    'unknown';
        
        // Create structured metadata with HTTP context and performance data
        const httpMetadata = {
            http: {
                method: method,
                path: path,
                statusCode: statusCode,
                httpVersion: httpVersion,
                responseTime: formattedResponseTime,
                responseTimeMs: responseTime
            },
            correlationId: correlationId,
            timestamp: new Date().toISOString()
        };
        
        // Include client IP and user agent for operational monitoring if available
        if (requestData.clientIp || requestData.ip) {
            httpMetadata.client = {
                ip: requestData.clientIp || requestData.ip,
                userAgent: requestData.userAgent || requestData.headers?.['user-agent'] || 'unknown'
            };
        }
        
        // Include request headers if available and configured for detailed debugging
        if (requestData.headers && LOGGER_CONFIG?.include_request_headers === true) {
            // Filter out sensitive headers for security
            const filteredHeaders = { ...requestData.headers };
            delete filteredHeaders.authorization;
            delete filteredHeaders.cookie;
            delete filteredHeaders['x-api-key'];
            
            httpMetadata.headers = filteredHeaders;
        }
        
        // Include request body size if available for performance monitoring
        if (requestData.contentLength || requestData.headers?.['content-length']) {
            httpMetadata.http.contentLength = requestData.contentLength || 
                                            requestData.headers['content-length'];
        }
        
        // Determine appropriate log level based on response status code for error detection
        let logLevel = LOGGING_LEVELS.INFO; // Default for 2xx and 3xx responses
        
        if (statusCode >= 400 && statusCode < 500) {
            logLevel = LOGGING_LEVELS.WARN; // Client errors (4xx)
        } else if (statusCode >= 500) {
            logLevel = LOGGING_LEVELS.ERROR; // Server errors (5xx)
        }
        
        // Create human-readable HTTP log message with key request information
        const httpMessage = `HTTP ${method} ${path} ${statusCode} ${formattedResponseTime}`;
        
        // Check if logging should occur for the determined log level
        if (shouldLog(logLevel)) {
            // Format and write HTTP log entry with structured format for monitoring
            const formattedEntry = formatLogEntry(logLevel, httpMessage, httpMetadata);
            writeLogEntry(logLevel, formattedEntry);
        }
        
    } catch (loggingError) {
        // Handle HTTP logging errors gracefully - use basic console output as fallback
        try {
            const basicMessage = `HTTP ${requestData?.method || 'UNKNOWN'} ${requestData?.path || '/'} ` +
                               `${requestData?.statusCode || 'UNKNOWN'} ${responseTime || 'unknown'}ms`;
            console.log(`[INFO] ${basicMessage}`);
        } catch (fallbackError) {
            // If even basic logging fails, continue silently to avoid disrupting HTTP responses
        }
    }
}

// =============================================================================
// PERFORMANCE TIMING UTILITIES
// =============================================================================

/**
 * Starts a high-resolution performance timer for measuring request duration.
 * This function creates high-precision timing measurements using Node.js Performance API 
 * for accurate request processing time calculation. It stores timer start times in the 
 * TIMERS Map with the provided timer ID for later retrieval and duration calculation.
 * 
 * Performance timing features:
 * - High-resolution timing using performance.now() for microsecond precision
 * - Efficient Map-based storage with O(1) timer lookup and storage operations
 * - Timer ID conflict handling by overwriting existing timers for the same ID
 * - Debug logging for timer lifecycle tracking in development environments
 * - Memory-efficient timer storage with automatic cleanup support
 * 
 * @param {string} timerId - Unique identifier for the performance timer used for duration calculation retrieval
 * @returns {void} No return value - stores timer start time in TIMERS Map for later duration calculation
 */
function startTimer(timerId) {
    try {
        // Generate high-resolution timestamp using performance.now() for precise measurement
        const startTime = performance.now();
        
        // Store start time in TIMERS Map with provided timerId as key for O(1) retrieval
        TIMERS.set(timerId, startTime);
        
        // Log timer start event if debug logging enabled for development troubleshooting
        if (shouldLog(LOGGING_LEVELS.DEBUG)) {
            debug(`Performance timer started: ${timerId}`, {
                timerId: timerId,
                startTime: startTime,
                totalActiveTimers: TIMERS.size
            });
        }
        
    } catch (error) {
        // Handle timer start errors gracefully without disrupting application flow
        if (shouldLog(LOGGING_LEVELS.WARN)) {
            warn(`Failed to start performance timer: ${timerId}`, {
                timerId: timerId,
                error: error.message,
                errorType: error.constructor.name
            });
        }
    }
}

/**
 * Stops a performance timer and returns elapsed time in milliseconds.
 * This function completes performance timing measurement by calculating the elapsed time 
 * since timer start using high-resolution performance.now() timestamps. It removes the 
 * timer from storage to prevent memory leaks and returns precise duration measurement.
 * 
 * Performance timing completion features:
 * - High-precision elapsed time calculation using performance.now() for accurate measurement
 * - Automatic timer cleanup from TIMERS Map to prevent memory leaks in long-running applications
 * - Graceful handling of missing timer IDs without throwing errors
 * - Debug logging for timer completion and duration tracking
 * - Performance statistics for monitoring timer usage patterns
 * 
 * @param {string} timerId - Unique identifier for the performance timer to stop and calculate duration
 * @returns {number} Elapsed time in milliseconds with high precision, or 0 if timer ID not found
 */
function stopTimer(timerId) {
    try {
        // Get current high-resolution timestamp using performance.now() for precise measurement
        const endTime = performance.now();
        
        // Retrieve start time from TIMERS Map using timerId for duration calculation
        const startTime = TIMERS.get(timerId);
        
        // Return 0 if timer ID not found to handle missing timer gracefully
        if (startTime === undefined) {
            if (shouldLog(LOGGING_LEVELS.WARN)) {
                warn(`Performance timer not found: ${timerId}`, {
                    timerId: timerId,
                    availableTimers: Array.from(TIMERS.keys()),
                    totalActiveTimers: TIMERS.size
                });
            }
            return 0;
        }
        
        // Calculate elapsed time by subtracting start from current time
        const elapsedTime = endTime - startTime;
        
        // Remove timer from TIMERS Map to prevent memory leaks
        TIMERS.delete(timerId);
        
        // Log timer completion if debug logging enabled for performance monitoring
        if (shouldLog(LOGGING_LEVELS.DEBUG)) {
            debug(`Performance timer completed: ${timerId}`, {
                timerId: timerId,
                startTime: startTime,
                endTime: endTime,
                elapsedTime: elapsedTime,
                remainingActiveTimers: TIMERS.size
            });
        }
        
        // Return elapsed time in milliseconds with high precision
        return elapsedTime;
        
    } catch (error) {
        // Handle timer stop errors gracefully - return 0 and clean up if possible
        if (TIMERS.has(timerId)) {
            TIMERS.delete(timerId);
        }
        
        if (shouldLog(LOGGING_LEVELS.WARN)) {
            warn(`Failed to stop performance timer: ${timerId}`, {
                timerId: timerId,
                error: error.message,
                errorType: error.constructor.name
            });
        }
        
        return 0;
    }
}

// =============================================================================
// REQUEST-SCOPED LOGGING
// =============================================================================

/**
 * Creates a request-scoped logger instance with correlation ID for request tracking.
 * This function generates a specialized logger instance that automatically includes 
 * correlation ID and request context in all log entries. It enables request tracing 
 * across middleware and handlers for distributed system debugging and monitoring.
 * 
 * Request-scoped logging features:
 * - Automatic correlation ID inclusion in all log entries for request tracing
 * - Request context binding (method, path, IP) for comprehensive request tracking
 * - Wrapper methods that inherit all standard logging capabilities (error, warn, info, debug)
 * - Lifecycle tracking in REQUEST_LOGGERS Map for memory management
 * - Enhanced context binding for distributed system debugging
 * 
 * @param {string} correlationId - Unique correlation ID for request tracking across log entries
 * @param {Object} requestContext - Request context object containing method, path, IP, and other request details
 * @returns {Object} Request-scoped logger object with correlation ID context and enhanced logging methods
 */
function createRequestLogger(correlationId, requestContext) {
    try {
        // Create request-scoped logger object with correlation ID context
        const requestLogger = {
            correlationId: correlationId,
            context: requestContext || {},
            createdAt: new Date().toISOString()
        };
        
        // Create wrapper methods that automatically include correlation context
        requestLogger.error = (message, metadata = {}) => {
            const enhancedMetadata = {
                ...metadata,
                correlationId: correlationId,
                requestContext: requestContext
            };
            error(message, enhancedMetadata);
        };
        
        requestLogger.warn = (message, metadata = {}) => {
            const enhancedMetadata = {
                ...metadata,
                correlationId: correlationId,
                requestContext: requestContext
            };
            warn(message, enhancedMetadata);
        };
        
        requestLogger.info = (message, metadata = {}) => {
            const enhancedMetadata = {
                ...metadata,
                correlationId: correlationId,
                requestContext: requestContext
            };
            info(message, enhancedMetadata);
        };
        
        requestLogger.debug = (message, metadata = {}) => {
            const enhancedMetadata = {
                ...metadata,
                correlationId: correlationId,
                requestContext: requestContext
            };
            debug(message, enhancedMetadata);
        };
        
        // Add HTTP request logging method with automatic context inclusion
        requestLogger.httpRequest = (requestData, responseTime) => {
            const enhancedRequestData = {
                ...requestData,
                ...requestContext
            };
            httpRequest(enhancedRequestData, responseTime, correlationId);
        };
        
        // Store request logger in REQUEST_LOGGERS Map for lifecycle tracking
        REQUEST_LOGGERS.set(correlationId, requestLogger);
        
        // Log request logger creation if debug logging enabled
        if (shouldLog(LOGGING_LEVELS.DEBUG)) {
            debug(`Request logger created: ${correlationId}`, {
                correlationId: correlationId,
                requestContext: requestContext,
                totalRequestLoggers: REQUEST_LOGGERS.size
            });
        }
        
        // Return request-scoped logger with enhanced context binding
        return requestLogger;
        
    } catch (error) {
        // Handle request logger creation errors gracefully - return basic logger
        if (shouldLog(LOGGING_LEVELS.WARN)) {
            warn(`Failed to create request logger: ${correlationId}`, {
                correlationId: correlationId,
                error: error.message,
                errorType: error.constructor.name
            });
        }
        
        // Return minimal request logger for continued operation
        return {
            correlationId: correlationId,
            context: requestContext || {},
            error: (msg, meta = {}) => error(msg, { ...meta, correlationId }),
            warn: (msg, meta = {}) => warn(msg, { ...meta, correlationId }),
            info: (msg, meta = {}) => info(msg, { ...meta, correlationId }),
            debug: (msg, meta = {}) => debug(msg, { ...meta, correlationId }),
            httpRequest: (reqData, respTime) => httpRequest(reqData, respTime, correlationId)
        };
    }
}

/**
 * Removes request-scoped logger to prevent memory leaks after request completion.
 * This function performs cleanup of request-scoped logger instances by removing them 
 * from the REQUEST_LOGGERS Map and cleaning up associated resources. It prevents 
 * memory leaks in long-running applications by ensuring proper logger lifecycle management.
 * 
 * Request logger cleanup features:
 * - Automatic logger removal from REQUEST_LOGGERS Map to prevent memory leaks
 * - Associated timer cleanup for performance measurement resources
 * - Debug logging for cleanup operation tracking and monitoring
 * - Graceful handling of missing correlation IDs without errors
 * - Performance monitoring for cleanup operation efficiency
 * 
 * @param {string} correlationId - Unique correlation ID for the request logger to remove and clean up
 * @returns {void} No return value - removes logger from REQUEST_LOGGERS Map and performs resource cleanup
 */
function cleanupRequestLogger(correlationId) {
    try {
        // Remove request logger from REQUEST_LOGGERS Map using correlation ID
        const wasDeleted = REQUEST_LOGGERS.delete(correlationId);
        
        // Clean up any associated timers or resources for the correlation ID
        // Look for timers that might be associated with this request
        const correlatedTimers = [];
        for (const [timerId] of TIMERS) {
            if (timerId.includes(correlationId)) {
                correlatedTimers.push(timerId);
            }
        }
        
        // Remove correlate timers to prevent memory leaks
        correlatedTimers.forEach(timerId => {
            TIMERS.delete(timerId);
        });
        
        // Log cleanup completion if debug logging enabled for monitoring
        if (shouldLog(LOGGING_LEVELS.DEBUG) && wasDeleted) {
            debug(`Request logger cleaned up: ${correlationId}`, {
                correlationId: correlationId,
                cleanedTimers: correlatedTimers.length,
                remainingRequestLoggers: REQUEST_LOGGERS.size,
                remainingTimers: TIMERS.size
            });
        }
        
        // Handle missing correlation ID gracefully without errors
        if (!wasDeleted && shouldLog(LOGGING_LEVELS.DEBUG)) {
            debug(`Request logger cleanup - ID not found: ${correlationId}`, {
                correlationId: correlationId,
                availableLoggers: Array.from(REQUEST_LOGGERS.keys()),
                totalRequestLoggers: REQUEST_LOGGERS.size
            });
        }
        
    } catch (error) {
        // Handle cleanup errors gracefully - log warning but continue operation
        if (shouldLog(LOGGING_LEVELS.WARN)) {
            warn(`Failed to cleanup request logger: ${correlationId}`, {
                correlationId: correlationId,
                error: error.message,
                errorType: error.constructor.name
            });
        }
    }
}

// =============================================================================
// LOGGING STATISTICS AND UTILITIES
// =============================================================================

/**
 * Returns logger statistics for monitoring and operational insights.
 * This function provides comprehensive operational statistics about the logger system 
 * including active timer counts, request logger tracking, configuration status, and 
 * system health metrics for monitoring and troubleshooting purposes.
 * 
 * Logger statistics include:
 * - Active timer counts and timer ID listing for performance monitoring
 * - Request logger tracking with correlation ID enumeration
 * - Current configuration summary including log level and formatting settings
 * - System health indicators including initialization status and uptime
 * - Memory usage patterns and resource utilization for optimization
 * 
 * @returns {Object} Logger statistics object containing active timers, request loggers, configuration, and system health metrics
 */
function getLoggerStats() {
    try {
        // Count active timers in TIMERS Map for performance monitoring
        const activeTimerCount = TIMERS.size;
        const activeTimerIds = Array.from(TIMERS.keys());
        
        // Count active request loggers in REQUEST_LOGGERS Map for request tracking
        const activeRequestLoggerCount = REQUEST_LOGGERS.size;
        const activeCorrelationIds = Array.from(REQUEST_LOGGERS.keys());
        
        // Include current log level and configuration summary for operational visibility
        const currentConfig = {
            level: LOGGER_CONFIG?.level || 'unknown',
            numericLevel: CURRENT_LOG_LEVEL,
            format: LOGGER_CONFIG?.format || 'unknown',
            colorize: LOGGER_CONFIG?.colorize !== false,
            includeAppMetadata: LOGGER_CONFIG?.include_app_metadata !== false,
            requestLogging: LOGGER_CONFIG?.request_logging !== false
        };
        
        // Add logger initialization status and system health for monitoring
        const systemInfo = {
            initialized: LOGGER_CONFIG !== null,
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            pid: process.pid
        };
        
        // Create comprehensive statistics object with operational metrics
        const stats = {
            performance: {
                activeTimers: activeTimerCount,
                timerIds: activeTimerIds,
                longestRunningTimer: activeTimerCount > 0 ? Math.max(...Array.from(TIMERS.values())) : null
            },
            requestTracking: {
                activeRequestLoggers: activeRequestLoggerCount,
                correlationIds: activeCorrelationIds,
                oldestRequestLogger: null
            },
            configuration: currentConfig,
            system: systemInfo,
            statistics: {
                timestamp: new Date().toISOString(),
                totalResourcesTracked: activeTimerCount + activeRequestLoggerCount,
                memoryFootprint: {
                    timersMap: activeTimerCount,
                    requestLoggersMap: activeRequestLoggerCount,
                    estimatedBytes: (activeTimerCount + activeRequestLoggerCount) * 64 // Rough estimate
                }
            }
        };
        
        // Find oldest request logger for aging analysis if any exist
        if (activeRequestLoggerCount > 0) {
            let oldestTimestamp = null;
            let oldestCorrelationId = null;
            
            for (const [correlationId, requestLogger] of REQUEST_LOGGERS) {
                if (requestLogger.createdAt) {
                    const createdAt = new Date(requestLogger.createdAt);
                    if (!oldestTimestamp || createdAt < oldestTimestamp) {
                        oldestTimestamp = createdAt;
                        oldestCorrelationId = correlationId;
                    }
                }
            }
            
            stats.requestTracking.oldestRequestLogger = oldestCorrelationId;
            stats.requestTracking.oldestRequestAge = oldestTimestamp ? 
                Date.now() - oldestTimestamp.getTime() : null;
        }
        
        // Return comprehensive logger statistics for monitoring and debugging
        return Object.freeze(stats);
        
    } catch (error) {
        // Handle statistics generation errors gracefully - return minimal stats
        return {
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            fallback: {
                activeTimers: TIMERS.size,
                activeRequestLoggers: REQUEST_LOGGERS.size,
                configurationLoaded: LOGGER_CONFIG !== null,
                currentLogLevel: CURRENT_LOG_LEVEL
            }
        };
    }
}

/**
 * Dynamically changes the logging level for runtime log level adjustment.
 * This function provides runtime log level modification capability for debugging, 
 * troubleshooting, and operational flexibility. It validates the new log level 
 * against supported logging levels and updates the global log level threshold.
 * 
 * Dynamic log level adjustment features:
 * - Runtime log level modification without application restart
 * - Validation against LOGGING_LEVELS constants for supported level verification
 * - Automatic numeric threshold update for efficient log level filtering
 * - Change event logging with old and new level information for audit trail
 * - Backward compatibility maintenance with existing log filtering logic
 * 
 * @param {string} newLevel - New log level string (error, warn, info, debug) to set as current threshold
 * @returns {boolean} True if log level changed successfully, false if invalid level provided
 */
function setLogLevel(newLevel) {
    try {
        // Validate new log level against LOGGING_LEVELS constants for supported levels
        const validLevels = Object.values(LOGGING_LEVELS);
        if (!validLevels.includes(newLevel)) {
            if (shouldLog(LOGGING_LEVELS.WARN)) {
                warn(`Invalid log level specified: ${newLevel}`, {
                    providedLevel: newLevel,
                    validLevels: validLevels,
                    currentLevel: LOGGER_CONFIG?.level || 'unknown'
                });
            }
            return false;
        }
        
        // Store old level for change logging and audit trail
        const oldLevel = LOGGER_CONFIG?.level || 'unknown';
        const oldNumericLevel = CURRENT_LOG_LEVEL;
        
        // Convert level string to numeric value using LOG_LEVEL_NUMERIC mapping
        const newNumericLevel = LOG_LEVEL_NUMERIC[newLevel];
        
        // Update CURRENT_LOG_LEVEL global with new numeric threshold
        CURRENT_LOG_LEVEL = newNumericLevel;
        
        // Update logger configuration if available
        if (LOGGER_CONFIG) {
            LOGGER_CONFIG.level = newLevel;
        }
        
        // Log level change event with old and new levels for audit trail and monitoring
        const changeMessage = `Log level changed from '${oldLevel}' (${oldNumericLevel}) to '${newLevel}' (${newNumericLevel})`;
        
        // Use the new log level to determine if this change should be logged
        if (shouldLog(LOGGING_LEVELS.INFO)) {
            info(changeMessage, {
                oldLevel: oldLevel,
                newLevel: newLevel,
                oldNumericLevel: oldNumericLevel,
                newNumericLevel: newNumericLevel,
                timestamp: new Date().toISOString(),
                triggeredBy: 'setLogLevel'
            });
        }
        
        // Return true for successful change indication
        return true;
        
    } catch (error) {
        // Handle log level change errors gracefully - log error and return false
        if (shouldLog(LOGGING_LEVELS.ERROR)) {
            error(`Failed to change log level to: ${newLevel}`, {
                providedLevel: newLevel,
                error: error.message,
                errorType: error.constructor.name,
                currentLevel: LOGGER_CONFIG?.level || 'unknown',
                currentNumericLevel: CURRENT_LOG_LEVEL
            });
        }
        
        return false;
    }
}

// =============================================================================
// LOGGER INITIALIZATION AND EXPORTS
// =============================================================================

// Initialize the logger system automatically when the module is loaded
// This ensures the logger is ready for use as soon as the module is imported
initializeLogger();

/**
 * Main logger object providing standard logging methods for application-wide use.
 * This object exposes the core logging functionality with consistent interface
 * for error, warning, info, and debug messages, plus specialized HTTP request logging.
 * 
 * @type {Object}
 */
const logger = Object.freeze({
    // Core logging methods with automatic level filtering and formatting
    error,
    warn,
    info,
    debug,
    
    // Specialized HTTP request logging with performance metrics and correlation
    httpRequest
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Main logger object providing standard logging methods for application-wide use
    logger,
    
    // Factory function for creating request-scoped loggers with correlation tracking
    createRequestLogger,
    
    // Performance timing utility for measuring HTTP request duration
    startTimer,
    
    // Performance timing utility for completing request duration measurement
    stopTimer,
    
    // Cleanup function for preventing memory leaks in request logger tracking
    cleanupRequestLogger,
    
    // Monitoring utility function for retrieving logger operational statistics
    getLoggerStats,
    
    // Runtime utility for dynamically adjusting log level filtering
    setLogLevel
};