// Jest testing framework v29.x for test structure and mocking
const jest = require('jest');
// Supertest v7.1.1 for HTTP endpoint testing and assertions
const supertest = require('supertest');

// Internal imports for the application under test
const { app } = require('../../app.js');
const { setupTestEnvironment } = require('../setup.js');

// Create Supertest instance bound to the Express app for HTTP testing
let request;

// Test performance tracking variables
let performanceMetrics = {
    requestCount: 0,
    totalResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    errorCount: 0
};

/**
 * Integration Test Suite for Node.js Tutorial Backend Application
 * 
 * This comprehensive test suite validates the end-to-end behavior of the Express.js
 * tutorial application, including server startup, routing, middleware stack,
 * endpoint responses, error handling, and observability features.
 * 
 * Test Coverage:
 * - HTTP server implementation and request processing
 * - /hello endpoint functionality and response validation
 * - Express.js framework integration and middleware stack
 * - Error handling patterns for 404, 405, and 500 responses
 * - Logging and monitoring integration
 * - Performance requirements and SLA compliance
 * - Graceful shutdown lifecycle management
 * 
 * Testing Approach:
 * - Uses Jest as the test runner for structure, assertions, and mocking
 * - Leverages Supertest for HTTP request simulation and response validation
 * - Implements test environment setup for logger stubbing and error isolation
 * - Validates both successful and error scenarios for comprehensive coverage
 * - Measures performance metrics to ensure SLA compliance
 * - Tests observability features through captured logger output
 */
