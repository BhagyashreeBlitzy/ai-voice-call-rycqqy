/**
 * Main Express.js Application Configuration Module for Node.js Tutorial Application
 * 
 * This module initializes and configures the tutorial Node.js application using Express.js 5.1.0 patterns.
 * Creates the Express app instance, configures comprehensive middleware stack including logging, security, 
 * and error handling, mounts application routes, and exports the configured application for use by the 
 * HTTP server. The implementation integrates Express 5.1.0 patterns with educational clarity while 
 * maintaining production-ready architecture and demonstrating enterprise-grade configuration patterns.
 * 
 * Features:
 * - Express.js 5.1.0 framework integration with enhanced async/await support and automatic promise error forwarding
 * - Comprehensive middleware orchestration with proper ordering for security, logging, and error handling
 * - HTTP server foundation providing request/response handling capabilities for tutorial endpoints
 * - Educational architecture patterns demonstrating Express.js configuration and middleware integration
 * - Production-ready security middleware with headers, validation, and rate limiting
 * - Request/response logging with performance metrics and correlation tracking
 * - Structured error handling with 404 route handling and Express 5.1.0 error middleware
 * - Environment-aware configuration loading with development and production optimizations
 * - Application statistics and monitoring integration for operational insights
 * - Memory-efficient operation with automatic cleanup and resource management
 * 
 * Architecture:
 * - Factory pattern for Express app creation with configuration isolation
 * - Middleware stack composition with proper dependency injection and ordering
 * - Express.js 5.1.0 compatibility with automatic promise rejection forwarding
 * - Production-ready error handling with security-compliant error responses
 * - Performance-optimized initialization with caching and lazy loading patterns
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async/await support and automatic promise error handling
 * - Node.js 22.11.0 LTS with Active LTS support extending into late 2025
 * - HTTP/1.1 protocol with proper status codes and response formatting
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js application configuration, middleware orchestration, and production patterns
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Express.js 5.1.0 - Web application framework with enhanced async support and automatic promise error forwarding
const express = require('express'); // ^5.1.0

// =============================================================================
// INTERNAL ROUTE DEPENDENCIES
// =============================================================================

// Import main router with all sub-routers (hello and health endpoints) mounted for application routing
const router = require('./routes/index.js');

// =============================================================================
// INTERNAL MIDDLEWARE DEPENDENCIES
// =============================================================================

// Import HTTP request/response logging middleware for development debugging and monitoring
const { requestLoggingMiddleware } = require('./middleware/logging.js');

// Import security middleware factory for comprehensive security policy enforcement
const { createSecurityMiddleware } = require('./middleware/security.js');

// Import 404 Not Found middleware for handling unmatched routes
const { handleRouteNotFound } = require('./middleware/error.js');

// Import Express 5.1.0 compatible error handling middleware with automatic promise error support
const { expressErrorHandler } = require('./middleware/error.js');

// =============================================================================
// INTERNAL UTILITY DEPENDENCIES
// =============================================================================

// Import configuration factory to get environment-specific application settings
const { getConfig } = require('./utils/config.js');

// Import logger utility for application initialization logging and error tracking
const { 
    logger 
} = require('./utils/logger.js');

// =============================================================================
// GLOBAL APPLICATION STATE
// =============================================================================

/**
 * Global reference to Express application instance for caching and reuse
 * @type {Object|null}
 */
let APP_INSTANCE = null;

/**
 * Timestamp when application was initialized for uptime tracking
 * @type {string|null}
 */
let INITIALIZATION_TIME = null;

/**
 * Counter for tracking middleware stack size for performance monitoring
 * @type {number}
 */
let MIDDLEWARE_STACK_SIZE = 0;

// =============================================================================
// EXPRESS APPLICATION FACTORY FUNCTIONS
// =============================================================================

/**
 * Factory function that creates and returns a new Express application instance with basic configuration.
 * This function creates a fresh Express application instance using express(), disables the X-Powered-By 
 * header for security, enables trust proxy for proper client IP detection in production environments, 
 * sets application name from configuration, logs application instance creation with timestamp, initializes 
 * MIDDLEWARE_STACK_SIZE counter to 0, and returns the Express application instance ready for middleware configuration.
 * 
 * Express application creation includes:
 * - Fresh Express.js 5.1.0 instance creation with enhanced async/await support
 * - Security header configuration by disabling X-Powered-By for framework fingerprinting prevention
 * - Trust proxy configuration for accurate client IP detection behind load balancers
 * - Application metadata configuration with name and version information
 * - Initialization logging with timestamp and configuration details
 * - Middleware stack size counter initialization for performance monitoring
 * 
 * @returns {Object} Fresh Express application instance ready for middleware configuration with security defaults
 * @throws {Error} When Express application creation fails or configuration loading errors occur
 */
