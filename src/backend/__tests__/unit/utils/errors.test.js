// Jest v29.x - Testing framework for JavaScript applications
const { AppError, normalizeError, errorResponse } = require('../../../utils/errors.js');

// Mock the logger to prevent actual console output during tests and capture logging calls
jest.mock('../../../utils/logger.js', () => ({
    error: jest.fn()
}));

const { error: mockLoggerError } = require('../../../utils/logger.js');

describe('AppError', () => {
    beforeEach(() => {
        // Clear all mock function calls before each test for clean test isolation
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should construct with message and status', () => {
            // Test that AppError instances are created with the correct message and status
            const message = 'Test error message';
            const status = 400;
            const error = new AppError(message, status);

            expect(error.message).toBe(message);
            expect(error.status).toBe(status);
            expect(error.name).toBe('AppError');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AppError);
        });

        it('should default to status 500 when no status provided', () => {
            // Verify that AppError defaults to status 500 if not provided
            const message = 'Test error message';
            const error = new AppError(message);

            expect(error.message).toBe(message);
            expect(error.status).toBe(500);
            expect(error.name).toBe('AppError');
        });

        it('should store details when provided', () => {
            // Test that details are stored internally but not exposed in client responses
            const message = 'Test error';
            const status = 400;
            const details = { originalError: 'ValidationError', field: 'email' };
            const error = new AppError(message, status, details);

            expect(error.message).toBe(message);
            expect(error.status).toBe(status);
            expect(error.details).toEqual(details);
        });

        it('should capture stack trace', () => {
            // Ensure that stack traces are captured for debugging purposes
            const error = new AppError('Test error');
            
            expect(error.stack).toBeDefined();
            expect(typeof error.stack).toBe('string');
            expect(error.stack).toContain('AppError');
        });
    });

    describe('toJSON', () => {
        it('should return only safe fields in JSON representation', () => {
            // Ensures that toJSON omits stack traces and internal details for security
            const message = 'Test error message';
            const status = 403;
            const details = { sensitive: 'internal data', stack: 'should not appear' };
            const error = new AppError(message, status, details);

            const json = error.toJSON();

            expect(json).toEqual({
                error: true,
                message: message,
                status: status
            });

            // Verify that sensitive information is not included
            expect(json.stack).toBeUndefined();
            expect(json.details).toBeUndefined();
            expect(json.sensitive).toBeUndefined();
        });

        it('should work with minimal AppError instance', () => {
            // Test toJSON with minimal AppError (message only)
            const error = new AppError('Simple error');
            const json = error.toJSON();

            expect(json).toEqual({
                error: true,
                message: 'Simple error',
                status: 500
            });
        });
    });

    describe('inheritance', () => {
        it('should be instanceof Error and AppError', () => {
            // Verify that AppError properly extends the built-in Error class
            const error = new AppError('Test error');

            expect(error instanceof Error).toBe(true);
            expect(error instanceof AppError).toBe(true);
        });

        it('should have correct name property', () => {
            // Check that the error name is set correctly for debugging
            const error = new AppError('Test error');

            expect(error.name).toBe('AppError');
        });
    });
});

describe('normalizeError', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return AppError instances as-is', () => {
        // Confirms that normalizeError returns an AppError instance unchanged
        const originalError = new AppError('Original error', 400);
        const normalizedError = normalizeError(originalError);

        expect(normalizedError).toBe(originalError);
        expect(normalizedError.message).toBe('Original error');
        expect(normalizedError.status).toBe(400);
    });

    it('should convert Error to AppError with correct message and status', () => {
        // Checks that a standard Error is converted to an AppError with status 500
        const originalError = new Error('Standard error message');
        const normalizedError = normalizeError(originalError);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('Standard error message');
        expect(normalizedError.status).toBe(500);
        expect(normalizedError.details).toEqual({
            originalError: 'Error',
            originalMessage: 'Standard error message'
        });
    });

    it('should convert Error with status property to AppError', () => {
        // Test that Error objects with status properties preserve the status
        const originalError = new Error('HTTP error');
        originalError.status = 404;
        const normalizedError = normalizeError(originalError);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('HTTP error');
        expect(normalizedError.status).toBe(404);
    });

    it('should convert Error with statusCode property to AppError', () => {
        // Test that Error objects with statusCode properties preserve the status
        const originalError = new Error('HTTP error with statusCode');
        originalError.statusCode = 422;
        const normalizedError = normalizeError(originalError);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('HTTP error with statusCode');
        expect(normalizedError.status).toBe(422);
    });

    it('should handle Error with empty message', () => {
        // Test that errors with empty messages get default message
        const originalError = new Error('');
        const normalizedError = normalizeError(originalError);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('Internal Server Error');
        expect(normalizedError.status).toBe(500);
    });

    it('should convert string to AppError with default status', () => {
        // Checks that a string is converted to an AppError with status 500
        const errorString = 'String error message';
        const normalizedError = normalizeError(errorString);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe(errorString);
        expect(normalizedError.status).toBe(500);
    });

    it('should convert object to AppError with generic message', () => {
        // Checks that a random object is converted to AppError with generic message
        const errorObject = { custom: 'data', code: 123 };
        const normalizedError = normalizeError(errorObject);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('Internal Server Error');
        expect(normalizedError.status).toBe(500);
        expect(normalizedError.details).toEqual({ originalValue: errorObject });
    });

    it('should convert number to AppError with generic message', () => {
        // Test that non-standard values like numbers are handled gracefully
        const errorNumber = 404;
        const normalizedError = normalizeError(errorNumber);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('Internal Server Error');
        expect(normalizedError.status).toBe(500);
        expect(normalizedError.details).toEqual({ originalValue: errorNumber });
    });

    it('should convert null to AppError with generic message', () => {
        // Test that null values are handled gracefully
        const normalizedError = normalizeError(null);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('Internal Server Error');
        expect(normalizedError.status).toBe(500);
        expect(normalizedError.details).toEqual({ originalValue: null });
    });

    it('should convert undefined to AppError with generic message', () => {
        // Test that undefined values are handled gracefully
        const normalizedError = normalizeError(undefined);

        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('Internal Server Error');
        expect(normalizedError.status).toBe(500);
        expect(normalizedError.details).toEqual({ originalValue: undefined });
    });
});

