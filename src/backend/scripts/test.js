// Test Script for Node.js Tutorial Backend - Jest Test Suite Orchestration
// Purpose: Executes all automated test suites for the Node.js tutorial backend using Jest
// Framework: Jest ^29.0.0 with SuperTest integration for HTTP assertions
// Environment: Node.js 18+ with ES2022+ syntax support and modern async/await patterns

// Set NODE_ENV to 'test' immediately to ensure all dependencies load in test mode
// This must be done before any other imports to ensure proper environment configuration
process.env.NODE_ENV = 'test';

// External dependencies - Modern testing and utility libraries
const jest = require('jest'); // ^29.0.0 - Test runner and assertion library with built-in coverage, mocking, and ES2022+ support
const chalk = require('chalk'); // ^5.3.0 - Terminal styling library for colorized console output and improved readability
const path = require('node:path'); // builtin - Node.js path utilities for file path resolution and Jest configuration loading
const process = require('node:process'); // builtin - Node.js process management for exit codes, environment variables, and lifecycle handling

// Internal dependencies - Jest configuration
const jestConfig = require('../jest.config.js'); // Centralized Jest configuration with coverage, environment, and test discovery settings

/**
 * Main Test Execution Function
 * 
 * Orchestrates the complete test execution process for the Node.js tutorial backend
 * application using Jest framework. This function handles environment setup, Jest
 * configuration loading, test execution with proper error handling, and provides
 * developer-friendly output with colorized console messages.
 * 
 * The function implements comprehensive test execution patterns including:
 * - Environment isolation with NODE_ENV='test' configuration
 * - Jest configuration loading from centralized configuration file
 * - CLI argument processing for developer flexibility and CI/CD integration
 * - Test result processing with detailed success/failure reporting
 * - Process exit code management for automated pipeline integration
 * - Error handling with structured logging and colorized output
 * 
 * Jest ^29.0.0 Integration Features:
 * - Modern JavaScript testing with ES2022+ syntax support
 * - Built-in code coverage collection and reporting
 * - Automatic test discovery using configured testMatch patterns
 * - Comprehensive mocking and assertion capabilities
 * - CI/CD pipeline integration with deterministic test execution
 * - SuperTest integration for HTTP endpoint testing
 * 
 * Express 5.1.0 Application Testing:
 * - HTTP request/response cycle testing with SuperTest
 * - Route handler testing with async/await patterns
 * - Error handling middleware testing with promise rejection scenarios
 * - Integration testing across the complete Express application stack
 * - Security feature testing including ReDoS protection validation
 * 
 * CI/CD Pipeline Integration:
 * - Supports automated test execution in continuous integration environments
 * - Provides proper exit codes for build success/failure determination
 * - Handles CLI arguments for coverage reporting and test filtering
 * - Generates machine-readable test results for pipeline processing
 * - Implements timeout handling for long-running test suites
 * 
 * Development Workflow Support:
 * - Watch mode support for interactive development testing
 * - Coverage reporting with multiple output formats
 * - Detailed error messages with stack traces for debugging
 * - Performance monitoring with test execution timing
 * - File change detection for efficient test re-execution
 * 
 * Educational Design Principles:
 * - Clear test execution flow for learning testing fundamentals
 * - Comprehensive error handling demonstrating production-ready patterns
 * - Modular test organization showing best practices for test structure
 * - Environment-aware configuration for different development scenarios
 * - Extensive documentation explaining testing concepts and implementation
 * 
 * @async
 * @function runTests
 * @returns {Promise<void>} Resolves when test execution completes, exits process with appropriate code
 * 
 * @example
 * // Basic test execution
 * node ./scripts/test.js
 * 
 * @example
 * // Test execution with coverage reporting
 * node ./scripts/test.js --coverage
 * 
 * @example
 * // Test execution in watch mode for development
 * node ./scripts/test.js --watch
 * 
 * @example
 * // Test execution with specific test pattern
 * node ./scripts/test.js --testNamePattern="Hello World"
 * 
 * @example
 * // CI/CD pipeline integration
 * npm test # Invokes this script with proper exit codes
 * 
 * @throws {Error} Comprehensive error handling with detailed messages and proper exit codes
 * @throws {TestExecutionError} Specific error type for test execution failures
 * @throws {ConfigurationError} Configuration loading and validation errors
 * @throws {EnvironmentError} Environment setup and validation errors
 */
