/**
 * Hello Service Module for Node.js Tutorial Application
 * 
 * Core business logic service module that implements the hello world functionality for the Node.js
 * tutorial application. This service encapsulates all business rules, validation logic, and response 
 * generation for the /hello endpoint, demonstrating service layer patterns in Express.js applications.
 * 
 * Provides both functional and class-based interfaces for hello request processing, validation, and 
 * response formatting with comprehensive error handling and logging. Designed to support Express.js 
 * 5.1.0 framework requirements and Node.js v22.x LTS runtime with educational focus on service-oriented 
 * architecture patterns.
 * 
 * Features:
 * - Comprehensive request validation and processing
 * - Standardized service response generation
 * - Educational service layer patterns demonstration
 * - Performance monitoring and metrics collection
 * - Robust error handling and recovery mechanisms
 * - Instance-based service operations with configuration management
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import logger factory for service-level logging and request processing tracking
const { getLogger } = require('../utils/logger.js');

// Import HTTP status code constants for service response status handling
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import standard response message constants for consistent hello world response
const { 
    RESPONSES 
} = require('../utils/constants.js');

// Import HTTP method constants for request method validation
const { 
    HTTP_METHODS 
} = require('../utils/constants.js');

// Import standardized error message constants for consistent error responses
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import application metadata constants for service information and versioning
const { 
    APPLICATION 
} = require('../utils/constants.js');

// Import standardized validation result class for service-level validation and error handling
const { 
    ValidationResult 
} = require('../utils/validator.js');

// Import string validation utility for request parameter validation
const { 
    isValidString 
} = require('../utils/validator.js');

// Import factory function for creating standardized validation error objects
const { 
    createValidationError 
} = require('../utils/validator.js');

/**
 * Global service logger instance configured for helloService component logging
 * @type {Logger}
 */
const logger = getLogger('helloService');

/**
 * Service name constant for consistent service identification
 * @type {string}
 */
const SERVICE_NAME = 'HelloService';

/**
 * Service version constant for service versioning and compatibility tracking
 * @type {string}
 */
const SERVICE_VERSION = '1.0.0';

/**
 * Default response data constant using the standardized hello world message
 * @type {string}
 */
const DEFAULT_RESPONSE_DATA = RESPONSES.HELLO_WORLD;

/**
 * Generates the hello world response data with consistent formatting and metadata for the 
 * /hello endpoint response generation. Creates comprehensive response object with processing
 * context, service information, and educational metadata.
 * 
 * @param {Object} context - Request context containing request metadata and processing information
 * @param {Object} context.req - Express request object with HTTP request data
 * @param {Object} context.res - Express response object for HTTP response handling
 * @param {string} context.method - HTTP method used for the request
 * @param {string} context.path - Request path for endpoint identification
 * @param {Date} context.timestamp - Request processing timestamp
 * @returns {Object} Hello response object with data, metadata, and formatting information
 */
function generateHelloResponse(context) {
    // Extract request context information including timestamp and request metadata
    const requestTimestamp = context.timestamp || new Date();
    const requestId = context.requestId || `req-${Date.now()}`;
    const requestMethod = context.method || HTTP_METHODS.GET;
    const requestPath = context.path || '/hello';
    
    logger.debug('Generating hello response', {
        requestId: requestId,
        method: requestMethod,
        path: requestPath,
        timestamp: requestTimestamp.toISOString()
    });
    
    // Create response data object with RESPONSES.HELLO_WORLD constant as primary content
    const responseData = {
        message: DEFAULT_RESPONSE_DATA,
        success: true,
        data: DEFAULT_RESPONSE_DATA
    };
    
    // Add response metadata including generation timestamp and service information
    const responseMetadata = {
        service: {
            name: SERVICE_NAME,
            version: SERVICE_VERSION,
            application: APPLICATION.NAME
        },
        request: {
            id: requestId,
            method: requestMethod,
            path: requestPath,
            timestamp: requestTimestamp.toISOString()
        },
        response: {
            generatedAt: new Date().toISOString(),
            processingTime: Date.now() - requestTimestamp.getTime(),
            format: 'application/json',
            encoding: 'utf-8'
        }
    };
    
    // Include request correlation information for tracing and debugging
    const correlationInfo = {
        traceId: context.traceId || `trace-${Date.now()}`,
        spanId: context.spanId || `span-${Date.now()}`,
        parentSpanId: context.parentSpanId || null
    };
    
    // Format response object with consistent structure for controller consumption
    const formattedResponse = {
        ...responseData,
        metadata: responseMetadata,
        correlation: correlationInfo,
        version: APPLICATION.API_VERSION || 'v1',
        timestamp: new Date().toISOString()
    };
    
    // Log response generation with context information for monitoring
    logger.info('Hello response generated successfully', {
        requestId: requestId,
        responseSize: JSON.stringify(formattedResponse).length,
        processingTime: responseMetadata.response.processingTime,
        service: SERVICE_NAME
    });
    
    // Return formatted hello response object ready for HTTP response
    return formattedResponse;
}

