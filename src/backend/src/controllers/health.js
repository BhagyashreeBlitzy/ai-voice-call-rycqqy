/**
 * Express.js Health Check Controller for Node.js Tutorial Application
 * 
 * This module implements comprehensive HTTP request handlers for health monitoring endpoints 
 * including /health, /livez, and /readyz routes. It provides enterprise-grade health status 
 * evaluation with Kubernetes probe support, system availability reporting, and performance 
 * monitoring integration while maintaining educational clarity and production-ready patterns.
 * 
 * Key Features:
 * - Comprehensive health status evaluation with optional detailed metrics
 * - Kubernetes-compatible liveness and readiness probe endpoints for container orchestration
 * - System availability reporting with resource utilization and performance thresholds
 * - Educational Express.js 5.1.0 async/await patterns with automatic promise error handling
 * - High-precision performance monitoring with sub-50ms response time targets
 * - Structured logging integration with correlation ID tracking and request/response metadata
 * - Production-ready error handling with graceful degradation and proper HTTP status codes
 * - Request lifecycle tracking with performance counters and operational statistics
 * 
 * Architecture:
 * - Express.js 5.1.0 controller pattern with async/await promise integration
 * - Health service business logic separation with comprehensive metrics collection
 * - Structured logging with correlation ID propagation and performance tracking
 * - Error handling middleware integration with custom error factory patterns
 * - HTTP response generation with proper status codes and content type headers
 * - Performance monitoring with response time measurement and threshold validation
 * 
 * Educational Focus:
 * - Clear separation of concerns with service layer abstraction
 * - Comprehensive error handling with educational error messaging
 * - Production-ready patterns that demonstrate scalable Node.js application architecture
 * - Express.js middleware patterns with proper request/response lifecycle management
 * - HTTP protocol best practices with appropriate status codes and headers
 * - Performance monitoring integration for operational visibility and debugging
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async/await support and automatic error handling
 * - Node.js 22.11.0 LTS with improved performance optimizations and security features
 * - Kubernetes health check requirements with /livez and /readyz endpoint specifications
 * - Health service business logic with comprehensive system metrics and resource monitoring
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js controllers, HTTP request handling, health monitoring patterns
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// No external dependencies - uses only Node.js built-ins and internal modules

// =============================================================================
// INTERNAL DEPENDENCIES - HEALTH SERVICE INTEGRATION
// =============================================================================

// Import basic health service function for essential health status evaluation without detailed system metrics
const { getBasicHealth } = require('../services/health.js');

// Import detailed health service function for comprehensive system metrics and resource utilization reporting
const { getDetailedHealth } = require('../services/health.js');

// Import Kubernetes liveness probe service for application restart decision support and container health monitoring
const { getLivenessStatus } = require('../services/health.js');

// Import Kubernetes readiness probe service for traffic routing decisions and load balancer integration
const { getReadinessStatus } = require('../services/health.js');

// =============================================================================
// INTERNAL DEPENDENCIES - LOGGING UTILITIES
// =============================================================================

// Import structured logging utilities for health endpoint request/response logging and error tracking
const { logger } = require('../utils/logger.js');

// Import performance timer utility for measuring health check response times and performance monitoring
const { startTimer } = require('../utils/logger.js');

// Import performance timer completion utility for calculating health endpoint response duration
const { stopTimer } = require('../utils/logger.js');

// =============================================================================
// INTERNAL DEPENDENCIES - CONSTANTS AND ERROR HANDLING
// =============================================================================

// Import HTTP status code constants for proper health endpoint response status handling
const { HTTP_STATUS } = require('../utils/constants.js');

// Import Content-Type header constants for proper JSON response formatting in health endpoints
const { CONTENT_TYPES } = require('../utils/constants.js');

// Import standardized error messages for consistent health endpoint error responses
const { ERROR_MESSAGES } = require('../utils/constants.js');

// Import custom error factory for creating health-specific errors with proper HTTP status codes and metadata
const { createCustomError } = require('../middleware/error.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

// Request counters for health endpoint monitoring - tracks usage patterns and operational statistics
let REQUEST_COUNTERS = { 
    health: 0, 
    liveness: 0, 
    readiness: 0 
};

// Response time tracking for performance monitoring - maintains sliding window of response times
let RESPONSE_TIME_TRACKER = { 
    health: [], 
    liveness: [], 
    readiness: [] 
};

// Cached controller configuration for health endpoint behavior - improves performance and consistency
let HEALTH_CONTROLLER_CONFIG = null;

// =============================================================================
// UTILITY FUNCTIONS - CORRELATION ID AND REQUEST TRACKING
// =============================================================================

/**
 * Generates unique correlation ID for health check request tracking and distributed tracing integration.
 * This function extracts existing correlation ID from request headers (X-Correlation-ID), generates
 * UUID-based correlation ID if not provided in request using timestamp and random suffix for educational
 * simplicity, formats correlation ID as 'health-' + timestamp + '-' + random, stores correlation ID in
 * request object for middleware access, and returns correlation ID for use in logging and response headers.
 * 
 * Correlation ID features:
 * - Request correlation across microservices and distributed tracing systems
 * - Header-based ID propagation following HTTP standards and best practices
 * - Fallback generation for requests without correlation ID header
 * - Educational simplicity with timestamp-based approach for learning clarity
 * - Request object integration for middleware and downstream service access
 * 
 * @param {Object} req - Express.js request object containing headers and request metadata
 * @returns {string} Unique correlation ID for request tracking across logs and services
 */