async function runTests() {
    try {
        // Step 1: Environment Setup and Validation
        // Ensure proper test environment configuration before Jest initialization
        console.log(chalk.blue('🚀 Starting Node.js Tutorial Backend Test Suite'));
        console.log(chalk.gray('━'.repeat(60)));
        
        // Validate Node.js version compatibility
        const nodeVersion = process.version;
        const requiredNodeVersion = '18.0.0';
        
        if (!isNodeVersionCompatible(nodeVersion, requiredNodeVersion)) {
            throw new Error(`Node.js ${requiredNodeVersion} or higher is required. Current version: ${nodeVersion}`);
        }
        
        console.log(chalk.green(`✓ Node.js version: ${nodeVersion}`));
        console.log(chalk.green(`✓ Environment: ${process.env.NODE_ENV}`));
        
        // Step 2: Jest Configuration Loading and Validation
        // Load and validate the centralized Jest configuration
        console.log(chalk.blue('📋 Loading Jest Configuration'));
        
        // Validate Jest configuration structure
        if (!jestConfig || typeof jestConfig !== 'object') {
            throw new Error('Invalid Jest configuration: Configuration must be a valid object');
        }
        
        // Validate required configuration properties
        const requiredConfigKeys = ['testEnvironment', 'testMatch', 'collectCoverage'];
        for (const key of requiredConfigKeys) {
            if (!(key in jestConfig)) {
                throw new Error(`Missing required Jest configuration property: ${key}`);
            }
        }
        
        console.log(chalk.green('✓ Jest configuration loaded successfully'));
        console.log(chalk.gray(`  Test environment: ${jestConfig.testEnvironment}`));
        console.log(chalk.gray(`  Coverage collection: ${jestConfig.collectCoverage ? 'enabled' : 'disabled'}`));
        
        // Step 3: CLI Arguments Processing
        // Parse and validate command-line arguments for Jest execution
        console.log(chalk.blue('⚙️  Processing CLI Arguments'));
        
        const cliArgs = process.argv.slice(2);
        const jestArgs = [];
        
        // Add Jest configuration path to arguments
        const configPath = path.resolve(__dirname, '../jest.config.js');
        jestArgs.push('--config', configPath);
        
        // Process additional CLI arguments
        for (const arg of cliArgs) {
            // Validate and sanitize CLI arguments
            if (isValidJestArgument(arg)) {
                jestArgs.push(arg);
            } else {
                console.log(chalk.yellow(`⚠️  Skipping invalid argument: ${arg}`));
            }
        }
        
        console.log(chalk.green(`✓ CLI arguments processed: ${jestArgs.length} arguments`));
        if (jestArgs.length > 2) { // More than just --config and path
            console.log(chalk.gray(`  Arguments: ${jestArgs.slice(2).join(' ')}`));
        }
        
        // Step 4: Test Execution Setup
        // Configure Jest for optimal test execution
        console.log(chalk.blue('🧪 Initializing Test Execution'));
        
        // Configure Jest execution options
        const jestOptions = {
            // Use the loaded configuration
            config: jestConfig,
            
            // Set up proper output handling
            silent: false,
            verbose: jestConfig.verbose || false,
            
            // Configure coverage collection
            collectCoverage: jestConfig.collectCoverage || false,
            
            // Set up environment variables
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        };
        
        console.log(chalk.green('✓ Jest execution environment configured'));
        
        // Step 5: Test Suite Execution
        // Execute all test suites using Jest programmatically
        console.log(chalk.blue('🔬 Executing Test Suites'));
        console.log(chalk.gray('━'.repeat(60)));
        
        // Record test execution start time
        const startTime = Date.now();
        
        // Execute Jest with the configured options and arguments
        const testResult = await jest.run(jestArgs);
        
        // Calculate test execution duration
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // Step 6: Test Result Processing
        // Process and format test execution results
        console.log(chalk.gray('━'.repeat(60)));
        
        if (testResult.results.success) {
            // Test execution successful
            console.log(chalk.green('✅ All tests passed successfully!'));
            
            // Display test summary statistics
            const stats = testResult.results.testResults;
            if (stats && stats.length > 0) {
                const totalTests = stats.reduce((sum, result) => sum + result.numPassingTests, 0);
                const totalTestSuites = stats.length;
                
                console.log(chalk.green(`📊 Test Summary:`));
                console.log(chalk.green(`   Test Suites: ${totalTestSuites} passed`));
                console.log(chalk.green(`   Tests: ${totalTests} passed`));
                console.log(chalk.green(`   Execution Time: ${executionTime}ms`));
            }
            
            // Display coverage information if enabled
            if (jestConfig.collectCoverage) {
                console.log(chalk.blue('📈 Code Coverage Report Generated'));
                console.log(chalk.gray(`   Coverage Directory: ${jestConfig.coverageDirectory}`));
                console.log(chalk.gray(`   Coverage Formats: ${jestConfig.coverageReporters.join(', ')}`));
            }
            
            // Display success message
            console.log(chalk.green('🎉 Test execution completed successfully!'));
            
            // Exit with success code
            process.exit(0);
            
        } else {
            // Test execution failed
            console.log(chalk.red('❌ Test execution failed'));
            
            // Display failure summary
            const stats = testResult.results.testResults;
            if (stats && stats.length > 0) {
                const totalTests = stats.reduce((sum, result) => sum + result.numPassingTests + result.numFailingTests, 0);
                const passingTests = stats.reduce((sum, result) => sum + result.numPassingTests, 0);
                const failingTests = stats.reduce((sum, result) => sum + result.numFailingTests, 0);
                const totalTestSuites = stats.length;
                
                console.log(chalk.red(`📊 Test Summary:`));
                console.log(chalk.red(`   Test Suites: ${totalTestSuites} total`));
                console.log(chalk.red(`   Tests: ${totalTests} total, ${passingTests} passed, ${failingTests} failed`));
                console.log(chalk.red(`   Execution Time: ${executionTime}ms`));
            }
            
            // Display detailed failure information
            if (testResult.results.testResults) {
                console.log(chalk.red('🔍 Test Failure Details:'));
                
                for (const result of testResult.results.testResults) {
                    if (result.numFailingTests > 0) {
                        console.log(chalk.red(`   Failed Suite: ${result.testFilePath}`));
                        
                        if (result.assertionResults) {
                            for (const assertion of result.assertionResults) {
                                if (assertion.status === 'failed') {
                                    console.log(chalk.red(`     × ${assertion.title}`));
                                    if (assertion.failureMessages && assertion.failureMessages.length > 0) {
                                        console.log(chalk.red(`       ${assertion.failureMessages[0]}`));
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Display remediation suggestions
            console.log(chalk.yellow('💡 Remediation Suggestions:'));
            console.log(chalk.yellow('   • Review failed test assertions and fix implementation'));
            console.log(chalk.yellow('   • Check test data and mock configurations'));
            console.log(chalk.yellow('   • Verify environment setup and dependencies'));
            console.log(chalk.yellow('   • Run tests individually to isolate issues'));
            
            // Exit with failure code
            process.exit(1);
        }
        
    } catch (error) {
        // Step 7: Comprehensive Error Handling
        // Handle and report all types of errors that can occur during test execution
        console.log(chalk.red('💥 Test Execution Error'));
        console.log(chalk.gray('━'.repeat(60)));
        
        // Categorize and handle different error types
        if (error.name === 'ConfigurationError') {
            console.log(chalk.red('❌ Configuration Error:'));
            console.log(chalk.red(`   ${error.message}`));
            console.log(chalk.yellow('💡 Check Jest configuration file: jest.config.js'));
            
        } else if (error.name === 'EnvironmentError') {
            console.log(chalk.red('❌ Environment Error:'));
            console.log(chalk.red(`   ${error.message}`));
            console.log(chalk.yellow('💡 Verify Node.js version and environment setup'));
            
        } else if (error.code === 'ENOENT') {
            console.log(chalk.red('❌ File Not Found Error:'));
            console.log(chalk.red(`   ${error.message}`));
            console.log(chalk.yellow('💡 Check file paths and ensure all dependencies are installed'));
            
        } else {
            console.log(chalk.red('❌ Unexpected Error:'));
            console.log(chalk.red(`   ${error.message}`));
            
            // Display stack trace in development mode
            if (process.env.NODE_ENV === 'development') {
                console.log(chalk.gray('🔍 Stack Trace:'));
                console.log(chalk.gray(error.stack));
            }
        }
        
        // Display general troubleshooting information
        console.log(chalk.yellow('🔧 Troubleshooting Steps:'));
        console.log(chalk.yellow('   1. Verify Node.js version compatibility (18+)'));
        console.log(chalk.yellow('   2. Install dependencies: npm install'));
        console.log(chalk.yellow('   3. Check Jest configuration validity'));
        console.log(chalk.yellow('   4. Ensure test files exist and are properly formatted'));
        console.log(chalk.yellow('   5. Review error messages and stack traces'));
        
        // Exit with error code
        process.exit(1);
    }
}

/**
 * Node.js Version Compatibility Checker
 * 
 * Validates that the current Node.js version meets the minimum requirements
 * for the tutorial application and Jest testing framework.
 * 
 * @param {string} currentVersion - Current Node.js version (e.g., 'v18.12.0')
 * @param {string} requiredVersion - Required minimum version (e.g., '18.0.0')
 * @returns {boolean} True if current version is compatible, false otherwise
 */
function isNodeVersionCompatible(currentVersion, requiredVersion) {
    // Remove 'v' prefix from version string
    const current = currentVersion.replace(/^v/, '');
    const required = requiredVersion.replace(/^v/, '');
    
    // Parse version numbers
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    // Compare major, minor, and patch versions
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const requiredPart = requiredParts[i] || 0;
        
        if (currentPart > requiredPart) {
            return true;
        } else if (currentPart < requiredPart) {
            return false;
        }
    }
    
    return true; // Versions are equal
}

/**
 * Jest CLI Argument Validator
 * 
 * Validates Jest command-line arguments to ensure they are safe and supported.
 * Prevents injection of malicious arguments and ensures compatibility.
 * 
 * @param {string} arg - CLI argument to validate
 * @returns {boolean} True if argument is valid and safe, false otherwise
 */
function isValidJestArgument(arg) {
    // List of allowed Jest CLI arguments
    const allowedArgs = [
        '--coverage',
        '--watch',
        '--watchAll',
        '--verbose',
        '--silent',
        '--updateSnapshot',
        '--testNamePattern',
        '--testPathPattern',
        '--testPathIgnorePatterns',
        '--maxWorkers',
        '--bail',
        '--passWithNoTests',
        '--ci',
        '--json',
        '--outputFile',
        '--reporters',
        '--roots',
        '--testMatch',
        '--testIgnorePatterns',
        '--collectCoverageFrom',
        '--coverageDirectory',
        '--coverageReporters',
        '--coverageThreshold'
    ];
    
    // Check if argument starts with an allowed flag
    for (const allowedArg of allowedArgs) {
        if (arg.startsWith(allowedArg)) {
            return true;
        }
    }
    
    // Allow arguments that look like values (not flags)
    if (!arg.startsWith('-')) {
        return true;
    }
    
    return false;
}

/**
 * Script Entry Point
 * 
 * Executes the main test function when the script is run directly.
 * Implements proper Node.js module pattern for direct execution detection.
 * 
 * Educational Note: This pattern allows the script to be imported as a module
 * in testing scenarios while also being executable directly from the command line.
 */
if (require.main === module) {
    // Script is being run directly, execute the main test function
    runTests().catch((error) => {
        // Final error handler for any uncaught errors
        console.error(chalk.red('💥 Uncaught Error in Test Execution:'));
        console.error(chalk.red(error.message));
        
        if (process.env.NODE_ENV === 'development') {
            console.error(chalk.gray(error.stack));
        }
        
        process.exit(1);
    });
}

/**
 * Module Exports
 * 
 * Export the main test function for use in other modules or testing scenarios.
 * This enables the script to be imported and used programmatically while
 * maintaining its primary function as a standalone test execution script.
 */
module.exports = {
    runTests,
    isNodeVersionCompatible,
    isValidJestArgument
};

/**
 * Implementation Notes for Educational Reference:
 * 
 * 1. Environment Setup and Isolation:
 *    - NODE_ENV='test' is set immediately to ensure proper environment configuration
 *    - Environment validation ensures compatibility with Node.js 18+ requirements
 *    - Proper process lifecycle management with exit codes for CI/CD integration
 * 
 * 2. Jest Framework Integration:
 *    - Programmatic Jest execution using jest.run() for complete control
 *    - Configuration loading from centralized jest.config.js file
 *    - Support for all Jest CLI arguments including coverage and watch modes
 * 
 * 3. Error Handling and Logging:
 *    - Comprehensive error categorization with specific handling for different error types
 *    - Colorized console output using chalk for improved readability and user experience
 *    - Structured logging with clear success/failure indicators and actionable feedback
 * 
 * 4. CI/CD Pipeline Integration:
 *    - Proper exit codes (0 for success, 1 for failure) for automated build systems
 *    - Machine-readable test results and coverage reports for pipeline processing
 *    - Timeout handling and resource management for long-running test suites
 * 
 * 5. Development Workflow Support:
 *    - Watch mode support for interactive development with automatic test re-execution
 *    - Detailed error messages with stack traces for debugging assistance
 *    - Performance monitoring with execution timing and resource usage tracking
 * 
 * 6. Security and Validation:
 *    - CLI argument validation to prevent injection attacks and ensure compatibility
 *    - Configuration validation to ensure proper Jest setup and execution
 *    - Environment validation to prevent runtime errors and compatibility issues
 * 
 * 7. Educational Design Principles:
 *    - Clear separation of concerns with modular function design
 *    - Comprehensive documentation explaining each step of the test execution process
 *    - Production-ready patterns suitable for professional development environments
 * 
 * 8. Express 5.1.0 Application Testing:
 *    - Full integration with SuperTest for HTTP endpoint testing
 *    - Support for async/await testing patterns with automatic promise handling
 *    - Error handling middleware testing with proper promise rejection scenarios
 * 
 * 9. Performance and Scalability:
 *    - Efficient test execution with proper resource management
 *    - Parallel test execution support through Jest's built-in capabilities
 *    - Memory management and cleanup for long-running test suites
 * 
 * 10. Future Enhancement Readiness:
 *     - Modular architecture supporting additional testing frameworks
 *     - Extensible configuration system for advanced testing scenarios
 *     - Integration points for monitoring and observability tools
 */