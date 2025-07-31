/**
 * Comprehensive Unit Test Module for HelloService Component
 * 
 * This module provides isolated testing of all helloService functions and the HelloService
 * class using Node.js built-in test runner with extensive mocking strategies, test fixtures,
 * and validation patterns. Focuses on service layer business logic testing with complete
 * isolation from external dependencies while ensuring proper validation, response generation,
 * error handling, and service metadata management according to educational testing principles
 * and Express.js service patterns.
 * 
 * Tests all service functions: generateHelloResponse, validateHelloRequest, processHelloRequest,
 * createHelloServiceResponse, getHelloServiceMetadata, formatServiceError, createRequestContext,
 * and HelloService class methods with comprehensive coverage and educational value.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Node.js built-in test runner and assertion modules (Node.js v18+ built-in)
const { test, describe, it, beforeEach, afterEach } = require('node:test'); // Node.js built-in test runner
const assert = require('node:assert'); // Node.js built-in assertion library

// Import service functions and class under test from helloService module
const {
    generateHelloResponse,
    validateHelloRequest,
    processHelloRequest,
    createHelloServiceResponse,
    getHelloServiceMetadata,
    formatServiceError,
    createRequestContext,
    HelloService
} = require('../../../services/helloService.js');

// Import test helper utilities for test environment setup and management
const {
    createTestLogger,
    generateTestId,
    createMockFunction,
    measureExecutionTime,
    deepClone
} = require('../../helpers/testHelpers.js');

// Import mock helper utilities for creating comprehensive mock objects
const {
    createMockRequest,
    createMockResponse,
    createMockError,
    createMockServiceResponse
} = require('../../helpers/mockHelpers.js');

// Import test fixture data for request and response testing scenarios
const {
    validRequests,
    invalidRequests
} = require('../../fixtures/requests.js');

const {
    successResponses,
    errorResponses
} = require('../../fixtures/responses.js');

// Import application constants for validation and assertion testing
const {
    HTTP_STATUS,
    RESPONSES,
    ERROR_MESSAGES
} = require('../../../utils/constants.js');

// Global test configuration and state management variables
const testLogger = createTestLogger('helloService.test');
const TEST_TIMEOUT = 30000;

// Global test state variables for setup and teardown management
let mockRequest = null;
let mockResponse = null;
let testContext = null;
let serviceInstance = null;

/**
 * Sets up all test fixtures, mock objects, and test environment needed for service testing
 * including request/response mocks, service configuration, and test context initialization
 * 
 * @param {object} testOptions - Configuration options for test setup
 * @returns {object} Test setup object with configured mocks, fixtures, and test environment
 */
function setupServiceTests(testOptions = {}) {
    // Initialize test logger using createTestLogger with service test context
    testLogger.info('Setting up helloService test environment', { testOptions });
    
    // Create mock request objects using createMockRequest with valid hello request data
    mockRequest = createMockRequest({
        method: 'GET',
        path: '/hello',
        headers: validRequests.helloGet.headers,
        query: {},
        body: {},
        ...testOptions.requestOptions
    });
    
    // Create mock response objects using createMockResponse with proper response tracking
    mockResponse = createMockResponse({
        statusCode: HTTP_STATUS.OK,
        headers: {},
        ...testOptions.responseOptions
    });
    
    // Set up test fixtures from validRequests and successResponses for positive testing
    const testFixtures = {
        validRequest: deepClone(validRequests.helloGet),
        validRequestWithHeaders: deepClone(validRequests.helloGetWithHeaders),
        invalidPostRequest: deepClone(invalidRequests.helloPost),
        invalidPutRequest: deepClone(invalidRequests.helloPut),
        successResponse: deepClone(successResponses.helloSuccess),
        successResponseWithMetadata: deepClone(successResponses.helloSuccessWithMetadata),
        validationErrorResponse: deepClone(errorResponses.badRequest),
        internalErrorResponse: deepClone(errorResponses.internalServerError)
    };
    
    // Configure error fixtures from invalidRequests and errorResponses for negative testing
    const errorFixtures = {
        validationError: createMockError('Validation failed', 'VALIDATION_ERROR'),
        processingError: createMockError('Processing failed', 'PROCESSING_ERROR'),
        internalError: createMockError('Internal server error', 'INTERNAL_ERROR')
    };
    
    // Initialize test context with test ID, fixtures, and configuration
    testContext = createServiceTestContext(`setup-${generateTestId()}`, {
        fixtures: testFixtures,
        errors: errorFixtures,
        mocks: {
            request: mockRequest,
            response: mockResponse
        },
        options: testOptions
    });
    
    // Set up performance measurement capabilities for service timing tests
    testContext.performance = {
        measureExecutionTime: measureExecutionTime,
        startTime: Date.now(),
        measurements: {}
    };
    
    testLogger.info('HelloService test environment setup complete', { contextId: testContext.id });
    
    // Return complete test setup object with all configured components
    return {
        context: testContext,
        mocks: { request: mockRequest, response: mockResponse },
        fixtures: testFixtures,
        errors: errorFixtures,
        logger: testLogger
    };
}

/**
 * Cleans up test environment, resets mock objects, and clears test state to prevent
 * test interference and ensure clean state between test executions
 */
function teardownServiceTests() {
    testLogger.info('Tearing down helloService test environment', { contextId: testContext?.id });
    
    // Clear all mock function call tracking data and reset behavior
    if (mockRequest && typeof mockRequest.reset === 'function') {
        mockRequest.reset();
    }
    if (mockResponse && typeof mockResponse.reset === 'function') {
        mockResponse.reset();
    }
    
    // Reset mock request and response objects to initial state
    mockRequest = null;
    mockResponse = null;
    
    // Clear service instance state and configuration if created
    if (serviceInstance && typeof serviceInstance.reset === 'function') {
        serviceInstance.reset();
    }
    serviceInstance = null;
    
    // Reset test context and clear test-specific metadata
    if (testContext) {
        testContext.cleanup?.();
    }
    testContext = null;
    
    // Clear performance measurement data and timing information
    if (global.gc) {
        global.gc(); // Force garbage collection if available for clean testing
    }
    
    testLogger.info('HelloService test environment teardown complete');
}

/**
 * Creates comprehensive test context object with request data, response expectations,
 * service configuration, and test metadata for organized service testing execution
 * 
 * @param {string} testName - Name identifier for the test context
 * @param {object} contextData - Additional context data and configuration
 * @returns {object} Service test context with test data, expectations, configuration, and metadata
 */
function createServiceTestContext(testName, contextData = {}) {
    // Generate unique test ID using generateTestId for test correlation
    const testId = generateTestId();
    
    // Create service test context with provided test name and context data
    const context = {
        id: testId,
        name: testName,
        timestamp: new Date().toISOString(),
        
        // Add service-specific test expectations and validation criteria
        expectations: {
            responseTime: 100, // milliseconds
            memoryUsage: 50 * 1024 * 1024, // 50MB
            successRate: 1.0 // 100%
        },
        
        // Include mock objects, test fixtures, and service configuration
        data: {
            ...contextData,
            serviceConfig: {
                timeout: TEST_TIMEOUT,
                retryCount: 0,
                validateInputs: true
            }
        },
        
        // Set up performance measurement and timing capabilities
        metrics: {
            startTime: Date.now(),
            executionTime: 0,
            memoryBefore: process.memoryUsage(),
            memoryAfter: null
        },
        
        // Add service metadata and business logic test requirements
        validation: {
            strictMode: true,
            validateResponses: true,
            checkPerformance: true
        },
        
        // Configure error injection and edge case testing scenarios
        errorInjection: {
            enabled: false,
            scenarios: []
        },
        
        // Add cleanup function for resource management
        cleanup: () => {
            context.metrics.executionTime = Date.now() - context.metrics.startTime;
            context.metrics.memoryAfter = process.memoryUsage();
        }
    };
    
    testLogger.debug('Created service test context', { contextId: testId, testName });
    
    // Return complete service test context ready for test execution
    return context;
}

/**
 * Validates service function responses including response structure, status codes,
 * data content, metadata, and business logic correctness for comprehensive service
 * response verification
 * 
 * @param {object} actualResponse - The actual response received from service function
 * @param {object} expectedResponse - The expected response structure and content
 * @param {object} validationOptions - Options for response validation behavior
 * @returns {object} Validation result with success status and detailed validation information
 */
function validateServiceResponse(actualResponse, expectedResponse, validationOptions = {}) {
    const validation = {
        success: true,
        errors: [],
        warnings: [],
        details: {}
    };
    
    // Compare actual response structure against expected service response format
    if (!actualResponse || typeof actualResponse !== 'object') {
        validation.success = false;
        validation.errors.push('Response must be a valid object');
        return validation;
    }
    
    // Validate response data content matches expected business logic outcomes
    if (expectedResponse.data !== undefined) {
        if (actualResponse.data !== expectedResponse.data) {
            validation.success = false;
            validation.errors.push(`Data mismatch: expected "${expectedResponse.data}", got "${actualResponse.data}"`);
        }
    }
    
    // Check service-specific metadata and processing information
    if (expectedResponse.metadata && actualResponse.metadata) {
        const metadataKeys = Object.keys(expectedResponse.metadata);
        metadataKeys.forEach(key => {
            if (actualResponse.metadata[key] !== expectedResponse.metadata[key]) {
                validation.warnings.push(`Metadata "${key}" mismatch`);
            }
        });
    }
    
    // Verify response status codes and error handling compliance
    if (expectedResponse.status !== undefined) {
        if (actualResponse.status !== expectedResponse.status) {
            validation.success = false;
            validation.errors.push(`Status code mismatch: expected ${expectedResponse.status}, got ${actualResponse.status}`);
        }
    }
    
    // Validate response timing and performance characteristics
    if (validationOptions.checkPerformance && actualResponse.processingTime > testContext?.expectations?.responseTime) {
        validation.warnings.push(`Response time exceeded expectation: ${actualResponse.processingTime}ms`);
    }
    
    // Check service logging and debugging information presence
    if (validationOptions.requireMetadata && !actualResponse.metadata) {
        validation.warnings.push('Response metadata missing');
    }
    
    // Verify response context and correlation information
    if (validationOptions.requireCorrelation && !actualResponse.correlationId) {
        validation.warnings.push('Response correlation ID missing');
    }
    
    validation.details = {
        actualKeys: Object.keys(actualResponse),
        expectedKeys: expectedResponse ? Object.keys(expectedResponse) : [],
        validationTime: Date.now()
    };
    
    // Return comprehensive validation result with detailed feedback and error reporting
    return validation;
}

