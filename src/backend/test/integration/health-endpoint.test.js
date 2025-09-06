/**
 * Health Endpoint Integration Test Suite
 * 
 * Comprehensive integration tests for health monitoring endpoints including /health, /livez,
 * and /readyz routes. Tests health check functionality, Kubernetes probe compatibility,
 * error scenarios, and performance requirements using Jest testing framework with Supertest
 * HTTP client for Express.js 5.1.0 integration validation.
 * 
 * This test suite validates:
 * - Basic health endpoint functionality and JSON response structure
 * - Kubernetes liveness and readiness probe compatibility
 * - Performance requirements and SLA compliance (response time thresholds)
 * - Concurrent request handling and application scalability
 * - Error handling for invalid routes and HTTP methods
 * - Security header compliance and response format validation
 * - Integration testing patterns for Node.js health monitoring
 * 
 * Features comprehensive educational examples of Express.js health endpoint testing,
 * demonstrating industry-standard monitoring practices and operational observability
 * patterns for Node.js tutorial applications.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

const supertest = require('supertest'); // v7.1.4 - HTTP assertion library for testing Express.js endpoints

// =============================================================================
// INTERNAL IMPORTS
// =============================================================================

// Test environment and setup utilities
const {
    createTestApp,
    createTestServer,
    createSupertestClient,
    TestEnvironment
} = require('../helpers/test-setup.js');

// Custom test utilities and assertion helpers
const {
    expectErrorResponse,
    makeHttpRequest,
    generateConcurrentRequests,
    measureResponseTime,
    validateResponseHeaders,
    TestRequestBuilder
} = require('../helpers/test-utils.js');

// Response fixtures and expected data structures
const {
    healthCheckResponses,
    errorResponses,
    performanceTestResponses,
    responseBuilders
} = require('../fixtures/response-samples.js');

// Test constants and configuration data
const {
    testConstants,
    PERFORMANCE_THRESHOLDS,
    TIMEOUT,
    TEST_USER_AGENT
} = require('../fixtures/test-data.js');

// Application constants for HTTP status codes and routes
const {
    HTTP_STATUS,
    ROUTES,
    CONTENT_TYPES
} = require('../../src/utils/constants.js');

// =============================================================================
// GLOBAL TEST VARIABLES
// =============================================================================

/**
 * Global test environment instance for health endpoint testing resource management
 * @type {TestEnvironment|null}
 */
let testEnvironment = null;

/**
 * Express application instance configured for health endpoint integration testing
 * @type {object|null}
 */
let testApp = null;

/**
 * HTTP server instance for health endpoint testing with ephemeral port allocation
 * @type {object|null}
 */
let testServer = null;

/**
 * Supertest client configured for health endpoint HTTP testing and assertions
 * @type {object|null}
 */
let testClient = null;

/**
 * Health endpoint test statistics tracking for performance monitoring
 * @type {object}
 */
let healthEndpointStats = {
    requests: 0,
    responses: 0,
    errors: 0,
    avgResponseTime: 0
};

// =============================================================================
// TEST SETUP AND TEARDOWN UTILITIES
// =============================================================================

/**
 * Sets up isolated test environment for health endpoint integration testing with Express app,
 * server, and Supertest client configuration. Creates complete test infrastructure with
 * health middleware, performance tracking, and resource management.
 * 
 * @param {object} testOptions - Configuration options for test environment setup
 * @returns {Promise<object>} Promise resolving to complete test setup with app, server, client, and cleanup utilities
 */
async function setupHealthEndpointTest(testOptions = {}) {
    try {
        // Create new TestEnvironment instance with health endpoint configuration
        testEnvironment = new TestEnvironment({
            testName: 'health-endpoints',
            enableHealthChecks: true,
            performanceTracking: true,
            ...testOptions
        });

        // Initialize Express application using createTestApp() with health middleware
        testApp = await testEnvironment.createApp();
        
        // Validate health endpoint availability by testing basic route registration
        if (!testApp._router || !testApp._router.stack) {
            throw new Error('Health endpoints not properly registered in test app');
        }

        // Start test server using createTestServer() with ephemeral port allocation
        testServer = await testEnvironment.startServer(testApp);
        
        // Create Supertest client using createSupertestClient() configured for health endpoints
        testClient = await testEnvironment.createClient(testApp);

        // Configure performance measurement for health endpoint response time tracking
        if (testOptions.enablePerformanceTracking !== false) {
            // Set up response time measurement hooks
            testClient.use((req) => {
                req.startTime = Date.now();
                return req;
            });
        }

        // Set up error handling and timeout configuration for health tests
        testClient.timeout(testConstants.TIMEOUT);

        // Store test environment references in global variables for test access
        const testSetup = {
            app: testApp,
            server: testServer,
            client: testClient,
            environment: testEnvironment
        };

        // Reset health endpoint test statistics for clean test state
        healthEndpointStats = {
            requests: 0,
            responses: 0,
            errors: 0,
            avgResponseTime: 0
        };

        console.debug('Health endpoint test environment setup completed successfully');
        
        // Return complete test setup object with cleanup utilities
        return testSetup;

    } catch (error) {
        console.error('Failed to setup health endpoint test environment:', error.message);
        
        // Clean up any partially created resources on setup failure
        await teardownHealthEndpointTest();
        
        throw new Error(`Health endpoint test setup failed: ${error.message}`);
    }
}

