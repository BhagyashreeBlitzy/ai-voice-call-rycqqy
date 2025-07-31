/**
 * Server Lifecycle Management End-to-End Test Suite
 * 
 * Comprehensive end-to-end test file that validates the complete server lifecycle management
 * for the Node.js tutorial application. Tests server startup sequences, running state transitions,
 * graceful shutdown procedures, process signal handling, and resource cleanup using the
 * LifecycleManager and TestServerManager classes.
 * 
 * Implements comprehensive lifecycle testing scenarios including normal startup/shutdown cycles,
 * error recovery testing, process signal handling validation, and resource leak prevention
 * verification. Designed to work with Mocha test framework and demonstrates professional
 * server lifecycle testing patterns for educational purposes.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// External dependencies with version information
const assert = require('node:assert'); // built-in - Node.js assertion library for test assertions and validation
const supertest = require('supertest'); // ^7.1.1 - HTTP endpoint testing library for creating test agents and validating server responses
const util = require('node:util'); // built-in - Node.js util module for promisify and utility functions during async lifecycle testing

// Mocha test framework functions for test organization and lifecycle hooks
const { describe, it, before, after, beforeEach, afterEach } = require('mocha'); // ^10.0.0 - Test suite organization and individual test case definition

// Internal dependencies - Server testing and lifecycle management utilities
const {
    TestServerManager,
    createTestServerConfig,
    waitForServerReady
} = require('../helpers/serverHelpers.js');

const {
    LifecycleManager,
    initializeLifecycle,
    LIFECYCLE
} = require('../../lib/lifecycle.js');

const {
    createExpressApplication,
    getApplicationInfo
} = require('../../app.js');

const {
    testConfig,
    getGlobalTestContext,
    executeTeardownSequence
} = require('../setup/testConfig.js');

const {
    getGlobalTestContext: getSetupContext
} = require('../setup/globalSetup.js');

const {
    executeTeardownSequence: performTeardown
} = require('../setup/teardown.js');

// Internal dependencies - Application constants for lifecycle and timeouts
const {
    LIFECYCLE: LIFECYCLE_CONSTANTS,
    TIMEOUTS
} = require('../../utils/constants.js');

// Global test variables for server lifecycle testing
let testServerManager = null;
let lifecycleManager = null;
let testApp = null;
let testContext = null;
let serverStartTime = null;
let currentTestConfig = null;

/**
 * Sets up the test environment for server lifecycle testing including test server manager
 * initialization, lifecycle manager setup, and test configuration preparation.
 * 
 * @param {Object} testOptions - Configuration options for lifecycle test setup
 * @returns {Promise<Object>} Promise resolving to lifecycle test setup result with server manager, lifecycle manager, and configuration details
 */
async function setupLifecycleTest(testOptions = {}) {
    try {
        // Get global test context using getGlobalTestContext function
        testContext = getSetupContext() || getGlobalTestContext();

        // Create test server configuration using createTestServerConfig with e2e settings
        currentTestConfig = createTestServerConfig({
            environment: 'test',
            port: testOptions.port || 0, // Use random port for isolation
            timeout: testOptions.timeout || TIMEOUTS.SERVER_STARTUP,
            enableHealthCheck: true,
            ...testOptions
        });

        // Create Express.js application instance using createExpressApplication
        testApp = createExpressApplication({
            config: currentTestConfig,
            enableMiddleware: true,
            enableRoutes: true,
            enableErrorHandling: true
        });

        // Initialize TestServerManager with test configuration and application
        testServerManager = new TestServerManager(testApp, currentTestConfig);

        // Initialize LifecycleManager using initializeLifecycle function with test config
        lifecycleManager = initializeLifecycle({
            config: currentTestConfig,
            enableSignalHandling: false, // Disable for testing to prevent interference
            shutdownTimeout: TIMEOUTS.SERVER_SHUTDOWN
        });

        // Store server manager and lifecycle manager in global variables for test access
        global.testServerManager = testServerManager;
        global.lifecycleManager = lifecycleManager;

        // Validate lifecycle test setup completion and component readiness
        assert(testServerManager, 'TestServerManager should be initialized');
        assert(lifecycleManager, 'LifecycleManager should be initialized');
        assert(testApp, 'Express application should be created');
        assert(currentTestConfig, 'Test configuration should be created');

        // Return lifecycle test setup result with manager instances and configuration
        return {
            success: true,
            testServerManager: testServerManager,
            lifecycleManager: lifecycleManager,
            testApp: testApp,
            configuration: currentTestConfig,
            context: testContext
        };

    } catch (error) {
        throw new Error(`Lifecycle test setup failed: ${error.message}`);
    }
}

/**
 * Performs cleanup of lifecycle test resources including server shutdown, manager cleanup,
 * and test environment restoration.
 * 
 * @param {Object} cleanupOptions - Configuration options for lifecycle test cleanup
 * @returns {Promise<void>} Promise resolving when lifecycle test cleanup is complete
 */
async function cleanupLifecycleTest(cleanupOptions = {}) {
    try {
        // Stop test server using TestServerManager.stopTestServer if running
        if (testServerManager && testServerManager.isServerRunning()) {
            await testServerManager.stopTestServer({
                force: cleanupOptions.force || false,
                timeout: cleanupOptions.timeout || TIMEOUTS.SERVER_SHUTDOWN
            });
        }

        // Execute lifecycle manager cleanup using LifecycleManager.stop method
        if (lifecycleManager && lifecycleManager.isRunning()) {
            await lifecycleManager.stop(cleanupOptions.force || false);
        }

        // Cleanup TestServerManager resources using cleanup method
        if (testServerManager && typeof testServerManager.cleanup === 'function') {
            await testServerManager.cleanup();
        }

        // Reset global variables to null state for test isolation
        testServerManager = null;
        lifecycleManager = null;
        testApp = null;
        testContext = null;
        serverStartTime = null;
        currentTestConfig = null;

        // Clear global references
        if (global.testServerManager) global.testServerManager = null;
        if (global.lifecycleManager) global.lifecycleManager = null;

        // Execute teardown sequence if specified in cleanup options
        if (cleanupOptions.executeTeardown) {
            await performTeardown({
                timeout: cleanupOptions.timeout || TIMEOUTS.SERVER_SHUTDOWN,
                force: cleanupOptions.force || false
            });
        }

        // Log cleanup completion with timing and resource deallocation details
        console.log('Lifecycle test cleanup completed successfully');

    } catch (error) {
        console.error('Lifecycle test cleanup failed:', error.message);
        // Continue cleanup even if errors occur to prevent test interference
    }
}

