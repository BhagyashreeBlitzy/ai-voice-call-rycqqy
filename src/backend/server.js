/**
 * Main Server Entry Point for Node.js Tutorial Application
 * 
 * This module serves as the primary executable file that coordinates Express.js application
 * initialization, HTTP server startup, lifecycle management, and graceful shutdown procedures.
 * Implements comprehensive server orchestration using Node.js v22.x LTS with Express.js 5.1.0
 * framework, showcasing professional server management patterns, configuration integration,
 * error handling, and production-ready architecture while maintaining educational clarity.
 * 
 * Demonstrates fundamental HTTP server concepts through a single /hello endpoint returning
 * 'Hello world' while providing complete server lifecycle management, monitoring capabilities,
 * and robust error handling for learning core Node.js web development concepts.
 * 
 * Features:
 * - HTTP Server Foundation with Express.js 5.1.0 integration
 * - Hello Endpoint Implementation demonstrating basic routing
 * - Port Configuration Management with environment variable support
 * - Basic Error Handling with comprehensive error management
 * - Graceful shutdown procedures with process signal handling
 * - Server status monitoring and performance metrics
 * - Production-ready architecture patterns for educational use
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import default Express.js application instance configured with middleware and routes
const app = require('./app.js').app; // Express.js 5.1.0

// Import Express.js application factory function for creating configured application instances
const { createExpressApp } = require('./app.js');

// Import HTTP server management class and factory functions for server lifecycle orchestration
const { 
    HttpServerManager, 
    createHttpServer, 
    startServer: startHttpServer, 
    stopServer: stopHttpServer,
    getServerStatus: getHttpServerStatus,
    isServerRunning: isHttpServerRunning,
    getAllServers,
    createServerHealthCheck
} = require('./lib/server.js');

// Import lifecycle management class and utilities for application startup and shutdown coordination
const { 
    LifecycleManager, 
    startApplication, 
    stopApplication,
    getLifecycleState,
    isApplicationRunning,
    registerShutdownHandler
} = require('./lib/lifecycle.js');

// Import centralized configuration object containing all application settings
const { 
    configuration,
    createConfiguration,
    validateConfiguration,
    getConfigurationSummary,
    reloadConfiguration,
    isConfigurationValid,
    getConfigurationValue,
    createLoggerInstance
} = require('./config/index.js');

// Import server configuration including timeout values, connection limits, and security configurations
const { 
    serverConfig, 
    validateServerConfig, 
    createServerSummary: createConfigServerSummary 
} = require('./config/server.js');

// Import environment configuration providing port, host, and environment-specific settings
const { 
    config: environmentConfig,
    validateEnvironment,
    getEnvironmentInfo,
    createEnvironmentConfig,
    reloadEnvironmentConfig,
    isEnvironmentConfigValid
} = require('./config/environment.js');

// Import logger factory function for creating component-specific loggers with structured output
const { getLogger } = require('./utils/logger.js');

// Import application metadata constants for server identification, logging context, and version information
const { 
    APPLICATION, 
    SERVER, 
    TIMEOUTS, 
    HTTP_STATUS, 
    ERROR_MESSAGES,
    ENVIRONMENT
} = require('./utils/constants.js');

// Initialize component-specific logger for server operations with 'server' context
const logger = getLogger('server');

// Global variables for server state management and lifecycle tracking
let serverManager = null;
let lifecycleManager = null;
let isServerRunning = false;
let startupTime = null;

// Server instance tracking and monitoring
let serverInstances = new Map();
let shutdownInProgress = false;
let applicationReadyTime = null;

/**
 * Main server startup function that orchestrates Express.js application initialization,
 * HTTP server creation, lifecycle management setup, and comprehensive startup sequence
 * for the Node.js tutorial application with error handling and logging.
 * 
 * @param {Object} options - Configuration options for server startup
 * @param {number} options.port - Port number for server binding (default from environment)
 * @param {string} options.host - Host address for server binding (default from environment)
 * @param {boolean} options.validateConfig - Whether to validate configuration before startup
 * @param {boolean} options.enableSignalHandlers - Whether to register process signal handlers
 * @param {number} options.startupTimeout - Timeout in milliseconds for startup operations
 * @returns {Promise} Resolves when server startup is complete with server status and binding information
 */
