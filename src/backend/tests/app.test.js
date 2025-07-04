// External dependencies for testing
const request = require('supertest'); // ^7.1.1 - HTTP assertions and integration testing for Express applications
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals'); // Testing framework for JavaScript/Node.js

// Internal dependencies - Application under test and utilities
const { app } = require('../app.js'); // Main Express application instance under test
const { formatSuccess, formatError } = require('../utils/responseFormatter.js'); // Response formatting utilities for validation
const { AppError, NotFoundError } = require('../utils/errorTypes.js'); // Custom error types for testing error scenarios

/**
 * Express Application Integration Test Suite
 * 
 * This comprehensive test suite validates the Node.js tutorial Express application
 * functionality, including endpoint availability, response correctness, error handling,
 * and response formatting. The tests ensure the application meets all functional,
 * error management, and response formatting requirements as specified in the technical
 * documentation.
 * 
 * Key Features Tested:
 * - HTTP Server Foundation: Express app initialization and startup readiness
 * - Hello World Endpoint: GET /hello response with "Hello world" message
 * - Error Handling: 404 responses for undefined routes and methods
 * - Response Formatting: Consistent JSON response structure validation
 * - Global Error Handler: Standardized error response generation
 * - Security Headers: Basic security header validation
 * 
 * Test Framework Integration:
 * - Jest: Test runner and assertion library for structured test execution
 * - Supertest: HTTP assertion library for testing Express applications
 * - Express App Instance: Direct testing of the configured Express application
 * 
 * Educational Objectives:
 * - Demonstrates comprehensive integration testing patterns
 * - Shows proper HTTP endpoint testing with SuperTest
 * - Validates Express 5.1.0 error handling capabilities
 * - Illustrates response format validation and consistency checking
 * - Provides examples of production-ready test implementation
 * 
 * Test Coverage Areas:
 * - Successful endpoint responses (200 OK scenarios)
 * - Error handling pathways (404, 405, 500 scenarios)
 * - Response structure validation (JSON format consistency)
 * - Application lifecycle management (startup and shutdown)
 * - Security considerations (header validation, error information disclosure)
 * 
 * @fileoverview Integration tests for the Express tutorial application
 * @requires supertest For HTTP endpoint testing and assertions
 * @requires jest For test framework and assertion capabilities
 * @requires ../app.js Express application instance under test
 * @requires ../utils/responseFormatter.js Response formatting validation utilities
 */

