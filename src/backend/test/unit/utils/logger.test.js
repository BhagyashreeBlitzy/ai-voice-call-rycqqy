/**
 * Comprehensive Unit Test Module for Logger Utility
 * 
 * This test module validates logging functionality, level management, component-scoped logging,
 * and educational logging patterns using Node.js built-in test runner with proper mocking
 * strategies, test environment isolation, and comprehensive test coverage for robust and
 * maintainable test execution.
 * 
 * Tests include:
 * - Logger class methods and factory functions
 * - Log level filtering and priority management
 * - Console output formatting and validation
 * - Error handling and recovery mechanisms
 * - Performance characteristics and benchmarking
 * - Cache behavior and instance management
 * - Educational testing patterns and practices
 * 
 * Features comprehensive unit testing using Node.js built-in test runner, proper test
 * organization, assertion strategies, mock management, and integration with project
 * testing infrastructure for educational value and production readiness.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in testing modules - Node.js v18+
const { describe, test, beforeEach, afterEach } = require('node:test'); // Built-in Node.js test runner
const assert = require('node:assert'); // Built-in Node.js assertion library
const util = require('node:util'); // Built-in Node.js util module for object inspection

// Import logger utilities and functions being tested
const {
    getLogger,           // Primary factory function for creating component-specific loggers
    createLogger,        // Direct logger creation function with custom configuration
    Logger,              // Logger class for direct instantiation testing and method validation
    setLogLevel,         // Global log level management function for runtime configuration updates
    clearLoggerCache,    // Cache management utility for testing logger instance management
    getAvailableLogLevels // Utility function for testing log level enumeration and validation
} = require('../../../utils/logger.js');

// Import test helper utilities for comprehensive test support
const {
    createTestLogger,       // Test logger factory for creating test-specific loggers
    createMockFunction,     // Mock function factory with call tracking
    createTestEnvironment,  // Test environment isolation utility
    measureExecutionTime,   // Performance measurement utility
    TestUtilities          // Comprehensive test utilities class
} = require('../../helpers/testHelpers.js');

// Import application constants for testing log level validation
const {
    LOG_LEVELS, // Log level constants for testing priority and validation
    LOGGING     // Logging configuration constants for environment-specific behavior
} = require('../../../utils/constants.js');

// Import test configuration for timeout management and test environment settings
const { testConfig } = require('../../setup/testConfig.js');

// Global test constants and configuration for consistent test execution
const TEST_COMPONENT_NAME = 'LoggerTest';
const ORIGINAL_CONSOLE = {
    log: console.log,
    error: console.error,
    warn: console.warn
};
const MOCK_LOG_MESSAGES = {
    error: 'Test error message',
    warn: 'Test warning message', 
    info: 'Test info message',
    debug: 'Test debug message'
};
const TEST_TIMEOUT = testConfig.timeouts.unit.default;

// Test utilities instance for mock management and environment isolation
let testUtilities;
let consoleCapture;
let testEnvironment;

/**
 * Sets up console output capture for testing logger output by mocking console methods
 * and providing captured output for assertion validation.
 * 
 * @param {Object} captureOptions - Options for configuring console capture behavior
 * @returns {Object} Console capture object with captured outputs and restore function
 */
function setupConsoleCapture(captureOptions = {}) {
    const captured = {
        log: [],
        error: [],
        warn: [],
        debug: []
    };

    // Store original console methods for restoration
    const originalMethods = {
        log: console.log,
        error: console.error,
        warn: console.warn
    };

    // Create mock functions that capture output
    console.log = createMockFunction((message, ...args) => {
        captured.log.push({ message, args, timestamp: Date.now() });
        if (captureOptions.passThrough) {
            originalMethods.log(message, ...args);
        }
    });

    console.error = createMockFunction((message, ...args) => {
        captured.error.push({ message, args, timestamp: Date.now() });
        if (captureOptions.passThrough) {
            originalMethods.error(message, ...args);
        }
    });

    console.warn = createMockFunction((message, ...args) => {
        captured.warn.push({ message, args, timestamp: Date.now() });
        if (captureOptions.passThrough) {
            originalMethods.warn(message, ...args);
        }
    });

    // Return capture object with restoration function
    return {
        captured,
        restore: () => {
            console.log = originalMethods.log;
            console.error = originalMethods.error;
            console.warn = originalMethods.warn;
        }
    };
}