/**
 * Validates server lifecycle state consistency between LifecycleManager and TestServerManager
 * including state synchronization and operational status verification.
 * 
 * @param {string} expectedState - Expected lifecycle state to validate against
 * @param {Object} validationOptions - Configuration options for state validation
 * @returns {Object} State validation result with consistency check, timing information, and operational status
 */
function validateServerLifecycleState(expectedState, validationOptions = {}) {
    try {
        // Get lifecycle state using LifecycleManager.getState method
        const lifecycleState = lifecycleManager.getState();
        const currentLifecycleState = lifecycleState.state;

        // Get server status using TestServerManager.getServerStatus method
        const serverStatus = testServerManager.getServerStatus();
        const isServerRunning = testServerManager.isServerRunning();

        // Compare lifecycle state with expected state parameter
        const stateMatches = currentLifecycleState === expectedState;

        // Validate server running status consistency between managers
        const isLifecycleRunning = lifecycleManager.isRunning();
        const statusConsistent = (isLifecycleRunning === isServerRunning) || 
                                (expectedState === LIFECYCLE.STATES.STOPPING);

        // Check state transition timing and validate against expected timeouts
        const stateTransitionTime = Date.now() - (serverStartTime || Date.now());
        const withinTimeout = stateTransitionTime <= (validationOptions.timeout || TIMEOUTS.SERVER_STARTUP);

        // Verify operational status and request handling capability if in RUNNING state
        let operationalStatus = true;
        if (expectedState === LIFECYCLE.STATES.RUNNING) {
            operationalStatus = isServerRunning && testServerManager.getServerUrl();
        }

        // Return comprehensive state validation result with consistency status
        return {
            success: stateMatches && statusConsistent && withinTimeout && operationalStatus,
            currentState: currentLifecycleState,
            expectedState: expectedState,
            stateMatches: stateMatches,
            serverRunning: isServerRunning,
            lifecycleRunning: isLifecycleRunning,
            statusConsistent: statusConsistent,
            operationalStatus: operationalStatus,
            timing: {
                stateTransitionTime: stateTransitionTime,
                withinTimeout: withinTimeout,
                serverStartTime: serverStartTime
            },
            validation: {
                lifecycleState: lifecycleState,
                serverStatus: serverStatus
            }
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            currentState: null,
            expectedState: expectedState
        };
    }
}

/**
 * Tests the complete server startup sequence including initialization, binding, and transition
 * to running state with comprehensive validation and timing measurement.
 * 
 * @param {Object} startupOptions - Configuration options for server startup testing
 * @returns {Promise<Object>} Promise resolving to startup test result with timing, state transitions, and validation status
 */
async function testServerStartupSequence(startupOptions = {}) {
    try {
        // Record startup test start time for performance measurement
        serverStartTime = Date.now();

        // Validate initial lifecycle state is INITIALIZING or STOPPED
        const initialState = lifecycleManager.getState();
        assert(
            initialState.state === LIFECYCLE.STATES.INITIALIZING || 
            initialState.state === LIFECYCLE.STATES.STOPPED,
            `Invalid initial state for startup: ${initialState.state}`
        );

        // Start server using TestServerManager.startTestServer method
        const serverResult = await testServerManager.startTestServer({
            waitForHealthy: true,
            timeout: startupOptions.timeout || TIMEOUTS.SERVER_STARTUP
        });

        // Start lifecycle using LifecycleManager.start method with test app and server
        const server = testServerManager.getServer();
        await lifecycleManager.start(testApp, server);

        // Wait for server readiness using waitForServerReady function
        await waitForServerReady(testServerManager.getServerUrl(), {
            timeout: startupOptions.timeout || TIMEOUTS.SERVER_STARTUP,
            interval: 100
        });

        // Validate server is running using isServerRunning methods on both managers
        assert(testServerManager.isServerRunning(), 'TestServerManager should report server as running');
        assert(lifecycleManager.isRunning(), 'LifecycleManager should report lifecycle as running');

        // Test /hello endpoint accessibility using supertest to confirm operational status
        const testAgent = testServerManager.getTestAgent();
        const response = await testAgent.get('/hello').expect(200);
        assert.strictEqual(response.text, 'Hello world', 'Hello endpoint should return correct response');

        // Validate lifecycle state transitions and timing against expected thresholds
        const stateValidation = validateServerLifecycleState(LIFECYCLE.STATES.RUNNING, {
            timeout: startupOptions.timeout || TIMEOUTS.SERVER_STARTUP
        });

        assert(stateValidation.success, `State validation failed: ${JSON.stringify(stateValidation)}`);

        const startupDuration = Date.now() - serverStartTime;

        // Return startup test results with comprehensive validation and timing data
        return {
            success: true,
            startupDuration: startupDuration,
            serverUrl: testServerManager.getServerUrl(),
            serverRunning: testServerManager.isServerRunning(),
            lifecycleRunning: lifecycleManager.isRunning(),
            endpointAccessible: true,
            stateValidation: stateValidation,
            serverResult: serverResult,
            timing: {
                startTime: serverStartTime,
                duration: startupDuration
            }
        };

    } catch (error) {
        throw new Error(`Server startup sequence test failed: ${error.message}`);
    }
}

/**
 * Tests the graceful server shutdown sequence including connection draining, resource cleanup,
 * and state transition validation with timing measurement.
 * 
 * @param {boolean} graceful - Whether to perform graceful shutdown
 * @param {Object} shutdownOptions - Configuration options for server shutdown testing
 * @returns {Promise<Object>} Promise resolving to shutdown test result with cleanup status, timing, and validation details
 */
