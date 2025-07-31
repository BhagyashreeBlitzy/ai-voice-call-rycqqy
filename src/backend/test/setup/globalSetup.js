/**
 * Global Test Setup Module for Node.js Tutorial Application
 * 
 * This module initializes the complete test environment infrastructure for the Node.js tutorial
 * application test suite. Establishes global test configuration, initializes test servers,
 * sets up test utilities, configures logging, and prepares the test environment for comprehensive
 * testing of the /hello endpoint functionality.
 * 
 * Designed to work with Node.js built-in test runner and provides foundation setup for unit,
 * integration, and end-to-end testing scenarios while demonstrating professional testing patterns
 * and global test infrastructure management for educational purposes.
 * 
 * Features:
 * - Global test environment initialization
 * - Test server management and setup
 * - Test utilities configuration
 * - Global test context management
 * - Teardown coordination and cleanup
 * - Process exit handlers for graceful shutdown
 * - Performance measurement and monitoring
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Node.js built-in test runner for test hooks registration and global test setup coordination
const { test } = require('node:test'); // Node.js built-in

// Node.js process API for environment variable management and process-level test configuration
const process = require('node:process'); // Node.js built-in

// Node.js path utilities for test directory resolution and path management during setup
const path = require('node:path'); // Node.js built-in

// Node.js file system utilities for test directory creation and file management during setup
const fs = require('node:fs/promises'); // Node.js built-in

// Import complete test configuration object for global test environment setup and configuration management
const {
    testConfig,
    TestConfigManager
} = require('./testConfig.js');

// Import test server management class for global test server setup and HTTP endpoint testing infrastructure
const {
    TestServerManager,
    validateTestServerSetup
} = require('../helpers/serverHelpers.js');

// Import comprehensive test utilities management class for global mock tracking, test environment setup, and utility management
const {
    TestUtilities,
    createTestEnvironment,
    validateTestSetup,
    createTestLogger,
    generateTestId
} = require('../helpers/testHelpers.js');

// Import default export of configured Express.js application instance for test server initialization
const app = require('../../app.js').app;

// Import factory function for creating configured Express.js application instances for test server setup
const { createExpressApp } = require('../../app.js');

// Import application metadata constants for global test context and identification
const {
    APPLICATION,
    ENVIRONMENT,
    TIMEOUTS
} = require('../../utils/constants.js');

// Global variables for test environment state management
let globalTestContext = null;
let globalTestServer = null;
let globalTestUtilities = null;
let globalTestLogger = null;
let setupStartTime = null;
let isSetupComplete = false;
let teardownHooks = [];
let processExitHandlers = [];

/**
 * Initializes the complete global test environment including configuration validation,
 * environment variable setup, test directory creation, and global test context establishment
 * for comprehensive test infrastructure.
 * 
 * @param {Object} setupOptions - Configuration options for global test environment setup
 * @param {boolean} setupOptions.validateConfig - Whether to validate test configuration
 * @param {boolean} setupOptions.createDirectories - Whether to create test directories
 * @param {boolean} setupOptions.enableLogging - Whether to enable test logging
 * @param {Object} setupOptions.environmentOverrides - Environment variable overrides
 * @returns {Promise<Object>} Promise resolving to global test environment initialization results with setup status, configuration details, and infrastructure information
 */
async function initializeGlobalTestEnvironment(setupOptions = {}) {
    try {
        // Record global setup start time for performance measurement and timing analysis
        setupStartTime = Date.now();
        
        // Set NODE_ENV to 'test' for test environment identification and configuration
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = ENVIRONMENT.TEST;
        }

        // Create global test logger using createTestLogger with GlobalSetup context
        globalTestLogger = createTestLogger({
            context: 'GlobalSetup',
            level: testConfig.logging?.level || 'info',
            enableConsole: setupOptions.enableLogging !== false
        });

        globalTestLogger.info('Initializing global test environment', {
            nodeVersion: process.version,
            platform: process.platform,
            nodeEnv: process.env.NODE_ENV,
            setupOptions: setupOptions
        });

        // Initialize TestConfigManager and validate complete test configuration
        const configManager = new TestConfigManager(testConfig);
        await configManager.initialize();

        if (setupOptions.validateConfig !== false && !configManager.isValid()) {
            throw new Error('Test configuration validation failed');
        }

        // Create test environment isolation using createTestEnvironment function
        const testEnvironment = await createTestEnvironment({
            isolateEnvironment: true,
            cleanupOnExit: true,
            preserveOriginal: true,
            environmentOverrides: setupOptions.environmentOverrides || {}
        });

        // Validate test setup including Node.js version and dependency verification
        const setupValidation = await validateTestSetup({
            checkNodeVersion: true,
            checkDependencies: true,
            checkConfiguration: true,
            configManager: configManager
        });

        if (!setupValidation.isValid) {
            globalTestLogger.warn('Test setup validation warnings detected', {
                warnings: setupValidation.warnings,
                errors: setupValidation.errors
            });
        }

        // Create test directories and ensure proper test infrastructure exists
        if (setupOptions.createDirectories !== false) {
            const testDirectories = [
                path.join(process.cwd(), 'test', 'tmp'),
                path.join(process.cwd(), 'test', 'coverage'),
                path.join(process.cwd(), 'test', 'reports')
            ];

            for (const dir of testDirectories) {
                try {
                    await fs.mkdir(dir, { recursive: true });
                    globalTestLogger.debug(`Created test directory: ${dir}`);
                } catch (error) {
                    if (error.code !== 'EEXIST') {
                        globalTestLogger.warn(`Failed to create test directory: ${dir}`, {
                            error: error.message
                        });
                    }
                }
            }
        }

        // Generate global test ID using generateTestId for test correlation
        const globalTestId = generateTestId('global-setup');

        // Store global test context with configuration and environment details
        globalTestContext = {
            testId: globalTestId,
            configuration: configManager.getConfig(),
            environment: testEnvironment,
            validation: setupValidation,
            startTime: setupStartTime,
            setupOptions: setupOptions,
            directories: {
                tmp: path.join(process.cwd(), 'test', 'tmp'),
                coverage: path.join(process.cwd(), 'test', 'coverage'),
                reports: path.join(process.cwd(), 'test', 'reports')
            },
            metadata: {
                nodeVersion: process.version,
                platform: process.platform,
                applicationName: APPLICATION.NAME,
                applicationVersion: APPLICATION.VERSION
            }
        };

        // Log global test environment initialization completion with timing
        const initDuration = Date.now() - setupStartTime;
        globalTestLogger.info('Global test environment initialized successfully', {
            testId: globalTestId,
            initializationTime: initDuration,
            configurationValid: configManager.isValid(),
            environmentIsolated: Boolean(testEnvironment),
            directoriesCreated: setupOptions.createDirectories !== false
        });

        return {
            success: true,
            testId: globalTestId,
            configuration: configManager.getConfig(),
            environment: testEnvironment,
            validation: setupValidation,
            initializationTime: initDuration,
            context: globalTestContext
        };

    } catch (error) {
        if (globalTestLogger) {
            globalTestLogger.error('Failed to initialize global test environment', {
                error: error.message,
                stack: error.stack,
                setupOptions: setupOptions
            });
        }

        return {
            success: false,
            error: error.message,
            setupOptions: setupOptions,
            initializationTime: setupStartTime ? Date.now() - setupStartTime : 0
        };
    }
}

/**
 * Sets up global test server infrastructure including test server manager initialization,
 * application instance preparation, and test agent creation for HTTP endpoint testing
 * throughout the test suite.
 * 
 * @param {Object} serverSetupOptions - Configuration options for global test server setup
 * @param {number} serverSetupOptions.port - Port number for test server
 * @param {string} serverSetupOptions.host - Host address for test server
 * @param {boolean} serverSetupOptions.enableHealthCheck - Whether to enable health check endpoint
 * @param {Object} serverSetupOptions.serverConfig - Custom server configuration
 * @returns {Promise<Object>} Promise resolving to global test server setup results with server manager, URL, test agent, and configuration details
 */
