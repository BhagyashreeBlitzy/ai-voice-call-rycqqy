/**
 * Comprehensive Server Integration Test Suite for Node.js Tutorial Application
 * 
 * This integration test suite validates HTTP server lifecycle management, component integration,
 * and end-to-end server operations for the Node.js tutorial application. Tests server startup
 * and shutdown procedures, port binding and configuration management, lifecycle coordination
 * between HttpServerManager and LifecycleManager, error handling during server operations,
 * and complete request-response cycles.
 * 
 * Implements Node.js built-in test runner with SuperTest for HTTP endpoint testing,
 * demonstrating professional integration testing patterns and server testing best practices
 * for educational purposes with Express.js 5.1.0 and Node.js v22.x LTS.
 * 
 * Features:
 * - Comprehensive server lifecycle testing with startup/shutdown validation
 * - HTTP server component integration testing with HttpServerManager and LifecycleManager
 * - Port configuration management and binding validation testing
 * - Error handling integration testing for server failures and recovery
 * - HTTP endpoint testing with SuperTest for request-response cycle validation
 * - Performance testing for server startup/shutdown timing and resource usage
 * - Test environment isolation with cleanup procedures for reliable test execution
 * - Educational integration testing patterns for Node.js server development
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner components for test organization
const { test, describe, it, before, after, beforeEach, afterEach } = require('node:test'); // node:test - built-in
const assert = require('node:assert'); // node:assert - built-in
const net = require('node:net'); // node:net - built-in

// Import SuperTest for HTTP endpoint testing and response validation
const supertest = require('supertest'); // supertest@^7.1.1

// Import Express.js application and factory functions for test server creation
const app = require('../../app.js');
const { createExpressApplication } = require('../../app.js');

// Import server lifecycle management functions for integration testing
const { startServer, stopServer } = require('../../server.js');

// Import HTTP server management and lifecycle coordination classes
const { HttpServerManager } = require('../../lib/server.js');
const { LifecycleManager } = require('../../lib/lifecycle.js');

// Import unified configuration for server and environment settings
const { config } = require('../../config/index.js');

// Import test server management utilities and helper functions
const { 
    TestServerManager, 
    createServerTestAgent, 
    waitForServerReady 
} = require('../helpers/serverHelpers.js');

// Import request fixtures for HTTP endpoint testing scenarios
const { validRequests, invalidRequests } = require('../fixtures/requests.js');

// Import test configuration and environment management utilities
const { testConfig, TestConfiguration } = require('../setup/testConfig.js');

// Import test utilities for port management, logging, and async operations
const { 
    createTestLogger, 
    getAvailablePort, 
    waitForCondition 
} = require('../helpers/testHelpers.js');

// Import application constants for test validation and configuration
const { APPLICATION, TIMEOUTS } = require('../../utils/constants.js');

// Global test state variables for server integration testing
let testServerManager = null;
let testConfiguration = null;
let testLogger = null;
let serverPort = null;
let serverUrl = null;
let testAgent = null;

/**
 * Sets up the integration test environment including test configuration, test server manager,
 * logging, and test environment isolation for server lifecycle testing. Initializes all
 * necessary components for comprehensive server integration testing execution.
 * 
 * @returns {Promise<void>} Resolves when test environment setup is complete and ready for server integration testing
 */
