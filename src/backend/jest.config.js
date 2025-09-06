/**
 * Jest Testing Framework Configuration for Node.js Tutorial Application
 * 
 * Comprehensive Jest 29.7.0 configuration optimized for Express.js 5.1.0 HTTP server testing
 * with Supertest integration, providing complete test environment setup for Node.js 22.x LTS.
 * Configured with code coverage collection (95% minimum thresholds), test timeout optimization
 * for educational HTTP endpoint testing, and test isolation patterns for reliable execution.
 * 
 * Features:
 * - Jest 29.7.0 testing framework with Node.js test environment configuration
 * - Code coverage collection with 95% line, 100% function, 90% branch, 95% statement thresholds
 * - HTTP endpoint testing optimization with 15-second timeout for Supertest integration
 * - Test file pattern matching for unit tests, integration tests, and spec files
 * - Test environment isolation with setup/teardown hooks and resource management
 * - Express.js application testing support with automatic promise error handling
 * 
 * Architecture:
 * - Node.js test environment for server-side JavaScript testing capabilities
 * - Ephemeral port allocation and test isolation for parallel test execution
 * - Comprehensive coverage reporting with HTML, text, JSON, and LCOV formats
 * - Test helper integration for Express app factories and Supertest clients
 * - Educational testing patterns demonstrating Node.js testing best practices
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @jest-version 29.7.0
 * @node-version 22.x
 * @express-version 5.1.0
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Jest testing framework - configured for Node.js server-side testing with comprehensive features
// jest: ^29.7.0

// =============================================================================
// INTERNAL CONFIGURATION IMPORTS
// =============================================================================

// Import test environment configuration with timeout values and performance thresholds
const { 
    testConfig,
    setupTestTimeouts,
    JEST_TIMEOUT 
} = require('./config/test.js');

// Import test constants including timeout values and performance thresholds from fixtures
const { 
    testConstants,
    PERFORMANCE_THRESHOLDS 
} = require('./test/fixtures/test-data.js');

// =============================================================================
// JEST CONFIGURATION FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates comprehensive Jest configuration object with Node.js environment, test patterns,
 * coverage settings, and timeout optimization for Express.js HTTP testing operations.
 * 
 * @param {Object} configOptions - Configuration options for Jest setup customization
 * @param {number} configOptions.timeout - Test timeout in milliseconds for HTTP operations
 * @param {Object} configOptions.coverage - Coverage threshold configuration object
 * @param {boolean} configOptions.verbose - Enable verbose test output for debugging
 * @param {Array} configOptions.testMatch - Custom test file patterns for test discovery
 * @returns {Object} Complete Jest configuration object with all testing settings and optimization parameters
 */
