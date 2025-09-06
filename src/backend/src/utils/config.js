/**
 * Central Configuration Management Utility for Node.js Tutorial Application
 * 
 * This utility provides comprehensive environment-aware configuration loading, merging, and validation
 * for the Node.js tutorial application. Implements intelligent configuration resolution by detecting 
 * the current environment (development, production, test) and loading appropriate configuration files,
 * applying environment variable overrides, and providing cached configuration access with educational
 * simplicity while maintaining production-ready configuration management patterns.
 * 
 * Features:
 * - Environment-aware configuration loading with automatic environment detection
 * - Configuration inheritance and merge strategies with environment variable overrides
 * - Comprehensive configuration validation with detailed error reporting
 * - Performance-optimized caching to prevent repeated file system access
 * - Production-ready configuration patterns with security considerations
 * - Educational design prioritizing clarity while demonstrating enterprise patterns
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async support and automatic promise error handling
 * - Node.js 22.11.0 LTS with Active LTS support extending into late 2025
 * 
 * Architecture: Event-driven configuration management with lazy initialization,
 * caching strategies, and comprehensive validation for educational learning while
 * maintaining production-ready deployment patterns.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Node.js built-in process module for environment variable access and process lifecycle information
const process = require('process'); // Node.js Built-in

// Node.js built-in path module for configuration file path resolution and directory management
const path = require('path'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import base configuration settings that provide foundational defaults for all environment-specific configurations
const defaultConfig = require('../../config/default.js');

// Import development configuration with enhanced debugging, verbose logging, and developer-friendly settings
const developmentConfig = require('../../config/development.js');

// Import production configuration with security hardening, performance optimizations, and operational configurations
const productionConfig = require('../../config/production.js');

// Import test configuration optimized for Jest testing, Supertest HTTP testing, and minimal test output
const testConfig = require('../../config/test.js');

// Import environment constants for NODE_ENV validation and environment-specific configuration selection
const { 
    ENVIRONMENTS 
} = require('./constants.js');

// Import server default configuration values for fallback when environment-specific values are not available
const { 
    SERVER_DEFAULTS 
} = require('./constants.js');

// Import logging level constants for configuration validation and logging level management
const { 
    LOGGING_LEVELS 
} = require('./constants.js');

// =============================================================================
// GLOBAL STATE AND CACHING
// =============================================================================

/**
 * Cached current environment (development, production, test) to avoid repeated NODE_ENV detection
 * @type {string|null}
 */
let CURRENT_ENVIRONMENT = null;

/**
 * Cache for loaded configuration objects to prevent repeated file system access and parsing
 * Uses Map for efficient key-value storage with environment-specific configuration caching
 * @type {Map<string, Object>}
 */
const CONFIG_CACHE = new Map();

/**
 * Environment variable overrides applied to configuration for runtime customization
 * Stores typed and validated environment variable values extracted from process.env
 * @type {Object}
 */
let ENVIRONMENT_OVERRIDES = {};

/**
 * Flag indicating if configuration system is initialized to prevent duplicate initialization
 * @type {boolean}
 */
let CONFIGURATION_INITIALIZED = false;

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

/**
 * Configuration-specific error class for configuration loading, validation, and initialization errors
 * Extends native Error with additional context for configuration system error handling
 */
class ConfigurationError extends Error {
    /**
     * Creates a new ConfigurationError with detailed error information
     * @param {string} message - Error message describing the configuration issue
     * @param {string} [code] - Optional error code for programmatic error handling
     * @param {Object} [details] - Optional additional error details and context
     */
    constructor(message, code = 'CONFIG_ERROR', details = {}) {
        super(message);
        this.name = 'ConfigurationError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Maintain proper stack trace for debugging
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ConfigurationError);
        }
    }
}

/**
 * Validation-specific error class for configuration validation failures
 * Used when configuration objects fail validation rules and requirements
 */
class ValidationError extends ConfigurationError {
    /**
     * Creates a new ValidationError with validation failure details
     * @param {string} message - Validation error message
     * @param {Array} errors - Array of specific validation errors
     * @param {Object} config - Configuration object that failed validation
     */
    constructor(message, errors = [], config = {}) {
        super(message, 'VALIDATION_ERROR', { errors, config });
        this.name = 'ValidationError';
        this.errors = errors;
        this.configSnapshot = config;
    }
}

/**
 * Initialization-specific error class for configuration system initialization failures
 * Used when the configuration system fails to initialize properly
 */
class InitializationError extends ConfigurationError {
    /**
     * Creates a new InitializationError with initialization failure details
     * @param {string} message - Initialization error message
     * @param {string} phase - Initialization phase where error occurred
     * @param {Error} [cause] - Optional underlying cause error
     */
    constructor(message, phase = 'unknown', cause = null) {
        super(message, 'INIT_ERROR', { phase, cause: cause?.message });
        this.name = 'InitializationError';
        this.phase = phase;
        this.cause = cause;
    }
}

// =============================================================================
// CORE CONFIGURATION FUNCTIONS
// =============================================================================

/**
 * Determines the current runtime environment based on NODE_ENV environment variable with fallback to development.
 * Validates the environment against supported ENVIRONMENTS constants and caches the result for performance optimization.
 * 
 * This function implements environment detection logic that:
 * - Reads NODE_ENV from process.env with case-insensitive comparison
 * - Validates against supported environments (development, production, test)
 * - Falls back to 'development' for invalid or missing NODE_ENV values
 * - Caches the determined environment to avoid repeated detection calls
 * - Returns normalized environment string for consistent configuration loading
 * 
 * @returns {string} Environment name (development, production, test) validated against ENVIRONMENTS constants
 * @throws {ConfigurationError} When environment detection fails or invalid environment is specified
 */
