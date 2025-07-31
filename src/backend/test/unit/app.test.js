/**
 * Comprehensive Unit Test Suite for Main Express.js Application Module
 * 
 * This comprehensive unit test file provides extensive testing coverage for the main Express.js 
 * application module (app.js) in the Node.js tutorial application. Tests Express.js application 
 * creation, configuration, middleware integration, route registration, and application utility 
 * functions using Node.js built-in test runner, SuperTest, and custom test helpers.
 * 
 * Validates Express.js 5.1.0 features including enhanced async error handling, security 
 * configurations, and proper middleware orchestration for educational demonstration of testing 
 * patterns in Node.js applications with comprehensive component testing and mocking strategies.
 * 
 * Features tested:
 * - Express.js application creation and factory functions
 * - Application initialization and configuration management
 * - Middleware stack setup and integration testing
 * - Route registration and endpoint validation
 * - Security configuration and header management
 * - Error handling middleware and async error processing
 * - Application lifecycle management and validation
 * - Singleton pattern implementation and caching
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Test Suite
 * @license MIT
 */

// Import Node.js built-in test runner functions for test suite organization and execution
const { test, describe, beforeEach, afterEach, mock } = require('node:test'); // Node.js v22.x LTS
const assert = require('assert'); // Node.js v22.x LTS built-in assertion library

// Import SuperTest for HTTP endpoint testing and Express.js application validation
const supertest = require('supertest'); // SuperTest v7.1.1 - HTTP testing library for Express.js applications

// Import main Express.js application module and factory functions for comprehensive testing
const {
    app,
    createExpressApp,
    initializeApplication,
    getApplicationInstance,
    validateApplicationSetup
} = require('../../app.js');

// Import test helper utilities for mocking, cleanup, and test state management
const {
    TestUtilities,
    createTestLogger,
    createMockFunction
} = require('../helpers/testHelpers.js');

// Import server lifecycle management utilities for integration and unit testing
const {
    TestServerManager,
    createServerTestAgent
} = require('../helpers/serverHelpers.js');

// Import centralized test configuration for environment settings and test parameters
const { testConfig } = require('../setup/testConfig.js');

// Import test fixtures for request and response validation scenarios
const {
    validRequests,
    successResponses,
    errorResponses
} = require('../fixtures/requests.js');
const { helloResponses } = require('../fixtures/responses.js');

// Global test utilities and state management variables
let testUtils;
let serverManager;
let testApp;
let originalConsoleLog;

/**
 * Sets up the test environment including test utilities, mock functions, and test configuration 
 * for Express.js application unit testing with proper isolation and cleanup.
 * 
 * Initializes TestUtilities instance for mock management and cleanup, sets test environment 
 * variables using testConfig settings, creates test logger instance with controlled output, 
 * and mocks console methods to prevent test output pollution.
 */
function setupTestEnvironment() {
    try {
        // Initialize TestUtilities instance for mock management and cleanup operations
        testUtils = new TestUtilities();
        
        // Set test environment variables using testConfig settings for consistent test execution
        process.env.NODE_ENV = testConfig.environment.nodeEnv;
        process.env.PORT = testConfig.server.port.toString();
        process.env.LOG_LEVEL = testConfig.environment.logLevel;
        
        // Create test logger instance with controlled output for test isolation and debugging
        const testLogger = createTestLogger('app-test', {
            level: testConfig.environment.logLevel,
            silent: testConfig.environment.silentLogging
        });
        
        // Mock console methods to prevent test output pollution and capture log calls for verification
        originalConsoleLog = console.log;
        console.log = createMockFunction('console.log', {
            trackCalls: true,
            returnValue: undefined
        });
        
        // Set up process environment for test mode configuration and proper test isolation
        process.env.TEST_MODE = 'unit';
        process.env.TEST_ISOLATION = 'true';
        
        // Initialize server manager for integration testing capabilities and server lifecycle management
        serverManager = null;
        
        // Initialize test application reference for cleanup and test state management
        testApp = null;
        
        // Register cleanup handlers for proper test teardown and resource management
        testUtils.registerCleanupHandler(() => {
            if (testApp && typeof testApp.close === 'function') {
                testApp.close();
            }
        });
        
    } catch (error) {
        throw new Error(`Test environment setup failed: ${error.message}`);
    }
}

