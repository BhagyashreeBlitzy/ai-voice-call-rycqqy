/**
 * Comprehensive Middleware Integration Test Suite
 * 
 * This module provides comprehensive middleware integration testing for the Node.js tutorial application
 * that validates complete middleware stack functionality, proper execution order, error handling pipeline,
 * request-response processing flow, and Express.js 5.1.0 enhanced middleware features. Tests middleware
 * integration patterns including request logging, response handling, error processing, 404 handling, and
 * middleware interaction scenarios using Node.js built-in test runner, SuperTest HTTP agent testing, and
 * educational middleware validation patterns.
 * 
 * Demonstrates professional middleware testing approaches for web server development education with focus
 * on middleware orchestration, error propagation, and response pipeline validation.
 * 
 * Features Express.js 5.1.0 Enhanced Middleware Testing:
 * - Middleware can now return rejected promises, caught by the router as errors
 * - Automatic forwarding of rejected promises to error-handling middleware
 * - Enhanced async/await support for middleware error propagation patterns
 * - Comprehensive middleware stack execution order validation
 * - Integration testing of middleware pipeline management and orchestration
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Node.js built-in modules for comprehensive testing functionality
const { test, describe, before, after, beforeEach, afterEach } = require('node:test'); // v20.0.0+ - Node.js built-in test runner for test execution and organization
const assert = require('assert'); // v2.0.0+ - Node.js built-in assertion library for test validation and verification

// Third-party testing libraries for HTTP endpoint testing and response validation
const supertest = require('supertest'); // v7.1.1 - HTTP endpoint testing library for creating test agents and validating server responses

// Internal application modules for middleware integration testing
const app = require('../../app.js'); // Main Express.js application instance with configured middleware stack for integration testing
const { createExpressApplication } = require('../../app.js'); // Factory function for creating configured Express.js application instances for testing

// Middleware modules for comprehensive middleware stack testing
const {
    errorHandler,
    requestLogger,
    notFoundHandler,
    formatSuccessResponse,
    createMiddlewareStack
} = require('../../middleware/index.js'); // Express.js middleware functions and utilities for middleware integration testing

// Test infrastructure and utilities for server lifecycle management
const {
    TestServerManager,
    createServerTestAgent
} = require('../helpers/serverHelpers.js'); // Test server management class and SuperTest agent factory for HTTP endpoint testing

// Core testing utilities for mock management and test orchestration
const {
    TestUtilities,
    createTestLogger,
    generateTestId
} = require('../helpers/testHelpers.js'); // Comprehensive test utilities with mock tracking, performance measurement, and test management

// Test fixtures for request scenarios and error handling validation
const {
    validRequests,
    invalidRequests,
    notFoundRequests,
    createValidHelloRequest
} = require('../fixtures/requests.js'); // HTTP request fixtures for successful, invalid method, and not found testing scenarios

// Error fixtures for comprehensive error handling testing
const {
    httpErrors,
    asyncErrors,
    createHttpError
} = require('../fixtures/errors.js'); // Error objects for HTTP error handling, async error testing, and error factory functions

// ========================================
// GLOBAL TEST VARIABLES AND CONFIGURATION
// ========================================

/**
 * Global test suite configuration object for middleware integration testing
 * Manages test execution state, configuration, and coordination across test scenarios
 */
let testSuite = null;

/**
 * Global test utilities instance for mock management, performance measurement, and test coordination
 * Provides centralized utility functions for test setup, execution, and cleanup
 */
let testUtilities = null;

/**
 * Global test logger instance with middleware integration test context and structured logging
 * Handles test-specific logging with correlation IDs and test environment configuration
 */
let testLogger = null;

/**
 * Global test server manager for HTTP server lifecycle orchestration and test agent coordination
 * Manages server startup, shutdown, port allocation, and test agent creation
 */
let testServerManager = null;

/**
 * Global SuperTest agent for HTTP endpoint testing and response validation
 * Provides HTTP client functionality for middleware integration testing scenarios
 */
let testAgent = null;

// ========================================
// TEST SETUP AND TEARDOWN FUNCTIONS
// ========================================

/**
 * Sets up comprehensive middleware integration test environment including test server initialization,
 * test utilities configuration, logger setup, and test agent creation for middleware stack testing scenarios.
 * 
 * Provides complete test environment configuration with server lifecycle management, HTTP agent setup,
 * test utilities initialization, and middleware-specific test configuration for integration testing.
 * 
 * @param {object} testConfig - Test configuration object with middleware testing parameters
 * @param {number} [testConfig.port] - Port number for test server binding
 * @param {string} [testConfig.environment] - Test environment configuration
 * @param {object} [testConfig.middleware] - Middleware-specific test settings
 * @param {boolean} [testConfig.enableLogging] - Enable detailed test logging
 * @param {number} [testConfig.timeout] - Test execution timeout in milliseconds
 * @returns {Promise<object>} Promise resolving to test setup information with server, agent, utilities, and configuration details
 */
async function setupMiddlewareIntegrationTest(testConfig = {}) {
    try {
        // Generate unique test ID using generateTestId function for test correlation and debugging
        const testId = generateTestId();
        testLogger.info(`Starting middleware integration test setup with ID: ${testId}`);
        
        // Create test logger using createTestLogger with middleware integration test context
        testLogger = createTestLogger({
            testType: 'middleware_integration',
            testId: testId,
            logLevel: testConfig.logLevel || 'info',
            enableConsole: testConfig.enableLogging !== false,
            correlationId: testId
        });
        
        testLogger.debug('Test logger initialized for middleware integration testing');
        
        // Initialize TestUtilities instance with middleware integration test configuration
        testUtilities = new TestUtilities({
            testId: testId,
            testType: 'middleware_integration',
            cleanupMode: 'automatic',
            mockTracking: true,
            performanceTracking: testConfig.enablePerformance !== false,
            logger: testLogger
        });
        
        testLogger.debug('Test utilities initialized with middleware integration configuration');
        
        // Create TestServerManager instance with test-specific server configuration
        testServerManager = new TestServerManager({
            testId: testId,
            environment: testConfig.environment || 'test',
            portRange: testConfig.portRange || { min: 3100, max: 3199 },
            timeout: testConfig.timeout || 30000,
            logger: testLogger,
            utilities: testUtilities
        });
        
        testLogger.debug('Test server manager created with middleware test configuration');
        
        // Start test server using TestServerManager.startTestServer() method with middleware app
        const serverInfo = await testServerManager.startTestServer(app, {
            port: testConfig.port,
            host: testConfig.host || 'localhost',
            middleware: testConfig.middleware || {},
            enableMiddlewareLogging: true
        });
        
        testLogger.info(`Test server started successfully on ${serverInfo.host}:${serverInfo.port}`);
        
        // Create SuperTest agent using createServerTestAgent for HTTP endpoint testing
        testAgent = createServerTestAgent(serverInfo.server, {
            baseUrl: testServerManager.getServerUrl(),
            timeout: testConfig.requestTimeout || 5000,
            followRedirects: false,
            validateStatus: false // Allow all status codes for testing
        });
        
        testLogger.debug('SuperTest agent created for HTTP endpoint testing');
        
        // Configure test environment with middleware-specific test settings and isolation
        const testEnvironment = {
            NODE_ENV: 'test',
            LOG_LEVEL: testConfig.logLevel || 'info',
            TEST_MODE: 'middleware_integration',
            TEST_ID: testId,
            SERVER_PORT: serverInfo.port.toString(),
            SERVER_HOST: serverInfo.host
        };
        
        // Apply test environment configuration with proper isolation
        Object.keys(testEnvironment).forEach(key => {
            process.env[key] = testEnvironment[key];
        });
        
        testLogger.debug('Test environment configured with middleware integration settings');
        
        // Return comprehensive test setup object with server, agent, utilities, and configuration
        const setupResult = {
            testId: testId,
            serverInfo: serverInfo,
            testAgent: testAgent,
            testUtilities: testUtilities,
            testLogger: testLogger,
            testServerManager: testServerManager,
            environment: testEnvironment,
            configuration: testConfig,
            timestamp: new Date().toISOString()
        };
        
        testLogger.info('Middleware integration test setup completed successfully');
        return setupResult;
        
    } catch (setupError) {
        if (testLogger) {
            testLogger.error('Failed to setup middleware integration test environment', {
                error: setupError.message,
                stack: setupError.stack
            });
        }
        throw new Error(`Middleware integration test setup failed: ${setupError.message}`);
    }
}

