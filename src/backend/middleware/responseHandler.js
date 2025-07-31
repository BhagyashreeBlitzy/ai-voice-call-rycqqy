/**
 * Response Formatting Utility Module for Node.js Tutorial Application
 * 
 * This module provides standardized HTTP response formatting functions for the Node.js tutorial
 * application. Implements comprehensive response structure standardization including success
 * responses, error responses, metadata enrichment, and environment-specific formatting.
 * 
 * Serves as a central utility for controllers to ensure consistent API response formats while
 * supporting Express.js 5.1.0 framework requirements and Node.js v22.x LTS runtime optimizations.
 * Provides educational examples of response handling patterns and API design best practices.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import logger factory for response handler logging and response formatting tracking
const { getLogger } = require('../utils/logger.js');

// Import HTTP status code constants for standardized response status handling and consistent API responses
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import standardized error message constants for consistent error response formatting across the application
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import application metadata constants for response metadata enrichment and API versioning information
const { 
    APPLICATION 
} = require('../utils/constants.js');

// Import standard response message constants for consistent API response content formatting
const { 
    RESPONSES 
} = require('../utils/constants.js');

// Import environment detection utility for development-specific response formatting and debugging information inclusion
const { 
    isDevelopmentEnvironment 
} = require('../utils/environment.js');

// Import production environment detection utility for production-specific response formatting and information sanitization
const { 
    isProductionEnvironment 
} = require('../utils/environment.js');

// Import test environment detection utility for test-specific response formatting and validation metadata
const { 
    isTestEnvironment 
} = require('../utils/environment.js');

// Initialize component-specific logger for response handler operations and debugging
const logger = getLogger('responseHandler');

// Utility name constant for consistent identification across logging and metadata
const UTILITY_NAME = 'ResponseHandler';

// Utility version constant for version tracking and debugging purposes
const UTILITY_VERSION = '1.0.0';

// Default success status constant for consistent successful response handling
const DEFAULT_SUCCESS_STATUS = HTTP_STATUS.OK;

// Default error status constant for fallback error response handling
const DEFAULT_ERROR_STATUS = HTTP_STATUS.INTERNAL_SERVER_ERROR;

/**
 * Formats successful HTTP responses with standardized structure including data, status code,
 * metadata, and environment-specific enhancements for consistent API response formatting
 * across controllers.
 * 
 * @param {any} data - Response data payload to include in the formatted response
 * @param {number} statusCode - HTTP status code for the successful response (defaults to 200)
 * @param {Object} metadata - Additional metadata to include in the response
 * @param {Object} req - Express.js request object for context extraction
 * @returns {Object} Formatted success response object with standardized structure, metadata, and environment-specific information
 */
function formatSuccessResponse(data = null, statusCode = DEFAULT_SUCCESS_STATUS, metadata = {}, req = null) {
    try {
        // Validate input parameters and apply default values for missing parameters
        logger.debug('Formatting success response', { 
            hasData: data !== null, 
            statusCode, 
            hasMetadata: Object.keys(metadata).length > 0,
            hasRequest: req !== null 
        });

        // Validate and sanitize status code parameter
        const validatedStatusCode = validateStatusCode(statusCode, DEFAULT_SUCCESS_STATUS);
        
        // Create base success response object with standard structure and properties  
        const baseResponse = {
            success: true,
            status: validatedStatusCode,
            timestamp: new Date().toISOString()
        };

        // Set response data from provided data parameter or use default success content
        if (data !== null && data !== undefined) {
            baseResponse.data = data;
        } else {
            // Use default hello world response if no data provided
            baseResponse.data = RESPONSES.HELLO_WORLD;
        }

        // Add standardized metadata including timestamp, request correlation ID, and application version
        const responseMetadata = createResponseMetadata(req, metadata);
        baseResponse.metadata = responseMetadata;

        // Include environment-specific metadata and debugging information if in development mode
        if (isDevelopmentEnvironment()) {
            baseResponse.debug = {
                environment: 'development',
                requestProcessingTime: extractProcessingTime(req),
                memoryUsage: process.memoryUsage(),
                responseGeneratedAt: new Date().toISOString()
            };
        }

        // Add request context information including method, path, and processing time if available
        if (req) {
            const requestContext = extractRequestContext(req);
            baseResponse.request = {
                method: requestContext.method,
                path: requestContext.path,
                correlationId: requestContext.correlationId
            };
        }

        // Apply response metadata enrichment with application information and API version
        baseResponse.application = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            apiVersion: APPLICATION.API_VERSION
        };

        // Log successful response formatting with status code and response size for monitoring
        logResponseFormatting('success', validatedStatusCode, responseMetadata, {
            dataSize: JSON.stringify(baseResponse).length,
            hasCustomMetadata: Object.keys(metadata).length > 0
        });

        // Return standardized success response object ready for Express.js JSON serialization
        return baseResponse;

    } catch (error) {
        // Handle formatting errors gracefully with fallback response
        logger.error('Error formatting success response', { 
            error: error.message, 
            stack: error.stack,
            originalData: data,
            statusCode
        });

        // Return minimal success response if formatting fails
        return {
            success: true,
            status: DEFAULT_SUCCESS_STATUS,
            data: data || RESPONSES.HELLO_WORLD,
            timestamp: new Date().toISOString(),
            error: {
                message: 'Response formatting error occurred',
                details: isDevelopmentEnvironment() ? error.message : undefined
            }
        };
    }
}

