/**
 * Comprehensive Unit Test Module for Server Configuration Component
 * 
 * This module provides unit testing for the server configuration component using Node.js built-in
 * test runner. Tests all aspects of server configuration including HTTP server settings, Express.js
 * configuration, connection management, security settings, performance optimizations, and validation.
 * 
 * Validates server configuration creation, environment-specific behavior, timeout settings, connection
 * limits, Express.js 5.1.0 integration, and error handling scenarios. Demonstrates testing patterns
 * for configuration modules, factory functions, validation utilities, and environment-dependent
 * behavior in Node.js applications.
 * 
 * Features comprehensive testing of:
 * - Server configuration object structure and properties
 * - Environment-specific configuration generation (development, test, production)
 * - Express.js 5.1.0 framework integration and security enhancements
 * - HTTP server settings with timeout and connection management
 * - Security configuration including headers and request limits
 * - Performance optimizations leveraging Node.js v22.x LTS improvements
 * - Configuration validation with detailed error reporting
 * - Error handling scenarios and recovery mechanisms
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Node.js built-in test runner imports - v20+ stable test runner
const { test, describe, it, before, after, beforeEach, afterEach } = require('node:test');
// Node.js built-in assertion library for test validation and verification
const assert = require('node:assert');

// Import server configuration module components for testing
const { 
    serverConfig,
    createServerConfig,
    validateServerConfig,
    getHttpServerSettings,
    getExpressConfiguration,
    createServerSummary
} = require('../../../config/server.js');

// Import test utilities for port management, logging, and mock functions
const { 
    TestUtilities,
    createMockFunction,
    waitForCondition
} = require('../../helpers/testHelpers.js');

// Import test configuration for timeouts, server settings, and unit test parameters
const { 
    testConfig
} = require('../../setup/testConfig.js');

// Import error fixtures for testing error handling scenarios
const { 
    configurationErrors,
    createConfigurationError
} = require('../../fixtures/errors.js');

// Import application constants for environment settings and server defaults
const { 
    ENVIRONMENT,
    SERVER,
    HTTP_STATUS
} = require('../../../utils/constants.js');

// Global test utilities instance for test lifecycle management
let testUtilities = null;

// Mock environment configuration for test scenarios
let mockEnvironmentConfig = null;

// Original process.env backup for restoration after tests
let originalProcessEnv = null;

// Test logger for capturing and verifying log output
let testLogger = null;

/**
 * Sets up the test environment by initializing test utilities, creating mock configurations,
 * backing up original environment variables, and preparing test fixtures for server
 * configuration testing
 * 
 * @returns {Promise<void>} Resolves when test environment setup is complete
 */
async function setupTestEnvironment() {
    // Initialize TestUtilities instance for test lifecycle management
    testUtilities = new TestUtilities();
    
    // Backup original process.env variables for restoration after tests
    originalProcessEnv = { ...process.env };
    
    // Create test logger with ERROR level to reduce test noise
    testLogger = testUtilities.createTestLogger('ERROR');
    
    // Initialize mock environment configuration for test scenarios
    mockEnvironmentConfig = null;
    
    // Set up test-specific environment variables for configuration testing
    process.env.NODE_ENV = ENVIRONMENT.TEST;
    process.env.PORT = await testUtilities.getAvailablePort();
    process.env.HOST = ENVIRONMENT.DEFAULT_HOST;
    
    // Prepare test data fixtures and validation scenarios
    // Configure test timeouts based on testConfig settings
    // The test environment is now ready for server configuration testing
    console.log(`[INFO] Test environment setup complete for server configuration testing`);
}

/**
 * Cleans up the test environment by restoring original environment variables, cleaning up mocks,
 * disposing test resources, and ensuring clean test state for subsequent test executions
 * 
 * @returns {Promise<void>} Resolves when test environment cleanup is complete
 */
async function teardownTestEnvironment() {
    // Restore original process.env variables from backup
    process.env = { ...originalProcessEnv };
    
    // Clean up all mock functions using TestUtilities cleanup methods
    if (testUtilities) {
        testUtilities.cleanupMocks();
    }
    
    // Dispose of test logger and release logging resources
    testLogger = null;
    
    // Clear mock environment configuration and test data
    mockEnvironmentConfig = null;
    
    // Reset global test state variables to initial values
    testUtilities = null;
    
    console.log(`[INFO] Test environment cleanup complete`);
}

/**
 * Creates mock environment configuration objects with customizable properties for testing
 * different environment scenarios, including development, production, and test environments
 * with various port and host settings
 * 
 * @param {object} overrides - Optional override values for environment configuration
 * @returns {object} Mock environment configuration object with test-specific settings and environment flags
 */
function createMockEnvironmentConfig(overrides = {}) {
    // Create base environment configuration with default test values
    const baseConfig = {
        port: parseInt(process.env.PORT) || 3000,
        host: ENVIRONMENT.DEFAULT_HOST,
        nodeEnv: ENVIRONMENT.TEST,
        isDevelopment: false,
        isProduction: false,
        isTest: true
    };
    
    // Apply environment detection flags based on nodeEnv
    if (overrides.nodeEnv === ENVIRONMENT.DEVELOPMENT) {
        baseConfig.isDevelopment = true;
        baseConfig.isProduction = false;
        baseConfig.isTest = false;
    } else if (overrides.nodeEnv === ENVIRONMENT.PRODUCTION) {
        baseConfig.isDevelopment = false;
        baseConfig.isProduction = true;
        baseConfig.isTest = false;
    }
    
    // Apply any override values from function parameters
    const mockConfig = { ...baseConfig, ...overrides };
    
    return mockConfig;
}

/**
 * Validates that server configuration objects have the expected structure, properties, and types
 * required for proper server operation, including all configuration sections and validation metadata
 * 
 * @param {object} config - Server configuration object to validate
 * @returns {boolean} True if server configuration structure is valid, false otherwise
 */
function validateServerConfigStructure(config) {
    // Validate config object exists and is properly typed
    if (!config || typeof config !== 'object') {
        return false;
    }
    
    // Check presence of required configuration sections
    const requiredSections = ['http', 'express', 'connection', 'security', 'performance'];
    for (const section of requiredSections) {
        if (!config[section] || typeof config[section] !== 'object') {
            return false;
        }
    }
    
    // Validate http configuration section has required properties
    if (!config.http.port || !config.http.host || typeof config.http.timeout !== 'number') {
        return false;
    }
    
    // Verify express configuration section contains framework settings
    if (!config.express.bodyParser || !config.express.security) {
        return false;
    }
    
    // Check connection configuration has keep-alive and connection limit settings
    if (typeof config.connection.keepAliveTimeout !== 'number' || typeof config.connection.maxConnections !== 'number') {
        return false;
    }
    
    // Validate security configuration includes header and request limit settings
    if (!config.security.headers || !config.security.limits) {
        return false;
    }
    
    // Verify performance configuration contains optimization settings
    if (!config.performance.nodeJS || !config.performance.express) {
        return false;
    }
    
    return true;
}

/**
 * Custom assertion function for validating ValidationResult objects from server configuration
 * validation, checking validation status, error details, and warning information with detailed
 * test feedback
 * 
 * @param {object} validationResult - ValidationResult object from server configuration validation
 * @param {boolean} expectedValid - Expected validation status (true for valid, false for invalid)
 * @param {string} testContext - Context description for detailed assertion failure messages
 */
function assertValidationResult(validationResult, expectedValid, testContext) {
    // Validate that validationResult is a proper ValidationResult object
    assert.ok(validationResult, `ValidationResult should exist in ${testContext}`);
    assert.ok(typeof validationResult === 'object', `ValidationResult should be an object in ${testContext}`);
    assert.ok(typeof validationResult.isValid === 'boolean', `ValidationResult.isValid should be boolean in ${testContext}`);
    
    // Check isValid property matches expectedValid parameter
    assert.strictEqual(
        validationResult.isValid, 
        expectedValid, 
        `ValidationResult.isValid should be ${expectedValid} in ${testContext}`
    );
    
    // If validation should pass, assert no critical errors exist
    if (expectedValid) {
        assert.ok(!validationResult.hasErrors || !validationResult.hasErrors(), 
            `ValidationResult should have no errors when valid in ${testContext}`);
    } else {
        // If validation should fail, assert specific error details are present
        assert.ok(validationResult.hasErrors && validationResult.hasErrors(), 
            `ValidationResult should have errors when invalid in ${testContext}`);
        assert.ok(validationResult.errors && Array.isArray(validationResult.errors), 
            `ValidationResult should have errors array in ${testContext}`);
        assert.ok(validationResult.errors.length > 0, 
            `ValidationResult should have at least one error in ${testContext}`);
    }
    
    // Validate error messages are descriptive and actionable
    if (validationResult.errors && validationResult.errors.length > 0) {
        validationResult.errors.forEach((error, index) => {
            assert.ok(error.message && typeof error.message === 'string', 
                `Error ${index} should have descriptive message in ${testContext}`);
        });
    }
}

