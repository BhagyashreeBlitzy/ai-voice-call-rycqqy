/**
 * Comprehensive Test Execution Script for Node.js Tutorial Application
 * 
 * This script orchestrates the complete test suite for the Node.js tutorial application
 * using Node.js built-in test runner. It manages unit tests, integration tests, and 
 * end-to-end tests with code coverage analysis, parallel execution, and educational-focused 
 * reporting. Demonstrates testing best practices for Express.js 5.1.0 applications while 
 * maintaining simplicity for tutorial purposes.
 * 
 * Features:
 * - Complete test suite orchestration using Node.js built-in test runner
 * - Code coverage analysis with --experimental-test-coverage flag
 * - Parallel test execution for improved performance
 * - Educational reporting with detailed insights and recommendations
 * - Quality gate validation with configurable thresholds
 * - SuperTest integration for HTTP endpoint testing
 * - Comprehensive error handling and recovery mechanisms
 * - Test environment setup and cleanup procedures
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// External imports - Node.js built-in modules with version comments
const { spawn } = require('node:child_process'); // Node.js built-in - Child process API for spawning test runner processes
const { test } = require('node:test'); // Node.js built-in - Native test runner for organizing test suites
const path = require('node:path'); // Node.js built-in - Path utilities for test file discovery
const fs = require('node:fs/promises'); // Node.js built-in - File system promises API for test file management
const process = require('node:process'); // Node.js built-in - Process API for command line arguments and environment

// Internal imports - Application modules for test configuration and utilities
const { 
    testConfig,
    TestConfigManager 
} = require('../test/setup/testConfig.js');

const { 
    GlobalTestSetup,
    initializeTestEnvironment 
} = require('../test/setup/globalSetup.js');

const {
    createTestLogger,
    createTestSuite,
    runWithTimeout,
    validateTestResult
} = require('../test/helpers/testHelpers.js');

const { APPLICATION, ENVIRONMENT } = require('../utils/constants.js');
const { isTestEnvironment, getNodeJSInfo } = require('../utils/environment.js');

// Global variables for test execution state management
let testLogger = createTestLogger('test-script');
let testStartTime = Date.now();
let globalTestSetup = null;
let testConfigManager = null;
let testResults = { passed: 0, failed: 0, skipped: 0, total: 0 };

/**
 * Parses command line arguments to configure test execution options including 
 * test type filters, coverage reporting, parallel execution, and output formatting.
 * Provides comprehensive argument parsing for test automation and CI/CD integration.
 * 
 * @param {Array<string>} argv - Command line arguments array from process.argv
 * @returns {Object} Parsed command line options object with test configuration parameters
 */
function parseCommandLineArguments(argv) {
    // Initialize default test options with standard configuration values
    const defaultOptions = {
        testTypes: ['unit', 'integration', 'e2e'], // Run all test types by default
        coverage: false,                          // Disable coverage by default
        parallel: true,                          // Enable parallel execution
        reporter: 'spec',                        // Use spec reporter for detailed output
        timeout: 30000,                          // 30 second timeout for test execution
        verbose: false,                          // Disable verbose output by default
        watch: false,                           // Disable watch mode by default
        bail: false,                            // Continue on test failures
        retries: 0                              // No test retries by default
    };

    const options = { ...defaultOptions };
    
    // Parse command line arguments for test type filters (unit, integration, e2e)
    const typeIndex = argv.indexOf('--type');
    if (typeIndex !== -1 && argv[typeIndex + 1]) {
        const requestedTypes = argv[typeIndex + 1].split(',').map(type => type.trim().toLowerCase());
        const validTypes = ['unit', 'integration', 'e2e'];
        options.testTypes = requestedTypes.filter(type => validTypes.includes(type));
        
        if (options.testTypes.length === 0) {
            testLogger.warn('Invalid test types specified, running all test types');
            options.testTypes = defaultOptions.testTypes;
        }
    }

    // Check for coverage reporting flag (--coverage) to enable coverage analysis
    if (argv.includes('--coverage')) {
        options.coverage = true;
        testLogger.info('Code coverage analysis enabled');
    }

    // Parse parallel execution options (--parallel) for concurrent test execution
    if (argv.includes('--no-parallel')) {
        options.parallel = false;
        testLogger.info('Parallel test execution disabled');
    }

    // Extract reporter options (--reporter) for test output formatting
    const reporterIndex = argv.indexOf('--reporter');
    if (reporterIndex !== -1 && argv[reporterIndex + 1]) {
        const validReporters = ['spec', 'tap', 'dot', 'junit'];
        const requestedReporter = argv[reporterIndex + 1].toLowerCase();
        if (validReporters.includes(requestedReporter)) {
            options.reporter = requestedReporter;
        } else {
            testLogger.warn(`Invalid reporter "${requestedReporter}", using default spec reporter`);
        }
    }

    // Parse timeout options (--timeout) for custom test execution timeouts
    const timeoutIndex = argv.indexOf('--timeout');
    if (timeoutIndex !== -1 && argv[timeoutIndex + 1]) {
        const timeoutValue = parseInt(argv[timeoutIndex + 1], 10);
        if (!isNaN(timeoutValue) && timeoutValue > 0) {
            options.timeout = timeoutValue;
            testLogger.info(`Test timeout set to ${timeoutValue}ms`);
        } else {
            testLogger.warn('Invalid timeout value, using default 30000ms');
        }
    }

    // Handle verbose flag (--verbose) for detailed test output
    if (argv.includes('--verbose') || argv.includes('-v')) {
        options.verbose = true;
        testLogger.info('Verbose output enabled');
    }

    // Handle watch mode flag (--watch) for continuous test execution
    if (argv.includes('--watch') || argv.includes('-w')) {
        options.watch = true;
        testLogger.info('Watch mode enabled - tests will rerun on file changes');
    }

    // Handle bail flag (--bail) to stop on first test failure
    if (argv.includes('--bail')) {
        options.bail = true;
        testLogger.info('Bail mode enabled - will stop on first test failure');
    }

    // Parse retry options (--retries) for flaky test handling
    const retriesIndex = argv.indexOf('--retries');
    if (retriesIndex !== -1 && argv[retriesIndex + 1]) {
        const retriesValue = parseInt(argv[retriesIndex + 1], 10);
        if (!isNaN(retriesValue) && retriesValue >= 0) {
            options.retries = retriesValue;
            testLogger.info(`Test retries set to ${retriesValue}`);
        }
    }

    // Validate parsed options and set defaults for missing parameters
    if (options.testTypes.length === 0) {
        options.testTypes = defaultOptions.testTypes;
        testLogger.warn('No valid test types specified, running all test types');
    }

    // Log final configuration for debugging and transparency
    testLogger.info('Test execution configuration:', {
        testTypes: options.testTypes,
        coverage: options.coverage,
        parallel: options.parallel,
        reporter: options.reporter,
        timeout: options.timeout,
        verbose: options.verbose,
        watch: options.watch,
        bail: options.bail,
        retries: options.retries
    });

    // Return complete command line options object for test configuration
    return options;
}

/**
 * Discovers and categorizes test files based on file patterns and directory structure,
 * supporting unit, integration, and end-to-end test organization. Implements recursive
 * directory scanning with pattern matching for comprehensive test file discovery.
 * 
 * @param {Object} options - Test execution options including test type filters
 * @returns {Promise<Object>} Promise resolving to categorized test files object with unit, integration, and e2e test arrays
 */
