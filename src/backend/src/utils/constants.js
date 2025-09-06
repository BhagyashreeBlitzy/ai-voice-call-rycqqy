/**
 * Central Constants Module for Node.js Tutorial Application
 * 
 * This module defines application-wide constants, enumerations, and static values
 * for the Node.js tutorial application. It provides HTTP status codes, content types,
 * route definitions, environment constants, server defaults, error messages, and
 * application metadata to ensure consistency across the application by centralizing
 * frequently used values and eliminating magic strings and numbers throughout the codebase.
 * 
 * Features:
 * - HTTP Status Code Standardization (200, 404, 405, 500, etc.)
 * - Content-Type Header Management for plain text and JSON responses
 * - Route Path Definitions for '/hello' endpoint and health check endpoints
 * - Environment Configuration Constants (development, production, test)
 * - Express.js Framework Integration Constants with security settings
 * - Error Messages for consistent error handling
 * - Application Metadata for logging and monitoring
 * - Security Constants for middleware configuration
 * - Logging Levels for structured logging
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// =============================================================================
// APPLICATION GLOBALS
// =============================================================================

/**
 * Application name identifier used across the system for logging and monitoring
 * @type {string}
 */
const APPLICATION_NAME = 'nodejs-tutorial';

/**
 * Current application version following semantic versioning
 * @type {string}
 */
const APPLICATION_VERSION = '1.0.0';

/**
 * Default request timeout in milliseconds (30 seconds)
 * Used for HTTP client requests and server request timeouts
 * @type {number}
 */
const DEFAULT_REQUEST_TIMEOUT = 30000;

/**
 * Maximum request body size limit for Express.js body parser
 * Prevents large payload attacks and ensures memory efficiency
 * @type {string}
 */
const MAX_REQUEST_SIZE = '1mb';

// =============================================================================
// HTTP STATUS CODES
// =============================================================================

/**
 * HTTP status code constants for standardized response status handling
 * across controllers and middleware. Follows RFC 7231 HTTP/1.1 specification.
 */
const HTTP_STATUS = {
    /**
     * 200 OK - Request successful
     * @type {number}
     */
    OK: 200,

    /**
     * 400 Bad Request - Client error, malformed request syntax
     * @type {number}
     */
    BAD_REQUEST: 400,

    /**
     * 404 Not Found - Requested resource not found
     * @type {number}
     */
    NOT_FOUND: 404,

    /**
     * 405 Method Not Allowed - HTTP method not supported for endpoint
     * @type {number}
     */
    METHOD_NOT_ALLOWED: 405,

    /**
     * 500 Internal Server Error - Generic server error
     * @type {number}
     */
    INTERNAL_SERVER_ERROR: 500,

    /**
     * 503 Service Unavailable - Server temporarily unable to handle requests
     * @type {number}
     */
    SERVICE_UNAVAILABLE: 503
};

// =============================================================================
// CONTENT TYPES
// =============================================================================

/**
 * Content-Type header constants for proper HTTP response formatting
 * in controllers. Ensures consistent MIME type specification.
 */
const CONTENT_TYPES = {
    /**
     * Plain text content type for 'Hello world' responses
     * @type {string}
     */
    TEXT_PLAIN: 'text/plain; charset=utf-8',

    /**
     * JSON content type for structured data responses and health checks
     * @type {string}
     */
    APPLICATION_JSON: 'application/json; charset=utf-8',

    /**
     * HTML content type for web page responses
     * @type {string}
     */
    TEXT_HTML: 'text/html; charset=utf-8'
};

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

/**
 * Route path constants for consistent endpoint path handling
 * across routers and controllers. Centralizes all URL path definitions.
 */
const ROUTES = {
    /**
     * Hello endpoint path - main tutorial endpoint
     * @type {string}
     */
    HELLO: '/hello',

    /**
     * General health check endpoint
     * @type {string}
     */
    HEALTH: '/health',

    /**
     * Kubernetes readiness probe endpoint
     * @type {string}
     */
    READINESS: '/readyz',

    /**
     * Kubernetes liveness probe endpoint
     * @type {string}
     */
    LIVENESS: '/livez'
};

// =============================================================================
// ENVIRONMENT CONSTANTS
// =============================================================================

/**
 * Environment constants for NODE_ENV validation and environment-specific
 * configuration. Supports standard Node.js environment patterns.
 */
const ENVIRONMENTS = {
    /**
     * Development environment - local development with debug features
     * @type {string}
     */
    DEVELOPMENT: 'development',

    /**
     * Production environment - optimized for performance and security
     * @type {string}
     */
    PRODUCTION: 'production',

    /**
     * Test environment - for automated testing with test configurations
     * @type {string}
     */
    TEST: 'test'
};

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

/**
 * Server default configuration values used by config management
 * and server initialization. Compatible with Express.js 5.1.0 and Node.js 22.x.
 */
