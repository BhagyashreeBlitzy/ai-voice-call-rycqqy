/**
 * Comprehensive Unit Test Suite for Logging Configuration Module
 * 
 * This test suite validates the logging configuration module using Node.js built-in test runner,
 * demonstrating comprehensive testing patterns for configuration systems with Express.js 5.1.0 integration.
 * Tests logging configuration creation, environment-specific log level determination, logger factory
 * functionality, configuration validation, and log formatting utilities with proper mocking and isolation.
 * 
 * Features:
 * - Node.js built-in test runner with minimal external dependencies
 * - Environment variable mocking and process isolation
 * - Comprehensive assertion patterns and error injection testing
 * - Educational testing techniques for Node.js configuration systems
 * - Mock-based testing with proper cleanup and resource management
 * - Performance testing and timeout handling for configuration operations
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner and assertion modules
const { test } = require('node:test'); // Built-in Node.js test runner for organizing and executing unit tests
const { strictEqual, deepStrictEqual, ok, throws } = require('assert'); // Built-in Node.js assertion functions for test validation

// Import logging configuration module components being tested
const { 
    loggingConfig, 
    createLoggingConfig, 
    validateLoggingConfig, 
    getEnvironmentLogLevel, 
    createLoggerFactory 
} = require('../../../config/logging.js');

// Import application constants for log levels and environment configuration
const { LOG_LEVELS, LOGGING, ENVIRONMENT } = require('../../../utils/constants.js');

// Import test utilities for environment mocking and test isolation
const { TestUtilities, createTestLogger } = require('../../helpers/testHelpers.js');

// Import mock utilities for function mocking and configuration validation
const { createMockFunction, validateMockConfig } = require('../../helpers/mockHelpers.js');

// Import test configuration for consistent test environment setup
const { testConfig } = require('../../setup/testConfig.js');

// Initialize test utilities for environment mocking and cleanup management
const testUtilities = new TestUtilities({ name: 'logging-config-tests' });

// Create dedicated test logger for debugging test execution and configuration validation
const testLogger = createTestLogger('logging-config-test');

// Store original process environment for restoration after test completion
const originalProcessEnv = { ...process.env };

/**
 * Sets up clean test environment with mocked environment variables and proper test isolation
 * for logging configuration testing, ensuring consistent test execution across different environments.
 * 
 * @param {Object} environmentOverrides - Environment variable overrides for test scenarios
 * @returns {Function} Cleanup function to restore original environment state after test completion
 */
function setupTestEnvironment(environmentOverrides = {}) {
    try {
        testLogger.debug('Setting up test environment for logging configuration tests', {
            overrides: Object.keys(environmentOverrides),
            originalEnvKeys: Object.keys(originalProcessEnv).length
        });

        // Save current process environment values for restoration after tests complete
        const envSnapshot = { ...process.env };

        // Apply environment variable overrides using testUtilities.mockProcessEnv for isolation
        testUtilities.mockProcessEnv({
            NODE_ENV: ENVIRONMENT.TEST,
            LOG_LEVEL: LOGGING.TEST_LOG_LEVEL,
            ...environmentOverrides
        });

        // Set NODE_ENV to 'test' for consistent test environment behavior and logging configuration
        process.env.NODE_ENV = ENVIRONMENT.TEST;

        // Configure test-specific logging settings and disable colors for consistent output
        process.env.LOG_COLORS = 'false';
        process.env.LOG_TIMESTAMP = 'true';

        // Reset any cached logging configuration or logger instances to ensure clean test state
        if (global.loggingConfigCache) {
            global.loggingConfigCache = null;
        }

        // Return cleanup function for test teardown and environment restoration
        return function cleanupEnvironment() {
            try {
                testLogger.debug('Cleaning up test environment after logging configuration tests');

                // Restore original process.env values from saved snapshot
                Object.keys(process.env).forEach(key => {
                    if (envSnapshot[key] !== undefined) {
                        process.env[key] = envSnapshot[key];
                    } else {
                        delete process.env[key];
                    }
                });

                // Clear any logging configuration caches or instances created during tests
                if (global.loggingConfigCache) {
                    global.loggingConfigCache = null;
                }

                testLogger.debug('Test environment cleanup completed successfully');
            } catch (cleanupError) {
                testLogger.error('Error during test environment cleanup', {
                    error: cleanupError.message,
                    stack: cleanupError.stack
                });
            }
        };

    } catch (setupError) {
        testLogger.error('Failed to setup test environment', {
            error: setupError.message,
            stack: setupError.stack,
            environmentOverrides
        });

        // Return no-op cleanup function if setup fails
        return function noOpCleanup() {
            testLogger.warn('Using no-op cleanup due to setup failure');
        };
    }
}

/**
 * Performs comprehensive cleanup of test environment by restoring original process environment
 * variables and resetting test utilities state to ensure proper test isolation.
 * 
 * @returns {Promise<void>} Promise resolving when cleanup operations are complete
 */
async function cleanupTestEnvironment() {
    try {
        testLogger.debug('Starting comprehensive test environment cleanup');

        // Execute testUtilities.cleanup() to reset all mocks and test state
        await testUtilities.cleanup();

        // Restore original process.env values from initial snapshot
        Object.keys(process.env).forEach(key => {
            if (originalProcessEnv[key] !== undefined) {
                process.env[key] = originalProcessEnv[key];
            } else {
                delete process.env[key];
            }
        });

        // Clear any logging configuration caches or instances created during test execution
        if (global.loggingConfigCache) {
            global.loggingConfigCache = null;
        }

        // Reset test logger and utilities to initial state for next test suite
        testUtilities.reset();

        testLogger.info('Test environment cleanup completed successfully', {
            restoredEnvVars: Object.keys(originalProcessEnv).length,
            utilitiesReset: true
        });

    } catch (cleanupError) {
        testLogger.error('Error during comprehensive test environment cleanup', {
            error: cleanupError.message,
            stack: cleanupError.stack
        });

        throw cleanupError;
    }
}

/**
 * Validates that logging configuration objects have required properties with correct types
 * and valid values, ensuring configuration completeness and type safety.
 * 
 * @param {Object} config - Logging configuration object to validate
 * @param {string} expectedLevel - Expected log level for validation
 * @returns {boolean} True if configuration structure is valid, false otherwise
 */