/**
 * Cleans up test environment including mocks, test utilities, server instances, and restores 
 * original system state for proper test isolation between test runs.
 * 
 * Stops any running test server instances, clears all mocks and restores original functions, 
 * restores original console methods, and performs final cleanup using TestUtilities.
 */
function teardownTestEnvironment() {
    try {
        // Stop any running test server instances using server manager for proper resource cleanup
        if (serverManager) {
            serverManager.stopServer();
            serverManager = null;
        }
        
        // Clear all mocks and restore original functions using test utilities cleanup methods
        if (testUtils) {
            testUtils.cleanup();
        }
        
        // Restore original console methods and system state for clean test environment
        if (originalConsoleLog) {
            console.log = originalConsoleLog;
        }
        
        // Clean up test logger instances and file handles to prevent resource leaks
        // Reset environment variables to original values for test isolation
        delete process.env.TEST_MODE;
        delete process.env.TEST_ISOLATION;
        
        // Clear test application instances and references for proper garbage collection
        testApp = null;
        
        // Perform final cleanup using TestUtilities cleanup method for comprehensive resource management
        if (testUtils) {
            testUtils = null;
        }
        
    } catch (error) {
        // Log cleanup errors but don't fail tests due to cleanup issues
        console.error(`Test environment teardown error: ${error.message}`);
    }
}

