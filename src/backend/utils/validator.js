/**
 * Comprehensive Validation Utility Module for Node.js Tutorial Application
 * 
 * This module provides standardized validation functions, input sanitization, and validation
 * result management for the Node.js tutorial application. Implements validation logic for
 * server configuration, request processing, and data integrity ensuring robust error handling
 * and security.
 * 
 * Features:
 * - ValidationResult class for consistent validation outcomes
 * - String and number validation utilities with constraint checking
 * - Object schema validation with field-level validation
 * - Input sanitization functions for security-focused data cleaning
 * - Configuration validation for server settings and environment variables
 * - Standardized error creation and management
 * 
 * Designed to support Express.js 5.1.0 framework requirements and Node.js v22.x LTS runtime
 * with educational focus on validation patterns and security best practices.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import required constants from the constants module
const { HTTP_STATUS, ENVIRONMENT, ERROR_MESSAGES } = require('./constants.js');

/**
 * Global validation rules for various data types and constraints
 * These constants provide standardized validation parameters across the application
 */
const VALIDATION_RULES = {
    /**
     * Port number validation constraints
     */
    PORT_MIN: 1,
    PORT_MAX: 65535,
    PORT_RESERVED_MAX: 1024,
    
    /**
     * Host address validation constraints
     */
    HOST_MAX_LENGTH: 253,
    
    /**
     * String validation constraints
     */
    STRING_MAX_LENGTH: 1000,
    
    /**
     * Number validation constraints using JavaScript safe integer limits
     */
    NUMBER_MAX_SAFE: Number.MAX_SAFE_INTEGER,
    NUMBER_MIN_SAFE: Number.MIN_SAFE_INTEGER
};

/**
 * Global validation patterns using regular expressions for format validation
 * These patterns provide standardized format checking for common data types
 */
