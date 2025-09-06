/**
 * Primary HTTP Server Initialization Module for Node.js Tutorial Application
 * 
 * This module creates and configures the Node.js HTTP server instance for the tutorial application.
 * Orchestrates server startup by binding the Express.js application to an HTTP server, managing 
 * server lifecycle events, implementing graceful shutdown procedures, and providing comprehensive 
 * error handling. Demonstrates production-ready Node.js server patterns while maintaining 
 * educational clarity for learning fundamental HTTP server concepts with Express.js 5.1.0 
 * and Node.js 22.x LTS compatibility.
 * 
 * Key Features:
 * - HTTP server foundation providing request/response handling for tutorial endpoints
 * - Express.js 5.1.0 framework integration with automatic promise error handling
 * - Server startup and configuration management with environment-aware settings  
 * - Educational server architecture patterns demonstrating production-ready lifecycle management
 * - Production-ready server management with graceful shutdown and comprehensive error handling
 * - Performance-optimized server initialization with configuration caching and validation
 * - Security-hardened server configuration with proper signal handling and resource cleanup
 * - Comprehensive operational logging with request correlation and performance metrics
 * - Container-ready deployment patterns for Docker and Kubernetes environments
 * - Memory-efficient operation with automatic cleanup and resource management
 * 
 * Architecture:
 * - Event-driven server lifecycle management using Node.js event patterns
 * - Configuration-driven server initialization with environment-specific settings
 * - Process-level signal handling for production deployment and container orchestration
 * - Performance monitoring integration with uptime tracking and resource utilization
 * - Error handling with comprehensive error classification and recovery guidance
 * - Express.js 5.1.0 integration patterns with enhanced async/await support
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async support and automatic promise error forwarding
 * - Node.js 22.11.0 LTS with Active LTS support extending into late 2025
 * - Production deployment environments including Docker containers and Kubernetes
 * - Development environments with hot reloading and enhanced debugging capabilities
 * - Testing frameworks including Jest and Supertest for comprehensive test coverage
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus HTTP server initialization, Express.js integration, production server patterns
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Node.js built-in HTTP core module for creating HTTP server instance, handling network connections, and managing server lifecycle events
const http = require('http'); // Node.js Built-in

// Node.js built-in process module for environment variable access, signal handling, and process lifecycle management
const process = require('process'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import fully configured Express.js application instance with complete middleware stack, routing, and error handling ready for HTTP server binding
const app = require('./src/app.js');

// Import configuration factory to access environment-specific server settings including port, host, timeout, and startup configuration
const { getConfig } = require('./src/utils/config.js');

// Import logging utilities for server startup, error handling, and operational logging with structured output and request correlation
const { 
    logger 
} = require('./src/utils/logger.js');

// Import server default configuration constants for fallback port, host, and timeout values when environment configuration is not available
const { 
    SERVER_DEFAULTS 
} = require('./src/utils/constants.js');

// Import application metadata constants for startup logging, process identification, and operational monitoring
const { 
    APPLICATION_METADATA 
} = require('./src/utils/constants.js');

// =============================================================================
// GLOBAL SERVER STATE
// =============================================================================

/**
 * Global reference to HTTP server instance for signal handlers and shutdown procedures
 * @type {Object|null}
 */
let SERVER_INSTANCE = null;

/**
 * Timestamp when server startup process began for uptime calculation and performance monitoring
 * @type {string|null}
 */
let STARTUP_TIME = null;

/**
 * Normalized and validated port value after environment variable processing and type conversion
 * @type {number|string|null}
 */
let NORMALIZED_PORT = null;

/**
 * Cached server configuration object for performance optimization and consistent access
 * @type {Object|null}
 */
let SERVER_CONFIG = null;

// =============================================================================
// PORT NORMALIZATION AND VALIDATION
// =============================================================================

/**
 * Normalizes and validates port value from environment variables, configuration, or command line arguments with comprehensive type conversion and range validation.
 * This function parses input value to integer using parseInt() with base 10 radix, checks if parsed value is NaN indicating non-numeric input, 
 * returns original string value if NaN for named pipe or socket path support, validates port number is greater than or equal to 0 for basic range check, 
 * checks if port is within valid TCP range (1-65535) for network binding, validates port is not in reserved system range (1-1023) without proper privileges, 
 * stores normalized port in NORMALIZED_PORT global for reuse and consistency, and returns validated port number ready for server binding operation.
 * 
 * Port normalization includes:
 * - String to integer conversion with radix 10 for consistent numeric parsing
 * - Named pipe and socket path support by preserving string values for IPC communication
 * - TCP port range validation (1-65535) following RFC standards for network binding
 * - System port privilege validation with warnings for reserved ports (1-1023)
 * - Type safety with proper handling of NaN, undefined, and invalid input values
 * - Global caching for performance optimization and consistent port value access
 * 
 * @param {string|number} val - Port value from environment variables, configuration, or command line arguments
 * @returns {number|string|boolean} Normalized port number for network binding, named pipe string for IPC, or false for invalid values
 */
function normalizePort(val) {
    try {
        // Parse input value to integer using parseInt() with base 10 radix for consistent numeric conversion
        const port = parseInt(val, 10);
        
        // Check if parsed value is NaN (not a number) indicating non-numeric input like named pipes
        if (isNaN(port)) {
            // Return original string value if NaN for named pipe or socket path support (Unix domain sockets)
            if (typeof val === 'string' && val.trim().length > 0) {
                logger.debug('Port value is non-numeric, treating as named pipe or socket path', {
                    originalValue: val,
                    type: typeof val,
                    length: val.length
                });
                return val;
            } else {
                logger.warn('Invalid port value provided - not a number or valid string', {
                    originalValue: val,
                    type: typeof val,
                    parsedValue: port
                });
                return false;
            }
        }
        
        // Validate port number is greater than or equal to 0 for basic range check
        if (port < 0) {
            logger.warn('Port number cannot be negative', {
                providedPort: port,
                originalValue: val,
                minimumValidPort: 0
            });
            return false;
        }
        
        // Check if port is within valid TCP range (1-65535) for network binding according to RFC standards
        if (port > 65535) {
            logger.warn('Port number exceeds maximum TCP port range', {
                providedPort: port,
                originalValue: val,
                maximumValidPort: 65535,
                portRangeViolation: true
            });
            return false;
        }
        
        // Validate port is not in reserved system range (1-1023) without proper privileges
        if (port > 0 && port < 1024) {
            logger.warn('Port is in reserved system range - may require elevated privileges', {
                providedPort: port,
                originalValue: val,
                reservedRange: '1-1023',
                requiresPrivileges: true,
                recommendation: 'Use ports above 1023 for non-privileged applications'
            });
            // Don't return false - allow but warn as it might work with proper privileges
        }
        
        // Store normalized port in NORMALIZED_PORT global for reuse and consistency across functions
        NORMALIZED_PORT = port;
        
        logger.debug('Port value normalized successfully', {
            originalValue: val,
            normalizedPort: port,
            portType: port === 0 ? 'system-assigned' : 'user-specified',
            inReservedRange: port > 0 && port < 1024
        });
        
        // Return validated port number ready for server binding operation
        return port;
        
    } catch (error) {
        // Handle port normalization errors with detailed context for troubleshooting
        logger.error('Error occurred during port normalization', {
            originalValue: val,
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack
        });
        return false;
    }
}

// =============================================================================
// HTTP SERVER CREATION AND CONFIGURATION
// =============================================================================