function createJestConfiguration(configOptions = {}) {
    // Set Jest test environment to 'node' for Node.js runtime compatibility
    const testEnvironment = 'node';
    
    // Configure test file patterns for comprehensive test discovery
    const testMatch = configOptions.testMatch || [
        '<rootDir>/test/**/*.test.js',      // Unit tests in test directory
        '<rootDir>/test/**/*.spec.js',      // Spec files in test directory  
        '<rootDir>/src/**/*.test.js',       // Source-adjacent test files
        '<rootDir>/**/__tests__/**/*.js'    // Jest standard __tests__ directory
    ];
    
    // Set up test path ignore patterns for clean test execution
    const testPathIgnorePatterns = [
        '/node_modules/',                   // Exclude npm packages from testing
        '/coverage/',                       // Exclude coverage output directory
        '/logs/',                          // Exclude log files from test discovery
        '/tmp/',                           // Exclude temporary files directory
        '/dist/',                          // Exclude build output directory
        '/build/'                          // Exclude build artifacts directory
    ];
    
    // Configure test timeout optimized for HTTP testing operations with Supertest
    const testTimeout = configOptions.timeout || testConfig.testing.jest_timeout || testConstants.TIMEOUT || JEST_TIMEOUT;
    
    // Set up coverage collection patterns to include source files for analysis
    const collectCoverageFrom = setupCoverageCollection();
    
    // Configure coverage thresholds with educational quality metrics
    const coverageThreshold = setupCoverageThresholds(configOptions.coverage);
    
    // Set up test environment setup and teardown files for Jest integration
    const setupFilesAfterEnv = [
        '<rootDir>/test/helpers/test-setup.js'  // Global test environment setup and utilities
    ];
    
    // Configure Jest reporters for comprehensive test result output
    const reporters = configureTestReporters({
        verbose: configOptions.verbose !== false
    });
    
    // Configure module path mapping for test imports and dependencies
    const moduleNameMapping = {
        '^@/(.*)$': '<rootDir>/src/$1',      // Path alias for source directory
        '^@test/(.*)$': '<rootDir>/test/$1'  // Path alias for test directory
    };
    
    // Set up Jest global configuration options for test execution optimization
    const globalConfig = {
        // Enable test caching for improved performance on subsequent runs
        cache: true,
        
        // Configure maximum worker processes for parallel test execution (50% of CPU cores)
        maxWorkers: '50%',
        
        // Clear mocks automatically between tests for clean test isolation
        clearMocks: true,
        
        // Restore mocks to original implementation after each test
        restoreMocks: true,
        
        // Control module reset behavior - disabled for performance optimization
        resetModules: false,
        
        // Configure bail behavior - continue running tests after failures for comprehensive results
        bail: 0,
        
        // Enable error reporting for deprecated Jest features and APIs
        errorOnDeprecated: true,
        
        // Require at least one test to pass validation - fail if no tests found
        passWithNoTests: false,
        
        // Enable verbose output for educational debugging and learning
        verbose: configOptions.verbose !== false
    };
    
    // Return complete Jest configuration object with all optimization settings
    return {
        // Core Jest configuration settings
        testEnvironment,
        testMatch,
        testPathIgnorePatterns,
        testTimeout,
        
        // Code coverage configuration
        collectCoverage: false, // Disabled by default, enable via --coverage flag
        collectCoverageFrom,
        coverageDirectory: 'coverage',
        coverageReporters: ['text', 'html', 'json-summary', 'lcov'],
        coverageThreshold,
        
        // Test environment setup and lifecycle management
        setupFilesAfterEnv,
        
        // Test execution and reporting configuration
        reporters,
        
        // Module resolution and path mapping
        moduleNameMapping,
        
        // Jest global configuration and optimization settings
        ...globalConfig,
        
        // Test environment-specific settings from test configuration
        testEnvironmentOptions: {
            url: 'http://localhost'
        },
        
        // Transform configuration for JavaScript files (none needed for Node.js)
        transform: {},
        
        // Module file extensions for test discovery
        moduleFileExtensions: ['js', 'json', 'node'],
        
        // Test result processor configuration (none required)
        testResultsProcessor: undefined,
        
        // Snapshot serializer configuration (none required for this tutorial)
        snapshotSerializers: []
    };
}

/**
 * Configures Jest code coverage collection with file patterns, thresholds, exclusions,
 * and reporter settings for comprehensive quality metrics and educational demonstration.
 * 
 * @param {Object} coverageOptions - Coverage configuration options for pattern customization
 * @param {Array} coverageOptions.includePatterns - Additional file patterns to include in coverage
 * @param {Array} coverageOptions.excludePatterns - Additional file patterns to exclude from coverage
 * @returns {Array} Coverage collection patterns with source file inclusion and exclusion rules
 */