function generateCorrelationId(req) {
    try {
        // Extract existing correlation ID from request headers (X-Correlation-ID)
        const existingCorrelationId = req.headers['x-correlation-id'] || 
                                     req.headers['X-Correlation-ID'] ||
                                     req.headers['correlation-id'];
        
        if (existingCorrelationId && typeof existingCorrelationId === 'string' && existingCorrelationId.trim()) {
            // Use existing correlation ID if provided and valid
            const correlationId = existingCorrelationId.trim();
            req.correlationId = correlationId;
            
            logger.debug('Using existing correlation ID from request headers', {
                correlationId: correlationId,
                source: 'request_header',
                method: req.method,
                path: req.path
            });
            
            return correlationId;
        }
        
        // Generate UUID-based correlation ID if not provided in request
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        
        // Format correlation ID as 'health-' + timestamp + '-' + random for educational clarity
        const correlationId = `health-${timestamp}-${randomSuffix}`;
        
        // Store correlation ID in request object for middleware access
        req.correlationId = correlationId;
        
        logger.debug('Generated new correlation ID for health check request', {
            correlationId: correlationId,
            source: 'generated',
            method: req.method,
            path: req.path,
            timestamp: timestamp
        });
        
        // Return correlation ID for use in logging and response headers
        return correlationId;
        
    } catch (error) {
        // Handle correlation ID generation errors gracefully
        logger.warn('Failed to generate correlation ID, using fallback', {
            error: error.message,
            method: req.method,
            path: req.path
        });
        
        // Fallback correlation ID for error scenarios
        const fallbackId = `health-error-${Date.now()}`;
        req.correlationId = fallbackId;
        
        return fallbackId;
    }
}

/**
 * Logs health check requests with structured metadata for operational monitoring and debugging.
 * This function extracts request details including method, path, user-agent, and IP address,
 * creates request metadata object with correlation ID and endpoint type, includes query parameters
 * for detailed health requests, logs request using logger.debug() with structured metadata,
 * updates REQUEST_COUNTERS for the specific endpoint type, and records request timestamp for
 * response time calculation and performance monitoring.
 * 
 * Request logging features:
 * - Comprehensive request metadata capture including client information
 * - Structured logging format for operational monitoring and log aggregation
 * - Query parameter logging for detailed health check request analysis
 * - Performance counter integration for endpoint usage statistics
 * - Request timestamp recording for accurate response time measurement
 * 
 * @param {Object} req - Express.js request object containing request metadata and headers
 * @param {string} endpoint - Endpoint type identifier (health, liveness, readiness) for categorization
 * @param {string} correlationId - Unique correlation ID for request tracking and tracing
 * @returns {void} No return value - logs request information using structured logger
 */
function logHealthRequest(req, endpoint, correlationId) {
    try {
        // Extract request details (method, path, user-agent, ip address)
        const requestDetails = {
            method: req.method || 'UNKNOWN',
            path: req.path || req.url || '/',
            originalUrl: req.originalUrl || req.url || '/',
            userAgent: req.headers['user-agent'] || 'unknown',
            clientIp: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
            httpVersion: req.httpVersion || '1.1',
            protocol: req.protocol || 'http'
        };
        
        // Include query parameters for detailed health requests
        const queryParams = req.query && Object.keys(req.query).length > 0 ? req.query : null;
        
        // Create request metadata object with correlation ID and endpoint type
        const requestMetadata = {
            correlationId: correlationId,
            endpoint: endpoint,
            timestamp: new Date().toISOString(),
            request: requestDetails,
            queryParameters: queryParams,
            headers: {
                contentType: req.headers['content-type'],
                acceptEncoding: req.headers['accept-encoding'],
                accept: req.headers['accept'],
                host: req.headers['host']
            }
        };
        
        // Log request using logger.debug() with structured metadata
        logger.debug(`Health check request started - ${endpoint}`, requestMetadata);
        
        // Update REQUEST_COUNTERS for the specific endpoint type
        if (REQUEST_COUNTERS[endpoint] !== undefined) {
            REQUEST_COUNTERS[endpoint]++;
        } else {
            REQUEST_COUNTERS[endpoint] = 1;
        }
        
        // Record request timestamp for response time calculation in req object
        req.healthRequestStartTime = Date.now();
        req.healthEndpoint = endpoint;
        
    } catch (error) {
        // Handle request logging errors gracefully - don't disrupt request processing
        logger.warn('Failed to log health check request details', {
            correlationId: correlationId,
            endpoint: endpoint,
            error: error.message,
            method: req.method,
            path: req.path
        });
        
        // Still update counters even if logging fails
        if (REQUEST_COUNTERS[endpoint] !== undefined) {
            REQUEST_COUNTERS[endpoint]++;
        } else {
            REQUEST_COUNTERS[endpoint] = 1;
        }
        
        req.healthRequestStartTime = Date.now();
        req.healthEndpoint = endpoint;
    }
}

/**
 * Logs health check responses with performance metrics and operational data for monitoring.
 * This function creates response metadata with status code and health status, includes response time
 * and performance metrics, adds correlation ID for request/response correlation, logs response using
 * logger.httpRequest() for HTTP-specific formatting, updates RESPONSE_TIME_TRACKER with current response
 * time, and calculates and logs average response time if enabled for performance monitoring.
 * 
 * Response logging features:
 * - Comprehensive response metadata including status and performance metrics
 * - HTTP-specific log formatting for operational monitoring and analysis
 * - Response time tracking with performance threshold validation
 * - Correlation ID propagation for request/response relationship tracking
 * - Average response time calculation for performance trend analysis
 * 
 * @param {Object} req - Express.js request object containing request metadata and timing information
 * @param {Object} res - Express.js response object containing response metadata and status
 * @param {Object} healthData - Health check response data with status and metrics information
 * @param {number} responseTime - Response time in milliseconds for performance monitoring
 * @param {string} correlationId - Unique correlation ID for request/response correlation
 * @returns {void} No return value - logs response information with performance metrics
 */