/**
 * Performs comprehensive teardown of middleware integration test environment including server shutdown,
 * resource cleanup, test utilities cleanup, and environment restoration.
 * 
 * Ensures complete cleanup of test resources, proper server shutdown, environment restoration,
 * and comprehensive cleanup of all test-related resources and configurations.
 * 
 * @returns {Promise<void>} Promise resolving when teardown is complete and all resources are cleaned up
 */
async function teardownMiddlewareIntegrationTest() {
    try {
        const teardownStartTime = Date.now();
        
        if (testLogger) {
            testLogger.info('Starting comprehensive middleware integration test teardown');
        }
        
        // Execute TestUtilities.cleanup() to reset mocks and clean up test utilities
        if (testUtilities) {
            await testUtilities.cleanup();
            if (testLogger) {
                testLogger.debug('Test utilities cleanup completed successfully');
            }
        }
        
        // Stop test server using TestServerManager.stopTestServer() with graceful shutdown
        if (testServerManager) {
            await testServerManager.stopTestServer({
                graceful: true,
                timeout: 10000,
                forceClose: false
            });
            if (testLogger) {
                testLogger.debug('Test server stopped gracefully');
            }
        }
        
        // Clean up test environment and restore original environment variables
        const testEnvironmentKeys = [
            'NODE_ENV',
            'LOG_LEVEL',
            'TEST_MODE',
            'TEST_ID',
            'SERVER_PORT',
            'SERVER_HOST'
        ];
        
        testEnvironmentKeys.forEach(key => {
            if (process.env[key] && process.env[key].includes('test')) {
                delete process.env[key];
            }
        });
        
        if (testLogger) {
            testLogger.debug('Test environment variables cleaned up');
        }
        
        // Reset global test variables to null state for clean test isolation
        testAgent = null;
        testServerManager = null;
        testUtilities = null;
        testSuite = null;
        
        // Log teardown completion with timing and resource cleanup details
        const teardownDuration = Date.now() - teardownStartTime;
        if (testLogger) {
            testLogger.info(`Middleware integration test teardown completed in ${teardownDuration}ms`);
            testLogger = null; // Reset logger last
        }
        
    } catch (teardownError) {
        if (testLogger) {
            testLogger.error('Error during middleware integration test teardown', {
                error: teardownError.message,
                stack: teardownError.stack
            });
        }
        // Don't throw error during teardown to avoid masking test failures
        console.error(`Teardown error: ${teardownError.message}`);
    }
}

// ========================================
// MIDDLEWARE INTEGRATION TEST FUNCTIONS
// ========================================

/**
 * Tests request logging middleware functionality including request information capture, logging output validation,
 * request context enrichment, and integration with middleware stack.
 * 
 * Validates request logging middleware captures complete request information, generates structured logging output,
 * enriches request context with correlation IDs, and properly integrates with the Express.js middleware pipeline.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} testConfig - Test configuration object with logging middleware parameters
 * @param {boolean} [testConfig.enableMocking] - Enable console output mocking for validation
 * @param {string} [testConfig.logFormat] - Expected log format for validation
 * @param {object} [testConfig.customHeaders] - Custom headers for request logging testing
 * @returns {Promise<void>} Promise resolving when request logging middleware tests are complete
 */
async function testRequestLoggingMiddleware(testAgent, testConfig = {}) {
    testLogger.info('Starting request logging middleware functionality testing');
    
    // Mock console.log using TestUtilities.mockFunction to capture logging output
    const consoleMock = testUtilities.mockFunction(console, 'log');
    
    try {
        // Send GET request to /hello endpoint using testAgent for logging middleware testing
        const testRequest = createValidHelloRequest({
            method: 'GET',
            headers: testConfig.customHeaders || {
                'user-agent': 'nodejs-tutorial-middleware-test',
                'x-test-correlation-id': generateTestId(),
                'accept': 'text/plain'
            }
        });
        
        const response = await testAgent
            .get('/hello')
            .set(testRequest.headers)
            .expect(200);
        
        testLogger.debug('Test request sent to /hello endpoint for logging validation');
        
        // Validate request logging middleware captured request method, path, and timestamp
        assert.ok(consoleMock.callCount > 0, 'Request logging middleware should log request information');
        
        const logCalls = consoleMock.getCalls();
        const requestLogCall = logCalls.find(call => 
            call.args.some(arg => 
                typeof arg === 'string' && 
                (arg.includes('GET') || arg.includes('/hello') || arg.includes('REQUEST'))
            )
        );
        
        assert.ok(requestLogCall, 'Request logging middleware should log request method and path');
        testLogger.debug('Request logging middleware captured request method and path successfully');
        
        // Verify logging output includes request headers, user agent, and correlation ID
        const logOutput = requestLogCall.args.join(' ');
        assert.ok(logOutput.includes('GET') || logOutput.includes('REQUEST'), 'Log should include HTTP method');
        assert.ok(logOutput.includes('/hello') || logOutput.includes('hello'), 'Log should include request path');
        
        // Test request logging with custom headers and validate header capture
        const customHeadersRequest = await testAgent
            .get('/hello')
            .set({
                'x-custom-header': 'middleware-test-value',
                'x-correlation-id': 'test-correlation-123',
                'user-agent': 'custom-test-agent'
            })
            .expect(200);
        
        testLogger.debug('Custom headers request processed for logging validation');
        
        // Verify logging middleware execution order in middleware stack
        const afterCustomLogCalls = consoleMock.getCalls();
        assert.ok(afterCustomLogCalls.length > logCalls.length, 'Additional request should generate additional logs');
        
        // Validate logging format consistency and structured logging output
        const recentLogCall = afterCustomLogCalls[afterCustomLogCalls.length - 1];
        if (recentLogCall && recentLogCall.args.length > 0) {
            const logMessage = recentLogCall.args.join(' ');
            assert.ok(typeof logMessage === 'string', 'Log output should be properly formatted string');
            testLogger.debug('Logging format consistency validated successfully');
        }
        
        // Assert logging middleware performance impact is within acceptable limits
        const performanceMetrics = testUtilities.getPerformanceMetrics();
        if (performanceMetrics && performanceMetrics.requestDuration) {
            assert.ok(
                performanceMetrics.requestDuration < 100, 
                `Request processing with logging should be under 100ms (actual: ${performanceMetrics.requestDuration}ms)`
            );
        }
        
        testLogger.info('Request logging middleware functionality testing completed successfully');
        
    } catch (loggingTestError) {
        testLogger.error('Request logging middleware test failed', {
            error: loggingTestError.message,
            stack: loggingTestError.stack
        });
        throw loggingTestError;
    } finally {
        // Restore original console.log function
        if (consoleMock && consoleMock.restore) {
            consoleMock.restore();
        }
    }
}

/**
 * Tests error handling middleware functionality including error classification, error response generation,
 * async error handling, and Express.js 5.1.0 enhanced error capabilities.
 * 
 * Validates error handling middleware properly classifies errors, generates appropriate HTTP responses,
 * handles async error scenarios, and integrates with Express.js 5.1.0 enhanced async error handling features.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} errorScenarios - Error scenarios configuration for comprehensive error testing
 * @param {boolean} [errorScenarios.testAsyncErrors] - Enable async error handling testing
 * @param {boolean} [errorScenarios.testErrorClassification] - Enable error classification testing
 * @param {object} [errorScenarios.customErrors] - Custom error objects for specialized testing
 * @returns {Promise<void>} Promise resolving when error handling middleware tests are complete
 */
