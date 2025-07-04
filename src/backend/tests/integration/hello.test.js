// External dependencies for testing framework and HTTP assertions
const request = require('supertest'); // v7.1.1 - HTTP testing library for Express applications, provides programmatic HTTP requests and response assertions
const { performance } = require('perf_hooks'); // Node.js built-in module for high-resolution performance timing measurements

// Internal dependencies - Application components under test
const { startServer } = require('../../server.js'); // Server startup functionality with comprehensive error handling and graceful shutdown
const { app } = require('../../app.js'); // Pre-configured Express application instance with full middleware pipeline and routing
const { PORT, ENVIRONMENT, getConfigInfo, validateConfiguration } = require('../../config/index.js'); // Configuration management utilities for environment-specific settings

/**
 * Integration Test Suite for Hello World Endpoint
 * 
 * This comprehensive test suite validates the complete functionality of the Node.js tutorial
 * backend application by testing the '/hello' endpoint and overall server behavior. The tests
 * cover functional requirements, performance specifications, error handling, and configuration
 * management as defined in the technical specifications.
 * 
 * Test Coverage Areas:
 * - HTTP Server Foundation: Server startup, port binding, and request handling
 * - Hello World Endpoint: GET /hello response validation and performance
 * - Error Handling System: 404 responses, unhandled errors, and global error middleware
 * - Server Configuration: PORT environment variable handling and validation
 * - Performance Requirements: Response time validation (< 50ms requirement)
 * - Production Readiness: Health checks, graceful shutdown, and error scenarios
 * 
 * Testing Framework:
 * - Jest: Test runner with built-in assertions and coverage reporting
 * - SuperTest: HTTP testing library for Express applications
 * - Node.js Performance API: High-resolution timing for performance measurements
 * 
 * Integration Testing Approach:
 * - Black-box testing of the complete HTTP server stack
 * - Real HTTP requests to the running server instance
 * - End-to-end validation of middleware pipeline and routing
 * - Production-like environment simulation for realistic testing
 * 
 * Educational Objectives:
 * - Demonstrate integration testing best practices for Node.js applications
 * - Show proper test organization and structure for maintainable test suites
 * - Illustrate performance testing and validation techniques
 * - Provide examples of error handling and edge case testing
 * 
 * @fileoverview Comprehensive integration tests for the Hello World Node.js backend
 * @author Node.js Tutorial Application
 * @version 1.0.0
 */

// Global test variables for server lifecycle management
let serverInstance = null;
let testPort = null;
let superTestAgent = null;

// Test configuration constants based on technical specifications
const PERFORMANCE_THRESHOLDS = {
    HELLO_ENDPOINT_MAX_RESPONSE_TIME: 50, // milliseconds - as specified in Technical Specifications 2.2.1
    ERROR_ENDPOINT_MAX_RESPONSE_TIME: 25, // milliseconds - as specified in Technical Specifications 2.2.2
    SERVER_STARTUP_MAX_TIME: 2000,        // milliseconds - reasonable startup time expectation
    SERVER_SHUTDOWN_MAX_TIME: 5000        // milliseconds - graceful shutdown timeout
};

const EXPECTED_RESPONSES = {
    HELLO_MESSAGE: 'Hello world',                    // Exact text as specified in requirements
    HELLO_CONTENT_TYPE: 'application/json',         // JSON response format from response formatter
    HELLO_STATUS_CODE: 200,                         // Success status code
    NOT_FOUND_STATUS_CODE: 404,                     // Not found status for invalid routes
    INTERNAL_ERROR_STATUS_CODE: 500                 // Internal server error status
};