function logHealthResponse(req, res, healthData, responseTime, correlationId) {
    try {
        // Create response metadata with status code and health status
        const responseMetadata = {
            correlationId: correlationId,
            endpoint: req.healthEndpoint || 'unknown',
            statusCode: res.statusCode,
            healthStatus: healthData?.status || 'unknown',
            responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
            timestamp: new Date().toISOString(),
            request: {
                method: req.method,
                path: req.path,
                clientIp: req.ip || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown'
            },
            response: {
                contentType: res.getHeader('content-type'),
                contentLength: res.getHeader('content-length'),
                correlationHeader: res.getHeader('x-correlation-id')
            }
        };
        
        // Include response time and performance metrics
        const performanceMetrics = {
            responseTimeMs: responseTime,
            isWithinThreshold: responseTime < 50, // 50ms threshold for health checks
            thresholdMs: 50
        };
        
        responseMetadata.performance = performanceMetrics;
        
        // Log response using logger.httpRequest() for HTTP-specific formatting
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        const logMessage = `Health check response completed - ${req.healthEndpoint} - ${res.statusCode} - ${responseTime.toFixed(2)}ms`;
        
        if (logLevel === 'warn') {
            logger.warn(logMessage, responseMetadata);
        } else {
            logger.httpRequest(logMessage, responseMetadata);
        }
        
        // Update RESPONSE_TIME_TRACKER with current response time
        const endpoint = req.healthEndpoint;
        if (endpoint && RESPONSE_TIME_TRACKER[endpoint]) {
            RESPONSE_TIME_TRACKER[endpoint].push(responseTime);
            
            // Keep only last 100 response times for memory efficiency
            if (RESPONSE_TIME_TRACKER[endpoint].length > 100) {
                RESPONSE_TIME_TRACKER[endpoint].shift();
            }
            
            // Calculate and log average response time if enabled
            const responseTimes = RESPONSE_TIME_TRACKER[endpoint];
            const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            
            logger.debug('Updated response time tracking', {
                correlationId: correlationId,
                endpoint: endpoint,
                currentResponseTime: responseTime,
                averageResponseTime: Math.round(averageResponseTime * 100) / 100,
                sampleSize: responseTimes.length
            });
        }
        
    } catch (error) {
        // Handle response logging errors gracefully - don't disrupt response
        logger.error('Failed to log health check response details', {
            correlationId: correlationId,
            endpoint: req.healthEndpoint,
            statusCode: res.statusCode,
            responseTime: responseTime,
            error: error.message
        });
    }
}

// =============================================================================
// UTILITY FUNCTIONS - REQUEST VALIDATION AND ERROR HANDLING
// =============================================================================

/**
 * Validates and sanitizes query parameters for health endpoint requests.
 * This function extracts 'detailed' query parameter and validates boolean value, defaults 'detailed'
 * to false if not provided or invalid, validates any additional query parameters for security,
 * sanitizes query values to prevent injection attacks, creates validated query object with sanitized
 * parameters, and returns validated query parameters for controller use.
 * 
 * Query validation features:
 * - Boolean parameter validation with type coercion and default values
 * - Input sanitization for security against injection attacks and malicious input
 * - Additional parameter validation for extensibility and security hardening
 * - Sanitized query object creation for safe controller consumption
 * - Educational validation patterns demonstrating input handling best practices
 * 
 * @param {Object} query - Express.js request.query object containing URL query parameters
 * @returns {Object} Validated query parameters object with sanitized values
 */
function validateHealthQuery(query) {
    try {
        // Create validated query object with default values
        const validatedQuery = {};
        
        // Extract 'detailed' query parameter and validate boolean value
        if (query && typeof query === 'object') {
            // Handle 'detailed' parameter with boolean validation
            const detailedParam = query.detailed;
            if (detailedParam !== undefined) {
                // Convert various representations to boolean
                if (typeof detailedParam === 'boolean') {
                    validatedQuery.detailed = detailedParam;
                } else if (typeof detailedParam === 'string') {
                    const lowerParam = detailedParam.toLowerCase().trim();
                    validatedQuery.detailed = lowerParam === 'true' || lowerParam === '1' || lowerParam === 'yes';
                } else if (typeof detailedParam === 'number') {
                    validatedQuery.detailed = detailedParam === 1;
                } else {
                    // Default 'detailed' to false if not provided or invalid
                    validatedQuery.detailed = false;
                }
            } else {
                validatedQuery.detailed = false;
            }
            
            // Validate any additional query parameters for security
            const allowedParams = ['detailed', 'format', 'timeout', 'include'];
            
            for (const [key, value] of Object.entries(query)) {
                // Sanitize query values to prevent injection attacks
                if (typeof key === 'string' && allowedParams.includes(key)) {
                    if (key === 'format' && typeof value === 'string') {
                        // Validate format parameter
                        const validFormats = ['json', 'text'];
                        validatedQuery.format = validFormats.includes(value.toLowerCase()) ? value.toLowerCase() : 'json';
                    } else if (key === 'timeout' && (typeof value === 'string' || typeof value === 'number')) {
                        // Validate timeout parameter (in seconds)
                        const timeoutValue = parseInt(value, 10);
                        if (!isNaN(timeoutValue) && timeoutValue > 0 && timeoutValue <= 30) {
                            validatedQuery.timeout = timeoutValue;
                        } else {
                            validatedQuery.timeout = 5; // Default 5 seconds
                        }
                    } else if (key === 'include' && typeof value === 'string') {
                        // Validate include parameter for additional metrics
                        const validIncludes = ['metrics', 'system', 'performance'];
                        const includeValues = value.split(',').map(v => v.trim().toLowerCase());
                        validatedQuery.include = includeValues.filter(v => validIncludes.includes(v));
                    }
                }
            }
        } else {
            // Default 'detailed' to false if query object is invalid
            validatedQuery.detailed = false;
        }
        
        // Set default format if not specified
        if (!validatedQuery.format) {
            validatedQuery.format = 'json';
        }
        
        // Set default timeout if not specified
        if (!validatedQuery.timeout) {
            validatedQuery.timeout = 5;
        }
        
        logger.debug('Validated health query parameters', {
            original: query,
            validated: validatedQuery,
            detailedRequested: validatedQuery.detailed
        });
        
        // Return validated query parameters for controller use
        return validatedQuery;
        
    } catch (error) {
        // Handle query validation errors gracefully with safe defaults
        logger.warn('Failed to validate health query parameters, using defaults', {
            error: error.message,
            originalQuery: query
        });
        
        return {
            detailed: false,
            format: 'json',
            timeout: 5,
            include: []
        };
    }
}

