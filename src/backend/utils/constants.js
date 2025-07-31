/**
 * Central Constants Module for Node.js Tutorial Application
 * 
 * This module serves as the single source of truth for all application-wide constants
 * used throughout the Node.js tutorial application. Provides consistent values across
 * all application components while supporting Express.js 5.1.0 framework requirements
 * and Node.js v22.x LTS runtime optimizations.
 * 
 * Designed for educational clarity and maintainability with comprehensive constants
 * organization for web server fundamentals.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

/**
 * Application metadata constants including name, version, and API version information.
 * These constants provide consistent application identification across all components.
 */
const APPLICATION = {
    /**
     * Application name identifier
     * @type {string}
     */
    NAME: 'nodejs-tutorial-app',

    /**
     * Current application version following semantic versioning
     * @type {string}
     */
    VERSION: '1.0.0',

    /**
     * API version for endpoint versioning and client compatibility
     * @type {string}
     */
    API_VERSION: 'v1',

    /**
     * Application description for documentation and package metadata
     * @type {string}
     */
    DESCRIPTION: 'Node.js Tutorial Application demonstrating HTTP server fundamentals with Express.js 5.1.0'
};

/**
 * Environment configuration constants including default values and valid environment names.
 * Supports flexible deployment scenarios while maintaining security best practices.
 */
const ENVIRONMENT = {
    /**
     * Default server port for development environment
     * @type {number}
     */
    DEFAULT_PORT: 3000,

    /**
     * Default host address for server binding (localhost for security)
     * @type {string}
     */
    DEFAULT_HOST: 'localhost',

    /**
     * Default Node.js environment when NODE_ENV is not specified
     * @type {string}
     */
    DEFAULT_NODE_ENV: 'development',

    /**
     * Valid environment names for configuration validation
     * @type {string[]}
     */
    VALID_ENVIRONMENTS: ['development', 'production', 'test'],

    /**
     * Development environment identifier
     * @type {string}
     */
    DEVELOPMENT: 'development',

    /**
     * Production environment identifier
     * @type {string}
     */
    PRODUCTION: 'production',

    /**
     * Test environment identifier
     * @type {string}
     */
    TEST: 'test'
};

/**
 * HTTP status code constants for consistent response status handling across all endpoints.
 * Based on RFC 7231 HTTP/1.1 specification for standardized status code usage.
 */
const HTTP_STATUS = {
    /**
     * 200 OK - Request succeeded
     * @type {number}
     */
    OK: 200,

    /**
     * 404 Not Found - Requested resource not found
     * @type {number}
     */
    NOT_FOUND: 404,

    /**
     * 500 Internal Server Error - Server encountered an error
     * @type {number}
     */
    INTERNAL_SERVER_ERROR: 500,

    /**
     * 400 Bad Request - Client sent invalid request
     * @type {number}
     */
    BAD_REQUEST: 400,

    /**
     * 405 Method Not Allowed - HTTP method not supported for endpoint
     * @type {number}
     */
    METHOD_NOT_ALLOWED: 405
};

/**
 * HTTP method constants for request method validation and routing.
 * Supports RESTful API conventions and Express.js routing patterns.
 */
const HTTP_METHODS = {
    /**
     * GET method for resource retrieval
     * @type {string}
     */
    GET: 'GET',

    /**
     * POST method for resource creation
     * @type {string}
     */
    POST: 'POST',

    /**
     * PUT method for resource update/replacement
     * @type {string}
     */
    PUT: 'PUT',

    /**
     * DELETE method for resource removal
     * @type {string}
     */
    DELETE: 'DELETE'
};

/**
 * Logging level constants for consistent log level management across application components.
 * Follows industry standard logging level hierarchy for development and production environments.
 */
const LOG_LEVELS = {
    /**
     * ERROR level (highest priority) - System failures and exceptions
     * @type {number}
     */
    ERROR: 0,

    /**
     * WARN level - Recoverable issues and deprecation warnings
     * @type {number}
     */
    WARN: 1,

    /**
     * INFO level - Normal operations and lifecycle events
     * @type {number}
     */
    INFO: 2,

    /**
     * DEBUG level (lowest priority) - Detailed execution flow information
     * @type {number}
     */
    DEBUG: 3
};

/**
 * Logging configuration constants for environment-specific log level settings.
 * Optimizes logging output for different deployment environments and development workflows.
 */
const LOGGING = {
    /**
     * Default log level for general usage
     * @type {string}
     */
    DEFAULT_LOG_LEVEL: 'info',

    /**
     * Development environment log level for detailed debugging
     * @type {string}
     */
    DEVELOPMENT_LOG_LEVEL: 'debug',

    /**
     * Production environment log level for performance optimization
     * @type {string}
     */
    PRODUCTION_LOG_LEVEL: 'warn',

    /**
     * Test environment log level for minimal output during testing
     * @type {string}
     */
    TEST_LOG_LEVEL: 'error'
};

