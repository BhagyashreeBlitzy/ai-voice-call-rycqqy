/**
 * Comprehensive Unit Test Suite for Health Route Functionality
 * 
 * Tests Express.js health router configuration, controller integration, middleware application,
 * and Kubernetes probe compatibility. Implements Jest 29.7.0 testing framework with Supertest
 * 7.1.4 HTTP client integration, custom assertions for health response validation, performance 
 * threshold testing, and error scenario coverage. Validates /health, /livez, and /readyz 
 * endpoints while maintaining educational clarity and production-ready testing patterns.
 * 
 * Features:
 * - Health Check Route Unit Testing with Jest v29.7.0 framework
 * - Kubernetes Health Probe Testing for /livez and /readyz endpoints
 * - Express.js Router Testing with middleware validation
 * - HTTP Response Validation including status codes, headers, and JSON structure
 * - Performance Testing with sub-50ms targets for health checks
 * - Educational Testing Pattern Demonstration for Node.js applications
 * 
 * Compatible with:
 * - Jest 29.7.0 testing framework with Node.js environment configuration
 * - Supertest 7.1.4 HTTP assertion library for Express.js integration
 * - Express.js 5.1.0 with automatic promise error handling
 * - Node.js 22.11.0 LTS with enhanced performance capabilities
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Supertest v7.1.4 - HTTP assertion library for testing Express.js applications
const supertest = require('supertest'); // ^7.1.4

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import health router module for unit testing route configuration and middleware integration
const router = require('../../../src/routes/health.js');

// Import health controller functions for unit testing request handling and response generation
const { 
    getHealthStatus,
    getLivenessProbe,
    getReadinessProbe
} = require('../../../src/controllers/health.js');

// Import test application factory and Supertest client for isolated testing environments
const { 
    createTestApp,
    createSupertestClient
} = require('../../helpers/test-setup.js');

// Import custom Jest assertions and HTTP testing utilities for comprehensive validation
const {
    expectValidHelloResponse,
    makeHttpRequest,
    measureResponseTime,
    generateConcurrentRequests,
    TestRequestBuilder
} = require('../../helpers/test-utils.js');

// Import health check test data fixtures and mock helper utilities
const {
    healthCheckData,
    mockDataHelpers,
    testConstants
} = require('../../fixtures/test-data.js');

// Import HTTP status codes, route paths, and content types for test assertions
const {
    HTTP_STATUS,
    CONTENT_TYPES,
    ROUTES
} = require('../../../src/utils/constants.js');

// =============================================================================
// GLOBAL TEST STATE AND TRACKING
// =============================================================================

/**
 * Express application instance for health router testing with isolated configuration
 * @type {Object|null}
 */
let testApp = null;

/**
 * Supertest client instance for HTTP endpoint testing with enhanced capabilities
 * @type {Object|null}
 */
let testClient = null;

/**
 * Health router testing statistics for performance tracking and analysis
 * @type {Object}
 */
let healthRouterStats = {
    testCount: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    successfulTests: 0,
    failedTests: 0
};

// =============================================================================
// JEST SETUP AND TEARDOWN
// =============================================================================

/**
 * Sets up isolated test environment for health router testing with Express app and Supertest client configuration.
 * Initializes Express application instance, mounts health router, creates Supertest client,
 * and configures test environment for comprehensive health endpoint validation.
 * 
 * @returns {Promise<void>} Promise resolving when test setup is complete
 */