/**
 * Handles health check errors with proper HTTP status codes and error response formatting.
 * This function determines appropriate HTTP status code based on error type, uses HTTP_STATUS.SERVICE_UNAVAILABLE
 * for health check failures, uses HTTP_STATUS.INTERNAL_SERVER_ERROR for unexpected errors, logs error using
 * logger.error() with correlation ID and stack trace, creates error response object with status and message,
 * sets proper Content-Type header using CONTENT_TYPES.APPLICATION_JSON, sends error response with appropriate
 * status code, and calls next(error) if response cannot be sent for Express error handling.
 * 
 * Error handling features:
 * - Intelligent HTTP status code selection based on error type and context
 * - Comprehensive error logging with correlation ID tracking and stack trace information
 * - Standardized error response format with consistent structure and messaging
 * - Express.js error handling middleware integration for comprehensive error processing
 * - Production-safe error responses that don't expose sensitive information
 * 
 * @param {Error} error - JavaScript Error object containing error information and stack trace
 * @param {Object} req - Express.js request object for correlation ID and request metadata
 * @param {Object} res - Express.js response object for sending error response to client
 * @param {Function} next - Express.js next function for error middleware propagation
 * @param {string} correlationId - Unique correlation ID for error tracking and debugging
 * @returns {void} No return value - sends error response or calls next() for Express error handling
 */