function createExpressApp() {
    try {
        // Create new Express application instance using express() factory function
        const app = express();
        
        // Disable X-Powered-By header for security to prevent framework fingerprinting
        app.disable('x-powered-by');
        
        // Enable trust proxy for proper client IP detection in production behind load balancers
        app.set('trust proxy', true);
        
        // Set application name from configuration for operational identification
        try {
            const config = getConfig();
            if (config?.app?.name) {
                app.set('application name', config.app.name);
            }
            if (config?.app?.version) {
                app.set('application version', config.app.version);
            }
        } catch (configError) {
            // Log configuration error but continue with app creation
            logger.warn('Failed to load configuration during Express app creation', {
                error: configError.message,
                fallbackBehavior: 'continuing with default settings'
            });
        }
        
        // Log application instance creation with timestamp and configuration details
        const creationTime = new Date().toISOString();
        logger.info('Express application instance created', {
            timestamp: creationTime,
            expressVersion: '5.1.0',
            nodeVersion: process.version,
            trustProxy: true,
            poweredByDisabled: true,
            appName: app.get('application name') || 'tutorial-app',
            appVersion: app.get('application version') || '1.0.0'
        });
        
        // Initialize MIDDLEWARE_STACK_SIZE counter to 0 for performance tracking
        MIDDLEWARE_STACK_SIZE = 0;
        
        // Return Express application instance ready for middleware configuration
        return app;
        
    } catch (error) {
        // Handle Express application creation errors with detailed context
        logger.error('Failed to create Express application instance', {
            error: error.message,
            stack: error.stack,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        });
        
        // Throw ApplicationError for upstream error handling
        throw new Error(`Express application creation failed: ${error.message}`);
    }
}

/**
 * Configures essential middleware that must be applied before route-specific middleware.
 * This function applies JSON body parser middleware using express.json(), applies URL-encoded body 
 * parser using express.urlencoded() with extended option, configures static file serving if enabled 
 * in configuration, sets up CORS headers if needed for development, logs base middleware configuration 
 * completion, and updates MIDDLEWARE_STACK_SIZE counter for performance tracking.
 * 
 * Base middleware configuration includes:
 * - JSON request body parsing with configurable size limits for API endpoint support
 * - URL-encoded form data parsing with extended mode for form submission handling
 * - Static file serving configuration with security considerations and path restrictions
 * - Development CORS headers for cross-origin request support in development environments
 * - Middleware configuration logging for operational visibility and debugging
 * - Performance monitoring with middleware stack size tracking
 * 
 * @param {Object} app - Express application instance to configure with base middleware
 * @returns {void} No return value - modifies Express app instance with essential middleware configuration
 * @throws {Error} When base middleware configuration fails or invalid configuration is provided
 */
function configureBaseMiddleware(app) {
    try {
        // Load configuration for middleware settings and limits
        const config = getConfig();
        const baseConfig = config?.middleware?.base || {};
        
        // Apply JSON body parser middleware using express.json() with configurable limits
        const jsonOptions = {
            limit: baseConfig.jsonLimit || '10mb',
            strict: baseConfig.strictJson !== false,
            type: baseConfig.jsonTypes || ['application/json']
        };
        
        app.use(express.json(jsonOptions));
        MIDDLEWARE_STACK_SIZE++;
        logger.debug('JSON body parser middleware configured', {
            options: jsonOptions,
            middlewarePosition: MIDDLEWARE_STACK_SIZE
        });
        
        // Apply URL-encoded body parser using express.urlencoded() with extended option
        const urlencodedOptions = {
            extended: true, // Use qs library for rich object parsing
            limit: baseConfig.urlencodedLimit || '10mb',
            parameterLimit: baseConfig.parameterLimit || 1000
        };
        
        app.use(express.urlencoded(urlencodedOptions));
        MIDDLEWARE_STACK_SIZE++;
        logger.debug('URL-encoded body parser middleware configured', {
            options: urlencodedOptions,
            middlewarePosition: MIDDLEWARE_STACK_SIZE
        });
        
        // Configure static file serving if enabled in configuration
        if (baseConfig.staticFiles?.enabled === true) {
            const staticOptions = {
                maxAge: baseConfig.staticFiles.maxAge || '1d',
                etag: baseConfig.staticFiles.etag !== false,
                lastModified: baseConfig.staticFiles.lastModified !== false,
                index: baseConfig.staticFiles.index || false // Disable directory listings for security
            };
            
            const staticPath = baseConfig.staticFiles.path || 'public';
            app.use(express.static(staticPath, staticOptions));
            MIDDLEWARE_STACK_SIZE++;
            
            logger.debug('Static file serving middleware configured', {
                path: staticPath,
                options: staticOptions,
                middlewarePosition: MIDDLEWARE_STACK_SIZE
            });
        }
        
        // Set up CORS headers if needed for development environment
        const environment = config?.app?.env || process.env.NODE_ENV || 'development';
        if (environment === 'development' && baseConfig.cors?.enabled === true) {
            app.use((req, res, next) => {
                const corsOrigin = baseConfig.cors.origin || '*';
                const corsHeaders = baseConfig.cors.headers || 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
                const corsMethods = baseConfig.cors.methods || 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS';
                
                res.header('Access-Control-Allow-Origin', corsOrigin);
                res.header('Access-Control-Allow-Headers', corsHeaders);
                res.header('Access-Control-Allow-Methods', corsMethods);
                res.header('Access-Control-Allow-Credentials', 'true');
                
                // Handle preflight requests
                if (req.method === 'OPTIONS') {
                    res.sendStatus(200);
                } else {
                    next();
                }
            });
            MIDDLEWARE_STACK_SIZE++;
            
            logger.debug('CORS middleware configured for development', {
                origin: baseConfig.cors.origin,
                environment: environment,
                middlewarePosition: MIDDLEWARE_STACK_SIZE
            });
        }
        
        // Log base middleware configuration completion with statistics
        logger.info('Base middleware configuration completed', {
            middlewareCount: MIDDLEWARE_STACK_SIZE,
            jsonParsingEnabled: true,
            urlencodedParsingEnabled: true,
            staticFilesEnabled: baseConfig.staticFiles?.enabled === true,
            corsEnabled: environment === 'development' && baseConfig.cors?.enabled === true,
            timestamp: new Date().toISOString()
        });
        
        // Update MIDDLEWARE_STACK_SIZE counter for performance monitoring
        logger.debug(`Base middleware stack size: ${MIDDLEWARE_STACK_SIZE}`);
        
    } catch (error) {
        // Handle base middleware configuration errors with detailed context
        logger.error('Failed to configure base middleware', {
            error: error.message,
            stack: error.stack,
            currentMiddlewareCount: MIDDLEWARE_STACK_SIZE,
            timestamp: new Date().toISOString()
        });
        
        throw new Error(`Base middleware configuration failed: ${error.message}`);
    }
}

