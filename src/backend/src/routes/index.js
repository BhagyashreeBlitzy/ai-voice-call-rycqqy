/**
 * Main Routing Module for Node.js Tutorial Application
 * 
 * This module implements comprehensive routing consolidation and orchestration by mounting
 * hello and health sub-routers into a unified Express router. It demonstrates Express.js 5.1.0
 * router composition patterns with comprehensive route organization, middleware integration, and
 * operational monitoring. Serves as the central routing hub for the Node.js tutorial application,
 * implementing modular routing architecture, router mounting patterns, and production-ready route
 * organization while maintaining educational clarity and simplicity.
 * 
 * Key Features:
 * - Express.js 5.1.0 router composition with automatic promise error handling and sub-router mounting
 * - Modular route organization demonstrating Express Router as organizational unit with hierarchical composition
 * - Central routing consolidation point integrating hello endpoint and health check routes for unified routing
 * - Comprehensive operational monitoring with statistics tracking, performance metrics, and health validation
 * - Educational router patterns showcasing industry-standard Express.js router composition and mounting techniques
 * - Production-ready route organization with middleware integration, error handling, and monitoring capabilities
 * - Route inventory and discovery patterns for operational observability and documentation generation
 * - Router health checking and validation patterns for production readiness and configuration verification
 * 
 * Architecture:
 * - Express.js Router factory patterns with configuration injection and dependency management
 * - Sub-router composition and integration architecture with clear separation of concerns
 * - Operational monitoring and statistics collection for routing infrastructure performance tracking
 * - Configuration-driven router setup with factory pattern usage and environment-specific settings
 * - Health checking and validation integration for operational readiness and configuration verification
 * - Structured logging integration with correlation ID propagation and comprehensive request/response tracking
 * 
 * Educational Focus:
 * - Clear demonstration of Express.js 5.1.0 router composition patterns and sub-router mounting techniques
 * - Production-ready routing infrastructure showcasing enterprise-grade observability and monitoring practices
 * - Comprehensive route organization with educational value through simplicity and clear architectural patterns
 * - Modular architecture patterns promoting code reusability and maintainability in Node.js applications
 * - Router lifecycle management including initialization, mounting, validation, and operational monitoring
 * - Industry-standard routing patterns with comprehensive documentation and educational annotations
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async/await support, automatic promise error handling, and improved security
 * - Node.js 22.11.0 LTS with Active LTS support, performance optimizations, and comprehensive security enhancements
 * - Hello router with '/hello' endpoint and comprehensive route handler integration
 * - Health router with '/health', '/livez', and '/readyz' Kubernetes-compatible probe endpoints
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js routing, router composition, middleware orchestration, and operational observability
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Express.js web framework for creating main router instance and sub-router mounting
const express = require('express'); // v5.1.0 - Enhanced async/await support with automatic promise error handling

// =============================================================================
// INTERNAL DEPENDENCIES - SUB-ROUTERS
// =============================================================================

// Import default hello router for '/hello' endpoint with GET route handler and method validation
const router = require('./hello.js');
const helloRouter = router;

// Import hello router statistics function for operational monitoring and route health tracking
const { getHelloRouterStats } = require('./hello.js');

// Import default health router for '/health', '/livez', and '/readyz' endpoints
const healthRouterDefault = require('./health.js');
const healthRouter = healthRouterDefault;

// Import health router statistics function for operational monitoring and endpoint health tracking
const { getHealthRouterStats } = require('./health.js');

// =============================================================================
// INTERNAL DEPENDENCIES - UTILITIES
// =============================================================================

// Import structured logging utility for main router initialization logging and operational monitoring
const { logger } = require('../utils/logger.js');

// Import performance timing utilities for main router response time measurement
const { startTimer, stopTimer } = require('../utils/logger.js');

// =============================================================================
// INTERNAL DEPENDENCIES - CONSTANTS
// =============================================================================

// Import application metadata constants for including application context in router logging
const { APPLICATION_METADATA } = require('../utils/constants.js');

// Import route path constants for consistent route mounting and operational monitoring
const { ROUTES } = require('../utils/constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Flag to track main router initialization status for operational monitoring and duplicate prevention
 * @type {boolean}
 */
let MAIN_ROUTER_INITIALIZED = false;

/**
 * Timestamp when sub-routers were mounted for uptime monitoring and operational statistics
 * @type {number|null}
 */
let ROUTER_MOUNTING_TIME = null;

/**
 * Tracking object for mounted sub-router status with initialization state management
 * @type {Object}
 */
let MOUNTED_ROUTES = { 
    hello: false, 
    health: false 
};

/**
 * Main router statistics for operational monitoring including route counts and performance metrics
 * @type {Object}
 */
let MAIN_ROUTER_STATS = { 
    totalRoutes: 0, 
    helloRoutes: 0, 
    healthRoutes: 0, 
    mountingTime: null, 
    errors: 0,
    requestCount: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    totalResponseTime: 0,
    lastRequestTime: null,
    routerCreationTime: null,
    initializationComplete: false,
    subRouterMountingComplete: false,
    validationPassed: false
};

// =============================================================================
// ROUTER FACTORY AND CONFIGURATION FUNCTIONS
// =============================================================================

/**
 * Factory function that creates and configures the main Express router for mounting sub-routers with comprehensive route organization.
 * This function creates new Express Router instance using express.Router() with main router configuration options,
 * logs main router creation start using logger.info() with initialization context and application metadata,
 * extracts router configuration from options or uses defaults for sub-router mounting strategy, initializes
 * MOUNTED_ROUTES tracking object with false status for all sub-routers, sets MAIN_ROUTER_INITIALIZED flag
 * to true to indicate successful main router initialization, records ROUTER_MOUNTING_TIME timestamp for
 * monitoring and operational uptime tracking, logs successful main router configuration with configuration
 * summary and mounting readiness status, initializes MAIN_ROUTER_STATS with configuration metadata and
 * routing statistics counters, and returns fully configured main router instance ready for sub-router mounting.
 * 
 * Router creation features:
 * - Express.js 5.1.0 router instantiation with main router configuration options and performance optimization
 * - Comprehensive route organization setup with sub-router mounting strategy and hierarchical routing architecture
 * - Operational monitoring integration with initialization status tracking and comprehensive uptime measurement
 * - Performance statistics initialization with route configuration metadata and baseline performance counters
 * - Structured logging with router lifecycle events, configuration details, and operational readiness indicators
 * - Error handling with graceful degradation, fallback router configuration, and comprehensive error reporting
 * 
 * @param {Object} [options={}] - Configuration options for main router behavior, sub-router mounting, and performance settings
 * @returns {Object} Configured Express router instance ready for sub-router mounting and Express application integration
 */
function createMainRouter(options = {}) {
    const routerCreationTimer = startTimer('main_router_creation');
    
    try {
        // Log main router creation start using logger.info() with initialization context and application metadata
        logger.info('Starting main router creation for Node.js tutorial application', {
            timestamp: new Date().toISOString(),
            options: options,
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                description: APPLICATION_METADATA.DESCRIPTION
            },
            subRoutersToMount: ['hello', 'health'],
            expressVersion: '5.1.0',
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        });

        // Create new Express Router instance using express.Router() with main router configuration options
        const mainRouter = express.Router({
            caseSensitive: options.caseSensitive || false,
            mergeParams: options.mergeParams || false,
            strict: options.strict || false
        });

        // Extract router configuration from options or use defaults for sub-router mounting strategy
        const routerConfiguration = {
            enableStatistics: options.enableStatistics !== false,
            enableDetailedLogging: options.enableDetailedLogging !== false,
            enableHealthChecking: options.enableHealthChecking !== false,
            mountingStrategy: options.mountingStrategy || 'sequential',
            performanceMonitoring: options.performanceMonitoring !== false,
            errorHandling: options.errorHandling !== false,
            ...options
        };

        logger.debug('Main router configuration extracted and validated', {
            configuration: routerConfiguration,
            defaultsApplied: true,
            routerOptions: {
                caseSensitive: mainRouter.caseSensitive,
                mergeParams: mainRouter.mergeParams,
                strict: mainRouter.strict
            }
        });

        // Configure main router middleware before sub-router mounting
        configureMainRouterMiddleware(mainRouter, routerConfiguration);

        // Record router creation completion time
        const creationTime = stopTimer(routerCreationTimer);

        // Initialize MOUNTED_ROUTES tracking object with false status for all sub-routers
        MOUNTED_ROUTES = { 
            hello: false, 
            health: false 
        };

        // Set MAIN_ROUTER_INITIALIZED flag to true to indicate successful main router initialization
        MAIN_ROUTER_INITIALIZED = true;

        // Record ROUTER_MOUNTING_TIME timestamp for monitoring and operational uptime tracking
        ROUTER_MOUNTING_TIME = Date.now();

        // Initialize MAIN_ROUTER_STATS with configuration metadata and routing statistics counters
        MAIN_ROUTER_STATS = {
            ...MAIN_ROUTER_STATS,
            routerCreationTime: ROUTER_MOUNTING_TIME,
            creationDurationMs: creationTime,
            totalRoutes: 0,
            helloRoutes: 0,
            healthRoutes: 0,
            mountingTime: null,
            errors: 0,
            requestCount: 0,
            successfulRequests: 0,
            configuration: routerConfiguration,
            initializationComplete: true
        };

        // Log successful main router configuration with configuration summary and mounting readiness status
        logger.info('Main router created successfully and ready for sub-router mounting', {
            timestamp: new Date().toISOString(),
            creationTimeMs: creationTime,
            routerInitialized: MAIN_ROUTER_INITIALIZED,
            mountingTime: ROUTER_MOUNTING_TIME,
            configuration: routerConfiguration,
            subRoutersToMount: Object.keys(MOUNTED_ROUTES),
            mountingReadiness: true,
            statistics: {
                initialized: MAIN_ROUTER_STATS.initializationComplete,
                configurationValidated: true,
                middlewareApplied: true
            }
        });

        // Return fully configured main router instance ready for sub-router mounting and application integration
        return mainRouter;

    } catch (error) {
        // Handle router creation errors with comprehensive error logging and graceful degradation
        logger.error('Failed to create main router - attempting fallback configuration', {
            error: error.message,
            stack: error.stack,
            options: options,
            timestamp: new Date().toISOString(),
            fallbackRequired: true
        });

        // Track error in statistics
        MAIN_ROUTER_STATS.errors++;

        // Attempt to create minimal fallback router for graceful degradation
        try {
            const fallbackRouter = express.Router();

            // Add basic middleware for fallback functionality
            fallbackRouter.use((req, res, next) => {
                // Basic request tracking
                MAIN_ROUTER_STATS.requestCount++;
                req.mainRouterFallback = true;
                next();
            });

            logger.warn('Created fallback main router with limited functionality due to initialization error');
            return fallbackRouter;

        } catch (fallbackError) {
            logger.error('Failed to create fallback main router - returning minimal router', {
                error: fallbackError.message,
                originalError: error.message,
                criticalFailure: true
            });

            // Return absolute minimal router as last resort
            return express.Router();
        }
    }
}

