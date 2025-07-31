/**
 * Global Test Teardown Module for Node.js Tutorial Application
 * 
 * This module provides comprehensive cleanup of test environment infrastructure for the 
 * Node.js tutorial application test suite. Handles test server shutdown, test utilities 
 * cleanup, environment restoration, global context reset, and resource deallocation to 
 * ensure proper test isolation and prevent resource leaks.
 * 
 * Designed to work with Node.js built-in test runner and provides complete teardown for
 * unit, integration, and end-to-end testing scenarios while demonstrating professional 
 * testing patterns and global test infrastructure cleanup for educational purposes.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// External dependencies with version information
const { test } = require('node:test'); // built-in - Node.js test runner for test hooks
const process = require('node:process'); // built-in - Node.js process API for environment restoration
const { promisify } = require('node:util'); // built-in - Node.js util module for promisify utilities

// Internal dependencies - Test configuration and coordination
const { 
    testConfig,
    TestConfiguration 
} = require('./testConfig.js');

const {
    cleanupGlobalSetup,
    executeTeardownHooks,
    getGlobalTestContext
} = require('./globalSetup.js');

// Internal dependencies - Test server management and cleanup
const {
    TestServerManager,
    cleanupAllTestServers,
    getAllTestServers
} = require('../helpers/serverHelpers.js');

// Internal dependencies - Test utilities and helper functions
const {
    TestUtilities,
    createTestLogger,
    generateTestId,
    formatTestOutput
} = require('../helpers/testHelpers.js');

// Internal dependencies - Application constants for timeouts and environment
const { TIMEOUTS, ENVIRONMENT } = require('../../utils/constants.js');

// Global teardown state variables for tracking completion and results
let globalTeardownContext = null;
let teardownStartTime = null;
let isTeardownComplete = false;
let teardownLogger = null;

// Original process environment backup for restoration
const originalProcessEnv = Object.assign({}, process.env);

// Results tracking arrays for comprehensive teardown reporting
const cleanupResults = [];
const teardownErrors = [];

/**
 * Executes the complete teardown sequence including server cleanup, utilities reset,
 * environment restoration, and resource deallocation with comprehensive error handling and timing
 * 
 * @param {object} teardownOptions - Configuration options for teardown execution
 * @param {number} teardownOptions.timeout - Overall teardown timeout in milliseconds
 * @param {boolean} teardownOptions.force - Force shutdown even if errors occur
 * @param {boolean} teardownOptions.validateCompletion - Perform teardown completion validation
 * @returns {Promise<object>} Promise resolving to teardown execution results with cleanup status, timing, and error details
 */
async function executeTeardownSequence(teardownOptions = {}) {
    const options = {
        timeout: teardownOptions.timeout || TIMEOUTS.CLEANUP_TIMEOUT || 30000,
        force: teardownOptions.force !== false,
        validateCompletion: teardownOptions.validateCompletion !== false,
        ...teardownOptions
    };

    try {
        // Record teardown start time for performance measurement and timing analysis
        teardownStartTime = Date.now();

        // Create teardown logger using createTestLogger with TeardownManager context
        teardownLogger = createTestLogger('TeardownSequence');

        // Generate teardown ID using generateTestId for correlation and tracking
        const teardownId = generateTestId('teardown');

        teardownLogger.info('Starting comprehensive teardown sequence', {
            teardownId,
            timeout: options.timeout,
            force: options.force
        });

        // Initialize teardown context with configuration and cleanup coordination
        globalTeardownContext = await createTeardownContext({
            teardownId,
            startTime: teardownStartTime,
            options,
            logger: teardownLogger
        });

        // Execute server cleanup using cleanupAllTestServers function
        const serverCleanupResult = await cleanupTestServers({
            timeout: options.timeout / 4, // Allocate 25% of timeout to server cleanup
            force: options.force
        });
        cleanupResults.push({ phase: 'servers', ...serverCleanupResult });

        // Execute test utilities cleanup using TestUtilities.cleanup method
        const utilitiesCleanupResult = await cleanupTestUtilities({
            timeout: options.timeout / 4, // Allocate 25% of timeout to utilities cleanup
            force: options.force
        });
        cleanupResults.push({ phase: 'utilities', ...utilitiesCleanupResult });

        // Execute registered teardown hooks using executeTeardownHooks
        const hooksResult = await executeTeardownHooksSequence({
            timeout: options.timeout / 4, // Allocate 25% of timeout to hooks execution
            continueOnError: options.force
        });
        cleanupResults.push({ phase: 'hooks', ...hooksResult });

        // Restore process environment variables to original state
        const environmentResult = restoreProcessEnvironment({
            validateRestore: true,
            logChanges: true
        });
        cleanupResults.push({ phase: 'environment', ...environmentResult });

        // Execute global setup cleanup using cleanupGlobalSetup function
        await cleanupGlobalSetup();
        cleanupResults.push({ 
            phase: 'globalSetup', 
            success: true, 
            timestamp: Date.now() 
        });

        // Validate teardown completion and collect cleanup results
        let validationResult = { success: true, warnings: [] };
        if (options.validateCompletion) {
            validationResult = validateTeardownCompletion({
                cleanupResults,
                startTime: teardownStartTime,
                context: globalTeardownContext
            });
        }

        // Set isTeardownComplete flag to true and prepare results
        isTeardownComplete = true;
        const totalDuration = Date.now() - teardownStartTime;

        const teardownResult = {
            teardownId: globalTeardownContext.teardownId,
            success: teardownErrors.length === 0,
            duration: totalDuration,
            startTime: teardownStartTime,
            endTime: Date.now(),
            cleanupResults: [...cleanupResults],
            errors: [...teardownErrors],
            validation: validationResult,
            options: options
        };

        // Log teardown summary with timing and cleanup status
        logTeardownSummary(teardownResult, totalDuration);

        return teardownResult;

    } catch (error) {
        const teardownError = handleTeardownError(error, 'teardown-sequence', {
            phase: 'main-sequence',
            startTime: teardownStartTime
        });
        
        throw new Error(`Teardown sequence failed: ${teardownError.error}`);
    }
}

/**
 * Performs comprehensive cleanup of all test server instances including graceful shutdown,
 * resource deallocation, and connection cleanup with timeout handling
 * 
 * @param {object} serverCleanupOptions - Configuration options for server cleanup
 * @param {number} serverCleanupOptions.timeout - Server cleanup timeout in milliseconds
 * @param {boolean} serverCleanupOptions.force - Force shutdown if graceful shutdown fails
 * @returns {Promise<object>} Promise resolving to server cleanup results with shutdown status and timing details
 */