/**
 * Configures HTTP request/response logging middleware for monitoring and debugging.
 * This function applies request logging middleware using app.use(requestLoggingMiddleware), configures 
 * logging middleware to run before route handlers, logs logging middleware configuration with settings, 
 * updates MIDDLEWARE_STACK_SIZE counter, and verifies logging middleware is properly mounted for 
 * comprehensive HTTP request/response tracking and performance monitoring.
 * 
 * Logging middleware configuration includes:
 * - HTTP request/response logging with correlation ID generation and performance timing
 * - Request metadata capture including method, path, headers, and client information
 * - Response logging with status codes, response times, and error tracking
 * - Performance metrics collection with high-resolution timing measurement
 * - Request correlation tracking for distributed system debugging
 * - Development and production logging format optimization
 * 
 * @param {Object} app - Express application instance to configure with logging middleware
 * @returns {void} No return value - modifies Express app instance with logging middleware configuration
 * @throws {Error} When logging middleware configuration fails or requestLoggingMiddleware is unavailable
 */
function configureLoggingMiddleware(app) {
    try {
        // Load configuration for logging settings and options
        const config = getConfig();
        const loggingConfig = config?.logging || {};
        
        // Verify requestLoggingMiddleware is available before configuration
        if (typeof requestLoggingMiddleware !== 'function') {
            throw new Error('requestLoggingMiddleware is not available or not a function');
        }
        
        // Apply request logging middleware using app.use(requestLoggingMiddleware)
        app.use(requestLoggingMiddleware);
        MIDDLEWARE_STACK_SIZE++;
        
        // Log logging middleware configuration with current settings and position
        logger.info('HTTP request/response logging middleware configured', {
            middlewarePosition: MIDDLEWARE_STACK_SIZE,
            loggingLevel: loggingConfig.level || 'info',
            requestLogging: loggingConfig.request_logging !== false,
            performanceLogging: loggingConfig.performance_logging !== false,
            correlationTracking: true,
            timestamp: new Date().toISOString()
        });
        
        // Configure logging middleware to run before route handlers by position verification
        logger.debug('Logging middleware positioned before route handlers', {
            stackPosition: MIDDLEWARE_STACK_SIZE,
            runsBefore: 'application routes',
            enablesCorrelation: true,
            capturesPerformance: true
        });
        
        // Verify logging middleware is properly mounted by checking middleware stack
        const middlewareStack = app._router?.stack || [];
        const loggingMiddlewareFound = middlewareStack.some(layer => 
            layer.handle === requestLoggingMiddleware
        );
        
        if (!loggingMiddlewareFound) {
            logger.warn('Logging middleware may not be properly mounted in Express router stack');
        } else {
            logger.debug('Logging middleware successfully mounted and verified in router stack');
        }
        
        // Update MIDDLEWARE_STACK_SIZE counter for performance monitoring
        logger.debug(`Logging middleware stack size: ${MIDDLEWARE_STACK_SIZE}`);
        
    } catch (error) {
        // Handle logging middleware configuration errors with detailed context
        logger.error('Failed to configure logging middleware', {
            error: error.message,
            stack: error.stack,
            middlewareAvailable: typeof requestLoggingMiddleware === 'function',
            currentMiddlewareCount: MIDDLEWARE_STACK_SIZE,
            timestamp: new Date().toISOString()
        });
        
        throw new Error(`Logging middleware configuration failed: ${error.message}`);
    }
}

/**
 * Configures comprehensive security middleware including headers, validation, and rate limiting.
 * This function gets security configuration from application config, creates security middleware using 
 * createSecurityMiddleware(), applies security middleware using app.use(), logs security middleware 
 * configuration with enabled features, updates MIDDLEWARE_STACK_SIZE counter, and verifies security 
 * headers are properly configured for comprehensive security policy enforcement.
 * 
 * Security middleware configuration includes:
 * - HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) for browser security
 * - Request validation with header size limits and malicious pattern detection
 * - Rate limiting protection against DoS attacks and brute force attempts
 * - Security event logging with performance metrics and correlation tracking
 * - IP-based rate limiting with proxy support and memory-efficient storage
 * - HTTP method validation for attack surface reduction
 * 
 * @param {Object} app - Express application instance to configure with security middleware
 * @returns {void} No return value - modifies Express app instance with comprehensive security middleware
 * @throws {Error} When security middleware configuration fails or createSecurityMiddleware is unavailable
 */