function setupCoverageCollection(coverageOptions = {}) {
    // Define base coverage collection patterns to include source directory files
    const baseCoveragePatterns = [
        'src/**/*.js',                      // All JavaScript files in source directory
        '!src/**/*.test.js',                // Exclude test files from coverage analysis
        '!src/**/*.spec.js',                // Exclude spec files from coverage analysis
        '!src/**/__tests__/**',             // Exclude Jest __tests__ directories
        '!src/**/node_modules/**',          // Exclude node_modules within source directory
    ];
    
    // Define exclusion patterns for files that should not be included in coverage
    const excludePatterns = [
        '!src/coverage/**',                 // Exclude coverage output directory
        '!src/logs/**',                     // Exclude log files directory
        '!src/tmp/**',                      // Exclude temporary files directory
        '!src/dist/**',                     // Exclude build output directory
        '!src/build/**',                    // Exclude build artifacts directory
        '!src/**/*.config.js',              // Exclude configuration files
        '!src/**/*.mock.js',                // Exclude mock files from coverage
        '!src/**/fixtures/**',              // Exclude test fixture files
        '!src/**/test-data/**'              // Exclude test data files
    ];
    
    // Add custom include patterns from coverageOptions parameter
    const customIncludePatterns = coverageOptions.includePatterns || [];
    
    // Add custom exclude patterns from coverageOptions parameter  
    const customExcludePatterns = coverageOptions.excludePatterns || [];
    
    // Return comprehensive coverage collection configuration
    return [
        ...baseCoveragePatterns,
        ...excludePatterns,
        ...customIncludePatterns,
        ...customExcludePatterns
    ];
}

/**
 * Configures Jest code coverage thresholds with 95% line coverage, 100% function coverage,
 * 90% branch coverage, and 95% statement coverage for educational quality assurance.
 * 
 * @param {Object} customThresholds - Custom coverage threshold configuration
 * @param {number} customThresholds.lines - Line coverage percentage threshold
 * @param {number} customThresholds.functions - Function coverage percentage threshold
 * @param {number} customThresholds.branches - Branch coverage percentage threshold
 * @param {number} customThresholds.statements - Statement coverage percentage threshold
 * @returns {Object} Coverage threshold configuration with global and per-directory requirements
 */
function setupCoverageThresholds(customThresholds = {}) {
    // Configure global coverage thresholds for the entire application
    const globalThresholds = {
        branches: customThresholds.branches || 90,      // 90% branch coverage minimum
        functions: customThresholds.functions || 100,   // 100% function coverage required
        lines: customThresholds.lines || 95,            // 95% line coverage minimum  
        statements: customThresholds.statements || 95   // 95% statement coverage minimum
    };
    
    // Configure per-directory coverage thresholds for specific modules
    const perDirectoryThresholds = {
        // Source directory requires high coverage for educational demonstration
        './src/': {
            branches: 90,
            functions: 100,
            lines: 95,
            statements: 95
        },
        
        // Controllers require 100% function coverage for route handling validation
        './src/controllers/': {
            branches: 85,
            functions: 100,
            lines: 90,
            statements: 90
        },
        
        // Services require high coverage for business logic validation
        './src/services/': {
            branches: 90,
            functions: 100,
            lines: 95,
            statements: 95
        },
        
        // Utilities require comprehensive coverage for helper function validation
        './src/utils/': {
            branches: 95,
            functions: 100,
            lines: 100,
            statements: 100
        }
    };
    
    // Return complete coverage threshold configuration object
    return {
        global: globalThresholds,
        ...perDirectoryThresholds
    };
}

/**
 * Configures Jest test result reporters including console output, coverage reports,
 * and CI/CD integration formatting for comprehensive test feedback and educational output.
 * 
 * @param {Object} reporterOptions - Reporter configuration options for output customization
 * @param {boolean} reporterOptions.verbose - Enable verbose console output for detailed feedback
 * @param {boolean} reporterOptions.ci - Configure reporters for CI/CD environment compatibility
 * @param {Array} reporterOptions.customReporters - Additional custom reporters to include
 * @returns {Array} Jest reporter configurations with output formats and educational options
 */
function configureTestReporters(reporterOptions = {}) {
    // Configure default Jest console reporter for development and educational output
    const consoleReporter = reporterOptions.verbose !== false ? 
        ['default', { verbose: true }] : 
        ['default'];
    
    // Configure summary reporter for test execution overview and results
    const summaryReporter = ['summary'];
    
    // Set up additional reporters based on environment and configuration
    const additionalReporters = [];
    
    // Add JUnit XML reporter for CI/CD integration if configured
    if (reporterOptions.ci === true || process.env.CI === 'true') {
        additionalReporters.push([
            'jest-junit', 
            {
                outputDirectory: './coverage',
                outputName: 'junit.xml',
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
                ancestorSeparator: ' › ',
                usePathForSuiteName: true
            }
        ]);
    }
    
    // Add custom reporters from reporterOptions parameter
    if (reporterOptions.customReporters && Array.isArray(reporterOptions.customReporters)) {
        additionalReporters.push(...reporterOptions.customReporters);
    }
    
    // Return complete reporter configuration array
    return [
        consoleReporter,
        summaryReporter,
        ...additionalReporters
    ];
}