/**
 * Validates incoming HTTP requests for the hello endpoint including method validation, 
 * header checking, and request format validation with comprehensive error reporting.
 * Implements educational validation patterns for service layer demonstration.
 * 
 * @param {Object} requestContext - Request context object containing HTTP request information
 * @param {Object} requestContext.req - Express request object with HTTP request data
 * @param {Object} requestContext.res - Express response object for HTTP response handling  
 * @param {string} requestContext.method - HTTP method used for the request
 * @param {string} requestContext.path - Request path for endpoint identification
 * @returns {ValidationResult} Validation result object with success status and detailed error information
 */
function validateHelloRequest(requestContext) {
    // Initialize ValidationResult instance for tracking validation outcomes
    const validationResult = new ValidationResult();
    
    logger.debug('Starting hello request validation', {
        method: requestContext.method,
        path: requestContext.path,
        timestamp: new Date().toISOString()
    });
    
    // Extract HTTP method from request context and validate against HTTP_METHODS.GET
    const requestMethod = requestContext.method;
    if (!requestMethod || requestMethod !== HTTP_METHODS.GET) {
        const methodError = createValidationError(
            `Invalid HTTP method: ${requestMethod}. Only GET method is supported for /hello endpoint`,
            'method',
            requestMethod,
            { 
                code: 'INVALID_HTTP_METHOD',
                expectedMethod: HTTP_METHODS.GET,
                rule: 'http_method_validation'
            }
        );
        validationResult.addError(methodError);
    }
    
    // Validate request headers for required content type and accept headers
    const requestHeaders = requestContext.req ? requestContext.req.headers : {};
    
    // Check for user-agent header presence for basic request validation
    if (!requestHeaders['user-agent']) {
        const headerError = createValidationError(
            'Missing User-Agent header in request',
            'headers.user-agent',
            null,
            {
                code: 'MISSING_USER_AGENT',
                rule: 'header_validation',
                severity: 'warning'
            }
        );
        validationResult.addError(headerError);
    }
    
    // Check request path format and ensure it matches expected hello endpoint pattern
    const requestPath = requestContext.path;
    if (!isValidString(requestPath, { notEmpty: true, minLength: 1 })) {
        const pathError = createValidationError(
            'Invalid request path format',
            'path',
            requestPath,
            {
                code: 'INVALID_REQUEST_PATH',
                rule: 'path_format_validation'
            }
        );
        validationResult.addError(pathError);
    }
    
    // Validate request has no body content as GET requests should not include request body
    if (requestContext.req && requestContext.req.body && Object.keys(requestContext.req.body).length > 0) {
        const bodyError = createValidationError(
            'GET requests should not contain request body',
            'body',
            requestContext.req.body,
            {
                code: 'UNEXPECTED_REQUEST_BODY',
                rule: 'get_method_body_validation',
                severity: 'warning'
            }
        );
        validationResult.addError(bodyError);
    }
    
    // Verify request context has required properties (req, res, method, path)
    const requiredProperties = ['req', 'method', 'path'];
    for (const property of requiredProperties) {
        if (!requestContext.hasOwnProperty(property) || requestContext[property] === undefined) {
            const contextError = createValidationError(
                `Missing required request context property: ${property}`,
                `context.${property}`,
                requestContext[property],
                {
                    code: 'MISSING_CONTEXT_PROPERTY',
                    rule: 'context_validation',
                    severity: 'error'
                }
            );
            validationResult.addError(contextError);
        }
    }
    
    // Add specific validation errors to ValidationResult for any failed validations
    if (validationResult.hasErrors()) {
        logger.warn('Hello request validation failed', {
            errorCount: validationResult.errors.length,
            errors: validationResult.getErrorMessages(),
            method: requestMethod,
            path: requestPath
        });
    } else {
        logger.debug('Hello request validation passed', {
            method: requestMethod,
            path: requestPath,
            validationTime: Date.now()
        });
    }
    
    // Log validation attempt and results for debugging and monitoring
    logger.debug('Hello request validation completed', {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        validationMetadata: validationResult.metadata
    });
    
    // Return comprehensive ValidationResult with validation status and error details
    return validationResult;
}

/**
 * Main service processing function that orchestrates the complete hello request workflow 
 * including validation, response generation, and error handling with logging and monitoring.
 * Demonstrates comprehensive service layer request processing patterns.
 * 
 * @param {Object} requestContext - Request context object containing HTTP request information
 * @param {Object} requestContext.req - Express request object with HTTP request data
 * @param {Object} requestContext.res - Express response object for HTTP response handling
 * @param {string} requestContext.method - HTTP method used for the request
 * @param {string} requestContext.path - Request path for endpoint identification
 * @returns {Object} Service response object with data, status, metadata, and error information
 */
