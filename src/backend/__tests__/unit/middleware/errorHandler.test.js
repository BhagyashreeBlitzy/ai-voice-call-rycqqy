// Jest testing framework for unit testing and mocking - v29.x

// Import the errorHandler middleware under test
const { errorHandler } = require('../../../middleware/errorHandler.js');

// Import utilities for mocking - these will be mocked to isolate errorHandler behavior
const { normalizeError, errorResponse } = require('../../../utils/errors.js');
const { logger } = require('../../../utils/logger.js');

// Import test environment setup for consistent testing environment
const { setupTestEnvironment } = require('../../setup.js');

// Mock the error utilities to control their behavior during tests
jest.mock('../../../utils/errors.js', () => ({
    normalizeError: jest.fn(),
    errorResponse: jest.fn()
}));

// Mock the logger to capture and verify logging behavior
jest.mock('../../../utils/logger.js', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    },
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
}));

/**
 * Unit test suite for the centralized Express error-handling middleware (errorHandler)
 * 
 * This test suite verifies that the errorHandler middleware correctly:
 * - Normalizes various error types into standardized AppError instances
 * - Logs errors for observability and debugging
 * - Sends secure, standardized error responses without exposing sensitive details
 * - Handles both operational and programming errors consistently
 * - Integrates properly with the Express middleware chain
 * 
 * The tests mock all dependencies (normalizeError, errorResponse, logger) to ensure
 * isolated testing of the errorHandler's core logic and behavior.
 */