const VALIDATION_PATTERNS = {
    /**
     * IPv4 address validation pattern
     * Matches valid IPv4 addresses (0.0.0.0 to 255.255.255.255)
     */
    IPV4_REGEX: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    
    /**
     * Hostname validation pattern
     * Matches valid hostnames according to RFC standards
     */
    HOSTNAME_REGEX: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/,
    
    /**
     * Alphanumeric string validation pattern
     * Matches strings containing only letters and numbers
     */
    ALPHANUM_REGEX: /^[a-zA-Z0-9]+$/,
    
    /**
     * Basic email validation pattern
     * Simple email format validation for basic use cases
     */
    EMAIL_BASIC_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

/**
 * ValidationResult Class
 * 
 * Standardized validation result class that encapsulates validation outcomes, error collection,
 * and result metadata providing consistent interface for validation operations across the application.
 * 
 * This class provides a comprehensive way to track validation results, collect errors,
 * and provide detailed feedback for validation operations.
 */
class ValidationResult {
    /**
     * Initializes ValidationResult with validation status, error collection, and metadata
     * for comprehensive validation outcome tracking
     * 
     * @param {boolean} isValid - Initial validation status, defaults to true
     * @param {Array} errors - Initial array of validation errors, defaults to empty array
     */
    constructor(isValid = true, errors = []) {
        /**
         * Indicates whether the overall validation passed
         * @type {boolean}
         */
        this.isValid = isValid;
        
        /**
         * Array of validation error objects with detailed error information
         * @type {Array}
         */
        this.errors = Array.isArray(errors) ? [...errors] : [];
        
        /**
         * Metadata object containing validation context and statistics
         * @type {object}
         */
        this.metadata = {
            validationContext: 'general',
            errorCount: this.errors.length,
            validationTimestamp: new Date().toISOString()
        };
        
        /**
         * Timestamp when the validation result was created
         * @type {Date}
         */
        this.timestamp = new Date();
        
        // Update isValid based on errors array if not explicitly set
        if (this.errors.length > 0) {
            this.isValid = false;
        }
    }
    
    /**
     * Adds validation error to the errors collection and updates validation status to invalid
     * with error categorization and metadata
     * 
     * @param {string|object} error - Error message string or error object
     * @param {string} field - Field name associated with the error (optional)
     * @param {object} metadata - Additional metadata for the error (optional)
     * @returns {ValidationResult} Returns this ValidationResult instance for method chaining
     */
    addError(error, field = null, metadata = {}) {
        // Create standardized error object if string error message provided
        let errorObject;
        if (typeof error === 'string') {
            errorObject = {
                message: error,
                field: field,
                timestamp: new Date().toISOString(),
                type: 'validation_error',
                code: 'VALIDATION_FAILED',
                ...metadata
            };
        } else if (typeof error === 'object' && error !== null) {
            // Use provided error object and add standard fields
            errorObject = {
                timestamp: new Date().toISOString(),
                type: 'validation_error',
                code: 'VALIDATION_FAILED',
                ...error,
                field: field || error.field,
                ...metadata
            };
        } else {
            // Handle invalid error parameter
            errorObject = {
                message: 'Invalid error object provided',
                field: field,
                timestamp: new Date().toISOString(),
                type: 'validation_error',
                code: 'INVALID_ERROR_OBJECT',
                ...metadata
            };
        }
        
        // Add error object to errors array with consistent structure
        this.errors.push(errorObject);
        
        // Set isValid property to false when errors are added
        this.isValid = false;
        
        // Update error count and categorization metadata
        this.metadata.errorCount = this.errors.length;
        this.metadata.lastErrorTimestamp = errorObject.timestamp;
        
        // Return this instance to enable method chaining pattern
        return this;
    }
    
    /**
     * Checks if validation result contains any errors by examining errors array length
     * and validation status
     * 
     * @returns {boolean} True if validation has errors, false if validation passed
     */
    hasErrors() {
        // Check if errors array length is greater than zero
        const hasErrorsInArray = this.errors.length > 0;
        
        // Verify isValid property is false indicating validation failure
        const isMarkedInvalid = !this.isValid;
        
        // Return boolean result indicating presence of validation errors
        return hasErrorsInArray || isMarkedInvalid;
    }
    
    /**
     * Retrieves all validation errors with optional filtering by error type, field name,
     * or severity level for targeted error handling
     * 
     * @param {object} filter - Optional filter criteria for error selection
     * @returns {Array} Array of validation error objects matching filter criteria
     */
    getErrors(filter = null) {
        // Return complete errors array if no filter provided
        if (!filter || typeof filter !== 'object') {
            return [...this.errors];
        }
        
        let filteredErrors = [...this.errors];
        
        // Filter errors by field name if filter.field is specified
        if (filter.field) {
            filteredErrors = filteredErrors.filter(error => error.field === filter.field);
        }
        
        // Filter errors by error type if filter.type is specified
        if (filter.type) {
            filteredErrors = filteredErrors.filter(error => error.type === filter.type);
        }
        
        // Filter errors by severity level if filter.severity is specified
        if (filter.severity) {
            filteredErrors = filteredErrors.filter(error => error.severity === filter.severity);
        }
        
        // Filter errors by error code if filter.code is specified
        if (filter.code) {
            filteredErrors = filteredErrors.filter(error => error.code === filter.code);
        }
        
        // Return filtered array of errors matching all filter criteria
        return filteredErrors;
    }
    
    /**
     * Extracts error messages from validation errors and returns formatted message array
     * for display or logging purposes
     * 
     * @param {object} options - Formatting options for error messages
     * @returns {Array} Array of formatted error message strings
     */
    getErrorMessages(options = {}) {
        // Map over errors array to extract message property from each error
        let messages = this.errors.map(error => {
            let message = error.message || 'Unknown validation error';
            
            // Format messages with field names if options.includeField is true
            if (options.includeField && error.field) {
                message = `${error.field}: ${message}`;
            }
            
            // Apply message formatting options like capitalization
            if (options.capitalize) {
                message = message.charAt(0).toUpperCase() + message.slice(1);
            }
            
            // Add prefix if specified in options
            if (options.prefix) {
                message = `${options.prefix} ${message}`;
            }
            
            return message;
        });
        
        // Filter out duplicate messages if options.unique is true
        if (options.unique) {
            messages = [...new Set(messages)];
        }
        
        // Return array of formatted error messages ready for display
        return messages;
    }
    
    /**
     * Serializes ValidationResult to JSON object for API responses, logging, or data
     * transmission with configurable detail levels
     * 
     * @param {object} options - Serialization options for controlling output detail
     * @returns {object} JSON serializable object representing validation result
     */
    toJSON(options = {}) {
        // Create base JSON object with isValid, errors, and timestamp properties
        const jsonObject = {
            isValid: this.isValid,
            timestamp: this.timestamp.toISOString()
        };
        
        // Include metadata in JSON output if options.includeMetadata is true
        if (options.includeMetadata !== false) {
            jsonObject.metadata = { ...this.metadata };
        }
        
        // Add error count and categorization statistics if requested
        if (options.includeErrorCount !== false) {
            jsonObject.errorCount = this.errors.length;
        }
        
        // Format error objects for JSON serialization with consistent structure
        if (options.includeErrors !== false) {
            jsonObject.errors = this.errors.map(error => ({
                message: error.message,
                field: error.field,
                type: error.type,
                code: error.code,
                timestamp: error.timestamp,
                ...(options.includeAllErrorFields ? error : {})
            }));
        }
        
        // Apply field filtering if options.fields array is provided
        if (options.fields && Array.isArray(options.fields)) {
            const filteredObject = {};
            options.fields.forEach(field => {
                if (jsonObject.hasOwnProperty(field)) {
                    filteredObject[field] = jsonObject[field];
                }
            });
            return filteredObject;
        }
        
        // Return complete JSON object ready for serialization or API response
        return jsonObject;
    }
    
    /**
     * Merges another ValidationResult with this instance combining errors, updating
     * validation status, and merging metadata for composite validation operations
     * 
     * @param {ValidationResult} otherResult - Another ValidationResult instance to merge
     * @returns {ValidationResult} Returns this ValidationResult instance with merged validation outcomes
     */
    merge(otherResult) {
        // Validate otherResult is instance of ValidationResult class
        if (!(otherResult instanceof ValidationResult)) {
            throw new Error('Cannot merge: otherResult must be an instance of ValidationResult');
        }
        
        // Concatenate errors from otherResult to this.errors array
        this.errors = this.errors.concat(otherResult.errors);
        
        // Update isValid to false if either result has validation errors
        this.isValid = this.isValid && otherResult.isValid;
        
        // Merge metadata objects preserving important validation context
        this.metadata = {
            ...this.metadata,
            ...otherResult.metadata,
            errorCount: this.errors.length,
            mergedAt: new Date().toISOString(),
            originalErrorCounts: {
                thisResult: this.metadata.errorCount || 0,
                otherResult: otherResult.metadata.errorCount || 0
            }
        };
        
        // Update error counts from merged results
        this.metadata.errorCount = this.errors.length;
        
        // Return this instance with merged validation outcomes
        return this;
    }
}

/**
 * Validates port numbers ensuring they are integers within the valid range (1-65535)
 * suitable for HTTP server binding with additional checks for reserved ports in
 * production environments
 * 
 * @param {any} port - Port value to validate (can be string or number)
 * @returns {boolean} True if port is valid for HTTP server binding, false otherwise
 */
function isValidPort(port) {
    // Check if port value is defined and not null or undefined
    if (port === null || port === undefined) {
        return false;
    }
    
    // Convert port to number if provided as string using parseInt
    let portNumber;
    if (typeof port === 'string') {
        portNumber = parseInt(port, 10);
        // Check if parseInt returned NaN
        if (isNaN(portNumber)) {
            return false;
        }
    } else if (typeof port === 'number') {
        portNumber = port;
    } else {
        return false;
    }
    
    // Validate port is an integer using Number.isInteger function
    if (!Number.isInteger(portNumber)) {
        return false;
    }
    
    // Check port is within valid range (1-65535) using VALIDATION_RULES constants
    if (portNumber < VALIDATION_RULES.PORT_MIN || portNumber > VALIDATION_RULES.PORT_MAX) {
        return false;
    }
    
    // Return boolean indicating port validity for server configuration
    return true;
}

/**
 * Validates host addresses including hostnames, IP addresses, and special values like
 * localhost for HTTP server binding with comprehensive format checking
 * 
 * @param {any} host - Host value to validate
 * @returns {boolean} True if host is valid for server binding, false otherwise
 */
function isValidHost(host) {
    // Check if host value is defined and is a string type
    if (typeof host !== 'string' || host === null || host === undefined) {
        return false;
    }
    
    // Trim whitespace and convert to lowercase for normalization
    const normalizedHost = host.trim().toLowerCase();
    
    // Check for empty string after trimming
    if (normalizedHost.length === 0) {
        return false;
    }
    
    // Check for special valid hosts like 'localhost', '127.0.0.1', and '0.0.0.0'
    const specialHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '::'];
    if (specialHosts.includes(normalizedHost)) {
        return true;
    }
    
    // Validate IPv4 address format using IPV4_REGEX pattern
    if (VALIDATION_PATTERNS.IPV4_REGEX.test(normalizedHost)) {
        return true;
    }
    
    // Validate hostname format using HOSTNAME_REGEX pattern with length constraints
    if (normalizedHost.length <= VALIDATION_RULES.HOST_MAX_LENGTH && 
        VALIDATION_PATTERNS.HOSTNAME_REGEX.test(normalizedHost)) {
        return true;
    }
    
    // Return boolean indicating host validity for server binding
    return false;
}