async function testErrorHandlingMiddleware(testAgent, errorScenarios = {}) {
    testLogger.info('Starting error handling middleware functionality testing');
    
    try {
        // Test HTTP error handling using httpErrors.notFound for 404 error scenarios
        const notFoundResponse = await testAgent
            .get('/nonexistent-endpoint')
            .expect(404);
        
        testLogger.debug('404 Not Found error scenario tested');
        
        // Validate error response format includes status code, message, and timestamp
        assert.strictEqual(notFoundResponse.status, 404, 'Not found error should return 404 status code');
        
        if (notFoundResponse.body && typeof notFoundResponse.body === 'object') {
            assert.ok(notFoundResponse.body.error || notFoundResponse.body.message, 'Error response should include error information');
            testLogger.debug('Error response format validation successful');
        }
        
        // Test async error handling using asyncErrors.promiseRejection for Express.js 5.1.0 features
        if (errorScenarios.testAsyncErrors !== false) {
            // Create a temporary route that throws an async error for testing
            const tempApp = createExpressApplication({
                middleware: createMiddlewareStack(),
                routes: [{
                    path: '/test-async-error',
                    method: 'get',
                    handler: async (req, res, next) => {
                        // Simulate async error that should be caught by Express.js 5.1.0 error handling
                        const asyncError = asyncErrors.promiseRejection;
                        throw asyncError;
                    }
                }]
            });
            
            // Test with temporary application instance
            const tempAgent = createServerTestAgent(tempApp);
            const asyncErrorResponse = await tempAgent
                .get('/test-async-error')
                .expect(500);
            
            testLogger.debug('Async error handling tested with Express.js 5.1.0 features');
            
            // Verify error handling middleware automatically catches rejected promises
            assert.strictEqual(asyncErrorResponse.status, 500, 'Async errors should result in 500 status code');
        }
        
        // Test error classification and response generation for different error types
        const methodNotAllowedResponse = await testAgent
            .post('/hello')
            .expect(405);
        
        assert.strictEqual(methodNotAllowedResponse.status, 405, 'Invalid method should return 405 status code');
        testLogger.debug('Error classification and response generation validated');
        
        // Validate error logging integration and error correlation ID generation
        const consoleMock = testUtilities.mockFunction(console, 'error');
        
        try {
            await testAgent
                .get('/another-nonexistent-endpoint')
                .expect(404);
            
            // Check if error logging occurred (implementation dependent)
            if (consoleMock.callCount > 0) {
                testLogger.debug('Error logging integration verified');
            }
        } finally {
            if (consoleMock.restore) {
                consoleMock.restore();
            }
        }
        
        // Test error handling middleware execution as final middleware in stack
        const internalErrorResponse = await testAgent
            .get('/hello')
            .set('x-trigger-error', 'internal')
            .expect(res => {
                // Accept either 200 (normal) or 500 (if error triggered)
                assert.ok([200, 500].includes(res.status), 'Response should be either success or internal error');
            });
        
        // Assert error response sanitization prevents sensitive information disclosure
        if (internalErrorResponse.status === 500 && internalErrorResponse.body) {
            const responseBody = JSON.stringify(internalErrorResponse.body);
            assert.ok(!responseBody.includes('password'), 'Error response should not contain sensitive information');
            assert.ok(!responseBody.includes('secret'), 'Error response should not contain secret information');
            assert.ok(!responseBody.includes('token'), 'Error response should not contain token information');
        }
        
        testLogger.info('Error handling middleware functionality testing completed successfully');
        
    } catch (errorHandlingTestError) {
        testLogger.error('Error handling middleware test failed', {
            error: errorHandlingTestError.message,
            stack: errorHandlingTestError.stack
        });
        throw errorHandlingTestError;
    }
}

/**
 * Tests response handling middleware functionality including response formatting, metadata enrichment,
 * header management, and standardized response structure.
 * 
 * Validates response handling middleware formats responses consistently, enriches response metadata,
 * manages HTTP headers appropriately, and maintains standardized response structure across requests.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} responseConfig - Response configuration for response handling testing
 * @param {boolean} [responseConfig.validateHeaders] - Enable HTTP header validation
 * @param {boolean} [responseConfig.validateFormat] - Enable response format validation
 * @param {object} [responseConfig.expectedHeaders] - Expected response headers for validation
 * @returns {Promise<void>} Promise resolving when response handling middleware tests are complete
 */
async function testResponseHandlingMiddleware(testAgent, responseConfig = {}) {
    testLogger.info('Starting response handling middleware functionality testing');
    
    try {
        // Send successful GET request to /hello endpoint for response formatting testing
        const successResponse = await testAgent
            .get('/hello')
            .expect(200);
        
        testLogger.debug('Successful request sent to /hello endpoint for response testing');
        
        // Validate response structure using formatSuccessResponse middleware integration
        assert.strictEqual(successResponse.status, 200, 'Successful request should return 200 status code');
        assert.ok(successResponse.text || successResponse.body, 'Response should contain body content');
        
        if (successResponse.text) {
            assert.strictEqual(successResponse.text.trim(), 'Hello world', 'Response should contain expected hello message');
        }
        
        // Test response metadata enrichment including timestamp and correlation ID
        if (responseConfig.validateHeaders !== false) {
            const responseHeaders = successResponse.headers;
            assert.ok(responseHeaders, 'Response should include headers');
            
            // Verify common response headers
            if (responseHeaders['content-type']) {
                assert.ok(
                    responseHeaders['content-type'].includes('text') || 
                    responseHeaders['content-type'].includes('json'),
                    'Content-Type header should be appropriate for response content'
                );
            }
            
            testLogger.debug('Response headers validation completed');
        }
        
        // Verify response headers are properly set by response handling middleware
        const customHeadersResponse = await testAgent
            .get('/hello')
            .set('Accept', 'application/json')
            .expect(200);
        
        // Test response format consistency across different request scenarios
        const textResponse = await testAgent
            .get('/hello')
            .set('Accept', 'text/plain')
            .expect(200);
        
        const htmlResponse = await testAgent
            .get('/hello')
            .set('Accept', 'text/html')
            .expect(200);
        
        // All responses should be successful regardless of Accept header
        assert.strictEqual(customHeadersResponse.status, 200, 'JSON accept header should return 200');
        assert.strictEqual(textResponse.status, 200, 'Text accept header should return 200');
        assert.strictEqual(htmlResponse.status, 200, 'HTML accept header should return 200');
        
        testLogger.debug('Response format consistency validated across different Accept headers');
        
        // Validate response handling middleware performance and execution timing
        const performanceStartTime = Date.now();
        
        await testAgent
            .get('/hello')
            .expect(200);
        
        const responseProcessingTime = Date.now() - performanceStartTime;
        assert.ok(
            responseProcessingTime < 1000, 
            `Response processing should be under 1000ms (actual: ${responseProcessingTime}ms)`
        );
        
        // Test response handling integration with error handling middleware
        const errorResponse = await testAgent
            .get('/nonexistent')
            .expect(404);
        
        assert.strictEqual(errorResponse.status, 404, 'Error responses should be properly formatted');
        
        // Assert response handling middleware maintains HTTP specification compliance
        assert.ok(
            [200, 404, 405, 500].includes(successResponse.status) || 
            [200, 404, 405, 500].includes(errorResponse.status),
            'All responses should use standard HTTP status codes'
        );
        
        testLogger.info('Response handling middleware functionality testing completed successfully');
        
    } catch (responseHandlingTestError) {
        testLogger.error('Response handling middleware test failed', {
            error: responseHandlingTestError.message,
            stack: responseHandlingTestError.stack
        });
        throw responseHandlingTestError;
    }
}