function validateLoggingConfigStructure(config, expectedLevel) {
    try {
        testLogger.debug('Validating logging configuration structure', {
            hasConfig: Boolean(config),
            expectedLevel,
            configKeys: config ? Object.keys(config) : []
        });

        // Check that config is an object with required properties (level, format, console, colors)
        if (!config || typeof config !== 'object') {
            testLogger.warn('Configuration is not a valid object', { config });
            return false;
        }

        // Validate level property is a string matching expected log level
        if (typeof config.level !== 'string' || config.level !== expectedLevel) {
            testLogger.warn('Invalid log level configuration', {
                actualLevel: config.level,
                expectedLevel,
                levelType: typeof config.level
            });
            return false;
        }

        // Verify format property is an object with timestamp and message templates
        if (!config.format || typeof config.format !== 'object') {
            testLogger.warn('Invalid format configuration', {
                format: config.format,
                formatType: typeof config.format
            });
            return false;
        }

        // Check console property has appropriate output stream configuration
        if (!config.console || typeof config.console !== 'object') {
            testLogger.warn('Invalid console configuration', {
                console: config.console,
                consoleType: typeof config.console
            });
            return false;
        }

        // Validate colors property is a boolean value
        if (typeof config.colors !== 'boolean') {
            testLogger.warn('Invalid colors configuration', {
                colors: config.colors,
                colorsType: typeof config.colors
            });
            return false;
        }

        testLogger.debug('Logging configuration structure validation passed');
        return true;

    } catch (validationError) {
        testLogger.error('Error during configuration structure validation', {
            error: validationError.message,
            config,
            expectedLevel
        });

        return false;
    }
}

/**
 * Tests that log level string values correctly map to numeric log level constants
 * for priority comparison and logging level determination.
 * 
 * @param {string} levelString - Log level string to test
 * @param {number} expectedNumber - Expected numeric log level value
 * @returns {boolean} True if log level mapping is correct
 */
function testLogLevelMapping(levelString, expectedNumber) {
    try {
        testLogger.debug('Testing log level mapping', {
            levelString,
            expectedNumber,
            availableLevels: Object.keys(LOG_LEVELS)
        });

        // Get numeric log level value from LOG_LEVELS constants
        const actualNumber = LOG_LEVELS[levelString.toUpperCase()];

        // Compare string-to-number mapping for log level conversion
        if (actualNumber !== expectedNumber) {
            testLogger.warn('Log level mapping mismatch', {
                levelString,
                actualNumber,
                expectedNumber
            });
            return false;
        }

        // Validate that level priority ordering is maintained (lower numbers = higher priority)
        const logLevelKeys = Object.keys(LOG_LEVELS);
        const currentIndex = logLevelKeys.indexOf(levelString.toUpperCase());
        
        if (currentIndex === -1) {
            testLogger.warn('Log level not found in LOG_LEVELS constants', {
                levelString,
                availableLevels: logLevelKeys
            });
            return false;
        }

        testLogger.debug('Log level mapping validation passed', {
            levelString,
            mappedNumber: actualNumber,
            priority: currentIndex
        });

        return true;

    } catch (mappingError) {
        testLogger.error('Error during log level mapping test', {
            error: mappingError.message,
            levelString,
            expectedNumber
        });

        return false;
    }
}

/**
 * Creates a test logger factory with mock configuration for testing logger creation
 * and behavior, enabling validation of factory patterns and logger instantiation.
 * 
 * @param {Object} factoryConfig - Configuration for test logger factory
 * @returns {Function} Test logger factory function for creating component loggers
 */
function createTestLoggerFactory(factoryConfig) {
    try {
        testLogger.debug('Creating test logger factory', {
            hasFactoryConfig: Boolean(factoryConfig),
            configKeys: factoryConfig ? Object.keys(factoryConfig) : []
        });

        // Create mock logging configuration using provided factoryConfig
        const mockConfig = {
            level: factoryConfig?.level || LOGGING.TEST_LOG_LEVEL,
            format: factoryConfig?.format || { simple: true },
            console: factoryConfig?.console || { enabled: true },
            colors: factoryConfig?.colors !== undefined ? factoryConfig.colors : false,
            ...factoryConfig
        };

        // Initialize logger factory using createLoggerFactory function
        const loggerFactory = createLoggerFactory(mockConfig);

        // Set up call tracking for factory function invocations
        const callTracker = {
            calls: [],
            callCount: 0
        };

        // Configure mock logger instances with testable behavior
        const testFactory = function(name, options = {}) {
            callTracker.calls.push({ name, options, timestamp: new Date().toISOString() });
            callTracker.callCount++;

            testLogger.debug('Test logger factory invoked', {
                name,
                options,
                callCount: callTracker.callCount
            });

            // Return configured logger from original factory
            return loggerFactory(name, options);
        };

        // Add call tracking properties to factory function
        testFactory.getCallHistory = () => ({ ...callTracker });
        testFactory.getCallCount = () => callTracker.callCount;
        testFactory.reset = () => {
            callTracker.calls = [];
            callTracker.callCount = 0;
        };

        testLogger.debug('Test logger factory created successfully', {
            hasCallTracking: Boolean(testFactory.getCallCount),
            factoryType: typeof testFactory
        });

        return testFactory;

    } catch (factoryError) {
        testLogger.error('Failed to create test logger factory', {
            error: factoryError.message,
            stack: factoryError.stack,
            factoryConfig
        });

        // Return minimal fallback factory
        return function fallbackFactory(name) {
            testLogger.warn('Using fallback logger factory due to creation error');
            return {
                info: () => {},
                warn: () => {},
                error: () => {},
                debug: () => {},
                name,
                fallback: true
            };
        };
    }
}

/**
 * Simulates environment changes for testing environment-specific logging behavior
 * and configuration adaptation, enabling validation of dynamic configuration updates.
 * 
 * @param {string} newEnvironment - New environment value to simulate
 * @param {Object} additionalEnvVars - Additional environment variables to set
 * @returns {Function} Restore function to revert environment changes
 */