function processHelloRequest(requestContext) {
    // Log incoming request processing start with context information and timestamp
    const processingStartTime = Date.now();
    const requestId = `req-${processingStartTime}`;
    
    logger.info('Starting hello request processing', {
        requestId: requestId,
        method: requestContext.method,
        path: requestContext.path,
        timestamp: new Date().toISOString(),
        userAgent: requestContext.req ? requestContext.req.headers['user-agent'] : 'unknown'
    });
    
    try {
        // Validate request using validateHelloRequest function and check for validation errors
        const validationResult = validateHelloRequest(requestContext);
        
        // Handle validation errors by creating error response with BAD_REQUEST status
        if (validationResult.hasErrors()) {
            const validationErrors = validationResult.getErrorMessages();
            
            logger.warn('Request validation failed, returning error response', {
                requestId: requestId,
                validationErrors: validationErrors,
                errorCount: validationResult.errors.length
            });
            
            // Create error response for validation failures
            const errorResponse = createHelloServiceResponse(
                {
                    error: true,
                    message: ERROR_MESSAGES.BAD_REQUEST,
                    details: validationErrors,
                    validationResult: validationResult.toJSON()
                },
                HTTP_STATUS.BAD_REQUEST,
                {
                    requestId: requestId,
                    service: SERVICE_NAME,
                    errorType: 'validation_error',
                    processingTime: Date.now() - processingStartTime
                }
            );
            
            return errorResponse;
        }
        
        // Generate hello response using generateHelloResponse function for valid requests
        const enhancedContext = {
            ...requestContext,
            requestId: requestId,
            timestamp: new Date(processingStartTime)
        };
        
        const helloResponseData = generateHelloResponse(enhancedContext);
        
        // Create service response object with response data and HTTP_STATUS.OK status
        const serviceResponse = createHelloServiceResponse(
            helloResponseData,
            HTTP_STATUS.OK,
            {
                requestId: requestId,
                service: SERVICE_NAME,
                version: SERVICE_VERSION,
                processingTime: Date.now() - processingStartTime,
                responseGenerated: true
            }
        );
        
        // Add processing metadata including processing time and service information
        serviceResponse.metadata.performance = {
            processingTimeMs: Date.now() - processingStartTime,
            validationTimeMs: validationResult.metadata.validationTimestamp ? 
                new Date(validationResult.metadata.validationTimestamp).getTime() - processingStartTime : 0,
            responseGenerationTimeMs: Date.now() - processingStartTime
        };
        
        // Log successful request processing completion with timing and response information
        logger.info('Hello request processing completed successfully', {
            requestId: requestId,
            processingTime: serviceResponse.metadata.performance.processingTimeMs,
            responseSize: JSON.stringify(serviceResponse).length,
            statusCode: serviceResponse.statusCode
        });
        
        // Return complete service response object ready for controller handling
        return serviceResponse;
        
    } catch (processingError) {
        // Handle any processing errors with INTERNAL_SERVER_ERROR status and error logging
        logger.error('Error during hello request processing', {
            requestId: requestId,
            error: processingError.message,
            stack: processingError.stack,
            processingTime: Date.now() - processingStartTime
        });
        
        // Create error response for processing failures
        const errorResponse = createHelloServiceResponse(
            {
                error: true,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                details: 'An error occurred while processing the hello request',
                errorCode: 'PROCESSING_ERROR'
            },
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            {
                requestId: requestId,
                service: SERVICE_NAME,
                errorType: 'processing_error',
                processingTime: Date.now() - processingStartTime,
                error: {
                    message: processingError.message,
                    type: processingError.constructor.name
                }
            }
        );
        
        return errorResponse;
    }
}

/**
 * Factory function for creating standardized service response objects with consistent 
 * structure, status codes, and metadata for hello service operations. Provides uniform
 * response format across all service functions.
 * 
 * @param {*} data - Response data payload (can be any type)
 * @param {number} statusCode - HTTP status code for the response
 * @param {Object} metadata - Additional metadata for the response object
 * @returns {Object} Standardized service response object with data, status, metadata, and service information
 */
