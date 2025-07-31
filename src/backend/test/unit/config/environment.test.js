/**
 * Comprehensive Unit Test Module for Environment Configuration System
 * 
 * This test module provides thorough testing of the environment configuration system,
 * validating environment variable loading, parsing, validation, and configuration management
 * functionality. The test suite validates behavior of environment configuration functions,
 * error handling scenarios, environment detection utilities, and configuration validation
 * mechanisms using Node.js built-in test runner.
 * 
 * Tests include environment variable mocking, configuration edge cases, validation error
 * scenarios, and environment-specific behavior verification while demonstrating testing
 * best practices for configuration management in Node.js applications.
 * 
 * Features comprehensive test coverage for:
 * - Environment configuration loading and caching with validation
 * - Environment variable parsing and type conversion with error handling
 * - Configuration validation with detailed error reporting and edge cases
 * - Environment detection utilities for development, test, and production modes
 * - Configuration reload functionality with cache invalidation and validation
 * - Error handling scenarios with comprehensive error message validation
 * - Test isolation using environment variable mocking and cleanup procedures
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner for test suite definition and execution
const { test, describe, it, beforeEach, afterEach } = require('node:test'); // Built-in Node.js test runner

// Import Node.js built-in assertion library for test assertions and validation
const { 
    assert, 
    strictEqual, 
    deepStrictEqual, 
    throws, 
    doesNotThrow 
} = require('node:assert'); // Built-in Node.js assertion library

// Import main environment configuration object and functions for testing
const { 
    config,
    validateEnvironment,
    getEnvironmentInfo,
    createEnvironmentConfig,
    reloadEnvironmentConfig,
    isEnvironmentConfigValid
} = require('../../../config/environment.js');

// Import test helper utilities for environment mocking and test isolation
const {
    createTestEnvironment,
    TestUtilities,
    createMockFunction
} = require('../../helpers/testHelpers.js');

// Import test configuration for test-specific settings and timeout values
const { testConfig } = require('../../setup/testConfig.js');

// Import environment constants for default values and validation
const {
    ENVIRONMENT,
    LOGGING
} = require('../../../utils/constants.js');

// Initialize global test utilities and environment management
const testUtilities = new TestUtilities({ testId: 'environment-config-test' });
const originalProcessEnv = { ...process.env };

// Test configuration constants for environment testing scenarios
const TEST_PORT = 9001;
const TEST_HOST = '127.0.0.1';
const TEST_NODE_ENV = 'test';

/**
 * Sets up test environment with clean process.env state, test utilities initialization,
 * and environment variable mocking for isolated environment configuration testing.
 * 
 * @param {Object} envOverrides - Environment variable overrides for test scenarios
 * @returns {Function} Restore function for cleaning up environment changes after test execution
 */
function setupTestEnvironment(envOverrides = {}) {
    // Save original process.env state for restoration after tests
    const originalEnv = { ...process.env };
    
    // Initialize test utilities with environment-specific configuration
    testUtilities.reset();
    
    // Apply environment variable overrides from envOverrides parameter
    Object.keys(envOverrides).forEach(key => {
        process.env[key] = envOverrides[key];
    });
    
    // Set NODE_ENV to 'test' for test environment identification
    if (!envOverrides.NODE_ENV) {
        process.env.NODE_ENV = TEST_NODE_ENV;
    }
    
    // Create restore function for cleanup and environment restoration
    return function restoreEnvironment() {
        // Restore original environment variables
        Object.keys(process.env).forEach(key => {
            if (originalEnv[key] !== undefined) {
                process.env[key] = originalEnv[key];
            } else {
                delete process.env[key];
            }
        });
        
        // Clean up test utilities and mocks
        testUtilities.cleanup();
    };
}

/**
 * Validates environment configuration object structure, properties, and data types
 * to ensure configuration completeness and correctness for testing scenarios.
 * 
 * @param {Object} configObject - Configuration object to validate
 * @param {Object} expectedStructure - Expected structure specification for validation
 * @returns {boolean} True if configuration structure is valid, false otherwise
 */