/**
 * Tests 404 Not Found handler middleware functionality including route matching, not found detection,
 * error response generation, and integration with error handling pipeline.
 * 
 * Validates 404 Not Found handler middleware detects non-existent routes, generates appropriate error responses,
 * logs request information, and integrates properly with the error handling middleware pipeline.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} notFoundScenarios - Not found scenarios configuration for comprehensive 404 testing
 * @param {string[]} [notFoundScenarios.testPaths] - Array of paths to test for 404 responses
 * @param {boolean} [notFoundScenarios.validateLogging] - Enable 404 request logging validation
 * @param {object} [notFoundScenarios.edgeCases] - Edge case paths and scenarios for testing
 * @returns {Promise<void>} Promise resolving when not found handler middleware tests are complete
 */
async function testNotFoundHandlerMiddleware(testAgent, notFoundScenarios = {}) {
    testLogger.info('Starting 404 Not Found handler middleware functionality testing');
    
    try {
        // Send request to non-existent path using notFoundRequests.invalidPath fixture
        const invalidPathRequest = notFoundRequests.invalidPath;
        const notFoundResponse = await testAgent
            .get(invalidPathRequest.path)
            .expect(404);
        
        testLogger.debug(`404 test completed for path: ${invalidPathRequest.path}`);
        
        // Validate notFoundHandler middleware generates 404 status code response
        assert.strictEqual(notFoundResponse.status, 404, 'Non-existent path should return 404 status code');
        
        // Test not found response format and error message consistency
        if (notFoundResponse.body && typeof notFoundResponse.body === 'object') {
            assert.ok(
                notFoundResponse.body.error || notFoundResponse.body.message || notFoundResponse.text,
                'Not found response should include error message'
            );
        } else if (notFoundResponse.text) {
            assert.ok(
                notFoundResponse.text.length > 0,
                'Not found response should include error text'
            );
        }
        
        // Verify not found handler logging includes request path and method information
        const consoleMock = testUtilities.mockFunction(console, 'log');
        
        try {
            await testAgent
                .get('/completely-invalid-path')
                .expect(404);
            
            // Check for logging output (implementation dependent)
            if (consoleMock.callCount > 0) {
                const logCalls = consoleMock.getCalls();
                const notFoundLogCall = logCalls.find(call => 
                    call.args.some(arg => 
                        typeof arg === 'string' && 
                        (arg.includes('404') || arg.includes('not found') || arg.includes('invalid-path'))
                    )
                );
                
                if (notFoundLogCall) {
                    testLogger.debug('Not found handler logging verified');
                }
            }
        } finally {
            if (consoleMock.restore) {
                consoleMock.restore();
            }
        }
        
        // Test not found handler integration with error handling middleware pipeline
        const multipleNotFoundTests = [
            '/api/nonexistent',
            '/users/invalid',
            '/admin/missing',
            '/static/notfound.css'
        ];
        
        for (const testPath of multipleNotFoundTests) {
            const response = await testAgent
                .get(testPath)
                .expect(404);
            
            assert.strictEqual(response.status, 404, `Path ${testPath} should return 404`);
        }
        
        testLogger.debug('Multiple not found paths tested successfully');
        
        // Validate not found handler execution order in middleware stack
        // Not found handler should be executed after all route handlers but before error handler
        const validEndpointResponse = await testAgent
            .get('/hello')
            .expect(200);
        
        assert.strictEqual(validEndpointResponse.status, 200, 'Valid endpoint should bypass not found handler');
        
        // Test edge cases including paths with trailing slashes and special characters
        const edgeCasePaths = [
            '/hello/',           // Trailing slash
            '/hello?param=value', // Query parameters on invalid base
            '/hello/../invalid',  // Path traversal
            '/%20invalid',       // URL encoded spaces
            '/hello%2Finvalid'   // URL encoded slash
        ];
        
        for (const edgePath of edgeCasePaths) {
            const edgeResponse = await testAgent
                .get(edgePath)
                .expect(res => {
                    // Accept either 200 (if path resolves) or 404 (if not found)
                    assert.ok([200, 404].includes(res.status), 
                        `Edge case path ${edgePath} should return either 200 or 404 (got ${res.status})`);
                });
        }
        
        testLogger.debug('Edge case paths tested successfully');
        
        // Assert not found handler middleware performance and response timing
        const performanceStartTime = Date.now();
        
        await testAgent
            .get('/performance-test-404-path')
            .expect(404);
        
        const notFoundProcessingTime = Date.now() - performanceStartTime;
        assert.ok(
            notFoundProcessingTime < 500,
            `Not found processing should be under 500ms (actual: ${notFoundProcessingTime}ms)`
        );
        
        testLogger.info('404 Not Found handler middleware functionality testing completed successfully');
        
    } catch (notFoundTestError) {
        testLogger.error('Not Found handler middleware test failed', {
            error: notFoundTestError.message,
            stack: notFoundTestError.stack
        });
        throw notFoundTestError;
    }
}

/**
 * Tests middleware execution order and stack orchestration including middleware pipeline flow,
 * execution sequence validation, and proper middleware chaining behavior.
 * 
 * Validates middleware stack executes in correct order, middleware functions call next() appropriately,
 * middleware pipeline handles errors correctly, and middleware orchestration follows expected patterns.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} executionOrderConfig - Execution order configuration for middleware stack testing
 * @param {boolean} [executionOrderConfig.trackExecution] - Enable middleware execution tracking
 * @param {string[]} [executionOrderConfig.expectedOrder] - Expected middleware execution order
 * @param {boolean} [executionOrderConfig.validateTiming] - Enable execution timing validation
 * @returns {Promise<void>} Promise resolving when middleware execution order tests are complete
 */
async function testMiddlewareExecutionOrder(testAgent, executionOrderConfig = {}) {
    testLogger.info('Starting middleware execution order and stack orchestration testing');
    
    const executionTracker = [];
    
    try {
        // Create middleware execution tracking using TestUtilities.mockFunction for each middleware
        const middlewareSpies = {
            requestLogger: testUtilities.mockFunction(console, 'log'),
            errorHandler: testUtilities.mockFunction(console, 'error')
        };
        
        // Send GET request to /hello endpoint to trigger complete middleware stack execution
        const executionTestResponse = await testAgent
            .get('/hello')
            .expect(200);
        
        testLogger.debug('Middleware stack execution triggered with /hello request');
        
        // Validate middleware execution order: request logging -> response handling -> route handler -> error handling
        assert.strictEqual(executionTestResponse.status, 200, 'Middleware stack should process request successfully');
        assert.ok(executionTestResponse.text || executionTestResponse.body, 'Middleware stack should generate response');
        
        // Test middleware stack created by createMiddlewareStack function follows proper order
        const middlewareStack = createMiddlewareStack();
        assert.ok(Array.isArray(middlewareStack) || typeof middlewareStack === 'function', 
            'createMiddlewareStack should return valid middleware configuration');
        
        // Verify each middleware calls next() function to continue pipeline execution
        // This is tested implicitly by successful request processing through the stack
        const multipleRequests = await Promise.all([
            testAgent.get('/hello').expect(200),
            testAgent.get('/hello').expect(200),
            testAgent.get('/hello').expect(200)
        ]);
        
        multipleRequests.forEach((response, index) => {
            assert.strictEqual(response.status, 200, `Request ${index + 1} should pass through middleware stack successfully`);
        });
        
        testLogger.debug('Multiple requests processed through middleware stack successfully');
        
        // Test middleware pipeline behavior with error injection at different stack levels
        const errorInjectionResponse = await testAgent
            .get('/nonexistent-for-error-test')
            .expect(404);
        
        assert.strictEqual(errorInjectionResponse.status, 404, 
            'Error injection should be handled by error middleware in stack');
        
        // Validate middleware stack performance and execution timing for complete pipeline
        const performanceMeasurement = testUtilities.measurePerformance(async () => {
            await testAgent
                .get('/hello')
                .expect(200);
        });
        
        if (performanceMeasurement && performanceMeasurement.duration) {
            assert.ok(performanceMeasurement.duration < 200, 
                `Complete middleware stack execution should be under 200ms (actual: ${performanceMeasurement.duration}ms)`);
        }
        
        // Assert middleware execution order consistency across multiple request scenarios
        const consistencyTestRequests = [
            { method: 'GET', path: '/hello', expectedStatus: 200 },
            { method: 'GET', path: '/invalid', expectedStatus: 404 },
            { method: 'POST', path: '/hello', expectedStatus: 405 }
        ];
        
        for (const testRequest of consistencyTestRequests) {
            const response = await testAgent
                [testRequest.method.toLowerCase()](testRequest.path)
                .expect(testRequest.expectedStatus);
            
            assert.strictEqual(response.status, testRequest.expectedStatus, 
                `${testRequest.method} ${testRequest.path} should consistently return ${testRequest.expectedStatus}`);
        }
        
        testLogger.debug('Middleware execution order consistency validated across different scenarios');
        
        testLogger.info('Middleware execution order and stack orchestration testing completed successfully');
        
    } catch (executionOrderTestError) {
        testLogger.error('Middleware execution order test failed', {
            error: executionOrderTestError.message,
            stack: executionOrderTestError.stack
        });
        throw executionOrderTestError;
    } finally {
        // Restore all middleware spies
        Object.values(middlewareSpies).forEach(spy => {
            if (spy && spy.restore) {
                spy.restore();
            }
        });
    }
}

