/**
 * Comprehensive Unit Test Suite for notFoundHandler Middleware
 * 
 * This test file validates the notFoundHandler middleware module that handles 404 Not Found
 * error scenarios in the Node.js tutorial application. Tests cover route matching failures,
 * response formatting, educational debugging capabilities, and integration with Express.js 5.1.0
 * middleware pipeline patterns.
 * 
 * Demonstrates proper testing patterns using Node.js built-in test runner with comprehensive
 * mock objects, request validation scenarios, and educational testing approaches for learning
 * Node.js HTTP server development.
 * 
 * Features comprehensive testing of:
 * - Basic 404 error handling with meaningful error messages
 * - Factory function configuration and customization options
 * - Logging functionality for troubleshooting and debugging
 * - Environment-specific behavior (development vs production)
 * - Performance characteristics and response time validation
 * - Error object creation and standardization
 * - Integration with Express.js middleware pipeline
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner functions for test organization and execution
const { test, describe, it, beforeEach, afterEach } = require('node:test'); // Node.js v18+ built-in test runner

// Import Node.js built-in assertion functions for test validations and comparisons
const { strictEqual, ok, deepStrictEqual, match } = require('node:assert'); // Node.js v1.0.0+ built-in assertions

// Import notFoundHandler middleware functions and utilities for comprehensive testing
const {
    notFoundHandler,
    createNotFoundHandler,
    logNotFoundRequest,
    create404Error,
    getDefaultNotFoundConfig
} = require('../../../middleware/notFoundHandler.js');

// Import mock helper utilities for Express.js object creation and lifecycle management
const {
    createMockRequest,
    createMockResponse,
    createMockNext,
    MockManager
} = require('../../helpers/mockHelpers.js');

// Import test helper utilities for environment management and performance measurement
const {
    createTestLogger,
    measureExecutionTime,
    TestUtilities
} = require('../../helpers/testHelpers.js');

// Import HTTP request testing utilities for making test requests and response validation
const {
    makeNotFoundRequest,
    assertResponseStatus,
    validateResponse
} = require('../../helpers/requestHelpers.js');

// Import test fixtures for request and response objects, error scenarios, and test data
const { validRequests } = require('../../fixtures/requests.js');
const { errorResponses } = require('../../fixtures/responses.js');
const { httpErrors } = require('../../fixtures/errors.js');

// Import comprehensive test configuration for timeout management and environment setup
const { testConfig } = require('../../setup/testConfig.js');

// Import HTTP status codes, error messages, and route constants for test validation
const { HTTP_STATUS, ERROR_MESSAGES, ROUTES } = require('../../../utils/constants.js');

// Initialize global test environment variables and utilities for test execution
let testLogger;
let mockManager;
let testUtilities;
let TEST_TIMEOUT;

/**
 * Sets up comprehensive test environment with proper isolation, mock management, and
 * environment variable configuration for not found handler middleware testing.
 * Initializes test utilities, logging, and cleanup procedures for reliable test execution.
 * 
 * @returns {Promise<void>} Promise resolving when test environment setup is complete
 */
async function setupTestEnvironment() {
    try {
        // Initialize test utilities with not found handler testing configuration
        testUtilities = new TestUtilities({
            logLevel: 'WARN',
            cleanup: true,
            enableMocking: true,
            trackCalls: true
        });

        // Set up mock manager for Express.js object management and lifecycle
        mockManager = new MockManager({
            trackCalls: true,
            resetOnNextTest: true,
            enableCleanup: true
        });

        // Configure test environment variables for development and production testing scenarios
        await testUtilities.mockProcessEnv({
            NODE_ENV: 'test',
            LOG_LEVEL: 'error',
            TEST_MODE: 'true'
        });

        // Set up test logging with appropriate levels for 404 error testing
        testLogger = createTestLogger('notFoundHandlerTest', {
            level: 'error',
            silent: false,
            testMode: true
        });

        // Initialize test timeout configuration for middleware execution tests
        TEST_TIMEOUT = testConfig.timeouts?.unit?.default || 5000;

        // Log successful test environment setup
        testLogger.info('Test environment setup completed', {
            hasUtilities: Boolean(testUtilities),
            hasMockManager: Boolean(mockManager),
            timeout: TEST_TIMEOUT
        });

    } catch (error) {
        console.error('Test environment setup failed:', error.message);
        throw error;
    }
}