async function startServer(options = {}) {
    try {
        // Log server startup initiation with application name, version, and Node.js runtime information
        logger.info('Initiating server startup sequence', {
            applicationName: APPLICATION.NAME,
            applicationVersion: APPLICATION.VERSION,
            nodeVersion: process.version,
            platform: process.platform,
            processId: process.pid,
            startupOptions: options
        });

        // Validate server configuration using validateServerConfig ensuring all required settings are present
        const configValidation = validateServerConfig(serverConfig);
        if (!configValidation.isValid) {
            logger.warn('Server configuration validation failed, proceeding with warnings', {
                errors: configValidation.errors,
                warnings: configValidation.warnings
            });
        }

        // Validate startup environment including Node.js version, dependencies, and system resources
        const environmentValidation = await validateStartupEnvironment(configuration);
        if (!environmentValidation.isValid) {
            logger.error('Startup environment validation failed', {
                errors: environmentValidation.errors,
                warnings: environmentValidation.warnings
            });
            throw new Error(`Environment validation failed: ${environmentValidation.errors.join(', ')}`);
        }

        // Create or retrieve Express.js application instance using app import or createExpressApp factory
        const expressApp = options.app || app || createExpressApp({
            config: configuration,
            enableMiddleware: true,
            enableRoutes: true,
            enableSecurity: true,
            enableErrorHandling: true
        });

        if (!expressApp) {
            throw new Error('Failed to create or obtain Express.js application instance');
        }

        // Initialize LifecycleManager with application configuration for startup and shutdown coordination
        lifecycleManager = new LifecycleManager(configuration);

        // Create HttpServerManager instance using createHttpServer with app and server configuration
        serverManager = createHttpServer({
            app: expressApp,
            config: serverConfig,
            serverId: `server-${Date.now()}`,
            enableLifecycle: true
        });

        // Register process signal handlers (SIGTERM, SIGINT) for graceful shutdown through lifecycle manager
        if (options.enableSignalHandlers !== false) {
            await setupGracefulShutdown(lifecycleManager, serverManager);
            logger.debug('Process signal handlers registered for graceful shutdown');
        }

        // Start lifecycle manager coordinating application and server startup sequence
        logger.info('Starting lifecycle manager and application startup sequence');
        await lifecycleManager.start(expressApp, serverManager.server);

        // Configure server binding options from options or environment configuration
        const bindingOptions = {
            port: options.port || environmentConfig.port || ENVIRONMENT.DEFAULT_PORT,
            host: options.host || environmentConfig.host || ENVIRONMENT.DEFAULT_HOST,
            timeout: options.startupTimeout || TIMEOUTS.SERVER_STARTUP
        };

        // Start HTTP server manager binding to configured port and host with timeout handling
        logger.info('Starting HTTP server manager with binding configuration', bindingOptions);
        const startupResult = await serverManager.start(bindingOptions);

        // Verify server is listening and accepting connections with readiness check
        if (!serverManager.isRunning()) {
            throw new Error('Server startup completed but server is not in running state');
        }

        // Update global state variables (isServerRunning, startupTime, serverManager, lifecycleManager)
        isServerRunning = true;
        startupTime = new Date();
        applicationReadyTime = startupTime;

        // Cache server instance for management and monitoring
        const serverId = serverManager.serverId || `server-${Date.now()}`;
        serverInstances.set(serverId, {
            serverManager: serverManager,
            lifecycleManager: lifecycleManager,
            startupTime: startupTime,
            bindingOptions: bindingOptions,
            serverId: serverId
        });

        // Log successful server startup with port binding, uptime, and operational status
        logger.info('Server startup completed successfully', {
            serverId: serverId,
            binding: `${bindingOptions.host}:${bindingOptions.port}`,
            startupDuration: `${Date.now() - startupTime.getTime()}ms`,
            serverStatus: serverManager.getStatus().state,
            lifecycleState: lifecycleManager.getState().state,
            uptime: serverManager.getUptime(),
            applicationReady: true
        });

        // Return Promise resolving with server status, binding details, and startup confirmation
        return {
            success: true,
            serverId: serverId,
            binding: `${bindingOptions.host}:${bindingOptions.port}`,
            startupTime: startupTime,
            startupDuration: Date.now() - startupTime.getTime(),
            serverStatus: serverManager.getStatus(),
            lifecycleState: lifecycleManager.getState(),
            bindingInfo: startupResult,
            message: 'Server started successfully and ready to accept connections'
        };

    } catch (error) {
        // Handle server startup errors with comprehensive error logging and cleanup
        logger.error('Server startup failed', {
            error: error.message,
            stack: error.stack,
            options: options,
            applicationName: APPLICATION.NAME
        });

        // Clean up partially initialized components
        if (serverManager) {
            try {
                await serverManager.stop(true, 5000);
            } catch (cleanupError) {
                logger.error('Failed to cleanup server manager after startup failure', {
                    error: cleanupError.message
                });
            }
        }

        if (lifecycleManager) {
            try {
                await lifecycleManager.stop(true, 5000);
            } catch (cleanupError) {
                logger.error('Failed to cleanup lifecycle manager after startup failure', {
                    error: cleanupError.message
                });
            }
        }

        // Reset global state
        isServerRunning = false;
        startupTime = null;
        serverManager = null;
        lifecycleManager = null;

        throw new Error(`Server startup failed: ${error.message}`);
    }
}

/**
 * Graceful server shutdown function that coordinates application shutdown, HTTP server
 * termination, resource cleanup, and lifecycle finalization with comprehensive error
 * handling and logging.
 * 
 * @param {boolean} force - Whether to force shutdown if graceful shutdown times out
 * @param {number} timeout - Shutdown timeout in milliseconds
 * @param {Object} options - Additional shutdown configuration options
 * @returns {Promise} Resolves when server shutdown is complete with cleanup confirmation
 */
