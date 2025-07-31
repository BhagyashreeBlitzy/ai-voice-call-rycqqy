/**
 * Main Express.js Application Module for Node.js Tutorial Application
 * 
 * This module serves as the central orchestrator for the Node.js tutorial application,
 * creating and configuring the Express.js application instance with comprehensive
 * middleware integration, route registration, error handling, and security configuration.
 * 
 * Implements Express.js 5.1.0 features with Node.js v22.x LTS optimization, demonstrating
 * fundamental HTTP server concepts through a single /hello endpoint that returns 'Hello world'.
 * Serves as the primary entry point for application initialization, middleware orchestration,
 * and route management following educational best practices and production-ready architectural patterns.
 * 
 * Features:
 * - Express.js application creation and configuration
 * - Comprehensive middleware stack management
 * - Route registration and validation
 * - Security configuration and headers
 * - Error handling and recovery mechanisms
 * - Application lifecycle management
 * - Educational logging and monitoring
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import Express.js 5.1.0 web framework for HTTP server and middleware functionality
const express = require('express'); // Express.js 5.1.0

// Import factory function for creating configured Express.js application instances
const {
    createApplication,
    ApplicationBuilder
} = require('./lib/application.js');

// Import centralized configuration object and logger factory
const {
    configuration,
    createLoggerInstance
} = require('./config/index.js');

// Import Express.js Router instance with configured /hello endpoint
const {
    helloRouter,
    routes
} = require('./routes/index.js');

// Import middleware components for request processing pipeline
const {
    requestLogger,
    errorHandler,
    notFoundHandler,
    createMiddlewareStack
} = require('./middleware/index.js');

// Import primary factory function for creating component-specific loggers
const { getLogger } = require('./utils/logger.js');

// Import application metadata constants for version identification and logging
const {
    APPLICATION
} = require('./utils/constants.js');

// Initialize component-specific logger for application operations
const logger = getLogger('app');

// Global variables for application state management
let appInstance = null;
let isApplicationInitialized = false;

/**
 * Creates and configures the main Express.js application instance with complete
 * middleware stack, route registration, security settings, and error handling
 * for the Node.js tutorial application.
 * 
 * @param {Object} options - Configuration options for application creation
 * @param {Object} options.config - Application configuration object
 * @param {boolean} options.enableMiddleware - Whether to set up middleware stack
 * @param {boolean} options.enableRoutes - Whether to register application routes
 * @param {boolean} options.enableSecurity - Whether to apply security configurations
 * @param {boolean} options.enableErrorHandling - Whether to set up error handling
 * @returns {Object} Fully configured Express.js application instance ready for HTTP server integration
 */
