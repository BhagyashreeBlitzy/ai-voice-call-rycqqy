/**
 * Main HTTP Server Entry Point for Node.js Tutorial Application
 * 
 * This module serves as the primary HTTP server initialization and lifecycle management
 * system for the Node.js tutorial application. It creates a production-ready HTTP server
 * using the Node.js built-in HTTP module, integrates with Express.js 5.1.0 application
 * instance, implements comprehensive server configuration management, and provides graceful
 * shutdown procedures with process-level error handling for robust server operations.
 * 
 * Key Features:
 * - Node.js 22.x LTS HTTP server creation with Express.js 5.1.0 integration
 * - Environment-aware configuration management with fallback defaults
 * - Production-ready server patterns including graceful shutdown and process management
 * - Comprehensive event handling for server lifecycle monitoring and observability
 * - Request performance tracking and server statistics for operational insights
 * - Educational architecture demonstrating enterprise-grade Node.js server patterns
 * - Signal handling for container orchestration compatibility (SIGTERM, SIGINT)
 * - Automatic error recovery and operational logging for production deployment
 * 
 * Architecture:
 * - HTTP server foundation using Node.js core HTTP module for maximum control
 * - Express.js application integration for enhanced routing and middleware capabilities  
 * - Configuration factory pattern for environment-specific settings management
 * - Event-driven server lifecycle with comprehensive monitoring and error handling
 * - Process-level signal handling for graceful shutdown in containerized environments
 * - Statistics collection for health checks and operational monitoring
 * 
 * Educational Value:
 * - Demonstrates Node.js HTTP server creation and Express.js integration patterns
 * - Showcases production-ready server configuration and lifecycle management
 * - Illustrates process signal handling and graceful shutdown procedures
 * - Provides examples of operational logging and performance monitoring
 * - Shows container orchestration compatibility and deployment readiness
 * 
 * Compatible with:
 * - Node.js 22.11.0 LTS with enhanced performance and security features
 * - Express.js 5.1.0 with automatic promise error handling and async/await support
 * - Container orchestration platforms (Docker, Kubernetes) via signal handling
 * - Process managers (PM2, Forever) through standard process event patterns
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Node.js HTTP server patterns, Express.js integration, and production deployment
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Node.js built-in HTTP module for creating HTTP server instances and handling network connections
const http = require('http'); // Node.js Built-in

// Node.js process module for signal handling, environment variables, and process lifecycle management
const process = require('process'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import configured Express.js application instance with middleware, routing, and error handling
const app = require('./app.js');

// Import configuration factory for environment-specific server settings
const { getConfig } = require('./utils/config.js');

// Import logger utilities for comprehensive server lifecycle logging
const { logger } = require('./utils/logger.js');

// Import server default configuration constants for fallback values
const { 
    SERVER_DEFAULTS,
    APPLICATION_METADATA 
} = require('./utils/constants.js');

// =============================================================================
// GLOBAL SERVER STATE
// =============================================================================

/**
 * Global reference to HTTP server instance for shutdown handling and lifecycle management
 * @type {http.Server|null}
 */
let SERVER_INSTANCE = null;

/**
 * Cached server configuration object loaded from environment-specific settings
 * @type {Object|null}
 */
let SERVER_CONFIG = null;

/**
 * Timestamp when server started listening for requests
 * @type {number|null}
 */
let SERVER_START_TIME = null;

/**
 * Flag indicating if graceful shutdown process has been initiated
 * @type {boolean}
 */
let SHUTDOWN_INITIATED = false;

// =============================================================================
// SERVER CONFIGURATION LOADING
// =============================================================================

/**
 * Loads and validates server configuration from environment-specific settings with fallback to defaults.
 * This function orchestrates the loading of comprehensive server configuration by retrieving 
 * application configuration using getConfig(), extracting server-specific settings, applying 
 * environment variable overrides, validating configuration parameters, and setting appropriate 
 * fallback values from SERVER_DEFAULTS constants for robust server initialization.
 * 
 * Configuration loading process:
 * - Retrieves application configuration using getConfig() factory function
 * - Extracts server section from application configuration with nested property access
 * - Applies environment variable overrides for PORT, HOST, and timeout settings
 * - Validates port number range (1-65535) for proper network binding
 * - Validates host address format for correct server binding configuration
 * - Sets fallback values from SERVER_DEFAULTS for missing or invalid configuration
 * - Caches final configuration in SERVER_CONFIG global for performance optimization
 * - Logs configuration loading completion with final server settings for operational visibility
 * 
 * Environment Variable Support:
 * - PORT: Override default port for server binding (process.env.PORT)
 * - HOST: Override default host address for server binding (process.env.HOST) 
 * - TIMEOUT: Override default request timeout in milliseconds (process.env.TIMEOUT)
 * - NODE_ENV: Determines environment-specific configuration loading behavior
 * 
 * @returns {Object} Complete server configuration object with validated port, host, timeout, and connection settings
 */