/**
 * Formats error HTTP responses with standardized structure including error message, status code,
 * error details, and environment-specific debugging information for consistent error handling
 * across controllers.
 * 
 * @param {Object} error - Error object containing message, stack trace, and error type
 * @param {Object} req - Express.js request object for context extraction
 * @param {number} statusCode - HTTP status code for the error response
 * @param {Object} options - Additional options for error response formatting
 * @returns {Object} Formatted error response object with standardized error structure, metadata, and environment-appropriate information
 */
function formatErrorResponse(error = {}, req = null, statusCode = DEFAULT_ERROR_STATUS, options = {}) {
    try {
        // Extract error information including message, stack trace, and error type from error object
        logger.debug('Formatting error response', { 
            errorType: error.constructor?.name || 'Unknown',
            statusCode,
            hasRequest: req !== null,
            hasOptions: Object.keys(options).length > 0
        });

        // Determine appropriate HTTP status code from error object, parameter, or default error status
        const validatedStatusCode = determineErrorStatusCode(error, statusCode);
        
        // Create base error response object with standard error structure and properties
        const baseErrorResponse = {
            success: false,
            status: validatedStatusCode,
            timestamp: new Date().toISOString()
        };

        // Sanitize error message to prevent sensitive information disclosure in production
        const sanitizedMessage = sanitizeErrorMessage(
            error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
            isDevelopmentEnvironment(),
            options
        );

        baseErrorResponse.error = {
            message: sanitizedMessage,
            type: error.name || 'UnknownError',
            code: error.code || 'UNKNOWN_ERROR'
        };

        // Add error metadata including error type, timestamp, and correlation ID for tracking
        const errorMetadata = createResponseMetadata(req, {
            errorType: error.constructor?.name,
            errorCode: error.code,
            originalMessage: error.message,
            ...options.metadata
        });
        baseErrorResponse.metadata = errorMetadata;

        // Include stack trace and detailed debugging information in development environment only
        if (isDevelopmentEnvironment()) {
            baseErrorResponse.debug = {
                environment: 'development',
                stack: error.stack,
                originalError: {
                    name: error.name,
                    message: error.message,
                    code: error.code
                },
                requestContext: req ? extractRequestContext(req) : null,
                processInfo: {
                    memoryUsage: process.memoryUsage(),
                    uptime: process.uptime()
                }
            };
        }

        // Add request context information for error tracking and debugging purposes
        if (req) {
            const requestContext = extractRequestContext(req);
            baseErrorResponse.request = {
                method: requestContext.method,
                path: requestContext.path,
                correlationId: requestContext.correlationId,
                userAgent: requestContext.headers?.['user-agent']
            };
        }

        // Apply error classification and categorization for consistent error handling
        baseErrorResponse.classification = classifyError(error, validatedStatusCode);

        // Include application metadata and API version information in error response
        baseErrorResponse.application = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            apiVersion: APPLICATION.API_VERSION
        };

        // Log error response formatting with error type and status code for monitoring
        logResponseFormatting('error', validatedStatusCode, errorMetadata, {
            errorType: error.constructor?.name || 'Unknown',
            errorMessage: sanitizedMessage,
            hasStackTrace: isDevelopmentEnvironment() && Boolean(error.stack)
        });

        // Return standardized error response object ready for Express.js JSON serialization
        return baseErrorResponse;

    } catch (formattingError) {
        // Handle formatting errors gracefully with minimal error response
        logger.error('Error formatting error response', {
            formattingError: formattingError.message,
            originalError: error.message,
            statusCode
        });

        // Return minimal error response if formatting fails
        return {
            success: false,
            status: DEFAULT_ERROR_STATUS,
            timestamp: new Date().toISOString(),
            error: {
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                type: 'FormattingError',
                code: 'RESPONSE_FORMATTING_ERROR'
            },
            metadata: {
                correlationId: generateCorrelationId(),
                application: APPLICATION.NAME
            }
        };
    }
}

/**
 * Creates standardized response metadata object with timestamp, correlation ID, request
 * information, and application context for consistent metadata enrichment across all responses.
 * 
 * @param {Object} req - Express.js request object for context extraction
 * @param {Object} options - Additional options for metadata customization
 * @returns {Object} Response metadata object with timestamp, correlation ID, application info, and request context
 */