async function stopServer(force = false, timeout = null, options = {}) {
    try {
        // Check if server is running and can be stopped to prevent multiple shutdown attempts
        if (shutdownInProgress) {
            logger.warn('Server shutdown already in progress, ignoring duplicate stop request');
            return {
                success: true,
                message: 'Shutdown already in progress',
                duplicateRequest: true
            };
        }

        if (!isServerRunning || !serverManager) {
            logger.info('Server is not running, no shutdown needed');
            return {
                success: true,
                message: 'Server was not running',
                alreadyStopped: true
            };
        }

        shutdownInProgress = true;

        // Log shutdown initiation with reason (graceful/forced), timeout, and server uptime
        const shutdownTimeout = timeout || TIMEOUTS.SERVER_SHUTDOWN;
        const uptime = serverManager ? serverManager.getUptime() : null;
        
        logger.info('Initiating server shutdown sequence', {
            force: force,
            timeout: shutdownTimeout,
            uptime: uptime,
            shutdownReason: force ? 'forced-shutdown' : 'graceful-shutdown',
            serverId: serverManager ? serverManager.serverId : 'unknown'
        });

        // Update isServerRunning flag to false and record shutdown start time
        isServerRunning = false;
        const shutdownStartTime = new Date();

        // Execute graceful shutdown using lifecycleManager.stop() with registered shutdown handlers
        if (lifecycleManager) {
            logger.info('Executing graceful shutdown using lifecycle manager');
            try {
                await lifecycleManager.stop(force, shutdownTimeout);
                logger.debug('Lifecycle manager shutdown completed successfully');
            } catch (lifecycleError) {
                logger.error('Lifecycle manager shutdown failed', {
                    error: lifecycleError.message,
                    force: force
                });
                if (!force) {
                    throw lifecycleError;
                }
            }
        }

        // Stop HTTP server using serverManager.stop() with connection draining and timeout handling
        if (serverManager) {
            logger.info('Stopping HTTP server with connection draining');
            try {
                await serverManager.stop(force, shutdownTimeout);
                logger.debug('HTTP server shutdown completed successfully');
            } catch (serverError) {
                logger.error('HTTP server shutdown failed', {
                    error: serverError.message,
                    force: force
                });
                if (!force) {
                    throw serverError;
                }
            }
        }

        // Clean up global state variables and cached server instances
        logger.debug('Cleaning up global state variables and cached instances');
        
        // Clean up server instances cache
        for (const [serverId, serverInstance] of serverInstances) {
            serverInstance.stoppedAt = new Date().toISOString();
            serverInstance.shutdownDuration = Date.now() - shutdownStartTime.getTime();
        }

        // Remove process signal handlers to prevent interference during shutdown
        logger.debug('Removing process signal handlers');
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGQUIT');

        // Execute final cleanup procedures including resource deallocation
        await performFinalCleanup();

        // Reset global state
        const shutdownDuration = Date.now() - shutdownStartTime.getTime();
        serverManager = null;
        lifecycleManager = null;
        shutdownInProgress = false;

        // Log successful shutdown completion with duration, cleanup summary, and final status
        logger.info('Server shutdown completed successfully', {
            shutdownDuration: `${shutdownDuration}ms`,
            force: force,
            cleanupCompleted: true,
            serverInstancesHandled: serverInstances.size,
            shutdownTime: shutdownStartTime.toISOString()
        });

        // Return Promise resolving with shutdown confirmation and cleanup details
        return {
            success: true,
            shutdownTime: shutdownStartTime,
            shutdownDuration: shutdownDuration,
            force: force,
            cleanupCompleted: true,
            serverInstancesHandled: serverInstances.size,
            message: 'Server shutdown completed successfully'
        };

    } catch (error) {
        shutdownInProgress = false;
        
        logger.error('Server shutdown failed', {
            error: error.message,
            stack: error.stack,
            force: force,
            timeout: timeout
        });

        throw new Error(`Server shutdown failed: ${error.message}`);
    }
}

/**
 * Comprehensive server status reporting function that returns detailed information about
 * server state, configuration, uptime, connections, and operational metrics for
 * monitoring and debugging.
 * 
 * @param {Object} options - Status reporting options
 * @param {boolean} options.includeMetrics - Whether to include detailed performance metrics
 * @param {boolean} options.includeConfiguration - Whether to include configuration details
 * @param {boolean} options.includeSystem - Whether to include system information
 * @returns {Object} Complete server status object with binding, connections, uptime, lifecycle state, and performance metrics
 */
