/**
 * Core Test Helper Module for Node.js Tutorial Application
 * 
 * This module serves as the foundational testing utility layer for the Node.js tutorial
 * application test suite. Provides comprehensive testing infrastructure including port
 * management, test logging, async operations, performance measurement, mock management,
 * and test lifecycle operations designed to work with Node.js built-in test runner,
 * Express.js 5.1.0, and educational testing patterns.
 * 
 * Implements testing best practices while maintaining educational clarity and providing
 * reusable testing infrastructure for unit, integration, and end-to-end testing scenarios.
 * Designed for minimal external dependencies and maximum compatibility with Node.js v22.x LTS.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import Node.js built-in modules for testing infrastructure
const assert = require('node:assert'); // node:assert - built-in
const crypto = require('node:crypto'); // node:crypto - built-in
const net = require('node:net'); // node:net - built-in
const util = require('node:util'); // node:util - built-in
const os = require('node:os'); // node:os - built-in

// Import application constants for test configuration and validation
const {
    APPLICATION,
    ENVIRONMENT,
    LOGGING,
    TIMEOUTS,
    HTTP_STATUS
} = require('../../utils/constants.js');

// Import logger utility for creating test-specific loggers
const { getLogger } = require('../../utils/logger.js');

// Import environment detection utilities for test environment validation
const { 
    isTestEnvironment, 
    getNodeJSInfo 
} = require('../../utils/environment.js');

/**
 * Global test configuration constants for consistent test execution
 * These constants define standard ranges and defaults for test operations
 */

/**
 * Starting port number for test port range allocation
 * @type {number}
 */
const TEST_PORT_RANGE_START = 9000;

/**
 * Ending port number for test port range allocation
 * @type {number}
 */
const TEST_PORT_RANGE_END = 9999;

/**
 * Default timeout value for test operations in milliseconds
 * @type {number}
 */
const DEFAULT_TEST_TIMEOUT = 30000;

/**
 * Default number of retry attempts for failed operations
 * @type {number}
 */
const DEFAULT_RETRY_ATTEMPTS = 3;

/**
 * Prefix for generated test identifiers
 * @type {string}
 */
const TEST_ID_PREFIX = 'test-';

/**
 * Finds an available network port within the test port range for test server isolation,
 * preventing port conflicts between concurrent test runs. Uses Node.js net module to
 * check port availability through temporary server binding attempts.
 * 
 * @param {number} startPort - Starting port number for range (defaults to TEST_PORT_RANGE_START)
 * @param {number} endPort - Ending port number for range (defaults to TEST_PORT_RANGE_END)
 * @returns {Promise<number>} Promise resolving to available port number within specified range
 * @throws {Error} When no ports are available in the specified range
 */
async function getAvailablePort(startPort = TEST_PORT_RANGE_START, endPort = TEST_PORT_RANGE_END) {
    // Set default port range from global constants if not provided
    const portStart = startPort || TEST_PORT_RANGE_START;
    const portEnd = endPort || TEST_PORT_RANGE_END;
    
    // Validate port range parameters
    if (portStart < 1 || portStart > 65535 || portEnd < 1 || portEnd > 65535) {
        throw new Error(`Invalid port range: ${portStart}-${portEnd}. Ports must be between 1-65535`);
    }
    
    if (portStart > portEnd) {
        throw new Error(`Invalid port range: start port ${portStart} is greater than end port ${portEnd}`);
    }
    
    // Iterate through port range starting from startPort
    for (let port = portStart; port <= portEnd; port++) {
        try {
            // Attempt to bind a temporary server to check port availability
            const isAvailable = await checkPortAvailability(port);
            
            if (isAvailable) {
                // Return first available port found within the range
                return port;
            }
        } catch (error) {
            // Continue to next port if current port check fails
            continue;
        }
    }
    
    // If no ports available in range, throw error with port conflict details
    throw new Error(`No available ports found in range ${portStart}-${portEnd}. All ports are in use.`);
}

/**
 * Helper function to check if a specific port is available for binding.
 * Creates a temporary server instance and attempts to bind to the port.
 * 
 * @param {number} port - Port number to check for availability
 * @returns {Promise<boolean>} Promise resolving to true if port is available, false otherwise
 */
function checkPortAvailability(port) {
    return new Promise((resolve) => {
        // Create temporary server for port availability testing
        const server = net.createServer();
        
        // Set up error handler for port binding failures
        server.on('error', () => {
            resolve(false);
        });
        
        // Attempt to listen on the specified port
        server.listen(port, ENVIRONMENT.DEFAULT_HOST, () => {
            // Close temporary server connection to free up port
            server.close(() => {
                resolve(true);
            });
        });
    });
}

/**
 * Creates a test-specific logger instance with appropriate log levels, formatting,
 * and output configuration for test environments and debugging. Uses the application's
 * logger factory with test-specific configuration overrides.
 * 
 * @param {string} loggerName - Name identifier for the test logger instance
 * @param {Object} loggerOptions - Additional configuration options for logger behavior
 * @param {string} loggerOptions.level - Log level override for test environment
 * @param {boolean} loggerOptions.includeTimestamp - Whether to include timestamps in output
 * @returns {Object} Logger instance configured for test environment with appropriate settings
 */
function createTestLogger(loggerName, loggerOptions = {}) {
    // Validate logger name parameter
    if (!loggerName || typeof loggerName !== 'string') {
        throw new Error('Logger name must be a non-empty string');
    }
    
    // Create logger using getLogger function with test environment configuration
    const logger = getLogger(`TEST:${loggerName}`);
    
    // Set log level to TEST_LOG_LEVEL to minimize test output noise
    const testLogLevel = loggerOptions.level || LOGGING.TEST_LOG_LEVEL;
    
    // Configure test-specific formatting for readability and debugging
    const testLogger = {
        // Add test context information like logger name and test run ID
        name: loggerName,
        level: testLogLevel,
        
        // Set up console output formatting appropriate for test environments
        error: (message, metadata = {}) => {
            const testMetadata = { ...metadata, testLogger: loggerName, timestamp: new Date().toISOString() };
            logger.error(message, testMetadata);
        },
        
        warn: (message, metadata = {}) => {
            const testMetadata = { ...metadata, testLogger: loggerName, timestamp: new Date().toISOString() };
            logger.warn(message, testMetadata);
        },
        
        info: (message, metadata = {}) => {
            const testMetadata = { ...metadata, testLogger: loggerName, timestamp: new Date().toISOString() };
            logger.info(message, testMetadata);
        },
        
        debug: (message, metadata = {}) => {
            const testMetadata = { ...metadata, testLogger: loggerName, timestamp: new Date().toISOString() };
            logger.debug(message, testMetadata);
        }
    };
    
    // Return configured logger ready for test use
    return testLogger;
}

