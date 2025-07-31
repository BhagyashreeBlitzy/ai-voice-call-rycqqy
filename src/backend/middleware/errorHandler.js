/**
 * Comprehensive Express.js Error Handling Middleware Module for Node.js Tutorial Application
 * 
 * This module provides centralized error processing, classification, and response formatting
 * for the Node.js tutorial application. Implements Express.js 5.1.0 enhanced error handling
 * features including automatic Promise rejection handling, comprehensive error classification,
 * sanitized error responses, and environment-specific error processing.
 * 
 * Serves as the final middleware in the Express.js middleware stack to catch and process
 * all application errors with consistent error response formatting and educational debugging
 * capabilities for learning Node.js error handling patterns.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import logger factory for error handler component-scoped logging and error tracking
const { getLogger } = require('../utils/logger.js');

// Import HTTP status code constants for standardized error response status handling
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import standardized error message constants for consistent error response content
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import application metadata for error response context and debugging information
const { 
    APPLICATION 
} = require('../utils/constants.js');

// Import standardized error response formatting utility for consistent error response structure
const { 
    formatErrorResponse 
} = require('./responseHandler.js');

// Import error message sanitization utility for preventing sensitive information disclosure
const { 
    sanitizeErrorMessage 
} = require('./responseHandler.js');

// Import response metadata creation utility for error response enrichment
const { 
    createResponseMetadata 
} = require('./responseHandler.js');

// Import development environment detection for development-specific error handling and debugging information
const { 
    isDevelopmentEnvironment 
} = require('../utils/environment.js');

// Import production environment detection for production-specific error sanitization and security
const { 
    isProductionEnvironment 
} = require('../utils/environment.js');

// Import test environment detection for test-specific error handling and validation
const { 
    isTestEnvironment 
} = require('../utils/environment.js');

// Initialize component-specific logger for error handler operations and debugging
const logger = getLogger('errorHandler');

// Middleware name constant for consistent identification across logging and metadata
const MIDDLEWARE_NAME = 'ErrorHandler';

// Error handler version constant for version tracking and debugging purposes
const ERROR_HANDLER_VERSION = '1.0.0';

// Default error status constant for fallback error response handling
const DEFAULT_ERROR_STATUS = HTTP_STATUS.INTERNAL_SERVER_ERROR;

// Default error message constant for consistent fallback error responses
const DEFAULT_ERROR_MESSAGE = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

/**
 * Main Express.js error handling middleware function that processes all application errors
 * with comprehensive error classification, response formatting, and logging. Implements
 * Express.js 5.1.0 enhanced error handling patterns including automatic Promise rejection
 * handling and environment-specific error processing for educational and production use cases.
 * 
 * @param {Object} error - Error object containing error details, stack trace, and metadata
 * @param {Object} req - Express.js request object with client request information
 * @param {Object} res - Express.js response object for sending formatted error responses
 * @param {Function} next - Express.js next function for middleware chain continuation
 * @returns {void} Processes error and sends formatted HTTP error response to client
 */
function errorHandler(error, req, res, next) {
    try {
        // Log incoming error with error type, message, and request context for debugging and monitoring
        const errorId = generateErrorId(req);
        logger.error('Error handler processing error', {
            errorId,
            errorType: error.constructor?.name || 'Unknown',
            errorMessage: error.message,
            requestMethod: req?.method,
            requestPath: req?.path || req?.url,
            userAgent: req?.get?.('User-Agent'),
            timestamp: new Date().toISOString()
        });

        // Classify error type using classifyError function to determine appropriate handling strategy
        const errorClassification = classifyError(error, req);
        
        // Extract or determine appropriate HTTP status code from error object or default to 500
        const statusCode = error.statusCode || error.status || errorClassification.statusCode || DEFAULT_ERROR_STATUS;
        
        // Create request correlation ID for error tracking and distributed tracing support
        const correlationId = req.get('X-Correlation-ID') || errorId;
        
        // Sanitize error message based on environment using sanitizeErrorMessage function
        const sanitizedMessage = sanitizeErrorMessage(
            error.message || DEFAULT_ERROR_MESSAGE,
            isDevelopmentEnvironment(),
            { correlationId, errorType: error.constructor?.name }
        );

        // Create comprehensive error metadata using createResponseMetadata function
        const errorMetadata = createResponseMetadata(req, {
            errorId,
            errorType: error.constructor?.name || 'UnknownError',
            errorCode: error.code || 'UNKNOWN_ERROR',
            classification: errorClassification,
            processingTime: Date.now() - (req._startTime || Date.now()),
            middleware: {
                name: MIDDLEWARE_NAME,
                version: ERROR_HANDLER_VERSION
            }
        });

        // Format error response using formatErrorResponse utility for consistent structure
        const errorResponse = formatErrorResponse(
            {
                ...error,
                message: sanitizedMessage,
                id: errorId,
                classification: errorClassification
            },
            req,
            statusCode,
            {
                correlationId,
                includeStackTrace: isDevelopmentEnvironment(),
                sanitizeErrors: isProductionEnvironment(),
                metadata: errorMetadata
            }
        );

        // Add environment-specific debugging information if in development mode
        if (isDevelopmentEnvironment()) {
            errorResponse.debug = {
                ...errorResponse.debug,
                originalError: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                },
                errorHandler: {
                    middleware: MIDDLEWARE_NAME,
                    version: ERROR_HANDLER_VERSION,
                    processedAt: new Date().toISOString()
                },
                requestDetails: {
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    params: req.params,
                    query: req.query
                }
            };
        }

        // Send formatted error response to client using Express.js res.status().json() methods
        if (!res.headersSent) {
            res.status(statusCode).json(errorResponse);
        }

        // Log error handling completion with response status and error correlation ID
        logErrorEvent(error, req, errorClassification, errorId);

    } catch (handlingError) {
        // Handle errors in error handling gracefully to prevent infinite error loops
        logger.error('Error in error handler middleware', {
            handlingError: handlingError.message,
            originalError: error?.message,
            stack: handlingError.stack
        });

        // Send minimal error response if error handling itself fails
        if (!res.headersSent) {
            res.status(DEFAULT_ERROR_STATUS).json({
                success: false,
                status: DEFAULT_ERROR_STATUS,
                error: {
                    message: DEFAULT_ERROR_MESSAGE,
                    type: 'ErrorHandlerFailure',
                    code: 'ERROR_HANDLER_FAILURE'
                },
                timestamp: new Date().toISOString(),
                application: {
                    name: APPLICATION.NAME,
                    version: APPLICATION.VERSION
                }
            });
        }
    }
}