async function discoverTestFiles(options) {
    // Define test file patterns for different test categories
    const testPatterns = {
        unit: [
            '**/*.test.js',
            '**/*.spec.js',
            '**/test/**/*.js',
            '**/tests/**/*.js'
        ],
        integration: [
            '**/*.integration.test.js',
            '**/*.integration.spec.js',
            '**/integration/**/*.test.js',
            '**/integration/**/*.spec.js'
        ],
        e2e: [
            '**/*.e2e.test.js',
            '**/*.e2e.spec.js',
            '**/e2e/**/*.test.js',
            '**/e2e/**/*.spec.js'
        ]
    };

    const discoveredFiles = {
        unit: [],
        integration: [],
        e2e: [],
        total: 0
    };

    try {
        // Scan test directory recursively using fs.readdir with recursive option
        const testDirectory = path.join(process.cwd(), 'src', 'backend', 'test');
        
        // Check if test directory exists
        try {
            await fs.access(testDirectory);
        } catch (error) {
            testLogger.warn(`Test directory not found: ${testDirectory}`);
            return discoveredFiles;
        }

        // Recursively scan test directory for test files
        const scanDirectory = async (dir, basePath = '') => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.join(basePath, entry.name);
                
                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    await scanDirectory(fullPath, relativePath);
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    // Categorize test files based on naming patterns
                    await categorizeTestFile(fullPath, relativePath);
                }
            }
        };

        // Categorize test files into unit, integration, and e2e arrays
        const categorizeTestFile = async (filePath, relativePath) => {
            // Validate test file accessibility and readability
            try {
                await fs.access(filePath, fs.constants.R_OK);
            } catch (error) {
                testLogger.warn(`Test file not readable: ${relativePath}`);
                return;
            }

            const fileName = path.basename(relativePath);
            
            // Check for integration test patterns
            if (fileName.includes('.integration.') || relativePath.includes('/integration/')) {
                if (options.testTypes.includes('integration')) {
                    discoveredFiles.integration.push(filePath);
                }
            }
            // Check for e2e test patterns
            else if (fileName.includes('.e2e.') || relativePath.includes('/e2e/')) {
                if (options.testTypes.includes('e2e')) {
                    discoveredFiles.e2e.push(filePath);
                }
            }
            // Default to unit tests
            else if (fileName.includes('.test.') || fileName.includes('.spec.') || 
                     relativePath.includes('/unit/') || relativePath.includes('/test/')) {
                if (options.testTypes.includes('unit')) {
                    discoveredFiles.unit.push(filePath);
                }
            }
        };

        // Start directory scanning from test root
        await scanDirectory(testDirectory);

        // Apply test type filters from command line options if specified
        const totalFiles = discoveredFiles.unit.length + discoveredFiles.integration.length + discoveredFiles.e2e.length;
        discoveredFiles.total = totalFiles;

        // Log discovered test files with categories and counts
        testLogger.info('Test file discovery completed:', {
            unit: discoveredFiles.unit.length,
            integration: discoveredFiles.integration.length,
            e2e: discoveredFiles.e2e.length,
            total: totalFiles
        });

        if (options.verbose) {
            testLogger.debug('Discovered unit test files:', discoveredFiles.unit);
            testLogger.debug('Discovered integration test files:', discoveredFiles.integration);
            testLogger.debug('Discovered e2e test files:', discoveredFiles.e2e);
        }

        // Return categorized test files object for test execution planning
        return discoveredFiles;

    } catch (error) {
        testLogger.error('Test file discovery failed:', error.message);
        throw new Error(`Failed to discover test files: ${error.message}`);
    }
}

/**
 * Sets up test execution environment including global test setup, configuration validation,
 * environment preparation, and test infrastructure initialization. Ensures consistent
 * test environment across all test suites with proper cleanup procedures.
 * 
 * @param {Object} testOptions - Test execution options and configuration
 * @returns {Promise<Object>} Promise resolving to test execution setup results with configuration and environment status
 */
async function setupTestExecution(testOptions) {
    testLogger.info('Initializing test execution environment...');
    
    try {
        // Create and initialize TestConfigManager with test options and validation
        testConfigManager = new TestConfigManager();
        await testConfigManager.initialize({
            ...testOptions,
            environment: ENVIRONMENT.TEST
        });

        // Validate test configuration for completeness and correctness
        const configValidation = testConfigManager.isValid();
        if (!configValidation.isValid) {
            testLogger.error('Test configuration validation failed:', configValidation.errors);
            throw new Error(`Invalid test configuration: ${configValidation.errors.join(', ')}`);
        }

        // Initialize global test setup using GlobalTestSetup for environment preparation
        globalTestSetup = new GlobalTestSetup();
        const setupResult = await globalTestSetup.initialize({
            config: testConfigManager.getConfig(),
            logger: testLogger
        });

        if (!setupResult.success) {
            testLogger.error('Global test setup initialization failed:', setupResult.error);
            throw new Error(`Test setup failed: ${setupResult.error}`);
        }

        // Validate test environment using isTestEnvironment and getNodeJSInfo
        if (!isTestEnvironment()) {
            testLogger.warn('NODE_ENV is not set to "test", setting test environment');
            process.env.NODE_ENV = 'test';
        }

        const nodeInfo = getNodeJSInfo();
        testLogger.info('Node.js runtime information:', {
            version: nodeInfo.node.version,
            platform: nodeInfo.node.platform,
            architecture: nodeInfo.node.architecture,
            memory: `${nodeInfo.memory.rss}MB RSS`
        });

        // Set up test logging configuration with appropriate log levels for test output
        testLogger.info('Test logging configured for test environment');

        // Initialize test coverage collection if coverage reporting is enabled
        if (testOptions.coverage) {
            testLogger.info('Code coverage collection enabled');
            // Coverage is handled by --experimental-test-coverage flag in test execution
        }

        // Configure test timeout settings and parallel execution parameters
        const executionConfig = {
            timeout: testOptions.timeout,
            parallel: testOptions.parallel,
            retries: testOptions.retries,
            bail: testOptions.bail
        };

        testLogger.info('Test execution parameters configured:', executionConfig);

        // Prepare test database and external service mocks if required
        // Note: This tutorial application doesn't use databases or external services
        testLogger.debug('No external dependencies to mock for tutorial application');

        // Log test execution setup completion with configuration summary
        testLogger.info('Test execution environment setup completed successfully');

        // Return setup results with configuration validation and environment status
        return {
            success: true,
            configManager: testConfigManager,
            globalSetup: globalTestSetup,
            nodeInfo,
            executionConfig,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        testLogger.error('Test execution setup failed:', error.message);
        
        // Attempt cleanup on setup failure
        if (globalTestSetup) {
            try {
                await globalTestSetup.cleanup();
            } catch (cleanupError) {
                testLogger.error('Cleanup during setup failure:', cleanupError.message);
            }
        }

        throw error;
    }
}

/**
 * Executes a specific test suite (unit, integration, or e2e) using Node.js child process
 * with proper error handling, timeout management, and result collection. Supports
 * parallel execution and comprehensive result aggregation for quality reporting.
 * 
 * @param {string} suiteType - Type of test suite to execute (unit, integration, e2e)
 * @param {Array<string>} testFiles - Array of test file paths to execute
 * @param {Object} executionOptions - Test execution configuration options
 * @returns {Promise<Object>} Promise resolving to test suite execution results with pass/fail counts and detailed results
 */
async function runTestSuite(suiteType, testFiles, executionOptions) {
    // Create test suite logger for suite-specific logging and reporting
    const suiteLogger = createTestLogger(`test-suite-${suiteType}`);
    suiteLogger.info(`Starting ${suiteType} test suite execution with ${testFiles.length} test files`);

    if (testFiles.length === 0) {
        suiteLogger.warn(`No ${suiteType} test files found, skipping suite`);
        return {
            suiteType,
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            coverage: null,
            errors: [],
            details: []
        };
    }

    const startTime = Date.now();
    
    try {
        // Prepare Node.js test runner command with appropriate flags and options
        const testCommand = 'node';
        const testArgs = ['--test'];

        // Add coverage flag (--experimental-test-coverage) if coverage is enabled
        if (executionOptions.coverage && suiteType === 'integration') {
            // Only enable coverage for integration tests to avoid duplication
            testArgs.push('--experimental-test-coverage');
            suiteLogger.info('Code coverage enabled for integration test suite');
        }

        // Configure reporter flag based on execution options
        if (executionOptions.reporter && executionOptions.reporter !== 'spec') {
            testArgs.push('--test-reporter', executionOptions.reporter);
        }

        // Add test files to command arguments
        testArgs.push(...testFiles);

        suiteLogger.debug(`Executing command: ${testCommand} ${testArgs.join(' ')}`);

        // Spawn child process for test execution using spawn from child_process
        const testProcess = spawn(testCommand, testArgs, {
            cwd: process.cwd(),
            env: {
                ...process.env,
                NODE_ENV: 'test',
                // Override any conflicting environment variables
                PORT: '0', // Use dynamic port allocation
                LOG_LEVEL: 'error' // Reduce log noise during testing
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        const testResults = {
            suiteType,
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            coverage: null,
            errors: [],
            details: []
        };

        // Handle test process stdout and stderr for result collection and logging
        testProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            
            if (executionOptions.verbose) {
                process.stdout.write(output);
            }
            
            // Parse test results from stdout in real-time
            parseTestOutput(output, testResults, suiteLogger);
        });

        testProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderr += errorOutput;
            
            if (executionOptions.verbose) {
                process.stderr.write(errorOutput);
            }
            
            // Collect error information for result reporting
            if (errorOutput.trim()) {
                testResults.errors.push(errorOutput.trim());
            }
        });

        // Monitor test execution with timeout protection using runWithTimeout
        const processResult = await runWithTimeout(
            new Promise((resolve, reject) => {
                testProcess.on('close', (code) => {
                    const duration = Date.now() - startTime;
                    testResults.duration = duration;
                    
                    if (code === 0) {
                        suiteLogger.info(`${suiteType} test suite completed successfully in ${duration}ms`);
                        resolve(testResults);
                    } else {
                        const error = new Error(`Test process exited with code ${code}`);
                        error.code = code;
                        error.stdout = stdout;
                        error.stderr = stderr;
                        reject(error);
                    }
                });

                testProcess.on('error', (error) => {
                    suiteLogger.error(`Test process error: ${error.message}`);
                    reject(error);
                });
            }),
            executionOptions.timeout,
            `${suiteType} test suite execution`
        );

        // Parse test results from process output and collect pass/fail statistics
        const finalResults = await parseTestResults(stdout, stderr, testResults, suiteLogger);
        
        // Handle test process completion and error scenarios with proper cleanup
        suiteLogger.info(`${suiteType} test suite results:`, {
            passed: finalResults.passed,
            failed: finalResults.failed,
            skipped: finalResults.skipped,
            total: finalResults.total,
            duration: finalResults.duration
        });

        // Return comprehensive test suite results with execution metrics
        return finalResults;

    } catch (error) {
        const duration = Date.now() - startTime;
        suiteLogger.error(`${suiteType} test suite execution failed:`, error.message);

        // Return error result with failure information
        return {
            suiteType,
            passed: 0,
            failed: testFiles.length,
            skipped: 0,
            total: testFiles.length,
            duration,
            coverage: null,
            errors: [error.message],
            details: [{
                type: 'execution_error',
                message: error.message,
                timestamp: new Date().toISOString()
            }]
        };
    }
}