function createHelloServiceResponse(data, statusCode = HTTP_STATUS.OK, metadata = {}) {
    // Create base service response object with standard structure and properties
    const baseResponse = {
        success: statusCode >= 200 && statusCode < 400,
        statusCode: statusCode,
        timestamp: new Date().toISOString()
    };
    
    // Set response data from provided data parameter or default hello world message
    if (data !== undefined && data !== null) {
        baseResponse.data = data;
    } else {
        baseResponse.data = {
            message: DEFAULT_RESPONSE_DATA,
            default: true
        };
    }
    
    // Set HTTP status code from statusCode parameter or default to HTTP_STATUS.OK
    if (typeof statusCode === 'number' && statusCode > 0) {
        baseResponse.statusCode = statusCode;
    }
    
    // Add service metadata including service name, version, and processing timestamp
    const serviceMetadata = {
        service: {
            name: SERVICE_NAME,
            version: SERVICE_VERSION,
            application: APPLICATION.NAME,
            apiVersion: APPLICATION.API_VERSION || 'v1'
        },
        response: {
            generatedAt: baseResponse.timestamp,
            format: 'application/json',
            encoding: 'utf-8'
        }
    };
    
    // Merge provided metadata with default service response metadata
    const mergedMetadata = {
        ...serviceMetadata,
        ...metadata
    };
    
    // Include request correlation information if available in metadata
    if (metadata.requestId) {
        mergedMetadata.correlation = {
            requestId: metadata.requestId,
            traceId: metadata.traceId || `trace-${Date.now()}`,
            timestamp: baseResponse.timestamp
        };
    }
    
    // Add response generation context and service layer information
    mergedMetadata.context = {
        layer: 'service',
        module: 'helloService',
        function: 'createHelloServiceResponse',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    };
    
    // Validate response object structure meets service response standards
    const completeResponse = {
        ...baseResponse,
        metadata: mergedMetadata
    };
    
    // Add validation information for response structure
    completeResponse.metadata.validation = {
        hasData: completeResponse.data !== undefined,
        hasMetadata: Object.keys(mergedMetadata).length > 0,
        isStandardized: true
    };
    
    logger.debug('Service response created', {
        statusCode: completeResponse.statusCode,
        success: completeResponse.success,
        dataType: typeof completeResponse.data,
        metadataKeys: Object.keys(mergedMetadata).length
    });
    
    // Return standardized service response object ready for controller consumption
    return completeResponse;
}

/**
 * Retrieves comprehensive metadata information about the hello service including version,
 * capabilities, status, and configuration for service discovery and monitoring. Provides
 * complete service information for operational visibility.
 * 
 * @returns {Object} Service metadata object with name, version, capabilities, and status information
 */
function getHelloServiceMetadata() {
    // Create service metadata object with SERVICE_NAME and SERVICE_VERSION constants
    const serviceInfo = {
        name: SERVICE_NAME,
        version: SERVICE_VERSION,
        description: 'Hello world service for Node.js tutorial application',
        type: 'business_service'
    };
    
    // Add service capabilities including supported methods and endpoint information
    const serviceCapabilities = {
        endpoints: [
            {
                path: '/hello',
                method: HTTP_METHODS.GET,
                description: 'Returns hello world response',
                responseFormat: 'application/json'
            }
        ],
        supportedMethods: [HTTP_METHODS.GET],
        responseFormats: ['application/json'],
        features: [
            'request_validation',
            'error_handling',
            'logging',
            'metrics_collection',
            'educational_patterns'
        ]
    };
    
    // Include service status information such as health, uptime, and availability
    const serviceStatus = {
        health: 'healthy',
        status: 'active',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        pid: process.pid,
        nodeVersion: process.version
    };
    
    // Add configuration information including supported request formats and response types
    const serviceConfiguration = {
        environment: process.env.NODE_ENV || 'development',
        logLevel: 'info',
        validationEnabled: true,
        metricsEnabled: true,
        errorHandlingEnabled: true
    };
    
    // Include service dependencies and integration points for dependency tracking
    const serviceDependencies = {
        runtime: {
            nodejs: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        frameworks: {
            express: '5.1.0'
        },
        modules: [
            'logger',
            'validator',
            'constants'
        ]
    };
    
    // Add performance metrics and operational statistics if available
    const performanceMetrics = {
        averageResponseTime: 10, // Simulated average response time in ms
        requestsProcessed: 0, // Would be tracked in real implementation
        errorsEncountered: 0, // Would be tracked in real implementation
        lastRequestTimestamp: null
    };
    
    // Log metadata request for service monitoring and analytics
    logger.debug('Service metadata requested', {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        requestTimestamp: new Date().toISOString()
    });
    
    // Return comprehensive service metadata object for service registry
    const completeMetadata = {
        service: serviceInfo,
        capabilities: serviceCapabilities,
        status: serviceStatus,
        configuration: serviceConfiguration,
        dependencies: serviceDependencies,
        performance: performanceMetrics,
        metadata: {
            generatedAt: new Date().toISOString(),
            format: 'service_metadata_v1',
            application: APPLICATION.NAME
        }
    };
    
    return completeMetadata;
}

/**
 * Formats service-level errors with consistent structure, error codes, and metadata 
 * for uniform error handling across the hello service operations. Provides standardized
 * error formatting for all service error scenarios.
 * 
 * @param {Object} error - Error object or error information to format
 * @param {Object} context - Error context including request details and processing state
 * @returns {Object} Formatted service error object with message, code, context, and metadata
 */
function formatServiceError(error, context = {}) {
    // Extract error information including message, stack trace, and error type
    let errorMessage = 'Unknown service error occurred';
    let errorStack = null;
    let errorType = 'UnknownError';
    let errorCode = 'SERVICE_ERROR';
    
    if (error) {
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error instanceof Error) {
            errorMessage = error.message || errorMessage;
            errorStack = error.stack;
            errorType = error.constructor.name;
        } else if (typeof error === 'object') {
            errorMessage = error.message || error.error || errorMessage;
            errorStack = error.stack;
            errorType = error.type || error.name || errorType;
            errorCode = error.code || errorCode;
        }
    }
    
    // Create standardized error object with consistent structure and properties
    const formattedError = {
        error: true,
        message: errorMessage,
        code: errorCode,
        type: errorType,
        timestamp: new Date().toISOString()
    };
    
    // Add error context information including request details and processing state
    const errorContext = {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        layer: 'service',
        module: 'helloService',
        function: context.function || 'unknown',
        ...context
    };
    
    formattedError.context = errorContext;
    
    // Include service-specific error metadata and classification information
    const errorMetadata = {
        severity: context.severity || 'error',
        category: context.category || 'service_error',
        recoverable: context.recoverable !== false,
        errorId: `error-${Date.now()}`,
        application: APPLICATION.NAME
    };
    
    // Add error correlation ID and timestamp for error tracking and debugging
    if (context.requestId) {
        errorMetadata.correlation = {
            requestId: context.requestId,
            traceId: context.traceId || `trace-${Date.now()}`,
            parentSpanId: context.parentSpanId || null
        };
    }
    
    formattedError.metadata = errorMetadata;
    
    // Apply error message sanitization to prevent sensitive information exposure
    if (process.env.NODE_ENV === 'production') {
        // Remove sensitive information in production
        delete formattedError.stack;
        if (errorStack && errorStack.includes('password')) {
            formattedError.message = 'Internal service error occurred';
        }
    } else {
        // Include stack trace in development for debugging
        if (errorStack) {
            formattedError.stack = errorStack;
        }
    }
    
    // Log formatted error with appropriate level and context information
    logger.error('Service error formatted', {
        errorId: errorMetadata.errorId,
        errorType: errorType,
        errorCode: errorCode,
        severity: errorMetadata.severity,
        requestId: context.requestId
    });
    
    // Return formatted service error object ready for controller error handling
    return formattedError;
}

