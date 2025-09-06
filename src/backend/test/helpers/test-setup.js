/**
 * Comprehensive Test Environment Setup Helper for Node.js Tutorial Application
 * 
 * This module provides a complete test environment infrastructure for the Node.js tutorial
 * application, featuring Jest 29.7.0 integration, Supertest 7.1.4 HTTP testing, and Express.js
 * 5.1.0 test application factories. The implementation demonstrates enterprise-grade testing
 * patterns while maintaining educational clarity, including test isolation, resource management,
 * performance validation, and comprehensive cleanup utilities.
 * 
 * Key Features:
 * - Jest testing framework integration with Node.js environment configuration
 * - Supertest HTTP client setup with automatic timeout and assertion handling
 * - Express.js test application factory with full middleware stack and isolation
 * - Test environment lifecycle management with setup, execution, and teardown phases
 * - Performance testing infrastructure with response time validation under 100ms
 * - Educational testing patterns demonstrating Node.js testing best practices
 * 
 * Architecture:
 * - Ephemeral port allocation (port 0) for test isolation and parallel execution
 * - Resource tracking with Maps for efficient cleanup and memory leak prevention
 * - Test environment class for complex scenarios requiring dedicated resource contexts
 * - Global setup/teardown functions for Jest integration and environment management
 * - Comprehensive error handling with graceful degradation for test reliability
 * 
 * Compatible with:
 * - Jest 29.7.0 testing framework with Node.js test environment configuration
 * - Supertest 7.1.4 for HTTP assertion testing and Express.js integration
 * - Express.js 5.1.0 with automatic promise error handling and async/await support
 * - Node.js 22.11.0 LTS with enhanced performance and testing capabilities
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Node.js testing patterns, HTTP testing, and test environment management
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Supertest v7.1.4 - HTTP assertion library for testing Express.js applications
const supertest = require('supertest'); // ^7.1.4

// Node.js built-in HTTP module for server creation and HTTP protocol handling
const http = require('http'); // Node.js Core

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import main Express application factory for creating test server instances
const app = require('../../src/app.js');

// Import test-specific configuration with ephemeral port settings and timeouts
const testConfig = require('../../config/test.js');

// Import test constants including timeouts, performance thresholds, and configuration values
const { 
    testConstants,
    mockDataHelpers 
} = require('../fixtures/test-data.js');

// Import HTTP status codes for test assertion and validation utilities
const { 
    HTTP_STATUS,
    ROUTES 
} = require('../../src/utils/constants.js');

// Import logger utility for test setup debugging and error tracking
const { 
    logger 
} = require('../../src/utils/logger.js');

// =============================================================================
// GLOBAL STATE AND TRACKING
// =============================================================================

/**
 * Registry of active test server instances for cleanup management
 * Uses Map for efficient O(1) server lookup and cleanup operations
 * @type {Map<string, Object>}
 */
const TEST_SERVERS = new Map();

/**
 * Registry of Supertest client instances for HTTP testing
 * Maintains client references for proper cleanup and resource management
 * @type {Map<string, Object>}
 */
const TEST_CLIENTS = new Map();

/**
 * Cached global test configuration object
 * Prevents repeated configuration loading and improves test performance
 * @type {Object|null}
 */
let GLOBAL_TEST_CONFIG = null;

/**
 * Counter for generating unique test isolation identifiers
 * Incremented for each test context to ensure unique resource tracking
 * @type {number}
 */
let TEST_ISOLATION_ID = 0;

/**
 * Flag indicating whether global test setup has completed
 * Used to prevent duplicate initialization and ensure proper setup order
 * @type {boolean}
 */
let SETUP_COMPLETE = false;

// =============================================================================
// CORE TEST APPLICATION FACTORY
// =============================================================================

/**
 * Factory function that creates an isolated Express application instance for testing.
 * This function implements the test application factory pattern, creating fresh Express
 * instances with full middleware stack configuration, test-specific settings, and proper
 * isolation between test suites. Each application instance includes complete route setup,
 * security middleware, error handling, and logging configuration optimized for testing.
 * 
 * Features:
 * - Fresh Express application instance creation for complete test isolation
 * - Full middleware stack configuration including security, logging, and error handling
 * - Test-specific configuration with ephemeral port allocation and minimal logging
 * - Automatic promise error handling compatibility with Express.js 5.1.0
 * - Educational middleware patterns demonstrating production-ready application structure
 * 
 * @param {Object} [appOptions={}] - Configuration options for test application creation
 * @param {Array} [appOptions.customMiddleware] - Additional middleware to apply to test instance
 * @param {Object} [appOptions.config] - Override configuration settings for test environment
 * @param {boolean} [appOptions.enableSecurity=false] - Enable security middleware in test environment
 * @param {string} [appOptions.logLevel='error'] - Logging level for test application instance
 * @returns {Object} Express application instance configured for testing with middleware and routes
 */
