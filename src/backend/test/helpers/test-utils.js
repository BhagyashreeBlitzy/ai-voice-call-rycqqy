/**
 * Comprehensive Test Utilities Module for Node.js Tutorial Application
 * 
 * This module provides custom Jest assertions, HTTP testing helpers, performance measurement tools,
 * and fluent API builders for the Node.js tutorial application. Enhances Jest testing framework 
 * with domain-specific assertions for hello endpoint validation, error response testing, concurrent 
 * request generation, and performance benchmarking. Designed to work seamlessly with Supertest HTTP 
 * testing and Express.js 5.1.0 applications while maintaining educational clarity and production-ready 
 * testing patterns.
 * 
 * Features:
 * - Custom Jest matchers for domain-specific hello endpoint and error response validation
 * - HTTP request utilities with precision timing using Node.js performance API
 * - Concurrent request generation for load testing and scalability validation  
 * - Performance benchmarking with statistical analysis and threshold validation
 * - Fluent API test builder for complex HTTP test scenarios with chainable validation
 * - Comprehensive header validation for security and compliance testing
 * - Educational testing patterns demonstrating industry-standard practices
 * 
 * Compatible with:
 * - Jest 29.7.0 testing framework with custom matcher extension
 * - Supertest 7.1.4 HTTP assertion library for enhanced request utilities
 * - Express.js 5.1.0 with automatic promise error handling and enhanced async support
 * - Node.js 22.11.0 LTS with performance API and precision timing capabilities
 * 
 * Architecture: Educational-focused testing utilities with production-ready patterns,
 * performance measurement integration, and comprehensive validation for scalable
 * Node.js application testing workflows.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Supertest v7.1.4 - HTTP assertion library for enhanced request utilities and response validation integration
const supertest = require('supertest'); // ^7.1.4

// Node.js performance measurement API for precision response time tracking and benchmarking
const { performance, PerformanceObserver } = require('perf_hooks'); // Node.js Core

// =============================================================================
// INTERNAL DEPENDENCIES  
// =============================================================================

// Import HTTP status code constants for response validation and custom assertion utilities
const { 
    HTTP_STATUS 
} = require('../../src/utils/constants.js');

// Import Content-Type header constants for HTTP response header validation in test assertions
const { 
    CONTENT_TYPES 
} = require('../../src/utils/constants.js');

// Import route path constants for consistent endpoint URL construction in test utilities
const { 
    ROUTES 
} = require('../../src/utils/constants.js');

// Import HTTP method constants for request building and method validation testing utilities  
const { 
    HTTP_METHODS 
} = require('../../src/utils/constants.js');

// Import standardized error messages for error response validation and assertion utilities
const { 
    ERROR_MESSAGES 
} = require('../../src/utils/constants.js');

// Import application metadata for User-Agent headers and test request identification
const { 
    APPLICATION_METADATA 
} = require('../../src/utils/constants.js');

// Import test constants including performance thresholds, timeout values, and standard test configuration
const { 
    testConstants 
} = require('../fixtures/test-data.js');

// Import mock data creation helpers for enhanced test utility functions and request builders
const { 
    mockDataHelpers 
} = require('../fixtures/test-data.js');

// Import logger utility for test execution debugging and performance measurement logging
const { 
    logger 
} = require('../../src/utils/logger.js');

// =============================================================================
// GLOBAL STATE AND CACHING
// =============================================================================

// Reference to Jest expect function for custom matcher extension
const JEST_EXPECT = expect;

// Cache for performance measurement results and statistics
const PERFORMANCE_CACHE = new Map();

// Global counter for generating unique request identifiers
let REQUEST_COUNTER = 0;

// User-Agent for test requests
const TEST_USER_AGENT_STRING = `${APPLICATION_METADATA.NAME}-TestUtils/${APPLICATION_METADATA.VERSION}`;

// Performance observer for collecting detailed timing metrics
let performanceObserver = null;

// Initialize performance monitoring
function initializePerformanceMonitoring() {
    if (!performanceObserver) {
        performanceObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (entry.name.startsWith('test-request-')) {
                    PERFORMANCE_CACHE.set(`timing_${entry.name}`, {
                        duration: entry.duration,
                        startTime: entry.startTime,
                        entryType: entry.entryType,
                        timestamp: Date.now()
                    });
                }
            });
        });
        performanceObserver.observe({ entryTypes: ['measure'] });
    }
}

// Initialize performance monitoring on module load
initializePerformanceMonitoring();

// =============================================================================
// CUSTOM JEST ASSERTIONS
// =============================================================================

/**
 * Custom Jest assertion function that validates hello endpoint responses including status code,
 * content, headers, and performance requirements. Provides comprehensive validation for the
 * /hello endpoint with detailed error reporting and educational debugging information.
 * 
 * @param {Object} response - Supertest response object with status, headers, body, and timing data
 * @param {Object} options - Optional validation configuration including debug mode and custom thresholds
 * @returns {void} No return value - throws Jest assertion errors if validation fails
 */
function expectValidHelloResponse(response, options = {}) {
    try {
        // Validate response object exists and has required properties
        if (!response) {
            throw new Error('Response object is required for hello endpoint validation');
        }

        if (typeof response !== 'object') {
            throw new Error('Response must be an object with status, headers, and body properties');
        }

        // Assert response status code equals HTTP_STATUS.OK (200)
        expect(response.status).toBe(HTTP_STATUS.OK);
        
        // Verify response body content equals 'Hello world' exactly
        expect(response.text).toBe('Hello world');
        
        // Validate Content-Type header equals CONTENT_TYPES.TEXT_PLAIN
        expect(response.headers['content-type']).toMatch(new RegExp(CONTENT_TYPES.TEXT_PLAIN));
        
        // Check response time is under performance threshold (default 100ms)
        const performanceThreshold = options.maxResponseTime || testConstants.PERFORMANCE_THRESHOLDS.ACCEPTABLE;
        if (response.duration !== undefined) {
            expect(response.duration).toBeLessThan(performanceThreshold);
        }
        
        // Validate Content-Length header matches body length
        if (response.headers['content-length']) {
            expect(parseInt(response.headers['content-length'], 10)).toBe('Hello world'.length);
        }
        
        // Verify no X-Powered-By header present for security
        expect(response.headers['x-powered-by']).toBeUndefined();
        
        // Assert Date header is present and properly formatted
        expect(response.headers['date']).toBeDefined();
        expect(response.headers['date']).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
        
        // Check response headers for security best practices
        if (response.headers['x-content-type-options']) {
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        }
        
        // Log assertion results for debugging if options.debug enabled
        if (options.debug) {
            logger.debug('Hello response validation passed', {
                status: response.status,
                contentType: response.headers['content-type'],
                bodyLength: response.text.length,
                duration: response.duration,
                headers: Object.keys(response.headers)
            });
        }
        
    } catch (error) {
        // Throw descriptive Jest assertion errors for any failures
        const errorMessage = `Hello endpoint validation failed: ${error.message}`;
        const errorContext = {
            responseStatus: response?.status,
            responseText: response?.text,
            responseHeaders: response?.headers,
            expectedStatus: HTTP_STATUS.OK,
            expectedContent: 'Hello world',
            expectedContentType: CONTENT_TYPES.TEXT_PLAIN
        };
        
        if (options.debug) {
            logger.error('Hello response validation failed', errorContext);
        }
        
        throw new Error(`${errorMessage}\nContext: ${JSON.stringify(errorContext, null, 2)}`);
    }
}

