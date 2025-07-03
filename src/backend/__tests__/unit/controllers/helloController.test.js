// Jest testing framework for unit testing and mocking - v29.x
const jest = require('jest');

// Import the helloController function under test
const { helloController } = require('../../../controllers/helloController.js');

// Import AppError class for error type validation and testing
const { AppError } = require('../../../utils/errors.js');

// Import logger for stubbing and spy verification  
const { logger } = require('../../../utils/logger.js');

// Import setupTestEnvironment to ensure clean test isolation
const { setupTestEnvironment } = require('../../setup.js');

// Ensure test environment is properly configured before running tests
setupTestEnvironment();

/**
 * Utility function to create mock Express req, res, and next objects for controller testing
 * Creates comprehensive mocks with all necessary methods and properties for isolated testing
 * 
 * @returns {object} Object containing { req, res, next } mock objects
 */
function createMockReqResNext() {
    // Create mock Express Request object with common properties and methods
    const req = {
        method: 'GET',
        path: '/hello',
        url: '/hello',
        originalUrl: '/hello',
        ip: '127.0.0.1',
        connection: {
            remoteAddress: '127.0.0.1'
        },
        // Mock req.get() method for header retrieval
        get: jest.fn((headerName) => {
            if (headerName === 'User-Agent') {
                return 'jest-test-agent/1.0';
            }
            return null;
        })
    };
    
    // Create mock Express Response object with chainable methods
    const res = {
        // Mock res.status() method that returns res for chaining
        status: jest.fn().mockReturnThis(),
        
        // Mock res.set() method for setting headers that returns res for chaining
        set: jest.fn().mockReturnThis(),
        
        // Mock res.send() method for sending response body
        send: jest.fn(),
        
        // Mock res.end() method for ending response
        end: jest.fn(),
        
        // Mock res.json() method for JSON responses
        json: jest.fn()
    };
    
    // Create mock Express next function for error propagation
    const next = jest.fn();
    
    return { req, res, next };
}