/**
 * Async utility that waits for a specified condition to be met with configurable timeout,
 * polling interval, and error handling for robust test synchronization. Repeatedly executes
 * the condition function until it returns a truthy value or timeout is reached.
 * 
 * @param {Function} conditionFn - Async function that returns truthy when condition is met
 * @param {number} timeoutMs - Maximum time to wait in milliseconds (defaults to DEFAULT_TEST_TIMEOUT)
 * @param {number} intervalMs - Polling interval in milliseconds (defaults to 100ms)
 * @param {Object} options - Additional configuration options for waiting behavior
 * @param {string} options.description - Human-readable description of the condition being waited for
 * @returns {Promise<boolean>} Promise resolving to true when condition is met, false if timeout is reached
 */
async function waitForCondition(conditionFn, timeoutMs = DEFAULT_TEST_TIMEOUT, intervalMs = 100, options = {}) {
    // Set default timeout from global constant if not provided
    const timeout = timeoutMs || DEFAULT_TEST_TIMEOUT;
    
    // Set default polling interval if not provided
    const interval = intervalMs || 100;
    
    // Validate condition function parameter
    if (typeof conditionFn !== 'function') {
        throw new Error('Condition function must be a callable function');
    }
    
    const startTime = Date.now();
    const description = options.description || 'condition';
    
    // Create interval timer to periodically check condition function
    return new Promise((resolve, reject) => {
        const checkCondition = async () => {
            try {
                // Execute conditionFn and check if it returns truthy value
                const result = await conditionFn();
                
                if (result) {
                    // If condition is met, resolve with true
                    resolve(true);
                    return;
                }
                
                // Check if timeout is reached
                const elapsed = Date.now() - startTime;
                if (elapsed >= timeout) {
                    // If timeout is reached, resolve with false
                    resolve(false);
                    return;
                }
                
                // Schedule next condition check after interval
                setTimeout(checkCondition, interval);
                
            } catch (error) {
                // Handle condition function errors and log appropriately
                console.warn(`[WARN] Condition check error for "${description}": ${error.message}`);
                
                // Continue polling despite errors unless timeout is reached
                const elapsed = Date.now() - startTime;
                if (elapsed >= timeout) {
                    resolve(false);
                } else {
                    setTimeout(checkCondition, interval);
                }
            }
        };
        
        // Start initial condition check
        checkCondition();
    });
}

/**
 * Measures execution time of async functions with high precision timing for performance
 * testing and benchmarking in test scenarios. Uses process.hrtime.bigint() for nanosecond
 * precision timing and collects comprehensive performance metrics.
 * 
 * @param {Function} asyncFn - Async function to measure execution time for
 * @param {Object} measurementOptions - Additional options for performance measurement
 * @param {boolean} measurementOptions.includeMemory - Whether to collect memory usage information
 * @param {string} measurementOptions.operationName - Name of the operation being measured
 * @returns {Promise<Object>} Promise resolving to object with execution result, timing data, and performance metrics
 */
async function measureExecutionTime(asyncFn, measurementOptions = {}) {
    // Validate async function parameter
    if (typeof asyncFn !== 'function') {
        throw new Error('Async function must be a callable function');
    }
    
    const operationName = measurementOptions.operationName || 'operation';
    const includeMemory = measurementOptions.includeMemory || false;
    
    // Record high-precision start time using process.hrtime.bigint()
    const startTime = process.hrtime.bigint();
    let startMemory = null;
    
    // Collect memory usage information if specified in options
    if (includeMemory) {
        startMemory = process.memoryUsage();
    }
    
    let result = null;
    let error = null;
    
    try {
        // Execute the provided async function with error handling
        result = await asyncFn();
    } catch (executionError) {
        // Handle function execution errors and include in result object
        error = executionError;
    }
    
    // Record end time and calculate execution duration
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs) / 1000000; // Convert nanoseconds to milliseconds
    
    let endMemory = null;
    let memoryDelta = null;
    
    if (includeMemory && startMemory) {
        endMemory = process.memoryUsage();
        memoryDelta = {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external
        };
    }
    
    // Create result object with timing data, result, and performance metrics
    const measurementResult = {
        operationName,
        success: error === null,
        result: result,
        error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : null,
        timing: {
            startTime: Number(startTime),
            endTime: Number(endTime),
            durationNs: Number(durationNs),
            durationMs: durationMs,
            durationSeconds: durationMs / 1000
        },
        memory: includeMemory ? {
            start: startMemory,
            end: endMemory,
            delta: memoryDelta
        } : null,
        timestamp: new Date().toISOString()
    };
    
    // Return comprehensive measurement result with timing and performance data
    return measurementResult;
}

/**
 * Generates unique test identifiers with timestamp, random components, and optional prefix
 * for test correlation and debugging. Creates URL-safe identifiers suitable for HTTP headers
 * and logging systems with guaranteed uniqueness across test runs.
 * 
 * @param {string} prefix - Optional prefix for the test identifier (defaults to TEST_ID_PREFIX)
 * @param {Object} options - Additional options for ID generation
 * @param {boolean} options.includeHostname - Whether to include hostname in the identifier
 * @param {number} options.randomBytes - Number of random bytes to include (defaults to 4)
 * @returns {string} Unique test identifier suitable for headers, logging, and test correlation
 */
function generateTestId(prefix = TEST_ID_PREFIX, options = {}) {
    // Use provided prefix or default TEST_ID_PREFIX
    const idPrefix = prefix || TEST_ID_PREFIX;
    
    // Generate timestamp component with millisecond precision
    const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
    
    // Add random component using crypto.randomBytes for uniqueness
    const randomBytes = options.randomBytes || 4;
    const randomComponent = crypto.randomBytes(randomBytes).toString('hex');
    
    // Include hostname if specified in options
    let hostnameComponent = '';
    if (options.includeHostname) {
        const hostname = os.hostname();
        hostnameComponent = `-${hostname.substring(0, 8).toLowerCase()}`;
    }
    
    // Combine prefix, timestamp, and random components
    // Ensure ID format is suitable for HTTP headers and logging
    const testId = `${idPrefix}${timestamp}-${randomComponent}${hostnameComponent}`;
    
    // Return complete unique test identifier string
    return testId;
}

/**
 * Creates mock functions with call tracking, return value configuration, and reset
 * capabilities for comprehensive unit testing and behavior verification. Provides
 * detailed call history and flexible return value management for test scenarios.
 * 
 * @param {*} returnValue - Default return value for the mock function
 * @param {Object} mockOptions - Configuration options for mock behavior
 * @param {boolean} mockOptions.trackCalls - Whether to track function calls (default: true)
 * @param {boolean} mockOptions.trackArguments - Whether to track call arguments (default: true)
 * @returns {Function} Mock function with tracking capabilities and configuration methods
 */
