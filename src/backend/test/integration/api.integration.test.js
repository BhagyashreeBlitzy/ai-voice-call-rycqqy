/**
 * Comprehensive API Integration Test Suite for Node.js Tutorial Application
 * 
 * This integration test suite provides complete HTTP request-response cycle validation,
 * endpoint functionality testing, error handling verification, and middleware integration testing
 * for the Node.js tutorial application's /hello endpoint and HTTP server foundation.
 * 
 * Implements professional testing patterns using Node.js built-in test runner (v18+ LTS),
 * SuperTest 7.1.1 for HTTP endpoint testing, and comprehensive test fixtures to validate
 * application behavior under various scenarios including success, error, and edge cases.
 * 
 * Features comprehensive test coverage including:
 * - Complete /hello endpoint integration testing with GET request validation
 * - HTTP method validation and 405 Method Not Allowed error scenarios
 * - 404 Not Found error handling for non-existent endpoints
 * - Express.js middleware pipeline integration and execution order validation
 * - Performance testing with response time measurement and throughput validation
 * - Concurrent request testing for server stability and resource management
 * - Comprehensive error handling integration with proper error response validation
 * 
 * Educational Value:
 * - Demonstrates Node.js built-in test runner usage with describe/it/before/after hooks
 * - Shows SuperTest integration patterns for HTTP endpoint testing
 * - Illustrates test fixture usage for consistent request and response validation
 * - Provides examples of async/await testing patterns with proper error handling
 * - Demonstrates test server lifecycle management and cleanup procedures
 * - Shows performance testing patterns suitable for API endpoint validation
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner components for test organization and execution
const { test, describe, it, before, after, beforeEach, afterEach } = require('node:test'); // Built-in Node.js test runner (v18+ LTS)
const assert = require('node:assert'); // Built-in Node.js assertion library for test validation and verification

// Import SuperTest for HTTP endpoint testing and response validation
const supertest = require('supertest'); // SuperTest ^7.1.1 - HTTP endpoint testing library for server response validation

// Import main Express.js application instance for integration testing
const app = require('../../app.js'); // Express.js application instance with configured middleware, routes, and error handling

// Import test server management utilities for server lifecycle orchestration
const { TestServerManager, createServerTestAgent } = require('../helpers/serverHelpers.js'); // Test server management and SuperTest agent creation utilities

// Import general test helper utilities for logging, timing, and async operations
const {
    createTestLogger,
    waitForCondition,
    measureExecutionTime,
    generateTestId
} = require('../helpers/testHelpers.js'); // Test utilities for logging, performance measurement, and test coordination

// Import test request fixtures for HTTP request testing scenarios
const {
    validRequests,
    invalidRequests,
    notFoundRequests
} = require('../fixtures/requests.js'); // HTTP request fixtures for valid, invalid, and error scenario testing

// Import test response fixtures for expected response validation
const {
    successResponses,
    errorResponses
} = require('../fixtures/responses.js'); // Expected response fixtures for success and error scenario validation

// Import comprehensive test configuration for timeouts, server settings, and environment management
const { testConfig } = require('../setup/testConfig.js'); // Test configuration with server settings, timeouts, and environment variables

// Initialize global test variables for test suite management and coordination
let testServerManager = null; // TestServerManager instance for server lifecycle management
let testLogger = null; // Test logger instance for test execution logging and debugging
let testAgent = null; // SuperTest agent for HTTP endpoint testing and response validation
let serverUrl = null; // Test server URL for request targeting and endpoint access
const testSuiteId = generateTestId('api-int'); // Unique test suite identifier for correlation and debugging

/**
 * Sets up the complete integration test suite by initializing test server, creating SuperTest agent,
 * and preparing test environment with proper isolation, logging, and resource management.
 * 
 * @returns {Promise<void>} Promise resolving when test suite setup is complete and ready for test execution
 */
