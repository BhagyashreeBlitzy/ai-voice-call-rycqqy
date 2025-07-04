/**
 * Hello Route Test Suite
 * 
 * Route-level test suite for the '/hello' endpoint in the Node.js tutorial backend.
 * This file tests the Express Router defined in routes/hello.js in isolation, verifying
 * that the GET /hello route returns the correct JSON response structure, status code,
 * and headers, and that error handling is robust.
 * 
 * Uses Jest and SuperTest to perform HTTP assertions directly against the router,
 * ensuring the route handler's compliance with technical and educational requirements.
 * Complements integration and application-level tests by focusing on the router's
 * contract and behavior.
 * 
 * Test Categories:
 * - Basic functionality testing (GET /hello endpoint)
 * - Response format validation (JSON structure, headers)
 * - Performance threshold testing (< 50ms response time)
 * - Error handling for invalid routes (404 responses)
 * - Error handling for server errors (500 responses)
 * 
 * Technical Requirements:
 * - Express 5.1.0 router testing with enhanced error handling
 * - SuperTest HTTP assertions for route validation
 * - Jest framework for test structure and execution
 * - Performance monitoring for response time compliance
 * - Error scenario simulation and validation
 * 
 * @fileoverview Route-level test suite for the '/hello' endpoint
 * @author Node.js Tutorial Application
 * @version 1.0.0
 */

// External dependencies
import express from 'express'; // Express v5.1.0 - Web framework for Node.js
import supertest from 'supertest'; // SuperTest v7.1.1 - HTTP assertions for testing Express apps
import { jest } from '@jest/globals'; // Jest - Testing framework with globals support

// Internal dependencies
import router from '../../routes/hello.js'; // Hello route router for testing
import { formatSuccess } from '../../utils/responseFormatter.js'; // Response formatter utility
import { AppError } from '../../utils/errorTypes.js'; // Custom error types for error handling

/**
 * Test Application Setup
 * 
 * Creates a minimal Express application instance for testing the hello router
 * in isolation. The app is configured with the necessary middleware and the
 * hello router mounted at the appropriate path for testing.
 * 
 * @returns {Express.Application} Configured Express app for testing
 */
function setupTestApp() {
    // Create a new Express application instance
    const app = express();
    
    // Enable JSON parsing for request/response handling
    app.use(express.json());
    
    // Mount the hello router at the root path for testing
    // This allows testing the router as GET /hello directly
    app.use('/', router);
    
    // Add a global error handler for testing error scenarios
    app.use((err, req, res, next) => {
        // Handle AppError instances with structured error response
        if (err instanceof AppError) {
            res.status(err.status).json({
                success: false,
                message: err.message,
                code: err.code,
                status: err.status,
                details: err.details
            });
        } else {
            // Handle generic errors with standard 500 response
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                code: 'INTERNAL_ERROR',
                status: 500,
                details: null
            });
        }
    });
    
    return app;
}

/**
 * Test Suite: Hello Route Handler
 * 
 * Main test suite for the hello route functionality, covering all aspects
 * of the route behavior including success cases, error scenarios, and
 * performance requirements.
 */
