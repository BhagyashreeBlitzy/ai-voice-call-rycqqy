const { logger, info, warn, error } = require('../../../utils/logger.js');

// Global variables to capture output and store original process methods
let originalStdoutWrite;
let originalStderrWrite;
let stdoutOutput = [];
let stderrOutput = [];

describe('logger utility', () => {
    // Setup: Mock process.stdout.write and process.stderr.write before all tests
    beforeAll(() => {
        // Store original process methods for restoration
        originalStdoutWrite = process.stdout.write;
        originalStderrWrite = process.stderr.write;
        
        // Mock process.stdout.write to capture output in stdoutOutput array
        process.stdout.write = jest.fn().mockImplementation((chunk) => {
            stdoutOutput.push(chunk);
            return true;
        });
        
        // Mock process.stderr.write to capture output in stderrOutput array
        process.stderr.write = jest.fn().mockImplementation((chunk) => {
            stderrOutput.push(chunk);
            return true;
        });
    });
    
    // Cleanup: Restore original process methods after all tests
    afterAll(() => {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    });
    
    // Clear output arrays before each test to ensure test isolation
    beforeEach(() => {
        stdoutOutput = [];
        stderrOutput = [];
        // Reset logger level to default 'info' for consistent test state
        logger.level = 'info';
        // Clear mock call history
        jest.clearAllMocks();
    });
    
    describe('logger.info', () => {
        it('should log to stdout at info level', () => {
            // Arrange: Set logger level to 'info' and prepare test message
            logger.level = 'info';
            const testMessage = 'Test info message';
            
            // Act: Call logger.info with test message
            logger.info(testMessage);
            
            // Assert: Verify message was written to stdout
            expect(stdoutOutput).toHaveLength(1);
            expect(stderrOutput).toHaveLength(0);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain(testMessage);
            expect(stdoutOutput[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test info message\n$/);
        });
        
        it('should not log when logger level is warn', () => {
            // Arrange: Set logger level to 'warn' to suppress info messages
            logger.level = 'warn';
            const testMessage = 'Test suppressed info message';
            
            // Act: Call logger.info with test message
            logger.info(testMessage);
            
            // Assert: Verify no output was generated
            expect(stdoutOutput).toHaveLength(0);
            expect(stderrOutput).toHaveLength(0);
        });
        
        it('should not log when logger level is error', () => {
            // Arrange: Set logger level to 'error' to suppress info messages
            logger.level = 'error';
            const testMessage = 'Test suppressed info message';
            
            // Act: Call logger.info with test message
            logger.info(testMessage);
            
            // Assert: Verify no output was generated
            expect(stdoutOutput).toHaveLength(0);
            expect(stderrOutput).toHaveLength(0);
        });
        
        it('should include metadata in log output when provided', () => {
            // Arrange: Prepare test message with metadata
            const testMessage = 'Test info with metadata';
            const testMeta = { userId: 123, action: 'login' };
            
            // Act: Call logger.info with message and metadata
            logger.info(testMessage, testMeta);
            
            // Assert: Verify metadata is included in output
            expect(stdoutOutput).toHaveLength(1);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain(testMessage);
            expect(stdoutOutput[0]).toContain('userId: 123');
            expect(stdoutOutput[0]).toContain('action: \'login\'');
        });
        
        it('should handle empty metadata gracefully', () => {
            // Arrange: Prepare test message with empty metadata object
            const testMessage = 'Test info with empty metadata';
            const testMeta = {};
            
            // Act: Call logger.info with message and empty metadata
            logger.info(testMessage, testMeta);
            
            // Assert: Verify log output does not include metadata section
            expect(stdoutOutput).toHaveLength(1);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain(testMessage);
            expect(stdoutOutput[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test info with empty metadata\n$/);
        });
        
        it('should handle null metadata gracefully', () => {
            // Arrange: Prepare test message with null metadata
            const testMessage = 'Test info with null metadata';
            
            // Act: Call logger.info with message and null metadata
            logger.info(testMessage, null);
            
            // Assert: Verify log output does not include metadata section
            expect(stdoutOutput).toHaveLength(1);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain(testMessage);
            expect(stdoutOutput[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test info with null metadata\n$/);
        });
        
        it('should not throw on invalid input', () => {
            // Act & Assert: Verify logger.info doesn't throw on various invalid inputs
            expect(() => logger.info('')).not.toThrow();
            expect(() => logger.info(null)).not.toThrow();
            expect(() => logger.info(undefined)).not.toThrow();
            expect(() => logger.info('message', 'invalid-meta')).not.toThrow();
        });
    });
    
    describe('logger.warn', () => {
        it('should log to stderr at info level', () => {
            // Arrange: Set logger level to 'info' and prepare test message
            logger.level = 'info';
            const testMessage = 'Test warn message';
            
            // Act: Call logger.warn with test message
            logger.warn(testMessage);
            
            // Assert: Verify message was written to stderr
            expect(stdoutOutput).toHaveLength(0);
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[WARN]');
            expect(stderrOutput[0]).toContain(testMessage);
            expect(stderrOutput[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Test warn message\n$/);
        });
        
        it('should log to stderr at warn level', () => {
            // Arrange: Set logger level to 'warn' and prepare test message
            logger.level = 'warn';
            const testMessage = 'Test warn message at warn level';
            
            // Act: Call logger.warn with test message
            logger.warn(testMessage);
            
            // Assert: Verify message was written to stderr
            expect(stdoutOutput).toHaveLength(0);
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[WARN]');
            expect(stderrOutput[0]).toContain(testMessage);
        });
        
        it('should not log when logger level is error', () => {
            // Arrange: Set logger level to 'error' to suppress warn messages
            logger.level = 'error';
            const testMessage = 'Test suppressed warn message';
            
            // Act: Call logger.warn with test message
            logger.warn(testMessage);
            
            // Assert: Verify no output was generated
            expect(stdoutOutput).toHaveLength(0);
            expect(stderrOutput).toHaveLength(0);
        });
        
        it('should include metadata in log output when provided', () => {
            // Arrange: Prepare test message with metadata
            const testMessage = 'Test warn with metadata';
            const testMeta = { component: 'auth', reason: 'deprecated-api' };
            
            // Act: Call logger.warn with message and metadata
            logger.warn(testMessage, testMeta);
            
            // Assert: Verify metadata is included in output
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[WARN]');
            expect(stderrOutput[0]).toContain(testMessage);
            expect(stderrOutput[0]).toContain('component: \'auth\'');
            expect(stderrOutput[0]).toContain('reason: \'deprecated-api\'');
        });
        
        it('should handle empty metadata gracefully', () => {
            // Arrange: Prepare test message with empty metadata object
            const testMessage = 'Test warn with empty metadata';
            const testMeta = {};
            
            // Act: Call logger.warn with message and empty metadata
            logger.warn(testMessage, testMeta);
            
            // Assert: Verify log output does not include metadata section
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[WARN]');
            expect(stderrOutput[0]).toContain(testMessage);
            expect(stderrOutput[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Test warn with empty metadata\n$/);
        });
        
        it('should not throw on invalid input', () => {
            // Act & Assert: Verify logger.warn doesn't throw on various invalid inputs
            expect(() => logger.warn('')).not.toThrow();
            expect(() => logger.warn(null)).not.toThrow();
            expect(() => logger.warn(undefined)).not.toThrow();
            expect(() => logger.warn('message', 'invalid-meta')).not.toThrow();
        });
    });
    
    describe('logger.error', () => {
        it('should always log to stderr regardless of log level', () => {
            // Test at info level
            logger.level = 'info';
            const testMessage1 = 'Test error at info level';
            logger.error(testMessage1);
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[ERROR]');
            expect(stderrOutput[0]).toContain(testMessage1);
            
            // Clear output and test at warn level
            stderrOutput = [];
            logger.level = 'warn';
            const testMessage2 = 'Test error at warn level';
            logger.error(testMessage2);
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[ERROR]');
            expect(stderrOutput[0]).toContain(testMessage2);
            
            // Clear output and test at error level
            stderrOutput = [];
            logger.level = 'error';
            const testMessage3 = 'Test error at error level';
            logger.error(testMessage3);
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[ERROR]');
            expect(stderrOutput[0]).toContain(testMessage3);
        });
        
        it('should include metadata in log output when provided', () => {
            // Arrange: Prepare test message with metadata
            const testMessage = 'Test error with metadata';
            const testMeta = { errorCode: 500, stack: 'Error stack trace' };
            
            // Act: Call logger.error with message and metadata
            logger.error(testMessage, testMeta);
            
            // Assert: Verify metadata is included in output
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[ERROR]');
            expect(stderrOutput[0]).toContain(testMessage);
            expect(stderrOutput[0]).toContain('errorCode: 500');
            expect(stderrOutput[0]).toContain('stack: \'Error stack trace\'');
        });
        
        it('should handle empty metadata gracefully', () => {
            // Arrange: Prepare test message with empty metadata object
            const testMessage = 'Test error with empty metadata';
            const testMeta = {};
            
            // Act: Call logger.error with message and empty metadata
            logger.error(testMessage, testMeta);
            
            // Assert: Verify log output does not include metadata section
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[ERROR]');
            expect(stderrOutput[0]).toContain(testMessage);
            expect(stderrOutput[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] Test error with empty metadata\n$/);
        });
        
        it('should not throw on invalid input', () => {
            // Act & Assert: Verify logger.error doesn't throw on various invalid inputs
            expect(() => logger.error('')).not.toThrow();
            expect(() => logger.error(null)).not.toThrow();
            expect(() => logger.error(undefined)).not.toThrow();
            expect(() => logger.error('message', 'invalid-meta')).not.toThrow();
        });
    });
    
    describe('logger level filtering', () => {
        it('should enforce log level filtering correctly', () => {
            // Test info level - should log all levels
            logger.level = 'info';
            logger.info('Info message');
            logger.warn('Warn message');
            logger.error('Error message');
            
            expect(stdoutOutput).toHaveLength(1); // info message
            expect(stderrOutput).toHaveLength(2); // warn + error messages
            
            // Clear output and test warn level - should suppress info, allow warn and error
            stdoutOutput = [];
            stderrOutput = [];
            logger.level = 'warn';
            logger.info('Suppressed info message');
            logger.warn('Allowed warn message');
            logger.error('Allowed error message');
            
            expect(stdoutOutput).toHaveLength(0); // no info messages
            expect(stderrOutput).toHaveLength(2); // warn + error messages
            
            // Clear output and test error level - should suppress info and warn, allow error
            stdoutOutput = [];
            stderrOutput = [];
            logger.level = 'error';
            logger.info('Suppressed info message');
            logger.warn('Suppressed warn message');
            logger.error('Allowed error message');
            
            expect(stdoutOutput).toHaveLength(0); // no info messages
            expect(stderrOutput).toHaveLength(1); // only error message
        });
        
        it('should handle invalid log levels gracefully', () => {
            // Arrange: Set invalid log level
            logger.level = 'invalid';
            
            // Act: Call logger methods with invalid level
            logger.info('Info with invalid level');
            logger.warn('Warn with invalid level');
            logger.error('Error with invalid level');
            
            // Assert: Should default to info level behavior
            expect(stdoutOutput).toHaveLength(1); // info message logged
            expect(stderrOutput).toHaveLength(2); // warn + error messages logged
        });
    });
    
    describe('output format validation', () => {
        it('should include ISO timestamp in all log messages', () => {
            // Act: Log messages at different levels
            logger.info('Info message');
            logger.warn('Warn message');
            logger.error('Error message');
            
            // Assert: Verify all messages include valid ISO timestamps
            const isoTimestampRegex = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
            expect(stdoutOutput[0]).toMatch(isoTimestampRegex);
            expect(stderrOutput[0]).toMatch(isoTimestampRegex);
            expect(stderrOutput[1]).toMatch(isoTimestampRegex);
        });
        
        it('should format log levels correctly', () => {
            // Act: Log messages at different levels
            logger.info('Info message');
            logger.warn('Warn message');
            logger.error('Error message');
            
            // Assert: Verify log levels are formatted correctly
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stderrOutput[0]).toContain('[WARN]');
            expect(stderrOutput[1]).toContain('[ERROR]');
        });
        
        it('should format complex metadata objects correctly', () => {
            // Arrange: Create complex metadata object
            const complexMeta = {
                user: { id: 123, name: 'John Doe' },
                request: { method: 'GET', path: '/api/users' },
                performance: { duration: 150, memory: 45.6 },
                nested: { deep: { value: 'test' } }
            };
            
            // Act: Log with complex metadata
            logger.info('Complex metadata test', complexMeta);
            
            // Assert: Verify complex metadata is formatted correctly
            expect(stdoutOutput[0]).toContain('user: { id: 123, name: \'John Doe\' }');
            expect(stdoutOutput[0]).toContain('request: { method: \'GET\', path: \'/api/users\' }');
            expect(stdoutOutput[0]).toContain('performance: { duration: 150, memory: 45.6 }');
            expect(stdoutOutput[0]).toContain('nested: { deep: { value: \'test\' } }');
        });
    });
    
    describe('concurrent logging', () => {
        it('should handle concurrent calls without interleaving or corruption', async () => {
            // Arrange: Create array of concurrent logging promises
            const concurrentPromises = [];
            const messageCount = 10;
            
            // Act: Create concurrent logging calls
            for (let i = 0; i < messageCount; i++) {
                concurrentPromises.push(
                    Promise.resolve().then(() => {
                        logger.info(`Concurrent message ${i}`);
                        logger.warn(`Concurrent warning ${i}`);
                        logger.error(`Concurrent error ${i}`);
                    })
                );
            }
            
            // Wait for all concurrent operations to complete
            await Promise.all(concurrentPromises);
            
            // Assert: Verify all messages were logged correctly
            expect(stdoutOutput).toHaveLength(messageCount); // info messages
            expect(stderrOutput).toHaveLength(messageCount * 2); // warn + error messages
            
            // Verify messages are complete and not corrupted
            stdoutOutput.forEach((output, index) => {
                expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Concurrent message \d+\n$/);
            });
        });
    });
    
    describe('named export functions', () => {
        it('should provide named export functions that work correctly', () => {
            // Act: Use named export functions
            info('Named export info');
            warn('Named export warn');
            error('Named export error');
            
            // Assert: Verify named exports produce correct output
            expect(stdoutOutput).toHaveLength(1);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain('Named export info');
            
            expect(stderrOutput).toHaveLength(2);
            expect(stderrOutput[0]).toContain('[WARN]');
            expect(stderrOutput[0]).toContain('Named export warn');
            expect(stderrOutput[1]).toContain('[ERROR]');
            expect(stderrOutput[1]).toContain('Named export error');
        });
        
        it('should respect logger level when using named exports', () => {
            // Arrange: Set logger level to warn
            logger.level = 'warn';
            
            // Act: Use named export functions
            info('Suppressed named export info');
            warn('Allowed named export warn');
            error('Allowed named export error');
            
            // Assert: Verify level filtering works with named exports
            expect(stdoutOutput).toHaveLength(0); // info suppressed
            expect(stderrOutput).toHaveLength(2); // warn + error allowed
        });
    });
    
    describe('logger level property', () => {
        it('should allow runtime modification of logger level', () => {
            // Arrange: Start with info level
            logger.level = 'info';
            logger.info('Initial info message');
            expect(stdoutOutput).toHaveLength(1);
            
            // Act: Change to warn level
            stdoutOutput = [];
            logger.level = 'warn';
            logger.info('Suppressed info message');
            
            // Assert: Verify level change took effect
            expect(stdoutOutput).toHaveLength(0);
        });
        
        it('should maintain level consistency across all logger methods', () => {
            // Arrange: Set level to error
            logger.level = 'error';
            
            // Act: Test all methods
            logger.info('Suppressed info');
            logger.warn('Suppressed warn');
            logger.error('Allowed error');
            
            // Assert: Verify consistent level enforcement
            expect(stdoutOutput).toHaveLength(0);
            expect(stderrOutput).toHaveLength(1);
            expect(stderrOutput[0]).toContain('[ERROR]');
        });
    });
    
    describe('edge cases and error handling', () => {
        it('should handle very long messages correctly', () => {
            // Arrange: Create very long message
            const longMessage = 'A'.repeat(10000);
            
            // Act: Log very long message
            logger.info(longMessage);
            
            // Assert: Verify long message is handled correctly
            expect(stdoutOutput).toHaveLength(1);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain(longMessage);
        });
        
        it('should handle special characters in messages', () => {
            // Arrange: Create message with special characters
            const specialMessage = 'Test with 特殊字符 and émojis 🚀 and newlines\n\ttabs';
            
            // Act: Log message with special characters
            logger.info(specialMessage);
            
            // Assert: Verify special characters are handled correctly
            expect(stdoutOutput).toHaveLength(1);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain(specialMessage);
        });
        
        it('should handle circular references in metadata', () => {
            // Arrange: Create circular reference object
            const circularMeta = { name: 'circular' };
            circularMeta.self = circularMeta;
            
            // Act & Assert: Verify circular references don't cause errors
            expect(() => logger.info('Circular reference test', circularMeta)).not.toThrow();
            expect(stdoutOutput).toHaveLength(1);
            expect(stdoutOutput[0]).toContain('[INFO]');
            expect(stdoutOutput[0]).toContain('Circular reference test');
        });
        
        it('should handle non-string message types', () => {
            // Act & Assert: Verify non-string messages are handled
            expect(() => logger.info(123)).not.toThrow();
            expect(() => logger.info(true)).not.toThrow();
            expect(() => logger.info({ message: 'object' })).not.toThrow();
            expect(() => logger.info(['array', 'message'])).not.toThrow();
            
            // Verify messages were logged
            expect(stdoutOutput).toHaveLength(4);
        });
    });
});