describe('errorResponse', () => {
    let mockRes;
    let mockReq;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock Express response object with jest functions
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        // Create mock Express request object with common properties
        mockReq = {
            method: 'GET',
            originalUrl: '/test/path',
            url: '/test/path',
            path: '/test/path',
            get: jest.fn().mockReturnValue('test-user-agent'),
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' }
        };
    });

    it('should send correct JSON response structure with request context', () => {
        // Verifies that errorResponse sends JSON with error, message, status, timestamp, and path
        const error = new AppError('Test error message', 400);
        const beforeTimestamp = new Date().toISOString();
        
        errorResponse(error, mockRes, mockReq);
        
        const afterTimestamp = new Date().toISOString();

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                message: 'Test error message',
                status: 400,
                timestamp: expect.any(String),
                path: '/test/path'
            })
        );

        // Verify timestamp is within reasonable range
        const response = mockRes.json.mock.calls[0][0];
        expect(response.timestamp >= beforeTimestamp).toBe(true);
        expect(response.timestamp <= afterTimestamp).toBe(true);
    });

    it('should send correct JSON response without request context', () => {
        // Test errorResponse without request object
        const error = new AppError('Test error message', 403);
        
        errorResponse(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                message: 'Test error message',
                status: 403,
                timestamp: expect.any(String)
            })
        );

        // Verify path is not included when no request object
        const response = mockRes.json.mock.calls[0][0];
        expect(response.path).toBeUndefined();
    });

    it('should use default status 500 if error has no status', () => {
        // Checks that errorResponse uses status 500 if the error doesn't specify a status
        const error = new AppError('Error without status');
        delete error.status; // Remove status to test default
        
        errorResponse(error, mockRes, mockReq);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                message: 'Error without status',
                status: 500
            })
        );
    });

    it('should normalize non-AppError before responding', () => {
        // Test that errorResponse works with both AppError and regular errors
        const standardError = new Error('Standard error');
        
        errorResponse(standardError, mockRes, mockReq);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                message: 'Standard error',
                status: 500
            })
        );
    });

    it('should normalize string errors before responding', () => {
        // Test that string errors are properly normalized
        const stringError = 'String error message';
        
        errorResponse(stringError, mockRes, mockReq);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                message: 'String error message',
                status: 500
            })
        );
    });

    it('should log error event with request context', () => {
        // Verifies that errorResponse logs error events for observability
        const error = new AppError('Test error for logging', 400);
        const beforeTimestamp = new Date().toISOString();
        
        errorResponse(error, mockRes, mockReq);
        
        const afterTimestamp = new Date().toISOString();

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error occurred during request processing',
            expect.objectContaining({
                error: expect.objectContaining({
                    message: 'Test error for logging',
                    status: 400,
                    stack: expect.any(String)
                }),
                request: expect.objectContaining({
                    method: 'GET',
                    url: '/test/path',
                    userAgent: 'test-user-agent',
                    ip: '127.0.0.1',
                    timestamp: expect.any(String)
                })
            })
        );

        // Verify logged timestamp is within reasonable range
        const logCall = mockLoggerError.mock.calls[0][1];
        expect(logCall.request.timestamp >= beforeTimestamp).toBe(true);
        expect(logCall.request.timestamp <= afterTimestamp).toBe(true);
    });

    it('should log error event without request context', () => {
        // Test logging when no request object is available
        const error = new AppError('Test error without request', 500);
        
        errorResponse(error, mockRes);

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error occurred during request processing',
            expect.objectContaining({
                error: expect.objectContaining({
                    message: 'Test error without request',
                    status: 500,
                    stack: expect.any(String)
                }),
                request: expect.objectContaining({
                    timestamp: expect.any(String)
                })
            })
        );

        // Verify minimal request context when no req object
        const logCall = mockLoggerError.mock.calls[0][1];
        expect(logCall.request.method).toBeUndefined();
        expect(logCall.request.url).toBeUndefined();
        expect(logCall.request.timestamp).toBeDefined();
    });

    it('should not include stack traces or sensitive details in response', () => {
        // Ensures that errorResponse does not leak stack traces or internal details
        const error = new AppError('Public error message', 400, { sensitive: 'data' });
        
        errorResponse(error, mockRes, mockReq);

        const response = mockRes.json.mock.calls[0][0];
        
        // Verify response does not contain sensitive information
        expect(response.stack).toBeUndefined();
        expect(response.details).toBeUndefined();
        expect(response.sensitive).toBeUndefined();
        
        // Verify response only contains safe fields
        expect(Object.keys(response)).toEqual(
            expect.arrayContaining(['error', 'message', 'status', 'timestamp', 'path'])
        );
    });

    it('should handle request object with missing properties gracefully', () => {
        // Test with minimal request object missing optional properties
        const minimalReq = {
            method: 'POST',
            path: '/minimal',
            get: jest.fn(() => undefined),
            connection: {}
        };
        const error = new AppError('Minimal request test', 422);
        
        errorResponse(error, mockRes, minimalReq);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                message: 'Minimal request test',
                status: 422,
                path: '/minimal'
            })
        );

        // Verify logging handles missing properties
        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error occurred during request processing',
            expect.objectContaining({
                request: expect.objectContaining({
                    method: 'POST',
                    timestamp: expect.any(String)
                })
            })
        );
    });

    it('should handle request object without path property', () => {
        // Test that path is optional in response when not available in request
        const reqWithoutPath = {
            method: 'DELETE',
            originalUrl: '/no/path',
            url: '/no/path',
            get: jest.fn(() => undefined),
            connection: {}
        };
        delete reqWithoutPath.path;
        
        const error = new AppError('No path test', 404);
        
        errorResponse(error, mockRes, reqWithoutPath);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.path).toBeUndefined();
    });

    it('should handle complex error details in logging without exposing them', () => {
        // Test that complex error details are logged but not exposed to client
        const complexDetails = {
            databaseConnection: 'mysql://internal-server',
            userSession: { id: 'session123', role: 'admin' },
            systemInfo: { version: '1.0.0', environment: 'production' }
        };
        const error = new AppError('Complex error', 500, complexDetails);
        
        errorResponse(error, mockRes, mockReq);

        // Verify details are logged for internal debugging
        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error occurred during request processing',
            expect.objectContaining({
                error: expect.objectContaining({
                    details: complexDetails
                })
            })
        );

        // Verify details are not exposed in client response
        const response = mockRes.json.mock.calls[0][0];
        expect(response.databaseConnection).toBeUndefined();
        expect(response.userSession).toBeUndefined();
        expect(response.systemInfo).toBeUndefined();
        expect(response.details).toBeUndefined();
    });
});