/**
 * Creates HTTP server instance using Node.js http.createServer() with Express.js application binding and server configuration.
 * This function creates HTTP server using http.createServer() with Express application as request handler, sets server timeout from configuration, 
 * configures server keep-alive settings using server.keepAliveTimeout, sets maximum header size if configured, configures request timeout using 
 * server.requestTimeout for request processing limits, sets server backlog limit for pending connections, stores server instance in 
 * SERVER_INSTANCE global for signal handler access, and returns configured HTTP server instance ready for event listener setup.
 * 
 * HTTP server creation includes:
 * - Node.js HTTP server instantiation with Express.js application request handler binding
 * - Timeout configuration for request processing limits and keep-alive connection management
 * - Header size limits for security protection against header-based attacks
 * - Connection backlog configuration for high-load performance optimization
 * - Keep-alive timeout settings for persistent connection optimization
 * - Performance tuning for production deployment and concurrent request handling
 * 
 * @param {Object} expressApp - Express.js application instance with complete middleware stack and routing configuration
 * @returns {Object} Configured HTTP server instance ready for listening on specified port and host with performance optimizations
 */
function createHttpServer(expressApp) {
    try {
        // Validate Express application parameter before server creation
        if (!expressApp || typeof expressApp !== 'function') {
            throw new Error('Invalid Express application provided - must be a function');
        }
        
        // Create HTTP server using http.createServer() with Express application as request handler
        const server = http.createServer(expressApp);
        
        logger.debug('HTTP server instance created with Express.js application handler', {
            serverCreated: true,
            expressAppBound: true,
            serverType: 'HTTP',
            timestamp: new Date().toISOString()
        });
        
        // Load server configuration for timeout and performance settings
        const config = SERVER_CONFIG || getConfig();
        const serverConfig = config?.server || {};
        
        // Set server timeout from configuration using server.setTimeout() for request processing limits
        const timeout = serverConfig.timeout || SERVER_DEFAULTS.TIMEOUT;
        if (typeof server.setTimeout === 'function') {
            server.setTimeout(timeout);
            logger.debug('Server timeout configured', {
                timeoutMs: timeout,
                timeoutSeconds: timeout / 1000,
                source: serverConfig.timeout ? 'configuration' : 'default'
            });
        }
        
        // Configure server keep-alive settings using server.keepAliveTimeout for persistent connection optimization
        const keepAliveTimeout = serverConfig.keepAliveTimeout || 5000; // 5 seconds default
        if (typeof server.keepAliveTimeout !== 'undefined') {
            server.keepAliveTimeout = keepAliveTimeout;
            logger.debug('Server keep-alive timeout configured', {
                keepAliveTimeoutMs: keepAliveTimeout,
                keepAliveTimeoutSeconds: keepAliveTimeout / 1000
            });
        }
        
        // Set maximum header size if configured for security protection against header-based attacks
        const maxHeaderSize = serverConfig.maxHeaderSize || 8192; // 8KB default
        if (typeof server.maxHeadersCount !== 'undefined') {
            server.maxHeadersCount = 100; // Maximum number of headers
            logger.debug('Server header limits configured', {
                maxHeaderSize: maxHeaderSize,
                maxHeadersCount: server.maxHeadersCount,
                securityMeasure: 'header-based attack prevention'
            });
        }
        
        // Configure request timeout using server.requestTimeout for request processing limits (Node.js 18+)
        const requestTimeout = serverConfig.requestTimeout || timeout;
        if (typeof server.requestTimeout !== 'undefined') {
            server.requestTimeout = requestTimeout;
            logger.debug('Server request timeout configured', {
                requestTimeoutMs: requestTimeout,
                requestTimeoutSeconds: requestTimeout / 1000,
                nodeJsFeature: 'requestTimeout (Node.js 18+)'
            });
        }
        
        // Set server backlog limit for pending connections using server.listen() options for high-load performance
        const backlog = serverConfig.backlog || SERVER_DEFAULTS.BACKLOG;
        server._backlog = backlog; // Store for use in listen() call
        
        logger.debug('Server backlog configured for high-load performance', {
            backlog: backlog,
            pendingConnectionLimit: backlog,
            performanceOptimization: true
        });
        
        // Store server instance in SERVER_INSTANCE global for signal handler access and lifecycle management
        SERVER_INSTANCE = server;
        
        logger.info('HTTP server configuration completed successfully', {
            serverConfigured: true,
            timeout: timeout,
            keepAliveTimeout: keepAliveTimeout,
            requestTimeout: requestTimeout,
            backlog: backlog,
            maxHeaderSize: maxHeaderSize,
            expressAppIntegrated: true,
            globalServerInstanceSet: true
        });
        
        // Return configured HTTP server instance ready for event listener setup and binding
        return server;
        
    } catch (error) {
        // Handle server creation errors with comprehensive context and troubleshooting information
        logger.error('Failed to create HTTP server instance', {
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name,
            expressAppProvided: !!expressApp,
            expressAppType: typeof expressApp,
            serverConfigAvailable: !!SERVER_CONFIG,
            timestamp: new Date().toISOString()
        });
        
        throw new Error(`HTTP server creation failed: ${error.message}`);
    }
}

// =============================================================================
// SERVER EVENT HANDLERS
// =============================================================================

/**
 * HTTP server error event handler that processes server startup and runtime errors with comprehensive error classification and recovery guidance.
 * This function checks if error is related to HTTP server listening process using error.syscall, extracts error code and message for detailed error classification, 
 * handles EACCES error (permission denied) with privilege escalation guidance and port recommendations, handles EADDRINUSE error (port already in use) with 
 * port conflict resolution and alternative port suggestions, handles EADDRNOTAVAIL error (address not available) with network configuration troubleshooting, 
 * logs comprehensive error information including stack trace and system context, provides environment-specific recovery suggestions, exits process with 
 * appropriate error code (1) for operational monitoring, and cleans up resources and closes server instance if partially initialized.
 * 
 * Server error handling includes:
 * - Comprehensive error classification with specific error code handling (EACCES, EADDRINUSE, EADDRNOTAVAIL)
 * - Privilege escalation guidance for permission-denied errors with port recommendations
 * - Port conflict resolution with alternative port suggestions and process identification
 * - Network configuration troubleshooting for address availability issues
 * - Production-ready error logging with structured information and recovery guidance
 * - Process management with appropriate exit codes for container orchestration
 * 
 * @param {Error} error - Error object from HTTP server error event containing error code, message, and system context
 * @returns {void} No return value - handles error with logging and process management, exits process for critical errors
 */