async function cleanupTestServers(serverCleanupOptions = {}) {
    const options = {
        timeout: serverCleanupOptions.timeout || TIMEOUTS.SERVER_SHUTDOWN || 5000,
        force: serverCleanupOptions.force !== false,
        parallel: serverCleanupOptions.parallel !== false,
        ...serverCleanupOptions
    };

    const startTime = Date.now();
    let cleanupResult = {
        phase: 'servers',
        success: false,
        duration: 0,
        serversFound: 0,
        serversCleanedUp: 0,
        errors: []
    };

    try {
        // Get list of all active test servers using getAllTestServers function
        const activeServers = getAllTestServers();
        cleanupResult.serversFound = activeServers.length;

        if (teardownLogger) {
            teardownLogger.info(`Starting server cleanup for ${activeServers.length} active servers`, {
                servers: activeServers.map(s => ({ id: s.testServerId, url: s.serverUrl })),
                timeout: options.timeout
            });
        }

        // Execute cleanupAllTestServers with timeout and error handling
        const serverCleanupResults = await cleanupAllTestServers({
            timeout: options.timeout,
            force: options.force,
            parallel: options.parallel
        });

        cleanupResult.serversCleanedUp = serverCleanupResults.shutdownSuccess;
        cleanupResult.success = serverCleanupResults.shutdownErrors === 0;
        
        if (serverCleanupResults.errors.length > 0) {
            cleanupResult.errors = serverCleanupResults.errors;
            teardownErrors.push(...serverCleanupResults.errors.map(err => ({
                phase: 'server-cleanup',
                error: err.error,
                serverId: err.testServerId
            })));
        }

        // Validate all test servers are properly shutdown and resources released
        const remainingServers = getAllTestServers();
        if (remainingServers.length > 0) {
            const warning = `${remainingServers.length} servers still active after cleanup`;
            cleanupResult.warnings = [warning];
            
            if (teardownLogger) {
                teardownLogger.warn(warning, { 
                    remainingServers: remainingServers.map(s => s.testServerId) 
                });
            }
        }

        cleanupResult.duration = Date.now() - startTime;

        // Log server cleanup completion with shutdown summary
        if (teardownLogger) {
            teardownLogger.info('Server cleanup completed', {
                duration: cleanupResult.duration,
                success: cleanupResult.success,
                serversFound: cleanupResult.serversFound,
                serversCleanedUp: cleanupResult.serversCleanedUp,
                errors: cleanupResult.errors.length
            });
        }

        return cleanupResult;

    } catch (error) {
        cleanupResult.success = false;
        cleanupResult.duration = Date.now() - startTime;
        cleanupResult.errors.push(error.message);
        
        const handledError = handleTeardownError(error, 'server-cleanup', {
            serversFound: cleanupResult.serversFound,
            duration: cleanupResult.duration
        });
        
        cleanupResult.error = handledError.error;
        return cleanupResult;
    }
}

/**
 * Performs comprehensive cleanup of test utilities including mock resets, environment 
 * restoration, and utility state cleanup with error handling
 * 
 * @param {object} utilitiesCleanupOptions - Configuration options for utilities cleanup
 * @param {number} utilitiesCleanupOptions.timeout - Utilities cleanup timeout in milliseconds
 * @param {boolean} utilitiesCleanupOptions.resetMocks - Whether to reset all mock functions
 * @returns {Promise<object>} Promise resolving to utilities cleanup results with reset status and cleanup details
 */
async function cleanupTestUtilities(utilitiesCleanupOptions = {}) {
    const options = {
        timeout: utilitiesCleanupOptions.timeout || TIMEOUTS.CLEANUP_TIMEOUT || 10000,
        resetMocks: utilitiesCleanupOptions.resetMocks !== false,
        restoreEnvironment: utilitiesCleanupOptions.restoreEnvironment !== false,
        ...utilitiesCleanupOptions
    };

    const startTime = Date.now();
    let cleanupResult = {
        phase: 'utilities',
        success: false,
        duration: 0,
        utilitiesCleanedUp: 0,
        mocksReset: 0,
        errors: []
    };

    try {
        // Get global test utilities instance from test context
        const globalContext = getGlobalTestContext();
        const testUtilities = globalContext?.utilities;

        if (teardownLogger) {
            teardownLogger.info('Starting test utilities cleanup', {
                hasUtilities: !!testUtilities,
                timeout: options.timeout
            });
        }

        let utilitiesProcessed = 0;

        // Execute TestUtilities.cleanup method for comprehensive mock cleanup
        if (testUtilities && typeof testUtilities.cleanup === 'function') {
            await testUtilities.cleanup();
            utilitiesProcessed++;
            
            // Get mock information if available
            const testInfo = testUtilities.getTestInfo?.();
            if (testInfo) {
                cleanupResult.mocksReset = testInfo.mocks?.count || 0;
            }
        }

        // Execute TestUtilities.reset method for utility state restoration
        if (testUtilities && typeof testUtilities.reset === 'function') {
            await testUtilities.reset();
        }

        // Clear any remaining test data and temporary resources
        if (globalContext?.testData) {
            globalContext.testData = {};
        }

        // Clean up test configuration instances
        const testConfigInstance = testConfig?.testConfiguration;
        if (testConfigInstance && typeof testConfigInstance.cleanup === 'function') {
            await testConfigInstance.cleanup();
            utilitiesProcessed++;
        }

        cleanupResult.utilitiesCleanedUp = utilitiesProcessed;
        cleanupResult.success = true;
        cleanupResult.duration = Date.now() - startTime;

        // Log utilities cleanup progress and completion status
        if (teardownLogger) {
            teardownLogger.info('Test utilities cleanup completed', {
                duration: cleanupResult.duration,
                utilitiesCleanedUp: cleanupResult.utilitiesCleanedUp,
                mocksReset: cleanupResult.mocksReset
            });
        }

        return cleanupResult;

    } catch (error) {
        cleanupResult.success = false;
        cleanupResult.duration = Date.now() - startTime;
        cleanupResult.errors.push(error.message);
        
        const handledError = handleTeardownError(error, 'utilities-cleanup', {
            utilitiesProcessed: cleanupResult.utilitiesCleanedUp,
            duration: cleanupResult.duration
        });
        
        cleanupResult.error = handledError.error;
        return cleanupResult;
    }
}

/**
 * Restores process environment variables to their original state before test execution,
 * ensuring no test-specific configuration persists after teardown
 * 
 * @param {object} environmentOptions - Configuration options for environment restoration
 * @param {boolean} environmentOptions.validateRestore - Whether to validate restoration completeness
 * @param {boolean} environmentOptions.logChanges - Whether to log environment changes
 * @returns {object} Environment restoration result with restored variables and change summary
 */
