// External dependencies for HTTP integration testing
const request = require('supertest'); // supertest@^7.1.1 - HTTP assertions for Express.js endpoints
const { jest } = require('@jest/globals'); // jest@latest - Testing framework with mocking capabilities

// Internal dependencies - Application modules under test
const { app } = require('../../app.js'); // Express application instance for integration testing

// Mock logger to capture and validate error logging behavior
// This allows us to test that errors are properly logged without polluting test output
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    level: 'info'
};

// Mock the logger module to use our test logger
jest.mock('../../utils/logger.js', () => ({
    logger: mockLogger,
    info: mockLogger.info,
    warn: mockLogger.warn,
    error: mockLogger.error,
    level: mockLogger.level
}));

/**
 * Integration test suite for error handling in the Node.js tutorial backend
 * 
 * This test suite verifies that the Express application correctly handles and responds
 * to various error scenarios, including 404 Not Found, 405 Method Not Allowed,
 * and internal server errors. It ensures that all errors are normalized, logged,
 * and returned to the client in a secure, standardized format as defined by the
 * errorHandler middleware and error utilities.
 * 
 * The tests use Supertest to simulate HTTP requests and assert on response status,
 * body, and headers, confirming that no stack traces or sensitive details are leaked.
 * The suite also validates that the error-handling middleware is properly integrated
 * and that all error responses conform to the application's security requirements.
 */