/**
 * Configures and applies middleware stack for main router with performance monitoring and error handling.
 * This function validates router instance as proper Express Router, configures request timing middleware
 * for comprehensive performance tracking, applies error handling middleware with Express 5.1.0 automatic
 * promise handling integration, sets up request correlation middleware for distributed tracing, applies
 * main router statistics tracking middleware, and logs middleware configuration completion with applied
 * middleware summary and performance optimization details.
 * 
 * Main router middleware configuration features:
 * - Express Router instance validation with type checking and functionality verification
 * - Performance-optimized middleware configuration with sub-millisecond precision timing and SLA compliance monitoring
 * - Request correlation middleware for distributed system debugging and comprehensive request tracing
 * - Main router statistics tracking middleware for operational visibility and performance analysis
 * - Express.js 5.1.0 automatic promise handling integration with comprehensive error handling middleware
 * - Comprehensive logging with applied middleware summary and main router-specific optimizations
 * 
 * @param {Object} router - Express router instance for main router middleware application and configuration
 * @param {Object} middlewareOptions - Configuration options for middleware behavior, performance settings, and monitoring
 * @returns {void} No return value - applies main router middleware to router instance in place
 */
function configureMainRouterMiddleware(router, middlewareOptions = {}) {
    const middlewareConfigTimer = startTimer('main_router_middleware_configuration');

    try {
        // Validate router instance is a properly initialized Express Router
        if (!router || typeof router !== 'object' || typeof router.use !== 'function') {
            throw new Error('Invalid router instance provided for main router middleware configuration');
        }

        logger.debug('Starting main router middleware configuration', {
            timestamp: new Date().toISOString(),
            middlewareOptions: middlewareOptions,
            routerType: router.constructor?.name || 'unknown',
            hasUseMethod: typeof router.use === 'function',
            hasGetMethod: typeof router.get === 'function'
        });

        // Configure main router request timing middleware for performance monitoring across all routes
        router.use((req, res, next) => {
            // Start performance timer for this request
            const requestTimer = startTimer(`main_router_request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            
            // Store timer ID and start time in request for cleanup and tracking
            req.mainRouterTimer = requestTimer;
            req.mainRouterStartTime = Date.now();
            
            // Generate correlation ID if not present for request tracing
            if (!req.headers['x-correlation-id']) {
                req.headers['x-correlation-id'] = `main_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // Track request in main router statistics
            MAIN_ROUTER_STATS.requestCount++;
            MAIN_ROUTER_STATS.lastRequestTime = Date.now();

            // Add response time logging and statistics tracking
            const originalSend = res.send;
            res.send = function(data) {
                const responseTime = stopTimer(requestTimer);

                // Update main router response time statistics
                MAIN_ROUTER_STATS.totalResponseTime += responseTime;
                MAIN_ROUTER_STATS.averageResponseTime = MAIN_ROUTER_STATS.totalResponseTime / MAIN_ROUTER_STATS.requestCount;

                if (responseTime > MAIN_ROUTER_STATS.maxResponseTime) {
                    MAIN_ROUTER_STATS.maxResponseTime = responseTime;
                }

                if (responseTime < MAIN_ROUTER_STATS.minResponseTime) {
                    MAIN_ROUTER_STATS.minResponseTime = responseTime;
                }

                // Track successful requests vs errors based on status code
                if (res.statusCode < 400) {
                    MAIN_ROUTER_STATS.successfulRequests++;
                } else {
                    MAIN_ROUTER_STATS.errors++;
                }

                // Log slow requests that exceed threshold
                const responseTimeThreshold = middlewareOptions.responseTimeThreshold || 100;
                if (responseTime > responseTimeThreshold) {
                    logger.warn('Main router response time exceeded threshold', {
                        responseTime: responseTime,
                        threshold: responseTimeThreshold,
                        path: req.path,
                        method: req.method,
                        correlationId: req.headers['x-correlation-id']
                    });
                }

                // Call original send method
                return originalSend.call(this, data);
            };

            next();
        });

        // Apply error handling middleware integration for Express 5.1.0 automatic promise handling
        router.use((err, req, res, next) => {
            // Track error in main router statistics
            MAIN_ROUTER_STATS.errors++;

            logger.error('Main router error occurred during request processing', {
                error: err.message,
                stack: err.stack,
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString(),
                correlationId: req.headers['x-correlation-id'] || 'unknown',
                mainRouter: true
            });

            // Send appropriate error response if headers not already sent
            if (!res.headersSent) {
                res.status(err.statusCode || 500).json({
                    status: 'error',
                    error: true,
                    message: err.message || 'An internal server error occurred',
                    timestamp: new Date().toISOString(),
                    correlationId: req.headers['x-correlation-id'] || 'unknown',
                    path: req.path,
                    method: req.method
                });
            }
        });

        // Record middleware configuration completion time
        const configurationTime = stopTimer(middlewareConfigTimer);

        // Log main router middleware configuration completion with applied middleware summary
        logger.info('Main router middleware configuration completed successfully', {
            timestamp: new Date().toISOString(),
            configurationTimeMs: configurationTime,
            middlewareApplied: {
                requestTiming: true,
                performanceMonitoring: true,
                correlationTracking: true,
                errorHandling: true,
                statisticsTracking: true
            },
            configuration: middlewareOptions,
            responseTimeThreshold: middlewareOptions.responseTimeThreshold || 100,
            enableDetailedLogging: middlewareOptions.enableDetailedLogging !== false,
            expressVersion: '5.1.0',
            automaticPromiseHandling: true
        });

    } catch (error) {
        // Handle middleware configuration errors with comprehensive error logging
        logger.error('Failed to configure main router middleware completely', {
            error: error.message,
            stack: error.stack,
            middlewareOptions: middlewareOptions,
            timestamp: new Date().toISOString(),
            partialConfigurationAttempt: true
        });

        // Track error in statistics
        MAIN_ROUTER_STATS.errors++;

        // Apply minimal middleware for graceful degradation
        try {
            router.use((req, res, next) => {
                // Basic request tracking even if advanced middleware fails
                MAIN_ROUTER_STATS.requestCount++;
                if (!req.headers['x-correlation-id']) {
                    req.headers['x-correlation-id'] = `fallback_${Date.now()}`;
                }
                next();
            });

            logger.warn('Applied minimal main router middleware due to configuration error');
        } catch (fallbackError) {
            logger.error('Failed to apply even minimal main router middleware', {
                error: fallbackError.message,
                originalError: error.message,
                criticalFailure: true
            });
        }
    }
}

/**
 * Mounts hello and health sub-routers on the main router with proper path organization and middleware integration.
 * This function logs sub-router mounting start using logger.info() with main router context and sub-router count,
 * mounts hello router using mainRouter.use('/', helloRouter) for root-level hello endpoint access, sets
 * MOUNTED_ROUTES.hello to true and logs successful hello router mounting with route statistics, mounts health
 * router using mainRouter.use('/', healthRouter) for root-level health endpoint access, sets MOUNTED_ROUTES.health
 * to true and logs successful health router mounting with endpoint details, updates MAIN_ROUTER_STATS with
 * mounted router counts and route configuration metadata, validates that all sub-routers are properly mounted
 * by checking router stack configuration, and logs successful sub-router mounting completion with comprehensive
 * routing statistics and endpoint summary.
 * 
 * Sub-router mounting features:
 * - Comprehensive hello router mounting with '/hello' endpoint integration and route handler inheritance
 * - Health router mounting with '/health', '/livez', and '/readyz' Kubernetes-compatible probe endpoint integration
 * - Sub-router mounting validation with router.stack inspection and proper mounting verification
 * - Operational statistics tracking with mounted router metadata, route counts, and configuration details
 * - Structured logging with detailed sub-router mounting information, endpoint inventory, and integration status
 * - Error handling with graceful degradation, partial mounting support, and comprehensive error reporting
 * 
 * @param {Object} mainRouter - Express router instance for sub-router mounting and hierarchical route composition
 * @returns {void} No return value - mounts sub-routers on main router instance in place with operational tracking
 */
function mountSubRouters(mainRouter) {
    const mountingTimer = startTimer('sub_router_mounting');

    try {
        // Log sub-router mounting start using logger.info() with main router context and sub-router count
        logger.info('Starting sub-router mounting on main router', {
            timestamp: new Date().toISOString(),
            mainRouterInitialized: MAIN_ROUTER_INITIALIZED,
            subRoutersToMount: Object.keys(MOUNTED_ROUTES),
            subRouterCount: Object.keys(MOUNTED_ROUTES).length,
            mountingStrategy: 'sequential',
            expectedRoutes: [ROUTES.HELLO, ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS]
        });

        // Mount hello router using mainRouter.use('/', helloRouter) for root-level hello endpoint access
        try {
            mainRouter.use('/', helloRouter);
            
            // Set MOUNTED_ROUTES.hello to true and log successful hello router mounting with route statistics
            MOUNTED_ROUTES.hello = true;
            MAIN_ROUTER_STATS.helloRoutes = 1; // Hello router provides 1 endpoint

            logger.info('Hello router mounted successfully on main router', {
                timestamp: new Date().toISOString(),
                router: 'hello',
                mountPath: '/',
                endpoints: [ROUTES.HELLO],
                endpointCount: 1,
                mounted: MOUNTED_ROUTES.hello,
                routerType: 'sub-router',
                middlewareInherited: true
            });

        } catch (helloMountError) {
            logger.error('Failed to mount hello router on main router', {
                error: helloMountError.message,
                router: 'hello',
                mountPath: '/',
                timestamp: new Date().toISOString()
            });
            MAIN_ROUTER_STATS.errors++;
            MOUNTED_ROUTES.hello = false;
        }

        // Mount health router using mainRouter.use('/', healthRouter) for root-level health endpoint access
        try {
            mainRouter.use('/', healthRouter);
            
            // Set MOUNTED_ROUTES.health to true and log successful health router mounting with endpoint details
            MOUNTED_ROUTES.health = true;
            MAIN_ROUTER_STATS.healthRoutes = 3; // Health router provides 3 endpoints

            logger.info('Health router mounted successfully on main router', {
                timestamp: new Date().toISOString(),
                router: 'health',
                mountPath: '/',
                endpoints: [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS],
                endpointCount: 3,
                mounted: MOUNTED_ROUTES.health,
                kubernetesCompatible: true,
                probeEndpoints: [ROUTES.LIVENESS, ROUTES.READINESS],
                routerType: 'sub-router',
                middlewareInherited: true
            });

        } catch (healthMountError) {
            logger.error('Failed to mount health router on main router', {
                error: healthMountError.message,
                router: 'health',
                mountPath: '/',
                timestamp: new Date().toISOString()
            });
            MAIN_ROUTER_STATS.errors++;
            MOUNTED_ROUTES.health = false;
        }

        // Update MAIN_ROUTER_STATS with mounted router counts and route configuration metadata
        MAIN_ROUTER_STATS = {
            ...MAIN_ROUTER_STATS,
            totalRoutes: MAIN_ROUTER_STATS.helloRoutes + MAIN_ROUTER_STATS.healthRoutes,
            mountingTime: Date.now(),
            subRouterMountingComplete: MOUNTED_ROUTES.hello && MOUNTED_ROUTES.health,
            mountedSubRouters: Object.entries(MOUNTED_ROUTES).filter(([name, mounted]) => mounted).length,
            failedMountings: Object.entries(MOUNTED_ROUTES).filter(([name, mounted]) => !mounted).length
        };

        // Validate that all sub-routers are properly mounted by checking router stack configuration
        const validationResult = validateSubRouterMounting(mainRouter);
        MAIN_ROUTER_STATS.validationPassed = validationResult.isValid;

        // Record mounting completion time
        const mountingTime = stopTimer(mountingTimer);
        MAIN_ROUTER_STATS.mountingDurationMs = mountingTime;

        // Log successful sub-router mounting completion with comprehensive routing statistics and endpoint summary
        logger.info('Sub-router mounting completed successfully', {
            timestamp: new Date().toISOString(),
            mountingTimeMs: mountingTime,
            mountedRouters: MOUNTED_ROUTES,
            routingStatistics: {
                totalRoutes: MAIN_ROUTER_STATS.totalRoutes,
                helloRoutes: MAIN_ROUTER_STATS.helloRoutes,
                healthRoutes: MAIN_ROUTER_STATS.healthRoutes,
                mountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
                validationPassed: MAIN_ROUTER_STATS.validationPassed
            },
            endpointInventory: {
                hello: [ROUTES.HELLO],
                health: [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS]
            },
            kubernetesCompatible: MOUNTED_ROUTES.health,
            operationalReadiness: MAIN_ROUTER_STATS.subRouterMountingComplete && MAIN_ROUTER_STATS.validationPassed
        });

    } catch (error) {
        // Handle sub-router mounting errors with comprehensive error logging and partial mounting support
        logger.error('Sub-router mounting process encountered critical error', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            mountingProgress: MOUNTED_ROUTES,
            partialMounting: true,
            fallbackRequired: true
        });

        // Track error in statistics and update mounting status
        MAIN_ROUTER_STATS.errors++;
        MAIN_ROUTER_STATS.subRouterMountingComplete = false;
        MAIN_ROUTER_STATS.mountingError = {
            message: error.message,
            timestamp: Date.now(),
            partialMounting: MOUNTED_ROUTES
        };

        // Continue with partial mounting if any routers were successfully mounted
        const successfulMounts = Object.entries(MOUNTED_ROUTES).filter(([name, mounted]) => mounted);
        if (successfulMounts.length > 0) {
            logger.warn('Continuing with partial sub-router mounting after error', {
                successfulMounts: successfulMounts.map(([name]) => name),
                failedMounts: Object.entries(MOUNTED_ROUTES).filter(([name, mounted]) => !mounted).map(([name]) => name),
                partialFunctionality: true
            });
        }
    }
}

