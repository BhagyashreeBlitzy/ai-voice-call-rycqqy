/**
 * Express.js Hello Endpoint Controller for Node.js Tutorial Application
 * 
 * This controller implements comprehensive HTTP request/response processing for the '/hello' 
 * endpoint in the Node.js tutorial application, demonstrating production-ready controller 
 * layer patterns with service delegation, request validation, error handling, and response 
 * formatting. The implementation integrates with Express.js 5.1.0 automatic promise error 
 * handling while maintaining educational clarity and demonstrating controller architecture 
 * patterns that separate HTTP concerns from business logic through service layer integration.
 * 
 * Features:
 * - Express.js 5.1.0 Integration with automatic promise error handling and middleware coordination
 * - Service Layer Delegation for business logic processing with comprehensive error handling
 * - Request Validation Integration with security checks and input sanitization
 * - Performance Monitoring with request timing, statistics tracking, and operational insights
 * - Structured Logging with correlation IDs, request tracing, and comprehensive audit trails
 * - HTTP Response Management with proper status codes, headers, and content formatting
 * - Method Validation with 405 Method Not Allowed responses for unsupported HTTP methods
 * - Controller Statistics for operational monitoring, performance tracking, and debugging insights
 * - Educational Design prioritizing code clarity while demonstrating production patterns
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async support and automatic promise error handling
 * - Node.js 22.11.0 LTS with Active LTS support and performance optimizations
 * - Hello Service Layer with caching, performance tracking, and request processing
 * 
 * Architecture: Controller layer implementing separation of concerns between HTTP handling
 * and business logic, with comprehensive middleware coordination and educational focus.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Controller patterns, Express.js integration, HTTP request/response handling
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Node.js built-in crypto module for generating correlation IDs and unique request identifiers
const crypto = require('crypto'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import business logic functions from hello service layer for request processing
const { 
    processHelloRequest, 
    validateHelloRequest: serviceValidateHelloRequest,
    createRequestContext 
} = require('../services/hello.js');

// Import structured logging utilities for controller request logging and error tracking
const { 
    logger, 
    createRequestLogger, 
    startTimer, 
    stopTimer 
} = require('../utils/logger.js');

// Import HTTP status code constants for standardized response status handling
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import Content-Type header constants for proper HTTP response formatting
const { 
    CONTENT_TYPES 
} = require('../utils/constants.js');

// Import HTTP method constants for request method validation and checking
const { 
    HTTP_METHODS 
} = require('../utils/constants.js');

// Import standardized error messages for consistent error handling across operations
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import request validation function for comprehensive HTTP request validation
const { 
    validateHelloRequest 
} = require('../validators/request.js');

// =============================================================================
// GLOBAL STATE AND CONTROLLER CONFIGURATION
// =============================================================================

/**
 * Controller statistics tracking for monitoring and operational insights
 * Tracks request counts, error rates, performance metrics, and operational data
 * @type {Object}
 */
let CONTROLLER_STATS = {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    methodNotAllowedCount: 0,
    validationFailureCount: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    lastRequestTimestamp: null,
    initializationTimestamp: new Date().toISOString(),
    resetCount: 0
};

/**
 * Map of active request processing with correlation IDs for monitoring and cleanup
 * Tracks concurrent requests to prevent memory leaks and enable request monitoring
 * @type {Map<string, Object>}
 */
const ACTIVE_REQUESTS = new Map();

// =============================================================================
// CORE CONTROLLER FUNCTIONS
// =============================================================================

/**
 * Main controller function that handles GET requests to '/hello' endpoint with complete request processing lifecycle.
 * This function implements comprehensive request processing by generating unique correlation IDs for tracing,
 * creating request-scoped loggers for debugging, starting performance timers for metrics, validating requests
 * through service layer integration, processing business logic through service delegation, formatting HTTP
 * responses with proper headers, and handling errors through Express 5.1.0 automatic promise error handling.
 * 
 * Request processing flow:
 * - Correlation ID generation using crypto.randomUUID() for distributed tracing and request correlation
 * - Request-scoped logger creation with correlation ID for structured logging and debugging
 * - Performance timer initialization for request duration measurement and operational insights
 * - Request validation using service layer validation functions for comprehensive security checks
 * - Business logic processing through service layer delegation maintaining separation of concerns
 * - HTTP response formatting with proper status codes, headers, and content for client compatibility
 * - Performance metrics calculation and logging for operational monitoring and optimization
 * - Error handling integration with Express 5.1.0 automatic promise forwarding for robust error management
 * 
 * @param {Object} req - Express request object containing HTTP method, headers, path, and request metadata
 * @param {Object} res - Express response object for sending HTTP responses with status, headers, and content
 * @param {Function} next - Express next middleware function for error handling and middleware chain continuation
 * @returns {Promise<void>} No return value - sends HTTP response directly or calls next() for error handling
 */