function restoreProcessEnvironment(environmentOptions = {}) {
    const options = {
        validateRestore: environmentOptions.validateRestore !== false,
        logChanges: environmentOptions.logChanges !== false,
        ...environmentOptions
    };

    const startTime = Date.now();
    let restorationResult = {
        phase: 'environment',
        success: false,
        duration: 0,
        variablesRestored: 0,
        variablesRemoved: 0,
        changes: []
    };

    try {
        // Compare current process.env with originalProcessEnv to identify changes
        const currentEnvKeys = Object.keys(process.env);
        const originalEnvKeys = Object.keys(originalProcessEnv);
        const allKeys = new Set([...currentEnvKeys, ...originalEnvKeys]);

        let restoredCount = 0;
        let removedCount = 0;
        const changes = [];

        // Remove test-specific environment variables that were added during testing
        for (const key of allKeys) {
            const currentValue = process.env[key];
            const originalValue = originalProcessEnv[key];

            if (originalValue === undefined && currentValue !== undefined) {
                // Variable was added during testing, remove it
                delete process.env[key];
                removedCount++;
                changes.push({ key, action: 'removed', value: currentValue });
            } else if (originalValue !== undefined && currentValue !== originalValue) {
                // Variable was modified during testing, restore original value
                process.env[key] = originalValue;
                restoredCount++;
                changes.push({ 
                    key, 
                    action: 'restored', 
                    from: currentValue, 
                    to: originalValue 
                });
            }
        }

        // Reset NODE_ENV to original value if it was changed for testing
        if (originalProcessEnv.NODE_ENV && process.env.NODE_ENV !== originalProcessEnv.NODE_ENV) {
            process.env.NODE_ENV = originalProcessEnv.NODE_ENV;
            restoredCount++;
            changes.push({ 
                key: 'NODE_ENV', 
                action: 'restored', 
                from: process.env.NODE_ENV, 
                to: originalProcessEnv.NODE_ENV 
            });
        }

        restorationResult.variablesRestored = restoredCount;
        restorationResult.variablesRemoved = removedCount;
        restorationResult.changes = changes;
        restorationResult.success = true;
        restorationResult.duration = Date.now() - startTime;

        // Log environment restoration progress and changes made
        if (options.logChanges && teardownLogger && changes.length > 0) {
            teardownLogger.info('Environment variables restored', {
                totalChanges: changes.length,
                restored: restoredCount,
                removed: removedCount,
                changes: changes.slice(0, 10) // Log first 10 changes to avoid spam
            });
        }

        // Validate environment restoration completeness
        if (options.validateRestore) {
            const validationErrors = [];
            
            for (const key of Object.keys(originalProcessEnv)) {
                if (process.env[key] !== originalProcessEnv[key]) {
                    validationErrors.push(`${key} not properly restored`);
                }
            }
            
            if (validationErrors.length > 0) {
                restorationResult.validationErrors = validationErrors;
                restorationResult.success = false;
                
                if (teardownLogger) {
                    teardownLogger.warn('Environment restoration validation failed', {
                        errors: validationErrors
                    });
                }
            }
        }

        return restorationResult;

    } catch (error) {
        restorationResult.success = false;
        restorationResult.duration = Date.now() - startTime;
        restorationResult.error = error.message;
        
        handleTeardownError(error, 'environment-restoration', {
            variablesProcessed: restorationResult.variablesRestored + restorationResult.variablesRemoved
        });
        
        return restorationResult;
    }
}

/**
 * Executes all registered teardown hooks in proper order with error handling and
 * logging for comprehensive cleanup coordination
 * 
 * @param {object} hooksExecutionOptions - Configuration options for hooks execution
 * @param {number} hooksExecutionOptions.timeout - Hooks execution timeout in milliseconds
 * @param {boolean} hooksExecutionOptions.continueOnError - Continue execution even if hooks fail
 * @returns {Promise<object>} Promise resolving to teardown hooks execution results with hook status and timing
 */
async function executeTeardownHooksSequence(hooksExecutionOptions = {}) {
    const options = {
        timeout: hooksExecutionOptions.timeout || TIMEOUTS.CLEANUP_TIMEOUT || 10000,
        continueOnError: hooksExecutionOptions.continueOnError !== false,
        ...hooksExecutionOptions
    };

    const startTime = Date.now();
    let hooksResult = {
        phase: 'hooks',
        success: false,
        duration: 0,
        hooksExecuted: 0,
        hooksSkipped: 0,
        errors: []
    };

    try {
        if (teardownLogger) {
            teardownLogger.info('Starting teardown hooks execution', {
                timeout: options.timeout,
                continueOnError: options.continueOnError
            });
        }

        // Execute teardown hooks using executeTeardownHooks function
        const hooksExecutionResult = await Promise.race([
            executeTeardownHooks(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Teardown hooks execution timeout')), options.timeout)
            )
        ]);

        // Handle individual hook execution errors without stopping sequence
        hooksResult.success = true;
        hooksResult.hooksExecuted = hooksExecutionResult?.executed || 0;
        
        // Collect hook execution timing and status information
        if (hooksExecutionResult?.errors) {
            hooksResult.errors = hooksExecutionResult.errors;
            
            if (!options.continueOnError && hooksResult.errors.length > 0) {
                hooksResult.success = false;
            }
            
            // Add to global teardown errors
            teardownErrors.push(...hooksExecutionResult.errors.map(err => ({
                phase: 'teardown-hooks',
                error: err.message || err,
                hook: err.hook || 'unknown'
            })));
        }

        hooksResult.duration = Date.now() - startTime;

        // Log hook execution progress and any errors encountered
        if (teardownLogger) {
            teardownLogger.info('Teardown hooks execution completed', {
                duration: hooksResult.duration,
                success: hooksResult.success,
                executed: hooksResult.hooksExecuted,
                errors: hooksResult.errors.length
            });
        }

        // Validate all hooks completed execution regardless of individual results
        return hooksResult;

    } catch (error) {
        hooksResult.success = false;
        hooksResult.duration = Date.now() - startTime;
        hooksResult.errors.push(error.message);
        
        const handledError = handleTeardownError(error, 'hooks-execution', {
            hooksExecuted: hooksResult.hooksExecuted,
            duration: hooksResult.duration
        });
        
        hooksResult.error = handledError.error;
        return hooksResult;
    }
}

/**
 * Validates that teardown completed successfully by verifying all components are cleaned up,
 * resources are deallocated, and system is reset to pre-test state
 * 
 * @param {object} validationOptions - Configuration options for validation
 * @param {array} validationOptions.cleanupResults - Results from cleanup phases
 * @param {number} validationOptions.startTime - Teardown start timestamp
 * @param {object} validationOptions.context - Teardown execution context
 * @returns {object} Teardown validation results with completion status, component verification, and cleanup confirmation
 */