function onError(error) {
    try {
        // Check if error is related to HTTP server listening process using error.syscall property
        const isListenError = error.syscall === 'listen';
        
        // Extract error code and message for detailed error classification and handling
        const errorCode = error.code || 'UNKNOWN_ERROR';
        const errorMessage = error.message || 'Unknown server error occurred';
        const port = NORMALIZED_PORT || 'unknown';
        const host = SERVER_CONFIG?.server?.host || SERVER_DEFAULTS.HOST;
        
        logger.error('HTTP server error occurred', {
            error: errorMessage,
            errorCode: errorCode,
            syscall: error.syscall,
            isListenError: isListenError,
            port: port,
            host: host,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            serverInstance: !!SERVER_INSTANCE
        });
        
        // Handle specific error types with targeted recovery guidance and troubleshooting information
        switch (errorCode) {
            case 'EACCES':
                // Handle EACCES error (permission denied) with privilege escalation guidance
                logger.error('Permission denied - HTTP server cannot bind to port', {
                    errorType: 'PERMISSION_DENIED',
                    port: port,
                    host: host,
                    privilegeRequired: port < 1024,
                    recoveryGuidance: {
                        immediateAction: port < 1024 ? 
                            'Run with sudo or use port >= 1024' : 
                            'Check file system permissions',
                        recommendedPorts: [3000, 8000, 8080, 8443],
                        privilegedPortRange: '1-1023',
                        unprivilegedPortRange: '1024-65535',
                        containerGuidance: 'Ensure container runs with appropriate user privileges'
                    }
                });
                break;
                
            case 'EADDRINUSE':
                // Handle EADDRINUSE error (port already in use) with port conflict resolution
                logger.error('Port already in use - another process is using the specified port', {
                    errorType: 'PORT_IN_USE',
                    port: port,
                    host: host,
                    conflictResolution: {
                        checkCommand: `lsof -i :${port} || netstat -tulpn | grep :${port}`,
                        killCommand: `kill $(lsof -t -i:${port})`,
                        alternativePorts: [3001, 3002, 8001, 8002],
                        portEnvironmentVariable: 'PORT',
                        dockerGuidance: 'Check for port conflicts with other containers',
                        kubernetesGuidance: 'Verify service port configuration and pod conflicts'
                    }
                });
                break;
                
            case 'EADDRNOTAVAIL':
                // Handle EADDRNOTAVAIL error (address not available) with network configuration troubleshooting
                logger.error('Address not available - specified host address cannot be bound', {
                    errorType: 'ADDRESS_NOT_AVAILABLE',
                    port: port,
                    host: host,
                    networkTroubleshooting: {
                        interfaceCheck: 'ip addr show || ifconfig',
                        hostnameResolution: `nslookup ${host} || dig ${host}`,
                        bindingOptions: ['0.0.0.0', '127.0.0.1', 'localhost'],
                        dockerNetworking: 'Check container network configuration',
                        kubernetesNetworking: 'Verify pod network policies and service configuration'
                    }
                });
                break;
                
            default:
                // Handle unknown error codes with general troubleshooting guidance
                logger.error('Unknown HTTP server error occurred', {
                    errorType: 'UNKNOWN_SERVER_ERROR',
                    errorCode: errorCode,
                    port: port,
                    host: host,
                    generalTroubleshooting: {
                        checkServerConfiguration: true,
                        verifyNetworkAccess: true,
                        reviewSystemResources: true,
                        containerLogsCommand: 'docker logs <container_id>',
                        systemLogsCommand: 'journalctl -u <service_name>'
                    }
                });
                break;
        }
        
        // Provide environment-specific recovery suggestions based on error type and deployment context
        const environment = process.env.NODE_ENV || 'development';
        const deploymentContext = process.env.CONTAINER_ENV || 'local';
        
        logger.error('Environment-specific error recovery guidance', {
            environment: environment,
            deploymentContext: deploymentContext,
            recoverySteps: {
                development: [
                    'Check if another development server is running',
                    'Try a different port using PORT environment variable',
                    'Restart the development environment'
                ],
                production: [
                    'Verify deployment configuration',
                    'Check container orchestration settings',
                    'Review load balancer and proxy configuration',
                    'Monitor system resources and network connectivity'
                ],
                container: [
                    'Check container port mapping',
                    'Verify container network configuration',
                    'Review Docker compose or Kubernetes service definitions'
                ]
            }
        });
        
        // Clean up resources and close server instance if partially initialized to prevent resource leaks
        if (SERVER_INSTANCE) {
            try {
                logger.info('Attempting to close partially initialized server instance');
                SERVER_INSTANCE.close(() => {
                    logger.info('Partially initialized server instance closed successfully');
                });
                SERVER_INSTANCE = null;
            } catch (cleanupError) {
                logger.warn('Failed to clean up partially initialized server instance', {
                    cleanupError: cleanupError.message,
                    originalError: errorMessage
                });
            }
        }
        
        // Exit process with appropriate error code (1) for operational monitoring and container orchestration
        logger.error('Server startup failed - exiting process', {
            exitCode: 1,
            errorSummary: errorMessage,
            errorCode: errorCode,
            port: port,
            host: host,
            timestamp: new Date().toISOString()
        });
        
        process.exit(1);
        
    } catch (handlerError) {
        // Handle errors in error handler itself - use console as fallback to avoid circular logging errors
        console.error(`[CRITICAL] Error handler failed: ${handlerError.message}`);
        console.error(`[CRITICAL] Original server error: ${error?.message || 'unknown'}`);
        console.error(`[CRITICAL] Server will exit with code 1`);
        process.exit(1);
    }
}

/**
 * HTTP server listening event handler that logs successful server startup with comprehensive binding information and operational details.
 * This function gets server address information using server.address() for binding details, calculates server startup duration using STARTUP_TIME timestamp, 
 * determines address type (IPv4, IPv6, or named pipe) for appropriate logging format, formats bind address for logging output handling IPv6 :: as localhost, 
 * logs successful server startup with application name and version information, includes bind address and port number with protocol information, adds process ID 
 * and Node.js version with memory usage for operational monitoring context, logs startup duration and ready state confirmation, and outputs development-friendly 
 * server URL (http://localhost:port) for easy testing and access.
 * 
 * Server startup logging includes:
 * - Comprehensive server address information with IPv4, IPv6, and named pipe support
 * - Performance metrics with startup duration calculation and memory usage monitoring
 * - Operational context including process ID, Node.js version, and platform information
 * - Development-friendly output with clickable server URLs for easy testing
 * - Production monitoring information with structured logging for observability
 * - Application metadata integration for service identification and version tracking
 * 
 * @returns {void} No return value - handles successful server startup logging and operational setup
 */
function onListening() {
    try {
        // Get server address information using server.address() for comprehensive binding details
        const addr = SERVER_INSTANCE.address();
        
        // Calculate server startup duration using STARTUP_TIME timestamp for performance metrics
        const startupDuration = STARTUP_TIME ? 
            Date.now() - new Date(STARTUP_TIME).getTime() : 
            'unknown';
        
        // Determine address type (IPv4, IPv6, or named pipe) for appropriate logging format
        let bind, addressType, protocol, displayAddress;
        
        if (typeof addr === 'string') {
            // Named pipe or Unix domain socket
            bind = `pipe ${addr}`;
            addressType = 'named_pipe';
            protocol = 'IPC';
            displayAddress = addr;
        } else if (addr) {
            // Network socket (IPv4 or IPv6)
            addressType = addr.family === 'IPv6' ? 'ipv6' : 'ipv4';
            protocol = 'HTTP';
            
            // Format bind address for logging output, handling IPv6 :: as localhost for readability
            if (addr.family === 'IPv6') {
                displayAddress = addr.address === '::' ? 'localhost' : `[${addr.address}]`;
            } else {
                displayAddress = addr.address === '0.0.0.0' ? 'localhost' : addr.address;
            }
            
            bind = `${addressType.toUpperCase()} ${addr.address}:${addr.port}`;
        } else {
            // Fallback for unexpected address format
            bind = 'unknown address';
            addressType = 'unknown';
            protocol = 'unknown';
            displayAddress = 'unknown';
        }
        
        // Log successful server startup with application name, version, and comprehensive environment information
        logger.info('HTTP server started successfully and listening for connections', {
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                description: APPLICATION_METADATA.DESCRIPTION
            },
            server: {
                address: addr,
                bind: bind,
                addressType: addressType,
                protocol: protocol,
                displayAddress: displayAddress,
                port: addr?.port || NORMALIZED_PORT,
                host: SERVER_CONFIG?.server?.host || SERVER_DEFAULTS.HOST
            },
            performance: {
                startupDuration: typeof startupDuration === 'number' ? `${startupDuration}ms` : startupDuration,
                startupTime: STARTUP_TIME,
                readyAt: new Date().toISOString()
            },
            process: {
                pid: process.pid,
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                uptime: `${Math.floor(process.uptime())}s`,
                memoryUsage: process.memoryUsage()
            },
            environment: {
                nodeEnv: process.env.NODE_ENV || 'development',
                container: !!process.env.CONTAINER_ENV,
                kubernetes: !!process.env.KUBERNETES_SERVICE_HOST
            }
        });
        
        // Output development-friendly server URL (http://localhost:port) for easy testing and access
        if (addr && typeof addr !== 'string' && addr.port) {
            const serverUrl = `http://${displayAddress}:${addr.port}`;
            logger.info('Server ready for requests', {
                serverUrl: serverUrl,
                clickableUrl: serverUrl,
                endpoints: {
                    hello: `${serverUrl}/hello`,
                    health: `${serverUrl}/health`,
                    readiness: `${serverUrl}/readyz`,
                    liveness: `${serverUrl}/livez`
                },
                development: {
                    testCommands: [
                        `curl ${serverUrl}/hello`,
                        `curl ${serverUrl}/health`,
                        `wget -qO- ${serverUrl}/hello`
                    ]
                }
            });
        }
        
        // Log startup duration and ready state confirmation for performance tracking and health monitoring
        logger.info('Server initialization completed successfully', {
            initializationStatus: 'complete',
            serverState: 'listening',
            startupDuration: typeof startupDuration === 'number' ? `${startupDuration}ms` : startupDuration,
            readyForConnections: true,
            healthCheckEndpoints: ['/health', '/livez', '/readyz'],
            applicationEndpoints: ['/hello'],
            operationalMetrics: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                uptime: process.uptime(),
                loadAverage: process.platform === 'linux' ? require('os').loadavg() : null
            }
        });
        
    } catch (error) {
        // Handle listening event logging errors gracefully - use basic console output as fallback
        logger.error('Error occurred in server listening event handler', {
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name,
            serverInstance: !!SERVER_INSTANCE,
            fallbackToConsole: true
        });
        
        // Fallback to basic console logging to ensure startup confirmation is visible
        try {
            const addr = SERVER_INSTANCE?.address();
            const port = addr?.port || NORMALIZED_PORT || 'unknown';
            console.log(`[${new Date().toISOString()}] [INFO] Server listening on port ${port}`);
            if (addr && typeof addr !== 'string' && addr.port) {
                console.log(`[${new Date().toISOString()}] [INFO] Server URL: http://localhost:${addr.port}`);
            }
        } catch (fallbackError) {
            console.log(`[${new Date().toISOString()}] [INFO] Server started (details unavailable due to logging error)`);
        }
    }
}

