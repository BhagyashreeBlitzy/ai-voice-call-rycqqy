/**
 * Environment Utility Module for Node.js Tutorial Application
 * 
 * Provides comprehensive environment variable processing, validation, and management
 * functionality for the Node.js tutorial application. This module handles environment
 * variable parsing with type conversion, environment detection (development/test/production),
 * configuration validation, and provides utilities for generating environment summaries.
 * 
 * Serves as the foundational utility for environment-based configuration management
 * across the application, supporting Node.js v22.x LTS runtime environment detection
 * and Express.js 5.1.0 configuration requirements.
 * 
 * Implements self-contained validation logic to avoid circular dependencies.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import environment and logging constants from the constants module
const { ENVIRONMENT, LOGGING } = require('./constants.js');

/**
 * Global environment cache for performance optimization
 * Caches parsed environment variables to reduce repeated parsing overhead
 * @type {Map<string, any>}
 */
const environmentCache = new Map();

/**
 * Creates a validation result object with success status, errors collection, and helper methods
 * for consistent validation outcome handling throughout the environment processing pipeline.
 * 
 * @param {boolean} isValid - Indicates whether the validation was successful
 * @param {Array<string>} errors - Array of validation error messages
 * @returns {Object} Validation result object with isValid flag, errors array, and utility methods
 */
function createValidationResult(isValid, errors = []) {
    // Create validation result object with isValid boolean flag
    const validationResult = {
        isValid: Boolean(isValid),
        errors: Array.isArray(errors) ? errors : []
    };

    // Add addError method for appending validation errors
    validationResult.addError = function(errorMessage) {
        if (typeof errorMessage === 'string' && errorMessage.trim()) {
            this.errors.push(errorMessage.trim());
            this.isValid = false;
        }
    };

    // Add hasErrors method for checking if validation failed
    validationResult.hasErrors = function() {
        return this.errors.length > 0;
    };

    // Add getErrors method for retrieving all validation errors
    validationResult.getErrors = function() {
        return [...this.errors];
    };

    // Add toJSON method for serializing validation result
    validationResult.toJSON = function() {
        return {
            isValid: this.isValid,
            errors: this.getErrors(),
            errorCount: this.errors.length
        };
    };

    // Return complete validation result object with all methods
    return validationResult;
}

/**
 * Validates port numbers ensuring they are integers within the valid range (1-65535)
 * suitable for HTTP server binding. Includes additional validation for reserved system
 * ports in production environments.
 * 
 * @param {any} port - Port value to validate (can be string, number, or other type)
 * @returns {boolean} True if port is valid, false otherwise
 */
function isValidPortNumber(port) {
    // Check if port value is defined and not null
    if (port === null || port === undefined) {
        return false;
    }

    // Convert port to number if provided as string
    const portNumber = typeof port === 'string' ? parseInt(port, 10) : Number(port);

    // Validate port is an integer using Number.isInteger
    if (!Number.isInteger(portNumber)) {
        return false;
    }

    // Check port is within valid range (1-65535)
    if (portNumber < 1 || portNumber > 65535) {
        return false;
    }

    // Verify port is not a reserved system port below 1024 in production
    // Allow reserved ports in development and test environments for flexibility
    if (isProductionEnvironment() && portNumber < 1024) {
        return false;
    }

    // Return boolean indicating port validity
    return true;
}

/**
 * Validates host addresses including hostnames, IP addresses, and special values like
 * localhost for HTTP server binding configuration. Supports both IPv4 addresses and
 * hostname validation with basic pattern matching.
 * 
 * @param {any} host - Host address to validate (expected to be string)
 * @returns {boolean} True if host is valid, false otherwise
 */