/**
 * Cleans up test environment including mock resets, environment restoration, and
 * resource cleanup for proper test isolation between test runs.
 * 
 * @returns {Promise<void>} Promise resolving when test environment cleanup is complete
 */
async function teardownTestEnvironment() {
    try {
        // Execute mock manager cleanup to reset all mock objects and tracking
        if (mockManager && typeof mockManager.cleanup === 'function') {
            await mockManager.cleanup();
        }

        // Reset test utilities and restore original environment variables
        if (testUtilities && typeof testUtilities.cleanup === 'function') {
            await testUtilities.cleanup();
        }

        // Clean up test loggers and flush any pending log entries
        if (testLogger && typeof testLogger.flush === 'function') {
            testLogger.flush();
        }

        // Clear timeout configurations and middleware execution tracking
        TEST_TIMEOUT = null;

        // Validate test environment cleanup completion and resource release
        testLogger?.debug('Test environment cleanup completed successfully');

    } catch (error) {
        console.error('Test environment cleanup failed:', error.message);
    }
}

/**
 * Creates customized test request objects for non-existent routes with specific paths,
 * methods, and headers for comprehensive 404 testing scenarios.
 * 
 * @param {string} requestPath - The path for the not found request
 * @param {object} requestOptions - Additional request configuration options
 * @returns {object} Mock Express.js request object configured for not found testing
 */
function createNotFoundTestRequest(requestPath = '/nonexistent', requestOptions = {}) {
    try {
        // Create base mock request using createMockRequest with specified path
        const mockRequest = createMockRequest({
            path: requestPath,
            url: requestPath,
            originalUrl: requestPath,
            method: requestOptions.method || 'GET'
        });

        // Configure request method from requestOptions or default to GET
        mockRequest.method = requestOptions.method || 'GET';

        // Set up request headers including user-agent and correlation ID
        mockRequest.headers = {
            'user-agent': 'nodejs-tutorial-test-client',
            'accept': 'application/json',
            'x-correlation-id': `test-${Date.now()}`,
            ...requestOptions.headers
        };

        // Add request metadata for non-existent route testing scenarios
        mockRequest.ip = '127.0.0.1';
        mockRequest.ips = [];
        mockRequest.hostname = 'localhost';

        // Configure request timing and correlation tracking for debugging
        mockRequest.startTime = Date.now();
        mockRequest.testContext = {
            testType: 'notFound',
            expectedStatus: HTTP_STATUS.NOT_FOUND,
            requestPath: requestPath
        };

        // Return configured mock request ready for not found handler testing
        return mockRequest;

    } catch (error) {
        testLogger?.error('Failed to create not found test request', {
            error: error.message,
            requestPath: requestPath
        });
        throw error;
    }
}

/**
 * Validates 404 not found response structure, content, status codes, and metadata
 * for comprehensive not found handler response testing.
 * 
 * @param {object} mockResponse - The mock response object to validate
 * @param {string} originalPath - The original request path that was not found
 * @param {object} expectedResponse - Expected response structure for validation
 */
function validateNotFoundResponse(mockResponse, originalPath, expectedResponse = {}) {
    try {
        // Validate HTTP status code equals HTTP_STATUS.NOT_FOUND (404)
        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND,
            'Response status code should be 404 Not Found');

        // Assert error response structure includes required fields
        ok(mockResponse.jsonData, 'Response should contain JSON data');
        
        const responseData = mockResponse.jsonData;
        ok(responseData.error, 'Response should contain error object');
        ok(responseData.message, 'Response should contain error message');
        ok(responseData.path, 'Response should contain requested path');
        ok(responseData.timestamp, 'Response should contain timestamp');

        // Verify error message content matches ERROR_MESSAGES.ROUTE_NOT_FOUND
        match(responseData.message, /not found/i,
            'Error message should indicate route not found');

        // Validate requested path is included in error response for debugging
        strictEqual(responseData.path, originalPath,
            'Response should include the original requested path');

        // Check error correlation ID presence and format for request tracking
        ok(responseData.correlationId || responseData.requestId,
            'Response should include correlation or request ID for tracking');

        // Assert response headers are set correctly for 404 error responses
        strictEqual(mockResponse.getHeader('Content-Type'), 'application/json',
            'Content-Type header should be application/json');

        testLogger?.debug('Not found response validation successful', {
            statusCode: mockResponse.statusCode,
            path: originalPath,
            hasErrorData: Boolean(responseData.error)
        });

    } catch (error) {
        testLogger?.error('Not found response validation failed', {
            error: error.message,
            statusCode: mockResponse.statusCode,
            path: originalPath
        });
        throw error;
    }
}