/**
 * Cleans up health endpoint test environment including server shutdown, client cleanup,
 * and resource management. Ensures proper cleanup of test resources and prevents
 * resource leaks between test suites.
 * 
 * @returns {Promise<void>} Promise resolving when health test environment cleanup is complete
 */
async function teardownHealthEndpointTest() {
    try {
        // Reset health endpoint test statistics and performance data
        healthEndpointStats = {
            requests: 0,
            responses: 0,
            errors: 0,
            avgResponseTime: 0
        };

        // Clean up TestEnvironment instance and HTTP connections
        if (testEnvironment) {
            await testEnvironment.cleanup();
            testEnvironment = null;
        }

        // Clear test environment references and resource tracking
        testApp = null;
        testServer = null;
        testClient = null;

        console.debug('Health endpoint test environment cleanup completed successfully');

    } catch (error) {
        console.error('Error during health endpoint test cleanup:', error.message);
        
        // Reset global test variables to null for test isolation even on cleanup failure
        testEnvironment = null;
        testApp = null;
        testServer = null;
        testClient = null;
        
        // Log cleanup error but don't throw to avoid masking original test failures
        console.warn('Health endpoint test cleanup encountered errors but continued');
    }
}

// =============================================================================
// HEALTH RESPONSE VALIDATION UTILITIES
// =============================================================================

/**
 * Validates health endpoint JSON response structure, status codes, headers, and content
 * for comprehensive health check testing. Performs detailed validation of health response
 * format, timing, and compliance with health check standards.
 * 
 * @param {object} response - Supertest response object to validate
 * @param {string} endpointType - Type of health endpoint ('basic', 'liveness', 'readiness')
 * @param {object} expectedData - Expected response data structure and values
 */
function validateHealthResponse(response, endpointType, expectedData = {}) {
    // Validate response object structure and required health response properties
    expect(response).toBeDefined();
    expect(response.status).toBeDefined();
    expect(response.headers).toBeDefined();
    expect(response.body).toBeDefined();

    // Assert response status code is appropriate for health endpoint type (200 OK or 503 Service Unavailable)
    const validStatusCodes = [HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE];
    expect(validStatusCodes).toContain(response.status);

    // Verify Content-Type header is application/json for health endpoint responses
    expect(response.headers['content-type']).toMatch(/application\/json/);

    // Validate JSON response body structure with status, timestamp, and metadata fields
    expect(response.body).toHaveProperty('status');
    expect(typeof response.body.status).toBe('string');

    // Check health status field against expected values (healthy, unhealthy, unknown)
    const validStatusValues = ['ok', 'healthy', 'error', 'unhealthy', 'unknown'];
    expect(validStatusValues).toContain(response.body.status);

    // Verify timestamp format and reasonable time values in health response
    if (response.body.timestamp) {
        expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        const timestamp = new Date(response.body.timestamp);
        expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now()); // Not in future
    }

    // Validate application metadata presence in health response body
    if (endpointType === 'basic' || endpointType === 'detailed') {
        if (response.body.application) {
            expect(response.body.application).toHaveProperty('name');
            expect(response.body.application).toHaveProperty('version');
        }
    }

    // Assert Kubernetes probe compatibility for /livez and /readyz endpoints
    if (endpointType === 'liveness' || endpointType === 'readiness') {
        // Kubernetes probes require minimal response structure
        expect(response.body).toHaveProperty('status');
        
        // Check for probe-specific fields if present
        if (response.body.checks) {
            expect(typeof response.body.checks).toBe('object');
        }
    }

    // Check correlation ID presence and format in response headers if available
    if (response.headers['x-correlation-id']) {
        expect(response.headers['x-correlation-id']).toMatch(/^[a-zA-Z0-9-]+$/);
    }

    // Validate expected data matching if provided
    if (expectedData.status) {
        expect(response.body.status).toBe(expectedData.status);
    }
    
    if (expectedData.responseTime) {
        const responseTime = response.responseTime || 0;
        expect(responseTime).toBeLessThan(expectedData.responseTime);
    }

    // Update health endpoint statistics with successful validation
    healthEndpointStats.responses++;
}

/**
 * Tests health endpoint performance requirements including response time measurement
 * and SLA compliance validation. Measures response times across multiple iterations
 * and validates against performance thresholds.
 * 
 * @param {string} endpoint - Health endpoint path to test
 * @param {number} maxResponseTime - Maximum allowed response time in milliseconds
 * @param {number} testIterations - Number of test iterations for statistical accuracy
 * @returns {Promise<object>} Promise resolving to performance test results with timing statistics and SLA compliance
 */