function isValidHostAddress(host) {
    // Check if host value is defined and is a string
    if (typeof host !== 'string') {
        return false;
    }

    // Trim whitespace and convert to lowercase for normalization
    const normalizedHost = host.trim().toLowerCase();

    // Check for empty string after trimming
    if (!normalizedHost) {
        return false;
    }

    // Check for special valid hosts like 'localhost' and '0.0.0.0'
    const validSpecialHosts = ['localhost', '0.0.0.0', '127.0.0.1', '::1'];
    if (validSpecialHosts.includes(normalizedHost)) {
        return true;
    }

    // Validate IPv4 address format using regex pattern
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(normalizedHost)) {
        return true;
    }

    // Validate hostname format using basic pattern matching
    // Hostname can contain letters, numbers, hyphens, and dots
    const hostnameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    if (hostnameRegex.test(normalizedHost)) {
        return true;
    }

    // Return boolean indicating host validity
    return false;
}

/**
 * Validates environment names against allowed values (development, test, production)
 * with case-insensitive comparison. Uses the VALID_ENVIRONMENTS constant from the
 * imported constants module to ensure consistency.
 * 
 * @param {any} environment - Environment name to validate
 * @returns {boolean} True if environment is valid, false otherwise
 */
function isValidEnvironmentName(environment) {
    // Check if environment value is defined and is a string
    if (typeof environment !== 'string') {
        return false;
    }

    // Convert environment to lowercase for case-insensitive comparison
    const normalizedEnvironment = environment.trim().toLowerCase();

    // Check if environment is included in VALID_ENVIRONMENTS array
    const validEnvironments = ENVIRONMENT.VALID_ENVIRONMENTS.map(env => env.toLowerCase());
    const isValid = validEnvironments.includes(normalizedEnvironment);

    // Return boolean indicating environment validity
    return isValid;
}

/**
 * Parses environment variables with type conversion, default value fallback, and validation
 * for converting string environment variables to appropriate data types. Supports string,
 * number, boolean, and array type conversions with comprehensive error handling.
 * 
 * @param {string} variableName - Name of the environment variable to parse
 * @param {string} expectedType - Expected data type (string, number, boolean, array)
 * @param {any} defaultValue - Default value to use if variable is missing or invalid
 * @param {Object} options - Additional parsing options and configuration
 * @returns {any} Parsed environment variable value with proper data type or default value
 */
function parseEnvironmentVariable(variableName, expectedType = 'string', defaultValue = null, options = {}) {
    // Retrieve environment variable value from process.env using variable name
    const rawValue = process.env[variableName];

    // Check if environment variable exists and is not undefined or empty string
    if (rawValue === undefined || rawValue === null || rawValue.trim() === '') {
        // Log parsing attempt and result using console output for debugging
        console.info(`[INFO] Environment variable ${variableName} not found, using default value: ${defaultValue}`);
        return defaultValue;
    }

    const trimmedValue = rawValue.trim();

    try {
        // Apply type conversion based on expectedType
        switch (expectedType.toLowerCase()) {
            case 'string':
                // For string type: return trimmed value directly
                console.debug(`[DEBUG] Parsed ${variableName} as string: "${trimmedValue}"`);
                return trimmedValue;

            case 'number':
                // For number type: use parseInt/parseFloat with validation
                const numericValue = trimmedValue.includes('.') ? parseFloat(trimmedValue) : parseInt(trimmedValue, 10);
                if (isNaN(numericValue)) {
                    throw new Error(`Invalid numeric value: ${trimmedValue}`);
                }
                console.debug(`[DEBUG] Parsed ${variableName} as number: ${numericValue}`);
                return numericValue;

            case 'boolean':
                // For boolean type: convert 'true'/'false', '1'/'0', 'yes'/'no' strings
                const lowerValue = trimmedValue.toLowerCase();
                const trueValues = ['true', '1', 'yes', 'on', 'enabled'];
                const falseValues = ['false', '0', 'no', 'off', 'disabled'];
                
                if (trueValues.includes(lowerValue)) {
                    console.debug(`[DEBUG] Parsed ${variableName} as boolean: true`);
                    return true;
                } else if (falseValues.includes(lowerValue)) {
                    console.debug(`[DEBUG] Parsed ${variableName} as boolean: false`);
                    return false;
                } else {
                    throw new Error(`Invalid boolean value: ${trimmedValue}`);
                }

            case 'array':
                // For array type: split comma-separated values and trim elements
                const separator = options.separator || ',';
                const arrayValue = trimmedValue.split(separator).map(item => item.trim()).filter(item => item.length > 0);
                console.debug(`[DEBUG] Parsed ${variableName} as array: [${arrayValue.join(', ')}]`);
                return arrayValue;

            default:
                throw new Error(`Unsupported type: ${expectedType}`);
        }
    } catch (error) {
        // Return default value if environment variable is missing or invalid
        console.error(`[ERROR] Failed to parse environment variable ${variableName}: ${error.message}`);
        console.warn(`[WARN] Using default value for ${variableName}: ${defaultValue}`);
        return defaultValue;
    }
}