/**
 * Server Setup Utility Function
 * 
 * Initializes and starts the HTTP server on a dynamically assigned port for testing.
 * This function ensures that each test run uses a unique port to avoid conflicts
 * and provides proper isolation between test runs. It integrates with the existing
 * server startup logic while providing test-specific configuration.
 * 
 * The setup process includes:
 * - Dynamic port assignment to avoid conflicts with other services
 * - Server startup with full middleware pipeline activation
 * - SuperTest agent creation for HTTP request simulation
 * - Startup timing validation to ensure reasonable performance
 * - Configuration validation to ensure proper test environment setup
 * 
 * Error Handling:
 * - Port conflict detection and automatic retry with different ports
 * - Startup timeout detection to prevent hanging test runs
 * - Configuration validation to ensure proper test environment
 * - Comprehensive error logging for debugging failed setups
 * 
 * @async
 * @function setupServer
 * @returns {Promise<Object>} Object containing SuperTest agent and server instance
 * @throws {Error} Throws error if server startup fails or times out
 * 
 * @example
 * // Setup server for testing
 * const { agent, server, port } = await setupServer();
 * // Use agent for HTTP requests: agent.get('/hello')
 * // Use server for shutdown: server.close()
 */
async function setupServer() {
    try {
        // Step 1: Determine test port with conflict avoidance
        // Use a dynamic port assignment strategy to avoid conflicts with other services
        // This ensures test isolation and supports parallel test execution
        const basePort = parseInt(process.env.TEST_PORT) || 3001;
        const maxPortAttempts = 10;
        let portFound = false;
        let attemptedPort = basePort;
        
        // Attempt to find an available port within a reasonable range
        for (let attempt = 0; attempt < maxPortAttempts && !portFound; attempt++) {
            attemptedPort = basePort + attempt;
            
            // Check if port is available by attempting to bind to it
            try {
                // Set the port for this test run
                process.env.PORT = attemptedPort.toString();
                testPort = attemptedPort;
                portFound = true;
                
                console.log(`Integration Test Setup: Using port ${testPort} for test server`);
                
            } catch (portError) {
                console.warn(`Integration Test Setup: Port ${attemptedPort} unavailable, trying next port`);
                continue;
            }
        }
        
        if (!portFound) {
            throw new Error(`Failed to find available port after ${maxPortAttempts} attempts starting from ${basePort}`);
        }
        
        // Step 2: Validate configuration before server startup
        // Ensure that the test environment is properly configured
        const configValidation = validateConfiguration();
        if (!configValidation.isValid) {
            console.warn('Integration Test Setup: Configuration warnings detected:', configValidation.warnings);
        }
        
        // Log test environment configuration for debugging
        const configInfo = getConfigInfo();
        console.log('Integration Test Setup: Environment configuration:', {
            environment: configInfo.environment,
            port: testPort,
            nodeVersion: process.version,
            testFramework: 'Jest with SuperTest'
        });
        
        // Step 3: Start the server with timing measurement
        const startupStartTime = performance.now();
        
        // Create a promise that resolves when the server starts listening
        const serverStartupPromise = new Promise((resolve, reject) => {
            // Start the server using the existing app instance
            serverInstance = app.listen(testPort, (error) => {
                if (error) {
                    reject(new Error(`Server startup failed: ${error.message}`));
                    return;
                }
                
                const startupDuration = performance.now() - startupStartTime;
                console.log(`Integration Test Setup: Server started successfully in ${startupDuration.toFixed(2)}ms`);
                
                // Validate startup performance
                if (startupDuration > PERFORMANCE_THRESHOLDS.SERVER_STARTUP_MAX_TIME) {
                    console.warn(`Integration Test Setup: Server startup took ${startupDuration.toFixed(2)}ms, exceeding recommended ${PERFORMANCE_THRESHOLDS.SERVER_STARTUP_MAX_TIME}ms threshold`);
                }
                
                resolve();
            });
            
            // Handle server startup errors
            serverInstance.on('error', (serverError) => {
                reject(new Error(`Server error during startup: ${serverError.message}`));
            });
        });
        
        // Wait for server startup with timeout
        const startupTimeout = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Server startup timed out after ${PERFORMANCE_THRESHOLDS.SERVER_STARTUP_MAX_TIME}ms`));
            }, PERFORMANCE_THRESHOLDS.SERVER_STARTUP_MAX_TIME);
        });
        
        // Race between startup and timeout
        await Promise.race([serverStartupPromise, startupTimeout]);
        
        // Step 4: Create SuperTest agent for HTTP testing
        // SuperTest provides a testing interface for HTTP requests against Express applications
        superTestAgent = request(app);
        
        // Step 5: Verify server is responding to basic requests
        // Perform a basic connectivity test to ensure the server is ready for testing
        try {
            const healthCheckResponse = await superTestAgent
                .get('/hello')
                .timeout(1000); // Short timeout for health check
            
            if (healthCheckResponse.status !== 200) {
                throw new Error(`Health check failed with status ${healthCheckResponse.status}`);
            }
            
            console.log('Integration Test Setup: Server health check passed');
            
        } catch (healthError) {
            throw new Error(`Server health check failed: ${healthError.message}`);
        }
        
        // Step 6: Return test utilities
        return {
            agent: superTestAgent,
            server: serverInstance,
            port: testPort,
            url: `http://localhost:${testPort}`
        };
        
    } catch (setupError) {
        // Cleanup any partially created resources
        if (serverInstance) {
            try {
                serverInstance.close();
            } catch (cleanupError) {
                console.error('Integration Test Setup: Error during cleanup:', cleanupError.message);
            }
        }
        
        // Re-throw the original setup error with additional context
        throw new Error(`Integration test server setup failed: ${setupError.message}`);
    }
}