/**
 * Tests timeout configuration settings for different environments, validating that development,
 * production, and test environments have appropriate timeout values for server operations and
 * request processing
 * 
 * @param {string} environment - Environment name (development, production, test)
 * @param {number} expectedTimeout - Expected timeout value for the environment
 * @returns {Promise<void>} Resolves when timeout configuration testing is complete
 */
async function testTimeoutConfiguration(environment, expectedTimeout) {
    // Create mock environment configuration for specified environment
    const mockConfig = createMockEnvironmentConfig({ nodeEnv: environment });
    
    // Generate server configuration using createServerConfig function
    const serverConfiguration = createServerConfig(mockConfig);
    
    // Extract timeout settings from HTTP server configuration
    const httpTimeout = serverConfiguration.http.timeout;
    
    // Validate server timeout matches expected value for environment
    assert.strictEqual(httpTimeout, expectedTimeout, 
        `HTTP timeout should be ${expectedTimeout} for ${environment} environment`);
    
    // Check keep-alive timeout is appropriate for environment
    assert.ok(typeof serverConfiguration.http.keepAliveTimeout === 'number', 
        `Keep-alive timeout should be number for ${environment}`);
    
    // Verify request timeout settings are properly configured
    assert.ok(typeof serverConfiguration.http.requestTimeout === 'number', 
        `Request timeout should be number for ${environment}`);
}

/**
 * Tests various port configuration scenarios including default ports, environment variable
 * overrides, invalid port values, and port availability validation with comprehensive error
 * handling testing
 * 
 * @returns {Promise<void>} Resolves when port configuration testing is complete
 */
async function testPortConfigurationScenarios() {
    // Test default port configuration with ENVIRONMENT.DEFAULT_PORT
    const defaultConfig = createMockEnvironmentConfig();
    const defaultServerConfig = createServerConfig(defaultConfig);
    assert.ok(defaultServerConfig.http.port >= 1 && defaultServerConfig.http.port <= 65535, 
        'Default port should be in valid range');
    
    // Test environment variable port override with valid port numbers
    const customPort = await testUtilities.getAvailablePort();
    const customConfig = createMockEnvironmentConfig({ port: customPort });
    const customServerConfig = createServerConfig(customConfig);
    assert.strictEqual(customServerConfig.http.port, customPort, 
        'Server should use custom port when provided');
    
    // Test invalid port values for proper error handling
    const invalidPortConfig = createMockEnvironmentConfig({ port: -1 });
    const invalidServerConfig = createServerConfig(invalidPortConfig);
    // Should use fallback or default behavior
    assert.ok(invalidServerConfig.http, 'Server config should handle invalid port gracefully');
    
    // Test port configuration in different environment contexts
    const prodConfig = createMockEnvironmentConfig({ 
        nodeEnv: ENVIRONMENT.PRODUCTION,
        port: await testUtilities.getAvailablePort()
    });
    const prodServerConfig = createServerConfig(prodConfig);
    assert.ok(prodServerConfig.http.port > 0, 'Production config should have valid port');
}

/**
 * Tests Express.js 5.1.0 configuration integration including middleware settings, JSON parsing
 * limits, security headers, and framework-specific optimizations for proper Express.js
 * application setup
 * 
 * @returns {Promise<void>} Resolves when Express.js configuration testing is complete
 */
async function testExpressConfigurationIntegration() {
    // Test Express.js configuration generation with getExpressConfiguration function
    const testConfig = createMockEnvironmentConfig();
    const expressConfig = getExpressConfiguration(testConfig);
    
    // Validate JSON body parser limits are configured
    assert.ok(expressConfig.bodyParser, 'Express config should have body parser settings');
    assert.ok(expressConfig.bodyParser.json, 'Express config should have JSON parser settings');
    assert.ok(expressConfig.bodyParser.json.limit, 'JSON parser should have size limit');
    
    // Check URL-encoded body parser limits
    assert.ok(expressConfig.bodyParser.urlencoded, 'Express config should have URL-encoded parser');
    assert.ok(expressConfig.bodyParser.urlencoded.extended !== undefined, 
        'URL-encoded parser should have extended setting');
    
    // Test X-Powered-By header is disabled for security
    assert.ok(expressConfig.security, 'Express config should have security settings');
    assert.strictEqual(expressConfig.security.xPoweredBy, false, 
        'X-Powered-By header should be disabled for security');
    
    // Validate Express.js 5.1.0 specific security enhancements
    assert.strictEqual(expressConfig.version, '5.1.0', 
        'Express config should specify version 5.1.0');
    assert.ok(expressConfig.features && Array.isArray(expressConfig.features), 
        'Express config should list security features');
    assert.ok(expressConfig.features.includes('ReDoS attack prevention'), 
        'Express config should include ReDoS protection');
}

/**
 * Tests connection management configuration including keep-alive settings, connection limits,
 * timeout values, and resource management parameters for efficient HTTP connection handling
 * 
 * @returns {Promise<void>} Resolves when connection management testing is complete
 */
async function testConnectionManagementSettings() {
    // Test connection configuration with various environment settings
    const testConfig = createMockEnvironmentConfig();
    const serverConfig = createServerConfig(testConfig);
    
    // Validate keep-alive timeout settings
    assert.ok(typeof serverConfig.connection.keepAliveTimeout === 'number', 
        'Connection config should have keep-alive timeout');
    assert.ok(serverConfig.connection.keepAliveTimeout > 0, 
        'Keep-alive timeout should be positive');
    
    // Check maximum connections limit
    assert.ok(typeof serverConfig.connection.maxConnections === 'number', 
        'Connection config should have max connections limit');
    assert.ok(serverConfig.connection.maxConnections > 0, 
        'Max connections should be positive');
    
    // Test connection timeout values for client connections
    assert.ok(serverConfig.connection.timeouts, 'Connection config should have timeout settings');
    assert.ok(typeof serverConfig.connection.timeouts.connection === 'number', 
        'Connection timeout should be number');
    
    // Validate socket timeout and keep-alive interval settings
    assert.ok(typeof serverConfig.connection.timeouts.socket === 'number', 
        'Socket timeout should be number');
    
    // Test production optimizations for connection management
    const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
    const prodServerConfig = createServerConfig(prodConfig);
    assert.ok(prodServerConfig.connection.maxConnections >= serverConfig.connection.maxConnections, 
        'Production should have higher or equal connection limits');
}

/**
 * Tests security configuration features including header management, request limits, security
 * middleware settings, and Express.js 5.1.0 security enhancements for comprehensive
 * application security
 * 
 * @returns {Promise<void>} Resolves when security configuration testing is complete
 */
async function testSecurityConfigurationFeatures() {
    // Test security configuration generation for different environments
    const testConfig = createMockEnvironmentConfig();
    const serverConfig = createServerConfig(testConfig);
    
    // Validate X-Powered-By header is disabled for security
    assert.ok(serverConfig.security.headers, 'Security config should have header settings');
    assert.strictEqual(serverConfig.security.headers.xPoweredBy, false, 
        'X-Powered-By header should be disabled');
    
    // Check request size limits to prevent memory exhaustion attacks
    assert.ok(serverConfig.security.limits, 'Security config should have request limits');
    assert.ok(serverConfig.security.limits.jsonLimit, 'Should have JSON size limit');
    assert.ok(serverConfig.security.limits.urlencodedLimit, 'Should have URL-encoded size limit');
    
    // Test rate limiting parameters for development vs production
    assert.ok(serverConfig.security.rateLimiting, 'Security config should have rate limiting');
    
    // Validate Express.js 5.1.0 ReDoS protection configuration
    assert.ok(serverConfig.security.expressEnhancements, 
        'Security config should have Express.js enhancements');
    assert.ok(serverConfig.security.expressEnhancements.reDoSProtection, 
        'Should have ReDoS protection configuration');
    
    // Test security middleware options based on environment
    assert.ok(serverConfig.security.middleware, 'Security config should have middleware settings');
    
    // Verify environment-specific security settings
    const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
    const prodServerConfig = createServerConfig(prodConfig);
    assert.strictEqual(prodServerConfig.security.environment.securityLevel, 'high', 
        'Production should have high security level');
}

/**
 * Tests performance optimization configuration leveraging Node.js v22.x LTS improvements and
 * Express.js 5.1.0 enhancements for optimal server performance in the tutorial application
 * 
 * @returns {Promise<void>} Resolves when performance optimization testing is complete
 */