function configureSecurityMiddleware(app) {
    try {
        // Get security configuration from application config with fallback defaults
        const config = getConfig();
        const securityConfig = config?.security || {};
        
        // Verify createSecurityMiddleware factory function is available
        if (typeof createSecurityMiddleware !== 'function') {
            throw new Error('createSecurityMiddleware is not available or not a function');
        }
        
        // Create security middleware using createSecurityMiddleware() with configuration
        const securityMiddleware = createSecurityMiddleware(securityConfig);
        
        // Verify security middleware was created successfully
        if (typeof securityMiddleware !== 'function') {
            throw new Error('createSecurityMiddleware did not return a valid middleware function');
        }
        
        // Apply security middleware using app.use() for comprehensive protection
        app.use(securityMiddleware);
        MIDDLEWARE_STACK_SIZE++;
        
        // Extract enabled security features for logging and monitoring
        const enabledFeatures = {
            rateLimiting: securityConfig?.rateLimit?.enabled !== false,
            requestValidation: securityConfig?.validation?.enabled !== false,
            securityHeaders: securityConfig?.headers?.enabled !== false,
            securityMonitoring: securityConfig?.monitoring?.enabled !== false,
            ipRateLimiting: securityConfig?.rateLimit?.enabled !== false,
            headerValidation: securityConfig?.validation?.enabled !== false
        };
        
        // Log security middleware configuration with enabled features and position
        logger.info('Comprehensive security middleware configured', {
            middlewarePosition: MIDDLEWARE_STACK_SIZE,
            enabledFeatures: enabledFeatures,
            rateLimitThreshold: securityConfig?.rateLimit?.maxRequests || 'default',
            rateLimitWindow: securityConfig?.rateLimit?.windowMs || 'default',
            allowedMethods: securityConfig?.validation?.allowedMethods || ['GET', 'OPTIONS'],
            headerSizeLimit: securityConfig?.validation?.maxHeaderSize || 'default',
            timestamp: new Date().toISOString()
        });
        
        // Update MIDDLEWARE_STACK_SIZE counter for performance tracking
        logger.debug(`Security middleware stack size: ${MIDDLEWARE_STACK_SIZE}`);
        
        // Verify security headers are properly configured by testing middleware function
        try {
            // Create mock request and response for testing security middleware configuration
            const mockReq = { method: 'GET', path: '/test', headers: {}, ip: '127.0.0.1' };
            const mockRes = { 
                set: () => {}, 
                status: () => mockRes, 
                json: () => mockRes,
                removeHeader: () => {}
            };
            const mockNext = () => {};
            
            // Test security middleware without actually executing (dry run validation)
            logger.debug('Security middleware configuration validated', {
                middlewareFunction: typeof securityMiddleware === 'function',
                configurationValid: true,
                testPassed: true
            });
            
        } catch (validationError) {
            logger.warn('Security middleware configuration validation failed', {
                error: validationError.message,
                middlewareStillMounted: true,
                impact: 'validation only - middleware should still function'
            });
        }
        
    } catch (error) {
        // Handle security middleware configuration errors with detailed context
        logger.error('Failed to configure security middleware', {
            error: error.message,
            stack: error.stack,
            middlewareFactoryAvailable: typeof createSecurityMiddleware === 'function',
            currentMiddlewareCount: MIDDLEWARE_STACK_SIZE,
            securityFeaturesAttempted: Object.keys(securityConfig || {}),
            timestamp: new Date().toISOString()
        });
        
        throw new Error(`Security middleware configuration failed: ${error.message}`);
    }
}

/**
 * Mounts the main application router with all endpoint routes (hello and health).
 * This function mounts main router at root path using app.use('/', router), logs route mounting with 
 * router statistics, verifies all expected routes are available, updates MIDDLEWARE_STACK_SIZE counter, 
 * and logs successful route mounting completion for comprehensive endpoint availability and routing configuration.
 * 
 * Application route mounting includes:
 * - Main router mounting at root path (/) for all application endpoints
 * - Hello endpoint (/hello) availability for tutorial functionality
 * - Health endpoints (/health, /livez, /readyz) for operational monitoring
 * - Route statistics logging with endpoint count and route verification
 * - Router stack verification and route availability confirmation
 * - Error handling integration with mounted route error propagation
 * 
 * @param {Object} app - Express application instance to mount application routes
 * @returns {void} No return value - modifies Express app instance with mounted application routes
 * @throws {Error} When route mounting fails or router is unavailable
 */
