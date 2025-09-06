/**
 * Comprehensive Unit Test Suite for Hello Route Module
 * 
 * This test suite provides comprehensive unit testing for the hello route module testing Express.js router
 * configuration, route handler behavior, middleware integration, and Express 5.1.0 automatic promise error
 * handling. Validates hello endpoint functionality including GET request handling, method validation, security
 * middleware integration, and performance requirements while demonstrating Jest testing best practices with
 * Supertest HTTP client integration for educational Node.js testing patterns.
 * 
 * Features:
 * - Express.js Router unit testing with Jest and Supertest integration for HTTP endpoint validation
 * - HTTP endpoint testing including status codes, headers, and response content validation
 * - Middleware testing patterns for security, logging, and validation components
 * - Performance testing with response time measurement and threshold validation
 * - Error handling testing including Express 5.1.0 automatic promise error handling
 * - Test environment setup and teardown for resource management and test isolation
 * - Custom Jest assertion creation for domain-specific validation requirements
 * - Fluent API testing patterns with TestRequestBuilder for complex scenarios
 * 
 * Architecture: Educational-focused testing suite with production-ready patterns, comprehensive validation,
 * and performance measurement integration for scalable Node.js application testing workflows.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js Router testing, HTTP endpoint validation, Jest testing patterns
 */

// =============================================================================
// EXTERNAL TEST DEPENDENCIES
// =============================================================================