/**
 * Custom Jest assertion function for validating HTTP error responses with proper status codes,
 * error messages, and header validation. Provides comprehensive error response testing with
 * detailed validation and educational debugging support.
 * 
 * @param {Object} response - Supertest response object containing error response data
 * @param {number} expectedStatusCode - Expected HTTP status code for error validation
 * @param {Object} options - Optional validation configuration including message validation and debug mode
 * @returns {void} No return value - throws Jest assertion errors if validation fails
 */
function expectErrorResponse(response, expectedStatusCode, options = {}) {
    try {
        // Validate response object structure and required properties
        if (!response) {
            throw new Error('Response object is required for error response validation');
        }

        if (typeof expectedStatusCode !== 'number') {
            throw new Error('Expected status code must be a number');
        }

        // Assert response status code matches expectedStatusCode parameter
        expect(response.status).toBe(expectedStatusCode);
        
        // Verify error response format follows HTTP standards
        if (expectedStatusCode >= 400) {
            expect(response.status).toBeGreaterThanOrEqual(400);
        }
        
        // Validate error message content if provided in options
        if (options.validateMessage && options.expectedMessage) {
            if (response.body && response.body.message) {
                expect(response.body.message).toContain(options.expectedMessage);
            } else if (response.text) {
                expect(response.text).toContain(options.expectedMessage);
            }
        }
        
        // Check Allow header for 405 Method Not Allowed responses
        if (expectedStatusCode === HTTP_STATUS.METHOD_NOT_ALLOWED) {
            expect(response.headers['allow']).toBeDefined();
            expect(response.headers['allow']).toMatch(/GET/);
        }
        
        // Verify no sensitive information disclosed in error response
        const sensitivePatterns = [/password/i, /token/i, /secret/i, /key/i];
        const responseText = response.text || (response.body ? JSON.stringify(response.body) : '');
        
        sensitivePatterns.forEach(pattern => {
            expect(responseText).not.toMatch(pattern);
        });
        
        // Validate error response Content-Type header
        if (response.headers['content-type']) {
            const contentType = response.headers['content-type'];
            expect(contentType).toMatch(/(text\/plain|application\/json|text\/html)/);
        }
        
        // Assert proper HTTP compliance for error scenarios
        expect(response.headers['date']).toBeDefined();
        
        // Check security headers are present in error responses
        expect(response.headers['x-powered-by']).toBeUndefined();
        
        // Log error validation results for debugging purposes
        if (options.debug) {
            logger.debug('Error response validation passed', {
                status: response.status,
                expectedStatus: expectedStatusCode,
                headers: Object.keys(response.headers),
                hasBody: !!response.body,
                hasText: !!response.text
            });
        }
        
    } catch (error) {
        // Handle error validation failures with detailed error reporting
        const errorMessage = `Error response validation failed: ${error.message}`;
        const errorContext = {
            responseStatus: response?.status,
            expectedStatusCode,
            responseHeaders: response?.headers,
            responseBody: response?.body,
            responseText: response?.text,
            validationOptions: options
        };
        
        if (options.debug) {
            logger.error('Error response validation failed', errorContext);
        }
        
        throw new Error(`${errorMessage}\nContext: ${JSON.stringify(errorContext, null, 2)}`);
    }
}

// =============================================================================
// HTTP REQUEST UTILITIES
// =============================================================================

/**
 * Enhanced HTTP request utility with performance measurement, timing tracking, and comprehensive
 * response validation. Provides precision timing data and enhanced response objects for testing
 * HTTP endpoints with detailed performance metrics and request correlation.
 * 
 * @param {Object} testClient - Supertest client instance for HTTP request execution
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE) for request execution
 * @param {string} path - Request path/endpoint for HTTP request routing
 * @param {Object} requestOptions - Optional request configuration including headers, body, and timeout
 * @returns {Promise<Object>} Promise resolving to enhanced response object with timing data and validation helpers
 */
async function makeHttpRequest(testClient, method, path, requestOptions = {}) {
    try {
        // Generate unique request ID for tracking and correlation
        REQUEST_COUNTER++;
        const requestId = `test-request-${REQUEST_COUNTER}-${Date.now()}`;
        
        // Record request start time using performance.now() for precision
        const startMark = `${requestId}-start`;
        performance.mark(startMark);
        const startTime = performance.now();
        
        // Configure request headers including User-Agent and correlation ID
        const defaultHeaders = {
            'User-Agent': requestOptions.userAgent || TEST_USER_AGENT_STRING,
            'X-Request-ID': requestId,
            'X-Test-Timestamp': new Date().toISOString()
        };
        
        const headers = {
            ...defaultHeaders,
            ...requestOptions.headers
        };
        
        // Set up request timeout from options or default test timeout
        const timeout = requestOptions.timeout || testConstants.TIMEOUT;
        
        // Execute HTTP request using provided testClient and method
        let request = testClient[method.toLowerCase()](path);
        
        // Apply headers to request
        Object.entries(headers).forEach(([key, value]) => {
            request = request.set(key, value);
        });
        
        // Set request body if provided
        if (requestOptions.body) {
            request = request.send(requestOptions.body);
        }
        
        // Set request timeout
        request = request.timeout(timeout);
        
        // Execute request and measure response time
        const response = await request;
        
        // Measure response time with microsecond precision
        const endMark = `${requestId}-end`;
        performance.mark(endMark);
        const endTime = performance.now();
        const measureName = `${requestId}-duration`;
        performance.measure(measureName, startMark, endMark);
        
        // Calculate performance metrics including response time and throughput
        const responseTime = endTime - startTime;
        const throughput = responseTime > 0 ? 1000 / responseTime : 0;
        
        // Enhance response object with timing data and request metadata
        const enhancedResponse = {
            ...response,
            requestId,
            duration: responseTime,
            startTime,
            endTime,
            throughput,
            timestamp: new Date().toISOString(),
            method: method.toUpperCase(),
            path,
            headers: response.headers,
            requestHeaders: headers,
            performanceMark: measureName
        };
        
        // Cache performance data for trend analysis and reporting
        PERFORMANCE_CACHE.set(requestId, {
            requestId,
            method: method.toUpperCase(),
            path,
            statusCode: response.status,
            responseTime,
            timestamp: new Date().toISOString(),
            throughput,
            success: response.status < 400
        });
        
        // Log request completion with performance metrics if debug enabled
        if (requestOptions.debug) {
            logger.debug('HTTP request completed', {
                requestId,
                method: method.toUpperCase(),
                path,
                status: response.status,
                responseTime: `${responseTime.toFixed(2)}ms`,
                throughput: `${throughput.toFixed(2)} req/sec`
            });
        }
        
        // Return enhanced response object with timing and validation data
        return enhancedResponse;
        
    } catch (error) {
        // Handle HTTP request errors with detailed context and timing information
        const endTime = performance.now();
        const errorContext = {
            method: method.toUpperCase(),
            path,
            requestOptions,
            error: error.message,
            duration: endTime - (performance.now() - (endTime - performance.now())),
            timestamp: new Date().toISOString()
        };
        
        logger.error('HTTP request failed', errorContext);
        throw new Error(`HTTP request failed: ${error.message}`);
    }
}

/**
 * Generates and executes multiple concurrent HTTP requests for load testing and performance
 * validation. Provides comprehensive concurrent request execution with statistical analysis,
 * success rate calculation, and aggregate performance metrics for scalability testing.
 * 
 * @param {Object} testClient - Supertest client instance for concurrent request execution
 * @param {number} requestCount - Number of concurrent requests to generate and execute
 * @param {Object} requestConfig - Request configuration template for concurrent request generation
 * @returns {Promise<Array>} Promise resolving to array of response objects with performance metrics and success/failure status
 */
