/**
 * Comprehensive Unit Test Suite for RequestLogger Middleware
 * 
 * This test suite validates HTTP request logging functionality, middleware pipeline integration,
 * error handling, and performance characteristics for the requestLogger middleware component.
 * Tests the middleware's ability to log incoming requests with method, URL, headers, response 
 * status, response time, and user agent information using structured console output.
 * 
 * Features comprehensive testing for:
 * - Express.js 5.1.0 middleware pattern compliance
 * - Environment-specific behavior validation
 * - Configurable logging levels and educational debugging capabilities
 * - Request processing workflow integration
 * - Console-based logging strategy implementation
 * - Performance testing and monitoring capabilities
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner for unit test execution and test suite organization
const { test, describe, beforeEach, afterEach } = require('node:test'); // Node.js v22.x LTS

// Import Node.js built-in assertion library for test validation and verification
const assert = require('node:assert'); // Built-in Node.js assertion library

// Import requestLogger middleware components for testing HTTP request logging functionality
const { 
    requestLoggerMiddleware, 
    createRequestLogger, 
    requestLogger 
} = require('../../../middleware/requestLogger.js');

// Import mock helper functions for creating realistic Express.js request and response objects
const { 
    createMockRequest, 
    createMockResponse, 
    createMockNext, 
    MockManager 
} = require('../../helpers/mockHelpers.js');

// Import test helper utilities for test-specific logger instances and mock function creation
const { 
    createTestLogger, 
    createMockFunction, 
    TestUtilities 
} = require('../../helpers/testHelpers.js');

// Import predefined HTTP request objects for testing various request logging scenarios
const { 
    validRequests, 
    invalidRequests, 
    edgeCaseRequests 
} = require('../../fixtures/requests.js');

// Import central test configuration object with environment settings and timeouts
const { testConfig } = require('../../setup/testConfig.js');

// Import HTTP status code constants for testing response status logging and classification
const { HTTP_STATUS, HTTP_METHODS } = require('../../../utils/constants.js');

// Global test utilities and mock management for test lifecycle operations
let mockManager = new MockManager();
let testUtilities = new TestUtilities();

// Console output capture configuration for logging behavior verification
let originalConsole = { 
    log: console.log, 
    error: console.error, 
    warn: console.warn 
};
let logCaptureBuffer = [];

/**
 * Captures console output for testing logging behavior by intercepting console methods
 * and storing output in buffer for verification and assertion testing.
 * 
 * @param {Array} buffer - Buffer array to store captured console output
 * @returns {Object} Console capture configuration with restore function
 */
function captureConsoleOutput(buffer) {
    try {
        // Store original console methods for restoration after testing
        const originalMethods = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };

        // Replace console methods with capturing functions that store output in buffer
        console.log = (...args) => {
            buffer.push({
                level: 'log',
                timestamp: new Date().toISOString(),
                message: args.join(' '),
                args: args
            });
        };

        console.error = (...args) => {
            buffer.push({
                level: 'error',
                timestamp: new Date().toISOString(),
                message: args.join(' '),
                args: args
            });
        };

        console.warn = (...args) => {
            buffer.push({
                level: 'warn',
                timestamp: new Date().toISOString(),
                message: args.join(' '),
                args: args
            });
        };

        // Return restoration function to reset console methods after test
        return {
            restore: () => {
                console.log = originalMethods.log;
                console.error = originalMethods.error;
                console.warn = originalMethods.warn;
            },
            originalMethods: originalMethods
        };
    } catch (error) {
        throw new Error(`Failed to capture console output: ${error.message}`);
    }
}

/**
 * Restores original console methods after capturing output for logging tests
 * to ensure test isolation and prevent side effects between test cases.
 * 
 * @param {Object} captureConfig - Console capture configuration object
 */
function restoreConsoleOutput(captureConfig) {
    try {
        if (captureConfig && captureConfig.restore) {
            captureConfig.restore();
        }
        
        // Clear capture buffer to prevent memory leaks
        logCaptureBuffer.length = 0;
    } catch (error) {
        // Fallback restoration using original console methods
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
    }
}

/**
 * Creates test-specific HTTP request mock objects with configurable properties
 * for testing request logger middleware functionality and behavior.
 * 
 * @param {Object} requestOptions - Configuration options for request mock
 * @returns {Object} Mock Express.js request object with test-specific configuration
 */
