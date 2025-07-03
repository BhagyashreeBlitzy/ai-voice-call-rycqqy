// Development Server Startup Script for Node.js Tutorial Backend
// This script serves as the dedicated entrypoint for running the backend server in development mode
// with hot-reload capabilities, comprehensive logging, and graceful shutdown handling.
//
// Educational Purpose: This implementation demonstrates production-ready development server patterns
// including server lifecycle management, error handling, and observability practices suitable for
// learning Node.js development workflows and debugging techniques.
//
// Usage: Typically invoked by 'npm run dev' script or directly by nodemon for automatic restart
// on file changes during development. Provides immediate feedback and robust error reporting.

// External dependencies - Node.js built-in modules
const process = require('node:process'); // node:process builtin - Process management and environment access

// Internal dependencies - Application modules
const { app } = require('../app.js'); // Main Express.js application instance
const { getServerConfig } = require('../config/server.js'); // Server configuration loader with validation
const { logger } = require('../utils/logger.js'); // Centralized logging utility
const { setupShutdownHooks } = require('../utils/shutdown.js'); // Graceful shutdown management

// Global variables for server lifecycle management
let server = null; // HTTP server instance for development
let config = null; // Server configuration object

/**
 * Bootstraps and starts the Express.js HTTP server in development mode
 * 
 * This function provides a comprehensive development server startup sequence that includes:
 * - Server configuration loading and validation with educational transparency
 * - HTTP server initialization with proper error handling and resource management
 * - Development-specific logging for rapid feedback and debugging visibility
 * - Graceful shutdown registration to ensure clean resource cleanup on termination
 * - Comprehensive error handling with detailed logging for development troubleshooting
 * 
 * The implementation follows Node.js v22.x LTS best practices and Express.js v5.1.0
 * patterns while maintaining educational clarity and robust error handling suitable
 * for development workflows with hot-reload and file watching capabilities.
 * 
 * Educational Value:
 * - Demonstrates server lifecycle management patterns
 * - Shows proper error handling and logging practices
 * - Illustrates graceful shutdown implementation
 * - Provides transparency into server startup process
 * - Enables effective debugging and development workflows
 * 
 * @async
 * @function startDevServer
 * @throws {Error} When server configuration is invalid or server startup fails
 * @returns {Promise<void>} Resolves when development server is successfully started
 */