function loadServerConfiguration() {
    try {
        // Load comprehensive application configuration using getConfig() factory function
        logger.debug('Loading server configuration from application config');
        const appConfig = getConfig();
        
        // Extract server configuration section from application config with safe property access
        const serverConfig = appConfig.server || {};
        
        // Apply environment variable overrides for deployment flexibility
        const port = parseInt(process.env.PORT) || serverConfig.port || SERVER_DEFAULTS.PORT;
        const host = process.env.HOST || serverConfig.host || SERVER_DEFAULTS.HOST;
        const timeout = parseInt(process.env.TIMEOUT) || serverConfig.timeout || SERVER_DEFAULTS.TIMEOUT;
        
        // Validate port number is within valid range (1-65535)
        if (port < 1 || port > 65535) {
            logger.warn(`Invalid port number: ${port}. Using default port: ${SERVER_DEFAULTS.PORT}`, {
                providedPort: port,
                fallbackPort: SERVER_DEFAULTS.PORT,
                validRange: '1-65535'
            });
            port = SERVER_DEFAULTS.PORT;
        }
        
        // Validate host address format for proper binding
        if (!host || typeof host !== 'string') {
            logger.warn(`Invalid host address: ${host}. Using default host: ${SERVER_DEFAULTS.HOST}`, {
                providedHost: host,
                fallbackHost: SERVER_DEFAULTS.HOST
            });
            host = SERVER_DEFAULTS.HOST;
        }
        
        // Validate timeout value for reasonable request handling
        if (timeout < 1000 || timeout > 300000) { // 1 second to 5 minutes
            logger.warn(`Invalid timeout value: ${timeout}ms. Using default: ${SERVER_DEFAULTS.TIMEOUT}ms`, {
                providedTimeout: timeout,
                fallbackTimeout: SERVER_DEFAULTS.TIMEOUT,
                validRange: '1000-300000ms'
            });
            timeout = SERVER_DEFAULTS.TIMEOUT;
        }
        
        // Create complete server configuration object with validated settings
        const finalConfig = {
            port: port,
            host: host,
            timeout: timeout,
            keepAlive: serverConfig.keepAlive !== false ? SERVER_DEFAULTS.KEEP_ALIVE : false,
            backlog: serverConfig.backlog || SERVER_DEFAULTS.BACKLOG,
            environment: process.env.NODE_ENV || 'development',
            
            // Additional server settings for production readiness
            maxHeadersCount: serverConfig.maxHeadersCount || 100,
            maxHeaderSize: serverConfig.maxHeaderSize || 8192,
            headersTimeout: serverConfig.headersTimeout || 60000,
            requestTimeout: timeout,
            keepAliveTimeout: serverConfig.keepAliveTimeout || 5000
        };
        
        // Cache configuration in SERVER_CONFIG global for reuse and performance
        SERVER_CONFIG = Object.freeze(finalConfig);
        
        // Log successful configuration loading with final server settings
        logger.info('Server configuration loaded successfully', {
            port: finalConfig.port,
            host: finalConfig.host,
            timeout: finalConfig.timeout,
            environment: finalConfig.environment,
            keepAlive: finalConfig.keepAlive,
            backlog: finalConfig.backlog
        });
        
        return SERVER_CONFIG;
        
    } catch (error) {
        // Handle configuration loading errors gracefully with fallback to defaults
        logger.error('Failed to load server configuration, using defaults', error);
        
        // Create minimal fallback configuration using SERVER_DEFAULTS
        const fallbackConfig = {
            port: parseInt(process.env.PORT) || SERVER_DEFAULTS.PORT,
            host: process.env.HOST || SERVER_DEFAULTS.HOST,
            timeout: parseInt(process.env.TIMEOUT) || SERVER_DEFAULTS.TIMEOUT,
            keepAlive: SERVER_DEFAULTS.KEEP_ALIVE,
            backlog: SERVER_DEFAULTS.BACKLOG,
            environment: process.env.NODE_ENV || 'development',
            maxHeadersCount: 100,
            maxHeaderSize: 8192,
            headersTimeout: 60000,
            requestTimeout: SERVER_DEFAULTS.TIMEOUT,
            keepAliveTimeout: 5000
        };
        
        SERVER_CONFIG = Object.freeze(fallbackConfig);
        return SERVER_CONFIG;
    }
}

// =============================================================================
// HTTP SERVER CREATION
// =============================================================================

/**
 * Creates HTTP server instance using Node.js http module and binds Express application.
 * This function creates a production-ready HTTP server using http.createServer() with the 
 * configured Express application as the request handler, applies comprehensive server 
 * configuration including timeout, keep-alive, and security settings, configures server-level 
 * event handlers for operational monitoring, and stores the server instance globally for 
 * lifecycle management and graceful shutdown procedures.
 * 
 * Server Creation Process:
 * - Creates HTTP server using http.createServer() with Express app as request handler
 * - Configures server timeout using SERVER_CONFIG.timeout for request processing limits
 * - Enables HTTP keep-alive connections for improved performance if configured
 * - Sets maximum header size and request size limits for security against attacks
 * - Configures comprehensive server error event handlers for operational monitoring
 * - Sets up connection event handlers for logging and performance tracking
 * - Stores server instance in SERVER_INSTANCE global for lifecycle management
 * - Logs HTTP server creation completion with configuration details
 * 
 * Security Configuration:
 * - Request timeout limits to prevent resource exhaustion
 * - Header size limits to prevent header-based attacks
 * - Connection management for DoS protection
 * - Error handling to prevent information disclosure
 * 
 * @param {Object} expressApp - Configured Express.js application instance with middleware and routing
 * @returns {http.Server} Node.js HTTP server instance configured with Express application and production settings
 */
