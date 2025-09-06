/**
 * Express.js Health Check Middleware for Node.js Tutorial Application
 * 
 * This module provides comprehensive health monitoring capabilities including basic health status,
 * Kubernetes-compatible liveness and readiness probes, and detailed system diagnostics. Integrates
 * with the health service layer and logging system while maintaining educational simplicity and
 * production-ready patterns. Supports Express.js 5.1.0 automatic promise error handling and
 * demonstrates middleware patterns for the Node.js tutorial application.
 * 
 * Features:
 * - Basic health check endpoint for general availability monitoring
 * - Kubernetes liveness probe (/livez) indicating if application should be restarted
 * - Kubernetes readiness probe (/readyz) indicating if application can serve traffic
 * - Detailed health endpoint with comprehensive system diagnostics
 * - High-resolution timing using Node.js Performance API for response time tracking
 * - Request statistics tracking with success rates and performance monitoring
 * - Health service integration for business logic operations
 * - Comprehensive error handling with graceful degradation
 * - Production-ready performance with sub-50ms response time targets
 * 
 * Architecture:
 * - Express.js 5.1.0 middleware patterns with automatic promise error handling
 * - Integration with health service layer for business logic separation
 * - Structured logging for operational visibility and debugging
 * - Performance measurement using high-resolution timing APIs
 * - Configuration-driven behavior with environment-specific settings
 * - Statistics tracking for operational insights and monitoring integration
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async/await support and automatic error handling
 * - Node.js 22.11.0 LTS with Active LTS support and performance improvements
 * - Kubernetes deployment with standard liveness and readiness probe requirements
 * - Development, production, and test environments with environment-specific configuration
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Express.js middleware patterns, health check implementation, and performance monitoring
 */

// =============================================================================
// EXTERNAL DEPENDENCIES - NODE.JS BUILT-IN MODULES
// =============================================================================