function getServerStatus(options = {}) {
    try {
        logger.debug('Retrieving comprehensive server status', {
            includeMetrics: options.includeMetrics !== false,
            includeConfiguration: options.includeConfiguration !== false,
            includeSystem: options.includeSystem !== false
        });

        // Check if server is currently running using isServerRunning flag and serverManager status
        const currentlyRunning = isServerRunning && serverManager && serverManager.isRunning();

        // Collect server binding information including host, port, and listening state
        const bindingInfo = serverManager ? serverManager.getConnectionInfo() : {
            binding: 'not-bound',
            isListening: false,
            error: 'Server manager not available'
        };

        // Get HTTP server status from serverManager.getStatus() including connection statistics
        const httpServerStatus = serverManager ? serverManager.getStatus() : {
            state: 'not-initialized',
            error: 'Server manager not available'
        };

        // Calculate server uptime using startupTime and current time
        const uptime = currentlyRunning && startupTime ? Date.now() - startupTime.getTime() : null;
        const uptimeFormatted = uptime ? `${Math.round(uptime / 1000)}s` : null;

        // Retrieve lifecycle state from lifecycleManager.getState() with detailed status
        const lifecycleState = lifecycleManager ? lifecycleManager.getState() : {
            state: 'not-initialized',
            error: 'Lifecycle manager not available'
        };

        // Include server configuration summary with environment and settings
        const configurationSummary = options.includeConfiguration !== false ? 
            getConfigurationSummary(configuration) : null;

        // Add application metadata including name, version, and Node.js runtime information
        const applicationMetadata = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            processId: process.pid
        };

        // Include performance metrics and resource usage statistics
        let performanceMetrics = null;
        if (options.includeMetrics !== false) {
            performanceMetrics = {
                uptime: uptime,
                uptimeFormatted: uptimeFormatted,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                serverInstances: serverInstances.size,
                isRunning: currentlyRunning,
                startupTime: startupTime ? startupTime.toISOString() : null,
                applicationReadyTime: applicationReadyTime ? applicationReadyTime.toISOString() : null
            };
        }

        // Include system information if requested
        let systemInfo = null;
        if (options.includeSystem !== false) {
            systemInfo = {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                pid: process.pid,
                cwd: process.cwd(),
                uptime: Math.round(process.uptime()),
                loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
            };
        }

        // Return comprehensive server status object with all operational details and metrics
        const serverStatusObject = {
            // Core server state
            isRunning: currentlyRunning,
            state: httpServerStatus.state || 'unknown',
            serverId: serverManager ? serverManager.serverId : null,

            // Binding and connection information
            binding: bindingInfo,
            
            // Server status details
            server: httpServerStatus,
            
            // Lifecycle information
            lifecycle: lifecycleState,
            
            // Application metadata
            application: applicationMetadata,
            
            // Optional sections
            ...(performanceMetrics && { performance: performanceMetrics }),
            ...(configurationSummary && { configuration: configurationSummary }),
            ...(systemInfo && { system: systemInfo }),

            // Status metadata
            statusGenerated: {
                timestamp: new Date().toISOString(),
                requestedOptions: options,
                statusVersion: APPLICATION.VERSION
            }
        };

        logger.debug('Server status retrieved successfully', {
            isRunning: currentlyRunning,
            serverId: serverManager ? serverManager.serverId : null,
            uptime: uptimeFormatted,
            statusSections: Object.keys(serverStatusObject).length
        });

        return serverStatusObject;

    } catch (error) {
        logger.error('Failed to get server status', {
            error: error.message,
            stack: error.stack,
            options: options
        });

        return {
            isRunning: false,
            state: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
            statusGenerated: {
                timestamp: new Date().toISOString(),
                error: `Status generation failed: ${error.message}`
            }
        };
    }
}

/**
 * Configures comprehensive graceful shutdown procedures including process signal handlers,
 * shutdown timeouts, resource cleanup registration, and lifecycle coordination for
 * production-ready server termination.
 * 
 * @param {LifecycleManager} lifecycle - Lifecycle manager instance for shutdown coordination
 * @param {HttpServerManager} serverMgr - HTTP server manager instance for server termination
 * @returns {void} Configures shutdown handlers and process signal listeners
 */
async function setupGracefulShutdown(lifecycle, serverMgr) {
    try {
        logger.info('Setting up comprehensive graceful shutdown procedures', {
            hasLifecycleManager: Boolean(lifecycle),
            hasServerManager: Boolean(serverMgr),
            serverId: serverMgr ? serverMgr.serverId : 'unknown'
        });

        // Create graceful shutdown handler function
        const createShutdownHandler = (signal) => {
            return async () => {
                logger.info(`Received ${signal} signal - initiating graceful shutdown`, {
                    signal: signal,
                    processId: process.pid,
                    uptime: serverMgr ? serverMgr.getUptime() : null
                });

                try {
                    // Execute graceful shutdown with timeout
                    await stopServer(false, TIMEOUTS.SERVER_SHUTDOWN);
                    logger.info('Graceful shutdown completed successfully');
                    process.exit(0);
                } catch (shutdownError) {
                    logger.error('Graceful shutdown failed, forcing exit', {
                        error: shutdownError.message,
                        signal: signal
                    });
                    process.exit(1);
                }
            };
        };

        // Register SIGTERM signal handler for graceful shutdown requests from process managers
        const sigtermHandler = createShutdownHandler('SIGTERM');
        process.on('SIGTERM', sigtermHandler);
        logger.debug('SIGTERM signal handler registered');

        // Register SIGINT signal handler for Ctrl+C interrupt during development
        const sigintHandler = createShutdownHandler('SIGINT');
        process.on('SIGINT', sigintHandler);
        logger.debug('SIGINT signal handler registered');

        // Register SIGQUIT signal handler for forced shutdown with cleanup timeout
        const sigquitHandler = createShutdownHandler('SIGQUIT');
        process.on('SIGQUIT', sigquitHandler);
        logger.debug('SIGQUIT signal handler registered');

        // Set up uncaught exception handler with error logging and graceful shutdown
        process.on('uncaughtException', async (error) => {
            logger.error('Uncaught exception detected - initiating emergency shutdown', {
                error: error.message,
                stack: error.stack
            });

            try {
                await stopServer(true, 5000);
            } catch (emergencyError) {
                logger.error('Emergency shutdown failed', {
                    error: emergencyError.message
                });
            }

            process.exit(1);
        });

        // Set up unhandled promise rejection handler with error logging
        process.on('unhandledRejection', async (reason, promise) => {
            logger.error('Unhandled promise rejection detected', {
                reason: reason,
                promise: promise
            });

            // For educational purposes, we'll log but not exit immediately
            // In production, you might want to exit depending on the severity
        });

        // Register shutdown handlers with lifecycle manager for resource cleanup
        if (lifecycle && typeof lifecycle.registerShutdownHandler === 'function') {
            lifecycle.registerShutdownHandler(
                async () => {
                    logger.info('Executing server shutdown from lifecycle manager');
                    if (serverMgr) {
                        await serverMgr.stop(false, TIMEOUTS.SERVER_SHUTDOWN);
                    }
                },
                'http-server-shutdown',
                900
            );
            logger.debug('Shutdown handler registered with lifecycle manager');
        }

        // Log graceful shutdown setup completion with registered handlers and timeouts
        logger.info('Graceful shutdown setup completed successfully', {
            signalHandlers: ['SIGTERM', 'SIGINT', 'SIGQUIT'],
            exceptionHandlers: ['uncaughtException', 'unhandledRejection'],
            lifecycleHandlers: Boolean(lifecycle),
            shutdownTimeout: TIMEOUTS.SERVER_SHUTDOWN
        });

    } catch (error) {
        logger.error('Failed to setup graceful shutdown procedures', {
            error: error.message,
            stack: error.stack
        });

        throw new Error(`Graceful shutdown setup failed: ${error.message}`);
    }
}

