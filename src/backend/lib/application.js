/**
 * Express.js Application Factory Module for Node.js Tutorial Application
 * 
 * This module provides reusable functions for creating, configuring, and managing Express.js
 * application instances in the Node.js tutorial application. Implements application creation
 * patterns with middleware integration, route registration, error handling, and security
 * configuration following Express.js 5.1.0 best practices and Node.js v22.x LTS optimization.
 * 
 * Serves as a foundational abstraction layer for Express.js application management, enabling
 * consistent application setup across different execution contexts including server startup,
 * testing, and development scenarios. Demonstrates Express.js application architecture
 * patterns with educational focus on factory patterns and application configuration.
 * 
 * Features:
 * - Express.js application factory with comprehensive configuration
 * - Middleware stack management with proper execution order
 * - Route registration and validation utilities
 * - Security configuration and header management
 * - Application builder pattern for fluent interface construction
 * - Configuration validation and application information utilities
 * 
 * Architecture:
 * - Factory pattern for Express.js application creation
 * - Builder pattern for step-by-step application construction
 * - Comprehensive middleware orchestration and configuration
 * - Educational demonstration of Express.js application patterns
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import Express.js 5.1.0 web framework for HTTP server and middleware functionality
const express = require('express'); // Express.js 5.1.0

// Import centralized configuration object containing all application settings for Express.js setup
const {
    configuration,
    createLoggerInstance
} = require('../config/index.js');

// Import Express.js Router instance with configured /hello endpoint
const {
    helloRouter,
    routes
} = require('../routes/index.js');

// Import middleware components for request processing pipeline
const {
    errorHandler,
    requestLogger,
    responseHandler,
    notFoundHandler,
    createMiddlewareStack
} = require('../middleware/index.js');

// Import primary factory function for creating component-specific loggers
const { getLogger } = require('../utils/logger.js');

// Import application metadata constants for version and identification
const {
    APPLICATION,
    ROUTES
} = require('../utils/constants.js');

// Initialize component-specific logger for application factory operations
const logger = getLogger('application');

// Cache for storing application instances to optimize performance
const applicationInstances = new Map();

// Default application configuration using centralized configuration
const defaultApplicationConfig = configuration;

/**
 * Factory function that creates and configures a complete Express.js application instance
 * with middleware stack, route registration, error handling, and security settings for
 * the Node.js tutorial application.
 * 
 * @param {Object} options - Configuration options for application creation
 * @param {Object} options.config - Application configuration object
 * @param {boolean} options.enableCaching - Whether to cache application instances
 * @param {boolean} options.enableSecurity - Whether to apply security configurations
 * @param {boolean} options.enableMiddleware - Whether to set up middleware stack
 * @param {boolean} options.enableRoutes - Whether to register application routes
 * @returns {Object} Configured Express.js application instance ready for HTTP server integration
 */
function createApplication(options = {}) {
    try {
        logger.info('Creating Express.js application instance', {
            hasOptions: Object.keys(options).length > 0,
            enableCaching: options.enableCaching !== false,
            enableSecurity: options.enableSecurity !== false
        });

        // Create new Express.js application instance using express() constructor
        const app = express();

        // Load application configuration from options or use default configuration
        const appConfig = options.config || defaultApplicationConfig;

        // Create application-specific logger using createLoggerInstance function
        const appLogger = createLoggerInstance('ExpressApplication');

        // Configure Express.js application-level settings using configureExpressSettings
        if (options.enableSettings !== false) {
            configureExpressSettings(app, appConfig);
            appLogger.debug('Express.js application settings configured');
        }

        // Set up middleware stack in proper order using setupMiddlewareStack
        if (options.enableMiddleware !== false) {
            setupMiddlewareStack(app, {
                requestLogger: appConfig.logging,
                responseHandler: appConfig.server,
                security: appConfig.server.security
            });
            appLogger.debug('Middleware stack configured');
        }

        // Register application routes using registerApplicationRoutes
        if (options.enableRoutes !== false) {
            registerApplicationRoutes(app, {
                helloRouter: helloRouter,
                routes: routes
            });
            appLogger.debug('Application routes registered');
        }

        // Apply security configurations and headers using configureApplicationSecurity
        if (options.enableSecurity !== false) {
            configureApplicationSecurity(app, appConfig.server.security || {});
            appLogger.debug('Security configurations applied');
        }

        // Add application metadata for monitoring and debugging
        app.locals.applicationInfo = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            createdAt: new Date().toISOString(),
            configuration: appConfig.metadata || {},
            routes: Object.keys(routes).length || 1
        };

        // Log successful application creation with configuration summary
        logger.info('Express.js application created successfully', {
            applicationName: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            routesRegistered: app.locals.applicationInfo.routes,
            middlewareEnabled: options.enableMiddleware !== false,
            securityEnabled: options.enableSecurity !== false
        });

        // Cache application instance for performance optimization if caching enabled
        if (options.enableCaching !== false) {
            const cacheKey = `app-${Date.now()}-${Math.random()}`;
            applicationInstances.set(cacheKey, {
                app: app,
                config: appConfig,
                createdAt: new Date().toISOString()
            });
            appLogger.debug('Application instance cached', { cacheKey });
        }

        // Return fully configured Express.js application instance
        return app;

    } catch (error) {
        logger.error('Failed to create Express.js application', {
            error: error.message,
            stack: error.stack,
            options: options
        });

        // Return minimal Express.js application if creation fails
        const fallbackApp = express();
        fallbackApp.get(ROUTES.HELLO, (req, res) => {
            res.send('Hello world');
        });

        fallbackApp.locals.applicationInfo = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            fallbackMode: true,
            error: error.message
        };

        return fallbackApp;
    }
}

