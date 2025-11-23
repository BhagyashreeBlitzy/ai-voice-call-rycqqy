// Test framework and utilities

// Internal imports for testing the request timeout utility
const { 
    createRequestTimeout, 
    clearRequestTimeout, 
    handleTimeoutError 
} = require('../../../utils/requestTimeout.js');
const { AppError } = require('../../../utils/errors.js');
const { logger } = require('../../../utils/logger.js');

// Built-in Node.js AbortController is available as a global in Node.js v18+
// No require statement needed - AbortController is a global object

// Global test constants
const MOCK_TIMEOUT_MS = 50;

// Mock logger methods to capture log calls without actual output during testing
jest.mock('../../../utils/logger.js', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Clear all mocks before each test to ensure test isolation
beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
});

// Restore real timers after each test to prevent interference
afterEach(() => {
    jest.useRealTimers();
});

describe('createRequestTimeout', () => {
    /**
     * Test: Verifies that createRequestTimeout returns an object with a valid AbortController and a timer id
     * This test ensures the basic contract of the function is fulfilled
     */
    it('should return an AbortController and timeoutId', () => {
        // Act: Create a request timeout with the test timeout value
        const result = createRequestTimeout(MOCK_TIMEOUT_MS);
        
        // Assert: Verify the returned object has the expected structure
        expect(result).toHaveProperty('controller');
        expect(result).toHaveProperty('timeoutId');
        
        // Assert: Verify the controller is an instance of AbortController
        expect(result.controller).toBeInstanceOf(AbortController);
        
        // Assert: Verify the timeoutId is a valid timeout reference (object type for Node.js setTimeout)
        expect(typeof result.timeoutId).toBe('object');
        
        // Assert: Verify the controller is not aborted immediately after creation
        expect(result.controller.signal.aborted).toBe(false);
        
        // Assert: Verify info logging was called for timeout creation
        expect(logger.info).toHaveBeenCalledWith(
            'Request timeout created successfully',
            expect.objectContaining({
                timeoutMs: MOCK_TIMEOUT_MS,
                controllerId: 'active',
                action: 'timeout_created'
            })
        );
    });

    /**
     * Test: Ensures that the controller's signal is aborted after the specified timeout duration
     * This test validates the core timeout enforcement functionality
     */
    it('should abort the controller after timeout', () => {
        // Act: Create a request timeout with a short duration
        const { controller } = createRequestTimeout(MOCK_TIMEOUT_MS);
        
        // Assert: Verify controller is not aborted initially
        expect(controller.signal.aborted).toBe(false);
        
        // Act: Fast-forward time to trigger the timeout
        jest.advanceTimersByTime(MOCK_TIMEOUT_MS + 1);
        
        // Assert: Verify the controller is aborted after timeout
        expect(controller.signal.aborted).toBe(true);
        
        // Assert: Verify warning logging was called for timeout trigger
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout triggered, aborting controller',
            expect.objectContaining({
                timeoutMs: MOCK_TIMEOUT_MS,
                action: 'abort_request',
                timestamp: expect.any(String)
            })
        );
    });

    /**
     * Test: Checks that the timeout duration can be set via the timeoutMs parameter
     * This test ensures the timeout is configurable and works with different durations
     */
    it('should allow custom timeout duration', () => {
        // Arrange: Define a custom timeout duration
        const customTimeout = 100;
        
        // Act: Create a request timeout with custom duration
        const { controller } = createRequestTimeout(customTimeout);
        
        // Assert: Verify controller is not aborted before custom timeout
        jest.advanceTimersByTime(customTimeout - 1);
        expect(controller.signal.aborted).toBe(false);
        
        // Assert: Verify controller is aborted after custom timeout
        jest.advanceTimersByTime(2);
        expect(controller.signal.aborted).toBe(true);
        
        // Assert: Verify logging includes the custom timeout value
        expect(logger.info).toHaveBeenCalledWith(
            'Request timeout created successfully',
            expect.objectContaining({
                timeoutMs: customTimeout
            })
        );
    });

    /**
     * Test: Verifies that invalid timeout values are handled gracefully with fallback to default
     * This test ensures robust error handling for configuration issues
     */
    it('should handle invalid timeout values with fallback to default', () => {
        // Act: Test with negative timeout value
        const result1 = createRequestTimeout(-100);
        
        // Act: Test with zero timeout value
        const result2 = createRequestTimeout(0);
        
        // Act: Test with non-numeric timeout value
        const result3 = createRequestTimeout('invalid');
        
        // Assert: All results should return valid objects
        expect(result1).toHaveProperty('controller');
        expect(result2).toHaveProperty('controller');
        expect(result3).toHaveProperty('controller');
        
        // Assert: Warning should be logged for invalid values
        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.warn).toHaveBeenCalledWith(
            'Invalid timeout value provided, using default timeout',
            expect.objectContaining({
                providedTimeout: expect.any(Number),
                defaultTimeout: 5000,
                action: 'fallback_to_default'
            })
        );
    });
});