/**
 * Validates port numbers for server configuration ensuring they are within valid range
 * (1-65535) and suitable for HTTP server binding. Returns a comprehensive validation
 * result with parsed port value and detailed error information.
 * 
 * @param {any} port - Port value to validate
 * @returns {Object} Validation result with isValid boolean, parsed port number, and error details
 */
function validatePortNumber(port) {
    // Use isValidPortNumber function to check port validity
    const isValid = isValidPortNumber(port);

    // Parse port value as integer if provided as string
    const parsedPort = typeof port === 'string' ? parseInt(port, 10) : Number(port);

    // Create validation result with success status
    const validationResult = createValidationResult(isValid);

    if (isValid) {
        // Include parsed port value in validation result
        validationResult.value = parsedPort;
        validationResult.message = `Port ${parsedPort} is valid`;
    } else {
        // Add specific error messages for invalid port values
        if (port === null || port === undefined) {
            validationResult.addError('Port value is required');
        } else if (!Number.isInteger(parsedPort) || isNaN(parsedPort)) {
            validationResult.addError('Port must be a valid integer');
        } else if (parsedPort < 1 || parsedPort > 65535) {
            validationResult.addError('Port must be between 1 and 65535');
        } else if (isProductionEnvironment() && parsedPort < 1024) {
            validationResult.addError('Reserved ports (< 1024) not allowed in production');
        }
    }

    // Return validation result object with all details
    return validationResult;
}

/**
 * Validates host addresses including hostnames, IP addresses, and special values like
 * localhost for HTTP server binding configuration. Returns detailed validation results
 * with normalized host value and comprehensive error information.
 * 
 * @param {any} host - Host address to validate
 * @returns {Object} Validation result with isValid boolean, normalized host value, and validation details
 */
function validateHostAddress(host) {
    // Use isValidHostAddress function to check host validity
    const isValid = isValidHostAddress(host);

    // Normalize host value by trimming whitespace and converting to lowercase
    const normalizedHost = typeof host === 'string' ? host.trim().toLowerCase() : null;

    // Create validation result with success status
    const validationResult = createValidationResult(isValid);

    if (isValid) {
        // Include normalized host value in validation result
        validationResult.value = normalizedHost;
        validationResult.message = `Host address "${normalizedHost}" is valid`;
    } else {
        // Add error messages with valid host format examples if validation fails
        if (typeof host !== 'string') {
            validationResult.addError('Host must be a string');
        } else if (!host.trim()) {
            validationResult.addError('Host address cannot be empty');
        } else {
            validationResult.addError(`Invalid host address: "${host}". Valid examples: localhost, 127.0.0.1, 0.0.0.0, or valid hostname`);
        }
    }

    // Return validation result object with all details
    return validationResult;
}

/**
 * Retrieves and parses all required environment variables for the application with type
 * conversion, validation, and default value fallback. Provides comprehensive processing
 * of environment configuration with caching for performance optimization.
 * 
 * @param {Array<Object>} requiredVariables - Array of variable specifications with name, type, and default
 * @param {Object} options - Configuration options for processing behavior
 * @returns {Object} Object containing all parsed environment variables with proper data types and validation status
 */
