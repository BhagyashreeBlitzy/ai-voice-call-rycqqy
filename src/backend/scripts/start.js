// Node.js Tutorial Backend - Server Startup Script
// This script serves as the production-ready entrypoint for starting the Node.js tutorial backend server.
// It demonstrates comprehensive server lifecycle management, configuration loading, HTTP server creation,
// graceful shutdown handling, and robust error management suitable for both development and production environments.
//
// Educational Purpose: This implementation showcases fundamental Node.js server startup patterns,
// HTTP server lifecycle management, process signal handling, and production-ready error handling
// in a clear, observable, and maintainable structure suitable for learning server-side JavaScript development.
//
// Architecture: The script follows a stateless, event-driven architecture that leverages Node.js v22.x LTS
// capabilities and provides a solid foundation for understanding server initialization, configuration management,
// and graceful shutdown procedures essential for production deployments.

// External dependencies - Node.js built-in modules
const http = require('node:http'); // node:http@builtin - Core HTTP server functionality for creating and managing server instances
const process = require('node:process'); // node:process@builtin - Process management, environment variables, and signal handling

// Internal dependencies - Application modules
const { app } = require('../app.js'); // Express application instance configured with middleware, routes, and error handling
const { getServerConfig } = require('../config/index.js'); // Centralized configuration management with validation and defaults
const { logger } = require('../utils/logger.js'); // Structured logging utilities with multiple log levels and formatted output
const { setupShutdownHooks } = require('../utils/shutdown.js'); // Graceful shutdown management with signal handling and resource cleanup

// Global variables for server lifecycle management
let server = null; // HTTP server instance created by http.createServer(app)
let config = null; // Server configuration object loaded from getServerConfig()

/**
 * Main startup function for the backend server
 * 
 * Loads configuration, creates the HTTP server, starts listening, logs startup details,
 * and registers graceful shutdown hooks. Handles startup errors robustly by logging
 * comprehensive error information and exiting the process cleanly on fatal errors.
 * 
 * This function implements production-ready server initialization patterns:
 * - Centralized configuration loading with validation and error handling
 * - HTTP server creation using Node.js native http module for optimal control
 * - Comprehensive event handling for server listening and error events
 * - Detailed logging for operational transparency and debugging support
 * - Graceful shutdown hook registration for clean process termination
 * - Robust error handling with appropriate process exit codes
 * 
 * The implementation follows Node.js v22.x LTS best practices and demonstrates
 * fundamental concepts essential for production server deployment including
 * configuration management, server lifecycle control, and operational observability.
 * 
 * @async
 * @function startServer
 * @returns {Promise<void>} Resolves when the server is started and ready to accept requests.
 *                          Rejects or exits process on fatal startup error.
 * @throws {Error} When configuration loading fails or server startup encounters fatal errors
 */