describe('clearRequestTimeout', () => {
    /**
     * Test: Verifies that calling clearRequestTimeout before the timeout prevents the controller from being aborted
     * This test ensures proper cleanup and prevention of unnecessary abort operations
     */
    it('should clear the timeout and prevent abort', () => {
        // Act: Create a request timeout
        const { controller, timeoutId } = createRequestTimeout(MOCK_TIMEOUT_MS);
        
        // Act: Clear the timeout before it expires
        clearRequestTimeout(timeoutId);
        
        // Act: Advance time past the original timeout duration
        jest.advanceTimersByTime(MOCK_TIMEOUT_MS + 10);
        
        // Assert: Verify the controller was not aborted due to timeout clearance
        expect(controller.signal.aborted).toBe(false);
        
        // Assert: Verify info logging was called for timeout clearance
        expect(logger.info).toHaveBeenCalledWith(
            'Request timeout cleared successfully',
            expect.objectContaining({
                timeoutId: expect.any(String),
                timestamp: expect.any(String),
                action: 'timeout_cleared'
            })
        );
        
        // Assert: Verify warning logging was not called since timeout was cleared
        expect(logger.warn).not.toHaveBeenCalledWith(
            'Request timeout triggered, aborting controller',
            expect.any(Object)
        );
    });

    /**
     * Test: Ensures that calling clearRequestTimeout with undefined or null does not throw
     * This test validates defensive programming and graceful handling of edge cases
     */
    it('should handle undefined or null timeoutId without throwing', () => {
        // Act & Assert: Test with undefined - should not throw
        expect(() => clearRequestTimeout(undefined)).not.toThrow();
        
        // Act & Assert: Test with null - should not throw
        expect(() => clearRequestTimeout(null)).not.toThrow();
        
        // Act & Assert: Test with invalid string - should not throw
        expect(() => clearRequestTimeout('invalid')).not.toThrow();
        
        // Act & Assert: Test with number - should not throw
        expect(() => clearRequestTimeout(123)).not.toThrow();
        
        // Assert: Verify warning logging was called for invalid timeout IDs
        expect(logger.warn).toHaveBeenCalledTimes(4);
        expect(logger.warn).toHaveBeenCalledWith(
            'Invalid timeout ID provided for clearance',
            expect.objectContaining({
                action: 'invalid_timeout_clear'
            })
        );
    });
});