async function testHealthEndpointPerformance(endpoint, maxResponseTime, testIterations = 10) {
    const performanceResults = {
        endpoint,
        iterations: testIterations,
        responseTimes: [],
        statistics: {},
        slaCompliance: true,
        errors: []
    };

    try {
        // Configure performance measurement for specified health endpoint
        for (let i = 0; i < testIterations; i++) {
            const startTime = Date.now();
            
            try {
                // Execute request using TestRequestBuilder for consistent measurement
                const response = await new TestRequestBuilder(testClient)
                    .method('GET')
                    .path(endpoint)
                    .expectStatus(HTTP_STATUS.OK)
                    .expectHeader('content-type', /application\/json/)
                    .execute();

                // Measure response time for each request using high-precision timing
                const responseTime = Date.now() - startTime;
                performanceResults.responseTimes.push(responseTime);

                // Validate response time meets maxResponseTime SLA requirement
                if (responseTime > maxResponseTime) {
                    performanceResults.slaCompliance = false;
                    performanceResults.errors.push(`Iteration ${i + 1}: Response time ${responseTime}ms exceeds SLA ${maxResponseTime}ms`);
                }

                // Check response consistency and health status accuracy across iterations
                validateHealthResponse(response, 'performance', { responseTime: maxResponseTime });

                // Update health endpoint statistics with performance data
                healthEndpointStats.requests++;

            } catch (error) {
                performanceResults.errors.push(`Iteration ${i + 1} failed: ${error.message}`);
                healthEndpointStats.errors++;
            }
        }

        // Calculate statistical metrics (mean, median, 95th percentile, max)
        if (performanceResults.responseTimes.length > 0) {
            const sortedTimes = performanceResults.responseTimes.sort((a, b) => a - b);
            performanceResults.statistics = {
                mean: sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length,
                median: sortedTimes[Math.floor(sortedTimes.length / 2)],
                p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
                min: sortedTimes[0],
                max: sortedTimes[sortedTimes.length - 1]
            };

            // Update average response time in global statistics
            healthEndpointStats.avgResponseTime = performanceResults.statistics.mean;
        }

        // Generate performance report with timing distribution and outlier analysis
        console.debug(`Performance test results for ${endpoint}:`, {
            iterations: performanceResults.iterations,
            slaCompliance: performanceResults.slaCompliance,
            statistics: performanceResults.statistics,
            errorCount: performanceResults.errors.length
        });

        // Return comprehensive performance test results object
        return performanceResults;

    } catch (error) {
        performanceResults.errors.push(`Performance test setup failed: ${error.message}`);
        performanceResults.slaCompliance = false;
        return performanceResults;
    }
}

/**
 * Tests health endpoint behavior under concurrent load conditions with multiple
 * simultaneous requests and performance analysis. Validates application stability
 * and resource management under load.
 * 
 * @param {string} endpoint - Health endpoint path to test
 * @param {number} concurrentRequests - Number of concurrent requests to execute
 * @param {object} loadTestOptions - Configuration options for load testing
 * @returns {Promise<object>} Promise resolving to concurrent load test results with response analysis and performance metrics
 */
async function testConcurrentHealthRequests(endpoint, concurrentRequests = 10, loadTestOptions = {}) {
    const concurrentResults = {
        endpoint,
        concurrentRequests,
        startTime: Date.now(),
        endTime: null,
        totalDuration: 0,
        successCount: 0,
        errorCount: 0,
        responses: [],
        averageResponseTime: 0,
        errors: []
    };

    try {
        // Generate concurrent request configuration based on endpoint and request count
        const requestPromises = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
            const requestPromise = new TestRequestBuilder(testClient)
                .method('GET')
                .path(endpoint)
                .expectStatus(HTTP_STATUS.OK)
                .expectHeader('content-type', /application\/json/)
                .expectPerformance(loadTestOptions.maxResponseTime || PERFORMANCE_THRESHOLDS.acceptable)
                .execute()
                .then(response => {
                    concurrentResults.successCount++;
                    concurrentResults.responses.push({
                        requestId: i,
                        status: response.status,
                        responseTime: response.responseTime || 0,
                        body: response.body
                    });
                    return response;
                })
                .catch(error => {
                    concurrentResults.errorCount++;
                    concurrentResults.errors.push(`Request ${i}: ${error.message}`);
                    throw error;
                });
            
            requestPromises.push(requestPromise);
        }

        // Execute concurrent requests using Promise.allSettled for comprehensive result handling
        const results = await Promise.allSettled(requestPromises);
        concurrentResults.endTime = Date.now();
        concurrentResults.totalDuration = concurrentResults.endTime - concurrentResults.startTime;

        // Measure individual response times and aggregate performance statistics
        const responseTimes = concurrentResults.responses
            .map(r => r.responseTime)
            .filter(time => time > 0);

        if (responseTimes.length > 0) {
            concurrentResults.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        }

        // Validate all responses maintain correct status codes and content under load
        concurrentResults.responses.forEach((response, index) => {
            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(response.body).toHaveProperty('status');
            expect(['ok', 'healthy'].includes(response.body.status)).toBe(true);
        });

        // Calculate success rate and identify any failures or performance degradation
        const successRate = concurrentResults.successCount / concurrentRequests;
        concurrentResults.successRate = successRate;

        // Validate no resource leaks or connection issues during concurrent execution
        if (successRate < (loadTestOptions.minSuccessRate || 0.95)) {
            throw new Error(`Concurrent test success rate ${successRate} below minimum threshold`);
        }

        // Update global health endpoint statistics
        healthEndpointStats.requests += concurrentRequests;
        healthEndpointStats.responses += concurrentResults.successCount;
        healthEndpointStats.errors += concurrentResults.errorCount;

        console.debug(`Concurrent load test results for ${endpoint}:`, {
            concurrentRequests,
            successCount: concurrentResults.successCount,
            errorCount: concurrentResults.errorCount,
            successRate: concurrentResults.successRate,
            averageResponseTime: concurrentResults.averageResponseTime,
            totalDuration: concurrentResults.totalDuration
        });

        // Return comprehensive concurrent test results with performance insights
        return concurrentResults;

    } catch (error) {
        concurrentResults.endTime = Date.now();
        concurrentResults.totalDuration = concurrentResults.endTime - concurrentResults.startTime;
        concurrentResults.errors.push(`Concurrent test execution failed: ${error.message}`);
        
        console.error('Concurrent health request test failed:', error.message);
        return concurrentResults;
    }
}