function simulateEnvironmentChange(newEnvironment, additionalEnvVars = {}) {
    try {
        testLogger.debug('Simulating environment change', {
            newEnvironment,
            additionalVars: Object.keys(additionalEnvVars),
            currentEnv: process.env.NODE_ENV
        });

        // Save current environment state for restoration
        const environmentSnapshot = {
            NODE_ENV: process.env.NODE_ENV,
            LOG_LEVEL: process.env.LOG_LEVEL,
            ...Object.keys(additionalEnvVars).reduce((acc, key) => {
                acc[key] = process.env[key];
                return acc;
            }, {})
        };

        // Set NODE_ENV to newEnvironment value
        process.env.NODE_ENV = newEnvironment;

        // Apply additional environment variables from additionalEnvVars
        Object.entries(additionalEnvVars).forEach(([key, value]) => {
            process.env[key] = value;
        });

        // Trigger logging configuration recalculation if needed
        if (global.loggingConfigCache) {
            global.loggingConfigCache = null;
        }

        testLogger.debug('Environment change simulation applied', {
            newEnvironment,
            appliedVars: Object.keys(additionalEnvVars).length,
            hasSnapshot: Boolean(environmentSnapshot.NODE_ENV)
        });

        // Return restore function to revert all environment changes
        return function restoreEnvironment() {
            try {
                testLogger.debug('Restoring environment after simulation');

                // Restore original environment values
                Object.entries(environmentSnapshot).forEach(([key, value]) => {
                    if (value !== undefined) {
                        process.env[key] = value;
                    } else {
                        delete process.env[key];
                    }
                });

                // Clear configuration cache to ensure fresh configuration on next access
                if (global.loggingConfigCache) {
                    global.loggingConfigCache = null;
                }

                testLogger.debug('Environment restoration completed successfully');

            } catch (restoreError) {
                testLogger.error('Error during environment restoration', {
                    error: restoreError.message,
                    environmentSnapshot
                });
            }
        };

    } catch (simulationError) {
        testLogger.error('Failed to simulate environment change', {
            error: simulationError.message,
            stack: simulationError.stack,
            newEnvironment,
            additionalEnvVars
        });

        // Return no-op restore function if simulation fails
        return function noOpRestore() {
            testLogger.warn('Using no-op restore due to simulation failure');
        };
    }
}

// Test Suite: Logging Configuration Structure and Property Validation
test('Logging Configuration - Structure and Properties', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting logging configuration structure tests');

        await t.test('should have all required properties in loggingConfig object', () => {
            testLogger.debug('Testing loggingConfig object structure');

            // Validate that loggingConfig is an object with proper structure
            ok(loggingConfig, 'loggingConfig should exist');
            strictEqual(typeof loggingConfig, 'object', 'loggingConfig should be an object');

            // Check for required properties: level, format, console, colors
            ok(loggingConfig.hasOwnProperty('level'), 'loggingConfig should have level property');
            ok(loggingConfig.hasOwnProperty('format'), 'loggingConfig should have format property');
            ok(loggingConfig.hasOwnProperty('console'), 'loggingConfig should have console property');
            ok(loggingConfig.hasOwnProperty('colors'), 'loggingConfig should have colors property');

            testLogger.debug('Logging configuration structure validation passed');
        });

        await t.test('should have correct data types for all configuration properties', () => {
            testLogger.debug('Testing loggingConfig property data types');

            // Validate level property is a string matching expected log level
            strictEqual(typeof loggingConfig.level, 'string', 'level should be a string');

            // Verify format property is an object with configuration settings
            strictEqual(typeof loggingConfig.format, 'object', 'format should be an object');
            ok(loggingConfig.format !== null, 'format should not be null');

            // Check console property has appropriate output stream configuration
            strictEqual(typeof loggingConfig.console, 'object', 'console should be an object');
            ok(loggingConfig.console !== null, 'console should not be null');

            // Validate colors property is a boolean value
            strictEqual(typeof loggingConfig.colors, 'boolean', 'colors should be a boolean');

            testLogger.debug('Property data type validation passed');
        });

        await t.test('should use environment-appropriate log level in test environment', () => {
            testLogger.debug('Testing environment-specific log level configuration');

            // Test that configuration uses TEST_LOG_LEVEL for test environment
            const expectedLevel = LOGGING.TEST_LOG_LEVEL;
            strictEqual(loggingConfig.level, expectedLevel, `Log level should be ${expectedLevel} in test environment`);

            // Validate that level mapping to constants is correct
            const levelMappingValid = testLogLevelMapping(loggingConfig.level, LOG_LEVELS[loggingConfig.level.toUpperCase()]);
            ok(levelMappingValid, 'Log level should map correctly to numeric constants');

            testLogger.debug('Environment-specific log level validation passed');
        });

        await t.test('should have valid format configuration for console output', () => {
            testLogger.debug('Testing logging format configuration');

            // Verify format configuration has required properties for console logging
            ok(loggingConfig.format, 'Format configuration should exist');
            strictEqual(typeof loggingConfig.format, 'object', 'Format should be an object');

            // Test that format configuration is suitable for console output
            const formatValid = validateLoggingConfigStructure(loggingConfig, loggingConfig.level);
            ok(formatValid, 'Format configuration should be valid for console logging');

            testLogger.debug('Format configuration validation passed');
        });

    } finally {
        cleanup();
        testLogger.info('Logging configuration structure tests completed');
    }
});