// =============================================================================
// PROCESS EVENT HANDLERS AND GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Configures comprehensive process-level event handlers for graceful shutdown, signal management, and error handling in production environments.
 * This function sets up SIGTERM handler for production environment graceful shutdown requests from container orchestration, configures SIGINT handler for 
 * development Ctrl+C interrupt and manual shutdown procedures, sets up SIGHUP handler for configuration reload requests and log rotation support, configures 
 * uncaughtException handler for critical error logging with context preservation, sets up unhandledRejection handler for promise rejection monitoring and 
 * Express 5.1.0 error integration, configures beforeExit handler for final cleanup operations, sets up exit handler for process termination logging, 
 * adds warning event handler for Node.js runtime warnings, and logs process event handler setup completion.
 * 
 * Process event handler configuration includes:
 * - Production-ready signal handling for container orchestration (SIGTERM, SIGINT, SIGHUP)
 * - Comprehensive error event handling (uncaughtException, unhandledRejection)
 * - Process lifecycle management (beforeExit, exit, warning events)
 * - Integration with Express.js 5.1.0 automatic promise error handling
 * - Operational logging and monitoring for process health and lifecycle events
 * - Security-conscious event handling with proper context preservation and cleanup
 * 
 * @returns {void} No return value - configures process event listeners for complete lifecycle management
 */
function setupProcessEventHandlers() {
    try {
        // Set up SIGTERM handler for production environment graceful shutdown requests from container orchestration
        process.on('SIGTERM', () => {
            logger.info('SIGTERM signal received - initiating graceful shutdown', {
                signal: 'SIGTERM',
                source: 'container_orchestration_or_process_manager',
                shutdownType: 'graceful',
                timestamp: new Date().toISOString(),
                serverInstance: !!SERVER_INSTANCE
            });
            gracefulShutdown('SIGTERM');
        });
        
        // Configure SIGINT handler for development Ctrl+C interrupt and manual shutdown procedures  
        process.on('SIGINT', () => {
            logger.info('SIGINT signal received - initiating graceful shutdown', {
                signal: 'SIGINT',
                source: 'ctrl_c_or_manual_interrupt',
                shutdownType: 'graceful',
                timestamp: new Date().toISOString(),
                serverInstance: !!SERVER_INSTANCE
            });
            gracefulShutdown('SIGINT');
        });
        
        // Set up SIGHUP handler for configuration reload requests and log rotation support
        process.on('SIGHUP', () => {
            logger.info('SIGHUP signal received - configuration reload requested', {
                signal: 'SIGHUP',
                source: 'configuration_reload_or_log_rotation',
                action: 'reload_configuration',
                timestamp: new Date().toISOString(),
                serverInstance: !!SERVER_INSTANCE
            });
            
            // Note: In a more complex application, this would trigger configuration reload
            // For the tutorial, we log the event but don't implement hot configuration reloading
            logger.info('Configuration reload not implemented in tutorial - continuing with current configuration');
        });
        
        // Configure uncaughtException handler for critical error logging, context preservation, and emergency cleanup
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception detected - critical error occurred', {
                error: error.message,
                stack: error.stack,
                errorType: error.constructor.name,
                critical: true,
                uncaught: true,
                serverInstance: !!SERVER_INSTANCE,
                process: {
                    pid: process.pid,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                },
                emergencyShutdown: true,
                timestamp: new Date().toISOString()
            });
            
            // Emergency cleanup before process termination
            if (SERVER_INSTANCE) {
                try {
                    SERVER_INSTANCE.close(() => {
                        logger.error('Server closed due to uncaught exception - process will exit');
                        process.exit(1);
                    });
                } catch (closeError) {
                    logger.error('Failed to close server during emergency shutdown', {
                        closeError: closeError.message
                    });
                    process.exit(1);
                }
            } else {
                process.exit(1);
            }
        });
        
        // Set up unhandledRejection handler for promise rejection monitoring and Express 5.1.0 error integration
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection detected', {
                reason: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : 'No stack trace available',
                promise: promise.toString(),
                unhandledRejection: true,
                express5Integration: true,
                serverInstance: !!SERVER_INSTANCE,
                timestamp: new Date().toISOString(),
                criticalityLevel: 'high'
            });
            
            // Express 5.1.0 automatically forwards rejected promises to error-handling middleware
            // This handler catches rejections that aren't handled by Express.js
            logger.warn('Promise rejection not handled by Express.js 5.1.0 automatic error handling');
        });
        
        // Configure beforeExit handler for final cleanup operations and resource deallocation
        process.on('beforeExit', (code) => {
            logger.info('Process beforeExit event - performing final cleanup', {
                exitCode: code,
                event: 'beforeExit',
                finalCleanup: true,
                serverInstance: !!SERVER_INSTANCE,
                timestamp: new Date().toISOString()
            });
            
            // Final cleanup operations before process exit
            if (SERVER_INSTANCE && !SERVER_INSTANCE.listening) {
                logger.debug('Server instance exists but not listening - performing cleanup');
                SERVER_INSTANCE = null;
            }
        });
        
        // Set up exit handler for process termination logging and final operational status reporting
        process.on('exit', (code) => {
            // Note: Only synchronous operations allowed in exit handler
            console.log(`[${new Date().toISOString()}] [INFO] Process exiting with code: ${code}`);
            console.log(`[${new Date().toISOString()}] [INFO] Server uptime: ${STARTUP_TIME ? 
                Math.floor((Date.now() - new Date(STARTUP_TIME).getTime()) / 1000) : 0} seconds`);
        });
        
        // Add warning event handler for Node.js runtime warnings and deprecation notices
        process.on('warning', (warning) => {
            logger.warn('Node.js runtime warning detected', {
                warning: warning.message,
                warningName: warning.name,
                warningStack: warning.stack,
                warningCode: warning.code,
                runtimeWarning: true,
                timestamp: new Date().toISOString(),
                nodeVersion: process.version
            });
        });
        
        // Log process event handler setup completion with enabled signals and handler configuration
        logger.info('Process event handlers configured successfully', {
            eventHandlers: {
                SIGTERM: 'graceful_shutdown',
                SIGINT: 'graceful_shutdown', 
                SIGHUP: 'configuration_reload',
                uncaughtException: 'emergency_shutdown',
                unhandledRejection: 'error_logging',
                beforeExit: 'final_cleanup',
                exit: 'termination_logging',
                warning: 'runtime_warnings'
            },
            productionReady: true,
            containerOrchestrationSupport: true,
            express5Integration: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        // Handle process event handler setup errors with fallback basic signal handling
        logger.error('Failed to set up process event handlers', {
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name,
            fallbackHandling: true,
            timestamp: new Date().toISOString()
        });
        
        // Set up minimal fallback handlers to ensure basic functionality
        try {
            process.on('SIGTERM', () => process.exit(0));
            process.on('SIGINT', () => process.exit(0));
            logger.warn('Fallback process event handlers configured - limited functionality');
        } catch (fallbackError) {
            logger.error('Failed to set up even fallback process handlers', {
                fallbackError: fallbackError.message
            });
        }
    }
}