/**
 * Configures Jest test environment settings including Node.js runtime, test isolation,
 * timeout values, and Express.js testing optimization for HTTP server validation.
 * 
 * @param {Object} environmentConfig - Test environment configuration options
 * @param {string} environmentConfig.nodeVersion - Target Node.js version for compatibility
 * @param {Object} environmentConfig.globalSetup - Global setup configuration for test environment
 * @param {Object} environmentConfig.testEnvironmentOptions - Environment-specific options
 * @returns {Object} Test environment configuration with Node.js settings and HTTP testing optimization
 */
function configureTestEnvironment(environmentConfig = {}) {
    // Set testEnvironment to 'node' for server-side JavaScript testing with Node.js runtime
    const testEnvironment = 'node';
    
    // Configure test timeout from testConstants.TIMEOUT for HTTP operations with Supertest
    const testTimeout = environmentConfig.timeout || testConfig.testing.jest_timeout || testConstants.TIMEOUT;
    
    // Set up test isolation settings for reliable test execution without interference
    const testEnvironmentOptions = {
        url: 'http://localhost',            // Base URL for test HTTP requests
        ...environmentConfig.testEnvironmentOptions
    };
    
    // Configure Jest cache settings for performance optimization during development
    const cacheDirectory = '<rootDir>/.jest-cache';
    const cache = true;
    
    // Set maximum worker processes for parallel test execution (50% of available CPU cores)
    const maxWorkers = environmentConfig.maxWorkers || '50%';
    
    // Configure verbose output for educational debugging and learning purposes
    const verbose = environmentConfig.verbose !== false;
    
    // Apply environment-specific settings from environmentConfig parameter
    const environmentSettings = {
        testEnvironment,
        testTimeout,
        testEnvironmentOptions,
        cacheDirectory,
        cache,
        maxWorkers,
        verbose
    };
    
    // Return test environment configuration object with Node.js optimization
    return environmentSettings;
}

/**
 * Configures Jest test file discovery patterns, directory structure, and file matching
 * for comprehensive test coverage of unit tests, integration tests, and educational examples.
 * 
 * @param {Array} testDirectories - Test directory paths for pattern matching
 * @param {Array} testDirectories[].path - Individual test directory path
 * @param {string} testDirectories[].type - Test type (unit, integration, e2e)
 * @returns {Array} Array of test file patterns for Jest test discovery and execution
 */
function setupTestPatterns(testDirectories = []) {
    // Define standard test file patterns for Jest test discovery
    const baseTestPatterns = [
        '<rootDir>/test/unit/**/*.test.js',         // Unit tests in dedicated test directory
        '<rootDir>/test/integration/**/*.test.js',   // Integration tests in dedicated directory
        '<rootDir>/test/**/*.spec.js'               // Spec files following Jest conventions
    ];
    
    // Add source-adjacent test patterns for co-located tests
    const sourceTestPatterns = [
        '<rootDir>/src/**/*.test.js',               // Source-adjacent test files
        '<rootDir>/src/**/__tests__/**/*.js'        // Jest standard __tests__ directory pattern
    ];
    
    // Filter and add custom test directories from testDirectories parameter
    const customTestPatterns = testDirectories.map(dir => {
        if (typeof dir === 'string') {
            return `<rootDir>/${dir}/**/*.test.js`;
        } else if (dir.path) {
            return `<rootDir>/${dir.path}/**/*.test.js`;
        }
        return null;
    }).filter(Boolean);
    
    // Define root-level test patterns for additional test discovery
    const rootLevelPatterns = [
        '<rootDir>/*.test.js',                      // Root-level test files
        '<rootDir>/__tests__/**/*.js'               // Root-level __tests__ directory
    ];
    
    // Combine all test patterns for comprehensive test discovery
    const allTestPatterns = [
        ...baseTestPatterns,
        ...sourceTestPatterns,
        ...customTestPatterns,
        ...rootLevelPatterns
    ];
    
    // Return complete array of test file patterns for Jest configuration
    return allTestPatterns;
}

