/**
 * Express.js Hello Route Module for Node.js Tutorial Application
 * 
 * This module defines and configures the /hello endpoint for the Node.js tutorial application.
 * Creates an Express Router instance, registers the GET /hello route with appropriate middleware
 * stack, integrates controller functions, and implements route-specific validation and error
 * handling. Demonstrates Express.js 5.1.0 routing patterns, middleware integration, controller
 * delegation, and RESTful endpoint design following MVC architecture principles.
 * 
 * Serves as the presentation layer entry point for the hello world functionality with
 * comprehensive logging, validation, and educational-focused route configuration supporting
 * Node.js v22.x LTS runtime environment and Express.js framework best practices.
 * 
 * Architecture:
 * - Implements Express.js Router pattern for modular route organization
 * - Integrates with controller layer for request processing delegation
 * - Provides comprehensive middleware stack configuration and management
 * - Supports route-level error handling and async error processing
 * - Demonstrates educational-focused logging and monitoring capabilities
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Express.js v5.1.0 - Web framework for Node.js providing Router functionality and middleware support
const express = require('express');

// Import controller functions for request processing and validation
const {
    handleHelloRequest,
    validateRequestMethod
} = require('../controllers/index.js');

// Import middleware functions for request logging and async error handling
const {
    requestLogger,
    handleAsyncErrors
} = require('../middleware/index.js');

// Import logger factory for creating component-specific loggers with consistent configuration
const { getLogger } = require('../utils/logger.js');

// Import application constants for consistent route paths and HTTP methods
const {
    ROUTES,
    HTTP_METHODS,
    APPLICATION,
    HTTP_STATUS,
    ERROR_MESSAGES
} = require('../utils/constants.js');

// Initialize component-specific logger for route-level logging and debugging
const logger = getLogger('helloRoute');

// Global route identification constants for metadata and logging
const ROUTE_NAME = 'HelloRoute';
const ROUTE_VERSION = '1.0.0';

// Route path and method constants for consistent configuration
const HELLO_ROUTE_PATH = ROUTES.HELLO;
const HELLO_ROUTE_METHOD = HTTP_METHODS.GET;

/**
 * Factory function that creates and configures an Express.js Router instance for the /hello
 * endpoint with comprehensive middleware stack, route validation, controller integration, and
 * error handling for educational demonstration of Express.js routing patterns.
 * 
 * @param {Object} options - Configuration options for router creation and middleware setup
 * @param {boolean} options.enableLogging - Whether to enable request logging middleware
 * @param {boolean} options.enableErrorHandling - Whether to enable async error handling
 * @param {boolean} options.enableValidation - Whether to enable request method validation
 * @param {Object} options.middlewareConfig - Custom middleware configuration options
 * @param {string} options.routePath - Custom route path override (defaults to /hello)
 * @param {string} options.method - HTTP method override (defaults to GET)
 * @returns {Object} Configured Express.js Router instance with /hello route and middleware stack
 */