function getEnvironmentVariables(requiredVariables = [], options = {}) {
    // Initialize result object to store parsed environment variables
    const result = {
        variables: {},
        isValid: true,
        errors: [],
        warnings: []
    };

    // Define default required variables if none provided
    const defaultVariables = [
        { name: 'PORT', type: 'number', default: ENVIRONMENT.DEFAULT_PORT },
        { name: 'HOST', type: 'string', default: ENVIRONMENT.DEFAULT_HOST },
        { name: 'NODE_ENV', type: 'string', default: ENVIRONMENT.DEFAULT_NODE_ENV },
        { name: 'LOG_LEVEL', type: 'string', default: LOGGING.DEFAULT_LOG_LEVEL }
    ];

    const variablesToProcess = requiredVariables.length > 0 ? requiredVariables : defaultVariables;

    // Iterate through required variables list and parse each variable
    variablesToProcess.forEach(variableSpec => {
        const { name, type = 'string', default: defaultValue } = variableSpec;
        
        try {
            // Apply type conversion using parseEnvironmentVariable for each variable
            const parsedValue = parseEnvironmentVariable(name, type, defaultValue, options);
            result.variables[name] = parsedValue;

            // Track if default value was used
            if (process.env[name] === undefined && parsedValue === defaultValue) {
                result.warnings.push(`Using default value for ${name}: ${defaultValue}`);
            }
        } catch (error) {
            // Collect validation results and track any parsing failures
            result.errors.push(`Failed to process ${name}: ${error.message}`);
            result.isValid = false;
            
            // Apply default values for missing or invalid environment variables
            result.variables[name] = defaultValue;
        }
    });

    // Create comprehensive result with all variables and validation status
    result.summary = {
        totalVariables: variablesToProcess.length,
        successfullyParsed: variablesToProcess.length - result.errors.length,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length
    };

    // Log environment variable retrieval summary using console output
    console.info(`[INFO] Environment variables processed: ${result.summary.successfullyParsed}/${result.summary.totalVariables} successful`);
    if (result.errors.length > 0) {
        console.warn(`[WARN] Environment processing errors: ${result.errors.length}`);
    }

    // Return object with parsed variables and overall validation success status
    return result;
}

/**
 * Performs comprehensive validation of all environment variables required by the application
 * ensuring they meet constraints and are suitable for application configuration. Validates
 * PORT, HOST, NODE_ENV, and LOG_LEVEL with specific validation rules for each.
 * 
 * @param {Object} environmentVariables - Object containing environment variables to validate
 * @param {Object} validationSchema - Schema defining validation rules for each variable
 * @returns {Object} Comprehensive validation result with success status, field errors, and validation summary
 */