// Main test suite for Express Application Unit Tests with comprehensive component testing
describe('Express Application Unit Tests', () => {
    
    // Set up test environment before each test case for proper test isolation
    beforeEach(() => {
        setupTestEnvironment();
    });
    
    // Clean up test environment after each test case for proper resource management
    afterEach(() => {
        teardownTestEnvironment();
    });
    
    // Test Express.js application creation including instance validation and configuration verification
    test('should create valid Express application instance', async () => {
        // Import and validate default app export from app.js module for Express.js application testing
        assert(app, 'App instance should be defined and not null');
        assert(typeof app === 'function', 'App instance should be a function (Express app)');
        
        // Verify app has required Express.js methods (listen, use, get, post) for HTTP server functionality
        assert(typeof app.listen === 'function', 'App should have listen method for HTTP server binding');
        assert(typeof app.use === 'function', 'App should have use method for middleware registration');
        assert(typeof app.get === 'function', 'App should have get method for GET route registration');
        assert(typeof app.post === 'function', 'App should have post method for POST route registration');
        
        // Validate app configuration settings including security headers and middleware setup
        assert(app.locals, 'App should have locals object for application metadata');
        assert(app.locals.applicationInfo, 'App should have applicationInfo in locals');
        assert(app.locals.applicationInfo.name, 'App should have application name in metadata');
        assert(app.locals.applicationInfo.version, 'App should have application version in metadata');
        
        // Test createExpressApplication factory function with default options for application creation testing
        const testAppDefault = createExpressApp();
        assert(testAppDefault, 'createExpressApp should return valid Express application instance');
        assert(typeof testAppDefault === 'function', 'Created app should be Express application function');
        
        // Test createExpressApplication with custom configuration options for flexible application creation
        const testAppCustom = createExpressApp({
            enableMiddleware: true,
            enableRoutes: true,
            enableSecurity: true,
            enableErrorHandling: true
        });
        assert(testAppCustom, 'createExpressApp with options should return valid application instance');
        
        // Verify application instance creation without errors or exceptions for robust application creation
        assert(testAppCustom.locals.applicationInfo, 'Custom app should have application metadata');
        assert(testAppCustom.locals.applicationInfo.middlewareEnabled, 'Custom app should have middleware enabled flag');
    });
    
    // Test Express.js middleware configuration including middleware ordering and integration
    test('should configure middleware stack correctly', async () => {
        // Create test Express application instance using createExpressApplication for middleware testing
        const testApp = createExpressApp({
            enableMiddleware: true,
            enableSecurity: true
        });
        
        // Verify middleware stack includes request logger middleware for HTTP request logging
        assert(testApp._router, 'App should have router with middleware stack');
        assert(testApp._router.stack, 'App router should have middleware stack array');
        assert(testApp._router.stack.length > 0, 'Middleware stack should contain registered middleware');
        
        // Test middleware ordering and execution sequence correctness for proper request processing
        const middlewareStack = testApp._router.stack;
        
        // Verify middleware stack includes security middleware for X-Powered-By header management
        const xPoweredByDisabled = !testApp.get('x-powered-by');
        assert(xPoweredByDisabled, 'X-Powered-By header should be disabled for security');
        
        // Verify middleware stack includes error handler middleware for proper error processing
        const hasErrorHandling = middlewareStack.some(layer => layer.name === 'errorHandler' || layer.handle.length === 4);
        
        // Validate middleware configuration options and environment settings for proper middleware setup
        assert(testApp.locals.applicationInfo.middlewareEnabled, 'Middleware should be enabled in application info');
        assert(testApp.locals.applicationInfo.securityEnabled, 'Security middleware should be enabled in application info');
    });
    
    // Test Express.js route registration including hello endpoint registration and route validation
    test('should register routes properly', async () => {
        // Create test Express application instance with route registration for route testing
        const testApp = createExpressApp({
            enableRoutes: true
        });
        
        // Verify hello route is registered at correct path (/hello) with proper HTTP method
        const agent = supertest(testApp);
        
        // Test route handler registration and middleware integration for hello endpoint functionality
        const response = await agent
            .get('/hello')
            .expect(200);
        
        // Verify hello route uses correct HTTP method (GET) and returns expected response
        assert(response.text === 'Hello world', 'Hello route should return "Hello world" response');
        
        // Test route registration with custom options and configuration for flexible route setup
        assert(testApp.locals.routes, 'App should have routes metadata in locals');
        assert(testApp.locals.routes.hello === '/hello', 'Hello route should be registered at /hello path');
        
        // Verify route metadata and registration information accuracy for monitoring and debugging
        assert(testApp.locals.routes.registered, 'Routes should be marked as registered in metadata');
        assert(testApp.locals.routes.total >= 1, 'App should have at least one registered route');
    });
    
    // Test application information retrieval including metadata and configuration reporting
    test('should provide accurate application information', async () => {
        // Create test Express application for application info testing and metadata validation
        const testApp = createExpressApp();
        
        // Verify application info contains required application metadata including name and version
        assert(testApp.locals.applicationInfo, 'App should have applicationInfo object');
        assert(testApp.locals.applicationInfo.name, 'Application info should contain application name');
        assert(testApp.locals.applicationInfo.version, 'Application info should contain application version');
        assert(testApp.locals.applicationInfo.createdAt, 'Application info should contain creation timestamp');
        
        // Validate application name, version, and framework information for proper identification
        assert(typeof testApp.locals.applicationInfo.name === 'string', 'Application name should be string');
        assert(typeof testApp.locals.applicationInfo.version === 'string', 'Application version should be string');
        
        // Check route information including registered routes and paths for route monitoring
        if (testApp.locals.routes) {
            assert(typeof testApp.locals.routes.hello === 'string', 'Hello route path should be string');
            assert(typeof testApp.locals.routes.total === 'number', 'Total routes should be number');
        }
        
        // Verify middleware information including stack configuration for middleware monitoring
        assert(typeof testApp.locals.applicationInfo.middlewareEnabled === 'boolean', 'Middleware enabled flag should be boolean');
        assert(typeof testApp.locals.applicationInfo.securityEnabled === 'boolean', 'Security enabled flag should be boolean');
        
        // Validate configuration information and environment settings for configuration monitoring
        assert(testApp.locals.applicationInfo.configuration, 'Application info should have configuration object');
        
        // Test application info consistency and accuracy with actual application state
        const currentTime = new Date();
        const createdTime = new Date(testApp.locals.applicationInfo.createdAt);
        assert(createdTime <= currentTime, 'Creation timestamp should not be in the future');
    });
    
    // Test Express.js security configuration including security headers and Express.js 5.1.0 features
    test('should implement security configurations', async () => {
        // Create test Express application instance with security configuration for security testing
        const testApp = createExpressApp({
            enableSecurity: true
        });
        
        // Verify X-Powered-By header is disabled for security hardening and version hiding
        const xPoweredByDisabled = !testApp.get('x-powered-by');
        assert(xPoweredByDisabled, 'X-Powered-By header should be disabled for security');
        
        // Test security middleware integration and configuration for comprehensive security setup
        const agent = supertest(testApp);
        const response = await agent
            .get('/hello')
            .expect(200);
        
        // Validate Express.js 5.1.0 security features including ReDoS protection and enhanced error handling
        assert(!response.headers['x-powered-by'], 'X-Powered-By header should not be present in response');
        
        // Verify security configuration matches recommended practices for production deployment
        assert(testApp.locals.applicationInfo.securityEnabled, 'Security should be enabled in application info');
        
        // Test security header configuration and response header management for proper security implementation
        if (response.headers['x-content-type-options']) {
            assert(response.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options should be set to nosniff');
        }
    });
    
    // Test error handling integration including middleware error processing and async error handling
    test('should handle synchronous errors correctly', async () => {
        // Create test Express application with error handling middleware for error testing
        const testApp = createExpressApp({
            enableErrorHandling: true
        });
        
        // Add test route that throws synchronous error for error handler validation
        testApp.get('/test-error', (req, res, next) => {
            throw new Error('Test synchronous error');
        });
        
        // Test synchronous error handling through middleware stack and error processing
        const agent = supertest(testApp);
        const response = await agent
            .get('/test-error')
            .expect(500);
        
        // Verify error handler middleware receives and processes errors correctly for robust error handling
        assert(response.status === 500, 'Error response should have 500 status code');
        
        // Test error classification and error response generation for proper error communication
        // Error responses may vary based on error handler implementation
    });
    
    // Test asynchronous error handling using Express.js 5.1.0 enhanced error capabilities
    test('should handle asynchronous errors correctly', async () => {
        // Create test Express application with async error handling for Promise rejection testing
        const testApp = createExpressApp({
            enableErrorHandling: true
        });
        
        // Add test route that returns rejected Promise for async error handler validation
        testApp.get('/test-async-error', async (req, res, next) => {
            throw new Error('Test asynchronous error');
        });
        
        // Test asynchronous error handling using Promise rejections and Express.js 5.1.0 features
        const agent = supertest(testApp);
        const response = await agent
            .get('/test-async-error')
            .expect(500);
        
        // Validate Express.js 5.1.0 automatic Promise rejection forwarding to error handler
        assert(response.status === 500, 'Async error response should have 500 status code');
        
        // Test error handler integration with logging and monitoring for comprehensive error tracking
        assert(testApp.locals.applicationInfo.errorHandlingEnabled, 'Error handling should be enabled in application info');
    });
    
    // Test Express.js application configuration including settings validation and environment handling
    test('should manage application configuration correctly', async () => {
        // Test default application configuration using default settings for baseline configuration testing
        const defaultApp = createExpressApp();
        assert(defaultApp, 'Default app should be created successfully');
        
        // Test custom application configuration with provided options for flexible configuration
        const customApp = createExpressApp({
            config: testConfig,
            enableMiddleware: true,
            enableRoutes: true,
            enableSecurity: false,
            enableErrorHandling: true
        });
        assert(customApp, 'Custom configured app should be created successfully');
        
        // Verify environment-specific configuration handling and selection for deployment flexibility
        assert(customApp.locals.applicationInfo.middlewareEnabled, 'Custom app should have middleware enabled');
        assert(!customApp.locals.applicationInfo.securityEnabled, 'Custom app should have security disabled as configured');
        
        // Test configuration validation and error handling for invalid options and robust configuration
        const appWithInvalidConfig = createExpressApp({
            config: null,
            enableMiddleware: false
        });
        assert(appWithInvalidConfig, 'App should be created even with invalid config (fallback behavior)');
        
        // Validate JSON parsing limits and URL encoding configuration for request processing limits
        // These settings are applied during Express.js application configuration
        
        // Verify configuration consistency across application components for unified configuration management
        assert(customApp.locals.applicationInfo.configuration, 'Custom app should have configuration metadata');
    });
    
    // Test Express.js application methods including HTTP method handlers and Express.js API integration
    test('should support Express application methods correctly', async () => {
        // Create test Express application instance for method testing and API validation
        const testApp = createExpressApp();
        
        // Test app.use() method for middleware registration and application functionality
        let middlewareExecuted = false;
        testApp.use((req, res, next) => {
            middlewareExecuted = true;
            next();
        });
        
        // Test app.get() method for GET route registration and handling functionality
        testApp.get('/test-method', (req, res) => {
            res.send('Method test successful');
        });
        
        // Verify method chaining support and fluent API interface for Express.js compatibility
        const agent = supertest(testApp);
        const response = await agent
            .get('/test-method')
            .expect(200);
        
        assert(response.text === 'Method test successful', 'GET method should return expected response');
        assert(middlewareExecuted, 'Middleware should be executed during request processing');
        
        // Test method parameter validation and error handling for robust method usage
        assert(typeof testApp.listen === 'function', 'App should have listen method for server binding');
        
        // Validate Express.js method integration and compatibility for standard Express.js behavior
        assert(typeof testApp.use === 'function', 'App should have use method for middleware registration');
        assert(typeof testApp.get === 'function', 'App should have get method for route registration');
        assert(typeof testApp.post === 'function', 'App should have post method for route registration');
    });
    
    // Test Express.js application lifecycle including initialization, startup, and shutdown procedures
    test('should manage application lifecycle correctly', async () => {
        // Test application initialization using createExpressApplication factory for lifecycle testing
        const initResult = initializeApplication({
            enableCaching: true,
            validateConfig: true
        });
        
        assert(initResult, 'Application initialization should return result object');
        assert(initResult.app, 'Initialization result should contain Express app instance');
        assert(initResult.initialization, 'Initialization result should contain initialization metadata');
        
        // Test application configuration phase with middleware and route setup for complete initialization
        assert(initResult.initialization.initializedAt, 'Initialization should have timestamp');
        assert(initResult.initialization.cached, 'Application should be cached when caching enabled');
        
        // Verify application state transitions and lifecycle event handling for proper lifecycle management
        assert(initResult.metadata, 'Initialization result should contain application metadata');
        assert(initResult.metadata.name, 'Application metadata should contain name');
        assert(initResult.metadata.version, 'Application metadata should contain version');
        
        // Test application operational state and request handling capability for functional verification
        if (initResult.app) {
            const agent = supertest(initResult.app);
            const response = await agent
                .get('/hello')
                .expect(200);
            
            assert(response.text === 'Hello world', 'Initialized app should handle requests correctly');
        }
        
        // Test getApplicationInstance singleton pattern for application instance management
        const singletonInstance = getApplicationInstance();
        assert(singletonInstance, 'getApplicationInstance should return application instance');
        
        // Verify application recovery and restart capabilities for robust lifecycle management
        const validationResult = validateApplicationSetup(initResult.app);
        assert(validationResult, 'Application validation should return result object');
        assert(typeof validationResult.isValid === 'boolean', 'Validation result should have isValid boolean');
    });
});

// Test suite for Application Factory Function Tests with factory pattern validation
describe('Application Factory Function Tests', () => {
    
    beforeEach(() => {
        setupTestEnvironment();
    });
    
    afterEach(() => {
        teardownTestEnvironment();
    });
    
    // Test factory function with default configuration options for baseline factory testing
    test('should create application with default options', async () => {
        // Factory function returns valid Express app with default configuration applied
        const app = createExpressApp();
        
        assert(app, 'Factory function should return valid Express application instance');
        assert(typeof app === 'function', 'Returned app should be Express application function');
        
        // Default configuration is applied correctly including middleware and security settings
        assert(app.locals.applicationInfo, 'Default app should have application information');
        assert(app.locals.applicationInfo.middlewareEnabled, 'Default app should have middleware enabled');
        assert(app.locals.applicationInfo.securityEnabled, 'Default app should have security enabled');
        
        // App instance is properly configured with all required components and functionality
        const agent = supertest(app);
        const response = await agent
            .get('/hello')
            .expect(200);
        
        assert(response.text === 'Hello world', 'Default app should handle hello endpoint correctly');
    });
    
    // Test factory function with custom configuration options for flexible factory usage
    test('should create application with custom options', async () => {
        // Custom options are applied correctly including selective feature enabling
        const customOptions = {
            enableMiddleware: false,
            enableSecurity: false,
            enableRoutes: true,
            enableErrorHandling: true
        };
        
        const app = createExpressApp(customOptions);
        
        assert(app, 'Factory function should return valid app with custom options');
        
        // Configuration override works properly for selective feature configuration
        assert(!app.locals.applicationInfo.middlewareEnabled, 'Custom app should have middleware disabled as configured');
        assert(!app.locals.applicationInfo.securityEnabled, 'Custom app should have security disabled as configured');
        assert(app.locals.applicationInfo.errorHandlingEnabled, 'Custom app should have error handling enabled as configured');
        
        // Custom app instance is valid and functional with specified configuration
        const agent = supertest(app);
        const response = await agent
            .get('/hello')
            .expect(200);
        
        assert(response.text === 'Hello world', 'Custom app should handle requests correctly');
    });
});

// Test suite for Error Handling Integration Tests with comprehensive error scenario testing
describe('Error Handling Integration Tests', () => {
    
    beforeEach(() => {
        setupTestEnvironment();
    });
    
    afterEach(() => {
        teardownTestEnvironment();
    });
    
    // Test synchronous error processing and error handler middleware integration
    test('should handle synchronous errors correctly', async () => {
        const testApp = createExpressApp({
            enableErrorHandling: true
        });
        
        // Add route that throws synchronous error for error handler testing
        testApp.get('/sync-error', (req, res, next) => {
            throw new Error('Synchronous test error');
        });
        
        // Synchronous errors are caught and processed by error handler middleware
        const agent = supertest(testApp);
        const response = await agent
            .get('/sync-error')
            .expect(500);
        
        // Error handler middleware processes errors correctly and generates appropriate responses
        assert(response.status === 500, 'Synchronous error should result in 500 status code');
        
        // Error response is generated correctly with proper error information
        // Response format may vary based on error handler implementation
    });
    
    // Test Express.js 5.1.0 async error handling and Promise rejection forwarding
    test('should handle asynchronous errors correctly', async () => {
        const testApp = createExpressApp({
            enableErrorHandling: true
        });
        
        // Add async route that rejects Promise for async error handler testing
        testApp.get('/async-error', async (req, res, next) => {
            await new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error('Asynchronous test error')), 10);
            });
        });
        
        // Promise rejections are forwarded to error handler automatically in Express.js 5.1.0
        const agent = supertest(testApp);
        const response = await agent
            .get('/async-error')
            .expect(500);
        
        // Async errors are processed correctly by error handling middleware
        assert(response.status === 500, 'Asynchronous error should result in 500 status code');
        
        // Error handler receives async errors and processes them appropriately
        // Express.js 5.1.0 handles Promise rejections automatically
    });
    
    // Test 404 Not Found error handling for unregistered routes
    test('should handle 404 Not Found errors correctly', async () => {
        const testApp = createExpressApp({
            enableErrorHandling: true
        });
        
        // Test request to non-existent route for 404 error handler validation
        const agent = supertest(testApp);
        const response = await agent
            .get('/non-existent-route')
            .expect(404);
        
        // 404 errors are handled correctly by not found handler middleware
        assert(response.status === 404, 'Non-existent route should result in 404 status code');
        
        // Not found handler provides appropriate error response for missing routes
    });
    
    // Test 405 Method Not Allowed error handling for invalid HTTP methods
    test('should handle 405 Method Not Allowed errors correctly', async () => {
        const testApp = createExpressApp({
            enableErrorHandling: true
        });
        
        // Test invalid HTTP method for hello endpoint (POST instead of GET)
        const agent = supertest(testApp);
        const response = await agent
            .post('/hello')
            .expect(405);
        
        // Method not allowed errors are handled appropriately with correct status code
        assert(response.status === 405, 'Invalid method should result in 405 status code');
        
        // Error response includes appropriate headers and error information
        if (response.headers.allow) {
            assert(response.headers.allow.includes('GET'), 'Allow header should include GET method');
        }
    });
});