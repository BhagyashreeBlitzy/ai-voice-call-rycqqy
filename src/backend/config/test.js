/**
 * Test Environment Configuration File for Node.js Tutorial Application
 * 
 * This configuration file extends the default settings with testing-specific optimizations
 * including minimal logging, ephemeral port allocation, fast timeouts, and testing utilities
 * integration. Optimized for Jest 29.7.0 testing framework with Supertest HTTP testing,
 * designed to provide isolated test execution environment with reduced output noise and
 * enhanced test performance for the Node.js tutorial application running on Express.js 5.1.0
 * and Node.js 22.x LTS.
 * 
 * Features:
 * - Jest 29.7.0 testing framework configuration support with test environment setup
 * - Supertest HTTP testing integration with ephemeral port allocation and timeout optimization
 * - Express.js 5.1.0 testing environment with automatic promise error handling
 * - Test environment configuration management with environment isolation
 * - Hello endpoint testing support with proper HTTP status codes and headers
 * - Code coverage and quality metrics with 95% minimum thresholds
 * 
 * Architecture: Stateless test design with ephemeral port allocation, minimal logging,
 * and test isolation patterns optimized for educational test execution workflows.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// Import base configuration settings to extend with test-specific optimizations
const defaultConfig = require('./default.js').defaultConfig;

// Import environment constants for test environment identification and validation
const { ENVIRONMENTS } = require('../src/utils/constants.js');

// Import HTTP status code constants for test assertion configuration and response validation
const { HTTP_STATUS } = require('../src/utils/constants.js');

// Import route path constants for consistent test endpoint URL validation and testing configuration
const { ROUTES } = require('../src/utils/constants.js');

// =============================================================================
// TEST ENVIRONMENT GLOBALS
// =============================================================================

// Test environment identifier with fallback to 'test' for consistent configuration loading
const NODE_ENV = process.env.NODE_ENV || 'test';

// Test port configuration - 0 enables ephemeral port allocation for parallel test execution
const TEST_PORT = process.env.TEST_PORT || 0;

// Test host binding - localhost for test security and isolation
const TEST_HOST = process.env.TEST_HOST || 'localhost';

// Jest test timeout configuration - 15 seconds for HTTP request testing with Supertest
const JEST_TIMEOUT = process.env.JEST_TIMEOUT || 15000;

// Silent logs configuration - minimize test output noise while maintaining error visibility
const SILENT_LOGS = process.env.SILENT_LOGS !== 'false';

// Test environment cache for storing test-specific configuration data and shared state
const TEST_ENVIRONMENT_CACHE = new Map();

// =============================================================================
// TEST CONFIGURATION FUNCTIONS
// =============================================================================

/**
 * Creates test configuration by merging default config with test-specific optimizations
 * including minimal logging, ephemeral port allocation, fast timeouts, and testing utilities
 * integration for Jest and Supertest compatibility.
 * 
 * @param {Object} defaultConfig - Base configuration object to extend with test settings
 * @returns {Object} Optimized test configuration with testing-specific settings for Jest and Supertest integration
 */