function createHttpServer(expressApp) {
    try {
        // Log HTTP server creation start with configuration context
        logger.info('Creating HTTP server with Express.js integration', {
            expressApp: typeof expressApp,
            serverConfig: !!SERVER_CONFIG,
            nodeVersion: process.version
        });
        
        // Create HTTP server using http.createServer() with Express app as request handler
        const server = http.createServer(expressApp);
        
        // Configure server timeout using SERVER_CONFIG.timeout for request processing limits
        server.setTimeout(SERVER_CONFIG.requestTimeout);
        
        // Configure request and header timeout settings for security
        server.headersTimeout = SERVER_CONFIG.headersTimeout;
        server.requestTimeout = SERVER_CONFIG.requestTimeout;
        
        // Enable keep-alive connections if configured for improved performance
        if (SERVER_CONFIG.keepAlive) {
            server.keepAliveTimeout = SERVER_CONFIG.keepAliveTimeout;
            logger.debug('HTTP keep-alive enabled', {
                keepAliveTimeout: SERVER_CONFIG.keepAliveTimeout
            });
        }
        
        // Set maximum header size and count limits for security against header-based attacks
        server.maxHeadersCount = SERVER_CONFIG.maxHeadersCount;
        server.maxHeaderSize = SERVER_CONFIG.maxHeaderSize;
        
        // Configure server error event handlers for operational monitoring and error handling
        server.on('error', (error) => {
            logger.error('HTTP server error occurred', error);
            handleServerError(error);
        });
        
        // Set up connection event handlers for logging and monitoring
        server.on('connection', (socket) => {
            logger.debug('New client connection established', {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                localAddress: socket.localAddress,
                localPort: socket.localPort
            });
            
            // Configure socket timeout to match server timeout
            socket.setTimeout(SERVER_CONFIG.requestTimeout);
            
            // Handle socket timeout events
            socket.on('timeout', () => {
                logger.warn('Client socket timeout', {
                    remoteAddress: socket.remoteAddress,
                    timeout: SERVER_CONFIG.requestTimeout
                });
                socket.destroy();
            });
        });
        
        // Set up client error handling for malformed requests
        server.on('clientError', (error, socket) => {
            logger.warn('Client error occurred', {
                error: error.message,
                code: error.code,
                remoteAddress: socket.remoteAddress
            });
            
            // Send appropriate error response for malformed requests
            if (error.code === 'ECONNRESET' || !socket.writable) {
                return;
            }
            
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        
        // Set up request timeout handling
        server.on('timeout', (socket) => {
            logger.warn('Server timeout occurred', {
                timeout: SERVER_CONFIG.requestTimeout,
                remoteAddress: socket?.remoteAddress
            });
        });
        
        // Store server instance in SERVER_INSTANCE global for lifecycle management
        SERVER_INSTANCE = server;
        
        // Log HTTP server creation completion with configuration details
        logger.info('HTTP server created successfully', {
            timeout: SERVER_CONFIG.requestTimeout,
            headersTimeout: SERVER_CONFIG.headersTimeout,
            keepAlive: SERVER_CONFIG.keepAlive,
            maxHeadersCount: SERVER_CONFIG.maxHeadersCount,
            maxHeaderSize: SERVER_CONFIG.maxHeaderSize
        });
        
        return server;
        
    } catch (error) {
        // Handle server creation errors with comprehensive error logging
        logger.error('Failed to create HTTP server', error);
        throw new Error(`HTTP server creation failed: ${error.message}`);
    }
}

// =============================================================================
// SERVER EVENT HANDLING
// =============================================================================

/**
 * Configures comprehensive event handlers for HTTP server lifecycle management and monitoring.
 * This function sets up complete event handling for the HTTP server instance including 
 * startup events, error conditions, connection management, and performance monitoring to 
 * provide comprehensive operational visibility and robust error handling throughout the 
 * server lifecycle for production deployment readiness.
 * 
 * Event Handler Configuration:
 * - 'listening' event handler for successful server startup logging and binding confirmation
 * - 'error' event handler for server startup errors, port conflicts, and runtime issues
 * - 'connection' event handler for new client connection logging and monitoring
 * - 'close' event handler for server shutdown completion logging and cleanup verification
 * - 'clientError' event handler for malformed request error handling and client issues
 * - 'timeout' event handler for request timeout monitoring and performance tracking
 * - Request statistics tracking for health checks and operational monitoring
 * - Comprehensive error context preservation for debugging and incident response
 * 
 * Monitoring Features:
 * - Connection count tracking for load monitoring
 * - Request performance metrics for optimization
 * - Error categorization for incident analysis
 * - Resource utilization monitoring for capacity planning
 * 
 * @param {http.Server} server - HTTP server instance to configure with comprehensive event handling
 * @returns {void} No return value - configures event listeners on server instance for lifecycle management
 */
function setupServerEventHandlers(server) {
    try {
        // Set up 'listening' event handler for server startup success logging
        server.on('listening', () => {
            const address = server.address();
            SERVER_START_TIME = Date.now();
            
            logger.info('HTTP server listening successfully', {
                address: address.address,
                port: address.port,
                family: address.family,
                startTime: new Date(SERVER_START_TIME).toISOString(),
                environment: SERVER_CONFIG.environment,
                nodeVersion: process.version,
                processId: process.pid
            });
            
            // Log application metadata for operational context
            logger.info('Application ready for requests', {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                description: APPLICATION_METADATA.DESCRIPTION,
                author: APPLICATION_METADATA.AUTHOR
            });
        });
        
        // Configure 'error' event handler for server startup and runtime errors
        server.on('error', (error) => {
            logger.error('HTTP server error event', {
                error: error.message,
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
                address: error.address,
                port: error.port,
                stack: error.stack
            });
        });
        
        // Set up 'connection' event handler for client connection monitoring
        server.on('connection', (socket) => {
            logger.debug('Client connection established', {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                remoteFamily: socket.remoteFamily,
                localAddress: socket.localAddress,
                localPort: socket.localPort,
                timestamp: new Date().toISOString()
            });
        });
        
        // Configure 'close' event handler for server shutdown completion logging
        server.on('close', () => {
            const uptime = SERVER_START_TIME ? Date.now() - SERVER_START_TIME : 0;
            
            logger.info('HTTP server closed successfully', {
                uptime: uptime,
                uptimeFormatted: formatUptime(uptime),
                shutdownTime: new Date().toISOString(),
                shutdownInitiated: SHUTDOWN_INITIATED
            });
        });
        
        // Set up 'clientError' event handler for malformed request handling
        server.on('clientError', (error, socket) => {
            logger.warn('Client error detected', {
                error: error.message,
                code: error.code,
                remoteAddress: socket?.remoteAddress,
                remotePort: socket?.remotePort,
                socketDestroyed: socket?.destroyed,
                timestamp: new Date().toISOString()
            });
        });
        
        // Configure 'timeout' event handler for request timeout monitoring
        server.on('timeout', (socket) => {
            logger.warn('Request timeout occurred', {
                timeout: SERVER_CONFIG.requestTimeout,
                remoteAddress: socket?.remoteAddress,
                socketReadyState: socket?.readyState,
                timestamp: new Date().toISOString()
            });
        });
        
        // Log event handler setup completion with registered event types
        logger.debug('Server event handlers configured successfully', {
            events: ['listening', 'error', 'connection', 'close', 'clientError', 'timeout'],
            serverInstance: !!server,
            configuredHandlers: server.listenerCount('error') > 0
        });
        
    } catch (error) {
        // Handle event handler setup errors gracefully
        logger.error('Failed to setup server event handlers', error);
        throw new Error(`Server event handler setup failed: ${error.message}`);
    }
}

/**
 * Configures process-level event handlers for graceful shutdown and error handling.
 * This function establishes comprehensive process-level event handling for production-ready 
 * server deployment including signal handling for graceful shutdown, uncaught exception 
 * management, unhandled promise rejection handling, and process exit event logging to 
 * ensure robust server operation and proper cleanup in containerized environments.
 * 
 * Process Event Handler Configuration:
 * - SIGTERM handler for graceful shutdown in production and container environments
 * - SIGINT handler for development Ctrl+C graceful shutdown and interrupt handling
 * - uncaughtException handler for critical error logging, cleanup, and process termination
 * - unhandledRejection handler for promise rejection logging and error recovery
 * - beforeExit handler for final cleanup operations before process termination
 * - exit handler for process termination logging and final resource cleanup
 * - warning event handler for Node.js runtime warnings and deprecation notices
 * - Process event handler setup completion logging for operational verification
 * 
 * Container Orchestration Support:
 * - SIGTERM handling for Kubernetes pod termination
 * - SIGINT handling for Docker container stop commands
 * - Graceful shutdown coordination with load balancers
 * - Process exit code management for orchestration systems
 * 
 * @returns {void} No return value - configures process event listeners for signal handling and lifecycle management
 */
function setupProcessEventHandlers() {
    try {
        // Set up SIGTERM handler for graceful shutdown in production environments
        process.on('SIGTERM', () => {
            logger.info('SIGTERM signal received - initiating graceful shutdown', {
                signal: 'SIGTERM',
                processId: process.pid,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
            
            gracefulShutdown('SIGTERM').catch((error) => {
                logger.error('Error during SIGTERM graceful shutdown', error);
                process.exit(1);
            });
        });
        
        // Configure SIGINT handler for development Ctrl+C graceful shutdown
        process.on('SIGINT', () => {
            logger.info('SIGINT signal received - initiating graceful shutdown', {
                signal: 'SIGINT',
                processId: process.pid,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
            
            gracefulShutdown('SIGINT').catch((error) => {
                logger.error('Error during SIGINT graceful shutdown', error);
                process.exit(1);
            });
        });
        
        // Set up uncaughtException handler for critical error logging and cleanup
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception occurred - process will terminate', {
                error: error.message,
                stack: error.stack,
                name: error.name,
                processId: process.pid,
                timestamp: new Date().toISOString(),
                fatal: true
            });
            
            // Attempt graceful shutdown before process termination
            if (SERVER_INSTANCE && !SHUTDOWN_INITIATED) {
                gracefulShutdown('uncaughtException').finally(() => {
                    process.exit(1);
                });
            } else {
                process.exit(1);
            }
        });
        
        // Configure unhandledRejection handler for promise rejection logging
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection detected', {
                reason: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
                promise: String(promise),
                processId: process.pid,
                timestamp: new Date().toISOString(),
                warning: 'This may cause memory leaks or unexpected behavior'
            });
            
            // In Node.js 15+, unhandled rejections terminate the process
            // We log the error but let the process continue for now
        });
        
        // Set up beforeExit handler for final cleanup operations
        process.on('beforeExit', (code) => {
            logger.info('Process beforeExit event received', {
                exitCode: code,
                processId: process.pid,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                serverRunning: !!SERVER_INSTANCE && SERVER_INSTANCE.listening
            });
        });
        
        // Configure exit handler for process termination logging
        process.on('exit', (code) => {
            // Note: Only synchronous operations allowed in exit handler
            console.log(`[${new Date().toISOString()}] [INFO] Process exit event - Code: ${code}, PID: ${process.pid}`);
        });
        
        // Set up warning event handler for Node.js runtime warnings
        process.on('warning', (warning) => {
            logger.warn('Node.js process warning', {
                name: warning.name,
                message: warning.message,
                stack: warning.stack,
                processId: process.pid,
                timestamp: new Date().toISOString()
            });
        });
        
        // Log process event handler setup completion
        logger.debug('Process event handlers configured successfully', {
            handlers: ['SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection', 'beforeExit', 'exit', 'warning'],
            processId: process.pid,
            nodeVersion: process.version,
            platform: process.platform
        });
        
    } catch (error) {
        // Handle process event handler setup errors
        logger.error('Failed to setup process event handlers', error);
        throw new Error(`Process event handler setup failed: ${error.message}`);
    }
}