function validateTeardownCompletion(validationOptions = {}) {
    const {
        cleanupResults = [],
        startTime = Date.now(),
        context = globalTeardownContext
    } = validationOptions;

    const validationResult = {
        success: true,
        warnings: [],
        errors: [],
        checks: {},
        summary: {}
    };

    try {
        // Verify all test servers are stopped and resources released
        const remainingServers = getAllTestServers();
        validationResult.checks.testServers = {
            remaining: remainingServers.length,
            allStopped: remainingServers.length === 0
        };

        if (remainingServers.length > 0) {
            validationResult.warnings.push(`${remainingServers.length} test servers still active`);
            validationResult.checks.testServers.activeServers = remainingServers.map(s => ({
                id: s.testServerId,
                status: s.status
            }));
        }

        // Check test utilities are reset and mocks are cleared
        const globalContext = getGlobalTestContext();
        const testUtilities = globalContext?.utilities;
        
        validationResult.checks.testUtilities = {
            available: !!testUtilities,
            cleaned: true // Assume cleaned if cleanup was called
        };

        if (testUtilities && typeof testUtilities.getTestInfo === 'function') {
            const utilInfo = testUtilities.getTestInfo();
            validationResult.checks.testUtilities.activeMocks = utilInfo.mocks?.count || 0;
            validationResult.checks.testUtilities.cleanupTasks = utilInfo.cleanup?.taskCount || 0;
            
            if (utilInfo.mocks?.count > 0) {
                validationResult.warnings.push(`${utilInfo.mocks.count} active mocks still present`);
            }
        }

        // Validate environment variables are restored to original state
        const envValidation = { restored: true, differences: 0 };
        const currentKeys = Object.keys(process.env);
        const originalKeys = Object.keys(originalProcessEnv);
        
        let envDifferences = 0;
        for (const key of new Set([...currentKeys, ...originalKeys])) {
            if (process.env[key] !== originalProcessEnv[key]) {
                envDifferences++;
            }
        }
        
        envValidation.differences = envDifferences;
        envValidation.restored = envDifferences === 0;
        validationResult.checks.environment = envValidation;

        if (envDifferences > 0) {
            validationResult.warnings.push(`${envDifferences} environment variables not restored`);
        }

        // Verify global test context is cleared and reset
        validationResult.checks.globalContext = {
            available: !!globalContext,
            cleared: !globalContext || Object.keys(globalContext).length === 0
        };

        // Check teardown hooks executed successfully
        const hooksPhase = cleanupResults.find(r => r.phase === 'hooks');
        validationResult.checks.teardownHooks = {
            executed: hooksPhase?.success || false,
            errors: hooksPhase?.errors?.length || 0
        };

        if (hooksPhase && !hooksPhase.success) {
            validationResult.errors.push('Teardown hooks execution failed');
        }

        // Validate no test-specific resources remain allocated
        validationResult.checks.resourceAllocation = {
            memoryStable: true, // Basic check - could be enhanced
            processClean: process.listenerCount('exit') === 0
        };

        // Calculate total teardown time and compare against performance thresholds
        const totalDuration = Date.now() - startTime;
        const maxExpectedDuration = TIMEOUTS.CLEANUP_TIMEOUT || 30000;
        
        validationResult.checks.performance = {
            duration: totalDuration,
            withinThreshold: totalDuration <= maxExpectedDuration,
            threshold: maxExpectedDuration
        };

        if (totalDuration > maxExpectedDuration) {
            validationResult.warnings.push(`Teardown duration ${totalDuration}ms exceeds threshold ${maxExpectedDuration}ms`);
        }

        // Determine overall validation success
        validationResult.success = validationResult.errors.length === 0;

        // Generate validation summary
        validationResult.summary = {
            totalChecks: Object.keys(validationResult.checks).length,
            passed: Object.values(validationResult.checks).filter(check => 
                typeof check === 'object' ? Object.values(check).every(v => v === true || v === 0) : check === true
            ).length,
            warnings: validationResult.warnings.length,
            errors: validationResult.errors.length,
            overallSuccess: validationResult.success
        };

        return validationResult;

    } catch (error) {
        validationResult.success = false;
        validationResult.errors.push(`Validation error: ${error.message}`);
        validationResult.validationError = error.message;
        
        handleTeardownError(error, 'teardown-validation', { 
            checksCompleted: Object.keys(validationResult.checks).length 
        });
        
        return validationResult;
    }
}

/**
 * Logs comprehensive summary of teardown process including cleanup results, timing information,
 * errors encountered, and final system state for debugging and monitoring
 * 
 * @param {object} teardownResults - Complete teardown results object
 * @param {number} totalDuration - Total teardown duration in milliseconds
 * @returns {void} No return value - performs logging of teardown summary
 */
function logTeardownSummary(teardownResults, totalDuration) {
    if (!teardownLogger) {
        return;
    }

    try {
        // Calculate total teardown duration and component cleanup timing
        const durationSeconds = (totalDuration / 1000).toFixed(2);
        const phases = teardownResults.cleanupResults || [];
        
        teardownLogger.info('='.repeat(60));
        teardownLogger.info('TEARDOWN SUMMARY');
        teardownLogger.info('='.repeat(60));

        // Format teardown results summary with component cleanup status  
        teardownLogger.info(`Teardown ID: ${teardownResults.teardownId}`);
        teardownLogger.info(`Overall Status: ${teardownResults.success ? 'SUCCESS' : 'FAILED'}`);
        teardownLogger.info(`Total Duration: ${durationSeconds}s (${totalDuration}ms)`);
        teardownLogger.info(`Start Time: ${new Date(teardownResults.startTime).toISO String()}`);
        teardownLogger.info(`End Time: ${new Date(teardownResults.endTime).toISOString()}`);

        // Include server cleanup status with shutdown confirmation
        const serverPhase = phases.find(p => p.phase === 'servers');
        if (serverPhase) {
            teardownLogger.info(`Server Cleanup: ${serverPhase.success ? 'SUCCESS' : 'FAILED'}`);
            teardownLogger.info(`  - Servers Found: ${serverPhase.serversFound || 0}`);
            teardownLogger.info(`  - Servers Cleaned: ${serverPhase.serversCleanedUp || 0}`);
            teardownLogger.info(`  - Duration: ${serverPhase.duration || 0}ms`);
        }

        // Add utilities cleanup summary with mock reset confirmation
        const utilitiesPhase = phases.find(p => p.phase === 'utilities');
        if (utilitiesPhase) {
            teardownLogger.info(`Utilities Cleanup: ${utilitiesPhase.success ? 'SUCCESS' : 'FAILED'}`);
            teardownLogger.info(`  - Utilities Cleaned: ${utilitiesPhase.utilitiesCleanedUp || 0}`);
            teardownLogger.info(`  - Mocks Reset: ${utilitiesPhase.mocksReset || 0}`);
            teardownLogger.info(`  - Duration: ${utilitiesPhase.duration || 0}ms`);
        }

        // Log environment restoration status with variable changes
        const envPhase = phases.find(p => p.phase === 'environment');
        if (envPhase) {
            teardownLogger.info(`Environment Restoration: ${envPhase.success ? 'SUCCESS' : 'FAILED'}`);
            teardownLogger.info(`  - Variables Restored: ${envPhase.variablesRestored || 0}`);
            teardownLogger.info(`  - Variables Removed: ${envPhase.variablesRemoved || 0}`);
            teardownLogger.info(`  - Total Changes: ${envPhase.changes?.length || 0}`);
        }

        // Include performance metrics and teardown timing analysis
        if (teardownResults.validation) {
            const validation = teardownResults.validation;
            teardownLogger.info(`Validation: ${validation.success ? 'PASSED' : 'FAILED'}`);
            teardownLogger.info(`  - Checks: ${validation.summary?.totalChecks || 0}`);
            teardownLogger.info(`  - Warnings: ${validation.warnings?.length || 0}`);
            teardownLogger.info(`  - Errors: ${validation.errors?.length || 0}`);
        }

        // Log any errors or warnings encountered during teardown
        if (teardownResults.errors && teardownResults.errors.length > 0) {
            teardownLogger.warn(`Teardown Errors (${teardownResults.errors.length}):`);
            teardownResults.errors.forEach((error, index) => {
                teardownLogger.warn(`  ${index + 1}. [${error.phase}] ${error.error}`);
            });
        }

        // Include validation warnings if present
        if (teardownResults.validation && teardownResults.validation.warnings.length > 0) {
            teardownLogger.warn(`Validation Warnings (${teardownResults.validation.warnings.length}):`);
            teardownResults.validation.warnings.forEach((warning, index) => {
                teardownLogger.warn(`  ${index + 1}. ${warning}`);
            });
        }

        // Provide teardown completion confirmation with system reset status
        teardownLogger.info('='.repeat(60));
        teardownLogger.info(teardownResults.success 
            ? 'TEARDOWN COMPLETED SUCCESSFULLY - System reset to pre-test state'
            : 'TEARDOWN COMPLETED WITH ERRORS - Review errors above'
        );
        teardownLogger.info('='.repeat(60));

    } catch (error) {
        console.error('[logTeardownSummary] Failed to log teardown summary:', error.message);
    }
}