/**
 * Factory function that creates customized error handler middleware with specific configuration
 * options, error handling behavior, and environment-specific settings for different application
 * contexts and use cases.
 * 
 * @param {Object} options - Configuration options for error handler behavior and settings
 * @returns {Function} Configured Express.js error handling middleware function with custom options applied
 */
function createErrorHandler(options = {}) {
    try {
        // Validate and merge provided options with default error handler configuration
        const validatedConfig = validateErrorHandlerConfig(options);
        const defaultConfig = getDefaultErrorHandlerConfig();
        const mergedConfig = { ...defaultConfig, ...validatedConfig };

        logger.debug('Creating custom error handler', {
            hasCustomConfig: Object.keys(options).length > 0,
            configKeys: Object.keys(mergedConfig),
            componentName: mergedConfig.componentName
        });

        // Create closure with custom configuration for consistent error handling behavior
        return function customErrorHandler(error, req, res, next) {
            try {
                // Configure error classification rules and custom error type mappings if provided
                const customClassification = mergedConfig.classifyError ? 
                    mergedConfig.classifyError(error, req) : 
                    classifyError(error, req);

                // Set up custom error message templates and sanitization rules based on options
                const customSanitization = mergedConfig.sanitizeMessage ? 
                    mergedConfig.sanitizeMessage(error.message, isDevelopmentEnvironment()) :
                    sanitizeErrorMessage(error.message, isDevelopmentEnvironment());

                // Configure environment-specific error handling behavior and debugging levels
                const includeDebugInfo = mergedConfig.includeDebugInfo !== false && isDevelopmentEnvironment();
                const includeStackTrace = mergedConfig.includeStackTrace !== false && isDevelopmentEnvironment();

                // Create custom logger instance with component-specific configuration if needed
                const customLogger = mergedConfig.componentName ? 
                    getLogger(`errorHandler-${mergedConfig.componentName}`) : 
                    logger;

                // Generate error ID and metadata
                const errorId = generateErrorId(req);
                const errorMetadata = createResponseMetadata(req, {
                    errorId,
                    customConfig: mergedConfig.componentName,
                    classification: customClassification,
                    ...mergedConfig.defaultMetadata
                });

                // Create custom error response with factory configuration
                const customErrorResponse = formatErrorResponse(
                    {
                        ...error,
                        message: customSanitization,
                        id: errorId,
                        classification: customClassification
                    },
                    req,
                    error.statusCode || customClassification.statusCode || DEFAULT_ERROR_STATUS,
                    {
                        includeStackTrace,
                        includeDebugInfo,
                        metadata: errorMetadata,
                        customOptions: mergedConfig
                    }
                );

                // Log using custom logger
                customLogger.error('Custom error handler processing', {
                    errorId,
                    componentName: mergedConfig.componentName,
                    errorType: error.constructor?.name
                });

                // Send response
                if (!res.headersSent) {
                    res.status(customErrorResponse.status).json(customErrorResponse);
                }

                // Log event with custom configuration
                logErrorEvent(error, req, customClassification, errorId);

            } catch (customHandlingError) {
                // Fallback to default error handler
                logger.warn('Custom error handler failed, falling back to default', {
                    customError: customHandlingError.message,
                    originalError: error.message
                });
                errorHandler(error, req, res, next);
            }
        };

    } catch (factoryError) {
        // Handle factory creation errors gracefully
        logger.error('Error creating custom error handler', { 
            error: factoryError.message,
            options
        });

        // Return default error handler if custom creation fails
        return errorHandler;
    }
}

/**
 * Error classification utility function that analyzes error objects to determine error type,
 * category, severity, and appropriate handling strategy for consistent error processing and
 * response generation across the application.
 * 
 * @param {Object} error - Error object to analyze and classify
 * @param {Object} req - Express.js request object for context-based classification
 * @returns {Object} Error classification result with type, category, severity, status code, and handling recommendations
 */