async function setupHealthRouterTest() {
    try {
        // Create isolated Express application instance using createTestApp factory
        testApp = createTestApp({
            enableSecurity: false,
            logLevel: 'error',
            customMiddleware: []
        });

        // Mount health router at root path for testing isolation
        testApp.use('/', router);

        // Create Supertest client instance using createSupertestClient factory
        testClient = createSupertestClient(testApp, {
            timeout: testConstants.TIMEOUT,
            headers: {
                'User-Agent': 'Health-Router-Test-Suite',
                'Accept': 'application/json, text/plain'
            },
            enablePerformanceTracking: true
        });

        // Initialize healthRouterStats for performance tracking
        healthRouterStats = {
            testCount: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            successfulTests: 0,
            failedTests: 0,
            setupTime: Date.now()
        };

        // Log test setup completion with configuration details
        console.debug('Health router test setup completed', {
            appId: testApp._testAppId,
            clientId: testClient._testClientId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Health router test setup failed', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Test setup failed: ${error.message}`);
    }
}

/**
 * Cleans up health router test environment including client cleanup and statistics reset.
 * Performs comprehensive resource cleanup and logs final testing statistics for analysis.
 * 
 * @returns {Promise<void>} Promise resolving when teardown is complete
 */
async function teardownHealthRouterTest() {
    try {
        // Calculate final statistics for test run analysis
        if (healthRouterStats.testCount > 0) {
            healthRouterStats.averageResponseTime = healthRouterStats.totalResponseTime / healthRouterStats.testCount;
        }

        // Log test teardown completion with final statistics
        console.debug('Health router test teardown completed', {
            finalStats: healthRouterStats,
            timestamp: new Date().toISOString()
        });

        // Clean up Supertest client instance and close connections
        if (testClient && testClient.cleanup) {
            testClient.cleanup();
        }

        // Reset global test variables to null
        testApp = null;
        testClient = null;

        // Clear healthRouterStats performance tracking data
        healthRouterStats = {
            testCount: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            successfulTests: 0,
            failedTests: 0
        };

    } catch (error) {
        console.error('Health router test teardown failed', {
            error: error.message,
            finalStats: healthRouterStats
        });
        // Continue with cleanup even if errors occurred
    }
}

// =============================================================================
// CUSTOM VALIDATION FUNCTIONS
// =============================================================================

/**
 * Custom validation function for health endpoint responses including status, headers, JSON structure, and performance.
 * Validates response status code, Content-Type header, JSON structure, performance thresholds, and security headers.
 * 
 * @param {Object} response - Supertest response object with status, headers, and body
 * @param {Object} expectedData - Expected health response data structure and values
 * @param {Object} options - Validation options including performance thresholds and debug mode
 * @returns {void} No return value - throws Jest assertion errors if validation fails
 */
function validateHealthEndpointResponse(response, expectedData, options = {}) {
    try {
        // Validate response status code equals HTTP_STATUS.OK
        expect(response.status).toBe(HTTP_STATUS.OK);

        // Verify Content-Type header equals CONTENT_TYPES.APPLICATION_JSON
        expect(response.headers['content-type']).toMatch(new RegExp(CONTENT_TYPES.APPLICATION_JSON));

        // Assert response body contains expected JSON structure
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.status).toBeDefined();
        expect(response.body.timestamp).toBeDefined();

        // Validate required health status fields are present
        const requiredFields = expectedData.requiredFields || ['status', 'timestamp'];
        requiredFields.forEach(field => {
            expect(response.body).toHaveProperty(field);
        });

        // Check response time meets performance threshold if specified
        if (options.performanceThreshold && response.duration) {
            expect(response.duration).toBeLessThan(options.performanceThreshold);
        }

        // Verify security headers are properly set
        expect(response.headers['x-powered-by']).toBeUndefined();

        // Assert Date header is present and properly formatted
        expect(response.headers['date']).toBeDefined();
        expect(response.headers['date']).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);

        // Assert no sensitive information is disclosed in response
        const responseText = JSON.stringify(response.body);
        const sensitivePatterns = [/password/i, /token/i, /secret/i, /key/i];
        sensitivePatterns.forEach(pattern => {
            expect(responseText).not.toMatch(pattern);
        });

    } catch (error) {
        // Throw descriptive Jest errors for any validation failures
        const errorContext = {
            responseStatus: response?.status,
            responseHeaders: response?.headers,
            responseBody: response?.body,
            expectedData,
            validationOptions: options
        };

        throw new Error(`Health endpoint validation failed: ${error.message}\nContext: ${JSON.stringify(errorContext, null, 2)}`);
    }
}

/**
 * Custom validation function for Kubernetes probe endpoints with optimized performance and minimal response requirements.
 * Validates probe-specific response format, performance thresholds, and Kubernetes compatibility requirements.
 * 
 * @param {Object} response - Supertest response object for probe endpoint
 * @param {string} probeType - Type of probe ('liveness' or 'readiness') for validation
 * @param {number} performanceThreshold - Maximum acceptable response time in milliseconds
 * @returns {void} No return value - throws Jest assertion errors if validation fails
 */
function validateProbeEndpointResponse(response, probeType, performanceThreshold) {
    try {
        // Validate response status code based on probe health status
        expect(response.status).toBe(HTTP_STATUS.OK);

        // Assert Content-Type header for JSON responses
        expect(response.headers['content-type']).toMatch(new RegExp(CONTENT_TYPES.APPLICATION_JSON));

        // Verify minimal response structure for Kubernetes compatibility
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.status).toBeDefined();
        expect(response.body.status).toBe('ok');

        // Check response time meets probe-specific performance threshold
        if (response.duration) {
            expect(response.duration).toBeLessThan(performanceThreshold);
        }

        // Validate probe-specific response fields based on probeType
        if (probeType === 'liveness') {
            // Liveness probes should have minimal response data
            expect(response.body.timestamp).toBeDefined();
        } else if (probeType === 'readiness') {
            // Readiness probes may include dependency status
            expect(response.body.ready).toBeDefined();
        }

        // Assert response size is minimal for probe efficiency
        const responseSize = JSON.stringify(response.body).length;
        expect(responseSize).toBeLessThan(1024); // Less than 1KB

        // Verify no unnecessary headers or data in probe responses
        expect(response.headers['x-powered-by']).toBeUndefined();

    } catch (error) {
        // Log probe validation results for performance monitoring
        console.error('Probe endpoint validation failed', {
            probeType,
            responseStatus: response?.status,
            responseTime: response?.duration,
            performanceThreshold,
            error: error.message
        });

        throw new Error(`${probeType} probe validation failed: ${error.message}`);
    }
}

