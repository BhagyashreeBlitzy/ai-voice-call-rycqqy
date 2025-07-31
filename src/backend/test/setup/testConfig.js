/**
 * Comprehensive Test Configuration Module for Node.js Tutorial Application
 * 
 * This module provides centralized test environment settings, test-specific constants,
 * server configuration overrides, and testing utilities for the Node.js tutorial application test suite.
 * Establishes test isolation, manages test environment variables, configures test logging,
 * defines test timeouts, and provides test-specific application settings.
 * 
 * Designed to work seamlessly with Node.js built-in test runner, Express.js 5.1.0 framework,
 * and educational testing patterns while demonstrating testing configuration best practices
 * for development and CI/CD environments.
 * 
 * Features:
 * - Comprehensive test environment configuration and isolation
 * - Dynamic port allocation for test server conflicts prevention
 * - Test-specific logging configuration with appropriate levels
 * - Express.js application testing configuration and middleware setup
 * - Test timeout management and performance threshold configuration
 * - Test coverage and quality metrics configuration
 * - Test utilities integration and mock management patterns
 * - Test cleanup procedures and resource management
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application Testing Team
 * @license MIT
 */

// Import Node.js built-in modules for test configuration and validation
const assert = require('node:assert'); // Built-in Node.js assertion library for test configuration validation
const path = require('node:path'); // Built-in Node.js path utilities for test file and directory management
const os = require('node:os'); // Built-in operating system utilities for test environment detection
const util = require('node:util'); // Built-in Node.js util module for utility functions and promisify

// Import base environment configuration for test environment setup and override
const { config } = require('../../config/environment.js');

// Import application metadata constants for test context and identification
const { APPLICATION } = require('../../utils/constants.js');

// Import environment constants for test configuration and default values
const { ENVIRONMENT } = require('../../utils/constants.js');

// Import HTTP status codes for test validation and assertion constants
const { HTTP_STATUS } = require('../../utils/constants.js');

// Import logging constants for test logging configuration and output control
const { LOGGING } = require('../../utils/constants.js');

// Import timeout constants for test execution timing and performance measurement
const { TIMEOUTS } = require('../../utils/constants.js');

// Import test utilities for test server isolation and environment management
const {
    getAvailablePort,
    createTestLogger, 
    createTestEnvironment,
    validateTestSetup,
    TestUtilities
} = require('../helpers/testHelpers.js');

// Import primary factory function for creating component-specific loggers
const { getLogger } = require('../../utils/logger.js');

// Import factory function for creating configured Express.js application instances
const { createExpressApp } = require('../../app.js');

// Global test configuration constants for version control and port management
const TEST_CONFIG_VERSION = '1.0.0';
const TEST_PORT_RANGE_START = 9000;
const TEST_PORT_RANGE_END = 9999;
const DEFAULT_TEST_TIMEOUT = 30000;

// Initialize test-specific logger for test configuration operations and debugging
const testLogger = createTestLogger('testConfig');

// Initialize component-specific logger for test configuration module operations
const logger = getLogger('testConfig');

/**
 * Creates comprehensive test configuration object with environment settings, server configuration,
 * logging setup, and test-specific overrides for the Node.js tutorial application test suite.
 * 
 * @param {Object} options - Configuration options for test environment setup
 * @param {string} options.testType - Type of test (unit, integration, e2e)
 * @param {Object} options.customConfig - Custom configuration overrides
 * @param {boolean} options.enableLogging - Whether to enable test logging
 * @param {boolean} options.enableCoverage - Whether to enable coverage collection
 * @param {number} options.port - Specific port for test server
 * @param {Object} options.timeouts - Custom timeout configuration
 * @returns {Object} Complete test configuration object with all settings for test execution
 */