async function handleHelloGetRequest(req, res, next) {
    // Generate unique correlation ID using crypto.randomUUID() for request tracing and monitoring
    const correlationId = crypto.randomUUID();
    
    // Create request-scoped logger using createRequestLogger() with correlation ID for structured logging
    const requestLogger = createRequestLogger(correlationId, {
        method: req.method,
        path: req.path || req.url,
        userAgent: req.get('User-Agent'),
        remoteAddress: req.ip || req.connection?.remoteAddress
    });
    
    // Start performance timer using startTimer() with correlation ID for request duration measurement
    const timerHandle = startTimer(correlationId, 'hello_controller_request');
    
    try {
        // Update CONTROLLER_STATS with new request attempt for monitoring and analytics
        CONTROLLER_STATS.requestCount++;
        CONTROLLER_STATS.lastRequestTimestamp = new Date().toISOString();
        
        // Add request to ACTIVE_REQUESTS tracking for monitoring concurrent requests and cleanup
        ACTIVE_REQUESTS.set(correlationId, {
            startTime: Date.now(),
            method: req.method,
            path: req.path || req.url,
            userAgent: req.get('User-Agent'),
            remoteAddress: req.ip || req.connection?.remoteAddress
        });
        
        // Log incoming request details using logger.info() with HTTP method, path, and correlation ID
        requestLogger.info('Processing hello endpoint request', {
            correlation_id: correlationId,
            http_method: req.method,
            request_path: req.path || req.url,
            query_params: Object.keys(req.query || {}).length,
            header_count: Object.keys(req.headers || {}).length,
            content_length: req.get('Content-Length') || 0
        });
        
        // Create request context using createRequestContext() to standardize Express req object for service layer
        const requestContext = createRequestContext(req, {
            correlationId: correlationId,
            requestLogger: requestLogger,
            controllerName: 'helloController',
            endpointName: 'handleHelloGetRequest'
        });
        
        // Validate request using validateHelloRequest() from validator for comprehensive validation including security checks
        requestLogger.debug('Starting request validation', {
            correlation_id: correlationId,
            validation_type: 'hello_endpoint',
            request_method: req.method,
            request_path: req.path || req.url
        });
        
        const validationResult = validateHelloRequest(req);
        
        // Handle validation failure by sending 400 Bad Request response with detailed validation error information
        if (!validationResult.isValid) {
            CONTROLLER_STATS.validationFailureCount++;
            
            requestLogger.warn('Request validation failed', {
                correlation_id: correlationId,
                validation_errors: validationResult.errors?.length || 1,
                error_types: validationResult.errors?.map(e => e.error?.type) || [validationResult.error?.type],
                validation_components: Object.keys(validationResult.validation_results || {}),
                warning_count: validationResult.warnings?.length || 0
            });
            
            // Determine appropriate HTTP status code based on validation error type
            let statusCode = HTTP_STATUS.BAD_REQUEST; // Default 400
            
            if (validationResult.errors?.some(e => e.error?.type === 'METHOD_NOT_ALLOWED') ||
                validationResult.error?.type === 'METHOD_NOT_ALLOWED') {
                statusCode = HTTP_STATUS.METHOD_NOT_ALLOWED; // 405
            }
            
            // Create detailed validation error response for client debugging and proper error handling
            const validationErrorResponse = {
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'Request validation failed for hello endpoint',
                    code: validationResult.error?.code || 'VALIDATION_FAILED',
                    details: validationResult.errors || [validationResult.error],
                    correlation_id: correlationId,
                    endpoint: '/hello',
                    timestamp: new Date().toISOString()
                },
                validation_summary: {
                    errors_found: validationResult.errors?.length || 1,
                    warnings_found: validationResult.warnings?.length || 0,
                    components_validated: Object.keys(validationResult.validation_results || {}).length,
                    validation_time: validationResult.metadata?.validation_time
                }
            };
            
            // Set HTTP response status and Content-Type header for validation error response
            res.status(statusCode).type(CONTENT_TYPES.APPLICATION_JSON);
            
            // Stop performance timer and calculate request duration for failed validation
            const requestDuration = stopTimer(timerHandle, correlationId, 'hello_controller_validation_failure');
            
            // Log validation failure response with correlation ID and performance metrics
            requestLogger.httpRequest(req, res, {
                correlation_id: correlationId,
                response_time: requestDuration,
                validation_failed: true,
                status_code: statusCode,
                error_type: 'VALIDATION_ERROR'
            });
            
            // Clean up request tracking from ACTIVE_REQUESTS Map to prevent memory leaks
            ACTIVE_REQUESTS.delete(correlationId);
            
            // Send validation error response to client with detailed error information
            return res.json(validationErrorResponse);
        }
        
        requestLogger.debug('Request validation successful', {
            correlation_id: correlationId,
            validation_time: validationResult.metadata?.validation_time,
            components_validated: Object.keys(validationResult.validation_results || {}).length,
            warnings_found: validationResult.warnings?.length || 0
        });
        
        // Process validated request using processHelloRequest() service function for business logic execution
        requestLogger.debug('Delegating to service layer for business logic processing', {
            correlation_id: correlationId,
            service_function: 'processHelloRequest',
            request_context_created: true,
            validation_passed: true
        });
        
        const serviceResult = await processHelloRequest(requestContext);
        
        // Extract response data from service processing result including content, headers, and metadata
        const responseData = serviceResult.response || 'Hello world';
        const responseHeaders = serviceResult.headers || {};
        const responseMetadata = serviceResult.metadata || {};
        
        requestLogger.debug('Service layer processing completed', {
            correlation_id: correlationId,
            service_success: serviceResult.success !== false,
            response_length: typeof responseData === 'string' ? responseData.length : 0,
            additional_headers: Object.keys(responseHeaders).length,
            cache_status: responseMetadata.cache_status,
            service_processing_time: responseMetadata.processing_time
        });
        
        // Set HTTP response status to HTTP_STATUS.OK (200) for successful response
        res.status(HTTP_STATUS.OK);
        
        // Set Content-Type header to CONTENT_TYPES.TEXT_PLAIN for proper content type specification
        res.type(CONTENT_TYPES.TEXT_PLAIN);
        
        // Set additional response headers from service result for complete HTTP response formatting
        Object.entries(responseHeaders).forEach(([headerName, headerValue]) => {
            if (headerName && headerValue) {
                res.set(headerName, headerValue);
            }
        });
        
        // Add controller-specific headers for debugging and operational insights
        res.set('X-Correlation-ID', correlationId);
        res.set('X-Controller', 'hello');
        res.set('X-Response-Time', Date.now() - ACTIVE_REQUESTS.get(correlationId)?.startTime);
        
        // Send response content using res.send() for client response delivery
        res.send(responseData);
        
        // Stop performance timer and calculate request duration using stopTimer()
        const requestDuration = stopTimer(timerHandle, correlationId, 'hello_controller_success');
        
        // Update CONTROLLER_STATS with successful request count, performance metrics, and response time calculations
        CONTROLLER_STATS.successCount++;
        CONTROLLER_STATS.totalResponseTime += requestDuration;
        CONTROLLER_STATS.averageResponseTime = CONTROLLER_STATS.totalResponseTime / CONTROLLER_STATS.successCount;
        CONTROLLER_STATS.maxResponseTime = Math.max(CONTROLLER_STATS.maxResponseTime, requestDuration);
        CONTROLLER_STATS.minResponseTime = Math.min(CONTROLLER_STATS.minResponseTime, requestDuration);
        
        // Log successful request completion using logger.httpRequest() with performance metrics and operational data
        requestLogger.httpRequest(req, res, {
            correlation_id: correlationId,
            response_time: requestDuration,
            content_length: typeof responseData === 'string' ? responseData.length : 0,
            cache_status: responseMetadata.cache_status,
            service_processing_time: responseMetadata.processing_time,
            status_code: HTTP_STATUS.OK,
            success: true
        });
        
        // Clean up request tracking from ACTIVE_REQUESTS Map to prevent memory leaks
        ACTIVE_REQUESTS.delete(correlationId);
        
    } catch (error) {
        // Handle service errors and internal controller errors through comprehensive error processing
        CONTROLLER_STATS.errorCount++;
        
        // Extract correlation ID from request tracking for error correlation
        const requestData = ACTIVE_REQUESTS.get(correlationId);
        
        requestLogger.error('Internal error during hello request processing', {
            correlation_id: correlationId,
            error_message: error.message,
            error_type: error.constructor.name,
            error_stack: error.stack,
            request_duration: requestData ? Date.now() - requestData.startTime : 0,
            active_requests: ACTIVE_REQUESTS.size
        });
        
        // Stop performance timer for error case
        if (timerHandle) {
            stopTimer(timerHandle, correlationId, 'hello_controller_error');
        }
        
        // Clean up request tracking from ACTIVE_REQUESTS Map for resource cleanup
        ACTIVE_REQUESTS.delete(correlationId);
        
        // Express 5.1.0 automatic promise error handling - throw error to trigger next(error)
        throw error;
    }
}

