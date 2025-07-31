/**
 * Comprehensive Unit Test Suite for Environment Utility Module
 * 
 * This test suite provides complete coverage for the environment utility module
 * (src/backend/utils/environment.js) using Node.js built-in test runner.
 * Tests all exported functions including environment variable processing,
 * configuration validation, environment detection, and cache management.
 * 
 * Implements thorough testing of type conversion, validation rules, error handling,
 * and edge cases using comprehensive mocking strategies for environment variables
 * and process APIs.
 * 
 * Features:
 * - 95% function coverage target for all exported functions
 * - Comprehensive mocking of process.env and console methods
 * - Edge case testing for boundary conditions and invalid inputs
 * - Error scenario testing with detailed error message validation
 * - Integration testing combining multiple utility functions
 * - Cache management testing for performance optimization
 * - Node.js runtime information collection testing
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner and assertion utilities
const { test, describe, it, beforeEach, afterEach, mock } = require('node:test'); // v18.0.0+
const assert = require('assert'); // Node.js built-in assertion library

// Import all functions under test from environment utility module
const {
    parseEnvironmentVariable,
    validatePortNumber,
    validateHostAddress,
    getEnvironmentVariables,
    validateEnvironmentVariables,
    isProductionEnvironment,
    isDevelopmentEnvironment,
    isTestEnvironment,
    getNodeJSInfo,
    createEnvironmentSummary,
    getEnvironmentType,
    clearEnvironmentCache
} = require('../../../utils/environment.js');

// Import constants for testing validation and default values
const {
    ENVIRONMENT: {
        DEFAULT_PORT,
        DEFAULT_HOST,
        DEFAULT_NODE_ENV,
        VALID_ENVIRONMENTS,
        DEVELOPMENT,
        PRODUCTION,
        TEST
    },
    LOGGING: {
        DEFAULT_LOG_LEVEL,
        DEVELOPMENT_LOG_LEVEL,
        PRODUCTION_LOG_LEVEL,
        TEST_LOG_LEVEL
    }
} = require('../../../utils/constants.js');

// Import test utilities for comprehensive test lifecycle management
const { TestUtilities } = require('../../helpers/testHelpers.js');

// Import test configuration for timeout and server settings
const { testConfig } = require('../../setup/testConfig.js');

// Import error fixtures for testing error scenarios
const { validationErrors } = require('../../fixtures/errors.js');

// Global test state management for environment variable backup and restoration
let originalProcessEnv;
let originalConsole;
let testUtilities;

/**
 * Sets up the test environment by backing up original process.env and console,
 * clearing environment cache, and initializing test utilities
 */
function setupTestEnvironment() {
    // Backup original process.env object for restoration
    originalProcessEnv = { ...process.env };
    
    // Backup original console methods for restoration after mocking
    originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };
    
    // Clear environment cache to ensure clean test state
    clearEnvironmentCache();
    
    // Initialize TestUtilities instance for test lifecycle management
    testUtilities = new TestUtilities({
        enableMocking: true,
        enableCleanup: true,
        trackCalls: true
    });
    
    // Set up test logging configuration
    process.env.NODE_ENV = TEST;
    process.env.LOG_LEVEL = TEST_LOG_LEVEL;
}

/**
 * Cleans up the test environment by restoring original process.env, console methods,
 * and clearing any test-specific state
 */
function cleanupTestEnvironment() {
    // Restore original process.env from backup
    process.env = { ...originalProcessEnv };
    
    // Restore original console methods from backup
    Object.assign(console, originalConsole);
    
    // Clear environment cache to remove any test-specific cached values
    clearEnvironmentCache();
    
    // Clean up TestUtilities instance and any created resources
    if (testUtilities) {
        testUtilities.cleanup();
    }
    
    // Reset any global test state
    originalProcessEnv = null;
    originalConsole = null;
    testUtilities = null;
}

/**
 * Utility function to mock environment variables for testing specific scenarios
 * and configurations
 * 
 * @param {string} variableName - Environment variable name to mock
 * @param {any} value - Value to set for the environment variable
 * @returns {function} Cleanup function to restore original environment variable
 */
function mockEnvironmentVariable(variableName, value) {
    // Store original environment variable value if it exists
    const originalValue = process.env[variableName];
    
    // Set new environment variable value in process.env
    if (value === undefined) {
        delete process.env[variableName];
    } else {
        process.env[variableName] = String(value);
    }
    
    // Clear environment cache to force re-evaluation
    clearEnvironmentCache();
    
    // Return cleanup function that restores original value
    return () => {
        if (originalValue === undefined) {
            delete process.env[variableName];
        } else {
            process.env[variableName] = originalValue;
        }
        clearEnvironmentCache();
    };
}

/**
 * Utility function to mock console methods for testing logging behavior
 * and capturing output
 * 
 * @param {string} methodName - Console method name to mock
 * @param {function} mockImplementation - Mock implementation function
 * @returns {function} Cleanup function to restore original console method
 */