function determineEnvironment() {
    try {
        // Return cached environment if already determined for performance optimization
        if (CURRENT_ENVIRONMENT !== null) {
            return CURRENT_ENVIRONMENT;
        }

        // Read NODE_ENV environment variable from process.env with null safety
        const nodeEnv = process.env.NODE_ENV;
        
        // Normalize environment string to lowercase for case-insensitive comparison
        const normalizedEnv = nodeEnv ? nodeEnv.toLowerCase().trim() : '';
        
        // Validate environment against ENVIRONMENTS constants for supported environments
        let detectedEnvironment;
        
        if (normalizedEnv === ENVIRONMENTS.DEVELOPMENT.toLowerCase()) {
            detectedEnvironment = ENVIRONMENTS.DEVELOPMENT;
        } else if (normalizedEnv === ENVIRONMENTS.PRODUCTION.toLowerCase()) {
            detectedEnvironment = ENVIRONMENTS.PRODUCTION;
        } else if (normalizedEnv === ENVIRONMENTS.TEST.toLowerCase()) {
            detectedEnvironment = ENVIRONMENTS.TEST;
        } else {
            // Fall back to 'development' if NODE_ENV is not set or invalid
            detectedEnvironment = ENVIRONMENTS.DEVELOPMENT;
            
            // Log warning for invalid NODE_ENV values (if not undefined)
            if (normalizedEnv && normalizedEnv !== ENVIRONMENTS.DEVELOPMENT.toLowerCase()) {
                console.warn(`[Config] Invalid NODE_ENV value: "${nodeEnv}". Falling back to development.`);
            }
        }
        
        // Cache determined environment in CURRENT_ENVIRONMENT global for performance
        CURRENT_ENVIRONMENT = detectedEnvironment;
        
        // Return validated environment string
        return detectedEnvironment;
        
    } catch (error) {
        // Handle environment detection errors with detailed error information
        throw new ConfigurationError(
            'Failed to determine runtime environment',
            'ENV_DETECTION_ERROR',
            {
                nodeEnv: process.env.NODE_ENV,
                error: error.message,
                supportedEnvironments: Object.values(ENVIRONMENTS)
            }
        );
    }
}

/**
 * Loads the appropriate environment-specific configuration file based on determined environment.
 * Implements configuration loading with caching to prevent repeated file system access and
 * provides fallback to default configuration for unknown environments.
 * 
 * This function handles:
 * - Configuration caching for performance optimization and repeated access prevention
 * - Environment-specific configuration file loading with proper module imports
 * - Fallback to default configuration for unknown or invalid environments
 * - Configuration object validation and structure verification
 * - Error handling for missing or corrupted configuration files
 * 
 * @param {string} environment - Environment name (development, production, test)
 * @returns {Object} Environment-specific configuration object with all sections (server, app, logging, security, monitoring, features)
 * @throws {ConfigurationError} When configuration loading fails or configuration file is corrupted
 */
function loadEnvironmentConfig(environment) {
    try {
        // Check CONFIG_CACHE for previously loaded configuration to improve performance
        const cacheKey = `config_${environment}`;
        if (CONFIG_CACHE.has(cacheKey)) {
            // Return cached configuration if available for performance optimization
            return CONFIG_CACHE.get(cacheKey);
        }

        let environmentConfig;
        
        // Switch on environment parameter to determine configuration import
        switch (environment) {
            case ENVIRONMENTS.DEVELOPMENT:
                // Load developmentConfig for 'development' environment with debugging features
                environmentConfig = developmentConfig.developmentConfig || developmentConfig;
                break;
                
            case ENVIRONMENTS.PRODUCTION:
                // Load productionConfig for 'production' environment with security hardening
                environmentConfig = productionConfig.productionConfig || productionConfig;
                break;
                
            case ENVIRONMENTS.TEST:
                // Load testConfig for 'test' environment with testing optimizations
                environmentConfig = testConfig.testConfig || testConfig;
                break;
                
            default:
                // Fall back to defaultConfig for unknown environments with warning
                console.warn(`[Config] Unknown environment: ${environment}. Using default configuration.`);
                environmentConfig = defaultConfig.defaultConfig || defaultConfig;
                break;
        }

        // Validate loaded configuration structure for required sections
        if (!environmentConfig || typeof environmentConfig !== 'object') {
            throw new ConfigurationError(
                `Invalid configuration object loaded for environment: ${environment}`,
                'INVALID_CONFIG_OBJECT',
                { environment, configType: typeof environmentConfig }
            );
        }

        // Verify essential configuration sections are present
        const requiredSections = ['server', 'app', 'logging', 'security', 'monitoring', 'features'];
        const missingSections = requiredSections.filter(section => !environmentConfig[section]);
        
        if (missingSections.length > 0) {
            throw new ConfigurationError(
                `Configuration missing required sections: ${missingSections.join(', ')}`,
                'MISSING_CONFIG_SECTIONS',
                { environment, missingSections, availableSections: Object.keys(environmentConfig) }
            );
        }

        // Store loaded configuration in CONFIG_CACHE for performance optimization
        CONFIG_CACHE.set(cacheKey, environmentConfig);
        
        // Return environment-specific configuration object
        return environmentConfig;
        
    } catch (error) {
        // Handle configuration loading errors with context and fallback information
        if (error instanceof ConfigurationError) {
            throw error;
        }
        
        throw new ConfigurationError(
            `Failed to load configuration for environment: ${environment}`,
            'CONFIG_LOAD_ERROR',
            {
                environment,
                error: error.message,
                stack: error.stack
            }
        );
    }
}