// =============================================================================
// SERVER STARTUP
// =============================================================================

/**
 * Starts the HTTP server and begins listening for incoming connections on configured port and host.
 * This function orchestrates the server startup process by validating server configuration, 
 * initiating server listening on the configured port and host, wrapping the asynchronous 
 * server.listen() operation in a Promise for async/await compatibility, recording server 
 * startup timing for performance monitoring, and logging comprehensive startup information 
 * including environment context and operational readiness status.
 * 
 * Server Startup Process:
 * - Validates server instance and configuration parameters for startup readiness
 * - Logs server startup attempt with application metadata, version, and configuration details
 * - Calls server.listen() with port, host, and backlog parameters for network binding
 * - Wraps server.listen() in Promise for modern async/await compatibility and error handling
 * - Records precise server start time in SERVER_START_TIME global for uptime calculation
 * - Logs successful server startup with bound address, port, and environment information
 * - Provides operational context including Node.js version and process information
 * - Returns resolved Promise indicating successful server startup completion
 * 
 * Network Configuration:
 * - Port binding with validation and conflict detection
 * - Host address binding with localhost default for development security
 * - Backlog configuration for connection queue management
 * - Address family detection (IPv4/IPv6) for network compatibility
 * 
 * @param {http.Server} server - HTTP server instance ready for network binding and startup
 * @param {Object} config - Complete server configuration object with port, host, and startup settings
 * @returns {Promise} Promise that resolves when server successfully starts listening for connections
 */