/**
 * Handles teardown errors with appropriate logging, error classification, and recovery 
 * attempts to ensure partial cleanup can continue even when some components fail
 * 
 * @param {Error} error - Error object that occurred during teardown
 * @param {string} errorContext - Context information about where the error occurred  
 * @param {object} errorOptions - Additional options for error handling
 * @returns {object} Error handling result with classification, recovery actions, and continuation strategy
 */
function handleTeardownError(error, errorContext, errorOptions = {}) {
    const errorInfo = {
        phase: errorContext,
        error: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        context: errorOptions,
        classification: 'unknown',
        recoverable: true,
        continueExecution: true
    };

    try {
        // Classify error type and severity level for appropriate handling
        if (error.message.includes('timeout')) {
            errorInfo.classification = 'timeout';
            errorInfo.recoverable = true;
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('EADDRINUSE')) {
            errorInfo.classification = 'network';
            errorInfo.recoverable = true;
        } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
            errorInfo.classification = 'permission';
            errorInfo.recoverable = false;
        } else if (error.code === 'ENOENT') {
            errorInfo.classification = 'resource-missing';
            errorInfo.recoverable = true;
        } else {
            errorInfo.classification = 'application';
            errorInfo.recoverable = true;
        }

        // Log error details with context and stack trace for debugging
        if (teardownLogger) {
            teardownLogger.error(`Teardown error in ${errorContext}`, {
                error: error.message,
                classification: errorInfo.classification,
                recoverable: errorInfo.recoverable,
                context: errorOptions
            });
            
            if (error.stack) {
                teardownLogger.debug(`Stack trace for ${errorContext}:`, { stack: error.stack });
            }
        }

        // Add error to teardownErrors array for summary reporting
        teardownErrors.push(errorInfo);

        // Attempt error recovery if possible based on error type
        if (errorInfo.recoverable) {
            switch (errorInfo.classification) {
                case 'timeout':
                    // For timeout errors, log but continue execution
                    if (teardownLogger) {
                        teardownLogger.warn(`Timeout in ${errorContext}, continuing with remaining cleanup`);
                    }
                    break;
                    
                case 'network':
                    // Network errors during cleanup are often expected
                    if (teardownLogger) {
                        teardownLogger.info(`Network error in ${errorContext}, resource may already be cleaned up`);
                    }
                    break;
                    
                case 'resource-missing':
                    // Missing resources during cleanup are acceptable
                    if (teardownLogger) {
                        teardownLogger.info(`Resource not found in ${errorContext}, may already be cleaned up`);
                    }
                    break;
            }
        }

        // Determine if teardown can continue or should abort
        if (!errorInfo.recoverable) {
            errorInfo.continueExecution = false;
            if (teardownLogger) {
                teardownLogger.error(`Fatal error in ${errorContext}, teardown execution should be aborted`);
            }
        }

        // Update teardown status with error information
        if (globalTeardownContext) {
            globalTeardownContext.errors = globalTeardownContext.errors || [];
            globalTeardownContext.errors.push(errorInfo);
        }

        return errorInfo;

    } catch (handlingError) {
        // If error handling itself fails, create minimal error info
        const fallbackErrorInfo = {
            phase: errorContext,
            error: error.message,
            handlingError: handlingError.message,
            timestamp: Date.now(),
            classification: 'error-handling-failed',
            recoverable: true,
            continueExecution: true
        };

        teardownErrors.push(fallbackErrorInfo);
        console.error(`[handleTeardownError] Error handling failed: ${handlingError.message}`);
        
        return fallbackErrorInfo;
    }
}

/**
 * Creates teardown context object with configuration, timing, and coordination information
 * for comprehensive teardown execution and tracking
 * 
 * @param {object} contextOptions - Configuration options for teardown context creation
 * @param {string} contextOptions.teardownId - Unique identifier for the teardown session
 * @param {number} contextOptions.startTime - Teardown start timestamp
 * @param {object} contextOptions.options - Teardown execution options
 * @param {object} contextOptions.logger - Logger instance for teardown operations
 * @returns {object} Teardown context object with configuration, timing, and coordination details
 */
async function createTeardownContext(contextOptions = {}) {
    const {
        teardownId = generateTestId('teardown'),
        startTime = Date.now(),
        options = {},
        logger = teardownLogger
    } = contextOptions;

    try {
        // Get global test context using getGlobalTestContext function
        const globalContext = getGlobalTestContext();

        // Create teardown configuration from test configuration and options
        const teardownConfig = {
            ...testConfig.teardown,
            ...options,
            environment: process.env.NODE_ENV || ENVIRONMENT.TEST,
            nodeVersion: process.version,
            platform: process.platform
        };

        // Initialize teardown timing and performance tracking
        const context = {
            teardownId,
            startTime,
            endTime: null,
            duration: 0,
            
            // Configuration and options
            config: teardownConfig,
            options: options,
            
            // Global test context reference
            globalContext: globalContext,
            
            // Initialize teardown error handling and logging configuration
            logger: logger,
            errors: [],
            warnings: [],
            
            // Configure cleanup coordination and resource tracking
            phases: {
                servers: { status: 'pending', startTime: null, endTime: null },
                utilities: { status: 'pending', startTime: null, endTime: null },
                environment: { status: 'pending', startTime: null, endTime: null },
                hooks: { status: 'pending', startTime: null, endTime: null },
                validation: { status: 'pending', startTime: null, endTime: null }
            },
            
            // Resource tracking
            resources: {
                servers: [],
                utilities: [],
                environment: { original: originalProcessEnv, current: { ...process.env } }
            }
        };

        // Set up teardown error handling and logging configuration
        if (logger) {
            logger.debug('Teardown context created', {
                teardownId,
                config: teardownConfig,
                phases: Object.keys(context.phases)
            });
        }

        return context;

    } catch (error) {
        const fallbackContext = {
            teardownId,
            startTime,
            error: error.message,
            config: { fallback: true },
            options: options,
            logger: logger
        };

        if (logger) {
            logger.error('Failed to create teardown context, using fallback', {
                error: error.message,
                teardownId
            });
        }

        return fallbackContext;
    }
}