/**
 * Controller function that handles non-GET HTTP methods on '/hello' endpoint with 405 Method Not Allowed response.
 * This function implements proper HTTP method handling by generating correlation IDs for error tracking,
 * creating request-scoped loggers for debugging, logging method not allowed attempts for security monitoring,
 * sending standardized 405 Method Not Allowed responses with proper Allow headers, and updating controller
 * statistics for operational insights and monitoring dashboards.
 * 
 * Method not allowed processing flow:
 * - Correlation ID generation for error tracking and request correlation across distributed systems
 * - Request-scoped logger creation with correlation ID for structured error logging and debugging
 * - Method not allowed attempt logging for security monitoring and operational insights
 * - HTTP 405 Method Not Allowed response with proper Allow header indicating supported methods
 * - Content-Type header specification for consistent error response formatting
 * - Standardized error message delivery using ERROR_MESSAGES constants for client consistency
 * - Controller statistics updates for monitoring method not allowed attempts and security analysis
 * - Comprehensive error response logging with correlation ID for debugging and audit trails
 * 
 * @param {Object} req - Express request object containing HTTP method, headers, path, and request metadata
 * @param {Object} res - Express response object for sending HTTP 405 error responses with proper headers
 * @param {Function} next - Express next middleware function for error handling and middleware chain continuation
 * @returns {void} No return value - sends HTTP 405 error response directly
 */
function handleHelloMethodNotAllowed(req, res, next) {
    // Generate correlation ID using crypto.randomUUID() for error tracking and security monitoring
    const correlationId = crypto.randomUUID();
    
    // Create request-scoped logger with correlation ID for method not allowed error logging
    const requestLogger = createRequestLogger(correlationId, {
        method: req.method,
        path: req.path || req.url,
        userAgent: req.get('User-Agent'),
        remoteAddress: req.ip || req.connection?.remoteAddress,
        errorType: 'METHOD_NOT_ALLOWED'
    });
    
    // Log method not allowed attempt using logger.warn() with HTTP method and endpoint details for security monitoring
    requestLogger.warn('Method not allowed on hello endpoint', {
        correlation_id: correlationId,
        attempted_method: req.method,
        endpoint_path: req.path || req.url,
        allowed_methods: [HTTP_METHODS.GET],
        user_agent: req.get('User-Agent'),
        remote_address: req.ip || req.connection?.remoteAddress,
        security_event: 'METHOD_NOT_ALLOWED_ATTEMPT'
    });
    
    // Increment CONTROLLER_STATS.methodNotAllowedCount for monitoring and security analysis
    CONTROLLER_STATS.methodNotAllowedCount++;
    CONTROLLER_STATS.lastRequestTimestamp = new Date().toISOString();
    
    // Set HTTP response status to HTTP_STATUS.METHOD_NOT_ALLOWED (405) for proper error response
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED);
    
    // Set Allow header to indicate supported HTTP methods for '/hello' endpoint per HTTP specification
    res.set('Allow', HTTP_METHODS.GET);
    
    // Set Content-Type header to CONTENT_TYPES.TEXT_PLAIN for consistent error response formatting
    res.type(CONTENT_TYPES.TEXT_PLAIN);
    
    // Add correlation ID header for error tracking and debugging support
    res.set('X-Correlation-ID', correlationId);
    res.set('X-Controller', 'hello');
    res.set('X-Error-Type', 'METHOD_NOT_ALLOWED');
    
    // Send standardized error message using ERROR_MESSAGES.METHOD_NOT_ALLOWED for client consistency
    const errorMessage = ERROR_MESSAGES.METHOD_NOT_ALLOWED || 
                         `Method ${req.method} not allowed. Only GET requests are supported on /hello endpoint.`;
    
    res.send(errorMessage);
    
    // Log method not allowed response with correlation ID for debugging and security audit trails
    requestLogger.httpRequest(req, res, {
        correlation_id: correlationId,
        status_code: HTTP_STATUS.METHOD_NOT_ALLOWED,
        error_type: 'METHOD_NOT_ALLOWED',
        attempted_method: req.method,
        allowed_methods: [HTTP_METHODS.GET],
        response_sent: true,
        security_event: true
    });
    
    logger.debug('Method not allowed response sent', {
        correlation_id: correlationId,
        attempted_method: req.method,
        endpoint: '/hello',
        status_code: HTTP_STATUS.METHOD_NOT_ALLOWED,
        total_method_not_allowed_count: CONTROLLER_STATS.methodNotAllowedCount
    });
}

/**
 * Express.js middleware function that provides request validation for hello endpoint routes.
 * This function creates Express.js compatible middleware for request validation by generating
 * correlation IDs for tracing, performing comprehensive request validation using validator utilities,
 * attaching validation metadata to request objects, handling validation failures with proper error
 * responses, and integrating with Express 5.1.0 middleware chain patterns for seamless operation.
 * 
 * Middleware validation features:
 * - Express.js (req, res, next) signature compatibility with framework middleware standards
 * - Correlation ID generation and request tracking for distributed tracing and debugging
 * - Comprehensive request validation using validateHelloRequest() from validator utility
 * - Validation metadata attachment to request object for downstream middleware and controller use
 * - Validation failure handling with detailed error responses and appropriate HTTP status codes
 * - Performance monitoring with validation timing and operational metrics collection
 * - Controller statistics updates for validation success/failure rates and monitoring dashboards
 * - Express 5.1.0 middleware chain integration with proper next() calling patterns
 * 
 * @param {Object} req - Express request object containing HTTP method, headers, path, and request metadata
 * @param {Object} res - Express response object for sending validation error responses if validation fails
 * @param {Function} next - Express next middleware function for continuing middleware chain or error handling
 * @returns {Promise<void>} No return value - calls next() to continue middleware chain or sends error response
 */