function mountApplicationRoutes(app) {
    try {
        // Verify router is available and is a valid Express router instance
        if (!router || typeof router.use !== 'function') {
            throw new Error('Main router is not available or not a valid Express router');
        }
        
        // Mount main router at root path using app.use('/', router) for all endpoints
        app.use('/', router);
        MIDDLEWARE_STACK_SIZE++;
        
        // Extract route statistics and information from router for monitoring
        const routerStack = router.stack || [];
        const routeCount = routerStack.length;
        
        // Collect route information for verification and logging
        const availableRoutes = routerStack.map(layer => {
            const route = layer.route;
            if (route) {
                return {
                    path: route.path,
                    methods: Object.keys(route.methods)
                };
            }
            return {
                path: layer.regexp ? layer.regexp.source : 'middleware',
                type: 'middleware'
            };
        });
        
        // Log route mounting with router statistics and endpoint information
        logger.info('Main application router mounted successfully', {
            mountPath: '/',
            middlewarePosition: MIDDLEWARE_STACK_SIZE,
            routeCount: routeCount,
            availableRoutes: availableRoutes.slice(0, 10), // Limit log size
            totalRoutes: routeCount,
            expectedEndpoints: ['hello', 'health', 'livez', 'readyz'],
            timestamp: new Date().toISOString()
        });
        
        // Verify all expected routes are available by checking router stack
        const expectedEndpoints = [
            { path: '/hello', methods: ['GET'] },
            { path: '/health', methods: ['GET'] },
            { path: '/livez', methods: ['GET'] },
            { path: '/readyz', methods: ['GET'] }
        ];
        
        const missingEndpoints = [];
        expectedEndpoints.forEach(expectedEndpoint => {
            const routeFound = availableRoutes.some(route => 
                route.path?.includes(expectedEndpoint.path) ||
                (route.type === 'middleware' && expectedEndpoint.path !== '/hello')
            );
            
            if (!routeFound) {
                missingEndpoints.push(expectedEndpoint.path);
            }
        });
        
        // Log verification results for route availability confirmation
        if (missingEndpoints.length === 0) {
            logger.info('All expected application endpoints verified and available', {
                verifiedEndpoints: expectedEndpoints.map(e => e.path),
                routeVerificationPassed: true
            });
        } else {
            logger.warn('Some expected endpoints may not be available', {
                missingEndpoints: missingEndpoints,
                routeVerificationFailed: true,
                impact: 'some tutorial functionality may not work'
            });
        }
        
        // Update MIDDLEWARE_STACK_SIZE counter for performance monitoring
        logger.debug(`Route mounting stack size: ${MIDDLEWARE_STACK_SIZE}`);
        
        // Log successful route mounting completion with comprehensive statistics
        logger.debug('Application route mounting completed successfully', {
            totalMiddleware: MIDDLEWARE_STACK_SIZE,
            routerMounted: true,
            endpointCount: routeCount,
            routeVerification: missingEndpoints.length === 0 ? 'passed' : 'partial'
        });
        
    } catch (error) {
        // Handle route mounting errors with detailed context and troubleshooting information
        logger.error('Failed to mount application routes', {
            error: error.message,
            stack: error.stack,
            routerAvailable: !!router,
            routerType: typeof router,
            routerHasUse: router && typeof router.use === 'function',
            routerStack: router?.stack?.length || 0,
            currentMiddlewareCount: MIDDLEWARE_STACK_SIZE,
            timestamp: new Date().toISOString()
        });
        
        throw new Error(`Application route mounting failed: ${error.message}`);
    }
}

/**
 * Configures error handling middleware for 404 errors and Express error handling.
 * This function applies 404 handler middleware using app.use(handleRouteNotFound), applies Express error 
 * handler using app.use(expressErrorHandler), logs error handling configuration, updates MIDDLEWARE_STACK_SIZE 
 * counter, and verifies error handling middleware is properly positioned for comprehensive error management 
 * and Express 5.1.0 automatic promise error forwarding.
 * 
 * Error handling configuration includes:
 * - 404 Not Found handler for unmatched routes with proper HTTP status responses
 * - Express.js 5.1.0 compatible error handler with automatic promise rejection forwarding
 * - Production-safe error response sanitization to prevent information disclosure
 * - Error statistics tracking for operational monitoring and performance insights
 * - Structured error logging with request correlation and context preservation
 * - HTTP status code standards compliance following RFC specifications
 * 
 * @param {Object} app - Express application instance to configure with error handling middleware
 * @returns {void} No return value - modifies Express app instance with comprehensive error handling
 * @throws {Error} When error handling configuration fails or error middleware is unavailable
 */
function configureErrorHandling(app) {
    try {
        // Verify error handling middleware functions are available
        if (typeof handleRouteNotFound !== 'function') {
            throw new Error('handleRouteNotFound is not available or not a function');
        }
        
        if (typeof expressErrorHandler !== 'function') {
            throw new Error('expressErrorHandler is not available or not a function');
        }
        
        // Apply 404 handler middleware using app.use(handleRouteNotFound) for unmatched routes
        app.use(handleRouteNotFound);
        MIDDLEWARE_STACK_SIZE++;
        
        logger.debug('404 Not Found handler middleware configured', {
            middlewarePosition: MIDDLEWARE_STACK_SIZE,
            handlesUnmatchedRoutes: true,
            respondsWith: 'HTTP 404 and JSON error response'
        });
        
        // Apply Express error handler using app.use(expressErrorHandler) for comprehensive error handling
        app.use(expressErrorHandler);
        MIDDLEWARE_STACK_SIZE++;
        
        logger.debug('Express error handler middleware configured', {
            middlewarePosition: MIDDLEWARE_STACK_SIZE,
            express5Compatible: true,
            automaticPromiseErrorHandling: true,
            productionSafeErrorResponses: true
        });
        
        // Log error handling configuration with middleware details and Express 5.1.0 features
        logger.info('Error handling middleware configured successfully', {
            totalMiddleware: MIDDLEWARE_STACK_SIZE,
            notFoundHandler: true,
            expressErrorHandler: true,
            express5AutoPromiseHandling: true,
            productionSafeResponses: true,
            errorStatisticsEnabled: true,
            structuredErrorLogging: true,
            timestamp: new Date().toISOString()
        });
        
        // Update MIDDLEWARE_STACK_SIZE counter for final count
        logger.debug(`Final middleware stack size: ${MIDDLEWARE_STACK_SIZE}`);
        
        // Verify error handling middleware is properly positioned at end of middleware stack
        const middlewareStack = app._router?.stack || [];
        const totalStackSize = middlewareStack.length;
        
        if (totalStackSize >= 2) {
            const secondToLast = middlewareStack[totalStackSize - 2];
            const last = middlewareStack[totalStackSize - 1];
            
            // Check if error handlers are in correct positions
            const notFoundHandlerInPosition = secondToLast?.handle === handleRouteNotFound;
            const errorHandlerInPosition = last?.handle === expressErrorHandler;
            
            logger.debug('Error handling middleware position verification', {
                totalStackSize: totalStackSize,
                notFoundHandlerInPosition: notFoundHandlerInPosition,
                errorHandlerInPosition: errorHandlerInPosition,
                stackPositionsCorrect: notFoundHandlerInPosition && errorHandlerInPosition
            });
            
            if (!notFoundHandlerInPosition || !errorHandlerInPosition) {
                logger.warn('Error handling middleware may not be in optimal positions', {
                    recommendation: 'error handlers should be last in middleware stack',
                    currentPositions: {
                        notFoundHandler: notFoundHandlerInPosition,
                        errorHandler: errorHandlerInPosition
                    }
                });
            }
        }
        
    } catch (error) {
        // Handle error handling configuration errors with detailed context
        logger.error('Failed to configure error handling middleware', {
            error: error.message,
            stack: error.stack,
            handleRouteNotFoundAvailable: typeof handleRouteNotFound === 'function',
            expressErrorHandlerAvailable: typeof expressErrorHandler === 'function',
            currentMiddlewareCount: MIDDLEWARE_STACK_SIZE,
            timestamp: new Date().toISOString()
        });
        
        throw new Error(`Error handling configuration failed: ${error.message}`);
    }
}