// Test suite for helloController function with comprehensive test coverage
describe('helloController', () => {
    // Reset all mocks before each test to ensure test isolation
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear global logOutput array to ensure clean state
        global.logOutput = [];
    });
    
    // Test case: Successful GET /hello request processing
    describe('should send 200 and "Hello world" for GET /hello', () => {
        it('should return 200 status with correct headers and body', async () => {
            // Arrange: Create mock req, res, and next objects
            const { req, res, next } = createMockReqResNext();
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify response status is set to 200
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.status).toHaveBeenCalledTimes(1);
            
            // Assert: Verify Content-Type header is set correctly
            expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
            expect(res.set).toHaveBeenCalledTimes(1);
            
            // Assert: Verify response body is "Hello world"
            expect(res.send).toHaveBeenCalledWith('Hello world');
            expect(res.send).toHaveBeenCalledTimes(1);
            
            // Assert: Verify next() is not called (no error occurred)
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should log request processing and successful response', async () => {
            // Arrange: Create mock req, res, and next objects
            const { req, res, next } = createMockReqResNext();
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify logger.info is called for request start
            expect(logger.info).toHaveBeenCalledWith(
                'Processing GET /hello request',
                expect.objectContaining({
                    method: 'GET',
                    path: '/hello',
                    userAgent: 'jest-test-agent/1.0',
                    ip: '127.0.0.1',
                    timestamp: expect.any(String)
                })
            );
            
            // Assert: Verify logger.info is called for successful response
            expect(logger.info).toHaveBeenCalledWith(
                'Successfully sent /hello response',
                expect.objectContaining({
                    status: 200,
                    contentType: 'text/plain',
                    responseTime: expect.any(Number)
                })
            );
            
            // Assert: Verify logger.info is called exactly twice (start + success)
            expect(logger.info).toHaveBeenCalledTimes(2);
            
            // Assert: Verify logger.error is not called
            expect(logger.error).not.toHaveBeenCalled();
        });
        
        it('should handle requests with different IP addresses correctly', async () => {
            // Arrange: Create mock req with different IP
            const { req, res, next } = createMockReqResNext();
            req.ip = '192.168.1.100';
            req.connection.remoteAddress = '192.168.1.100';
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify logger captures correct IP address
            expect(logger.info).toHaveBeenCalledWith(
                'Processing GET /hello request',
                expect.objectContaining({
                    ip: '192.168.1.100'
                })
            );
            
            // Assert: Verify successful response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith('Hello world');
        });
        
        it('should handle requests without User-Agent header', async () => {
            // Arrange: Create mock req without User-Agent
            const { req, res, next } = createMockReqResNext();
            req.get = jest.fn(() => null);
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify logger handles null User-Agent gracefully
            expect(logger.info).toHaveBeenCalledWith(
                'Processing GET /hello request',
                expect.objectContaining({
                    userAgent: null
                })
            );
            
            // Assert: Verify successful response despite missing header
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith('Hello world');
        });
    });
    
    // Test case: Error handling and propagation
    describe('should propagate errors to next() and log error', () => {
        it('should handle errors from res.send() and propagate to next()', async () => {
            // Arrange: Create mock req, res, and next with res.send throwing error
            const { req, res, next } = createMockReqResNext();
            const testError = new Error('Response send failed');
            res.send.mockImplementation(() => {
                throw testError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify next() is called with AppError instance
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            
            // Assert: Verify the AppError has correct properties
            const passedError = next.mock.calls[0][0];
            expect(passedError).toBeInstanceOf(AppError);
            expect(passedError.status).toBe(500);
            expect(passedError.message).toBe('An unexpected error occurred while processing the /hello request');
            expect(passedError.details).toEqual({
                originalError: 'Response send failed'
            });
        });
        
        it('should handle errors from res.status() and propagate to next()', async () => {
            // Arrange: Create mock req, res, and next with res.status throwing error
            const { req, res, next } = createMockReqResNext();
            const testError = new Error('Status setting failed');
            res.status.mockImplementation(() => {
                throw testError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify next() is called with AppError instance
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            
            // Assert: Verify the AppError has correct properties
            const passedError = next.mock.calls[0][0];
            expect(passedError).toBeInstanceOf(AppError);
            expect(passedError.status).toBe(500);
        });
        
        it('should handle errors from res.set() and propagate to next()', async () => {
            // Arrange: Create mock req, res, and next with res.set throwing error
            const { req, res, next } = createMockReqResNext();
            const testError = new Error('Header setting failed');
            res.set.mockImplementation(() => {
                throw testError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify next() is called with AppError instance
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            
            // Assert: Verify the AppError has correct properties
            const passedError = next.mock.calls[0][0];
            expect(passedError).toBeInstanceOf(AppError);
            expect(passedError.status).toBe(500);
        });
        
        it('should log comprehensive error details when error occurs', async () => {
            // Arrange: Create mock req, res, and next with error
            const { req, res, next } = createMockReqResNext();
            const testError = new Error('Test error for logging');
            res.send.mockImplementation(() => {
                throw testError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify logger.error is called with comprehensive details
            expect(logger.error).toHaveBeenCalledWith(
                'Error occurred in /hello endpoint',
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'Test error for logging',
                        stack: expect.any(String),
                        name: 'Error'
                    }),
                    request: expect.objectContaining({
                        method: 'GET',
                        path: '/hello',
                        userAgent: 'jest-test-agent/1.0',
                        ip: '127.0.0.1',
                        timestamp: expect.any(String)
                    })
                })
            );
            
            // Assert: Verify logger.error is called exactly once
            expect(logger.error).toHaveBeenCalledTimes(1);
        });
        
        it('should preserve existing AppError instances without wrapping', async () => {
            // Arrange: Create mock req, res, and next with AppError being thrown
            const { req, res, next } = createMockReqResNext();
            const existingAppError = new AppError('Existing app error', 400, { customDetail: 'test' });
            res.send.mockImplementation(() => {
                throw existingAppError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify next() is called with the exact same AppError instance
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(existingAppError);
            
            // Assert: Verify the AppError properties are preserved
            const passedError = next.mock.calls[0][0];
            expect(passedError).toBe(existingAppError);
            expect(passedError.status).toBe(400);
            expect(passedError.message).toBe('Existing app error');
            expect(passedError.details).toEqual({ customDetail: 'test' });
        });
    });
    
    // Test case: Security and error information disclosure prevention
    describe('should not leak stack traces or sensitive details in error propagation', () => {
        it('should create AppError without exposing internal system details', async () => {
            // Arrange: Create mock req, res, and next with system error
            const { req, res, next } = createMockReqResNext();
            const systemError = new Error('ECONNREFUSED: Connection refused to internal service');
            systemError.stack = 'Error: ECONNREFUSED\n    at internal.service.js:123:45\n    at secret.module.js:67:89';
            res.send.mockImplementation(() => {
                throw systemError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify next() is called with sanitized AppError
            expect(next).toHaveBeenCalledTimes(1);
            const passedError = next.mock.calls[0][0];
            expect(passedError).toBeInstanceOf(AppError);
            
            // Assert: Verify error message is generic, not exposing internal details
            expect(passedError.message).toBe('An unexpected error occurred while processing the /hello request');
            expect(passedError.message).not.toContain('ECONNREFUSED');
            expect(passedError.message).not.toContain('internal service');
            
            // Assert: Verify sensitive internal details are not exposed in public properties
            expect(passedError.details.originalError).toBe('ECONNREFUSED: Connection refused to internal service');
            expect(passedError.stack).not.toContain('secret.module.js');
        });
        
        it('should normalize error instance to AppError with secure details', async () => {
            // Arrange: Create mock req, res, and next with database error
            const { req, res, next } = createMockReqResNext();
            const dbError = new Error('Database connection string: mongodb://user:password@localhost:27017/sensitive_db');
            res.send.mockImplementation(() => {
                throw dbError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify next() is called with AppError containing safe message
            expect(next).toHaveBeenCalledTimes(1);
            const passedError = next.mock.calls[0][0];
            expect(passedError).toBeInstanceOf(AppError);
            
            // Assert: Verify public message does not contain sensitive connection details
            expect(passedError.message).toBe('An unexpected error occurred while processing the /hello request');
            expect(passedError.message).not.toContain('password');
            expect(passedError.message).not.toContain('mongodb://');
            expect(passedError.message).not.toContain('sensitive_db');
            
            // Assert: Verify original error is preserved in details for internal debugging
            expect(passedError.details.originalError).toContain('Database connection string');
        });
        
        it('should create AppError with 500 status code for all unexpected errors', async () => {
            // Arrange: Create mock req, res, and next with various error types
            const { req, res, next } = createMockReqResNext();
            const unexpectedError = new TypeError('Cannot read property of undefined');
            res.send.mockImplementation(() => {
                throw unexpectedError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify next() is called with AppError having 500 status
            expect(next).toHaveBeenCalledTimes(1);
            const passedError = next.mock.calls[0][0];
            expect(passedError).toBeInstanceOf(AppError);
            expect(passedError.status).toBe(500);
            
            // Assert: Verify error type information is preserved for internal debugging
            expect(passedError.details.originalError).toBe('Cannot read property of undefined');
        });
    });
    
    // Test case: Logger integration and observability
    describe('should log both successful and error cases for observability', () => {
        it('should log info on successful request processing', async () => {
            // Arrange: Create mock req, res, and next objects
            const { req, res, next } = createMockReqResNext();
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify logger.info is called for request start
            expect(logger.info).toHaveBeenNthCalledWith(
                1,
                'Processing GET /hello request',
                expect.objectContaining({
                    method: 'GET',
                    path: '/hello',
                    userAgent: expect.any(String),
                    ip: expect.any(String),
                    timestamp: expect.any(String)
                })
            );
            
            // Assert: Verify logger.info is called for successful completion
            expect(logger.info).toHaveBeenNthCalledWith(
                2,
                'Successfully sent /hello response',
                expect.objectContaining({
                    status: 200,
                    contentType: 'text/plain',
                    responseTime: expect.any(Number)
                })
            );
            
            // Assert: Verify no error logging occurs
            expect(logger.error).not.toHaveBeenCalled();
        });
        
        it('should log error on request processing failure', async () => {
            // Arrange: Create mock req, res, and next with error
            const { req, res, next } = createMockReqResNext();
            const testError = new Error('Processing failed');
            res.send.mockImplementation(() => {
                throw testError;
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify logger.info is called for request start
            expect(logger.info).toHaveBeenCalledWith(
                'Processing GET /hello request',
                expect.any(Object)
            );
            
            // Assert: Verify logger.error is called with error details
            expect(logger.error).toHaveBeenCalledWith(
                'Error occurred in /hello endpoint',
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'Processing failed',
                        stack: expect.any(String),
                        name: 'Error'
                    }),
                    request: expect.objectContaining({
                        method: 'GET',
                        path: '/hello',
                        userAgent: expect.any(String),
                        ip: expect.any(String),
                        timestamp: expect.any(String)
                    })
                })
            );
            
            // Assert: Verify success logging does not occur
            expect(logger.info).not.toHaveBeenCalledWith(
                'Successfully sent /hello response',
                expect.any(Object)
            );
        });
        
        it('should log structured data for monitoring and analytics', async () => {
            // Arrange: Create mock req, res, and next with custom headers
            const { req, res, next } = createMockReqResNext();
            req.get = jest.fn((header) => {
                if (header === 'User-Agent') return 'Custom-Agent/2.0';
                return null;
            });
            req.ip = '10.0.0.1';
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify structured logging captures all relevant request context
            expect(logger.info).toHaveBeenCalledWith(
                'Processing GET /hello request',
                expect.objectContaining({
                    method: 'GET',
                    path: '/hello',
                    userAgent: 'Custom-Agent/2.0',
                    ip: '10.0.0.1',
                    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
                })
            );
            
            // Assert: Verify structured logging captures response metadata
            expect(logger.info).toHaveBeenCalledWith(
                'Successfully sent /hello response',
                expect.objectContaining({
                    status: 200,
                    contentType: 'text/plain',
                    responseTime: expect.any(Number)
                })
            );
        });
        
        it('should handle logging even when request object has missing properties', async () => {
            // Arrange: Create mock req with minimal properties
            const { req, res, next } = createMockReqResNext();
            req.ip = undefined;
            req.connection = undefined;
            req.get = jest.fn(() => undefined);
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify logging handles missing properties gracefully
            expect(logger.info).toHaveBeenCalledWith(
                'Processing GET /hello request',
                expect.objectContaining({
                    method: 'GET',
                    path: '/hello',
                    userAgent: undefined,
                    ip: undefined,
                    timestamp: expect.any(String)
                })
            );
            
            // Assert: Verify successful response despite missing request properties
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith('Hello world');
        });
    });
    
    // Test case: Comprehensive response method interaction
    describe('should call response methods in correct order and manner', () => {
        it('should call res.set() before res.status() and res.send()', async () => {
            // Arrange: Create mock req, res, and next objects
            const { req, res, next } = createMockReqResNext();
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify methods are called in correct order
            const setCallOrder = res.set.mock.invocationCallOrder[0];
            const statusCallOrder = res.status.mock.invocationCallOrder[0];
            const sendCallOrder = res.send.mock.invocationCallOrder[0];
            
            expect(setCallOrder).toBeLessThan(statusCallOrder);
            expect(statusCallOrder).toBeLessThan(sendCallOrder);
        });
        
        it('should not call res.end() when using res.send()', async () => {
            // Arrange: Create mock req, res, and next objects
            const { req, res, next } = createMockReqResNext();
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify res.end() is not called (res.send() handles response completion)
            expect(res.end).not.toHaveBeenCalled();
        });
        
        it('should not call res.json() when using res.send() for plain text', async () => {
            // Arrange: Create mock req, res, and next objects
            const { req, res, next } = createMockReqResNext();
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify res.json() is not called for plain text response
            expect(res.json).not.toHaveBeenCalled();
        });
    });
    
    // Test case: Async/await error handling
    describe('should handle async errors properly', () => {
        it('should handle Promise rejections in async operations', async () => {
            // Arrange: Create mock req, res, and next with async error
            const { req, res, next } = createMockReqResNext();
            const asyncError = new Error('Async operation failed');
            
            // Mock an async operation that rejects
            res.send.mockImplementation(async () => {
                await new Promise((resolve, reject) => {
                    setTimeout(() => reject(asyncError), 10);
                });
            });
            
            // Act: Call helloController with mock objects
            await helloController(req, res, next);
            
            // Assert: Verify async error is caught and propagated
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });
        
        it('should handle multiple async errors without interference', async () => {
            // Arrange: Create multiple mock objects
            const { req: req1, res: res1, next: next1 } = createMockReqResNext();
            const { req: req2, res: res2, next: next2 } = createMockReqResNext();
            
            res1.send.mockImplementation(() => {
                throw new Error('First error');
            });
            res2.send.mockImplementation(() => {
                throw new Error('Second error');
            });
            
            // Act: Call helloController with different mock objects
            await helloController(req1, res1, next1);
            await helloController(req2, res2, next2);
            
            // Assert: Verify both errors are handled independently
            expect(next1).toHaveBeenCalledTimes(1);
            expect(next2).toHaveBeenCalledTimes(1);
            
            const error1 = next1.mock.calls[0][0];
            const error2 = next2.mock.calls[0][0];
            
            expect(error1.details.originalError).toBe('First error');
            expect(error2.details.originalError).toBe('Second error');
        });
    });
});