function handleHealthError(error, req, res, next, correlationId) {
    try {
        // Determine appropriate HTTP status code based on error type
        let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        let errorMessage = ERROR_MESSAGES.INTERNAL_ERROR;
        
        // Check if this is a health-specific error with custom status code
        if (error.statusCode) {
            statusCode = error.statusCode;
        } else if (error.name === 'HealthServiceError') {
            // Use HTTP_STATUS.SERVICE_UNAVAILABLE for health check failures
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
            errorMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
        } else if (error.name === 'TimeoutError') {
            statusCode = HTTP_STATUS.REQUEST_TIMEOUT || 408;
            errorMessage = 'Health check timeout';
        } else if (error.name === 'ValidationError') {
            statusCode = HTTP_STATUS.BAD_REQUEST || 400;
            errorMessage = 'Invalid health check request';
        }
        
        // Log error using logger.error() with correlation ID and stack trace
        logger.error('Health check error occurred', {
            correlationId: correlationId,
            errorName: error.name,
            errorMessage: error.message,
            statusCode: statusCode,
            endpoint: req.healthEndpoint || req.path,
            method: req.method,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Check if response has already been sent to prevent duplicate responses
        if (res.headersSent) {
            logger.warn('Response headers already sent, delegating to Express error handler', {
                correlationId: correlationId,
                statusCode: statusCode
            });
            
            // Call next(error) if response cannot be sent for Express error handling
            return next(error);
        }
        
        // Create error response object with status and message
        const errorResponse = {
            success: false,
            error: true,
            status: 'error',
            message: errorMessage,
            correlationId: correlationId,
            timestamp: new Date().toISOString(),
            endpoint: req.healthEndpoint || req.path
        };
        
        // Include additional error details in development environment
        if (process.env.NODE_ENV === 'development') {
            errorResponse.details = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }
        
        // Set proper Content-Type header using CONTENT_TYPES.APPLICATION_JSON
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        res.set('X-Correlation-ID', correlationId);
        
        // Send error response with appropriate status code
        res.status(statusCode).json(errorResponse);
        
        logger.debug('Sent error response for health check', {
            correlationId: correlationId,
            statusCode: statusCode,
            errorType: error.name,
            endpoint: req.healthEndpoint
        });
        
    } catch (handlerError) {
        // Handle errors in the error handler itself
        logger.error('Failed to handle health check error properly', {
            originalError: error.message,
            handlerError: handlerError.message,
            correlationId: correlationId
        });
        
        // Fallback to Express default error handling
        next(error);
    }
}

// =============================================================================
// HEALTH CHECK CONTROLLER FUNCTIONS
// =============================================================================

/**
 * Express controller function for /health endpoint providing comprehensive health status with optional detailed metrics.
 * This function generates correlation ID using generateCorrelationId(req), starts performance timer using startTimer()
 * with correlation ID, logs incoming health request using logHealthRequest(), validates and sanitizes query parameters
 * using validateHealthQuery(), determines if detailed health info requested from query.detailed, calls getBasicHealth()
 * or getDetailedHealth() based on query parameter, stops performance timer and calculates response time, sets response
 * headers (Content-Type: application/json, X-Correlation-ID), determines HTTP status based on health status (200 OK or
 * 503 Service Unavailable), sends JSON response with health data using res.status().json(), logs response details using
 * logHealthResponse(), and handles any errors using handleHealthError() and Express 5.1.0 automatic error handling.
 * 
 * Health endpoint features:
 * - Optional detailed metrics based on query parameter with comprehensive system information
 * - High-precision performance monitoring with sub-50ms response time targets
 * - Correlation ID tracking for distributed tracing and operational debugging
 * - Comprehensive request/response logging with structured metadata for monitoring
 * - HTTP status code mapping based on health status for proper client handling
 * - Express.js 5.1.0 automatic promise error handling for robust error management
 * 
 * @param {Object} req - Express.js request object containing query parameters and headers
 * @param {Object} res - Express.js response object for sending health status response
 * @param {Function} next - Express.js next function for error handling middleware
 * @returns {Promise<void>} Promise resolving when HTTP response is sent or error is handled
 */
async function getHealthStatus(req, res, next) {
    let correlationId = null;
    let timer = null;
    
    try {
        // Generate correlation ID using generateCorrelationId(req)
        correlationId = generateCorrelationId(req);
        
        // Start performance timer using startTimer() with correlation ID
        timer = startTimer(`health_check_${correlationId}`);
        
        // Log incoming health request using logHealthRequest()
        logHealthRequest(req, 'health', correlationId);
        
        // Validate and sanitize query parameters using validateHealthQuery()
        const validatedQuery = validateHealthQuery(req.query);
        
        // Determine if detailed health info requested from query.detailed
        const requestDetailedHealth = validatedQuery.detailed;
        
        let healthData;
        
        if (requestDetailedHealth) {
            // Call getDetailedHealth() for comprehensive system metrics and resource utilization
            logger.debug('Requesting detailed health information', {
                correlationId: correlationId,
                endpoint: 'health',
                detailedRequested: true
            });
            
            healthData = await getDetailedHealth();
        } else {
            // Call getBasicHealth() for essential health status without detailed metrics
            logger.debug('Requesting basic health information', {
                correlationId: correlationId,
                endpoint: 'health',
                detailedRequested: false
            });
            
            healthData = await getBasicHealth();
        }
        
        // Stop performance timer and calculate response time
        const responseTime = stopTimer(timer);
        
        // Validate health data response from service
        if (!healthData || typeof healthData !== 'object') {
            throw createCustomError(
                'Health service returned invalid data', 
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                'HEALTH_SERVICE_ERROR'
            );
        }
        
        // Determine HTTP status based on health status (200 OK or 503 Service Unavailable)
        let httpStatus = HTTP_STATUS.OK;
        
        if (healthData.status === 'unhealthy' || healthData.status === 'down') {
            httpStatus = HTTP_STATUS.SERVICE_UNAVAILABLE;
        } else if (healthData.status === 'degraded') {
            // Degraded status still returns 200 OK but indicates performance issues
            httpStatus = HTTP_STATUS.OK;
        }
        
        // Set response headers (Content-Type: application/json, X-Correlation-ID)
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        res.set('X-Correlation-ID', correlationId);
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        // Add performance metrics to response
        const responseData = {
            ...healthData,
            metadata: {
                correlationId: correlationId,
                responseTime: Math.round(responseTime * 100) / 100,
                timestamp: new Date().toISOString(),
                endpoint: '/health',
                detailed: requestDetailedHealth
            }
        };
        
        // Send JSON response with health data using res.status().json()
        res.status(httpStatus).json(responseData);
        
        // Log response details using logHealthResponse()
        logHealthResponse(req, res, healthData, responseTime, correlationId);
        
        logger.info('Health check completed successfully', {
            correlationId: correlationId,
            endpoint: 'health',
            status: healthData.status,
            httpStatus: httpStatus,
            responseTime: responseTime,
            detailed: requestDetailedHealth
        });
        
    } catch (error) {
        // Handle any errors using handleHealthError() and Express 5.1.0 automatic error handling
        
        // Stop timer if it was started
        if (timer) {
            try {
                stopTimer(timer);
            } catch (timerError) {
                logger.warn('Failed to stop timer in error handler', { 
                    correlationId: correlationId, 
                    timerError: timerError.message 
                });
            }
        }
        
        // Use handleHealthError for consistent error handling
        handleHealthError(error, req, res, next, correlationId || 'unknown');
    }
}

/**
 * Express controller function for /livez Kubernetes liveness probe endpoint for container restart decisions.
 * This function generates correlation ID for liveness probe request tracking, starts high-precision performance
 * timer for sub-10ms target, logs liveness probe request using logger.debug() with minimal overhead, calls
 * getLivenessStatus() service function for application health check, stops performance timer and ensures
 * response time under 10ms target, sets minimal response headers for Kubernetes efficiency, determines status:
 * 200 OK if alive, 503 Service Unavailable if dead, sends minimal JSON response optimized for Kubernetes probe
 * efficiency, logs liveness probe completion with status and timing, and handles errors with fast fallback to
 * ensure probe responsiveness.
 * 
 * Liveness probe features:
 * - High-precision performance monitoring with sub-10ms response time targets
 * - Kubernetes-optimized minimal response format for efficient probe processing
 * - Fast error handling with fallback responses to prevent container restarts
 * - Minimal logging overhead to maintain probe performance characteristics
 * - Binary health status determination for clear container restart decisions
 * 
 * @param {Object} req - Express.js request object for liveness probe metadata
 * @param {Object} res - Express.js response object for liveness status response
 * @param {Function} next - Express.js next function for error handling middleware
 * @returns {Promise<void>} Promise resolving when liveness probe response is sent or error is handled
 */
async function getLivenessProbe(req, res, next) {
    let correlationId = null;
    let timer = null;
    
    try {
        // Generate correlation ID for liveness probe request tracking
        correlationId = generateCorrelationId(req);
        
        // Start high-precision performance timer for sub-10ms target
        timer = startTimer(`liveness_probe_${correlationId}`);
        
        // Log liveness probe request using logger.debug() with minimal overhead
        logHealthRequest(req, 'liveness', correlationId);
        
        // Call getLivenessStatus() service function for application health check
        const livenessData = await getLivenessStatus();
        
        // Stop performance timer and ensure response time under 10ms target
        const responseTime = stopTimer(timer);
        
        // Validate liveness data response from service
        if (!livenessData || typeof livenessData !== 'object') {
            throw createCustomError(
                'Liveness service returned invalid data',
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                'LIVENESS_SERVICE_ERROR'
            );
        }
        
        // Determine status: 200 OK if alive, 503 Service Unavailable if dead
        let httpStatus = HTTP_STATUS.OK;
        
        if (livenessData.status === 'unhealthy' || livenessData.status === 'dead' || livenessData.alive === false) {
            httpStatus = HTTP_STATUS.SERVICE_UNAVAILABLE;
        }
        
        // Set minimal response headers for Kubernetes efficiency
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        res.set('X-Correlation-ID', correlationId);
        res.set('Cache-Control', 'no-cache');
        
        // Send minimal JSON response optimized for Kubernetes probe efficiency
        const responseData = {
            status: livenessData.status,
            alive: livenessData.alive !== false,
            timestamp: new Date().toISOString(),
            responseTime: Math.round(responseTime * 100) / 100
        };
        
        res.status(httpStatus).json(responseData);
        
        // Log liveness probe completion with status and timing
        logHealthResponse(req, res, livenessData, responseTime, correlationId);
        
        // Performance warning if response time exceeds target
        if (responseTime > 10) {
            logger.warn('Liveness probe response time exceeded target', {
                correlationId: correlationId,
                responseTime: responseTime,
                target: 10,
                status: livenessData.status
            });
        }
        
        logger.debug('Liveness probe completed', {
            correlationId: correlationId,
            status: livenessData.status,
            alive: responseData.alive,
            responseTime: responseTime,
            httpStatus: httpStatus
        });
        
    } catch (error) {
        // Handle errors with fast fallback to ensure probe responsiveness
        
        // Stop timer if it was started
        if (timer) {
            try {
                stopTimer(timer);
            } catch (timerError) {
                logger.warn('Failed to stop liveness timer in error handler', { 
                    correlationId: correlationId 
                });
            }
        }
        
        // Fast error response for liveness probe
        logger.error('Liveness probe error - returning unavailable status', {
            correlationId: correlationId || 'unknown',
            error: error.message,
            timestamp: new Date().toISOString()
        });
        
        if (!res.headersSent) {
            res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
            res.set('X-Correlation-ID', correlationId || 'unknown');
            
            res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                status: 'unhealthy',
                alive: false,
                error: 'liveness_check_failed',
                timestamp: new Date().toISOString()
            });
        } else {
            next(error);
        }
    }
}