function createResponseMetadata(req = null, options = {}) {
    try {
        // Generate timestamp using ISO string format for consistent time representation
        const timestamp = new Date().toISOString();
        
        // Create or extract request correlation ID for request tracking and distributed tracing
        const correlationId = extractCorrelationId(req) || generateCorrelationId();

        // Add application metadata including name, version, and API version from constants
        const applicationMetadata = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            apiVersion: APPLICATION.API_VERSION,
            description: APPLICATION.DESCRIPTION || 'Node.js Tutorial Application'
        };

        // Include request context information such as method, path, and user agent if available
        const requestMetadata = req ? {
            method: req.method,
            path: req.path || req.url,
            userAgent: req.get('User-Agent'),
            contentType: req.get('Content-Type'),
            acceptHeader: req.get('Accept')
        } : {};

        // Add environment-specific metadata based on current environment detection
        const environmentMetadata = getEnvironmentSpecificOptions();

        // Include processing timing information and performance metrics if available
        const performanceMetadata = {
            processingTime: extractProcessingTime(req),
            memoryUsage: isTestEnvironment() ? process.memoryUsage() : undefined,
            nodeVersion: process.version,
            platform: process.platform
        };

        // Merge provided options with default metadata for customization support
        const baseMetadata = {
            timestamp,
            correlationId,
            application: applicationMetadata,
            request: requestMetadata,
            environment: environmentMetadata,
            performance: performanceMetadata,
            utility: {
                name: UTILITY_NAME,
                version: UTILITY_VERSION
            }
        };

        // Apply custom options and merge with base metadata
        const completeMetadata = {
            ...baseMetadata,
            ...options,
            // Ensure critical metadata cannot be overridden
            timestamp: baseMetadata.timestamp,
            correlationId: baseMetadata.correlationId
        };

        // Return complete metadata object ready for response enrichment
        return completeMetadata;

    } catch (error) {
        // Handle metadata creation errors gracefully
        logger.error('Error creating response metadata', { 
            error: error.message,
            hasRequest: req !== null
        });

        // Return minimal metadata if creation fails
        return {
            timestamp: new Date().toISOString(),
            correlationId: generateCorrelationId(),
            application: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION
            },
            error: 'Metadata creation failed'
        };
    }
}

/**
 * Sanitizes error messages to prevent sensitive information disclosure while maintaining
 * useful debugging information for development and educational purposes, with environment-specific
 * sanitization levels.
 * 
 * @param {string} errorMessage - Original error message to sanitize
 * @param {boolean} isDevelopment - Whether current environment is development
 * @param {Object} options - Additional sanitization options
 * @returns {string} Sanitized error message safe for client response while maintaining educational and debugging value
 */
function sanitizeErrorMessage(errorMessage, isDevelopment = false, options = {}) {
    try {
        // Check current environment to determine appropriate sanitization level
        const isDevEnvironment = isDevelopment || isDevelopmentEnvironment();
        
        // Return original error message in development environment for debugging purposes
        if (isDevEnvironment && !options.forceSanitize) {
            logger.debug('Returning unsanitized error message for development environment');
            return errorMessage || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
        }

        // Handle null or undefined error messages with appropriate default messages
        if (!errorMessage || typeof errorMessage !== 'string') {
            return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
        }

        let sanitizedMessage = errorMessage;

        // Remove file paths, database connection strings, and internal system paths
        sanitizedMessage = sanitizedMessage.replace(/\/[^\s]*\.(js|ts|json|env)/gi, '[FILE_PATH]');
        sanitizedMessage = sanitizedMessage.replace(/mongodb:\/\/[^\s]*/gi, '[DATABASE_URL]');
        sanitizedMessage = sanitizedMessage.replace(/mysql:\/\/[^\s]*/gi, '[DATABASE_URL]');
        sanitizedMessage = sanitizedMessage.replace(/postgres:\/\/[^\s]*/gi, '[DATABASE_URL]');

        // Replace internal error codes and technical details with user-friendly messages
        sanitizedMessage = sanitizedMessage.replace(/ENOENT/gi, 'Resource not found');
        sanitizedMessage = sanitizedMessage.replace(/ECONNREFUSED/gi, 'Connection refused');
        sanitizedMessage = sanitizedMessage.replace(/ETIMEDOUT/gi, 'Request timeout');

        // Preserve educational error information that provides learning value
        const educationalPhrases = [
            'validation failed',
            'required field',
            'invalid format',
            'not found',
            'unauthorized',
            'forbidden'
        ];

        let hasEducationalValue = educationalPhrases.some(phrase => 
            sanitizedMessage.toLowerCase().includes(phrase)
        );

        // Apply generic error message fallbacks for production environment if needed
        if (isProductionEnvironment() && !hasEducationalValue) {
            // Map to generic user-friendly messages
            if (sanitizedMessage.toLowerCase().includes('error')) {
                sanitizedMessage = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
            }
        }

        // Return sanitized error message appropriate for client consumption and security
        logger.debug('Error message sanitized', { 
            originalLength: errorMessage.length,
            sanitizedLength: sanitizedMessage.length,
            hasEducationalValue
        });

        return sanitizedMessage;

    } catch (sanitizationError) {
        // Handle sanitization errors gracefully
        logger.error('Error during message sanitization', { 
            error: sanitizationError.message,
            originalMessage: errorMessage
        });

        // Return safe fallback message if sanitization fails
        return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    }
}

