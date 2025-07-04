// External dependencies
const dotenv = require('dotenv'); // ^16.0.0 - Loads environment variables from .env files for configuration management in development and CI/CD
const http = require('node:http'); // builtin - Node.js built-in HTTP module used to create the HTTP server instance for advanced control and future extensibility
const process = require('node:process'); // builtin - Node.js process object for handling process-level events (uncaughtException, unhandledRejection, SIGTERM, etc.)

// Internal dependencies
const { app } = require('../app.js'); // Configured Express application instance, ready to be passed to the HTTP server
const { PORT, ENVIRONMENT, validatePort } = require('../config/index.js'); // Port number, environment mode, and port validation function from centralized configuration
const { Logger } = require('../utils/logger.js'); // Centralized, environment-aware logger for structured logging of server events, errors, and system messages

// Global variables for server management and observability
const logger = new Logger(); // Initialize logger instance for all startup, shutdown, and error logging
let server = null; // HTTP server instance for graceful shutdown handling

/**
 * Loads environment variables from a .env file using dotenv, if present.
 * Ensures configuration is available before server startup.
 * 
 * This function configures dotenv to load environment variables from the .env file
 * in the project root. It's essential for development environments where environment
 * variables need to be loaded from files rather than system environment.
 * 
 * @function loadEnvironment
 * @returns {void} Loads environment variables into process.env
 * 
 * @example
 * // Load environment variables before server startup
 * loadEnvironment();
 * console.log(process.env.PORT); // Now available if set in .env file
 * 
 * @example
 * // .env file content:
 * // PORT=8080
 * // NODE_ENV=development
 * // LOG_LEVEL=debug
 * loadEnvironment();
 * // Environment variables are now available in process.env
 */
function loadEnvironment() {
    try {
        // Import and configure dotenv to load variables from .env file
        // dotenv.config() attempts to load .env file from current working directory
        const result = dotenv.config();
        
        // Check if .env file was loaded successfully
        if (result.error) {
            // Log informational message if .env file is not found (common in production)
            if (result.error.code === 'ENOENT') {
                logger.info('No .env file found, using system environment variables');
            } else {
                // Log warning for other .env loading errors
                logger.warn('Error loading .env file', { error: result.error.message });
            }
        } else {
            // Log successful .env file loading in development mode
            if (ENVIRONMENT === 'development') {
                logger.info('Environment variables loaded from .env file');
            }
        }
    } catch (error) {
        // Handle any unexpected errors during environment loading
        logger.error('Failed to load environment variables', { error: error.message });
        // Continue execution as environment loading failure shouldn't prevent startup
    }
}

/**
 * Validates the configured port, starts the HTTP server, and logs startup information.
 * Handles errors during server startup (such as EADDRINUSE) and ensures robust initialization.
 * 
 * This function implements comprehensive server startup with validation, error handling,
 * and proper logging. It creates the HTTP server instance, starts listening on the
 * validated port, and sets up event handlers for server lifecycle management.
 * 
 * @function startServer
 * @returns {void} Starts the HTTP server and logs startup status
 * 
 * @example
 * // Start server with default configuration
 * startServer();
 * // Server starts listening on configured port
 * 
 * @example
 * // Server startup with error handling
 * try {
 *     startServer();
 * } catch (error) {
 *     console.error('Server startup failed:', error);
 * }
 */