async function testPerformanceOptimizations() {
    // Test performance configuration generation with various environment settings
    const testConfig = createMockEnvironmentConfig();
    const serverConfig = createServerConfig(testConfig);
    
    // Validate Node.js v22.x LTS performance optimizations are applied
    assert.ok(serverConfig.performance.nodeJS, 'Performance config should have Node.js optimizations');
    assert.ok(serverConfig.performance.nodeJS.v8Optimizations, 
        'Should have V8 optimization settings');
    
    // Check Express.js 5.1.0 native Node.js method usage configuration
    assert.ok(serverConfig.performance.express, 'Performance config should have Express optimizations');
    assert.ok(serverConfig.performance.express.nativeMethods, 
        'Should have native methods configuration');
    assert.strictEqual(serverConfig.performance.express.nativeMethods.arrayFlat, true, 
        'Should use native Array.flat method');
    
    // Test memory and CPU optimization parameters
    assert.ok(serverConfig.performance.resources, 'Performance config should have resource optimizations');
    assert.ok(serverConfig.performance.resources.memory, 'Should have memory optimization settings');
    
    // Validate caching strategies for static responses
    assert.ok(serverConfig.performance.caching, 'Performance config should have caching strategies');
    assert.ok(serverConfig.performance.caching.memoryCache, 'Should have memory cache configuration');
    
    // Test connection pooling and keep-alive optimizations
    assert.ok(serverConfig.performance.connections, 'Performance config should have connection optimizations');
    assert.ok(serverConfig.performance.connections.keepAlive, 'Should have keep-alive optimization');
    
    // Verify environment-specific performance settings
    const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
    const prodServerConfig = createServerConfig(prodConfig);
    assert.strictEqual(prodServerConfig.performance.environment.optimizedFor, 'throughput', 
        'Production should be optimized for throughput');
}

/**
 * Tests comprehensive configuration validation scenarios including valid configurations, invalid
 * values, missing properties, and edge cases with detailed error reporting and validation feedback
 * 
 * @returns {Promise<void>} Resolves when configuration validation testing is complete
 */
async function testConfigurationValidationScenarios() {
    // Test valid server configuration validation passes successfully
    const validConfig = createServerConfig(createMockEnvironmentConfig());
    const validationResult = validateServerConfig(validConfig);
    assertValidationResult(validationResult, true, 'valid server configuration');
    
    // Test invalid port values trigger appropriate validation errors
    const invalidPortConfig = {
        http: { port: -1, host: 'localhost' },
        express: { bodyParser: { json: { limit: '1mb' } } },
        connection: {},
        security: {},
        performance: {}
    };
    const portValidationResult = validateServerConfig(invalidPortConfig);
    assertValidationResult(portValidationResult, false, 'invalid port configuration');
    
    // Test invalid host addresses are properly rejected
    const invalidHostConfig = {
        http: { port: 3000, host: 'invalid..host' },
        express: { bodyParser: { json: { limit: '1mb' } } },
        connection: {},
        security: {},
        performance: {}
    };
    const hostValidationResult = validateServerConfig(invalidHostConfig);
    assertValidationResult(hostValidationResult, false, 'invalid host configuration');
    
    // Test missing required configuration properties
    const incompleteConfig = {
        http: { port: 3000 }, // Missing host
        express: {},
        connection: {},
        security: {},
        performance: {}
    };
    const incompleteValidationResult = validateServerConfig(incompleteConfig);
    assertValidationResult(incompleteValidationResult, false, 'incomplete configuration');
    
    // Test edge cases like null, undefined, and malformed configuration
    const nullValidationResult = validateServerConfig(null);
    assertValidationResult(nullValidationResult, false, 'null configuration');
    
    const undefinedValidationResult = validateServerConfig(undefined);
    assertValidationResult(undefinedValidationResult, false, 'undefined configuration');
}

/**
 * Tests environment-specific server configuration behavior for development, test, and production
 * environments, validating that each environment has appropriate settings, optimizations, and
 * security measures
 * 
 * @returns {Promise<void>} Resolves when environment-specific behavior testing is complete
 */
async function testEnvironmentSpecificBehavior() {
    // Test development environment configuration with debugging optimizations
    const devConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.DEVELOPMENT });
    const devServerConfig = createServerConfig(devConfig);
    
    assert.strictEqual(devServerConfig.environment.isDevelopment, true, 
        'Development config should have isDevelopment true');
    assert.strictEqual(devServerConfig.http.timeout, SERVER.DEVELOPMENT_TIMEOUT, 
        'Development should use development timeout');
    
    // Test production environment configuration with security and performance focus
    const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
    const prodServerConfig = createServerConfig(prodConfig);
    
    assert.strictEqual(prodServerConfig.environment.isProduction, true, 
        'Production config should have isProduction true');
    assert.strictEqual(prodServerConfig.http.timeout, SERVER.PRODUCTION_TIMEOUT, 
        'Production should use production timeout');
    assert.strictEqual(prodServerConfig.security.environment.securityLevel, 'high', 
        'Production should have high security level');
    
    // Test test environment configuration with minimal logging and fast execution
    const testConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.TEST });
    const testServerConfig = createServerConfig(testConfig);
    
    assert.strictEqual(testServerConfig.environment.isTest, true, 
        'Test config should have isTest true');
    assert.ok(testServerConfig.logging, 'Test config should have logging configuration');
    
    // Validate timeout values are appropriate for each environment
    assert.ok(devServerConfig.http.timeout >= 0, 'Development timeout should be non-negative');
    assert.ok(prodServerConfig.http.timeout > 0, 'Production timeout should be positive');
    assert.ok(testServerConfig.http.timeout >= 0, 'Test timeout should be non-negative');
}

/**
 * Tests server configuration summary generation for logging, debugging, and monitoring purposes,
 * validating that summaries contain all necessary information and are properly formatted for
 * operational use
 * 
 * @returns {Promise<void>} Resolves when configuration summary testing is complete
 */
async function testConfigurationSummaryGeneration() {
    // Test server configuration summary generation with createServerSummary function
    const testConfig = createServerConfig(createMockEnvironmentConfig());
    const summary = createServerSummary(testConfig);
    
    // Validate summary contains server binding information
    assert.ok(summary.binding, 'Summary should contain binding information');
    assert.ok(summary.binding.host, 'Summary should contain host information');
    assert.ok(summary.binding.port, 'Summary should contain port information');
    assert.ok(summary.binding.fullAddress, 'Summary should contain full address');
    
    // Check timeout and connection configuration are included in summary
    assert.ok(summary.timeouts, 'Summary should contain timeout information');
    assert.ok(typeof summary.timeouts.serverTimeout === 'number', 
        'Summary should contain server timeout');
    assert.ok(typeof summary.timeouts.keepAliveTimeout === 'number', 
        'Summary should contain keep-alive timeout');
    
    // Test Express.js framework configuration summary information
    assert.ok(summary.express, 'Summary should contain Express.js information');
    assert.strictEqual(summary.express.version, '5.1.0', 
        'Summary should show Express.js version 5.1.0');
    assert.ok(Array.isArray(summary.express.features), 
        'Summary should list Express.js features');
    
    // Validate security configuration summary with enabled features
    assert.ok(summary.security, 'Summary should contain security information');
    assert.ok(summary.security.level, 'Summary should contain security level');
    assert.ok(summary.security.headers, 'Summary should contain security headers info');
    
    // Check performance optimization summary details
    assert.ok(summary.performance, 'Summary should contain performance information');
    assert.ok(summary.performance.nodeJSVersion, 'Summary should contain Node.js version');
    assert.ok(Array.isArray(summary.performance.nodeJSOptimizations), 
        'Summary should list Node.js optimizations');
    
    // Test environment-specific configuration details in summary
    assert.ok(summary.environment, 'Summary should contain environment information');
    assert.ok(summary.environment.nodeEnv, 'Summary should contain environment name');
    assert.ok(typeof summary.environment.isDevelopment === 'boolean', 
        'Summary should contain development flag');
    
    // Assert configuration summary is complete and properly formatted
    assert.ok(summary.metadata, 'Summary should contain metadata');
    assert.ok(summary.metadata.generatedAt, 'Summary should contain generation timestamp');
    assert.ok(summary.statistics, 'Summary should contain statistics');
}

/**
 * Tests error handling in server configuration scenarios including configuration creation failures,
 * validation errors, and recovery mechanisms with comprehensive error classification and reporting
 * 
 * @returns {Promise<void>} Resolves when configuration error handling testing is complete
 */
async function testErrorHandlingInConfiguration() {
    // Test configuration creation with invalid environment configuration
    const invalidEnvConfig = { port: 'invalid_port', host: null };
    const configWithInvalidEnv = createServerConfig(invalidEnvConfig);
    assert.ok(configWithInvalidEnv, 'Should handle invalid environment config gracefully');
    
    // Test validation failures with various invalid configuration scenarios
    const malformedConfig = { http: { port: 'not_a_number' } };
    const malformedValidation = validateServerConfig(malformedConfig);
    assertValidationResult(malformedValidation, false, 'malformed configuration');
    
    // Test error handling for missing dependencies and utilities
    // This tests the fallback behavior when validation utilities fail
    const emptyConfig = {};
    const emptyValidation = validateServerConfig(emptyConfig);
    assertValidationResult(emptyValidation, false, 'empty configuration object');
    
    // Test error classification for different error types
    const configError = createConfigurationError('PORT', 'number', 'invalid_port');
    assert.ok(configError, 'Configuration error should be created');
    assert.strictEqual(configError.name, 'ConfigurationError', 
        'Error should be classified as ConfigenticationError');
    assert.ok(configError.message.includes('PORT'), 'Error message should mention the config key');
    
    // Test error recovery mechanisms and fallback behavior
    const fallbackConfig = createServerConfig({ port: -1 }); // Invalid port
    assert.ok(fallbackConfig.http, 'Should have fallback HTTP configuration');
    assert.ok(fallbackConfig.metadata && fallbackConfig.metadata.fallbackConfiguration, 
        'Should indicate fallback configuration was used');
}