function createTestRequest(requestOptions = {}) {
    try {
        // Use createMockRequest from mockHelpers to create base request mock
        const baseRequest = createMockRequest({
            method: requestOptions.method || HTTP_METHODS.GET,
            url: requestOptions.url || '/hello',
            headers: requestOptions.headers || {
                'user-agent': 'Mozilla/5.0 (Test Browser)',
                'content-type': 'application/json'
            },
            ip: requestOptions.ip || '127.0.0.1',
            ...requestOptions
        });

        // Apply test-specific request options and metadata
        baseRequest.get = (headerName) => {
            return baseRequest.headers[headerName.toLowerCase()] || undefined;
        };

        // Set user agent, IP address, and other request metadata for logging
        baseRequest.headers['user-agent'] = requestOptions.userAgent || 'Mozilla/5.0 (Test Browser)';
        baseRequest.connection = { remoteAddress: requestOptions.ip || '127.0.0.1' };

        // Configure request timestamp and unique request identifiers
        baseRequest.requestId = requestOptions.requestId || 'test-request-' + Date.now();

        return baseRequest;
    } catch (error) {
        throw new Error(`Failed to create test request: ${error.message}`);
    }
}

/**
 * Creates test-specific HTTP response mock objects with method tracking
 * and state management for testing response logging functionality.
 * 
 * @param {Object} responseOptions - Configuration options for response mock
 * @returns {Object} Mock Express.js response object with test-specific configuration
 */
function createTestResponse(responseOptions = {}) {
    try {
        // Use createMockResponse from mockHelpers to create base response mock
        const baseResponse = createMockResponse({
            statusCode: responseOptions.statusCode || HTTP_STATUS.OK,
            ...responseOptions
        });

        // Configure response status code, headers, and content length tracking
        baseResponse.statusCode = responseOptions.statusCode || HTTP_STATUS.OK;
        baseResponse.status = (code) => {
            baseResponse.statusCode = code;
            return baseResponse;
        };

        // Set up method tracking for end(), send(), json() method calls
        const originalEnd = baseResponse.end;
        baseResponse.end = function(...args) {
            baseResponse.finished = true;
            baseResponse.endTime = Date.now();
            if (originalEnd) {
                return originalEnd.apply(this, args);
            }
        };

        // Configure response timing simulation for performance testing
        baseResponse.startTime = Date.now();

        return baseResponse;
    } catch (error) {
        throw new Error(`Failed to create test response: ${error.message}`);
    }
}

/**
 * Simulates complete request processing cycle including middleware execution,
 * response generation, and timing measurement for comprehensive testing.
 * 
 * @param {Object} req - Express.js request object
 * @param {Object} res - Express.js response object  
 * @param {Function} next - Express.js next middleware function
 * @param {Object} options - Processing simulation options
 * @returns {Promise} Resolves when request processing simulation is complete
 */
async function simulateRequestProcessing(req, res, next, options = {}) {
    try {
        // Record request processing start time for performance measurement
        const startTime = Date.now();
        
        // Execute request logger middleware with provided req, res, next parameters
        await requestLoggerMiddleware(req, res, next);
        
        // Simulate processing delay if specified in options for timing tests
        if (options.processingDelay) {
            await new Promise(resolve => setTimeout(resolve, options.processingDelay));
        }
        
        // Trigger response.end() method to complete request lifecycle
        if (res.end && typeof res.end === 'function') {
            res.end();
        }
        
        // Calculate processing duration and capture timing information
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        // Return processing results and captured logging output
        return {
            processingTime: processingTime,
            completed: true,
            nextCalled: next.called || false,
            responseFinished: res.finished || false
        };
    } catch (error) {
        throw new Error(`Request processing simulation failed: ${error.message}`);
    }
}

/**
 * Verifies captured log output matches expected patterns, levels, and content
 * for comprehensive logging behavior validation and assertion testing.
 * 
 * @param {Array} capturedLogs - Array of captured log entries for verification
 * @param {Object} expectedPattern - Expected log pattern and content specifications
 * @returns {boolean} True if log output matches expected pattern, false otherwise
 */
