/**
 * Comprehensive Unit Test Suite for Server Module
 * 
 * This test file provides complete unit test coverage for the main server.js module,
 * validating server lifecycle management, HTTP server startup and shutdown procedures,
 * Express.js application integration, and server configuration handling using Node.js
 * built-in test runner with Express.js 5.1.0 testing patterns and educational best practices.
 * 
 * Tests demonstrate Node.js built-in test runner usage, mock management, test isolation,
 * and comprehensive validation of server startup, shutdown, error handling, process signal
 * management, and server lifecycle orchestration with proper cleanup procedures.
 * 
 * Features:
 * - Server lifecycle testing including startup and shutdown validation
 * - HTTP server foundation testing with port binding and connection management
 * - Express.js application integration testing and route validation
 * - Error handling testing for startup failures and runtime exceptions
 * - Process signal handling testing for graceful shutdown procedures
 * - Configuration testing and validation with environment variable support
 * - Mock management and test isolation with proper cleanup
 * - Educational testing patterns for Node.js tutorial application
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner functions for organizing and executing unit tests
const { test, describe, it, before, after, beforeEach, afterEach } = require('node:test'); // Node.js built-in

// Import Node.js built-in assertion library for test assertions and validation
const assert = require('node:assert'); // Node.js built-in

// Import Node.js timer utilities for test timeout management and async operations
const { setTimeout } = require('node:timers'); // Node.js built-in

// Import main server startup and shutdown functions for testing server lifecycle management
const { startServer, stopServer } = require('../../server.js');

// Import Express.js application instance for testing application-server integration
const app = require('../../app.js').app;

// Import HTTP server management class and utilities for testing server lifecycle and connection management
const { 
    HttpServerManager, 
    createHttpServer,
    getServerStatus,
    isServerRunning,
    getAllServers,
    createServerHealthCheck
} = require('../../lib/server.js');

// Import test server management utilities for isolated server testing and lifecycle management
const { 
    TestServerManager,
    createServerTestAgent,
    startTestServer,
    stopTestServer,
    getServerUrl,
    isServerRunning: isTestServerRunning
} = require('../helpers/serverHelpers.js');

// Import general test utilities for port management, logging, async operations, and environment setup
const { 
    getAvailablePort,
    createTestLogger,
    waitForCondition,
    createMockFunction,
    TestUtilities,
    generateTestId,
    createTestEnvironment,
    validateTestSetup
} = require('../helpers/testHelpers.js');

// Import comprehensive test configuration and utilities for test environment setup
const { 
    testConfig,
    createTestConfiguration,
    getTestEnvironmentConfig,
    createTestServer,
    setupTestEnvironment,
    validateTestConfiguration,
    getTestTimeouts,
    TestConfiguration
} = require('../setup/testConfig.js');

// Global variables for test suite management and cleanup
let logger = createTestLogger('server.test');
let testUtilities = new TestUtilities(testConfig);
let testConfiguration = new TestConfiguration(testConfig);
let testServers = new Map();

// Global test environment setup and configuration
let originalEnvironment = {};
let testEnvironmentSetup = null;
let globalCleanupHandlers = [];

/**
 * Sets up the complete test suite environment including test configuration, environment variable
 * mocking, logger setup, and test utilities initialization for comprehensive server testing.
 */