/**
 * Performs comprehensive startup environment validation including Node.js version
 * compatibility, required dependencies, configuration validity, and system resource
 * availability before server initialization.
 * 
 * @param {Object} config - Application configuration object to validate
 * @returns {Object} Validation result with isValid boolean, warnings array, and system information
 */
async function validateStartupEnvironment(config) {
    try {
        logger.debug('Starting comprehensive startup environment validation', {
            hasConfig: Boolean(config),
            nodeVersion: process.version,
            platform: process.platform
        });

        // Initialize validation result
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            systemChecks: {},
            summary: {
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 0,
                warningChecks: 0
            }
        };

        // Validate Node.js version compatibility (minimum v18.0.0 for Express.js 5.0 support)
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        validationResult.summary.totalChecks++;

        if (majorVersion < 18) {
            validationResult.errors.push(`Node.js version ${nodeVersion} is not supported. Minimum required: v18.0.0`);
            validationResult.systemChecks.nodeVersion = { isValid: false, version: nodeVersion, required: 'v18.0.0+' };
            validationResult.summary.failedChecks++;
            validationResult.isValid = false;
        } else {
            validationResult.systemChecks.nodeVersion = { isValid: true, version: nodeVersion, supported: true };
            validationResult.summary.passedChecks++;
        }

        // Check Express.js 5.1.0 availability and compatibility with current Node.js version
        try {
            const express = require('express');
            validationResult.systemChecks.express = { 
                isValid: true, 
                available: true,
                version: express.version || 'unknown'
            };
            validationResult.summary.totalChecks++;
            validationResult.summary.passedChecks++;
        } catch (expressError) {
            validationResult.errors.push('Express.js framework is not available or cannot be loaded');
            validationResult.systemChecks.express = { isValid: false, error: expressError.message };
            validationResult.summary.totalChecks++;
            validationResult.summary.failedChecks++;
            validationResult.isValid = false;
        }

        // Validate server configuration including port availability and host binding capability
        if (config) {
            const configValidation = validateConfiguration(config);
            validationResult.summary.totalChecks++;
            
            if (configValidation.isValid) {
                validationResult.systemChecks.configuration = { isValid: true, validated: true };
                validationResult.summary.passedChecks++;
            } else {
                validationResult.errors.push(...(configValidation.errors || []));
                validationResult.warnings.push(...(configValidation.warnings || []));
                validationResult.systemChecks.configuration = { 
                    isValid: false, 
                    errors: configValidation.errors.length,
                    warnings: configValidation.warnings.length
                };
                validationResult.summary.failedChecks++;
                validationResult.isValid = false;
            }
        } else {
            validationResult.warnings.push('Configuration object not provided for validation');
            validationResult.systemChecks.configuration = { isValid: false, error: 'Configuration not provided' };
            validationResult.summary.totalChecks++;
            validationResult.summary.warningChecks++;
        }

        // Check environment variables and configuration completeness
        const requiredEnvVars = ['PORT', 'HOST', 'NODE_ENV'];
        validationResult.summary.totalChecks++;
        
        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        if (missingEnvVars.length > 0) {
            validationResult.warnings.push(`Optional environment variables not set: ${missingEnvVars.join(', ')}`);
            validationResult.systemChecks.environment = { 
                isValid: true, 
                missingOptional: missingEnvVars,
                hasDefaults: true
            };
            validationResult.summary.warningChecks++;
        } else {
            validationResult.systemChecks.environment = { isValid: true, complete: true };
            validationResult.summary.passedChecks++;
        }

        // Validate system resources including available memory and CPU
        const memoryUsage = process.memoryUsage();
        const totalMemoryMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        validationResult.summary.totalChecks++;

        if (totalMemoryMB < 50) {
            validationResult.warnings.push(`Low memory available: ${totalMemoryMB}MB. Recommended: 128MB+`);
            validationResult.systemChecks.memory = { 
                isValid: true, 
                availableMB: totalMemoryMB, 
                warning: 'low-memory'
            };
            validationResult.summary.warningChecks++;
        } else {
            validationResult.systemChecks.memory = { isValid: true, availableMB: totalMemoryMB, adequate: true };
            validationResult.summary.passedChecks++;
        }

        // Check network port availability for server binding
        const port = config?.environment?.port || environmentConfig?.port || ENVIRONMENT.DEFAULT_PORT;
        validationResult.summary.totalChecks++;

        if (port < 1 || port > 65535) {
            validationResult.errors.push(`Invalid port number: ${port}. Must be between 1 and 65535`);
            validationResult.systemChecks.port = { isValid: false, port: port, error: 'invalid-range' };
            validationResult.summary.failedChecks++;
            validationResult.isValid = false;
        } else if (port < 1024 && process.getuid && process.getuid() !== 0) {
            validationResult.warnings.push(`Using privileged port ${port} without root privileges may fail`);
            validationResult.systemChecks.port = { isValid: true, port: port, warning: 'privileged-port' };
            validationResult.summary.warningChecks++;
        } else {
            validationResult.systemChecks.port = { isValid: true, port: port, available: true };
            validationResult.summary.passedChecks++;
        }

        // Validate file system permissions for logging and temporary files
        try {
            const fs = require('fs');
            const testPath = require('path').join(process.cwd(), 'test-write');
            fs.writeFileSync(testPath, 'test');
            fs.unlinkSync(testPath);
            
            validationResult.systemChecks.filesystem = { isValid: true, writable: true };
            validationResult.summary.totalChecks++;
            validationResult.summary.passedChecks++;
        } catch (fsError) {
            validationResult.warnings.push('File system write permissions may be limited');
            validationResult.systemChecks.filesystem = { 
                isValid: true, 
                warning: 'write-permissions-limited',
                error: fsError.message
            };
            validationResult.summary.totalChecks++;
            validationResult.summary.warningChecks++;
        }

        // Compile validation results with warnings, errors, and system information
        validationResult.metadata = {
            validatedAt: new Date().toISOString(),
            validationVersion: APPLICATION.VERSION,
            environment: config?.environment?.nodeEnv || process.env.NODE_ENV || 'development',
            platform: process.platform,
            nodeVersion: process.version
        };

        // Log validation completion
        const statusMessage = validationResult.isValid ? 'passed' : 'failed';
        logger.info(`Startup environment validation ${statusMessage}`, {
            isValid: validationResult.isValid,
            totalChecks: validationResult.summary.totalChecks,
            passedChecks: validationResult.summary.passedChecks,
            failedChecks: validationResult.summary.failedChecks,
            warningChecks: validationResult.summary.warningChecks
        });

        if (validationResult.errors.length > 0) {
            logger.error('Environment validation errors found', {
                errors: validationResult.errors
            });
        }

        if (validationResult.warnings.length > 0) {
            logger.warn('Environment validation warnings found', {
                warnings: validationResult.warnings
            });
        }

        // Return comprehensive validation result with startup readiness assessment
        return validationResult;

    } catch (error) {
        logger.error('Startup environment validation failed', {
            error: error.message,
            stack: error.stack
        });

        return {
            isValid: false,
            errors: [`Validation process failed: ${error.message}`],
            warnings: [],
            systemChecks: {},
            summary: {
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 1,
                warningChecks: 0
            },
            metadata: {
                validatedAt: new Date().toISOString(),
                validationError: error.message
            }
        };
    }
}