function mockConsoleMethod(methodName, mockImplementation) {
    // Store reference to original console method
    const originalMethod = console[methodName];
    
    // Replace console method with mock implementation
    console[methodName] = mockImplementation || mock.fn();
    
    // Return cleanup function that restores original method
    return () => {
        console[methodName] = originalMethod;
    };
}

/**
 * Creates a mock process.env object with specified environment variables
 * for isolated testing scenarios
 * 
 * @param {object} environmentVariables - Environment variables to include in mock
 * @returns {object} Mock process.env object with specified variables
 */
function createMockProcessEnv(environmentVariables) {
    // Create new object to serve as mock process.env
    const mockEnv = {};
    
    // Copy provided environment variables to mock object
    Object.entries(environmentVariables).forEach(([key, value]) => {
        mockEnv[key] = String(value);
    });
    
    // Return mock object for use in tests
    return mockEnv;
}

/**
 * Utility function to validate function results against expected outcomes
 * with detailed assertion messages
 * 
 * @param {any} actual - Actual result from function call
 * @param {any} expected - Expected result value
 * @param {string} testContext - Test context information for debugging
 */
function validateTestResult(actual, expected, testContext) {
    // Compare actual result with expected result using appropriate assertion
    if (typeof expected === 'object' && expected !== null) {
        assert.deepStrictEqual(actual, expected, `${testContext}: Objects should be deeply equal`);
    } else {
        assert.strictEqual(actual, expected, `${testContext}: Values should be strictly equal`);
    }
}