/**
 * Extracts relevant request context information from Express.js request object for response
 * metadata enrichment including headers, timing, and client information.
 * 
 * @param {Object} req - Express.js request object
 * @returns {Object} Request context object with method, path, headers, client info, and timing data
 */
function extractRequestContext(req) {
    try {
        // Handle null or undefined request object
        if (!req || typeof req !== 'object') {
            logger.debug('No request object provided for context extraction');
            return {
                method: 'UNKNOWN',
                path: 'UNKNOWN',
                correlationId: generateCorrelationId()
            };
        }

        // Extract HTTP method, path, and query parameters from Express.js request object
        const method = req.method || 'UNKNOWN';
        const path = req.path || req.url || '/';
        const query = req.query || {};
        const params = req.params || {};

        // Collect relevant headers including user-agent, content-type, and accept headers
        const relevantHeaders = {
            'user-agent': req.get('User-Agent'),
            'content-type': req.get('Content-Type'),
            'accept': req.get('Accept'),
            'accept-language': req.get('Accept-Language'),
            'authorization': req.get('Authorization') ? '[REDACTED]' : undefined,
            'x-forwarded-for': req.get('X-Forwarded-For'),
            'x-real-ip': req.get('X-Real-IP')
        };

        // Filter out undefined headers
        const filteredHeaders = Object.fromEntries(
            Object.entries(relevantHeaders).filter(([key, value]) => value !== undefined)
        );

        // Extract client information including IP address and connection details
        const clientInfo = {
            ip: req.ip || req.connection?.remoteAddress || 'unknown',
            ips: req.ips || [],
            protocol: req.protocol || 'http',
            secure: req.secure || false,
            hostname: req.hostname || req.get('Host') || 'unknown'
        };

        // Calculate request processing time if start time is available in request object
        const processingTime = extractProcessingTime(req);

        // Include request correlation ID or generate new ID for tracking purposes
        const correlationId = extractCorrelationId(req) || generateCorrelationId();

        // Add route information and matched parameters if available from Express.js routing
        const routeInfo = {
            originalUrl: req.originalUrl,
            baseUrl: req.baseUrl,
            route: req.route ? {
                path: req.route.path,
                methods: req.route.methods
            } : undefined
        };

        // Filter sensitive information from headers and parameters for security
        const safeQuery = filterSensitiveData(query);
        const safeParams = filterSensitiveData(params);

        // Return request context object ready for response metadata inclusion
        const requestContext = {
            method,
            path,
            query: safeQuery,
            params: safeParams,
            headers: filteredHeaders,
            client: clientInfo,
            route: routeInfo,
            processingTime,
            correlationId,
            timestamp: new Date().toISOString()
        };

        logger.debug('Request context extracted', {
            method,
            path,
            hasHeaders: Object.keys(filteredHeaders).length > 0,
            processingTime,
            correlationId
        });

        return requestContext;

    } catch (error) {
        // Handle context extraction errors gracefully
        logger.error('Error extracting request context', { 
            error: error.message,
            hasRequest: req !== null
        });

        // Return minimal context if extraction fails
        return {
            method: req?.method || 'UNKNOWN',
            path: req?.path || req?.url || 'UNKNOWN',
            correlationId: generateCorrelationId(),
            error: 'Context extraction failed'
        };
    }
}

/**
 * Adds standard HTTP response headers to Express.js response object for consistent header
 * management including security headers, content type, and API versioning headers.
 * 
 * @param {Object} res - Express.js response object
 * @param {Object} options - Additional header options and configuration
 * @returns {void} Modifies Express.js response object by adding standard headers for consistent API responses
 */
function addResponseHeaders(res, options = {}) {
    try {
        // Validate response object parameter
        if (!res || typeof res.set !== 'function') {
            logger.error('Invalid response object provided to addResponseHeaders');
            return;
        }

        logger.debug('Adding standard response headers', { 
            hasOptions: Object.keys(options).length > 0 
        });

        // Set Content-Type header to application/json for consistent JSON API responses
        res.set('Content-Type', 'application/json; charset=utf-8');

        // Add API version header using APPLICATION.API_VERSION constant
        res.set('X-API-Version', APPLICATION.API_VERSION);

        // Set X-Powered-By header removal for security best practices (Express.js 5.1.0)
        res.removeHeader('X-Powered-By');

        // Add correlation ID header for request tracking and debugging support
        const correlationId = options.correlationId || generateCorrelationId();
        res.set('X-Correlation-ID', correlationId);

        // Include standard security headers appropriate for tutorial application scope
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('X-Frame-Options', 'DENY');
        res.set('X-XSS-Protection', '1; mode=block');

        // Add Cache-Control headers for development environment (no-cache) responses
        if (isDevelopmentEnvironment()) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        } else {
            // Set appropriate cache headers for production
            res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
        }

        // Set custom application headers with application name and version information
        res.set('X-Application-Name', APPLICATION.NAME);
        res.set('X-Application-Version', APPLICATION.VERSION);

        // Add response timestamp header
        res.set('X-Response-Time', new Date().toISOString());

        // Apply any additional headers provided in options parameter for customization
        if (options.customHeaders && typeof options.customHeaders === 'object') {
            Object.entries(options.customHeaders).forEach(([headerName, headerValue]) => {
                if (typeof headerName === 'string' && headerValue !== undefined) {
                    res.set(headerName, String(headerValue));
                }
            });
        }

        // Add environment-specific headers
        const envOptions = getEnvironmentSpecificOptions();
        if (envOptions.includeDebugHeaders && isDevelopmentEnvironment()) {
            res.set('X-Environment', 'development');
            res.set('X-Debug-Mode', 'enabled');
        }

        logger.debug('Standard response headers added successfully', { correlationId });

    } catch (error) {
        // Handle header setting errors gracefully
        logger.error('Error adding response headers', { 
            error: error.message,
            hasResponse: res !== null
        });

        // Attempt to set minimal headers if full header setting fails
        try {
            if (res && typeof res.set === 'function') {
                res.set('Content-Type', 'application/json');
                res.set('X-API-Version', APPLICATION.API_VERSION);
            }
        } catch (fallbackError) {
            logger.error('Failed to set fallback headers', { error: fallbackError.message });
        }
    }
}

