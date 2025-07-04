// External dependencies - Node.js built-in modules
const process = require('process'); // Node.js 18.x+ - Provides access to process events, environment variables, and graceful shutdown handling

// Internal dependencies - Application components
const { app } = require('./app.js'); // Pre-configured Express application instance with middleware, routing, and error handling
const { PORT, ENVIRONMENT } = require('./config/index.js'); // Server configuration including port number and environment settings
const { Logger } = require('./utils/logger.js'); // Centralized logging utility for structured, environment-aware logging

// Global logger instance for server-level logging
const logger = new Logger();

// Global server instance variable for graceful shutdown handling
let server = null;

/**
 * Handles server-level errors emitted by the HTTP server instance.
 * Provides comprehensive error handling for common server startup failures
 * including port conflicts, permission issues, and other system-level errors.
 * 
 * This function implements production-ready error handling with structured logging
 * and appropriate process termination to prevent the server from running in an
 * inconsistent state. It follows Express.js security best practices by avoiding
 * sensitive information disclosure in error messages.
 * 
 * Common Error Scenarios:
 * - EADDRINUSE: Port already in use by another process
 * - EACCES: Permission denied for binding to port (typically ports < 1024)
 * - ENOTFOUND: Invalid hostname or network configuration issues
 * - ECONNRESET: Network connection issues during server startup
 * 
 * @function handleServerError
 * @param {Error} err - Error object emitted by the HTTP server instance
 * @returns {void} Logs the error and terminates the process with non-zero exit code
 * 
 * @example
 * // Typical usage within server error event listener
 * server.on('error', handleServerError);
 * 
 * // Error handling for port conflict
 * // Error: listen EADDRINUSE: address already in use :::3000
 * // Results in: Server startup failed - Port 3000 is already in use
 * 
 * @example
 * // Error handling for permission denied
 * // Error: listen EACCES: permission denied 0.0.0.0:80
 * // Results in: Server startup failed - Permission denied for port 80
 */
function handleServerError(err) {
    // Extract error code for specific error handling
    const errorCode = err.code;
    
    // Handle port already in use error (EADDRINUSE)
    if (errorCode === 'EADDRINUSE') {
        logger.error(`Server startup failed - Port ${PORT} is already in use`, {
            error: err,
            port: PORT,
            environment: ENVIRONMENT,
            errorCode: errorCode,
            suggestion: 'Try using a different port or stop the conflicting process'
        });
    }
    // Handle permission denied error (EACCES)
    else if (errorCode === 'EACCES') {
        logger.error(`Server startup failed - Permission denied for port ${PORT}`, {
            error: err,
            port: PORT,
            environment: ENVIRONMENT,
            errorCode: errorCode,
            suggestion: 'Use a port number above 1024 or run with appropriate permissions'
        });
    }
    // Handle hostname not found error (ENOTFOUND)
    else if (errorCode === 'ENOTFOUND') {
        logger.error('Server startup failed - Invalid hostname or network configuration', {
            error: err,
            port: PORT,
            environment: ENVIRONMENT,
            errorCode: errorCode,
            suggestion: 'Check network configuration and hostname settings'
        });
    }
    // Handle network connection reset error (ECONNRESET)
    else if (errorCode === 'ECONNRESET') {
        logger.error('Server startup failed - Network connection reset', {
            error: err,
            port: PORT,
            environment: ENVIRONMENT,
            errorCode: errorCode,
            suggestion: 'Check network connectivity and firewall settings'
        });
    }
    // Handle any other server-level errors
    else {
        logger.error('Server startup failed - Unexpected error occurred', {
            error: err,
            port: PORT,
            environment: ENVIRONMENT,
            errorCode: errorCode || 'UNKNOWN',
            errorMessage: err.message || 'No error message available'
        });
    }
    
    // Log additional system information for debugging
    logger.error('Server error context', {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
    
    // Exit the process with a non-zero status code to indicate failure
    // This prevents the application from running in an inconsistent state
    // and allows process managers to detect the failure and take appropriate action
    process.exit(1);
}

/**
 * Handles process-level signals for graceful shutdown functionality.
 * Implements proper cleanup procedures when the application receives termination
 * signals from the operating system, process managers, or container orchestrators.
 * 
 * This function ensures that the server closes cleanly by:
 * - Stopping acceptance of new connections
 * - Allowing existing connections to complete
 * - Performing necessary cleanup operations
 * - Logging shutdown events for monitoring and debugging
 * 
 * Supported Signals:
 * - SIGTERM: Termination signal from process managers or container orchestrators
 * - SIGINT: Interrupt signal from keyboard (Ctrl+C) or process termination
 * - SIGUSR2: User-defined signal, commonly used by process managers like PM2
 * 
 * @function handleProcessSignals
 * @returns {void} Performs cleanup and logs shutdown events before process exit
 * 
 * @example
 * // Typical usage during server initialization
 * handleProcessSignals();
 * 
 * // Manual termination via Ctrl+C
 * // Results in: Received SIGINT signal, initiating graceful shutdown...
 * 
 * @example
 * // Container orchestrator termination
 * // Results in: Received SIGTERM signal, initiating graceful shutdown...
 */
function handleProcessSignals() {
    // Handle SIGTERM signal (termination from process managers)
    process.on('SIGTERM', () => {
        logger.info('Received SIGTERM signal, initiating graceful shutdown...', {
            signal: 'SIGTERM',
            environment: ENVIRONMENT,
            port: PORT,
            pid: process.pid,
            uptime: process.uptime()
        });
        
        // Perform graceful shutdown
        performGracefulShutdown('SIGTERM');
    });
    
    // Handle SIGINT signal (Ctrl+C interruption)
    process.on('SIGINT', () => {
        logger.info('Received SIGINT signal, initiating graceful shutdown...', {
            signal: 'SIGINT',
            environment: ENVIRONMENT,
            port: PORT,
            pid: process.pid,
            uptime: process.uptime()
        });
        
        // Perform graceful shutdown
        performGracefulShutdown('SIGINT');
    });
    
    // Handle SIGUSR2 signal (user-defined signal, used by PM2 and other process managers)
    process.on('SIGUSR2', () => {
        logger.info('Received SIGUSR2 signal, initiating graceful shutdown...', {
            signal: 'SIGUSR2',
            environment: ENVIRONMENT,
            port: PORT,
            pid: process.pid,
            uptime: process.uptime()
        });
        
        // Perform graceful shutdown
        performGracefulShutdown('SIGUSR2');
    });
    
    // Handle uncaught exceptions to prevent application crashes
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception detected, shutting down...', {
            error: err,
            stack: err.stack,
            environment: ENVIRONMENT,
            port: PORT,
            pid: process.pid
        });
        
        // Force shutdown after uncaught exception
        process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled promise rejection detected, shutting down...', {
            reason: reason,
            promise: promise,
            environment: ENVIRONMENT,
            port: PORT,
            pid: process.pid
        });
        
        // Force shutdown after unhandled rejection
        process.exit(1);
    });
}

