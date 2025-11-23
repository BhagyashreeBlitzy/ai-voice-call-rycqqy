// Jest testing framework configuration for the Node.js tutorial backend
// Version: Jest ^29.0.0 - Modern JavaScript testing framework with built-in assertions, mocking, and coverage
// Provides comprehensive test runner settings for unit and integration tests with educational clarity

module.exports = {
    // Test environment configuration - Node.js runtime for backend testing
    // Specifies 'node' instead of default 'jsdom' since this is a server-side application
    testEnvironment: 'node',
    
    // Setup files to run after the test environment is established
    // Points to the test environment setup file that stubs logger methods and installs global error hooks
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    
    // Test file discovery patterns using glob matching
    // Discovers all .test.js files within the __tests__ directory structure
    testMatch: ['<rootDir>/__tests__/**/*.test.js'],
    
    // Enable code coverage collection for all test runs
    // Provides visibility into test coverage and code quality metrics
    collectCoverage: true,
    
    // Coverage report output directory
    // Centralized location for coverage artifacts and HTML reports
    coverageDirectory: '<rootDir>/coverage',
    
    // Coverage report formats for different use cases
    // 'text' for console output, 'html' for browser viewing, 'json' for CI/CD integration
    coverageReporters: ['text', 'html', 'json'],
    
    // Coverage threshold enforcement to maintain code quality standards
    // Fails the test run if coverage drops below specified percentages
    coverageThreshold: {
        global: {
            // Branch coverage: 80% minimum for conditional logic testing
            branches: 80,
            // Function coverage: 100% to ensure all functions are tested
            functions: 100,
            // Line coverage: 90% minimum for comprehensive code execution
            lines: 90,
            // Statement coverage: 90% minimum for thorough statement execution
            statements: 90
        }
    },
    
    // Global test timeout in milliseconds
    // Prevents tests from hanging indefinitely while allowing reasonable execution time
    testTimeout: 5000,
    
    // File extensions that Jest should process
    // Covers JavaScript and JSON files commonly used in Node.js applications
    moduleFileExtensions: ['js', 'json'],
    
    // Root directories for test discovery and module resolution
    // Establishes the project root as the base directory for all test operations
    roots: ['<rootDir>']
};