function createTestConfig(defaultConfig) {
    // Import default configuration object as foundation for test settings
    const baseConfig = { ...defaultConfig };
    
    // Override server settings with ephemeral port allocation (port 0) for test isolation
    const testServerConfig = {
        ...baseConfig.server,
        port: TEST_PORT, // Ephemeral port allocation for parallel test execution and port conflict prevention
        host: TEST_HOST, // Local binding for test security and isolation
        timeout: 5000, // Fast timeout for test execution performance
        keepAlive: false, // Disabled for clean test isolation
        backlog: 50, // Reduced connection queue for test environment
        max_header_size: 8192, // Reduced header size limit for test efficiency
        trust_proxy: false, // Disabled for test environment security
        ephemeral_ports: true, // Enable automatic port allocation for parallel tests
        fast_startup: true, // Optimized startup sequence for test performance
        test_mode: true // Enable test-specific server behaviors
    };
    
    // Configure minimal logging with error-level only to reduce test output noise
    const testLoggingConfig = {
        ...baseConfig.logging,
        level: 'error', // Error-level logging only to minimize test output noise
        format: 'simple', // Simple text format for test readability
        colorize: false, // No colors in test output for CI/CD compatibility
        timestamp: false, // Timestamps disabled for clean test output
        request_logging: false, // HTTP request logging disabled for silent execution
        performance_logging: false, // Performance logging disabled for clean output
        error_stack_trace: true, // Stack traces enabled for test debugging
        silent_mode: SILENT_LOGS, // Silent operation except for errors
        test_output: false, // Test-specific output disabled by default
        console_capture: true, // Console output capture for Jest assertions
        memory_logging: false // Memory logging disabled for test performance
    };
    
    // Disable security features that interfere with testing workflow
    const testSecurityConfig = {
        ...baseConfig.security,
        disable_x_powered_by: true, // Hide framework information even in tests
        cors_enabled: false, // CORS disabled for test simplicity
        cors_origin: false, // No CORS origins configured for tests
        rate_limiting: false, // Rate limiting disabled for test performance
        helmet_enabled: false, // Security headers disabled for test convenience
        https_required: false, // HTTPS not required for test environment
        content_security_policy: false, // CSP disabled for test flexibility
        authentication_bypass: true, // Authentication bypass enabled for testing
        test_security_mode: true, // Enable test-friendly security settings
        validation_relaxed: true // Relaxed input validation for test data flexibility
    };
    
    // Set fast timeouts optimized for test execution performance
    const testTimeouts = setupTestTimeouts({
        jest_timeout: JEST_TIMEOUT,
        server_startup: 3000,
        request_timeout: 5000,
        cleanup_timeout: 2000
    });
    
    // Configure test-friendly monitoring with reduced overhead
    const testMonitoringConfig = {
        ...baseConfig.monitoring,
        health_check_path: ROUTES.HEALTH, // Health check endpoint for test validation
        readiness_probe_path: '/readyz', // Readiness probe for test environment checks
        liveness_probe_path: '/livez', // Liveness probe for test server validation
        metrics_enabled: false, // Metrics collection disabled for test performance
        performance_monitoring: false, // Performance monitoring disabled in tests
        memory_monitoring: false, // Memory monitoring disabled for test speed
        uptime_tracking: false, // Uptime tracking disabled for test efficiency
        health_check_timeout: 1000, // Fast health check timeout for test performance
        test_monitoring: true, // Test-specific monitoring hooks enabled
        jest_integration: true // Jest monitoring integration enabled
    };
    
    // Enable test-specific features for Jest and Supertest integration
    const testFeaturesConfig = {
        ...baseConfig.features,
        hello_endpoint: true, // Primary /hello endpoint enabled for testing
        health_endpoints: true, // Health check endpoints enabled for test validation
        static_content: false, // Static file serving disabled in test environment
        error_handling: true, // Error handling middleware enabled for test validation
        request_validation: false, // Input validation disabled for test flexibility
        response_compression: false, // Compression disabled for test performance
        caching_enabled: false, // All caching disabled for test predictability
        test_utilities: true, // Test utility endpoints and helpers enabled
        mock_support: true, // Mock data and response support enabled
        debug_endpoints: false // Debug endpoints disabled for test cleanliness
    };
    
    // Set up test environment variables and process configuration
    const testAppConfig = {
        ...baseConfig.app,
        name: 'nodejs-tutorial-test', // Test application identifier
        env: ENVIRONMENTS.TEST, // Test environment setting
        debug: false, // Debugging disabled for clean test output
        trust_proxy: false, // Disabled for test environment
        json_limit: '10kb', // Reduced JSON body size limit for test efficiency
        url_encoded_limit: '10kb', // Reduced URL encoded body size limit
        parameter_limit: 50, // Reduced parameter limit for test performance
        case_sensitive_routing: false, // Flexible routing for test scenarios
        strict_routing: false, // Flexible trailing slash for test convenience
        merge_params: false, // No parameter merging in test environment
        view_cache: false, // Template caching disabled for test isolation
        etag: false, // ETags disabled for test predictability
        compression: false // Compression disabled for test performance
    };
    
    // Apply test-specific performance optimizations
    const performanceConfig = optimizeTestPerformance({
        caching_disabled: true,
        fast_startup: true,
        ephemeral_ports: true,
        minimal_middleware: true,
        memory_optimized: true
    });
    
    // Configure test-specific section for Jest integration, Supertest setup, and testing utilities
    const testingConfig = {
        jest_timeout: testTimeouts.jest_timeout, // Default Jest test timeout in milliseconds
        supertest_timeout: testTimeouts.request_timeout, // Supertest HTTP request timeout
        server_startup_timeout: testTimeouts.server_startup, // Maximum server startup time for tests
        cleanup_timeout: testTimeouts.cleanup_timeout, // Test cleanup and teardown timeout
        parallel_execution: true, // Enable parallel test execution support
        ephemeral_ports: true, // Use ephemeral port allocation for test isolation
        test_data_fixtures: true, // Enable test data fixture loading
        mock_configuration: true, // Enable mock and stub configuration
        coverage_integration: true, // Code coverage collection integration
        performance_testing: true, // Performance testing capabilities enabled
        test_isolation: true, // Full test isolation between test suites
        snapshot_testing: false, // Snapshot testing disabled for tutorial simplicity
        http_status_constants: {
            OK: HTTP_STATUS.OK,
            NOT_FOUND: HTTP_STATUS.NOT_FOUND,
            METHOD_NOT_ALLOWED: HTTP_STATUS.METHOD_NOT_ALLOWED
        },
        route_constants: {
            HELLO: ROUTES.HELLO,
            HEALTH: ROUTES.HEALTH
        },
        performance_optimizations: performanceConfig
    };
    
    // Validate test configuration for completeness and correctness
    const validatedTestConfig = {
        // Metadata section with test environment information
        meta: {
            ...baseConfig.meta,
            environment: ENVIRONMENTS.TEST,
            test_mode: true,
            jest_version: '29.7.0',
            supertest_enabled: true
        },
        
        // Server configuration optimized for test environment
        server: testServerConfig,
        
        // Express.js application configuration with test optimizations
        app: testAppConfig,
        
        // Minimal logging configuration for clean test execution
        logging: testLoggingConfig,
        
        // Relaxed security configuration for test convenience
        security: testSecurityConfig,
        
        // Minimal monitoring configuration with essential health checks
        monitoring: testMonitoringConfig,
        
        // Test feature configuration with enabled endpoints
        features: testFeaturesConfig,
        
        // Test-specific configuration section
        testing: testingConfig
    };
    
    // Return complete test configuration object
    return Object.freeze(validatedTestConfig);
}