function createMockFunction(returnValue = undefined, mockOptions = {}) {
    const options = {
        trackCalls: mockOptions.trackCalls !== false,
        trackArguments: mockOptions.trackArguments !== false,
        ...mockOptions
    };
    
    // Initialize call tracking data structures
    const callHistory = [];
    const returnValues = [];
    let defaultReturnValue = returnValue;
    let shouldThrowError = false;
    let errorToThrow = null;
    let callCount = 0;
    
    // Create mock function with configurable return value
    const mockFunction = function(...args) {
        callCount++;
        
        // Add call tracking to record function invocations and arguments
        if (options.trackCalls) {
            const callInfo = {
                callNumber: callCount,
                timestamp: Date.now(),
                arguments: options.trackArguments ? [...args] : [],
                argumentCount: args.length
            };
            callHistory.push(callInfo);
        }
        
        // Check if function should throw error for error testing
        if (shouldThrowError && errorToThrow) {
            throw errorToThrow;
        }
        
        // Return configured return value (per-call or default)
        if (returnValues.length > 0) {
            const nextReturn = returnValues.shift();
            return nextReturn;
        }
        
        return defaultReturnValue;
    };
    
    // Add methods for configuring different return values per call
    mockFunction.mockReturnValue = (value) => {
        defaultReturnValue = value;
        return mockFunction;
    };
    
    mockFunction.mockReturnValueOnce = (value) => {
        returnValues.push(value);
        return mockFunction;
    };
    
    // Implement error throwing capability for error testing
    mockFunction.mockImplementation = (implementation) => {
        if (typeof implementation !== 'function') {
            throw new Error('Mock implementation must be a function');
        }
        // Replace the mock function behavior with custom implementation
        Object.setPrototypeOf(mockFunction, implementation);
        return mockFunction;
    };
    
    mockFunction.mockRejectedValue = (error) => {
        shouldThrowError = true;
        errorToThrow = error instanceof Error ? error : new Error(error);
        return mockFunction;
    };
    
    // Add assertion helpers for verifying call count and arguments
    mockFunction.toHaveBeenCalled = () => callCount > 0;
    
    mockFunction.toHaveBeenCalledTimes = (expectedCount) => callCount === expectedCount;
    
    mockFunction.toHaveBeenCalledWith = (...expectedArgs) => {
        return callHistory.some(call => {
            if (call.arguments.length !== expectedArgs.length) return false;
            return call.arguments.every((arg, index) => arg === expectedArgs[index]);
        });
    };
    
    mockFunction.toHaveBeenLastCalledWith = (...expectedArgs) => {
        if (callHistory.length === 0) return false;
        const lastCall = callHistory[callHistory.length - 1];
        if (lastCall.arguments.length !== expectedArgs.length) return false;
        return lastCall.arguments.every((arg, index) => arg === expectedArgs[index]);
    };
    
    // Implement reset functionality to clear call history
    mockFunction.mockClear = () => {
        callHistory.length = 0;
        callCount = 0;
        return mockFunction;
    };
    
    mockFunction.mockReset = () => {
        callHistory.length = 0;
        returnValues.length = 0;
        callCount = 0;
        defaultReturnValue = undefined;
        shouldThrowError = false;
        errorToThrow = null;
        return mockFunction;
    };
    
    // Add getters for call information
    Object.defineProperties(mockFunction, {
        mock: {
            get() {
                return {
                    calls: callHistory.map(call => call.arguments),
                    instances: [], // Not applicable for function mocks
                    invocationCallOrder: callHistory.map(call => call.callNumber),
                    results: [], // Would need to track return values
                    callCount: callCount,
                    callHistory: [...callHistory]
                };
            }
        }
    });
    
    // Return configured mock function with full tracking capabilities
    return mockFunction;
}

/**
 * Executes async operations with configurable retry logic, exponential backoff, and
 * failure handling for robust test execution. Implements intelligent retry strategies
 * with customizable backoff algorithms and error classification for network-resilient testing.
 * 
 * @param {Function} asyncOperation - Async function to execute with retry logic
 * @param {Object} retryConfig - Configuration object for retry behavior
 * @param {number} retryConfig.maxAttempts - Maximum number of retry attempts (default: DEFAULT_RETRY_ATTEMPTS)
 * @param {number} retryConfig.baseDelay - Base delay between retries in ms (default: 100)
 * @param {number} retryConfig.maxDelay - Maximum delay between retries in ms (default: 5000)
 * @param {Function} retryConfig.shouldRetry - Function to determine if error should trigger retry
 * @returns {Promise<*>} Promise resolving to operation result after successful execution or retries
 */