async function setupGlobalTestServer(serverSetupOptions = {}) {
    try {
        globalTestLogger.info('Setting up global test server', {
            serverOptions: serverSetupOptions,
            hasGlobalContext: Boolean(globalTestContext)
        });

        // Validate test server setup configuration using validateTestServerSetup
        const serverValidation = await validateTestServerSetup({
            configuration: globalTestContext?.configuration || testConfig,
            applicationInstance: app,
            checkDependencies: true
        });

        if (!serverValidation.isValid) {
            globalTestLogger.warn('Test server validation warnings detected', {
                warnings: serverValidation.warnings,
                errors: serverValidation.errors
            });
        }

        // Create Express.js application instance using createExpressApp
        const testApp = createExpressApp({
            config: globalTestContext?.configuration || testConfig,
            enableMiddleware: true,
            enableRoutes: true,
            enableSecurity: true,
            enableErrorHandling: true
        });

        // Initialize TestServerManager with test configuration and application
        const serverConfig = {
            port: serverSetupOptions.port || testConfig.server?.port || ENVIRONMENT.DEFAULT_PORT,
            host: serverSetupOptions.host || testConfig.server?.host || ENVIRONMENT.DEFAULT_HOST,
            timeout: testConfig.server?.timeout || TIMEOUTS.SERVER_STARTUP,
            enableHealthCheck: serverSetupOptions.enableHealthCheck !== false,
            ...serverSetupOptions.serverConfig
        };

        globalTestServer = new TestServerManager(testApp, serverConfig);

        // Start global test server using TestServerManager.startTestServer method
        const serverStartResult = await globalTestServer.startTestServer({
            waitForHealthy: true,
            timeout: serverConfig.timeout
        });

        // Verify test server is running and accessible using server health checks
        const isServerRunning = globalTestServer.isServerRunning();
        if (!isServerRunning) {
            throw new Error('Global test server failed to start or is not accessible');
        }

        // Create test agent for HTTP endpoint testing using SuperTest integration
        const testAgent = globalTestServer.getTestAgent();
        const serverUrl = globalTestServer.getServerUrl();

        // Store global test server reference in globalTestServer variable (already done above)
        
        // Configure test server connection pooling and timeout settings
        if (testAgent && testAgent.agent) {
            testAgent.agent.timeout = serverConfig.timeout;
            testAgent.agent.keepAlive = true;
        }

        // Update global test context with server information
        if (globalTestContext) {
            globalTestContext.server = {
                url: serverUrl,
                port: serverConfig.port,
                host: serverConfig.host,
                isRunning: isServerRunning,
                manager: globalTestServer,
                testAgent: testAgent,
                startedAt: new Date().toISOString(),
                configuration: serverConfig
            };
        }

        // Log global test server setup completion with URL and configuration
        globalTestLogger.info('Global test server setup completed successfully', {
            serverUrl: serverUrl,
            port: serverConfig.port,
            host: serverConfig.host,
            isRunning: isServerRunning,
            hasTestAgent: Boolean(testAgent),
            startupTime: serverStartResult.startupTime || 0
        });

        return {
            success: true,
            serverManager: globalTestServer,
            serverUrl: serverUrl,
            testAgent: testAgent,
            configuration: serverConfig,
            validation: serverValidation,
            isRunning: isServerRunning,
            startupTime: serverStartResult.startupTime || 0
        };

    } catch (error) {
        globalTestLogger.error('Failed to setup global test server', {
            error: error.message,
            stack: error.stack,
            serverSetupOptions: serverSetupOptions
        });

        return {
            success: false,
            error: error.message,
            serverSetupOptions: serverSetupOptions,
            serverManager: null,
            testAgent: null
        };
    }
}

/**
 * Initializes global test utilities including mock management, performance measurement,
 * and shared testing infrastructure for comprehensive test support across all test suites.
 * 
 * @param {Object} utilitiesConfig - Configuration options for test utilities initialization
 * @param {boolean} utilitiesConfig.enableMocking - Whether to enable mock functionality
 * @param {boolean} utilitiesConfig.enablePerformance - Whether to enable performance measurement
 * @param {boolean} utilitiesConfig.enableFixtures - Whether to enable test fixture management
 * @param {Object} utilitiesConfig.mockConfig - Custom mock configuration
 * @returns {Promise<Object>} Promise resolving to global test utilities initialization results with utility references and configuration status
 */
async function initializeGlobalTestUtilities(utilitiesConfig = {}) {
    try {
        globalTestLogger.info('Initializing global test utilities', {
            utilitiesConfig: utilitiesConfig,
            hasGlobalContext: Boolean(globalTestContext)
        });

        // Create TestUtilities instance with global test configuration
        const utilitiesOptions = {
            logger: globalTestLogger,
            configuration: globalTestContext?.configuration || testConfig,
            enableMocking: utilitiesConfig.enableMocking !== false,
            enablePerformance: utilitiesConfig.enablePerformance !== false,
            enableFixtures: utilitiesConfig.enableFixtures !== false,
            mockConfig: utilitiesConfig.mockConfig || {}
        };

        globalTestUtilities = new TestUtilities(utilitiesOptions);

        // Set up global mock management and tracking infrastructure
        if (utilitiesConfig.enableMocking !== false) {
            await globalTestUtilities.initializeMockSystem({
                trackGlobalMocks: true,
                autoCleanup: true,
                preserveConsole: true
            });
            globalTestLogger.debug('Global mock management system initialized');
        }

        // Initialize performance measurement utilities and benchmarking tools
        if (utilitiesConfig.enablePerformance !== false) {
            await globalTestUtilities.initializePerformanceTracking({
                enableMemoryTracking: true,
                enableTimingTracking: true,
                sampleRate: 1.0
            });
            globalTestLogger.debug('Performance measurement utilities initialized');
        }

        // Configure global test environment variable management
        await globalTestUtilities.setupEnvironmentManagement({
            preserveOriginal: true,
            isolateChanges: true,
            autoRestore: true
        });

        // Set up shared test data and fixture management
        if (utilitiesConfig.enableFixtures !== false) {
            await globalTestUtilities.initializeFixtureSystem({
                fixtureDirectory: path.join(process.cwd(), 'test', 'fixtures'),
                enableCaching: true,
                autoCleanup: true
            });
            globalTestLogger.debug('Test fixture management system initialized');
        }

        // Initialize async operation utilities and condition waiting
        await globalTestUtilities.initializeAsyncUtilities({
            defaultTimeout: testConfig.execution?.timeout || TIMEOUTS.REQUEST_PROCESSING,
            retryAttempts: testConfig.execution?.retryAttempts || 3,
            retryDelay: testConfig.execution?.retryDelay || 100
        });

        // Store global test utilities reference in globalTestUtilities variable (already done above)

        // Configure cleanup registration for automatic resource management
        globalTestUtilities.registerCleanupHandler(async () => {
            globalTestLogger.debug('Executing global test utilities cleanup');
            await globalTestUtilities.cleanup();
        });

        // Update global test context with utilities information
        if (globalTestContext) {
            globalTestContext.utilities = {
                instance: globalTestUtilities,
                mockingEnabled: utilitiesConfig.enableMocking !== false,
                performanceEnabled: utilitiesConfig.enablePerformance !== false,
                fixturesEnabled: utilitiesConfig.enableFixtures !== false,
                initializedAt: new Date().toISOString(),
                configuration: utilitiesConfig
            };
        }

        // Log global test utilities initialization completion with feature summary
        globalTestLogger.info('Global test utilities initialized successfully', {
            mockingEnabled: utilitiesConfig.enableMocking !== false,
            performanceEnabled: utilitiesConfig.enablePerformance !== false,
            fixturesEnabled: utilitiesConfig.enableFixtures !== false,
            asyncUtilitiesEnabled: true,
            environmentManagementEnabled: true
        });

        return {
            success: true,
            utilities: globalTestUtilities,
            configuration: utilitiesConfig,
            features: {
                mocking: utilitiesConfig.enableMocking !== false,
                performance: utilitiesConfig.enablePerformance !== false,
                fixtures: utilitiesConfig.enableFixtures !== false,
                asyncUtilities: true,
                environmentManagement: true
            }
        };

    } catch (error) {
        globalTestLogger.error('Failed to initialize global test utilities', {
            error: error.message,
            stack: error.stack,
            utilitiesConfig: utilitiesConfig
        });

        return {
            success: false,
            error: error.message,
            utilitiesConfig: utilitiesConfig,
            utilities: null
        };
    }
}