/**
 * Creates internal request context object from controller request context for service 
 * layer processing with additional service-specific metadata and processing information.
 * Transforms controller context into service-optimized context.
 * 
 * @param {Object} controllerContext - Request context from controller layer
 * @param {Object} controllerContext.req - Express request object
 * @param {Object} controllerContext.res - Express response object
 * @param {string} controllerContext.method - HTTP method
 * @param {string} controllerContext.path - Request path
 * @returns {Object} Service request context with request data, metadata, and processing information
 */
function createRequestContext(controllerContext) {
    // Extract request and response objects from controller context
    const { req, res, method, path } = controllerContext;
    
    // Create service-specific context object with request metadata and processing information
    const serviceContext = {
        req: req,
        res: res,
        method: method || (req ? req.method : HTTP_METHODS.GET),
        path: path || (req ? req.path : '/hello')
    };
    
    // Add service layer processing flags and configuration to context
    serviceContext.processing = {
        layer: 'service',
        service: SERVICE_NAME,
        startTime: Date.now(),
        environment: process.env.NODE_ENV || 'development'
    };
    
    // Include request timing information and correlation ID for tracking
    serviceContext.timing = {
        requestStart: new Date(),
        requestTimestamp: Date.now(),
        processingStarted: true
    };
    
    serviceContext.correlation = {
        requestId: `req-${Date.now()}`,
        traceId: `trace-${Date.now()}`,
        sessionId: req && req.sessionID ? req.sessionID : null
    };
    
    // Add service-specific validation and processing options to context
    serviceContext.options = {
        validateRequest: true,
        generateMetrics: true,
        logProcessing: true,
        enableErrorHandling: true
    };
    
    // Include error handling context and recovery information
    serviceContext.errorHandling = {
        recoveryEnabled: true,
        fallbackResponse: DEFAULT_RESPONSE_DATA,
        maxRetries: 0, // No retries for simple hello service
        timeoutMs: 5000
    };
    
    // Add request metadata if available
    if (req) {
        serviceContext.requestMetadata = {
            userAgent: req.headers['user-agent'] || 'unknown',
            host: req.headers.host || 'unknown',
            contentType: req.headers['content-type'] || 'unknown',
            acceptLanguage: req.headers['accept-language'] || 'unknown',
            remoteAddress: req.connection ? req.connection.remoteAddress : 'unknown'
        };
    }
    
    // Log context creation for debugging and request flow tracking
    logger.debug('Service request context created', {
        requestId: serviceContext.correlation.requestId,
        method: serviceContext.method,
        path: serviceContext.path,
        timestamp: serviceContext.timing.requestStart.toISOString()
    });
    
    // Return complete service request context ready for service processing
    return serviceContext;
}

/**
 * HelloService class that provides instance-based hello service operations with state 
 * management, configuration, and advanced service capabilities for object-oriented 
 * service usage patterns. Demonstrates class-based service architecture.
 */