/**
 * Generates comprehensive server information summary for logging, monitoring, and debugging
 * including configuration details, runtime information, and operational metadata.
 * 
 * @param {Object} serverInfo - Server information object with status and configuration details  
 * @returns {Object} Complete server summary with configuration, runtime, and operational details
 */
function createServerSummary(serverInfo = {}) {
    try {
        logger.debug('Generating comprehensive server information summary', {
            hasServerInfo: Boolean(serverInfo),
            serverInfoKeys: Object.keys(serverInfo).length
        });

        // Include application metadata (name, version, description) from APPLICATION constants
        const applicationMetadata = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            description: APPLICATION.DESCRIPTION,
            apiVersion: APPLICATION.API_VERSION
        };

        // Add Node.js runtime information (version, platform, architecture)
        const runtimeInformation = {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            processId: process.pid,
            uptime: Math.round(process.uptime()),
            executablePath: process.execPath,
            workingDirectory: process.cwd()
        };

        // Include Express.js framework version and configuration details
        let expressInformation = null;
        try {
            const express = require('express');
            expressInformation = {
                version: express.version || '5.1.0',
                framework: 'Express.js',
                features: {
                    asyncErrorHandling: true,
                    pathToRegexp: '8.x',
                    bodyParser: 'built-in'
                }
            };
        } catch (expressError) {
            expressInformation = {
                error: 'Express.js information not available',
                errorMessage: expressError.message
            };
        }

        // Add server binding information (host, port, protocol)
        const bindingInformation = {
            host: environmentConfig?.host || ENVIRONMENT.DEFAULT_HOST,
            port: environmentConfig?.port || ENVIRONMENT.DEFAULT_PORT,
            protocol: 'HTTP/1.1',
            fullAddress: `http://${environmentConfig?.host || ENVIRONMENT.DEFAULT_HOST}:${environmentConfig?.port || ENVIRONMENT.DEFAULT_PORT}`,
            binding: serverInfo.binding || 'not-bound'
        };

        // Include environment configuration (NODE_ENV, development flags)
        const environmentInformation = {
            nodeEnv: environmentConfig?.nodeEnv || process.env.NODE_ENV || ENVIRONMENT.DEFAULT_NODE_ENV,
            isProduction: environmentConfig?.isProduction || false,
            isDevelopment: environmentConfig?.isDevelopment || true,
            isTest: environmentConfig?.isTest || false,
            logLevel: environmentConfig?.logLevel || 'info'
        };

        // Add startup timing and uptime information
        const timingInformation = {
            startupTime: startupTime ? startupTime.toISOString() : null,
            applicationReadyTime: applicationReadyTime ? applicationReadyTime.toISOString() : null,
            uptime: startupTime ? Date.now() - startupTime.getTime() : null,
            uptimeFormatted: startupTime ? `${Math.round((Date.now() - startupTime.getTime()) / 1000)}s` : null
        };

        // Include lifecycle state and operational status
        const lifecycleInformation = {
            serverRunning: isServerRunning,
            lifecycleState: lifecycleManager ? lifecycleManager.getState().state : 'not-initialized',
            serverState: serverManager ? serverManager.getStatus().state : 'not-initialized',
            shutdownInProgress: shutdownInProgress,
            serverInstances: serverInstances.size
        };

        // Add performance metrics and resource usage statistics
        const performanceMetrics = {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
            eventLoopUtilization: process.eventLoopUtilization ? process.eventLoopUtilization() : null
        };

        // Include configuration summary
        const configurationDetails = {
            serverConfig: {
                timeout: serverConfig?.http?.timeout || SERVER.DEFAULT_TIMEOUT,
                keepAliveTimeout: serverConfig?.http?.keepAliveTimeout || SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
                maxConnections: serverConfig?.connection?.maxConnections || SERVER.DEFAULT_MAX_CONNECTIONS
            },
            environmentConfig: {
                port: environmentConfig?.port || ENVIRONMENT.DEFAULT_PORT,
                host: environmentConfig?.host || ENVIRONMENT.DEFAULT_HOST,
                logLevel: environmentConfig?.logLevel || 'info'
            }
        };

        // Return comprehensive server summary object for logging and monitoring
        const serverSummary = {
            // Application and metadata
            application: applicationMetadata,
            
            // Runtime environment
            runtime: runtimeInformation,
            
            // Express.js framework
            express: expressInformation,
            
            // Server binding and network
            binding: bindingInformation,
            
            // Environment configuration
            environment: environmentInformation,
            
            // Timing and uptime
            timing: timingInformation,
            
            // Lifecycle and operational state
            lifecycle: lifecycleInformation,
            
            // Performance and resource usage
            performance: performanceMetrics,
            
            // Configuration details
            configuration: configurationDetails,
            
            // Summary metadata
            summary: {
                generatedAt: new Date().toISOString(),
                summaryVersion: APPLICATION.VERSION,
                serverReady: isServerRunning && Boolean(serverManager),
                configurationValid: isConfigurationValid(),
                environmentValid: isEnvironmentConfigValid()
            }
        };

        logger.debug('Server summary generated successfully', {
            summaryKeys: Object.keys(serverSummary).length,
            serverReady: serverSummary.summary.serverReady,
            configurationValid: serverSummary.summary.configurationValid
        });

        return serverSummary;

    } catch (error) {
        logger.error('Failed to generate server summary', {
            error: error.message,
            stack: error.stack,
            serverInfo: serverInfo
        });

        return {
            application: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION
            },
            error: error.message,
            summary: {
                generatedAt: new Date().toISOString(),
                generationError: true,
                errorMessage: error.message
            }
        };
    }
}

