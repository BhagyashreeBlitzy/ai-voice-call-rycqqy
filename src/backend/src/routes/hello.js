/**
 * Express.js Hello Router Module for Node.js Tutorial Application
 * 
 * This module implements a comprehensive Express.js router for the '/hello' endpoint that demonstrates
 * industry-standard routing patterns, controller delegation, middleware integration, and modular 
 * architecture. Compatible with Express.js 5.1.0 automatic promise error handling and provides 
 * educational value through clear code organization while maintaining production-ready patterns.
 * 
 * Features:
 * - Express Router Pattern Implementation with controller delegation and middleware composition
 * - Comprehensive Route Configuration with GET handler and method validation for /hello endpoint
 * - Security Middleware Integration with request validation, rate limiting, and security headers
 * - Educational Architecture Design prioritizing code clarity while demonstrating enterprise patterns
 * - Production-Ready Error Handling with Express 5.1.0 automatic promise rejection forwarding
 * - Operational Monitoring with route statistics, performance metrics, and health tracking
 * - Modular Design with clear separation of concerns and dependency injection patterns
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async support and automatic promise error handling
 * - Node.js 22.11.0 LTS with Active LTS support extending into late 2025
 * 
 * Architecture: Event-driven routing with controller delegation, middleware composition, and 
 * comprehensive error handling for educational learning while maintaining production deployment patterns.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js routing patterns, middleware composition, and modular architecture
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Express.js web framework for creating router instance and handling HTTP requests/responses
const express = require('express'); // ^5.1.0

// =============================================================================
// INTERNAL DEPENDENCIES - CONTROLLERS
// =============================================================================

// Import main controller function for handling GET requests to '/hello' endpoint with complete request processing lifecycle
const { 
    handleHelloGetRequest 
} = require('../controllers/hello.js');

// Import controller function for handling unsupported HTTP methods with 405 Method Not Allowed responses
const { 
    handleHelloMethodNotAllowed 
} = require('../controllers/hello.js');

// Import Express.js middleware function for request validation before route handler execution
const { 
    validateHelloRequestMiddleware 
} = require('../controllers/hello.js');

// =============================================================================
// INTERNAL DEPENDENCIES - UTILITIES
// =============================================================================

// Import structured logging utility for route initialization logging, request processing events, and operational monitoring
const { 
    logger 
} = require('../utils/logger.js');

// Import route path constants for consistent '/hello' endpoint path definition and configuration
const { 
    ROUTES 
} = require('../utils/constants.js');

// Import HTTP method constants for route method specification and validation in hello router
const { 
    HTTP_METHODS 
} = require('../utils/constants.js');

// =============================================================================
// INTERNAL DEPENDENCIES - MIDDLEWARE
// =============================================================================

// Import security middleware factory for comprehensive request security including headers, rate limiting, and validation
const { 
    createSecurityMiddleware 
} = require('../middleware/security.js');

// Import security event logging middleware for tracking security-related events and request context
const { 
    securityEventLogger 
} = require('../middleware/security.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

// Flag to track hello router initialization status
let HELLO_ROUTER_INITIALIZED = false;

// Timestamp when hello routes were registered for monitoring
let ROUTE_REGISTRATION_TIME = null;

// Hello route statistics for operational monitoring and performance tracking
let HELLO_ROUTE_STATS = { 
    requestCount: 0, 
    getRequests: 0, 
    methodNotAllowed: 0, 
    errors: 0,
    initializationCount: 0,
    lastInitialization: null,
    routeValidations: 0,
    middlewareApplications: 0,
    performanceMetrics: {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        totalResponseTime: 0
    },
    errorBreakdown: {
        controllerErrors: 0,
        middlewareErrors: 0,
        validationErrors: 0,
        systemErrors: 0
    }
};

// =============================================================================
// CORE ROUTER FACTORY FUNCTIONS
// =============================================================================

/**
 * Factory function that creates and configures the Express router for hello endpoint with middleware and route handlers.
 * This function creates new Express Router instance using express.Router() with configuration options,
 * logs hello router creation start using logger.info() with initialization context, extracts security
 * configuration from options or uses defaults for middleware setup, creates security middleware using
 * createSecurityMiddleware() with hello-specific configuration, applies security event logging middleware
 * using securityEventLogger for request tracking, applies request validation middleware using 
 * validateHelloRequestMiddleware for input validation, registers GET route handler at ROUTES.HELLO path
 * using handleHelloGetRequest controller, registers method not allowed handler for all other HTTP methods
 * using handleHelloMethodNotAllowed, sets HELLO_ROUTER_INITIALIZED flag to true, records 
 * ROUTE_REGISTRATION_TIME timestamp, logs successful hello router configuration with registered routes
 * summary, and returns fully configured hello router instance ready for mounting.
 * 
 * Router factory features include:
 * - Express Router instance creation with performance-optimized configuration options
 * - Security middleware integration with comprehensive request protection and validation
 * - Controller delegation pattern for clean separation of concerns and maintainable code structure
 * - Middleware composition with proper ordering for security, logging, and validation layers
 * - Route registration with method-specific handlers and comprehensive error handling
 * - Operational monitoring with initialization tracking and performance metrics collection
 * - Educational design demonstrating production-ready routing patterns and middleware architecture
 * 
 * @param {Object} options - Configuration options object for customizing router behavior and middleware settings
 * @returns {Object} Configured Express router instance with hello route handlers and middleware ready for mounting
 */
