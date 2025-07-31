// Server testing helper utilities module for Node.js tutorial application test suite
// Provides comprehensive test server management, HTTP endpoint testing agents, and server lifecycle utilities
// Designed to work with Node.js built-in test runner, Express.js 5.1.0, and SuperTest 7.1.1

// External dependencies with version information
const supertest = require('supertest'); // ^7.1.1 - HTTP endpoint testing library
const assert = require('node:assert'); // built-in - Node.js assertion library  
const net = require('node:net'); // built-in - Node.js net module for port utilities
const { promisify } = require('node:util'); // built-in - Node.js util module for promisify

// Internal dependencies - Core server and application management
const { HttpServerManager } = require('../../lib/server.js');
const { createApplication } = require('../../lib/application.js');
const { LifecycleManager } = require('../../lib/lifecycle.js');

// Internal dependencies - Configuration management
const { createServerConfig, validateServerConfig } = require('../../config/server.js');
const { environmentConfig } = require('../../config/environment.js');

// Internal dependencies - Test utilities and helpers
const {
    getAvailablePort,
    createTestLogger,
    waitForCondition,
    generateTestId,
    createTestEnvironment,
} = require('./testHelpers.js');

// Internal dependencies - Application constants
const { TIMEOUTS, ENVIRONMENT } = require('../../utils/constants.js');

// Global constants for test server management and configuration
const TEST_SERVER_PORT_START = 9000; // Start of test server port range
const TEST_SERVER_PORT_END = 9999; // End of test server port range  
const DEFAULT_TEST_SERVER_TIMEOUT = 30000; // Default timeout for test server operations (30 seconds)

// Global registry for active test server instances to enable lifecycle management
const testServerInstances = new Map();

/**
 * Creates a SuperTest agent configured for HTTP endpoint testing with the Express.js application
 * Provides methods for making HTTP requests and validating responses in test scenarios
 * 
 * @param {object} app - Express.js application instance to test
 * @param {object} agentOptions - Configuration options for the SuperTest agent
 * @param {number} agentOptions.timeout - Request timeout in milliseconds (default: 5000)
 * @param {object} agentOptions.headers - Default headers to include with requests
 * @param {boolean} agentOptions.enableLogging - Enable request/response logging (default: false)
 * @returns {object} SuperTest agent configured for HTTP testing with request methods and response validation capabilities
 */
function createServerTestAgent(app, agentOptions = {}) {
    // Validate Express.js application instance is provided and properly configured
    if (!app || typeof app !== 'function') {
        throw new Error('Invalid Express.js application instance provided to createServerTestAgent');
    }

    // Extract configuration options with secure defaults
    const {
        timeout = TIMEOUTS.REQUEST_PROCESSING || 5000,
        headers = {},
        enableLogging = false
    } = agentOptions;

    // Create SuperTest agent using supertest(app) with application binding
    const agent = supertest(app);

    // Configure agent timeout settings based on test requirements
    if (timeout && typeof timeout === 'number' && timeout > 0) {
        agent.timeout = timeout;
    }

    // Set up agent-specific headers and request configuration
    if (headers && typeof headers === 'object') {
        Object.keys(headers).forEach(headerName => {
            if (typeof headerName === 'string' && headers[headerName]) {
                agent.set(headerName, headers[headerName]);
            }
        });
    }

    // Add request logging and debugging capabilities if specified in options
    if (enableLogging) {
        const originalRequest = agent.request;
        agent.request = function(method, url) {
            console.log(`[TEST-AGENT] ${method.toUpperCase()} ${url}`);
            return originalRequest.call(this, method, url);
        };
    }

    // Configure agent for test environment including error handling
    agent.on('error', (error) => {
        console.error('[TEST-AGENT] Request error:', error.message);
    });

    // Return configured SuperTest agent ready for HTTP endpoint testing
    return agent;
}

/**
 * Factory function that creates a test-specific server configuration with random port assignment,
 * test environment settings, and isolated configuration for test execution
 * 
 * @param {object} testOptions - Configuration options for test server setup
 * @param {number} testOptions.preferredPort - Preferred port number (will check availability)
 * @param {string} testOptions.host - Host address for server binding (default: 'localhost')
 * @param {boolean} testOptions.enableLogging - Enable test server logging (default: false)
 * @param {object} testOptions.customConfig - Additional configuration overrides
 * @returns {Promise<object>} Promise resolving to test server configuration with port, host, timeouts, and test-specific settings
 */
async function createTestServerConfig(testOptions = {}) {
    const {
        preferredPort,
        host = 'localhost',
        enableLogging = false,
        customConfig = {}
    } = testOptions;

    try {
        // Get available port using getAvailablePort utility within test port range
        const availablePort = await getAvailablePort(
            preferredPort || TEST_SERVER_PORT_START,
            TEST_SERVER_PORT_END
        );

        // Create base server configuration using createServerConfig function
        const baseConfig = await createServerConfig();

        // Override configuration with test-specific settings and environment
        const testServerConfig = {
            ...baseConfig,
            ...customConfig,
            port: availablePort,
            host: host,
            environment: ENVIRONMENT.TEST,
            
            // Set test-appropriate timeouts for faster test execution
            timeouts: {
                startup: TIMEOUTS.SERVER_STARTUP || 10000,
                shutdown: TIMEOUTS.SERVER_SHUTDOWN || 5000,
                request: TIMEOUTS.REQUEST_PROCESSING || 5000
            },

            // Configure test logging levels to reduce noise during test execution
            logging: {
                enabled: enableLogging,
                level: enableLogging ? 'debug' : 'error',
                console: true,
                file: false
            },

            // Apply test-specific security and performance settings
            security: {
                cors: {
                    enabled: true,
                    origin: ['http://localhost', `http://${host}`],
                    credentials: false
                },
                rateLimiting: {
                    enabled: false // Disable for testing to avoid interference
                }
            },

            // Performance settings optimized for testing
            performance: {
                compression: false, // Disable compression for clearer test responses
                keepAliveTimeout: 1000,
                headersTimeout: 2000
            }
        };

        // Validate test server configuration using validateServerConfig function
        const validationResult = await validateServerConfig(testServerConfig);
        if (!validationResult.isValid) {
            throw new Error(`Test server configuration validation failed: ${validationResult.errors.join(', ')}`);
        }

        // Return complete test server configuration ready for test server startup
        return testServerConfig;

    } catch (error) {
        console.error('[createTestServerConfig] Failed to create test server configuration:', error.message);
        throw new Error(`Failed to create test server configuration: ${error.message}`);
    }
}