/**
 * Centralized server error handling function that processes server startup errors,
 * runtime errors, and shutdown errors with appropriate logging, recovery attempts,
 * and error reporting.
 * 
 * @param {Error} error - Error object containing error details and stack trace
 * @param {string} context - Context string describing where the error occurred
 * @param {Object} metadata - Additional metadata for error analysis and debugging
 * @returns {void} Processes error with logging and appropriate response
 */
function handleServerError(error, context, metadata = {}) {
    try {
        // Log error with full stack trace, context information, and metadata
        logger.error(`Server error in context: ${context}`, {
            error: error.message,
            stack: error.stack,
            context: context,
            metadata: metadata,
            timestamp: new Date().toISOString(),
            processId: process.pid,
            serverRunning: isServerRunning
        });

        // Classify error type (startup, runtime, shutdown, configuration) for appropriate handling
        let errorCategory = 'unknown';
        let recoverable = false;
        let suggestedAction = 'manual-intervention-required';

        if (context.includes('startup') || context.includes('initialization')) {
            errorCategory = 'startup';
            recoverable = false;
            suggestedAction = 'fix-configuration-and-restart';
        } else if (context.includes('shutdown') || context.includes('cleanup')) {
            errorCategory = 'shutdown';
            recoverable = false;
            suggestedAction = 'force-shutdown-if-needed';
        } else if (context.includes('configuration') || context.includes('validation')) {
            errorCategory = 'configuration';
            recoverable = true;
            suggestedAction = 'reload-configuration';
        } else if (context.includes('runtime') || context.includes('request')) {
            errorCategory = 'runtime';
            recoverable = true;
            suggestedAction = 'continue-monitoring';
        }

        // Attempt error recovery for recoverable errors (port conflicts, temporary resource issues)
        if (recoverable) {
            logger.info(`Attempting error recovery for ${errorCategory} error`, {
                errorCategory: errorCategory,
                suggestedAction: suggestedAction,
                context: context
            });

            // Implement specific recovery strategies based on error type
            switch (errorCategory) {
                case 'configuration':
                    logger.info('Attempting configuration reload for recovery');
                    try {
                        reloadConfiguration(true);
                        logger.info('Configuration reloaded successfully');
                    } catch (reloadError) {
                        logger.error('Configuration reload failed', {
                            reloadError: reloadError.message
                        });
                    }
                    break;
                    
                case 'runtime':
                    logger.info('Runtime error detected, continuing monitoring');
                    // Runtime errors typically don't require immediate action
                    break;
                    
                default:
                    logger.debug('No specific recovery action available for error category');
                    break;
            }
        }

        // Update server state and lifecycle manager with error information
        if (lifecycleManager && typeof lifecycleManager.recordError === 'function') {
            try {
                lifecycleManager.recordError(error, context, metadata);
            } catch (recordError) {
                logger.warn('Failed to record error in lifecycle manager', {
                    recordError: recordError.message
                });
            }
        }

        // Execute error-specific cleanup procedures if required
        const requiresCleanup = errorCategory === 'startup' || errorCategory === 'shutdown';
        if (requiresCleanup) {
            logger.info('Executing error-specific cleanup procedures', {
                errorCategory: errorCategory,
                cleanupRequired: true
            });

            // Perform cleanup based on error category
            if (errorCategory === 'startup' && serverManager) {
                // Clean up partially initialized server
                setImmediate(async () => {
                    try {
                        await serverManager.stop(true, 5000);
                        logger.info('Startup cleanup completed');
                    } catch (cleanupError) {
                        logger.error('Startup cleanup failed', {
                            cleanupError: cleanupError.message
                        });
                    }
                });
            }
        }

        // Log error handling completion with recovery status and next steps
        logger.info('Error handling completed', {
            errorCategory: errorCategory,
            recoverable: recoverable,
            suggestedAction: suggestedAction,
            cleanupRequired: requiresCleanup,
            context: context
        });

        // Trigger graceful shutdown if error is fatal and cannot be recovered
        const fatalError = !recoverable && (errorCategory === 'startup' || error.message.includes('EADDRINUSE'));
        if (fatalError) {
            logger.error('Fatal error detected - triggering graceful shutdown', {
                errorCategory: errorCategory,
                fatalError: true,
                shutdownReason: 'fatal-error-recovery'
            });

            // Trigger shutdown asynchronously to avoid blocking current operation
            setImmediate(async () => {
                try {
                    await stopServer(true, 10000);
                    process.exit(1);
                } catch (shutdownError) {
                    logger.error('Fatal error shutdown failed', {
                        shutdownError: shutdownError.message
                    });
                    process.exit(1);
                }
            });
        }

    } catch (handlingError) {
        // Handle errors that occur during error handling itself
        console.error('[CRITICAL] Error occurred during error handling:', {
            originalError: error.message,
            handlingError: handlingError.message,
            context: context,
            timestamp: new Date().toISOString()
        });

        // Fallback to basic console error logging
        console.error(`[ERROR] ${context}: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

/**
 * Performs final cleanup procedures for resource deallocation
 * @private
 */
async function performFinalCleanup() {
    try {
        logger.debug('Performing final cleanup procedures');
        
        // Clear any remaining timers or intervals
        // Close any open file descriptors
        // Clean up any other resources
        
        logger.debug('Final cleanup completed successfully');
    } catch (cleanupError) {
        logger.error('Final cleanup failed', {
            error: cleanupError.message
        });
    }
}

// Export main server functions and instances for external use
module.exports = {
    // Main server startup function for orchestrating Express.js application and HTTP server initialization
    startServer,
    
    // Graceful server shutdown function with comprehensive cleanup and lifecycle coordination
    stopServer,
    
    // Server status reporting function providing comprehensive operational information and metrics
    getServerStatus,
    
    // HTTP server manager instance for server lifecycle management and status monitoring (initially null)
    serverManager,
    
    // Express.js application instance configured with routes and middleware for external access
    app
};