async function validateHelloRequestMiddleware(req, res, next) {
    // Generate correlation ID for middleware request tracking and validation logging
    const correlationId = crypto.randomUUID();
    
    // Create request-scoped logger for validation middleware logging and debugging
    const requestLogger = createRequestLogger(correlationId, {
        middleware: 'validateHelloRequestMiddleware',
        method: req.method,
        path: req.path || req.url,
        userAgent: req.get('User-Agent')
    });
    
    try {
        // Log middleware validation start using logger.debug() with request details for debugging
        requestLogger.debug('Starting hello request validation middleware', {
            correlation_id: correlationId,
            middleware_name: 'validateHelloRequestMiddleware',
            request_method: req.method,
            request_path: req.path || req.url,
            query_param_count: Object.keys(req.query || {}).length,
            header_count: Object.keys(req.headers || {}).length
        });
        
        // Perform comprehensive request validation using validateHelloRequest() from validator utility
        const validationStart = Date.now();
        const validationResult = validateHelloRequest(req);
        const validationTime = Date.now() - validationStart;
        
        requestLogger.debug('Request validation completed', {
            correlation_id: correlationId,
            validation_passed: validationResult.isValid,
            validation_time: validationTime,
            error_count: validationResult.errors?.length || 0,
            warning_count: validationResult.warnings?.length || 0,
            components_validated: Object.keys(validationResult.validation_results || {}).length
        });
        
        // Check validation result for isValid flag and validation error details
        if (validationResult.isValid) {
            // Attach validation metadata to req object for downstream middleware and controller use
            req.validationResult = validationResult;
            req.validationMetadata = {
                correlation_id: correlationId,
                validation_time: validationTime,
                validation_passed: true,
                middleware_name: 'validateHelloRequestMiddleware',
                timestamp: new Date().toISOString()
            };
            
            requestLogger.debug('Request validation passed, continuing to next middleware', {
                correlation_id: correlationId,
                validation_time: validationTime,
                next_called: true
            });
            
            // Call next() to continue to route handler if validation successful
            return next();
            
        } else {
            // Update CONTROLLER_STATS with validation failure count for monitoring operational insights
            CONTROLLER_STATS.validationFailureCount++;
            
            // Log validation failure with correlation ID and error details for debugging and monitoring
            requestLogger.warn('Request validation failed in middleware', {
                correlation_id: correlationId,
                validation_time: validationTime,
                error_count: validationResult.errors?.length || 1,
                error_types: validationResult.errors?.map(e => e.error?.type) || [validationResult.error?.type],
                warning_count: validationResult.warnings?.length || 0,
                validation_components_checked: Object.keys(validationResult.validation_results || {}).length
            });
            
            // Determine appropriate HTTP status code based on validation error type
            let statusCode = HTTP_STATUS.BAD_REQUEST; // Default 400
            
            if (validationResult.errors?.some(e => e.error?.type === 'METHOD_NOT_ALLOWED') ||
                validationResult.error?.type === 'METHOD_NOT_ALLOWED') {
                statusCode = HTTP_STATUS.METHOD_NOT_ALLOWED; // 405
            }
            
            // Create comprehensive validation error response with detailed error information for client debugging
            const middlewareErrorResponse = {
                error: {
                    type: 'MIDDLEWARE_VALIDATION_ERROR',
                    message: 'Request validation failed in hello endpoint middleware',
                    code: validationResult.error?.code || 'VALIDATION_FAILED',
                    details: validationResult.errors || [validationResult.error],
                    correlation_id: correlationId,
                    middleware: 'validateHelloRequestMiddleware',
                    endpoint: '/hello',
                    timestamp: new Date().toISOString()
                },
                validation_metadata: {
                    validation_time: validationTime,
                    errors_found: validationResult.errors?.length || 1,
                    warnings_found: validationResult.warnings?.length || 0,
                    components_validated: Object.keys(validationResult.validation_results || {}).length,
                    middleware_processed: true
                }
            };
            
            // Send validation error response with appropriate error message and correlation ID for debugging
            res.status(statusCode).type(CONTENT_TYPES.APPLICATION_JSON);
            res.set('X-Correlation-ID', correlationId);
            res.set('X-Controller', 'hello');
            res.set('X-Middleware-Error', 'VALIDATION_FAILED');
            
            // Log validation error response for audit trails and monitoring
            requestLogger.httpRequest(req, res, {
                correlation_id: correlationId,
                status_code: statusCode,
                error_type: 'MIDDLEWARE_VALIDATION_ERROR',
                validation_time: validationTime,
                middleware_name: 'validateHelloRequestMiddleware'
            });
            
            return res.json(middlewareErrorResponse);
        }
        
    } catch (error) {
        // Handle middleware execution errors with comprehensive error processing and logging
        CONTROLLER_STATS.errorCount++;
        
        requestLogger.error('Internal error in hello validation middleware', {
            correlation_id: correlationId,
            error_message: error.message,
            error_type: error.constructor.name,
            error_stack: error.stack,
            middleware_name: 'validateHelloRequestMiddleware'
        });
        
        // Create internal middleware error response for client notification
        const internalErrorResponse = {
            error: {
                type: 'INTERNAL_MIDDLEWARE_ERROR',
                message: 'Internal error occurred in validation middleware',
                code: 'MIDDLEWARE_EXECUTION_ERROR',
                correlation_id: correlationId,
                timestamp: new Date().toISOString()
            }
        };
        
        // Send internal error response with 500 status code for server errors
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
           .type(CONTENT_TYPES.APPLICATION_JSON)
           .set('X-Correlation-ID', correlationId)
           .json(internalErrorResponse);
        
        // Log middleware error response
        requestLogger.httpRequest(req, res, {
            correlation_id: correlationId,
            status_code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error_type: 'INTERNAL_MIDDLEWARE_ERROR',
            middleware_name: 'validateHelloRequestMiddleware'
        });
    }
}