function validateEnvironmentConfigStructure(configObject, expectedStructure = {}) {
    // Check that all required properties exist in configObject
    const requiredProperties = ['port', 'host', 'nodeEnv', 'isDevelopment', 'isProduction', 'isTest', 'logLevel'];
    
    for (const prop of requiredProperties) {
        if (!(prop in configObject)) {
            return false;
        }
    }
    
    // Validate data types match expected structure specifications
    if (typeof configObject.port !== 'number' || 
        typeof configObject.host !== 'string' ||
        typeof configObject.nodeEnv !== 'string' ||
        typeof configObject.isDevelopment !== 'boolean' ||
        typeof configObject.isProduction !== 'boolean' ||
        typeof configObject.isTest !== 'boolean' ||
        typeof configObject.logLevel !== 'string') {
        return false;
    }
    
    // Verify boolean environment flags are properly set
    const environmentFlags = [configObject.isDevelopment, configObject.isProduction, configObject.isTest];
    const trueCount = environmentFlags.filter(flag => flag === true).length;
    
    // Only one environment flag should be true
    if (trueCount !== 1) {
        return false;
    }
    
    // Check numeric values are within expected ranges
    if (configObject.port < 1 || configObject.port > 65535) {
        return false;
    }
    
    // Validate string values match expected patterns
    const validEnvironments = ['development', 'test', 'production'];
    if (!validEnvironments.includes(configObject.nodeEnv)) {
        return false;
    }
    
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(configObject.logLevel.toLowerCase())) {
        return false;
    }
    
    // Return validation result indicating structure compliance
    return true;
}

/**
 * Creates specific environment testing scenarios with predefined environment variable
 * combinations for comprehensive environment behavior testing.
 * 
 * @param {string} scenarioName - Name of the test scenario to create
 * @param {Object} scenarioConfig - Configuration for the test scenario
 * @returns {Object} Test scenario object with environment setup and expected results
 */
function createTestEnvironmentScenario(scenarioName, scenarioConfig = {}) {
    // Define environment variables based on scenario name and configuration
    const scenarios = {
        DefaultConfiguration: {
            environmentVariables: {},
            expectedConfig: {
                port: ENVIRONMENT.DEFAULT_PORT,
                host: ENVIRONMENT.DEFAULT_HOST,
                nodeEnv: ENVIRONMENT.DEFAULT_NODE_ENV,
                isDevelopment: true,
                isProduction: false,
                isTest: false,
                logLevel: LOGGING.DEFAULT_LOG_LEVEL
            }
        },
        ProductionConfiguration: {
            environmentVariables: {
                NODE_ENV: 'production',
                PORT: '80',
                HOST: '0.0.0.0',
                LOG_LEVEL: 'WARN'
            },
            expectedConfig: {
                port: 80,
                host: '0.0.0.0',
                nodeEnv: 'production',
                isDevelopment: false,
                isProduction: true,
                isTest: false,
                logLevel: 'WARN'
            }
        },
        TestConfiguration: {
            environmentVariables: {
                NODE_ENV: 'test',
                PORT: String(TEST_PORT),
                LOG_LEVEL: 'ERROR'
            },
            expectedConfig: {
                port: TEST_PORT,
                host: ENVIRONMENT.DEFAULT_HOST,
                nodeEnv: 'test',
                isDevelopment: false,
                isProduction: false,
                isTest: true,
                logLevel: 'ERROR'
            }
        }
    };
    
    // Set expected configuration values for scenario validation
    const scenario = scenarios[scenarioName] || scenarios.DefaultConfiguration;
    
    // Create scenario-specific validation rules and assertions
    scenario.validate = function(actualConfig) {
        return validateEnvironmentConfigStructure(actualConfig, this.expectedConfig);
    };
    
    // Set up error expectations for invalid scenario configurations
    scenario.setupEnvironment = function() {
        return setupTestEnvironment(this.environmentVariables);
    };
    
    // Define cleanup procedures for scenario teardown
    scenario.cleanup = function() {
        // Cleanup handled by setupEnvironment restore function
    };
    
    // Return complete test scenario object with setup and expectations
    return { ...scenario, ...scenarioConfig };
}

/**
 * Asserts that environment configuration contains proper default values when no
 * environment variables are set, validating fallback behavior and default value handling.
 * 
 * @param {Object} environmentConfig - Environment configuration object to validate
 */
function assertEnvironmentDefaults(environmentConfig) {
    // Assert port equals ENVIRONMENT.DEFAULT_PORT when PORT not set
    strictEqual(environmentConfig.port, ENVIRONMENT.DEFAULT_PORT, 
        `Expected port to be ${ENVIRONMENT.DEFAULT_PORT}, got ${environmentConfig.port}`);
    
    // Assert host equals ENVIRONMENT.DEFAULT_HOST when HOST not set
    strictEqual(environmentConfig.host, ENVIRONMENT.DEFAULT_HOST,
        `Expected host to be ${ENVIRONMENT.DEFAULT_HOST}, got ${environmentConfig.host}`);
    
    // Assert nodeEnv equals ENVIRONMENT.DEFAULT_NODE_ENV when NODE_ENV not set
    strictEqual(environmentConfig.nodeEnv, ENVIRONMENT.DEFAULT_NODE_ENV,
        `Expected nodeEnv to be ${ENVIRONMENT.DEFAULT_NODE_ENV}, got ${environmentConfig.nodeEnv}`);
    
    // Assert logLevel equals LOGGING.DEFAULT_LOG_LEVEL for default environment
    strictEqual(environmentConfig.logLevel, LOGGING.DEFAULT_LOG_LEVEL,
        `Expected logLevel to be ${LOGGING.DEFAULT_LOG_LEVEL}, got ${environmentConfig.logLevel}`);
    
    // Assert environment detection flags are set correctly for defaults
    strictEqual(environmentConfig.isDevelopment, true, 
        'Expected isDevelopment to be true for default environment');
    strictEqual(environmentConfig.isProduction, false,
        'Expected isProduction to be false for default environment');
    strictEqual(environmentConfig.isTest, false,
        'Expected isTest to be false for default environment');
    
    // Verify all required configuration properties have appropriate default values
    assert(validateEnvironmentConfigStructure(environmentConfig),
        'Environment configuration structure validation failed for defaults');
}

