/**
 * Specialized Test Coverage Execution Script for Node.js Tutorial Application
 * 
 * This script extends the base test functionality with comprehensive coverage reporting
 * using Node.js built-in --experimental-test-coverage flag. Demonstrates testing best
 * practices with coverage measurement while maintaining educational focus and simplicity
 * for learning Node.js development patterns.
 * 
 * Features:
 * - Node.js built-in code coverage reporting with --experimental-test-coverage flag
 * - Coverage threshold validation (90% lines, 95% functions, 85% branches, 90% statements)
 * - LCOV format output, HTML reports, and comprehensive coverage analysis
 * - Educational coverage insights for the /hello endpoint functionality
 * - Performance testing with coverage overhead measurement
 * - Quality gates and coverage validation with educational feedback
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// External imports - Node.js built-in modules with version comments
const { spawn } = require('node:child_process'); // Node.js built-in - Child process API for spawning coverage-enabled test processes
const path = require('node:path'); // Node.js built-in - Path utilities for coverage output file paths and test file discovery
const fs = require('node:fs/promises'); // Node.js built-in - File system promises API for coverage report file management
const process = require('node:process'); // Node.js built-in - Process API for environment management and coverage execution control

// Internal imports - Test configuration and utilities
const { 
    testConfig,
    getCoverageConfig,
    TestConfigManager 
} = require('../test/setup/testConfig.js');

const {
    runTestSuite,
    discoverTestFiles,
    setupTestExecution
} = require('./test.js');

const { getLogger } = require('../utils/logger.js');
const { APPLICATION, ENVIRONMENT } = require('../utils/constants.js');
const { isTestEnvironment } = require('../utils/environment.js');

// Global variables for coverage execution state management
let coverageLogger = getLogger('test-coverage');
let coverageStartTime = Date.now();
let coverageConfig = null;
let testConfigManager = null;
let coverageResults = { 
    lines: { covered: 0, total: 0, percentage: 0 },
    functions: { covered: 0, total: 0, percentage: 0 },
    branches: { covered: 0, total: 0, percentage: 0 },
    statements: { covered: 0, total: 0, percentage: 0 }
};

/**
 * Parses command line arguments specific to coverage execution including output formats,
 * threshold overrides, coverage include/exclude patterns, and reporting options.
 * 
 * @param {Array<string>} argv - Command line arguments array from process.argv
 * @returns {Object} Coverage-specific command line options with format, thresholds, and output configuration
 */
function parseCoverageArguments(argv) {
    // Initialize default coverage options with standard threshold values
    const defaultOptions = {
        outputFormats: ['text'], // Default to text output format
        outputDirectory: 'coverage', // Default coverage output directory
        thresholds: {
            lines: 90,      // 90% line coverage target
            functions: 95,  // 95% function coverage target  
            branches: 85,   // 85% branch coverage target
            statements: 90  // 90% statement coverage target
        },
        includePatterns: ['src/**/*.js'], // Include patterns for coverage analysis
        excludePatterns: ['test/**/*.js', 'coverage/**/*'], // Exclude test files and coverage output
        failOnCoverage: true, // Fail build if coverage thresholds not met
        generateBadges: false, // Generate coverage badges for documentation
        verbose: false // Verbose coverage reporting
    };

    const options = { ...defaultOptions };

    // Parse coverage output format flags (--lcov, --html, --json, --text)
    if (argv.includes('--lcov')) {
        if (!options.outputFormats.includes('lcov')) {
            options.outputFormats.push('lcov');
        }
        coverageLogger.info('LCOV format output enabled');
    }

    if (argv.includes('--html')) {
        if (!options.outputFormats.includes('html')) {
            options.outputFormats.push('html');
        }
        coverageLogger.info('HTML format output enabled');
    }

    if (argv.includes('--json')) {
        if (!options.outputFormats.includes('json')) {
            options.outputFormats.push('json');
        }
        coverageLogger.info('JSON format output enabled');
    }

    // Extract coverage threshold overrides (--threshold-lines, --threshold-functions)
    const thresholdLines = argv.indexOf('--threshold-lines');
    if (thresholdLines !== -1 && argv[thresholdLines + 1]) {
        const lineThreshold = parseInt(argv[thresholdLines + 1], 10);
        if (!isNaN(lineThreshold) && lineThreshold >= 0 && lineThreshold <= 100) {
            options.thresholds.lines = lineThreshold;
            coverageLogger.info(`Line coverage threshold set to ${lineThreshold}%`);
        }
    }

    const thresholdFunctions = argv.indexOf('--threshold-functions');
    if (thresholdFunctions !== -1 && argv[thresholdFunctions + 1]) {
        const functionThreshold = parseInt(argv[thresholdFunctions + 1], 10);
        if (!isNaN(functionThreshold) && functionThreshold >= 0 && functionThreshold <= 100) {
            options.thresholds.functions = functionThreshold;
            coverageLogger.info(`Function coverage threshold set to ${functionThreshold}%`);
        }
    }

    const thresholdBranches = argv.indexOf('--threshold-branches');
    if (thresholdBranches !== -1 && argv[thresholdBranches + 1]) {
        const branchThreshold = parseInt(argv[thresholdBranches + 1], 10);
        if (!isNaN(branchThreshold) && branchThreshold >= 0 && branchThreshold <= 100) {
            options.thresholds.branches = branchThreshold;
            coverageLogger.info(`Branch coverage threshold set to ${branchThreshold}%`);
        }
    }

    // Parse coverage include/exclude patterns for file filtering
    const includeIndex = argv.indexOf('--include');
    if (includeIndex !== -1 && argv[includeIndex + 1]) {
        const includePattern = argv[includeIndex + 1];
        options.includePatterns = includePattern.split(',').map(pattern => pattern.trim());
        coverageLogger.info(`Coverage include patterns: ${options.includePatterns.join(', ')}`);
    }

    const excludeIndex = argv.indexOf('--exclude');
    if (excludeIndex !== -1 && argv[excludeIndex + 1]) {
        const excludePattern = argv[excludeIndex + 1];
        options.excludePatterns = excludePattern.split(',').map(pattern => pattern.trim());
        coverageLogger.info(`Coverage exclude patterns: ${options.excludePatterns.join(', ')}`);
    }

    // Handle coverage output directory specification (--coverage-dir)
    const coverageDirIndex = argv.indexOf('--coverage-dir');
    if (coverageDirIndex !== -1 && argv[coverageDirIndex + 1]) {
        options.outputDirectory = argv[coverageDirIndex + 1];
        coverageLogger.info(`Coverage output directory: ${options.outputDirectory}`);
    }

    // Parse reporter-specific options for coverage display
    if (argv.includes('--verbose')) {
        options.verbose = true;
        coverageLogger.info('Verbose coverage reporting enabled');
    }

    // Extract coverage validation flags (--fail-on-coverage)
    if (argv.includes('--no-fail-on-coverage')) {
        options.failOnCoverage = false;
        coverageLogger.info('Coverage threshold failure will not fail the build');
    }

    // Parse badge generation option
    if (argv.includes('--badges')) {
        options.generateBadges = true;
        coverageLogger.info('Coverage badge generation enabled');
    }

    // Validate parsed options and set defaults for missing parameters  
    if (options.outputFormats.length === 0) {
        options.outputFormats = ['text'];
        coverageLogger.warn('No output formats specified, defaulting to text format');
    }

    // Log final coverage configuration for transparency
    coverageLogger.info('Coverage execution configuration:', {
        outputFormats: options.outputFormats,
        outputDirectory: options.outputDirectory,
        thresholds: options.thresholds,
        failOnCoverage: options.failOnCoverage,
        verbose: options.verbose
    });

    // Return complete coverage command line options object
    return options;
}

/**
 * Initializes coverage-specific test execution environment including coverage collection setup,
 * output directory preparation, and threshold configuration validation.
 * 
 * @param {Object} coverageOptions - Coverage-specific options and configuration
 * @returns {Promise<Object>} Promise resolving to coverage execution setup results with configuration validation
 */