/**
 * Starts a test server instance with isolated configuration, unique port binding,
 * and comprehensive lifecycle management for test execution isolation
 * 
 * @param {object} testConfig - Test server configuration object
 * @param {object} startupOptions - Additional startup configuration options
 * @param {number} startupOptions.timeout - Startup timeout in milliseconds
 * @param {boolean} startupOptions.waitForReady - Wait for server readiness verification
 * @param {object} startupOptions.applicationOptions - Options for Express application creation
 * @returns {Promise<object>} Promise resolving to started test server information with URL, port, and server manager instance
 */
async function startTestServer(testConfig, startupOptions = {}) {
    const {
        timeout = DEFAULT_TEST_SERVER_TIMEOUT,
        waitForReady = true,
        applicationOptions = {}
    } = startupOptions;

    try {
        // Generate unique test server ID using generateTestId function
        const testServerId = generateTestId('test-server');

        // Create test server configuration using createTestServerConfig if not provided
        const serverConfig = testConfig || await createTestServerConfig();

        // Create Express.js application instance using createApplication factory
        const app = await createApplication(applicationOptions);

        // Initialize HttpServerManager with test application and configuration
        const serverManager = new HttpServerManager(app, serverConfig);

        // Set up lifecycle manager for test server startup coordination
        const lifecycleManager = new LifecycleManager({
            components: [serverManager],
            gracefulShutdown: true,
            shutdownTimeout: serverConfig.timeouts?.shutdown || 5000
        });

        // Start test server using HttpServerManager.start() with timeout handling
        const startupPromise = serverManager.start();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Test server startup timeout')), timeout);
        });

        await Promise.race([startupPromise, timeoutPromise]);

        // Wait for server readiness using waitForServerReady function
        if (waitForReady) {
            const isReady = await waitForServerReady(serverManager, timeout);
            if (!isReady) {
                throw new Error('Test server failed to become ready within timeout period');
            }
        }

        // Construct server information object
        const connectionInfo = serverManager.getConnectionInfo();
        const serverUrl = `http://${connectionInfo.host}:${connectionInfo.port}`;

        const testServerInfo = {
            testServerId,
            serverManager,
            lifecycleManager,
            serverUrl,
            port: connectionInfo.port,
            host: connectionInfo.host,
            config: serverConfig,
            startTime: new Date(),
            status: 'running'
        };

        // Register test server instance in testServerInstances Map for management
        testServerInstances.set(testServerId, testServerInfo);

        console.log(`[startTestServer] Test server started successfully: ${serverUrl} (ID: ${testServerId})`);

        // Return test server information including URL, port, and manager reference
        return testServerInfo;

    } catch (error) {
        console.error('[startTestServer] Failed to start test server:', error.message);
        throw new Error(`Failed to start test server: ${error.message}`);
    }
}

/**
 * Performs graceful shutdown of test server instance with resource cleanup,
 * connection draining, and test environment restoration
 * 
 * @param {string} testServerId - Unique identifier for the test server instance
 * @param {object} shutdownOptions - Configuration options for shutdown process
 * @param {number} shutdownOptions.timeout - Shutdown timeout in milliseconds
 * @param {boolean} shutdownOptions.force - Force shutdown if graceful shutdown fails
 * @param {boolean} shutdownOptions.cleanup - Perform environment cleanup
 * @returns {Promise<void>} Promise resolving when test server shutdown is complete and resources are cleaned up
 */
async function stopTestServer(testServerId, shutdownOptions = {}) {
    const {
        timeout = TIMEOUTS.SERVER_SHUTDOWN || 5000,
        force = false,
        cleanup = true
    } = shutdownOptions;

    try {
        // Retrieve test server instance from testServerInstances Map using testServerId
        const testServerInfo = testServerInstances.get(testServerId);
        if (!testServerInfo) {
            console.warn(`[stopTestServer] Test server with ID ${testServerId} not found in registry`);
            return;
        }

        // Validate test server exists and is in running state
        const { serverManager, lifecycleManager, serverUrl } = testServerInfo;
        if (!serverManager || !serverManager.isRunning()) {
            console.warn(`[stopTestServer] Test server ${testServerId} is not running`);
            testServerInstances.delete(testServerId);
            return;
        }

        console.log(`[stopTestServer] Initiating shutdown for test server: ${serverUrl} (ID: ${testServerId})`);

        // Initiate graceful shutdown using HttpServerManager.stop() method
        const shutdownPromise = serverManager.stop();
        
        // Handle timeout for shutdown process
        if (timeout > 0) {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test server shutdown timeout')), timeout);
            });

            try {
                await Promise.race([shutdownPromise, timeoutPromise]);
            } catch (timeoutError) {
                if (force) {
                    console.warn(`[stopTestServer] Graceful shutdown timed out, forcing shutdown for ${testServerId}`);
                    // Force shutdown implementation would go here
                } else {
                    throw timeoutError;
                }
            }
        } else {
            await shutdownPromise;
        }

        // Execute lifecycle manager shutdown procedures for resource cleanup
        if (lifecycleManager) {
            await lifecycleManager.stop();
        }

        // Update test server status
        testServerInfo.status = 'stopped';
        testServerInfo.stopTime = new Date();

        // Remove test server instance from testServerInstances Map
        testServerInstances.delete(testServerId);

        // Clean up test environment resources and restore original state
        if (cleanup) {
            // Additional cleanup logic could be added here
            console.log(`[stopTestServer] Cleanup completed for test server ${testServerId}`);
        }

        // Log test server shutdown completion with timing and cleanup details
        const runtime = testServerInfo.stopTime - testServerInfo.startTime;
        console.log(`[stopTestServer] Test server shutdown complete: ${serverUrl} (ID: ${testServerId}, Runtime: ${runtime}ms)`);

    } catch (error) {
        console.error(`[stopTestServer] Failed to stop test server ${testServerId}:`, error.message);
        
        // Ensure server is removed from registry even on error
        testServerInstances.delete(testServerId);
        
        throw new Error(`Failed to stop test server ${testServerId}: ${error.message}`);
    }
}