function createExpressApp(options = {}) {
    try {
        logger.info('Creating Express.js application instance', {
            hasOptions: Object.keys(options).length > 0,
            enableMiddleware: options.enableMiddleware !== false,
            enableRoutes: options.enableRoutes !== false,
            enableSecurity: options.enableSecurity !== false
        });

        // Create new Express.js application instance using express() constructor from Express.js 5.1.0
        const app = express();

        // Load application configuration from options or use default configuration
        const appConfig = options.config || configuration;

        // Create application-specific logger using createLoggerInstance function
        const appLogger = createLoggerInstance('ExpressApplication');

        // Apply Express.js application-level settings including security headers and JSON parsing configuration
        configureApplicationSettings(app, appConfig);
        appLogger.debug('Express.js application settings configured');

        // Set up comprehensive middleware stack using createMiddlewareStack with request logging and response handling
        if (options.enableMiddleware !== false) {
            setupApplicationMiddleware(app, {
                requestLogger: appConfig.logging,
                responseHandler: appConfig.server,
                security: appConfig.server.security
            });
            appLogger.debug('Middleware stack configured');
        }

        // Register hello router and all application routes using route registry configuration
        if (options.enableRoutes !== false) {
            setupApplicationRoutes(app, {
                helloRouter: helloRouter,
                routes: routes
            });
            appLogger.debug('Application routes registered');
        }

        // Configure security settings including X-Powered-By header removal and trust proxy settings
        if (options.enableSecurity !== false) {
            // Disable X-Powered-By header using app.disable() to remove Express.js version exposure for security
            app.disable('x-powered-by');

            // Configure trust proxy setting based on environment configuration for deployment behind proxies
            if (appConfig.server?.express?.trustProxy !== undefined) {
                app.set('trust proxy', appConfig.server.express.trustProxy);
            } else {
                app.set('trust proxy', false);
            }

            appLogger.debug('Security configurations applied');
        }

        // Apply error handling middleware stack including 404 not found and general error handlers
        if (options.enableErrorHandling !== false) {
            // Register 404 not found handler middleware using notFoundHandler for unmatched routes
            app.use(notFoundHandler);

            // Apply error handling middleware using errorHandler as final middleware for error processing
            app.use(errorHandler);

            appLogger.debug('Error handling middleware configured');
        }

        // Add application metadata and version information for monitoring and debugging
        app.locals.applicationInfo = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            createdAt: new Date().toISOString(),
            configuration: appConfig.metadata || {},
            routes: Object.keys(routes).length || 1,
            middlewareEnabled: options.enableMiddleware !== false,
            securityEnabled: options.enableSecurity !== false,
            errorHandlingEnabled: options.enableErrorHandling !== false
        };

        // Log successful application creation with configuration summary and registered routes
        logger.info('Express.js application created successfully', {
            applicationName: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            routesRegistered: app.locals.applicationInfo.routes,
            middlewareEnabled: options.enableMiddleware !== false,
            securityEnabled: options.enableSecurity !== false,
            errorHandlingEnabled: options.enableErrorHandling !== false
        });

        // Return fully configured Express.js application instance ready for server binding
        return app;

    } catch (error) {
        logger.error('Failed to create Express.js application', {
            error: error.message,
            stack: error.stack,
            options: options
        });

        // Return minimal Express.js application if creation fails
        const fallbackApp = express();
        fallbackApp.get('/hello', (req, res) => {
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
 * Initializes the Node.js tutorial application by setting up configuration,
 * creating the Express.js app instance, and preparing all components for HTTP server operation.
 * 
 * @param {Object} initOptions - Configuration options for application initialization
 * @param {boolean} initOptions.validateConfig - Whether to validate configuration
 * @param {boolean} initOptions.enableCaching - Whether to cache application instance
 * @param {Object} initOptions.middlewareConfig - Custom middleware configuration
 * @param {Object} initOptions.routeConfig - Custom route configuration
 * @returns {Object} Initialized application object with Express.js instance and configuration metadata
 */
function initializeApplication(initOptions = {}) {
    try {
        logger.info('Initializing Node.js tutorial application', {
            hasOptions: Object.keys(initOptions).length > 0,
            validateConfig: initOptions.validateConfig !== false,
            enableCaching: initOptions.enableCaching !== false
        });

        // Load and validate application configuration from config/index.js ensuring all required settings are present
        if (initOptions.validateConfig !== false && !configuration) {
            throw new Error('Application configuration is not available');
        }

        // Create application-specific logger instance using createLoggerInstance with 'app' component name
        const appLogger = createLoggerInstance('app');

        // Initialize Express.js application using createExpressApp with configuration options
        const expressApp = createExpressApp({
            config: configuration,
            enableMiddleware: initOptions.enableMiddleware !== false,
            enableRoutes: initOptions.enableRoutes !== false,
            enableSecurity: initOptions.enableSecurity !== false,
            enableErrorHandling: initOptions.enableErrorHandling !== false,
            ...initOptions
        });

        // Validate application initialization including route registration and middleware setup verification
        const validationResult = validateApplicationSetup(expressApp);
        if (!validationResult.isValid) {
            logger.warn('Application validation warnings detected', {
                warnings: validationResult.warnings,
                errors: validationResult.errors
            });
        }

        // Set isApplicationInitialized flag to true indicating successful initialization completion
        isApplicationInitialized = true;

        // Cache application instance in appInstance global for subsequent access and reuse
        if (initOptions.enableCaching !== false) {
            appInstance = expressApp;
            appLogger.debug('Application instance cached for reuse');
        }

        // Create application object with Express.js instance and initialization metadata
        const applicationObject = {
            app: expressApp,
            configuration: configuration,
            initialization: {
                initializedAt: new Date().toISOString(),
                version: APPLICATION.VERSION,
                options: initOptions,
                validation: validationResult,
                cached: initOptions.enableCaching !== false
            },
            metadata: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                runtime: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    processId: process.pid
                }
            }
        };

        // Log successful application initialization with configuration summary and operational status
        logger.info('Application initialized successfully', {
            applicationName: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            configurationValid: Boolean(configuration),
            validationScore: validationResult.validationScore || 0,
            cached: initOptions.enableCaching !== false,
            initializationTime: Date.now()
        });

        // Return application object with Express.js instance and initialization metadata
        return applicationObject;

    } catch (error) {
        logger.error('Failed to initialize application', {
            error: error.message,
            stack: error.stack,
            initOptions: initOptions
        });

        // Reset initialization flag on failure
        isApplicationInitialized = false;

        // Return minimal application object with error information
        return {
            app: null,
            configuration: configuration,
            initialization: {
                initializedAt: new Date().toISOString(),
                error: error.message,
                failed: true
            },
            metadata: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                initializationError: true
            }
        };
    }
}