/**
 * Configures Express.js application-level settings including security headers, JSON parsing
 * limits, proxy trust configuration, and environment-specific optimizations based on
 * application configuration.
 * 
 * @param {Object} app - Express.js application instance to configure
 * @param {Object} config - Application configuration object with server settings
 * @returns {void} Modifies Express.js application instance with configured settings
 */
function configureExpressSettings(app, config) {
    try {
        logger.debug('Configuring Express.js application settings', {
            hasConfig: Boolean(config),
            environment: config.environment?.nodeEnv
        });

        // Disable X-Powered-By header to remove Express.js version exposure for security
        app.disable('x-powered-by');

        // Configure trust proxy setting based on environment configuration and deployment context
        if (config.server?.express?.trustProxy !== undefined) {
            app.set('trust proxy', config.server.express.trustProxy);
        } else {
            // Default to false for security in development environment
            app.set('trust proxy', false);
        }

        // Set JSON body parser limit based on server configuration to prevent memory issues
        const jsonLimit = config.server?.http?.jsonLimit || '10mb';
        app.set('json limit', jsonLimit);

        // Configure URL encoding options for form data parsing with security considerations
        const urlencodedLimit = config.server?.http?.urlencodedLimit || '10mb';
        app.set('urlencoded limit', urlencodedLimit);

        // Apply Express.js strict routing and case sensitivity settings
        app.set('strict routing', config.server?.express?.strictRouting || false);
        app.set('case sensitive routing', config.server?.express?.caseSensitive || false);

        // Configure view engine settings and template caching if views are used
        if (config.server?.express?.viewEngine) {
            app.set('view engine', config.server.express.viewEngine);
            app.set('view cache', config.environment?.isProduction || false);
        }

        // Apply environment-specific Express.js settings and performance optimizations
        if (config.environment?.isProduction) {
            app.set('env', 'production');
            app.set('view cache', true);
        } else if (config.environment?.isDevelopment) {
            app.set('env', 'development');
            app.set('view cache', false);
        }

        // Log configuration completion with applied settings summary for debugging
        logger.debug('Express.js application settings configured successfully', {
            trustProxy: app.get('trust proxy'),
            jsonLimit: app.get('json limit'),
            strictRouting: app.get('strict routing'),
            environment: app.get('env')
        });

    } catch (error) {
        logger.error('Error configuring Express.js application settings', {
            error: error.message,
            stack: error.stack,
            config: config
        });

        // Apply minimal fallback settings if configuration fails
        app.disable('x-powered-by');
        app.set('trust proxy', false);
    }
}

/**
 * Sets up the complete Express.js middleware stack in proper execution order including
 * request logging, response handling, route processing, 404 handling, and error handling
 * middleware.
 * 
 * @param {Object} app - Express.js application instance to configure
 * @param {Object} middlewareConfig - Middleware configuration options
 * @returns {void} Configures Express.js application with complete middleware stack
 */