class HelloService {
    /**
     * Creates a new HelloService instance with configuration, logger, and service metadata
     * for stateful service operations and advanced functionality. Initializes all instance
     * properties and validates configuration.
     * 
     * @param {Object} config - Configuration object for the HelloService instance
     * @param {string} config.name - Custom service instance name
     * @param {string} config.version - Custom service version
     * @param {boolean} config.loggingEnabled - Enable/disable logging for this instance
     * @param {Object} config.features - Feature flags for service capabilities
     */
    constructor(config = {}) {
        // Initialize service configuration from provided config parameter or default values
        this.config = {
            name: config.name || SERVICE_NAME,
            version: config.version || SERVICE_VERSION,
            loggingEnabled: config.loggingEnabled !== false,
            features: {
                validation: config.features?.validation !== false,
                metrics: config.features?.metrics !== false,
                errorHandling: config.features?.errorHandling !== false,
                ...config.features
            },
            ...config
        };
        
        // Create service-specific logger using getLogger with HelloService component name
        this.logger = getLogger(`${SERVICE_NAME}-${Date.now()}`);
        
        // Set service name and version from constants or configuration override
        this.serviceName = this.config.name;
        this.serviceVersion = this.config.version;
        
        // Initialize service metadata with creation timestamp and configuration information
        this.metadata = {
            instanceId: `${SERVICE_NAME}-${Date.now()}`,
            createdAt: new Date().toISOString(),
            configuration: { ...this.config },
            application: APPLICATION.NAME,
            nodeVersion: process.version,
            platform: process.platform
        };
        
        // Set up service capabilities and feature flags based on configuration
        this.capabilities = {
            validation: this.config.features.validation,
            metrics: this.config.features.metrics,
            errorHandling: this.config.features.errorHandling,
            instanceBased: true,
            stateful: true
        };
        
        // Initialize internal state tracking and service operation counters
        this.state = {
            requestsProcessed: 0,
            errorsEncountered: 0,
            lastRequestTimestamp: null,
            averageResponseTime: 0,
            status: 'initialized'
        };
        
        // Set created timestamp
        this.createdAt = new Date();
        
        // Log service instance creation with configuration and metadata information
        this.logger.info('HelloService instance created', {
            instanceId: this.metadata.instanceId,
            serviceName: this.serviceName,
            version: this.serviceVersion,
            features: this.config.features
        });
    }
    
    /**
     * Instance method for generating hello world responses with service state and 
     * configuration applied for personalized response generation. Uses instance
     * configuration and state for enhanced responses.
     * 
     * @param {Object} context - Request context for response generation
     * @returns {Object} Hello response object with instance-specific metadata and configuration
     */
    generateHello(context = {}) {
        // Apply instance-specific configuration to response generation process
        const enhancedContext = {
            ...context,
            instanceId: this.metadata.instanceId,
            serviceName: this.serviceName,
            serviceVersion: this.serviceVersion,
            instanceConfig: this.config
        };
        
        // Use instance logger for request-specific logging with service instance context
        this.logger.debug('Generating hello response with instance context', {
            instanceId: this.metadata.instanceId,
            requestId: context.requestId,
            method: context.method
        });
        
        // Generate hello response using generateHelloResponse function with instance context
        const responseData = generateHelloResponse(enhancedContext);
        
        // Add instance-specific metadata including service instance ID and creation time
        const instanceMetadata = {
            instance: {
                id: this.metadata.instanceId,
                name: this.serviceName,
                version: this.serviceVersion,
                createdAt: this.createdAt.toISOString(),
                uptime: Date.now() - this.createdAt.getTime()
            }
        };
        
        // Apply any service-level transformations or customizations from instance config
        const enhancedResponse = {
            ...responseData,
            metadata: {
                ...responseData.metadata,
                ...instanceMetadata
            }
        };
        
        // Update instance state
        this.state.requestsProcessed++;
        this.state.lastRequestTimestamp = new Date().toISOString();
        
        // Log response generation with instance information for service monitoring
        this.logger.info('Hello response generated by instance', {
            instanceId: this.metadata.instanceId,
            requestsProcessed: this.state.requestsProcessed,
            responseSize: JSON.stringify(enhancedResponse).length
        });
        
        // Return hello response object with instance-specific enhancements and metadata
        return enhancedResponse;
    }
    
    /**
     * Instance method for validating hello requests with service instance configuration 
     * and custom validation rules applied. Uses instance-specific validation settings.
     * 
     * @param {Object} requestContext - Request context for validation
     * @returns {ValidationResult} Validation result with instance-specific validation rules and error handling
     */
    validateRequest(requestContext) {
        // Apply instance-specific validation configuration and custom rules
        if (!this.capabilities.validation) {
            this.logger.debug('Validation disabled for this instance');
            return new ValidationResult(true); // Skip validation if disabled
        }
        
        // Use validateHelloRequest function with instance-specific validation context
        const validationResult = validateHelloRequest(requestContext);
        
        // Add instance-level validation rules and business logic constraints
        if (this.config.strictValidation) {
            // Add additional strict validation rules
            if (requestContext.req && !requestContext.req.headers['accept']) {
                const acceptError = createValidationError(
                    'Accept header is required in strict validation mode',
                    'headers.accept',
                    null,
                    { code: 'MISSING_ACCEPT_HEADER', rule: 'strict_validation' }
                );
                validationResult.addError(acceptError);
            }
        }
        
        // Include service instance metadata in validation error messages
        if (validationResult.hasErrors()) {
            validationResult.metadata.instanceId = this.metadata.instanceId;
            validationResult.metadata.instanceConfig = this.config;
        }
        
        // Log validation attempts with instance information and validation outcomes
        this.logger.debug('Request validation completed by instance', {
            instanceId: this.metadata.instanceId,
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length
        });
        
        // Return ValidationResult with instance-specific validation enhancements
        return validationResult;
    }
    