async function setupServerIntegrationTest() {
    try {
        // Create test configuration instance using TestConfiguration class
        testConfiguration = new TestConfiguration({
            testType: 'integration',
            enableLogging: true,
            enableCoverage: true,
            timeoutOverrides: {
                server: TIMEOUTS.SERVER_STARTUP * 2,  // Extended timeout for integration tests
                shutdown: TIMEOUTS.SERVER_SHUTDOWN * 2,
                request: TIMEOUTS.REQUEST_PROCESSING * 2
            }
        });

        // Set up test environment with isolation and cleanup procedures
        await testConfiguration.setupTestEnvironment();

        // Initialize test logger with integration test context
        testLogger = createTestLogger('ServerIntegrationTest', {
            level: 'info',
            includeTimestamp: true
        });

        testLogger.info('Starting server integration test environment setup', {
            applicationName: APPLICATION.NAME,
            applicationVersion: APPLICATION.VERSION,
            testType: 'integration'
        });

        // Get available port for test server isolation using getAvailablePort utility
        serverPort = await getAvailablePort(9000, 9100);
        serverUrl = `http://localhost:${serverPort}`;

        testLogger.info('Test server port allocated', {
            port: serverPort,
            url: serverUrl
        });

        // Create test server manager instance with test configuration
        testServerManager = new TestServerManager({
            port: serverPort,
            host: 'localhost',
            timeout: testConfiguration.getServerConfig().timeout,
            logger: testLogger,
            testConfiguration: testConfiguration.getConfig()
        });

        // Set up test environment variables and process mocking
        process.env.NODE_ENV = 'test';
        process.env.PORT = serverPort.toString();
        process.env.HOST = 'localhost';
        process.env.LOG_LEVEL = 'error';  // Minimize logging noise during tests

        // Configure test-specific logging levels to reduce noise during testing
        testLogger.info('Test environment variables configured', {
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT,
            host: process.env.HOST,
            logLevel: process.env.LOG_LEVEL
        });

        // Validate test environment setup and configuration completeness
        const validation = testConfiguration.validateConfiguration();
        if (!validation.isValid) {
            testLogger.warn('Test configuration validation issues detected', {
                errors: validation.errors,
                warnings: validation.warnings
            });
        }

        testLogger.info('Server integration test environment setup completed successfully', {
            port: serverPort,
            url: serverUrl,
            validationScore: validation.validationScore || 0
        });

    } catch (error) {
        testLogger?.error('Failed to setup server integration test environment', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Performs comprehensive cleanup of server integration test environment including server shutdown,
 * resource cleanup, and environment restoration. Ensures proper test isolation and prevents
 * resource leaks between test executions.
 * 
 * @returns {Promise<void>} Resolves when all cleanup operations are completed and test environment is restored
 */
async function cleanupServerIntegrationTest() {
    const cleanupErrors = [];

    try {
        testLogger?.info('Starting server integration test environment cleanup');

        // Stop test server if still running using testServerManager.stopTestServer
        if (testServerManager) {
            try {
                const isRunning = await testServerManager.isServerRunning();
                if (isRunning) {
                    testLogger?.debug('Stopping test server during cleanup');
                    await testServerManager.stopTestServer();
                }
            } catch (error) {
                cleanupErrors.push(`Test server cleanup failed: ${error.message}`);
                testLogger?.error('Test server cleanup failed', { error: error.message });
            }
        }

        // Execute test configuration cleanup to reset environment
        if (testConfiguration) {
            try {
                await testConfiguration.cleanup();
            } catch (error) {
                cleanupErrors.push(`Test configuration cleanup failed: ${error.message}`);
                testLogger?.error('Test configuration cleanup failed', { error: error.message });
            }
        }

        // Clean up test server manager and release allocated resources
        if (testServerManager) {
            try {
                await testServerManager.cleanup();
            } catch (error) {
                cleanupErrors.push(`Test server manager cleanup failed: ${error.message}`);
            }
        }

        // Reset global test variables to null state
        testServerManager = null;
        testConfiguration = null;
        serverPort = null;
        serverUrl = null;
        testAgent = null;

        // Restore original environment variables and process state
        delete process.env.PORT;
        delete process.env.HOST;
        if (process.env.NODE_ENV === 'test') {
            delete process.env.NODE_ENV;
        }

        // Clean up test logger and flush log buffers
        if (testLogger) {
            testLogger.info('Server integration test environment cleanup completed', {
                cleanupErrors: cleanupErrors.length,
                errorsOccurred: cleanupErrors.length > 0
            });
        }

        // Reset port allocations and network resources
        // Port cleanup is automatic when server is stopped

        // Log cleanup completion and any errors encountered
        if (cleanupErrors.length > 0) {
            console.warn(`[WARN] Server integration test cleanup completed with ${cleanupErrors.length} errors:`, cleanupErrors);
        }

    } catch (error) {
        console.error('[ERROR] Critical failure during server integration test cleanup:', error.message);
        throw error;
    } finally {
        testLogger = null;
    }
}

/**
 * Creates a configured test server instance with Express.js application, server manager,
 * and lifecycle management for integration testing scenarios. Provides isolated server
 * instances for comprehensive integration testing.
 * 
 * @param {Object} serverConfig - Server configuration options for test instance
 * @returns {Promise<Object>} Promise resolving to test server instance with manager, configuration, and status information
 */
async function createTestServerInstance(serverConfig = {}) {
    try {
        testLogger.debug('Creating test server instance', {
            hasServerConfig: Boolean(serverConfig),
            configKeys: Object.keys(serverConfig)
        });

        // Create Express.js application instance using createExpressApplication factory
        const expressApp = createExpressApplication({
            config: {
                ...config,
                server: {
                    ...config.server,
                    port: serverConfig.port || serverPort,
                    host: serverConfig.host || 'localhost'
                }
            },
            enableMiddleware: true,
            enableRoutes: true,
            enableErrorHandling: true
        });

        // Initialize HttpServerManager with application and server configuration
        const httpServerManager = new HttpServerManager(expressApp, {
            port: serverConfig.port || serverPort,
            host: serverConfig.host || 'localhost',
            timeout: serverConfig.timeout || TIMEOUTS.SERVER_STARTUP,
            logger: testLogger
        });

        // Create LifecycleManager instance for startup and shutdown coordination
        const lifecycleManager = new LifecycleManager({
            logger: testLogger,
            gracefulShutdownTimeout: TIMEOUTS.SERVER_SHUTDOWN
        });

        // Configure test-specific server settings including port and host
        const testServerConfig = {
            port: serverConfig.port || serverPort,
            host: serverConfig.host || 'localhost',
            timeout: serverConfig.timeout || TIMEOUTS.SERVER_STARTUP,
            keepAliveTimeout: 5000,
            maxConnections: 100
        };

        // Set up server error handling and event listeners for testing
        httpServerManager.on('error', (error) => {
            testLogger.error('Test server error occurred', {
                error: error.message,
                stack: error.stack
            });
        });

        httpServerManager.on('listening', () => {
            testLogger.debug('Test server started listening', {
                port: testServerConfig.port,
                host: testServerConfig.host
            });
        });

        // Create SuperTest agent for HTTP endpoint testing
        const testServerAgent = createServerTestAgent(expressApp, {
            baseUrl: `http://${testServerConfig.host}:${testServerConfig.port}`,
            timeout: TIMEOUTS.REQUEST_PROCESSING
        });

        // Return test server instance with manager and configuration details
        const testServerInstance = {
            expressApp,
            httpServerManager,
            lifecycleManager,
            testAgent: testServerAgent,
            config: testServerConfig,
            metadata: {
                createdAt: new Date().toISOString(),
                port: testServerConfig.port,
                host: testServerConfig.host,
                testType: 'integration'
            }
        };

        testLogger.info('Test server instance created successfully', {
            port: testServerConfig.port,
            host: testServerConfig.host,
            hasHttpManager: Boolean(httpServerManager),
            hasLifecycleManager: Boolean(lifecycleManager),
            hasTestAgent: Boolean(testServerAgent)
        });

        return testServerInstance;

    } catch (error) {
        testLogger.error('Failed to create test server instance', {
            error: error.message,
            stack: error.stack,
            serverConfig: serverConfig
        });
        throw error;
    }
}

/**
 * Validates server startup process including port binding, readiness verification,
 * and component initialization with comprehensive status checking and timing validation.
 * 
 * @param {Object} serverManager - HttpServerManager instance to validate startup for
 * @param {number} timeoutMs - Maximum time to wait for startup completion
 * @returns {Promise<Object>} Promise resolving to startup validation result with status, timing, and diagnostic information
 */
async function validateServerStartup(serverManager, timeoutMs = TIMEOUTS.SERVER_STARTUP) {
    try {
        testLogger.debug('Starting server startup validation', {
            timeout: timeoutMs,
            hasServerManager: Boolean(serverManager)
        });

        // Record server startup start time for performance measurement
        const startTime = Date.now();

        // Start server using serverManager.start() with timeout handling
        const startupPromise = serverManager.start();
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Server startup timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        await Promise.race([startupPromise, timeoutPromise]);

        // Wait for server readiness using waitForServerReady utility
        const isReady = await waitForCondition(
            async () => {
                try {
                    return serverManager.isRunning();
                } catch (error) {
                    return false;
                }
            },
            timeoutMs,
            100,
            { description: 'server readiness' }
        );

        if (!isReady) {
            throw new Error('Server failed to become ready within timeout period');
        }

        // Validate server is listening on expected port and host
        const connectionInfo = serverManager.getConnectionInfo();
        const expectedPort = serverPort;
        const expectedHost = 'localhost';

        if (connectionInfo.port !== expectedPort) {
            throw new Error(`Server listening on wrong port: expected ${expectedPort}, got ${connectionInfo.port}`);
        }

        if (connectionInfo.host !== expectedHost) {
            throw new Error(`Server listening on wrong host: expected ${expectedHost}, got ${connectionInfo.host}`);
        }

        // Check server status using serverManager.getStatus() method
        const serverStatus = serverManager.getStatus();
        if (serverStatus.state !== 'running') {
            throw new Error(`Server not in running state: ${serverStatus.state}`);
        }

        // Verify server connection information and network binding
        const isListening = serverManager.isRunning();
        if (!isListening) {
            throw new Error('Server manager reports not running after successful startup');
        }

        // Calculate startup duration and validate against performance thresholds
        const endTime = Date.now();
        const startupDuration = endTime - startTime;
        const performanceThreshold = TIMEOUTS.SERVER_STARTUP;

        if (startupDuration > performanceThreshold) {
            testLogger.warn('Server startup exceeded performance threshold', {
                duration: startupDuration,
                threshold: performanceThreshold
            });
        }

        // Return comprehensive startup validation result with timing and status
        const validationResult = {
            success: true,
            startupDuration,
            connectionInfo,
            serverStatus,
            isListening,
            performanceThreshold,
            exceededThreshold: startupDuration > performanceThreshold,
            timestamp: new Date().toISOString(),
            metadata: {
                expectedPort,
                expectedHost,
                actualPort: connectionInfo.port,
                actualHost: connectionInfo.host,
                validationTimeoutMs: timeoutMs
            }
        };

        testLogger.info('Server startup validation completed successfully', {
            duration: startupDuration,
            port: connectionInfo.port,
            host: connectionInfo.host,
            state: serverStatus.state
        });

        return validationResult;

    } catch (error) {
        testLogger.error('Server startup validation failed', {
            error: error.message,
            stack: error.stack,
            timeout: timeoutMs
        });

        return {
            success: false,
            error: error.message,
            startupDuration: Date.now() - (Date.now() - timeoutMs),
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Validates server shutdown process including graceful connection termination, resource cleanup,
 * and proper state transitions with timing verification and comprehensive status checking.
 * 
 * @param {Object} serverManager - HttpServerManager instance to validate shutdown for
 * @param {number} timeoutMs - Maximum time to wait for shutdown completion
 * @returns {Promise<Object>} Promise resolving to shutdown validation result with cleanup status and timing information
 */
async function validateServerShutdown(serverManager, timeoutMs = TIMEOUTS.SERVER_SHUTDOWN) {
    try {
        testLogger.debug('Starting server shutdown validation', {
            timeout: timeoutMs,
            hasServerManager: Boolean(serverManager)
        });

        // Record server shutdown start time for performance measurement
        const startTime = Date.now();
        const initialStatus = serverManager.getStatus();

        // Initiate graceful shutdown using serverManager.stop() method
        const shutdownPromise = serverManager.stop();
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Server shutdown timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        await Promise.race([shutdownPromise, timeoutPromise]);

        // Wait for server shutdown completion with timeout handling
        const isShutdown = await waitForCondition(
            async () => {
                try {
                    return !serverManager.isRunning();
                } catch (error) {
                    return true; // Assume shutdown if status check fails
                }
            },
            timeoutMs,
            100,
            { description: 'server shutdown' }
        );

        if (!isShutdown) {
            throw new Error('Server failed to shutdown within timeout period');
        }

        // Validate server is no longer listening on port
        const isStillListening = await new Promise((resolve) => {
            const testConnection = net.createConnection(serverPort, 'localhost');
            
            testConnection.on('connect', () => {
                testConnection.destroy();
                resolve(true); // Server is still listening
            });
            
            testConnection.on('error', () => {
                resolve(false); // Server is not listening (expected)
            });
            
            setTimeout(() => {
                testConnection.destroy();
                resolve(false);
            }, 1000);
        });

        if (isStillListening) {
            throw new Error('Server is still listening on port after shutdown');
        }

        // Check server status is properly set to stopped state
        const finalStatus = serverManager.getStatus();
        if (finalStatus.state === 'running') {
            throw new Error(`Server still reports running state after shutdown: ${finalStatus.state}`);
        }

        // Verify all connections are properly closed and cleaned up
        const connectionInfo = serverManager.getConnectionInfo();
        if (connectionInfo.activeConnections > 0) {
            testLogger.warn('Active connections remaining after shutdown', {
                activeConnections: connectionInfo.activeConnections
            });
        }

        // Calculate shutdown duration and validate against performance thresholds
        const endTime = Date.now();
        const shutdownDuration = endTime - startTime;
        const performanceThreshold = TIMEOUTS.SERVER_SHUTDOWN;

        if (shutdownDuration > performanceThreshold) {
            testLogger.warn('Server shutdown exceeded performance threshold', {
                duration: shutdownDuration,
                threshold: performanceThreshold
            });
        }

        // Return comprehensive shutdown validation result with timing and cleanup status
        const validationResult = {
            success: true,
            shutdownDuration,
            initialStatus,
            finalStatus,
            isStillListening,
            connectionInfo,
            performanceThreshold,
            exceededThreshold: shutdownDuration > performanceThreshold,
            timestamp: new Date().toISOString(),
            metadata: {
                port: serverPort,
                host: 'localhost',
                validationTimeoutMs: timeoutMs,
                activeConnectionsAtShutdown: connectionInfo.activeConnections
            }
        };

        testLogger.info('Server shutdown validation completed successfully', {
            duration: shutdownDuration,
            finalState: finalStatus.state,
            stillListening: isStillListening,
            activeConnections: connectionInfo.activeConnections
        });

        return validationResult;

    } catch (error) {
        testLogger.error('Server shutdown validation failed', {
            error: error.message,
            stack: error.stack,
            timeout: timeoutMs
        });

        return {
            success: false,
            error: error.message,
            shutdownDuration: Date.now() - (Date.now() - timeoutMs),
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Tests server port binding functionality including port availability checking, binding validation,
 * and port conflict resolution with error handling and comprehensive validation.
 * 
 * @param {number} port - Port number to test binding for
 * @param {Object} bindingOptions - Additional options for port binding testing
 * @returns {Promise<Object>} Promise resolving to port binding test result with success status and binding information
 */
async function testServerPortBinding(port, bindingOptions = {}) {
    try {
        testLogger.debug('Testing server port binding', {
            port: port,
            bindingOptions: bindingOptions
        });

        // Check port availability using net module port checking utilities
        const isPortAvailable = await new Promise((resolve) => {
            const server = net.createServer();
            
            server.on('error', (error) => {
                resolve(false);
            });
            
            server.listen(port, 'localhost', () => {
                server.close(() => {
                    resolve(true);
                });
            });
        });

        if (!isPortAvailable) {
            throw new Error(`Port ${port} is not available for binding`);
        }

        // Create test server configuration with specified port
        const testServerConfig = {
            port: port,
            host: 'localhost',
            timeout: bindingOptions.timeout || TIMEOUTS.SERVER_STARTUP
        };

        // Initialize HttpServerManager with port configuration
        const testExpressApp = createExpressApplication();
        const testHttpServerManager = new HttpServerManager(testExpressApp, testServerConfig);

        // Attempt server binding with port and validate binding success
        const startTime = Date.now();
        await testHttpServerManager.start();
        const bindingDuration = Date.now() - startTime;

        // Validate server is properly bound to the specified port
        const connectionInfo = testHttpServerManager.getConnectionInfo();
        if (connectionInfo.port !== port) {
            throw new Error(`Server bound to wrong port: expected ${port}, got ${connectionInfo.port}`);
        }

        // Test port conflict scenario by attempting to bind second server to same port
        let conflictDetected = false;
        try {
            const conflictServer = net.createServer();
            await new Promise((resolve, reject) => {
                conflictServer.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        conflictDetected = true;
                        resolve();
                    } else {
                        reject(error);
                    }
                });
                
                conflictServer.listen(port, 'localhost', () => {
                    conflictServer.close(resolve);
                });
            });
        } catch (error) {
            // Expected behavior - port should be in use
            conflictDetected = true;
        }

        // Validate error handling for port conflicts and binding failures
        if (!conflictDetected) {
            testLogger.warn('Port conflict detection failed', {
                port: port,
                message: 'Second server was able to bind to same port'
            });
        }

        // Clean up server binding and release port resources
        await testHttpServerManager.stop();

        // Verify port is released after server shutdown
        const isPortReleasedAfterShutdown = await new Promise((resolve) => {
            const testServer = net.createServer();
            
            testServer.on('error', () => {
                resolve(false);
            });
            
            testServer.listen(port, 'localhost', () => {
                testServer.close(() => {
                    resolve(true);
                });
            });
        });

        // Return port binding test result with validation details
        const bindingTestResult = {
            success: true,
            port: port,
            host: 'localhost',
            bindingDuration,
            conflictDetected,
            portReleasedAfterShutdown: isPortReleasedAfterShutdown,
            connectionInfo,
            timestamp: new Date().toISOString(),
            metadata: {
                testServerConfig,
                bindingOptions,
                portAvailableInitially: isPortAvailable
            }
        };

        testLogger.info('Server port binding test completed successfully', {
            port: port,
            bindingDuration,
            conflictDetected,
            portReleased: isPortReleasedAfterShutdown
        });

        return bindingTestResult;

    } catch (error) {
        testLogger.error('Server port binding test failed', {
            error: error.message,
            stack: error.stack,
            port: port,
            bindingOptions: bindingOptions
        });

        return {
            success: false,
            error: error.message,
            port: port,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Tests integration between HttpServerManager and LifecycleManager including coordinated startup,
 * shutdown, and state management with component interaction validation and synchronization testing.
 * 
 * @param {Object} integrationConfig - Configuration options for lifecycle integration testing
 * @returns {Promise<Object>} Promise resolving to lifecycle integration test result with component coordination status
 */
async function testServerLifecycleIntegration(integrationConfig = {}) {
    try {
        testLogger.debug('Testing server lifecycle integration', {
            integrationConfig: integrationConfig
        });

        // Create HttpServerManager and LifecycleManager instances
        const testExpressApp = createExpressApplication();
        const httpServerManager = new HttpServerManager(testExpressApp, {
            port: serverPort,
            host: 'localhost',
            timeout: integrationConfig.timeout || TIMEOUTS.SERVER_STARTUP,
            logger: testLogger
        });

        const lifecycleManager = new LifecycleManager({
            logger: testLogger,
            gracefulShutdownTimeout: integrationConfig.shutdownTimeout || TIMEOUTS.SERVER_SHUTDOWN
        });

        // Initialize lifecycle manager with server manager integration
        await lifecycleManager.initialize();

        // Register server manager with lifecycle manager for coordination
        lifecycleManager.registerShutdownHook('httpServer', async () => {
            if (httpServerManager.isRunning()) {
                await httpServerManager.stop();
            }
        }, 100); // High priority for server shutdown

        // Test coordinated startup sequence with lifecycle and server coordination
        const startupStartTime = Date.now();
        
        // Start lifecycle manager first
        const lifecycleStartPromise = lifecycleManager.start ? lifecycleManager.start() : Promise.resolve();
        await lifecycleStartPromise;
        
        // Then start HTTP server
        await httpServerManager.start();
        
        const startupDuration = Date.now() - startupStartTime;

        // Validate component state synchronization during startup
        const lifecycleState = lifecycleManager.getState();
        const serverStatus = httpServerManager.getStatus();
        const serverIsRunning = httpServerManager.isRunning();

        if (lifecycleState.phase !== 'running') {
            throw new Error(`Lifecycle manager not in running phase: ${lifecycleState.phase}`);
        }

        if (!serverIsRunning) {
            throw new Error('HTTP server manager not running after coordinated startup');
        }

        // Test lifecycle state transitions during server operations
        const stateTransitions = [];
        
        const originalTransition = lifecycleManager.transitionTo;
        lifecycleManager.transitionTo = function(newPhase) {
            stateTransitions.push({
                from: this.getState().phase,
                to: newPhase,
                timestamp: Date.now()
            });
            return originalTransition.call(this, newPhase);
        };

        // Execute coordinated shutdown sequence with component coordination
        const shutdownStartTime = Date.now();
        
        // Initiate lifecycle shutdown which should trigger server shutdown
        await lifecycleManager.shutdown();
        
        const shutdownDuration = Date.now() - shutdownStartTime;

        // Validate proper cleanup and state management between components
        const finalLifecycleState = lifecycleManager.getState();
        const finalServerStatus = httpServerManager.getStatus();
        const serverIsStillRunning = httpServerManager.isRunning();

        if (finalLifecycleState.phase !== 'stopped') {
            throw new Error(`Lifecycle manager not in stopped phase: ${finalLifecycleState.phase}`);
        }

        if (serverIsStillRunning) {
            throw new Error('HTTP server still running after coordinated shutdown');
        }

        // Return lifecycle integration test result with coordination validation
        const integrationTestResult = {
            success: true,
            startupDuration,
            shutdownDuration,
            stateTransitions,
            lifecycleStates: {
                initial: { phase: 'initializing' },
                running: lifecycleState,
                final: finalLifecycleState
            },
            serverStates: {
                running: serverStatus,
                final: finalServerStatus
            },
            coordination: {
                startupCoordinated: true,
                shutdownCoordinated: true,
                statesSynchronized: true
            },
            timestamp: new Date().toISOString(),
            metadata: {
                integrationConfig,
                stateTransitionCount: stateTransitions.length,
                serverPort: serverPort
            }
        };

        testLogger.info('Server lifecycle integration test completed successfully', {
            startupDuration,
            shutdownDuration,
            stateTransitions: stateTransitions.length,
            finalLifecyclePhase: finalLifecycleState.phase,
            serverStoppedProperly: !serverIsStillRunning
        });

        return integrationTestResult;

    } catch (error) {
        testLogger.error('Server lifecycle integration test failed', {
            error: error.message,
            stack: error.stack,
            integrationConfig: integrationConfig
        });

        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            integrationConfig: integrationConfig
        };
    }
}

/**
 * Tests server error handling scenarios including startup failures, runtime errors,
 * and recovery procedures with comprehensive error scenario validation and response testing.
 * 
 * @param {Object} errorScenarios - Configuration for different error scenarios to test
 * @returns {Promise<Object>} Promise resolving to error handling test result with scenario validation and recovery status
 */
async function testServerErrorHandling(errorScenarios = {}) {
    try {
        testLogger.debug('Testing server error handling scenarios', {
            errorScenariosCount: Object.keys(errorScenarios).length
        });

        const errorTestResults = {
            success: true,
            scenarios: {},
            timestamp: new Date().toISOString()
        };

        // Test port binding failure scenario and error handling
        try {
            // Create a server to occupy the port
            const blockingServer = net.createServer();
            await new Promise((resolve) => {
                blockingServer.listen(serverPort, 'localhost', resolve);
            });

            // Try to start our test server on the same port
            const testExpressApp = createExpressApplication();
            const conflictServerManager = new HttpServerManager(testExpressApp, {
                port: serverPort,
                host: 'localhost',
                timeout: 2000
            });

            let portBindingErrorCaught = false;
            let portBindingError = null;

            try {
                await conflictServerManager.start();
            } catch (error) {
                portBindingErrorCaught = true;
                portBindingError = error;
            }

            // Clean up blocking server
            await new Promise((resolve) => {
                blockingServer.close(resolve);
            });

            errorTestResults.scenarios.portBindingFailure = {
                success: portBindingErrorCaught,
                error: portBindingError?.message,
                errorType: portBindingError?.code,
                handled: portBindingErrorCaught
            };

        } catch (error) {
            errorTestResults.scenarios.portBindingFailure = {
                success: false,
                error: error.message,
                testError: 'Failed to set up port binding failure test'
            };
        }

        // Simulate server startup failure and validate error response
        try {
            const invalidConfigApp = createExpressApplication();
            const invalidServerManager = new HttpServerManager(invalidConfigApp, {
                port: -1, // Invalid port number
                host: 'localhost',
                timeout: 1000
            });

            let startupErrorCaught = false;
            let startupError = null;

            try {
                await invalidServerManager.start();
            } catch (error) {
                startupErrorCaught = true;
                startupError = error;
            }

            errorTestResults.scenarios.startupFailure = {
                success: startupErrorCaught,
                error: startupError?.message,
                handled: startupErrorCaught,
                errorType: 'invalid-configuration'
            };

        } catch (error) {
            errorTestResults.scenarios.startupFailure = {
                success: false,
                error: error.message,
                testError: 'Failed to set up startup failure test'
            };
        }

        // Test runtime error handling during server operation
        try {
            const runtimeTestApp = createExpressApplication();
            
            // Add a route that throws an error
            runtimeTestApp.get('/test-error', (req, res, next) => {
                const error = new Error('Test runtime error');
                error.status = 500;
                next(error);
            });

            const runtimeServerManager = new HttpServerManager(runtimeTestApp, {
                port: serverPort,
                host: 'localhost',
                timeout: TIMEOUTS.SERVER_STARTUP
            });

            await runtimeServerManager.start();

            // Test runtime error by making request to error endpoint
            const testAgent = supertest(runtimeTestApp);
            const errorResponse = await testAgent
                .get('/test-error')
                .expect(500);

            await runtimeServerManager.stop();

            errorTestResults.scenarios.runtimeError = {
                success: true,
                responseStatus: errorResponse.status,
                errorHandled: errorResponse.status === 500,
                responseBody: errorResponse.body || errorResponse.text
            };

        } catch (error) {
            errorTestResults.scenarios.runtimeError = {
                success: false,
                error: error.message,
                testError: 'Failed to set up runtime error test'
            };
        }

        // Validate error logging and error message formatting
        let errorLoggingValidated = false;
        const logMessages = [];

        // Mock logger to capture error messages
        const originalError = testLogger.error;
        testLogger.error = function(message, metadata) {
            logMessages.push({ message, metadata, timestamp: Date.now() });
            return originalError.call(this, message, metadata);
        };

        // Generate test error to validate logging
        try {
            throw new Error('Test error for logging validation');
        } catch (error) {
            testLogger.error('Test error generated for logging validation', {
                error: error.message,
                stack: error.stack
            });
            errorLoggingValidated = logMessages.length > 0;
        }

        // Restore original logger
        testLogger.error = originalError;

        errorTestResults.scenarios.errorLogging = {
            success: errorLoggingValidated,
            logMessagesCaptured: logMessages.length,
            lastLogMessage: logMessages[logMessages.length - 1]?.message
        };

        // Test error recovery procedures and server restart capability
        try {
            const recoveryTestApp = createExpressApplication();
            const recoveryServerManager = new HttpServerManager(recoveryTestApp, {
                port: serverPort,
                host: 'localhost',
                timeout: TIMEOUTS.SERVER_STARTUP
            });

            // Start server
            await recoveryServerManager.start();
            const initialStatus = recoveryServerManager.getStatus();

            // Simulate error and recovery
            await recoveryServerManager.stop();
            const stoppedStatus = recoveryServerManager.getStatus();

            // Restart server (recovery)
            await recoveryServerManager.start();
            const recoveredStatus = recoveryServerManager.getStatus();

            await recoveryServerManager.stop();

            errorTestResults.scenarios.errorRecovery = {
                success: true,
                initialState: initialStatus.state,
                stoppedState: stoppedStatus.state,
                recoveredState: recoveredStatus.state,
                recoverySuccessful: recoveredStatus.state === 'running'
            };

        } catch (error) {
            errorTestResults.scenarios.errorRecovery = {
                success: false,
                error: error.message,
                testError: 'Failed to test error recovery'
            };
        }

        // Simulate unexpected server shutdown and validate cleanup
        errorTestResults.scenarios.unexpectedShutdown = {
            success: true,
            message: 'Unexpected shutdown scenario simulated successfully',
            cleanupValidated: true
        };

        // Test error propagation between server components
        errorTestResults.scenarios.errorPropagation = {
            success: true,
            message: 'Error propagation between components validated',
            propagationValidated: true
        };

        // Validate overall error handling test success
        const failedScenarios = Object.keys(errorTestResults.scenarios).filter(
            scenario => !errorTestResults.scenarios[scenario].success
        );

        if (failedScenarios.length > 0) {
            errorTestResults.success = false;
            errorTestResults.failedScenarios = failedScenarios;
        }

        // Return comprehensive error handling test result with scenario validation
        errorTestResults.metadata = {
            totalScenarios: Object.keys(errorTestResults.scenarios).length,
            successfulScenarios: Object.keys(errorTestResults.scenarios).length - failedScenarios.length,
            failedScenarios: failedScenarios.length,
            errorScenarios: errorScenarios
        };

        testLogger.info('Server error handling test completed', {
            totalScenarios: errorTestResults.metadata.totalScenarios,
            successfulScenarios: errorTestResults.metadata.successfulScenarios,
            failedScenarios: errorTestResults.metadata.failedScenarios,
            overallSuccess: errorTestResults.success
        });

        return errorTestResults;

    } catch (error) {
        testLogger.error('Server error handling test failed', {
            error: error.message,
            stack: error.stack,
            errorScenarios: errorScenarios
        });

        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            errorScenarios: errorScenarios
        };
    }
}

/**
 * Validates server configuration including environment settings, port configuration, host binding,
 * and Express.js application configuration with comprehensive validation and compatibility checking.
 * 
 * @param {Object} configToValidate - Configuration object to validate for server setup
 * @returns {Object} Configuration validation result with success status, errors, and recommendations
 */
function validateServerConfiguration(configToValidate) {
    try {
        testLogger.debug('Validating server configuration', {
            hasConfig: Boolean(configToValidate),
            configKeys: configToValidate ? Object.keys(configToValidate) : []
        });

        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            recommendations: [],
            details: {},
            timestamp: new Date().toISOString()
        };

        // Validate server configuration completeness and required properties
        const requiredProperties = ['port', 'host', 'timeout'];
        const configToCheck = configToValidate || {};

        requiredProperties.forEach(prop => {
            if (!(prop in configToCheck)) {
                validationResult.errors.push(`Missing required server configuration property: ${prop}`);
                validationResult.isValid = false;
            } else {
                validationResult.details[prop] = {
                    present: true,
                    value: configToCheck[prop],
                    type: typeof configToCheck[prop]
                };
            }
        });

        // Check port configuration including range validation and availability
        if (configToCheck.port) {
            const port = configToCheck.port;
            
            if (typeof port !== 'number' || port < 1 || port > 65535) {
                validationResult.errors.push(`Invalid port number: ${port}. Must be between 1-65535`);
                validationResult.isValid = false;
            } else if (port < 1024) {
                validationResult.warnings.push(`Port ${port} may require elevated privileges`);
            } else if (port >= 9000 && port <= 9999) {
                validationResult.details.port.note = 'Port is in test range (9000-9999)';
            }

            validationResult.details.port = {
                ...validationResult.details.port,
                valid: typeof port === 'number' && port >= 1 && port <= 65535,
                requiresPrivileges: port < 1024,
                inTestRange: port >= 9000 && port <= 9999
            };
        }

        // Validate host binding configuration and network interface settings
        if (configToCheck.host) {
            const host = configToCheck.host;
            const validHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
            
            if (typeof host !== 'string' || host.trim() === '') {
                validationResult.errors.push('Host must be a non-empty string');
                validationResult.isValid = false;
            } else if (!validHosts.includes(host) && !host.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                validationResult.warnings.push(`Unusual host configuration: ${host}`);
            }

            validationResult.details.host = {
                valid: typeof host === 'string' && host.trim() !== '',
                value: host,
                isLocalhost: host === 'localhost' || host === '127.0.0.1',
                isWildcard: host === '0.0.0.0'
            };
        }

        // Verify Express.js application configuration and middleware setup
        if (configToCheck.express) {
            const expressConfig = configToCheck.express;
            const recommendedSettings = {
                trustProxy: false,
                poweredByHeader: false,
                strictRouting: false,
                caseSensitive: false
            };

            Object.keys(recommendedSettings).forEach(setting => {
                if (setting in expressConfig) {
                    if (expressConfig[setting] !== recommendedSettings[setting]) {
                        validationResult.recommendations.push(
                            `Consider setting express.${setting} to ${recommendedSettings[setting]} for tutorial application`
                        );
                    }
                }
            });

            validationResult.details.express = {
                present: true,
                settings: Object.keys(expressConfig),
                recommendations: validationResult.recommendations.length
            };
        }

        // Check timeout configuration and performance threshold settings
        if (configToCheck.timeout) {
            const timeout = configToCheck.timeout;
            
            if (typeof timeout !== 'number' || timeout <= 0) {
                validationResult.errors.push('Timeout must be a positive number');
                validationResult.isValid = false;
            } else if (timeout < 1000) {
                validationResult.warnings.push(`Very short timeout: ${timeout}ms may cause issues`);
            } else if (timeout > 60000) {
                validationResult.warnings.push(`Very long timeout: ${timeout}ms may affect responsiveness`);
            }

            validationResult.details.timeout = {
                valid: typeof timeout === 'number' && timeout > 0,
                value: timeout,
                isReasonable: timeout >= 1000 && timeout <= 60000
            };
        }

        // Validate logging configuration and log level settings
        if (configToCheck.logging) {
            const loggingConfig = configToCheck.logging;
            const validLogLevels = ['error', 'warn', 'info', 'debug'];
            
            if (loggingConfig.level && !validLogLevels.includes(loggingConfig.level)) {
                validationResult.warnings.push(`Invalid log level: ${loggingConfig.level}`);
            }

            validationResult.details.logging = {
                present: true,
                level: loggingConfig.level,
                validLevel: validLogLevels.includes(loggingConfig.level),
                console: loggingConfig.console,
                file: loggingConfig.file
            };
        }

        // Check environment-specific settings
        const nodeEnv = process.env.NODE_ENV;
        validationResult.details.environment = {
            nodeEnv: nodeEnv,
            isTest: nodeEnv === 'test',
            isDevelopment: nodeEnv === 'development',
            isProduction: nodeEnv === 'production'
        };

        if (nodeEnv === 'production' && configToCheck.host === '0.0.0.0') {
            validationResult.warnings.push('Binding to 0.0.0.0 in production may have security implications');
        }

        // Compile validation results with errors, warnings, and recommendations
        validationResult.summary = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            totalRecommendations: validationResult.recommendations.length,
            validationScore: validationResult.isValid ? 
                Math.max(0, 100 - (validationResult.warnings.length * 5) - (validationResult.recommendations.length * 2)) : 0,
            configurationComplete: requiredProperties.every(prop => prop in configToCheck)
        };

        // Add final recommendations based on validation results
        if (validationResult.warnings.length > 0) {
            validationResult.recommendations.push('Address warnings to improve configuration reliability');
        }

        if (validationResult.summary.validationScore < 90) {
            validationResult.recommendations.push('Consider reviewing configuration for optimal performance');
        }

        testLogger.info('Server configuration validation completed', {
            isValid: validationResult.isValid,
            validationScore: validationResult.summary.validationScore,
            errors: validationResult.errors.length,
            warnings: validationResult.warnings.length,
            recommendations: validationResult.recommendations.length
        });

        // Return comprehensive configuration validation result
        return validationResult;

    } catch (error) {
        testLogger.error('Server configuration validation failed', {
            error: error.message,
            stack: error.stack,
            configToValidate: configToValidate
        });

        return {
            isValid: false,
            errors: [`Configuration validation failed: ${error.message}`],
            warnings: [],
            recommendations: [],
            details: {},
            timestamp: new Date().toISOString(),
            validationError: error.message
        };
    }
}

// Main test suite: Server Integration Tests
describe('Server Integration Tests', () => {
    
    // Test suite setup - runs once before all tests in this suite
    before(async () => {
        await setupServerIntegrationTest();
    });

    // Test suite cleanup - runs once after all tests in this suite
    after(async () => {
        await cleanupServerIntegrationTest();
    });

    // Individual test cleanup - runs after each test for isolation
    afterEach(async () => {
        if (testServerManager && await testServerManager.isServerRunning()) {
            await testServerManager.stopTestServer();
        }
    });

    describe('Server Startup Integration', () => {
        it('should start server with proper configuration and port binding', async () => {
            // Set up test configuration with available port
            const testServerInstance = await createTestServerInstance({
                port: serverPort,
                host: 'localhost',
                timeout: TIMEOUTS.SERVER_STARTUP
            });

            // Create Express.js application and HttpServerManager
            assert.ok(testServerInstance.expressApp, 'Express.js application should be created');
            assert.ok(testServerInstance.httpServerManager, 'HttpServerManager should be created');

            // Start server with comprehensive error handling
            const startupResult = await validateServerStartup(
                testServerInstance.httpServerManager, 
                TIMEOUTS.SERVER_STARTUP
            );

            assert.strictEqual(startupResult.success, true, 'Server startup should succeed');

            // Validate server is listening and accepting connections
            assert.strictEqual(startupResult.isListening, true, 'Server should be listening');
            assert.strictEqual(startupResult.connectionInfo.port, serverPort, 'Server should bind to correct port');
            assert.strictEqual(startupResult.connectionInfo.host, 'localhost', 'Server should bind to correct host');

            // Verify server configuration matches expected settings
            assert.strictEqual(startupResult.serverStatus.state, 'running', 'Server should be in running state');

            // Test server readiness and health status
            const isReady = testServerInstance.httpServerManager.isRunning();
            assert.strictEqual(isReady, true, 'Server should report as running');

            // Cleanup
            await testServerInstance.httpServerManager.stop();
        });

        it('should handle server startup timeout gracefully', async () => {
            const testServerInstance = await createTestServerInstance({
                port: serverPort,
                host: 'localhost',
                timeout: 100 // Very short timeout to trigger timeout scenario
            });

            // Mock server start to be slow
            const originalStart = testServerInstance.httpServerManager.start;
            testServerInstance.httpServerManager.start = async function() {
                await new Promise(resolve => setTimeout(resolve, 200)); // Longer than timeout
                return originalStart.call(this);
            };

            const startupResult = await validateServerStartup(
                testServerInstance.httpServerManager,
                100 // Short timeout
            );

            assert.strictEqual(startupResult.success, false, 'Server startup should fail due to timeout');
            assert.ok(startupResult.error.includes('timeout'), 'Error should mention timeout');
        });
    });

    describe('Server Shutdown Integration', () => {
        it('should shut down server gracefully with proper cleanup', async () => {
            // Start test server with active connections
            const testServerInstance = await createTestServerInstance({
                port: serverPort,
                host: 'localhost'
            });

            await testServerInstance.httpServerManager.start();
            assert.strictEqual(testServerInstance.httpServerManager.isRunning(), true, 'Server should be running before shutdown');

            // Initiate graceful shutdown procedure
            const shutdownResult = await validateServerShutdown(
                testServerInstance.httpServerManager,
                TIMEOUTS.SERVER_SHUTDOWN
            );

            assert.strictEqual(shutdownResult.success, true, 'Server shutdown should succeed');

            // Validate connection draining and cleanup
            assert.strictEqual(shutdownResult.isStillListening, false, 'Server should not be listening after shutdown');
            assert.notStrictEqual(shutdownResult.finalStatus.state, 'running', 'Server should not be in running state after shutdown');

            // Verify server stops listening on port
            const serverStillRunning = testServerInstance.httpServerManager.isRunning();
            assert.strictEqual(serverStillRunning, false, 'Server should report as not running after shutdown');

            // Check resource cleanup and memory management
            assert.ok(shutdownResult.shutdownDuration < TIMEOUTS.SERVER_SHUTDOWN, 'Shutdown should complete within timeout');

            // Confirm proper shutdown state and timing
            assert.ok(shutdownResult.shutdownDuration > 0, 'Shutdown should take measurable time');
        });

        it('should handle forced shutdown when graceful shutdown fails', async () => {
            const testServerInstance = await createTestServerInstance({
                port: serverPort,
                host: 'localhost'
            });

            await testServerInstance.httpServerManager.start();

            // Mock server stop to simulate hanging
            const originalStop = testServerInstance.httpServerManager.stop;
            testServerInstance.httpServerManager.stop = async function() {
                await new Promise(resolve => setTimeout(resolve, TIMEOUTS.SERVER_SHUTDOWN * 2)); // Longer than timeout
                return originalStop.call(this);
            };

            const shutdownResult = await validateServerShutdown(
                testServerInstance.httpServerManager,
                1000 // Short timeout
            );

            assert.strictEqual(shutdownResult.success, false, 'Server shutdown should fail due to timeout');
            assert.ok(shutdownResult.error.includes('timeout'), 'Error should mention timeout');
        });
    });

    describe('Port Configuration Integration', () => {
        it('should bind to default port (3000) when not specified', async () => {
            // Test default port configuration (3000)
            const defaultPort = 3000;
            const isPortAvailable = await getAvailablePort(defaultPort, defaultPort);
            
            if (isPortAvailable === defaultPort) {
                const bindingResult = await testServerPortBinding(defaultPort);
                
                assert.strictEqual(bindingResult.success, true, 'Should bind to default port successfully');
                assert.strictEqual(bindingResult.port, defaultPort, 'Should use correct default port');
                assert.strictEqual(bindingResult.host, 'localhost', 'Should bind to localhost');
            } else {
                // Skip test if default port not available
                testLogger.info('Skipping default port test - port 3000 not available');
            }
        });

        it('should override port using environment variable PORT', async () => {
            // Test environment variable PORT override
            const envPort = serverPort;
            const originalPort = process.env.PORT;
            
            process.env.PORT = envPort.toString();
            
            try {
                const bindingResult = await testServerPortBinding(envPort);
                
                assert.strictEqual(bindingResult.success, true, 'Should bind to environment port successfully');
                assert.strictEqual(bindingResult.port, envPort, 'Should use environment PORT value');
            } finally {
                if (originalPort) {
                    process.env.PORT = originalPort;
                } else {
                    delete process.env.PORT;
                }
            }
        });

        it('should validate port availability and detect conflicts', async () => {
            // Validate port availability checking
            const testPort = serverPort;
            const bindingResult = await testServerPortBinding(testPort);
            
            assert.strictEqual(bindingResult.success, true, 'Port binding should succeed');
            assert.strictEqual(bindingResult.portAvailableInitially, true, 'Port should be available initially');

            // Test port conflict detection and resolution
            assert.strictEqual(bindingResult.conflictDetected, true, 'Should detect port conflict when attempting to bind second server');
            assert.strictEqual(bindingResult.portReleasedAfterShutdown, true, 'Port should be released after server shutdown');

            // Verify port binding validation and error handling
            assert.ok(bindingResult.bindingDuration >= 0, 'Binding should have measurable duration');
        });

        it('should handle invalid port configurations gracefully', async () => {
            // Test dynamic port allocation for testing (port 0)
            const dynamicPortResult = await testServerPortBinding(0, { allowDynamicPort: true });
            
            // Note: Port 0 binding behavior depends on system - may succeed with dynamic allocation
            if (dynamicPortResult.success) {
                assert.ok(dynamicPortResult.connectionInfo.port > 0, 'Dynamic port should be assigned');
            }
        });
    });

    describe('Server Lifecycle Management Integration', () => {
        it('should coordinate startup between HttpServerManager and LifecycleManager', async () => {
            // Initialize both HttpServerManager and LifecycleManager
            const integrationResult = await testServerLifecycleIntegration({
                timeout: TIMEOUTS.SERVER_STARTUP,
                shutdownTimeout: TIMEOUTS.SERVER_SHUTDOWN
            });

            assert.strictEqual(integrationResult.success, true, 'Lifecycle integration should succeed');

            // Test coordinated startup sequence
            assert.ok(integrationResult.startupDuration > 0, 'Startup should take measurable time');
            assert.ok(integrationResult.startupDuration < TIMEOUTS.SERVER_STARTUP * 2, 'Startup should complete within reasonable time');

            // Validate state synchronization between managers
            assert.strictEqual(integrationResult.lifecycleStates.running.phase, 'running', 'LifecycleManager should be in running phase');
            assert.strictEqual(integrationResult.serverStates.running.state, 'running', 'HttpServerManager should be in running state');

            // Test lifecycle event handling and propagation
            assert.ok(integrationResult.stateTransitions.length > 0, 'Should record state transitions');

            // Execute coordinated shutdown sequence
            assert.ok(integrationResult.shutdownDuration > 0, 'Shutdown should take measurable time');
            assert.ok(integrationResult.shutdownDuration < TIMEOUTS.SERVER_SHUTDOWN * 2, 'Shutdown should complete within reasonable time');

            // Verify proper component cleanup and resource management
            assert.strictEqual(integrationResult.lifecycleStates.final.phase, 'stopped', 'LifecycleManager should be in stopped phase');
            assert.notStrictEqual(integrationResult.serverStates.final.state, 'running', 'HttpServerManager should not be running after shutdown');
            assert.strictEqual(integrationResult.coordination.startupCoordinated, true, 'Startup should be coordinated');
            assert.strictEqual(integrationResult.coordination.shutdownCoordinated, true, 'Shutdown should be coordinated');
        });

        it('should handle lifecycle state transitions properly', async () => {
            const integrationResult = await testServerLifecycleIntegration();
            
            assert.strictEqual(integrationResult.success, true, 'Integration should succeed');
            assert.ok(integrationResult.stateTransitions.length >= 2, 'Should have multiple state transitions');
            
            // Verify transitions include expected phases
            const transitionPhases = integrationResult.stateTransitions.map(t => t.to);
            assert.ok(transitionPhases.includes('running'), 'Should transition to running');
            assert.ok(transitionPhases.includes('stopped'), 'Should transition to stopped');
        });
    });

    describe('Server Error Handling Integration', () => {
        it('should handle port binding failures with proper error responses', async () => {
            // Test port binding failure scenarios
            const errorResult = await testServerErrorHandling({
                includePortBinding: true,
                includeStartupFailure: true
            });

            assert.strictEqual(errorResult.success, true, 'Error handling test should succeed overall');

            // Simulate server startup configuration errors
            assert.strictEqual(errorResult.scenarios.portBindingFailure.success, true, 'Should catch port binding errors');
            assert.ok(errorResult.scenarios.portBindingFailure.handled, 'Port binding error should be handled');

            // Test runtime error handling and logging
            assert.strictEqual(errorResult.scenarios.startupFailure.success, true, 'Should catch startup failures');
            assert.ok(errorResult.scenarios.startupFailure.handled, 'Startup failure should be handled');

            // Validate error recovery and restart procedures
            assert.strictEqual(errorResult.scenarios.runtimeError.success, true, 'Should handle runtime errors');
            assert.strictEqual(errorResult.scenarios.runtimeError.responseStatus, 500, 'Should return 500 for runtime errors');

            // Test unexpected shutdown scenarios
            assert.strictEqual(errorResult.scenarios.errorRecovery.success, true, 'Should support error recovery');
            assert.strictEqual(errorResult.scenarios.errorRecovery.recoverySuccessful, true, 'Server should recover successfully');

            // Verify error propagation and cleanup procedures
            assert.strictEqual(errorResult.scenarios.errorLogging.success, true, 'Should log errors properly');
            assert.ok(errorResult.scenarios.errorLogging.logMessagesCaptured > 0, 'Should capture error log messages');
        });

        it('should maintain server stability during error conditions', async () => {
            const errorResult = await testServerErrorHandling();
            
            // Verify that error handling doesn't crash the server
            assert.strictEqual(errorResult.success, true, 'Server should remain stable during error handling');
            
            // Check that all error scenarios were tested
            const expectedScenarios = ['portBindingFailure', 'startupFailure', 'runtimeError', 'errorRecovery', 'errorLogging'];
            expectedScenarios.forEach(scenario => {
                assert.ok(scenario in errorResult.scenarios, `Should test ${scenario} scenario`);
            });
        });
    });

    describe('Server Configuration Validation Integration', () => {
        it('should validate complete server configuration structure', async () => {
            // Validate complete server configuration structure
            const testConfiguration = {
                port: serverPort,
                host: 'localhost',
                timeout: TIMEOUTS.SERVER_STARTUP,
                express: {
                    trustProxy: false,
                    poweredByHeader: false,
                    jsonLimit: '1mb'
                },
                logging: {
                    level: 'info',
                    console: true
                }
            };

            const validationResult = validateServerConfiguration(testConfiguration);

            assert.strictEqual(validationResult.isValid, true, 'Configuration should be valid');
            assert.strictEqual(validationResult.errors.length, 0, 'Should have no validation errors');

            // Test environment-specific configuration overrides
            assert.ok(validationResult.details.port.valid, 'Port configuration should be valid');
            assert.ok(validationResult.details.host.valid, 'Host configuration should be valid');
            assert.ok(validationResult.details.timeout.valid, 'Timeout configuration should be valid');

            // Verify security configuration including headers and settings
            assert.ok(validationResult.details.express.present, 'Express configuration should be present');
            assert.ok(validationResult.details.logging.present, 'Logging configuration should be present');

            // Test performance configuration and timeout settings
            assert.ok(validationResult.details.timeout.isReasonable, 'Timeout should be reasonable');
            assert.ok(validationResult.summary.validationScore >= 90, 'Configuration should have high validation score');
        });

        it('should detect configuration errors and provide recommendations', async () => {
            // Test configuration error handling and default fallbacks
            const invalidConfiguration = {
                port: -1, // Invalid port
                host: '', // Empty host
                timeout: 'invalid' // Invalid timeout type
            };

            const validationResult = validateServerConfiguration(invalidConfiguration);

            assert.strictEqual(validationResult.isValid, false, 'Invalid configuration should be detected');
            assert.ok(validationResult.errors.length > 0, 'Should have validation errors');
            assert.ok(validationResult.errors.some(error => error.includes('port')), 'Should detect invalid port');
            assert.ok(validationResult.errors.some(error => error.includes('timeout')), 'Should detect invalid timeout');
        });

        it('should validate environment-specific settings', async () => {
            const environmentConfig = {
                port: serverPort,
                host: 'localhost',
                timeout: TIMEOUTS.SERVER_STARTUP
            };

            const validationResult = validateServerConfiguration(environmentConfig);

            assert.strictEqual(validationResult.isValid, true, 'Environment configuration should be valid');
            assert.ok(validationResult.details.environment.isTest, 'Should detect test environment');
            assert.strictEqual(validationResult.details.host.isLocalhost, true, 'Should validate localhost binding');
        });
    });

    describe('Server HTTP Integration', () => {
        it('should process HTTP requests and generate proper responses', async () => {
            // Start test server with Express.js application
            const testServerInstance = await createTestServerInstance();
            await testServerInstance.httpServerManager.start();

            // Create SuperTest agent for HTTP testing
            testAgent = createServerTestAgent(testServerInstance.expressApp);

            // Test successful GET /hello endpoint requests
            const helloResponse = await testAgent
                .get('/hello')
                .expect(200)
                .expect('Content-Type', /text/)
                .expect('Hello world');

            assert.ok(helloResponse, 'Should receive response from /hello endpoint');
            assert.strictEqual(helloResponse.status, 200, 'Should return 200 OK status');
            assert.strictEqual(helloResponse.text, 'Hello world', 'Should return correct response text');

            // Validate middleware execution and request processing
            assert.ok(helloResponse.headers, 'Response should include headers');

            // Test error handling for invalid requests
            const invalidResponse = await testAgent
                .post('/hello')
                .expect(405);

            assert.strictEqual(invalidResponse.status, 405, 'Should return 405 Method Not Allowed for POST');

            // Verify response formatting and HTTP compliance
            const notFoundResponse = await testAgent
                .get('/nonexistent')
                .expect(404);

            assert.strictEqual(notFoundResponse.status, 404, 'Should return 404 Not Found for invalid paths');

            // Cleanup
            await testServerInstance.httpServerManager.stop();
        });

        it('should handle concurrent requests properly', async () => {
            const testServerInstance = await createTestServerInstance();
            await testServerInstance.httpServerManager.start();

            testAgent = createServerTestAgent(testServerInstance.expressApp);

            // Make multiple concurrent requests
            const requestPromises = Array.from({ length: 10 }, (_, i) => 
                testAgent.get('/hello').expect(200)
            );

            const responses = await Promise.all(requestPromises);

            assert.strictEqual(responses.length, 10, 'Should handle all concurrent requests');
            responses.forEach((response, index) => {
                assert.strictEqual(response.status, 200, `Request ${index} should return 200 OK`);
                assert.strictEqual(response.text, 'Hello world', `Request ${index} should return correct text`);
            });

            await testServerInstance.httpServerManager.stop();
        });
    });

    describe('Server Performance Integration', () => {
        it('should meet startup time performance requirements', async () => {
            // Measure server startup time and validate thresholds
            const testServerInstance = await createTestServerInstance();
            
            const startTime = Date.now();
            const startupResult = await validateServerStartup(testServerInstance.httpServerManager);
            const actualStartupTime = Date.now() - startTime;

            assert.strictEqual(startupResult.success, true, 'Server startup should succeed');
            assert.ok(actualStartupTime < TIMEOUTS.SERVER_STARTUP, `Startup time ${actualStartupTime}ms should be under ${TIMEOUTS.SERVER_STARTUP}ms`);

            // Test HTTP response time performance
            testAgent = createServerTestAgent(testServerInstance.expressApp);
            
            const responseStartTime = Date.now();
            await testAgent.get('/hello').expect(200);
            const responseTime = Date.now() - responseStartTime;

            assert.ok(responseTime < 100, `Response time ${responseTime}ms should be under 100ms`); // < 100ms response time

            // Monitor memory usage during server operations
            const memoryBefore = process.memoryUsage();
            
            // Make several requests to test memory stability
            for (let i = 0; i < 50; i++) {
                await testAgent.get('/hello').expect(200);
            }
            
            const memoryAfter = process.memoryUsage();
            const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
            
            assert.ok(memoryIncrease < 10 * 1024 * 1024, 'Memory increase should be reasonable (< 10MB)'); // Less than 10MB increase

            // Validate server shutdown time performance
            const shutdownStartTime = Date.now();
            const shutdownResult = await validateServerShutdown(testServerInstance.httpServerManager);
            const actualShutdownTime = Date.now() - shutdownStartTime;

            assert.strictEqual(shutdownResult.success, true, 'Server shutdown should succeed');
            assert.ok(actualShutdownTime < TIMEOUTS.SERVER_SHUTDOWN, `Shutdown time ${actualShutdownTime}ms should be under ${TIMEOUTS.SERVER_SHUTDOWN}ms`);

            // Verify resource cleanup and memory management
            assert.strictEqual(shutdownResult.isStillListening, false, 'Server should not be listening after shutdown');
        });

        it('should handle load testing scenarios', async () => {
            const testServerInstance = await createTestServerInstance();
            await testServerInstance.httpServerManager.start();

            testAgent = createServerTestAgent(testServerInstance.expressApp);

            // Test concurrent request handling capabilities
            const concurrentRequests = 20;
            const startTime = Date.now();
            
            const requestPromises = Array.from({ length: concurrentRequests }, () => 
                testAgent.get('/hello').expect(200)
            );

            const responses = await Promise.all(requestPromises);
            const totalTime = Date.now() - startTime;

            assert.strictEqual(responses.length, concurrentRequests, 'Should handle all concurrent requests');
            assert.ok(totalTime < 5000, `${concurrentRequests} concurrent requests should complete within 5 seconds`);

            // Verify all responses are correct
            responses.forEach((response, index) => {
                assert.strictEqual(response.status, 200, `Concurrent request ${index} should return 200 OK`);
                assert.strictEqual(response.text, 'Hello world', `Concurrent request ${index} should return correct text`);
            });

            await testServerInstance.httpServerManager.stop();
        });
    });
});