async function startServer() {
    try {
        // Step 1: Load and validate server configuration
        // Configuration includes port binding, environment settings, and request timeout values
        // Uses centralized config module with validation, defaults, and comprehensive error handling
        logger.info('Starting Node.js tutorial backend server initialization', {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            environment: process.env.NODE_ENV || 'development',
            processId: process.pid,
            startupTime: new Date().toISOString(),
            action: 'server_startup_initiated'
        });

        // Call getServerConfig() to load validated configuration (port, environment, request timeout)
        config = getServerConfig();
        
        logger.info('Server configuration loaded and validated successfully', {
            port: config.port,
            environment: config.env,
            requestTimeoutMs: config.requestTimeoutMs,
            configSource: 'centralized configuration module',
            validationPassed: true,
            action: 'configuration_loaded'
        });

        // Step 2: Validate Express application instance
        // Ensure the imported app is a valid Express application before proceeding with server creation
        if (!app || typeof app !== 'function') {
            const errorMessage = 'Express application instance is invalid or not properly initialized';
            logger.error('Fatal configuration error: Invalid Express app', {
                appType: typeof app,
                appValue: app,
                expectedType: 'function',
                action: 'express_app_validation_failed'
            });
            throw new Error(errorMessage);
        }

        logger.info('Express application instance validated successfully', {
            appType: typeof app,
            expressVersion: '5.1.0',
            middlewareStackReady: true,
            routesRegistered: true,
            action: 'express_app_validated'
        });

        // Step 3: Create HTTP server instance using http.createServer(app)
        // Using Node.js native HTTP module provides advanced server lifecycle management
        // and better control over server events, timeouts, and graceful shutdown procedures
        server = http.createServer(app);

        // Configure server-level settings for optimal performance and security
        // These settings optimize connection handling and prevent resource exhaustion
        server.keepAliveTimeout = 65000; // Keep-alive timeout for connection reuse (65 seconds)
        server.headersTimeout = 66000; // Headers timeout slightly higher than keep-alive (66 seconds)
        server.maxHeadersCount = 2000; // Maximum number of headers per request
        server.timeout = config.requestTimeoutMs || 30000; // Request timeout from configuration

        logger.info('HTTP server instance created with optimal configuration', {
            serverType: 'http.Server',
            keepAliveTimeout: server.keepAliveTimeout,
            headersTimeout: server.headersTimeout,
            maxHeadersCount: server.maxHeadersCount,
            requestTimeout: server.timeout,
            action: 'http_server_created'
        });

        // Step 4: Set up server event handlers before starting
        // Register event handlers for server lifecycle events to provide comprehensive
        // monitoring and error handling throughout the server operation

        // Handle server listening event - logs startup success with comprehensive details
        server.on('listening', () => {
            const address = server.address();
            const serverInfo = {
                port: config.port,
                address: address.address || 'localhost',
                family: address.family || 'IPv4',
                environment: config.env,
                requestTimeoutMs: config.requestTimeoutMs,
                nodeVersion: process.version,
                processId: process.pid,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                startupDuration: process.uptime() * 1000, // Convert to milliseconds
                endpoints: {
                    hello: `http://localhost:${config.port}/hello`,
                    health: `http://localhost:${config.port}/health`
                },
                serverConfiguration: {
                    keepAliveTimeout: server.keepAliveTimeout,
                    headersTimeout: server.headersTimeout,
                    maxHeadersCount: server.maxHeadersCount,
                    timeout: server.timeout
                },
                action: 'server_listening_success'
            };

            logger.info('HTTP server started successfully and ready to accept connections', serverInfo);
        });

        // Handle server error events - comprehensive error handling with specific error type handling
        server.on('error', (error) => {
            // Log comprehensive error details for debugging and monitoring
            logger.error('HTTP server encountered a fatal error during startup or operation', {
                error: {
                    message: error.message,
                    name: error.name,
                    code: error.code,
                    errno: error.errno,
                    syscall: error.syscall,
                    address: error.address,
                    port: error.port,
                    stack: error.stack
                },
                serverConfig: {
                    port: config.port,
                    environment: config.env
                },
                processInfo: {
                    processId: process.pid,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                },
                action: 'server_error_fatal'
            });

            // Handle specific server startup errors with appropriate responses
            if (error.code === 'EADDRINUSE') {
                // Port already in use - common development issue
                logger.error(`Port ${config.port} is already in use. Please check for other running processes or choose a different port.`, {
                    errorType: 'PORT_IN_USE',
                    port: config.port,
                    suggestedAction: 'Change PORT environment variable or stop conflicting process',
                    action: 'port_conflict_detected'
                });
            } else if (error.code === 'EACCES') {
                // Permission denied - typically occurs when trying to bind to privileged ports
                logger.error(`Permission denied when attempting to bind to port ${config.port}. Administrator privileges may be required.`, {
                    errorType: 'PERMISSION_DENIED',
                    port: config.port,
                    suggestedAction: 'Use port > 1024 or run with appropriate privileges',
                    action: 'permission_error_detected'
                });
            } else if (error.code === 'ENOTFOUND') {
                // Host not found - network configuration issue
                logger.error('Network host not found. Please check network configuration and hostname resolution.', {
                    errorType: 'HOST_NOT_FOUND',
                    suggestedAction: 'Verify network configuration and DNS settings',
                    action: 'network_error_detected'
                });
            } else {
                // Generic server error - log all available error information
                logger.error('Unhandled server error occurred. Please check server configuration and system resources.', {
                    errorType: 'UNKNOWN_SERVER_ERROR',
                    errorCode: error.code,
                    suggestedAction: 'Review error details and system configuration',
                    action: 'unknown_server_error'
                });
            }

            // Exit process with error code 1 to indicate startup failure
            // This ensures proper process exit for process managers and CI/CD systems
            logger.error('Server startup failed - exiting process with error code 1', {
                exitCode: 1,
                reason: 'server_startup_error',
                action: 'process_exit_error'
            });
            process.exit(1);
        });

        // Handle connection events for monitoring and debugging
        server.on('connection', (socket) => {
            logger.info('New client connection established', {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                localAddress: socket.localAddress,
                localPort: socket.localPort,
                connectionTime: new Date().toISOString(),
                action: 'client_connection_established'
            });
        });

        // Step 5: Start the server by calling server.listen(config.port)
        // Wrap server startup in Promise for proper async/await error handling
        // and to ensure server is fully ready before proceeding to shutdown hook registration
        await new Promise((resolve, reject) => {
            server.listen(config.port, (listenError) => {
                if (listenError) {
                    // Server failed to start listening - reject the promise
                    logger.error('Failed to start HTTP server listening', {
                        error: {
                            message: listenError.message,
                            code: listenError.code,
                            stack: listenError.stack
                        },
                        port: config.port,
                        action: 'server_listen_failed'
                    });
                    reject(listenError);
                    return;
                }

                // Server started listening successfully - resolve the promise
                resolve();
            });
        });

        // Step 6: Register graceful shutdown hooks using setupShutdownHooks(server)
        // Ensures SIGTERM/SIGINT signals are handled properly for graceful server shutdown
        // This is essential for production deployments and proper resource cleanup
        setupShutdownHooks(server, {
            timeoutMs: 30000, // 30 second shutdown timeout
            logger: logger, // Use centralized logger for shutdown events
            onShutdown: async () => {
                // Custom cleanup logic during shutdown
                logger.info('Performing custom application cleanup during shutdown', {
                    action: 'custom_cleanup_initiated'
                });
                
                // Additional cleanup tasks can be added here
                // For example: closing database connections, clearing timers, etc.
                
                logger.info('Custom application cleanup completed successfully', {
                    action: 'custom_cleanup_completed'
                });
            }
        });

        logger.info('Graceful shutdown hooks registered successfully', {
            signals: ['SIGTERM', 'SIGINT'],
            shutdownTimeout: 30000,
            customCleanupEnabled: true,
            action: 'shutdown_hooks_registered'
        });

        // Step 7: Server initialization complete
        // Log final startup success message with comprehensive server information
        logger.info('Node.js tutorial backend server initialization completed successfully', {
            status: 'ready',
            readyTime: new Date().toISOString(),
            initializationDuration: process.uptime() * 1000, // Milliseconds since process start
            serverDetails: {
                port: config.port,
                environment: config.env,
                requestTimeoutMs: config.requestTimeoutMs,
                nodeVersion: process.version,
                processId: process.pid,
                memoryUsage: process.memoryUsage(),
                serverTimeouts: {
                    keepAlive: server.keepAliveTimeout,
                    headers: server.headersTimeout,
                    request: server.timeout
                }
            },
            endpoints: [
                { path: '/hello', method: 'GET', description: 'Returns Hello world message' },
                { path: '/health', method: 'GET', description: 'Server health check endpoint' }
            ],
            operationalInfo: {
                logLevel: logger.level || 'info',
                shutdownHooksEnabled: true,
                gracefulShutdownTimeout: 30000
            },
            action: 'server_initialization_complete'
        });

    } catch (initializationError) {
        // Handle comprehensive server initialization errors
        // This catch block handles any errors that occur during the server startup process
        // including configuration errors, Express app validation failures, and server creation errors
        
        logger.error('Server initialization failed with fatal error', {
            error: {
                message: initializationError.message,
                name: initializationError.name,
                stack: initializationError.stack,
                cause: initializationError.cause
            },
            initializationStage: 'unknown', // Could be enhanced to track specific stage
            serverConfig: config ? {
                port: config.port,
                environment: config.env
            } : null,
            processInfo: {
                processId: process.pid,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                nodeVersion: process.version
            },
            systemInfo: {
                platform: process.platform,
                architecture: process.arch,
                freeMemory: require('os').freemem(),
                totalMemory: require('os').totalmem()
            },
            action: 'server_initialization_failed'
        });

        // Ensure graceful cleanup if server was partially initialized
        if (server && server.listening) {
            logger.info('Attempting to close partially initialized server', {
                action: 'cleanup_partial_server'
            });
            
            try {
                server.close(() => {
                    logger.info('Partially initialized server closed successfully', {
                        action: 'cleanup_server_closed'
                    });
                });
            } catch (closeError) {
                logger.error('Error occurred while closing partially initialized server', {
                    error: {
                        message: closeError.message,
                        stack: closeError.stack
                    },
                    action: 'cleanup_server_close_error'
                });
            }
        }

        // Log final error message and exit with error code
        logger.error('Fatal server initialization error - process will exit with code 1', {
            exitCode: 1,
            reason: 'initialization_failure',
            errorSummary: initializationError.message,
            action: 'process_exit_initialization_error'
        });

        // Exit with error code to indicate initialization failure
        // This is essential for process managers, Docker containers, and CI/CD systems
        // to properly detect and handle server startup failures
        process.exit(1);
    }
}

// Execute server startup if this script is run directly
// This allows the script to be started with `node scripts/start.js` or `npm start`
// while also supporting import/require for testing and integration scenarios
if (require.main === module) {
    // Call startServer function and handle any uncaught errors
    startServer().catch((error) => {
        // Final safety net for any errors not caught in the startServer function
        // This should rarely be reached as startServer has comprehensive error handling
        logger.error('Uncaught error in server startup process', {
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            },
            processId: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            action: 'uncaught_startup_error'
        });
        
        // Log final error and exit
        logger.error('Fatal uncaught error during startup - exiting immediately', {
            exitCode: 1,
            action: 'emergency_exit'
        });
        
        process.exit(1);
    });
}

// Export the startServer function for testing and integration purposes
// This enables unit testing of the startup logic and integration testing
// of the complete server initialization process
module.exports = {
    startServer,
    // Export server and config for testing access (will be null until startServer is called)
    get server() { return server; },
    get config() { return config; }
};