/**
 * Express controller function for /readyz Kubernetes readiness probe endpoint for traffic routing decisions.
 * This function generates correlation ID for readiness probe request tracking, starts performance timer targeting
 * sub-25ms response time, logs readiness probe request for traffic routing monitoring, calls getReadinessStatus()
 * service function for traffic readiness assessment, evaluates dependency health and resource utilization for
 * traffic handling, stops performance timer and validates 25ms response time target, sets response headers with
 * dependency status information, determines status: 200 OK if ready for traffic, 503 if not ready, sends JSON
 * response with readiness status and dependency information, logs readiness probe results for load balancer
 * decision support, and handles errors gracefully to prevent traffic routing disruption.
 * 
 * Readiness probe features:
 * - Comprehensive traffic readiness assessment including dependency health validation
 * - Performance monitoring with sub-25ms response time targets for load balancer efficiency
 * - Dependency status reporting for traffic routing decision support and troubleshooting
 * - Load balancer integration with proper HTTP status codes and response formats
 * - Graceful error handling to prevent unnecessary traffic routing disruption
 * 
 * @param {Object} req - Express.js request object for readiness probe metadata
 * @param {Object} res - Express.js response object for readiness status response
 * @param {Function} next - Express.js next function for error handling middleware
 * @returns {Promise<void>} Promise resolving when readiness probe response is sent or error is handled
 */
