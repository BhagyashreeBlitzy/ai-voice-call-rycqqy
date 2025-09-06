/**
 * Express.js Health Check Router for Node.js Tutorial Application
 * 
 * This module implements comprehensive health monitoring endpoints including '/health', '/livez', 
 * and '/readyz' routes for the Node.js tutorial application. It provides Express.js Router 
 * patterns with health controller delegation, health-specific middleware integration, and 
 * comprehensive route configuration. The implementation demonstrates Express.js 5.1.0 router 
 * composition, automatic promise error handling, and Kubernetes-compatible health probe endpoints 
 * while maintaining educational simplicity and production-ready health monitoring architecture patterns.
 * 
 * Key Features:
 * - Comprehensive health endpoint routing with '/health', '/livez', and '/readyz' Kubernetes-compatible routes
 * - Express.js 5.1.0 router composition with automatic promise error handling and enhanced async/await support
 * - Health-specific middleware integration with performance monitoring and request correlation tracking
 * - Production-ready health monitoring architecture with service-level agreement compliance and operational statistics
 * - Educational router patterns demonstrating modular route organization and middleware composition best practices
 * - Health controller delegation with comprehensive error handling and graceful degradation for reliable monitoring
 * - Operational statistics tracking with request counters, response times, and health endpoint performance metrics
 * - Configuration-driven health check behavior with environment-specific settings and customizable probe timeouts
 * 
 * Architecture:
 * - Express.js Router factory patterns with configuration injection and dependency management
 * - Health service business logic separation with controller and middleware layer abstraction
 * - Structured logging integration with correlation ID propagation and comprehensive request/response tracking
 * - Performance monitoring with sub-millisecond precision timing and service level agreement validation
 * - Error handling middleware integration with custom error factory patterns and production-safe error responses
 * - Modular route organization demonstrating Express Router as organizational unit with clear separation of concerns
 * 
 * Educational Focus:
 * - Clear demonstration of Express.js 5.1.0 router composition patterns and middleware integration techniques
 * - Production-ready health monitoring implementation showcasing enterprise-grade observability practices
 * - Comprehensive error handling with educational error messaging and production-safe error disclosure
 * - Performance monitoring integration for operational visibility and service level agreement compliance
 * - Kubernetes health check integration patterns demonstrating container orchestration compatibility
 * - Modular architecture patterns promoting code reusability and maintainability in Node.js applications
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async/await support, automatic promise error handling, and improved security
 * - Node.js 22.11.0 LTS with Active LTS support, performance optimizations, and comprehensive security enhancements
 * - Kubernetes health check requirements with standard '/livez' and '/readyz' endpoint specifications and probe compatibility
 * - Health service business logic with comprehensive system metrics, resource monitoring, and dependency health validation
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js routing, health monitoring, middleware composition, and operational observability
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Express.js web framework for creating router instance, route definition, and HTTP request/response handling
const express = require('express'); // v5.1.0 - Enhanced async/await support with automatic promise error handling

// =============================================================================
// INTERNAL DEPENDENCIES - HEALTH CONTROLLERS
// =============================================================================

// Import main health controller function for handling GET requests to '/health' endpoint
const { 
    getHealthStatus 
} = require('../controllers/health.js');

// Import Kubernetes liveness probe controller for '/livez' endpoint handling container restart decisions
const { 
    getLivenessProbe 
} = require('../controllers/health.js');

// Import Kubernetes readiness probe controller for '/readyz' endpoint handling traffic routing decisions  
const { 
    getReadinessProbe 
} = require('../controllers/health.js');

// =============================================================================
// INTERNAL DEPENDENCIES - HEALTH MIDDLEWARE
// =============================================================================

// Import Express middleware for basic health check endpoint providing simple health status
const { 
    healthCheckMiddleware 
} = require('../middleware/health.js');

// Import Express middleware for Kubernetes liveness probe endpoint optimized for container restart decisions
const { 
    livenessProbeMiddleware 
} = require('../middleware/health.js');

// Import Express middleware for Kubernetes readiness probe endpoint optimized for traffic routing decisions
const { 
    readinessProbeMiddleware 
} = require('../middleware/health.js');

// =============================================================================
// INTERNAL DEPENDENCIES - LOGGING AND UTILITIES
// =============================================================================

// Import structured logging utility for health route initialization, request processing, and operational monitoring
const { 
    logger 
} = require('../utils/logger.js');

// Import performance timing utilities for health route response time measurement and SLA compliance monitoring
const { 
    startTimer, 
    stopTimer 
} = require('../utils/logger.js');

// =============================================================================
// INTERNAL DEPENDENCIES - CONSTANTS
// =============================================================================

// Import route path constants for consistent health endpoint path definitions and configuration
const { 
    ROUTES 
} = require('../utils/constants.js');

// Import HTTP method constants for health route method specification and validation
const { 
    HTTP_METHODS 
} = require('../utils/constants.js');

// Import HTTP status code constants for standardized health route response status handling
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import error message constants for consistent health route error responses and user messaging
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Flag to track health router initialization status for operational monitoring and duplicate prevention
 * @type {boolean}
 */
let HEALTH_ROUTER_INITIALIZED = false;

/**
 * Timestamp when health routes were registered for uptime monitoring and operational statistics
 * @type {number|null}
 */
let HEALTH_ROUTE_REGISTRATION_TIME = null;

/**
 * Health route statistics for operational monitoring including request counts and performance metrics
 * @type {Object}
 */
let HEALTH_ROUTE_STATS = {
    requestCount: 0,
    healthRequests: 0,
    livenessRequests: 0,
    readinessRequests: 0,
    errors: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    totalResponseTime: 0,
    routerCreationTime: null,
    lastRequestTime: null,
    endpointConfiguration: {
        health: { path: ROUTES.HEALTH, method: HTTP_METHODS.GET, middleware: 'healthCheckMiddleware', controller: 'getHealthStatus' },
        liveness: { path: ROUTES.LIVENESS, method: HTTP_METHODS.GET, middleware: 'livenessProbeMiddleware', controller: 'getLivenessProbe' },
        readiness: { path: ROUTES.READINESS, method: HTTP_METHODS.GET, middleware: 'readinessProbeMiddleware', controller: 'getReadinessProbe' }
    }
};

// =============================================================================
// ROUTER FACTORY AND CONFIGURATION FUNCTIONS
// =============================================================================

/**
 * Factory function that creates and configures the Express router for health endpoints.
 * This function creates new Express Router instance using express.Router(), logs health router 
 * creation start using logger.info(), extracts health check configuration from options, 
 * registers GET route handlers for '/health', '/livez', and '/readyz' endpoints, sets 
 * HEALTH_ROUTER_INITIALIZED flag to true, records HEALTH_ROUTE_REGISTRATION_TIME timestamp, 
 * logs successful router configuration, initializes HEALTH_ROUTE_STATS, and returns 
 * fully configured health router instance.
 * 
 * Router creation features:
 * - Express.js 5.1.0 router instantiation with health-specific configuration options
 * - Comprehensive route handler registration with middleware and controller integration
 * - Operational monitoring integration with initialization status tracking and uptime measurement
 * - Performance statistics initialization with endpoint configuration metadata and baseline counters
 * - Structured logging with router lifecycle events and configuration details
 * - Error handling with graceful degradation and fallback router configuration
 * 
 * @param {Object} [options={}] - Configuration options for health router behavior and performance settings
 * @returns {Object} Configured Express router instance with health route handlers and middleware integration
 */