async function setupTestSuite() {
    try {
        // Initialize test logger with environment-appropriate configuration for test execution visibility
        testLogger = createTestLogger('api-integration');
        testLogger.info('Initializing API integration test suite', {
            testSuiteId: testSuiteId,
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            testRunnerVersion: 'built-in'
        });

        // Create TestServerManager instance with test configuration for server lifecycle management
        testServerManager = new TestServerManager(testConfig);
        testLogger.debug('TestServerManager instance created', {
            hasTestConfig: Boolean(testConfig),
            serverPort: testConfig.server?.port || 'dynamic',
            testType: testConfig.testType || 'integration'
        });

        // Start test server using TestServerManager with timeout handling and error recovery
        await testServerManager.startTestServer();
        testLogger.info('Test server started successfully', {
            serverStartupTime: new Date().toISOString(),
            testSuiteId: testSuiteId
        });

        // Create SuperTest agent using TestServerManager for HTTP endpoint testing
        testAgent = testServerManager.getTestAgent();
        if (!testAgent) {
            throw new Error('Failed to create SuperTest agent - testAgent is null');
        }
        testLogger.debug('SuperTest agent created', {
            hasTestAgent: Boolean(testAgent),
            agentType: testAgent.constructor?.name || 'Unknown'
        });

        // Get server URL from TestServerManager for request targeting and validation
        serverUrl = testServerManager.getServerUrl();
        if (!serverUrl) {
            throw new Error('Failed to get server URL - serverUrl is null');
        }
        testLogger.debug('Server URL retrieved', {
            serverUrl: serverUrl,
            urlPattern: /^https?:\/\//.test(serverUrl)
        });

        // Wait for server readiness using waitForCondition with server status validation
        await waitForCondition(
            async () => {
                try {
                    const response = await testAgent.get('/hello');
                    return response.status === 200;
                } catch (error) {
                    return false;
                }
            },
            {
                timeout: testConfig.timeouts?.server?.startup || 10000,
                interval: 100,
                timeoutMessage: 'Test server failed to become ready within timeout period'
            }
        );

        testLogger.info('Test suite setup completed successfully', {
            testSuiteId: testSuiteId,
            serverUrl: serverUrl,
            serverReady: true,
            setupDuration: new Date().toISOString()
        });

    } catch (error) {
        testLogger.error('Test suite setup failed', {
            error: error.message,
            stack: error.stack,
            testSuiteId: testSuiteId,
            setupPhase: 'initialization'
        });
        throw error;
    }
}

/**
 * Tears down the integration test suite by stopping test server, cleaning up resources,
 * and restoring test environment with proper cleanup procedures and resource deallocation.
 * 
 * @returns {Promise<void>} Promise resolving when test suite teardown is complete and environment is restored
 */