function validateEnvironmentVariables(environmentVariables, validationSchema = {}) {
    // Initialize validation result to track overall validation status
    const validationResult = createValidationResult(true);
    const fieldValidations = {};

    // Default validation schema if none provided
    const defaultSchema = {
        PORT: { type: 'number', validator: validatePortNumber },
        HOST: { type: 'string', validator: validateHostAddress },
        NODE_ENV: { type: 'string', validator: isValidEnvironmentName },
        LOG_LEVEL: { type: 'string', validator: (value) => ['error', 'warn', 'info', 'debug'].includes(value?.toLowerCase()) }
    };

    const schema = { ...defaultSchema, ...validationSchema };

    // Validate PORT environment variable using validatePortNumber function
    if (environmentVariables.PORT !== undefined) {
        const portValidation = validatePortNumber(environmentVariables.PORT);
        fieldValidations.PORT = portValidation;
        if (!portValidation.isValid) {
            validationResult.isValid = false;
            portValidation.errors.forEach(error => validationResult.addError(`PORT: ${error}`));
        }
    }

    // Validate HOST environment variable using validateHostAddress function
    if (environmentVariables.HOST !== undefined) {
        const hostValidation = validateHostAddress(environmentVariables.HOST);
        fieldValidations.HOST = hostValidation;
        if (!hostValidation.isValid) {
            validationResult.isValid = false;
            hostValidation.errors.forEach(error => validationResult.addError(`HOST: ${error}`));
        }
    }

    // Validate NODE_ENV using isValidEnvironmentName function
    if (environmentVariables.NODE_ENV !== undefined) {
        const envValid = isValidEnvironmentName(environmentVariables.NODE_ENV);
        fieldValidations.NODE_ENV = createValidationResult(envValid);
        if (!envValid) {
            validationResult.isValid = false;
            validationResult.addError(`NODE_ENV: Invalid environment "${environmentVariables.NODE_ENV}". Must be one of: ${ENVIRONMENT.VALID_ENVIRONMENTS.join(', ')}`);
        }
    }

    // Validate LOG_LEVEL against supported logging levels
    if (environmentVariables.LOG_LEVEL !== undefined) {
        const validLogLevels = ['error', 'warn', 'info', 'debug'];
        const logLevelValid = validLogLevels.includes(environmentVariables.LOG_LEVEL?.toLowerCase());
        fieldValidations.LOG_LEVEL = createValidationResult(logLevelValid);
        if (!logLevelValid) {
            validationResult.isValid = false;
            validationResult.addError(`LOG_LEVEL: Invalid log level "${environmentVariables.LOG_LEVEL}". Must be one of: ${validLogLevels.join(', ')}`);
        }
    }

    // Check for any additional custom environment variables in schema
    Object.keys(schema).forEach(variableName => {
        if (!fieldValidations[variableName] && environmentVariables[variableName] !== undefined) {
            const schemaRule = schema[variableName];
            if (typeof schemaRule.validator === 'function') {
                const customValidation = schemaRule.validator(environmentVariables[variableName]);
                const isValid = typeof customValidation === 'boolean' ? customValidation : customValidation.isValid;
                fieldValidations[variableName] = createValidationResult(isValid);
                if (!isValid) {
                    validationResult.isValid = false;
                    validationResult.addError(`${variableName}: Custom validation failed`);
                }
            }
        }
    });

    // Aggregate all validation results and determine overall success
    const validationSummary = {
        totalFields: Object.keys(fieldValidations).length,
        validFields: Object.values(fieldValidations).filter(v => v.isValid).length,
        invalidFields: Object.values(fieldValidations).filter(v => !v.isValid).length,
        fieldValidations
    };

    // Create detailed validation report with field-specific errors
    const detailedReport = {
        ...validationResult.toJSON(),
        summary: validationSummary,
        timestamp: new Date().toISOString()
    };

    // Log validation summary using console output for debugging
    console.info(`[INFO] Environment validation completed: ${validationSummary.validFields}/${validationSummary.totalFields} fields valid`);
    if (!validationResult.isValid) {
        console.error(`[ERROR] Environment validation failed with ${validationResult.errors.length} errors`);
    }

    // Return comprehensive validation result with all validation details
    return detailedReport;
}

/**
 * Determines if the current environment is production based on NODE_ENV environment variable
 * with case-insensitive comparison. Uses the ENVIRONMENT.PRODUCTION constant for comparison
 * to ensure consistency across the application.
 * 
 * @returns {boolean} True if NODE_ENV is 'production', false otherwise
 */
function isProductionEnvironment() {
    // Retrieve NODE_ENV environment variable from process.env
    const nodeEnv = process.env.NODE_ENV;
    
    // Handle cases where NODE_ENV is undefined or empty
    if (!nodeEnv) {
        return false;
    }

    // Convert NODE_ENV to lowercase for case-insensitive comparison
    const normalizedEnv = nodeEnv.trim().toLowerCase();

    // Compare against ENVIRONMENT.PRODUCTION constant value
    const isProduction = normalizedEnv === ENVIRONMENT.PRODUCTION.toLowerCase();

    // Return boolean result indicating production environment status
    return isProduction;
}

/**
 * Determines if the current environment is development based on NODE_ENV environment variable
 * with fallback to development as default. Development is considered the default environment
 * when NODE_ENV is undefined or empty.
 * 
 * @returns {boolean} True if NODE_ENV is 'development' or undefined, false otherwise
 */
function isDevelopmentEnvironment() {
    // Retrieve NODE_ENV environment variable from process.env
    const nodeEnv = process.env.NODE_ENV;
    
    // Handle default fallback behavior for development environment
    if (!nodeEnv || !nodeEnv.trim()) {
        return true; // Default to development if NODE_ENV is undefined or empty
    }

    // Convert NODE_ENV to lowercase for case-insensitive comparison
    const normalizedEnv = nodeEnv.trim().toLowerCase();

    // Compare against ENVIRONMENT.DEVELOPMENT constant value
    // Return true if NODE_ENV is development or undefined (default)
    const isDevelopment = normalizedEnv === ENVIRONMENT.DEVELOPMENT.toLowerCase();

    return isDevelopment;
}