/**
 * Parses test output from Node.js test runner and updates test results object
 * with pass/fail statistics and detailed test information.
 * 
 * @param {string} output - Test runner output to parse
 * @param {Object} testResults - Test results object to update
 * @param {Object} logger - Logger instance for parsing information
 */
function parseTestOutput(output, testResults, logger) {
    const lines = output.split('\n');
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Parse TAP format output from Node.js test runner
        if (trimmedLine.startsWith('ok ') && !trimmedLine.includes('# Subtest')) {
            testResults.passed++;
            testResults.total++;
        } else if (trimmedLine.startsWith('not ok ')) {
            testResults.failed++;
            testResults.total++;
            
            // Extract test failure details
            const testName = trimmedLine.replace(/^not ok \d+ /, '');
            testResults.details.push({
                type: 'failure',
                test: testName,
                timestamp: new Date().toISOString()
            });
        } else if (trimmedLine.includes('# SKIP')) {
            testResults.skipped++;
            testResults.total++;
        }
        
        // Parse coverage information if present
        if (trimmedLine.includes('% Lines') || trimmedLine.includes('% Functions')) {
            if (!testResults.coverage) {
                testResults.coverage = {};
            }
            
            const coverageMatch = trimmedLine.match(/(\d+\.?\d*)% (\w+)/);
            if (coverageMatch) {
                const [, percentage, type] = coverageMatch;
                testResults.coverage[type.toLowerCase()] = parseFloat(percentage);
            }
        }
    });
}

/**
 * Parses final test results from stdout and stderr, extracting comprehensive
 * test execution statistics and coverage information.
 * 
 * @param {string} stdout - Standard output from test execution
 * @param {string} stderr - Standard error from test execution  
 * @param {Object} baseResults - Base test results object to enhance
 * @param {Object} logger - Logger instance for result parsing
 * @returns {Promise<Object>} Enhanced test results with detailed parsing
 */
async function parseTestResults(stdout, stderr, baseResults, logger) {
    const enhancedResults = { ...baseResults };
    
    // Parse summary line from TAP output
    const summaryMatch = stdout.match(/(\d+)\.\.(\d+)/);
    if (summaryMatch) {
        const [, , total] = summaryMatch;
        enhancedResults.total = parseInt(total, 10);
    }

    // Extract coverage data from coverage report
    if (stdout.includes('Coverage report')) {
        try {
            const coverageSection = stdout.split('Coverage report')[1];
            if (coverageSection) {
                const coverage = {};
                
                // Parse line coverage
                const lineMatch = coverageSection.match(/(\d+\.?\d*)% Lines/);
                if (lineMatch) {
                    coverage.lines = parseFloat(lineMatch[1]);
                }
                
                // Parse function coverage
                const functionMatch = coverageSection.match(/(\d+\.?\d*)% Functions/);
                if (functionMatch) {
                    coverage.functions = parseFloat(functionMatch[1]);
                }
                
                // Parse branch coverage
                const branchMatch = coverageSection.match(/(\d+\.?\d*)% Branches/);
                if (branchMatch) {
                    coverage.branches = parseFloat(branchMatch[1]);
                }
                
                enhancedResults.coverage = coverage;
                logger.debug('Coverage data parsed:', coverage);
            }
        } catch (coverageError) {
            logger.warn('Failed to parse coverage data:', coverageError.message);
        }
    }

    // Parse error details from stderr
    if (stderr.trim()) {
        const errorLines = stderr.split('\n').filter(line => line.trim());
        enhancedResults.errors.push(...errorLines);
    }

    return enhancedResults;
}

/**
 * Collects and aggregates test results from all test suites, calculating overall
 * statistics, coverage metrics, and performance data for comprehensive reporting.
 * 
 * @param {Array<Object>} suiteResults - Array of test suite results from all executed suites
 * @returns {Object} Aggregated test results object with overall statistics, coverage data, and performance metrics
 */
function collectTestResults(suiteResults) {
    // Initialize result aggregation object with zero counters for all metrics
    const aggregatedResults = {
        suites: suiteResults.length,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        successRate: 0,
        coverage: null,
        errors: [],
        details: [],
        performance: {
            averageTestTime: 0,
            slowestSuite: null,
            fastestSuite: null
        }
    };

    // Iterate through suite results and aggregate pass/fail/skip counts
    suiteResults.forEach(suiteResult => {
        aggregatedResults.totalTests += suiteResult.total;
        aggregatedResults.passed += suiteResult.passed;
        aggregatedResults.failed += suiteResult.failed;
        aggregatedResults.skipped += suiteResult.skipped;
        aggregatedResults.duration += suiteResult.duration;
        
        // Collect errors from all suites
        if (suiteResult.errors && suiteResult.errors.length > 0) {
            aggregatedResults.errors.push(...suiteResult.errors.map(error => ({
                suite: suiteResult.suiteType,
                error: error
            })));
        }
        
        // Collect detailed results from all suites
        if (suiteResult.details && suiteResult.details.length > 0) {
            aggregatedResults.details.push(...suiteResult.details.map(detail => ({
                ...detail,
                suite: suiteResult.suiteType
            })));
        }
    });

    // Calculate overall test success rate and quality metrics
    if (aggregatedResults.totalTests > 0) {
        aggregatedResults.successRate = (aggregatedResults.passed / aggregatedResults.totalTests) * 100;
        aggregatedResults.performance.averageTestTime = aggregatedResults.duration / aggregatedResults.totalTests;
    }

    // Collect and merge coverage data from all test suites if coverage is enabled
    const coverageResults = suiteResults
        .filter(suite => suite.coverage)
        .map(suite => suite.coverage);
    
    if (coverageResults.length > 0) {
        // Calculate weighted average coverage across all suites
        aggregatedResults.coverage = {
            lines: calculateAverageCoverage(coverageResults, 'lines'),
            functions: calculateAverageCoverage(coverageResults, 'functions'),
            branches: calculateAverageCoverage(coverageResults, 'branches') || 0
        };
    }

    // Aggregate performance metrics including execution times and memory usage
    if (suiteResults.length > 0) {
        const sortedByDuration = [...suiteResults].sort((a, b) => b.duration - a.duration);
        aggregatedResults.performance.slowestSuite = {
            type: sortedByDuration[0].suiteType,
            duration: sortedByDuration[0].duration
        };
        aggregatedResults.performance.fastestSuite = {
            type: sortedByDuration[sortedByDuration.length - 1].suiteType,
            duration: sortedByDuration[sortedByDuration.length - 1].duration
        };
    }

    // Determine overall test execution status (pass/fail) based on quality gates
    aggregatedResults.status = aggregatedResults.failed === 0 ? 'PASSED' : 'FAILED';
    
    testLogger.info('Test results aggregation completed:', {
        totalTests: aggregatedResults.totalTests,
        passed: aggregatedResults.passed,
        failed: aggregatedResults.failed,
        successRate: aggregatedResults.successRate.toFixed(2) + '%',
        status: aggregatedResults.status
    });

    // Return comprehensive aggregated results for reporting and validation
    return aggregatedResults;
}

/**
 * Calculates average coverage percentage across multiple coverage results.
 * 
 * @param {Array<Object>} coverageResults - Array of coverage objects
 * @param {string} metric - Coverage metric to calculate (lines, functions, branches)
 * @returns {number} Average coverage percentage for the specified metric
 */
function calculateAverageCoverage(coverageResults, metric) {
    const validResults = coverageResults.filter(coverage => 
        coverage[metric] !== undefined && !isNaN(coverage[metric])
    );
    
    if (validResults.length === 0) {
        return 0;
    }
    
    const sum = validResults.reduce((total, coverage) => total + coverage[metric], 0);
    return Math.round((sum / validResults.length) * 100) / 100;
}

/**
 * Generates comprehensive test execution report with statistics, coverage information,
 * performance metrics, and educational insights for tutorial purposes. Creates detailed
 * reports suitable for both console output and file export.
 * 
 * @param {Object} testResults - Aggregated test results from all test suites
 * @param {Object} reportOptions - Report generation options and formatting preferences
 * @returns {Object} Test report object with formatted output, statistics, and educational content
 */