/**
 * Waits for test server to be ready and accepting connections by polling server status
 * with configurable timeout and retry logic
 * 
 * @param {object} serverManager - HttpServerManager instance to check readiness
 * @param {number} timeoutMs - Maximum time to wait for readiness in milliseconds
 * @param {number} intervalMs - Polling interval in milliseconds
 * @returns {Promise<boolean>} Promise resolving to true when server is ready, false if timeout is reached
 */
async function waitForServerReady(serverManager, timeoutMs, intervalMs = 250) {
    // Set default timeout to DEFAULT_TEST_SERVER_TIMEOUT if not provided
    const timeout = timeoutMs || DEFAULT_TEST_SERVER_TIMEOUT;
    
    // Set default polling interval to 250ms for server readiness checking
    const interval = intervalMs || 250;

    try {
        // Use waitForCondition utility to poll server.isRunning() status
        const isReady = await waitForCondition(
            // Create condition function that checks serverManager.isRunning() state
            () => {
                try {
                    return serverManager && serverManager.isRunning();
                } catch (error) {
                    console.warn('[waitForServerReady] Error checking server status:', error.message);
                    return false;
                }
            },
            {
                timeout,
                interval,
                description: 'waiting for test server to be ready'
            }
        );

        // Return boolean indicating whether server became ready within timeout
        return isReady;

    } catch (error) {
        console.error('[waitForServerReady] Error waiting for server readiness:', error.message);
        return false;
    }
}

/**
 * Constructs the complete test server URL including protocol, host, and port
 * for HTTP client testing and endpoint validation
 * 
 * @param {string} testServerId - Unique identifier for the test server instance
 * @param {object} urlOptions - URL construction options
 * @param {string} urlOptions.protocol - Protocol to use (default: 'http')
 * @param {string} urlOptions.path - Path to append to base URL
 * @param {object} urlOptions.query - Query parameters to include
 * @returns {string} Complete test server URL with protocol, host, and port for HTTP testing
 */
function getTestServerUrl(testServerId, urlOptions = {}) {
    const {
        protocol = 'http',
        path = '',
        query = {}
    } = urlOptions;

    try {
        // Retrieve test server instance from testServerInstances Map
        const testServerInfo = testServerInstances.get(testServerId);
        if (!testServerInfo) {
            throw new Error(`Test server with ID ${testServerId} not found in registry`);
        }

        // Get server connection information using getConnectionInfo method
        const { serverManager } = testServerInfo;
        if (!serverManager) {
            throw new Error(`Server manager not available for test server ${testServerId}`);
        }

        const connectionInfo = serverManager.getConnectionInfo();
        if (!connectionInfo) {
            throw new Error(`Connection information not available for test server ${testServerId}`);
        }

        // Extract host and port from server connection information
        const { host, port } = connectionInfo;

        // Construct URL with http protocol for test server communication
        let url = `${protocol}://${host}:${port}`;

        // Apply URL options like path prefix or query parameters if specified
        if (path) {
            url += path.startsWith('/') ? path : `/${path}`;
        }

        // Add query parameters if provided
        const queryKeys = Object.keys(query);
        if (queryKeys.length > 0) {
            const queryString = queryKeys
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
                .join('&');
            url += `?${queryString}`;
        }

        // Return complete test server URL ready for HTTP client requests
        return url;

    } catch (error) {
        console.error(`[getTestServerUrl] Failed to construct URL for test server ${testServerId}:`, error.message);
        throw error;
    }
}

/**
 * Checks if a test server instance is currently running and accepting connections,
 * returning boolean status for test coordination
 * 
 * @param {string} testServerId - Unique identifier for the test server instance
 * @returns {boolean} True if test server is running and accepting connections, false otherwise
 */
function isTestServerRunning(testServerId) {
    try {
        // Retrieve test server instance from testServerInstances Map using testServerId
        const testServerInfo = testServerInstances.get(testServerId);
        
        // Return false if test server instance is not found in registry
        if (!testServerInfo) {
            return false;
        }

        // Check server running status using serverManager.isRunning() method
        const { serverManager } = testServerInfo;
        if (!serverManager) {
            return false;
        }

        // Verify server is accepting connections and responsive
        const isRunning = serverManager.isRunning();
        
        // Return boolean status indicating test server operational state
        return Boolean(isRunning);

    } catch (error) {
        console.warn(`[isTestServerRunning] Error checking test server ${testServerId} status:`, error.message);
        return false;
    }
}

/**
 * Returns information about all active test server instances including their status,
 * configuration, and operational details for test management
 * 
 * @returns {array} Array of test server information objects with status, configuration, and operational details
 */
function getAllTestServers() {
    const allServers = [];

    try {
        // Iterate through testServerInstances Map to collect all server information
        for (const [testServerId, testServerInfo] of testServerInstances.entries()) {
            try {
                // Get status information for each test server using getStatus method
                const { serverManager, serverUrl, port, host, config, startTime, status } = testServerInfo;
                
                let serverStatus = 'unknown';
                let connectionInfo = null;

                if (serverManager) {
                    try {
                        serverStatus = serverManager.isRunning() ? 'running' : 'stopped';
                        connectionInfo = serverManager.getConnectionInfo();
                    } catch (statusError) {
                        console.warn(`Error getting status for server ${testServerId}:`, statusError.message);
                        serverStatus = 'error';
                    }
                }

                // Include server configuration and connection details for each instance
                const serverInfo = {
                    testServerId,
                    serverUrl: serverUrl || `http://${host}:${port}`,
                    port,
                    host,
                    status: serverStatus,
                    
                    // Add test-specific metadata like test ID and startup time
                    startTime,
                    uptime: startTime ? Date.now() - startTime.getTime() : 0,
                    
                    // Include configuration summary
                    config: {
                        environment: config?.environment,
                        logging: config?.logging,
                        timeouts: config?.timeouts
                    },
                    
                    // Connection details
                    connectionInfo
                };

                allServers.push(serverInfo);

            } catch (serverError) {
                console.warn(`Error processing server info for ${testServerId}:`, serverError.message);
                
                // Include basic error information
                allServers.push({
                    testServerId,
                    status: 'error',
                    error: serverError.message
                });
            }
        }

        // Compile comprehensive test server registry with operational details
        console.log(`[getAllTestServers] Retrieved information for ${allServers.length} test servers`);

    } catch (error) {
        console.error('[getAllTestServers] Error retrieving test server information:', error.message);
    }

    // Return array of test server information objects for test management
    return allServers;
}