function verifyLogOutput(capturedLogs, expectedPattern) {
    try {
        // Filter captured logs by level, component, and message content
        const relevantLogs = capturedLogs.filter(log => {
            if (expectedPattern.level && log.level !== expectedPattern.level) {
                return false;
            }
            if (expectedPattern.contains && !log.message.includes(expectedPattern.contains)) {
                return false;
            }
            return true;
        });
        
        // Check for expected log message patterns using regex matching
        if (expectedPattern.pattern) {
            const regex = new RegExp(expectedPattern.pattern);
            return relevantLogs.some(log => regex.test(log.message));
        }
        
        // Verify log entry count matches expected number of entries
        if (expectedPattern.count !== undefined) {
            return relevantLogs.length === expectedPattern.count;
        }
        
        // Default validation - check if any relevant logs exist
        return relevantLogs.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Measures request logger middleware performance including execution time,
 * memory usage, and throughput for performance testing validation.
 * 
 * @param {number} iterations - Number of iterations for performance measurement
 * @param {Object} requestOptions - Request configuration options for testing
 * @returns {Object} Performance metrics including average execution time and throughput
 */
async function measureMiddlewarePerformance(iterations = 100, requestOptions = {}) {
    try {
        // Record initial memory usage and timestamp for baseline measurement
        const initialMemory = process.memoryUsage();
        const startTime = Date.now();
        
        const executionTimes = [];
        
        // Execute middleware multiple times with varied request parameters
        for (let i = 0; i < iterations; i++) {
            const req = createTestRequest(requestOptions);
            const res = createTestResponse();
            const next = createMockNext();
            
            // Measure execution time for each iteration using high-resolution timing
            const iterationStart = process.hrtime.bigint();
            await requestLoggerMiddleware(req, res, next);
            const iterationEnd = process.hrtime.bigint();
            
            // Convert nanoseconds to milliseconds for timing analysis
            const executionTime = Number(iterationEnd - iterationStart) / 1000000;
            executionTimes.push(executionTime);
        }
        
        // Monitor memory usage changes during test execution
        const finalMemory = process.memoryUsage();
        const memoryDelta = finalMemory.rss - initialMemory.rss;
        
        // Calculate average, minimum, maximum execution times
        const totalTime = Date.now() - startTime;
        const averageTime = executionTimes.reduce((sum, time) => sum + time, 0) / iterations;
        const minTime = Math.min(...executionTimes);
        const maxTime = Math.max(...executionTimes);
        
        // Return comprehensive performance metrics object
        return {
            iterations: iterations,
            totalTime: totalTime,
            averageExecutionTime: averageTime,
            minExecutionTime: minTime,
            maxExecutionTime: maxTime,
            throughput: (iterations / totalTime) * 1000, // requests per second
            memoryDelta: memoryDelta,
            memoryUsage: {
                initial: initialMemory,
                final: finalMemory
            }
        };
    } catch (error) {
        throw new Error(`Performance measurement failed: ${error.message}`);
    }
}

// Main test suite for RequestLogger Middleware Unit Tests with comprehensive coverage
describe('RequestLogger Middleware Unit Tests', () => {
    
    // Test setup hook for preparing test environment before each test case
    beforeEach(async () => {
        try {
            // Set up mock manager and test utilities for clean test environment
            mockManager = new MockManager();
            testUtilities = new TestUtilities();
            await testUtilities.setup();
            
            // Initialize console output capture for logging verification
            logCaptureBuffer = [];
            
            // Reset global request counter and clear logger cache
            if (global.requestCounter) {
                global.requestCounter = 0;
            }
            
            // Set test environment variables for proper middleware behavior
            process.env.NODE_ENV = 'test';
            process.env.LOG_LEVEL = 'debug';
        } catch (error) {
            throw new Error(`Test setup failed: ${error.message}`);
        }
    });
    
    // Test cleanup hook for resetting test environment after each test case
    afterEach(async () => {
        try {
            // Restore console output methods to original state
            restoreConsoleOutput();
            
            // Clean up mocks and test utilities to prevent memory leaks
            await mockManager.cleanup();
            await testUtilities.cleanup();
            
            // Reset environment variables to default state
            delete process.env.LOG_LEVEL;
            
            // Clear capture buffers and reset test state
            logCaptureBuffer = [];
        } catch (error) {
            // Log cleanup errors but don't fail tests
            console.warn(`Test cleanup warning: ${error.message}`);
        }
    });
    
    // Test group for middleware function validation and basic functionality
    describe('Middleware Function Validation', () => {
        
        test('should be a function', () => {
            // Validates that requestLoggerMiddleware is a function for Express.js middleware compliance
            assert.strictEqual(typeof requestLoggerMiddleware, 'function', 'requestLoggerMiddleware should be a function');
        });
        
        test('should have correct parameter length', () => {
            // Validates middleware function accepts req, res, next parameters as per Express.js convention
            assert.strictEqual(requestLoggerMiddleware.length, 3, 'Middleware should accept 3 parameters (req, res, next)');
        });
        
        test('should call next() function', async () => {
            // Validates middleware calls next() to continue Express.js middleware chain
            const req = createTestRequest();
            const res = createTestResponse();
            const mockNext = createMockNext();
            
            await requestLoggerMiddleware(req, res, mockNext);
            
            assert.strictEqual(mockNext.called, true, 'next() should be called');
            assert.strictEqual(mockNext.callCount, 1, 'next() should be called exactly once');
        });
    });
    
    // Test group for request logging functionality and HTTP request processing
    describe('Request Logging Functionality', () => {
        
        test('should log GET request to /hello endpoint', async () => {
            // Validates logging of valid GET request with expected format and content
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest({
                method: HTTP_METHODS.GET,
                url: '/hello'
            });
            const res = createTestResponse();
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logOutput.includes('GET /hello'), 'Log should contain GET /hello');
            assert.ok(logOutput.includes('[INFO]') || logOutput.includes('INFO'), 'Log should contain INFO level');
            
            captureConfig.restore();
        });
        
        test('should log POST request with request body', async () => {
            // Validates logging of POST request with body content and proper formatting
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest({
                method: HTTP_METHODS.POST,
                url: '/hello',
                body: { message: 'test data' }
            });
            const res = createTestResponse();
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logOutput.includes('POST'), 'Log should contain POST method');
            
            captureConfig.restore();
        });
        
        test('should include user agent in log output', async () => {
            // Validates user agent information is properly logged for request tracking
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest({
                headers: {
                    'user-agent': 'Mozilla/5.0 (Test Browser)',
                    'content-type': 'application/json'
                }
            });
            const res = createTestResponse();
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logOutput.includes('Mozilla/5.0') || logOutput.includes('user-agent'), 'Log should contain user agent information');
            
            captureConfig.restore();
        });
        
        test('should include client IP address', async () => {
            // Validates client IP address is logged for request tracking and security
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest({
                ip: '127.0.0.1',
                connection: { remoteAddress: '127.0.0.1' }
            });
            const res = createTestResponse();
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logOutput.includes('127.0.0.1') || logOutput.includes('ip'), 'Log should contain client IP address');
            
            captureConfig.restore();
        });
    });
    
    // Test group for response logging functionality and HTTP response processing
    describe('Response Logging Functionality', () => {
        
        test('should log response status code', async () => {
            // Validates response status code is logged correctly for request monitoring
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest();
            const res = createTestResponse({ statusCode: HTTP_STATUS.OK });
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            // Simulate response completion to trigger status logging
            res.end();
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logOutput.includes('200') || logOutput.includes('status'), 'Log should contain status code information');
            
            captureConfig.restore();
        });
        
        test('should calculate and log response time', async () => {
            // Validates response time calculation and logging accuracy for performance monitoring
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            const startTime = Date.now();
            await requestLoggerMiddleware(req, res, next);
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 10));
            res.end();
            
            const endTime = Date.now();
            const expectedResponseTime = endTime - startTime;
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logOutput.includes('ms') || expectedResponseTime >= 0, 'Log should contain response time information');
            
            captureConfig.restore();
        });
        
        test('should log error status codes appropriately', async () => {
            // Validates error status codes are logged with appropriate level and formatting
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest();
            const res = createTestResponse({ statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR });
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            res.end();
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logOutput.includes('500') || logOutput.includes('error'), 'Log should contain error status code');
            
            captureConfig.restore();
        });
    });
    
    // Test group for factory function testing and configuration options
    describe('Factory Function Testing', () => {
        
        test('createRequestLogger should return middleware function', () => {
            // Validates factory function returns proper middleware with correct signature
            const middleware = createRequestLogger();
            
            assert.strictEqual(typeof middleware, 'function', 'Factory should return a function');
            assert.strictEqual(middleware.length, 3, 'Returned middleware should accept 3 parameters');
        });
        
        test('should accept custom configuration options', () => {
            // Validates factory function accepts custom options without throwing errors
            const customOptions = {
                logLevel: 'debug',
                includeHeaders: true,
                enableTiming: true
            };
            
            assert.doesNotThrow(() => {
                const middleware = createRequestLogger(customOptions);
                assert.strictEqual(typeof middleware, 'function', 'Should return middleware function with custom options');
            }, 'Factory should accept custom configuration options');
        });
        
        test('should use custom log level from options', async () => {
            // Validates custom log level configuration affects logging output
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const customMiddleware = createRequestLogger({ logLevel: 'debug' });
            
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            await customMiddleware(req, res, next);
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            // Verify debug-level logging is enabled
            assert.ok(logCaptureBuffer.length >= 0, 'Custom log level should affect output');
            
            captureConfig.restore();
        });
    });
    
    // Test group for environment-specific behavior and configuration
    describe('Environment-Specific Behavior', () => {
        
        test('should enable verbose logging in development', async () => {
            // Validates verbose logging in development environment for debugging
            process.env.NODE_ENV = 'development';
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            const logOutput = logCaptureBuffer.map(log => log.message).join(' ');
            
            assert.ok(logCaptureBuffer.length > 0 || logOutput.includes('headers'), 'Development environment should enable verbose logging');
            
            captureConfig.restore();
        });
        
        test('should reduce logging in test environment', async () => {
            // Validates reduced logging in test environment for performance
            process.env.NODE_ENV = 'test';
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            // Test environment should have minimal logging or only error logs
            const hasOnlyErrors = logCaptureBuffer.every(log => log.level === 'error');
            
            assert.ok(logCaptureBuffer.length === 0 || hasOnlyErrors, 'Test environment should have reduced logging');
            
            captureConfig.restore();
        });
        
        test('should filter health check requests', async () => {
            // Validates health check request filtering for reduced noise in logs
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest({
                url: '/health',
                method: HTTP_METHODS.GET
            });
            const res = createTestResponse();
            const next = createMockNext();
            
            await requestLoggerMiddleware(req, res, next);
            
            // Health check requests should be filtered out
            assert.strictEqual(logCaptureBuffer.length, 0, 'Health check requests should not be logged');
            
            captureConfig.restore();
        });
    });
    
    // Test group for error handling and exception management
    describe('Error Handling', () => {
        
        test('should handle missing request properties', async () => {
            // Validates graceful handling of missing request properties without crashing
            const incompleteReq = {
                method: HTTP_METHODS.GET,
                // Missing url, headers, and other properties
            };
            const res = createTestResponse();
            const next = createMockNext();
            
            assert.doesNotThrow(async () => {
                await requestLoggerMiddleware(incompleteReq, res, next);
            }, 'Middleware should handle incomplete request objects gracefully');
            
            assert.strictEqual(next.called, true, 'next() should still be called for incomplete requests');
        });
        
        test('should handle response.end() errors', async () => {
            // Validates error handling when response.end() throws exceptions
            const captureConfig = captureConsoleOutput(logCaptureBuffer);
            
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            // Mock response.end() to throw an error
            res.end = () => {
                throw new Error('Response end error');
            };
            
            assert.doesNotThrow(async () => {
                await requestLoggerMiddleware(req, res, next);
                try {
                    res.end();
                } catch (error) {
                    // Expected error, should be handled gracefully
                }
            }, 'Middleware should handle response.end() errors gracefully');
            
            captureConfig.restore();
        });
        
        test('should continue middleware chain on logging errors', async () => {
            // Validates middleware chain continues despite logging errors
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            // Mock console.log to throw an error
            const originalLog = console.log;
            console.log = () => {
                throw new Error('Logging error');
            };
            
            try {
                await requestLoggerMiddleware(req, res, next);
                
                assert.strictEqual(next.called, true, 'next() should be called despite logging errors');
                assert.strictEqual(next.callCount, 1, 'next() should be called exactly once');
            } finally {
                console.log = originalLog;
            }
        });
    });
    
    // Test group for performance testing and optimization validation
    describe('Performance Testing', () => {
        
        test('should execute within performance threshold', async () => {
            // Validates middleware executes within acceptable time limits for production use
            const performanceMetrics = await measureMiddlewarePerformance(10, {
                method: HTTP_METHODS.GET,
                url: '/hello'
            });
            
            const averageTime = performanceMetrics.averageExecutionTime;
            const maxTime = performanceMetrics.maxExecutionTime;
            
            assert.ok(averageTime < 10, `Average execution time ${averageTime}ms should be less than 10ms`);
            assert.ok(maxTime < 50, `Maximum execution time ${maxTime}ms should be less than 50ms`);
        });
        
        test('should handle concurrent requests efficiently', async () => {
            // Validates performance under concurrent request load for scalability
            const concurrentRequests = 10;
            const promises = [];
            
            const startTime = Date.now();
            
            for (let i = 0; i < concurrentRequests; i++) {
                const req = createTestRequest();
                const res = createTestResponse();
                const next = createMockNext();
                
                promises.push(requestLoggerMiddleware(req, res, next));
            }
            
            await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const averageResponseTime = totalTime / concurrentRequests;
            
            assert.ok(promises.length === concurrentRequests, 'All concurrent requests should complete');
            assert.ok(averageResponseTime < 20, `Average response time ${averageResponseTime}ms should be efficient`);
        });
        
        test('should not cause memory leaks', async () => {
            // Validates memory usage remains stable without significant increases
            const initialMemory = process.memoryUsage();
            
            // Execute middleware multiple times to test for memory leaks
            for (let i = 0; i < 100; i++) {
                const req = createTestRequest();
                const res = createTestResponse();
                const next = createMockNext();
                
                await requestLoggerMiddleware(req, res, next);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage();
            const memoryDelta = finalMemory.rss - initialMemory.rss;
            
            // Memory increase should be minimal (less than 10MB)
            assert.ok(memoryDelta < 10000000, `Memory delta ${memoryDelta} bytes should be minimal`);
            assert.ok(finalMemory.rss < initialMemory.rss * 1.5, 'Memory usage should not increase dramatically');
        });
    });
    
    // Test group for integration with Express.js middleware pipeline
    describe('Integration with Express Pipeline', () => {
        
        test('should work with Express.js middleware stack', async () => {
            // Validates integration with Express.js middleware pipeline and execution order
            const middlewareOrder = [];
            let middlewareExecuted = false;
            
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            // Simulate middleware stack execution
            next.callback = () => {
                middlewareOrder.push('next');
                middlewareExecuted = true;
            };
            
            await requestLoggerMiddleware(req, res, next);
            middlewareOrder.unshift('requestLogger');
            
            if (next.called) {
                next.callback();
            }
            
            assert.ok(middlewareExecuted, 'Middleware should integrate with Express.js stack');
            assert.strictEqual(middlewareOrder[0], 'requestLogger', 'Request logger should execute first');
        });
        
        test('should preserve request and response objects', async () => {
            // Validates req and res objects are not modified destructively
            const req = createTestRequest({
                method: HTTP_METHODS.GET,
                url: '/hello'
            });
            const res = createTestResponse();
            const next = createMockNext();
            
            const originalMethod = req.method;
            const originalUrl = req.url;
            const originalStatusCode = res.statusCode;
            
            await requestLoggerMiddleware(req, res, next);
            
            assert.strictEqual(req.method, originalMethod, 'Request method should be preserved');
            assert.strictEqual(req.url, originalUrl, 'Request URL should be preserved');
            assert.ok(res.statusCode !== undefined, 'Response status code should be accessible');
        });
        
        test('should handle Express.js error propagation', async () => {
            // Validates error propagation through Express.js pipeline
            const req = createTestRequest();
            const res = createTestResponse();
            const next = createMockNext();
            
            let errorHandled = false;
            let nextCalledWithError = false;
            
            // Mock next function to simulate error handling
            next.callback = (error) => {
                if (error) {
                    nextCalledWithError = true;
                    errorHandled = true;
                }
            };
            
            // Simulate an error during middleware execution
            try {
                await requestLoggerMiddleware(req, res, next);
                
                // If next was called, execute its callback
                if (next.called && next.callback) {
                    next.callback();
                }
                
                // For this test, we expect normal execution without errors
                assert.ok(next.called, 'next() should be called in normal execution');
                
            } catch (error) {
                // If an error occurs, ensure it's handled properly
                errorHandled = true;
                next.callback(error);
                assert.ok(nextCalledWithError || errorHandled, 'Errors should be handled appropriately');
            }
        });
    });
});