/**
 * Extracts configuration overrides from environment variables with proper type conversion and validation.
 * Implements comprehensive environment variable processing with type safety, validation, and 
 * structured override object creation for server, logging, and application settings.
 * 
 * This function handles:
 * - Server configuration overrides (PORT, HOST, TIMEOUT) with type conversion and range validation
 * - Logging configuration overrides (LOG_LEVEL, VERBOSE) with enum validation
 * - Boolean environment variable conversion with proper type checking
 * - Security and monitoring overrides with validation and sanitization
 * - Type conversion errors with detailed error reporting and fallback values
 * 
 * @returns {Object} Environment variable overrides object with typed values for server, logging, and application settings
 * @throws {ConfigurationError} When environment variable parsing fails or invalid values are detected
 */
function extractEnvironmentOverrides() {
    try {
        // Initialize empty overrides object structure for all configuration sections
        const overrides = {
            server: {},
            app: {},
            logging: {},
            security: {},
            monitoring: {},
            features: {}
        };

        // Extract server configuration overrides (PORT, HOST, TIMEOUT) with validation
        
        // PORT environment variable with number conversion and range validation
        if (process.env.PORT) {
            const portValue = parseInt(process.env.PORT, 10);
            if (!isNaN(portValue) && portValue >= 1 && portValue <= 65535) {
                overrides.server.port = portValue;
            } else {
                console.warn(`[Config] Invalid PORT value: ${process.env.PORT}. Must be between 1-65535.`);
            }
        }
        
        // HOST environment variable with hostname validation
        if (process.env.HOST) {
            const hostValue = process.env.HOST.trim();
            if (hostValue && typeof hostValue === 'string' && hostValue.length > 0) {
                // Basic hostname/IP address validation
                if (/^[a-zA-Z0-9.-]+$/.test(hostValue) || hostValue === '0.0.0.0') {
                    overrides.server.host = hostValue;
                } else {
                    console.warn(`[Config] Invalid HOST value: ${process.env.HOST}. Using default.`);
                }
            }
        }
        
        // TIMEOUT environment variable with positive integer validation
        if (process.env.TIMEOUT) {
            const timeoutValue = parseInt(process.env.TIMEOUT, 10);
            if (!isNaN(timeoutValue) && timeoutValue > 0) {
                overrides.server.timeout = timeoutValue;
            } else {
                console.warn(`[Config] Invalid TIMEOUT value: ${process.env.TIMEOUT}. Must be positive integer.`);
            }
        }

        // Extract logging configuration overrides (LOG_LEVEL, VERBOSE) with enum validation
        
        // LOG_LEVEL environment variable validation against LOGGING_LEVELS constants
        if (process.env.LOG_LEVEL) {
            const logLevelValue = process.env.LOG_LEVEL.toLowerCase().trim();
            const validLevels = Object.values(LOGGING_LEVELS);
            if (validLevels.includes(logLevelValue)) {
                overrides.logging.level = logLevelValue;
            } else {
                console.warn(`[Config] Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}. Valid levels: ${validLevels.join(', ')}`);
            }
        }
        
        // VERBOSE environment variable conversion to boolean type
        if (process.env.VERBOSE !== undefined) {
            overrides.logging.verbose = process.env.VERBOSE.toLowerCase() === 'true';
        }
        
        // DEBUG environment variable conversion to boolean for application debugging
        if (process.env.DEBUG !== undefined) {
            overrides.app.debug = process.env.DEBUG.toLowerCase() === 'true';
        }

        // Extract security and monitoring overrides if present with validation
        
        // TRUST_PROXY environment variable for load balancer configuration
        if (process.env.TRUST_PROXY !== undefined) {
            const trustProxyValue = process.env.TRUST_PROXY.toLowerCase();
            if (trustProxyValue === 'true' || trustProxyValue === '1') {
                overrides.security.trust_proxy = true;
            } else if (trustProxyValue === 'false' || trustProxyValue === '0') {
                overrides.security.trust_proxy = false;
            } else {
                // Try to parse as number for specific proxy count
                const proxyCount = parseInt(process.env.TRUST_PROXY, 10);
                if (!isNaN(proxyCount) && proxyCount >= 0) {
                    overrides.security.trust_proxy = proxyCount;
                }
            }
        }
        
        // CORS_ORIGIN environment variable for CORS configuration
        if (process.env.CORS_ORIGIN) {
            const corsOrigin = process.env.CORS_ORIGIN.trim();
            if (corsOrigin === '*' || corsOrigin.startsWith('http')) {
                overrides.security.cors_origin = corsOrigin;
            }
        }
        
        // ENABLE_METRICS environment variable for monitoring configuration
        if (process.env.ENABLE_METRICS !== undefined) {
            overrides.monitoring.metrics_enabled = process.env.ENABLE_METRICS.toLowerCase() === 'true';
        }
        
        // HEALTH_CHECK_TIMEOUT environment variable for health check configuration
        if (process.env.HEALTH_CHECK_TIMEOUT) {
            const healthTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10);
            if (!isNaN(healthTimeout) && healthTimeout > 0) {
                overrides.monitoring.health_check_timeout = healthTimeout;
            }
        }
        
        // Feature flag overrides from environment variables
        
        // HELLO_ENDPOINT feature flag override
        if (process.env.HELLO_ENDPOINT !== undefined) {
            overrides.features.hello_endpoint = process.env.HELLO_ENDPOINT.toLowerCase() === 'true';
        }
        
        // HEALTH_ENDPOINTS feature flag override
        if (process.env.HEALTH_ENDPOINTS !== undefined) {
            overrides.features.health_endpoints = process.env.HEALTH_ENDPOINTS.toLowerCase() === 'true';
        }

        // Store extracted overrides in ENVIRONMENT_OVERRIDES global for caching
        ENVIRONMENT_OVERRIDES = overrides;
        
        // Return typed and validated overrides object
        return overrides;
        
    } catch (error) {
        // Handle environment variable extraction errors with detailed context
        throw new ConfigurationError(
            'Failed to extract environment variable overrides',
            'ENV_OVERRIDE_ERROR',
            {
                error: error.message,
                availableEnvVars: Object.keys(process.env).filter(key => 
                    ['PORT', 'HOST', 'TIMEOUT', 'LOG_LEVEL', 'VERBOSE', 'DEBUG', 'TRUST_PROXY', 'CORS_ORIGIN', 'ENABLE_METRICS'].includes(key)
                )
            }
        );
    }
}

