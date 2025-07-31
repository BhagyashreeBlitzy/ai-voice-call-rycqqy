/**
 * Watch Mode Test Execution Script for Node.js Tutorial Application
 * 
 * This script provides continuous testing capabilities for the Node.js tutorial application
 * during development. It monitors source files and test files for changes, automatically
 * re-executing relevant test suites when modifications are detected. Built on Node.js 
 * built-in test runner with --watch flag and enhanced with chokidar file system monitoring
 * for precise change detection.
 * 
 * Demonstrates development workflow optimization patterns with intelligent test selection,
 * debounced execution, and educational feedback for iterative Node.js development with
 * Express.js 5.1.0 framework.
 * 
 * Features:
 * - File system watching with chokidar for reliable change detection
 * - Intelligent test selection based on file change analysis
 * - Debounced test execution to prevent rapid successive runs
 * - Real-time feedback and educational insights during development
 * - Graceful shutdown handling with proper resource cleanup
 * - Integration with Node.js built-in test runner for native testing
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import Node.js built-in modules for file system operations and process management
const { spawn } = require('node:child_process'); // node:child_process - built-in
const path = require('node:path'); // node:path - built-in
const fs = require('node:fs/promises'); // node:fs/promises - built-in
const process = require('node:process'); // node:process - built-in

// Import chokidar for efficient file system watching capabilities
const chokidar = require('chokidar'); // chokidar ^3.5.3

// Import test execution utilities from the main test script
const {
    parseCommandLineArguments,
    discoverTestFiles,
    runTestSuite,
    generateTestReport
} = require('./test.js');

// Import test configuration management for watch mode settings
const { 
    testConfig,
    TestConfigManager
} = require('../test/setup/testConfig.js');

// Import test helper utilities for logging and async operations
const {
    createTestLogger,
    runWithTimeout
} = require('../test/helpers/testHelpers.js');

// Import application constants for configuration and environment management
const {
    APPLICATION,
    ENVIRONMENT
} = require('../utils/constants.js');

// Import environment detection utilities for conditional watch mode behavior
const { isTestEnvironment } = require('../utils/environment.js');

// Global variables for watch mode state management
let watchLogger = createTestLogger('test-watch');
let watchConfig = null;
let fileWatcher = null;
let testRunner = null;
let watchStartTime = Date.now();
let lastTestRun = null;
let testQueue = new Set();
let isRunningTests = false;

/**
 * Parses command line arguments specific to watch mode testing including file patterns,
 * test filters, coverage options, and watch mode specific settings. Extends the base
 * command line argument parsing with watch-specific options and configuration.
 * 
 * @param {Array<string>} argv - Command line arguments array from process.argv
 * @returns {Object} Parsed watch mode options object with file patterns, test filters, and watch configuration
 */
function parseWatchArguments(argv) {
    // Parse base command line arguments using parseCommandLineArguments from test.js
    const baseOptions = parseCommandLineArguments(argv);
    
    // Extract watch-specific options including file patterns to monitor
    const watchSpecificOptions = {
        // File patterns for source files to watch (default: all JavaScript files)
        watchPatterns: baseOptions.watchPatterns || [
            'src/**/*.js',
            'test/**/*.js',
            '!node_modules/**',
            '!coverage/**',
            '!logs/**'
        ],
        
        // Parse debounce delay option for file change handling (default: 1000ms)
        debounceDelay: parseInt(baseOptions.debounceDelay) || 1000,
        
        // Extract ignore patterns for files to exclude from watching
        ignorePatterns: baseOptions.ignorePatterns || [
            'node_modules/**',
            'coverage/**',
            'logs/**',
            'build/**',
            'dist/**',
            '.git/**',
            '*.log',
            '*.tmp'
        ],
        
        // Parse coverage update frequency for continuous coverage reporting
        coverageUpdateFrequency: parseInt(baseOptions.coverageUpdateFrequency) || 5000,
        
        // Configure initial test run option to run tests immediately on startup
        runInitialTests: baseOptions.runInitialTests !== false,
        
        // Parse clear console option for clean output during watch mode
        clearConsole: baseOptions.clearConsole !== false,
        
        // Watch mode specific test execution options
        watchMode: true,
        
        // Educational feedback options for development learning
        educationalFeedback: baseOptions.educationalFeedback !== false,
        
        // Polling options for file systems that don't support native watching
        usePolling: baseOptions.usePolling === true,
        pollingInterval: parseInt(baseOptions.pollingInterval) || 1000
    };
    
    // Validate watch mode options and set appropriate defaults
    const validatedOptions = {
        ...baseOptions,
        ...watchSpecificOptions,
        
        // Ensure debounce delay is within reasonable bounds (100ms - 10s)
        debounceDelay: Math.max(100, Math.min(watchSpecificOptions.debounceDelay, 10000)),
        
        // Validate coverage update frequency (1s - 60s)
        coverageUpdateFrequency: Math.max(1000, Math.min(watchSpecificOptions.coverageUpdateFrequency, 60000)),
        
        // Ensure polling interval is reasonable (100ms - 5s)
        pollingInterval: Math.max(100, Math.min(watchSpecificOptions.pollingInterval, 5000))
    };
    
    // Log watch mode configuration for debugging and educational purposes
    watchLogger.info('Watch mode arguments parsed successfully', {
        debounceDelay: validatedOptions.debounceDelay,
        watchPatterns: validatedOptions.watchPatterns.length,
        ignorePatterns: validatedOptions.ignorePatterns.length,
        runInitialTests: validatedOptions.runInitialTests,
        clearConsole: validatedOptions.clearConsole
    });
    
    // Return comprehensive watch mode configuration object
    return validatedOptions;
}

/**
 * Creates comprehensive watch mode configuration including file patterns, test execution
 * settings, debounce timers, and educational feedback options. Integrates with the
 * TestConfigManager to provide centralized watch mode configuration management.
 * 
 * @param {Object} watchOptions - Watch mode options from command line parsing
 * @returns {Object} Complete watch mode configuration object with file watching settings and test execution parameters
 */