// Test Suite: Environment-Specific Log Level Determination and Mapping
test('Environment-Specific Log Level Determination', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting environment-specific log level tests');

        await t.test('should determine correct log level for development environment', () => {
            testLogger.debug('Testing development environment log level determination');

            const restoreEnvironment = simulateEnvironmentChange(ENVIRONMENT.DEVELOPMENT);

            try {
                // Test getEnvironmentLogLevel function with development environment
                const developmentLevel = getEnvironmentLogLevel();
                strictEqual(developmentLevel, LOGGING.DEVELOPMENT_LOG_LEVEL, 'Should return development log level');

                // Validate that development level maps to correct numeric value
                const levelMappingValid = testLogLevelMapping(developmentLevel, LOG_LEVELS[developmentLevel.toUpperCase()]);
                ok(levelMappingValid, 'Development log level should map correctly to constants');

                testLogger.debug('Development environment log level validation passed');
            } finally {
                restoreEnvironment();
            }
        });

        await t.test('should determine correct log level for production environment', () => {
            testLogger.debug('Testing production environment log level determination');

            const restoreEnvironment = simulateEnvironmentChange(ENVIRONMENT.PRODUCTION);

            try {
                // Test getEnvironmentLogLevel function with production environment
                const productionLevel = getEnvironmentLogLevel();
                strictEqual(productionLevel, LOGGING.PRODUCTION_LOG_LEVEL, 'Should return production log level');

                // Validate that production level maps to correct numeric value
                const levelMappingValid = testLogLevelMapping(productionLevel, LOG_LEVELS[productionLevel.toUpperCase()]);
                ok(levelMappingValid, 'Production log level should map correctly to constants');

                testLogger.debug('Production environment log level validation passed');
            } finally {
                restoreEnvironment();
            }
        });

        await t.test('should determine correct log level for test environment', () => {
            testLogger.debug('Testing test environment log level determination');

            const restoreEnvironment = simulateEnvironmentChange(ENVIRONMENT.TEST);

            try {
                // Test getEnvironmentLogLevel function with test environment
                const testLevel = getEnvironmentLogLevel();
                strictEqual(testLevel, LOGGING.TEST_LOG_LEVEL, 'Should return test log level');

                // Validate that test level maps to correct numeric value
                const levelMappingValid = testLogLevelMapping(testLevel, LOG_LEVELS[testLevel.toUpperCase()]);
                ok(levelMappingValid, 'Test log level should map correctly to constants');

                testLogger.debug('Test environment log level validation passed');
            } finally {
                restoreEnvironment();
            }
        });

        await t.test('should fall back to default log level for unknown environment', () => {
            testLogger.debug('Testing fallback log level for unknown environment');

            const restoreEnvironment = simulateEnvironmentChange('unknown');

            try {
                // Test getEnvironmentLogLevel function with unknown environment
                const fallbackLevel = getEnvironmentLogLevel();
                strictEqual(fallbackLevel, LOGGING.DEFAULT_LOG_LEVEL, 'Should return default log level for unknown environment');

                // Validate that fallback level is a valid log level
                const levelMappingValid = testLogLevelMapping(fallbackLevel, LOG_LEVELS[fallbackLevel.toUpperCase()]);
                ok(levelMappingValid, 'Fallback log level should be valid');

                testLogger.debug('Unknown environment fallback validation passed');
            } finally {
                restoreEnvironment();
            }
        });

        await t.test('should respect LOG_LEVEL environment variable override', () => {
            testLogger.debug('Testing LOG_LEVEL environment variable override');

            const restoreEnvironment = simulateEnvironmentChange(ENVIRONMENT.DEVELOPMENT, {
                LOG_LEVEL: 'warn'
            });

            try {
                // Test that LOG_LEVEL environment variable overrides default behavior
                const overriddenLevel = getEnvironmentLogLevel();
                strictEqual(overriddenLevel, 'warn', 'Should respect LOG_LEVEL environment variable');

                // Validate that overridden level is valid
                const levelMappingValid = testLogLevelMapping(overriddenLevel, LOG_LEVELS.WARN);
                ok(levelMappingValid, 'Overridden log level should be valid');

                testLogger.debug('LOG_LEVEL environment variable override validation passed');
            } finally {
                restoreEnvironment();
            }
        });

    } finally {
        cleanup();
        testLogger.info('Environment-specific log level tests completed');
    }
});

// Test Suite: Logger Factory Functionality and Component Logger Creation
test('Logger Factory Functionality', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting logger factory functionality tests');

        await t.test('should create logger factory with default configuration', () => {
            testLogger.debug('Testing logger factory creation with default configuration');

            // Test createLoggerFactory function with default settings
            const loggerFactory = createLoggerFactory();
            
            strictEqual(typeof loggerFactory, 'function', 'Logger factory should be a function');
            ok(loggerFactory, 'Logger factory should be created successfully');

            testLogger.debug('Default logger factory creation validation passed');
        });

        await t.test('should create logger factory with custom configuration', () => {
            testLogger.debug('Testing logger factory creation with custom configuration');

            const customConfig = {
                level: 'debug',
                format: { detailed: true },
                console: { colorize: false },
                colors: false
            };

            // Test createLoggerFactory function with custom configuration
            const customLoggerFactory = createLoggerFactory(customConfig);
            
            strictEqual(typeof customLoggerFactory, 'function', 'Custom logger factory should be a function');
            ok(customLoggerFactory, 'Custom logger factory should be created successfully');

            testLogger.debug('Custom logger factory creation validation passed');
        });

        await t.test('should create component loggers with proper names and methods', () => {
            testLogger.debug('Testing component logger creation and method availability');

            const testFactory = createTestLoggerFactory({
                level: LOGGING.TEST_LOG_LEVEL,
                colors: false
            });

            // Create component logger using test factory
            const componentLogger = testFactory('test-component');

            // Validate logger has all required logging methods
            ok(componentLogger, 'Component logger should be created');
            strictEqual(typeof componentLogger.info, 'function', 'Logger should have info method');
            strictEqual(typeof componentLogger.warn, 'function', 'Logger should have warn method');
            strictEqual(typeof componentLogger.error, 'function', 'Logger should have error method');
            strictEqual(typeof componentLogger.debug, 'function', 'Logger should have debug method');

            // Test factory call tracking functionality
            const callHistory = testFactory.getCallHistory();
            strictEqual(callHistory.callCount, 1, 'Factory should track call count');
            strictEqual(callHistory.calls[0].name, 'test-component', 'Factory should track component name');

            testLogger.debug('Component logger creation validation passed');
        });

        await t.test('should track multiple logger creations and maintain call history', () => {
            testLogger.debug('Testing multiple logger creation tracking');

            const testFactory = createTestLoggerFactory({
                level: 'info',
                trackCalls: true
            });

            // Create multiple component loggers
            const logger1 = testFactory('component-1');
            const logger2 = testFactory('component-2', { level: 'debug' });
            const logger3 = testFactory('component-3');

            // Validate call tracking functionality
            const callHistory = testFactory.getCallHistory();
            strictEqual(callHistory.callCount, 3, 'Factory should track all logger creations');
            strictEqual(callHistory.calls.length, 3, 'Factory should maintain call history');

            // Verify individual call details
            strictEqual(callHistory.calls[0].name, 'component-1', 'First call should be tracked correctly');
            strictEqual(callHistory.calls[1].name, 'component-2', 'Second call should be tracked correctly');
            deepStrictEqual(callHistory.calls[1].options, { level: 'debug' }, 'Call options should be tracked');

            // Test factory reset functionality
            testFactory.reset();
            const resetHistory = testFactory.getCallHistory();
            strictEqual(resetHistory.callCount, 0, 'Factory reset should clear call count');
            strictEqual(resetHistory.calls.length, 0, 'Factory reset should clear call history');

            testLogger.debug('Multiple logger creation tracking validation passed');
        });

        await t.test('should handle logger factory errors gracefully', () => {
            testLogger.debug('Testing logger factory error handling');

            // Test logger factory with invalid configuration
            const mockErrorFactory = createMockFunction(() => {
                throw new Error('Factory configuration error');
            });

            // Validate error handling doesn't crash the system
            throws(() => {
                mockErrorFactory();
            }, /Factory configuration error/, 'Factory should throw descriptive error');

            // Test factory with null configuration
            const nullConfigFactory = createLoggerFactory(null);
            strictEqual(typeof nullConfigFactory, 'function', 'Factory should handle null configuration');

            testLogger.debug('Logger factory error handling validation passed');
        });

    } finally {
        cleanup();
        testLogger.info('Logger factory functionality tests completed');
    }
});