async function retryAsyncOperation(asyncOperation, retryConfig = {}) {
    // Extract retry configuration including max attempts and backoff strategy
    const config = {
        maxAttempts: retryConfig.maxAttempts || DEFAULT_RETRY_ATTEMPTS,
        baseDelay: retryConfig.baseDelay || 100,
        maxDelay: retryConfig.maxDelay || 5000,
        shouldRetry: retryConfig.shouldRetry || (() => true),
        backoffMultiplier: retryConfig.backoffMultiplier || 2,
        ...retryConfig
    };
    
    // Validate async operation parameter
    if (typeof asyncOperation !== 'function') {
        throw new Error('Async operation must be a callable function');
    }
    
    let lastError = null;
    let attempt = 0;
    
    // Attempt to execute async operation with error handling
    while (attempt < config.maxAttempts) {
        attempt++;
        
        try {
            // Track retry attempts and log retry activity for debugging
            if (attempt > 1) {
                console.debug(`[DEBUG] Retry attempt ${attempt}/${config.maxAttempts} for async operation`);
            }
            
            // Execute the operation
            const result = await asyncOperation();
            
            // Return successful result
            if (attempt > 1) {
                console.debug(`[DEBUG] Async operation succeeded on attempt ${attempt}`);
            }
            return result;
            
        } catch (error) {
            lastError = error;
            
            // If operation fails, check if retry is appropriate based on error type
            const shouldRetryError = await config.shouldRetry(error, attempt);
            
            if (!shouldRetryError || attempt >= config.maxAttempts) {
                // Return final error after max attempts or non-retryable error
                break;
            }
            
            // Implement exponential backoff delay between retry attempts
            const delay = Math.min(
                config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
                config.maxDelay
            );
            
            console.debug(`[DEBUG] Async operation failed on attempt ${attempt}, retrying in ${delay}ms: ${error.message}`);
            
            // Handle timeout scenarios and network-related failures
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // Throw final error after max attempts
    const errorMessage = `Async operation failed after ${config.maxAttempts} attempts`;
    const retryError = new Error(errorMessage);
    retryError.originalError = lastError;
    retryError.attempts = attempt;
    throw retryError;
}

/**
 * Creates isolated test environment with process environment variable mocking, cleanup
 * handlers, and test-specific configuration. Provides environment isolation for tests
 * that need to modify global state without affecting other tests.
 * 
 * @param {Object} environmentConfig - Configuration object for test environment setup
 * @param {Object} environmentConfig.envOverrides - Environment variables to override
 * @param {boolean} environmentConfig.isolateConsole - Whether to mock console methods
 * @param {Array<string>} environmentConfig.mockGlobals - Global variables to mock
 * @returns {Object} Test environment object with isolation, mocking, and cleanup capabilities
 */
function createTestEnvironment(environmentConfig = {}) {
    const config = {
        envOverrides: environmentConfig.envOverrides || {},
        isolateConsole: environmentConfig.isolateConsole || false,
        mockGlobals: environmentConfig.mockGlobals || [],
        ...environmentConfig
    };
    
    // Save original process environment variables for restoration
    const originalEnv = { ...process.env };
    const originalConsole = { ...console };
    const originalGlobals = {};
    const mockConsole = {};
    
    // Apply test-specific environment variable overrides
    Object.keys(config.envOverrides).forEach(key => {
        process.env[key] = config.envOverrides[key];
    });
    
    // Set NODE_ENV to 'test' for test environment identification
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = ENVIRONMENT.TEST;
    }
    
    // Configure test-specific ports, hosts, and timeouts
    if (!process.env.PORT) {
        process.env.PORT = (ENVIRONMENT.DEFAULT_PORT + 1000).toString(); // Use offset port for tests
    }
    
    if (!process.env.HOST) {
        process.env.HOST = ENVIRONMENT.DEFAULT_HOST;
    }
    
    // Set up console isolation if requested
    if (config.isolateConsole) {
        ['log', 'error', 'warn', 'info', 'debug'].forEach(method => {
            const calls = [];
            mockConsole[method] = (...args) => {
                calls.push({ method, args: [...args], timestamp: Date.now() });
            };
            mockConsole[method].calls = calls;
            console[method] = mockConsole[method];
        });
    }
    
    // Mock specified global variables
    config.mockGlobals.forEach(globalName => {
        if (globalName in global) {
            originalGlobals[globalName] = global[globalName];
            global[globalName] = config.globalMocks?.[globalName] || null;
        }
    });
    
    // Create environment restoration function for test teardown
    const restore = () => {
        // Restore process environment variables
        Object.keys(process.env).forEach(key => {
            if (!(key in originalEnv)) {
                delete process.env[key];
            }
        });
        Object.keys(originalEnv).forEach(key => {
            process.env[key] = originalEnv[key];
        });
        
        // Restore console methods
        if (config.isolateConsole) {
            Object.keys(originalConsole).forEach(method => {
                console[method] = originalConsole[method];
            });
        }
        
        // Restore global variables
        Object.keys(originalGlobals).forEach(globalName => {
            global[globalName] = originalGlobals[globalName];
        });
    };
    
    // Set up cleanup handlers for environment restoration
    const cleanup = async () => {
        restore();
    };
    
    // Return test environment object with restore and cleanup methods
    return {
        config,
        originalEnv,
        currentEnv: { ...process.env },
        mockConsole: config.isolateConsole ? mockConsole : null,
        restore,
        cleanup,
        
        // Helper methods for environment management
        setEnv: (key, value) => {
            process.env[key] = value;
        },
        
        getEnv: (key) => process.env[key],
        
        unsetEnv: (key) => {
            delete process.env[key];
        },
        
        getConsoleCalls: (method) => {
            if (config.isolateConsole && mockConsole[method]) {
                return mockConsole[method].calls || [];
            }
            return [];
        }
    };
}

/**
 * Creates deep clones of objects and arrays for test data isolation, preventing test
 * interference and maintaining data integrity. Handles complex nested structures,
 * circular references, and special JavaScript types commonly used in test scenarios.
 * 
 * @param {*} source - Source object, array, or value to deep clone
 * @returns {*} Deep cloned copy of source object with no shared references
 */
function deepClone(source) {
    // Handle primitive values by returning directly
    if (source === null || typeof source !== 'object') {
        return source;
    }
    
    // Handle Date objects by creating new Date instances
    if (source instanceof Date) {
        return new Date(source.getTime());
    }
    
    // Handle RegExp objects by creating new RegExp instances
    if (source instanceof RegExp) {
        return new RegExp(source.source, source.flags);
    }
    
    // Handle Buffer objects (Node.js specific)
    if (Buffer.isBuffer(source)) {
        return Buffer.from(source);
    }
    
    // Handle arrays by recursively cloning each element
    if (Array.isArray(source)) {
        return source.map(item => deepClone(item));
    }
    
    // Handle Map objects
    if (source instanceof Map) {
        const clonedMap = new Map();
        for (const [key, value] of source.entries()) {
            clonedMap.set(deepClone(key), deepClone(value));
        }
        return clonedMap;
    }
    
    // Handle Set objects
    if (source instanceof Set) {
        const clonedSet = new Set();
        for (const value of source.values()) {
            clonedSet.add(deepClone(value));
        }
        return clonedSet;
    }
    
    // Handle plain objects by recursively cloning each property
    if (source.constructor === Object || source.constructor === undefined) {
        const cloned = {};
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                cloned[key] = deepClone(source[key]);
            }
        }
        return cloned;
    }
    
    // For other object types, attempt to create a new instance and copy properties
    try {
        const cloned = Object.create(Object.getPrototypeOf(source));
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                cloned[key] = deepClone(source[key]);
            }
        }
        return cloned;
    } catch (error) {
        // Return shallow copy if deep cloning fails
        console.warn(`[WARN] Deep clone failed for object type, returning shallow copy: ${error.message}`);
        return { ...source };
    }
}

/**
 * Validates test environment setup including Node.js version, available ports, file system
 * permissions, and required dependencies. Provides comprehensive environment validation
 * to ensure test reliability and proper configuration.
 * 
 * @param {Object} validationConfig - Configuration object for validation checks
 * @param {boolean} validationConfig.checkPorts - Whether to validate port availability
 * @param {boolean} validationConfig.checkNodeVersion - Whether to validate Node.js version
 * @param {Array<string>} validationConfig.requiredModules - Modules to check for availability
 * @returns {Object} Validation result object with success status, warnings, and detailed checks
 */