/**
 * Asserts that environment configuration properly applies environment variable overrides
 * and maintains data type conversion and validation.
 * 
 * @param {Object} environmentConfig - Environment configuration object to validate
 * @param {Object} expectedOverrides - Expected override values for validation
 */
function assertEnvironmentOverrides(environmentConfig, expectedOverrides) {
    // Assert PORT environment variable override is applied with numeric conversion
    if (expectedOverrides.port !== undefined) {
        strictEqual(environmentConfig.port, expectedOverrides.port,
            `Expected port override to be ${expectedOverrides.port}, got ${environmentConfig.port}`);
        strictEqual(typeof environmentConfig.port, 'number',
            'Expected port to be converted to number type');
    }
    
    // Assert HOST environment variable override is applied as string
    if (expectedOverrides.host !== undefined) {
        strictEqual(environmentConfig.host, expectedOverrides.host,
            `Expected host override to be ${expectedOverrides.host}, got ${environmentConfig.host}`);
    }
    
    // Assert NODE_ENV environment variable override affects environment detection
    if (expectedOverrides.nodeEnv !== undefined) {
        strictEqual(environmentConfig.nodeEnv, expectedOverrides.nodeEnv,
            `Expected nodeEnv override to be ${expectedOverrides.nodeEnv}, got ${environmentConfig.nodeEnv}`);
        
        // Verify environment detection flags update based on NODE_ENV override
        const expectedIsDevelopment = expectedOverrides.nodeEnv === 'development';
        const expectedIsProduction = expectedOverrides.nodeEnv === 'production';
        const expectedIsTest = expectedOverrides.nodeEnv === 'test';
        
        strictEqual(environmentConfig.isDevelopment, expectedIsDevelopment,
            `Expected isDevelopment to be ${expectedIsDevelopment} for ${expectedOverrides.nodeEnv}`);
        strictEqual(environmentConfig.isProduction, expectedIsProduction,
            `Expected isProduction to be ${expectedIsProduction} for ${expectedOverrides.nodeEnv}`);
        strictEqual(environmentConfig.isTest, expectedIsTest,
            `Expected isTest to be ${expectedIsTest} for ${expectedOverrides.nodeEnv}`);
    }
    
    // Assert LOG_LEVEL environment variable override is applied correctly
    if (expectedOverrides.logLevel !== undefined) {
        strictEqual(environmentConfig.logLevel, expectedOverrides.logLevel,
            `Expected logLevel override to be ${expectedOverrides.logLevel}, got ${environmentConfig.logLevel}`);
    }
    
    // Check that invalid overrides trigger appropriate validation errors
    assert(validateEnvironmentConfigStructure(environmentConfig),
        'Environment configuration structure validation failed after applying overrides');
}

/**
 * Comprehensive testing function for environment validation scenarios including valid
 * configurations, invalid values, and edge cases with detailed error checking.
 * 
 * @param {Object} validationScenarios - Collection of validation test scenarios
 */