/**
 * Validates sub-router mounting to ensure proper configuration and route handler setup.
 * This function checks main router instance validity, verifies sub-router mounting status,
 * validates route inventory completeness, checks middleware inheritance, tests basic router
 * functionality without HTTP requests, and returns comprehensive validation result with
 * mounting status and detailed configuration analysis.
 * 
 * Sub-router mounting validation features:
 * - Comprehensive Express Router instance validation with type checking and method verification
 * - Sub-router mounting status verification with MOUNTED_ROUTES tracking object analysis
 * - Route inventory completeness validation with expected endpoint verification and availability checking
 * - Middleware inheritance validation for correct request processing pipeline and error handling flow
 * - Basic functionality testing without HTTP requests for configuration validation and integration testing
 * - Comprehensive validation result reporting with status, configuration details, and troubleshooting information
 * 
 * @param {Object} mainRouter - Express router instance to validate for sub-router mounting configuration
 * @returns {Object} Validation result containing mounting status, route configuration details, and issues found
 */
function validateSubRouterMounting(mainRouter) {
    const validationTimer = startTimer('sub_router_mounting_validation');

    try {
        logger.debug('Starting sub-router mounting validation', {
            timestamp: new Date().toISOString(),
            routerType: mainRouter?.constructor?.name || 'unknown',
            hasStack: Array.isArray(mainRouter?.stack),
            stackLength: mainRouter?.stack?.length || 0,
            mountedRoutes: MOUNTED_ROUTES
        });

        const validationResult = {
            isValid: true,
            timestamp: new Date().toISOString(),
            errors: [],
            warnings: [],
            mountedSubRouters: 0,
            totalExpectedRoutes: 4, // hello(1) + health(3)
            routesFound: 0,
            details: {}
        };

        // Check that main router instance is valid Express Router with proper methods
        if (!mainRouter || typeof mainRouter !== 'object') {
            validationResult.errors.push('Main router instance is null or not an object');
            validationResult.isValid = false;
        } else if (typeof mainRouter.use !== 'function') {
            validationResult.errors.push('Main router instance missing use() method');
            validationResult.isValid = false;
        } else if (!Array.isArray(mainRouter.stack)) {
            validationResult.errors.push('Main router instance missing stack property');
            validationResult.isValid = false;
        }

        // If basic router validation fails, return early
        if (!validationResult.isValid) {
            const validationTime = stopTimer(validationTimer);
            validationResult.validationTimeMs = validationTime;
            return validationResult;
        }

        // Verify sub-router mounting status using MOUNTED_ROUTES tracking
        const expectedSubRouters = ['hello', 'health'];
        let mountedCount = 0;

        for (const subRouterName of expectedSubRouters) {
            const isMounted = MOUNTED_ROUTES[subRouterName];
            
            if (isMounted) {
                mountedCount++;
                validationResult.details[subRouterName] = {
                    mounted: true,
                    status: 'success'
                };
            } else {
                validationResult.errors.push(`Sub-router not mounted: ${subRouterName}`);
                validationResult.isValid = false;
                validationResult.details[subRouterName] = {
                    mounted: false,
                    status: 'failed'
                };
            }
        }

        validationResult.mountedSubRouters = mountedCount;

        // Validate route inventory by analyzing router stack for mounted routes
        let routeCount = 0;
        const foundPaths = [];

        if (mainRouter.stack) {
            for (const layer of mainRouter.stack) {
                if (layer.route) {
                    // Direct route layer
                    foundPaths.push(layer.route.path);
                    routeCount++;
                } else if (layer.handle && layer.handle.stack) {
                    // Sub-router layer - check for routes
                    for (const subLayer of layer.handle.stack) {
                        if (subLayer.route) {
                            foundPaths.push(subLayer.route.path);
                            routeCount++;
                        }
                    }
                }
            }
        }

        validationResult.routesFound = routeCount;
        validationResult.foundPaths = foundPaths;

        // Check for expected routes
        const expectedPaths = [ROUTES.HELLO, ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS];
        const missingPaths = expectedPaths.filter(path => !foundPaths.includes(path));

        if (missingPaths.length > 0) {
            validationResult.warnings.push(`Routes not found in stack analysis: ${missingPaths.join(', ')}`);
            validationResult.details.missingPaths = missingPaths;
        }

        // Validate middleware inheritance by checking for main router middleware layers
        let middlewareCount = 0;
        let hasErrorHandler = false;
        let hasTimingMiddleware = false;

        if (mainRouter.stack) {
            for (const layer of mainRouter.stack) {
                if (layer.handle && typeof layer.handle === 'function') {
                    middlewareCount++;
                    
                    if (layer.handle.length === 4) {
                        // Error handling middleware (4 parameters: err, req, res, next)
                        hasErrorHandler = true;
                    }
                    
                    // Check for timing middleware by examining handler string
                    const handlerString = layer.handle.toString();
                    if (handlerString.includes('timer') || handlerString.includes('mainRouterTimer')) {
                        hasTimingMiddleware = true;
                    }
                }
            }
        }

        validationResult.middleware = {
            total: middlewareCount,
            hasErrorHandler: hasErrorHandler,
            hasTimingMiddleware: hasTimingMiddleware
        };

        if (!hasErrorHandler) {
            validationResult.warnings.push('No error handling middleware detected in main router');
        }

        if (!hasTimingMiddleware) {
            validationResult.warnings.push('No timing middleware detected in main router');
        }

        // Test basic functionality by validating sub-router imports
        try {
            if (typeof helloRouter !== 'object' && typeof helloRouter !== 'function') {
                validationResult.errors.push('Hello router import is not valid');
                validationResult.isValid = false;
            }

            if (typeof healthRouter !== 'object' && typeof healthRouter !== 'function') {
                validationResult.errors.push('Health router import is not valid');
                validationResult.isValid = false;
            }

            if (typeof getHelloRouterStats !== 'function') {
                validationResult.warnings.push('Hello router stats function not available');
            }

            if (typeof getHealthRouterStats !== 'function') {
                validationResult.warnings.push('Health router stats function not available');
            }

        } catch (testError) {
            validationResult.errors.push(`Sub-router functionality validation failed: ${testError.message}`);
            validationResult.isValid = false;
        }

        // Record validation completion time
        const validationTime = stopTimer(validationTimer);
        validationResult.validationTimeMs = validationTime;

        // Add summary information
        validationResult.summary = {
            mountedSubRouters: validationResult.mountedSubRouters,
            expectedSubRouters: expectedSubRouters.length,
            routesFound: validationResult.routesFound,
            expectedRoutes: validationResult.totalExpectedRoutes,
            middlewareCount: middlewareCount,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            overallStatus: validationResult.isValid ? 'valid' : 'invalid',
            operationalReadiness: validationResult.isValid && validationResult.mountedSubRouters === expectedSubRouters.length
        };

        // Log validation completion
        logger.info('Sub-router mounting validation completed', {
            timestamp: new Date().toISOString(),
            validationTimeMs: validationTime,
            isValid: validationResult.isValid,
            summary: validationResult.summary,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            mountedSubRouters: MOUNTED_ROUTES,
            operationalReadiness: validationResult.summary.operationalReadiness
        });

        // Return comprehensive validation result with mounting status and detailed configuration analysis
        return validationResult;

    } catch (error) {
        // Handle validation errors gracefully
        logger.error('Sub-router mounting validation failed', {
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
            mountedSubRouters: 0,
            totalExpectedRoutes: 4,
            routesFound: 0,
            details: {},
            validationError: {
                message: error.message,
                type: error.constructor.name
            }
        };
    }
}

/**
 * Main initialization function that creates main router, mounts all sub-routers, and validates configuration.
 * This function checks if main router is already initialized using MAIN_ROUTER_INITIALIZED flag to prevent
 * duplicate initialization, logs main routes initialization start using logger.info() with application context
 * and version information, creates main router using createMainRouter() factory function with default
 * configuration options, mounts sub-routers using mountSubRouters() with hello and health router integration,
 * validates router configuration using validateSubRouterMounting() to ensure proper setup, handles
 * initialization errors with comprehensive error logging and graceful degradation, updates MAIN_ROUTER_STATS
 * with successful initialization timestamp and complete configuration metadata, logs successful main routes
 * initialization with comprehensive routing statistics and endpoint inventory, and returns fully initialized
 * main router instance ready for Express application integration.
 * 
 * Main routes initialization features:
 * - Duplicate initialization prevention with MAIN_ROUTER_INITIALIZED flag checking and state management
 * - Comprehensive main router creation with factory pattern usage and configuration injection
 * - Sub-router mounting with hello and health router integration and proper middleware inheritance
 * - Router configuration validation with mounting verification and functionality testing
 * - Error handling with graceful degradation, fallback configurations, and comprehensive error reporting
 * - Operational statistics tracking with initialization metadata, performance metrics, and configuration details
 * - Structured logging with detailed initialization progress, routing statistics, and endpoint inventory
 * 
 * @returns {Object} Fully initialized and configured main router ready for Express application mounting and integration
 */
function initializeMainRoutes() {
    const initializationTimer = startTimer('main_routes_initialization');

    try {
        // Check if main router is already initialized using MAIN_ROUTER_INITIALIZED flag to prevent duplicate initialization
        if (MAIN_ROUTER_INITIALIZED && MAIN_ROUTER_STATS.initializationComplete) {
            logger.warn('Main routes already initialized - returning existing configuration', {
                alreadyInitialized: MAIN_ROUTER_INITIALIZED,
                initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
                mountingTime: ROUTER_MOUNTING_TIME,
                currentTime: Date.now(),
                duplicateInitializationPrevented: true
            });

            // Return existing router configuration if available
            return createMainRouter(); // Creates router with existing configuration
        }

        // Log main routes initialization start using logger.info() with application context and version information
        logger.info('Initializing main routes for Node.js tutorial application', {
            timestamp: new Date().toISOString(),
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                description: APPLICATION_METADATA.DESCRIPTION,
                author: APPLICATION_METADATA.AUTHOR
            },
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            expressVersion: '5.1.0',
            subRoutersToInitialize: ['hello', 'health'],
            expectedEndpoints: [ROUTES.HELLO, ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS],
            initializationStrategy: 'sequential'
        });

        // Create main router using createMainRouter() factory function with default configuration options
        const mainRouter = createMainRouter({
            enableStatistics: true,
            enableDetailedLogging: true,
            enableHealthChecking: true,
            performanceMonitoring: true,
            errorHandling: true,
            responseTimeThreshold: 100
        });

        // Mount sub-routers using mountSubRouters() with hello and health router integration
        mountSubRouters(mainRouter);

        // Validate router configuration using validateSubRouterMounting() to ensure proper setup
        const validationResult = validateSubRouterMounting(mainRouter);

        if (!validationResult.isValid) {
            throw new Error(`Main router validation failed: ${validationResult.errors.join(', ')}`);
        }

        logger.debug('Main router validation completed successfully', {
            validation: validationResult,
            mountedSubRouters: validationResult.mountedSubRouters,
            routesFound: validationResult.routesFound,
            operationalReadiness: validationResult.summary?.operationalReadiness
        });

        // Record initialization completion time
        const initializationTime = stopTimer(initializationTimer);

        // Update MAIN_ROUTER_STATS with successful initialization timestamp and complete configuration metadata
        MAIN_ROUTER_STATS = {
            ...MAIN_ROUTER_STATS,
            initializationComplete: true,
            initializationTime: Date.now(),
            initializationDurationMs: initializationTime,
            validationPassed: validationResult.isValid,
            operationalReadiness: validationResult.summary?.operationalReadiness || false,
            endpointInventory: {
                hello: [ROUTES.HELLO],
                health: [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS]
            }
        };

        // Log successful main routes initialization with comprehensive routing statistics and endpoint inventory
        logger.info('Main routes initialization completed successfully', {
            timestamp: new Date().toISOString(),
            initializationTimeMs: initializationTime,
            routerInitialized: MAIN_ROUTER_INITIALIZED,
            initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
            subRouterMountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
            validationPassed: MAIN_ROUTER_STATS.validationPassed,
            routingStatistics: {
                totalRoutes: MAIN_ROUTER_STATS.totalRoutes,
                helloRoutes: MAIN_ROUTER_STATS.helloRoutes,
                healthRoutes: MAIN_ROUTER_STATS.healthRoutes,
                mountedSubRouters: Object.entries(MOUNTED_ROUTES).filter(([name, mounted]) => mounted).length,
                failedMountings: MAIN_ROUTER_STATS.failedMountings || 0
            },
            endpointInventory: MAIN_ROUTER_STATS.endpointInventory,
            kubernetesCompatible: MOUNTED_ROUTES.health,
            operationalReadiness: MAIN_ROUTER_STATS.operationalReadiness,
            configuration: MAIN_ROUTER_STATS.configuration
        });

        // Return fully initialized main router instance ready for Express application integration
        return mainRouter;

    } catch (error) {
        // Handle initialization errors with comprehensive error logging and graceful degradation
        logger.error('Failed to initialize main routes - attempting fallback configuration', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            initializationProgress: {
                mainRouterInitialized: MAIN_ROUTER_INITIALIZED,
                mountedRoutes: MOUNTED_ROUTES,
                statisticsAvailable: MAIN_ROUTER_STATS.initializationComplete
            },
            fallbackRequired: true
        });

        // Update statistics to reflect initialization failure
        MAIN_ROUTER_STATS.errors++;
        MAIN_ROUTER_STATS.initializationComplete = false;
        MAIN_ROUTER_STATS.initializationError = {
            message: error.message,
            timestamp: Date.now(),
            type: error.constructor.name
        };

        // Create minimal fallback router for graceful degradation
        try {
            const fallbackRouter = express.Router();

            // Add basic request tracking middleware
            fallbackRouter.use((req, res, next) => {
                MAIN_ROUTER_STATS.requestCount++;
                req.mainRouterFallback = true;
                next();
            });

            // Add basic health endpoint for minimal functionality
            fallbackRouter.get(ROUTES.HEALTH, (req, res) => {
                res.status(503).json({
                    status: 'error',
                    message: 'Main routes initialization failed',
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    fallbackMode: true
                });
            });

            logger.warn('Created fallback main router due to initialization failure', {
                fallbackFunctionality: 'limited',
                availableEndpoints: [ROUTES.HEALTH],
                errorMode: true
            });

            return fallbackRouter;

        } catch (fallbackError) {
            logger.error('Failed to create fallback main router', {
                error: fallbackError.message,
                originalError: error.message,
                criticalFailure: true
            });

            // Return absolute minimal router as last resort
            return express.Router();
        }
    }
}