/**
 * Registers a teardown hook function for automatic cleanup execution during test suite
 * teardown, providing centralized cleanup coordination and resource management.
 * 
 * @param {Function} teardownFn - Teardown function to register for cleanup execution
 * @param {Object} hookOptions - Configuration options for teardown hook
 * @param {number} hookOptions.priority - Execution priority (lower numbers execute first)
 * @param {string} hookOptions.name - Hook name for identification and logging
 * @param {boolean} hookOptions.essential - Whether hook failure should halt teardown
 * @returns {Object} Hook registration result with hook ID and cleanup coordination details
 */
function registerTeardownHook(teardownFn, hookOptions = {}) {
    try {
        // Validate teardown function is provided and is callable
        if (typeof teardownFn !== 'function') {
            throw new Error('Teardown function must be a callable function');
        }

        // Generate unique hook ID for teardown function tracking
        const hookId = generateTestId('teardown-hook');

        // Configure hook execution order and priority if specified
        const priority = typeof hookOptions.priority === 'number' ? hookOptions.priority : 100;
        const name = hookOptions.name || `hook-${hookId}`;
        const essential = hookOptions.essential === true;

        // Add teardown function to teardownHooks array with metadata
        const hookRegistration = {
            id: hookId,
            name: name,
            fn: teardownFn,
            priority: priority,
            essential: essential,
            registeredAt: new Date().toISOString(),
            options: hookOptions
        };

        teardownHooks.push(hookRegistration);

        // Set up error handling for teardown hook execution
        const originalFn = teardownFn;
        hookRegistration.safeFn = async (...args) => {
            try {
                const result = await originalFn(...args);
                globalTestLogger.debug(`Teardown hook executed successfully: ${name}`, {
                    hookId: hookId,
                    priority: priority
                });
                return result;
            } catch (error) {
                globalTestLogger.error(`Teardown hook failed: ${name}`, {
                    hookId: hookId,
                    error: error.message,
                    essential: essential
                });

                if (essential) {
                    throw error;
                }

                return { error: error.message, failed: true };
            }
        };

        // Log teardown hook registration with hook ID and priority
        globalTestLogger.debug('Teardown hook registered', {
            hookId: hookId,
            name: name,
            priority: priority,
            essential: essential,
            totalHooks: teardownHooks.length
        });

        // Return hook registration confirmation with tracking details
        return {
            success: true,
            hookId: hookId,
            name: name,
            priority: priority,
            essential: essential,
            totalHooks: teardownHooks.length
        };

    } catch (error) {
        if (globalTestLogger) {
            globalTestLogger.error('Failed to register teardown hook', {
                error: error.message,
                hookOptions: hookOptions
            });
        }

        return {
            success: false,
            error: error.message,
            hookOptions: hookOptions
        };
    }
}

/**
 * Executes all registered teardown hooks in proper order with error handling and logging
 * for comprehensive test cleanup coordination.
 * 
 * @param {Object} executionOptions - Configuration options for teardown execution
 * @param {boolean} executionOptions.continueOnError - Whether to continue execution after hook failures
 * @param {number} executionOptions.timeout - Maximum time to wait for all hooks to complete
 * @param {boolean} executionOptions.parallel - Whether to execute hooks in parallel
 * @returns {Promise<Object>} Promise resolving to teardown execution results with success status and cleanup details
 */
async function executeTeardownHooks(executionOptions = {}) {
    try {
        globalTestLogger.info('Executing teardown hooks', {
            totalHooks: teardownHooks.length,
            executionOptions: executionOptions
        });

        // Sort teardown hooks by priority and execution order
        const sortedHooks = [...teardownHooks].sort((a, b) => a.priority - b.priority);

        const executionResults = [];
        const startTime = Date.now();

        // Execute each teardown hook with individual error handling
        for (const hook of sortedHooks) {
            const hookStartTime = Date.now();

            try {
                // Log teardown hook execution progress and any errors
                globalTestLogger.debug(`Executing teardown hook: ${hook.name}`, {
                    hookId: hook.id,
                    priority: hook.priority,
                    essential: hook.essential
                });

                const result = await hook.safeFn();
                const executionTime = Date.now() - hookStartTime;

                // Collect execution results and timing for each hook
                executionResults.push({
                    hookId: hook.id,
                    name: hook.name,
                    success: !result?.failed,
                    executionTime: executionTime,
                    result: result,
                    error: result?.error || null
                });

                globalTestLogger.debug(`Teardown hook completed: ${hook.name}`, {
                    hookId: hook.id,
                    executionTime: executionTime,
                    success: !result?.failed
                });

            } catch (error) {
                const executionTime = Date.now() - hookStartTime;

                executionResults.push({
                    hookId: hook.id,
                    name: hook.name,
                    success: false,
                    executionTime: executionTime,
                    error: error.message,
                    essential: hook.essential
                });

                globalTestLogger.error(`Teardown hook failed: ${hook.name}`, {
                    hookId: hook.id,
                    error: error.message,
                    essential: hook.essential
                });

                // Continue execution of remaining hooks even if some fail
                if (hook.essential && !executionOptions.continueOnError) {
                    globalTestLogger.error('Essential teardown hook failed, stopping execution', {
                        hookId: hook.id,
                        name: hook.name
                    });
                    break;
                }
            }
        }

        const totalExecutionTime = Date.now() - startTime;
        const successfulHooks = executionResults.filter(result => result.success).length;
        const failedHooks = executionResults.filter(result => !result.success).length;

        // Clear teardownHooks array after successful execution
        teardownHooks.length = 0;

        globalTestLogger.info('Teardown hooks execution completed', {
            totalHooks: executionResults.length,
            successfulHooks: successfulHooks,
            failedHooks: failedHooks,
            totalExecutionTime: totalExecutionTime
        });

        // Return comprehensive teardown execution results
        return {
            success: failedHooks === 0,
            totalHooks: executionResults.length,
            successfulHooks: successfulHooks,
            failedHooks: failedHooks,
            executionTime: totalExecutionTime,
            results: executionResults,
            executionOptions: executionOptions
        };

    } catch (error) {
        globalTestLogger.error('Failed to execute teardown hooks', {
            error: error.message,
            stack: error.stack,
            executionOptions: executionOptions
        });

        return {
            success: false,
            error: error.message,
            totalHooks: teardownHooks.length,
            executionTime: Date.now() - (setupStartTime || Date.now()),
            executionOptions: executionOptions
        };
    }
}

/**
 * Configures global test hooks including before/after hooks, cleanup registration,
 * and teardown coordination to ensure proper test lifecycle management and resource cleanup.
 * 
 * @param {Object} hooksConfig - Configuration options for global test hooks
 * @param {boolean} hooksConfig.enableBeforeHook - Whether to register global before hook
 * @param {boolean} hooksConfig.enableAfterHook - Whether to register global after hook
 * @param {boolean} hooksConfig.enableProcessHandlers - Whether to set up process exit handlers
 * @param {number} hooksConfig.cleanupTimeout - Timeout for cleanup operations
 * @returns {Object} Global test hooks configuration results with hook registration status and cleanup coordination details
 */