function setupMiddlewareStack(app, middlewareConfig = {}) {
    try {
        logger.debug('Setting up Express.js middleware stack', {
            hasConfig: Boolean(middlewareConfig),
            configKeys: Object.keys(middlewareConfig)
        });

        // Apply request logging middleware first in stack for all incoming requests
        if (middlewareConfig.requestLogger !== false) {
            app.use(requestLogger);
            logger.debug('Request logging middleware added to stack');
        }

        // Add response handling middleware for standardized response formatting and timing
        if (middlewareConfig.responseHandler !== false) {
            app.use((req, res, next) => {
                // Add request start time for response time calculation
                req.startTime = Date.now();
                
                // Add correlation ID for request tracking
                req.correlationId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                next();
            });
            logger.debug('Response handling middleware added to stack');
        }

        // Configure body parsing middleware for JSON and URL-encoded request handling
        app.use(express.json({ 
            limit: middlewareConfig.jsonLimit || '10mb',
            strict: true
        }));
        
        app.use(express.urlencoded({ 
            extended: true, 
            limit: middlewareConfig.urlencodedLimit || '10mb'
        }));
        
        logger.debug('Body parsing middleware configured');

        // Apply security middleware for headers and basic security measures
        if (middlewareConfig.security !== false) {
            app.use((req, res, next) => {
                // Add basic security headers
                res.set({
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                });
                next();
            });
            logger.debug('Security middleware added to stack');
        }

        // Log middleware stack setup completion with middleware count and execution order
        logger.info('Middleware stack setup completed successfully', {
            totalMiddleware: app._router ? app._router.stack.length : 'unknown',
            requestLogging: middlewareConfig.requestLogger !== false,
            responseHandling: middlewareConfig.responseHandler !== false,
            security: middlewareConfig.security !== false
        });

    } catch (error) {
        logger.error('Error setting up middleware stack', {
            error: error.message,
            stack: error.stack,
            middlewareConfig: middlewareConfig
        });

        // Apply minimal middleware stack if setup fails
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
    }
}

/**
 * Registers all application routes with the Express.js application instance, including
 * the /hello endpoint and any additional routes defined in the route registry.
 * 
 * @param {Object} app - Express.js application instance to register routes with
 * @param {Object} routeConfig - Route configuration object with route modules
 * @returns {void} Registers routes with Express.js application instance
 */
function registerApplicationRoutes(app, routeConfig = {}) {
    try {
        logger.debug('Registering application routes', {
            hasHelloRouter: Boolean(routeConfig.helloRouter),
            hasRoutes: Boolean(routeConfig.routes),
            routeKeys: routeConfig.routes ? Object.keys(routeConfig.routes) : []
        });

        // Register hello router at root path using app.use with helloRouter instance
        if (routeConfig.helloRouter) {
            app.use('/', routeConfig.helloRouter);
            logger.debug('Hello router registered at root path');
        } else {
            // Fallback hello route if router is not available
            app.get(ROUTES.HELLO, (req, res) => {
                res.send('Hello world');
            });
            logger.debug('Fallback hello route registered');
        }

        // Add route-specific error handling and middleware if configured
        if (routeConfig.routes && Object.keys(routeConfig.routes).length > 0) {
            Object.entries(routeConfig.routes).forEach(([routeName, router]) => {
                if (router && typeof router === 'function') {
                    app.use('/', router);
                    logger.debug(`Additional route registered: ${routeName}`);
                }
            });
        }

        // Add 404 not found handler middleware for unmatched routes
        app.use(notFoundHandler);

        // Apply error handling middleware as final middleware in stack for error processing
        app.use(errorHandler);

        // Validate route registration success and verify endpoint availability
        const routeCount = app._router ? app._router.stack.length : 0;

        // Add route metadata to application instance for monitoring and debugging
        app.locals.routes = {
            hello: ROUTES.HELLO,
            total: routeCount,
            registered: true,
            registeredAt: new Date().toISOString()
        };

        // Log route registration completion with registered paths and HTTP methods
        logger.info('Application routes registered successfully', {
            helloRoute: ROUTES.HELLO,
            totalRoutes: routeCount,
            hasErrorHandler: true,
            hasNotFoundHandler: true
        });

    } catch (error) {
        logger.error('Error registering application routes', {
            error: error.message,
            stack: error.stack,
            routeConfig: routeConfig
        });

        // Register minimal fallback route if registration fails
        app.get(ROUTES.HELLO, (req, res) => {
            res.send('Hello world');
        });
        
        app.use(notFoundHandler);
        app.use(errorHandler);
    }
}

/**
 * Applies security configurations to the Express.js application including header security,
 * input validation, and Express.js 5.1.0 security features for production-ready security
 * posture.
 * 
 * @param {Object} app - Express.js application instance to secure
 * @param {Object} securityConfig - Security configuration options
 * @returns {void} Applies security configurations to Express.js application
 */