function createTestConfiguration(options = {}) {
    try {
        logger.info('Creating comprehensive test configuration', {
            testType: options.testType || 'unit',
            hasCustomConfig: Boolean(options.customConfig),
            enableLogging: options.enableLogging !== false,
            enableCoverage: options.enableCoverage !== false
        });

        // Load base configuration from environment configuration module
        const baseConfig = config || {};
        
        // Apply test-specific environment variable overrides including NODE_ENV=test
        const testEnvironment = {
            NODE_ENV: ENVIRONMENT.TEST,
            PORT: options.port || 0, // 0 for dynamic allocation
            HOST: ENVIRONMENT.DEFAULT_HOST,
            LOG_LEVEL: LOGGING.TEST_LOG_LEVEL || 'error',
            TEST_MODE: 'true',
            TEST_TYPE: options.testType || 'unit',
            TEST_ISOLATION: 'true'
        };

        // Configure test server settings with dynamic port allocation
        const serverConfig = {
            port: options.port || 0,
            host: ENVIRONMENT.DEFAULT_HOST,
            timeout: TIMEOUTS.SERVER_STARTUP,
            keepAliveTimeout: 5000,
            headersTimeout: 60000,
            requestTimeout: TIMEOUTS.REQUEST_PROCESSING,
            express: {
                trustProxy: false,
                strictRouting: false,
                caseSensitive: false,
                jsonLimit: '1mb',
                urlencodedLimit: '1mb'
            }
        };

        // Set up test logging configuration with appropriate log levels
        const loggingConfig = {
            level: LOGGING.TEST_LOG_LEVEL || 'error',
            console: true,
            file: false,
            format: 'simple',
            timestamp: true,
            colorize: false,
            silent: options.enableLogging === false
        };

        // Configure test timeouts and performance thresholds
        const timeoutConfig = getTestTimeouts(options.testType || 'unit');

        // Set up test isolation settings and cleanup procedures
        const isolationConfig = {
            mockProcessEnv: true,
            mockConsole: false,
            restoreOriginals: true,
            cleanupOnExit: true,
            isolateGlobals: true
        };

        // Apply test-specific Express.js application settings
        const applicationConfig = createTestApplicationConfig(baseConfig, {
            trustProxy: false,
            poweredByHeader: false,
            strictRouting: false,
            caseSensitive: false,
            jsonLimit: serverConfig.express.jsonLimit,
            urlencodedLimit: serverConfig.express.urlencodedLimit
        });

        // Configure test database and external service mocking if needed (returns null for stateless app)
        const databaseConfig = getTestDatabaseConfig();

        // Configure test coverage if enabled
        const coverageConfig = options.enableCoverage !== false ? getTestCoverageConfig({
            enabled: true,
            includeUntested: true,
            threshold: 85
        }) : { enabled: false };

        // Validate test configuration completeness and correctness
        const validationResult = validateTestConfiguration({
            environment: testEnvironment,
            server: serverConfig,
            logging: loggingConfig,
            timeouts: timeoutConfig,
            application: applicationConfig,
            coverage: coverageConfig
        });

        if (!validationResult.isValid) {
            logger.warn('Test configuration validation warnings', {
                errors: validationResult.errors,
                warnings: validationResult.warnings
            });
        }

        // Return comprehensive test configuration object
        const testConfiguration = {
            version: TEST_CONFIG_VERSION,
            testType: options.testType || 'unit',
            environment: testEnvironment,
            server: serverConfig,
            logging: loggingConfig,
            timeouts: timeoutConfig,
            isolation: isolationConfig,
            application: applicationConfig,
            database: databaseConfig,
            coverage: coverageConfig,
            validation: validationResult,
            metadata: {
                createdAt: new Date().toISOString(),
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                applicationName: APPLICATION.NAME,
                applicationVersion: APPLICATION.VERSION
            },
            customConfig: options.customConfig || {}
        };

        logger.info('Test configuration created successfully', {
            version: TEST_CONFIG_VERSION,
            testType: testConfiguration.testType,
            serverPort: serverConfig.port,
            validationScore: validationResult.validationScore || 0,
            coverageEnabled: coverageConfig.enabled
        });

        return testConfiguration;

    } catch (error) {
        logger.error('Failed to create test configuration', {
            error: error.message,
            stack: error.stack,
            options: options
        });

        // Return minimal fallback configuration
        return {
            version: TEST_CONFIG_VERSION,
            testType: 'unit',
            environment: { NODE_ENV: 'test' },
            server: { port: 0, host: 'localhost' },
            logging: { level: 'error', console: true },
            timeouts: { default: DEFAULT_TEST_TIMEOUT },
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Retrieves test environment configuration with appropriate overrides for test execution
 * including port allocation, logging levels, and environment isolation settings.
 * 
 * @param {string} testType - Type of test (unit, integration, e2e)
 * @param {Object} customConfig - Custom configuration overrides
 * @returns {Object} Test environment configuration object optimized for specified test type
 */
async function getTestEnvironmentConfig(testType = 'unit', customConfig = {}) {
    try {
        logger.debug('Retrieving test environment configuration', {
            testType: testType,
            hasCustomConfig: Object.keys(customConfig).length > 0
        });

        // Determine test type and apply appropriate settings
        const testTypeSettings = {
            unit: {
                timeout: 5000,
                parallel: true,
                isolation: 'high',
                mocking: 'extensive'
            },
            integration: {
                timeout: 10000,
                parallel: false,
                isolation: 'medium',
                mocking: 'selective'
            },
            e2e: {
                timeout: 30000,
                parallel: false,
                isolation: 'low',
                mocking: 'minimal'
            }
        };

        const settings = testTypeSettings[testType] || testTypeSettings.unit;

        // Get available port using getAvailablePort function for test isolation
        const availablePort = await getAvailablePort(TEST_PORT_RANGE_START, TEST_PORT_RANGE_END);

        // Set NODE_ENV to 'test' for test environment identification
        const environment = {
            NODE_ENV: ENVIRONMENT.TEST,
            PORT: availablePort,
            HOST: ENVIRONMENT.DEFAULT_HOST,
            LOG_LEVEL: LOGGING.TEST_LOG_LEVEL,
            TEST_TYPE: testType,
            TEST_PARALLEL: settings.parallel,
            TEST_ISOLATION: settings.isolation,
            TEST_MOCKING: settings.mocking,
            TEST_TIMEOUT: settings.timeout
        };

        // Configure test-specific host binding (localhost for security)
        const hostConfig = {
            host: ENVIRONMENT.DEFAULT_HOST,
            port: availablePort,
            bindToLocalhost: true,
            allowExternalConnections: false
        };

        // Set appropriate log level using TEST_LOG_LEVEL constant
        const loggingConfig = {
            level: LOGGING.TEST_LOG_LEVEL,
            console: true,
            file: false,
            silent: testType === 'unit', // Silence unit tests for performance
            timestamp: testType !== 'unit'
        };

        // Apply custom configuration overrides if provided
        const finalConfig = util.isDeepStrictEqual(customConfig, {}) ? {
            environment,
            host: hostConfig,
            logging: loggingConfig,
            settings,
            metadata: {
                testType,
                port: availablePort,
                configuredAt: new Date().toISOString()
            }
        } : {
            ...{
                environment,
                host: hostConfig,
                logging: loggingConfig,
                settings
            },
            ...customConfig,
            metadata: {
                testType,
                port: availablePort,
                configuredAt: new Date().toISOString(),
                customOverrides: Object.keys(customConfig).length
            }
        };

        // Validate environment configuration for test requirements
        const isValid = availablePort > 0 && 
                        environment.NODE_ENV === 'test' && 
                        hostConfig.host === 'localhost';

        if (!isValid) {
            throw new Error('Invalid test environment configuration');
        }

        logger.info('Test environment configuration retrieved successfully', {
            testType: testType,
            port: availablePort,
            host: hostConfig.host,
            logLevel: loggingConfig.level,
            hasCustomConfig: Object.keys(customConfig).length > 0
        });

        // Return configured test environment object
        return finalConfig;

    } catch (error) {
        logger.error('Failed to get test environment configuration', {
            error: error.message,
            stack: error.stack,
            testType: testType
        });

        // Return fallback configuration
        return {
            environment: {
                NODE_ENV: 'test',
                PORT: 9000,
                HOST: 'localhost',
                LOG_LEVEL: 'error'
            },
            host: {
                host: 'localhost',
                port: 9000
            },
            logging: {
                level: 'error',
                console: true
            },
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Creates Express.js application instance configured for testing with test-specific middleware,
 * routes, and error handling optimized for test execution and isolation.
 * 
 * @param {Object} testConfig - Test configuration object with server settings
 * @returns {Promise<Object>} Promise resolving to configured Express.js application instance for testing
 */
async function createTestServer(testConfig = {}) {
    try {
        logger.debug('Creating test server with Express.js application', {
            hasTestConfig: Boolean(testConfig),
            testType: testConfig.testType || 'unit'
        });

        // Create Express.js application using createExpressApp function
        const expressApp = createExpressApp({
            config: testConfig,
            enableMiddleware: testConfig.enableMiddleware !== false,
            enableRoutes: testConfig.enableRoutes !== false,
            enableSecurity: testConfig.enableSecurity !== false,
            enableErrorHandling: testConfig.enableErrorHandling !== false
        });

        // Apply test-specific configuration overrides to application
        if (testConfig.server) {
            // Configure test middleware stack with minimal logging for performance
            if (testConfig.server.minimalLogging !== false) {
                expressApp.set('trust proxy', false);
                expressApp.set('x-powered-by', false);
            }

            // Set up test routes and endpoints for testing scenarios
            if (!expressApp._router || expressApp._router.stack.length === 0) {
                expressApp.get('/hello', (req, res) => {
                    res.status(HTTP_STATUS.OK).send('Hello world');
                });
            }

            // Configure test-specific error handling and response formatting
            expressApp.use((error, req, res, next) => {
                if (testConfig.environment && testConfig.environment.NODE_ENV === 'test') {
                    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                        error: 'Test error',
                        message: error.message,
                        testMode: true
                    });
                } else {
                    next(error);
                }
            });
        }

        // Apply test environment settings including port and host configuration
        const serverOptions = {
            port: testConfig.server?.port || 0,
            host: testConfig.server?.host || 'localhost',
            timeout: testConfig.timeouts?.server || TIMEOUTS.SERVER_STARTUP
        };

        // Add test metadata to application instance
        expressApp.locals.testConfiguration = {
            testType: testConfig.testType || 'unit',
            version: TEST_CONFIG_VERSION,
            createdAt: new Date().toISOString(),
            serverOptions: serverOptions
        };

        // Validate test server configuration and readiness
        const isValidServer = expressApp && typeof expressApp === 'function';
        if (!isValidServer) {
            throw new Error('Invalid Express.js application instance created');
        }

        logger.info('Test server created successfully', {
            testType: testConfig.testType || 'unit',
            port: serverOptions.port,
            host: serverOptions.host,
            hasRoutes: Boolean(expressApp._router && expressApp._router.stack.length > 0),
            hasTestMetadata: Boolean(expressApp.locals.testConfiguration)
        });

        // Return configured Express.js application ready for testing
        return expressApp;

    } catch (error) {
        logger.error('Failed to create test server', {
            error: error.message,
            stack: error.stack,
            testConfig: testConfig
        });

        // Return minimal Express.js application for fallback
        const fallbackApp = createExpressApp({
            enableMiddleware: false,
            enableSecurity: false
        });

        fallbackApp.get('/hello', (req, res) => {
            res.status(HTTP_STATUS.OK).send('Hello world');
        });

        fallbackApp.locals.testConfiguration = {
            fallback: true,
            error: error.message
        };

        return fallbackApp;
    }
}

/**
 * Sets up complete test environment including process environment variables, test utilities,
 * logging configuration, and cleanup procedures for test execution.
 * 
 * @param {Object} testOptions - Test environment setup options
 * @param {boolean} testOptions.mockEnvironment - Whether to mock process.env
 * @param {boolean} testOptions.enableCleanup - Whether to enable automatic cleanup
 * @param {Object} testOptions.environmentOverrides - Environment variable overrides
 * @returns {Promise<Object>} Promise resolving to test environment object with utilities and cleanup functions
 */
async function setupTestEnvironment(testOptions = {}) {
    try {
        logger.debug('Setting up test environment', {
            mockEnvironment: testOptions.mockEnvironment !== false,
            enableCleanup: testOptions.enableCleanup !== false,
            hasOverrides: Boolean(testOptions.environmentOverrides)
        });

        // Create test environment using createTestEnvironment function
        const testEnvironment = await createTestEnvironment({
            isolateEnvironment: testOptions.mockEnvironment !== false,
            cleanupOnExit: testOptions.enableCleanup !== false,
            environmentOverrides: testOptions.environmentOverrides || {}
        });

        // Set up test-specific environment variables and configuration
        const environmentVariables = {
            NODE_ENV: ENVIRONMENT.TEST,
            LOG_LEVEL: LOGGING.TEST_LOG_LEVEL,
            TEST_MODE: 'true',
            TEST_SETUP: 'true',
            ...testOptions.environmentOverrides
        };

        // Apply environment variables to test environment
        Object.entries(environmentVariables).forEach(([key, value]) => {
            testEnvironment.setEnvironmentVariable(key, value);
        });

        // Initialize test utilities and helper functions
        const testUtils = new TestUtilities({
            enableMocking: true,
            enableCleanup: testOptions.enableCleanup !== false,
            trackCalls: true
        });

        // Configure test logging with appropriate levels and formatting
        const testLoggingConfig = {
            level: LOGGING.TEST_LOG_LEVEL,
            console: true,
            file: false,
            format: 'test',
            silent: testOptions.silentLogging === true
        };

        // Set up test isolation and cleanup procedures
        const cleanupHandlers = [];
        
        if (testOptions.enableCleanup !== false) {
            cleanupHandlers.push(
                () => testEnvironment.cleanup(),
                () => testUtils.cleanup(),
                () => logger.debug('Test environment cleanup completed')
            );
        }

        // Validate test environment setup using validateTestSetup function
        const validationResult = await validateTestSetup({
            environment: testEnvironment,
            utilities: testUtils,
            logging: testLoggingConfig,
            cleanup: cleanupHandlers
        });

        if (!validationResult.isValid) {
            logger.warn('Test environment setup validation issues', {
                errors: validationResult.errors,
                warnings: validationResult.warnings
            });
        }

        // Register cleanup handlers for test teardown
        const cleanupFunction = async () => {
            for (const handler of cleanupHandlers) {
                try {
                    await handler();
                } catch (cleanupError) {
                    logger.error('Cleanup handler error', {
                        error: cleanupError.message
                    });
                }
            }
        };

        // Return test environment object with utilities and cleanup functions
        const environmentSetup = {
            environment: testEnvironment,
            utilities: testUtils,
            logging: testLoggingConfig,
            cleanup: cleanupFunction,
            validation: validationResult,
            metadata: {
                setupAt: new Date().toISOString(),
                version: TEST_CONFIG_VERSION,
                options: testOptions,
                cleanupHandlers: cleanupHandlers.length
            }
        };

        logger.info('Test environment setup completed successfully', {
            hasEnvironment: Boolean(testEnvironment),
            hasUtilities: Boolean(testUtils),
            cleanupHandlers: cleanupHandlers.length,
            validationPassed: validationResult.isValid
        });

        return environmentSetup;

    } catch (error) {
        logger.error('Failed to setup test environment', {
            error: error.message,
            stack: error.stack,
            testOptions: testOptions
        });

        // Return minimal environment setup
        return {
            environment: null,
            utilities: null,
            logging: { level: 'error', console: true },
            cleanup: async () => {},
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Returns test timeout configuration object with appropriate timeout values for different
 * test types, operations, and performance thresholds based on Node.js testing best practices.
 * 
 * @param {string} testType - Type of test (unit, integration, e2e)
 * @returns {Object} Test timeout configuration object with operation-specific timeout values
 */
function getTestTimeouts(testType = 'unit') {
    try {
        logger.debug('Getting test timeout configuration', {
            testType: testType
        });

        // Define base timeout values from TIMEOUTS constants
        const baseTimeouts = {
            server: TIMEOUTS.SERVER_STARTUP || 5000,
            shutdown: TIMEOUTS.SERVER_SHUTDOWN || 3000,
            request: TIMEOUTS.REQUEST_PROCESSING || 1000,
            async: 5000,
            promise: 2000
        };

        // Apply test type-specific timeout multipliers
        const multipliers = {
            unit: 1,
            integration: 2,
            e2e: 3
        };

        const multiplier = multipliers[testType] || 1;

        // Configure server startup and shutdown timeouts
        const serverTimeouts = {
            startup: baseTimeouts.server * multiplier,
            shutdown: baseTimeouts.shutdown * multiplier,
            keepAlive: 5000,
            headers: 60000
        };

        // Set HTTP request processing timeouts for API testing
        const requestTimeouts = {
            processing: baseTimeouts.request * multiplier,
            response: baseTimeouts.request * multiplier * 1.5,
            connection: 10000
        };

        // Configure async operation timeouts for promise-based testing
        const asyncTimeouts = {
            promise: baseTimeouts.promise * multiplier,
            callback: baseTimeouts.async * multiplier,
            timeout: baseTimeouts.async * multiplier,
            interval: 100
        };

        // Apply environment-specific timeout adjustments (CI vs local)
        const environmentMultiplier = process.env.CI ? 2 : 1;
        
        // Return complete timeout configuration object
        const timeoutConfiguration = {
            default: DEFAULT_TEST_TIMEOUT * multiplier * environmentMultiplier,
            testType: testType,
            multiplier: multiplier,
            environmentMultiplier: environmentMultiplier,
            server: {
                startup: serverTimeouts.startup * environmentMultiplier,
                shutdown: serverTimeouts.shutdown * environmentMultiplier,
                keepAlive: serverTimeouts.keepAlive,
                headers: serverTimeouts.headers
            },
            request: {
                processing: requestTimeouts.processing * environmentMultiplier,
                response: requestTimeouts.response * environmentMultiplier,
                connection: requestTimeouts.connection
            },
            async: {
                promise: asyncTimeouts.promise * environmentMultiplier,
                callback: asyncTimeouts.callback * environmentMultiplier,
                timeout: asyncTimeouts.timeout * environmentMultiplier,
                interval: asyncTimeouts.interval
            },
            metadata: {
                createdAt: new Date().toISOString(),
                baseMultiplier: multiplier,
                ciEnvironment: Boolean(process.env.CI)
            }
        };

        logger.debug('Test timeout configuration created', {
            testType: testType,
            defaultTimeout: timeoutConfiguration.default,
            serverStartup: timeoutConfiguration.server.startup,
            requestProcessing: timeoutConfiguration.request.processing,
            ciMultiplier: environmentMultiplier
        });

        return timeoutConfiguration;

    } catch (error) {
        logger.error('Failed to get test timeout configuration', {
            error: error.message,
            testType: testType
        });

        // Return fallback timeout configuration
        return {
            default: DEFAULT_TEST_TIMEOUT,
            testType: testType,
            server: { startup: 5000, shutdown: 3000 },
            request: { processing: 1000, response: 1500 },
            async: { promise: 2000, callback: 5000 },
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Validates test configuration completeness, correctness, and compatibility with Node.js
 * built-in test runner and Express.js 5.1.0 framework requirements.
 * 
 * @param {Object} testConfig - Test configuration object to validate
 * @returns {Object} Validation result object with success status, errors, and warnings
 */
function validateTestConfiguration(testConfig) {
    try {
        logger.debug('Validating test configuration', {
            hasConfig: Boolean(testConfig),
            configKeys: testConfig ? Object.keys(testConfig) : []
        });

        // Initialize validation result
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            validationScore: 100,
            details: {}
        };

        // Validate required configuration properties and data types
        const requiredProperties = ['environment', 'server', 'logging', 'timeouts'];
        requiredProperties.forEach(prop => {
            if (!testConfig[prop]) {
                validation.errors.push(`Missing required property: ${prop}`);
                validation.isValid = false;
                validation.validationScore -= 20;
            } else {
                validation.details[prop] = { present: true, type: typeof testConfig[prop] };
            }
        });

        // Check port availability and network configuration
        if (testConfig.server) {
            const port = testConfig.server.port;
            if (port && (port < 1024 || port > 65535)) {
                validation.warnings.push(`Port ${port} may require elevated privileges or be invalid`);
                validation.validationScore -= 5;
            }

            const host = testConfig.server.host;
            if (host && host !== 'localhost' && host !== '127.0.0.1') {
                validation.warnings.push(`Non-localhost host '${host}' may cause security or accessibility issues`);
                validation.validationScore -= 5;
            }

            validation.details.server = {
                port: port,
                host: host,
                valid: true
            };
        }

        // Verify Node.js version compatibility for test runner features
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 18) {
            validation.errors.push(`Node.js version ${nodeVersion} is not supported. Requires v18+`);
            validation.isValid = false;
            validation.validationScore -= 30;
        } else {
            validation.details.nodeVersion = {
                version: nodeVersion,
                majorVersion: majorVersion,
                supported: true
            };
        }

        // Validate Express.js version compatibility and features
        try {
            const express = require('express');
            if (express.version && express.version.startsWith('5.')) {
                validation.details.expressVersion = {
                    version: express.version,
                    compatible: true
                };
            } else {
                validation.warnings.push('Express.js version may not be 5.x series');
                validation.validationScore -= 10;
            }
        } catch (expressError) {
            validation.errors.push('Express.js not available or not installed');
            validation.isValid = false;
            validation.validationScore -= 25;
        }

        // Check test directory structure and file accessibility
        try {
            const testDir = path.join(process.cwd(), 'test');
            const fs = require('fs');
            
            if (fs.existsSync(testDir)) {
                validation.details.testDirectory = {
                    exists: true,
                    path: testDir
                };
            } else {
                validation.warnings.push('Test directory does not exist');
                validation.validationScore -= 5;
            }
        } catch (fsError) {
            validation.warnings.push('Could not verify test directory structure');
            validation.validationScore -= 5;
        }

        // Verify test timeout values are within reasonable ranges
        if (testConfig.timeouts) {
            const timeouts = testConfig.timeouts;
            
            if (timeouts.default && (timeouts.default < 1000 || timeouts.default > 300000)) {
                validation.warnings.push(`Default timeout ${timeouts.default}ms may be too short or too long`);
                validation.validationScore -= 5;
            }

            validation.details.timeouts = {
                default: timeouts.default,
                reasonable: timeouts.default >= 1000 && timeouts.default <= 300000
            };
        }

        // Validate logging configuration for test environments
        if (testConfig.logging) {
            const logging = testConfig.logging;
            const validLevels = ['error', 'warn', 'info', 'debug'];
            
            if (logging.level && !validLevels.includes(logging.level)) {
                validation.warnings.push(`Invalid log level: ${logging.level}`);
                validation.validationScore -= 5;
            }

            validation.details.logging = {
                level: logging.level,
                valid: validLevels.includes(logging.level)
            };
        }

        // Compile validation results with errors, warnings, and recommendations
        validation.summary = {
            totalErrors: validation.errors.length,
            totalWarnings: validation.warnings.length,
            validationScore: Math.max(0, validation.validationScore),
            isValid: validation.isValid,
            validatedAt: new Date().toISOString(),
            recommendations: []
        };

        // Add recommendations based on validation results
        if (validation.validationScore < 100) {
            validation.summary.recommendations.push('Review configuration warnings to improve test reliability');
        }

        if (validation.errors.length === 0 && validation.warnings.length === 0) {
            validation.summary.recommendations.push('Configuration is optimal for testing');
        }

        logger.info('Test configuration validation completed', {
            isValid: validation.isValid,
            validationScore: validation.validationScore,
            errorCount: validation.errors.length,
            warningCount: validation.warnings.length
        });

        // Return comprehensive validation result object
        return validation;

    } catch (error) {
        logger.error('Error during test configuration validation', {
            error: error.message,
            stack: error.stack
        });

        return {
            isValid: false,
            errors: [`Validation failed: ${error.message}`],
            warnings: [],
            validationScore: 0,
            details: {},
            summary: {
                totalErrors: 1,
                totalWarnings: 0,
                validationError: error.message
            }
        };
    }
}

/**
 * Creates application-specific configuration for testing including Express.js settings,
 * middleware configuration, security settings, and performance optimizations for test execution.
 * 
 * @param {Object} baseConfig - Base application configuration to extend
 * @param {Object} testOverrides - Test-specific configuration overrides
 * @returns {Object} Test application configuration object with Express.js and middleware settings
 */
function createTestApplicationConfig(baseConfig = {}, testOverrides = {}) {
    try {
        logger.debug('Creating test application configuration', {
            hasBaseConfig: Boolean(baseConfig),
            hasOverrides: Boolean(testOverrides),
            overrideKeys: Object.keys(testOverrides)
        });

        // Start with base application configuration from baseConfig parameter
        const applicationConfig = util.isDeepStrictEqual(baseConfig, {}) ? {
            server: {
                port: 0,
                host: 'localhost'
            },
            logging: {
                level: 'error'
            }
        } : { ...baseConfig };

        // Apply test-specific Express.js settings including trust proxy and security headers
        const expressSettings = {
            trustProxy: testOverrides.trustProxy || false,
            poweredByHeader: testOverrides.poweredByHeader || false,
            strictRouting: testOverrides.strictRouting || false,
            caseSensitive: testOverrides.caseSensitive || false,
            jsonLimit: testOverrides.jsonLimit || '1mb',
            urlencodedLimit: testOverrides.urlencodedLimit || '1mb',
            viewCache: false,
            etag: false
        };

        // Configure test middleware stack with minimal overhead for performance
        const middlewareConfig = {
            requestLogger: false, // Disable request logging for test performance
            responseHandler: true,
            errorHandler: true,
            notFoundHandler: true,
            jsonParser: true,
            urlencodedParser: true,
            securityHeaders: false // Minimal security headers for testing
        };

        // Set up test-specific route configuration and endpoint settings
        const routeConfig = {
            helloEndpoint: '/hello',
            healthEndpoint: '/health',
            enableStaticFiles: false,
            enableCors: false,
            enableCompression: false
        };

        // Configure test error handling and response formatting
        const errorHandling = {
            showStackTrace: true, // Show stack traces in test environment
            logErrors: true,
            customErrorPages: false,
            errorFormat: 'json'
        };

        // Apply test security settings appropriate for test environment
        const securityConfig = {
            helmet: false,
            cors: false,
            rateLimit: false,
            csrf: false,
            session: false,
            authentication: false
        };

        // Override production settings that may interfere with testing
        const testSpecificOverrides = {
            enableHttps: false,
            enableStaticFiles: false,
            enableViewEngine: false,
            enableSessions: false,
            enableCaching: false,
            enableCompression: false
        };

        // Validate test application configuration completeness
        const configurationValid = Boolean(expressSettings && middlewareConfig && routeConfig);

        if (!configurationValid) {
            logger.warn('Test application configuration validation failed');
        }

        // Return test-optimized application configuration object
        const testAppConfig = {
            ...applicationConfig,
            express: expressSettings,
            middleware: middlewareConfig,
            routes: routeConfig,
            errorHandling: errorHandling,
            security: securityConfig,
            overrides: {
                ...testSpecificOverrides,
                ...testOverrides
            },
            metadata: {
                configType: 'test',
                createdAt: new Date().toISOString(),
                baseConfigKeys: Object.keys(baseConfig),
                overrideKeys: Object.keys(testOverrides),
                valid: configurationValid
            }
        };

        logger.info('Test application configuration created successfully', {
            expressSettings: Object.keys(expressSettings).length,
            middlewareOptions: Object.keys(middlewareConfig).length,
            securityDisabled: Object.keys(securityConfig).filter(key => !securityConfig[key]).length,
            overridesApplied: Object.keys(testOverrides).length
        });

        return testAppConfig;

    } catch (error) {
        logger.error('Failed to create test application configuration', {
            error: error.message,
            stack: error.stack,
            baseConfig: baseConfig,
            testOverrides: testOverrides
        });

        // Return minimal fallback configuration
        return {
            express: {
                trustProxy: false,
                poweredByHeader: false,
                jsonLimit: '1mb'
            },
            middleware: {
                requestLogger: false,
                errorHandler: true
            },
            routes: {
                helloEndpoint: '/hello'
            },
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Returns test database configuration (currently returns null as tutorial application is stateless,
 * but demonstrates configuration pattern for future enhancements).
 * 
 * @returns {null} Returns null as tutorial application operates without database
 */
function getTestDatabaseConfig() {
    try {
        // Check if database configuration is required for test execution
        const requiresDatabase = false; // Tutorial application is stateless

        if (requiresDatabase) {
            // Future database configuration would go here
            logger.debug('Database configuration would be created here for stateful applications');
            
            return {
                type: 'memory',
                connection: {
                    host: 'localhost',
                    port: 0,
                    database: 'test_db'
                },
                pool: {
                    min: 1,
                    max: 5
                },
                migrations: {
                    enabled: false
                }
            };
        }

        // Return null for stateless tutorial application
        logger.debug('No database configuration needed for stateless tutorial application');

        // Log that no database configuration is needed for current tests
        logger.info('Database configuration not required', {
            applicationStateless: true,
            databaseRequired: false,
            tutorialApplication: true
        });

        // Provide placeholder for future database integration tutorials
        return null;

    } catch (error) {
        logger.error('Error in database configuration check', {
            error: error.message
        });

        return null;
    }
}

/**
 * Creates test reporter configuration for Node.js built-in test runner with appropriate
 * output formatting, coverage reporting, and educational-friendly display options.
 * 
 * @param {string} reporterType - Type of reporter (spec, tap, junit, coverage)
 * @param {Object} reporterOptions - Reporter-specific configuration options
 * @returns {Object} Test reporter configuration object for Node.js test runner
 */
function createTestReporter(reporterType = 'spec', reporterOptions = {}) {
    try {
        logger.debug('Creating test reporter configuration', {
            reporterType: reporterType,
            hasOptions: Object.keys(reporterOptions).length > 0
        });

        // Determine reporter type and configure options
        const supportedReporters = ['spec', 'tap', 'junit', 'dot', 'json'];
        const selectedReporter = supportedReporters.includes(reporterType) ? reporterType : 'spec';

        // Configure reporter-specific options and formatting
        const reporterConfigurations = {
            spec: {
                colors: true,
                unicode: true,
                verbose: reporterOptions.verbose || false,
                showDiff: true,
                timeout: DEFAULT_TEST_TIMEOUT
            },
            tap: {
                version: 14,
                strict: false,
                omitVersion: false
            },
            junit: {
                outputFile: reporterOptions.outputFile || 'test-results.xml',
                suiteName: reporterOptions.suiteName || APPLICATION.NAME,
                includeConsoleOutput: true
            },
            dot: {
                colors: true,
                compact: true
            },
            json: {
                outputFile: reporterOptions.outputFile || 'test-results.json',
                includeMetadata: true
            }
        };

        const baseConfig = reporterConfigurations[selectedReporter] || reporterConfigurations.spec;

        // Set up coverage reporting configuration if requested
        const coverageConfig = reporterOptions.coverage ? {
            enabled: true,
            format: ['text', 'lcov', 'html'],
            directory: 'coverage',
            includeAllFiles: true,
            exclude: ['test/**/*', 'coverage/**/*', 'node_modules/**/*']
        } : { enabled: false };

        // Configure output destinations and file paths
        const outputConfig = {
            console: reporterOptions.console !== false,
            file: reporterOptions.file || false,
            outputDirectory: reporterOptions.outputDirectory || './test-output',
            timestampFiles: true
        };

        // Apply educational-friendly formatting for tutorial context
        const educationalConfig = {
            showSuccessDetails: true,
            showFailureContext: true,
            highlightKeyLearnings: true,
            includePerformanceMetrics: reporterOptions.includePerformance !== false,
            simplifyStackTraces: true
        };

        // Set up test result aggregation and summary reporting
        const aggregationConfig = {
            collectTestStats: true,
            generateSummary: true,
            trackPerformance: true,
            measureCoverage: coverageConfig.enabled
        };

        // Configure error reporting and stack trace formatting
        const errorReporting = {
            showFullStackTrace: reporterOptions.fullStackTrace || false,
            highlightTestCode: true,
            filterNodeModules: true,
            includeSourceContext: true
        };

        // Return complete test reporter configuration object
        const reporterConfig = {
            type: selectedReporter,
            options: {
                ...baseConfig,
                ...reporterOptions
            },
            coverage: coverageConfig,
            output: outputConfig,
            educational: educationalConfig,
            aggregation: aggregationConfig,
            errorReporting: errorReporting,
            metadata: {
                createdAt: new Date().toISOString(),
                version: TEST_CONFIG_VERSION,
                supportedReporters: supportedReporters,
                selectedReporter: selectedReporter
            }
        };

        logger.info('Test reporter configuration created successfully', {
            reporterType: selectedReporter,
            coverageEnabled: coverageConfig.enabled,
            consoleOutput: outputConfig.console,
            fileOutput: outputConfig.file,
            educationalFeatures: Object.keys(educationalConfig).length
        });

        return reporterConfig;

    } catch (error) {
        logger.error('Failed to create test reporter configuration', {
            error: error.message,
            stack: error.stack,
            reporterType: reporterType,
            reporterOptions: reporterOptions
        });

        // Return fallback reporter configuration
        return {
            type: 'spec',
            options: {
                colors: true,
                verbose: false
            },
            coverage: { enabled: false },
            output: { console: true, file: false },
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Returns test coverage configuration for Node.js built-in coverage reporting with thresholds,
 * exclusions, and output formatting suitable for educational purposes.
 * 
 * @param {Object} coverageOptions - Coverage configuration options
 * @returns {Object} Test coverage configuration object with thresholds and reporting settings
 */
function getTestCoverageConfig(coverageOptions = {}) {
    try {
        logger.debug('Creating test coverage configuration', {
            hasOptions: Object.keys(coverageOptions).length > 0,
            enabled: coverageOptions.enabled !== false
        });

        // Configure coverage thresholds (90% line, 95% function, 85% branch coverage)
        const thresholds = {
            lines: coverageOptions.lineThreshold || 90,
            functions: coverageOptions.functionThreshold || 95,
            branches: coverageOptions.branchThreshold || 85,
            statements: coverageOptions.statementThreshold || 90
        };

        // Set up coverage exclusions for test files and configuration files
        const exclusions = [
            'test/**/*',
            'tests/**/*',
            '**/*.test.js',
            '**/*.spec.js',
            'coverage/**/*',
            'node_modules/**/*',
            'dist/**/*',
            'build/**/*',
            '.nyc_output/**/*',
            ...(coverageOptions.exclude || [])
        ];

        // Configure coverage output formats (console, LCOV, HTML)
        const outputFormats = coverageOptions.formats || ['text', 'lcov', 'html'];

        // Set coverage collection directories and file patterns
        const collectionConfig = {
            include: coverageOptions.include || ['src/**/*.js', 'lib/**/*.js'],
            exclude: exclusions,
            extensions: ['.js', '.mjs', '.cjs'],
            sourceMap: true,
            instrument: true
        };

        // Configure coverage reporting with educational-friendly formatting
        const reportingConfig = {
            formats: outputFormats,
            directory: coverageOptions.directory || 'coverage',
            console: {
                showUncovered: true,
                showSummary: true,
                colorize: true,
                verbose: coverageOptions.verbose || false
            },
            html: {
                skipEmpty: false,
                skipFull: false,
                includeSourceMaps: true
            },
            lcov: {
                outputFile: 'lcov.info',
                includeAbsolutePaths: false
            }
        };

        // Set up coverage enforcement and failure thresholds
        const enforcementConfig = {
            enforceThresholds: coverageOptions.enforce !== false,
            failOnLowCoverage: coverageOptions.failOnLow !== false,
            watermarks: {
                statements: [50, 80],
                functions: [50, 80],
                branches: [50, 80],
                lines: [50, 80]
            }
        };

        // Apply environment-specific coverage settings
        const environmentConfig = {
            ciMode: Boolean(process.env.CI),
            collectInCI: coverageOptions.collectInCI !== false,
            reportInCI: coverageOptions.reportInCI !== false,
            uploadToServices: coverageOptions.upload || []
        };

        // Return complete coverage configuration object
        const coverageConfig = {
            enabled: coverageOptions.enabled !== false,
            thresholds: thresholds,
            collection: collectionConfig,
            reporting: reportingConfig,
            enforcement: enforcementConfig,
            environment: environmentConfig,
            metadata: {
                version: TEST_CONFIG_VERSION,
                createdAt: new Date().toISOString(),
                nodeVersion: process.version,
                platform: process.platform
            }
        };

        logger.info('Test coverage configuration created successfully', {
            enabled: coverageConfig.enabled,
            lineThreshold: thresholds.lines,
            functionThreshold: thresholds.functions,
            branchThreshold: thresholds.branches,
            outputFormats: outputFormats.length,
            exclusions: exclusions.length,
            enforcement: enforcementConfig.enforceThresholds
        });

        return coverageConfig;

    } catch (error) {
        logger.error('Failed to create test coverage configuration', {
            error: error.message,
            stack: error.stack,
            coverageOptions: coverageOptions
        });

        // Return fallback coverage configuration
        return {
            enabled: false,
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80
            },
            collection: {
                include: ['src/**/*.js'],
                exclude: ['test/**/*', 'node_modules/**/*']
            },
            reporting: {
                formats: ['text'],
                directory: 'coverage'
            },
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Creates comprehensive test cleanup handler that manages test environment restoration,
 * resource cleanup, and proper test isolation between test runs.
 * 
 * @param {Object} testUtilities - Test utilities instance for cleanup management
 * @returns {Function} Cleanup handler function for test environment restoration
 */
function createTestCleanupHandler(testUtilities) {
    try {
        logger.debug('Creating test cleanup handler', {
            hasUtilities: Boolean(testUtilities)
        });

        // Create cleanup function that handles environment variable restoration
        const cleanupHandler = async () => {
            const cleanupResults = {
                success: true,
                errors: [],
                cleanupSteps: [],
                timing: {
                    startTime: Date.now(),
                    endTime: null,
                    duration: null
                }
            };

            try {
                // Include mock function cleanup and reset procedures
                if (testUtilities && typeof testUtilities.cleanup === 'function') {
                    logger.debug('Executing test utilities cleanup');
                    await testUtilities.cleanup();
                    cleanupResults.cleanupSteps.push('testUtilities.cleanup');
                }

                // Set up server instance cleanup and port release
                if (global.testServer) {
                    logger.debug('Cleaning up test server instance');
                    if (global.testServer.close && typeof global.testServer.close === 'function') {
                        await util.promisify(global.testServer.close.bind(global.testServer))();
                    }
                    global.testServer = null;
                    cleanupResults.cleanupSteps.push('serverCleanup');
                }

                // Configure test file and temporary resource cleanup
                if (global.testTempFiles && Array.isArray(global.testTempFiles)) {
                    logger.debug('Cleaning up temporary test files');
                    const fs = require('fs').promises;
                    
                    for (const tempFile of global.testTempFiles) {
                        try {
                            await fs.unlink(tempFile);
                        } catch (fileError) {
                            cleanupResults.errors.push(`Failed to remove temp file ${tempFile}: ${fileError.message}`);
                        }
                    }
                    
                    global.testTempFiles = [];
                    cleanupResults.cleanupSteps.push('tempFileCleanup');
                }

                // Include logging cleanup and buffer flushing
                logger.debug('Flushing logging buffers');
                if (console.flush && typeof console.flush === 'function') {
                    console.flush();
                }
                cleanupResults.cleanupSteps.push('loggingCleanup');

                // Reset any global test state
                if (global.testState) {
                    global.testState = null;
                    cleanupResults.cleanupSteps.push('globalStateReset');
                }

                // Record cleanup completion timing
                cleanupResults.timing.endTime = Date.now();
                cleanupResults.timing.duration = cleanupResults.timing.endTime - cleanupResults.timing.startTime;

                logger.info('Test cleanup completed successfully', {
                    duration: cleanupResults.timing.duration,
                    stepsCompleted: cleanupResults.cleanupSteps.length,
                    errors: cleanupResults.errors.length
                });

            } catch (cleanupError) {
                cleanupResults.success = false;
                cleanupResults.errors.push(cleanupError.message);
                
                logger.error('Test cleanup failed', {
                    error: cleanupError.message,
                    stack: cleanupError.stack
                });
            }

            return cleanupResults;
        };

        // Add error handling for cleanup procedure failures
        const robustCleanupHandler = async () => {
            try {
                return await cleanupHandler();
            } catch (handlerError) {
                logger.error('Cleanup handler execution failed', {
                    error: handlerError.message,
                    stack: handlerError.stack
                });

                return {
                    success: false,
                    errors: [handlerError.message],
                    cleanupSteps: [],
                    timing: { startTime: Date.now(), endTime: Date.now(), duration: 0 }
                };
            }
        };

        // Register cleanup handler with test utilities for automatic execution
        if (testUtilities && typeof testUtilities.registerCleanupHandler === 'function') {
            testUtilities.registerCleanupHandler(robustCleanupHandler);
        }

        // Return comprehensive cleanup handler function
        return robustCleanupHandler;

    } catch (error) {
        logger.error('Failed to create test cleanup handler', {
            error: error.message,
            stack: error.stack
        });

        // Return minimal cleanup handler as fallback
        return async () => {
            logger.warn('Using fallback cleanup handler due to creation error');
            return {
                success: false,
                errors: ['Fallback cleanup handler used'],
                cleanupSteps: [],
                timing: { startTime: Date.now(), endTime: Date.now(), duration: 0 }
            };
        };
    }
}

/**
 * Comprehensive test configuration management class that provides centralized test settings,
 * environment management, server configuration, and test lifecycle operations for the Node.js tutorial application.
 */
class TestConfiguration {
    /**
     * Initializes TestConfiguration with comprehensive settings, validates configuration,
     * and sets up test utilities and logging for test execution.
     * 
     * @param {Object} configOptions - Configuration options for test setup
     * @param {string} configOptions.testType - Type of test (unit, integration, e2e)
     * @param {Object} configOptions.customConfig - Custom configuration overrides
     * @param {boolean} configOptions.enableLogging - Whether to enable test logging
     * @param {boolean} configOptions.enableCoverage - Whether to enable coverage collection
     * @param {Object} configOptions.timeoutOverrides - Custom timeout configuration
     */
    constructor(configOptions = {}) {
        try {
            logger.info('Initializing TestConfiguration instance', {
                testType: configOptions.testType || 'unit',
                hasCustomConfig: Boolean(configOptions.customConfig),
                enableLogging: configOptions.enableLogging !== false
            });

            // Initialize configuration object with default test settings
            this.config = createTestConfiguration(configOptions);

            // Load base configuration and apply test-specific overrides
            this.environment = this.config.environment;
            this.server = this.config.server;
            this.timeouts = this.config.timeouts;

            // Set up test environment with proper isolation and cleanup
            this.logger = createTestLogger(`TestConfiguration-${configOptions.testType || 'unit'}`);

            // Configure test server settings with dynamic port allocation
            this.serverConfiguration = this.config.server;

            // Initialize test logger with appropriate log levels for testing
            this.loggingConfiguration = this.config.logging;

            // Create test utilities instance for mock management and cleanup
            this.testUtilities = new TestUtilities({
                enableMocking: true,
                enableCleanup: true,
                trackCalls: true
            });

            // Validate complete test configuration for correctness and compatibility
            const validationResult = validateTestConfiguration(this.config);
            this.validationResult = validationResult;

            if (!validationResult.isValid) {
                this.logger.warn('TestConfiguration validation issues detected', {
                    errors: validationResult.errors,
                    warnings: validationResult.warnings
                });
            }

            // Set up cleanup handlers for proper test environment management
            this.cleanupHandler = createTestCleanupHandler(this.testUtilities);

            // Mark configuration as initialized
            this.initialized = true;
            this.initializationTime = new Date().toISOString();

            this.logger.info('TestConfiguration initialized successfully', {
                version: TEST_CONFIG_VERSION,
                testType: this.config.testType,
                validationScore: validationResult.validationScore || 0,
                initialized: this.initialized
            });

        } catch (error) {
            logger.error('Failed to initialize TestConfiguration', {
                error: error.message,
                stack: error.stack,
                configOptions: configOptions
            });

            // Initialize with minimal fallback configuration
            this.config = {
                version: TEST_CONFIG_VERSION,
                testType: 'unit',
                environment: { NODE_ENV: 'test' },
                server: { port: 0, host: 'localhost' },
                error: error.message,
                fallback: true
            };

            this.initialized = false;
            this.initializationError = error;
        }
    }

    /**
     * Returns complete test configuration object with all settings including environment,
     * server, logging, and timeout configurations.
     * 
     * @returns {Object} Complete test configuration object with all settings
     */
    getConfig() {
        try {
            // Return deep copy of internal configuration object
            const configCopy = JSON.parse(JSON.stringify(this.config));

            // Include all configuration sections
            configCopy.metadata = {
                ...configCopy.metadata,
                accessedAt: new Date().toISOString(),
                initialized: this.initialized,
                validationScore: this.validationResult?.validationScore || 0
            };

            // Apply current environment state and dynamic values
            if (this.environment) {
                configCopy.environment = { ...this.environment };
            }

            this.logger.debug('Configuration object accessed', {
                hasConfig: Boolean(configCopy),
                sections: Object.keys(configCopy),
                initialized: this.initialized
            });

            // Return comprehensive configuration object
            return configCopy;

        } catch (error) {
            this.logger.error('Failed to get configuration', {
                error: error.message
            });

            return {
                error: error.message,
                initialized: this.initialized,
                fallback: true
            };
        }
    }

    /**
     * Returns test environment configuration including NODE_ENV, port, host,
     * and environment-specific settings for test isolation.
     * 
     * @returns {Object} Test environment configuration object
     */
    getEnvironmentConfig() {
        try {
            // Return test environment configuration with current values
            const environmentConfig = {
                NODE_ENV: this.environment?.NODE_ENV || ENVIRONMENT.TEST,
                PORT: this.environment?.PORT || 0,
                HOST: this.environment?.HOST || ENVIRONMENT.DEFAULT_HOST,
                LOG_LEVEL: this.environment?.LOG_LEVEL || LOGGING.TEST_LOG_LEVEL,
                TEST_TYPE: this.config?.testType || 'unit',
                TEST_MODE: 'true',
                TEST_ISOLATION: 'true'
            };

            // Include NODE_ENV setting and environment detection flags
            environmentConfig.isDevelopment = environmentConfig.NODE_ENV === 'development';
            environmentConfig.isTest = environmentConfig.NODE_ENV === 'test';
            environmentConfig.isProduction = environmentConfig.NODE_ENV === 'production';

            // Add port and host configuration for test server binding
            environmentConfig.serverBinding = {
                port: environmentConfig.PORT,
                host: environmentConfig.HOST,
                bindToLocalhost: environmentConfig.HOST === 'localhost'
            };

            // Include environment-specific logging and security settings
            environmentConfig.logging = {
                level: environmentConfig.LOG_LEVEL,
                silent: this.config?.testType === 'unit',
                console: true
            };

            environmentConfig.security = {
                trustProxy: false,
                enableSecurity: false,
                testMode: true
            };

            this.logger.debug('Environment configuration retrieved', {
                nodeEnv: environmentConfig.NODE_ENV,
                port: environmentConfig.PORT,
                host: environmentConfig.HOST,
                testType: environmentConfig.TEST_TYPE
            });

            return environmentConfig;

        } catch (error) {
            this.logger.error('Failed to get environment configuration', {
                error: error.message
            });

            return {
                NODE_ENV: 'test',
                PORT: 0,
                HOST: 'localhost',
                error: error.message,
                fallback: true
            };
        }
    }

    /**
     * Returns test server configuration including Express.js settings, middleware configuration,
     * and test-specific optimizations.
     * 
     * @returns {Object} Test server configuration object with Express.js settings
     */
    getServerConfig() {
        try {
            // Return server configuration optimized for test execution
            const serverConfig = {
                port: this.server?.port || 0,
                host: this.server?.host || 'localhost',
                timeout: this.server?.timeout || TIMEOUTS.SERVER_STARTUP,
                keepAliveTimeout: this.server?.keepAliveTimeout || 5000,
                headersTimeout: this.server?.headersTimeout || 60000,
                requestTimeout: this.server?.requestTimeout || TIMEOUTS.REQUEST_PROCESSING
            };

            // Include Express.js application settings and middleware configuration
            serverConfig.express = {
                trustProxy: false,
                poweredByHeader: false,
                strictRouting: false,
                caseSensitive: false,
                jsonLimit: this.server?.express?.jsonLimit || '1mb',
                urlencodedLimit: this.server?.express?.urlencodedLimit || '1mb',
                viewCache: false,
                etag: false
            };

            // Add test-specific timeouts and performance settings
            serverConfig.performance = {
                maxConnections: 100,
                connectionTimeout: 30000,
                serverTimeout: serverConfig.timeout,
                gracefulShutdownTimeout: TIMEOUTS.SERVER_SHUTDOWN || 3000
            };

            // Include security settings appropriate for test environment
            serverConfig.security = {
                helmet: false,
                cors: false,
                rateLimit: false,
                csrf: false,
                trustProxy: false
            };

            this.logger.debug('Server configuration retrieved', {
                port: serverConfig.port,
                host: serverConfig.host,
                timeout: serverConfig.timeout,
                expressConfig: Object.keys(serverConfig.express).length
            });

            return serverConfig;

        } catch (error) {
            this.logger.error('Failed to get server configuration', {
                error: error.message
            });

            return {
                port: 0,
                host: 'localhost',
                timeout: 5000,
                error: error.message,
                fallback: true
            };
        }
    }

    /**
     * Creates and returns configured Express.js application instance ready for testing
     * with all test-specific configurations applied.
     * 
     * @param {Object} serverOptions - Additional server configuration options
     * @returns {Promise<Object>} Promise resolving to configured Express.js application for testing
     */
    async createTestServer(serverOptions = {}) {
        try {
            this.logger.debug('Creating test server with TestConfiguration', {
                hasServerOptions: Object.keys(serverOptions).length > 0,
                testType: this.config?.testType
            });

            // Create Express.js application using internal server configuration
            const testConfig = {
                ...this.config,
                ...serverOptions,
                server: {
                    ...this.serverConfiguration,
                    ...serverOptions.server
                }
            };

            // Apply test-specific middleware and route configurations
            const expressApp = await createTestServer(testConfig);

            // Configure error handling and response formatting for tests
            if (expressApp && expressApp.locals) {
                expressApp.locals.testConfiguration = {
                    version: TEST_CONFIG_VERSION,
                    testType: this.config.testType,
                    createdAt: new Date().toISOString(),
                    managedByTestConfiguration: true
                };
            }

            // Apply server options and custom configuration if provided
            if (Object.keys(serverOptions).length > 0) {
                this.logger.debug('Server options applied to test server', {
                    optionKeys: Object.keys(serverOptions)
                });
            }

            // Validate server configuration and readiness for testing
            const isValidServer = expressApp && typeof expressApp === 'function';

            if (!isValidServer) {
                throw new Error('Invalid Express.js application created by TestConfiguration');
            }

            this.logger.info('Test server created successfully by TestConfiguration', {
                testType: this.config.testType,
                hasRoutes: Boolean(expressApp._router),
                hasTestMetadata: Boolean(expressApp.locals?.testConfiguration)
            });

            // Return configured Express.js application ready for test execution
            return expressApp;

        } catch (error) {
            this.logger.error('Failed to create test server', {
                error: error.message,
                stack: error.stack,
                serverOptions: serverOptions
            });

            // Return minimal Express.js application as fallback
            const fallbackApp = createExpressApp({
                enableMiddleware: false,
                enableSecurity: false
            });

            fallbackApp.get('/hello', (req, res) => {
                res.status(HTTP_STATUS.OK).send('Hello world');
            });

            return fallbackApp;
        }
    }

    /**
     * Validates current test configuration for completeness, correctness, and compatibility
     * with testing requirements and framework versions.
     * 
     * @returns {Object} Validation result object with success status and detailed feedback
     */
    validateConfiguration() {
        try {
            this.logger.debug('Validating TestConfiguration instance');

            // Validate configuration object completeness and required properties
            const validation = validateTestConfiguration(this.config);

            // Check environment configuration for proper test isolation
            const environmentValid = this.environment?.NODE_ENV === 'test';
            if (!environmentValid) {
                validation.warnings.push('Environment NODE_ENV is not set to test');
                validation.validationScore -= 10;
            }

            // Verify server configuration compatibility with Express.js 5.1.0
            const serverValid = this.server?.host === 'localhost' || this.server?.host === '127.0.0.1';
            if (!serverValid) {
                validation.warnings.push('Server host is not set to localhost for test isolation');
                validation.validationScore -= 5;
            }

            // Validate timeout values and performance thresholds
            const timeoutsValid = this.timeouts?.default && this.timeouts.default > 0;
            if (!timeoutsValid) {
                validation.warnings.push('Invalid or missing timeout configuration');
                validation.validationScore -= 10;
            }

            // Check Node.js version compatibility for test runner features
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            if (majorVersion < 18) {
                validation.errors.push(`Node.js ${nodeVersion} not supported. Requires v18+`);
                validation.isValid = false;
                validation.validationScore -= 30;
            }

            // Compile validation results with errors, warnings, and recommendations
            validation.testConfigurationSpecific = {
                initialized: this.initialized,
                environmentValid: environmentValid,
                serverValid: serverValid,
                timeoutsValid: timeoutsValid,
                nodeVersionSupported: majorVersion >= 18
            };

            // Return comprehensive validation result object
            const finalValidation = {
                ...validation,
                validatedAt: new Date().toISOString(),
                validatedBy: 'TestConfiguration.validateConfiguration'
            };

            this.logger.info('Configuration validation completed', {
                isValid: finalValidation.isValid,
                validationScore: finalValidation.validationScore,
                errorCount: finalValidation.errors.length,
                warningCount: finalValidation.warnings.length
            });

            return finalValidation;

        } catch (error) {
            this.logger.error('Configuration validation failed', {
                error: error.message,
                stack: error.stack
            });

            return {
                isValid: false,
                errors: [`Validation failed: ${error.message}`],
                warnings: [],
                validationScore: 0,
                validatedAt: new Date().toISOString(),
                validationError: error.message
            };
        }
    }

    /**
     * Updates test configuration with new settings, validates changes, and reconfigures
     * test utilities and logging as needed.
     * 
     * @param {Object} configUpdates - Configuration updates to apply
     * @returns {boolean} True if configuration was successfully updated, false if validation failed
     */
    updateConfiguration(configUpdates) {
        try {
            this.logger.debug('Updating TestConfiguration', {
                updateKeys: Object.keys(configUpdates),
                currentVersion: this.config?.version
            });

            // Validate configuration updates for correctness and compatibility
            const updatedConfig = { ...this.config, ...configUpdates };
            const validationResult = validateTestConfiguration(updatedConfig);

            if (!validationResult.isValid) {
                this.logger.error('Configuration update validation failed', {
                    errors: validationResult.errors,
                    warnings: validationResult.warnings
                });
                return false;
            }

            // Apply configuration updates to internal configuration object
            this.config = updatedConfig;

            // Reconfigure test utilities and logging with updated settings
            if (configUpdates.environment) {
                this.environment = { ...this.environment, ...configUpdates.environment };
            }

            if (configUpdates.server) {
                this.server = { ...this.server, ...configUpdates.server };
                this.serverConfiguration = this.server;
            }

            if (configUpdates.timeouts) {
                this.timeouts = { ...this.timeouts, ...configUpdates.timeouts };
            }

            // Update environment configuration and server settings as needed
            if (configUpdates.logging) {
                this.loggingConfiguration = { ...this.loggingConfiguration, ...configUpdates.logging };
            }

            // Validate complete updated configuration for consistency
            this.validationResult = validationResult;

            // Log configuration update completion and any warnings
            this.logger.info('Configuration updated successfully', {
                updatedKeys: Object.keys(configUpdates),
                validationScore: validationResult.validationScore,
                warningCount: validationResult.warnings.length,
                updatedAt: new Date().toISOString()
            });

            // Return success status indicating whether update was applied
            return true;

        } catch (error) {
            this.logger.error('Failed to update configuration', {
                error: error.message,
                stack: error.stack,
                configUpdates: configUpdates
            });

            return false;
        }
    }

    /**
     * Sets up complete test environment including environment variables, test utilities,
     * logging, and cleanup procedures for test execution.
     * 
     * @returns {Promise<Object>} Promise resolving to test environment setup result with utilities and cleanup functions
     */
    async setupTestEnvironment() {
        try {
            this.logger.debug('Setting up test environment with TestConfiguration');

            // Set up test environment variables using testUtilities.mockProcessEnv
            const environmentSetup = await setupTestEnvironment({
                mockEnvironment: true,
                enableCleanup: true,
                environmentOverrides: this.environment
            });

            // Configure test logging with appropriate levels and formatting
            this.logger.info('Test environment setup initiated', {
                testType: this.config.testType,
                hasEnvironment: Boolean(environmentSetup.environment),
                hasUtilities: Boolean(environmentSetup.utilities)
            });

            // Initialize test utilities and helper functions
            if (this.testUtilities && environmentSetup.utilities) {
                // Merge utility configurations
                this.testUtilities = environmentSetup.utilities;
            }

            // Set up test isolation and cleanup procedures
            const isolationConfig = {
                mockProcessEnv: true,
                restoreOriginals: true,
                cleanupOnExit: true
            };

            // Validate test environment setup completion and readiness
            const setupValid = Boolean(environmentSetup.environment && environmentSetup.utilities);

            if (!setupValid) {
                this.logger.warn('Test environment setup completed with issues');
            }

            // Register cleanup handlers for proper test teardown
            const cleanupHandler = this.cleanupHandler || createTestCleanupHandler(this.testUtilities);

            // Return test environment setup result with utilities and status
            const setupResult = {
                ...environmentSetup,
                configuration: this.config,
                isolation: isolationConfig,
                cleanup: cleanupHandler,
                testConfiguration: {
                    version: TEST_CONFIG_VERSION,
                    testType: this.config.testType,
                    setupAt: new Date().toISOString(),
                    valid: setupValid
                }
            };

            this.logger.info('Test environment setup completed successfully', {
                testType: this.config.testType,
                setupValid: setupValid,
                hasCleanup: Boolean(cleanupHandler),
                utilities: Boolean(this.testUtilities)
            });

            return setupResult;

        } catch (error) {
            this.logger.error('Failed to setup test environment', {
                error: error.message,
                stack: error.stack
            });

            return {
                environment: null,
                utilities: null,
                cleanup: async () => {},
                error: error.message,
                testConfiguration: {
                    setupFailed: true,
                    error: error.message
                }
            };
        }
    }

    /**
     * Executes comprehensive test cleanup including environment restoration, mock resets,
     * server cleanup, and resource management for proper test isolation.
     * 
     * @returns {Promise<void>} Promise resolving when all cleanup operations are completed
     */
    async cleanup() {
        try {
            this.logger.debug('Executing TestConfiguration cleanup');

            const cleanupResults = {
                success: true,
                errors: [],
                steps: [],
                timing: {
                    startTime: Date.now(),
                    endTime: null,
                    duration: null
                }
            };

            // Execute test utilities cleanup to reset mocks and environment
            if (this.testUtilities && typeof this.testUtilities.cleanup === 'function') {
                try {
                    await this.testUtilities.cleanup();
                    cleanupResults.steps.push('testUtilities.cleanup');
                    this.logger.debug('Test utilities cleanup completed');
                } catch (utilitiesError) {
                    cleanupResults.errors.push(`Test utilities cleanup failed: ${utilitiesError.message}`);
                }
            }

            // Clean up test server instances and release allocated ports
            if (this.testServer) {
                try {
                    if (this.testServer.close && typeof this.testServer.close === 'function') {
                        await util.promisify(this.testServer.close.bind(this.testServer))();
                    }
                    this.testServer = null;
                    cleanupResults.steps.push('testServerCleanup');
                    this.logger.debug('Test server cleanup completed');
                } catch (serverError) {
                    cleanupResults.errors.push(`Test server cleanup failed: ${serverError.message}`);
                }
            }

            // Restore original environment variables and process state
            if (this.originalEnvironment) {
                try {
                    Object.keys(this.environment || {}).forEach(key => {
                        if (this.originalEnvironment[key] !== undefined) {
                            process.env[key] = this.originalEnvironment[key];
                        } else {
                            delete process.env[key];
                        }
                    });
                    cleanupResults.steps.push('environmentRestore');
                    this.logger.debug('Environment variables restored');
                } catch (envError) {
                    cleanupResults.errors.push(`Environment restore failed: ${envError.message}`);
                }
            }

            // Clear test-specific logging configuration and buffers
            if (this.logger && typeof this.logger.flush === 'function') {
                try {
                    this.logger.flush();
                    cleanupResults.steps.push('loggingFlush');
                } catch (logError) {
                    cleanupResults.errors.push(`Logging flush failed: ${logError.message}`);
                }
            }

            // Clean up temporary test files and resources
            if (this.tempFiles && Array.isArray(this.tempFiles)) {
                const fs = require('fs').promises;
                for (const tempFile of this.tempFiles) {
                    try {
                        await fs.unlink(tempFile);
                        cleanupResults.steps.push(`tempFile:${tempFile}`);
                    } catch (fileError) {
                        cleanupResults.errors.push(`Temp file cleanup failed for ${tempFile}: ${fileError.message}`);
                    }
                }
                this.tempFiles = [];
            }

            // Reset internal configuration state for next test execution
            this.testServer = null;
            this.originalEnvironment = null;

            // Record cleanup completion timing
            cleanupResults.timing.endTime = Date.now();
            cleanupResults.timing.duration = cleanupResults.timing.endTime - cleanupResults.timing.startTime;

            // Log cleanup completion and any errors encountered
            if (cleanupResults.errors.length > 0) {
                cleanupResults.success = false;
                this.logger.warn('TestConfiguration cleanup completed with errors', {
                    duration: cleanupResults.timing.duration,
                    stepsCompleted: cleanupResults.steps.length,
                    errors: cleanupResults.errors.length,
                    errorDetails: cleanupResults.errors
                });
            } else {
                this.logger.info('TestConfiguration cleanup completed successfully', {
                    duration: cleanupResults.timing.duration,
                    stepsCompleted: cleanupResults.steps.length
                });
            }

        } catch (error) {
            this.logger.error('TestConfiguration cleanup failed', {
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * Returns comprehensive information about current test configuration including environment,
     * server status, utilities state, and operational details.
     * 
     * @returns {Object} Test configuration information object with current state and settings
     */
    getTestInfo() {
        try {
            // Collect current configuration state and settings
            const configurationState = {
                version: this.config?.version || TEST_CONFIG_VERSION,
                testType: this.config?.testType || 'unknown',
                initialized: this.initialized,
                validationScore: this.validationResult?.validationScore || 0,
                hasErrors: Boolean(this.validationResult?.errors?.length),
                hasWarnings: Boolean(this.validationResult?.warnings?.length)
            };

            // Include test environment information and status
            const environmentInfo = {
                nodeEnv: this.environment?.NODE_ENV,
                port: this.environment?.PORT,
                host: this.environment?.HOST,
                logLevel: this.environment?.LOG_LEVEL,
                testMode: this.environment?.TEST_MODE === 'true',
                testIsolation: this.environment?.TEST_ISOLATION === 'true'
            };

            // Add server configuration and port allocation details
            const serverInfo = {
                port: this.server?.port,
                host: this.server?.host,
                timeout: this.server?.timeout,
                keepAliveTimeout: this.server?.keepAliveTimeout,
                hasExpressConfig: Boolean(this.server?.express),
                expressSettings: this.server?.express ? Object.keys(this.server.express).length : 0
            };

            // Include test utilities state and active mocks
            const utilitiesInfo = {
                hasTestUtilities: Boolean(this.testUtilities),
                utilitiesType: this.testUtilities?.constructor?.name,
                mockingEnabled: Boolean(this.testUtilities?.mockingEnabled),
                cleanupEnabled: Boolean(this.testUtilities?.cleanupEnabled)
            };

            // Add logging configuration and current log levels
            const loggingInfo = {
                level: this.loggingConfiguration?.level,
                console: Boolean(this.loggingConfiguration?.console),
                file: Boolean(this.loggingConfiguration?.file),
                silent: Boolean(this.loggingConfiguration?.silent),
                hasLogger: Boolean(this.logger)
            };

            // Include timeout settings and performance thresholds
            const timeoutInfo = {
                default: this.timeouts?.default,
                server: this.timeouts?.server,
                request: this.timeouts?.request,
                hasTimeouts: Boolean(this.timeouts)
            };

            // Runtime information
            const runtimeInfo = {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                processId: process.pid,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            };

            // Return comprehensive test information object
            const testInfo = {
                configuration: configurationState,
                environment: environmentInfo,
                server: serverInfo,
                utilities: utilitiesInfo,
                logging: loggingInfo,
                timeouts: timeoutInfo,
                runtime: runtimeInfo,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    testConfigVersion: TEST_CONFIG_VERSION,
                    initializationTime: this.initializationTime,
                    hasCleanupHandler: Boolean(this.cleanupHandler)
                }
            };

            this.logger.debug('Test information collected', {
                sections: Object.keys(testInfo),
                initialized: configurationState.initialized,
                validationScore: configurationState.validationScore
            });

            return testInfo;

        } catch (error) {
            this.logger.error('Failed to get test information', {
                error: error.message,
                stack: error.stack
            });

            return {
                error: error.message,
                initialized: this.initialized || false,
                fallback: true,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    errorOccurred: true
                }
            };
        }
    }
}

// Create default test configuration object with comprehensive settings for all test types and execution scenarios
const testConfig = createTestConfiguration({
    testType: 'unit',
    enableLogging: true,
    enableCoverage: true
});

// Log module initialization
logger.info('Test configuration module loaded successfully', {
    version: TEST_CONFIG_VERSION,
    configCreated: Boolean(testConfig),
    testLogger: Boolean(testLogger),
    nodeVersion: process.version,
    platform: process.platform
});

// Export all test configuration utilities and classes for comprehensive testing support
module.exports = {
    // Main test configuration object with comprehensive settings for all test types and execution scenarios
    testConfig,
    
    // Factory function for creating customized test configuration with options and overrides
    createTestConfiguration,
    
    // Test environment configuration retrieval function with type-specific settings
    getTestEnvironmentConfig,
    
    // Test server factory function for creating configured Express.js applications for testing
    createTestServer,
    
    // Test environment setup utility with isolation and cleanup capabilities
    setupTestEnvironment,
    
    // Test configuration validation utility for ensuring proper test setup
    validateTestConfiguration,
    
    // Test timeout configuration utility for operation-specific timeout management
    getTestTimeouts,
    
    // Test application configuration factory for Express.js testing settings
    createTestApplicationConfig,
    
    // Test database configuration utility (returns null for stateless tutorial application)
    getTestDatabaseConfig,
    
    // Test reporter configuration factory for Node.js built-in test runner
    createTestReporter,
    
    // Test coverage configuration utility with thresholds and reporting settings
    getTestCoverageConfig,
    
    // Test cleanup handler factory for comprehensive resource management
    createTestCleanupHandler,
    
    // Comprehensive test configuration management class with full lifecycle and utility methods
    TestConfiguration
};