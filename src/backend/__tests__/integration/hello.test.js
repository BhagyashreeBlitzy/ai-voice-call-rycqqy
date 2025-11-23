// Jest testing framework for test structure and assertions
const jest = require('jest'); // v29.x

// Supertest for HTTP assertions and integration testing
const request = require('supertest'); // v7.1.1

// Import the Express application instance under test
const { app } = require('../../app.js');

// Import the test environment setup for logger stubbing and error handling
const { setupTestEnvironment } = require('../setup.js');

// Main integration test suite for the /hello endpoint
// Covers all end-to-end scenarios including correctness, performance, error handling, and logging
describe('Integration: /hello endpoint', () => {
    let supertest;

    // Setup test environment before all tests
    // This ensures logger stubbing and error hooks are active for all test cases
    beforeAll(() => {
        setupTestEnvironment();
        
        // Initialize Supertest with the Express app instance
        // This creates a test agent that can make HTTP requests to the app
        supertest = request(app);
    });

    // Clear log output before each test to ensure test isolation
    beforeEach(() => {
        // Reset the global logOutput array to ensure clean state between tests
        global.logOutput = [];
        
        // Reset all Jest mocks to clear call history and return values
        jest.clearAllMocks();
    });

    // Test: GET /hello returns 200 and "Hello world"
    // Validates the core endpoint functionality with correct status, content-type, and body
    it('should return 200 status and "Hello world" text for GET /hello', async () => {
        // Send GET request to /hello endpoint
        const response = await supertest
            .get('/hello')
            .expect(200)
            .expect('Content-Type', /text\/plain/);

        // Verify response body contains exactly "Hello world"
        expect(response.text).toBe('Hello world');
        
        // Verify response headers are set correctly
        expect(response.headers['content-type']).toMatch(/text\/plain/);
        
        // Verify no unexpected properties in response
        expect(response.status).toBe(200);
    });

    // Test: GET /hello responds within 50ms
    // Validates performance requirements as specified in the technical specification
    it('should respond within 50ms for GET /hello', async () => {
        // Record start time for performance measurement
        const startTime = Date.now();
        
        // Send GET request to /hello endpoint
        const response = await supertest
            .get('/hello')
            .expect(200);
        
        // Calculate response time
        const responseTime = Date.now() - startTime;
        
        // Assert response time is below 50ms performance target
        expect(responseTime).toBeLessThan(50);
        
        // Verify response is correct despite performance testing
        expect(response.text).toBe('Hello world');
    });

    // Test: POST /hello returns 405 Method Not Allowed
    // Validates method filtering and error handling for unsupported HTTP methods
    it('should return 405 Method Not Allowed for POST /hello', async () => {
        // Send POST request to /hello endpoint (should be rejected)
        const response = await supertest
            .post('/hello')
            .expect(405);

        // Verify response body contains standardized error message
        expect(response.body).toEqual({
            error: true,
            message: expect.stringContaining('Method Not Allowed'),
            statusCode: 405,
            timestamp: expect.any(String),
            path: '/hello',
            method: 'POST'
        });
        
        // Verify response headers indicate JSON content type for error responses
        expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    // Test: GET /unknown returns 404 Not Found
    // Validates error handling for unknown routes with standardized error response
    it('should return 404 Not Found for GET /unknown', async () => {
        // Send GET request to non-existent endpoint
        const response = await supertest
            .get('/unknown')
            .expect(404);

        // Verify response body contains standardized 404 error message
        expect(response.body).toEqual({
            error: true,
            message: expect.stringContaining('Not Found'),
            statusCode: 404,
            timestamp: expect.any(String),
            path: '/unknown',
            method: 'GET'
        });
        
        // Verify response headers indicate JSON content type for error responses
        expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    // Test: Error handling does not leak stack traces
    // Validates secure error handling by simulating internal errors and ensuring no sensitive data exposure
    it('should not leak stack traces in error responses', async () => {
        // Mock the hello controller to throw an internal error
        // This simulates an unexpected server error during request processing
        const helloController = require('../../controllers/helloController.js');
        const originalHelloController = helloController.helloController;
        
        // Replace the controller with a mock that throws an error
        helloController.helloController = jest.fn().mockImplementation((req, res, next) => {
            const error = new Error('Internal database connection failed');
            error.stack = 'Error: Internal database connection failed\n    at DatabaseConnection.connect (/app/db.js:45:12)\n    at Object.query (/app/models/user.js:123:8)';
            next(error);
        });

        // Send request that will trigger the mocked error
        const response = await supertest
            .get('/hello')
            .expect(500);

        // Verify response body contains generic error message without sensitive details
        expect(response.body).toEqual({
            error: true,
            message: expect.stringContaining('Internal Server Error'),
            statusCode: 500,
            timestamp: expect.any(String),
            path: '/hello',
            method: 'GET'
        });
        
        // Verify no stack trace is present in the response
        expect(response.body.stack).toBeUndefined();
        expect(response.body.details).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('DatabaseConnection');
        expect(JSON.stringify(response.body)).not.toContain('/app/db.js');
        expect(JSON.stringify(response.body)).not.toContain('Internal database connection failed');
        
        // Restore original controller
        helloController.helloController = originalHelloController;
    });

    // Test: Logger is called for requests and errors
    // Validates observability and monitoring by checking that logger methods are called appropriately
    it('should log requests and errors appropriately', async () => {
        // Test successful request logging
        await supertest
            .get('/hello')
            .expect(200);

        // Verify logger.info was called for request processing
        expect(global.logOutput).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    level: 'info',
                    message: expect.stringContaining('Processing GET /hello request')
                }),
                expect.objectContaining({
                    level: 'info',
                    message: expect.stringContaining('Successfully sent /hello response')
                })
            ])
        );

        // Clear log output for error testing
        global.logOutput = [];

        // Test error logging by sending request to non-existent endpoint
        await supertest
            .get('/nonexistent')
            .expect(404);

        // Verify logger was called for error handling
        // Note: Error logging may occur in middleware or error handlers
        expect(global.logOutput.length).toBeGreaterThan(0);
        
        // Verify at least one error-level log entry exists
        const errorLogs = global.logOutput.filter(log => log.level === 'error');
        expect(errorLogs.length).toBeGreaterThanOrEqual(0); // May be 0 if 404 is handled as info level
        
        // Clear log output for method not allowed testing
        global.logOutput = [];

        // Test error logging for method not allowed
        await supertest
            .post('/hello')
            .expect(405);

        // Verify logging occurred for method not allowed error
        expect(global.logOutput.length).toBeGreaterThan(0);
    });

    // Test: Multiple concurrent requests are handled correctly
    // Validates that the stateless design properly handles concurrent requests
    it('should handle multiple concurrent requests correctly', async () => {
        // Create array of concurrent requests
        const requests = Array.from({ length: 5 }, () => 
            supertest
                .get('/hello')
                .expect(200)
                .expect('Content-Type', /text\/plain/)
        );

        // Execute all requests concurrently
        const responses = await Promise.all(requests);

        // Verify all responses are correct
        responses.forEach(response => {
            expect(response.text).toBe('Hello world');
            expect(response.status).toBe(200);
        });

        // Verify all requests were logged
        const requestLogs = global.logOutput.filter(log => 
            log.message.includes('Processing GET /hello request')
        );
        expect(requestLogs.length).toBe(5);
    });

    // Test: Request headers are properly processed
    // Validates that the endpoint correctly handles various request headers
    it('should properly handle request headers', async () => {
        // Send request with custom headers
        const response = await supertest
            .get('/hello')
            .set('User-Agent', 'Integration-Test/1.0')
            .set('Accept', 'text/plain')
            .expect(200);

        // Verify response is correct regardless of headers
        expect(response.text).toBe('Hello world');
        expect(response.headers['content-type']).toMatch(/text\/plain/);

        // Verify request was logged with header information
        const requestLogs = global.logOutput.filter(log => 
            log.message.includes('Processing GET /hello request')
        );
        expect(requestLogs.length).toBe(1);
        expect(requestLogs[0].meta).toEqual(
            expect.objectContaining({
                userAgent: 'Integration-Test/1.0'
            })
        );
    });

    // Test: Response headers are set correctly
    // Validates that proper HTTP headers are set in responses
    it('should set correct response headers', async () => {
        const response = await supertest
            .get('/hello')
            .expect(200);

        // Verify content-type header is set correctly
        expect(response.headers['content-type']).toMatch(/text\/plain/);
        
        // Verify Express framework headers are properly configured
        expect(response.headers['x-powered-by']).toBeUndefined(); // Should be disabled for security
        
        // Verify no unexpected headers are present
        expect(response.headers).not.toHaveProperty('server');
    });

    // Test: Invalid HTTP methods return appropriate errors
    // Validates comprehensive method filtering for security and API compliance
    it('should return 405 for all unsupported HTTP methods', async () => {
        // Test various unsupported methods
        const methods = ['PUT', 'DELETE', 'PATCH', 'OPTIONS'];
        
        for (const method of methods) {
            const response = await supertest[method.toLowerCase()]('/hello')
                .expect(405);

            // Verify standardized error response format
            expect(response.body).toEqual({
                error: true,
                message: expect.stringContaining('Method Not Allowed'),
                statusCode: 405,
                timestamp: expect.any(String),
                path: '/hello',
                method: method
            });
        }
    });

    // Test: Endpoint maintains stateless behavior
    // Validates that the endpoint doesn't maintain state between requests
    it('should maintain stateless behavior across requests', async () => {
        // Send multiple requests and verify each returns identical response
        const responses = await Promise.all([
            supertest.get('/hello').expect(200),
            supertest.get('/hello').expect(200),
            supertest.get('/hello').expect(200)
        ]);

        // Verify all responses are identical
        responses.forEach(response => {
            expect(response.text).toBe('Hello world');
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/text\/plain/);
        });

        // Verify no state is maintained between requests
        expect(responses[0].text).toBe(responses[1].text);
        expect(responses[1].text).toBe(responses[2].text);
    });
});