/**
 * Validates response data structure and content to ensure it meets API response requirements
 * and can be properly serialized for client consumption.
 * 
 * @param {any} data - Response data to validate
 * @param {string} responseType - Type of response (success or error)
 * @returns {Object} Validation result with isValid boolean, validated data, and validation error details
 */
function validateResponseData(data, responseType = 'success') {
    try {
        logger.debug('Validating response data', { 
            dataType: typeof data,
            responseType,
            hasData: data !== null && data !== undefined
        });

        // Initialize validation result object
        const validationResult = {
            isValid: true,
            data: data,
            errors: [],
            warnings: []
        };

        // Check if response data is defined and not null for basic validity
        if (data === null || data === undefined) {
            if (responseType === 'success') {
                // Success responses can have null data, use default
                validationResult.data = RESPONSES.HELLO_WORLD;
                validationResult.warnings.push('No data provided, using default response');
            } else {
                // Error responses should have error information
                validationResult.errors.push('Error responses must contain error data');
                validationResult.isValid = false;
            }
        }

        // Validate data can be JSON serialized without circular references or errors
        try {
            const serialized = JSON.stringify(validationResult.data);
            const deserialized = JSON.parse(serialized);
            
            // Verify round-trip serialization integrity
            if (typeof validationResult.data === 'object' && validationResult.data !== null) {
                const originalKeys = Object.keys(validationResult.data).sort();
                const deserializedKeys = Object.keys(deserialized).sort();
                
                if (JSON.stringify(originalKeys) !== JSON.stringify(deserializedKeys)) {
                    validationResult.warnings.push('Data structure changed during serialization');
                }
            }
        } catch (serializationError) {
            validationResult.errors.push(`Data serialization failed: ${serializationError.message}`);
            validationResult.isValid = false;
        }

        // Check response type compatibility (success vs error response validation)
        const typeValidation = validateResponseType(validationResult.data, responseType);
        if (!typeValidation.isValid) {
            validationResult.errors.push(...typeValidation.errors);
            validationResult.isValid = false;
        }

        // Validate required properties exist for the specified response type
        if (responseType === 'success') {
            // Success responses should have meaningful data
            if (typeof validationResult.data === 'string' && validationResult.data.trim() === '') {
                validationResult.warnings.push('Empty string data in success response');
            }
        } else if (responseType === 'error') {
            // Error responses should contain error information
            if (typeof validationResult.data === 'object' && validationResult.data !== null) {
                if (!validationResult.data.message && !validationResult.data.error) {
                    validationResult.errors.push('Error responses must contain message or error property');
                    validationResult.isValid = false;
                }
            }
        }

        // Check data size limits to prevent extremely large response payloads
        const dataSize = JSON.stringify(validationResult.data).length;
        const maxSize = 1024 * 1024; // 1MB limit
        
        if (dataSize > maxSize) {
            validationResult.errors.push(`Response data too large: ${dataSize} bytes (max: ${maxSize})`);
            validationResult.isValid = false;
        } else if (dataSize > maxSize / 2) {
            validationResult.warnings.push(`Large response data: ${dataSize} bytes`);
        }

        // Validate data types and structure against expected response schema
        const schemaValidation = validateDataSchema(validationResult.data, responseType);
        if (schemaValidation.warnings.length > 0) {
            validationResult.warnings.push(...schemaValidation.warnings);
        }

        // Log validation results
        logger.debug('Response data validation completed', {
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            dataSize
        });

        // Return validation result with success status and validated data or error details
        return validationResult;

    } catch (error) {
        // Handle validation errors gracefully
        logger.error('Error during response data validation', { 
            error: error.message,
            responseType
        });

        return {
            isValid: false,
            data: data,
            errors: [`Validation process failed: ${error.message}`],
            warnings: []
        };
    }
}