// Node.js Performance API for high-resolution timing measurement in health check response time tracking
const { performance } = require('perf_hooks'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import health service for business logic operations including system health checks, liveness probes, and readiness validation
const { 
    getBasicHealth, 
    getDetailedHealth, 
    getLivenessStatus, 
    getReadinessStatus 
} = require('../services/health.js');

// Import structured logging utility for health check request tracking, error logging, and performance monitoring
const { 
    logger 
} = require('../utils/logger.js');

// Import HTTP status code constants for standardized health check response status codes
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import Content-Type header constants for proper JSON response formatting in health endpoints
const { 
    CONTENT_TYPES 
} = require('../utils/constants.js');

// Import route path constants for consistent health endpoint routing and middleware mounting
const { 
    ROUTES 
} = require('../utils/constants.js');

// Import configuration factory to access health check settings, timeouts, and environment-specific monitoring configurations
const { 
    getConfig 
} = require('../utils/config.js');

// Import custom error factory for creating health check specific errors with appropriate status codes and metadata
const { 
    createCustomError 
} = require('./error.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached health middleware configuration from getConfig()
 * Prevents repeated configuration loading during health checks for performance optimization
 * @type {Object|null}
 */
let HEALTH_CONFIG = null;

/**
 * Health check request statistics for monitoring and operational insights
 * Tracks cumulative request counts, success rates, and error patterns
 * @type {Object}
 */
let REQUEST_COUNTERS = {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: {
        health: { total: 0, successful: 0, failed: 0 },
        detailed: { total: 0, successful: 0, failed: 0 },
        liveness: { total: 0, successful: 0, failed: 0 },
        readiness: { total: 0, successful: 0, failed: 0 }
    }
};

/**
 * Response time tracking for performance monitoring and SLA compliance
 * Maintains current, average, maximum, and minimum response times
 * @type {Object}
 */
let RESPONSE_TIMES = {
    current: 0,
    average: 0,
    max: 0,
    min: Infinity,
    total: 0,
    samples: 0
};

// =============================================================================
// MIDDLEWARE INITIALIZATION
// =============================================================================

/**
 * Initializes health middleware configuration and performance tracking for monitoring setup.
 * This function loads application configuration using getConfig(), extracts health check
 * configuration and caches in HEALTH_CONFIG global, initializes REQUEST_COUNTERS tracking
 * object for health endpoint statistics, initializes RESPONSE_TIMES tracking object for
 * performance monitoring, configures health check timeouts and thresholds from configuration,
 * and logs health middleware initialization with configuration details.
 * 
 * Initialization process:
 * - Configuration loading with error handling and fallback to default values
 * - Performance tracking initialization with zero baseline values
 * - Request statistics setup with endpoint-specific counters
 * - Response time tracking configuration with statistical tracking
 * - Comprehensive logging of initialization completion with operational details
 * 
 * This function implements graceful degradation - if configuration loading fails,
 * it continues operation with safe default values to ensure application startup succeeds.
 * 
 * @returns {void} No return value - initializes global health middleware state and configuration
 */
function initializeHealthMiddleware() {
    try {
        // Load application configuration using getConfig() for health middleware settings
        const config = getConfig();
        HEALTH_CONFIG = config.health || {};
        
        // Set default configuration values if not provided
        HEALTH_CONFIG = {
            timeout: HEALTH_CONFIG.timeout || 5000, // 5 second default timeout
            responseTimeThreshold: HEALTH_CONFIG.responseTimeThreshold || 50, // 50ms SLA target
            enableDetailedLogging: HEALTH_CONFIG.enableDetailedLogging !== false, // Default enabled
            enableStatistics: HEALTH_CONFIG.enableStatistics !== false, // Default enabled
            ...HEALTH_CONFIG
        };
        
        // Initialize REQUEST_COUNTERS tracking object for health endpoint statistics
        REQUEST_COUNTERS = {
            total: 0,
            successful: 0,
            failed: 0,
            byEndpoint: {
                health: { total: 0, successful: 0, failed: 0 },
                detailed: { total: 0, successful: 0, failed: 0 },
                liveness: { total: 0, successful: 0, failed: 0 },
                readiness: { total: 0, successful: 0, failed: 0 }
            },
            startTime: Date.now()
        };
        
        // Initialize RESPONSE_TIMES tracking object for performance monitoring
        RESPONSE_TIMES = {
            current: 0,
            average: 0,
            max: 0,
            min: Infinity,
            total: 0,
            samples: 0
        };
        
        // Log health middleware initialization with configuration details
        logger.info('Health middleware initialized successfully', {
            timeout: HEALTH_CONFIG.timeout,
            responseTimeThreshold: HEALTH_CONFIG.responseTimeThreshold,
            enableDetailedLogging: HEALTH_CONFIG.enableDetailedLogging,
            enableStatistics: HEALTH_CONFIG.enableStatistics,
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        });
        
    } catch (error) {
        // Handle initialization errors gracefully with fallback configuration
        logger.error('Failed to initialize health middleware, using fallback configuration', {
            error: error.message,
            stack: error.stack
        });
        
        // Set safe fallback values for continued operation
        HEALTH_CONFIG = {
            timeout: 5000,
            responseTimeThreshold: 50,
            enableDetailedLogging: true,
            enableStatistics: true
        };
        
        REQUEST_COUNTERS = {
            total: 0,
            successful: 0,
            failed: 0,
            byEndpoint: {
                health: { total: 0, successful: 0, failed: 0 },
                detailed: { total: 0, successful: 0, failed: 0 },
                liveness: { total: 0, successful: 0, failed: 0 },
                readiness: { total: 0, successful: 0, failed: 0 }
            },
            startTime: Date.now()
        };
        
        RESPONSE_TIMES = { current: 0, average: 0, max: 0, min: Infinity, total: 0, samples: 0 };
    }
}

// =============================================================================
// PERFORMANCE MEASUREMENT UTILITIES
// =============================================================================

/**
 * Measures and tracks response time for health check requests using high-resolution timing.
 * This function captures start time using performance.now() for high-resolution measurement,
 * executes callback function and awaits result, captures end time and calculates elapsed time
 * in milliseconds, updates RESPONSE_TIMES statistics with current measurement, calculates
 * running average response time, updates maximum and minimum response time values, and
 * returns callback result with timing data.
 * 
 * Performance measurement features:
 * - High-resolution timing using performance.now() for microsecond precision
 * - Statistical tracking with running averages and min/max values
 * - Comprehensive response time analysis for performance monitoring
 * - Error handling to ensure timing issues don't disrupt health checks
 * - Integration with performance monitoring systems for SLA compliance
 * 
 * @param {Function} callback - Async function to execute and measure performance
 * @returns {Promise} Promise resolving to callback result with response time tracking
 */
async function measureResponseTime(callback) {
    try {
        // Capture start time using performance.now() for high-resolution measurement
        const startTime = performance.now();
        
        // Execute callback function and await result
        const result = await callback();
        
        // Capture end time and calculate elapsed time in milliseconds
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Update RESPONSE_TIMES statistics with current measurement
        RESPONSE_TIMES.current = responseTime;
        RESPONSE_TIMES.total += responseTime;
        RESPONSE_TIMES.samples += 1;
        
        // Calculate running average response time
        RESPONSE_TIMES.average = RESPONSE_TIMES.total / RESPONSE_TIMES.samples;
        
        // Update maximum and minimum response time values
        if (responseTime > RESPONSE_TIMES.max) {
            RESPONSE_TIMES.max = responseTime;
        }
        if (responseTime < RESPONSE_TIMES.min) {
            RESPONSE_TIMES.min = responseTime;
        }
        
        // Log performance warning if response time exceeds threshold
        if (responseTime > HEALTH_CONFIG.responseTimeThreshold) {
            logger.warn('Health check response time exceeded threshold', {
                responseTime: Math.round(responseTime * 100) / 100,
                threshold: HEALTH_CONFIG.responseTimeThreshold,
                averageResponseTime: Math.round(RESPONSE_TIMES.average * 100) / 100
            });
        }
        
        // Return callback result with timing data attached
        return {
            data: result,
            timing: {
                responseTime: Math.round(responseTime * 100) / 100,
                timestamp: Date.now()
            }
        };
        
    } catch (error) {
        // Handle timing measurement errors gracefully
        logger.error('Failed to measure response time for health check', {
            error: error.message,
            stack: error.stack
        });
        
        // Return error result without timing data
        throw error;
    }
}

/**
 * Updates health check statistics including request counters and success rates.
 * This function increments total request counter in REQUEST_COUNTERS, increments
 * successful or failed counter based on successful parameter, updates response time
 * statistics with provided responseTime, logs health statistics update if debug
 * logging enabled, and calculates success rate percentage for monitoring.
 * 
 * Statistics tracking features:
 * - Comprehensive request counting with endpoint-specific granularity
 * - Success rate calculation for availability monitoring
 * - Response time integration for performance analysis
 * - Endpoint-specific statistics for detailed monitoring
 * - Debug logging for operational visibility and troubleshooting
 * 
 * @param {boolean} successful - Whether the health check request was successful
 * @param {number} responseTime - Response time in milliseconds for performance tracking
 * @param {string} [endpointType='health'] - Type of health endpoint for specific statistics
 * @returns {void} No return value - updates global health statistics
 */
function updateHealthStats(successful, responseTime, endpointType = 'health') {
    try {
        // Increment total request counter in REQUEST_COUNTERS
        REQUEST_COUNTERS.total++;
        
        // Increment successful or failed counter based on successful parameter
        if (successful) {
            REQUEST_COUNTERS.successful++;
        } else {
            REQUEST_COUNTERS.failed++;
        }
        
        // Update endpoint-specific statistics if endpoint type is tracked
        if (REQUEST_COUNTERS.byEndpoint[endpointType]) {
            REQUEST_COUNTERS.byEndpoint[endpointType].total++;
            if (successful) {
                REQUEST_COUNTERS.byEndpoint[endpointType].successful++;
            } else {
                REQUEST_COUNTERS.byEndpoint[endpointType].failed++;
            }
        }
        
        // Calculate success rate percentage for monitoring
        const successRate = REQUEST_COUNTERS.total > 0 ? 
            (REQUEST_COUNTERS.successful / REQUEST_COUNTERS.total) * 100 : 0;
        
        // Log health statistics update if debug logging enabled
        if (HEALTH_CONFIG.enableDetailedLogging) {
            logger.debug('Updated health check statistics', {
                endpointType: endpointType,
                successful: successful,
                responseTime: Math.round(responseTime * 100) / 100,
                totalRequests: REQUEST_COUNTERS.total,
                successfulRequests: REQUEST_COUNTERS.successful,
                failedRequests: REQUEST_COUNTERS.failed,
                successRate: Math.round(successRate * 100) / 100,
                averageResponseTime: Math.round(RESPONSE_TIMES.average * 100) / 100
            });
        }
        
    } catch (error) {
        // Handle statistics update errors gracefully - don't disrupt health checks
        logger.error('Failed to update health check statistics', {
            error: error.message,
            successful: successful,
            responseTime: responseTime,
            endpointType: endpointType
        });
    }
}

// =============================================================================
// RESPONSE FORMATTING UTILITIES
// =============================================================================

/**
 * Creates standardized health response object with proper formatting and metadata.
 * This function creates base response structure with status and timestamp, includes
 * health data from healthData parameter, adds endpoint identification for monitoring
 * correlation, includes response time metadata if available, adds application version
 * and name for identification, formats response according to JSON schema standards,
 * and returns complete health response object.
 * 
 * Response formatting features:
 * - Standardized response structure across all health endpoints
 * - Timestamp inclusion for monitoring and correlation
 * - Application metadata for identification and version tracking
 * - Response time integration for performance monitoring
 * - Endpoint identification for detailed monitoring and debugging
 * 
 * @param {Object} healthData - Health data object from health service
 * @param {number} statusCode - HTTP status code for the response
 * @param {string} endpoint - Endpoint identifier for monitoring correlation
 * @returns {Object} Formatted health response object ready for HTTP transmission
 */
function createHealthResponse(healthData, statusCode, endpoint) {
    try {
        // Create base response structure with status and timestamp
        const response = {
            status: statusCode === HTTP_STATUS.OK ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            endpoint: endpoint
        };
        
        // Include health data from healthData parameter
        if (healthData && typeof healthData === 'object') {
            response.data = healthData;
        }
        
        // Add application version and name for identification
        response.application = {
            name: 'nodejs-tutorial-app',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            pid: process.pid
        };
        
        // Include response time metadata if available
        if (RESPONSE_TIMES.current > 0) {
            response.performance = {
                responseTime: Math.round(RESPONSE_TIMES.current * 100) / 100,
                averageResponseTime: Math.round(RESPONSE_TIMES.average * 100) / 100,
                samples: RESPONSE_TIMES.samples
            };
        }
        
        // Add statistics if enabled
        if (HEALTH_CONFIG.enableStatistics) {
            const successRate = REQUEST_COUNTERS.total > 0 ? 
                (REQUEST_COUNTERS.successful / REQUEST_COUNTERS.total) * 100 : 0;
            
            response.statistics = {
                totalRequests: REQUEST_COUNTERS.total,
                successfulRequests: REQUEST_COUNTERS.successful,
                failedRequests: REQUEST_COUNTERS.failed,
                successRate: Math.round(successRate * 100) / 100
            };
        }
        
        // Return complete health response object formatted according to JSON schema
        return response;
        
    } catch (error) {
        // Handle response creation errors gracefully with minimal fallback response
        logger.error('Failed to create health response, using fallback format', {
            error: error.message,
            endpoint: endpoint,
            statusCode: statusCode
        });
        
        return {
            status: statusCode === HTTP_STATUS.OK ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            endpoint: endpoint,
            error: 'response_formatting_error',
            application: {
                name: 'nodejs-tutorial-app',
                version: '1.0.0',
                pid: process.pid
            }
        };
    }
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Handles errors during health check operations with proper logging and response formatting.
 * This function logs health check error with request context using logger.error(), updates
 * health statistics to reflect failed check, determines appropriate HTTP status code based
 * on error type, creates error response with health check context, sets Content-Type header
 * to application/json, sends formatted error response using res.status().json(), and
 * includes error correlation information for debugging.
 * 
 * Error handling features:
 * - Comprehensive error logging with request context and correlation information
 * - Health statistics integration to track error rates and patterns
 * - Appropriate HTTP status code determination based on error type and severity
 * - Standardized error response formatting for consistent API behavior
 * - Security-conscious error information exposure to prevent information disclosure
 * 
 * @param {Error} error - Error object with message and stack trace information
 * @param {Object} req - Express request object for context and correlation
 * @param {Object} res - Express response object for sending error response
 * @param {string} endpointType - Health endpoint type for specific error tracking
 * @returns {void} No return value - sends HTTP error response
 */
function handleHealthCheckError(error, req, res, endpointType) {
    try {
        // Generate correlation ID for error tracking and debugging
        const correlationId = req.id || `health-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log health check error with request context using logger.error()
        logger.error('Health check error occurred', {
            error: error.message,
            stack: error.stack,
            endpointType: endpointType,
            correlationId: correlationId,
            requestMethod: req.method,
            requestPath: req.path,
            requestUrl: req.originalUrl,
            userAgent: req.get('User-Agent'),
            clientIp: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString()
        });
        
        // Update health statistics to reflect failed check
        updateHealthStats(false, RESPONSE_TIMES.current || 0, endpointType);
        
        // Determine appropriate HTTP status code based on error type
        let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR; // Default 500
        
        if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE; // 503 for timeout
        } else if (error.name === 'HealthCheckError' && error.statusCode) {
            statusCode = error.statusCode; // Use custom error status code
        } else if (error.message && error.message.includes('unavailable')) {
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE; // 503 for service unavailable
        }
        
        // Create error response with health check context
        const errorResponse = createHealthResponse({
            error: true,
            errorType: error.name || 'HealthCheckError',
            errorMessage: error.message || 'Health check failed',
            correlationId: correlationId,
            timestamp: new Date().toISOString(),
            endpoint: endpointType
        }, statusCode, endpointType);
        
        // Set Content-Type header to application/json for proper response formatting
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        
        // Send formatted error response using res.status().json()
        res.status(statusCode).json(errorResponse);
        
    } catch (handlingError) {
        // Handle error handling errors gracefully with minimal response
        logger.error('Failed to handle health check error properly', {
            originalError: error.message,
            handlingError: handlingError.message,
            endpointType: endpointType
        });
        
        // Send minimal error response to prevent complete failure
        try {
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                endpoint: endpointType,
                error: 'error_handling_failed'
            });
        } catch (finalError) {
            // Last resort - end response without JSON
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).end();
        }
    }
}

// =============================================================================
// HEALTH CHECK MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Express middleware function for basic health check endpoint providing simple health status.
 * This function logs health check request with request details, measures response time using
 * measureResponseTime(), calls healthService.getBasicHealth() for health status, creates
 * health response using createHealthResponse(), updates health statistics with successful
 * result, sets HTTP status code to 200 OK, sets Content-Type header to application/json,
 * sends health response using res.json(), and handles errors using handleHealthCheckError()
 * if health check fails.
 * 
 * Basic health check features:
 * - Simple health status indication for load balancers and monitoring systems
 * - Fast response time optimized for frequent polling by monitoring systems
 * - Comprehensive request logging for operational visibility and debugging
 * - Performance measurement integration for SLA monitoring and optimization
 * - Error handling with graceful degradation for reliable monitoring
 * 
 * @param {Object} req - Express request object with HTTP request information
 * @param {Object} res - Express response object for sending HTTP response
 * @param {Function} next - Express next function for middleware chain continuation
 * @returns {void} No return value - sends HTTP response
 */
async function healthCheckMiddleware(req, res, next) {
    try {
        // Generate request correlation ID for tracking
        req.id = req.id || `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log health check request with request details
        if (HEALTH_CONFIG.enableDetailedLogging) {
            logger.info('Basic health check request received', {
                correlationId: req.id,
                method: req.method,
                path: req.path,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                clientIp: req.ip || req.connection.remoteAddress,
                timestamp: new Date().toISOString()
            });
        }
        
        // Measure response time using measureResponseTime() and execute health check
        const { data: healthData, timing } = await measureResponseTime(async () => {
            return await getBasicHealth();
        });
        
        // Create health response using createHealthResponse()
        const healthResponse = createHealthResponse(healthData, HTTP_STATUS.OK, 'health');
        
        // Update health statistics with successful result
        updateHealthStats(true, timing.responseTime, 'health');
        
        // Set HTTP status code to 200 OK and Content-Type header to application/json
        res.status(HTTP_STATUS.OK);
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        
        // Send health response using res.json()
        res.json(healthResponse);
        
        // Log successful health check completion if debug logging enabled
        if (HEALTH_CONFIG.enableDetailedLogging) {
            logger.debug('Basic health check completed successfully', {
                correlationId: req.id,
                responseTime: timing.responseTime,
                statusCode: HTTP_STATUS.OK,
                endpoint: 'health'
            });
        }
        
    } catch (error) {
        // Handle errors using handleHealthCheckError() if health check fails
        handleHealthCheckError(error, req, res, 'health');
    }
}

/**
 * Express middleware function for detailed health check endpoint with comprehensive system information.
 * This function logs detailed health check request, measures response time for comprehensive health
 * check, calls healthService.getDetailedHealth() for full system status, creates detailed health
 * response with system metrics, updates health statistics with successful detailed check, sets
 * HTTP status code to 200 OK for healthy systems, sets Content-Type header to application/json,
 * sends comprehensive health response, and handles errors and service unavailable responses
 * appropriately.
 * 
 * Detailed health check features:
 * - Comprehensive system diagnostics including CPU, memory, and performance metrics
 * - Integration with monitoring systems for detailed health analysis
 * - Performance measurement with timing statistics for comprehensive monitoring
 * - Error handling with detailed error context for troubleshooting
 * - Service availability assessment with appropriate status code responses
 * 
 * @param {Object} req - Express request object with HTTP request information
 * @param {Object} res - Express response object for sending HTTP response
 * @param {Function} next - Express next function for middleware chain continuation
 * @returns {void} No return value - sends HTTP response
 */
async function detailedHealthMiddleware(req, res, next) {
    try {
        // Generate request correlation ID for tracking
        req.id = req.id || `detailed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log detailed health check request
        if (HEALTH_CONFIG.enableDetailedLogging) {
            logger.info('Detailed health check request received', {
                correlationId: req.id,
                method: req.method,
                path: req.path,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                clientIp: req.ip || req.connection.remoteAddress,
                timestamp: new Date().toISOString()
            });
        }
        
        // Measure response time for comprehensive health check
        const { data: healthData, timing } = await measureResponseTime(async () => {
            return await getDetailedHealth();
        });
        
        // Determine status code based on health data
        let statusCode = HTTP_STATUS.OK;
        if (healthData && healthData.status === 'degraded') {
            statusCode = HTTP_STATUS.OK; // Still return 200 for degraded but functional
        } else if (healthData && (healthData.status === 'unhealthy' || healthData.status === 'error')) {
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE; // 503 for unhealthy
        }
        
        // Create detailed health response with system metrics
        const healthResponse = createHealthResponse(healthData, statusCode, 'detailed');
        
        // Update health statistics with detailed check result
        const isSuccessful = statusCode === HTTP_STATUS.OK;
        updateHealthStats(isSuccessful, timing.responseTime, 'detailed');
        
        // Set HTTP status code and Content-Type header
        res.status(statusCode);
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        
        // Send comprehensive health response
        res.json(healthResponse);
        
        // Log detailed health check completion
        if (HEALTH_CONFIG.enableDetailedLogging) {
            logger.info('Detailed health check completed', {
                correlationId: req.id,
                responseTime: timing.responseTime,
                statusCode: statusCode,
                healthStatus: healthData?.status || 'unknown',
                endpoint: 'detailed'
            });
        }
        
    } catch (error) {
        // Handle errors and service unavailable responses appropriately
        handleHealthCheckError(error, req, res, 'detailed');
    }
}

/**
 * Express middleware function for Kubernetes liveness probe endpoint indicating if application should be restarted.
 * This function logs liveness probe request, measures response time for fast liveness check, calls
 * healthService.getLivenessStatus() for process health, creates minimal liveness response for
 * Kubernetes, sets HTTP status code based on liveness status (200/503), sets Content-Type header
 * to application/json, sends liveness response with minimal data, and updates statistics and
 * handles liveness check failures.
 * 
 * Liveness probe features:
 * - Fast response time optimized for Kubernetes probe requirements (< 10ms target)
 * - Process health assessment for restart decision making
 * - Minimal response payload for efficient network utilization
 * - Kubernetes-compatible status code responses for proper orchestration
 * - Error handling with appropriate failure responses for pod restart triggering
 * 
 * @param {Object} req - Express request object with HTTP request information
 * @param {Object} res - Express response object for sending HTTP response
 * @param {Function} next - Express next function for middleware chain continuation
 * @returns {void} No return value - sends HTTP response
 */
async function livenessProbeMiddleware(req, res, next) {
    try {
        // Generate request correlation ID for tracking
        req.id = req.id || `liveness-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log liveness probe request (minimal logging for performance)
        logger.debug('Liveness probe request received', {
            correlationId: req.id,
            clientIp: req.ip || req.connection.remoteAddress,
            timestamp: Date.now()
        });
        
        // Measure response time for fast liveness check
        const { data: livenessData, timing } = await measureResponseTime(async () => {
            return await getLivenessStatus();
        });
        
        // Determine status code based on liveness status
        let statusCode = HTTP_STATUS.OK;
        if (livenessData && (livenessData.alive === false || livenessData.status === 'dead')) {
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE; // 503 triggers pod restart
        }
        
        // Create minimal liveness response for Kubernetes
        const livenessResponse = {
            status: statusCode === HTTP_STATUS.OK ? 'alive' : 'dead',
            timestamp: new Date().toISOString(),
            pid: process.pid
        };
        
        // Update statistics for liveness probe
        const isSuccessful = statusCode === HTTP_STATUS.OK;
        updateHealthStats(isSuccessful, timing.responseTime, 'liveness');
        
        // Set HTTP status code and Content-Type header
        res.status(statusCode);
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        
        // Send liveness response with minimal data
        res.json(livenessResponse);
        
        // Log liveness probe completion
        logger.debug('Liveness probe completed', {
            correlationId: req.id,
            responseTime: timing.responseTime,
            statusCode: statusCode,
            alive: statusCode === HTTP_STATUS.OK
        });
        
    } catch (error) {
        // Handle liveness check failures - always fail liveness on error
        logger.error('Liveness probe failed', {
            error: error.message,
            correlationId: req.id || 'unknown',
            timestamp: new Date().toISOString()
        });
        
        // Update statistics and send failure response
        updateHealthStats(false, RESPONSE_TIMES.current || 0, 'liveness');
        
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE);
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        res.json({
            status: 'dead',
            error: error.message,
            timestamp: new Date().toISOString(),
            pid: process.pid
        });
    }
}

/**
 * Express middleware function for Kubernetes readiness probe endpoint indicating if application can serve traffic.
 * This function logs readiness probe request, measures response time for readiness validation, calls
 * healthService.getReadinessStatus() for service readiness, creates readiness response with dependency
 * status, sets HTTP status code based on readiness (200 ready, 503 not ready), sets Content-Type
 * header to application/json, sends readiness response for traffic routing decisions, and updates
 * statistics and handles readiness check failures.
 * 
 * Readiness probe features:
 * - Service readiness assessment for traffic routing decisions
 * - Dependency health validation for comprehensive readiness evaluation
 * - Fast response time optimized for Kubernetes probe requirements (< 25ms target)
 * - Kubernetes-compatible status code responses for proper load balancing
 * - Error handling with appropriate failure responses for traffic exclusion
 * 
 * @param {Object} req - Express request object with HTTP request information
 * @param {Object} res - Express response object for sending HTTP response
 * @param {Function} next - Express next function for middleware chain continuation
 * @returns {void} No return value - sends HTTP response
 */
async function readinessProbeMiddleware(req, res, next) {
    try {
        // Generate request correlation ID for tracking
        req.id = req.id || `readiness-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log readiness probe request
        logger.debug('Readiness probe request received', {
            correlationId: req.id,
            clientIp: req.ip || req.connection.remoteAddress,
            timestamp: Date.now()
        });
        
        // Measure response time for readiness validation
        const { data: readinessData, timing } = await measureResponseTime(async () => {
            return await getReadinessStatus();
        });
        
        // Determine status code based on readiness
        let statusCode = HTTP_STATUS.OK;
        if (readinessData && (readinessData.ready === false || readinessData.status === 'not_ready')) {
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE; // 503 excludes from traffic
        }
        
        // Create readiness response with dependency status
        const readinessResponse = {
            status: statusCode === HTTP_STATUS.OK ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            pid: process.pid,
            dependencies: readinessData?.dependencies || {}
        };
        
        // Update statistics for readiness probe
        const isSuccessful = statusCode === HTTP_STATUS.OK;
        updateHealthStats(isSuccessful, timing.responseTime, 'readiness');
        
        // Set HTTP status code and Content-Type header
        res.status(statusCode);
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        
        // Send readiness response for traffic routing decisions
        res.json(readinessResponse);
        
        // Log readiness probe completion
        logger.debug('Readiness probe completed', {
            correlationId: req.id,
            responseTime: timing.responseTime,
            statusCode: statusCode,
            ready: statusCode === HTTP_STATUS.OK
        });
        
    } catch (error) {
        // Handle readiness check failures - always fail readiness on error
        logger.error('Readiness probe failed', {
            error: error.message,
            correlationId: req.id || 'unknown',
            timestamp: new Date().toISOString()
        });
        
        // Update statistics and send failure response
        updateHealthStats(false, RESPONSE_TIMES.current || 0, 'readiness');
        
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE);
        res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
        res.json({
            status: 'not_ready',
            error: error.message,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            dependencies: {}
        });
    }
}

// =============================================================================
// STATISTICS AND MONITORING UTILITIES
// =============================================================================

/**
 * Returns current health middleware statistics for monitoring and operational insights.
 * This function aggregates current REQUEST_COUNTERS statistics, includes RESPONSE_TIMES
 * performance metrics, calculates success rate percentage from counters, adds configuration
 * summary and endpoint information, includes timestamp and middleware version information,
 * and returns comprehensive health middleware statistics.
 * 
 * Statistics features:
 * - Comprehensive request and response statistics across all health endpoints
 * - Performance metrics including response time analysis and trends
 * - Success rate calculation for availability monitoring and SLA tracking
 * - Endpoint-specific statistics for detailed monitoring and troubleshooting
 * - Configuration visibility for operational insights and debugging
 * 
 * @returns {Object} Health middleware statistics including request counts, response times, and success rates
 */
function getHealthStats() {
    try {
        // Calculate overall success rate percentage
        const overallSuccessRate = REQUEST_COUNTERS.total > 0 ? 
            (REQUEST_COUNTERS.successful / REQUEST_COUNTERS.total) * 100 : 0;
        
        // Calculate uptime since middleware initialization
        const uptimeMs = Date.now() - (REQUEST_COUNTERS.startTime || Date.now());
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        
        // Aggregate current REQUEST_COUNTERS statistics
        const statistics = {
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: uptimeSeconds,
                formatted: formatUptime(uptimeSeconds)
            },
            
            // Overall request statistics
            requests: {
                total: REQUEST_COUNTERS.total,
                successful: REQUEST_COUNTERS.successful,
                failed: REQUEST_COUNTERS.failed,
                successRate: Math.round(overallSuccessRate * 100) / 100
            },
            
            // Performance metrics from RESPONSE_TIMES
            performance: {
                currentResponseTime: Math.round(RESPONSE_TIMES.current * 100) / 100,
                averageResponseTime: Math.round(RESPONSE_TIMES.average * 100) / 100,
                minResponseTime: RESPONSE_TIMES.min === Infinity ? 0 : Math.round(RESPONSE_TIMES.min * 100) / 100,
                maxResponseTime: Math.round(RESPONSE_TIMES.max * 100) / 100,
                totalSamples: RESPONSE_TIMES.samples,
                responseTimeThreshold: HEALTH_CONFIG.responseTimeThreshold
            },
            
            // Endpoint-specific statistics
            endpoints: {},
            
            // Configuration summary
            configuration: {
                timeout: HEALTH_CONFIG.timeout,
                responseTimeThreshold: HEALTH_CONFIG.responseTimeThreshold,
                enableDetailedLogging: HEALTH_CONFIG.enableDetailedLogging,
                enableStatistics: HEALTH_CONFIG.enableStatistics
            },
            
            // Middleware version and environment information
            middleware: {
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                pid: process.pid
            }
        };
        
        // Add endpoint-specific statistics with success rates
        for (const [endpoint, stats] of Object.entries(REQUEST_COUNTERS.byEndpoint)) {
            const endpointSuccessRate = stats.total > 0 ? 
                (stats.successful / stats.total) * 100 : 0;
            
            statistics.endpoints[endpoint] = {
                total: stats.total,
                successful: stats.successful,
                failed: stats.failed,
                successRate: Math.round(endpointSuccessRate * 100) / 100
            };
        }
        
        return statistics;
        
    } catch (error) {
        // Handle statistics generation errors gracefully
        logger.error('Failed to generate health middleware statistics', {
            error: error.message
        });
        
        return {
            timestamp: new Date().toISOString(),
            error: true,
            errorMessage: error.message,
            requests: REQUEST_COUNTERS,
            performance: RESPONSE_TIMES
        };
    }
}

/**
 * Helper function to format uptime seconds into human-readable string
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// =============================================================================
// MODULE INITIALIZATION AND EXPORTS
// =============================================================================

// Initialize the health middleware when module is loaded
initializeHealthMiddleware();

// Export health middleware functions and utilities
module.exports = {
    // Express middleware for basic health check endpoint responding with simple health status
    healthCheckMiddleware,
    
    // Express middleware for detailed health check endpoint with comprehensive system diagnostics
    detailedHealthMiddleware,
    
    // Express middleware for Kubernetes liveness probe endpoint indicating application restart requirements
    livenessProbeMiddleware,
    
    // Express middleware for Kubernetes readiness probe endpoint indicating traffic routing readiness
    readinessProbeMiddleware,
    
    // Initialization function for health middleware configuration and performance tracking setup
    initializeHealthMiddleware,
    
    // Utility function for retrieving health middleware operational statistics and performance metrics
    getHealthStats
};