describe('Hello Route Handler', () => {
    let app;
    let request;
    
    /**
     * Test Setup
     * 
     * Initialize the test application and SuperTest instance before each test.
     * This ensures each test runs with a clean application state.
     */
    beforeEach(() => {
        app = setupTestApp();
        request = supertest(app);
    });
    
    /**
     * Test Suite: GET /hello Success Cases
     * 
     * Tests for successful GET requests to the /hello endpoint, verifying
     * correct response format, status codes, and content.
     */
    describe('GET /hello - Success Cases', () => {
        /**
         * Test Case: Basic Hello World Response
         * 
         * Verifies that the GET /hello endpoint returns the correct JSON response
         * with proper status code, content structure, and message content.
         */
        test('should return 200 with formatted JSON response containing "Hello world"', async () => {
            const response = await request
                .get('/hello')
                .expect(200)
                .expect('Content-Type', /json/);
            
            // Verify the response structure matches the expected format
            expect(response.body).toEqual({
                success: true,
                message: 'Hello world',
                data: null,
                status: 200
            });
            
            // Verify specific response properties
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Hello world');
            expect(response.body.data).toBeNull();
            expect(response.body.status).toBe(200);
        });
        
        /**
         * Test Case: Response Headers Validation
         * 
         * Verifies that the response includes the correct HTTP headers
         * for JSON content type and proper character encoding.
         */
        test('should return correct Content-Type headers', async () => {
            const response = await request
                .get('/hello')
                .expect(200);
            
            // Verify Content-Type header is set to JSON
            expect(response.headers['content-type']).toMatch(/application\/json/);
            
            // Verify charset is properly set
            expect(response.headers['content-type']).toMatch(/charset=utf-8/);
        });
        
        /**
         * Test Case: Response Status Code Validation
         * 
         * Ensures the HTTP status code is exactly 200 for successful requests
         * and matches the status in the response body.
         */
        test('should return status 200 in both HTTP response and JSON body', async () => {
            const response = await request
                .get('/hello')
                .expect(200);
            
            // Verify HTTP status code
            expect(response.status).toBe(200);
            
            // Verify status in response body matches HTTP status
            expect(response.body.status).toBe(200);
        });
    });
    
    /**
     * Test Suite: Performance Requirements
     * 
     * Tests to verify that the hello endpoint meets performance requirements
     * as specified in the technical documentation.
     */
    describe('Performance Requirements', () => {
        /**
         * Test Case: Response Time Threshold
         * 
         * Verifies that the GET /hello endpoint responds within the required
         * performance threshold of less than 50ms.
         */
        test('should respond within 50ms performance threshold', async () => {
            const startTime = Date.now();
            
            await request
                .get('/hello')
                .expect(200);
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Verify response time is within acceptable threshold
            expect(responseTime).toBeLessThan(50);
        });
        
        /**
         * Test Case: Multiple Requests Performance
         * 
         * Tests that the endpoint maintains good performance under
         * multiple concurrent requests.
         */
        test('should maintain performance under multiple requests', async () => {
            const requestPromises = [];
            const startTime = Date.now();
            
            // Create 5 concurrent requests
            for (let i = 0; i < 5; i++) {
                requestPromises.push(
                    request
                        .get('/hello')
                        .expect(200)
                );
            }
            
            // Wait for all requests to complete
            await Promise.all(requestPromises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / 5;
            
            // Verify average response time is acceptable
            expect(averageTime).toBeLessThan(50);
        });
    });
    
    /**
     * Test Suite: Error Handling
     * 
     * Tests for error scenarios including invalid routes and server errors
     * to ensure robust error handling behavior.
     */
    describe('Error Handling', () => {
        /**
         * Test Case: Invalid Route Handling
         * 
         * Verifies that requests to non-existent routes return appropriate
         * 404 responses with proper error structure.
         */
        test('should return 404 for non-existent routes', async () => {
            const response = await request
                .get('/invalid-route')
                .expect(404);
            
            // Express default 404 handling - may return HTML or simple text
            // The exact format depends on Express configuration
            expect(response.status).toBe(404);
        });
        
        /**
         * Test Case: Method Not Allowed
         * 
         * Verifies that non-GET requests to the hello endpoint return
         * appropriate error responses.
         */
        test('should handle POST requests to /hello appropriately', async () => {
            const response = await request
                .post('/hello')
                .expect(404); // Router doesn't define POST, so 404 is expected
            
            expect(response.status).toBe(404);
        });
        
        /**
         * Test Case: PUT Method Not Allowed
         * 
         * Verifies that PUT requests to the hello endpoint return
         * appropriate error responses.
         */
        test('should handle PUT requests to /hello appropriately', async () => {
            const response = await request
                .put('/hello')
                .expect(404); // Router doesn't define PUT, so 404 is expected
            
            expect(response.status).toBe(404);
        });
        
        /**
         * Test Case: DELETE Method Not Allowed
         * 
         * Verifies that DELETE requests to the hello endpoint return
         * appropriate error responses.
         */
        test('should handle DELETE requests to /hello appropriately', async () => {
            const response = await request
                .delete('/hello')
                .expect(404); // Router doesn't define DELETE, so 404 is expected
            
            expect(response.status).toBe(404);
        });
    });
    
    /**
     * Test Suite: Error Handler Integration
     * 
     * Tests to verify that the route handler properly integrates with
     * Express error handling middleware for server errors.
     */
    describe('Error Handler Integration', () => {
        /**
         * Test Case: Simulated Server Error
         * 
         * Tests error handling behavior when the route handler encounters
         * an unexpected error condition.
         */
        test('should handle server errors gracefully', async () => {
            // Create a modified app with error-throwing route for testing
            const errorApp = express();
            errorApp.use(express.json());
            
            // Define a route that throws an error
            errorApp.get('/hello', (req, res, next) => {
                const error = new Error('Simulated server error');
                next(error);
            });
            
            // Add error handling middleware
            errorApp.use((err, req, res, next) => {
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    code: 'INTERNAL_ERROR',
                    status: 500,
                    details: null
                });
            });
            
            const errorRequest = supertest(errorApp);
            const response = await errorRequest
                .get('/hello')
                .expect(500);
            
            // Verify error response structure
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Internal server error');
            expect(response.body.code).toBe('INTERNAL_ERROR');
            expect(response.body.status).toBe(500);
        });
        
        /**
         * Test Case: AppError Handling
         * 
         * Tests that custom AppError instances are properly handled
         * and formatted in error responses.
         */
        test('should handle AppError instances with proper formatting', async () => {
            // Create a modified app with AppError throwing route
            const errorApp = express();
            errorApp.use(express.json());
            
            // Define a route that throws an AppError
            errorApp.get('/hello', (req, res, next) => {
                const error = new AppError(
                    'Test application error',
                    'TEST_ERROR',
                    400,
                    { testField: 'testValue' }
                );
                next(error);
            });
            
            // Add error handling middleware
            errorApp.use((err, req, res, next) => {
                if (err instanceof AppError) {
                    res.status(err.status).json({
                        success: false,
                        message: err.message,
                        code: err.code,
                        status: err.status,
                        details: err.details
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        message: 'Internal server error',
                        code: 'INTERNAL_ERROR',
                        status: 500,
                        details: null
                    });
                }
            });
            
            const errorRequest = supertest(errorApp);
            const response = await errorRequest
                .get('/hello')
                .expect(400);
            
            // Verify AppError response structure
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Test application error');
            expect(response.body.code).toBe('TEST_ERROR');
            expect(response.body.status).toBe(400);
            expect(response.body.details).toEqual({ testField: 'testValue' });
        });
    });
    
    /**
     * Test Suite: Response Format Validation
     * 
     * Tests to ensure the response format strictly adheres to the expected
     * structure and includes all required fields.
     */
    describe('Response Format Validation', () => {
        /**
         * Test Case: Required Fields Presence
         * 
         * Verifies that all required fields are present in the success response.
         */
        test('should include all required fields in success response', async () => {
            const response = await request
                .get('/hello')
                .expect(200);
            
            // Verify all required fields are present
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('status');
            
            // Verify field types
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.status).toBe('number');
        });
        
        /**
         * Test Case: Response Structure Consistency
         * 
         * Ensures that the response structure matches the formatSuccess utility
         * output format exactly.
         */
        test('should match formatSuccess utility output format', async () => {
            const expectedResponse = formatSuccess(null, 'Hello world', 200);
            
            const response = await request
                .get('/hello')
                .expect(200);
            
            // Verify response matches expected format exactly
            expect(response.body).toEqual(expectedResponse);
        });
        
        /**
         * Test Case: JSON Content Validation
         * 
         * Ensures that the response is valid JSON and can be parsed correctly.
         */
        test('should return valid JSON content', async () => {
            const response = await request
                .get('/hello')
                .expect(200);
            
            // Verify response body is valid JSON object
            expect(response.body).toBeInstanceOf(Object);
            expect(Array.isArray(response.body)).toBe(false);
            
            // Verify JSON can be stringified and parsed
            const jsonString = JSON.stringify(response.body);
            expect(jsonString).toBeTruthy();
            
            const parsedJson = JSON.parse(jsonString);
            expect(parsedJson).toEqual(response.body);
        });
    });
    
    /**
     * Test Suite: Router Integration
     * 
     * Tests to verify that the router integrates properly with Express
     * and handles various request scenarios correctly.
     */
    describe('Router Integration', () => {
        /**
         * Test Case: Router Export Validation
         * 
         * Verifies that the imported router is a valid Express Router instance.
         */
        test('should export a valid Express Router', () => {
            expect(router).toBeDefined();
            expect(typeof router).toBe('function');
            expect(router.stack).toBeDefined(); // Express router has a stack property
        });
        
        /**
         * Test Case: Route Registration
         * 
         * Verifies that the hello route is properly registered in the router.
         */
        test('should have hello route registered', () => {
            // Check that the router has routes defined
            expect(router.stack).toHaveLength(1);
            
            // Verify the route is a GET route
            const route = router.stack[0];
            expect(route.route).toBeDefined();
            expect(route.route.path).toBe('/hello');
            expect(route.route.methods.get).toBe(true);
        });
        
        /**
         * Test Case: Multiple Request Handling
         * 
         * Tests that the router can handle multiple consecutive requests
         * without state interference.
         */
        test('should handle multiple consecutive requests without state interference', async () => {
            // Send multiple requests sequentially
            const response1 = await request.get('/hello').expect(200);
            const response2 = await request.get('/hello').expect(200);
            const response3 = await request.get('/hello').expect(200);
            
            // Verify all responses are identical
            expect(response1.body).toEqual(response2.body);
            expect(response2.body).toEqual(response3.body);
            
            // Verify all responses have the expected content
            expect(response1.body.message).toBe('Hello world');
            expect(response2.body.message).toBe('Hello world');
            expect(response3.body.message).toBe('Hello world');
        });
    });
    
    /**
     * Test Suite: Edge Cases
     * 
     * Tests for edge cases and unusual request scenarios to ensure
     * robust handling of various input conditions.
     */
    describe('Edge Cases', () => {
        /**
         * Test Case: Request with Query Parameters
         * 
         * Verifies that the hello endpoint handles query parameters gracefully
         * and returns the same response regardless of query string.
         */
        test('should handle requests with query parameters', async () => {
            const response = await request
                .get('/hello?param1=value1&param2=value2')
                .expect(200);
            
            // Verify response is the same regardless of query parameters
            expect(response.body.message).toBe('Hello world');
            expect(response.body.success).toBe(true);
        });
        
        /**
         * Test Case: Request with Custom Headers
         * 
         * Verifies that the hello endpoint handles custom request headers
         * appropriately and returns the standard response.
         */
        test('should handle requests with custom headers', async () => {
            const response = await request
                .get('/hello')
                .set('X-Custom-Header', 'custom-value')
                .set('User-Agent', 'test-agent')
                .expect(200);
            
            // Verify response is not affected by custom headers
            expect(response.body.message).toBe('Hello world');
            expect(response.body.success).toBe(true);
        });
        
        /**
         * Test Case: Case Sensitivity
         * 
         * Verifies that the hello endpoint is case-sensitive for the path
         * and returns 404 for incorrect casing.
         */
        test('should be case-sensitive for route path', async () => {
            // Test uppercase path
            await request
                .get('/HELLO')
                .expect(404);
            
            // Test mixed case path
            await request
                .get('/Hello')
                .expect(404);
            
            // Test correct lowercase path
            await request
                .get('/hello')
                .expect(200);
        });
    });
});