function configureApplicationSecurity(app, securityConfig = {}) {
    try {
        logger.debug('Configuring application security', {
            hasConfig: Boolean(securityConfig),
            configKeys: Object.keys(securityConfig)
        });

        // Disable X-Powered-By header to prevent Express.js version fingerprinting
        app.disable('x-powered-by');

        // Configure Express.js trust proxy settings for secure deployment environments
        if (securityConfig.trustProxy !== undefined) {
            app.set('trust proxy', securityConfig.trustProxy);
        }

        // Apply Express.js 5.1.0 security enhancements including ReDoS protection
        // (ReDoS protection is built into Express.js 5.1.0)
        
        // Set up basic security headers for XSS and content type protection
        app.use((req, res, next) => {
            // Apply security headers based on configuration
            const headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': securityConfig.frameOptions || 'DENY',
                'X-XSS-Protection': '1; mode=block',
                ...securityConfig.customHeaders
            };

            res.set(headers);
            next();
        });

        // Configure input validation middleware to prevent injection attacks
        if (securityConfig.enableInputValidation !== false) {
            app.use((req, res, next) => {
                // Basic input sanitization for query parameters
                if (req.query && typeof req.query === 'object') {
                    Object.keys(req.query).forEach(key => {
                        if (typeof req.query[key] === 'string') {
                            // Remove potentially dangerous characters
                            req.query[key] = req.query[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                        }
                    });
                }
                next();
            });
        }

        // Apply rate limiting configuration if enabled in security settings
        if (securityConfig.rateLimit && securityConfig.rateLimit.enabled) {
            // Basic rate limiting implementation for educational purposes
            const requestCounts = new Map();
            const windowMs = securityConfig.rateLimit.windowMs || 15 * 60 * 1000; // 15 minutes
            const maxRequests = securityConfig.rateLimit.max || 100;

            app.use((req, res, next) => {
                const clientId = req.ip || req.connection.remoteAddress;
                const now = Date.now();
                
                if (!requestCounts.has(clientId)) {
                    requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
                    return next();
                }

                const clientData = requestCounts.get(clientId);
                
                if (now > clientData.resetTime) {
                    clientData.count = 1;
                    clientData.resetTime = now + windowMs;
                    return next();
                }

                if (clientData.count >= maxRequests) {
                    return res.status(429).json({ error: 'Too Many Requests' });
                }

                clientData.count++;
                next();
            });
            
            logger.debug('Rate limiting configured', {
                windowMs: windowMs,
                maxRequests: maxRequests
            });
        }

        // Log security configuration completion with applied security measures
        logger.info('Application security configured successfully', {
            xPoweredByDisabled: true,
            securityHeaders: true,
            inputValidation: securityConfig.enableInputValidation !== false,
            rateLimit: Boolean(securityConfig.rateLimit?.enabled),
            trustProxy: app.get('trust proxy')
        });

    } catch (error) {
        logger.error('Error configuring application security', {
            error: error.message,
            stack: error.stack,
            securityConfig: securityConfig
        });

        // Apply minimal security configuration if setup fails
        app.disable('x-powered-by');
        app.use((req, res, next) => {
            res.set('X-Content-Type-Options', 'nosniff');
            next();
        });
    }
}

/**
 * Returns comprehensive information about the Express.js application including configuration,
 * registered routes, middleware stack, and operational metadata for monitoring and debugging.
 * 
 * @param {Object} app - Express.js application instance to inspect
 * @returns {Object} Application information object with configuration, routes, middleware, and metadata
 */