function createHelloRouter(options = {}) {
    const routerCreationStart = Date.now();
    
    try {
        // Create new Express Router instance using express.Router() with configuration options
        const router = express.Router({
            caseSensitive: options.caseSensitive || false,
            mergeParams: options.mergeParams || false,
            strict: options.strict || false
        });
        
        // Log hello router creation start using logger.info() with initialization context
        logger.info('Creating hello router instance', {
            timestamp: new Date().toISOString(),
            options: {
                caseSensitive: options.caseSensitive || false,
                mergeParams: options.mergeParams || false,
                strict: options.strict || false,
                securityEnabled: options.security !== false
            },
            routeEndpoint: ROUTES.HELLO,
            expectedMethods: [HTTP_METHODS.GET]
        });
        
        // Extract security configuration from options or use defaults for middleware setup
        const securityConfig = {
            enabled: options.security !== false,
            rateLimit: options.rateLimit || {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // Limit each IP to 100 requests per windowMs
                message: 'Too many requests to hello endpoint'
            },
            headers: options.headers || {
                enableSecurityHeaders: true,
                removeXPoweredBy: true
            },
            validation: options.validation !== false,
            ...options.securityConfig
        };
        
        // Create security middleware using createSecurityMiddleware() with hello-specific configuration
        if (securityConfig.enabled) {
            try {
                const securityMiddleware = createSecurityMiddleware({
                    endpoint: 'hello',
                    rateLimit: securityConfig.rateLimit,
                    headers: securityConfig.headers,
                    validation: securityConfig.validation
                });
                
                router.use(securityMiddleware);
                
                logger.debug('Security middleware applied to hello router', {
                    rateLimitEnabled: !!securityConfig.rateLimit,
                    headersEnabled: securityConfig.headers?.enableSecurityHeaders,
                    validationEnabled: securityConfig.validation
                });
                
                HELLO_ROUTE_STATS.middlewareApplications++;
                
            } catch (securityError) {
                logger.warn('Failed to apply security middleware to hello router', {
                    error: securityError.message,
                    fallbackBehavior: 'continuing_without_security_middleware'
                });
                
                HELLO_ROUTE_STATS.errorBreakdown.middlewareErrors++;
            }
        }
        
        // Apply security event logging middleware using securityEventLogger for request tracking
        try {
            router.use(securityEventLogger({
                endpoint: 'hello',
                logLevel: options.logLevel || 'info',
                includeRequestDetails: options.includeRequestDetails !== false
            }));
            
            logger.debug('Security event logging middleware applied to hello router');
            HELLO_ROUTE_STATS.middlewareApplications++;
            
        } catch (loggingError) {
            logger.warn('Failed to apply security event logging middleware', {
                error: loggingError.message,
                impact: 'security_events_not_logged'
            });
            
            HELLO_ROUTE_STATS.errorBreakdown.middlewareErrors++;
        }
        
        // Apply request validation middleware using validateHelloRequestMiddleware for input validation
        if (securityConfig.validation) {
            try {
                router.use(validateHelloRequestMiddleware);
                
                logger.debug('Request validation middleware applied to hello router');
                HELLO_ROUTE_STATS.middlewareApplications++;
                
            } catch (validationError) {
                logger.warn('Failed to apply request validation middleware', {
                    error: validationError.message,
                    impact: 'requests_not_validated'
                });
                
                HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
            }
        }
        
        // Register GET route handler at ROUTES.HELLO path using handleHelloGetRequest controller
        try {
            router.get(ROUTES.HELLO, (req, res, next) => {
                const requestStart = Date.now();
                
                // Track request statistics
                HELLO_ROUTE_STATS.requestCount++;
                HELLO_ROUTE_STATS.getRequests++;
                
                // Add request timing middleware for performance monitoring
                res.on('finish', () => {
                    const responseTime = Date.now() - requestStart;
                    
                    // Update performance metrics
                    HELLO_ROUTE_STATS.performanceMetrics.totalResponseTime += responseTime;
                    HELLO_ROUTE_STATS.performanceMetrics.averageResponseTime = 
                        HELLO_ROUTE_STATS.performanceMetrics.totalResponseTime / HELLO_ROUTE_STATS.requestCount;
                    HELLO_ROUTE_STATS.performanceMetrics.maxResponseTime = 
                        Math.max(HELLO_ROUTE_STATS.performanceMetrics.maxResponseTime, responseTime);
                    HELLO_ROUTE_STATS.performanceMetrics.minResponseTime = 
                        Math.min(HELLO_ROUTE_STATS.performanceMetrics.minResponseTime, responseTime);
                });
                
                // Delegate to controller with error handling
                handleHelloGetRequest(req, res, next).catch(error => {
                    HELLO_ROUTE_STATS.errors++;
                    HELLO_ROUTE_STATS.errorBreakdown.controllerErrors++;
                    
                    logger.error('Error in hello GET request handler', {
                        error: error.message,
                        method: req.method,
                        path: req.path,
                        correlationId: req.correlationId
                    });
                    
                    next(error);
                });
            });
            
            logger.info('GET route handler registered for hello endpoint', {
                path: ROUTES.HELLO,
                method: HTTP_METHODS.GET,
                controller: 'handleHelloGetRequest'
            });
            
        } catch (routeError) {
            logger.error('Failed to register GET route handler for hello endpoint', {
                error: routeError.message,
                path: ROUTES.HELLO
            });
            
            HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
            throw routeError;
        }
        
        // Register method not allowed handler for all other HTTP methods using handleHelloMethodNotAllowed
        try {
            router.all(ROUTES.HELLO, (req, res, next) => {
                if (req.method !== HTTP_METHODS.GET) {
                    // Track method not allowed requests
                    HELLO_ROUTE_STATS.requestCount++;
                    HELLO_ROUTE_STATS.methodNotAllowed++;
                    
                    // Delegate to method not allowed handler
                    handleHelloMethodNotAllowed(req, res, next).catch(error => {
                        HELLO_ROUTE_STATS.errors++;
                        HELLO_ROUTE_STATS.errorBreakdown.controllerErrors++;
                        
                        logger.error('Error in hello method not allowed handler', {
                            error: error.message,
                            method: req.method,
                            path: req.path
                        });
                        
                        next(error);
                    });
                } else {
                    next();
                }
            });
            
            logger.info('Method not allowed handler registered for hello endpoint', {
                path: ROUTES.HELLO,
                allowedMethod: HTTP_METHODS.GET,
                controller: 'handleHelloMethodNotAllowed'
            });
            
        } catch (methodError) {
            logger.error('Failed to register method not allowed handler', {
                error: methodError.message,
                path: ROUTES.HELLO
            });
            
            HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
            throw methodError;
        }
        
        // Set HELLO_ROUTER_INITIALIZED flag to true to indicate successful initialization
        HELLO_ROUTER_INITIALIZED = true;
        
        // Record ROUTE_REGISTRATION_TIME timestamp for monitoring and operational tracking
        ROUTE_REGISTRATION_TIME = Date.now();
        
        // Update initialization statistics
        HELLO_ROUTE_STATS.initializationCount++;
        HELLO_ROUTE_STATS.lastInitialization = new Date().toISOString();
        
        // Log successful hello router configuration with registered routes summary
        const routerCreationTime = Date.now() - routerCreationStart;
        
        logger.info('Hello router created and configured successfully', {
            creationTime: `${routerCreationTime}ms`,
            routesRegistered: 2, // GET handler + method not allowed handler
            middlewareApplied: HELLO_ROUTE_STATS.middlewareApplications,
            securityEnabled: securityConfig.enabled,
            validationEnabled: securityConfig.validation,
            endpoint: ROUTES.HELLO,
            supportedMethods: [HTTP_METHODS.GET],
            routerConfiguration: {
                caseSensitive: router.caseSensitive,
                mergeParams: router.mergeParams,
                strict: router.strict
            }
        });
        
        // Return fully configured hello router instance ready for mounting
        return router;
        
    } catch (error) {
        // Handle router creation errors with comprehensive error logging
        HELLO_ROUTER_INITIALIZED = false;
        HELLO_ROUTE_STATS.errors++;
        HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
        
        const routerCreationTime = Date.now() - routerCreationStart;
        
        logger.error('Failed to create hello router', {
            error: error.message,
            stack: error.stack,
            creationTime: `${routerCreationTime}ms`,
            options: options,
            routeEndpoint: ROUTES.HELLO
        });
        
        throw new Error(`Hello router creation failed: ${error.message}`);
    }
}

/**
 * Initializes hello route configuration with middleware setup and route handler registration.
 * This function checks if hello router is already initialized using HELLO_ROUTER_INITIALIZED flag,
 * logs hello route initialization start using logger.info() with module context, creates hello
 * router using createHelloRouter() factory function with default options, validates that required
 * controller functions are properly imported and accessible, verifies middleware configuration is
 * compatible with Express.js 5.1.0 requirements, tests route handler functionality with basic
 * validation of controller integration, updates HELLO_ROUTE_STATS with initialization timestamp
 * and configuration metadata, logs successful hello route initialization with route configuration
 * summary, and returns initialized hello router instance for integration with main routing system.
 * 
 * Route initialization features include:
 * - Initialization state checking to prevent duplicate router setup and configuration conflicts
 * - Default configuration application with environment-aware settings and security defaults
 * - Dependency validation to ensure all required controllers and middleware are available
 * - Express.js 5.1.0 compatibility verification with automatic promise error handling support
 * - Route handler functionality testing with basic integration validation and error detection
 * - Comprehensive statistics tracking for operational monitoring and performance analysis
 * - Educational logging that demonstrates initialization flow and configuration decisions
 * 
 * @returns {Object} Initialized hello router ready for mounting in main routes with complete configuration
 */