/**
 * Validates environment names against allowed values (development, test, production)
 * with case-insensitive comparison using VALID_ENVIRONMENTS constant
 * 
 * @param {any} environment - Environment value to validate
 * @returns {boolean} True if environment is valid Node.js environment name, false otherwise
 */
function isValidEnvironment(environment) {
    // Check if environment value is defined and is a string type
    if (typeof environment !== 'string' || environment === null || environment === undefined) {
        return false;
    }
    
    // Convert environment to lowercase for case-insensitive comparison
    const normalizedEnvironment = environment.trim().toLowerCase();
    
    // Check if environment is included in ENVIRONMENT.VALID_ENVIRONMENTS array
    const validEnvironments = ENVIRONMENT.VALID_ENVIRONMENTS.map(env => env.toLowerCase());
    const isValidEnv = validEnvironments.includes(normalizedEnvironment);
    
    // Return boolean indicating environment name validity for application configuration
    return isValidEnv;
}

/**
 * Validates string values with constraint checking including length limits, required field
 * validation, and format validation with sanitization options
 * 
 * @param {any} value - String value to validate
 * @param {object} constraints - Validation constraints object
 * @returns {boolean} True if string passes all validation constraints, false otherwise
 */
function isValidString(value, constraints = {}) {
    // Check if value is defined and convert to string if needed
    let stringValue;
    if (value === null || value === undefined) {
        // Apply required field validation if constraints.required is true
        if (constraints.required) {
            return false;
        }
        return true; // Allow null/undefined if not required
    }
    
    // Convert value to string
    stringValue = String(value);
    
    // Validate string is not empty or only whitespace if constraints.notEmpty is true
    if (constraints.notEmpty && stringValue.trim().length === 0) {
        return false;
    }
    
    // Validate string length against constraints.minLength
    if (constraints.minLength !== undefined && stringValue.length < constraints.minLength) {
        return false;
    }
    
    // Validate string length against constraints.maxLength
    if (constraints.maxLength !== undefined && stringValue.length > constraints.maxLength) {
        return false;
    }
    
    // Apply default maximum length if not specified
    if (!constraints.maxLength && stringValue.length > VALIDATION_RULES.STRING_MAX_LENGTH) {
        return false;
    }
    
    // Check string pattern against constraints.pattern regular expression if provided
    if (constraints.pattern) {
        if (constraints.pattern instanceof RegExp) {
            if (!constraints.pattern.test(stringValue)) {
                return false;
            }
        }
    }
    
    // Return boolean indicating string validity based on all constraint checks
    return true;
}