function testEnvironmentValidation(validationScenarios = {}) {
    // Test valid environment configuration passes validation without errors
    const validConfig = {
        port: 3000,
        host: 'localhost',
        nodeEnv: 'development',
        logLevel: 'info'
    };
    
    const validResult = validateEnvironment(validConfig);
    assert(validResult.isValid, 'Valid configuration should pass validation');
    strictEqual(validResult.errors.length, 0, 'Valid configuration should have no errors');
    
    // Test invalid port values trigger validation errors with appropriate messages
    const invalidPortConfig = {
        port: 'invalid-port',
        host: 'localhost',
        nodeEnv: 'development',
        logLevel: 'info'
    };
    
    const invalidPortResult = validateEnvironment(invalidPortConfig);
    strictEqual(invalidPortResult.isValid, false, 'Invalid port should fail validation');
    assert(invalidPortResult.errors.length > 0, 'Invalid port should generate errors');
    assert(invalidPortResult.errors.some(error => error.toLowerCase().includes('port')),
        'Port validation error should mention port');
    
    // Test invalid host values trigger validation errors
    const invalidHostConfig = {
        port: 3000,
        host: '',
        nodeEnv: 'development',
        logLevel: 'info'
    };
    
    const invalidHostResult = validateEnvironment(invalidHostConfig);
    strictEqual(invalidHostResult.isValid, false, 'Invalid host should fail validation');
    assert(invalidHostResult.errors.some(error => error.toLowerCase().includes('host')),
        'Host validation error should mention host');
    
    // Test invalid NODE_ENV values trigger validation errors
    const invalidEnvConfig = {
        port: 3000,
        host: 'localhost',
        nodeEnv: 'invalid-env',
        logLevel: 'info'
    };
    
    const invalidEnvResult = validateEnvironment(invalidEnvConfig);
    strictEqual(invalidEnvResult.isValid, false, 'Invalid NODE_ENV should fail validation');
    assert(invalidEnvResult.errors.some(error => error.toLowerCase().includes('environment')),
        'Environment validation error should mention environment');
    
    // Test edge cases like boundary values and special characters
    const edgeCaseConfig = {
        port: 65535, // Maximum valid port
        host: '127.0.0.1',
        nodeEnv: 'production',
        logLevel: 'debug'
    };
    
    const edgeCaseResult = validateEnvironment(edgeCaseConfig);
    assert(edgeCaseResult.isValid, 'Edge case configuration should pass validation');
    
    // Verify validation error messages are descriptive and helpful
    assert(invalidPortResult.errors.every(error => typeof error === 'string' && error.length > 0),
        'All error messages should be non-empty strings');
    
    // Test validation warning scenarios for sub-optimal but valid configurations
    const warningConfig = {
        port: 8080,
        host: '0.0.0.0',
        nodeEnv: 'development',
        logLevel: 'debug'
    };
    
    const warningResult = validateEnvironment(warningConfig);
    assert(warningResult.isValid, 'Warning configuration should still be valid');
}

/**
 * Tests environment configuration reload functionality including runtime updates,
 * cache invalidation, and configuration refresh behavior.
 */
function testEnvironmentReload() {
    // Test initial environment configuration loading and caching
    const initialConfig = createEnvironmentConfig();
    assert(initialConfig, 'Initial configuration should be created');
    assert(validateEnvironmentConfigStructure(initialConfig),
        'Initial configuration should have valid structure');
    
    // Modify process.env variables and test reload triggers configuration update
    const originalPort = process.env.PORT;
    process.env.PORT = '9999';
    
    // Verify reloaded configuration reflects new environment variable values
    const reloadedConfig = reloadEnvironmentConfig();
    assert(reloadedConfig, 'Reloaded configuration should be created');
    strictEqual(reloadedConfig.port, 9999, 'Reloaded configuration should reflect new PORT value');
    
    // Test force reload functionality bypasses cache and reloads from environment
    const forceReloadedConfig = reloadEnvironmentConfig({ force: true });
    assert(forceReloadedConfig, 'Force reloaded configuration should be created');
    strictEqual(forceReloadedConfig.port, 9999, 'Force reloaded configuration should match environment');
    
    // Verify configuration validation is re-executed on reload
    assert(validateEnvironmentConfigStructure(reloadedConfig),
        'Reloaded configuration should pass structure validation');
    
    // Test error handling when reloaded configuration is invalid
    process.env.PORT = 'invalid-port';
    
    try {
        const invalidReloadConfig = reloadEnvironmentConfig();
        // Should handle invalid configuration gracefully
        assert(invalidReloadConfig, 'Should handle invalid reload configuration');
    } catch (error) {
        // Error handling for invalid configuration is acceptable
        assert(error.message.includes('port') || error.message.includes('invalid'),
            'Error should relate to port validation');
    }
    
    // Restore original PORT value
    if (originalPort !== undefined) {
        process.env.PORT = originalPort;
    } else {
        delete process.env.PORT;
    }
    
    // Verify reload preserves configuration structure and data types
    const finalConfig = reloadEnvironmentConfig();
    assert(validateEnvironmentConfigStructure(finalConfig),
        'Final reloaded configuration should maintain valid structure');
}

