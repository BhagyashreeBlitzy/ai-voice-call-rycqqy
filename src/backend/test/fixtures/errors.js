/**
 * Comprehensive Test Fixture Module for Error Handling
 * 
 * This module provides predefined error objects, error categories, and error factory functions
 * for testing all error handling scenarios in the Node.js tutorial application. Contains error
 * fixtures for application errors, HTTP errors, system errors, async errors, validation errors,
 * and configuration errors to support unit testing, integration testing, and end-to-end testing
 * with Node.js built-in test runner.
 * 
 * Demonstrates proper error object creation, error classification patterns, and Express.js 5.1.0
 * enhanced error handling testing for educational purposes in web server development.
 * 
 * Features Express.js 5.1.0 Enhanced Async Error Handling:
 * - Middleware can now return rejected promises, caught by the router as errors
 * - Automatic forwarding of rejected promises to error-handling middleware
 * - Enhanced async/await support for error propagation patterns
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import HTTP status codes and error messages from constants
const { 
    HTTP_STATUS: { BAD_REQUEST, NOT_FOUND, METHOD_NOT_ALLOWED, INTERNAL_SERVER_ERROR },
    ERROR_MESSAGES: { ROUTE_NOT_FOUND, METHOD_NOT_ALLOWED: METHOD_NOT_ALLOWED_MSG, INTERNAL_SERVER_ERROR: INTERNAL_SERVER_ERROR_MSG, BAD_REQUEST: BAD_REQUEST_MSG },
    ENVIRONMENT: { DEFAULT_PORT, DEVELOPMENT, PRODUCTION, TEST },
    ROUTES: { HELLO }
} = require('../../utils/constants.js');

/**
 * Global constants for test error identification and correlation
 */
const ERROR_PREFIX = 'TEST_ERROR';
const DEFAULT_ERROR_STACK = 'Error\n    at test (test/fixtures/errors.js:1:1)';
const TEST_ERROR_TIMESTAMP = new Date().toISOString();
const ERROR_ID_PREFIX = 'err-test-';

/**
 * Factory function that creates application-level error objects with customizable properties,
 * error codes, and context information for testing application logic error handling scenarios.
 * 
 * @param {string} message - Error message describing the application error
 * @param {object} options - Configuration options for error customization
 * @param {string} [options.code] - Application-specific error code
 * @param {string} [options.category] - Error category for classification
 * @param {string} [options.severity] - Error severity level
 * @param {string} [options.component] - Component where error occurred
 * @param {string} [options.operation] - Operation that failed
 * @param {string} [options.correlationId] - Correlation ID for request tracking
 * @returns {Error} Application error object with custom properties for application error testing scenarios
 */