async function startDevServer() {
    try {
        // Step 1: Load server configuration using getServerConfig()
        // This provides validated configuration including port, environment, and request timeout
        // Configuration loading is logged for development transparency and debugging
        logger.info('Starting development server initialization', {
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
            cwd: process.cwd(),
            action: 'dev_server_startup_begin'
        });

        // Load and validate server configuration with comprehensive error handling
        config = getServerConfig();
        
        logger.info('Development server configuration loaded successfully', {
            port: config.port,
            environment: config.env,
            requestTimeoutMs: config.requestTimeoutMs,
            configSource: 'getServerConfig',
            action: 'dev_config_loaded'
        });

        // Step 2: Start the Express app by calling app.listen(config.port)
        // Store the returned server instance for lifecycle management and graceful shutdown
        // Wrap in Promise for proper async/await error handling during server binding
        server = await new Promise((resolve, reject) => {
            // Attempt to bind the server to the configured port
            const serverInstance = app.listen(config.port, (error) => {
                if (error) {
                    // Server binding failed - log comprehensive error details
                    logger.error('Development server failed to bind to port', {
                        error: {
                            message: error.message,
                            code: error.code,
                            errno: error.errno,
                            syscall: error.syscall,
                            stack: error.stack
                        },
                        port: config.port,
                        pid: process.pid,
                        action: 'dev_server_bind_failed'
                    });
                    reject(error);
                    return;
                }

                // Server successfully bound to port - resolve with server instance
                resolve(serverInstance);
            });

            // Handle server-level errors during startup
            serverInstance.on('error', (serverError) => {
                logger.error('Development server error during startup', {
                    error: {
                        message: serverError.message,
                        code: serverError.code,
                        errno: serverError.errno,
                        syscall: serverError.syscall,
                        stack: serverError.stack
                    },
                    port: config.port,
                    pid: process.pid,
                    action: 'dev_server_startup_error'
                });
                reject(serverError);
            });
        });

        // Step 3: Log startup message with port, environment, and process information
        // Comprehensive logging provides immediate feedback for development workflows
        // Includes all relevant server details for debugging and monitoring
        logger.info('Development server started successfully', {
            port: config.port,
            environment: config.env,
            requestTimeoutMs: config.requestTimeoutMs,
            nodeVersion: process.version,
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            endpoints: {
                hello: `http://localhost:${config.port}/hello`,
                health: `http://localhost:${config.port}/health`
            },
            devMode: {
                hotReload: 'enabled via nodemon',
                debugging: 'available via --inspect flag',
                logLevel: logger.level || 'info'
            },
            action: 'dev_server_startup_success'
        });

        // Log development-specific guidance and available endpoints
        logger.info('Development server ready for requests', {
            availableEndpoints: [
                'GET /hello - Returns "Hello world" message',
                'GET /health - Returns server health status'
            ],
            developmentTools: [
                'Hot reload: File changes trigger automatic restart',
                'Debugging: Use --inspect flag for Chrome DevTools',
                'Logs: All request/response activity logged to console'
            ],
            nextSteps: [
                `Visit http://localhost:${config.port}/hello to test the endpoint`,
                `Monitor logs for request processing and error details`,
                `Use Ctrl+C or SIGTERM to trigger graceful shutdown`
            ],
            action: 'dev_server_ready'
        });

        // Step 4: Register graceful shutdown hooks using setupShutdownHooks(server)
        // This ensures SIGTERM/SIGINT signals are handled properly for clean shutdown
        // Critical for development workflows where server restarts are frequent
        setupShutdownHooks(server, {
            timeoutMs: 30000, // 30 second shutdown timeout
            logger: logger,
            onShutdown: async () => {
                // Custom cleanup logic for development server
                logger.info('Development server cleanup initiated', {
                    pid: process.pid,
                    uptime: process.uptime(),
                    action: 'dev_server_cleanup'
                });
                
                // Log development server statistics before shutdown
                logger.info('Development server session statistics', {
                    sessionUptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    pid: process.pid,
                    action: 'dev_server_session_stats'
                });
            }
        });

        logger.info('Development server shutdown hooks registered', {
            signals: ['SIGTERM', 'SIGINT'],
            shutdownTimeout: 30000,
            pid: process.pid,
            action: 'dev_shutdown_hooks_registered'
        });

        // Step 5: Attach error event listeners to the server
        // Handle startup errors like EADDRINUSE (port already in use) and EACCES (permission denied)
        // Provides detailed error information for development troubleshooting
        server.on('error', (serverError) => {
            logger.error('Development server error occurred', {
                error: {
                    message: serverError.message,
                    code: serverError.code,
                    errno: serverError.errno,
                    syscall: serverError.syscall,
                    stack: serverError.stack
                },
                port: config.port,
                pid: process.pid,
                uptime: process.uptime(),
                action: 'dev_server_runtime_error'
            });

            // Handle specific error conditions common in development
            if (serverError.code === 'EADDRINUSE') {
                logger.error('Port already in use - another process is using this port', {
                    port: config.port,
                    suggestion: `Try a different port or stop the process using port ${config.port}`,
                    troubleshooting: [
                        `Check running processes: lsof -i :${config.port}`,
                        `Kill process: kill -9 <PID>`,
                        `Use different port: PORT=3001 npm run dev`
                    ],
                    action: 'dev_server_port_conflict'
                });
            } else if (serverError.code === 'EACCES') {
                logger.error('Permission denied - insufficient privileges to bind to port', {
                    port: config.port,
                    suggestion: config.port < 1024 ? 
                        'Use port >= 1024 or run with elevated privileges' : 
                        'Check file system permissions',
                    troubleshooting: [
                        'Use port >= 1024 for non-privileged binding',
                        'Check directory permissions for application files',
                        'Verify user has permission to bind to network interfaces'
                    ],
                    action: 'dev_server_permission_error'
                });
            }

            // Exit with error code 1 to indicate startup failure
            logger.error('Development server startup failed, exiting process', {
                exitCode: 1,
                pid: process.pid,
                action: 'dev_server_exit_error'
            });
            process.exit(1);
        });

        // Handle successful connection events for development feedback
        server.on('connection', (socket) => {
            logger.info('New client connection established', {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                localAddress: socket.localAddress,
                localPort: socket.localPort,
                action: 'dev_server_connection'
            });
        });

        // Log development server initialization completion
        logger.info('Development server initialization complete', {
            status: 'running',
            port: config.port,
            environment: config.env,
            pid: process.pid,
            startupTime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            action: 'dev_server_initialization_complete'
        });

    } catch (startupError) {
        // Step 6: Handle startup errors with comprehensive logging and process exit
        // Log error details and exit with code 1 for development feedback
        logger.error('Development server startup failed', {
            error: {
                message: startupError.message,
                name: startupError.name,
                code: startupError.code,
                errno: startupError.errno,
                syscall: startupError.syscall,
                stack: startupError.stack
            },
            port: config?.port || 'unknown',
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            action: 'dev_server_startup_failed'
        });

        // Provide development-specific troubleshooting guidance
        logger.error('Development server troubleshooting guidance', {
            commonIssues: [
                'Port already in use by another process',
                'Invalid configuration in environment variables',
                'Missing or corrupted application files',
                'Insufficient system permissions'
            ],
            debuggingSteps: [
                'Check server configuration and environment variables',
                'Verify port availability and process permissions',
                'Review application file structure and imports',
                'Check system resources and memory availability'
            ],
            action: 'dev_server_troubleshooting'
        });

        // Exit with error code 1 to indicate development server startup failure
        // This ensures proper error propagation for development tools and CI/CD
        process.exit(1);
    }
}