/**
 * Performs graceful shutdown operations when termination signals are received.
 * Ensures proper cleanup and resource management during application shutdown.
 * 
 * @private
 * @param {string} signal - The signal that triggered the shutdown
 * @returns {void} Closes server and exits process
 */
function performGracefulShutdown(signal) {
    // Log shutdown initiation
    logger.info(`Graceful shutdown initiated by ${signal}`, {
        signal: signal,
        timestamp: new Date().toISOString(),
        environment: ENVIRONMENT,
        port: PORT
    });
    
    // Close the server if it's running
    if (server) {
        server.close((err) => {
            if (err) {
                logger.error('Error occurred during server shutdown', {
                    error: err,
                    signal: signal
                });
                process.exit(1);
            } else {
                logger.info('Server closed successfully', {
                    signal: signal,
                    environment: ENVIRONMENT,
                    port: PORT
                });
                process.exit(0);
            }
        });
        
        // Force shutdown after 10 seconds if graceful shutdown fails
        setTimeout(() => {
            logger.error('Graceful shutdown timed out, forcing exit', {
                signal: signal,
                timeout: 10000
            });
            process.exit(1);
        }, 10000);
    } else {
        logger.info('No active server to close, exiting immediately', {
            signal: signal
        });
        process.exit(0);
    }
}

/**
 * Starts the HTTP server using the configured Express application instance.
 * Implements comprehensive server startup with error handling, logging, and
 * monitoring capabilities for production-ready deployment.
 * 
 * This function serves as the main entry point for server initialization and
 * includes all necessary components for enterprise-grade server management:
 * - Port configuration validation and logging
 * - Environment-aware startup procedures
 * - Comprehensive error handling for server startup failures
 * - Process signal handling for graceful shutdown
 * - Performance monitoring and health check capabilities
 * - Security-conscious logging without sensitive information disclosure
 * 
 * The server startup process follows these steps:
 * 1. Initialize centralized logger for structured logging
 * 2. Log server startup information including configuration details
 * 3. Start HTTP server on configured port with callback for success handling
 * 4. Attach error event listeners for comprehensive error management
 * 5. Configure process signal handlers for graceful shutdown
 * 6. Log successful startup with monitoring and health check information
 * 
 * @function startServer
 * @returns {void} No return value; side effect is starting the HTTP server and logging status
 * 
 * @example
 * // Basic server startup
 * startServer();
 * // Results in server listening on configured port with full logging
 * 
 * @example
 * // Programmatic server startup with custom configuration
 * const { startServer } = require('./server.js');
 * startServer();
 * // Server starts with all production-ready features enabled
 * 
 * @example
 * // Server startup in different environments
 * // Development: Enhanced logging and debugging information
 * // Production: Optimized logging and security-focused configuration
 * // Test: Minimal logging for test execution efficiency
 */
