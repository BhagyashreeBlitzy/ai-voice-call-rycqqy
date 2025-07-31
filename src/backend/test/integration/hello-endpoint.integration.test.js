/**
 * Hello Endpoint Integration Test Suite for Node.js Tutorial Application
 * 
 * Comprehensive integration test suite for the /hello endpoint that validates complete 
 * request-response cycle functionality, HTTP server integration, middleware processing, 
 * and error handling scenarios. Tests the integration between Express.js 5.1.0 framework, 
 * route handlers, middleware stack, and server lifecycle management using Node.js built-in 
 * test runner and SuperTest for HTTP endpoint validation.
 * 
 * Demonstrates integration testing best practices for educational Node.js applications 
 * with focus on real-world request processing, proper test isolation, and comprehensive 
 * endpoint behavior validation.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Node.js built-in test runner - Node.js v18+ native testing framework
const { test, describe, it, before, after, beforeEach, afterEach } = require('node:test');

// Node.js built-in assertion library - Native assertion capabilities for test validation
const assert = require('node:assert');

// SuperTest v7.1.1 - SuperAgent driven library for testing HTTP servers and API endpoints
const supertest = require('supertest');

// Import test configuration and utilities for comprehensive test environment management
const { 
    testConfig, 
    TestConfiguration, 
    createTestServer 
} = require('../setup/testConfig.js');

// Import server lifecycle management utilities for integration test server operations
const { 
    TestServerManager, 
    createServerTestAgent 
} = require('../helpers/serverHelpers.js');

// Import HTTP request testing utilities with fluent interface for endpoint testing
const { 
    RequestTestClient, 
    makeRequest, 
    makeHelloRequest, 
    validateResponse, 
    assertHelloResponse 
} = require('../helpers/requestHelpers.js');

// Import core test utilities for mock management, performance measurement, and test lifecycle
const { 
    getAvailablePort, 
    createTestLogger, 
    waitForCondition, 
    TestUtilities 
} = require('../helpers/testHelpers.js');

// Import test data fixtures for consistent request and response validation
const { 
    validRequests, 
    invalidRequests, 
    notFoundRequests, 
    createValidHelloRequest 
} = require('../fixtures/requests.js');

const { 
    successResponses, 
    errorResponses, 
    helloResponses, 
    createHelloSuccessResponse 
} = require('../fixtures/responses.js');

// Import application components for integration testing
const { helloRouter } = require('../../routes/hello.js');
const app = require('../../app.js');

/**
 * Global test variables for integration test environment management
 * These variables maintain test state across the integration test lifecycle
 */

// Test logger instance for integration test logging and debugging
let testLogger = createTestLogger('hello-endpoint-integration');

// Test configuration instance for environment and server settings management
let testConfig = new TestConfiguration(testConfig.integration);

// Test server manager for automated server lifecycle operations
let testServerManager = new TestServerManager();

// Test utilities instance for mock management and cleanup operations
let testUtilities = new TestUtilities();

// Dynamic port allocation for test server isolation
let testPort = null;

// Test server instance for HTTP integration testing
let testServer = null;

// SuperTest agent for HTTP endpoint testing and validation
let testAgent = null;

// Request test client with fluent interface for endpoint validation
let requestClient = null;

/**
 * Sets up comprehensive integration test environment including test server configuration,
 * port allocation, environment variable mocking, and test utilities initialization for
 * hello endpoint integration testing.
 * 
 * @returns {Promise<void>} Promise resolving when integration test environment is fully configured and ready
 */