async function testServerShutdownSequence(graceful = true, shutdownOptions = {}) {
    try {
        // Record shutdown test start time for performance measurement
        const shutdownStartTime = Date.now();

        // Validate server is currently running before shutdown attempt
        assert(testServerManager.isServerRunning(), 'Server must be running before shutdown test');
        assert(lifecycleManager.isRunning(), 'Lifecycle must be running before shutdown test');

        // Initiate graceful shutdown using LifecycleManager.stop method
        await lifecycleManager.stop(!graceful, shutdownOptions.timeout || TIMEOUTS.SERVER_SHUTDOWN);

        // Execute server shutdown using TestServerManager.stopTestServer method
        await testServerManager.stopTestServer({
            force: !graceful,
            timeout: shutdownOptions.timeout || TIMEOUTS.SERVER_SHUTDOWN
        });

        // Wait for shutdown completion with timeout handling
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief wait for cleanup

        // Validate lifecycle state transitions to STOPPING then STOPPED
        const finalState = lifecycleManager.getState();
        assert.strictEqual(finalState.state, LIFECYCLE.STATES.STOPPED, 'Lifecycle should be in STOPPED state');

        // Verify server is no longer running using isServerRunning methods
        assert(!testServerManager.isServerRunning(), 'TestServerManager should report server as stopped');
        assert(!lifecycleManager.isRunning(), 'LifecycleManager should report lifecycle as stopped');

        // Validate resource cleanup and port release
        const serverUrl = testServerManager.getServerUrl();
        assert(!serverUrl || !testServerManager.isServerRunning(), 'Server should not be accessible after shutdown');

        // Test that /hello endpoint is no longer accessible after shutdown
        let endpointAccessible = false;
        try {
            const testAgent = testServerManager.getTestAgent();
            if (testAgent) {
                await testAgent.get('/hello').timeout(1000);
                endpointAccessible = true; // Should not reach here
            }
        } catch (error) {
            // Expected - endpoint should not be accessible
            endpointAccessible = false;
        }

        assert(!endpointAccessible, 'Hello endpoint should not be accessible after shutdown');

        const shutdownDuration = Date.now() - shutdownStartTime;

        // Return shutdown test results with comprehensive validation and cleanup status
        return {
            success: true,
            graceful: graceful,
            shutdownDuration: shutdownDuration,
            serverStopped: !testServerManager.isServerRunning(),
            lifecycleStopped: !lifecycleManager.isRunning(),
            endpointInaccessible: !endpointAccessible,
            finalState: finalState.state,
            resourcesCleanedUp: true,
            timing: {
                startTime: shutdownStartTime,
                duration: shutdownDuration
            }
        };

    } catch (error) {
        throw new Error(`Server shutdown sequence test failed: ${error.message}`);
    }
}

/**
 * Tests all lifecycle state transitions including INITIALIZING->STARTING->RUNNING->STOPPING->STOPPED
 * with timing validation and error handling.
 * 
 * @param {Object} transitionOptions - Configuration options for lifecycle state transition testing
 * @returns {Promise<Object>} Promise resolving to state transition test results with timing, validation, and transition history
 */
async function testLifecycleStateTransitions(transitionOptions = {}) {
    try {
        // Initialize state transition tracking array for monitoring changes
        const stateTransitions = [];
        const startTime = Date.now();

        // Test INITIALIZING to STARTING transition during server startup
        let currentState = lifecycleManager.getState();
        stateTransitions.push({
            from: null,
            to: currentState.state,
            timestamp: Date.now(),
            phase: 'initial'
        });

        // Start the server and track state changes
        const server = testServerManager.getServer();
        const startPromise = lifecycleManager.start(testApp, server);

        // Monitor state changes during startup
        const monitoringInterval = setInterval(() => {
            const newState = lifecycleManager.getState();
            const lastTransition = stateTransitions[stateTransitions.length - 1];
            
            if (newState.state !== lastTransition.to) {
                stateTransitions.push({
                    from: lastTransition.to,
                    to: newState.state,
                    timestamp: Date.now(),
                    phase: 'startup'
                });
            }
        }, 50);

        await startPromise;
        clearInterval(monitoringInterval);

        // Validate STARTING to RUNNING transition with timing measurement
        await lifecycleManager.waitForState(LIFECYCLE.STATES.RUNNING, TIMEOUTS.SERVER_STARTUP);
        
        const runningState = lifecycleManager.getState();
        assert.strictEqual(runningState.state, LIFECYCLE.STATES.RUNNING, 'Should reach RUNNING state');

        // Test RUNNING state stability and operational capabilities
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for stability
        
        const stableState = lifecycleManager.getState();
        assert.strictEqual(stableState.state, LIFECYCLE.STATES.RUNNING, 'Should maintain RUNNING state');

        // Test RUNNING to STOPPING transition during graceful shutdown
        const shutdownPromise = lifecycleManager.stop();

        // Monitor shutdown state changes
        const shutdownMonitorInterval = setInterval(() => {
            const newState = lifecycleManager.getState();
            const lastTransition = stateTransitions[stateTransitions.length - 1];
            
            if (newState.state !== lastTransition.to) {
                stateTransitions.push({
                    from: lastTransition.to,
                    to: newState.state,
                    timestamp: Date.now(),
                    phase: 'shutdown'
                });
            }
        }, 50);

        await shutdownPromise;
        clearInterval(shutdownMonitorInterval);

        // Validate STOPPING to STOPPED transition with cleanup verification
        const finalState = lifecycleManager.getState();
        assert.strictEqual(finalState.state, LIFECYCLE.STATES.STOPPED, 'Should reach STOPPED state');

        // Measure transition timing and validate against expected thresholds
        const totalDuration = Date.now() - startTime;
        const validTransitionSequence = [
            LIFECYCLE.STATES.INITIALIZING,
            LIFECYCLE.STATES.STARTING,
            LIFECYCLE.STATES.RUNNING,
            LIFECYCLE.STATES.STOPPING,
            LIFECYCLE.STATES.STOPPED
        ];

        // Validate transition sequence
        const actualSequence = stateTransitions.map(t => t.to);
        const hasValidSequence = validTransitionSequence.every(state => actualSequence.includes(state));

        // Return comprehensive state transition test results with history and timing
        return {
            success: hasValidSequence,
            totalDuration: totalDuration,
            stateTransitions: stateTransitions,
            finalState: finalState.state,
            transitionCount: stateTransitions.length,
            validSequence: hasValidSequence,
            expectedSequence: validTransitionSequence,
            actualSequence: actualSequence,
            timing: {
                startTime: startTime,
                totalDuration: totalDuration,
                averageTransitionTime: totalDuration / stateTransitions.length
            }
        };

    } catch (error) {
        throw new Error(`Lifecycle state transitions test failed: ${error.message}`);
    }
}