function createApplicationError(message, options = {}) {
    // Create new Error object with provided message parameter
    const error = new Error(message);
    
    // Set error name to 'ApplicationError' for error classification
    error.name = 'ApplicationError';
    
    // Apply custom properties from options object (code, category, severity)
    error.code = options.code || 'APP_ERROR';
    error.category = options.category || 'application';
    error.severity = options.severity || 'medium';
    
    // Add application context including component name and operation details
    error.component = options.component || 'application';
    error.operation = options.operation || 'unknown_operation';
    error.context = {
        timestamp: TEST_ERROR_TIMESTAMP,
        environment: process.env.NODE_ENV || DEVELOPMENT,
        applicationName: 'nodejs-tutorial-app'
    };
    
    // Set error metadata including timestamp and correlation ID
    error.metadata = {
        correlationId: options.correlationId || generateErrorId('app'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        errorPrefix: ERROR_PREFIX
    };
    
    // Configure error stack trace for debugging and analysis
    if (options.stack) {
        error.stack = options.stack;
    }
    
    // Add test-specific markers for error fixture identification
    error.isTestError = true;
    error.fixtureType = 'application';
    
    // Return configured application error object for testing
    return error;
}

/**
 * Factory function that creates HTTP error objects with status codes, HTTP context,
 * and standardized error structure for testing HTTP error handling and response generation.
 * 
 * @param {number} statusCode - HTTP status code for the error response
 * @param {string} message - Error message or default HTTP error message
 * @param {object} context - HTTP context information
 * @param {string} [context.method] - HTTP method that caused the error
 * @param {string} [context.path] - Request path that caused the error
 * @param {object} [context.headers] - Request headers
 * @param {string} [context.userAgent] - Client user agent
 * @returns {Error} HTTP error object with status code and HTTP context for HTTP error testing scenarios
 */
function createHttpError(statusCode, message, context = {}) {
    // Create new Error object with provided message or default HTTP error message
    const errorMessage = message || getDefaultHttpErrorMessage(statusCode);
    const error = new Error(errorMessage);
    
    // Set error name to 'HttpError' for HTTP error classification
    error.name = 'HttpError';
    
    // Assign HTTP status code from statusCode parameter for response handling
    error.statusCode = statusCode;
    error.status = statusCode; // Alias for Express.js compatibility
    
    // Add HTTP context including method, path, and request information
    error.method = context.method || 'GET';
    error.path = context.path || '/unknown';
    error.headers = context.headers || {};
    error.userAgent = context.userAgent || 'test-client';
    
    // Set error metadata including error type and HTTP specifications
    error.metadata = {
        type: 'http_error',
        correlationId: generateErrorId('http'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        httpVersion: '1.1'
    };
    
    // Configure error stack trace with HTTP error context
    error.stack = `HttpError: ${errorMessage}\n    at ${context.method || 'GET'} ${context.path || '/unknown'}`;
    
    // Add HTTP error-specific properties for middleware testing
    error.expose = statusCode < 500; // Expose client errors, hide server errors
    error.isOperational = true; // Mark as operational error for error handling
    error.isTestError = true;
    error.fixtureType = 'http';
    
    // Return configured HTTP error object ready for HTTP error testing
    return error;
}

/**
 * Factory function that creates system-level error objects for testing system failures,
 * resource unavailability, and infrastructure error handling scenarios.
 * 
 * @param {string} errorCode - System-specific error code
 * @param {string} message - System error message
 * @param {object} systemContext - System context information
 * @param {string} [systemContext.resourceType] - Type of system resource
 * @param {string} [systemContext.resourceId] - Identifier for the resource
 * @param {boolean} [systemContext.isAvailable] - Resource availability status
 * @param {string} [systemContext.systemComponent] - System component affected
 * @returns {Error} System error object with system context and error code for system error testing scenarios
 */
function createSystemError(errorCode, message, systemContext = {}) {
    // Create new Error object with provided message parameter
    const error = new Error(message);
    
    // Set error name to 'SystemError' for system error classification
    error.name = 'SystemError';
    
    // Assign system error code from errorCode parameter
    error.code = errorCode;
    error.errno = errorCode; // POSIX-style error number
    
    // Add system context including resource type and availability status
    error.resourceType = systemContext.resourceType || 'system_resource';
    error.resourceId = systemContext.resourceId || 'unknown_resource';
    error.isAvailable = systemContext.isAvailable !== undefined ? systemContext.isAvailable : false;
    error.systemComponent = systemContext.systemComponent || 'core_system';
    
    // Set error metadata including system state and infrastructure details
    error.metadata = {
        type: 'system_error',
        correlationId: generateErrorId('sys'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        systemInfo: {
            platform: process.platform,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage()
        }
    };
    
    // Configure error stack trace with system error context
    error.stack = `SystemError [${errorCode}]: ${message}\n    at system (${systemContext.systemComponent || 'core_system'})`;
    
    // Add system-specific error properties for infrastructure testing
    error.isOperational = false; // System errors are typically not operational
    error.requiresRestart = systemContext.requiresRestart || false;
    error.isTestError = true;
    error.fixtureType = 'system';
    
    // Return configured system error object ready for system error testing
    return error;
}

/**
 * Factory function that creates async operation error objects for testing Express.js 5.1.0
 * enhanced async error handling and promise rejection scenarios.
 * 
 * @param {string} message - Error message for the async operation failure
 * @param {string} asyncOperation - Name of the async operation that failed
 * @param {object} promiseContext - Promise context information
 * @param {string} [promiseContext.promiseState] - State of the promise (pending, fulfilled, rejected)
 * @param {string} [promiseContext.rejectionReason] - Reason for promise rejection
 * @param {boolean} [promiseContext.unhandledRejection] - Whether rejection was unhandled
 * @returns {Error} Async error object with promise context for async error handling testing scenarios
 */
function createAsyncError(message, asyncOperation, promiseContext = {}) {
    // Create new Error object with provided message parameter
    const error = new Error(message);
    
    // Set error name to 'AsyncError' for async error classification
    error.name = 'AsyncError';
    
    // Add async operation context from asyncOperation parameter
    error.asyncOperation = asyncOperation;
    error.operationType = 'promise';
    
    // Set promise context including promise state and rejection details
    error.promiseState = promiseContext.promiseState || 'rejected';
    error.rejectionReason = promiseContext.rejectionReason || 'unhandled_promise_rejection';
    error.unhandledRejection = promiseContext.unhandledRejection !== undefined ? promiseContext.unhandledRejection : true;
    
    // Configure error metadata for Express.js 5.1.0 async handling
    error.metadata = {
        type: 'async_error',
        correlationId: generateErrorId('async'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        expressVersion: '5.1.0',
        asyncFeatures: {
            promiseBasedMiddleware: true,
            automaticErrorForwarding: true,
            enhancedAsyncSupport: true
        }
    };
    
    // Add async-specific error properties for promise testing
    error.isAsync = true;
    error.requiresAsyncHandling = true;
    error.canBeRetried = promiseContext.canBeRetried !== undefined ? promiseContext.canBeRetried : false;
    
    // Set error stack trace with async operation context
    error.stack = `AsyncError: ${message}\n    at async ${asyncOperation}\n    at processAsyncOperation (async_handler.js:1:1)`;
    
    // Add Express.js 5.1.0 specific properties
    error.expressAsyncError = true; // Indicates Express.js async error handling compatibility
    error.isTestError = true;
    error.fixtureType = 'async';
    
    // Return configured async error object ready for async error testing
    return error;
}

/**
 * Factory function that creates validation error objects for testing input validation,
 * request validation, and data validation error handling scenarios.
 * 
 * @param {string} field - Field name that failed validation
 * @param {any} value - Invalid value that caused validation failure
 * @param {string} rule - Validation rule that was violated
 * @param {object} validationContext - Validation context information
 * @param {string} [validationContext.validationType] - Type of validation performed
 * @param {object} [validationContext.constraints] - Validation constraints
 * @param {string} [validationContext.source] - Source of the invalid data
 * @returns {Error} Validation error object with field context for validation error testing scenarios
 */
function createValidationError(field, value, rule, validationContext = {}) {
    // Create new Error object with validation-specific error message
    const message = `Validation failed for field '${field}': ${rule}`;
    const error = new Error(message);
    
    // Set error name to 'ValidationError' for validation error classification
    error.name = 'ValidationError';
    
    // Add field information from field parameter for context
    error.field = field;
    error.invalidValue = value;
    error.violatedRule = rule;
    
    // Set invalid value and validation rule details
    error.validationDetails = {
        field: field,
        value: value,
        rule: rule,
        expected: validationContext.expected || 'valid_value',
        actual: value
    };
    
    // Configure validation context including validation type and constraints
    error.validationType = validationContext.validationType || 'field_validation';
    error.constraints = validationContext.constraints || {};
    error.source = validationContext.source || 'request_body';
    
    // Add validation-specific error properties for input testing
    error.metadata = {
        type: 'validation_error',
        correlationId: generateErrorId('val'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        validationContext: {
            validationType: error.validationType,
            source: error.source,
            fieldCount: 1
        }
    };
    
    // Set error stack trace with validation context
    error.stack = `ValidationError: ${message}\n    at validateField (${field})\n    at requestValidator (validation.js:1:1)`;
    
    // Add validation error properties
    error.isValidationError = true;
    error.canBeCorrected = true;
    error.isTestError = true;
    error.fixtureType = 'validation';
    
    // Return configured validation error object ready for validation testing
    return error;
}

/**
 * Factory function that creates configuration error objects for testing environment configuration,
 * server setup, and configuration validation error scenarios.
 * 
 * @param {string} configKey - Configuration key that has invalid value
 * @param {string} expectedType - Expected data type for the configuration
 * @param {any} actualValue - Actual invalid value found
 * @param {object} configContext - Configuration context information
 * @param {string} [configContext.environment] - Environment where error occurred
 * @param {object} [configContext.defaults] - Default configuration values
 * @param {string} [configContext.configSource] - Source of configuration (env, file, etc.)
 * @returns {Error} Configuration error object with configuration context for configuration error testing scenarios
 */
function createConfigurationError(configKey, expectedType, actualValue, configContext = {}) {
    // Create new Error object with configuration-specific error message
    const message = `Configuration error for '${configKey}': expected ${expectedType}, got ${typeof actualValue}`;
    const error = new Error(message);
    
    // Set error name to 'ConfigurationError' for configuration error classification
    error.name = 'ConfigurationError';
    
    // Add configuration key and expected type information
    error.configKey = configKey;
    error.expectedType = expectedType;
    error.actualValue = actualValue;
    error.actualType = typeof actualValue;
    
    // Set actual value and configuration validation details
    error.configurationDetails = {
        key: configKey,
        expectedType: expectedType,
        actualType: typeof actualValue,
        actualValue: actualValue,
        isValid: false
    };
    
    // Configure configuration context including environment and defaults
    error.environment = configContext.environment || process.env.NODE_ENV || DEVELOPMENT;
    error.defaults = configContext.defaults || {};
    error.configSource = configContext.configSource || 'environment_variables';
    
    // Add configuration-specific error properties for setup testing
    error.metadata = {
        type: 'configuration_error',
        correlationId: generateErrorId('config'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        configurationInfo: {
            environment: error.environment,
            configSource: error.configSource,
            hasDefaults: Object.keys(error.defaults).length > 0
        }
    };
    
    // Set error stack trace with configuration context
    error.stack = `ConfigurationError: ${message}\n    at loadConfiguration (${configKey})\n    at configurationManager (config.js:1:1)`;
    
    // Add configuration error properties
    error.isConfigurationError = true;
    error.canUseDefaults = Object.keys(error.defaults).length > 0;
    error.requiresManualIntervention = configContext.requiresManualIntervention !== undefined ? configContext.requiresManualIntervention : true;
    error.isTestError = true;
    error.fixtureType = 'configuration';
    
    // Return configured configuration error object ready for configuration testing
    return error;
}

/**
 * Generic factory function for creating custom error objects with flexible properties
 * and context for specialized error handling testing scenarios.
 * 
 * @param {string} name - Custom error name for classification
 * @param {string} message - Error message
 * @param {object} properties - Custom properties to apply to the error object
 * @returns {Error} Custom error object with specified properties for flexible error testing scenarios
 */
function createCustomError(name, message, properties = {}) {
    // Create new Error object with provided message parameter
    const error = new Error(message);
    
    // Set error name from name parameter for custom error classification
    error.name = name;
    
    // Apply all properties from properties object to error instance
    Object.keys(properties).forEach(key => {
        error[key] = properties[key];
    });
    
    // Add custom error metadata including creation timestamp
    error.metadata = {
        type: 'custom_error',
        correlationId: generateErrorId('custom'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        customProperties: Object.keys(properties)
    };
    
    // Configure error stack trace with custom error context
    if (!error.stack) {
        error.stack = `${name}: ${message}\n    at createCustomError (errors.js:1:1)`;
    }
    
    // Set test-specific markers for custom error identification
    error.isTestError = true;
    error.fixtureType = 'custom';
    
    // Add extensibility support for specialized error scenarios
    error.isCustomError = true;
    error.customErrorType = name;
    
    // Return configured custom error object ready for specialized testing
    return error;
}

/**
 * Generates unique error identifiers for test correlation, debugging, and error tracking
 * across test scenarios and execution cycles.
 * 
 * @param {string} prefix - Prefix for the error identifier
 * @returns {string} Unique error identifier for error tracking and test correlation
 */
function generateErrorId(prefix = '') {
    // Use provided prefix or default ERROR_ID_PREFIX constant
    const errorPrefix = prefix ? `${ERROR_ID_PREFIX}${prefix}-` : ERROR_ID_PREFIX;
    
    // Generate timestamp-based unique identifier component
    const timestamp = Date.now();
    
    // Add random component for uniqueness guarantee across parallel tests
    const random = Math.random().toString(36).substring(2, 8);
    
    // Format identifier for readability and parsing in test output
    const identifier = `${errorPrefix}${timestamp}-${random}`;
    
    // Ensure identifier meets error correlation requirements
    // Return complete unique error identifier string for test tracking
    return identifier;
}

/**
 * Creates error objects with customized stack traces for testing stack trace processing,
 * error source identification, and debugging information handling.
 * 
 * @param {string} message - Error message
 * @param {string} stackTrace - Custom stack trace string
 * @param {object} options - Additional options for error customization
 * @param {string} [options.name] - Error name
 * @param {string} [options.fileName] - Source file name
 * @param {number} [options.lineNumber] - Line number where error occurred
 * @returns {Error} Error object with custom stack trace for stack trace testing scenarios
 */
function createErrorWithStack(message, stackTrace, options = {}) {
    // Create new Error object with provided message parameter
    const error = new Error(message);
    
    // Set custom stack trace from stackTrace parameter
    error.stack = stackTrace;
    
    // Configure error source information and file locations
    if (options.name) {
        error.name = options.name;
    }
    if (options.fileName) {
        error.fileName = options.fileName;
    }
    if (options.lineNumber) {
        error.lineNumber = options.lineNumber;
    }
    
    // Add stack trace metadata for debugging and analysis
    error.metadata = {
        type: 'custom_stack_error',
        correlationId: generateErrorId('stack'),
        timestamp: TEST_ERROR_TIMESTAMP,
        testFixture: true,
        hasCustomStack: true
    };
    
    // Apply options for stack trace customization and formatting
    Object.keys(options).forEach(key => {
        if (!error.hasOwnProperty(key)) {
            error[key] = options[key];
        }
    });
    
    // Set error properties for stack trace processing testing
    error.isTestError = true;
    error.fixtureType = 'stack_trace';
    error.hasCustomStackTrace = true;
    
    // Return configured error object with custom stack trace for testing
    return error;
}

/**
 * Validates error objects for proper structure, required properties, and error handling
 * compatibility to ensure test fixture quality and error validation.
 * 
 * @param {Error} errorObject - Error object to validate
 * @returns {object} Validation result with status and detailed validation information for error quality assurance
 */
function validateErrorObject(errorObject) {
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        properties: {},
        compatibility: {}
    };
    
    // Validate error object has required properties (name, message, stack)
    if (!errorObject) {
        validationResult.isValid = false;
        validationResult.errors.push('Error object is null or undefined');
        return validationResult;
    }
    
    // Check error object inherits from Error prototype correctly
    if (!(errorObject instanceof Error)) {
        validationResult.isValid = false;
        validationResult.errors.push('Object does not inherit from Error prototype');
    }
    
    // Validate error object has required properties
    const requiredProperties = ['name', 'message', 'stack'];
    requiredProperties.forEach(prop => {
        if (!errorObject.hasOwnProperty(prop) || errorObject[prop] === undefined) {
            validationResult.isValid = false;
            validationResult.errors.push(`Missing required property: ${prop}`);
        } else {
            validationResult.properties[prop] = typeof errorObject[prop];
        }
    });
    
    // Validate error properties are properly typed and formatted
    if (errorObject.message && typeof errorObject.message !== 'string') {
        validationResult.warnings.push('Error message should be a string');
    }
    
    if (errorObject.stack && typeof errorObject.stack !== 'string') {
        validationResult.warnings.push('Error stack should be a string');
    }
    
    // Check error context and metadata completeness
    if (errorObject.metadata) {
        validationResult.properties.hasMetadata = true;
        if (!errorObject.metadata.correlationId) {
            validationResult.warnings.push('Missing correlation ID in metadata');
        }
        if (!errorObject.metadata.timestamp) {
            validationResult.warnings.push('Missing timestamp in metadata');
        }
    }
    
    // Verify error object can be properly serialized for logging
    try {
        JSON.stringify(errorObject, null, 2);
        validationResult.compatibility.serializable = true;
    } catch (serializationError) {
        validationResult.warnings.push('Error object contains non-serializable properties');
        validationResult.compatibility.serializable = false;
    }
    
    // Validate error classification and categorization properties
    if (errorObject.isTestError) {
        validationResult.properties.isTestFixture = true;
    }
    
    if (errorObject.fixtureType) {
        validationResult.properties.fixtureType = errorObject.fixtureType;
    }
    
    // Check error object compatibility with error handling middleware
    validationResult.compatibility.expressCompatible = !!(
        errorObject.message && 
        errorObject.stack && 
        (errorObject.statusCode || errorObject.status || true)
    );
    
    // Return comprehensive validation result object with detailed feedback
    return validationResult;
}

/**
 * Helper function to get default HTTP error messages based on status codes
 */
function getDefaultHttpErrorMessage(statusCode) {
    switch (statusCode) {
        case BAD_REQUEST:
            return BAD_REQUEST_MSG;
        case NOT_FOUND:
            return ROUTE_NOT_FOUND;
        case METHOD_NOT_ALLOWED:
            return METHOD_NOT_ALLOWED_MSG;
        case INTERNAL_SERVER_ERROR:
            return INTERNAL_SERVER_ERROR_MSG;
        default:
            return `HTTP Error ${statusCode}`;
    }
}

// ========================================
// PREDEFINED ERROR OBJECT COLLECTIONS
// ========================================

/**
 * Collection of application-level error objects for testing application logic error handling scenarios
 */
const applicationErrors = {
    /**
     * Handler exception error for testing route handler failures
     */
    handlerException: createApplicationError('Route handler encountered an exception during processing', {
        code: 'HANDLER_EXCEPTION',
        category: 'handler',
        severity: 'high',
        component: 'route_handler',
        operation: 'process_request',
        correlationId: generateErrorId('handler')
    }),
    
    /**
     * Business logic error for testing application logic failures
     */
    businessLogicError: createApplicationError('Business logic validation failed', {
        code: 'BUSINESS_LOGIC_ERROR',
        category: 'business_logic',
        severity: 'medium',
        component: 'business_layer',
        operation: 'validate_business_rules',
        correlationId: generateErrorId('business')
    }),
    
    /**
     * Processing error for testing general processing failures
     */
    processingError: createApplicationError('Request processing failed due to internal error', {
        code: 'PROCESSING_ERROR',
        category: 'processing',
        severity: 'high',
        component: 'request_processor',
        operation: 'process_request',
        correlationId: generateErrorId('processing')
    }),
    
    /**
     * Service unavailable error for testing service dependency failures
     */
    serviceUnavailable: createApplicationError('Required service is temporarily unavailable', {
        code: 'SERVICE_UNAVAILABLE',
        category: 'service_dependency',
        severity: 'critical',
        component: 'service_manager',
        operation: 'check_service_availability',
        correlationId: generateErrorId('service')
    })
};

/**
 * Collection of HTTP error objects for testing HTTP error handling and response generation scenarios
 */
const httpErrors = {
    /**
     * 404 Not Found error for testing route not found scenarios
     */
    notFound: createHttpError(NOT_FOUND, ROUTE_NOT_FOUND, {
        method: 'GET',
        path: '/nonexistent',
        headers: { 'user-agent': 'test-client' },
        userAgent: 'nodejs-tutorial-test'
    }),
    
    /**
     * 405 Method Not Allowed error for testing invalid HTTP method scenarios
     */
    methodNotAllowed: createHttpError(METHOD_NOT_ALLOWED, METHOD_NOT_ALLOWED_MSG, {
        method: 'POST',
        path: HELLO,
        headers: { 'content-type': 'application/json' },
        userAgent: 'nodejs-tutorial-test'
    }),
    
    /**
     * 500 Internal Server Error for testing server error scenarios
     */
    internalServerError: createHttpError(INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR_MSG, {
        method: 'GET',
        path: HELLO,
        headers: { 'accept': 'text/html' },
        userAgent: 'nodejs-tutorial-test'
    }),
    
    /**
     * 400 Bad Request error for testing malformed request scenarios
     */
    badRequest: createHttpError(BAD_REQUEST, BAD_REQUEST_MSG, {
        method: 'GET',
        path: '/hello?invalid=param%',
        headers: { 'content-length': 'invalid' },
        userAgent: 'nodejs-tutorial-test'
    })
};

/**
 * Collection of system-level error objects for testing system failure and infrastructure error handling scenarios
 */
const systemErrors = {
    /**
     * Resource unavailable error for testing system resource failures
     */
    resourceUnavailable: createSystemError('ENOENT', 'System resource not available', {
        resourceType: 'file_system',
        resourceId: '/tmp/app.log',
        isAvailable: false,
        systemComponent: 'file_manager'
    }),
    
    /**
     * System failure error for testing critical system failures
     */
    systemFailure: createSystemError('ESYSTEM', 'Critical system component failure', {
        resourceType: 'system_service',
        resourceId: 'core_service',
        isAvailable: false,
        systemComponent: 'system_manager',
        requiresRestart: true
    }),
    
    /**
     * Infrastructure error for testing network and infrastructure failures
     */
    infrastructureError: createSystemError('EINFRA', 'Infrastructure component unavailable', {
        resourceType: 'network_interface',
        resourceId: 'eth0',
        isAvailable: false,
        systemComponent: 'network_manager'
    }),
    
    /**
     * Network error for testing network connectivity failures
     */
    networkError: createSystemError('ENETWORK', 'Network connectivity error', {
        resourceType: 'network_connection',
        resourceId: 'localhost:3000',
        isAvailable: false,
        systemComponent: 'connection_manager'
    })
};

/**
 * Collection of async operation error objects for testing Express.js 5.1.0 enhanced async error handling capabilities
 */
const asyncErrors = {
    /**
     * Promise rejection error for testing unhandled promise rejections
     */
    promiseRejection: createAsyncError('Unhandled promise rejection in async middleware', 'async_middleware', {
        promiseState: 'rejected',
        rejectionReason: 'unhandled_promise_rejection',
        unhandledRejection: true,
        canBeRetried: false
    }),
    
    /**
     * Async handler error for testing async route handler failures
     */
    asyncHandlerError: createAsyncError('Async route handler threw an exception', 'async_route_handler', {
        promiseState: 'rejected',
        rejectionReason: 'handler_exception',
        unhandledRejection: false,
        canBeRetried: true
    }),
    
    /**
     * Await error for testing async/await pattern failures
     */
    awaitError: createAsyncError('Async operation failed during await', 'await_operation', {
        promiseState: 'rejected',
        rejectionReason: 'async_operation_failed',
        unhandledRejection: false,
        canBeRetried: true
    }),
    
    /**
     * Promise timeout error for testing async operation timeouts
     */
    promiseTimeoutError: createAsyncError('Promise operation timed out', 'promise_timeout', {
        promiseState: 'pending',
        rejectionReason: 'operation_timeout',
        unhandledRejection: true,
        canBeRetried: true
    })
};

/**
 * Collection of validation error objects for testing input validation and data validation error handling scenarios
 */
const validationErrors = {
    /**
     * Required field missing error for testing required field validation
     */
    requiredFieldMissing: createValidationError('username', undefined, 'required field is missing', {
        validationType: 'required_field',
        constraints: { required: true },
        source: 'request_body',
        expected: 'non-empty string'
    }),
    
    /**
     * Invalid format error for testing format validation failures
     */
    invalidFormat: createValidationError('email', 'invalid-email', 'invalid email format', {
        validationType: 'format_validation',
        constraints: { format: 'email' },
        source: 'request_body',
        expected: 'valid email address'
    }),
    
    /**
     * Out of range error for testing numeric range validation
     */
    outOfRange: createValidationError('port', 99999, 'value out of valid range', {
        validationType: 'range_validation',
        constraints: { min: 1, max: 65535 },
        source: 'environment_variable',
        expected: 'integer between 1 and 65535'
    }),
    
    /**
     * Type validation error for testing data type validation
     */
    typeValidationError: createValidationError('timeout', 'not_a_number', 'invalid data type', {
        validationType: 'type_validation',
        constraints: { type: 'number' },
        source: 'configuration',
        expected: 'numeric value'
    })
};

/**
 * Collection of configuration error objects for testing environment configuration and server setup error scenarios
 */
const configurationErrors = {
    /**
     * Port binding failure error for testing port configuration issues
     */
    portBindingFailure: createConfigurationError('PORT', 'number', 'invalid_port', {
        environment: DEVELOPMENT,
        defaults: { PORT: DEFAULT_PORT },
        configSource: 'environment_variables',
        requiresManualIntervention: false
    }),
    
    /**
     * Environment variable error for testing missing environment configuration
     */
    environmentVariableError: createConfigurationError('NODE_ENV', 'string', null, {
        environment: 'undefined',
        defaults: { NODE_ENV: DEVELOPMENT },
        configSource: 'environment_variables',
        requiresManualIntervention: false
    }),
    
    /**
     * Configuration missing error for testing missing configuration values
     */
    configurationMissing: createConfigurationError('APP_SECRET', 'string', undefined, {
        environment: PRODUCTION,
        defaults: {},
        configSource: 'environment_variables',
        requiresManualIntervention: true
    }),
    
    /**
     * Invalid configuration error for testing configuration validation failures
     */
    invalidConfiguration: createConfigurationError('LOG_LEVEL', 'string', 'invalid_level', {
        environment: TEST,
        defaults: { LOG_LEVEL: 'info' },
        configSource: 'configuration_file',
        requiresManualIntervention: false
    })
};

/**
 * Collection of route-specific error objects for testing route handling and endpoint error scenarios
 */
const routeErrors = {
    /**
     * Hello endpoint error for testing specific endpoint failures
     */
    helloEndpointError: createApplicationError('Hello endpoint processing failed', {
        code: 'HELLO_ENDPOINT_ERROR',
        category: 'endpoint',
        severity: 'medium',
        component: 'hello_handler',
        operation: 'generate_hello_response',
        correlationId: generateErrorId('hello')
    }),
    
    /**
     * Route not found error for testing missing route scenarios
     */
    routeNotFoundError: createHttpError(NOT_FOUND, 'Requested route does not exist', {
        method: 'GET',
        path: '/missing-route',
        headers: { 'accept': 'application/json' },
        userAgent: 'nodejs-tutorial-test'
    }),
    
    /**
     * Route handler error for testing route handler exceptions
     */
    routeHandlerError: createApplicationError('Route handler execution failed', {
        code: 'ROUTE_HANDLER_ERROR',
        category: 'handler',
        severity: 'high',
        component: 'route_processor',
        operation: 'execute_handler',
        correlationId: generateErrorId('route')
    }),
    
    /**
     * Middleware error for testing middleware processing failures
     */
    middlewareError: createApplicationError('Middleware processing encountered an error', {
        code: 'MIDDLEWARE_ERROR',
        category: 'middleware',
        severity: 'medium',
        component: 'express_middleware',
        operation: 'process_middleware',
        correlationId: generateErrorId('middleware')
    })
};

/**
 * Collection of edge case error objects for testing boundary conditions and robustness scenarios
 */
const edgeCaseErrors = {
    /**
     * Null error for testing null value handling
     */
    nullError: createCustomError('NullError', 'Null value encountered in critical operation', {
        value: null,
        expectedType: 'object',
        operation: 'null_handling',
        isCritical: true
    }),
    
    /**
     * Undefined error for testing undefined value handling
     */
    undefinedError: createCustomError('UndefinedError', 'Undefined value encountered', {
        value: undefined,
        expectedType: 'defined',
        operation: 'undefined_handling',
        isCritical: false
    }),
    
    /**
     * Circular reference error for testing circular reference scenarios
     */
    circularReferenceError: createCustomError('CircularReferenceError', 'Circular reference detected in object', {
        objectType: 'test_object',
        referenceChain: ['obj', 'obj.child', 'obj.child.parent'],
        operation: 'object_serialization',
        isCritical: true
    }),
    
    /**
     * Memory exhaustion error for testing memory limit scenarios
     */
    memoryExhaustionError: createSystemError('ENOMEM', 'Insufficient memory for operation', {
        resourceType: 'memory',
        resourceId: 'heap_memory',
        isAvailable: false,
        systemComponent: 'memory_manager',
        requiresRestart: true
    })
};

// ========================================
// MODULE EXPORTS
// ========================================

module.exports = {
    // Error object collections
    applicationErrors,
    httpErrors,
    systemErrors,
    asyncErrors,
    validationErrors,
    configurationErrors,
    routeErrors,
    edgeCaseErrors,
    
    // Factory functions
    createApplicationError,
    createHttpError,
    createSystemError,
    createAsyncError,
    createValidationError,
    createConfigurationError,
    createCustomError,
    
    // Utility functions
    generateErrorId,
    createErrorWithStack,
    validateErrorObject
};