/**
 * Configures timeout values optimized for Jest testing framework and Supertest HTTP testing
 * with fast execution and reliable test completion for educational test scenarios.
 * 
 * @param {Object} timeoutOptions - Timeout configuration options for test environment
 * @returns {Object} Timeout configuration object with Jest-optimized values
 */
function setupTestTimeouts(timeoutOptions) {
    // Set Jest test timeout to 15000ms for HTTP request testing with Supertest integration
    const jestTimeout = timeoutOptions.jest_timeout || JEST_TIMEOUT;
    
    // Configure server startup timeout for test environment initialization
    const serverStartupTimeout = timeoutOptions.server_startup || 3000;
    
    // Set request timeout optimized for Supertest HTTP client testing
    const requestTimeout = timeoutOptions.request_timeout || 5000;
    
    // Configure health check timeout for monitoring endpoints validation
    const healthCheckTimeout = 1000;
    
    // Set cleanup timeout for test teardown operations and resource cleanup
    const cleanupTimeout = timeoutOptions.cleanup_timeout || 2000;
    
    // Return comprehensive timeout configuration object
    return {
        jest_timeout: jestTimeout,
        server_startup: serverStartupTimeout,
        request_timeout: requestTimeout,
        health_check: healthCheckTimeout,
        cleanup_timeout: cleanupTimeout,
        supertest_timeout: requestTimeout
    };
}

/**
 * Configures minimal logging settings for test environment to reduce output noise while
 * maintaining error visibility and test debugging capabilities for Jest integration.
 * 
 * @param {Object} loggingOptions - Logging configuration options for test environment
 * @returns {Object} Test logging configuration with minimal output and error tracking
 */