function getApplicationInfo(app) {
    try {
        logger.debug('Collecting application information', {
            hasApp: Boolean(app),
            hasLocals: Boolean(app.locals)
        });

        // Collect application configuration from internal application settings
        const configuration = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            environment: app.get('env') || 'development',
            trustProxy: app.get('trust proxy'),
            jsonLimit: app.get('json limit'),
            viewEngine: app.get('view engine'),
            viewCache: app.get('view cache')
        };

        // Gather registered routes information including paths, methods, and handlers
        const routes = [];
        const routeStack = app._router ? app._router.stack : [];
        
        routeStack.forEach((layer, index) => {
            if (layer.route) {
                routes.push({
                    path: layer.route.path,
                    methods: Object.keys(layer.route.methods),
                    index: index
                });
            } else if (layer.name === 'router') {
                routes.push({
                    type: 'router',
                    path: layer.regexp.source,
                    index: index
                });
            }
        });

        // Include middleware stack information with execution order and configuration
        const middleware = {
            totalLayers: routeStack.length,
            layers: routeStack.map((layer, index) => ({
                index: index,
                name: layer.name || 'anonymous',
                hasRoute: Boolean(layer.route),
                regexp: layer.regexp ? layer.regexp.source : undefined
            }))
        };

        // Add application metadata including name, version, Express.js version, and Node.js version
        const metadata = {
            applicationName: APPLICATION.NAME,
            applicationVersion: APPLICATION.VERSION,
            expressVersion: require('express/package.json').version,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            processId: process.pid,
            uptime: Math.round(process.uptime()),
            memoryUsage: process.memoryUsage()
        };

        // Include security settings and configuration status for compliance reporting
        const security = {
            xPoweredByDisabled: !app.get('x-powered-by'),
            trustProxy: app.get('trust proxy'),
            environment: app.get('env'),
            headers: {
                contentTypeOptions: 'nosniff',
                frameOptions: 'DENY',
                xssProtection: '1; mode=block'
            }
        };

        // Add performance metrics and resource usage information if available
        const performance = {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
            totalRoutes: routes.length,
            totalMiddleware: middleware.totalLayers
        };

        // Compile application information from app.locals if available
        const applicationLocals = app.locals || {};

        // Return comprehensive application information object for monitoring
        const applicationInfo = {
            configuration: configuration,
            routes: {
                registered: routes,
                total: routes.length,
                hello: ROUTES.HELLO
            },
            middleware: middleware,
            metadata: metadata,
            security: security,
            performance: performance,
            locals: applicationLocals,
            timestamp: new Date().toISOString(),
            status: 'operational'
        };

        logger.debug('Application information collected successfully', {
            totalRoutes: routes.length,
            totalMiddleware: middleware.totalLayers,
            environment: configuration.environment
        });

        return applicationInfo;

    } catch (error) {
        logger.error('Error collecting application information', {
            error: error.message,
            stack: error.stack
        });

        // Return minimal application information if collection fails
        return {
            configuration: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                error: error.message
            },
            routes: { total: 0, error: 'Route information unavailable' },
            middleware: { totalLayers: 0, error: 'Middleware information unavailable' },
            metadata: {
                applicationName: APPLICATION.NAME,
                applicationVersion: APPLICATION.VERSION,
                timestamp: new Date().toISOString(),
                error: error.message
            },
            status: 'error'
        };
    }
}

/**
 * Validates application configuration options to ensure proper Express.js application
 * setup and prevent runtime errors from invalid configuration parameters.
 * 
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result object with isValid boolean and detailed error information
 */
function validateApplicationConfig(config) {
    try {
        logger.debug('Validating application configuration', {
            hasConfig: Boolean(config),
            configKeys: config ? Object.keys(config) : []
        });

        // Initialize validation result object
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            validatedConfig: null
        };

        // Validate configuration object structure
        if (!config || typeof config !== 'object') {
            validationResult.errors.push('Configuration must be a valid object');
            validationResult.isValid = false;
            return validationResult;
        }

        // Create validated configuration object
        const validatedConfig = { ...config };

        // Validate Express.js application settings including trust proxy and JSON limits
        if (config.server && config.server.express) {
            const expressConfig = config.server.express;
            
            if (expressConfig.trustProxy !== undefined && typeof expressConfig.trustProxy !== 'boolean') {
                validationResult.warnings.push('trustProxy should be a boolean value');
            }
            
            if (expressConfig.jsonLimit && typeof expressConfig.jsonLimit !== 'string') {
                validationResult.warnings.push('jsonLimit should be a string value (e.g., "10mb")');
            }
        }

        // Check middleware configuration for proper ordering and valid options
        if (config.middleware) {
            if (typeof config.middleware !== 'object') {
                validationResult.errors.push('Middleware configuration must be an object');
                validationResult.isValid = false;
            }
        }

        // Validate route configuration including paths and handler functions
        if (config.routes) {
            if (typeof config.routes !== 'object') {
                validationResult.errors.push('Routes configuration must be an object');
                validationResult.isValid = false;
            }
        }

        // Verify security configuration options for completeness and validity
        if (config.security) {
            const securityConfig = config.security;
            
            if (securityConfig.rateLimit && securityConfig.rateLimit.enabled) {
                if (!securityConfig.rateLimit.max || typeof securityConfig.rateLimit.max !== 'number') {
                    validationResult.warnings.push('Rate limit max should be a positive number');
                }
                
                if (!securityConfig.rateLimit.windowMs || typeof securityConfig.rateLimit.windowMs !== 'number') {
                    validationResult.warnings.push('Rate limit windowMs should be a positive number');
                }
            }
        }

        // Check environment-specific settings for consistency and compatibility
        if (config.environment) {
            const env = config.environment;
            const validEnvironments = ['development', 'production', 'test'];
            
            if (env.nodeEnv && !validEnvironments.includes(env.nodeEnv)) {
                validationResult.warnings.push(`Invalid NODE_ENV: ${env.nodeEnv}. Valid values: ${validEnvironments.join(', ')}`);
            }
            
            if (env.port && (typeof env.port !== 'number' || env.port < 1 || env.port > 65535)) {
                validationResult.errors.push('Port must be a number between 1 and 65535');
                validationResult.isValid = false;
            }
        }

        // Set validated configuration
        validationResult.validatedConfig = validatedConfig;

        // Compile validation errors and warnings into structured result object
        validationResult.summary = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            isValid: validationResult.isValid,
            validatedAt: new Date().toISOString()
        };

        logger.debug('Configuration validation completed', {
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length
        });

        // Return comprehensive validation result with success status and error details
        return validationResult;

    } catch (error) {
        logger.error('Error during configuration validation', {
            error: error.message,
            stack: error.stack,
            config: config
        });

        return {
            isValid: false,
            errors: [`Validation process failed: ${error.message}`],
            warnings: [],
            validatedConfig: null,
            summary: {
                totalErrors: 1,
                totalWarnings: 0,
                isValid: false,
                validationError: error.message
            }
        };
    }
}