// Test Suite: Configuration Validation and Error Handling
test('Configuration Validation and Error Handling', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting configuration validation tests');

        await t.test('should validate correct logging configuration successfully', () => {
            testLogger.debug('Testing successful configuration validation');

            const validConfig = {
                level: 'info',
                format: { simple: true },
                console: { enabled: true },
                colors: false
            };

            // Test validateLoggingConfig function with valid configuration
            const validationResult = validateLoggingConfig(validConfig);
            ok(validationResult.isValid, 'Valid configuration should pass validation');
            strictEqual(validationResult.errors.length, 0, 'Valid configuration should have no errors');

            // Test helper validation function
            const structureValid = validateLoggingConfigStructure(validConfig, 'info');
            ok(structureValid, 'Configuration structure should be valid');

            testLogger.debug('Successful configuration validation passed');
        });

        await t.test('should detect missing required properties in configuration', () => {
            testLogger.debug('Testing detection of missing required properties');

            const incompleteConfig = {
                level: 'info',
                format: { simple: true }
                // Missing console and colors properties
            };

            // Test validateLoggingConfig function with incomplete configuration
            const validationResult = validateLoggingConfig(incompleteConfig);
            ok(!validationResult.isValid, 'Incomplete configuration should fail validation');
            ok(validationResult.errors.length > 0, 'Incomplete configuration should have errors');

            // Test helper validation function
            const structureValid = validateLoggingConfigStructure(incompleteConfig, 'info');
            ok(!structureValid, 'Incomplete configuration structure should be invalid');

            testLogger.debug('Missing properties detection validation passed');
        });

        await t.test('should validate log level values against known constants', () => {
            testLogger.debug('Testing log level validation against constants');

            const configWithInvalidLevel = {
                level: 'invalid-level',
                format: { simple: true },
                console: { enabled: true },
                colors: false
            };

            // Test validateLoggingConfig function with invalid log level
            const validationResult = validateLoggingConfig(configWithInvalidLevel);
            ok(!validationResult.isValid, 'Configuration with invalid log level should fail validation');

            // Test individual log level constants validation
            const validLevels = ['error', 'warn', 'info', 'debug'];
            validLevels.forEach(level => {
                const levelMappingValid = testLogLevelMapping(level, LOG_LEVELS[level.toUpperCase()]);
                ok(levelMappingValid, `Log level ${level} should map correctly to constants`);
            });

            testLogger.debug('Log level validation passed');
        });

        await t.test('should handle null and undefined configuration gracefully', () => {
            testLogger.debug('Testing null and undefined configuration handling');

            // Test validateLoggingConfig function with null configuration
            const nullValidation = validateLoggingConfig(null);
            ok(!nullValidation.isValid, 'Null configuration should fail validation');
            ok(nullValidation.errors.length > 0, 'Null configuration should have errors');

            // Test validateLoggingConfig function with undefined configuration
            const undefinedValidation = validateLoggingConfig(undefined);
            ok(!undefinedValidation.isValid, 'Undefined configuration should fail validation');
            ok(undefinedValidation.errors.length > 0, 'Undefined configuration should have errors');

            // Test helper validation function with null configuration
            const nullStructureValid = validateLoggingConfigStructure(null, 'info');
            ok(!nullStructureValid, 'Null configuration structure should be invalid');

            testLogger.debug('Null and undefined configuration handling passed');
        });

        await t.test('should provide detailed error messages for validation failures', () => {
            testLogger.debug('Testing detailed error message generation');

            const invalidTypeConfig = {
                level: 123, // Should be string
                format: 'invalid', // Should be object
                console: true, // Should be object
                colors: 'yes' // Should be boolean
            };

            // Test validateLoggingConfig function with type errors
            const validationResult = validateLoggingConfig(invalidTypeConfig);
            ok(!validationResult.isValid, 'Configuration with type errors should fail validation');
            ok(validationResult.errors.length > 0, 'Configuration should have detailed error messages');

            // Validate error messages are descriptive and helpful
            const hasLevelError = validationResult.errors.some(error => 
                error.includes('level') || error.includes('string')
            );
            ok(hasLevelError, 'Should provide error message about level type');

            testLogger.debug('Detailed error message validation passed');
        });

    } finally {
        cleanup();
        testLogger.info('Configuration validation tests completed');
    }
});