/**
 * Performs deep merge of base configuration with environment overrides, applying proper precedence rules.
 * Implements comprehensive configuration merging with deep object merging, override precedence,
 * and configuration section freezing to prevent runtime mutations while maintaining extensibility.
 * 
 * This function handles:
 * - Deep copying of base configuration to prevent source mutation
 * - Server configuration merging with port, host, and timeout override precedence
 * - Logging configuration merging with level and format override application
 * - Application configuration merging with environment-specific settings
 * - Security and monitoring configuration merging with override validation
 * - Configuration object freezing to prevent runtime tampering
 * 
 * @param {Object} baseConfig - Base configuration object from environment-specific file
 * @param {Object} overrides - Environment variable overrides object with typed values
 * @returns {Object} Merged configuration object with overrides applied and deep merge strategy
 * @throws {ConfigurationError} When configuration merging fails or invalid override values are detected
 */
function mergeConfiguration(baseConfig, overrides) {
    try {
        // Create deep copy of base configuration to prevent mutation of source object
        const mergedConfig = JSON.parse(JSON.stringify(baseConfig));
        
        // Apply server configuration overrides (port, host, timeout) with validation
        if (overrides.server && Object.keys(overrides.server).length > 0) {
            mergedConfig.server = {
                ...mergedConfig.server,
                ...overrides.server
            };
        }
        
        // Merge logging configuration with override precedence for level and verbosity
        if (overrides.logging && Object.keys(overrides.logging).length > 0) {
            mergedConfig.logging = {
                ...mergedConfig.logging,
                ...overrides.logging
            };
        }
        
        // Apply application configuration overrides (name, version, debug) with validation
        if (overrides.app && Object.keys(overrides.app).length > 0) {
            mergedConfig.app = {
                ...mergedConfig.app,
                ...overrides.app
            };
        }
        
        // Merge security configuration settings with environment override values
        if (overrides.security && Object.keys(overrides.security).length > 0) {
            mergedConfig.security = {
                ...mergedConfig.security,
                ...overrides.security
            };
        }
        
        // Apply monitoring configuration overrides for metrics and health checks
        if (overrides.monitoring && Object.keys(overrides.monitoring).length > 0) {
            mergedConfig.monitoring = {
                ...mergedConfig.monitoring,
                ...overrides.monitoring
            };
        }
        
        // Preserve feature configuration from base with selective override application
        if (overrides.features && Object.keys(overrides.features).length > 0) {
            mergedConfig.features = {
                ...mergedConfig.features,
                ...overrides.features
            };
        }

        // Validate merged configuration for completeness and correctness
        const requiredSections = ['server', 'app', 'logging', 'security', 'monitoring', 'features'];
        const missingSections = requiredSections.filter(section => !mergedConfig[section]);
        
        if (missingSections.length > 0) {
            throw new ConfigurationError(
                `Merged configuration missing required sections: ${missingSections.join(', ')}`,
                'INCOMPLETE_MERGED_CONFIG',
                { missingSections, availableSections: Object.keys(mergedConfig) }
            );
        }

        // Freeze configuration sections to prevent runtime mutations while allowing controlled updates
        Object.keys(mergedConfig).forEach(section => {
            if (typeof mergedConfig[section] === 'object' && mergedConfig[section] !== null) {
                mergedConfig[section] = Object.freeze(mergedConfig[section]);
            }
        });
        
        // Return final merged configuration object with immutable sections
        return Object.freeze(mergedConfig);
        
    } catch (error) {
        // Handle configuration merging errors with detailed context and troubleshooting information
        if (error instanceof ConfigurationError) {
            throw error;
        }
        
        throw new ConfigurationError(
            'Failed to merge configuration with environment overrides',
            'CONFIG_MERGE_ERROR',
            {
                error: error.message,
                baseConfigSections: Object.keys(baseConfig || {}),
                overrideSections: Object.keys(overrides || {}),
                mergingPhase: 'deep_merge'
            }
        );
    }
}

/**
 * Validates configuration object for required fields, value ranges, and type correctness with comprehensive error reporting.
 * Implements thorough configuration validation with field presence checking, type validation,
 * range validation, enum validation, and detailed error accumulation for troubleshooting.
 * 
 * This function validates:
 * - Server configuration section with port range, host format, and timeout validation
 * - Application configuration section with required string fields and environment validation
 * - Logging configuration section with log level enum validation and boolean type checking
 * - Security and monitoring configuration sections with feature flag validation
 * - Type correctness and value range compliance for all configuration values
 * - Required field presence and non-empty string validation
 * 
 * @param {Object} config - Configuration object to validate against validation rules
 * @returns {Object} Validation result with isValid boolean, errors array, and detailed validation information
 * @throws {ValidationError} When configuration validation fails with multiple validation errors
 */