async function generateConcurrentRequests(testClient, requestCount, requestConfig = {}) {
    try {
        // Validate requestCount parameter and apply reasonable limits
        const maxConcurrentRequests = 50; // Safety limit for educational testing
        const validatedRequestCount = Math.min(Math.max(requestCount, 1), maxConcurrentRequests);
        
        if (validatedRequestCount !== requestCount) {
            logger.warn(`Request count adjusted from ${requestCount} to ${validatedRequestCount} for safety`);
        }
        
        // Create array of request configurations based on requestConfig template
        const requestConfigs = Array.from({ length: validatedRequestCount }, (_, index) => ({
            method: requestConfig.method || HTTP_METHODS.GET,
            path: requestConfig.path || ROUTES.HELLO,
            headers: {
                ...requestConfig.headers,
                'X-Concurrent-Request-Index': index.toString(),
                'X-Concurrent-Request-Total': validatedRequestCount.toString()
            },
            body: requestConfig.body,
            timeout: requestConfig.timeout || testConstants.TIMEOUT,
            userAgent: `${TEST_USER_AGENT_STRING}-Concurrent`
        }));
        
        // Generate unique request IDs for each concurrent request
        const concurrentRequestIds = requestConfigs.map((_, index) => 
            `concurrent-${REQUEST_COUNTER + index + 1}-${Date.now()}`
        );
        
        // Set up performance measurement tracking for aggregate metrics
        const concurrentTestId = `concurrent-test-${Date.now()}`;
        const startTime = performance.now();
        performance.mark(`${concurrentTestId}-start`);
        
        // Create Promise array for concurrent request execution
        const requestPromises = requestConfigs.map((config, index) => {
            return makeHttpRequest(testClient, config.method, config.path, {
                ...config,
                requestId: concurrentRequestIds[index]
            }).catch(error => ({
                error: error.message,
                success: false,
                status: 0,
                index,
                timestamp: new Date().toISOString()
            }));
        });
        
        // Execute all requests simultaneously using Promise.all()
        const responses = await Promise.all(requestPromises);
        
        // Mark end of concurrent execution
        const endTime = performance.now();
        performance.mark(`${concurrentTestId}-end`);
        performance.measure(`${concurrentTestId}-total`, `${concurrentTestId}-start`, `${concurrentTestId}-end`);
        
        // Collect response time statistics (min, max, average, percentiles)
        const successfulResponses = responses.filter(response => !response.error && response.status < 400);
        const responseTimes = successfulResponses.map(response => response.duration).filter(Boolean);
        
        const statistics = calculateResponseTimeStatistics(responseTimes);
        
        // Calculate success rate and failure analysis
        const successCount = successfulResponses.length;
        const failureCount = validatedRequestCount - successCount;
        const successRate = (successCount / validatedRequestCount) * 100;
        
        // Compile aggregate performance metrics and statistics
        const aggregateMetrics = {
            concurrentTestId,
            totalRequests: validatedRequestCount,
            successCount,
            failureCount,
            successRate: `${successRate.toFixed(2)}%`,
            totalDuration: endTime - startTime,
            averageResponseTime: statistics.average,
            minResponseTime: statistics.min,
            maxResponseTime: statistics.max,
            p95ResponseTime: statistics.p95,
            p99ResponseTime: statistics.p99,
            throughput: validatedRequestCount / ((endTime - startTime) / 1000),
            timestamp: new Date().toISOString()
        };
        
        // Log concurrent request execution results for analysis
        logger.info('Concurrent requests completed', aggregateMetrics);
        
        // Store aggregate metrics in performance cache
        PERFORMANCE_CACHE.set(concurrentTestId, aggregateMetrics);
        
        // Return array of response objects with performance data
        return responses.map((response, index) => ({
            ...response,
            concurrentTestId,
            aggregateMetrics,
            requestIndex: index,
            totalRequests: validatedRequestCount
        }));
        
    } catch (error) {
        // Handle concurrent request execution errors with detailed context
        logger.error('Concurrent request generation failed', {
            requestCount,
            requestConfig,
            error: error.message
        });
        
        throw new Error(`Concurrent request generation failed: ${error.message}`);
    }
}

// =============================================================================
// PERFORMANCE MEASUREMENT UTILITIES
// =============================================================================

/**
 * Precision response time measurement utility using Node.js performance API for accurate timing
 * data collection. Provides high-resolution timing measurement with statistical analysis and
 * performance entry management for educational performance testing and benchmarking.
 * 
 * @param {Function} requestFunction - Function that executes HTTP request and returns response
 * @param {Object} measurementOptions - Optional measurement configuration including iterations and analysis
 * @returns {Promise<Object>} Promise resolving to measurement results with timing data and performance metrics
 */