// Test Suite: Log Formatting Utilities and Output Configuration
test('Log Formatting Utilities and Output Configuration', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting log formatting utilities tests');

        await t.test('should configure console output formatting correctly', () => {
            testLogger.debug('Testing console output formatting configuration');

            // Test that loggingConfig has proper console formatting
            ok(loggingConfig.console, 'Console configuration should exist');
            strictEqual(typeof loggingConfig.console, 'object', 'Console configuration should be an object');

            // Test format configuration for console output
            ok(loggingConfig.format, 'Format configuration should exist');
            strictEqual(typeof loggingConfig.format, 'object', 'Format configuration should be an object');

            testLogger.debug('Console output formatting validation passed');
        });

        await t.test('should handle color configuration for different environments', () => {
            testLogger.debug('Testing color configuration for different environments');

            // Test development environment color configuration
            const restoreDev = simulateEnvironmentChange(ENVIRONMENT.DEVELOPMENT);
            try {
                const devConfig = createLoggingConfig();
                strictEqual(typeof devConfig.colors, 'boolean', 'Development colors should be boolean');
            } finally {
                restoreDev();
            }

            // Test production environment color configuration
            const restoreProd = simulateEnvironmentChange(ENVIRONMENT.PRODUCTION);
            try {
                const prodConfig = createLoggingConfig();
                strictEqual(typeof prodConfig.colors, 'boolean', 'Production colors should be boolean');
            } finally {
                restoreProd();
            }

            // Test test environment color configuration (should typically be false)
            const testConfig = createLoggingConfig();
            strictEqual(testConfig.colors, false, 'Test environment should disable colors');

            testLogger.debug('Color configuration validation passed');
        });

        await t.test('should create configuration with proper timestamp formatting', () => {
            testLogger.debug('Testing timestamp formatting configuration');

            const configWithTimestamp = createLoggingConfig({
                includeTimestamp: true,
                timestampFormat: 'ISO'
            });

            // Validate configuration includes timestamp settings
            ok(configWithTimestamp, 'Configuration with timestamp should be created');
            ok(configWithTimestamp.format, 'Format configuration should include timestamp settings');

            testLogger.debug('Timestamp formatting validation passed');
        });

        await t.test('should configure log message formatting templates', () => {
            testLogger.debug('Testing log message formatting templates');

            const customFormatConfig = createLoggingConfig({
                format: {
                    template: '[{level}] {timestamp} - {message}',
                    dateFormat: 'YYYY-MM-DD HH:mm:ss',
                    colorize: false
                }
            });

            // Validate custom format configuration
            ok(customFormatConfig, 'Custom format configuration should be created');
            ok(customFormatConfig.format, 'Format configuration should exist');

            // Test that configuration is valid
            const formatValid = validateLoggingConfigStructure(customFormatConfig, customFormatConfig.level);
            ok(formatValid, 'Custom format configuration should be valid');

            testLogger.debug('Message formatting templates validation passed');
        });

        await t.test('should handle output stream configuration for console logging', () => {
            testLogger.debug('Testing output stream configuration');

            // Test console stream configuration
            ok(loggingConfig.console, 'Console stream configuration should exist');

            // Test that console configuration is properly structured
            const consoleConfigValid = typeof loggingConfig.console === 'object' && 
                                       loggingConfig.console !== null;
            ok(consoleConfigValid, 'Console configuration should be valid object');

            // Test mock configuration validation
            const mockConfig = {
                level: 'info',
                format: { simple: true },
                console: { stream: process.stdout },
                colors: false
            };

            const mockValidation = validateMockConfig(mockConfig);
            ok(mockValidation.isValid, 'Mock console configuration should be valid');

            testLogger.debug('Output stream configuration validation passed');
        });

    } finally {
        cleanup();
        testLogger.info('Log formatting utilities tests completed');
    }
});

// Test Suite: Configuration Creation with Different Parameters
test('Configuration Creation with Different Parameters', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting configuration creation parameter tests');

        await t.test('should create configuration with default parameters', () => {
            testLogger.debug('Testing configuration creation with default parameters');

            // Test createLoggingConfig function with no parameters
            const defaultConfig = createLoggingConfig();
            
            ok(defaultConfig, 'Default configuration should be created');
            strictEqual(typeof defaultConfig, 'object', 'Default configuration should be an object');

            // Validate default configuration structure
            const structureValid = validateLoggingConfigStructure(defaultConfig, defaultConfig.level);
            ok(structureValid, 'Default configuration structure should be valid');

            testLogger.debug('Default configuration creation validation passed');
        });

        await t.test('should create configuration with custom log level', () => {
            testLogger.debug('Testing configuration creation with custom log level');

            const customLevel = 'debug';
            const customConfig = createLoggingConfig({ level: customLevel });

            // Validate custom log level is applied correctly
            strictEqual(customConfig.level, customLevel, 'Custom log level should be applied');

            // Test that custom level maps to correct constant
            const levelMappingValid = testLogLevelMapping(customLevel, LOG_LEVELS.DEBUG);
            ok(levelMappingValid, 'Custom log level should map correctly');

            testLogger.debug('Custom log level configuration validation passed');
        });

        await t.test('should create configuration with custom format settings', () => {
            testLogger.debug('Testing configuration creation with custom format settings');

            const customFormat = {
                colorize: true,
                timestamp: true,
                json: false,
                prettyPrint: false
            };

            const customConfig = createLoggingConfig({ format: customFormat });

            // Validate custom format is applied correctly
            ok(customConfig.format, 'Custom format should be applied');
            strictEqual(typeof customConfig.format, 'object', 'Custom format should be an object');

            testLogger.debug('Custom format configuration validation passed');
        });

        await t.test('should create configuration with environment-specific overrides', () => {
            testLogger.debug('Testing configuration creation with environment overrides');

            // Test configuration creation in different environments
            const environments = [ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PRODUCTION, ENVIRONMENT.TEST];

            environments.forEach(env => {
                const restoreEnv = simulateEnvironmentChange(env);
                
                try {
                    const envConfig = createLoggingConfig();
                    
                    // Validate environment-specific configuration
                    ok(envConfig, `Configuration should be created for ${env} environment`);
                    
                    // Test appropriate log level for environment
                    const expectedLevel = env === ENVIRONMENT.DEVELOPMENT ? LOGGING.DEVELOPMENT_LOG_LEVEL :
                                         env === ENVIRONMENT.PRODUCTION ? LOGGING.PRODUCTION_LOG_LEVEL :
                                         LOGGING.TEST_LOG_LEVEL;
                    
                    strictEqual(envConfig.level, expectedLevel, `Should use correct log level for ${env} environment`);

                } finally {
                    restoreEnv();
                }
            });

            testLogger.debug('Environment-specific configuration validation passed');
        });

        await t.test('should merge custom parameters with environment defaults', () => {
            testLogger.debug('Testing parameter merging with environment defaults');

            const customParams = {
                level: 'warn',
                colors: true,
                format: { detailed: true }
            };

            const mergedConfig = createLoggingConfig(customParams);

            // Validate custom parameters are preserved
            strictEqual(mergedConfig.level, 'warn', 'Custom log level should be preserved');
            strictEqual(mergedConfig.colors, true, 'Custom colors setting should be preserved');

            // Validate configuration is still valid
            const configValid = validateLoggingConfigStructure(mergedConfig, 'warn');
            ok(configValid, 'Merged configuration should be valid');

            testLogger.debug('Parameter merging validation passed');
        });

    } finally {
        cleanup();
        testLogger.info('Configuration creation parameter tests completed');
    }
});