function validateConfiguration(config) {
    // Initialize validation result object with errors array for detailed error reporting
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        validatedSections: [],
        timestamp: new Date().toISOString()
    };

    try {
        // Validate server configuration section with port, host, and timeout checks
        if (config.server) {
            validationResult.validatedSections.push('server');
            
            // Check port number is between 1 and 65535 (valid TCP port range)
            if (config.server.port !== undefined) {
                const port = config.server.port;
                if (typeof port !== 'number' || port < 1 || port > 65535) {
                    validationResult.errors.push({
                        section: 'server',
                        field: 'port',
                        value: port,
                        message: 'Port must be a number between 1 and 65535',
                        code: 'INVALID_PORT_RANGE'
                    });
                }
            } else {
                validationResult.errors.push({
                    section: 'server',
                    field: 'port',
                    message: 'Port is required in server configuration',
                    code: 'MISSING_REQUIRED_FIELD'
                });
            }
            
            // Validate host address format (IP address or hostname)
            if (config.server.host !== undefined) {
                const host = config.server.host;
                if (typeof host !== 'string' || host.trim().length === 0) {
                    validationResult.errors.push({
                        section: 'server',
                        field: 'host',
                        value: host,
                        message: 'Host must be a non-empty string',
                        code: 'INVALID_HOST_FORMAT'
                    });
                } else {
                    // Basic hostname/IP address pattern validation
                    const hostPattern = /^[a-zA-Z0-9.-]+$|^0\.0\.0\.0$/;
                    if (!hostPattern.test(host)) {
                        validationResult.warnings.push({
                            section: 'server',
                            field: 'host',
                            value: host,
                            message: 'Host format may not be valid hostname or IP address',
                            code: 'SUSPICIOUS_HOST_FORMAT'
                        });
                    }
                }
            } else {
                validationResult.errors.push({
                    section: 'server',
                    field: 'host',
                    message: 'Host is required in server configuration',
                    code: 'MISSING_REQUIRED_FIELD'
                });
            }
            
            // Verify timeout values are positive integers (milliseconds)
            if (config.server.timeout !== undefined) {
                const timeout = config.server.timeout;
                if (typeof timeout !== 'number' || timeout <= 0) {
                    validationResult.errors.push({
                        section: 'server',
                        field: 'timeout',
                        value: timeout,
                        message: 'Timeout must be a positive number (milliseconds)',
                        code: 'INVALID_TIMEOUT_VALUE'
                    });
                }
            }
        } else {
            validationResult.errors.push({
                section: 'root',
                field: 'server',
                message: 'Server configuration section is required',
                code: 'MISSING_CONFIG_SECTION'
            });
        }

        // Validate application configuration section with name, version, and environment checks
        if (config.app) {
            validationResult.validatedSections.push('app');
            
            // Check required string fields (name, version) are present and non-empty
            const requiredAppFields = ['name', 'version'];
            requiredAppFields.forEach(field => {
                if (config.app[field] !== undefined) {
                    const value = config.app[field];
                    if (typeof value !== 'string' || value.trim().length === 0) {
                        validationResult.errors.push({
                            section: 'app',
                            field: field,
                            value: value,
                            message: `App ${field} must be a non-empty string`,
                            code: 'INVALID_STRING_FIELD'
                        });
                    }
                } else {
                    validationResult.errors.push({
                        section: 'app',
                        field: field,
                        message: `App ${field} is required`,
                        code: 'MISSING_REQUIRED_FIELD'
                    });
                }
            });
            
            // Validate environment setting against ENVIRONMENTS constants
            if (config.app.env !== undefined) {
                const environment = config.app.env;
                const validEnvironments = Object.values(ENVIRONMENTS);
                if (!validEnvironments.includes(environment)) {
                    validationResult.errors.push({
                        section: 'app',
                        field: 'env',
                        value: environment,
                        message: `Environment must be one of: ${validEnvironments.join(', ')}`,
                        code: 'INVALID_ENVIRONMENT'
                    });
                }
            }
        } else {
            validationResult.errors.push({
                section: 'root',
                field: 'app',
                message: 'Application configuration section is required',
                code: 'MISSING_CONFIG_SECTION'
            });
        }

        // Validate logging configuration section with log level and format validation
        if (config.logging) {
            validationResult.validatedSections.push('logging');
            
            // Verify log level is one of valid LOGGING_LEVELS values
            if (config.logging.level !== undefined) {
                const logLevel = config.logging.level;
                const validLevels = Object.values(LOGGING_LEVELS);
                if (!validLevels.includes(logLevel)) {
                    validationResult.errors.push({
                        section: 'logging',
                        field: 'level',
                        value: logLevel,
                        message: `Log level must be one of: ${validLevels.join(', ')}`,
                        code: 'INVALID_LOG_LEVEL'
                    });
                }
            }
            
            // Check boolean flags have proper boolean values
            const booleanFields = ['colorize', 'timestamp', 'request_logging', 'performance_logging', 'error_stack_trace'];
            booleanFields.forEach(field => {
                if (config.logging[field] !== undefined && typeof config.logging[field] !== 'boolean') {
                    validationResult.warnings.push({
                        section: 'logging',
                        field: field,
                        value: config.logging[field],
                        message: `Logging ${field} should be a boolean value`,
                        code: 'TYPE_MISMATCH_WARNING'
                    });
                }
            });
        } else {
            validationResult.errors.push({
                section: 'root',
                field: 'logging',
                message: 'Logging configuration section is required',
                code: 'MISSING_CONFIG_SECTION'
            });
        }

        // Validate security and monitoring configuration sections with feature validation
        const optionalSections = ['security', 'monitoring', 'features'];
        optionalSections.forEach(section => {
            if (config[section]) {
                validationResult.validatedSections.push(section);
                
                // Basic structure validation for optional sections
                if (typeof config[section] !== 'object' || config[section] === null) {
                    validationResult.errors.push({
                        section: 'root',
                        field: section,
                        value: config[section],
                        message: `${section} configuration must be an object`,
                        code: 'INVALID_SECTION_TYPE'
                    });
                }
            }
        });

        // Check feature flags are proper boolean types where present
        if (config.features) {
            const featureFields = ['hello_endpoint', 'health_endpoints', 'static_content', 'error_handling'];
            featureFields.forEach(field => {
                if (config.features[field] !== undefined && typeof config.features[field] !== 'boolean') {
                    validationResult.warnings.push({
                        section: 'features',
                        field: field,
                        value: config.features[field],
                        message: `Feature ${field} should be a boolean value`,
                        code: 'TYPE_MISMATCH_WARNING'
                    });
                }
            });
        }

        // Set isValid flag based on error count (warnings don't affect validity)
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add validation summary information
        validationResult.summary = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            sectionsValidated: validationResult.validatedSections.length,
            isValid: validationResult.isValid
        };
        
        // Return comprehensive validation result object
        return validationResult;
        
    } catch (error) {
        // Handle validation process errors with detailed error context
        throw new ValidationError(
            'Configuration validation process failed',
            [{
                section: 'validation',
                field: 'process',
                message: error.message,
                code: 'VALIDATION_PROCESS_ERROR'
            }],
            config
        );
    }
}