/**
 * Application route path constants for consistent URL path definitions.
 * Supports Express.js routing and educational demonstration of HTTP endpoints.
 */
const ROUTES = {
    /**
     * Hello endpoint path for tutorial demonstration
     * @type {string}
     */
    HELLO: '/hello',

    /**
     * Health check endpoint path for monitoring and diagnostics
     * @type {string}
     */
    HEALTH: '/health'
};

/**
 * Standard response message constants for consistent API responses.
 * Provides predictable response content for tutorial application endpoints.
 */
const RESPONSES = {
    /**
     * Hello world response message for /hello endpoint
     * @type {string}
     */
    HELLO_WORLD: 'Hello world'
};

/**
 * Standardized error message constants for consistent error responses across the application.
 * Supports comprehensive error handling and user-friendly error communication.
 */
const ERROR_MESSAGES = {
    /**
     * Route not found error message for 404 responses
     * @type {string}
     */
    ROUTE_NOT_FOUND: 'The requested route was not found on this server',

    /**
     * Internal server error message for 500 responses
     * @type {string}
     */
    INTERNAL_SERVER_ERROR: 'An internal server error occurred. Please try again later.',

    /**
     * Method not allowed error message for 405 responses
     * @type {string}
     */
    METHOD_NOT_ALLOWED: 'The requested HTTP method is not allowed for this endpoint',

    /**
     * Bad request error message for 400 responses
     * @type {string}
     */
    BAD_REQUEST: 'The request could not be understood by the server due to malformed syntax'
};

/**
 * HTTP server configuration constants including timeout values, connection limits, and Express.js settings.
 * Optimized for both development environment and educational demonstration purposes.
 * Values based on Express.js 5.1.0 framework requirements and Node.js v22.x LTS performance characteristics.
 */
const SERVER = {
    /**
     * Default server timeout in milliseconds for general operations
     * @type {number}
     */
    DEFAULT_TIMEOUT: 30000,

    /**
     * Default keep-alive timeout for HTTP connections (5 seconds)
     * @type {number}
     */
    DEFAULT_KEEP_ALIVE_TIMEOUT: 5000,

    /**
     * Maximum number of concurrent connections for the server
     * @type {number}
     */
    DEFAULT_MAX_CONNECTIONS: 100,

    /**
     * Request processing timeout in milliseconds
     * @type {number}
     */
    DEFAULT_REQUEST_TIMEOUT: 10000,

    /**
     * JSON payload size limit for Express.js body parser
     * @type {string}
     */
    DEFAULT_JSON_LIMIT: '10mb',

    /**
     * URL-encoded payload size limit for Express.js body parser
     * @type {string}
     */
    DEFAULT_URLENCODED_LIMIT: '10mb',

    /**
     * Development environment timeout (extended for debugging)
     * @type {number}
     */
    DEVELOPMENT_TIMEOUT: 60000,

    /**
     * Production environment timeout (optimized for performance)
     * @type {number}
     */
    PRODUCTION_TIMEOUT: 15000
};

/**
 * Timeout constants for various server operations and lifecycle management.
 * Provides consistent timing values for server startup, shutdown, and request processing.
 */
const TIMEOUTS = {
    /**
     * Server startup timeout in milliseconds (2 seconds)
     * @type {number}
     */
    SERVER_STARTUP: 2000,

    /**
     * Server shutdown timeout in milliseconds (5 seconds)
     * @type {number}
     */
    SERVER_SHUTDOWN: 5000,

    /**
     * Request processing timeout in milliseconds
     * @type {number}
     */
    REQUEST_PROCESSING: 5000
};

// Export all constants as named exports for selective importing
module.exports = {
    APPLICATION,
    ENVIRONMENT,
    HTTP_STATUS,
    HTTP_METHODS,
    LOG_LEVELS,
    LOGGING,
    ROUTES,
    RESPONSES,
    ERROR_MESSAGES,
    SERVER,
    TIMEOUTS
};

/**
 * Export individual constants for convenience imports
 * This allows for both destructured imports and direct constant access
 * 
 * Example usage:
 * const { HTTP_STATUS, ROUTES } = require('./constants');
 * const { APPLICATION } = require('./constants');
 */
module.exports.APPLICATION = APPLICATION;
module.exports.ENVIRONMENT = ENVIRONMENT;
module.exports.HTTP_STATUS = HTTP_STATUS;
module.exports.HTTP_METHODS = HTTP_METHODS;
module.exports.LOG_LEVELS = LOG_LEVELS;
module.exports.LOGGING = LOGGING;
module.exports.ROUTES = ROUTES;
module.exports.RESPONSES = RESPONSES;
module.exports.ERROR_MESSAGES = ERROR_MESSAGES;
module.exports.SERVER = SERVER;
module.exports.TIMEOUTS = TIMEOUTS;