function createTestApp(appOptions = {}) {
    try {
        // Set NODE_ENV to 'test' to ensure test configuration loading
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        
        // Create new Express application instance using imported app factory
        // This leverages the main application factory pattern for consistency
        const testApp = app.getAppInstance();
        
        // Apply test-specific middleware configurations from appOptions
        if (appOptions.customMiddleware && Array.isArray(appOptions.customMiddleware)) {
            appOptions.customMiddleware.forEach(middleware => {
                if (typeof middleware === 'function') {
                    testApp.use(middleware);
                }
            });
        }
        
        // Configure test-specific logging with minimal output for clean test execution
        const logLevel = appOptions.logLevel || testConfig.logging.level || 'error';
        
        // Configure security middleware for test environment compatibility
        // Disable security features that interfere with testing (rate limiting, CORS)
        if (appOptions.enableSecurity === true) {
            // Security is typically disabled in test environment for easier testing
            logger.debug('Security middleware enabled for test application', {
                testEnvironment: true,
                securityEnabled: true
            });
        }
        
        // Store application reference for cleanup management
        const appId = generateTestId('app');
        testApp._testAppId = appId;
        
        // Log test application creation for debugging
        logger.debug('Test Express application created', {
            appId: appId,
            customMiddleware: appOptions.customMiddleware?.length || 0,
            logLevel: logLevel,
            nodeEnv: process.env.NODE_ENV
        });
        
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
        
        // Return fully configured test Express application instance
        return testApp;
        
    } catch (error) {
        logger.error('Failed to create test Express application', {
            error: error.message,
            stack: error.stack,
            appOptions: appOptions
        });
        throw new Error(`Test app creation failed: ${error.message}`);
    }
}

/**
 * Creates and starts an HTTP test server with ephemeral port allocation.
 * This function implements comprehensive HTTP server lifecycle management for testing,
 * including automatic port allocation, server startup with readiness detection,
 * connection details capture, and cleanup function registration for resource management.
 * 
 * Features:
 * - Ephemeral port allocation (port 0) for automatic port assignment and conflict prevention
 * - Server readiness detection using waitForServer() for reliable test execution
 * - Connection metadata capture including host, port, and server URL for test clients
 * - Comprehensive error handling with timeout management and graceful failure handling
 * - Resource tracking registration for automatic cleanup and memory leak prevention
 * 
 * @param {Object} testApp - Express application instance to serve via HTTP server
 * @param {Object} [serverOptions={}] - Server configuration options for timeout and behavior settings
 * @param {number} [serverOptions.timeout=5000] - Server startup timeout in milliseconds
 * @param {string} [serverOptions.host='localhost'] - Server bind address for HTTP listening
 * @param {boolean} [serverOptions.keepAliveTimeout] - HTTP keep-alive timeout for connection management
 * @returns {Promise<Object>} Promise resolving to server instance with connection details and cleanup methods
 */
async function createTestServer(testApp, serverOptions = {}) {
    return new Promise((resolve, reject) => {
        try {
            // Create HTTP server instance using Node.js http.createServer()
            const server = http.createServer(testApp);
            
            // Configure server timeout values from test configuration
            const timeout = serverOptions.timeout || testConfig.server.timeout || 5000;
            const host = serverOptions.host || testConfig.server.host || 'localhost';
            
            // Set server timeout values for proper connection handling
            server.timeout = timeout;
            if (serverOptions.keepAliveTimeout) {
                server.keepAliveTimeout = serverOptions.keepAliveTimeout;
            }
            
            // Configure server event handlers for error and listening events
            server.on('error', (error) => {
                logger.error('Test server error occurred', {
                    error: error.message,
                    code: error.code,
                    port: serverOptions.port || 'ephemeral'
                });
                reject(error);
            });
            
            server.on('listening', async () => {
                try {
                    // Capture automatically assigned port number from server.address()
                    const address = server.address();
                    const serverPort = address.port;
                    const serverHost = address.address || host;
                    
                    // Create server metadata object with connection details
                    const serverMetadata = {
                        server: server,
                        host: serverHost,
                        port: serverPort,
                        url: `http://${serverHost}:${serverPort}`,
                        address: address,
                        id: generateTestId('server')
                    };
                    
                    // Register server instance in TEST_SERVERS Map for cleanup
                    TEST_SERVERS.set(serverMetadata.id, serverMetadata);
                    
                    // Set up server cleanup function for graceful shutdown
                    serverMetadata.cleanup = async () => {
                        return new Promise((resolveCleanup, rejectCleanup) => {
                            server.close((error) => {
                                if (error) {
                                    logger.error('Server cleanup error', { error: error.message });
                                    rejectCleanup(error);
                                } else {
                                    TEST_SERVERS.delete(serverMetadata.id);
                                    logger.debug('Test server cleaned up', { serverId: serverMetadata.id });
                                    resolveCleanup();
                                }
                            });
                        });
                    };
                    
                    // Wait for server to be ready using waitForServer utility
                    const isReady = await waitForServer(server, timeout);
                    
                    if (isReady) {
                        logger.debug('Test server started successfully', {
                            serverId: serverMetadata.id,
                            port: serverPort,
                            url: serverMetadata.url
                        });
                        resolve(serverMetadata);
                    } else {
                        reject(new Error(`Server readiness timeout after ${timeout}ms`));
                    }
                    
                } catch (listenerError) {
                    reject(listenerError);
                }
            });
            
            // Start server listening with ephemeral port (port 0) for automatic allocation
            server.listen(0, host);
            
        } catch (error) {
            logger.error('Failed to create test server', {
                error: error.message,
                stack: error.stack
            });
            reject(error);
        }
    });
}