/**
 * Factory function that creates customized response formatting functions with pre-configured
 * options and metadata for specific controllers or use cases.
 * 
 * @param {Object} factoryOptions - Configuration options for the response factory
 * @returns {Object} Response factory object with customized formatSuccess and formatError methods
 */
function createResponseFactory(factoryOptions = {}) {
    try {
        logger.debug('Creating response factory', { 
            hasOptions: Object.keys(factoryOptions).length > 0 
        });

        // Create factory configuration object with provided options and default values
        const factoryConfig = {
            componentName: factoryOptions.componentName || 'DefaultComponent',
            defaultMetadata: factoryOptions.defaultMetadata || {},
            includeDebugInfo: factoryOptions.includeDebugInfo !== false,
            customHeaders: factoryOptions.customHeaders || {},
            validator: factoryOptions.validator || null,
            ...factoryOptions
        };

        // Generate custom formatSuccess function with pre-configured metadata and options
        const formatSuccess = (data, statusCode, additionalMetadata = {}, req = null) => {
            const mergedMetadata = {
                ...factoryConfig.defaultMetadata,
                ...additionalMetadata,
                factory: {
                    name: factoryConfig.componentName,
                    version: UTILITY_VERSION
                }
            };

            return formatSuccessResponse(data, statusCode, mergedMetadata, req);
        };

        // Generate custom formatError function with factory-specific error handling options
        const formatError = (error, req = null, statusCode, additionalOptions = {}) => {
            const mergedOptions = {
                ...factoryConfig,
                ...additionalOptions,
                metadata: {
                    ...factoryConfig.defaultMetadata,
                    ...additionalOptions.metadata,
                    factory: {
                        name: factoryConfig.componentName,
                        version: UTILITY_VERSION
                    }
                }
            };

            return formatErrorResponse(error, req, statusCode, mergedOptions);
        };

        // Include factory metadata and identification information in created functions
        const factoryMetadata = {
            name: factoryConfig.componentName,
            version: UTILITY_VERSION,
            createdAt: new Date().toISOString(),
            options: factoryConfig
        };

        // Set up default response options and metadata that will be applied to all responses
        const defaultOptions = {
            includeDebugInfo: factoryConfig.includeDebugInfo,
            customHeaders: factoryConfig.customHeaders,
            validator: factoryConfig.validator
        };

        // Create helper function for adding standard headers with factory configuration
        const addHeaders = (res, additionalOptions = {}) => {
            const headerOptions = {
                ...defaultOptions,
                ...additionalOptions,
                customHeaders: {
                    ...factoryConfig.customHeaders,
                    ...additionalOptions.customHeaders,
                    'X-Factory-Component': factoryConfig.componentName
                }
            };

            return addResponseHeaders(res, headerOptions);
        };

        // Create validation helper with factory-specific rules
        const validateData = (data, responseType = 'success') => {
            let validation = validateResponseData(data, responseType);
            
            // Apply custom validation if provided
            if (factoryConfig.validator && typeof factoryConfig.validator === 'function') {
                try {
                    const customValidation = factoryConfig.validator(data, responseType);
                    if (customValidation && !customValidation.isValid) {
                        validation.errors.push(...(customValidation.errors || []));
                        validation.warnings.push(...(customValidation.warnings || []));
                        validation.isValid = false;
                    }
                } catch (validationError) {
                    validation.warnings.push(`Custom validation failed: ${validationError.message}`);
                }
            }
            
            return validation;
        };

        // Return factory object with customized response formatting methods ready for use
        const responseFactory = {
            formatSuccess,
            formatError,
            addHeaders,
            validateData,
            metadata: factoryMetadata,
            config: factoryConfig,
            
            // Utility methods for factory introspection
            getComponentName: () => factoryConfig.componentName,
            getDefaultMetadata: () => ({ ...factoryConfig.defaultMetadata }),
            updateDefaultMetadata: (newMetadata) => {
                Object.assign(factoryConfig.defaultMetadata, newMetadata);
            }
        };

        logger.debug('Response factory created successfully', {
            componentName: factoryConfig.componentName,
            hasDefaultMetadata: Object.keys(factoryConfig.defaultMetadata).length > 0,
            hasCustomHeaders: Object.keys(factoryConfig.customHeaders).length > 0
        });

        return responseFactory;

    } catch (error) {
        // Handle factory creation errors gracefully
        logger.error('Error creating response factory', { 
            error: error.message,
            factoryOptions
        });

        // Return minimal factory if creation fails
        return {
            formatSuccess: formatSuccessResponse,
            formatError: formatErrorResponse,
            addHeaders: addResponseHeaders,
            validateData: validateResponseData,
            metadata: {
                name: 'FallbackFactory',
                error: 'Factory creation failed'
            }
        };
    }
}

/**
 * Logs response formatting operations including response type, status code, processing time,
 * and metadata for monitoring and debugging purposes.
 * 
 * @param {string} responseType - Type of response being formatted (success or error)
 * @param {number} statusCode - HTTP status code for the response
 * @param {Object} metadata - Response metadata object
 * @param {Object} options - Additional logging options
 * @returns {void} Outputs structured log entries for response formatting operations and performance tracking
 */