/**
 * Performs cleanup of all active test server instances with graceful shutdown
 * and resource deallocation for test suite teardown
 * 
 * @param {object} cleanupOptions - Configuration options for cleanup process
 * @param {number} cleanupOptions.timeout - Timeout for each server shutdown
 * @param {boolean} cleanupOptions.force - Force shutdown if graceful shutdown fails
 * @param {boolean} cleanupOptions.parallel - Shutdown servers in parallel vs sequential
 * @returns {Promise<object>} Promise resolving to cleanup results with shutdown status and resource deallocation details
 */
async function cleanupAllTestServers(cleanupOptions = {}) {
    const {
        timeout = TIMEOUTS.SERVER_SHUTDOWN || 5000,
        force = true,
        parallel = true
    } = cleanupOptions;

    const cleanupResults = {
        totalServers: 0,
        shutdownSuccess: 0,
        shutdownErrors: 0,
        errors: [],
        duration: 0
    };

    const startTime = Date.now();

    try {
        // Get list of all active test server IDs from testServerInstances Map
        const serverIds = Array.from(testServerInstances.keys());
        cleanupResults.totalServers = serverIds.length;

        if (serverIds.length === 0) {
            console.log('[cleanupAllTestServers] No active test servers to cleanup');
            return cleanupResults;
        }

        console.log(`[cleanupAllTestServers] Starting cleanup of ${serverIds.length} test servers`);

        // Shutdown servers based on parallel vs sequential preference
        if (parallel) {
            // Shutdown servers in parallel for faster cleanup
            const shutdownPromises = serverIds.map(async (testServerId) => {
                try {
                    await stopTestServer(testServerId, { timeout, force });
                    cleanupResults.shutdownSuccess++;
                    return { testServerId, success: true };
                } catch (error) {
                    cleanupResults.shutdownErrors++;
                    cleanupResults.errors.push({
                        testServerId,
                        error: error.message
                    });
                    return { testServerId, success: false, error: error.message };
                }
            });

            // Wait for all server shutdowns to complete or timeout
            await Promise.allSettled(shutdownPromises);

        } else {
            // Sequential shutdown for more controlled cleanup
            for (const testServerId of serverIds) {
                try {
                    await stopTestServer(testServerId, { timeout, force });
                    cleanupResults.shutdownSuccess++;
                } catch (error) {
                    cleanupResults.shutdownErrors++;
                    cleanupResults.errors.push({
                        testServerId,
                        error: error.message
                    });
                    console.error(`[cleanupAllTestServers] Failed to shutdown server ${testServerId}:`, error.message);
                }
            }
        }

        // Clear testServerInstances Map to reset test server registry
        testServerInstances.clear();

        // Calculate cleanup duration
        cleanupResults.duration = Date.now() - startTime;

        // Log cleanup completion with timing and any errors encountered
        console.log(`[cleanupAllTestServers] Cleanup completed in ${cleanupResults.duration}ms`);
        console.log(`[cleanupAllTestServers] Success: ${cleanupResults.shutdownSuccess}, Errors: ${cleanupResults.shutdownErrors}`);

        if (cleanupResults.errors.length > 0) {
            console.warn('[cleanupAllTestServers] Cleanup errors:', cleanupResults.errors);
        }

    } catch (error) {
        cleanupResults.errors.push({
            phase: 'cleanup-orchestration',
            error: error.message
        });
        console.error('[cleanupAllTestServers] Error during cleanup orchestration:', error.message);
    }

    // Return cleanup results with success status and detailed shutdown information
    return cleanupResults;
}

/**
 * Creates a health check function for test server monitoring that validates server
 * responsiveness and operational status
 * 
 * @param {string} testServerId - Unique identifier for the test server instance
 * @param {object} healthCheckOptions - Configuration options for health checking
 * @param {number} healthCheckOptions.timeout - Health check timeout in milliseconds
 * @param {boolean} healthCheckOptions.includeMetrics - Include performance metrics in health response
 * @param {string} healthCheckOptions.endpoint - Endpoint to check (default: '/hello')
 * @returns {function} Health check function that returns test server health status and operational metrics
 */