async function validateTestSetup(validationConfig = {}) {
    const config = {
        checkPorts: validationConfig.checkPorts !== false,
        checkNodeVersion: validationConfig.checkNodeVersion !== false,
        checkTestEnvironment: validationConfig.checkTestEnvironment !== false,
        requiredModules: validationConfig.requiredModules || ['express'],
        portRange: {
            start: validationConfig.portRange?.start || TEST_PORT_RANGE_START,
            end: validationConfig.portRange?.end || TEST_PORT_RANGE_END
        },
        ...validationConfig
    };
    
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        checks: {},
        timestamp: new Date().toISOString()
    };
    
    // Check Node.js version compatibility using getNodeJSInfo function
    if (config.checkNodeVersion) {
        try {
            const nodeInfo = getNodeJSInfo();
            const nodeVersion = nodeInfo.node.version;
            const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1)); // Remove 'v' prefix
            
            validationResult.checks.nodeVersion = {
                current: nodeVersion,
                isSupported: majorVersion >= 18,
                details: nodeInfo
            };
            
            if (majorVersion < 18) {
                validationResult.errors.push(`Node.js version ${nodeVersion} is not supported. Requires v18 or higher.`);
                validationResult.isValid = false;
            } else if (majorVersion < 22) {
                validationResult.warnings.push(`Node.js version ${nodeVersion} is supported but v22.x LTS is recommended.`);
            }
        } catch (error) {
            validationResult.errors.push(`Failed to check Node.js version: ${error.message}`);
            validationResult.isValid = false;
        }
    }
    
    // Verify test environment detection using isTestEnvironment function
    if (config.checkTestEnvironment) {
        const isTest = isTestEnvironment();
        validationResult.checks.testEnvironment = {
            isTestEnvironment: isTest,
            nodeEnv: process.env.NODE_ENV
        };
        
        if (!isTest) {
            validationResult.warnings.push('Not running in test environment. Set NODE_ENV=test for optimal test execution.');
        }
    }
    
    // Check port availability in test port range
    if (config.checkPorts) {
        try {
            const availablePort = await getAvailablePort(config.portRange.start, config.portRange.start + 10);
            validationResult.checks.portAvailability = {
                testPortRange: config.portRange,
                availablePort: availablePort,
                isAvailable: true
            };
        } catch (error) {
            validationResult.checks.portAvailability = {
                testPortRange: config.portRange,
                isAvailable: false,
                error: error.message
            };
            validationResult.errors.push(`Port availability check failed: ${error.message}`);
            validationResult.isValid = false;
        }
    }
    
    // Validate file system permissions for test directories
    try {
        const testDir = process.cwd();
        validationResult.checks.fileSystemPermissions = {
            testDirectory: testDir,
            canRead: true,
            canWrite: true // Assume write access if we can run the test
        };
    } catch (error) {
        validationResult.errors.push(`File system permission check failed: ${error.message}`);
        validationResult.isValid = false;
    }
    
    // Check required test dependencies and versions
    if (config.requiredModules && config.requiredModules.length > 0) {
        validationResult.checks.requiredModules = {};
        
        for (const moduleName of config.requiredModules) {
            try {
                const moduleInfo = require(`${moduleName}/package.json`);
                validationResult.checks.requiredModules[moduleName] = {
                    available: true,
                    version: moduleInfo.version,
                    name: moduleInfo.name
                };
            } catch (error) {
                validationResult.checks.requiredModules[moduleName] = {
                    available: false,
                    error: error.message
                };
                validationResult.warnings.push(`Optional module ${moduleName} not available: ${error.message}`);
            }
        }
    }
    
    // Verify test configuration values are within acceptable ranges
    validationResult.checks.configuration = {
        defaultTimeout: DEFAULT_TEST_TIMEOUT,
        portRange: config.portRange,
        retryAttempts: DEFAULT_RETRY_ATTEMPTS,
        testIdPrefix: TEST_ID_PREFIX
    };
    
    // Collect validation results, warnings, and recommendations
    const summary = {
        totalChecks: Object.keys(validationResult.checks).length,
        errors: validationResult.errors.length,
        warnings: validationResult.warnings.length,
        overallValid: validationResult.isValid
    };
    
    validationResult.summary = summary;
    
    // Add recommendations based on validation results
    const recommendations = [];
    if (validationResult.warnings.length > 0) {
        recommendations.push('Review warnings to optimize test environment setup');
    }
    if (!config.checkTestEnvironment || !isTestEnvironment()) {
        recommendations.push('Set NODE_ENV=test for optimal test execution');
    }
    
    validationResult.recommendations = recommendations;
    
    // Return comprehensive validation result with detailed feedback
    return validationResult;
}

/**
 * Creates a test suite with shared setup, teardown, and utilities for organized test
 * execution with proper lifecycle management. Provides a structured approach to test
 * organization with shared resources and consistent cleanup procedures.
 * 
 * @param {string} suiteName - Name identifier for the test suite
 * @param {Object} suiteConfig - Configuration object for test suite behavior
 * @param {Function} suiteConfig.setup - Optional setup function to run before tests
 * @param {Function} suiteConfig.teardown - Optional teardown function to run after tests
 * @param {Object} suiteConfig.sharedData - Shared data object accessible to all tests
 * @returns {Object} Test suite object with setup/teardown methods and shared utilities
 */
