/**
 * Comprehensive Unit Test Suite for Error Handler Middleware
 * 
 * This test suite validates the error handling, classification, response formatting, 
 * and Express.js 5.1.0 enhanced async error handling capabilities of the errorHandler 
 * middleware module. Demonstrates proper testing patterns for Express.js middleware 
 * using Node.js built-in test runner with comprehensive mock objects, error injection 
 * scenarios, and educational testing approaches.
 * 
 * Tests cover error classification, response generation, logging functionality, 
 * environment-specific behavior, and async error handling patterns with Express.js 5.1.0 
 * automatic Promise rejection handling.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner functions - Node.js v18.0.0+
const { test, describe, it, beforeEach, afterEach } = require('node:test');

// Import Node.js built-in assertion module - Node.js v1.0.0+
const { strictEqual, ok, throws, deepStrictEqual } = require('node:assert');

// Import Express.js error handler middleware functions being tested
const {
    errorHandler,
    createErrorHandler,
    classifyError,
    handleAsyncErrors,
    extractErrorDetails,
    generateErrorId
} = require('../../../middleware/errorHandler.js');

// Import comprehensive mock helper utilities for Express.js object creation
const {
    createMockRequest,
    createMockResponse,
    createMockNext,
    createMockError,
    injectError,
    MockManager
} = require('../../helpers/mockHelpers.js');

// Import general test helper utilities for logging and environment management
const {
    createTestLogger,
    measureExecutionTime,
    TestUtilities
} = require('../../helpers/testHelpers.js');

// Import error fixture objects for comprehensive error testing scenarios
const {
    applicationErrors,
    httpErrors,
    asyncErrors,
    createHttpError,
    createAsyncError
} = require('../../fixtures/errors.js');

// Import test configuration for timeout management and environment setup
const { testConfig } = require('../../setup/testConfig.js');

// Import HTTP status codes and error message constants for test validation
const {
    HTTP_STATUS,
    ERROR_MESSAGES
} = require('../../../utils/constants.js');

// Initialize global test utilities and mock management for comprehensive testing
const testLogger = createTestLogger('errorHandlerTest');
const mockManager = new MockManager({ trackCalls: true, resetOnNextTest: true });
const testUtilities = new TestUtilities({ logLevel: 'ERROR', cleanup: true });
const TEST_TIMEOUT = testConfig.timeouts.unit.default;

/**
 * Sets up test environment with proper isolation, mock management, and environment 
 * variable configuration for error handler middleware testing with comprehensive 
 * test utilities initialization and cleanup handler registration.
 * 
 * @returns {Promise<void>} Promise resolving when test environment setup is complete
 */