/**
 * Simulates various service layer errors for testing error handling including validation
 * errors, processing errors, and external dependency failures with configurable error scenarios
 * 
 * @param {string} errorType - Type of error to simulate (validation, processing, internal)
 * @param {object} errorConfig - Configuration for error simulation behavior
 * @returns {Error} Mock error object configured for specific service error scenario testing
 */
function simulateServiceError(errorType, errorConfig = {}) {
    // Create mock error object using createMockError with specified service error type
    let mockError;
    
    switch (errorType) {
        case 'validation':
            mockError = createMockError(
                errorConfig.message || 'Validation failed',
                'VALIDATION_ERROR',
                { statusCode: HTTP_STATUS.BAD_REQUEST, ...errorConfig }
            );
            break;
            
        case 'processing':
            mockError = createMockError(
                errorConfig.message || 'Processing failed',
                'PROCESSING_ERROR',
                { statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, ...errorConfig }
            );
            break;
            
        case 'internal':
            mockError = createMockError(
                errorConfig.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                'INTERNAL_ERROR',
                { statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, ...errorConfig }
            );
            break;
            
        default:
            mockError = createMockError(
                'Unknown error',
                'UNKNOWN_ERROR',
                { statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, ...errorConfig }
            );
    }
    
    // Configure error properties based on errorType parameter for service context
    mockError.timestamp = new Date().toISOString();
    mockError.testContext = testContext?.id;
    
    // Set up error timing and propagation behavior from errorConfig
    if (errorConfig.delay) {
        mockError.delay = errorConfig.delay;
    }
    
    // Add service-specific error context, metadata, and business logic information
    mockError.serviceContext = {
        errorType,
        serviceName: 'helloService',
        functionName: errorConfig.functionName || 'unknown'
    };
    
    testLogger.debug('Simulated service error', { errorType, errorConfig, errorId: mockError.id });
    
    // Return configured service error object ready for error testing scenarios
    return mockError;
}

/**
 * Measures and validates service function performance including execution time, memory usage,
 * and resource consumption to ensure service performance requirements are met
 * 
 * @param {function} serviceFunction - Service function to measure performance
 * @param {object} testParams - Parameters to pass to the service function
 * @param {object} performanceOptions - Options for performance measurement
 * @returns {Promise<object>} Performance measurement result with timing data, resource usage, and validation status
 */
async function testServicePerformance(serviceFunction, testParams, performanceOptions = {}) {
    const performanceResult = {
        success: true,
        metrics: {},
        validation: {},
        errors: []
    };
    
    // Set up performance measurement using measureExecutionTime utility
    const memoryBefore = process.memoryUsage();
    const startTime = Date.now();
    
    try {
        // Configure service-specific performance monitoring and resource tracking
        const timeoutPromise = performanceOptions.timeout ? 
            new Promise((_, reject) => setTimeout(() => reject(new Error('Performance test timeout')), performanceOptions.timeout)) : 
            null;
        
        // Execute service function with provided test parameters and context
        const executionPromise = measureExecutionTime(serviceFunction, testParams);
        const result = timeoutPromise ? 
            await Promise.race([executionPromise, timeoutPromise]) : 
            await executionPromise;
        
        // Measure execution time, memory usage, and resource consumption
        const endTime = Date.now();
        const memoryAfter = process.memoryUsage();
        
        performanceResult.metrics = {
            executionTime: endTime - startTime,
            memoryBefore: memoryBefore,
            memoryAfter: memoryAfter,
            memoryDelta: memoryAfter.rss - memoryBefore.rss,
            result: result
        };
        
        // Compare performance results against service performance requirements
        const expectedPerformance = testContext?.expectations || {};
        
        // Validate response time meets service layer performance standards
        if (expectedPerformance.responseTime && performanceResult.metrics.executionTime > expectedPerformance.responseTime) {
            performanceResult.validation.responseTimeExceeded = true;
            performanceResult.errors.push(`Response time ${performanceResult.metrics.executionTime}ms exceeded limit ${expectedPerformance.responseTime}ms`);
        }
        
        // Validate memory usage is within acceptable limits
        if (expectedPerformance.memoryUsage && performanceResult.metrics.memoryDelta > expectedPerformance.memoryUsage) {
            performanceResult.validation.memoryUsageExceeded = true;
            performanceResult.errors.push(`Memory usage ${performanceResult.metrics.memoryDelta} bytes exceeded limit ${expectedPerformance.memoryUsage} bytes`);
        }
        
        performanceResult.success = performanceResult.errors.length === 0;
        
        // Log performance results for debugging, analysis, and optimization
        testLogger.info('Service performance measurement complete', {
            functionName: serviceFunction.name,
            executionTime: performanceResult.metrics.executionTime,
            memoryDelta: performanceResult.metrics.memoryDelta,
            success: performanceResult.success
        });
        
    } catch (error) {
        performanceResult.success = false;
        performanceResult.errors.push(`Performance test failed: ${error.message}`);
        testLogger.error('Service performance test error', { error: error.message, stack: error.stack });
    }
    
    // Return comprehensive performance measurement results with validation status
    return performanceResult;
}

/**
 * Validates service function calls including call count, parameters, return values, and
 * execution sequence for verifying service function behavior and business logic correctness
 * 
 * @param {function} serviceFunction - Service function to validate behavior
 * @param {object} expectedBehavior - Expected behavior patterns and call specifications
 * @param {object} assertionOptions - Options for assertion behavior
 */
function assertServiceFunctionCalls(serviceFunction, expectedBehavior, assertionOptions = {}) {
    // Extract service function execution data and call tracking information
    const functionName = serviceFunction.name || 'anonymous';
    
    // Compare actual function calls against expected service behavior patterns
    if (expectedBehavior.callCount !== undefined) {
        const actualCallCount = serviceFunction.callCount || 0;
        assert.strictEqual(
            actualCallCount,
            expectedBehavior.callCount,
            `Function ${functionName} expected ${expectedBehavior.callCount} calls, got ${actualCallCount}`
        );
    }
    
    // Validate function parameters for business logic correctness
    if (expectedBehavior.parameters && serviceFunction.lastCallArgs) {
        const expectedParams = expectedBehavior.parameters;
        const actualParams = serviceFunction.lastCallArgs;
        
        assert.deepStrictEqual(
            actualParams,
            expectedParams,
            `Function ${functionName} parameters mismatch`
        );
    }
    
    // Check function return values match expected service outcomes
    if (expectedBehavior.returnValue !== undefined && serviceFunction.lastReturnValue !== undefined) {
        assert.deepStrictEqual(
            serviceFunction.lastReturnValue,
            expectedBehavior.returnValue,
            `Function ${functionName} return value mismatch`
        );
    }
    
    // Verify service function sequence and business logic flow
    if (expectedBehavior.executionOrder && serviceFunction.executionOrder) {
        assert.deepStrictEqual(
            serviceFunction.executionOrder,
            expectedBehavior.executionOrder,
            `Function ${functionName} execution order mismatch`
        );
    }
    
    // Assert error handling and exception scenarios for service functions
    if (expectedBehavior.shouldThrow) {
        assert.ok(
            serviceFunction.threwError,
            `Function ${functionName} expected to throw error but did not`
        );
    }
    
    // Validate service logging and debugging information generation
    if (assertionOptions.validateLogging && expectedBehavior.logMessages) {
        // This would require mock logger integration for full validation
        testLogger.debug('Service function call validation complete', { functionName, expectedBehavior });
    }
    
    testLogger.debug('Function behavior assertion complete', { functionName, success: true });
}

/**
 * Creates mock objects for service dependencies including logger, validators, and external
 * utilities to enable isolated service testing without external dependencies
 * 
 * @param {object} dependencyConfig - Configuration for mock dependencies
 * @returns {object} Mock service dependencies object with configured mocks for isolated testing
 */
function createMockServiceDependencies(dependencyConfig = {}) {
    // Create mock logger using createMockFunction with service logging behavior
    const mockLogger = {
        info: createMockFunction(),
        warn: createMockFunction(),
        error: createMockFunction(),
        debug: createMockFunction()
    };
    
    // Set up mock validation functions with configurable validation results
    const mockValidator = {
        validateRequest: createMockFunction(() => dependencyConfig.validationResult || { isValid: true }),
        validateResponse: createMockFunction(() => ({ isValid: true })),
        validateInput: createMockFunction(() => true)
    };
    
    // Create mock utility functions for service helper operations
    const mockUtilities = {
        generateId: createMockFunction(() => `mock-id-${Date.now()}`),
        formatDate: createMockFunction(() => new Date().toISOString()),
        sanitizeInput: createMockFunction((input) => input)
    };
    
    // Configure mock behavior for external service dependencies
    const mockExternalServices = {
        httpClient: {
            get: createMockFunction(),
            post: createMockFunction(),
            put: createMockFunction(),
            delete: createMockFunction()
        }
    };
    
    // Set up mock error handling and recovery mechanisms
    const mockErrorHandler = {
        handleError: createMockFunction((error) => ({ handled: true, error })),
        formatError: createMockFunction((error) => ({ message: error.message, code: error.code })),
        logError: createMockFunction()
    };
    
    // Add mock performance monitoring and metrics collection
    const mockMetrics = {
        recordMetric: createMockFunction(),
        incrementCounter: createMockFunction(),
        recordTiming: createMockFunction()
    };
    
    // Configure mock cleanup and resource management functions
    const mockResourceManager = {
        cleanup: createMockFunction(),
        release: createMockFunction(),
        reset: createMockFunction()
    };
    
    const dependencies = {
        logger: mockLogger,
        validator: mockValidator,
        utilities: mockUtilities,
        externalServices: mockExternalServices,
        errorHandler: mockErrorHandler,
        metrics: mockMetrics,
        resourceManager: mockResourceManager,
        
        // Add dependency reset functionality
        reset: () => {
            Object.values(dependencies).forEach(dep => {
                if (dep && dep.reset && typeof dep.reset === 'function') {
                    dep.reset();
                }
            });
        }
    };
    
    testLogger.debug('Created mock service dependencies', { 
        dependencyCount: Object.keys(dependencies).length - 1, // exclude reset function
        config: dependencyConfig 
    });
    
    // Return complete mock dependencies object for service isolation testing
    return dependencies;
}