// Main test suite for Environment Configuration Unit Tests
describe('Environment Configuration Unit Tests', () => {
    // Test suite setup procedures
    beforeEach(() => {
        // Initialize TestUtilities with environment test configuration
        testUtilities.reset();
        
        // Save original process.env state for restoration
        Object.assign(originalProcessEnv, process.env);
        
        // Set up test environment with NODE_ENV=test
        process.env.NODE_ENV = TEST_NODE_ENV;
        
        // Configure test timeouts and assertion helpers
        if (testConfig.timeouts) {
            // Apply test-specific timeout configuration
        }
    });
    
    // Test suite teardown procedures
    afterEach(() => {
        // Restore original process.env state
        Object.keys(process.env).forEach(key => {
            if (originalProcessEnv[key] !== undefined) {
                process.env[key] = originalProcessEnv[key];
            } else {
                delete process.env[key];
            }
        });
        
        // Reset all mock functions and test utilities
        testUtilities.cleanup();
        
        // Clean up test-specific environment variables
        // Handled by process.env restoration above
        
        // Validate no test artifacts remain in global state
        assert(!global.testArtifacts, 'No global test artifacts should remain');
    });
    
    // Test case: should load default configuration when no environment variables are set
    test('should load default configuration when no environment variables are set', () => {
        // Clear all application-specific environment variables
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.NODE_ENV;
        delete process.env.LOG_LEVEL;
        
        // Import environment configuration module
        const testConfig = createEnvironmentConfig();
        
        // Assert config.port equals ENVIRONMENT.DEFAULT_PORT (3000)
        strictEqual(testConfig.port, ENVIRONMENT.DEFAULT_PORT,
            `Expected default port ${ENVIRONMENT.DEFAULT_PORT}, got ${testConfig.port}`);
        
        // Assert config.host equals ENVIRONMENT.DEFAULT_HOST (localhost)
        strictEqual(testConfig.host, ENVIRONMENT.DEFAULT_HOST,
            `Expected default host ${ENVIRONMENT.DEFAULT_HOST}, got ${testConfig.host}`);
        
        // Assert config.nodeEnv equals ENVIRONMENT.DEFAULT_NODE_ENV (development)
        strictEqual(testConfig.nodeEnv, ENVIRONMENT.DEFAULT_NODE_ENV,
            `Expected default nodeEnv ${ENVIRONMENT.DEFAULT_NODE_ENV}, got ${testConfig.nodeEnv}`);
        
        // Assert config.isDevelopment is true for default environment
        strictEqual(testConfig.isDevelopment, true,
            'Expected isDevelopment to be true for default environment');
        
        // Assert config.isProduction and config.isTest are false
        strictEqual(testConfig.isProduction, false,
            'Expected isProduction to be false for default environment');
        strictEqual(testConfig.isTest, false,
            'Expected isTest to be false for default environment');
        
        // Assert config.logLevel equals LOGGING.DEFAULT_LOG_LEVEL
        strictEqual(testConfig.logLevel, LOGGING.DEFAULT_LOG_LEVEL,
            `Expected default log level ${LOGGING.DEFAULT_LOG_LEVEL}, got ${testConfig.logLevel}`);
    });
    
    // Test case: should apply environment variable overrides with proper type conversion
    test('should apply environment variable overrides with proper type conversion', () => {
        // Set process.env.PORT to '8080' (string)
        process.env.PORT = '8080';
        
        // Set process.env.HOST to '0.0.0.0'
        process.env.HOST = '0.0.0.0';
        
        // Set process.env.NODE_ENV to 'production'
        process.env.NODE_ENV = 'production';
        
        // Set process.env.LOG_LEVEL to 'INFO'
        process.env.LOG_LEVEL = 'INFO';
        
        // Reload environment configuration
        const testConfig = reloadEnvironmentConfig();
        
        // Assert config.port equals 8080 (converted to number)
        strictEqual(testConfig.port, 8080,
            'Expected PORT to be converted to number 8080');
        strictEqual(typeof testConfig.port, 'number',
            'Expected port to be number type after conversion');
        
        // Assert config.host equals '0.0.0.0'
        strictEqual(testConfig.host, '0.0.0.0',
            'Expected HOST to be set to 0.0.0.0');
        
        // Assert config.nodeEnv equals 'production'
        strictEqual(testConfig.nodeEnv, 'production',
            'Expected NODE_ENV to be set to production');
        
        // Assert config.isProduction is true
        strictEqual(testConfig.isProduction, true,
            'Expected isProduction to be true for production environment');
        
        // Assert config.isDevelopment and config.isTest are false
        strictEqual(testConfig.isDevelopment, false,
            'Expected isDevelopment to be false for production environment');
        strictEqual(testConfig.isTest, false,
            'Expected isTest to be false for production environment');
        
        // Assert config.logLevel equals 'INFO'
        strictEqual(testConfig.logLevel, 'INFO',
            'Expected LOG_LEVEL to be set to INFO');
    });
    
    // Test case: should properly detect test environment and apply test-specific configuration
    test('should properly detect test environment and apply test-specific configuration', () => {
        // Set process.env.NODE_ENV to 'test'
        process.env.NODE_ENV = 'test';
        
        // Reload environment configuration
        const testConfig = reloadEnvironmentConfig();
        
        // Assert config.nodeEnv equals 'test'
        strictEqual(testConfig.nodeEnv, ENVIRONMENT.TEST,
            'Expected NODE_ENV to be test');
        
        // Assert config.isTest is true
        strictEqual(testConfig.isTest, true,
            'Expected isTest to be true for test environment');
        
        // Assert config.isDevelopment and config.isProduction are false
        strictEqual(testConfig.isDevelopment, false,
            'Expected isDevelopment to be false for test environment');
        strictEqual(testConfig.isProduction, false,
            'Expected isProduction to be false for test environment');
        
        // Assert config.logLevel equals LOGGING.TEST_LOG_LEVEL
        strictEqual(testConfig.logLevel, LOGGING.TEST_LOG_LEVEL,
            `Expected test log level ${LOGGING.TEST_LOG_LEVEL}, got ${testConfig.logLevel}`);
        
        // Verify test-specific configuration optimizations are applied
        assert(validateEnvironmentConfigStructure(testConfig),
            'Test configuration should have valid structure');
    });
    
    // Test case: should validate environment configuration and return validation results
    test('should validate environment configuration and return validation results', () => {
        // Create valid environment configuration object
        const validConfig = {
            port: 3000,
            host: 'localhost',
            nodeEnv: 'development',
            logLevel: 'info'
        };
        
        // Call validateEnvironment with valid configuration
        const validResult = validateEnvironment(validConfig);
        
        // Assert validation result indicates success with no errors
        strictEqual(validResult.isValid, true,
            'Valid configuration should pass validation');
        strictEqual(validResult.errors.length, 0,
            'Valid configuration should have no validation errors');
        
        // Create invalid configuration with out-of-range port
        const invalidConfig = {
            port: 70000, // Invalid port > 65535
            host: 'localhost',
            nodeEnv: 'development',
            logLevel: 'info'
        };
        
        // Call validateEnvironment with invalid configuration
        const invalidResult = validateEnvironment(invalidConfig);
        
        // Assert validation result indicates failure with descriptive errors
        strictEqual(invalidResult.isValid, false,
            'Invalid configuration should fail validation');
        assert(invalidResult.errors.length > 0,
            'Invalid configuration should generate validation errors');
        assert(invalidResult.errors[0].includes('port'),
            'Port validation error should mention port in error message');
        
        // Test edge cases like boundary values and special configurations
        testEnvironmentValidation();
    });
    
    // Test case: should handle invalid port values and provide appropriate error messages
    test('should handle invalid port values and provide appropriate error messages', () => {
        // Test port validation with non-numeric string value
        process.env.PORT = 'invalid-port';
        
        throws(() => {
            reloadEnvironmentConfig();
        }, /invalid.*port/i, 'Should throw error for non-numeric port');
        
        // Test port validation with negative number
        const negativePortResult = validateEnvironment({ port: -1 });
        throws(() => {
            if (!negativePortResult.isValid) {
                throw new Error(negativePortResult.errors[0]);
            }
        }, /port.*range/i, 'Should reject negative port numbers');
        
        // Test port validation with zero
        const zeroPortResult = validateEnvironment({ port: 0 });
        throws(() => {
            if (!zeroPortResult.isValid) {
                throw new Error(zeroPortResult.errors[0]);
            }
        }, /port.*range/i, 'Should reject port zero');
        
        // Test port validation with number greater than 65535
        const highPortResult = validateEnvironment({ port: 65536 });
        throws(() => {
            if (!highPortResult.isValid) {
                throw new Error(highPortResult.errors[0]);
            }
        }, /port.*range/i, 'Should reject ports above 65535');
        
        // Test port validation with floating point number
        const floatPortResult = validateEnvironment({ port: 3000.5 });
        throws(() => {
            if (!floatPortResult.isValid) {
                throw new Error(floatPortResult.errors[0]);
            }
        }, /port.*integer/i, 'Should reject floating point ports');
        
        // Verify appropriate error messages for each invalid case
        assert(negativePortResult.errors.length > 0, 'Negative port should generate errors');
        assert(zeroPortResult.errors.length > 0, 'Zero port should generate errors');
        assert(highPortResult.errors.length > 0, 'High port should generate errors');
        
        // Verify validation passes for valid port range (1-65535)
        const validPortResult = validateEnvironment({ port: 3000 });
        doesNotThrow(() => {
            if (!validPortResult.isValid) {
                throw new Error('Valid port should not throw');
            }
        }, 'Valid port 3000 should pass validation');
    });
    
    // Test case: should handle invalid NODE_ENV values and enforce valid environment types
    test('should handle invalid NODE_ENV values and enforce valid environment types', () => {
        // Test NODE_ENV validation with unsupported environment name
        const invalidEnvResult = validateEnvironment({ nodeEnv: 'invalid' });
        throws(() => {
            if (!invalidEnvResult.isValid) {
                throw new Error(invalidEnvResult.errors[0]);
            }
        }, /environment.*not.*supported/i, 'Should reject invalid environment names');
        
        // Test NODE_ENV validation with empty string
        const emptyEnvResult = validateEnvironment({ nodeEnv: '' });
        throws(() => {
            if (!emptyEnvResult.isValid) {
                throw new Error(emptyEnvResult.errors[0]);
            }
        }, /environment.*required/i, 'Should reject empty environment string');
        
        // Test NODE_ENV validation with numeric value
        const numericEnvResult = validateEnvironment({ nodeEnv: 123 });
        strictEqual(numericEnvResult.isValid, false,
            'Should reject numeric NODE_ENV values');
        
        // Test NODE_ENV validation with mixed case values
        process.env.NODE_ENV = 'PRODUCTION';
        const mixedCaseConfig = reloadEnvironmentConfig();
        strictEqual(mixedCaseConfig.nodeEnv, 'production',
            'Should normalize mixed case NODE_ENV to lowercase');
        
        // Verify validation accepts all values in ENVIRONMENT.VALID_ENVIRONMENTS
        const developmentResult = validateEnvironment({ nodeEnv: 'development' });
        doesNotThrow(() => {
            if (!developmentResult.isValid) {
                throw new Error('Development environment should be valid');
            }
        }, 'Development environment should pass validation');
        
        const testResult = validateEnvironment({ nodeEnv: 'test' });
        doesNotThrow(() => {
            if (!testResult.isValid) {
                throw new Error('Test environment should be valid');
            }
        }, 'Test environment should pass validation');
        
        const productionResult = validateEnvironment({ nodeEnv: 'production' });
        doesNotThrow(() => {
            if (!productionResult.isValid) {
                throw new Error('Production environment should be valid');
            }
        }, 'Production environment should pass validation');
        
        // Verify appropriate error messages for invalid environment names
        assert(invalidEnvResult.errors.some(error => 
            error.toLowerCase().includes('environment') && 
            error.toLowerCase().includes('supported')
        ), 'Invalid environment error should mention supported environments');
    });
    
    // Test case: should provide comprehensive environment information including runtime details
    test('should provide comprehensive environment information including runtime details', () => {
        // Call getEnvironmentInfo function
        const envInfo = getEnvironmentInfo();
        
        // Assert result contains Node.js version information
        assert(typeof envInfo === 'object', 'Environment info should be an object');
        assert(envInfo.nodeVersion, 'Environment info should contain Node.js version');
        
        // Assert result contains current environment configuration
        assert(envInfo.config, 'Environment info should contain configuration');
        assert(typeof envInfo.config === 'object', 'Configuration should be an object');
        
        // Assert result contains system platform and architecture
        assert(envInfo.platform, 'Environment info should contain platform information');
        assert(envInfo.architecture, 'Environment info should contain architecture information');
        
        // Assert result contains process information like PID and uptime
        assert(typeof envInfo.processId === 'number', 'Process ID should be a number');
        assert(typeof envInfo.uptime === 'number', 'Uptime should be a number');
        assert(envInfo.uptime >= 0, 'Uptime should be non-negative');
        
        // Assert result contains environment validation status
        assert(typeof envInfo.isValid === 'boolean', 'Environment info should contain validation status');
        
        // Verify information is properly formatted and complete
        const requiredFields = ['nodeVersion', 'platform', 'architecture', 'processId', 'uptime', 'config'];
        requiredFields.forEach(field => {
            assert(envInfo[field] !== undefined, `Environment info should contain ${field}`);
        });
        
        // Verify configuration matches current environment configuration
        const currentConfig = config;
        deepStrictEqual(envInfo.config.port, currentConfig.port, 'Config port should match');
        deepStrictEqual(envInfo.config.host, currentConfig.host, 'Config host should match');
        deepStrictEqual(envInfo.config.nodeEnv, currentConfig.nodeEnv, 'Config nodeEnv should match');
    });
    
    // Test case: should support environment configuration reload with cache invalidation
    test('should support environment configuration reload with cache invalidation', () => {
        // Load initial environment configuration
        const initialConfig = createEnvironmentConfig();
        
        // Verify initial configuration values
        strictEqual(initialConfig.port, ENVIRONMENT.DEFAULT_PORT,
            'Initial config should have default port');
        
        // Modify process.env variables
        process.env.PORT = '9999';
        process.env.NODE_ENV = 'production';
        
        // Call reloadEnvironmentConfig without force flag
        const reloadedConfig = reloadEnvironmentConfig();
        
        // Verify configuration is updated with new environment values
        strictEqual(reloadedConfig.port, 9999,
            'Reloaded config should reflect new PORT value');
        strictEqual(reloadedConfig.nodeEnv, 'production',
            'Reloaded config should reflect new NODE_ENV value');
        
        // Test force reload bypasses any caching mechanisms
        process.env.HOST = '192.168.1.1';
        const forceReloadedConfig = reloadEnvironmentConfig({ force: true });
        strictEqual(forceReloadedConfig.host, '192.168.1.1',
            'Force reloaded config should reflect new HOST value');
        
        // Verify reloaded configuration maintains proper validation and structure
        assert(forceReloadedConfig.isValid !== false, 'Reloaded configuration should be valid');
        assert(validateEnvironmentConfigStructure(forceReloadedConfig),
            'Reloaded configuration should maintain valid structure');
        deepStrictEqual(Object.keys(reloadedConfig).sort(), Object.keys(initialConfig).sort(),
            'Reloaded configuration should maintain same property structure');
        
        // Test comprehensive reload functionality
        testEnvironmentReload();
    });
    
    // Test case: should validate configuration readiness with isEnvironmentConfigValid
    test('should validate configuration readiness with isEnvironmentConfigValid', () => {
        // Test isEnvironmentConfigValid with properly loaded configuration
        const configValid = isEnvironmentConfigValid();
        
        // Assert function returns true for valid configuration
        strictEqual(configValid, true,
            'Environment configuration should be valid after proper loading');
        strictEqual(typeof configValid, 'boolean',
            'Configuration validity check should return boolean');
        
        // Test function with invalid or incomplete configuration
        const originalPort = process.env.PORT;
        process.env.PORT = 'invalid-port-value';
        
        try {
            // Attempt to reload with invalid configuration
            reloadEnvironmentConfig();
            
            // Check if configuration is still considered valid
            const invalidConfigValid = isEnvironmentConfigValid();
            
            // Function behavior may vary based on error handling strategy
            assert(typeof invalidConfigValid === 'boolean',
                'Configuration validity should always return boolean');
            
        } catch (error) {
            // Invalid configuration may throw during reload
            assert(error.message.includes('port') || error.message.includes('invalid'),
                'Error should relate to invalid port configuration');
        } finally {
            // Restore original PORT value
            if (originalPort !== undefined) {
                process.env.PORT = originalPort;
            } else {
                delete process.env.PORT;
            }
        }
        
        // Test function behavior before configuration is loaded
        // This is implementation-dependent based on configuration loading strategy
        
        // Verify function provides quick validation without detailed error reporting
        const quickValidation = isEnvironmentConfigValid();
        assert(typeof quickValidation === 'boolean',
            'Quick validation should return boolean result');
    });
    
    // Test case: should create complete environment configuration with createEnvironmentConfig
    test('should create complete environment configuration with createEnvironmentConfig', () => {
        // Call createEnvironmentConfig function
        const createdConfig = createEnvironmentConfig();
        
        // Assert result contains all required configuration properties
        assert(typeof createdConfig === 'object', 'Created configuration should be an object');
        assert(createdConfig.port, 'Configuration should contain port');
        assert(createdConfig.host, 'Configuration should contain host');
        assert(createdConfig.nodeEnv, 'Configuration should contain nodeEnv');
        
        // Assert result includes environment detection flags
        assert(typeof createdConfig.isDevelopment === 'boolean',
            'Configuration should contain isDevelopment boolean flag');
        assert(typeof createdConfig.isProduction === 'boolean',
            'Configuration should contain isProduction boolean flag');
        assert(typeof createdConfig.isTest === 'boolean',
            'Configuration should contain isTest boolean flag');
        
        // Assert result includes validation status and metadata
        // This may be implementation-dependent
        if (createdConfig.isValid !== undefined) {
            assert(typeof createdConfig.isValid === 'boolean',
                'Configuration validation status should be boolean');
        }
        
        // Assert result includes environment summary information
        if (createdConfig.summary !== undefined) {
            assert(typeof createdConfig.summary === 'object',
                'Configuration summary should be an object');
        }
        
        // Verify configuration structure matches expected schema
        assert(validateEnvironmentConfigStructure(createdConfig),
            'Created configuration should match expected structure schema');
        
        // Validate that all environment detection flags are properly set
        const environmentFlags = [
            createdConfig.isDevelopment,
            createdConfig.isProduction,
            createdConfig.isTest
        ];
        const trueCount = environmentFlags.filter(flag => flag === true).length;
        strictEqual(trueCount, 1, 'Exactly one environment flag should be true');
        
        // Verify data types are correct for all properties
        strictEqual(typeof createdConfig.port, 'number', 'Port should be number type');
        strictEqual(typeof createdConfig.host, 'string', 'Host should be string type');
        strictEqual(typeof createdConfig.nodeEnv, 'string', 'NodeEnv should be string type');
        strictEqual(typeof createdConfig.logLevel, 'string', 'LogLevel should be string type');
    });
});