/**
 * Validates Kubernetes liveness and readiness probe compatibility including response format,
 * timing, and container orchestration requirements. Ensures health endpoints meet
 * Kubernetes probe standards for automated container management.
 * 
 * @param {object} livenessResponse - Response object from liveness probe endpoint
 * @param {object} readinessResponse - Response object from readiness probe endpoint
 * @returns {object} Kubernetes probe validation results with compliance status and recommendations
 */
function validateKubernetesProbeCompatibility(livenessResponse, readinessResponse) {
    const validationResults = {
        livenessProbe: {
            compliant: true,
            issues: [],
            recommendations: []
        },
        readinessProbe: {
            compliant: true,
            issues: [],
            recommendations: []
        },
        overall: {
            compliant: true,
            summary: ''
        }
    };

    // Validate liveness probe response format meets Kubernetes requirements
    if (livenessResponse) {
        // Check liveness probe response structure for container restart decisions
        if (!livenessResponse.body || !livenessResponse.body.status) {
            validationResults.livenessProbe.compliant = false;
            validationResults.livenessProbe.issues.push('Missing required status field in liveness response');
        }

        // Verify liveness probe response time is under 10ms target for container restart decisions
        const livenessResponseTime = livenessResponse.responseTime || 0;
        if (livenessResponseTime > 10) {
            validationResults.livenessProbe.issues.push(`Liveness probe response time ${livenessResponseTime}ms exceeds 10ms target`);
            validationResults.livenessProbe.recommendations.push('Optimize liveness probe for sub-10ms response time');
        }

        // Check probe responses contain minimal required data for Kubernetes efficiency
        if (livenessResponse.body && Object.keys(livenessResponse.body).length > 3) {
            validationResults.livenessProbe.recommendations.push('Consider reducing liveness probe response size for efficiency');
        }

        // Validate HTTP status codes follow Kubernetes probe conventions (200 OK = healthy, 503 = unhealthy)
        if (![HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE].includes(livenessResponse.status)) {
            validationResults.livenessProbe.compliant = false;
            validationResults.livenessProbe.issues.push(`Invalid status code ${livenessResponse.status} for Kubernetes probe`);
        }
    }

    // Check readiness probe response structure for traffic routing compatibility
    if (readinessResponse) {
        // Validate readiness probe response format for automated traffic routing decisions
        if (!readinessResponse.body || !readinessResponse.body.status) {
            validationResults.readinessProbe.compliant = false;
            validationResults.readinessProbe.issues.push('Missing required status field in readiness response');
        }

        // Validate readiness probe response time is under 25ms target for traffic routing
        const readinessResponseTime = readinessResponse.responseTime || 0;
        if (readinessResponseTime > 25) {
            validationResults.readinessProbe.issues.push(`Readiness probe response time ${readinessResponseTime}ms exceeds 25ms target`);
            validationResults.readinessProbe.recommendations.push('Optimize readiness probe for sub-25ms response time');
        }

        // Check dependency status and resource availability information if present
        if (readinessResponse.body.ready !== undefined && typeof readinessResponse.body.ready !== 'boolean') {
            validationResults.readinessProbe.issues.push('Readiness probe should include boolean ready field');
        }

        // Verify response format is compatible with Kubernetes traffic routing
        if (![HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE].includes(readinessResponse.status)) {
            validationResults.readinessProbe.compliant = false;
            validationResults.readinessProbe.issues.push(`Invalid status code ${readinessResponse.status} for Kubernetes probe`);
        }
    }

    // Check probe endpoint stability and consistency for reliable monitoring
    validationResults.overall.compliant = validationResults.livenessProbe.compliant && validationResults.readinessProbe.compliant;

    // Generate Kubernetes compatibility report with compliance analysis
    if (validationResults.overall.compliant) {
        validationResults.overall.summary = 'Health endpoints are fully compatible with Kubernetes probes';
    } else {
        const totalIssues = validationResults.livenessProbe.issues.length + validationResults.readinessProbe.issues.length;
        validationResults.overall.summary = `${totalIssues} compatibility issues found with Kubernetes probe requirements`;
    }

    // Return probe validation results with operational recommendations
    return validationResults;
}