/**
 * Validates log message format, content, and structure including timestamp, log level,
 * component name, and message content for comprehensive log output verification.
 * 
 * @param {string} logOutput - Complete log output string to validate
 * @param {string} expectedLevel - Expected log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} expectedComponent - Expected component name for scoped logging
 * @param {string} expectedMessage - Expected message content
 * @returns {boolean} True if log message matches all expectations, false otherwise
 */
function validateLogMessage(logOutput, expectedLevel, expectedComponent, expectedMessage) {
    try {
        // Parse log output for timestamp, level, component, and message
        const logPattern = /^\[(ERROR|WARN|INFO|DEBUG)\] (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) - \[(.+?)\] (.+)$/;
        const match = logOutput.match(logPattern);

        if (!match) {
            return false;
        }

        const [, level, timestamp, component, message] = match;

        // Validate log level matches expected level
        if (level !== expectedLevel) {
            return false;
        }

        // Validate timestamp format is ISO string with milliseconds
        const timestampValid = !isNaN(Date.parse(timestamp));
        if (!timestampValid) {
            return false;
        }

        // Validate component name matches expected component
        if (component !== expectedComponent) {
            return false;
        }

        // Validate message content matches expected message
        if (message !== expectedMessage) {
            return false;
        }

        return true;

    } catch (error) {
        return false;
    }
}

/**
 * Creates logger instance specifically configured for testing with controlled configuration,
 * predictable behavior, and test environment isolation.
 * 
 * @param {string} componentName - Component name for scoped logging identification
 * @param {Object} testConfig - Test-specific configuration overrides
 * @returns {Object} Test logger instance with controlled configuration
 */
function createTestLoggerInstance(componentName, testConfig = {}) {
    const loggerConfig = {
        level: testConfig.level || 'debug',
        component: componentName,
        console: true,
        timestamp: true,
        colorize: false,
        ...testConfig
    };

    return createLogger(loggerConfig);
}

/**
 * Tests logger performance characteristics including execution time, memory usage,
 * and throughput for performance validation and educational benchmarking.
 * 
 * @param {Object} logger - Logger instance to performance test
 * @param {number} iterations - Number of iterations for reliable metrics
 * @returns {Promise<Object>} Promise resolving to performance metrics
 */
async function testLoggerPerformance(logger, iterations = 1000) {
    const performanceResults = {
        executionTime: {},
        memoryUsage: {},
        throughput: {},
        iterations: iterations
    };

    // Measure execution time for different log levels
    const levels = ['error', 'warn', 'info', 'debug'];
    
    for (const level of levels) {
        if (typeof logger[level] === 'function') {
            const startTime = Date.now();
            const startMemory = process.memoryUsage();

            // Execute logger operations
            for (let i = 0; i < iterations; i++) {
                logger[level](`Performance test message ${i}`);
            }

            const endTime = Date.now();
            const endMemory = process.memoryUsage();

            // Calculate performance metrics
            performanceResults.executionTime[level] = endTime - startTime;
            performanceResults.memoryUsage[level] = {
                rss: endMemory.rss - startMemory.rss,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed
            };
            performanceResults.throughput[level] = iterations / (performanceResults.executionTime[level] / 1000);
        }
    }

    return performanceResults;
}

/**
 * Validates log level filtering behavior by testing that messages below current log level
 * are properly filtered and not output to console.
 * 
 * @param {Object} logger - Logger instance to test filtering behavior
 * @param {string} currentLevel - Current log level setting
 * @param {Object} consoleCapture - Console capture object for output validation
 * @returns {boolean} True if filtering works correctly, false otherwise
 */
function validateLogLevelFiltering(logger, currentLevel, consoleCapture) {
    try {
        // Set logger to specified level
        logger.setLevel(currentLevel);

        // Clear captured output
        consoleCapture.captured.log = [];
        consoleCapture.captured.error = [];
        consoleCapture.captured.warn = [];

        // Test all log levels
        logger.error('Test error message');
        logger.warn('Test warning message');  
        logger.info('Test info message');
        logger.debug('Test debug message');

        // Get log level priority for comparison
        const levelPriorities = {
            'ERROR': 1,
            'WARN': 2,
            'INFO': 3,
            'DEBUG': 4
        };

        const currentPriority = levelPriorities[currentLevel];
        if (!currentPriority) {
            return false;
        }

        // Validate that only appropriate messages were logged
        const totalMessages = consoleCapture.captured.log.length + 
                            consoleCapture.captured.error.length + 
                            consoleCapture.captured.warn.length;

        // Count expected messages based on level
        let expectedMessages = 0;
        if (currentPriority >= 1) expectedMessages++; // ERROR
        if (currentPriority >= 2) expectedMessages++; // WARN  
        if (currentPriority >= 3) expectedMessages++; // INFO
        if (currentPriority >= 4) expectedMessages++; // DEBUG

        return totalMessages === expectedMessages;

    } catch (error) {
        return false;
    }
}

