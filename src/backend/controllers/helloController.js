/**
 * Express.js Hello Controller Module for Node.js Tutorial Application
 * 
 * This controller module implements the presentation layer of the MVC architecture for the
 * Node.js tutorial application, specifically handling HTTP request processing for the /hello
 * endpoint. Demonstrates Express.js 5.1.0 controller patterns, request-response cycle 
 * management, middleware integration, and educational-focused HTTP server development.
 * 
 * Features:
 * - Comprehensive HTTP request processing and validation
 * - Service layer delegation with standardized request context
 * - Robust error handling with Express.js error middleware integration
 * - Standardized response formatting using response handler utilities
 * - Extensive logging and monitoring for development and debugging
 * - Educational implementation demonstrating Node.js v22.x LTS capabilities
 * 
 * Architecture:
 * - Follows MVC pattern with clear separation of concerns
 * - Integrates with service layer for business logic processing
 * - Utilizes utility modules for consistent logging and response formatting
 * - Implements Express.js middleware patterns for error handling
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import service layer functions for hello request processing and business logic delegation
const { 
    processHelloRequest, 
    validateHelloRequest, 
    createRequestContext 
} = require('../services/helloService.js');

// Import logger factory for creating component-specific loggers with consistent configuration
const { getLogger } = require('../utils/logger.js');

// Import HTTP status code constants for consistent response status handling across controller endpoints
const { 
    HTTP_STATUS, 
    HTTP_METHODS, 
    ERROR_MESSAGES, 
    ROUTES 
} = require('../utils/constants.js');

// Import response formatting utilities for standardized HTTP response generation and error handling
const { 
    formatSuccessResponse, 
    formatErrorResponse 
} = require('../middleware/responseHandler.js');

// Import validation result class for consistent validation outcomes and error reporting
const { ValidationResult } = require('../utils/validator.js');

// Initialize component-specific logger for controller operations with consistent naming convention
const logger = getLogger('helloController');

// Controller identification constants for metadata and logging purposes
const CONTROLLER_NAME = 'HelloController';
const CONTROLLER_VERSION = '1.0.0';

/**
 * Main Express.js route handler function for GET /hello endpoint that orchestrates request
 * processing, service delegation, response formatting, and error handling with comprehensive
 * logging and monitoring capabilities.
 * 
 * This function implements the complete request-response cycle for the hello endpoint,
 * demonstrating Express.js controller patterns and Node.js HTTP server development practices.
 * Handles request validation, service layer integration, response formatting, and error
 * management while maintaining educational clarity and production-ready code structure.
 * 
 * @param {Object} req - Express.js request object containing HTTP request data, headers, and metadata
 * @param {Object} res - Express.js response object for sending HTTP responses to clients
 * @param {Function} next - Express.js next middleware function for error forwarding and middleware chaining
 * @returns {void} Sends HTTP response to client or forwards error to Express.js error middleware
 */