/**
 * Validates service business logic implementation including data processing, validation rules,
 * response generation, and error handling for comprehensive business logic verification
 * 
 * @param {string} businessRuleName - Name of the business rule to validate
 * @param {object} inputData - Input data for business logic validation
 * @param {object} expectedOutcome - Expected outcome from business logic execution
 * @returns {object} Business logic validation result with rule compliance and detailed analysis
 */
function validateServiceBusinessLogic(businessRuleName, inputData, expectedOutcome) {
    const validation = {
        success: true,
        ruleName: businessRuleName,
        compliance: {},
        details: {},
        errors: []
    };
    
    try {
        // Execute service business logic with provided input data and context
        let actualOutcome;
        
        switch (businessRuleName) {
            case 'hello-response-generation':
                actualOutcome = generateHelloResponse(inputData);
                break;
                
            case 'request-validation':
                actualOutcome = validateHelloRequest(inputData);
                break;
                
            case 'request-processing':
                actualOutcome = processHelloRequest(inputData);
                break;
                
            case 'service-response-creation':
                actualOutcome = createHelloServiceResponse(inputData);
                break;
                
            default:
                throw new Error(`Unknown business rule: ${businessRuleName}`);
        }
        
        // Validate business rule implementation against expected behavior patterns
        if (expectedOutcome.data !== undefined) {
            if (actualOutcome.data !== expectedOutcome.data) {
                validation.success = false;
                validation.errors.push(`Data mismatch in rule ${businessRuleName}`);
            }
        }
        
        // Check data processing accuracy and transformation correctness
        if (expectedOutcome.processedCorrectly !== undefined) {
            validation.compliance.dataProcessing = actualOutcome !== null && actualOutcome !== undefined;
        }
        
        // Verify validation rule enforcement and error condition handling
        if (expectedOutcome.validationPassed !== undefined) {
            validation.compliance.validation = actualOutcome.isValid === expectedOutcome.validationPassed;
        }
        
        // Validate response generation follows business logic requirements
        if (expectedOutcome.responseGenerated !== undefined) {
            validation.compliance.responseGeneration = actualOutcome.success === expectedOutcome.responseGenerated;
        }
        
        // Check error handling and recovery mechanisms for business rules
        if (expectedOutcome.errorHandled !== undefined && actualOutcome.error) {
            validation.compliance.errorHandling = !!actualOutcome.error === expectedOutcome.errorHandled;
        }
        
        validation.details = {
            actualOutcome,
            expectedOutcome,
            validationTime: Date.now(),
            inputDataKeys: Object.keys(inputData || {})
        };
        
        // Verify service logging captures business logic execution details
        testLogger.info('Business logic validation complete', {
            ruleName: businessRuleName,
            success: validation.success,
            compliance: validation.compliance
        });
        
    } catch (error) {
        validation.success = false;
        validation.errors.push(`Business logic validation failed: ${error.message}`);
        testLogger.error('Business logic validation error', { 
            ruleName: businessRuleName, 
            error: error.message 
        });
    }
    
    // Return comprehensive business logic validation result with compliance analysis
    return validation;
}

// Test suite setup and teardown hooks using Node.js built-in test runner lifecycle
beforeEach(async () => {
    // Set up clean test environment before each test execution
    const setup = setupServiceTests({
        requestOptions: { correlationId: generateTestId() },
        responseOptions: { headers: { 'X-Test-Mode': 'unit-test' } }
    });
    
    testLogger.info('Test setup complete', { setupId: setup.context.id });
});

afterEach(async () => {
    // Clean up test environment after each test execution
    teardownServiceTests();
    testLogger.info('Test teardown complete');
});