function generateTestReport(testResults, reportOptions = {}) {
    const reportStartTime = Date.now();
    const totalExecutionTime = reportStartTime - testStartTime;
    
    // Create test report header with application information and test execution metadata
    const reportHeader = {
        application: {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            description: 'Node.js Tutorial Application - HTTP Server Fundamentals'
        },
        execution: {
            timestamp: new Date().toISOString(),
            duration: totalExecutionTime,
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            platform: process.platform
        }
    };

    // Format test execution statistics including pass/fail/skip counts and percentages
    const executionSummary = {
        overview: {
            totalSuites: testResults.suites,
            totalTests: testResults.totalTests,
            testsRun: testResults.passed + testResults.failed,
            testsPassed: testResults.passed,
            testsFailed: testResults.failed,
            testsSkipped: testResults.skipped,
            successRate: testResults.successRate.toFixed(2) + '%',
            status: testResults.status
        },
        timing: {
            totalDuration: `${totalExecutionTime}ms`,
            testExecution: `${testResults.duration}ms`,
            averageTestTime: testResults.performance.averageTestTime 
                ? `${testResults.performance.averageTestTime.toFixed(2)}ms` : 'N/A',
            slowestSuite: testResults.performance.slowestSuite 
                ? `${testResults.performance.slowestSuite.type} (${testResults.performance.slowestSuite.duration}ms)` : 'N/A',
            fastestSuite: testResults.performance.fastestSuite 
                ? `${testResults.performance.fastestSuite.type} (${testResults.performance.fastestSuite.duration}ms)` : 'N/A'
        }
    };

    // Generate coverage report section with line, function, and branch coverage details
    const coverageReport = testResults.coverage ? {
        enabled: true,
        metrics: {
            lines: {
                percentage: testResults.coverage.lines,
                status: testResults.coverage.lines >= 90 ? 'PASS' : 'WARN',
                target: '90%'
            },
            functions: {
                percentage: testResults.coverage.functions,
                status: testResults.coverage.functions >= 95 ? 'PASS' : 'WARN',
                target: '95%'
            },
            branches: {
                percentage: testResults.coverage.branches,
                status: testResults.coverage.branches >= 85 ? 'PASS' : 'WARN',
                target: '85%'
            }
        },
        overall: {
            status: (testResults.coverage.lines >= 90 && 
                    testResults.coverage.functions >= 95 && 
                    testResults.coverage.branches >= 85) ? 'PASS' : 'FAIL'
        }
    } : {
        enabled: false,
        message: 'Code coverage was not enabled for this test run. Use --coverage flag to enable.'
    };

    // Add error summary section with failure details and error categorization
    const errorSummary = {
        totalErrors: testResults.errors.length,
        hasErrors: testResults.errors.length > 0,
        categories: categorizeErrors(testResults.errors),
        details: testResults.errors.slice(0, 10), // Limit to first 10 errors for readability
        truncated: testResults.errors.length > 10
    };

    // Create educational insights section with learning points and best practices
    const educationalInsights = {
        testingConcepts: [
            'This test execution demonstrates Node.js built-in test runner capabilities',
            'Express.js 5.1.0 testing patterns using SuperTest for HTTP endpoint validation',
            'Code coverage analysis using --experimental-test-coverage flag',
            'Test organization with unit, integration, and end-to-end test categories'
        ],
        bestPractices: [
            'Use descriptive test names that explain expected behavior',
            'Organize tests by type (unit, integration, e2e) for better maintainability',
            'Maintain high code coverage (>90% lines, >95% functions) for quality assurance',
            'Implement proper test isolation to avoid dependencies between tests'
        ],
        nextSteps: generateNextSteps(testResults),
        resources: [
            'Node.js Test Runner Documentation: https://nodejs.org/api/test.html',
            'Express.js Testing Guide: https://expressjs.com/en/guide/testing.html',
            'SuperTest Documentation: https://github.com/ladjs/supertest',
            'Testing Best Practices: https://github.com/goldbergyoni/javascript-testing-best-practices'
        ]
    };

    // Include Node.js and Express.js version information for context
    const environmentInfo = {
        runtime: getNodeJSInfo(),
        dependencies: {
            express: '5.1.0',
            supertest: '7.1.1',
            nodeTestRunner: 'built-in'
        },
        configuration: {
            testEnvironment: process.env.NODE_ENV,
            coverageEnabled: reportOptions.coverage || false,
            parallelExecution: reportOptions.parallel !== false
        }
    };

    // Generate recommendations for test improvements and coverage enhancement
    const recommendations = generateRecommendations(testResults, coverageReport);

    // Return formatted test report for console output and file export
    const fullReport = {
        header: reportHeader,
        summary: executionSummary,
        coverage: coverageReport,
        errors: errorSummary,
        insights: educationalInsights,
        environment: environmentInfo,
        recommendations,
        raw: {
            testResults,
            reportOptions,
            generatedAt: new Date().toISOString()
        }
    };

    testLogger.info('Test report generation completed');
    return fullReport;
}

/**
 * Categorizes errors by type for better error analysis and reporting.
 * 
 * @param {Array<Object>} errors - Array of error objects from test execution
 * @returns {Object} Categorized errors by type (assertion, timeout, system, etc.)
 */
function categorizeErrors(errors) {
    const categories = {
        assertion: [],
        timeout: [],
        system: [],
        network: [],
        other: []
    };
    
    errors.forEach(errorInfo => {
        const error = typeof errorInfo === 'string' ? errorInfo : errorInfo.error;
        const errorLower = error.toLowerCase();
        
        if (errorLower.includes('assertion') || errorLower.includes('expected')) {
            categories.assertion.push(errorInfo);
        } else if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
            categories.timeout.push(errorInfo);
        } else if (errorLower.includes('econnrefused') || errorLower.includes('network')) {
            categories.network.push(errorInfo);
        } else if (errorLower.includes('system') || errorLower.includes('spawn')) {
            categories.system.push(errorInfo);
        } else {
            categories.other.push(errorInfo);
        }
    });
    
    return categories;
}

/**
 * Generates educational next steps based on test results and coverage.
 * 
 * @param {Object} testResults - Test execution results
 * @returns {Array<string>} Array of recommended next steps
 */
function generateNextSteps(testResults) {
    const nextSteps = [];
    
    if (testResults.failed > 0) {
        nextSteps.push('Review and fix failing tests to ensure application reliability');
        nextSteps.push('Analyze test failure patterns to identify common issues');
    }
    
    if (testResults.coverage && testResults.coverage.lines < 90) {
        nextSteps.push('Increase test coverage by adding tests for uncovered code paths');
        nextSteps.push('Focus on testing error handling and edge cases');
    }
    
    if (testResults.performance.averageTestTime > 100) {
        nextSteps.push('Optimize slow tests to improve development feedback cycle');
        nextSteps.push('Consider test parallelization for faster execution');
    }
    
    nextSteps.push('Explore advanced testing concepts like mocking and test doubles');
    nextSteps.push('Learn about continuous integration and automated testing workflows');
    
    return nextSteps;
}

/**
 * Generates specific recommendations based on test results and coverage data.
 * 
 * @param {Object} testResults - Test execution results
 * @param {Object} coverageReport - Coverage analysis results
 * @returns {Array<Object>} Array of recommendation objects with priority and action items
 */
function generateRecommendations(testResults, coverageReport) {
    const recommendations = [];
    
    // Coverage-based recommendations
    if (coverageReport.enabled && coverageReport.overall.status === 'FAIL') {
        recommendations.push({
            priority: 'HIGH',
            category: 'Coverage',
            title: 'Improve Code Coverage',
            description: 'Code coverage is below target thresholds',
            actions: [
                'Add tests for uncovered code paths',
                'Focus on edge cases and error handling',
                'Review coverage report for specific files needing attention'
            ]
        });
    }
    
    // Performance-based recommendations
    if (testResults.performance.averageTestTime > 50) {
        recommendations.push({
            priority: 'MEDIUM',
            category: 'Performance',
            title: 'Optimize Test Performance',
            description: 'Average test execution time is higher than optimal',
            actions: [
                'Profile slow tests and optimize test setup/teardown',
                'Consider using test doubles to avoid expensive operations',
                'Implement parallel test execution where possible'
            ]
        });
    }
    
    // Error-based recommendations
    if (testResults.failed > 0) {
        recommendations.push({
            priority: 'HIGH',
            category: 'Quality',
            title: 'Fix Failing Tests',
            description: `${testResults.failed} test(s) are currently failing`,
            actions: [
                'Review test failure details and error messages',
                'Fix application code or update test expectations',
                'Ensure tests are properly isolated and deterministic'
            ]
        });
    }
    
    // Educational recommendations
    recommendations.push({
        priority: 'LOW',
        category: 'Learning',
        title: 'Expand Testing Knowledge',
        description: 'Continue learning about testing best practices',
        actions: [
            'Explore advanced testing patterns like TDD and BDD',
            'Learn about integration testing with databases and external APIs',
            'Study continuous integration and deployment practices'
        ]
    });
    
    return recommendations;
}