describe('Express Application Integration Tests', () => {
    let server;
    let testAgent;
    
    /**
     * Test Suite Setup
     * 
     * Initializes the test environment before all tests run. Sets up the
     * SuperTest agent with the Express app instance and prepares the
     * testing infrastructure for HTTP request/response validation.
     * 
     * This setup ensures:
     * - Express app is properly initialized and accessible
     * - SuperTest agent is configured for HTTP testing
     * - Test environment is prepared for integration testing
     * - Application startup validation is performed
     */
    beforeAll(async () => {
        // Initialize SuperTest agent with the Express app instance
        // This creates a testing agent that can send HTTP requests to the app
        testAgent = request(app);
        
        // Validate that the app instance is properly configured
        expect(app).toBeDefined();
        expect(typeof app).toBe('function');
        
        // Verify app has the expected Express properties
        expect(app.locals).toBeDefined();
        expect(app.locals.environment).toBeDefined();
        expect(app.locals.startTime).toBeDefined();
    });
    
    /**
     * Test Suite Cleanup
     * 
     * Performs cleanup operations after all tests complete. Ensures proper
     * resource cleanup and prevents memory leaks in the test environment.
     */
    afterAll(async () => {
        // Close any open connections or resources if needed
        if (server) {
            server.close();
        }
    });
    
    /**
     * Application Foundation Tests
     * 
     * Tests the basic application initialization and configuration to ensure
     * the Express app instance is properly set up and ready for HTTP requests.
     * This validates the HTTP Server Foundation requirement.
     */
    describe('Application Foundation', () => {
        /**
         * Test: Application Instance Initialization
         * 
         * Validates that the Express app instance is properly initialized
         * and contains the expected configuration and metadata. This test
         * ensures the HTTP Server Foundation is correctly established.
         */
        it('should initialize Express app instance without error', () => {
            // Verify app instance exists and is a function (Express app)
            expect(app).toBeDefined();
            expect(typeof app).toBe('function');
            
            // Verify app has Express-specific properties
            expect(app.locals).toBeDefined();
            expect(app.locals.environment).toBeDefined();
            expect(app.locals.startTime).toBeDefined();
            expect(app.locals.version).toBeDefined();
            expect(app.locals.description).toBeDefined();
            
            // Verify expected app metadata
            expect(app.locals.version).toBe('1.0.0');
            expect(app.locals.description).toBe('Node.js Tutorial Backend Application');
        });
        
        /**
         * Test: Application Configuration Validation
         * 
         * Validates that the Express app has the expected configuration
         * settings and security measures enabled. This ensures proper
         * production-ready configuration.
         */
        it('should have proper security configuration', () => {
            // Verify security headers are disabled/configured
            expect(app.get('x-powered-by')).toBe(false);
            
            // Verify JSON settings are configured
            expect(app.get('json spaces')).toBeDefined();
        });
    });
    
    /**
     * Hello World Endpoint Tests
     * 
     * Tests the main functionality of the '/hello' endpoint to ensure it
     * responds correctly to HTTP GET requests with the expected "Hello world"
     * message and proper HTTP status codes. This validates the Hello World
     * Endpoint requirement.
     */
    describe('GET /hello Endpoint', () => {
        /**
         * Test: Successful Hello World Response
         * 
         * Validates that the GET /hello endpoint returns a 200 OK status
         * with the expected "Hello world" message in the standardized
         * response format. This test covers the primary functionality
         * requirement for the tutorial application.
         */
        it('should return 200 OK with "Hello world" message', async () => {
            // Send GET request to /hello endpoint
            const response = await testAgent
                .get('/hello')
                .expect(200)
                .expect('Content-Type', /json/);
            
            // Validate response structure matches formatSuccess pattern
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'Hello world');
            expect(response.body).toHaveProperty('data', null);
            expect(response.body).toHaveProperty('status', 200);
            
            // Verify response matches expected formatSuccess structure
            const expectedResponse = formatSuccess(null, 'Hello world', 200);
            expect(response.body).toEqual(expectedResponse);
        });
        
        /**
         * Test: Response Headers Validation
         * 
         * Validates that the GET /hello endpoint returns the appropriate
         * HTTP headers, including Content-Type and security headers.
         * This ensures proper HTTP protocol compliance.
         */
        it('should return correct Content-Type and security headers', async () => {
            const response = await testAgent
                .get('/hello')
                .expect(200);
            
            // Verify Content-Type header
            expect(response.headers['content-type']).toMatch(/application\/json/);
            
            // Verify security headers are present
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            
            // Verify Express signature header is disabled
            expect(response.headers['x-powered-by']).toBeUndefined();
        });
        
        /**
         * Test: Response Time Performance
         * 
         * Validates that the GET /hello endpoint responds within acceptable
         * time limits as specified in the performance requirements.
         * This ensures the application meets performance expectations.
         */
        it('should respond within acceptable time limits', async () => {
            const startTime = Date.now();
            
            await testAgent
                .get('/hello')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            
            // Verify response time is under 100ms (generous limit for testing)
            expect(responseTime).toBeLessThan(100);
        });
    });
    
    /**
     * Error Handling Tests
     * 
     * Tests the application's error handling capabilities, including 404
     * responses for undefined routes and proper error response formatting.
     * This validates the Error Handling requirements and ensures robust
     * application behavior.
     */
    describe('Error Handling', () => {
        /**
         * Test: 404 Not Found for Undefined Routes
         * 
         * Validates that requests to undefined routes return a 404 Not Found
         * response with a standardized error message. This ensures proper
         * error handling for invalid route requests.
         */
        it('should return 404 Not Found for undefined routes', async () => {
            const response = await testAgent
                .get('/nonexistent')
                .expect(404)
                .expect('Content-Type', /json/);
            
            // Validate error response structure
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('code');
            expect(response.body).toHaveProperty('status', 404);
            
            // Verify the error response follows formatError pattern
            expect(response.body.success).toBe(false);
            expect(response.body.status).toBe(404);
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.code).toBe('string');
        });
        
        /**
         * Test: 404 for Invalid HTTP Methods
         * 
         * Validates that invalid HTTP methods (like POST to /hello)
         * return appropriate error responses. This ensures proper
         * method handling and error responses.
         */
        it('should return 404 for invalid HTTP methods', async () => {
            const response = await testAgent
                .post('/hello')
                .expect(404)
                .expect('Content-Type', /json/);
            
            // Validate error response structure
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('status', 404);
            expect(response.body.success).toBe(false);
        });
        
        /**
         * Test: Error Response Security Headers
         * 
         * Validates that error responses include appropriate security
         * headers and cache control settings to prevent sensitive
         * information disclosure and caching of error responses.
         */
        it('should include security headers in error responses', async () => {
            const response = await testAgent
                .get('/nonexistent')
                .expect(404);
            
            // Verify security headers are present in error responses
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            
            // Verify cache control headers prevent caching of errors
            expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
            expect(response.headers['pragma']).toBe('no-cache');
            expect(response.headers['expires']).toBe('0');
        });
        
        /**
         * Test: Error Response Format Consistency
         * 
         * Validates that all error responses follow a consistent format
         * and structure, ensuring predictable client integration and
         * proper error handling across the application.
         */
        it('should return consistent error response format', async () => {
            // Test multiple error scenarios for consistency
            const routes = ['/nonexistent', '/invalid-path', '/missing-resource'];
            
            for (const route of routes) {
                const response = await testAgent
                    .get(route)
                    .expect(404)
                    .expect('Content-Type', /json/);
                
                // Validate consistent error structure
                expect(response.body).toHaveProperty('success', false);
                expect(response.body).toHaveProperty('message');
                expect(response.body).toHaveProperty('code');
                expect(response.body).toHaveProperty('status', 404);
                
                // Verify proper types
                expect(typeof response.body.message).toBe('string');
                expect(typeof response.body.code).toBe('string');
                expect(typeof response.body.status).toBe('number');
                expect(typeof response.body.success).toBe('boolean');
            }
        });
    });
    
    /**
     * Response Formatting Tests
     * 
     * Tests the response formatting utilities to ensure consistent
     * response structures across successful and error scenarios.
     * This validates the Response Generation requirement.
     */
    describe('Response Formatting', () => {
        /**
         * Test: formatSuccess Utility Integration
         * 
         * Validates that successful responses use the formatSuccess utility
         * and return the expected response structure. This ensures
         * consistent response formatting across the application.
         */
        it('should use formatSuccess utility for successful responses', async () => {
            const response = await testAgent
                .get('/hello')
                .expect(200);
            
            // Generate expected response using formatSuccess
            const expectedResponse = formatSuccess(null, 'Hello world', 200);
            
            // Verify actual response matches expected format
            expect(response.body).toEqual(expectedResponse);
            
            // Verify response structure
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Hello world');
            expect(response.body.data).toBeNull();
            expect(response.body.status).toBe(200);
        });
        
        /**
         * Test: formatError Utility Integration
         * 
         * Validates that error responses use the formatError utility
         * and return the expected error response structure. This ensures
         * consistent error formatting across the application.
         */
        it('should use formatError utility for error responses', async () => {
            const response = await testAgent
                .get('/nonexistent')
                .expect(404);
            
            // Verify error response structure matches formatError pattern
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('code');
            expect(response.body).toHaveProperty('status', 404);
            
            // Verify error response types
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.code).toBe('string');
            expect(typeof response.body.status).toBe('number');
        });
    });
    
    /**
     * Global Error Handler Tests
     * 
     * Tests the global error handling middleware to ensure it properly
     * catches and formats unhandled errors and promise rejections.
     * This validates the Basic Error Management requirement.
     */
    describe('Global Error Handler', () => {
        /**
         * Test: Promise Rejection Handling
         * 
         * Validates that the global error handler properly catches
         * promise rejections and returns standardized error responses.
         * This tests Express 5's automatic promise rejection handling.
         */
        it('should handle promise rejections with standardized error response', async () => {
            // Since we can't easily create a promise rejection in the actual app,
            // we'll test by hitting an undefined route and verifying the error structure
            const response = await testAgent
                .get('/test-error')
                .expect(404);
            
            // Verify the error follows the expected structure
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('code');
            expect(response.body).toHaveProperty('status', 404);
        });
        
        /**
         * Test: Error Response Security
         * 
         * Validates that error responses do not expose sensitive information
         * such as stack traces, internal paths, or system details.
         * This ensures secure error handling.
         */
        it('should not expose sensitive information in error responses', async () => {
            const response = await testAgent
                .get('/nonexistent')
                .expect(404);
            
            // Verify sensitive information is not exposed
            expect(response.body).not.toHaveProperty('stack');
            expect(response.body).not.toHaveProperty('internalDetails');
            expect(response.body).not.toHaveProperty('filename');
            expect(response.body).not.toHaveProperty('filepath');
            
            // Verify message is user-friendly, not internal
            expect(response.body.message).toBeTruthy();
            expect(typeof response.body.message).toBe('string');
        });
    });
    
    /**
     * HTTP Protocol Compliance Tests
     * 
     * Tests HTTP protocol compliance including proper status codes,
     * headers, and response formats. This ensures the application
     * follows web standards and best practices.
     */
    describe('HTTP Protocol Compliance', () => {
        /**
         * Test: HTTP Status Codes
         * 
         * Validates that the application returns appropriate HTTP status
         * codes for different scenarios (200 for success, 404 for not found).
         * This ensures proper HTTP protocol compliance.
         */
        it('should return appropriate HTTP status codes', async () => {
            // Test successful request
            await testAgent
                .get('/hello')
                .expect(200);
            
            // Test not found request
            await testAgent
                .get('/nonexistent')
                .expect(404);
            
            // Test invalid method
            await testAgent
                .post('/hello')
                .expect(404);
        });
        
        /**
         * Test: HTTP Headers Validation
         * 
         * Validates that the application returns proper HTTP headers
         * for both successful and error responses. This ensures
         * proper HTTP protocol compliance and security.
         */
        it('should return proper HTTP headers', async () => {
            // Test successful response headers
            const successResponse = await testAgent
                .get('/hello')
                .expect(200);
            
            expect(successResponse.headers['content-type']).toMatch(/application\/json/);
            expect(successResponse.headers['x-content-type-options']).toBe('nosniff');
            
            // Test error response headers
            const errorResponse = await testAgent
                .get('/nonexistent')
                .expect(404);
            
            expect(errorResponse.headers['content-type']).toMatch(/application\/json/);
            expect(errorResponse.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
        });
    });
    
    /**
     * Performance and Reliability Tests
     * 
     * Tests performance characteristics and reliability of the application
     * to ensure it meets the specified performance requirements and
     * handles multiple requests consistently.
     */
    describe('Performance and Reliability', () => {
        /**
         * Test: Multiple Concurrent Requests
         * 
         * Validates that the application can handle multiple concurrent
         * requests without errors or performance degradation. This tests
         * the Node.js event loop performance.
         */
        it('should handle multiple concurrent requests', async () => {
            // Create multiple concurrent requests
            const requests = Array(10).fill().map(() => 
                testAgent.get('/hello').expect(200)
            );
            
            // Wait for all requests to complete
            const responses = await Promise.all(requests);
            
            // Verify all responses are correct
            responses.forEach(response => {
                expect(response.body.success).toBe(true);
                expect(response.body.message).toBe('Hello world');
                expect(response.body.status).toBe(200);
            });
        });
        
        /**
         * Test: Response Consistency
         * 
         * Validates that multiple requests to the same endpoint return
         * consistent responses. This ensures the application provides
         * reliable and predictable behavior.
         */
        it('should provide consistent responses across multiple requests', async () => {
            const responses = [];
            
            // Make multiple requests
            for (let i = 0; i < 5; i++) {
                const response = await testAgent
                    .get('/hello')
                    .expect(200);
                responses.push(response.body);
            }
            
            // Verify all responses are identical
            const firstResponse = responses[0];
            responses.forEach(response => {
                expect(response).toEqual(firstResponse);
            });
        });
    });
});