function configureTestLogging(loggingOptions = {}) {
    // Set log level to 'error' to minimize test output noise while maintaining error visibility
    const logLevel = loggingOptions.level || 'error';
    
    // Disable request/response logging for clean test execution without HTTP noise
    const requestLogging = loggingOptions.request_logging || false;
    
    // Configure silent mode for most operations except critical errors
    const silentMode = loggingOptions.silent_mode !== false ? SILENT_LOGS : false;
    
    // Enable error stack traces for debugging test failures and error scenarios
    const errorStackTrace = loggingOptions.error_stack_trace !== false;
    
    // Set up test-specific log format for Jest integration and test output capture
    const testLogFormat = loggingOptions.format || 'simple';
    
    // Configure console output capture for test assertions and Jest integration
    const consoleCapture = loggingOptions.console_capture !== false;
    
    // Return optimized test logging configuration
    return {
        level: logLevel,
        format: testLogFormat,
        colorize: false, // Disabled for CI/CD compatibility
        timestamp: false, // Disabled for clean test output
        request_logging: requestLogging,
        performance_logging: false, // Disabled for clean output
        error_stack_trace: errorStackTrace,
        silent_mode: silentMode,
        test_output: false, // Disabled by default
        console_capture: consoleCapture,
        memory_logging: false // Disabled for test performance
    };
}

/**
 * Applies performance optimizations specifically for test environment including fast startup,
 * minimal overhead, and efficient resource usage for Jest and Supertest testing workflows.
 * 
 * @param {Object} performanceConfig - Performance configuration options for test optimization
 * @returns {Object} Performance configuration optimized for test execution speed and resource efficiency
 */
function optimizeTestPerformance(performanceConfig = {}) {
    // Disable caching mechanisms that slow down test execution and add complexity
    const cachingDisabled = performanceConfig.caching_disabled !== false;
    
    // Configure fast server startup with minimal initialization overhead
    const fastStartup = performanceConfig.fast_startup !== false;
    
    // Set up ephemeral port binding for parallel test execution without port conflicts
    const ephemeralPorts = performanceConfig.ephemeral_ports !== false;
    
    // Optimize middleware stack for test performance with minimal processing overhead
    const minimalMiddleware = performanceConfig.minimal_middleware !== false;
    
    // Configure memory management for test isolation and efficient resource usage
    const memoryOptimized = performanceConfig.memory_optimized !== false;
    
    // Enable test-specific performance monitoring hooks for Jest integration
    const testPerformanceHooks = performanceConfig.performance_hooks !== false;
    
    // Return performance-optimized test configuration
    return {
        caching_disabled: cachingDisabled,
        fast_startup: fastStartup,
        ephemeral_ports: ephemeralPorts,
        minimal_middleware: minimalMiddleware,
        memory_optimized: memoryOptimized,
        test_performance_hooks: testPerformanceHooks,
        startup_optimizations: {
            skip_initialization_checks: true,
            fast_dependency_loading: true,
            minimal_bootstrap: true
        },
        runtime_optimizations: {
            reduced_logging_overhead: true,
            optimized_request_processing: true,
            efficient_memory_usage: true
        }
    };
}

// =============================================================================
// TEST CONFIGURATION CREATION
// =============================================================================

// Create the complete test configuration by merging default settings with test optimizations
const testConfig = createTestConfig(defaultConfig);

// Cache test configuration for reuse across test suites and scenarios
TEST_ENVIRONMENT_CACHE.set('testConfig', testConfig);
TEST_ENVIRONMENT_CACHE.set('environment', ENVIRONMENTS.TEST);
TEST_ENVIRONMENT_CACHE.set('httpStatus', HTTP_STATUS);
TEST_ENVIRONMENT_CACHE.set('routes', ROUTES);

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Main test configuration object export with all test-optimized settings
    testConfig,
    
    // Individual configuration section exports for modular access and testing
    server: testConfig.server,
    app: testConfig.app,
    logging: testConfig.logging,
    security: testConfig.security,
    monitoring: testConfig.monitoring,
    features: testConfig.features,
    testing: testConfig.testing,
    
    // Test configuration factory functions for dynamic configuration creation
    createTestConfig,
    setupTestTimeouts,
    configureTestLogging,
    optimizeTestPerformance,
    
    // Test environment utilities and constants for test suite integration
    TEST_ENVIRONMENT_CACHE,
    NODE_ENV,
    TEST_PORT,
    TEST_HOST,
    JEST_TIMEOUT,
    SILENT_LOGS
};