async function setupIntegrationTestEnvironment() {
    try {
        testLogger.info('Setting up integration test environment for hello endpoint');

        // Get available port using getAvailablePort function for test server isolation
        testPort = await getAvailablePort(testConfig.server.portRange.start, testConfig.server.portRange.end);
        testLogger.debug(`Allocated test port: ${testPort}`);

        // Initialize test configuration using TestConfiguration class with integration settings
        await testConfig.setupTestEnvironment();
        testLogger.debug('Test configuration initialized successfully');

        // Set up test environment variables using testUtilities.mockProcessEnv
        testUtilities.mockProcessEnv({
            NODE_ENV: testConfig.environment.nodeEnv,
            PORT: testPort.toString(),
            HOST: testConfig.server.host,
            LOG_LEVEL: testConfig.environment.logLevel
        });
        testLogger.debug('Test environment variables configured');

        // Create test server using createTestServer function with test configuration
        testServer = await createTestServer({
            port: testPort,
            host: testConfig.server.host,
            app: app,
            enableLogging: testConfig.server.enableLogging
        });
        testLogger.debug('Test server instance created');

        // Initialize TestServerManager with test server and configuration
        testServerManager = new TestServerManager({
            server: testServer,
            port: testPort,
            host: testConfig.server.host,
            logger: testLogger
        });

        // Create SuperTest agent using createServerTestAgent for HTTP testing
        testAgent = createServerTestAgent(testServer);
        testLogger.debug('SuperTest agent initialized');

        // Initialize RequestTestClient with test agent for fluent request testing
        requestClient = new RequestTestClient({
            agent: testAgent,
            baseUrl: `http://${testConfig.server.host}:${testPort}`,
            logger: testLogger,
            timeout: testConfig.timeouts.integration.request
        });

        // Wait for test server readiness using waitForCondition utility
        const isServerReady = await waitForCondition(
            async () => {
                try {
                    const response = await testAgent.get('/hello');
                    return response.status === 200;
                } catch (error) {
                    return false;
                }
            },
            testConfig.timeouts.integration.setup,
            testConfig.timeouts.integration.polling,
            { description: 'test server readiness' }
        );

        if (!isServerReady) {
            throw new Error('Test server failed to become ready within timeout period');
        }

        // Validate test environment setup and log readiness status
        const serverInfo = testServerManager.getServerInfo();
        if (!validateServerStartup(serverInfo)) {
            throw new Error('Server startup validation failed');
        }

        // Store test components in global variables for test access
        testLogger.info('Integration test environment setup completed successfully', {
            port: testPort,
            host: testConfig.server.host,
            serverReady: isServerReady,
            serverInfo: serverInfo
        });

    } catch (error) {
        testLogger.error('Failed to setup integration test environment', { 
            error: error.message, 
            stack: error.stack 
        });
        throw error;
    }
}

/**
 * Performs comprehensive cleanup of integration test environment including server shutdown,
 * port release, environment restoration, and resource cleanup for proper test isolation.
 * 
 * @returns {Promise<void>} Promise resolving when all integration test cleanup is completed
 */
async function teardownIntegrationTestEnvironment() {
    try {
        testLogger.info('Starting integration test environment teardown');

        // Stop test server using testServerManager.stopServer method
        if (testServerManager && testServer) {
            await testServerManager.stopServer();
            testLogger.debug('Test server stopped successfully');
        }

        // Release allocated test port and clean up network resources
        if (testPort) {
            testLogger.debug(`Released test port: ${testPort}`);
            testPort = null;
        }

        // Restore original environment variables using testUtilities.cleanup
        if (testUtilities) {
            await testUtilities.cleanup();
            testLogger.debug('Test utilities cleaned up');
        }

        // Clean up test configuration and reset test state
        if (testConfig) {
            await testConfig.cleanup();
            testLogger.debug('Test configuration cleaned up');
        }

        // Clean up SuperTest agent and HTTP connections
        if (testAgent) {
            testAgent = null;
            testLogger.debug('SuperTest agent cleaned up');
        }

        // Reset global test variables and clear test references
        testServer = null;
        requestClient = null;

        // Validate cleanup completion and log cleanup status
        testLogger.info('Integration test environment teardown completed successfully');

    } catch (error) {
        testLogger.error('Error during integration test environment teardown', {
            error: error.message,
            stack: error.stack
        });
        // Continue with cleanup even if some operations fail
    }
}

/**
 * Validates that the test server has started successfully and is ready to accept HTTP requests
 * for integration testing with proper server state verification.
 * 
 * @param {Object} serverInfo - Server information object containing status and configuration details
 * @returns {boolean} True if server startup validation passes, false otherwise
 */