async function getReadinessProbe(req, res, next) {
    let correlationId = null;
    let timer = null;
    
    try {
        // Generate correlation ID for readiness probe request tracking
        correlationId = generateCorrelationId(req);
        
        // Start performance timer targeting sub-25ms response time
        timer = startTimer(`readiness_probe_${correlationId}`);
        
        // Log readiness probe request for traffic routing monitoring
        logHealthRequest(req, 'readiness', correlationId);
        
        // Call getReadinessStatus() service function for traffic readiness assessment
        const readinessData = await getReadinessStatus();
        
        // Stop performance timer and validate 25ms response time target
        const responseTime = stopTimer(timer);
        
        // Validate readiness data response from service
        if (!readinessData || typeof readinessData !== 'object') {
            throw createCustomError(
                'Readiness service returned invalid data',
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                'READINESS_SERVICE_ERROR'
            );
        }
        
        // Determine status: 200 OK if ready for traffic, 503 if not ready
        let httpStatus = HTTP_STATUS.OK;
        
        if (readinessData.status === 'unhealthy' || 
            readinessData.status === 'not_ready' || 
            readinessData.ready === false) {
            httpStatus = HTTP_STATUS.SERVICE_UNAVAILABLE;
        }
        
        // Set response headers with dependency status information
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        res.set('X-Correlation-ID', correlationId);
        res.set('Cache-Control', 'no-cache');
        
        // Include dependency information in headers if available
        if (readinessData.dependencies) {
            const healthyDeps = Object.values(readinessData.dependencies).filter(dep => dep.status === 'healthy').length;
            const totalDeps = Object.keys(readinessData.dependencies).length;
            res.set('X-Dependencies-Healthy', `${healthyDeps}/${totalDeps}`);
        }
        
        // Send JSON response with readiness status and dependency information
        const responseData = {
            status: readinessData.status,
            ready: readinessData.ready !== false,
            dependencies: readinessData.dependencies || {},
            timestamp: new Date().toISOString(),
            responseTime: Math.round(responseTime * 100) / 100
        };
        
        res.status(httpStatus).json(responseData);
        
        // Log readiness probe results for load balancer decision support
        logHealthResponse(req, res, readinessData, responseTime, correlationId);
        
        // Performance warning if response time exceeds target
        if (responseTime > 25) {
            logger.warn('Readiness probe response time exceeded target', {
                correlationId: correlationId,
                responseTime: responseTime,
                target: 25,
                status: readinessData.status,
                ready: responseData.ready
            });
        }
        
        logger.debug('Readiness probe completed', {
            correlationId: correlationId,
            status: readinessData.status,
            ready: responseData.ready,
            responseTime: responseTime,
            httpStatus: httpStatus,
            dependencyCount: Object.keys(readinessData.dependencies || {}).length
        });
        
    } catch (error) {
        // Handle errors gracefully to prevent traffic routing disruption
        
        // Stop timer if it was started
        if (timer) {
            try {
                stopTimer(timer);
            } catch (timerError) {
                logger.warn('Failed to stop readiness timer in error handler', { 
                    correlationId: correlationId 
                });
            }
        }
        
        // Graceful error response for readiness probe
        logger.error('Readiness probe error - returning not ready status', {
            correlationId: correlationId || 'unknown',
            error: error.message,
            timestamp: new Date().toISOString()
        });
        
        if (!res.headersSent) {
            res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
            res.set('X-Correlation-ID', correlationId || 'unknown');
            
            res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                status: 'unhealthy',
                ready: false,
                error: 'readiness_check_failed',
                dependencies: {},
                timestamp: new Date().toISOString()
            });
        } else {
            next(error);
        }
    }
}

// =============================================================================
// UTILITY AND STATISTICS FUNCTIONS
// =============================================================================

/**
 * Utility function returning health controller operational statistics for monitoring and performance analysis.
 * This function collects request counters from REQUEST_COUNTERS global, calculates average response times from
 * RESPONSE_TIME_TRACKER, determines request rate and frequency statistics, includes performance percentiles
 * (95th, 99th) for response times, adds controller uptime and initialization status, calculates error rate from
 * recent health check failures, and returns comprehensive controller statistics object for monitoring.
 * 
 * Controller statistics features:
 * - Comprehensive request counting across all health endpoints with usage patterns
 * - Response time analysis including averages, percentiles, and performance trends
 * - Request rate calculation and frequency statistics for capacity planning
 * - Error rate monitoring with failure pattern analysis for reliability assessment
 * - Controller operational status and uptime tracking for availability monitoring
 * 
 * @returns {Object} Controller statistics with request counts, response times, and performance metrics
 */
function getControllerStats() {
    try {
        const currentTime = Date.now();
        
        // Collect request counters from REQUEST_COUNTERS global
        const requestCounters = { ...REQUEST_COUNTERS };
        const totalRequests = Object.values(requestCounters).reduce((sum, count) => sum + count, 0);
        
        // Calculate average response times from RESPONSE_TIME_TRACKER
        const responseTimeStats = {};
        
        for (const [endpoint, responseTimes] of Object.entries(RESPONSE_TIME_TRACKER)) {
            if (responseTimes && responseTimes.length > 0) {
                const sortedTimes = [...responseTimes].sort((a, b) => a - b);
                const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
                
                responseTimeStats[endpoint] = {
                    average: Math.round(avgTime * 100) / 100,
                    min: sortedTimes[0],
                    max: sortedTimes[sortedTimes.length - 1],
                    p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || sortedTimes[sortedTimes.length - 1],
                    p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || sortedTimes[sortedTimes.length - 1],
                    sampleSize: responseTimes.length
                };
            } else {
                responseTimeStats[endpoint] = {
                    average: 0,
                    min: 0,
                    max: 0,
                    p95: 0,
                    p99: 0,
                    sampleSize: 0
                };
            }
        }
        
        // Determine request rate and frequency statistics (assuming module startup time)
        const moduleUptime = (currentTime - METRICS_START_TIME || Date.now()) / 1000; // seconds
        const requestsPerSecond = moduleUptime > 0 ? totalRequests / moduleUptime : 0;
        const requestsPerMinute = requestsPerSecond * 60;
        
        // Calculate overall performance metrics
        const allResponseTimes = Object.values(RESPONSE_TIME_TRACKER).flat().filter(time => time > 0);
        let overallPerformance = {
            averageResponseTime: 0,
            totalResponses: allResponseTimes.length,
            fastestResponse: 0,
            slowestResponse: 0
        };
        
        if (allResponseTimes.length > 0) {
            overallPerformance.averageResponseTime = allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length;
            overallPerformance.fastestResponse = Math.min(...allResponseTimes);
            overallPerformance.slowestResponse = Math.max(...allResponseTimes);
        }
        
        // Add controller uptime and initialization status
        const controllerStats = {
            timestamp: currentTime,
            uptime: moduleUptime,
            requests: {
                total: totalRequests,
                byEndpoint: requestCounters,
                rate: {
                    perSecond: Math.round(requestsPerSecond * 100) / 100,
                    perMinute: Math.round(requestsPerMinute * 100) / 100
                }
            },
            responseTime: {
                byEndpoint: responseTimeStats,
                overall: {
                    average: Math.round(overallPerformance.averageResponseTime * 100) / 100,
                    fastest: Math.round(overallPerformance.fastestResponse * 100) / 100,
                    slowest: Math.round(overallPerformance.slowestResponse * 100) / 100,
                    totalSamples: overallPerformance.totalResponses
                }
            },
            performance: {
                healthTarget: '< 50ms',
                livenessTarget: '< 10ms',
                readinessTarget: '< 25ms',
                averagePerformance: overallPerformance.averageResponseTime < 50 ? 'good' : 'needs_improvement'
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            },
            configuration: {
                initialized: HEALTH_CONTROLLER_CONFIG !== null,
                correlationIdTracking: true,
                performanceMonitoring: true,
                structuredLogging: true
            }
        };
        
        logger.debug('Generated health controller statistics', {
            totalRequests: totalRequests,
            averageResponseTime: overallPerformance.averageResponseTime,
            uptime: moduleUptime,
            performanceRating: controllerStats.performance.averagePerformance
        });
        
        // Return comprehensive controller statistics object for monitoring
        return controllerStats;
        
    } catch (error) {
        // Handle stats generation errors gracefully
        logger.error('Failed to generate controller statistics', {
            error: error.message,
            timestamp: Date.now()
        });
        
        return {
            timestamp: Date.now(),
            error: true,
            errorMessage: error.message,
            requests: { total: 0, byEndpoint: REQUEST_COUNTERS },
            responseTime: { overall: { average: 0, totalSamples: 0 } },
            uptime: 0
        };
    }
}