/**
 * Measures not found handler middleware performance including processing time,
 * response generation, and logging performance for performance testing.
 * 
 * @param {string} testPath - The path to test for performance measurement
 * @param {object} performanceOptions - Performance testing configuration options
 * @returns {Promise<object>} Promise resolving to performance measurement results
 */
async function testNotFoundMiddlewarePerformance(testPath = '/performance-test', performanceOptions = {}) {
    try {
        // Set up performance measurement using measureExecutionTime utility
        const performanceResult = await measureExecutionTime(async () => {
            // Create mock Express.js objects (req, res, next) for performance testing
            const mockRequest = createNotFoundTestRequest(testPath);
            const mockResponse = createMockResponse();
            const mockNext = createMockNext();

            // Execute not found handler middleware with test path and timing measurement
            await notFoundHandler(mockRequest, mockResponse, mockNext);

            return {
                statusCode: mockResponse.statusCode,
                responseGenerated: Boolean(mockResponse.jsonData),
                nextCalled: mockNext.called
            };
        });

        // Collect memory usage and resource consumption during 404 handling
        const memoryUsage = process.memoryUsage();

        // Compare performance results against configured thresholds and expectations
        const performanceThreshold = performanceOptions.maxExecutionTime || 100; // 100ms default
        const performanceValid = performanceResult.executionTime < performanceThreshold;

        // Return comprehensive performance measurement results for analysis
        return {
            executionTime: performanceResult.executionTime,
            result: performanceResult.result,
            memoryUsage: memoryUsage,
            performanceValid: performanceValid,
            threshold: performanceThreshold,
            testPath: testPath,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        testLogger?.error('Performance testing failed', {
            error: error.message,
            testPath: testPath
        });
        throw error;
    }
}

/**
 * Tests not found handler behavior in different environments (development, production, test)
 * with appropriate error information and debug details.
 * 
 * @param {string} environment - The environment to test (development, production, test)
 * @param {string} testPath - The path to test in the specified environment
 * @returns {Promise<void>} Promise resolving when environment-specific testing is complete
 */
async function testEnvironmentSpecificNotFoundBehavior(environment = 'development', testPath = '/env-test') {
    try {
        // Mock process environment to simulate specified environment
        const originalEnv = process.env.NODE_ENV;
        await testUtilities.mockProcessEnv({ NODE_ENV: environment });

        // Create not found handler with environment-specific configuration
        const environmentHandler = createNotFoundHandler({
            environment: environment,
            includeStackTrace: environment === 'development',
            verboseLogging: environment !== 'production'
        });

        // Execute not found handler with test path in simulated environment
        const mockRequest = createNotFoundTestRequest(testPath);
        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        await environmentHandler(mockRequest, mockResponse, mockNext);

        // Validate error response content matches environment expectations
        const responseData = mockResponse.jsonData;
        
        if (environment === 'development') {
            // Verify debug information inclusion for development environment
            ok(responseData.debug || responseData.stack,
                'Development environment should include debug information');
        } else if (environment === 'production') {
            // Assert minimal error information for production environment
            ok(!responseData.stack && !responseData.debug,
                'Production environment should not expose debug information');
        }

        // Test error message detail level for production vs development environments
        if (environment === 'production') {
            ok(responseData.message.includes('not found'),
                'Production error message should be user-friendly');
        } else {
            ok(responseData.message && responseData.path,
                'Development error message should include detailed information');
        }

        // Restore original environment
        await testUtilities.mockProcessEnv({ NODE_ENV: originalEnv });

        testLogger?.debug('Environment-specific behavior test completed', {
            environment: environment,
            testPath: testPath,
            responseIncludesDebug: Boolean(responseData.debug || responseData.stack)
        });

    } catch (error) {
        testLogger?.error('Environment-specific behavior test failed', {
            error: error.message,
            environment: environment,
            testPath: testPath
        });
        throw error;
    }
}

/**
 * Validates not found request logging functionality including log message structure,
 * level, and request context information for debugging support.
 * 
 * @param {object} mockRequest - Mock request object for logging validation
 * @param {object} expectedLogData - Expected log data structure and content
 */
function validateNotFoundLogging(mockRequest, expectedLogData = {}) {
    try {
        // Create mock logger to capture log output
        const logCapture = [];
        const mockLogger = {
            warn: (message, meta) => logCapture.push({ level: 'warn', message, meta }),
            error: (message, meta) => logCapture.push({ level: 'error', message, meta }),
            info: (message, meta) => logCapture.push({ level: 'info', message, meta })
        };

        // Execute logNotFoundRequest function with mock request object
        logNotFoundRequest(mockRequest, { logger: mockLogger });

        // Validate log level is set to WARN for 404 not found scenarios
        const warnLogs = logCapture.filter(log => log.level === 'warn');
        ok(warnLogs.length > 0, 'Should log with WARN level for 404 errors');

        // Assert log message includes request method, path, and client information
        const logEntry = warnLogs[0];
        ok(logEntry.message.includes('not found') || logEntry.message.includes('404'),
            'Log message should indicate not found scenario');

        // Verify log metadata includes correlation ID and timestamp information
        if (logEntry.meta) {
            ok(logEntry.meta.method || logEntry.meta.path,
                'Log metadata should include request method and path');
            ok(logEntry.meta.timestamp || logEntry.meta.requestId,
                'Log metadata should include timestamp or request ID');
        }

        // Validate log message format and structure for debugging purposes
        ok(typeof logEntry.message === 'string' && logEntry.message.length > 0,
            'Log message should be a non-empty string');

        testLogger?.debug('Not found logging validation completed', {
            logCount: logCapture.length,
            warnLogCount: warnLogs.length,
            hasMetadata: Boolean(logEntry.meta)
        });

    } catch (error) {
        testLogger?.error('Not found logging validation failed', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Tests create404Error utility function for generating standardized 404 error objects
 * with proper structure and metadata.
 * 
 * @param {object} mockRequest - Mock request object for error creation
 * @param {object} errorOptions - Error creation options and configuration
 */
function test404ErrorCreation(mockRequest, errorOptions = {}) {
    try {
        // Execute create404Error function with mock request and options
        const error404 = create404Error(mockRequest, errorOptions);

        // Validate error object structure includes name, message, status, and path
        ok(error404 instanceof Error, 'Should return Error instance');
        strictEqual(error404.name, 'NotFoundError', 'Error name should be NotFoundError');

        // Verify error message includes request path for debugging clarity
        ok(error404.message && error404.message.includes(mockRequest.path),
            'Error message should include the requested path');

        // Check error status property equals HTTP_STATUS.NOT_FOUND
        strictEqual(error404.statusCode || error404.status, HTTP_STATUS.NOT_FOUND,
            'Error status should be 404 Not Found');

        // Validate error metadata includes correlation ID and request context
        ok(error404.path === mockRequest.path,
            'Error should include the original request path');

        if (error404.correlationId || error404.requestId) {
            ok(typeof (error404.correlationId || error404.requestId) === 'string',
                'Correlation ID should be a string');
        }

        // Assert error object is ready for response formatting and transmission
        const errorData = {
            name: error404.name,
            message: error404.message,
            status: error404.statusCode || error404.status,
            path: error404.path
        };

        // Verify error can be serialized to JSON
        const serialized = JSON.stringify(errorData);
        ok(serialized && serialized.length > 0,
            'Error object should be JSON serializable');

        testLogger?.debug('404 error creation test completed', {
            errorName: error404.name,
            hasMessage: Boolean(error404.message),
            hasStatus: Boolean(error404.statusCode || error404.status),
            hasPath: Boolean(error404.path)
        });

    } catch (error) {
        testLogger?.error('404 error creation test failed', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Tests createNotFoundHandler factory function with various configuration options
 * and validates customized behavior.
 * 
 * @param {object} handlerConfig - Configuration options for the not found handler
 */
function testNotFoundHandlerConfiguration(handlerConfig = {}) {
    try {
        // Execute createNotFoundHandler with provided configuration options
        const customHandler = createNotFoundHandler(handlerConfig);

        // Validate returned middleware function has correct Express.js signature
        ok(typeof customHandler === 'function',
            'Should return a function for Express.js middleware');
        strictEqual(customHandler.length, 3,
            'Middleware function should accept req, res, next parameters');

        // Test configured logging options and output formatting
        const mockRequest = createNotFoundTestRequest('/config-test');
        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        // Execute custom handler to test configuration
        customHandler(mockRequest, mockResponse, mockNext);

        // Verify response formatting options are applied correctly
        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND,
            'Custom handler should set correct status code');

        if (mockResponse.jsonData) {
            const responseData = mockResponse.jsonData;

            // Check environment-specific behavior configuration settings
            if (handlerConfig.includeStackTrace) {
                ok(responseData.stack || responseData.debug,
                    'Should include stack trace when configured');
            }

            if (handlerConfig.customMessage) {
                ok(responseData.message.includes(handlerConfig.customMessage),
                    'Should include custom message when configured');
            }
        }

        // Test handler behavior with configured vs default settings
        const defaultHandler = createNotFoundHandler();
        ok(typeof defaultHandler === 'function',
            'Default handler should also be a valid function');

        testLogger?.debug('Not found handler configuration test completed', {
            isFunction: typeof customHandler === 'function',
            parameterCount: customHandler.length,
            hasConfig: Object.keys(handlerConfig).length > 0
        });

    } catch (error) {
        testLogger?.error('Not found handler configuration test failed', {
            error: error.message,
            handlerConfig: handlerConfig
        });
        throw error;
    }
}

/**
 * Validates getDefaultNotFoundConfig function returns appropriate default configuration
 * for educational tutorial application.
 */
function validateDefaultNotFoundConfig() {
    try {
        // Execute getDefaultNotFoundConfig function to retrieve default configuration
        const defaultConfig = getDefaultNotFoundConfig();

        // Validate configuration object structure includes required settings
        ok(defaultConfig && typeof defaultConfig === 'object',
            'Should return a configuration object');

        // Assert logging configuration has appropriate default log levels
        if (defaultConfig.logging) {
            ok(typeof defaultConfig.logging === 'object',
                'Logging configuration should be an object');
            ok(defaultConfig.logging.level,
                'Should include default log level');
        }

        // Verify response formatting defaults are suitable for development and learning
        if (defaultConfig.response) {
            ok(typeof defaultConfig.response === 'object',
                'Response configuration should be an object');
        }

        // Check environment-specific defaults for development vs production behavior
        if (defaultConfig.environment) {
            ok(typeof defaultConfig.environment === 'object',
                'Environment configuration should be an object');
        }

        // Validate timeout and performance defaults are appropriate for tutorial use
        if (defaultConfig.timeouts) {
            ok(typeof defaultConfig.timeouts === 'object',
                'Timeout configuration should be an object');
            ok(typeof defaultConfig.timeouts.response === 'number',
                'Response timeout should be a number');
        }

        // Assert configuration completeness and educational value alignment
        const requiredFields = ['logging', 'response'];
        const hasRequiredFields = requiredFields.every(field => 
            defaultConfig.hasOwnProperty(field));

        ok(hasRequiredFields || Object.keys(defaultConfig).length > 0,
            'Default configuration should have required fields or be non-empty');

        testLogger?.debug('Default not found config validation completed', {
            isObject: typeof defaultConfig === 'object',
            configKeys: Object.keys(defaultConfig),
            hasLogging: Boolean(defaultConfig.logging),
            hasResponse: Boolean(defaultConfig.response)
        });

    } catch (error) {
        testLogger?.error('Default not found config validation failed', {
            error: error.message
        });
        throw error;
    }
}

// Main test suite for notFoundHandler middleware with comprehensive testing scenarios
describe('notFoundHandler Middleware', () => {
    
    // Set up test environment before each test execution
    beforeEach(async () => {
        await setupTestEnvironment();
    });

    // Clean up test environment after each test execution
    afterEach(async () => {
        await teardownTestEnvironment();
    });

    // Test basic not found handler functionality with 404 response
    test('should handle not found requests with 404 status', async () => {
        const mockRequest = createNotFoundTestRequest('/nonexistent');
        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        await notFoundHandler(mockRequest, mockResponse, mockNext);

        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND);
        ok(mockResponse.jsonData);
        ok(mockResponse.jsonData.error);
        ok(!mockNext.called, 'Next should not be called for handled 404 errors');
    }, { timeout: TEST_TIMEOUT });

    // Test not found handler with various HTTP methods
    test('should handle not found requests for all HTTP methods', async () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        
        for (const method of methods) {
            const mockRequest = createNotFoundTestRequest('/test-method', { method });
            const mockResponse = createMockResponse();
            const mockNext = createMockNext();

            await notFoundHandler(mockRequest, mockResponse, mockNext);

            strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND,
                `Should return 404 for ${method} method`);
            validateNotFoundResponse(mockResponse, '/test-method');
        }
    }, { timeout: TEST_TIMEOUT });

    // Test createNotFoundHandler factory function with custom configuration
    test('should create customized not found handler with configuration', async () => {
        const config = {
            includeStackTrace: true,
            customMessage: 'Custom not found message',
            logLevel: 'warn'
        };

        testNotFoundHandlerConfiguration(config);

        const customHandler = createNotFoundHandler(config);
        const mockRequest = createNotFoundTestRequest('/custom-test');
        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        await customHandler(mockRequest, mockResponse, mockNext);

        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND);
        ok(mockResponse.jsonData);
    }, { timeout: TEST_TIMEOUT });

    // Test not found request logging functionality
    test('should log not found requests with appropriate level', async () => {
        const mockRequest = createNotFoundTestRequest('/logging-test');
        
        validateNotFoundLogging(mockRequest);

        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        await notFoundHandler(mockRequest, mockResponse, mockNext);

        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND);
    }, { timeout: TEST_TIMEOUT });

    // Test 404 error object creation utility
    test('should create standardized 404 error objects', async () => {
        const mockRequest = createNotFoundTestRequest('/error-creation-test');
        
        test404ErrorCreation(mockRequest);

        const error404 = create404Error(mockRequest);
        ok(error404 instanceof Error);
        strictEqual(error404.statusCode || error404.status, HTTP_STATUS.NOT_FOUND);
    }, { timeout: TEST_TIMEOUT });

    // Test default configuration retrieval
    test('should provide appropriate default configuration', async () => {
        validateDefaultNotFoundConfig();

        const defaultConfig = getDefaultNotFoundConfig();
        ok(defaultConfig);
        ok(typeof defaultConfig === 'object');
    }, { timeout: TEST_TIMEOUT });

    // Test performance characteristics of not found handler
    test('should process not found requests within performance thresholds', async () => {
        const performanceResult = await testNotFoundMiddlewarePerformance('/performance-test', {
            maxExecutionTime: 50 // 50ms threshold
        });

        ok(performanceResult.performanceValid,
            `Execution time ${performanceResult.executionTime}ms should be under threshold`);
        ok(performanceResult.result.statusCode === HTTP_STATUS.NOT_FOUND);
    }, { timeout: TEST_TIMEOUT });

    // Test environment-specific behavior
    test('should behave appropriately in different environments', async () => {
        await testEnvironmentSpecificNotFoundBehavior('development', '/dev-test');
        await testEnvironmentSpecificNotFoundBehavior('production', '/prod-test');
        await testEnvironmentSpecificNotFoundBehavior('test', '/test-env');

        testLogger?.info('Environment-specific behavior tests completed');
    }, { timeout: TEST_TIMEOUT });

    // Test response structure validation
    test('should generate properly structured error responses', async () => {
        const testPath = '/structure-test';
        const mockRequest = createNotFoundTestRequest(testPath);
        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        await notFoundHandler(mockRequest, mockResponse, mockNext);

        validateNotFoundResponse(mockResponse, testPath);

        const responseData = mockResponse.jsonData;
        strictEqual(responseData.path, testPath);
        ok(responseData.timestamp);
        ok(responseData.message);
    }, { timeout: TEST_TIMEOUT });

    // Test integration with Express.js middleware pipeline
    test('should integrate properly with Express.js middleware pipeline', async () => {
        const middlewareStack = [];
        
        // Simulate middleware pipeline
        const mockRequest = createNotFoundTestRequest('/pipeline-test');
        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        // Execute not found handler as final middleware
        await notFoundHandler(mockRequest, mockResponse, mockNext);

        // Validate middleware behavior
        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND);
        ok(!mockNext.called, 'Should not call next() for terminal 404 handling');
        ok(mockResponse.jsonData, 'Should generate JSON response');
    }, { timeout: TEST_TIMEOUT });

    // Test edge cases and boundary conditions
    test('should handle edge cases and malformed requests', async () => {
        const edgeCases = [
            { path: '', description: 'empty path' },
            { path: '/', description: 'root path' },
            { path: '/very/long/path/that/does/not/exist', description: 'long path' },
            { path: '/path/with/special/chars/@#$%', description: 'special characters' },
            { path: decodeURIComponent('/path/with/unicode/测试'), description: 'unicode characters' }
        ];

        for (const testCase of edgeCases) {
            const mockRequest = createNotFoundTestRequest(testCase.path);
            const mockResponse = createMockResponse();
            const mockNext = createMockNext();

            await notFoundHandler(mockRequest, mockResponse, mockNext);

            strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND,
                `Should handle ${testCase.description}`);
            ok(mockResponse.jsonData, `Should generate response for ${testCase.description}`);
        }
    }, { timeout: TEST_TIMEOUT });
});