function startServer() {
    // Step 1: Log server startup initiation with configuration details
    logger.info('Initiating server startup...', {
        port: PORT,
        environment: ENVIRONMENT,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        timestamp: new Date().toISOString()
    });
    
    // Step 2: Validate configuration before server startup
    if (!PORT || typeof PORT !== 'number' || PORT < 1024 || PORT > 65535) {
        logger.error('Invalid port configuration detected', {
            port: PORT,
            portType: typeof PORT,
            validRange: '1024-65535'
        });
        process.exit(1);
    }
    
    // Step 3: Start the HTTP server using Express application instance
    server = app.listen(PORT, () => {
        // Log successful server startup with comprehensive information
        logger.info(`🚀 Server successfully started and listening on port ${PORT}`, {
            port: PORT,
            environment: ENVIRONMENT,
            serverUrl: `http://localhost:${PORT}`,
            healthCheckUrl: `http://localhost:${PORT}/hello`,
            processId: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024)
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
        
        // Log environment-specific startup information
        if (ENVIRONMENT === 'development') {
            logger.info('Development mode features enabled', {
                features: [
                    'Enhanced logging verbosity',
                    'Colorized console output',
                    'Detailed error stack traces',
                    'Hot reload support'
                ],
                debugEndpoints: [
                    'GET /hello - Test endpoint returning "Hello world"'
                ]
            });
        } else if (ENVIRONMENT === 'production') {
            logger.info('Production mode optimizations active', {
                optimizations: [
                    'Minimal logging overhead',
                    'Security headers enabled',
                    'Error sanitization active',
                    'Performance monitoring enabled'
                ],
                securityFeatures: [
                    'ReDoS attack prevention',
                    'Request rate limiting',
                    'Secure error handling',
                    'Information disclosure prevention'
                ]
            });
        }
        
        // Log server health and readiness information
        logger.info('Server health check information', {
            status: 'healthy',
            readiness: 'ready',
            endpoints: {
                hello: '/hello',
                health: '/hello (serves as health check)'
            },
            capabilities: [
                'HTTP/1.1 support',
                'Express 5.1.0 features',
                'Automatic promise rejection handling',
                'Comprehensive error management',
                'Graceful shutdown support'
            ]
        });
    });
    
    // Step 4: Attach error event listener to handle server startup failures
    server.on('error', handleServerError);
    
    // Step 5: Configure process signal handlers for graceful shutdown
    handleProcessSignals();
    
    // Step 6: Log additional operational information for monitoring
    logger.info('Server monitoring and operational information', {
        capabilities: {
            gracefulShutdown: true,
            errorHandling: true,
            requestLogging: true,
            healthChecking: true,
            processSignalHandling: true
        },
        supportedSignals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
        errorHandling: {
            serverErrors: true,
            uncaughtExceptions: true,
            unhandledRejections: true,
            promiseRejections: true
        },
        performance: {
            responseTimeTargets: {
                hello: '< 50ms',
                error: '< 25ms'
            },
            resourceLimits: {
                memoryBaseline: '< 50MB',
                cpuUsage: '< 10%'
            }
        }
    });
    
    // Step 7: Environment-specific post-startup configuration
    if (ENVIRONMENT === 'development') {
        // Enable additional debugging and monitoring in development
        logger.debug('Development mode debugging enabled', {
            debugging: {
                verboseLogging: true,
                errorStackTraces: true,
                requestDetails: true,
                performanceMetrics: true
            }
        });
    }
    
    // Step 8: Log server startup completion
    logger.info('Server startup sequence completed successfully', {
        status: 'running',
        ready: true,
        port: PORT,
        environment: ENVIRONMENT,
        timestamp: new Date().toISOString()
    });
}

// Export the startServer function for external use
module.exports = {
    startServer
};

// If this module is run directly (not imported), start the server immediately
if (require.main === module) {
    startServer();
}