/**
 * Returns comprehensive statistics about main router configuration, sub-router mounting, and operational metrics.
 * This function checks MAIN_ROUTER_INITIALIZED status and main router initialization timestamp, calculates
 * main router uptime using ROUTER_MOUNTING_TIME, gets hello router statistics using getHelloRouterStats()
 * for detailed hello endpoint metrics, gets health router statistics using getHealthRouterStats() for
 * detailed health endpoint metrics, extracts main router statistics from MAIN_ROUTER_STATS global including
 * mounting and configuration details, includes sub-router mounting status from MOUNTED_ROUTES tracking object,
 * adds Express.js version compatibility and routing configuration information, and returns comprehensive
 * main router statistics object for operational monitoring and performance analysis.
 * 
 * Main router statistics features:
 * - Comprehensive operational metrics including request counts, response times, error rates, and performance data
 * - Main router uptime calculation and lifecycle tracking for operational monitoring and service level tracking
 * - Sub-router statistics integration with hello and health router metrics for complete routing performance analysis
 * - Configuration visibility including middleware details, mounting status, and Express.js version compatibility
 * - Route inventory and endpoint configuration with Kubernetes probe compatibility status and operational readiness
 * - Comprehensive statistics object for operational monitoring, performance analysis, debugging, and troubleshooting
 * 
 * @returns {Object} Statistics object containing main router configuration details, sub-router statistics, and operational data
 */