async function measureResponseTime(requestFunction, measurementOptions = {}) {
    try {
        // Create performance measurement mark for request start
        const measurementId = `measurement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startMark = `${measurementId}-start`;
        const endMark = `${measurementId}-end`;
        const measureName = `${measurementId}-duration`;
        
        // Record high-resolution timestamp using performance.now()
        performance.mark(startMark);
        const startTime = performance.now();
        
        let response;
        let executionError = null;
        
        try {
            // Execute provided requestFunction with error handling
            response = await requestFunction();
        } catch (error) {
            executionError = error;
        }
        
        // Create performance measurement mark for request end
        performance.mark(endMark);
        const endTime = performance.now();
        
        // Calculate elapsed time with microsecond precision
        const elapsedTime = endTime - startTime;
        
        // Generate performance entry using performance.measure()
        performance.measure(measureName, startMark, endMark);
        
        // Extract detailed timing information from performance entry
        const performanceEntries = performance.getEntriesByName(measureName);
        const performanceEntry = performanceEntries[performanceEntries.length - 1];
        
        // Calculate additional metrics like throughput if applicable
        const throughput = elapsedTime > 0 ? 1000 / elapsedTime : 0;
        const requestsPerSecond = throughput;
        
        // Store measurement results in performance cache
        const measurementResults = {
            measurementId,
            startTime,
            endTime,
            elapsedTime,
            duration: performanceEntry ? performanceEntry.duration : elapsedTime,
            throughput,
            requestsPerSecond,
            timestamp: new Date().toISOString(),
            performanceEntry: performanceEntry ? {
                name: performanceEntry.name,
                entryType: performanceEntry.entryType,
                startTime: performanceEntry.startTime,
                duration: performanceEntry.duration
            } : null,
            response: response ? {
                status: response.status,
                hasBody: !!response.body,
                hasText: !!response.text
            } : null,
            error: executionError ? executionError.message : null,
            success: !executionError
        };
        
        PERFORMANCE_CACHE.set(measurementId, measurementResults);
        
        // Log timing information if debug mode enabled
        if (measurementOptions.debug) {
            logger.debug('Response time measurement completed', {
                measurementId,
                duration: `${elapsedTime.toFixed(3)}ms`,
                throughput: `${throughput.toFixed(2)} req/sec`,
                success: !executionError
            });
        }
        
        // Return comprehensive measurement object with timing data
        return measurementResults;
        
    } catch (error) {
        // Handle measurement process errors with detailed context
        logger.error('Response time measurement failed', {
            error: error.message,
            measurementOptions
        });
        
        throw new Error(`Response time measurement failed: ${error.message}`);
    }
}

/**
 * Comprehensive HTTP response header validation utility for security, compliance, and correctness
 * testing. Validates headers against expectations and security best practices with detailed
 * reporting and educational compliance guidance.
 * 
 * @param {Object} response - HTTP response object containing headers for validation
 * @param {Object} headerExpectations - Expected header values and validation rules
 * @returns {Object} Header validation results with compliance status and recommendations
 */
function validateResponseHeaders(response, headerExpectations = {}) {
    try {
        // Extract headers from response object and normalize case
        const responseHeaders = response.headers || {};
        const normalizedHeaders = {};
        
        // Normalize header names to lowercase for case-insensitive comparison
        Object.keys(responseHeaders).forEach(headerName => {
            normalizedHeaders[headerName.toLowerCase()] = responseHeaders[headerName];
        });
        
        // Initialize validation results structure
        const validationResults = {
            isValid: true,
            validatedHeaders: [],
            failedValidations: [],
            warnings: [],
            securityRecommendations: [],
            complianceStatus: 'compliant',
            timestamp: new Date().toISOString()
        };
        
        // Validate Content-Type header matches expected type
        if (headerExpectations['content-type']) {
            const expectedContentType = headerExpectations['content-type'];
            const actualContentType = normalizedHeaders['content-type'];
            
            if (actualContentType) {
                if (actualContentType.includes(expectedContentType)) {
                    validationResults.validatedHeaders.push({
                        header: 'content-type',
                        expected: expectedContentType,
                        actual: actualContentType,
                        status: 'passed'
                    });
                } else {
                    validationResults.failedValidations.push({
                        header: 'content-type',
                        expected: expectedContentType,
                        actual: actualContentType,
                        message: `Content-Type mismatch: expected ${expectedContentType}, got ${actualContentType}`
                    });
                    validationResults.isValid = false;
                }
            } else {
                validationResults.failedValidations.push({
                    header: 'content-type',
                    expected: expectedContentType,
                    actual: null,
                    message: 'Content-Type header is missing'
                });
                validationResults.isValid = false;
            }
        }
        
        // Check Content-Length header accuracy against body length
        if (response.text && normalizedHeaders['content-length']) {
            const expectedLength = Buffer.byteLength(response.text, 'utf8');
            const actualLength = parseInt(normalizedHeaders['content-length'], 10);
            
            if (actualLength === expectedLength) {
                validationResults.validatedHeaders.push({
                    header: 'content-length',
                    expected: expectedLength,
                    actual: actualLength,
                    status: 'passed'
                });
            } else {
                validationResults.failedValidations.push({
                    header: 'content-length',
                    expected: expectedLength,
                    actual: actualLength,
                    message: `Content-Length mismatch: expected ${expectedLength}, got ${actualLength}`
                });
                validationResults.isValid = false;
            }
        }
        
        // Verify Date header presence and RFC compliance
        if (normalizedHeaders['date']) {
            const dateHeader = normalizedHeaders['date'];
            const datePattern = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;
            
            if (datePattern.test(dateHeader)) {
                validationResults.validatedHeaders.push({
                    header: 'date',
                    actual: dateHeader,
                    status: 'passed',
                    message: 'Date header format is RFC compliant'
                });
            } else {
                validationResults.warnings.push({
                    header: 'date',
                    actual: dateHeader,
                    message: 'Date header format may not be RFC compliant'
                });
            }
        } else {
            validationResults.warnings.push({
                header: 'date',
                message: 'Date header is missing (recommended for HTTP compliance)'
            });
        }
        
        // Assert X-Powered-By header is not present for security
        if (normalizedHeaders['x-powered-by']) {
            validationResults.securityRecommendations.push({
                header: 'x-powered-by',
                issue: 'Information disclosure',
                recommendation: 'Remove X-Powered-By header to prevent server fingerprinting',
                severity: 'medium'
            });
            validationResults.complianceStatus = 'warning';
        } else {
            validationResults.validatedHeaders.push({
                header: 'x-powered-by',
                status: 'passed',
                message: 'X-Powered-By header properly omitted for security'
            });
        }
        
        // Validate security headers if present (X-Content-Type-Options, etc.)
        const securityHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': ['DENY', 'SAMEORIGIN'],
            'referrer-policy': 'no-referrer'
        };
        
        Object.entries(securityHeaders).forEach(([headerName, expectedValue]) => {
            if (normalizedHeaders[headerName]) {
                const actualValue = normalizedHeaders[headerName];
                let isValid = false;
                
                if (Array.isArray(expectedValue)) {
                    isValid = expectedValue.includes(actualValue);
                } else {
                    isValid = actualValue === expectedValue;
                }
                
                if (isValid) {
                    validationResults.validatedHeaders.push({
                        header: headerName,
                        expected: expectedValue,
                        actual: actualValue,
                        status: 'passed',
                        message: 'Security header properly configured'
                    });
                } else {
                    validationResults.securityRecommendations.push({
                        header: headerName,
                        expected: expectedValue,
                        actual: actualValue,
                        recommendation: `Security header ${headerName} has unexpected value`
                    });
                }
            }
        });
        
        // Check Allow header for method not allowed responses
        if (response.status === HTTP_STATUS.METHOD_NOT_ALLOWED) {
            if (normalizedHeaders['allow']) {
                validationResults.validatedHeaders.push({
                    header: 'allow',
                    actual: normalizedHeaders['allow'],
                    status: 'passed',
                    message: 'Allow header present for 405 response'
                });
            } else {
                validationResults.failedValidations.push({
                    header: 'allow',
                    message: 'Allow header required for 405 Method Not Allowed response'
                });
                validationResults.isValid = false;
            }
        }
        
        // Verify custom headers match expectations from headerExpectations
        Object.entries(headerExpectations).forEach(([expectedHeader, expectedValue]) => {
            if (expectedHeader.toLowerCase() !== 'content-type') { // Already handled above
                const actualValue = normalizedHeaders[expectedHeader.toLowerCase()];
                
                if (actualValue === expectedValue) {
                    validationResults.validatedHeaders.push({
                        header: expectedHeader,
                        expected: expectedValue,
                        actual: actualValue,
                        status: 'passed'
                    });
                } else {
                    validationResults.failedValidations.push({
                        header: expectedHeader,
                        expected: expectedValue,
                        actual: actualValue,
                        message: `Custom header validation failed`
                    });
                    validationResults.isValid = false;
                }
            }
        });
        
        // Set final compliance status
        if (validationResults.failedValidations.length > 0) {
            validationResults.complianceStatus = 'failed';
        } else if (validationResults.securityRecommendations.length > 0 || validationResults.warnings.length > 0) {
            validationResults.complianceStatus = 'warning';
        }
        
        // Return comprehensive header validation report
        return validationResults;
        
    } catch (error) {
        // Handle header validation errors with fallback error report
        return {
            isValid: false,
            validatedHeaders: [],
            failedValidations: [{
                header: 'validation-process',
                message: `Header validation failed: ${error.message}`
            }],
            warnings: [],
            securityRecommendations: [],
            complianceStatus: 'error',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Creates performance benchmark baseline for comparing response times and identifying performance
 * regressions. Executes multiple iterations with statistical analysis to establish reliable
 * performance baselines and detect performance anomalies.
 * 
 * @param {string} benchmarkName - Unique identifier for the performance benchmark
 * @param {Function} testFunction - Function to execute for performance benchmarking
 * @param {Object} benchmarkOptions - Configuration options for benchmark execution and analysis
 * @returns {Promise<Object>} Promise resolving to benchmark results with statistical analysis and performance baseline
 */
async function createPerformanceBenchmark(benchmarkName, testFunction, benchmarkOptions = {}) {
    try {
        // Initialize benchmark configuration with statistical parameters
        const iterations = benchmarkOptions.iterations || 10;
        const warmupIterations = benchmarkOptions.warmup || 3;
        const outlierThreshold = benchmarkOptions.outlierThreshold || 2; // Standard deviations
        
        const benchmarkId = `benchmark-${benchmarkName}-${Date.now()}`;
        const benchmarkResults = {
            benchmarkId,
            benchmarkName,
            startTime: new Date().toISOString(),
            iterations,
            warmupIterations,
            measurements: [],
            warmupMeasurements: [],
            statistics: null,
            outliers: [],
            baseline: null,
            timestamp: new Date().toISOString()
        };
        
        logger.info(`Starting performance benchmark: ${benchmarkName}`, {
            benchmarkId,
            iterations,
            warmupIterations
        });
        
        // Execute warmup iterations to stabilize performance
        for (let i = 0; i < warmupIterations; i++) {
            try {
                const warmupMeasurement = await measureResponseTime(testFunction, {
                    debug: benchmarkOptions.debug
                });
                benchmarkResults.warmupMeasurements.push({
                    iteration: i + 1,
                    duration: warmupMeasurement.elapsedTime,
                    timestamp: warmupMeasurement.timestamp
                });
            } catch (error) {
                logger.warn(`Warmup iteration ${i + 1} failed: ${error.message}`);
            }
        }
        
        // Run benchmark iterations with precise timing measurement
        for (let i = 0; i < iterations; i++) {
            try {
                const measurement = await measureResponseTime(testFunction, {
                    debug: benchmarkOptions.debug
                });
                
                benchmarkResults.measurements.push({
                    iteration: i + 1,
                    duration: measurement.elapsedTime,
                    throughput: measurement.throughput,
                    timestamp: measurement.timestamp,
                    success: measurement.success,
                    measurementId: measurement.measurementId
                });
            } catch (error) {
                logger.warn(`Benchmark iteration ${i + 1} failed: ${error.message}`);
                benchmarkResults.measurements.push({
                    iteration: i + 1,
                    duration: null,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    success: false
                });
            }
        }
        
        // Collect response time data for statistical analysis
        const successfulMeasurements = benchmarkResults.measurements.filter(m => m.success !== false);
        const responseTimes = successfulMeasurements.map(m => m.duration);
        
        if (responseTimes.length === 0) {
            throw new Error('No successful measurements recorded for benchmark');
        }
        
        // Calculate statistical metrics (mean, median, std dev, percentiles)
        const statistics = calculateResponseTimeStatistics(responseTimes);
        
        // Identify outliers and performance anomalies
        const outliers = identifyOutliers(responseTimes, statistics.mean, statistics.standardDeviation, outlierThreshold);
        
        // Generate performance baseline for future comparisons
        const baseline = {
            mean: statistics.mean,
            median: statistics.median,
            p95: statistics.p95,
            p99: statistics.p99,
            standardDeviation: statistics.standardDeviation,
            outlierThreshold,
            outlierCount: outliers.length,
            successRate: (successfulMeasurements.length / iterations) * 100,
            establishedAt: new Date().toISOString()
        };
        
        // Complete benchmark results
        benchmarkResults.statistics = statistics;
        benchmarkResults.outliers = outliers;
        benchmarkResults.baseline = baseline;
        benchmarkResults.endTime = new Date().toISOString();
        benchmarkResults.totalDuration = benchmarkResults.measurements.reduce((sum, m) => 
            sum + (m.duration || 0), 0
        );
        
        // Cache benchmark results for regression detection
        PERFORMANCE_CACHE.set(benchmarkId, benchmarkResults);
        PERFORMANCE_CACHE.set(`baseline-${benchmarkName}`, baseline);
        
        // Log benchmark completion with statistical summary
        logger.info(`Performance benchmark completed: ${benchmarkName}`, {
            benchmarkId,
            mean: `${statistics.mean.toFixed(2)}ms`,
            median: `${statistics.median.toFixed(2)}ms`,
            p95: `${statistics.p95.toFixed(2)}ms`,
            successRate: `${baseline.successRate.toFixed(1)}%`,
            outliers: outliers.length
        });
        
        // Return comprehensive benchmark report with baseline data
        return benchmarkResults;
        
    } catch (error) {
        // Handle benchmark execution errors with detailed context
        logger.error(`Performance benchmark failed: ${benchmarkName}`, {
            error: error.message,
            benchmarkOptions
        });
        
        throw new Error(`Performance benchmark failed: ${error.message}`);
    }
}

/**
 * Performance assertion utility that validates response times against configurable thresholds
 * and SLA requirements. Provides comprehensive performance validation with threshold checking
 * and detailed failure reporting for educational performance testing.
 * 
 * @param {Object} responseData - Response data containing timing information for validation
 * @param {Object} performanceThresholds - Configurable performance thresholds and SLA requirements
 * @returns {void} No return value - throws Jest assertion errors if performance thresholds exceeded
 */
function assertResponsePerformance(responseData, performanceThresholds = {}) {
    try {
        // Extract response time from responseData object
        const responseTime = responseData.duration || responseData.elapsedTime || responseData.responseTime;
        
        if (typeof responseTime !== 'number' || responseTime < 0) {
            throw new Error('Valid response time is required for performance assertion');
        }
        
        // Load performance thresholds from testConstants or provided parameters
        const thresholds = {
            fast: performanceThresholds.fast || testConstants.PERFORMANCE_THRESHOLDS.FAST,
            acceptable: performanceThresholds.acceptable || testConstants.PERFORMANCE_THRESHOLDS.ACCEPTABLE,
            slow: performanceThresholds.slow || testConstants.PERFORMANCE_THRESHOLDS.SLOW,
            ...performanceThresholds
        };
        
        const performanceResults = {
            responseTime,
            thresholds,
            assessments: [],
            overallStatus: 'unknown',
            timestamp: new Date().toISOString()
        };
        
        // Compare response time against fast threshold (< 50ms)
        if (responseTime <= thresholds.fast) {
            performanceResults.assessments.push({
                threshold: 'fast',
                limit: thresholds.fast,
                actual: responseTime,
                status: 'passed',
                message: `Response time ${responseTime.toFixed(2)}ms meets fast threshold`
            });
            performanceResults.overallStatus = 'fast';
        }
        // Validate response time meets acceptable threshold (< 100ms)  
        else if (responseTime <= thresholds.acceptable) {
            performanceResults.assessments.push({
                threshold: 'acceptable',
                limit: thresholds.acceptable,
                actual: responseTime,
                status: 'passed',
                message: `Response time ${responseTime.toFixed(2)}ms meets acceptable threshold`
            });
            performanceResults.overallStatus = 'acceptable';
        }
        // Check response time doesn't exceed slow threshold (< 200ms)
        else if (responseTime <= thresholds.slow) {
            performanceResults.assessments.push({
                threshold: 'slow',
                limit: thresholds.slow,
                actual: responseTime,
                status: 'warning',
                message: `Response time ${responseTime.toFixed(2)}ms exceeds acceptable but within slow threshold`
            });
            performanceResults.overallStatus = 'slow';
        }
        // Response time exceeds all thresholds
        else {
            performanceResults.assessments.push({
                threshold: 'exceeded',
                limit: thresholds.slow,
                actual: responseTime,
                status: 'failed',
                message: `Response time ${responseTime.toFixed(2)}ms exceeds all performance thresholds`
            });
            performanceResults.overallStatus = 'failed';
        }
        
        // Assert performance meets educational demonstration requirements
        const educationalThreshold = thresholds.educational || thresholds.acceptable;
        expect(responseTime).toBeLessThan(educationalThreshold);
        
        // Update performance tracking metrics for trend analysis
        const performanceEntry = {
            timestamp: new Date().toISOString(),
            responseTime,
            status: performanceResults.overallStatus,
            thresholds,
            metadata: responseData
        };
        
        PERFORMANCE_CACHE.set(`performance-assertion-${Date.now()}`, performanceEntry);
        
        // Log performance assertion results with threshold comparisons
        logger.debug('Performance assertion completed', performanceResults);
        
        // Throw descriptive Jest errors if performance thresholds violated
        if (performanceResults.overallStatus === 'failed') {
            const failedAssessment = performanceResults.assessments.find(a => a.status === 'failed');
            throw new Error(`Performance assertion failed: ${failedAssessment.message}`);
        }
        
    } catch (error) {
        // Handle performance assertion errors with detailed context
        const errorMessage = error.message.includes('Performance assertion failed') 
            ? error.message 
            : `Performance assertion error: ${error.message}`;
        
        logger.error('Performance assertion failed', {
            responseTime: responseData.duration || responseData.elapsedTime,
            performanceThresholds,
            error: error.message
        });
        
        throw new Error(errorMessage);
    }
}

/**
 * Creates comprehensive concurrency test suite for load testing and scalability validation
 * with configurable parameters. Executes multiple concurrency levels with detailed analysis
 * and scalability insights for educational load testing scenarios.
 * 
 * @param {Object} testClient - Supertest client instance for concurrency testing
 * @param {Array} concurrencyLevels - Array of concurrency levels to test (e.g., [1, 5, 10, 20])
 * @param {Object} testOptions - Test configuration options including request settings and analysis parameters
 * @returns {Promise<Object>} Promise resolving to concurrency test results with scalability analysis and performance metrics
 */
async function createConcurrencyTestSuite(testClient, concurrencyLevels = [1, 5, 10], testOptions = {}) {
    try {
        // Initialize concurrency test configuration with provided levels
        const validatedLevels = concurrencyLevels.filter(level => 
            typeof level === 'number' && level > 0 && level <= 50
        ).sort((a, b) => a - b);
        
        if (validatedLevels.length === 0) {
            throw new Error('At least one valid concurrency level is required (1-50)');
        }
        
        const testSuiteId = `concurrency-suite-${Date.now()}`;
        const testSuiteResults = {
            testSuiteId,
            concurrencyLevels: validatedLevels,
            startTime: new Date().toISOString(),
            testResults: [],
            scalabilityAnalysis: null,
            recommendations: [],
            timestamp: new Date().toISOString()
        };
        
        logger.info(`Starting concurrency test suite`, {
            testSuiteId,
            concurrencyLevels: validatedLevels,
            testOptions: Object.keys(testOptions)
        });
        
        // Execute concurrent request tests at each level progressively
        for (const concurrencyLevel of validatedLevels) {
            logger.info(`Testing concurrency level: ${concurrencyLevel}`);
            
            const levelStartTime = performance.now();
            
            try {
                // Generate concurrent requests for current level
                const concurrentResponses = await generateConcurrentRequests(
                    testClient,
                    concurrencyLevel,
                    {
                        method: testOptions.method || HTTP_METHODS.GET,
                        path: testOptions.path || ROUTES.HELLO,
                        timeout: testOptions.timeout || testConstants.TIMEOUT,
                        headers: testOptions.headers || {}
                    }
                );
                
                const levelEndTime = performance.now();
                const levelDuration = levelEndTime - levelStartTime;
                
                // Analyze results for current concurrency level
                const successfulResponses = concurrentResponses.filter(r => 
                    !r.error && r.status && r.status < 400
                );
                const failedResponses = concurrentResponses.filter(r => 
                    r.error || !r.status || r.status >= 400
                );
                
                const responseTimes = successfulResponses
                    .map(r => r.duration)
                    .filter(duration => typeof duration === 'number');
                
                const levelStatistics = responseTimes.length > 0 
                    ? calculateResponseTimeStatistics(responseTimes)
                    : null;
                
                const levelResults = {
                    concurrencyLevel,
                    totalRequests: concurrencyLevel,
                    successfulRequests: successfulResponses.length,
                    failedRequests: failedResponses.length,
                    successRate: (successfulResponses.length / concurrencyLevel) * 100,
                    duration: levelDuration,
                    throughput: concurrencyLevel / (levelDuration / 1000),
                    statistics: levelStatistics,
                    timestamp: new Date().toISOString()
                };
                
                testSuiteResults.testResults.push(levelResults);
                
                logger.info(`Concurrency level ${concurrencyLevel} completed`, {
                    successRate: `${levelResults.successRate.toFixed(1)}%`,
                    throughput: `${levelResults.throughput.toFixed(2)} req/sec`,
                    avgResponseTime: levelStatistics ? `${levelStatistics.average.toFixed(2)}ms` : 'N/A'
                });
                
            } catch (error) {
                logger.error(`Concurrency level ${concurrencyLevel} failed: ${error.message}`);
                
                testSuiteResults.testResults.push({
                    concurrencyLevel,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    success: false
                });
            }
            
            // Add delay between concurrency levels to prevent overwhelming
            if (testOptions.delayBetweenLevels) {
                await new Promise(resolve => setTimeout(resolve, testOptions.delayBetweenLevels));
            }
        }
        
        // Analyze scalability characteristics and performance degradation
        const successfulTests = testSuiteResults.testResults.filter(r => !r.error);
        
        if (successfulTests.length > 1) {
            const scalabilityAnalysis = analyzeScalability(successfulTests);
            testSuiteResults.scalabilityAnalysis = scalabilityAnalysis;
            
            // Generate recommendations based on scalability analysis
            testSuiteResults.recommendations = generateScalabilityRecommendations(scalabilityAnalysis);
        }
        
        testSuiteResults.endTime = new Date().toISOString();
        
        // Store test suite results in performance cache
        PERFORMANCE_CACHE.set(testSuiteId, testSuiteResults);
        
        // Log concurrency test completion with analysis summary
        logger.info(`Concurrency test suite completed`, {
            testSuiteId,
            totalLevels: validatedLevels.length,
            successfulLevels: successfulTests.length,
            recommendationCount: testSuiteResults.recommendations.length
        });
        
        // Return detailed concurrency test results with scalability insights
        return testSuiteResults;
        
    } catch (error) {
        // Handle concurrency test suite errors with comprehensive context
        logger.error('Concurrency test suite failed', {
            concurrencyLevels,
            testOptions,
            error: error.message
        });
        
        throw new Error(`Concurrency test suite failed: ${error.message}`);
    }
}

// =============================================================================
// FLUENT API TEST BUILDER
// =============================================================================

/**
 * Fluent API builder class for constructing complex HTTP test requests with chainable validation
 * methods and enhanced readability. Provides intuitive test request building with comprehensive
 * validation options and educational testing pattern demonstration.
 */
class TestRequestBuilder {
    /**
     * Initializes TestRequestBuilder with test client and request configuration
     * @param {Object} testClient - Supertest client for request execution
     * @param {string} initialPath - Initial request path for the HTTP request
     */
    constructor(testClient, initialPath) {
        // Store reference to Supertest client for request execution
        this.client = testClient;
        
        // Initialize request path from initialPath parameter
        this.path = initialPath || '/';
        
        // Set default HTTP method to GET
        this.httpMethod = HTTP_METHODS.GET;
        
        // Initialize empty headers object with default values
        this.headers = {
            'User-Agent': TEST_USER_AGENT_STRING,
            'Accept': 'text/plain, application/json'
        };
        
        // Set up default User-Agent header for test identification
        this.body = null;
        
        // Initialize expectations array for chainable assertions
        this.expectations = [];
        
        // Configure default options for request execution
        this.options = {
            timeout: testConstants.TIMEOUT,
            debug: false,
            measurePerformance: true
        };
        
        // Generate unique request ID for tracking and debugging
        this.requestId = `builder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Sets the HTTP method for the request using fluent API chaining
     * @param {string} httpMethod - HTTP method (GET, POST, PUT, DELETE)
     * @returns {TestRequestBuilder} Returns this instance for method chaining
     */
    method(httpMethod) {
        // Validate httpMethod parameter against supported HTTP methods
        const validMethods = Object.values(HTTP_METHODS);
        
        if (!validMethods.includes(httpMethod.toUpperCase())) {
            throw new Error(`Invalid HTTP method: ${httpMethod}. Valid methods: ${validMethods.join(', ')}`);
        }
        
        // Set this.httpMethod to provided method (GET, POST, PUT, DELETE)
        this.httpMethod = httpMethod.toUpperCase();
        
        // Return this instance for method chaining
        return this;
    }
    
    /**
     * Adds status code expectation to the request validation chain
     * @param {number} expectedStatus - Expected HTTP status code
     * @returns {TestRequestBuilder} Returns this instance for method chaining
     */
    expectStatus(expectedStatus) {
        // Validate expectedStatus is a valid HTTP status code
        if (typeof expectedStatus !== 'number' || expectedStatus < 100 || expectedStatus > 599) {
            throw new Error('Expected status must be a valid HTTP status code (100-599)');
        }
        
        // Add status code expectation to expectations array
        this.expectations.push({
            type: 'status',
            expectedValue: expectedStatus,
            validator: (response) => response.status === expectedStatus,
            message: `Expected status ${expectedStatus}`
        });
        
        // Return this instance for method chaining
        return this;
    }
    
    /**
     * Adds response body content expectation to the validation chain
     * @param {string|Object} expectedBody - Expected response body content
     * @returns {TestRequestBuilder} Returns this instance for method chaining
     */
    expectBody(expectedBody) {
        // Add body content expectation to expectations array
        this.expectations.push({
            type: 'body',
            expectedValue: expectedBody,
            validator: (response) => {
                if (typeof expectedBody === 'string') {
                    return response.text === expectedBody;
                } else if (typeof expectedBody === 'object') {
                    return JSON.stringify(response.body) === JSON.stringify(expectedBody);
                }
                return false;
            },
            message: `Expected body: ${JSON.stringify(expectedBody)}`
        });
        
        // Return this instance for method chaining
        return this;
    }
    
    /**
     * Adds HTTP header expectation to the validation chain
     * @param {string} headerName - Name of the header to validate
     * @param {string} expectedValue - Expected header value
     * @returns {TestRequestBuilder} Returns this instance for method chaining
     */
    expectHeader(headerName, expectedValue) {
        // Validate headerName and expectedValue parameters
        if (typeof headerName !== 'string' || headerName.trim().length === 0) {
            throw new Error('Header name must be a non-empty string');
        }
        
        // Add header expectation to expectations array
        this.expectations.push({
            type: 'header',
            headerName: headerName.toLowerCase(),
            expectedValue,
            validator: (response) => {
                const actualValue = response.headers[headerName.toLowerCase()];
                if (typeof expectedValue === 'string') {
                    return actualValue && actualValue.includes(expectedValue);
                }
                return actualValue === expectedValue;
            },
            message: `Expected header ${headerName}: ${expectedValue}`
        });
        
        // Return this instance for method chaining
        return this;
    }
    
    /**
     * Adds performance expectation to the validation chain with response time thresholds
     * @param {number} maxResponseTime - Maximum acceptable response time in milliseconds
     * @returns {TestRequestBuilder} Returns this instance for method chaining
     */
    expectPerformance(maxResponseTime) {
        // Validate maxResponseTime threshold parameter
        if (typeof maxResponseTime !== 'number' || maxResponseTime <= 0) {
            throw new Error('Max response time must be a positive number');
        }
        
        // Add performance expectation to expectations array
        this.expectations.push({
            type: 'performance',
            expectedValue: maxResponseTime,
            validator: (response) => {
                return response.duration && response.duration <= maxResponseTime;
            },
            message: `Expected response time <= ${maxResponseTime}ms`
        });
        
        // Configure timing measurement for request execution
        this.options.measurePerformance = true;
        
        // Return this instance for method chaining
        return this;
    }
    
    /**
     * Sets custom headers for the HTTP request using fluent API
     * @param {Object} customHeaders - Object containing header key-value pairs
     * @returns {TestRequestBuilder} Returns this instance for method chaining
     */
    withHeaders(customHeaders) {
        // Validate customHeaders object structure
        if (typeof customHeaders !== 'object' || customHeaders === null) {
            throw new Error('Custom headers must be an object');
        }
        
        // Merge customHeaders with existing headers
        this.headers = {
            ...this.headers,
            ...customHeaders
        };
        
        // Return this instance for method chaining
        return this;
    }
    
    /**
     * Sets request body content for POST, PUT, and other methods requiring body
     * @param {Object|string} requestBody - Request body content
     * @returns {TestRequestBuilder} Returns this instance for method chaining
     */
    withBody(requestBody) {
        // Store requestBody for HTTP request
        this.body = requestBody;
        
        // Set appropriate Content-Type header if not specified
        if (typeof requestBody === 'object' && !this.headers['Content-Type']) {
            this.headers['Content-Type'] = CONTENT_TYPES.APPLICATION_JSON;
        } else if (typeof requestBody === 'string' && !this.headers['Content-Type']) {
            this.headers['Content-Type'] = CONTENT_TYPES.TEXT_PLAIN;
        }
        
        // Return this instance for method chaining
        return this;
    }
    
    /**
     * Executes the built HTTP request with all configured expectations and validations
     * @returns {Promise<Object>} Promise resolving to enhanced response object with validation results
     */
    async execute() {
        try {
            // Create Supertest request using configured method and path
            let request = this.client[this.httpMethod.toLowerCase()](this.path);
            
            // Apply all configured headers to the request
            Object.entries(this.headers).forEach(([key, value]) => {
                request = request.set(key, value);
            });
            
            // Set request body if provided
            if (this.body) {
                request = request.send(this.body);
            }
            
            // Set timeout
            request = request.timeout(this.options.timeout);
            
            // Start performance measurement timing
            const startTime = performance.now();
            const startMark = `${this.requestId}-start`;
            performance.mark(startMark);
            
            // Execute HTTP request using Supertest client
            const response = await request;
            
            // Measure response time with precision timing
            const endTime = performance.now();
            const endMark = `${this.requestId}-end`;
            performance.mark(endMark);
            const measureName = `${this.requestId}-duration`;
            performance.measure(measureName, startMark, endMark);
            
            const responseTime = endTime - startTime;
            
            // Enhance response with timing data
            const enhancedResponse = {
                ...response,
                duration: responseTime,
                requestId: this.requestId,
                builderConfig: {
                    method: this.httpMethod,
                    path: this.path,
                    headers: this.headers,
                    hasBody: !!this.body,
                    expectationCount: this.expectations.length
                }
            };
            
            // Apply all expectations and assertions to response
            const validationResults = {
                passed: [],
                failed: [],
                totalExpectations: this.expectations.length,
                allPassed: true
            };
            
            for (const expectation of this.expectations) {
                try {
                    if (expectation.validator(enhancedResponse)) {
                        validationResults.passed.push({
                            type: expectation.type,
                            message: expectation.message,
                            status: 'passed'
                        });
                    } else {
                        validationResults.failed.push({
                            type: expectation.type,
                            message: expectation.message,
                            status: 'failed',
                            actual: getActualValue(enhancedResponse, expectation),
                            expected: expectation.expectedValue
                        });
                        validationResults.allPassed = false;
                    }
                } catch (error) {
                    validationResults.failed.push({
                        type: expectation.type,
                        message: expectation.message,
                        status: 'error',
                        error: error.message
                    });
                    validationResults.allPassed = false;
                }
            }
            
            // Add validation results to enhanced response
            enhancedResponse.validationResults = validationResults;
            
            // Log execution results if debug mode enabled
            if (this.options.debug) {
                logger.debug('TestRequestBuilder execution completed', {
                    requestId: this.requestId,
                    method: this.httpMethod,
                    path: this.path,
                    status: response.status,
                    responseTime: `${responseTime.toFixed(2)}ms`,
                    expectationsPassed: validationResults.passed.length,
                    expectationsFailed: validationResults.failed.length,
                    allPassed: validationResults.allPassed
                });
            }
            
            // Throw validation errors if any expectations failed
            if (!validationResults.allPassed) {
                const failedExpectations = validationResults.failed.map(f => f.message).join(', ');
                throw new Error(`TestRequestBuilder validation failed: ${failedExpectations}`);
            }
            
            // Return enhanced response object with validation data
            return enhancedResponse;
            
        } catch (error) {
            // Handle execution errors with detailed context
            logger.error('TestRequestBuilder execution failed', {
                requestId: this.requestId,
                method: this.httpMethod,
                path: this.path,
                error: error.message
            });
            
            throw error;
        }
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculates comprehensive response time statistics for performance analysis
 * @param {Array<number>} responseTimes - Array of response times in milliseconds
 * @returns {Object} Statistical analysis including mean, median, percentiles, and standard deviation
 */
function calculateResponseTimeStatistics(responseTimes) {
    if (!Array.isArray(responseTimes) || responseTimes.length === 0) {
        return null;
    }
    
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const length = sorted.length;
    
    // Calculate mean (average)
    const mean = sorted.reduce((sum, time) => sum + time, 0) / length;
    
    // Calculate median
    const median = length % 2 === 0 
        ? (sorted[length / 2 - 1] + sorted[length / 2]) / 2
        : sorted[Math.floor(length / 2)];
    
    // Calculate percentiles
    const p95Index = Math.ceil(length * 0.95) - 1;
    const p99Index = Math.ceil(length * 0.99) - 1;
    const p95 = sorted[Math.max(0, p95Index)];
    const p99 = sorted[Math.max(0, p99Index)];
    
    // Calculate standard deviation
    const variance = sorted.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / length;
    const standardDeviation = Math.sqrt(variance);
    
    return {
        min: sorted[0],
        max: sorted[length - 1],
        mean,
        median,
        p95,
        p99,
        standardDeviation,
        variance,
        count: length
    };
}

/**
 * Identifies statistical outliers in response time data
 * @param {Array<number>} data - Array of numeric data points
 * @param {number} mean - Mean value of the dataset
 * @param {number} stdDev - Standard deviation of the dataset
 * @param {number} threshold - Number of standard deviations to consider as outlier
 * @returns {Array} Array of outlier values
 */
function identifyOutliers(data, mean, stdDev, threshold = 2) {
    return data.filter(value => Math.abs(value - mean) > threshold * stdDev);
}

/**
 * Analyzes scalability characteristics from concurrency test results
 * @param {Array} testResults - Array of concurrency test results
 * @returns {Object} Scalability analysis with performance trends and bottlenecks
 */
function analyzeScalability(testResults) {
    if (!Array.isArray(testResults) || testResults.length < 2) {
        return null;
    }
    
    const sortedResults = testResults.sort((a, b) => a.concurrencyLevel - b.concurrencyLevel);
    
    // Analyze throughput trends
    const throughputTrend = sortedResults.map(r => r.throughput || 0);
    const throughputGrowth = throughputTrend[throughputTrend.length - 1] / throughputTrend[0];
    
    // Analyze response time trends  
    const responseTimeTrend = sortedResults.map(r => r.statistics?.average || 0);
    const responseTimeGrowth = responseTimeTrend[responseTimeTrend.length - 1] / responseTimeTrend[0];
    
    // Analyze success rate trends
    const successRateTrend = sortedResults.map(r => r.successRate || 0);
    const minSuccessRate = Math.min(...successRateTrend);
    
    return {
        throughputGrowth,
        responseTimeGrowth,
        minSuccessRate,
        maxConcurrency: Math.max(...sortedResults.map(r => r.concurrencyLevel)),
        scalabilityScore: calculateScalabilityScore(throughputGrowth, responseTimeGrowth, minSuccessRate),
        trends: {
            throughput: throughputTrend,
            responseTime: responseTimeTrend,
            successRate: successRateTrend
        }
    };
}

/**
 * Calculates a scalability score based on performance metrics
 * @param {number} throughputGrowth - Ratio of max to min throughput
 * @param {number} responseTimeGrowth - Ratio of max to min response time  
 * @param {number} minSuccessRate - Minimum success rate across all tests
 * @returns {number} Scalability score from 0-100
 */
function calculateScalabilityScore(throughputGrowth, responseTimeGrowth, minSuccessRate) {
    const throughputScore = Math.min(throughputGrowth * 20, 40); // Max 40 points
    const responseTimeScore = Math.max(40 - (responseTimeGrowth - 1) * 20, 0); // Max 40 points  
    const successRateScore = (minSuccessRate / 100) * 20; // Max 20 points
    
    return Math.round(throughputScore + responseTimeScore + successRateScore);
}

/**
 * Generates scalability recommendations based on analysis
 * @param {Object} scalabilityAnalysis - Results from scalability analysis
 * @returns {Array} Array of recommendation objects
 */
function generateScalabilityRecommendations(scalabilityAnalysis) {
    const recommendations = [];
    
    if (scalabilityAnalysis.scalabilityScore < 50) {
        recommendations.push({
            type: 'performance',
            priority: 'high',
            message: 'Poor scalability detected. Consider optimizing application performance and resource usage.'
        });
    }
    
    if (scalabilityAnalysis.minSuccessRate < 95) {
        recommendations.push({
            type: 'reliability',
            priority: 'high', 
            message: 'Success rate drops under load. Investigate error handling and resource limits.'
        });
    }
    
    if (scalabilityAnalysis.responseTimeGrowth > 3) {
        recommendations.push({
            type: 'performance',
            priority: 'medium',
            message: 'Response time increases significantly with load. Consider performance optimization.'
        });
    }
    
    return recommendations;
}

/**
 * Helper function to extract actual values for validation results
 * @param {Object} response - HTTP response object
 * @param {Object} expectation - Expectation object with type and validation info
 * @returns {*} Actual value from response based on expectation type
 */
function getActualValue(response, expectation) {
    switch (expectation.type) {
        case 'status':
            return response.status;
        case 'body':
            return response.text || response.body;
        case 'header':
            return response.headers[expectation.headerName];
        case 'performance':
            return response.duration;
        default:
            return null;
    }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Custom Jest assertion functions for domain-specific validation
    expectValidHelloResponse,
    expectErrorResponse,
    
    // HTTP request utilities with performance measurement
    makeHttpRequest,
    generateConcurrentRequests,
    
    // Performance measurement and analysis utilities
    measureResponseTime,
    createPerformanceBenchmark,
    assertResponsePerformance,
    
    // Response validation utilities
    validateResponseHeaders,
    
    // Concurrency testing utilities
    createConcurrencyTestSuite,
    
    // Fluent API builder class for complex HTTP test scenarios
    TestRequestBuilder,
    
    // Utility functions for statistical analysis and performance calculation
    calculateResponseTimeStatistics,
    identifyOutliers,
    analyzeScalability,
    
    // Performance cache and global state access for testing
    PERFORMANCE_CACHE,
    REQUEST_COUNTER,
    TEST_USER_AGENT_STRING
};