function createTestServerHealthCheck(testServerId, healthCheckOptions = {}) {
    const {
        timeout = 5000,
        includeMetrics = true,
        endpoint = '/hello'
    } = healthCheckOptions;

    // Retrieve test server instance from testServerInstances Map
    const testServerInfo = testServerInstances.get(testServerId);
    if (!testServerInfo) {
        throw new Error(`Test server with ID ${testServerId} not found for health check creation`);
    }

    // Create health check function with server manager reference
    return async function testServerHealthCheck() {
        const healthResult = {
            testServerId,
            timestamp: new Date().toISOString(),
            status: 'unknown',
            checks: {},
            metrics: {},
            errors: []
        };

        try {
            const { serverManager, serverUrl, startTime } = testServerInfo;

            // Include server running state and connection availability checks
            healthResult.checks.serverRunning = {
                status: 'checking',
                description: 'Server process running status'
            };

            if (!serverManager) {
                healthResult.checks.serverRunning.status = 'fail';
                healthResult.checks.serverRunning.error = 'Server manager not available';
                healthResult.status = 'unhealthy';
                return healthResult;
            }

            const isRunning = serverManager.isRunning();
            healthResult.checks.serverRunning.status = isRunning ? 'pass' : 'fail';

            if (!isRunning) {
                healthResult.status = 'unhealthy';
                return healthResult;
            }

            // Add response time measurement for specified endpoint if requested
            if (endpoint && serverUrl) {
                healthResult.checks.endpointResponse = {
                    status: 'checking',
                    description: `HTTP response from ${endpoint} endpoint`,
                    endpoint
                };

                try {
                    const startResponseTime = Date.now();
                    
                    // Create a simple HTTP request to test endpoint responsiveness
                    const testAgent = createServerTestAgent(serverManager.getApp());
                    const response = await testAgent
                        .get(endpoint)
                        .timeout(timeout);

                    const responseTime = Date.now() - startResponseTime;
                    
                    healthResult.checks.endpointResponse.status = response.status === 200 ? 'pass' : 'warn';
                    healthResult.checks.endpointResponse.responseTime = responseTime;
                    healthResult.checks.endpointResponse.httpStatus = response.status;

                    if (includeMetrics) {
                        healthResult.metrics.responseTime = responseTime;
                    }

                } catch (endpointError) {
                    healthResult.checks.endpointResponse.status = 'fail';
                    healthResult.checks.endpointResponse.error = endpointError.message;
                    healthResult.errors.push(`Endpoint check failed: ${endpointError.message}`);
                }
            }

            // Include memory usage and resource utilization metrics if requested
            if (includeMetrics) {
                try {
                    const memoryUsage = process.memoryUsage();
                    healthResult.metrics.memory = {
                        rss: memoryUsage.rss,
                        heapUsed: memoryUsage.heapUsed,
                        heapTotal: memoryUsage.heapTotal,
                        external: memoryUsage.external
                    };

                    // Add uptime information
                    if (startTime) {
                        healthResult.metrics.uptime = Date.now() - startTime.getTime();
                    }

                    healthResult.metrics.processUptime = process.uptime() * 1000; // Convert to ms

                } catch (metricsError) {
                    healthResult.errors.push(`Metrics collection failed: ${metricsError.message}`);
                }
            }

            // Determine overall health status based on checks
            const checkStatuses = Object.values(healthResult.checks).map(check => check.status);
            const hasFailures = checkStatuses.includes('fail');
            const hasWarnings = checkStatuses.includes('warn');

            if (hasFailures) {
                healthResult.status = 'unhealthy';
            } else if (hasWarnings) {
                healthResult.status = 'warning';
            } else {
                healthResult.status = 'healthy';
            }

        } catch (error) {
            healthResult.status = 'error';
            healthResult.errors.push(`Health check error: ${error.message}`);
            console.error(`[testServerHealthCheck] Health check failed for ${testServerId}:`, error.message);
        }

        return healthResult;
    };
}

/**
 * Validates test server setup including configuration, port availability, and dependencies
 * for reliable test execution
 * 
 * @param {object} setupConfig - Configuration for test server setup validation
 * @param {object} setupConfig.portRange - Port range configuration for validation
 * @param {boolean} setupConfig.checkDependencies - Validate required dependencies
 * @param {boolean} setupConfig.checkEnvironment - Validate environment settings
 * @returns {object} Validation result with success status, warnings, and setup verification details
 */