/**
 * Creates a factory function configured with specific defaults for creating multiple
 * Express.js application instances with consistent configuration and behavior.
 * 
 * @param {Object} factoryConfig - Configuration for the application factory
 * @returns {Function} Application factory function configured with specified defaults
 */
function createApplicationFactory(factoryConfig = {}) {
    try {
        logger.debug('Creating application factory', {
            hasConfig: Boolean(factoryConfig),
            configKeys: Object.keys(factoryConfig)
        });

        // Validate factory configuration and apply defaults for missing options
        const validationResult = validateApplicationConfig(factoryConfig);
        
        if (!validationResult.isValid) {
            logger.warn('Factory configuration validation failed, using defaults', {
                errors: validationResult.errors
            });
        }

        const factoryDefaults = {
            ...defaultApplicationConfig,
            ...factoryConfig
        };

        // Create closure with factory configuration for consistent application creation
        const applicationFactory = function(options = {}) {
            // Merge factory defaults with runtime options
            const mergedOptions = {
                ...factoryDefaults,
                ...options,
                config: {
                    ...factoryDefaults,
                    ...options.config
                }
            };

            // Include configuration validation and error handling in factory function
            const configValidation = validateApplicationConfig(mergedOptions.config);
            
            if (!configValidation.isValid) {
                logger.warn('Application configuration validation failed in factory', {
                    errors: configValidation.errors,
                    warnings: configValidation.warnings
                });
            }

            // Create application instance using createApplication with merged configuration
            const app = createApplication(mergedOptions);

            // Add factory metadata to application instance
            app.locals.factory = {
                createdBy: 'createApplicationFactory',
                factoryConfig: factoryDefaults,
                createdAt: new Date().toISOString(),
                configurationValid: configValidation.isValid
            };

            // Add logging and monitoring capabilities to factory-created applications
            app.locals.logger = createLoggerInstance('FactoryApplication');

            return app;
        };

        // Add metadata to factory function
        applicationFactory.factoryConfig = factoryDefaults;
        applicationFactory.createdAt = new Date().toISOString();
        applicationFactory.version = APPLICATION.VERSION;

        // Ensure factory function maintains consistent application behavior and configuration
        applicationFactory.getConfig = () => factoryDefaults;
        applicationFactory.updateConfig = (newConfig) => {
            Object.assign(factoryDefaults, newConfig);
            return applicationFactory;
        };

        logger.info('Application factory created successfully', {
            hasDefaults: Object.keys(factoryDefaults).length > 0,
            factoryVersion: APPLICATION.VERSION
        });

        // Return factory function that creates applications with pre-configured settings
        return applicationFactory;

    } catch (error) {
        logger.error('Error creating application factory', {
            error: error.message,
            stack: error.stack,
            factoryConfig: factoryConfig
        });

        // Return minimal factory function if creation fails
        return function(options = {}) {
            const app = createApplication(options);
            app.locals.factory = {
                error: error.message,
                fallbackMode: true
            };
            return app;
        };
    }
}

/**
 * Builder class that provides fluent interface for constructing Express.js applications
 * with step-by-step configuration, middleware addition, route registration, and security
 * setup for complex application building scenarios.
 */
