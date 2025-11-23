// Jest testing framework for comprehensive unit testing

// Import the middleware and error handler functions under test
const { requestTimeout, handleTimeoutError } = require('../../../middleware/requestTimeout.js');

// Import utility functions for timeout management testing
const { createRequestTimeout, clearRequestTimeout } = require('../../../utils/requestTimeout.js');

// Import AppError class for error assertion validation
const { AppError } = require('../../../utils/errors.js');

// Import logger for stubbing in test environment
const { logger } = require('../../../utils/logger.js');

// Global test configuration constants
const TEST_TIMEOUT_MS = 100; // Short timeout for fast test execution
const DEFAULT_TIMEOUT_MS = 5000; // Default timeout from middleware

// Test suite for requestTimeout middleware functionality
describe('requestTimeout middleware', () => {
    // Mock request, response, and next objects for each test case
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        // Set up fresh mock objects for each test to ensure isolation
        mockReq = {
            method: 'GET',
            originalUrl: '/test',
            url: '/test',
            ip: '127.0.0.1',
            get: jest.fn((header) => {
                const headers = {
                    'User-Agent': 'Test-Agent',
                    'Content-Length': '0'
                };
                return headers[header];
            }),
            connection: {
                remoteAddress: '127.0.0.1'
            }
        };

        mockRes = {
            on: jest.fn(),
            once: jest.fn(),
            emit: jest.fn(),
            removeListener: jest.fn(),
            removeAllListeners: jest.fn()
        };

        mockNext = jest.fn();

        // Enable Jest fake timers for deterministic timeout testing
        jest.useFakeTimers();
        
        // Stub logger methods to prevent console output during tests
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Clean up after each test to prevent side effects
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    // Test case: Verify middleware attaches abort signal to request object
    test('should attach abort signal to req', () => {
        // Arrange: Create middleware instance with test timeout
        const middleware = requestTimeout({ timeoutMs: TEST_TIMEOUT_MS });

        // Act: Execute middleware with mock objects
        middleware(mockReq, mockRes, mockNext);

        // Assert: Verify abort signal is attached to request
        expect(mockReq.abortSignal).toBeDefined();
        expect(mockReq.abortSignal).toBeInstanceOf(AbortSignal);
        expect(mockReq.signal).toBeDefined();
        expect(mockReq.signal).toBeInstanceOf(AbortSignal);
        expect(mockReq.abortSignal).toBe(mockReq.signal);
        
        // Verify timeout configuration is stored on request
        expect(mockReq.timeoutMs).toBe(TEST_TIMEOUT_MS);
        expect(mockReq.timeoutId).toBeDefined();
        expect(mockReq.timedOut).toBe(false);
        
        // Verify cleanup function is attached
        expect(mockReq.timeoutCleanup).toBeDefined();
        expect(typeof mockReq.timeoutCleanup).toBe('function');
        
        // Verify next was called to continue middleware chain
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
    });

    // Test case: Verify request aborts and error is forwarded after timeout
    test('should abort request and call next with timeout error after timeout', () => {
        // Arrange: Create middleware instance with test timeout
        const middleware = requestTimeout({ timeoutMs: TEST_TIMEOUT_MS });

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Verify initial state before timeout
        expect(mockReq.timedOut).toBe(false);
        expect(mockNext).toHaveBeenCalledWith(); // Initial next() call

        // Clear the initial next() call for timeout testing
        mockNext.mockClear();

        // Advance timers to trigger timeout
        jest.advanceTimersByTime(TEST_TIMEOUT_MS);

        // Assert: Verify timeout behavior
        expect(mockReq.timedOut).toBe(true);
        expect(mockNext).toHaveBeenCalledTimes(1);
        
        // Verify error is passed to next()
        const errorArg = mockNext.mock.calls[0][0];
        expect(errorArg).toBeInstanceOf(Error);
        expect(errorArg.message).toBe('AbortError: Request timeout');
        
        // Verify logger was called for timeout event
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout occurred, signal aborted',
            expect.objectContaining({
                action: 'request_timeout_triggered'
            })
        );
    });

    // Test case: Verify timer cleanup occurs on response finish event
    test('should clean up timer on res finish event', () => {
        // Arrange: Create middleware instance and spy on clearTimeout
        const middleware = requestTimeout({ timeoutMs: TEST_TIMEOUT_MS });
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Verify response event listeners were registered
        expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
        expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));
        expect(mockRes.on).toHaveBeenCalledWith('error', expect.any(Function));

        // Simulate response finish event
        const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
        finishHandler();

        // Assert: Verify cleanup occurred
        expect(clearTimeoutSpy).toHaveBeenCalledWith(mockReq.timeoutId);
        expect(logger.info).toHaveBeenCalledWith(
            'Response finished, cleaning up timeout',
            expect.objectContaining({
                action: 'response_finished'
            })
        );
        
        // Verify cleanup was logged
        expect(logger.info).toHaveBeenCalledWith(
            'Request timeout cleanup completed',
            expect.objectContaining({
                action: 'timeout_cleanup_complete'
            })
        );
    });

    // Test case: Verify timer cleanup occurs on response close event
    test('should clean up timer on res close event', () => {
        // Arrange: Create middleware instance and spy on clearTimeout
        const middleware = requestTimeout({ timeoutMs: TEST_TIMEOUT_MS });
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Simulate response close event
        const closeHandler = mockRes.on.mock.calls.find(call => call[0] === 'close')[1];
        closeHandler();

        // Assert: Verify cleanup occurred
        expect(clearTimeoutSpy).toHaveBeenCalledWith(mockReq.timeoutId);
        expect(logger.info).toHaveBeenCalledWith(
            'Response connection closed, cleaning up timeout',
            expect.objectContaining({
                action: 'response_closed'
            })
        );
    });

    // Test case: Verify timer cleanup occurs on response error event
    test('should clean up timer on res error event', () => {
        // Arrange: Create middleware instance and spy on clearTimeout
        const middleware = requestTimeout({ timeoutMs: TEST_TIMEOUT_MS });
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Simulate response error event
        const errorHandler = mockRes.on.mock.calls.find(call => call[0] === 'error')[1];
        const testError = new Error('Test error');
        errorHandler(testError);

        // Assert: Verify cleanup occurred
        expect(clearTimeoutSpy).toHaveBeenCalledWith(mockReq.timeoutId);
        expect(logger.warn).toHaveBeenCalledWith(
            'Response error occurred, cleaning up timeout',
            expect.objectContaining({
                action: 'response_error',
                error: expect.objectContaining({
                    message: 'Test error'
                })
            })
        );
    });

    // Test case: Verify normal requests don't trigger timeout or error
    test('should not abort or error for fast requests', () => {
        // Arrange: Create middleware instance with longer timeout
        const middleware = requestTimeout({ timeoutMs: 1000 });

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Simulate fast request completion by triggering finish event
        const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
        finishHandler();

        // Advance timers slightly but not to timeout
        jest.advanceTimersByTime(500);

        // Assert: Verify no timeout occurred
        expect(mockReq.timedOut).toBe(false);
        expect(mockNext).toHaveBeenCalledTimes(1); // Only the initial call
        expect(mockNext).toHaveBeenCalledWith(); // No error argument
    });

    // Test case: Verify middleware handles timeout creation failure gracefully
    test('should handle timeout creation failure gracefully', () => {
        // Arrange: Mock createRequestTimeout to throw an error
        const createRequestTimeoutSpy = jest.spyOn(require('../../../utils/requestTimeout.js'), 'createRequestTimeout');
        createRequestTimeoutSpy.mockImplementation(() => {
            throw new Error('Timeout creation failed');
        });

        const middleware = requestTimeout({ timeoutMs: TEST_TIMEOUT_MS });

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Assert: Verify error was logged and middleware continued
        expect(logger.error).toHaveBeenCalledWith(
            'Failed to create request timeout controller',
            expect.objectContaining({
                action: 'timeout_creation_failed'
            })
        );
        
        // Verify middleware continued without timeout
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
        
        // Verify request doesn't have timeout properties
        expect(mockReq.abortSignal).toBeUndefined();
        expect(mockReq.timeoutId).toBeUndefined();

        // Restore original implementation
        createRequestTimeoutSpy.mockRestore();
    });

    // Test case: Verify middleware uses default timeout when no options provided
    test('should use default timeout when no options provided', () => {
        // Arrange: Create middleware without options
        const middleware = requestTimeout();

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Assert: Verify default timeout is used
        expect(mockReq.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
        expect(logger.info).toHaveBeenCalledWith(
            'Request timeout middleware initialized',
            expect.objectContaining({
                timeoutMs: DEFAULT_TIMEOUT_MS,
                hasCustomTimeout: false
            })
        );
    });

    // Test case: Verify middleware uses custom timeout when provided
    test('should use custom timeout when provided in options', () => {
        // Arrange: Create middleware with custom timeout
        const customTimeout = 3000;
        const middleware = requestTimeout({ timeoutMs: customTimeout });

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Assert: Verify custom timeout is used
        expect(mockReq.timeoutMs).toBe(customTimeout);
        expect(logger.info).toHaveBeenCalledWith(
            'Request timeout middleware initialized',
            expect.objectContaining({
                timeoutMs: customTimeout,
                hasCustomTimeout: true
            })
        );
    });

    // Test case: Verify middleware handles already aborted signal gracefully
    test('should handle already aborted signal gracefully', () => {
        // Arrange: Mock createRequestTimeout to return already aborted controller
        const createRequestTimeoutSpy = jest.spyOn(require('../../../utils/requestTimeout.js'), 'createRequestTimeout');
        const mockController = new AbortController();
        mockController.abort(); // Pre-abort the controller
        
        createRequestTimeoutSpy.mockReturnValue({
            controller: mockController,
            timeoutId: setTimeout(() => {}, 1000)
        });

        const middleware = requestTimeout({ timeoutMs: TEST_TIMEOUT_MS });

        // Act: Execute middleware
        middleware(mockReq, mockRes, mockNext);

        // Assert: Verify immediate timeout handling
        expect(mockReq.timedOut).toBe(true);
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

        // Restore original implementation
        createRequestTimeoutSpy.mockRestore();
    });
});