function configureGlobalTestHooks(hooksConfig = {}) {
    try {
        globalTestLogger.info('Configuring global test hooks', {
            hooksConfig: hooksConfig
        });

        const hookRegistrations = [];

        // Register global before hook for test suite initialization using Node.js test runner
        if (hooksConfig.enableBeforeHook !== false) {
            // Note: Node.js test runner doesn't have global before/after hooks like Jest
            // We'll use process-level events instead for global setup coordination
            const beforeHookResult = {
                type: 'before',
                registered: true,
                method: 'process-based',
                timestamp: new Date().toISOString()
            };
            hookRegistrations.push(beforeHookResult);
            globalTestLogger.debug('Global before hook configuration completed');
        }

        // Register global after hook for test suite cleanup and teardown
        if (hooksConfig.enableAfterHook !== false) {
            // Register cleanup on process exit for global teardown
            const afterHookResult = {
                type: 'after',
                registered: true,
                method: 'process-exit',
                timestamp: new Date().toISOString()
            };
            hookRegistrations.push(afterHookResult);
            globalTestLogger.debug('Global after hook configuration completed');
        }

        // Set up process exit handlers for emergency cleanup procedures
        if (hooksConfig.enableProcessHandlers !== false) {
            setupProcessExitHandlers({
                cleanupTimeout: hooksConfig.cleanupTimeout || TIMEOUTS.SERVER_SHUTDOWN,
                enableGracefulShutdown: true,
                logExitEvents: true
            });
            globalTestLogger.debug('Process exit handlers configured');
        }

        // Register teardown hooks for global test infrastructure cleanup
        registerTeardownHook(async () => {
            globalTestLogger.debug('Executing global infrastructure cleanup');
            await cleanupGlobalSetup({ timeout: hooksConfig.cleanupTimeout });
        }, {
            name: 'global-infrastructure-cleanup',
            priority: 1000,
            essential: false
        });

        // Set up uncaught exception handlers for error cleanup
        if (!process.listenerCount('uncaughtException')) {
            process.on('uncaughtException', async (error) => {
                globalTestLogger.error('Uncaught exception during test execution', {
                    error: error.message,
                    stack: error.stack
                });

                // Perform emergency cleanup
                try {
                    await executeTeardownHooks({ continueOnError: true, timeout: 5000 });
                } catch (cleanupError) {
                    console.error('Failed to cleanup after uncaught exception:', cleanupError);
                }

                process.exit(1);
            });
        }

        // Configure cleanup timeout and error handling for hooks
        const cleanupTimeout = hooksConfig.cleanupTimeout || TIMEOUTS.SERVER_SHUTDOWN;

        // Log global test hooks configuration completion with hook summary
        globalTestLogger.info('Global test hooks configured successfully', {
            beforeHook: hooksConfig.enableBeforeHook !== false,
            afterHook: hooksConfig.enableAfterHook !== false,
            processHandlers: hooksConfig.enableProcessHandlers !== false,
            cleanupTimeout: cleanupTimeout,
            registeredHooks: hookRegistrations.length
        });

        return {
            success: true,
            hookRegistrations: hookRegistrations,
            cleanupTimeout: cleanupTimeout,
            processHandlersEnabled: hooksConfig.enableProcessHandlers !== false,
            configuration: hooksConfig
        };

    } catch (error) {
        globalTestLogger.error('Failed to configure global test hooks', {
            error: error.message,
            stack: error.stack,
            hooksConfig: hooksConfig
        });

        return {
            success: false,
            error: error.message,
            hooksConfig: hooksConfig
        };
    }
}

/**
 * Sets up process exit handlers for graceful cleanup of global test resources
 * during unexpected shutdowns or signals.
 * 
 * @param {Object} handlerOptions - Configuration options for process exit handlers
 * @param {number} handlerOptions.cleanupTimeout - Maximum time to wait for cleanup
 * @param {boolean} handlerOptions.enableGracefulShutdown - Whether to enable graceful shutdown
 * @param {boolean} handlerOptions.logExitEvents - Whether to log exit events
 * @returns {void} No return value - configures process-level event handlers
 */
function setupProcessExitHandlers(handlerOptions = {}) {
    try {
        const cleanupTimeout = handlerOptions.cleanupTimeout || TIMEOUTS.SERVER_SHUTDOWN;
        const enableGracefulShutdown = handlerOptions.enableGracefulShutdown !== false;
        const logExitEvents = handlerOptions.logExitEvents !== false;

        // Register SIGTERM handler for graceful shutdown coordination
        if (!process.listenerCount('SIGTERM')) {
            const sigtermHandler = async () => {
                if (logExitEvents) {
                    globalTestLogger?.info('Received SIGTERM, initiating graceful shutdown');
                }

                if (enableGracefulShutdown) {
                    try {
                        await executeTeardownHooks({ 
                            continueOnError: true, 
                            timeout: cleanupTimeout 
                        });
                    } catch (error) {
                        console.error('Error during SIGTERM cleanup:', error);
                    }
                }

                process.exit(0);
            };

            process.on('SIGTERM', sigtermHandler);
            processExitHandlers.push({ signal: 'SIGTERM', handler: sigtermHandler });
        }

        // Register SIGINT handler for Ctrl+C interrupt handling
        if (!process.listenerCount('SIGINT')) {
            const sigintHandler = async () => {
                if (logExitEvents) {
                    globalTestLogger?.info('Received SIGINT (Ctrl+C), initiating cleanup');
                }

                if (enableGracefulShutdown) {
                    try {
                        await executeTeardownHooks({ 
                            continueOnError: true, 
                            timeout: cleanupTimeout 
                        });
                    } catch (error) {
                        console.error('Error during SIGINT cleanup:', error);
                    }
                }

                process.exit(0);
            };

            process.on('SIGINT', sigintHandler);
            processExitHandlers.push({ signal: 'SIGINT', handler: sigintHandler });
        }

        // Register process 'exit' event handler for final cleanup
        if (!process.listenerCount('exit')) {
            const exitHandler = (code) => {
                if (logExitEvents) {
                    console.log(`Process exiting with code ${code}`);
                }

                // Synchronous cleanup only in exit handler
                if (globalTestServer && globalTestServer.isServerRunning()) {
                    try {
                        globalTestServer.stopTestServer({ force: true, timeout: 1000 });
                    } catch (error) {
                        console.error('Error stopping test server on exit:', error);
                    }
                }
            };

            process.on('exit', exitHandler);
            processExitHandlers.push({ signal: 'exit', handler: exitHandler });
        }

        // Register uncaughtException handler for error cleanup
        if (!process.listenerCount('uncaughtException')) {
            const uncaughtHandler = async (error) => {
                if (logExitEvents) {
                    console.error('Uncaught Exception:', error);
                }

                try {
                    if (enableGracefulShutdown) {
                        await executeTeardownHooks({ 
                            continueOnError: true, 
                            timeout: Math.min(cleanupTimeout, 3000) 
                        });
                    }
                } catch (cleanupError) {
                    console.error('Error during uncaught exception cleanup:', cleanupError);
                }

                process.exit(1);
            };

            process.on('uncaughtException', uncaughtHandler);
            processExitHandlers.push({ signal: 'uncaughtException', handler: uncaughtHandler });
        }

        // Register unhandledRejection handler for promise error cleanup
        if (!process.listenerCount('unhandledRejection')) {
            const rejectionHandler = async (reason, promise) => {
                if (logExitEvents) {
                    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
                }

                try {
                    if (enableGracefulShutdown) {
                        await executeTeardownHooks({ 
                            continueOnError: true, 
                            timeout: Math.min(cleanupTimeout, 3000) 
                        });
                    }
                } catch (cleanupError) {
                    console.error('Error during unhandled rejection cleanup:', cleanupError);
                }

                process.exit(1);
            };

            process.on('unhandledRejection', rejectionHandler);
            processExitHandlers.push({ signal: 'unhandledRejection', handler: rejectionHandler });
        }

        // Store handler references in processExitHandlers array (already done above)

        // Log process exit handler setup completion
        if (globalTestLogger) {
            globalTestLogger.debug('Process exit handlers configured successfully', {
                handlerCount: processExitHandlers.length,
                cleanupTimeout: cleanupTimeout,
                gracefulShutdown: enableGracefulShutdown,
                logExitEvents: logExitEvents
            });
        }

    } catch (error) {
        if (globalTestLogger) {
            globalTestLogger.error('Failed to setup process exit handlers', {
                error: error.message,
                stack: error.stack,
                handlerOptions: handlerOptions
            });
        }
    }
}