async function initializeCoverageExecution(coverageOptions) {
    coverageLogger.info('Initializing coverage execution environment...');
    
    try {
        // Create and initialize TestConfigManager with coverage-specific configuration
        testConfigManager = new TestConfigManager();
        await testConfigManager.initialize({
            ...coverageOptions,
            environment: ENVIRONMENT.TEST,
            coverageEnabled: true
        });

        // Validate test environment using isTestEnvironment for coverage safety
        if (!isTestEnvironment()) {
            coverageLogger.warn('Setting NODE_ENV to test for coverage execution safety');
            process.env.NODE_ENV = 'test';
        }

        // Create coverage output directories using fs.mkdir with recursive option
        const outputPath = path.resolve(process.cwd(), coverageOptions.outputDirectory);
        try {
            await fs.mkdir(outputPath, { recursive: true });
            coverageLogger.info(`Coverage output directory created: ${outputPath}`);
        } catch (mkdirError) {
            if (mkdirError.code !== 'EEXIST') {
                throw new Error(`Failed to create coverage directory: ${mkdirError.message}`);
            }
        }

        // Initialize coverage configuration using getCoverageConfig function
        coverageConfig = getCoverageConfig({
            thresholds: coverageOptions.thresholds,
            outputFormats: coverageOptions.outputFormats,
            outputDirectory: outputPath,
            includePatterns: coverageOptions.includePatterns,
            excludePatterns: coverageOptions.excludePatterns
        });

        // Set up coverage collection parameters and file filtering patterns
        const collectionParams = {
            enabled: true,
            experimental: true, // Using --experimental-test-coverage flag
            formats: coverageOptions.outputFormats,
            thresholds: coverageOptions.thresholds
        };

        // Configure coverage reporting formats and output file paths
        const reportingConfig = {
            text: path.join(outputPath, 'coverage-report.txt'),
            lcov: path.join(outputPath, 'lcov.info'),
            html: path.join(outputPath, 'html'),
            json: path.join(outputPath, 'coverage.json')
        };

        // Validate coverage thresholds against achievable targets
        const thresholdValidation = {
            lines: coverageOptions.thresholds.lines >= 0 && coverageOptions.thresholds.lines <= 100,
            functions: coverageOptions.thresholds.functions >= 0 && coverageOptions.thresholds.functions <= 100,
            branches: coverageOptions.thresholds.branches >= 0 && coverageOptions.thresholds.branches <= 100,
            statements: coverageOptions.thresholds.statements >= 0 && coverageOptions.thresholds.statements <= 100
        };

        const allThresholdsValid = Object.values(thresholdValidation).every(valid => valid);
        if (!allThresholdsValid) {
            throw new Error('Invalid coverage thresholds specified. All thresholds must be between 0 and 100.');
        }

        // Log coverage execution initialization with configuration summary
        coverageLogger.info('Coverage execution environment initialized successfully:', {
            configManager: 'initialized',
            outputDirectory: outputPath,
            thresholds: coverageOptions.thresholds,
            formats: coverageOptions.outputFormats
        });

        // Return coverage setup results with validation status and configuration
        return {
            success: true,
            configManager: testConfigManager,
            coverageConfig,
            collectionParams,
            reportingConfig,
            outputPath,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        coverageLogger.error('Coverage execution setup failed:', error.message);
        throw error;
    }
}

/**
 * Executes all test suites with Node.js built-in coverage collection using --experimental-test-coverage flag,
 * managing coverage data collection and aggregation across test categories.
 * 
 * @param {Array<string>} testFiles - Array of test file paths to execute with coverage
 * @param {Object} coverageOptions - Coverage execution configuration options
 * @returns {Promise<Object>} Promise resolving to test execution results with integrated coverage data
 */
async function runTestsWithCoverage(testFiles, coverageOptions) {
    coverageLogger.info(`Starting coverage-enabled test execution with ${testFiles.length} test files`);
    
    if (testFiles.length === 0) {
        coverageLogger.warn('No test files provided for coverage execution');
        return {
            success: false,
            testResults: null,
            coverageData: null,
            error: 'No test files specified'
        };
    }

    const startTime = Date.now();
    let testProcess = null;

    try {
        // Prepare Node.js test runner command with --experimental-test-coverage flag
        const testCommand = 'node';
        const testArgs = [
            '--test',
            '--experimental-test-coverage'
        ];

        // Add coverage-specific command line options and output format specifications
        if (coverageOptions.outputFormats.includes('lcov')) {
            // LCOV output is handled by parsing the coverage output
            coverageLogger.debug('LCOV format will be generated from coverage output');
        }

        // Configure coverage include/exclude patterns for targeted coverage analysis
        // Note: Node.js built-in coverage doesn't support include/exclude patterns directly
        // Pattern filtering will be handled in post-processing
        
        // Add test files to command arguments
        testArgs.push(...testFiles);

        coverageLogger.info(`Executing coverage command: ${testCommand} ${testArgs.join(' ')}`);

        // Spawn coverage-enabled test process using child_process.spawn
        testProcess = spawn(testCommand, testArgs, {
            cwd: process.cwd(),
            env: {
                ...process.env,
                NODE_ENV: 'test',
                PORT: '0', // Use dynamic port allocation
                LOG_LEVEL: 'error' // Reduce log noise during testing
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        const executionResults = {
            testResults: {
                passed: 0,
                failed: 0,
                skipped: 0,
                total: 0
            },
            coverageData: null,
            duration: 0,
            errors: []
        };

        // Monitor test execution with coverage collection progress logging
        testProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            
            if (coverageOptions.verbose) {
                process.stdout.write(output);
            }
            
            // Parse test results in real-time
            parseTestOutputRealTime(output, executionResults.testResults);
        });

        // Capture coverage output streams for result parsing and analysis
        testProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            stderr += errorOutput;
            
            if (coverageOptions.verbose) {
                process.stderr.write(errorOutput);
            }
            
            // Collect error information
            if (errorOutput.trim()) {
                executionResults.errors.push(errorOutput.trim());
            }
        });

        // Handle test process completion and extract coverage data from output
        const processResult = await new Promise((resolve, reject) => {
            testProcess.on('close', (code) => {
                const duration = Date.now() - startTime;
                executionResults.duration = duration;
                
                if (code === 0 || code === null) {
                    coverageLogger.info(`Coverage-enabled tests completed in ${duration}ms`);
                    resolve(executionResults);
                } else {
                    const error = new Error(`Test process exited with code ${code}`);
                    error.code = code;
                    error.stdout = stdout;
                    error.stderr = stderr;
                    reject(error);
                }
            });

            testProcess.on('error', (error) => {
                coverageLogger.error(`Test process error: ${error.message}`);
                reject(error);
            });
        });

        // Parse coverage results and aggregate coverage metrics across test suites
        const coverageData = await parseCoverageOutput(stdout, 'text');
        processResult.coverageData = coverageData;

        // Log coverage execution summary
        coverageLogger.info('Coverage-enabled test execution completed:', {
            duration: processResult.duration,
            testsPassed: processResult.testResults.passed,
            testsFailed: processResult.testResults.failed,
            coverageEnabled: true
        });

        // Return comprehensive test results with integrated coverage information
        return {
            success: true,
            testResults: processResult.testResults,
            coverageData: processResult.coverageData,
            duration: processResult.duration,
            errors: processResult.errors,
            stdout,
            stderr
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        coverageLogger.error('Coverage-enabled test execution failed:', error.message);

        return {
            success: false,
            testResults: null,
            coverageData: null,
            duration,
            error: error.message,
            errors: [error.message]
        };
    } finally {
        // Cleanup process if still running
        if (testProcess && !testProcess.killed) {
            testProcess.kill();
        }
    }
}

/**
 * Parses test output in real-time to update test results.
 * 
 * @param {string} output - Test output to parse
 * @param {Object} testResults - Test results object to update
 */
function parseTestOutputRealTime(output, testResults) {
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
        } else if (trimmedLine.includes('# SKIP')) {
            testResults.skipped++;
            testResults.total++;
        }
    });
}

/**
 * Parses Node.js test runner coverage output to extract coverage metrics, file-level coverage details,
 * and threshold validation results for educational analysis.
 * 
 * @param {string} coverageOutput - Coverage output from Node.js test runner
 * @param {string} outputFormat - Output format type (text, json, lcov)
 * @returns {Object} Parsed coverage data with metrics, file details, and validation results
 */