const SERVER_DEFAULTS = {
    /**
     * Default HTTP server port
     * @type {number}
     */
    PORT: 3000,

    /**
     * Default server bind address - localhost for development security
     * @type {string}
     */
    HOST: 'localhost',

    /**
     * Server request timeout in milliseconds
     * @type {number}
     */
    TIMEOUT: 30000,

    /**
     * Enable HTTP keep-alive connections for better performance
     * @type {boolean}
     */
    KEEP_ALIVE: true,

    /**
     * Maximum number of pending connections in the listen queue
     * @type {number}
     */
    BACKLOG: 511
};

// =============================================================================
// ERROR MESSAGES
// =============================================================================

/**
 * Standardized error messages for consistent error handling
 * across controllers and middleware. Provides user-friendly error descriptions.
 */
const ERROR_MESSAGES = {
    /**
     * 404 error message for route not found
     * @type {string}
     */
    ROUTE_NOT_FOUND: 'The requested route was not found on this server',

    /**
     * 405 error message for unsupported HTTP methods
     * @type {string}
     */
    METHOD_NOT_ALLOWED: 'The HTTP method is not allowed for this endpoint',

    /**
     * 500 error message for internal server errors
     * @type {string}
     */
    INTERNAL_ERROR: 'An internal server error occurred while processing your request',

    /**
     * 503 error message for service unavailability
     * @type {string}
     */
    SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later',

    /**
     * Security violation error message
     * @type {string}
     */
    SECURITY_VIOLATION: 'A security violation was detected in your request',

    /**
     * Rate limit exceeded error message
     * @type {string}
     */
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down and try again later'
};

// =============================================================================
// APPLICATION METADATA
// =============================================================================

/**
 * Application metadata constants for logging, monitoring, and health check responses.
 * Used by observability systems and application introspection.
 */
const APPLICATION_METADATA = {
    /**
     * Application name for metadata responses
     * @type {string}
     */
    NAME: APPLICATION_NAME,

    /**
     * Application version for metadata responses
     * @type {string}
     */
    VERSION: APPLICATION_VERSION,

    /**
     * Application description for documentation and health checks
     * @type {string}
     */
    DESCRIPTION: 'Node.js tutorial application demonstrating basic HTTP server with Express.js 5.1.0',

    /**
     * Application author information
     * @type {string}
     */
    AUTHOR: 'Node.js Tutorial Team'
};

// =============================================================================
// HTTP METHODS
// =============================================================================

/**
 * HTTP method constants for request validation and routing
 * in controllers and middleware. Supports standard HTTP/1.1 methods.
 */
const HTTP_METHODS = {
    /**
     * GET method for data retrieval
     * @type {string}
     */
    GET: 'GET',

    /**
     * POST method for data creation
     * @type {string}
     */
    POST: 'POST',

    /**
     * PUT method for data update/replacement
     * @type {string}
     */
    PUT: 'PUT',

    /**
     * DELETE method for data removal
     * @type {string}
     */
    DELETE: 'DELETE',

    /**
     * OPTIONS method for CORS preflight requests
     * @type {string}
     */
    OPTIONS: 'OPTIONS',

    /**
     * HEAD method for header-only responses
     * @type {string}
     */
    HEAD: 'HEAD'
};

// =============================================================================
// SECURITY CONSTANTS
// =============================================================================

/**
 * Security-related constants for middleware configuration and request validation.
 * Implements security best practices for Express.js applications.
 */
const SECURITY_CONSTANTS = {
    /**
     * Maximum requests per window for rate limiting
     * @type {number}
     */
    MAX_REQUEST_RATE: 100,

    /**
     * Rate limiting window duration in milliseconds (15 minutes)
     * @type {number}
     */
    RATE_WINDOW_MS: 15 * 60 * 1000,

    /**
     * Maximum HTTP header size in bytes to prevent header-based attacks
     * @type {number}
     */
    MAX_HEADER_SIZE: 8192,

    /**
     * List of trusted proxy IP addresses for X-Forwarded-* headers
     * Empty array means trust no proxies (development default)
     * @type {Array<string>}
     */
    TRUSTED_PROXIES: []
};

// =============================================================================
// LOGGING LEVELS
// =============================================================================

/**
 * Logging level constants for consistent log level management
 * across the application. Follows standard logging severity levels.
 */
const LOGGING_LEVELS = {
    /**
     * Error level - for error conditions that need immediate attention
     * @type {string}
     */
    ERROR: 'error',

    /**
     * Warning level - for potentially harmful situations
     * @type {string}
     */
    WARN: 'warn',

    /**
     * Info level - for informational messages highlighting application progress
     * @type {string}
     */
    INFO: 'info',

    /**
     * Debug level - for fine-grained informational events useful for debugging
     * @type {string}
     */
    DEBUG: 'debug'
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Export all constant objects for use throughout the application
    HTTP_STATUS,
    CONTENT_TYPES,
    ROUTES,
    ENVIRONMENTS,
    SERVER_DEFAULTS,
    ERROR_MESSAGES,
    APPLICATION_METADATA,
    HTTP_METHODS,
    SECURITY_CONSTANTS,
    LOGGING_LEVELS
};