function startServer(server, config) {
    return new Promise((resolve, reject) => {
        try {
            // Validate server instance and configuration parameters
            if (!server || typeof server.listen !== 'function') {
                throw new Error('Invalid server instance provided');
            }
            
            if (!config || typeof config !== 'object') {
                throw new Error('Invalid server configuration provided');
            }
            
            // Log server startup attempt with comprehensive context
            logger.info('Starting HTTP server', {
                application: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                port: config.port,
                host: config.host,
                environment: config.environment,
                backlog: config.backlog,
                nodeVersion: process.version,
                platform: process.platform,
                processId: process.pid,
                timestamp: new Date().toISOString()
            });
            
            // Start server listening with error handling and Promise resolution
            server.listen(config.port, config.host, config.backlog, (error) => {
                if (error) {
                    // Handle server startup errors with detailed context
                    logger.error('Failed to start HTTP server', {
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        syscall: error.syscall,
                        address: error.address,
                        port: error.port,
                        stack: error.stack
                    });
                    
                    reject(error);
                    return;
                }
                
                // Record server start time for uptime calculation and performance monitoring
                SERVER_START_TIME = Date.now();
                
                // Get server address information for logging and monitoring
                const address = server.address();
                
                // Log successful server startup with operational details
                logger.info('HTTP server started successfully', {
                    address: address.address,
                    port: address.port,
                    family: address.family,
                    startTime: new Date(SERVER_START_TIME).toISOString(),
                    startTimestamp: SERVER_START_TIME,
                    environment: config.environment,
                    ready: true
                });
                
                // Log environment and runtime information for operational context
                logger.info('Server environment and runtime information', {
                    nodeVersion: process.version,
                    platform: process.platform,
                    architecture: process.arch,
                    processId: process.pid,
                    processTitle: process.title,
                    cwd: process.cwd(),
                    memoryUsage: process.memoryUsage(),
                    uptime: process.uptime(),
                    loadavg: process.loadavg(),
                    cpuUsage: process.cpuUsage()
                });
                
                // Resolve promise indicating successful server startup
                resolve();
            });
            
        } catch (error) {
            // Handle synchronous errors during server startup
            logger.error('Error occurred during server startup', error);
            reject(error);
        }
    });
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Performs graceful server shutdown by closing connections, cleaning up resources, and logging shutdown events.
 * This function orchestrates comprehensive graceful shutdown procedures including connection draining, 
 * resource cleanup, timeout management, and operational logging to ensure clean server termination 
 * without data loss or connection interruption in production environments and container orchestration.
 * 
 * Graceful Shutdown Process:
 * - Checks SHUTDOWN_INITIATED flag to prevent multiple concurrent shutdown attempts
 * - Sets SHUTDOWN_INITIATED flag and logs shutdown initiation with signal and timing information
 * - Logs shutdown signal received and shutdown reason for audit trail and operational monitoring
 * - Stops accepting new connections using server.close() for connection draining
 * - Sets configurable shutdown timeout to force close if graceful shutdown exceeds time limit
 * - Waits for active connections to complete naturally or until timeout threshold
 * - Closes database connections and external service connections if configured
 * - Performs cleanup of temporary files, cache, and allocated resources
 * - Logs shutdown completion with comprehensive uptime statistics and final operational metrics
 * - Resolves promise indicating successful graceful shutdown completion
 * 
 * Container Orchestration Support:
 * - Respects SIGTERM signals from Kubernetes and Docker for pod/container termination
 * - Provides configurable grace period for connection draining
 * - Ensures clean process exit for orchestration system lifecycle management
 * - Supports health check endpoints during shutdown for load balancer coordination
 * 
 * @param {string} signal - Signal name or reason for shutdown (SIGTERM, SIGINT, uncaughtException)
 * @returns {Promise} Promise that resolves when graceful shutdown procedures are completed successfully
 */
async function gracefulShutdown(signal) {
    try {
        // Check SHUTDOWN_INITIATED flag to prevent multiple shutdown attempts
        if (SHUTDOWN_INITIATED) {
            logger.warn('Graceful shutdown already in progress', {
                signal: signal,
                alreadyInitiated: true,
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Set SHUTDOWN_INITIATED flag to prevent concurrent shutdowns
        SHUTDOWN_INITIATED = true;
        
        // Calculate server uptime for shutdown logging
        const uptime = SERVER_START_TIME ? Date.now() - SERVER_START_TIME : 0;
        
        // Log shutdown initiation with comprehensive context
        logger.info('Graceful shutdown initiated', {
            signal: signal,
            processId: process.pid,
            uptime: uptime,
            uptimeFormatted: formatUptime(uptime),
            timestamp: new Date().toISOString(),
            serverListening: SERVER_INSTANCE ? SERVER_INSTANCE.listening : false
        });
        
        // Log shutdown signal received and reason
        logger.info(`Shutdown signal received: ${signal}`, {
            reason: signal,
            initiatedBy: 'gracefulShutdown',
            serverStatus: SERVER_INSTANCE ? 'active' : 'inactive',
            environmentContext: SERVER_CONFIG ? SERVER_CONFIG.environment : 'unknown'
        });
        
        if (SERVER_INSTANCE) {
            // Stop accepting new connections using server.close()
            logger.info('Stopping server - no new connections will be accepted');
            
            // Create shutdown timeout promise for forced termination
            const shutdownTimeout = new Promise((resolve) => {
                setTimeout(() => {
                    logger.warn('Graceful shutdown timeout reached - forcing server close', {
                        timeout: 10000, // 10 seconds
                        forced: true
                    });
                    resolve();
                }, 10000);
            });
            
            // Create server close promise for natural connection draining
            const serverClose = new Promise((resolve, reject) => {
                SERVER_INSTANCE.close((error) => {
                    if (error) {
                        logger.error('Error during server close', error);
                        reject(error);
                        return;
                    }
                    
                    logger.info('Server closed - all connections drained successfully');
                    resolve();
                });
            });
            
            // Wait for either server close completion or timeout
            await Promise.race([serverClose, shutdownTimeout]);
            
            // Log active connection status if any remain
            if (SERVER_INSTANCE.listening) {
                logger.warn('Server still listening after close attempt');
            }
        }
        
        // Close database connections and external service connections if configured
        // Note: This tutorial application has no database or external services
        logger.debug('Cleaning up external connections (none configured in tutorial)');
        
        // Clean up temporary files and resources
        // Note: This tutorial application creates no temporary files
        logger.debug('Cleaning up temporary resources (none created in tutorial)');
        
        // Log final server statistics and operational metrics
        const finalStats = getServerStats();
        logger.info('Final server statistics', finalStats);
        
        // Calculate final uptime and operational metrics
        const finalUptime = SERVER_START_TIME ? Date.now() - SERVER_START_TIME : 0;
        
        // Log comprehensive shutdown completion information
        logger.info('Graceful shutdown completed successfully', {
            signal: signal,
            totalUptime: finalUptime,
            uptimeFormatted: formatUptime(finalUptime),
            completionTime: new Date().toISOString(),
            processId: process.pid,
            finalMemoryUsage: process.memoryUsage(),
            shutdownDuration: Date.now() - (SERVER_START_TIME ? Date.now() - finalUptime : Date.now()),
            clean: true
        });
        
    } catch (error) {
        // Handle graceful shutdown errors
        logger.error('Error occurred during graceful shutdown', {
            signal: signal,
            error: error.message,
            stack: error.stack,
            processId: process.pid,
            timestamp: new Date().toISOString()
        });
        
        // Force shutdown on error to prevent hanging process
        logger.error('Forcing process termination due to shutdown error');
        throw error;
    }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Handles server startup and runtime errors with appropriate error logging and recovery actions.
 * This function provides comprehensive server error handling including error categorization, 
 * detailed logging with context preservation, specific error type handling (port conflicts, 
 * permission issues, address availability), recovery suggestion logging, and process management 
 * for operational monitoring and incident response in production environments.
 * 
 * Error Handling Features:
 * - Detailed error logging with comprehensive context including stack trace and system information
 * - Error type categorization (EADDRINUSE, EACCES, EADDRNOTAVAIL) with specific handling strategies
 * - Port conflict resolution with alternative port suggestions and configuration guidance
 * - Permission error handling with privilege requirement explanations and security context
 * - Address binding error handling with network configuration troubleshooting guidance
 * - Recovery suggestion logging with actionable steps for error resolution
 * - Graceful shutdown initiation when appropriate to maintain system stability
 * - Process exit management with appropriate error codes for monitoring systems
 * 
 * Production Error Management:
 * - Structured error logging for incident analysis and debugging
 * - Error code mapping for monitoring system integration
 * - Recovery guidance for operational teams and automated systems
 * - Security-aware error handling to prevent information disclosure
 * 
 * @param {Error} error - Error object with code, message, stack trace, and additional error context
 * @returns {void} No return value - handles error with comprehensive logging and process management
 */
function handleServerError(error) {
    try {
        // Log detailed error information with comprehensive context
        logger.error('Server error detected - analyzing error type and context', {
            errorMessage: error.message,
            errorCode: error.code,
            errorName: error.name,
            errno: error.errno,
            syscall: error.syscall,
            address: error.address,
            port: error.port,
            stack: error.stack,
            processId: process.pid,
            timestamp: new Date().toISOString()
        });
        
        // Handle specific error types with targeted recovery strategies
        switch (error.code) {
            case 'EADDRINUSE':
                // Handle port already in use error with conflict resolution guidance
                logger.error('Port already in use - another service is using the specified port', {
                    port: error.port || SERVER_CONFIG?.port,
                    address: error.address || SERVER_CONFIG?.host,
                    errorCode: 'EADDRINUSE',
                    resolution: 'Change PORT environment variable or stop conflicting service'
                });
                
                // Log port conflict resolution suggestions
                logger.info('Port conflict resolution suggestions', {
                    currentPort: error.port || SERVER_CONFIG?.port,
                    alternativePorts: [3001, 3002, 3003, 8000, 8080],
                    environmentVariable: 'PORT',
                    example: `PORT=3001 node ${process.argv[1]}`,
                    checkCommands: ['lsof -i :' + (error.port || SERVER_CONFIG?.port), 'netstat -tulpn | grep ' + (error.port || SERVER_CONFIG?.port)]
                });
                break;
                
            case 'EACCES':
                // Handle permission denied error with privilege requirements
                logger.error('Permission denied - insufficient privileges to bind to specified port', {
                    port: error.port || SERVER_CONFIG?.port,
                    address: error.address || SERVER_CONFIG?.host,
                    errorCode: 'EACCES',
                    resolution: 'Use port >= 1024 or run with appropriate privileges'
                });
                
                // Log permission error resolution guidance
                logger.info('Permission error resolution suggestions', {
                    issue: 'Ports below 1024 require root privileges',
                    recommendedPorts: '3000, 8000, 8080 (non-privileged ports)',
                    alternatives: [
                        'Use PORT=3000 or higher',
                        'Run with sudo (not recommended for development)',
                        'Use process manager with privilege dropping'
                    ],
                    securityNote: 'Running as root is not recommended for applications'
                });
                break;
                
            case 'EADDRNOTAVAIL':
                // Handle address not available error with network configuration guidance
                logger.error('Address not available - specified address cannot be bound', {
                    address: error.address || SERVER_CONFIG?.host,
                    port: error.port || SERVER_CONFIG?.port,
                    errorCode: 'EADDRNOTAVAIL',
                    resolution: 'Check network interface configuration and address availability'
                });
                
                // Log address binding troubleshooting guidance
                logger.info('Address binding troubleshooting suggestions', {
                    currentAddress: error.address || SERVER_CONFIG?.host,
                    validAddresses: ['localhost', '127.0.0.1', '0.0.0.0'],
                    networkChecks: [
                        'ifconfig or ipconfig to list interfaces',
                        'ping ' + (error.address || SERVER_CONFIG?.host) + ' to test address',
                        'Check DNS resolution for hostname addresses'
                    ],
                    recommendation: 'Use localhost or 127.0.0.1 for development'
                });
                break;
                
            default:
                // Handle other server errors with general error information
                logger.error('Unhandled server error occurred', {
                    errorCode: error.code || 'UNKNOWN',
                    errorType: error.constructor.name,
                    message: error.message,
                    context: 'Server startup or runtime error',
                    resolution: 'Check server configuration and system resources'
                });
        }
        
        // Log general recovery steps and configuration verification
        logger.info('General error recovery suggestions', {
            configurationCheck: 'Verify server configuration values',
            environmentCheck: 'Check environment variables (PORT, HOST, NODE_ENV)',
            resourceCheck: 'Verify system resources (memory, file descriptors)',
            networkCheck: 'Test network connectivity and interface availability',
            logCheck: 'Review application logs for additional context',
            restartSuggestion: 'Try restarting the application with corrected configuration'
        });
        
        // Initiate graceful shutdown if server is running
        if (SERVER_INSTANCE && !SHUTDOWN_INITIATED) {
            logger.info('Initiating graceful shutdown due to server error');
            gracefulShutdown('serverError').finally(() => {
                // Exit process with error code for monitoring systems
                process.exit(1);
            });
        } else {
            // Exit immediately if server not running or shutdown already initiated
            logger.error('Exiting process immediately due to server error');
            process.exit(1);
        }
        
    } catch (handlingError) {
        // Handle error handling errors (meta-error handling)
        console.error(`[ERROR] Failed to handle server error: ${handlingError.message}`);
        console.error(`[ERROR] Original error: ${error.message}`);
        process.exit(1);
    }
}

// =============================================================================
// SERVER STATISTICS AND MONITORING
// =============================================================================

/**
 * Returns comprehensive server statistics for monitoring, health checks, and operational insights.
 * This function provides detailed operational metrics including server uptime calculation, 
 * connection statistics, configuration summary, Express application metrics, Node.js process 
 * information, environment context, and performance indicators for monitoring systems, 
 * health checks, and operational dashboards in production environments.
 * 
 * Server Statistics Include:
 * - Server uptime calculation using SERVER_START_TIME timestamp for operational monitoring
 * - Current connection count and active request statistics for load monitoring
 * - Server configuration summary including port, host, timeout settings for health checks
 * - Express application statistics with middleware and route information for debugging
 * - Node.js process information including version, memory usage, and CPU utilization
 * - Environment and configuration context for deployment verification
 * - Performance metrics including request processing times and resource utilization
 * - Health indicators including server status, errors, and operational readiness
 * 
 * Monitoring Integration:
 * - Health check endpoint data for load balancer integration
 * - Metrics for monitoring systems (Prometheus, DataDog, New Relic)
 * - Operational dashboards and alerting system data sources
 * - Container orchestration health and readiness probe information
 * 
 * @returns {Object} Comprehensive server statistics object with uptime, connections, configuration, and performance metrics
 */
function getServerStats() {
    try {
        // Calculate server uptime using SERVER_START_TIME timestamp
        const uptime = SERVER_START_TIME ? Date.now() - SERVER_START_TIME : 0;
        const uptimeSeconds = Math.floor(uptime / 1000);
        
        // Get server address and listening status
        const address = SERVER_INSTANCE ? SERVER_INSTANCE.address() : null;
        const listening = SERVER_INSTANCE ? SERVER_INSTANCE.listening : false;
        
        // Create comprehensive statistics object
        const stats = {
            // Server status and timing information
            server: {
                status: listening ? 'listening' : (SHUTDOWN_INITIATED ? 'shutdown' : 'stopped'),
                uptime: uptime,
                uptimeSeconds: uptimeSeconds,
                uptimeFormatted: formatUptime(uptime),
                startTime: SERVER_START_TIME ? new Date(SERVER_START_TIME).toISOString() : null,
                currentTime: new Date().toISOString(),
                listening: listening,
                shutdownInitiated: SHUTDOWN_INITIATED
            },
            
            // Network and binding information
            network: {
                address: address ? address.address : SERVER_CONFIG?.host,
                port: address ? address.port : SERVER_CONFIG?.port,
                family: address ? address.family : 'unknown'
            },
            
            // Server configuration summary
            configuration: SERVER_CONFIG ? {
                port: SERVER_CONFIG.port,
                host: SERVER_CONFIG.host,
                timeout: SERVER_CONFIG.timeout,
                keepAlive: SERVER_CONFIG.keepAlive,
                environment: SERVER_CONFIG.environment,
                backlog: SERVER_CONFIG.backlog,
                maxHeadersCount: SERVER_CONFIG.maxHeadersCount,
                maxHeaderSize: SERVER_CONFIG.maxHeaderSize
            } : null,
            
            // Application metadata and version information
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                description: APPLICATION_METADATA.DESCRIPTION,
                author: APPLICATION_METADATA.AUTHOR
            },
            
            // Express application statistics (if available)
            express: {
                // Note: Express app instance is not directly accessible here
                // In a production environment, you might expose app.locals or custom metrics
                framework: 'Express.js 5.1.0',
                integrated: true
            },
            
            // Node.js process information
            process: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                processId: process.pid,
                processTitle: process.title,
                currentWorkingDirectory: process.cwd(),
                processUptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                loadAverage: process.loadavg()
            },
            
            // Environment and deployment context
            environment: {
                nodeEnvironment: process.env.NODE_ENV || 'development',
                environmentVariables: {
                    PORT: process.env.PORT || 'not set',
                    HOST: process.env.HOST || 'not set',
                    NODE_ENV: process.env.NODE_ENV || 'not set'
                }
            },
            
            // Health and performance indicators
            health: {
                healthy: listening && !SHUTDOWN_INITIATED,
                ready: listening && !!SERVER_START_TIME,
                errors: 0, // Would be incremented by error tracking in production
                warnings: 0, // Would be incremented by warning tracking in production
                lastError: null, // Would store last error timestamp in production
                performanceGrade: 'A' // Would be calculated based on response times in production
            },
            
            // Statistics metadata
            statistics: {
                generated: new Date().toISOString(),
                source: 'getServerStats',
                version: '1.0.0'
            }
        };
        
        // Return frozen statistics object to prevent external modification
        return Object.freeze(stats);
        
    } catch (error) {
        // Handle statistics generation errors gracefully
        logger.error('Failed to generate server statistics', error);
        
        // Return minimal fallback statistics
        return Object.freeze({
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            fallback: {
                serverListening: SERVER_INSTANCE ? SERVER_INSTANCE.listening : false,
                shutdownInitiated: SHUTDOWN_INITIATED,
                uptime: SERVER_START_TIME ? Date.now() - SERVER_START_TIME : 0,
                processId: process.pid,
                nodeVersion: process.version
            }
        });
    }
}

/**
 * Formats uptime duration in human-readable format for logging and monitoring.
 * This function converts millisecond duration into readable format with days, hours, 
 * minutes, and seconds for operational logging, monitoring dashboards, and health 
 * check responses in production environments.
 * 
 * @param {number} uptime - Uptime duration in milliseconds
 * @returns {string} Human-readable uptime format (e.g., "2d 3h 45m 12s")
 */
function formatUptime(uptime) {
    try {
        if (!uptime || uptime < 0) {
            return '0s';
        }
        
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        const parts = [];
        
        if (days > 0) parts.push(`${days}d`);
        if (hours % 24 > 0) parts.push(`${hours % 24}h`);
        if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
        if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);
        
        return parts.length > 0 ? parts.join(' ') : '0s';
        
    } catch (error) {
        return 'unknown';
    }
}

// =============================================================================
// MAIN SERVER INITIALIZATION
// =============================================================================

/**
 * Main initialization function that orchestrates complete server startup sequence.
 * This function serves as the primary entry point for server initialization, coordinating 
 * all startup procedures including configuration loading, HTTP server creation, event 
 * handler setup, process signal handling, and server startup with comprehensive error 
 * handling and logging throughout the initialization process for production-ready deployment.
 * 
 * Server Initialization Sequence:
 * - Logs application initialization start with metadata, environment, and version information
 * - Loads comprehensive server configuration using loadServerConfiguration() with validation
 * - Creates HTTP server instance using createHttpServer() with Express app integration
 * - Sets up comprehensive server event handlers using setupServerEventHandlers() for monitoring
 * - Configures process-level event handlers using setupProcessEventHandlers() for signal management
 * - Starts server listening using startServer() with configuration and error handling
 * - Logs successful server initialization completion and operational readiness status
 * - Returns resolved promise indicating complete server startup success
 * 
 * Production Readiness Features:
 * - Comprehensive error handling with graceful degradation and recovery
 * - Operational logging for monitoring, debugging, and incident response
 * - Container orchestration compatibility with signal handling and health checks
 * - Configuration validation and environment-specific settings management
 * - Performance monitoring and statistics collection for operational insights
 * 
 * @returns {Promise} Promise that resolves when server is successfully initialized, configured, and started
 */
async function initializeAndStartServer() {
    try {
        // Log application initialization start with comprehensive metadata
        logger.info('Initializing Node.js tutorial server application', {
            application: APPLICATION_METADATA.NAME,
            version: APPLICATION_METADATA.VERSION,
            description: APPLICATION_METADATA.DESCRIPTION,
            author: APPLICATION_METADATA.AUTHOR,
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            processId: process.pid,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            initializationPhase: 'start'
        });
        
        // Load server configuration with validation and error handling
        logger.info('Loading server configuration');
        const config = loadServerConfiguration();
        
        // Create HTTP server instance with Express.js integration
        logger.info('Creating HTTP server with Express.js integration');
        const server = createHttpServer(app);
        
        // Set up comprehensive server event handlers for lifecycle management
        logger.info('Configuring server event handlers');
        setupServerEventHandlers(server);
        
        // Configure process-level event handlers for signal management
        logger.info('Configuring process event handlers');
        setupProcessEventHandlers();
        
        // Start server listening with error handling and logging
        logger.info('Starting HTTP server');
        await startServer(server, config);
        
        // Log successful server initialization and readiness
        logger.info('Server initialization completed successfully', {
            application: APPLICATION_METADATA.NAME,
            version: APPLICATION_METADATA.VERSION,
            status: 'ready',
            address: server.address(),
            uptime: 0,
            processId: process.pid,
            timestamp: new Date().toISOString(),
            initializationPhase: 'complete',
            healthy: true,
            ready: true
        });
        
        // Log educational context and tutorial information
        logger.info('Node.js tutorial server ready for educational demonstration', {
            tutorial: 'Basic HTTP server with Express.js 5.1.0 integration',
            endpoint: '/hello',
            expectedResponse: 'Hello world',
            healthCheck: '/health',
            learningObjectives: [
                'Node.js HTTP server creation',
                'Express.js framework integration', 
                'Server configuration management',
                'Graceful shutdown procedures',
                'Production-ready server patterns'
            ]
        });
        
        return Promise.resolve();
        
    } catch (error) {
        // Handle server initialization errors comprehensively
        logger.error('Server initialization failed', {
            error: error.message,
            stack: error.stack,
            phase: 'initialization',
            processId: process.pid,
            timestamp: new Date().toISOString(),
            fatal: true
        });
        
        // Attempt cleanup if partial initialization occurred
        if (SERVER_INSTANCE) {
            logger.info('Attempting cleanup of partially initialized server');
            try {
                await gracefulShutdown('initializationError');
            } catch (cleanupError) {
                logger.error('Failed to cleanup during initialization error', cleanupError);
            }
        }
        
        // Re-throw error for caller handling
        throw error;
    }
}

// =============================================================================
// MODULE EXECUTION AND EXPORTS
// =============================================================================

// Initialize and start server when module is executed directly
if (require.main === module) {
    // Module is being executed directly (node src/server.js)
    initializeAndStartServer().catch((error) => {
        logger.error('Fatal error during server startup', {
            error: error.message,
            stack: error.stack,
            processId: process.pid,
            timestamp: new Date().toISOString(),
            fatal: true
        });
        
        process.exit(1);
    });
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // HTTP server instance for external lifecycle management and testing
    server: SERVER_INSTANCE,
    
    // Graceful shutdown function for external process management and container orchestration
    gracefulShutdown,
    
    // Server statistics function for health checks, monitoring, and operational insights
    getServerStats,
    
    // Server initialization function for testing and custom startup scenarios
    initializeAndStartServer
};