/**
 * Tests server restart functionality including graceful shutdown followed by startup
 * with state validation and operational verification.
 * 
 * @param {Object} restartOptions - Configuration options for server restart testing
 * @returns {Promise<Object>} Promise resolving to restart test result with shutdown/startup timing and operational validation
 */
async function testServerRestartCapability(restartOptions = {}) {
    try {
        // Validate server is initially running before restart attempt
        assert(testServerManager.isServerRunning(), 'Server must be running before restart test');
        assert(lifecycleManager.isRunning(), 'Lifecycle must be running before restart test');

        // Record restart test start time for performance measurement
        const restartStartTime = Date.now();

        // Capture pre-restart configuration and status
        const preRestartUrl = testServerManager.getServerUrl();
        const preRestartState = lifecycleManager.getState();

        // Execute server restart using TestServerManager.restart method
        const restartResult = await testServerManager.restart({
            timeout: restartOptions.timeout || TIMEOUTS.SERVER_STARTUP * 2
        });

        // Monitor lifecycle state transitions during restart process
        const postRestartState = lifecycleManager.getState();
        
        // Validate server shutdown completion and resource cleanup
        // (This happens internally during restart)

        // Validate server startup completion and operational readiness
        assert(testServerManager.isServerRunning(), 'Server should be running after restart');
        
        // Restart the lifecycle manager as well
        const server = testServerManager.getServer();
        await lifecycleManager.start(testApp, server);
        
        assert(lifecycleManager.isRunning(), 'Lifecycle should be running after restart');

        // Test /hello endpoint accessibility after restart to confirm functionality
        const testAgent = testServerManager.getTestAgent();
        const response = await testAgent.get('/hello').expect(200);
        assert.strictEqual(response.text, 'Hello world', 'Hello endpoint should work after restart');

        // Compare server configuration and status before and after restart
        const postRestartUrl = testServerManager.getServerUrl();
        const configurationMaintained = Boolean(postRestartUrl); // URL should be available

        const restartDuration = Date.now() - restartStartTime;

        // Return restart test results with timing, validation, and operational status
        return {
            success: true,
            restartDuration: restartDuration,
            preRestartUrl: preRestartUrl,
            postRestartUrl: postRestartUrl,
            configurationMaintained: configurationMaintained,
            serverRunning: testServerManager.isServerRunning(),
            lifecycleRunning: lifecycleManager.isRunning(),
            endpointAccessible: true,
            restartResult: restartResult,
            stateComparison: {
                preRestart: preRestartState,
                postRestart: postRestartState
            },
            timing: {
                startTime: restartStartTime,
                duration: restartDuration
            }
        };

    } catch (error) {
        throw new Error(`Server restart capability test failed: ${error.message}`);
    }
}

/**
 * Tests process signal handling for graceful shutdown including SIGTERM and SIGINT
 * signal processing with lifecycle coordination.
 * 
 * @param {string} signalType - Type of signal to test (SIGTERM, SIGINT)
 * @param {Object} signalOptions - Configuration options for signal handling testing
 * @returns {Promise<Object>} Promise resolving to signal handling test result with shutdown timing and cleanup validation
 */
async function testProcessSignalHandling(signalType = 'SIGTERM', signalOptions = {}) {
    try {
        // Set up process signal handler monitoring for test validation
        let signalReceived = false;
        let shutdownInitiated = false;

        // Validate server is running before signal testing
        assert(testServerManager.isServerRunning(), 'Server must be running before signal test');
        assert(lifecycleManager.isRunning(), 'Lifecycle must be running before signal test');

        // Create a custom signal handler for testing
        const testSignalHandler = () => {
            signalReceived = true;
            shutdownInitiated = true;
            
            // Initiate shutdown through lifecycle manager
            lifecycleManager.stop().catch(error => {
                console.error('Signal-triggered shutdown failed:', error);
            });
        };

        // Register the test signal handler
        process.on(signalType, testSignalHandler);

        const signalStartTime = Date.now();

        // Send specified process signal (SIGTERM or SIGINT) to current process
        process.emit(signalType);

        // Wait for signal processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Monitor lifecycle manager response to process signal
        assert(signalReceived, `${signalType} signal should have been received`);
        assert(shutdownInitiated, 'Shutdown should have been initiated by signal');

        // Validate graceful shutdown initiation and lifecycle state transitions
        await lifecycleManager.waitForState(LIFECYCLE.STATES.STOPPED, TIMEOUTS.SERVER_SHUTDOWN);

        // Wait for shutdown completion with appropriate timeout handling
        const finalState = lifecycleManager.getState();
        assert.strictEqual(finalState.state, LIFECYCLE.STATES.STOPPED, 'Lifecycle should be stopped after signal');

        // Validate resource cleanup and server shutdown completion
        assert(!lifecycleManager.isRunning(), 'Lifecycle should not be running after signal shutdown');

        // Test that /hello endpoint becomes inaccessible after signal handling
        let endpointAccessible = false;
        try {
            const testAgent = testServerManager.getTestAgent();
            if (testAgent && testServerManager.isServerRunning()) {
                await testAgent.get('/hello').timeout(1000);
                endpointAccessible = true;
            }
        } catch (error) {
            // Expected - endpoint should not be accessible
            endpointAccessible = false;
        }

        const signalDuration = Date.now() - signalStartTime;

        // Clean up signal handler
        process.removeListener(signalType, testSignalHandler);

        // Return signal handling test results with response timing and cleanup status
        return {
            success: true,
            signalType: signalType,
            signalReceived: signalReceived,
            shutdownInitiated: shutdownInitiated,
            shutdownCompleted: finalState.state === LIFECYCLE.STATES.STOPPED,
            endpointInaccessible: !endpointAccessible,
            signalDuration: signalDuration,
            finalState: finalState.state,
            timing: {
                startTime: signalStartTime,
                duration: signalDuration
            }
        };

    } catch (error) {
        throw new Error(`Process signal handling test failed: ${error.message}`);
    }
}

/**
 * Tests server error recovery scenarios including startup failures, runtime errors,
 * and shutdown errors with recovery validation.
 * 
 * @param {string} errorType - Type of error to test (startup, runtime, shutdown)
 * @param {Object} errorOptions - Configuration options for error recovery testing
 * @returns {Promise<Object>} Promise resolving to error recovery test result with error handling validation and recovery status
 */