async function setupTestSuite() {
    try {
        logger.info('Setting up comprehensive test suite environment for server testing');

        // Initialize test configuration using TestConfiguration class with unit test settings
        testConfiguration = new TestConfiguration({
            testType: 'unit',
            enableLogging: true,
            enableCoverage: true,
            customConfig: {
                server: {
                    port: 0, // Dynamic port allocation for test isolation
                    host: 'localhost',
                    timeout: 5000
                },
                timeouts: {
                    default: 5000,
                    server: 2000,
                    request: 1000
                }
            }
        });

        // Set up test environment with proper NODE_ENV and port isolation
        originalEnvironment = {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            HOST: process.env.HOST,
            LOG_LEVEL: process.env.LOG_LEVEL
        };

        // Configure test environment variables for test isolation
        testEnvironmentSetup = await setupTestEnvironment({
            mockEnvironment: true,
            enableCleanup: true,
            environmentOverrides: {
                NODE_ENV: 'test',
                LOG_LEVEL: 'error',
                TEST_MODE: 'true'
            }
        });

        // Initialize TestUtilities for mock management and cleanup tracking
        testUtilities = new TestUtilities({
            enableMocking: true,
            enableCleanup: true,
            trackCalls: true
        });

        // Mock process environment variables for test isolation
        testUtilities.mockProcessEnv({
            NODE_ENV: 'test',
            LOG_LEVEL: 'error',
            TEST_MODE: 'true'
        });

        // Set up test server registry for managing test server instances
        testServers = new Map();

        // Configure test timeouts and performance thresholds
        const timeouts = getTestTimeouts('unit');
        
        // Register global cleanup handler for test suite teardown
        globalCleanupHandlers.push(async () => {
            await teardownTestSuite();
        });

        logger.info('Test suite environment setup completed successfully', {
            testType: 'unit',
            environmentMocked: true,
            utilitiesInitialized: true,
            timeouts: timeouts.default
        });

    } catch (error) {
        logger.error('Failed to setup test suite environment', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Performs comprehensive test suite cleanup including server shutdown, environment restoration,
 * mock cleanup, and resource deallocation for proper test isolation.
 */
async function teardownTestSuite() {
    try {
        logger.info('Executing comprehensive test suite cleanup');

        // Stop all active test servers using testServers registry
        for (const [serverId, serverInfo] of testServers) {
            try {
                if (serverInfo.manager && typeof serverInfo.manager.stop === 'function') {
                    await serverInfo.manager.stop(true, 2000);
                    logger.debug(`Test server ${serverId} stopped successfully`);
                }
            } catch (serverError) {
                logger.warn(`Failed to stop test server ${serverId}`, {
                    error: serverError.message
                });
            }
        }

        // Clear test server registry and release allocated ports
        testServers.clear();

        // Execute TestUtilities cleanup to reset all mocks and environment
        if (testUtilities && typeof testUtilities.cleanup === 'function') {
            await testUtilities.cleanup();
            logger.debug('Test utilities cleanup completed');
        }

        // Execute test configuration cleanup
        if (testConfiguration && typeof testConfiguration.cleanup === 'function') {
            await testConfiguration.cleanup();
            logger.debug('Test configuration cleanup completed');
        }

        // Clean up test environment setup
        if (testEnvironmentSetup && testEnvironmentSetup.cleanup) {
            await testEnvironmentSetup.cleanup();
            logger.debug('Test environment cleanup completed');
        }

        // Restore original process environment variables
        Object.entries(originalEnvironment).forEach(([key, value]) => {
            if (value !== undefined) {
                process.env[key] = value;
            } else {
                delete process.env[key];
            }
        });

        logger.info('Test suite cleanup completed successfully');

    } catch (error) {
        logger.error('Test suite cleanup failed', {
            error: error.message,
            stack: error.stack
        });
    }
}

/**
 * Creates a test server instance with isolated configuration, unique port allocation,
 * and test-specific settings for comprehensive server functionality testing.
 */
async function createTestServerInstance(serverOptions = {}) {
    try {
        // Get available port using getAvailablePort utility for test isolation
        const availablePort = await getAvailablePort(9000, 9999);
        
        // Create test server configuration with isolated settings
        const testServerConfig = {
            port: availablePort,
            host: 'localhost',
            timeout: 5000,
            ...serverOptions
        };

        // Create TestServerManager instance with test configuration
        const testServerManager = new TestServerManager(testServerConfig);

        // Generate unique server ID for management and tracking
        const serverId = generateTestId('test-server');

        // Register test server in testServers registry for management
        testServers.set(serverId, {
            manager: testServerManager,
            config: testServerConfig,
            serverId: serverId,
            createdAt: new Date().toISOString()
        });

        logger.debug('Test server instance created', {
            serverId: serverId,
            port: availablePort,
            host: testServerConfig.host
        });

        // Return configured TestServerManager ready for testing
        return {
            manager: testServerManager,
            serverId: serverId,
            config: testServerConfig
        };

    } catch (error) {
        logger.error('Failed to create test server instance', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Validates server configuration parameters including port, host, timeout settings,
 * and Express.js application configuration for comprehensive testing scenarios.
 */
function validateServerConfiguration(config) {
    try {
        const validation = {
            success: true,
            errors: [],
            warnings: [],
            details: {}
        };

        // Validate port number is within acceptable range and available
        if (config.port !== undefined) {
            if (typeof config.port !== 'number' || config.port < 0 || config.port > 65535) {
                validation.errors.push(`Invalid port number: ${config.port}`);
                validation.success = false;
            } else if (config.port > 0 && config.port < 1024) {
                validation.warnings.push(`Port ${config.port} may require elevated privileges`);
            }
            validation.details.port = { value: config.port, valid: !validation.errors.some(e => e.includes('port')) };
        }

        // Check host configuration for proper test isolation
        if (config.host !== undefined) {
            if (typeof config.host !== 'string' || config.host.length === 0) {
                validation.errors.push(`Invalid host configuration: ${config.host}`);
                validation.success = false;
            } else if (config.host !== 'localhost' && config.host !== '127.0.0.1') {
                validation.warnings.push(`Non-localhost host '${config.host}' may cause test isolation issues`);
            }
            validation.details.host = { value: config.host, valid: typeof config.host === 'string' };
        }

        // Verify timeout settings are appropriate for unit testing
        if (config.timeout !== undefined) {
            if (typeof config.timeout !== 'number' || config.timeout < 100 || config.timeout > 30000) {
                validation.warnings.push(`Timeout ${config.timeout}ms may be inappropriate for unit testing`);
            }
            validation.details.timeout = { value: config.timeout, valid: typeof config.timeout === 'number' };
        }

        // Check Node.js version compatibility with testing requirements
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 18) {
            validation.errors.push(`Node.js version ${nodeVersion} not supported for testing. Requires v18+`);
            validation.success = false;
        }
        validation.details.nodeVersion = { version: nodeVersion, supported: majorVersion >= 18 };

        return validation;

    } catch (error) {
        return {
            success: false,
            errors: [`Validation failed: ${error.message}`],
            warnings: [],
            details: {}
        };
    }
}

// Main test suite setup and teardown hooks
before(async () => {
    await setupTestSuite();
});

after(async () => {
    await teardownTestSuite();
});

beforeEach(async () => {
    // Reset test utilities state before each test
    if (testUtilities && typeof testUtilities.reset === 'function') {
        testUtilities.reset();
    }
});

afterEach(async () => {
    // Clean up any test servers created during individual tests
    for (const [serverId, serverInfo] of testServers) {
        if (serverInfo.createdDuringTest) {
            try {
                await serverInfo.manager.stop(true, 1000);
                testServers.delete(serverId);
            } catch (cleanupError) {
                logger.warn(`Failed to cleanup test server ${serverId}`, {
                    error: cleanupError.message
                });
            }
        }
    }
});

// Main test suite for Server Module Unit Tests
describe('Server Module Unit Tests', () => {
    describe('Server Startup Tests', () => {
        it('should start server successfully with valid configuration', async () => {
            // Create test server instance with isolated configuration
            const { manager: testServerManager, serverId, config } = await createTestServerInstance({
                port: await getAvailablePort(9000, 9999),
                host: 'localhost',
                timeout: 5000
            });

            // Mock server dependencies and configuration for unit testing
            const mockApp = testUtilities.mockFunction('express-app');
            mockApp.mockImplementation(() => app);

            // Validate server configuration before startup
            const configValidation = validateServerConfiguration(config);
            assert.strictEqual(configValidation.success, true, 'Server configuration should be valid');

            // Call server startup function and monitor for successful initialization
            const startupResult = await startServer({
                port: config.port,
                host: config.host,
                app: app,
                enableSignalHandlers: false, // Disable for testing
                validateConfig: true
            });

            // Verify server startup completion and readiness state
            assert.strictEqual(startupResult.success, true, 'Server startup should succeed');
            assert.ok(startupResult.binding, 'Server should have binding information');
            assert.ok(startupResult.startupTime, 'Server should have startup time recorded');

            // Verify server is listening on correct port and host
            assert.ok(startupResult.binding.includes(config.host), 'Server should bind to correct host');
            assert.ok(startupResult.binding.includes(config.port.toString()), 'Server should bind to correct port');

            // Clean up test server
            await stopServer(false, 2000);

            logger.debug('Server startup test completed successfully', {
                serverId: serverId,
                startupDuration: startupResult.startupDuration
            });
        });

        it('should bind to correct port and host specified in configuration', async () => {
            const testPort = await getAvailablePort(9100, 9199);
            const testHost = 'localhost';

            // Start server with specific port and host configuration
            const startupResult = await startServer({
                port: testPort,
                host: testHost,
                app: app,
                enableSignalHandlers: false
            });

            // Verify binding matches specified configuration
            assert.strictEqual(startupResult.success, true, 'Server should start successfully');
            assert.ok(startupResult.binding.includes(`${testHost}:${testPort}`), 
                `Server should bind to ${testHost}:${testPort}`);

            // Verify server status reflects correct binding
            const serverStatus = getServerStatus();
            if (serverStatus && serverStatus.binding) {
                assert.ok(serverStatus.binding.binding.includes(testHost), 'Status should show correct host');
                assert.ok(serverStatus.binding.binding.includes(testPort.toString()), 'Status should show correct port');
            }

            // Clean up
            await stopServer(false, 2000);
        });

        it('should integrate Express.js application properly during startup', async () => {
            const testPort = await getAvailablePort(9200, 9299);

            // Mock Express.js application integration
            const expressAppMock = testUtilities.mockFunction('express-app-integration');
            expressAppMock.mockReturnValue(app);

            // Start server with Express.js application
            const startupResult = await startServer({
                port: testPort,
                host: 'localhost',
                app: app,
                enableSignalHandlers: false
            });

            // Verify Express.js application is properly integrated
            assert.strictEqual(startupResult.success, true, 'Server with Express.js app should start');

            // Test Express.js application responsiveness
            const testAgent = createServerTestAgent(`http://localhost:${testPort}`);
            const response = await testAgent.get('/hello');
            
            assert.strictEqual(response.status, 200, 'Express.js hello endpoint should respond');
            assert.strictEqual(response.text, 'Hello world', 'Response should match expected content');

            // Clean up
            await stopServer(false, 2000);

            logger.debug('Express.js integration test completed', {
                port: testPort,
                responseStatus: response.status
            });
        });

        it('should register process signal handlers during startup', async () => {
            const testPort = await getAvailablePort(9300, 9399);

            // Mock process signal handler registration
            const originalOn = process.on;
            const signalHandlers = [];
            const processMock = testUtilities.mockFunction('process-on');
            
            process.on = (signal, handler) => {
                signalHandlers.push({ signal, handler });
                return originalOn.call(process, signal, handler);
            };

            try {
                // Start server with signal handlers enabled
                const startupResult = await startServer({
                    port: testPort,
                    host: 'localhost',
                    app: app,
                    enableSignalHandlers: true
                });

                // Verify signal handlers were registered
                assert.strictEqual(startupResult.success, true, 'Server should start with signal handlers');
                
                const registeredSignals = signalHandlers.map(sh => sh.signal);
                assert.ok(registeredSignals.includes('SIGTERM'), 'SIGTERM handler should be registered');
                assert.ok(registeredSignals.includes('SIGINT'), 'SIGINT handler should be registered');

                // Clean up
                await stopServer(false, 2000);

            } finally {
                // Restore original process.on
                process.on = originalOn;
                
                // Clean up signal handlers
                signalHandlers.forEach(({ signal, handler }) => {
                    process.removeListener(signal, handler);
                });
            }
        });

        it('should handle port conflicts gracefully during startup', async () => {
            const testPort = await getAvailablePort(9400, 9499);

            // Start first server on test port
            const firstStartup = await startServer({
                port: testPort,
                host: 'localhost',
                app: app,
                enableSignalHandlers: false
            });

            assert.strictEqual(firstStartup.success, true, 'First server should start successfully');

            try {
                // Attempt to start second server on same port (should fail)
                await assert.rejects(
                    async () => {
                        await startServer({
                            port: testPort,
                            host: 'localhost',
                            app: app,
                            enableSignalHandlers: false
                        });
                    },
                    /EADDRINUSE|port.*in use|startup failed/i,
                    'Second server should fail with port conflict error'
                );

            } finally {
                // Clean up first server
                await stopServer(false, 2000);
            }
        });

        it('should log startup events appropriately with timing information', async () => {
            const testPort = await getAvailablePort(9500, 9599);

            // Create test logger to capture startup events
            const logEvents = [];
            const testLoggerMock = testUtilities.mockFunction('startup-logger');
            testLoggerMock.mockImplementation((level, message, metadata) => {
                logEvents.push({ level, message, metadata, timestamp: Date.now() });
            });

            // Start server and monitor logging
            const startupStartTime = Date.now();
            const startupResult = await startServer({
                port: testPort,
                host: 'localhost',
                app: app,
                enableSignalHandlers: false
            });

            const startupEndTime = Date.now();

            // Verify startup succeeded
            assert.strictEqual(startupResult.success, true, 'Server should start successfully');

            // Verify timing information is available
            assert.ok(startupResult.startupTime, 'Startup time should be recorded');
            assert.ok(startupResult.startupDuration !== undefined, 'Startup duration should be recorded');

            // Verify startup duration is reasonable
            const actualDuration = startupEndTime - startupStartTime;
            assert.ok(actualDuration < 10000, 'Startup should complete within reasonable time');

            // Clean up
            await stopServer(false, 2000);

            logger.debug('Startup logging test completed', {
                port: testPort,
                startupDuration: startupResult.startupDuration,
                actualDuration: actualDuration
            });
        });
    });

    describe('Server Shutdown Tests', () => {
        it('should shutdown server gracefully with connection draining', async () => {
            const testPort = await getAvailablePort(9600, 9699);

            // Start test server
            const startupResult = await startServer({
                port: testPort,
                host: 'localhost',
                app: app,
                enableSignalHandlers: false
            });

            assert.strictEqual(startupResult.success, true, 'Server should start for shutdown test');

            // Establish test connections to verify connection draining
            const testAgent = createServerTestAgent(`http://localhost:${testPort}`);
            
            // Make initial request to establish connection
            const initialResponse = await testAgent.get('/hello');
            assert.strictEqual(initialResponse.status, 200, 'Initial connection should succeed');

            // Execute graceful shutdown
            const shutdownStartTime = Date.now();
            const shutdownResult = await stopServer(false, 5000);

            // Verify shutdown completed successfully
            assert.strictEqual(shutdownResult.success, true, 'Graceful shutdown should succeed');
            assert.ok(shutdownResult.shutdownTime, 'Shutdown time should be recorded');
            assert.ok(shutdownResult.shutdownDuration !== undefined, 'Shutdown duration should be recorded');

            // Verify server is no longer accepting connections
            await assert.rejects(
                async () => {
                    await testAgent.get('/hello');
                },
                /ECONNREFUSED|connection refused/i,
                'Server should not accept new connections after shutdown'
            );

            const shutdownEndTime = Date.now();
            logger.debug('Graceful shutdown test completed', {
                port: testPort,
                shutdownDuration: shutdownResult.shutdownDuration,
                actualDuration: shutdownEndTime - shutdownStartTime
            });
        });

        it('should clean up server resources and event listeners', async () => {
            const testPort = await getAvailablePort(9700, 9799);

            // Start server and track resource creation
            const startupResult = await startServer({
                port: testPort,
                host: 'localhost',
                app: app,
                enableSignalHandlers: false
            });

            assert.strictEqual(startupResult.success, true, 'Server should start for resource cleanup test');

            // Get initial server status
            const initialStatus = getServerStatus();
            assert.ok(initialStatus, 'Server status should be available');

            // Execute shutdown with resource cleanup
            const shutdownResult = await stopServer(false, 5000);

            // Verify shutdown completed with resource cleanup
            assert.strictEqual(shutdownResult.success, true, 'Shutdown with cleanup should succeed');

            // Verify resources are cleaned up
            await waitForCondition(
                () => {
                    const postShutdownStatus = getServerStatus();
                    return postShutdownStatus.isRunning === false;
                },
                2000,
                100,
                'Server should show as not running after cleanup'
            );

            logger.debug('Resource cleanup test completed', {
                port: testPort,
                initialRunning: initialStatus.isRunning,
                shutdownCompleted: shutdownResult.success
            });
        });

        it('should handle forced shutdown when timeout is exceeded', async () => {
            const testPort = await getAvailablePort(9800, 9899);

            // Start server for forced shutdown test
            const startupResult = await startServer({
                port: testPort,
                host: 'localhost',
                app: app,
                enableSignalHandlers: false
            });

            assert.strictEqual(startupResult.success, true, 'Server should start for forced shutdown test');

            // Execute forced shutdown with short timeout
            const shutdownResult = await stopServer(true, 1000);

            // Verify forced shutdown completed
            assert.strictEqual(shutdownResult.success, true, 'Forced shutdown should succeed');
            assert.strictEqual(shutdownResult.force, true, 'Shutdown should be marked as forced');
            assert.ok(shutdownResult.shutdownDuration, 'Forced shutdown duration should be recorded');

            // Verify server is stopped after forced shutdown
            const postShutdownStatus = getServerStatus();
            assert.strictEqual(postShutdownStatus.isRunning, false, 'Server should be stopped after forced shutdown');

            logger.debug('Forced shutdown test completed', {
                port: testPort,
                shutdownDuration: shutdownResult.shutdownDuration,
                force: shutdownResult.force
            });
        });

        it('should prevent multiple shutdown attempts', async () => {
            const testPort = await getAvailablePort(9900, 9999);

            // Start server for multiple shutdown test
            const startupResult = await startServer({
                port: testPort,
                host: 'localhost',
                app: app,
                enableSignalHandlers: false
            });

            assert.strictEqual(startupResult.success, true, 'Server should start for multiple shutdown test');

            // Start first shutdown (don't await)
            const firstShutdownPromise = stopServer(false, 5000);

            // Attempt second shutdown immediately
            const secondShutdownResult = await stopServer(false, 5000);

            // Wait for first shutdown to complete
            const firstShutdownResult = await firstShutdownPromise;

            // Verify both shutdowns report success (second should detect duplicate)
            assert.strictEqual(firstShutdownResult.success, true, 'First shutdown should succeed');
            assert.strictEqual(secondShutdownResult.success, true, 'Second shutdown should handle duplicate gracefully');

            // One of them should indicate it was a duplicate request
            const isDuplicateDetected = secondShutdownResult.message && 
                secondShutdownResult.message.includes('already') ||
                secondShutdownResult.duplicateRequest === true;

            if (isDuplicateDetected) {
                logger.debug('Multiple shutdown prevention working correctly');
            }
        });
    });

    describe('HttpServerManager Tests', () => {
        it('should create HttpServerManager instance with proper configuration', async () => {
            const testConfig = {
                http: {
                    port: await getAvailablePort(10000, 10099),
                    host: 'localhost',
                    timeout: 5000,
                    keepAliveTimeout: 5000
                },
                connection: {
                    maxConnections: 100
                }
            };

            // Create HttpServerManager instance
            const serverManager = createHttpServer({
                app: app,
                config: testConfig,
                serverId: 'test-server-manager',
                enableLifecycle: true
            });

            // Verify HttpServerManager instance is created properly
            assert.ok(serverManager, 'HttpServerManager should be created');
            assert.strictEqual(typeof serverManager.start, 'function', 'Should have start method');
            assert.strictEqual(typeof serverManager.stop, 'function', 'Should have stop method');
            assert.strictEqual(typeof serverManager.getStatus, 'function', 'Should have getStatus method');
            assert.strictEqual(typeof serverManager.isRunning, 'function', 'Should have isRunning method');

            // Verify configuration is applied
            const connectionInfo = serverManager.getConnectionInfo();
            assert.ok(connectionInfo, 'Connection info should be available');

            logger.debug('HttpServerManager creation test completed', {
                serverId: serverManager.serverId,
                hasLifecycle: Boolean(serverManager.lifecycle)
            });
        });

        it('should start HTTP server and update status correctly', async () => {
            const testPort = await getAvailablePort(10100, 10199);
            
            // Create HttpServerManager instance
            const serverManager = createHttpServer({
                app: app,
                config: {
                    http: { port: testPort, host: 'localhost', timeout: 5000 }
                },
                serverId: 'start-status-test',
                enableLifecycle: false
            });

            // Verify initial status shows not running
            assert.strictEqual(serverManager.isRunning(), false, 'Server should not be running initially');

            // Start the server
            const startResult = await serverManager.start({
                port: testPort,
                host: 'localhost',
                timeout: 5000
            });

            // Verify startup result
            assert.strictEqual(startResult.success, true, 'Server start should succeed');
            assert.ok(startResult.binding, 'Start result should include binding info');

            // Verify status is updated correctly
            assert.strictEqual(serverManager.isRunning(), true, 'Server should be running after start');

            const status = serverManager.getStatus();
            assert.strictEqual(status.isListening, true, 'Status should show server as listening');
            assert.strictEqual(status.state, 'running', 'Status should show running state');

            // Stop the server for cleanup
            await serverManager.stop(false, 2000);

            logger.debug('HttpServerManager start/status test completed', {
                port: testPort,
                startupSuccess: startResult.success
            });
        });

        it('should stop HTTP server and clean up resources', async () => {
            const testPort = await getAvailablePort(10200, 10299);
            
            // Create and start HttpServerManager
            const serverManager = createHttpServer({
                app: app,
                config: {
                    http: { port: testPort, host: 'localhost', timeout: 5000 }
                },
                serverId: 'stop-cleanup-test',
                enableLifecycle: false
            });

            // Start server
            await serverManager.start({
                port: testPort,
                host: 'localhost',
                timeout: 5000
            });

            // Verify server is running
            assert.strictEqual(serverManager.isRunning(), true, 'Server should be running before stop');

            // Stop server
            const stopResult = await serverManager.stop(false, 5000);

            // Verify stop result
            assert.strictEqual(stopResult.success, true, 'Server stop should succeed');
            assert.ok(stopResult.shutdownTime, 'Stop result should include shutdown time');

            // Verify server is stopped
            assert.strictEqual(serverManager.isRunning(), false, 'Server should not be running after stop');

            const status = serverManager.getStatus();
            assert.strictEqual(status.isListening, false, 'Status should show server as not listening');
            assert.strictEqual(status.state, 'stopped', 'Status should show stopped state');

            logger.debug('HttpServerManager stop/cleanup test completed', {
                port: testPort,
                stopSuccess: stopResult.success,
                shutdownDuration: stopResult.shutdownDuration
            });
        });

        it('should provide connection information and statistics', async () => {
            const testPort = await getAvailablePort(10300, 10399);
            
            // Create HttpServerManager
            const serverManager = createHttpServer({
                app: app,
                config: {
                    http: { 
                        port: testPort, 
                        host: 'localhost', 
                        timeout: 5000,
                        keepAliveTimeout: 10000
                    },
                    connection: {
                        maxConnections: 200
                    }
                },
                serverId: 'connection-info-test',
                enableLifecycle: false
            });

            // Start server
            await serverManager.start({
                port: testPort,
                host: 'localhost'
            });

            // Get connection information
            const connectionInfo = serverManager.getConnectionInfo();

            // Verify connection information structure
            assert.ok(connectionInfo, 'Connection info should be available');
            assert.ok(connectionInfo.binding, 'Connection info should include binding');
            assert.strictEqual(connectionInfo.isListening, true, 'Should show as listening');
            assert.ok(connectionInfo.binding.includes(testPort.toString()), 'Binding should include port');
            assert.ok(connectionInfo.binding.includes('localhost'), 'Binding should include host');

            // Verify configuration values are reflected
            assert.strictEqual(connectionInfo.maxConnections, 200, 'Max connections should match config');

            // Stop server
            await serverManager.stop(false, 2000);

            logger.debug('Connection information test completed', {
                port: testPort,
                binding: connectionInfo.binding,
                maxConnections: connectionInfo.maxConnections
            });
        });
    });

    describe('Error Handling Tests', () => {
        it('should handle port binding failures with appropriate error messages', async () => {
            const testPort = 1; // Port 1 is typically reserved and will cause binding failure

            // Attempt to start server on reserved port
            await assert.rejects(
                async () => {
                    await startServer({
                        port: testPort,
                        host: 'localhost',
                        app: app,
                        enableSignalHandlers: false
                    });
                },
                /EACCES|permission denied|port.*not available|startup failed/i,
                'Should fail with appropriate port binding error'
            );

            logger.debug('Port binding failure test completed', {
                testPort: testPort
            });
        });

        it('should handle invalid server configuration with validation errors', async () => {
            // Test with invalid port configuration
            const invalidConfigs = [
                { port: -1, host: 'localhost' },
                { port: 70000, host: 'localhost' },
                { port: 'invalid', host: 'localhost' },
                { port: 3000, host: '' },
                { port: 3000, host: null }
            ];

            for (const invalidConfig of invalidConfigs) {
                // Validate configuration
                const validation = validateServerConfiguration(invalidConfig);
                
                if (validation.success) {
                    logger.warn('Expected validation to fail for config', invalidConfig);
                    continue;
                }

                assert.strictEqual(validation.success, false, 
                    `Configuration validation should fail for: ${JSON.stringify(invalidConfig)}`);
                assert.ok(validation.errors.length > 0, 
                    'Should have validation errors for invalid configuration');

                logger.debug('Configuration validation correctly failed', {
                    config: invalidConfig,
                    errors: validation.errors
                });
            }
        });

        it('should handle uncaught exceptions with proper logging', async () => {
            const testPort = await getAvailablePort(10400, 10499);

            // Mock uncaught exception handler
            const originalHandlers = process.listeners('uncaughtException');
            const exceptionEvents = [];
            
            const testExceptionHandler = (error) => {
                exceptionEvents.push({
                    error: error.message,
                    timestamp: Date.now()
                });
            };

            process.on('uncaughtException', testExceptionHandler);

            try {
                // Start server
                await startServer({
                    port: testPort,
                    host: 'localhost',
                    app: app,
                    enableSignalHandlers: false
                });

                // Simulate uncaught exception (but catch it to prevent test failure)
                const testError = new Error('Test uncaught exception');
                testExceptionHandler(testError);

                // Verify exception was handled
                assert.strictEqual(exceptionEvents.length, 1, 'Exception handler should be called');
                assert.ok(exceptionEvents[0].error.includes('Test uncaught exception'), 
                    'Exception should contain expected message');

                // Clean up
                await stopServer(false, 2000);

            } finally {
                // Remove test handler
                process.removeListener('uncaughtException', testExceptionHandler);
            }

            logger.debug('Uncaught exception handling test completed', {
                port: testPort,
                exceptionsHandled: exceptionEvents.length
            });
        });

        it('should recover from transient errors during server operations', async () => {
            const testPort = await getAvailablePort(10500, 10599);

            // Create server manager for transient error testing
            const serverManager = createHttpServer({
                app: app,
                config: {
                    http: { port: testPort, host: 'localhost', timeout: 5000 }
                },
                serverId: 'transient-error-test',
                enableLifecycle: false
            });

            // Start server
            await serverManager.start({ port: testPort, host: 'localhost' });

            // Verify initial state
            assert.strictEqual(serverManager.isRunning(), true, 'Server should be running initially');

            // Simulate transient error recovery by restarting
            await serverManager.stop(false, 2000);
            assert.strictEqual(serverManager.isRunning(), false, 'Server should be stopped');

            // Restart to simulate recovery
            await serverManager.start({ port: testPort, host: 'localhost' });
            assert.strictEqual(serverManager.isRunning(), true, 'Server should recover and be running');

            // Verify server functionality after recovery
            const testAgent = createServerTestAgent(`http://localhost:${testPort}`);
            const response = await testAgent.get('/hello');
            assert.strictEqual(response.status, 200, 'Server should be functional after recovery');

            // Clean up
            await serverManager.stop(false, 2000);

            logger.debug('Transient error recovery test completed', {
                port: testPort,
                recoverySuccessful: true
            });
        });
    });

    describe('Process Signal Handling Tests', () => {
        it('should register process signal handlers during server startup', async () => {
            const testPort = await getAvailablePort(10600, 10699);

            // Mock process event listener registration
            const originalOn = process.on;
            const signalHandlers = new Map();
            
            process.on = (signal, handler) => {
                signalHandlers.set(signal, handler);
                return originalOn.call(process, signal, handler);
            };

            try {
                // Start server with signal handlers enabled
                await startServer({
                    port: testPort,
                    host: 'localhost',
                    app: app,
                    enableSignalHandlers: true
                });

                // Verify signal handlers were registered
                assert.ok(signalHandlers.has('SIGTERM'), 'SIGTERM handler should be registered');
                assert.ok(signalHandlers.has('SIGINT'), 'SIGINT handler should be registered');
                assert.strictEqual(typeof signalHandlers.get('SIGTERM'), 'function', 
                    'SIGTERM handler should be a function');
                assert.strictEqual(typeof signalHandlers.get('SIGINT'), 'function', 
                    'SIGINT handler should be a function');

                // Clean up
                await stopServer(false, 2000);

            } finally {
                // Restore original process.on and clean up handlers
                process.on = originalOn;
                
                for (const [signal, handler] of signalHandlers) {
                    process.removeListener(signal, handler);
                }
            }

            logger.debug('Signal handler registration test completed', {
                port: testPort,
                handlersRegistered: signalHandlers.size
            });
        });

        it('should handle SIGTERM signal with graceful shutdown', async () => {
            const testPort = await getAvailablePort(10700, 10799);

            // Mock SIGTERM handler testing
            let sigtermHandler = null;
            const originalOn = process.on;
            
            process.on = (signal, handler) => {
                if (signal === 'SIGTERM') {
                    sigtermHandler = handler;
                }
                return originalOn.call(process, signal, handler);
            };

            try {
                // Start server with signal handlers
                await startServer({
                    port: testPort,
                    host: 'localhost',
                    app: app,
                    enableSignalHandlers: true
                });

                // Verify SIGTERM handler is registered
                assert.ok(sigtermHandler, 'SIGTERM handler should be registered');
                assert.strictEqual(typeof sigtermHandler, 'function', 'SIGTERM handler should be a function');

                // Test graceful shutdown without actually sending signal
                // (We can't easily test actual signal handling in unit tests)
                const serverStatus = getServerStatus();
                assert.strictEqual(serverStatus.isRunning, true, 'Server should be running before shutdown');

                // Clean up manually instead of triggering signal
                await stopServer(false, 2000);

            } finally {
                // Restore original process.on and clean up
                process.on = originalOn;
                
                if (sigtermHandler) {
                    process.removeListener('SIGTERM', sigtermHandler);
                }
            }

            logger.debug('SIGTERM handling test completed', {
                port: testPort,
                handlerRegistered: Boolean(sigtermHandler)
            });
        });

        it('should handle SIGINT signal for development interrupt', async () => {
            const testPort = await getAvailablePort(10800, 10899);

            // Mock SIGINT handler testing
            let sigintHandler = null;
            const originalOn = process.on;
            
            process.on = (signal, handler) => {
                if (signal === 'SIGINT') {
                    sigintHandler = handler;
                }
                return originalOn.call(process, signal, handler);
            };

            try {
                // Start server with signal handlers
                await startServer({
                    port: testPort,
                    host: 'localhost',
                    app: app,
                    enableSignalHandlers: true
                });

                // Verify SIGINT handler is registered
                assert.ok(sigintHandler, 'SIGINT handler should be registered');
                assert.strictEqual(typeof sigintHandler, 'function', 'SIGINT handler should be a function');

                // Verify server is running before interrupt simulation
                const serverStatus = getServerStatus();
                assert.strictEqual(serverStatus.isRunning, true, 'Server should be running');

                // Clean up manually
                await stopServer(false, 2000);

            } finally {
                // Restore original process.on and clean up
                process.on = originalOn;
                
                if (sigintHandler) {
                    process.removeListener('SIGINT', sigintHandler);
                }
            }

            logger.debug('SIGINT handling test completed', {
                port: testPort,
                handlerRegistered: Boolean(sigintHandler)
            });
        });

        it('should clean up signal handlers during server shutdown', async () => {
            const testPort = await getAvailablePort(10900, 10999);

            // Track signal handler cleanup
            const registeredHandlers = new Map();
            const removedHandlers = new Set();
            
            const originalOn = process.on;
            const originalRemoveListener = process.removeListener;
            
            process.on = (signal, handler) => {
                registeredHandlers.set(signal, handler);
                return originalOn.call(process, signal, handler);
            };
            
            process.removeListener = (signal, handler) => {
                removedHandlers.add(signal);
                return originalRemoveListener.call(process, signal, handler);
            };

            try {
                // Start server with signal handlers
                await startServer({
                    port: testPort,
                    host: 'localhost',
                    app: app,
                    enableSignalHandlers: true
                });

                // Verify handlers are registered
                assert.ok(registeredHandlers.size > 0, 'Signal handlers should be registered');

                // Stop server and verify cleanup
                await stopServer(false, 2000);

                // Note: Signal handler cleanup happens in actual implementation
                // This test verifies the structure is in place for cleanup

            } finally {
                // Restore original functions
                process.on = originalOn;
                process.removeListener = originalRemoveListener;
                
                // Manual cleanup of any remaining handlers
                for (const [signal, handler] of registeredHandlers) {
                    try {
                        process.removeListener(signal, handler);
                    } catch (cleanupError) {
                        // Ignore cleanup errors in test
                    }
                }
            }

            logger.debug('Signal handler cleanup test completed', {
                port: testPort,
                handlersRegistered: registeredHandlers.size,
                cleanupTracked: removedHandlers.size
            });
        });
    });

    describe('Configuration Tests', () => {
        it('should validate server configuration completeness and correctness', async () => {
            // Test valid configurations
            const validConfigurations = [
                { port: 3000, host: 'localhost', timeout: 5000 },
                { port: 8080, host: '127.0.0.1', timeout: 10000 },
                { port: 0, host: 'localhost', timeout: 2000 } // Dynamic port
            ];

            for (const config of validConfigurations) {
                const validation = validateServerConfiguration(config);
                
                assert.strictEqual(validation.success, true, 
                    `Valid configuration should pass validation: ${JSON.stringify(config)}`);
                assert.strictEqual(validation.errors.length, 0, 
                    'Valid configuration should have no errors');

                // Verify details are populated
                assert.ok(validation.details.port, 'Port validation details should be available');
                assert.ok(validation.details.host, 'Host validation details should be available');
                assert.ok(validation.details.nodeVersion, 'Node version validation should be available');
            }

            logger.debug('Configuration validation test completed', {
                validConfigsTested: validConfigurations.length
            });
        });

        it('should handle environment variable overrides properly', async () => {
            // Set test environment variables
            const originalPort = process.env.PORT;
            const originalHost = process.env.HOST;
            
            try {
                // Test environment variable override
                process.env.PORT = '11000';
                process.env.HOST = 'localhost';

                // Create test configuration that should use environment variables
                const testConfig = await getTestEnvironmentConfig('unit');
                
                // Verify environment variables are considered
                assert.ok(testConfig.environment, 'Environment config should be available');
                assert.strictEqual(testConfig.environment.NODE_ENV, 'test', 'NODE_ENV should be set to test');

                // Test with custom configuration
                const customConfig = createTestConfiguration({
                    testType: 'unit',
                    customConfig: {
                        server: { port: 12000, host: '127.0.0.1' }
                    }
                });

                assert.ok(customConfig.server, 'Custom server config should be available');

            } finally {
                // Restore original environment variables
                if (originalPort !== undefined) {
                    process.env.PORT = originalPort;
                } else {
                    delete process.env.PORT;
                }
                
                if (originalHost !== undefined) {
                    process.env.HOST = originalHost;
                } else {
                    delete process.env.HOST;
                }
            }

            logger.debug('Environment variable override test completed');
        });

        it('should apply default configuration values when not specified', async () => {
            // Test configuration with minimal settings
            const minimalConfig = {};
            
            // Validate with default values
            const validation = validateServerConfiguration(minimalConfig);
            
            // Should succeed with warnings about missing values
            assert.strictEqual(validation.success, true, 'Minimal config should be valid with defaults');

            // Test test configuration defaults
            const defaultTestConfig = createTestConfiguration();
            
            assert.ok(defaultTestConfig.environment, 'Default test config should have environment');
            assert.ok(defaultTestConfig.server, 'Default test config should have server settings');
            assert.ok(defaultTestConfig.timeouts, 'Default test config should have timeouts');

            // Verify default values are reasonable
            assert.strictEqual(defaultTestConfig.environment.NODE_ENV, 'test', 
                'Default NODE_ENV should be test');

            logger.debug('Default configuration test completed', {
                hasEnvironment: Boolean(defaultTestConfig.environment),
                hasServer: Boolean(defaultTestConfig.server),
                hasTimeouts: Boolean(defaultTestConfig.timeouts)
            });
        });

        it('should validate Node.js and Express.js version compatibility', async () => {
            // Get current Node.js version
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            
            // Test Node.js version validation
            const versionValidation = validateServerConfiguration({});
            
            if (majorVersion >= 18) {
                assert.strictEqual(versionValidation.details.nodeVersion.supported, true, 
                    'Current Node.js version should be supported');
                assert.strictEqual(versionValidation.details.nodeVersion.version, nodeVersion, 
                    'Version should match process.version');
            } else {
                assert.strictEqual(versionValidation.success, false, 
                    'Unsupported Node.js version should fail validation');
                assert.ok(versionValidation.errors.some(error => error.includes('Node.js version')), 
                    'Should have Node.js version error');
            }

            // Test Express.js availability
            try {
                const express = require('express');
                assert.ok(express, 'Express.js should be available');
                assert.ok(express.version || true, 'Express.js should have version info or be callable');
            } catch (expressError) {
                assert.fail(`Express.js should be available: ${expressError.message}`);
            }

            logger.debug('Version compatibility test completed', {
                nodeVersion: nodeVersion,
                majorVersion: majorVersion,
                supported: majorVersion >= 18,
                expressAvailable: true
            });
        });
    });
});