async function handleHelloRequest(req, res, next) {
    // Generate unique request correlation ID for tracking and debugging across service calls
    const requestId = generateRequestId();
    
    try {
        // Log incoming request with method, path, headers, and client information for comprehensive tracking
        logger.info('Processing hello request', {
            requestId,
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            clientIp: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString(),
            controller: CONTROLLER_NAME,
            version: CONTROLLER_VERSION
        });

        // Record request start time for performance monitoring and response time calculation
        const requestStartTime = Date.now();

        // Create standardized request context using service layer utility for consistent service integration
        const requestContext = await createControllerRequestContext(req, res, requestId);
        logger.debug('Request context created successfully', {
            requestId,
            contextFields: Object.keys(requestContext).length,
            hasRequestObject: Boolean(requestContext.req),
            hasResponseObject: Boolean(requestContext.res)
        });

        // Validate HTTP request method against expected GET method with detailed error reporting
        const methodValidation = validateRequestMethod(req);
        if (methodValidation.hasErrors()) {
            logger.warn('Request method validation failed', {
                requestId,
                method: req.method,
                expectedMethod: HTTP_METHODS.GET,
                errors: methodValidation.getErrorMessages()
            });

            // Handle method validation errors by formatting error response and returning appropriate status
            const errorResponse = formatErrorResponse(
                new Error(ERROR_MESSAGES.METHOD_NOT_ALLOWED),
                req,
                HTTP_STATUS.METHOD_NOT_ALLOWED,
                { 
                    metadata: { requestId, validationErrors: methodValidation.getErrorMessages() },
                    code: 'METHOD_NOT_ALLOWED'
                }
            );

            return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json(errorResponse);
        }

        // Validate request using service layer validation function with comprehensive checking
        logger.debug('Initiating service layer request validation', {
            requestId,
            validationContext: requestContext
        });

        const validationResult = await validateHelloRequest(requestContext);
        if (validationResult.hasErrors()) {
            logger.warn('Service layer validation failed', {
                requestId,
                errors: validationResult.getErrorMessages(),
                validationContext: 'service_layer'
            });

            // Handle validation errors by formatting error response and returning BAD_REQUEST status
            const validationErrorResponse = formatErrorResponse(
                new Error(ERROR_MESSAGES.BAD_REQUEST),
                req,
                HTTP_STATUS.BAD_REQUEST,
                {
                    metadata: { 
                        requestId, 
                        validationErrors: validationResult.getErrorMessages(),
                        controller: CONTROLLER_NAME 
                    },
                    code: 'VALIDATION_FAILED'
                }
            );

            return res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse);
        }

        // Process valid request using service layer function with business logic delegation
        logger.debug('Processing request through service layer', {
            requestId,
            serviceFunction: 'processHelloRequest',
            requestContext: 'validated'
        });

        const serviceResponse = await processHelloRequest(requestContext);
        logger.debug('Service layer processing completed', {
            requestId,
            serviceResponseStatus: serviceResponse.status,
            hasData: Boolean(serviceResponse.data),
            processingTime: Date.now() - requestStartTime
        });

        // Handle service response using utility function for standardized response formatting
        await handleServiceResponse(serviceResponse, res, requestId, requestStartTime);

        // Log successful request completion with response status, timing, and processing metadata
        const processingTime = Date.now() - requestStartTime;
        logger.info('Hello request processed successfully', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: serviceResponse.status || HTTP_STATUS.OK,
            processingTime: `${processingTime}ms`,
            responseSize: JSON.stringify(serviceResponse.data || 'Hello world').length,
            controller: CONTROLLER_NAME,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // Handle any controller errors using comprehensive error handling function with Express middleware forwarding
        logger.error('Error occurred during hello request processing', {
            requestId,
            error: error.message,
            stack: error.stack,
            method: req.method,
            path: req.path,
            controller: CONTROLLER_NAME,
            timestamp: new Date().toISOString()
        });

        // Forward error to Express.js error middleware using handleControllerError function
        handleControllerError(error, req, res, next, requestId);
    }
}

/**
 * Validates HTTP request method against expected GET method for hello endpoint with detailed
 * validation error reporting and method-specific error handling using ValidationResult class
 * for consistent validation outcomes.
 * 
 * @param {Object} req - Express.js request object containing HTTP method and request metadata
 * @returns {ValidationResult} Validation result indicating method validation status with error details
 */
function validateRequestMethod(req) {
    try {
        // Initialize ValidationResult instance to track method validation outcomes with detailed error reporting
        const result = new ValidationResult();

        // Extract HTTP method from Express.js request object for validation against expected method
        const requestMethod = req.method;
        logger.debug('Validating request method', {
            requestMethod,
            expectedMethod: HTTP_METHODS.GET,
            validationContext: 'method_validation'
        });

        // Compare request method against HTTP_METHODS.GET constant for exact match validation
        if (requestMethod !== HTTP_METHODS.GET) {
            // Add validation error to ValidationResult with method-specific error message and context
            result.addError(
                `Invalid HTTP method: ${requestMethod}. Expected: ${HTTP_METHODS.GET}`,
                'method',
                {
                    code: 'INVALID_METHOD',
                    expectedMethod: HTTP_METHODS.GET,
                    actualMethod: requestMethod,
                    supportedMethods: [HTTP_METHODS.GET]
                }
            );

            logger.debug('Method validation failed', {
                requestMethod,
                expectedMethod: HTTP_METHODS.GET,
                errorMessage: result.getErrorMessages()[0]
            });
        } else {
            logger.debug('Method validation passed', {
                requestMethod,
                validationResult: 'success'
            });
        }

        // Return ValidationResult with method validation status and comprehensive error information
        return result;

    } catch (error) {
        // Handle validation errors gracefully with fallback ValidationResult containing error details
        logger.error('Error during method validation', {
            error: error.message,
            stack: error.stack,
            requestMethod: req?.method || 'unknown'
        });

        const errorResult = new ValidationResult();
        errorResult.addError(
            'Method validation process failed',
            'method',
            { code: 'VALIDATION_PROCESS_ERROR', originalError: error.message }
        );

        return errorResult;
    }
}