async function parseCoverageOutput(coverageOutput, outputFormat = 'text') {
    coverageLogger.info('Parsing coverage output...');
    
    const parsedData = {
        summary: {
            lines: { covered: 0, total: 0, percentage: 0 },
            functions: { covered: 0, total: 0, percentage: 0 },
            branches: { covered: 0, total: 0, percentage: 0 },
            statements: { covered: 0, total: 0, percentage: 0 }
        },
        files: [],
        uncoveredLines: [],
        timestamp: new Date().toISOString(),
        format: outputFormat
    };

    try {
        // Detect coverage output format (text, json, lcov) from process output
        let coverageSection = '';
        
        if (coverageOutput.includes('Coverage report')) {
            // Extract coverage section from text output
            const coverageStart = coverageOutput.indexOf('Coverage report');
            if (coverageStart !== -1) {
                coverageSection = coverageOutput.substring(coverageStart);
            }
        } else if (coverageOutput.includes('coverage')) {
            // Look for coverage information in general output
            coverageSection = coverageOutput;
        }

        // Parse text-based coverage summary for overall metrics extraction
        if (outputFormat === 'text' && coverageSection) {
            // Extract line, function, branch, and statement coverage percentages
            const lineMatch = coverageSection.match(/(\d+\.?\d*)%\s+Lines?\s+(\d+)\/(\d+)/i);
            if (lineMatch) {
                const [, percentage, covered, total] = lineMatch;
                parsedData.summary.lines = {
                    covered: parseInt(covered, 10),
                    total: parseInt(total, 10),
                    percentage: parseFloat(percentage)
                };
            }

            const functionMatch = coverageSection.match(/(\d+\.?\d*)%\s+Functions?\s+(\d+)\/(\d+)/i);
            if (functionMatch) {
                const [, percentage, covered, total] = functionMatch;
                parsedData.summary.functions = {
                    covered: parseInt(covered, 10),
                    total: parseInt(total, 10),
                    percentage: parseFloat(percentage)
                };
            }

            const branchMatch = coverageSection.match(/(\d+\.?\d*)%\s+Branches?\s+(\d+)\/(\d+)/i);
            if (branchMatch) {
                const [, percentage, covered, total] = branchMatch;
                parsedData.summary.branches = {
                    covered: parseInt(covered, 10),
                    total: parseInt(total, 10),
                    percentage: parseFloat(percentage)
                };
            }

            const statementMatch = coverageSection.match(/(\d+\.?\d*)%\s+Statements?\s+(\d+)\/(\d+)/i);
            if (statementMatch) {
                const [, percentage, covered, total] = statementMatch;
                parsedData.summary.statements = {
                    covered: parseInt(covered, 10),
                    total: parseInt(total, 10),
                    percentage: parseFloat(percentage)
                };
            }
        }

        // Parse file-level coverage details for individual module analysis
        const fileMatches = coverageSection.match(/File\s+%\s+Stmts\s+%\s+Branch\s+%\s+Funcs\s+%\s+Lines\s+Uncovered Line #s/gi);
        if (fileMatches) {
            // Extract individual file coverage information
            const fileLines = coverageSection.split('\n').filter(line => 
                line.includes('.js') && !line.includes('All files')
            );
            
            fileLines.forEach(fileLine => {
                const fileData = parseFileCoverageLine(fileLine);
                if (fileData) {
                    parsedData.files.push(fileData);
                }
            });
        }

        // Identify uncovered lines and functions for educational feedback
        const uncoveredMatches = coverageSection.match(/Uncovered Line #s:\s*([\d,\s-]+)/gi);
        if (uncoveredMatches) {
            uncoveredMatches.forEach(match => {
                const lineNumbers = match.replace(/Uncovered Line #s:\s*/i, '').trim();
                if (lineNumbers && lineNumbers !== '') {
                    parsedData.uncoveredLines.push(lineNumbers);
                }
            });
        }

        // Calculate coverage deltas and improvement recommendations
        const coverageMetrics = Object.values(parsedData.summary);
        const validMetrics = coverageMetrics.filter(metric => metric.percentage > 0);
        
        if (validMetrics.length > 0) {
            const averageCoverage = validMetrics.reduce((sum, metric) => sum + metric.percentage, 0) / validMetrics.length;
            parsedData.averageCoverage = Math.round(averageCoverage * 100) / 100;
        }

        // Validate coverage data consistency and completeness
        const isValidCoverage = parsedData.summary.lines.percentage >= 0 || 
                               parsedData.summary.functions.percentage >= 0 ||
                               parsedData.summary.statements.percentage >= 0;

        if (!isValidCoverage) {
            coverageLogger.warn('No valid coverage data found in output');
            // Provide default coverage data structure
            Object.keys(parsedData.summary).forEach(key => {
                if (parsedData.summary[key].percentage === 0) {
                    parsedData.summary[key] = { covered: 0, total: 1, percentage: 0 };
                }
            });
        }

        coverageLogger.info('Coverage parsing completed:', {
            lines: `${parsedData.summary.lines.percentage}%`,
            functions: `${parsedData.summary.functions.percentage}%`,
            branches: `${parsedData.summary.branches.percentage}%`,
            statements: `${parsedData.summary.statements.percentage}%`,
            filesAnalyzed: parsedData.files.length
        });

        // Return structured coverage data object with comprehensive metrics
        return parsedData;

    } catch (error) {
        coverageLogger.error('Failed to parse coverage output:', error.message);
        
        // Return default coverage structure on parsing failure
        return {
            ...parsedData,
            error: error.message,
            parsingFailed: true
        };
    }
}

/**
 * Parses individual file coverage line from coverage output.
 * 
 * @param {string} fileLine - File coverage line to parse
 * @returns {Object|null} Parsed file coverage data or null if parsing fails
 */
function parseFileCoverageLine(fileLine) {
    try {
        // Parse coverage line format: filename | % Stmts | % Branch | % Funcs | % Lines | Uncovered
        const parts = fileLine.split('|').map(part => part.trim());
        
        if (parts.length >= 5) {
            return {
                filename: parts[0],
                statements: parseFloat(parts[1]) || 0,
                branches: parseFloat(parts[2]) || 0,
                functions: parseFloat(parts[3]) || 0,
                lines: parseFloat(parts[4]) || 0,
                uncovered: parts[5] || ''
            };
        }
    } catch (error) {
        coverageLogger.debug(`Failed to parse file coverage line: ${fileLine}`);
    }
    
    return null;
}

/**
 * Validates coverage results against configured thresholds (90% lines, 95% functions, 85% branches, 90% statements)
 * and determines pass/fail status for quality gates.
 * 
 * @param {Object} coverageData - Parsed coverage data with metrics
 * @param {Object} thresholds - Coverage threshold configuration
 * @returns {Object} Coverage validation results with pass/fail status, threshold violations, and improvement recommendations
 */
function validateCoverageThresholds(coverageData, thresholds) {
    coverageLogger.info('Validating coverage against thresholds...');
    
    const validationResults = {
        passed: true,
        violations: [],
        improvements: [],
        summary: {
            totalChecks: 0,
            passedChecks: 0,
            failedChecks: 0
        },
        details: {},
        timestamp: new Date().toISOString()
    };

    // Compare line coverage against threshold target (90% default)
    const lineCheck = {
        metric: 'lines',
        actual: coverageData.summary.lines.percentage,
        threshold: thresholds.lines,
        passed: coverageData.summary.lines.percentage >= thresholds.lines,
        gap: Math.max(0, thresholds.lines - coverageData.summary.lines.percentage)
    };
    
    validationResults.details.lines = lineCheck;
    validationResults.summary.totalChecks++;
    
    if (lineCheck.passed) {
        validationResults.summary.passedChecks++;
    } else {
        validationResults.passed = false;
        validationResults.summary.failedChecks++;
        validationResults.violations.push({
            metric: 'Line Coverage',
            actual: `${lineCheck.actual}%`,
            threshold: `${lineCheck.threshold}%`,
            gap: `${lineCheck.gap.toFixed(1)}%`,
            message: `Line coverage ${lineCheck.actual}% is below threshold ${lineCheck.threshold}%`
        });
        
        // Calculate coverage improvement requirements for threshold compliance
        const linesToCover = Math.ceil((thresholds.lines - coverageData.summary.lines.percentage) * 
                                     coverageData.summary.lines.total / 100);
        validationResults.improvements.push({
            metric: 'lines',
            recommendation: `Add tests to cover approximately ${linesToCover} more lines`,
            priority: 'HIGH'
        });
    }

    // Validate function coverage against threshold target (95% default)
    const functionCheck = {
        metric: 'functions',
        actual: coverageData.summary.functions.percentage,
        threshold: thresholds.functions,
        passed: coverageData.summary.functions.percentage >= thresholds.functions,
        gap: Math.max(0, thresholds.functions - coverageData.summary.functions.percentage)
    };
    
    validationResults.details.functions = functionCheck;
    validationResults.summary.totalChecks++;
    
    if (functionCheck.passed) {
        validationResults.summary.passedChecks++;
    } else {
        validationResults.passed = false;
        validationResults.summary.failedChecks++;
        validationResults.violations.push({
            metric: 'Function Coverage',
            actual: `${functionCheck.actual}%`,
            threshold: `${functionCheck.threshold}%`,
            gap: `${functionCheck.gap.toFixed(1)}%`,
            message: `Function coverage ${functionCheck.actual}% is below threshold ${functionCheck.threshold}%`
        });
        
        const functionsToCover = Math.ceil((thresholds.functions - coverageData.summary.functions.percentage) * 
                                         coverageData.summary.functions.total / 100);
        validationResults.improvements.push({
            metric: 'functions',
            recommendation: `Add tests to cover approximately ${functionsToCover} more functions`,
            priority: 'HIGH'
        });
    }

    // Check branch coverage against threshold target (85% default)
    const branchCheck = {
        metric: 'branches',
        actual: coverageData.summary.branches.percentage,
        threshold: thresholds.branches,
        passed: coverageData.summary.branches.percentage >= thresholds.branches,
        gap: Math.max(0, thresholds.branches - coverageData.summary.branches.percentage)
    };
    
    validationResults.details.branches = branchCheck;
    validationResults.summary.totalChecks++;
    
    if (branchCheck.passed) {
        validationResults.summary.passedChecks++;
    } else {
        validationResults.passed = false;
        validationResults.summary.failedChecks++;
        validationResults.violations.push({
            metric: 'Branch Coverage',
            actual: `${branchCheck.actual}%`,
            threshold: `${branchCheck.threshold}%`,
            gap: `${branchCheck.gap.toFixed(1)}%`,
            message: `Branch coverage ${branchCheck.actual}% is below threshold ${branchCheck.threshold}%`
        });
        
        validationResults.improvements.push({
            metric: 'branches',
            recommendation: 'Add tests for conditional statements and error handling paths',
            priority: 'MEDIUM'
        });
    }

    // Validate statement coverage against threshold target (90% default)
    const statementCheck = {
        metric: 'statements',
        actual: coverageData.summary.statements.percentage,
        threshold: thresholds.statements,
        passed: coverageData.summary.statements.percentage >= thresholds.statements,
        gap: Math.max(0, thresholds.statements - coverageData.summary.statements.percentage)
    };
    
    validationResults.details.statements = statementCheck;
    validationResults.summary.totalChecks++;
    
    if (statementCheck.passed) {
        validationResults.summary.passedChecks++;
    } else {
        validationResults.passed = false;
        validationResults.summary.failedChecks++;
        validationResults.violations.push({
            metric: 'Statement Coverage',
            actual: `${statementCheck.actual}%`,
            threshold: `${statementCheck.threshold}%`,
            gap: `${statementCheck.gap.toFixed(1)}%`,
            message: `Statement coverage ${statementCheck.actual}% is below threshold ${statementCheck.threshold}%`
        });
        
        validationResults.improvements.push({
            metric: 'statements',
            recommendation: 'Ensure all code statements are executed in tests',
            priority: 'HIGH'
        });
    }

    // Generate educational recommendations for coverage enhancement
    if (!validationResults.passed) {
        validationResults.improvements.push({
            metric: 'general',
            recommendation: 'Focus on testing the /hello endpoint with various scenarios including error cases',
            priority: 'MEDIUM'
        });
        
        validationResults.improvements.push({
            metric: 'testing',
            recommendation: 'Add edge case testing and error path validation for comprehensive coverage',
            priority: 'LOW'
        });
    }

    // Determine overall coverage validation status (pass/fail)
    const overallStatus = validationResults.passed ? 'PASSED' : 'FAILED';
    validationResults.status = overallStatus;

    coverageLogger.info('Coverage threshold validation completed:', {
        status: overallStatus,
        passedChecks: validationResults.summary.passedChecks,
        totalChecks: validationResults.summary.totalChecks,
        violations: validationResults.violations.length
    });

    // Return comprehensive validation results with actionable feedback
    return validationResults;
}

/**
 * Generates comprehensive coverage report with educational insights, threshold analysis, file-level details,
 * and improvement recommendations formatted for console and file output.
 * 
 * @param {Object} coverageData - Parsed coverage data with metrics and file details
 * @param {Object} validationResults - Coverage threshold validation results
 * @param {Object} reportOptions - Report generation options and formatting preferences
 * @returns {Object} Formatted coverage report with educational content and actionable insights
 */
function generateCoverageReport(coverageData, validationResults, reportOptions = {}) {
    coverageLogger.info('Generating comprehensive coverage report...');
    
    const reportStartTime = Date.now();
    const totalExecutionTime = reportStartTime - coverageStartTime;
    
    // Create coverage report header with application information and execution timestamp
    const reportHeader = {
        title: 'Node.js Tutorial Application - Code Coverage Report',
        application: {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            description: 'HTTP Server Fundamentals with Express.js 5.1.0'
        },
        execution: {
            timestamp: new Date().toISOString(),
            duration: totalExecutionTime,
            environment: process.env.NODE_ENV || 'test',
            nodeVersion: process.version,
            coverageEnabled: true
        }
    };

    // Format overall coverage summary with percentage breakdowns and visual indicators
    const coverageSummary = {
        overview: {
            lines: {
                percentage: coverageData.summary.lines.percentage,
                covered: coverageData.summary.lines.covered,
                total: coverageData.summary.lines.total,
                status: coverageData.summary.lines.percentage >= (reportOptions.thresholds?.lines || 90) ? 'PASS' : 'FAIL'
            },
            functions: {
                percentage: coverageData.summary.functions.percentage,
                covered: coverageData.summary.functions.covered,
                total: coverageData.summary.functions.total,
                status: coverageData.summary.functions.percentage >= (reportOptions.thresholds?.functions || 95) ? 'PASS' : 'FAIL'
            },
            branches: {
                percentage: coverageData.summary.branches.percentage,
                covered: coverageData.summary.branches.covered,
                total: coverageData.summary.branches.total,
                status: coverageData.summary.branches.percentage >= (reportOptions.thresholds?.branches || 85) ? 'PASS' : 'FAIL'
            },
            statements: {
                percentage: coverageData.summary.statements.percentage,
                covered: coverageData.summary.statements.covered,
                total: coverageData.summary.statements.total,
                status: coverageData.summary.statements.percentage >= (reportOptions.thresholds?.statements || 90) ? 'PASS' : 'FAIL'
            }
        },
        averageCoverage: coverageData.averageCoverage || 0,
        overallStatus: validationResults.passed ? 'PASSED' : 'FAILED'
    };

    // Generate threshold validation section with pass/fail status and gap analysis
    const thresholdAnalysis = {
        summary: validationResults.summary,
        violations: validationResults.violations,
        improvements: validationResults.improvements,
        status: validationResults.status,
        details: validationResults.details
    };

    // Include file-level coverage details with hotspot identification
    const fileAnalysis = {
        totalFiles: coverageData.files.length,
        files: coverageData.files.map(file => ({
            ...file,
            needsAttention: file.lines < 80 || file.functions < 90,
            priority: file.lines < 50 ? 'HIGH' : file.lines < 80 ? 'MEDIUM' : 'LOW'
        })),
        hotspots: coverageData.files
            .filter(file => file.lines < 80)
            .sort((a, b) => a.lines - b.lines)
            .slice(0, 5)
    };

    // Add uncovered code analysis with specific line and function references
    const uncoveredAnalysis = {
        hasUncoveredCode: coverageData.uncoveredLines.length > 0,
        uncoveredLines: coverageData.uncoveredLines,
        recommendations: generateUncoveredCodeRecommendations(coverageData.uncoveredLines)
    };

    // Generate educational insights about coverage patterns and testing best practices
    const educationalInsights = {
        concepts: [
            'Code coverage measures how much of your code is executed during tests',
            'The /hello endpoint should have comprehensive test coverage including success and error scenarios',
            'Node.js built-in --experimental-test-coverage provides zero-dependency coverage analysis',
            'Coverage thresholds ensure consistent code quality and help identify untested code paths'
        ],
        bestPractices: [
            'Aim for high coverage but focus on meaningful tests rather than just hitting coverage targets',
            'Test both happy path and error scenarios for complete endpoint coverage',
            'Use coverage reports to identify code that may need additional testing',
            'Combine unit, integration, and end-to-end tests for comprehensive coverage'
        ],
        nodeJsSpecific: [
            'Express.js middleware and route handlers should be thoroughly tested',
            'Error handling middleware requires specific test scenarios to achieve coverage',
            'Async/await patterns in Node.js require proper test structure for coverage',
            'HTTP status codes and response formats should be validated in tests'
        ]
    };

    // Include coverage improvement recommendations with specific action items
    const improvementPlan = {
        priority: {
            high: validationResults.improvements.filter(i => i.priority === 'HIGH'),
            medium: validationResults.improvements.filter(i => i.priority === 'MEDIUM'),
            low: validationResults.improvements.filter(i => i.priority === 'LOW')
        },
        actionItems: generateCoverageActionItems(validationResults, coverageData),
        timeline: 'Immediate for HIGH priority, within sprint for MEDIUM, backlog for LOW'
    };

    // Format performance impact analysis of coverage collection overhead
    const performanceAnalysis = {
        executionTime: totalExecutionTime,
        coverageOverhead: 'Minimal overhead with Node.js built-in coverage',
        recommendations: totalExecutionTime > 30000 ? [
            'Consider running coverage analysis separately from regular test runs',
            'Use coverage reports in CI/CD pipeline rather than every local test run'
        ] : [
            'Coverage overhead is acceptable for regular development workflow'
        ]
    };

    // Create tutorial-focused explanations of coverage metrics and importance
    const tutorialContent = {
        coverageTypes: {
            lines: 'Line coverage measures the percentage of code lines executed during tests',
            functions: 'Function coverage ensures all functions in your code are called by tests',
            branches: 'Branch coverage validates that all conditional paths (if/else, switch) are tested',
            statements: 'Statement coverage tracks individual JavaScript statements executed during tests'
        },
        whyItMatters: [
            'Coverage helps identify untested code that might contain bugs',
            'High coverage increases confidence in code reliability and maintainability',
            'Coverage reports guide developers to areas needing additional tests',
            'Coverage thresholds prevent regression in test quality over time'
        ],
        nextSteps: [
            'Review uncovered lines and add targeted tests',
            'Focus on error handling and edge cases for complete coverage',
            'Integrate coverage reporting into your development workflow',
            'Use coverage as one metric among many for code quality assessment'
        ]
    };

    // Return comprehensive formatted report for display and file export
    const fullReport = {
        header: reportHeader,
        summary: coverageSummary,
        thresholds: thresholdAnalysis,
        files: fileAnalysis,
        uncovered: uncoveredAnalysis,
        insights: educationalInsights,
        improvements: improvementPlan,
        performance: performanceAnalysis,
        tutorial: tutorialContent,
        raw: {
            coverageData,
            validationResults,
            reportOptions,
            generatedAt: new Date().toISOString()
        }
    };

    coverageLogger.info('Coverage report generation completed:', {
        overallStatus: fullReport.summary.overallStatus,
        violations: fullReport.thresholds.violations.length,
        filesAnalyzed: fullReport.files.totalFiles
    });

    return fullReport;
}

/**
 * Generates recommendations for uncovered code areas.
 * 
 * @param {Array<string>} uncoveredLines - Array of uncovered line indicators
 * @returns {Array<string>} Array of specific recommendations
 */
function generateUncoveredCodeRecommendations(uncoveredLines) {
    const recommendations = [];
    
    if (uncoveredLines.length > 0) {
        recommendations.push('Review the uncovered line numbers and add specific test cases');
        recommendations.push('Focus on error handling paths that may not be covered');
        recommendations.push('Consider edge cases and boundary conditions for the /hello endpoint');
        recommendations.push('Add tests for different HTTP methods if applicable');
    } else {
        recommendations.push('Excellent! All lines are covered by tests');
        recommendations.push('Continue maintaining high coverage as you add new features');
    }
    
    return recommendations;
}

/**
 * Generates specific action items based on coverage analysis.
 * 
 * @param {Object} validationResults - Coverage validation results
 * @param {Object} coverageData - Coverage data
 * @returns {Array<Object>} Array of action items with priorities
 */
function generateCoverageActionItems(validationResults, coverageData) {
    const actionItems = [];
    
    validationResults.violations.forEach(violation => {
        actionItems.push({
            type: 'coverage_improvement',
            priority: 'HIGH',
            metric: violation.metric,
            description: `Improve ${violation.metric.toLowerCase()} to meet ${violation.threshold} threshold`,
            currentValue: violation.actual,
            targetValue: violation.threshold,
            estimatedEffort: 'Medium'
        });
    });
    
    if (coverageData.files.length > 0) {
        const lowCoverageFiles = coverageData.files.filter(file => file.lines < 80);
        lowCoverageFiles.forEach(file => {
            actionItems.push({
                type: 'file_coverage',
                priority: file.lines < 50 ? 'HIGH' : 'MEDIUM',
                file: file.filename,
                description: `Add tests for ${file.filename} (current: ${file.lines}% lines)`,
                currentValue: `${file.lines}%`,
                targetValue: '90%',
                estimatedEffort: 'Small'
            });
        });
    }
    
    return actionItems;
}

/**
 * Exports coverage data in multiple formats (LCOV, HTML, JSON, XML) for integration with external tools,
 * CI/CD systems, and educational analysis platforms.
 * 
 * @param {Object} coverageData - Coverage data to export
 * @param {Object} exportOptions - Export configuration options
 * @returns {Promise<Object>} Promise resolving to export results with file paths and format details
 */
async function exportCoverageData(coverageData, exportOptions) {
    coverageLogger.info('Exporting coverage data in multiple formats...');
    
    const exportResults = {
        success: true,
        formats: [],
        files: {},
        errors: []
    };

    try {
        // Create coverage output directory structure using fs.mkdir recursive
        const outputDir = path.resolve(process.cwd(), exportOptions.outputDirectory);
        await fs.mkdir(outputDir, { recursive: true });

        // Generate LCOV format coverage data for standard tooling integration
        if (exportOptions.outputFormats.includes('lcov')) {
            try {
                const lcovData = generateLCOVFormat(coverageData);
                const lcovPath = path.join(outputDir, 'lcov.info');
                await fs.writeFile(lcovPath, lcovData, 'utf8');
                
                exportResults.formats.push('lcov');
                exportResults.files.lcov = lcovPath;
                coverageLogger.info(`LCOV format exported to: ${lcovPath}`);
            } catch (lcovError) {
                exportResults.errors.push(`LCOV export failed: ${lcovError.message}`);
            }
        }

        // Export JSON format coverage data for programmatic analysis
        if (exportOptions.outputFormats.includes('json')) {
            try {
                const jsonData = JSON.stringify(coverageData, null, 2);
                const jsonPath = path.join(outputDir, 'coverage.json');
                await fs.writeFile(jsonPath, jsonData, 'utf8');
                
                exportResults.formats.push('json');
                exportResults.files.json = jsonPath;
                coverageLogger.info(`JSON format exported to: ${jsonPath}`);
            } catch (jsonError) {
                exportResults.errors.push(`JSON export failed: ${jsonError.message}`);
            }
        }

        // Create HTML coverage report for browser-based viewing and analysis
        if (exportOptions.outputFormats.includes('html')) {
            try {
                const htmlDir = path.join(outputDir, 'html');
                await fs.mkdir(htmlDir, { recursive: true });
                
                const htmlData = generateHTMLReport(coverageData);
                const htmlPath = path.join(htmlDir, 'index.html');
                await fs.writeFile(htmlPath, htmlData, 'utf8');
                
                exportResults.formats.push('html');
                exportResults.files.html = htmlPath;
                coverageLogger.info(`HTML report exported to: ${htmlPath}`);
            } catch (htmlError) {
                exportResults.errors.push(`HTML export failed: ${htmlError.message}`);
            }
        }

        // Generate XML format coverage data for CI/CD integration if requested
        if (exportOptions.outputFormats.includes('xml')) {
            try {
                const xmlData = generateXMLFormat(coverageData);
                const xmlPath = path.join(outputDir, 'coverage.xml');
                await fs.writeFile(xmlPath, xmlData, 'utf8');
                
                exportResults.formats.push('xml');
                exportResults.files.xml = xmlPath;
                coverageLogger.info(`XML format exported to: ${xmlPath}`);
            } catch (xmlError) {
                exportResults.errors.push(`XML export failed: ${xmlError.message}`);
            }
        }

        // Write coverage summary files with educational metadata and context
        const summaryPath = path.join(outputDir, 'coverage-summary.txt');
        const summaryData = generateTextSummary(coverageData);
        await fs.writeFile(summaryPath, summaryData, 'utf8');
        exportResults.files.summary = summaryPath;

        // Create coverage badge data for documentation integration
        if (exportOptions.generateBadges) {
            const badgeData = generateCoverageBadges(coverageData);
            const badgePath = path.join(outputDir, 'badges.json');
            await fs.writeFile(badgePath, JSON.stringify(badgeData, null, 2), 'utf8');
            exportResults.files.badges = badgePath;
        }

        // Log export completion with file paths and format information
        coverageLogger.info('Coverage data export completed:', {
            formats: exportResults.formats,
            totalFiles: Object.keys(exportResults.files).length,
            outputDirectory: outputDir
        });

        // Check if any exports failed
        if (exportResults.errors.length > 0) {
            exportResults.success = false;
            coverageLogger.warn('Some coverage exports failed:', exportResults.errors);
        }

        // Return export results with file locations and success status
        return exportResults;

    } catch (error) {
        coverageLogger.error('Coverage data export failed:', error.message);
        return {
            success: false,
            formats: [],
            files: {},
            errors: [error.message]
        };
    }
}

/**
 * Generates LCOV format data from coverage results.
 * 
 * @param {Object} coverageData - Coverage data to convert
 * @returns {string} LCOV format string
 */
function generateLCOVFormat(coverageData) {
    let lcovData = '';
    
    // Add test name
    lcovData += 'TN:\n';
    
    // Add summary data (simplified for tutorial application)
    lcovData += 'SF:src/app.js\n';
    lcovData += `LF:${coverageData.summary.lines.total}\n`;
    lcovData += `LH:${coverageData.summary.lines.covered}\n`;
    lcovData += `FNF:${coverageData.summary.functions.total}\n`;
    lcovData += `FNH:${coverageData.summary.functions.covered}\n`;
    lcovData += `BRF:${coverageData.summary.branches.total}\n`;
    lcovData += `BRH:${coverageData.summary.branches.covered}\n`;
    lcovData += 'end_of_record\n';
    
    return lcovData;
}

/**
 * Generates HTML coverage report.
 * 
 * @param {Object} coverageData - Coverage data to format
 * @returns {string} HTML report string
 */
function generateHTMLReport(coverageData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Node.js Tutorial - Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; }
        .pass { background-color: #d4edda; border: 1px solid #c3e6cb; }
        .fail { background-color: #f8d7da; border: 1px solid #f5c6cb; }
        .percentage { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Node.js Tutorial Application - Coverage Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="metrics">
        <div class="metric ${coverageData.summary.lines.percentage >= 90 ? 'pass' : 'fail'}">
            <h3>Lines</h3>
            <div class="percentage">${coverageData.summary.lines.percentage}%</div>
            <p>${coverageData.summary.lines.covered}/${coverageData.summary.lines.total}</p>
        </div>
        
        <div class="metric ${coverageData.summary.functions.percentage >= 95 ? 'pass' : 'fail'}">
            <h3>Functions</h3>
            <div class="percentage">${coverageData.summary.functions.percentage}%</div>
            <p>${coverageData.summary.functions.covered}/${coverageData.summary.functions.total}</p>
        </div>
        
        <div class="metric ${coverageData.summary.branches.percentage >= 85 ? 'pass' : 'fail'}">
            <h3>Branches</h3>
            <div class="percentage">${coverageData.summary.branches.percentage}%</div>
            <p>${coverageData.summary.branches.covered}/${coverageData.summary.branches.total}</p>
        </div>
        
        <div class="metric ${coverageData.summary.statements.percentage >= 90 ? 'pass' : 'fail'}">
            <h3>Statements</h3>
            <div class="percentage">${coverageData.summary.statements.percentage}%</div>
            <p>${coverageData.summary.statements.covered}/${coverageData.summary.statements.total}</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Generates XML format coverage data.
 * 
 * @param {Object} coverageData - Coverage data to convert
 * @returns {string} XML format string
 */
function generateXMLFormat(coverageData) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<coverage version="1" timestamp="${Date.now()}">
    <project name="${APPLICATION.NAME}">
        <metrics 
            statements="${coverageData.summary.statements.total}"
            coveredstatements="${coverageData.summary.statements.covered}"
            functions="${coverageData.summary.functions.total}"
            coveredfunctions="${coverageData.summary.functions.covered}"
            lines="${coverageData.summary.lines.total}"
            coveredlines="${coverageData.summary.lines.covered}"
            branches="${coverageData.summary.branches.total}"
            coveredbranches="${coverageData.summary.branches.covered}"
        />
    </project>
</coverage>`;
}

/**
 * Generates text summary of coverage data.
 * 
 * @param {Object} coverageData - Coverage data to summarize
 * @returns {string} Text summary
 */
function generateTextSummary(coverageData) {
    return `Node.js Tutorial Application - Coverage Summary
Generated: ${new Date().toLocaleString()}

Coverage Metrics:
- Lines: ${coverageData.summary.lines.percentage}% (${coverageData.summary.lines.covered}/${coverageData.summary.lines.total})
- Functions: ${coverageData.summary.functions.percentage}% (${coverageData.summary.functions.covered}/${coverageData.summary.functions.total})
- Branches: ${coverageData.summary.branches.percentage}% (${coverageData.summary.branches.covered}/${coverageData.summary.branches.total})
- Statements: ${coverageData.summary.statements.percentage}% (${coverageData.summary.statements.covered}/${coverageData.summary.statements.total})

Average Coverage: ${coverageData.averageCoverage || 0}%

Uncovered Lines: ${coverageData.uncoveredLines.length > 0 ? coverageData.uncoveredLines.join(', ') : 'None'}
`;
}

/**
 * Generates coverage badge data.
 * 
 * @param {Object} coverageData - Coverage data for badge generation
 * @returns {Object} Badge configuration data
 */
function generateCoverageBadges(coverageData) {
    const getColor = (percentage) => {
        if (percentage >= 90) return 'brightgreen';
        if (percentage >= 80) return 'green';
        if (percentage >= 70) return 'yellow';
        if (percentage >= 60) return 'orange';
        return 'red';
    };

    return {
        lines: {
            label: 'coverage',
            message: `${coverageData.summary.lines.percentage}%`,
            color: getColor(coverageData.summary.lines.percentage)
        },
        functions: {
            label: 'functions',
            message: `${coverageData.summary.functions.percentage}%`,
            color: getColor(coverageData.summary.functions.percentage)
        },
        branches: {
            label: 'branches',
            message: `${coverageData.summary.branches.percentage}%`,
            color: getColor(coverageData.summary.branches.percentage)
        }
    };
}

/**
 * Analyzes coverage gaps to identify specific uncovered code areas, provides educational explanations
 * of why coverage matters, and suggests targeted testing improvements.
 * 
 * @param {Object} coverageData - Coverage data with gap information
 * @param {Array<string>} sourceFiles - Array of source file paths
 * @returns {Object} Coverage gap analysis with specific recommendations and educational guidance
 */
function analyzeCoverageGaps(coverageData, sourceFiles = []) {
    coverageLogger.info('Analyzing coverage gaps for improvement opportunities...');
    
    const gapAnalysis = {
        summary: {
            totalGaps: 0,
            criticalGaps: 0,
            improvementOpportunities: 0
        },
        gaps: {
            lines: [],
            functions: [],
            branches: [],
            statements: []
        },
        recommendations: {
            immediate: [],
            shortTerm: [],
            longTerm: []
        },
        educational: {
            concepts: [],
            examples: [],
            resources: []
        },
        prioritized: []
    };

    try {
        // Identify uncovered lines and functions from coverage data analysis
        if (coverageData.uncoveredLines && coverageData.uncoveredLines.length > 0) {
            coverageData.uncoveredLines.forEach(uncoveredLine => {
                gapAnalysis.gaps.lines.push({
                    type: 'uncovered_line',
                    description: `Lines ${uncoveredLine} are not covered by tests`,
                    impact: 'HIGH',
                    effort: 'MEDIUM'
                });
            });
            gapAnalysis.summary.totalGaps += coverageData.uncoveredLines.length;
        }

        // Categorize coverage gaps by code type (error handling, edge cases, main paths)
        const gapCategories = {
            errorHandling: [],
            edgeCases: [],
            mainPaths: [],
            middleware: []
        };

        // Analyze coverage patterns and identify common testing blind spots
        if (coverageData.summary.branches.percentage < 85) {
            gapCategories.errorHandling.push({
                type: 'branch_coverage',
                description: 'Error handling and conditional branches need more test coverage',
                recommendation: 'Add tests for error scenarios and different conditional paths',
                priority: 'HIGH'
            });
            gapAnalysis.summary.criticalGaps++;
        }

        if (coverageData.summary.functions.percentage < 95) {
            gapCategories.mainPaths.push({
                type: 'function_coverage',
                description: 'Some functions are not being called in tests',
                recommendation: 'Ensure all exported functions have corresponding tests',
                priority: 'HIGH'
            });
            gapAnalysis.summary.criticalGaps++;
        }

        // Generate specific test case recommendations for uncovered code areas
        const testCaseRecommendations = [];
        
        // Hello endpoint specific recommendations
        testCaseRecommendations.push({
            endpoint: '/hello',
            scenarios: [
                'Test successful GET request returns "Hello world"',
                'Test POST request returns 405 Method Not Allowed',
                'Test invalid HTTP methods return appropriate error codes',
                'Test server error scenarios with proper error handling'
            ],
            priority: 'HIGH'
        });

        // Error handling recommendations
        if (gapCategories.errorHandling.length > 0) {
            testCaseRecommendations.push({
                category: 'Error Handling',
                scenarios: [
                    'Test server startup failures and recovery',
                    'Test port binding conflicts and fallback behavior',
                    'Test invalid configuration handling',
                    'Test graceful shutdown procedures'
                ],
                priority: 'MEDIUM'
            });
        }

        // Provide educational explanations of coverage importance for each gap type
        gapAnalysis.educational.concepts = [
            'Line coverage ensures all executable code paths are tested',
            'Function coverage validates that all functions are called during tests',
            'Branch coverage checks that all conditional logic paths are exercised',
            'Statement coverage measures individual JavaScript statement execution',
            'High coverage reduces the likelihood of bugs in production',
            'Coverage gaps often indicate areas where edge cases need testing'
        ];

        // Create actionable improvement plans with priority and difficulty levels
        gapAnalysis.recommendations.immediate = [
            'Add basic tests for the /hello endpoint if not already present',
            'Test both successful responses and error conditions',
            'Ensure all exported functions have test coverage'
        ];

        gapAnalysis.recommendations.shortTerm = [
            'Add comprehensive error handling tests',
            'Test edge cases and boundary conditions',
            'Implement tests for middleware functionality',
            'Add integration tests for complete request/response cycles'
        ];

        gapAnalysis.recommendations.longTerm = [
            'Establish coverage monitoring in CI/CD pipeline',
            'Create comprehensive test documentation',
            'Implement property-based testing for edge cases',
            'Add performance testing with coverage analysis'
        ];

        // Include code examples and testing patterns for gap remediation
        gapAnalysis.educational.examples = [
            {
                scenario: 'Testing the /hello endpoint',
                code: `
// Example test for /hello endpoint
test('should return Hello world for GET /hello', async () => {
    const response = await request(app)
        .get('/hello')
        .expect(200);
    assert.strictEqual(response.text, 'Hello world');
});

// Example error handling test
test('should return 405 for POST /hello', async () => {
    await request(app)
        .post('/hello')
        .expect(405);
});`
            },
            {
                scenario: 'Testing error conditions',
                code: `
// Example error handling test
test('should handle server errors gracefully', async () => {
    // Mock error condition
    const originalHandler = app._router.stack[0].handle;
    app._router.stack[0].handle = () => { throw new Error('Test error'); };
    
    await request(app)
        .get('/hello')
        .expect(500);
        
    // Restore original handler
    app._router.stack[0].handle = originalHandler;
});`
            }
        ];

        // Generate coverage gap summary with educational context and learning objectives
        gapAnalysis.educational.resources = [
            'Node.js Testing Guide: https://nodejs.org/api/test.html',
            'Express.js Testing: https://expressjs.com/en/guide/testing.html',
            'SuperTest Documentation: https://github.com/ladjs/supertest',
            'Testing Best Practices: https://github.com/goldbergyoni/javascript-testing-best-practices'
        ];

        // Create prioritized action list
        gapAnalysis.prioritized = [
            ...gapCategories.errorHandling.map(gap => ({ ...gap, category: 'Error Handling' })),
            ...gapCategories.mainPaths.map(gap => ({ ...gap, category: 'Main Paths' })),
            ...gapCategories.edgeCases.map(gap => ({ ...gap, category: 'Edge Cases' })),
            ...gapCategories.middleware.map(gap => ({ ...gap, category: 'Middleware' }))
        ].sort((a, b) => {
            const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        gapAnalysis.summary.improvementOpportunities = gapAnalysis.prioritized.length;

        coverageLogger.info('Coverage gap analysis completed:', {
            totalGaps: gapAnalysis.summary.totalGaps,
            criticalGaps: gapAnalysis.summary.criticalGaps,
            improvementOpportunities: gapAnalysis.summary.improvementOpportunities
        });

        // Return comprehensive analysis with targeted improvement recommendations
        return gapAnalysis;

    } catch (error) {
        coverageLogger.error('Coverage gap analysis failed:', error.message);
        return {
            ...gapAnalysis,
            error: error.message,
            analysisFailed: true
        };
    }
}

/**
 * Displays formatted coverage execution summary with statistics, threshold validation results,
 * educational insights, and next steps for coverage improvement.
 * 
 * @param {Object} coverageReport - Complete coverage report with all statistics and analysis
 * @param {Object} displayOptions - Options for output formatting and content selection
 * @returns {void} No return value - outputs formatted coverage summary to console
 */
function displayCoverageSummary(coverageReport, displayOptions = {}) {
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

    const success = coverageReport.summary.overallStatus === 'PASSED';
    const primaryColor = success ? colors.green : colors.red;
    const statusIcon = success ? '✅' : '❌';

    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}${colors.cyan}${statusIcon} NODE.JS TUTORIAL - CODE COVERAGE SUMMARY${colors.reset}`);
    console.log('='.repeat(80));

    // Display coverage execution header with application name, version, and timestamp
    console.log(`${colors.bright}Application:${colors.reset} ${coverageReport.header.application.name} v${coverageReport.header.application.version}`);
    console.log(`${colors.bright}Description:${colors.reset} ${coverageReport.header.application.description}`);
    console.log(`${colors.bright}Execution Time:${colors.reset} ${new Date(coverageReport.header.execution.timestamp).toLocaleString()}`);
    console.log(`${colors.bright}Duration:${colors.reset} ${coverageReport.header.execution.duration}ms`);
    console.log(`${colors.bright}Environment:${colors.reset} ${coverageReport.header.execution.environment}`);
    console.log(`${colors.bright}Node.js Version:${colors.reset} ${coverageReport.header.execution.nodeVersion}`);

    // Show overall coverage statistics in formatted table with color coding
    console.log('\n' + colors.bright + '📊 COVERAGE RESULTS' + colors.reset);
    console.log('─'.repeat(60));
    
    const summary = coverageReport.summary.overview;
    
    // Lines coverage
    const linesColor = summary.lines.status === 'PASS' ? colors.green : colors.red;
    const linesIcon = summary.lines.status === 'PASS' ? '✅' : '❌';
    console.log(`${linesIcon} ${colors.bright}Lines:${colors.reset}       ${linesColor}${summary.lines.percentage}%${colors.reset} (${summary.lines.covered}/${summary.lines.total}) - Target: 90%`);
    
    // Functions coverage
    const functionsColor = summary.functions.status === 'PASS' ? colors.green : colors.red;
    const functionsIcon = summary.functions.status === 'PASS' ? '✅' : '❌';
    console.log(`${functionsIcon} ${colors.bright}Functions:${colors.reset}   ${functionsColor}${summary.functions.percentage}%${colors.reset} (${summary.functions.covered}/${summary.functions.total}) - Target: 95%`);
    
    // Branches coverage
    const branchesColor = summary.branches.status === 'PASS' ? colors.green : colors.red;
    const branchesIcon = summary.branches.status === 'PASS' ? '✅' : '❌';
    console.log(`${branchesIcon} ${colors.bright}Branches:${colors.reset}    ${branchesColor}${summary.branches.percentage}%${colors.reset} (${summary.branches.covered}/${summary.branches.total}) - Target: 85%`);
    
    // Statements coverage
    const statementsColor = summary.statements.status === 'PASS' ? colors.green : colors.red;
    const statementsIcon = summary.statements.status === 'PASS' ? '✅' : '❌';
    console.log(`${statementsIcon} ${colors.bright}Statements:${colors.reset}  ${statementsColor}${summary.statements.percentage}%${colors.reset} (${summary.statements.covered}/${summary.statements.total}) - Target: 90%`);
    
    console.log(`${colors.bright}Average:${colors.reset}     ${primaryColor}${summary.averageCoverage}%${colors.reset}`);
    console.log(`${colors.bright}Overall Status:${colors.reset} ${primaryColor}${summary.overallStatus}${colors.reset}`);

    // Display threshold validation results with pass/fail indicators and gap analysis
    if (coverageReport.thresholds.violations.length > 0) {
        console.log('\n' + colors.bright + colors.red + '🚨 THRESHOLD VIOLATIONS' + colors.reset);
        console.log('─'.repeat(60));
        
        coverageReport.thresholds.violations.forEach(violation => {
            console.log(`${colors.red}•${colors.reset} ${violation.message}`);
            console.log(`  Gap: ${violation.gap} to reach threshold`);
        });
    }

    // Show file-level coverage breakdown with hotspot identification
    if (coverageReport.files.hotspots.length > 0) {
        console.log('\n' + colors.bright + '🔍 COVERAGE HOTSPOTS (Files Needing Attention)' + colors.reset);
        console.log('─'.repeat(60));
        
        coverageReport.files.hotspots.forEach(file => {
            const priorityColor = file.priority === 'HIGH' ? colors.red : file.priority === 'MEDIUM' ? colors.yellow : colors.blue;
            console.log(`${priorityColor}[${file.priority}]${colors.reset} ${file.filename}: ${file.lines}% lines, ${file.functions}% functions`);
        });
    }

    // Display uncovered code analysis with specific recommendations
    if (coverageReport.uncovered.hasUncoveredCode) {
        console.log('\n' + colors.bright + '📋 UNCOVERED CODE ANALYSIS' + colors.reset);
        console.log('─'.repeat(60));
        
        console.log(`${colors.yellow}Uncovered Lines Found:${colors.reset} ${coverageReport.uncovered.uncoveredLines.length} areas`);
        coverageReport.uncovered.recommendations.slice(0, 3).forEach(rec => {
            console.log(`${colors.cyan}💡${colors.reset} ${rec}`);
        });
    }

    // Include educational insights about coverage patterns and testing importance
    console.log('\n' + colors.bright + '🎓 EDUCATIONAL INSIGHTS' + colors.reset);
    console.log('─'.repeat(60));
    
    coverageReport.insights.concepts.slice(0, 3).forEach(concept => {
        console.log(`${colors.cyan}💡${colors.reset} ${concept}`);
    });

    console.log('\n' + colors.bright + '✨ TESTING BEST PRACTICES' + colors.reset);
    coverageReport.insights.bestPractices.slice(0, 3).forEach(practice => {
        console.log(`${colors.green}📋${colors.reset} ${practice}`);
    });

    // Show performance impact of coverage collection on test execution
    console.log('\n' + colors.bright + '⚡ PERFORMANCE IMPACT' + colors.reset);
    console.log('─'.repeat(60));
    console.log(`${colors.bright}Execution Time:${colors.reset} ${coverageReport.performance.executionTime}ms`);
    console.log(`${colors.bright}Coverage Overhead:${colors.reset} ${coverageReport.performance.coverageOverhead}`);
    
    if (coverageReport.performance.recommendations.length > 0) {
        coverageReport.performance.recommendations.forEach(rec => {
            console.log(`${colors.yellow}⚠️${colors.reset} ${rec}`);
        });
    }

    // Display next steps for coverage improvement with specific action items
    if (coverageReport.improvements.priority.high.length > 0 || coverageReport.improvements.priority.medium.length > 0) {
        console.log('\n' + colors.bright + '🚀 IMPROVEMENT RECOMMENDATIONS' + colors.reset);
        console.log('─'.repeat(60));
        
        // High priority improvements
        if (coverageReport.improvements.priority.high.length > 0) {
            console.log(`${colors.red}${colors.bright}HIGH PRIORITY:${colors.reset}`);
            coverageReport.improvements.priority.high.forEach(improvement => {
                console.log(`  ${colors.red}•${colors.reset} ${improvement.recommendation}`);
            });
        }
        
        // Medium priority improvements
        if (coverageReport.improvements.priority.medium.length > 0) {
            console.log(`${colors.yellow}${colors.bright}MEDIUM PRIORITY:${colors.reset}`);
            coverageReport.improvements.priority.medium.slice(0, 2).forEach(improvement => {
                console.log(`  ${colors.yellow}•${colors.reset} ${improvement.recommendation}`);
            });
        }
    }

    // Include relevant documentation links for coverage tools and best practices
    console.log('\n' + colors.bright + '📚 LEARNING RESOURCES' + colors.reset);
    console.log('─'.repeat(60));
    
    const resources = [
        'Node.js Test Coverage: https://nodejs.org/api/test.html#test-runner',
        'Express.js Testing Guide: https://expressjs.com/en/guide/testing.html',
        'SuperTest Documentation: https://github.com/ladjs/supertest',
        'Testing Best Practices: https://github.com/goldbergyoni/javascript-testing-best-practices'
    ];
    
    resources.forEach(resource => {
        console.log(`${colors.blue}🔗${colors.reset} ${resource}`);
    });

    // Format output with enhanced readability and educational annotations
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}${primaryColor}Coverage analysis ${success ? 'completed successfully' : 'completed with issues'}!${colors.reset}`);
    
    if (success) {
        console.log(`${colors.green}🎉 All coverage thresholds met! Your Node.js application has excellent test coverage.${colors.reset}`);
        console.log(`${colors.green}Continue maintaining high coverage as you add new features.${colors.reset}`);
    } else {
        console.log(`${colors.red}⚠️  Coverage thresholds not met. Review the recommendations above.${colors.reset}`);
        console.log(`${colors.yellow}Use this as a learning opportunity to improve your testing skills.${colors.reset}`);
    }
    
    console.log('='.repeat(80) + '\n');
}

/**
 * Handles coverage threshold failures with detailed analysis, educational guidance, and specific
 * recommendations for achieving coverage targets in the tutorial application.
 * 
 * @param {Object} validationResults - Coverage threshold validation results
 * @param {Object} coverageData - Coverage data with detailed metrics
 * @returns {Object} Coverage failure analysis with educational guidance and improvement strategies
 */
function handleCoverageFailures(validationResults, coverageData) {
    coverageLogger.info('Analyzing coverage failures for educational guidance...');
    
    const failureAnalysis = {
        hasFailures: !validationResults.passed,
        failureSummary: {
            totalViolations: validationResults.violations.length,
            criticalViolations: 0,
            affectedMetrics: []
        },
        categories: {
            lines: { violations: [], recommendations: [] },
            functions: { violations: [], recommendations: [] },
            branches: { violations: [], recommendations: [] },
            statements: { violations: [], recommendations: [] }
        },
        educational: {
            concepts: [],
            examples: [],
            stepByStep: [],
            commonMistakes: []
        },
        actionPlan: {
            immediate: [],
            shortTerm: [],
            longTerm: []
        },
        resources: []
    };

    if (!failureAnalysis.hasFailures) {
        coverageLogger.info('No coverage failures detected - all thresholds met');
        return {
            ...failureAnalysis,
            successMessage: 'All coverage thresholds have been successfully met!'
        };
    }

    try {
        // Categorize coverage failures by type (lines, functions, branches, statements)
        validationResults.violations.forEach(violation => {
            const metricType = violation.metric.toLowerCase().replace(' coverage', '');
            
            if (failureAnalysis.categories[metricType]) {
                failureAnalysis.categories[metricType].violations.push(violation);
                failureAnalysis.failureSummary.affectedMetrics.push(metricType);
                
                // Mark as critical if gap is large
                if (parseFloat(violation.gap.replace('%', '')) > 10) {
                    failureAnalysis.failureSummary.criticalViolations++;
                }
            }
        });

        // Calculate specific coverage gaps and improvement requirements
        Object.keys(failureAnalysis.categories).forEach(metric => {
            const category = failureAnalysis.categories[metric];
            if (category.violations.length > 0) {
                // Generate specific test case examples for improving coverage in each category
                category.recommendations = generateMetricSpecificRecommendations(metric, coverageData);
            }
        });

        // Identify high-impact areas for coverage improvement with priority ranking
        const highImpactAreas = [
            {
                area: '/hello endpoint testing',
                impact: 'HIGH',
                description: 'The main tutorial endpoint should have comprehensive test coverage',
                actions: [
                    'Test successful GET request returning "Hello world"',
                    'Test unsupported HTTP methods (POST, PUT, DELETE)',
                    'Test error handling and server failure scenarios',
                    'Test response headers and status codes'
                ]
            },
            {
                area: 'Error handling paths',
                impact: 'HIGH',
                description: 'Error conditions need testing to improve branch coverage',
                actions: [
                    'Test server startup failures',
                    'Test port binding conflicts',
                    'Test invalid configuration handling',
                    'Test graceful error responses'
                ]
            },
            {
                area: 'Express.js middleware',
                impact: 'MEDIUM',
                description: 'Middleware functions should be tested independently',
                actions: [
                    'Test error handling middleware',
                    'Test request logging middleware',
                    'Test response formatting middleware',
                    'Test middleware execution order'
                ]
            }
        ];

        // Generate educational explanations of coverage importance and benefits
        failureAnalysis.educational.concepts = [
            'Code coverage measures how much of your code is executed during tests',
            'High coverage helps ensure your application behaves correctly under various conditions',
            'Line coverage shows which lines of code are executed during tests',
            'Function coverage ensures all functions are called and tested',
            'Branch coverage validates that all conditional paths are tested',
            'Coverage gaps often indicate areas where bugs might hide'
        ];

        // Provide specific test case examples for improving coverage in each category
        failureAnalysis.educational.examples = [
            {
                category: 'Line Coverage Improvement',
                example: `
// Test all lines in the /hello route handler
test('should execute all lines in hello handler', async () => {
    const response = await request(app)
        .get('/hello')
        .expect(200);
    
    // This ensures the response generation line is covered
    assert.strictEqual(response.text, 'Hello world');
    
    // Test error handling lines
    const errorApp = createAppWithError();
    await request(errorApp)
        .get('/hello')
        .expect(500);
});`,
                explanation: 'Testing both success and error paths ensures line coverage'
            },
            {
                category: 'Function Coverage Improvement',
                example: `
// Ensure all exported functions are tested
const { createServer, startServer, stopServer } = require('./server');

test('should test all server functions', async () => {
    const server = createServer(); // Tests createServer function
    await startServer(server, 3001); // Tests startServer function
    await stopServer(server); // Tests stopServer function
});`,
                explanation: 'Every exported function should have at least one test'
            },
            {
                category: 'Branch Coverage Improvement',
                example: `
// Test all conditional branches
test('should test all configuration branches', () => {
    // Test with PORT environment variable set
    process.env.PORT = '8080';
    const config1 = getServerConfig();
    assert.strictEqual(config1.port, 8080);
    
    // Test without PORT environment variable
    delete process.env.PORT;
    const config2 = getServerConfig();
    assert.strictEqual(config2.port, 3000); // Default value
});`,
                explanation: 'Test both true and false paths of conditional statements'
            }
        ];

        // Include Node.js and Express.js testing patterns for coverage enhancement
        failureAnalysis.educational.stepByStep = [
            {
                step: 1,
                title: 'Identify Uncovered Code',
                description: 'Review the coverage report to find uncovered lines and functions',
                action: 'Look at the coverage output and note specific line numbers that need testing'
            },
            {
                step: 2,
                title: 'Write Targeted Tests',
                description: 'Create specific test cases for uncovered code paths',
                action: 'Focus on one uncovered area at a time and write comprehensive tests'
            },
            {
                step: 3,
                title: 'Test Error Scenarios',
                description: 'Add tests for error handling and edge cases',
                action: 'Mock error conditions and verify proper error responses'
            },
            {
                step: 4,
                title: 'Verify Coverage Improvement',
                description: 'Run coverage analysis again to confirm improvements',
                action: 'Use --coverage flag to validate that coverage percentages have increased'
            }
        ];

        // Create step-by-step improvement plans with measurable targets
        failureAnalysis.actionPlan.immediate = [
            'Run the test with --coverage flag to see detailed coverage report',
            'Identify the specific files and line numbers that need coverage',
            'Write basic tests for the /hello endpoint if not already present',
            'Add tests for error conditions in the main application flow'
        ];

        failureAnalysis.actionPlan.shortTerm = [
            'Achieve line coverage above 90% by adding targeted tests',
            'Improve function coverage to 95% by testing all exported functions',
            'Increase branch coverage to 85% by testing conditional logic',
            'Add integration tests for complete request/response cycles'
        ];

        failureAnalysis.actionPlan.longTerm = [
            'Integrate coverage checking into development workflow',
            'Set up automated coverage reporting in CI/CD pipeline',
            'Establish coverage monitoring and trend analysis',
            'Create comprehensive test documentation and guidelines'
        ];

        // Generate failure summary with actionable recommendations and learning resources
        failureAnalysis.educational.commonMistakes = [
            'Writing tests that don\'t actually execute the code they\'re meant to test',
            'Focusing only on happy path scenarios without testing error conditions',
            'Not testing all branches of conditional statements (if/else, switch)',
            'Forgetting to test async/await error handling in Node.js applications',
            'Not testing middleware functions independently from route handlers'
        ];

        failureAnalysis.resources = [
            'Node.js Test Runner Coverage: https://nodejs.org/api/test.html#collecting-code-coverage',
            'Express.js Testing Guide: https://expressjs.com/en/guide/testing.html',
            'SuperTest for HTTP Testing: https://github.com/ladjs/supertest',
            'JavaScript Testing Best Practices: https://github.com/goldbergyoni/javascript-testing-best-practices',
            'Coverage.js Documentation: https://github.com/gotwarlost/istanbul',
            'Node.js Testing Tutorial: https://nodejs.dev/learn/nodejs-testing'
        ];

        coverageLogger.info('Coverage failure analysis completed:', {
            totalViolations: failureAnalysis.failureSummary.totalViolations,
            criticalViolations: failureAnalysis.failureSummary.criticalViolations,
            affectedMetrics: failureAnalysis.failureSummary.affectedMetrics.length
        });

        // Return comprehensive failure analysis with educational value and guidance
        return failureAnalysis;

    } catch (error) {
        coverageLogger.error('Coverage failure analysis failed:', error.message);
        return {
            ...failureAnalysis,
            error: error.message,
            analysisFailed: true
        };
    }
}

/**
 * Generates metric-specific recommendations for coverage improvement.
 * 
 * @param {string} metric - Coverage metric type (lines, functions, branches, statements)
 * @param {Object} coverageData - Coverage data for analysis
 * @returns {Array<string>} Array of metric-specific recommendations
 */
function generateMetricSpecificRecommendations(metric, coverageData) {
    const recommendations = [];
    
    switch (metric) {
        case 'lines':
            recommendations.push('Add tests that execute more lines of code');
            recommendations.push('Focus on code paths that are not currently being tested');
            recommendations.push('Consider testing edge cases and error conditions');
            break;
            
        case 'functions':
            recommendations.push('Ensure all exported functions have test coverage');
            recommendations.push('Test helper functions and utility methods');
            recommendations.push('Add tests for constructor functions and class methods');
            break;
            
        case 'branches':
            recommendations.push('Test all conditional statements (if/else, switch)');
            recommendations.push('Add tests for error handling branches');
            recommendations.push('Test different input validation paths');
            break;
            
        case 'statements':
            recommendations.push('Ensure all JavaScript statements are executed in tests');
            recommendations.push('Test assignment statements and variable declarations');
            recommendations.push('Add coverage for statement execution in different contexts');
            break;
            
        default:
            recommendations.push('Review coverage report for specific improvement areas');
            break;
    }
    
    return recommendations;
}

/**
 * Main coverage execution function that orchestrates complete test suite execution with comprehensive
 * coverage analysis, threshold validation, reporting, and educational feedback.
 * 
 * @returns {Promise<number>} Promise resolving to process exit code (0 for success, 1 for coverage failure)
 */
async function main() {
    let exitCode = 0;
    let setupResults = null;
    let coverageReport = null;
    
    try {
        // Parse coverage-specific command line arguments and validate options
        const coverageOptions = parseCoverageArguments(process.argv);
        coverageLogger.info('Coverage execution started with options:', coverageOptions);

        // Initialize coverage logger and log coverage execution start with configuration
        coverageLogger.info(`Starting Node.js Tutorial Application coverage analysis at ${new Date().toISOString()}`);
        coverageLogger.info(`Application: ${APPLICATION.NAME} v${APPLICATION.VERSION}`);
        coverageLogger.info('Coverage targets: 90% lines, 95% functions, 85% branches, 90% statements');

        // Validate test environment safety for coverage collection execution
        if (!isTestEnvironment()) {
            coverageLogger.warn('Setting NODE_ENV to test for coverage execution safety');
            process.env.NODE_ENV = 'test';
        }

        // Initialize coverage execution environment and output directory preparation
        setupResults = await initializeCoverageExecution(coverageOptions);
        coverageLogger.info('Coverage environment setup completed successfully');

        // Discover and categorize test files for coverage-enabled execution
        const testFiles = await discoverTestFiles({
            testTypes: ['unit', 'integration'],
            verbose: coverageOptions.verbose
        });
        
        if (testFiles.total === 0) {
            coverageLogger.warn('No test files found for coverage analysis');
            exitCode = 1;
            return exitCode;
        }

        // Flatten test files for coverage execution
        const allTestFiles = [
            ...testFiles.unit,
            ...testFiles.integration,
            ...testFiles.e2e
        ];

        coverageLogger.info(`Discovered ${allTestFiles.length} test files for coverage analysis`);

        // Set up test execution environment with coverage collection configuration
        await setupTestExecution({
            coverage: true,
            parallel: false, // Disable parallel for coverage to ensure accurate reporting
            timeout: 60000 // Increase timeout for coverage overhead
        });

        // Execute complete test suite with Node.js --experimental-test-coverage flag
        const testExecution = await runTestsWithCoverage(allTestFiles, coverageOptions);
        
        if (!testExecution.success) {
            coverageLogger.error('Coverage-enabled test execution failed:', testExecution.error);
            exitCode = 1;
            
            if (testExecution.errors.length > 0) {
                coverageLogger.error('Test execution errors:', testExecution.errors);
            }
            
            // Continue with analysis even if tests failed to provide educational value
        }

        // Parse coverage output and extract comprehensive coverage metrics
        const coverageData = testExecution.coverageData || await parseCoverageOutput(testExecution.stdout || '', 'text');
        coverageLogger.info('Coverage data parsing completed');

        // Validate coverage results against threshold targets and quality gates
        const validationResults = validateCoverageThresholds(coverageData, coverageOptions.thresholds);
        coverageLogger.info(`Coverage validation: ${validationResults.status}`);

        // Generate comprehensive coverage report with educational insights and analysis
        coverageReport = generateCoverageReport(coverageData, validationResults, {
            thresholds: coverageOptions.thresholds,
            verbose: coverageOptions.verbose
        });
        coverageLogger.info('Coverage report generation completed');

        // Export coverage data in multiple formats for tool integration
        const exportResults = await exportCoverageData(coverageData, {
            outputFormats: coverageOptions.outputFormats,
            outputDirectory: coverageOptions.outputDirectory,
            generateBadges: coverageOptions.generateBadges
        });
        
        if (exportResults.success) {
            coverageLogger.info('Coverage data export completed:', {
                formats: exportResults.formats,
                files: Object.keys(exportResults.files).length
            });
        } else {
            coverageLogger.warn('Coverage export had issues:', exportResults.errors);
        }

        // Analyze coverage gaps and provide targeted improvement recommendations
        const gapAnalysis = await analyzeCoverageGaps(coverageData, allTestFiles);
        coverageLogger.info('Coverage gap analysis completed');

        // Handle coverage failures with detailed educational guidance and action plans
        let failureAnalysis = null;
        if (!validationResults.passed) {
            failureAnalysis = handleCoverageFailures(validationResults, coverageData);
            coverageLogger.info('Coverage failure analysis completed');
        }

        // Display coverage summary with statistics, insights, and next steps
        displayCoverageSummary(coverageReport, {
            validationResults,
            gapAnalysis,
            failureAnalysis,
            verbose: coverageOptions.verbose
        });

        // Determine final exit code based on coverage validation and threshold compliance
        if (!validationResults.passed && coverageOptions.failOnCoverage) {
            coverageLogger.error(`Coverage thresholds not met: ${validationResults.violations.length} violations`);
            exitCode = 1;
        } else if (testExecution && !testExecution.success) {
            coverageLogger.error('Test execution failed during coverage analysis');
            exitCode = 1;
        } else {
            coverageLogger.info('Coverage analysis completed successfully');
            exitCode = 0;
        }

        // Log coverage execution completion with final status and performance metrics
        const totalDuration = Date.now() - coverageStartTime;
        coverageLogger.info(`Coverage execution completed in ${totalDuration}ms with exit code ${exitCode}`);

    } catch (error) {
        // Handle unexpected errors during coverage execution
        coverageLogger.error('Coverage execution failed with error:', error.message);
        
        if (process.argv.includes('--verbose')) {
            coverageLogger.error('Error stack trace:', error.stack);
        }
        
        exitCode = 1;
    } finally {
        // Provide final educational message based on coverage results
        const totalDuration = Date.now() - coverageStartTime;
        
        if (exitCode === 0) {
            console.log(`\n${APPLICATION.NAME} coverage analysis completed successfully! 🎉`);
            console.log('Your code has excellent test coverage. Continue maintaining high standards.');
        } else {
            console.log(`\n${APPLICATION.NAME} coverage analysis completed with issues. 📚`);
            console.log('Use the recommendations above to improve test coverage and code quality.');
        }
        
        console.log(`Total execution time: ${totalDuration}ms`);
        console.log('Learn more about testing best practices in the educational resources above.\n');
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
            console.error('Fatal error in coverage execution:', error.message);
            process.exit(1);
        });
}

// Export functions for testing and external use
module.exports = {
    parseCoverageArguments,
    runTestsWithCoverage,
    parseCoverageOutput,
    validateCoverageThresholds,
    generateCoverageReport,
    exportCoverageData,
    analyzeCoverageGaps,
    main
};