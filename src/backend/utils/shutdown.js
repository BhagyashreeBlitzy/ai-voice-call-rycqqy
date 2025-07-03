// Node.js built-in modules for process management and signal handling
const process = require('process'); // Built-in Node.js module

// Internal imports for logging and error handling
const { logger } = require('./logger.js');
const { AppError } = require('./errors.js');

// Global constants for shutdown configuration
const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'];
const SHUTDOWN_TIMEOUT_MS = 30000; // 30 seconds default timeout
let shutdownInitiated = false;

/**
 * Initiates a graceful shutdown of the HTTP server and application
 * Stops accepting new connections, waits for active requests to complete,
 * releases resources, logs all events, and exits the process
 * 
 * @param {object} server - HTTP server instance (required)
 * @param {object} [options] - Optional configuration object
 * @param {number} [options.timeoutMs=30000] - Shutdown timeout in milliseconds
 * @param {object} [options.logger] - Custom logger instance (defaults to centralized logger)
 * @param {function} [options.onShutdown] - Callback function for custom cleanup logic
 * @returns {Promise<void>} Resolves when shutdown is complete and process is exited
 */
async function shutdown(server, options = {}) {
    // Extract options with defaults
    const {
        timeoutMs = SHUTDOWN_TIMEOUT_MS,
        logger: customLogger = logger,
        onShutdown = null
    } = options;

    // Check if shutdown has already been initiated to prevent duplicate shutdowns
    if (shutdownInitiated) {
        customLogger.warn('Shutdown already in progress, ignoring duplicate shutdown request');
        return;
    }

    // Set shutdown flag to prevent duplicate shutdowns
    shutdownInitiated = true;

    // Record shutdown start time for duration tracking
    const shutdownStartTime = Date.now();

    try {
        // Log shutdown initiation with timestamp and reason
        customLogger.info('Graceful shutdown initiated', {
            timestamp: new Date().toISOString(),
            timeoutMs,
            reason: 'Manual shutdown or signal received'
        });

        // Stop accepting new connections on the server
        customLogger.info('Stopping server from accepting new connections');
        server.close();

        // Set up shutdown timeout to force exit if shutdown takes too long
        const shutdownTimeout = setTimeout(() => {
            customLogger.error('Shutdown timeout reached, forcing process exit', {
                timeoutMs,
                duration: Date.now() - shutdownStartTime
            });
            process.exit(1);
        }, timeoutMs);

        // Wait for all active connections/requests to complete
        await new Promise((resolve, reject) => {
            // Handle server close event when all connections are closed
            server.on('close', () => {
                customLogger.info('Server closed, all connections terminated');
                resolve();
            });

            // Handle server close errors
            server.on('error', (err) => {
                customLogger.error('Error occurred during server close', {
                    error: err.message,
                    stack: err.stack
                });
                reject(err);
            });

            // If server is not actively closing, resolve immediately
            if (!server.listening) {
                resolve();
            }
        });

        // Clear the shutdown timeout since we completed gracefully
        clearTimeout(shutdownTimeout);

        // Execute custom shutdown callback if provided
        if (onShutdown && typeof onShutdown === 'function') {
            customLogger.info('Executing custom shutdown callback');
            try {
                await onShutdown();
                customLogger.info('Custom shutdown callback completed successfully');
            } catch (callbackError) {
                customLogger.error('Error in custom shutdown callback', {
                    error: callbackError.message,
                    stack: callbackError.stack
                });
                // Continue with shutdown even if callback fails
            }
        }

        // Calculate and log shutdown completion with duration
        const shutdownDuration = Date.now() - shutdownStartTime;
        customLogger.info('Graceful shutdown completed successfully', {
            duration: shutdownDuration,
            timestamp: new Date().toISOString()
        });

        // Exit the process with success code
        process.exit(0);

    } catch (error) {
        // Log shutdown error with full details
        customLogger.error('Error occurred during graceful shutdown', {
            error: error.message,
            stack: error.stack,
            duration: Date.now() - shutdownStartTime
        });

        // Wrap the error in AppError for consistency
        const shutdownError = new AppError(
            `Shutdown failed: ${error.message}`,
            500,
            { originalError: error.name, shutdownDuration: Date.now() - shutdownStartTime }
        );

        // Log the wrapped error
        customLogger.error('Wrapped shutdown error', {
            appError: shutdownError.toJSON(),
            stack: shutdownError.stack
        });

        // Exit with failure code
        process.exit(1);
    }
}

/**
 * Registers process signal handlers (SIGTERM, SIGINT) to automatically trigger
 * graceful shutdown when the process receives a termination signal
 * Ensures only one shutdown is performed and logs all signal events
 * 
 * @param {object} server - HTTP server instance (required)
 * @param {object} [options] - Optional configuration object
 * @param {number} [options.timeoutMs=30000] - Shutdown timeout in milliseconds
 * @param {object} [options.logger] - Custom logger instance (defaults to centralized logger)
 * @param {function} [options.onShutdown] - Callback function for custom cleanup logic
 * @returns {void} No return value. Registers signal handlers on the process
 */
function setupShutdownHooks(server, options = {}) {
    // Extract options with defaults
    const {
        timeoutMs = SHUTDOWN_TIMEOUT_MS,
        logger: customLogger = logger,
        onShutdown = null
    } = options;

    // Register signal handlers for each shutdown signal
    SHUTDOWN_SIGNALS.forEach(signal => {
        process.on(signal, () => {
            // Log the received signal
            customLogger.info(`Received ${signal} signal, initiating graceful shutdown`, {
                signal,
                timestamp: new Date().toISOString(),
                pid: process.pid
            });

            // Check if shutdown has already been initiated
            if (shutdownInitiated) {
                customLogger.warn(`Received ${signal} signal but shutdown already in progress`, {
                    signal,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Call the shutdown function with the provided options
            shutdown(server, {
                timeoutMs,
                logger: customLogger,
                onShutdown
            }).catch(error => {
                // This catch should not normally be reached since shutdown handles its own errors
                customLogger.error(`Unhandled error in shutdown after ${signal} signal`, {
                    error: error.message,
                    stack: error.stack,
                    signal
                });
                process.exit(1);
            });
        });
    });

    // Log that shutdown hooks have been registered
    customLogger.info('Shutdown hooks registered for process signals', {
        signals: SHUTDOWN_SIGNALS,
        pid: process.pid,
        timestamp: new Date().toISOString()
    });

    // Handle unhandled promise rejections to prevent silent failures
    process.on('unhandledRejection', (reason, promise) => {
        customLogger.error('Unhandled promise rejection detected', {
            reason: reason && reason.message ? reason.message : reason,
            stack: reason && reason.stack ? reason.stack : undefined,
            promise: promise.toString()
        });

        // Initiate graceful shutdown on unhandled promise rejection
        if (!shutdownInitiated) {
            customLogger.info('Initiating shutdown due to unhandled promise rejection');
            shutdown(server, {
                timeoutMs,
                logger: customLogger,
                onShutdown
            });
        }
    });

    // Handle uncaught exceptions to prevent silent failures
    process.on('uncaughtException', (error) => {
        customLogger.error('Uncaught exception detected', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Initiate graceful shutdown on uncaught exception
        if (!shutdownInitiated) {
            customLogger.info('Initiating shutdown due to uncaught exception');
            shutdown(server, {
                timeoutMs,
                logger: customLogger,
                onShutdown
            });
        } else {
            // If shutdown is already in progress, exit immediately
            process.exit(1);
        }
    });
}

// Export the shutdown functions for use throughout the application
module.exports = {
    shutdown,
    setupShutdownHooks
};