/**
 * Creates standardized request context object from Express.js request and response objects
 * for service layer integration with controller-specific metadata and processing information.
 * Enhances the service layer context with controller-specific data and request correlation.
 * 
 * @param {Object} req - Express.js request object containing HTTP request data and metadata
 * @param {Object} res - Express.js response object for HTTP response handling
 * @param {string} requestId - Unique request correlation ID for tracking and debugging
 * @returns {Object} Request context object with Express objects, metadata, and controller information
 */
async function createControllerRequestContext(req, res, requestId) {
    try {
        logger.debug('Creating controller request context', {
            requestId,
            method: req.method,
            path: req.path,
            hasQuery: Object.keys(req.query || {}).length > 0,
            hasParams: Object.keys(req.params || {}).length > 0
        });

        // Create base request context using service layer utility with Express req and res references
        const baseContext = await createRequestContext(req, res);

        // Extract comprehensive request metadata including headers, client information, and timing data
        const requestMetadata = extractRequestMetadata(req);

        // Add controller-specific context and metadata with request correlation information
        const controllerContext = {
            ...baseContext,
            requestId,
            controller: {
                name: CONTROLLER_NAME,
                version: CONTROLLER_VERSION,
                timestamp: new Date().toISOString()
            },
            request: {
                ...requestMetadata,
                correlationId: requestId,
                processingStartTime: Date.now()
            },
            response: {
                correlationId: requestId,
                controller: CONTROLLER_NAME
            }
        };

        logger.debug('Controller request context created successfully', {
            requestId,
            contextKeys: Object.keys(controllerContext),
            controllerName: CONTROLLER_NAME,
            hasMetadata: Boolean(controllerContext.request)
        });

        // Return complete request context ready for service layer processing with controller enhancements
        return controllerContext;

    } catch (error) {
        // Handle context creation errors gracefully with fallback context object
        logger.error('Error creating controller request context', {
            requestId,
            error: error.message,
            stack: error.stack
        });

        // Return minimal fallback context if creation fails to ensure continued operation
        return {
            req,
            res,
            requestId,
            controller: {
                name: CONTROLLER_NAME,
                version: CONTROLLER_VERSION,
                error: 'Context creation failed'
            },
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Processes service layer response and converts it to appropriate HTTP response using response
 * handler utilities with status code management and error handling. Formats responses consistently
 * and handles various response scenarios from the service layer.
 * 
 * @param {Object} serviceResponse - Service layer response object with data, status, and metadata
 * @param {Object} res - Express.js response object for sending HTTP responses to clients
 * @param {string} requestId - Request correlation ID for tracking and debugging
 * @param {number} requestStartTime - Request start timestamp for performance calculation
 * @returns {void} Sends formatted HTTP response to client using Express.js response object
 */
async function handleServiceResponse(serviceResponse, res, requestId, requestStartTime) {
    try {
        logger.debug('Processing service response', {
            requestId,
            serviceStatus: serviceResponse.status,
            hasData: Boolean(serviceResponse.data),
            hasError: Boolean(serviceResponse.error),
            responseType: serviceResponse.error ? 'error' : 'success'
        });

        // Calculate request processing time for performance monitoring and logging
        const processingTime = Date.now() - requestStartTime;

        // Check for service errors and handle error response formatting if needed
        if (serviceResponse.error) {
            logger.warn('Service layer returned error response', {
                requestId,
                error: serviceResponse.error,
                serviceStatus: serviceResponse.status,
                processingTime: `${processingTime}ms`
            });

            // Format error response using response handler utility with service error details
            const errorResponse = formatErrorResponse(
                serviceResponse.error,
                res.req,
                serviceResponse.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                {
                    metadata: {
                        requestId,
                        controller: CONTROLLER_NAME,
                        processingTime: `${processingTime}ms`,
                        serviceResponse: true
                    }
                }
            );

            return res.status(serviceResponse.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
        }

        // Determine appropriate HTTP status code based on service response status or default to OK
        const httpStatusCode = serviceResponse.status || HTTP_STATUS.OK;

        // Create controller response metadata with processing information and performance metrics
        const responseMetadata = {
            requestId,
            controller: CONTROLLER_NAME,
            version: CONTROLLER_VERSION,
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString(),
            endpoint: ROUTES.HELLO
        };

        // Format successful response using response handler utility with consistent structure and metadata
        const successResponse = formatSuccessResponse(
            serviceResponse.data,
            httpStatusCode,
            responseMetadata,
            res.req
        );

        logger.debug('Formatted successful response', {
            requestId,
            statusCode: httpStatusCode,
            hasData: Boolean(successResponse.data),
            responseSize: JSON.stringify(successResponse).length,
            processingTime: `${processingTime}ms`
        });

        // Send formatted response to client using Express.js res.json() method with appropriate status
        res.status(httpStatusCode).json(successResponse);

    } catch (error) {
        // Handle response processing errors gracefully with fallback error response
        logger.error('Error handling service response', {
            requestId,
            error: error.message,
            stack: error.stack,
            serviceResponse: serviceResponse
        });

        // Send fallback error response if response processing fails
        const fallbackErrorResponse = formatErrorResponse(
            new Error(ERROR_MESSAGES.INTERNAL_SERVER_ERROR),
            res.req,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            {
                metadata: {
                    requestId,
                    controller: CONTROLLER_NAME,
                    error: 'Response processing failed'
                }
            }
        );

        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(fallbackErrorResponse);
    }
}

/**
 * Comprehensive error handling function for controller-level errors including error classification,
 * logging, response formatting, and Express.js error middleware integration. Handles various error
 * types and provides appropriate error responses while maintaining system stability.
 * 
 * @param {Object} error - Error object containing message, stack trace, and error classification
 * @param {Object} req - Express.js request object for error context and correlation
 * @param {Object} res - Express.js response object for sending error responses to clients
 * @param {Function} next - Express.js next middleware function for error forwarding and middleware chaining
 * @param {string} requestId - Request correlation ID for error tracking and debugging correlation
 * @returns {void} Handles error processing and sends error response or forwards to Express.js error middleware
 */
function handleControllerError(error, req, res, next, requestId) {
    try {
        // Log comprehensive controller error with stack trace, request context, and error classification
        logger.error('Controller error occurred', {
            requestId,
            error: error.message,
            stack: error.stack,
            errorType: error.constructor.name,
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            controller: CONTROLLER_NAME,
            timestamp: new Date().toISOString()
        });

        // Determine error type and severity for appropriate error handling strategy
        const errorClassification = classifyError(error);
        logger.debug('Error classified', {
            requestId,
            classification: errorClassification,
            severity: errorClassification.severity,
            recoverable: errorClassification.recoverable
        });

        // Check if error originated from service layer or controller processing for appropriate handling
        if (errorClassification.severity === 'critical' || !errorClassification.recoverable) {
            logger.error('Critical error detected, forwarding to Express error middleware', {
                requestId,
                error: error.message,
                classification: errorClassification,
                controller: CONTROLLER_NAME
            });

            // Forward critical errors to Express.js error middleware using next() function for proper handling
            return next(error);
        }

        // Create standardized error response using response handler utility with error details and correlation
        const errorResponse = formatErrorResponse(
            error,
            req,
            errorClassification.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
            {
                metadata: {
                    requestId,
                    controller: CONTROLLER_NAME,
                    errorClassification,
                    timestamp: new Date().toISOString()
                },
                code: errorClassification.code || 'CONTROLLER_ERROR'
            }
        );

        // Set appropriate HTTP status code based on error type and severity classification
        const statusCode = errorClassification.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

        logger.debug('Sending controller error response', {
            requestId,
            statusCode,
            errorCode: errorClassification.code,
            controller: CONTROLLER_NAME
        });

        // Send error response to client with appropriate status code and formatted error details
        res.status(statusCode).json(errorResponse);

    } catch (handlingError) {
        // Handle error handling errors gracefully with fallback to Express error middleware
        logger.error('Error in error handler', {
            requestId,
            originalError: error.message,
            handlingError: handlingError.message,
            stack: handlingError.stack,
            controller: CONTROLLER_NAME
        });

        // Forward to Express.js error middleware as last resort for unhandleable errors
        next(handlingError);
    }
}

/**
 * Factory function for creating standardized controller response objects with consistent structure,
 * metadata, timing information, and controller-specific enhancements for uniform response formatting.
 * 
 * @param {any} data - Response data payload to include in the standardized response object
 * @param {number} statusCode - HTTP status code for the response (defaults to 200 OK)
 * @param {Object} metadata - Additional metadata to merge with default controller response metadata
 * @returns {Object} Standardized controller response object with data, status, metadata, and controller information
 */
function createControllerResponse(data, statusCode = HTTP_STATUS.OK, metadata = {}) {
    try {
        // Create base controller response object with standard structure and properties for consistency
        const baseResponse = {
            success: statusCode >= 200 && statusCode < 300,
            status: statusCode,
            timestamp: new Date().toISOString(),
            controller: {
                name: CONTROLLER_NAME,
                version: CONTROLLER_VERSION
            }
        };

        // Set response data from provided data parameter or default hello world content
        baseResponse.data = data !== undefined ? data : 'Hello world';

        // Add controller metadata including controller name, version, and processing information
        const controllerMetadata = {
            controller: CONTROLLER_NAME,
            version: CONTROLLER_VERSION,
            generated: new Date().toISOString(),
            endpoint: ROUTES.HELLO,
            ...metadata
        };

        // Merge provided metadata with default controller response metadata for comprehensive response context
        baseResponse.metadata = controllerMetadata;

        logger.debug('Controller response created', {
            statusCode,
            hasData: Boolean(baseResponse.data),
            metadataFields: Object.keys(controllerMetadata).length,
            controller: CONTROLLER_NAME
        });

        // Return standardized controller response object ready for HTTP response formatting
        return baseResponse;

    } catch (error) {
        // Handle response creation errors gracefully with minimal fallback response
        logger.error('Error creating controller response', {
            error: error.message,
            stack: error.stack,
            providedStatusCode: statusCode,
            controller: CONTROLLER_NAME
        });

        // Return minimal response structure if creation fails
        return {
            success: false,
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            data: 'Response creation failed',
            timestamp: new Date().toISOString(),
            error: {
                message: 'Controller response creation error',
                controller: CONTROLLER_NAME
            }
        };
    }
}

/**
 * Comprehensive request processing logging function that captures request details, processing timing,
 * response information, and operational metadata for monitoring and debugging purposes. Provides
 * structured logging for request lifecycle tracking and performance analysis.
 * 
 * @param {Object} req - Express.js request object containing HTTP request data and headers
 * @param {Object} res - Express.js response object containing response status and metadata
 * @param {Object} processingData - Processing data including timing, service calls, and performance metrics
 * @returns {void} Outputs structured log entries for request processing tracking and monitoring
 */
function logRequestProcessing(req, res, processingData = {}) {
    try {
        // Extract comprehensive request details including method, path, headers, client IP, and user agent
        const requestDetails = {
            method: req.method,
            path: req.path || req.url,
            query: req.query,
            params: req.params,
            headers: {
                userAgent: req.get('User-Agent'),
                contentType: req.get('Content-Type'),
                acceptHeader: req.get('Accept'),
                authorization: req.get('Authorization') ? '[REDACTED]' : undefined
            },
            client: {
                ip: req.ip || req.connection?.remoteAddress,
                ips: req.ips,
                protocol: req.protocol,
                secure: req.secure
            }
        };

        // Calculate request processing time from start to completion for performance metrics and monitoring
        const processingTime = processingData.startTime ? 
            Date.now() - processingData.startTime : 
            processingData.processingTime || 0;

        // Create structured log entry with request ID, status code, and response metadata for comprehensive tracking
        const logEntry = {
            requestId: processingData.requestId || generateRequestId(),
            request: requestDetails,
            response: {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headersSent: res.headersSent
            },
            processing: {
                time: `${processingTime}ms`,
                controller: CONTROLLER_NAME,
                version: CONTROLLER_VERSION,
                timestamp: new Date().toISOString()
            },
            ...processingData
        };

        // Include controller processing details and service layer interaction information for detailed analysis
        if (processingData.serviceLayer) {
            logEntry.serviceLayer = {
                called: Boolean(processingData.serviceLayer.called),
                duration: processingData.serviceLayer.duration,
                success: Boolean(processingData.serviceLayer.success)
            };
        }

        // Add error information if request processing encountered errors or validation failures
        if (processingData.errors && processingData.errors.length > 0) {
            logEntry.errors = processingData.errors.map(error => ({
                message: error.message,
                type: error.type || error.constructor?.name,
                code: error.code
            }));
        }

        // Output log entry using appropriate log level (INFO for success, ERROR for failures) based on response status
        if (res.statusCode >= 200 && res.statusCode < 400) {
            logger.info('Request processed successfully', logEntry);
        } else if (res.statusCode >= 400 && res.statusCode < 500) {
            logger.warn('Client error in request processing', logEntry);
        } else {
            logger.error('Server error in request processing', logEntry);
        }

    } catch (error) {
        // Handle logging errors gracefully to prevent logging failures from affecting request processing
        logger.error('Error in request processing logging', {
            error: error.message,
            stack: error.stack,
            controller: CONTROLLER_NAME,
            originalProcessingData: processingData
        });
    }
}

/**
 * Extracts comprehensive metadata from Express.js request object including headers, client information,
 * timing data, and request-specific details for logging and processing. Provides standardized
 * request metadata extraction for consistent request context creation.
 * 
 * @param {Object} req - Express.js request object containing HTTP headers, client info, and request data
 * @returns {Object} Request metadata object with headers, client info, timing, and request details
 */
function extractRequestMetadata(req) {
    try {
        // Extract HTTP headers and normalize header names for consistent processing and security
        const headers = {};
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        
        // Process request headers while redacting sensitive authentication and security headers
        Object.keys(req.headers || {}).forEach(headerName => {
            const headerValue = req.headers[headerName];
            if (sensitiveHeaders.includes(headerName.toLowerCase())) {
                headers[headerName] = '[REDACTED]';
            } else {
                headers[headerName] = headerValue;
            }
        });

        // Collect comprehensive client information including IP address, user agent, and connection details
        const clientInfo = {
            ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
            ips: req.ips || [],
            userAgent: req.get('User-Agent') || 'unknown',
            protocol: req.protocol || 'http',
            secure: Boolean(req.secure),
            hostname: req.hostname || req.get('Host') || 'unknown',
            originalUrl: req.originalUrl || req.url || '/',
            baseUrl: req.baseUrl || ''
        };

        // Extract request timing information and processing duration for performance tracking
        const timingInfo = {
            requestTime: new Date().toISOString(),
            startTime: req._startTime || req.startTime || Date.now(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // Include comprehensive request method, path, query parameters, and route information
        const requestInfo = {
            method: req.method || 'UNKNOWN',
            path: req.path || req.url || '/',
            query: req.query || {},
            params: req.params || {},
            body: req.body && Object.keys(req.body).length > 0 ? '[REQUEST_BODY]' : undefined,
            cookies: req.cookies && Object.keys(req.cookies).length > 0 ? '[COOKIES]' : undefined
        };

        // Add request correlation ID and tracing information for distributed request tracking
        const correlationInfo = {
            correlationId: req.get('X-Correlation-ID') || req.get('x-request-id') || generateRequestId(),
            traceId: req.get('X-Trace-ID') || undefined,
            spanId: req.get('X-Span-ID') || undefined
        };

        // Return complete request metadata object for logging and service processing with all collected information
        const metadata = {
            headers,
            client: clientInfo,
            timing: timingInfo,
            request: requestInfo,
            correlation: correlationInfo,
            route: {
                matched: Boolean(req.route),
                path: req.route?.path,
                methods: req.route?.methods
            }
        };

        logger.debug('Request metadata extracted successfully', {
            headerCount: Object.keys(headers).length,
            clientIp: clientInfo.ip,
            method: requestInfo.method,
            path: requestInfo.path,
            correlationId: correlationInfo.correlationId
        });

        return metadata;

    } catch (error) {
        // Handle metadata extraction errors gracefully with fallback metadata object
        logger.error('Error extracting request metadata', {
            error: error.message,
            stack: error.stack,
            hasRequest: Boolean(req)
        });

        // Return minimal metadata if extraction fails to ensure continued operation
        return {
            headers: {},
            client: { ip: 'unknown', userAgent: 'unknown' },
            timing: { requestTime: new Date().toISOString() },
            request: { 
                method: req?.method || 'UNKNOWN', 
                path: req?.path || req?.url || '/' 
            },
            correlation: { correlationId: generateRequestId() },
            error: 'Metadata extraction failed'
        };
    }
}

// Helper Functions for Internal Controller Operations

/**
 * Generates unique request correlation IDs for tracking and debugging across service calls
 * and system components. Provides consistent request identification throughout the application.
 * 
 * @returns {string} Unique request correlation ID with timestamp and random components
 */
function generateRequestId() {
    const timestamp = Date.now();
    const randomComponent = Math.random().toString(36).substring(2, 8);
    const processId = process.pid.toString(36);
    return `req-${timestamp}-${randomComponent}-${processId}`;
}

/**
 * Classifies errors based on type, message, and properties for appropriate error handling
 * and response generation. Provides consistent error categorization and status code determination.
 * 
 * @param {Object} error - Error object to classify and analyze
 * @returns {Object} Error classification with severity, status code, and handling strategy
 */
function classifyError(error) {
    const classification = {
        severity: 'medium',
        recoverable: true,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        code: 'CONTROLLER_ERROR',
        category: 'internal'
    };

    // Classify based on error type and properties
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
        classification.severity = 'low';
        classification.statusCode = HTTP_STATUS.BAD_REQUEST;
        classification.code = 'VALIDATION_ERROR';
        classification.category = 'client';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        classification.severity = 'high';
        classification.recoverable = false;
        classification.code = 'CONNECTION_ERROR';
        classification.category = 'network';
    } else if (error.message?.includes('timeout')) {
        classification.severity = 'medium';
        classification.statusCode = HTTP_STATUS.REQUEST_TIMEOUT || 408;
        classification.code = 'TIMEOUT_ERROR';
        classification.category = 'performance';
    } else if (error.stack?.includes('OutOfMemoryError')) {
        classification.severity = 'critical';
        classification.recoverable = false;
        classification.code = 'MEMORY_ERROR';
        classification.category = 'system';
    }

    return classification;
}

// Export all controller functions and utilities for use in Express.js routing and application integration
module.exports = {
    // Main Express.js route handler for GET /hello endpoint with comprehensive request processing and error handling
    handleHelloRequest,
    
    // HTTP method validation utility for request processing and validation error handling
    validateRequestMethod,
    
    // Request context factory for standardized service layer integration with controller metadata
    createRequestContext: createControllerRequestContext,
    
    // Service response processing utility for HTTP response generation and formatting
    handleServiceResponse,
    
    // Controller error handling utility for Express.js error middleware integration and standardized error processing
    handleControllerError,
    
    // Response factory function for creating standardized controller response objects with consistent structure and metadata
    createControllerResponse,
    
    // Request processing logging utility for comprehensive monitoring and debugging support
    logRequestProcessing,
    
    // Request metadata extraction utility for consistent request context creation and logging
    extractRequestMetadata
};