// Additional integration tests for comprehensive middleware validation
describe('notFoundHandler Integration Tests', () => {

    beforeEach(async () => {
        await setupTestEnvironment();
    });

    afterEach(async () => {
        await teardownTestEnvironment();
    });

    // Test interaction with other middleware components
    test('should work correctly with other middleware components', async () => {
        const mockRequest = createNotFoundTestRequest('/integration-test');
        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        // Simulate request logger middleware interaction
        mockRequest.requestId = 'test-request-123';
        mockRequest.startTime = Date.now();

        await notFoundHandler(mockRequest, mockResponse, mockNext);

        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND);
        
        const responseData = mockResponse.jsonData;
        ok(responseData.correlationId || responseData.requestId,
            'Should preserve request correlation information');
    }, { timeout: TEST_TIMEOUT });

    // Test error propagation and handling
    test('should handle errors during 404 processing gracefully', async () => {
        // Create mock request that might cause processing errors
        const mockRequest = createNotFoundTestRequest('/error-handling-test');
        mockRequest.headers = null; // Simulate malformed request

        const mockResponse = createMockResponse();
        const mockNext = createMockNext();

        // Should not throw unhandled errors
        await notFoundHandler(mockRequest, mockResponse, mockNext);

        // Should still generate appropriate 404 response
        strictEqual(mockResponse.statusCode, HTTP_STATUS.NOT_FOUND);
    }, { timeout: TEST_TIMEOUT });
});