class ApplicationBuilder {
    /**
     * Initializes ApplicationBuilder with configuration and creates foundation for
     * Express.js application construction with fluent interface pattern.
     * 
     * @param {Object} initialConfig - Initial configuration for application builder
     */
    constructor(initialConfig = {}) {
        try {
            logger.debug('Initializing ApplicationBuilder', {
                hasConfig: Object.keys(initialConfig).length > 0
            });

            // Create base Express.js application instance using express() constructor
            this.app = express();

            // Store initial configuration and apply default settings
            this.config = {
                ...defaultApplicationConfig,
                ...initialConfig
            };

            // Initialize component-specific logger using getLogger with 'applicationBuilder' name
            this.logger = getLogger('applicationBuilder');

            // Initialize empty middleware stack array for ordered middleware registration
            this.middlewareStack = [];

            // Create empty route registry object for route organization
            this.routeRegistry = {};

            // Set isBuilt flag to false to track builder state
            this.isBuilt = false;

            // Log ApplicationBuilder initialization with configuration summary
            this.logger.info('ApplicationBuilder initialized', {
                hasInitialConfig: Object.keys(initialConfig).length > 0,
                applicationCreated: Boolean(this.app)
            });

        } catch (error) {
            logger.error('Error initializing ApplicationBuilder', {
                error: error.message,
                stack: error.stack,
                initialConfig: initialConfig
            });

            // Initialize with minimal configuration if initialization fails
            this.app = express();
            this.config = defaultApplicationConfig;
            this.logger = getLogger('applicationBuilder');
            this.middlewareStack = [];
            this.routeRegistry = {};
            this.isBuilt = false;
            this.initializationError = error.message;
        }
    }

    /**
     * Fluent interface method for adding middleware to the application builder with
     * validation and ordering support.
     * 
     * @param {Function} middleware - Express.js middleware function to add
     * @param {Object} options - Middleware options and configuration
     * @returns {ApplicationBuilder} Returns this ApplicationBuilder instance for method chaining
     */
    withMiddleware(middleware, options = {}) {
        try {
            // Validate middleware function parameter for proper Express.js middleware signature
            if (typeof middleware !== 'function') {
                throw new Error('Middleware must be a function');
            }

            const middlewareLength = middleware.length;
            if (middlewareLength < 2 || middlewareLength > 4) {
                this.logger.warn('Middleware function has unusual parameter count', {
                    parameterCount: middlewareLength,
                    expected: '2-4 parameters (req, res, next) or (err, req, res, next)'
                });
            }

            // Add middleware to internal middleware stack with order and options
            const middlewareEntry = {
                middleware: middleware,
                options: options,
                name: options.name || middleware.name || 'anonymous',
                order: options.order || this.middlewareStack.length,
                addedAt: new Date().toISOString()
            };

            this.middlewareStack.push(middlewareEntry);

            // Apply middleware to Express.js application instance if immediate mode enabled
            if (options.immediate !== false) {
                this.app.use(middleware);
            }

            // Log middleware addition with name and configuration details
            this.logger.debug('Middleware added to application builder', {
                middlewareName: middlewareEntry.name,
                order: middlewareEntry.order,
                immediate: options.immediate !== false,
                totalMiddleware: this.middlewareStack.length
            });

            // Return this instance for method chaining continuation
            return this;

        } catch (error) {
            this.logger.error('Error adding middleware to application builder', {
                error: error.message,
                middleware: middleware,
                options: options
            });

            // Continue with builder pattern even if middleware addition fails
            return this;
        }
    }

    /**
     * Fluent interface method for registering routes with the application builder including
     * validation and metadata tracking.
     * 
     * @param {Object} router - Express.js Router instance to register
     * @param {string} basePath - Base path for route registration
     * @returns {ApplicationBuilder} Returns this ApplicationBuilder instance for method chaining
     */
    withRoutes(router, basePath = '/') {
        try {
            // Validate router parameter is valid Express.js Router instance
            if (!router || typeof router !== 'function') {
                throw new Error('Router must be a valid Express.js Router instance');
            }

            // Register router with Express.js application at specified base path
            this.app.use(basePath, router);

            // Add route information to internal route registry for tracking
            const routeKey = `route-${Object.keys(this.routeRegistry).length}`;
            this.routeRegistry[routeKey] = {
                router: router,
                basePath: basePath,
                registeredAt: new Date().toISOString(),
                routerStack: router.stack ? router.stack.length : 0
            };

            // Log route registration with paths and methods for debugging
            this.logger.debug('Routes registered with application builder', {
                basePath: basePath,
                routerStack: this.routeRegistry[routeKey].routerStack,
                totalRoutes: Object.keys(this.routeRegistry).length
            });

            // Return this instance for method chaining continuation
            return this;

        } catch (error) {
            this.logger.error('Error registering routes with application builder', {
                error: error.message,
                router: router,
                basePath: basePath
            });

            // Continue with builder pattern even if route registration fails
            return this;
        }
    }