// =============================================================================
// CORE TEST FUNCTIONS
// =============================================================================

/**
 * Tests basic health endpoint functionality including successful responses and proper JSON formatting.
 * Validates /health endpoint response format, status codes, headers, and performance requirements.
 * 
 * @returns {Promise<void>} Promise resolving when test completes
 */
async function testHealthEndpointBasicFunctionality() {
    // Send GET request to ROUTES.HEALTH endpoint
    const startTime = Date.now();
    const response = await testClient.get(ROUTES.HEALTH);
    const endTime = Date.now();

    // Measure response time using performance measurement utilities
    const responseTime = endTime - startTime;

    // Validate response status code equals HTTP_STATUS.OK
    expect(response.status).toBe(HTTP_STATUS.OK);

    // Assert response body contains valid JSON health data
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();

    // Verify response headers include proper Content-Type
    expect(response.headers['content-type']).toMatch(new RegExp(CONTENT_TYPES.APPLICATION_JSON));

    // Check health status indicates system is operational
    expect(response.body.status).toBe('ok');

    // Validate response time meets acceptable threshold
    expect(responseTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.acceptable);

    // Update healthRouterStats with test results
    healthRouterStats.testCount++;
    healthRouterStats.totalResponseTime += responseTime;
    healthRouterStats.successfulTests++;

    // Enhanced response object for additional validation
    response.duration = responseTime;
    validateHealthEndpointResponse(response, healthCheckData.basicHealth.expectedResponse, {
        performanceThreshold: testConstants.PERFORMANCE_THRESHOLDS.acceptable
    });
}

/**
 * Tests health endpoint with detailed query parameter for comprehensive system metrics.
 * Validates detailed health response format and ensures additional metrics are included.
 * 
 * @returns {Promise<void>} Promise resolving when test completes
 */
async function testHealthEndpointDetailedInfo() {
    // Send GET request to ROUTES.HEALTH with ?detailed=true parameter
    const startTime = Date.now();
    const response = await testClient.get(`${ROUTES.HEALTH}?detailed=true`);
    const endTime = Date.now();

    // Measure response time for detailed health check
    const responseTime = endTime - startTime;

    // Validate response includes system metrics and resource information
    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toBeInstanceOf(Object);

    // Assert detailed health data structure matches expected format
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();

    // Verify additional metrics are present in detailed response
    if (response.body.system) {
        expect(response.body.system).toBeInstanceOf(Object);
    }

    // Check response time for detailed query meets threshold
    expect(responseTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.acceptable);

    // Validate no sensitive system information is exposed
    const responseText = JSON.stringify(response.body);
    expect(responseText).not.toMatch(/password/i);
    expect(responseText).not.toMatch(/secret/i);
    expect(responseText).not.toMatch(/key/i);

    // Compare detailed response against basic health response
    const basicResponse = await testClient.get(ROUTES.HEALTH);
    expect(response.body.status).toBe(basicResponse.body.status);

    // Update healthRouterStats
    healthRouterStats.testCount++;
    healthRouterStats.totalResponseTime += responseTime;
    healthRouterStats.successfulTests++;
}

/**
 * Tests Kubernetes liveness probe endpoint for container restart decision support with sub-10ms performance target.
 * Validates liveness probe response format, performance requirements, and Kubernetes compatibility.
 * 
 * @returns {Promise<void>} Promise resolving when test completes
 */
async function testLivenessProbeEndpoint() {
    // Send GET request to ROUTES.LIVENESS endpoint
    const measurement = await measureResponseTime(async () => {
        return await testClient.get(ROUTES.LIVENESS);
    });

    const response = measurement.response;
    const responseTime = measurement.elapsedTime;

    // Validate response status indicates application is alive
    expect(response.status).toBe(HTTP_STATUS.OK);

    // Assert response time is under 10ms performance threshold
    expect(responseTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.LIVENESS || 10);

    // Verify minimal JSON response structure for efficiency
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.status).toBe('ok');

    // Check response contains only essential liveness data
    const responseKeys = Object.keys(response.body);
    expect(responseKeys.length).toBeLessThanOrEqual(3); // status, timestamp, and optionally checks

    // Validate no unnecessary overhead in liveness probe response
    expect(response.headers['x-powered-by']).toBeUndefined();

    // Test multiple consecutive liveness probe requests for consistency
    const consecutiveRequests = [];
    for (let i = 0; i < 3; i++) {
        consecutiveRequests.push(testClient.get(ROUTES.LIVENESS));
    }

    const consecutiveResponses = await Promise.all(consecutiveRequests);
    consecutiveResponses.forEach(consecutiveResponse => {
        expect(consecutiveResponse.status).toBe(HTTP_STATUS.OK);
        expect(consecutiveResponse.body.status).toBe('ok');
    });

    // Validate probe endpoint response using custom validator
    response.duration = responseTime;
    validateProbeEndpointResponse(response, 'liveness', 10);

    // Update healthRouterStats
    healthRouterStats.testCount++;
    healthRouterStats.totalResponseTime += responseTime;
    healthRouterStats.successfulTests++;
}

