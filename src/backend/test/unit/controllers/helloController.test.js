// Node.js built-in test runner v22.x - Educational testing framework for controller unit testing
import { test, describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Import controller functions under test - All functions from helloController for comprehensive testing
import {
    handleHelloRequest,
    validateRequestMethod,
    createRequestContext,
    handleServiceResponse,
    handleControllerError,
    createControllerResponse
} from '../../../controllers/helloController.js';

// Import mock helpers for isolated unit testing with comprehensive mocking capabilities
import {
    createMockRequest,
    createMockResponse,
    createMockNext,
    mockHelloService,
    createMockError,
    injectError,
    createMockServiceResponse,
    resetAllMocks
} from '../../helpers/mockHelpers.js';

// Import test utilities for enhanced testing capabilities and performance measurement
import {
    createTestLogger,
    generateTestId,
    createMockFunction,
    measureExecutionTime
} from '../../helpers/testHelpers.js';

// Import test fixtures for standardized test data and expected responses
import {
    validRequests: { helloGet, helloGetWithHeaders },
    invalidRequests: { helloPost, helloPut }
} from '../../fixtures/requests.js';

import {
    successResponses: { helloSuccess, helloSuccessWithMetadata },
    errorResponses: { methodNotAllowed, internalServerError }
} from '../../fixtures/responses.js';

// Global test configuration and mock objects for test state management
const testLogger = createTestLogger('helloController.test');
const TEST_TIMEOUT = 30000;
let mockService = null;
let mockRequest = null;
let mockResponse = null;
let mockNext = null;

/**
 * Sets up all mock objects needed for controller testing including service mocks, 
 * Express.js request/response mocks, and next function mocks with proper configuration
 * @param {Object} options - Configuration options for mock setup
 * @returns {Object} Mock objects collection with configured mocks for controller testing
 */
function setupTestMocks(options = {}) {
    const testId = generateTestId();
    testLogger.info(`Setting up test mocks for test ID: ${testId}`);
    
    // Create mock service using mockHelloService with default success behavior
    mockService = mockHelloService({
        enableSuccessResponse: true,
        defaultMessage: 'Hello world',
        responseDelay: 0,
        ...options.serviceOptions
    });
    
    // Create mock Express.js request object using createMockRequest with valid hello request data
    mockRequest = createMockRequest({
        method: 'GET',
        path: '/hello',
        url: '/hello',
        headers: { 'user-agent': 'test-client' },
        query: {},
        params: {},
        body: {},
        ...options.requestOptions
    });
    
    // Create mock Express.js response object using createMockResponse with proper response tracking
    mockResponse = createMockResponse({
        enableStatusTracking: true,
        enableHeaderTracking: true,
        enableJsonTracking: true,
        ...options.responseOptions
    });
    
    // Create mock next function using createMockNext with error handling capabilities
    mockNext = createMockNext({
        enableCallTracking: true,
        enableErrorHandling: true,
        ...options.nextOptions
    });
    
    // Configure mock service responses for successful hello request processing
    mockService.processHelloRequest = createMockFunction('processHelloRequest', {
        returnValue: createMockServiceResponse({
            success: true,
            data: 'Hello world',
            statusCode: 200,
            metadata: { timestamp: new Date().toISOString() }
        })
    });
    
    // Set up error injection capabilities for testing error scenarios
    if (options.enableErrorInjection) {
        injectError(mockService, {
            errorType: options.errorType || 'service_error',
            errorMessage: options.errorMessage || 'Mock service error',
            throwOnMethod: options.throwOnMethod || 'processHelloRequest'
        });
    }
    
    // Return object containing all configured mock objects for test use
    return {
        service: mockService,
        request: mockRequest,
        response: mockResponse,
        next: mockNext,
        testId
    };
}

/**
 * Cleans up and resets all mock objects after test execution to prevent test interference
 * and ensure clean state between tests
 */
function teardownTestMocks() {
    testLogger.info('Tearing down test mocks and resetting state');
    
    // Reset all mock functions and clear call tracking data
    if (mockService) {
        Object.keys(mockService).forEach(key => {
            if (typeof mockService[key] === 'function' && mockService[key].resetMock) {
                mockService[key].resetMock();
            }
        });
    }
    
    // Clear mock service configurations and behavior settings
    mockService = null;
    
    // Reset mock request and response objects to initial state
    mockRequest = null;
    mockResponse = null;
    
    // Clear error injection configurations and timing settings
    mockNext = null;
    
    // Call resetAllMocks utility to ensure complete cleanup
    resetAllMocks();
    
    testLogger.info('Mock teardown completed successfully');
}

/**
 * Creates test context object with request data, response expectations, and test metadata
 * for organized test execution and validation
 * @param {string} testName - Name of the test case
 * @param {Object} testData - Test data and configuration
 * @returns {Object} Test context object with test data, expectations, and metadata
 */
function createTestContext(testName, testData = {}) {
    // Generate unique test ID using generateTestId for test correlation
    const testId = generateTestId();
    
    // Create test context with provided test name and test data
    const context = {
        testId,
        testName,
        timestamp: new Date().toISOString(),
        
        // Add test expectations and validation criteria to context
        expectations: {
            statusCode: testData.expectedStatus || 200,
            responseBody: testData.expectedBody || 'Hello world',
            responseHeaders: testData.expectedHeaders || {},
            errorType: testData.expectedError || null,
            ...testData.expectations
        },
        
        // Include mock objects and test fixtures in context
        mocks: {
            service: mockService,
            request: mockRequest,
            response: mockResponse,
            next: mockNext
        },
        
        // Set up test timing and performance measurement capabilities
        performance: {
            startTime: null,
            endTime: null,
            duration: null,
            memoryUsage: process.memoryUsage()
        },
        
        // Add test metadata including test type and validation requirements
        metadata: {
            testType: testData.testType || 'unit',
            requiresPerformanceValidation: testData.performanceValidation || false,
            requiresErrorHandling: testData.errorHandling || false,
            ...testData.metadata
        }
    };
    
    // Return complete test context ready for test execution
    return context;
}

/**
 * Validates controller function responses including response structure, status codes,
 * data content, and metadata for comprehensive response verification
 * @param {Object} actualResponse - The actual response from controller function
 * @param {Object} expectedResponse - Expected response structure and data
 * @param {Object} validationOptions - Options for response validation
 * @returns {Object} Validation result with success status and detailed validation information
 */
function validateControllerResponse(actualResponse, expectedResponse, validationOptions = {}) {
    const validationResult = {
        success: true,
        errors: [],
        details: {
            statusCode: null,
            responseData: null,
            headers: null,
            timing: null
        }
    };
    
    try {
        // Compare actual response structure against expected response structure
        if (expectedResponse.statusCode && mockResponse.statusCode !== expectedResponse.statusCode) {
            validationResult.success = false;
            validationResult.errors.push(`Status code mismatch: expected ${expectedResponse.statusCode}, got ${mockResponse.statusCode}`);
        }
        validationResult.details.statusCode = { expected: expectedResponse.statusCode, actual: mockResponse.statusCode };
        
        // Validate HTTP status codes match expected values
        if (expectedResponse.body && mockResponse.sentData !== expectedResponse.body) {
            validationResult.success = false;
            validationResult.errors.push(`Response body mismatch: expected "${expectedResponse.body}", got "${mockResponse.sentData}"`);
        }
        validationResult.details.responseData = { expected: expectedResponse.body, actual: mockResponse.sentData };
        
        // Check response data content and format for correctness
        if (expectedResponse.headers) {
            Object.keys(expectedResponse.headers).forEach(headerName => {
                const expectedValue = expectedResponse.headers[headerName];
                const actualValue = mockResponse.headers[headerName];
                if (actualValue !== expectedValue) {
                    validationResult.success = false;
                    validationResult.errors.push(`Header "${headerName}" mismatch: expected "${expectedValue}", got "${actualValue}"`);
                }
            });
        }
        validationResult.details.headers = { expected: expectedResponse.headers, actual: mockResponse.headers };
        
        // Verify response metadata and headers are properly set
        if (validationOptions.validateTiming && actualResponse.duration) {
            const maxDuration = validationOptions.maxDuration || 100;
            if (actualResponse.duration > maxDuration) {
                validationResult.success = false;
                validationResult.errors.push(`Response time exceeded maximum: ${actualResponse.duration}ms > ${maxDuration}ms`);
            }
        }
        validationResult.details.timing = actualResponse.duration;
        
        // Validate response timing and performance characteristics
        if (validationOptions.strictValidation && validationResult.errors.length > 0) {
            validationResult.success = false;
        }
        
        // Check error responses have proper error structure and messages
        if (expectedResponse.error && !mockNext.calledWith) {
            validationResult.success = false;
            validationResult.errors.push('Expected error to be passed to next() function');
        }
        
    } catch (error) {
        validationResult.success = false;
        validationResult.errors.push(`Validation error: ${error.message}`);
    }
    
    // Return comprehensive validation result with detailed feedback
    return validationResult;
}

/**
 * Simulates service layer errors for testing controller error handling including
 * validation errors, processing errors, and service unavailability scenarios
 * @param {string} errorType - Type of error to simulate
 * @param {Object} errorConfig - Configuration for error simulation
 * @returns {Error} Mock error object configured for specific error scenario testing
 */
function simulateServiceError(errorType, errorConfig = {}) {
    // Create mock error object using createMockError with specified error type
    const mockError = createMockError({
        type: errorType,
        message: errorConfig.message || `Mock ${errorType} error`,
        statusCode: errorConfig.statusCode || 500,
        details: errorConfig.details || {}
    });
    
    // Configure error properties based on errorType parameter
    switch (errorType) {
        case 'validation_error':
            mockError.statusCode = 400;
            mockError.details = { field: 'request', reason: 'invalid_format', ...errorConfig.details };
            break;
        case 'service_unavailable':
            mockError.statusCode = 503;
            mockError.details = { service: 'helloService', reason: 'timeout', ...errorConfig.details };
            break;
        case 'processing_error':
            mockError.statusCode = 500;
            mockError.details = { operation: 'processHelloRequest', reason: 'internal_error', ...errorConfig.details };
            break;
        default:
            mockError.statusCode = 500;
            mockError.details = { type: 'unknown_error', ...errorConfig.details };
    }
    
    // Set up error timing and propagation behavior from errorConfig
    if (errorConfig.delay) {
        mockError.delay = errorConfig.delay;
    }
    
    // Add service-specific error context and metadata
    mockError.timestamp = new Date().toISOString();
    mockError.correlationId = generateTestId();
    
    // Configure error injection into mock service functions
    if (mockService && errorConfig.injectIntoService) {
        injectError(mockService, {
            errorType,
            error: mockError,
            throwOnMethod: errorConfig.throwOnMethod || 'processHelloRequest'
        });
    }
    
    // Return configured error object ready for error testing scenarios
    return mockError;
}

/**
 * Measures and validates request processing time for controller functions to ensure
 * performance requirements are met during testing
 * @param {Function} controllerFunction - Controller function to test
 * @param {Object} testParams - Parameters for function execution
 * @param {Object} performanceOptions - Performance testing configuration
 * @returns {Promise<Object>} Performance measurement result with timing data and validation status
 */
async function testRequestProcessingTime(controllerFunction, testParams, performanceOptions = {}) {
    const performanceResult = {
        success: true,
        duration: null,
        memoryUsage: null,
        errors: [],
        details: {}
    };
    
    try {
        // Set up performance measurement using measureExecutionTime utility
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime.bigint();
        
        // Execute controller function with provided test parameters
        const result = await measureExecutionTime(async () => {
            return await controllerFunction(testParams.request, testParams.response, testParams.next);
        });
        
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        // Measure execution time and resource usage during function execution
        performanceResult.duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        performanceResult.memoryUsage = {
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            rss: endMemory.rss - startMemory.rss
        };
        
        // Compare performance results against performance thresholds
        const maxDuration = performanceOptions.maxDuration || 100;
        const maxHeapUsage = performanceOptions.maxHeapUsage || 10 * 1024 * 1024; // 10MB
        
        // Validate response time meets controller performance requirements
        if (performanceResult.duration > maxDuration) {
            performanceResult.success = false;
            performanceResult.errors.push(`Execution time exceeded threshold: ${performanceResult.duration}ms > ${maxDuration}ms`);
        }
        
        if (performanceResult.memoryUsage.heapUsed > maxHeapUsage) {
            performanceResult.success = false;
            performanceResult.errors.push(`Memory usage exceeded threshold: ${performanceResult.memoryUsage.heapUsed} bytes > ${maxHeapUsage} bytes`);
        }
        
        // Log performance results for debugging and analysis
        testLogger.info(`Performance test completed - Duration: ${performanceResult.duration}ms, Memory: ${performanceResult.memoryUsage.heapUsed} bytes`);
        
        performanceResult.details = result;
        
    } catch (error) {
        performanceResult.success = false;
        performanceResult.errors.push(`Performance test error: ${error.message}`);
    }
    
    // Return performance measurement results with validation status
    return performanceResult;
}

/**
 * Validates mock function calls including call count, parameters, and call sequence
 * for verifying controller interactions with dependencies
 * @param {Object} mockObject - Mock object with call tracking
 * @param {Object} expectedCalls - Expected call patterns and parameters  
 * @param {Object} assertionOptions - Options for call assertion validation
 */
function assertMockCalls(mockObject, expectedCalls, assertionOptions = {}) {
    try {
        // Extract call tracking data from mock object
        const actualCallCount = mockObject.callCount || 0;
        const actualCalls = mockObject.calls || [];
        
        // Compare actual call count against expected call count
        if (expectedCalls.count !== undefined) {
            assert.strictEqual(actualCallCount, expectedCalls.count, 
                `Expected ${expectedCalls.count} calls, but got ${actualCallCount}`);
        }
        
        // Validate function parameters for each mock call
        if (expectedCalls.parameters && actualCalls.length > 0) {
            expectedCalls.parameters.forEach((expectedParams, index) => {
                const actualParams = actualCalls[index];
                if (actualParams) {
                    Object.keys(expectedParams).forEach(paramName => {
                        assert.deepStrictEqual(actualParams[paramName], expectedParams[paramName],
                            `Parameter "${paramName}" mismatch in call ${index + 1}`);
                    });
                }
            });
        }
        
        // Check call sequence and timing if specified in options
        if (assertionOptions.validateSequence && expectedCalls.sequence) {
            expectedCalls.sequence.forEach((expectedCall, index) => {
                const actualCall = actualCalls[index];
                assert.ok(actualCall, `Expected call ${index + 1} not found in sequence`);
                assert.strictEqual(actualCall.method, expectedCall.method,
                    `Call sequence mismatch at position ${index + 1}`);
            });
        }
        
        // Verify mock function behavior and return values
        if (expectedCalls.returnValues) {
            expectedCalls.returnValues.forEach((expectedReturn, index) => {
                const actualReturn = actualCalls[index]?.returnValue;
                assert.deepStrictEqual(actualReturn, expectedReturn,
                    `Return value mismatch in call ${index + 1}`);
            });
        }
        
        // Assert error handling and exception scenarios if applicable
        if (assertionOptions.validateErrors && expectedCalls.errors) {
            expectedCalls.errors.forEach((expectedError, index) => {
                const actualError = actualCalls[index]?.error;
                assert.ok(actualError, `Expected error in call ${index + 1} not found`);
                assert.strictEqual(actualError.message, expectedError.message,
                    `Error message mismatch in call ${index + 1}`);
            });
        }
        
    } catch (error) {
        // Throw assertion errors with detailed information if validation fails
        throw new Error(`Mock call assertion failed: ${error.message}`);
    }
}

// Main test suite for helloController unit testing with comprehensive coverage
describe('helloController Unit Tests', { timeout: TEST_TIMEOUT }, () => {
    
    // Test setup and teardown hooks for clean test environment
    beforeEach(() => {
        testLogger.info('Setting up test environment for helloController test');
        setupTestMocks();
    });
    
    afterEach(() => {
        testLogger.info('Cleaning up test environment after helloController test');
        teardownTestMocks();
    });
    
    // Test suite for handleHelloRequest main controller function
    describe('handleHelloRequest', () => {
        
        it('should return Hello world response for valid GET request', async () => {
            const testContext = createTestContext('valid GET request test', {
                expectedStatus: 200,
                expectedBody: 'Hello world',
                testType: 'success_scenario'
            });
            
            // Execute handleHelloRequest with mock objects
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            // Validate response using validateControllerResponse
            const validationResult = validateControllerResponse(
                { duration: 50 },
                { statusCode: 200, body: 'Hello world' },
                { validateTiming: true, maxDuration: 100 }
            );
            
            assert.ok(validationResult.success, `Response validation failed: ${validationResult.errors.join(', ')}`);
            assert.strictEqual(mockResponse.statusCode, 200, 'Should return 200 status code');
            assert.strictEqual(mockResponse.sentData, 'Hello world', 'Should return Hello world message');
        });
        
        it('should handle service errors gracefully', async () => {
            const testContext = createTestContext('service error test', {
                expectedError: 'service_error',
                testType: 'error_scenario',
                errorHandling: true
            });
            
            // Simulate service error using simulateServiceError
            const mockError = simulateServiceError('service_unavailable', {
                message: 'Service temporarily unavailable',
                statusCode: 503,
                injectIntoService: true
            });
            
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            // Verify error was passed to next middleware
            assert.ok(mockNext.calledWith, 'Should call next() with error');
            assert.strictEqual(mockNext.calledWith.statusCode, 503, 'Should pass 503 error to next()');
        });
        
        it('should meet performance requirements for request processing', async () => {
            const testContext = createTestContext('performance test', {
                testType: 'performance',
                performanceValidation: true
            });
            
            // Measure performance using testRequestProcessingTime
            const performanceResult = await testRequestProcessingTime(
                handleHelloRequest,
                { request: mockRequest, response: mockResponse, next: mockNext },
                { maxDuration: 50, maxHeapUsage: 5 * 1024 * 1024 }
            );
            
            assert.ok(performanceResult.success, `Performance test failed: ${performanceResult.errors.join(', ')}`);
            assert.ok(performanceResult.duration < 50, `Response time should be under 50ms, got ${performanceResult.duration}ms`);
        });
        
        it('should validate request method correctly', async () => {
            // Test with valid GET request using fixture data
            mockRequest.method = 'GET';
            
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            assert.strictEqual(mockResponse.statusCode, 200, 'Should accept GET requests');
            assert.strictEqual(mockResponse.sentData, 'Hello world', 'Should process GET request successfully');
        });
        
        it('should handle invalid request methods', async () => {
            // Test with invalid POST request using fixture data
            mockRequest.method = 'POST';
            
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            // Should call validateRequestMethod and handle method validation
            assert.ok(mockNext.calledWith, 'Should call next() for invalid method');
        });
        
        it('should create proper request context', async () => {
            const testContext = createTestContext('request context test', {
                testType: 'context_validation'
            });
            
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            // Verify request context creation and service layer integration
            assert.ok(mockResponse.statusCode, 'Should set response status code');
            assert.ok(mockResponse.sentData, 'Should generate response data');
        });
    });
    
    // Test suite for validateRequestMethod function
    describe('validateRequestMethod', () => {
        
        it('should validate GET method as valid', () => {
            const testContext = createTestContext('GET method validation', {
                expectedResult: true,
                testType: 'validation'
            });
            
            const result = validateRequestMethod('GET');
            
            assert.strictEqual(result, true, 'GET method should be valid');
        });
        
        it('should reject invalid HTTP methods', () => {
            const testContext = createTestContext('invalid method validation', {
                expectedResult: false,
                testType: 'validation'
            });
            
            const invalidMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            
            invalidMethods.forEach(method => {
                const result = validateRequestMethod(method);
                assert.strictEqual(result, false, `${method} method should be invalid`);
            });
        });
        
        it('should handle edge cases in method validation', () => {
            const edgeCases = [null, undefined, '', 'get', 'GET '];
            
            edgeCases.forEach(testCase => {
                const result = validateRequestMethod(testCase);
                const expected = testCase === 'GET' ? true : false;
                assert.strictEqual(result, expected, `Edge case "${testCase}" should return ${expected}`);
            });
        });
    });
    
    // Test suite for createRequestContext function
    describe('createRequestContext', () => {
        
        it('should create valid request context object', () => {
            const testContext = createTestContext('request context creation', {
                testType: 'context_creation'
            });
            
            const context = createRequestContext(mockRequest);
            
            assert.ok(context, 'Should create context object');
            assert.ok(context.requestId, 'Should include request ID');
            assert.ok(context.timestamp, 'Should include timestamp');
            assert.strictEqual(context.method, 'GET', 'Should include request method');
            assert.strictEqual(context.path, '/hello', 'Should include request path');
        });
        
        it('should include request metadata in context', () => {
            mockRequest.headers = { 'user-agent': 'test-client', 'x-request-id': 'test-123' };
            
            const context = createRequestContext(mockRequest);
            
            assert.ok(context.headers, 'Should include request headers');
            assert.strictEqual(context.headers['user-agent'], 'test-client', 'Should preserve user-agent header');
            assert.ok(context.userAgent, 'Should extract user agent');
        });
        
        it('should handle missing request properties gracefully', () => {
            const minimalRequest = { method: 'GET', url: '/hello' };
            
            const context = createRequestContext(minimalRequest);
            
            assert.ok(context, 'Should create context with minimal request');
            assert.strictEqual(context.method, 'GET', 'Should include method');
            assert.ok(context.requestId, 'Should generate request ID');
        });
    });
    
    // Test suite for handleServiceResponse function
    describe('handleServiceResponse', () => {
        
        it('should process successful service response', () => {
            const testContext = createTestContext('successful service response', {
                testType: 'service_response'
            });
            
            const serviceResponse = createMockServiceResponse({
                success: true,
                data: 'Hello world',
                statusCode: 200
            });
            
            handleServiceResponse(serviceResponse, mockResponse);
            
            assert.strictEqual(mockResponse.statusCode, 200, 'Should set correct status code');
            assert.strictEqual(mockResponse.sentData, 'Hello world', 'Should send service data');
        });
        
        it('should handle service error responses', () => {
            const serviceResponse = createMockServiceResponse({
                success: false,
                error: 'Service processing failed',
                statusCode: 500
            });
            
            const result = handleServiceResponse(serviceResponse, mockResponse);
            
            assert.ok(result.error, 'Should return error result');
            assert.strictEqual(result.statusCode, 500, 'Should preserve error status code');
        });
        
        it('should validate service response format', () => {
            const invalidResponses = [null, undefined, {}, { data: 'test' }];
            
            invalidResponses.forEach(response => {
                const result = handleServiceResponse(response, mockResponse);
                assert.ok(result.error, `Invalid response ${JSON.stringify(response)} should return error`);
            });
        });
    });
    
    // Test suite for handleControllerError function
    describe('handleControllerError', () => {
        
        it('should format controller errors properly', () => {
            const testContext = createTestContext('controller error formatting', {
                testType: 'error_handling'
            });
            
            const testError = new Error('Test controller error');
            testError.statusCode = 400;
            
            const result = handleControllerError(testError, mockRequest);
            
            assert.ok(result.error, 'Should create error object');
            assert.strictEqual(result.statusCode, 400, 'Should preserve error status code');
            assert.ok(result.message, 'Should include error message');
            assert.ok(result.requestId, 'Should include request correlation ID');
        });
        
        it('should handle errors without status codes', () => {
            const genericError = new Error('Generic error');
            
            const result = handleControllerError(genericError, mockRequest);
            
            assert.strictEqual(result.statusCode, 500, 'Should default to 500 status code');
            assert.strictEqual(result.message, 'Internal Server Error', 'Should use generic error message');
        });
        
        it('should include error context and debugging information', () => {
            const contextError = new Error('Context error');
            contextError.statusCode = 422;
            contextError.details = { field: 'name', reason: 'required' };
            
            const result = handleControllerError(contextError, mockRequest);
            
            assert.ok(result.details, 'Should include error details');
            assert.strictEqual(result.details.field, 'name', 'Should preserve error details');
            assert.ok(result.timestamp, 'Should include error timestamp');
        });
    });
    
    // Test suite for createControllerResponse function
    describe('createControllerResponse', () => {
        
        it('should create standardized success response', () => {
            const testContext = createTestContext('success response creation', {
                testType: 'response_creation'
            });
            
            const responseData = 'Hello world';
            const options = { statusCode: 200, includeMetadata: true };
            
            const response = createControllerResponse(responseData, options);
            
            assert.strictEqual(response.data, 'Hello world', 'Should include response data');
            assert.strictEqual(response.statusCode, 200, 'Should set status code');
            assert.ok(response.timestamp, 'Should include timestamp');
            assert.ok(response.success, 'Should mark as successful');
        });
        
        it('should create error response format', () => {
            const errorData = { message: 'Validation failed', field: 'name' };
            const options = { statusCode: 400, isError: true };
            
            const response = createControllerResponse(errorData, options);
            
            assert.strictEqual(response.error.message, 'Validation failed', 'Should include error message');
            assert.strictEqual(response.statusCode, 400, 'Should set error status code');
            assert.strictEqual(response.success, false, 'Should mark as unsuccessful');
        });
        
        it('should include optional metadata in responses', () => {
            const data = 'Hello world';
            const options = { 
                statusCode: 200,
                metadata: { version: '1.0', requestId: 'test-123' }
            };
            
            const response = createControllerResponse(data, options);
            
            assert.ok(response.metadata, 'Should include metadata');
            assert.strictEqual(response.metadata.version, '1.0', 'Should preserve metadata version');
            assert.strictEqual(response.metadata.requestId, 'test-123', 'Should preserve request ID');
        });
    });
    
    // Integration tests for complete request flow
    describe('Integration Tests - Complete Request Flow', () => {
        
        it('should process complete hello request flow successfully', async () => {
            const testContext = createTestContext('complete flow test', {
                testType: 'integration',
                performanceValidation: true
            });
            
            // Test complete flow from request to response
            const startTime = Date.now();
            
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Validate complete response flow
            assert.strictEqual(mockResponse.statusCode, 200, 'Should complete with 200 status');
            assert.strictEqual(mockResponse.sentData, 'Hello world', 'Should return expected message');
            assert.ok(duration < 100, `Should complete within 100ms, took ${duration}ms`);
            
            // Verify no errors were passed to next middleware
            assert.ok(!mockNext.calledWith, 'Should not call next() on successful request');
        });
        
        it('should handle complete error flow with proper error propagation', async () => {
            const testContext = createTestContext('error flow test', {
                testType: 'integration',
                errorHandling: true
            });
            
            // Inject service error for complete error flow testing
            simulateServiceError('processing_error', {
                message: 'Service processing failed',
                statusCode: 500,
                injectIntoService: true
            });
            
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            // Validate error propagation through complete flow
            assert.ok(mockNext.calledWith, 'Should propagate error to next middleware');
            assert.ok(mockNext.calledWith.message, 'Should include error message');
            assert.strictEqual(mockNext.calledWith.statusCode, 500, 'Should preserve error status code');
        });
    });
    
    // Performance and load testing
    describe('Performance Tests', () => {
        
        it('should handle concurrent requests efficiently', async () => {
            const testContext = createTestContext('concurrent requests test', {
                testType: 'performance',
                performanceValidation: true
            });
            
            const concurrentRequests = 10;
            const requests = [];
            
            // Create multiple concurrent requests
            for (let i = 0; i < concurrentRequests; i++) {
                const concurrentMocks = setupTestMocks();
                requests.push(handleHelloRequest(
                    concurrentMocks.request,
                    concurrentMocks.response,
                    concurrentMocks.next
                ));
            }
            
            const startTime = Date.now();
            await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            
            // Validate concurrent processing performance
            assert.ok(totalTime < 500, `Concurrent requests should complete within 500ms, took ${totalTime}ms`);
            
            testLogger.info(`Processed ${concurrentRequests} concurrent requests in ${totalTime}ms`);
        });
        
        it('should maintain memory efficiency under load', async () => {
            const testContext = createTestContext('memory efficiency test', {
                testType: 'performance'
            });
            
            const initialMemory = process.memoryUsage();
            
            // Process multiple requests to test memory usage
            for (let i = 0; i < 100; i++) {
                const loadMocks = setupTestMocks();
                await handleHelloRequest(loadMocks.request, loadMocks.response, loadMocks.next);
                teardownTestMocks();
            }
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const maxMemoryIncrease = 10 * 1024 * 1024; // 10MB
            
            assert.ok(memoryIncrease < maxMemoryIncrease, 
                `Memory increase should be under 10MB, increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
        });
    });
    
    // Mock validation and interaction tests
    describe('Mock Validation Tests', () => {
        
        it('should validate mock function interactions correctly', async () => {
            const testContext = createTestContext('mock interaction test', {
                testType: 'mock_validation'
            });
            
            await handleHelloRequest(mockRequest, mockResponse, mockNext);
            
            // Validate mock interactions using assertMockCalls
            assertMockCalls(mockResponse, {
                count: 2, // status() and send() calls
                parameters: [
                    { statusCode: 200 },
                    { data: 'Hello world' }
                ]
            }, { validateSequence: true });
        });
        
        it('should reset mocks properly between tests', () => {
            const testContext = createTestContext('mock reset test', {
                testType: 'mock_validation'
            });
            
            // Verify clean mock state
            assert.strictEqual(mockResponse.callCount || 0, 0, 'Mock response should have clean state');
            assert.strictEqual(mockNext.callCount || 0, 0, 'Mock next should have clean state');
            assert.ok(!mockNext.calledWith, 'Mock next should not have previous call data');
        });
    });
});

// Export test utility functions for potential reuse in other test files
export {
    setupTestMocks,
    teardownTestMocks,
    createTestContext,
    validateControllerResponse
};