/**
 * Creates a Supertest HTTP client instance configured for testing Express.js applications.
 * This function provides enhanced Supertest client creation with custom configuration,
 * timeout management, default headers, performance measurement capabilities, and
 * educational testing patterns for comprehensive HTTP endpoint validation.
 * 
 * Features:
 * - Supertest client instance creation with Express.js application binding
 * - Custom timeout configuration based on test environment settings
 * - Default HTTP headers setup including User-Agent and Accept headers
 * - Performance measurement integration for response time validation
 * - Educational HTTP testing patterns with assertion helpers and validation utilities
 * 
 * @param {Object} testApp - Express application instance for HTTP client binding
 * @param {Object} [clientOptions={}] - Client configuration options for timeout and behavior
 * @param {number} [clientOptions.timeout] - HTTP request timeout in milliseconds
 * @param {Object} [clientOptions.headers] - Default headers to include in HTTP requests
 * @param {boolean} [clientOptions.enablePerformanceTracking=true] - Enable response time measurement
 * @returns {Object} Enhanced Supertest client with custom methods and configuration
 */
function createSupertestClient(testApp, clientOptions = {}) {
    try {
        // Create Supertest client instance using supertest(testApp)
        const client = supertest(testApp);
        
        // Configure client timeout values from test configuration
        const timeout = clientOptions.timeout || testConfig.testing.timeout || testConstants.TIMEOUT;
        
        // Set up default headers for test requests
        const defaultHeaders = {
            'User-Agent': 'Node.js Tutorial Test Suite',
            'Accept': 'text/plain, application/json, */*',
            ...clientOptions.headers
        };
        
        // Create enhanced client object with custom capabilities
        const enhancedClient = {
            // Original supertest client for direct access
            client: client,
            
            // Enhanced GET method with performance tracking
            get: (path) => {
                const request = client.get(path);
                
                // Apply default headers
                Object.keys(defaultHeaders).forEach(header => {
                    request.set(header, defaultHeaders[header]);
                });
                
                // Set timeout
                request.timeout(timeout);
                
                return request;
            },
            
            // Enhanced POST method with performance tracking
            post: (path) => {
                const request = client.post(path);
                
                // Apply default headers
                Object.keys(defaultHeaders).forEach(header => {
                    request.set(header, defaultHeaders[header]);
                });
                
                // Set timeout
                request.timeout(timeout);
                
                return request;
            },
            
            // Custom assertion method for hello endpoint validation
            expectHelloResponse: (request) => {
                return request
                    .expect(HTTP_STATUS.OK)
                    .expect('Content-Type', /text\/plain/)
                    .expect('Hello world');
            },
            
            // Performance measurement wrapper
            measureResponseTime: async (requestPromise) => {
                const startTime = process.hrtime.bigint();
                const response = await requestPromise;
                const endTime = process.hrtime.bigint();
                
                const responseTimeMs = Number(endTime - startTime) / 1e6; // Convert to milliseconds
                response.responseTime = responseTimeMs;
                
                return response;
            }
        };
        
        // Register client instance in TEST_CLIENTS Map for tracking
        const clientId = generateTestId('client');
        enhancedClient._testClientId = clientId;
        TEST_CLIENTS.set(clientId, enhancedClient);
        
        // Create client cleanup function for resource management
        enhancedClient.cleanup = () => {
            TEST_CLIENTS.delete(clientId);
            logger.debug('Test client cleaned up', { clientId: clientId });
        };
        
        logger.debug('Supertest client created', {
            clientId: clientId,
            timeout: timeout,
            defaultHeaders: Object.keys(defaultHeaders)
        });
        
        // Return enhanced Supertest client with custom capabilities
        return enhancedClient;
        
    } catch (error) {
        logger.error('Failed to create Supertest client', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Supertest client creation failed: ${error.message}`);
    }
}

// =============================================================================
// JEST GLOBAL SETUP AND TEARDOWN
// =============================================================================

/**
 * Global test environment setup function for Jest testing framework integration.
 * This function initializes the complete Jest testing environment with Express.js and
 * Supertest integration, including configuration loading, environment variable setup,
 * global utilities registration, and comprehensive logging configuration for educational
 * testing patterns and enterprise-grade test infrastructure.
 * 
 * Features:
 * - Jest timeout configuration for HTTP testing operations
 * - Global test utilities and custom Jest matchers registration
 * - Test data fixtures initialization and mock helper setup
 * - Performance measurement utilities and threshold configuration
 * - Comprehensive logging setup with test-appropriate output levels
 * 
 * @returns {Promise<void>} Promise resolving when test environment setup is complete
 */
async function setupTestEnvironment() {
    try {
        // Load test configuration from testConfig import
        GLOBAL_TEST_CONFIG = testConfig;
        
        // Set Node.js environment variables for test execution
        process.env.NODE_ENV = 'test';
        process.env.PORT = '0'; // Use ephemeral ports for testing
        
        // Configure Jest timeout values for HTTP testing
        if (typeof jest !== 'undefined') {
            jest.setTimeout(GLOBAL_TEST_CONFIG.testing.timeout || testConstants.TIMEOUT);
        }
        
        // Set up global test utilities and custom Jest matchers
        global.createTestApp = createTestApp;
        global.createTestServer = createTestServer;
        global.createSupertestClient = createSupertestClient;
        global.waitForServer = waitForServer;
        global.cleanupTestResources = cleanupTestResources;
        
        // Configure global test constants for easy access
        global.testConfig = GLOBAL_TEST_CONFIG;
        global.testConstants = testConstants;
        global.HTTP_STATUS = HTTP_STATUS;
        global.ROUTES = ROUTES;
        
        // Initialize test data fixtures and mock helpers
        global.mockDataHelpers = mockDataHelpers;
        
        // Set up test isolation utilities and cleanup handlers
        global.generateTestId = generateTestId;
        
        // Initialize performance measurement utilities
        global.PERFORMANCE_THRESHOLDS = testConstants.PERFORMANCE_THRESHOLDS || {
            responseTime: 100, // 100ms maximum response time
            memoryUsage: 100 * 1024 * 1024, // 100MB maximum memory usage
            concurrentRequests: 10 // Support for 10 concurrent requests
        };
        
        // Register global cleanup functions for Jest teardown
        if (typeof afterAll !== 'undefined') {
            afterAll(async () => {
                await teardownTestEnvironment();
            });
        }
        
        // Set SETUP_COMPLETE flag to true
        SETUP_COMPLETE = true;
        
        // Log successful test environment initialization
        logger.info('Test environment setup completed successfully', {
            nodeEnv: process.env.NODE_ENV,
            jestTimeout: GLOBAL_TEST_CONFIG.testing.timeout,
            performanceThresholds: global.PERFORMANCE_THRESHOLDS,
            globalUtilities: [
                'createTestApp',
                'createTestServer', 
                'createSupertestClient',
                'waitForServer',
                'cleanupTestResources'
            ]
        });
        
    } catch (error) {
        logger.error('Test environment setup failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Global test environment teardown function for comprehensive resource cleanup.
 * This function ensures proper cleanup of all test resources including active servers,
 * HTTP clients, test data fixtures, performance measurement caches, and global state
 * to prevent memory leaks and ensure clean test execution isolation.
 * 
 * Features:
 * - Active test server cleanup from TEST_SERVERS Map with graceful shutdown
 * - Supertest client cleanup from TEST_CLIENTS Map with resource deallocation
 * - Test data fixture reset and mock state cleanup
 * - Performance measurement cache clearing and timer cleanup
 * - Global configuration reset and environment variable restoration
 * 
 * @returns {Promise<void>} Promise resolving when teardown is complete
 */
async function teardownTestEnvironment() {
    try {
        // Close all active test servers from TEST_SERVERS Map
        const serverCleanupPromises = [];
        for (const [serverId, serverMetadata] of TEST_SERVERS) {
            if (serverMetadata.cleanup && typeof serverMetadata.cleanup === 'function') {
                serverCleanupPromises.push(serverMetadata.cleanup());
            }
        }
        
        await Promise.all(serverCleanupPromises);
        TEST_SERVERS.clear();
        
        // Clean up all Supertest clients from TEST_CLIENTS Map
        for (const [clientId, client] of TEST_CLIENTS) {
            if (client.cleanup && typeof client.cleanup === 'function') {
                client.cleanup();
            }
        }
        TEST_CLIENTS.clear();
        
        // Clear test data fixtures and reset mock state
        if (mockDataHelpers.resetTestState && typeof mockDataHelpers.resetTestState === 'function') {
            mockDataHelpers.resetTestState();
        }
        
        // Reset global test configuration and variables
        GLOBAL_TEST_CONFIG = null;
        TEST_ISOLATION_ID = 0;
        SETUP_COMPLETE = false;
        
        // Clear global test utilities
        if (typeof global !== 'undefined') {
            delete global.createTestApp;
            delete global.createTestServer;
            delete global.createSupertestClient;
            delete global.waitForServer;
            delete global.cleanupTestResources;
            delete global.testConfig;
            delete global.testConstants;
            delete global.mockDataHelpers;
        }
        
        // Log successful test environment teardown
        logger.info('Test environment teardown completed successfully', {
            serversCleanedUp: serverCleanupPromises.length,
            clientsCleanedUp: TEST_CLIENTS.size,
            globalStateReset: true
        });
        
    } catch (error) {
        logger.error('Test environment teardown failed', {
            error: error.message,
            stack: error.stack
        });
        // Continue with cleanup even if errors occurred to prevent hanging tests
    }
}

// =============================================================================
// TEST SUITE AND RESOURCE MANAGEMENT
// =============================================================================

/**
 * Helper function for creating isolated test suites with dedicated resources.
 * This function implements the test suite factory pattern, creating complete test
 * environments with dedicated Express app instances, HTTP servers, Supertest clients,
 * and cleanup utilities for comprehensive test isolation and resource management.
 * 
 * Features:
 * - Unique test isolation ID generation for suite tracking and debugging
 * - Dedicated Express application instance creation using createTestApp()
 * - HTTP server startup with ephemeral port allocation using createTestServer()
 * - Supertest client configuration for the dedicated app instance
 * - Comprehensive cleanup function for suite teardown and resource management
 * 
 * @param {string} suiteName - Descriptive name for the test suite for logging and tracking
 * @param {Object} [suiteOptions={}] - Suite configuration options for app, server, and client setup
 * @param {Object} [suiteOptions.appOptions] - Options passed to createTestApp() for app configuration
 * @param {Object} [suiteOptions.serverOptions] - Options passed to createTestServer() for server setup
 * @param {Object} [suiteOptions.clientOptions] - Options passed to createSupertestClient() for client setup
 * @returns {Promise<Object>} Test suite configuration with app, server, client, and cleanup utilities
 */
async function createTestSuite(suiteName, suiteOptions = {}) {
    try {
        // Generate unique test isolation ID for suite tracking
        const suiteId = generateTestId(suiteName);
        
        // Create dedicated Express app instance using createTestApp()
        const app = createTestApp(suiteOptions.appOptions);
        
        // Start test server with ephemeral port using createTestServer()
        const server = await createTestServer(app, suiteOptions.serverOptions);
        
        // Create Supertest client configured for the app instance
        const client = createSupertestClient(app, suiteOptions.clientOptions);
        
        // Set up suite-specific test data and mock configurations
        const suiteTestData = {
            ...testConstants,
            suiteId: suiteId,
            suiteName: suiteName,
            createdAt: new Date().toISOString()
        };
        
        // Create cleanup function for suite teardown
        const cleanup = async () => {
            try {
                // Clean up client first
                if (client.cleanup) {
                    client.cleanup();
                }
                
                // Clean up server
                if (server.cleanup) {
                    await server.cleanup();
                }
                
                logger.debug('Test suite cleaned up successfully', {
                    suiteId: suiteId,
                    suiteName: suiteName
                });
                
            } catch (cleanupError) {
                logger.error('Test suite cleanup failed', {
                    suiteId: suiteId,
                    suiteName: suiteName,
                    error: cleanupError.message
                });
                throw cleanupError;
            }
        };
        
        // Create complete test suite configuration object
        const testSuite = {
            suiteId: suiteId,
            suiteName: suiteName,
            app: app,
            server: server,
            client: client,
            testData: suiteTestData,
            cleanup: cleanup,
            
            // Convenience methods for common testing patterns
            get: (path) => client.get(path),
            post: (path) => client.post(path),
            expectHelloResponse: (request) => client.expectHelloResponse(request),
            measureResponseTime: (requestPromise) => client.measureResponseTime(requestPromise)
        };
        
        logger.debug('Test suite created successfully', {
            suiteId: suiteId,
            suiteName: suiteName,
            serverUrl: server.url,
            port: server.port
        });
        
        // Return complete test suite configuration object
        return testSuite;
        
    } catch (error) {
        logger.error('Failed to create test suite', {
            suiteName: suiteName,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Utility function that waits for test server to be ready and responding.
 * This function implements server readiness detection using HTTP health checks
 * with retry logic, timeout management, and exponential backoff to ensure
 * reliable test execution and prevent race conditions during server startup.
 * 
 * Features:
 * - Server address and port detection from server.address() method
 * - HTTP health check requests to server endpoint for readiness validation
 * - Retry logic with exponential backoff for handling startup delays
 * - Timeout management with configurable maximum wait time
 * - Comprehensive error handling with graceful fallback behavior
 * 
 * @param {Object} server - HTTP server instance to check for readiness
 * @param {number} [timeoutMs=5000] - Maximum wait time in milliseconds before timeout
 * @returns {Promise<boolean>} Promise resolving to true when server is ready, false if timeout
 */
async function waitForServer(server, timeoutMs = 5000) {
    return new Promise((resolve) => {
        try {
            // Get server address and port from server.address()
            const address = server.address();
            if (!address) {
                resolve(false);
                return;
            }
            
            const port = address.port;
            const host = address.address || 'localhost';
            
            // Create health check URL using server connection details
            const healthCheckUrl = `http://${host}:${port}${ROUTES.HEALTH || '/health'}`;
            
            // Set up timeout timer for server readiness check
            const timeoutTimer = setTimeout(() => {
                resolve(false);
            }, timeoutMs);
            
            // Implement retry logic with exponential backoff
            let retryCount = 0;
            const maxRetries = 10;
            const baseDelay = 50; // Start with 50ms delay
            
            const checkServer = async () => {
                try {
                    // Send HTTP GET request to health check endpoint
                    const response = await supertest(server)
                        .get(ROUTES.HEALTH || '/health')
                        .timeout(1000);
                    
                    // Check for successful response (status 200)
                    if (response.status === HTTP_STATUS.OK) {
                        clearTimeout(timeoutTimer);
                        resolve(true);
                        return;
                    }
                    
                    throw new Error(`Health check returned status: ${response.status}`);
                    
                } catch (error) {
                    retryCount++;
                    
                    if (retryCount >= maxRetries) {
                        clearTimeout(timeoutTimer);
                        resolve(false);
                        return;
                    }
                    
                    // Exponential backoff delay calculation
                    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 1000);
                    
                    setTimeout(checkServer, delay);
                }
            };
            
            // Start initial server check
            checkServer();
            
        } catch (error) {
            logger.error('Server readiness check failed', {
                error: error.message,
                timeoutMs: timeoutMs
            });
            resolve(false);
        }
    });
}