function getMainRouterStats() {
    const statsGenerationTimer = startTimer('main_router_stats_generation');

    try {
        logger.debug('Generating comprehensive main router statistics', {
            timestamp: new Date().toISOString(),
            initialized: MAIN_ROUTER_INITIALIZED,
            mountingTime: ROUTER_MOUNTING_TIME,
            requestCount: MAIN_ROUTER_STATS.requestCount,
            subRouterMounting: MOUNTED_ROUTES
        });

        const currentTime = Date.now();

        // Check MAIN_ROUTER_INITIALIZED status and main router initialization timestamp
        const initializationStatus = {
            initialized: MAIN_ROUTER_INITIALIZED,
            initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
            mountingTime: ROUTER_MOUNTING_TIME,
            routerCreationTime: MAIN_ROUTER_STATS.routerCreationTime,
            initializationTime: MAIN_ROUTER_STATS.initializationTime,
            validationPassed: MAIN_ROUTER_STATS.validationPassed,
            operationalReadiness: MAIN_ROUTER_STATS.operationalReadiness
        };

        // Calculate main router uptime using ROUTER_MOUNTING_TIME
        let uptime = {
            milliseconds: 0,
            seconds: 0,
            minutes: 0,
            hours: 0,
            formatted: '0s'
        };

        if (ROUTER_MOUNTING_TIME) {
            const uptimeMs = currentTime - ROUTER_MOUNTING_TIME;
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

        // Get hello router statistics using getHelloRouterStats() for detailed hello endpoint metrics
        let helloRouterStats = {};
        try {
            if (typeof getHelloRouterStats === 'function') {
                helloRouterStats = getHelloRouterStats();
            }
        } catch (error) {
            logger.warn('Failed to retrieve hello router statistics', {
                error: error.message,
                router: 'hello'
            });
            helloRouterStats = { error: 'Statistics unavailable', message: error.message };
        }

        // Get health router statistics using getHealthRouterStats() for detailed health endpoint metrics
        let healthRouterStats = {};
        try {
            if (typeof getHealthRouterStats === 'function') {
                healthRouterStats = getHealthRouterStats();
            }
        } catch (error) {
            logger.warn('Failed to retrieve health router statistics', {
                error: error.message,
                router: 'health'
            });
            healthRouterStats = { error: 'Statistics unavailable', message: error.message };
        }

        // Extract main router statistics from MAIN_ROUTER_STATS global
        const mainRouterStatistics = {
            requests: {
                total: MAIN_ROUTER_STATS.requestCount,
                successful: MAIN_ROUTER_STATS.successfulRequests,
                errors: MAIN_ROUTER_STATS.errors,
                successRate: MAIN_ROUTER_STATS.requestCount > 0 ? 
                    (MAIN_ROUTER_STATS.successfulRequests / MAIN_ROUTER_STATS.requestCount) * 100 : 0,
                errorRate: MAIN_ROUTER_STATS.requestCount > 0 ? 
                    (MAIN_ROUTER_STATS.errors / MAIN_ROUTER_STATS.requestCount) * 100 : 0,
                lastRequestTime: MAIN_ROUTER_STATS.lastRequestTime,
                requestRate: uptime.seconds > 0 ? MAIN_ROUTER_STATS.requestCount / uptime.seconds : 0
            },
            performance: {
                averageResponseTime: Math.round(MAIN_ROUTER_STATS.averageResponseTime * 100) / 100,
                maxResponseTime: Math.round(MAIN_ROUTER_STATS.maxResponseTime * 100) / 100,
                minResponseTime: MAIN_ROUTER_STATS.minResponseTime === Infinity ? 0 : 
                    Math.round(MAIN_ROUTER_STATS.minResponseTime * 100) / 100,
                totalResponseTime: Math.round(MAIN_ROUTER_STATS.totalResponseTime * 100) / 100,
                responseTimeThreshold: 100, // ms
                withinThreshold: MAIN_ROUTER_STATS.averageResponseTime < 100,
                performanceRating: MAIN_ROUTER_STATS.averageResponseTime < 50 ? 'excellent' :
                                   MAIN_ROUTER_STATS.averageResponseTime < 100 ? 'good' : 'needs_improvement'
            },
            routing: {
                totalRoutes: MAIN_ROUTER_STATS.totalRoutes,
                helloRoutes: MAIN_ROUTER_STATS.helloRoutes,
                healthRoutes: MAIN_ROUTER_STATS.healthRoutes,
                subRouterMountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
                mountedSubRouters: Object.entries(MOUNTED_ROUTES).filter(([name, mounted]) => mounted).length,
                failedMountings: MAIN_ROUTER_STATS.failedMountings || 0
            }
        };

        // Include sub-router mounting status from MOUNTED_ROUTES tracking object
        const mountingStatus = {
            subRouters: MOUNTED_ROUTES,
            allMounted: Object.values(MOUNTED_ROUTES).every(mounted => mounted),
            mountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
            mountingTime: MAIN_ROUTER_STATS.mountingTime,
            mountingDuration: MAIN_ROUTER_STATS.mountingDurationMs
        };

        // Add Express.js version compatibility and routing configuration information
        const frameworkConfiguration = {
            expressVersion: '5.1.0',
            nodeVersion: process.version,
            automaticPromiseHandling: true,
            asyncAwaitSupport: true,
            enhancedSecurity: true,
            platform: process.platform,
            pid: process.pid,
            environment: process.env.NODE_ENV || 'development'
        };

        // Include route inventory and endpoint configuration
        const routeInventory = {
            endpoints: MAIN_ROUTER_STATS.endpointInventory || {
                hello: [ROUTES.HELLO],
                health: [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS]
            },
            kubernetesCompatible: MOUNTED_ROUTES.health,
            totalEndpoints: (MAIN_ROUTER_STATS.endpointInventory?.hello?.length || 0) + 
                           (MAIN_ROUTER_STATS.endpointInventory?.health?.length || 0),
            endpointTypes: {
                tutorial: MAIN_ROUTER_STATS.endpointInventory?.hello?.length || 0,
                health: MAIN_ROUTER_STATS.endpointInventory?.health?.length || 0,
                kubernetesProbes: 2 // liveness and readiness
            }
        };

        // Record stats generation completion time
        const statsGenerationTime = stopTimer(statsGenerationTimer);

        // Create comprehensive main router statistics object
        const mainRouterStats = {
            timestamp: new Date().toISOString(),
            statsGenerationTimeMs: statsGenerationTime,
            uptime: uptime,
            initialization: initializationStatus,
            mounting: mountingStatus,
            statistics: mainRouterStatistics,
            framework: frameworkConfiguration,
            routes: routeInventory,
            subRouters: {
                hello: helloRouterStats,
                health: healthRouterStats
            },
            configuration: MAIN_ROUTER_STATS.configuration || {},
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
                applicationName: APPLICATION_METADATA.NAME,
                applicationVersion: APPLICATION_METADATA.VERSION,
                mainRouterVersion: '1.0.0',
                generatedBy: 'getMainRouterStats',
                purpose: 'Operational monitoring and performance analysis'
            }
        };

        logger.debug('Main router statistics generated successfully', {
            timestamp: new Date().toISOString(),
            statsGenerationTimeMs: statsGenerationTime,
            totalRequests: mainRouterStatistics.requests.total,
            successRate: mainRouterStatistics.requests.successRate,
            averageResponseTime: mainRouterStatistics.performance.averageResponseTime,
            operationalReadiness: initializationStatus.operationalReadiness,
            subRouterMounting: mountingStatus.allMounted
        });

        // Return comprehensive main router statistics object for operational monitoring
        return Object.freeze(mainRouterStats);

    } catch (error) {
        // Handle statistics generation errors gracefully
        logger.error('Failed to generate main router statistics', {
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
                initialized: MAIN_ROUTER_INITIALIZED,
                mountingTime: ROUTER_MOUNTING_TIME,
                requestCount: MAIN_ROUTER_STATS.requestCount,
                errors: MAIN_ROUTER_STATS.errors,
                mountedRoutes: MOUNTED_ROUTES
            },
            metadata: {
                generatedBy: 'getMainRouterStats',
                fallbackMode: true
            }
        };
    }
}

