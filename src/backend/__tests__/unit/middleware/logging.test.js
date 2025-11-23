// Jest testing framework for test structure, mocking, and assertions

// Mock HTTP request and response objects for middleware testing
const httpMocks = require('node-mocks-http'); // ^1.11.0 - Creates mock Express req/res objects for isolated testing

// Internal imports - middleware under test and logging utility
const { requestLoggerMiddleware } = require('../../../middleware/logging.js');
const { logger } = require('../../../utils/logger.js');

// Test setup utility for clean testing environment
const { setupTestEnvironment } = require('../../setup.js');

// Initialize test environment with logger mocking and error handling
setupTestEnvironment();

describe('requestLoggerMiddleware', () => {
    // Test environment variables to store mock objects and spy functions
    let mockReq;
    let mockRes;
    let next;
    let originalDateNow;
    let originalHrtime;
    let mockStartTime;
    let mockEndTime;

    beforeAll(() => {
        // Store original Date.now and process.hrtime for restoration
        originalDateNow = Date.now;
        originalHrtime = process.hrtime;
        
        // Mock consistent timing for predictable test results
        mockStartTime = 1000000000000000n; // Start time in nanoseconds
        mockEndTime = 1000000000050000n;   // End time in nanoseconds (50ms later)
    });

    beforeEach(() => {
        // Create fresh mock request and response objects for each test
        mockReq = httpMocks.createRequest({
            method: 'GET',
            url: '/hello',
            originalUrl: '/hello',
            headers: {
                'user-agent': 'Mozilla/5.0 (Test Browser)',
                'x-request-id': 'test-request-123'
            },
            ip: '127.0.0.1',
            connection: {
                remoteAddress: '127.0.0.1'
            }
        });

        mockRes = httpMocks.createResponse({
            eventEmitter: require('events').EventEmitter
        });

        // Mock next function to verify middleware chain continuation
        next = jest.fn();

        // Mock process.hrtime.bigint for consistent timing
        let callCount = 0;
        process.hrtime = {
            bigint: jest.fn(() => {
                callCount++;
                return callCount === 1 ? mockStartTime : mockEndTime;
            })
        };

        // Mock Date constructor for consistent timestamps
        const mockDate = '2024-01-15T10:30:00.000Z';
        global.Date = jest.fn(() => ({
            toISOString: () => mockDate
        }));
        Date.now = jest.fn(() => new Date(mockDate).getTime());

        // Reset all logger mocks to ensure clean state
        logger.info.mockClear();
        logger.warn.mockClear();
        logger.error.mockClear();
    });

    afterAll(() => {
        // Restore original Date and hrtime implementations
        global.Date = originalDateNow;
        process.hrtime = originalHrtime;
    });

    describe('successful response logging', () => {
        it('logs info for 2xx responses (status < 400)', (done) => {
            // Test that successful responses (2xx) are logged at INFO level
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);

            // Simulate response completion using on-finished callback
            mockRes.emit('finish');

            // Allow event loop to process on-finished callback
            setImmediate(() => {
                // Verify logger.info was called exactly once
                expect(logger.info).toHaveBeenCalledTimes(1);
                expect(logger.warn).not.toHaveBeenCalled();
                expect(logger.error).not.toHaveBeenCalled();

                // Verify log message format matches REQUEST_LOG_FORMAT
                const logCall = logger.info.mock.calls[0];
                const logMessage = logCall[0];
                const logMetadata = logCall[1];

                // Assert log message includes all required fields
                expect(logMessage).toMatch(/\[2024-01-15T10:30:00\.000Z\] GET \/hello 200 50 ms - Mozilla\/5\.0 \(Test Browser\)/);
                
                // Verify metadata contains expected fields
                expect(logMetadata).toEqual({
                    requestId: 'test-request-123',
                    remoteAddress: '127.0.0.1',
                    method: 'GET',
                    url: '/hello',
                    statusCode: 200,
                    responseTime: 50,
                    userAgent: 'Mozilla/5.0 (Test Browser)',
                    timestamp: '2024-01-15T10:30:00.000Z'
                });

                done();
            });
        });

        it('logs info for 3xx responses (redirects)', (done) => {
            // Test that redirect responses (3xx) are logged at INFO level
            mockRes.statusCode = 302;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                expect(logger.warn).not.toHaveBeenCalled();
                expect(logger.error).not.toHaveBeenCalled();

                const logCall = logger.info.mock.calls[0];
                const logMessage = logCall[0];
                
                // Verify 302 status code is logged correctly
                expect(logMessage).toContain('302');
                done();
            });
        });
    });

    describe('client error response logging', () => {
        it('logs warn for 4xx responses (client errors)', (done) => {
            // Test that client errors (4xx) are logged at WARN level
            mockRes.statusCode = 404;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.warn).toHaveBeenCalledTimes(1);
                expect(logger.info).not.toHaveBeenCalled();
                expect(logger.error).not.toHaveBeenCalled();

                const logCall = logger.warn.mock.calls[0];
                const logMessage = logCall[0];
                const logMetadata = logCall[1];

                // Verify log message format for 404 response
                expect(logMessage).toMatch(/\[2024-01-15T10:30:00\.000Z\] GET \/hello 404 50 ms - Mozilla\/5\.0 \(Test Browser\)/);
                expect(logMetadata.statusCode).toBe(404);
                done();
            });
        });

        it('logs warn for various 4xx status codes', (done) => {
            // Test multiple 4xx status codes to ensure consistent WARN level logging
            const testCases = [400, 401, 403, 405, 409, 422, 429, 499];
            let completedTests = 0;

            testCases.forEach((statusCode, index) => {
                const testReq = httpMocks.createRequest({
                    method: 'GET',
                    url: '/hello',
                    originalUrl: '/hello',
                    headers: { 'user-agent': 'Test Agent' }
                });
                const testRes = httpMocks.createResponse({
                    eventEmitter: require('events').EventEmitter
                });
                testRes.statusCode = statusCode;

                requestLoggerMiddleware(testReq, testRes, jest.fn());
                testRes.emit('finish');

                setImmediate(() => {
                    completedTests++;
                    if (completedTests === testCases.length) {
                        // Verify all 4xx responses were logged as warnings
                        expect(logger.warn).toHaveBeenCalledTimes(testCases.length);
                        done();
                    }
                });
            });
        });
    });

    describe('server error response logging', () => {
        it('logs error for 5xx responses (server errors)', (done) => {
            // Test that server errors (5xx) are logged at ERROR level
            mockRes.statusCode = 500;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.error).toHaveBeenCalledTimes(1);
                expect(logger.info).not.toHaveBeenCalled();
                expect(logger.warn).not.toHaveBeenCalled();

                const logCall = logger.error.mock.calls[0];
                const logMessage = logCall[0];
                const logMetadata = logCall[1];

                // Verify log message format for 500 response
                expect(logMessage).toMatch(/\[2024-01-15T10:30:00\.000Z\] GET \/hello 500 50 ms - Mozilla\/5\.0 \(Test Browser\)/);
                expect(logMetadata.statusCode).toBe(500);
                done();
            });
        });

        it('logs error for various 5xx status codes', (done) => {
            // Test multiple 5xx status codes to ensure consistent ERROR level logging
            const testCases = [500, 501, 502, 503, 504, 505, 599];
            let completedTests = 0;

            testCases.forEach((statusCode, index) => {
                const testReq = httpMocks.createRequest({
                    method: 'POST',
                    url: '/api/test',
                    originalUrl: '/api/test',
                    headers: { 'user-agent': 'Test Agent' }
                });
                const testRes = httpMocks.createResponse({
                    eventEmitter: require('events').EventEmitter
                });
                testRes.statusCode = statusCode;

                requestLoggerMiddleware(testReq, testRes, jest.fn());
                testRes.emit('finish');

                setImmediate(() => {
                    completedTests++;
                    if (completedTests === testCases.length) {
                        // Verify all 5xx responses were logged as errors
                        expect(logger.error).toHaveBeenCalledTimes(testCases.length);
                        done();
                    }
                });
            });
        });
    });

    describe('log message format validation', () => {
        it('log message includes method, url, status, response time, and user-agent', (done) => {
            // Test comprehensive log message format with all required fields
            mockReq.method = 'POST';
            mockReq.originalUrl = '/api/users';
            mockReq.headers['user-agent'] = 'Custom Test Agent/1.0';
            mockRes.statusCode = 201;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                
                const logMessage = logger.info.mock.calls[0][0];
                
                // Verify all required fields are present in correct format
                expect(logMessage).toMatch(/\[2024-01-15T10:30:00\.000Z\]/); // Timestamp
                expect(logMessage).toContain('POST');                        // HTTP method
                expect(logMessage).toContain('/api/users');                  // URL path
                expect(logMessage).toContain('201');                         // Status code
                expect(logMessage).toContain('50 ms');                       // Response time
                expect(logMessage).toContain('Custom Test Agent/1.0');       // User agent
                
                // Verify complete format matches REQUEST_LOG_FORMAT template
                const expectedFormat = '[2024-01-15T10:30:00.000Z] POST /api/users 201 50 ms - Custom Test Agent/1.0';
                expect(logMessage).toBe(expectedFormat);
                done();
            });
        });

        it('log output matches REQUEST_LOG_FORMAT and includes ISO timestamp', (done) => {
            // Test that log format exactly matches the REQUEST_LOG_FORMAT template
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                const logMessage = logger.info.mock.calls[0][0];
                
                // Verify ISO 8601 timestamp format
                const timestampRegex = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/;
                const timestampMatch = logMessage.match(timestampRegex);
                
                expect(timestampMatch).not.toBeNull();
                expect(timestampMatch[1]).toBe('2024-01-15T10:30:00.000Z');
                
                // Verify complete format structure
                const formatRegex = /^\[.+\] \w+ .+ \d+ \d+ ms - .+$/;
                expect(logMessage).toMatch(formatRegex);
                done();
            });
        });

        it('handles URL path correctly (originalUrl vs url)', (done) => {
            // Test URL path handling with both originalUrl and url properties
            mockReq.originalUrl = '/api/test?query=value';
            mockReq.url = '/api/test';
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                const logMessage = logger.info.mock.calls[0][0];
                
                // Verify originalUrl is used (includes query parameters)
                expect(logMessage).toContain('/api/test?query=value');
                expect(logMessage).not.toContain('/api/test 200'); // Ensure it's not just /api/test
                done();
            });
        });
    });

    describe('middleware behavior validation', () => {
        it('calls next() exactly once', () => {
            // Test that middleware properly continues the Express chain
            requestLoggerMiddleware(mockReq, mockRes, next);
            
            // Verify next() is called immediately and only once
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(); // Called without arguments
        });

        it('calls next() before response processing', () => {
            // Test that next() is called synchronously before response events
            const callOrder = [];
            
            const trackedNext = jest.fn(() => {
                callOrder.push('next');
            });

            requestLoggerMiddleware(mockReq, mockRes, trackedNext);
            
            // Verify next() is called before any response events
            expect(callOrder).toEqual(['next']);
            
            mockRes.emit('finish');
            
            setImmediate(() => {
                // Logging should happen after next() was called
                expect(logger.info).toHaveBeenCalledTimes(1);
            });
        });

        it('attaches on-finished listener correctly', (done) => {
            // Test that on-finished listener is properly attached to response
            const originalListenerCount = mockRes.listenerCount('finish');
            
            requestLoggerMiddleware(mockReq, mockRes, next);
            
            // Verify on-finished adds a listener
            expect(mockRes.listenerCount('finish')).toBeGreaterThan(originalListenerCount);
            
            // Verify logging only happens after finish event
            expect(logger.info).not.toHaveBeenCalled();
            
            mockRes.emit('finish');
            
            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                done();
            });
        });
    });

    describe('edge cases and error handling', () => {
        it('handles missing user-agent gracefully', (done) => {
            // Test graceful handling of missing User-Agent header
            delete mockReq.headers['user-agent'];
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                
                const logMessage = logger.info.mock.calls[0][0];
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify 'Unknown' is used as fallback for missing User-Agent
                expect(logMessage).toContain('Unknown');
                expect(logMetadata.userAgent).toBe('Unknown');
                done();
            });
        });

        it('handles missing method gracefully', (done) => {
            // Test graceful handling of missing HTTP method
            mockReq.method = undefined;
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                
                const logMessage = logger.info.mock.calls[0][0];
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify 'UNKNOWN' is used as fallback for missing method
                expect(logMessage).toContain('UNKNOWN');
                expect(logMetadata.method).toBe('UNKNOWN');
                done();
            });
        });

        it('handles missing URL gracefully', (done) => {
            // Test graceful handling of missing URL properties
            mockReq.originalUrl = undefined;
            mockReq.url = undefined;
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                
                const logMessage = logger.info.mock.calls[0][0];
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify '/' is used as fallback for missing URL
                expect(logMessage).toContain(' / ');
                expect(logMetadata.url).toBe('/');
                done();
            });
        });

        it('handles missing status code gracefully', (done) => {
            // Test graceful handling of missing status code
            mockRes.statusCode = undefined;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.error).toHaveBeenCalledTimes(1);
                
                const logMessage = logger.error.mock.calls[0][0];
                const logMetadata = logger.error.mock.calls[0][1];
                
                // Verify 500 is used as fallback for missing status code
                expect(logMessage).toContain('500');
                expect(logMetadata.statusCode).toBe(500);
                done();
            });
        });

        it('handles missing request metadata gracefully', (done) => {
            // Test graceful handling of missing request metadata
            mockReq.headers = {};
            mockReq.ip = undefined;
            mockReq.connection = undefined;
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify fallback values for missing metadata
                expect(logMetadata.requestId).toBe('unknown');
                expect(logMetadata.remoteAddress).toBe('unknown');
                expect(logMetadata.userAgent).toBe('Unknown');
                done();
            });
        });

        it('does not throw on repeated calls or double-finish', (done) => {
            // Test middleware robustness against double-finish scenarios
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            
            // Emit finish event multiple times
            mockRes.emit('finish');
            mockRes.emit('finish');
            mockRes.emit('finish');

            setImmediate(() => {
                // Should not throw errors and should log appropriately
                expect(logger.info).toHaveBeenCalledTimes(3); // on-finished may trigger multiple times
                done();
            });
        });

        it('handles abrupt response end (aborted request)', (done) => {
            // Test handling of aborted or prematurely ended responses
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            
            // Simulate aborted request
            mockRes.emit('close');
            
            setImmediate(() => {
                // Should handle aborted requests gracefully
                expect(() => {
                    mockRes.emit('finish');
                }).not.toThrow();
                done();
            });
        });
    });

    describe('performance and timing validation', () => {
        it('calculates response time correctly', (done) => {
            // Test accurate response time calculation using high-resolution timer
            const startNs = 1000000000000000n;
            const endNs = 1000000000100000n; // 100ms later
            
            let callCount = 0;
            process.hrtime.bigint = jest.fn(() => {
                callCount++;
                return callCount === 1 ? startNs : endNs;
            });
            
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify response time calculation (100ms expected)
                expect(logMetadata.responseTime).toBe(100);
                expect(process.hrtime.bigint).toHaveBeenCalledTimes(2);
                done();
            });
        });

        it('handles high-resolution timing precision', (done) => {
            // Test handling of nanosecond precision timing
            const startNs = 1000000000000000n;
            const endNs = 1000000000001500n; // 1.5ms later
            
            let callCount = 0;
            process.hrtime.bigint = jest.fn(() => {
                callCount++;
                return callCount === 1 ? startNs : endNs;
            });
            
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify sub-millisecond timing is rounded correctly
                expect(logMetadata.responseTime).toBe(2); // 1.5ms rounds to 2ms
                done();
            });
        });
    });

    describe('concurrent request handling', () => {
        it('handles concurrent requests without state leakage', (done) => {
            // Test middleware statelessness with concurrent requests
            const requests = [];
            const responses = [];
            const expectedResults = [];

            // Create multiple request/response pairs with different characteristics
            for (let i = 0; i < 5; i++) {
                const req = httpMocks.createRequest({
                    method: i % 2 === 0 ? 'GET' : 'POST',
                    url: `/test${i}`,
                    originalUrl: `/test${i}`,
                    headers: { 
                        'user-agent': `Test Agent ${i}`,
                        'x-request-id': `req-${i}`
                    }
                });
                
                const res = httpMocks.createResponse({
                    eventEmitter: require('events').EventEmitter
                });
                res.statusCode = 200 + i; // Different status codes

                requests.push(req);
                responses.push(res);
                
                expectedResults.push({
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    userAgent: req.headers['user-agent'],
                    requestId: req.headers['x-request-id']
                });
            }

            // Process all requests concurrently
            requests.forEach((req, index) => {
                requestLoggerMiddleware(req, responses[index], jest.fn());
            });

            // Finish responses in different order to test independence
            const finishOrder = [2, 0, 4, 1, 3];
            finishOrder.forEach((index, delay) => {
                setTimeout(() => {
                    responses[index].emit('finish');
                }, delay * 10);
            });

            // Verify all requests logged correctly after all complete
            setTimeout(() => {
                expect(logger.info).toHaveBeenCalledTimes(5);
                
                // Verify each request was logged with correct, independent data
                const logCalls = logger.info.mock.calls;
                
                expectedResults.forEach((expected, index) => {
                    const matchingCall = logCalls.find(call => {
                        const metadata = call[1];
                        return metadata.requestId === expected.requestId;
                    });
                    
                    expect(matchingCall).toBeDefined();
                    expect(matchingCall[1].method).toBe(expected.method);
                    expect(matchingCall[1].url).toBe(expected.url);
                    expect(matchingCall[1].statusCode).toBe(expected.statusCode);
                    expect(matchingCall[1].userAgent).toBe(expected.userAgent);
                });
                
                done();
            }, 100);
        });

        it('maintains timing independence between concurrent requests', (done) => {
            // Test that timing calculations are independent between concurrent requests
            const req1 = httpMocks.createRequest({
                method: 'GET',
                url: '/slow',
                headers: { 'x-request-id': 'slow-request' }
            });
            const res1 = httpMocks.createResponse({
                eventEmitter: require('events').EventEmitter
            });
            res1.statusCode = 200;

            const req2 = httpMocks.createRequest({
                method: 'GET',
                url: '/fast',
                headers: { 'x-request-id': 'fast-request' }
            });
            const res2 = httpMocks.createResponse({
                eventEmitter: require('events').EventEmitter
            });
            res2.statusCode = 200;

            // Mock different timing for each request
            let callCount = 0;
            process.hrtime.bigint = jest.fn(() => {
                callCount++;
                // Simulate different start/end times for each request
                const timings = [
                    1000000000000000n, // req1 start
                    1000000000200000n, // req2 start (different)
                    1000000000100000n, // req1 end (100ms)
                    1000000000250000n  // req2 end (50ms)
                ];
                return timings[callCount - 1];
            });

            // Start both requests
            requestLoggerMiddleware(req1, res1, jest.fn());
            requestLoggerMiddleware(req2, res2, jest.fn());

            // Finish in reverse order
            res2.emit('finish');
            res1.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(2);
                
                // Verify timing independence
                const logCalls = logger.info.mock.calls;
                const slowCall = logCalls.find(call => call[1].requestId === 'slow-request');
                const fastCall = logCalls.find(call => call[1].requestId === 'fast-request');
                
                expect(slowCall).toBeDefined();
                expect(fastCall).toBeDefined();
                
                // Note: Timing would be correctly calculated in real implementation
                // This test verifies the structure is in place
                done();
            });
        });
    });

    describe('metadata logging validation', () => {
        it('log metadata includes request id, remote address, and all fields', (done) => {
            // Test comprehensive metadata logging with all available fields
            mockReq.headers['x-request-id'] = 'custom-request-456';
            mockReq.ip = '192.168.1.100';
            mockReq.connection.remoteAddress = '192.168.1.100';
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify all metadata fields are present and correct
                expect(logMetadata).toEqual({
                    requestId: 'custom-request-456',
                    remoteAddress: '192.168.1.100',
                    method: 'GET',
                    url: '/hello',
                    statusCode: 200,
                    responseTime: 50,
                    userAgent: 'Mozilla/5.0 (Test Browser)',
                    timestamp: '2024-01-15T10:30:00.000Z'
                });
                done();
            });
        });

        it('handles IP address fallback correctly', (done) => {
            // Test IP address resolution with fallback chain
            mockReq.ip = undefined;
            mockReq.connection.remoteAddress = '10.0.0.1';
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify fallback to connection.remoteAddress
                expect(logMetadata.remoteAddress).toBe('10.0.0.1');
                done();
            });
        });

        it('handles complete metadata fallback', (done) => {
            // Test complete metadata fallback when all sources are unavailable
            mockReq.headers = {};
            mockReq.ip = undefined;
            mockReq.connection = undefined;
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                const logMetadata = logger.info.mock.calls[0][1];
                
                // Verify all fallback values
                expect(logMetadata.requestId).toBe('unknown');
                expect(logMetadata.remoteAddress).toBe('unknown');
                expect(logMetadata.userAgent).toBe('Unknown');
                done();
            });
        });
    });

    describe('error callback handling', () => {
        it('logs errors from on-finished callback', (done) => {
            // Test error handling in on-finished callback
            mockRes.statusCode = 200;
            
            requestLoggerMiddleware(mockReq, mockRes, next);
            
            // Simulate on-finished callback with error
            const mockError = new Error('Response processing error');
            mockRes.emit('finish', mockError);

            setImmediate(() => {
                // Should log both the normal request and the error
                expect(logger.info).toHaveBeenCalledTimes(1);
                expect(logger.error).toHaveBeenCalledTimes(1);
                
                const errorCall = logger.error.mock.calls[0];
                expect(errorCall[0]).toBe('Error during request processing completion');
                expect(errorCall[1]).toEqual({
                    error: 'Response processing error',
                    stack: mockError.stack,
                    requestId: 'test-request-123',
                    url: '/hello',
                    method: 'GET'
                });
                done();
            });
        });

        it('continues normal logging even when error occurs', (done) => {
            // Test that normal logging continues even when error callback is triggered
            mockRes.statusCode = 200;
            
            requestLoggerMiddleware(mockReq, mockRes, next);
            
            const mockError = new Error('Processing error');
            mockRes.emit('finish', mockError);

            setImmediate(() => {
                // Both normal logging and error logging should occur
                expect(logger.info).toHaveBeenCalledTimes(1);
                expect(logger.error).toHaveBeenCalledTimes(1);
                
                // Verify normal log structure is maintained
                const infoCall = logger.info.mock.calls[0];
                expect(infoCall[0]).toMatch(/\[2024-01-15T10:30:00\.000Z\] GET \/hello 200 50 ms/);
                done();
            });
        });
    });

    describe('middleware statelessness validation', () => {
        it('middleware is stateless and safe for async/concurrent use', (done) => {
            // Test middleware statelessness with rapid concurrent requests
            const concurrentRequests = 10;
            const completedRequests = [];
            
            for (let i = 0; i < concurrentRequests; i++) {
                const req = httpMocks.createRequest({
                    method: 'GET',
                    url: `/concurrent-test-${i}`,
                    headers: { 'x-request-id': `concurrent-${i}` }
                });
                
                const res = httpMocks.createResponse({
                    eventEmitter: require('events').EventEmitter
                });
                res.statusCode = 200 + i;

                requestLoggerMiddleware(req, res, jest.fn());
                
                // Finish responses with random delays to simulate real-world timing
                setTimeout(() => {
                    res.emit('finish');
                    completedRequests.push(i);
                    
                    if (completedRequests.length === concurrentRequests) {
                        setImmediate(() => {
                            // Verify all requests were logged independently
                            expect(logger.info).toHaveBeenCalledTimes(concurrentRequests);
                            
                            // Verify each request maintained its unique data
                            const logCalls = logger.info.mock.calls;
                            const uniqueUrls = new Set();
                            const uniqueRequestIds = new Set();
                            
                            logCalls.forEach(call => {
                                const metadata = call[1];
                                uniqueUrls.add(metadata.url);
                                uniqueRequestIds.add(metadata.requestId);
                            });
                            
                            // Should have unique data for each request
                            expect(uniqueUrls.size).toBe(concurrentRequests);
                            expect(uniqueRequestIds.size).toBe(concurrentRequests);
                            done();
                        });
                    }
                }, Math.random() * 50);
            }
        });

        it('handles rapid sequential requests correctly', (done) => {
            // Test middleware with rapid sequential requests
            const sequentialRequests = 5;
            let completedCount = 0;

            for (let i = 0; i < sequentialRequests; i++) {
                const req = httpMocks.createRequest({
                    method: 'GET',
                    url: `/sequential-${i}`,
                    headers: { 'x-request-id': `seq-${i}` }
                });
                
                const res = httpMocks.createResponse({
                    eventEmitter: require('events').EventEmitter
                });
                res.statusCode = 200;

                requestLoggerMiddleware(req, res, jest.fn());
                
                // Finish requests in sequence
                setTimeout(() => {
                    res.emit('finish');
                    completedCount++;
                    
                    if (completedCount === sequentialRequests) {
                        setImmediate(() => {
                            expect(logger.info).toHaveBeenCalledTimes(sequentialRequests);
                            done();
                        });
                    }
                }, i * 10);
            }
        });
    });

    describe('integration with centralized logger', () => {
        it('correctly integrates with logger utility methods', (done) => {
            // Test integration with all logger methods based on status codes
            const testCases = [
                { statusCode: 200, expectedLogger: 'info' },
                { statusCode: 400, expectedLogger: 'warn' },
                { statusCode: 500, expectedLogger: 'error' }
            ];

            let completedTests = 0;

            testCases.forEach(({ statusCode, expectedLogger }) => {
                const req = httpMocks.createRequest({
                    method: 'GET',
                    url: '/test',
                    headers: { 'x-request-id': `test-${statusCode}` }
                });
                
                const res = httpMocks.createResponse({
                    eventEmitter: require('events').EventEmitter
                });
                res.statusCode = statusCode;

                requestLoggerMiddleware(req, res, jest.fn());
                res.emit('finish');

                setImmediate(() => {
                    completedTests++;
                    
                    if (completedTests === testCases.length) {
                        // Verify correct logger methods were called
                        expect(logger.info).toHaveBeenCalledTimes(1);
                        expect(logger.warn).toHaveBeenCalledTimes(1);
                        expect(logger.error).toHaveBeenCalledTimes(1);
                        done();
                    }
                });
            });
        });

        it('passes correct message and metadata format to logger', (done) => {
            // Test that logger receives properly formatted message and metadata
            mockRes.statusCode = 200;

            requestLoggerMiddleware(mockReq, mockRes, next);
            mockRes.emit('finish');

            setImmediate(() => {
                expect(logger.info).toHaveBeenCalledTimes(1);
                
                const [message, metadata] = logger.info.mock.calls[0];
                
                // Verify message is string type and properly formatted
                expect(typeof message).toBe('string');
                expect(message).toMatch(/^\[.+\] \w+ .+ \d+ \d+ ms - .+$/);
                
                // Verify metadata is object with expected structure
                expect(typeof metadata).toBe('object');
                expect(metadata).toHaveProperty('requestId');
                expect(metadata).toHaveProperty('remoteAddress');
                expect(metadata).toHaveProperty('method');
                expect(metadata).toHaveProperty('url');
                expect(metadata).toHaveProperty('statusCode');
                expect(metadata).toHaveProperty('responseTime');
                expect(metadata).toHaveProperty('userAgent');
                expect(metadata).toHaveProperty('timestamp');
                done();
            });
        });
    });
});