// Handle unhandled promise rejections specifically for development server
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection in development server', {
        reason: reason instanceof Error ? {
            message: reason.message,
            name: reason.name,
            stack: reason.stack
        } : reason,
        promise: promise.toString(),
        pid: process.pid,
        uptime: process.uptime(),
        action: 'dev_server_unhandled_rejection'
    });

    // For development, log the rejection but don't exit immediately
    // This allows for better debugging and development workflows
    logger.warn('Continuing development server operation despite unhandled rejection', {
        action: 'dev_server_continue_after_rejection'
    });
});

// Handle uncaught exceptions specifically for development server
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in development server', {
        error: {
            message: error.message,
            name: error.name,
            stack: error.stack
        },
        pid: process.pid,
        uptime: process.uptime(),
        action: 'dev_server_uncaught_exception'
    });

    // For uncaught exceptions, initiate graceful shutdown
    logger.error('Initiating emergency shutdown due to uncaught exception', {
        action: 'dev_server_emergency_shutdown'
    });

    // Attempt graceful shutdown with timeout
    setTimeout(() => {
        logger.error('Emergency shutdown timeout - forcing process exit', {
            action: 'dev_server_forced_exit'
        });
        process.exit(1);
    }, 5000);

    // If server exists, close it gracefully
    if (server) {
        server.close(() => {
            logger.info('Development server closed after uncaught exception', {
                action: 'dev_server_closed_after_exception'
            });
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

// Execute the development server startup if this file is run directly
// This enables both direct execution and module import for testing
if (require.main === module) {
    // Log development server script execution
    logger.info('Development server script starting execution', {
        script: __filename,
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        action: 'dev_script_execution_start'
    });

    // Start the development server with comprehensive error handling
    startDevServer().catch((error) => {
        // Final error handler for the development server startup
        logger.error('Fatal error in development server startup', {
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            },
            pid: process.pid,
            action: 'dev_server_fatal_error'
        });

        // Exit with error code 1 to indicate development server failure
        process.exit(1);
    });
}

// Export the development server function for testing and integration
// This enables unit testing and integration with other development tools
module.exports = {
    startDevServer,
    server,
    config
};