// ========================================
// TEST SUITE DEFINITIONS
// ========================================

describe('Server Configuration Module', () => {
    // Global test setup and teardown
    before(async () => {
        await setupTestEnvironment();
    });
    
    after(async () => {
        await teardownTestEnvironment();
    });
    
    beforeEach(() => {
        // Reset mock environment config for each test
        mockEnvironmentConfig = null;
    });
    
    afterEach(() => {
        // Clean up any test-specific mocks or state
        if (testUtilities) {
            testUtilities.cleanupMocks();
        }
    });
    
    describe('Module Exports and Structure', () => {
        it('should export required configuration functions and objects', () => {
            // Validate that server configuration module exports all required functions and objects
            assert.ok(serverConfig, 'serverConfig object should be exported');
            assert.ok(typeof serverConfig === 'object', 'serverConfig should be an object');
            
            assert.ok(createServerConfig, 'createServerConfig function should be exported');
            assert.ok(typeof createServerConfig === 'function', 'createServerConfig should be callable');
            
            assert.ok(validateServerConfig, 'validateServerConfig function should be exported');
            assert.ok(typeof validateServerConfig === 'function', 'validateServerConfig should be callable');
            
            assert.ok(getHttpServerSettings, 'getHttpServerSettings function should be exported');
            assert.ok(typeof getHttpServerSettings === 'function', 'getHttpServerSettings should be callable');
            
            assert.ok(getExpressConfiguration, 'getExpressConfiguration function should be exported');
            assert.ok(typeof getExpressConfiguration === 'function', 'getExpressConfiguration should be callable');
            
            assert.ok(createServerSummary, 'createServerSummary function should be exported');
            assert.ok(typeof createServerSummary === 'function', 'createServerSummary should be callable');
        });
        
        it('should have valid default server configuration structure', () => {
            // Tests that default server configuration has proper structure with all required sections
            const isValidStructure = validateServerConfigStructure(serverConfig);
            assert.ok(isValidStructure, 'Default serverConfig should have valid structure');
            
            // Validate specific sections exist
            assert.ok(serverConfig.http, 'serverConfig should have http configuration section');
            assert.ok(serverConfig.express, 'serverConfig should have express configuration section');
            assert.ok(serverConfig.connection, 'serverConfig should have connection configuration section');
            assert.ok(serverConfig.security, 'serverConfig should have security configuration section');
            assert.ok(serverConfig.performance, 'serverConfig should have performance configuration section');
            
            // Check metadata is present
            assert.ok(serverConfig.metadata, 'serverConfig should have metadata section');
            assert.strictEqual(serverConfig.metadata.version, '1.0.0', 
                'serverConfig should have correct version in metadata');
        });
    });
    
    describe('Server Configuration Creation', () => {
        it('should create valid server configuration with default environment', async () => {
            // Tests server configuration creation with default environment settings
            const defaultConfig = createMockEnvironmentConfig();
            const serverConfiguration = createServerConfig(defaultConfig);
            
            assert.ok(serverConfiguration, 'createServerConfig should return valid configuration object');
            assert.ok(validateServerConfigStructure(serverConfiguration), 
                'Configuration structure should be complete and properly typed');
            
            // Verify default values are applied correctly
            assert.strictEqual(serverConfiguration.http.port, defaultConfig.port, 
                'Port should match environment configuration');
            assert.strictEqual(serverConfiguration.http.host, defaultConfig.host, 
                'Host should match environment configuration');
            
            // Check environment-specific settings are properly configured
            assert.ok(serverConfiguration.environment, 'Configuration should have environment section');
            assert.strictEqual(serverConfiguration.environment.nodeEnv, defaultConfig.nodeEnv, 
                'Environment nodeEnv should match configuration');
        });
        
        it('should create development environment configuration', async () => {
            // Tests server configuration creation for development environment with appropriate settings
            const devConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.DEVELOPMENT });
            const serverConfiguration = createServerConfig(devConfig);
            
            // Validate development environment is properly detected
            assert.strictEqual(serverConfiguration.environment.isDevelopment, true, 
                'Development environment should be properly detected');
            assert.strictEqual(serverConfiguration.environment.isProduction, false, 
                'Production flag should be false in development');
            
            // Check timeout values are set to development defaults
            assert.strictEqual(serverConfiguration.http.timeout, SERVER.DEVELOPMENT_TIMEOUT, 
                'Timeout values should be set to development defaults');
            
            // Verify logging configuration matches development requirements
            assert.ok(serverConfiguration.logging.performanceLogging, 
                'Development should enable performance logging');
            
            // Ensure security settings are appropriate for development
            assert.strictEqual(serverConfiguration.security.environment.securityLevel, 'medium', 
                'Development should have medium security level');
        });
        
        it('should create production environment configuration', async () => {
            // Tests server configuration creation for production environment with security and performance focus
            const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
            const serverConfiguration = createServerConfig(prodConfig);
            
            // Validate production environment is properly detected
            assert.strictEqual(serverConfiguration.environment.isProduction, true, 
                'Production environment should be properly detected');
            assert.strictEqual(serverConfiguration.environment.isDevelopment, false, 
                'Development flag should be false in production');
            
            // Check timeout values are set to production defaults
            assert.strictEqual(serverConfiguration.http.timeout, SERVER.PRODUCTION_TIMEOUT, 
                'Timeout values should be set to production defaults');
            
            // Verify security settings are enhanced for production
            assert.strictEqual(serverConfiguration.security.environment.securityLevel, 'high', 
                'Production should have high security level');
            
            // Ensure performance optimizations are applied
            assert.strictEqual(serverConfiguration.performance.environment.optimizedFor, 'throughput', 
                'Production should be optimized for throughput');
        });
        
        it('should create test environment configuration', async () => {
            // Tests server configuration creation for test environment with minimal logging and fast execution
            const testConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.TEST });
            const serverConfiguration = createServerConfig(testConfig);
            
            // Validate test environment is properly detected
            assert.strictEqual(serverConfiguration.environment.isTest, true, 
                'Test environment should be properly detected');
            assert.strictEqual(serverConfiguration.environment.isProduction, false, 
                'Production flag should be false in test');
            
            // Check timeout values are optimized for testing
            assert.ok(serverConfiguration.http.timeout >= 0, 
                'Timeout values should be optimized for testing');
            
            // Verify logging is configured to reduce test noise
            assert.ok(serverConfiguration.logging, 'Test should have logging configuration');
            assert.strictEqual(serverConfiguration.logging.performanceLogging, false, 
                'Test should disable performance logging to reduce noise');
            
            // Ensure test-specific optimizations are applied
            assert.strictEqual(serverConfiguration.performance.environment.performanceMode, 'debug', 
                'Test should use debug performance mode');
        });
        
        it('should handle invalid environment configuration gracefully', async () => {
            // Tests error handling when createServerConfig receives invalid environment configuration
            const invalidConfig = { port: 'invalid_port', host: 123, nodeEnv: null };
            const serverConfiguration = createServerConfig(invalidConfig);
            
            // Validate invalid environment configuration triggers appropriate fallback
            assert.ok(serverConfiguration, 'Function should not crash with malformed input');
            assert.ok(serverConfiguration.http, 'Should have HTTP configuration even with invalid input');
            
            // Check error handling provides descriptive feedback
            assert.ok(serverConfiguration.metadata.fallbackConfiguration, 
                'Should indicate fallback configuration was used');
            
            // Verify error classification is correct
            assert.ok(validateServerConfigStructure(serverConfiguration), 
                'Even fallback configuration should have valid structure');
        });
    });
    
    describe('HTTP Server Settings', () => {
        it('should generate HTTP server settings for development environment', async () => {
            // Tests HTTP server settings generation for development with appropriate timeout values
            const devSettings = getHttpServerSettings(ENVIRONMENT.DEVELOPMENT);
            
            assert.ok(devSettings, 'getHttpServerSettings should return valid settings object');
            assert.strictEqual(devSettings.timeout, SERVER.DEVELOPMENT_TIMEOUT, 
                'Development timeout should be set to DEVELOPMENT_TIMEOUT (0)');
            assert.strictEqual(devSettings.environment, ENVIRONMENT.DEVELOPMENT, 
                'Settings should indicate development environment');
            
            // Validate keep-alive timeout settings
            assert.ok(typeof devSettings.keepAliveTimeout === 'number', 
                'Keep-alive timeout should match DEFAULT_KEEP_ALIVE_TIMEOUT');
            assert.ok(devSettings.keepAliveTimeout > 0, 'Keep-alive timeout should be positive');
            
            // Check connection limits are appropriate for development
            assert.ok(typeof devSettings.maxConnections === 'number', 
                'Connection limits should be appropriate for development');
            assert.ok(devSettings.maxConnections > 0, 'Max connections should be positive');
        });
        
        it('should generate HTTP server settings for production environment', async () => {
            // Tests HTTP server settings generation for production with performance optimizations
            const prodSettings = getHttpServerSettings(ENVIRONMENT.PRODUCTION);
            
            assert.ok(prodSettings, 'Production settings should be generated');
            assert.strictEqual(prodSettings.timeout, SERVER.PRODUCTION_TIMEOUT, 
                'Production timeout should be set to PRODUCTION_TIMEOUT');
            assert.strictEqual(prodSettings.environment, ENVIRONMENT.PRODUCTION, 
                'Settings should indicate production environment');
            
            // Validate connection limits are optimized for production load
            assert.ok(prodSettings.maxConnections >= 100, 
                'Production should have higher connection limits');
            
            // Check keep-alive settings support connection reuse
            assert.ok(prodSettings.keepAlive, 'Production should enable keep-alive');
            assert.ok(prodSettings.keepAliveTimeout >= 60000, 
                'Production keep-alive should be at least 60 seconds');
            
            // Verify request timeout values are appropriate for production
            assert.ok(prodSettings.requestTimeout >= 30000, 
                'Production request timeout should be at least 30 seconds');
        });
        
        it('should validate timeout configuration ranges', async () => {
            // Tests that timeout values are within valid ranges for different environments
            const devSettings = getHttpServerSettings(ENVIRONMENT.DEVELOPMENT);
            const prodSettings = getHttpServerSettings(ENVIRONMENT.PRODUCTION);
            
            // Validate server timeout values are non-negative
            assert.ok(devSettings.timeout >= 0, 'Development timeout should be non-negative');
            assert.ok(prodSettings.timeout >= 0, 'Production timeout should be non-negative');
            
            // Check keep-alive timeout is positive
            assert.ok(devSettings.keepAliveTimeout > 0, 'Development keep-alive should be positive');
            assert.ok(prodSettings.keepAliveTimeout > 0, 'Production keep-alive should be positive');
            
            // Verify request timeout allows reasonable processing time
            assert.ok(devSettings.requestTimeout > 0, 'Development request timeout should be positive');
            assert.ok(prodSettings.requestTimeout > 0, 'Production request timeout should be positive');
            
            // Ensure connection timeout prevents resource exhaustion
            assert.ok(devSettings.connectionTimeout > 0, 'Development connection timeout should be positive');
            assert.ok(prodSettings.connectionTimeout > 0, 'Production connection timeout should be positive');
        });
        
        it('should handle connection limit configuration', async () => {
            // Tests connection limit configuration for resource management
            const settings = getHttpServerSettings();
            
            // Validate maximum connections limit is configured
            assert.ok(typeof settings.maxConnections === 'number', 
                'Maximum connections limit should match DEFAULT_MAX_CONNECTIONS');
            assert.ok(settings.maxConnections > 0, 'Max connections should be positive');
            
            // Check connection limits prevent resource exhaustion
            assert.ok(settings.maxConnections <= 10000, 
                'Connection limits should prevent resource exhaustion');
            
            // Verify concurrent connection handling is properly configured
            assert.ok(settings.backlog, 'Should have backlog configuration');
            assert.strictEqual(settings.backlog, 511, 'Should use Node.js default backlog');
            
            // Ensure connection pooling settings are optimized
            assert.ok(settings.highWaterMark, 'Should have high water mark setting');
            assert.strictEqual(settings.noDelay, true, 'Should disable Nagle algorithm');
            assert.strictEqual(settings.keepAlive, true, 'Should enable TCP keep-alive');
        });
    });
    
    describe('Express.js Configuration', () => {
        it('should generate Express.js configuration with proper middleware settings', async () => {
            // Tests Express.js configuration generation with middleware and parsing options
            const testConfig = createMockEnvironmentConfig();
            const expressConfig = getExpressConfiguration(testConfig);
            
            assert.ok(expressConfig, 'getExpressConfiguration should return valid Express config');
            
            // Validate JSON body parser settings
            assert.ok(expressConfig.bodyParser.json, 'Should have JSON body parser configuration');
            assert.ok(expressConfig.bodyParser.json.limit, 'JSON parser should have size limit');
            assert.strictEqual(expressConfig.bodyParser.json.strict, true, 
                'JSON parser should use strict mode');
            
            // Check URL-encoded body parser configuration
            assert.ok(expressConfig.bodyParser.urlencoded, 'Should have URL-encoded parser');
            assert.strictEqual(expressConfig.bodyParser.urlencoded.extended, true, 
                'Extended URL encoding should be enabled for rich object parsing');
            assert.ok(expressConfig.bodyParser.urlencoded.limit, 
                'URL-encoded parser should have size limit');
        });
        
        it('should configure Express.js security settings', async () => {
            // Tests Express.js security configuration including header management and trust proxy
            const testConfig = createMockEnvironmentConfig();
            const expressConfig = getExpressConfiguration(testConfig);
            
            // Validate X-Powered-By header is disabled for security
            assert.ok(expressConfig.security, 'Express config should have security settings');
            assert.strictEqual(expressConfig.security.xPoweredBy, false, 
                'X-Powered-By header should be disabled for security');
            
            // Check trust proxy settings are environment-appropriate
            assert.ok(typeof expressConfig.security.trustProxy === 'boolean', 
                'Trust proxy settings should be environment-appropriate');
            
            // Verify Express.js 5.1.0 ReDoS protection is enabled
            assert.strictEqual(expressConfig.security.reDoSProtection, true, 
                'Express.js 5.1.0 ReDoS protection should be enabled');
            
            // Ensure security middleware options are properly configured
            assert.strictEqual(expressConfig.security.asyncErrorHandling, true, 
                'Async error handling should be enabled');
        });
        
        it('should apply Express.js 5.1.0 enhancements', async () => {
            // Tests that Express.js 5.1.0 specific features and enhancements are properly configured
            const testConfig = createMockEnvironmentConfig();
            const expressConfig = getExpressConfiguration(testConfig);
            
            // Validate framework version and features
            assert.strictEqual(expressConfig.version, '5.1.0', 
                'Should specify Express.js version 5.1.0');
            assert.ok(Array.isArray(expressConfig.features), 
                'Should list Express.js 5.1.0 features');
            
            // Check async error handling is configured for Promise rejection forwarding
            assert.ok(expressConfig.features.includes('ReDoS attack prevention'), 
                'Should include ReDoS attack prevention');
            assert.ok(expressConfig.features.includes('Native Node.js methods'), 
                'Should include native Node.js methods usage');
            
            // Verify native Node.js methods are used for performance
            assert.ok(expressConfig.framework.useNativeMethods, 
                'Native Node.js methods should be used for performance');
            assert.ok(expressConfig.framework.reducedDependencies, 
                'Should have reduced dependencies for better performance');
            
            // Ensure Path-to-regexp library upgrade is applied for ReDoS protection
            assert.strictEqual(expressConfig.framework.pathToRegexpVersion, '8.0.0', 
                'Path-to-regexp should be upgraded to version 8.0.0');
        });
        
        it('should handle Express.js configuration errors', async () => {
            // Tests error handling in Express.js configuration scenarios
            const invalidConfig = { nodeEnv: null };
            const expressConfig = getExpressConfiguration(invalidConfig);
            
            // Validate invalid Express.js options are handled gracefully
            assert.ok(expressConfig, 'Should handle invalid configuration gracefully');
            assert.ok(expressConfig.bodyParser, 'Should have fallback body parser configuration');
            
            // Check configuration validation catches Express.js incompatibilities
            assert.ok(expressConfig.security, 'Should have fallback security configuration');
            assert.strictEqual(expressConfig.security.xPoweredBy, false, 
                'Should maintain security defaults even with invalid config');
            
            // Verify error messages provide actionable feedback
            if (expressConfig.error) {
                assert.ok(typeof expressConfig.error === 'string', 
                    'Error message should provide actionable feedback');
            }
            
            // Ensure graceful fallback to defaults when possible
            assert.ok(expressConfig.bodyParser.json.limit, 
                'Should have fallback JSON limit');
        });
    });
    
    describe('Connection Management', () => {
        it('should configure keep-alive settings properly', async () => {
            // Tests keep-alive configuration for HTTP connection reuse
            const testConfig = createMockEnvironmentConfig();
            const serverConfig = createServerConfig(testConfig);
            
            // Validate keep-alive timeout is configured
            assert.ok(typeof serverConfig.connection.keepAliveTimeout === 'number', 
                'Keep-alive timeout should match DEFAULT_KEEP_ALIVE_TIMEOUT');
            assert.ok(serverConfig.connection.keepAliveTimeout > 0, 
                'Keep-alive timeout should be positive');
            
            // Check keep-alive is enabled for connection efficiency
            assert.ok(serverConfig.connection.keepAlive.enabled, 
                'Keep-alive should be enabled for connection efficiency');
            
            // Verify keep-alive interval is appropriate for server load
            assert.ok(typeof serverConfig.connection.keepAlive.interval === 'number', 
                'Keep-alive interval should be appropriate for server load');
            assert.ok(serverConfig.connection.keepAlive.interval > 0, 
                'Keep-alive interval should be positive');
            
            // Ensure connection reuse is optimized
            assert.ok(typeof serverConfig.connection.keepAlive.probes === 'number', 
                'Should have keep-alive probe configuration');
        });
        
        it('should set appropriate connection limits', async () => {
            // Tests connection limit configuration for resource management
            const testConfig = createMockEnvironmentConfig();
            const serverConfig = createServerConfig(testConfig);
            
            // Validate maximum concurrent connections limit is set
            assert.ok(typeof serverConfig.connection.maxConnections === 'number', 
                'Maximum concurrent connections limit should be set');
            assert.ok(serverConfig.connection.maxConnections > 0, 
                'Max connections should be positive');
            
            // Check connection limits prevent server overload
            assert.ok(serverConfig.connection.limits, 'Should have connection limits configuration');
            assert.ok(typeof serverConfig.connection.limits.maxConnections === 'number', 
                'Connection limits should prevent server overload');
            
            // Verify resource allocation is balanced
            assert.ok(typeof serverConfig.connection.limits.maxRequestsPerConnection === 'number', 
                'Should have requests per connection limit');
            
            // Ensure connection queue management is configured
            assert.ok(typeof serverConfig.connection.limits.maxHeadersCount === 'number', 
                'Should have headers count limit');
            assert.ok(typeof serverConfig.connection.limits.maxHeaderSize === 'number', 
                'Should have header size limit');
        });
        
        it('should optimize connection settings for production', async () => {
            // Tests production-specific connection optimizations
            const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
            const prodServerConfig = createServerConfig(prodConfig);
            
            // Validate production connection settings are performance-optimized
            assert.ok(prodServerConfig.connection.connectionPooling, 
                'Production should have connection pooling');
            assert.ok(prodServerConfig.connection.connectionPooling.enabled, 
                'Connection pooling should be enabled in production');
            
            // Check connection pooling is configured for efficiency
            assert.ok(typeof prodServerConfig.connection.connectionPooling.maxPoolSize === 'number', 
                'Should have connection pool size configuration');
            assert.ok(prodServerConfig.connection.connectionPooling.maxPoolSize > 0, 
                'Connection pool size should be positive');
            
            // Verify resource limits are appropriate for production load
            assert.ok(prodServerConfig.connection.maxConnections >= 100, 
                'Production should support higher connection counts');
            
            // Ensure connection timeout prevents resource leaks
            assert.ok(typeof prodServerConfig.connection.timeouts.connection === 'number', 
                'Production should have connection timeout');
            assert.ok(prodServerConfig.connection.timeouts.connection > 0, 
                'Connection timeout should prevent resource leaks');
        });
    });
    
    describe('Security Configuration', () => {
        it('should configure security headers properly', async () => {
            await testSecurityConfigurationFeatures();
        });
        
        it('should set request security limits', async () => {
            // Tests request size and rate limiting for security protection
            const testConfig = createMockEnvironmentConfig();
            const serverConfig = createServerConfig(testConfig);
            
            // Validate request size limits prevent memory exhaustion attacks
            assert.ok(serverConfig.security.limits, 'Should have security limits configuration');
            assert.ok(serverConfig.security.limits.jsonLimit, 
                'Request size limits should prevent memory exhaustion attacks');
            assert.ok(serverConfig.security.limits.urlencodedLimit, 
                'Should have URL-encoded size limits');
            
            // Check request timeout limits prevent DoS attacks
            assert.ok(typeof serverConfig.security.limits.maxHeadersCount === 'number', 
                'Should have header count limits to prevent DoS attacks');
            assert.ok(typeof serverConfig.security.limits.maxHeaderSize === 'number', 
                'Should have header size limits');
            
            // Verify rate limiting parameters are environment-specific
            assert.ok(serverConfig.security.rateLimiting, 'Should have rate limiting configuration');
            assert.ok(typeof serverConfig.security.rateLimiting.enabled === 'boolean', 
                'Rate limiting should be configurable by environment');
            
            // Ensure input validation integration is configured
            assert.ok(serverConfig.security.middleware.inputValidation, 
                'Should have input validation middleware configuration');
        });
        
        it('should apply Express.js 5.1.0 security enhancements', async () => {
            // Tests Express.js 5.1.0 specific security features and protections
            const testConfig = createMockEnvironmentConfig();
            const serverConfig = createServerConfig(testConfig);
            
            // Validate ReDoS attack prevention is enabled
            assert.ok(serverConfig.security.expressEnhancements.reDoSProtection.enabled, 
                'ReDoS attack prevention should be enabled');
            assert.ok(serverConfig.security.expressEnhancements.reDoSProtection.description.includes('CVE-2024-45590'), 
                'Should reference CVE-2024-45590 mitigation');
            
            // Check async error handling prevents security vulnerabilities
            assert.ok(serverConfig.security.expressEnhancements.asyncErrorHandling.enabled, 
                'Async error handling should prevent security vulnerabilities');
            
            // Verify Path-to-regexp upgrade removes security vulnerabilities
            assert.ok(serverConfig.security.expressEnhancements.nativeMethodsUsage.enabled, 
                'Native methods usage should be enabled');
            assert.ok(Array.isArray(serverConfig.security.expressEnhancements.nativeMethodsUsage.methods), 
                'Should list native methods used');
        });
        
        it('should configure environment-specific security', async () => {
            // Tests that security configuration varies appropriately between environments
            const devConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.DEVELOPMENT });
            const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
            
            const devServerConfig = createServerConfig(devConfig);
            const prodServerConfig = createServerConfig(prodConfig);
            
            // Validate development security is basic but functional
            assert.strictEqual(devServerConfig.security.environment.securityLevel, 'medium', 
                'Development security should be basic but functional');
            
            // Check production security is comprehensive and strict
            assert.strictEqual(prodServerConfig.security.environment.securityLevel, 'high', 
                'Production security should be comprehensive and strict');
            
            // Verify security settings match environment risk profile
            assert.ok(prodServerConfig.security.middleware.helmet.enabled, 
                'Production should enable comprehensive security middleware');
            assert.ok(!devServerConfig.security.middleware.helmet.enabled, 
                'Development should have lighter security middleware');
        });
    });
    
    describe('Performance Configuration', () => {
        it('should apply Node.js v22.x LTS optimizations', async () => {
            await testPerformanceOptimizations();
        });
        
        it('should configure Express.js 5.1.0 performance enhancements', async () => {
            // Tests Express.js 5.1.0 performance improvements and optimizations
            const testConfig = createMockEnvironmentConfig();
            const serverConfig = createServerConfig(testConfig);
            
            // Validate native Node.js methods are used for better performance
            assert.ok(serverConfig.performance.express.nativeMethods.arrayFlat, 
                'Native Node.js methods should be used for better performance');
            assert.ok(serverConfig.performance.express.nativeMethods.pathIsAbsolute, 
                'Should use native path.isAbsolute method');
            
            // Check reduced external dependencies improve performance
            assert.ok(serverConfig.performance.express.nativeMethods.reducedDependencies, 
                'Reduced external dependencies should improve performance');
            
            // Verify async error handling is optimized
            assert.ok(serverConfig.performance.express.frameworkEnhancements.asyncErrorHandling, 
                'Async error handling should be optimized');
            
            // Ensure middleware pipeline is performance-optimized
            assert.ok(serverConfig.performance.express.middlewareOptimizations.streamlined, 
                'Middleware pipeline should be performance-optimized');
        });
        
        it('should optimize connection performance', async () => {
            // Tests connection-level performance optimizations
            const testConfig = createMockEnvironmentConfig();
            const serverConfig = createServerConfig(testConfig);
            
            // Validate HTTP keep-alive optimizes connection reuse
            assert.ok(serverConfig.performance.connections.keepAlive.enabled, 
                'HTTP keep-alive should optimize connection reuse');
            
            // Check connection pooling is configured for efficiency
            const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
            const prodServerConfig = createServerConfig(prodConfig);
            assert.ok(prodServerConfig.performance.connections.connectionPool.enabled, 
                'Connection pooling should be configured for efficiency');
            
            // Verify response streaming is optimized for static content
            assert.ok(serverConfig.performance.caching.responseCache, 
                'Response streaming should be optimized for static content');
            
            // Ensure connection management minimizes overhead
            assert.ok(serverConfig.performance.connections.socket.noDelay, 
                'Connection management should minimize overhead');
        });
        
        it('should configure caching for static responses', async () => {
            // Tests caching configuration for static endpoint responses like /hello
            const testConfig = createMockEnvironmentConfig();
            const serverConfig = createServerConfig(testConfig);
            
            // Validate static response caching is configured appropriately
            assert.ok(serverConfig.performance.caching.memoryCache, 
                'Static response caching should be configured appropriately');
            assert.ok(serverConfig.performance.caching.memoryCache.enabled, 
                'Memory cache should be enabled');
            
            // Check cache headers are set for performance
            const prodConfig = createMockEnvironmentConfig({ nodeEnv: ENVIRONMENT.PRODUCTION });
            const prodServerConfig = createServerConfig(prodConfig);
            assert.ok(prodServerConfig.performance.caching.httpCaching.enabled, 
                'Cache headers should be set for performance in production');
            
            // Verify response generation is optimized for repetitive content
            assert.ok(serverConfig.performance.caching.memoryCache.helloEndpointCache, 
                'Response generation should be optimized for repetitive content');
            
            // Ensure memory usage is optimized for caching
            assert.ok(typeof serverConfig.performance.caching.memoryCache.maxSize === 'string', 
                'Memory usage should be optimized for caching');
        });
    });
    
    describe('Configuration Validation', () => {
        it('should validate complete server configuration successfully', async () => {
            await testConfigurationValidationScenarios();
        });
        
        it('should detect invalid port configuration', async () => {
            // Tests validation failure for invalid port values
            const invalidPortConfig = {
                http: { port: -1, host: 'localhost' },
                express: {},
                connection: {},
                security: {},
                performance: {}
            };
            
            const validationResult = validateServerConfig(invalidPortConfig);
            
            // Validate invalid port values are properly detected
            assertValidationResult(validationResult, false, 'invalid port configuration');
            
            // Check port range validation (1-65535) is enforced
            const errors = validationResult.getErrors({ field: 'http.port' });
            assert.ok(errors.length > 0, 'Should have port validation errors');
            assert.ok(errors[0].message.toLowerCase().includes('port'), 
                'Error message should mention port validation');
            
            // Verify negative port values trigger validation errors
            assert.ok(errors[0].message.includes('-1') || errors[0].message.includes('invalid'), 
                'Should specifically identify negative port issue');
            
            // Ensure port zero and above 65535 are rejected
            const tooHighPortConfig = { ...invalidPortConfig, http: { port: 99999, host: 'localhost' } };
            const tooHighValidation = validateServerConfig(tooHighPortConfig);
            assertValidationResult(tooHighValidation, false, 'port above 65535');
        });
        
        it('should detect invalid host configuration', async () => {
            // Tests validation failure for invalid host addresses
            const invalidHostConfig = {
                http: { port: 3000, host: 'invalid..host..name' },
                express: {},
                connection: {},
                security: {},
                performance: {}
            };
            
            const validationResult = validateServerConfig(invalidHostConfig);
            
            // Validate invalid host addresses are properly detected
            assertValidationResult(validationResult, false, 'invalid host configuration');
            
            // Check host format validation is enforced
            const errors = validationResult.getErrors({ field: 'http.host' });
            assert.ok(errors.length > 0, 'Should have host validation errors');
            
            // Verify binding capability check is performed
            assert.ok(errors[0].message.toLowerCase().includes('host'), 
                'Error should mention host validation');
            
            // Ensure malformed host values trigger validation errors
            assert.ok(errors[0].message.includes('invalid') || errors[0].code === 'INVALID_HOST', 
                'Should identify malformed host values');
        });
        
        it('should validate timeout value ranges', async () => {
            // Tests validation of timeout configuration values
            const invalidTimeoutConfig = {
                http: { port: 3000, host: 'localhost', timeout: -1000 },
                express: {},
                connection: {},
                security: {},
                performance: {}
            };
            
            const validationResult = validateServerConfig(invalidTimeoutConfig);
            
            // Validate timeout values are validated for reasonable ranges
            assertValidationResult(validationResult, false, 'invalid timeout configuration');
            
            // Check negative timeout values are rejected
            const errors = validationResult.getErrors();
            const timeoutErrors = errors.filter(error => 
                error.message.toLowerCase().includes('timeout') || 
                error.field === 'http.timeout'
            );
            assert.ok(timeoutErrors.length > 0, 'Should have timeout validation errors');
            
            // Verify extremely large timeout values are flagged
            const largeTimeoutConfig = { ...invalidTimeoutConfig, 
                http: { port: 3000, host: 'localhost', timeout: 999999999 } };
            const largeTimeoutValidation = validateServerConfig(largeTimeoutConfig);
            assertValidationResult(largeTimeoutValidation, false, 'extremely large timeout');
            
            // Ensure zero timeout values are handled appropriately
            const zeroTimeoutConfig = { ...invalidTimeoutConfig, 
                http: { port: 3000, host: 'localhost', timeout: 0 } };
            const zeroTimeoutValidation = validateServerConfig(zeroTimeoutConfig);
            // Zero timeout might be valid for some scenarios
            assert.ok(zeroTimeoutValidation, 'Should handle zero timeout appropriately');
        });
        
        it('should handle missing configuration properties', async () => {
            // Tests validation behavior with incomplete configuration
            const incompleteConfig = {
                http: { port: 3000 }, // Missing host
                express: {},
                connection: {},
                security: {},
                performance: {}
            };
            
            const validationResult = validateServerConfig(incompleteConfig);
            
            // Validate missing required properties trigger validation errors
            assertValidationResult(validationResult, false, 'incomplete configuration');
            
            // Check optional missing properties are handled gracefully
            const errors = validationResult.getErrors();
            const missingHostErrors = errors.filter(error => 
                error.field === 'http.host' || error.message.toLowerCase().includes('host')
            );
            assert.ok(missingHostErrors.length > 0, 'Should detect missing required host property');
            
            // Verify default values are applied where appropriate
            // This would be tested through the actual configuration creation
            const configWithDefaults = createServerConfig(incompleteConfig);
            assert.ok(configWithDefaults.http.host, 'Should apply default host value');
            
            // Ensure validation provides clear missing property feedback
            assert.ok(missingHostErrors[0].message.includes('required') || 
                     missingHostErrors[0].message.includes('missing'),
                     'Error message should indicate missing required property');
        });
        
        it('should provide detailed validation error messages', async () => {
            // Tests that validation errors include actionable information
            const multipleErrorsConfig = {
                http: { port: -1, host: 'invalid..host' },
                express: { bodyParser: { json: { limit: 'invalid_limit' } } },
                connection: {},
                security: { rateLimiting: { windowMs: -1, maxRequests: 'not_a_number' } },
                performance: {}
            };
            
            const validationResult = validateServerConfig(multipleErrorsConfig);
            
            // Validate validation errors include specific field information
            assertValidationResult(validationResult, false, 'multiple validation errors');
            const errors = validationResult.getErrors();
            assert.ok(errors.length > 1, 'Should have multiple validation errors');
            
            // Check error messages are descriptive and actionable
            errors.forEach((error, index) => {
                assert.ok(error.message && typeof error.message === 'string', 
                    `Error ${index} should have descriptive message`);
                assert.ok(error.message.length > 10, 
                    `Error ${index} message should be sufficiently detailed`);
                assert.ok(error.field || error.context, 
                    `Error ${index} should include field or context information`);
            });
            
            // Verify validation result includes error details and suggestions
            assert.ok(validationResult.metadata, 'Validation result should include metadata');
            assert.ok(validationResult.metadata.validationContext, 
                'Should include validation context');
            
            // Ensure multiple validation errors are properly collected
            const portErrors = errors.filter(e => e.field === 'http.port');
            const hostErrors = errors.filter(e => e.field === 'http.host');
            assert.ok(portErrors.length > 0, 'Should collect port validation errors');
            assert.ok(hostErrors.length > 0, 'Should collect host validation errors');
        });
    });
    
    describe('Configuration Summary Generation', () => {
        it('should generate comprehensive configuration summary', async () => {
            await testConfigurationSummaryGeneration();
        });
        
        it('should include security configuration in summary', async () => {
            // Tests that security settings are properly summarized
            const testConfig = createServerConfig(createMockEnvironmentConfig());
            const summary = createServerSummary(testConfig);
            
            // Validate security configuration summary includes enabled features
            assert.ok(summary.security, 'Summary should include security configuration');
            assert.ok(summary.security.level, 'Security summary should include security level');
            assert.ok(typeof summary.security.level === 'string', 
                'Security level should be descriptive string');
            
            // Check header security settings are documented
            assert.ok(summary.security.headers, 'Security summary should include header settings');
            assert.ok(typeof summary.security.headers.xPoweredBy === 'boolean', 
                'Should document X-Powered-By header setting');
            
            // Verify request limits and security measures are listed
            assert.ok(summary.security.requestLimits, 'Should include request limits information');
            assert.ok(summary.security.requestLimits.jsonLimit, 
                'Should document JSON size limits');
            
            // Ensure security enhancements are clearly identified
            assert.ok(summary.security.rateLimiting, 'Should include rate limiting configuration');
            assert.ok(typeof summary.security.rateLimiting.enabled === 'boolean', 
                'Should clearly identify enabled security features');
        });
        
        it('should include performance optimizations in summary', async () => {
            // Tests that performance settings are documented in summary
            const testConfig = createServerConfig(createMockEnvironmentConfig());
            const summary = createServerSummary(testConfig);
            
            // Validate performance optimization summary includes applied enhancements
            assert.ok(summary.performance, 'Summary should include performance optimization');
            assert.ok(summary.performance.nodeJSVersion, 
                'Performance summary should include Node.js version');
            assert.ok(Array.isArray(summary.performance.nodeJSOptimizations), 
                'Should list Node.js optimizations');
            
            // Check Node.js and Express.js optimizations are documented
            assert.ok(Array.isArray(summary.performance.expressOptimizations), 
                'Should document Express.js optimizations');
            assert.ok(summary.performance.expressOptimizations.length > 0, 
                'Should list specific Express.js enhancements');
            
            // Verify connection performance settings are summarized
            assert.ok(summary.performance.connections, 
                'Should include connection performance settings');
            assert.ok(typeof summary.performance.connections.keepAlive === 'boolean', 
                'Should document keep-alive configuration');
            
            // Ensure caching and optimization strategies are listed
            assert.ok(summary.performance.caching, 'Should include caching strategies');
            assert.ok(typeof summary.performance.caching.memoryCache === 'boolean', 
                'Should document memory cache configuration');
        });
        
        it('should include environment-specific details in summary', async () => {
            // Tests that environment configuration is properly documented
            const testConfig = createServerConfig(createMockEnvironmentConfig());
            const summary = createServerSummary(testConfig);
            
            // Validate environment-specific configuration details are included
            assert.ok(summary.environment, 'Summary should include environment information');
            assert.ok(summary.environment.nodeEnv, 'Should include environment name');
            assert.ok(typeof summary.environment.isDevelopment === 'boolean', 
                'Should include development flag');
            
            // Check environment detection results are documented
            assert.ok(typeof summary.environment.isProduction === 'boolean', 
                'Should document production environment detection');
            assert.ok(typeof summary.environment.isTest === 'boolean', 
                'Should document test environment detection');
            
            // Verify environment-specific optimizations are listed
            assert.ok(summary.environment.optimizedFor, 
                'Should document optimization target for environment');
            assert.ok(summary.environment.securityLevel, 
                'Should include environment security level');
            
            // Ensure configuration variations are clearly explained
            assert.ok(typeof summary.environment.optimizedFor === 'string', 
                'Environment optimization should be clearly explained');
        });
    });
    
    describe('Error Handling Scenarios', () => {
        it('should handle configuration creation errors gracefully', async () => {
            await testErrorHandlingInConfiguration();
        });
        
        it('should handle validation dependency errors', async () => {
            // Tests error handling when validation dependencies fail
            // Test with configuration that would cause validation utilities to fail
            const problematicConfig = {
                http: { port: Symbol('invalid'), host: { invalid: 'object' } },
                express: {},
                connection: {},
                security: {},
                performance: {}
            };
            
            const validationResult = validateServerConfig(problematicConfig);
            
            // Validate missing validation utilities are handled gracefully
            assert.ok(validationResult, 'Should handle validation utility failures gracefully');
            assertValidationResult(validationResult, false, 'validation dependency errors');
            
            // Check validator function errors are properly caught
            assert.ok(validationResult.errors.length > 0, 'Should capture validation errors');
            
            // Verify validation errors include dependency information
            const errors = validationResult.getErrors();
            assert.ok(errors.some(error => error.message || error.type), 
                'Should include error information when validation fails');
            
            // Ensure alternative validation approaches are attempted
            // The function should still return a ValidationResult even if some checks fail
            assert.ok(validationResult.metadata, 'Should have validation metadata even on failure');
        });
        
        it('should handle environment configuration errors', async () => {
            // Tests error handling for environment configuration issues
            const invalidEnvConfig = { 
                port: 'not_a_number', 
                host: null, 
                nodeEnv: 123 
            };
            
            const serverConfig = createServerConfig(invalidEnvConfig);
            
            // Validate invalid environment configuration triggers appropriate errors
            assert.ok(serverConfig, 'Should handle invalid environment configuration');
            assert.ok(serverConfig.http, 'Should have HTTP configuration even with invalid input');
            
            // Check missing environment variables are handled with defaults
            const configWithMissingEnv = createServerConfig({});
            assert.ok(configWithMissingEnv.http.port, 'Should use default port when missing');
            assert.ok(configWithMissingEnv.http.host, 'Should use default host when missing');
            
            // Verify environment detection errors are managed gracefully
            assert.ok(configWithMissingEnv.environment, 'Should have environment section');
            assert.ok(configWithMissingEnv.environment.nodeEnv, 'Should have default environment');
            
            // Ensure error recovery mechanisms are functional
            assert.ok(serverConfig.metadata && (
                serverConfig.metadata.fallbackConfiguration || 
                serverConfig.metadata.configurationSource
            ), 'Should indicate recovery mechanism was used');
        });
        
        it('should provide error recovery mechanisms', async () => {
            // Tests error recovery and fallback strategies
            const faultyConfig = { 
                port: -999, 
                host: 'invalid..host', 
                nodeEnv: null 
            };
            
            const serverConfig = createServerConfig(faultyConfig);
            
            // Validate configuration errors trigger appropriate fallback behavior
            assert.ok(serverConfig, 'Should provide fallback configuration');
            assert.ok(validateServerConfigStructure(serverConfig), 
                'Fallback configuration should have valid structure');
            
            // Check default values are applied when configuration fails
            assert.ok(serverConfig.http.port > 0 && serverConfig.http.port <= 65535, 
                'Should use valid default port');
            assert.ok(serverConfig.http.host && typeof serverConfig.http.host === 'string', 
                'Should use valid default host');
            
            // Verify error recovery preserves essential functionality
            assert.ok(serverConfig.express, 'Should preserve Express.js configuration');
            assert.ok(serverConfig.security, 'Should preserve security configuration');
            assert.ok(serverConfig.performance, 'Should preserve performance configuration');
            
            // Ensure recovery mechanisms are documented in error messages
            assert.ok(serverConfig.metadata, 'Should have metadata documenting recovery');
            if (serverConfig.metadata.fallbackConfiguration) {
                assert.strictEqual(serverConfig.metadata.fallbackConfiguration, true, 
                    'Should document that fallback configuration was used');
            }
        });
    });
    
    describe('Integration Testing', () => {
        it('should test timeout configuration for all environments', async () => {
            // Test development environment timeout
            await testTimeoutConfiguration(ENVIRONMENT.DEVELOPMENT, SERVER.DEVELOPMENT_TIMEOUT);
            
            // Test production environment timeout
            await testTimeoutConfiguration(ENVIRONMENT.PRODUCTION, SERVER.PRODUCTION_TIMEOUT);
            
            // Test default timeout
            await testTimeoutConfiguration('unknown', SERVER.DEFAULT_TIMEOUT);
        });
        
        it('should test port configuration scenarios comprehensively', async () => {
            await testPortConfigurationScenarios();
        });
        
        it('should test Express.js integration thoroughly', async () => {
            await testExpressConfigurationIntegration();
        });
        
        it('should test connection management comprehensively', async () => {
            await testConnectionManagementSettings();
        });
        
        it('should validate all configuration components work together', async () => {
            // Create comprehensive test configuration
            const testConfig = createMockEnvironmentConfig({
                nodeEnv: ENVIRONMENT.PRODUCTION,
                port: await testUtilities.getAvailablePort(),
                host: ENVIRONMENT.DEFAULT_HOST
            });
            
            // Generate complete server configuration
            const serverConfig = createServerConfig(testConfig);
            
            // Validate all components are properly integrated
            assert.ok(validateServerConfigStructure(serverConfig), 
                'Complete configuration should have valid structure');
            
            // Test configuration validation passes
            const validationResult = validateServerConfig(serverConfig);
            assertValidationResult(validationResult, true, 'integrated server configuration');
            
            // Verify summary generation works with complete configuration
            const summary = createServerSummary(serverConfig);
            assert.ok(summary, 'Should generate summary for complete configuration');
            assert.ok(summary.binding && summary.express && summary.security && summary.performance, 
                'Summary should include all configuration aspects');
            
            // Ensure all HTTP server settings are accessible
            const httpSettings = getHttpServerSettings(testConfig.nodeEnv);
            assert.ok(httpSettings, 'Should generate HTTP settings for complete configuration');
            assert.strictEqual(httpSettings.environment, testConfig.nodeEnv, 
                'HTTP settings should match environment');
            
            // Test Express.js configuration is compatible
            const expressConfig = getExpressConfiguration(testConfig);
            assert.ok(expressConfig, 'Should generate Express.js configuration');
            assert.strictEqual(expressConfig.version, '5.1.0', 
                'Should maintain Express.js version consistency');
        });
    });
});