describe('handleTimeoutError', () => {
    let mockReq, mockRes, mockNext;
    
    // Set up mock Express objects before each test
    beforeEach(() => {
        mockReq = {
            method: 'GET',
            originalUrl: '/test',
            url: '/test',
            get: jest.fn().mockReturnValue('test-user-agent'),
            ip: '127.0.0.1',
            startTime: Date.now() - 100,
            timeoutMs: MOCK_TIMEOUT_MS
        };
        
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        mockNext = jest.fn();
    });

    /**
     * Test: Simulates an AbortError and checks that handleTimeoutError logs a warning and forwards a standardized AppError with status 504
     * This test validates timeout error detection and proper error transformation
     */
    it('should handle AbortError and forward AppError with 504', () => {
        // Arrange: Create an AbortError to simulate timeout condition
        const abortError = new Error('This operation was aborted');
        abortError.name = 'AbortError';
        
        // Act: Handle the abort error through the timeout error handler
        handleTimeoutError(abortError, mockReq, mockRes, mockNext);
        
        // Assert: Verify warning was logged with comprehensive context
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout detected, generating 504 response',
            expect.objectContaining({
                error: {
                    name: 'AbortError',
                    message: 'This operation was aborted',
                    type: 'AbortError'
                },
                request: expect.objectContaining({
                    method: 'GET',
                    url: '/test',
                    userAgent: 'test-user-agent',
                    ip: '127.0.0.1',
                    timestamp: expect.any(String),
                    timeout: MOCK_TIMEOUT_MS,
                    duration: expect.any(Number)
                }),
                action: 'timeout_error_handling'
            })
        );
        
        // Assert: Verify next was called with an AppError instance
        expect(mockNext).toHaveBeenCalledTimes(1);
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        expect(forwardedError.status).toBe(504);
        expect(forwardedError.message).toBe('Request timed out');
        
        // Assert: Verify the forwarded error contains context but no sensitive details
        expect(forwardedError.details).toEqual({
            originalError: 'AbortError',
            timeoutDuration: MOCK_TIMEOUT_MS,
            requestUrl: '/test',
            requestMethod: 'GET'
        });
    });

    /**
     * Test: Simulates a request object with timedOut=true and checks that handleTimeoutError logs a warning and forwards a standardized AppError with status 504
     * This test validates custom timeout flag detection and error handling
     */
    it('should handle req.timedOut and forward AppError with 504', () => {
        // Arrange: Set custom timeout flag on request object
        mockReq.timedOut = true;
        const customError = new Error('Custom timeout error');
        
        // Act: Handle the custom timeout error
        handleTimeoutError(customError, mockReq, mockRes, mockNext);
        
        // Assert: Verify warning was logged for custom timeout
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout detected, generating 504 response',
            expect.objectContaining({
                error: {
                    name: 'Error',
                    message: 'Custom timeout error',
                    type: 'CustomTimeout'
                },
                action: 'timeout_error_handling'
            })
        );
        
        // Assert: Verify next was called with standardized AppError
        expect(mockNext).toHaveBeenCalledTimes(1);
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        expect(forwardedError.status).toBe(504);
        expect(forwardedError.message).toBe('Request timed out');
    });

    /**
     * Test: Ensures that non-timeout errors are passed to next without modification
     * This test validates that the timeout handler only processes timeout-related errors
     */
    it('should pass through non-timeout errors', () => {
        // Arrange: Create a regular error (not timeout-related)
        const regularError = new Error('Regular application error');
        regularError.status = 400;
        
        // Act: Handle the non-timeout error
        handleTimeoutError(regularError, mockReq, mockRes, mockNext);
        
        // Assert: Verify info logging for passthrough
        expect(logger.info).toHaveBeenCalledWith(
            'Non-timeout error passed through timeout handler',
            expect.objectContaining({
                error: {
                    name: 'Error',
                    message: 'Regular application error',
                    type: 'object'
                },
                request: {
                    method: 'GET',
                    url: '/test'
                },
                action: 'passthrough_error'
            })
        );
        
        // Assert: Verify the original error was passed through unchanged
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(regularError);
        
        // Assert: Verify no timeout warning was logged
        expect(logger.warn).not.toHaveBeenCalled();
    });

    /**
     * Test: Validates that forwarded timeout errors don't leak stack traces or sensitive details
     * This test ensures security and proper error sanitization
     */
    it('should not leak sensitive details in forwarded errors', () => {
        // Arrange: Create an AbortError with potential sensitive information
        const sensitiveError = new Error('Database connection failed: user=admin, pass=secret123');
        sensitiveError.name = 'AbortError';
        sensitiveError.sensitiveData = { password: 'secret123', apiKey: 'hidden-key' };
        
        // Act: Handle the error with sensitive data
        handleTimeoutError(sensitiveError, mockReq, mockRes, mockNext);
        
        // Assert: Verify the forwarded error is an AppError instance
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        
        // Assert: Verify the forwarded error has only safe properties
        const safeError = forwardedError.toJSON();
        expect(safeError).toEqual({
            error: true,
            message: 'Request timed out',
            status: 504
        });
        
        // Assert: Verify sensitive data is not exposed in the forwarded error
        expect(forwardedError.sensitiveData).toBeUndefined();
        expect(forwardedError.details.originalError).toBe('AbortError');
        expect(forwardedError.details).not.toHaveProperty('sensitiveData');
        
        // Assert: Verify stack trace is not included in the safe representation
        expect(safeError).not.toHaveProperty('stack');
    });

    /**
     * Test: Validates timeout error handling with minimal request context
     * This test ensures the handler works even with incomplete request objects
     */
    it('should handle timeout errors with minimal request context', () => {
        // Arrange: Create minimal request object
        const minimalReq = {};
        const abortError = new Error('Minimal context abort');
        abortError.name = 'AbortError';
        
        // Act: Handle error with minimal context
        handleTimeoutError(abortError, minimalReq, mockRes, mockNext);
        
        // Assert: Verify warning was logged with default values for missing context
        expect(logger.warn).toHaveBeenCalledWith(
            'Request timeout detected, generating 504 response',
            expect.objectContaining({
                request: expect.objectContaining({
                    method: 'UNKNOWN',
                    url: 'UNKNOWN',
                    userAgent: 'UNKNOWN',
                    ip: 'UNKNOWN',
                    timeout: 5000, // DEFAULT_TIMEOUT_MS
                    duration: 'UNKNOWN'
                })
            })
        );
        
        // Assert: Verify AppError was still created and forwarded
        expect(mockNext).toHaveBeenCalledTimes(1);
        const forwardedError = mockNext.mock.calls[0][0];
        expect(forwardedError).toBeInstanceOf(AppError);
        expect(forwardedError.status).toBe(504);
    });
});