/**
 * Determines if the current environment is test based on NODE_ENV environment variable
 * for test-specific configuration and behavior. Uses case-insensitive comparison with
 * the ENVIRONMENT.TEST constant.
 * 
 * @returns {boolean} True if NODE_ENV is 'test', false otherwise
 */
function isTestEnvironment() {
    // Retrieve NODE_ENV environment variable from process.env
    const nodeEnv = process.env.NODE_ENV;
    
    // Handle cases where NODE_ENV is undefined or empty
    if (!nodeEnv) {
        return false;
    }

    // Convert NODE_ENV to lowercase for case-insensitive comparison
    const normalizedEnv = nodeEnv.trim().toLowerCase();

    // Compare against ENVIRONMENT.TEST constant value
    const isTest = normalizedEnv === ENVIRONMENT.TEST.toLowerCase();

    // Return boolean result indicating test environment status
    return isTest;
}

/**
 * Retrieves comprehensive Node.js runtime information including version, platform, architecture,
 * and process details for environment reporting and debugging purposes. Provides detailed
 * system information for logging and diagnostic outputs.
 * 
 * @returns {Object} Object containing Node.js version, platform, architecture, process ID, uptime, and memory usage information
 */
function getNodeJSInfo() {
    // Collect Node.js version information from process.version
    const version = process.version;

    // Get platform information using process.platform
    const platform = process.platform;

    // Retrieve architecture information from process.arch
    const architecture = process.arch;

    // Include process ID using process.pid
    const processId = process.pid;

    // Calculate process uptime using process.uptime()
    const uptime = process.uptime();

    // Get memory usage statistics using process.memoryUsage()
    const memoryUsage = process.memoryUsage();

    // Include V8 JavaScript engine version if available
    const v8Version = process.versions?.v8 || 'Unknown';

    // Return comprehensive runtime information object
    return {
        node: {
            version,
            platform,
            architecture,
            processId,
            uptime: Math.round(uptime),
            v8Version
        },
        memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024) // MB
        },
        versions: process.versions,
        environment: {
            cwd: process.cwd(),
            execPath: process.execPath,
            argv: process.argv
        }
    };
}

/**
 * Generates a comprehensive environment summary including configuration, runtime information,
 * and validation status for logging and debugging purposes. Combines environment configuration
 * with Node.js runtime details for complete environment reporting.
 * 
 * @param {Object} environmentConfig - Current environment configuration object
 * @param {Object} options - Additional options for summary generation
 * @returns {Object} Environment summary object with configuration details, runtime info, and validation status
 */
function createEnvironmentSummary(environmentConfig = {}, options = {}) {
    // Include current environment configuration (PORT, HOST, NODE_ENV)
    const config = {
        PORT: environmentConfig.PORT || process.env.PORT || ENVIRONMENT.DEFAULT_PORT,
        HOST: environmentConfig.HOST || process.env.HOST || ENVIRONMENT.DEFAULT_HOST,
        NODE_ENV: environmentConfig.NODE_ENV || process.env.NODE_ENV || ENVIRONMENT.DEFAULT_NODE_ENV,
        LOG_LEVEL: environmentConfig.LOG_LEVEL || getEnvironmentSpecificLogLevel()
    };

    // Add Node.js runtime information using getNodeJSInfo function
    const runtimeInfo = getNodeJSInfo();

    // Include environment detection results (isProduction, isDevelopment, isTest)
    const environmentDetection = {
        isProduction: isProductionEnvironment(),
        isDevelopment: isDevelopmentEnvironment(),
        isTest: isTestEnvironment(),
        environmentType: getEnvironmentType()
    };

    // Add validation status and any configuration warnings
    const configValidation = validateEnvironmentVariables(config);

    // Include application metadata and version information
    const applicationInfo = {
        name: 'nodejs-tutorial-app',
        version: '1.0.0',
        description: 'Node.js Tutorial Application demonstrating HTTP server fundamentals'
    };

    // Add timestamp and environment summary generation time
    const timestamp = new Date().toISOString();
    const summaryGenerationTime = new Date().toLocaleString();

    // Format summary for logging and debugging output
    const summary = {
        application: applicationInfo,
        timestamp,
        summaryGeneratedAt: summaryGenerationTime,
        configuration: config,
        runtime: runtimeInfo,
        environment: environmentDetection,
        validation: {
            isValid: configValidation.isValid,
            errorCount: configValidation.errors?.length || 0,
            errors: configValidation.errors || []
        },
        options: options || {}
    };

    // Return comprehensive environment summary object
    return summary;
}