/**
 * Factory function that creates controller middleware with configuration options for hello endpoint.
 * This function creates configurable Express.js middleware by accepting configuration options,
 * creating middleware functions with Express (req, res, next) signature, configuring request validation
 * with options-specific rules, setting up performance monitoring, and integrating with Express 5.1.0
 * automatic promise handling for robust middleware operation and educational middleware patterns.
 * 
 * Middleware factory features:
 * - Configuration-driven middleware creation with customizable validation rules and options
 * - Express.js middleware signature compatibility with (req, res, next) pattern for framework integration
 * - Request validation configuration with options-specific validation rules and security settings
 * - Performance monitoring setup with configurable metrics collection and operational insights
 * - Error handling integration with Express 5.1.0 automatic promise handling for robust error management
 * - Middleware function generation ready for app.use() or router mounting with proper configuration
 * - Educational middleware factory patterns demonstrating advanced Express.js middleware techniques
 * - Operational monitoring configuration with statistics tracking and performance measurement
 * 
 * @param {Object} options - Configuration options including logging level, performance tracking, and validation rules
 * @returns {Function} Configured Express.js middleware function ready for route mounting and application integration
 */
function createHelloControllerMiddleware(options = {}) {
    // Extract middleware configuration options including logging level and performance tracking settings
    const middlewareConfig = {
        enableLogging: options.enableLogging !== false, // Default to true
        enablePerformanceTracking: options.enablePerformanceTracking !== false, // Default to true
        enableValidation: options.enableValidation !== false, // Default to true
        logLevel: options.logLevel || 'debug',
        validationRules: options.validationRules || {},
        statisticsTracking: options.statisticsTracking !== false, // Default to true
        correlationIdHeader: options.correlationIdHeader || 'X-Correlation-ID',
        ...options
    };
    
    logger.info('Creating hello controller middleware with configuration', {
        middleware_factory: 'createHelloControllerMiddleware',
        configuration: {
            logging_enabled: middlewareConfig.enableLogging,
            performance_tracking: middlewareConfig.enablePerformanceTracking,
            validation_enabled: middlewareConfig.enableValidation,
            statistics_tracking: middlewareConfig.statisticsTracking,
            log_level: middlewareConfig.logLevel
        }
    });
    
    // Create middleware function with Express (req, res, next) signature for framework compatibility
    return async function configuredHelloControllerMiddleware(req, res, next) {
        const correlationId = crypto.randomUUID();
        const requestStart = Date.now();
        
        try {
            // Configure request validation with options-specific validation rules and security settings
            if (middlewareConfig.enableValidation) {
                const validationResult = validateHelloRequest(req);
                
                if (!validationResult.isValid) {
                    const validationErrorResponse = {
                        error: {
                            type: 'CONFIGURED_MIDDLEWARE_VALIDATION_ERROR',
                            message: 'Request validation failed in configured hello middleware',
                            correlation_id: correlationId,
                            configuration: {
                                validation_enabled: true,
                                custom_rules_applied: Object.keys(middlewareConfig.validationRules).length > 0
                            },
                            timestamp: new Date().toISOString()
                        }
                    };
                    
                    return res.status(HTTP_STATUS.BAD_REQUEST)
                              .type(CONTENT_TYPES.APPLICATION_JSON)
                              .set(middlewareConfig.correlationIdHeader, correlationId)
                              .json(validationErrorResponse);
                }
                
                req.validationResult = validationResult;
            }
            
            // Set up performance monitoring based on options configuration for operational insights
            if (middlewareConfig.enablePerformanceTracking) {
                req.performanceTracking = {
                    correlation_id: correlationId,
                    start_time: requestStart,
                    middleware_name: 'configuredHelloControllerMiddleware'
                };
            }
            
            // Configure error handling integration with Express 5.1.0 automatic promise handling
            req.middlewareConfig = middlewareConfig;
            req.correlationId = correlationId;
            
            // Log middleware execution if logging enabled
            if (middlewareConfig.enableLogging) {
                logger.debug('Configured hello middleware processing request', {
                    correlation_id: correlationId,
                    middleware_config: {
                        validation_enabled: middlewareConfig.enableValidation,
                        performance_tracking: middlewareConfig.enablePerformanceTracking,
                        statistics_tracking: middlewareConfig.statisticsTracking
                    },
                    request_info: {
                        method: req.method,
                        path: req.path || req.url,
                        user_agent: req.get('User-Agent')
                    }
                });
            }
            
            // Update statistics if tracking enabled
            if (middlewareConfig.statisticsTracking) {
                CONTROLLER_STATS.requestCount++;
            }
            
            // Return configured middleware function ready for app.use() or router mounting
            return next();
            
        } catch (error) {
            logger.error('Error in configured hello controller middleware', {
                correlation_id: correlationId,
                error_message: error.message,
                error_type: error.constructor.name,
                middleware_config: middlewareConfig
            });
            
            const errorResponse = {
                error: {
                    type: 'CONFIGURED_MIDDLEWARE_ERROR',
                    message: 'Internal error in configured hello middleware',
                    correlation_id: correlationId,
                    timestamp: new Date().toISOString()
                }
            };
            
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
                      .type(CONTENT_TYPES.APPLICATION_JSON)
                      .set(middlewareConfig.correlationIdHeader, correlationId)
                      .json(errorResponse);
        }
    };
}

// =============================================================================
// CONTROLLER STATISTICS AND MONITORING
// =============================================================================

/**
 * Returns comprehensive controller statistics for monitoring, debugging, and operational insights.
 * This function provides complete operational visibility by calculating controller uptime since initialization,
 * extracting current performance metrics including request counts and response times, calculating error rates
 * from total requests and error counts, including method not allowed statistics for security monitoring,
 * counting active requests for load monitoring, adding controller-specific performance metrics, and creating
 * comprehensive statistics objects for monitoring dashboards and operational insights.
 * 
 * Statistics reporting features:
 * - Controller uptime calculation from initialization timestamp for operational monitoring
 * - Performance metrics extraction including request counts, response times, and throughput calculations
 * - Error rate percentage calculation from total requests and error counts for reliability monitoring
 * - Method not allowed statistics for security monitoring and attack detection
 * - Active request counting from ACTIVE_REQUESTS Map for concurrent load monitoring
 * - Controller-specific performance metrics including average, maximum, and minimum response times
 * - Express integration status and middleware configuration details for system health assessment
 * - Comprehensive statistics object creation with operational and performance data for dashboard integration
 * 
 * @returns {Object} Controller statistics object with request counts, performance metrics, error rates, and operational data
 */