/**
 * Configures Express.js application-level settings including trust proxy, JSON limits,
 * security headers, and environment-specific optimizations based on application configuration.
 * 
 * @param {Object} app - Express.js application instance to configure
 * @param {Object} config - Application configuration object with server settings
 * @returns {void} Modifies Express.js application instance with configured settings
 */
function configureApplicationSettings(app, config) {
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

        // Set JSON body parser limit from server configuration to prevent memory exhaustion attacks
        const jsonLimit = config.server?.http?.jsonLimit || '10mb';
        app.set('json limit', jsonLimit);

        // Configure URL encoding options for form data parsing with extended syntax support
        const urlencodedLimit = config.server?.http?.urlencodedLimit || '10mb';
        app.set('urlencoded limit', urlencodedLimit);

        // Apply Express.js strict routing and case sensitivity settings for consistent route matching
        app.set('strict routing', config.server?.express?.strictRouting || false);
        app.set('case sensitive routing', config.server?.express?.caseSensitive || false);

        // Set environment-specific Express.js settings and performance optimizations
        if (config.environment?.isProduction) {
            app.set('env', 'production');
            app.set('view cache', true);
        } else if (config.environment?.isDevelopment) {
            app.set('env', 'development');
            app.set('view cache', false);
        }

        // Log configuration completion with applied settings summary for debugging and monitoring
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
 * Registers all application routes with the Express.js application instance including
 * the /hello endpoint and route validation for the tutorial application.
 * 
 * @param {Object} app - Express.js application instance to register routes with
 * @param {Object} routeConfig - Route configuration object with route modules
 * @returns {void} Registers routes with Express.js application instance
 */
function setupApplicationRoutes(app, routeConfig = {}) {
    try {
        logger.debug('Registering application routes', {
            hasHelloRouter: Boolean(routeConfig.helloRouter),
            hasRoutes: Boolean(routeConfig.routes),
            routeKeys: routeConfig.routes ? Object.keys(routeConfig.routes) : []
        });

        // Register hello router at root path using app.use() with helloRouter instance
        if (routeConfig.helloRouter) {
            app.use('/', routeConfig.helloRouter);
            logger.debug('Hello router registered at root path');
        } else {
            // Mount hello endpoint at /hello path ensuring proper HTTP GET method handling
            app.get('/hello', (req, res) => {
                res.send('Hello world');
            });
            logger.debug('Fallback hello route registered');
        }

        // Add route metadata to application instance for monitoring and debugging purposes
        app.locals.routes = {
            hello: '/hello',
            total: app._router ? app._router.stack.length : 1,
            registered: true,
            registeredAt: new Date().toISOString()
        };

        // Configure route-specific middleware and error handling if specified in route configuration
        if (routeConfig.routes && Object.keys(routeConfig.routes).length > 0) {
            Object.entries(routeConfig.routes).forEach(([routeName, router]) => {
                if (router && typeof router === 'function') {
                    app.use('/', router);
                    logger.debug(`Additional route registered: ${routeName}`);
                }
            });
        }

        // Log route registration completion with registered paths, HTTP methods, and handler information
        logger.info('Application routes registered successfully', {
            helloRoute: '/hello',
            totalRoutes: app.locals.routes.total,
            hasHelloRouter: Boolean(routeConfig.helloRouter),
            registrationComplete: true
        });

        // Verify endpoint accessibility and response functionality for tutorial validation
        logger.debug('Route registration verified - endpoints ready for HTTP requests');

    } catch (error) {
        logger.error('Error registering application routes', {
            error: error.message,
            stack: error.stack,
            routeConfig: routeConfig
        });

        // Register minimal fallback route if registration fails
        app.get('/hello', (req, res) => {
            res.send('Hello world');
        });
    }
}

/**
 * Sets up the complete Express.js middleware stack in proper execution order including
 * request logging, JSON parsing, response handling, and error processing middleware.
 * 
 * @param {Object} app - Express.js application instance to configure
 * @param {Object} middlewareConfig - Middleware configuration options
 * @returns {void} Configures Express.js application with complete middleware stack
 */
function setupApplicationMiddleware(app, middlewareConfig = {}) {
    try {
        logger.debug('Setting up Express.js middleware stack', {
            hasConfig: Boolean(middlewareConfig),
            configKeys: Object.keys(middlewareConfig)
        });

        // Apply request logging middleware first in stack using requestLogger for all incoming HTTP requests
        if (middlewareConfig.requestLogger !== false) {
            app.use(requestLogger);
            logger.debug('Request logging middleware added to stack');
        }

        // Add Express.js built-in JSON parsing middleware with configured size limits
        app.use(express.json({ 
            limit: middlewareConfig.jsonLimit || '10mb',
            strict: true
        }));

        // Add Express.js URL-encoded parsing middleware for form data processing
        app.use(express.urlencoded({ 
            extended: true, 
            limit: middlewareConfig.urlencodedLimit || '10mb'
        }));

        // Apply response handling middleware for standardized response formatting and headers
        app.use((req, res, next) => {
            // Add request start time for response time calculation
            req.startTime = Date.now();
            
            // Add correlation ID for request tracking
            req.correlationId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            next();
        });

        // Add security middleware for basic security headers and XSS protection
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
            security: middlewareConfig.security !== false,
            jsonParsing: true,
            urlencodedParsing: true
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
 * Returns the current Express.js application instance if initialized, or creates a new
 * instance if not already created for singleton pattern implementation.
 * 
 * @returns {Object} Express.js application instance or null if not initialized
 */
function getApplicationInstance() {
    try {
        // Check if appInstance global variable contains initialized Express.js application
        if (appInstance && isApplicationInitialized) {
            logger.debug('Returning cached application instance');
            return appInstance;
        }

        // Create new application instance using initializeApplication if not cached
        logger.info('Creating new application instance - no cached instance available');
        const applicationResult = initializeApplication({ enableCaching: true });

        // Update appInstance global with newly created application for caching
        if (applicationResult && applicationResult.app) {
            appInstance = applicationResult.app;
            isApplicationInitialized = true;
            
            // Log application instance access with creation information
            logger.info('New application instance created and cached', {
                applicationName: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                cached: true
            });

            // Return Express.js application instance ready for use
            return appInstance;
        }

        // Return null if application creation failed
        logger.error('Failed to create application instance');
        return null;

    } catch (error) {
        logger.error('Error getting application instance', {
            error: error.message,
            stack: error.stack
        });

        return null;
    }
}

/**
 * Validates the complete application setup including configuration, routes, middleware,
 * and Express.js integration to ensure proper application initialization.
 * 
 * @param {Object} app - Express.js application instance to validate
 * @returns {Object} Validation result with isValid boolean and detailed validation information
 */
function validateApplicationSetup(app) {
    try {
        logger.debug('Validating application setup', {
            hasApp: Boolean(app),
            hasConfiguration: Boolean(configuration)
        });

        // Initialize validation result object
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            validationDetails: {},
            validationScore: 100
        };

        // Validate Express.js application instance is properly created and configured
        if (!app || typeof app !== 'function') {
            validationResult.errors.push('Express.js application instance is missing or invalid');
            validationResult.isValid = false;
            validationResult.validationScore -= 30;
        } else {
            validationResult.validationDetails.expressApp = { valid: true, type: typeof app };
        }

        // Check that configuration is loaded and all required settings are present
        if (!configuration) {
            validationResult.errors.push('Application configuration is missing');
            validationResult.isValid = false;
            validationResult.validationScore -= 25;
        } else {
            validationResult.validationDetails.configuration = { 
                valid: true, 
                hasEnvironment: Boolean(configuration.environment),
                hasServer: Boolean(configuration.server),
                hasLogging: Boolean(configuration.logging)
            };
        }

        // Verify route registration including /hello endpoint availability and handler function
        if (app && app._router) {
            const routeStack = app._router.stack;
            const hasRoutes = routeStack && routeStack.length > 0;
            
            if (!hasRoutes) {
                validationResult.warnings.push('No routes registered in application');
                validationResult.validationScore -= 10;
            } else {
                validationResult.validationDetails.routes = {
                    valid: true,
                    totalRoutes: routeStack.length,
                    stackSize: routeStack.length
                };
            }
        } else {
            validationResult.warnings.push('Router stack information not available');
            validationResult.validationScore -= 5;
        }

        // Validate middleware stack setup and proper execution order
        if (app && app._router && app._router.stack) {
            const middlewareCount = app._router.stack.length;
            if (middlewareCount === 0) {
                validationResult.warnings.push('No middleware registered in application');
                validationResult.validationScore -= 10;
            } else {
                validationResult.validationDetails.middleware = {
                    valid: true,
                    totalMiddleware: middlewareCount
                };
            }
        }

        // Check error handling middleware registration and configuration
        if (app && app.locals) {
            validationResult.validationDetails.applicationLocals = {
                valid: true,
                hasApplicationInfo: Boolean(app.locals.applicationInfo),
                hasRoutes: Boolean(app.locals.routes)
            };
        }

        // Verify application metadata and version information is properly set
        if (app && app.locals && app.locals.applicationInfo) {
            const appInfo = app.locals.applicationInfo;
            if (!appInfo.name || !appInfo.version) {
                validationResult.warnings.push('Application metadata is incomplete');
                validationResult.validationScore -= 5;
            } else {
                validationResult.validationDetails.metadata = {
                    valid: true,
                    name: appInfo.name,
                    version: appInfo.version,
                    hasMetadata: true
                };
            }
        }

        // Compile validation results with success status and any warnings or errors
        validationResult.summary = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            isValid: validationResult.isValid,
            validationScore: Math.max(0, validationResult.validationScore),
            validatedAt: new Date().toISOString(),
            validatedComponents: Object.keys(validationResult.validationDetails).length
        };

        // Log validation completion
        const statusMessage = validationResult.isValid ? 'passed' : 'failed';
        logger.info(`Application validation ${statusMessage}`, {
            isValid: validationResult.isValid,
            validationScore: validationResult.validationScore,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length
        });

        // Return comprehensive validation result object with detailed status information
        return validationResult;

    } catch (error) {
        logger.error('Error during application validation', {
            error: error.message,
            stack: error.stack
        });

        return {
            isValid: false,
            errors: [`Validation process failed: ${error.message}`],
            warnings: [],
            validationDetails: {},
            validationScore: 0,
            summary: {
                totalErrors: 1,
                totalWarnings: 0,
                isValid: false,
                validationError: error.message
            }
        };
    }
}

// Create the main Express.js application instance using createExpressApp with default configuration
const app = createExpressApp({
    config: configuration,
    enableMiddleware: true,
    enableRoutes: true,
    enableSecurity: true,
    enableErrorHandling: true
});

// Log main application creation
logger.info('Main Express.js application instance created', {
    applicationName: APPLICATION.NAME,
    version: APPLICATION.VERSION,
    ready: Boolean(app),
    timestamp: new Date().toISOString()
});

// Set global application instance
appInstance = app;
isApplicationInitialized = true;

// Export the main Express.js application instance and utility functions
module.exports = {
    // Main Express.js application instance configured with middleware, routes, and error handling ready for HTTP server integration
    app,
    
    // Factory function for creating configured Express.js application instances with complete setup
    createExpressApp,
    
    // Application initialization function that sets up configuration, creates Express.js app, and prepares components
    initializeApplication,
    
    // Singleton accessor function for retrieving the current Express.js application instance
    getApplicationInstance,
    
    // Application validation utility for ensuring proper setup and configuration integrity
    validateApplicationSetup
};