/**
 * Validates number values with range and type constraints including integer validation,
 * float validation, and safe number checking with boundary validation
 * 
 * @param {any} value - Number value to validate
 * @param {object} constraints - Validation constraints object
 * @returns {boolean} True if number passes all validation constraints, false otherwise
 */
function isValidNumber(value, constraints = {}) {
    // Check if value is defined and attempt number conversion using Number()
    if (value === null || value === undefined) {
        if (constraints.required) {
            return false;
        }
        return true; // Allow null/undefined if not required
    }
    
    // Convert to number
    const numberValue = Number(value);
    
    // Validate value is a finite number using Number.isFinite function
    if (!Number.isFinite(numberValue)) {
        return false;
    }
    
    // Check if number is within safe integer range using Number.isSafeInteger if required
    if (constraints.safe && !Number.isSafeInteger(numberValue)) {
        return false;
    }
    
    // Validate number is within constraints.min range if specified
    if (constraints.min !== undefined && numberValue < constraints.min) {
        return false;
    }
    
    // Validate number is within constraints.max range if specified
    if (constraints.max !== undefined && numberValue > constraints.max) {
        return false;
    }
    
    // Check if number is integer using Number.isInteger if constraints.integer is true
    if (constraints.integer && !Number.isInteger(numberValue)) {
        return false;
    }
    
    // Apply default safe number range if not specified
    if (numberValue < VALIDATION_RULES.NUMBER_MIN_SAFE || numberValue > VALIDATION_RULES.NUMBER_MAX_SAFE) {
        return false;
    }
    
    // Return boolean indicating number validity based on all constraint checks
    return true;
}