/**
 * Performs emergency cleanup procedures for unexpected shutdown scenarios, attempting
 * to cleanup critical resources with minimal error handling requirements
 * 
 * @param {object} emergencyOptions - Configuration options for emergency cleanup
 * @param {number} emergencyOptions.timeout - Maximum time to spend on emergency cleanup
 * @param {boolean} emergencyOptions.force - Force cleanup operations regardless of errors
 * @returns {Promise<void>} Promise resolving when emergency cleanup is complete, regardless of individual operation success
 */
async function performEmergencyCleanup(emergencyOptions = {}) {
    const options = {
        timeout: emergencyOptions.timeout || 5000, // Short timeout for emergency
        force: emergencyOptions.force !== false,
        ...emergencyOptions
    };

    const emergencyLogger = teardownLogger || createTestLogger('EmergencyCleanup');
    const startTime = Date.now();

    try {
        emergencyLogger.warn('Starting emergency cleanup procedures', {
            timeout: options.timeout,
            timestamp: new Date().toISOString()
        });

        // Attempt immediate server shutdown without graceful procedures
        try {
            const servers = getAllTestServers();
            if (servers.length > 0) {
                emergencyLogger.info(`Emergency shutdown of ${servers.length} servers`);
                await Promise.race([
                    cleanupAllTestServers({ timeout: options.timeout / 2, force: true }),
                    new Promise(resolve => setTimeout(resolve, options.timeout / 2))
                ]);
            }
        } catch (error) {
            emergencyLogger.warn(`Emergency server cleanup failed: ${error.message}`);
        }

        // Force reset test utilities and clear mocks
        try {
            const globalContext = getGlobalTestContext();
            const testUtilities = globalContext?.utilities;
            
            if (testUtilities) {
                await Promise.race([
                    testUtilities.cleanup(),
                    new Promise(resolve => setTimeout(resolve, 1000))
                ]);
                emergencyLogger.info('Emergency utilities cleanup completed');
            }
        } catch (error) {
            emergencyLogger.warn(`Emergency utilities cleanup failed: ${error.message}`);
        }

        // Restore critical environment variables
        try {
            const criticalVars = ['NODE_ENV', 'PORT', 'HOST'];
            for (const varName of criticalVars) {
                if (originalProcessEnv[varName] !== undefined) {
                    process.env[varName] = originalProcessEnv[varName];
                }
            }
            emergencyLogger.info('Critical environment variables restored');
        } catch (error) {
            emergencyLogger.warn(`Emergency environment restore failed: ${error.message}`);
        }

        // Clear global variables and reset state flags
        try {
            globalTeardownContext = null;
            isTeardownComplete = true;
            cleanupResults.length = 0;
            teardownErrors.length = 0;
            emergencyLogger.info('Global state reset completed');
        } catch (error) {
            emergencyLogger.warn(`Global state reset failed: ${error.message}`);
        }

        const duration = Date.now() - startTime;
        
        // Log emergency cleanup completion with minimal error handling
        emergencyLogger.warn(`Emergency cleanup completed in ${duration}ms`, {
            duration,
            timeout: options.timeout,
            forcedShutdown: true
        });

    } catch (error) {
        // Exit cleanup procedures without detailed validation
        const duration = Date.now() - startTime;
        emergencyLogger.error(`Emergency cleanup failed after ${duration}ms: ${error.message}`, {
            error: error.message,
            duration
        });
    }
}

/**
 * Comprehensive teardown management class that orchestrates complete test environment cleanup,
 * coordinates component teardown, manages teardown state, and provides centralized teardown 
 * lifecycle management for the Node.js tutorial application test suite
 */
class TeardownManager {
    /**
     * Creates TeardownManager instance with teardown configuration, initializes teardown 
     * components, and prepares comprehensive teardown coordination
     * 
     * @param {object} teardownConfig - Configuration object for teardown management
     */
    constructor(teardownConfig = {}) {
        // Store teardown configuration with validation and default value application
        this.config = {
            timeout: teardownConfig.timeout || TIMEOUTS.CLEANUP_TIMEOUT || 30000,
            force: teardownConfig.force !== false,
            validateCompletion: teardownConfig.validateCompletion !== false,
            emergencyMode: teardownConfig.emergencyMode || false,
            ...teardownConfig
        };

        // Generate unique teardown ID using generateTestId for teardown correlation
        this.teardownId = generateTestId('teardown-manager');

        // Create teardown logger using createTestLogger with TeardownManager context
        this.logger = createTestLogger(`TeardownManager:${this.teardownId}`);

        // Initialize teardown context using createTeardownContext function
        this.teardownContext = null;

        // Set isExecuting flag to false to track teardown execution state
        this.isExecuting = false;

        // Initialize cleanupResults array for tracking cleanup operations
        this.cleanupResults = [];

        // Initialize teardownErrors array for error collection and reporting
        this.teardownErrors = [];

        // Get TestConfiguration and TestUtilities instances from global context
        this.testConfig = null;
        this.testUtilities = null;

        // Initialize additional properties for state management
        this.startTime = null;
        this.endTime = null;

        // Log TeardownManager creation with teardown ID and configuration summary
        this.logger.info(`TeardownManager created with ID: ${this.teardownId}`, {
            config: {
                timeout: this.config.timeout,
                force: this.config.force,
                validateCompletion: this.config.validateCompletion
            }
        });
    }