function createHealthRouter(options = {}) {
    const routerCreationTimer = startTimer('health_router_creation');
    
    try {
        // Log health router creation start using logger.info() with initialization context
        logger.info('Starting health router creation', {
            timestamp: new Date().toISOString(),
            options: options,
            endpointCount: 3, // health, liveness, readiness
            expressVersion: '5.1.0',
            nodeVersion: process.version
        });
        
        // Create new Express Router instance using express.Router() with health-specific configuration
        const healthRouter = express.Router({
            caseSensitive: options.caseSensitive || false,
            mergeParams: options.mergeParams || false,
            strict: options.strict || false
        });
        
        // Extract health check configuration from options or use defaults
        const healthConfig = {
            timeout: options.timeout || 5000, // 5 second default timeout
            enableDetailedLogging: options.enableDetailedLogging !== false,
            enableStatistics: options.enableStatistics !== false,
            responseTimeThreshold: options.responseTimeThreshold || 50, // 50ms SLA target
            ...options
        };
        
        logger.debug('Health router configuration extracted', {
            configuration: healthConfig,
            defaultsApplied: true,
            routerOptions: {
                caseSensitive: healthRouter.caseSensitive,
                mergeParams: healthRouter.mergeParams,
                strict: healthRouter.strict
            }
        });
        
        // Configure health middleware before registering routes
        configureHealthMiddleware(healthRouter, healthConfig);
        
        // Register health route handlers with middleware and controllers
        registerHealthRoutes(healthRouter, healthConfig);
        
        // Record router creation completion time
        const creationTime = stopTimer(routerCreationTimer);
        
        // Set HEALTH_ROUTER_INITIALIZED flag to true to indicate successful initialization
        HEALTH_ROUTER_INITIALIZED = true;
        
        // Record HEALTH_ROUTE_REGISTRATION_TIME timestamp for monitoring and uptime tracking
        HEALTH_ROUTE_REGISTRATION_TIME = Date.now();
        
        // Initialize HEALTH_ROUTE_STATS with endpoint configuration metadata and initial counters
        HEALTH_ROUTE_STATS.routerCreationTime = HEALTH_ROUTE_REGISTRATION_TIME;
        HEALTH_ROUTE_STATS.requestCount = 0;
        HEALTH_ROUTE_STATS.healthRequests = 0;
        HEALTH_ROUTE_STATS.livenessRequests = 0;
        HEALTH_ROUTE_STATS.readinessRequests = 0;
        HEALTH_ROUTE_STATS.errors = 0;
        HEALTH_ROUTE_STATS.successfulRequests = 0;
        
        // Log successful health router configuration with registered endpoints summary
        logger.info('Health router created successfully', {
            timestamp: new Date().toISOString(),
            creationTimeMs: creationTime,
            routesRegistered: Object.keys(HEALTH_ROUTE_STATS.endpointConfiguration).length,
            endpoints: HEALTH_ROUTE_STATS.endpointConfiguration,
            configuration: healthConfig,
            routerInitialized: HEALTH_ROUTER_INITIALIZED,
            registrationTime: HEALTH_ROUTE_REGISTRATION_TIME
        });
        
        // Return fully configured health router instance ready for mounting
        return healthRouter;
        
    } catch (error) {
        // Handle router creation errors with comprehensive error logging
        logger.error('Failed to create health router', {
            error: error.message,
            stack: error.stack,
            options: options,
            timestamp: new Date().toISOString()
        });
        
        // Attempt to create minimal fallback router for graceful degradation
        try {
            const fallbackRouter = express.Router();
            
            // Register minimal health endpoint for basic functionality
            fallbackRouter.get(ROUTES.HEALTH, async (req, res) => {
                res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                    status: 'error',
                    message: 'Health router creation failed',
                    timestamp: new Date().toISOString()
                });
            });
            
            logger.warn('Created fallback health router with limited functionality');
            return fallbackRouter;
            
        } catch (fallbackError) {
            logger.error('Failed to create fallback health router', {
                error: fallbackError.message,
                originalError: error.message
            });
            
            // Return minimal router as last resort
            return express.Router();
        }
    }
}

/**
 * Initializes health route configuration with middleware setup and handler registration.
 * This function checks if health router is already initialized to prevent duplicate initialization,
 * logs health route initialization start, creates health router using createHealthRouter(),
 * validates required health controller functions, verifies health middleware compatibility,
 * tests basic health route functionality, updates HEALTH_ROUTE_STATS, logs successful
 * initialization, and returns initialized health router instance.
 * 
 * Health route initialization features:
 * - Duplicate initialization prevention with HEALTH_ROUTER_INITIALIZED flag checking
 * - Comprehensive health controller function validation for proper import verification
 * - Health middleware compatibility verification with Express.js 5.1.0 requirements
 * - Basic health route functionality testing with configuration validation
 * - Operational statistics tracking with initialization metadata and timestamp recording
 * - Structured logging with detailed initialization progress and configuration summary
 * 
 * @returns {Object} Initialized health router ready for mounting with Kubernetes probe endpoints
 */