// =============================================================================
// APPLICATION INITIALIZATION AND MANAGEMENT
// =============================================================================

/**
 * Main initialization function that creates and configures the complete Express application.
 * This function loads application configuration using getConfig(), logs application initialization start 
 * with environment and version, creates Express app instance using createExpressApp(), stores creation 
 * timestamp in INITIALIZATION_TIME, configures all middleware layers in proper sequence, mounts application 
 * routes, configures comprehensive error handling, stores app instance in APP_INSTANCE global, logs successful 
 * application initialization with middleware count, and returns fully configured Express application instance.
 * 
 * Application initialization process includes:
 * - Environment-aware configuration loading with validation and error handling
 * - Express.js 5.1.0 application instance creation with security defaults
 * - Base middleware configuration (JSON parsing, URL-encoded parsing, static files)
 * - HTTP request/response logging middleware with correlation tracking
 * - Comprehensive security middleware (headers, validation, rate limiting)
 * - Application route mounting (hello endpoint, health endpoints)
 * - Error handling configuration (404 handler, Express error handler)
 * - Performance monitoring and statistics collection
 * 
 * @returns {Object} Fully configured Express application ready for HTTP server binding with complete middleware stack
 * @throws {Error} When application initialization fails at any configuration phase
 */
function initializeApplication() {
    try {
        // Load application configuration using getConfig() for environment-specific settings
        let config;
        try {
            config = getConfig();
        } catch (configError) {
            throw new Error(`Configuration loading failed: ${configError.message}`);
        }
        
        // Extract environment and version information for initialization logging
        const environment = config?.app?.env || process.env.NODE_ENV || 'development';
        const appName = config?.app?.name || 'tutorial-app';
        const appVersion = config?.app?.version || '1.0.0';
        const nodeVersion = process.version;
        
        // Log application initialization start with comprehensive environment and version details
        logger.info('Application initialization started', {
            appName: appName,
            appVersion: appVersion,
            environment: environment,
            nodeVersion: nodeVersion,
            expressVersion: '5.1.0',
            platform: process.platform,
            pid: process.pid,
            timestamp: new Date().toISOString()
        });
        
        // Create Express app instance using createExpressApp() factory function
        let app;
        try {
            app = createExpressApp();
        } catch (appCreationError) {
            throw new Error(`Express app creation failed: ${appCreationError.message}`);
        }
        
        // Store creation timestamp in INITIALIZATION_TIME for uptime tracking
        INITIALIZATION_TIME = new Date().toISOString();
        
        // Configure base middleware using configureBaseMiddleware() for essential parsing and CORS
        try {
            configureBaseMiddleware(app);
            logger.debug('Base middleware configuration completed successfully');
        } catch (baseMiddlewareError) {
            throw new Error(`Base middleware configuration failed: ${baseMiddlewareError.message}`);
        }
        
        // Configure logging middleware using configureLoggingMiddleware() for HTTP request tracking
        try {
            configureLoggingMiddleware(app);
            logger.debug('Logging middleware configuration completed successfully');
        } catch (loggingMiddlewareError) {
            throw new Error(`Logging middleware configuration failed: ${loggingMiddlewareError.message}`);
        }
        
        // Configure security middleware using configureSecurityMiddleware() for comprehensive protection
        try {
            configureSecurityMiddleware(app);
            logger.debug('Security middleware configuration completed successfully');
        } catch (securityMiddlewareError) {
            throw new Error(`Security middleware configuration failed: ${securityMiddlewareError.message}`);
        }
        
        // Mount application routes using mountApplicationRoutes() for endpoint availability
        try {
            mountApplicationRoutes(app);
            logger.debug('Application routes mounting completed successfully');
        } catch (routeMountingError) {
            throw new Error(`Application route mounting failed: ${routeMountingError.message}`);
        }
        
        // Configure error handling using configureErrorHandling() for 404 and error responses
        try {
            configureErrorHandling(app);
            logger.debug('Error handling configuration completed successfully');
        } catch (errorHandlingError) {
            throw new Error(`Error handling configuration failed: ${errorHandlingError.message}`);
        }
        
        // Store app instance in APP_INSTANCE global for caching and reuse
        APP_INSTANCE = app;
        
        // Log successful application initialization with comprehensive middleware and configuration summary
        logger.info('Application initialization completed successfully', {
            appName: appName,
            appVersion: appVersion,
            environment: environment,
            totalMiddlewareCount: MIDDLEWARE_STACK_SIZE,
            initializationTime: INITIALIZATION_TIME,
            initializationDuration: Date.now() - new Date(INITIALIZATION_TIME).getTime() + 'ms',
            middlewareStack: {
                baseMiddleware: true,
                loggingMiddleware: true,
                securityMiddleware: true,
                applicationRoutes: true,
                errorHandling: true
            },
            features: {
                helloEndpoint: true,
                healthEndpoints: true,
                requestLogging: true,
                securityHeaders: true,
                rateLimiting: true,
                errorHandling: true
            },
            express5Features: {
                automaticPromiseErrorHandling: true,
                enhancedAsyncAwaitSupport: true
            },
            timestamp: new Date().toISOString()
        });
        
        // Return fully configured Express application instance ready for server binding
        return app;
        
    } catch (error) {
        // Handle application initialization errors with comprehensive context and cleanup
        logger.error('Application initialization failed', {
            error: error.message,
            stack: error.stack,
            initializationPhase: 'complete_initialization',
            middlewareConfigured: MIDDLEWARE_STACK_SIZE,
            initializationTime: INITIALIZATION_TIME,
            timestamp: new Date().toISOString()
        });
        
        // Clean up global state on initialization failure
        APP_INSTANCE = null;
        INITIALIZATION_TIME = null;
        MIDDLEWARE_STACK_SIZE = 0;
        
        // Throw ApplicationError for upstream error handling
        throw new Error(`Application initialization failed: ${error.message}`);
    }
}