function startServer() {
    try {
        // Step 1: Validate the configured port using validatePort function
        logger.info('Validating server configuration', { port: PORT, environment: ENVIRONMENT });
        
        if (!validatePort(PORT)) {
            // Log critical error for invalid port configuration
            logger.error('Invalid port configuration', { 
                port: PORT, 
                validRange: '1024-65535',
                environment: ENVIRONMENT 
            });
            
            // Exit process with non-zero code to indicate configuration failure
            process.exit(1);
        }
        
        logger.info('Port validation successful', { port: PORT });
        
        // Step 2: Create the HTTP server instance using http.createServer with Express app
        logger.info('Creating HTTP server instance');
        server = http.createServer(app);
        
        // Step 3: Configure server event handlers before starting to listen
        
        // Handle successful server startup
        server.on('listening', () => {
            const address = server.address();
            const bindAddress = typeof address === 'string' ? address : `port ${address.port}`;
            
            logger.info('Server startup successful', {
                port: PORT,
                environment: ENVIRONMENT,
                bindAddress: bindAddress,
                nodeVersion: process.version,
                platform: process.platform,
                pid: process.pid,
                uptime: process.uptime()
            });
            
            // Log additional startup information in development mode
            if (ENVIRONMENT === 'development') {
                logger.info('Development server ready', {
                    url: `http://localhost:${PORT}`,
                    endpoints: ['/hello'],
                    hotReload: 'enabled with nodemon'
                });
            }
        });
        
        // Handle server startup errors
        server.on('error', (error) => {
            logger.error('Server startup error', { error: error.message, code: error.code });
            
            // Handle specific error conditions with appropriate responses
            switch (error.code) {
                case 'EADDRINUSE':
                    logger.error('Port already in use', { 
                        port: PORT,
                        message: `Port ${PORT} is already in use. Please choose a different port or stop the conflicting service.`,
                        suggestion: 'Try setting PORT environment variable to a different value'
                    });
                    break;
                    
                case 'EACCES':
                    logger.error('Permission denied', { 
                        port: PORT,
                        message: `Permission denied to bind to port ${PORT}. Ports below 1024 require root privileges.`,
                        suggestion: 'Use a port above 1024 or run with appropriate privileges'
                    });
                    break;
                    
                case 'ENOTFOUND':
                    logger.error('Address not found', { 
                        message: 'The specified address could not be found',
                        suggestion: 'Check network configuration and address binding'
                    });
                    break;
                    
                default:
                    logger.error('Unknown server error', { 
                        code: error.code,
                        message: error.message,
                        stack: error.stack
                    });
                    break;
            }
            
            // Exit process with non-zero code to indicate startup failure
            process.exit(1);
        });
        
        // Handle client connections for monitoring
        server.on('connection', (socket) => {
            if (ENVIRONMENT === 'development') {
                logger.debug('Client connection established', { 
                    remoteAddress: socket.remoteAddress,
                    remotePort: socket.remotePort
                });
            }
        });
        
        // Step 4: Start the server listening on the validated port
        logger.info('Starting HTTP server', { port: PORT });
        server.listen(PORT);
        
    } catch (error) {
        // Handle any unexpected errors during server startup
        logger.error('Unexpected error during server startup', { 
            error: error.message, 
            stack: error.stack 
        });
        
        // Exit process with non-zero code to indicate startup failure
        process.exit(1);
    }
}

/**
 * Registers handlers for process-level events such as uncaughtException, unhandledRejection,
 * and SIGTERM/SIGINT. Ensures all fatal errors are logged and the process exits gracefully.
 * 
 * This function implements comprehensive process event handling to ensure robust error
 * management and graceful shutdown. It handles both fatal errors and termination signals
 * to maintain application stability and proper cleanup.
 * 
 * @function handleProcessEvents
 * @returns {void} Sets up process event listeners for robust error handling and graceful shutdown
 * 
 * @example
 * // Set up process event handlers before server startup
 * handleProcessEvents();
 * // Process events are now monitored and handled appropriately
 * 
 * @example
 * // Handle shutdown signals
 * handleProcessEvents();
 * // SIGTERM and SIGINT will trigger graceful shutdown
 */