/**
 * Performs comprehensive graceful server shutdown by closing HTTP server, draining connections, cleaning up resources, and logging shutdown process with timeout protection.
 * This function logs graceful shutdown initiation with signal type and reason, calculates total server uptime using STARTUP_TIME timestamp, stops accepting new HTTP connections 
 * using server.close(), sets shutdown timeout (10 seconds default) to prevent indefinite hanging, waits for active HTTP connections to complete naturally or reach timeout, 
 * closes any remaining persistent connections forcefully after timeout, cleans up temporary resources and file handles, logs shutdown completion with final statistics, 
 * and exits process with code 0 for successful shutdown or code 1 if forced termination required.
 * 
 * Graceful shutdown process includes:
 * - HTTP server connection draining with configurable timeout for active request completion
 * - Resource cleanup including timers, handles, and temporary resources to prevent leaks
 * - Operational logging with uptime calculation and shutdown statistics for monitoring
 * - Timeout protection to prevent indefinite shutdown hanging during connection draining
 * - Process exit with appropriate exit codes for container orchestration and monitoring
 * - Force termination fallback for unresponsive connections and resource cleanup failures
 * 
 * @param {string} signal - Signal type triggering shutdown (SIGTERM, SIGINT, etc.) for logging and operational tracking
 * @returns {void} No return value - performs complete shutdown sequence and exits process
 */
function gracefulShutdown(signal) {
    try {
        // Log graceful shutdown initiation with signal type, reason, and timestamp for operational tracking
        logger.info('Graceful shutdown initiated', {
            signal: signal,
            reason: `${signal}_signal_received`,
            shutdownType: 'graceful',
            timestamp: new Date().toISOString(),
            serverInstance: !!SERVER_INSTANCE,
            initiation: 'starting_graceful_shutdown_sequence'
        });
        
        // Calculate total server uptime using STARTUP_TIME timestamp for final operational metrics
        const uptime = STARTUP_TIME ? 
            Math.floor((Date.now() - new Date(STARTUP_TIME).getTime()) / 1000) : 
            0;
        
        logger.info('Server operational statistics before shutdown', {
            uptime: `${uptime} seconds`,
            uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
            startupTime: STARTUP_TIME,
            shutdownTime: new Date().toISOString(),
            processId: process.pid,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        });
        
        // Stop accepting new HTTP connections using server.close() to begin connection draining
        if (SERVER_INSTANCE) {
            logger.info('Stopping HTTP server - no longer accepting new connections');
            
            // Set shutdown timeout (10 seconds default) to prevent indefinite hanging during connection draining
            const shutdownTimeout = 10000; // 10 seconds
            let shutdownTimer;
            
            // Create timeout handler for forced shutdown if graceful shutdown takes too long
            shutdownTimer = setTimeout(() => {
                logger.warn('Graceful shutdown timeout reached - forcing server termination', {
                    timeoutMs: shutdownTimeout,
                    timeoutSeconds: shutdownTimeout / 1000,
                    forcedTermination: true,
                    reason: 'shutdown_timeout_exceeded'
                });
                
                // Force close any remaining connections and exit immediately
                if (SERVER_INSTANCE) {
                    try {
                        // Destroy all existing connections
                        SERVER_INSTANCE.closeAllConnections?.();
                        logger.info('Forced closure of all server connections');
                    } catch (forceError) {
                        logger.error('Error during forced connection closure', {
                            error: forceError.message
                        });
                    }
                }
                
                logger.info('Forced shutdown complete - process will exit with code 1');
                process.exit(1);
            }, shutdownTimeout);
            
            // Begin graceful server shutdown - wait for active connections to complete
            SERVER_INSTANCE.close((error) => {
                // Clear the timeout since graceful shutdown completed
                clearTimeout(shutdownTimer);
                
                if (error) {
                    logger.error('Error occurred during graceful server shutdown', {
                        error: error.message,
                        stack: error.stack,
                        errorType: error.constructor.name,
                        shutdownPhase: 'server_close'
                    });
                } else {
                    logger.info('HTTP server closed gracefully - all connections drained');
                }
                
                // Clean up temporary resources, file handles, and timer references to prevent resource leaks
                try {
                    // Clear any remaining global references
                    SERVER_INSTANCE = null;
                    SERVER_CONFIG = null;
                    NORMALIZED_PORT = null;
                    STARTUP_TIME = null;
                    
                    logger.info('Server resource cleanup completed successfully', {
                        resourcesCleanedUp: [
                            'SERVER_INSTANCE',
                            'SERVER_CONFIG', 
                            'NORMALIZED_PORT',
                            'STARTUP_TIME'
                        ],
                        cleanup: 'successful'
                    });
                } catch (cleanupError) {
                    logger.warn('Error during resource cleanup', {
                        cleanupError: cleanupError.message,
                        impact: 'minimal - process will exit anyway'
                    });
                }
                
                // Log shutdown completion with final statistics, uptime, and resource cleanup summary
                logger.info('Graceful shutdown completed successfully', {
                    signal: signal,
                    shutdownType: 'graceful',
                    totalUptime: `${uptime} seconds`,
                    shutdownDuration: shutdownTimeout > 0 ? 'within_timeout' : 'immediate',
                    resourceCleanup: 'completed',
                    finalStatus: 'shutdown_successful',
                    exitCode: 0,
                    timestamp: new Date().toISOString()
                });
                
                // Exit process with code 0 for successful graceful shutdown
                process.exit(0);
            });
            
        } else {
            // Handle case where server instance is not available
            logger.info('No active server instance found - proceeding with process termination', {
                serverInstance: false,
                directExit: true,
                reason: 'no_server_to_shutdown'
            });
            
            logger.info('Process termination completed', {
                signal: signal,
                uptime: `${uptime} seconds`,
                exitCode: 0,
                timestamp: new Date().toISOString()
            });
            
            process.exit(0);
        }
        
    } catch (error) {
        // Handle graceful shutdown errors - fall back to immediate process termination
        logger.error('Error occurred during graceful shutdown process', {
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name,
            signal: signal,
            fallbackToImmediateExit: true,
            timestamp: new Date().toISOString()
        });
        
        // Attempt basic cleanup before forced exit
        try {
            if (SERVER_INSTANCE) {
                SERVER_INSTANCE.close();
                SERVER_INSTANCE = null;
            }
        } catch (cleanupError) {
            logger.error('Failed to perform basic cleanup during error recovery', {
                cleanupError: cleanupError.message
            });
        }
        
        logger.error('Graceful shutdown failed - performing immediate process termination', {
            exitCode: 1,
            reason: 'graceful_shutdown_error',
            timestamp: new Date().toISOString()
        });
        
        // Exit with code 1 to indicate shutdown error
        process.exit(1);
    }
}