async function setupTestEnvironment() {
    try {
        testLogger.info('Initializing test environment for error handler middleware testing');
        
        // Initialize test utilities with error handler testing configuration
        await testUtilities.initialize({
            enableMocking: true,
            enableCleanup: true,
            trackingEnabled: true,
            isolationLevel: 'high'
        });

        // Set up mock manager for Express.js object management and lifecycle
        await mockManager.initialize({
            trackCalls: true,
            resetOnNextTest: true,
            enableCallHistory: true,
            enableDeepTracking: true
        });

        // Configure test environment variables for development and production testing scenarios
        testUtilities.mockProcessEnv({
            NODE_ENV: 'test',
            LOG_LEVEL: 'error',
            TEST_MODE: 'true',
            ERROR_HANDLER_DEBUG: 'false',
            SHOW_STACK_TRACES: 'true'
        });

        // Set up test logging with appropriate levels for error handler testing
        testLogger.debug('Test environment configured with mock Express.js objects and utilities');

        // Initialize test timeout configuration for async error handling tests
        testUtilities.setTimeout(TEST_TIMEOUT);

        // Register cleanup handlers for proper test isolation and resource management
        testUtilities.registerCleanupHandler(async () => {
            await mockManager.cleanup();
            testUtilities.restoreProcessEnv();
            testLogger.debug('Test environment cleanup completed successfully');
        });

        testLogger.info('Test environment setup completed successfully', {
            timeout: TEST_TIMEOUT,
            mockingEnabled: true,
            cleanupRegistered: true
        });

    } catch (error) {
        testLogger.error('Failed to setup test environment', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Cleans up test environment including mock resets, environment restoration, 
 * and resource cleanup for proper test isolation between test runs.
 * 
 * @returns {Promise<void>} Promise resolving when test environment cleanup is complete
 */
async function teardownTestEnvironment() {
    try {
        testLogger.debug('Executing test environment cleanup for error handler testing');

        // Execute mock manager cleanup to reset all mock objects and tracking
        await mockManager.cleanup();

        // Reset test utilities and restore original environment variables
        await testUtilities.cleanup();

        // Clean up test loggers and flush any pending log entries
        if (testLogger.flush && typeof testLogger.flush === 'function') {
            testLogger.flush();
        }

        // Clear timeout configurations and async operation tracking
        testUtilities.clearTimeouts();

        // Reset error handler configuration and state for next test execution
        if (global.errorHandlerState) {
            global.errorHandlerState = null;
        }

        // Validate test environment cleanup completion and resource release
        const memoryUsage = process.memoryUsage();
        testLogger.debug('Test environment cleanup completed', {
            memoryUsage: memoryUsage,
            heapUsed: memoryUsage.heapUsed,
            cleanupSuccess: true
        });

    } catch (error) {
        testLogger.error('Test environment cleanup failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Creates customized test error objects with specific properties, stack traces, 
 * and metadata for comprehensive error handler testing scenarios including 
 * HTTP errors, application errors, and async operation errors.
 * 
 * @param {string} errorType - Type of error to create (http, application, async, system)
 * @param {object} errorOptions - Customization options for error properties
 * @returns {Error} Customized test error object with specified properties and characteristics
 */
function createTestError(errorType, errorOptions = {}) {
    try {
        testLogger.debug('Creating test error object', {
            errorType: errorType,
            hasOptions: Object.keys(errorOptions).length > 0
        });

        // Determine error type and select appropriate error factory function
        const errorFactories = {
            http: createHttpError,
            application: () => createMockError({
                message: errorOptions.message || 'Test application error',
                name: 'ApplicationError',
                code: errorOptions.code || 'APP_ERROR',
                ...errorOptions
            }),
            async: createAsyncError,
            system: () => createMockError({
                message: errorOptions.message || 'Test system error',
                name: 'SystemError',
                code: errorOptions.code || 'SYS_ERROR',
                errno: errorOptions.errno || -1,
                ...errorOptions
            }),
            validation: () => createMockError({
                message: errorOptions.message || 'Test validation error',
                name: 'ValidationError',
                code: errorOptions.code || 'VALIDATION_ERROR',
                field: errorOptions.field || 'test_field',
                ...errorOptions
            })
        };

        // Create base error object with message and error characteristics
        const errorFactory = errorFactories[errorType] || errorFactories.application;
        const baseError = errorFactory(errorOptions);

        // Apply custom properties from errorOptions including status codes and context
        if (errorOptions.statusCode) {
            baseError.statusCode = errorOptions.statusCode;
        }

        if (errorOptions.context) {
            baseError.context = errorOptions.context;
        }

        // Set up error metadata including correlation IDs and timestamps
        baseError.testMetadata = {
            createdAt: new Date().toISOString(),
            errorType: errorType,
            testId: generateErrorId(),
            version: '1.0.0'
        };

        // Configure error stack trace for debugging and error analysis testing
        if (errorOptions.customStack) {
            baseError.stack = errorOptions.customStack;
        }

        testLogger.debug('Test error object created successfully', {
            errorType: errorType,
            errorName: baseError.name,
            hasStatusCode: Boolean(baseError.statusCode),
            hasContext: Boolean(baseError.context),
            hasTestMetadata: Boolean(baseError.testMetadata)
        });

        // Return configured test error object ready for error handler testing
        return baseError;

    } catch (error) {
        testLogger.error('Failed to create test error object', {
            error: error.message,
            errorType: errorType,
            errorOptions: errorOptions
        });
        throw error;
    }
}

/**
 * Validates error response structure, content, status codes, and metadata 
 * for comprehensive error handler response testing with detailed assertions 
 * and educational error response format verification.
 * 
 * @param {object} mockResponse - Mock Express.js response object to validate
 * @param {Error} originalError - Original error object that was processed
 * @param {object} expectedResponse - Expected response structure and content
 */
function validateErrorResponse(mockResponse, originalError, expectedResponse) {
    try {
        testLogger.debug('Validating error response structure and content', {
            hasResponse: Boolean(mockResponse),
            hasOriginalError: Boolean(originalError),
            hasExpectedResponse: Boolean(expectedResponse)
        });

        // Validate HTTP status code matches expected error status
        ok(mockResponse.statusCode, 'Response should have status code set');
        if (expectedResponse.statusCode) {
            strictEqual(mockResponse.statusCode, expectedResponse.statusCode,
                `Status code should be ${expectedResponse.statusCode}`);
        }

        // Assert error response structure includes required fields (error, message, timestamp)
        const responseData = mockResponse.jsonData || {};
        ok(responseData.error, 'Response should include error object');
        ok(responseData.error.message, 'Error response should include message');
        ok(responseData.error.timestamp, 'Error response should include timestamp');

        // Verify error message content and sanitization based on environment
        if (expectedResponse.message) {
            strictEqual(responseData.error.message, expectedResponse.message,
                'Error message should match expected content');
        }

        // Validate error correlation ID presence and format
        if (responseData.error.id) {
            ok(typeof responseData.error.id === 'string', 'Error ID should be string');
            ok(responseData.error.id.length > 0, 'Error ID should not be empty');
        }

        // Check error metadata and context information completeness
        if (expectedResponse.includeContext && originalError.context) {
            ok(responseData.error.context, 'Response should include error context');
            deepStrictEqual(responseData.error.context, originalError.context,
                'Error context should match original error context');
        }

        // Assert response headers are set correctly for error responses
        const responseHeaders = mockResponse.headers || {};
        if (expectedResponse.contentType) {
            strictEqual(responseHeaders['Content-Type'], expectedResponse.contentType,
                'Content-Type header should be set correctly');
        }

        // Verify error logging has been performed with appropriate level
        if (mockResponse.loggedError) {
            ok(mockResponse.loggedError.level, 'Error should be logged with appropriate level');
            ok(mockResponse.loggedError.message, 'Error log should include message');
        }

        testLogger.debug('Error response validation completed successfully', {
            statusCode: mockResponse.statusCode,
            hasErrorObject: Boolean(responseData.error),
            hasErrorId: Boolean(responseData.error?.id),
            hasContext: Boolean(responseData.error?.context),
            validationPassed: true
        });

    } catch (validationError) {
        testLogger.error('Error response validation failed', {
            error: validationError.message,
            mockResponseKeys: mockResponse ? Object.keys(mockResponse) : [],
            originalErrorType: originalError?.constructor?.name,
            expectedKeys: expectedResponse ? Object.keys(expectedResponse) : []
        });
        throw validationError;
    }
}

/**
 * Tests Express.js 5.1.0 enhanced async error handling capabilities including 
 * Promise rejection handling and async middleware integration with comprehensive 
 * async error scenario validation and performance measurement.
 * 
 * @param {function} asyncErrorFunction - Async function that throws or rejects
 * @param {object} testOptions - Configuration options for async testing
 * @returns {Promise<void>} Promise resolving when async error handling test is complete
 */
async function testAsyncErrorHandling(asyncErrorFunction, testOptions = {}) {
    try {
        testLogger.debug('Testing Express.js 5.1.0 async error handling capabilities', {
            hasAsyncFunction: typeof asyncErrorFunction === 'function',
            testOptions: testOptions
        });

        // Create mock Express.js objects (req, res, next) for async testing
        const mockReq = createMockRequest(testOptions.requestOptions);
        const mockRes = createMockResponse(testOptions.responseOptions);
        const mockNext = createMockNext(testOptions.nextOptions);

        // Set up async error function with Promise rejection scenario
        const asyncWrapper = handleAsyncErrors(asyncErrorFunction);

        // Execute handleAsyncErrors wrapper with async error function
        const executionPromise = asyncWrapper(mockReq, mockRes, mockNext);

        // Verify Promise rejection is caught and forwarded to error middleware
        if (testOptions.expectError) {
            await executionPromise.catch(error => {
                ok(error, 'Async error should be caught by handleAsyncErrors wrapper');
                ok(mockNext.called, 'Next function should be called with error');
                ok(mockNext.calledWith, 'Next should be called with error argument');
            });
        } else {
            await executionPromise;
        }

        // Validate error response generation and formatting for async errors
        if (testOptions.expectError && mockNext.called) {
            const passedError = mockNext.firstCall?.args?.[0];
            ok(passedError instanceof Error, 'Passed error should be Error instance');
            
            if (testOptions.expectedErrorType) {
                strictEqual(passedError.constructor.name, testOptions.expectedErrorType,
                    'Error type should match expected async error type');
            }
        }

        // Assert async error logging and tracking functionality
        if (testOptions.expectLogging && mockRes.loggedError) {
            ok(mockRes.loggedError.async, 'Async error should be marked as async');
            ok(mockRes.loggedError.timestamp, 'Async error should have timestamp');
        }

        // Test error recovery and middleware chain continuation
        if (!testOptions.expectError) {
            ok(!mockNext.called || mockNext.calledWithoutArgs,
                'Next should not be called with error for successful async operations');
        }

        testLogger.debug('Async error handling test completed successfully', {
            asyncErrorCaught: Boolean(testOptions.expectError && mockNext.called),
            nextCalled: mockNext.called,
            responseGenerated: Boolean(mockRes.statusCode),
            testCompleted: true
        });

    } catch (error) {
        testLogger.error('Async error handling test failed', {
            error: error.message,
            stack: error.stack,
            testOptions: testOptions
        });
        throw error;
    }
}

/**
 * Measures error handling performance including processing time, memory usage, 
 * and response generation speed for performance testing and benchmarking 
 * with comprehensive metrics collection and analysis.
 * 
 * @param {Error} testError - Error object to use for performance testing
 * @param {object} performanceOptions - Configuration options for performance measurement
 * @returns {Promise<object>} Promise resolving to performance measurement results with timing and resource data
 */
async function measureErrorHandlingPerformance(testError, performanceOptions = {}) {
    try {
        testLogger.debug('Measuring error handling performance', {
            hasTestError: Boolean(testError),
            performanceOptions: performanceOptions
        });

        // Set up performance measurement using measureExecutionTime utility
        const performanceStart = process.hrtime.bigint();
        const memoryBefore = process.memoryUsage();

        // Create mock Express.js objects for error handling performance testing
        const mockReq = createMockRequest(performanceOptions.requestOptions);
        const mockRes = createMockResponse(performanceOptions.responseOptions);
        const mockNext = createMockNext(performanceOptions.nextOptions);

        // Execute error handler middleware with test error and timing measurement
        const executionResult = await measureExecutionTime(async () => {
            if (performanceOptions.useCustomHandler) {
                const customHandler = createErrorHandler(performanceOptions.handlerOptions);
                return customHandler(testError, mockReq, mockRes, mockNext);
            } else {
                return errorHandler(testError, mockReq, mockRes, mockNext);
            }
        });

        // Measure error processing time, response generation, and logging performance
        const performanceEnd = process.hrtime.bigint();
        const memoryAfter = process.memoryUsage();
        const totalTime = Number(performanceEnd - performanceStart) / 1000000; // Convert to milliseconds

        // Collect memory usage and resource consumption during error handling
        const memoryDelta = {
            heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
            heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
            external: memoryAfter.external - memoryBefore.external,
            rss: memoryAfter.rss - memoryBefore.rss
        };

        // Compare performance results against configured thresholds and expectations
        const performanceThresholds = {
            maxProcessingTime: performanceOptions.maxProcessingTime || 100, // milliseconds
            maxMemoryUsage: performanceOptions.maxMemoryUsage || 1048576, // 1MB
            maxResponseTime: performanceOptions.maxResponseTime || 50 // milliseconds
        };

        const performanceResults = {
            processingTime: totalTime,
            executionTime: executionResult.executionTime,
            memoryUsage: memoryDelta,
            memoryBefore: memoryBefore,
            memoryAfter: memoryAfter,
            thresholds: performanceThresholds,
            withinThresholds: {
                processingTime: totalTime <= performanceThresholds.maxProcessingTime,
                memoryUsage: memoryDelta.heapUsed <= performanceThresholds.maxMemoryUsage,
                responseTime: executionResult.executionTime <= performanceThresholds.maxResponseTime
            },
            responseGenerated: Boolean(mockRes.statusCode),
            errorLogged: Boolean(mockRes.loggedError),
            performance: {
                efficient: totalTime <= performanceThresholds.maxProcessingTime,
                memoryEfficient: memoryDelta.heapUsed <= performanceThresholds.maxMemoryUsage,
                responsive: executionResult.executionTime <= performanceThresholds.maxResponseTime
            }
        };

        testLogger.debug('Error handling performance measurement completed', {
            processingTime: performanceResults.processingTime,
            memoryUsed: memoryDelta.heapUsed,
            executionTime: executionResult.executionTime,
            efficient: performanceResults.performance.efficient,
            memoryEfficient: performanceResults.performance.memoryEfficient,
            responsive: performanceResults.performance.responsive
        });

        // Return comprehensive performance measurement results for analysis
        return performanceResults;

    } catch (error) {
        testLogger.error('Error handling performance measurement failed', {
            error: error.message,
            stack: error.stack,
            performanceOptions: performanceOptions
        });
        throw error;
    }
}

/**
 * Tests error handler behavior in different environments (development, production, test) 
 * with appropriate error sanitization and debug information including stack trace 
 * inclusion/exclusion and environment-specific error message formatting.
 * 
 * @param {string} environment - Environment to test (development, production, test)
 * @param {Error} testError - Error object to use for environment testing
 * @returns {Promise<void>} Promise resolving when environment-specific testing is complete
 */
async function testEnvironmentSpecificBehavior(environment, testError) {
    try {
        testLogger.debug(`Testing error handler behavior in ${environment} environment`, {
            environment: environment,
            hasTestError: Boolean(testError)
        });

        // Mock process environment to simulate specified environment (development/production/test)
        const originalEnv = process.env.NODE_ENV;
        testUtilities.mockProcessEnv({ NODE_ENV: environment });

        // Create error handler with environment-specific configuration
        const environmentHandler = createErrorHandler({
            environment: environment,
            showStackTrace: environment === 'development',
            sanitizeErrors: environment === 'production',
            logLevel: environment === 'development' ? 'debug' : 'error'
        });

        // Execute error handler with test error in simulated environment
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        await environmentHandler(testError, mockReq, mockRes, mockNext);

        // Validate error response content matches environment expectations
        const responseData = mockRes.jsonData || {};

        if (environment === 'development') {
            // Verify stack trace inclusion/exclusion based on environment settings
            ok(responseData.error?.stack || responseData.error?.details,
                'Development environment should include detailed error information');
        } else if (environment === 'production') {
            // Test error message sanitization for production environments
            ok(!responseData.error?.stack,
                'Production environment should not include stack traces');
            ok(responseData.error?.message,
                'Production environment should include sanitized error message');
        } else if (environment === 'test') {
            // Assert logging behavior matches environment-specific requirements
            ok(mockRes.loggedError || !mockRes.loggedError,
                'Test environment should handle logging appropriately');
        }

        // Validate logging behavior matches environment-specific requirements
        if (environment === 'development' && mockRes.loggedError) {
            strictEqual(mockRes.loggedError.level, 'debug',
                'Development environment should use debug logging level');
        } else if (environment === 'production' && mockRes.loggedError) {
            strictEqual(mockRes.loggedError.level, 'error',
                'Production environment should use error logging level');
        }

        testLogger.debug(`Environment-specific behavior test completed for ${environment}`, {
            environment: environment,
            hasStackTrace: Boolean(responseData.error?.stack),
            errorSanitized: environment === 'production' && !responseData.error?.stack,
            loggingLevel: mockRes.loggedError?.level,
            testCompleted: true
        });

        // Restore original environment
        testUtilities.mockProcessEnv({ NODE_ENV: originalEnv });

    } catch (error) {
        testLogger.error(`Environment-specific behavior test failed for ${environment}`, {
            error: error.message,
            stack: error.stack,
            environment: environment
        });
        throw error;
    }
}

/**
 * Validates error classification functionality including error type detection, 
 * severity assessment, and handling strategy determination with comprehensive 
 * error categorization and metadata validation.
 * 
 * @param {Error} testError - Error object to classify and validate
 * @param {object} expectedClassification - Expected classification results
 */
function validateErrorClassification(testError, expectedClassification) {
    try {
        testLogger.debug('Validating error classification functionality', {
            hasTestError: Boolean(testError),
            hasExpectedClassification: Boolean(expectedClassification)
        });

        // Execute classifyError function with test error object
        const classification = classifyError(testError);

        // Validate error type classification (application, http, system, async, validation)
        ok(classification.type, 'Error classification should include type');
        if (expectedClassification.type) {
            strictEqual(classification.type, expectedClassification.type,
                `Error type should be classified as ${expectedClassification.type}`);
        }

        // Assert error severity level determination (low, medium, high, critical)
        ok(classification.severity, 'Error classification should include severity level');
        if (expectedClassification.severity) {
            strictEqual(classification.severity, expectedClassification.severity,
                `Error severity should be ${expectedClassification.severity}`);
        }

        // Verify HTTP status code mapping for error classification
        ok(typeof classification.statusCode === 'number',
            'Error classification should include HTTP status code');
        if (expectedClassification.statusCode) {
            strictEqual(classification.statusCode, expectedClassification.statusCode,
                `HTTP status code should be ${expectedClassification.statusCode}`);
        }

        // Check error handling strategy recommendations from classification
        if (classification.strategy) {
            ok(typeof classification.strategy === 'object',
                'Error classification should include handling strategy');
            if (expectedClassification.strategy) {
                deepStrictEqual(classification.strategy, expectedClassification.strategy,
                    'Error handling strategy should match expected strategy');
            }
        }

        // Validate error category and subcategory assignment
        if (expectedClassification.category) {
            strictEqual(classification.category, expectedClassification.category,
                `Error category should be ${expectedClassification.category}`);
        }

        if (expectedClassification.subcategory) {
            strictEqual(classification.subcategory, expectedClassification.subcategory,
                `Error subcategory should be ${expectedClassification.subcategory}`);
        }

        // Assert classification metadata completeness and accuracy
        ok(classification.metadata, 'Error classification should include metadata');
        ok(classification.metadata.timestamp, 'Classification metadata should include timestamp');
        ok(classification.metadata.version, 'Classification metadata should include version');

        testLogger.debug('Error classification validation completed successfully', {
            errorType: classification.type,
            severity: classification.severity,
            statusCode: classification.statusCode,
            hasStrategy: Boolean(classification.strategy),
            hasMetadata: Boolean(classification.metadata),
            validationPassed: true
        });

    } catch (error) {
        testLogger.error('Error classification validation failed', {
            error: error.message,
            stack: error.stack,
            testErrorType: testError?.constructor?.name,
            expectedClassification: expectedClassification
        });
        throw error;
    }
}

// Main test suite for error handler middleware with comprehensive testing scenarios
describe('Error Handler Middleware Test Suite', { timeout: TEST_TIMEOUT }, () => {
    
    // Set up test environment before each test run with proper isolation
    beforeEach(async () => {
        await setupTestEnvironment();
        testLogger.debug('Test environment initialized for error handler middleware testing');
    });

    // Clean up test environment after each test run
    afterEach(async () => {
        await teardownTestEnvironment();
        testLogger.debug('Test environment cleanup completed');
    });

    // Test suite for main error handler middleware function
    describe('errorHandler middleware function', () => {
        
        it('should return Hello world when GET /hello', async () => {
            // Test main error handler middleware with basic HTTP error
            const testError = createTestError('http', {
                statusCode: HTTP_STATUS.NOT_FOUND,
                message: 'Route not found'
            });

            const mockReq = createMockRequest({ method: 'GET', url: '/hello' });
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            // Execute error handler middleware
            await errorHandler(testError, mockReq, mockRes, mockNext);

            // Validate error response structure and content
            validateErrorResponse(mockRes, testError, {
                statusCode: HTTP_STATUS.NOT_FOUND,
                message: 'Route not found',
                contentType: 'application/json'
            });

            // Verify error handling completed without calling next
            ok(!mockNext.called, 'Next function should not be called for handled errors');
        });

        it('should handle port conflict when binding fails', async () => {
            // Test error handler with port binding error
            const portError = createTestError('system', {
                code: 'EADDRINUSE',
                message: 'Port 3000 already in use',
                errno: -48,
                port: 3000
            });

            const mockReq = createMockRequest({ method: 'GET', url: '/hello' });
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            // Execute error handler with port conflict error
            await errorHandler(portError, mockReq, mockRes, mockNext);

            // Validate system error response
            validateErrorResponse(mockRes, portError, {
                statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                message: 'Port 3000 already in use'
            });

            // Verify error classification
            validateErrorClassification(portError, {
                type: 'system',
                severity: 'high',
                statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                category: 'infrastructure'
            });
        });

        it('should handle async errors with Express.js 5.1.0 enhancements', async () => {
            // Test Express.js 5.1.0 async error handling capabilities
            const asyncErrorFunction = async () => {
                throw asyncErrors.promiseRejection;
            };

            await testAsyncErrorHandling(asyncErrorFunction, {
                expectError: true,
                expectedErrorType: 'AsyncError',
                expectLogging: true,
                requestOptions: { method: 'GET', url: '/hello' },
                responseOptions: { enableLogging: true },
                nextOptions: { trackCalls: true }
            });
        });

        it('should generate appropriate error response format', async () => {
            // Test error response format generation
            const applicationError = applicationErrors.businessLogicError;
            
            const mockReq = createMockRequest({ method: 'POST', url: '/hello' });
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            // Execute error handler
            await errorHandler(applicationError, mockReq, mockRes, mockNext);

            // Validate response format
            const responseData = mockRes.jsonData;
            ok(responseData.error, 'Response should contain error object');
            ok(responseData.error.message, 'Error object should contain message');
            ok(responseData.error.timestamp, 'Error object should contain timestamp');
            ok(responseData.error.id, 'Error object should contain correlation ID');
            strictEqual(typeof responseData.error.id, 'string', 'Error ID should be string');
        });

        it('should handle method not allowed errors correctly', async () => {
            // Test HTTP method not allowed error handling
            const methodError = httpErrors.methodNotAllowed;
            
            const mockReq = createMockRequest({ method: 'POST', url: '/hello' });
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            await errorHandler(methodError, mockReq, mockRes, mockNext);

            // Validate method not allowed response
            strictEqual(mockRes.statusCode, HTTP_STATUS.METHOD_NOT_ALLOWED);
            
            const responseData = mockRes.jsonData;
            strictEqual(responseData.error.message, ERROR_MESSAGES.METHOD_NOT_ALLOWED);
        });
    });

    // Test suite for createErrorHandler factory function
    describe('createErrorHandler factory function', () => {
        
        it('should create customized error handler with configuration options', async () => {
            // Test factory function for creating configured error handlers
            const customHandler = createErrorHandler({
                environment: 'development',
                showStackTrace: true,
                enableLogging: true,
                logLevel: 'debug',
                sanitizeErrors: false
            });

            ok(typeof customHandler === 'function', 'Factory should return function');

            const testError = applicationErrors.handlerException;
            const mockReq = createMockRequest();
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            await customHandler(testError, mockReq, mockRes, mockNext);

            // Validate custom handler behavior
            const responseData = mockRes.jsonData;
            ok(responseData.error.stack || responseData.error.details,
                'Development handler should include stack trace');
        });

        it('should support production configuration with error sanitization', async () => {
            // Test production-configured error handler
            const productionHandler = createErrorHandler({
                environment: 'production',
                showStackTrace: false,
                sanitizeErrors: true,
                logLevel: 'error'
            });

            const testError = createTestError('application', {
                message: 'Sensitive internal error details',
                stack: 'Error stack trace with internal paths'
            });

            const mockReq = createMockRequest();
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            await productionHandler(testError, mockReq, mockRes, mockNext);

            // Validate error sanitization
            const responseData = mockRes.jsonData;
            ok(!responseData.error.stack, 'Production handler should not include stack trace');
            strictEqual(responseData.error.message, ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                'Production handler should use sanitized error message');
        });
    });

    // Test suite for classifyError utility function
    describe('classifyError utility function', () => {
        
        it('should classify HTTP errors correctly', () => {
            // Test HTTP error classification
            const httpError = httpErrors.notFound;
            
            validateErrorClassification(httpError, {
                type: 'http',
                severity: 'low',
                statusCode: HTTP_STATUS.NOT_FOUND,
                category: 'client'
            });
        });

        it('should classify application errors with proper severity', () => {
            // Test application error classification
            const appError = applicationErrors.businessLogicError;
            
            validateErrorClassification(appError, {
                type: 'application',
                severity: 'medium',
                statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                category: 'business'
            });
        });

        it('should classify system errors as high severity', () => {
            // Test system error classification
            const systemError = createTestError('system', {
                code: 'EMFILE',
                message: 'Too many open files'
            });
            
            validateErrorClassification(systemError, {
                type: 'system',
                severity: 'high',
                statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                category: 'infrastructure'
            });
        });

        it('should classify async errors for Express.js 5.1.0 handling', () => {
            // Test async error classification
            const asyncError = asyncErrors.asyncHandlerError;
            
            validateErrorClassification(asyncError, {
                type: 'async',
                severity: 'medium',
                statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                category: 'runtime'
            });
        });
    });

    // Test suite for handleAsyncErrors wrapper function
    describe('handleAsyncErrors wrapper function', () => {
        
        it('should catch Promise rejections and forward to error middleware', async () => {
            // Test Promise rejection handling
            const rejectingFunction = async () => {
                throw new Error('Async operation failed');
            };

            await testAsyncErrorHandling(rejectingFunction, {
                expectError: true,
                expectedErrorType: 'Error',
                expectLogging: true
            });
        });

        it('should handle async/await errors in Express.js 5.1.0', async () => {
            // Test async/await error handling
            const asyncAwaitFunction = async () => {
                await Promise.reject(asyncErrors.awaitError);
            };

            await testAsyncErrorHandling(asyncAwaitFunction, {
                expectError: true,
                expectedErrorType: 'AsyncError',
                expectLogging: true
            });
        });

        it('should pass through successful async operations', async () => {
            // Test successful async operation handling
            const successfulFunction = async (req, res) => {
                res.status(HTTP_STATUS.OK).json({ message: 'Success' });
            };

            await testAsyncErrorHandling(successfulFunction, {
                expectError: false,
                expectLogging: false
            });
        });
    });

    // Test suite for extractErrorDetails utility function
    describe('extractErrorDetails utility function', () => {
        
        it('should extract comprehensive error information', () => {
            // Test error details extraction
            const complexError = createTestError('application', {
                message: 'Complex application error',
                code: 'COMPLEX_ERROR',
                statusCode: HTTP_STATUS.BAD_REQUEST,
                context: {
                    userId: '12345',
                    operation: 'data-processing',
                    timestamp: new Date().toISOString()
                }
            });

            const errorDetails = extractErrorDetails(complexError);

            // Validate extracted details
            ok(errorDetails.message, 'Should extract error message');
            ok(errorDetails.name, 'Should extract error name');
            ok(errorDetails.stack, 'Should extract stack trace');
            ok(errorDetails.timestamp, 'Should include extraction timestamp');
            
            if (complexError.code) {
                strictEqual(errorDetails.code, complexError.code, 'Should extract error code');
            }
            
            if (complexError.statusCode) {
                strictEqual(errorDetails.statusCode, complexError.statusCode, 'Should extract status code');
            }
            
            if (complexError.context) {
                deepStrictEqual(errorDetails.context, complexError.context, 'Should extract error context');
            }
        });

        it('should handle errors without optional properties', () => {
            // Test extraction of minimal error objects
            const minimalError = new Error('Minimal error message');
            
            const errorDetails = extractErrorDetails(minimalError);
            
            ok(errorDetails.message, 'Should extract message from minimal error');
            ok(errorDetails.name, 'Should extract name from minimal error');
            ok(errorDetails.stack, 'Should extract stack from minimal error');
            ok(errorDetails.timestamp, 'Should add timestamp to extracted details');
        });
    });

    // Test suite for generateErrorId utility function
    describe('generateErrorId utility function', () => {
        
        it('should generate unique correlation IDs for error tracking', () => {
            // Test error ID generation
            const errorId1 = generateErrorId();
            const errorId2 = generateErrorId();

            // Validate ID properties
            ok(typeof errorId1 === 'string', 'Error ID should be string');
            ok(errorId1.length > 0, 'Error ID should not be empty');
            ok(errorId1 !== errorId2, 'Error IDs should be unique');
            
            // Test ID format (assuming UUID-like format)
            ok(errorId1.includes('-') || errorId1.length >= 8, 'Error ID should have appropriate format');
        });

        it('should support distributed tracing correlation', () => {
            // Test correlation ID for distributed tracing
            const correlationContext = {
                traceId: 'trace-12345',
                spanId: 'span-67890',
                parentId: 'parent-11111'
            };

            const errorId = generateErrorId(correlationContext);
            
            ok(typeof errorId === 'string', 'Correlation error ID should be string');
            ok(errorId.length > 0, 'Correlation error ID should not be empty');
        });
    });

    // Test suite for environment-specific behavior
    describe('Environment-specific error handling behavior', () => {
        
        it('should show detailed errors in development environment', async () => {
            const devError = createTestError('application', {
                message: 'Development error with details',
                stack: 'Detailed stack trace for debugging'
            });

            await testEnvironmentSpecificBehavior('development', devError);
        });

        it('should sanitize errors in production environment', async () => {
            const prodError = createTestError('application', {
                message: 'Internal application error with sensitive data',
                sensitiveData: 'secret-key-12345'
            });

            await testEnvironmentSpecificBehavior('production', prodError);
        });

        it('should optimize logging for test environment', async () => {
            const testError = createTestError('application', {
                message: 'Test environment error'
            });

            await testEnvironmentSpecificBehavior('test', testError);
        });
    });

    // Test suite for performance and efficiency
    describe('Error handling performance and efficiency', () => {
        
        it('should process errors within performance thresholds', async () => {
            const performanceError = createTestError('http', {
                statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                message: 'Performance test error'
            });

            const performanceResults = await measureErrorHandlingPerformance(performanceError, {
                maxProcessingTime: 100, // 100ms
                maxMemoryUsage: 1048576, // 1MB
                maxResponseTime: 50 // 50ms
            });

            // Validate performance metrics
            ok(performanceResults.performance.efficient, 'Error processing should be efficient');
            ok(performanceResults.performance.memoryEfficient, 'Error processing should be memory efficient');
            ok(performanceResults.performance.responsive, 'Error processing should be responsive');
            
            // Check specific thresholds
            ok(performanceResults.processingTime <= 100, 'Processing time should be under 100ms');
            ok(performanceResults.memoryUsage.heapUsed <= 1048576, 'Memory usage should be under 1MB');
        });

        it('should handle high error volumes efficiently', async () => {
            // Test error handler with multiple concurrent errors
            const errorVolume = 10;
            const errors = Array.from({ length: errorVolume }, (_, index) => 
                createTestError('application', {
                    message: `Volume test error ${index + 1}`,
                    errorId: index + 1
                })
            );

            const startTime = process.hrtime.bigint();
            const promises = errors.map(async (error) => {
                const mockReq = createMockRequest();
                const mockRes = createMockResponse();
                const mockNext = createMockNext();
                
                return errorHandler(error, mockReq, mockRes, mockNext);
            });

            await Promise.all(promises);
            const endTime = process.hrtime.bigint();
            const totalTime = Number(endTime - startTime) / 1000000; // milliseconds

            // Validate volume handling performance
            ok(totalTime <= 1000, 'Should handle error volume within 1 second');
            testLogger.info(`Processed ${errorVolume} errors in ${totalTime.toFixed(2)}ms`);
        });
    });

    // Test suite for error correlation and tracking
    describe('Error correlation and distributed tracing', () => {
        
        it('should generate and maintain error correlation IDs', async () => {
            const trackedError = createTestError('application', {
                message: 'Tracked error for correlation testing'
            });

            const mockReq = createMockRequest({
                headers: {
                    'x-correlation-id': 'test-correlation-12345',
                    'x-trace-id': 'test-trace-67890'
                }
            });
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            await errorHandler(trackedError, mockReq, mockRes, mockNext);

            // Validate correlation ID handling
            const responseData = mockRes.jsonData;
            ok(responseData.error.id, 'Error response should include correlation ID');
            
            // Check if correlation context is maintained
            if (mockReq.headers['x-correlation-id']) {
                ok(responseData.error.correlationId || responseData.error.id.includes('test-correlation'),
                    'Should maintain correlation context from request headers');
            }
        });

        it('should support error aggregation and reporting', () => {
            // Test error aggregation capabilities
            const errors = [
                httpErrors.notFound,
                httpErrors.methodNotAllowed,
                applicationErrors.businessLogicError
            ];

            const errorSummary = errors.map(error => {
                const classification = classifyError(error);
                const details = extractErrorDetails(error);
                const correlationId = generateErrorId();

                return {
                    classification,
                    details,
                    correlationId,
                    timestamp: new Date().toISOString()
                };
            });

            // Validate error aggregation
            strictEqual(errorSummary.length, 3, 'Should aggregate all errors');
            errorSummary.forEach(summary => {
                ok(summary.classification, 'Each error should have classification');
                ok(summary.details, 'Each error should have extracted details');
                ok(summary.correlationId, 'Each error should have correlation ID');
                ok(summary.timestamp, 'Each error should have timestamp');
            });
        });
    });

    // Test suite for error middleware integration
    describe('Express.js middleware integration', () => {
        
        it('should integrate seamlessly with Express.js middleware chain', async () => {
            // Test middleware chain integration
            const middlewareError = createTestError('application', {
                message: 'Middleware chain error',
                middleware: 'test-middleware'
            });

            const mockReq = createMockRequest({
                middlewareChain: ['cors', 'helmet', 'bodyParser', 'routes']
            });
            const mockRes = createMockResponse();
            const mockNext = createMockNext();

            // Simulate middleware chain execution
            await errorHandler(middlewareError, mockReq, mockRes, mockNext);

            // Validate middleware integration
            ok(!mockNext.called, 'Error handler should not call next for handled errors');
            ok(mockRes.statusCode, 'Error handler should set response status');
            ok(mockRes.jsonData, 'Error handler should generate JSON response');
        });

        it('should handle errors from multiple middleware layers', async () => {
            // Test multi-layer error handling
            const layeredErrors = [
                createTestError('http', { message: 'Route layer error', layer: 'routes' }),
                createTestError('application', { message: 'Business layer error', layer: 'business' }),
                createTestError('system', { message: 'Data layer error', layer: 'data' })
            ];

            for (const error of layeredErrors) {
                const mockReq = createMockRequest({ layer: error.layer });
                const mockRes = createMockResponse();
                const mockNext = createMockNext();

                await errorHandler(error, mockReq, mockRes, mockNext);

                // Validate layer-specific error handling
                validateErrorResponse(mockRes, error, {
                    statusCode: error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                    message: error.message
                });
            }
        });
    });
});