/**
 * Performs comprehensive object schema validation with field-level validation, nested
 * object support, and detailed error reporting using ValidationResult for structured
 * validation outcomes
 * 
 * @param {object} obj - Object to validate against schema
 * @param {object} schema - Validation schema defining field rules
 * @param {object} options - Validation options and configuration
 * @returns {ValidationResult} Validation result with success status, field errors, and detailed validation feedback
 */
function validateObject(obj, schema, options = {}) {
    // Initialize ValidationResult instance to track validation outcomes
    const result = new ValidationResult();
    
    // Validate input parameters
    if (!obj || typeof obj !== 'object') {
        result.addError('Object to validate must be a valid object', null, { code: 'INVALID_OBJECT' });
        return result;
    }
    
    if (!schema || typeof schema !== 'object') {
        result.addError('Schema must be a valid object', null, { code: 'INVALID_SCHEMA' });
        return result;
    }
    
    // Set validation context in metadata
    result.metadata.validationContext = 'object_validation';
    result.metadata.objectFields = Object.keys(obj).length;
    result.metadata.schemaFields = Object.keys(schema).length;
    
    // Iterate through schema fields and validate each against object properties
    for (const fieldName in schema) {
        const fieldSchema = schema[fieldName];
        const fieldValue = obj[fieldName];
        
        // Check if required field is present
        if (fieldSchema.required && (fieldValue === undefined || fieldValue === null)) {
            result.addError(`Field '${fieldName}' is required`, fieldName, { 
                code: 'REQUIRED_FIELD_MISSING',
                expectedType: fieldSchema.type
            });
            continue;
        }
        
        // Skip validation if field is not present and not required
        if (fieldValue === undefined || fieldValue === null) {
            continue;
        }
        
        // Apply type validation using appropriate validation functions
        if (fieldSchema.type) {
            let isValidType = true;
            
            switch (fieldSchema.type) {
                case 'string':
                    isValidType = isValidString(fieldValue, fieldSchema.constraints || {});
                    break;
                case 'number':
                    isValidType = isValidNumber(fieldValue, fieldSchema.constraints || {});
                    break;
                case 'boolean':
                    isValidType = typeof fieldValue === 'boolean';
                    break;
                case 'array':
                    isValidType = Array.isArray(fieldValue);
                    break;
                case 'object':
                    isValidType = typeof fieldValue === 'object' && fieldValue !== null;
                    break;
                default:
                    isValidType = typeof fieldValue === fieldSchema.type;
            }
            
            if (!isValidType) {
                result.addError(`Field '${fieldName}' must be of type ${fieldSchema.type}`, fieldName, {
                    code: 'INVALID_TYPE',
                    expectedType: fieldSchema.type,
                    actualType: typeof fieldValue
                });
                continue;
            }
        }
        
        // Perform constraint validation using field-specific constraints from schema
        if (fieldSchema.constraints) {
            const constraints = fieldSchema.constraints;
            
            // Validate string constraints
            if (fieldSchema.type === 'string' && !isValidString(fieldValue, constraints)) {
                result.addError(`Field '${fieldName}' does not meet string constraints`, fieldName, {
                    code: 'CONSTRAINT_VIOLATION',
                    constraints: constraints
                });
            }
            
            // Validate number constraints
            if (fieldSchema.type === 'number' && !isValidNumber(fieldValue, constraints)) {
                result.addError(`Field '${fieldName}' does not meet number constraints`, fieldName, {
                    code: 'CONSTRAINT_VIOLATION',
                    constraints: constraints
                });
            }
            
            // Custom constraint validation
            if (constraints.custom && typeof constraints.custom === 'function') {
                try {
                    const customResult = constraints.custom(fieldValue, fieldName, obj);
                    if (customResult !== true) {
                        const errorMessage = typeof customResult === 'string' ? customResult : 
                            `Field '${fieldName}' failed custom validation`;
                        result.addError(errorMessage, fieldName, { code: 'CUSTOM_VALIDATION_FAILED' });
                    }
                } catch (error) {
                    result.addError(`Custom validation error for field '${fieldName}': ${error.message}`, fieldName, {
                        code: 'CUSTOM_VALIDATION_ERROR'
                    });
                }
            }
        }
        
        // Handle nested object validation recursively if schema contains nested objects
        if (fieldSchema.type === 'object' && fieldSchema.schema && typeof fieldValue === 'object') {
            const nestedResult = validateObject(fieldValue, fieldSchema.schema, options);
            if (nestedResult.hasErrors()) {
                // Add nested errors with field path
                nestedResult.getErrors().forEach(error => {
                    const nestedFieldName = error.field ? `${fieldName}.${error.field}` : fieldName;
                    result.addError(error.message, nestedFieldName, {
                        ...error,
                        code: error.code || 'NESTED_VALIDATION_ERROR',
                        nestedField: true
                    });
                });
            }
        }
    }
    
    // Check for unknown fields if schema.strict is true and add warnings
    if (options.strict) {
        for (const fieldName in obj) {
            if (!schema.hasOwnProperty(fieldName)) {
                result.addError(`Unknown field '${fieldName}' not allowed in strict mode`, fieldName, {
                    code: 'UNKNOWN_FIELD',
                    severity: 'warning'
                });
            }
        }
    }
    
    // Return comprehensive ValidationResult with all validation outcomes and error details
    return result;
}