/**
 * Validates test results against quality gate criteria including coverage thresholds,
 * success rates, and performance benchmarks. Implements comprehensive quality
 * assessment with configurable thresholds and detailed violation reporting.
 * 
 * @param {Object} testResults - Aggregated test results from all test suites
 * @param {Object} qualityGates - Quality gate configuration with thresholds and criteria
 * @returns {Object} Quality gate validation results with pass/fail status and detailed analysis
 */
function validateQualityGates(testResults, qualityGates = {}) {
    // Define default quality gate thresholds
    const defaultGates = {
        successRate: 100,        // 100% success rate for unit tests
        lineCoverage: 90,        // 90% line coverage requirement
        functionCoverage: 95,    // 95% function coverage requirement
        branchCoverage: 85,      // 85% branch coverage requirement
        maxFailures: 0,          // No test failures allowed
        maxAverageTestTime: 100, // Maximum 100ms average test time
        maxErrorCount: 0         // No errors allowed
    };

    const gates = { ...defaultGates, ...qualityGates };
    const validationResults = {
        passed: true,
        gates: [],
        violations: [],
        summary: {
            totalGates: 0,
            passedGates: 0,
            failedGates: 0
        }
    };

    // Check test success rate against minimum success rate threshold
    const successRateGate = {
        name: 'Test Success Rate',
        threshold: gates.successRate,
        actual: testResults.successRate,
        passed: testResults.successRate >= gates.successRate,
        critical: true
    };
    validationResults.gates.push(successRateGate);
    
    if (!successRateGate.passed) {
        validationResults.passed = false;
        validationResults.violations.push({
            gate: 'Test Success Rate',
            message: `Success rate ${testResults.successRate.toFixed(2)}% is below threshold ${gates.successRate}%`,
            severity: 'CRITICAL',
            recommendation: 'Fix failing tests to achieve 100% success rate'
        });
    }

    // Validate code coverage against threshold targets if coverage is available
    if (testResults.coverage) {
        // Line coverage validation
        const lineCoverageGate = {
            name: 'Line Coverage',
            threshold: gates.lineCoverage,
            actual: testResults.coverage.lines,
            passed: testResults.coverage.lines >= gates.lineCoverage,
            critical: true
        };
        validationResults.gates.push(lineCoverageGate);
        
        if (!lineCoverageGate.passed) {
            validationResults.passed = false;
            validationResults.violations.push({
                gate: 'Line Coverage',
                message: `Line coverage ${testResults.coverage.lines}% is below threshold ${gates.lineCoverage}%`,
                severity: 'HIGH',
                recommendation: 'Add tests to increase line coverage'
            });
        }

        // Function coverage validation
        const functionCoverageGate = {
            name: 'Function Coverage',
            threshold: gates.functionCoverage,
            actual: testResults.coverage.functions,
            passed: testResults.coverage.functions >= gates.functionCoverage,
            critical: true
        };
        validationResults.gates.push(functionCoverageGate);
        
        if (!functionCoverageGate.passed) {
            validationResults.passed = false;
            validationResults.violations.push({
                gate: 'Function Coverage',
                message: `Function coverage ${testResults.coverage.functions}% is below threshold ${gates.functionCoverage}%`,
                severity: 'HIGH',
                recommendation: 'Ensure all functions have test coverage'
            });
        }

        // Branch coverage validation
        const branchCoverageGate = {
            name: 'Branch Coverage',
            threshold: gates.branchCoverage,
            actual: testResults.coverage.branches,
            passed: testResults.coverage.branches >= gates.branchCoverage,
            critical: false
        };
        validationResults.gates.push(branchCoverageGate);
        
        if (!branchCoverageGate.passed) {
            validationResults.violations.push({
                gate: 'Branch Coverage',
                message: `Branch coverage ${testResults.coverage.branches}% is below threshold ${gates.branchCoverage}%`,
                severity: 'MEDIUM',
                recommendation: 'Test all conditional branches and error paths'
            });
        }
    }

    // Check performance metrics against benchmark thresholds
    if (testResults.performance.averageTestTime) {
        const performanceGate = {
            name: 'Average Test Performance',
            threshold: gates.maxAverageTestTime,
            actual: testResults.performance.averageTestTime,
            passed: testResults.performance.averageTestTime <= gates.maxAverageTestTime,
            critical: false
        };
        validationResults.gates.push(performanceGate);
        
        if (!performanceGate.passed) {
            validationResults.violations.push({
                gate: 'Average Test Performance',
                message: `Average test time ${testResults.performance.averageTestTime.toFixed(2)}ms exceeds threshold ${gates.maxAverageTestTime}ms`,
                severity: 'LOW',
                recommendation: 'Optimize slow tests for better development experience'
            });
        }
    }

    // Validate error rate is within acceptable limits
    const errorCountGate = {
        name: 'Error Count',
        threshold: gates.maxErrorCount,
        actual: testResults.errors.length,
        passed: testResults.errors.length <= gates.maxErrorCount,
        critical: false
    };
    validationResults.gates.push(errorCountGate);
    
    if (!errorCountGate.passed) {
        validationResults.violations.push({
            gate: 'Error Count',
            message: `${testResults.errors.length} errors detected, maximum allowed is ${gates.maxErrorCount}`,
            severity: 'MEDIUM',
            recommendation: 'Review and resolve test execution errors'
        });
    }

    // Calculate gate summary statistics
    validationResults.summary.totalGates = validationResults.gates.length;
    validationResults.summary.passedGates = validationResults.gates.filter(gate => gate.passed).length;
    validationResults.summary.failedGates = validationResults.gates.filter(gate => !gate.passed).length;

    // Determine overall quality gate status based on all criteria
    const overallStatus = validationResults.passed ? 'PASSED' : 'FAILED';
    const criticalViolations = validationResults.violations.filter(v => v.severity === 'CRITICAL').length;
    
    validationResults.status = overallStatus;
    validationResults.criticalViolations = criticalViolations;
    validationResults.timestamp = new Date().toISOString();

    testLogger.info('Quality gate validation completed:', {
        status: overallStatus,
        passedGates: validationResults.summary.passedGates,
        totalGates: validationResults.summary.totalGates,
        violations: validationResults.violations.length,
        criticalViolations
    });

    // Return quality gate validation results with actionable recommendations
    return validationResults;
}

/**
 * Handles test execution failures with detailed error analysis, failure categorization,
 * and educational guidance for debugging and resolution. Provides comprehensive failure
 * analysis and actionable recommendations for issue resolution.
 * 
 * @param {Object} testResults - Aggregated test results including failure information
 * @param {Object} failureOptions - Options for failure handling and analysis
 * @returns {Object} Failure handling results with error analysis, debugging guidance, and recovery suggestions
 */
