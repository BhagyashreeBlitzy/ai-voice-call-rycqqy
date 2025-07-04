// Jest Testing Configuration for Node.js Tutorial Backend
// Version: Jest ^29.0.0 - Test runner and assertion library supporting ES2022+ syntax
// Purpose: Configures Jest for comprehensive testing of Express 5.1.0 application with SuperTest integration

// External dependencies - Jest testing framework
// jest@^29.0.0 - Modern JavaScript testing framework with built-in coverage, mocking, and assertion capabilities
// supertest@7.1.1 - HTTP assertion library for testing Express applications and REST APIs

// Internal dependencies - Application components under test
// The configuration references these internal modules for integration testing:
// - ./app.js - Express application factory and pre-configured app instance
// - ./server.js - HTTP server startup and management functionality

/**
 * Jest Configuration Factory Function
 * 
 * Returns a comprehensive Jest configuration object optimized for Node.js tutorial
 * applications using Express 5.1.0 and modern JavaScript features. This configuration
 * supports unit testing, integration testing, and application-level testing with
 * SuperTest for HTTP assertions.
 * 
 * Configuration Features:
 * - Node.js test environment for server-side JavaScript execution
 * - Test discovery patterns for organized test file structure
 * - Code coverage collection with multiple report formats
 * - ES2022+ syntax support without transpilation
 * - CI/CD pipeline integration with deterministic test execution
 * - Educational clarity with comprehensive documentation
 * 
 * Testing Capabilities:
 * - Unit Tests: Individual function and module testing
 * - Integration Tests: Multi-component interaction testing
 * - Application Tests: Full HTTP request/response cycle testing
 * - Coverage Reports: Code coverage analysis and reporting
 * - Mocking Support: Built-in mocking for dependencies and external services
 * 
 * Express 5.1.0 Integration:
 * - SuperTest HTTP assertions for Express application testing
 * - Automatic promise rejection handling testing
 * - Enhanced security feature testing (ReDoS prevention)
 * - Modern async/await pattern testing support
 * 
 * Educational Design Principles:
 * - Clear configuration structure for learning Jest fundamentals
 * - Comprehensive comments explaining each configuration option
 * - Production-ready patterns suitable for professional development
 * - Modular configuration supporting different testing approaches
 * 
 * CI/CD Integration:
 * - Deterministic test execution for reliable pipeline results
 * - Coverage reporting in multiple formats for different tools
 * - Test result formatting compatible with CI/CD systems
 * - Environment-aware configuration for different deployment contexts
 * 
 * @function getJestConfig
 * @returns {Object} Complete Jest configuration object with all required settings
 * 
 * @example
 * // Basic usage in package.json
 * {
 *   "scripts": {
 *     "test": "jest",
 *     "test:watch": "jest --watch",
 *     "test:coverage": "jest --coverage"
 *   }
 * }
 * 
 * @example
 * // Advanced usage with custom configuration
 * const config = getJestConfig();
 * config.setupFilesAfterEnv.push('./tests/setup.js');
 * module.exports = config;
 * 
 * @example
 * // Integration with SuperTest for HTTP testing
 * const request = require('supertest');
 * const { app } = require('../app.js');
 * 
 * describe('Hello World Endpoint', () => {
 *   it('should return Hello world message', async () => {
 *     const response = await request(app).get('/hello');
 *     expect(response.status).toBe(200);
 *     expect(response.text).toBe('Hello world');
 *   });
 * });
 */