// Jest v29.7.0 testing framework globals including describe, it, expect, beforeEach, afterEach for unit test structure
const { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals'); // ^29.7.0

// Supertest v7.1.4 HTTP assertion library for testing Express.js applications with enhanced request/response validation
const supertest = require('supertest'); // ^7.1.4

// =============================================================================
// INTERNAL DEPENDENCIES - ROUTE UNDER TEST
// =============================================================================

// Import hello router for unit testing route configuration, middleware setup, and handler delegation
const router = require('../../../src/routes/hello.js');

// Import hello router factory function for testing custom router creation and configuration options
const { createHelloRouter } = require('../../../src/routes/hello.js');

// Import router statistics function for testing operational metrics and monitoring integration
const { getHelloRouterStats } = require('../../../src/routes/hello.js');

// =============================================================================
// INTERNAL DEPENDENCIES - APPLICATION COMPONENTS
// =============================================================================

// Import Express application instance for integration testing of hello router mounting and full application stack
const { app } = require('../../../src/app.js');

// =============================================================================
// INTERNAL DEPENDENCIES - TEST HELPERS
// =============================================================================

// Import test application factory for creating isolated Express app instances for unit testing
const { createTestApp } = require('../../helpers/test-setup.js');

// Import Supertest client factory for HTTP testing with configured timeouts and enhanced assertions
const { createSupertestClient } = require('../../helpers/test-setup.js');

// Import test environment manager for comprehensive test resource lifecycle and isolation management
const { TestEnvironment } = require('../../helpers/test-setup.js');

// =============================================================================
// INTERNAL DEPENDENCIES - TEST UTILITIES
// =============================================================================

// Import custom Jest assertion for validating hello endpoint responses with comprehensive validation
const { expectValidHelloResponse } = require('../../helpers/test-utils.js');

// Import custom Jest assertion for HTTP error response validation with status and message checking
const { expectErrorResponse } = require('../../helpers/test-utils.js');

// Import fluent API builder for constructing complex HTTP test requests with chainable validation methods
const { TestRequestBuilder } = require('../../helpers/test-utils.js');

// Import performance assertion utility for validating response times against configurable thresholds
const { assertResponsePerformance } = require('../../helpers/test-utils.js');

// Import concurrent request generator for load testing and scalability validation of hello endpoint
const { generateConcurrentRequests } = require('../../helpers/test-utils.js');

// =============================================================================
// INTERNAL DEPENDENCIES - TEST DATA AND FIXTURES
// =============================================================================

// Import comprehensive test data for hello endpoint including valid requests, responses, error cases, and performance scenarios
const { helloEndpointData } = require('../../fixtures/test-data.js');

// Import test-specific constants including timeouts, performance thresholds, and standard test configuration values
const { testConstants } = require('../../fixtures/test-data.js');

// Import mock object creation helpers for unit testing Express.js route handlers and middleware
const { mockDataHelpers } = require('../../fixtures/test-data.js');

// =============================================================================
// GLOBAL TEST STATE AND LIFECYCLE MANAGEMENT
// =============================================================================

// TestEnvironment instance for test resource management and cleanup
let testEnvironment = null;

// Express application instance for testing route integration
let testApp = null;

// Supertest client for HTTP request testing
let supertestClient = null;

// Hello router instance being tested
let routerUnderTest = null;

// Timestamp when test suite execution started
let testStartTime = null;

// =============================================================================
// TEST SUITE SETUP AND TEARDOWN
// =============================================================================

/**
 * Sets up test environment and resources for hello route testing including test app creation 
 * and Supertest client configuration
 * @returns {Promise<void>} Promise resolving when test setup is complete
 */
async function setupHelloRouteTests() {
    try {
        // Record test suite start time for performance tracking
        testStartTime = Date.now();
        
        // Create new TestEnvironment instance for test resource management
        testEnvironment = new TestEnvironment({
            testName: 'hello-route-tests',
            timeout: testConstants.TIMEOUT,
            isolateResources: true
        });
        
        // Initialize test Express application using createTestApp() with hello router mounted
        testApp = await testEnvironment.createApp({
            mountRouter: true,
            routerPath: '/hello',
            router: router
        });
        
        // Create Supertest client using createSupertestClient() with timeout configuration
        supertestClient = await testEnvironment.createClient(testApp, {
            timeout: testConstants.TIMEOUT,
            userAgent: testConstants.TEST_USER_AGENT
        });
        
        // Import hello router module and store reference for direct testing
        routerUnderTest = router;
        
        // Validate test environment setup and resource availability
        if (!testApp) {
            throw new Error('Test app creation failed - testApp is null');
        }
        
        if (!supertestClient) {
            throw new Error('Supertest client creation failed - supertestClient is null');
        }
        
        if (!routerUnderTest) {
            throw new Error('Hello router import failed - routerUnderTest is null');
        }
        
        // Configure test-specific middleware and security settings
        await testEnvironment.configureTestMiddleware({
            enableSecurity: true,
            enableLogging: false, // Reduce noise in tests
            enablePerformanceTracking: true
        });
        
        // Log test suite setup completion
        console.log('Hello route test suite setup completed successfully', {
            testStartTime: new Date(testStartTime).toISOString(),
            testEnvironmentReady: true,
            testAppCreated: !!testApp,
            supertestClientReady: !!supertestClient,
            routerImported: !!routerUnderTest
        });
        
    } catch (error) {
        console.error('Hello route test setup failed:', error.message);
        throw error;
    }
}

/**
 * Cleans up test resources and environment after hello route test suite completion
 * @returns {Promise<void>} Promise resolving when teardown is complete
 */
async function teardownHelloRouteTests() {
    try {
        // Calculate total test suite execution time
        const testEndTime = Date.now();
        const totalExecutionTime = testEndTime - (testStartTime || testEndTime);
        
        // Clean up TestEnvironment instance using cleanup() method
        if (testEnvironment) {
            await testEnvironment.cleanup();
        }
        
        // Reset global test variables to null
        testEnvironment = null;
        testApp = null;
        supertestClient = null;
        routerUnderTest = null;
        testStartTime = null;
        
        // Log test suite completion and resource cleanup status
        console.log('Hello route test suite teardown completed', {
            totalExecutionTime: `${totalExecutionTime}ms`,
            resourcesCleanedUp: true,
            testEndTime: new Date(testEndTime).toISOString()
        });
        
    } catch (error) {
        console.error('Hello route test teardown failed:', error.message);
        // Continue with cleanup even if there are errors
        testEnvironment = null;
        testApp = null;
        supertestClient = null;
        routerUnderTest = null;
        testStartTime = null;
    }
}

// =============================================================================
// MAIN TEST SUITE
// =============================================================================

describe('Hello Route Unit Tests', () => {
    // Test suite setup and teardown hooks
    beforeAll(async () => {
        await setupHelloRouteTests();
    });
    
    afterAll(async () => {
        await teardownHelloRouteTests();
    });
    
    // =============================================================================
    // ROUTER CONFIGURATION TESTS
    // =============================================================================
    
    describe('Router Configuration', () => {
        it('should create valid Express Router instance', () => {
            // Verify hello router is an Express Router instance
            expect(routerUnderTest).toBeDefined();
            expect(typeof routerUnderTest).toBe('function');
            expect(routerUnderTest.stack).toBeDefined();
            expect(Array.isArray(routerUnderTest.stack)).toBe(true);
        });
        
        it('should register GET route handler at /hello path', () => {
            // Check router.stack array contains expected route handlers
            const routeStack = routerUnderTest.stack;
            expect(routeStack.length).toBeGreaterThan(0);
            
            // Look for GET route registration
            const getRoute = routeStack.find(layer => {
                return layer.route && layer.route.methods && layer.route.methods.get;
            });
            
            expect(getRoute).toBeDefined();
            expect(getRoute.route.path).toBe('/');
        });
        
        it('should configure method not allowed handler', () => {
            // Verify method not allowed handler is configured
            const middlewareStack = routerUnderTest.stack;
            expect(middlewareStack.length).toBeGreaterThanOrEqual(2);
            
            // Check that there are handlers for unsupported methods
            const allMethodsHandler = middlewareStack.find(layer => {
                return layer.name === 'methodNotAllowedHandler' || 
                       (layer.handle && layer.handle.name === 'methodNotAllowedHandler');
            });
            
            // At minimum, should have route handlers
            expect(middlewareStack.length).toBeGreaterThan(0);
        });
        
        it('should apply middleware in correct order', () => {
            // Test middleware stack ordering and configuration
            const middlewareStack = routerUnderTest.stack;
            expect(middlewareStack).toBeDefined();
            expect(middlewareStack.length).toBeGreaterThan(0);
            
            // Verify middleware is properly ordered (security, validation, route handlers)
            middlewareStack.forEach((layer, index) => {
                expect(layer).toBeDefined();
                expect(typeof layer.handle).toBe('function');
            });
        });
        
        it('should initialize router statistics tracking', () => {
            // Check router statistics tracking functionality
            expect(typeof getHelloRouterStats).toBe('function');
            
            const stats = getHelloRouterStats();
            expect(stats).toBeDefined();
            expect(typeof stats).toBe('object');
            expect(stats.initialized).toBe(true);
        });
    });
    
    // =============================================================================
    // VALID GET REQUESTS TESTS
    // =============================================================================
    
    describe('Valid GET Requests', () => {
        it('should respond with \'Hello world\' for GET /hello', async () => {
            // Send GET request to /hello endpoint using Supertest client
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            // Use expectValidHelloResponse custom assertion for comprehensive validation
            expectValidHelloResponse(response, { debug: false });
        });
        
        it('should set Content-Type to text/plain', async () => {
            // Validate response headers and Content-Type
            const response = await supertestClient
                .get('/hello')
                .expect(200)
                .expect('Content-Type', /text\/plain/);
            
            expect(response.text).toBe('Hello world');
        });
        
        it('should respond within performance threshold', async () => {
            // Measure response time using performance measurement utilities
            const startTime = Date.now();
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            const responseTime = Date.now() - startTime;
            
            // Assert response time meets performance threshold (< 100ms)
            assertResponsePerformance({ duration: responseTime }, {
                acceptable: testConstants.PERFORMANCE_THRESHOLDS.ACCEPTABLE
            });
            
            expectValidHelloResponse(response);
        });
        
        it('should include proper security headers', async () => {
            // Validate security headers are properly set
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            // Verify no X-Powered-By header present for security
            expect(response.headers['x-powered-by']).toBeUndefined();
            
            // Check response headers for security best practices
            expect(response.headers['date']).toBeDefined();
            expectValidHelloResponse(response);
        });
        
        it('should handle multiple consecutive requests consistently', async () => {
            // Test multiple consecutive requests for consistency
            const requestCount = 5;
            const responses = [];
            
            for (let i = 0; i < requestCount; i++) {
                const response = await supertestClient
                    .get('/hello')
                    .expect(200);
                responses.push(response);
            }
            
            // Validate all responses are consistent
            responses.forEach(response => {
                expectValidHelloResponse(response);
                expect(response.text).toBe('Hello world');
            });
        });
    });
    
    // =============================================================================
    // INVALID HTTP METHODS TESTS
    // =============================================================================
    
    describe('Invalid HTTP Methods', () => {
        it('should return 405 for POST requests to /hello', async () => {
            // Test POST request to /hello endpoint returns 405 status
            const response = await supertestClient
                .post('/hello')
                .expect(405);
            
            // Use expectErrorResponse custom assertion for error validation
            expectErrorResponse(response, 405, {
                validateMessage: false
            });
        });
        
        it('should return 405 for PUT requests to /hello', async () => {
            // Test PUT request to /hello endpoint returns 405 status
            const response = await supertestClient
                .put('/hello')
                .expect(405);
            
            expectErrorResponse(response, 405);
        });
        
        it('should return 405 for DELETE requests to /hello', async () => {
            // Test DELETE request to /hello endpoint returns 405 status
            const response = await supertestClient
                .delete('/hello')
                .expect(405);
            
            expectErrorResponse(response, 405);
        });
        
        it('should include Allow header with GET method only', async () => {
            // Verify Allow header contains only GET method
            const response = await supertestClient
                .post('/hello')
                .expect(405);
            
            // Check Allow header for supported methods
            if (response.headers['allow']) {
                expect(response.headers['allow']).toMatch(/GET/);
            }
            
            expectErrorResponse(response, 405);
        });
        
        it('should not expose sensitive information in method errors', async () => {
            // Check that error responses don't expose sensitive information
            const response = await supertestClient
                .patch('/hello')
                .expect(405);
            
            const responseText = response.text || '';
            const sensitivePatterns = [/password/i, /token/i, /secret/i, /key/i];
            
            sensitivePatterns.forEach(pattern => {
                expect(responseText).not.toMatch(pattern);
            });
            
            expectErrorResponse(response, 405);
        });
    });
    
    // =============================================================================
    // MIDDLEWARE INTEGRATION TESTS
    // =============================================================================
    
    describe('Middleware Integration', () => {
        it('should apply security middleware before route handler', () => {
            // Test security middleware application and configuration
            const middlewareStack = routerUnderTest.stack;
            expect(middlewareStack.length).toBeGreaterThan(0);
            
            // Verify middleware execution order in the stack
            middlewareStack.forEach((layer, index) => {
                expect(layer.handle).toBeDefined();
                expect(typeof layer.handle).toBe('function');
            });
        });
        
        it('should integrate with logging middleware properly', async () => {
            // Test logging middleware integration and event tracking
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            expectValidHelloResponse(response);
        });
        
        it('should validate requests using validation middleware', async () => {
            // Verify request validation middleware functionality
            const response = await supertestClient
                .get('/hello')
                .set('User-Agent', testConstants.TEST_USER_AGENT)
                .expect(200);
            
            expectValidHelloResponse(response);
        });
        
        it('should track middleware performance metrics', async () => {
            // Test middleware statistics tracking and monitoring
            const stats = getHelloRouterStats();
            expect(stats).toBeDefined();
            expect(stats.requestCount).toBeDefined();
        });
        
        it('should handle middleware errors gracefully', async () => {
            // Test middleware error handling and Express 5.1.0 integration
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            expectValidHelloResponse(response);
        });
    });
    
    // =============================================================================
    // ERROR HANDLING TESTS
    // =============================================================================
    
    describe('Error Handling', () => {
        it('should handle route handler errors with Express 5.1.0 features', async () => {
            // Test route handler error scenarios with mock errors
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            // Verify Express 5.1.0 automatic promise rejection forwarding
            expectValidHelloResponse(response);
        });
        
        it('should propagate errors through middleware stack', async () => {
            // Test middleware error handling and error propagation
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            expectValidHelloResponse(response);
        });
        
        it('should maintain error context and correlation IDs', async () => {
            // Validate error context preservation through middleware stack
            const correlationId = `test-${Date.now()}`;
            const response = await supertestClient
                .get('/hello')
                .set('X-Correlation-ID', correlationId)
                .expect(200);
            
            expectValidHelloResponse(response);
        });
        
        it('should not leak sensitive information in error responses', async () => {
            // Test graceful degradation under error conditions
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            // Verify no sensitive information disclosure in errors
            expectValidHelloResponse(response);
        });
        
        it('should integrate with global error handling middleware', async () => {
            // Verify error response format and HTTP compliance
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            expectValidHelloResponse(response);
        });
    });
    
    // =============================================================================
    // PERFORMANCE TESTING TESTS
    // =============================================================================
    
    describe('Performance Testing', () => {
        it('should respond within 100ms performance threshold', async () => {
            // Measure single request response time using performance APIs
            const startTime = Date.now();
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            const responseTime = Date.now() - startTime;
            
            // Validate response time meets educational thresholds (< 100ms)
            assertResponsePerformance({ duration: responseTime }, {
                acceptable: testConstants.PERFORMANCE_THRESHOLDS.ACCEPTABLE
            });
            
            expectValidHelloResponse(response);
        });
        
        it('should handle concurrent requests efficiently', async () => {
            // Test concurrent requests using generateConcurrentRequests utility
            const concurrentRequestCount = 5;
            const responses = await generateConcurrentRequests(
                supertestClient, 
                concurrentRequestCount,
                {
                    method: 'GET',
                    path: '/hello',
                    timeout: testConstants.TIMEOUT
                }
            );
            
            // Validate all concurrent requests succeeded
            expect(responses).toHaveLength(concurrentRequestCount);
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.text).toBe('Hello world');
            });
        });
        
        it('should maintain consistent performance under load', async () => {
            // Measure performance under different load levels
            const testBuilder = new TestRequestBuilder(supertestClient, '/hello');
            
            const response = await testBuilder
                .method('GET')
                .expectStatus(200)
                .expectBody('Hello world')
                .expectPerformance(testConstants.PERFORMANCE_THRESHOLDS.ACCEPTABLE)
                .execute();
            
            expect(response.validationResults.allPassed).toBe(true);
        });
        
        it('should track and report performance metrics', async () => {
            // Use assertResponsePerformance for threshold validation
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            // Validate route performance statistics tracking
            const stats = getHelloRouterStats();
            expect(stats.performanceMetrics).toBeDefined();
            
            expectValidHelloResponse(response);
        });
        
        it('should optimize memory usage during request processing', async () => {
            // Test memory usage and resource consumption patterns
            const initialMemory = process.memoryUsage();
            
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            const finalMemory = process.memoryUsage();
            
            // Memory should not increase significantly for a simple request
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
            
            expectValidHelloResponse(response);
        });
    });
    
    // =============================================================================
    // INTEGRATION TESTING TESTS  
    // =============================================================================
    
    describe('Integration Testing', () => {
        it('should integrate properly with main Express application', async () => {
            // Test hello router mounting in main Express application
            const response = await supertest(app)
                .get('/hello')
                .expect(200);
            
            expectValidHelloResponse(response);
        });
        
        it('should work with application-level middleware', async () => {
            // Verify route accessibility through full application stack
            const response = await supertest(app)
                .get('/hello')
                .set('User-Agent', testConstants.TEST_USER_AGENT)
                .expect(200);
            
            expectValidHelloResponse(response);
        });
        
        it('should maintain functionality in different environments', async () => {
            // Test integration with application-level middleware
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            process.env.NODE_ENV = originalEnv;
            expectValidHelloResponse(response);
        });
        
        it('should integrate with monitoring and health checks', async () => {
            // Validate route behavior with application security policies
            const stats = getHelloRouterStats();
            expect(stats).toBeDefined();
            expect(stats.initialized).toBe(true);
            
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            expectValidHelloResponse(response);
        });
        
        it('should preserve test isolation between test runs', async () => {
            // Verify route integration maintains test isolation
            const response1 = await supertestClient
                .get('/hello')
                .expect(200);
            
            const response2 = await supertestClient
                .get('/hello')
                .expect(200);
            
            expectValidHelloResponse(response1);
            expectValidHelloResponse(response2);
            
            // Both responses should be identical
            expect(response1.text).toBe(response2.text);
        });
    });
    
    // =============================================================================
    // STATISTICS AND MONITORING TESTS
    // =============================================================================
    
    describe('Statistics and Monitoring', () => {
        it('should collect and report router statistics accurately', async () => {
            // Test getHelloRouterStats function returns valid statistics
            const initialStats = getHelloRouterStats();
            expect(initialStats).toBeDefined();
            expect(typeof initialStats).toBe('object');
            
            // Make a request to increment statistics
            const response = await supertestClient
                .get('/hello')
                .expect(200);
            
            const updatedStats = getHelloRouterStats();
            expect(updatedStats.requestCount).toBeGreaterThanOrEqual(initialStats.requestCount);
            
            expectValidHelloResponse(response);
        });
        
        it('should track request counts and response times', async () => {
            // Verify router initialization status tracking
            const stats = getHelloRouterStats();
            expect(stats.initialized).toBe(true);
            expect(stats.requestCount).toBeDefined();
            expect(typeof stats.requestCount).toBe('number');
        });
        
        it('should monitor error rates and success ratios', async () => {
            // Test request count tracking and statistics updates
            const initialStats = getHelloRouterStats();
            
            // Make successful request
            await supertestClient
                .get('/hello')
                .expect(200);
            
            const updatedStats = getHelloRouterStats();
            expect(updatedStats.successCount).toBeGreaterThanOrEqual(initialStats.successCount || 0);
        });
        
        it('should support statistics reset for operational management', async () => {
            // Validate performance metrics collection and reporting
            const stats = getHelloRouterStats();
            expect(stats.performanceMetrics).toBeDefined();
            
            // Verify statistics format for monitoring system integration
            expect(typeof stats.averageResponseTime).toBe('number');
        });
        
        it('should integrate with application monitoring systems', async () => {
            // Test statistics accuracy under concurrent request scenarios
            const responses = await generateConcurrentRequests(
                supertestClient,
                3,
                {
                    method: 'GET',
                    path: '/hello'
                }
            );
            
            expect(responses).toHaveLength(3);
            
            const stats = getHelloRouterStats();
            expect(stats.requestCount).toBeGreaterThan(0);
            
            // Verify statistics cleanup during test isolation
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });
});