// Test suite for handleTimeoutError function functionality
describe('handleTimeoutError', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        // Set up fresh mock objects for each test
        mockReq = {
            method: 'GET',
            originalUrl: '/test',
            url: '/test',
            ip: '127.0.0.1',
            get: jest.fn((header) => {
                const headers = {
                    'User-Agent': 'Test-Agent'
                };
                return headers[header];
            }),
            connection: {
                remoteAddress: '127.0.0.1'
            },
            timeoutMs: TEST_TIMEOUT_MS,
            startTime: Date.now() - 200 // Simulate 200ms request duration
        };

        mockRes = {};
        mockNext = jest.fn();

        // Stub logger methods to prevent console output during tests
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Clean up after each test
        jest.restoreAllMocks();
    });

    // Test case: Verify handleTimeoutError detects AbortError and forwards AppError with 504 status
    test('should forward standardized AppError with 504 on AbortError', () => {
        // Arrange: Create AbortError to simulate timeout
        const abortError = new Error('Request timeout');
        abortError.name = 'AbortError';

        // Act: Execute handleTimeoutError
        handleTimeoutError(abortError, mockReq, mockRes, mockNext);

        // Assert: Verify timeout error was logged
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout detected, generating 504 response',
            expect.objectContaining({
                action: 'timeout_error_handling',
                error: expect.objectContaining({
                    name: 'AbortError',
                    type: 'AbortError'
                })
            })
        );

        // Verify AppError with 504 status was forwarded
        expect(mockNext).toHaveBeenCalledTimes(1);
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        expect(forwardedError.status).toBe(504);
        expect(forwardedError.message).toBe('Request timed out');
    });

    // Test case: Verify handleTimeoutError detects req.timedOut and forwards AppError with 504 status
    test('should forward standardized AppError with 504 on req.timedOut', () => {
        // Arrange: Set req.timedOut to simulate timeout
        mockReq.timedOut = true;
        const genericError = new Error('Generic error');

        // Act: Execute handleTimeoutError
        handleTimeoutError(genericError, mockReq, mockRes, mockNext);

        // Assert: Verify timeout error was logged
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout detected, generating 504 response',
            expect.objectContaining({
                action: 'timeout_error_handling',
                error: expect.objectContaining({
                    type: 'CustomTimeout'
                })
            })
        );

        // Verify AppError with 504 status was forwarded
        expect(mockNext).toHaveBeenCalledTimes(1);
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        expect(forwardedError.status).toBe(504);
        expect(forwardedError.message).toBe('Request timed out');
    });

    // Test case: Verify handleTimeoutError calls next(err) for non-timeout errors
    test('should call next(err) for non-timeout errors', () => {
        // Arrange: Create non-timeout error
        const nonTimeoutError = new Error('Database connection failed');
        nonTimeoutError.name = 'DatabaseError';

        // Act: Execute handleTimeoutError
        handleTimeoutError(nonTimeoutError, mockReq, mockRes, mockNext);

        // Assert: Verify non-timeout error was logged
        expect(logger.info).toHaveBeenCalledWith(
            'Non-timeout error passed through timeout handler',
            expect.objectContaining({
                action: 'passthrough_error',
                error: expect.objectContaining({
                    name: 'DatabaseError',
                    message: 'Database connection failed'
                })
            })
        );

        // Verify original error was passed through unchanged
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(nonTimeoutError);
    });

    // Test case: Verify handleTimeoutError logs warning for timeout errors
    test('should log a warning when a timeout error is handled', () => {
        // Arrange: Create AbortError to simulate timeout
        const abortError = new Error('Request timeout');
        abortError.name = 'AbortError';

        // Act: Execute handleTimeoutError
        handleTimeoutError(abortError, mockReq, mockRes, mockNext);

        // Assert: Verify warning was logged with proper context
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout detected, generating 504 response',
            expect.objectContaining({
                action: 'timeout_error_handling',
                error: expect.objectContaining({
                    name: 'AbortError',
                    message: 'Request timeout'
                }),
                request: expect.objectContaining({
                    method: 'GET',
                    url: '/test',
                    ip: '127.0.0.1',
                    timeout: TEST_TIMEOUT_MS
                })
            })
        );

        // Verify comprehensive request context was included
        const logCall = logger.warn.mock.calls[0];
        const logContext = logCall[1];
        expect(logContext.request).toHaveProperty('method', 'GET');
        expect(logContext.request).toHaveProperty('url', '/test');
        expect(logContext.request).toHaveProperty('userAgent', 'Test-Agent');
        expect(logContext.request).toHaveProperty('ip', '127.0.0.1');
        expect(logContext.request).toHaveProperty('timeout', TEST_TIMEOUT_MS);
        expect(logContext.request).toHaveProperty('duration');
    });

    // Test case: Verify handleTimeoutError handles undefined/null request gracefully
    test('should handle undefined request gracefully', () => {
        // Arrange: Create AbortError with undefined request
        const abortError = new Error('Request timeout');
        abortError.name = 'AbortError';

        // Act: Execute handleTimeoutError with undefined request
        handleTimeoutError(abortError, undefined, mockRes, mockNext);

        // Assert: Verify error was still processed
        expect(mockNext).toHaveBeenCalledTimes(1);
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        expect(forwardedError.status).toBe(504);
        
        // Verify logging occurred with fallback values
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout detected, generating 504 response',
            expect.objectContaining({
                request: expect.objectContaining({
                    method: 'UNKNOWN',
                    url: 'UNKNOWN'
                })
            })
        );
    });

    // Test case: Verify handleTimeoutError includes proper error context in AppError
    test('should include proper error context in AppError', () => {
        // Arrange: Create AbortError to simulate timeout
        const abortError = new Error('Custom timeout message');
        abortError.name = 'AbortError';

        // Act: Execute handleTimeoutError
        handleTimeoutError(abortError, mockReq, mockRes, mockNext);

        // Assert: Verify AppError includes proper context
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        expect(forwardedError.status).toBe(504);
        expect(forwardedError.message).toBe('Request timed out');
        
        // Verify error details include timeout context
        expect(forwardedError.details).toEqual(
            expect.objectContaining({
                originalError: 'AbortError',
                timeoutDuration: TEST_TIMEOUT_MS,
                requestUrl: '/test',
                requestMethod: 'GET'
            })
        );
    });
});