function getJestConfig() {
    // Step 1: Define test environment configuration for Node.js runtime
    // Use 'node' environment to support Node.js APIs, Express application testing,
    // and server-side JavaScript execution without browser-specific globals
    const testEnvironment = 'node';
    
    // Step 2: Configure test file discovery patterns
    // Specify patterns to discover all test files in the tests directory and subdirectories
    // Supports both .test.js and .spec.js naming conventions for flexibility
    const testMatch = [
        '<rootDir>/tests/**/*.test.js',  // Standard test file pattern
        '<rootDir>/tests/**/*.spec.js'   // Alternative spec file pattern
    ];
    
    // Step 3: Enable comprehensive code coverage collection
    // Collect coverage information from all source files to identify test gaps
    // and ensure comprehensive testing of the Express application
    const collectCoverage = true;
    
    // Step 4: Configure coverage output directory
    // Set coverage reports to be generated in the coverage directory
    // This directory will contain HTML reports, JSON data, and LCOV info
    const coverageDirectory = '<rootDir>/coverage';
    
    // Step 5: Configure multiple coverage report formats
    // Generate coverage reports in different formats to support various tools:
    // - text: Console output for immediate feedback during development
    // - lcov: Standard format for CI/CD integration and code coverage tools
    // - json: Structured data format for programmatic analysis
    const coverageReporters = ['text', 'lcov', 'json'];
    
    // Step 6: Define supported module file extensions
    // Specify file extensions that Jest should process as modules
    // Supports JavaScript, JSON configuration, and Node.js native modules
    const moduleFileExtensions = ['js', 'json', 'node'];
    
    // Step 7: Configure test path ignore patterns
    // Exclude directories that should not be searched for test files
    // Improves test discovery performance and prevents testing of dependencies
    const testPathIgnorePatterns = [
        '/node_modules/',  // Exclude third-party dependencies
        '/dist/',          // Exclude build output directory
        '/build/'          // Exclude alternative build directory
    ];
    
    // Step 8: Configure additional Jest options for enhanced functionality
    // Set up verbose output for detailed test execution information
    const verbose = true;
    
    // Configure test timeout for integration tests that may take longer
    // Set to 10 seconds to accommodate HTTP request/response testing
    const testTimeout = 10000;
    
    // Configure setup files to run before each test file
    // Useful for global test configuration and environment setup
    const setupFilesAfterEnv = [];
    
    // Configure global variables available in all test files
    // Add any global test utilities or constants here
    const globals = {};
    
    // Configure module name mapping for path resolution
    // Helps Jest resolve module imports correctly
    const moduleNameMapper = {};
    
    // Configure transform settings for file processing
    // Since we're using pure JavaScript without transpilation,
    // no transform configuration is needed
    const transform = {};
    
    // Configure coverage collection from specific files
    // Collect coverage from all source files except test files
    const collectCoverageFrom = [
        'src/**/*.js',           // Include all source files
        '!src/**/*.test.js',     // Exclude test files
        '!src/**/*.spec.js',     // Exclude spec files
        '!src/coverage/**',      // Exclude coverage directory
        '!src/node_modules/**'   // Exclude node_modules
    ];
    
    // Configure coverage thresholds for quality gates
    // Set minimum coverage requirements to ensure code quality
    const coverageThreshold = {
        global: {
            branches: 80,     // Minimum 80% branch coverage
            functions: 90,    // Minimum 90% function coverage
            lines: 85,        // Minimum 85% line coverage
            statements: 85    // Minimum 85% statement coverage
        }
    };
    
    // Configure test result processors for enhanced output
    // Can be used to integrate with external reporting tools
    const testResultsProcessor = undefined;
    
    // Configure watch mode options for development
    // Optimize file watching for better development experience
    const watchman = true;
    
    // Configure cache directory for improved performance
    // Jest uses caching to speed up subsequent test runs
    const cacheDirectory = '<rootDir>/.jest-cache';
    
    // Configure error handling for better debugging
    // Preserve stack traces and error details for debugging
    const errorOnDeprecated = true;
    
    // Step 9: Return complete Jest configuration object
    // Combine all configuration options into a single object
    return {
        // Core configuration options
        testEnvironment,
        testMatch,
        collectCoverage,
        coverageDirectory,
        coverageReporters,
        moduleFileExtensions,
        testPathIgnorePatterns,
        
        // Enhanced configuration options
        verbose,
        testTimeout,
        setupFilesAfterEnv,
        globals,
        moduleNameMapper,
        transform,
        collectCoverageFrom,
        coverageThreshold,
        testResultsProcessor,
        watchman,
        cacheDirectory,
        errorOnDeprecated,
        
        // Additional Jest options for educational clarity
        displayName: 'Node.js Tutorial Backend Tests',
        testSequencer: '<rootDir>/node_modules/@jest/test-sequencer/build/index.js',
        maxWorkers: '50%',
        clearMocks: true,
        restoreMocks: true,
        resetMocks: true,
        
        // Configure test environment options
        testEnvironmentOptions: {
            node: true,
            browser: false
        },
        
        // Configure Jest to handle ES modules if needed
        extensionsToTreatAsEsm: [],
        
        // Configure global teardown for cleanup
        globalTeardown: undefined,
        globalSetup: undefined,
        
        // Configure project-specific settings
        roots: ['<rootDir>/src', '<rootDir>/tests'],
        testURL: 'http://localhost:3000',
        
        // Configure reporter options for better output
        reporters: [
            'default',
            ['jest-html-reporters', {
                publicPath: './coverage/html-report',
                filename: 'jest-report.html',
                expand: true
            }]
        ],
        
        // Configure bail options for CI/CD optimization
        bail: 0,
        
        // Configure watch plugins for better development experience
        watchPlugins: [
            'jest-watch-typeahead/filename',
            'jest-watch-typeahead/testname'
        ]
    };
}