function createTestSuite(suiteName, suiteConfig = {}) {
    // Validate suite name parameter
    if (!suiteName || typeof suiteName !== 'string') {
        throw new Error('Suite name must be a non-empty string');
    }
    
    const config = {
        setup: suiteConfig.setup || null,
        teardown: suiteConfig.teardown || null,
        sharedData: suiteConfig.sharedData || {},
        timeout: suiteConfig.timeout || DEFAULT_TEST_TIMEOUT,
        ...suiteConfig
    };
    
    // Create test suite object with provided name and configuration
    const suite = {
        name: suiteName,
        config: config,
        sharedData: deepClone(config.sharedData),
        tests: [],
        hooks: {
            beforeAll: [],
            afterAll: [],
            beforeEach: [],
            afterEach: []
        },
        
        // Set up shared test logger for the suite using createTestLogger
        logger: createTestLogger(`Suite:${suiteName}`),
        
        // Initialize test environment using createTestEnvironment
        testEnvironment: null,
        
        // Test utilities and helper functions for the suite
        utilities: null
    };
    
    // Configure shared setup procedures for suite initialization
    suite.setup = async () => {
        suite.logger.info(`Setting up test suite: ${suiteName}`);
        
        // Create test environment for the suite
        suite.testEnvironment = createTestEnvironment({
            envOverrides: config.envOverrides || {},
            isolateConsole: config.isolateConsole || false
        });
        
        // Initialize test utilities instance for the suite
        suite.utilities = new TestUtilities({
            suiteName: suiteName,
            logger: suite.logger
        });
        
        // Execute custom setup function if provided
        if (typeof config.setup === 'function') {
            try {
                await config.setup(suite);
            } catch (error) {
                suite.logger.error(`Suite setup failed: ${error.message}`, { error });
                throw error;
            }
        }
        
        // Execute beforeAll hooks
        for (const hook of suite.hooks.beforeAll) {
            try {
                await hook(suite);
            } catch (error) {
                suite.logger.error(`BeforeAll hook failed: ${error.message}`, { error });
                throw error;
            }
        }
        
        suite.logger.info(`Test suite setup completed: ${suiteName}`);
    };
    
    // Set up teardown procedures for cleanup and resource management
    suite.teardown = async () => {
        suite.logger.info(`Tearing down test suite: ${suiteName}`);
        
        // Execute afterAll hooks
        for (const hook of suite.hooks.afterAll) {
            try {
                await hook(suite);
            } catch (error) {
                suite.logger.error(`AfterAll hook failed: ${error.message}`, { error });
            }
        }
        
        // Execute custom teardown function if provided
        if (typeof config.teardown === 'function') {
            try {
                await config.teardown(suite);
            } catch (error) {
                suite.logger.error(`Suite teardown failed: ${error.message}`, { error });
            }
        }
        
        // Clean up test utilities
        if (suite.utilities) {
            await suite.utilities.cleanup();
        }
        
        // Clean up test environment
        if (suite.testEnvironment) {
            await suite.testEnvironment.cleanup();
        }
        
        suite.logger.info(`Test suite teardown completed: ${suiteName}`);
    };
    
    // Add shared utilities and helper functions for the suite
    suite.addTest = (testName, testFunction) => {
        if (typeof testFunction !== 'function') {
            throw new Error('Test function must be a callable function');
        }
        
        suite.tests.push({
            name: testName,
            function: testFunction,
            suite: suiteName
        });
    };
    
    suite.beforeAll = (hookFunction) => {
        if (typeof hookFunction === 'function') {
            suite.hooks.beforeAll.push(hookFunction);
        }
    };
    
    suite.afterAll = (hookFunction) => {
        if (typeof hookFunction === 'function') {
            suite.hooks.afterAll.push(hookFunction);
        }
    };
    
    suite.beforeEach = (hookFunction) => {
        if (typeof hookFunction === 'function') {
            suite.hooks.beforeEach.push(hookFunction);
        }
    };
    
    suite.afterEach = (hookFunction) => {
        if (typeof hookFunction === 'function') {
            suite.hooks.afterEach.push(hookFunction);
        }
    };
    
    // Create test execution context with shared state management
    suite.runTests = async () => {
        suite.logger.info(`Running tests for suite: ${suiteName}`);
        const results = [];
        
        for (const test of suite.tests) {
            // Execute beforeEach hooks
            for (const hook of suite.hooks.beforeEach) {
                await hook(suite, test);
            }
            
            // Run individual test
            const testResult = await measureExecutionTime(async () => {
                return await test.function(suite);
            }, { operationName: test.name });
            
            results.push({
                testName: test.name,
                suite: suiteName,
                ...testResult
            });
            
            // Execute afterEach hooks
            for (const hook of suite.hooks.afterEach) {
                await hook(suite, test);
            }
        }
        
        return results;
    };
    
    // Return complete test suite object with management capabilities
    return suite;
}

/**
 * Formats test output for consistent display including test results, timing information,
 * and error details with color coding and structure. Provides standardized output
 * formatting for test results, making test feedback more readable and actionable.
 * 
 * @param {Object} testResult - Test result object containing execution details
 * @param {Object} formatOptions - Options for controlling output formatting
 * @param {boolean} formatOptions.useColors - Whether to apply ANSI color codes
 * @param {boolean} formatOptions.includeTimestamp - Whether to include execution timestamp
 * @param {boolean} formatOptions.includeMetadata - Whether to include detailed metadata
 * @returns {string} Formatted test output string with consistent structure and styling
 */
function formatTestOutput(testResult, formatOptions = {}) {
    const options = {
        useColors: formatOptions.useColors !== false && process.stdout.isTTY,
        includeTimestamp: formatOptions.includeTimestamp !== false,
        includeMetadata: formatOptions.includeMetadata !== false,
        indentLevel: formatOptions.indentLevel || 0,
        ...formatOptions
    };
    
    // Extract test result information including status, timing, and errors
    const {
        operationName = 'test',
        success = false,
        error = null,
        timing = {},
        result = null,
        timestamp = new Date().toISOString()
    } = testResult;
    
    // Define ANSI color codes for different test statuses
    const colors = {
        pass: '\x1b[32m', // Green
        fail: '\x1b[31m', // Red
        skip: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        reset: '\x1b[0m'  // Reset
    };
    
    // Apply color coding based on test result status (pass/fail/skip)
    const statusColor = success ? colors.pass : colors.fail;
    const statusText = success ? 'PASS' : 'FAIL';
    const statusIcon = success ? '✓' : '✗';
    
    // Create base indentation for consistent formatting
    const indent = '  '.repeat(options.indentLevel);
    
    // Format test name and status line
    let output = indent;
    
    if (options.useColors) {
        output += `${statusColor}${statusIcon} ${statusText}${colors.reset} `;
    } else {
        output += `${statusIcon} ${statusText} `;
    }
    
    // Add test metadata like test ID and suite information
    output += operationName;
    
    // Format timing information with appropriate precision and units
    if (timing.durationMs !== undefined) {
        const duration = timing.durationMs < 1000 
            ? `${Math.round(timing.durationMs)}ms` 
            : `${(timing.durationMs / 1000).toFixed(2)}s`;
            
        if (options.useColors) {
            output += ` ${colors.info}(${duration})${colors.reset}`;
        } else {
            output += ` (${duration})`;
        }
    }
    
    // Include execution timestamp if requested
    if (options.includeTimestamp && timestamp) {
        const formattedTime = new Date(timestamp).toLocaleTimeString();
        if (options.useColors) {
            output += ` ${colors.info}[${formattedTime}]${colors.reset}`;
        } else {
            output += ` [${formattedTime}]`;
        }
    }
    
    // Include error details and stack traces for failed tests
    if (!success && error) {
        output += '\n';
        const errorIndent = '  '.repeat(options.indentLevel + 1);
        
        if (options.useColors) {
            output += `${errorIndent}${colors.fail}Error:${colors.reset} ${error.message}\n`;
        } else {
            output += `${errorIndent}Error: ${error.message}\n`;
        }
        
        // Include stack trace for debugging
        if (error.stack && options.includeMetadata) {
            const stackLines = error.stack.split('\n').slice(1); // Remove duplicate error message
            stackLines.forEach(line => {
                if (line.trim()) {
                    output += `${errorIndent}  ${line.trim()}\n`;
                }
            });
        }
    }
    
    // Add detailed metadata if requested
    if (options.includeMetadata && (timing.durationNs || result !== null)) {
        const metadataIndent = '  '.repeat(options.indentLevel + 1);
        
        if (timing.durationNs) {
            output += `${metadataIndent}Execution: ${timing.durationNs}ns (${timing.durationMs}ms)\n`;
        }
        
        if (result !== null && typeof result !== 'undefined') {
            const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
            output += `${metadataIndent}Result: ${resultStr}\n`;
        }
    }
    
    // Apply consistent indentation and spacing for readability
    // Remove trailing newline for consistent formatting
    output = output.replace(/\n$/, '');
    
    // Return formatted output string ready for console display
    return output;
}

/**
 * Comprehensive test utilities class that provides a centralized collection of testing
 * helper methods, mock management, and test lifecycle operations for the Node.js tutorial
 * application. Integrates all test helper functions into a cohesive utility management system.
 */