function handleTestFailures(testResults, failureOptions = {}) {
    const failureAnalysis = {
        hasFailures: testResults.failed > 0 || testResults.errors.length > 0,
        failureSummary: {
            failedTests: testResults.failed,
            totalErrors: testResults.errors.length,
            affectedSuites: []
        },
        categories: {
            assertion: [],
            timeout: [],
            system: [],
            network: [],
            configuration: [],
            other: []
        },
        debugging: {
            commonIssues: [],
            troubleshooting: [],
            quickFixes: []
        },
        educational: {
            concepts: [],
            resources: [],
            examples: []
        }
    };

    // Categorize test failures by type (assertion failures, timeout errors, system errors)
    testResults.details.forEach(detail => {
        if (detail.type === 'failure') {
            const errorType = categorizeFailure(detail);
            failureAnalysis.categories[errorType].push(detail);
        }
    });

    // Extract detailed error information including stack traces and error context
    testResults.errors.forEach(errorInfo => {
        const error = typeof errorInfo === 'string' ? errorInfo : errorInfo.error;
        const suite = typeof errorInfo === 'object' ? errorInfo.suite : 'unknown';
        
        if (!failureAnalysis.failureSummary.affectedSuites.includes(suite)) {
            failureAnalysis.failureSummary.affectedSuites.push(suite);
        }
        
        // Analyze specific error patterns
        analyzeErrorPattern(error, failureAnalysis);
    });

    // Generate debugging guidance specific to Node.js and Express.js testing
    failureAnalysis.debugging.commonIssues = [
        'Port conflicts: Ensure test server uses unique ports or dynamic allocation',
        'Async timing issues: Use proper await/async patterns in test code',
        'Test isolation: Ensure tests don\'t depend on each other or shared state',
        'Environment variables: Verify NODE_ENV=test and required config variables',
        'Module imports: Check that all required modules are properly imported'
    ];

    failureAnalysis.debugging.troubleshooting = [
        'Run tests individually to isolate failures: node --test specific-test.js',
        'Enable verbose output for detailed information: --verbose flag',
        'Check test setup and teardown procedures for proper cleanup',
        'Verify Express.js application starts correctly in test environment',
        'Review SuperTest assertions for correct HTTP status codes and responses'
    ];

    failureAnalysis.debugging.quickFixes = [
        'Increase test timeouts if tests are timing out: --timeout flag',
        'Clear Node.js require cache between tests for fresh module loading',
        'Use beforeEach/afterEach hooks for proper test setup and cleanup',
        'Mock external dependencies to avoid network-related test failures',
        'Ensure test assertions use exact equality (===) where appropriate'
    ];

    // Provide educational content about error types and resolution strategies
    failureAnalysis.educational.concepts = [
        'Test Isolation: Each test should be independent and not affect others',
        'Async Testing: Proper handling of promises and async operations in tests',
        'HTTP Testing: Using SuperTest for testing Express.js endpoints effectively',
        'Error Handling: Testing both success and failure scenarios',
        'Test Data: Managing test data and avoiding hard-coded values'
    ];

    failureAnalysis.educational.resources = [
        'Node.js Test Runner: https://nodejs.org/api/test.html',
        'Express.js Testing: https://expressjs.com/en/guide/testing.html',
        'SuperTest Guide: https://github.com/ladjs/supertest#readme',
        'Testing Best Practices: https://github.com/goldbergyoni/javascript-testing-best-practices',
        'Debugging Node.js: https://nodejs.org/en/guides/debugging-getting-started/'
    ];

    failureAnalysis.educational.examples = generateFailureExamples(testResults);

    // Create failure summary with actionable recommendations for fixes
    const recoverySuggestions = {
        immediate: [
            'Review test output for specific error messages and stack traces',
            'Run failing tests individually to isolate the root cause',
            'Check that the Express.js application starts without errors'
        ],
        shortTerm: [
            'Improve test isolation by ensuring proper setup/teardown',
            'Add more detailed assertions to pinpoint exact failure points',
            'Implement proper error handling in test code'
        ],
        longTerm: [
            'Establish consistent testing patterns across the codebase',
            'Create comprehensive test documentation and guidelines',
            'Implement automated test quality monitoring'
        ]
    };

    // Include references to relevant documentation and learning resources
    const documentationLinks = {
        nodeJsTesting: 'https://nodejs.org/api/test.html',
        expressTesting: 'https://expressjs.com/en/guide/testing.html',
        supertestDocs: 'https://github.com/ladjs/supertest',
        testingPatterns: 'https://github.com/goldbergyoni/javascript-testing-best-practices',
        debuggingGuide: 'https://nodejs.org/en/guides/debugging-getting-started/'
    };

    const finalAnalysis = {
        ...failureAnalysis,
        recovery: recoverySuggestions,
        documentation: documentationLinks,
        timestamp: new Date().toISOString(),
        options: failureOptions
    };

    // Log detailed failure information for developer debugging
    testLogger.error('Test failure analysis completed:', {
        hasFailures: finalAnalysis.hasFailures,
        failedTests: finalAnalysis.failureSummary.failedTests,
        totalErrors: finalAnalysis.failureSummary.totalErrors,
        affectedSuites: finalAnalysis.failureSummary.affectedSuites.length
    });

    // Return comprehensive failure analysis for educational purposes
    return finalAnalysis;
}

/**
 * Categorizes individual test failures for better analysis.
 * 
 * @param {Object} failureDetail - Failure detail object
 * @returns {string} Failure category
 */
function categorizeFailure(failureDetail) {
    const message = failureDetail.test || failureDetail.message || '';
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('assertion') || messageLower.includes('expected')) {
        return 'assertion';
    } else if (messageLower.includes('timeout')) {
        return 'timeout';
    } else if (messageLower.includes('econnrefused') || messageLower.includes('network')) {
        return 'network';
    } else if (messageLower.includes('config') || messageLower.includes('environment')) {
        return 'configuration';
    } else if (messageLower.includes('spawn') || messageLower.includes('system')) {
        return 'system';
    }
    
    return 'other';
}

/**
 * Analyzes error patterns to provide specific guidance.
 * 
 * @param {string} error - Error message to analyze
 * @param {Object} analysis - Analysis object to update
 */
function analyzeErrorPattern(error, analysis) {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('eaddrinuse')) {
        analysis.debugging.quickFixes.unshift('Port already in use - ensure previous test processes are terminated');
    } else if (errorLower.includes('econnrefused')) {
        analysis.debugging.quickFixes.unshift('Connection refused - verify test server is running');
    } else if (errorLower.includes('timeout')) {
        analysis.debugging.quickFixes.unshift('Timeout error - increase test timeout or optimize test performance');
    } else if (errorLower.includes('cannot find module')) {
        analysis.debugging.quickFixes.unshift('Module not found - check import paths and module installation');
    }
}

/**
 * Generates educational examples based on test failures.
 * 
 * @param {Object} testResults - Test results with failure information
 * @returns {Array<Object>} Array of educational examples
 */
function generateFailureExamples(testResults) {
    const examples = [];
    
    if (testResults.failed > 0) {
        examples.push({
            topic: 'Fixing Assertion Failures',
            description: 'Common assertion patterns and how to fix them',
            code: `
// Incorrect assertion
assert.equal(response.statusCode, 200); // May fail due to type coercion

// Correct assertion
assert.strictEqual(response.statusCode, 200); // Strict equality check
            `
        });
    }
    
    if (testResults.errors.some(e => e.includes && e.includes('timeout'))) {
        examples.push({
            topic: 'Handling Async Tests',
            description: 'Proper async/await usage in tests',
            code: `
// Incorrect async test
test('should respond to /hello', () => {
    request(app).get('/hello').expect(200); // Missing await
});

// Correct async test
test('should respond to /hello', async () => {
    await request(app).get('/hello').expect(200);
});
            `
        });
    }
    
    return examples;
}

/**
 * Performs comprehensive cleanup of test execution including resource cleanup,
 * environment restoration, and test infrastructure teardown. Ensures proper
 * cleanup even in error scenarios with graceful degradation.
 * 
 * @param {Object} cleanupOptions - Options for cleanup behavior and configuration
 * @returns {Promise<void>} Promise resolving when all cleanup operations are complete
 */
async function cleanupTestExecution(cleanupOptions = {}) {
    testLogger.info('Starting test execution cleanup...');
    const cleanupStartTime = Date.now();
    const cleanupResults = {
        operations: [],
        errors: [],
        duration: 0
    };

    try {
        // Stop any running test servers and close network connections
        if (globalTestSetup) {
            testLogger.debug('Cleaning up global test setup...');
            try {
                await globalTestSetup.cleanup();
                cleanupResults.operations.push('Global test setup cleanup completed');
            } catch (setupCleanupError) {
                testLogger.error('Failed to cleanup global test setup:', setupCleanupError.message);
                cleanupResults.errors.push(`Global setup cleanup: ${setupCleanupError.message}`);
            }
        }

        // Clean up test configuration manager
        if (testConfigManager) {
            testLogger.debug('Cleaning up test configuration manager...');
            try {
                // TestConfigManager cleanup if it has cleanup methods
                if (typeof testConfigManager.cleanup === 'function') {
                    await testConfigManager.cleanup();
                }
                testConfigManager = null;
                cleanupResults.operations.push('Test configuration manager cleanup completed');
            } catch (configCleanupError) {
                testLogger.error('Failed to cleanup test configuration:', configCleanupError.message);
                cleanupResults.errors.push(`Config cleanup: ${configCleanupError.message}`);
            }
        }

        // Reset process environment variables to original values
        if (cleanupOptions.resetEnvironment !== false) {
            testLogger.debug('Resetting environment variables...');
            try {
                // Reset NODE_ENV if it was modified for testing
                if (process.env.NODE_ENV === 'test' && cleanupOptions.originalNodeEnv) {
                    process.env.NODE_ENV = cleanupOptions.originalNodeEnv;
                }
                
                // Reset any other environment variables that were modified
                if (cleanupOptions.originalEnvVars) {
                    Object.keys(cleanupOptions.originalEnvVars).forEach(key => {
                        process.env[key] = cleanupOptions.originalEnvVars[key];
                    });
                }
                
                cleanupResults.operations.push('Environment variables reset completed');
            } catch (envCleanupError) {
                testLogger.error('Failed to reset environment variables:', envCleanupError.message);
                cleanupResults.errors.push(`Environment reset: ${envCleanupError.message}`);
            }
        }

        // Clear test caches and temporary data structures
        testLogger.debug('Clearing test caches...');
        try {
            // Clear require cache for test modules if needed
            if (cleanupOptions.clearRequireCache) {
                Object.keys(require.cache).forEach(key => {
                    if (key.includes('/test/') || key.includes('.test.')) {
                        delete require.cache[key];
                    }
                });
            }
            
            // Reset global test variables
            testResults = { passed: 0, failed: 0, skipped: 0, total: 0 };
            cleanupResults.operations.push('Test caches cleared');
        } catch (cacheCleanupError) {
            testLogger.error('Failed to clear test caches:', cacheCleanupError.message);
            cleanupResults.errors.push(`Cache cleanup: ${cacheCleanupError.message}`);
        }

        // Perform garbage collection to free memory resources
        if (cleanupOptions.forceGC !== false && global.gc) {
            testLogger.debug('Performing garbage collection...');
            try {
                global.gc();
                cleanupResults.operations.push('Garbage collection completed');
            } catch (gcError) {
                testLogger.warn('Garbage collection failed:', gcError.message);
                cleanupResults.errors.push(`Garbage collection: ${gcError.message}`);
            }
        }

        // Calculate cleanup duration
        cleanupResults.duration = Date.now() - cleanupStartTime;

        // Log cleanup completion with summary of operations performed
        testLogger.info('Test execution cleanup completed successfully:', {
            operations: cleanupResults.operations.length,
            errors: cleanupResults.errors.length,
            duration: cleanupResults.duration
        });

        if (cleanupResults.errors.length > 0) {
            testLogger.warn('Cleanup completed with errors:', cleanupResults.errors);
        }

    } catch (error) {
        // Handle cleanup errors gracefully with appropriate error logging
        testLogger.error('Critical error during test execution cleanup:', error.message);
        cleanupResults.errors.push(`Critical cleanup error: ${error.message}`);
        cleanupResults.duration = Date.now() - cleanupStartTime;
        
        // Don't throw cleanup errors to avoid masking original test failures
        testLogger.warn('Continuing despite cleanup errors to preserve test results');
    }

    return cleanupResults;
}