// =============================================================================
// JEST CONFIGURATION OBJECT CREATION
// =============================================================================

/**
 * Complete Jest configuration object with all testing settings and optimizations
 * for Node.js tutorial application testing with Express.js HTTP server validation.
 */
const jestConfigurationObject = createJestConfiguration({
    // Configure test timeout optimized for HTTP testing operations
    timeout: testConfig.testing.jest_timeout || testConstants.TIMEOUT,
    
    // Enable verbose output for educational debugging and detailed test feedback
    verbose: true,
    
    // Configure custom coverage thresholds for educational quality demonstration
    coverage: {
        lines: 95,      // 95% line coverage minimum for educational quality
        functions: 100, // 100% function coverage required for complete validation
        branches: 90,   // 90% branch coverage minimum for conditional logic
        statements: 95  // 95% statement coverage minimum for code execution
    },
    
    // Configure custom test file patterns for comprehensive test discovery
    testMatch: setupTestPatterns([
        { path: 'test/unit', type: 'unit' },
        { path: 'test/integration', type: 'integration' },
        { path: 'src', type: 'source-adjacent' }
    ])
});

// =============================================================================
// CONFIGURATION VALIDATION AND OPTIMIZATION
// =============================================================================

/**
 * Validates Jest configuration completeness and applies performance optimizations
 * for educational test execution and Node.js tutorial application testing.
 * 
 * @param {Object} config - Jest configuration object to validate and optimize
 * @returns {Object} Validated and optimized Jest configuration object
 */
function validateAndOptimizeConfig(config) {
    // Validate required configuration fields for Jest compatibility
    const requiredFields = ['testEnvironment', 'testMatch', 'coverageThreshold'];
    const missingFields = requiredFields.filter(field => !config.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
        throw new Error(`Missing required Jest configuration fields: ${missingFields.join(', ')}`);
    }
    
    // Apply performance optimizations for test execution speed
    const optimizedConfig = {
        ...config,
        
        // Enable Jest cache for faster subsequent test runs
        cache: true,
        
        // Configure optimal worker allocation for parallel execution
        maxWorkers: config.maxWorkers || '50%',
        
        // Enable mock clearing for clean test isolation
        clearMocks: true,
        restoreMocks: true,
        
        // Optimize module resolution for faster test startup
        modulePathIgnorePatterns: [
            '<rootDir>/coverage/',
            '<rootDir>/logs/',
            '<rootDir>/tmp/'
        ]
    };
    
    // Validate coverage threshold values are within valid range (0-100)
    if (optimizedConfig.coverageThreshold && optimizedConfig.coverageThreshold.global) {
        const thresholds = optimizedConfig.coverageThreshold.global;
        Object.keys(thresholds).forEach(key => {
            const value = thresholds[key];
            if (typeof value !== 'number' || value < 0 || value > 100) {
                throw new Error(`Invalid coverage threshold for ${key}: ${value}. Must be between 0 and 100.`);
            }
        });
    }
    
    // Return validated and optimized configuration object
    return Object.freeze(optimizedConfig);
}

// Validate and optimize the final Jest configuration object
const validatedJestConfig = validateAndOptimizeConfig(jestConfigurationObject);

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Export the complete Jest configuration object as default export
module.exports = validatedJestConfig;

// Export individual configuration components for testing and customization
module.exports.jestConfigurationObject = validatedJestConfig;
module.exports.createJestConfiguration = createJestConfiguration;
module.exports.setupCoverageCollection = setupCoverageCollection;
module.exports.setupCoverageThresholds = setupCoverageThresholds;
module.exports.configureTestReporters = configureTestReporters;
module.exports.configureTestEnvironment = configureTestEnvironment;
module.exports.setupTestPatterns = setupTestPatterns;
module.exports.validateAndOptimizeConfig = validateAndOptimizeConfig;