// Main test suite for HelloService component comprehensive unit testing
describe('HelloService Component Unit Tests', () => {
    
    // Test suite for generateHelloResponse function comprehensive testing
    describe('generateHelloResponse Function Tests', () => {
        
        it('should return Hello world response when called with valid parameters', async () => {
            // Arrange - Set up test data and expectations
            const testRequest = { method: 'GET', path: '/hello' };
            const expectedResponse = RESPONSES.HELLO_WORLD;
            
            // Act - Execute the function under test
            const actualResponse = generateHelloResponse(testRequest);
            
            // Assert - Verify the function behavior and response
            assert.strictEqual(actualResponse, expectedResponse, 'Should return Hello world response');
            assert.ok(typeof actualResponse === 'string', 'Response should be a string');
            
            // Performance validation
            const performanceResult = await testServicePerformance(
                () => generateHelloResponse(testRequest),
                testRequest,
                { timeout: 1000 }
            );
            assert.ok(performanceResult.success, 'Performance requirements should be met');
            
            testLogger.info('generateHelloResponse basic test passed');
        });
        
        it('should handle empty request object gracefully', async () => {
            // Arrange - Set up edge case scenario
            const emptyRequest = {};
            
            // Act - Execute function with edge case input
            const response = generateHelloResponse(emptyRequest);
            
            // Assert - Verify graceful handling
            assert.ok(response !== null, 'Should handle empty request gracefully');
            assert.strictEqual(response, RESPONSES.HELLO_WORLD, 'Should return standard hello response');
            
            testLogger.info('generateHelloResponse empty request test passed');
        });
        
        it('should maintain consistent response format across multiple calls', async () => {
            // Arrange - Set up multiple test iterations
            const testRequest = { method: 'GET', path: '/hello' };
            const responses = [];
            const iterations = 10;
            
            // Act - Execute function multiple times
            for (let i = 0; i < iterations; i++) {
                responses.push(generateHelloResponse(testRequest));
            }
            
            // Assert - Verify consistency
            responses.forEach((response, index) => {
                assert.strictEqual(response, RESPONSES.HELLO_WORLD, `Response ${index} should be consistent`);
            });
            
            // Validate all responses are identical
            const uniqueResponses = [...new Set(responses)];
            assert.strictEqual(uniqueResponses.length, 1, 'All responses should be identical');
            
            testLogger.info('generateHelloResponse consistency test passed');
        });
        
        it('should handle performance requirements under load', async () => {
            // Arrange - Set up load testing scenario
            const testRequest = { method: 'GET', path: '/hello' };
            const loadTestPromises = [];
            const concurrentRequests = 50;
            
            // Act - Execute concurrent requests
            for (let i = 0; i < concurrentRequests; i++) {
                loadTestPromises.push(
                    testServicePerformance(
                        () => generateHelloResponse(testRequest),
                        testRequest,
                        { timeout: 2000 }
                    )
                );
            }
            
            const results = await Promise.all(loadTestPromises);
            
            // Assert - Verify performance under load
            results.forEach((result, index) => {
                assert.ok(result.success, `Load test ${index} should meet performance requirements`);
                assert.ok(result.metrics.executionTime < 100, `Load test ${index} should complete within 100ms`);
            });
            
            testLogger.info('generateHelloResponse load test passed', { concurrentRequests, results: results.length });
        });
    });
    
    // Test suite for validateHelloRequest function comprehensive testing
    describe('validateHelloRequest Function Tests', () => {
        
        it('should validate GET request to /hello endpoint successfully', async () => {
            // Arrange - Set up valid GET request
            const validRequest = deepClone(validRequests.helloGet);
            
            // Act - Execute validation function
            const validationResult = validateHelloRequest(validRequest);
            
            // Assert - Verify successful validation
            assert.ok(validationResult.isValid, 'Valid GET request should pass validation');
            assert.strictEqual(validationResult.errors.length, 0, 'Should have no validation errors');
            assert.ok(validationResult.metadata, 'Should include validation metadata');
            
            // Validate business logic compliance
            const businessLogicResult = validateServiceBusinessLogic(
                'request-validation',
                validRequest,
                { validationPassed: true, processedCorrectly: true }
            );
            assert.ok(businessLogicResult.success, 'Business logic validation should pass');
            
            testLogger.info('validateHelloRequest valid GET test passed');
        });
        
        it('should reject POST requests with method not allowed validation', async () => {
            // Arrange - Set up invalid POST request
            const invalidRequest = deepClone(invalidRequests.helloPost);
            
            // Act - Execute validation function
            const validationResult = validateHelloRequest(invalidRequest);
            
            // Assert - Verify validation rejection
            assert.ok(!validationResult.isValid, 'POST request should fail validation');
            assert.ok(validationResult.errors.length > 0, 'Should have validation errors');
            assert.ok(
                validationResult.errors.some(error => error.includes('method')),
                'Should have method-related error'
            );
            
            // Validate error response structure
            assert.ok(validationResult.errorCode, 'Should include error code');
            assert.strictEqual(validationResult.statusCode, HTTP_STATUS.METHOD_NOT_ALLOWED, 'Should return 405 status');
            
            testLogger.info('validateHelloRequest POST rejection test passed');
        });
        
        it('should reject PUT requests with method not allowed validation', async () => {
            // Arrange - Set up invalid PUT request
            const invalidRequest = deepClone(invalidRequests.helloPut);
            
            // Act - Execute validation function
            const validationResult = validateHelloRequest(invalidRequest);
            
            // Assert - Verify validation rejection
            assert.ok(!validationResult.isValid, 'PUT request should fail validation');
            assert.ok(validationResult.errors.length > 0, 'Should have validation errors');
            assert.strictEqual(validationResult.statusCode, HTTP_STATUS.METHOD_NOT_ALLOWED, 'Should return 405 status');
            
            testLogger.info('validateHelloRequest PUT rejection test passed');
        });
        
        it('should handle malformed request objects gracefully', async () => {
            // Arrange - Set up various malformed requests
            const malformedRequests = [
                null,
                undefined,
                '',
                {},
                { method: null },
                { path: null },
                { method: 'INVALID', path: '/hello' }
            ];
            
            // Act & Assert - Test each malformed request
            malformedRequests.forEach((malformedRequest, index) => {
                const validationResult = validateHelloRequest(malformedRequest);
                
                assert.ok(!validationResult.isValid, `Malformed request ${index} should fail validation`);
                assert.ok(validationResult.errors.length > 0, `Malformed request ${index} should have errors`);
                assert.ok(validationResult.statusCode >= 400, `Malformed request ${index} should have error status code`);
            });
            
            testLogger.info('validateHelloRequest malformed request handling test passed');
        });
        
        it('should provide detailed validation metadata and context', async () => {
            // Arrange - Set up request for metadata validation
            const testRequest = deepClone(validRequests.helloGetWithHeaders);
            
            // Act - Execute validation with metadata focus
            const validationResult = validateHelloRequest(testRequest);
            
            // Assert - Verify metadata completeness
            assert.ok(validationResult.metadata, 'Should include validation metadata');
            assert.ok(validationResult.metadata.timestamp, 'Should include validation timestamp');
            assert.ok(validationResult.metadata.validationId, 'Should include validation ID');
            assert.ok(validationResult.metadata.requestAnalysis, 'Should include request analysis');
            
            // Validate metadata structure
            assert.ok(typeof validationResult.metadata.timestamp === 'string', 'Timestamp should be string');
            assert.ok(typeof validationResult.metadata.validationId === 'string', 'Validation ID should be string');
            
            testLogger.info('validateHelloRequest metadata test passed');
        });
    });
    
    // Test suite for processHelloRequest function comprehensive testing
    describe('processHelloRequest Function Tests', () => {
        
        it('should process valid hello request and return success response', async () => {
            // Arrange - Set up complete processing scenario
            const validRequest = deepClone(validRequests.helloGet);
            const mockDependencies = createMockServiceDependencies();
            
            // Act - Execute request processing
            const processingResult = await processHelloRequest(validRequest, mockDependencies);
            
            // Assert - Verify successful processing
            assert.ok(processingResult.success, 'Request processing should be successful');
            assert.strictEqual(processingResult.data, RESPONSES.HELLO_WORLD, 'Should return hello world data');
            assert.strictEqual(processingResult.statusCode, HTTP_STATUS.OK, 'Should return 200 status code');
            
            // Validate processing metadata
            assert.ok(processingResult.metadata, 'Should include processing metadata');
            assert.ok(processingResult.metadata.processingTime, 'Should include processing time');
            assert.ok(processingResult.metadata.requestId, 'Should include request ID');
            
            // Validate business logic execution
            const businessLogicResult = validateServiceBusinessLogic(
                'request-processing',
                validRequest,
                { processedCorrectly: true, responseGenerated: true }
            );
            assert.ok(businessLogicResult.success, 'Business logic should execute correctly');
            
            testLogger.info('processHelloRequest success test passed');
        });
        
        it('should handle validation errors during request processing', async () => {
            // Arrange - Set up invalid request scenario
            const invalidRequest = deepClone(invalidRequests.helloPost);
            const mockDependencies = createMockServiceDependencies({
                validationResult: { isValid: false, errors: ['Method not allowed'] }
            });
            
            // Act - Execute processing with validation error
            const processingResult = await processHelloRequest(invalidRequest, mockDependencies);
            
            // Assert - Verify error handling
            assert.ok(!processingResult.success, 'Processing should fail for invalid request');
            assert.strictEqual(processingResult.statusCode, HTTP_STATUS.METHOD_NOT_ALLOWED, 'Should return 405 status');
            assert.ok(processingResult.error, 'Should include error information');
            assert.ok(processingResult.error.type === 'validation', 'Should identify as validation error');
            
            testLogger.info('processHelloRequest validation error test passed');
        });
        
        it('should handle internal processing errors gracefully', async () => {
            // Arrange - Set up error injection scenario
            const validRequest = deepClone(validRequests.helloGet);
            const processingError = simulateServiceError('processing', {
                message: 'Internal processing failure',
                functionName: 'processHelloRequest'
            });
            
            // Mock dependencies to throw error
            const mockDependencies = createMockServiceDependencies();
            mockDependencies.errorHandler.handleError = createMockFunction(() => {
                throw processingError;
            });
            
            // Act - Execute processing with error injection
            const processingResult = await processHelloRequest(validRequest, mockDependencies);
            
            // Assert - Verify error recovery
            assert.ok(!processingResult.success, 'Processing should fail with internal error');
            assert.strictEqual(processingResult.statusCode, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Should return 500 status');
            assert.ok(processingResult.error, 'Should include error details');
            assert.ok(processingResult.error.message, 'Should include error message');
            
            testLogger.info('processHelloRequest internal error test passed');
        });
        
        it('should maintain processing performance under concurrent load', async () => {
            // Arrange - Set up concurrent processing scenario
            const validRequest = deepClone(validRequests.helloGet);
            const concurrentRequests = 25;
            const processingPromises = [];
            
            // Act - Execute concurrent processing requests
            for (let i = 0; i < concurrentRequests; i++) {
                const mockDependencies = createMockServiceDependencies();
                processingPromises.push(
                    testServicePerformance(
                        () => processHelloRequest(validRequest, mockDependencies),
                        { request: validRequest, dependencies: mockDependencies },
                        { timeout: 5000 }
                    )
                );
            }
            
            const performanceResults = await Promise.all(processingPromises);
            
            // Assert - Verify concurrent performance
            performanceResults.forEach((result, index) => {
                assert.ok(result.success, `Concurrent request ${index} should meet performance requirements`);
                assert.ok(result.metrics.executionTime < 200, `Concurrent request ${index} should complete within 200ms`);
            });
            
            // Validate overall performance consistency
            const avgExecutionTime = performanceResults.reduce((sum, result) => 
                sum + result.metrics.executionTime, 0) / performanceResults.length;
            assert.ok(avgExecutionTime < 150, 'Average execution time should be under 150ms');
            
            testLogger.info('processHelloRequest concurrent load test passed', { 
                concurrentRequests, 
                avgExecutionTime 
            });
        });
        
        it('should provide comprehensive processing context and correlation', async () => {
            // Arrange - Set up request with correlation tracking
            const requestWithCorrelation = {
                ...deepClone(validRequests.helloGetWithHeaders),
                correlationId: generateTestId(),
                requestId: generateTestId()
            };
            const mockDependencies = createMockServiceDependencies();
            
            // Act - Execute processing with correlation
            const processingResult = await processHelloRequest(requestWithCorrelation, mockDependencies);
            
            // Assert - Verify correlation and context
            assert.ok(processingResult.correlationId, 'Should preserve correlation ID');
            assert.ok(processingResult.requestId, 'Should preserve request ID');
            assert.ok(processingResult.metadata.processingContext, 'Should include processing context');
            
            // Validate context completeness
            const context = processingResult.metadata.processingContext;
            assert.ok(context.startTime, 'Should include processing start time');
            assert.ok(context.endTime, 'Should include processing end time');
            assert.ok(context.duration >= 0, 'Should include processing duration');
            
            testLogger.info('processHelloRequest correlation test passed');
        });
    });
    
    // Test suite for createHelloServiceResponse function comprehensive testing
    describe('createHelloServiceResponse Function Tests', () => {
        
        it('should create standardized service response with proper structure', async () => {
            // Arrange - Set up response creation parameters
            const responseData = RESPONSES.HELLO_WORLD;
            const responseMetadata = {
                requestId: generateTestId(),
                processingTime: 25
            };
            
            // Act - Execute response creation
            const serviceResponse = createHelloServiceResponse(responseData, responseMetadata);
            
            // Assert - Verify response structure
            assert.ok(serviceResponse.success, 'Service response should indicate success');
            assert.strictEqual(serviceResponse.data, responseData, 'Should include provided data');
            assert.strictEqual(serviceResponse.statusCode, HTTP_STATUS.OK, 'Should have OK status code');
            assert.ok(serviceResponse.metadata, 'Should include metadata');
            assert.ok(serviceResponse.timestamp, 'Should include timestamp');
            
            // Validate response format compliance
            const validation = validateServiceResponse(serviceResponse, {
                data: responseData,
                status: HTTP_STATUS.OK
            }, { requireMetadata: true });
            assert.ok(validation.success, 'Response should pass validation');
            
            testLogger.info('createHelloServiceResponse structure test passed');
        });
        
        it('should create error service response with proper error structure', async () => {
            // Arrange - Set up error response scenario
            const errorMessage = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
            const errorMetadata = {
                errorCode: 'INTERNAL_ERROR',
                errorType: 'processing'
            };
            
            // Act - Execute error response creation
            const errorResponse = createHelloServiceResponse(null, errorMetadata, {
                isError: true,
                statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
                errorMessage: errorMessage
            });
            
            // Assert - Verify error response structure
            assert.ok(!errorResponse.success, 'Error response should indicate failure');
            assert.strictEqual(errorResponse.statusCode, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Should have error status code');
            assert.ok(errorResponse.error, 'Should include error object');
            assert.strictEqual(errorResponse.error.message, errorMessage, 'Should include error message');
            
            // Validate error response metadata
            assert.ok(errorResponse.metadata, 'Should include error metadata');
            assert.strictEqual(errorResponse.metadata.errorCode, 'INTERNAL_ERROR', 'Should include error code');
            
            testLogger.info('createHelloServiceResponse error test passed');
        });
        
        it('should handle custom metadata and response configuration', async () => {
            // Arrange - Set up custom response configuration
            const responseData = RESPONSES.HELLO_WORLD;
            const customMetadata = {
                customField: 'custom-value',
                processingDetails: {
                    handler: 'hello-handler',
                    version: '1.0.0'
                },
                performance: {
                    executionTime: 15,
                    memoryUsage: 1024
                }
            };
            const responseOptions = {
                includeHeaders: true,
                includeTimestamp: true,
                includeCorrelation: true
            };
            
            // Act - Execute custom response creation
            const customResponse = createHelloServiceResponse(responseData, customMetadata, responseOptions);
            
            // Assert - Verify custom configuration application
            assert.ok(customResponse.metadata.customField, 'Should include custom metadata fields');
            assert.ok(customResponse.metadata.processingDetails, 'Should include nested metadata');
            assert.ok(customResponse.headers, 'Should include headers when requested');
            assert.ok(customResponse.correlationId, 'Should include correlation ID when requested');
            
            // Validate metadata preservation
            assert.strictEqual(
                customResponse.metadata.customField, 
                customMetadata.customField, 
                'Should preserve custom metadata values'
            );
            
            testLogger.info('createHelloServiceResponse custom metadata test passed');
        });
        
        it('should validate response serialization and format compliance', async () => {
            // Arrange - Set up various response data types
            const testScenarios = [
                { data: RESPONSES.HELLO_WORLD, type: 'string' },
                { data: { message: RESPONSES.HELLO_WORLD }, type: 'object' },
                { data: [RESPONSES.HELLO_WORLD], type: 'array' },
                { data: null, type: 'null' }
            ];
            
            // Act & Assert - Test each scenario
            testScenarios.forEach((scenario, index) => {
                const response = createHelloServiceResponse(scenario.data, { testIndex: index });
                
                // Verify serialization capability
                assert.doesNotThrow(() => {
                    JSON.stringify(response);
                }, `Response ${index} (${scenario.type}) should be JSON serializable`);
                
                // Verify response structure
                assert.ok(response.success !== undefined, `Response ${index} should have success field`);
                assert.ok(response.statusCode, `Response ${index} should have status code`);
                assert.ok(response.metadata, `Response ${index} should have metadata`);
                
                // Validate data handling
                if (scenario.data !== null) {
                    assert.strictEqual(response.data, scenario.data, `Response ${index} should preserve data`);
                }
            });
            
            testLogger.info('createHelloServiceResponse serialization test passed');
        });
    });
    
    // Test suite for getHelloServiceMetadata function comprehensive testing
    describe('getHelloServiceMetadata Function Tests', () => {
        
        it('should return complete service metadata information', async () => {
            // Arrange - Set up metadata request
            const metadataRequest = { includeAll: true };
            
            // Act - Execute metadata retrieval
            const metadata = getHelloServiceMetadata(metadataRequest);
            
            // Assert - Verify metadata completeness
            assert.ok(metadata.serviceName, 'Should include service name');
            assert.ok(metadata.version, 'Should include service version');
            assert.ok(metadata.endpoints, 'Should include endpoint information');
            assert.ok(metadata.capabilities, 'Should include service capabilities');
            
            // Validate specific metadata fields
            assert.strictEqual(metadata.serviceName, 'helloService', 'Should have correct service name');
            assert.ok(Array.isArray(metadata.endpoints), 'Endpoints should be an array');
            assert.ok(metadata.endpoints.includes('/hello'), 'Should include hello endpoint');
            
            // Validate metadata structure
            assert.ok(metadata.metadata, 'Should include nested metadata');
            assert.ok(metadata.metadata.timestamp, 'Should include metadata timestamp');
            
            testLogger.info('getHelloServiceMetadata complete test passed');
        });
        
        it('should provide endpoint-specific metadata when requested', async () => {
            // Arrange - Set up endpoint-specific request
            const endpointRequest = { endpoint: '/hello', detailed: true };
            
            // Act - Execute endpoint metadata retrieval
            const endpointMetadata = getHelloServiceMetadata(endpointRequest);
            
            // Assert - Verify endpoint-specific information
            assert.ok(endpointMetadata.endpoint, 'Should include endpoint information');
            assert.strictEqual(endpointMetadata.endpoint.path, '/hello', 'Should specify hello endpoint');
            assert.ok(endpointMetadata.endpoint.methods, 'Should include supported methods');
            assert.ok(endpointMetadata.endpoint.methods.includes('GET'), 'Should support GET method');
            
            // Validate endpoint capabilities
            assert.ok(endpointMetadata.endpoint.capabilities, 'Should include endpoint capabilities');
            assert.ok(endpointMetadata.endpoint.responseFormat, 'Should include response format info');
            
            testLogger.info('getHelloServiceMetadata endpoint-specific test passed');
        });
        
        it('should include performance metrics and service statistics', async () => {
            // Arrange - Set up metrics request
            const metricsRequest = { includeMetrics: true, includeStats: true };
            
            // Act - Execute metrics retrieval
            const metricsMetadata = getHelloServiceMetadata(metricsRequest);
            
            // Assert - Verify metrics inclusion
            assert.ok(metricsMetadata.metrics, 'Should include performance metrics');
            assert.ok(metricsMetadata.statistics, 'Should include service statistics');
            
            // Validate metrics structure
            const metrics = metricsMetadata.metrics;
            assert.ok(typeof metrics.uptime === 'number', 'Should include uptime metric');
            assert.ok(typeof metrics.requestCount === 'number', 'Should include request count');
            assert.ok(typeof metrics.averageResponseTime === 'number', 'Should include average response time');
            
            // Validate statistics structure
            const stats = metricsMetadata.statistics;
            assert.ok(stats.lastRequest, 'Should include last request information');
            assert.ok(stats.errorRate !== undefined, 'Should include error rate');
            
            testLogger.info('getHelloServiceMetadata metrics test passed');
        });
        
        it('should handle minimal metadata requests efficiently', async () => {
            // Arrange - Set up minimal request
            const minimalRequest = { minimal: true };
            
            // Act - Execute minimal metadata retrieval with performance measurement
            const performanceResult = await testServicePerformance(
                () => getHelloServiceMetadata(minimalRequest),
                minimalRequest,
                { timeout: 500 }
            );
            
            const minimalMetadata = performanceResult.metrics.result;
            
            // Assert - Verify minimal response efficiency
            assert.ok(performanceResult.success, 'Minimal metadata request should be performant');
            assert.ok(performanceResult.metrics.executionTime < 50, 'Should complete quickly for minimal request');
            
            // Validate minimal metadata content
            assert.ok(minimalMetadata.serviceName, 'Should include essential service name');
            assert.ok(minimalMetadata.status, 'Should include service status');
            
            // Ensure minimal response doesn't include heavy data
            assert.ok(!minimalMetadata.detailedMetrics, 'Should not include detailed metrics in minimal response');
            assert.ok(!minimalMetadata.fullCapabilities, 'Should not include full capabilities in minimal response');
            
            testLogger.info('getHelloServiceMetadata minimal test passed');
        });
        
        it('should provide service health and status information', async () => {
            // Arrange - Set up health status request
            const healthRequest = { includeHealth: true, includeStatus: true };
            
            // Act - Execute health metadata retrieval
            const healthMetadata = getHelloServiceMetadata(healthRequest);
            
            // Assert - Verify health information
            assert.ok(healthMetadata.health, 'Should include health information');
            assert.ok(healthMetadata.status, 'Should include status information');
            
            // Validate health data structure
            const health = healthMetadata.health;
            assert.ok(health.isHealthy !== undefined, 'Should indicate health status');
            assert.ok(health.lastHealthCheck, 'Should include last health check time');
            assert.ok(health.dependencies, 'Should include dependency health status');
            
            // Validate status information
            const status = healthMetadata.status;
            assert.ok(status.state, 'Should include service state');
            assert.ok(['running', 'stopped', 'error'].includes(status.state), 'Should have valid state');
            assert.ok(status.startTime, 'Should include service start time');
            
            testLogger.info('getHelloServiceMetadata health test passed');
        });
    });
    
    // Test suite for formatServiceError function comprehensive testing
    describe('formatServiceError Function Tests', () => {
        
        it('should format validation errors with proper structure and context', async () => {
            // Arrange - Set up validation error scenario
            const validationError = simulateServiceError('validation', {
                message: 'Invalid request method',
                functionName: 'validateHelloRequest'
            });
            const errorContext = {
                requestId: generateTestId(),
                endpoint: '/hello',
                method: 'POST'
            };
            
            // Act - Execute error formatting
            const formattedError = formatServiceError(validationError, errorContext);
            
            // Assert - Verify formatted error structure
            assert.ok(formattedError.error, 'Should include error object');
            assert.ok(formattedError.statusCode, 'Should include status code');
            assert.ok(formattedError.message, 'Should include error message');
            assert.ok(formattedError.context, 'Should include error context');
            
            // Validate error categorization
            assert.strictEqual(formattedError.error.type, 'validation', 'Should categorize as validation error');
            assert.strictEqual(formattedError.statusCode, HTTP_STATUS.BAD_REQUEST, 'Should have appropriate status code');
            
            // Validate context preservation
            assert.strictEqual(formattedError.context.requestId, errorContext.requestId, 'Should preserve request ID');
            assert.strictEqual(formattedError.context.endpoint, errorContext.endpoint, 'Should preserve endpoint');
            
            testLogger.info('formatServiceError validation test passed');
        });
        
        it('should format internal server errors with sanitized information', async () => {
            // Arrange - Set up internal error scenario
            const internalError = simulateServiceError('internal', {
                message: 'Database connection failed',
                stack: 'Error: Database connection failed\n    at connect...',
                sensitive: 'password123' // This should be sanitized
            });
            const errorContext = {
                requestId: generateTestId(),
                functionName: 'processHelloRequest'
            };
            
            // Act - Execute error formatting
            const formattedError = formatServiceError(internalError, errorContext);
            
            // Assert - Verify sanitized error formatting
            assert.ok(formattedError.error, 'Should include error object');
            assert.strictEqual(formattedError.statusCode, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Should have 500 status code');
            assert.strictEqual(formattedError.error.type, 'internal', 'Should categorize as internal error');
            
            // Validate information sanitization
            assert.ok(!formattedError.error.stack, 'Should not include stack trace in formatted error');
            assert.ok(!formattedError.error.sensitive, 'Should not include sensitive information');
            assert.ok(formattedError.message, 'Should include sanitized error message');
            
            // Validate error correlation
            assert.ok(formattedError.correlationId, 'Should include correlation ID');
            assert.ok(formattedError.timestamp, 'Should include error timestamp');
            
            testLogger.info('formatServiceError internal error test passed');
        });
        
        it('should handle unknown error types with default formatting', async () => {
            // Arrange - Set up unknown error scenario
            const unknownError = new Error('Unexpected error occurred');
            unknownError.code = 'UNKNOWN_ERROR';
            const errorContext = { requestId: generateTestId() };
            
            // Act - Execute error formatting for unknown error
            const formattedError = formatServiceError(unknownError, errorContext);
            
            // Assert - Verify default error formatting
            assert.ok(formattedError.error, 'Should include error object');
            assert.strictEqual(formattedError.statusCode, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Should default to 500 status');
            assert.ok(formattedError.error.type, 'Should assign error type');
            assert.ok(formattedError.message, 'Should include error message');
            
            // Validate default error handling
            assert.ok(formattedError.correlationId, 'Should generate correlation ID');
            assert.ok(formattedError.timestamp, 'Should include error timestamp');
            
            testLogger.info('formatServiceError unknown error test passed');
        });
        
        it('should provide consistent error format across different error types', async () => {
            // Arrange - Set up multiple error type scenarios
            const errorTypes = ['validation', 'processing', 'internal'];
            const formattedErrors = [];
            
            // Act - Format different error types
            errorTypes.forEach(errorType => {
                const error = simulateServiceError(errorType, {
                    message: `${errorType} error occurred`,
                    functionName: 'testFunction'
                });
                const context = { requestId: generateTestId(), errorType };
                const formatted = formatServiceError(error, context);
                formattedErrors.push(formatted);
            });
            
            // Assert - Verify consistent formatting structure
            formattedErrors.forEach((formattedError, index) => {
                const errorType = errorTypes[index];
                
                // Validate consistent structure
                assert.ok(formattedError.error, `Error ${errorType} should have error object`);
                assert.ok(formattedError.statusCode, `Error ${errorType} should have status code`);
                assert.ok(formattedError.message, `Error ${errorType} should have message`);
                assert.ok(formattedError.timestamp, `Error ${errorType} should have timestamp`);
                assert.ok(formattedError.correlationId, `Error ${errorType} should have correlation ID`);
                
                // Validate error type specific properties
                assert.strictEqual(formattedError.error.type, errorType, `Should preserve error type ${errorType}`);
            });
            
            // Validate formatting consistency
            const structures = formattedErrors.map(err => Object.keys(err).sort());
            const firstStructure = structures[0];
            structures.forEach((structure, index) => {
                assert.deepStrictEqual(
                    structure, 
                    firstStructure, 
                    `Error ${errorTypes[index]} should have consistent structure`
                );
            });
            
            testLogger.info('formatServiceError consistency test passed');
        });
        
        it('should include appropriate debugging information for development', async () => {
            // Arrange - Set up development environment error
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            
            const debugError = simulateServiceError('processing', {
                message: 'Processing failed with detailed context',
                stack: 'Error: Processing failed\n    at processHelloRequest...',
                debugInfo: { step: 'validation', input: 'test-data' }
            });
            const errorContext = {
                requestId: generateTestId(),
                developmentMode: true
            };
            
            // Act - Execute error formatting in development mode
            const formattedError = formatServiceError(debugError, errorContext);
            
            // Assert - Verify development debugging information
            assert.ok(formattedError.debug, 'Should include debug information in development');
            assert.ok(formattedError.debug.stack, 'Should include stack trace in development');
            assert.ok(formattedError.debug.context, 'Should include debug context');
            
            // Validate debugging details
            const debug = formattedError.debug;
            assert.ok(debug.errorLocation, 'Should include error location information');
            assert.ok(debug.requestContext, 'Should include request context for debugging');
            
            // Cleanup - Restore environment
            process.env.NODE_ENV = originalNodeEnv;
            
            testLogger.info('formatServiceError development debug test passed');
        });
    });
    
    // Test suite for createRequestContext function comprehensive testing
    describe('createRequestContext Function Tests', () => {
        
        it('should create comprehensive request context with all required fields', async () => {
            // Arrange - Set up request context creation scenario
            const mockRequest = createMockRequest({
                method: 'GET',
                path: '/hello',
                headers: { 'x-correlation-id': generateTestId() }
            });
            const contextOptions = {
                includeMetrics: true,
                includeCorrelation: true,
                serviceName: 'helloService'
            };
            
            // Act - Execute request context creation
            const requestContext = createRequestContext(mockRequest, contextOptions);
            
            // Assert - Verify context completeness
            assert.ok(requestContext.requestId, 'Should include unique request ID');
            assert.ok(requestContext.correlationId, 'Should include correlation ID');
            assert.ok(requestContext.timestamp, 'Should include request timestamp');
            assert.ok(requestContext.method, 'Should include HTTP method');
            assert.ok(requestContext.path, 'Should include request path');
            
            // Validate context metadata
            assert.ok(requestContext.metadata, 'Should include context metadata');
            assert.ok(requestContext.metadata.serviceName, 'Should include service name');
            assert.ok(requestContext.metadata.startTime, 'Should include processing start time');
            
            // Validate service-specific context
            assert.strictEqual(requestContext.method, mockRequest.method, 'Should preserve request method');
            assert.strictEqual(requestContext.path, mockRequest.path, 'Should preserve request path');
            assert.strictEqual(requestContext.metadata.serviceName, contextOptions.serviceName, 'Should include service name');
            
            testLogger.info('createRequestContext comprehensive test passed');
        });
        
        it('should handle request context with custom headers and metadata extraction', async () => {
            // Arrange - Set up request with custom headers
            const mockRequest = createMockRequest({
                method: 'GET',
                path: '/hello',
                headers: {
                    'x-correlation-id': generateTestId(),
                    'x-request-source': 'test-client',
                    'x-user-agent': 'Node.js Test Runner',
                    'authorization': 'Bearer test-token'
                }
            });
            const contextOptions = {
                extractHeaders: ['x-correlation-id', 'x-request-source', 'x-user-agent'],
                sanitizeHeaders: ['authorization'],
                includeUserContext: true
            };
            
            // Act - Execute context creation with header extraction
            const requestContext = createRequestContext(mockRequest, contextOptions);
            
            // Assert - Verify header extraction and sanitization
            assert.ok(requestContext.headers, 'Should include extracted headers');
            assert.ok(requestContext.headers['x-correlation-id'], 'Should extract correlation ID header');
            assert.ok(requestContext.headers['x-request-source'], 'Should extract request source header');
            assert.ok(requestContext.headers['x-user-agent'], 'Should extract user agent header');
            
            // Validate header sanitization
            assert.ok(!requestContext.headers.authorization, 'Should sanitize sensitive headers');
            assert.ok(requestContext.sanitizedHeaders, 'Should include sanitized header information');
            assert.ok(requestContext.sanitizedHeaders.includes('authorization'), 'Should list sanitized headers');
            
            // Validate user context extraction
            assert.ok(requestContext.userContext, 'Should include user context');
            assert.strictEqual(requestContext.userContext.source, 'test-client', 'Should extract user source');
            
            testLogger.info('createRequestContext headers test passed');
        });
        
        it('should create minimal request context for performance-critical scenarios', async () => {
            // Arrange - Set up minimal context creation
            const mockRequest = createMockRequest({
                method: 'GET',
                path: '/hello'
            });
            const contextOptions = {
                minimal: true,
                skipMetadata: true,
                skipHeaders: true
            };
            
            // Act - Execute minimal context creation with performance measurement
            const performanceResult = await testServicePerformance(
                () => createRequestContext(mockRequest, contextOptions),
                { request: mockRequest, options: contextOptions },
                { timeout: 100 }
            );
            
            const minimalContext = performanceResult.metrics.result;
            
            // Assert - Verify minimal context efficiency
            assert.ok(performanceResult.success, 'Minimal context creation should be performant');
            assert.ok(performanceResult.metrics.executionTime < 10, 'Should create minimal context quickly');
            
            // Validate minimal context content
            assert.ok(minimalContext.requestId, 'Should include essential request ID');
            assert.ok(minimalContext.timestamp, 'Should include essential timestamp');
            assert.ok(minimalContext.method, 'Should include essential method');
            assert.ok(minimalContext.path, 'Should include essential path');
            
            // Ensure minimal context excludes heavy data
            assert.ok(!minimalContext.metadata, 'Should not include metadata in minimal context');
            assert.ok(!minimalContext.headers, 'Should not include headers in minimal context');
            assert.ok(!minimalContext.userContext, 'Should not include user context in minimal context');
            
            testLogger.info('createRequestContext minimal test passed');
        });
        
        it('should provide request context with performance tracking capabilities', async () => {
            // Arrange - Set up performance tracking context
            const mockRequest = createMockRequest({
                method: 'GET',
                path: '/hello',
                headers: { 'x-performance-tracking': 'enabled' }
            });
            const contextOptions = {
                enablePerformanceTracking: true,
                includeMemoryMetrics: true,
                includeTimingMetrics: true
            };
            
            // Act - Execute context creation with performance tracking
            const requestContext = createRequestContext(mockRequest, contextOptions);
            
            // Assert - Verify performance tracking capabilities
            assert.ok(requestContext.performance, 'Should include performance tracking');
            assert.ok(requestContext.performance.startTime, 'Should include processing start time');
            assert.ok(requestContext.performance.memorySnapshot, 'Should include memory snapshot');
            
            // Validate performance metrics structure
            const performance = requestContext.performance;
            assert.ok(typeof performance.startTime === 'number', 'Start time should be numeric');
            assert.ok(performance.memorySnapshot.rss, 'Should include RSS memory usage');
            assert.ok(performance.memorySnapshot.heapUsed, 'Should include heap usage');
            
            // Validate performance tracking methods
            assert.ok(typeof requestContext.performance.markMilestone === 'function', 'Should provide milestone marking');
            assert.ok(typeof requestContext.performance.getMetrics === 'function', 'Should provide metrics getter');
            
            // Test performance tracking functionality
            requestContext.performance.markMilestone('validation-complete');
            const metrics = requestContext.performance.getMetrics();
            assert.ok(metrics.milestones, 'Should track milestones');
            assert.ok(metrics.milestones['validation-complete'], 'Should record milestone');
            
            testLogger.info('createRequestContext performance tracking test passed');
        });
        
        it('should handle request context creation with error scenarios gracefully', async () => {
            // Arrange - Set up various error scenarios
            const errorScenarios = [
                { request: null, description: 'null request' },
                { request: undefined, description: 'undefined request' },
                { request: {}, description: 'empty request object' },
                { request: { method: null }, description: 'null method' },
                { request: { path: null }, description: 'null path' }
            ];
            
            // Act & Assert - Test each error scenario
            errorScenarios.forEach((scenario, index) => {
                const contextOptions = { handleErrors: true };
                
                // Should not throw errors but handle gracefully
                assert.doesNotThrow(() => {
                    const context = createRequestContext(scenario.request, contextOptions);
                    
                    // Verify graceful error handling
                    assert.ok(context, `Context should be created for ${scenario.description}`);
                    assert.ok(context.requestId, `Should have request ID for ${scenario.description}`);
                    assert.ok(context.timestamp, `Should have timestamp for ${scenario.description}`);
                    
                    // Verify error indication
                    if (scenario.request === null || scenario.request === undefined) {
                        assert.ok(context.error, `Should indicate error for ${scenario.description}`);
                        assert.ok(context.error.type === 'invalid-request', `Should categorize error for ${scenario.description}`);
                    }
                    
                }, `Should handle ${scenario.description} gracefully`);
            });
            
            testLogger.info('createRequestContext error handling test passed');
        });
    });
    
    // Test suite for HelloService class comprehensive testing
    describe('HelloService Class Tests', () => {
        
        beforeEach(() => {
            // Create fresh service instance for each test
            serviceInstance = new HelloService({
                enableLogging: true,
                enableMetrics: true,
                serviceName: 'test-hello-service'
            });
        });
        
        it('should initialize HelloService instance with proper configuration', async () => {
            // Arrange - Service instance created in beforeEach
            const expectedConfig = {
                enableLogging: true,
                enableMetrics: true,
                serviceName: 'test-hello-service'
            };
            
            // Act - Verify initialization
            const serviceConfig = serviceInstance.getConfiguration();
            
            // Assert - Verify proper initialization
            assert.ok(serviceInstance instanceof HelloService, 'Should create valid HelloService instance');
            assert.ok(serviceConfig, 'Should have service configuration');
            assert.strictEqual(serviceConfig.serviceName, expectedConfig.serviceName, 'Should preserve service name');
            assert.strictEqual(serviceConfig.enableLogging, expectedConfig.enableLogging, 'Should preserve logging setting');
            assert.strictEqual(serviceConfig.enableMetrics, expectedConfig.enableMetrics, 'Should preserve metrics setting');
            
            // Validate service instance methods availability
            assert.ok(typeof serviceInstance.generateHello === 'function', 'Should have generateHello method');
            assert.ok(typeof serviceInstance.validateRequest === 'function', 'Should have validateRequest method');
            assert.ok(typeof serviceInstance.getServiceInfo === 'function', 'Should have getServiceInfo method');
            assert.ok(typeof serviceInstance.processRequest === 'function', 'Should have processRequest method');
            
            testLogger.info('HelloService initialization test passed');
        });
        
        it('should execute generateHello method with proper hello response generation', async () => {
            // Arrange - Set up hello generation request
            const helloRequest = {
                requestId: generateTestId(),
                timestamp: new Date().toISOString()
            };
            
            // Act - Execute generateHello method
            const helloResponse = await serviceInstance.generateHello(helloRequest);
            
            // Assert - Verify hello response generation
            assert.ok(helloResponse, 'Should generate hello response');
            assert.ok(helloResponse.success, 'Hello generation should be successful');
            assert.strictEqual(helloResponse.data, RESPONSES.HELLO_WORLD, 'Should generate hello world response');
            assert.ok(helloResponse.metadata, 'Should include response metadata');
            
            // Validate response structure and metadata
            assert.ok(helloResponse.metadata.generatedBy, 'Should include generator information');
            assert.ok(helloResponse.metadata.generationTime, 'Should include generation timestamp');
            assert.strictEqual(helloResponse.metadata.requestId, helloRequest.requestId, 'Should preserve request ID');
            
            // Validate method execution tracking
            const serviceMetrics = serviceInstance.getInstanceMetrics();
            assert.ok(serviceMetrics.methodCalls, 'Should track method calls');
            assert.ok(serviceMetrics.methodCalls.generateHello > 0, 'Should track generateHello calls');
            
            testLogger.info('HelloService generateHello test passed');
        });
        
        it('should execute validateRequest method with comprehensive validation logic', async () => {
            // Arrange - Set up validation test scenarios
            const validRequest = {
                method: 'GET',
                path: '/hello',
                headers: { 'content-type': 'application/json' }
            };
            const invalidRequest = {
                method: 'POST',
                path: '/hello',
                headers: {}
            };
            
            // Act - Execute validation for valid request
            const validResult = await serviceInstance.validateRequest(validRequest);
            
            // Assert - Verify valid request validation
            assert.ok(validResult, 'Should return validation result');
            assert.ok(validResult.isValid, 'Valid request should pass validation');
            assert.strictEqual(validResult.errors.length, 0, 'Valid request should have no errors');
            assert.ok(validResult.metadata, 'Should include validation metadata');
            
            // Act - Execute validation for invalid request
            const invalidResult = await serviceInstance.validateRequest(invalidRequest);
            
            // Assert - Verify invalid request validation
            assert.ok(invalidResult, 'Should return validation result for invalid request');
            assert.ok(!invalidResult.isValid, 'Invalid request should fail validation');
            assert.ok(invalidResult.errors.length > 0, 'Invalid request should have errors');
            assert.ok(invalidResult.errors.some(error => error.includes('method')), 'Should have method validation error');
            
            // Validate instance metrics tracking
            const metrics = serviceInstance.getInstanceMetrics();
            assert.ok(metrics.validationResults, 'Should track validation results');
            assert.ok(metrics.validationResults.valid > 0, 'Should track valid requests');
            assert.ok(metrics.validationResults.invalid > 0, 'Should track invalid requests');
            
            testLogger.info('HelloService validateRequest test passed');
        });
        
        it('should execute getServiceInfo method with comprehensive service information', async () => {
            // Arrange - Set up service info request
            const infoRequest = {
                includeMetrics: true,
                includeCapabilities: true,
                includeHealth: true
            };
            
            // Act - Execute getServiceInfo method
            const serviceInfo = await serviceInstance.getServiceInfo(infoRequest);
            
            // Assert - Verify service information completeness
            assert.ok(serviceInfo, 'Should return service information');
            assert.ok(serviceInfo.serviceName, 'Should include service name');
            assert.ok(serviceInfo.version, 'Should include service version');
            assert.ok(serviceInfo.capabilities, 'Should include service capabilities');
            assert.ok(serviceInfo.health, 'Should include health information');
            
            // Validate service capabilities
            const capabilities = serviceInfo.capabilities;
            assert.ok(Array.isArray(capabilities.endpoints), 'Should list available endpoints');
            assert.ok(capabilities.endpoints.includes('/hello'), 'Should include hello endpoint');
            assert.ok(Array.isArray(capabilities.methods), 'Should list supported methods');
            assert.ok(capabilities.methods.includes('GET'), 'Should support GET method');
            
            // Validate health information
            const health = serviceInfo.health;
            assert.ok(typeof health.isHealthy === 'boolean', 'Should indicate health status');
            assert.ok(health.uptime, 'Should include service uptime');
            assert.ok(health.lastCheck, 'Should include last health check time');
            
            // Validate metrics inclusion
            assert.ok(serviceInfo.metrics, 'Should include service metrics');
            assert.ok(typeof serviceInfo.metrics.requestCount === 'number', 'Should include request count');
            assert.ok(typeof serviceInfo.metrics.errorRate === 'number', 'Should include error rate');
            
            testLogger.info('HelloService getServiceInfo test passed');
        });
        
        it('should execute processRequest method with end-to-end request processing', async () => {
            // Arrange - Set up complete request processing scenario
            const processingRequest = {
                method: 'GET',
                path: '/hello',
                headers: { 'x-correlation-id': generateTestId() },
                requestId: generateTestId()
            };
            const processingOptions = {
                validateRequest: true,
                generateResponse: true,
                includeMetrics: true
            };
            
            // Act - Execute processRequest method
            const processingResult = await serviceInstance.processRequest(processingRequest, processingOptions);
            
            // Assert - Verify end-to-end processing
            assert.ok(processingResult, 'Should return processing result');
            assert.ok(processingResult.success, 'Processing should be successful');
            assert.strictEqual(processingResult.data, RESPONSES.HELLO_WORLD, 'Should return hello world data');
            assert.strictEqual(processingResult.statusCode, HTTP_STATUS.OK, 'Should return OK status code');
            
            // Validate processing metadata
            assert.ok(processingResult.metadata, 'Should include processing metadata');
            assert.ok(processingResult.metadata.processingTime, 'Should include processing time');
            assert.ok(processingResult.metadata.validationPassed, 'Should indicate validation status');
            assert.ok(processingResult.metadata.requestId, 'Should preserve request ID');
            
            // Validate processing metrics
            const metrics = serviceInstance.getInstanceMetrics();
            assert.ok(metrics.processedRequests > 0, 'Should track processed requests');
            assert.ok(metrics.averageProcessingTime >= 0, 'Should track average processing time');
            
            // Validate processing steps execution
            assert.ok(processingResult.metadata.processingSteps, 'Should include processing steps');
            const steps = processingResult.metadata.processingSteps;
            assert.ok(steps.includes('validation'), 'Should include validation step');
            assert.ok(steps.includes('generation'), 'Should include generation step');
            assert.ok(steps.includes('response-creation'), 'Should include response creation step');
            
            testLogger.info('HelloService processRequest test passed');
        });
        
        it('should execute updateConfiguration method with configuration management', async () => {
            // Arrange - Set up configuration update scenario
            const currentConfig = serviceInstance.getConfiguration();
            const configUpdate = {
                enableDebugLogging: true,
                maxRequestsPerSecond: 100,
                responseTimeout: 5000
            };
            
            // Act - Execute updateConfiguration method
            const updateResult = await serviceInstance.updateConfiguration(configUpdate);
            
            // Assert - Verify configuration update
            assert.ok(updateResult, 'Should return configuration update result');
            assert.ok(updateResult.success, 'Configuration update should be successful');
            assert.ok(updateResult.previousConfig, 'Should include previous configuration');
            assert.ok(updateResult.newConfig, 'Should include new configuration');
            
            // Validate configuration application
            const updatedConfig = serviceInstance.getConfiguration();
            assert.strictEqual(updatedConfig.enableDebugLogging, configUpdate.enableDebugLogging, 'Should apply debug logging setting');
            assert.strictEqual(updatedConfig.maxRequestsPerSecond, configUpdate.maxRequestsPerSecond, 'Should apply rate limit setting');
            assert.strictEqual(updatedConfig.responseTimeout, configUpdate.responseTimeout, 'Should apply timeout setting');
            
            // Validate configuration preservation
            assert.strictEqual(updatedConfig.serviceName, currentConfig.serviceName, 'Should preserve existing service name');
            assert.strictEqual(updatedConfig.enableLogging, currentConfig.enableLogging, 'Should preserve existing logging setting');
            
            // Validate configuration change tracking
            const configHistory = serviceInstance.getConfigurationHistory();
            assert.ok(Array.isArray(configHistory), 'Should maintain configuration history');
            assert.ok(configHistory.length > 0, 'Should track configuration changes');
            
            testLogger.info('HelloService updateConfiguration test passed');
        });
        
        it('should execute getInstanceMetrics method with comprehensive metrics collection', async () => {
            // Arrange - Set up metrics collection scenario by executing various operations
            await serviceInstance.generateHello({ requestId: generateTestId() });
            await serviceInstance.validateRequest({ method: 'GET', path: '/hello' });
            await serviceInstance.processRequest({ method: 'GET', path: '/hello' });
            
            // Act - Execute getInstanceMetrics method
            const instanceMetrics = serviceInstance.getInstanceMetrics();
            
            // Assert - Verify metrics completeness
            assert.ok(instanceMetrics, 'Should return instance metrics');
            assert.ok(instanceMetrics.uptime, 'Should include service uptime');
            assert.ok(instanceMetrics.memoryUsage, 'Should include memory usage metrics');
            assert.ok(instanceMetrics.methodCalls, 'Should include method call counts');
            assert.ok(instanceMetrics.performanceMetrics, 'Should include performance metrics');
            
            // Validate method call tracking
            const methodCalls = instanceMetrics.methodCalls;
            assert.ok(methodCalls.generateHello > 0, 'Should track generateHello calls');
            assert.ok(methodCalls.validateRequest > 0, 'Should track validateRequest calls');
            assert.ok(methodCalls.processRequest > 0, 'Should track processRequest calls');
            assert.ok(methodCalls.getInstanceMetrics > 0, 'Should track getInstanceMetrics calls');
            
            // Validate performance metrics
            const performance = instanceMetrics.performanceMetrics;
            assert.ok(typeof performance.averageResponseTime === 'number', 'Should track average response time');
            assert.ok(typeof performance.totalRequests === 'number', 'Should track total requests');
            assert.ok(typeof performance.errorRate === 'number', 'Should track error rate');
            
            // Validate memory usage tracking
            const memory = instanceMetrics.memoryUsage;
            assert.ok(typeof memory.rss === 'number', 'Should track RSS memory');
            assert.ok(typeof memory.heapUsed === 'number', 'Should track heap usage');
            assert.ok(typeof memory.heapTotal === 'number', 'Should track total heap');
            
            // Validate metrics metadata
            assert.ok(instanceMetrics.metadata, 'Should include metrics metadata');
            assert.ok(instanceMetrics.metadata.collectionTime, 'Should include collection timestamp');
            assert.ok(instanceMetrics.metadata.instanceId, 'Should include instance identifier');
            
            testLogger.info('HelloService getInstanceMetrics test passed');
        });
        
        it('should handle HelloService instance error scenarios with proper error recovery', async () => {
            // Arrange - Set up error injection scenarios
            const errorScenarios = [
                {
                    method: 'generateHello',
                    params: null,
                    expectedError: 'invalid-parameters'
                },
                {
                    method: 'validateRequest',
                    params: { method: 'INVALID' },
                    expectedError: 'validation-error'
                },
                {
                    method: 'processRequest',
                    params: {},
                    expectedError: 'processing-error'
                }
            ];
            
            // Act & Assert - Test each error scenario
            for (const scenario of errorScenarios) {
                try {
                    const result = await serviceInstance[scenario.method](scenario.params);
                    
                    // Should handle errors gracefully without throwing
                    assert.ok(result, `${scenario.method} should return result even with errors`);
                    assert.ok(!result.success, `${scenario.method} should indicate failure`);
                    assert.ok(result.error, `${scenario.method} should include error information`);
                    assert.ok(result.error.type, `${scenario.method} should categorize error type`);
                    
                } catch (error) {
                    // If method throws, verify it's handled appropriately
                    assert.ok(error.message, `${scenario.method} error should have message`);
                    testLogger.warn(`${scenario.method} threw error as expected`, { error: error.message });
                }
            }
            
            // Validate error recovery and service health
            const serviceInfo = await serviceInstance.getServiceInfo();
            assert.ok(serviceInfo.health.isHealthy, 'Service should remain healthy after error scenarios');
            
            // Validate error metrics tracking
            const metrics = serviceInstance.getInstanceMetrics();
            assert.ok(metrics.errorCount > 0, 'Should track error occurrences');
            assert.ok(metrics.errorRate >= 0, 'Should calculate error rate');
            
            testLogger.info('HelloService error handling test passed');
        });
        
        it('should maintain HelloService instance state consistency across operations', async () => {
            // Arrange - Set up state consistency test with multiple operations
            const operations = [
                () => serviceInstance.generateHello({ requestId: 'test-1' }),
                () => serviceInstance.validateRequest({ method: 'GET', path: '/hello' }),
                () => serviceInstance.processRequest({ method: 'GET', path: '/hello' }),
                () => serviceInstance.updateConfiguration({ testSetting: true }),
                () => serviceInstance.getServiceInfo(),
                () => serviceInstance.getInstanceMetrics()
            ];
            
            // Act - Execute operations in sequence
            const results = [];
            for (const operation of operations) {
                const result = await operation();
                results.push(result);
            }
            
            // Assert - Verify state consistency
            results.forEach((result, index) => {
                assert.ok(result, `Operation ${index} should return result`);
                
                // Validate result structure consistency
                if (result.metadata) {
                    assert.ok(result.metadata.instanceId, `Operation ${index} should preserve instance ID`);
                }
            });
            
            // Validate final state consistency
            const finalMetrics = serviceInstance.getInstanceMetrics();
            const finalConfig = serviceInstance.getConfiguration();
            const finalInfo = await serviceInstance.getServiceInfo();
            
            // Verify state consistency across different methods
            assert.strictEqual(finalMetrics.metadata.instanceId, finalInfo.instanceId, 'Instance ID should be consistent');
            assert.ok(finalConfig.testSetting, 'Configuration changes should be persistent');
            assert.ok(finalMetrics.methodCalls.processRequest > 0, 'Method call counts should be accurate');
            
            // Validate service health after multiple operations
            assert.ok(finalInfo.health.isHealthy, 'Service should remain healthy after multiple operations');
            
            testLogger.info('HelloService state consistency test passed');
        });
    });
});

// Export test utilities for external test reuse and integration
module.exports = {
    setupServiceTests,
    teardownServiceTests,
    createServiceTestContext,
    validateServiceResponse
};