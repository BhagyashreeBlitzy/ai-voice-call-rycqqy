// Node.js Tutorial Backend - Main Application Entry Point
// This file serves as the canonical entry point for the Node.js tutorial backend application.
// It demonstrates production-ready patterns for Express.js v5.1.0 server initialization,
// middleware configuration, error handling, and graceful shutdown management.
//
// Educational Purpose: This implementation showcases fundamental HTTP server concepts,
// Express.js framework integration, and Node.js best practices in a minimal, observable,
// and maintainable structure suitable for learning server-side JavaScript development.
//
// Architecture: The application follows a stateless, event-driven architecture that
// leverages Node.js v22.x LTS capabilities and Express.js v5.1.0 modern features
// including automatic Promise rejection handling and enhanced security measures.

// External dependencies - Node.js built-in modules
const express = require('express'); // express@^5.1.0 - Web framework with enhanced async/await support
const http = require('node:http'); // Node.js built-in HTTP module for server creation
const process = require('node:process'); // Node.js built-in process module for environment and signals

// Internal dependencies - Application modules
const { getServerConfig } = require('./config'); // Centralized configuration management
const { logger, setupShutdownHooks } = require('./utils'); // Logging and graceful shutdown utilities
const { getMiddlewareStack, handleTimeoutError, errorHandler } = require('./middleware'); // Middleware stack and error handling
const { router } = require('./routes'); // Main API router with all endpoints

// Application globals for server lifecycle management
let app = null; // Express application instance
let server = null; // HTTP server instance
let config = null; // Server configuration object

/**
 * Main application bootstrap function
 * Initializes and starts the Node.js tutorial backend server with comprehensive
 * configuration, middleware setup, route mounting, and graceful shutdown handling.
 * 
 * This function demonstrates production-ready server initialization patterns:
 * - Centralized configuration loading and validation
 * - Ordered middleware application for security, logging, and performance
 * - Proper error handling and timeout management
 * - HTTP server creation with lifecycle management
 * - Graceful shutdown with signal handling
 * - Comprehensive logging for observability and debugging
 * 
 * The implementation follows Express.js v5.1.0 best practices and Node.js v22.x LTS
 * standards for educational clarity while maintaining production readiness.
 * 
 * @async
 * @function main
 * @throws {Error} When server initialization fails or configuration is invalid
 * @returns {Promise<void>} Resolves when server is successfully started and configured
 */