function classifyError(error, req = null) {
    try {
        // Analyze error object properties including name, message, code, and stack trace
        const errorName = error.name || 'UnknownError';
        const errorMessage = error.message || '';
        const errorCode = error.code || error.statusCode || error.status;

        // Initialize classification result with default values
        const classification = {
            type: errorName,
            category: 'unknown',
            severity: 'medium',
            statusCode: DEFAULT_ERROR_STATUS,
            recoverable: true,
            logLevel: 'error',
            requiresNotification: false
        };

        // Check for Express.js specific error types including validation and routing errors
        if (errorName === 'ValidationError' || errorMessage.includes('validation')) {
            classification.category = 'validation';
            classification.severity = 'low';
            classification.statusCode = HTTP_STATUS.BAD_REQUEST;
            classification.logLevel = 'warn';
            classification.recoverable = true;
        }

        // Identify HTTP-related errors including client errors (4xx) and server errors (5xx)
        if (errorCode) {
            if (errorCode >= 400 && errorCode < 500) {
                classification.category = 'client';
                classification.severity = 'low';
                classification.statusCode = errorCode;
                classification.logLevel = 'warn';
                classification.recoverable = true;
            } else if (errorCode >= 500 && errorCode < 600) {
                classification.category = 'server';
                classification.severity = 'high';
                classification.statusCode = errorCode;
                classification.logLevel = 'error';
                classification.recoverable = false;
                classification.requiresNotification = true;
            }
        }

        // Classify Node.js system errors including file system, network, and runtime errors
        if (errorCode === 'ENOENT') {
            classification.category = 'filesystem';
            classification.severity = 'medium';
            classification.statusCode = HTTP_STATUS.NOT_FOUND;
        } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ECONNRESET') {
            classification.category = 'network';
            classification.severity = 'high';
            classification.statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE || DEFAULT_ERROR_STATUS;
        } else if (errorCode === 'EADDRINUSE') {
            classification.category = 'network';
            classification.severity = 'critical';
            classification.statusCode = DEFAULT_ERROR_STATUS;
            classification.recoverable = false;
            classification.requiresNotification = true;
        }

        // Handle common HTTP error types
        if (errorName === 'NotFoundError' || errorMessage.includes('not found')) {
            classification.category = 'routing';
            classification.severity = 'low';
            classification.statusCode = HTTP_STATUS.NOT_FOUND;
            classification.logLevel = 'info';
        }

        if (errorName === 'UnauthorizedError' || errorMessage.includes('unauthorized')) {
            classification.category = 'authentication';
            classification.severity = 'medium';
            classification.statusCode = HTTP_STATUS.UNAUTHORIZED || DEFAULT_ERROR_STATUS;
            classification.logLevel = 'warn';
        }

        // Determine error severity level (low, medium, high, critical) based on error impact
        if (classification.statusCode >= 500) {
            classification.severity = 'high';
            classification.requiresNotification = true;
        } else if (classification.statusCode >= 400) {
            classification.severity = 'medium';
        }

        // Map error type to appropriate HTTP status code using standard HTTP error codes
        if (!classification.statusCode || classification.statusCode === DEFAULT_ERROR_STATUS) {
            if (errorName.includes('Timeout')) {
                classification.statusCode = HTTP_STATUS.REQUEST_TIMEOUT || DEFAULT_ERROR_STATUS;
            } else if (errorName.includes('NotFound')) {
                classification.statusCode = HTTP_STATUS.NOT_FOUND;
            } else if (errorName.includes('BadRequest') || errorName.includes('Validation')) {
                classification.statusCode = HTTP_STATUS.BAD_REQUEST;
            }
        }

        // Generate error handling recommendations including logging level and response strategy
        classification.recommendations = {
            logLevel: classification.logLevel,
            notifyAdmins: classification.requiresNotification,
            includeStackTrace: isDevelopmentEnvironment() && classification.severity !== 'low',
            sanitizeMessage: isProductionEnvironment() || classification.category === 'security',
            retryable: classification.recoverable && classification.category !== 'validation'
        };

        // Add request context if available
        if (req) {
            classification.context = {
                method: req.method,
                path: req.path || req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection?.remoteAddress
            };
        }

        logger.debug('Error classified', {
            errorType: errorName,
            category: classification.category,
            severity: classification.severity,
            statusCode: classification.statusCode,
            recoverable: classification.recoverable
        });

        // Return comprehensive error classification object with all analysis results
        return classification;

    } catch (classificationError) {
        // Handle classification errors gracefully
        logger.error('Error during error classification', {
            classificationError: classificationError.message,
            originalError: error?.message
        });

        // Return default classification if analysis fails
        return {
            type: 'ClassificationError',
            category: 'system',
            severity: 'high',
            statusCode: DEFAULT_ERROR_STATUS,
            recoverable: false,
            logLevel: 'error',
            requiresNotification: true,
            error: 'Classification failed'
        };
    }
}

/**
 * Async error handling wrapper function that demonstrates Express.js 5.1.0 enhanced async
 * error handling capabilities by properly catching Promise rejections and forwarding them
 * to error handling middleware for educational purposes.
 * 
 * @param {Function} asyncFunction - Async function to wrap with error handling
 * @returns {Function} Wrapped Express.js middleware function with automatic async error handling
 */