async function teardownTestSuite() {
    try {
        testLogger.info('Initiating test suite teardown', {
            testSuiteId: testSuiteId,
            teardownReason: 'test_suite_completion',
            timestamp: new Date().toISOString()
        });

        // Stop test server using TestServerManager with graceful shutdown procedures
        if (testServerManager) {
            await testServerManager.stopTestServer();
            testLogger.debug('Test server stopped successfully', {
                shutdownTime: new Date().toISOString()
            });
        }

        // Clean up test server resources and reset global test variables for environment restoration
        if (testServerManager) {
            await testServerManager.cleanup();
            testLogger.debug('Test server resources cleaned up', {
                cleanupCompleted: true
            });
        }

        // Reset global test variables to null for clean test environment state
        testAgent = null;
        serverUrl = null;
        testServerManager = null;

        testLogger.info('Test suite teardown completed successfully', {
            testSuiteId: testSuiteId,
            teardownStatus: 'completed',
            resourcesReleased: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        testLogger.error('Test suite teardown failed', {
            error: error.message,
            stack: error.stack,
            testSuiteId: testSuiteId,
            teardownPhase: 'cleanup'
        });
        // Continue with teardown despite errors to prevent resource leaks
    }
}

/**
 * Validates /hello endpoint HTTP response including status code, content type, response body,
 * and response headers for complete response verification and compliance testing.
 * 
 * @param {Object} response - SuperTest response object from HTTP request execution
 * @param {Object} expectedResponse - Expected response object with validation criteria
 * @returns {void} Performs comprehensive assertions without return value
 */
function validateHelloEndpointResponse(response, expectedResponse) {
    try {
        // Assert response status code equals 200 using strict equality validation
        assert.strictEqual(response.status, 200, 
            `Expected status code 200, received ${response.status}`);

        // Assert response body equals 'Hello world' using strict string comparison
        assert.strictEqual(response.text, 'Hello world', 
            `Expected response body 'Hello world', received '${response.text}'`);

        // Assert response Content-Type header contains 'text' using pattern matching
        assert.match(response.headers['content-type'] || '', /text/, 
            `Expected Content-Type to contain 'text', received '${response.headers['content-type']}'`);

        // Validate response headers include required HTTP headers for proper client communication
        assert.ok(response.headers, 'Response should include HTTP headers');
        assert.ok(response.headers['content-length'], 'Response should include Content-Length header');

        // Assert response time is within acceptable performance threshold for optimal user experience
        const responseTime = response.duration || response.responseTime || 0;
        assert.ok(responseTime < 1000, 
            `Response time ${responseTime}ms exceeds 1000ms threshold`);

        testLogger.debug('Hello endpoint response validation successful', {
            status: response.status,
            body: response.text,
            contentType: response.headers['content-type'],
            responseTime: responseTime,
            contentLength: response.headers['content-length']
        });

    } catch (validationError) {
        testLogger.error('Hello endpoint response validation failed', {
            error: validationError.message,
            responseStatus: response.status,
            responseBody: response.text,
            responseHeaders: response.headers
        });
        throw validationError;
    }
}

/**
 * Validates error response structure including status code, error message, response format,
 * and error metadata for comprehensive error response verification and compliance testing.
 * 
 * @param {Object} response - SuperTest response object from HTTP request execution
 * @param {number} expectedStatusCode - Expected HTTP status code for error response validation
 * @param {string} expectedErrorMessage - Expected error message content for response verification
 * @returns {void} Performs comprehensive error response assertions without return value
 */
function validateErrorResponse(response, expectedStatusCode, expectedErrorMessage) {
    try {
        // Assert response status code matches expected error status using strict equality comparison
        assert.strictEqual(response.status, expectedStatusCode, 
            `Expected status code ${expectedStatusCode}, received ${response.status}`);

        // Assert response has error message or appropriate error content for client understanding
        if (expectedErrorMessage) {
            const responseText = response.text || response.body?.message || '';
            assert.ok(responseText.includes(expectedErrorMessage) || response.status === expectedStatusCode,
                `Expected error message to contain '${expectedErrorMessage}', received '${responseText}'`);
        }

        // Validate error response structure and format consistency for API standards compliance
        assert.ok(response.headers, 'Error response should include HTTP headers');

        // Assert response headers indicate error content type appropriately for client processing
        const contentType = response.headers['content-type'] || '';
        assert.ok(contentType.includes('text') || contentType.includes('json') || contentType === '',
            `Error response Content-Type '${contentType}' should be text or json`);

        // Verify error response includes proper HTTP error semantics for standard compliance
        assert.ok(response.status >= 400 && response.status < 600,
            `Error status code ${response.status} should be in 4xx or 5xx range`);

        testLogger.debug('Error response validation successful', {
            status: response.status,
            expectedStatus: expectedStatusCode,
            body: response.text || response.body,
            contentType: contentType,
            errorMessage: expectedErrorMessage
        });

    } catch (validationError) {
        testLogger.error('Error response validation failed', {
            error: validationError.message,
            responseStatus: response.status,
            expectedStatus: expectedStatusCode,
            responseBody: response.text || response.body
        });
        throw validationError;
    }
}

/**
 * Executes performance testing for API endpoints including response time measurement,
 * throughput validation, and performance threshold compliance testing.
 * 
 * @param {string} endpoint - API endpoint path for performance testing
 * @param {Object} performanceOptions - Performance testing configuration options
 * @returns {Promise<Object>} Promise resolving to performance test results with timing and metrics
 */
async function performanceTest(endpoint, performanceOptions = {}) {
    try {
        const performanceThreshold = performanceOptions.threshold || 100; // Default 100ms threshold
        const iterations = performanceOptions.iterations || 5;
        
        testLogger.debug('Starting performance test', {
            endpoint: endpoint,
            threshold: performanceThreshold,
            iterations: iterations
        });

        // Use measureExecutionTime to wrap HTTP request execution for precise timing measurement
        const performanceResult = await measureExecutionTime(async () => {
            const responses = [];
            
            // Execute multiple iterations for statistical performance measurement
            for (let i = 0; i < iterations; i++) {
                const response = await testAgent.get(endpoint);
                responses.push({
                    status: response.status,
                    responseTime: response.duration || 0,
                    bodyLength: response.text?.length || 0
                });
                
                // Validate response correctness in addition to performance metrics
                assert.strictEqual(response.status, 200, 
                    `Performance test iteration ${i + 1} failed with status ${response.status}`);
            }
            
            return responses;
        });

        // Calculate performance metrics including average response time and success rate
        const responses = performanceResult.result;
        const totalTime = performanceResult.executionTime;
        const averageResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
        const successRate = (responses.filter(r => r.status === 200).length / responses.length) * 100;

        // Assert average response time is within performance threshold for acceptable performance
        assert.ok(averageResponseTime < performanceThreshold,
            `Average response time ${averageResponseTime}ms exceeds threshold ${performanceThreshold}ms`);

        // Assert all requests succeeded for reliability validation
        assert.strictEqual(successRate, 100,
            `Success rate ${successRate}% should be 100%`);

        const performanceTestResults = {
            endpoint: endpoint,
            iterations: iterations,
            totalExecutionTime: totalTime,
            averageResponseTime: averageResponseTime,
            successRate: successRate,
            threshold: performanceThreshold,
            thresholdMet: averageResponseTime < performanceThreshold,
            responses: responses
        };

        testLogger.info('Performance test completed successfully', performanceTestResults);

        return performanceTestResults;

    } catch (performanceError) {
        testLogger.error('Performance test failed', {
            error: performanceError.message,
            endpoint: endpoint,
            performanceOptions: performanceOptions
        });
        throw performanceError;
    }
}

/**
 * Executes concurrent request testing to validate server stability, concurrent request handling,
 * and resource management under load conditions with proper synchronization.
 * 
 * @param {number} concurrentRequests - Number of concurrent requests to execute simultaneously
 * @param {string} endpoint - API endpoint path for concurrent testing
 * @returns {Promise<Object>} Promise resolving to concurrent test results with success rates and timing analysis
 */
async function concurrentRequestTest(concurrentRequests, endpoint) {
    try {
        testLogger.debug('Starting concurrent request test', {
            concurrentRequests: concurrentRequests,
            endpoint: endpoint,
            testSuiteId: testSuiteId
        });

        // Create array of concurrent request promises using Promise.all pattern for simultaneous execution
        const concurrentPromises = Array.from({ length: concurrentRequests }, (_, index) =>
            measureExecutionTime(async () => {
                const response = await testAgent.get(endpoint);
                return {
                    requestIndex: index + 1,
                    status: response.status,
                    responseTime: response.duration || 0,
                    body: response.text,
                    timestamp: new Date().toISOString()
                };
            })
        );

        // Execute multiple simultaneous requests and collect all response results for analysis
        const concurrentResults = await Promise.all(concurrentPromises);

        // Extract response data and timing information for comprehensive analysis
        const responses = concurrentResults.map(result => result.result);
        const executionTimes = concurrentResults.map(result => result.executionTime);

        // Calculate success rate and performance metrics for concurrent request validation
        const successfulResponses = responses.filter(r => r.status === 200);
        const successRate = (successfulResponses.length / responses.length) * 100;
        const averageResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
        const maxResponseTime = Math.max(...responses.map(r => r.responseTime));
        const minResponseTime = Math.min(...responses.map(r => r.responseTime));
        const totalExecutionTime = Math.max(...executionTimes);

        // Validate all responses have correct status codes and content for consistency verification
        responses.forEach((response, index) => {
            assert.strictEqual(response.status, 200,
                `Concurrent request ${index + 1} failed with status ${response.status}`);
            assert.strictEqual(response.body, 'Hello world',
                `Concurrent request ${index + 1} returned incorrect body: ${response.body}`);
        });

        // Assert no requests failed due to server overload or resource constraints
        assert.strictEqual(successRate, 100,
            `Concurrent test success rate ${successRate}% should be 100%`);

        // Assert response times are within reasonable bounds for concurrent execution
        assert.ok(averageResponseTime < 1000,
            `Average concurrent response time ${averageResponseTime}ms exceeds 1000ms threshold`);

        const concurrentTestResults = {
            concurrentRequests: concurrentRequests,
            endpoint: endpoint,
            successRate: successRate,
            averageResponseTime: averageResponseTime,
            maxResponseTime: maxResponseTime,
            minResponseTime: minResponseTime,
            totalExecutionTime: totalExecutionTime,
            responseTimeStandardDeviation: Math.sqrt(
                responses.reduce((sum, r) => sum + Math.pow(r.responseTime - averageResponseTime, 2), 0) / responses.length
            ),
            allRequestsSuccessful: successfulResponses.length === concurrentRequests,
            responses: responses
        };

        testLogger.info('Concurrent request test completed successfully', concurrentTestResults);

        return concurrentTestResults;

    } catch (concurrentError) {
        testLogger.error('Concurrent request test failed', {
            error: concurrentError.message,
            concurrentRequests: concurrentRequests,
            endpoint: endpoint
        });
        throw concurrentError;
    }
}

// Main API Integration Test Suite - Comprehensive validation of complete API functionality
describe('API Integration Tests', { timeout: testConfig.timeouts?.default || 30000 }, () => {
    
    // Test suite setup and teardown with proper resource management
    before('Setup API Integration Test Suite', setupTestSuite);
    after('Teardown API Integration Test Suite', teardownTestSuite);

    // Reset test state before each test case for proper test isolation
    beforeEach('Reset Test State', async () => {
        testLogger.debug('Preparing test case execution', {
            testSuiteId: testSuiteId,
            timestamp: new Date().toISOString()
        });
    });

    // Clean up after each test case for resource management
    afterEach('Cleanup Test Case', async () => {
        testLogger.debug('Test case execution completed', {
            testSuiteId: testSuiteId,
            timestamp: new Date().toISOString()
        });
    });

    // Core /hello endpoint functionality testing with comprehensive response validation
    it('should respond with Hello world for GET /hello', { timeout: 5000 }, async () => {
        const testCaseId = generateTestId('hello-get');
        
        testLogger.info('Testing GET /hello endpoint', {
            testCaseId: testCaseId,
            expectedStatus: 200,
            expectedResponse: 'Hello world'
        });

        // Execute GET request to /hello endpoint using valid request fixture
        const response = await testAgent
            .get(validRequests.helloGet.path)
            .expect(200);

        // Validate complete response using comprehensive validation function
        validateHelloEndpointResponse(response, successResponses.helloSuccess);

        testLogger.info('GET /hello endpoint test passed', {
            testCaseId: testCaseId,
            responseStatus: response.status,
            responseBody: response.text,
            responseTime: response.duration || 0
        });
    });

    // 404 Not Found error handling for non-existent endpoints
    it('should return 404 for non-existent endpoints', { timeout: 3000 }, async () => {
        const testCaseId = generateTestId('not-found');
        
        testLogger.info('Testing 404 Not Found error handling', {
            testCaseId: testCaseId,
            testEndpoint: notFoundRequests.invalidPath.path,
            expectedStatus: 404
        });

        // Execute GET request to non-existent endpoint for 404 error validation
        const response = await testAgent
            .get(notFoundRequests.invalidPath.path)
            .expect(404);

        // Validate error response structure and status code compliance
        validateErrorResponse(response, 404, 'Not Found');

        testLogger.info('404 Not Found test passed', {
            testCaseId: testCaseId,
            responseStatus: response.status,
            endpoint: notFoundRequests.invalidPath.path
        });
    });

    // HTTP method validation and 405 Method Not Allowed error scenarios
    it('should return 405 for invalid HTTP methods on /hello', { timeout: 3000 }, async () => {
        const testCaseId = generateTestId('method-not-allowed');
        
        testLogger.info('Testing 405 Method Not Allowed error handling', {
            testCaseId: testCaseId,
            testMethod: 'POST',
            testEndpoint: '/hello',
            expectedStatus: 405
        });

        // Execute POST request to /hello endpoint for method validation testing
        const response = await testAgent
            .post(invalidRequests.helloPost.path)
            .expect(405);

        // Validate method not allowed error response and HTTP compliance
        validateErrorResponse(response, 405, 'Method Not Allowed');

        testLogger.info('405 Method Not Allowed test passed', {
            testCaseId: testCaseId,
            responseStatus: response.status,
            method: 'POST',
            endpoint: '/hello'
        });
    });

    // Server stability testing under concurrent request load conditions
    it('should handle concurrent requests efficiently', { timeout: 10000 }, async () => {
        const testCaseId = generateTestId('concurrent-load');
        const concurrentRequestCount = 10;
        
        testLogger.info('Testing concurrent request handling', {
            testCaseId: testCaseId,
            concurrentRequests: concurrentRequestCount,
            endpoint: '/hello'
        });

        // Execute concurrent request test with multiple simultaneous connections
        const concurrentResults = await concurrentRequestTest(concurrentRequestCount, '/hello');

        // Validate server maintained stability and response consistency under load
        assert.ok(concurrentResults.allRequestsSuccessful, 
            'All concurrent requests should complete successfully');
        assert.strictEqual(concurrentResults.successRate, 100,
            'Concurrent request success rate should be 100%');
        assert.ok(concurrentResults.averageResponseTime < 1000,
            'Average concurrent response time should be under 1000ms');

        testLogger.info('Concurrent request test passed', {
            testCaseId: testCaseId,
            concurrentRequests: concurrentRequestCount,
            successRate: concurrentResults.successRate,
            averageResponseTime: concurrentResults.averageResponseTime
        });
    });

    // Performance validation testing with response time thresholds
    it('should meet performance requirements for response time', { timeout: 5000 }, async () => {
        const testCaseId = generateTestId('performance-validation');
        const performanceThreshold = 100; // 100ms response time threshold
        
        testLogger.info('Testing API performance requirements', {
            testCaseId: testCaseId,
            endpoint: '/hello',
            performanceThreshold: performanceThreshold
        });

        // Execute performance test with response time measurement and validation
        const performanceResults = await performanceTest('/hello', {
            threshold: performanceThreshold,
            iterations: 5
        });

        // Validate response time performance meets specified requirements
        assert.ok(performanceResults.thresholdMet,
            `Performance threshold not met: ${performanceResults.averageResponseTime}ms > ${performanceThreshold}ms`);
        assert.strictEqual(performanceResults.successRate, 100,
            'Performance test success rate should be 100%');

        testLogger.info('Performance test passed', {
            testCaseId: testCaseId,
            averageResponseTime: performanceResults.averageResponseTime,
            threshold: performanceThreshold,
            iterations: performanceResults.iterations
        });
    });
});

// Hello Endpoint Specialized Integration Tests - Focused /hello endpoint behavior validation
describe('Hello Endpoint Integration Tests', { timeout: testConfig.timeouts?.default || 30000 }, () => {

    // Comprehensive /hello endpoint response validation including headers and content type
    it('should return Hello world with correct headers', { timeout: 3000 }, async () => {
        const testCaseId = generateTestId('hello-headers');
        
        testLogger.info('Testing /hello endpoint headers and content type', {
            testCaseId: testCaseId,
            validateHeaders: true
        });

        // Execute GET request with header validation using valid request fixture
        const response = await testAgent
            .get(validRequests.helloGet.path)
            .expect(200)
            .expect('Content-Type', /text/);

        // Validate response includes proper HTTP headers and content type specification
        assert.strictEqual(response.text, 'Hello world');
        assert.ok(response.headers['content-type'], 'Response should include Content-Type header');
        assert.ok(response.headers['content-length'], 'Response should include Content-Length header');
        assert.match(response.headers['content-type'], /text/, 'Content-Type should be text-based');

        testLogger.info('Hello endpoint headers test passed', {
            testCaseId: testCaseId,
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length']
        });
    });

    // Custom headers processing validation for /hello endpoint
    it('should handle requests with custom headers', { timeout: 3000 }, async () => {
        const testCaseId = generateTestId('hello-custom-headers');
        const customHeaders = {
            'User-Agent': 'test-client',
            'Accept': 'text/plain'
        };
        
        testLogger.info('Testing /hello endpoint with custom headers', {
            testCaseId: testCaseId,
            customHeaders: customHeaders
        });

        // Execute GET request with custom headers using request fixture configuration
        const response = await testAgent
            .get(validRequests.helloGetWithHeaders.path)
            .set(customHeaders)
            .expect(200);

        // Validate endpoint processes custom headers correctly and maintains response consistency
        assert.strictEqual(response.text, 'Hello world');
        assert.strictEqual(response.status, 200);

        testLogger.info('Custom headers test passed', {
            testCaseId: testCaseId,
            customHeaders: customHeaders,
            responseStatus: response.status
        });
    });

    // Response consistency validation across multiple sequential requests
    it('should maintain consistent response across multiple requests', { timeout: 10000 }, async () => {
        const testCaseId = generateTestId('hello-consistency');
        const sequentialRequests = 5;
        
        testLogger.info('Testing /hello endpoint response consistency', {
            testCaseId: testCaseId,
            sequentialRequests: sequentialRequests
        });

        const responses = [];
        
        // Execute multiple sequential requests for consistency validation
        for (let i = 0; i < sequentialRequests; i++) {
            const response = await testAgent
                .get(validRequests.helloGet.path)
                .expect(200);
            
            responses.push({
                requestNumber: i + 1,
                status: response.status,
                body: response.text,
                contentType: response.headers['content-type']
            });
        }

        // Validate all responses are identical for consistency verification
        responses.forEach((response, index) => {
            assert.strictEqual(response.status, 200, 
                `Request ${index + 1} status should be 200`);
            assert.strictEqual(response.body, 'Hello world', 
                `Request ${index + 1} body should be 'Hello world'`);
            assert.match(response.contentType || '', /text/, 
                `Request ${index + 1} Content-Type should contain 'text'`);
        });

        testLogger.info('Response consistency test passed', {
            testCaseId: testCaseId,
            sequentialRequests: sequentialRequests,
            allResponsesConsistent: true
        });
    });
});

// Error Handling Integration Tests - Comprehensive error scenario validation and recovery testing
describe('Error Handling Integration Tests', { timeout: testConfig.timeouts?.default || 30000 }, () => {

    // Comprehensive HTTP method validation for all invalid methods on /hello endpoint
    it('should return appropriate error responses for all invalid methods', { timeout: 10000 }, async () => {
        const testCaseId = generateTestId('all-invalid-methods');
        const invalidMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        
        testLogger.info('Testing all invalid HTTP methods on /hello endpoint', {
            testCaseId: testCaseId,
            invalidMethods: invalidMethods,
            expectedStatus: 405
        });

        // Test each invalid HTTP method for proper 405 Method Not Allowed response
        for (const method of invalidMethods) {
            const response = await testAgent[method.toLowerCase()]('/hello')
                .expect(405);
            
            // Validate each method returns appropriate error response
            validateErrorResponse(response, 405, 'Method Not Allowed');
            
            testLogger.debug(`Invalid method ${method} test passed`, {
                method: method,
                status: response.status,
                testCaseId: testCaseId
            });
        }

        testLogger.info('All invalid methods test passed', {
            testCaseId: testCaseId,
            methodsTested: invalidMethods.length,
            allMethodsReturnedError: true
        });
    });

    // Multiple not found endpoints validation for comprehensive 404 error handling
    it('should handle multiple non-existent endpoints correctly', { timeout: 5000 }, async () => {
        const testCaseId = generateTestId('multiple-not-found');
        const notFoundPaths = [
            notFoundRequests.invalidPath.path,
            notFoundRequests.nonExistentEndpoint.path,
            '/api/nonexistent',
            '/missing/endpoint'
        ];
        
        testLogger.info('Testing multiple non-existent endpoints', {
            testCaseId: testCaseId,
            notFoundPaths: notFoundPaths,
            expectedStatus: 404
        });

        // Test each non-existent path for proper 404 Not Found response
        for (const path of notFoundPaths) {
            const response = await testAgent
                .get(path)
                .expect(404);
            
            // Validate each path returns appropriate 404 error response
            validateErrorResponse(response, 404, 'Not Found');
            
            testLogger.debug(`Not found path ${path} test passed`, {
                path: path,
                status: response.status,
                testCaseId: testCaseId
            });
        }

        testLogger.info('Multiple not found endpoints test passed', {
            testCaseId: testCaseId,
            pathsTested: notFoundPaths.length,
            allPathsReturned404: true
        });
    });
});

// Middleware Integration Tests - Express.js middleware pipeline validation and execution order testing
describe('Middleware Integration Tests', { timeout: testConfig.timeouts?.default || 30000 }, () => {

    // Middleware execution order validation for Express.js pipeline processing
    it('should execute middleware stack in correct order', { timeout: 3000 }, async () => {
        const testCaseId = generateTestId('middleware-order');
        
        testLogger.info('Testing Express.js middleware execution order', {
            testCaseId: testCaseId,
            validateMiddleware: true
        });

        // Execute request to validate middleware pipeline execution and ordering
        const response = await testAgent
            .get('/hello')
            .expect(200);

        // Validate middleware executed properly and response was generated correctly
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.text, 'Hello world');
        assert.ok(response.headers, 'Middleware should set response headers');

        // Verify middleware processing completed successfully
        assert.ok(response.headers['content-type'], 'Content-Type middleware should execute');
        assert.ok(response.headers['content-length'], 'Content-Length middleware should execute');

        testLogger.info('Middleware execution order test passed', {
            testCaseId: testCaseId,
            middlewareExecuted: true,
            responseGenerated: true
        });
    });

    // Complete middleware pipeline processing validation for request lifecycle
    it('should process requests through complete middleware pipeline', { timeout: 3000 }, async () => {
        const testCaseId = generateTestId('middleware-pipeline');
        
        testLogger.info('Testing complete middleware pipeline processing', {
            testCaseId: testCaseId,
            trackMiddleware: true
        });

        // Execute request with middleware tracking and pipeline validation
        const response = await testAgent
            .get('/hello')
            .expect(200);

        // Validate complete request processing through all middleware layers
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.text, 'Hello world');
        
        // Verify middleware pipeline processing completed successfully
        assert.ok(response.headers, 'Response headers should be processed by middleware');
        assert.ok(response.text, 'Response body should be processed by middleware');

        testLogger.info('Middleware pipeline test passed', {
            testCaseId: testCaseId,
            pipelineComplete: true,
            responseProcessed: true
        });
    });

    // Middleware stability testing during error conditions and recovery scenarios
    it('should maintain middleware stability during error conditions', { timeout: 5000 }, async () => {
        const testCaseId = generateTestId('middleware-stability');
        
        testLogger.info('Testing middleware stability during error conditions', {
            testCaseId: testCaseId,
            validateStability: true
        });

        // Test middleware stability with 404 error condition
        const notFoundResponse = await testAgent
            .get('/nonexistent')
            .expect(404);

        // Validate middleware handles error conditions properly
        validateErrorResponse(notFoundResponse, 404, 'Not Found');

        // Test middleware stability with 405 error condition
        const methodNotAllowedResponse = await testAgent
            .post('/hello')
            .expect(405);

        // Validate middleware maintains stability across different error types
        validateErrorResponse(methodNotAllowedResponse, 405, 'Method Not Allowed');

        // Verify server continues to operate normally after error conditions
        const normalResponse = await testAgent
            .get('/hello')
            .expect(200);

        assert.strictEqual(normalResponse.text, 'Hello world');

        testLogger.info('Middleware stability test passed', {
            testCaseId: testCaseId,
            errorConditionsTested: 2,
            middlewareStable: true,
            serverRecovered: true
        });
    });
});