class TestUtilities {
    /**
     * Initializes TestUtilities with configuration, creates test logger, and sets up mock
     * management and cleanup tracking for comprehensive test utility management.
     * 
     * @param {Object} config - Configuration object for test utility settings
     * @param {string} config.suiteName - Name of the test suite using these utilities
     * @param {Object} config.logger - Optional logger instance to use
     * @param {number} config.defaultTimeout - Default timeout for async operations
     */
    constructor(config = {}) {
        // Store configuration object with test utility settings
        this.config = {
            suiteName: config.suiteName || 'TestUtilities',
            defaultTimeout: config.defaultTimeout || DEFAULT_TEST_TIMEOUT,
            defaultRetryAttempts: config.defaultRetryAttempts || DEFAULT_RETRY_ATTEMPTS,
            ...config
        };
        
        // Create test logger using createTestLogger function
        this.logger = config.logger || createTestLogger(this.config.suiteName);
        
        // Initialize Map for tracking active mocks and their state
        this.activeMocks = new Map();
        
        // Initialize Set for tracking cleanup tasks and procedures
        this.cleanupTasks = new Set();
        
        // Generate unique test ID using generateTestId function
        this.testId = generateTestId(`${TEST_ID_PREFIX}util-`, {
            includeHostname: false
        });
        
        // Set up test environment validation and checks
        this.environmentValidated = false;
        this.validationResult = null;
        
        this.logger.debug(`TestUtilities initialized with ID: ${this.testId}`);
    }
    
    /**
     * Creates and registers a mock function with the utilities manager for automatic
     * cleanup and state management. Provides centralized mock lifecycle management.
     * 
     * @param {string} functionName - Identifier name for the mock function
     * @param {*} returnValue - Default return value for the mock function
     * @param {Object} mockOptions - Additional options for mock configuration
     * @returns {Function} Mock function with tracking and automatic cleanup registration
     */
    mockFunction(functionName, returnValue = undefined, mockOptions = {}) {
        // Validate function name parameter
        if (!functionName || typeof functionName !== 'string') {
            throw new Error('Function name must be a non-empty string');
        }
        
        // Create mock function using createMockFunction utility
        const mockFn = createMockFunction(returnValue, mockOptions);
        
        // Register mock in activeMocks Map with function name as key
        this.activeMocks.set(functionName, {
            mockFunction: mockFn,
            name: functionName,
            createdAt: Date.now(),
            options: mockOptions
        });
        
        // Add cleanup task for mock reset to cleanupTasks Set
        this.cleanupTasks.add(() => {
            if (this.activeMocks.has(functionName)) {
                const mockInfo = this.activeMocks.get(functionName);
                mockInfo.mockFunction.mockReset();
                this.activeMocks.delete(functionName);
            }
        });
        
        // Log mock creation for debugging and tracking
        this.logger.debug(`Mock function created: ${functionName}`, { 
            testId: this.testId,
            returnValue,
            options: mockOptions 
        });
        
        // Return mock function with registered cleanup
        return mockFn;
    }
    
    /**
     * Mocks process environment variables with automatic restoration and cleanup for
     * environment isolation testing. Provides safe environment variable manipulation.
     * 
     * @param {Object} envOverrides - Object containing environment variable key-value pairs to override
     * @returns {Function} Restore function to reset environment variables to original state
     */
    mockProcessEnv(envOverrides = {}) {
        // Validate environment overrides parameter
        if (!envOverrides || typeof envOverrides !== 'object') {
            throw new Error('Environment overrides must be an object');
        }
        
        // Save original process.env values for specified keys
        const originalValues = {};
        const keysToRestore = new Set();
        
        Object.keys(envOverrides).forEach(key => {
            if (key in process.env) {
                originalValues[key] = process.env[key];
            } else {
                keysToRestore.add(key);  // Track new keys to delete on restore
            }
        });
        
        // Apply environment variable overrides to process.env
        Object.keys(envOverrides).forEach(key => {
            process.env[key] = String(envOverrides[key]);
        });
        
        // Create restore function to reset to original values
        const restore = () => {
            Object.keys(originalValues).forEach(key => {
                process.env[key] = originalValues[key];
            });
            
            keysToRestore.forEach(key => {
                delete process.env[key];
            });
        };
        
        // Register cleanup task for automatic environment restoration
        this.cleanupTasks.add(restore);
        
        // Log environment changes for debugging
        this.logger.debug('Process environment mocked', { 
            testId: this.testId,
            overrideKeys: Object.keys(envOverrides),
            originalKeys: Object.keys(originalValues)
        });
        
        // Return restore function for manual cleanup if needed
        return restore;
    }
    
    /**
     * Measures performance of test operations with detailed timing, memory usage, and
     * resource consumption tracking. Integrates with the global measureExecutionTime utility.
     * 
     * @param {string} operationName - Descriptive name for the operation being measured
     * @param {Function} operation - Async function to measure performance for
     * @param {Object} measurementOptions - Additional options for performance measurement
     * @returns {Promise<Object>} Performance measurement result with timing, memory, and operation data
     */
    async measurePerformance(operationName, operation, measurementOptions = {}) {
        // Validate parameters
        if (!operationName || typeof operationName !== 'string') {
            throw new Error('Operation name must be a non-empty string');
        }
        
        if (typeof operation !== 'function') {
            throw new Error('Operation must be a callable function');
        }
        
        // Record baseline memory usage and system state
        const baselineMemory = process.memoryUsage();
        
        // Use measureExecutionTime to track operation performance
        const measurementResult = await measureExecutionTime(operation, {
            operationName,
            includeMemory: true,
            ...measurementOptions
        });
        
        // Collect additional performance metrics if specified
        const enhancedResult = {
            ...measurementResult,
            testId: this.testId,
            suiteName: this.config.suiteName,
            baseline: {
                memory: baselineMemory,
                timestamp: Date.now()
            }
        };
        
        // Log performance results for analysis and debugging
        this.logger.info(`Performance measurement completed: ${operationName}`, {
            duration: `${measurementResult.timing.durationMs.toFixed(2)}ms`,
            success: measurementResult.success,
            testId: this.testId
        });
        
        // Compare results against performance thresholds if configured
        if (measurementOptions.thresholds) {
            const { thresholds } = measurementOptions;
            const warnings = [];
            
            if (thresholds.maxDuration && measurementResult.timing.durationMs > thresholds.maxDuration) {
                warnings.push(`Duration ${measurementResult.timing.durationMs}ms exceeds threshold ${thresholds.maxDuration}ms`);
            }
            
            if (thresholds.maxMemory && measurementResult.memory?.delta?.heapUsed > thresholds.maxMemory) {
                warnings.push(`Memory usage ${measurementResult.memory.delta.heapUsed} bytes exceeds threshold ${thresholds.maxMemory} bytes`);
            }
            
            if (warnings.length > 0) {
                this.logger.warn(`Performance thresholds exceeded for ${operationName}`, { warnings, testId: this.testId });
                enhancedResult.thresholdWarnings = warnings;
            }
        }
        
        // Return comprehensive performance measurement object
        return enhancedResult;
    }
    