/**
 * Additional Test Configuration and Cleanup
 * 
 * Configuration for Jest test environment and cleanup procedures
 * to ensure tests run reliably and don't interfere with each other.
 */

// Jest configuration for test timeout and environment
jest.setTimeout(10000); // 10 second timeout for all tests

// Clean up after all tests complete
afterAll(async () => {
    // Add any cleanup code here if needed
    // For this simple test suite, no additional cleanup is required
});

/**
 * Test Implementation Notes:
 * 
 * 1. Test Organization:
 *    - Tests are organized into logical groups using describe blocks
 *    - Each test focuses on a specific aspect of functionality
 *    - Test names clearly describe the expected behavior
 * 
 * 2. SuperTest Usage:
 *    - Uses SuperTest for HTTP request simulation and assertions
 *    - Chained expectations for status codes and content types
 *    - Proper async/await pattern for handling asynchronous operations
 * 
 * 3. Error Handling Testing:
 *    - Tests both expected error scenarios and edge cases
 *    - Verifies proper error response formatting and status codes
 *    - Includes tests for Express error middleware integration
 * 
 * 4. Performance Testing:
 *    - Includes timing assertions for performance requirements
 *    - Tests single requests and concurrent request scenarios
 *    - Verifies response time thresholds are met
 * 
 * 5. Response Validation:
 *    - Comprehensive testing of response structure and content
 *    - Validation of JSON format and required fields
 *    - Integration testing with response formatter utilities
 * 
 * 6. Router Integration:
 *    - Tests router behavior and route registration
 *    - Verifies Express integration and middleware handling
 *    - Ensures stateless behavior across multiple requests
 * 
 * 7. Edge Case Coverage:
 *    - Tests unusual but valid request scenarios
 *    - Verifies robust handling of various input conditions
 *    - Ensures consistent behavior across different request types
 * 
 * 8. Educational Value:
 *    - Clear test structure demonstrates best practices
 *    - Comprehensive coverage shows proper testing approach
 *    - Comments explain testing patterns and techniques
 */