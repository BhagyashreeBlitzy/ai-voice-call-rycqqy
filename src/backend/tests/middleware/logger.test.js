// External dependencies
const request = require('supertest'); // ^7.1.1 - HTTP assertions for integration testing of Express middleware
const express = require('express'); // ^5.1.0 - Used to create a minimal Express app instance for integration tests
const jest = require('jest'); // ^29.0.0 - Test runner and assertion library for mocking and assertions

// Internal dependencies
const { requestLogger } = require('../../middleware/logger.js');
const { Logger } = require('../../utils/logger.js');

/**
 * Comprehensive test suite for the Express request logging middleware (requestLogger).
 * Tests functionality including HTTP request/response logging, log level filtering,
 * environment-specific behavior, integration with centralized Logger utility,
 * and security (no sensitive data logging).
 * 
 * This test suite ensures that the requestLogger middleware is robust, environment-aware,
 * and compliant with monitoring and observability requirements. It covers both unit and
 * integration scenarios using Jest for mocking and SuperTest for HTTP testing.
 */
describe('Request Logger Middleware Tests', () => {
    // Global variables for test setup
    let app;
    let mockLogger;
    let originalEnv;

    /**
     * Sets up the test environment before each test.
     * Creates a fresh Express app instance and mocks the Logger utility.
     */
    beforeEach(() => {
        // Store original environment variable
        originalEnv = process.env.NODE_ENV;
        
        // Create mock logger instance with all required methods
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            getLevel: jest.fn(() => 'info'),
            setLevel: jest.fn(),
            child: jest.fn(),
            logSystemInfo: jest.fn()
        };

        // Mock the Logger constructor to return our mock instance
        jest.spyOn(Logger.prototype, 'info').mockImplementation(mockLogger.info);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLogger.warn);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
        jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLogger.debug);

        // Create a fresh Express app for each test
        app = setupTestApp((req, res) => res.send('ok'));
    });

    /**
     * Cleans up test environment after each test.
     * Restores original environment variables and clears all mocks.
     */
    afterEach(() => {
        // Restore original environment
        process.env.NODE_ENV = originalEnv;
        
        // Clear all mocks
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    /**
     * Creates a minimal Express app instance with the requestLogger middleware and a test route.
     * Used for integration testing of the middleware in a realistic Express environment.
     * 
     * @param {Function} routeHandler - Function to handle the test route
     * @returns {Object} Express app instance with requestLogger middleware and test route
     */
    function setupTestApp(routeHandler) {
        const testApp = express();
        
        // Register the requestLogger middleware as the first middleware
        testApp.use(requestLogger);
        
        // Register test routes
        testApp.get('/test', routeHandler);
        testApp.get('/hello', (req, res) => res.send('Hello world'));
        testApp.get('/fail', (req, res) => res.status(500).send('Internal Server Error'));
        testApp.get('/notfound', (req, res) => res.status(404).send('Not Found'));
        testApp.get('/dev', (req, res) => res.send('Development endpoint'));
        testApp.post('/sensitive', (req, res) => res.send('Sensitive data processed'));
        testApp.put('/test', (req, res) => res.send('PUT response'));
        testApp.delete('/test', (req, res) => res.send('DELETE response'));
        
        return testApp;
    }

    /**
     * Test: Logs info for successful GET request
     * Verifies that successful HTTP requests are logged with correct method, path, status, and response time.
     */
    describe('Successful Request Logging', () => {
        it('should log info for successful GET request', async () => {
            // Send a GET request to /test using SuperTest
            const response = await request(app)
                .get('/test')
                .expect(200);

            // Verify that the request was successful
            expect(response.text).toBe('ok');

            // Assert that Logger.info was called for both incoming request and completed request
            expect(mockLogger.info).toHaveBeenCalledTimes(2);
            
            // Check incoming request log
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: GET /test',
                expect.objectContaining({
                    method: 'GET',
                    url: '/test',
                    requestId: expect.any(String),
                    timestamp: expect.any(String)
                })
            );

            // Check completed request log
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Request completed: GET /test - 200'),
                expect.objectContaining({
                    method: 'GET',
                    url: '/test',
                    statusCode: 200,
                    responseTime: expect.any(Number),
                    requestId: expect.any(String)
                })
            );
        });

        it('should log info for successful POST request', async () => {
            // Send a POST request to /sensitive using SuperTest
            await request(app)
                .post('/sensitive')
                .expect(200);

            // Verify that info logging occurred for POST request
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: POST /sensitive',
                expect.objectContaining({
                    method: 'POST',
                    url: '/sensitive'
                })
            );

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Request completed: POST /sensitive - 200'),
                expect.objectContaining({
                    method: 'POST',
                    url: '/sensitive',
                    statusCode: 200
                })
            );
        });
    });

    /**
     * Test: Logs warn or error for 4xx/5xx responses
     * Verifies that client and server error responses are logged with appropriate log levels.
     */
    describe('Error Response Logging', () => {
        it('should log warn for 4xx client error responses', async () => {
            // Send a GET request to /notfound that returns 404
            await request(app)
                .get('/notfound')
                .expect(404);

            // Assert that Logger.warn was called for 4xx response
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Client error: GET /notfound - 404'),
                expect.objectContaining({
                    method: 'GET',
                    url: '/notfound',
                    statusCode: 404,
                    responseTime: expect.any(Number),
                    errorType: 'client_error',
                    severity: 'medium'
                })
            );

            // Verify that info is still called for incoming request
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: GET /notfound',
                expect.anything()
            );
        });

        it('should log error for 5xx server error responses', async () => {
            // Send a GET request to /fail that returns 500
            await request(app)
                .get('/fail')
                .expect(500);

            // Assert that Logger.error was called for 5xx response
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Server error: GET /fail - 500'),
                expect.objectContaining({
                    method: 'GET',
                    url: '/fail',
                    statusCode: 500,
                    responseTime: expect.any(Number),
                    errorType: 'server_error',
                    severity: 'high'
                })
            );

            // Verify that info is still called for incoming request
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: GET /fail',
                expect.anything()
            );
        });
    });

    /**
     * Test: Logs debug details in development environment
     * Verifies that additional debug information is logged when running in development mode.
     */
    describe('Development Environment Debug Logging', () => {
        it('should log debug details in development environment', async () => {
            // Set environment to development
            process.env.NODE_ENV = 'development';
            
            // Create a new app instance with development environment
            const devApp = setupTestApp((req, res) => res.send('dev response'));

            // Send a GET request to /dev
            await request(devApp)
                .get('/dev')
                .expect(200);

            // Assert that Logger.debug was called with request details
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Request headers and query parameters',
                expect.objectContaining({
                    requestId: expect.any(String),
                    headers: expect.any(Object),
                    query: expect.any(Object),
                    params: expect.any(Object),
                    protocol: expect.any(String)
                })
            );

            // Assert that Logger.debug was called with response details
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Response details',
                expect.objectContaining({
                    requestId: expect.any(String),
                    statusCode: 200,
                    headers: expect.any(Object),
                    responseTime: expect.any(String)
                })
            );
        });

        it('should not log debug details in production environment', async () => {
            // Set environment to production
            process.env.NODE_ENV = 'production';
            
            // Create a new app instance with production environment
            const prodApp = setupTestApp((req, res) => res.send('prod response'));

            // Send a GET request
            await request(prodApp)
                .get('/test')
                .expect(200);

            // Assert that Logger.debug was not called
            expect(mockLogger.debug).not.toHaveBeenCalled();
        });
    });

    /**
     * Test: Does not log sensitive data by default
     * Verifies that sensitive information in headers or request body is not logged.
     */
    describe('Sensitive Data Protection', () => {
        it('should not log sensitive data in headers', async () => {
            // Send a POST request with sensitive headers
            await request(app)
                .post('/sensitive')
                .set('Authorization', 'Bearer secret-token')
                .set('Cookie', 'session=sensitive-session-id')
                .set('X-API-Key', 'secret-api-key')
                .set('X-Auth-Token', 'secret-auth-token')
                .set('Content-Type', 'application/json')
                .send({ password: 'secret-password', ssn: '123-45-6789' })
                .expect(200);

            // Get all calls to debug method
            const debugCalls = mockLogger.debug.mock.calls;
            
            // Check that sensitive headers are not present in any debug log
            debugCalls.forEach(call => {
                const [message, metadata] = call;
                if (metadata && metadata.headers) {
                    expect(metadata.headers).not.toHaveProperty('authorization');
                    expect(metadata.headers).not.toHaveProperty('cookie');
                    expect(metadata.headers).not.toHaveProperty('x-api-key');
                    expect(metadata.headers).not.toHaveProperty('x-auth-token');
                }
            });

            // Verify that safe headers are still logged
            if (debugCalls.length > 0) {
                const headerDebugCall = debugCalls.find(call => 
                    call[1] && call[1].headers && call[1].headers['content-type']
                );
                if (headerDebugCall) {
                    expect(headerDebugCall[1].headers).toHaveProperty('content-type');
                }
            }
        });

        it('should not log sensitive response headers', async () => {
            // Create app with response that sets sensitive headers
            const sensitiveApp = setupTestApp((req, res) => {
                res.set('Set-Cookie', 'sessionid=sensitive-value');
                res.set('X-Powered-By', 'Express');
                res.set('Content-Type', 'application/json');
                res.send({ message: 'success' });
            });

            // Send request
            await request(sensitiveApp)
                .get('/test')
                .expect(200);

            // Get all calls to debug method
            const debugCalls = mockLogger.debug.mock.calls;
            
            // Check that sensitive response headers are not present in debug logs
            debugCalls.forEach(call => {
                const [message, metadata] = call;
                if (metadata && metadata.headers) {
                    expect(metadata.headers).not.toHaveProperty('set-cookie');
                    expect(metadata.headers).not.toHaveProperty('x-powered-by');
                }
            });
        });
    });

    /**
     * Test: Logs correct method, path, status, and response time for various HTTP methods
     * Verifies that different HTTP methods are logged correctly with proper metadata.
     */
    describe('HTTP Method Logging', () => {
        it('should log correct method and path for GET requests', async () => {
            await request(app)
                .get('/hello')
                .expect(200);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: GET /hello',
                expect.objectContaining({
                    method: 'GET',
                    url: '/hello'
                })
            );
        });

        it('should log correct method and path for POST requests', async () => {
            await request(app)
                .post('/sensitive')
                .expect(200);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: POST /sensitive',
                expect.objectContaining({
                    method: 'POST',
                    url: '/sensitive'
                })
            );
        });

        it('should log correct method and path for PUT requests', async () => {
            await request(app)
                .put('/test')
                .expect(200);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: PUT /test',
                expect.objectContaining({
                    method: 'PUT',
                    url: '/test'
                })
            );
        });

        it('should log correct method and path for DELETE requests', async () => {
            await request(app)
                .delete('/test')
                .expect(200);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: DELETE /test',
                expect.objectContaining({
                    method: 'DELETE',
                    url: '/test'
                })
            );
        });
    });

    /**
     * Test: Response time and performance monitoring
     * Verifies that response times are accurately measured and performance issues are detected.
     */
    describe('Performance Monitoring', () => {
        it('should measure and log response time', async () => {
            await request(app)
                .get('/test')
                .expect(200);

            // Verify that response time is included in the log
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Request completed: GET /test - 200'),
                expect.objectContaining({
                    responseTime: expect.any(Number)
                })
            );

            // Get the response time from the log call
            const completedRequestCall = mockLogger.info.mock.calls.find(call => 
                call[0].includes('Request completed')
            );
            expect(completedRequestCall[1].responseTime).toBeGreaterThan(0);
        });

        it('should warn about slow responses', async () => {
            // Create app with artificial delay
            const slowApp = setupTestApp((req, res) => {
                setTimeout(() => {
                    res.send('slow response');
                }, 1100); // Delay longer than 1000ms threshold
            });

            await request(slowApp)
                .get('/test')
                .expect(200);

            // Verify that slow response warning was logged
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Slow response detected'),
                expect.objectContaining({
                    performanceIssue: 'slow_response',
                    threshold: '1000ms'
                })
            );
        });
    });

    /**
     * Test: Request metadata and tracing
     * Verifies that request metadata like IP address, user agent, and request IDs are logged.
     */
    describe('Request Metadata Logging', () => {
        it('should log request metadata including IP and user agent', async () => {
            await request(app)
                .get('/test')
                .set('User-Agent', 'Test-Agent/1.0')
                .expect(200);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: GET /test',
                expect.objectContaining({
                    method: 'GET',
                    url: '/test',
                    userAgent: 'Test-Agent/1.0',
                    ip: expect.any(String),
                    requestId: expect.any(String),
                    timestamp: expect.any(String)
                })
            );
        });

        it('should generate unique request IDs', async () => {
            // Send multiple requests
            await request(app).get('/test').expect(200);
            await request(app).get('/test').expect(200);

            // Get all incoming request logs
            const incomingRequestCalls = mockLogger.info.mock.calls.filter(call => 
                call[0].includes('Incoming request')
            );

            // Verify that request IDs are unique
            const requestIds = incomingRequestCalls.map(call => call[1].requestId);
            expect(requestIds[0]).not.toBe(requestIds[1]);
            expect(requestIds[0]).toMatch(/^req_\d+_[a-z0-9]{9}$/);
        });
    });

    /**
     * Test: Error handling and edge cases
     * Verifies proper handling of edge cases and error conditions.
     */
    describe('Error Handling and Edge Cases', () => {
        it('should handle requests without user agent', async () => {
            await request(app)
                .get('/test')
                .expect(200);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: GET /test',
                expect.objectContaining({
                    userAgent: 'unknown'
                })
            );
        });

        it('should handle requests with query parameters', async () => {
            await request(app)
                .get('/test?param1=value1&param2=value2')
                .expect(200);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Incoming request: GET /test?param1=value1&param2=value2',
                expect.objectContaining({
                    method: 'GET',
                    url: '/test?param1=value1&param2=value2'
                })
            );
        });

        it('should handle missing or undefined headers gracefully', async () => {
            await request(app)
                .get('/test')
                .expect(200);

            // Should not throw errors and should complete successfully
            expect(mockLogger.info).toHaveBeenCalledTimes(2);
        });
    });

    /**
     * Test: Integration with Logger utility
     * Verifies that the middleware correctly integrates with the centralized Logger utility.
     */
    describe('Logger Integration', () => {
        it('should use the Logger utility for all logging operations', async () => {
            await request(app)
                .get('/test')
                .expect(200);

            // Verify that Logger methods were called
            expect(mockLogger.info).toHaveBeenCalled();
            expect(Logger.prototype.info).toHaveBeenCalled();
        });

        it('should pass structured metadata to Logger methods', async () => {
            await request(app)
                .get('/test')
                .expect(200);

            // Verify that structured metadata is passed
            const logCall = mockLogger.info.mock.calls.find(call => 
                call[0].includes('Request completed')
            );
            
            expect(logCall[1]).toEqual(expect.objectContaining({
                requestId: expect.any(String),
                method: 'GET',
                url: '/test',
                statusCode: 200,
                responseTime: expect.any(Number),
                contentLength: expect.any(String),
                userAgent: expect.any(String),
                ip: expect.any(String),
                timestamp: expect.any(String)
            }));
        });
    });

    /**
     * Test: Environment-specific behavior
     * Verifies that the middleware behaves differently based on environment configuration.
     */
    describe('Environment-Specific Behavior', () => {
        it('should enable debug logging in development environment', async () => {
            process.env.NODE_ENV = 'development';
            const devApp = setupTestApp((req, res) => res.send('dev'));

            await request(devApp)
                .get('/test')
                .expect(200);

            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should disable debug logging in production environment', async () => {
            process.env.NODE_ENV = 'production';
            const prodApp = setupTestApp((req, res) => res.send('prod'));

            await request(prodApp)
                .get('/test')
                .expect(200);

            expect(mockLogger.debug).not.toHaveBeenCalled();
        });

        it('should disable debug logging in test environment', async () => {
            process.env.NODE_ENV = 'test';
            const testApp = setupTestApp((req, res) => res.send('test'));

            await request(testApp)
                .get('/test')
                .expect(200);

            expect(mockLogger.debug).not.toHaveBeenCalled();
        });
    });
});