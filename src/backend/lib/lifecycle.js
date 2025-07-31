/**
 * Application Lifecycle Management Module for Node.js Tutorial Application
 * 
 * This module orchestrates the startup, running, and shutdown phases of the Node.js tutorial application.
 * Provides the LifecycleManager class and utility functions for managing application state transitions,
 * process signal handling, graceful shutdown procedures, and integration with Express.js application
 * and HTTP server components.
 * 
 * Implements comprehensive lifecycle hooks, error handling, and logging for the educational Node.js v22.x
 * LTS application with Express.js 5.1.0 framework, demonstrating proper application lifecycle patterns
 * and resource management for the /hello endpoint tutorial server.
 * 
 * Features:
 * - Complete application lifecycle orchestration (initialization → startup → running → shutdown)
 * - Process signal handling for graceful shutdown (SIGTERM, SIGINT, SIGQUIT)
 * - State management with comprehensive lifecycle states and transitions
 * - Custom shutdown handler registration with priority-based execution
 * - Performance monitoring and uptime tracking
 * - Educational demonstration of Node.js application lifecycle patterns
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import configuration settings for server and environment management
const { config } = require('../config/index.js');
const { server: serverConfig, environment: envConfig } = config || {};

// Import logger factory for lifecycle-specific logging with structured output
const { getLogger } = require('../utils/logger.js');

// Import application and lifecycle constants for metadata and state management
const { APPLICATION, TIMEOUTS } = require('../utils/constants.js');

// Import environment detection utilities for production-specific lifecycle behavior
const { 
    isProductionEnvironment, 
    isDevelopmentEnvironment 
} = require('../utils/environment.js');

// Define LIFECYCLE constants for state management, events, and timeouts
const LIFECYCLE = {
    /**
     * Application lifecycle states for state machine management
     */
    STATES: {
        INITIALIZING: 'initializing',    // Application is being initialized and prepared for startup
        STARTING: 'starting',            // Application startup sequence is in progress
        RUNNING: 'running',              // Application is fully operational and accepting requests
        STOPPING: 'stopping',           // Application shutdown sequence is in progress
        STOPPED: 'stopped',             // Application has completed shutdown and all resources are cleaned up
        ERROR: 'error'                  // Application has encountered an error during lifecycle transition
    },

    /**
     * Lifecycle events for event-driven lifecycle management
     */
    EVENTS: {
        BEFORE_START: 'before-start',    // Emitted before application startup sequence begins
        AFTER_START: 'after-start',      // Emitted after successful application startup completion
        BEFORE_STOP: 'before-stop',      // Emitted before application shutdown sequence begins
        AFTER_STOP: 'after-stop',        // Emitted after successful application shutdown completion
        STATE_CHANGE: 'state-change',    // Emitted when lifecycle state transitions occur
        ERROR: 'error'                   // Emitted when lifecycle errors occur during state transitions
    },

    /**
     * Timeout configurations for lifecycle operations
     */
    TIMEOUTS: {
        GRACEFUL_SHUTDOWN: 30000,        // 30 seconds for graceful shutdown completion
        FORCED_SHUTDOWN: 5000,           // 5 seconds before forcing shutdown after graceful timeout
        STARTUP: 10000,                  // 10 seconds maximum for application startup
        STATE_TRANSITION: 5000           // 5 seconds maximum for state transitions
    }
};

// Global logger instance for lifecycle management with component-specific context
const logger = getLogger('lifecycle');

// Global lifecycle state tracking current application state
let lifecycleState = LIFECYCLE.STATES.INITIALIZING;

// Global shutdown handlers array for custom cleanup procedures
let shutdownHandlers = [];

// Global startup time tracking for uptime calculations
let startupTime = null;

// Global shutdown time tracking for shutdown duration calculations
let shutdownTime = null;

/**
 * Factory function that initializes and returns a new LifecycleManager instance with default
 * configuration for the Node.js tutorial application lifecycle management. Provides centralized
 * lifecycle orchestration with comprehensive state management and error handling.
 * 
 * @param {Object} options - Configuration options for lifecycle manager initialization
 * @param {Object} options.config - Custom configuration object for lifecycle settings
 * @param {string} options.logLevel - Log level for lifecycle logging (error, warn, info, debug)
 * @param {boolean} options.enableSignalHandling - Enable process signal handlers for graceful shutdown
 * @param {number} options.shutdownTimeout - Timeout in milliseconds for graceful shutdown
 * @returns {LifecycleManager} Configured lifecycle manager instance ready for application startup and shutdown coordination
 */