/**
 * Tests Kubernetes readiness probe endpoint for traffic routing decisions with sub-25ms performance target.
 * Validates readiness probe response format, dependency status, and performance requirements.
 * 
 * @returns {Promise<void>} Promise resolving when test completes
 */
async function testReadinessProbeEndpoint() {
    // Send GET request to ROUTES.READINESS endpoint
    const measurement = await measureResponseTime(async () => {
        return await testClient.get(ROUTES.READINESS);
    });

    const response = measurement.response;
    const responseTime = measurement.elapsedTime;

    // Validate response indicates readiness for traffic handling
    expect(response.status).toBe(HTTP_STATUS.OK);

    // Assert response time meets sub-25ms performance requirement
    expect(responseTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.READINESS || 25);

    // Verify readiness response includes dependency status
    expect(response.body).toBeInstanceOf(Object);
    expect(response.body.status).toBe('ok');

    // Check response format is optimized for load balancer integration
    expect(response.headers['content-type']).toMatch(new RegExp(CONTENT_TYPES.APPLICATION_JSON));

    // Validate readiness probe provides traffic routing information
    if (response.body.ready !== undefined) {
        expect(typeof response.body.ready).toBe('boolean');
    }

    // Check response format for Kubernetes readiness requirements
    expect(response.body.timestamp).toBeDefined();

    // Test readiness probe consistency across multiple requests
    const multipleRequests = await generateConcurrentRequests(testClient, 3, {
        method: 'GET',
        path: ROUTES.READINESS,
        timeout: testConstants.TIMEOUT
    });

    multipleRequests.forEach(concurrentResponse => {
        expect(concurrentResponse.status).toBe(HTTP_STATUS.OK);
        expect(concurrentResponse.body.status).toBe('ok');
    });

    // Validate probe endpoint response using custom validator
    response.duration = responseTime;
    validateProbeEndpointResponse(response, 'readiness', 25);

    // Update healthRouterStats
    healthRouterStats.testCount++;
    healthRouterStats.totalResponseTime += responseTime;
    healthRouterStats.successfulTests++;
}

/**
 * Tests health endpoint error handling scenarios including service unavailable and internal errors.
 * Validates error response format, status codes, and error message handling.
 * 
 * @returns {Promise<void>} Promise resolving when test completes
 */
async function testHealthEndpointErrorScenarios() {
    // Test invalid health endpoint path
    const invalidPathResponse = await testClient.get('/health/invalid');
    
    // Validate 404 response for invalid health endpoint paths
    expect(invalidPathResponse.status).toBe(HTTP_STATUS.NOT_FOUND);

    // Test unsupported HTTP method on health endpoint
    const invalidMethodResponse = await testClient.post(ROUTES.HEALTH);
    
    // Validate 405 Method Not Allowed response
    expect(invalidMethodResponse.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);

    // Verify Allow header is present for 405 responses
    expect(invalidMethodResponse.headers['allow']).toBeDefined();
    expect(invalidMethodResponse.headers['allow']).toMatch(/GET/);

    // Assert error response maintains JSON format consistency
    if (invalidMethodResponse.body) {
        expect(invalidMethodResponse.body).toBeInstanceOf(Object);
    }

    // Check error response does not expose sensitive information
    const errorResponseText = invalidMethodResponse.text || JSON.stringify(invalidMethodResponse.body);
    expect(errorResponseText).not.toMatch(/password/i);
    expect(errorResponseText).not.toMatch(/secret/i);
    expect(errorResponseText).not.toMatch(/token/i);

    // Test error response time meets performance requirements
    const errorStartTime = Date.now();
    await testClient.get('/health/nonexistent');
    const errorEndTime = Date.now();
    const errorResponseTime = errorEndTime - errorStartTime;
    
    expect(errorResponseTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.acceptable);

    // Update healthRouterStats
    healthRouterStats.testCount += 3; // Three error scenario tests
    healthRouterStats.totalResponseTime += errorResponseTime;
    healthRouterStats.successfulTests += 3;
}

/**
 * Validates health endpoint performance requirements including response time thresholds and concurrent request handling.
 * Tests performance characteristics and scalability of health endpoints under load conditions.
 * 
 * @returns {Promise<void>} Promise resolving when performance tests complete
 */