    /**
     * Instance method that returns comprehensive service instance information including 
     * configuration, status, and operational metadata. Provides complete instance visibility.
     * 
     * @returns {Object} Service instance information with configuration, status, and operational data
     */
    getServiceInfo() {
        // Collect instance-specific configuration and metadata information
        const instanceInfo = {
            instanceId: this.metadata.instanceId,
            serviceName: this.serviceName,
            serviceVersion: this.serviceVersion,
            createdAt: this.createdAt.toISOString(),
            configuration: { ...this.config }
        };
        
        // Add service instance operational statistics and performance metrics
        const operationalData = {
            uptime: Date.now() - this.createdAt.getTime(),
            requestsProcessed: this.state.requestsProcessed,
            errorsEncountered: this.state.errorsEncountered,
            lastRequestTimestamp: this.state.lastRequestTimestamp,
            averageResponseTime: this.state.averageResponseTime,
            status: this.state.status
        };
        
        // Include instance creation time, uptime, and operational status
        const statusInfo = {
            health: 'healthy',
            active: true,
            memoryUsage: process.memoryUsage(),
            pid: process.pid
        };
        
        // Add service instance capabilities and feature configuration
        const capabilityInfo = {
            ...this.capabilities,
            supportedMethods: [HTTP_METHODS.GET],
            endpoints: ['/hello']
        };
        
        // Include instance-specific health status and availability information
        const healthInfo = {
            healthy: true,
            lastHealthCheck: new Date().toISOString(),
            serviceAvailable: true,
            responseTime: this.state.averageResponseTime
        };
        
        // Return comprehensive service instance information object
        return {
            instance: instanceInfo,
            operational: operationalData,
            status: statusInfo,
            capabilities: capabilityInfo,
            health: healthInfo,
            metadata: {
                generatedAt: new Date().toISOString(),
                format: 'service_instance_info_v1'
            }
        };
    }
    
    /**
     * Instance method for processing hello requests with service instance state and 
     * configuration for advanced request handling. Uses instance-specific processing logic.
     * 
     * @param {Object} requestContext - Request context for processing
     * @returns {Object} Service response with instance-specific processing and metadata
     */
    processRequest(requestContext) {
        const processingStartTime = Date.now();
        
        // Apply instance-specific request processing configuration and options
        const enhancedContext = {
            ...requestContext,
            instanceId: this.metadata.instanceId,
            instanceConfig: this.config,
            processingOptions: {
                ...this.config.processingOptions,
                instanceBased: true
            }
        };
        
        try {
            // Use processHelloRequest function with instance context and configuration
            const serviceResponse = processHelloRequest(enhancedContext);
            
            // Add instance-level request processing enhancements and customizations
            const enhancedResponse = {
                ...serviceResponse,
                metadata: {
                    ...serviceResponse.metadata,
                    instance: {
                        id: this.metadata.instanceId,
                        name: this.serviceName,
                        version: this.serviceVersion
                    }
                }
            };
            
            // Update instance state with processing metrics
            this.state.requestsProcessed++;
            this.state.lastRequestTimestamp = new Date().toISOString();
            
            const processingTime = Date.now() - processingStartTime;
            this.state.averageResponseTime = 
                (this.state.averageResponseTime + processingTime) / 2;
            
            // Include service instance metadata in response object
            enhancedResponse.metadata.performance = {
                ...enhancedResponse.metadata.performance,
                instanceProcessingTime: processingTime,
                instanceRequestCount: this.state.requestsProcessed
            };
            
            // Log request processing with instance information and processing outcomes
            this.logger.info('Request processed by service instance', {
                instanceId: this.metadata.instanceId,
                processingTime: processingTime,
                requestsProcessed: this.state.requestsProcessed,
                statusCode: enhancedResponse.statusCode
            });
            
            // Return service response with instance-specific enhancements and metadata
            return enhancedResponse;
            
        } catch (error) {
            // Apply instance-specific error handling and recovery mechanisms
            this.state.errorsEncountered++;
            
            this.logger.error('Error in instance request processing', {
                instanceId: this.metadata.instanceId,
                error: error.message,
                errorsEncountered: this.state.errorsEncountered
            });
            
            // Return error response with instance context
            return createHelloServiceResponse(
                formatServiceError(error, {
                    instanceId: this.metadata.instanceId,
                    function: 'processRequest'
                }),
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                {
                    instanceId: this.metadata.instanceId,
                    errorType: 'instance_processing_error'
                }
            );
        }
    }
    