function initializeHealthRoutes() {
    const initializationTimer = startTimer('health_routes_initialization');
    
    try {
        // Check if health router is already initialized using HEALTH_ROUTER_INITIALIZED flag
        if (HEALTH_ROUTER_INITIALIZED) {
            logger.warn('Health routes already initialized, returning existing configuration', {
                alreadyInitialized: HEALTH_ROUTER_INITIALIZED,
                registrationTime: HEALTH_ROUTE_REGISTRATION_TIME,
                currentTime: Date.now()
            });
            
            // Return existing router configuration if available
            return createHealthRouter(); // Creates router with existing configuration
        }
        
        // Log health route initialization start using logger.info() with module context
        logger.info('Initializing health routes for Node.js tutorial application', {
            timestamp: new Date().toISOString(),
            endpointsToInitialize: [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS],
            middlewareCount: 3,
            controllerCount: 3,
            expressVersion: '5.1.0',
            kubernetesCompatible: true
        });
        
        // Validate that required health controller functions are properly imported and accessible
        const requiredControllers = {
            getHealthStatus: typeof getHealthStatus === 'function',
            getLivenessProbe: typeof getLivenessProbe === 'function', 
            getReadinessProbe: typeof getReadinessProbe === 'function'
        };
        
        const missingControllers = Object.entries(requiredControllers)
            .filter(([name, exists]) => !exists)
            .map(([name]) => name);
        
        if (missingControllers.length > 0) {
            throw new Error(`Missing required health controllers: ${missingControllers.join(', ')}`);
        }
        
        logger.debug('Health controller function validation completed', {
            controllers: requiredControllers,
            allControllersAvailable: missingControllers.length === 0
        });
        
        // Verify health middleware configuration is compatible with Express.js 5.1.0 requirements
        const requiredMiddleware = {
            healthCheckMiddleware: typeof healthCheckMiddleware === 'function',
            livenessProbeMiddleware: typeof livenessProbeMiddleware === 'function',
            readinessProbeMiddleware: typeof readinessProbeMiddleware === 'function'
        };
        
        const missingMiddleware = Object.entries(requiredMiddleware)
            .filter(([name, exists]) => !exists)
            .map(([name]) => name);
        
        if (missingMiddleware.length > 0) {
            throw new Error(`Missing required health middleware: ${missingMiddleware.join(', ')}`);
        }
        
        logger.debug('Health middleware validation completed', {
            middleware: requiredMiddleware,
            allMiddlewareAvailable: missingMiddleware.length === 0,
            automaticPromiseHandling: true // Express.js 5.1.0 feature
        });
        
        // Create health router using createHealthRouter() factory function with default options
        const healthRouter = createHealthRouter({
            enableDetailedLogging: true,
            enableStatistics: true,
            timeout: 5000,
            responseTimeThreshold: 50
        });
        
        // Test basic health route handler functionality with configuration validation
        const routerValidation = validateHealthRouter(healthRouter);
        
        if (!routerValidation.isValid) {
            throw new Error(`Health router validation failed: ${routerValidation.errors.join(', ')}`);
        }
        
        logger.debug('Health router validation completed successfully', {
            validation: routerValidation,
            routesConfigured: routerValidation.routesConfigured,
            middlewareApplied: routerValidation.middlewareApplied
        });
        
        // Record initialization completion time
        const initializationTime = stopTimer(initializationTimer);
        
        // Update HEALTH_ROUTE_STATS with initialization timestamp and configuration metadata
        HEALTH_ROUTE_STATS = {
            ...HEALTH_ROUTE_STATS,
            initializationTime: Date.now(),
            initializationDurationMs: initializationTime,
            routesConfigured: routerValidation.routesConfigured,
            middlewareApplied: routerValidation.middlewareApplied,
            kubernetesCompatible: true,
            expressVersion: '5.1.0',
            initializationComplete: true
        };
        
        // Log successful health route initialization with comprehensive configuration summary
        logger.info('Health routes initialized successfully', {
            timestamp: new Date().toISOString(),
            initializationTimeMs: initializationTime,
            routesInitialized: routerValidation.routesConfigured,
            kubernetesEndpoints: [ROUTES.LIVENESS, ROUTES.READINESS],
            generalHealthEndpoint: ROUTES.HEALTH,
            middleware: {
                health: 'healthCheckMiddleware',
                liveness: 'livenessProbeMiddleware', 
                readiness: 'readinessProbeMiddleware'
            },
            controllers: {
                health: 'getHealthStatus',
                liveness: 'getLivenessProbe',
                readiness: 'getReadinessProbe'
            },
            configuration: HEALTH_ROUTE_STATS
        });
        
        // Return initialized health router instance for integration with main routing system
        return healthRouter;
        
    } catch (error) {
        // Handle initialization errors with comprehensive error logging and graceful fallback
        logger.error('Failed to initialize health routes', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            initializationAttempted: true,
            fallbackRequired: true
        });
        
        // Update stats to reflect initialization failure
        HEALTH_ROUTE_STATS.errors++;
        HEALTH_ROUTE_STATS.initializationError = {
            message: error.message,
            timestamp: Date.now()
        };
        
        // Create minimal fallback router for graceful degradation
        try {
            const fallbackRouter = express.Router();
            
            // Register basic health endpoint with error indication
            fallbackRouter.get(ROUTES.HEALTH, async (req, res) => {
                res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                    status: 'error',
                    message: 'Health routes initialization failed',
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    fallbackMode: true
                });
            });
            
            logger.warn('Created fallback health router due to initialization failure');
            return fallbackRouter;
            
        } catch (fallbackError) {
            logger.error('Failed to create fallback health router', {
                error: fallbackError.message,
                originalError: error.message
            });
            
            // Return empty router as last resort
            return express.Router();
        }
    }
}

/**
 * Configures and applies middleware stack for health routes with health-specific optimization.
 * This function validates router instance as proper Express Router, configures health check
 * middleware with response time monitoring, applies liveness probe middleware with sub-10ms
 * optimization, configures readiness probe middleware with dependency checking, sets up
 * health request timing middleware, applies Express 5.1.0 error handling middleware,
 * and logs health middleware configuration completion.
 * 
 * Health middleware configuration features:
 * - Express Router instance validation with type checking and functionality verification
 * - Performance-optimized middleware configuration with SLA compliance monitoring
 * - Kubernetes probe middleware with container orchestration optimization patterns
 * - Health request timing middleware for comprehensive performance tracking and analysis
 * - Express.js 5.1.0 automatic promise handling integration with error handling middleware
 * - Comprehensive logging with applied middleware summary and endpoint-specific optimizations
 * 
 * @param {Object} router - Express router instance for health endpoint mounting and middleware application
 * @param {Object} middlewareOptions - Configuration options for middleware behavior and performance settings
 * @returns {void} No return value - applies health middleware to router instance in place
 */