/**
 * Displays comprehensive test execution summary with statistics, educational insights,
 * and next steps for the tutorial application. Provides formatted console output
 * with colors and educational content for enhanced learning experience.
 * 
 * @param {Object} testReport - Complete test report with all statistics and analysis
 * @param {Object} displayOptions - Options for output formatting and content selection
 * @returns {void} No return value - outputs formatted summary to console
 */
function displayTestSummary(testReport, displayOptions = {}) {
    const colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m'
    };

    const success = testReport.summary.overview.status === 'PASSED';
    const primaryColor = success ? colors.green : colors.red;
    const statusIcon = success ? '✅' : '❌';

    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}${colors.cyan}${statusIcon} NODE.JS TUTORIAL APPLICATION - TEST EXECUTION SUMMARY${colors.reset}`);
    console.log('='.repeat(80));

    // Display test execution header with application name and version information
    console.log(`${colors.bright}Application:${colors.reset} ${testReport.header.application.name} v${testReport.header.application.version}`);
    console.log(`${colors.bright}Description:${colors.reset} ${testReport.header.application.description}`);
    console.log(`${colors.bright}Execution Time:${colors.reset} ${new Date(testReport.header.execution.timestamp).toLocaleString()}`);
    console.log(`${colors.bright}Environment:${colors.reset} ${testReport.header.execution.environment}`);
    console.log(`${colors.bright}Node.js Version:${colors.reset} ${testReport.header.execution.nodeVersion}`);
    console.log(`${colors.bright}Platform:${colors.reset} ${testReport.header.execution.platform}`);

    // Show test execution statistics in formatted table with pass/fail/skip counts
    console.log('\n' + colors.bright + '📊 TEST EXECUTION RESULTS' + colors.reset);
    console.log('─'.repeat(50));
    
    const summary = testReport.summary.overview;
    console.log(`${colors.bright}Test Suites:${colors.reset}      ${summary.totalSuites}`);
    console.log(`${colors.bright}Total Tests:${colors.reset}      ${summary.totalTests}`);
    console.log(`${primaryColor}${colors.bright}Tests Passed:${colors.reset}     ${summary.testsPassed}`);
    
    if (summary.testsFailed > 0) {
        console.log(`${colors.red}${colors.bright}Tests Failed:${colors.reset}     ${summary.testsFailed}`);
    }
    
    if (summary.testsSkipped > 0) {
        console.log(`${colors.yellow}${colors.bright}Tests Skipped:${colors.reset}    ${summary.testsSkipped}`);
    }
    
    console.log(`${primaryColor}${colors.bright}Success Rate:${colors.reset}     ${summary.successRate}`);
    console.log(`${colors.bright}Overall Status:${colors.reset}   ${primaryColor}${summary.status}${colors.reset}`);

    // Display performance metrics including execution time and resource usage
    console.log('\n' + colors.bright + '⚡ PERFORMANCE METRICS' + colors.reset);
    console.log('─'.repeat(50));
    
    const timing = testReport.summary.timing;
    console.log(`${colors.bright}Total Duration:${colors.reset}   ${timing.totalDuration}`);
    console.log(`${colors.bright}Test Execution:${colors.reset}   ${timing.testExecution}`);
    console.log(`${colors.bright}Average Test:${colors.reset}     ${timing.averageTestTime}`);
    
    if (timing.slowestSuite !== 'N/A') {
        console.log(`${colors.bright}Slowest Suite:${colors.reset}    ${timing.slowestSuite}`);
    }
    
    if (timing.fastestSuite !== 'N/A') {
        console.log(`${colors.bright}Fastest Suite:${colors.reset}    ${timing.fastestSuite}`);
    }

    // Display coverage information with percentage and threshold comparisons
    if (testReport.coverage.enabled) {
        console.log('\n' + colors.bright + '📈 CODE COVERAGE ANALYSIS' + colors.reset);
        console.log('─'.repeat(50));
        
        const coverage = testReport.coverage.metrics;
        Object.entries(coverage).forEach(([type, data]) => {
            const statusColor = data.status === 'PASS' ? colors.green : colors.yellow;
            const statusIcon = data.status === 'PASS' ? '✅' : '⚠️';
            console.log(`${statusIcon} ${colors.bright}${type.charAt(0).toUpperCase() + type.slice(1)}:${colors.reset} ${statusColor}${data.percentage}%${colors.reset} (target: ${data.target})`);
        });
        
        const overallStatus = testReport.coverage.overall.status;
        const overallColor = overallStatus === 'PASS' ? colors.green : colors.red;
        console.log(`${colors.bright}Overall Coverage:${colors.reset} ${overallColor}${overallStatus}${colors.reset}`);
    } else {
        console.log('\n' + colors.bright + '📈 CODE COVERAGE ANALYSIS' + colors.reset);
        console.log('─'.repeat(50));
        console.log(`${colors.yellow}Coverage reporting was not enabled.${colors.reset}`);
        console.log(`${colors.cyan}💡 Use --coverage flag to enable code coverage analysis${colors.reset}`);
    }

    // Show quality gate results with pass/fail status and recommendations
    if (displayOptions.qualityGates) {
        console.log('\n' + colors.bright + '🚪 QUALITY GATES' + colors.reset);
        console.log('─'.repeat(50));
        
        displayOptions.qualityGates.gates.forEach(gate => {
            const gateColor = gate.passed ? colors.green : colors.red;
            const gateIcon = gate.passed ? '✅' : '❌';
            console.log(`${gateIcon} ${colors.bright}${gate.name}:${colors.reset} ${gateColor}${gate.passed ? 'PASS' : 'FAIL'}${colors.reset}`);
            
            if (!gate.passed && gate.actual !== undefined) {
                console.log(`   Expected: >= ${gate.threshold}, Actual: ${gate.actual}`);
            }
        });
        
        if (displayOptions.qualityGates.violations.length > 0) {
            console.log(`\n${colors.red}${colors.bright}Quality Gate Violations:${colors.reset}`);
            displayOptions.qualityGates.violations.slice(0, 3).forEach(violation => {
                console.log(`   • ${violation.message}`);
            });
        }
    }

    // Include educational insights about testing patterns and best practices
    console.log('\n' + colors.bright + '🎓 EDUCATIONAL INSIGHTS' + colors.reset);
    console.log('─'.repeat(50));
    
    testReport.insights.testingConcepts.forEach(concept => {
        console.log(`${colors.cyan}💡${colors.reset} ${concept}`);
    });

    console.log('\n' + colors.bright + '✨ TESTING BEST PRACTICES' + colors.reset);
    testReport.insights.bestPractices.forEach(practice => {
        console.log(`${colors.green}📋${colors.reset} ${practice}`);
    });

    // Show next steps for improving test coverage and quality
    if (testReport.insights.nextSteps.length > 0) {
        console.log('\n' + colors.bright + '🚀 NEXT STEPS' + colors.reset);
        console.log('─'.repeat(50));
        
        testReport.insights.nextSteps.forEach((step, index) => {
            console.log(`${colors.yellow}${index + 1}.${colors.reset} ${step}`);
        });
    }

    // Display recommendations based on test results
    if (testReport.recommendations && testReport.recommendations.length > 0) {
        console.log('\n' + colors.bright + '💡 RECOMMENDATIONS' + colors.reset);
        console.log('─'.repeat(50));
        
        testReport.recommendations
            .filter(rec => rec.priority === 'HIGH' || rec.priority === 'MEDIUM')
            .slice(0, 3)
            .forEach(recommendation => {
                const priorityColor = recommendation.priority === 'HIGH' ? colors.red : colors.yellow;
                console.log(`${priorityColor}[${recommendation.priority}]${colors.reset} ${colors.bright}${recommendation.title}${colors.reset}`);
                console.log(`   ${recommendation.description}`);
                
                if (recommendation.actions.length > 0) {
                    console.log(`   Actions: ${recommendation.actions[0]}`);
                }
            });
    }

    // Display relevant links to documentation and learning resources
    console.log('\n' + colors.bright + '📚 LEARNING RESOURCES' + colors.reset);
    console.log('─'.repeat(50));
    
    testReport.insights.resources.forEach(resource => {
        console.log(`${colors.blue}🔗${colors.reset} ${resource}`);
    });

    // Display error summary if there were failures
    if (!success && testReport.errors.hasErrors) {
        console.log('\n' + colors.bright + colors.red + '🚨 ERROR SUMMARY' + colors.reset);
        console.log('─'.repeat(50));
        
        console.log(`${colors.red}Total Errors:${colors.reset} ${testReport.errors.totalErrors}`);
        
        if (testReport.errors.details.length > 0) {
            console.log(`${colors.red}Recent Errors:${colors.reset}`);
            testReport.errors.details.slice(0, 3).forEach(error => {
                const errorText = typeof error === 'string' ? error : error.error || 'Unknown error';
                console.log(`   • ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}`);
            });
        }
        
        console.log(`\n${colors.yellow}💡 Run with --verbose flag for detailed error information${colors.reset}`);
    }

    // Format output with colors and formatting for enhanced readability
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}${primaryColor}Test execution ${success ? 'completed successfully' : 'completed with failures'}!${colors.reset}`);
    
    if (success) {
        console.log(`${colors.green}🎉 All tests passed! Your Node.js application is working correctly.${colors.reset}`);
    } else {
        console.log(`${colors.red}⚠️  Some tests failed. Review the errors above and fix the issues.${colors.reset}`);
    }
    
    console.log('='.repeat(80) + '\n');
}