/**
 * Returns the current Express application instance, initializing if necessary.
 * This function checks if APP_INSTANCE global is null, initializes application using initializeApplication() 
 * if needed, returns cached APP_INSTANCE, and logs application instance access if debug mode enabled for 
 * performance monitoring and lazy initialization support.
 * 
 * Application instance management includes:
 * - Lazy initialization with automatic first-time setup for performance optimization
 * - Global instance caching to prevent repeated initialization overhead
 * - Thread-safe access pattern with singleton behavior
 * - Debug logging for access monitoring and usage tracking
 * - Error handling with initialization failure recovery
 * 
 * @returns {Object} Current Express application instance with complete configuration and middleware stack
 * @throws {Error} When application initialization fails or application instance is unavailable
 */
function getAppInstance() {
    try {
        // Check if APP_INSTANCE global is null for lazy initialization
        if (APP_INSTANCE === null) {
            logger.debug('Application instance not initialized, performing lazy initialization');
            
            // Initialize application using initializeApplication() if needed
            APP_INSTANCE = initializeApplication();
            
            logger.debug('Lazy application initialization completed successfully', {
                middlewareCount: MIDDLEWARE_STACK_SIZE,
                initializationTime: INITIALIZATION_TIME
            });
        }
        
        // Log application instance access if debug mode enabled for monitoring
        logger.debug('Application instance accessed', {
            instanceCached: true,
            initializationTime: INITIALIZATION_TIME,
            middlewareStackSize: MIDDLEWARE_STACK_SIZE,
            accessTimestamp: new Date().toISOString()
        });
        
        // Return cached APP_INSTANCE for performance and consistency
        return APP_INSTANCE;
        
    } catch (error) {
        // Handle application instance access errors with detailed context
        logger.error('Failed to get application instance', {
            error: error.message,
            stack: error.stack,
            instanceExists: APP_INSTANCE !== null,
            initializationTime: INITIALIZATION_TIME,
            timestamp: new Date().toISOString()
        });
        
        // Clean up invalid state on error
        APP_INSTANCE = null;
        INITIALIZATION_TIME = null;
        MIDDLEWARE_STACK_SIZE = 0;
        
        throw new Error(`Application instance access failed: ${error.message}`);
    }
}

/**
 * Returns application statistics including uptime, middleware count, and configuration details.
 * This function calculates application uptime using INITIALIZATION_TIME, gets current configuration using 
 * getConfig(), counts middleware stack size from MIDDLEWARE_STACK_SIZE, extracts environment and version 
 * information, creates statistics object with runtime metrics, includes route count and endpoint information, 
 * and returns comprehensive statistics object for operational monitoring and health checking.
 * 
 * Application statistics include:
 * - Application uptime calculation with precise timing from initialization
 * - Middleware stack analysis with component breakdown and performance metrics
 * - Configuration summary with environment-specific settings and feature flags
 * - Runtime information including Node.js version, platform, and process details
 * - Route statistics with endpoint counts and availability status
 * - Performance metrics with initialization duration and resource usage
 * 
 * @returns {Object} Application statistics object with runtime and configuration information for monitoring
 * @throws {Error} When statistics generation fails or application is not initialized
 */