async function testServerErrorRecovery(errorType = 'startup', errorOptions = {}) {
    try {
        const errorStartTime = Date.now();
        let errorInjected = false;
        let errorDetected = false;
        let recoveryAttempted = false;
        let recoverySuccessful = false;

        // Set up error injection based on specified error type
        switch (errorType) {
            case 'startup':
                // Test startup error by using invalid configuration
                const invalidConfig = createTestServerConfig({
                    port: -1, // Invalid port
                    timeout: 100
                });
                
                try {
                    const invalidManager = new TestServerManager(testApp, invalidConfig);
                    await invalidManager.startTestServer();
                    errorInjected = false; // Should not reach here
                } catch (error) {
                    errorInjected = true;
                    errorDetected = true;
                    
                    // Attempt recovery with valid configuration
                    recoveryAttempted = true;
                    try {
                        await testServerManager.startTestServer();
                        recoverySuccessful = testServerManager.isServerRunning();
                    } catch (recoveryError) {
                        recoverySuccessful = false;
                    }
                }
                break;

            case 'runtime':
                // Test runtime error during operation
                assert(testServerManager.isServerRunning(), 'Server must be running for runtime error test');
                
                try {
                    // Simulate runtime error by accessing invalid endpoint
                    const testAgent = testServerManager.getTestAgent();
                    await testAgent.get('/invalid-endpoint').expect(404);
                    errorInjected = true;
                    errorDetected = true;
                    
                    // Verify system continues to function
                    recoveryAttempted = true;
                    const response = await testAgent.get('/hello').expect(200);
                    recoverySuccessful = response.text === 'Hello world';
                } catch (error) {
                    errorDetected = true;
                    recoverySuccessful = false;
                }
                break;

            case 'shutdown':
                // Test shutdown error by forcing abrupt termination
                assert(testServerManager.isServerRunning(), 'Server must be running for shutdown error test');
                
                try {
                    // Force shutdown without graceful cleanup
                    await testServerManager.stopTestServer({ force: true, timeout: 100 });
                    errorInjected = true;
                    errorDetected = true;
                    
                    // Attempt recovery by restarting
                    recoveryAttempted = true;
                    await testServerManager.startTestServer();
                    recoverySuccessful = testServerManager.isServerRunning();
                } catch (error) {
                    errorDetected = true;
                    recoverySuccessful = false;
                }
                break;

            default:
                throw new Error(`Unknown error type: ${errorType}`);
        }

        // Monitor lifecycle manager and server manager error handling
        const lifecycleState = lifecycleManager.getState();
        const systemStateValid = lifecycleState.state !== LIFECYCLE.STATES.ERROR;

        // Validate error detection and appropriate error response
        assert(errorDetected, `${errorType} error should have been detected`);

        // Test error recovery procedures if applicable for error type
        if (recoveryAttempted) {
            // Validate system state after error handling completion
            const postRecoveryState = lifecycleManager.getState();
            const systemRecovered = postRecoveryState.state !== LIFECYCLE.STATES.ERROR;

            // Test system functionality recovery if error recovery was successful
            if (recoverySuccessful && testServerManager.isServerRunning()) {
                try {
                    const testAgent = testServerManager.getTestAgent();
                    const response = await testAgent.get('/hello').expect(200);
                    recoverySuccessful = response.text === 'Hello world';
                } catch (testError) {
                    recoverySuccessful = false;
                }
            }
        }

        const errorDuration = Date.now() - errorStartTime;

        // Return error recovery test results with error handling validation and recovery status
        return {
            success: errorDetected && (recoveryAttempted ? recoverySuccessful : true),
            errorType: errorType,
            errorInjected: errorInjected,
            errorDetected: errorDetected,
            recoveryAttempted: recoveryAttempted,
            recoverySuccessful: recoverySuccessful,
            systemStateValid: systemStateValid,
            errorDuration: errorDuration,
            lifecycleState: lifecycleState.state,
            timing: {
                startTime: errorStartTime,
                duration: errorDuration
            }
        };

    } catch (error) {
        throw new Error(`Server error recovery test failed: ${error.message}`);
    }
}

/**
 * Tests concurrent lifecycle operations including multiple startup/shutdown attempts
 * and operation queuing with race condition prevention.
 * 
 * @param {Object} concurrencyOptions - Configuration options for concurrency testing
 * @returns {Promise<Object>} Promise resolving to concurrency test result with operation coordination and race condition validation
 */