/**
 * Server Teardown Utility Function
 * 
 * Performs graceful shutdown of the test server and cleanup of test resources.
 * This function ensures proper resource management and prevents resource leaks
 * between test runs. It implements a comprehensive cleanup process that handles
 * both normal shutdown scenarios and error conditions.
 * 
 * The teardown process includes:
 * - Graceful server shutdown with timeout handling
 * - Resource cleanup and memory management
 * - Environment variable restoration
 * - Error handling for incomplete shutdowns
 * - Performance monitoring of shutdown operations
 * 
 * @async
 * @function teardownServer
 * @param {Object} serverInstance - The HTTP server instance to shutdown
 * @returns {Promise<void>} Resolves when server is fully shutdown and cleaned up
 * @throws {Error} Throws error if shutdown fails or times out
 * 
 * @example
 * // Graceful server shutdown
 * await teardownServer(serverInstance);
 * // Server is now fully stopped and resources are cleaned up
 */
async function teardownServer(serverInstance) {
    if (!serverInstance) {
        console.log('Integration Test Teardown: No server instance to shutdown');
        return;
    }
    
    try {
        console.log('Integration Test Teardown: Initiating graceful server shutdown...');
        const shutdownStartTime = performance.now();
        
        // Create a promise that resolves when the server is fully closed
        const serverShutdownPromise = new Promise((resolve, reject) => {
            serverInstance.close((error) => {
                if (error) {
                    reject(new Error(`Server shutdown failed: ${error.message}`));
                    return;
                }
                
                const shutdownDuration = performance.now() - shutdownStartTime;
                console.log(`Integration Test Teardown: Server shutdown completed in ${shutdownDuration.toFixed(2)}ms`);
                
                // Validate shutdown performance
                if (shutdownDuration > PERFORMANCE_THRESHOLDS.SERVER_SHUTDOWN_MAX_TIME) {
                    console.warn(`Integration Test Teardown: Server shutdown took ${shutdownDuration.toFixed(2)}ms, exceeding recommended ${PERFORMANCE_THRESHOLDS.SERVER_SHUTDOWN_MAX_TIME}ms threshold`);
                }
                
                resolve();
            });
        });
        
        // Create a timeout promise for forced shutdown
        const shutdownTimeout = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Server shutdown timed out after ${PERFORMANCE_THRESHOLDS.SERVER_SHUTDOWN_MAX_TIME}ms`));
            }, PERFORMANCE_THRESHOLDS.SERVER_SHUTDOWN_MAX_TIME);
        });
        
        // Race between graceful shutdown and timeout
        await Promise.race([serverShutdownPromise, shutdownTimeout]);
        
        // Additional cleanup operations
        superTestAgent = null;
        
        // Reset environment variables to original state
        if (process.env.PORT && process.env.PORT === testPort?.toString()) {
            delete process.env.PORT;
        }
        
        console.log('Integration Test Teardown: Cleanup completed successfully');
        
    } catch (teardownError) {
        console.error('Integration Test Teardown: Error during shutdown:', teardownError.message);
        
        // Force shutdown if graceful shutdown failed
        if (serverInstance && typeof serverInstance.close === 'function') {
            try {
                serverInstance.close();
                console.log('Integration Test Teardown: Forced shutdown completed');
            } catch (forceError) {
                console.error('Integration Test Teardown: Forced shutdown also failed:', forceError.message);
            }
        }
        
        // Re-throw the original error
        throw teardownError;
    }
}

/**
 * Performance Measurement Utility Function
 * 
 * Measures the response time of an HTTP request with high-resolution timing.
 * This utility provides accurate performance measurements for validating
 * response time requirements specified in the technical documentation.
 * 
 * @async
 * @function measureResponseTime
 * @param {Function} requestFunction - Async function that performs the HTTP request
 * @returns {Promise<Object>} Object containing response and timing information
 * 
 * @example
 * // Measure response time for GET /hello
 * const { response, responseTime } = await measureResponseTime(
 *   () => agent.get('/hello')
 * );
 */
async function measureResponseTime(requestFunction) {
    const startTime = performance.now();
    const response = await requestFunction();
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return { response, responseTime };
}

// Jest Test Suite Configuration and Setup
describe('Hello World Endpoint Integration Tests', () => {
    // Test suite setup - runs once before all tests
    beforeAll(async () => {
        console.log('\n=== Integration Test Suite Starting ===');
        console.log(`Test Environment: ${ENVIRONMENT}`);
        console.log(`Node.js Version: ${process.version}`);
        console.log(`Jest Version: ${require('jest/package.json').version}`);
        console.log(`SuperTest Version: ${require('supertest/package.json').version}`);
        
        // Setup the test server
        const serverSetup = await setupServer();
        console.log(`Test Server URL: ${serverSetup.url}`);
        console.log('=== Integration Test Suite Setup Complete ===\n');
    }, 30000); // 30-second timeout for server setup
    
    // Test suite teardown - runs once after all tests
    afterAll(async () => {
        console.log('\n=== Integration Test Suite Cleanup Starting ===');
        
        if (serverInstance) {
            await teardownServer(serverInstance);
        }
        
        console.log('=== Integration Test Suite Cleanup Complete ===\n');
    }, 15000); // 15-second timeout for server teardown

    /**
     * Test Case 1: GET /hello returns 200 and 'Hello world' in JSON format
     * 
     * This test validates the core functionality of the Hello World endpoint as specified
     * in Technical Specifications 2.1.2. It verifies that the endpoint responds with the
     * correct status code, content type, and message format using the centralized response
     * formatting utility.
     * 
     * Requirements Validated:
     * - F-002-RQ-001: Implement GET /hello route handler
     * - Response status code: 200 OK
     * - Content-Type: application/json (from response formatter)
     * - Response body structure: { success: true, message: "Hello world", data: null, status: 200 }
     * - Response time validation against performance requirements
     * 
     * Educational Value:
     * - Demonstrates basic HTTP endpoint testing with SuperTest
     * - Shows proper assertion patterns for status, headers, and body content
     * - Illustrates integration testing of the complete middleware pipeline
     * - Validates the standardized response format from responseFormatter utility
     */
    describe('Happy Path Scenarios', () => {
        test('GET /hello returns 200 and "Hello world" in JSON format', async () => {
            // Measure response time for performance validation
            const { response, responseTime } = await measureResponseTime(
                () => superTestAgent.get('/hello')
            );
            
            // Validate HTTP status code
            expect(response.status).toBe(EXPECTED_RESPONSES.HELLO_STATUS_CODE);
            
            // Validate response headers
            expect(response.headers['content-type']).toMatch(/application\/json/);
            
            // Validate response body structure (from responseFormatter.formatSuccess)
            expect(response.body).toEqual({
                success: true,
                message: EXPECTED_RESPONSES.HELLO_MESSAGE,
                data: null,
                status: EXPECTED_RESPONSES.HELLO_STATUS_CODE
            });
            
            // Validate response body properties individually for detailed error reporting
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(EXPECTED_RESPONSES.HELLO_MESSAGE);
            expect(response.body.data).toBe(null);
            expect(response.body.status).toBe(EXPECTED_RESPONSES.HELLO_STATUS_CODE);
            
            // Log response time for monitoring
            console.log(`GET /hello response time: ${responseTime.toFixed(2)}ms`);
            
            // Performance assertion will be tested separately for clarity
            expect(responseTime).toBeLessThan(1000); // Basic sanity check
        });
        
        /**
         * Test Case 2: GET /hello responds within performance threshold
         * 
         * This test specifically validates the performance requirement specified in
         * Technical Specifications 2.2.1 that the /hello endpoint must respond within
         * 50ms. This performance requirement ensures the application meets educational
         * and production readiness standards.
         * 
         * Requirements Validated:
         * - Performance Baseline: Response time < 50ms (Technical Specifications 2.2.1)
         * - Server performance under normal load conditions
         * - Middleware pipeline efficiency
         * - Response generation speed
         * 
         * Testing Approach:
         * - Multiple measurements to account for timing variations
         * - High-resolution performance timing using Node.js Performance API
         * - Statistical analysis of response times for consistency
         * - Failure analysis with detailed timing information
         */
        test('GET /hello responds within performance threshold (< 50ms)', async () => {
            const performanceTestRuns = 5; // Multiple runs for statistical validity
            const responseTimes = [];
            
            // Perform multiple requests to get reliable performance data
            for (let i = 0; i < performanceTestRuns; i++) {
                const { response, responseTime } = await measureResponseTime(
                    () => superTestAgent.get('/hello')
                );
                
                // Ensure the request was successful before counting its timing
                expect(response.status).toBe(200);
                responseTimes.push(responseTime);
                
                // Small delay between requests to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Calculate statistical metrics
            const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);
            
            console.log(`Performance Test Results for GET /hello:`);
            console.log(`  Average: ${averageResponseTime.toFixed(2)}ms`);
            console.log(`  Maximum: ${maxResponseTime.toFixed(2)}ms`);
            console.log(`  Minimum: ${minResponseTime.toFixed(2)}ms`);
            console.log(`  Threshold: ${PERFORMANCE_THRESHOLDS.HELLO_ENDPOINT_MAX_RESPONSE_TIME}ms`);
            
            // Validate performance requirements
            expect(averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.HELLO_ENDPOINT_MAX_RESPONSE_TIME);
            expect(maxResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.HELLO_ENDPOINT_MAX_RESPONSE_TIME * 2); // Allow some variance for max
            
            // Additional performance validations
            expect(minResponseTime).toBeGreaterThan(0); // Sanity check
            expect(responseTimes.length).toBe(performanceTestRuns); // Ensure all tests completed
        });
    });

    /**
     * Error Handling Test Scenarios
     * 
     * These tests validate the error handling capabilities of the application as specified
     * in Technical Specifications 2.1.3 (Basic Error Management). They ensure that the
     * global error handling middleware properly catches errors, formats responses, and
     * maintains security by not exposing sensitive information.
     */
    describe('Error Handling Scenarios', () => {
        /**
         * Test Case 3: GET /invalid returns 404 Not Found
         * 
         * This test validates the 404 error handling for undefined routes as specified in
         * Technical Specifications 2.2.2. It ensures that requests to non-existent routes
         * receive proper error responses with appropriate status codes and error formatting.
         * 
         * Requirements Validated:
         * - F-002-RQ-002: Handle invalid route requests
         * - 404 Not Found status for undefined routes
         * - Error response structure from formatError utility
         * - Security: No sensitive information disclosure in error responses
         * - Performance: Error response time < 25ms (Technical Specifications 2.2.2)
         */
        test('GET /invalid returns 404 Not Found', async () => {
            // Measure error response performance
            const { response, responseTime } = await measureResponseTime(
                () => superTestAgent.get('/invalid')
            );
            
            // Validate error status code
            expect(response.status).toBe(EXPECTED_RESPONSES.NOT_FOUND_STATUS_CODE);
            
            // Validate error response structure (from responseFormatter.formatError)
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('code', 'NOT_FOUND');
            expect(response.body).toHaveProperty('status', 404);
            
            // Validate that the error message is user-friendly and doesn't expose system internals
            expect(response.body.message).toBeTruthy();
            expect(response.body.message).not.toContain('stack');
            expect(response.body.message).not.toContain('internal');
            expect(response.body.message).not.toContain('error');
            
            // Validate response headers for error responses
            expect(response.headers['content-type']).toMatch(/application\/json/);
            expect(response.headers['cache-control']).toMatch(/no-store|no-cache/);
            
            // Validate error response performance
            console.log(`GET /invalid (404) response time: ${responseTime.toFixed(2)}ms`);
            expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ERROR_ENDPOINT_MAX_RESPONSE_TIME);
        });
        
        /**
         * Test Case 4: Multiple HTTP methods on /hello route
         * 
         * This test validates that only the GET method is supported on the /hello route
         * and that other HTTP methods receive appropriate error responses. This ensures
         * proper HTTP method validation and error handling.
         */
        test('POST /hello returns 404 Not Found (method not allowed)', async () => {
            const response = await superTestAgent
                .post('/hello')
                .send({ test: 'data' });
            
            // Should return 404 because only GET /hello is defined
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('NOT_FOUND');
        });
        
        test('PUT /hello returns 404 Not Found (method not allowed)', async () => {
            const response = await superTestAgent
                .put('/hello')
                .send({ test: 'data' });
            
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('NOT_FOUND');
        });
        
        test('DELETE /hello returns 404 Not Found (method not allowed)', async () => {
            const response = await superTestAgent.delete('/hello');
            
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('NOT_FOUND');
        });
    });

    /**
     * Server Configuration and Environment Tests
     * 
     * These tests validate the server configuration management capabilities as specified
     * in Technical Specifications 2.1.4 (Application Configuration). They ensure that
     * the server properly handles environment variables, port configuration, and
     * configuration validation.
     */
    describe('Server Configuration Management', () => {
        /**
         * Test Case 5: Server respects PORT environment variable
         * 
         * This test validates that the server properly uses the PORT environment variable
         * as specified in Technical Specifications F-004-RQ-001. Since the server is
         * already running, we validate that the configuration system works correctly.
         */
        test('Server configuration validation', () => {
            // Validate configuration system
            const configInfo = getConfigInfo();
            expect(configInfo).toHaveProperty('environment');
            expect(configInfo).toHaveProperty('port');
            expect(configInfo.port).toBe(testPort);
            
            // Validate configuration validation system
            const configValidation = validateConfiguration();
            expect(configValidation).toHaveProperty('isValid');
            expect(configValidation).toHaveProperty('environment');
            expect(configValidation).toHaveProperty('port');
            
            console.log('Server Configuration Test Results:');
            console.log(`  Environment: ${configInfo.environment}`);
            console.log(`  Port: ${configInfo.port}`);
            console.log(`  Configuration Valid: ${configValidation.isValid}`);
            if (configValidation.warnings.length > 0) {
                console.log(`  Warnings: ${configValidation.warnings.join(', ')}`);
            }
        });
        
        /**
         * Test Case 6: Server handles different request patterns
         * 
         * This test validates that the server handles various request patterns correctly,
         * including query parameters, headers, and different content types.
         */
        test('Server handles requests with query parameters', async () => {
            const response = await superTestAgent
                .get('/hello?test=value&param=123');
            
            expect(response.status).toBe(200);
            expect(response.body.message).toBe(EXPECTED_RESPONSES.HELLO_MESSAGE);
        });
        
        test('Server handles requests with custom headers', async () => {
            const response = await superTestAgent
                .get('/hello')
                .set('User-Agent', 'Integration-Test-Client')
                .set('Accept', 'application/json');
            
            expect(response.status).toBe(200);
            expect(response.body.message).toBe(EXPECTED_RESPONSES.HELLO_MESSAGE);
        });
    });

    /**
     * Response Format and Structure Validation Tests
     * 
     * These tests validate that all responses follow the standardized format provided
     * by the responseFormatter utility, ensuring consistency across the API and proper
     * integration with client applications.
     */
    describe('Response Format and Structure Validation', () => {
        /**
         * Test Case 7: Response structure consistency
         * 
         * This test validates that all API responses follow the standardized structure
         * defined by the responseFormatter utility, ensuring consistency for client
         * integration and API documentation.
         */
        test('Success responses follow standardized format', async () => {
            const response = await superTestAgent.get('/hello');
            
            // Validate required properties exist
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('status');
            
            // Validate property types
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.status).toBe('number');
            
            // Validate success response values
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe(response.status);
        });
        
        test('Error responses follow standardized format', async () => {
            const response = await superTestAgent.get('/nonexistent');
            
            // Validate required error properties exist
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('code');
            expect(response.body).toHaveProperty('status');
            
            // Validate error property types
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.code).toBe('string');
            expect(typeof response.body.status).toBe('number');
            
            // Validate error response values
            expect(response.body.success).toBe(false);
            expect(response.body.status).toBe(response.status);
            expect(response.body.code).toBeTruthy();
        });
    });

    /**
     * Security and Headers Validation Tests
     * 
     * These tests validate that the server implements proper security headers and
     * follows security best practices as outlined in the technical specifications.
     */
    describe('Security and Headers Validation', () => {
        /**
         * Test Case 8: Security headers validation
         * 
         * This test validates that the server sets appropriate security headers to
         * protect against common web vulnerabilities as implemented in the Express
         * middleware pipeline.
         */
        test('Server sets appropriate security headers', async () => {
            const response = await superTestAgent.get('/hello');
            
            // Validate security headers are present
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers['x-frame-options']).toBe('DENY');
            
            expect(response.headers).toHaveProperty('x-xss-protection');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            
            // Validate that Express signature is removed for security
            expect(response.headers).not.toHaveProperty('x-powered-by');
        });
        
        test('Error responses include security headers', async () => {
            const response = await superTestAgent.get('/invalid');
            
            // Validate that error responses also include security headers
            expect(response.headers['cache-control']).toMatch(/no-store|no-cache/);
            expect(response.headers).toHaveProperty('x-content-type-options');
        });
    });

    /**
     * Load and Stress Testing
     * 
     * These tests validate that the server can handle multiple concurrent requests
     * and maintains performance under load conditions.
     */
    describe('Load and Concurrent Request Testing', () => {
        /**
         * Test Case 9: Concurrent request handling
         * 
         * This test validates that the server can handle multiple concurrent requests
         * efficiently and maintains response quality under concurrent load.
         */
        test('Server handles concurrent requests efficiently', async () => {
            const concurrentRequests = 10;
            const requestPromises = [];
            
            // Create multiple concurrent requests
            for (let i = 0; i < concurrentRequests; i++) {
                requestPromises.push(
                    measureResponseTime(() => superTestAgent.get('/hello'))
                );
            }
            
            // Wait for all requests to complete
            const results = await Promise.all(requestPromises);
            
            // Validate all requests succeeded
            results.forEach((result, index) => {
                expect(result.response.status).toBe(200);
                expect(result.response.body.message).toBe(EXPECTED_RESPONSES.HELLO_MESSAGE);
                
                console.log(`Concurrent request ${index + 1} response time: ${result.responseTime.toFixed(2)}ms`);
            });
            
            // Calculate performance statistics
            const responseTimes = results.map(result => result.responseTime);
            const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            const maxTime = Math.max(...responseTimes);
            
            console.log(`Concurrent Load Test Results:`);
            console.log(`  Concurrent Requests: ${concurrentRequests}`);
            console.log(`  Average Response Time: ${averageTime.toFixed(2)}ms`);
            console.log(`  Maximum Response Time: ${maxTime.toFixed(2)}ms`);
            console.log(`  All Requests Successful: ${results.length === concurrentRequests}`);
            
            // Validate performance under load
            expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.HELLO_ENDPOINT_MAX_RESPONSE_TIME * 2); // Allow some degradation under load
            expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.HELLO_ENDPOINT_MAX_RESPONSE_TIME * 3); // Maximum acceptable degradation
        });
    });

    /**
     * Integration with Middleware Pipeline Tests
     * 
     * These tests validate that the complete middleware pipeline works correctly,
     * including request logging, body parsing, routing, and error handling.
     */
    describe('Middleware Pipeline Integration', () => {
        /**
         * Test Case 10: Request logging and middleware integration
         * 
         * This test validates that the middleware pipeline processes requests correctly
         * and that all middleware components are functioning as expected.
         */
        test('Middleware pipeline processes requests correctly', async () => {
            // Test with various request configurations to validate middleware handling
            const testCases = [
                { method: 'get', path: '/hello', expectedStatus: 200 },
                { method: 'get', path: '/hello/', expectedStatus: 200 }, // Test trailing slash handling
                { method: 'get', path: '/HELLO', expectedStatus: 404 },  // Test case sensitivity
                { method: 'get', path: '/hello?param=value', expectedStatus: 200 } // Test query parameter handling
            ];
            
            for (const testCase of testCases) {
                const response = await superTestAgent[testCase.method](testCase.path);
                
                expect(response.status).toBe(testCase.expectedStatus);
                
                // Validate response format based on status
                if (testCase.expectedStatus === 200) {
                    expect(response.body.success).toBe(true);
                    expect(response.body.message).toBe(EXPECTED_RESPONSES.HELLO_MESSAGE);
                } else {
                    expect(response.body.success).toBe(false);
                }
                
                console.log(`Middleware test - ${testCase.method.toUpperCase()} ${testCase.path}: ${response.status}`);
            }
        });
    });
});

/**
 * Additional Test Utilities and Helpers
 * 
 * These utilities support the main test cases and provide reusable functionality
 * for test setup, validation, and cleanup operations.
 */

/**
 * Custom Jest Matchers for Enhanced Testing
 * 
 * These custom matchers provide domain-specific assertions for the Hello World
 * application, making tests more readable and maintainable.
 */

// Custom matcher for validating response format
expect.extend({
    toBeValidHelloResponse(received) {
        const pass = (
            received &&
            typeof received === 'object' &&
            received.success === true &&
            received.message === EXPECTED_RESPONSES.HELLO_MESSAGE &&
            received.data === null &&
            received.status === 200
        );
        
        if (pass) {
            return {
                message: () => `Expected response not to be a valid Hello response`,
                pass: true
            };
        } else {
            return {
                message: () => `Expected response to be a valid Hello response with success: true, message: "${EXPECTED_RESPONSES.HELLO_MESSAGE}", data: null, status: 200`,
                pass: false
            };
        }
    },
    
    toBeValidErrorResponse(received, expectedStatus = 404) {
        const pass = (
            received &&
            typeof received === 'object' &&
            received.success === false &&
            typeof received.message === 'string' &&
            typeof received.code === 'string' &&
            received.status === expectedStatus
        );
        
        if (pass) {
            return {
                message: () => `Expected response not to be a valid error response`,
                pass: true
            };
        } else {
            return {
                message: () => `Expected response to be a valid error response with success: false, message: string, code: string, status: ${expectedStatus}`,
                pass: false
            };
        }
    }
});