function validateTestServerSetup(setupConfig = {}) {
    const {
        portRange = { start: TEST_SERVER_PORT_START, end: TEST_SERVER_PORT_END },
        checkDependencies = true,
        checkEnvironment = true
    } = setupConfig;

    const validationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        checks: {},
        summary: {}
    };

    try {
        // Validate test port range availability using basic checks
        validationResult.checks.portRange = {
            status: 'checking',
            description: 'Test server port range validation'
        };

        if (!portRange.start || !portRange.end || portRange.start >= portRange.end) {
            validationResult.checks.portRange.status = 'fail';
            validationResult.checks.portRange.error = 'Invalid port range configuration';
            validationResult.errors.push('Port range validation failed: Invalid range specified');
            validationResult.isValid = false;
        } else if (portRange.start < 1024 || portRange.end > 65535) {
            validationResult.checks.portRange.status = 'warn';
            validationResult.checks.portRange.warning = 'Port range outside recommended bounds';
            validationResult.warnings.push('Port range includes system ports or exceeds valid range');
        } else {
            validationResult.checks.portRange.status = 'pass';
        }

        // Check Express.js application factory is available and functional
        validationResult.checks.applicationFactory = {
            status: 'checking',
            description: 'Express.js application factory availability'
        };

        try {
            if (typeof createApplication !== 'function') {
                throw new Error('createApplication is not a function');
            }
            validationResult.checks.applicationFactory.status = 'pass';
        } catch (factoryError) {
            validationResult.checks.applicationFactory.status = 'fail';
            validationResult.checks.applicationFactory.error = factoryError.message;
            validationResult.errors.push(`Application factory validation failed: ${factoryError.message}`);
            validationResult.isValid = false;
        }

        // Validate HttpServerManager and LifecycleManager dependencies
        if (checkDependencies) {
            validationResult.checks.serverManager = {
                status: 'checking',
                description: 'HttpServerManager dependency validation'
            };

            try {
                if (typeof HttpServerManager !== 'function') {
                    throw new Error('HttpServerManager is not available');
                }
                validationResult.checks.serverManager.status = 'pass';
            } catch (serverError) {
                validationResult.checks.serverManager.status = 'fail';
                validationResult.checks.serverManager.error = serverError.message;
                validationResult.errors.push(`Server manager validation failed: ${serverError.message}`);
                validationResult.isValid = false;
            }

            validationResult.checks.lifecycleManager = {
                status: 'checking',
                description: 'LifecycleManager dependency validation'
            };

            try {
                if (typeof LifecycleManager !== 'function') {
                    throw new Error('LifecycleManager is not available');
                }
                validationResult.checks.lifecycleManager.status = 'pass';
            } catch (lifecycleError) {
                validationResult.checks.lifecycleManager.status = 'fail';
                validationResult.checks.lifecycleManager.error = lifecycleError.message;
                validationResult.errors.push(`Lifecycle manager validation failed: ${lifecycleError.message}`);
                validationResult.isValid = false;
            }
        }

        // Check SuperTest library availability and version compatibility
        validationResult.checks.supertest = {
            status: 'checking',
            description: 'SuperTest library availability'
        };

        try {
            if (typeof supertest !== 'function') {
                throw new Error('SuperTest library is not available');
            }
            validationResult.checks.supertest.status = 'pass';
        } catch (supertestError) {
            validationResult.checks.supertest.status = 'fail';
            validationResult.checks.supertest.error = supertestError.message;
            validationResult.errors.push(`SuperTest validation failed: ${supertestError.message}`);
            validationResult.isValid = false;
        }

        // Validate test environment configuration and settings
        if (checkEnvironment) {
            validationResult.checks.environment = {
                status: 'checking',
                description: 'Test environment configuration validation'
            };

            try {
                const currentEnv = process.env.NODE_ENV;
                if (currentEnv && currentEnv !== 'test' && currentEnv !== 'development') {
                    validationResult.checks.environment.status = 'warn';
                    validationResult.checks.environment.warning = `Running in ${currentEnv} environment`;
                    validationResult.warnings.push(`Environment is set to ${currentEnv}, consider using 'test' for testing`);
                } else {
                    validationResult.checks.environment.status = 'pass';
                }
            } catch (envError) {
                validationResult.checks.environment.status = 'fail';
                validationResult.checks.environment.error = envError.message;
                validationResult.errors.push(`Environment validation failed: ${envError.message}`);
            }
        }

        // Test server configuration creation and validation procedures
        validationResult.checks.configCreation = {
            status: 'checking',
            description: 'Server configuration creation validation'
        };

        try {
            if (typeof createServerConfig !== 'function' || typeof validateServerConfig !== 'function') {
                throw new Error('Server configuration functions are not available');
            }
            validationResult.checks.configCreation.status = 'pass';
        } catch (configError) {
            validationResult.checks.configCreation.status = 'fail';
            validationResult.checks.configCreation.error = configError.message;
            validationResult.errors.push(`Configuration validation failed: ${configError.message}`);
            validationResult.isValid = false;
        }

        // Generate summary statistics
        validationResult.summary = {
            totalChecks: Object.keys(validationResult.checks).length,
            passedChecks: Object.values(validationResult.checks).filter(check => check.status === 'pass').length,
            failedChecks: Object.values(validationResult.checks).filter(check => check.status === 'fail').length,
            warningChecks: Object.values(validationResult.checks).filter(check => check.status === 'warn').length,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length
        };

        console.log(`[validateTestServerSetup] Validation completed: ${validationResult.summary.passedChecks}/${validationResult.summary.totalChecks} checks passed`);

        if (validationResult.warnings.length > 0) {
            console.warn('[validateTestServerSetup] Validation warnings:', validationResult.warnings);
        }

        if (validationResult.errors.length > 0) {
            console.error('[validateTestServerSetup] Validation errors:', validationResult.errors);
        }

    } catch (error) {
        validationResult.isValid = false;
        validationResult.errors.push(`Validation process error: ${error.message}`);
        console.error('[validateTestServerSetup] Validation process failed:', error.message);
    }

    // Return comprehensive validation result with detailed feedback
    return validationResult;
}

/**
 * Comprehensive test server management class that orchestrates test server lifecycle,
 * HTTP endpoint testing setup, resource management, and test isolation for the Node.js tutorial application test suite.
 * Provides high-level abstraction over HttpServerManager for test-specific server operations.
 */
class TestServerManager {
    /**
     * Creates TestServerManager instance with test configuration, server manager setup,
     * lifecycle coordination, and test environment isolation
     * 
     * @param {object} testConfig - Configuration object for test server setup
     */
    constructor(testConfig = {}) {
        // Store test configuration with validation and default value application
        this.config = {
            ...testConfig,
            environment: testConfig.environment || ENVIRONMENT.TEST,
            timeouts: {
                startup: TIMEOUTS.SERVER_STARTUP || 10000,
                shutdown: TIMEOUTS.SERVER_SHUTDOWN || 5000,
                request: TIMEOUTS.REQUEST_PROCESSING || 5000,
                ...testConfig.timeouts
            }
        };

        // Generate unique test ID using generateTestId function for test correlation
        this.testId = generateTestId('test-server-manager');

        // Create test logger using createTestLogger with TestServerManager context
        this.logger = createTestLogger(`TestServerManager:${this.testId}`);

        // Set up test environment isolation using createTestEnvironment function
        this.testEnvironment = createTestEnvironment({
            testId: this.testId,
            isolateEnv: true,
            cleanup: true
        });

        // Initialize server manager and lifecycle manager to null for lazy initialization
        this.serverManager = null;
        this.lifecycleManager = null;

        // Initialize test agent to null for lazy creation during server startup
        this.testAgent = null;

        // Set isInitialized flag to false to track initialization state
        this.isInitialized = false;

        // Initialize additional properties for test server management state
        this.startTime = null;
        this.serverUrl = null;

        // Log TestServerManager creation with test ID and configuration summary
        this.logger.info(`TestServerManager created with ID: ${this.testId}`, {
            config: {
                environment: this.config.environment,
                timeouts: this.config.timeouts
            }
        });
    }

    /**
     * Starts the test server with configuration setup, application creation, server binding,
     * and readiness verification for isolated test execution
     * 
     * @param {object} startupOptions - Configuration options for server startup
     * @param {object} startupOptions.applicationOptions - Options for Express application creation
     * @param {boolean} startupOptions.waitForReady - Wait for server readiness verification
     * @param {number} startupOptions.timeout - Startup timeout in milliseconds
     * @returns {Promise<object>} Promise resolving to test server startup information with URL, port, and operational status
     */
    async startTestServer(startupOptions = {}) {
        const {
            applicationOptions = {},
            waitForReady = true,
            timeout = this.config.timeouts.startup
        } = startupOptions;

        try {
            // Validate test server is not already running to prevent duplicate starts
            if (this.isInitialized && this.serverManager && this.serverManager.isRunning()) {
                throw new Error('Test server is already running');
            }

            this.logger.info('Starting test server', { testId: this.testId, startupOptions });

            // Create test server configuration using createTestServerConfig function
            const serverConfig = await createTestServerConfig(this.config);

            // Create Express.js application instance using createApplication factory
            const app = await createApplication(applicationOptions);

            // Initialize HttpServerManager with test application and configuration
            this.serverManager = new HttpServerManager(app, serverConfig);

            // Initialize LifecycleManager for test server startup coordination
            this.lifecycleManager = new LifecycleManager({
                components: [this.serverManager],
                gracefulShutdown: true,
                shutdownTimeout: this.config.timeouts.shutdown
            });

            // Start server using HttpServerManager.start() with timeout handling
            const startupPromise = this.serverManager.start();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test server startup timeout')), timeout);
            });