/**
 * Validates that global test setup completed successfully by verifying all components
 * are initialized, configured, and ready for test execution with comprehensive validation checks.
 * 
 * @returns {Object} Global setup validation results with success status, component verification, and readiness assessment
 */
function validateGlobalSetupCompletion() {
    try {
        globalTestLogger.debug('Validating global setup completion');

        const validationResult = {
            isValid: true,
            components: {},
            errors: [],
            warnings: [],
            validationScore: 100,
            validatedAt: new Date().toISOString()
        };

        // Verify TestConfigManager is initialized and configuration is valid
        if (!globalTestContext || !globalTestContext.configuration) {
            validationResult.errors.push('Global test configuration is not initialized');
            validationResult.isValid = false;
            validationResult.validationScore -= 25;
        } else {
            validationResult.components.configuration = {
                valid: true,
                hasConfig: Boolean(globalTestContext.configuration),
                configKeys: Object.keys(globalTestContext.configuration).length
            };
        }

        // Check global test server is running and accepting connections
        if (!globalTestServer || !globalTestServer.isServerRunning()) {
            validationResult.errors.push('Global test server is not running or accessible');
            validationResult.isValid = false;
            validationResult.validationScore -= 30;
        } else {
            validationResult.components.server = {
                valid: true,
                isRunning: globalTestServer.isServerRunning(),
                url: globalTestServer.getServerUrl(),
                hasTestAgent: Boolean(globalTestServer.getTestAgent())
            };
        }

        // Validate global test utilities are initialized and functional
        if (!globalTestUtilities) {
            validationResult.warnings.push('Global test utilities are not initialized');
            validationResult.validationScore -= 15;
        } else {
            validationResult.components.utilities = {
                valid: true,
                instance: Boolean(globalTestUtilities),
                hasCleanupHandler: Boolean(globalTestUtilities.cleanup)
            };
        }

        // Verify global test logger is working and properly configured
        if (!globalTestLogger) {
            validationResult.errors.push('Global test logger is not initialized');
            validationResult.isValid = false;
            validationResult.validationScore -= 10;
        } else {
            validationResult.components.logger = {
                valid: true,
                instance: Boolean(globalTestLogger),
                hasInfoMethod: typeof globalTestLogger.info === 'function'
            };
        }

        // Check test environment isolation is active and properly configured
        if (!globalTestContext || !globalTestContext.environment) {
            validationResult.warnings.push('Test environment isolation is not configured');
            validationResult.validationScore -= 10;
        } else {
            validationResult.components.environment = {
                valid: true,
                isolated: Boolean(globalTestContext.environment),
                nodeEnv: process.env.NODE_ENV
            };
        }

        // Validate teardown hooks are registered and functional
        validationResult.components.teardownHooks = {
            valid: true,
            totalHooks: teardownHooks.length,
            hasHooks: teardownHooks.length > 0
        };

        // Verify test directories exist and have proper permissions
        if (globalTestContext && globalTestContext.directories) {
            validationResult.components.directories = {
                valid: true,
                configured: Boolean(globalTestContext.directories),
                paths: Object.keys(globalTestContext.directories)
            };
        }

        // Calculate total setup time and compare against performance thresholds
        const totalSetupTime = setupStartTime ? Date.now() - setupStartTime : 0;
        const setupTimeThreshold = TIMEOUTS.SERVER_STARTUP * 2; // Allow 2x server startup time

        if (totalSetupTime > setupTimeThreshold) {
            validationResult.warnings.push(`Setup time ${totalSetupTime}ms exceeds threshold ${setupTimeThreshold}ms`);
            validationResult.validationScore -= 5;
        }

        validationResult.performance = {
            setupTime: totalSetupTime,
            threshold: setupTimeThreshold,
            withinThreshold: totalSetupTime <= setupTimeThreshold
        };

        // Compile validation summary
        validationResult.summary = {
            isValid: validationResult.isValid,
            totalComponents: Object.keys(validationResult.components).length,
            validComponents: Object.values(validationResult.components).filter(c => c.valid).length,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            validationScore: Math.max(0, validationResult.validationScore),
            setupTime: totalSetupTime
        };

        // Set global setup completion flag
        isSetupComplete = validationResult.isValid;

        globalTestLogger.info('Global setup validation completed', {
            isValid: validationResult.isValid,
            validationScore: validationResult.validationScore,
            componentCount: Object.keys(validationResult.components).length,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            setupTime: totalSetupTime
        });

        // Return comprehensive validation results with readiness status
        return validationResult;

    } catch (error) {
        globalTestLogger.error('Error during global setup validation', {
            error: error.message,
            stack: error.stack
        });

        return {
            isValid: false,
            error: error.message,
            components: {},
            errors: [`Validation failed: ${error.message}`],
            warnings: [],
            validationScore: 0,
            validatedAt: new Date().toISOString()
        };
    }
}

/**
 * Returns the global test context object containing configuration, server information,
 * utilities, and shared state for use across all test suites and scenarios.
 * 
 * @returns {Object} Global test context object with configuration, server details, utilities, and shared test infrastructure
 */
function getGlobalTestContext() {
    try {
        // Verify global setup is complete using isSetupComplete flag
        if (!isSetupComplete) {
            globalTestLogger?.warn('Global test context accessed before setup completion');
        }

        // Collect global test configuration from TestConfigManager
        const configuration = globalTestContext?.configuration || null;

        // Include global test server information with URL and test agent
        const server = globalTestContext?.server || null;

        // Add global test utilities reference and available methods
        const utilities = globalTestContext?.utilities || null;

        // Include test environment details and isolation information
        const environment = globalTestContext?.environment || null;

        // Add setup timing and performance metrics
        const setupTiming = {
            startTime: setupStartTime,
            isComplete: isSetupComplete,
            setupDuration: setupStartTime ? Date.now() - setupStartTime : 0
        };

        // Return comprehensive global test context object
        return {
            testId: globalTestContext?.testId || null,
            configuration: configuration,
            server: server,
            utilities: utilities,
            environment: environment,
            timing: setupTiming,
            metadata: globalTestContext?.metadata || {},
            directories: globalTestContext?.directories || {},
            isSetupComplete: isSetupComplete,
            accessedAt: new Date().toISOString()
        };

    } catch (error) {
        if (globalTestLogger) {
            globalTestLogger.error('Error accessing global test context', {
                error: error.message,
                stack: error.stack
            });
        }

        return {
            error: error.message,
            isSetupComplete: false,
            accessedAt: new Date().toISOString()
        };
    }
}

/**
 * Logs comprehensive summary of global test setup including configuration,
 * initialization results, performance metrics, and component status for debugging and monitoring.
 * 
 * @param {Object} setupResults - Setup results from global initialization
 * @param {number} totalDuration - Total duration of setup process in milliseconds
 * @returns {void} No return value - performs logging of global setup summary
 */
