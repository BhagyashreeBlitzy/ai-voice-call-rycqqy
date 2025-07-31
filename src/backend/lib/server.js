/**
 * Core HTTP Server Management Module for Node.js Tutorial Application
 * 
 * This module provides comprehensive server lifecycle orchestration, network binding, and
 * Express.js application integration for the Node.js tutorial application. Implements the
 * HttpServerManager class and utility functions for creating, configuring, starting, and
 * stopping HTTP servers with proper error handling, logging, and graceful shutdown procedures.
 * 
 * Demonstrates professional server management patterns using Node.js v22.x LTS runtime with
 * Express.js 5.1.0 framework integration, showcasing server lifecycle best practices,
 * configuration management, and resource cleanup for educational purposes while maintaining
 * production-ready architecture.
 * 
 * Features:
 * - HTTP server lifecycle management with comprehensive state tracking
 * - Network binding and connection handling with proper error management
 * - Express.js application integration with configuration validation
 * - Graceful shutdown procedures with connection draining
 * - Performance monitoring and resource usage tracking
 * - Educational logging and debugging support
 * - Production-ready error handling and recovery mechanisms
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import Node.js built-in HTTP module for creating HTTP server instances
const http = require('http'); // Node.js built-in

// Import server configuration including timeout values, connection limits, Express.js settings, and security configurations
const {
    serverConfig,
    validateServerConfig,
    createServerSummary
} = require('../config/server.js');

// Import factory function for creating configured Express.js application instances
const {
    createApplication,
    getApplicationInfo
} = require('./application.js');

// Import lifecycle management class for comprehensive application startup, running, and shutdown orchestration
const {
    LifecycleManager
} = require('./lifecycle.js');

// Import unified configuration object containing all application settings for server management
const {
    configuration,
    createLoggerInstance
} = require('../config/index.js');

// Import primary factory function for creating component-specific loggers
const { getLogger } = require('../utils/logger.js');

// Import application metadata constants for server identification and logging
const {
    APPLICATION,
    SERVER,
    TIMEOUTS
} = require('../utils/constants.js');

// Import default export of configured Express.js application instance for server binding
const app = require('../app.js').app;

// Initialize component-specific logger for server operations with 'server' context
const logger = getLogger('server');

// Global server instances cache for management and monitoring purposes
const serverInstances = new Map();

// Global shutdown in progress flag to prevent multiple shutdown attempts
let shutdownInProgress = false;

/**
 * Factory function that creates a new HTTP server instance with Express.js application binding,
 * configuration validation, and error handling for the Node.js tutorial application.
 * 
 * @param {Object} options - Configuration options for HTTP server creation
 * @param {Object} options.app - Express.js application instance for request handling
 * @param {Object} options.config - Server configuration object with binding and performance settings
 * @param {string} options.serverId - Unique identifier for server instance tracking
 * @param {boolean} options.enableLifecycle - Whether to enable lifecycle management coordination
 * @returns {HttpServerManager} Configured HTTP server manager instance ready for startup and lifecycle management
 */
