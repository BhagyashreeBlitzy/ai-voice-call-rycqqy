// Canonical entrypoint for the Node.js tutorial backend application
// This file serves as the main initialization point for the Express.js HTTP server,
// implementing production-ready patterns for server lifecycle management,
// middleware application, routing, and graceful shutdown handling.
//
// Educational Purpose: Demonstrates comprehensive Node.js server architecture
// including configuration management, middleware application, error handling,
// and production-ready server lifecycle management patterns.
//
// Technical Stack: Node.js v22.x LTS, Express.js v5.1.0, native HTTP module
// Architecture: Event-driven, stateless, production-ready server implementation

// External library imports with version annotations for dependency management
const express = require('express'); // ^5.1.0 - Web framework with async/await support and CVE-2024-45590 mitigation
const http = require('node:http'); // builtin - Native HTTP server module for advanced server lifecycle management
const process = require('process'); // builtin - Process management for environment variables and signal handling

// Internal module imports - centralized configuration and utilities
const { getServerConfig } = require('./config'); // Server configuration loader with validation
const { logger, setupShutdownHooks } = require('./utils'); // Centralized logging and graceful shutdown utilities
const { getMiddlewareStack, handleTimeoutError, errorHandler } = require('./middleware'); // Middleware stack and error handling
const { router } = require('./routes'); // Main API router aggregating all endpoint handlers

// Global application state variables for server lifecycle management
let app = null; // Express application instance for route handling and middleware
let server = null; // HTTP server instance for network communication and lifecycle control
let config = null; // Server configuration object containing port, environment, and timeout settings

/**
 * Main application bootstrap function that initializes the complete server stack
 * Implements production-ready server initialization patterns with comprehensive
 * error handling, logging, and graceful shutdown capabilities
 * 
 * This function orchestrates the following initialization sequence:
 * 1. Load and validate server configuration from environment variables
 * 2. Create and configure the Express application instance
 * 3. Apply core middleware stack in security-first order
 * 4. Mount the main API router for endpoint handling
 * 5. Mount error handling middleware for centralized error processing
 * 6. Create and start the HTTP server with proper lifecycle management
 * 7. Register graceful shutdown hooks for clean server termination
 * 8. Handle uncaught exceptions and unhandled promise rejections
 * 
 * @returns {Promise<void>} Resolves when server initialization is complete
 * @throws {Error} If server configuration, middleware, or server startup fails
 */