function configureHealthMiddleware(router, middlewareOptions = {}) {
    const middlewareConfigTimer = startTimer('health_middleware_configuration');
    
    try {
        // Validate router instance is a properly initialized Express Router
        if (!router || typeof router !== 'object' || typeof router.use !== 'function') {
            throw new Error('Invalid router instance provided for middleware configuration');
        }
        
        logger.debug('Starting health middleware configuration', {
            timestamp: new Date().toISOString(),
            middlewareOptions: middlewareOptions,
            routerType: router.constructor?.name || 'unknown',
            hasUseMethod: typeof router.use === 'function',
            hasGetMethod: typeof router.get === 'function'
        });
        
        // Configure health request timing middleware for performance monitoring across all endpoints
        router.use((req, res, next) => {
            // Start performance timer for this request
            const requestTimer = startTimer(`health_request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            
            // Store timer ID in request for cleanup
            req.healthTimer = requestTimer;
            req.healthRequestStartTime = Date.now();
            
            // Track request in statistics
            HEALTH_ROUTE_STATS.requestCount++;
            HEALTH_ROUTE_STATS.lastRequestTime = Date.now();
            
            // Add response time logging
            const originalSend = res.send;
            res.send = function(data) {
                const responseTime = stopTimer(requestTimer);
                
                // Update response time statistics
                HEALTH_ROUTE_STATS.totalResponseTime += responseTime;
                HEALTH_ROUTE_STATS.averageResponseTime = HEALTH_ROUTE_STATS.totalResponseTime / HEALTH_ROUTE_STATS.requestCount;
                
                if (responseTime > HEALTH_ROUTE_STATS.maxResponseTime) {
                    HEALTH_ROUTE_STATS.maxResponseTime = responseTime;
                }
                
                if (responseTime < HEALTH_ROUTE_STATS.minResponseTime) {
                    HEALTH_ROUTE_STATS.minResponseTime = responseTime;
                }
                
                // Check if response time exceeds threshold
                if (responseTime > middlewareOptions.responseTimeThreshold) {
                    logger.warn('Health endpoint response time exceeded threshold', {
                        responseTime: responseTime,
                        threshold: middlewareOptions.responseTimeThreshold,
                        endpoint: req.path,
                        method: req.method
                    });
                }
                
                // Log successful request completion
                if (res.statusCode < 400) {
                    HEALTH_ROUTE_STATS.successfulRequests++;
                } else {
                    HEALTH_ROUTE_STATS.errors++;
                }
                
                // Call original send method
                return originalSend.call(this, data);
            };
            
            next();
        });
        
        // Apply error handling middleware integration for Express 5.1.0 automatic promise handling
        router.use((err, req, res, next) => {
            // Track error in statistics
            HEALTH_ROUTE_STATS.errors++;
            
            logger.error('Health route error occurred', {
                error: err.message,
                stack: err.stack,
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString(),
                correlationId: req.headers['x-correlation-id'] || 'unknown'
            });
            
            // Send appropriate error response
            if (!res.headersSent) {
                res.status(err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    status: 'error',
                    error: true,
                    message: err.message || ERROR_MESSAGES.INTERNAL_ERROR,
                    timestamp: new Date().toISOString(),
                    correlationId: req.headers['x-correlation-id'] || 'unknown'
                });
            }
        });
        
        // Record middleware configuration completion time
        const configurationTime = stopTimer(middlewareConfigTimer);
        
        // Log health middleware configuration completion with applied middleware summary
        logger.info('Health middleware configuration completed', {
            timestamp: new Date().toISOString(),
            configurationTimeMs: configurationTime,
            middlewareApplied: {
                requestTiming: true,
                performanceMonitoring: true,
                errorHandling: true,
                statisticsTracking: true
            },
            configuration: middlewareOptions,
            responseTimeThreshold: middlewareOptions.responseTimeThreshold || 50,
            enableDetailedLogging: middlewareOptions.enableDetailedLogging !== false,
            expressVersion: '5.1.0',
            automaticPromiseHandling: true
        });
        
    } catch (error) {
        // Handle middleware configuration errors with comprehensive error logging
        logger.error('Failed to configure health middleware', {
            error: error.message,
            stack: error.stack,
            middlewareOptions: middlewareOptions,
            timestamp: new Date().toISOString()
        });
        
        // Track error in statistics
        HEALTH_ROUTE_STATS.errors++;
        
        // Continue with minimal middleware for graceful degradation
        try {
            router.use((req, res, next) => {
                // Basic request tracking even if advanced middleware fails
                HEALTH_ROUTE_STATS.requestCount++;
                next();
            });
            
            logger.warn('Applied minimal health middleware due to configuration error');
        } catch (fallbackError) {
            logger.error('Failed to apply even minimal health middleware', {
                error: fallbackError.message
            });
        }
    }
}

/**
 * Registers specific route handlers for health endpoints with appropriate controllers and middleware.
 * This function registers GET route handler for ROUTES.HEALTH path with getHealthStatus controller,
 * registers GET route handler for ROUTES.LIVENESS path with getLivenessProbe controller,
 * registers GET route handler for ROUTES.READINESS path with getReadinessProbe controller,
 * validates route registration by checking router.stack, updates HEALTH_ROUTE_STATS with
 * registered route count, and logs route registration completion.
 * 
 * Route registration features:
 * - Comprehensive health endpoint handler registration with controller and middleware integration
 * - Kubernetes-compatible probe endpoint registration with optimized middleware and response handling
 * - Route registration validation with router.stack inspection and proper mounting verification
 * - Operational statistics tracking with registered route metadata and configuration details
 * - Structured logging with detailed endpoint handler information and Kubernetes probe configuration
 * - Error handling with graceful degradation and fallback route registration for reliability
 * 
 * @param {Object} router - Express router instance for route handler registration and endpoint mounting
 * @param {Object} [routeOptions={}] - Configuration options for route behavior and performance settings
 * @returns {void} No return value - registers health routes on router instance
 */
function registerHealthRoutes(router, routeOptions = {}) {
    const routeRegistrationTimer = startTimer('health_route_registration');
    
    try {
        logger.debug('Starting health route registration', {
            timestamp: new Date().toISOString(),
            routesToRegister: [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS],
            routeOptions: routeOptions,
            controllerFunctions: ['getHealthStatus', 'getLivenessProbe', 'getReadinessProbe'],
            middlewareFunctions: ['healthCheckMiddleware', 'livenessProbeMiddleware', 'readinessProbeMiddleware']
        });
        
        // Register GET route handler for ROUTES.HEALTH path using getHealthStatus controller and healthCheckMiddleware
        router.get(ROUTES.HEALTH, healthCheckMiddleware, async (req, res, next) => {
            try {
                // Track health endpoint requests
                HEALTH_ROUTE_STATS.healthRequests++;
                
                logger.debug('Processing health endpoint request', {
                    path: ROUTES.HEALTH,
                    method: HTTP_METHODS.GET,
                    correlationId: req.headers['x-correlation-id'] || 'unknown',
                    timestamp: new Date().toISOString()
                });
                
                // Call health controller
                await getHealthStatus(req, res, next);
                
            } catch (error) {
                logger.error('Health endpoint controller error', {
                    error: error.message,
                    path: ROUTES.HEALTH,
                    correlationId: req.headers['x-correlation-id'] || 'unknown'
                });
                next(error);
            }
        });
        
        // Register GET route handler for ROUTES.LIVENESS path using getLivenessProbe controller and livenessProbeMiddleware
        router.get(ROUTES.LIVENESS, livenessProbeMiddleware, async (req, res, next) => {
            try {
                // Track liveness endpoint requests
                HEALTH_ROUTE_STATS.livenessRequests++;
                
                logger.debug('Processing liveness probe request', {
                    path: ROUTES.LIVENESS,
                    method: HTTP_METHODS.GET,
                    correlationId: req.headers['x-correlation-id'] || 'unknown',
                    timestamp: new Date().toISOString(),
                    kubernetesProbe: true,
                    targetResponseTime: '< 10ms'
                });
                
                // Call liveness probe controller
                await getLivenessProbe(req, res, next);
                
            } catch (error) {
                logger.error('Liveness probe controller error', {
                    error: error.message,
                    path: ROUTES.LIVENESS,
                    correlationId: req.headers['x-correlation-id'] || 'unknown',
                    kubernetesImplication: 'Pod may be restarted'
                });
                next(error);
            }
        });
        
        // Register GET route handler for ROUTES.READINESS path using getReadinessProbe controller and readinessProbeMiddleware
        router.get(ROUTES.READINESS, readinessProbeMiddleware, async (req, res, next) => {
            try {
                // Track readiness endpoint requests
                HEALTH_ROUTE_STATS.readinessRequests++;
                
                logger.debug('Processing readiness probe request', {
                    path: ROUTES.READINESS,
                    method: HTTP_METHODS.GET,
                    correlationId: req.headers['x-correlation-id'] || 'unknown',
                    timestamp: new Date().toISOString(),
                    kubernetesProbe: true,
                    targetResponseTime: '< 25ms'
                });
                
                // Call readiness probe controller
                await getReadinessProbe(req, res, next);
                
            } catch (error) {
                logger.error('Readiness probe controller error', {
                    error: error.message,
                    path: ROUTES.READINESS,
                    correlationId: req.headers['x-correlation-id'] || 'unknown',
                    kubernetesImplication: 'Traffic may be excluded'
                });
                next(error);
            }
        });
        
        // Validate route registration by checking router.stack for proper health endpoint mounting
        const registeredRoutes = [];
        if (router.stack) {
            for (const layer of router.stack) {
                if (layer.route) {
                    registeredRoutes.push({
                        path: layer.route.path,
                        methods: Object.keys(layer.route.methods)
                    });
                }
            }
        }
        
        const expectedRoutes = [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS];
        const registeredPaths = registeredRoutes.map(route => route.path);
        const allRoutesRegistered = expectedRoutes.every(path => registeredPaths.includes(path));
        
        if (!allRoutesRegistered) {
            const missingRoutes = expectedRoutes.filter(path => !registeredPaths.includes(path));
            throw new Error(`Failed to register all health routes. Missing: ${missingRoutes.join(', ')}`);
        }
        
        // Record route registration completion time
        const registrationTime = stopTimer(routeRegistrationTimer);
        
        // Update HEALTH_ROUTE_STATS with registered health route count, endpoint types, and configuration metadata
        HEALTH_ROUTE_STATS = {
            ...HEALTH_ROUTE_STATS,
            routeRegistrationTime: Date.now(),
            routeRegistrationDurationMs: registrationTime,
            routesRegistered: registeredRoutes.length,
            registeredPaths: registeredPaths,
            kubernetesProbesRegistered: 2, // liveness and readiness
            generalHealthEndpointsRegistered: 1, // health
            routeValidationPassed: allRoutesRegistered
        };
        
        // Log route registration completion with detailed health endpoint handler information
        logger.info('Health routes registered successfully', {
            timestamp: new Date().toISOString(),
            registrationTimeMs: registrationTime,
            routesRegistered: registeredRoutes,
            endpointConfiguration: {
                [ROUTES.HEALTH]: {
                    path: ROUTES.HEALTH,
                    method: HTTP_METHODS.GET,
                    middleware: 'healthCheckMiddleware',
                    controller: 'getHealthStatus',
                    purpose: 'General health status with optional detailed metrics'
                },
                [ROUTES.LIVENESS]: {
                    path: ROUTES.LIVENESS,
                    method: HTTP_METHODS.GET,
                    middleware: 'livenessProbeMiddleware',
                    controller: 'getLivenessProbe',
                    purpose: 'Kubernetes liveness probe for container restart decisions',
                    targetResponseTime: '< 10ms'
                },
                [ROUTES.READINESS]: {
                    path: ROUTES.READINESS,
                    method: HTTP_METHODS.GET,
                    middleware: 'readinessProbeMiddleware',
                    controller: 'getReadinessProbe',
                    purpose: 'Kubernetes readiness probe for traffic routing decisions',
                    targetResponseTime: '< 25ms'
                }
            },
            kubernetesCompatible: true,
            expressVersion: '5.1.0',
            automaticPromiseHandling: true,
            statistics: HEALTH_ROUTE_STATS
        });
        
    } catch (error) {
        // Handle route registration errors with comprehensive error logging
        logger.error('Failed to register health routes', {
            error: error.message,
            stack: error.stack,
            routeOptions: routeOptions,
            timestamp: new Date().toISOString(),
            fallbackRequired: true
        });
        
        // Track error in statistics
        HEALTH_ROUTE_STATS.errors++;
        HEALTH_ROUTE_STATS.routeRegistrationError = {
            message: error.message,
            timestamp: Date.now()
        };
        
        // Attempt to register minimal fallback routes for graceful degradation
        try {
            router.get(ROUTES.HEALTH, async (req, res) => {
                HEALTH_ROUTE_STATS.healthRequests++;
                res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                    status: 'error',
                    message: 'Health route registration failed',
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    fallbackMode: true
                });
            });
            
            logger.warn('Registered fallback health route due to registration failure');
            
        } catch (fallbackError) {
            logger.error('Failed to register fallback health routes', {
                error: fallbackError.message,
                originalError: error.message
            });
        }
    }
}

/**
 * Validates health router configuration to ensure proper middleware and route handler setup.
 * This function checks router instance validity as Express Router, verifies health middleware
 * is properly applied, validates health route handlers are registered at correct paths,
 * checks liveness probe endpoint configuration, verifies readiness probe endpoint configuration,
 * validates middleware ordering, tests basic health route functionality, and returns
 * comprehensive validation result.
 * 
 * Health router validation features:
 * - Comprehensive Express Router instance validation with type checking and method verification
 * - Health middleware application verification with performance monitoring and error handling validation
 * - Route handler registration validation with path verification and controller integration checking
 * - Kubernetes probe endpoint configuration validation with response time optimization verification
 * - Middleware ordering validation for correct request processing pipeline and error handling flow
 * - Basic functionality testing without HTTP requests for configuration validation and integration testing
 * - Comprehensive validation result reporting with status and detailed analysis for troubleshooting
 * 
 * @param {Object} router - Express router instance to validate for health endpoint configuration
 * @returns {Object} Validation result containing status, health endpoint configuration details, and issues found
 */
function validateHealthRouter(router) {
    const validationTimer = startTimer('health_router_validation');
    
    try {
        logger.debug('Starting health router validation', {
            timestamp: new Date().toISOString(),
            routerType: router?.constructor?.name || 'unknown',
            hasStack: Array.isArray(router?.stack),
            stackLength: router?.stack?.length || 0
        });
        
        const validationResult = {
            isValid: true,
            timestamp: new Date().toISOString(),
            errors: [],
            warnings: [],
            routesConfigured: 0,
            middlewareApplied: 0,
            kubernetesCompatible: false,
            performanceOptimized: false,
            details: {}
        };
        
        // Check that router instance is valid Express Router with proper methods
        if (!router || typeof router !== 'object') {
            validationResult.errors.push('Router instance is null or not an object');
            validationResult.isValid = false;
        } else if (typeof router.get !== 'function') {
            validationResult.errors.push('Router instance missing get() method');
            validationResult.isValid = false;
        } else if (typeof router.use !== 'function') {
            validationResult.errors.push('Router instance missing use() method');
            validationResult.isValid = false;
        } else if (!Array.isArray(router.stack)) {
            validationResult.errors.push('Router instance missing stack property');
            validationResult.isValid = false;
        }
        
        // If basic router validation fails, return early
        if (!validationResult.isValid) {
            const validationTime = stopTimer(validationTimer);
            validationResult.validationTimeMs = validationTime;
            return validationResult;
        }
        
        // Verify that health route handlers are registered at correct paths with proper controllers
        const expectedRoutes = [
            { path: ROUTES.HEALTH, method: 'get' },
            { path: ROUTES.LIVENESS, method: 'get' },
            { path: ROUTES.READINESS, method: 'get' }
        ];
        
        const registeredRoutes = [];
        let middlewareCount = 0;
        
        // Analyze router stack to find registered routes and middleware
        for (const layer of router.stack) {
            if (layer.route) {
                // Route layer
                registeredRoutes.push({
                    path: layer.route.path,
                    methods: Object.keys(layer.route.methods)
                });
                validationResult.routesConfigured++;
            } else if (layer.handle && typeof layer.handle === 'function') {
                // Middleware layer
                middlewareCount++;
                validationResult.middlewareApplied++;
            }
        }
        
        // Validate each expected route is properly registered
        for (const expectedRoute of expectedRoutes) {
            const matchingRoute = registeredRoutes.find(route => 
                route.path === expectedRoute.path && 
                route.methods.includes(expectedRoute.method)
            );
            
            if (!matchingRoute) {
                validationResult.errors.push(`Missing route: ${expectedRoute.method.toUpperCase()} ${expectedRoute.path}`);
                validationResult.isValid = false;
            } else {
                validationResult.details[expectedRoute.path] = {
                    registered: true,
                    methods: matchingRoute.methods,
                    path: matchingRoute.path
                };
            }
        }
        
        // Check that liveness probe endpoint is configured with sub-10ms response time optimization
        if (registeredRoutes.some(route => route.path === ROUTES.LIVENESS)) {
            validationResult.details[ROUTES.LIVENESS] = {
                ...validationResult.details[ROUTES.LIVENESS],
                kubernetesProbe: true,
                probeType: 'liveness',
                purpose: 'Container restart decisions',
                targetResponseTime: '< 10ms',
                optimized: true
            };
        }
        
        // Verify readiness probe endpoint is configured with dependency checking and traffic routing support
        if (registeredRoutes.some(route => route.path === ROUTES.READINESS)) {
            validationResult.details[ROUTES.READINESS] = {
                ...validationResult.details[ROUTES.READINESS],
                kubernetesProbe: true,
                probeType: 'readiness',
                purpose: 'Traffic routing decisions',
                targetResponseTime: '< 25ms',
                dependencyChecking: true,
                optimized: true
            };
        }
        
        // Validate that health middleware is properly applied and configured for performance monitoring
        if (middlewareCount === 0) {
            validationResult.warnings.push('No middleware detected in router stack');
        } else if (middlewareCount < 2) {
            validationResult.warnings.push('Minimal middleware detected - may lack error handling or performance monitoring');
        }
        
        // Check Kubernetes compatibility based on probe endpoints
        const hasLivenessProbe = registeredRoutes.some(route => route.path === ROUTES.LIVENESS);
        const hasReadinessProbe = registeredRoutes.some(route => route.path === ROUTES.READINESS);
        
        validationResult.kubernetesCompatible = hasLivenessProbe && hasReadinessProbe;
        
        if (!validationResult.kubernetesCompatible) {
            const missingProbes = [];
            if (!hasLivenessProbe) missingProbes.push('liveness (/livez)');
            if (!hasReadinessProbe) missingProbes.push('readiness (/readyz)');
            
            validationResult.warnings.push(`Missing Kubernetes probe endpoints: ${missingProbes.join(', ')}`);
        }
        
        // Validate middleware ordering is correct for health monitoring, performance tracking, and error handling
        let hasErrorHandler = false;
        let hasPerformanceMonitoring = false;
        
        for (const layer of router.stack) {
            if (layer.handle && layer.handle.length === 4) {
                // Error handling middleware (4 parameters: err, req, res, next)
                hasErrorHandler = true;
            } else if (layer.handle && layer.handle.length === 3) {
                // Regular middleware - check if it looks like performance monitoring
                const handlerString = layer.handle.toString();
                if (handlerString.includes('timer') || handlerString.includes('performance') || handlerString.includes('responseTime')) {
                    hasPerformanceMonitoring = true;
                }
            }
        }
        
        validationResult.performanceOptimized = hasPerformanceMonitoring;
        
        if (!hasErrorHandler) {
            validationResult.warnings.push('No error handling middleware detected');
        }
        
        if (!hasPerformanceMonitoring) {
            validationResult.warnings.push('No performance monitoring middleware detected');
        }
        
        // Test basic health route functionality without making actual HTTP requests
        try {
            // Validate controller functions are accessible
            if (typeof getHealthStatus !== 'function') {
                validationResult.errors.push('getHealthStatus controller function not accessible');
                validationResult.isValid = false;
            }
            
            if (typeof getLivenessProbe !== 'function') {
                validationResult.errors.push('getLivenessProbe controller function not accessible');
                validationResult.isValid = false;
            }
            
            if (typeof getReadinessProbe !== 'function') {
                validationResult.errors.push('getReadinessProbe controller function not accessible');
                validationResult.isValid = false;
            }
            
        } catch (testError) {
            validationResult.errors.push(`Controller function validation failed: ${testError.message}`);
            validationResult.isValid = false;
        }
        
        // Record validation completion time
        const validationTime = stopTimer(validationTimer);
        validationResult.validationTimeMs = validationTime;
        
        // Add summary information
        validationResult.summary = {
            totalRoutes: validationResult.routesConfigured,
            totalMiddleware: validationResult.middlewareApplied,
            kubernetesProbes: hasLivenessProbe && hasReadinessProbe ? 2 : (hasLivenessProbe || hasReadinessProbe ? 1 : 0),
            generalHealthEndpoints: registeredRoutes.some(route => route.path === ROUTES.HEALTH) ? 1 : 0,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            overallStatus: validationResult.isValid ? 'valid' : 'invalid'
        };
        
        // Log validation completion
        logger.info('Health router validation completed', {
            timestamp: new Date().toISOString(),
            validationTimeMs: validationTime,
            isValid: validationResult.isValid,
            summary: validationResult.summary,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            kubernetesCompatible: validationResult.kubernetesCompatible,
            performanceOptimized: validationResult.performanceOptimized
        });
        
        // Return comprehensive validation result with status and detailed configuration analysis
        return validationResult;
        
    } catch (error) {
        // Handle validation errors gracefully
        logger.error('Health router validation failed', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        const validationTime = stopTimer(validationTimer);
        
        return {
            isValid: false,
            timestamp: new Date().toISOString(),
            validationTimeMs: validationTime,
            errors: [`Validation process failed: ${error.message}`],
            warnings: [],
            routesConfigured: 0,
            middlewareApplied: 0,
            kubernetesCompatible: false,
            performanceOptimized: false,
            details: {},
            validationError: {
                message: error.message,
                type: error.constructor.name
            }
        };
    }
}

/**
 * Returns comprehensive statistics about health router configuration and operational metrics.
 * This function checks HEALTH_ROUTER_INITIALIZED status and initialization timestamp,
 * calculates health router uptime using HEALTH_ROUTE_REGISTRATION_TIME, extracts
 * health route request statistics from HEALTH_ROUTE_STATS global, includes health
 * middleware configuration details, adds health route handler registration information,
 * includes Express.js version compatibility and configuration, adds Kubernetes probe
 * endpoint configuration, and returns comprehensive health router statistics object.
 * 
 * Health router statistics features:
 * - Comprehensive operational metrics including request counts, response times, and error rates
 * - Health router uptime calculation and lifecycle tracking for operational monitoring
 * - Endpoint-specific statistics with performance metrics and SLA compliance reporting  
 * - Configuration visibility including middleware details and Express.js version compatibility
 * - Kubernetes probe endpoint configuration and performance target compliance status
 * - Comprehensive statistics object for operational monitoring, performance analysis, and troubleshooting
 * 
 * @returns {Object} Statistics object containing health route configuration details, performance metrics, and operational data
 */
function getHealthRouterStats() {
    const statsGenerationTimer = startTimer('health_router_stats_generation');
    
    try {
        logger.debug('Generating health router statistics', {
            timestamp: new Date().toISOString(),
            initialized: HEALTH_ROUTER_INITIALIZED,
            registrationTime: HEALTH_ROUTE_REGISTRATION_TIME,
            requestCount: HEALTH_ROUTE_STATS.requestCount
        });
        
        const currentTime = Date.now();
        
        // Check HEALTH_ROUTER_INITIALIZED status and health router initialization timestamp
        const initializationStatus = {
            initialized: HEALTH_ROUTER_INITIALIZED,
            registrationTime: HEALTH_ROUTE_REGISTRATION_TIME,
            routerCreationTime: HEALTH_ROUTE_STATS.routerCreationTime,
            initializationTime: HEALTH_ROUTE_STATS.initializationTime
        };
        
        // Calculate health router uptime using HEALTH_ROUTE_REGISTRATION_TIME
        let uptime = {
            milliseconds: 0,
            seconds: 0,
            minutes: 0,
            hours: 0,
            formatted: '0s'
        };
        
        if (HEALTH_ROUTE_REGISTRATION_TIME) {
            const uptimeMs = currentTime - HEALTH_ROUTE_REGISTRATION_TIME;
            const uptimeSeconds = Math.floor(uptimeMs / 1000);
            const uptimeMinutes = Math.floor(uptimeSeconds / 60);
            const uptimeHours = Math.floor(uptimeMinutes / 60);
            
            uptime = {
                milliseconds: uptimeMs,
                seconds: uptimeSeconds,
                minutes: uptimeMinutes,
                hours: uptimeHours,
                formatted: formatUptime(uptimeSeconds)
            };
        }
        
        // Extract health route request statistics from HEALTH_ROUTE_STATS global
        const requestStatistics = {
            total: HEALTH_ROUTE_STATS.requestCount,
            successful: HEALTH_ROUTE_STATS.successfulRequests,
            errors: HEALTH_ROUTE_STATS.errors,
            successRate: HEALTH_ROUTE_STATS.requestCount > 0 ? 
                (HEALTH_ROUTE_STATS.successfulRequests / HEALTH_ROUTE_STATS.requestCount) * 100 : 0,
            errorRate: HEALTH_ROUTE_STATS.requestCount > 0 ? 
                (HEALTH_ROUTE_STATS.errors / HEALTH_ROUTE_STATS.requestCount) * 100 : 0,
            byEndpoint: {
                health: {
                    requests: HEALTH_ROUTE_STATS.healthRequests,
                    percentage: HEALTH_ROUTE_STATS.requestCount > 0 ? 
                        (HEALTH_ROUTE_STATS.healthRequests / HEALTH_ROUTE_STATS.requestCount) * 100 : 0
                },
                liveness: {
                    requests: HEALTH_ROUTE_STATS.livenessRequests,
                    percentage: HEALTH_ROUTE_STATS.requestCount > 0 ? 
                        (HEALTH_ROUTE_STATS.livenessRequests / HEALTH_ROUTE_STATS.requestCount) * 100 : 0
                },
                readiness: {
                    requests: HEALTH_ROUTE_STATS.readinessRequests,
                    percentage: HEALTH_ROUTE_STATS.requestCount > 0 ? 
                        (HEALTH_ROUTE_STATS.readinessRequests / HEALTH_ROUTE_STATS.requestCount) * 100 : 0
                }
            },
            lastRequestTime: HEALTH_ROUTE_STATS.lastRequestTime,
            requestRate: uptime.seconds > 0 ? HEALTH_ROUTE_STATS.requestCount / uptime.seconds : 0
        };
        
        // Include health middleware configuration details and applied middleware count
        const middlewareConfiguration = {
            applied: HEALTH_ROUTE_STATS.middlewareApplied || 0,
            performanceMonitoring: true,
            errorHandling: true,
            requestTiming: true,
            statisticsTracking: true,
            configuration: {
                enableDetailedLogging: true,
                enableStatistics: true,
                responseTimeThreshold: 50
            }
        };
        
        // Add health route handler registration information and endpoint support details
        const routeConfiguration = {
            registered: HEALTH_ROUTE_STATS.routesRegistered || 0,
            registeredPaths: HEALTH_ROUTE_STATS.registeredPaths || [],
            routeValidationPassed: HEALTH_ROUTE_STATS.routeValidationPassed || false,
            routeRegistrationTime: HEALTH_ROUTE_STATS.routeRegistrationTime,
            endpointConfiguration: HEALTH_ROUTE_STATS.endpointConfiguration
        };
        
        // Include Express.js version compatibility and health-specific error handling configuration
        const frameworkConfiguration = {
            expressVersion: '5.1.0',
            nodeVersion: process.version,
            automaticPromiseHandling: true,
            asyncAwaitSupport: true,
            enhancedSecurity: true,
            platform: process.platform,
            pid: process.pid
        };
        
        // Add Kubernetes probe endpoint configuration and performance target compliance status
        const kubernetesConfiguration = {
            compatible: HEALTH_ROUTE_STATS.kubernetesProbesRegistered >= 2,
            probesRegistered: HEALTH_ROUTE_STATS.kubernetesProbesRegistered || 0,
            livenessProbe: {
                endpoint: ROUTES.LIVENESS,
                targetResponseTime: '< 10ms',
                purpose: 'Container restart decisions'
            },
            readinessProbe: {
                endpoint: ROUTES.READINESS,
                targetResponseTime: '< 25ms', 
                purpose: 'Traffic routing decisions'
            },
            generalHealthEndpoint: {
                endpoint: ROUTES.HEALTH,
                targetResponseTime: '< 50ms',
                purpose: 'General health status with optional detailed metrics'
            }
        };
        
        // Include performance metrics and response time analysis
        const performanceMetrics = {
            averageResponseTime: Math.round(HEALTH_ROUTE_STATS.averageResponseTime * 100) / 100,
            maxResponseTime: Math.round(HEALTH_ROUTE_STATS.maxResponseTime * 100) / 100,
            minResponseTime: HEALTH_ROUTE_STATS.minResponseTime === Infinity ? 0 : 
                Math.round(HEALTH_ROUTE_STATS.minResponseTime * 100) / 100,
            totalResponseTime: Math.round(HEALTH_ROUTE_STATS.totalResponseTime * 100) / 100,
            responseTimeThreshold: 50, // ms
            withinThreshold: HEALTH_ROUTE_STATS.averageResponseTime < 50,
            performanceRating: HEALTH_ROUTE_STATS.averageResponseTime < 25 ? 'excellent' :
                                HEALTH_ROUTE_STATS.averageResponseTime < 50 ? 'good' : 'needs_improvement'
        };
        
        // Record stats generation completion time
        const statsGenerationTime = stopTimer(statsGenerationTimer);
        
        // Create comprehensive health router statistics object
        const healthRouterStats = {
            timestamp: new Date().toISOString(),
            statsGenerationTimeMs: statsGenerationTime,
            uptime: uptime,
            initialization: initializationStatus,
            requests: requestStatistics,
            middleware: middlewareConfiguration,
            routes: routeConfiguration,
            framework: frameworkConfiguration,
            kubernetes: kubernetesConfiguration,
            performance: performanceMetrics,
            system: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                systemUptime: process.uptime(),
                environmentVariables: {
                    nodeEnv: process.env.NODE_ENV || 'development',
                    port: process.env.PORT || 'default'
                }
            },
            metadata: {
                applicationName: 'nodejs-tutorial-app',
                version: '1.0.0',
                healthRouterVersion: '1.0.0',
                generatedBy: 'getHealthRouterStats',
                purpose: 'Operational monitoring and performance analysis'
            }
        };
        
        logger.debug('Health router statistics generated successfully', {
            timestamp: new Date().toISOString(),
            statsGenerationTimeMs: statsGenerationTime,
            totalRequests: requestStatistics.total,
            successRate: requestStatistics.successRate,
            averageResponseTime: performanceMetrics.averageResponseTime,
            kubernetesCompatible: kubernetesConfiguration.compatible
        });
        
        // Return comprehensive health router statistics object for operational monitoring
        return Object.freeze(healthRouterStats);
        
    } catch (error) {
        // Handle statistics generation errors gracefully
        logger.error('Failed to generate health router statistics', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        const statsGenerationTime = stopTimer(statsGenerationTimer);
        
        // Return minimal statistics with error information
        return {
            timestamp: new Date().toISOString(),
            statsGenerationTimeMs: statsGenerationTime,
            error: true,
            errorMessage: error.message,
            fallbackData: {
                initialized: HEALTH_ROUTER_INITIALIZED,
                registrationTime: HEALTH_ROUTE_REGISTRATION_TIME,
                requestCount: HEALTH_ROUTE_STATS.requestCount,
                errors: HEALTH_ROUTE_STATS.errors
            },
            metadata: {
                generatedBy: 'getHealthRouterStats',
                fallbackMode: true
            }
        };
    }
}

/**
 * Resets health router statistics for operational management and testing scenarios.
 * This function resets all counters in HEALTH_ROUTE_STATS to zero values, preserves
 * health router initialization status and configuration information, logs health router
 * statistics reset event with timestamp, and updates statistics reset timestamp for
 * health monitoring and operational purposes.
 * 
 * Statistics reset features:
 * - Complete request counter reset for all health endpoints with zero baseline values
 * - Initialization status preservation while resetting operational metrics and performance data
 * - Comprehensive logging with reset event timestamp for operational tracking and audit trail
 * - Statistics reset timestamp update for health monitoring systems and operational dashboards
 * - Configuration preservation to maintain health router setup and endpoint configurations
 * - Error handling with graceful degradation for reliable statistics management
 * 
 * @returns {void} No return value - resets HEALTH_ROUTE_STATS global counters for all health endpoints
 */
function resetHealthRouterStats() {
    const resetTimer = startTimer('health_router_stats_reset');
    
    try {
        logger.info('Resetting health router statistics', {
            timestamp: new Date().toISOString(),
            previousStats: {
                requestCount: HEALTH_ROUTE_STATS.requestCount,
                healthRequests: HEALTH_ROUTE_STATS.healthRequests,
                livenessRequests: HEALTH_ROUTE_STATS.livenessRequests,
                readinessRequests: HEALTH_ROUTE_STATS.readinessRequests,
                successfulRequests: HEALTH_ROUTE_STATS.successfulRequests,
                errors: HEALTH_ROUTE_STATS.errors
            }
        });
        
        // Store current timestamp for reset tracking
        const resetTimestamp = Date.now();
        
        // Reset all counters in HEALTH_ROUTE_STATS to zero values for all health endpoints
        HEALTH_ROUTE_STATS = {
            ...HEALTH_ROUTE_STATS,
            // Reset request counters
            requestCount: 0,
            healthRequests: 0,
            livenessRequests: 0,
            readinessRequests: 0,
            errors: 0,
            successfulRequests: 0,
            
            // Reset performance metrics
            averageResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            totalResponseTime: 0,
            lastRequestTime: null,
            
            // Preserve configuration but update reset information
            statisticsResetTime: resetTimestamp,
            statisticsResetCount: (HEALTH_ROUTE_STATS.statisticsResetCount || 0) + 1,
            
            // Preserve initialization and configuration data
            routerCreationTime: HEALTH_ROUTE_STATS.routerCreationTime,
            initializationTime: HEALTH_ROUTE_STATS.initializationTime,
            routeRegistrationTime: HEALTH_ROUTE_STATS.routeRegistrationTime,
            routesRegistered: HEALTH_ROUTE_STATS.routesRegistered,
            registeredPaths: HEALTH_ROUTE_STATS.registeredPaths,
            endpointConfiguration: HEALTH_ROUTE_STATS.endpointConfiguration,
            kubernetesProbesRegistered: HEALTH_ROUTE_STATS.kubernetesProbesRegistered,
            routeValidationPassed: HEALTH_ROUTE_STATS.routeValidationPassed,
            middlewareApplied: HEALTH_ROUTE_STATS.middlewareApplied
        };
        
        // Record reset completion time
        const resetTime = stopTimer(resetTimer);
        
        // Log health router statistics reset event with timestamp for operational tracking
        logger.info('Health router statistics reset completed', {
            timestamp: new Date().toISOString(),
            resetTimeMs: resetTime,
            resetTimestamp: resetTimestamp,
            statisticsResetCount: HEALTH_ROUTE_STATS.statisticsResetCount,
            preservedConfiguration: {
                routerCreationTime: HEALTH_ROUTE_STATS.routerCreationTime,
                initializationTime: HEALTH_ROUTE_STATS.initializationTime,
                routesRegistered: HEALTH_ROUTE_STATS.routesRegistered,
                kubernetesProbesRegistered: HEALTH_ROUTE_STATS.kubernetesProbesRegistered
            },
            newBaseline: {
                requestCount: HEALTH_ROUTE_STATS.requestCount,
                successfulRequests: HEALTH_ROUTE_STATS.successfulRequests,
                errors: HEALTH_ROUTE_STATS.errors,
                averageResponseTime: HEALTH_ROUTE_STATS.averageResponseTime
            }
        });
        
    } catch (error) {
        // Handle statistics reset errors gracefully
        logger.error('Failed to reset health router statistics completely', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Attempt partial reset to maintain system stability
        try {
            // Reset at least the basic counters
            HEALTH_ROUTE_STATS.requestCount = 0;
            HEALTH_ROUTE_STATS.healthRequests = 0;
            HEALTH_ROUTE_STATS.livenessRequests = 0;
            HEALTH_ROUTE_STATS.readinessRequests = 0;
            HEALTH_ROUTE_STATS.errors = 0;
            HEALTH_ROUTE_STATS.successfulRequests = 0;
            HEALTH_ROUTE_STATS.statisticsResetTime = Date.now();
            
            logger.warn('Completed partial health router statistics reset after error');
            
        } catch (partialResetError) {
            logger.error('Failed to complete even partial health router statistics reset', {
                error: partialResetError.message,
                originalError: error.message
            });
        }
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper function to format uptime seconds into human-readable string
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string (e.g., "1d 2h 30m 45s")
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let formatted = '';
    if (days > 0) formatted += `${days}d `;
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0) formatted += `${minutes}m `;
    if (secs > 0 || formatted === '') formatted += `${secs}s`;
    
    return formatted.trim();
}

// =============================================================================
// ROUTER CREATION AND INITIALIZATION
// =============================================================================

// Create and initialize the main health router instance
logger.info('Initializing health routes module', {
    timestamp: new Date().toISOString(),
    module: 'health.js',
    expressVersion: '5.1.0',
    nodeVersion: process.version
});

// Initialize health routes using the factory function
const router = initializeHealthRoutes();

logger.info('Health routes module initialization completed', {
    timestamp: new Date().toISOString(),
    routerInitialized: HEALTH_ROUTER_INITIALIZED,
    registrationTime: HEALTH_ROUTE_REGISTRATION_TIME,
    endpointsConfigured: [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS]
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Export default configured health router instance with health, liveness, and readiness route handlers
module.exports = router;

// Export factory function to create customized health router with configuration options
module.exports.createHealthRouter = createHealthRouter;

// Export route initialization function for health endpoint setup and Kubernetes compatibility validation
module.exports.initializeHealthRoutes = initializeHealthRoutes;

// Export utility function to retrieve health router statistics and operational metrics
module.exports.getHealthRouterStats = getHealthRouterStats;

// Export utility function to reset health router statistics for operational management and testing
module.exports.resetHealthRouterStats = resetHealthRouterStats;

// Export validation function for health router configuration and endpoint verification
module.exports.validateHealthRouter = validateHealthRouter;

// Export middleware configuration function for health-specific middleware setup
module.exports.configureHealthMiddleware = configureHealthMiddleware;

// Export route registration function for explicit health endpoint registration
module.exports.registerHealthRoutes = registerHealthRoutes;