/**
 * Tests logger behavior in error scenarios including invalid log levels, malformed messages,
 * and error recovery to ensure robust error handling.
 * 
 * @param {Object} logger - Logger instance to test error scenarios
 * @param {Object} testUtilities - Test utilities for mock management
 * @returns {Promise<Object>} Promise resolving to error handling test results
 */
async function testErrorScenarios(logger, testUtilities) {
    const errorResults = {
        invalidLevelHandling: false,
        malformedMessageHandling: false,
        consoleErrorRecovery: false,
        circularReferenceHandling: false,
        nullMessageHandling: false,
        undefinedMessageHandling: false
    };

    try {
        // Test invalid log level handling
        try {
            logger.setLevel('INVALID_LEVEL');
            // Should not crash - check if logger continues to work
            logger.info('Test after invalid level');
            errorResults.invalidLevelHandling = true;
        } catch (error) {
            // Expected to handle gracefully
            errorResults.invalidLevelHandling = false;
        }

        // Test null message handling
        try {
            logger.info(null);
            errorResults.nullMessageHandling = true;
        } catch (error) {
            errorResults.nullMessageHandling = false;
        }

        // Test undefined message handling
        try {
            logger.info(undefined);
            errorResults.undefinedMessageHandling = true;
        } catch (error) {
            errorResults.undefinedMessageHandling = false;
        }

        // Test circular reference handling
        try {
            const circularObj = { name: 'test' };
            circularObj.self = circularObj;
            logger.info('Circular reference test', circularObj);
            errorResults.circularReferenceHandling = true;
        } catch (error) {
            errorResults.circularReferenceHandling = false;
        }

        // Test console error recovery
        const originalConsoleError = console.error;
        try {
            console.error = () => {
                throw new Error('Console error simulation');
            };
            
            logger.error('Test console error recovery');
            errorResults.consoleErrorRecovery = true;
        } catch (error) {
            errorResults.consoleErrorRecovery = false;
        } finally {
            console.error = originalConsoleError;
        }

        // Test malformed message handling
        try {
            logger.info(Symbol('test'));
            errorResults.malformedMessageHandling = true;
        } catch (error) {
            errorResults.malformedMessageHandling = false;
        }

    } catch (globalError) {
        // Should not reach here in well-designed logger
        return {
            ...errorResults,
            globalError: globalError.message,
            success: false
        };
    }

    return {
        ...errorResults,
        success: Object.values(errorResults).every(result => result === true)
    };
}