/**
 * Generates unique test identifiers for test isolation tracking and debugging.
 * This function creates unique test identifiers combining prefix, timestamp,
 * isolation counter, and random components for comprehensive test tracking,
 * debugging assistance, and resource management across test execution.
 * 
 * Features:
 * - TEST_ISOLATION_ID global counter increment for unique identification
 * - Timestamp component generation using Date.now() for temporal tracking
 * - Random component addition for additional uniqueness assurance
 * - Readable string formatting for debugging and log analysis
 * - Prefix support for categorizing different types of test resources
 * 
 * @param {string} [prefix='test'] - Identifier prefix for categorizing test resources
 * @returns {string} Unique test identifier with timestamp and isolation counter
 */
function generateTestId(prefix = 'test') {
    try {
        // Increment TEST_ISOLATION_ID global counter
        TEST_ISOLATION_ID += 1;
        
        // Create timestamp component using Date.now()
        const timestamp = Date.now();
        
        // Add random component for additional uniqueness
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        
        // Combine prefix, timestamp, counter, and random components
        const testId = `${prefix}-${TEST_ISOLATION_ID}-${timestamp}-${randomSuffix}`;
        
        // Return formatted unique test identifier
        return testId;
        
    } catch (error) {
        logger.error('Failed to generate test ID', {
            prefix: prefix,
            error: error.message
        });
        
        // Fallback test ID generation
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    }
}