async function main() {
    try {
        // Step 1: Load and validate server configuration
        // The configuration module provides environment-based settings with validation
        // and sensible defaults, supporting Twelve-Factor App principles
        logger.info('Loading server configuration', {
            action: 'server_configuration_loading',
            timestamp: new Date().toISOString()
        });

        config = getServerConfig();
        
        logger.info('Server configuration loaded successfully', {
            port: config.port,
            environment: config.env,
            requestTimeoutMs: config.requestTimeoutMs,
            action: 'server_configuration_loaded',
            timestamp: new Date().toISOString()
        });

        // Step 2: Create the Express application instance
        // Express.js v5.1.0 provides enhanced async/await support and security improvements
        logger.info('Creating Express application instance', {
            expressVersion: '5.1.0',
            nodeVersion: process.version,
            action: 'express_app_creation',
            timestamp: new Date().toISOString()
        });

        app = express();

        // Step 3: Apply core middleware stack in security-first order
        // The middleware stack enforces proper ordering for security, logging, compression, and timeout handling
        logger.info('Applying core middleware stack', {
            action: 'middleware_stack_application',
            timestamp: new Date().toISOString()
        });

        const middlewareStack = getMiddlewareStack({
            timeoutMs: config.requestTimeoutMs,
            enableLogging: true,
            enableCompression: true,
            enableTimeout: true
        });

        // Apply each middleware in the stack with proper error handling
        middlewareStack.forEach((middleware, index) => {
            logger.info(`Applying middleware ${index + 1}`, {
                middlewareIndex: index,
                middlewareName: middleware.name || 'anonymous',
                action: 'middleware_application',
                timestamp: new Date().toISOString()
            });
            app.use(middleware);
        });

        // Step 4: Mount the main API router at the root path
        // The router aggregates all endpoint handlers and provides modular route management
        logger.info('Mounting main API router', {
            basePath: '/',
            action: 'router_mounting',
            timestamp: new Date().toISOString()
        });

        app.use('/', router);

        // Step 5: Mount timeout error handler middleware
        // This middleware processes request timeout errors before the main error handler
        logger.info('Mounting timeout error handler middleware', {
            position: 'after_routes',
            action: 'timeout_error_handler_mounting',
            timestamp: new Date().toISOString()
        });

        app.use(handleTimeoutError);

        // Step 6: Mount centralized error handler as the last middleware
        // This middleware processes all errors with secure response generation
        logger.info('Mounting centralized error handler middleware', {
            position: 'last_middleware',
            action: 'error_handler_mounting',
            timestamp: new Date().toISOString()
        });

        app.use(errorHandler);

        // Step 7: Create HTTP server using native http module
        // This provides advanced server lifecycle management and event handling
        logger.info('Creating HTTP server instance', {
            action: 'http_server_creation',
            timestamp: new Date().toISOString()
        });

        server = http.createServer(app);

        // Configure server-level settings for production readiness
        server.timeout = config.requestTimeoutMs;
        server.keepAliveTimeout = 5000; // 5 seconds keep-alive timeout
        server.headersTimeout = 6000; // 6 seconds headers timeout (should be > keepAliveTimeout)

        // Step 8: Start the server and bind to the configured port
        // Implement Promise-based server startup with proper error handling
        logger.info('Starting HTTP server', {
            port: config.port,
            action: 'server_startup_initiated',
            timestamp: new Date().toISOString()
        });

        await new Promise((resolve, reject) => {
            server.listen(config.port, (error) => {
                if (error) {
                    logger.error('Failed to start HTTP server', {
                        error: {
                            message: error.message,
                            name: error.name,
                            code: error.code,
                            stack: error.stack
                        },
                        port: config.port,
                        action: 'server_startup_failed',
                        timestamp: new Date().toISOString()
                    });
                    return reject(error);
                }

                // Log successful server startup with comprehensive details
                logger.info('HTTP server started successfully', {
                    port: config.port,
                    environment: config.env,
                    requestTimeoutMs: config.requestTimeoutMs,
                    serverTimeout: server.timeout,
                    keepAliveTimeout: server.keepAliveTimeout,
                    headersTimeout: server.headersTimeout,
                    processId: process.pid,
                    nodeVersion: process.version,
                    uptime: process.uptime(),
                    action: 'server_startup_success',
                    timestamp: new Date().toISOString()
                });

                resolve();
            });
        });

        // Step 9: Register graceful shutdown hooks for clean server termination
        // This ensures all active connections are properly closed and resources are released
        logger.info('Registering graceful shutdown hooks', {
            signals: ['SIGTERM', 'SIGINT'],
            action: 'shutdown_hooks_registration',
            timestamp: new Date().toISOString()
        });

        setupShutdownHooks(server);

        // Step 10: Handle uncaught exceptions and unhandled promise rejections
        // This prevents the process from crashing and ensures proper error logging
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception detected', {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                action: 'uncaught_exception_handled',
                timestamp: new Date().toISOString()
            });

            // Perform graceful shutdown on uncaught exceptions
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection detected', {
                reason: reason instanceof Error ? {
                    message: reason.message,
                    name: reason.name,
                    stack: reason.stack
                } : reason,
                promise: promise.toString(),
                action: 'unhandled_rejection_handled',
                timestamp: new Date().toISOString()
            });

            // Perform graceful shutdown on unhandled promise rejections
            process.exit(1);
        });

        // Log final server readiness status
        logger.info('Server initialization completed successfully', {
            status: 'ready',
            port: config.port,
            environment: config.env,
            endpoints: ['/hello'],
            healthCheck: 'available',
            action: 'server_ready',
            timestamp: new Date().toISOString()
        });

    } catch (initializationError) {
        // Handle any errors that occur during server initialization
        logger.error('Server initialization failed', {
            error: {
                message: initializationError.message,
                name: initializationError.name,
                stack: initializationError.stack
            },
            action: 'server_initialization_failed',
            timestamp: new Date().toISOString()
        });

        // Exit with error code to indicate initialization failure
        process.exit(1);
    }
}

// Handle server startup errors and ensure proper error logging
process.on('exit', (code) => {
    logger.info('Process exit detected', {
        exitCode: code,
        action: 'process_exit',
        timestamp: new Date().toISOString()
    });
});

// Log server startup initiation
logger.info('Node.js tutorial backend server starting', {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    action: 'server_startup_initiated',
    timestamp: new Date().toISOString()
});

// Initialize the server
main().catch((error) => {
    logger.error('Fatal error during server initialization', {
        error: {
            message: error.message,
            name: error.name,
            stack: error.stack
        },
        action: 'fatal_initialization_error',
        timestamp: new Date().toISOString()
    });
    process.exit(1);
});

// Export the Express application instance for testing and advanced deployment scenarios
// This enables integration testing and advanced server management configurations
module.exports = {
    app,
    server,
    config
};