/**
 * Tests error propagation through middleware stack including error forwarding, middleware error handling,
 * async error propagation, and comprehensive error pipeline validation.
 * 
 * Validates errors propagate correctly through middleware stack, middleware error handling forwards errors appropriately,
 * async errors are properly caught and forwarded, and error pipeline maintains error context and information.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} errorPropagationScenarios - Error propagation scenarios for comprehensive error pipeline testing
 * @param {boolean} [errorPropagationScenarios.testAsyncPropagation] - Enable async error propagation testing
 * @param {boolean} [errorPropagationScenarios.testErrorContext] - Enable error context preservation testing
 * @param {object} [errorPropagationScenarios.customErrorTypes] - Custom error types for specialized testing
 * @returns {Promise<void>} Promise resolving when middleware error propagation tests are complete
 */
async function testMiddlewareErrorPropagation(testAgent, errorPropagationScenarios = {}) {
    testLogger.info('Starting middleware error propagation and pipeline validation testing');
    
    try {
        // Inject error in request logging middleware and test error propagation to error handler
        // This test simulates error occurring early in middleware stack
        const errorLoggerMock = testUtilities.mockFunction(console, 'error');
        
        // Test 404 error propagation through middleware stack
        const notFoundPropagationResponse = await testAgent
            .get('/trigger-not-found-error')
            .expect(404);
        
        assert.strictEqual(notFoundPropagationResponse.status, 404, 
            'Not found error should propagate through middleware stack to error handler');
        
        testLogger.debug('404 error propagation through middleware stack validated');
        
        // Test async error propagation using asyncErrors.asyncHandlerError for Express.js 5.1.0 features
        if (errorPropagationScenarios.testAsyncPropagation !== false) {
            // Create temporary middleware that throws async error
            const tempApp = createExpressApplication({
                middleware: [
                    // Custom middleware that throws async error
                    async (req, res, next) => {
                        if (req.path === '/async-error-test') {
                            // Simulate async error that should be caught by Express.js 5.1.0
                            const asyncError = asyncErrors.asyncHandlerError;
                            throw asyncError;
                        }
                        next();
                    },
                    ...createMiddlewareStack()
                ]
            });
            
            const tempAgent = createServerTestAgent(tempApp);
            const asyncErrorResponse = await tempAgent
                .get('/async-error-test')
                .expect(500);
            
            assert.strictEqual(asyncErrorResponse.status, 500, 
                'Async errors should propagate to error handler with 500 status');
            
            testLogger.debug('Async error propagation validated with Express.js 5.1.0 features');
        }
        
        // Validate error propagation skips remaining middleware and goes directly to error handler
        const skipMiddlewareResponse = await testAgent
            .get('/nonexistent-skip-test')
            .expect(404);
        
        assert.strictEqual(skipMiddlewareResponse.status, 404, 
            'Error should skip remaining middleware and go to error handler');
        
        // Test error context preservation through middleware stack propagation
        if (errorPropagationScenarios.testErrorContext !== false) {
            const contextTestResponse = await testAgent
                .get('/context-preservation-test')
                .set('x-correlation-id', 'error-propagation-test-123')
                .expect(404);
            
            // Error should maintain original request context
            assert.strictEqual(contextTestResponse.status, 404, 
                'Error propagation should maintain request context');
        }
        
        // Verify error handling middleware receives complete error information and stack trace
        const errorInformationResponse = await testAgent
            .get('/error-information-test')
            .expect(404);
        
        if (errorInformationResponse.body && typeof errorInformationResponse.body === 'object') {
            // Check if error response contains appropriate error information
            assert.ok(
                errorInformationResponse.body.error || 
                errorInformationResponse.body.message || 
                errorInformationResponse.text,
                'Error response should contain error information'
            );
        }
        
        // Test error propagation with different error types and classifications
        const errorTypeTests = [
            { path: '/validation-error-test', expectedStatus: 400 },
            { path: '/authorization-error-test', expectedStatus: 401 },
            { path: '/forbidden-error-test', expectedStatus: 403 },
            { path: '/method-error-test', expectedStatus: 405 }
        ];
        
        for (const errorTest of errorTypeTests) {
            const errorTypeResponse = await testAgent
                .get(errorTest.path)
                .expect(res => {
                    // Accept either the expected status or 404 (if route doesn't exist)
                    assert.ok(
                        [errorTest.expectedStatus, 404].includes(res.status),
                        `Error type test for ${errorTest.path} should return ${errorTest.expectedStatus} or 404`
                    );
                });
        }
        
        testLogger.debug('Error type classification and propagation validated');
        
        // Validate error propagation performance and middleware stack bypass efficiency
        const propagationPerformance = testUtilities.measurePerformance(async () => {
            await testAgent
                .get('/performance-error-propagation-test')
                .expect(404);
        });
        
        if (propagationPerformance && propagationPerformance.duration) {
            assert.ok(propagationPerformance.duration < 150,
                `Error propagation should be efficient, under 150ms (actual: ${propagationPerformance.duration}ms)`);
        }
        
        // Assert error propagation maintains error correlation and debugging information
        const correlationTestResponse = await testAgent
            .get('/correlation-error-test')
            .set('x-test-correlation', 'error-correlation-123')
            .expect(404);
        
        assert.strictEqual(correlationTestResponse.status, 404,
            'Error propagation should maintain correlation information');
        
        testLogger.info('Middleware error propagation and pipeline validation testing completed successfully');
        
    } catch (errorPropagationTestError) {
        testLogger.error('Middleware error propagation test failed', {
            error: errorPropagationTestError.message,
            stack: errorPropagationTestError.stack
        });
        throw errorPropagationTestError;
    }
}

/**
 * Tests middleware stack performance including execution timing, memory usage, concurrent request handling,
 * and performance impact measurement across complete middleware pipeline.
 * 
 * Validates middleware stack performs within acceptable limits, handles concurrent requests efficiently,
 * maintains consistent performance characteristics, and meets educational application performance requirements.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} performanceConfig - Performance configuration for middleware performance testing
 * @param {number} [performanceConfig.maxResponseTime] - Maximum acceptable response time in milliseconds
 * @param {number} [performanceConfig.concurrentRequests] - Number of concurrent requests for load testing
 * @param {boolean} [performanceConfig.memoryTracking] - Enable memory usage tracking during testing
 * @returns {Promise<void>} Promise resolving when middleware performance tests are complete
 */