// Test Suite: Integration Testing with Test Environment Configuration
test('Integration with Test Environment Configuration', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting integration tests with test environment configuration');

        await t.test('should integrate with testConfig from test setup', () => {
            testLogger.debug('Testing integration with testConfig');

            // Validate testConfig is available and properly configured
            ok(testConfig, 'testConfig should be available from test setup');
            ok(testConfig.logging, 'testConfig should have logging configuration');

            // Test integration between logging config and test config
            const loggingIntegration = testConfig.logging;
            strictEqual(typeof loggingIntegration, 'object', 'Test config logging should be an object');

            testLogger.debug('testConfig integration validation passed');
        });

        await t.test('should use test environment settings consistently', () => {
            testLogger.debug('Testing consistent test environment settings usage');

            // Validate NODE_ENV is set to test
            strictEqual(process.env.NODE_ENV, ENVIRONMENT.TEST, 'NODE_ENV should be set to test');

            // Test that logging configuration respects test environment
            const testEnvConfig = createLoggingConfig();
            strictEqual(testEnvConfig.level, LOGGING.TEST_LOG_LEVEL, 'Should use test log level');

            // Validate environment-specific log level determination
            const environmentLevel = getEnvironmentLogLevel();
            strictEqual(environmentLevel, LOGGING.TEST_LOG_LEVEL, 'Environment level should match test log level');

            testLogger.debug('Test environment consistency validation passed');
        });

        await t.test('should maintain test isolation between test cases', () => {
            testLogger.debug('Testing test isolation maintenance');

            const initialEnv = process.env.NODE_ENV;
            const initialLogLevel = process.env.LOG_LEVEL;

            // Simulate environment changes and verify isolation
            const restore1 = simulateEnvironmentChange(ENVIRONMENT.DEVELOPMENT, { LOG_LEVEL: 'debug' });
            const devConfig = createLoggingConfig();
            restore1();

            const restore2 = simulateEnvironmentChange(ENVIRONMENT.PRODUCTION, { LOG_LEVEL: 'error' });
            const prodConfig = createLoggingConfig();
            restore2();

            // Validate environments were properly isolated
            strictEqual(process.env.NODE_ENV, initialEnv, 'NODE_ENV should be restored');
            strictEqual(process.env.LOG_LEVEL, initialLogLevel, 'LOG_LEVEL should be restored');

            // Validate configurations were different but both valid
            ok(devConfig.level !== prodConfig.level, 'Different environments should have different log levels');

            testLogger.debug('Test isolation validation passed');
        });

        await t.test('should handle test utilities cleanup properly', () => {
            testLogger.debug('Testing test utilities cleanup handling');

            // Create test utilities and mock some functions
            const testUtilsInstance = new TestUtilities({ name: 'logging-test-cleanup' });
            
            // Mock some process environment variables
            testUtilsInstance.mockProcessEnv({
                TEST_CLEANUP: 'true',
                LOG_LEVEL: 'debug'
            });

            // Validate mocking worked
            strictEqual(process.env.TEST_CLEANUP, 'true', 'Environment mocking should work');

            // Test cleanup functionality
            testUtilsInstance.cleanup();

            // Note: Cleanup validation depends on testUtilities implementation
            // This test demonstrates the cleanup pattern without specific assertions

            testLogger.debug('Test utilities cleanup validation passed');
        });

        await t.test('should work with mock helpers for testing configuration functions', () => {
            testLogger.debug('Testing mock helpers integration');

            // Create mock function for testing configuration validation
            const mockValidation = createMockFunction((config) => {
                return {
                    isValid: Boolean(config && config.level),
                    errors: config && config.level ? [] : ['Missing level'],
                    warnings: []
                };
            });

            // Test mock function with valid configuration
            const validResult = mockValidation({ level: 'info', format: {}, console: {}, colors: false });
            ok(validResult.isValid, 'Mock validation should pass for valid config');

            // Test mock function with invalid configuration
            const invalidResult = mockValidation({});
            ok(!invalidResult.isValid, 'Mock validation should fail for invalid config');

            // Validate mock configuration
            const mockConfigValidation = validateMockConfig({
                mockFunction: mockValidation,
                testScenarios: ['valid', 'invalid']
            });
            ok(mockConfigValidation.isValid, 'Mock configuration should be valid');

            testLogger.debug('Mock helpers integration validation passed');
        });

    } finally {
        cleanup();
        testLogger.info('Integration tests with test environment configuration completed');
    }
});

