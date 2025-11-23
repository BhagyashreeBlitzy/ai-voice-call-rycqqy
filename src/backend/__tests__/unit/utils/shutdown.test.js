// Jest testing framework v29.7.0 - Test runner and mocking framework

// Internal imports - functions and classes under test
const { shutdown, setupShutdownHooks } = require('../../../utils/shutdown.js');
const { logger } = require('../../../utils/logger.js');
const { AppError } = require('../../../utils/errors.js');

// Mock process.exit to prevent actual process termination during tests
const originalProcessExit = process.exit;
let mockProcessExit;

// Mock logger functions to capture and assert log output
let mockLoggerInfo;
let mockLoggerWarn;
let mockLoggerError;

// Mock server object with .close method and event emitter interface
let mockServer;

// Test fixture data for consistent test setup
const TEST_TIMEOUT = 5000;
const TEST_PORT = 3000;

describe('shutdown', () => {
    beforeEach(() => {
        // Reset Jest timers and mocks before each test
        jest.useFakeTimers();
        jest.clearAllMocks();
        
        // Mock process.exit to prevent actual process termination
        mockProcessExit = jest.fn();
        process.exit = mockProcessExit;
        
        // Create spy mocks for logger functions to capture log output
        mockLoggerInfo = jest.spyOn(logger, 'info').mockImplementation(() => {});
        mockLoggerWarn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
        mockLoggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});
        
        // Create mock server object with close method and event emitter methods
        mockServer = {
            close: jest.fn(),
            on: jest.fn(),
            listening: true,
            connections: 0
        };
        
        // Reset the shutdownInitiated flag by requiring the module fresh
        // This ensures each test starts with a clean state
        jest.resetModules();
        delete require.cache[require.resolve('../../../utils/shutdown.js')];
    });
    
    afterEach(() => {
        // Restore original process.exit function
        process.exit = originalProcessExit;
        
        // Restore logger functions
        mockLoggerInfo.mockRestore();
        mockLoggerWarn.mockRestore();
        mockLoggerError.mockRestore();
        
        // Use real timers after each test
        jest.useRealTimers();
    });
    
    describe('successful shutdown scenarios', () => {
        it('should close the server and exit with code 0 on successful shutdown', async () => {
            // Arrange: Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                // Simulate server close event after a brief delay
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Call shutdown function
            const shutdownPromise = shutdown(mockServer);
            
            // Advance timers to trigger server close event
            jest.advanceTimersByTime(100);
            
            // Wait for shutdown to complete
            await shutdownPromise;
            
            // Assert: Verify server.close was called
            expect(mockServer.close).toHaveBeenCalledTimes(1);
            
            // Assert: Verify shutdown initiation was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Graceful shutdown initiated',
                expect.objectContaining({
                    timestamp: expect.any(String),
                    timeoutMs: expect.any(Number),
                    reason: expect.any(String)
                })
            );
            
            // Assert: Verify server close was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Server closed, all connections terminated'
            );
            
            // Assert: Verify successful shutdown completion was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Graceful shutdown completed successfully',
                expect.objectContaining({
                    duration: expect.any(Number),
                    timestamp: expect.any(String)
                })
            );
            
            // Assert: Verify process.exit was called with success code
            expect(mockProcessExit).toHaveBeenCalledWith(0);
        });
        
        it('should call onShutdown callback if provided', async () => {
            // Arrange: Create mock onShutdown callback
            const mockOnShutdown = jest.fn().mockResolvedValue();
            
            // Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Call shutdown with onShutdown callback
            const shutdownPromise = shutdown(mockServer, { onShutdown: mockOnShutdown });
            
            // Advance timers to trigger server close event
            jest.advanceTimersByTime(100);
            
            // Wait for shutdown to complete
            await shutdownPromise;
            
            // Assert: Verify onShutdown callback was called
            expect(mockOnShutdown).toHaveBeenCalledTimes(1);
            
            // Assert: Verify callback execution was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Executing custom shutdown callback'
            );
            
            // Assert: Verify callback completion was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Custom shutdown callback completed successfully'
            );
            
            // Assert: Verify process.exit was called with success code
            expect(mockProcessExit).toHaveBeenCalledWith(0);
        });
    });
    
    describe('duplicate shutdown prevention', () => {
        it('should prevent duplicate shutdowns and log a warning', async () => {
            // Arrange: Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Call shutdown twice simultaneously
            const shutdownPromise1 = shutdown(mockServer);
            const shutdownPromise2 = shutdown(mockServer);
            
            // Advance timers to trigger server close event
            jest.advanceTimersByTime(100);
            
            // Wait for both shutdown calls to complete
            await shutdownPromise1;
            await shutdownPromise2;
            
            // Assert: Verify server.close was called only once
            expect(mockServer.close).toHaveBeenCalledTimes(1);
            
            // Assert: Verify duplicate shutdown warning was logged
            expect(mockLoggerWarn).toHaveBeenCalledWith(
                'Shutdown already in progress, ignoring duplicate shutdown request'
            );
            
            // Assert: Verify process.exit was called only once
            expect(mockProcessExit).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('error handling scenarios', () => {
        it('should log and handle errors from server.close', async () => {
            // Arrange: Setup server mock to simulate close error
            const testError = new Error('Server close failed');
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'error')[1](testError);
                }, 100);
            });
            
            // Act: Call shutdown function
            const shutdownPromise = shutdown(mockServer);
            
            // Advance timers to trigger server error event
            jest.advanceTimersByTime(100);
            
            // Wait for shutdown to complete
            await shutdownPromise;
            
            // Assert: Verify server close error was logged
            expect(mockLoggerError).toHaveBeenCalledWith(
                'Error occurred during server close',
                expect.objectContaining({
                    error: testError.message,
                    stack: testError.stack
                })
            );
            
            // Assert: Verify shutdown error was logged
            expect(mockLoggerError).toHaveBeenCalledWith(
                'Error occurred during graceful shutdown',
                expect.objectContaining({
                    error: testError.message,
                    stack: testError.stack
                })
            );
            
            // Assert: Verify wrapped error was logged
            expect(mockLoggerError).toHaveBeenCalledWith(
                'Wrapped shutdown error',
                expect.objectContaining({
                    appError: expect.objectContaining({
                        error: true,
                        message: expect.stringContaining('Shutdown failed'),
                        status: 500
                    })
                })
            );
            
            // Assert: Verify process.exit was called with error code
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });
        
        it('should log and handle errors from onShutdown callback', async () => {
            // Arrange: Create mock onShutdown callback that throws error
            const testError = new Error('Cleanup failed');
            const mockOnShutdown = jest.fn().mockRejectedValue(testError);
            
            // Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Call shutdown with failing onShutdown callback
            const shutdownPromise = shutdown(mockServer, { onShutdown: mockOnShutdown });
            
            // Advance timers to trigger server close event
            jest.advanceTimersByTime(100);
            
            // Wait for shutdown to complete
            await shutdownPromise;
            
            // Assert: Verify onShutdown callback was called
            expect(mockOnShutdown).toHaveBeenCalledTimes(1);
            
            // Assert: Verify callback error was logged
            expect(mockLoggerError).toHaveBeenCalledWith(
                'Error in custom shutdown callback',
                expect.objectContaining({
                    error: testError.message,
                    stack: testError.stack
                })
            );
            
            // Assert: Verify shutdown still completes successfully despite callback error
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Graceful shutdown completed successfully',
                expect.objectContaining({
                    duration: expect.any(Number)
                })
            );
            
            // Assert: Verify process.exit was called with success code
            expect(mockProcessExit).toHaveBeenCalledWith(0);
        });
    });
    
    describe('timeout handling', () => {
        it('should force exit with code 1 if shutdown times out', async () => {
            // Arrange: Setup server mock to never close (simulate hang)
            mockServer.close.mockImplementation(() => {
                // Never trigger the close event to simulate timeout
            });
            
            // Act: Call shutdown with short timeout
            const shutdownPromise = shutdown(mockServer, { timeoutMs: 1000 });
            
            // Advance timers to trigger timeout
            jest.advanceTimersByTime(1000);
            
            // Wait for shutdown to complete
            await shutdownPromise;
            
            // Assert: Verify timeout error was logged
            expect(mockLoggerError).toHaveBeenCalledWith(
                'Shutdown timeout reached, forcing process exit',
                expect.objectContaining({
                    timeoutMs: 1000,
                    duration: expect.any(Number)
                })
            );
            
            // Assert: Verify process.exit was called with error code
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });
    });
    
    describe('logging verification', () => {
        it('should log all shutdown events and errors', async () => {
            // Arrange: Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Call shutdown function
            const shutdownPromise = shutdown(mockServer);
            
            // Advance timers to trigger server close event
            jest.advanceTimersByTime(100);
            
            // Wait for shutdown to complete
            await shutdownPromise;
            
            // Assert: Verify all required log messages were generated
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Graceful shutdown initiated',
                expect.any(Object)
            );
            
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Stopping server from accepting new connections'
            );
            
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Server closed, all connections terminated'
            );
            
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Graceful shutdown completed successfully',
                expect.any(Object)
            );
            
            // Assert: Verify no warning or error messages were logged
            expect(mockLoggerWarn).not.toHaveBeenCalled();
            expect(mockLoggerError).not.toHaveBeenCalled();
        });
    });
});