    /**
     * Instance method for updating service configuration at runtime with validation 
     * and configuration change handling. Allows dynamic reconfiguration of service instance.
     * 
     * @param {Object} newConfig - New configuration object to apply
     * @returns {boolean} True if configuration was successfully updated, false if update failed
     */
    updateConfiguration(newConfig) {
        try {
            // Validate new configuration object against service configuration schema
            if (!newConfig || typeof newConfig !== 'object') {
                this.logger.warn('Invalid configuration object provided for update', {
                    instanceId: this.metadata.instanceId,
                    providedType: typeof newConfig
                });
                return false;
            }
            
            // Merge new configuration with existing configuration preserving required settings
            const previousConfig = { ...this.config };
            const mergedConfig = {
                ...this.config,
                ...newConfig,
                // Preserve critical instance properties
                name: newConfig.name || this.config.name,
                version: newConfig.version || this.config.version
            };
            
            // Update instance properties and metadata with new configuration values
            this.config = mergedConfig;
            this.metadata.configuration = { ...mergedConfig };
            this.metadata.lastConfigUpdate = new Date().toISOString();
            
            // Apply configuration changes to service behavior and processing logic
            if (newConfig.features) {
                this.capabilities = {
                    ...this.capabilities,
                    ...newConfig.features
                };
            }
            
            // Log configuration update with old and new configuration details
            this.logger.info('Service instance configuration updated', {
                instanceId: this.metadata.instanceId,
                previousConfig: previousConfig,
                newConfig: mergedConfig,
                updateTimestamp: this.metadata.lastConfigUpdate
            });
            
            // Return success status indicating whether configuration update was applied
            return true;
            
        } catch (error) {
            this.logger.error('Failed to update service instance configuration', {
                instanceId: this.metadata.instanceId,
                error: error.message,
                newConfig: newConfig
            });
            
            return false;
        }
    }
    
    /**
     * Instance method that returns performance metrics and operational statistics 
     * for the service instance. Provides comprehensive instance monitoring data.
     * 
     * @returns {Object} Service instance metrics with performance and operational statistics
     */
    getInstanceMetrics() {
        // Collect instance-specific performance metrics and operational counters
        const performanceMetrics = {
            requestsProcessed: this.state.requestsProcessed,
            errorsEncountered: this.state.errorsEncountered,
            averageResponseTime: this.state.averageResponseTime,
            lastRequestTimestamp: this.state.lastRequestTimestamp
        };
        
        // Calculate service instance uptime and processing statistics
        const uptimeMetrics = {
            uptime: Date.now() - this.createdAt.getTime(),
            uptimeFormatted: Math.floor((Date.now() - this.createdAt.getTime()) / 1000) + ' seconds',
            createdAt: this.createdAt.toISOString(),
            status: this.state.status
        };
        
        // Add request processing metrics including success rate and average response time
        const requestMetrics = {
            totalRequests: this.state.requestsProcessed,
            errorRate: this.state.requestsProcessed > 0 ? 
                (this.state.errorsEncountered / this.state.requestsProcessed) * 100 : 0,
            successRate: this.state.requestsProcessed > 0 ? 
                ((this.state.requestsProcessed - this.state.errorsEncountered) / this.state.requestsProcessed) * 100 : 100,
            averageResponseTimeMs: this.state.averageResponseTime
        };
        
        // Include error rate and error handling statistics for instance monitoring
        const errorMetrics = {
            totalErrors: this.state.errorsEncountered,
            errorTypes: {}, // Would be populated with actual error tracking
            lastErrorTimestamp: null, // Would be tracked in real implementation
            errorRecoveryRate: 100 // Assuming all errors are handled gracefully
        };
        
        // Add resource usage and efficiency metrics for performance monitoring
        const resourceMetrics = {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            nodeVersion: process.version,
            platform: process.platform
        };
        
        // Return comprehensive service instance metrics object
        return {
            instance: {
                id: this.metadata.instanceId,
                name: this.serviceName,
                version: this.serviceVersion
            },
            performance: performanceMetrics,
            uptime: uptimeMetrics,
            requests: requestMetrics,
            errors: errorMetrics,
            resources: resourceMetrics,
            metadata: {
                collectedAt: new Date().toISOString(),
                format: 'instance_metrics_v1'
            }
        };
    }
}

// Export all service functions and classes for application use
module.exports = {
    // Primary function for generating hello world responses for the /hello endpoint
    generateHelloResponse,
    
    // Request validation function for hello endpoint with comprehensive validation logic
    validateHelloRequest,
    
    // Main service processing function orchestrating hello request workflow and business logic
    processHelloRequest,
    
    // Factory function for creating standardized service response objects with consistent structure
    createHelloServiceResponse,
    
    // Service metadata retrieval function providing service information and capabilities
    getHelloServiceMetadata,
    
    // HelloService class for instance-based service operations with state management and advanced capabilities
    HelloService,
    
    // Service error formatting utility for consistent error handling and reporting
    formatServiceError,
    
    // Request context factory for service layer processing with service-specific metadata
    createRequestContext
};