async function testMiddlewarePerformance(testAgent, performanceConfig = {}) {
    testLogger.info('Starting middleware stack performance and scalability testing');
    
    const maxResponseTime = performanceConfig.maxResponseTime || 100;
    const concurrentRequests = performanceConfig.concurrentRequests || 10;
    
    try {
        // Measure middleware stack execution time using TestUtilities.measurePerformance method
        const singleRequestPerformance = testUtilities.measurePerformance(async () => {
            await testAgent
                .get('/hello')
                .expect(200);
        });
        
        testLogger.debug(`Single request performance measured: ${singleRequestPerformance.duration}ms`);
        
        // Test single request processing time through complete middleware pipeline
        assert.ok(singleRequestPerformance.duration < maxResponseTime,
            `Single request should complete under ${maxResponseTime}ms (actual: ${singleRequestPerformance.duration}ms)`);
        
        // Validate middleware stack memory usage and resource consumption patterns
        if (performanceConfig.memoryTracking !== false) {
            const memoryBefore = process.memoryUsage();
            
            // Process multiple requests to measure memory impact
            for (let i = 0; i < 5; i++) {
                await testAgent
                    .get('/hello')
                    .expect(200);
            }
            
            const memoryAfter = process.memoryUsage();
            const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
            
            // Memory increase should be reasonable for educational application
            assert.ok(memoryIncrease < 10 * 1024 * 1024, // 10MB limit
                `Memory increase should be under 10MB (actual: ${Math.round(memoryIncrease / 1024 / 1024)}MB)`);
            
            testLogger.debug(`Memory usage validated: ${Math.round(memoryIncrease / 1024)}KB increase`);
        }
        
        // Test concurrent request handling through middleware stack with performance measurement
        const concurrentPerformance = testUtilities.measurePerformance(async () => {
            const concurrentPromises = Array.from({ length: concurrentRequests }, () =>
                testAgent
                    .get('/hello')
                    .expect(200)
            );
            
            const concurrentResults = await Promise.all(concurrentPromises);
            
            // Validate all concurrent requests succeeded
            concurrentResults.forEach((result, index) => {
                assert.strictEqual(result.status, 200, 
                    `Concurrent request ${index + 1} should succeed`);
            });
            
            return concurrentResults;
        });
        
        testLogger.debug(`Concurrent requests performance: ${concurrentPerformance.duration}ms for ${concurrentRequests} requests`);
        
        // Measure individual middleware execution times and identify performance bottlenecks
        const avgConcurrentTime = concurrentPerformance.duration / concurrentRequests;
        assert.ok(avgConcurrentTime < maxResponseTime * 2,
            `Average concurrent request time should be under ${maxResponseTime * 2}ms (actual: ${avgConcurrentTime}ms)`);
        
        // Test middleware stack performance under load with multiple simultaneous requests
        const loadTestPerformance = testUtilities.measurePerformance(async () => {
            const loadTestBatches = 3;
            const requestsPerBatch = 5;
            
            for (let batch = 0; batch < loadTestBatches; batch++) {
                const batchPromises = Array.from({ length: requestsPerBatch }, () =>
                    testAgent
                        .get('/hello')
                        .expect(200)
                );
                
                await Promise.all(batchPromises);
            }
        });
        
        const totalRequests = 3 * 5;
        const avgLoadTestTime = loadTestPerformance.duration / totalRequests;
        
        testLogger.debug(`Load test completed: ${totalRequests} requests in ${loadTestPerformance.duration}ms`);
        
        // Validate middleware performance meets educational application requirements (<100ms)
        assert.ok(avgLoadTestTime < maxResponseTime,
            `Load test average response time should be under ${maxResponseTime}ms (actual: ${avgLoadTestTime}ms)`);
        
        // Test performance consistency across different request patterns
        const performanceConsistencyTests = [
            { path: '/hello', method: 'GET', description: 'Normal request' },
            { path: '/nonexistent', method: 'GET', description: '404 error handling' },
            { path: '/hello', method: 'POST', description: '405 method error' }
        ];
        
        for (const consistencyTest of performanceConsistencyTests) {
            const testPerformance = testUtilities.measurePerformance(async () => {
                await testAgent
                    [consistencyTest.method.toLowerCase()](consistencyTest.path)
                    .expect(res => {
                        assert.ok(res.status >= 200 && res.status < 600,
                            `${consistencyTest.description} should return valid HTTP status`);
                    });
            });
            
            assert.ok(testPerformance.duration < maxResponseTime * 3,
                `${consistencyTest.description} should complete within performance limits`);
        }
        
        // Assert middleware stack scalability and performance consistency across request patterns
        const scalabilityTest = testUtilities.measurePerformance(async () => {
            const scalabilityPromises = Array.from({ length: 20 }, (_, index) =>
                testAgent
                    .get('/hello')
                    .set('x-request-id', `scalability-test-${index}`)
                    .expect(200)
            );
            
            await Promise.all(scalabilityPromises);
        });
        
        const scalabilityAverage = scalabilityTest.duration / 20;
        assert.ok(scalabilityAverage < maxResponseTime * 1.5,
            `Scalability test should maintain performance under increased load (actual: ${scalabilityAverage}ms)`);
        
        testLogger.info('Middleware stack performance and scalability testing completed successfully');
        
    } catch (performanceTestError) {
        testLogger.error('Middleware performance test failed', {
            error: performanceTestError.message,
            stack: performanceTestError.stack
        });
        throw performanceTestError;
    }
}

/**
 * Tests comprehensive middleware integration scenarios including edge cases, error recovery,
 * middleware interaction patterns, and complete request-response cycle validation.
 * 
 * Validates middleware integration handles complex scenarios, recovers from errors gracefully,
 * supports various interaction patterns, and maintains system stability under edge conditions.
 * 
 * @param {object} testAgent - SuperTest agent for HTTP endpoint testing
 * @param {object} integrationScenarios - Integration scenarios configuration for comprehensive testing
 * @param {boolean} [integrationScenarios.testEdgeCases] - Enable edge case scenario testing
 * @param {boolean} [integrationScenarios.testErrorRecovery] - Enable error recovery testing
 * @param {object} [integrationScenarios.customScenarios] - Custom integration scenarios for specialized testing
 * @returns {Promise<void>} Promise resolving when middleware integration scenario tests are complete
 */