async function main() {
    try {
        // Step 1: Load and validate server configuration
        // Configuration includes port binding, environment settings, and request timeout
        // Uses centralized config module for consistency and maintainability
        logger.info('Initializing Node.js tutorial backend server', {
            nodeVersion: process.version,
            platform: process.platform,
            environment: process.env.NODE_ENV || 'development',
            action: 'server_initialization_start'
        });

        // Load server configuration with validation and defaults
        config = getServerConfig();
        
        logger.info('Server configuration loaded successfully', {
            port: config.port,
            environment: config.env,
            requestTimeoutMs: config.requestTimeoutMs,
            action: 'configuration_loaded'
        });

        // Step 2: Create Express application instance
        // Express.js v5.1.0 provides enhanced async/await support and automatic
        // Promise rejection forwarding to error handling middleware
        app = express();

        // Disable Express.js powered-by header for security
        // This prevents disclosure of the Express.js framework version
        app.disable('x-powered-by');

        logger.info('Express application instance created', {
            expressVersion: '5.1.0',
            features: ['async_await_support', 'promise_rejection_handling', 'security_enhancements'],
            action: 'express_app_created'
        });

        // Step 3: Apply core middleware stack in security-first order
        // The middleware stack is carefully ordered for optimal security and performance:
        // 1. Security headers (helmet + CORS) - must be first for protection
        // 2. Request logging - observability for all requests
        // 3. Compression - performance optimization
        // 4. Request timeout - resource protection
        const middlewareStack = getMiddlewareStack({
            timeoutMs: config.requestTimeoutMs,
            enableLogging: true,
            enableCompression: true,
            enableTimeout: true
        });

        // Apply all middleware functions to the Express app
        middlewareStack.forEach((middleware, index) => {
            app.use(middleware);
        });

        logger.info('Core middleware stack applied successfully', {
            middlewareCount: middlewareStack.length,
            order: ['security', 'logging', 'compression', 'timeout'],
            requestTimeoutMs: config.requestTimeoutMs,
            action: 'middleware_stack_applied'
        });

        // Step 4: Mount main API router at root path
        // The router aggregates all endpoint handlers (currently /hello)
        // and provides proper route organization and error propagation
        app.use('/', router);

        logger.info('Main API router mounted successfully', {
            basePath: '/',
            endpoints: ['/hello'],
            routerType: 'main_api_router',
            action: 'router_mounted'
        });

        // Step 5: Mount request timeout error handler
        // This middleware specifically handles request timeout errors
        // Must be mounted after all routes but before the main error handler
        app.use(handleTimeoutError);

        logger.info('Request timeout error handler mounted', {
            position: 'after_routes',
            purpose: 'timeout_error_processing',
            action: 'timeout_error_handler_mounted'
        });

        // Step 6: Mount centralized error handling middleware
        // This must be the last middleware in the Express application
        // Handles all errors from routes and middleware with secure response generation
        app.use(errorHandler);

        logger.info('Centralized error handler mounted', {
            position: 'last_middleware',
            purpose: 'error_normalization_and_response',
            action: 'error_handler_mounted'
        });

        // Step 7: Create HTTP server using Node.js HTTP module
        // Using the native http module allows for advanced server lifecycle management
        // and provides better control over server events and graceful shutdown
        server = http.createServer(app);

        // Configure server-level settings for optimal performance and security
        server.keepAliveTimeout = 65000; // Keep-alive timeout for connection reuse
        server.headersTimeout = 66000; // Headers timeout slightly higher than keep-alive

        logger.info('HTTP server instance created', {
            serverType: 'http.Server',
            keepAliveTimeout: server.keepAliveTimeout,
            headersTimeout: server.headersTimeout,
            action: 'http_server_created'
        });

        // Step 8: Start server listening on configured port
        // Wrap server.listen in Promise for async/await compatibility
        // and comprehensive error handling during server startup
        await new Promise((resolve, reject) => {
            server.listen(config.port, (error) => {
                if (error) {
                    logger.error('Failed to start HTTP server', {
                        error: {
                            message: error.message,
                            code: error.code,
                            stack: error.stack
                        },
                        port: config.port,
                        action: 'server_startup_failed'
                    });
                    reject(error);
                    return;
                }

                // Server started successfully - log comprehensive startup information
                logger.info('HTTP server started successfully', {
                    port: config.port,
                    environment: config.env,
                    requestTimeoutMs: config.requestTimeoutMs,
                    nodeVersion: process.version,
                    processId: process.pid,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    endpoints: {
                        hello: `http://localhost:${config.port}/hello`,
                        health: `http://localhost:${config.port}/health`
                    },
                    action: 'server_startup_success'
                });

                resolve();
            });
        });

        // Step 9: Set up graceful shutdown handling
        // Register process signal handlers for SIGTERM and SIGINT
        // Ensures proper cleanup and connection termination on server shutdown
        setupShutdownHooks(server);

        logger.info('Graceful shutdown hooks registered', {
            signals: ['SIGTERM', 'SIGINT'],
            purpose: 'graceful_server_shutdown',
            action: 'shutdown_hooks_registered'
        });

        // Step 10: Handle uncaught exceptions and unhandled promise rejections
        // These global error handlers ensure the process exits gracefully
        // even if unexpected errors occur outside the normal request cycle
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception detected - initiating emergency shutdown', {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                processId: process.pid,
                uptime: process.uptime(),
                action: 'uncaught_exception_emergency_shutdown'
            });

            // Attempt graceful shutdown, but exit forcefully if it takes too long
            setTimeout(() => {
                logger.error('Emergency shutdown timeout exceeded - forcing process exit', {
                    action: 'forced_process_exit'
                });
                process.exit(1);
            }, 5000);

            // Initiate graceful shutdown
            if (server) {
                server.close(() => {
                    logger.info('Server closed after uncaught exception', {
                        action: 'emergency_shutdown_complete'
                    });
                    process.exit(1);
                });
            } else {
                process.exit(1);
            }
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection detected', {
                reason: reason instanceof Error ? {
                    message: reason.message,
                    name: reason.name,
                    stack: reason.stack
                } : reason,
                promise: promise.toString(),
                processId: process.pid,
                uptime: process.uptime(),
                action: 'unhandled_promise_rejection'
            });

            // For unhandled promise rejections, log the error but don't exit
            // Express.js v5.1.0 automatically handles Promise rejections in middleware
            // However, we still want to log these for debugging purposes
        });

        logger.info('Global error handlers registered', {
            handlers: ['uncaughtException', 'unhandledRejection'],
            purpose: 'process_level_error_handling',
            action: 'global_error_handlers_registered'
        });

        // Server initialization complete
        logger.info('Node.js tutorial backend server initialization complete', {
            status: 'ready',
            port: config.port,
            environment: config.env,
            processId: process.pid,
            startupTime: process.uptime(),
            action: 'server_initialization_complete'
        });

    } catch (initializationError) {
        // Handle any errors that occur during server initialization
        // Log comprehensive error details and exit with error code
        logger.error('Server initialization failed', {
            error: {
                message: initializationError.message,
                name: initializationError.name,
                stack: initializationError.stack
            },
            processId: process.pid,
            uptime: process.uptime(),
            action: 'server_initialization_failed'
        });

        // Exit with error code to indicate initialization failure
        process.exit(1);
    }
}

// Execute the main function if this file is run directly
// This allows the application to be started with `node app.js`
// while also supporting import/require for testing and integration scenarios
if (require.main === module) {
    main().catch((error) => {
        // Final error handler for any uncaught errors in the main function
        logger.error('Fatal error in main application function', {
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            },
            processId: process.pid,
            action: 'main_function_fatal_error'
        });
        process.exit(1);
    });
}

// Export the Express application instance for testing and integration
// This enables unit testing of the application configuration and
// integration testing of the complete server setup
module.exports = {
    app,
    server,
    config,
    main
};