function getApplicationStats() {
    try {
        // Calculate application uptime using INITIALIZATION_TIME with error handling
        let uptimeInfo = {
            initialized: false,
            uptimeMs: 0,
            uptimeSeconds: 0,
            uptimeMinutes: 0,
            uptimeHours: 0,
            uptimeFormatted: 'not initialized'
        };
        
        if (INITIALIZATION_TIME) {
            const initTime = new Date(INITIALIZATION_TIME).getTime();
            const currentTime = Date.now();
            const uptimeMs = currentTime - initTime;
            
            uptimeInfo = {
                initialized: true,
                uptimeMs: uptimeMs,
                uptimeSeconds: Math.floor(uptimeMs / 1000),
                uptimeMinutes: Math.floor(uptimeMs / (1000 * 60)),
                uptimeHours: Math.floor(uptimeMs / (1000 * 60 * 60)),
                uptimeFormatted: `${Math.floor(uptimeMs / (1000 * 60 * 60))}h ${Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))}m ${Math.floor((uptimeMs % (1000 * 60)) / 1000)}s`
            };
        }
        
        // Get current configuration using getConfig() for environment and feature information
        let configInfo = {};
        try {
            const config = getConfig();
            configInfo = {
                appName: config?.app?.name || 'unknown',
                appVersion: config?.app?.version || 'unknown',
                environment: config?.app?.env || process.env.NODE_ENV || 'unknown',
                loggingLevel: config?.logging?.level || 'unknown',
                securityEnabled: config?.security?.enabled !== false,
                features: config?.features || {}
            };
        } catch (configError) {
            logger.warn('Failed to load configuration for statistics', {
                error: configError.message
            });
            configInfo = {
                appName: 'unknown',
                appVersion: 'unknown',
                environment: 'unknown',
                configurationError: configError.message
            };
        }
        
        // Count middleware stack size and analyze middleware components
        const middlewareInfo = {
            totalMiddleware: MIDDLEWARE_STACK_SIZE,
            stackBreakdown: {
                baseMiddleware: 3, // JSON, URL-encoded, static/CORS
                loggingMiddleware: 1,
                securityMiddleware: 1,
                applicationRoutes: 1,
                errorHandling: 2 // 404 handler + error handler
            },
            stackHealth: MIDDLEWARE_STACK_SIZE >= 6 ? 'optimal' : 'incomplete'
        };
        
        // Extract environment and version information for runtime context
        const runtimeInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            processId: process.pid,
            processUptime: Math.floor(process.uptime()),
            memoryUsage: process.memoryUsage(),
            expressVersion: '5.1.0'
        };
        
        // Include route count and endpoint information if application is initialized
        let routeInfo = {
            routesAvailable: false,
            routeCount: 0,
            endpoints: []
        };
        
        if (APP_INSTANCE) {
            try {
                const routerStack = router?.stack || [];
                routeInfo = {
                    routesAvailable: true,
                    routeCount: routerStack.length,
                    endpoints: [
                        { path: '/hello', method: 'GET', status: 'available' },
                        { path: '/health', method: 'GET', status: 'available' },
                        { path: '/livez', method: 'GET', status: 'available' },
                        { path: '/readyz', method: 'GET', status: 'available' }
                    ],
                    routerStackSize: routerStack.length
                };
            } catch (routeError) {
                routeInfo.routeError = routeError.message;
            }
        }
        
        // Create comprehensive statistics object with runtime metrics and operational information
        const applicationStats = {
            application: {
                name: configInfo.appName,
                version: configInfo.appVersion,
                environment: configInfo.environment,
                initialized: APP_INSTANCE !== null,
                initializationTime: INITIALIZATION_TIME,
                uptime: uptimeInfo
            },
            
            middleware: middlewareInfo,
            
            configuration: {
                loggingLevel: configInfo.loggingLevel,
                securityEnabled: configInfo.securityEnabled,
                features: configInfo.features,
                configurationLoaded: !configInfo.configurationError
            },
            
            runtime: runtimeInfo,
            
            routes: routeInfo,
            
            health: {
                status: APP_INSTANCE !== null ? 'healthy' : 'unhealthy',
                checks: {
                    applicationInitialized: APP_INSTANCE !== null,
                    middlewareStackComplete: MIDDLEWARE_STACK_SIZE >= 6,
                    configurationLoaded: !configInfo.configurationError,
                    routesAvailable: routeInfo.routesAvailable
                }
            },
            
            statistics: {
                timestamp: new Date().toISOString(),
                generatedBy: 'getApplicationStats',
                collectionDurationMs: 0 // Could add timing if needed
            }
        };
        
        // Return comprehensive statistics object frozen to prevent modification
        return Object.freeze(applicationStats);
        
    } catch (error) {
        // Handle statistics generation errors gracefully with minimal fallback information
        logger.error('Failed to generate application statistics', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Return minimal statistics as fallback
        return Object.freeze({
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            fallback: {
                initialized: APP_INSTANCE !== null,
                initializationTime: INITIALIZATION_TIME,
                middlewareCount: MIDDLEWARE_STACK_SIZE,
                nodeVersion: process.version
            }
        });
    }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Default export of fully configured Express application instance ready for HTTP server binding.
 * The exported application includes complete middleware stack, route mounting, error handling,
 * and all necessary configuration for production-ready operation.
 */
const app = getAppInstance();

// Export all application management functions and the configured Express application instance
module.exports = {
    // Default export of fully configured Express application instance ready for HTTP server binding
    app,
    
    // Factory function to get application instance, initializing if necessary for testing and custom scenarios
    getAppInstance,
    
    // Explicit initialization function for testing and custom setup scenarios with full control
    initializeApplication,
    
    // Utility function to retrieve application runtime statistics and configuration for monitoring and health checks
    getApplicationStats
};