/**
 * Initializes the configuration system by determining environment, loading config, applying overrides, and validating the final configuration.
 * Implements complete configuration system initialization with error handling, validation, caching, and
 * comprehensive setup for environment-aware configuration management.
 * 
 * This function orchestrates:
 * - Configuration system initialization status checking to prevent duplicate initialization
 * - Environment detection using determineEnvironment() with fallback handling
 * - Environment-specific configuration loading using loadEnvironmentConfig()
 * - Environment variable override extraction and application using extractEnvironmentOverrides()
 * - Configuration merging with proper precedence using mergeConfiguration()
 * - Comprehensive configuration validation using validateConfiguration()
 * - Configuration caching and initialization state management
 * 
 * @returns {Object} Complete initialized configuration object ready for application use
 * @throws {InitializationError} When configuration system initialization fails at any phase
 * @throws {ValidationError} When final configuration validation fails with detailed error reporting
 */
function initializeConfiguration() {
    try {
        // Check if configuration is already initialized using CONFIGURATION_INITIALIZED flag
        if (CONFIGURATION_INITIALIZED && CONFIG_CACHE.has('initialized_config')) {
            // Return cached configuration if already initialized for performance optimization
            return CONFIG_CACHE.get('initialized_config');
        }

        // Phase 1: Determine current environment using determineEnvironment()
        let currentEnvironment;
        try {
            currentEnvironment = determineEnvironment();
        } catch (error) {
            throw new InitializationError(
                'Failed to determine runtime environment during initialization',
                'environment_detection',
                error
            );
        }

        // Phase 2: Load environment-specific configuration using loadEnvironmentConfig()
        let environmentConfig;
        try {
            environmentConfig = loadEnvironmentConfig(currentEnvironment);
        } catch (error) {
            throw new InitializationError(
                `Failed to load ${currentEnvironment} configuration during initialization`,
                'config_loading',
                error
            );
        }

        // Phase 3: Extract environment variable overrides using extractEnvironmentOverrides()
        let envOverrides;
        try {
            envOverrides = extractEnvironmentOverrides();
        } catch (error) {
            throw new InitializationError(
                'Failed to extract environment variable overrides during initialization',
                'override_extraction',
                error
            );
        }

        // Phase 4: Merge base configuration with overrides using mergeConfiguration()
        let mergedConfiguration;
        try {
            mergedConfiguration = mergeConfiguration(environmentConfig, envOverrides);
        } catch (error) {
            throw new InitializationError(
                'Failed to merge configuration with environment overrides during initialization',
                'config_merging',
                error
            );
        }

        // Phase 5: Validate final merged configuration using validateConfiguration()
        let validationResult;
        try {
            validationResult = validateConfiguration(mergedConfiguration);
        } catch (error) {
            throw new InitializationError(
                'Failed to validate merged configuration during initialization',
                'config_validation',
                error
            );
        }

        // Throw ValidationError if validation fails with detailed error information
        if (!validationResult.isValid) {
            const errorDetails = validationResult.errors.map(err => 
                `${err.section}.${err.field}: ${err.message}`
            ).join(', ');
            
            throw new ValidationError(
                `Configuration validation failed during initialization: ${errorDetails}`,
                validationResult.errors,
                mergedConfiguration
            );
        }

        // Phase 6: Set CONFIGURATION_INITIALIZED flag to true for future calls
        CONFIGURATION_INITIALIZED = true;

        // Phase 7: Store final configuration in CONFIG_CACHE for future access and performance
        CONFIG_CACHE.set('initialized_config', mergedConfiguration);
        CONFIG_CACHE.set('initialization_timestamp', new Date().toISOString());
        CONFIG_CACHE.set('initialization_environment', currentEnvironment);

        // Add initialization metadata to configuration
        const finalConfiguration = {
            ...mergedConfiguration,
            _initialization: {
                timestamp: new Date().toISOString(),
                environment: currentEnvironment,
                validationResult: {
                    isValid: validationResult.isValid,
                    errorCount: validationResult.errors.length,
                    warningCount: validationResult.warnings.length,
                    sectionsValidated: validationResult.validatedSections
                },
                configurationSource: {
                    environment: currentEnvironment,
                    overridesApplied: Object.keys(envOverrides).filter(section => 
                        Object.keys(envOverrides[section]).length > 0
                    ),
                    cacheEnabled: true
                }
            }
        };

        // Return validated and initialized configuration object ready for application use
        return Object.freeze(finalConfiguration);
        
    } catch (error) {
        // Handle initialization errors with comprehensive error context and cleanup
        CONFIGURATION_INITIALIZED = false;
        CONFIG_CACHE.clear();
        ENVIRONMENT_OVERRIDES = {};
        CURRENT_ENVIRONMENT = null;
        
        // Re-throw specific error types to maintain error context
        if (error instanceof InitializationError || error instanceof ValidationError || error instanceof ConfigurationError) {
            throw error;
        }
        
        // Wrap unexpected errors in InitializationError with full context
        throw new InitializationError(
            'Unexpected error during configuration system initialization',
            'unknown',
            error
        );
    }
}