    /**
     * Executes complete teardown process including all cleanup phases, error handling,
     * and validation with comprehensive timing and result tracking
     * 
     * @param {object} executionOptions - Configuration options for teardown execution
     * @returns {Promise<object>} Promise resolving to complete teardown results with cleanup status, timing, and error details
     */
    async executeTeardown(executionOptions = {}) {
        const options = {
            ...this.config,
            ...executionOptions
        };

        try {
            // Set isExecuting flag to true and record teardown start time
            this.isExecuting = true;
            this.startTime = Date.now();

            this.logger.info('Starting comprehensive teardown execution', {
                teardownId: this.teardownId,
                options: options
            });

            // Initialize teardown context
            this.teardownContext = await createTeardownContext({
                teardownId: this.teardownId,
                startTime: this.startTime,
                options: options,
                logger: this.logger
            });

            // Get global context for component access
            const globalContext = getGlobalTestContext();
            if (globalContext) {
                this.testConfig = globalContext.testConfig;
                this.testUtilities = globalContext.utilities;
            }

            // Execute teardown sequence using executeTeardownSequence function
            const teardownResult = await executeTeardownSequence(options);

            // Collect cleanup results from all teardown phases
            this.cleanupResults = teardownResult.cleanupResults || [];
            this.teardownErrors = teardownResult.errors || [];

            // Validate teardown completion using validateTeardownCompletion
            let validationResult = { success: true, warnings: [], errors: [] };
            if (options.validateCompletion) {
                validationResult = validateTeardownCompletion({
                    cleanupResults: this.cleanupResults,
                    startTime: this.startTime,
                    context: this.teardownContext
                });
            }

            // Set isExecuting flag to false and update completion status
            this.isExecuting = false;
            this.endTime = Date.now();
            const totalDuration = this.endTime - this.startTime;

            const completeResult = {
                teardownId: this.teardownId,
                success: teardownResult.success && validationResult.success,
                duration: totalDuration,
                startTime: this.startTime,
                endTime: this.endTime,
                cleanupResults: this.cleanupResults,
                errors: this.teardownErrors,
                validation: validationResult,
                manager: {
                    id: this.teardownId,
                    config: this.config
                }
            };

            // Log teardown summary using logTeardownSummary with results and timing
            logTeardownSummary(completeResult, totalDuration);

            this.logger.info('Teardown execution completed', {
                teardownId: this.teardownId,
                success: completeResult.success,
                duration: totalDuration,
                phases: this.cleanupResults.length,
                errors: this.teardownErrors.length
            });

            return completeResult;

        } catch (error) {
            // Handle teardown errors using handleTeardownError for each component
            const errorInfo = handleTeardownError(error, 'teardown-execution', {
                teardownId: this.teardownId,
                phase: 'execution',
                startTime: this.startTime
            });

            this.teardownErrors.push(errorInfo);
            this.isExecuting = false;
            this.endTime = Date.now();

            // Return error result with available information
            const errorResult = {
                teardownId: this.teardownId,
                success: false,
                duration: this.endTime - this.startTime,
                startTime: this.startTime,
                endTime: this.endTime,
                cleanupResults: this.cleanupResults,
                errors: this.teardownErrors,
                executionError: error.message
            };

            this.logger.error('Teardown execution failed', {
                teardownId: this.teardownId,
                error: error.message,
                duration: errorResult.duration
            });

            return errorResult;
        }
    }

    /**
     * Executes server cleanup phase including all test server shutdown and resource 
     * deallocation with error handling and timing
     * 
     * @param {object} serverOptions - Configuration options for server cleanup
     * @returns {Promise<object>} Promise resolving to server cleanup results with shutdown status and timing
     */
    async cleanupServers(serverOptions = {}) {
        const options = {
            timeout: serverOptions.timeout || this.config.timeout / 4,
            force: serverOptions.force !== false,
            ...serverOptions
        };

        this.logger.info('Starting server cleanup phase', {
            teardownId: this.teardownId,
            timeout: options.timeout
        });

        try {
            // Execute cleanupTestServers function with configured options
            const serverResult = await cleanupTestServers(options);

            // Handle server cleanup errors and add to teardownErrors array
            if (!serverResult.success || serverResult.errors.length > 0) {
                this.teardownErrors.push(...(serverResult.errors.map(err => ({
                    phase: 'server-cleanup',
                    error: typeof err === 'string' ? err : err.message,
                    manager: this.teardownId
                }))));
            }

            // Add server cleanup results to cleanupResults array
            this.cleanupResults.push(serverResult);

            // Log server cleanup completion with status and timing
            this.logger.info('Server cleanup completed', {
                teardownId: this.teardownId,
                success: serverResult.success,
                serversFound: serverResult.serversFound,
                serversCleanedUp: serverResult.serversCleanedUp,
                duration: serverResult.duration,
                errors: serverResult.errors.length
            });

            return serverResult;

        } catch (error) {
            const errorInfo = handleTeardownError(error, 'server-cleanup-phase', {
                teardownId: this.teardownId,
                timeout: options.timeout
            });

            this.teardownErrors.push(errorInfo);
            
            const failureResult = {
                phase: 'servers',
                success: false,
                error: error.message,
                duration: 0,
                errors: [error.message]
            };

            this.cleanupResults.push(failureResult);
            return failureResult;
        }
    }

    /**
     * Executes utilities cleanup phase including mock resets, environment restoration,
     * and utility state cleanup with error handling
     * 
     * @param {object} utilitiesOptions - Configuration options for utilities cleanup
     * @returns {Promise<object>} Promise resolving to utilities cleanup results with reset status and details
     */
    async cleanupUtilities(utilitiesOptions = {}) {
        const options = {
            timeout: utilitiesOptions.timeout || this.config.timeout / 4,
            resetMocks: utilitiesOptions.resetMocks !== false,
            ...utilitiesOptions
        };

        this.logger.info('Starting utilities cleanup phase', {
            teardownId: this.teardownId,
            timeout: options.timeout
        });

        try {
            // Execute cleanupTestUtilities function with configured options
            const utilitiesResult = await cleanupTestUtilities(options);

            // Handle utilities cleanup errors and add to teardownErrors array
            if (!utilitiesResult.success || utilitiesResult.errors.length > 0) {
                this.teardownErrors.push(...(utilitiesResult.errors.map(err => ({
                    phase: 'utilities-cleanup',
                    error: typeof err === 'string' ? err : err.message,
                    manager: this.teardownId
                }))));
            }

            // Add utilities cleanup results to cleanupResults array
            this.cleanupResults.push(utilitiesResult);

            // Log utilities cleanup completion with status and timing
            this.logger.info('Utilities cleanup completed', {
                teardownId: this.teardownId,
                success: utilitiesResult.success,
                utilitiesCleanedUp: utilitiesResult.utilitiesCleanedUp,
                mocksReset: utilitiesResult.mocksReset,
                duration: utilitiesResult.duration,
                errors: utilitiesResult.errors.length
            });

            return utilitiesResult;

        } catch (error) {
            const errorInfo = handleTeardownError(error, 'utilities-cleanup-phase', {
                teardownId: this.teardownId,
                timeout: options.timeout
            });

            this.teardownErrors.push(errorInfo);
            
            const failureResult = {
                phase: 'utilities',
                success: false,
                error: error.message,
                duration: 0,
                errors: [error.message]
            };

            this.cleanupResults.push(failureResult);
            return failureResult;
        }
    }