/**
 * Main test execution function that orchestrates the complete test suite execution
 * lifecycle including setup, execution, reporting, and cleanup. Provides comprehensive
 * error handling and educational reporting for the Node.js tutorial application.
 * 
 * @returns {Promise<number>} Promise resolving to process exit code (0 for success, 1 for failure)
 */
async function main() {
    let exitCode = 0;
    let setupResults = null;
    let qualityGateResults = null;
    
    try {
        // Parse command line arguments and configure test execution options
        const testOptions = parseCommandLineArguments(process.argv);
        testLogger.info('Test execution started with options:', testOptions);

        // Initialize test logger and log test execution start with timestamp
        testLogger.info(`Starting Node.js Tutorial Application test execution at ${new Date().toISOString()}`);
        testLogger.info(`Application: ${APPLICATION.NAME} v${APPLICATION.VERSION}`);

        // Validate test environment and Node.js runtime compatibility
        if (!isTestEnvironment()) {
            testLogger.warn('Setting NODE_ENV to test for proper test execution');
            process.env.NODE_ENV = 'test';
        }

        const nodeInfo = getNodeJSInfo();
        testLogger.info(`Node.js runtime: ${nodeInfo.node.version} on ${nodeInfo.node.platform} (${nodeInfo.node.architecture})`);

        // Set up test execution environment and global test configuration
        setupResults = await setupTestExecution(testOptions);
        testLogger.info('Test environment setup completed successfully');

        // Discover and categorize test files based on patterns and options
        const testFiles = await discoverTestFiles(testOptions);
        
        if (testFiles.total === 0) {
            testLogger.warn('No test files found matching the specified patterns');
            exitCode = 1;
            return exitCode;
        }

        testLogger.info(`Discovered ${testFiles.total} test files across ${testOptions.testTypes.join(', ')} test types`);

        const suiteResults = [];

        // Execute unit tests first with comprehensive error handling
        if (testFiles.unit.length > 0 && testOptions.testTypes.includes('unit')) {
            testLogger.info('Executing unit test suite...');
            const unitResults = await runTestSuite('unit', testFiles.unit, testOptions);
            suiteResults.push(unitResults);
            
            if (testOptions.bail && unitResults.failed > 0) {
                testLogger.error('Stopping execution due to unit test failures (bail mode)');
                exitCode = 1;
                throw new Error('Unit tests failed in bail mode');
            }
        }

        // Execute integration tests with HTTP endpoint testing using SuperTest
        if (testFiles.integration.length > 0 && testOptions.testTypes.includes('integration')) {
            testLogger.info('Executing integration test suite...');
            const integrationResults = await runTestSuite('integration', testFiles.integration, testOptions);
            suiteResults.push(integrationResults);
            
            if (testOptions.bail && integrationResults.failed > 0) {
                testLogger.error('Stopping execution due to integration test failures (bail mode)');
                exitCode = 1;
                throw new Error('Integration tests failed in bail mode');
            }
        }

        // Execute end-to-end tests for complete application workflow validation
        if (testFiles.e2e.length > 0 && testOptions.testTypes.includes('e2e')) {
            testLogger.info('Executing end-to-end test suite...');
            const e2eResults = await runTestSuite('e2e', testFiles.e2e, testOptions);
            suiteResults.push(e2eResults);
            
            if (testOptions.bail && e2eResults.failed > 0) {
                testLogger.error('Stopping execution due to e2e test failures (bail mode)');
                exitCode = 1;
                throw new Error('E2E tests failed in bail mode');
            }
        }

        // Collect and aggregate test results from all suites
        const aggregatedResults = collectTestResults(suiteResults);
        testLogger.info('Test result aggregation completed');

        // Generate comprehensive test report with educational content
        const testReport = generateTestReport(aggregatedResults, testOptions);
        testLogger.info('Test report generation completed');

        // Validate quality gates and determine overall test success
        qualityGateResults = validateQualityGates(aggregatedResults, testOptions.qualityGates);
        testLogger.info(`Quality gate validation: ${qualityGateResults.status}`);

        // Handle test failures with detailed analysis and guidance
        let failureAnalysis = null;
        if (aggregatedResults.failed > 0 || aggregatedResults.errors.length > 0) {
            failureAnalysis = handleTestFailures(aggregatedResults, testOptions);
            testLogger.info('Test failure analysis completed');
        }

        // Display test summary with statistics and recommendations
        displayTestSummary(testReport, { 
            qualityGates: qualityGateResults,
            failureAnalysis: failureAnalysis,
            verbose: testOptions.verbose
        });

        // Determine final exit code based on test results and quality gates
        if (aggregatedResults.failed > 0) {
            testLogger.error(`Test execution failed: ${aggregatedResults.failed} test(s) failed`);
            exitCode = 1;
        } else if (qualityGateResults.status === 'FAILED') {
            testLogger.error('Quality gate validation failed');
            exitCode = 1;
        } else {
            testLogger.info('All tests passed and quality gates satisfied');
            exitCode = 0;
        }

    } catch (error) {
        // Handle unexpected errors during test execution
        testLogger.error('Test execution failed with error:', error.message);
        
        if (testOptions && testOptions.verbose) {
            testLogger.error('Error stack trace:', error.stack);
        }
        
        exitCode = 1;
    } finally {
        // Perform cleanup operations and environment restoration
        try {
            const cleanupOptions = {
                resetEnvironment: true,
                clearRequireCache: true,
                forceGC: !process.env.CI, // Only force GC in local development
                originalNodeEnv: process.env.NODE_ENV !== 'test' ? process.env.NODE_ENV : undefined
            };
            
            await cleanupTestExecution(cleanupOptions);
            testLogger.info('Test execution cleanup completed');
        } catch (cleanupError) {
            testLogger.error('Cleanup failed:', cleanupError.message);
            // Don't change exit code due to cleanup failures
        }

        // Log test execution completion with final status and timing
        const totalDuration = Date.now() - testStartTime;
        testLogger.info(`Test execution completed in ${totalDuration}ms with exit code ${exitCode}`);
        
        // Provide final educational message
        if (exitCode === 0) {
            console.log(`\n${APPLICATION.NAME} tests completed successfully! 🎉`);
            console.log('Continue learning Node.js and Express.js development patterns.');
        } else {
            console.log(`\n${APPLICATION.NAME} tests completed with issues. 📚`);
            console.log('Review the test results and use this as a learning opportunity.');
        }
    }

    // Return appropriate exit code based on test results and quality gates
    return exitCode;
}

// Execute main function if this script is run directly
if (require.main === module) {
    main()
        .then(exitCode => {
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('Fatal error in test execution:', error.message);
            process.exit(1);
        });
}

// Export functions for testing and external use
module.exports = {
    parseCommandLineArguments,
    discoverTestFiles,
    runTestSuite,
    collectTestResults,
    generateTestReport,
    validateQualityGates,
    main
};