describe('setupShutdownHooks', () => {
    // Mock process.on to capture signal handlers
    let mockProcessOn;
    let originalProcessOn;
    
    beforeEach(() => {
        // Reset Jest timers and mocks before each test
        jest.useFakeTimers();
        jest.clearAllMocks();
        
        // Mock process.exit to prevent actual process termination
        mockProcessExit = jest.fn();
        process.exit = mockProcessExit;
        
        // Create spy mocks for logger functions to capture log output
        mockLoggerInfo = jest.spyOn(logger, 'info').mockImplementation(() => {});
        mockLoggerWarn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
        mockLoggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});
        
        // Create mock server object
        mockServer = {
            close: jest.fn(),
            on: jest.fn(),
            listening: true,
            connections: 0
        };
        
        // Mock process.on to capture signal handlers
        originalProcessOn = process.on;
        mockProcessOn = jest.fn();
        process.on = mockProcessOn;
    });
    
    afterEach(() => {
        // Restore original functions
        process.exit = originalProcessExit;
        process.on = originalProcessOn;
        
        // Restore logger functions
        mockLoggerInfo.mockRestore();
        mockLoggerWarn.mockRestore();
        mockLoggerError.mockRestore();
        
        // Use real timers after each test
        jest.useRealTimers();
    });
    
    describe('signal handler registration', () => {
        it('should register signal handlers for SIGTERM and SIGINT', () => {
            // Act: Setup shutdown hooks
            setupShutdownHooks(mockServer);
            
            // Assert: Verify process.on was called for SIGTERM
            expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
            
            // Assert: Verify process.on was called for SIGINT
            expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
            
            // Assert: Verify process.on was called for unhandledRejection
            expect(mockProcessOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
            
            // Assert: Verify process.on was called for uncaughtException
            expect(mockProcessOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
            
            // Assert: Verify signal handler registration was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Shutdown hooks registered for process signals',
                expect.objectContaining({
                    signals: ['SIGTERM', 'SIGINT'],
                    pid: expect.any(Number),
                    timestamp: expect.any(String)
                })
            );
        });
    });
    
    describe('signal handling', () => {
        it('should call shutdown on signal and log the event', () => {
            // Arrange: Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Setup shutdown hooks
            setupShutdownHooks(mockServer);
            
            // Get the SIGTERM handler from process.on mock calls
            const sigtermHandler = mockProcessOn.mock.calls.find(call => call[0] === 'SIGTERM')[1];
            
            // Simulate SIGTERM signal
            sigtermHandler();
            
            // Assert: Verify signal was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Received SIGTERM signal, initiating graceful shutdown',
                expect.objectContaining({
                    signal: 'SIGTERM',
                    timestamp: expect.any(String),
                    pid: expect.any(Number)
                })
            );
            
            // Advance timers to complete shutdown
            jest.advanceTimersByTime(100);
            
            // Assert: Verify shutdown was initiated
            expect(mockServer.close).toHaveBeenCalledTimes(1);
        });
        
        it('should not call shutdown again if already initiated by a signal', () => {
            // Arrange: Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Setup shutdown hooks
            setupShutdownHooks(mockServer);
            
            // Get the signal handlers from process.on mock calls
            const sigtermHandler = mockProcessOn.mock.calls.find(call => call[0] === 'SIGTERM')[1];
            const sigintHandler = mockProcessOn.mock.calls.find(call => call[0] === 'SIGINT')[1];
            
            // Simulate SIGTERM signal first
            sigtermHandler();
            
            // Simulate SIGINT signal second (should be ignored)
            sigintHandler();
            
            // Assert: Verify first signal was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Received SIGTERM signal, initiating graceful shutdown',
                expect.objectContaining({
                    signal: 'SIGTERM'
                })
            );
            
            // Assert: Verify second signal was logged with warning
            expect(mockLoggerWarn).toHaveBeenCalledWith(
                'Received SIGINT signal but shutdown already in progress',
                expect.objectContaining({
                    signal: 'SIGINT'
                })
            );
            
            // Advance timers to complete shutdown
            jest.advanceTimersByTime(100);
            
            // Assert: Verify shutdown was called only once
            expect(mockServer.close).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('error handling', () => {
        it('should handle unhandled promise rejections', () => {
            // Arrange: Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Setup shutdown hooks
            setupShutdownHooks(mockServer);
            
            // Get the unhandledRejection handler from process.on mock calls
            const rejectionHandler = mockProcessOn.mock.calls.find(call => call[0] === 'unhandledRejection')[1];
            
            // Simulate unhandled promise rejection
            const testError = new Error('Unhandled promise rejection');
            const testPromise = Promise.reject(testError);
            rejectionHandler(testError, testPromise);
            
            // Assert: Verify rejection was logged
            expect(mockLoggerError).toHaveBeenCalledWith(
                'Unhandled promise rejection detected',
                expect.objectContaining({
                    reason: testError.message,
                    stack: testError.stack,
                    promise: expect.any(String)
                })
            );
            
            // Assert: Verify shutdown was initiated
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Initiating shutdown due to unhandled promise rejection'
            );
        });
        
        it('should handle uncaught exceptions', () => {
            // Arrange: Setup server mock to simulate successful close
            mockServer.close.mockImplementation(() => {
                setTimeout(() => {
                    mockServer.on.mock.calls.find(call => call[0] === 'close')[1]();
                }, 100);
            });
            
            // Act: Setup shutdown hooks
            setupShutdownHooks(mockServer);
            
            // Get the uncaughtException handler from process.on mock calls
            const exceptionHandler = mockProcessOn.mock.calls.find(call => call[0] === 'uncaughtException')[1];
            
            // Simulate uncaught exception
            const testError = new Error('Uncaught exception');
            exceptionHandler(testError);
            
            // Assert: Verify exception was logged
            expect(mockLoggerError).toHaveBeenCalledWith(
                'Uncaught exception detected',
                expect.objectContaining({
                    error: testError.message,
                    stack: testError.stack,
                    timestamp: expect.any(String)
                })
            );
            
            // Assert: Verify shutdown was initiated
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Initiating shutdown due to uncaught exception'
            );
        });
    });
    
    describe('comprehensive logging', () => {
        it('should log all signal events and errors', () => {
            // Act: Setup shutdown hooks
            setupShutdownHooks(mockServer);
            
            // Assert: Verify registration was logged
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Shutdown hooks registered for process signals',
                expect.objectContaining({
                    signals: ['SIGTERM', 'SIGINT'],
                    pid: expect.any(Number),
                    timestamp: expect.any(String)
                })
            );
            
            // Assert: Verify all signal handlers were registered
            expect(mockProcessOn).toHaveBeenCalledTimes(4); // SIGTERM, SIGINT, unhandledRejection, uncaughtException
        });
    });
});