function logGlobalSetupSummary(setupResults = {}, totalDuration = 0) {
    try {
        if (!globalTestLogger) {
            console.log('Global setup summary (no logger available):', setupResults);
            return;
        }

        // Calculate total setup duration and component initialization timing
        const actualDuration = totalDuration || (setupStartTime ? Date.now() - setupStartTime : 0);

        // Format global test configuration summary with key settings
        const configurationSummary = {
            hasConfiguration: Boolean(globalTestContext?.configuration),
            nodeEnv: process.env.NODE_ENV,
            applicationName: APPLICATION.NAME,
            applicationVersion: APPLICATION.VERSION
        };

        // Include global test server status with URL and connection details
        const serverSummary = {
            isRunning: globalTestServer?.isServerRunning() || false,
            url: globalTestServer?.getServerUrl() || 'not available',
            hasTestAgent: Boolean(globalTestServer?.getTestAgent()),
            port: globalTestContext?.server?.port || 'unknown'
        };

        // Add global test utilities summary with available features
        const utilitiesSummary = {
            initialized: Boolean(globalTestUtilities),
            mockingEnabled: Boolean(globalTestContext?.utilities?.mockingEnabled),
            performanceEnabled: Boolean(globalTestContext?.utilities?.performanceEnabled),
            fixturesEnabled: Boolean(globalTestContext?.utilities?.fixturesEnabled)
        };

        // Log environment configuration and isolation status
        const environmentSummary = {
            isolated: Boolean(globalTestContext?.environment),
            nodeVersion: process.version,
            platform: process.platform,
            processId: process.pid
        };

        // Include performance metrics and setup timing analysis
        const performanceSummary = {
            totalSetupTime: actualDuration,
            setupStartTime: setupStartTime ? new Date(setupStartTime).toISOString() : 'unknown',
            isSetupComplete: isSetupComplete,
            teardownHooksCount: teardownHooks.length,
            processHandlersCount: processExitHandlers.length
        };

        // Log any warnings or issues encountered during setup
        const issues = [];
        if (!globalTestContext) issues.push('Global test context not initialized');
        if (!globalTestServer?.isServerRunning()) issues.push('Test server not running');
        if (!globalTestUtilities) issues.push('Test utilities not initialized');

        // Provide setup completion confirmation with component status
        globalTestLogger.info('=== GLOBAL TEST SETUP SUMMARY ===', {
            configuration: configurationSummary,
            server: serverSummary,
            utilities: utilitiesSummary,
            environment: environmentSummary,
            performance: performanceSummary,
            setupResults: setupResults,
            issues: issues,
            setupComplete: isSetupComplete
        });

        if (issues.length > 0) {
            globalTestLogger.warn('Setup issues detected', {
                issueCount: issues.length,
                issues: issues
            });
        } else {
            globalTestLogger.info('Global test setup completed successfully - ready for testing');
        }

    } catch (error) {
        console.error('Error logging global setup summary:', error);
        console.log('Setup results:', setupResults);
        console.log('Total duration:', totalDuration);
    }
}

/**
 * Performs cleanup of global setup resources including server shutdown, utility cleanup,
 * and context reset for use by teardown procedures and emergency cleanup.
 * 
 * @param {Object} cleanupOptions - Configuration options for global setup cleanup
 * @param {number} cleanupOptions.timeout - Maximum time to wait for cleanup completion
 * @param {boolean} cleanupOptions.force - Whether to force cleanup even if components are busy
 * @param {boolean} cleanupOptions.resetGlobals - Whether to reset global variables
 * @returns {Promise<Object>} Promise resolving to global setup cleanup results with cleanup status and resource deallocation details
 */
async function cleanupGlobalSetup(cleanupOptions = {}) {
    const cleanupStartTime = Date.now();
    const timeout = cleanupOptions.timeout || TIMEOUTS.SERVER_SHUTDOWN;
    const force = cleanupOptions.force === true;
    const resetGlobals = cleanupOptions.resetGlobals !== false;

    try {
        if (globalTestLogger) {
            globalTestLogger.info('Starting global setup cleanup', {
                timeout: timeout,
                force: force,
                resetGlobals: resetGlobals
            });
        }

        const cleanupResults = {
            success: true,
            operations: [],
            errors: [],
            warnings: []
        };

        // Execute all registered teardown hooks using executeTeardownHooks
        if (teardownHooks.length > 0) {
            try {
                const hooksResult = await executeTeardownHooks({
                    continueOnError: true,
                    timeout: Math.floor(timeout * 0.4) // Allocate 40% of timeout to hooks
                });

                cleanupResults.operations.push({
                    operation: 'teardown-hooks',
                    success: hooksResult.success,
                    details: hooksResult
                });

                if (!hooksResult.success) {
                    cleanupResults.warnings.push('Some teardown hooks failed');
                }
            } catch (error) {
                cleanupResults.errors.push(`Teardown hooks execution failed: ${error.message}`);
            }
        }

        // Stop global test server using TestServerManager.stopTestServer if running
        if (globalTestServer && globalTestServer.isServerRunning()) {
            try {
                const serverStopResult = await globalTestServer.stopTestServer({
                    force: force,
                    timeout: Math.floor(timeout * 0.3) // Allocate 30% of timeout to server shutdown
                });

                cleanupResults.operations.push({
                    operation: 'test-server-shutdown',
                    success: Boolean(serverStopResult),
                    details: serverStopResult
                });

                if (globalTestLogger) {
                    globalTestLogger.debug('Global test server stopped successfully');
                }
            } catch (error) {
                cleanupResults.errors.push(`Server shutdown failed: ${error.message}`);
                if (globalTestLogger) {
                    globalTestLogger.error('Failed to stop global test server', { error: error.message });
                }
            }
        }

        // Cleanup global test utilities using TestUtilities.cleanup method
        if (globalTestUtilities && typeof globalTestUtilities.cleanup === 'function') {
            try {
                await globalTestUtilities.cleanup();

                cleanupResults.operations.push({
                    operation: 'test-utilities-cleanup',
                    success: true,
                    details: 'Utilities cleaned up successfully'
                });

                if (globalTestLogger) {
                    globalTestLogger.debug('Global test utilities cleaned up successfully');
                }
            } catch (error) {
                cleanupResults.errors.push(`Utilities cleanup failed: ${error.message}`);
                if (globalTestLogger) {
                    globalTestLogger.error('Failed to cleanup global test utilities', { error: error.message });
                }
            }
        }

        // Reset global test environment using test environment restoration
        if (globalTestContext?.environment && typeof globalTestContext.environment.restore === 'function') {
            try {
                await globalTestContext.environment.restore();

                cleanupResults.operations.push({
                    operation: 'environment-restoration',
                    success: true,
                    details: 'Environment restored successfully'
                });

                if (globalTestLogger) {
                    globalTestLogger.debug('Test environment restored successfully');
                }
            } catch (error) {
                cleanupResults.warnings.push(`Environment restoration failed: ${error.message}`);
            }
        }

        // Clear global test context and reset global variables
        if (resetGlobals) {
            globalTestContext = null;
            globalTestServer = null;
            globalTestUtilities = null;
            teardownHooks.length = 0;
            isSetupComplete = false;
            setupStartTime = null;

            cleanupResults.operations.push({
                operation: 'global-variables-reset',
                success: true,
                details: 'Global variables reset successfully'
            });
        }

        // Close global test logger and cleanup logging resources
        if (globalTestLogger && typeof globalTestLogger.close === 'function') {
            try {
                await globalTestLogger.close();
                cleanupResults.operations.push({
                    operation: 'logger-cleanup',
                    success: true,
                    details: 'Logger closed successfully'
                });
            } catch (error) {
                cleanupResults.warnings.push(`Logger cleanup failed: ${error.message}`);
            }
        }

        // Reset isSetupComplete flag and clear setup timing
        isSetupComplete = false;
        if (resetGlobals) {
            setupStartTime = null;
        }

        const cleanupDuration = Date.now() - cleanupStartTime;

        // Log global setup cleanup completion with timing and status
        if (globalTestLogger && !resetGlobals) {
            globalTestLogger.info('Global setup cleanup completed', {
                success: cleanupResults.success,
                operationCount: cleanupResults.operations.length,
                errorCount: cleanupResults.errors.length,
                warningCount: cleanupResults.warnings.length,
                cleanupDuration: cleanupDuration
            });
        }

        // Reset global test logger after logging if requested
        if (resetGlobals) {
            globalTestLogger = null;
        }

        cleanupResults.cleanupDuration = cleanupDuration;
        cleanupResults.success = cleanupResults.errors.length === 0;

        // Return cleanup results with resource deallocation details
        return cleanupResults;

    } catch (error) {
        const cleanupDuration = Date.now() - cleanupStartTime;

        if (globalTestLogger && !resetGlobals) {
            globalTestLogger.error('Global setup cleanup failed', {
                error: error.message,
                stack: error.stack,
                cleanupDuration: cleanupDuration
            });
        }

        return {
            success: false,
            error: error.message,
            cleanupDuration: cleanupDuration,
            operations: [],
            errors: [error.message],
            warnings: []
        };
    }
}