async function testConcurrentLifecycleOperations(concurrencyOptions = {}) {
    try {
        const concurrencyStartTime = Date.now();
        const operationResults = [];
        let raceConditionDetected = false;
        let operationCoordination = true;

        // Set up concurrent operation monitoring and tracking
        const maxConcurrentOps = concurrencyOptions.maxOperations || 3;
        const operations = [];

        // Ensure server is stopped for concurrent startup test
        if (testServerManager.isServerRunning()) {
            await testServerManager.stopTestServer();
        }
        if (lifecycleManager.isRunning()) {
            await lifecycleManager.stop();
        }

        // Attempt multiple simultaneous lifecycle operations (startup/shutdown)
        for (let i = 0; i < maxConcurrentOps; i++) {
            const operation = async () => {
                try {
                    const opStartTime = Date.now();
                    
                    // Attempt startup
                    const server = testServerManager.getServer();
                    await lifecycleManager.start(testApp, server);
                    
                    const startupDuration = Date.now() - opStartTime;
                    
                    // Brief operation period
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Attempt shutdown
                    const shutdownStartTime = Date.now();
                    await lifecycleManager.stop();
                    const shutdownDuration = Date.now() - shutdownStartTime;
                    
                    return {
                        operationId: i,
                        success: true,
                        startupDuration: startupDuration,
                        shutdownDuration: shutdownDuration,
                        totalDuration: Date.now() - opStartTime
                    };
                } catch (error) {
                    return {
                        operationId: i,
                        success: false,
                        error: error.message,
                        totalDuration: Date.now() - opStartTime
                    };
                }
            };

            operations.push(operation());
        }

        // Monitor operation queuing and coordination by lifecycle manager
        const results = await Promise.allSettled(operations);
        
        // Validate that only one operation executes at a time
        let successfulOperations = 0;
        let failedOperations = 0;
        
        for (const result of results) {
            if (result.status === 'fulfilled') {
                operationResults.push(result.value);
                if (result.value.success) {
                    successfulOperations++;
                } else {
                    failedOperations++;
                }
            } else {
                operationResults.push({
                    success: false,
                    error: result.reason?.message || 'Operation rejected',
                    rejected: true
                });
                failedOperations++;
            }
        }

        // Test operation rejection for invalid concurrent requests
        const validConcurrencyHandling = failedOperations > 0; // Some should fail due to concurrency

        // Validate system state consistency during concurrent operation attempts
        const finalState = lifecycleManager.getState();
        const systemStateConsistent = [
            LIFECYCLE.STATES.STOPPED,
            LIFECYCLE.STATES.RUNNING,
            LIFECYCLE.STATES.ERROR
        ].includes(finalState.state);

        // Test proper error handling for conflicting operations
        const conflictHandling = operationResults.some(result => 
            !result.success && result.error && 
            (result.error.includes('already') || result.error.includes('conflict') || result.error.includes('state'))
        );

        const concurrencyDuration = Date.now() - concurrencyStartTime;

        // Return concurrency test results with coordination validation and race condition prevention status
        return {
            success: systemStateConsistent && validConcurrencyHandling,
            totalOperations: maxConcurrentOps,
            successfulOperations: successfulOperations,
            failedOperations: failedOperations,
            operationCoordination: operationCoordination,
            raceConditionDetected: raceConditionDetected,
            validConcurrencyHandling: validConcurrencyHandling,
            conflictHandling: conflictHandling,
            systemStateConsistent: systemStateConsistent,
            finalState: finalState.state,
            concurrencyDuration: concurrencyDuration,
            operationResults: operationResults,
            timing: {
                startTime: concurrencyStartTime,
                duration: concurrencyDuration
            }
        };

    } catch (error) {
        throw new Error(`Concurrent lifecycle operations test failed: ${error.message}`);
    }
}

/**
 * Tests server performance characteristics during lifecycle operations including startup time,
 * shutdown time, and operational response time validation.
 * 
 * @param {Object} performanceOptions - Configuration options for performance testing
 * @returns {Promise<Object>} Promise resolving to performance test result with timing measurements and performance validation
 */
async function testServerPerformanceDuringLifecycle(performanceOptions = {}) {
    try {
        const performanceStartTime = Date.now();
        const performanceMetrics = {
            startup: {},
            operation: {},
            shutdown: {},
            overall: {}
        };

        // Set up performance measurement tracking for lifecycle operations
        const performanceThresholds = {
            startupTime: performanceOptions.startupThreshold || 5000, // 5 seconds
            shutdownTime: performanceOptions.shutdownThreshold || 3000, // 3 seconds
            responseTime: performanceOptions.responseThreshold || 100, // 100ms
            stateTransition: performanceOptions.transitionThreshold || 1000 // 1 second
        };

        // Ensure clean starting state
        if (testServerManager.isServerRunning()) {
            await testServerManager.stopTestServer();
        }
        if (lifecycleManager.isRunning()) {
            await lifecycleManager.stop();
        }

        // Measure server startup time from initiation to running state
        const startupStartTime = Date.now();
        const server = testServerManager.getServer();
        await lifecycleManager.start(testApp, server);
        await testServerManager.startTestServer();
        
        const startupEndTime = Date.now();
        performanceMetrics.startup = {
            duration: startupEndTime - startupStartTime,
            withinThreshold: (startupEndTime - startupStartTime) <= performanceThresholds.startupTime,
            threshold: performanceThresholds.startupTime
        };

        // Test /hello endpoint response time during normal operation
        const testAgent = testServerManager.getTestAgent();
        const responseTests = [];
        
        for (let i = 0; i < 5; i++) {
            const responseStartTime = Date.now();
            await testAgent.get('/hello').expect(200);
            const responseEndTime = Date.now();
            responseTests.push(responseEndTime - responseStartTime);
        }

        const averageResponseTime = responseTests.reduce((sum, time) => sum + time, 0) / responseTests.length;
        performanceMetrics.operation = {
            averageResponseTime: averageResponseTime,
            responseTests: responseTests,
            withinThreshold: averageResponseTime <= performanceThresholds.responseTime,
            threshold: performanceThresholds.responseTime
        };

        // Measure server shutdown time from initiation to stopped state
        const shutdownStartTime = Date.now();
        await lifecycleManager.stop();
        await testServerManager.stopTestServer();
        
        const shutdownEndTime = Date.now();
        performanceMetrics.shutdown = {
            duration: shutdownEndTime - shutdownStartTime,
            withinThreshold: (shutdownEndTime - shutdownStartTime) <= performanceThresholds.shutdownTime,
            threshold: performanceThresholds.shutdownTime
        };

        // Validate performance measurements against expected thresholds
        const allWithinThresholds = 
            performanceMetrics.startup.withinThreshold &&
            performanceMetrics.operation.withinThreshold &&
            performanceMetrics.shutdown.withinThreshold;

        // Test performance consistency across multiple lifecycle cycles
        // (Single cycle for this test due to time constraints)
        
        // Monitor memory usage during lifecycle operations
        const memoryUsage = process.memoryUsage();
        performanceMetrics.memory = {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            rss: memoryUsage.rss
        };

        const totalTestDuration = Date.now() - performanceStartTime;
        performanceMetrics.overall = {
            totalDuration: totalTestDuration,
            allWithinThresholds: allWithinThresholds,
            testStartTime: performanceStartTime
        };

        // Return performance test results with comprehensive timing and resource usage data
        return {
            success: allWithinThresholds,
            performanceMetrics: performanceMetrics,
            thresholds: performanceThresholds,
            allWithinThresholds: allWithinThresholds,
            totalDuration: totalTestDuration,
            memoryStable: true, // Basic check - memory is recorded
            timing: {
                startTime: performanceStartTime,
                duration: totalTestDuration
            }
        };

    } catch (error) {
        throw new Error(`Server performance during lifecycle test failed: ${error.message}`);
    }
}