// Performance and load testing for not found handler
describe('notFoundHandler Performance Tests', () => {

    beforeEach(async () => {
        await setupTestEnvironment();
    });

    afterEach(async () => {
        await teardownTestEnvironment();
    });

    // Test concurrent request handling
    test('should handle concurrent not found requests efficiently', async () => {
        const concurrentRequests = 10;
        const requests = [];

        for (let i = 0; i < concurrentRequests; i++) {
            const mockRequest = createNotFoundTestRequest(`/concurrent-test-${i}`);
            const mockResponse = createMockResponse();
            const mockNext = createMockNext();

            requests.push(notFoundHandler(mockRequest, mockResponse, mockNext)
                .then(() => ({ statusCode: mockResponse.statusCode, index: i })));
        }

        const results = await Promise.all(requests);

        // Validate all requests processed successfully
        results.forEach((result, index) => {
            strictEqual(result.statusCode, HTTP_STATUS.NOT_FOUND,
                `Concurrent request ${index} should return 404`);
        });

        testLogger?.info('Concurrent request handling test completed', {
            requestCount: concurrentRequests,
            allProcessed: results.length === concurrentRequests
        });
    }, { timeout: TEST_TIMEOUT * 2 });

    // Test memory usage during processing
    test('should maintain stable memory usage during processing', async () => {
        const initialMemory = process.memoryUsage();
        
        // Process multiple requests to test memory stability
        for (let i = 0; i < 100; i++) {
            const mockRequest = createNotFoundTestRequest(`/memory-test-${i}`);
            const mockResponse = createMockResponse();
            const mockNext = createMockNext();

            await notFoundHandler(mockRequest, mockResponse, mockNext);
        }

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        // Memory increase should be reasonable (less than 10MB for 100 requests)
        ok(memoryIncrease < 10 * 1024 * 1024,
            `Memory increase ${memoryIncrease} bytes should be reasonable`);

        testLogger?.info('Memory usage test completed', {
            initialHeap: initialMemory.heapUsed,
            finalHeap: finalMemory.heapUsed,
            increase: memoryIncrease
        });
    }, { timeout: TEST_TIMEOUT * 3 });
});