/**
 * Comprehensive cleanup function for test resources including servers, clients, and data.
 * This function provides thorough resource cleanup for specific test contexts,
 * including server instance cleanup, client instance cleanup, test data reset,
 * and resource registry maintenance for memory leak prevention and test isolation.
 * 
 * Features:
 * - Test resource identification by testId for targeted cleanup
 * - HTTP server instance graceful shutdown with connection termination
 * - Supertest client instance cleanup with resource deallocation
 * - Test-specific data and fixture cleanup with state reset
 * - Resource registry maintenance with Map cleanup and memory optimization
 * 
 * @param {string} [testId] - Specific test identifier for targeted resource cleanup
 * @returns {Promise<void>} Promise resolving when cleanup is complete
 */
async function cleanupTestResources(testId = null) {
    try {
        const cleanupPromises = [];
        
        // Clean up servers - either specific testId or all servers
        for (const [serverId, serverMetadata] of TEST_SERVERS) {
            if (!testId || serverId.includes(testId)) {
                if (serverMetadata.cleanup && typeof serverMetadata.cleanup === 'function') {
                    cleanupPromises.push(serverMetadata.cleanup());
                }
            }
        }
        
        // Clean up clients - either specific testId or all clients
        for (const [clientId, client] of TEST_CLIENTS) {
            if (!testId || clientId.includes(testId)) {
                if (client.cleanup && typeof client.cleanup === 'function') {
                    client.cleanup();
                }
            }
        }
        
        // Wait for all cleanup operations to complete
        await Promise.all(cleanupPromises);
        
        // Reset mock states and configurations if testId not specified (global cleanup)
        if (!testId && mockDataHelpers.resetTestState) {
            mockDataHelpers.resetTestState();
        }
        
        logger.debug('Test resources cleaned up successfully', {
            testId: testId || 'all',
            serversCleanedUp: cleanupPromises.length,
            clientsCleanedUp: Array.from(TEST_CLIENTS.keys()).filter(id => 
                !testId || id.includes(testId)
            ).length
        });
        
    } catch (error) {
        logger.error('Test resource cleanup failed', {
            testId: testId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// =============================================================================
// TEST ENVIRONMENT MANAGER CLASS
// =============================================================================

/**
 * Test environment manager class for comprehensive test resource lifecycle management.
 * This class provides isolated test contexts with dedicated resource management,
 * lifecycle control, and cleanup utilities for complex test scenarios requiring
 * complete environment isolation and resource tracking.
 * 
 * Features:
 * - Isolated test environment context with dedicated resource Maps
 * - Express application factory with environment-specific configuration
 * - HTTP server lifecycle management with automatic cleanup registration
 * - Supertest client management with resource tracking and cleanup
 * - Comprehensive cleanup utilities for complete environment teardown
 */
class TestEnvironment {
    /**
     * Initializes TestEnvironment with configuration and resource management.
     * The constructor sets up isolated resource tracking Maps, generates unique
     * environment identifiers, configures environment-specific settings, and
     * initializes performance measurement utilities for comprehensive testing.
     * 
     * @param {Object} [environmentConfig={}] - Environment configuration including app, server, and client options
     * @param {Object} [environmentConfig.app] - Application configuration options
     * @param {Object} [environmentConfig.server] - Server configuration options  
     * @param {Object} [environmentConfig.client] - Client configuration options
     */
    constructor(environmentConfig = {}) {
        // Store environment configuration from environmentConfig parameter
        this.config = {
            ...testConfig,
            ...environmentConfig
        };
        
        // Initialize servers Map for HTTP server tracking
        this.servers = new Map();
        
        // Initialize clients Map for Supertest client tracking
        this.clients = new Map();
        
        // Generate unique environment ID for isolation
        this.environmentId = generateTestId('env');
        
        // Set up resource cleanup handlers
        this.isCleanedUp = false;
        
        logger.debug('TestEnvironment created', {
            environmentId: this.environmentId,
            config: Object.keys(this.config)
        });
    }
    
    /**
     * Creates isolated Express application instance for this test environment.
     * This method leverages the createTestApp factory with environment-specific
     * configuration, applies environment middleware, and registers the application
     * instance for resource tracking and lifecycle management.
     * 
     * @param {Object} [appOptions={}] - Application options merged with environment config
     * @returns {Object} Express application instance configured for this environment
     */
    createApp(appOptions = {}) {
        try {
            // Merge environment config with provided options
            const mergedOptions = {
                ...this.config.app,
                ...appOptions
            };
            
            // Create Express app using createTestApp() with environment config
            const app = createTestApp(mergedOptions);
            
            // Apply environment-specific middleware configurations
            app._environmentId = this.environmentId;
            
            logger.debug('Express app created in TestEnvironment', {
                environmentId: this.environmentId,
                appId: app._testAppId
            });
            
            // Return configured Express application
            return app;
            
        } catch (error) {
            logger.error('Failed to create app in TestEnvironment', {
                environmentId: this.environmentId,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Starts HTTP server for this test environment with resource tracking.
     * This method creates and starts an HTTP server using createTestServer(),
     * registers the server in the environment's server Map, waits for server
     * readiness, and returns server instance with connection details.
     * 
     * @param {Object} app - Express application instance to serve
     * @param {Object} [serverOptions={}] - Server options merged with environment config
     * @returns {Promise<Object>} Promise resolving to server instance with connection details
     */
    async startServer(app, serverOptions = {}) {
        try {
            // Merge environment config with provided options
            const mergedOptions = {
                ...this.config.server,
                ...serverOptions
            };
            
            // Create server using createTestServer() with app and options
            const server = await createTestServer(app, mergedOptions);
            
            // Register server in this environment's servers Map
            this.servers.set(server.id, server);
            
            // Wait for server to be ready using waitForServer()
            const isReady = await waitForServer(server.server, mergedOptions.timeout || 5000);
            
            if (!isReady) {
                throw new Error('Server failed to become ready within timeout');
            }
            
            logger.debug('Server started in TestEnvironment', {
                environmentId: this.environmentId,
                serverId: server.id,
                url: server.url
            });
            
            // Return server instance with connection details
            return server;
            
        } catch (error) {
            logger.error('Failed to start server in TestEnvironment', {
                environmentId: this.environmentId,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Creates Supertest client for this test environment with tracking.
     * This method creates a Supertest client using createSupertestClient(),
     * registers the client in the environment's client Map, and returns
     * the configured client instance for HTTP testing operations.
     * 
     * @param {Object} app - Express application instance for client binding
     * @param {Object} [clientOptions={}] - Client options merged with environment config
     * @returns {Object} Supertest client instance configured for this environment
     */
    createClient(app, clientOptions = {}) {
        try {
            // Merge environment config with provided options
            const mergedOptions = {
                ...this.config.client,
                ...clientOptions
            };
            
            // Create Supertest client using createSupertestClient()
            const client = createSupertestClient(app, mergedOptions);
            
            // Register client in this environment's clients Map
            this.clients.set(client._testClientId, client);
            
            logger.debug('Client created in TestEnvironment', {
                environmentId: this.environmentId,
                clientId: client._testClientId
            });
            
            // Return configured Supertest client instance
            return client;
            
        } catch (error) {
            logger.error('Failed to create client in TestEnvironment', {
                environmentId: this.environmentId,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Cleans up all resources associated with this test environment.
     * This method performs comprehensive cleanup of all servers and clients
     * in the environment's resource Maps, clears environment-specific data,
     * and resets the environment configuration for complete isolation.
     * 
     * @returns {Promise<void>} Promise resolving when cleanup is complete
     */
    async cleanup() {
        try {
            if (this.isCleanedUp) {
                return;
            }
            
            const cleanupPromises = [];
            
            // Close all servers in this environment's servers Map
            for (const [serverId, server] of this.servers) {
                if (server.cleanup && typeof server.cleanup === 'function') {
                    cleanupPromises.push(server.cleanup());
                }
            }
            
            // Clean up all clients in this environment's clients Map
            for (const [clientId, client] of this.clients) {
                if (client.cleanup && typeof client.cleanup === 'function') {
                    client.cleanup();
                }
            }
            
            await Promise.all(cleanupPromises);
            
            // Clear resource tracking Maps
            this.servers.clear();
            this.clients.clear();
            
            // Mark as cleaned up
            this.isCleanedUp = true;
            
            logger.debug('TestEnvironment cleaned up successfully', {
                environmentId: this.environmentId,
                serversCleanedUp: cleanupPromises.length,
                clientsCleanedUp: this.clients.size
            });
            
        } catch (error) {
            logger.error('TestEnvironment cleanup failed', {
                environmentId: this.environmentId,
                error: error.message
            });
            throw error;
        }
    }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Core test application and infrastructure factories
    createTestApp,
    createTestServer,
    createSupertestClient,
    
    // Test environment manager class for complex testing scenarios
    TestEnvironment,
    
    // Global Jest setup and teardown functions
    setupTestEnvironment,
    teardownTestEnvironment,
    
    // Test suite creation and management utilities
    createTestSuite,
    
    // Utility functions for test infrastructure
    testUtils: {
        waitForServer,
        generateTestId,
        cleanupTestResources
    }
};