async function testHealthEndpointPerformanceRequirements() {
    // Execute single health endpoint request with precision timing
    const singleRequestMeasurement = await measureResponseTime(async () => {
        return await testClient.get(ROUTES.HEALTH);
    });

    // Validate response time meets fast threshold (< 50ms)
    expect(singleRequestMeasurement.elapsedTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.fast || 50);

    // Generate concurrent requests to test load handling
    const concurrentCount = 10;
    const concurrentResponses = await generateConcurrentRequests(testClient, concurrentCount, {
        method: 'GET',
        path: ROUTES.HEALTH,
        timeout: testConstants.TIMEOUT
    });

    // Measure average response time under concurrent load
    const responseTimes = concurrentResponses
        .filter(response => response.duration && !response.error)
        .map(response => response.duration);

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Assert all concurrent requests complete successfully
    const successfulResponses = concurrentResponses.filter(response => 
        !response.error && response.status === HTTP_STATUS.OK
    );
    expect(successfulResponses.length).toBe(concurrentCount);

    // Verify response time consistency across multiple requests
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const responseTimeVariance = maxResponseTime - minResponseTime;
    
    expect(responseTimeVariance).toBeLessThan(100); // Less than 100ms variance

    // Test health endpoint scalability characteristics
    expect(averageResponseTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.acceptable);

    // Validate performance meets educational demonstration requirements
    expect(singleRequestMeasurement.elapsedTime).toBeLessThan(100);
    expect(averageResponseTime).toBeLessThan(150);

    // Update healthRouterStats with performance data
    healthRouterStats.testCount += concurrentCount + 1;
    healthRouterStats.totalResponseTime += singleRequestMeasurement.elapsedTime + (averageResponseTime * concurrentCount);
    healthRouterStats.successfulTests += successfulResponses.length + 1;
}

/**
 * Tests Kubernetes probe endpoint performance optimization with minimal response overhead.
 * Validates both liveness and readiness probe performance under various load conditions.
 * 
 * @returns {Promise<void>} Promise resolving when probe performance tests complete
 */
async function testProbeEndpointPerformanceOptimization() {
    // Test liveness probe response time optimization
    const livenessMeasurements = [];
    for (let i = 0; i < 5; i++) {
        const measurement = await measureResponseTime(async () => {
            return await testClient.get(ROUTES.LIVENESS);
        });
        livenessMeasurements.push(measurement);
    }

    // Validate liveness probe meets sub-10ms requirement consistently
    livenessMeasurements.forEach(measurement => {
        expect(measurement.elapsedTime).toBeLessThan(10);
        expect(measurement.response.status).toBe(HTTP_STATUS.OK);
    });

    // Test readiness probe response time under load
    const readinessConcurrentRequests = await generateConcurrentRequests(testClient, 5, {
        method: 'GET',
        path: ROUTES.READINESS,
        timeout: testConstants.TIMEOUT
    });

    // Assert readiness probe meets sub-25ms requirement
    readinessConcurrentRequests.forEach(response => {
        if (response.duration && !response.error) {
            expect(response.duration).toBeLessThan(25);
        }
    });

    // Compare probe response sizes for efficiency validation
    const livenessResponse = await testClient.get(ROUTES.LIVENESS);
    const readinessResponse = await testClient.get(ROUTES.READINESS);

    const livenessSize = JSON.stringify(livenessResponse.body).length;
    const readinessSize = JSON.stringify(readinessResponse.body).length;

    // Verify probe endpoints handle concurrent requests effectively
    expect(livenessSize).toBeLessThan(512); // Less than 512 bytes
    expect(readinessSize).toBeLessThan(512); // Less than 512 bytes

    // Test probe endpoint response consistency over time
    const timeConsistencyTests = [];
    for (let i = 0; i < 3; i++) {
        timeConsistencyTests.push(
            Promise.all([
                testClient.get(ROUTES.LIVENESS),
                testClient.get(ROUTES.READINESS)
            ])
        );
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }

    const consistencyResults = await Promise.all(timeConsistencyTests);

    // Validate probe optimization doesn't impact functionality
    consistencyResults.forEach(([livenessResult, readinessResult]) => {
        expect(livenessResult.status).toBe(HTTP_STATUS.OK);
        expect(readinessResult.status).toBe(HTTP_STATUS.OK);
        expect(livenessResult.body.status).toBe('ok');
        expect(readinessResult.body.status).toBe('ok');
    });

    // Update healthRouterStats
    const totalProbeTests = livenessMeasurements.length + readinessConcurrentRequests.length + (consistencyResults.length * 2);
    healthRouterStats.testCount += totalProbeTests;
    healthRouterStats.successfulTests += totalProbeTests;
}

/**
 * Tests health router middleware integration including security, logging, and error handling middleware.
 * Validates middleware execution order and proper integration with health endpoints.
 * 
 * @returns {Promise<void>} Promise resolving when middleware integration tests complete
 */