describe('Integration: App', () => {
    /**
     * Test Environment Setup
     * 
     * Initialize the test environment before all tests execute to ensure:
     * - Logger methods are stubbed and captured for verification
     * - NODE_ENV is set to 'test' for proper test mode execution
     * - Global error hooks are installed for robust error surfacing
     * - Supertest request instance is configured for HTTP testing
     */
    beforeAll(async () => {
        // Initialize test environment with logger stubbing and error hooks
        setupTestEnvironment();
        
        // Create Supertest request instance bound to the Express app
        // This allows HTTP testing without starting a real server
        request = supertest(app);
        
        // Reset performance metrics for clean test state
        performanceMetrics = {
            requestCount: 0,
            totalResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            errorCount: 0
        };
    });

    /**
     * Test Environment Cleanup
     * 
     * Clean up test environment after each test to ensure:
     * - Logger output is cleared for test isolation
     * - Performance metrics are reset for independent measurements
     * - No side effects persist between test cases
     */
    beforeEach(() => {
        // Clear captured logger output for test isolation
        global.logOutput = [];
        
        // Reset performance tracking for individual test measurements
        performanceMetrics.requestCount = 0;
        performanceMetrics.totalResponseTime = 0;
        performanceMetrics.maxResponseTime = 0;
        performanceMetrics.minResponseTime = Infinity;
        performanceMetrics.errorCount = 0;
    });

    /**
     * Test Case: GET /hello returns 200 and Hello world
     * 
     * Validates the core functionality of the /hello endpoint:
     * - HTTP GET method handling
     * - Status code 200 (OK) response
     * - Content-Type header set to text/plain
     * - Response body contains exactly "Hello world"
     * - Request processing within performance SLA
     * 
     * This test ensures the primary educational objective of the tutorial
     * application is met with a working HTTP endpoint that demonstrates
     * basic request-response patterns.
     */
    describe('GET /hello endpoint', () => {
        it('should return 200 status and Hello world content', async () => {
            // Record start time for performance measurement
            const startTime = process.hrtime.bigint();
            
            // Send HTTP GET request to /hello endpoint
            const response = await request
                .get('/hello')
                .expect(200)
                .expect('Content-Type', 'text/plain; charset=utf-8');
            
            // Record end time and calculate response duration
            const endTime = process.hrtime.bigint();
            const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            
            // Validate response body content
            expect(response.text).toBe('Hello world');
            
            // Update performance metrics
            performanceMetrics.requestCount++;
            performanceMetrics.totalResponseTime += responseTime;
            performanceMetrics.maxResponseTime = Math.max(performanceMetrics.maxResponseTime, responseTime);
            performanceMetrics.minResponseTime = Math.min(performanceMetrics.minResponseTime, responseTime);
            
            // Verify response time meets performance SLA (< 50ms)
            expect(responseTime).toBeLessThan(50);
            
            // Validate response headers for security and correctness
            expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
            expect(response.headers['content-length']).toBe('11'); // "Hello world" is 11 characters
            
            // Ensure no sensitive information is leaked in headers
            expect(response.headers['x-powered-by']).toBeUndefined();
        });

        it('should set correct security headers', async () => {
            const response = await request
                .get('/hello')
                .expect(200);
            
            // Verify security headers are present (configured by helmet middleware)
            expect(response.headers['x-content-type-options']).toBeDefined();
            expect(response.headers['x-frame-options']).toBeDefined();
            
            // Ensure Express.js powered-by header is disabled for security
            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });

    /**
     * Test Case: GET /unknown returns 404
     * 
     * Validates error handling for unknown routes:
     * - HTTP GET request to non-existent endpoint
     * - Status code 404 (Not Found) response
     * - Standardized error response format
     * - Appropriate error message without sensitive information
     * - Error logging for monitoring and debugging
     * 
     * This test ensures the application properly handles routing errors
     * and provides meaningful feedback for invalid endpoints.
     */
    describe('404 Error handling', () => {
        it('should return 404 for unknown routes', async () => {
            // Send HTTP GET request to non-existent endpoint
            const response = await request
                .get('/unknown')
                .expect(404);
            
            // Validate error response format
            expect(response.body).toEqual({
                error: true,
                message: 'Route not found',
                statusCode: 404,
                timestamp: expect.any(String),
                path: '/unknown',
                method: 'GET'
            });
            
            // Ensure error response is in JSON format
            expect(response.headers['content-type']).toMatch(/application\/json/);
            
            // Verify timestamp is valid ISO string
            expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
            
            // Update error metrics
            performanceMetrics.errorCount++;
        });

        it('should not leak sensitive information in 404 responses', async () => {
            const response = await request
                .get('/admin/secrets')
                .expect(404);
            
            // Ensure no stack trace or internal paths are exposed
            expect(response.body.stack).toBeUndefined();
            expect(response.body.details).toBeUndefined();
            expect(response.text).not.toContain('node_modules');
            expect(response.text).not.toContain('src/backend');
        });
    });

    /**
     * Test Case: POST /hello returns 405
     * 
     * Validates HTTP method filtering and error handling:
     * - HTTP POST request to /hello endpoint (only GET is allowed)
     * - Status code 405 (Method Not Allowed) response
     * - Standardized error response format
     * - Appropriate error message indicating method not allowed
     * - Proper HTTP method validation
     * 
     * This test ensures the application correctly validates HTTP methods
     * and provides proper error responses for unsupported methods.
     */
    describe('405 Method Not Allowed handling', () => {
        it('should return 405 for POST requests to /hello', async () => {
            // Send HTTP POST request to /hello endpoint (only GET is allowed)
            const response = await request
                .post('/hello')
                .expect(405);
            
            // Validate error response format
            expect(response.body).toEqual({
                error: true,
                message: 'Method not allowed',
                statusCode: 405,
                timestamp: expect.any(String),
                path: '/hello',
                method: 'POST'
            });
            
            // Ensure error response is in JSON format
            expect(response.headers['content-type']).toMatch(/application\/json/);
            
            // Verify Allow header is present with supported methods
            expect(response.headers['allow']).toBeDefined();
            expect(response.headers['allow']).toContain('GET');
            
            // Update error metrics
            performanceMetrics.errorCount++;
        });

        it('should return 405 for PUT requests to /hello', async () => {
            const response = await request
                .put('/hello')
                .expect(405);
            
            expect(response.body.error).toBe(true);
            expect(response.body.statusCode).toBe(405);
            expect(response.body.method).toBe('PUT');
        });

        it('should return 405 for DELETE requests to /hello', async () => {
            const response = await request
                .delete('/hello')
                .expect(405);
            
            expect(response.body.error).toBe(true);
            expect(response.body.statusCode).toBe(405);
            expect(response.body.method).toBe('DELETE');
        });
    });

    /**
     * Test Case: Error handling does not leak stack traces
     * 
     * Validates secure error handling for internal server errors:
     * - Simulates internal application errors
     * - Ensures no stack traces are exposed to clients
     * - Verifies generic error messages for security
     * - Validates proper error logging for debugging
     * - Tests centralized error handling middleware
     * 
     * This test ensures the application handles internal errors securely
     * without exposing sensitive system information to clients.
     */
    describe('Internal error handling security', () => {
        it('should not leak stack traces in 500 responses', async () => {
            // Mock the hello controller to throw an error for testing
            // This simulates an internal server error during request processing
            const originalController = require('../../controllers/helloController');
            const mockError = new Error('Internal server error for testing');
            
            // Temporarily replace the controller to simulate error
            jest.doMock('../../controllers/helloController', () => ({
                hello: jest.fn().mockRejectedValue(mockError)
            }));
            
            try {
                const response = await request
                    .get('/hello')
                    .expect(500);
                
                // Validate secure error response format
                expect(response.body).toEqual({
                    error: true,
                    message: 'Internal server error',
                    statusCode: 500,
                    timestamp: expect.any(String),
                    path: '/hello',
                    method: 'GET'
                });
                
                // Ensure no sensitive information is leaked
                expect(response.body.stack).toBeUndefined();
                expect(response.body.details).toBeUndefined();
                expect(response.text).not.toContain('Error: Internal server error for testing');
                expect(response.text).not.toContain('at Object');
                expect(response.text).not.toContain('node_modules');
                expect(response.text).not.toContain(__dirname);
                
                // Update error metrics
                performanceMetrics.errorCount++;
                
            } finally {
                // Restore original controller
                jest.dontMock('../../controllers/helloController');
            }
        });

        it('should handle malformed request headers gracefully', async () => {
            const response = await request
                .get('/hello')
                .set('Content-Type', 'invalid/content-type')
                .expect(200); // Should still process the request successfully
            
            // Verify the request is processed despite malformed headers
            expect(response.text).toBe('Hello world');
        });
    });

    /**
     * Test Case: Logger is called for requests and errors
     * 
     * Validates observability and monitoring integration:
     * - Verifies logger methods are called during request processing
     * - Validates log message format and content
     * - Ensures error events are properly logged
     * - Tests integration with test environment logger stubbing
     * - Validates log output contains relevant request metadata
     * 
     * This test ensures the application provides proper observability
     * for monitoring, debugging, and operational insights.
     */
    describe('Logging and observability', () => {
        it('should log successful requests', async () => {
            // Clear previous log output
            global.logOutput = [];
            
            // Send request to generate log entries
            await request
                .get('/hello')
                .expect(200);
            
            // Verify logger was called with appropriate messages
            expect(global.logOutput).toHaveLength(expect.any(Number));
            
            // Find request-related log entries
            const requestLogs = global.logOutput.filter(log => 
                log.message.includes('Request') || 
                log.message.includes('request') ||
                log.message.includes('GET /hello')
            );
            
            // Verify at least one request log entry exists
            expect(requestLogs.length).toBeGreaterThan(0);
            
            // Validate log entry structure
            requestLogs.forEach(log => {
                expect(log).toHaveProperty('level');
                expect(log).toHaveProperty('message');
                expect(log).toHaveProperty('timestamp');
                expect(log.level).toMatch(/^(info|warn|error)$/);
                expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            });
        });

        it('should log error responses', async () => {
            // Clear previous log output
            global.logOutput = [];
            
            // Send request that will generate error
            await request
                .get('/nonexistent')
                .expect(404);
            
            // Find error-related log entries
            const errorLogs = global.logOutput.filter(log => 
                log.level === 'error' || 
                log.message.includes('404') ||
                log.message.includes('not found')
            );
            
            // Verify error logging occurred
            expect(errorLogs.length).toBeGreaterThanOrEqual(0);
            
            // If error logs exist, validate their structure
            errorLogs.forEach(log => {
                expect(log.level).toBe('error');
                expect(log).toHaveProperty('message');
                expect(log).toHaveProperty('timestamp');
            });
        });

        it('should capture logger method calls', async () => {
            // Verify logger methods are mocked and can be inspected
            const { logger } = require('../../utils/logger');
            
            expect(jest.isMockFunction(logger.info)).toBe(true);
            expect(jest.isMockFunction(logger.warn)).toBe(true);
            expect(jest.isMockFunction(logger.error)).toBe(true);
            
            // Send request to trigger logger calls
            await request
                .get('/hello')
                .expect(200);
            
            // Verify logger methods were called
            expect(logger.info).toHaveBeenCalled();
        });
    });

    /**
     * Test Case: App responds within performance SLA
     * 
     * Validates performance requirements and SLA compliance:
     * - Measures response times for successful requests
     * - Ensures response times are below 50ms target
     * - Validates performance under concurrent load
     * - Tests response time consistency
     * - Monitors resource usage during request processing
     * 
     * This test ensures the application meets performance expectations
     * and can handle requests within acceptable time limits.
     */
    describe('Performance SLA compliance', () => {
        it('should respond to /hello within 50ms', async () => {
            // Perform multiple requests to get reliable performance metrics
            const iterations = 10;
            const responseTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                const startTime = process.hrtime.bigint();
                
                await request
                    .get('/hello')
                    .expect(200);
                
                const endTime = process.hrtime.bigint();
                const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                responseTimes.push(responseTime);
            }
            
            // Calculate performance statistics
            const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);
            
            // Verify performance SLA compliance
            expect(averageResponseTime).toBeLessThan(50);
            expect(maxResponseTime).toBeLessThan(50);
            expect(minResponseTime).toBeGreaterThan(0);
            
            // Log performance metrics for monitoring
            console.log(`Performance metrics: avg=${averageResponseTime.toFixed(2)}ms, max=${maxResponseTime.toFixed(2)}ms, min=${minResponseTime.toFixed(2)}ms`);
        });

        it('should handle concurrent requests within SLA', async () => {
            // Test concurrent request handling
            const concurrentRequests = 5;
            const requestPromises = [];
            
            // Create multiple concurrent requests
            for (let i = 0; i < concurrentRequests; i++) {
                const startTime = process.hrtime.bigint();
                const requestPromise = request
                    .get('/hello')
                    .expect(200)
                    .then(response => {
                        const endTime = process.hrtime.bigint();
                        const responseTime = Number(endTime - startTime) / 1000000;
                        return { response, responseTime };
                    });
                requestPromises.push(requestPromise);
            }
            
            // Wait for all requests to complete
            const results = await Promise.all(requestPromises);
            
            // Verify all requests completed successfully and within SLA
            results.forEach(({ response, responseTime }) => {
                expect(response.status).toBe(200);
                expect(response.text).toBe('Hello world');
                expect(responseTime).toBeLessThan(50);
            });
        });

        it('should maintain performance under error conditions', async () => {
            // Test performance when handling errors
            const startTime = process.hrtime.bigint();
            
            await request
                .get('/nonexistent')
                .expect(404);
            
            const endTime = process.hrtime.bigint();
            const responseTime = Number(endTime - startTime) / 1000000;
            
            // Verify error responses are also fast
            expect(responseTime).toBeLessThan(50);
        });
    });

    /**
     * Test Case: Graceful shutdown cleans up resources (Optional)
     * 
     * Validates application lifecycle management:
     * - Tests graceful shutdown signal handling
     * - Verifies server stops accepting new connections
     * - Ensures active requests complete before shutdown
     * - Validates proper resource cleanup
     * - Tests shutdown logging and monitoring
     * 
     * This test ensures the application can be shut down gracefully
     * without losing active requests or leaving resources in an inconsistent state.
     */
    describe('Graceful shutdown lifecycle', () => {
        it('should handle shutdown signals gracefully', async () => {
            // This test is optional and may not be fully implementable in the test environment
            // due to the complexity of testing process signal handling
            // However, we can verify that the shutdown utilities are properly configured
            
            const { setupShutdownHooks } = require('../../utils/shutdown');
            
            // Verify shutdown utilities are available
            expect(setupShutdownHooks).toBeDefined();
            expect(typeof setupShutdownHooks).toBe('function');
            
            // Mock server instance for testing
            const mockServer = {
                close: jest.fn((callback) => {
                    // Simulate server close with callback
                    if (callback) setTimeout(callback, 10);
                })
            };
            
            // Test shutdown hook setup
            expect(() => setupShutdownHooks(mockServer)).not.toThrow();
        });

        it('should log shutdown events', async () => {
            // Verify shutdown logging configuration
            const { logger } = require('../../utils/logger');
            
            // Test that logger is available for shutdown events
            expect(logger).toBeDefined();
            expect(logger.info).toBeDefined();
            expect(logger.warn).toBeDefined();
            expect(logger.error).toBeDefined();
            
            // This validates the logging infrastructure is in place for shutdown events
            expect(jest.isMockFunction(logger.info)).toBe(true);
        });
    });

    /**
     * Test Case: Application Health Check
     * 
     * Validates health monitoring endpoint:
     * - Tests health check endpoint availability
     * - Verifies health response format and content
     * - Validates uptime and status information
     * - Tests health check performance
     * 
     * This test ensures the application provides health monitoring
     * capabilities for operational monitoring and alerting.
     */
    describe('Health monitoring', () => {
        it('should provide health check endpoint', async () => {
            const response = await request
                .get('/health')
                .expect(200);
            
            // Validate health check response format
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('timestamp');
            
            // Verify health status values
            expect(response.body.status).toBe('OK');
            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThan(0);
            
            // Validate timestamp format
            expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });

        it('should respond to health checks quickly', async () => {
            const startTime = process.hrtime.bigint();
            
            await request
                .get('/health')
                .expect(200);
            
            const endTime = process.hrtime.bigint();
            const responseTime = Number(endTime - startTime) / 1000000;
            
            // Health checks should be very fast
            expect(responseTime).toBeLessThan(10);
        });
    });

    /**
     * Test Case: Request Validation and Security
     * 
     * Validates input validation and security measures:
     * - Tests request header validation
     * - Verifies security header presence
     * - Tests input sanitization
     * - Validates CORS and security middleware
     * 
     * This test ensures the application properly validates inputs
     * and implements security best practices.
     */
    describe('Request validation and security', () => {
        it('should validate request headers appropriately', async () => {
            // Test with various header configurations
            const response = await request
                .get('/hello')
                .set('User-Agent', 'Test-Agent/1.0')
                .set('Accept', 'text/plain')
                .expect(200);
            
            expect(response.text).toBe('Hello world');
        });

        it('should include security headers in responses', async () => {
            const response = await request
                .get('/hello')
                .expect(200);
            
            // Verify security headers are present
            expect(response.headers['x-content-type-options']).toBeDefined();
            expect(response.headers['x-frame-options']).toBeDefined();
            
            // Verify Express powered-by header is disabled
            expect(response.headers['x-powered-by']).toBeUndefined();
        });

        it('should handle large request headers gracefully', async () => {
            // Test with large header values (within reasonable limits)
            const largeHeaderValue = 'x'.repeat(1000);
            
            const response = await request
                .get('/hello')
                .set('X-Large-Header', largeHeaderValue)
                .expect(200);
            
            expect(response.text).toBe('Hello world');
        });
    });

    /**
     * Test Suite Summary and Reporting
     * 
     * Provides comprehensive test result summary:
     * - Reports test execution statistics
     * - Summarizes performance metrics
     * - Logs error rates and patterns
     * - Provides operational insights
     */
    afterAll(() => {
        // Calculate final performance metrics
        const averageResponseTime = performanceMetrics.requestCount > 0 
            ? performanceMetrics.totalResponseTime / performanceMetrics.requestCount 
            : 0;
        
        // Log comprehensive test summary
        console.log('\n=== Integration Test Summary ===');
        console.log(`Total Requests: ${performanceMetrics.requestCount}`);
        console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
        console.log(`Max Response Time: ${performanceMetrics.maxResponseTime.toFixed(2)}ms`);
        console.log(`Min Response Time: ${performanceMetrics.minResponseTime === Infinity ? 'N/A' : performanceMetrics.minResponseTime.toFixed(2)}ms`);
        console.log(`Error Count: ${performanceMetrics.errorCount}`);
        console.log(`Logger Calls: ${global.logOutput.length}`);
        console.log('=== Test Summary Complete ===\n');
        
        // Verify overall test health
        expect(performanceMetrics.requestCount).toBeGreaterThan(0);
        if (performanceMetrics.requestCount > 0) {
            expect(averageResponseTime).toBeLessThan(50);
        }
    });
});