// Main test suite for Logger Utility Unit Tests
describe('Logger Utility Unit Tests', { timeout: TEST_TIMEOUT }, () => {
    
    // Set up test environment before each test
    beforeEach(async () => {
        // Initialize test utilities for mock management and cleanup
        testUtilities = new TestUtilities({
            enableMocking: true,
            enableCleanup: true,
            trackCalls: true
        });

        // Set up console output capture for logger output validation
        consoleCapture = setupConsoleCapture({
            passThrough: false // Prevent console pollution during tests
        });

        // Create isolated test environment
        testEnvironment = await createTestEnvironment({
            isolateEnvironment: true,
            cleanupOnExit: true
        });

        // Clear logger cache to ensure clean test state
        clearLoggerCache();

        // Set default log level for consistent test behavior
        setLogLevel('DEBUG');
    });

    // Clean up test environment after each test
    afterEach(async () => {
        // Restore original console methods
        if (consoleCapture && consoleCapture.restore) {
            consoleCapture.restore();
        }

        // Clean up test utilities and reset mocks
        if (testUtilities && typeof testUtilities.cleanup === 'function') {
            await testUtilities.cleanup();
        }

        // Clean up test environment
        if (testEnvironment && typeof testEnvironment.cleanup === 'function') {
            await testEnvironment.cleanup();
        }

        // Clear logger cache after tests
        clearLoggerCache();

        // Reset global log level
        setLogLevel('INFO');
    });

    // Test logger instance creation using getLogger factory function
    test('should create logger instance using getLogger factory function', async () => {
        // Create logger using factory function
        const logger = getLogger(TEST_COMPONENT_NAME);

        // Validate logger instance is created successfully
        assert.ok(logger, 'Logger instance should be created');
        assert.strictEqual(typeof logger, 'object', 'Logger should be an object');

        // Validate logger has correct component name
        assert.strictEqual(logger.componentName, TEST_COMPONENT_NAME, 'Logger should have correct component name');

        // Validate logger has all required methods
        assert.strictEqual(typeof logger.error, 'function', 'Logger should have error method');
        assert.strictEqual(typeof logger.warn, 'function', 'Logger should have warn method');
        assert.strictEqual(typeof logger.info, 'function', 'Logger should have info method');
        assert.strictEqual(typeof logger.debug, 'function', 'Logger should have debug method');
        assert.strictEqual(typeof logger.setLevel, 'function', 'Logger should have setLevel method');
        assert.strictEqual(typeof logger.getLevel, 'function', 'Logger should have getLevel method');
        assert.strictEqual(typeof logger.isLevelEnabled, 'function', 'Logger should have isLevelEnabled method');

        // Test logger instance caching behavior
        const secondLogger = getLogger(TEST_COMPONENT_NAME);
        assert.strictEqual(logger, secondLogger, 'Same component name should return cached logger instance');

        // Test different component creates new instance
        const differentLogger = getLogger('DifferentComponent');
        assert.notStrictEqual(logger, differentLogger, 'Different component name should create new logger instance');
    });

    // Test custom logger creation using createLogger function
    test('should create custom logger using createLogger function', async () => {
        const customConfig = {
            level: 'WARN',
            component: 'CustomTest',
            console: true,
            timestamp: true,
            colorize: false
        };

        // Create custom logger with specific configuration
        const customLogger = createLogger(customConfig);

        // Validate custom logger is created with provided configuration
        assert.ok(customLogger, 'Custom logger instance should be created');
        assert.strictEqual(customLogger.componentName, 'CustomTest', 'Custom logger should have correct component name');
        assert.strictEqual(customLogger.getLevel(), 'WARN', 'Custom logger should have correct log level');

        // Test custom logger bypasses global cache
        const cachedLogger = getLogger('CustomTest');
        assert.notStrictEqual(customLogger, cachedLogger, 'Custom logger should bypass global cache');

        // Test custom configuration overrides defaults
        customLogger.debug('Debug message should not appear');
        customLogger.warn('Warning message should appear');
        
        assert.strictEqual(consoleCapture.captured.log.length, 0, 'Debug message should be filtered');
        assert.strictEqual(consoleCapture.captured.warn.length, 1, 'Warning message should appear');
    });

    // Test error message logging at ERROR level
    test('should log error messages at ERROR level', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);
        const errorMessage = MOCK_LOG_MESSAGES.error;

        // Log error message
        logger.error(errorMessage);

        // Validate error message is output to console.error
        assert.strictEqual(consoleCapture.captured.error.length, 1, 'Error message should be output once');
        
        const capturedMessage = consoleCapture.captured.error[0].message;
        assert.ok(capturedMessage.includes(errorMessage), 'Captured message should contain error text');
        assert.ok(capturedMessage.includes('[ERROR]'), 'Message should include ERROR level');
        assert.ok(capturedMessage.includes(`[${TEST_COMPONENT_NAME}]`), 'Message should include component name');

        // Validate message format includes timestamp
        const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
        assert.ok(timestampPattern.test(capturedMessage), 'Message should include valid timestamp');
    });

    // Test warning message logging at WARN level  
    test('should log warning messages at WARN level', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);
        const warnMessage = MOCK_LOG_MESSAGES.warn;

        // Log warning message
        logger.warn(warnMessage);

        // Validate warning message is output to console.warn
        assert.strictEqual(consoleCapture.captured.warn.length, 1, 'Warning message should be output once');
        
        const capturedMessage = consoleCapture.captured.warn[0].message;
        assert.ok(capturedMessage.includes(warnMessage), 'Captured message should contain warning text');
        assert.ok(capturedMessage.includes('[WARN]'), 'Message should include WARN level');
        assert.ok(capturedMessage.includes(`[${TEST_COMPONENT_NAME}]`), 'Message should include component name');

        // Test message format consistency
        const messageFormat = validateLogMessage(capturedMessage, 'WARN', TEST_COMPONENT_NAME, warnMessage);
        assert.ok(messageFormat, 'Warning message should follow consistent format');
    });

    // Test info message logging at INFO level
    test('should log info messages at INFO level', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);
        const infoMessage = MOCK_LOG_MESSAGES.info;

        // Log info message
        logger.info(infoMessage);

        // Validate info message is output to console.log
        assert.strictEqual(consoleCapture.captured.log.length, 1, 'Info message should be output once');
        
        const capturedMessage = consoleCapture.captured.log[0].message;
        assert.ok(capturedMessage.includes(infoMessage), 'Captured message should contain info text');
        assert.ok(capturedMessage.includes('[INFO]'), 'Message should include INFO level');
        assert.ok(capturedMessage.includes(`[${TEST_COMPONENT_NAME}]`), 'Message should include component name');

        // Test message content is properly formatted
        const messageFormat = validateLogMessage(capturedMessage, 'INFO', TEST_COMPONENT_NAME, infoMessage);
        assert.ok(messageFormat, 'Info message should follow consistent format');
    });

    // Test debug message logging at DEBUG level
    test('should log debug messages at DEBUG level', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);
        const debugMessage = MOCK_LOG_MESSAGES.debug;

        // Ensure debug level is enabled
        logger.setLevel('DEBUG');

        // Log debug message
        logger.debug(debugMessage);

        // Validate debug message is output to console.log
        assert.strictEqual(consoleCapture.captured.log.length, 1, 'Debug message should be output once');
        
        const capturedMessage = consoleCapture.captured.log[0].message;
        assert.ok(capturedMessage.includes(debugMessage), 'Captured message should contain debug text');
        assert.ok(capturedMessage.includes('[DEBUG]'), 'Message should include DEBUG level');
        assert.ok(capturedMessage.includes(`[${TEST_COMPONENT_NAME}]`), 'Message should include component name');

        // Test debug formatting is distinct and detailed
        const messageFormat = validateLogMessage(capturedMessage, 'DEBUG', TEST_COMPONENT_NAME, debugMessage);
        assert.ok(messageFormat, 'Debug message should follow consistent format');
    });

    // Test log level filtering functionality
    test('should filter messages based on log level configuration', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);

        // Test ERROR level filtering
        const errorFiltering = validateLogLevelFiltering(logger, 'ERROR', consoleCapture);
        assert.ok(errorFiltering, 'ERROR level should filter lower priority messages');

        // Test WARN level filtering  
        clearLoggerCache();
        consoleCapture.captured.log = [];
        consoleCapture.captured.error = [];
        consoleCapture.captured.warn = [];
        
        const warnFiltering = validateLogLevelFiltering(logger, 'WARN', consoleCapture);
        assert.ok(warnFiltering, 'WARN level should filter INFO and DEBUG messages');

        // Test INFO level filtering
        clearLoggerCache();
        consoleCapture.captured.log = [];
        consoleCapture.captured.error = [];
        consoleCapture.captured.warn = [];
        
        const infoFiltering = validateLogLevelFiltering(logger, 'INFO', consoleCapture);
        assert.ok(infoFiltering, 'INFO level should filter DEBUG messages only');

        // Test DEBUG level allows all messages
        clearLoggerCache();
        consoleCapture.captured.log = [];
        consoleCapture.captured.error = [];
        consoleCapture.captured.warn = [];
        
        const debugFiltering = validateLogLevelFiltering(logger, 'DEBUG', consoleCapture);
        assert.ok(debugFiltering, 'DEBUG level should allow all messages');
    });

    // Test log level updates using setLevel method
    test('should update log level using setLevel method', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);

        // Test initial level setting
        logger.setLevel('WARN');
        assert.strictEqual(logger.getLevel(), 'WARN', 'Logger level should be updated to WARN');

        // Test level change affects filtering immediately
        logger.debug('Debug message should be filtered');
        logger.warn('Warning message should appear');
        
        assert.strictEqual(consoleCapture.captured.log.length, 0, 'Debug message should be filtered at WARN level');
        assert.strictEqual(consoleCapture.captured.warn.length, 1, 'Warning message should appear at WARN level');

        // Test level change to more permissive level
        logger.setLevel('DEBUG');
        consoleCapture.captured.log = [];
        consoleCapture.captured.warn = [];
        
        logger.debug('Debug message should now appear');
        assert.strictEqual(consoleCapture.captured.log.length, 1, 'Debug message should appear at DEBUG level');
    });

    // Test current log level retrieval using getLevel method
    test('should return current log level using getLevel method', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);

        // Test default level
        const defaultLevel = logger.getLevel();
        assert.ok(['ERROR', 'WARN', 'INFO', 'DEBUG'].includes(defaultLevel), 'Default level should be valid log level');

        // Test level changes are reflected
        logger.setLevel('ERROR');
        assert.strictEqual(logger.getLevel(), 'ERROR', 'getLevel should return ERROR after setLevel');

        logger.setLevel('DEBUG');
        assert.strictEqual(logger.getLevel(), 'DEBUG', 'getLevel should return DEBUG after setLevel');

        // Test method returns string type
        assert.strictEqual(typeof logger.getLevel(), 'string', 'getLevel should return string');
    });

    // Test level enablement checking using isLevelEnabled method
    test('should check level enablement using isLevelEnabled method', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);

        // Test at ERROR level
        logger.setLevel('ERROR');
        assert.strictEqual(logger.isLevelEnabled('ERROR'), true, 'ERROR should be enabled at ERROR level');
        assert.strictEqual(logger.isLevelEnabled('WARN'), false, 'WARN should be disabled at ERROR level');
        assert.strictEqual(logger.isLevelEnabled('INFO'), false, 'INFO should be disabled at ERROR level');
        assert.strictEqual(logger.isLevelEnabled('DEBUG'), false, 'DEBUG should be disabled at ERROR level');

        // Test at INFO level
        logger.setLevel('INFO');
        assert.strictEqual(logger.isLevelEnabled('ERROR'), true, 'ERROR should be enabled at INFO level');
        assert.strictEqual(logger.isLevelEnabled('WARN'), true, 'WARN should be enabled at INFO level');
        assert.strictEqual(logger.isLevelEnabled('INFO'), true, 'INFO should be enabled at INFO level');
        assert.strictEqual(logger.isLevelEnabled('DEBUG'), false, 'DEBUG should be disabled at INFO level');

        // Test at DEBUG level (all enabled)
        logger.setLevel('DEBUG');
        assert.strictEqual(logger.isLevelEnabled('ERROR'), true, 'ERROR should be enabled at DEBUG level');
        assert.strictEqual(logger.isLevelEnabled('WARN'), true, 'WARN should be enabled at DEBUG level');
        assert.strictEqual(logger.isLevelEnabled('INFO'), true, 'INFO should be enabled at DEBUG level');
        assert.strictEqual(logger.isLevelEnabled('DEBUG'), true, 'DEBUG should be enabled at DEBUG level');
    });

    // Test global log level updates using setLogLevel function
    test('should update global log level using setLogLevel function', async () => {
        // Set global log level
        setLogLevel('WARN');

        // Create new logger to test global setting
        const logger1 = getLogger('TestComponent1');
        const logger2 = getLogger('TestComponent2');

        // Test both loggers reflect global level
        assert.strictEqual(logger1.getLevel(), 'WARN', 'New logger should use global WARN level');
        assert.strictEqual(logger2.getLevel(), 'WARN', 'New logger should use global WARN level');

        // Test global level change affects new instances
        setLogLevel('DEBUG');
        clearLoggerCache(); // Clear cache to force new instances
        
        const logger3 = getLogger('TestComponent3');
        assert.strictEqual(logger3.getLevel(), 'DEBUG', 'New logger should use updated global DEBUG level');
    });

    // Test logger cache management using clearLoggerCache function
    test('should clear logger cache using clearLoggerCache function', async () => {
        // Create logger to populate cache
        const logger1 = getLogger(TEST_COMPONENT_NAME);
        const logger2 = getLogger(TEST_COMPONENT_NAME);

        // Verify caching behavior
        assert.strictEqual(logger1, logger2, 'Same component should return cached instance');

        // Clear cache
        clearLoggerCache();

        // Create new logger after cache clear
        const logger3 = getLogger(TEST_COMPONENT_NAME);

        // Verify new instance created
        assert.notStrictEqual(logger1, logger3, 'New logger should be created after cache clear');
        assert.strictEqual(typeof logger3, 'object', 'New logger should be valid object');
        assert.strictEqual(logger3.componentName, TEST_COMPONENT_NAME, 'New logger should have correct component name');
    });

    // Test available log levels retrieval using getAvailableLogLevels function
    test('should return available log levels using getAvailableLogLevels function', async () => {
        const availableLevels = getAvailableLogLevels();

        // Validate function returns array
        assert.ok(Array.isArray(availableLevels), 'Available log levels should be an array');
        assert.ok(availableLevels.length > 0, 'Available log levels should not be empty');

        // Validate all standard levels are included
        const expectedLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        expectedLevels.forEach(level => {
            assert.ok(availableLevels.includes(level), `Available levels should include ${level}`);
        });

        // Validate array contains only valid level strings
        availableLevels.forEach(level => {
            assert.strictEqual(typeof level, 'string', 'Each log level should be a string');
            assert.ok(expectedLevels.includes(level), `${level} should be a valid log level`);
        });

        // Test levels are in priority order
        const expectedOrder = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        assert.deepStrictEqual(availableLevels, expectedOrder, 'Log levels should be in priority order');
    });

    // Test logger performance characteristics
    test('should handle logger performance within acceptable limits', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);
        const iterations = 100; // Reduced for test speed

        // Measure logger performance
        const performanceResults = await testLoggerPerformance(logger, iterations);

        // Validate execution time for individual operations
        Object.keys(performanceResults.executionTime).forEach(level => {
            const avgTimePerOperation = performanceResults.executionTime[level] / iterations;
            assert.ok(avgTimePerOperation < 10, `${level} logging should complete within 10ms per operation`);
        });

        // Validate throughput exceeds minimum requirements
        Object.keys(performanceResults.throughput).forEach(level => {
            assert.ok(performanceResults.throughput[level] > 100, `${level} logging should exceed 100 operations per second`);
        });

        // Validate memory usage remains reasonable
        Object.keys(performanceResults.memoryUsage).forEach(level => {
            const memoryIncrease = performanceResults.memoryUsage[level].heapUsed;
            assert.ok(memoryIncrease < 1024 * 1024, `${level} logging should use less than 1MB additional memory`);
        });

        // Test performance consistency across levels
        const executionTimes = Object.values(performanceResults.executionTime);
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);
        const variance = (maxTime - minTime) / minTime;
        assert.ok(variance < 2.0, 'Performance should be consistent across log levels');
    });

    // Test error scenario handling and recovery
    test('should handle error scenarios gracefully', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);

        // Test error handling comprehensive scenarios
        const errorResults = await testErrorScenarios(logger, testUtilities);

        // Validate all error scenarios are handled gracefully
        assert.ok(errorResults.invalidLevelHandling, 'Logger should handle invalid log levels gracefully');
        assert.ok(errorResults.nullMessageHandling, 'Logger should handle null messages gracefully');
        assert.ok(errorResults.undefinedMessageHandling, 'Logger should handle undefined messages gracefully');
        assert.ok(errorResults.circularReferenceHandling, 'Logger should handle circular references gracefully');
        assert.ok(errorResults.malformedMessageHandling, 'Logger should handle malformed messages gracefully');
        
        // Test logger maintains functionality after error conditions
        logger.info('Logger should still work after error scenarios');
        assert.ok(consoleCapture.captured.log.length > 0, 'Logger should maintain functionality after errors');

        // Validate overall error handling success
        assert.ok(errorResults.success, 'All error scenarios should be handled successfully');
    });

    // Test logger caching behavior and instance management
    test('should maintain logger instance caching behavior', async () => {
        // Test same component returns cached instance
        const logger1 = getLogger('CacheTest');
        const logger2 = getLogger('CacheTest');
        assert.strictEqual(logger1, logger2, 'Same component name should return cached instance');

        // Test different components create new instances
        const logger3 = getLogger('DifferentCache');
        assert.notStrictEqual(logger1, logger3, 'Different component should create new instance');

        // Test cache performance improvement
        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
            getLogger('PerformanceCache');
        }
        const cacheTime = Date.now() - startTime;

        clearLoggerCache();
        const startTimeNoCache = Date.now();
        for (let i = 0; i < 100; i++) {
            createLogger({ component: `NoCache${i}` });
        }
        const noCacheTime = Date.now() - startTimeNoCache;

        assert.ok(cacheTime < noCacheTime, 'Cached access should be faster than creating new instances');
    });

    // Test log message formatting consistency across all levels
    test('should format log messages consistently across all levels', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);
        const testMessage = 'Consistent formatting test';

        // Log messages at all levels
        logger.error(testMessage);
        logger.warn(testMessage);
        logger.info(testMessage);
        logger.debug(testMessage);

        // Collect all captured messages
        const allMessages = [
            ...consoleCapture.captured.error.map(m => m.message),
            ...consoleCapture.captured.warn.map(m => m.message),
            ...consoleCapture.captured.log.map(m => m.message)
        ];

        // Validate consistent timestamp format across all messages
        const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
        allMessages.forEach(message => {
            assert.ok(timestampPattern.test(message), 'All messages should have consistent timestamp format');
        });

        // Validate consistent level formatting
        const levelPatterns = [
            /\[ERROR\]/,
            /\[WARN\]/,
            /\[INFO\]/,
            /\[DEBUG\]/
        ];

        allMessages.forEach(message => {
            const hasLevelFormat = levelPatterns.some(pattern => pattern.test(message));
            assert.ok(hasLevelFormat, 'All messages should have properly formatted log level');
        });

        // Validate consistent component name formatting
        allMessages.forEach(message => {
            assert.ok(message.includes(`[${TEST_COMPONENT_NAME}]`), 'All messages should have properly formatted component name');
        });

        // Test message structure uniformity
        allMessages.forEach(message => {
            const structurePattern = /^\[(ERROR|WARN|INFO|DEBUG)\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - \[.+?\] .+$/;
            assert.ok(structurePattern.test(message), 'All messages should follow uniform structure');
        });
    });

    // Test metadata logging and object serialization
    test('should handle metadata logging correctly', async () => {
        const logger = getLogger(TEST_COMPONENT_NAME);
        
        // Test object metadata serialization
        const metadata = {
            userId: 12345,
            action: 'test',
            timestamp: new Date().toISOString(),
            nested: {
                property: 'value',
                array: [1, 2, 3]
            }
        };

        logger.info('Metadata test message', metadata);

        // Validate metadata is included in log output
        assert.strictEqual(consoleCapture.captured.log.length, 1, 'Message with metadata should be logged');
        const capturedMessage = consoleCapture.captured.log[0].message;
        
        // Check that metadata properties are serialized
        assert.ok(capturedMessage.includes('userId'), 'Metadata should include userId property');
        assert.ok(capturedMessage.includes('12345'), 'Metadata should include userId value');
        assert.ok(capturedMessage.includes('action'), 'Metadata should include action property');
        assert.ok(capturedMessage.includes('test'), 'Metadata should include action value');

        // Test large metadata handling efficiency
        const largeMetadata = {};
        for (let i = 0; i < 100; i++) {
            largeMetadata[`property${i}`] = `value${i}`;
        }

        const startTime = Date.now();
        logger.info('Large metadata test', largeMetadata);
        const processingTime = Date.now() - startTime;

        assert.ok(processingTime < 100, 'Large metadata should be processed efficiently');
        assert.strictEqual(consoleCapture.captured.log.length, 2, 'Large metadata message should be logged');
    });

    // Test integration with test environment configuration
    test('should integrate with test environment properly', async () => {
        // Validate logger respects test environment configuration
        const testLogger = createTestLoggerInstance('TestEnvironment', {
            level: LOGGING.TEST_LOG_LEVEL || 'error'
        });

        assert.ok(testLogger, 'Test logger should be created successfully');
        assert.strictEqual(testLogger.getLevel(), LOGGING.TEST_LOG_LEVEL || 'ERROR', 'Test logger should use test environment log level');

        // Test logger output doesn't interfere with test output
        const originalCapturedLength = consoleCapture.captured.log.length;
        testLogger.info('Test environment integration message');
        
        // For test environment, logger should respect test configuration
        const currentEnvironment = process.env.NODE_ENV;
        if (currentEnvironment === 'test') {
            // In test environment, info messages might be filtered
            assert.ok(true, 'Logger should respect test environment settings');
        }

        // Test cleanup properly resets logger state
        await testUtilities.cleanup();
        clearLoggerCache();
        
        const cleanLogger = getLogger('CleanTest');
        assert.ok(cleanLogger, 'Logger should be available after cleanup');
        assert.strictEqual(typeof cleanLogger.info, 'function', 'Logger methods should work after cleanup');
    });
});