// Export the Jest configuration for use by the test runner
// This configuration supports all required test, coverage, and environment settings
// for comprehensive testing of the Node.js tutorial backend application
module.exports = getJestConfig();

/**
 * Jest Configuration Implementation Notes:
 * 
 * 1. Node.js Environment Configuration:
 *    - testEnvironment: 'node' ensures tests run in Node.js environment
 *    - Supports Express application testing with SuperTest integration
 *    - Enables access to Node.js APIs and file system operations
 *    - Provides proper environment for server-side JavaScript execution
 * 
 * 2. Test Discovery and Organization:
 *    - testMatch patterns discover tests in tests/ directory structure
 *    - Supports both .test.js and .spec.js naming conventions
 *    - Ignores node_modules, dist, and build directories for performance
 *    - Flexible test organization supporting different testing approaches
 * 
 * 3. Code Coverage Configuration:
 *    - collectCoverage: true enables automatic coverage collection
 *    - Multiple report formats (text, lcov, json) for different use cases
 *    - Coverage thresholds enforce quality gates for CI/CD pipelines
 *    - Comprehensive coverage collection from all source files
 * 
 * 4. ES2022+ JavaScript Support:
 *    - No transpilation needed for modern JavaScript features
 *    - Native async/await support for Express 5.1.0 promise handling
 *    - Modern module system support with proper file extensions
 *    - Compatible with Node.js 18+ runtime requirements
 * 
 * 5. SuperTest Integration Readiness:
 *    - Node.js environment supports HTTP server testing
 *    - Proper timeout configuration for HTTP request/response cycles
 *    - Express application testing with real HTTP requests
 *    - Integration test support for full request pipeline testing
 * 
 * 6. CI/CD Pipeline Integration:
 *    - Deterministic test execution with proper cache configuration
 *    - Multiple coverage report formats for different CI/CD tools
 *    - Configurable test timeouts for different environments
 *    - Comprehensive error reporting for debugging pipeline failures
 * 
 * 7. Educational Design Principles:
 *    - Clear configuration structure with comprehensive documentation
 *    - Modular function design demonstrating configuration patterns
 *    - Production-ready patterns suitable for professional development
 *    - Extensive comments explaining each configuration decision
 * 
 * 8. Performance Optimization:
 *    - Efficient test discovery with proper ignore patterns
 *    - Caching configuration for faster subsequent test runs
 *    - Watchman integration for optimized file watching
 *    - Worker process configuration for parallel test execution
 * 
 * 9. Development Experience Enhancement:
 *    - Verbose output for detailed test execution information
 *    - Watch mode plugins for interactive test development
 *    - Clear error messages and stack traces for debugging
 *    - HTML report generation for comprehensive test analysis
 * 
 * 10. Production Readiness:
 *     - Quality gates with coverage thresholds
 *     - Comprehensive error handling and reporting
 *     - Security-conscious configuration without sensitive data
 *     - Scalable configuration supporting different deployment scenarios
 */