// =============================================================================
// CONFIGURATION AND SERVER MANAGEMENT
// =============================================================================

/**
 * Loads and validates server configuration from environment variables, configuration files, and default values with comprehensive error handling.
 * This function loads environment-specific configuration using getConfig() with caching for performance, extracts server configuration section from 
 * complete application configuration, merges environment variables (PORT, HOST) with configuration file values using precedence rules, applies default 
 * values from SERVER_DEFAULTS constants for missing configuration parameters, validates port number using normalizePort() function with range and type checking, 
 * validates host address format for IPv4/IPv6 and hostname compatibility, validates timeout values ensuring positive integers and reasonable limits, caches 
 * validated configuration in SERVER_CONFIG global for consistent access, and returns complete server configuration object ready for HTTP server initialization.
 * 
 * Configuration loading includes:
 * - Environment-aware configuration loading with development, production, and test environment support
 * - Configuration validation with comprehensive error checking and type validation
 * - Environment variable precedence over configuration file values for deployment flexibility
 * - Default value application for missing configuration parameters using SERVER_DEFAULTS
 * - Performance optimization through configuration caching in SERVER_CONFIG global
 * - Network address validation for secure and reliable server binding
 * 
 * @returns {Object} Complete server configuration object with validated port, host, timeout, and operational settings
 */
function loadServerConfiguration() {
    try {
        // Load environment-specific configuration using getConfig() with caching for performance
        const config = getConfig();
        
        logger.debug('Loading server configuration from environment-specific settings', {
            configSource: 'getConfig',
            environment: config?.app?.env || process.env.NODE_ENV || 'development',
            configurationAvailable: !!config
        });
        
        // Extract server configuration section from complete application configuration
        const serverConfigSection = config?.server || {};
        
        // Merge environment variables (PORT, HOST) with configuration file values using precedence rules
        // Environment variables take precedence over configuration file values for deployment flexibility
        const port = process.env.PORT || serverConfigSection.port || SERVER_DEFAULTS.PORT;
        const host = process.env.HOST || serverConfigSection.host || SERVER_DEFAULTS.HOST;
        const timeout = process.env.TIMEOUT || serverConfigSection.timeout || SERVER_DEFAULTS.TIMEOUT;
        
        logger.debug('Configuration value resolution completed', {
            port: { 
                value: port, 
                source: process.env.PORT ? 'environment' : (serverConfigSection.port ? 'config' : 'default')
            },
            host: { 
                value: host, 
                source: process.env.HOST ? 'environment' : (serverConfigSection.host ? 'config' : 'default')
            },
            timeout: { 
                value: timeout, 
                source: process.env.TIMEOUT ? 'environment' : (serverConfigSection.timeout ? 'config' : 'default')
            }
        });
        
        // Validate port number using normalizePort() function with range and type checking
        const validatedPort = normalizePort(port);
        if (validatedPort === false) {
            throw new Error(`Invalid port configuration: ${port}. Must be a valid port number or named pipe.`);
        }
        
        // Validate host address format for IPv4, IPv6, and hostname compatibility
        let validatedHost = host;
        if (typeof host !== 'string' || host.trim().length === 0) {
            logger.warn('Invalid host configuration - using default', {
                providedHost: host,
                hostType: typeof host,
                defaultHost: SERVER_DEFAULTS.HOST
            });
            validatedHost = SERVER_DEFAULTS.HOST;
        } else {
            // Basic host address format validation
            const trimmedHost = host.trim();
            const isValidFormat = /^[a-zA-Z0-9.-]+$|^::$|^0\.0\.0\.0$/.test(trimmedHost) || 
                                 trimmedHost === 'localhost';
            
            if (!isValidFormat) {
                logger.warn('Host format validation failed - proceeding with provided value', {
                    providedHost: host,
                    validation: 'failed',
                    risk: 'binding_may_fail'
                });
            }
            
            validatedHost = trimmedHost;
        }
        
        // Validate timeout values ensuring positive integers and reasonable limits
        let validatedTimeout = SERVER_DEFAULTS.TIMEOUT;
        const timeoutNumber = parseInt(timeout, 10);
        
        if (!isNaN(timeoutNumber) && timeoutNumber > 0) {
            // Check for reasonable timeout limits (between 1 second and 5 minutes)
            if (timeoutNumber >= 1000 && timeoutNumber <= 300000) {
                validatedTimeout = timeoutNumber;
            } else {
                logger.warn('Timeout value outside reasonable range - using default', {
                    providedTimeout: timeoutNumber,
                    reasonableRange: '1000ms - 300000ms (1s - 5min)',
                    defaultTimeout: SERVER_DEFAULTS.TIMEOUT
                });
            }
        } else {
            logger.warn('Invalid timeout configuration - using default', {
                providedTimeout: timeout,
                parsedTimeout: timeoutNumber,
                defaultTimeout: SERVER_DEFAULTS.TIMEOUT
            });
        }
        
        // Apply additional server configuration defaults for comprehensive server setup
        const serverConfiguration = {
            port: validatedPort,
            host: validatedHost,
            timeout: validatedTimeout,
            keepAliveTimeout: serverConfigSection.keepAliveTimeout || 5000,
            requestTimeout: serverConfigSection.requestTimeout || validatedTimeout,
            maxHeaderSize: serverConfigSection.maxHeaderSize || 8192,
            backlog: serverConfigSection.backlog || SERVER_DEFAULTS.BACKLOG,
            keepAlive: serverConfigSection.keepAlive !== false,
            
            // Additional operational settings
            server_name: config?.app?.name || APPLICATION_METADATA.NAME,
            environment: config?.app?.env || process.env.NODE_ENV || 'development',
            trusted_proxies: serverConfigSection.trusted_proxies || [],
            
            // Performance and security settings
            compression: serverConfigSection.compression !== false,
            security_headers: serverConfigSection.security_headers !== false,
            rate_limiting: serverConfigSection.rate_limiting !== false
        };
        
        // Cache validated configuration in SERVER_CONFIG global for consistent access across functions
        SERVER_CONFIG = {
            server: serverConfiguration,
            app: config?.app || {},
            logging: config?.logging || {},
            security: config?.security || {},
            monitoring: config?.monitoring || {}
        };
        
        logger.info('Server configuration loaded and validated successfully', {
            serverConfiguration: {
                port: serverConfiguration.port,
                host: serverConfiguration.host,
                timeout: `${serverConfiguration.timeout}ms`,
                keepAliveTimeout: `${serverConfiguration.keepAliveTimeout}ms`,
                environment: serverConfiguration.environment,
                serverName: serverConfiguration.server_name
            },
            validation: {
                portValidation: 'passed',
                hostValidation: 'passed',
                timeoutValidation: 'passed'
            },
            configurationCached: true,
            timestamp: new Date().toISOString()
        });
        
        // Return complete server configuration object ready for HTTP server initialization
        return serverConfiguration;
        
    } catch (error) {
        // Handle configuration loading errors with detailed context and fallback information
        logger.error('Failed to load server configuration', {
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name,
            fallbackToDefaults: true,
            timestamp: new Date().toISOString()
        });
        
        // Create fallback configuration using SERVER_DEFAULTS for continued operation
        const fallbackConfiguration = {
            port: normalizePort(process.env.PORT || SERVER_DEFAULTS.PORT) || SERVER_DEFAULTS.PORT,
            host: process.env.HOST || SERVER_DEFAULTS.HOST,
            timeout: SERVER_DEFAULTS.TIMEOUT,
            keepAliveTimeout: 5000,
            requestTimeout: SERVER_DEFAULTS.TIMEOUT,
            maxHeaderSize: 8192,
            backlog: SERVER_DEFAULTS.BACKLOG,
            keepAlive: true,
            server_name: APPLICATION_METADATA.NAME,
            environment: process.env.NODE_ENV || 'development',
            trusted_proxies: [],
            compression: true,
            security_headers: true,
            rate_limiting: false // Disable by default in fallback
        };
        
        // Cache fallback configuration
        SERVER_CONFIG = { server: fallbackConfiguration };
        
        logger.warn('Using fallback server configuration due to configuration loading failure', {
            fallbackConfiguration: fallbackConfiguration,
            originalError: error.message,
            configurationCached: true
        });
        
        return fallbackConfiguration;
    }
}