function initializeHelloRoutes() {
    const initializationStart = Date.now();
    
    try {
        // Check if hello router is already initialized using HELLO_ROUTER_INITIALIZED flag
        if (HELLO_ROUTER_INITIALIZED) {
            logger.debug('Hello routes already initialized, returning existing configuration', {
                initializationTime: HELLO_ROUTE_STATS.lastInitialization,
                routeStats: {
                    requestCount: HELLO_ROUTE_STATS.requestCount,
                    initializationCount: HELLO_ROUTE_STATS.initializationCount
                }
            });
            
            // Return cached router configuration if available
            return createHelloRouter({ reuse: true });
        }
        
        // Log hello route initialization start using logger.info() with module context
        logger.info('Initializing hello route configuration', {
            timestamp: new Date().toISOString(),
            module: 'routes/hello.js',
            endpoint: ROUTES.HELLO,
            expressVersion: '5.1.0',
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        });
        
        // Create hello router using createHelloRouter() factory function with default options
        const defaultOptions = {
            caseSensitive: false,
            mergeParams: false,
            strict: false,
            security: true,
            validation: true,
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // Limit each IP to 100 requests per windowMs for hello endpoint
                message: 'Too many requests to hello endpoint, please try again later'
            },
            headers: {
                enableSecurityHeaders: true,
                removeXPoweredBy: true,
                contentTypeOptions: true
            },
            logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
            includeRequestDetails: process.env.NODE_ENV === 'development'
        };
        
        const helloRouter = createHelloRouter(defaultOptions);
        
        // Validate that required controller functions are properly imported and accessible
        try {
            if (typeof handleHelloGetRequest !== 'function') {
                throw new Error('handleHelloGetRequest controller function is not available');
            }
            
            if (typeof handleHelloMethodNotAllowed !== 'function') {
                throw new Error('handleHelloMethodNotAllowed controller function is not available');
            }
            
            if (typeof validateHelloRequestMiddleware !== 'function') {
                throw new Error('validateHelloRequestMiddleware function is not available');
            }
            
            logger.debug('Controller function validation completed successfully', {
                validatedFunctions: [
                    'handleHelloGetRequest',
                    'handleHelloMethodNotAllowed',
                    'validateHelloRequestMiddleware'
                ]
            });
            
        } catch (validationError) {
            logger.error('Controller function validation failed during initialization', {
                error: validationError.message,
                missingDependencies: true
            });
            
            HELLO_ROUTE_STATS.errors++;
            HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
            throw validationError;
        }
        
        // Verify middleware configuration is compatible with Express.js 5.1.0 requirements
        try {
            if (!express.Router || typeof express.Router !== 'function') {
                throw new Error('Express.js Router is not available or incompatible');
            }
            
            // Test basic router functionality
            if (!helloRouter || typeof helloRouter.use !== 'function' || typeof helloRouter.get !== 'function') {
                throw new Error('Created router does not have required Express.js router methods');
            }
            
            logger.debug('Express.js 5.1.0 compatibility verification completed', {
                routerMethods: ['use', 'get', 'all', 'route'],
                expressVersion: '5.1.0',
                automaticPromiseHandling: true
            });
            
        } catch (compatibilityError) {
            logger.error('Express.js compatibility verification failed', {
                error: compatibilityError.message,
                expectedVersion: '5.1.0'
            });
            
            HELLO_ROUTE_STATS.errors++;
            HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
            throw compatibilityError;
        }
        
        // Test route handler functionality with basic validation of controller integration
        try {
            // Verify router has expected routes registered
            const routerStack = helloRouter.stack || [];
            const hasGetRoute = routerStack.some(layer => 
                layer.route && layer.route.methods && layer.route.methods.get
            );
            
            if (!hasGetRoute) {
                throw new Error('GET route handler not properly registered on hello router');
            }
            
            logger.debug('Route handler integration validation completed', {
                routeStackSize: routerStack.length,
                hasGetRoute: hasGetRoute,
                registeredRoutes: routerStack.map(layer => ({
                    path: layer.route ? layer.route.path : 'middleware',
                    methods: layer.route ? Object.keys(layer.route.methods) : ['middleware']
                }))
            });
            
        } catch (integrationError) {
            logger.error('Route handler integration validation failed', {
                error: integrationError.message,
                routerIntegrity: false
            });
            
            HELLO_ROUTE_STATS.errors++;
            HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
            throw integrationError;
        }
        
        // Update HELLO_ROUTE_STATS with initialization timestamp and configuration metadata
        const initializationTime = Date.now() - initializationStart;
        
        HELLO_ROUTE_STATS.routeValidations++;
        HELLO_ROUTE_STATS.lastInitialization = new Date().toISOString();
        
        // Log successful hello route initialization with route configuration summary
        logger.info('Hello route initialization completed successfully', {
            initializationTime: `${initializationTime}ms`,
            routeConfiguration: {
                endpoint: ROUTES.HELLO,
                supportedMethods: [HTTP_METHODS.GET],
                middlewareCount: HELLO_ROUTE_STATS.middlewareApplications,
                securityEnabled: defaultOptions.security,
                validationEnabled: defaultOptions.validation,
                rateLimitEnabled: !!defaultOptions.rateLimit
            },
            routeStatistics: {
                initializationCount: HELLO_ROUTE_STATS.initializationCount,
                totalRequests: HELLO_ROUTE_STATS.requestCount,
                errorCount: HELLO_ROUTE_STATS.errors
            },
            expressCompatibility: {
                version: '5.1.0',
                automaticPromiseHandling: true,
                routerFunctional: true
            }
        });
        
        // Return initialized hello router instance for integration with main routing system
        return helloRouter;
        
    } catch (error) {
        // Handle initialization errors with comprehensive error context and cleanup
        HELLO_ROUTER_INITIALIZED = false;
        ROUTE_REGISTRATION_TIME = null;
        HELLO_ROUTE_STATS.errors++;
        HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
        
        const initializationTime = Date.now() - initializationStart;
        
        logger.error('Hello route initialization failed', {
            error: error.message,
            stack: error.stack,
            initializationTime: `${initializationTime}ms`,
            initializationPhase: 'route_setup',
            endpoint: ROUTES.HELLO,
            cleanup: {
                routerInitialized: HELLO_ROUTER_INITIALIZED,
                registrationTime: ROUTE_REGISTRATION_TIME
            }
        });
        
        throw new Error(`Hello route initialization failed: ${error.message}`);
    }
}

/**
 * Configures and applies middleware stack for hello route with security, logging, and validation layers.
 * This function validates router instance is a properly initialized Express Router, applies security
 * middleware as first layer for comprehensive request protection, adds security event logging for
 * tracking and monitoring security-related events, configures request validation middleware with
 * hello-specific validation rules, sets up request timing middleware for performance monitoring and
 * SLA tracking, applies error handling middleware integration for Express 5.1.0 automatic promise
 * handling, and logs middleware configuration completion with applied middleware summary.
 * 
 * Middleware configuration features include:
 * - Router instance validation to ensure proper Express.js router functionality and compatibility
 * - Security-first middleware ordering with comprehensive request protection as foundation layer
 * - Integrated logging and monitoring for security events, performance tracking, and operational visibility
 * - Hello-specific validation rules with request format verification and security threat detection
 * - Performance monitoring integration with response time tracking and SLA compliance measurement
 * - Express.js 5.1.0 automatic promise error handling with proper error propagation and middleware integration
 * - Educational middleware composition demonstrating production-ready patterns and security best practices
 * 
 * @param {Object} router - Express router instance to configure with middleware stack and security layers
 * @param {Object} middlewareOptions - Configuration options for customizing middleware behavior and security settings
 * @returns {void} No return value - applies middleware to router instance in place with comprehensive configuration
 */