/**
 * Utility function for resetting controller statistics for testing and monitoring reset scenarios.
 * This function resets REQUEST_COUNTERS to zero for all endpoint types, clears RESPONSE_TIME_TRACKER
 * arrays for all endpoints, resets any cached performance metrics, logs statistics reset event using
 * logger.debug(), and updates controller initialization timestamp if needed.
 * 
 * Statistics reset features:
 * - Complete request counter reset for clean statistical baseline
 * - Response time history clearing for fresh performance tracking
 * - Performance metrics cache invalidation for accurate monitoring
 * - Comprehensive logging for operational visibility and debugging
 * - Controller state preservation while resetting operational metrics
 * 
 * @returns {void} No return value - resets global statistics tracking objects
 */
function resetControllerStats() {
    try {
        const resetTimestamp = Date.now();
        
        // Store previous values for logging
        const previousStats = {
            requestCounters: { ...REQUEST_COUNTERS },
            responseTimeSamples: Object.fromEntries(
                Object.entries(RESPONSE_TIME_TRACKER).map(([key, times]) => [key, times.length])
            )
        };
        
        // Reset REQUEST_COUNTERS to zero for all endpoint types
        REQUEST_COUNTERS = {
            health: 0,
            liveness: 0,
            readiness: 0
        };
        
        // Clear RESPONSE_TIME_TRACKER arrays for all endpoints
        RESPONSE_TIME_TRACKER = {
            health: [],
            liveness: [],
            readiness: []
        };
        
        // Reset any cached performance metrics (preserve configuration)
        // HEALTH_CONTROLLER_CONFIG is preserved to maintain initialization state
        
        // Log statistics reset event using logger.debug()
        logger.debug('Health controller statistics reset completed', {
            resetTimestamp: resetTimestamp,
            previousStats: previousStats,
            newStats: {
                requestCounters: REQUEST_COUNTERS,
                responseTimeSamples: Object.fromEntries(
                    Object.entries(RESPONSE_TIME_TRACKER).map(([key, times]) => [key, times.length])
                )
            }
        });
        
        logger.info('Controller statistics successfully reset', {
            timestamp: resetTimestamp,
            previousTotalRequests: Object.values(previousStats.requestCounters).reduce((sum, count) => sum + count, 0),
            previousResponseSamples: Object.values(previousStats.responseTimeSamples).reduce((sum, count) => sum + count, 0)
        });
        
    } catch (error) {
        // Handle reset errors gracefully
        logger.error('Failed to reset controller statistics completely', {
            error: error.message,
            timestamp: Date.now()
        });
        
        // Attempt partial reset to maintain system stability
        try {
            REQUEST_COUNTERS = { health: 0, liveness: 0, readiness: 0 };
            RESPONSE_TIME_TRACKER = { health: [], liveness: [], readiness: [] };
            
            logger.warn('Completed partial controller statistics reset after error');
        } catch (partialResetError) {
            logger.error('Failed to complete even partial statistics reset', partialResetError);
        }
    }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Export primary health controller function for /health endpoint handling with basic and detailed health status options
module.exports.getHealthStatus = getHealthStatus;

// Export Kubernetes liveness probe controller for /livez endpoint handling container restart decisions  
module.exports.getLivenessProbe = getLivenessProbe;

// Export Kubernetes readiness probe controller for /readyz endpoint handling traffic routing decisions
module.exports.getReadinessProbe = getReadinessProbe;

// Export monitoring utility function for retrieving health controller operational statistics and performance metrics
module.exports.getControllerStats = getControllerStats;

// Export testing utility function for resetting controller statistics and performance tracking data
module.exports.resetControllerStats = resetControllerStats;