function handleAsyncErrors(asyncFunction) {
    try {
        // Validate that the provided function is actually a function
        if (typeof asyncFunction !== 'function') {
            throw new Error('handleAsyncErrors requires a function parameter');
        }

        logger.debug('Creating async error handler wrapper', {
            functionName: asyncFunction.name || 'anonymous',
            isAsync: asyncFunction.constructor.name === 'AsyncFunction'
        });

        // Create wrapper function that accepts Express.js middleware signature (req, res, next)
        return function asyncErrorWrapper(req, res, next) {
            try {
                // Execute provided async function with proper Promise handling and error catching
                const result = asyncFunction(req, res, next);

                // Check if result is a Promise (for async functions)
                if (result && typeof result.catch === 'function') {
                    // Catch any Promise rejections or async errors from the wrapped function
                    result.catch((asyncError) => {
                        logger.debug('Async error caught by wrapper', {
                            errorType: asyncError.constructor?.name,
                            errorMessage: asyncError.message,
                            functionName: asyncFunction.name
                        });

                        // Forward caught errors to Express.js error handling middleware using next(error)
                        next(asyncError);
                    });
                }

                // Demonstrate Express.js 5.1.0 automatic Promise rejection handling capabilities
                if (isDevelopmentEnvironment()) {
                    logger.debug('Express.js 5.1.0 async error handling demonstration', {
                        middleware: 'handleAsyncErrors',
                        automaticPromiseHandling: 'enabled',
                        functionWrapped: asyncFunction.name || 'anonymous'
                    });
                }

                // Log async error handling events for educational debugging and monitoring
                if (isTestEnvironment()) {
                    logger.info('Async error handler executed', {
                        functionName: asyncFunction.name,
                        hasPromise: result && typeof result.catch === 'function',
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (syncError) {
                // Handle synchronous errors that occur during execution
                logger.debug('Synchronous error caught in async wrapper', {
                    errorType: syncError.constructor?.name,
                    errorMessage: syncError.message,
                    functionName: asyncFunction.name
                });

                // Forward synchronous errors to error handling middleware
                next(syncError);
            }
        };

    } catch (wrapperError) {
        // Handle wrapper creation errors gracefully
        logger.error('Error creating async error wrapper', {
            error: wrapperError.message,
            providedFunction: typeof asyncFunction
        });

        // Return wrapped middleware function ready for Express.js route and middleware registration
        return function erroredAsyncWrapper(req, res, next) {
            next(new Error(`Async wrapper creation failed: ${wrapperError.message}`));
        };
    }
}

/**
 * Extracts comprehensive error details from error objects including stack trace, error code,
 * original error information, and context data for thorough error analysis and logging.
 * 
 * @param {Object} error - Error object to extract details from
 * @param {boolean} includeStackTrace - Whether to include stack trace information
 * @returns {Object} Extracted error details with message, stack, code, type, and context information
 */
function extractErrorDetails(error, includeStackTrace = true) {
    try {
        // Handle null or undefined error objects
        if (!error) {
            return {
                message: 'No error provided',
                type: 'MissingError',
                code: 'NO_ERROR',
                stack: null,
                details: {},
                timestamp: new Date().toISOString()
            };
        }

        // Extract basic error information including name, message, and error code
        const errorDetails = {
            message: error.message || 'Unknown error',
            type: error.name || error.constructor?.name || 'UnknownError',
            code: error.code || error.statusCode || error.status || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        };

        // Include stack trace information if requested and available for debugging
        if (includeStackTrace && error.stack) {
            errorDetails.stack = error.stack;
            
            // Parse stack trace to extract source location information
            const stackLines = error.stack.split('\n');
            if (stackLines.length > 1) {
                const topStackFrame = stackLines[1];
                const locationMatch = topStackFrame.match(/\((.+):(\d+):(\d+)\)/);
                if (locationMatch) {
                    errorDetails.location = {
                        file: locationMatch[1],
                        line: parseInt(locationMatch[2]),
                        column: parseInt(locationMatch[3])
                    };
                }
            }
        }

        // Extract original error information if error is wrapped or chained
        if (error.cause || error.originalError || error.inner) {
            const originalError = error.cause || error.originalError || error.inner;
            errorDetails.originalError = {
                message: originalError.message,
                type: originalError.name || originalError.constructor?.name,
                code: originalError.code
            };
        }

        // Identify error source including file, line number, and function context if available
        if (error.fileName || error.lineNumber || error.columnNumber) {
            errorDetails.source = {
                fileName: error.fileName,
                lineNumber: error.lineNumber,
                columnNumber: error.columnNumber
            };
        }

        // Include custom error properties and metadata attached to error object
        const customProperties = {};
        Object.keys(error).forEach(key => {
            if (!['message', 'name', 'stack', 'code', 'statusCode', 'status'].includes(key)) {
                customProperties[key] = error[key];
            }
        });

        if (Object.keys(customProperties).length > 0) {
            errorDetails.customProperties = customProperties;
        }

        // Add error context based on error properties
        if (error.request || error.response) {
            errorDetails.httpContext = {
                hasRequest: Boolean(error.request),
                hasResponse: Boolean(error.response),
                statusCode: error.response?.status || error.statusCode,
                method: error.request?.method,
                url: error.request?.url
            };
        }

        // Sanitize sensitive information from error details based on environment settings
        if (isProductionEnvironment()) {
            // Remove potentially sensitive information in production
            if (errorDetails.stack) {
                errorDetails.stack = '[STACK_TRACE_REMOVED_IN_PRODUCTION]';
            }
            if (errorDetails.customProperties) {
                Object.keys(errorDetails.customProperties).forEach(key => {
                    if (key.toLowerCase().includes('password') || 
                        key.toLowerCase().includes('token') || 
                        key.toLowerCase().includes('secret')) {
                        errorDetails.customProperties[key] = '[REDACTED]';
                    }
                });
            }
        }

        // Add error severity and classification hints
        errorDetails.severity = classifyErrorSeverity(error);
        errorDetails.category = classifyErrorCategory(error);

        logger.debug('Error details extracted', {
            errorType: errorDetails.type,
            hasStack: Boolean(errorDetails.stack),
            hasOriginalError: Boolean(errorDetails.originalError),
            customPropertyCount: Object.keys(errorDetails.customProperties || {}).length
        });

        // Return comprehensive error details object ready for logging and analysis
        return errorDetails;

    } catch (extractionError) {
        // Handle extraction errors gracefully
        logger.error('Error during error details extraction', {
            extractionError: extractionError.message,
            originalError: error?.message
        });

        // Return minimal error details if extraction fails
        return {
            message: error?.message || 'Error details extraction failed',
            type: 'ExtractionError',
            code: 'EXTRACTION_FAILED',
            timestamp: new Date().toISOString(),
            error: extractionError.message
        };
    }
}

/**
 * Generates unique error correlation IDs for error tracking, distributed tracing, and debugging
 * purposes using timestamp-based UUID generation with educational error tracking capabilities.
 * 
 * @param {Object} req - Express.js request object for context-based ID generation
 * @returns {string} Unique error correlation ID for error tracking and request correlation
 */
function generateErrorId(req = null) {
    try {
        // Generate timestamp-based unique identifier using current time and random components
        const timestamp = Date.now();
        const randomComponent = Math.random().toString(36).substring(2, 8);
        const processId = process.pid.toString(36);

        // Include request correlation ID if available from request context
        let requestContext = '';
        if (req) {
            const existingCorrelationId = req.get('X-Correlation-ID') || req.get('x-request-id');
            if (existingCorrelationId) {
                requestContext = `-${existingCorrelationId.substring(0, 8)}`;
            } else {
                const requestMethod = req.method?.toLowerCase() || 'unknown';
                const requestPath = (req.path || req.url || '/').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
                requestContext = `-${requestMethod}-${requestPath}`;
            }
        }

        // Add application instance identifier for distributed system error tracking
        const instanceId = APPLICATION.NAME?.substring(0, 3)?.toLowerCase() || 'app';

        // Format error ID with consistent pattern for easy recognition and parsing
        const errorId = `err-${timestamp}-${randomComponent}-${processId}${requestContext}-${instanceId}`;

        // Log error ID generation for debugging and error tracking audit trail
        logger.debug('Error ID generated', {
            errorId,
            timestamp,
            hasRequestContext: Boolean(requestContext),
            processId: process.pid
        });

        // Return unique error correlation ID ready for error response inclusion
        return errorId;

    } catch (generationError) {
        // Handle ID generation errors gracefully
        logger.error('Error generating error ID', {
            error: generationError.message
        });

        // Return fallback error ID if generation fails
        const fallbackId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-fallback`;
        return fallbackId;
    }
}

/**
 * Logs error events with comprehensive information including error details, request context,
 * classification results, and performance metrics for monitoring, debugging, and educational
 * purposes.
 * 
 * @param {Object} error - Error object containing error information
 * @param {Object} req - Express.js request object with request context
 * @param {Object} errorClassification - Error classification result from classifyError
 * @param {string} errorId - Unique error correlation ID
 * @returns {void} Outputs structured error log entries for monitoring and debugging
 */
function logErrorEvent(error, req, errorClassification, errorId) {
    try {
        // Create structured log entry with error details, classification, and correlation ID
        const logEntry = {
            errorId,
            timestamp: new Date().toISOString(),
            error: {
                type: error.name || 'UnknownError',
                message: error.message,
                code: error.code || 'UNKNOWN_ERROR',
                stack: isDevelopmentEnvironment() ? error.stack : undefined
            },
            classification: errorClassification,
            middleware: {
                name: MIDDLEWARE_NAME,
                version: ERROR_HANDLER_VERSION
            }
        };

        // Include request context information including method, path, and client details
        if (req) {
            logEntry.request = {
                method: req.method,
                url: req.url,
                path: req.path,
                query: req.query,
                params: req.params,
                headers: {
                    'user-agent': req.get('User-Agent'),
                    'x-forwarded-for': req.get('X-Forwarded-For'),
                    'content-type': req.get('Content-Type')
                },
                client: {
                    ip: req.ip || req.connection?.remoteAddress,
                    ips: req.ips
                }
            };
        }

        // Add error handling performance metrics including processing time
        const processingStartTime = req?._startTime || req?.startTime;
        if (processingStartTime) {
            logEntry.performance = {
                processingTime: Date.now() - processingStartTime,
                errorHandlingTime: Date.now()
            };
        }

        // Include environment-specific debugging information based on current environment
        if (isDevelopmentEnvironment()) {
            logEntry.debug = {
                environment: 'development',
                nodeVersion: process.version,
                platform: process.platform,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
                pid: process.pid
            };
        }

        // Add application context
        logEntry.application = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION
        };

        // Use appropriate log level based on error severity (ERROR for server errors, WARN for client errors)
        const logLevel = errorClassification.logLevel || 'error';
        
        switch (logLevel) {
            case 'error':
                logger.error('Error event logged', logEntry);
                break;
            case 'warn':
                logger.warn('Warning event logged', logEntry);
                break;
            case 'info':
                logger.info('Info event logged', logEntry);
                break;
            default:
                logger.error('Error event logged', logEntry);
        }

        // Include error tracking metrics for monitoring and alerting systems
        if (isTestEnvironment()) {
            logger.debug('Error tracking metrics', {
                errorId,
                errorType: error.name,
                statusCode: errorClassification.statusCode,
                severity: errorClassification.severity,
                recoverable: errorClassification.recoverable
            });
        }

    } catch (loggingError) {
        // Handle logging errors gracefully to prevent logging failures from affecting error handling
        logger.error('Error during error event logging', {
            loggingError: loggingError.message,
            originalErrorId: errorId,
            originalError: error?.message
        });

        // Attempt minimal logging if full logging fails
        try {
            logger.error('Minimal error log', {
                errorId,
                errorType: error?.name,
                errorMessage: error?.message,
                timestamp: new Date().toISOString()
            });
        } catch (minimalLoggingError) {
            // If even minimal logging fails, use console as last resort
            console.error('Error handler logging completely failed:', {
                errorId,
                error: error?.message,
                loggingError: loggingError.message
            });
        }
    }
}

/**
 * Validates error handler configuration options to ensure proper middleware setup and prevent
 * runtime errors from misconfiguration, with comprehensive validation rules and fallback values.
 * 
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validated and sanitized error handler configuration with validation results
 */
function validateErrorHandlerConfig(config = {}) {
    try {
        logger.debug('Validating error handler configuration', {
            hasConfig: Boolean(config),
            configKeys: Object.keys(config)
        });

        // Initialize validation result with default values
        const validatedConfig = {
            isValid: true,
            errors: [],
            warnings: [],
            config: {}
        };

        // Validate error handler configuration structure and required properties
        if (typeof config !== 'object' || config === null) {
            validatedConfig.errors.push('Configuration must be an object');
            validatedConfig.isValid = false;
            return { ...validatedConfig, config: getDefaultErrorHandlerConfig() };
        }

        // Validate component name if provided
        if (config.componentName !== undefined) {
            if (typeof config.componentName === 'string' && config.componentName.length > 0) {
                validatedConfig.config.componentName = config.componentName;
            } else {
                validatedConfig.warnings.push('Invalid componentName, using default');
            }
        }

        // Check error classification rules and custom error type mappings for validity
        if (config.classifyError !== undefined) {
            if (typeof config.classifyError === 'function') {
                validatedConfig.config.classifyError = config.classifyError;
            } else {
                validatedConfig.errors.push('classifyError must be a function');
                validatedConfig.isValid = false;
            }
        }

        // Validate logging configuration and log level settings for error handler
        if (config.logLevel !== undefined) {
            const validLogLevels = ['error', 'warn', 'info', 'debug'];
            if (validLogLevels.includes(config.logLevel)) {
                validatedConfig.config.logLevel = config.logLevel;
            } else {
                validatedConfig.warnings.push(`Invalid logLevel '${config.logLevel}', must be one of: ${validLogLevels.join(', ')}`);
            }
        }

        // Verify response formatting options and template configurations
        if (config.includeStackTrace !== undefined) {
            if (typeof config.includeStackTrace === 'boolean') {
                validatedConfig.config.includeStackTrace = config.includeStackTrace;
            } else {
                validatedConfig.warnings.push('includeStackTrace must be boolean');
            }
        }

        if (config.includeDebugInfo !== undefined) {
            if (typeof config.includeDebugInfo === 'boolean') {
                validatedConfig.config.includeDebugInfo = config.includeDebugInfo;
            } else {
                validatedConfig.warnings.push('includeDebugInfo must be boolean');
            }
        }

        // Check environment-specific configuration overrides and settings
        if (config.environmentOverrides !== undefined) {
            if (typeof config.environmentOverrides === 'object' && config.environmentOverrides !== null) {
                validatedConfig.config.environmentOverrides = config.environmentOverrides;
            } else {
                validatedConfig.warnings.push('environmentOverrides must be an object');
            }
        }

        // Validate custom error message sanitization function
        if (config.sanitizeMessage !== undefined) {
            if (typeof config.sanitizeMessage === 'function') {
                validatedConfig.config.sanitizeMessage = config.sanitizeMessage;
            } else {
                validatedConfig.errors.push('sanitizeMessage must be a function');
                validatedConfig.isValid = false;
            }
        }

        // Validate default metadata
        if (config.defaultMetadata !== undefined) {
            if (typeof config.defaultMetadata === 'object' && config.defaultMetadata !== null) {
                validatedConfig.config.defaultMetadata = config.defaultMetadata;
            } else {
                validatedConfig.warnings.push('defaultMetadata must be an object');
            }
        }

        // Apply default values for missing or invalid configuration options
        const defaultConfig = getDefaultErrorHandlerConfig();
        Object.keys(defaultConfig).forEach(key => {
            if (validatedConfig.config[key] === undefined) {
                validatedConfig.config[key] = defaultConfig[key];
            }
        });

        // Log configuration validation results for debugging and setup verification
        logger.debug('Configuration validation completed', {
            isValid: validatedConfig.isValid,
            errorCount: validatedConfig.errors.length,
            warningCount: validatedConfig.warnings.length,
            finalConfigKeys: Object.keys(validatedConfig.config)
        });

        // Return validated configuration object ready for error handler initialization
        return validatedConfig;

    } catch (validationError) {
        // Handle validation errors gracefully
        logger.error('Error during configuration validation', {
            error: validationError.message,
            providedConfig: config
        });

        return {
            isValid: false,
            errors: [`Validation process failed: ${validationError.message}`],
            warnings: [],
            config: getDefaultErrorHandlerConfig()
        };
    }
}

/**
 * Creates comprehensive error context object with request information, application state,
 * environment details, and timing data for enhanced error analysis and debugging support.
 * 
 * @param {Object} req - Express.js request object
 * @param {Object} error - Error object containing error details
 * @returns {Object} Error context object with request details, timing, environment, and application state
 */
function createErrorContext(req, error) {
    try {
        // Initialize error context with timestamp and basic information
        const errorContext = {
            timestamp: new Date().toISOString(),
            contextId: generateErrorId(req),
            middleware: {
                name: MIDDLEWARE_NAME,
                version: ERROR_HANDLER_VERSION
            }
        };

        // Extract request context including method, URL, headers, and client information
        if (req) {
            errorContext.request = {
                method: req.method,
                url: req.url,
                originalUrl: req.originalUrl,
                path: req.path,
                baseUrl: req.baseUrl,
                protocol: req.protocol,
                secure: req.secure,
                query: req.query,
                params: req.params,
                headers: {
                    'host': req.get('Host'),
                    'user-agent': req.get('User-Agent'),
                    'accept': req.get('Accept'),
                    'accept-language': req.get('Accept-Language'),
                    'content-type': req.get('Content-Type'),
                    'content-length': req.get('Content-Length'),
                    'x-forwarded-for': req.get('X-Forwarded-For'),
                    'x-real-ip': req.get('X-Real-IP')
                },
                client: {
                    ip: req.ip || req.connection?.remoteAddress,
                    ips: req.ips || [],
                    hostname: req.hostname
                }
            };

            // Include route information if available
            if (req.route) {
                errorContext.route = {
                    path: req.route.path,
                    methods: req.route.methods,
                    stack: req.route.stack?.length || 0
                };
            }
        }

        // Include timing information such as request processing time and error occurrence time
        const startTime = req?._startTime || req?.startTime;
        if (startTime) {
            errorContext.timing = {
                requestStartTime: new Date(startTime).toISOString(),
                processingTime: Date.now() - startTime,
                errorOccurredAt: new Date().toISOString()
            };
        }

        // Add environment context including Node.js version, application version, and environment type
        errorContext.environment = {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            environmentType: isDevelopmentEnvironment() ? 'development' : 
                           isTestEnvironment() ? 'test' : 
                           isProductionEnvironment() ? 'production' : 'unknown'
        };

        // Include application state information such as memory usage and process uptime
        errorContext.application = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage?.() || null
        };

        // Add error-specific context including error location and execution path
        if (error) {
            errorContext.error = {
                type: error.name || error.constructor?.name,
                message: error.message,
                code: error.code || error.statusCode,
                stack: isDevelopmentEnvironment() ? error.stack : undefined
            };

            // Include error source information if available
            if (error.fileName || error.lineNumber) {
                errorContext.error.source = {
                    fileName: error.fileName,
                    lineNumber: error.lineNumber,
                    columnNumber: error.columnNumber
                };
            }

            // Add error classification
            const classification = classifyError(error, req);
            errorContext.error.classification = classification;
        }

        // Add system resource information
        if (isDevelopmentEnvironment() || isTestEnvironment()) {
            errorContext.system = {
                loadAverage: process.loadavg?.() || null,
                freeMemory: require('os').freemem?.() || null,
                totalMemory: require('os').totalmem?.() || null,
                networkInterfaces: Object.keys(require('os').networkInterfaces?.() || {})
            };
        }

        // Sanitize sensitive information from context based on environment security settings
        if (isProductionEnvironment()) {
            // Remove potentially sensitive information in production
            if (errorContext.request?.headers) {
                Object.keys(errorContext.request.headers).forEach(header => {
                    const lowerHeader = header.toLowerCase();
                    if (lowerHeader.includes('authorization') || 
                        lowerHeader.includes('cookie') || 
                        lowerHeader.includes('token')) {
                        errorContext.request.headers[header] = '[REDACTED]';
                    }
                });
            }

            if (errorContext.request?.query) {
                Object.keys(errorContext.request.query).forEach(param => {
                    const lowerParam = param.toLowerCase();
                    if (lowerParam.includes('password') || 
                        lowerParam.includes('token') || 
                        lowerParam.includes('secret')) {
                        errorContext.request.query[param] = '[REDACTED]';
                    }
                });
            }

            // Remove stack trace in production
            if (errorContext.error?.stack) {
                errorContext.error.stack = '[REMOVED_IN_PRODUCTION]';
            }
        }

        logger.debug('Error context created', {
            contextId: errorContext.contextId,
            hasRequest: Boolean(req),
            hasError: Boolean(error),
            hasTimingInfo: Boolean(errorContext.timing),
            environment: errorContext.environment.environmentType
        });

        // Return comprehensive error context object ready for error response and logging
        return errorContext;

    } catch (contextError) {
        // Handle context creation errors gracefully
        logger.error('Error creating error context', {
            error: contextError.message,
            hasRequest: Boolean(req),
            hasError: Boolean(error)
        });

        // Return minimal context if creation fails
        return {
            timestamp: new Date().toISOString(),
            contextId: generateErrorId(req),
            error: 'Context creation failed',
            errorMessage: contextError.message,
            middleware: {
                name: MIDDLEWARE_NAME,
                version: ERROR_HANDLER_VERSION
            }
        };
    }
}

/**
 * Returns default configuration object for error handler middleware with environment-specific
 * settings, error classification rules, and educational defaults for the tutorial application.
 * 
 * @returns {Object} Default error handler configuration with environment-appropriate settings
 */
function getDefaultErrorHandlerConfig() {
    try {
        // Define default error classification rules and error type mappings
        const defaultClassificationRules = {
            validation: {
                statusCode: HTTP_STATUS.BAD_REQUEST,
                severity: 'low',
                recoverable: true
            },
            authentication: {
                statusCode: HTTP_STATUS.UNAUTHORIZED || DEFAULT_ERROR_STATUS,
                severity: 'medium',
                recoverable: true
            },
            authorization: {
                statusCode: HTTP_STATUS.FORBIDDEN || DEFAULT_ERROR_STATUS,
                severity: 'medium',
                recoverable: true
            },
            notFound: {
                statusCode: HTTP_STATUS.NOT_FOUND,
                severity: 'low',
                recoverable: true
            },
            server: {
                statusCode: DEFAULT_ERROR_STATUS,
                severity: 'high',
                recoverable: false
            }
        };

        // Set default logging configuration with appropriate log levels for error handling
        const defaultLoggingConfig = {
            logLevel: isDevelopmentEnvironment() ? 'debug' : 
                     isTestEnvironment() ? 'info' : 'warn',
            includeStackTrace: isDevelopmentEnvironment(),
            includeRequestContext: true,
            includeTimingInfo: true
        };

        // Configure default response formatting options and error message templates
        const defaultResponseConfig = {
            includeDebugInfo: isDevelopmentEnvironment(),
            includeStackTrace: isDevelopmentEnvironment(),
            sanitizeErrors: isProductionEnvironment(),
            includeErrorId: true,
            includeTimestamp: true,
            includeCorrelationId: true
        };

        // Apply environment-specific defaults based on current environment detection
        const environmentDefaults = {
            development: {
                verboseLogging: true,
                detailedErrors: true,
                includeSystemInfo: true,
                enableDebugHeaders: true
            },
            test: {
                verboseLogging: false,
                detailedErrors: true,
                includeSystemInfo: false,
                enableDebugHeaders: false
            },
            production: {
                verboseLogging: false,
                detailedErrors: false,
                includeSystemInfo: false,
                enableDebugHeaders: false
            }
        };

        // Set default debugging and stack trace inclusion rules based on environment
        const currentEnv = isDevelopmentEnvironment() ? 'development' : 
                          isTestEnvironment() ? 'test' : 'production';
        const envConfig = environmentDefaults[currentEnv];

        // Configure default error recovery and handling strategies
        const defaultRecoveryConfig = {
            retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'],
            maxRetries: 3,
            retryDelay: 1000,
            gracefulShutdownTimeout: 30000
        };

        // Create comprehensive default configuration object
        const defaultConfig = {
            // Component identification
            componentName: 'DefaultErrorHandler',
            version: ERROR_HANDLER_VERSION,

            // Error classification
            classificationRules: defaultClassificationRules,
            
            // Logging configuration
            logging: defaultLoggingConfig,
            
            // Response formatting
            response: defaultResponseConfig,
            
            // Environment-specific settings
            environment: envConfig,
            
            // Recovery strategies
            recovery: defaultRecoveryConfig,
            
            // Default metadata to include in all error responses
            defaultMetadata: {
                handler: MIDDLEWARE_NAME,
                version: ERROR_HANDLER_VERSION,
                application: APPLICATION.NAME
            },

            // Error handling behavior flags
            includeStackTrace: envConfig.detailedErrors,
            includeDebugInfo: envConfig.verboseLogging,
            sanitizeErrors: currentEnv === 'production',
            enableNotifications: currentEnv === 'production',
            
            // Performance settings
            maxErrorsPerMinute: 100,
            errorCacheSize: 1000,
            
            // Security settings
            sanitizeSensitiveData: true,
            maxErrorMessageLength: 1000,
            allowedErrorFields: ['message', 'type', 'code', 'statusCode']
        };

        logger.debug('Default error handler configuration created', {
            environment: currentEnv,
            hasClassificationRules: Boolean(defaultConfig.classificationRules),
            includeStackTrace: defaultConfig.includeStackTrace,
            sanitizeErrors: defaultConfig.sanitizeErrors
        });

        // Return comprehensive default configuration object ready for error handler use
        return defaultConfig;

    } catch (configError) {
        // Handle configuration creation errors gracefully
        logger.error('Error creating default configuration', {
            error: configError.message
        });

        // Return minimal safe configuration if creation fails
        return {
            componentName: 'FallbackErrorHandler',
            version: ERROR_HANDLER_VERSION,
            includeStackTrace: false,
            includeDebugInfo: false,
            sanitizeErrors: true,
            logLevel: 'error',
            defaultMetadata: {
                handler: MIDDLEWARE_NAME,
                error: 'Configuration creation failed'
            }
        };
    }
}

// Helper functions for internal use

/**
 * Classifies error severity based on error characteristics
 * @param {Object} error - Error object to classify
 * @returns {string} Severity level (low, medium, high, critical)
 */
function classifyErrorSeverity(error) {
    if (!error) return 'unknown';
    
    const errorCode = error.code || error.statusCode;
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Critical errors
    if (errorCode === 'EADDRINUSE' || errorMessage.includes('cannot start server')) {
        return 'critical';
    }
    
    // High severity errors
    if (errorCode >= 500 || errorMessage.includes('internal') || error.name === 'SystemError') {
        return 'high';
    }
    
    // Medium severity errors
    if (errorCode >= 400 && errorCode < 500) {
        return 'medium';
    }
    
    // Low severity errors
    if (errorCode < 400 || errorMessage.includes('validation') || errorMessage.includes('not found')) {
        return 'low';
    }
    
    return 'medium'; // Default
}

/**
 * Classifies error category based on error characteristics
 * @param {Object} error - Error object to classify
 * @returns {string} Error category
 */
function classifyErrorCategory(error) {
    if (!error) return 'unknown';
    
    const errorName = error.name?.toLowerCase() || '';
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;
    
    if (errorName.includes('validation') || errorMessage.includes('validation')) {
        return 'validation';
    }
    
    if (errorName.includes('auth') || errorMessage.includes('unauthorized')) {
        return 'authentication';
    }
    
    if (errorMessage.includes('not found') || errorCode === 'ENOENT') {
        return 'notFound';
    }
    
    if (errorCode?.startsWith('ECONN') || errorCode?.startsWith('ENET')) {
        return 'network';
    }
    
    if (errorName.includes('system') || errorCode?.startsWith('E')) {
        return 'system';
    }
    
    return 'application';
}

// Export all functions and utilities for use in Express.js application
module.exports = {
    // Main Express.js error handling middleware function for comprehensive error processing and response generation
    errorHandler,
    
    // Factory function for creating configured error handler middleware with custom options and behavior
    createErrorHandler,
    
    // Error classification utility function for consistent error type determination and handling strategy
    classifyError,
    
    // Async error handling wrapper demonstrating Express.js 5.1.0 enhanced error capabilities for educational purposes
    handleAsyncErrors,
    
    // Error details extraction utility for comprehensive error analysis and logging support
    extractErrorDetails,
    
    // Error correlation ID generation utility for error tracking and distributed tracing support
    generateErrorId,
    
    // Error event logging utility for monitoring, debugging, and educational error tracking
    logErrorEvent,
    
    // Configuration validation utility for ensuring proper error handler setup and preventing runtime errors
    validateErrorHandlerConfig,
    
    // Error context creation utility for enhanced error analysis and debugging information
    createErrorContext,
    
    // Default configuration utility for error handler middleware with environment-appropriate settings
    getDefaultErrorHandlerConfig
};