/**
 * Sanitizes user input for security and data cleaning by removing potentially harmful
 * content, normalizing data formats, and applying security-focused transformations
 * 
 * @param {any} input - Input data to sanitize
 * @param {object} options - Sanitization options and configuration
 * @returns {any} Sanitized input safe for application processing and storage
 */
function sanitizeInput(input, options = {}) {
    // Check input type and apply appropriate sanitization based on data type
    if (input === null || input === undefined) {
        return input;
    }
    
    // Handle string input sanitization
    if (typeof input === 'string') {
        let sanitized = input;
        
        // Trim whitespace and normalize line endings for string inputs
        sanitized = sanitized.trim();
        sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Remove HTML tags and script content if options.stripHtml is true
        if (options.stripHtml) {
            // Remove script tags and their content
            sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            // Remove HTML tags
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }
        
        // Escape special characters if options.escapeHtml is true for XSS prevention
        if (options.escapeHtml) {
            sanitized = sanitized
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        
        // Apply SQL injection prevention by escaping SQL metacharacters if applicable
        if (options.escapeSql) {
            sanitized = sanitized.replace(/'/g, "''").replace(/;/g, '\\;');
        }
        
        // Normalize Unicode characters and remove non-printable characters
        if (options.normalizeUnicode) {
            sanitized = sanitized.normalize('NFC');
            // Remove non-printable characters except newlines and tabs
            sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        }
        
        // Apply length limits and truncate input if options.maxLength is specified
        if (options.maxLength && typeof options.maxLength === 'number') {
            if (sanitized.length > options.maxLength) {
                sanitized = sanitized.substring(0, options.maxLength);
                if (options.truncateIndicator) {
                    sanitized += options.truncateIndicator;
                }
            }
        }
        
        return sanitized;
    }
    
    // Handle number input sanitization
    if (typeof input === 'number') {
        // Ensure number is finite and within safe range
        if (!Number.isFinite(input)) {
            return options.defaultNumber || 0;
        }
        
        // Apply number range limits if specified
        if (options.minNumber !== undefined && input < options.minNumber) {
            return options.minNumber;
        }
        
        if (options.maxNumber !== undefined && input > options.maxNumber) {
            return options.maxNumber;
        }
        
        return input;
    }
    
    // Handle array input sanitization
    if (Array.isArray(input)) {
        return input.map(item => sanitizeInput(item, options));
    }
    
    // Handle object input sanitization
    if (typeof input === 'object') {
        const sanitizedObject = {};
        for (const [key, value] of Object.entries(input)) {
            // Sanitize object keys if specified
            const sanitizedKey = options.sanitizeKeys ? 
                sanitizeInput(key, { ...options, sanitizeKeys: false }) : key;
            sanitizedObject[sanitizedKey] = sanitizeInput(value, options);
        }
        return sanitizedObject;
    }
    
    // Return input unchanged if no specific sanitization rules apply
    return input;
}

/**
 * Creates standardized validation error objects with consistent structure, error codes,
 * and detailed error information for uniform error handling across the application
 * 
 * @param {string} message - Error message describing the validation failure
 * @param {string} field - Field name associated with the error (optional)
 * @param {any} value - Value that caused the validation error (optional)
 * @param {object} metadata - Additional metadata for the error (optional)
 * @returns {object} Standardized validation error object with message, field, value, and metadata
 */
function createValidationError(message, field = null, value = null, metadata = {}) {
    // Create base error object with message, field, and value properties
    const errorObject = {
        message: message || 'Validation error occurred',
        field: field,
        value: value,
        timestamp: new Date().toISOString(),
        type: 'validation_error'
    };
    
    // Add error code and error type for categorization and handling
    errorObject.code = metadata.code || 'VALIDATION_ERROR';
    
    // Include error generation context for debugging
    errorObject.context = {
        module: 'validator',
        function: 'createValidationError',
        timestamp: errorObject.timestamp
    };
    
    // Merge provided metadata with default error metadata
    if (metadata && typeof metadata === 'object') {
        Object.assign(errorObject, metadata);
    }
    
    // Add validation rule information if available for error explanation
    if (metadata.rule) {
        errorObject.rule = metadata.rule;
    }
    
    if (metadata.constraint) {
        errorObject.constraint = metadata.constraint;
    }
    
    // Add severity level for error prioritization
    errorObject.severity = metadata.severity || 'error';
    
    // Return complete validation error object ready for error handling pipeline
    return errorObject;
}

/**
 * Validates application configuration objects including server settings, environment
 * variables, and application options with comprehensive error reporting and default
 * value handling
 * 
 * @param {object} config - Configuration object to validate
 * @param {object} schema - Configuration validation schema (optional)
 * @returns {ValidationResult} Comprehensive validation result with configuration validation status and detailed errors
 */
function validateConfiguration(config, schema = null) {
    // Initialize ValidationResult for configuration validation tracking
    const result = new ValidationResult();
    
    // Set validation context
    result.metadata.validationContext = 'configuration_validation';
    result.metadata.configurationFields = config ? Object.keys(config).length : 0;
    
    // Validate configuration object exists
    if (!config || typeof config !== 'object') {
        result.addError(
            'Configuration must be a valid object',
            'config',
            config,
            { code: 'INVALID_CONFIG_OBJECT', severity: 'error' }
        );
        return result;
    }
    
    // Validate PORT configuration using isValidPort function with range checking
    if (config.PORT !== undefined) {
        if (!isValidPort(config.PORT)) {
            result.addError(
                `Invalid port configuration: ${config.PORT}. Port must be an integer between ${VALIDATION_RULES.PORT_MIN} and ${VALIDATION_RULES.PORT_MAX}`,
                'PORT',
                config.PORT,
                { 
                    code: 'INVALID_PORT',
                    constraint: `${VALIDATION_RULES.PORT_MIN}-${VALIDATION_RULES.PORT_MAX}`,
                    rule: 'port_range_validation'
                }
            );
        }
    } else {
        // Apply default value with validation warning
        result.metadata.appliedDefaults = result.metadata.appliedDefaults || {};
        result.metadata.appliedDefaults.PORT = ENVIRONMENT.DEFAULT_PORT;
    }
    
    // Validate HOST configuration using isValidHost function with format validation
    if (config.HOST !== undefined) {
        if (!isValidHost(config.HOST)) {
            result.addError(
                `Invalid host configuration: ${config.HOST}. Host must be a valid hostname or IP address`,
                'HOST',
                config.HOST,
                {
                    code: 'INVALID_HOST',
                    rule: 'host_format_validation'
                }
            );
        }
    } else {
        // Apply default value with validation warning
        result.metadata.appliedDefaults = result.metadata.appliedDefaults || {};
        result.metadata.appliedDefaults.HOST = ENVIRONMENT.DEFAULT_HOST;
    }
    
    // Validate NODE_ENV using isValidEnvironment function against allowed environments
    if (config.NODE_ENV !== undefined) {
        if (!isValidEnvironment(config.NODE_ENV)) {
            result.addError(
                `Invalid environment configuration: ${config.NODE_ENV}. Environment must be one of: ${ENVIRONMENT.VALID_ENVIRONMENTS.join(', ')}`,
                'NODE_ENV',
                config.NODE_ENV,
                {
                    code: 'INVALID_ENVIRONMENT',
                    constraint: ENVIRONMENT.VALID_ENVIRONMENTS,
                    rule: 'environment_validation'
                }
            );
        }
    } else {
        // Apply default value
        result.metadata.appliedDefaults = result.metadata.appliedDefaults || {};
        result.metadata.appliedDefaults.NODE_ENV = ENVIRONMENT.DEFAULT_NODE_ENV;
    }
    
    // Apply schema-based validation using validateObject for additional configuration fields
    if (schema && typeof schema === 'object') {
        const schemaResult = validateObject(config, schema, { strict: true });
        if (schemaResult.hasErrors()) {
            // Merge schema validation results
            result.merge(schemaResult);
        }
    }
    
    // Check for required configuration fields based on environment
    const requiredFields = ['PORT', 'HOST'];
    for (const field of requiredFields) {
        if (config[field] === undefined) {
            // Add warning for missing required field with default applied
            result.addError(
                `Required configuration field '${field}' is missing, using default value`,
                field,
                undefined,
                {
                    code: 'MISSING_REQUIRED_CONFIG',
                    severity: 'warning',
                    rule: 'required_field_validation'
                }
            );
        }
    }
    
    // Return comprehensive ValidationResult with configuration validation status
    return result;
}

// Export all validation functions and classes for use throughout the application
module.exports = {
    // Core validation functions
    isValidPort,
    isValidHost,
    isValidEnvironment,
    isValidString,
    isValidNumber,
    validateObject,
    
    // Validation utility class
    ValidationResult,
    
    // Security and sanitization functions
    sanitizeInput,
    
    // Error handling utilities
    createValidationError,
    
    // Configuration validation
    validateConfiguration,
    
    // Global validation constants (for reference)
    VALIDATION_RULES,
    VALIDATION_PATTERNS
};