/**
 * Comprehensive global test setup management class that orchestrates complete test environment
 * initialization, coordinates component setup, manages global test state, and provides
 * centralized setup lifecycle management for the Node.js tutorial application test suite.
 */
class GlobalSetupManager {
    /**
     * Creates GlobalSetupManager instance with setup configuration, initializes setup components,
     * and prepares global test infrastructure orchestration.
     * 
     * @param {Object} setupConfig - Configuration object for global setup management
     * @param {Object} setupConfig.environment - Environment configuration options
     * @param {Object} setupConfig.server - Server configuration options
     * @param {Object} setupConfig.utilities - Utilities configuration options
     * @param {Object} setupConfig.logging - Logging configuration options
     */
    constructor(setupConfig = {}) {
        // Store setup configuration with validation and default value application
        this.config = {
            environment: setupConfig.environment || {},
            server: setupConfig.server || {},
            utilities: setupConfig.utilities || {},
            logging: setupConfig.logging || {},
            ...setupConfig
        };

        // Generate unique setup ID using generateTestId for setup correlation
        this.setupId = generateTestId('global-setup-manager');

        // Create setup logger using createTestLogger with GlobalSetupManager context
        this.logger = createTestLogger({
            context: 'GlobalSetupManager',
            level: this.config.logging?.level || 'info',
            enableConsole: true
        });

        // Initialize component managers to null for lazy initialization during setup
        this.configManager = null;
        this.serverManager = null;
        this.testUtilities = null;

        // Set isInitialized flag to false to track setup completion state
        this.isInitialized = false;

        // Initialize global context object for shared test infrastructure
        this.globalContext = null;

        // Initialize teardownHooks array for cleanup coordination
        this.teardownHooks = [];

        // Initialize processHandlers array for process exit handling
        this.processHandlers = [];

        // Configure setup phases and orchestration timing
        this.startTime = null;

        // Log GlobalSetupManager creation with setup ID and configuration summary
        this.logger.info('GlobalSetupManager created', {
            setupId: this.setupId,
            hasEnvironmentConfig: Boolean(this.config.environment),
            hasServerConfig: Boolean(this.config.server),
            hasUtilitiesConfig: Boolean(this.config.utilities),
            hasLoggingConfig: Boolean(this.config.logging)
        });
    }

    /**
     * Executes complete global test setup process including environment initialization,
     * server setup, utility configuration, and validation with comprehensive error handling and timing.
     * 
     * @param {Object} executionOptions - Configuration options for global setup execution
     * @param {boolean} executionOptions.validateConfiguration - Whether to validate configuration
     * @param {boolean} executionOptions.initializeServer - Whether to initialize test server
     * @param {boolean} executionOptions.initializeUtilities - Whether to initialize test utilities
     * @param {boolean} executionOptions.configureHooks - Whether to configure teardown hooks
     * @returns {Promise<Object>} Promise resolving to complete global setup results with component status, timing, and configuration details
     */
    async executeGlobalSetup(executionOptions = {}) {
        try {
            // Set isInitialized flag to false and record setup start time
            this.isInitialized = false;
            this.startTime = Date.now();

            this.logger.info('Executing global test setup', {
                setupId: this.setupId,
                executionOptions: executionOptions
            });

            const setupResults = {
                success: true,
                components: {},
                errors: [],
                warnings: [],
                timing: {}
            };

            // Execute global test environment initialization using initializeGlobalTestEnvironment
            const envStartTime = Date.now();
            const environmentResult = await initializeGlobalTestEnvironment({
                validateConfig: executionOptions.validateConfiguration !== false,
                enableLogging: this.config.logging?.enabled !== false,
                createDirectories: true,
                environmentOverrides: this.config.environment
            });

            setupResults.timing.environment = Date.now() - envStartTime;
            setupResults.components.environment = environmentResult;

            if (!environmentResult.success) {
                setupResults.errors.push(`Environment initialization failed: ${environmentResult.error}`);
                setupResults.success = false;
            }

            // Execute global test server setup using setupGlobalTestServer
            if (executionOptions.initializeServer !== false && setupResults.success) {
                const serverStartTime = Date.now();
                const serverResult = await setupGlobalTestServer({
                    port: this.config.server?.port,
                    host: this.config.server?.host,
                    enableHealthCheck: this.config.server?.enableHealthCheck !== false,
                    serverConfig: this.config.server
                });

                setupResults.timing.server = Date.now() - serverStartTime;
                setupResults.components.server = serverResult;

                if (!serverResult.success) {
                    setupResults.errors.push(`Server setup failed: ${serverResult.error}`);
                    setupResults.success = false;
                }

                this.serverManager = serverResult.serverManager;
            }

            // Execute global test utilities initialization using initializeGlobalTestUtilities
            if (executionOptions.initializeUtilities !== false && setupResults.success) {
                const utilitiesStartTime = Date.now();
                const utilitiesResult = await initializeGlobalTestUtilities({
                    enableMocking: this.config.utilities?.enableMocking !== false,
                    enablePerformance: this.config.utilities?.enablePerformance !== false,
                    enableFixtures: this.config.utilities?.enableFixtures !== false,
                    mockConfig: this.config.utilities?.mockConfig
                });

                setupResults.timing.utilities = Date.now() - utilitiesStartTime;
                setupResults.components.utilities = utilitiesResult;

                if (!utilitiesResult.success) {
                    setupResults.warnings.push(`Utilities initialization failed: ${utilitiesResult.error}`);
                }

                this.testUtilities = utilitiesResult.utilities;
            }

            // Configure global test hooks using configureGlobalTestHooks
            if (executionOptions.configureHooks !== false) {
                const hooksStartTime = Date.now();
                const hooksResult = configureGlobalTestHooks({
                    enableBeforeHook: true,
                    enableAfterHook: true,
                    enableProcessHandlers: true,
                    cleanupTimeout: this.config.server?.timeout || TIMEOUTS.SERVER_SHUTDOWN
                });

                setupResults.timing.hooks = Date.now() - hooksStartTime;
                setupResults.components.hooks = hooksResult;

                if (!hooksResult.success) {
                    setupResults.warnings.push(`Hooks configuration failed: ${hooksResult.error}`);
                }
            }

            // Set up process exit handlers using setupProcessExitHandlers
            setupProcessExitHandlers({
                cleanupTimeout: this.config.server?.timeout || TIMEOUTS.SERVER_SHUTDOWN,
                enableGracefulShutdown: true,
                logExitEvents: true
            });

            // Validate global setup completion using validateGlobalSetupCompletion
            const validationResult = validateGlobalSetupCompletion();
            setupResults.components.validation = validationResult;

            if (!validationResult.isValid) {
                setupResults.warnings.push('Global setup validation detected issues');
                setupResults.validation = validationResult;
            }

            // Store component references in global context for test access
            this.globalContext = getGlobalTestContext();
            this.configManager = new TestConfigManager(this.globalContext?.configuration || testConfig);

            // Set isInitialized flag to true and update global isSetupComplete
            this.isInitialized = true;
            isSetupComplete = true;

            const totalSetupTime = Date.now() - this.startTime;
            setupResults.timing.total = totalSetupTime;

            // Log global setup summary using logGlobalSetupSummary
            logGlobalSetupSummary(setupResults, totalSetupTime);

            this.logger.info('Global test setup executed successfully', {
                setupId: this.setupId,
                totalTime: totalSetupTime,
                componentCount: Object.keys(setupResults.components).length,
                errorCount: setupResults.errors.length,
                warningCount: setupResults.warnings.length,
                isInitialized: this.isInitialized
            });

            // Return complete setup results with component details and timing
            return setupResults;

        } catch (error) {
            this.isInitialized = false;

            this.logger.error('Global test setup execution failed', {
                setupId: this.setupId,
                error: error.message,
                stack: error.stack,
                executionOptions: executionOptions
            });

            return {
                success: false,
                error: error.message,
                setupId: this.setupId,
                executionOptions: executionOptions,
                timing: {
                    total: this.startTime ? Date.now() - this.startTime : 0
                }
            };
        }
    }