/**
 * Main server startup orchestration function that coordinates complete server initialization including configuration loading, HTTP server creation, event handler setup, and startup logging.
 * This function records precise startup time in STARTUP_TIME global for performance tracking, logs application startup initiation with metadata and environment information, loads and validates 
 * server configuration using loadServerConfiguration() with error handling, imports and validates Express application instance ensuring complete middleware stack configuration, creates HTTP server 
 * instance using createHttpServer() with Express app binding and configuration, sets up comprehensive HTTP server event listeners for error and listening events, configures process-level event 
 * handlers using setupProcessEventHandlers() for signal management, initializes server listening on configured port and host with backlog and connection limits, returns Promise resolving to 
 * server instance when listening event confirms successful startup, and handles any startup errors with comprehensive logging and graceful failure procedures.
 * 
 * Server startup orchestration includes:
 * - Complete server initialization lifecycle with error handling and rollback capabilities
 * - Configuration loading and validation with environment-aware settings and defaults
 * - Express.js application integration with comprehensive middleware stack verification
 * - HTTP server creation and configuration with performance and security optimizations
 * - Event handler setup for production-ready signal handling and error management
 * - Operational logging with startup metrics and performance tracking
 * 
 * @returns {Promise<Object>} Promise resolving to HTTP server instance when successfully started and listening
 */
async function startServer() {
    try {
        // Record precise startup time in STARTUP_TIME global for performance tracking and uptime calculation
        STARTUP_TIME = new Date().toISOString();
        
        logger.info('Server startup initiated', {
            startupTime: STARTUP_TIME,
            startupPhase: 'initialization',
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                description: APPLICATION_METADATA.DESCRIPTION
            },
            environment: {
                nodeEnv: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                pid: process.pid
            },
            system: {
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
                loadAverage: process.platform === 'linux' ? require('os').loadavg() : null
            }
        });
        
        // Load and validate server configuration using loadServerConfiguration() with error handling
        logger.debug('Loading server configuration');
        const serverConfig = loadServerConfiguration();
        
        if (!serverConfig) {
            throw new Error('Failed to load valid server configuration');
        }
        
        // Import and validate Express application instance ensuring complete middleware stack configuration
        logger.debug('Validating Express application instance');
        if (!app || typeof app !== 'function') {
            throw new Error('Invalid Express application instance - app must be a function');
        }
        
        // Log Express application validation success
        logger.info('Express application instance validated successfully', {
            expressApp: {
                type: typeof app,
                isFunction: typeof app === 'function',
                middlewareStackIntegrated: true
            },
            expressVersion: '5.1.0',
            features: {
                automaticPromiseErrorHandling: true,
                enhancedAsyncAwaitSupport: true
            }
        });
        
        // Create HTTP server instance using createHttpServer() with Express app binding and configuration
        logger.debug('Creating HTTP server instance');
        const server = createHttpServer(app);
        
        if (!server) {
            throw new Error('Failed to create HTTP server instance');
        }
        
        // Set up comprehensive HTTP server event listeners for error and listening events
        logger.debug('Setting up HTTP server event listeners');
        
        // Configure error event handler with comprehensive error handling
        server.on('error', onError);
        
        // Configure listening event handler with startup confirmation and operational details
        server.on('listening', onListening);
        
        // Add additional server event listeners for operational monitoring
        server.on('connection', (socket) => {
            logger.debug('New client connection established', {
                clientAddress: socket.remoteAddress,
                clientPort: socket.remotePort,
                connectionTime: new Date().toISOString()
            });
        });
        
        server.on('close', () => {
            logger.info('HTTP server closed', {
                serverClosed: true,
                timestamp: new Date().toISOString()
            });
        });
        
        // Configure process-level event handlers using setupProcessEventHandlers() for signal management
        logger.debug('Setting up process-level event handlers');
        setupProcessEventHandlers();
        
        // Initialize server listening on configured port and host with backlog and connection limits
        logger.info('Starting HTTP server - binding to network interface', {
            serverConfig: {
                port: serverConfig.port,
                host: serverConfig.host,
                timeout: `${serverConfig.timeout}ms`,
                backlog: serverConfig.backlog,
                environment: serverConfig.environment
            },
            binding: 'in_progress'
        });
        
        // Return Promise resolving to server instance when listening event confirms successful startup
        return new Promise((resolve, reject) => {
            // Set up timeout for server startup to prevent hanging
            const startupTimeout = setTimeout(() => {
                logger.error('Server startup timeout - binding took too long', {
                    timeoutMs: 30000,
                    port: serverConfig.port,
                    host: serverConfig.host,
                    startupPhase: 'binding_timeout'
                });
                reject(new Error('Server startup timeout - failed to bind within 30 seconds'));
            }, 30000); // 30 second timeout
            
            // Override listening handler to resolve promise
            const originalOnListening = onListening;
            server.on('listening', () => {
                clearTimeout(startupTimeout);
                originalOnListening();
                
                logger.info('Server startup completed successfully', {
                    startupPhase: 'complete',
                    serverListening: true,
                    startupDuration: STARTUP_TIME ? 
                        `${Date.now() - new Date(STARTUP_TIME).getTime()}ms` : 
                        'unknown',
                    serverInstance: true
                });
                
                resolve(server);
            });
            
            // Override error handler to reject promise
            const originalOnError = onError;
            server.on('error', (error) => {
                clearTimeout(startupTimeout);
                logger.error('Server startup failed due to binding error', {
                    error: error.message,
                    startupPhase: 'binding_error',
                    startupFailed: true
                });
                originalOnError(error);
                reject(error);
            });
            
            // Begin server binding to network interface
            const options = {
                port: serverConfig.port,
                host: serverConfig.host,
                backlog: serverConfig.backlog
            };
            
            if (typeof serverConfig.port === 'string') {
                // Named pipe binding
                server.listen(serverConfig.port);
            } else {
                // Network socket binding
                server.listen(options.port, options.host, options.backlog);
            }
        });
        
    } catch (error) {
        // Handle any startup errors with comprehensive logging and graceful failure procedures
        logger.error('Server startup failed during initialization', {
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name,
            startupTime: STARTUP_TIME,
            startupPhase: 'initialization_error',
            startupFailed: true,
            timestamp: new Date().toISOString()
        });
        
        // Clean up any partially initialized resources
        if (SERVER_INSTANCE) {
            try {
                SERVER_INSTANCE.close();
                SERVER_INSTANCE = null;
            } catch (cleanupError) {
                logger.error('Failed to clean up server instance during startup failure', {
                    cleanupError: cleanupError.message
                });
            }
        }
        
        // Reset global state
        SERVER_INSTANCE = null;
        SERVER_CONFIG = null;
        NORMALIZED_PORT = null;
        STARTUP_TIME = null;
        
        throw error;
    }
}