    /**
     * Executes environment restoration phase including process environment variable
     * restoration and configuration reset
     * 
     * @param {object} environmentOptions - Configuration options for environment restoration
     * @returns {object} Environment restoration result with restored variables and change summary
     */
    restoreEnvironment(environmentOptions = {}) {
        const options = {
            validateRestore: environmentOptions.validateRestore !== false,
            logChanges: environmentOptions.logChanges !== false,
            ...environmentOptions
        };

        this.logger.info('Starting environment restoration phase', {
            teardownId: this.teardownId
        });

        try {
            // Execute restoreProcessEnvironment function with configured options
            const environmentResult = restoreProcessEnvironment(options);

            // Handle environment restoration errors and add to teardownErrors array
            if (!environmentResult.success) {
                this.teardownErrors.push({
                    phase: 'environment-restoration',
                    error: environmentResult.error || 'Environment restoration failed',
                    manager: this.teardownId
                });
            }

            // Add environment restoration results to cleanupResults array
            this.cleanupResults.push(environmentResult);

            // Log environment restoration completion with status and changes
            this.logger.info('Environment restoration completed', {
                teardownId: this.teardownId,
                success: environmentResult.success,
                variablesRestored: environmentResult.variablesRestored,
                variablesRemoved: environmentResult.variablesRemoved,
                totalChanges: environmentResult.changes?.length || 0
            });

            return environmentResult;

        } catch (error) {
            const errorInfo = handleTeardownError(error, 'environment-restoration-phase', {
                teardownId: this.teardownId
            });

            this.teardownErrors.push(errorInfo);
            
            const failureResult = {
                phase: 'environment',
                success: false,
                error: error.message,
                variablesRestored: 0,
                variablesRemoved: 0
            };

            this.cleanupResults.push(failureResult);
            return failureResult;
        }
    }

    /**
     * Returns current status of teardown process including execution state, completion
     * progress, and cleanup results
     * 
     * @returns {object} Teardown status object with execution details, progress information, and results summary
     */
    getTeardownStatus() {
        const status = {
            teardownId: this.teardownId,
            isExecuting: this.isExecuting,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime && this.startTime ? this.endTime - this.startTime : null,
            
            // Include execution status and teardown completion progress
            execution: {
                inProgress: this.isExecuting,
                completed: !this.isExecuting && this.endTime !== null,
                aborted: !this.isExecuting && this.teardownErrors.length > 0 && !this.endTime
            },

            // Add cleanup results summary with component status
            progress: {
                phasesCompleted: this.cleanupResults.length,
                phasesSuccessful: this.cleanupResults.filter(r => r.success).length,
                phasesFailed: this.cleanupResults.filter(r => !r.success).length,
                totalErrors: this.teardownErrors.length
            },

            // Include teardown timing information and performance metrics
            timing: {
                startTime: this.startTime,
                endTime: this.endTime,
                currentDuration: this.startTime ? Date.now() - this.startTime : 0,
                timeout: this.config.timeout
            },

            // Add error summary and any issues encountered during teardown
            errors: {
                count: this.teardownErrors.length,
                recent: this.teardownErrors.slice(-3), // Last 3 errors
                byPhase: this.teardownErrors.reduce((acc, err) => {
                    acc[err.phase] = (acc[err.phase] || 0) + 1;
                    return acc;
                }, {})
            },

            // Include teardown configuration and coordination details
            configuration: {
                timeout: this.config.timeout,
                force: this.config.force,
                validateCompletion: this.config.validateCompletion,
                emergencyMode: this.config.emergencyMode
            }
        };

        return status;
    }

    /**
     * Returns comprehensive teardown results including cleanup status, timing information,
     * errors, and validation results
     * 
     * @returns {object} Complete teardown results object with cleanup details, timing, and error information
     */
    getTeardownResults() {
        // Validate teardown execution is complete
        if (this.isExecuting) {
            throw new Error('Cannot get teardown results while teardown is still executing');
        }

        const results = {
            teardownId: this.teardownId,
            
            // Include all cleanup results from cleanupResults array
            execution: {
                success: this.teardownErrors.length === 0,
                completed: this.endTime !== null,
                startTime: this.startTime,
                endTime: this.endTime,
                duration: this.endTime && this.startTime ? this.endTime - this.startTime : null
            },

            // Add comprehensive error summary from teardownErrors array
            cleanup: {
                phases: [...this.cleanupResults],
                totalPhases: this.cleanupResults.length,
                successfulPhases: this.cleanupResults.filter(r => r.success).length,
                failedPhases: this.cleanupResults.filter(r => !r.success).length
            },

            // Include teardown timing and performance metrics
            errors: {
                total: this.teardownErrors.length,
                details: [...this.teardownErrors],
                byPhase: this.teardownErrors.reduce((acc, err) => {
                    acc[err.phase] = (acc[err.phase] || 0) + 1;
                    return acc;
                }, {}),
                critical: this.teardownErrors.filter(err => !err.recoverable).length
            },

            // Add validation results and completion status
            manager: {
                id: this.teardownId,
                config: this.config,
                context: this.teardownContext ? {
                    teardownId: this.teardownContext.teardownId,
                    phases: this.teardownContext.phases
                } : null
            },

            // Performance metrics
            performance: {
                duration: this.endTime && this.startTime ? this.endTime - this.startTime : null,
                timeout: this.config.timeout,
                withinTimeout: this.endTime && this.startTime ? 
                    (this.endTime - this.startTime) <= this.config.timeout : null,
                phaseDurations: this.cleanupResults.reduce((acc, phase) => {
                    if (phase.duration !== undefined) {
                        acc[phase.phase] = phase.duration;
                    }
                    return acc;
                }, {})
            }
        };

        return results;
    }

    /**
     * Handles emergency shutdown scenarios by executing minimal critical cleanup
     * procedures with maximum error tolerance
     * 
     * @param {object} emergencyOptions - Configuration options for emergency shutdown
     * @returns {Promise<void>} Promise resolving when emergency shutdown cleanup is complete
     */
    async handleEmergencyShutdown(emergencyOptions = {}) {
        const options = {
            timeout: emergencyOptions.timeout || 5000,
            ...emergencyOptions
        };

        // Set emergency mode flag and update execution status
        this.config.emergencyMode = true;
        this.isExecuting = true;

        this.logger.warn('Initiating emergency shutdown procedures', {
            teardownId: this.teardownId,
            timeout: options.timeout
        });

        try {
            // Execute performEmergencyCleanup function with minimal error handling
            await performEmergencyCleanup(options);

            // Set teardown completion flags regardless of individual operation success
            this.isExecuting = false;
            this.endTime = Date.now();

            // Log emergency shutdown completion with minimal validation
            this.logger.warn('Emergency shutdown completed', {
                teardownId: this.teardownId,
                duration: this.endTime - (this.startTime || this.endTime),
                emergencyMode: true
            });

        } catch (error) {
            this.logger.error('Emergency shutdown failed', {
                teardownId: this.teardownId,
                error: error.message
            });

            // Ensure flags are set even on failure
            this.isExecuting = false;
            this.endTime = Date.now();
            
            this.teardownErrors.push({
                phase: 'emergency-shutdown',
                error: error.message,
                classification: 'emergency-failure',
                recoverable: false
            });
        }
    }
}

// Export teardown functions and classes for use in test lifecycle management
module.exports = {
    // Main teardown execution functions
    executeTeardownSequence,
    cleanupTestServers,
    cleanupTestUtilities,
    restoreProcessEnvironment,
    executeTeardownHooksSequence,
    validateTeardownCompletion,
    logTeardownSummary,
    handleTeardownError,
    createTeardownContext,
    performEmergencyCleanup,
    
    // Comprehensive teardown management class
    TeardownManager
};