function logResponseFormatting(responseType, statusCode, metadata = {}, options = {}) {
    try {
        // Create structured log entry with response type, status code, and formatting metadata
        const logEntry = {
            responseType: responseType || 'unknown',
            statusCode: statusCode || 0,
            timestamp: new Date().toISOString(),
            utility: {
                name: UTILITY_NAME,
                version: UTILITY_VERSION
            }
        };

        // Include request correlation ID and processing timing information for tracking
        if (metadata.correlationId) {
            logEntry.correlationId = metadata.correlationId;
        }

        if (metadata.performance?.processingTime) {
            logEntry.processingTime = metadata.performance.processingTime;
        }

        // Add response size estimation and performance metrics for monitoring purposes
        if (options.dataSize) {
            logEntry.responseSize = options.dataSize;
        }

        if (options.hasCustomMetadata) {
            logEntry.customMetadata = true;
        }

        // Include environment-specific logging details based on current environment settings
        if (isDevelopmentEnvironment()) {
            logEntry.environment = 'development';
            logEntry.debug = {
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            };
        }

        // Add additional options to log entry
        if (options && Object.keys(options).length > 0) {
            logEntry.options = { ...options };
        }

        // Use appropriate log level (INFO for success, WARN for client errors, ERROR for server errors)
        if (responseType === 'success') {
            logger.info('Response formatted successfully', logEntry);
        } else if (responseType === 'error') {
            if (statusCode >= 400 && statusCode < 500) {
                logger.warn('Client error response formatted', logEntry);
            } else if (statusCode >= 500) {
                logger.error('Server error response formatted', logEntry);
            } else {
                logger.info('Error response formatted', logEntry);
            }
        } else {
            logger.debug('Response formatting logged', logEntry);
        }

    } catch (loggingError) {
        // Handle logging errors gracefully to prevent logging failures from affecting response formatting
        logger.error('Error logging response formatting', { 
            loggingError: loggingError.message,
            responseType,
            statusCode
        });
    }
}

/**
 * Returns environment-specific response formatting options and configurations based on current
 * environment (development, test, production) for appropriate response behavior.
 * 
 * @param {string} environment - Target environment override
 * @returns {Object} Environment-specific options for response formatting including debug info, error details, and metadata levels
 */
function getEnvironmentSpecificOptions(environment = null) {
    try {
        // Determine current environment using environment detection utilities
        let currentEnv;
        if (environment) {
            currentEnv = environment;
        } else if (isDevelopmentEnvironment()) {
            currentEnv = 'development';
        } else if (isTestEnvironment()) {
            currentEnv = 'test';
        } else if (isProductionEnvironment()) {
            currentEnv = 'production';
        } else {
            currentEnv = 'development'; // Default fallback
        }

        logger.debug('Getting environment-specific options', { environment: currentEnv });

        // Return development-specific options with enhanced debugging information and full error details
        if (currentEnv === 'development') {
            return {
                includeDebugInfo: true,
                includeStackTrace: true,
                verboseErrorMessages: true,
                includeMetadata: true,
                includePerformanceData: true,
                includeDebugHeaders: true,
                sanitizeErrors: false,
                logLevel: 'debug',
                colors: true,
                prettyPrint: true
            };
        }

        // Return test-specific options with validation metadata and test-friendly formatting
        if (currentEnv === 'test') {
            return {
                includeDebugInfo: true,
                includeStackTrace: true,
                verboseErrorMessages: true,
                includeMetadata: true,
                includePerformanceData: true,
                includeDebugHeaders: false,
                sanitizeErrors: false,
                logLevel: 'info',
                colors: false,
                prettyPrint: false,
                includeValidationData: true
            };
        }

        // Return production-specific options with sanitized error messages and minimal debugging info
        if (currentEnv === 'production') {
            return {
                includeDebugInfo: false,
                includeStackTrace: false,
                verboseErrorMessages: false,
                includeMetadata: true,
                includePerformanceData: false,
                includeDebugHeaders: false,
                sanitizeErrors: true,
                logLevel: 'warn',
                colors: false,
                prettyPrint: false,
                securityHeaders: true
            };
        }

        // Include environment-appropriate security settings and information disclosure levels
        const baseOptions = {
            includeDebugInfo: currentEnv !== 'production',
            includeStackTrace: currentEnv === 'development',
            verboseErrorMessages: currentEnv !== 'production',
            includeMetadata: true,
            includePerformanceData: currentEnv !== 'production',
            sanitizeErrors: currentEnv === 'production',
            environment: currentEnv
        };

        // Return options object ready for use in response formatting functions
        return baseOptions;

    } catch (error) {
        // Handle options retrieval errors gracefully
        logger.error('Error getting environment-specific options', { 
            error: error.message,
            environment
        });

        // Return safe default options if retrieval fails
        return {
            includeDebugInfo: false,
            includeStackTrace: false,
            verboseErrorMessages: false,
            includeMetadata: true,
            sanitizeErrors: true,
            environment: 'unknown',
            error: 'Options retrieval failed'
        };
    }
}