describe('Integration Tests', () => {
    let mockRes;
    let mockReq;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        mockReq = {
            method: 'GET',
            path: '/integration/test',
            originalUrl: '/integration/test',
            url: '/integration/test',
            get: jest.fn().mockReturnValue('integration-test-agent'),
            ip: '192.168.1.1'
        };
    });

    it('should handle complete error flow from creation to response', () => {
        // End-to-end test of error handling flow
        const originalError = new Error('Database connection failed');
        originalError.statusCode = 503;
        
        // Normalize the error
        const normalizedError = normalizeError(originalError);
        
        // Send error response
        errorResponse(normalizedError, mockRes, mockReq);

        // Verify the complete flow
        expect(normalizedError).toBeInstanceOf(AppError);
        expect(normalizedError.message).toBe('Database connection failed');
        expect(normalizedError.status).toBe(503);
        
        expect(mockRes.status).toHaveBeenCalledWith(503);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                message: 'Database connection failed',
                status: 503,
                path: '/integration/test'
            })
        );
        
        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error occurred during request processing',
            expect.any(Object)
        );
    });

    it('should maintain security throughout error processing chain', () => {
        // Test that sensitive information is never exposed throughout the entire chain
        const sensitiveError = new Error('Unauthorized access attempt');
        sensitiveError.sensitiveData = { password: 'secret123', apiKey: 'abc-def-ghi' };
        sensitiveError.status = 401;
        
        const normalized = normalizeError(sensitiveError);
        errorResponse(normalized, mockRes, mockReq);

        // Verify sensitive data is not in normalized error's public interface
        const jsonRepresentation = normalized.toJSON();
        expect(jsonRepresentation.sensitiveData).toBeUndefined();
        expect(jsonRepresentation.password).toBeUndefined();
        expect(jsonRepresentation.apiKey).toBeUndefined();
        
        // Verify sensitive data is not in response
        const response = mockRes.json.mock.calls[0][0];
        expect(response.sensitiveData).toBeUndefined();
        expect(response.password).toBeUndefined();
        expect(response.apiKey).toBeUndefined();
        expect(response.stack).toBeUndefined();
    });
});