function createWatchConfig(watchOptions) {
    // Initialize TestConfigManager with watch mode specific settings
    const configManager = new TestConfigManager({
        environment: ENVIRONMENT.TEST,
        watchMode: true,
        ...watchOptions
    });
    
    const baseConfig = configManager.getConfig();
    
    // Configure file watching patterns for source files (*.js) and test files
    const fileWatchingConfig = {
        // Source file patterns to monitor for changes
        watchPatterns: watchOptions.watchPatterns || [
            'src/**/*.js',
            'test/**/*.js'
        ],
        
        // Set up ignore patterns for node_modules, logs, coverage, and build directories
        ignored: [
            '**/node_modules/**',
            '**/coverage/**',
            '**/logs/**',
            '**/build/**',
            '**/dist/**',
            '**/.git/**',
            '**/*.log',
            '**/*.tmp',
            '**/*.swp',
            '**/*.DS_Store'
        ],
        
        // Configure chokidar options for reliable file watching
        persistent: true,
        followSymlinks: false,
        disableGlobbing: false,
        usePolling: watchOptions.usePolling || false,
        interval: watchOptions.pollingInterval || 1000,
        binaryInterval: (watchOptions.pollingInterval || 1000) * 3,
        
        // Enable atomic file write detection
        atomic: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
        }
    };
    
    // Configure debounce delay to prevent rapid successive test runs (default: 1000ms)
    const executionConfig = {
        debounceDelay: watchOptions.debounceDelay || 1000,
        maxConcurrentTests: 1, // Prevent concurrent test execution in watch mode
        testTimeout: baseConfig.execution?.timeout || 30000,
        retryAttempts: 0, // Disable retries in watch mode for faster feedback
        
        // Set up test execution options with appropriate timeouts for watch mode
        testRunnerOptions: {
            watch: false, // We handle watching ourselves with chokidar
            parallel: false, // Sequential execution for cleaner output
            coverage: watchOptions.coverage || false,
            verbose: watchOptions.verbose || false,
            reporter: watchOptions.reporter || 'spec'
        }
    };
    
    // Configure coverage reporting frequency and update settings
    const coverageConfig = {
        enabled: watchOptions.coverage || false,
        updateFrequency: watchOptions.coverageUpdateFrequency || 5000,
        threshold: baseConfig.coverage?.threshold || 80,
        reporters: ['text', 'lcov'],
        
        // Coverage collection patterns
        include: ['src/**/*.js'],
        exclude: [
            'test/**',
            'coverage/**',
            'node_modules/**'
        ]
    };
    
    // Set up logging configuration for continuous feedback during watch mode
    const loggingConfig = {
        level: watchOptions.logLevel || 'info',
        colorize: true,
        timestamp: true,
        
        // Watch mode specific logging settings
        logFileChanges: true,
        logTestExecution: true,
        logPerformanceMetrics: watchOptions.verbose || false,
        
        // Console clearing configuration
        clearConsole: watchOptions.clearConsole !== false,
        clearOnRerun: true
    };
    
    // Add educational feedback options for development learning
    const educationalConfig = {
        enabled: watchOptions.educationalFeedback !== false,
        
        // Show file change impact analysis
        showChangeImpact: true,
        
        // Display test selection reasoning
        showTestSelectionReason: true,
        
        // Provide development workflow tips
        showWorkflowTips: true,
        
        // Display performance insights
        showPerformanceInsights: watchOptions.verbose || false,
        
        // Show Node.js and testing best practices
        showBestPractices: true
    };
    
    // Combine all configuration sections into complete watch mode configuration
    const completeWatchConfig = {
        ...baseConfig,
        
        // Watch mode identification
        isWatchMode: true,
        startTime: watchStartTime,
        
        // File watching configuration
        fileWatching: fileWatchingConfig,
        
        // Test execution configuration
        execution: {
            ...baseConfig.execution,
            ...executionConfig
        },
        
        // Coverage configuration
        coverage: {
            ...baseConfig.coverage,
            ...coverageConfig
        },
        
        // Logging configuration
        logging: {
            ...baseConfig.logging,
            ...loggingConfig
        },
        
        // Educational features configuration
        educational: educationalConfig,
        
        // Watch mode specific settings
        watchOptions: {
            runInitialTests: watchOptions.runInitialTests !== false,
            autoRestart: watchOptions.autoRestart !== false,
            exitOnError: watchOptions.exitOnError === true
        }
    };
    
    // Log watch mode configuration creation for debugging
    watchLogger.info('Watch mode configuration created successfully', {
        watchPatterns: fileWatchingConfig.watchPatterns.length,
        debounceDelay: executionConfig.debounceDelay,
        coverageEnabled: coverageConfig.enabled,
        educationalFeedback: educationalConfig.enabled
    });
    
    // Return complete watch mode configuration object
    return completeWatchConfig;
}

/**
 * Initializes chokidar file watcher with configured patterns, handles file change events,
 * and sets up intelligent test execution triggers. Creates a robust file watching system
 * with proper error handling and event management for reliable change detection.
 * 
 * @param {Object} watchConfig - Complete watch mode configuration object
 * @returns {Promise<Object>} Promise resolving to file watcher instance with event handlers and control methods
 */