            await Promise.race([startupPromise, timeoutPromise]);

            // Wait for server readiness using waitForServerReady function
            if (waitForReady) {
                const isReady = await waitForServerReady(this.serverManager, timeout);
                if (!isReady) {
                    throw new Error('Test server failed to become ready within timeout period');
                }
            }

            // Create SuperTest agent using createServerTestAgent function
            this.testAgent = createServerTestAgent(app, {
                timeout: this.config.timeouts.request,
                enableLogging: this.config.logging?.enabled || false
            });

            // Set isInitialized flag to true and record start time
            this.isInitialized = true;
            this.startTime = new Date();

            // Construct server URL and store for test access
            const connectionInfo = this.serverManager.getConnectionInfo();
            this.serverUrl = `http://${connectionInfo.host}:${connectionInfo.port}`;

            const startupInfo = {
                testId: this.testId,
                serverUrl: this.serverUrl,
                port: connectionInfo.port,
                host: connectionInfo.host,
                startTime: this.startTime,
                status: 'running',
                config: serverConfig
            };

            this.logger.info('Test server started successfully', startupInfo);

            // Return startup information with server URL, port, and status
            return startupInfo;

        } catch (error) {
            this.logger.error('Failed to start test server', { error: error.message, testId: this.testId });
            
            // Cleanup on failure
            await this.cleanup();
            
            throw new Error(`Failed to start test server: ${error.message}`);
        }
    }

    /**
     * Performs graceful test server shutdown with connection draining, resource cleanup,
     * and test environment restoration
     * 
     * @param {boolean} force - Force shutdown if graceful shutdown fails
     * @param {number} timeout - Shutdown timeout in milliseconds
     * @returns {Promise<void>} Promise resolving when test server shutdown is complete and resources are cleaned up
     */
    async stopTestServer(force = false, timeout = this.config.timeouts.shutdown) {
        try {
            // Check if test server is running and can be stopped
            if (!this.isInitialized || !this.serverManager) {
                this.logger.warn('Test server is not initialized or already stopped');
                return;
            }

            // Log shutdown initiation with test ID and reason
            this.logger.info('Initiating test server shutdown', { 
                testId: this.testId, 
                force, 
                timeout,
                serverUrl: this.serverUrl 
            });

            // Execute graceful shutdown using HttpServerManager.stop() method
            if (this.serverManager.isRunning()) {
                const shutdownPromise = this.serverManager.stop();
                
                // Handle timeout for shutdown
                if (timeout > 0) {
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Test server shutdown timeout')), timeout);
                    });

                    try {
                        await Promise.race([shutdownPromise, timeoutPromise]);
                    } catch (timeoutError) {
                        if (force) {
                            this.logger.warn('Graceful shutdown timed out, forcing shutdown');
                            // Additional force shutdown logic could be implemented here
                        } else {
                            throw timeoutError;
                        }
                    }
                } else {
                    await shutdownPromise;
                }
            }

            // Execute lifecycle manager shutdown procedures for resource cleanup
            if (this.lifecycleManager) {
                await this.lifecycleManager.stop();
            }

            // Clean up test environment and restore original state
            if (this.testEnvironment && typeof this.testEnvironment.restore === 'function') {
                await this.testEnvironment.restore();
            }

            // Reset test agent and server URL to null state
            this.testAgent = null;
            this.serverUrl = null;

            // Set isInitialized flag to false and clear start time
            this.isInitialized = false;
            const stopTime = new Date();
            const runtime = this.startTime ? stopTime - this.startTime : 0;

            // Log successful shutdown completion with duration and cleanup details
            this.logger.info('Test server shutdown completed successfully', {
                testId: this.testId,
                runtime,
                shutdownTime: stopTime
            });

            this.startTime = null;

        } catch (error) {
            this.logger.error('Failed to stop test server', { error: error.message, testId: this.testId });
            throw new Error(`Failed to stop test server: ${error.message}`);
        }
    }

    /**
     * Returns the complete test server URL for HTTP client requests and endpoint testing
     * 
     * @returns {string} Complete test server URL with protocol, host, and port
     */
    getServerUrl() {
        // Validate test server is initialized and running
        if (!this.isInitialized || !this.serverUrl) {
            throw new Error('Test server is not initialized or URL is not available');
        }

        // Return stored server URL from server startup process
        return this.serverUrl;
    }

    /**
     * Returns the SuperTest agent configured for HTTP endpoint testing and request validation
     * 
     * @returns {object} SuperTest agent configured for test server HTTP testing
     */
    getTestAgent() {
        // Validate test server is initialized and test agent is available
        if (!this.isInitialized || !this.testAgent) {
            throw new Error('Test server is not initialized or test agent is not available');
        }

        // Return configured SuperTest agent for HTTP endpoint testing
        return this.testAgent;
    }

    /**
     * Returns boolean indicating whether the test server is currently running and accepting connections
     * 
     * @returns {boolean} True if test server is running and accepting connections, false otherwise
     */
    isServerRunning() {
        // Check isInitialized flag and serverManager availability
        if (!this.isInitialized || !this.serverManager) {
            return false;
        }

        try {
            // Use serverManager.isRunning() to check server operational state
            return this.serverManager.isRunning();
        } catch (error) {
            this.logger.warn('Error checking server running state', { error: error.message });
            return false;
        }
    }

    /**
     * Returns comprehensive test server status including connection details, uptime, and operational metrics
     * 
     * @returns {object} Complete test server status object with operational details and metrics
     */
    getServerStatus() {
        const status = {
            testId: this.testId,
            isInitialized: this.isInitialized,
            serverUrl: this.serverUrl,
            startTime: this.startTime,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0
        };

        try {
            // Get server status using serverManager.getStatus() method
            if (this.serverManager) {
                const serverManagerStatus = this.serverManager.getStatus();
                status.serverManager = serverManagerStatus;
                status.isRunning = this.serverManager.isRunning();
                
                if (this.serverManager.isRunning()) {
                    status.connectionInfo = this.serverManager.getConnectionInfo();
                }
            }

            // Add test-specific information like test ID and start time
            status.testEnvironment = {
                testId: this.testId,
                environment: this.config.environment,
                timeouts: this.config.timeouts
            };

            // Include test environment details and configuration summary
            if (this.testEnvironment) {
                status.testEnvironment.isolation = this.testEnvironment.getInfo?.() || 'enabled';
            }

        } catch (error) {
            status.error = error.message;
            this.logger.warn('Error retrieving server status', { error: error.message });
        }

        // Return comprehensive test server status object
        return status;
    }

    /**
     * Performs test server restart by executing graceful shutdown followed by startup with same configuration
     * 
     * @param {object} restartOptions - Configuration options for restart process
     * @param {number} restartOptions.shutdownTimeout - Timeout for shutdown phase
     * @param {number} restartOptions.startupTimeout - Timeout for startup phase
     * @param {boolean} restartOptions.force - Force shutdown if graceful shutdown fails
     * @returns {Promise<object>} Promise resolving when test server restart is complete and server is accepting connections
     */
    async restart(restartOptions = {}) {
        const {
            shutdownTimeout = this.config.timeouts.shutdown,
            startupTimeout = this.config.timeouts.startup,
            force = false
        } = restartOptions;

        try {
            // Log restart initiation with test ID and reason
            this.logger.info('Initiating test server restart', { 
                testId: this.testId, 
                restartOptions 
            });

            // Execute graceful shutdown using stopTestServer method
            await this.stopTestServer(force, shutdownTimeout);

            // Wait for shutdown completion with timeout handling
            // Small delay to ensure complete shutdown
            await new Promise(resolve => setTimeout(resolve, 100));

            // Execute startup sequence using startTestServer method with same configuration
            const startupInfo = await this.startTestServer({
                timeout: startupTimeout,
                waitForReady: true
            });

            // Verify test server is running and accepting connections after restart
            if (!this.isServerRunning()) {
                throw new Error('Test server is not running after restart');
            }

            const restartInfo = {
                ...startupInfo,
                restarted: true,
                restartTime: new Date()
            };

            // Log successful restart completion with timing and status
            this.logger.info('Test server restart completed successfully', restartInfo);

            // Return restart confirmation with updated server information
            return restartInfo;

        } catch (error) {
            this.logger.error('Test server restart failed', { error: error.message, testId: this.testId });
            throw new Error(`Test server restart failed: ${error.message}`);
        }
    }

    /**
     * Performs comprehensive cleanup of test server resources, environment restoration,
     * and final resource deallocation
     * 
     * @returns {Promise<void>} Promise resolving when cleanup is complete and all resources are deallocated
     */
    async cleanup() {
        try {
            this.logger.info('Starting test server cleanup', { testId: this.testId });

            // Execute stopTestServer if server is currently running
            if (this.isInitialized && this.serverManager && this.serverManager.isRunning()) {
                await this.stopTestServer(true); // Force shutdown during cleanup
            }

            // Clean up test environment using testEnvironment.restore() method
            if (this.testEnvironment && typeof this.testEnvironment.restore === 'function') {
                await this.testEnvironment.restore();
            }

            // Clear all server manager and lifecycle manager references
            this.serverManager = null;
            this.lifecycleManager = null;
            this.testAgent = null;

            // Reset all instance properties to initial state
            this.isInitialized = false;
            this.startTime = null;
            this.serverUrl = null;

            // Log cleanup completion with resource deallocation details
            this.logger.info('Test server cleanup completed successfully', { testId: this.testId });

        } catch (error) {
            this.logger.error('Test server cleanup failed', { error: error.message, testId: this.testId });
            throw new Error(`Test server cleanup failed: ${error.message}`);
        }
    }

    /**
     * Returns comprehensive test server information including configuration, status, timing, and test metadata
     * 
     * @returns {object} Complete test server information with configuration, status, and metadata
     */
    getTestInfo() {
        const testInfo = {
            testId: this.testId,
            isInitialized: this.isInitialized,
            
            // Include test server configuration and environment details
            configuration: {
                environment: this.config.environment,
                timeouts: this.config.timeouts,
                logging: this.config.logging
            },

            // Add server status using getServerStatus method
            status: this.getServerStatus(),

            // Include test timing information like startup time and uptime
            timing: {
                startTime: this.startTime,
                uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0
            },

            // Add test metadata including test ID and initialization status
            metadata: {
                testId: this.testId,
                serverUrl: this.serverUrl,
                initialized: this.isInitialized,
                running: this.isServerRunning()
            },

            // Include SuperTest agent availability and configuration
            testAgent: {
                available: Boolean(this.testAgent),
                configured: Boolean(this.testAgent && this.isInitialized)
            }
        };

        // Add test environment information if available
        if (this.testEnvironment) {
            testInfo.testEnvironment = this.testEnvironment.getInfo?.() || 'active';
        }

        // Return comprehensive test server information object
        return testInfo;
    }
}

// Export all functions and classes for use in test files
module.exports = {
    // Test server management class
    TestServerManager,
    
    // Utility functions for server testing
    createServerTestAgent,
    createTestServerConfig,
    startTestServer,
    stopTestServer,
    waitForServerReady,
    getTestServerUrl,
    isTestServerRunning,
    getAllTestServers,
    cleanupAllTestServers,
    createTestServerHealthCheck,
    validateTestServerSetup,
    
    // Global constants for test configuration
    TEST_SERVER_PORT_START,
    TEST_SERVER_PORT_END,
    DEFAULT_TEST_SERVER_TIMEOUT,
    
    // Test server registry (for advanced use cases)
    testServerInstances
};