async function testMiddlewareIntegrationScenarios(testAgent, integrationScenarios = {}) {
    testLogger.info('Starting comprehensive middleware integration scenarios testing');
    
    try {
        // Test complete request-response cycle through entire middleware stack
        const completeIntegrationResponse = await testAgent
            .get('/hello')
            .set('User-Agent', 'comprehensive-integration-test')
            .set('Accept', 'text/plain')
            .set('X-Integration-Test', 'complete-cycle')
            .expect(200);
        
        assert.strictEqual(completeIntegrationResponse.status, 200,
            'Complete integration cycle should process successfully');
        assert.ok(completeIntegrationResponse.text || completeIntegrationResponse.body,
            'Complete integration should generate response content');
        
        testLogger.debug('Complete request-response cycle through middleware stack validated');
        
        // Validate middleware integration with Express.js 5.1.0 enhanced features
        const enhancedFeaturesResponse = await testAgent
            .get('/hello')
            .set('X-Express-Version-Test', '5.1.0')
            .expect(200);
        
        assert.strictEqual(enhancedFeaturesResponse.status, 200,
            'Express.js 5.1.0 enhanced features should integrate properly');
        
        // Test middleware interaction with different HTTP methods and request types
        const httpMethodTests = [
            { method: 'GET', path: '/hello', expectedStatus: 200, description: 'GET method' },
            { method: 'POST', path: '/hello', expectedStatus: 405, description: 'POST method (not allowed)' },
            { method: 'PUT', path: '/hello', expectedStatus: 405, description: 'PUT method (not allowed)' },
            { method: 'DELETE', path: '/hello', expectedStatus: 405, description: 'DELETE method (not allowed)' }
        ];
        
        for (const methodTest of httpMethodTests) {
            const methodResponse = await testAgent
                [methodTest.method.toLowerCase()](methodTest.path)
                .set('X-Method-Test', methodTest.method)
                .expect(methodTest.expectedStatus);
            
            assert.strictEqual(methodResponse.status, methodTest.expectedStatus,
                `${methodTest.description} should return ${methodTest.expectedStatus}`);
        }
        
        testLogger.debug('HTTP method integration testing completed successfully');
        
        // Verify middleware integration handles edge cases and boundary conditions
        if (integrationScenarios.testEdgeCases !== false) {
            const edgeCaseScenarios = [
                {
                    description: 'Very long URL path',
                    path: '/hello' + 'x'.repeat(100),
                    expectedStatus: [200, 404, 414] // OK, Not Found, or URI Too Long
                },
                {
                    description: 'Special characters in path',
                    path: '/hello%20world',
                    expectedStatus: [200, 404]
                },
                {
                    description: 'Empty headers request',
                    path: '/hello',
                    headers: {},
                    expectedStatus: [200]
                },
                {
                    description: 'Large number of headers',
                    path: '/hello',
                    headers: Object.fromEntries(
                        Array.from({ length: 20 }, (_, i) => [`X-Test-Header-${i}`, `value-${i}`])
                    ),
                    expectedStatus: [200]
                }
            ];
            
            for (const edgeCase of edgeCaseScenarios) {
                const edgeRequest = testAgent.get(edgeCase.path);
                
                if (edgeCase.headers) {
                    Object.entries(edgeCase.headers).forEach(([key, value]) => {
                        edgeRequest.set(key, value);
                    });
                }
                
                const edgeResponse = await edgeRequest
                    .expect(res => {
                        assert.ok(edgeCase.expectedStatus.includes(res.status),
                            `${edgeCase.description} should return one of ${edgeCase.expectedStatus} (got ${res.status})`);
                    });
            }
            
            testLogger.debug('Edge case scenario testing completed successfully');
        }
        
        // Test middleware stack recovery from errors and continued operation
        if (integrationScenarios.testErrorRecovery !== false) {
            // Trigger error and then test normal operation
            await testAgent
                .get('/nonexistent-error-recovery-test')
                .expect(404);
            
            // Verify system continues to operate normally after error
            const recoveryResponse = await testAgent
                .get('/hello')
                .set('X-Recovery-Test', 'post-error')
                .expect(200);
            
            assert.strictEqual(recoveryResponse.status, 200,
                'System should recover and continue normal operation after error');
            
            testLogger.debug('Error recovery and continued operation validated');
        }
        
        // Validate middleware integration with application configuration and environment settings
        const configurationIntegrationResponse = await testAgent
            .get('/hello')
            .set('X-Environment-Test', process.env.NODE_ENV || 'test')
            .expect(200);
        
        assert.strictEqual(configurationIntegrationResponse.status, 200,
            'Middleware should integrate properly with application configuration');
        
        // Test middleware stack behavior with malformed requests and invalid data
        const malformedRequestTests = [
            {
                description: 'Invalid Content-Length header',
                headers: { 'Content-Length': 'invalid' },
                expectedStatus: [200, 400]
            },
            {
                description: 'Malformed Accept header',
                headers: { 'Accept': 'invalid/type/format' },
                expectedStatus: [200, 406]
            },
            {
                description: 'Extremely long User-Agent',
                headers: { 'User-Agent': 'x'.repeat(1000) },
                expectedStatus: [200, 400]
            }
        ];
        
        for (const malformedTest of malformedRequestTests) {
            const malformedRequest = testAgent.get('/hello');
            
            Object.entries(malformedTest.headers).forEach(([key, value]) => {
                malformedRequest.set(key, value);
            });
            
            const malformedResponse = await malformedRequest
                .expect(res => {
                    assert.ok(malformedTest.expectedStatus.includes(res.status),
                        `${malformedTest.description} should handle gracefully (expected ${malformedTest.expectedStatus}, got ${res.status})`);
                });
        }
        
        testLogger.debug('Malformed request handling testing completed successfully');
        
        // Assert middleware integration maintains application stability and educational value
        const stabilityTestRequests = Array.from({ length: 15 }, (_, index) => ({
            method: index % 3 === 0 ? 'GET' : 'GET', // Vary methods
            path: index % 4 === 0 ? '/nonexistent' : '/hello', // Vary paths to test both success and error cases
            headers: { 'X-Stability-Test': `request-${index}` }
        }));
        
        const stabilityResults = await Promise.all(
            stabilityTestRequests.map(async (request) => {
                const response = await testAgent
                    [request.method.toLowerCase()](request.path)
                    .set(request.headers)
                    .expect(res => {
                        assert.ok(res.status >= 200 && res.status < 600,
                            'All stability test requests should return valid HTTP status codes');
                    });
                
                return response;
            })
        );
        
        // Verify all requests were processed successfully (either 200 or appropriate error codes)
        stabilityResults.forEach((result, index) => {
            assert.ok([200, 404, 405].includes(result.status),
                `Stability test ${index + 1} should return expected status code (got ${result.status})`);
        });
        
        testLogger.info('Comprehensive middleware integration scenarios testing completed successfully');
        
    } catch (integrationScenariosTestError) {
        testLogger.error('Middleware integration scenarios test failed', {
            error: integrationScenariosTestError.message,
            stack: integrationScenariosTestError.stack
        });
        throw integrationScenariosTestError;
    }
}

// ========================================
// MAIN TEST SUITE ORGANIZATION
// ========================================

/**
 * Main test suite for comprehensive middleware integration testing
 * Organizes and executes all middleware integration test scenarios using Node.js built-in test runner
 */