function getHelloControllerStats() {
    try {
        // Calculate controller uptime since initialization for operational monitoring
        const currentTime = Date.now();
        const initTime = new Date(CONTROLLER_STATS.initializationTimestamp).getTime();
        const uptimeSeconds = Math.floor((currentTime - initTime) / 1000);
        const uptimeHours = Math.floor(uptimeSeconds / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
        
        // Extract current CONTROLLER_STATS data including request counts and performance metrics
        const totalRequests = CONTROLLER_STATS.requestCount;
        const successfulRequests = CONTROLLER_STATS.successCount;
        const failedRequests = CONTROLLER_STATS.errorCount;
        const validationFailures = CONTROLLER_STATS.validationFailureCount;
        const methodNotAllowedAttempts = CONTROLLER_STATS.methodNotAllowedCount;
        
        // Calculate error rate percentage from total requests and error counts for reliability assessment
        const errorRatePercentage = totalRequests > 0 ? 
                                   ((failedRequests / totalRequests) * 100).toFixed(2) : 
                                   0;
        
        const successRatePercentage = totalRequests > 0 ? 
                                     ((successfulRequests / totalRequests) * 100).toFixed(2) : 
                                     0;
        
        // Include method not allowed statistics for security monitoring and attack detection
        const securityMetrics = {
            method_not_allowed_attempts: methodNotAllowedAttempts,
            method_not_allowed_rate: totalRequests > 0 ? 
                                    ((methodNotAllowedAttempts / totalRequests) * 100).toFixed(2) : 
                                    0,
            validation_failure_count: validationFailures,
            validation_failure_rate: totalRequests > 0 ? 
                                    ((validationFailures / totalRequests) * 100).toFixed(2) : 
                                    0
        };
        
        // Count active requests from ACTIVE_REQUESTS Map for load monitoring and concurrent request tracking
        const activeRequestCount = ACTIVE_REQUESTS.size;
        const activeRequestDetails = Array.from(ACTIVE_REQUESTS.entries()).map(([correlationId, requestData]) => ({
            correlation_id: correlationId,
            duration_ms: Date.now() - requestData.startTime,
            method: requestData.method,
            path: requestData.path,
            user_agent: requestData.userAgent?.substring(0, 50) || 'unknown'
        }));
        
        // Add controller-specific performance metrics including average response time calculations
        const performanceMetrics = {
            average_response_time_ms: CONTROLLER_STATS.averageResponseTime || 0,
            maximum_response_time_ms: CONTROLLER_STATS.maxResponseTime === 0 ? 0 : CONTROLLER_STATS.maxResponseTime,
            minimum_response_time_ms: CONTROLLER_STATS.minResponseTime === Infinity ? 0 : CONTROLLER_STATS.minResponseTime,
            total_response_time_ms: CONTROLLER_STATS.totalResponseTime || 0,
            requests_per_second: uptimeSeconds > 0 ? (totalRequests / uptimeSeconds).toFixed(2) : 0,
            active_requests: activeRequestCount,
            concurrent_request_limit_reached: activeRequestCount >= 100 // Example threshold
        };
        
        // Include Express integration status and middleware configuration details for system health
        const systemStatus = {
            controller_healthy: errorRatePercentage < 5 && activeRequestCount < 50,
            express_integration: 'v5.1.0',
            automatic_promise_handling: true,
            middleware_chain_enabled: true,
            validation_middleware_available: true,
            logging_integration: 'structured_logging_enabled',
            statistics_collection: 'real_time_enabled'
        };
        
        // Create comprehensive statistics object with operational and performance data
        const comprehensiveStats = {
            overview: {
                controller_name: 'helloController',
                endpoint: '/hello',
                initialization_time: CONTROLLER_STATS.initializationTimestamp,
                uptime: {
                    seconds: uptimeSeconds,
                    formatted: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds % 60}s`,
                    hours: uptimeHours,
                    minutes: uptimeMinutes
                },
                last_request: CONTROLLER_STATS.lastRequestTimestamp,
                reset_count: CONTROLLER_STATS.resetCount
            },
            request_statistics: {
                total_requests: totalRequests,
                successful_requests: successfulRequests,
                failed_requests: failedRequests,
                success_rate_percentage: parseFloat(successRatePercentage),
                error_rate_percentage: parseFloat(errorRatePercentage),
                validation_failures: validationFailures
            },
            performance_metrics: performanceMetrics,
            security_metrics: securityMetrics,
            active_requests: {
                count: activeRequestCount,
                details: activeRequestDetails.slice(0, 10), // Limit to first 10 for response size
                total_tracked: activeRequestDetails.length
            },
            system_status: systemStatus,
            health_indicators: {
                overall_health: systemStatus.controller_healthy ? 'healthy' : 'degraded',
                error_rate_healthy: parseFloat(errorRatePercentage) < 5,
                performance_healthy: performanceMetrics.average_response_time_ms < 100,
                load_healthy: activeRequestCount < 50,
                validation_healthy: securityMetrics.validation_failure_rate < 10
            },
            operational_metadata: {
                statistics_generated_at: new Date().toISOString(),
                statistics_generation_time_ms: Date.now() - currentTime,
                node_environment: process.env.NODE_ENV || 'development',
                express_version: '5.1.0',
                controller_version: '1.0.0'
            }
        };
        
        // Return complete controller statistics for monitoring dashboards and operational insights
        return Object.freeze(comprehensiveStats);
        
    } catch (error) {
        // Handle statistics generation errors gracefully and return error information
        logger.error('Error generating hello controller statistics', {
            error_message: error.message,
            error_type: error.constructor.name,
            error_stack: error.stack,
            fallback_stats: true
        });
        
        return {
            error: {
                occurred: true,
                message: 'Failed to generate controller statistics',
                error_type: error.constructor.name,
                timestamp: new Date().toISOString()
            },
            fallback_statistics: {
                total_requests: CONTROLLER_STATS.requestCount || 0,
                successful_requests: CONTROLLER_STATS.successCount || 0,
                failed_requests: CONTROLLER_STATS.errorCount || 0,
                active_requests: ACTIVE_REQUESTS.size || 0,
                controller_healthy: false,
                statistics_available: false
            }
        };
    }
}

/**
 * Utility function that resets controller statistics for testing purposes or operational monitoring reset.
 * This function performs comprehensive statistics reset by resetting CONTROLLER_STATS object to initial state,
 * clearing ACTIVE_REQUESTS Map to remove all request tracking entries, maintaining controller configuration
 * unchanged, logging controller statistics reset event with timestamp, and preserving middleware setup for
 * continued operation while providing clean metrics slate for testing or monitoring reset operations.
 * 
 * Statistics reset features:
 * - Complete CONTROLLER_STATS reset to initial state with zero counters for fresh monitoring cycles
 * - ACTIVE_REQUESTS Map clearing to remove all request tracking entries and prevent memory leaks
 * - Average response time calculation reset to zero for clean performance metrics
 * - Controller configuration preservation to maintain validation rules and middleware setup unchanged
 * - Statistics reset event logging with timestamp for audit trail and operational tracking
 * - Reset counter increment for tracking how many times statistics have been reset
 * - Initialization timestamp preservation for uptime calculation continuity
 * - Clean metrics slate provision for testing scenarios and monitoring system resets
 * 
 * @returns {void} No return value - resets CONTROLLER_STATS and clears active request tracking
 */
function resetHelloControllerStats() {
    try {
        const resetTimestamp = new Date().toISOString();
        const previousStats = { ...CONTROLLER_STATS };
        const activeRequestCount = ACTIVE_REQUESTS.size;
        
        // Log controller statistics reset event before clearing data for audit trail
        logger.info('Hello controller statistics reset requested', {
            reset_timestamp: resetTimestamp,
            previous_statistics: {
                total_requests: previousStats.requestCount,
                successful_requests: previousStats.successCount,
                failed_requests: previousStats.errorCount,
                method_not_allowed: previousStats.methodNotAllowedCount,
                validation_failures: previousStats.validationFailureCount,
                average_response_time: previousStats.averageResponseTime,
                active_requests_cleared: activeRequestCount
            },
            reset_reason: 'manual_reset_requested'
        });
        
        // Reset CONTROLLER_STATS object to initial state with zero counters
        CONTROLLER_STATS.requestCount = 0;
        CONTROLLER_STATS.successCount = 0;
        CONTROLLER_STATS.errorCount = 0;
        CONTROLLER_STATS.methodNotAllowedCount = 0;
        CONTROLLER_STATS.validationFailureCount = 0;
        CONTROLLER_STATS.totalResponseTime = 0;
        CONTROLLER_STATS.averageResponseTime = 0;
        CONTROLLER_STATS.maxResponseTime = 0;
        CONTROLLER_STATS.minResponseTime = Infinity;
        CONTROLLER_STATS.lastRequestTimestamp = null;
        
        // Increment reset counter and update reset timestamp
        CONTROLLER_STATS.resetCount = (previousStats.resetCount || 0) + 1;
        CONTROLLER_STATS.lastResetTimestamp = resetTimestamp;
        
        // Preserve initialization timestamp for uptime calculation continuity
        // CONTROLLER_STATS.initializationTimestamp remains unchanged
        
        // Clear ACTIVE_REQUESTS Map to remove all request tracking entries and prevent memory leaks
        if (activeRequestCount > 0) {
            const clearedRequests = Array.from(ACTIVE_REQUESTS.keys());
            ACTIVE_REQUESTS.clear();
            
            logger.debug('Active request tracking cleared during statistics reset', {
                cleared_request_count: activeRequestCount,
                correlation_ids_cleared: clearedRequests.length,
                reset_timestamp: resetTimestamp
            });
        }
        
        // Log controller statistics reset completion with summary for operational tracking
        logger.info('Hello controller statistics successfully reset', {
            reset_timestamp: resetTimestamp,
            reset_count: CONTROLLER_STATS.resetCount,
            statistics_cleared: {
                requests: previousStats.requestCount,
                errors: previousStats.errorCount,
                active_requests: activeRequestCount
            },
            controller_configuration_preserved: true,
            middleware_setup_maintained: true
        });
        
        // Maintain controller configuration and middleware setup unchanged for continued operation
        // Configuration objects and middleware functions remain intact
        
    } catch (error) {
        // Handle statistics reset errors gracefully with comprehensive error logging
        logger.error('Error resetting hello controller statistics', {
            error_message: error.message,
            error_type: error.constructor.name,
            error_stack: error.stack,
            reset_timestamp: new Date().toISOString(),
            partial_reset_possible: true
        });
        
        // Attempt partial reset if possible
        try {
            CONTROLLER_STATS.resetCount = (CONTROLLER_STATS.resetCount || 0) + 1;
            CONTROLLER_STATS.lastResetTimestamp = new Date().toISOString();
            
            logger.warn('Partial controller statistics reset completed despite error', {
                reset_count_updated: true,
                timestamp_updated: true,
                full_reset_failed: true
            });
        } catch (partialResetError) {
            logger.error('Complete failure during controller statistics reset', {
                original_error: error.message,
                partial_reset_error: partialResetError.message,
                controller_statistics_may_be_inconsistent: true
            });
        }
    }
}

/**
 * Internal error handling function that processes controller errors with proper logging and error response generation.
 * This function provides comprehensive error processing by extracting correlation IDs from request context,
 * logging error occurrences with stack traces and request context, incrementing controller error statistics,
 * determining appropriate HTTP status codes, creating sanitized error messages, sending error responses,
 * cleaning up request tracking, and integrating with upstream error handling for Express middleware chain.
 * 
 * Error handling features:
 * - Correlation ID extraction from request context for error correlation and distributed tracing
 * - Comprehensive error logging with stack traces, request context, and operational metadata
 * - Controller error statistics increment for operational monitoring and error rate tracking
 * - HTTP status code determination based on error type and context for proper client communication
 * - Sanitized error message creation for client response without exposing internal implementation details
 * - HTTP response formatting with appropriate status codes and Content-Type headers
 * - Request tracking cleanup from ACTIVE_REQUESTS Map for resource management and memory leak prevention
 * - Upstream error handling integration with Express 5.1.0 error middleware patterns
 * 
 * @param {Error} error - JavaScript Error object with message, stack trace, and error type information
 * @param {Object} req - Express request object containing HTTP method, headers, path, and correlation ID
 * @param {Object} res - Express response object for sending error responses to client
 * @param {Function} next - Express next middleware function for upstream error handling integration
 * @returns {void} No return value - sends error response or calls next() for upstream error handling
 */
function handleControllerError(error, req, res, next) {
    // Extract correlation ID from request context for error correlation and tracking
    const correlationId = req.correlationId || 
                         req.headers['x-correlation-id'] || 
                         crypto.randomUUID();
    
    const requestLogger = createRequestLogger(correlationId, {
        error_handler: 'handleControllerError',
        method: req.method,
        path: req.path || req.url,
        userAgent: req.get('User-Agent'),
        errorType: error.constructor.name
    });
    
    try {
        // Log error occurrence using logger.error() with error stack trace and request context
        requestLogger.error('Controller error occurred during request processing', {
            correlation_id: correlationId,
            error_message: error.message,
            error_type: error.constructor.name,
            error_stack: error.stack,
            request_context: {
                method: req.method,
                path: req.path || req.url,
                user_agent: req.get('User-Agent'),
                remote_address: req.ip || req.connection?.remoteAddress,
                content_length: req.get('Content-Length') || 0
            },
            controller_context: {
                controller_name: 'helloController',
                error_handler: 'handleControllerError',
                request_tracking_active: ACTIVE_REQUESTS.has(correlationId)
            }
        });
        
        // Increment CONTROLLER_STATS.errorCount for controller error rate monitoring
        CONTROLLER_STATS.errorCount++;
        
        // Determine appropriate HTTP status code based on error type and context
        let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR; // Default 500
        let errorType = 'INTERNAL_SERVER_ERROR';
        
        if (error.name === 'ValidationError' || error.message.includes('validation')) {
            statusCode = HTTP_STATUS.BAD_REQUEST; // 400
            errorType = 'VALIDATION_ERROR';
        } else if (error.name === 'TypeError' && error.message.includes('Cannot read property')) {
            statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR; // 500
            errorType = 'INTERNAL_SERVER_ERROR';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE || 503; // 503
            errorType = 'SERVICE_UNAVAILABLE';
        }
        
        // Create sanitized error message for client response without exposing internal details
        const sanitizedErrorMessage = process.env.NODE_ENV === 'production' ? 
                                     'An internal server error occurred' : 
                                     error.message;
        
        const errorResponse = {
            error: {
                type: errorType,
                message: sanitizedErrorMessage,
                code: error.code || 'CONTROLLER_ERROR',
                correlation_id: correlationId,
                timestamp: new Date().toISOString(),
                controller: 'helloController'
            },
            debugging_info: process.env.NODE_ENV !== 'production' ? {
                error_name: error.name,
                error_stack: error.stack?.split('\n').slice(0, 5), // Limit stack trace
                request_method: req.method,
                request_path: req.path || req.url
            } : undefined
        };
        
        // Check if response has already been sent to avoid double response errors
        if (!res.headersSent) {
            // Set HTTP response status and Content-Type headers for error response formatting
            res.status(statusCode)
               .type(CONTENT_TYPES.APPLICATION_JSON)
               .set('X-Correlation-ID', correlationId)
               .set('X-Controller', 'hello')
               .set('X-Error-Handler', 'handleControllerError');
            
            // Send error response to client with appropriate error message and correlation ID
            res.json(errorResponse);
            
            // Log error response sent to client for audit trail and debugging
            requestLogger.httpRequest(req, res, {
                correlation_id: correlationId,
                status_code: statusCode,
                error_type: errorType,
                error_handled: true,
                response_sent: true
            });
        } else {
            requestLogger.warn('Cannot send error response - headers already sent', {
                correlation_id: correlationId,
                error_type: errorType,
                status_code: statusCode,
                headers_sent: true
            });
        }
        
        // Clean up request tracking from ACTIVE_REQUESTS Map for resource cleanup
        if (ACTIVE_REQUESTS.has(correlationId)) {
            const requestData = ACTIVE_REQUESTS.get(correlationId);
            const requestDuration = Date.now() - requestData.startTime;
            
            ACTIVE_REQUESTS.delete(correlationId);
            
            requestLogger.debug('Request tracking cleaned up after error handling', {
                correlation_id: correlationId,
                request_duration: requestDuration,
                active_requests_remaining: ACTIVE_REQUESTS.size
            });
        }
        
    } catch (handlingError) {
        // Handle errors that occur during error handling itself
        logger.error('Error occurred while handling controller error', {
            correlation_id: correlationId,
            original_error: error.message,
            handling_error: handlingError.message,
            error_handler_failure: true,
            double_fault: true
        });
        
        // Call next(error) for upstream error handling if configured for error middleware integration
        if (typeof next === 'function') {
            return next(error);
        }
    }
}

// =============================================================================
// CONTROLLER OBJECT AND EXPORTS
// =============================================================================

/**
 * Main hello controller object providing unified access to all hello endpoint controller functions.
 * This object exposes comprehensive controller capabilities with consistent interface for request handling,
 * method validation, middleware creation, and operational monitoring while demonstrating controller
 * architecture patterns and Express.js integration best practices.
 * 
 * @type {Object}
 */
const helloController = Object.freeze({
    // Primary request handler for GET requests to /hello endpoint
    handleHelloGetRequest: handleHelloGetRequest,
    
    // Method not allowed handler for non-GET requests to /hello endpoint
    handleHelloMethodNotAllowed: handleHelloMethodNotAllowed,
    
    // Express.js middleware function for request validation
    validateHelloRequestMiddleware: validateHelloRequestMiddleware,
    
    // Middleware factory for creating configured controller middleware
    createMiddleware: createHelloControllerMiddleware,
    
    // Controller statistics and monitoring functions
    getStats: getHelloControllerStats,
    resetStats: resetHelloControllerStats,
    
    // Error handling utility
    handleError: handleControllerError
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Main controller function for handling GET requests to '/hello' endpoint with full request processing
    handleHelloGetRequest,
    
    // Controller function for handling unsupported HTTP methods with 405 Method Not Allowed responses
    handleHelloMethodNotAllowed,
    
    // Express.js middleware function for request validation before route handler execution
    validateHelloRequestMiddleware,
    
    // Middleware factory function for creating configurable hello controller middleware
    createHelloControllerMiddleware,
    
    // Controller statistics function for monitoring performance and operational metrics
    getHelloControllerStats,
    
    // Statistics reset function for testing and operational monitoring reset
    resetHelloControllerStats,
    
    // Internal error handling function for comprehensive error processing and logging
    handleControllerError,
    
    // Main controller object providing unified access to all hello endpoint controller functions
    helloController
};