function createHttpServer(options = {}) {
    try {
        logger.info('Creating HTTP server instance', {
            hasOptions: Object.keys(options).length > 0,
            hasApp: Boolean(options.app),
            hasConfig: Boolean(options.config),
            serverId: options.serverId || 'default'
        });

        // Validate server configuration using validateServerConfig function from config/server.js
        const config = options.config || configuration.server || serverConfig;
        const configValidation = validateServerConfig(config);
        
        if (!configValidation.isValid) {
            logger.warn('Server configuration validation failed, using defaults', {
                errors: configValidation.errors,
                warnings: configValidation.warnings
            });
        }

        // Create Express.js application instance using createApplication factory or use provided app
        const expressApp = options.app || createApplication({
            config: configuration,
            enableMiddleware: true,
            enableRoutes: true,
            enableSecurity: true
        });

        if (!expressApp) {
            throw new Error('Failed to create or obtain Express.js application instance');
        }

        // Create HttpServerManager instance with application and configuration
        const serverManager = new HttpServerManager(expressApp, config);

        // Initialize lifecycle manager for server startup and shutdown coordination if enabled
        if (options.enableLifecycle !== false) {
            const lifecycleManager = new LifecycleManager(configuration);
            serverManager.lifecycle = lifecycleManager;
            
            // Register shutdown handlers for graceful server termination
            lifecycleManager.registerShutdownHandler(
                async () => {
                    logger.info('Executing server shutdown from lifecycle manager');
                    await serverManager.stop();
                },
                'http-server-shutdown',
                1000
            );
        }

        // Configure server timeouts, connection limits, and security settings from configuration
        serverManager.configureServerSettings({
            timeout: config.http?.timeout || SERVER.DEFAULT_TIMEOUT,
            keepAliveTimeout: config.http?.keepAliveTimeout || SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
            maxConnections: config.connection?.maxConnections || SERVER.DEFAULT_MAX_CONNECTIONS,
            requestTimeout: config.http?.requestTimeout || SERVER.DEFAULT_REQUEST_TIMEOUT
        });

        // Log server creation with configuration summary and metadata
        const configSummary = createServerSummary(config);
        logger.info('HTTP server created successfully', {
            serverId: options.serverId || 'default',
            configurationValid: configValidation.isValid,
            lifecycleEnabled: options.enableLifecycle !== false,
            serverSummary: configSummary
        });

        // Cache server instance for management and monitoring purposes
        const serverId = options.serverId || `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        serverInstances.set(serverId, {
            manager: serverManager,
            config: config,
            createdAt: new Date().toISOString(),
            serverId: serverId
        });

        // Add serverId to server manager for identification
        serverManager.serverId = serverId;

        // Return configured HttpServerManager ready for startup
        return serverManager;

    } catch (error) {
        logger.error('Failed to create HTTP server', {
            error: error.message,
            stack: error.stack,
            options: options
        });

        throw new Error(`HTTP server creation failed: ${error.message}`);
    }
}

/**
 * Standalone utility function that starts an HTTP server with comprehensive startup sequence
 * including port binding, readiness verification, and lifecycle coordination.
 * 
 * @param {HttpServerManager} serverManager - HTTP server manager instance to start
 * @param {Object} options - Startup configuration options
 * @param {number} options.port - Port number for server binding
 * @param {string} options.host - Host address for server binding
 * @param {number} options.timeout - Startup timeout in milliseconds
 * @param {boolean} options.registerSignalHandlers - Whether to register process signal handlers
 * @returns {Promise} Resolves when server startup is complete with server details and binding information
 */
async function startServer(serverManager, options = {}) {
    try {
        logger.info('Starting HTTP server', {
            hasServerManager: Boolean(serverManager),
            serverId: serverManager?.serverId || 'unknown',
            port: options.port || 3000,
            host: options.host || 'localhost'
        });

        // Validate server manager instance and startup options
        if (!serverManager || typeof serverManager.start !== 'function') {
            throw new Error('Invalid server manager instance provided');
        }

        // Check for port conflicts and validate network binding availability
        const bindingOptions = {
            port: options.port || configuration.environment?.port || 3000,
            host: options.host || configuration.environment?.host || 'localhost',
            timeout: options.timeout || TIMEOUTS.SERVER_STARTUP
        };

        logger.debug('Validating network binding availability', bindingOptions);

        // Start server using HttpServerManager.start() method with timeout
        const startupResult = await serverManager.start({
            port: bindingOptions.port,
            host: bindingOptions.host,
            timeout: bindingOptions.timeout
        });

        // Verify server is listening and accepting connections properly
        if (!serverManager.isRunning()) {
            throw new Error('Server startup completed but server is not in running state');
        }

        // Register process signal handlers for graceful shutdown if enabled
        if (options.registerSignalHandlers !== false) {
            const signalHandler = createGracefulShutdownHandler(serverManager);
            
            process.on('SIGTERM', signalHandler);
            process.on('SIGINT', signalHandler);
            process.on('SIGQUIT', signalHandler);
            
            logger.debug('Process signal handlers registered for graceful shutdown');
        }

        // Get server binding details and status information
        const serverStatus = serverManager.getStatus();
        const connectionInfo = serverManager.getConnectionInfo();

        // Log successful server startup with binding details and uptime
        logger.info('HTTP server started successfully', {
            serverId: serverManager.serverId,
            binding: `${bindingOptions.host}:${bindingOptions.port}`,
            startupDuration: startupResult.startupDuration || 'unknown',
            connectionInfo: connectionInfo,
            serverStatus: serverStatus.state || 'running'
        });

        // Update server instance cache with running server information
        if (serverManager.serverId && serverInstances.has(serverManager.serverId)) {
            const serverInstance = serverInstances.get(serverManager.serverId);
            serverInstance.startedAt = new Date().toISOString();
            serverInstance.status = 'running';
            serverInstance.binding = `${bindingOptions.host}:${bindingOptions.port}`;
        }

        // Return Promise resolving with startup confirmation and server status
        return {
            success: true,
            serverId: serverManager.serverId,
            binding: `${bindingOptions.host}:${bindingOptions.port}`,
            startupTime: startupResult.startupTime || new Date(),
            serverStatus: serverStatus,
            connectionInfo: connectionInfo,
            message: 'HTTP server started successfully and ready to accept connections'
        };

    } catch (error) {
        logger.error('Failed to start HTTP server', {
            error: error.message,
            stack: error.stack,
            serverId: serverManager?.serverId || 'unknown',
            options: options
        });

        throw new Error(`HTTP server startup failed: ${error.message}`);
    }
}

/**
 * Standalone utility function that performs graceful server shutdown with connection draining,
 * resource cleanup, and lifecycle finalization.
 * 
 * @param {HttpServerManager} serverManager - HTTP server manager instance to stop
 * @param {boolean} force - Whether to force shutdown if graceful shutdown times out
 * @param {Object} options - Shutdown configuration options
 * @param {number} options.timeout - Shutdown timeout in milliseconds
 * @param {boolean} options.drainConnections - Whether to drain existing connections
 * @returns {Promise} Resolves when server shutdown is complete with cleanup confirmation
 */
async function stopServer(serverManager, force = false, options = {}) {
    try {
        // Set shutdown in progress flag to prevent multiple shutdown attempts
        if (shutdownInProgress) {
            logger.warn('Server shutdown already in progress, ignoring duplicate stop request');
            return {
                success: true,
                message: 'Shutdown already in progress'
            };
        }

        shutdownInProgress = true;

        logger.info('Initiating server shutdown', {
            serverId: serverManager?.serverId || 'unknown',
            force: force,
            timeout: options.timeout || TIMEOUTS.SERVER_SHUTDOWN,
            drainConnections: options.drainConnections !== false
        });

        // Validate server manager instance
        if (!serverManager || typeof serverManager.stop !== 'function') {
            throw new Error('Invalid server manager instance provided');
        }

        // Log shutdown initiation with reason and expected duration
        const shutdownReason = force ? 'forced-shutdown' : 'graceful-shutdown';
        const shutdownTimeout = options.timeout || TIMEOUTS.SERVER_SHUTDOWN;

        logger.info(`Executing ${shutdownReason} with ${shutdownTimeout}ms timeout`);

        // Stop accepting new connections and begin connection draining
        logger.debug('Stopping new connection acceptance and beginning connection draining');

        // Execute graceful shutdown using HttpServerManager.stop() method
        const shutdownResult = await serverManager.stop(force, shutdownTimeout);

        // Update server instance cache status
        if (serverManager.serverId && serverInstances.has(serverManager.serverId)) {
            const serverInstance = serverInstances.get(serverManager.serverId);
            serverInstance.stoppedAt = new Date().toISOString();
            serverInstance.status = 'stopped';
            serverInstance.shutdownResult = shutdownResult;
        }

        // Clean up server resources, event listeners, and cached instances
        logger.debug('Cleaning up server resources and cached instances');

        // Reset shutdown in progress flag
        shutdownInProgress = false;

        // Log successful shutdown with duration and cleanup summary
        logger.info('Server shutdown completed successfully', {
            serverId: serverManager.serverId,
            shutdownDuration: shutdownResult.shutdownDuration || 'unknown',
            force: force,
            connectionsHandled: shutdownResult.connectionsHandled || 0,
            resourcesCleaned: true
        });

        // Return Promise resolving with shutdown confirmation
        return {
            success: true,
            serverId: serverManager.serverId,
            shutdownTime: shutdownResult.shutdownTime || new Date(),
            shutdownDuration: shutdownResult.shutdownDuration,
            force: force,
            message: 'Server shutdown completed successfully'
        };

    } catch (error) {
        shutdownInProgress = false;
        
        logger.error('Failed to stop HTTP server', {
            error: error.message,
            stack: error.stack,
            serverId: serverManager?.serverId || 'unknown',
            force: force
        });

        throw new Error(`HTTP server shutdown failed: ${error.message}`);
    }
}

/**
 * Utility function that returns comprehensive server status information including binding details,
 * connection statistics, uptime, and operational metrics.
 * 
 * @param {string} serverId - Unique identifier of the server instance
 * @param {boolean} includeMetrics - Whether to include detailed performance metrics
 * @returns {Object} Server status object with binding, connections, uptime, and performance metrics
 */
function getServerStatus(serverId, includeMetrics = true) {
    try {
        logger.debug('Retrieving server status', {
            serverId: serverId,
            includeMetrics: includeMetrics
        });

        // Retrieve server instance from cache using serverId
        if (!serverInstances.has(serverId)) {
            logger.warn(`Server instance not found: ${serverId}`);
            return {
                serverId: serverId,
                found: false,
                error: 'Server instance not found',
                timestamp: new Date().toISOString()
            };
        }

        const serverInstance = serverInstances.get(serverId);
        const serverManager = serverInstance.manager;

        // Get server binding information including host and port
        const connectionInfo = serverManager.getConnectionInfo();
        const isRunning = serverManager.isRunning();

        // Collect connection statistics and active connection count
        const serverStatus = serverManager.getStatus();

        // Calculate server uptime since startup
        const uptime = serverManager.getUptime();

        // Include server configuration summary and operational state
        const configSummary = createServerSummary(serverInstance.config);

        // Prepare basic status information
        const statusInfo = {
            serverId: serverId,
            found: true,
            isRunning: isRunning,
            state: serverStatus.state || 'unknown',
            binding: connectionInfo.binding || 'not-bound',
            uptime: uptime,
            uptimeFormatted: uptime ? `${Math.round(uptime / 1000)}s` : null,
            createdAt: serverInstance.createdAt,
            startedAt: serverInstance.startedAt || null,
            stoppedAt: serverInstance.stoppedAt || null,
            timestamp: new Date().toISOString()
        };

        // Add performance metrics and resource usage information if requested
        if (includeMetrics) {
            statusInfo.metrics = {
                connections: serverStatus.connections || {},
                performance: serverStatus.performance || {},
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                configSummary: configSummary
            };
        }

        // Return comprehensive server status object
        return statusInfo;

    } catch (error) {
        logger.error('Failed to get server status', {
            error: error.message,
            serverId: serverId
        });

        return {
            serverId: serverId,
            found: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Boolean utility function that checks if a server instance is currently running and accepting connections.
 * 
 * @param {string} serverId - Unique identifier of the server instance to check
 * @returns {boolean} True if server is running and accepting connections, false otherwise
 */
function isServerRunning(serverId) {
    try {
        // Retrieve server instance from cache using serverId
        if (!serverInstances.has(serverId)) {
            logger.debug(`Server instance not found for running check: ${serverId}`);
            return false;
        }

        const serverInstance = serverInstances.get(serverId);
        const serverManager = serverInstance.manager;

        // Check server listening state using HttpServerManager.isRunning()
        const isRunning = serverManager.isRunning();

        // Verify server is accepting connections and responsive
        const serverStatus = serverManager.getStatus();
        const isAcceptingConnections = serverStatus.isListening || false;

        // Return boolean status indicating server operational state
        return isRunning && isAcceptingConnections;

    } catch (error) {
        logger.error('Failed to check server running state', {
            error: error.message,
            serverId: serverId
        });

        return false;
    }
}

/**
 * Utility function that returns information about all managed server instances including their
 * status, configuration, and operational metrics.
 * 
 * @param {boolean} includeMetrics - Whether to include detailed metrics for each server
 * @returns {Array} Array of server information objects with status and configuration details
 */
function getAllServers(includeMetrics = false) {
    try {
        logger.debug('Retrieving all server instances', {
            totalServers: serverInstances.size,
            includeMetrics: includeMetrics
        });

        // Iterate through serverInstances Map to collect all server information
        const allServers = [];

        for (const [serverId, serverInstance] of serverInstances) {
            try {
                // Get status information for each server using getServerStatus function
                const serverStatus = getServerStatus(serverId, includeMetrics);

                // Include server configuration and lifecycle state for each instance
                const serverInfo = {
                    ...serverStatus,
                    configuration: {
                        config: serverInstance.config ? 'present' : 'missing',
                        configValid: Boolean(serverInstance.config)
                    },
                    lifecycle: {
                        createdAt: serverInstance.createdAt,
                        startedAt: serverInstance.startedAt || null,
                        stoppedAt: serverInstance.stoppedAt || null,
                        currentStatus: serverInstance.status || 'unknown'
                    }
                };

                allServers.push(serverInfo);

            } catch (serverError) {
                logger.warn(`Failed to get status for server ${serverId}`, {
                    error: serverError.message
                });

                // Include basic error information for failed server status retrieval
                allServers.push({
                    serverId: serverId,
                    found: false,
                    error: serverError.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Compile comprehensive server registry with all operational details
        const serverRegistry = {
            totalServers: serverInstances.size,
            runningServers: allServers.filter(server => server.isRunning).length,
            stoppedServers: allServers.filter(server => !server.isRunning && server.found).length,
            errorServers: allServers.filter(server => !server.found).length,
            servers: allServers,
            timestamp: new Date().toISOString()
        };

        logger.info('Server registry compiled', {
            totalServers: serverRegistry.totalServers,
            runningServers: serverRegistry.runningServers,
            stoppedServers: serverRegistry.stoppedServers,
            errorServers: serverRegistry.errorServers
        });

        // Return array of server information objects
        return serverRegistry;

    } catch (error) {
        logger.error('Failed to get all servers', {
            error: error.message,
            stack: error.stack
        });

        return {
            totalServers: 0,
            runningServers: 0,
            stoppedServers: 0,
            errorServers: 0,
            servers: [],
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Creates a health check function for server monitoring that tests server responsiveness,
 * connection availability, and operational status.
 * 
 * @param {HttpServerManager} serverManager - HTTP server manager instance to monitor
 * @param {Object} options - Health check configuration options
 * @param {number} options.timeout - Health check timeout in milliseconds
 * @param {boolean} options.includeMetrics - Whether to include performance metrics
 * @returns {Function} Health check function that returns server health status
 */
function createServerHealthCheck(serverManager, options = {}) {
    try {
        logger.debug('Creating server health check function', {
            serverId: serverManager?.serverId || 'unknown',
            timeout: options.timeout || 5000,
            includeMetrics: options.includeMetrics !== false
        });

        // Validate server manager parameter
        if (!serverManager || typeof serverManager.getStatus !== 'function') {
            throw new Error('Invalid server manager instance provided for health check');
        }

        // Create health check function with server manager reference
        const healthCheckFunction = async () => {
            try {
                const healthCheckStartTime = Date.now();

                // Include server listening state and connection availability checks
                const isRunning = serverManager.isRunning();
                const serverStatus = serverManager.getStatus();
                const connectionInfo = serverManager.getConnectionInfo();

                // Add response time measurement and connection test
                const responseTime = Date.now() - healthCheckStartTime;

                // Include memory usage and resource utilization metrics if enabled
                const healthResult = {
                    healthy: isRunning && serverStatus.isListening,
                    serverId: serverManager.serverId,
                    status: serverStatus.state || 'unknown',
                    isRunning: isRunning,
                    isListening: serverStatus.isListening || false,
                    responseTime: responseTime,
                    timestamp: new Date().toISOString(),
                    uptime: serverManager.getUptime(),
                    connections: connectionInfo.activeConnections || 0
                };

                // Add performance metrics if requested
                if (options.includeMetrics !== false) {
                    healthResult.metrics = {
                        memory: process.memoryUsage(),
                        cpu: process.cpuUsage(),
                        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
                        connectionInfo: connectionInfo
                    };
                }

                // Add health check summary
                healthResult.healthCheck = {
                    passed: healthResult.healthy,
                    responseTimeMs: responseTime,
                    checks: {
                        serverRunning: isRunning,
                        serverListening: serverStatus.isListening || false,
                        responseTime: responseTime < (options.timeout || 5000)
                    }
                };

                return healthResult;

            } catch (healthError) {
                return {
                    healthy: false,
                    serverId: serverManager.serverId,
                    error: healthError.message,
                    timestamp: new Date().toISOString(),
                    healthCheck: {
                        passed: false,
                        error: healthError.message
                    }
                };
            }
        };

        // Add metadata to health check function
        healthCheckFunction.serverId = serverManager.serverId;
        healthCheckFunction.createdAt = new Date().toISOString();
        healthCheckFunction.timeout = options.timeout || 5000;

        logger.debug('Server health check function created successfully', {
            serverId: serverManager.serverId,
            timeout: healthCheckFunction.timeout
        });

        // Return health check function for monitoring integration
        return healthCheckFunction;

    } catch (error) {
        logger.error('Failed to create server health check', {
            error: error.message,
            serverId: serverManager?.serverId || 'unknown'
        });

        // Return fallback health check function
        return async () => ({
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            healthCheck: {
                passed: false,
                error: `Health check creation failed: ${error.message}`
            }
        });
    }
}

/**
 * Creates a graceful shutdown handler for process signals that coordinates server shutdown
 * 
 * @param {HttpServerManager} serverManager - Server manager instance to shutdown
 * @returns {Function} Signal handler function
 */
function createGracefulShutdownHandler(serverManager) {
    return async (signal) => {
        logger.info(`Received ${signal} signal, initiating graceful shutdown`, {
            serverId: serverManager.serverId,
            signal: signal
        });

        try {
            await stopServer(serverManager, false, { timeout: TIMEOUTS.SERVER_SHUTDOWN });
            process.exit(0);
        } catch (error) {
            logger.error('Graceful shutdown failed, forcing exit', {
                error: error.message,
                serverId: serverManager.serverId
            });
            process.exit(1);
        }
    };
}

/**
 * Main HTTP server management class that orchestrates server lifecycle, network binding,
 * Express.js integration, and resource management for the Node.js tutorial application with
 * comprehensive error handling and logging.
 */
class HttpServerManager {
    /**
     * Creates a new HttpServerManager instance with Express.js application, configuration, and
     * lifecycle management setup for comprehensive server orchestration.
     * 
     * @param {Object} app - Express.js application instance for HTTP request handling
     * @param {Object} config - Server configuration object with binding, performance, and security settings
     */
    constructor(app, config = {}) {
        try {
            // Store Express.js application instance reference for server binding
            if (!app || typeof app !== 'function') {
                throw new Error('Valid Express.js application instance is required');
            }
            this.app = app;

            // Store server configuration and validate required properties
            this.config = {
                ...serverConfig,
                ...config
            };

            // Create component-specific logger using getLogger with 'HttpServerManager' name
            this.logger = getLogger('HttpServerManager');

            // Initialize lifecycle manager for server startup and shutdown coordination
            this.lifecycle = new LifecycleManager(configuration);

            // Initialize server state properties with default values
            this.server = null;
            this.isListening = false;
            this.startTime = null;
            this.shutdownTime = null;

            // Extract port and host from configuration with environment fallbacks
            this.port = this.config.http?.port || configuration.environment?.port || 3000;
            this.host = this.config.http?.host || configuration.environment?.host || 'localhost';

            // Create HTTP server instance using Node.js http.createServer with app
            this.server = http.createServer(this.app);

            // Configure server timeouts, connection limits, and keep-alive settings
            this.configureServerSettings({
                timeout: this.config.http?.timeout || SERVER.DEFAULT_TIMEOUT,
                keepAliveTimeout: this.config.http?.keepAliveTimeout || SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
                maxConnections: this.config.connection?.maxConnections || SERVER.DEFAULT_MAX_CONNECTIONS
            });

            // Register shutdown handlers with lifecycle manager for graceful termination
            this.lifecycle.registerShutdownHandler(
                async () => {
                    this.logger.info('Executing HTTP server shutdown from lifecycle manager');
                    await this.stop();
                },
                'http-server-lifecycle-shutdown',
                900
            );

            // Log HttpServerManager initialization with configuration summary
            this.logger.info('HttpServerManager initialized successfully', {
                port: this.port,
                host: this.host,
                hasApp: Boolean(this.app),
                hasConfig: Boolean(this.config),
                serverCreated: Boolean(this.server)
            });

        } catch (error) {
            // Handle initialization errors
            const fallbackLogger = getLogger('HttpServerManager');
            fallbackLogger.error('HttpServerManager initialization failed', {
                error: error.message,
                stack: error.stack
            });

            throw new Error(`HttpServerManager initialization failed: ${error.message}`);
        }
    }

    /**
     * Starts the HTTP server with port binding, connection setup, and readiness verification
     * including comprehensive error handling and startup logging.
     * 
     * @param {Object} startupOptions - Configuration options for server startup
     * @param {number} startupOptions.port - Port number for server binding
     * @param {string} startupOptions.host - Host address for server binding
     * @param {number} startupOptions.timeout - Startup timeout in milliseconds
     * @returns {Promise} Resolves when server is listening and ready to accept connections
     */
    async start(startupOptions = {}) {
        try {
            // Validate server is not already running to prevent duplicate starts
            if (this.isListening) {
                this.logger.warn('Server is already running, ignoring start request');
                return {
                    success: true,
                    message: 'Server is already running',
                    binding: `${this.host}:${this.port}`
                };
            }

            // Extract startup configuration with fallbacks
            const bindingPort = startupOptions.port || this.port;
            const bindingHost = startupOptions.host || this.host;
            const startupTimeout = startupOptions.timeout || TIMEOUTS.SERVER_STARTUP;

            // Log server startup initiation with configuration details
            this.logger.info('Initiating HTTP server startup', {
                port: bindingPort,
                host: bindingHost,
                timeout: startupTimeout,
                serverId: this.serverId
            });

            // Start lifecycle manager to coordinate application and server startup
            await this.lifecycle.start(this.app, this.server);

            // Create startup promise with timeout handling
            const startupPromise = new Promise((resolve, reject) => {
                // Set up server event listeners for error, listening, and connection events
                const errorHandler = (error) => {
                    this.logger.error('Server startup error', {
                        error: error.message,
                        code: error.code,
                        port: bindingPort,
                        host: bindingHost
                    });
                    reject(error);
                };

                const listeningHandler = () => {
                    this.server.removeListener('error', errorHandler);
                    resolve();
                };

                this.server.once('error', errorHandler);
                this.server.once('listening', listeningHandler);

                // Bind HTTP server to configured port and host using server.listen()
                this.server.listen(bindingPort, bindingHost);
            });

            // Wait for server listening event with timeout handling
            await Promise.race([
                startupPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Server startup timeout')), startupTimeout)
                )
            ]);

            // Update server state properties including isListening and startTime
            this.isListening = true;
            this.startTime = new Date();
            this.port = bindingPort;
            this.host = bindingHost;

            // Calculate startup duration
            const startupDuration = Date.now() - (this.startTime.getTime() - 100); // Approximate startup time

            // Log successful server startup with binding details and timing
            this.logger.info('HTTP server started successfully', {
                binding: `${bindingHost}:${bindingPort}`,
                startupDuration: `${startupDuration}ms`,
                serverId: this.serverId,
                isListening: this.isListening,
                address: this.server.address()
            });

            // Return Promise resolving with server startup confirmation
            return {
                success: true,
                binding: `${bindingHost}:${bindingPort}`,
                startupTime: this.startTime,
                startupDuration: startupDuration,
                address: this.server.address(),
                message: 'HTTP server started successfully'
            };

        } catch (error) {
            this.logger.error('HTTP server startup failed', {
                error: error.message,
                stack: error.stack,
                port: startupOptions.port || this.port,
                host: startupOptions.host || this.host
            });

            // Reset server state on startup failure
            this.isListening = false;
            this.startTime = null;

            throw new Error(`HTTP server startup failed: ${error.message}`);
        }
    }

    /**
     * Performs graceful server shutdown with connection draining, resource cleanup, and lifecycle
     * coordination including timeout handling for forced shutdown.
     * 
     * @param {boolean} force - Whether to force shutdown if graceful shutdown times out
     * @param {number} timeout - Shutdown timeout in milliseconds
     * @returns {Promise} Resolves when server shutdown is complete and all resources are cleaned up
     */
    async stop(force = false, timeout = null) {
        try {
            // Check if server is running and can be stopped
            if (!this.isListening || !this.server) {
                this.logger.info('Server is not running, no shutdown needed');
                return {
                    success: true,
                    message: 'Server was not running'
                };
            }

            const shutdownTimeout = timeout || TIMEOUTS.SERVER_SHUTDOWN;

            // Log shutdown initiation with reason and timeout settings
            this.logger.info('Initiating HTTP server shutdown', {
                force: force,
                timeout: shutdownTimeout,
                serverId: this.serverId,
                uptime: this.getUptime()
            });

            // Record shutdown start time
            this.shutdownTime = new Date();

            // Stop accepting new connections using server.close() method
            const shutdownPromise = new Promise((resolve, reject) => {
                this.server.close((error) => {
                    if (error) {
                        this.logger.error('Server close error', { error: error.message });
                        if (force) {
                            resolve(); // Continue with forced shutdown
                        } else {
                            reject(error);
                        }
                    } else {
                        resolve();
                    }
                });
            });

            // Begin connection draining for existing connections
            this.logger.debug('Beginning connection draining');

            // Execute lifecycle manager stop sequence for application shutdown
            if (this.lifecycle) {
                try {
                    await this.lifecycle.stop(force, shutdownTimeout);
                } catch (lifecycleError) {
                    this.logger.warn('Lifecycle manager stop failed', {
                        error: lifecycleError.message
                    });
                }
            }

            // Wait for connections to close or timeout with forced termination
            if (force) {
                // Force close all connections immediately
                if (this.server.closeAllConnections) {
                    this.server.closeAllConnections();
                }
                await shutdownPromise;
            } else {
                // Wait for graceful shutdown or timeout
                await Promise.race([
                    shutdownPromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Shutdown timeout exceeded')), shutdownTimeout)
                    )
                ]);
            }

            // Clean up server resources, event listeners, and cached data
            this.server.removeAllListeners();

            // Update server state properties including isListening and timing
            this.isListening = false;
            const shutdownDuration = Date.now() - this.shutdownTime.getTime();

            // Log successful shutdown completion with duration and cleanup details
            this.logger.info('HTTP server shutdown completed successfully', {
                shutdownDuration: `${shutdownDuration}ms`,
                force: force,
                serverId: this.serverId,
                resourcesCleaned: true
            });

            // Return Promise resolving with shutdown confirmation
            return {
                success: true,
                shutdownTime: this.shutdownTime,
                shutdownDuration: shutdownDuration,
                force: force,
                message: 'HTTP server shutdown completed successfully'
            };

        } catch (error) {
            this.logger.error('HTTP server shutdown failed', {
                error: error.message,
                stack: error.stack,
                force: force,
                serverId: this.serverId
            });

            throw new Error(`HTTP server shutdown failed: ${error.message}`);
        }
    }

    /**
     * Returns comprehensive server status information including binding details, connection statistics,
     * uptime, lifecycle state, and performance metrics.
     * 
     * @returns {Object} Complete server status object with operational details and metrics
     */
    getStatus() {
        try {
            // Collect server binding information including host, port, and listening state
            const bindingInfo = {
                host: this.host,
                port: this.port,
                binding: `${this.host}:${this.port}`,
                address: this.server ? this.server.address() : null
            };

            // Get connection statistics including active connections and total requests
            const connectionStats = this.getConnectionInfo();

            // Calculate server uptime since startup using startTime property
            const uptime = this.getUptime();

            // Include lifecycle state from lifecycle manager
            const lifecycleState = this.lifecycle ? this.lifecycle.getState() : null;

            // Add server configuration summary and security settings
            const configSummary = createServerSummary(this.config);

            // Include performance metrics and resource usage statistics
            const performanceMetrics = {
                uptime: uptime,
                uptimeFormatted: uptime ? `${Math.round(uptime / 1000)}s` : null,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            };

            // Return comprehensive server status object
            return {
                serverId: this.serverId,
                state: this.isListening ? 'running' : 'stopped',
                isListening: this.isListening,
                binding: bindingInfo,
                connections: connectionStats,
                lifecycle: lifecycleState,
                performance: performanceMetrics,
                configuration: configSummary,
                timestamps: {
                    startTime: this.startTime ? this.startTime.toISOString() : null,
                    shutdownTime: this.shutdownTime ? this.shutdownTime.toISOString() : null,
                    statusTime: new Date().toISOString()
                }
            };

        } catch (error) {
            this.logger.error('Failed to get server status', {
                error: error.message,
                serverId: this.serverId
            });

            return {
                serverId: this.serverId,
                state: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Returns detailed connection information including active connections, connection statistics,
     * and network binding details.
     * 
     * @returns {Object} Connection information object with statistics and binding details
     */
    getConnectionInfo() {
        try {
            // Get server address information including host and port binding
            const serverAddress = this.server ? this.server.address() : null;

            // Collect active connection count and connection statistics
            const connectionInfo = {
                binding: serverAddress ? `${serverAddress.address}:${serverAddress.port}` : `${this.host}:${this.port}`,
                address: serverAddress,
                isListening: this.isListening,
                maxConnections: this.config.connection?.maxConnections || SERVER.DEFAULT_MAX_CONNECTIONS,
                timeout: this.config.http?.timeout || SERVER.DEFAULT_TIMEOUT,
                keepAliveTimeout: this.config.http?.keepAliveTimeout || SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT
            };

            // Include connection timeout and keep-alive configuration
            if (this.server) {
                connectionInfo.serverListening = this.server.listening;
                connectionInfo.serverMaxConnections = this.server.maxConnections;
            }

            // Add connection security settings and limits
            connectionInfo.security = {
                trustProxy: this.app ? this.app.get('trust proxy') : false,
                xPoweredBy: this.app ? this.app.get('x-powered-by') : false
            };

            // Return comprehensive connection information object
            return connectionInfo;

        } catch (error) {
            this.logger.error('Failed to get connection info', {
                error: error.message,
                serverId: this.serverId
            });

            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Returns boolean indicating whether the server is currently running and accepting connections.
     * 
     * @returns {boolean} True if server is running and accepting connections, false otherwise
     */
    isRunning() {
        try {
            // Check isListening property and server listening state
            const isListeningState = this.isListening;
            const serverListening = this.server ? this.server.listening : false;

            // Verify lifecycle manager indicates server is running
            const lifecycleRunning = this.lifecycle ? this.lifecycle.isRunning() : true;

            // Return boolean status of server operational state
            return isListeningState && serverListening && lifecycleRunning;

        } catch (error) {
            this.logger.error('Failed to check running status', {
                error: error.message,
                serverId: this.serverId
            });

            return false;
        }
    }

    /**
     * Calculates and returns server uptime in milliseconds since startup, or null if server
     * is not running.
     * 
     * @returns {number|null} Server uptime in milliseconds or null if not running
     */
    getUptime() {
        try {
            // Check if server is running and startTime is available
            if (!this.startTime || !this.isListening) {
                return null;
            }

            // Calculate uptime by subtracting startTime from current time
            const uptime = Date.now() - this.startTime.getTime();

            // Return uptime in milliseconds or null if server not running
            return uptime;

        } catch (error) {
            this.logger.error('Failed to calculate uptime', {
                error: error.message,
                serverId: this.serverId
            });

            return null;
        }
    }

    /**
     * Returns complete server manager information including configuration, status, lifecycle state,
     * and operational metadata for monitoring and debugging.
     * 
     * @returns {Object} Complete server manager information with all details
     */
    getInfo() {
        try {
            // Include server status using getStatus() method
            const serverStatus = this.getStatus();

            // Add connection information using getConnectionInfo() method
            const connectionInfo = this.getConnectionInfo();

            // Include uptime information using getUptime() method
            const uptime = this.getUptime();

            // Add lifecycle state from lifecycle manager
            const lifecycleInfo = this.lifecycle ? this.lifecycle.getInfo() : null;

            // Include Express.js application information
            const applicationInfo = getApplicationInfo(this.app);

            // Add server configuration and security settings
            const configurationInfo = {
                config: this.config,
                configSummary: createServerSummary(this.config),
                port: this.port,
                host: this.host
            };

            // Return comprehensive server manager information object
            return {
                serverId: this.serverId,
                serverStatus: serverStatus,
                connectionInfo: connectionInfo,
                uptime: uptime,
                uptimeFormatted: uptime ? `${Math.round(uptime / 1000)}s` : null,
                lifecycle: lifecycleInfo,
                application: applicationInfo,
                configuration: configurationInfo,
                metadata: {
                    version: APPLICATION.VERSION,
                    nodeVersion: process.version,
                    platform: process.platform,
                    processId: process.pid,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            this.logger.error('Failed to get server manager info', {
                error: error.message,
                serverId: this.serverId
            });

            return {
                serverId: this.serverId,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Performs server restart by executing graceful shutdown followed by startup with the same
     * configuration, including error handling and state management.
     * 
     * @param {Object} restartOptions - Configuration options for server restart
     * @param {number} restartOptions.shutdownTimeout - Timeout for shutdown phase
     * @param {number} restartOptions.startupTimeout - Timeout for startup phase
     * @param {boolean} restartOptions.force - Whether to force restart if graceful restart fails
     * @returns {Promise} Resolves when server restart is complete and server is accepting connections
     */
    async restart(restartOptions = {}) {
        try {
            // Log restart initiation with reason and configuration
            this.logger.info('Initiating HTTP server restart', {
                serverId: this.serverId,
                force: restartOptions.force || false,
                shutdownTimeout: restartOptions.shutdownTimeout || TIMEOUTS.SERVER_SHUTDOWN,
                startupTimeout: restartOptions.startupTimeout || TIMEOUTS.SERVER_STARTUP
            });

            const restartStartTime = Date.now();

            // Execute graceful shutdown using stop() method
            this.logger.info('Executing graceful shutdown for restart');
            await this.stop(
                restartOptions.force || false,
                restartOptions.shutdownTimeout || TIMEOUTS.SERVER_SHUTDOWN
            );

            // Wait for shutdown completion with timeout handling
            await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between stop and start

            // Execute startup sequence using start() method with same configuration
            this.logger.info('Executing startup sequence for restart');
            const startupResult = await this.start({
                port: this.port,
                host: this.host,
                timeout: restartOptions.startupTimeout || TIMEOUTS.SERVER_STARTUP
            });

            // Verify server is running and accepting connections after restart
            if (!this.isRunning()) {
                throw new Error('Server restart completed but server is not in running state');
            }

            const restartDuration = Date.now() - restartStartTime;

            // Log successful restart completion with timing and status
            this.logger.info('HTTP server restart completed successfully', {
                serverId: this.serverId,
                restartDuration: `${restartDuration}ms`,
                binding: `${this.host}:${this.port}`,
                isRunning: this.isRunning(),
                newStartTime: this.startTime.toISOString()
            });

            // Return Promise resolving with restart confirmation
            return {
                success: true,
                serverId: this.serverId,
                restartTime: new Date(),
                restartDuration: restartDuration,
                binding: `${this.host}:${this.port}`,
                startupResult: startupResult,
                message: 'HTTP server restart completed successfully'
            };

        } catch (error) {
            this.logger.error('HTTP server restart failed', {
                error: error.message,
                stack: error.stack,
                serverId: this.serverId
            });

            throw new Error(`HTTP server restart failed: ${error.message}`);
        }
    }

    /**
     * Configures HTTP server settings including timeouts, connection limits, and keep-alive options.
     * 
     * @param {Object} settings - Server configuration settings
     * @returns {void} Applies settings to the HTTP server instance
     */
    configureServerSettings(settings = {}) {
        try {
            if (!this.server) {
                throw new Error('HTTP server instance not available for configuration');
            }

            // Configure server timeout
            if (settings.timeout) {
                this.server.timeout = settings.timeout;
            }

            // Configure keep-alive timeout
            if (settings.keepAliveTimeout) {
                this.server.keepAliveTimeout = settings.keepAliveTimeout;
            }

            // Configure maximum connections
            if (settings.maxConnections) {
                this.server.maxConnections = settings.maxConnections;
            }

            // Configure request timeout if available
            if (settings.requestTimeout && this.server.requestTimeout !== undefined) {
                this.server.requestTimeout = settings.requestTimeout;
            }

            this.logger.debug('Server settings configured', {
                timeout: this.server.timeout,
                keepAliveTimeout: this.server.keepAliveTimeout,
                maxConnections: this.server.maxConnections
            });

        } catch (error) {
            this.logger.error('Failed to configure server settings', {
                error: error.message,
                settings: settings
            });
        }
    }
}

// Export all functions, classes, and utilities for application use
module.exports = {
    // Main HTTP server management class for comprehensive server lifecycle orchestration, binding, and resource management
    HttpServerManager,
    
    // Factory function for creating HTTP server manager instances with Express.js application and configuration
    createHttpServer,
    
    // Standalone utility function for starting HTTP servers with comprehensive startup sequence
    startServer,
    
    // Standalone utility function for graceful server shutdown with resource cleanup
    stopServer,
    
    // Utility function for retrieving server status information and operational metrics
    getServerStatus,
    
    // Boolean utility function for checking server running state
    isServerRunning,
    
    // Utility function for retrieving information about all managed server instances
    getAllServers,
    
    // Factory function for creating server health check functions for monitoring integration
    createServerHealthCheck
};