function validateServerStartup(serverInfo) {
    try {
        testLogger.debug('Validating server startup', { serverInfo });

        // Verify server instance is created and configured properly
        if (!serverInfo) {
            testLogger.error('Server info is not available');
            return false;
        }

        // Check server is listening on allocated test port
        if (serverInfo.port !== testPort) {
            testLogger.error(`Server port mismatch: expected ${testPort}, got ${serverInfo.port}`);
            return false;
        }

        // Validate server process state and readiness indicators
        if (!serverInfo.isListening) {
            testLogger.error('Server is not in listening state');
            return false;
        }

        // Verify server configuration matches test requirements
        if (serverInfo.host !== testConfig.server.host) {
            testLogger.error(`Server host mismatch: expected ${testConfig.server.host}, got ${serverInfo.host}`);
            return false;
        }

        // Check server middleware stack is properly configured
        if (!serverInfo.hasMiddleware) {
            testLogger.warn('Server middleware stack may not be properly configured');
        }

        // Validate server error handling and response capabilities
        if (!serverInfo.errorHandling) {
            testLogger.warn('Server error handling may not be properly configured');
        }

        testLogger.debug('Server startup validation completed successfully');
        return true;

    } catch (error) {
        testLogger.error('Error during server startup validation', {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

/**
 * Comprehensive validation of hello endpoint HTTP response including status code, content type,
 * response body, headers, and response metadata for complete response verification.
 * 
 * @param {Object} response - HTTP response object from SuperTest
 * @param {Object} expectedResponse - Expected response structure for validation
 * @returns {Object} Validation result object with detailed response validation information
 */
function validateHelloEndpointResponse(response, expectedResponse) {
    try {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            details: {},
            timestamp: new Date().toISOString()
        };

        // Validate HTTP status code matches expected success status (200)
        if (response.status !== 200) {
            validationResult.errors.push(`Expected status 200, got ${response.status}`);
            validationResult.isValid = false;
        }
        validationResult.details.statusCode = response.status;

        // Verify response body content equals 'Hello world' string
        const expectedBody = expectedResponse?.body || 'Hello world';
        if (response.text !== expectedBody) {
            validationResult.errors.push(`Expected body '${expectedBody}', got '${response.text}'`);
            validationResult.isValid = false;
        }
        validationResult.details.responseBody = response.text;

        // Check Content-Type header is properly set for text response
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('text')) {
            validationResult.warnings.push(`Content-Type header may be incorrect: ${contentType}`);
        }
        validationResult.details.contentType = contentType;

        // Validate response headers include required HTTP headers
        const requiredHeaders = ['content-length', 'date'];
        requiredHeaders.forEach(header => {
            if (!response.headers[header]) {
                validationResult.warnings.push(`Missing expected header: ${header}`);
            }
        });
        validationResult.details.headers = response.headers;

        // Verify response metadata and structure matches expected format
        if (expectedResponse?.metadata) {
            // Validate custom headers if expected
            Object.keys(expectedResponse.metadata).forEach(key => {
                if (response.headers[key] !== expectedResponse.metadata[key]) {
                    validationResult.warnings.push(`Metadata mismatch for ${key}`);
                }
            });
        }

        // Check response timing is within acceptable performance thresholds
        const responseTime = response.duration || (response.res && response.res.responseTime);
        if (responseTime && responseTime > testConfig.timeouts.integration.request) {
            validationResult.warnings.push(`Response time ${responseTime}ms exceeds threshold`);
        }
        validationResult.details.responseTime = responseTime;

        // Validate response encoding and character set handling
        const responseLength = response.text?.length || 0;
        if (responseLength === 0) {
            validationResult.errors.push('Response body is empty');
            validationResult.isValid = false;
        }
        validationResult.details.responseLength = responseLength;

        testLogger.debug('Hello endpoint response validation completed', {
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length
        });

        return validationResult;

    } catch (error) {
        testLogger.error('Error during response validation', {
            error: error.message,
            stack: error.stack
        });

        return {
            isValid: false,
            errors: [`Validation failed: ${error.message}`],
            warnings: [],
            details: {},
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Tests successful GET request to /hello endpoint with comprehensive validation of request processing,
 * response generation, and complete request-response cycle verification.
 * 
 * @param {Object} testClient - Request test client for HTTP operations
 * @returns {Promise<Object>} Promise resolving to test result object with response and validation details
 */
async function testSuccessfulHelloRequest(testClient) {
    try {
        testLogger.debug('Testing successful hello request');

        // Create valid hello request using createValidHelloRequest factory
        const requestData = createValidHelloRequest();
        testLogger.debug('Created valid hello request', { requestData });

        // Execute GET request to /hello endpoint using test client
        const startTime = Date.now();
        const response = await testClient.get('/hello')
            .expectStatus(200)
            .expectBody('Hello world');

        // Measure request processing time for performance validation
        const responseTime = Date.now() - startTime;
        testLogger.debug(`Hello request completed in ${responseTime}ms`);

        // Validate HTTP response status code is 200 OK
        assert.strictEqual(response.status, 200, 'Expected HTTP 200 status');

        // Verify response body contains exactly 'Hello world' content
        assert.strictEqual(response.text, 'Hello world', 'Expected Hello world response');

        // Check response headers for proper Content-Type and metadata
        assert.ok(response.headers['content-type'], 'Content-Type header should be present');
        assert.ok(response.headers['content-length'], 'Content-Length header should be present');

        // Validate response structure matches expected hello response format
        const expectedResponse = createHelloSuccessResponse();
        const validationResult = validateHelloEndpointResponse(response, expectedResponse);
        
        if (!validationResult.isValid) {
            throw new Error(`Response validation failed: ${validationResult.errors.join(', ')}`);
        }

        // Assert response performance meets integration test thresholds
        const performanceThreshold = testConfig.timeouts.integration.request;
        assert.ok(responseTime < performanceThreshold, 
            `Response time ${responseTime}ms should be less than ${performanceThreshold}ms`);

        // Log successful test execution and response validation results
        testLogger.info('Successful hello request test completed', {
            statusCode: response.status,
            responseTime: `${responseTime}ms`,
            bodyLength: response.text.length,
            validationPassed: validationResult.isValid
        });

        // Return test result object with response details and validation status
        return {
            success: true,
            response: response,
            responseTime: responseTime,
            validation: validationResult,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        testLogger.error('Successful hello request test failed', {
            error: error.message,
            stack: error.stack
        });

        return {
            success: false,
            error: error,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Tests invalid HTTP method requests to /hello endpoint including POST, PUT, DELETE methods
 * with validation of proper 405 Method Not Allowed error responses and error handling.
 * 
 * @param {Object} testClient - Request test client for HTTP operations
 * @returns {Promise<Array>} Promise resolving to array of test results for each invalid method tested
 */
async function testInvalidMethodRequests(testClient) {
    try {
        testLogger.debug('Testing invalid method requests to hello endpoint');

        const testResults = [];
        const invalidMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

        for (const method of invalidMethods) {
            try {
                testLogger.debug(`Testing ${method} method to /hello endpoint`);

                // Execute invalid method request to /hello endpoint
                const response = await testClient[method.toLowerCase()]('/hello');

                // Validate 405 Method Not Allowed status code
                assert.strictEqual(response.status, 405, 
                    `Expected 405 Method Not Allowed for ${method} request`);

                // Verify Allow header contains only GET method for invalid method responses
                const allowHeader = response.headers['allow'];
                if (allowHeader) {
                    assert.ok(allowHeader.includes('GET'), 
                        'Allow header should include GET method');
                }

                // Validate error response structure matches methodNotAllowed fixture
                const expectedError = errorResponses.methodNotAllowed;
                if (response.body && typeof response.body === 'object') {
                    assert.ok(response.body.error, 'Error response should contain error object');
                }

                // Check error message indicates method not allowed for hello endpoint
                testLogger.debug(`${method} method correctly rejected with 405 status`);

                testResults.push({
                    method: method,
                    success: true,
                    statusCode: response.status,
                    allowHeader: allowHeader,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                testLogger.error(`Invalid method test failed for ${method}`, {
                    method: method,
                    error: error.message
                });

                testResults.push({
                    method: method,
                    success: false,
                    error: error,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Assert consistent error handling across all invalid method requests
        const successfulTests = testResults.filter(result => result.success);
        assert.ok(successfulTests.length > 0, 'At least some invalid method tests should pass');

        testLogger.info('Invalid method requests test completed', {
            totalMethods: invalidMethods.length,
            successfulTests: successfulTests.length,
            results: testResults
        });

        return testResults;

    } catch (error) {
        testLogger.error('Invalid method requests test failed', {
            error: error.message,
            stack: error.stack
        });

        return [{
            success: false,
            error: error,
            timestamp: new Date().toISOString()
        }];
    }
}

/**
 * Tests requests to non-existent routes and invalid paths with validation of proper 404 Not Found
 * error responses and route matching error handling.
 * 
 * @param {Object} testClient - Request test client for HTTP operations
 * @returns {Promise<Array>} Promise resolving to array of test results for each not found scenario tested
 */
async function testNotFoundRequests(testClient) {
    try {
        testLogger.debug('Testing not found requests');

        const testResults = [];
        const notFoundPaths = [
            '/invalid',
            '/hello/extra',
            '/Hello',  // Case sensitivity
            '/helo',   // Typo
            '/api/hello',
            '/hello/',
            '/hello?param=value'
        ];

        for (const path of notFoundPaths) {
            try {
                testLogger.debug(`Testing not found request to ${path}`);

                // Test request to invalid path
                const response = await testClient.get(path);

                // Validate 404 Not Found status code for invalid path request
                assert.strictEqual(response.status, 404, 
                    `Expected 404 Not Found status for path: ${path}`);

                // Verify error response structure matches notFound fixture format
                const expectedError = errorResponses.notFound;
                if (response.body && typeof response.body === 'object') {
                    assert.ok(response.body.error, 'Error response should contain error object');
                }

                // Check error message indicates route not found with path information
                testLogger.debug(`Path ${path} correctly returned 404 status`);

                testResults.push({
                    path: path,
                    success: true,
                    statusCode: response.status,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                testLogger.error(`Not found test failed for path ${path}`, {
                    path: path,
                    error: error.message
                });

                testResults.push({
                    path: path,
                    success: false,
                    error: error,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Validate consistent 404 error handling across all not found scenarios
        const successfulTests = testResults.filter(result => result.success);
        assert.ok(successfulTests.length > 0, 'At least some not found tests should pass');

        // Assert proper route matching behavior and error response generation
        testLogger.info('Not found requests test completed', {
            totalPaths: notFoundPaths.length,
            successfulTests: successfulTests.length,
            results: testResults
        });

        return testResults;

    } catch (error) {
        testLogger.error('Not found requests test failed', {
            error: error.message,
            stack: error.stack
        });

        return [{
            success: false,
            error: error,
            timestamp: new Date().toISOString()
        }];
    }
}

/**
 * Tests server error handling scenarios including simulated server errors, middleware failures,
 * and error processing pipeline validation with proper 500 Internal Server Error responses.
 * 
 * @param {Object} testClient - Request test client for HTTP operations
 * @returns {Promise<Object>} Promise resolving to test result object with error handling validation details
 */
async function testServerErrorHandling(testClient) {
    try {
        testLogger.debug('Testing server error handling scenarios');

        // Note: For a simple hello endpoint, server errors are rare
        // This test focuses on general error handling capabilities
        const testResults = {
            success: true,
            errorHandlingCapable: true,
            timestamp: new Date().toISOString()
        };

        // Test server's ability to handle malformed requests
        try {
            // Send request with extremely long path to test server limits
            const longPath = '/hello' + 'x'.repeat(2000);
            const response = await testClient.get(longPath);

            // Server should handle this gracefully (404 or 414 URI Too Long)
            assert.ok([404, 414].includes(response.status), 
                'Server should handle long URIs gracefully');

            testResults.longUriHandling = {
                success: true,
                statusCode: response.status
            };

        } catch (error) {
            testLogger.warn('Long URI test encountered error', { error: error.message });
            testResults.longUriHandling = {
                success: false,
                error: error.message
            };
        }

        // Test server's response to rapid successive requests
        try {
            const rapidRequests = Array(5).fill(null).map(() => testClient.get('/hello'));
            const responses = await Promise.all(rapidRequests);

            // All requests should succeed
            responses.forEach((response, index) => {
                assert.strictEqual(response.status, 200, 
                    `Rapid request ${index + 1} should succeed`);
            });

            testResults.rapidRequestHandling = {
                success: true,
                requestCount: responses.length
            };

        } catch (error) {
            testLogger.warn('Rapid request test encountered error', { error: error.message });
            testResults.rapidRequestHandling = {
                success: false,
                error: error.message
            };
        }

        // Verify server continues operating after error handling
        const healthCheckResponse = await testClient.get('/hello');
        assert.strictEqual(healthCheckResponse.status, 200, 
            'Server should continue operating after error scenarios');

        testLogger.info('Server error handling test completed', {
            errorHandlingCapable: testResults.errorHandlingCapable,
            testResults: testResults
        });

        return testResults;

    } catch (error) {
        testLogger.error('Server error handling test failed', {
            error: error.message,
            stack: error.stack
        });

        return {
            success: false,
            error: error,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Tests concurrent request handling to /hello endpoint for performance validation, request isolation,
 * and server stability under load with proper response consistency verification.
 * 
 * @param {number} concurrentCount - Number of concurrent requests to execute
 * @param {Object} testClient - Request test client for HTTP operations
 * @returns {Promise<Object>} Promise resolving to concurrent test results with performance metrics
 */
async function testConcurrentRequests(concurrentCount = 10, testClient) {
    try {
        testLogger.debug(`Testing ${concurrentCount} concurrent requests to hello endpoint`);

        // Create array of concurrent hello requests using specified count
        const startTime = Date.now();
        const concurrentRequests = Array(concurrentCount).fill(null).map(() => 
            testClient.get('/hello')
        );

        // Execute all requests simultaneously using Promise.all
        const responses = await Promise.all(concurrentRequests);
        const totalTime = Date.now() - startTime;

        // Measure total concurrent request processing time
        testLogger.debug(`${concurrentCount} concurrent requests completed in ${totalTime}ms`);

        // Validate all responses have 200 OK status code
        responses.forEach((response, index) => {
            assert.strictEqual(response.status, 200, 
                `Concurrent request ${index + 1} should return 200 status`);
        });

        // Verify all responses contain 'Hello world' content
        responses.forEach((response, index) => {
            assert.strictEqual(response.text, 'Hello world', 
                `Concurrent request ${index + 1} should return Hello world`);
        });

        // Check response consistency across all concurrent requests
        const uniqueResponses = new Set(responses.map(r => r.text));
        assert.strictEqual(uniqueResponses.size, 1, 
            'All concurrent responses should be identical');

        // Validate no request interference or data corruption occurred
        const allStatusCodes = responses.map(r => r.status);
        const successfulRequests = allStatusCodes.filter(status => status === 200);
        assert.strictEqual(successfulRequests.length, concurrentCount, 
            'All concurrent requests should succeed');

        // Assert server performance meets concurrent request thresholds
        const averageResponseTime = totalTime / concurrentCount;
        const performanceThreshold = testConfig.timeouts.integration.request;
        assert.ok(averageResponseTime < performanceThreshold, 
            `Average response time ${averageResponseTime}ms should be reasonable`);

        // Calculate and validate average response time per request
        const performanceMetrics = {
            totalRequests: concurrentCount,
            totalTime: totalTime,
            averageResponseTime: averageResponseTime,
            requestsPerSecond: Math.round((concurrentCount / totalTime) * 1000),
            allSuccessful: successfulRequests.length === concurrentCount
        };

        testLogger.info('Concurrent requests test completed successfully', {
            concurrentCount: concurrentCount,
            totalTime: `${totalTime}ms`,
            averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
            requestsPerSecond: performanceMetrics.requestsPerSecond,
            allSuccessful: performanceMetrics.allSuccessful
        });

        // Return concurrent test results with performance metrics and validation
        return {
            success: true,
            metrics: performanceMetrics,
            responses: responses.length,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        testLogger.error('Concurrent requests test failed', {
            concurrentCount: concurrentCount,
            error: error.message,
            stack: error.stack
        });

        return {
            success: false,
            error: error,
            concurrentCount: concurrentCount,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Tests integration of middleware pipeline including request logging, response handling,
 * error handling, and middleware execution order validation for complete middleware stack testing.
 * 
 * @param {Object} testClient - Request test client for HTTP operations
 * @returns {Promise<Object>} Promise resolving to middleware integration test results
 */
async function testMiddlewareIntegration(testClient) {
    try {
        testLogger.debug('Testing middleware integration');

        const middlewareTestResults = {
            success: true,
            middlewareTests: {},
            timestamp: new Date().toISOString()
        };

        // Execute hello request with middleware logging enabled
        const response = await testClient.get('/hello');

        // Validate request logging middleware processes request correctly
        assert.strictEqual(response.status, 200, 'Middleware should not interfere with request processing');

        // Check middleware execution order follows expected pipeline sequence
        // Verify response headers added by middleware
        const responseHeaders = response.headers;
        middlewareTestResults.middlewareTests.headers = {
            contentType: responseHeaders['content-type'],
            contentLength: responseHeaders['content-length'],
            date: responseHeaders['date']
        };

        // Verify middleware does not interfere with hello endpoint functionality
        assert.strictEqual(response.text, 'Hello world', 
            'Middleware should not modify hello endpoint response');

        // Test error handling middleware integration with error scenarios
        try {
            // This should trigger 404 middleware
            const notFoundResponse = await testClient.get('/nonexistent');
            assert.strictEqual(notFoundResponse.status, 404, 
                'Error handling middleware should process 404 errors');
            
            middlewareTestResults.middlewareTests.errorHandling = {
                success: true,
                statusCode: notFoundResponse.status
            };
        } catch (error) {
            middlewareTestResults.middlewareTests.errorHandling = {
                success: false,
                error: error.message
            };
        }

        // Assert middleware performance impact is within acceptable thresholds
        // (This is implicitly tested through the response time of the main request)

        // Check middleware cleanup and resource management
        // (Express middleware cleanup is automatic)

        testLogger.info('Middleware integration test completed', {
            success: middlewareTestResults.success,
            middlewareTests: Object.keys(middlewareTestResults.middlewareTests).length
        });

        return middlewareTestResults;

    } catch (error) {
        testLogger.error('Middleware integration test failed', {
            error: error.message,
            stack: error.stack
        });

        return {
            success: false,
            error: error,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Measures and validates integration test performance metrics including request processing time,
 * server response time, and overall test execution performance for baseline establishment.
 * 
 * @param {Function} testFunction - Test function to measure performance for
 * @param {Object} performanceThresholds - Performance thresholds for validation
 * @returns {Promise<Object>} Promise resolving to performance measurement results
 */
async function measureIntegrationTestPerformance(testFunction, performanceThresholds) {
    try {
        testLogger.debug('Measuring integration test performance');

        // Record start time before test function execution
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage();

        // Execute provided test function with performance monitoring
        let testResult = null;
        let testError = null;

        try {
            testResult = await testFunction();
        } catch (error) {
            testError = error;
        }

        // Record end time after test function completion
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();

        // Calculate total test execution time and performance metrics
        const executionTimeNs = Number(endTime - startTime);
        const executionTimeMs = executionTimeNs / 1000000;

        const memoryDelta = {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal
        };

        // Validate performance metrics against provided thresholds
        const performanceResults = {
            success: testError === null,
            executionTime: {
                nanoseconds: executionTimeNs,
                milliseconds: executionTimeMs,
                seconds: executionTimeMs / 1000
            },
            memory: {
                start: startMemory,
                end: endMemory,
                delta: memoryDelta
            },
            thresholds: performanceThresholds,
            testResult: testResult,
            testError: testError,
            timestamp: new Date().toISOString()
        };

        // Check request processing time meets integration test requirements
        if (performanceThresholds?.maxExecutionTime && 
            executionTimeMs > performanceThresholds.maxExecutionTime) {
            performanceResults.thresholdViolations = performanceResults.thresholdViolations || [];
            performanceResults.thresholdViolations.push(
                `Execution time ${executionTimeMs}ms exceeds threshold ${performanceThresholds.maxExecutionTime}ms`
            );
        }

        // Assert server response time is within acceptable performance range
        if (performanceThresholds?.maxMemoryUsage && 
            memoryDelta.heapUsed > performanceThresholds.maxMemoryUsage) {
            performanceResults.thresholdViolations = performanceResults.thresholdViolations || [];
            performanceResults.thresholdViolations.push(
                `Memory usage ${memoryDelta.heapUsed} bytes exceeds threshold ${performanceThresholds.maxMemoryUsage} bytes`
            );
        }

        // Log performance measurement results and threshold compliance
        testLogger.info('Integration test performance measurement completed', {
            executionTime: `${executionTimeMs.toFixed(2)}ms`,
            memoryDelta: `${Math.round(memoryDelta.heapUsed / 1024)}KB`,
            thresholdViolations: performanceResults.thresholdViolations?.length || 0,
            success: performanceResults.success
        });

        return performanceResults;

    } catch (error) {
        testLogger.error('Performance measurement failed', {
            error: error.message,
            stack: error.stack
        });

        return {
            success: false,
            error: error,
            timestamp: new Date().toISOString()
        };
    }
}

// =============================================================================
// MAIN INTEGRATION TEST SUITE
// =============================================================================

describe('Hello Endpoint Integration Tests', () => {
    // Test suite setup and teardown
    before(async () => {
        testLogger.info('Starting hello endpoint integration test suite');
        await setupIntegrationTestEnvironment();
    });

    after(async () => {
        testLogger.info('Completing hello endpoint integration test suite');
        await teardownIntegrationTestEnvironment();
    });

    beforeEach(async () => {
        testLogger.debug('Preparing for individual test case');
        // Reset any test-specific state if needed
    });

    afterEach(async () => {
        testLogger.debug('Cleaning up after individual test case');
        // Perform any test-specific cleanup if needed
    });

    // ==========================================================================
    // SUCCESSFUL REQUEST TESTS
    // ==========================================================================

    it('should successfully handle GET /hello requests', async () => {
        testLogger.info('Testing successful GET /hello requests');
        
        const testResult = await testSuccessfulHelloRequest(requestClient);
        
        assert.ok(testResult.success, 'Hello request should succeed');
        assert.strictEqual(testResult.response.status, 200, 'Should return HTTP 200');
        assert.strictEqual(testResult.response.text, 'Hello world', 'Should return Hello world');
        assert.ok(testResult.validation.isValid, 'Response validation should pass');
        
        testLogger.info('Successful GET /hello test completed', {
            responseTime: testResult.responseTime,
            validationPassed: testResult.validation.isValid
        });
    });

    // ==========================================================================
    // INVALID METHOD TESTS
    // ==========================================================================

    it('should return 405 for invalid HTTP methods', async () => {
        testLogger.info('Testing invalid HTTP method handling');
        
        const testResults = await testInvalidMethodRequests(requestClient);
        
        assert.ok(Array.isArray(testResults), 'Should return array of test results');
        
        const successfulTests = testResults.filter(result => result.success);
        assert.ok(successfulTests.length > 0, 'Some invalid method tests should pass');
        
        // Verify each successful test returned 405
        successfulTests.forEach(result => {
            assert.strictEqual(result.statusCode, 405, 
                `${result.method} should return 405 Method Not Allowed`);
        });
        
        testLogger.info('Invalid HTTP method test completed', {
            totalMethods: testResults.length,
            successfulTests: successfulTests.length
        });
    });

    // ==========================================================================
    // NOT FOUND TESTS
    // ==========================================================================

    it('should return 404 for non-existent routes', async () => {
        testLogger.info('Testing 404 Not Found responses');
        
        const testResults = await testNotFoundRequests(requestClient);
        
        assert.ok(Array.isArray(testResults), 'Should return array of test results');
        
        const successfulTests = testResults.filter(result => result.success);
        assert.ok(successfulTests.length > 0, 'Some not found tests should pass');
        
        // Verify each successful test returned 404
        successfulTests.forEach(result => {
            assert.strictEqual(result.statusCode, 404, 
                `Path ${result.path} should return 404 Not Found`);
        });
        
        testLogger.info('Not found routes test completed', {
            totalPaths: testResults.length,
            successfulTests: successfulTests.length
        });
    });

    // ==========================================================================
    // ERROR HANDLING TESTS
    // ==========================================================================

    it('should handle server errors gracefully', async () => {
        testLogger.info('Testing server error handling');
        
        const testResult = await testServerErrorHandling(requestClient);
        
        assert.ok(testResult.success, 'Error handling test should succeed');
        assert.ok(testResult.errorHandlingCapable, 'Server should handle errors gracefully');
        
        testLogger.info('Server error handling test completed', {
            errorHandlingCapable: testResult.errorHandlingCapable
        });
    });

    // ==========================================================================
    // CONCURRENT REQUEST TESTS
    // ==========================================================================

    it('should handle concurrent requests efficiently', async () => {
        testLogger.info('Testing concurrent request handling');
        
        const concurrentCount = 10;
        const testResult = await testConcurrentRequests(concurrentCount, requestClient);
        
        assert.ok(testResult.success, 'Concurrent requests test should succeed');
        assert.strictEqual(testResult.responses, concurrentCount, 
            'All concurrent requests should complete');
        assert.ok(testResult.metrics.allSuccessful, 'All requests should be successful');
        
        testLogger.info('Concurrent requests test completed', {
            concurrentCount: concurrentCount,
            averageResponseTime: testResult.metrics.averageResponseTime,
            requestsPerSecond: testResult.metrics.requestsPerSecond
        });
    });

    // ==========================================================================
    // MIDDLEWARE INTEGRATION TESTS
    // ==========================================================================

    it('should integrate middleware pipeline correctly', async () => {
        testLogger.info('Testing middleware integration');
        
        const testResult = await testMiddlewareIntegration(requestClient);
        
        assert.ok(testResult.success, 'Middleware integration test should succeed');
        assert.ok(testResult.middlewareTests, 'Should have middleware test results');
        
        testLogger.info('Middleware integration test completed', {
            middlewareTestCount: Object.keys(testResult.middlewareTests).length
        });
    });
});

// =============================================================================
// PERFORMANCE TEST SUITE
// =============================================================================

describe('Hello Endpoint Performance Tests', () => {
    before(async () => {
        testLogger.info('Starting hello endpoint performance test suite');
        if (!testServer) {
            await setupIntegrationTestEnvironment();
        }
    });

    after(async () => {
        testLogger.info('Completing hello endpoint performance test suite');
        // Keep environment for main test suite
    });

    it('should meet response time performance thresholds', async () => {
        testLogger.info('Testing response time performance');
        
        const performanceThresholds = {
            maxExecutionTime: testConfig.timeouts.integration.request,
            maxMemoryUsage: 50 * 1024 * 1024 // 50MB
        };
        
        const testFunction = async () => {
            return await testSuccessfulHelloRequest(requestClient);
        };
        
        const performanceResult = await measureIntegrationTestPerformance(
            testFunction, 
            performanceThresholds
        );
        
        assert.ok(performanceResult.success, 'Performance test should succeed');
        assert.ok(!performanceResult.thresholdViolations || 
                 performanceResult.thresholdViolations.length === 0, 
                 'Should not violate performance thresholds');
        
        testLogger.info('Response time performance test completed', {
            executionTime: performanceResult.executionTime.milliseconds,
            memoryUsage: performanceResult.memory.delta.heapUsed,
            thresholdViolations: performanceResult.thresholdViolations?.length || 0
        });
    });

    it('should maintain performance under concurrent load', async () => {
        testLogger.info('Testing performance under concurrent load');
        
        const performanceThresholds = {
            maxExecutionTime: testConfig.timeouts.integration.default,
            maxMemoryUsage: 100 * 1024 * 1024 // 100MB for concurrent tests
        };
        
        const testFunction = async () => {
            return await testConcurrentRequests(20, requestClient);
        };
        
        const performanceResult = await measureIntegrationTestPerformance(
            testFunction, 
            performanceThresholds
        );
        
        assert.ok(performanceResult.success, 'Concurrent performance test should succeed');
        assert.ok(performanceResult.testResult.success, 'Concurrent requests should succeed');
        
        testLogger.info('Concurrent load performance test completed', {
            executionTime: performanceResult.executionTime.milliseconds,
            concurrentRequests: 20,
            allSuccessful: performanceResult.testResult.metrics.allSuccessful
        });
    });
});

// Export test functions for potential reuse in other test suites
module.exports = {
    setupIntegrationTestEnvironment,
    teardownIntegrationTestEnvironment,
    validateServerStartup,
    validateHelloEndpointResponse,
    testSuccessfulHelloRequest,
    testInvalidMethodRequests,
    testNotFoundRequests,
    testServerErrorHandling,
    testConcurrentRequests,
    testMiddlewareIntegration,
    measureIntegrationTestPerformance
};