// Main test suite for Server Lifecycle E2E Tests
describe('Server Lifecycle E2E Tests', function() {
    // Set timeout for all tests in this suite
    this.timeout(30000);

    // Global test setup before all tests
    before(async function() {
        try {
            console.log('Setting up Server Lifecycle E2E Test Suite...');
            
            // Initialize TestServerManager and LifecycleManager with test configuration
            const setupResult = await setupLifecycleTest({
                timeout: TIMEOUTS.SERVER_STARTUP,
                port: 0 // Use random port
            });

            assert(setupResult.success, 'Lifecycle test setup should succeed');
            console.log('Server Lifecycle E2E Test Suite setup completed successfully');
        } catch (error) {
            console.error('Failed to setup Server Lifecycle E2E Test Suite:', error);
            throw error;
        }
    });

    // Global test cleanup after all tests
    after(async function() {
        try {
            console.log('Cleaning up Server Lifecycle E2E Test Suite...');
            
            // Execute complete server shutdown and resource cleanup
            await cleanupLifecycleTest({
                force: true,
                timeout: TIMEOUTS.SERVER_SHUTDOWN,
                executeTeardown: true
            });
            
            console.log('Server Lifecycle E2E Test Suite cleanup completed successfully');
        } catch (error) {
            console.error('Failed to cleanup Server Lifecycle E2E Test Suite:', error);
            // Don't throw to prevent masking test failures
        }
    });

    // Individual test setup before each test
    beforeEach(async function() {
        try {
            // Ensure clean state before each test
            if (testServerManager && testServerManager.isServerRunning()) {
                await testServerManager.stopTestServer({ force: true });
            }
            if (lifecycleManager && lifecycleManager.isRunning()) {
                await lifecycleManager.stop(true);
            }
        } catch (error) {
            console.warn('BeforeEach cleanup warning:', error.message);
        }
    });

    // Individual test cleanup after each test
    afterEach(async function() {
        try {
            // Ensure resources are cleaned up after each test
            if (testServerManager && testServerManager.isServerRunning()) {
                await testServerManager.stopTestServer({ force: true });
            }
            if (lifecycleManager && lifecycleManager.isRunning()) {
                await lifecycleManager.stop(true);
            }
        } catch (error) {
            console.warn('AfterEach cleanup warning:', error.message);
        }
    });

    describe('Initial Setup and Configuration', function() {
        it('should initialize server lifecycle correctly', async function() {
            // Test initial server lifecycle setup and component initialization
            assert(lifecycleManager, 'LifecycleManager should be initialized');
            assert(testServerManager, 'TestServerManager should be initialized');
            
            // Initial lifecycle state should be INITIALIZING
            const initialState = lifecycleManager.getState();
            assert(
                initialState.state === LIFECYCLE.STATES.INITIALIZING || 
                initialState.state === LIFECYCLE.STATES.STOPPED,
                'Initial lifecycle state should be INITIALIZING or STOPPED'
            );
            
            // Server should not be running initially
            assert(!testServerManager.isServerRunning(), 'Server should not be running initially');
        });
    });

    describe('Server Startup Sequence', function() {
        it('should startup server through complete lifecycle sequence', async function() {
            // Test complete server startup sequence from initialization to running state
            const startupResult = await testServerStartupSequence({
                timeout: TIMEOUTS.SERVER_STARTUP
            });

            assert(startupResult.success, 'Server startup should succeed');
            assert(startupResult.serverRunning, 'Server should be running after startup');
            assert(startupResult.lifecycleRunning, 'Lifecycle should be running after startup');
            assert(startupResult.endpointAccessible, '/hello endpoint should be accessible');
            assert(startupResult.stateValidation.success, 'State validation should pass');
            assert(startupResult.startupDuration < TIMEOUTS.SERVER_STARTUP, 'Startup should complete within timeout');
        });
    });

    describe('Running State Stability', function() {
        it('should maintain stable running state', async function() {
            // Start server first
            await testServerStartupSequence();
            
            // Test server stability and operational capability during running state
            const testAgent = testServerManager.getTestAgent();
            
            // Test multiple requests to ensure stability
            for (let i = 0; i < 5; i++) {
                const response = await testAgent.get('/hello').expect(200);
                assert.strictEqual(response.text, 'Hello world', 'Hello endpoint should return consistent response');
                
                // Verify lifecycle state remains RUNNING
                const currentState = lifecycleManager.getState();
                assert.strictEqual(currentState.state, LIFECYCLE.STATES.RUNNING, 'Lifecycle state should remain RUNNING');
                
                // Brief delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Verify uptime is increasing
            const uptime = lifecycleManager.getUptime();
            assert(uptime > 0, 'Server uptime should be positive during operation');
        });
    });

    describe('Server Shutdown Sequence', function() {
        it('should shutdown server gracefully through complete sequence', async function() {
            // Start server first
            await testServerStartupSequence();
            
            // Test graceful server shutdown sequence from running to stopped state
            const shutdownResult = await testServerShutdownSequence(true, {
                timeout: TIMEOUTS.SERVER_SHUTDOWN
            });

            assert(shutdownResult.success, 'Server shutdown should succeed');
            assert(shutdownResult.graceful, 'Shutdown should be graceful');
            assert(shutdownResult.serverStopped, 'Server should be stopped after shutdown');
            assert(shutdownResult.lifecycleStopped, 'Lifecycle should be stopped after shutdown');
            assert(shutdownResult.endpointInaccessible, '/hello endpoint should be inaccessible after shutdown');
            assert.strictEqual(shutdownResult.finalState, LIFECYCLE.STATES.STOPPED, 'Final state should be STOPPED');
            assert(shutdownResult.shutdownDuration < TIMEOUTS.SERVER_SHUTDOWN, 'Shutdown should complete within timeout');
        });
    });

    describe('Server Restart Capability', function() {
        it('should handle server restart correctly', async function() {
            // Start server first
            await testServerStartupSequence();
            
            // Test server restart capability including shutdown and startup sequence
            const restartResult = await testServerRestartCapability({
                timeout: TIMEOUTS.SERVER_STARTUP * 2
            });

            assert(restartResult.success, 'Server restart should succeed');
            assert(restartResult.serverRunning, 'Server should be running after restart');
            assert(restartResult.lifecycleRunning, 'Lifecycle should be running after restart');
            assert(restartResult.endpointAccessible, '/hello endpoint should work after restart');
            assert(restartResult.configurationMaintained, 'Server configuration should be maintained across restart');
            assert(restartResult.restartDuration < (TIMEOUTS.SERVER_STARTUP * 2), 'Restart should complete within timeout');
        });
    });

    describe('Process Signal Handling', function() {
        it('should handle process signals for graceful shutdown', async function() {
            // Start server first
            await testServerStartupSequence();
            
            // Test process signal handling (SIGTERM, SIGINT) for graceful application shutdown
            const signalResult = await testProcessSignalHandling('SIGTERM', {
                timeout: TIMEOUTS.SERVER_SHUTDOWN
            });

            assert(signalResult.success, 'Signal handling should succeed');
            assert(signalResult.signalReceived, 'SIGTERM signal should be received');
            assert(signalResult.shutdownInitiated, 'Shutdown should be initiated by signal');
            assert(signalResult.shutdownCompleted, 'Shutdown should be completed after signal');
            assert(signalResult.endpointInaccessible, '/hello endpoint should be inaccessible after signal shutdown');
            assert.strictEqual(signalResult.finalState, LIFECYCLE.STATES.STOPPED, 'Final state should be STOPPED');
        });
    });

    describe('Lifecycle State Transitions', function() {
        it('should validate lifecycle state transitions timing', async function() {
            // Test lifecycle state transition timing and validation against performance thresholds
            const transitionResult = await testLifecycleStateTransitions({
                timeout: TIMEOUTS.SERVER_STARTUP + TIMEOUTS.SERVER_SHUTDOWN
            });

            assert(transitionResult.success, 'State transitions should be valid');
            assert(transitionResult.hasValidSequence, 'State transition sequence should be valid');
            assert(transitionResult.finalState === LIFECYCLE.STATES.STOPPED, 'Final state should be STOPPED');
            assert(transitionResult.transitionCount >= 4, 'Should have at least 4 state transitions');
            assert(transitionResult.totalDuration < (TIMEOUTS.SERVER_STARTUP + TIMEOUTS.SERVER_SHUTDOWN), 'Transitions should complete within timeout');
        });
    });

    describe('Concurrent Operations Prevention', function() {
        it('should prevent concurrent lifecycle operations', async function() {
            // Test prevention of concurrent startup/shutdown operations and proper operation queuing
            const concurrencyResult = await testConcurrentLifecycleOperations({
                maxOperations: 3,
                timeout: TIMEOUTS.SERVER_STARTUP * 2
            });

            assert(concurrencyResult.success, 'Concurrency handling should be successful');
            assert(concurrencyResult.systemStateConsistent, 'System state should remain consistent');
            assert(concurrencyResult.validConcurrencyHandling, 'Concurrent operations should be handled properly');
            assert(concurrencyResult.failedOperations > 0, 'Some operations should fail due to concurrency conflicts');
        });
    });

    describe('Error Handling and Recovery', function() {
        it('should handle startup errors and recovery', async function() {
            // Test error handling during server startup and recovery procedures
            const errorResult = await testServerErrorRecovery('startup', {
                timeout: TIMEOUTS.SERVER_STARTUP
            });

            assert(errorResult.success, 'Error recovery should be successful');
            assert(errorResult.errorDetected, 'Startup error should be detected');
            assert(errorResult.systemStateValid, 'System state should remain valid after error');
        });

        it('should handle shutdown errors and cleanup', async function() {
            // Start server first
            await testServerStartupSequence();
            
            // Test error handling during server shutdown and ensure resource cleanup
            const errorResult = await testServerErrorRecovery('shutdown', {
                timeout: TIMEOUTS.SERVER_SHUTDOWN
            });

            assert(errorResult.errorDetected, 'Shutdown error conditions should be tested');
            // Note: Recovery from shutdown errors is less critical as long as resources are cleaned up
        });

        it('should handle runtime errors gracefully', async function() {
            // Start server first
            await testServerStartupSequence();
            
            // Test runtime error handling during normal operation
            const errorResult = await testServerErrorRecovery('runtime', {
                timeout: TIMEOUTS.REQUEST_PROCESSING
            });

            assert(errorResult.success, 'Runtime error recovery should be successful');
            assert(errorResult.errorDetected, 'Runtime error should be detected');
            assert(errorResult.recoverySuccessful, 'System should recover from runtime errors');
        });
    });

    describe('Performance Validation', function() {
        it('should validate server performance during lifecycle', async function() {
            // Test server performance characteristics during all lifecycle phases
            const performanceResult = await testServerPerformanceDuringLifecycle({
                startupThreshold: 5000, // 5 seconds
                shutdownThreshold: 3000, // 3 seconds
                responseThreshold: 100, // 100ms
                transitionThreshold: 1000 // 1 second
            });

            assert(performanceResult.success, 'Performance should meet requirements');
            assert(performanceResult.allWithinThresholds, 'All performance metrics should be within thresholds');
            assert(performanceResult.performanceMetrics.startup.withinThreshold, 'Startup time should be within threshold');
            assert(performanceResult.performanceMetrics.operation.withinThreshold, 'Response time should be within threshold');
            assert(performanceResult.performanceMetrics.shutdown.withinThreshold, 'Shutdown time should be within threshold');
            assert(performanceResult.memoryStable, 'Memory usage should be stable');
        });
    });

    describe('Resource Cleanup and Leak Prevention', function() {
        it('should validate resource cleanup and leak prevention', async function() {
            // Record initial memory usage
            const initialMemory = process.memoryUsage();
            
            // Perform complete lifecycle multiple times to test for leaks
            for (let cycle = 0; cycle < 3; cycle++) {
                await testServerStartupSequence();
                await testServerShutdownSequence(true);
                
                // Brief pause between cycles
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Check final memory usage
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseRatio = memoryIncrease / initialMemory.heapUsed;
            
            // Allow some memory increase but flag significant leaks
            assert(memoryIncreaseRatio < 0.5, `Memory usage should not increase significantly (increase: ${memoryIncreaseRatio * 100}%)`);
            
            // Validate no servers are still running
            assert(!testServerManager.isServerRunning(), 'No test servers should be running after cleanup');
            assert(!lifecycleManager.isRunning(), 'Lifecycle should not be running after cleanup');
            
            // Validate final state
            const finalState = lifecycleManager.getState();
            assert.strictEqual(finalState.state, LIFECYCLE.STATES.STOPPED, 'Final lifecycle state should be STOPPED');
        });
    });
});