// Test suite for utility function integration
describe('utility function integration', () => {
    beforeEach(() => {
        // Enable fake timers for timeout testing
        jest.useFakeTimers();
        
        // Stub logger to prevent console output
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Clean up after each test
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    // Test case: Verify createRequestTimeout returns controller and timeoutId
    test('createRequestTimeout should return controller and timeoutId', () => {
        // Act: Create request timeout
        const result = createRequestTimeout(TEST_TIMEOUT_MS);

        // Assert: Verify return structure
        expect(result).toHaveProperty('controller');
        expect(result).toHaveProperty('timeoutId');
        expect(result.controller).toBeInstanceOf(AbortController);
        expect(result.controller.signal).toBeInstanceOf(AbortSignal);
        expect(result.timeoutId).toBeDefined();
    });

    // Test case: Verify clearRequestTimeout clears the timer
    test('clearRequestTimeout should clear the timeout timer', () => {
        // Arrange: Create timeout and spy on clearTimeout
        const { timeoutId } = createRequestTimeout(TEST_TIMEOUT_MS);
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        // Act: Clear the timeout
        clearRequestTimeout(timeoutId);

        // Assert: Verify clearTimeout was called
        expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
        expect(logger.info).toHaveBeenCalledWith(
            'Request timeout cleared successfully',
            expect.objectContaining({
                action: 'timeout_cleared'
            })
        );
    });

    // Test case: Verify timeout triggers abort signal
    test('should trigger abort signal when timeout expires', () => {
        // Arrange: Create timeout and set up abort listener
        const { controller } = createRequestTimeout(TEST_TIMEOUT_MS);
        const abortListener = jest.fn();
        controller.signal.addEventListener('abort', abortListener);

        // Act: Advance timers to trigger timeout
        jest.advanceTimersByTime(TEST_TIMEOUT_MS);

        // Assert: Verify abort was triggered
        expect(controller.signal.aborted).toBe(true);
        expect(abortListener).toHaveBeenCalledTimes(1);
    });
});