    /**
     * Registers teardown functions with the global setup manager for coordinated cleanup execution.
     * 
     * @param {Function} teardownFn - Teardown function to register
     * @param {Object} options - Registration options including priority and name
     * @returns {Object} Teardown registration result with hook ID and coordination details
     */
    registerTeardown(teardownFn, options = {}) {
        // Use registerTeardownHook function to register teardown function
        const registrationResult = registerTeardownHook(teardownFn, options);

        // Add teardown hook to instance teardownHooks array
        if (registrationResult.success) {
            this.teardownHooks.push({
                ...registrationResult,
                registeredBy: 'GlobalSetupManager',
                registeredAt: new Date().toISOString()
            });
        }

        // Configure teardown execution order and error handling
        this.logger.debug('Teardown function registered', {
            setupId: this.setupId,
            hookId: registrationResult.hookId,
            success: registrationResult.success,
            totalHooks: this.teardownHooks.length
        });

        // Return registration confirmation with hook details
        return registrationResult;
    }

    /**
     * Returns current status of global setup process including initialization state,
     * component status, and setup progress information.
     * 
     * @returns {Object} Global setup status object with initialization details, component status, and progress information
     */
    getSetupStatus() {
        // Include initialization status and setup completion flag
        const initializationStatus = {
            isInitialized: this.isInitialized,
            isSetupComplete: isSetupComplete,
            setupId: this.setupId,
            startTime: this.startTime
        };

        // Add component status for config manager, server manager, and utilities
        const componentStatus = {
            configManager: {
                initialized: Boolean(this.configManager),
                valid: this.configManager ? this.configManager.isValid() : false
            },
            serverManager: {
                initialized: Boolean(this.serverManager),
                running: this.serverManager ? this.serverManager.isServerRunning() : false,
                url: this.serverManager ? this.serverManager.getServerUrl() : null
            },
            testUtilities: {
                initialized: Boolean(this.testUtilities),
                hasCleanup: this.testUtilities ? typeof this.testUtilities.cleanup === 'function' : false
            }
        };

        // Include setup timing information and performance metrics
        const timingInformation = {
            setupStartTime: this.startTime,
            currentTime: Date.now(),
            elapsedTime: this.startTime ? Date.now() - this.startTime : 0,
            setupComplete: this.isInitialized
        };

        // Add global context status and shared infrastructure details
        const contextStatus = {
            hasGlobalContext: Boolean(this.globalContext),
            contextKeys: this.globalContext ? Object.keys(this.globalContext) : [],
            testId: this.globalContext?.testId || null
        };

        // Include teardown hooks count and process handlers status
        const cleanupStatus = {
            teardownHooksCount: this.teardownHooks.length,
            processHandlersCount: processExitHandlers.length,
            cleanupRegistered: this.teardownHooks.length > 0
        };

        // Return comprehensive setup status object
        return {
            initialization: initializationStatus,
            components: componentStatus,
            timing: timingInformation,
            context: contextStatus,
            cleanup: cleanupStatus,
            statusCheckedAt: new Date().toISOString()
        };
    }

    /**
     * Returns the global test context with configuration, server details, utilities,
     * and shared infrastructure for test suite access.
     * 
     * @returns {Object} Global test context object with complete test infrastructure and configuration
     */
    getGlobalContext() {
        // Validate setup is initialized and components are ready
        if (!this.isInitialized) {
            this.logger.warn('Global context accessed before setup completion', {
                setupId: this.setupId,
                isInitialized: this.isInitialized
            });
        }

        // Include configuration manager and complete test configuration
        const configuration = this.configManager ? this.configManager.getConfig() : null;

        // Add server manager and test server connection details
        const server = this.serverManager ? {
            manager: this.serverManager,
            url: this.serverManager.getServerUrl(),
            isRunning: this.serverManager.isServerRunning(),
            testAgent: this.serverManager.getTestAgent()
        } : null;

        // Include test utilities and available testing infrastructure
        const utilities = this.testUtilities ? {
            instance: this.testUtilities,
            hasCleanup: typeof this.testUtilities.cleanup === 'function'
        } : null;

        // Add setup metadata including setup ID and timing
        const metadata = {
            setupId: this.setupId,
            managerCreatedAt: this.startTime ? new Date(this.startTime).toISOString() : null,
            isInitialized: this.isInitialized,
            accessedAt: new Date().toISOString()
        };

        // Return comprehensive global test context
        return {
            configuration: configuration,
            server: server,
            utilities: utilities,
            metadata: metadata,
            context: this.globalContext,
            setupStatus: this.getSetupStatus()
        };
    }

    /**
     * Performs comprehensive cleanup of global setup resources including component cleanup,
     * context reset, and resource deallocation.
     * 
     * @returns {Promise<void>} Promise resolving when global setup cleanup is complete
     */
    async cleanup() {
        try {
            this.logger.info('Starting GlobalSetupManager cleanup', {
                setupId: this.setupId,
                isInitialized: this.isInitialized,
                teardownHooksCount: this.teardownHooks.length
            });

            // Execute cleanupGlobalSetup function for comprehensive resource cleanup
            const cleanupResult = await cleanupGlobalSetup({
                timeout: this.config.server?.timeout || TIMEOUTS.SERVER_SHUTDOWN,
                force: false,
                resetGlobals: true
            });

            // Execute all teardown hooks using executeTeardownHooks
            if (this.teardownHooks.length > 0) {
                await executeTeardownHooks({
                    continueOnError: true,
                    timeout: this.config.server?.timeout || TIMEOUTS.SERVER_SHUTDOWN
                });
            }

            // Cleanup component managers including server and utilities
            this.serverManager = null;
            this.testUtilities = null;
            this.configManager = null;

            // Reset global context and clear component references
            this.globalContext = null;

            // Clear teardownHooks and processHandlers arrays
            this.teardownHooks.length = 0;
            this.processHandlers.length = 0;

            // Set isInitialized flag to false and clear setup timing
            this.isInitialized = false;
            this.startTime = null;

            // Log cleanup completion with resource deallocation details
            this.logger.info('GlobalSetupManager cleanup completed', {
                setupId: this.setupId,
                cleanupSuccess: cleanupResult.success,
                cleanupDuration: cleanupResult.cleanupDuration
            });

            return cleanupResult;

        } catch (error) {
            this.logger.error('GlobalSetupManager cleanup failed', {
                setupId: this.setupId,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }
}

// Export all global test setup functions and classes
module.exports = {
    // Global test environment initialization utility for complete test infrastructure setup
    initializeGlobalTestEnvironment,
    
    // Global test server setup utility for test server infrastructure initialization
    setupGlobalTestServer,
    
    // Global test utilities initialization utility for shared testing infrastructure setup
    initializeGlobalTestUtilities,
    
    // Teardown hook registration utility for automatic cleanup coordination
    registerTeardownHook,
    
    // Teardown hooks execution utility for coordinated cleanup processing
    executeTeardownHooks,
    
    // Global test hooks configuration utility for test lifecycle management setup
    configureGlobalTestHooks,
    
    // Process exit handlers setup utility for graceful shutdown coordination
    setupProcessExitHandlers,
    
    // Global setup validation utility for verifying complete setup readiness
    validateGlobalSetupCompletion,
    
    // Global test context accessor utility for test suite infrastructure access
    getGlobalTestContext,
    
    // Global setup logging utility for comprehensive setup summary and debugging
    logGlobalSetupSummary,
    
    // Global setup cleanup utility for resource deallocation and context reset
    cleanupGlobalSetup,
    
    // Comprehensive global test setup management class for complete test infrastructure orchestration
    GlobalSetupManager,
    
    // Global test context object for shared test infrastructure access across test suites
    globalTestContext: () => globalTestContext
};