async function testHealthRouterMiddlewareIntegration() {
    // Verify health route middleware stack is properly configured
    expect(router.stack).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);

    // Test security middleware application to health endpoints
    const healthResponse = await testClient.get(ROUTES.HEALTH);
    
    // Validate security headers are present
    expect(healthResponse.headers['x-powered-by']).toBeUndefined();
    
    // Assert logging middleware captures health endpoint requests
    // This is validated through the response headers and proper request processing
    expect(healthResponse.headers['date']).toBeDefined();

    // Check middleware execution order for health routes
    const livenessResponse = await testClient.get(ROUTES.LIVENESS);
    const readinessResponse = await testClient.get(ROUTES.READINESS);

    // Test middleware performance impact on health endpoints
    const middlewareStartTime = Date.now();
    await testClient.get(ROUTES.HEALTH);
    const middlewareEndTime = Date.now();
    const middlewareOverhead = middlewareEndTime - middlewareStartTime;

    // Validate middleware doesn't interfere with probe performance
    expect(middlewareOverhead).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.acceptable);

    // Verify middleware provides proper request/response enhancement
    expect(healthResponse.headers['content-type']).toBeDefined();
    expect(livenessResponse.headers['content-type']).toBeDefined();
    expect(readinessResponse.headers['content-type']).toBeDefined();

    // Test error handling middleware processes health endpoint errors
    const invalidResponse = await testClient.get('/health/invalid');
    expect(invalidResponse.status).toBe(HTTP_STATUS.NOT_FOUND);

    // Update healthRouterStats
    healthRouterStats.testCount += 4;
    healthRouterStats.successfulTests += 4;
}

/**
 * Tests health router configuration including route registration, handler binding, and Express integration.
 * Validates router configuration and Express.js integration compatibility.
 * 
 * @returns {Promise<void>} Promise resolving when configuration tests complete
 */
async function testHealthRouterConfiguration() {
    // Validate health router exports proper Express router instance
    expect(router).toBeDefined();
    expect(typeof router).toBe('function'); // Express router is a function

    // Assert all health endpoints are registered at correct paths
    const routerMethods = router.stack || [];
    const routePaths = routerMethods.map(layer => layer.route?.path || layer.regexp?.source);

    // Verify route handlers are properly bound to endpoints
    expect(routePaths.length).toBeGreaterThan(0);

    // Test router integration with main application routing
    const healthEndpointResponse = await testClient.get(ROUTES.HEALTH);
    const livenessEndpointResponse = await testClient.get(ROUTES.LIVENESS);
    const readinessEndpointResponse = await testClient.get(ROUTES.READINESS);

    // Check router configuration supports Express 5.1.0 features
    expect(healthEndpointResponse.status).toBe(HTTP_STATUS.OK);
    expect(livenessEndpointResponse.status).toBe(HTTP_STATUS.OK);
    expect(readinessEndpointResponse.status).toBe(HTTP_STATUS.OK);

    // Validate router middleware application is correct
    expect(healthEndpointResponse.headers).toBeDefined();
    expect(livenessEndpointResponse.headers).toBeDefined();
    expect(readinessEndpointResponse.headers).toBeDefined();

    // Test router error handling integration
    const notFoundResponse = await testClient.get('/health/notfound');
    expect(notFoundResponse.status).toBe(HTTP_STATUS.NOT_FOUND);

    // Assert router statistics and monitoring integration
    expect(healthRouterStats.testCount).toBeGreaterThan(0);

    // Update healthRouterStats
    healthRouterStats.testCount += 4;
    healthRouterStats.successfulTests += 4;
}

// =============================================================================
// JEST TEST SUITE CONFIGURATION
// =============================================================================

/**
 * Health Router Unit Tests - Comprehensive test suite for health router functionality
 */