    /**
     * Fluent interface method for applying security configuration including headers,
     * validation, and Express.js security features.
     * 
     * @param {Object} securityOptions - Security configuration options
     * @returns {ApplicationBuilder} Returns this ApplicationBuilder instance for method chaining
     */
    withSecurity(securityOptions = {}) {
        try {
            // Apply security configuration using configureApplicationSecurity function
            configureApplicationSecurity(this.app, securityOptions);

            // Store security configuration in builder state
            this.config.security = {
                ...this.config.security,
                ...securityOptions,
                appliedAt: new Date().toISOString()
            };

            // Validate security options and apply secure defaults
            if (securityOptions.trustProxy !== undefined) {
                this.app.set('trust proxy', securityOptions.trustProxy);
            }

            // Log security configuration application with enabled features
            this.logger.info('Security configuration applied to application builder', {
                trustProxy: this.app.get('trust proxy'),
                hasCustomHeaders: Boolean(securityOptions.customHeaders),
                rateLimit: Boolean(securityOptions.rateLimit)
            });

            // Return this instance for method chaining continuation
            return this;

        } catch (error) {
            this.logger.error('Error applying security configuration to application builder', {
                error: error.message,
                securityOptions: securityOptions
            });

            // Apply minimal security configuration if error occurs
            this.app.disable('x-powered-by');
            
            // Continue with builder pattern
            return this;
        }
    }

    /**
     * Completes application building process and returns fully configured Express.js
     * application instance ready for server integration.
     * 
     * @returns {Object} Fully configured Express.js application instance
     */
    build() {
        try {
            // Validate that builder is not already built to prevent duplicate builds
            if (this.isBuilt) {
                this.logger.warn('Application builder already built, returning cached application');
                return this.app;
            }

            // Apply final configuration and validate complete application setup
            const finalConfig = {
                ...this.config,
                middlewareStack: this.middlewareStack,
                routeRegistry: this.routeRegistry,
                builtAt: new Date().toISOString()
            };

            // Set up any remaining middleware that wasn't immediately applied
            this.middlewareStack
                .filter(entry => entry.options.immediate === false)
                .sort((a, b) => a.order - b.order)
                .forEach(entry => {
                    this.app.use(entry.middleware);
                });

            // Add final error handling and 404 middleware
            this.app.use(notFoundHandler);
            this.app.use(errorHandler);

            // Add builder metadata to application locals
            this.app.locals.builder = {
                config: finalConfig,
                middlewareCount: this.middlewareStack.length,
                routeCount: Object.keys(this.routeRegistry).length,
                builtAt: new Date().toISOString(),
                buildVersion: APPLICATION.VERSION
            };

            // Set isBuilt flag to true to prevent further modification
            this.isBuilt = true;

            // Log successful application build completion with summary
            this.logger.info('Application build completed successfully', {
                totalMiddleware: this.middlewareStack.length,
                totalRoutes: Object.keys(this.routeRegistry).length,
                hasErrorHandling: true,
                applicationReady: true
            });

            // Return configured Express.js application instance
            return this.app;

        } catch (error) {
            this.logger.error('Error building application', {
                error: error.message,
                stack: error.stack,
                middlewareCount: this.middlewareStack.length,
                routeCount: Object.keys(this.routeRegistry).length
            });

            // Return application in current state even if build process encounters errors
            this.app.locals.builder = {
                error: error.message,
                builtAt: new Date().toISOString(),
                buildFailed: true
            };

            this.isBuilt = true;
            return this.app;
        }
    }
}

// Export all functions, classes, and utilities for application use
module.exports = {
    // Primary factory function for creating configured Express.js application instances
    createApplication,
    
    // Builder class for fluent Express.js application construction with step-by-step configuration
    ApplicationBuilder,
    
    // Express.js application settings configuration utility function
    configureExpressSettings,
    
    // Middleware stack setup utility for ordered Express.js middleware pipeline
    setupMiddlewareStack,
    
    // Route registration utility for Express.js application integration
    registerApplicationRoutes,
    
    // Security configuration utility for Express.js application hardening
    configureApplicationSecurity,
    
    // Utility function for retrieving comprehensive application information and status
    getApplicationInfo,
    
    // Configuration validation utility for ensuring proper application setup
    validateApplicationConfig,
    
    // Factory generator for creating pre-configured application factory functions
    createApplicationFactory
};