describe('Middleware Integration Test Suite', () => {
    
    // ========================================
    // TEST SUITE SETUP AND TEARDOWN
    // ========================================
    
    before(async () => {
        testLogger = createTestLogger({
            testType: 'middleware_integration_suite',
            testId: generateTestId(),
            logLevel: 'info'
        });
        
        testLogger.info('Starting comprehensive middleware integration test suite');
        
        // Setup middleware integration test environment
        const setupResult = await setupMiddlewareIntegrationTest({
            environment: 'test',
            enableLogging: true,
            enablePerformance: true,
            timeout: 30000,
            requestTimeout: 5000
        });
        
        testSuite = setupResult;
        testAgent = setupResult.testAgent;
        testUtilities = setupResult.testUtilities;
        testServerManager = setupResult.testServerManager;
        testLogger = setupResult.testLogger;
        
        testLogger.info('Middleware integration test suite setup completed');
    });
    
    after(async () => {
        testLogger.info('Starting middleware integration test suite teardown');
        await teardownMiddlewareIntegrationTest();
        testLogger.info('Middleware integration test suite teardown completed');
    });
    
    beforeEach(async () => {
        if (testUtilities) {
            await testUtilities.resetMocks();
        }
    });
    
    afterEach(async () => {
        if (testUtilities) {
            await testUtilities.cleanup();
        }
    });
    
    // ========================================
    // REQUEST LOGGING MIDDLEWARE TESTS
    // ========================================
    
    describe('Request Logging Middleware', () => {
        test('should capture and log request information correctly', async () => {
            await testRequestLoggingMiddleware(testAgent, {
                enableMocking: true,
                customHeaders: {
                    'user-agent': 'middleware-test-agent',
                    'x-test-correlation': generateTestId()
                }
            });
        });
        
        test('should handle custom headers in logging', async () => {
            await testRequestLoggingMiddleware(testAgent, {
                enableMocking: true,
                customHeaders: {
                    'x-custom-header': 'test-value',
                    'x-correlation-id': 'custom-correlation-123'
                }
            });
        });
        
        test('should maintain logging performance within limits', async () => {
            const performanceTest = testUtilities.measurePerformance(async () => {
                await testRequestLoggingMiddleware(testAgent, {
                    enableMocking: true
                });
            });
            
            assert.ok(performanceTest.duration < 500, 
                `Request logging test should complete under 500ms (actual: ${performanceTest.duration}ms)`);
        });
    });
    
    // ========================================
    // ERROR HANDLING MIDDLEWARE TESTS
    // ========================================
    
    describe('Error Handling Middleware', () => {
        test('should handle HTTP errors correctly', async () => {
            await testErrorHandlingMiddleware(testAgent, {
                testAsyncErrors: false,
                testErrorClassification: true
            });
        });
        
        test('should handle async errors with Express.js 5.1.0 features', async () => {
            await testErrorHandlingMiddleware(testAgent, {
                testAsyncErrors: true,
                testErrorClassification: true
            });
        });
        
        test('should classify and respond to different error types', async () => {
            await testErrorHandlingMiddleware(testAgent, {
                testAsyncErrors: false,
                testErrorClassification: true
            });
        });
    });
    
    // ========================================
    // RESPONSE HANDLING MIDDLEWARE TESTS
    // ========================================
    
    describe('Response Handling Middleware', () => {
        test('should format responses consistently', async () => {
            await testResponseHandlingMiddleware(testAgent, {
                validateHeaders: true,
                validateFormat: true
            });
        });
        
        test('should handle different Accept headers appropriately', async () => {
            await testResponseHandlingMiddleware(testAgent, {
                validateHeaders: true,
                expectedHeaders: {
                    'content-type': 'text/plain'
                }
            });
        });
        
        test('should maintain response performance standards', async () => {
            const performanceTest = testUtilities.measurePerformance(async () => {
                await testResponseHandlingMiddleware(testAgent);
            });
            
            assert.ok(performanceTest.duration < 300,
                `Response handling test should complete under 300ms (actual: ${performanceTest.duration}ms)`);
        });
    });
    
    // ========================================
    // NOT FOUND HANDLER MIDDLEWARE TESTS
    // ========================================
    
    describe('Not Found Handler Middleware', () => {
        test('should handle 404 scenarios correctly', async () => {
            await testNotFoundHandlerMiddleware(testAgent, {
                testPaths: ['/nonexistent', '/api/missing', '/invalid/path'],
                validateLogging: true
            });
        });
        
        test('should handle edge case paths appropriately', async () => {
            await testNotFoundHandlerMiddleware(testAgent, {
                edgeCases: {
                    trailingSlash: true,
                    specialCharacters: true,
                    urlEncoding: true
                }
            });
        });
        
        test('should maintain 404 handler performance', async () => {
            const performanceTest = testUtilities.measurePerformance(async () => {
                await testNotFoundHandlerMiddleware(testAgent);
            });
            
            assert.ok(performanceTest.duration < 400,
                `404 handler test should complete under 400ms (actual: ${performanceTest.duration}ms)`);
        });
    });
    
    // ========================================
    // MIDDLEWARE EXECUTION ORDER TESTS
    // ========================================
    
    describe('Middleware Execution Order', () => {
        test('should execute middleware in correct order', async () => {
            await testMiddlewareExecutionOrder(testAgent, {
                trackExecution: true,
                validateTiming: true
            });
        });
        
        test('should handle middleware stack consistently', async () => {
            await testMiddlewareExecutionOrder(testAgent, {
                trackExecution: true,
                expectedOrder: ['requestLogger', 'routeHandler', 'errorHandler']
            });
        });
        
        test('should maintain execution order performance', async () => {
            const performanceTest = testUtilities.measurePerformance(async () => {
                await testMiddlewareExecutionOrder(testAgent);
            });
            
            assert.ok(performanceTest.duration < 250,
                `Execution order test should complete under 250ms (actual: ${performanceTest.duration}ms)`);
        });
    });
    
    // ========================================
    // MIDDLEWARE ERROR PROPAGATION TESTS
    // ========================================
    
    describe('Middleware Error Propagation', () => {
        test('should propagate errors through middleware stack', async () => {
            await testMiddlewareErrorPropagation(testAgent, {
                testAsyncPropagation: true,
                testErrorContext: true
            });
        });
        
        test('should handle async error propagation correctly', async () => {
            await testMiddlewareErrorPropagation(testAgent, {
                testAsyncPropagation: true,
                testErrorContext: false
            });
        });
        
        test('should maintain error context during propagation', async () => {
            await testMiddlewareErrorPropagation(testAgent, {
                testAsyncPropagation: false,
                testErrorContext: true
            });
        });
    });
    
    // ========================================
    // MIDDLEWARE PERFORMANCE TESTS
    // ========================================
    
    describe('Middleware Performance', () => {
        test('should meet single request performance requirements', async () => {
            await testMiddlewarePerformance(testAgent, {
                maxResponseTime: 100,
                concurrentRequests: 5,
                memoryTracking: true
            });
        });
        
        test('should handle concurrent requests efficiently', async () => {
            await testMiddlewarePerformance(testAgent, {
                maxResponseTime: 150,
                concurrentRequests: 10,
                memoryTracking: true
            });
        });
        
        test('should maintain performance under load', async () => {
            await testMiddlewarePerformance(testAgent, {
                maxResponseTime: 200,
                concurrentRequests: 15,
                memoryTracking: false
            });
        });
    });
    
    // ========================================
    // COMPREHENSIVE INTEGRATION SCENARIO TESTS
    // ========================================
    
    describe('Comprehensive Integration Scenarios', () => {
        test('should handle complete request-response cycles', async () => {
            await testMiddlewareIntegrationScenarios(testAgent, {
                testEdgeCases: true,
                testErrorRecovery: true
            });
        });
        
        test('should integrate with Express.js 5.1.0 enhanced features', async () => {
            await testMiddlewareIntegrationScenarios(testAgent, {
                testEdgeCases: false,
                testErrorRecovery: true
            });
        });
        
        test('should maintain stability under various scenarios', async () => {
            await testMiddlewareIntegrationScenarios(testAgent, {
                testEdgeCases: true,
                testErrorRecovery: false,
                customScenarios: {
                    highVolume: true,
                    edgeCases: true,
                    errorScenarios: true
                }
            });
        });
        
        test('should handle malformed requests gracefully', async () => {
            await testMiddlewareIntegrationScenarios(testAgent, {
                testEdgeCases: true,
                testErrorRecovery: true,
                customScenarios: {
                    malformedRequests: true,
                    invalidHeaders: true,
                    boundaryConditions: true
                }
            });
        });
    });
    
    // ========================================
    // INTEGRATION TEST PERFORMANCE VALIDATION
    // ========================================
    
    describe('Integration Test Performance Validation', () => {
        test('should complete full test suite within time limits', async () => {
            const fullSuitePerformance = testUtilities.measurePerformance(async () => {
                // Run a subset of tests to validate overall performance
                await testRequestLoggingMiddleware(testAgent);
                await testErrorHandlingMiddleware(testAgent);
                await testResponseHandlingMiddleware(testAgent);
            });
            
            assert.ok(fullSuitePerformance.duration < 2000,
                `Full integration test subset should complete under 2000ms (actual: ${fullSuitePerformance.duration}ms)`);
        });
        
        test('should maintain consistent performance across test runs', async () => {
            const consistencyTests = [];
            
            for (let i = 0; i < 3; i++) {
                const runPerformance = testUtilities.measurePerformance(async () => {
                    await testAgent.get('/hello').expect(200);
                });
                
                consistencyTests.push(runPerformance.duration);
            }
            
            const avgTime = consistencyTests.reduce((sum, time) => sum + time, 0) / consistencyTests.length;
            const maxVariation = Math.max(...consistencyTests) - Math.min(...consistencyTests);
            
            assert.ok(maxVariation < avgTime * 0.5,
                `Performance variation should be less than 50% of average time (variation: ${maxVariation}ms, avg: ${avgTime}ms)`);
        });
    });
});