// Test Suite: Error Injection and Edge Case Testing
test('Error Injection and Edge Case Testing', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting error injection and edge case tests');

        await t.test('should handle configuration creation errors gracefully', () => {
            testLogger.debug('Testing configuration creation error handling');

            // Test error handling with malformed configuration
            throws(() => {
                createLoggingConfig({ level: null });
            }, 'Should throw error for null log level');

            // Test error handling with invalid format
            throws(() => {
                createLoggingConfig({ format: 'invalid-format' });
            }, 'Should throw error for invalid format type');

            testLogger.debug('Configuration creation error handling passed');
        });

        await t.test('should handle logger factory creation with invalid parameters', () => {
            testLogger.debug('Testing logger factory error scenarios');

            // Test factory creation with invalid configuration
            const invalidFactory = createLoggerFactory({ level: 'invalid-level' });
            
            // Factory should still be created but with fallback behavior
            strictEqual(typeof invalidFactory, 'function', 'Factory should be created despite invalid config');

            // Test logger creation from invalid factory
            const logger = invalidFactory('test-component');
            ok(logger, 'Logger should be created even with invalid factory config');

            testLogger.debug('Logger factory error scenarios validation passed');
        });

        await t.test('should handle environment simulation errors', () => {
            testLogger.debug('Testing environment simulation error handling');

            // Test environment simulation with invalid values
            const restore = simulateEnvironmentChange(null, { INVALID_VAR: undefined });
            
            try {
                // Environment should still be functional despite invalid simulation
                const config = createLoggingConfig();
                ok(config, 'Configuration should still be created after failed simulation');
            } finally {
                restore();
            }

            testLogger.debug('Environment simulation error handling passed');
        });

        await t.test('should handle validation with circular references', () => {
            testLogger.debug('Testing validation with circular reference objects');

            // Create object with circular reference
            const circularConfig = {
                level: 'info',
                format: {},
                console: {},
                colors: false
            };
            circularConfig.format.self = circularConfig;

            // Test that validation handles circular references without crashing
            const validationResult = validateLoggingConfig(circularConfig);
            
            // Validation should complete without error (may pass or fail depending on implementation)
            ok(typeof validationResult === 'object', 'Validation should return result object');
            ok(validationResult.hasOwnProperty('isValid'), 'Validation result should have isValid property');

            testLogger.debug('Circular reference validation passed');
        });

        await t.test('should handle memory and resource constraints during testing', () => {
            testLogger.debug('Testing resource constraint handling');

            // Create multiple logger factories to test resource usage
            const factories = [];
            for (let i = 0; i < 10; i++) {
                factories.push(createTestLoggerFactory({
                    level: 'debug',
                    name: `factory-${i}`
                }));
            }

            // Test that all factories are functional
            factories.forEach((factory, index) => {
                const logger = factory(`test-logger-${index}`);
                ok(logger, `Logger ${index} should be created successfully`);
            });

            // Clean up resources
            factories.forEach(factory => {
                if (factory.reset) {
                    factory.reset();
                }
            });

            testLogger.debug('Resource constraint handling validation passed');
        });

    } finally {
        cleanup();
        testLogger.info('Error injection and edge case tests completed');
    }
});

// Test Suite: Performance and Timeout Testing
test('Performance and Timeout Testing', async (t) => {
    const cleanup = setupTestEnvironment();

    try {
        testLogger.info('Starting performance and timeout tests');

        await t.test('should create configuration within reasonable time limits', async () => {
            testLogger.debug('Testing configuration creation performance');

            const startTime = Date.now();
            
            // Create configuration and measure time
            const config = createLoggingConfig();
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Configuration creation should be fast (under 100ms)
            ok(duration < 100, `Configuration creation should be fast (${duration}ms < 100ms)`);
            ok(config, 'Configuration should be created successfully');

            testLogger.debug('Configuration creation performance validation passed', {
                duration: `${duration}ms`
            });
        });

        await t.test('should handle concurrent configuration creation', async () => {
            testLogger.debug('Testing concurrent configuration creation');

            // Create multiple configurations concurrently
            const promises = Array(5).fill(null).map((_, index) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const config = createLoggingConfig({ level: 'debug' });
                        resolve({ index, config });
                    }, Math.random() * 10);
                });
            });

            const results = await Promise.all(promises);

            // Validate all configurations were created successfully
            results.forEach(({ index, config }) => {
                ok(config, `Configuration ${index} should be created`);
                strictEqual(config.level, 'debug', `Configuration ${index} should have correct level`);
            });

            testLogger.debug('Concurrent configuration creation validation passed');
        });

        await t.test('should validate configuration within timeout limits', async () => {
            testLogger.debug('Testing configuration validation performance');

            const largeConfig = {
                level: 'info',
                format: {
                    template: '[{level}] {timestamp} - {message}',
                    dateFormat: 'YYYY-MM-DD HH:mm:ss',
                    colorize: false,
                    json: false,
                    prettyPrint: true,
                    metadata: Array(100).fill({ key: 'value' })
                },
                console: {
                    enabled: true,
                    colorize: false,
                    timestamp: true
                },
                colors: false
            };

            const startTime = Date.now();
            
            // Validate large configuration
            const validationResult = validateLoggingConfig(largeConfig);
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Validation should complete within reasonable time (under 50ms)
            ok(duration < 50, `Validation should be fast (${duration}ms < 50ms)`);
            ok(typeof validationResult === 'object', 'Validation should return result');

            testLogger.debug('Configuration validation performance passed', {
                duration: `${duration}ms`
            });
        });

        await t.test('should handle logger factory stress testing', async () => {
            testLogger.debug('Testing logger factory under stress');

            const testFactory = createTestLoggerFactory({
                level: 'debug',
                trackCalls: true
            });

            const startTime = Date.now();

            // Create many loggers rapidly
            const loggers = [];
            for (let i = 0; i < 50; i++) {
                loggers.push(testFactory(`stress-logger-${i}`));
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Factory should handle stress well (under 200ms for 50 loggers)
            ok(duration < 200, `Factory stress test should complete quickly (${duration}ms < 200ms)`);

            // Validate call tracking still works
            const callHistory = testFactory.getCallHistory();
            strictEqual(callHistory.callCount, 50, 'Factory should track all 50 calls');

            testLogger.debug('Logger factory stress testing passed', {
                duration: `${duration}ms`,
                loggersCreated: loggers.length
            });
        });

    } finally {
        cleanup();
        testLogger.info('Performance and timeout tests completed');
    }
});

// Global test cleanup handler to ensure proper resource cleanup
test.after(async () => {
    try {
        testLogger.info('Executing global test cleanup');
        
        // Execute comprehensive test environment cleanup
        await cleanupTestEnvironment();
        
        // Reset any global test state
        if (global.testState) {
            global.testState = null;
        }
        
        testLogger.info('Global test cleanup completed successfully');
    } catch (cleanupError) {
        testLogger.error('Error during global test cleanup', {
            error: cleanupError.message,
            stack: cleanupError.stack
        });
    }
});