function handleProcessEvents() {
    // Handle uncaught exceptions - these are fatal errors that weren't caught
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception occurred', {
            error: error.message,
            stack: error.stack,
            type: 'uncaughtException',
            fatal: true
        });
        
        // Log system state for debugging
        logger.error('System state at crash', {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version
        });
        
        // Perform graceful shutdown if server is running
        if (server) {
            logger.info('Attempting graceful shutdown due to uncaught exception');
            server.close(() => {
                logger.info('Server closed due to uncaught exception');
                process.exit(1);
            });
            
            // Force exit after timeout if graceful shutdown fails
            setTimeout(() => {
                logger.error('Forced exit due to shutdown timeout');
                process.exit(1);
            }, 5000);
        } else {
            // Exit immediately if server is not running
            process.exit(1);
        }
    });
    
    // Handle unhandled promise rejections - these indicate missing error handling
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled promise rejection', {
            reason: reason instanceof Error ? reason.message : reason,
            stack: reason instanceof Error ? reason.stack : undefined,
            promise: promise.toString(),
            type: 'unhandledRejection',
            fatal: true
        });
        
        // Log system state for debugging
        logger.error('System state at rejection', {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            pid: process.pid
        });
        
        // Perform graceful shutdown if server is running
        if (server) {
            logger.info('Attempting graceful shutdown due to unhandled promise rejection');
            server.close(() => {
                logger.info('Server closed due to unhandled promise rejection');
                process.exit(1);
            });
            
            // Force exit after timeout if graceful shutdown fails
            setTimeout(() => {
                logger.error('Forced exit due to shutdown timeout');
                process.exit(1);
            }, 5000);
        } else {
            // Exit immediately if server is not running
            process.exit(1);
        }
    });
    
    // Handle SIGTERM signal (graceful shutdown request from process manager)
    process.on('SIGTERM', () => {
        logger.info('SIGTERM signal received, initiating graceful shutdown', {
            signal: 'SIGTERM',
            uptime: process.uptime(),
            pid: process.pid
        });
        
        gracefulShutdown('SIGTERM');
    });
    
    // Handle SIGINT signal (Ctrl+C in terminal)
    process.on('SIGINT', () => {
        logger.info('SIGINT signal received, initiating graceful shutdown', {
            signal: 'SIGINT',
            uptime: process.uptime(),
            pid: process.pid
        });
        
        gracefulShutdown('SIGINT');
    });
    
    // Handle process warnings (useful for debugging)
    process.on('warning', (warning) => {
        logger.warn('Process warning', {
            name: warning.name,
            message: warning.message,
            stack: warning.stack
        });
    });
    
    // Handle process exit event for final cleanup
    process.on('exit', (code) => {
        logger.info('Process exiting', {
            exitCode: code,
            uptime: process.uptime(),
            pid: process.pid
        });
    });
}

/**
 * Performs graceful shutdown of the HTTP server and process.
 * Ensures proper cleanup and resource disposal before process termination.
 * 
 * @private
 * @param {string} signal - The signal that triggered the shutdown
 * @returns {void} Performs graceful shutdown sequence
 */
function gracefulShutdown(signal) {
    logger.info('Starting graceful shutdown sequence', { signal });
    
    if (server) {
        // Stop accepting new connections
        server.close((error) => {
            if (error) {
                logger.error('Error during server shutdown', { error: error.message });
            } else {
                logger.info('HTTP server closed successfully');
            }
            
            // Log final system statistics
            logger.info('Shutdown complete', {
                signal,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                pid: process.pid
            });
            
            // Exit gracefully
            process.exit(0);
        });
        
        // Force exit after timeout if graceful shutdown fails
        setTimeout(() => {
            logger.error('Graceful shutdown timeout exceeded, forcing exit');
            process.exit(1);
        }, 10000);
    } else {
        // Exit immediately if server is not running
        logger.info('No server to shutdown, exiting immediately');
        process.exit(0);
    }
}

/**
 * Main startup sequence orchestrating environment loading, process event handling,
 * and server startup. This function coordinates the entire application initialization.
 * 
 * @function main
 * @returns {void} Executes the complete startup sequence
 * 
 * @example
 * // Start the complete application
 * main();
 * // All initialization steps are executed in proper order
 */
function main() {
    try {
        // Log startup initiation
        logger.info('Initializing Node.js tutorial backend server', {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            pid: process.pid,
            environment: ENVIRONMENT,
            port: PORT
        });
        
        // Step 1: Load environment variables from .env file if present
        logger.info('Step 1: Loading environment variables');
        loadEnvironment();
        
        // Step 2: Set up process-level event handlers for robust error handling
        logger.info('Step 2: Setting up process event handlers');
        handleProcessEvents();
        
        // Step 3: Start the HTTP server with comprehensive error handling
        logger.info('Step 3: Starting HTTP server');
        startServer();
        
        // Log successful initialization
        logger.info('Server initialization completed successfully', {
            environment: ENVIRONMENT,
            port: PORT,
            processId: process.pid,
            startupTime: new Date().toISOString()
        });
        
    } catch (error) {
        // Handle any unexpected errors during startup
        logger.error('Fatal error during server initialization', {
            error: error.message,
            stack: error.stack,
            phase: 'initialization'
        });
        
        // Exit with non-zero code to indicate startup failure
        process.exit(1);
    }
}

// Export the startServer function for testability and advanced integration scenarios
module.exports = {
    startServer,
    loadEnvironment,
    handleProcessEvents
};

// Execute main startup sequence if this file is run directly
// This allows the script to be imported for testing or executed directly
if (require.main === module) {
    main();
}