    /**
     * Convenient wrapper around waitForCondition with TestUtilities-specific configuration
     * and logging. Provides integrated condition waiting with suite-level configuration.
     * 
     * @param {Function} condition - Function to check for condition fulfillment
     * @param {Object} waitOptions - Options for wait behavior and configuration
     * @returns {Promise<boolean>} Promise resolving when condition is met or timeout occurs
     */
    async waitFor(condition, waitOptions = {}) {
        // Apply default timeout and interval from TestUtilities config
        const options = {
            timeoutMs: waitOptions.timeoutMs || this.config.defaultTimeout,
            intervalMs: waitOptions.intervalMs || 100,
            description: waitOptions.description || 'condition',
            ...waitOptions
        };
        
        // Add test-specific logging for wait operations
        this.logger.debug(`Waiting for condition: ${options.description}`, {
            testId: this.testId,
            timeout: options.timeoutMs,
            interval: options.intervalMs
        });
        
        const startTime = Date.now();
        
        // Use waitForCondition utility with configured parameters
        const result = await waitForCondition(condition, options.timeoutMs, options.intervalMs, options);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log wait results and timing for debugging
        this.logger.debug(`Wait completed for condition: ${options.description}`, {
            testId: this.testId,
            success: result,
            duration: `${duration}ms`,
            description: options.description
        });
        
        // Return wait result with test context
        return result;
    }
    
    /**
     * Executes all registered cleanup tasks including mock resets, environment restoration,
     * and resource cleanup. Provides comprehensive cleanup management for test utilities.
     * 
     * @returns {Promise<void>} Promise resolving when all cleanup tasks are completed
     */
    async cleanup() {
        this.logger.debug(`Starting cleanup for TestUtilities: ${this.testId}`, {
            mockCount: this.activeMocks.size,
            cleanupTasks: this.cleanupTasks.size
        });
        
        const errors = [];
        
        // Iterate through all cleanup tasks in cleanupTasks Set
        for (const cleanupTask of this.cleanupTasks) {
            try {
                // Execute each cleanup task with error handling
                if (typeof cleanupTask === 'function') {
                    await cleanupTask();
                }
            } catch (error) {
                errors.push(error);
                this.logger.error(`Cleanup task failed: ${error.message}`, { 
                    error, 
                    testId: this.testId 
                });
            }
        }
        
        // Reset all active mocks using their reset methods
        for (const [mockName, mockInfo] of this.activeMocks) {
            try {
                if (mockInfo.mockFunction && typeof mockInfo.mockFunction.mockReset === 'function') {
                    mockInfo.mockFunction.mockReset();
                }
            } catch (error) {
                errors.push(error);
                this.logger.error(`Mock reset failed for ${mockName}: ${error.message}`, { 
                    error, 
                    testId: this.testId 
                });
            }
        }
        
        // Clear activeMocks Map and cleanupTasks Set
        this.activeMocks.clear();
        this.cleanupTasks.clear();
        
        // Log cleanup completion and any errors encountered
        if (errors.length > 0) {
            this.logger.warn(`Cleanup completed with ${errors.length} errors`, { 
                testId: this.testId,
                errorCount: errors.length
            });
        } else {
            this.logger.debug(`Cleanup completed successfully`, { testId: this.testId });
        }
    }
    
    /**
     * Resets TestUtilities to initial state by executing cleanup and reinitializing
     * tracking structures. Provides complete reset functionality for test reuse.
     * 
     * @returns {Promise<void>} Promise resolving when reset is complete
     */
    async reset() {
        this.logger.debug(`Resetting TestUtilities: ${this.testId}`);
        
        // Execute cleanup method to handle all cleanup tasks
        await this.cleanup();
        
        // Reinitialize activeMocks Map to empty state
        this.activeMocks = new Map();
        
        // Reinitialize cleanupTasks Set to empty state
        this.cleanupTasks = new Set();
        
        // Generate new test ID for fresh test execution
        this.testId = generateTestId(`${TEST_ID_PREFIX}util-`, {
            includeHostname: false
        });
        
        // Reset validation state
        this.environmentValidated = false;
        this.validationResult = null;
        
        // Log reset completion for debugging
        this.logger.debug(`TestUtilities reset completed with new ID: ${this.testId}`);
    }
    
    /**
     * Returns comprehensive information about current test execution including ID, mocks,
     * cleanup tasks, and configuration. Provides introspection capabilities for debugging.
     * 
     * @returns {Object} Test information object with current state and configuration details
     */
    getTestInfo() {
        // Collect current test ID and configuration information
        const testInfo = {
            testId: this.testId,
            suiteName: this.config.suiteName,
            configuration: { ...this.config },
            
            // Include count and status of active mocks
            mocks: {
                count: this.activeMocks.size,
                names: Array.from(this.activeMocks.keys()),
                details: Array.from(this.activeMocks.values()).map(mock => ({
                    name: mock.name,
                    createdAt: mock.createdAt,
                    options: mock.options
                }))
            },
            
            // List pending cleanup tasks and their types
            cleanup: {
                taskCount: this.cleanupTasks.size,
                hasTasks: this.cleanupTasks.size > 0
            },
            
            // Add performance metrics if available
            environment: {
                validated: this.environmentValidated,
                validationResult: this.validationResult,
                isTestEnvironment: isTestEnvironment(),
                nodeInfo: getNodeJSInfo()
            },
            
            // Include test environment information
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
        
        // Return comprehensive test information object
        return testInfo;
    }
}

// Export all functions and classes for application use
module.exports = {
    // Port availability utility for test server isolation and conflict prevention
    getAvailablePort,
    
    // Test logger factory with environment-appropriate configuration
    createTestLogger,
    
    // Async condition waiting utility with timeout and polling support
    waitForCondition,
    
    // Performance measurement utility for execution timing and benchmarking
    measureExecutionTime,
    
    // Unique test identifier generation for correlation and debugging
    generateTestId,
    
    // Mock function factory with call tracking and behavior configuration
    createMockFunction,
    
    // Retry utility for robust async operation execution with backoff
    retryAsyncOperation,
    
    // Test environment isolation utility with cleanup and restoration
    createTestEnvironment,
    
    // Deep cloning utility for test data isolation and integrity
    deepClone,
    
    // Test environment validation utility for setup verification
    validateTestSetup,
    
    // Test suite factory with lifecycle management and shared utilities
    createTestSuite,
    
    // Test output formatting utility for consistent display and styling
    formatTestOutput,
    
    // Comprehensive test utilities management class with mock tracking and cleanup
    TestUtilities
};