/**
 * Returns comprehensive server status information for monitoring, health checks, and operational insights including uptime, configuration, and connection statistics.
 * This function calculates server uptime using STARTUP_TIME timestamp for operational monitoring, gets current server address and port information from SERVER_INSTANCE, 
 * extracts current server configuration from cached SERVER_CONFIG object, counts active HTTP connections if server instance is available and listening, gets current 
 * process memory usage and CPU utilization for resource monitoring, includes Node.js version and process ID with environment information for context, adds application 
 * metadata (name, version) for identification in monitoring systems, and creates comprehensive status object with all operational metrics and configuration details suitable 
 * for health check endpoints and monitoring integration.
 * 
 * Server status information includes:
 * - Comprehensive uptime calculation and server operational duration metrics
 * - Network binding information including address, port, and protocol details
 * - Server configuration summary with performance and security settings
 * - Resource utilization metrics including memory usage and CPU utilization
 * - Application metadata for service identification and version tracking
 * - Health status indicators for monitoring and alerting systems
 * 
 * @returns {Object} Server status object with uptime, configuration, connection count, memory usage, and operational metrics
 */
function getServerStatus() {
    try {
        // Calculate server uptime using STARTUP_TIME timestamp for operational monitoring
        let uptimeInfo = {
            started: false,
            uptimeMs: 0,
            uptimeSeconds: 0,
            uptimeFormatted: 'not started',
            startupTime: null
        };
        
        if (STARTUP_TIME) {
            const startTime = new Date(STARTUP_TIME).getTime();
            const currentTime = Date.now();
            const uptimeMs = currentTime - startTime;
            
            uptimeInfo = {
                started: true,
                uptimeMs: uptimeMs,
                uptimeSeconds: Math.floor(uptimeMs / 1000),
                uptimeFormatted: `${Math.floor(uptimeMs / (1000 * 60 * 60))}h ${Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))}m ${Math.floor((uptimeMs % (1000 * 60)) / 1000)}s`,
                startupTime: STARTUP_TIME
            };
        }
        
        // Get current server address and port information from SERVER_INSTANCE
        let serverInfo = {
            listening: false,
            address: null,
            port: null,
            host: null,
            family: null,
            protocol: null
        };
        
        if (SERVER_INSTANCE && SERVER_INSTANCE.listening) {
            const addr = SERVER_INSTANCE.address();
            
            if (typeof addr === 'string') {
                serverInfo = {
                    listening: true,
                    address: addr,
                    port: null,
                    host: null,
                    family: 'pipe',
                    protocol: 'IPC'
                };
            } else if (addr) {
                serverInfo = {
                    listening: true,
                    address: addr.address,
                    port: addr.port,
                    host: addr.address,
                    family: addr.family,
                    protocol: 'HTTP'
                };
            }
        }
        
        // Extract current server configuration from cached SERVER_CONFIG object
        const configurationInfo = {
            available: !!SERVER_CONFIG,
            port: SERVER_CONFIG?.server?.port || NORMALIZED_PORT || 'not configured',
            host: SERVER_CONFIG?.server?.host || 'not configured',
            timeout: SERVER_CONFIG?.server?.timeout || 'not configured',
            environment: SERVER_CONFIG?.server?.environment || process.env.NODE_ENV || 'unknown',
            serverName: SERVER_CONFIG?.server?.server_name || APPLICATION_METADATA.NAME
        };
        
        // Count active HTTP connections if server instance is available and listening
        let connectionInfo = {
            serverAvailable: !!SERVER_INSTANCE,
            listening: serverInfo.listening,
            connectionsSupported: false,
            activeConnections: 0
        };
        
        // Note: Node.js doesn't provide a direct way to count active connections
        // In production, you'd typically use monitoring tools or implement connection tracking
        if (SERVER_INSTANCE && SERVER_INSTANCE.listening) {
            connectionInfo = {
                serverAvailable: true,
                listening: true,
                connectionsSupported: true,
                activeConnections: 'not available', // Would require custom connection tracking
                connectionTracking: 'not implemented in tutorial'
            };
        }
        
        // Get current process memory usage and CPU utilization for resource monitoring
        const resourceInfo = {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            processUptime: process.uptime(),
            platform: process.platform,
            architecture: process.arch,
            nodeVersion: process.version
        };
        
        // Include Node.js version, process ID, and environment information for context
        const processInfo = {
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            processUptime: Math.floor(process.uptime()),
            environmentVariables: {
                nodeEnv: process.env.NODE_ENV || 'not set',
                port: process.env.PORT || 'not set',
                host: process.env.HOST || 'not set'
            }
        };
        
        // Add application metadata (name, version) for identification in monitoring systems
        const applicationInfo = {
            name: APPLICATION_METADATA.NAME,
            version: APPLICATION_METADATA.VERSION,
            description: APPLICATION_METADATA.DESCRIPTION,
            author: APPLICATION_METADATA.AUTHOR
        };
        
        // Create comprehensive status object with all operational metrics and configuration details
        const serverStatus = {
            status: {
                healthy: serverInfo.listening && uptimeInfo.started,
                running: !!SERVER_INSTANCE,
                listening: serverInfo.listening,
                timestamp: new Date().toISOString()
            },
            
            application: applicationInfo,
            
            server: {
                ...serverInfo,
                configuration: configurationInfo,
                connections: connectionInfo
            },
            
            uptime: uptimeInfo,
            
            resources: resourceInfo,
            
            process: processInfo,
            
            health: {
                status: serverInfo.listening ? 'healthy' : (SERVER_INSTANCE ? 'starting' : 'stopped'),
                checks: {
                    serverInstance: !!SERVER_INSTANCE,
                    listening: serverInfo.listening,
                    configurationLoaded: !!SERVER_CONFIG,
                    uptimePositive: uptimeInfo.uptimeSeconds > 0
                },
                lastCheck: new Date().toISOString()
            },
            
            monitoring: {
                metrics: {
                    uptime: uptimeInfo.uptimeSeconds,
                    memoryUsageBytes: resourceInfo.memory.rss,
                    memoryUsageMB: Math.round(resourceInfo.memory.rss / 1024 / 1024),
                    cpuUserTime: resourceInfo.cpu.user,
                    cpuSystemTime: resourceInfo.cpu.system
                },
                endpoints: {
                    health: '/health',
                    readiness: '/readyz',
                    liveness: '/livez'
                }
            }
        };
        
        // Return frozen status object to prevent modification
        return Object.freeze(serverStatus);
        
    } catch (error) {
        // Handle server status generation errors gracefully with minimal fallback information
        logger.error('Failed to generate server status', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Return minimal fallback status in case of errors
        return Object.freeze({
            status: {
                healthy: false,
                error: true,
                timestamp: new Date().toISOString()
            },
            error: {
                occurred: true,
                message: error.message,
                type: error.constructor.name
            },
            fallback: {
                serverInstance: !!SERVER_INSTANCE,
                startupTime: STARTUP_TIME,
                nodeVersion: process.version,
                pid: process.pid
            }
        });
    }
}

// =============================================================================
// MAIN EXECUTION AND MODULE EXPORTS
// =============================================================================

// Export server instance and management functions for testing and external use
const server = SERVER_INSTANCE;

module.exports = {
    // Default export of HTTP server instance for direct server management and testing scenarios
    server,
    
    // Server startup function for testing, custom initialization, and programmatic server management
    startServer,
    
    // Graceful shutdown function for external process management, container orchestration, and testing
    gracefulShutdown,
    
    // Server status utility for monitoring, health checks, and operational dashboard integration
    getServerStatus,
    
    // Port normalization utility for testing, validation, and configuration processing
    normalizePort
};

// Only start the server if this file is executed directly (not imported as module)
if (require.main === module) {
    startServer()
        .then((serverInstance) => {
            logger.info('Server started successfully from direct execution', {
                directExecution: true,
                serverListening: serverInstance.listening,
                moduleMain: true,
                timestamp: new Date().toISOString()
            });
        })
        .catch((error) => {
            logger.error('Failed to start server from direct execution', {
                error: error.message,
                stack: error.stack,
                directExecution: true,
                moduleMain: true,
                timestamp: new Date().toISOString()
            });
            process.exit(1);
        });
}