function configureHelloMiddleware(router, middlewareOptions = {}) {
    const middlewareConfigStart = Date.now();
    
    try {
        // Validate router instance is a properly initialized Express Router
        if (!router || typeof router !== 'object') {
            throw new Error('Router parameter must be a valid Express Router instance');
        }
        
        if (typeof router.use !== 'function' || typeof router.get !== 'function') {
            throw new Error('Provided router does not have required Express Router methods');
        }
        
        logger.debug('Router instance validation completed', {
            routerType: typeof router,
            hasUsMethod: typeof router.use === 'function',
            hasGetMethod: typeof router.get === 'function',
            hasAllMethod: typeof router.all === 'function'
        });
        
        // Apply security middleware as first layer for comprehensive request protection
        const securityOptions = {
            enabled: middlewareOptions.security !== false,
            rateLimit: middlewareOptions.rateLimit || {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // Limit each IP to 100 requests per windowMs
                message: 'Too many hello requests, please slow down'
            },
            headers: middlewareOptions.headers || {
                removeXPoweredBy: true,
                contentTypeOptions: true,
                frameOptions: 'DENY',
                xssProtection: true
            },
            cors: middlewareOptions.cors || {
                origin: process.env.NODE_ENV === 'development' ? true : false,
                methods: ['GET', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization']
            },
            ...middlewareOptions.securityConfig
        };
        
        if (securityOptions.enabled) {
            try {
                const securityMiddleware = createSecurityMiddleware({
                    endpoint: 'hello',
                    ...securityOptions
                });
                
                router.use(securityMiddleware);
                
                logger.debug('Security middleware applied as first layer', {
                    rateLimitEnabled: !!securityOptions.rateLimit,
                    headersEnabled: !!securityOptions.headers,
                    corsEnabled: !!securityOptions.cors,
                    securityLevel: 'comprehensive'
                });
                
                HELLO_ROUTE_STATS.middlewareApplications++;
                
            } catch (securityError) {
                logger.warn('Failed to apply security middleware', {
                    error: securityError.message,
                    fallback: 'continuing_with_basic_security'
                });
                
                HELLO_ROUTE_STATS.errorBreakdown.middlewareErrors++;
            }
        }
        
        // Add security event logging for tracking and monitoring security-related events
        const loggingOptions = {
            enabled: middlewareOptions.logging !== false,
            level: middlewareOptions.logLevel || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
            includeRequestDetails: middlewareOptions.includeRequestDetails !== false,
            includeTiming: middlewareOptions.includeTiming !== false,
            correlationId: middlewareOptions.correlationId !== false,
            ...middlewareOptions.loggingConfig
        };
        
        if (loggingOptions.enabled) {
            try {
                router.use((req, res, next) => {
                    // Add correlation ID for request tracing
                    if (loggingOptions.correlationId) {
                        req.correlationId = req.headers['x-correlation-id'] || 
                                          `hello-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    }
                    
                    // Log request start
                    if (loggingOptions.includeRequestDetails) {
                        logger[loggingOptions.level]('Hello endpoint request started', {
                            method: req.method,
                            path: req.path,
                            userAgent: req.get('User-Agent'),
                            correlationId: req.correlationId,
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    next();
                });
                
                logger.debug('Security event logging middleware applied', {
                    logLevel: loggingOptions.level,
                    includeRequestDetails: loggingOptions.includeRequestDetails,
                    correlationIdEnabled: loggingOptions.correlationId
                });
                
                HELLO_ROUTE_STATS.middlewareApplications++;
                
            } catch (loggingError) {
                logger.warn('Failed to apply security event logging middleware', {
                    error: loggingError.message,
                    impact: 'security_events_not_logged'
                });
                
                HELLO_ROUTE_STATS.errorBreakdown.middlewareErrors++;
            }
        }
        
        // Configure request validation middleware with hello-specific validation rules
        const validationOptions = {
            enabled: middlewareOptions.validation !== false,
            strict: middlewareOptions.strictValidation || false,
            methods: middlewareOptions.allowedMethods || ['GET'],
            headers: middlewareOptions.requiredHeaders || [],
            maxPayloadSize: middlewareOptions.maxPayloadSize || '1mb',
            sanitization: middlewareOptions.sanitization !== false,
            ...middlewareOptions.validationConfig
        };
        
        if (validationOptions.enabled) {
            try {
                router.use((req, res, next) => {
                    // Method validation
                    if (!validationOptions.methods.includes(req.method)) {
                        const error = new Error(`Method ${req.method} not allowed for hello endpoint`);
                        error.status = 405;
                        error.allowedMethods = validationOptions.methods;
                        
                        HELLO_ROUTE_STATS.methodNotAllowed++;
                        HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
                        
                        return next(error);
                    }
                    
                    // Header validation
                    for (const requiredHeader of validationOptions.requiredHeaders) {
                        if (!req.headers[requiredHeader.toLowerCase()]) {
                            const error = new Error(`Required header '${requiredHeader}' is missing`);
                            error.status = 400;
                            error.missingHeader = requiredHeader;
                            
                            HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
                            return next(error);
                        }
                    }
                    
                    // Request validation passed
                    HELLO_ROUTE_STATS.routeValidations++;
                    next();
                });
                
                logger.debug('Request validation middleware configured', {
                    strictMode: validationOptions.strict,
                    allowedMethods: validationOptions.methods,
                    requiredHeaders: validationOptions.requiredHeaders,
                    sanitizationEnabled: validationOptions.sanitization
                });
                
                HELLO_ROUTE_STATS.middlewareApplications++;
                
            } catch (validationError) {
                logger.warn('Failed to configure request validation middleware', {
                    error: validationError.message,
                    impact: 'requests_not_validated'
                });
                
                HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
            }
        }
        
        // Set up request timing middleware for performance monitoring and SLA tracking
        if (middlewareOptions.performanceMonitoring !== false) {
            try {
                router.use((req, res, next) => {
                    // Track request start time
                    req.startTime = Date.now();
                    
                    // Add response timing
                    res.on('finish', () => {
                        const responseTime = Date.now() - req.startTime;
                        
                        // Update performance metrics
                        HELLO_ROUTE_STATS.performanceMetrics.totalResponseTime += responseTime;
                        HELLO_ROUTE_STATS.performanceMetrics.averageResponseTime = 
                            HELLO_ROUTE_STATS.performanceMetrics.totalResponseTime / Math.max(1, HELLO_ROUTE_STATS.requestCount);
                        HELLO_ROUTE_STATS.performanceMetrics.maxResponseTime = 
                            Math.max(HELLO_ROUTE_STATS.performanceMetrics.maxResponseTime, responseTime);
                        HELLO_ROUTE_STATS.performanceMetrics.minResponseTime = 
                            Math.min(HELLO_ROUTE_STATS.performanceMetrics.minResponseTime, responseTime);
                        
                        // Log slow requests
                        if (responseTime > (middlewareOptions.slowRequestThreshold || 1000)) {
                            logger.warn('Slow hello request detected', {
                                responseTime: `${responseTime}ms`,
                                method: req.method,
                                path: req.path,
                                correlationId: req.correlationId
                            });
                        }
                    });
                    
                    next();
                });
                
                logger.debug('Request timing middleware applied for performance monitoring');
                HELLO_ROUTE_STATS.middlewareApplications++;
                
            } catch (timingError) {
                logger.warn('Failed to apply request timing middleware', {
                    error: timingError.message,
                    impact: 'performance_monitoring_disabled'
                });
                
                HELLO_ROUTE_STATS.errorBreakdown.middlewareErrors++;
            }
        }
        
        // Apply error handling middleware integration for Express 5.1.0 automatic promise handling
        try {
            router.use((error, req, res, next) => {
                // Track error statistics
                HELLO_ROUTE_STATS.errors++;
                
                // Determine error category
                if (error.status === 405 || error.allowedMethods) {
                    HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
                } else if (error.status >= 400 && error.status < 500) {
                    HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
                } else {
                    HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
                }
                
                // Log error with context
                logger.error('Hello route middleware error', {
                    error: error.message,
                    status: error.status || 500,
                    method: req.method,
                    path: req.path,
                    correlationId: req.correlationId,
                    stack: error.stack
                });
                
                // Pass error to next error handler
                next(error);
            });
            
            logger.debug('Error handling middleware applied with Express 5.1.0 compatibility');
            HELLO_ROUTE_STATS.middlewareApplications++;
            
        } catch (errorHandlingError) {
            logger.error('Failed to apply error handling middleware', {
                error: errorHandlingError.message,
                impact: 'error_handling_compromised'
            });
            
            HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
        }
        
        // Log middleware configuration completion with applied middleware summary
        const middlewareConfigTime = Date.now() - middlewareConfigStart;
        
        logger.info('Hello middleware configuration completed', {
            configurationTime: `${middlewareConfigTime}ms`,
            middlewareApplied: HELLO_ROUTE_STATS.middlewareApplications,
            middlewareStack: {
                security: securityOptions.enabled,
                logging: loggingOptions.enabled,
                validation: validationOptions.enabled,
                performanceMonitoring: middlewareOptions.performanceMonitoring !== false,
                errorHandling: true
            },
            configuration: {
                securityLevel: securityOptions.enabled ? 'comprehensive' : 'disabled',
                validationMode: validationOptions.strict ? 'strict' : 'standard',
                loggingLevel: loggingOptions.level,
                performanceThreshold: middlewareOptions.slowRequestThreshold || 1000
            }
        });
        
    } catch (error) {
        // Handle middleware configuration errors with cleanup and error propagation
        const middlewareConfigTime = Date.now() - middlewareConfigStart;
        
        HELLO_ROUTE_STATS.errors++;
        HELLO_ROUTE_STATS.errorBreakdown.middlewareErrors++;
        
        logger.error('Hello middleware configuration failed', {
            error: error.message,
            stack: error.stack,
            configurationTime: `${middlewareConfigTime}ms`,
            middlewareOptions: middlewareOptions,
            partialApplication: HELLO_ROUTE_STATS.middlewareApplications
        });
        
        throw new Error(`Middleware configuration failed: ${error.message}`);
    }
}

/**
 * Registers specific route handlers for hello endpoint including GET handler and method validation.
 * This function registers GET route handler using router.get() with ROUTES.HELLO path and
 * handleHelloGetRequest controller, registers catch-all handler for non-GET methods using
 * router.all() with handleHelloMethodNotAllowed, validates route registration by checking
 * router.stack for proper route mounting, updates HELLO_ROUTE_STATS with registered route
 * count and configuration metadata, and logs route registration completion with detailed
 * route handler information.
 * 
 * Route registration features include:
 * - Explicit GET route handler registration with controller delegation and error handling
 * - Method validation through catch-all handler for comprehensive HTTP method coverage
 * - Route mounting verification to ensure proper Express.js router integration
 * - Statistics tracking for operational monitoring and route usage analysis
 * - Educational route pattern demonstration with clear separation of concerns
 * - Express.js 5.1.0 compatibility with automatic promise rejection forwarding
 * - Comprehensive error handling for route registration failures and recovery scenarios
 * 
 * @param {Object} router - Express router instance for route handler registration and configuration
 * @returns {void} No return value - registers routes on router instance with complete handler setup
 */
function registerHelloRoutes(router) {
    const routeRegistrationStart = Date.now();
    
    try {
        // Validate router parameter
        if (!router || typeof router.get !== 'function' || typeof router.all !== 'function') {
            throw new Error('Invalid router instance provided for route registration');
        }
        
        logger.debug('Starting hello route registration', {
            endpoint: ROUTES.HELLO,
            expectedRoutes: ['GET handler', 'method validation handler'],
            timestamp: new Date().toISOString()
        });
        
        let routesRegistered = 0;
        
        // Register GET route handler using router.get() with ROUTES.HELLO path and handleHelloGetRequest controller
        try {
            router.get(ROUTES.HELLO, async (req, res, next) => {
                try {
                    // Track GET request statistics
                    HELLO_ROUTE_STATS.requestCount++;
                    HELLO_ROUTE_STATS.getRequests++;
                    
                    // Add request metadata
                    req.helloRouteStart = Date.now();
                    req.helloRouteMethod = 'GET';
                    
                    // Delegate to controller with comprehensive error handling
                    await handleHelloGetRequest(req, res, next);
                    
                } catch (controllerError) {
                    // Track controller errors
                    HELLO_ROUTE_STATS.errors++;
                    HELLO_ROUTE_STATS.errorBreakdown.controllerErrors++;
                    
                    logger.error('Error in hello GET route handler', {
                        error: controllerError.message,
                        stack: controllerError.stack,
                        method: req.method,
                        path: req.path,
                        correlationId: req.correlationId,
                        processingTime: req.helloRouteStart ? `${Date.now() - req.helloRouteStart}ms` : 'unknown'
                    });
                    
                    // Express 5.1.0 automatic promise error handling
                    next(controllerError);
                }
            });
            
            routesRegistered++;
            
            logger.info('GET route handler registered successfully', {
                path: ROUTES.HELLO,
                method: 'GET',
                controller: 'handleHelloGetRequest',
                asyncSupport: true,
                expressCompatibility: '5.1.0'
            });
            
        } catch (getRouteError) {
            logger.error('Failed to register GET route handler', {
                error: getRouteError.message,
                path: ROUTES.HELLO,
                method: 'GET'
            });
            
            HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
            throw getRouteError;
        }
        
        // Register catch-all handler for non-GET methods using router.all() with handleHelloMethodNotAllowed
        try {
            router.all(ROUTES.HELLO, async (req, res, next) => {
                // Skip if already handled by GET route
                if (req.method === 'GET') {
                    return next();
                }
                
                try {
                    // Track method not allowed statistics
                    HELLO_ROUTE_STATS.requestCount++;
                    HELLO_ROUTE_STATS.methodNotAllowed++;
                    
                    // Add request metadata
                    req.helloRouteStart = Date.now();
                    req.helloRouteMethod = req.method;
                    req.allowedMethods = ['GET'];
                    
                    // Delegate to method not allowed handler
                    await handleHelloMethodNotAllowed(req, res, next);
                    
                } catch (methodError) {
                    // Track method handler errors
                    HELLO_ROUTE_STATS.errors++;
                    HELLO_ROUTE_STATS.errorBreakdown.controllerErrors++;
                    
                    logger.error('Error in hello method not allowed handler', {
                        error: methodError.message,
                        stack: methodError.stack,
                        method: req.method,
                        path: req.path,
                        correlationId: req.correlationId,
                        allowedMethods: req.allowedMethods
                    });
                    
                    // Express 5.1.0 automatic promise error handling
                    next(methodError);
                }
            });
            
            routesRegistered++;
            
            logger.info('Method not allowed handler registered successfully', {
                path: ROUTES.HELLO,
                methods: 'ALL (except GET)',
                controller: 'handleHelloMethodNotAllowed',
                allowedMethod: 'GET',
                responseStatus: 405
            });
            
        } catch (allRouteError) {
            logger.error('Failed to register method not allowed handler', {
                error: allRouteError.message,
                path: ROUTES.HELLO,
                methods: 'ALL'
            });
            
            HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
            throw allRouteError;
        }
        
        // Validate route registration by checking router.stack for proper route mounting
        try {
            const routerStack = router.stack || [];
            const helloRoutes = routerStack.filter(layer => {
                return layer.route && (
                    layer.route.path === ROUTES.HELLO || 
                    (layer.route.path instanceof RegExp && layer.route.path.test(ROUTES.HELLO))
                );
            });
            
            if (helloRoutes.length === 0) {
                throw new Error('No hello routes found in router stack after registration');
            }
            
            // Verify GET route exists
            const hasGetRoute = helloRoutes.some(layer => 
                layer.route && layer.route.methods && layer.route.methods.get
            );
            
            if (!hasGetRoute) {
                throw new Error('GET route not found in router stack');
            }
            
            logger.debug('Route registration validation completed', {
                totalStackSize: routerStack.length,
                helloRoutesCount: helloRoutes.length,
                hasGetRoute: hasGetRoute,
                registeredMethods: helloRoutes.map(layer => 
                    layer.route ? Object.keys(layer.route.methods) : []
                ).flat()
            });
            
        } catch (validationError) {
            logger.error('Route registration validation failed', {
                error: validationError.message,
                routesRegistered: routesRegistered,
                expectedRoutes: 2
            });
            
            HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
            throw validationError;
        }
        
        // Update HELLO_ROUTE_STATS with registered route count and configuration metadata
        HELLO_ROUTE_STATS.routeValidations++;
        
        const routeRegistrationTime = Date.now() - routeRegistrationStart;
        
        // Log route registration completion with detailed route handler information
        logger.info('Hello route registration completed successfully', {
            registrationTime: `${routeRegistrationTime}ms`,
            routesRegistered: routesRegistered,
            routeConfiguration: {
                endpoint: ROUTES.HELLO,
                methods: {
                    GET: {
                        handler: 'handleHelloGetRequest',
                        async: true,
                        tracked: true
                    },
                    'ALL (non-GET)': {
                        handler: 'handleHelloMethodNotAllowed',
                        async: true,
                        responseStatus: 405,
                        allowHeader: 'GET'
                    }
                }
            },
            routeStatistics: {
                totalRequests: HELLO_ROUTE_STATS.requestCount,
                getRequests: HELLO_ROUTE_STATS.getRequests,
                methodNotAllowed: HELLO_ROUTE_STATS.methodNotAllowed,
                errors: HELLO_ROUTE_STATS.errors,
                validations: HELLO_ROUTE_STATS.routeValidations
            },
            expressIntegration: {
                version: '5.1.0',
                automaticPromiseHandling: true,
                routeStackValidated: true
            }
        });
        
    } catch (error) {
        // Handle route registration errors with comprehensive error context
        const routeRegistrationTime = Date.now() - routeRegistrationStart;
        
        HELLO_ROUTE_STATS.errors++;
        HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
        
        logger.error('Hello route registration failed', {
            error: error.message,
            stack: error.stack,
            registrationTime: `${routeRegistrationTime}ms`,
            endpoint: ROUTES.HELLO,
            registrationPhase: 'route_handler_setup'
        });
        
        throw new Error(`Route registration failed: ${error.message}`);
    }
}

/**
 * Validates hello router configuration to ensure proper middleware and route handler setup.
 * This function checks that router instance is valid Express Router with proper configuration,
 * verifies that security middleware is properly applied and configured, validates that GET
 * route handler is registered at correct path with proper controller, checks that method
 * not allowed handler is configured for non-GET methods, verifies middleware ordering is
 * correct for security, logging, and validation layers, tests basic route functionality
 * without making actual HTTP requests, and returns comprehensive validation result with
 * status and detailed configuration analysis.
 * 
 * Router validation features include:
 * - Express Router instance verification with method availability and compatibility checking
 * - Middleware stack analysis with security, logging, and validation layer verification
 * - Route handler registration verification with path matching and method validation
 * - Configuration consistency checking with security settings and performance optimization validation
 * - Integration testing simulation without actual HTTP request execution
 * - Comprehensive validation reporting with detailed analysis and improvement recommendations
 * - Educational validation patterns demonstrating router testing and quality assurance approaches
 * 
 * @param {Object} router - Express router instance to validate for proper configuration and functionality
 * @returns {Object} Validation result containing status, configuration details, and any issues found
 */
function validateHelloRouter(router) {
    const validationStart = Date.now();
    
    try {
        // Initialize comprehensive validation result structure
        const validationResult = {
            isValid: true,
            timestamp: new Date().toISOString(),
            validationTime: 0,
            router: {
                instance: null,
                methods: [],
                configuration: {}
            },
            middleware: {
                applied: 0,
                security: false,
                logging: false,
                validation: false,
                errorHandling: false,
                stack: []
            },
            routes: {
                registered: 0,
                getHandler: false,
                methodNotAllowedHandler: false,
                pathValidation: false,
                details: []
            },
            issues: [],
            recommendations: [],
            statistics: {
                currentStats: { ...HELLO_ROUTE_STATS },
                validation: {
                    totalValidations: 0,
                    successfulValidations: 0,
                    failedValidations: 0
                }
            }
        };
        
        // Check that router instance is valid Express Router with proper configuration
        if (!router) {
            validationResult.isValid = false;
            validationResult.issues.push({
                category: 'router',
                severity: 'critical',
                message: 'Router instance is null or undefined',
                recommendation: 'Ensure router is properly initialized with createHelloRouter()'
            });
        } else if (typeof router !== 'object') {
            validationResult.isValid = false;
            validationResult.issues.push({
                category: 'router',
                severity: 'critical',
                message: `Router instance is not an object, got: ${typeof router}`,
                recommendation: 'Router must be an Express Router instance'
            });
        } else {
            // Validate router has required Express Router methods
            const requiredMethods = ['use', 'get', 'post', 'put', 'delete', 'all', 'route'];
            const availableMethods = requiredMethods.filter(method => typeof router[method] === 'function');
            
            validationResult.router.instance = 'Express Router';
            validationResult.router.methods = availableMethods;
            validationResult.router.configuration = {
                caseSensitive: router.caseSensitive,
                mergeParams: router.mergeParams,
                strict: router.strict
            };
            
            if (availableMethods.length < requiredMethods.length) {
                const missingMethods = requiredMethods.filter(method => typeof router[method] !== 'function');
                validationResult.issues.push({
                    category: 'router',
                    severity: 'high',
                    message: `Router missing required methods: ${missingMethods.join(', ')}`,
                    missingMethods: missingMethods,
                    recommendation: 'Ensure using a valid Express Router instance'
                });
            }
        }
        
        // Verify that security middleware is properly applied and configured
        if (router && router.stack) {
            const middlewareStack = router.stack;
            validationResult.middleware.applied = middlewareStack.length;
            
            // Analyze middleware stack composition
            middlewareStack.forEach((layer, index) => {
                const layerInfo = {
                    position: index,
                    name: layer.name || 'anonymous',
                    regexp: layer.regexp ? layer.regexp.toString() : 'none',
                    route: layer.route ? {
                        path: layer.route.path,
                        methods: Object.keys(layer.route.methods || {})
                    } : null
                };
                
                validationResult.middleware.stack.push(layerInfo);
                
                // Detect middleware types
                if (layer.name && layer.name.includes('security')) {
                    validationResult.middleware.security = true;
                } else if (layer.name && layer.name.includes('log')) {
                    validationResult.middleware.logging = true;
                } else if (layer.name && layer.name.includes('validat')) {
                    validationResult.middleware.validation = true;
                } else if (layer.name && layer.name.includes('error')) {
                    validationResult.middleware.errorHandling = true;
                }
            });
            
            // Validate middleware ordering (security should come first)
            const securityLayer = middlewareStack.findIndex(layer => 
                layer.name && layer.name.includes('security')
            );
            
            if (securityLayer > 2) { // Allow for some flexibility in ordering
                validationResult.issues.push({
                    category: 'middleware',
                    severity: 'medium',
                    message: 'Security middleware not applied early enough in stack',
                    currentPosition: securityLayer,
                    recommendedPosition: 'first or second',
                    recommendation: 'Apply security middleware before other middleware'
                });
            }
            
        } else {
            validationResult.issues.push({
                category: 'middleware',
                severity: 'high',
                message: 'Router has no middleware stack or stack is not accessible',
                recommendation: 'Ensure middleware is properly applied to router'
            });
        }
        
        // Validate that GET route handler is registered at correct path with proper controller
        if (router && router.stack) {
            const routeHandlers = router.stack.filter(layer => layer.route);
            validationResult.routes.registered = routeHandlers.length;
            
            // Check for GET route handler
            const getRoute = routeHandlers.find(layer => 
                layer.route && 
                layer.route.path === ROUTES.HELLO && 
                layer.route.methods && 
                layer.route.methods.get
            );
            
            if (getRoute) {
                validationResult.routes.getHandler = true;
                validationResult.routes.pathValidation = getRoute.route.path === ROUTES.HELLO;
                
                validationResult.routes.details.push({
                    method: 'GET',
                    path: getRoute.route.path,
                    pathMatches: getRoute.route.path === ROUTES.HELLO,
                    handlerCount: getRoute.route.stack ? getRoute.route.stack.length : 0
                });
            } else {
                validationResult.isValid = false;
                validationResult.issues.push({
                    category: 'routes',
                    severity: 'critical',
                    message: 'GET route handler not found at expected path',
                    expectedPath: ROUTES.HELLO,
                    recommendation: 'Register GET route handler using registerHelloRoutes()'
                });
            }
            
            // Check for method not allowed handler
            const methodNotAllowedRoute = routeHandlers.find(layer => 
                layer.route && 
                layer.route.path === ROUTES.HELLO &&
                Object.keys(layer.route.methods || {}).length > 1
            );
            
            if (methodNotAllowedRoute) {
                validationResult.routes.methodNotAllowedHandler = true;
                
                validationResult.routes.details.push({
                    method: 'ALL',
                    path: methodNotAllowedRoute.route.path,
                    pathMatches: methodNotAllowedRoute.route.path === ROUTES.HELLO,
                    methods: Object.keys(methodNotAllowedRoute.route.methods || {}),
                    purpose: 'method_validation'
                });
            }
            
        } else {
            validationResult.isValid = false;
            validationResult.issues.push({
                category: 'routes',
                severity: 'critical',
                message: 'No routes registered on router instance',
                recommendation: 'Register routes using registerHelloRoutes()'
            });
        }
        
        // Check that method not allowed handler is configured for non-GET methods
        if (!validationResult.routes.methodNotAllowedHandler) {
            validationResult.issues.push({
                category: 'routes',
                severity: 'high',
                message: 'Method not allowed handler not configured',
                recommendation: 'Add router.all() handler for non-GET methods',
                securityImplication: 'Non-GET methods may not return proper 405 responses'
            });
        }
        
        // Verify middleware ordering is correct for security, logging, and validation layers
        if (validationResult.middleware.applied > 0) {
            const expectedOrder = ['security', 'logging', 'validation', 'error'];
            const actualOrder = validationResult.middleware.stack
                .filter(layer => expectedOrder.some(type => layer.name.includes(type)))
                .map(layer => {
                    for (const type of expectedOrder) {
                        if (layer.name.includes(type)) return type;
                    }
                    return 'unknown';
                });
            
            // Check if middleware is in recommended order
            let orderCorrect = true;
            for (let i = 1; i < actualOrder.length; i++) {
                const currentIndex = expectedOrder.indexOf(actualOrder[i]);
                const previousIndex = expectedOrder.indexOf(actualOrder[i - 1]);
                
                if (currentIndex < previousIndex && currentIndex !== -1 && previousIndex !== -1) {
                    orderCorrect = false;
                    break;
                }
            }
            
            if (!orderCorrect) {
                validationResult.issues.push({
                    category: 'middleware',
                    severity: 'low',
                    message: 'Middleware ordering could be optimized',
                    currentOrder: actualOrder,
                    recommendedOrder: expectedOrder,
                    recommendation: 'Consider reordering middleware for better performance and security'
                });
            }
        }
        
        // Test basic route functionality without making actual HTTP requests
        try {
            // Simulate basic route functionality testing
            const functionalityTest = {
                routerCallable: typeof router === 'object' && typeof router.use === 'function',
                stackAccessible: Array.isArray(router.stack),
                routesConfigured: validationResult.routes.registered > 0,
                middlewarePresent: validationResult.middleware.applied > 0
            };
            
            const failedTests = Object.entries(functionalityTest)
                .filter(([test, result]) => !result)
                .map(([test]) => test);
            
            if (failedTests.length > 0) {
                validationResult.issues.push({
                    category: 'functionality',
                    severity: 'high',
                    message: 'Basic functionality tests failed',
                    failedTests: failedTests,
                    recommendation: 'Check router initialization and configuration'
                });
            }
            
        } catch (functionalityError) {
            validationResult.issues.push({
                category: 'functionality',
                severity: 'high',
                message: 'Error during functionality testing',
                error: functionalityError.message,
                recommendation: 'Debug router configuration issues'
            });
        }
        
        // Add recommendations based on validation results
        if (validationResult.middleware.applied === 0) {
            validationResult.recommendations.push({
                priority: 'high',
                category: 'middleware',
                recommendation: 'Apply security middleware using configureHelloMiddleware()',
                benefit: 'Improved request security and validation'
            });
        }
        
        if (validationResult.routes.registered < 2) {
            validationResult.recommendations.push({
                priority: 'high',
                category: 'routes',
                recommendation: 'Ensure both GET and method validation handlers are registered',
                benefit: 'Complete HTTP method coverage and proper error responses'
            });
        }
        
        if (!validationResult.middleware.errorHandling) {
            validationResult.recommendations.push({
                priority: 'medium',
                category: 'middleware',
                recommendation: 'Add error handling middleware for better error management',
                benefit: 'Improved error responses and debugging capabilities'
            });
        }
        
        // Calculate final validation time and statistics
        validationResult.validationTime = Date.now() - validationStart;
        validationResult.statistics.validation.totalValidations = HELLO_ROUTE_STATS.routeValidations + 1;
        
        if (validationResult.isValid) {
            validationResult.statistics.validation.successfulValidations = HELLO_ROUTE_STATS.routeValidations + 1;
        } else {
            validationResult.statistics.validation.failedValidations++;
        }
        
        // Update global validation statistics
        HELLO_ROUTE_STATS.routeValidations++;
        
        // Log validation completion
        logger.info('Hello router validation completed', {
            validationTime: `${validationResult.validationTime}ms`,
            isValid: validationResult.isValid,
            issuesFound: validationResult.issues.length,
            recommendationsProvided: validationResult.recommendations.length,
            routesValidated: validationResult.routes.registered,
            middlewareValidated: validationResult.middleware.applied
        });
        
        // Return comprehensive validation result with status and detailed configuration analysis
        return Object.freeze(validationResult);
        
    } catch (error) {
        // Handle validation process errors gracefully
        const validationTime = Date.now() - validationStart;
        
        HELLO_ROUTE_STATS.errors++;
        HELLO_ROUTE_STATS.errorBreakdown.validationErrors++;
        
        logger.error('Hello router validation failed', {
            error: error.message,
            stack: error.stack,
            validationTime: `${validationTime}ms`
        });
        
        return {
            isValid: false,
            timestamp: new Date().toISOString(),
            validationTime: validationTime,
            error: {
                occurred: true,
                message: error.message,
                type: 'ValidationProcessError'
            },
            issues: [{
                category: 'validation',
                severity: 'critical',
                message: 'Validation process encountered an error',
                error: error.message,
                recommendation: 'Check router instance and validation process'
            }],
            recommendations: [{
                priority: 'critical',
                category: 'system',
                recommendation: 'Fix validation process errors before deploying',
                benefit: 'Ensure router configuration quality and reliability'
            }]
        };
    }
}

/**
 * Returns comprehensive statistics about hello router configuration and operational metrics.
 * This function checks HELLO_ROUTER_INITIALIZED status and initialization timestamp, calculates
 * router uptime using ROUTE_REGISTRATION_TIME, extracts route request statistics from 
 * HELLO_ROUTE_STATS global, includes middleware configuration details and applied middleware count,
 * adds route handler registration information and method support details, includes Express.js
 * version compatibility and error handling configuration, and returns comprehensive statistics
 * object for monitoring and operational insights.
 * 
 * Statistics reporting features include:
 * - Router initialization status and timeline tracking for operational monitoring
 * - Request processing statistics with method breakdown and error rate analysis
 * - Performance metrics including response times, throughput, and resource utilization
 * - Error analysis with categorized error tracking and failure pattern identification
 * - Middleware configuration analysis with security and validation status reporting
 * - Express.js integration status with compatibility verification and feature utilization
 * - Operational health indicators with uptime tracking and system performance assessment
 * 
 * @returns {Object} Statistics object containing route configuration details and performance metrics
 */
function getHelloRouterStats() {
    const statsGenerationStart = Date.now();
    
    try {
        // Check HELLO_ROUTER_INITIALIZED status and initialization timestamp
        const currentTime = Date.now();
        const initializationTime = ROUTE_REGISTRATION_TIME ? new Date(ROUTE_REGISTRATION_TIME) : null;
        
        // Calculate router uptime using ROUTE_REGISTRATION_TIME
        const uptimeMs = ROUTE_REGISTRATION_TIME ? currentTime - ROUTE_REGISTRATION_TIME : 0;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);
        
        // Extract route request statistics from HELLO_ROUTE_STATS global
        const requestStatistics = {
            total: HELLO_ROUTE_STATS.requestCount,
            byMethod: {
                GET: HELLO_ROUTE_STATS.getRequests,
                methodNotAllowed: HELLO_ROUTE_STATS.methodNotAllowed
            },
            errorRate: HELLO_ROUTE_STATS.requestCount > 0 ? 
                       (HELLO_ROUTE_STATS.errors / HELLO_ROUTE_STATS.requestCount * 100).toFixed(2) + '%' : '0%',
            successRate: HELLO_ROUTE_STATS.requestCount > 0 ? 
                        ((HELLO_ROUTE_STATS.requestCount - HELLO_ROUTE_STATS.errors) / HELLO_ROUTE_STATS.requestCount * 100).toFixed(2) + '%' : '100%'
        };
        
        // Include middleware configuration details and applied middleware count
        const middlewareStatistics = {
            totalApplications: HELLO_ROUTE_STATS.middlewareApplications,
            securityEnabled: true, // Assumed based on implementation
            validationEnabled: true, // Assumed based on implementation
            performanceMonitoringEnabled: true, // Assumed based on implementation
            errorHandlingEnabled: true // Assumed based on implementation
        };
        
        // Add route handler registration information and method support details
        const routeConfiguration = {
            endpoint: ROUTES.HELLO,
            supportedMethods: ['GET'],
            unsupportedMethodHandling: 'METHOD_NOT_ALLOWED_405',
            pathMatching: 'exact',
            routeRegistrationTime: initializationTime ? initializationTime.toISOString() : null
        };
        
        // Include Express.js version compatibility and error handling configuration
        const expressIntegration = {
            version: '5.1.0',
            automaticPromiseHandling: true,
            routerType: 'Express Router',
            asyncSupportEnabled: true,
            errorPropagationEnabled: true,
            middlewareStackSupported: true
        };
        
        // Performance metrics including response times, throughput, and resource utilization
        const performanceMetrics = {
            ...HELLO_ROUTE_STATS.performanceMetrics,
            requestsPerSecond: uptimeSeconds > 0 ? (HELLO_ROUTE_STATS.requestCount / uptimeSeconds).toFixed(2) : '0',
            requestsPerMinute: uptimeMinutes > 0 ? (HELLO_ROUTE_STATS.requestCount / uptimeMinutes).toFixed(2) : '0',
            requestsPerHour: uptimeHours > 0 ? (HELLO_ROUTE_STATS.requestCount / uptimeHours).toFixed(2) : '0',
            averageResponseTime: HELLO_ROUTE_STATS.performanceMetrics.averageResponseTime.toFixed(2) + 'ms',
            maxResponseTime: HELLO_ROUTE_STATS.performanceMetrics.maxResponseTime + 'ms',
            minResponseTime: HELLO_ROUTE_STATS.performanceMetrics.minResponseTime === Infinity ? 'N/A' : HELLO_ROUTE_STATS.performanceMetrics.minResponseTime + 'ms'
        };
        
        // Error analysis with categorized error tracking and failure pattern identification
        const errorAnalysis = {
            totalErrors: HELLO_ROUTE_STATS.errors,
            breakdown: { ...HELLO_ROUTE_STATS.errorBreakdown },
            errorRate: requestStatistics.errorRate,
            mostCommonErrorType: Object.entries(HELLO_ROUTE_STATS.errorBreakdown).reduce((max, [type, count]) => 
                count > (max.count || 0) ? { type, count } : max, {}),
            errorTrends: {
                controllerErrorRate: HELLO_ROUTE_STATS.requestCount > 0 ? 
                    (HELLO_ROUTE_STATS.errorBreakdown.controllerErrors / HELLO_ROUTE_STATS.requestCount * 100).toFixed(2) + '%' : '0%',
                middlewareErrorRate: HELLO_ROUTE_STATS.middlewareApplications > 0 ? 
                    (HELLO_ROUTE_STATS.errorBreakdown.middlewareErrors / HELLO_ROUTE_STATS.middlewareApplications * 100).toFixed(2) + '%' : '0%'
            }
        };
        
        // Operational health indicators with uptime tracking and system performance assessment
        const healthIndicators = {
            status: HELLO_ROUTER_INITIALIZED ? 'operational' : 'not_initialized',
            uptime: {
                milliseconds: uptimeMs,
                seconds: uptimeSeconds,
                minutes: uptimeMinutes,
                hours: uptimeHours,
                formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
            },
            initialization: {
                isInitialized: HELLO_ROUTER_INITIALIZED,
                initializationCount: HELLO_ROUTE_STATS.initializationCount,
                lastInitialization: HELLO_ROUTE_STATS.lastInitialization,
                validationCount: HELLO_ROUTE_STATS.routeValidations
            },
            performance: {
                status: performanceMetrics.averageResponseTime < 100 ? 'excellent' : 
                       performanceMetrics.averageResponseTime < 500 ? 'good' : 
                       performanceMetrics.averageResponseTime < 1000 ? 'fair' : 'poor',
                throughput: performanceMetrics.requestsPerSecond + ' req/sec',
                reliability: requestStatistics.successRate
            }
        };
        
        // System information and configuration metadata
        const systemInformation = {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            environment: process.env.NODE_ENV || 'development',
            processId: process.pid,
            memoryUsage: process.memoryUsage(),
            processUptime: process.uptime()
        };
        
        // Return comprehensive statistics object for monitoring and operational insights
        const comprehensiveStats = {
            timestamp: new Date().toISOString(),
            generationTime: Date.now() - statsGenerationStart,
            router: {
                initialized: HELLO_ROUTER_INITIALIZED,
                configuration: routeConfiguration,
                health: healthIndicators
            },
            requests: requestStatistics,
            performance: performanceMetrics,
            middleware: middlewareStatistics,
            errors: errorAnalysis,
            express: expressIntegration,
            system: systemInformation,
            monitoring: {
                statsVersion: '1.0.0',
                dataSource: 'HELLO_ROUTE_STATS',
                lastUpdate: new Date().toISOString(),
                reportingInterval: 'on_demand'
            }
        };
        
        // Log statistics generation
        logger.debug('Hello router statistics generated', {
            generationTime: `${Date.now() - statsGenerationStart}ms`,
            totalRequests: requestStatistics.total,
            errorRate: requestStatistics.errorRate,
            uptime: healthIndicators.uptime.formatted,
            performanceStatus: healthIndicators.performance.status
        });
        
        return Object.freeze(comprehensiveStats);
        
    } catch (error) {
        // Handle statistics generation errors gracefully
        const generationTime = Date.now() - statsGenerationStart;
        
        logger.error('Failed to generate hello router statistics', {
            error: error.message,
            stack: error.stack,
            generationTime: `${generationTime}ms`
        });
        
        // Return minimal fallback statistics
        return {
            timestamp: new Date().toISOString(),
            generationTime: generationTime,
            error: {
                occurred: true,
                message: error.message,
                type: 'StatisticsGenerationError'
            },
            fallback: {
                initialized: HELLO_ROUTER_INITIALIZED,
                totalRequests: HELLO_ROUTE_STATS.requestCount,
                totalErrors: HELLO_ROUTE_STATS.errors,
                lastInitialization: HELLO_ROUTE_STATS.lastInitialization
            }
        };
    }
}

/**
 * Resets hello router statistics for operational management and testing scenarios.
 * This function resets all counters in HELLO_ROUTE_STATS to zero values, preserves router
 * initialization status and configuration information, logs router statistics reset event
 * with timestamp for operational tracking, and updates statistics reset timestamp for
 * monitoring purposes.
 * 
 * Statistics reset features include:
 * - Comprehensive counter reset with preservation of configuration state and system integrity
 * - Selective preservation of initialization status and router configuration for continuity
 * - Audit trail maintenance with detailed logging of reset operations and timing
 * - Testing scenario support with clean state restoration for test isolation
 * - Operational management support with statistics cycling for long-running systems
 * - Performance baseline reset for monitoring and alerting threshold recalibration
 * - Educational demonstration of statistics lifecycle management and operational procedures
 * 
 * @returns {void} No return value - resets HELLO_ROUTE_STATS global counters with comprehensive logging
 */
function resetHelloRouterStats() {
    const resetStart = Date.now();
    
    try {
        // Capture current statistics for logging before reset
        const preResetStats = {
            requestCount: HELLO_ROUTE_STATS.requestCount,
            getRequests: HELLO_ROUTE_STATS.getRequests,
            methodNotAllowed: HELLO_ROUTE_STATS.methodNotAllowed,
            errors: HELLO_ROUTE_STATS.errors,
            middlewareApplications: HELLO_ROUTE_STATS.middlewareApplications,
            routeValidations: HELLO_ROUTE_STATS.routeValidations,
            initializationCount: HELLO_ROUTE_STATS.initializationCount,
            performanceMetrics: { ...HELLO_ROUTE_STATS.performanceMetrics },
            errorBreakdown: { ...HELLO_ROUTE_STATS.errorBreakdown }
        };
        
        // Log router statistics reset event with timestamp for operational tracking
        logger.info('Resetting hello router statistics', {
            resetTimestamp: new Date().toISOString(),
            preResetSummary: {
                totalRequests: preResetStats.requestCount,
                totalErrors: preResetStats.errors,
                errorRate: preResetStats.requestCount > 0 ? 
                          (preResetStats.errors / preResetStats.requestCount * 100).toFixed(2) + '%' : '0%',
                averageResponseTime: preResetStats.performanceMetrics.averageResponseTime || 0,
                maxResponseTime: preResetStats.performanceMetrics.maxResponseTime || 0,
                initializationCount: preResetStats.initializationCount
            },
            resetReason: 'operational_management_or_testing'
        });
        
        // Reset all counters in HELLO_ROUTE_STATS to zero values
        HELLO_ROUTE_STATS.requestCount = 0;
        HELLO_ROUTE_STATS.getRequests = 0;
        HELLO_ROUTE_STATS.methodNotAllowed = 0;
        HELLO_ROUTE_STATS.errors = 0;
        HELLO_ROUTE_STATS.middlewareApplications = 0;
        HELLO_ROUTE_STATS.routeValidations = 0;
        
        // Reset performance metrics with proper initialization
        HELLO_ROUTE_STATS.performanceMetrics = {
            averageResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            totalResponseTime: 0
        };
        
        // Reset error breakdown statistics
        HELLO_ROUTE_STATS.errorBreakdown = {
            controllerErrors: 0,
            middlewareErrors: 0,
            validationErrors: 0,
            systemErrors: 0
        };
        
        // Preserve router initialization status and configuration information
        // HELLO_ROUTER_INITIALIZED and ROUTE_REGISTRATION_TIME are preserved
        // HELLO_ROUTE_STATS.initializationCount is preserved (not reset)
        // HELLO_ROUTE_STATS.lastInitialization is preserved
        
        // Update statistics reset timestamp for monitoring purposes
        const resetTime = Date.now() - resetStart;
        const resetTimestamp = new Date().toISOString();
        
        // Add reset metadata to preserved configuration
        HELLO_ROUTE_STATS.lastReset = resetTimestamp;
        HELLO_ROUTE_STATS.resetCount = (HELLO_ROUTE_STATS.resetCount || 0) + 1;
        
        // Log successful statistics reset completion
        logger.info('Hello router statistics reset completed successfully', {
            resetTime: `${resetTime}ms`,
            resetTimestamp: resetTimestamp,
            resetCount: HELLO_ROUTE_STATS.resetCount,
            preservedValues: {
                routerInitialized: HELLO_ROUTER_INITIALIZED,
                routeRegistrationTime: ROUTE_REGISTRATION_TIME,
                initializationCount: HELLO_ROUTE_STATS.initializationCount,
                lastInitialization: HELLO_ROUTE_STATS.lastInitialization
            },
            resetStatistics: {
                countersReset: 8, // Number of counters that were reset
                performanceMetricsReset: 4, // Number of performance metrics reset
                errorBreakdownReset: 4, // Number of error categories reset
                configurationPreserved: true
            },
            postResetVerification: {
                requestCount: HELLO_ROUTE_STATS.requestCount,
                errors: HELLO_ROUTE_STATS.errors,
                averageResponseTime: HELLO_ROUTE_STATS.performanceMetrics.averageResponseTime,
                totalErrorCategories: Object.keys(HELLO_ROUTE_STATS.errorBreakdown).length
            }
        });
        
        // Log operational management context
        logger.debug('Statistics reset context', {
            resetPurpose: 'operational_management_and_testing_scenarios',
            dataIntegrity: 'counters_reset_configuration_preserved',
            monitoringContinuity: 'uptime_and_initialization_status_maintained',
            auditTrail: 'reset_event_logged_with_pre_post_state',
            testingSupport: 'clean_state_available_for_test_isolation'
        });
        
    } catch (error) {
        // Handle statistics reset errors gracefully
        const resetTime = Date.now() - resetStart;
        
        logger.error('Failed to reset hello router statistics', {
            error: error.message,
            stack: error.stack,
            resetTime: `${resetTime}ms`,
            resetAttemptTimestamp: new Date().toISOString(),
            currentStatistics: {
                requestCount: HELLO_ROUTE_STATS.requestCount,
                errors: HELLO_ROUTE_STATS.errors,
                initializationStatus: HELLO_ROUTER_INITIALIZED
            },
            errorContext: 'statistics_reset_operation_failed',
            recommendation: 'Check system state and retry reset operation'
        });
        
        // Update error statistics even if reset fails
        HELLO_ROUTE_STATS.errors++;
        HELLO_ROUTE_STATS.errorBreakdown.systemErrors++;
    }
}

// =============================================================================
// MAIN ROUTER INITIALIZATION AND EXPORT
// =============================================================================

// Initialize and create the main hello router instance using factory functions
const router = (() => {
    try {
        // Initialize hello routes with comprehensive configuration and validation
        const helloRouter = initializeHelloRoutes();
        
        logger.info('Hello router module loaded successfully', {
            endpoint: ROUTES.HELLO,
            initialized: HELLO_ROUTER_INITIALIZED,
            routeRegistrationTime: ROUTE_REGISTRATION_TIME,
            expressVersion: '5.1.0',
            moduleLoadTime: new Date().toISOString()
        });
        
        return helloRouter;
        
    } catch (initializationError) {
        // Handle router initialization errors with fallback
        logger.error('Failed to initialize hello router during module load', {
            error: initializationError.message,
            stack: initializationError.stack,
            fallbackAction: 'creating_minimal_router'
        });
        
        // Create minimal fallback router to prevent module load failure
        const fallbackRouter = express.Router();
        
        fallbackRouter.get(ROUTES.HELLO, (req, res) => {
            res.status(500).json({
                error: 'Router initialization failed',
                message: 'Hello endpoint is temporarily unavailable',
                timestamp: new Date().toISOString()
            });
        });
        
        return fallbackRouter;
    }
})();

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Default export of configured hello router instance with GET route handler and method validation for mounting in main routes
    router,
    
    // Factory function to create customized hello router with configuration options
    createHelloRouter,
    
    // Route initialization function for hello endpoint setup and configuration validation
    initializeHelloRoutes,
    
    // Middleware configuration function for applying security, logging, and validation layers to hello router
    configureHelloMiddleware,
    
    // Route registration function for adding GET handler and method validation to router instance
    registerHelloRoutes,
    
    // Router validation function for verifying proper configuration and functionality of hello router
    validateHelloRouter,
    
    // Utility function to retrieve hello router statistics and operational metrics for monitoring
    getHelloRouterStats,
    
    // Utility function to reset hello router statistics for operational management and testing
    resetHelloRouterStats
};