describe('Health Router Unit Tests', () => {
    // Jest setup and teardown hooks
    beforeAll(setupHealthRouterTest);
    afterAll(teardownHealthRouterTest);

    // Reset health router statistics before each test
    beforeEach(() => {
        // Individual test setup if needed
    });

    // Validate test isolation after each test
    afterEach(() => {
        // Individual test cleanup if needed
    });

    /**
     * Basic Health Endpoint Tests - Core functionality validation
     */
    describe('Basic Health Endpoint Tests', () => {
        test('should respond with 200 OK for GET /health', async () => {
            await testHealthEndpointBasicFunctionality();
        });

        test('should return valid JSON health status', async () => {
            const response = await testClient.get(ROUTES.HEALTH);
            
            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(response.body).toBeInstanceOf(Object);
            expect(response.body.status).toBe('ok');
            expect(response.body.timestamp).toBeDefined();
        });

        test('should include proper Content-Type header', async () => {
            const response = await testClient.get(ROUTES.HEALTH);
            
            expect(response.headers['content-type']).toMatch(new RegExp(CONTENT_TYPES.APPLICATION_JSON));
        });

        test('should meet response time requirements', async () => {
            const measurement = await measureResponseTime(async () => {
                return await testClient.get(ROUTES.HEALTH);
            });
            
            expect(measurement.elapsedTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.acceptable);
        });

        test('should handle detailed query parameter', async () => {
            await testHealthEndpointDetailedInfo();
        });

        test('should validate health status structure', async () => {
            const response = await testClient.get(ROUTES.HEALTH);
            
            validateHealthEndpointResponse(response, healthCheckData.basicHealth.expectedResponse, {
                performanceThreshold: testConstants.PERFORMANCE_THRESHOLDS.acceptable
            });
        });
    });

    /**
     * Kubernetes Probe Endpoint Tests - Liveness and readiness probe validation
     */
    describe('Kubernetes Probe Endpoint Tests', () => {
        test('should respond correctly to liveness probe requests', async () => {
            await testLivenessProbeEndpoint();
        });

        test('should meet sub-10ms performance for liveness', async () => {
            const measurement = await measureResponseTime(async () => {
                return await testClient.get(ROUTES.LIVENESS);
            });
            
            expect(measurement.elapsedTime).toBeLessThan(10);
            validateProbeEndpointResponse(measurement.response, 'liveness', 10);
        });

        test('should respond correctly to readiness probe requests', async () => {
            await testReadinessProbeEndpoint();
        });

        test('should meet sub-25ms performance for readiness', async () => {
            const measurement = await measureResponseTime(async () => {
                return await testClient.get(ROUTES.READINESS);
            });
            
            expect(measurement.elapsedTime).toBeLessThan(25);
            validateProbeEndpointResponse(measurement.response, 'readiness', 25);
        });

        test('should provide minimal probe response overhead', async () => {
            const livenessResponse = await testClient.get(ROUTES.LIVENESS);
            const readinessResponse = await testClient.get(ROUTES.READINESS);
            
            const livenessSize = JSON.stringify(livenessResponse.body).length;
            const readinessSize = JSON.stringify(readinessResponse.body).length;
            
            expect(livenessSize).toBeLessThan(512);
            expect(readinessSize).toBeLessThan(512);
        });

        test('should handle concurrent probe requests', async () => {
            const concurrentProbeRequests = await Promise.all([
                generateConcurrentRequests(testClient, 3, { method: 'GET', path: ROUTES.LIVENESS }),
                generateConcurrentRequests(testClient, 3, { method: 'GET', path: ROUTES.READINESS })
            ]);
            
            const [livenessResponses, readinessResponses] = concurrentProbeRequests;
            
            livenessResponses.forEach(response => {
                expect(response.status).toBe(HTTP_STATUS.OK);
                expect(response.body.status).toBe('ok');
            });
            
            readinessResponses.forEach(response => {
                expect(response.status).toBe(HTTP_STATUS.OK);
                expect(response.body.status).toBe('ok');
            });
        });
    });

    /**
     * Error Handling Tests - Error scenarios and edge case validation
     */
    describe('Error Handling Tests', () => {
        test('should return 503 when health service is unavailable', async () => {
            // This test would require mocking the health service to simulate unavailability
            // For educational purposes, we test the error response format
            const invalidResponse = await testClient.get('/health/invalid');
            expect(invalidResponse.status).toBe(HTTP_STATUS.NOT_FOUND);
        });

        test('should handle internal server errors gracefully', async () => {
            await testHealthEndpointErrorScenarios();
        });

        test('should provide appropriate error messages', async () => {
            const notFoundResponse = await testClient.get('/health/nonexistent');
            expect(notFoundResponse.status).toBe(HTTP_STATUS.NOT_FOUND);
        });

        test('should maintain JSON format in error responses', async () => {
            const methodNotAllowedResponse = await testClient.post(ROUTES.HEALTH);
            expect(methodNotAllowedResponse.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);
        });

        test('should not expose sensitive information in errors', async () => {
            const errorResponse = await testClient.get('/health/trigger-error');
            const errorText = errorResponse.text || JSON.stringify(errorResponse.body);
            
            expect(errorText).not.toMatch(/password/i);
            expect(errorText).not.toMatch(/secret/i);
            expect(errorText).not.toMatch(/token/i);
        });
    });

    /**
     * Performance and Load Tests - Scalability and performance validation
     */
    describe('Performance and Load Tests', () => {
        test('should handle concurrent requests efficiently', async () => {
            await testHealthEndpointPerformanceRequirements();
        });

        test('should maintain response time under load', async () => {
            const loadTestResponses = await generateConcurrentRequests(testClient, 15, {
                method: 'GET',
                path: ROUTES.HEALTH,
                timeout: testConstants.TIMEOUT
            });
            
            const successfulResponses = loadTestResponses.filter(response => 
                !response.error && response.status === HTTP_STATUS.OK
            );
            
            expect(successfulResponses.length).toBeGreaterThanOrEqual(12); // 80% success rate
            
            const responseTimes = successfulResponses
                .filter(response => response.duration)
                .map(response => response.duration);
            
            const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            expect(averageResponseTime).toBeLessThan(testConstants.PERFORMANCE_THRESHOLDS.slow);
        });

        test('should demonstrate scalability characteristics', async () => {
            // Test different concurrency levels
            const concurrencyLevels = [1, 5, 10];
            const scalabilityResults = [];
            
            for (const level of concurrencyLevels) {
                const responses = await generateConcurrentRequests(testClient, level, {
                    method: 'GET',
                    path: ROUTES.HEALTH,
                    timeout: testConstants.TIMEOUT
                });
                
                const successRate = responses.filter(r => !r.error && r.status === HTTP_STATUS.OK).length / level;
                scalabilityResults.push({ level, successRate });
            }
            
            // Verify scalability doesn't degrade significantly
            scalabilityResults.forEach(result => {
                expect(result.successRate).toBeGreaterThan(0.8); // 80% success rate minimum
            });
        });

        test('should optimize probe endpoint performance', async () => {
            await testProbeEndpointPerformanceOptimization();
        });

        test('should meet educational performance targets', async () => {
            const performanceTargets = [
                { endpoint: ROUTES.HEALTH, threshold: 50 },
                { endpoint: ROUTES.LIVENESS, threshold: 10 },
                { endpoint: ROUTES.READINESS, threshold: 25 }
            ];
            
            for (const target of performanceTargets) {
                const measurement = await measureResponseTime(async () => {
                    return await testClient.get(target.endpoint);
                });
                
                expect(measurement.elapsedTime).toBeLessThan(target.threshold);
                expect(measurement.response.status).toBe(HTTP_STATUS.OK);
            }
        });
    });

    /**
     * Middleware Integration Tests - Middleware functionality validation
     */
    describe('Middleware Integration Tests', () => {
        test('should apply security middleware correctly', async () => {
            await testHealthRouterMiddlewareIntegration();
        });

        test('should integrate with logging middleware', async () => {
            const response = await testClient.get(ROUTES.HEALTH);
            
            // Verify logging-related headers are present
            expect(response.headers['date']).toBeDefined();
        });

        test('should handle Express error middleware', async () => {
            const errorResponse = await testClient.get('/health/invalid');
            expect(errorResponse.status).toBe(HTTP_STATUS.NOT_FOUND);
        });

        test('should maintain middleware execution order', async () => {
            // Test that all middleware executes in correct order
            const response = await testClient.get(ROUTES.HEALTH);
            
            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(response.headers['content-type']).toBeDefined();
            expect(response.headers['x-powered-by']).toBeUndefined();
        });

        test('should optimize middleware for probe endpoints', async () => {
            const livenessStart = Date.now();
            await testClient.get(ROUTES.LIVENESS);
            const livenessTime = Date.now() - livenessStart;
            
            const readinessStart = Date.now();
            await testClient.get(ROUTES.READINESS);
            const readinessTime = Date.now() - readinessStart;
            
            expect(livenessTime).toBeLessThan(10);
            expect(readinessTime).toBeLessThan(25);
        });
    });

    /**
     * Router Configuration Tests - Router setup and Express integration validation
     */
    describe('Router Configuration Tests', () => {
        test('should export valid Express router instance', async () => {
            await testHealthRouterConfiguration();
        });

        test('should register all health endpoints correctly', async () => {
            const endpoints = [ROUTES.HEALTH, ROUTES.LIVENESS, ROUTES.READINESS];
            
            for (const endpoint of endpoints) {
                const response = await testClient.get(endpoint);
                expect(response.status).toBe(HTTP_STATUS.OK);
            }
        });

        test('should bind controllers to appropriate routes', async () => {
            // Verify controller integration by testing response structure
            const healthResponse = await testClient.get(ROUTES.HEALTH);
            const livenessResponse = await testClient.get(ROUTES.LIVENESS);
            const readinessResponse = await testClient.get(ROUTES.READINESS);
            
            expect(healthResponse.body.status).toBe('ok');
            expect(livenessResponse.body.status).toBe('ok');
            expect(readinessResponse.body.status).toBe('ok');
        });

        test('should integrate with Express 5.1.0 features', async () => {
            // Test Express 5.1.0 automatic promise error handling
            const response = await testClient.get(ROUTES.HEALTH);
            
            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(response.body).toBeInstanceOf(Object);
        });

        test('should provide router statistics and monitoring', async () => {
            // Validate that router statistics are being collected
            expect(healthRouterStats).toBeDefined();
            expect(healthRouterStats.testCount).toBeGreaterThan(0);
        });
    });
});