/**
 * Determines the current environment type with fallback logic and validation, returning
 * normalized environment name. Uses validation to ensure the environment type is valid
 * and applies appropriate defaults if necessary.
 * 
 * @returns {string} Normalized environment type (development, test, production)
 */
function getEnvironmentType() {
    // Retrieve NODE_ENV from process.env with trimming and normalization
    const nodeEnv = process.env.NODE_ENV?.trim();

    // Validate environment value using isValidEnvironmentName function
    if (nodeEnv && isValidEnvironmentName(nodeEnv)) {
        const normalizedEnv = nodeEnv.toLowerCase();
        
        // Return normalized environment type from ENVIRONMENT constants
        if (normalizedEnv === ENVIRONMENT.PRODUCTION.toLowerCase()) {
            return ENVIRONMENT.PRODUCTION;
        } else if (normalizedEnv === ENVIRONMENT.TEST.toLowerCase()) {
            return ENVIRONMENT.TEST;
        } else if (normalizedEnv === ENVIRONMENT.DEVELOPMENT.toLowerCase()) {
            return ENVIRONMENT.DEVELOPMENT;
        }
    }

    // Apply default environment fallback if NODE_ENV is invalid or missing
    const defaultEnvironment = ENVIRONMENT.DEFAULT_NODE_ENV;
    
    // Log environment type determination using console output for debugging
    if (!nodeEnv) {
        console.info(`[INFO] NODE_ENV not set, defaulting to: ${defaultEnvironment}`);
    } else {
        console.warn(`[WARN] Invalid NODE_ENV "${nodeEnv}", defaulting to: ${defaultEnvironment}`);
    }

    return defaultEnvironment;
}

/**
 * Clears the environment variable cache to force re-parsing of environment variables
 * for runtime configuration updates. Useful for development environments where
 * configuration might change during application runtime.
 * 
 * @returns {void} Clears internal environment cache
 */
function clearEnvironmentCache() {
    // Clear environmentCache Map to remove cached values
    environmentCache.clear();
    
    // Log cache clearing operation using console output for debugging
    console.debug('[DEBUG] Environment variable cache cleared');
    
    // Force re-evaluation of environment variables on next access
    // Note: Next calls to environment functions will re-parse from process.env
}

/**
 * Helper function to get environment-specific log level based on current environment type.
 * Uses the LOGGING constants to provide appropriate log levels for different environments.
 * 
 * @returns {string} Environment-specific log level
 */
function getEnvironmentSpecificLogLevel() {
    if (isProductionEnvironment()) {
        return LOGGING.PRODUCTION_LOG_LEVEL;
    } else if (isTestEnvironment()) {
        return LOGGING.TEST_LOG_LEVEL;
    } else if (isDevelopmentEnvironment()) {
        return LOGGING.DEVELOPMENT_LOG_LEVEL;
    }
    return LOGGING.DEFAULT_LOG_LEVEL;
}

// Export all functions for use throughout the application
module.exports = {
    // Environment variable parsing and validation utilities
    parseEnvironmentVariable,
    validatePortNumber,
    validateHostAddress,
    getEnvironmentVariables,
    validateEnvironmentVariables,
    
    // Environment detection utilities
    isProductionEnvironment,
    isDevelopmentEnvironment,
    isTestEnvironment,
    getEnvironmentType,
    
    // Node.js runtime information and environment reporting
    getNodeJSInfo,
    createEnvironmentSummary,
    
    // Cache management utility
    clearEnvironmentCache
};