describe('Error Handling Integration', () => {
    let testApp;
    
    /**
     * Setup test environment before all tests
     * Initializes the Supertest request agent with the Express app instance
     * and configures the test environment for isolated error testing
     */
    beforeAll(() => {
        // Initialize the Express app for testing
        // The app is already configured with all middleware and error handlers
        testApp = app;
        
        // Ensure test environment is properly configured
        process.env.NODE_ENV = 'test';
        
        // Clear any existing mock calls from previous test runs
        mockLogger.info.mockClear();
        mockLogger.warn.mockClear();
        mockLogger.error.mockClear();
    });
    
    /**
     * Reset mock state before each test to ensure test isolation
     * Clears all mock function call history for clean test execution
     */
    beforeEach(() => {
        // Clear mock logger calls for each test
        mockLogger.info.mockClear();
        mockLogger.warn.mockClear();
        mockLogger.error.mockClear();
    });
    
    /**
     * Test: 404 Not Found for unknown routes
     * Verifies that requests to undefined routes return proper 404 errors
     * with standardized error format and no sensitive information leakage
     */
    describe('404 Not Found Error Handling', () => {
        it('should return 404 Not Found for unknown routes', async () => {
            // Send GET request to a non-existent route
            const response = await request(testApp)
                .get('/notfound')
                .expect(404);
            
            // Verify response structure and content
            expect(response.status).toBe(404);
            expect(response.type).toBe('application/json');
            
            // Verify standardized error response format
            expect(response.body).toEqual({
                error: true,
                message: expect.any(String),
                status: 404,
                timestamp: expect.any(String),
                path: '/notfound'
            });
            
            // Verify no sensitive information is leaked
            expect(response.body).not.toHaveProperty('stack');
            expect(response.body).not.toHaveProperty('details');
            expect(response.body).not.toHaveProperty('originalError');
            
            // Verify timestamp is valid ISO string
            expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
        });
        
        it('should return 404 for nested unknown routes', async () => {
            // Test deeply nested non-existent routes
            const response = await request(testApp)
                .get('/api/v1/users/123/posts/456')
                .expect(404);
            
            expect(response.body.error).toBe(true);
            expect(response.body.status).toBe(404);
            expect(response.body.path).toBe('/api/v1/users/123/posts/456');
        });
    });
    
    /**
     * Test: 405 Method Not Allowed for unsupported methods
     * Verifies that unsupported HTTP methods on existing routes return proper 405 errors
     * Tests the /hello endpoint which only supports GET requests
     */
    describe('405 Method Not Allowed Error Handling', () => {
        it('should return 405 Method Not Allowed for POST to /hello', async () => {
            // Send POST request to /hello endpoint which only supports GET
            const response = await request(testApp)
                .post('/hello')
                .expect(405);
            
            // Verify response structure and content
            expect(response.status).toBe(405);
            expect(response.type).toBe('application/json');
            
            // Verify standardized error response format
            expect(response.body).toEqual({
                error: true,
                message: expect.any(String),
                status: 405,
                timestamp: expect.any(String),
                path: '/hello'
            });
            
            // Verify no sensitive information is leaked
            expect(response.body).not.toHaveProperty('stack');
            expect(response.body).not.toHaveProperty('details');
            
            // Verify Allow header is set with supported methods
            expect(response.headers.allow).toBeDefined();
        });
        
        it('should return 405 Method Not Allowed for PUT to /hello', async () => {
            const response = await request(testApp)
                .put('/hello')
                .expect(405);
            
            expect(response.body.error).toBe(true);
            expect(response.body.status).toBe(405);
            expect(response.body.path).toBe('/hello');
        });
        
        it('should return 405 Method Not Allowed for DELETE to /hello', async () => {
            const response = await request(testApp)
                .delete('/hello')
                .expect(405);
            
            expect(response.body.error).toBe(true);
            expect(response.body.status).toBe(405);
            expect(response.body.path).toBe('/hello');
        });
    });
    
    /**
     * Test: 500 Internal Server Error simulation
     * Verifies that internal server errors are properly handled and formatted
     * Uses a temporary route to simulate server errors for testing
     */
    describe('500 Internal Server Error Handling', () => {
        it('should handle internal server errors gracefully', async () => {
            // Add a temporary route that throws an error for testing
            testApp.get('/test-error', (req, res, next) => {
                // Simulate an internal server error
                const error = new Error('Simulated internal server error');
                next(error);
            });
            
            // Send request to the error-generating route
            const response = await request(testApp)
                .get('/test-error')
                .expect(500);
            
            // Verify response structure and content
            expect(response.status).toBe(500);
            expect(response.type).toBe('application/json');
            
            // Verify standardized error response format
            expect(response.body).toEqual({
                error: true,
                message: expect.any(String),
                status: 500,
                timestamp: expect.any(String),
                path: '/test-error'
            });
            
            // Verify no sensitive information is leaked
            expect(response.body).not.toHaveProperty('stack');
            expect(response.body).not.toHaveProperty('details');
            expect(response.body).not.toHaveProperty('originalError');
            
            // Verify error was logged
            expect(mockLogger.error).toHaveBeenCalled();
        });
        
        it('should handle async errors properly', async () => {
            // Add a temporary async route that throws an error
            testApp.get('/test-async-error', async (req, res, next) => {
                // Simulate an async error
                await Promise.reject(new Error('Async error simulation'));
            });
            
            const response = await request(testApp)
                .get('/test-async-error')
                .expect(500);
            
            expect(response.body.error).toBe(true);
            expect(response.body.status).toBe(500);
            expect(response.body.path).toBe('/test-async-error');
        });
    });
    
    /**
     * Test: Standardized error response format
     * Verifies that all error responses follow the same structure and security guidelines
     * Tests multiple error scenarios to ensure consistency
     */
    describe('Error Response Format Standardization', () => {
        it('should return consistent error structure for all error types', async () => {
            // Test multiple error scenarios
            const testCases = [
                { method: 'get', path: '/nonexistent', expectedStatus: 404 },
                { method: 'post', path: '/hello', expectedStatus: 405 },
                { method: 'put', path: '/invalid', expectedStatus: 404 }
            ];
            
            for (const testCase of testCases) {
                const response = await request(testApp)
                    [testCase.method](testCase.path)
                    .expect(testCase.expectedStatus);
                
                // Verify all error responses have the same structure
                expect(response.body).toEqual({
                    error: true,
                    message: expect.any(String),
                    status: testCase.expectedStatus,
                    timestamp: expect.any(String),
                    path: testCase.path
                });
                
                // Verify required fields are present
                expect(typeof response.body.error).toBe('boolean');
                expect(typeof response.body.message).toBe('string');
                expect(typeof response.body.status).toBe('number');
                expect(typeof response.body.timestamp).toBe('string');
                expect(typeof response.body.path).toBe('string');
                
                // Verify error field is always true
                expect(response.body.error).toBe(true);
                
                // Verify status matches HTTP status code
                expect(response.body.status).toBe(response.status);
                
                // Verify timestamp is valid ISO string
                expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
            }
        });
        
        it('should never expose sensitive information in error responses', async () => {
            // Test various error scenarios
            const errorPaths = ['/nonexistent', '/hello', '/invalid/path'];
            const errorMethods = ['get', 'post', 'put', 'delete'];
            
            for (const path of errorPaths) {
                for (const method of errorMethods) {
                    const response = await request(testApp)
                        [method](path);
                    
                    // Verify no sensitive fields are present
                    expect(response.body).not.toHaveProperty('stack');
                    expect(response.body).not.toHaveProperty('details');
                    expect(response.body).not.toHaveProperty('originalError');
                    expect(response.body).not.toHaveProperty('internalDetails');
                    expect(response.body).not.toHaveProperty('systemInfo');
                    expect(response.body).not.toHaveProperty('env');
                    expect(response.body).not.toHaveProperty('config');
                }
            }
        });
    });
    
    /**
     * Test: Error logging functionality
     * Verifies that errors are properly logged using the centralized logger
     * Tests that appropriate log levels are used for different error types
     */
    describe('Error Logging Validation', () => {
        it('should log errors using the centralized logger', async () => {
            // Clear existing mock calls
            mockLogger.error.mockClear();
            
            // Trigger an error by requesting a non-existent route
            await request(testApp)
                .get('/trigger-error-log')
                .expect(404);
            
            // Verify logger.error was called
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            
            // Verify log call includes expected information
            const logCall = mockLogger.error.mock.calls[0];
            expect(logCall[0]).toBe('Error occurred during request processing');
            expect(logCall[1]).toEqual(expect.objectContaining({
                error: expect.objectContaining({
                    message: expect.any(String),
                    status: 404,
                    stack: expect.any(String)
                }),
                request: expect.objectContaining({
                    method: 'GET',
                    url: '/trigger-error-log',
                    timestamp: expect.any(String)
                })
            }));
        });
        
        it('should log different error types with appropriate context', async () => {
            // Test 404 error logging
            mockLogger.error.mockClear();
            await request(testApp).get('/404-test').expect(404);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error occurred during request processing',
                expect.objectContaining({
                    error: expect.objectContaining({ status: 404 }),
                    request: expect.objectContaining({ method: 'GET' })
                })
            );
            
            // Test 405 error logging
            mockLogger.error.mockClear();
            await request(testApp).post('/hello').expect(405);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error occurred during request processing',
                expect.objectContaining({
                    error: expect.objectContaining({ status: 405 }),
                    request: expect.objectContaining({ method: 'POST' })
                })
            );
        });
    });
    
    /**
     * Test: Security headers and error response security
     * Verifies that error responses include appropriate security headers
     * and don't expose sensitive server information
     */
    describe('Error Response Security', () => {
        it('should include security headers in error responses', async () => {
            const response = await request(testApp)
                .get('/security-test')
                .expect(404);
            
            // Verify security headers are present
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['content-security-policy']).toBeDefined();
            
            // Verify no server information is exposed
            expect(response.headers['x-powered-by']).toBeUndefined();
            expect(response.headers['server']).toBeUndefined();
        });
        
        it('should not expose server stack traces in any error scenario', async () => {
            // Test various error scenarios
            const testScenarios = [
                { method: 'get', path: '/stack-trace-test', expectedStatus: 404 },
                { method: 'post', path: '/hello', expectedStatus: 405 },
                { method: 'patch', path: '/nonexistent', expectedStatus: 404 }
            ];
            
            for (const scenario of testScenarios) {
                const response = await request(testApp)
                    [scenario.method](scenario.path)
                    .expect(scenario.expectedStatus);
                
                // Verify response body doesn't contain stack trace indicators
                const responseText = JSON.stringify(response.body);
                expect(responseText).not.toMatch(/at\s+\w+\s+\(/); // Stack trace pattern
                expect(responseText).not.toMatch(/\w+\.js:\d+:\d+/); // File:line:column pattern
                expect(responseText).not.toMatch(/Error:\s+\w+/); // Error object pattern
                expect(responseText).not.toMatch(/\s+at\s+/); // Stack trace line pattern
            }
        });
    });
    
    /**
     * Test: Request context preservation in error responses
     * Verifies that error responses include appropriate request context
     * for debugging while maintaining security
     */
    describe('Request Context in Error Responses', () => {
        it('should include request path in error responses', async () => {
            const testPath = '/context-test-path';
            const response = await request(testApp)
                .get(testPath)
                .expect(404);
            
            expect(response.body.path).toBe(testPath);
        });
        
        it('should include timestamp in error responses', async () => {
            const beforeRequest = new Date();
            
            const response = await request(testApp)
                .get('/timestamp-test')
                .expect(404);
            
            const afterRequest = new Date();
            const responseTimestamp = new Date(response.body.timestamp);
            
            // Verify timestamp is between request start and end
            expect(responseTimestamp.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
            expect(responseTimestamp.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
        });
    });
    
    /**
     * Cleanup test environment after all tests
     * Removes any temporary routes and resets the test state
     */
    afterAll(() => {
        // Clear mock logger calls
        mockLogger.info.mockClear();
        mockLogger.warn.mockClear();
        mockLogger.error.mockClear();
        
        // Reset environment
        delete process.env.NODE_ENV;
    });
});