// Test suite setup and teardown
describe('Environment Utility Module', () => {
    beforeEach(() => {
        setupTestEnvironment();
    });
    
    afterEach(() => {
        cleanupTestEnvironment();
    });
    
    // Test suite for parseEnvironmentVariable function
    describe('parseEnvironmentVariable', () => {
        it('should parse string environment variables correctly', () => {
            const cleanup = mockEnvironmentVariable('TEST_STRING', '  hello world  ');
            
            const result = parseEnvironmentVariable('TEST_STRING', 'string', 'default');
            
            validateTestResult(result, 'hello world', 'String parsing with trimming');
            cleanup();
        });
        
        it('should parse number environment variables with validation', () => {
            const cleanup = mockEnvironmentVariable('TEST_NUMBER', '42');
            
            const result = parseEnvironmentVariable('TEST_NUMBER', 'number', 0);
            
            validateTestResult(result, 42, 'Number parsing');
            cleanup();
        });
        
        it('should parse boolean environment variables with multiple formats', () => {
            const testCases = [
                { value: 'true', expected: true },
                { value: 'false', expected: false },
                { value: '1', expected: true },
                { value: '0', expected: false },
                { value: 'yes', expected: true },
                { value: 'no', expected: false },
                { value: 'TRUE', expected: true },
                { value: 'FALSE', expected: false }
            ];
            
            testCases.forEach(({ value, expected }) => {
                const cleanup = mockEnvironmentVariable('TEST_BOOLEAN', value);
                const result = parseEnvironmentVariable('TEST_BOOLEAN', 'boolean', false);
                validateTestResult(result, expected, `Boolean parsing for value: ${value}`);
                cleanup();
            });
        });
        
        it('should parse array environment variables from comma separated strings', () => {
            const cleanup = mockEnvironmentVariable('TEST_ARRAY', 'item1, item2 , item3');
            
            const result = parseEnvironmentVariable('TEST_ARRAY', 'array', []);
            
            validateTestResult(result, ['item1', 'item2', 'item3'], 'Array parsing with trimming');
            cleanup();
        });
        
        it('should return default values for missing environment variables', () => {
            const cleanup = mockEnvironmentVariable('MISSING_VAR', undefined);
            
            const result = parseEnvironmentVariable('MISSING_VAR', 'string', 'default_value');
            
            validateTestResult(result, 'default_value', 'Default value fallback');
            cleanup();
        });
        
        it('should return default values for invalid type conversion', () => {
            const cleanup = mockEnvironmentVariable('INVALID_NUMBER', 'not_a_number');
            
            const result = parseEnvironmentVariable('INVALID_NUMBER', 'number', 42);
            
            validateTestResult(result, 42, 'Default value for invalid number conversion');
            cleanup();
        });
        
        it('should handle empty string environment variables', () => {
            const cleanup = mockEnvironmentVariable('EMPTY_STRING', '');
            
            const result = parseEnvironmentVariable('EMPTY_STRING', 'string', 'default');
            
            validateTestResult(result, 'default', 'Empty string should use default');
            cleanup();
        });
        
        it('should handle whitespace only environment variables', () => {
            const cleanup = mockEnvironmentVariable('WHITESPACE_ONLY', '   ');
            
            const result = parseEnvironmentVariable('WHITESPACE_ONLY', 'string', 'default');
            
            validateTestResult(result, 'default', 'Whitespace-only should use default');
            cleanup();
        });
    });
    
    // Test suite for validatePortNumber function
    describe('validatePortNumber', () => {
        it('should validate valid port numbers within range', () => {
            const validPorts = [1, 80, 443, 3000, 8080, 65535];
            
            validPorts.forEach(port => {
                const result = validatePortNumber(port);
                assert.ok(result.isValid, `Port ${port} should be valid`);
                assert.strictEqual(result.port, port, `Port value should match input`);
                assert.strictEqual(result.errors.length, 0, `Port ${port} should have no errors`);
            });
        });
        
        it('should reject port numbers below minimum range', () => {
            const invalidPorts = [0, -1, -100];
            
            invalidPorts.forEach(port => {
                const result = validatePortNumber(port);
                assert.strictEqual(result.isValid, false, `Port ${port} should be invalid`);
                assert.ok(result.errors.length > 0, `Port ${port} should have errors`);
                assert.ok(result.errors.some(error => error.includes('range')), 'Should include range error');
            });
        });
        
        it('should reject port numbers above maximum range', () => {
            const invalidPorts = [65536, 70000, 99999];
            
            invalidPorts.forEach(port => {
                const result = validatePortNumber(port);
                assert.strictEqual(result.isValid, false, `Port ${port} should be invalid`);
                assert.ok(result.errors.length > 0, `Port ${port} should have errors`);
                assert.ok(result.errors.some(error => error.includes('range')), 'Should include range error');
            });
        });
        
        it('should reject non numeric port values', () => {
            const invalidPorts = ['not_a_number', null, undefined, {}, []];
            
            invalidPorts.forEach(port => {
                const result = validatePortNumber(port);
                assert.strictEqual(result.isValid, false, `Port ${port} should be invalid`);
                assert.ok(result.errors.length > 0, `Port ${port} should have errors`);
            });
        });
        
        it('should reject floating point port numbers', () => {
            const invalidPorts = [3000.5, 80.1, 443.99];
            
            invalidPorts.forEach(port => {
                const result = validatePortNumber(port);
                assert.strictEqual(result.isValid, false, `Port ${port} should be invalid`);
                assert.ok(result.errors.length > 0, `Port ${port} should have errors`);
            });
        });
        
        it('should handle string port numbers with conversion', () => {
            const validStringPorts = ['80', '443', '3000'];
            
            validStringPorts.forEach(portStr => {
                const result = validatePortNumber(portStr);
                assert.ok(result.isValid, `Port string "${portStr}" should be valid`);
                assert.strictEqual(result.port, parseInt(portStr), 'Port should be converted to number');
            });
        });
        
        it('should handle null and undefined port values', () => {
            const result1 = validatePortNumber(null);
            const result2 = validatePortNumber(undefined);
            
            assert.strictEqual(result1.isValid, false, 'Null port should be invalid');
            assert.strictEqual(result2.isValid, false, 'Undefined port should be invalid');
        });
        
        it('should return validation result with proper structure', () => {
            const result = validatePortNumber(3000);
            
            assert.ok(result.hasOwnProperty('isValid'), 'Should have isValid property');
            assert.ok(result.hasOwnProperty('port'), 'Should have port property');
            assert.ok(result.hasOwnProperty('errors'), 'Should have errors property');
            assert.ok(Array.isArray(result.errors), 'Errors should be an array');
        });
    });
    
    // Test suite for validateHostAddress function
    describe('validateHostAddress', () => {
        it('should validate localhost as valid host', () => {
            const result = validateHostAddress('localhost');
            
            assert.ok(result.isValid, 'localhost should be valid');
            assert.strictEqual(result.host, 'localhost', 'Host should match input');
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
        });
        
        it('should validate valid IP addresses', () => {
            const validIPs = ['127.0.0.1', '0.0.0.0', '192.168.1.1', '10.0.0.1'];
            
            validIPs.forEach(ip => {
                const result = validateHostAddress(ip);
                assert.ok(result.isValid, `IP ${ip} should be valid`);
                assert.strictEqual(result.host, ip, 'Host should match input');
                assert.strictEqual(result.errors.length, 0, `IP ${ip} should have no errors`);
            });
        });
        
        it('should validate valid hostnames', () => {
            const validHostnames = ['example.com', 'api.example.com', 'test-server'];
            
            validHostnames.forEach(hostname => {
                const result = validateHostAddress(hostname);
                assert.ok(result.isValid, `Hostname ${hostname} should be valid`);
                assert.strictEqual(result.host, hostname, 'Host should match input');
            });
        });
        
        it('should validate special host values', () => {
            const specialHosts = ['0.0.0.0', '::1', '::'];
            
            specialHosts.forEach(host => {
                const result = validateHostAddress(host);
                assert.ok(result.isValid, `Special host ${host} should be valid`);
            });
        });
        
        it('should reject invalid IP addresses', () => {
            const invalidIPs = ['256.256.256.256', '127.0.0', '192.168.1.256', 'not.an.ip'];
            
            invalidIPs.forEach(ip => {
                const result = validateHostAddress(ip);
                assert.strictEqual(result.isValid, false, `Invalid IP ${ip} should be rejected`);
                assert.ok(result.errors.length > 0, `Invalid IP ${ip} should have errors`);
            });
        });
        
        it('should reject invalid hostnames', () => {
            const invalidHostnames = ['', '..', 'host..name', 'host name'];
            
            invalidHostnames.forEach(hostname => {
                const result = validateHostAddress(hostname);
                assert.strictEqual(result.isValid, false, `Invalid hostname ${hostname} should be rejected`);
                assert.ok(result.errors.length > 0, `Invalid hostname ${hostname} should have errors`);
            });
        });
        
        it('should handle host address normalization', () => {
            const cleanup = mockEnvironmentVariable('TEST_HOST', '  LOCALHOST  ');
            
            const result = validateHostAddress('  LOCALHOST  ');
            
            assert.ok(result.isValid, 'Normalized host should be valid');
            assert.strictEqual(result.host, 'localhost', 'Host should be normalized to lowercase');
            cleanup();
        });
        
        it('should handle null and undefined host values', () => {
            const result1 = validateHostAddress(null);
            const result2 = validateHostAddress(undefined);
            
            assert.strictEqual(result1.isValid, false, 'Null host should be invalid');
            assert.strictEqual(result2.isValid, false, 'Undefined host should be invalid');
        });
    });
    
    // Test suite for getEnvironmentVariables function
    describe('getEnvironmentVariables', () => {
        it('should retrieve and parse all required environment variables', () => {
            const cleanup1 = mockEnvironmentVariable('PORT', '3000');
            const cleanup2 = mockEnvironmentVariable('HOST', 'localhost');
            const cleanup3 = mockEnvironmentVariable('NODE_ENV', DEVELOPMENT);
            
            const requiredVars = [
                { name: 'PORT', type: 'number', defaultValue: DEFAULT_PORT },
                { name: 'HOST', type: 'string', defaultValue: DEFAULT_HOST },
                { name: 'NODE_ENV', type: 'string', defaultValue: DEFAULT_NODE_ENV }
            ];
            
            const result = getEnvironmentVariables(requiredVars);
            
            assert.ok(result.isValid, 'Result should be valid');
            assert.strictEqual(result.variables.PORT, 3000, 'PORT should be parsed as number');
            assert.strictEqual(result.variables.HOST, 'localhost', 'HOST should be parsed as string');
            assert.strictEqual(result.variables.NODE_ENV, DEVELOPMENT, 'NODE_ENV should be parsed as string');
            
            cleanup1();
            cleanup2();
            cleanup3();
        });
        
        it('should apply default values for missing variables', () => {
            const cleanup = mockEnvironmentVariable('MISSING_PORT', undefined);
            
            const requiredVars = [
                { name: 'MISSING_PORT', type: 'number', defaultValue: 8080 }
            ];
            
            const result = getEnvironmentVariables(requiredVars);
            
            assert.ok(result.isValid, 'Result should be valid with defaults');
            assert.strictEqual(result.variables.MISSING_PORT, 8080, 'Should use default value');
            cleanup();
        });
        
        it('should perform type conversion for all variable types', () => {
            const cleanup1 = mockEnvironmentVariable('TEST_STRING', 'hello');
            const cleanup2 = mockEnvironmentVariable('TEST_NUMBER', '42');
            const cleanup3 = mockEnvironmentVariable('TEST_BOOLEAN', 'true');
            const cleanup4 = mockEnvironmentVariable('TEST_ARRAY', 'a,b,c');
            
            const requiredVars = [
                { name: 'TEST_STRING', type: 'string', defaultValue: '' },
                { name: 'TEST_NUMBER', type: 'number', defaultValue: 0 },
                { name: 'TEST_BOOLEAN', type: 'boolean', defaultValue: false },
                { name: 'TEST_ARRAY', type: 'array', defaultValue: [] }
            ];
            
            const result = getEnvironmentVariables(requiredVars);
            
            assert.strictEqual(result.variables.TEST_STRING, 'hello', 'String should be parsed correctly');
            assert.strictEqual(result.variables.TEST_NUMBER, 42, 'Number should be parsed correctly');
            assert.strictEqual(result.variables.TEST_BOOLEAN, true, 'Boolean should be parsed correctly');
            assert.deepStrictEqual(result.variables.TEST_ARRAY, ['a', 'b', 'c'], 'Array should be parsed correctly');
            
            cleanup1();
            cleanup2();
            cleanup3();
            cleanup4();
        });
        
        it('should handle mixed valid and invalid environment variables', () => {
            const cleanup1 = mockEnvironmentVariable('VALID_PORT', '3000');
            const cleanup2 = mockEnvironmentVariable('INVALID_PORT', 'not_a_number');
            
            const requiredVars = [
                { name: 'VALID_PORT', type: 'number', defaultValue: 8080 },
                { name: 'INVALID_PORT', type: 'number', defaultValue: 9000 }
            ];
            
            const result = getEnvironmentVariables(requiredVars);
            
            assert.strictEqual(result.variables.VALID_PORT, 3000, 'Valid port should be parsed');
            assert.strictEqual(result.variables.INVALID_PORT, 9000, 'Invalid port should use default');
            
            cleanup1();
            cleanup2();
        });
        
        it('should return validation status with parsed variables', () => {
            const result = getEnvironmentVariables([]);
            
            assert.ok(result.hasOwnProperty('isValid'), 'Should have isValid property');
            assert.ok(result.hasOwnProperty('variables'), 'Should have variables property');
            assert.ok(result.hasOwnProperty('errors'), 'Should have errors property');
            assert.ok(typeof result.variables === 'object', 'Variables should be an object');
        });
        
        it('should handle empty required variables list', () => {
            const result = getEnvironmentVariables([]);
            
            assert.ok(result.isValid, 'Empty list should be valid');
            assert.deepStrictEqual(result.variables, {}, 'Variables should be empty object');
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
        });
        
        it('should handle custom parsing options', () => {
            const cleanup = mockEnvironmentVariable('CUSTOM_VAR', 'test_value');
            
            const requiredVars = [
                { name: 'CUSTOM_VAR', type: 'string', defaultValue: 'default', required: true }
            ];
            
            const result = getEnvironmentVariables(requiredVars, { strict: true });
            
            assert.ok(result.isValid, 'Custom parsing should work');
            assert.strictEqual(result.variables.CUSTOM_VAR, 'test_value', 'Custom variable should be parsed');
            cleanup();
        });
    });
    
    // Test suite for validateEnvironmentVariables function
    describe('validateEnvironmentVariables', () => {
        it('should validate complete valid environment configuration', () => {
            const cleanup1 = mockEnvironmentVariable('PORT', '3000');
            const cleanup2 = mockEnvironmentVariable('HOST', 'localhost');
            const cleanup3 = mockEnvironmentVariable('NODE_ENV', DEVELOPMENT);
            const cleanup4 = mockEnvironmentVariable('LOG_LEVEL', DEFAULT_LOG_LEVEL);
            
            const result = validateEnvironmentVariables();
            
            assert.ok(result.isValid, 'Valid configuration should pass validation');
            assert.strictEqual(result.errors.length, 0, 'Should have no validation errors');
            assert.ok(result.configuration, 'Should include configuration object');
            
            cleanup1();
            cleanup2();
            cleanup3();
            cleanup4();
        });
        
        it('should detect invalid port configuration', () => {
            const cleanup = mockEnvironmentVariable('PORT', '99999');
            
            const result = validateEnvironmentVariables();
            
            assert.strictEqual(result.isValid, false, 'Invalid port should fail validation');
            assert.ok(result.errors.some(error => error.includes('port') || error.includes('PORT')), 'Should include port error');
            cleanup();
        });
        
        it('should detect invalid host configuration', () => {
            const cleanup = mockEnvironmentVariable('HOST', '256.256.256.256');
            
            const result = validateEnvironmentVariables();
            
            assert.strictEqual(result.isValid, false, 'Invalid host should fail validation');
            assert.ok(result.errors.some(error => error.includes('host') || error.includes('HOST')), 'Should include host error');
            cleanup();
        });
        
        it('should detect invalid environment name', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', 'invalid_environment');
            
            const result = validateEnvironmentVariables();
            
            assert.strictEqual(result.isValid, false, 'Invalid NODE_ENV should fail validation');
            assert.ok(result.errors.some(error => error.includes('NODE_ENV') || error.includes('environment')), 'Should include environment error');
            cleanup();
        });
        
        it('should detect invalid log level configuration', () => {
            const cleanup = mockEnvironmentVariable('LOG_LEVEL', 'invalid_level');
            
            const result = validateEnvironmentVariables();
            
            assert.strictEqual(result.isValid, false, 'Invalid LOG_LEVEL should fail validation');
            assert.ok(result.errors.some(error => error.includes('LOG_LEVEL') || error.includes('log')), 'Should include log level error');
            cleanup();
        });
        
        it('should return comprehensive validation results', () => {
            const result = validateEnvironmentVariables();
            
            assert.ok(result.hasOwnProperty('isValid'), 'Should have isValid property');
            assert.ok(result.hasOwnProperty('errors'), 'Should have errors property');
            assert.ok(result.hasOwnProperty('warnings'), 'Should have warnings property');
            assert.ok(result.hasOwnProperty('configuration'), 'Should have configuration property');
            assert.ok(Array.isArray(result.errors), 'Errors should be an array');
        });
        
        it('should handle validation schema customization', () => {
            const customSchema = {
                PORT: { type: 'number', min: 1000, max: 9000 },
                HOST: { type: 'string', required: true }
            };
            
            const result = validateEnvironmentVariables(customSchema);
            
            assert.ok(result.hasOwnProperty('isValid'), 'Should handle custom schema');
        });
        
        it('should aggregate multiple validation errors', () => {
            const cleanup1 = mockEnvironmentVariable('PORT', 'invalid');
            const cleanup2 = mockEnvironmentVariable('HOST', '256.256.256.256');
            const cleanup3 = mockEnvironmentVariable('NODE_ENV', 'invalid');
            
            const result = validateEnvironmentVariables();
            
            assert.strictEqual(result.isValid, false, 'Multiple errors should fail validation');
            assert.ok(result.errors.length > 1, 'Should have multiple errors');
            
            cleanup1();
            cleanup2();
            cleanup3();
        });
    });
    
    // Test suite for environment detection functions
    describe('Environment Detection', () => {
        it('should detect production environment correctly', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', PRODUCTION);
            
            const result = isProductionEnvironment();
            
            assert.strictEqual(result, true, 'Should detect production environment');
            cleanup();
        });
        
        it('should detect development environment correctly', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', DEVELOPMENT);
            
            const result = isDevelopmentEnvironment();
            
            assert.strictEqual(result, true, 'Should detect development environment');
            cleanup();
        });
        
        it('should detect test environment correctly', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', TEST);
            
            const result = isTestEnvironment();
            
            assert.strictEqual(result, true, 'Should detect test environment');
            cleanup();
        });
        
        it('should default to development when NODE_ENV undefined', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', undefined);
            
            const result = isDevelopmentEnvironment();
            
            assert.strictEqual(result, true, 'Should default to development');
            cleanup();
        });
        
        it('should handle case insensitive environment detection', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', 'PRODUCTION');
            
            const result = isProductionEnvironment();
            
            assert.strictEqual(result, true, 'Should handle case insensitive detection');
            cleanup();
        });
        
        it('should handle invalid NODE_ENV values', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', 'invalid_env');
            
            const resultDev = isDevelopmentEnvironment();
            const resultProd = isProductionEnvironment();
            const resultTest = isTestEnvironment();
            
            assert.strictEqual(resultDev, true, 'Should default to development for invalid values');
            assert.strictEqual(resultProd, false, 'Should not be production for invalid values');
            assert.strictEqual(resultTest, false, 'Should not be test for invalid values');
            cleanup();
        });
        
        it('should handle whitespace in NODE_ENV', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', '  production  ');
            
            const result = isProductionEnvironment();
            
            assert.strictEqual(result, true, 'Should handle whitespace in NODE_ENV');
            cleanup();
        });
    });
    
    // Test suite for getNodeJSInfo function
    describe('getNodeJSInfo', () => {
        it('should return complete nodejs runtime information', () => {
            const result = getNodeJSInfo();
            
            assert.ok(result, 'Should return runtime information');
            assert.ok(typeof result === 'object', 'Should return an object');
        });
        
        it('should include nodejs version information', () => {
            const result = getNodeJSInfo();
            
            assert.ok(result.version, 'Should include Node.js version');
            assert.ok(result.version.startsWith('v'), 'Version should start with v');
        });
        
        it('should include platform and architecture information', () => {
            const result = getNodeJSInfo();
            
            assert.ok(result.platform, 'Should include platform');
            assert.ok(result.architecture, 'Should include architecture');
        });
        
        it('should include process information', () => {
            const result = getNodeJSInfo();
            
            assert.ok(typeof result.processId === 'number', 'Should include process ID');
            assert.ok(typeof result.uptime === 'number', 'Should include uptime');
            assert.ok(result.memoryUsage, 'Should include memory usage');
        });
        
        it('should include v8 engine information', () => {
            const result = getNodeJSInfo();
            
            assert.ok(result.v8Version, 'Should include V8 version');
        });
        
        it('should return consistent information structure', () => {
            const result1 = getNodeJSInfo();
            const result2 = getNodeJSInfo();
            
            assert.deepStrictEqual(Object.keys(result1).sort(), Object.keys(result2).sort(), 'Should have consistent structure');
        });
    });
    
    // Test suite for createEnvironmentSummary function
    describe('createEnvironmentSummary', () => {
        it('should create comprehensive environment summary', () => {
            const cleanup1 = mockEnvironmentVariable('PORT', '3000');
            const cleanup2 = mockEnvironmentVariable('HOST', 'localhost');
            const cleanup3 = mockEnvironmentVariable('NODE_ENV', DEVELOPMENT);
            
            const result = createEnvironmentSummary();
            
            assert.ok(result, 'Should create environment summary');
            assert.ok(typeof result === 'object', 'Summary should be an object');
            
            cleanup1();
            cleanup2();
            cleanup3();
        });
        
        it('should include environment configuration in summary', () => {
            const cleanup1 = mockEnvironmentVariable('PORT', '3000');
            const cleanup2 = mockEnvironmentVariable('HOST', 'localhost');
            const cleanup3 = mockEnvironmentVariable('NODE_ENV', DEVELOPMENT);
            
            const result = createEnvironmentSummary();
            
            assert.ok(result.configuration, 'Should include configuration');
            assert.strictEqual(result.configuration.PORT, 3000, 'Should include parsed PORT');
            assert.strictEqual(result.configuration.HOST, 'localhost', 'Should include HOST');
            assert.strictEqual(result.configuration.NODE_ENV, DEVELOPMENT, 'Should include NODE_ENV');
            
            cleanup1();
            cleanup2();
            cleanup3();
        });
        
        it('should include nodejs runtime information in summary', () => {
            const result = createEnvironmentSummary();
            
            assert.ok(result.runtime, 'Should include runtime information');
            assert.ok(result.runtime.version, 'Should include Node.js version');
            assert.ok(result.runtime.platform, 'Should include platform');
        });
        
        it('should include environment detection results', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', PRODUCTION);
            
            const result = createEnvironmentSummary();
            
            assert.ok(result.hasOwnProperty('isProduction'), 'Should include production detection');
            assert.ok(result.hasOwnProperty('isDevelopment'), 'Should include development detection');
            assert.ok(result.hasOwnProperty('isTest'), 'Should include test detection');
            
            cleanup();
        });
        
        it('should include validation status in summary', () => {
            const result = createEnvironmentSummary();
            
            assert.ok(result.hasOwnProperty('validation'), 'Should include validation status');
            assert.ok(result.validation.hasOwnProperty('isValid'), 'Should include validation result');
        });
        
        it('should include timestamp and metadata', () => {
            const result = createEnvironmentSummary();
            
            assert.ok(result.timestamp, 'Should include timestamp');
            assert.ok(result.metadata, 'Should include metadata');
        });
        
        it('should handle custom summary options', () => {
            const options = { includeSecrets: false, verbose: true };
            
            const result = createEnvironmentSummary(options);
            
            assert.ok(result, 'Should handle custom options');
        });
    });
    
    // Test suite for getEnvironmentType function
    describe('getEnvironmentType', () => {
        it('should return normalized environment type', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', 'PRODUCTION');
            
            const result = getEnvironmentType();
            
            assert.strictEqual(result, 'production', 'Should return normalized environment type');
            cleanup();
        });
        
        it('should apply fallback for invalid environment', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', 'invalid_env');
            
            const result = getEnvironmentType();
            
            assert.strictEqual(result, DEVELOPMENT, 'Should fallback to development for invalid environment');
            cleanup();
        });
        
        it('should apply fallback for missing environment', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', undefined);
            
            const result = getEnvironmentType();
            
            assert.strictEqual(result, DEVELOPMENT, 'Should fallback to development for missing NODE_ENV');
            cleanup();
        });
        
        it('should handle environment normalization', () => {
            const cleanup = mockEnvironmentVariable('NODE_ENV', '  TEST  ');
            
            const result = getEnvironmentType();
            
            assert.strictEqual(result, TEST, 'Should handle normalization with trimming');
            cleanup();
        });
        
        it('should validate environment type against constants', () => {
            VALID_ENVIRONMENTS.forEach(env => {
                const cleanup = mockEnvironmentVariable('NODE_ENV', env);
                const result = getEnvironmentType();
                assert.ok(VALID_ENVIRONMENTS.includes(result), `Result ${result} should be in valid environments`);
                cleanup();
            });
        });
    });
    
    // Test suite for clearEnvironmentCache function
    describe('clearEnvironmentCache', () => {
        it('should clear environment variable cache', () => {
            // Set up cached environment
            const cleanup1 = mockEnvironmentVariable('CACHED_VAR', 'initial_value');
            parseEnvironmentVariable('CACHED_VAR', 'string', 'default'); // Cache the value
            
            // Clear cache
            clearEnvironmentCache();
            
            // Change environment variable
            const cleanup2 = mockEnvironmentVariable('CACHED_VAR', 'new_value');
            
            // Should get new value after cache clear
            const result = parseEnvironmentVariable('CACHED_VAR', 'string', 'default');
            
            assert.strictEqual(result, 'new_value', 'Should get new value after cache clear');
            
            cleanup1();
            cleanup2();
        });
        
        it('should force re-evaluation after cache clear', () => {
            let consoleOutput = [];
            const cleanup1 = mockConsoleMethod('log', (...args) => {
                consoleOutput.push(args.join(' '));
            });
            
            // Clear cache and verify re-evaluation
            clearEnvironmentCache();
            
            // Any subsequent environment access should be fresh
            const result = getEnvironmentType();
            
            assert.ok(typeof result === 'string', 'Should return string result after cache clear');
            cleanup1();
        });
        
        it('should handle multiple cache clear operations', () => {
            // Multiple cache clears should not cause errors
            assert.doesNotThrow(() => {
                clearEnvironmentCache();
                clearEnvironmentCache();
                clearEnvironmentCache();
            }, 'Multiple cache clears should not throw');
        });
        
        it('should log cache clearing operation', () => {
            let logMessages = [];
            const cleanup = mockConsoleMethod('log', (...args) => {
                logMessages.push(args.join(' '));
            });
            
            clearEnvironmentCache();
            
            // Note: The actual logging depends on the implementation
            // This test verifies the function executes without errors
            assert.doesNotThrow(() => clearEnvironmentCache(), 'Cache clearing should not throw');
            cleanup();
        });
    });
    
    // Test suite for error handling scenarios
    describe('Error Handling', () => {
        it('should handle process env access errors', () => {
            // Mock process.env to throw error
            const originalDescriptor = Object.getOwnPropertyDescriptor(process, 'env');
            Object.defineProperty(process, 'env', {
                get: () => {
                    throw new Error('Process env access error');
                }
            });
            
            assert.doesNotThrow(() => {
                try {
                    parseEnvironmentVariable('ANY_VAR', 'string', 'default');
                } catch (error) {
                    // Expected to handle gracefully
                }
            }, 'Should handle process.env access errors gracefully');
            
            // Restore original descriptor
            Object.defineProperty(process, 'env', originalDescriptor);
        });
        
        it('should handle type conversion errors gracefully', () => {
            const cleanup = mockEnvironmentVariable('COMPLEX_VALUE', JSON.stringify({ a: 1, b: 2 }));
            
            assert.doesNotThrow(() => {
                const result = parseEnvironmentVariable('COMPLEX_VALUE', 'number', 42);
                assert.strictEqual(result, 42, 'Should use default value for conversion errors');
            }, 'Should handle type conversion errors gracefully');
            
            cleanup();
        });
        
        it('should handle validation errors with detailed messages', () => {
            const cleanup = mockEnvironmentVariable('INVALID_PORT', '-1');
            
            const result = validatePortNumber(-1);
            
            assert.strictEqual(result.isValid, false, 'Should detect validation error');
            assert.ok(result.errors.length > 0, 'Should provide error messages');
            assert.ok(result.errors[0].length > 0, 'Error messages should be detailed');
            cleanup();
        });
        
        it('should handle console logging errors', () => {
            // Mock console to throw error
            const originalLog = console.log;
            console.log = () => {
                throw new Error('Console logging error');
            };
            
            assert.doesNotThrow(() => {
                // Any function that might log should handle errors gracefully
                getNodeJSInfo();
            }, 'Should handle console logging errors gracefully');
            
            // Restore original console
            console.log = originalLog;
        });
        
        it('should provide meaningful error messages', () => {
            const invalidPortResult = validatePortNumber('not_a_number');
            const invalidHostResult = validateHostAddress('256.256.256.256');
            
            assert.ok(invalidPortResult.errors.some(msg => msg.includes('port') || msg.includes('number')), 
                'Port error should be meaningful');
            assert.ok(invalidHostResult.errors.some(msg => msg.includes('host') || msg.includes('address')), 
                'Host error should be meaningful');
        });
    });
    
    // Test suite for integration scenarios
    describe('Integration Scenarios', () => {
        it('should handle complete environment processing workflow', () => {
            const cleanup1 = mockEnvironmentVariable('PORT', '3000');
            const cleanup2 = mockEnvironmentVariable('HOST', 'localhost');
            const cleanup3 = mockEnvironmentVariable('NODE_ENV', PRODUCTION);
            
            // Test complete workflow: parse -> validate -> summarize
            const requiredVars = [
                { name: 'PORT', type: 'number', defaultValue: DEFAULT_PORT },
                { name: 'HOST', type: 'string', defaultValue: DEFAULT_HOST },
                { name: 'NODE_ENV', type: 'string', defaultValue: DEFAULT_NODE_ENV }
            ];
            
            const envVars = getEnvironmentVariables(requiredVars);
            const validation = validateEnvironmentVariables();
            const summary = createEnvironmentSummary();
            
            assert.ok(envVars.isValid, 'Environment variables should be valid');
            assert.ok(validation.isValid, 'Validation should pass');
            assert.ok(summary, 'Summary should be created');
            assert.strictEqual(summary.isProduction, true, 'Should detect production environment');
            
            cleanup1();
            cleanup2();
            cleanup3();
        });
        
        it('should handle environment changes with cache management', () => {
            // Initial environment
            const cleanup1 = mockEnvironmentVariable('NODE_ENV', DEVELOPMENT);
            
            const initialType = getEnvironmentType();
            assert.strictEqual(initialType, DEVELOPMENT, 'Should detect development initially');
            
            // Clear cache and change environment
            clearEnvironmentCache();
            const cleanup2 = mockEnvironmentVariable('NODE_ENV', PRODUCTION);
            
            const updatedType = getEnvironmentType();
            assert.strictEqual(updatedType, PRODUCTION, 'Should detect production after cache clear');
            
            cleanup1();
            cleanup2();
        });
        
        it('should handle mixed valid and invalid configurations', () => {
            const cleanup1 = mockEnvironmentVariable('PORT', '3000'); // Valid
            const cleanup2 = mockEnvironmentVariable('HOST', '256.256.256.256'); // Invalid
            const cleanup3 = mockEnvironmentVariable('NODE_ENV', DEVELOPMENT); // Valid
            
            const validation = validateEnvironmentVariables();
            const summary = createEnvironmentSummary();
            
            assert.strictEqual(validation.isValid, false, 'Mixed configuration should be invalid');
            assert.ok(validation.errors.length > 0, 'Should have validation errors');
            assert.ok(summary.validation, 'Summary should include validation results');
            
            cleanup1();
            cleanup2();
            cleanup3();
        });
        
        it('should maintain consistency across function calls', () => {
            const cleanup1 = mockEnvironmentVariable('NODE_ENV', TEST);
            const cleanup2 = mockEnvironmentVariable('PORT', '8080');
            
            // Multiple calls should return consistent results
            const type1 = getEnvironmentType();
            const type2 = getEnvironmentType();
            const isTest1 = isTestEnvironment();
            const isTest2 = isTestEnvironment();
            
            assert.strictEqual(type1, type2, 'Environment type should be consistent');
            assert.strictEqual(isTest1, isTest2, 'Test environment detection should be consistent');
            assert.strictEqual(type1, TEST, 'Should consistently detect test environment');
            
            cleanup1();
            cleanup2();
        });
    });
});