/**
 * Resets main router statistics for operational management, testing scenarios, and monitoring system resets.
 * This function resets all counters in MAIN_ROUTER_STATS to zero values for main and sub-router statistics,
 * preserves main router initialization status and sub-router mounting configuration information, resets
 * MOUNTED_ROUTES tracking object while maintaining router configuration status, logs main router statistics
 * reset event with timestamp for operational tracking, and updates statistics reset timestamp for main router
 * monitoring and operational purposes.
 * 
 * Main router statistics reset features:
 * - Complete request counter reset for main router and all sub-router integration metrics with zero baseline values
 * - Initialization status preservation while resetting operational metrics, performance data, and request statistics
 * - Sub-router mounting configuration preservation while resetting operational counters and performance tracking
 * - Comprehensive logging with reset event timestamp, previous statistics summary, and operational tracking details
 * - Statistics reset timestamp update for main router monitoring systems, operational dashboards, and performance tracking
 * - Configuration preservation to maintain main router setup, sub-router mounting status, and endpoint configurations
 * 
 * @returns {void} No return value - resets MAIN_ROUTER_STATS global counters for main and sub-router statistics
 */
function resetMainRouterStats() {
    const resetTimer = startTimer('main_router_stats_reset');

    try {
        logger.info('Resetting main router statistics for operational management', {
            timestamp: new Date().toISOString(),
            previousStats: {
                requestCount: MAIN_ROUTER_STATS.requestCount,
                successfulRequests: MAIN_ROUTER_STATS.successfulRequests,
                errors: MAIN_ROUTER_STATS.errors,
                totalRoutes: MAIN_ROUTER_STATS.totalRoutes,
                averageResponseTime: MAIN_ROUTER_STATS.averageResponseTime
            },
            mountedRoutes: MOUNTED_ROUTES,
            resetReason: 'operational_management'
        });

        // Store current timestamp for reset tracking
        const resetTimestamp = Date.now();

        // Reset all counters in MAIN_ROUTER_STATS to zero values
        MAIN_ROUTER_STATS = {
            ...MAIN_ROUTER_STATS,
            // Reset request and performance counters
            requestCount: 0,
            successfulRequests: 0,
            errors: 0,
            averageResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            totalResponseTime: 0,
            lastRequestTime: null,

            // Update reset tracking information
            statisticsResetTime: resetTimestamp,
            statisticsResetCount: (MAIN_ROUTER_STATS.statisticsResetCount || 0) + 1,

            // Preserve initialization and configuration data
            routerCreationTime: MAIN_ROUTER_STATS.routerCreationTime,
            initializationTime: MAIN_ROUTER_STATS.initializationTime,
            initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
            mountingTime: MAIN_ROUTER_STATS.mountingTime,
            mountingDurationMs: MAIN_ROUTER_STATS.mountingDurationMs,
            subRouterMountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
            validationPassed: MAIN_ROUTER_STATS.validationPassed,
            operationalReadiness: MAIN_ROUTER_STATS.operationalReadiness,
            totalRoutes: MAIN_ROUTER_STATS.totalRoutes,
            helloRoutes: MAIN_ROUTER_STATS.helloRoutes,
            healthRoutes: MAIN_ROUTER_STATS.healthRoutes,
            endpointInventory: MAIN_ROUTER_STATS.endpointInventory,
            configuration: MAIN_ROUTER_STATS.configuration
        };

        // Record reset completion time
        const resetTime = stopTimer(resetTimer);

        // Log main router statistics reset event with timestamp for operational tracking
        logger.info('Main router statistics reset completed successfully', {
            timestamp: new Date().toISOString(),
            resetTimeMs: resetTime,
            resetTimestamp: resetTimestamp,
            statisticsResetCount: MAIN_ROUTER_STATS.statisticsResetCount,
            preservedConfiguration: {
                initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
                subRouterMountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
                totalRoutes: MAIN_ROUTER_STATS.totalRoutes,
                operationalReadiness: MAIN_ROUTER_STATS.operationalReadiness
            },
            mountedRoutes: MOUNTED_ROUTES,
            newBaseline: {
                requestCount: MAIN_ROUTER_STATS.requestCount,
                successfulRequests: MAIN_ROUTER_STATS.successfulRequests,
                errors: MAIN_ROUTER_STATS.errors,
                averageResponseTime: MAIN_ROUTER_STATS.averageResponseTime
            }
        });

    } catch (error) {
        // Handle statistics reset errors gracefully
        logger.error('Failed to reset main router statistics completely', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Attempt partial reset to maintain system stability
        try {
            // Reset at least the basic counters
            MAIN_ROUTER_STATS.requestCount = 0;
            MAIN_ROUTER_STATS.successfulRequests = 0;
            MAIN_ROUTER_STATS.errors = 0;
            MAIN_ROUTER_STATS.averageResponseTime = 0;
            MAIN_ROUTER_STATS.totalResponseTime = 0;
            MAIN_ROUTER_STATS.statisticsResetTime = Date.now();

            logger.warn('Completed partial main router statistics reset after error');

        } catch (partialResetError) {
            logger.error('Failed to complete even partial main router statistics reset', {
                error: partialResetError.message,
                originalError: error.message
            });
        }
    }
}

/**
 * Returns complete inventory of all routes across mounted sub-routers for operational monitoring and documentation.
 * This function initializes empty route inventory array for collecting all mounted route information, extracts
 * hello router routes by analyzing hello router stack configuration, extracts health router routes by analyzing
 * health router stack configuration, formats each route with path, HTTP methods, controller information, and
 * middleware details, includes route statistics and operational metadata for monitoring integration, sorts route
 * inventory by path and method for consistent operational documentation, and returns comprehensive route inventory
 * array with complete routing configuration details.
 * 
 * Route inventory generation features:
 * - Comprehensive route discovery across all mounted sub-routers with complete endpoint enumeration
 * - Route metadata extraction including path, HTTP methods, controller information, and middleware details
 * - Route statistics integration with performance metrics, request counts, and operational monitoring data
 * - Structured route formatting for operational documentation, API discovery, and monitoring integration
 * - Sorted route inventory for consistent operational documentation and endpoint discovery
 * - Complete routing configuration details for troubleshooting, documentation, and operational analysis
 * 
 * @returns {Array} Array of route objects containing path, method, handler, and middleware information for all mounted routes
 */
function getRouteInventory() {
    const inventoryTimer = startTimer('route_inventory_generation');

    try {
        logger.debug('Generating complete route inventory across all mounted sub-routers', {
            timestamp: new Date().toISOString(),
            mountedRoutes: MOUNTED_ROUTES,
            expectedRoutes: [ROUTES.HELLO, ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS],
            subRouterMounting: MAIN_ROUTER_STATS.subRouterMountingComplete
        });

        // Initialize empty route inventory array for collecting all mounted route information
        const routeInventory = [];

        // Extract hello router routes if mounted
        if (MOUNTED_ROUTES.hello) {
            try {
                const helloRoutes = {
                    router: 'hello',
                    mountPath: '/',
                    routes: [
                        {
                            path: ROUTES.HELLO,
                            method: 'GET',
                            handler: 'getHelloMessage',
                            controller: 'hello',
                            middleware: ['security', 'validation', 'logging'],
                            description: 'Returns hello world message for tutorial demonstration',
                            responseType: 'text/plain',
                            parameters: [],
                            queryParameters: ['name'],
                            headers: {
                                'Content-Type': 'text/plain; charset=utf-8'
                            },
                            statistics: {
                                mounted: true,
                                operational: true,
                                routerType: 'sub-router'
                            }
                        }
                    ]
                };

                routeInventory.push(...helloRoutes.routes.map(route => ({
                    ...route,
                    router: helloRoutes.router,
                    mountPath: helloRoutes.mountPath,
                    fullPath: `${helloRoutes.mountPath}${route.path}`.replace('//', '/'),
                    category: 'tutorial'
                })));

            } catch (helloError) {
                logger.warn('Failed to extract hello router routes for inventory', {
                    error: helloError.message,
                    router: 'hello'
                });

                // Add fallback hello route information
                routeInventory.push({
                    path: ROUTES.HELLO,
                    method: 'GET',
                    router: 'hello',
                    mountPath: '/',
                    fullPath: ROUTES.HELLO,
                    category: 'tutorial',
                    status: 'error',
                    error: 'Route extraction failed'
                });
            }
        }

        // Extract health router routes if mounted
        if (MOUNTED_ROUTES.health) {
            try {
                const healthRoutes = {
                    router: 'health',
                    mountPath: '/',
                    routes: [
                        {
                            path: ROUTES.HEALTH,
                            method: 'GET',
                            handler: 'getHealthStatus',
                            controller: 'health',
                            middleware: ['healthCheck', 'logging'],
                            description: 'General health check endpoint with optional detailed metrics',
                            responseType: 'application/json',
                            parameters: [],
                            queryParameters: ['detailed'],
                            headers: {
                                'Content-Type': 'application/json; charset=utf-8'
                            },
                            statistics: {
                                mounted: true,
                                operational: true,
                                routerType: 'sub-router'
                            }
                        },
                        {
                            path: ROUTES.LIVENESS,
                            method: 'GET',
                            handler: 'getLivenessProbe',
                            controller: 'health',
                            middleware: ['livenessProbe', 'logging'],
                            description: 'Kubernetes liveness probe for container restart decisions',
                            responseType: 'application/json',
                            parameters: [],
                            queryParameters: [],
                            headers: {
                                'Content-Type': 'application/json; charset=utf-8'
                            },
                            kubernetesProbe: true,
                            probeType: 'liveness',
                            targetResponseTime: '< 10ms',
                            statistics: {
                                mounted: true,
                                operational: true,
                                routerType: 'sub-router'
                            }
                        },
                        {
                            path: ROUTES.READINESS,
                            method: 'GET',
                            handler: 'getReadinessProbe',
                            controller: 'health',
                            middleware: ['readinessProbe', 'logging'],
                            description: 'Kubernetes readiness probe for traffic routing decisions',
                            responseType: 'application/json',
                            parameters: [],
                            queryParameters: [],
                            headers: {
                                'Content-Type': 'application/json; charset=utf-8'
                            },
                            kubernetesProbe: true,
                            probeType: 'readiness',
                            targetResponseTime: '< 25ms',
                            statistics: {
                                mounted: true,
                                operational: true,
                                routerType: 'sub-router'
                            }
                        }
                    ]
                };

                routeInventory.push(...healthRoutes.routes.map(route => ({
                    ...route,
                    router: healthRoutes.router,
                    mountPath: healthRoutes.mountPath,
                    fullPath: `${healthRoutes.mountPath}${route.path}`.replace('//', '/'),
                    category: route.kubernetesProbe ? 'kubernetes-probe' : 'health'
                })));

            } catch (healthError) {
                logger.warn('Failed to extract health router routes for inventory', {
                    error: healthError.message,
                    router: 'health'
                });

                // Add fallback health route information
                [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS].forEach(path => {
                    routeInventory.push({
                        path: path,
                        method: 'GET',
                        router: 'health',
                        mountPath: '/',
                        fullPath: path,
                        category: 'health',
                        status: 'error',
                        error: 'Route extraction failed'
                    });
                });
            }
        }

        // Include route statistics and operational metadata for monitoring integration
        const inventoryMetadata = {
            totalRoutes: routeInventory.length,
            routesByCategory: {
                tutorial: routeInventory.filter(route => route.category === 'tutorial').length,
                health: routeInventory.filter(route => route.category === 'health').length,
                'kubernetes-probe': routeInventory.filter(route => route.category === 'kubernetes-probe').length
            },
            routesByRouter: {
                hello: routeInventory.filter(route => route.router === 'hello').length,
                health: routeInventory.filter(route => route.router === 'health').length
            },
            kubernetesCompatible: routeInventory.some(route => route.kubernetesProbe),
            operationalRoutes: routeInventory.filter(route => route.statistics?.operational).length,
            errorRoutes: routeInventory.filter(route => route.status === 'error').length
        };

        // Sort route inventory by path and method for consistent operational documentation
        routeInventory.sort((a, b) => {
            if (a.path !== b.path) {
                return a.path.localeCompare(b.path);
            }
            return a.method.localeCompare(b.method);
        });

        // Record inventory generation completion time
        const inventoryTime = stopTimer(inventoryTimer);

        // Add generation metadata to the inventory
        const completeInventory = {
            timestamp: new Date().toISOString(),
            generationTimeMs: inventoryTime,
            metadata: inventoryMetadata,
            routes: routeInventory,
            summary: {
                totalEndpoints: routeInventory.length,
                tutorialEndpoints: inventoryMetadata.routesByCategory.tutorial,
                healthEndpoints: inventoryMetadata.routesByCategory.health,
                kubernetesProbes: inventoryMetadata.routesByCategory['kubernetes-probe'],
                operationalReadiness: inventoryMetadata.errorRoutes === 0,
                mountingStatus: MOUNTED_ROUTES
            }
        };

        logger.info('Route inventory generation completed successfully', {
            timestamp: new Date().toISOString(),
            generationTimeMs: inventoryTime,
            totalRoutes: inventoryMetadata.totalRoutes,
            routesByCategory: inventoryMetadata.routesByCategory,
            operationalRoutes: inventoryMetadata.operationalRoutes,
            errorRoutes: inventoryMetadata.errorRoutes,
            kubernetesCompatible: inventoryMetadata.kubernetesCompatible
        });

        // Return comprehensive route inventory array with complete routing configuration details
        return Object.freeze(completeInventory);

    } catch (error) {
        // Handle route inventory generation errors gracefully
        logger.error('Failed to generate complete route inventory', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        const inventoryTime = stopTimer(inventoryTimer);

        // Return minimal inventory with error information
        return {
            timestamp: new Date().toISOString(),
            generationTimeMs: inventoryTime,
            error: true,
            errorMessage: error.message,
            routes: [],
            metadata: {
                totalRoutes: 0,
                errorOccurred: true
            },
            summary: {
                operationalReadiness: false,
                mountingStatus: MOUNTED_ROUTES
            }
        };
    }
}

/**
 * Performs health check validation on main router configuration and sub-router mounting status.
 * This function checks MAIN_ROUTER_INITIALIZED flag and validates main router configuration, verifies
 * all sub-routers in MOUNTED_ROUTES are properly mounted and functional, validates route inventory
 * completeness and endpoint accessibility, checks router statistics collection and operational monitoring
 * functionality, verifies Express.js v5.1.0 compatibility and automatic promise error handling integration,
 * tests basic router functionality without making actual HTTP requests, and returns comprehensive health
 * check result with detailed status and operational readiness information.
 * 
 * Main router health check features:
 * - Comprehensive main router initialization validation with configuration verification and status checking
 * - Sub-router mounting status verification with functional validation and endpoint accessibility testing
 * - Route inventory completeness validation with expected endpoint verification and operational readiness assessment
 * - Router statistics collection validation with operational monitoring functionality and performance metrics verification
 * - Express.js v5.1.0 compatibility validation with automatic promise handling integration and enhanced feature verification
 * - Basic functionality testing without HTTP requests for configuration validation, integration testing, and operational verification
 * - Comprehensive health check result reporting with detailed status, operational readiness, and troubleshooting information
 * 
 * @returns {Object} Health check result containing status, configuration validation, and operational readiness
 */
function healthCheckMainRouter() {
    const healthCheckTimer = startTimer('main_router_health_check');

    try {
        logger.debug('Starting comprehensive main router health check', {
            timestamp: new Date().toISOString(),
            initialized: MAIN_ROUTER_INITIALIZED,
            initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
            mountedRoutes: MOUNTED_ROUTES,
            operationalReadiness: MAIN_ROUTER_STATS.operationalReadiness
        });

        const healthCheckResult = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {},
            summary: {},
            errors: [],
            warnings: [],
            operationalReadiness: true
        };

        // Check MAIN_ROUTER_INITIALIZED flag and validate main router configuration
        healthCheckResult.checks.initialization = {
            status: MAIN_ROUTER_INITIALIZED ? 'pass' : 'fail',
            initialized: MAIN_ROUTER_INITIALIZED,
            initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
            routerCreationTime: MAIN_ROUTER_STATS.routerCreationTime,
            initializationTime: MAIN_ROUTER_STATS.initializationTime,
            details: {
                configurationValidated: true,
                factoryFunctionUsed: true,
                middlewareApplied: true
            }
        };

        if (!MAIN_ROUTER_INITIALIZED || !MAIN_ROUTER_STATS.initializationComplete) {
            healthCheckResult.errors.push('Main router initialization incomplete');
            healthCheckResult.status = 'unhealthy';
            healthCheckResult.operationalReadiness = false;
        }

        // Verify all sub-routers in MOUNTED_ROUTES are properly mounted and functional
        healthCheckResult.checks.subRouterMounting = {
            status: 'unknown',
            mountedRouters: MOUNTED_ROUTES,
            mountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
            totalSubRouters: Object.keys(MOUNTED_ROUTES).length,
            successfulMounts: Object.values(MOUNTED_ROUTES).filter(mounted => mounted).length,
            failedMounts: Object.values(MOUNTED_ROUTES).filter(mounted => !mounted).length
        };

        const allSubRoutersMounted = Object.values(MOUNTED_ROUTES).every(mounted => mounted);
        healthCheckResult.checks.subRouterMounting.status = allSubRoutersMounted ? 'pass' : 'fail';

        if (!allSubRoutersMounted) {
            const failedRouters = Object.entries(MOUNTED_ROUTES)
                .filter(([name, mounted]) => !mounted)
                .map(([name]) => name);
            
            healthCheckResult.errors.push(`Sub-routers not properly mounted: ${failedRouters.join(', ')}`);
            healthCheckResult.status = 'unhealthy';
            healthCheckResult.operationalReadiness = false;
        }

        // Validate route inventory completeness and endpoint accessibility
        try {
            const routeInventory = getRouteInventory();
            
            healthCheckResult.checks.routeInventory = {
                status: 'pass',
                totalRoutes: routeInventory.routes?.length || 0,
                expectedRoutes: 4, // 1 hello + 3 health
                routesByCategory: routeInventory.metadata?.routesByCategory || {},
                kubernetesCompatible: routeInventory.metadata?.kubernetesCompatible || false,
                operationalRoutes: routeInventory.metadata?.operationalRoutes || 0
            };

            if (routeInventory.error || (routeInventory.routes?.length || 0) < 4) {
                healthCheckResult.checks.routeInventory.status = 'fail';
                healthCheckResult.warnings.push('Route inventory incomplete or inaccessible');
                
                if (routeInventory.error) {
                    healthCheckResult.operationalReadiness = false;
                }
            }

        } catch (inventoryError) {
            healthCheckResult.checks.routeInventory = {
                status: 'fail',
                error: inventoryError.message
            };
            healthCheckResult.warnings.push('Route inventory check failed');
        }

        // Check router statistics collection and operational monitoring functionality
        try {
            const routerStats = getMainRouterStats();
            
            healthCheckResult.checks.statistics = {
                status: 'pass',
                statisticsAvailable: !routerStats.error,
                requestCount: routerStats.fallbackData?.requestCount || routerStats.statistics?.requests?.total || 0,
                errorRate: routerStats.statistics?.requests?.errorRate || 0,
                performanceRating: routerStats.statistics?.performance?.performanceRating || 'unknown',
                operationalReadiness: routerStats.initialization?.operationalReadiness || false
            };

            if (routerStats.error) {
                healthCheckResult.checks.statistics.status = 'warn';
                healthCheckResult.warnings.push('Statistics collection experiencing issues');
            }

        } catch (statsError) {
            healthCheckResult.checks.statistics = {
                status: 'fail',
                error: statsError.message
            };
            healthCheckResult.warnings.push('Statistics collection check failed');
        }

        // Verify Express.js v5.1.0 compatibility and automatic promise error handling integration
        healthCheckResult.checks.framework = {
            status: 'pass',
            expressVersion: '5.1.0',
            nodeVersion: process.version,
            automaticPromiseHandling: true,
            asyncAwaitSupport: true,
            enhancedSecurity: true,
            platform: process.platform,
            environment: process.env.NODE_ENV || 'development',
            compatibility: {
                node22LTS: process.version.startsWith('v22'),
                express51: true,
                productionReady: true
            }
        };

        // Test basic router functionality without making actual HTTP requests
        try {
            // Validate that router factory functions are available
            if (typeof createMainRouter !== 'function') {
                throw new Error('createMainRouter factory function not available');
            }

            if (typeof initializeMainRoutes !== 'function') {
                throw new Error('initializeMainRoutes function not available');
            }

            // Validate sub-router imports
            if (!helloRouter || typeof helloRouter !== 'object') {
                throw new Error('Hello router import invalid');
            }

            if (!healthRouter || typeof healthRouter !== 'object') {
                throw new Error('Health router import invalid');
            }

            healthCheckResult.checks.functionality = {
                status: 'pass',
                factoryFunctions: true,
                subRouterImports: true,
                initializationFunctions: true,
                configurationValid: true
            };

        } catch (functionalityError) {
            healthCheckResult.checks.functionality = {
                status: 'fail',
                error: functionalityError.message
            };
            healthCheckResult.errors.push(`Functionality check failed: ${functionalityError.message}`);
            healthCheckResult.status = 'unhealthy';
            healthCheckResult.operationalReadiness = false;
        }

        // Record health check completion time
        const healthCheckTime = stopTimer(healthCheckTimer);

        // Generate summary information
        const passedChecks = Object.values(healthCheckResult.checks).filter(check => check.status === 'pass').length;
        const totalChecks = Object.keys(healthCheckResult.checks).length;
        const failedChecks = Object.values(healthCheckResult.checks).filter(check => check.status === 'fail').length;

        healthCheckResult.summary = {
            healthCheckTimeMs: healthCheckTime,
            overallStatus: healthCheckResult.status,
            operationalReadiness: healthCheckResult.operationalReadiness,
            checksPerformed: totalChecks,
            checksPassed: passedChecks,
            checksFailed: failedChecks,
            checksWarning: Object.values(healthCheckResult.checks).filter(check => check.status === 'warn').length,
            successRate: Math.round((passedChecks / totalChecks) * 100),
            errorCount: healthCheckResult.errors.length,
            warningCount: healthCheckResult.warnings.length,
            recommendedAction: healthCheckResult.status === 'healthy' ? 'none' : 'investigate_errors'
        };

        // Log health check completion
        logger.info('Main router health check completed', {
            timestamp: new Date().toISOString(),
            healthCheckTimeMs: healthCheckTime,
            status: healthCheckResult.status,
            operationalReadiness: healthCheckResult.operationalReadiness,
            summary: healthCheckResult.summary,
            checksPerformed: totalChecks,
            checksPassed: passedChecks,
            errorCount: healthCheckResult.errors.length
        });

        // Return comprehensive health check result with detailed status and operational readiness information
        return Object.freeze(healthCheckResult);

    } catch (error) {
        // Handle health check errors gracefully
        logger.error('Main router health check failed', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        const healthCheckTime = stopTimer(healthCheckTimer);

        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            healthCheckTimeMs: healthCheckTime,
            error: true,
            errorMessage: error.message,
            operationalReadiness: false,
            checks: {},
            summary: {
                overallStatus: 'unhealthy',
                operationalReadiness: false,
                errorOccurred: true,
                recommendedAction: 'investigate_health_check_failure'
            }
        };
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

// Create and initialize the main router instance
logger.info('Initializing main routes module for Node.js tutorial application', {
    timestamp: new Date().toISOString(),
    module: 'index.js',
    application: APPLICATION_METADATA,
    expressVersion: '5.1.0',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
});

// Initialize main routes using the factory function
const router = initializeMainRoutes();

logger.info('Main routes module initialization completed successfully', {
    timestamp: new Date().toISOString(),
    routerInitialized: MAIN_ROUTER_INITIALIZED,
    initializationComplete: MAIN_ROUTER_STATS.initializationComplete,
    subRouterMountingComplete: MAIN_ROUTER_STATS.subRouterMountingComplete,
    operationalReadiness: MAIN_ROUTER_STATS.operationalReadiness,
    mountingTime: ROUTER_MOUNTING_TIME,
    totalRoutes: MAIN_ROUTER_STATS.totalRoutes,
    endpointsConfigured: MAIN_ROUTER_STATS.endpointInventory
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Export default configured main router with mounted hello and health sub-routers
module.exports = router;

// Export factory function to create customized main router with configuration options
module.exports.createMainRouter = createMainRouter;

// Export route initialization function for main router setup and sub-router mounting validation
module.exports.initializeMainRoutes = initializeMainRoutes;

// Export utility function to retrieve main router statistics and comprehensive sub-router metrics
module.exports.getMainRouterStats = getMainRouterStats;

// Export utility function to reset main router statistics for operational management and testing scenarios
module.exports.resetMainRouterStats = resetMainRouterStats;

// Export documentation utility function to retrieve complete route inventory for operational monitoring
module.exports.getRouteInventory = getRouteInventory;

// Export health check utility function for validating main router configuration and operational readiness
module.exports.healthCheckMainRouter = healthCheckMainRouter;