// Helper functions for internal use

/**
 * Validates and normalizes HTTP status codes
 * @param {number} statusCode - Status code to validate
 * @param {number} defaultCode - Default code to use if invalid
 * @returns {number} Valid HTTP status code
 */
function validateStatusCode(statusCode, defaultCode = HTTP_STATUS.OK) {
    if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
        logger.warn('Invalid status code, using default', { 
            provided: statusCode, 
            default: defaultCode 
        });
        return defaultCode;
    }
    return statusCode;
}

/**
 * Determines appropriate error status code based on error type
 * @param {Object} error - Error object
 * @param {number} providedCode - Provided status code
 * @returns {number} Appropriate HTTP status code
 */
function determineErrorStatusCode(error, providedCode) {
    // Use provided code if valid
    if (providedCode && typeof providedCode === 'number' && providedCode >= 400 && providedCode <= 599) {
        return providedCode;
    }

    // Determine code based on error type or message
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
        return HTTP_STATUS.BAD_REQUEST;
    }
    
    if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
        return HTTP_STATUS.NOT_FOUND;
    }

    if (error.code === 'METHOD_NOT_ALLOWED') {
        return HTTP_STATUS.METHOD_NOT_ALLOWED;
    }

    // Default to internal server error
    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Classifies errors for consistent error handling
 * @param {Object} error - Error object to classify
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error classification information
 */
function classifyError(error, statusCode) {
    const classification = {
        category: 'unknown',
        severity: 'medium',
        recoverable: true
    };

    if (statusCode >= 400 && statusCode < 500) {
        classification.category = 'client';
        classification.severity = 'low';
        classification.recoverable = true;
    } else if (statusCode >= 500) {
        classification.category = 'server';
        classification.severity = 'high';
        classification.recoverable = false;
    }

    if (error.name) {
        classification.type = error.name;
    }

    return classification;
}

/**
 * Generates unique correlation IDs for request tracking
 * @returns {string} Unique correlation ID
 */
function generateCorrelationId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `req-${timestamp}-${random}`;
}

/**
 * Extracts correlation ID from request headers or generates new one
 * @param {Object} req - Express.js request object
 * @returns {string} Correlation ID
 */
function extractCorrelationId(req) {
    if (!req) return null;
    
    return req.get('X-Correlation-ID') || 
           req.get('x-correlation-id') ||
           req.get('X-Request-ID') ||
           req.headers?.['x-correlation-id'] ||
           null;
}

/**
 * Extracts request processing time
 * @param {Object} req - Express.js request object
 * @returns {number|null} Processing time in milliseconds
 */
function extractProcessingTime(req) {
    if (!req) return null;
    
    const startTime = req._startTime || req.startTime;
    if (startTime) {
        return Date.now() - startTime;
    }
    
    return null;
}

/**
 * Filters sensitive data from objects
 * @param {Object} data - Data to filter
 * @returns {Object} Filtered data
 */
function filterSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'auth'];
    const filtered = { ...data };
    
    Object.keys(filtered).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            filtered[key] = '[REDACTED]';
        }
    });
    
    return filtered;
}

/**
 * Validates response type compatibility
 * @param {any} data - Response data
 * @param {string} responseType - Expected response type
 * @returns {Object} Validation result
 */
function validateResponseType(data, responseType) {
    const result = { isValid: true, errors: [] };
    
    if (responseType === 'error' && typeof data === 'string' && !data.includes('error')) {
        result.errors.push('Error response should contain error-related content');
        result.isValid = false;
    }
    
    return result;
}

/**
 * Validates data against basic schema requirements
 * @param {any} data - Data to validate
 * @param {string} responseType - Response type
 * @returns {Object} Schema validation result
 */
function validateDataSchema(data, responseType) {
    const result = { warnings: [] };
    
    if (responseType === 'success' && typeof data === 'object' && data !== null) {
        if (Array.isArray(data) && data.length === 0) {
            result.warnings.push('Success response contains empty array');
        }
    }
    
    return result;
}

// Export all functions and utilities
module.exports = {
    // Primary function for formatting successful HTTP responses with standardized structure and metadata enrichment
    formatSuccessResponse,
    
    // Primary function for formatting error HTTP responses with consistent error structure and environment-appropriate details
    formatErrorResponse,
    
    // Utility function for creating standardized response metadata objects with timestamp and correlation information
    createResponseMetadata,
    
    // Error message sanitization utility for preventing sensitive information disclosure while maintaining debugging value
    sanitizeErrorMessage,
    
    // Request context extraction utility for response metadata enrichment with request information
    extractRequestContext,
    
    // HTTP response header management utility for consistent header application across API responses
    addResponseHeaders,
    
    // Response data validation utility for ensuring response integrity and serialization compatibility
    validateResponseData,
    
    // Factory function for creating customized response formatting functions with pre-configured options
    createResponseFactory,
    
    // Logging utility for response formatting operations and performance tracking
    logResponseFormatting,
    
    // Environment-specific options utility for appropriate response behavior based on current environment
    getEnvironmentSpecificOptions
};