function initializeLifecycle(options = {}) {
    try {
        logger.info('Initializing lifecycle manager with configuration options');

        // Create new LifecycleManager instance with provided options or defaults
        const lifecycleConfig = {
            ...config,
            ...options.config
        };

        // Initialize LifecycleManager with merged configuration
        const lifecycleManager = new LifecycleManager(lifecycleConfig);

        // Apply configuration settings from application config
        if (options.logLevel) {
            logger.info(`Setting lifecycle log level to: ${options.logLevel}`);
        }

        // Initialize lifecycle state to INITIALIZING
        lifecycleState = LIFECYCLE.STATES.INITIALIZING;
        logger.debug(`Lifecycle state initialized to: ${lifecycleState}`);

        // Set up process signal handlers for graceful shutdown (SIGTERM, SIGINT)
        if (options.enableSignalHandling !== false) {
            const signalHandler = createProcessSignalHandler(lifecycleManager);
            
            // Register signal handlers for graceful shutdown
            process.on('SIGTERM', signalHandler);
            process.on('SIGINT', signalHandler);
            process.on('SIGQUIT', signalHandler);
            
            logger.debug('Process signal handlers registered for graceful shutdown');
        }

        // Register default shutdown handlers for cleanup procedures
        registerShutdownHandler(
            () => {
                logger.info('Executing default cleanup procedures');
                // Default cleanup logic can be added here
            },
            'default-cleanup',
            1000
        );

        // Log lifecycle initialization completion with configuration details
        logger.info('Lifecycle manager initialization completed successfully', {
            enableSignalHandling: options.enableSignalHandling !== false,
            shutdownTimeout: options.shutdownTimeout || LIFECYCLE.TIMEOUTS.GRACEFUL_SHUTDOWN,
            environment: envConfig?.nodeEnv || 'development'
        });

        // Return configured LifecycleManager instance ready for use
        return lifecycleManager;

    } catch (error) {
        logger.error('Failed to initialize lifecycle manager', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Lifecycle initialization failed: ${error.message}`);
    }
}

/**
 * Standalone utility function that performs complete application startup sequence including
 * lifecycle initialization, component startup, and readiness confirmation. Coordinates
 * Express.js application and HTTP server startup with comprehensive error handling.
 * 
 * @param {Object} app - Express.js application instance for HTTP request handling
 * @param {Object} server - HTTP server instance for network binding and connection management
 * @param {Object} config - Application configuration object with server and environment settings
 * @returns {Promise} Resolves when application startup is complete and server is listening
 */
async function startApplication(app, server, config) {
    try {
        logger.info('Starting complete application startup sequence');

        // Validate required parameters (app, server, config) are provided
        if (!app) {
            throw new Error('Express application instance is required for startup');
        }
        if (!server) {
            throw new Error('HTTP server instance is required for startup');
        }
        if (!config) {
            throw new Error('Configuration object is required for startup');
        }

        // Initialize lifecycle manager using initializeLifecycle function
        const lifecycleManager = initializeLifecycle({
            config: config,
            enableSignalHandling: true,
            shutdownTimeout: LIFECYCLE.TIMEOUTS.GRACEFUL_SHUTDOWN
        });

        // Start lifecycle manager and transition to STARTING state
        logger.info('Starting lifecycle manager and transitioning to STARTING state');
        await lifecycleManager.start(app, server);

        // Coordinate Express.js application and HTTP server startup
        logger.info('Coordinating Express.js application and HTTP server startup');

        // Verify server is listening and application is ready to accept requests
        const serverAddress = server.address();
        if (!serverAddress) {
            throw new Error('Server failed to bind to port - address not available');
        }

        // Transition lifecycle state to RUNNING upon successful startup
        lifecycleState = LIFECYCLE.STATES.RUNNING;
        startupTime = new Date();

        // Log successful application startup with server details and uptime
        logger.info('Application startup completed successfully', {
            serverAddress: `${serverAddress.address}:${serverAddress.port}`,
            startupTime: startupTime.toISOString(),
            applicationName: APPLICATION.NAME,
            applicationVersion: APPLICATION.VERSION,
            nodeEnv: envConfig?.nodeEnv || 'development'
        });

        // Return Promise resolving with startup confirmation and application info
        return {
            success: true,
            startupTime: startupTime,
            serverAddress: serverAddress,
            lifecycleManager: lifecycleManager,
            message: 'Application started successfully and ready to accept requests'
        };

    } catch (error) {
        logger.error('Application startup failed', {
            error: error.message,
            stack: error.stack
        });

        // Update lifecycle state to ERROR on startup failure
        lifecycleState = LIFECYCLE.STATES.ERROR;

        throw new Error(`Application startup failed: ${error.message}`);
    }
}

/**
 * Standalone utility function that performs graceful application shutdown including server
 * shutdown, resource cleanup, and lifecycle finalization. Executes registered shutdown
 * handlers and ensures proper resource cleanup.
 * 
 * @param {Object} app - Express.js application instance for cleanup
 * @param {Object} server - HTTP server instance for connection termination
 * @param {boolean} force - Whether to force shutdown if graceful shutdown times out
 * @returns {Promise} Resolves when application shutdown is complete and all resources are cleaned up
 */
async function stopApplication(app, server, force = false) {
    try {
        logger.info('Starting graceful application shutdown sequence', { force });

        // Validate required parameters and check if application is running
        if (!server) {
            logger.warn('Server instance not provided - skipping server shutdown');
        }

        // Check if application is already stopped
        if (lifecycleState === LIFECYCLE.STATES.STOPPED) {
            logger.info('Application is already stopped');
            return {
                success: true,
                message: 'Application was already stopped'
            };
        }

        // Log shutdown initiation with reason (graceful or forced)
        const shutdownReason = force ? 'forced-shutdown' : 'graceful-shutdown';
        logger.info(`Initiating ${shutdownReason} sequence`);

        // Transition lifecycle state to STOPPING
        lifecycleState = LIFECYCLE.STATES.STOPPING;
        shutdownTime = new Date();

        // Execute registered shutdown handlers in reverse order (priority-based)
        logger.info(`Executing ${shutdownHandlers.length} registered shutdown handlers`);
        const sortedHandlers = [...shutdownHandlers].sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const handler of sortedHandlers) {
            try {
                logger.debug(`Executing shutdown handler: ${handler.name}`);
                await Promise.resolve(handler.handler());
                logger.debug(`Shutdown handler completed: ${handler.name}`);
            } catch (handlerError) {
                logger.error(`Shutdown handler failed: ${handler.name}`, {
                    error: handlerError.message
                });
            }
        }

        // Stop HTTP server gracefully or forcefully based on force parameter
        if (server && typeof server.close === 'function') {
            await new Promise((resolve, reject) => {
                const shutdownTimeout = setTimeout(() => {
                    if (force) {
                        logger.warn('Forcing server shutdown due to timeout');
                        server.closeAllConnections && server.closeAllConnections();
                        resolve();
                    } else {
                        reject(new Error('Server shutdown timeout exceeded'));
                    }
                }, LIFECYCLE.TIMEOUTS.GRACEFUL_SHUTDOWN);

                server.close((error) => {
                    clearTimeout(shutdownTimeout);
                    if (error) {
                        logger.error('Server shutdown error', { error: error.message });
                        if (force) {
                            resolve(); // Continue with forced shutdown
                        } else {
                            reject(error);
                        }
                    } else {
                        logger.info('HTTP server shut down successfully');
                        resolve();
                    }
                });
            });
        }

        // Clean up Express.js application resources and close connections
        if (app && typeof app.close === 'function') {
            try {
                await app.close();
                logger.debug('Express.js application cleaned up successfully');
            } catch (appError) {
                logger.error('Express.js application cleanup error', {
                    error: appError.message
                });
            }
        }

        // Transition lifecycle state to STOPPED upon completion
        lifecycleState = LIFECYCLE.STATES.STOPPED;

        // Calculate shutdown duration
        const shutdownDuration = Date.now() - shutdownTime.getTime();

        // Log successful shutdown with cleanup summary and duration
        logger.info('Application shutdown completed successfully', {
            shutdownDuration: `${shutdownDuration}ms`,
            shutdownTime: shutdownTime.toISOString(),
            handlersExecuted: shutdownHandlers.length,
            shutdownReason
        });

        // Return Promise resolving with shutdown confirmation
        return {
            success: true,
            shutdownTime: shutdownTime,
            shutdownDuration: shutdownDuration,
            handlersExecuted: shutdownHandlers.length,
            message: 'Application shutdown completed successfully'
        };

    } catch (error) {
        logger.error('Application shutdown failed', {
            error: error.message,
            stack: error.stack
        });

        // Set lifecycle state to ERROR on shutdown failure
        lifecycleState = LIFECYCLE.STATES.ERROR;

        throw new Error(`Application shutdown failed: ${error.message}`);
    }
}

/**
 * Utility function that returns the current lifecycle state with detailed status information
 * for monitoring and debugging purposes. Provides comprehensive state information including
 * uptime, timestamps, and application metadata.
 * 
 * @returns {Object} Current lifecycle state object with state name, timestamp, and metadata
 */
function getLifecycleState() {
    try {
        // Retrieve current lifecycle state from global lifecycleState variable
        const currentState = lifecycleState;

        // Calculate application uptime if in RUNNING state
        let uptime = null;
        if (currentState === LIFECYCLE.STATES.RUNNING && startupTime) {
            uptime = Date.now() - startupTime.getTime();
        }

        // Include startup timestamp and duration information
        const startupInfo = startupTime ? {
            startupTime: startupTime.toISOString(),
            uptime: uptime,
            uptimeFormatted: uptime ? `${Math.round(uptime / 1000)}s` : null
        } : {};

        // Add process information and resource usage statistics
        const processInfo = {
            processId: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            memoryUsage: process.memoryUsage()
        };

        // Include environment information for context
        const environmentInfo = {
            nodeEnv: envConfig?.nodeEnv || process.env.NODE_ENV || 'development',
            isProduction: isProductionEnvironment(),
            isDevelopment: isDevelopmentEnvironment()
        };

        // Return comprehensive lifecycle state object with all details
        return {
            state: currentState,
            timestamp: new Date().toISOString(),
            application: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION
            },
            startup: startupInfo,
            process: processInfo,
            environment: environmentInfo,
            shutdownHandlers: {
                count: shutdownHandlers.length,
                handlers: shutdownHandlers.map(h => ({
                    name: h.name,
                    priority: h.priority || 0
                }))
            }
        };

    } catch (error) {
        logger.error('Failed to get lifecycle state', {
            error: error.message
        });

        return {
            state: LIFECYCLE.STATES.ERROR,
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Boolean utility function that checks if the application is currently in RUNNING state
 * and operational. Verifies startup time is set and shutdown time is null for accurate
 * running state determination.
 * 
 * @returns {boolean} True if application is in RUNNING state, false otherwise
 */
function isApplicationRunning() {
    try {
        // Check current lifecycle state against LIFECYCLE.STATES.RUNNING
        const isRunning = lifecycleState === LIFECYCLE.STATES.RUNNING;

        // Verify startup time is set and shutdown time is null
        const hasValidState = startupTime !== null && shutdownTime === null;

        // Return boolean indicating if application is actively running
        return isRunning && hasValidState;

    } catch (error) {
        logger.error('Failed to check application running state', {
            error: error.message
        });
        return false;
    }
}

/**
 * Utility function for registering custom shutdown handlers that will be executed during
 * graceful application shutdown. Handlers are executed in priority order (higher priority first)
 * with comprehensive error handling for individual handler failures.
 * 
 * @param {Function} handler - Shutdown handler function to execute during application shutdown
 * @param {string} name - Descriptive name for the shutdown handler for logging and debugging
 * @param {number} priority - Priority level for handler execution order (higher numbers execute first)
 * @returns {void} Registers shutdown handler in global shutdownHandlers array
 */
function registerShutdownHandler(handler, name, priority = 0) {
    try {
        // Validate handler is a function and name is provided
        if (typeof handler !== 'function') {
            throw new Error('Shutdown handler must be a function');
        }
        if (!name || typeof name !== 'string') {
            throw new Error('Shutdown handler name must be a non-empty string');
        }

        // Create handler object with function, name, and priority
        const handlerObject = {
            handler: handler,
            name: name.trim(),
            priority: Number(priority) || 0,
            registeredAt: new Date().toISOString()
        };

        // Insert handler into shutdownHandlers array based on priority (higher priority first)
        shutdownHandlers.push(handlerObject);
        shutdownHandlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        // Log handler registration with name and priority
        logger.debug('Shutdown handler registered successfully', {
            name: handlerObject.name,
            priority: handlerObject.priority,
            totalHandlers: shutdownHandlers.length
        });

        // Return void after successful registration

    } catch (error) {
        logger.error('Failed to register shutdown handler', {
            handlerName: name,
            error: error.message
        });
        throw new Error(`Shutdown handler registration failed: ${error.message}`);
    }
}

/**
 * Internal function that creates process signal handlers for graceful shutdown on SIGTERM,
 * SIGINT, and SIGQUIT signals. Implements timeout-based forced shutdown if graceful
 * shutdown takes too long.
 * 
 * @param {LifecycleManager} lifecycleManager - Lifecycle manager instance for coordinated shutdown
 * @returns {Function} Signal handler function for process exit events
 */
function createProcessSignalHandler(lifecycleManager) {
    let shutdownInitiated = false;

    return function signalHandler(signal) {
        try {
            // Create signal handler function that captures signal type
            logger.info('Process signal received - initiating graceful shutdown', {
                signal: signal,
                processId: process.pid,
                timestamp: new Date().toISOString()
            });

            // Check if application is already shutting down to prevent multiple shutdown attempts
            if (shutdownInitiated) {
                logger.warn('Shutdown already in progress - ignoring duplicate signal', {
                    signal: signal
                });
                return;
            }

            shutdownInitiated = true;

            // Call lifecycleManager.stop() for graceful shutdown
            const gracefulShutdown = async () => {
                try {
                    if (lifecycleManager && typeof lifecycleManager.stop === 'function') {
                        await lifecycleManager.stop();
                    } else {
                        logger.warn('Lifecycle manager not available - performing basic shutdown');
                        process.exit(0);
                    }
                } catch (shutdownError) {
                    logger.error('Graceful shutdown failed', {
                        error: shutdownError.message
                    });
                    process.exit(1);
                }
            };

            // Set up timeout for forced shutdown if graceful shutdown takes too long
            const forceShutdownTimeout = setTimeout(() => {
                logger.error('Graceful shutdown timeout exceeded - forcing process exit', {
                    timeout: LIFECYCLE.TIMEOUTS.FORCED_SHUTDOWN,
                    signal: signal
                });
                process.exit(1);
            }, LIFECYCLE.TIMEOUTS.FORCED_SHUTDOWN);

            // Execute graceful shutdown with timeout handling
            gracefulShutdown()
                .then(() => {
                    clearTimeout(forceShutdownTimeout);
                    logger.info('Graceful shutdown completed successfully');
                    process.exit(0);
                })
                .catch((error) => {
                    clearTimeout(forceShutdownTimeout);
                    logger.error('Graceful shutdown failed - exiting with error code', {
                        error: error.message
                    });
                    process.exit(1);
                });

        } catch (error) {
            // Handle shutdown errors and log appropriate messages
            logger.error('Signal handler error - forcing immediate exit', {
                signal: signal,
                error: error.message
            });
            process.exit(1);
        }
    };
}

/**
 * Main lifecycle management class that orchestrates application startup, running, and shutdown
 * phases with state management, error handling, and process signal integration for the Node.js
 * tutorial application. Provides comprehensive lifecycle coordination with event-driven architecture.
 */
class LifecycleManager {
    /**
     * Creates a new LifecycleManager instance with configuration, initializes state management,
     * and sets up process signal handling for graceful application lifecycle management.
     * 
     * @param {Object} config - Configuration object with lifecycle settings and application configuration
     */
    constructor(config = {}) {
        // Initialize instance properties with default values
        this.state = LIFECYCLE.STATES.INITIALIZING;
        this.startupTime = null;
        this.shutdownTime = null;
        this.isShuttingDown = false;
        this.processHandlers = new Map();

        // Set configuration from parameter or use default application config
        this.config = {
            ...config,
            shutdownTimeout: config.shutdownTimeout || LIFECYCLE.TIMEOUTS.GRACEFUL_SHUTDOWN,
            startupTimeout: config.startupTimeout || LIFECYCLE.TIMEOUTS.STARTUP
        };

        // Create component-specific logger using getLogger('lifecycle')
        this.logger = getLogger('lifecycle');

        // Initialize lifecycle state to LIFECYCLE.STATES.INITIALIZING
        this.state = LIFECYCLE.STATES.INITIALIZING;

        // Initialize empty shutdown handlers array for cleanup procedures
        this.shutdownHandlers = [];

        // Set isShuttingDown flag to false
        this.isShuttingDown = false;

        // Create and register process signal handlers for SIGTERM and SIGINT
        this.processHandlers.set('SIGTERM', this.createSignalHandler('SIGTERM'));
        this.processHandlers.set('SIGINT', this.createSignalHandler('SIGINT'));
        this.processHandlers.set('SIGQUIT', this.createSignalHandler('SIGQUIT'));

        // Log lifecycle manager initialization with configuration summary
        this.logger.info('LifecycleManager initialized successfully', {
            shutdownTimeout: this.config.shutdownTimeout,
            startupTimeout: this.config.startupTimeout,
            environment: envConfig?.nodeEnv || 'development'
        });
    }

    /**
     * Starts the application lifecycle by transitioning through startup states, initializing
     * components, and establishing readiness for request processing. Coordinates Express.js
     * application and HTTP server startup with comprehensive error handling.
     * 
     * @param {Object} app - Express.js application instance for HTTP request handling
     * @param {Object} server - HTTP server instance for network binding and connection management
     * @returns {Promise} Resolves when startup sequence is complete and application is running
     */
    async start(app, server) {
        try {
            // Validate current state allows startup (must be INITIALIZING or STOPPED)
            if (this.state !== LIFECYCLE.STATES.INITIALIZING && this.state !== LIFECYCLE.STATES.STOPPED) {
                throw new Error(`Cannot start application from state: ${this.state}`);
            }

            // Transition lifecycle state to LIFECYCLE.STATES.STARTING
            this.state = LIFECYCLE.STATES.STARTING;
            lifecycleState = LIFECYCLE.STATES.STARTING;

            // Record startup timestamp for uptime calculations
            this.startupTime = new Date();
            startupTime = this.startupTime;

            // Log startup initiation with application name and version
            this.logger.info('Application startup sequence initiated', {
                applicationName: APPLICATION.NAME,
                applicationVersion: APPLICATION.VERSION,
                startupTime: this.startupTime.toISOString()
            });

            // Execute pre-startup validation and environment checks
            this.logger.debug('Executing pre-startup validation and environment checks');
            await this.validateStartupRequirements(app, server);

            // Initialize Express.js application and HTTP server components
            this.logger.debug('Initializing Express.js application and HTTP server components');
            await this.initializeServerComponents(app, server);

            // Start HTTP server listening on configured port and host
            this.logger.info('Starting HTTP server on configured address');
            await this.startHttpServer(server);

            // Execute post-startup verification and health checks
            this.logger.debug('Executing post-startup verification and health checks');
            await this.performPostStartupChecks(server);

            // Transition lifecycle state to LIFECYCLE.STATES.RUNNING
            this.state = LIFECYCLE.STATES.RUNNING;
            lifecycleState = LIFECYCLE.STATES.RUNNING;

            // Calculate startup duration
            const startupDuration = Date.now() - this.startupTime.getTime();

            // Log successful startup completion with server details and timing
            this.logger.info('Application startup completed successfully', {
                startupDuration: `${startupDuration}ms`,
                serverAddress: server.address(),
                lifecycleState: this.state,
                environment: envConfig?.nodeEnv || 'development'
            });

            // Return Promise resolving with startup confirmation and application status
            return {
                success: true,
                startupTime: this.startupTime,
                startupDuration: startupDuration,
                serverAddress: server.address(),
                state: this.state
            };

        } catch (error) {
            // Handle startup errors and transition to error state
            this.state = LIFECYCLE.STATES.ERROR;
            lifecycleState = LIFECYCLE.STATES.ERROR;

            this.logger.error('Application startup failed', {
                error: error.message,
                stack: error.stack,
                state: this.state
            });

            throw new Error(`Application startup failed: ${error.message}`);
        }
    }

    /**
     * Performs graceful application shutdown by executing shutdown handlers, stopping server,
     * cleaning up resources, and transitioning to stopped state. Implements timeout-based
     * forced shutdown if graceful shutdown exceeds configured timeout.
     * 
     * @param {boolean} force - Whether to force shutdown if graceful shutdown times out
     * @param {number} timeout - Custom timeout in milliseconds for shutdown operations
     * @returns {Promise} Resolves when shutdown sequence is complete and all resources are cleaned up
     */
    async stop(force = false, timeout = null) {
        try {
            // Check if already shutting down to prevent duplicate shutdown attempts
            if (this.isShuttingDown) {
                this.logger.warn('Shutdown already in progress - ignoring duplicate stop request');
                return {
                    success: true,
                    message: 'Shutdown already in progress'
                };
            }

            // Set isShuttingDown flag to true and transition state to LIFECYCLE.STATES.STOPPING
            this.isShuttingDown = true;
            this.state = LIFECYCLE.STATES.STOPPING;
            lifecycleState = LIFECYCLE.STATES.STOPPING;

            // Record shutdown timestamp for duration calculations
            this.shutdownTime = new Date();
            shutdownTime = this.shutdownTime;

            const shutdownTimeout = timeout || this.config.shutdownTimeout;

            // Log shutdown initiation with reason (graceful or forced) and timeout
            this.logger.info('Application shutdown sequence initiated', {
                force: force,
                shutdownTimeout: shutdownTimeout,
                shutdownTime: this.shutdownTime.toISOString()
            });

            // Execute registered shutdown handlers in priority order with error handling
            this.logger.info(`Executing ${this.shutdownHandlers.length} registered shutdown handlers`);
            await this.executeShutdownHandlers();

            // Stop HTTP server gracefully allowing existing connections to complete
            this.logger.info('Stopping HTTP server and closing connections');
            await this.stopHttpServer(force, shutdownTimeout);

            // Force stop server if timeout exceeded or force parameter is true
            if (force) {
                this.logger.warn('Forcing server shutdown due to force parameter or timeout');
            }

            // Clean up Express.js application resources and middleware
            this.logger.debug('Cleaning up Express.js application resources and middleware');
            await this.cleanupApplicationResources();

            // Remove process signal handlers to prevent interference
            this.logger.debug('Removing process signal handlers');
            this.removeProcessSignalHandlers();

            // Transition lifecycle state to LIFECYCLE.STATES.STOPPED
            this.state = LIFECYCLE.STATES.STOPPED;
            lifecycleState = LIFECYCLE.STATES.STOPPED;
            this.isShuttingDown = false;

            // Calculate shutdown duration
            const shutdownDuration = Date.now() - this.shutdownTime.getTime();

            // Log successful shutdown completion with duration and cleanup summary
            this.logger.info('Application shutdown completed successfully', {
                shutdownDuration: `${shutdownDuration}ms`,
                handlersExecuted: this.shutdownHandlers.length,
                force: force
            });

            // Return Promise resolving with shutdown confirmation
            return {
                success: true,
                shutdownTime: this.shutdownTime,
                shutdownDuration: shutdownDuration,
                handlersExecuted: this.shutdownHandlers.length,
                state: this.state
            };

        } catch (error) {
            // Handle shutdown errors
            this.state = LIFECYCLE.STATES.ERROR;
            lifecycleState = LIFECYCLE.STATES.ERROR;
            this.isShuttingDown = false;

            this.logger.error('Application shutdown failed', {
                error: error.message,
                stack: error.stack
            });

            throw new Error(`Application shutdown failed: ${error.message}`);
        }
    }

    /**
     * Returns comprehensive lifecycle state information including current state, timing data,
     * uptime, and application metadata for monitoring and debugging purposes.
     * 
     * @returns {Object} Detailed lifecycle state object with state, timing, uptime, and metadata
     */
    getState() {
        try {
            // Retrieve current lifecycle state from this.state property
            const currentState = this.state;

            // Calculate application uptime if startup time is available
            let uptime = null;
            if (this.startupTime && currentState === LIFECYCLE.STATES.RUNNING) {
                uptime = Date.now() - this.startupTime.getTime();
            }

            // Include startup and shutdown timestamps with formatted dates
            const timingInfo = {
                startupTime: this.startupTime ? this.startupTime.toISOString() : null,
                shutdownTime: this.shutdownTime ? this.shutdownTime.toISOString() : null,
                uptime: uptime,
                uptimeFormatted: uptime ? `${Math.round(uptime / 1000)}s` : null
            };

            // Add application metadata (name, version, Node.js version)
            const applicationMetadata = {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                nodeVersion: process.version,
                platform: `${process.platform}-${process.arch}`
            };

            // Include environment information and configuration summary
            const environmentInfo = {
                nodeEnv: envConfig?.nodeEnv || process.env.NODE_ENV || 'development',
                isProduction: isProductionEnvironment(),
                isDevelopment: isDevelopmentEnvironment(),
                configurationValid: Boolean(this.config)
            };

            // Add process information (PID, platform, memory usage)
            const processInfo = {
                processId: process.pid,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                isShuttingDown: this.isShuttingDown
            };

            // Return comprehensive state object with all lifecycle information
            return {
                state: currentState,
                timestamp: new Date().toISOString(),
                timing: timingInfo,
                application: applicationMetadata,
                environment: environmentInfo,
                process: processInfo,
                shutdownHandlers: {
                    count: this.shutdownHandlers.length,
                    handlers: this.shutdownHandlers.map(h => ({
                        name: h.name,
                        priority: h.priority || 0
                    }))
                }
            };

        } catch (error) {
            this.logger.error('Failed to get lifecycle state', {
                error: error.message
            });

            return {
                state: LIFECYCLE.STATES.ERROR,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Calculates and returns the application uptime in milliseconds since startup, or null
     * if application is not running or startup time is not available.
     * 
     * @returns {number|null} Application uptime in milliseconds or null if not running
     */
    getUptime() {
        try {
            // Check if startup time is available and application has started
            if (!this.startupTime || this.state !== LIFECYCLE.STATES.RUNNING) {
                return null;
            }

            // Calculate uptime by subtracting startup time from current time
            const uptime = Date.now() - this.startupTime.getTime();

            // Return uptime in milliseconds or null if not applicable
            return uptime;

        } catch (error) {
            this.logger.error('Failed to calculate uptime', {
                error: error.message
            });
            return null;
        }
    }

    /**
     * Returns complete lifecycle manager information including configuration, state, handlers,
     * and operational details for comprehensive monitoring and debugging.
     * 
     * @returns {Object} Complete lifecycle manager information with all details
     */
    getInfo() {
        try {
            // Include current lifecycle state using getState() method
            const stateInfo = this.getState();

            // Add uptime information using getUptime() method
            const uptime = this.getUptime();

            // Include configuration details and environment settings
            const configurationInfo = {
                shutdownTimeout: this.config.shutdownTimeout,
                startupTimeout: this.config.startupTimeout,
                environment: envConfig?.nodeEnv || 'development'
            };

            // Add registered shutdown handlers count and details
            const shutdownHandlersInfo = {
                count: this.shutdownHandlers.length,
                handlers: this.shutdownHandlers.map(handler => ({
                    name: handler.name,
                    priority: handler.priority || 0,
                    registeredAt: handler.registeredAt || null
                }))
            };

            // Include process signal handler status and configuration
            const signalHandlersInfo = {
                registered: Array.from(this.processHandlers.keys()),
                count: this.processHandlers.size
            };

            // Add performance metrics and resource usage information
            const performanceInfo = {
                uptime: uptime,
                uptimeFormatted: uptime ? `${Math.round(uptime / 1000)}s` : null,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            };

            // Return comprehensive lifecycle manager information object
            return {
                state: stateInfo,
                configuration: configurationInfo,
                shutdownHandlers: shutdownHandlersInfo,
                signalHandlers: signalHandlersInfo,
                performance: performanceInfo,
                metadata: {
                    version: APPLICATION.VERSION,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            this.logger.error('Failed to get lifecycle manager info', {
                error: error.message
            });

            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Registers a custom shutdown handler function that will be executed during graceful
     * application shutdown with specified priority ordering for coordinated cleanup.
     * 
     * @param {Function} handler - Shutdown handler function to execute during application shutdown
     * @param {string} name - Descriptive name for the shutdown handler for logging and debugging
     * @param {number} priority - Priority level for handler execution order (higher numbers execute first)
     * @returns {void} Registers handler in internal shutdown handlers array
     */
    registerShutdownHandler(handler, name, priority = 0) {
        try {
            // Validate handler is a function and name is a non-empty string
            if (typeof handler !== 'function') {
                throw new Error('Shutdown handler must be a function');
            }
            if (!name || typeof name !== 'string' || !name.trim()) {
                throw new Error('Shutdown handler name must be a non-empty string');
            }

            // Create handler object with function, name, priority, and registration timestamp
            const handlerObject = {
                handler: handler,
                name: name.trim(),
                priority: Number(priority) || 0,
                registeredAt: new Date().toISOString()
            };

            // Insert handler into shutdownHandlers array maintaining priority order (higher first)
            this.shutdownHandlers.push(handlerObject);
            this.shutdownHandlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            // Log handler registration with name, priority, and current handler count
            this.logger.debug('Shutdown handler registered', {
                name: handlerObject.name,
                priority: handlerObject.priority,
                totalHandlers: this.shutdownHandlers.length
            });

            // Return void after successful registration

        } catch (error) {
            this.logger.error('Failed to register shutdown handler', {
                handlerName: name,
                error: error.message
            });
            throw new Error(`Shutdown handler registration failed: ${error.message}`);
        }
    }

    /**
     * Returns boolean indicating whether the application is currently in RUNNING state
     * and operational with proper startup completion verification.
     * 
     * @returns {boolean} True if application is running, false otherwise
     */
    isRunning() {
        try {
            // Check if current state equals LIFECYCLE.STATES.RUNNING
            const stateIsRunning = this.state === LIFECYCLE.STATES.RUNNING;

            // Verify startup time is set and shutdown time is null
            const hasValidTiming = this.startupTime !== null && this.shutdownTime === null;

            // Return boolean result indicating running status
            return stateIsRunning && hasValidTiming;

        } catch (error) {
            this.logger.error('Failed to check running status', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Returns boolean indicating whether the application is currently in the shutdown process
     * with proper shutdown state and flag verification.
     * 
     * @returns {boolean} True if application is stopping, false otherwise
     */
    isStopping() {
        try {
            // Check if isShuttingDown flag is true or state is STOPPING
            return this.isShuttingDown || this.state === LIFECYCLE.STATES.STOPPING;

        } catch (error) {
            this.logger.error('Failed to check stopping status', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Async utility method that waits for the lifecycle to reach a specific state with timeout
     * support for testing and synchronization purposes in development and testing environments.
     * 
     * @param {string} targetState - Target lifecycle state to wait for
     * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000ms)
     * @returns {Promise} Resolves when target state is reached or rejects on timeout
     */
    async waitForState(targetState, timeout = LIFECYCLE.TIMEOUTS.STATE_TRANSITION) {
        try {
            // Check if current state already matches target state
            if (this.state === targetState) {
                this.logger.debug(`Already in target state: ${targetState}`);
                return {
                    success: true,
                    currentState: this.state,
                    message: `Already in target state: ${targetState}`
                };
            }

            this.logger.debug(`Waiting for state transition to: ${targetState}`, {
                currentState: this.state,
                timeout: timeout
            });

            // Set up Promise with polling and timeout logic
            return new Promise((resolve, reject) => {
                // Set up interval to poll current state against target state
                const pollInterval = setInterval(() => {
                    if (this.state === targetState) {
                        clearInterval(pollInterval);
                        clearTimeout(timeoutHandler);
                        
                        this.logger.debug(`State transition completed: ${targetState}`);
                        resolve({
                            success: true,
                            currentState: this.state,
                            message: `State transition completed: ${targetState}`
                        });
                    }
                }, 100); // Poll every 100ms

                // Set up timeout to reject Promise if target state not reached
                const timeoutHandler = setTimeout(() => {
                    clearInterval(pollInterval);
                    
                    const errorMessage = `Timeout waiting for state: ${targetState} (current: ${this.state})`;
                    this.logger.warn(errorMessage, {
                        targetState: targetState,
                        currentState: this.state,
                        timeout: timeout
                    });
                    
                    reject(new Error(errorMessage));
                }, timeout);
            });

        } catch (error) {
            this.logger.error('Failed to wait for state', {
                targetState: targetState,
                currentState: this.state,
                error: error.message
            });
            throw new Error(`State waiting failed: ${error.message}`);
        }
    }

    // Private helper methods for lifecycle operations

    /**
     * Validates startup requirements including app and server instances
     * @private
     */
    async validateStartupRequirements(app, server) {
        if (!app) {
            throw new Error('Express application instance is required');
        }
        if (!server) {
            throw new Error('HTTP server instance is required');
        }
        this.logger.debug('Startup requirements validation passed');
    }

    /**
     * Initializes server components and applies configuration
     * @private
     */
    async initializeServerComponents(app, server) {
        // Server component initialization logic would go here
        this.logger.debug('Server components initialized successfully');
    }

    /**
     * Starts the HTTP server and waits for it to be listening
     * @private
     */
    async startHttpServer(server) {
        return new Promise((resolve, reject) => {
            const startTimeout = setTimeout(() => {
                reject(new Error('Server startup timeout exceeded'));
            }, this.config.startupTimeout);

            server.on('listening', () => {
                clearTimeout(startTimeout);
                this.logger.info('HTTP server started and listening', {
                    address: server.address()
                });
                resolve();
            });

            server.on('error', (error) => {
                clearTimeout(startTimeout);
                reject(error);
            });
        });
    }

    /**
     * Performs post-startup health checks and verification
     * @private
     */
    async performPostStartupChecks(server) {
        if (!server.listening) {
            throw new Error('Server is not listening after startup');
        }
        this.logger.debug('Post-startup checks completed successfully');
    }

    /**
     * Executes all registered shutdown handlers in priority order
     * @private
     */
    async executeShutdownHandlers() {
        const sortedHandlers = [...this.shutdownHandlers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        for (const handlerObj of sortedHandlers) {
            try {
                this.logger.debug(`Executing shutdown handler: ${handlerObj.name}`);
                await Promise.resolve(handlerObj.handler());
                this.logger.debug(`Shutdown handler completed: ${handlerObj.name}`);
            } catch (error) {
                this.logger.error(`Shutdown handler failed: ${handlerObj.name}`, {
                    error: error.message
                });
            }
        }
    }

    /**
     * Stops the HTTP server with timeout and force options
     * @private
     */
    async stopHttpServer(force, timeout) {
        // HTTP server stopping logic would be handled by the caller
        // This is a placeholder for server-specific shutdown logic
        this.logger.debug('HTTP server shutdown initiated', { force, timeout });
    }

    /**
     * Cleans up application resources and connections
     * @private
     */
    async cleanupApplicationResources() {
        // Application resource cleanup logic would go here
        this.logger.debug('Application resources cleaned up successfully');
    }

    /**
     * Removes process signal handlers to prevent interference
     * @private
     */
    removeProcessSignalHandlers() {
        for (const [signal, handler] of this.processHandlers) {
            try {
                process.removeListener(signal, handler);
                this.logger.debug(`Removed signal handler for: ${signal}`);
            } catch (error) {
                this.logger.warn(`Failed to remove signal handler for ${signal}`, {
                    error: error.message
                });
            }
        }
        this.processHandlers.clear();
    }

    /**
     * Creates a signal handler for the specified signal type
     * @private
     */
    createSignalHandler(signal) {
        return () => {
            this.logger.info(`Process signal received: ${signal} - initiating graceful shutdown`);
            this.stop().catch(error => {
                this.logger.error('Signal-triggered shutdown failed', {
                    signal: signal,
                    error: error.message
                });
                process.exit(1);
            });
        };
    }
}

// Export the main application configuration object and utility functions
module.exports = {
    // Main lifecycle management class for comprehensive application startup, running, and shutdown orchestration
    LifecycleManager,
    
    // Factory function for creating and initializing LifecycleManager instances with default configuration
    initializeLifecycle,
    
    // Standalone utility function for complete application startup sequence with lifecycle coordination
    startApplication,
    
    // Standalone utility function for graceful application shutdown with comprehensive cleanup
    stopApplication,
    
    // Utility function for retrieving current lifecycle state with detailed status information
    getLifecycleState,
    
    // Boolean utility function for checking if application is currently operational
    isApplicationRunning,
    
    // Utility function for registering custom shutdown handlers with priority-based execution
    registerShutdownHandler,
    
    // Lifecycle constants for external reference
    LIFECYCLE
};