function createHelloRouter(options = {}) {
    try {
        logger.info('Creating Hello Router with configuration', {
            routeName: ROUTE_NAME,
            version: ROUTE_VERSION,
            options: options,
            defaultPath: HELLO_ROUTE_PATH,
            defaultMethod: HELLO_ROUTE_METHOD
        });

        // Create new Express.js Router instance using express.Router() with appropriate options
        const routerOptions = {
            caseSensitive: options.caseSensitive || false,
            mergeParams: options.mergeParams || false,
            strict: options.strict || false
        };
        
        const router = express.Router(routerOptions);

        // Extract configuration options with defaults for middleware and route setup
        const config = {
            enableLogging: options.enableLogging !== false,
            enableErrorHandling: options.enableErrorHandling !== false,
            enableValidation: options.enableValidation !== false,
            middlewareConfig: options.middlewareConfig || {},
            routePath: options.routePath || HELLO_ROUTE_PATH,
            method: options.method || HELLO_ROUTE_METHOD,
            ...options
        };

        // Configure router-level middleware including request logging and async error handling
        const middlewareRouter = configureRouteMiddleware(router, config);

        // Apply route-specific middleware stack for request validation and processing
        const middlewareStack = [];

        // Add request logging middleware if enabled
        if (config.enableLogging) {
            middlewareStack.push(requestLogger);
            logger.debug('Added request logging middleware to Hello route');
        }

        // Add request method validation middleware if enabled
        if (config.enableValidation) {
            const methodValidationMiddleware = (req, res, next) => {
                try {
                    const isValidMethod = validateRequestMethod(req, config.method);
                    if (!isValidMethod) {
                        const error = new Error(ERROR_MESSAGES.METHOD_NOT_ALLOWED);
                        error.status = HTTP_STATUS.METHOD_NOT_ALLOWED;
                        error.method = req.method;
                        error.expectedMethod = config.method;
                        throw error;
                    }
                    next();
                } catch (error) {
                    next(error);
                }
            };
            middlewareStack.push(methodValidationMiddleware);
            logger.debug('Added method validation middleware to Hello route');
        }

        // Register GET /hello route using ROUTES.HELLO constant with handleHelloRequest controller
        const routeHandler = config.enableErrorHandling ? 
            handleAsyncErrors(handleHelloRequest) : 
            handleHelloRequest;

        middlewareRouter[config.method.toLowerCase()](
            config.routePath,
            ...middlewareStack,
            routeHandler
        );

        // Add error handling middleware specific to hello route processing
        const errorHandlingRouter = setupRouteErrorHandling(middlewareRouter);

        // Log route registration with path, method, controller, and middleware information
        logRouteRegistration(config.routePath, config.method, {
            controller: 'handleHelloRequest',
            middleware: middlewareStack.length,
            errorHandling: config.enableErrorHandling,
            validation: config.enableValidation,
            logging: config.enableLogging,
            routerOptions: routerOptions
        });

        // Add route metadata for debugging and monitoring purposes
        errorHandlingRouter._routeMetadata = createRouteMetadata(errorHandlingRouter, config);

        logger.info('Hello Router created successfully', {
            routePath: config.routePath,
            method: config.method,
            middlewareCount: middlewareStack.length,
            enabledFeatures: {
                logging: config.enableLogging,
                errorHandling: config.enableErrorHandling,
                validation: config.enableValidation
            }
        });

        // Return configured router instance ready for Express.js application integration
        return errorHandlingRouter;

    } catch (error) {
        logger.error('Error creating Hello Router', {
            error: error.message,
            stack: error.stack,
            options: options
        });

        // Return minimal router configuration if creation fails
        const fallbackRouter = express.Router();
        fallbackRouter.get(HELLO_ROUTE_PATH, handleHelloRequest);
        return fallbackRouter;
    }
}

/**
 * Validates the hello route configuration including path consistency, middleware stack
 * integrity, controller integration, and Express.js Router structure for testing and
 * configuration verification.
 * 
 * @param {Object} router - Express.js Router instance to validate
 * @param {Object} validationOptions - Additional validation options and rules
 * @returns {Object} Validation result object with status, details, and configuration analysis
 */