/**
 * Primary configuration factory function that provides access to current environment configuration with lazy initialization.
 * Implements the main configuration access interface with lazy initialization, caching, and error handling
 * for seamless configuration retrieval throughout the application lifecycle.
 * 
 * This function provides:
 * - Lazy configuration initialization only when first accessed for performance
 * - Configuration caching to prevent repeated initialization overhead
 * - Error handling with graceful fallback and detailed error reporting
 * - Thread-safe configuration access with immutable configuration objects
 * - Performance optimization through intelligent caching strategies
 * 
 * @returns {Object} Current environment configuration object with all sections and environment-specific settings applied
 * @throws {InitializationError} When configuration initialization fails
 * @throws {ConfigurationError} When configuration access fails
 */
function getConfig() {
    try {
        // Check CONFIG_CACHE for existing configuration to avoid repeated initialization
        if (CONFIG_CACHE.has('initialized_config') && CONFIGURATION_INITIALIZED) {
            // Return cached configuration if available for optimal performance
            return CONFIG_CACHE.get('initialized_config');
        }

        // Initialize configuration using initializeConfiguration() if not cached
        const initializedConfig = initializeConfiguration();

        // Store initialized configuration in cache for performance optimization
        CONFIG_CACHE.set('initialized_config', initializedConfig);
        CONFIG_CACHE.set('last_access_timestamp', new Date().toISOString());

        // Return complete configuration object ready for application use
        return initializedConfig;
        
    } catch (error) {
        // Handle configuration access errors with context preservation and logging
        if (error instanceof InitializationError || error instanceof ValidationError || error instanceof ConfigurationError) {
            // Log error for operational monitoring while re-throwing for caller handling
            console.error(`[Config] Configuration access failed: ${error.message}`, {
                errorCode: error.code,
                errorDetails: error.details,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
        
        // Wrap unexpected errors in ConfigurationError with access context
        throw new ConfigurationError(
            'Unexpected error during configuration access',
            'CONFIG_ACCESS_ERROR',
            {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        );
    }
}

/**
 * Reloads configuration from files and environment variables, useful for dynamic configuration updates.
 * Implements complete configuration system reset and reinitialization for runtime configuration
 * updates, testing scenarios, and dynamic configuration management use cases.
 * 
 * This function handles:
 * - Complete configuration cache clearing to force fresh configuration loading
 * - Configuration initialization state reset for clean reinitialization
 * - Environment variable override cache clearing for updated override detection
 * - Fresh environment detection in case NODE_ENV has changed at runtime
 * - Complete configuration system reinitialization with updated settings
 * - Error handling and rollback for failed configuration reload attempts
 * 
 * @returns {Object} Newly loaded configuration object with latest settings
 * @throws {InitializationError} When configuration reload fails
 * @throws {ConfigurationError} When configuration system reset fails
 */
function reloadConfiguration() {
    try {
        // Store current configuration for rollback in case of reload failure
        const previousConfig = CONFIG_CACHE.get('initialized_config');
        const previousInitializationState = CONFIGURATION_INITIALIZED;
        
        // Clear CONFIG_CACHE to force configuration reload from files
        CONFIG_CACHE.clear();
        
        // Reset CONFIGURATION_INITIALIZED flag to false for clean reinitialization
        CONFIGURATION_INITIALIZED = false;
        
        // Clear ENVIRONMENT_OVERRIDES cache to detect updated environment variables
        ENVIRONMENT_OVERRIDES = {};
        
        // Re-determine current environment in case NODE_ENV has changed at runtime
        CURRENT_ENVIRONMENT = null;
        
        // Initialize configuration fresh using initializeConfiguration() with updated settings
        const reloadedConfig = initializeConfiguration();
        
        // Update cache with reload timestamp and metadata
        CONFIG_CACHE.set('last_reload_timestamp', new Date().toISOString());
        CONFIG_CACHE.set('reload_count', (CONFIG_CACHE.get('reload_count') || 0) + 1);
        
        // Return newly loaded configuration object with latest settings
        return reloadedConfig;
        
    } catch (error) {
        // Handle configuration reload errors with rollback attempt and error context
        try {
            // Attempt to rollback to previous configuration if reload fails
            if (previousConfig) {
                CONFIG_CACHE.set('initialized_config', previousConfig);
                CONFIGURATION_INITIALIZED = previousInitializationState;
                console.warn('[Config] Configuration reload failed, rolled back to previous configuration');
            }
        } catch (rollbackError) {
            console.error('[Config] Failed to rollback configuration after reload failure', rollbackError);
        }
        
        // Re-throw specific error types to maintain error context
        if (error instanceof InitializationError || error instanceof ValidationError || error instanceof ConfigurationError) {
            throw error;
        }
        
        // Wrap unexpected errors in ConfigurationError with reload context
        throw new ConfigurationError(
            'Unexpected error during configuration reload',
            'CONFIG_RELOAD_ERROR',
            {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                rollbackAttempted: !!previousConfig
            }
        );
    }
}

/**
 * Returns a summary of current configuration for logging, monitoring, and debugging purposes.
 * Implements comprehensive configuration introspection and summary generation for operational
 * monitoring, debugging assistance, and system observability without exposing sensitive information.
 * 
 * This function provides:
 * - Configuration summary with key settings and environment information for monitoring
 * - Current environment and NODE_ENV value reporting for environment validation
 * - Server configuration summary including port and host information for operational visibility
 * - Logging level and format information for debugging and troubleshooting
 * - Feature enablement status for functionality verification and debugging
 * - Configuration validation status and initialization metadata for health monitoring
 * - Sanitized summary without sensitive information for security compliance
 * 
 * @returns {Object} Configuration summary with environment info, key settings, and validation status
 * @throws {ConfigurationError} When configuration summary generation fails
 */
function getConfigurationSummary() {
    try {
        // Get current configuration using getConfig() for summary generation
        const currentConfig = getConfig();
        
        // Extract key configuration values for summary without sensitive information
        const configSummary = {
            // Environment information and NODE_ENV value for operational visibility
            environment: {
                current: currentConfig.app?.env || 'unknown',
                nodeEnv: process.env.NODE_ENV || 'undefined',
                detected: CURRENT_ENVIRONMENT,
                configurationInitialized: CONFIGURATION_INITIALIZED
            },
            
            // Server configuration summary (port, host) for networking and deployment information
            server: {
                port: currentConfig.server?.port || 'not_configured',
                host: currentConfig.server?.host || 'not_configured',
                timeout: currentConfig.server?.timeout || 'default',
                serverName: currentConfig.server?.server_name || 'unknown'
            },
            
            // Application configuration summary for application identification
            application: {
                name: currentConfig.app?.name || 'unknown',
                version: currentConfig.app?.version || 'unknown',
                environment: currentConfig.app?.env || 'unknown',
                debug: currentConfig.app?.debug || false
            },
            
            // Logging level and format information for debugging and log management
            logging: {
                level: currentConfig.logging?.level || 'not_configured',
                format: currentConfig.logging?.format || 'not_configured',
                colorize: currentConfig.logging?.colorize || false,
                requestLogging: currentConfig.logging?.request_logging || false,
                performanceLogging: currentConfig.logging?.performance_logging || false
            },
            
            // Security configuration summary for security posture visibility
            security: {
                corsEnabled: currentConfig.security?.cors_enabled || false,
                rateLimiting: currentConfig.security?.rate_limiting || false,
                helmetEnabled: currentConfig.security?.helmet_enabled || false,
                httpsRequired: currentConfig.security?.https_required || false
            },
            
            // Monitoring configuration summary for observability setup
            monitoring: {
                healthCheckPath: currentConfig.monitoring?.health_check_path || 'not_configured',
                metricsEnabled: currentConfig.monitoring?.metrics_enabled || false,
                performanceMonitoring: currentConfig.monitoring?.performance_monitoring || false,
                uptimeTracking: currentConfig.monitoring?.uptime_tracking || false
            },
            
            // Feature enablement status for functionality verification and debugging
            features: {
                helloEndpoint: currentConfig.features?.hello_endpoint || false,
                healthEndpoints: currentConfig.features?.health_endpoints || false,
                staticContent: currentConfig.features?.static_content || false,
                errorHandling: currentConfig.features?.error_handling || false,
                requestValidation: currentConfig.features?.request_validation || false,
                responseCompression: currentConfig.features?.response_compression || false
            },
            
            // Configuration validation status and system health for monitoring
            validation: {
                isValid: currentConfig._initialization?.validationResult?.isValid || false,
                errorCount: currentConfig._initialization?.validationResult?.errorCount || 0,
                warningCount: currentConfig._initialization?.validationResult?.warningCount || 0,
                sectionsValidated: currentConfig._initialization?.validationResult?.sectionsValidated || []
            },
            
            // Cache and performance information for system optimization
            cache: {
                cacheSize: CONFIG_CACHE.size,
                cacheKeys: Array.from(CONFIG_CACHE.keys()),
                lastAccess: CONFIG_CACHE.get('last_access_timestamp') || 'never',
                lastReload: CONFIG_CACHE.get('last_reload_timestamp') || 'never',
                reloadCount: CONFIG_CACHE.get('reload_count') || 0
            },
            
            // Initialization metadata for troubleshooting and monitoring
            initialization: {
                timestamp: currentConfig._initialization?.timestamp || 'unknown',
                environment: currentConfig._initialization?.environment || 'unknown',
                overridesApplied: currentConfig._initialization?.configurationSource?.overridesApplied || [],
                cacheEnabled: currentConfig._initialization?.configurationSource?.cacheEnabled || false
            },
            
            // Summary metadata for monitoring and logging
            summary: {
                timestamp: new Date().toISOString(),
                totalSections: Object.keys(currentConfig).filter(key => !key.startsWith('_')).length,
                configurationStatus: 'operational',
                systemHealth: CONFIGURATION_INITIALIZED ? 'healthy' : 'not_initialized'
            }
        };

        // Return comprehensive configuration summary for operational monitoring
        return Object.freeze(configSummary);
        
    } catch (error) {
        // Handle configuration summary generation errors with fallback summary information
        console.error('[Config] Failed to generate configuration summary:', error.message);
        
        // Return minimal fallback summary in case of errors
        const fallbackSummary = {
            environment: {
                current: 'unknown',
                nodeEnv: process.env.NODE_ENV || 'undefined',
                detected: CURRENT_ENVIRONMENT || 'unknown',
                configurationInitialized: CONFIGURATION_INITIALIZED
            },
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            summary: {
                timestamp: new Date().toISOString(),
                configurationStatus: 'error',
                systemHealth: 'unhealthy'
            }
        };

        return Object.freeze(fallbackSummary);
    }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Primary configuration factory function providing access to current environment configuration with lazy initialization and caching
    getConfig,
    
    // Configuration reload function for dynamic configuration updates and testing scenarios
    reloadConfiguration,
    
    // Configuration summary utility for logging, monitoring, and debugging purposes
    getConfigurationSummary,
    
    // Environment detection utility for testing and configuration debugging
    determineEnvironment,
    
    // Custom error classes for configuration error handling and debugging
    ConfigurationError,
    ValidationError,
    InitializationError
};