async function initializeFileWatcher(watchConfig) {
    try {
        // Create chokidar watcher instance with configured file patterns
        const watcher = chokidar.watch(watchConfig.fileWatching.watchPatterns, {
            // Configure watcher options including ignored patterns and polling settings
            ignored: watchConfig.fileWatching.ignored,
            persistent: watchConfig.fileWatching.persistent,
            followSymlinks: watchConfig.fileWatching.followSymlinks,
            disableGlobbing: watchConfig.fileWatching.disableGlobbing,
            usePolling: watchConfig.fileWatching.usePolling,
            interval: watchConfig.fileWatching.interval,
            binaryInterval: watchConfig.fileWatching.binaryInterval,
            atomic: watchConfig.fileWatching.atomic,
            awaitWriteFinish: watchConfig.fileWatching.awaitWriteFinish,
            
            // Additional chokidar options for reliability
            ignoreInitial: true, // Don't trigger events for existing files
            depth: 10 // Reasonable directory depth limit
        });
        
        // Set up 'change' event handler for source file modifications
        watcher.on('change', async (filePath) => {
            watchLogger.debug(`File changed: ${filePath}`);
            await handleFileChange(filePath, 'change');
        });
        
        // Set up 'add' event handler for new file detection
        watcher.on('add', async (filePath) => {
            watchLogger.debug(`File added: ${filePath}`);
            await handleFileChange(filePath, 'add');
        });
        
        // Set up 'unlink' event handler for file deletion
        watcher.on('unlink', async (filePath) => {
            watchLogger.debug(`File deleted: ${filePath}`);
            await handleFileChange(filePath, 'unlink');
        });
        
        // Configure error handling for file system watch errors
        watcher.on('error', (error) => {
            watchLogger.error('File watcher error occurred', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            // Attempt to recover from watcher errors
            if (watchConfig.watchOptions.autoRestart) {
                watchLogger.warn('Attempting to restart file watcher due to error');
                setTimeout(async () => {
                    try {
                        await watcher.close();
                        fileWatcher = await initializeFileWatcher(watchConfig);
                        watchLogger.info('File watcher restarted successfully');
                    } catch (restartError) {
                        watchLogger.error('Failed to restart file watcher', {
                            error: restartError.message
                        });
                    }
                }, 1000);
            }
        });
        
        // Add ready event handler to confirm watcher initialization
        watcher.on('ready', () => {
            const watchedPaths = watcher.getWatched();
            const watchedCount = Object.keys(watchedPaths).reduce((count, dir) => {
                return count + watchedPaths[dir].length;
            }, 0);
            
            watchLogger.info('File watcher initialized and ready', {
                watchedDirectories: Object.keys(watchedPaths).length,
                watchedFiles: watchedCount,
                patterns: watchConfig.fileWatching.watchPatterns.length,
                usePolling: watchConfig.fileWatching.usePolling
            });
            
            // Display educational information about file watching
            if (watchConfig.educational.enabled) {
                console.log('\n📁 File Watching Active:');
                console.log(`   • Watching ${watchedCount} files across ${Object.keys(watchedPaths).length} directories`);
                console.log(`   • Debounce delay: ${watchConfig.execution.debounceDelay}ms`);
                console.log(`   • Using ${watchConfig.fileWatching.usePolling ? 'polling' : 'native'} file system events`);
            }
        });
        
        // Add additional event handlers for comprehensive file monitoring
        watcher.on('addDir', (dirPath) => {
            watchLogger.debug(`Directory added: ${dirPath}`);
        });
        
        watcher.on('unlinkDir', (dirPath) => {
            watchLogger.debug(`Directory removed: ${dirPath}`);
        });
        
        // Return watcher instance with event bindings and control methods
        const watcherInstance = {
            watcher,
            
            // Control methods for watcher management
            close: async () => {
                watchLogger.info('Closing file watcher');
                await watcher.close();
            },
            
            // Status methods for watcher monitoring
            getWatchedPaths: () => watcher.getWatched(),
            
            isReady: () => watcher.isReady(),
            
            // Statistics methods for debugging
            getStats: () => {
                const watched = watcher.getWatched();
                return {
                    directories: Object.keys(watched).length,
                    files: Object.keys(watched).reduce((count, dir) => count + watched[dir].length, 0),
                    patterns: watchConfig.fileWatching.watchPatterns.length,
                    ignored: watchConfig.fileWatching.ignored.length
                };
            }
        };
        
        return watcherInstance;
        
    } catch (error) {
        watchLogger.error('Failed to initialize file watcher', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Handles file change events with intelligent test selection, debounced execution, and
 * educational feedback about which tests are affected by changes. Implements sophisticated
 * change detection logic to optimize test execution efficiency.
 * 
 * @param {string} filePath - Path of the file that changed
 * @param {string} eventType - Type of file system event (change, add, unlink)
 * @returns {Promise<void>} Promise resolving when file change handling is complete
 */
async function handleFileChange(filePath, eventType) {
    try {
        // Log file change event with timestamp and file path information
        const timestamp = new Date().toISOString();
        const relativePath = path.relative(process.cwd(), filePath);
        
        watchLogger.info(`File ${eventType}: ${relativePath}`, {
            filePath,
            eventType,
            timestamp,
            watchSession: watchStartTime
        });
        
        // Skip test execution if tests are already running to prevent conflicts
        if (isRunningTests) {
            watchLogger.debug('Skipping file change handling - tests are currently running');
            testQueue.add(filePath); // Queue the change for later processing
            return;
        }
        
        // Determine affected test files based on file change location and type
        const affectedTests = await determineAffectedTests(filePath);
        
        if (affectedTests.length === 0) {
            watchLogger.debug(`No tests affected by changes to: ${relativePath}`);
            return;
        }
        
        // Add affected tests to test queue for batched execution
        affectedTests.forEach(testFile => testQueue.add(testFile));
        
        // Provide educational feedback about file change impact on tests
        if (watchConfig.educational.enabled && watchConfig.educational.showChangeImpact) {
            console.log(`\n🔄 Change detected in: ${relativePath}`);
            console.log(`   📋 Tests to run: ${affectedTests.length}`);
            if (watchConfig.educational.showTestSelectionReason) {
                affectedTests.forEach(testFile => {
                    const relativeTestPath = path.relative(process.cwd(), testFile);
                    console.log(`   • ${relativeTestPath}`);
                });
            }
        }
        
        // Cancel any existing debounce timer to reset execution delay
        if (global.watchDebounceTimer) {
            clearTimeout(global.watchDebounceTimer);
        }
        
        // Set new debounce timer to batch multiple file changes
        global.watchDebounceTimer = setTimeout(async () => {
            // Queue debounced test execution with intelligent test selection
            const uniqueTests = Array.from(testQueue);
            testQueue.clear();
            
            if (uniqueTests.length > 0) {
                await executeWatchModeTests(uniqueTests, {
                    eventType,
                    triggerFile: relativePath,
                    timestamp
                });
            }
        }, watchConfig.execution.debounceDelay);
        
    } catch (error) {
        watchLogger.error('Error handling file change', {
            filePath,
            eventType,
            error: error.message,
            stack: error.stack
        });
    }
}

/**
 * Analyzes file changes to determine which test suites should be executed, supporting
 * intelligent test selection for efficient watch mode operation. Implements sophisticated
 * dependency analysis to minimize test execution time while ensuring comprehensive coverage.
 * 
 * @param {string} changedFile - Path of the file that changed
 * @returns {Array<string>} Array of test file paths that should be executed based on the file change
 */
async function determineAffectedTests(changedFile) {
    const affectedTests = [];
    const relativePath = path.relative(process.cwd(), changedFile);
    const parsedPath = path.parse(changedFile);
    
    try {
        // Analyze file path to determine if it's a source file or test file
        if (relativePath.includes('test/') || parsedPath.name.includes('.test') || parsedPath.name.includes('.spec')) {
            // If test file changed, return that specific test file for execution
            if (await fileExists(changedFile)) {
                affectedTests.push(changedFile);
                watchLogger.debug(`Test file changed: ${relativePath} - running directly`);
            }
        } else if (relativePath.includes('src/')) {
            // If source file changed, identify related test files based on naming conventions
            const sourceFileName = parsedPath.name;
            const sourceDir = parsedPath.dir;
            
            // Check for direct test file matches (same name with .test.js extension)
            const possibleTestPaths = [
                // Test file in same directory as source
                path.join(sourceDir, `${sourceFileName}.test.js`),
                
                // Test file in parallel test directory structure
                path.join(sourceDir.replace(/^src/, 'test'), `${sourceFileName}.test.js`),
                
                // Test file in dedicated test directory
                path.join('test', 'unit', path.relative(path.join(process.cwd(), 'src'), sourceDir), `${sourceFileName}.test.js`),
                
                // Alternative test naming patterns
                path.join('test', `${sourceFileName}.test.js`),
                path.join('test', 'unit', `${sourceFileName}.test.js`)
            ];
            
            // Check each possible test path for existence
            for (const testPath of possibleTestPaths) {
                const fullTestPath = path.resolve(process.cwd(), testPath);
                if (await fileExists(fullTestPath)) {
                    affectedTests.push(fullTestPath);
                    watchLogger.debug(`Found related test file: ${path.relative(process.cwd(), fullTestPath)}`);
                }
            }
            
            // Check for integration tests that might be affected by source changes
            const integrationTestPaths = [
                path.join('test', 'integration', `${sourceFileName}.integration.test.js`),
                path.join('test', 'integration', 'api.integration.test.js') // General API tests
            ];
            
            for (const integrationTestPath of integrationTestPaths) {
                const fullIntegrationPath = path.resolve(process.cwd(), integrationTestPath);
                if (await fileExists(fullIntegrationPath)) {
                    affectedTests.push(fullIntegrationPath);
                    watchLogger.debug(`Found related integration test: ${path.relative(process.cwd(), fullIntegrationPath)}`);
                }
            }
            
            // Include unit tests for modified components and their dependencies
            if (sourceFileName.includes('controller') || sourceFileName.includes('route') || sourceFileName.includes('service')) {
                // Critical application components - run comprehensive unit tests
                const unitTestDir = path.join(process.cwd(), 'test', 'unit');
                try {
                    const unitTests = await discoverTestFiles([unitTestDir]);
                    affectedTests.push(...unitTests);
                    watchLogger.debug(`Critical component changed - running all unit tests: ${unitTests.length} files`);
                } catch (error) {
                    watchLogger.debug('No unit test directory found or accessible');
                }
            }
            
            // Add end-to-end tests if critical application files are modified
            const criticalFiles = ['app.js', 'server.js', 'index.js'];
            if (criticalFiles.some(critical => sourceFileName.includes(critical))) {
                const e2eTestDir = path.join(process.cwd(), 'test', 'e2e');
                try {
                    const e2eTests = await discoverTestFiles([e2eTestDir]);
                    affectedTests.push(...e2eTests);
                    watchLogger.debug(`Critical application file changed - running e2e tests: ${e2eTests.length} files`);
                } catch (error) {
                    watchLogger.debug('No e2e test directory found or accessible');
                }
            }
        }
        
        // Filter test files to ensure they exist and are accessible
        const validTests = [];
        for (const testFile of affectedTests) {
            if (await fileExists(testFile)) {
                validTests.push(testFile);
            }
        }
        
        // Return prioritized list of test files for execution
        const uniqueTests = [...new Set(validTests)]; // Remove duplicates
        
        watchLogger.debug(`Determined affected tests for ${relativePath}`, {
            affectedCount: uniqueTests.length,
            tests: uniqueTests.map(t => path.relative(process.cwd(), t))
        });
        
        return uniqueTests;
        
    } catch (error) {
        watchLogger.error('Error determining affected tests', {
            changedFile: relativePath,
            error: error.message
        });
        return [];
    }
}

/**
 * Helper function to check if a file exists asynchronously
 * 
 * @param {string} filePath - Path to check for existence
 * @returns {Promise<boolean>} Promise resolving to true if file exists
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Executes selected test suites in watch mode with real-time feedback, progress reporting,
 * and educational insights about test execution. Provides comprehensive test execution
 * management with proper error handling and performance monitoring.
 * 
 * @param {Array<string>} testFiles - Array of test file paths to execute
 * @param {Object} executionOptions - Options for test execution configuration
 * @returns {Promise<Object>} Promise resolving to test execution results with timing and coverage information
 */
async function executeWatchModeTests(testFiles, executionOptions = {}) {
    // Set isRunningTests flag to prevent concurrent test execution
    isRunningTests = true;
    
    const startTime = Date.now();
    let testResults = null;
    
    try {
        // Clear console if configured for clean watch mode output
        if (watchConfig.logging.clearConsole && watchConfig.logging.clearOnRerun) {
            console.clear();
        }
        
        // Log test execution start with timestamp and affected files
        const timestamp = new Date().toISOString();
        watchLogger.info('Starting watch mode test execution', {
            testFiles: testFiles.length,
            timestamp,
            trigger: executionOptions.triggerFile || 'unknown',
            eventType: executionOptions.eventType || 'change'
        });
        
        // Display execution header with educational context
        if (watchConfig.educational.enabled) {
            console.log('\n🧪 Running Tests in Watch Mode');
            console.log(`   📁 Trigger: ${executionOptions.triggerFile || 'Multiple files'}`);
            console.log(`   🕒 Started: ${new Date().toLocaleTimeString()}`);
            console.log(`   📋 Test files: ${testFiles.length}`);
            console.log(''.padEnd(50, '─'));
        }
        
        // Execute test suites using runTestSuite function with timeout protection
        const testExecutionPromise = runTestSuite(testFiles, {
            ...watchConfig.execution.testRunnerOptions,
            watchMode: true,
            timeout: watchConfig.execution.testTimeout,
            verbose: watchConfig.logging.logTestExecution
        });
        
        // Monitor test execution progress and provide real-time feedback
        testResults = await runWithTimeout(testExecutionPromise, watchConfig.execution.testTimeout);
        
        // Collect test results and coverage information during execution
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // Generate educational feedback about test patterns and results
        if (watchConfig.educational.enabled && watchConfig.educational.showPerformanceInsights) {
            console.log(`\n⚡ Performance Insights:`);
            console.log(`   • Execution time: ${executionTime}ms`);
            console.log(`   • Average per test: ${Math.round(executionTime / testFiles.length)}ms`);
            console.log(`   • Tests completed: ${testResults?.summary?.total || testFiles.length}`);
        }
        
        // Update last test run tracking
        lastTestRun = {
            timestamp: endTime,
            testFiles: testFiles.length,
            duration: executionTime,
            results: testResults,
            trigger: executionOptions.triggerFile
        };
        
        // Generate comprehensive test report with watch mode context
        const watchModeReport = await generateTestReport(testResults, {
            watchMode: true,
            executionTime,
            triggerFile: executionOptions.triggerFile,
            timestamp
        });
        
        // Display formatted test results for watch mode
        displayWatchModeResults(watchModeReport, {
            showSummary: true,
            showEducationalInsights: watchConfig.educational.enabled,
            showNextSteps: watchConfig.educational.showWorkflowTips
        });
        
        // Log successful test execution completion
        watchLogger.info('Watch mode test execution completed successfully', {
            duration: executionTime,
            testFiles: testFiles.length,
            passed: testResults?.summary?.passed || 0,
            failed: testResults?.summary?.failed || 0
        });
        
        return {
            success: true,
            results: testResults,
            report: watchModeReport,
            executionTime,
            testFiles: testFiles.length,
            timestamp
        };
        
    } catch (error) {
        // Handle test execution errors with detailed logging
        const executionTime = Date.now() - startTime;
        
        watchLogger.error('Watch mode test execution failed', {
            error: error.message,
            stack: error.stack,
            duration: executionTime,
            testFiles: testFiles.length
        });
        
        // Display error information with educational context
        console.log('\n❌ Test Execution Error:');
        console.log(`   Error: ${error.message}`);
        console.log(`   Duration: ${executionTime}ms`);
        
        if (watchConfig.educational.enabled) {
            console.log('\n💡 Troubleshooting Tips:');
            console.log('   • Check that all test files exist and are accessible');
            console.log('   • Verify that there are no syntax errors in test files');
            console.log('   • Ensure test dependencies are properly installed');
            console.log('   • Review the error message above for specific details');
        }
        
        return {
            success: false,
            error: error.message,
            executionTime,
            testFiles: testFiles.length,
            timestamp: new Date().toISOString()
        };
        
    } finally {
        // Reset isRunningTests flag when execution completes
        isRunningTests = false;
        
        // Process any queued file changes that occurred during test execution
        if (testQueue.size > 0) {
            watchLogger.debug(`Processing ${testQueue.size} queued file changes`);
            setTimeout(async () => {
                const queuedTests = Array.from(testQueue);
                testQueue.clear();
                await executeWatchModeTests(queuedTests, { eventType: 'queued' });
            }, 100);
        }
    }
}

/**
 * Displays formatted test results for watch mode with educational insights, change impact
 * analysis, and development workflow guidance. Provides comprehensive result presentation
 * optimized for continuous development feedback.
 * 
 * @param {Object} testResults - Test execution results with timing and coverage information
 * @param {Object} displayOptions - Options for controlling result display format and content
 * @returns {void} No return value - outputs formatted results to console
 */
function displayWatchModeResults(testResults, displayOptions = {}) {
    const options = {
        showSummary: displayOptions.showSummary !== false,
        showEducationalInsights: displayOptions.showEducationalInsights !== false,
        showNextSteps: displayOptions.showNextSteps !== false,
        useColors: process.stdout.isTTY && displayOptions.useColors !== false,
        ...displayOptions
    };
    
    // Display watch mode header with application name and watch session info
    console.log('\n📊 Watch Mode Test Results');
    console.log(''.padEnd(50, '═'));
    
    // Show test execution summary with pass/fail counts and timing
    if (options.showSummary && testResults?.summary) {
        const { summary } = testResults;
        const passColor = options.useColors ? '\x1b[32m' : '';
        const failColor = options.useColors ? '\x1b[31m' : '';
        const resetColor = options.useColors ? '\x1b[0m' : '';
        
        console.log(`\n📈 Test Summary:`);
        console.log(`   ${passColor}✓ Passed: ${summary.passed || 0}${resetColor}`);
        console.log(`   ${failColor}✗ Failed: ${summary.failed || 0}${resetColor}`);
        console.log(`   📝 Total: ${summary.total || 0}`);
        
        if (summary.duration) {
            console.log(`   ⏱️  Duration: ${summary.duration}ms`);
        }
    }
    
    // Display coverage changes if coverage monitoring is enabled
    if (watchConfig.coverage.enabled && testResults?.coverage) {
        console.log(`\n📊 Coverage Report:`);
        console.log(`   Lines: ${testResults.coverage.lines?.pct || 0}%`);
        console.log(`   Functions: ${testResults.coverage.functions?.pct || 0}%`);
        console.log(`   Branches: ${testResults.coverage.branches?.pct || 0}%`);
    }
    
    // Show file change impact analysis and affected test categories
    if (testResults?.trigger && options.showSummary) {
        console.log(`\n🔄 Change Impact:`);
        console.log(`   📄 Trigger file: ${testResults.trigger}`);
        console.log(`   🧪 Tests executed: ${testResults.testFiles || 0}`);
        
        if (lastTestRun) {
            const timeSinceLastRun = Date.now() - lastTestRun.timestamp;
            console.log(`   ⏰ Time since last run: ${Math.round(timeSinceLastRun / 1000)}s`);
        }
    }
    
    // Include educational insights about test patterns and development workflow
    if (options.showEducationalInsights && watchConfig.educational.enabled) {
        console.log(`\n💡 Development Insights:`);
        
        if (testResults?.summary?.failed > 0) {
            console.log('   • Focus on failing tests first for faster feedback');
            console.log('   • Use watch mode to iterate quickly on fixes');
            console.log('   • Consider writing additional tests for edge cases');
        } else {
            console.log('   • All tests passing - great job! 🎉');
            console.log('   • Consider refactoring with confidence');
            console.log('   • This is a good time to add new features');
        }
        
        if (watchConfig.educational.showBestPractices) {
            console.log('\n🏆 Node.js Testing Best Practices:');
            console.log('   • Keep tests focused and independent');
            console.log('   • Use descriptive test names that explain behavior');
            console.log('   • Test both success and error scenarios');
            console.log('   • Mock external dependencies for unit tests');
        }
    }
    
    // Display next steps and suggestions for improving test coverage
    if (options.showNextSteps && watchConfig.educational.showWorkflowTips) {
        console.log(`\n🚀 Next Steps:`);
        console.log('   • Continue developing with automatic test feedback');
        console.log('   • Press Ctrl+C to exit watch mode');
        console.log('   • Modify files to see tests run automatically');
        
        if (testResults?.summary?.failed > 0) {
            console.log('   • Fix failing tests and watch them pass in real-time');
        }
    }
    
    // Show watch mode status and continuous monitoring confirmation
    const sessionDuration = Date.now() - watchStartTime;
    const sessionMinutes = Math.round(sessionDuration / 60000);
    
    console.log(`\n👀 Watch Mode Status:`);
    console.log(`   🔄 Monitoring files for changes...`);
    console.log(`   ⏱️  Session duration: ${sessionMinutes} minutes`);
    console.log(`   🎯 Ready for next file change`);
    
    // Format output with colors and clear visual separation for readability
    console.log(''.padEnd(50, '─'));
    
    // Display timestamp for reference
    const currentTime = new Date().toLocaleTimeString();
    console.log(`⏰ Last updated: ${currentTime}\n`);
}

/**
 * Handles graceful shutdown of watch mode including file watcher cleanup, test process
 * termination, and resource cleanup. Ensures proper cleanup of all resources and
 * provides session summary before exit.
 * 
 * @param {string} exitReason - Reason for watch mode shutdown (signal, error, manual)
 * @returns {Promise<void>} Promise resolving when watch mode cleanup is complete
 */
async function handleWatchModeExit(exitReason = 'unknown') {
    // Log watch mode shutdown with reason and session summary
    const sessionDuration = Date.now() - watchStartTime;
    const sessionMinutes = Math.round(sessionDuration / 60000);
    
    watchLogger.info('Watch mode shutting down', {
        reason: exitReason,
        sessionDuration,
        sessionMinutes
    });
    
    try {
        // Close chokidar file watcher and clean up file system listeners
        if (fileWatcher) {
            watchLogger.debug('Closing file watcher');
            await fileWatcher.close();
            fileWatcher = null;
        }
        
        // Terminate any running test processes gracefully
        if (testRunner && testRunner.kill) {
            watchLogger.debug('Terminating test runner process');
            testRunner.kill('SIGTERM');
            testRunner = null;
        }
        
        // Clear any pending debounce timers and execution queues
        if (global.watchDebounceTimer) {
            clearTimeout(global.watchDebounceTimer);
            global.watchDebounceTimer = null;
        }
        
        // Clear test queue
        testQueue.clear();
        
        // Display watch mode session statistics including total runs and coverage
        console.log('\n📊 Watch Mode Session Summary:');
        console.log(''.padEnd(40, '═'));
        console.log(`⏱️  Session duration: ${sessionMinutes} minutes`);
        console.log(`🏁 Exit reason: ${exitReason}`);
        
        if (lastTestRun) {
            console.log(`🧪 Last test run: ${Math.round((Date.now() - lastTestRun.timestamp) / 1000)}s ago`);
            console.log(`📋 Tests in last run: ${lastTestRun.testFiles}`);
            console.log(`⚡ Last execution time: ${lastTestRun.duration}ms`);
        }
        
        // Provide educational summary of development session insights
        if (watchConfig?.educational?.enabled) {
            console.log('\n💡 Session Insights:');
            console.log('   • Watch mode helps maintain code quality during development');
            console.log('   • Automatic test execution catches issues early');
            console.log('   • Quick feedback loops improve development velocity');
            console.log('   • Consider running full test suite before deploying');
        }
        
        // Clean up temporary files and resources created during watch mode
        // (None created in this implementation, but placeholder for future enhancements)
        
        console.log('\n👋 Watch mode session ended. Happy coding!');
        
    } catch (error) {
        watchLogger.error('Error during watch mode cleanup', {
            error: error.message,
            stack: error.stack
        });
    }
    
    // Return exit code based on final test results and session success
    const exitCode = (lastTestRun?.results?.summary?.failed || 0) > 0 ? 1 : 0;
    return exitCode;
}

/**
 * Sets up process signal handlers for graceful watch mode shutdown with proper cleanup
 * and educational session summary. Ensures clean exit handling for various termination
 * scenarios including user interruption and system signals.
 * 
 * @returns {void} No return value - configures process signal handlers
 */
function setupWatchModeSignalHandlers() {
    // Register SIGINT handler for Ctrl+C graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Received interrupt signal (Ctrl+C)');
        const exitCode = await handleWatchModeExit('SIGINT');
        process.exit(exitCode);
    });
    
    // Register SIGTERM handler for process termination requests
    process.on('SIGTERM', async () => {
        watchLogger.info('Received SIGTERM signal');
        const exitCode = await handleWatchModeExit('SIGTERM');
        process.exit(exitCode);
    });
    
    // Set up process exit handler for final cleanup operations
    process.on('exit', (code) => {
        watchLogger.info('Process exiting', { exitCode: code });
    });
    
    // Configure uncaught exception handler for error recovery
    process.on('uncaughtException', async (error) => {
        watchLogger.error('Uncaught exception in watch mode', {
            error: error.message,
            stack: error.stack
        });
        
        console.log('\n❌ An unexpected error occurred:');
        console.log(`   ${error.message}`);
        
        const exitCode = await handleWatchModeExit('uncaughtException');
        process.exit(exitCode);
    });
    
    // Add unhandled promise rejection handler for async error handling
    process.on('unhandledRejection', async (reason, promise) => {
        watchLogger.error('Unhandled promise rejection in watch mode', {
            reason: reason?.message || reason,
            promise: promise?.toString()
        });
        
        console.log('\n❌ An unhandled promise rejection occurred:');
        console.log(`   ${reason?.message || reason}`);
        
        const exitCode = await handleWatchModeExit('unhandledRejection');
        process.exit(exitCode);
    });
    
    // Ensure all signal handlers perform proper resource cleanup
    watchLogger.debug('Watch mode signal handlers configured');
}

/**
 * Displays educational introduction to watch mode testing with usage instructions,
 * keyboard shortcuts, and development workflow guidance. Provides comprehensive
 * onboarding information for developers using watch mode.
 * 
 * @param {Object} watchConfig - Complete watch mode configuration object
 * @returns {void} No return value - outputs introductory information to console
 */
function displayWatchModeIntro(watchConfig) {
    // Display watch mode title and application information
    console.log('\n🎯 Node.js Tutorial - Watch Mode Testing');
    console.log(''.padEnd(50, '═'));
    console.log(`📦 Application: ${APPLICATION.NAME} v${APPLICATION.VERSION}`);
    console.log(`🔄 Watch Mode: Active and monitoring file changes`);
    console.log(`📅 Started: ${new Date(watchStartTime).toLocaleString()}`);
    
    // Show configured file patterns being monitored
    console.log('\n📁 Watching Files:');
    watchConfig.fileWatching.watchPatterns.forEach(pattern => {
        console.log(`   • ${pattern}`);
    });
    
    // List keyboard shortcuts and commands available during watch mode
    console.log('\n⌨️  Keyboard Shortcuts:');
    console.log('   • Ctrl+C: Exit watch mode');
    console.log('   • File changes: Automatic test execution');
    console.log('   • Multiple changes: Debounced execution');
    
    // Explain intelligent test selection and execution patterns
    console.log('\n🧠 Intelligent Test Selection:');
    console.log('   • Source file changes → Related test files');
    console.log('   • Test file changes → Direct test execution');
    console.log('   • Critical files → Comprehensive test suites');
    console.log('   • Debounced execution prevents test spam');
    
    // Display coverage monitoring status and update frequency
    if (watchConfig.coverage.enabled) {
        console.log('\n📊 Coverage Monitoring:');
        console.log(`   • Status: Enabled`);
        console.log(`   • Update frequency: ${watchConfig.coverage.updateFrequency}ms`);
        console.log(`   • Threshold: ${watchConfig.coverage.threshold}%`);
    }
    
    // Show educational tips for effective watch mode development workflow
    if (watchConfig.educational.enabled) {
        console.log('\n💡 Watch Mode Best Practices:');
        console.log('   • Make small, focused changes for quick feedback');
        console.log('   • Write tests first, then implement features (TDD)');
        console.log('   • Fix failing tests immediately when detected');
        console.log('   • Use descriptive commit messages when tests pass');
        
        console.log('\n🏆 Development Workflow Tips:');
        console.log('   • Red → Green → Refactor: Classic TDD cycle');
        console.log('   • Watch mode provides instant feedback on changes');
        console.log('   • Keep test files close to source files for clarity');
        console.log('   • Use watch mode for rapid iteration and debugging');
    }
    
    // Include information about Node.js built-in test runner features
    console.log('\n🧪 Node.js Built-in Test Runner Features:');
    console.log('   • Native Node.js testing without external dependencies');
    console.log('   • Fast test execution and parallel processing');
    console.log('   • Built-in assertion library and mocking support');
    console.log('   • TAP-compliant output for tool integration');
    
    // Format output with clear visual organization and helpful colors
    console.log('\n🚀 Watch Mode Configuration:');
    console.log(`   • Debounce delay: ${watchConfig.execution.debounceDelay}ms`);
    console.log(`   • Test timeout: ${watchConfig.execution.testTimeout}ms`);
    console.log(`   • Clear console: ${watchConfig.logging.clearConsole ? 'Yes' : 'No'}`);
    console.log(`   • Educational feedback: ${watchConfig.educational.enabled ? 'Yes' : 'No'}`);
    
    console.log('\n'.padEnd(51, '─'));
    console.log('🔍 Monitoring for file changes... Make a change to see tests run!');
    console.log('');
}

/**
 * Executes initial test run when watch mode starts to establish baseline results and
 * validate test environment setup. Provides comprehensive initial testing to ensure
 * the development environment is properly configured.
 * 
 * @param {Object} watchConfig - Complete watch mode configuration object
 * @returns {Promise<Object>} Promise resolving to initial test results with baseline metrics
 */
async function runInitialTests(watchConfig) {
    if (!watchConfig.watchOptions.runInitialTests) {
        watchLogger.info('Skipping initial test run as configured');
        return { skipped: true };
    }
    
    // Log initial test run start with watch mode configuration summary
    watchLogger.info('Starting initial test run for watch mode baseline', {
        timestamp: new Date().toISOString(),
        configuration: {
            debounceDelay: watchConfig.execution.debounceDelay,
            coverage: watchConfig.coverage.enabled,
            educational: watchConfig.educational.enabled
        }
    });
    
    try {
        // Discover all available test files using discoverTestFiles function
        const testDirectories = [
            path.join(process.cwd(), 'test'),
            path.join(process.cwd(), 'src', '**', '*.test.js')
        ];
        
        const allTestFiles = await discoverTestFiles(testDirectories);
        
        if (allTestFiles.length === 0) {
            watchLogger.warn('No test files found for initial test run');
            console.log('\n⚠️  No test files found in the project');
            console.log('   • Create test files in the "test" directory');
            console.log('   • Or add .test.js files alongside source files');
            console.log('   • Watch mode will monitor for new test files');
            return { testFiles: 0, skipped: true };
        }
        
        console.log('\n🧪 Running Initial Test Suite');
        console.log(''.padEnd(40, '─'));
        console.log(`📋 Found ${allTestFiles.length} test files`);
        
        // Execute complete test suite using executeWatchModeTests function
        const initialResults = await executeWatchModeTests(allTestFiles, {
            eventType: 'initial',
            triggerFile: 'watch-mode-startup',
            timestamp: new Date().toISOString()
        });
        
        // Establish baseline coverage and performance metrics
        const baselineMetrics = {
            testFiles: allTestFiles.length,
            executionTime: initialResults.executionTime,
            timestamp: initialResults.timestamp,
            results: initialResults.results
        };
        
        // Display initial test results with educational context
        if (watchConfig.educational.enabled) {
            console.log('\n📊 Initial Test Baseline Established:');
            console.log(`   📋 Total test files: ${baselineMetrics.testFiles}`);
            console.log(`   ⏱️  Execution time: ${baselineMetrics.executionTime}ms`);
            
            if (initialResults.results?.summary) {
                const { summary } = initialResults.results;
                console.log(`   ✅ Passed: ${summary.passed || 0}`);
                console.log(`   ❌ Failed: ${summary.failed || 0}`);
                
                if (summary.failed > 0) {
                    console.log('\n💡 Initial Test Failures Detected:');
                    console.log('   • Fix these tests first for a clean baseline');
                    console.log('   • Watch mode will help you iterate on fixes');
                    console.log('   • Subsequent runs will only execute affected tests');
                }
            }
        }
        
        // Set up test execution tracking for subsequent watch mode runs
        lastTestRun = {
            timestamp: Date.now(),
            testFiles: allTestFiles.length,
            duration: initialResults.executionTime,
            results: initialResults.results,
            trigger: 'initial-run',
            isBaseline: true
        };
        
        // Log watch mode readiness and file monitoring start confirmation
        watchLogger.info('Initial test run completed - watch mode ready', {
            testFiles: baselineMetrics.testFiles,
            duration: baselineMetrics.executionTime,
            passed: initialResults.results?.summary?.passed || 0,
            failed: initialResults.results?.summary?.failed || 0
        });
        
        // Return initial test results for comparison with future runs
        return {
            success: initialResults.success,
            baseline: baselineMetrics,
            results: initialResults.results,
            testFiles: allTestFiles.length
        };
        
    } catch (error) {
        watchLogger.error('Initial test run failed', {
            error: error.message,
            stack: error.stack
        });
        
        console.log('\n❌ Initial Test Run Failed:');
        console.log(`   Error: ${error.message}`);
        console.log('   • Check test file syntax and dependencies');
        console.log('   • Fix issues and restart watch mode');
        console.log('   • Watch mode will continue monitoring for changes');
        
        return {
            success: false,
            error: error.message,
            testFiles: 0
        };
    }
}

/**
 * Main watch mode function that orchestrates the complete watch mode lifecycle including
 * initialization, file monitoring, test execution, and cleanup. Provides comprehensive
 * watch mode management with proper error handling and educational feedback.
 * 
 * @returns {Promise<number>} Promise resolving to process exit code (0 for success, 1 for failure)
 */
async function main() {
    try {
        // Parse watch mode command line arguments and configure options
        const watchOptions = parseWatchArguments(process.argv);
        
        // Initialize watch mode logger and log session start with timestamp
        watchLogger.info('Watch mode starting', {
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        });
        
        // Validate test environment and Node.js runtime compatibility
        if (!isTestEnvironment()) {
            watchLogger.warn('Not running in test environment - setting NODE_ENV=test');
            process.env.NODE_ENV = ENVIRONMENT.TEST;
        }
        
        // Create watch mode configuration using createWatchConfig function
        watchConfig = createWatchConfig(watchOptions);
        
        // Display educational introduction to watch mode testing
        displayWatchModeIntro(watchConfig);
        
        // Set up process signal handlers for graceful shutdown
        setupWatchModeSignalHandlers();
        
        // Initialize chokidar file watcher with configured patterns
        fileWatcher = await initializeFileWatcher(watchConfig);
        
        // Run initial test suite to establish baseline results
        const initialTestResults = await runInitialTests(watchConfig);
        
        if (!initialTestResults.success && watchConfig.watchOptions.exitOnError) {
            watchLogger.error('Initial test run failed and exitOnError is enabled');
            return 1;
        }
        
        // Start file monitoring and enter watch mode main loop
        watchLogger.info('Watch mode active - monitoring file changes', {
            watchedPatterns: watchConfig.fileWatching.watchPatterns.length,
            ignoredPatterns: watchConfig.fileWatching.ignored.length,
            debounceDelay: watchConfig.execution.debounceDelay
        });
        
        // Handle file changes with intelligent test selection and execution
        // (This is handled by the file watcher event handlers)
        
        // Provide continuous feedback and educational insights during development
        if (watchConfig.educational.enabled && watchConfig.educational.showWorkflowTips) {
            console.log('💡 Pro Tip: Watch mode runs continuously until you press Ctrl+C');
            console.log('   Make changes to any source or test file to see tests run automatically!');
        }
        
        // Keep the process alive for file watching
        // The process will continue running until terminated by signal handlers
        return new Promise((resolve) => {
            // This promise intentionally never resolves during normal operation
            // Exit is handled by signal handlers calling handleWatchModeExit
            process.on('exit', (code) => {
                resolve(code);
            });
        });
        
    } catch (error) {
        // Handle graceful shutdown when watch mode is terminated
        watchLogger.error('Watch mode startup failed', {
            error: error.message,
            stack: error.stack
        });
        
        console.log('\n❌ Watch Mode Startup Failed:');
        console.log(`   Error: ${error.message}`);
        console.log('\n🔧 Troubleshooting:');
        console.log('   • Verify Node.js version is v18 or higher');
        console.log('   • Check that test files and directories exist');
        console.log('   • Ensure all dependencies are installed (npm install)');
        console.log('   • Try running tests normally first (npm test)');
        
        // Display final session summary with development insights
        await handleWatchModeExit('startup-error');
        
        // Return appropriate exit code based on overall session success
        return 1;
    }
}

// Export watch mode functions for testing and reuse
module.exports = {
    parseWatchArguments,
    createWatchConfig,
    handleFileChange,
    determineAffectedTests,
    executeWatchModeTests,
    main
};

// Execute main function if this script is run directly
if (require.main === module) {
    main()
        .then(exitCode => {
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('Unhandled error in watch mode:', error);
            process.exit(1);
        });
}