function validateHelloRoute(router, validationOptions = {}) {
    try {
        logger.debug('Validating Hello Route configuration', {
            hasRouter: Boolean(router),
            validationOptions: validationOptions
        });

        // Initialize validation result object with success tracking
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            details: {},
            timestamp: new Date().toISOString()
        };

        // Validate Express.js Router instance structure and method registration
        if (!router) {
            validationResult.errors.push('Router instance is required');
            validationResult.isValid = false;
        } else if (typeof router !== 'function') {
            validationResult.errors.push('Router must be a valid Express.js Router instance');
            validationResult.isValid = false;
        }

        // Check route path consistency against ROUTES.HELLO constant definition
        if (router && router.stack) {
            const helloRoutes = router.stack.filter(layer => 
                layer.route && layer.route.path === HELLO_ROUTE_PATH
            );

            if (helloRoutes.length === 0) {
                validationResult.errors.push(`No route found for path: ${HELLO_ROUTE_PATH}`);
                validationResult.isValid = false;
            } else if (helloRoutes.length > 1) {
                validationResult.warnings.push(`Multiple routes found for path: ${HELLO_ROUTE_PATH}`);
            }

            validationResult.details.routeCount = helloRoutes.length;
            validationResult.details.totalLayers = router.stack.length;
        }

        // Verify controller function integration and proper method binding
        const routeMetadata = router._routeMetadata;
        if (routeMetadata) {
            if (!routeMetadata.controller) {
                validationResult.warnings.push('No controller metadata found');
            }
            validationResult.details.metadata = routeMetadata;
        }

        // Validate middleware stack configuration and execution order
        if (router.stack) {
            const middlewareValidation = {
                totalMiddleware: router.stack.length,
                routeMiddleware: 0,
                errorMiddleware: 0
            };

            router.stack.forEach(layer => {
                if (layer.route) {
                    middlewareValidation.routeMiddleware++;
                } else if (layer.handle.length === 4) {
                    middlewareValidation.errorMiddleware++;
                }
            });

            validationResult.details.middleware = middlewareValidation;
        }

        // Check error handling middleware presence and configuration
        const hasErrorHandling = router.stack && router.stack.some(layer => 
            layer.handle && layer.handle.length === 4
        );

        if (!hasErrorHandling) {
            validationResult.warnings.push('No error handling middleware detected');
        }

        validationResult.details.hasErrorHandling = hasErrorHandling;

        // Verify route logging configuration and output formatting
        const hasLogging = router.stack && router.stack.some(layer =>
            layer.handle && layer.handle.name === 'requestLoggerMiddleware'
        );

        validationResult.details.hasLogging = hasLogging;

        // Compile validation results with success/failure status and detailed analysis
        validationResult.summary = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            isHealthy: validationResult.isValid && validationResult.errors.length === 0,
            validationScore: Math.max(0, 100 - (validationResult.errors.length * 20) - (validationResult.warnings.length * 5))
        };

        logger.info('Hello Route validation completed', {
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            validationScore: validationResult.summary.validationScore
        });

        // Return comprehensive validation report with status and recommendations
        return validationResult;

    } catch (error) {
        logger.error('Error during Hello Route validation', {
            error: error.message,
            stack: error.stack
        });

        return {
            isValid: false,
            errors: [`Validation failed: ${error.message}`],
            warnings: [],
            details: {},
            summary: {
                totalErrors: 1,
                totalWarnings: 0,
                isHealthy: false,
                validationScore: 0
            },
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Configures and applies route-specific middleware stack for the hello route including
 * request logging, validation, error handling, and performance monitoring middleware
 * with educational focus.
 * 
 * @param {Object} router - Express.js Router instance to configure
 * @param {Object} middlewareOptions - Configuration options for middleware setup
 * @returns {Object} Router instance with configured middleware stack
 */
function configureRouteMiddleware(router, middlewareOptions = {}) {
    try {
        logger.debug('Configuring route middleware for Hello route', {
            options: middlewareOptions,
            routePath: middlewareOptions.routePath || HELLO_ROUTE_PATH
        });

        // Extract middleware configuration options with defaults
        const config = {
            enableRequestLogging: middlewareOptions.enableLogging !== false,
            enableMethodValidation: middlewareOptions.enableValidation !== false,
            enableAsyncErrorHandling: middlewareOptions.enableErrorHandling !== false,
            enablePerformanceMonitoring: middlewareOptions.enablePerformanceMonitoring || false,
            enableResponseHeaders: middlewareOptions.enableResponseHeaders !== false,
            ...middlewareOptions
        };

        // Apply request logging middleware with route-specific configuration and formatting
        if (config.enableRequestLogging) {
            const loggingMiddleware = (req, res, next) => {
                const startTime = Date.now();
                
                logger.info('Processing Hello route request', {
                    method: req.method,
                    path: req.path,
                    userAgent: req.get('User-Agent'),
                    remoteAddress: req.ip || req.connection.remoteAddress,
                    timestamp: new Date().toISOString()
                });

                // Add response time logging
                const originalSend = res.send;
                res.send = function(data) {
                    const responseTime = Date.now() - startTime;
                    logger.info('Hello route response sent', {
                        statusCode: res.statusCode,
                        responseTime: `${responseTime}ms`,
                        contentLength: data ? data.length : 0
                    });
                    return originalSend.call(this, data);
                };

                next();
            };

            router.use(loggingMiddleware);
            logger.debug('Applied request logging middleware');
        }

        // Configure request method validation middleware for GET method enforcement
        if (config.enableMethodValidation) {
            const methodValidationMiddleware = (req, res, next) => {
                if (req.path === (config.routePath || HELLO_ROUTE_PATH)) {
                    const expectedMethod = config.method || HELLO_ROUTE_METHOD;
                    if (req.method !== expectedMethod) {
                        logger.warn('Invalid HTTP method detected', {
                            actualMethod: req.method,
                            expectedMethod: expectedMethod,
                            path: req.path
                        });
                    }
                }
                next();
            };

            router.use(methodValidationMiddleware);
            logger.debug('Applied method validation middleware');
        }

        // Add async error handling wrapper for Express.js 5.1.0 error capabilities
        if (config.enableAsyncErrorHandling) {
            const asyncErrorMiddleware = (req, res, next) => {
                // Add async error handling metadata to request
                req.asyncErrorHandling = {
                    enabled: true,
                    route: ROUTE_NAME,
                    timestamp: new Date().toISOString()
                };
                next();
            };

            router.use(asyncErrorMiddleware);
            logger.debug('Applied async error handling middleware');
        }

        // Configure response header middleware for consistent HTTP headers
        if (config.enableResponseHeaders) {
            const responseHeaderMiddleware = (req, res, next) => {
                // Add standard response headers
                res.set({
                    'X-Tutorial-App': APPLICATION.NAME,
                    'X-Route-Name': ROUTE_NAME,
                    'X-Route-Version': ROUTE_VERSION,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                next();
            };

            router.use(responseHeaderMiddleware);
            logger.debug('Applied response header middleware');
        }

        // Apply route-level performance monitoring and timing middleware
        if (config.enablePerformanceMonitoring) {
            const performanceMiddleware = (req, res, next) => {
                const requestStart = process.hrtime.bigint();
                
                res.on('finish', () => {
                    const requestEnd = process.hrtime.bigint();
                    const duration = Number(requestEnd - requestStart) / 1000000; // Convert to milliseconds
                    
                    logger.debug('Hello route performance metrics', {
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        duration: `${duration.toFixed(2)}ms`,
                        memoryUsage: process.memoryUsage()
                    });
                });

                next();
            };

            router.use(performanceMiddleware);
            logger.debug('Applied performance monitoring middleware');
        }

        // Configure educational logging middleware for development and learning purposes
        const educationalMiddleware = (req, res, next) => {
            logger.debug('Educational Hello route middleware executed', {
                explanation: 'This middleware demonstrates Express.js middleware patterns',
                route: ROUTE_NAME,
                middleware: 'educational',
                timestamp: new Date().toISOString(),
                requestId: `hello-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
            next();
        };

        router.use(educationalMiddleware);

        // Log middleware configuration with applied middleware stack information
        logger.info('Route middleware configuration completed', {
            routeName: ROUTE_NAME,
            enabledMiddleware: {
                requestLogging: config.enableRequestLogging,
                methodValidation: config.enableMethodValidation,
                asyncErrorHandling: config.enableAsyncErrorHandling,
                responseHeaders: config.enableResponseHeaders,
                performanceMonitoring: config.enablePerformanceMonitoring,
                educational: true
            },
            totalMiddleware: router.stack ? router.stack.length : 0
        });

        // Return router instance with complete middleware stack configuration
        return router;

    } catch (error) {
        logger.error('Error configuring route middleware', {
            error: error.message,
            stack: error.stack,
            middlewareOptions: middlewareOptions
        });

        // Return router with minimal middleware if configuration fails
        return router;
    }
}

/**
 * Logs detailed information about hello route registration including path, method,
 * controller, middleware stack, and configuration for debugging and monitoring purposes.
 * 
 * @param {string} routePath - Route path being registered
 * @param {string} method - HTTP method for the route
 * @param {Object} routeInfo - Additional route information and metadata
 * @returns {void} Outputs structured log entries for route registration tracking and monitoring
 */
function logRouteRegistration(routePath, method, routeInfo = {}) {
    try {
        // Create structured log entry with route registration details and metadata
        const registrationDetails = {
            routeName: ROUTE_NAME,
            version: ROUTE_VERSION,
            path: routePath,
            method: method.toUpperCase(),
            controller: routeInfo.controller || 'handleHelloRequest',
            middleware: {
                count: routeInfo.middleware || 0,
                errorHandling: routeInfo.errorHandling || false,
                validation: routeInfo.validation || false,
                logging: routeInfo.logging || false
            },
            configuration: routeInfo.routerOptions || {},
            application: {
                name: APPLICATION.NAME,
                apiVersion: APPLICATION.API_VERSION
            }
        };

        // Include route path, HTTP method, controller function, and middleware information
        logger.info('Hello route registered successfully', registrationDetails);

        // Add route configuration options and validation status to log entry
        if (routeInfo.middlewareConfig) {
            logger.debug('Route middleware configuration details', {
                routePath: routePath,
                middlewareConfig: routeInfo.middlewareConfig
            });
        }

        // Include route factory information and available configuration options
        logger.debug('Route factory configuration', {
            factoryFunction: 'createHelloRouter',
            availableOptions: [
                'enableLogging',
                'enableErrorHandling',
                'enableValidation',
                'middlewareConfig',
                'routePath',
                'method'
            ],
            defaultConfiguration: {
                path: HELLO_ROUTE_PATH,
                method: HELLO_ROUTE_METHOD,
                logging: true,
                errorHandling: true,
                validation: true
            }
        });

        // Output registration log entry at INFO level for operational monitoring
        logger.info('Route registration process completed', {
            route: `${method.toUpperCase()} ${routePath}`,
            status: 'active',
            timestamp: new Date().toISOString()
        });

        // Include timestamp and route version for tracking and auditing purposes
        // Add educational context and tutorial application information to log output
        logger.debug('Educational route registration information', {
            purpose: 'Demonstrate Express.js routing patterns and middleware integration',
            framework: 'Express.js 5.1.0',
            runtime: 'Node.js v22.x LTS',
            architecture: 'MVC pattern with controller delegation',
            educationalFeatures: [
                'Route factory pattern',
                'Middleware stack configuration',
                'Controller integration',
                'Error handling demonstration',
                'Logging and monitoring examples'
            ]
        });

    } catch (error) {
        logger.error('Error logging route registration', {
            error: error.message,
            routePath: routePath,
            method: method,
            routeInfo: routeInfo
        });
    }
}

/**
 * Creates comprehensive metadata object for the hello route including path, method,
 * controller, middleware stack, configuration options, and validation status for
 * route registry and documentation.
 * 
 * @param {Object} router - Express.js Router instance
 * @param {Object} config - Route configuration object
 * @returns {Object} Complete route metadata object with configuration, status, and operational information
 */
function createRouteMetadata(router, config = {}) {
    try {
        logger.debug('Creating route metadata for Hello route', {
            hasRouter: Boolean(router),
            configKeys: Object.keys(config)
        });

        // Extract route configuration including path, method, and controller information
        const routeConfiguration = {
            path: config.routePath || HELLO_ROUTE_PATH,
            method: (config.method || HELLO_ROUTE_METHOD).toUpperCase(),
            controller: 'handleHelloRequest',
            controllerModule: '../controllers/index.js'
        };

        // Create base metadata object with standard route properties and naming
        const baseMetadata = {
            name: ROUTE_NAME,
            version: ROUTE_VERSION,
            description: 'Express.js route for Hello World endpoint demonstration',
            type: 'educational-route',
            framework: 'Express.js 5.1.0',
            architecture: 'MVC',
            category: 'tutorial'
        };

        // Add middleware stack information with configuration and execution order
        const middlewareInfo = {
            enabled: {
                logging: config.enableLogging !== false,
                errorHandling: config.enableErrorHandling !== false,
                validation: config.enableValidation !== false,
                performanceMonitoring: config.enablePerformanceMonitoring || false,
                responseHeaders: config.enableResponseHeaders !== false
            },
            stack: router && router.stack ? router.stack.map((layer, index) => ({
                index: index,
                name: layer.name || 'anonymous',
                hasRoute: Boolean(layer.route),
                path: layer.route ? layer.route.path : undefined,
                methods: layer.route ? Object.keys(layer.route.methods) : undefined
            })) : [],
            totalLayers: router && router.stack ? router.stack.length : 0
        };

        // Include route validation status and configuration verification results
        const validationStatus = validateHelloRoute(router);
        const validationInfo = {
            isValid: validationStatus.isValid,
            errorCount: validationStatus.errors.length,
            warningCount: validationStatus.warnings.length,
            validationScore: validationStatus.summary ? validationStatus.summary.validationScore : 0,
            lastValidated: validationStatus.timestamp
        };

        // Add operational metadata including creation timestamp and version information
        const operationalInfo = {
            createdAt: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            processId: process.pid,
            uptime: process.uptime()
        };

        // Include educational context and tutorial application specific information
        const educationalContext = {
            purpose: 'Demonstrate HTTP server fundamentals and Express.js routing',
            learningObjectives: [
                'Express.js Router pattern implementation',
                'Middleware stack configuration and execution',
                'Controller pattern integration',
                'Error handling best practices',
                'Route validation and testing approaches'
            ],
            demonstratedConcepts: [
                'RESTful API design',
                'MVC architecture',
                'Middleware composition',
                'Request-response cycle',
                'Logging and monitoring'
            ],
            nextSteps: [
                'Add parameter validation',
                'Implement authentication middleware',
                'Add response caching',
                'Integrate with database',
                'Add API documentation'
            ]
        };

        // Return complete route metadata object ready for registry and documentation use
        const completeMetadata = {
            ...baseMetadata,
            route: routeConfiguration,
            middleware: middlewareInfo,
            validation: validationInfo,
            operational: operationalInfo,
            educational: educationalContext,
            configuration: config,
            generatedAt: new Date().toISOString(),
            metadataVersion: '1.0.0'
        };

        logger.debug('Route metadata created successfully', {
            metadataKeys: Object.keys(completeMetadata),
            routePath: routeConfiguration.path,
            middlewareCount: middlewareInfo.totalLayers,
            validationScore: validationInfo.validationScore
        });

        return completeMetadata;

    } catch (error) {
        logger.error('Error creating route metadata', {
            error: error.message,
            stack: error.stack,
            config: config
        });

        // Return minimal metadata if creation fails
        return {
            name: ROUTE_NAME,
            version: ROUTE_VERSION,
            error: 'Metadata creation failed',
            timestamp: new Date().toISOString(),
            fallbackMode: true
        };
    }
}

/**
 * Configures comprehensive error handling for the hello route including route-specific
 * error catching, Express.js 5.1.0 async error handling, and educational error logging
 * with detailed error information.
 * 
 * @param {Object} router - Express.js Router instance to configure
 * @returns {Object} Router instance with configured error handling middleware
 */
function setupRouteErrorHandling(router) {
    try {
        logger.debug('Setting up error handling for Hello route');

        // Configure async error handling wrapper using handleAsyncErrors middleware
        const asyncErrorWrapper = (req, res, next) => {
            // Add error handling context to request object
            req.errorHandling = {
                route: ROUTE_NAME,
                path: HELLO_ROUTE_PATH,
                method: HELLO_ROUTE_METHOD,
                timestamp: new Date().toISOString(),
                requestId: `hello-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
            };
            next();
        };

        router.use(asyncErrorWrapper);

        // Add route-specific error catching middleware for hello endpoint errors
        const routeErrorHandler = (error, req, res, next) => {
            // Check if error is specific to hello route
            const isHelloRoute = req.path === HELLO_ROUTE_PATH || req.originalUrl.includes('/hello');
            
            if (isHelloRoute) {
                logger.error('Hello route error detected', {
                    error: {
                        message: error.message,
                        status: error.status || error.statusCode,
                        name: error.name,
                        stack: error.stack
                    },
                    request: {
                        method: req.method,
                        path: req.path,
                        userAgent: req.get('User-Agent'),
                        remoteAddress: req.ip,
                        timestamp: new Date().toISOString()
                    },
                    route: {
                        name: ROUTE_NAME,
                        expectedPath: HELLO_ROUTE_PATH,
                        expectedMethod: HELLO_ROUTE_METHOD
                    }
                });

                // Configure error logging with educational context and debugging information
                logger.info('Educational error handling demonstration', {
                    explanation: 'This error handler demonstrates Express.js error middleware patterns',
                    errorType: error.name || 'UnknownError',
                    errorCategory: error.status >= 400 && error.status < 500 ? 'client-error' : 'server-error',
                    handlingStrategy: 'route-specific error processing'
                });

                // Set up error response formatting for consistent error handling
                const errorResponse = {
                    error: {
                        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                        status: error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        route: ROUTE_NAME,
                        path: HELLO_ROUTE_PATH,
                        timestamp: new Date().toISOString()
                    }
                };

                // Add error correlation ID generation for tracking and debugging
                const correlationId = req.errorHandling ? req.errorHandling.requestId : 
                    `error-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                errorResponse.error.correlationId = correlationId;

                // Configure error recovery mechanisms for graceful error handling
                if (error.status === HTTP_STATUS.METHOD_NOT_ALLOWED) {
                    res.set('Allow', HELLO_ROUTE_METHOD);
                    errorResponse.error.allowedMethods = [HELLO_ROUTE_METHOD];
                    errorResponse.error.hint = `Use ${HELLO_ROUTE_METHOD} method for ${HELLO_ROUTE_PATH}`;
                }

                // Send formatted error response
                const statusCode = error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
                res.status(statusCode).json(errorResponse);

                logger.debug('Hello route error response sent', {
                    statusCode: statusCode,
                    correlationId: correlationId,
                    responseSize: JSON.stringify(errorResponse).length
                });

                return; // Don't call next() - error handled
            }
            
            // Pass error to next middleware if not a hello route error
            next(error);
        };

        router.use(routeErrorHandler);

        // Add general error recovery middleware
        const errorRecoveryMiddleware = (req, res, next) => {
            // Add error recovery information to response locals
            res.locals.errorRecovery = {
                route: ROUTE_NAME,
                fallbackAvailable: true,
                contactSupport: false, // Educational app - no support needed
                retryRecommended: false
            };
            next();
        };

        router.use(errorRecoveryMiddleware);

        // Log error handling configuration with middleware stack information
        logger.info('Hello route error handling configured', {
            routeName: ROUTE_NAME,
            errorHandlers: [
                'asyncErrorWrapper',
                'routeErrorHandler',
                'errorRecoveryMiddleware'
            ],
            features: [
                'Route-specific error catching',
                'Educational error logging',
                'Correlation ID generation',
                'Error response formatting',
                'Recovery mechanism configuration'
            ]
        });

        // Return router instance with complete error handling configuration
        return router;

    } catch (error) {
        logger.error('Error setting up route error handling', {
            error: error.message,
            stack: error.stack
        });

        // Return router as-is if error handling setup fails
        return router;
    }
}

// Create default configured router instance for immediate use
const router = createHelloRouter();

// Export all route functions and configured router instance
module.exports = {
    // Configured Express.js Router instance with /hello endpoint and complete middleware stack ready for application integration
    router,
    
    // Factory function for creating configured hello route router with custom options and middleware configuration
    createHelloRouter,
    
    // Route validation utility for configuration verification, testing, and operational validation
    validateHelloRoute,
    
    // Middleware configuration utility for setting up route-specific middleware stack
    configureRouteMiddleware,
    
    // Route registration logging utility for debugging and monitoring route setup
    logRouteRegistration,
    
    // Route metadata creation utility for documentation and runtime introspection
    createRouteMetadata,
    
    // Error handling setup utility for comprehensive route error processing
    setupRouteErrorHandling,
    
    // Route path constant for hello endpoint (/hello) for consistent path reference
    HELLO_ROUTE_PATH,
    
    // HTTP method constant for hello route (GET) for route configuration and validation
    HELLO_ROUTE_METHOD
};