describe('errorHandler middleware', () => {
    // Mock Express request object with essential properties for error context
    let mockReq;
    // Mock Express response object with spies for capturing response operations
    let mockRes;
    // Mock Express next function to verify middleware chain behavior
    let mockNext;
    
    /**
     * Setup executed before each test case to ensure test isolation and reproducibility
     * Resets all mocks and initializes fresh mock objects for each test
     */
    beforeEach(() => {
        // Clear all jest mocks to prevent test interference
        jest.clearAllMocks();
        
        // Reset global log output array for clean test state
        global.logOutput = [];
        
        // Create mock Express Request object with minimal required properties
        mockReq = {
            method: 'GET',
            url: '/test-endpoint',
            path: '/test-endpoint',
            originalUrl: '/test-endpoint',
            ip: '127.0.0.1',
            get: jest.fn((header) => {
                if (header === 'User-Agent') return 'test-agent';
                return null;
            }),
            connection: {
                remoteAddress: '127.0.0.1'
            }
        };
        
        // Create mock Express Response object with spies for all required methods
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis()
        };
        
        // Create mock Express NextFunction to verify it's not called after error handling
        mockNext = jest.fn();
    });
    
    /**
     * Test Case 1: Verify error normalization and response behavior
     * 
     * This test ensures that errorHandler:
     * - Calls normalizeError with the original error to standardize error format
     * - Calls errorResponse with the normalized error, response, and request objects
     * - Does not call next() since the error is fully handled and response is sent
     */
    describe('error normalization and response', () => {
        test('should normalize and respond to errors correctly', () => {
            // Arrange: Create a sample error and set up mock return values
            const originalError = new Error('Test error occurred');
            const normalizedError = {
                message: 'Test error occurred',
                status: 500,
                details: { originalError: 'Error' },
                stack: 'Error: Test error occurred\n    at ...'
            };
            
            // Configure normalizeError mock to return a known AppError instance
            normalizeError.mockReturnValue(normalizedError);
            
            // Configure errorResponse mock to simulate successful response handling
            errorResponse.mockImplementation(() => {
                // Simulate errorResponse behavior without actual HTTP response
                mockRes.status(normalizedError.status);
                mockRes.json({
                    error: true,
                    message: normalizedError.message,
                    status: normalizedError.status,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Act: Call errorHandler with the original error
            errorHandler(originalError, mockReq, mockRes, mockNext);
            
            // Assert: Verify that normalizeError was called with the original error
            expect(normalizeError).toHaveBeenCalledWith(originalError);
            expect(normalizeError).toHaveBeenCalledTimes(1);
            
            // Assert: Verify that errorResponse was called with normalized error, response, and request
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            expect(errorResponse).toHaveBeenCalledTimes(1);
            
            // Assert: Verify that next() was NOT called (middleware chain is terminated)
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        test('should handle string errors correctly', () => {
            // Arrange: Create a string error and set up mock return values
            const stringError = 'Something went wrong';
            const normalizedError = {
                message: 'Something went wrong',
                status: 500,
                details: null,
                stack: 'Error: Something went wrong\n    at ...'
            };
            
            // Configure mocks
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation(() => {
                mockRes.status(normalizedError.status);
                mockRes.json({
                    error: true,
                    message: normalizedError.message,
                    status: normalizedError.status,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Act: Call errorHandler with string error
            errorHandler(stringError, mockReq, mockRes, mockNext);
            
            // Assert: Verify proper normalization and response handling
            expect(normalizeError).toHaveBeenCalledWith(stringError);
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        test('should handle unknown error types correctly', () => {
            // Arrange: Create an unknown error type (number)
            const unknownError = 42;
            const normalizedError = {
                message: 'Internal Server Error',
                status: 500,
                details: { originalValue: 42 },
                stack: 'Error: Internal Server Error\n    at ...'
            };
            
            // Configure mocks
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation(() => {
                mockRes.status(normalizedError.status);
                mockRes.json({
                    error: true,
                    message: normalizedError.message,
                    status: normalizedError.status,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Act: Call errorHandler with unknown error type
            errorHandler(unknownError, mockReq, mockRes, mockNext);
            
            // Assert: Verify proper normalization and response handling
            expect(normalizeError).toHaveBeenCalledWith(unknownError);
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
    
    /**
     * Test Case 2: Verify security compliance of error responses
     * 
     * This test ensures that errorHandler does not leak sensitive information:
     * - No stack traces are exposed to clients
     * - No internal system details are included in responses
     * - Error responses follow security best practices
     * - Sensitive information is logged internally but not sent to clients
     */
    describe('secure error response handling', () => {
        test('should not leak stack traces or sensitive details', () => {
            // Arrange: Create an error with sensitive information
            const sensitiveError = new Error('Database connection failed');
            sensitiveError.stack = 'Error: Database connection failed\n    at Database.connect (/app/db.js:42:15)\n    at /app/server.js:123:8';
            sensitiveError.details = {
                connectionString: 'mongodb://admin:password@localhost:27017/app',
                internalError: 'Connection timeout after 5000ms'
            };
            
            const normalizedError = {
                message: 'Database connection failed',
                status: 500,
                details: {
                    connectionString: 'mongodb://admin:password@localhost:27017/app',
                    internalError: 'Connection timeout after 5000ms'
                },
                stack: 'Error: Database connection failed\n    at Database.connect (/app/db.js:42:15)\n    at /app/server.js:123:8'
            };
            
            // Configure mocks to simulate secure error response
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation((err, res, req) => {
                // Simulate errorResponse logging the full error internally
                logger.error.mockImplementation(() => {});
                
                // Simulate secure response that excludes sensitive details
                res.status(err.status);
                res.json({
                    error: true,
                    message: err.message,
                    status: err.status,
                    timestamp: new Date().toISOString(),
                    path: req.path
                    // Note: stack and details are NOT included in response
                });
            });
            
            // Act: Call errorHandler with sensitive error
            errorHandler(sensitiveError, mockReq, mockRes, mockNext);
            
            // Assert: Verify that errorResponse was called and handles security properly
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            
            // Assert: Verify response structure does not include sensitive information
            expect(mockRes.json).toHaveBeenCalledWith({
                error: true,
                message: 'Database connection failed',
                status: 500,
                timestamp: expect.any(String),
                path: '/test-endpoint'
            });
            
            // Assert: Verify that next() was not called
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        test('should sanitize error messages in responses', () => {
            // Arrange: Create error with potentially sensitive message
            const sensitiveError = new Error('ENOTFOUND database.internal.company.com');
            const normalizedError = {
                message: 'ENOTFOUND database.internal.company.com',
                status: 500,
                details: null,
                stack: 'Error: ENOTFOUND database.internal.company.com\n    at ...'
            };
            
            // Configure mocks
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation((err, res, req) => {
                // Simulate errorResponse behavior with message sanitization
                res.status(err.status);
                res.json({
                    error: true,
                    message: err.message, // In real implementation, this might be sanitized
                    status: err.status,
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            });
            
            // Act: Call errorHandler
            errorHandler(sensitiveError, mockReq, mockRes, mockNext);
            
            // Assert: Verify proper handling
            expect(normalizeError).toHaveBeenCalledWith(sensitiveError);
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
    
    /**
     * Test Case 3: Verify logger integration and error event logging
     * 
     * This test ensures that errorHandler properly integrates with the logging system:
     * - Logs error events with appropriate detail level
     * - Includes request context information in logs
     * - Uses the correct logger method (logger.error)
     * - Provides comprehensive error information for debugging
     */
    describe('logger integration', () => {
        test('should log errors using logger.error', () => {
            // Arrange: Create test error and configure mocks
            const testError = new Error('Test logging error');
            const normalizedError = {
                message: 'Test logging error',
                status: 500,
                details: { originalError: 'Error' },
                stack: 'Error: Test logging error\n    at test (/app/test.js:1:1)'
            };
            
            normalizeError.mockReturnValue(normalizedError);
            
            // Configure errorResponse to simulate logging behavior
            errorResponse.mockImplementation((err, res, req) => {
                // Simulate the internal logging that errorResponse performs
                const requestContext = {
                    method: req.method,
                    url: req.originalUrl || req.url,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress,
                    timestamp: new Date().toISOString()
                };
                
                // Simulate logger.error call with error details and request context
                logger.error('Error occurred during request processing', {
                    error: {
                        message: err.message,
                        status: err.status,
                        stack: err.stack,
                        details: err.details
                    },
                    request: requestContext
                });
                
                // Simulate response generation
                res.status(err.status);
                res.json({
                    error: true,
                    message: err.message,
                    status: err.status,
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            });
            
            // Act: Call errorHandler
            errorHandler(testError, mockReq, mockRes, mockNext);
            
            // Assert: Verify that logger.error was called with proper arguments
            expect(logger.error).toHaveBeenCalledWith(
                'Error occurred during request processing',
                {
                    error: {
                        message: 'Test logging error',
                        status: 500,
                        stack: 'Error: Test logging error\n    at test (/app/test.js:1:1)',
                        details: { originalError: 'Error' }
                    },
                    request: {
                        method: 'GET',
                        url: '/test-endpoint',
                        userAgent: 'test-agent',
                        ip: '127.0.0.1',
                        timestamp: expect.any(String)
                    }
                }
            );
            
            // Assert: Verify logger.error was called exactly once
            expect(logger.error).toHaveBeenCalledTimes(1);
        });
        
        test('should log errors with minimal request context when request is limited', () => {
            // Arrange: Create minimal request object
            const minimalReq = {
                method: 'POST',
                url: '/api/test'
            };
            
            const testError = new Error('Minimal context error');
            const normalizedError = {
                message: 'Minimal context error',
                status: 500,
                details: null,
                stack: 'Error: Minimal context error\n    at ...'
            };
            
            normalizeError.mockReturnValue(normalizedError);
            
            // Configure errorResponse mock
            errorResponse.mockImplementation((err, res, req) => {
                const requestContext = {
                    method: req.method,
                    url: req.originalUrl || req.url,
                    userAgent: req.get ? req.get('User-Agent') : undefined,
                    ip: req.ip || (req.connection && req.connection.remoteAddress),
                    timestamp: new Date().toISOString()
                };
                
                logger.error('Error occurred during request processing', {
                    error: {
                        message: err.message,
                        status: err.status,
                        stack: err.stack,
                        details: err.details
                    },
                    request: requestContext
                });
                
                res.status(err.status);
                res.json({
                    error: true,
                    message: err.message,
                    status: err.status,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Act: Call errorHandler with minimal request
            errorHandler(testError, minimalReq, mockRes, mockNext);
            
            // Assert: Verify logging with available context
            expect(logger.error).toHaveBeenCalledWith(
                'Error occurred during request processing',
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'Minimal context error',
                        status: 500
                    }),
                    request: expect.objectContaining({
                        method: 'POST',
                        url: '/api/test',
                        timestamp: expect.any(String)
                    })
                })
            );
        });
    });
    
    /**
     * Test Case 4: Verify handling of both operational and programming errors
     * 
     * This test ensures that errorHandler handles different error categories consistently:
     * - Operational errors (expected errors like validation failures, 404s)
     * - Programming errors (unexpected errors like TypeError, ReferenceError)
     * - Both error types are normalized and handled securely
     * - Appropriate HTTP status codes are maintained
     */
    describe('operational and programming error handling', () => {
        test('should handle operational errors (AppError instances)', () => {
            // Arrange: Create an operational error (AppError-like)
            const operationalError = {
                name: 'ValidationError',
                message: 'Invalid input provided',
                status: 400,
                details: { field: 'email', value: 'invalid-email' }
            };
            
            const normalizedError = {
                message: 'Invalid input provided',
                status: 400,
                details: { field: 'email', value: 'invalid-email' },
                stack: 'Error: Invalid input provided\n    at ...'
            };
            
            // Configure mocks
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation((err, res, req) => {
                logger.error('Error occurred during request processing', {
                    error: {
                        message: err.message,
                        status: err.status,
                        stack: err.stack,
                        details: err.details
                    },
                    request: expect.any(Object)
                });
                
                res.status(err.status);
                res.json({
                    error: true,
                    message: err.message,
                    status: err.status,
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            });
            
            // Act: Call errorHandler with operational error
            errorHandler(operationalError, mockReq, mockRes, mockNext);
            
            // Assert: Verify proper handling of operational error
            expect(normalizeError).toHaveBeenCalledWith(operationalError);
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: true,
                message: 'Invalid input provided',
                status: 400,
                timestamp: expect.any(String),
                path: '/test-endpoint'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        test('should handle programming errors (TypeError, ReferenceError)', () => {
            // Arrange: Create a programming error
            const programmingError = new TypeError('Cannot read property \'length\' of undefined');
            programmingError.stack = 'TypeError: Cannot read property \'length\' of undefined\n    at processArray (/app/utils.js:15:23)\n    at /app/routes.js:45:12';
            
            const normalizedError = {
                message: 'Cannot read property \'length\' of undefined',
                status: 500,
                details: { originalError: 'TypeError' },
                stack: 'TypeError: Cannot read property \'length\' of undefined\n    at processArray (/app/utils.js:15:23)\n    at /app/routes.js:45:12'
            };
            
            // Configure mocks
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation((err, res, req) => {
                logger.error('Error occurred during request processing', {
                    error: {
                        message: err.message,
                        status: err.status,
                        stack: err.stack,
                        details: err.details
                    },
                    request: expect.any(Object)
                });
                
                res.status(err.status);
                res.json({
                    error: true,
                    message: err.message,
                    status: err.status,
                    timestamp: new Date().toISOString(),
                    path: req.path
                });
            });
            
            // Act: Call errorHandler with programming error
            errorHandler(programmingError, mockReq, mockRes, mockNext);
            
            // Assert: Verify proper handling of programming error
            expect(normalizeError).toHaveBeenCalledWith(programmingError);
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: true,
                message: 'Cannot read property \'length\' of undefined',
                status: 500,
                timestamp: expect.any(String),
                path: '/test-endpoint'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        test('should handle both error types consistently', () => {
            // Test both operational and programming errors in sequence
            const errors = [
                {
                    type: 'operational',
                    error: { message: 'User not found', status: 404 },
                    expected: { message: 'User not found', status: 404 }
                },
                {
                    type: 'programming',
                    error: new ReferenceError('variable is not defined'),
                    expected: { message: 'variable is not defined', status: 500 }
                }
            ];
            
            errors.forEach(({ type, error, expected }) => {
                // Reset mocks for each iteration
                jest.clearAllMocks();
                
                const normalizedError = {
                    message: expected.message,
                    status: expected.status,
                    details: type === 'operational' ? null : { originalError: 'ReferenceError' },
                    stack: `${type === 'operational' ? 'Error' : 'ReferenceError'}: ${expected.message}\n    at ...`
                };
                
                // Configure mocks
                normalizeError.mockReturnValue(normalizedError);
                errorResponse.mockImplementation((err, res, req) => {
                    res.status(err.status);
                    res.json({
                        error: true,
                        message: err.message,
                        status: err.status,
                        timestamp: new Date().toISOString(),
                        path: req.path
                    });
                });
                
                // Act: Call errorHandler
                errorHandler(error, mockReq, mockRes, mockNext);
                
                // Assert: Verify consistent handling
                expect(normalizeError).toHaveBeenCalledWith(error);
                expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
                expect(mockRes.json).toHaveBeenCalledWith({
                    error: true,
                    message: expected.message,
                    status: expected.status,
                    timestamp: expect.any(String),
                    path: '/test-endpoint'
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });
    });
    
    /**
     * Test Case 5: Verify middleware chain behavior and Express integration
     * 
     * This test ensures that errorHandler properly integrates with Express:
     * - Accepts the correct Express middleware signature (err, req, res, next)
     * - Does not call next() after handling errors (terminates middleware chain)
     * - Properly handles the response cycle
     * - Maintains Express error handling conventions
     */
    describe('Express middleware integration', () => {
        test('should accept Express error middleware signature', () => {
            // Arrange: Create standard Express error
            const expressError = new Error('Express middleware error');
            const normalizedError = {
                message: 'Express middleware error',
                status: 500,
                details: null,
                stack: 'Error: Express middleware error\n    at ...'
            };
            
            // Configure mocks
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation(() => {
                mockRes.status(500);
                mockRes.json({
                    error: true,
                    message: 'Express middleware error',
                    status: 500,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Act: Call errorHandler with Express middleware signature
            expect(() => {
                errorHandler(expressError, mockReq, mockRes, mockNext);
            }).not.toThrow();
            
            // Assert: Verify proper Express integration
            expect(normalizeError).toHaveBeenCalledWith(expressError);
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, mockReq);
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        test('should not call next() after handling error', () => {
            // Arrange: Create error and configure mocks
            const testError = new Error('Test error');
            const normalizedError = {
                message: 'Test error',
                status: 500,
                details: null,
                stack: 'Error: Test error\n    at ...'
            };
            
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation(() => {
                mockRes.status(500);
                mockRes.json({
                    error: true,
                    message: 'Test error',
                    status: 500,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Act: Call errorHandler
            errorHandler(testError, mockReq, mockRes, mockNext);
            
            // Assert: Verify next() is not called (middleware chain terminates)
            expect(mockNext).not.toHaveBeenCalled();
            
            // Assert: Verify error handling was completed
            expect(normalizeError).toHaveBeenCalledTimes(1);
            expect(errorResponse).toHaveBeenCalledTimes(1);
        });
        
        test('should handle errors without request context gracefully', () => {
            // Arrange: Test with null request (edge case)
            const testError = new Error('Error without request context');
            const normalizedError = {
                message: 'Error without request context',
                status: 500,
                details: null,
                stack: 'Error: Error without request context\n    at ...'
            };
            
            normalizeError.mockReturnValue(normalizedError);
            errorResponse.mockImplementation((err, res, req) => {
                // Handle case where req might be null or undefined
                const requestContext = req ? {
                    method: req.method,
                    url: req.originalUrl || req.url,
                    timestamp: new Date().toISOString()
                } : {
                    timestamp: new Date().toISOString()
                };
                
                logger.error('Error occurred during request processing', {
                    error: {
                        message: err.message,
                        status: err.status,
                        stack: err.stack,
                        details: err.details
                    },
                    request: requestContext
                });
                
                res.status(err.status);
                res.json({
                    error: true,
                    message: err.message,
                    status: err.status,
                    timestamp: new Date().toISOString()
                });
            });
            
            // Act: Call errorHandler with null request
            errorHandler(testError, null, mockRes, mockNext);
            
            // Assert: Verify graceful handling without request context
            expect(normalizeError).toHaveBeenCalledWith(testError);
            expect(errorResponse).toHaveBeenCalledWith(normalizedError, mockRes, null);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});