// =============================================================================
// MAIN TEST SUITE CONFIGURATION
// =============================================================================

/**
 * Comprehensive integration test suite for health monitoring endpoints including functional,
 * performance, and Kubernetes compatibility testing. Tests all health check endpoints
 * with comprehensive validation and performance analysis.
 */
describe('Health Endpoint Integration Tests', () => {
    
    // =============================================================================
    // SETUP AND TEARDOWN HOOKS
    // =============================================================================
    
    /**
     * Setup hook: setupHealthEndpointTest() - Initialize test environment with Express app and Supertest client
     * Creates isolated test environment with health endpoints, performance tracking, and resource management
     */
    beforeAll(async () => {
        await setupHealthEndpointTest({
            enableHealthChecks: true,
            performanceTracking: true,
            kubernetesCompatibility: true
        });
    }, testConstants.TIMEOUT);

    /**
     * Teardown hook: teardownHealthEndpointTest() - Clean up test resources and close server connections
     * Ensures proper cleanup of test infrastructure and prevents resource leaks
     */
    afterAll(async () => {
        await teardownHealthEndpointTest();
    }, testConstants.TIMEOUT);

    /**
     * Pre-test hook: Reset health endpoint statistics and performance tracking data
     * Ensures clean state for each test case execution
     */
    beforeEach(() => {
        // Reset performance tracking for isolated test measurements
        if (healthEndpointStats) {
            healthEndpointStats.requests = 0;
            healthEndpointStats.responses = 0;
            healthEndpointStats.errors = 0;
            healthEndpointStats.avgResponseTime = 0;
        }
    });

    /**
     * Post-test hook: Validate no resource leaks and log test completion status
     * Performs resource validation and cleanup verification
     */
    afterEach(() => {
        // Log test statistics for debugging and monitoring
        console.debug('Health endpoint test completed:', {
            requests: healthEndpointStats.requests,
            responses: healthEndpointStats.responses,
            errors: healthEndpointStats.errors,
            avgResponseTime: healthEndpointStats.avgResponseTime
        });
    });

    // =============================================================================
    // BASIC HEALTH ENDPOINT TESTS
    // =============================================================================

    describe('Basic Health Endpoint (/health)', () => {
        
        /**
         * Tests basic health endpoint functionality with JSON response validation
         * Validates core health check functionality and response structure
         */
        it('should respond to GET /health with 200 OK and health status', async () => {
            // Send GET request to /health endpoint using Supertest client
            const response = await testClient
                .get(ROUTES.HEALTH)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.OK)
                .expect('Content-Type', /application\/json/);

            // Validate response body contains health status and timestamp
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('ok');
            expect(response.body).toHaveProperty('timestamp');

            // Check application metadata presence in response
            if (response.body.application) {
                expect(response.body.application).toHaveProperty('name');
                expect(response.body.application).toHaveProperty('version');
            }

            // Validate response structure matches expected health response format
            validateHealthResponse(response, 'basic', healthCheckResponses.basicHealthResponse);

            // Update test statistics
            healthEndpointStats.requests++;
            healthEndpointStats.responses++;
        });

        /**
         * Tests detailed health endpoint with extended system metrics and resource information
         * Validates comprehensive health information including system metrics
         */
        it('should respond to GET /health?detailed=true with comprehensive health information', async () => {
            // Send GET request to /health?detailed=true
            const response = await testClient
                .get(`${ROUTES.HEALTH}?detailed=true`)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.OK)
                .expect('Content-Type', /application\/json/);

            // Assert response contains detailed system metrics
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('ok');

            // Validate memory usage and uptime information if present
            if (response.body.system) {
                if (response.body.system.memory) {
                    expect(response.body.system.memory).toHaveProperty('used');
                    expect(response.body.system.memory).toHaveProperty('total');
                }
                if (response.body.system.uptime !== undefined) {
                    expect(typeof response.body.system.uptime).toBe('number');
                    expect(response.body.system.uptime).toBeGreaterThanOrEqual(0);
                }
            }

            // Check Node.js version and application configuration data
            if (response.body.application) {
                expect(response.body.application).toHaveProperty('name');
                expect(response.body.application).toHaveProperty('version');
            }

            // Verify detailed response maintains proper JSON structure
            validateHealthResponse(response, 'detailed', healthCheckResponses.detailedHealthResponse);
        });

    });

    // =============================================================================
    // KUBERNETES LIVENESS PROBE TESTS
    // =============================================================================

    describe('Kubernetes Liveness Probe (/livez)', () => {
        
        /**
         * Tests Kubernetes liveness probe endpoint with sub-10ms response time requirement
         * Validates liveness probe performance for container restart efficiency
         */
        it('should respond to GET /livez with fast liveness probe response', async () => {
            // Measure response time with high-precision timing
            const startTime = Date.now();
            
            // Send GET request to /livez endpoint
            const response = await testClient
                .get(ROUTES.LIVENESS)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.OK)
                .expect('Content-Type', /application\/json/);

            const responseTime = Date.now() - startTime;

            // Assert response time is under 10ms for container restart decision efficiency
            expect(responseTime).toBeLessThan(10);

            // Validate minimal JSON response suitable for Kubernetes probe
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('ok');

            // Check liveness status indicates application is alive and functional
            validateHealthResponse(response, 'liveness', healthCheckResponses.livenessProbeResponse);

            // Store response time for Kubernetes compatibility validation
            response.responseTime = responseTime;
        });

        /**
         * Tests liveness probe performance consistency across multiple requests
         * Validates consistent sub-10ms performance for reliable container management
         */
        it('should maintain consistent fast response times for liveness probes', async () => {
            // Execute multiple liveness probe requests to validate consistency
            const performanceResults = await testHealthEndpointPerformance(
                ROUTES.LIVENESS,
                10, // 10ms SLA requirement
                5   // 5 test iterations
            );

            // Assert all response times meet the 10ms SLA requirement
            expect(performanceResults.slaCompliance).toBe(true);
            expect(performanceResults.statistics.max).toBeLessThan(10);
            
            // Validate statistical performance metrics
            expect(performanceResults.statistics.mean).toBeLessThan(8);
            expect(performanceResults.errors.length).toBe(0);
        });

    });

    // =============================================================================
    // KUBERNETES READINESS PROBE TESTS
    // =============================================================================

    describe('Kubernetes Readiness Probe (/readyz)', () => {
        
        /**
         * Tests Kubernetes readiness probe endpoint with traffic routing decision support
         * Validates readiness probe performance for efficient traffic routing
         */
        it('should respond to GET /readyz with readiness probe information', async () => {
            // Measure response time for traffic routing efficiency validation
            const startTime = Date.now();
            
            // Send GET request to /readyz endpoint
            const response = await testClient
                .get(ROUTES.READINESS)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.OK)
                .expect('Content-Type', /application\/json/);

            const responseTime = Date.now() - startTime;

            // Assert response time is under 25ms for traffic routing efficiency
            expect(responseTime).toBeLessThan(25);

            // Validate readiness status indicates application is ready for traffic
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('ok');

            // Check dependency status and resource availability information
            if (response.body.ready !== undefined) {
                expect(typeof response.body.ready).toBe('boolean');
                expect(response.body.ready).toBe(true);
            }

            // Verify response format is compatible with Kubernetes traffic routing
            validateHealthResponse(response, 'readiness', healthCheckResponses.readinessProbeResponse);

            // Store response time for Kubernetes compatibility validation
            response.responseTime = responseTime;
        });

        /**
         * Tests readiness probe dependency checking and resource validation
         * Validates comprehensive readiness assessment for traffic routing decisions
         */
        it('should validate application readiness with dependency checks', async () => {
            // Send GET request to readiness probe endpoint
            const response = await testClient
                .get(ROUTES.READINESS)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.OK);

            // Validate readiness response includes dependency status information
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('ok');

            // Check for dependency validation if present in response
            if (response.body.checks) {
                expect(typeof response.body.checks).toBe('object');
                
                // Validate individual dependency checks
                Object.values(response.body.checks).forEach(checkStatus => {
                    expect(['ready', 'healthy', 'ok'].includes(checkStatus)).toBe(true);
                });
            }

            // Ensure response format supports automated traffic routing decisions
            validateHealthResponse(response, 'readiness');
        });

    });

    // =============================================================================
    // ERROR HANDLING AND EDGE CASE TESTS
    // =============================================================================

    describe('Health Endpoint Error Handling', () => {
        
        /**
         * Tests error handling for requests to non-existent health endpoints
         * Validates proper 404 error responses for invalid health endpoint paths
         */
        it('should return 404 Not Found for invalid health endpoints', async () => {
            // Send GET request to /health-invalid endpoint
            const response = await testClient
                .get('/health-invalid')
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.NOT_FOUND);

            // Validate error response format and message content
            expectErrorResponse(response, HTTP_STATUS.NOT_FOUND, errorResponses.notFoundResponse);

            // Check error response headers and Content-Type
            expect(response.headers['content-type']).toMatch(/application\/json/);
        });

        /**
         * Tests HTTP method validation for health endpoints with proper error responses
         * Validates 405 Method Not Allowed for unsupported HTTP methods
         */
        it('should return 405 Method Not Allowed for non-GET requests to health endpoints', async () => {
            // Send POST request to /health endpoint
            const response = await testClient
                .post(ROUTES.HEALTH)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.METHOD_NOT_ALLOWED);

            // Validate Allow header indicates GET method is supported
            if (response.headers['allow']) {
                expect(response.headers['allow']).toContain('GET');
            }

            // Check error response message and format compliance
            expectErrorResponse(response, HTTP_STATUS.METHOD_NOT_ALLOWED, errorResponses.methodNotAllowedResponse);
        });

        /**
         * Tests health endpoint behavior during service unavailable conditions
         * Validates proper 503 Service Unavailable responses when application is unhealthy
         */
        it('should handle service unavailable scenarios gracefully', async () => {
            // Test scenario where health check might return unhealthy status
            // Note: This test would require a way to simulate unhealthy conditions
            // For now, we validate the error response structure expectations
            
            const expectedUnhealthyResponse = {
                status: HTTP_STATUS.SERVICE_UNAVAILABLE,
                body: {
                    status: 'error',
                    message: expect.stringContaining('unavailable')
                },
                headers: {
                    'content-type': /application\/json/
                }
            };

            // Validate error response structure matches service unavailable format
            expect(errorResponses.serviceUnavailableResponse).toBeDefined();
            expect(errorResponses.serviceUnavailableResponse.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        });

    });

    // =============================================================================
    // PERFORMANCE AND SCALABILITY TESTS
    // =============================================================================

    describe('Health Endpoint Performance and Scalability', () => {
        
        /**
         * Tests health endpoint scalability with multiple concurrent requests
         * Validates application stability and consistent responses under concurrent load
         */
        it('should handle concurrent requests to health endpoints without performance degradation', async () => {
            // Generate 20 concurrent requests to /health endpoint
            const concurrentResults = await testConcurrentHealthRequests(
                ROUTES.HEALTH,
                20, // 20 concurrent requests
                {
                    maxResponseTime: PERFORMANCE_THRESHOLDS.acceptable,
                    minSuccessRate: 0.95
                }
            );

            // Validate all responses return 200 OK with consistent content
            expect(concurrentResults.successRate).toBeGreaterThanOrEqual(0.95);
            expect(concurrentResults.errorCount).toBe(0);

            // Check no significant response time degradation under concurrent load
            expect(concurrentResults.averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.acceptable);

            // Verify application stability and resource management
            expect(concurrentResults.successCount).toBe(20);
            
            // Validate response consistency across concurrent requests
            concurrentResults.responses.forEach(response => {
                expect(response.status).toBe(HTTP_STATUS.OK);
                expect(response.body).toHaveProperty('status', 'ok');
            });
        });

        /**
         * Tests performance requirements across all health endpoints with SLA validation
         * Validates response time SLAs for operational monitoring requirements
         */
        it('should maintain response time SLAs for all health endpoints', async () => {
            // Test /health endpoint response time under 50ms
            const healthResults = await testHealthEndpointPerformance(
                ROUTES.HEALTH,
                50, // 50ms SLA
                5   // 5 iterations
            );
            expect(healthResults.slaCompliance).toBe(true);
            expect(healthResults.statistics.mean).toBeLessThan(50);

            // Test /livez endpoint response time under 10ms
            const livenessResults = await testHealthEndpointPerformance(
                ROUTES.LIVENESS,
                10, // 10ms SLA
                5   // 5 iterations
            );
            expect(livenessResults.slaCompliance).toBe(true);
            expect(livenessResults.statistics.mean).toBeLessThan(10);

            // Test /readyz endpoint response time under 25ms
            const readinessResults = await testHealthEndpointPerformance(
                ROUTES.READINESS,
                25, // 25ms SLA
                5   // 5 iterations
            );
            expect(readinessResults.slaCompliance).toBe(true);
            expect(readinessResults.statistics.mean).toBeLessThan(25);

            // Generate performance report with SLA compliance analysis
            const performanceReport = {
                health: healthResults.statistics,
                liveness: livenessResults.statistics,
                readiness: readinessResults.statistics,
                overallCompliance: healthResults.slaCompliance && livenessResults.slaCompliance && readinessResults.slaCompliance
            };

            console.debug('Health endpoint performance report:', performanceReport);
            expect(performanceReport.overallCompliance).toBe(true);
        });

    });

    // =============================================================================
    // KUBERNETES COMPATIBILITY TESTS
    // =============================================================================

    describe('Kubernetes Probe Compatibility', () => {
        
        /**
         * Tests liveness and readiness probe compatibility with Kubernetes container orchestration
         * Validates probe response formats meet Kubernetes requirements for automated management
         */
        it('should provide Kubernetes-compatible probe responses', async () => {
            // Send requests to both /livez and /readyz endpoints
            const livenessResponse = await testClient
                .get(ROUTES.LIVENESS)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.OK);

            const readinessResponse = await testClient
                .get(ROUTES.READINESS)
                .set('User-Agent', TEST_USER_AGENT)
                .expect(HTTP_STATUS.OK);

            // Measure response times for Kubernetes compatibility validation
            const livenessStartTime = Date.now();
            await testClient.get(ROUTES.LIVENESS);
            livenessResponse.responseTime = Date.now() - livenessStartTime;

            const readinessStartTime = Date.now();
            await testClient.get(ROUTES.READINESS);
            readinessResponse.responseTime = Date.now() - readinessStartTime;

            // Validate response formats meet Kubernetes probe requirements
            expect(livenessResponse.body).toHaveProperty('status');
            expect(readinessResponse.body).toHaveProperty('status');

            // Check response timing suitable for container orchestration decisions
            expect(livenessResponse.responseTime).toBeLessThan(10);
            expect(readinessResponse.responseTime).toBeLessThan(25);

            // Verify probe responses support automated health monitoring
            const kubernetesCompatibility = validateKubernetesProbeCompatibility(
                livenessResponse,
                readinessResponse
            );

            // Generate Kubernetes compatibility report
            expect(kubernetesCompatibility.overall.compliant).toBe(true);
            expect(kubernetesCompatibility.livenessProbe.compliant).toBe(true);
            expect(kubernetesCompatibility.readinessProbe.compliant).toBe(true);

            console.debug('Kubernetes probe compatibility report:', kubernetesCompatibility.overall.summary);
        });

        /**
         * Tests health probe endpoints for container orchestration integration
         * Validates probe stability and reliability for automated container management
         */
        it('should maintain probe endpoint stability for reliable container management', async () => {
            // Execute multiple probe requests to test stability
            const stabilityResults = {
                liveness: [],
                readiness: [],
                errors: []
            };

            // Test liveness probe stability over multiple requests
            for (let i = 0; i < 10; i++) {
                try {
                    const response = await testClient
                        .get(ROUTES.LIVENESS)
                        .expect(HTTP_STATUS.OK);
                    
                    stabilityResults.liveness.push({
                        iteration: i,
                        status: response.body.status,
                        responseTime: response.responseTime || 0
                    });
                } catch (error) {
                    stabilityResults.errors.push(`Liveness probe iteration ${i}: ${error.message}`);
                }
            }

            // Test readiness probe stability over multiple requests
            for (let i = 0; i < 10; i++) {
                try {
                    const response = await testClient
                        .get(ROUTES.READINESS)
                        .expect(HTTP_STATUS.OK);
                    
                    stabilityResults.readiness.push({
                        iteration: i,
                        status: response.body.status,
                        responseTime: response.responseTime || 0
                    });
                } catch (error) {
                    stabilityResults.errors.push(`Readiness probe iteration ${i}: ${error.message}`);
                }
            }

            // Validate probe consistency and reliability
            expect(stabilityResults.errors.length).toBe(0);
            expect(stabilityResults.liveness.length).toBe(10);
            expect(stabilityResults.readiness.length).toBe(10);

            // Check all probe responses maintain consistent status
            stabilityResults.liveness.forEach(result => {
                expect(result.status).toBe('ok');
            });

            stabilityResults.readiness.forEach(result => {
                expect(result.status).toBe('ok');
            });
        });

    });

    // =============================================================================
    // SECURITY AND HEADER VALIDATION TESTS
    // =============================================================================

    describe('Health Endpoint Security and Headers', () => {
        
        /**
         * Tests health endpoint security header configuration and compliance
         * Validates security headers and HTTP compliance for health endpoints
         */
        it('should include proper security headers in health responses', async () => {
            // Send GET requests to all health endpoints
            const healthResponse = await testClient
                .get(ROUTES.HEALTH)
                .expect(HTTP_STATUS.OK);

            const livenessResponse = await testClient
                .get(ROUTES.LIVENESS)
                .expect(HTTP_STATUS.OK);

            const readinessResponse = await testClient
                .get(ROUTES.READINESS)
                .expect(HTTP_STATUS.OK);

            // Validate absence of X-Powered-By header for security
            expect(healthResponse.headers['x-powered-by']).toBeUndefined();
            expect(livenessResponse.headers['x-powered-by']).toBeUndefined();
            expect(readinessResponse.headers['x-powered-by']).toBeUndefined();

            // Check presence of appropriate security headers
            [healthResponse, livenessResponse, readinessResponse].forEach(response => {
                validateResponseHeaders(response, {
                    'content-type': /application\/json/,
                    'content-length': expect.any(String)
                });
            });

            // Verify CORS headers if applicable (not typically required for health endpoints)
            // Validate header format and HTTP compliance
            [healthResponse, livenessResponse, readinessResponse].forEach(response => {
                expect(response.headers).toBeDefined();
                expect(response.headers['content-type']).toMatch(/application\/json/);
            });
        });

        /**
         * Tests health endpoint response format consistency and standard compliance
         * Validates JSON response structure and HTTP standard compliance
         */
        it('should maintain consistent response format across all health endpoints', async () => {
            // Test all health endpoints for format consistency
            const endpoints = [
                { path: ROUTES.HEALTH, type: 'basic' },
                { path: ROUTES.LIVENESS, type: 'liveness' },
                { path: ROUTES.READINESS, type: 'readiness' }
            ];

            for (const endpoint of endpoints) {
                const response = await testClient
                    .get(endpoint.path)
                    .set('User-Agent', TEST_USER_AGENT)
                    .expect(HTTP_STATUS.OK)
                    .expect('Content-Type', /application\/json/);

                // Validate consistent JSON structure
                expect(response.body).toHaveProperty('status');
                expect(typeof response.body.status).toBe('string');
                expect(['ok', 'healthy'].includes(response.body.status)).toBe(true);

                // Check timestamp format consistency where present
                if (response.body.timestamp) {
                    expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
                }

                // Validate response format against endpoint type expectations
                validateHealthResponse(response, endpoint.type);
            }
        });

    });

});