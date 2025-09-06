/**
 * Core Business Logic Service for Hello Endpoint Functionality
 * 
 * This service implements the business logic layer for the Node.js tutorial application's '/hello' 
 * endpoint functionality. It demonstrates production-ready service layer patterns including business 
 * logic isolation, performance optimization, comprehensive error handling, and educational design 
 * principles while maintaining compatibility with Express.js 5.1.0 and Node.js 22.x LTS.
 * 
 * Key Features:
 * - Service layer architecture with clear separation of concerns from HTTP handling
 * - Static content generation with intelligent caching and TTL-based response optimization
 * - High-resolution performance timing using Node.js Performance API for precise request measurement
 * - Comprehensive request validation with HTTP method and path verification
 * - Request correlation tracking with crypto-generated UUIDs for distributed system debugging
 * - Business logic isolation enabling seamless controller integration and testing
 * - Memory-efficient operation with automatic cleanup preventing leaks in long-running processes
 * - Educational code patterns demonstrating Node.js service layer best practices
 * 
 * Architecture:
 * - Stateless service design supporting horizontal scaling and load balancer compatibility
 * - Response caching strategy with configurable TTL preventing repeated content generation
 * - Performance monitoring with weighted average calculations and resource tracking
 * - Express.js 5.1.0 integration with automatic promise error handling support
 * - Production-ready error handling with graceful degradation and context preservation
 * 
 * Educational Value:
 * - Demonstrates Node.js service layer patterns and business logic organization
 * - Shows performance optimization techniques and caching strategies in services
 * - Illustrates request validation patterns and input sanitization in service methods
 * - Examples of service statistics tracking and operational metrics collection
 * - Service layer integration patterns with Express.js controllers and middleware
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Service layer patterns, business logic isolation, performance optimization
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Node.js Performance API for high-resolution timing measurement in hello request processing and response time monitoring
const { performance } = require('perf_hooks'); // Node.js Built-in

// Node.js crypto module for generating correlation IDs and unique request identifiers for tracing
const crypto = require('crypto'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import structured logging utilities for service operation logging, error tracking, and performance monitoring during hello request processing
const { 
    logger 
} = require('../utils/logger.js');

// Import configuration factory to access hello service settings, response configuration, and environment-specific behavior from application config
const { 
    getConfig 
} = require('../utils/config.js');

// Import HTTP status code constants for standardized response status handling in service layer business logic
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import Content-Type header constants for proper HTTP response formatting in hello response generation
const { 
    CONTENT_TYPES 
} = require('../utils/constants.js');

// Import HTTP method constants for request validation and method checking in hello request processing
const { 
    HTTP_METHODS 
} = require('../utils/constants.js');

// Import standardized error messages for consistent error handling across hello service operations
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import route path constants for hello endpoint path validation and consistency with routing configuration
const { 
    ROUTES 
} = require('../utils/constants.js');

// Import application metadata constants for including application context in service responses and logging
const { 
    APPLICATION_METADATA 
} = require('../utils/constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached hello service configuration from environment-specific settings
 * Prevents repeated configuration loading and improves service performance
 * @type {Object|null}
 */
let HELLO_CONFIG = null;

/**
 * Cached hello response with 5-minute TTL for performance optimization
 * Prevents repeated content generation for identical hello requests
 * @type {Object}
 */
let HELLO_RESPONSE_CACHE = {
    content: null,
    contentType: null,
    timestamp: 0,
    ttl: 300000 // 5 minutes in milliseconds
};

/**
 * Counter for tracking total hello requests processed by service layer
 * Used for service statistics and operational monitoring
 * @type {number}
 */
let REQUEST_COUNTER = 0;

/**
 * Service statistics tracking for operational monitoring and performance analysis
 * Includes request count, error count, average response time, and last request timestamp
 * @type {Object}
 */
let SERVICE_STATS = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    lastRequestTime: 0
};

/**
 * Map of active performance timers for hello request duration measurement
 * Uses correlation IDs as keys for O(1) timer lookup and cleanup operations
 * @type {Map<string, number>}
 */
const PERFORMANCE_TIMERS = new Map();

// =============================================================================
// SERVICE INITIALIZATION
// =============================================================================

/**
 * Initializes the hello service with configuration loading, response caching setup, and performance monitoring initialization.
 * This function establishes the service foundation by loading environment-specific configuration, setting up response 
 * caching infrastructure, initializing performance tracking systems, and preparing the service for request processing. 
 * It implements graceful error handling to ensure service availability even if initialization encounters issues.
 * 
 * Initialization process includes:
 * - Configuration loading using getConfig() with extraction of features.helloEndpoint settings
 * - Response cache setup with TTL configuration from environment settings (default 5 minutes)
 * - Service statistics initialization with zero counters for operational tracking
 * - Performance timer Map initialization for request duration measurement
 * - Pre-generation of hello world response content if static caching is enabled
 * - Comprehensive logging of initialization completion with configuration summary
 * - Periodic stats cleanup setup to prevent memory leaks in long-running processes
 * 
 * @returns {void} No return value - initializes hello service state and configuration
 * @throws {Error} Service initialization errors are caught and logged but don't prevent startup
 */
function initializeHelloService() {
    try {
        // Load hello service configuration using getConfig() and extract features.helloEndpoint settings
        const config = getConfig();
        HELLO_CONFIG = config.features?.helloEndpoint || {};
        
        // Extract cache TTL from configuration with fallback to 5 minutes default
        const cacheTtl = HELLO_CONFIG.cacheTtl || 300000;
        
        // Cache configuration in HELLO_CONFIG global for performance optimization
        HELLO_CONFIG = {
            enabled: true,
            cacheTtl: cacheTtl,
            responseContent: 'Hello world',
            contentType: CONTENT_TYPES.TEXT_PLAIN,
            performanceTracking: true,
            ...HELLO_CONFIG
        };
        
        // Initialize HELLO_RESPONSE_CACHE with TTL from configuration (default 5 minutes)
        HELLO_RESPONSE_CACHE = {
            content: null,
            contentType: HELLO_CONFIG.contentType,
            timestamp: 0,
            ttl: HELLO_CONFIG.cacheTtl
        };
        
        // Reset SERVICE_STATS counters (requestCount, errorCount, averageResponseTime)
        SERVICE_STATS = {
            requestCount: 0,
            errorCount: 0,
            averageResponseTime: 0,
            lastRequestTime: 0,
            serviceStartTime: Date.now(),
            cacheHitCount: 0,
            cacheMissCount: 0
        };
        
        // Initialize REQUEST_COUNTER for tracking total requests processed
        REQUEST_COUNTER = 0;
        
        // Initialize PERFORMANCE_TIMERS Map for tracking request duration measurements
        PERFORMANCE_TIMERS.clear();
        
        // Pre-generate hello world response content if static caching enabled
        if (HELLO_CONFIG.preGenerateResponse !== false) {
            HELLO_RESPONSE_CACHE.content = HELLO_CONFIG.responseContent;
            HELLO_RESPONSE_CACHE.contentType = HELLO_CONFIG.contentType;
            HELLO_RESPONSE_CACHE.timestamp = Date.now();
        }
        
        // Log hello service initialization completion with configuration summary
        logger.info('Hello service initialized successfully', {
            cacheTtl: HELLO_CONFIG.cacheTtl,
            responseContent: HELLO_CONFIG.responseContent,
            performanceTracking: HELLO_CONFIG.performanceTracking,
            preGeneratedCache: HELLO_RESPONSE_CACHE.content !== null,
            serviceStartTime: SERVICE_STATS.serviceStartTime
        });
        
        // Set up periodic stats cleanup to prevent memory leaks in long-running processes
        if (HELLO_CONFIG.performanceTracking) {
            setInterval(() => {
                // Clean up old performance timers (older than 5 minutes)
                const currentTime = Date.now();
                const fiveMinutesAgo = currentTime - 300000;
                
                for (const [timerId, startTime] of PERFORMANCE_TIMERS.entries()) {
                    if (startTime < fiveMinutesAgo) {
                        PERFORMANCE_TIMERS.delete(timerId);
                    }
                }
            }, 60000); // Run cleanup every minute
        }
        
    } catch (error) {
        // Handle initialization errors gracefully - log error but continue with defaults
        logger.error('Hello service initialization failed, using default configuration', {
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack
        });
        
        // Set safe defaults for continued operation
        HELLO_CONFIG = {
            enabled: true,
            cacheTtl: 300000,
            responseContent: 'Hello world',
            contentType: CONTENT_TYPES.TEXT_PLAIN,
            performanceTracking: true
        };
        
        // Initialize basic cache structure
        HELLO_RESPONSE_CACHE = {
            content: 'Hello world',
            contentType: CONTENT_TYPES.TEXT_PLAIN,
            timestamp: Date.now(),
            ttl: 300000
        };
        
        // Initialize basic statistics
        SERVICE_STATS = {
            requestCount: 0,
            errorCount: 0,
            averageResponseTime: 0,
            lastRequestTime: 0,
            serviceStartTime: Date.now(),
            cacheHitCount: 0,
            cacheMissCount: 0,
            initializationError: true
        };
        
        REQUEST_COUNTER = 0;
        PERFORMANCE_TIMERS.clear();
    }
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Validates incoming hello requests for proper HTTP method, path matching, and basic request structure validation.
 * This function implements comprehensive request validation including HTTP method verification, path matching, 
 * request structure validation, and security checks to ensure only valid hello requests are processed by 
 * the service layer. It provides detailed validation results for debugging and error handling.
 * 
 * Validation process includes:
 * - HTTP method validation against HTTP_METHODS.GET for proper REST compliance
 * - Request path validation against expected ROUTES.HELLO endpoint path for consistency
 * - Request context structure validation ensuring required fields (method, path, timestamp)
 * - Correlation ID presence and format validation for request tracing capabilities
 * - Basic security validation checking for suspicious patterns in headers or request data
 * - Request headers validation for required headers (Host, User-Agent) and format checking
 * - Comprehensive validation result object creation with detailed error reporting
 * 
 * @param {Object} requestContext - Request context object containing method, path, headers, timestamp, and correlation ID
 * @returns {Promise<Object>} Validation result object with isValid boolean, errors array, and validated request data
 * @throws {Error} Validation process errors are caught and included in validation result
 */
async function validateHelloRequest(requestContext) {
    try {
        // Initialize validation result object with empty errors array and default isValid false
        const validationResult = {
            isValid: false,
            errors: [],
            warnings: [],
            validatedData: {},
            timestamp: new Date().toISOString(),
            correlationId: requestContext.correlationId || 'unknown'
        };
        
        // Extract HTTP method from requestContext and validate against HTTP_METHODS.GET
        const method = requestContext.method;
        if (!method) {
            validationResult.errors.push({
                field: 'method',
                message: 'HTTP method is required',
                code: 'MISSING_METHOD'
            });
        } else if (method !== HTTP_METHODS.GET) {
            validationResult.errors.push({
                field: 'method',
                message: `HTTP method '${method}' not allowed. Only GET method is supported.`,
                code: 'INVALID_METHOD',
                expectedValue: HTTP_METHODS.GET,
                actualValue: method
            });
        } else {
            validationResult.validatedData.method = method;
        }
        
        // Validate request path matches expected ROUTES.HELLO endpoint path
        const path = requestContext.path || requestContext.url;
        if (!path) {
            validationResult.errors.push({
                field: 'path',
                message: 'Request path is required',
                code: 'MISSING_PATH'
            });
        } else if (path !== ROUTES.HELLO) {
            validationResult.errors.push({
                field: 'path',
                message: `Request path '${path}' does not match hello endpoint`,
                code: 'INVALID_PATH',
                expectedValue: ROUTES.HELLO,
                actualValue: path
            });
        } else {
            validationResult.validatedData.path = path;
        }
        
        // Check request context contains required fields (method, path, timestamp)
        const requiredFields = ['method', 'path', 'timestamp'];
        requiredFields.forEach(field => {
            if (!requestContext[field]) {
                validationResult.errors.push({
                    field: field,
                    message: `Required field '${field}' is missing from request context`,
                    code: 'MISSING_REQUIRED_FIELD'
                });
            }
        });
        
        // Validate correlation ID is present and properly formatted for tracing
        const correlationId = requestContext.correlationId;
        if (!correlationId) {
            validationResult.errors.push({
                field: 'correlationId',
                message: 'Correlation ID is required for request tracing',
                code: 'MISSING_CORRELATION_ID'
            });
        } else if (typeof correlationId !== 'string' || correlationId.length < 8) {
            validationResult.errors.push({
                field: 'correlationId',
                message: 'Correlation ID must be a valid string with minimum 8 characters',
                code: 'INVALID_CORRELATION_ID',
                actualValue: correlationId
            });
        } else {
            validationResult.validatedData.correlationId = correlationId;
        }
        
        // Check request headers contain basic required headers (Host, User-Agent)
        const headers = requestContext.headers || {};
        if (!headers.host && !headers.Host) {
            validationResult.warnings.push({
                field: 'headers.host',
                message: 'Host header is missing but recommended for proper HTTP handling',
                code: 'MISSING_HOST_HEADER'
            });
        }
        
        if (!headers['user-agent'] && !headers['User-Agent']) {
            validationResult.warnings.push({
                field: 'headers.user-agent',
                message: 'User-Agent header is missing but recommended for client identification',
                code: 'MISSING_USER_AGENT'
            });
        }
        
        // Perform basic security validation (no suspicious patterns in headers)
        const suspiciousPatterns = [/<script/i, /javascript:/i, /vbscript:/i, /onload=/i];
        const headerValues = Object.values(headers).join(' ');
        const foundSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(headerValues));
        
        if (foundSuspiciousPattern) {
            validationResult.errors.push({
                field: 'headers',
                message: 'Suspicious content detected in request headers',
                code: 'SECURITY_VIOLATION'
            });
        }
        
        // Include timestamp validation for request freshness
        if (requestContext.timestamp) {
            const requestTime = new Date(requestContext.timestamp);
            const currentTime = new Date();
            const timeDifference = Math.abs(currentTime - requestTime);
            
            // Warn if request is older than 5 minutes
            if (timeDifference > 300000) {
                validationResult.warnings.push({
                    field: 'timestamp',
                    message: 'Request timestamp is older than 5 minutes',
                    code: 'STALE_REQUEST',
                    timeDifference: timeDifference
                });
            }
            
            validationResult.validatedData.timestamp = requestContext.timestamp;
        }
        
        // Log validation process using logger.debug() with request metadata
        logger.debug('Hello request validation completed', {
            correlationId: correlationId,
            method: method,
            path: path,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            isValid: validationResult.errors.length === 0
        });
        
        // Set isValid to true if no validation errors found
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add summary information to validation result
        validationResult.summary = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            validatedFields: Object.keys(validationResult.validatedData),
            validationPassed: validationResult.isValid
        };
        
        // Return validation result object with detailed validation information
        return validationResult;
        
    } catch (error) {
        // Handle validation errors gracefully and return error in validation result
        logger.error('Hello request validation process failed', {
            error: error.message,
            errorType: error.constructor.name,
            requestContext: requestContext,
            stack: error.stack
        });
        
        return {
            isValid: false,
            errors: [{
                field: 'validation',
                message: 'Request validation process failed',
                code: 'VALIDATION_ERROR',
                error: error.message
            }],
            warnings: [],
            validatedData: {},
            timestamp: new Date().toISOString(),
            correlationId: requestContext?.correlationId || 'unknown',
            summary: {
                totalErrors: 1,
                totalWarnings: 0,
                validatedFields: [],
                validationPassed: false
            }
        };
    }
}

// =============================================================================
// MAIN BUSINESS LOGIC
// =============================================================================

/**
 * Main business logic function that processes validated hello requests and orchestrates response generation.
 * This function implements the core hello service business logic including performance measurement, 
 * request processing orchestration, response generation coordination, and comprehensive statistics tracking. 
 * It serves as the primary entry point for hello request processing after validation.
 * 
 * Business logic processing includes:
 * - Unique correlation ID generation using crypto.randomUUID() for distributed request tracing
 * - High-resolution performance timing using performance.now() for precise request measurement
 * - Request counter incrementation and service statistics updates for operational monitoring
 * - Request metadata extraction (user-agent, IP, timestamp) for enhanced response context
 * - Hello world response content generation through generateHelloWorldResponse() coordination
 * - Request processing duration calculation using performance timer with cleanup
 * - Weighted average response time calculation for service performance tracking
 * - Processing result object creation with response data, metadata, and performance metrics
 * 
 * @param {Object} validatedRequest - Validated request object containing method, path, headers, and metadata
 * @returns {Promise<Object>} Processing result object with response data, metadata, and performance metrics
 * @throws {Error} Processing errors are caught and handled through handleHelloServiceError()
 */
async function processHelloRequest(validatedRequest) {
    let correlationId = null;
    let performanceTimerId = null;
    
    try {
        // Generate unique correlation ID using crypto.randomUUID() for request tracing
        correlationId = validatedRequest.correlationId || crypto.randomUUID();
        
        // Start performance timer using performance.now() and store in PERFORMANCE_TIMERS
        performanceTimerId = `hello-request-${correlationId}`;
        const startTime = performance.now();
        PERFORMANCE_TIMERS.set(performanceTimerId, startTime);
        
        // Log request processing start using logger.info() with correlation ID and timestamp
        logger.info('Hello request processing started', {
            correlationId: correlationId,
            method: validatedRequest.method,
            path: validatedRequest.path,
            timestamp: new Date().toISOString(),
            performanceTimerId: performanceTimerId
        });
        
        // Increment REQUEST_COUNTER global for service statistics tracking
        REQUEST_COUNTER++;
        
        // Update SERVICE_STATS.requestCount and SERVICE_STATS.lastRequestTime
        SERVICE_STATS.requestCount++;
        SERVICE_STATS.lastRequestTime = Date.now();
        
        // Extract request metadata (user-agent, IP, timestamp) for response context
        const requestMetadata = {
            correlationId: correlationId,
            method: validatedRequest.method || HTTP_METHODS.GET,
            path: validatedRequest.path || ROUTES.HELLO,
            userAgent: validatedRequest.headers?.['user-agent'] || 'unknown',
            clientIp: validatedRequest.clientIp || validatedRequest.ip || 'unknown',
            timestamp: validatedRequest.timestamp || new Date().toISOString(),
            requestId: correlationId,
            processingStartTime: startTime
        };
        
        // Generate hello world response content using generateHelloWorldResponse()
        logger.debug('Generating hello world response content', {
            correlationId: correlationId,
            requestMetadata: requestMetadata
        });
        
        const responseData = await generateHelloWorldResponse(requestMetadata);
        
        // Calculate request processing duration using performance timer
        const endTime = performance.now();
        const processingDuration = endTime - startTime;
        
        // Update SERVICE_STATS.averageResponseTime with weighted average calculation
        if (SERVICE_STATS.requestCount > 1) {
            // Calculate weighted average: ((n-1) * oldAvg + newValue) / n
            const previousAverage = SERVICE_STATS.averageResponseTime;
            const requestCount = SERVICE_STATS.requestCount;
            SERVICE_STATS.averageResponseTime = ((requestCount - 1) * previousAverage + processingDuration) / requestCount;
        } else {
            SERVICE_STATS.averageResponseTime = processingDuration;
        }
        
        // Create processing result object with response data and metadata
        const processingResult = {
            success: true,
            correlationId: correlationId,
            response: {
                content: responseData.content,
                contentType: responseData.contentType,
                statusCode: HTTP_STATUS.OK,
                headers: responseData.headers || {}
            },
            metadata: {
                requestId: correlationId,
                processingTime: processingDuration,
                timestamp: new Date().toISOString(),
                requestCounter: REQUEST_COUNTER,
                serviceStats: {
                    totalRequests: SERVICE_STATS.requestCount,
                    averageResponseTime: SERVICE_STATS.averageResponseTime,
                    cacheHitCount: SERVICE_STATS.cacheHitCount
                }
            },
            performance: {
                startTime: startTime,
                endTime: endTime,
                duration: processingDuration,
                timerId: performanceTimerId
            }
        };
        
        // Include performance metrics and correlation ID in result object
        processingResult.metadata.performanceMetrics = {
            requestProcessingTime: processingDuration,
            responseGenerationTime: responseData.generationTime || 0,
            cacheStatus: responseData.fromCache ? 'hit' : 'miss',
            totalServiceRequests: SERVICE_STATS.requestCount,
            averageServiceResponseTime: SERVICE_STATS.averageResponseTime
        };
        
        // Log successful request processing with duration and correlation ID
        logger.info('Hello request processing completed successfully', {
            correlationId: correlationId,
            processingTime: processingDuration,
            statusCode: HTTP_STATUS.OK,
            contentLength: responseData.content?.length || 0,
            cacheStatus: responseData.fromCache ? 'hit' : 'miss',
            requestCounter: REQUEST_COUNTER
        });
        
        // Clean up performance timer from PERFORMANCE_TIMERS Map
        PERFORMANCE_TIMERS.delete(performanceTimerId);
        
        // Return complete processing result object for controller response generation
        return processingResult;
        
    } catch (error) {
        // Handle processing errors using service error handler
        logger.error('Hello request processing failed', {
            correlationId: correlationId,
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack,
            performanceTimerId: performanceTimerId
        });
        
        // Clean up performance timer if it exists
        if (performanceTimerId && PERFORMANCE_TIMERS.has(performanceTimerId)) {
            PERFORMANCE_TIMERS.delete(performanceTimerId);
        }
        
        // Increment error count in service statistics
        SERVICE_STATS.errorCount++;
        
        // Generate error response using handleHelloServiceError
        const errorResponse = handleHelloServiceError(error, validatedRequest);
        
        return {
            success: false,
            correlationId: correlationId,
            error: errorResponse,
            metadata: {
                requestId: correlationId,
                timestamp: new Date().toISOString(),
                errorOccurred: true,
                errorType: error.constructor.name
            }
        };
    }
}

// =============================================================================
// RESPONSE GENERATION
// =============================================================================

/**
 * Generates the 'Hello world' response content with appropriate metadata and content-type information.
 * This function implements intelligent response generation with caching optimization, content generation, 
 * and metadata enrichment. It checks for cached responses within TTL and generates fresh content when 
 * needed, ensuring optimal performance while maintaining response freshness.
 * 
 * Response generation process includes:
 * - Cache validity checking against TTL period to determine if cached response can be used
 * - Cache hit optimization returning cached response for performance improvement when valid cache exists
 * - Static hello world content generation with consistent 'Hello world' string output
 * - Content-Type header setting to CONTENT_TYPES.TEXT_PLAIN for proper HTTP formatting compliance
 * - Content length calculation in bytes for accurate Content-Length header specification
 * - Application metadata inclusion in response headers if configured for debugging and monitoring
 * - Response timestamp and correlation ID addition to response metadata for request tracking
 * - Cache update with generated response and current timestamp for future cache hits
 * 
 * @param {Object} requestMetadata - Request metadata containing correlation ID, user agent, IP, and timing information
 * @returns {Promise<Object>} Response object with content, contentType, headers, and metadata for HTTP response generation
 * @throws {Error} Response generation errors are caught and handled with fallback response creation
 */
async function generateHelloWorldResponse(requestMetadata) {
    try {
        const currentTime = Date.now();
        const correlationId = requestMetadata.correlationId || crypto.randomUUID();
        
        // Check HELLO_RESPONSE_CACHE for valid cached response within TTL period
        if (HELLO_RESPONSE_CACHE.content && 
            HELLO_RESPONSE_CACHE.timestamp && 
            (currentTime - HELLO_RESPONSE_CACHE.timestamp) < HELLO_RESPONSE_CACHE.ttl) {
            
            // Return cached response if available and not expired for performance optimization
            SERVICE_STATS.cacheHitCount++;
            
            logger.debug('Returning cached hello world response', {
                correlationId: correlationId,
                cacheAge: currentTime - HELLO_RESPONSE_CACHE.timestamp,
                cacheHitCount: SERVICE_STATS.cacheHitCount
            });
            
            return {
                content: HELLO_RESPONSE_CACHE.content,
                contentType: HELLO_RESPONSE_CACHE.contentType,
                headers: {
                    'Content-Type': HELLO_RESPONSE_CACHE.contentType,
                    'Content-Length': HELLO_RESPONSE_CACHE.content.length,
                    'X-Correlation-ID': correlationId,
                    'X-Cache-Status': 'hit',
                    'X-Cache-Age': Math.floor((currentTime - HELLO_RESPONSE_CACHE.timestamp) / 1000)
                },
                metadata: {
                    correlationId: correlationId,
                    generatedAt: new Date(HELLO_RESPONSE_CACHE.timestamp).toISOString(),
                    fromCache: true,
                    cacheAge: currentTime - HELLO_RESPONSE_CACHE.timestamp
                },
                fromCache: true,
                generationTime: 0
            };
        }
        
        // Log response generation start using logger.debug() with request correlation ID
        logger.debug('Generating fresh hello world response', {
            correlationId: correlationId,
            cacheExpired: HELLO_RESPONSE_CACHE.timestamp ? 
                (currentTime - HELLO_RESPONSE_CACHE.timestamp) >= HELLO_RESPONSE_CACHE.ttl : 
                'no_cache'
        });
        
        const responseGenerationStart = performance.now();
        
        // Create static hello world content string: 'Hello world'
        const responseContent = HELLO_CONFIG.responseContent || 'Hello world';
        
        // Set response content type to CONTENT_TYPES.TEXT_PLAIN for proper HTTP formatting
        const contentType = HELLO_CONFIG.contentType || CONTENT_TYPES.TEXT_PLAIN;
        
        // Calculate content length in bytes for Content-Length header
        const contentLength = Buffer.byteLength(responseContent, 'utf8');
        
        // Create response headers with content type, length, and correlation tracking
        const responseHeaders = {
            'Content-Type': contentType,
            'Content-Length': contentLength,
            'X-Correlation-ID': correlationId,
            'X-Cache-Status': 'miss',
            'X-Request-ID': requestMetadata.requestId || correlationId
        };
        
        // Include application metadata (name, version) in response headers if configured
        if (HELLO_CONFIG.includeAppMetadata !== false) {
            responseHeaders['X-App-Name'] = APPLICATION_METADATA.NAME;
            responseHeaders['X-App-Version'] = APPLICATION_METADATA.VERSION;
            responseHeaders['X-App-Description'] = APPLICATION_METADATA.DESCRIPTION;
        }
        
        // Add timestamp and correlation ID to response metadata for tracking
        const responseTimestamp = new Date().toISOString();
        responseHeaders['X-Response-Time'] = responseTimestamp;
        
        // Set response status to HTTP_STATUS.OK (200) for successful response
        const responseMetadata = {
            correlationId: correlationId,
            generatedAt: responseTimestamp,
            fromCache: false,
            contentLength: contentLength,
            requestMetadata: requestMetadata
        };
        
        const responseGenerationEnd = performance.now();
        const generationTime = responseGenerationEnd - responseGenerationStart;
        
        // Create response object with content, contentType, headers, and metadata
        const responseObject = {
            content: responseContent,
            contentType: contentType,
            headers: responseHeaders,
            metadata: responseMetadata,
            fromCache: false,
            generationTime: generationTime
        };
        
        // Update HELLO_RESPONSE_CACHE with generated response and current timestamp
        HELLO_RESPONSE_CACHE = {
            content: responseContent,
            contentType: contentType,
            timestamp: currentTime,
            ttl: HELLO_CONFIG.cacheTtl || 300000
        };
        
        // Increment cache miss counter
        SERVICE_STATS.cacheMissCount++;
        
        // Log response generation completion with content details
        logger.debug('Hello world response generated successfully', {
            correlationId: correlationId,
            contentLength: contentLength,
            generationTime: generationTime,
            cacheUpdated: true,
            cacheMissCount: SERVICE_STATS.cacheMissCount
        });
        
        // Return complete response object ready for HTTP transmission
        return responseObject;
        
    } catch (error) {
        // Handle response generation errors with fallback response creation
        logger.error('Hello world response generation failed', {
            correlationId: requestMetadata?.correlationId,
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack
        });
        
        // Return basic fallback response to maintain service availability
        return {
            content: 'Hello world',
            contentType: CONTENT_TYPES.TEXT_PLAIN,
            headers: {
                'Content-Type': CONTENT_TYPES.TEXT_PLAIN,
                'Content-Length': 11,
                'X-Correlation-ID': requestMetadata?.correlationId || crypto.randomUUID(),
                'X-Error-Recovery': 'fallback-response'
            },
            metadata: {
                correlationId: requestMetadata?.correlationId,
                generatedAt: new Date().toISOString(),
                fromCache: false,
                fallbackResponse: true,
                error: error.message
            },
            fromCache: false,
            generationTime: 0
        };
    }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Internal error handling function that processes service errors with proper logging and error response generation.
 * This function implements comprehensive error handling including error classification, logging, statistics updates, 
 * and sanitized error response generation. It ensures that service errors are properly handled without exposing 
 * sensitive internal information while providing useful debugging context.
 * 
 * Error handling process includes:
 * - Comprehensive error logging with stack trace and request context for debugging support
 * - Service statistics error count incrementation for operational monitoring and metrics
 * - Error type and message extraction for appropriate error response classification
 * - HTTP status code determination based on error type for proper HTTP response codes
 * - Sanitized error message creation for client response without internal implementation details
 * - Correlation ID inclusion in error response for request tracking and distributed debugging
 * - Error response content type setting to CONTENT_TYPES.TEXT_PLAIN for consistency
 * - Error response object creation with status, message, headers, and correlation metadata
 * 
 * @param {Error} error - Error object containing error details, type, message, and stack trace
 * @param {Object} requestContext - Request context object with correlation ID and request details
 * @returns {Object} Error response object with error details, status code, and correlation information
 * @throws {Error} Error handling process errors are caught and result in basic error response
 */
function handleHelloServiceError(error, requestContext) {
    try {
        const correlationId = requestContext?.correlationId || crypto.randomUUID();
        
        // Log error occurrence using logger.error() with error stack trace and request context
        logger.error('Hello service error occurred', {
            correlationId: correlationId,
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack,
            requestContext: requestContext,
            timestamp: new Date().toISOString()
        });
        
        // Increment SERVICE_STATS.errorCount for service error tracking
        SERVICE_STATS.errorCount++;
        
        // Extract error type and message for appropriate error response generation
        const errorType = error.constructor.name;
        const errorMessage = error.message || 'Unknown service error occurred';
        
        // Determine appropriate HTTP status code based on error type
        let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        let clientMessage = ERROR_MESSAGES.INTERNAL_ERROR;
        
        // Map specific error types to appropriate HTTP status codes
        if (errorType === 'ValidationError' || errorMessage.includes('validation')) {
            statusCode = HTTP_STATUS.BAD_REQUEST;
            clientMessage = 'Request validation failed';
        } else if (errorType === 'NotFoundError' || errorMessage.includes('not found')) {
            statusCode = HTTP_STATUS.NOT_FOUND;
            clientMessage = ERROR_MESSAGES.ROUTE_NOT_FOUND;
        } else if (errorType === 'MethodNotAllowedError' || errorMessage.includes('method not allowed')) {
            statusCode = HTTP_STATUS.METHOD_NOT_ALLOWED;
            clientMessage = ERROR_MESSAGES.METHOD_NOT_ALLOWED;
        } else if (errorType === 'ServiceUnavailableError' || errorMessage.includes('unavailable')) {
            statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
            clientMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
        }
        
        // Create sanitized error message for client response (no internal details)
        const sanitizedMessage = clientMessage;
        
        // Include correlation ID for error tracking and debugging
        const errorResponseHeaders = {
            'Content-Type': CONTENT_TYPES.TEXT_PLAIN,
            'X-Correlation-ID': correlationId,
            'X-Error-Type': 'service-error',
            'X-Timestamp': new Date().toISOString()
        };
        
        // Add content length for sanitized error message
        errorResponseHeaders['Content-Length'] = Buffer.byteLength(sanitizedMessage, 'utf8');
        
        // Set error response content type to CONTENT_TYPES.TEXT_PLAIN
        const contentType = CONTENT_TYPES.TEXT_PLAIN;
        
        // Create error response object with status, message, and metadata
        const errorResponse = {
            statusCode: statusCode,
            content: sanitizedMessage,
            contentType: contentType,
            headers: errorResponseHeaders,
            metadata: {
                correlationId: correlationId,
                errorType: errorType,
                timestamp: new Date().toISOString(),
                serviceErrorCount: SERVICE_STATS.errorCount,
                originalError: {
                    type: errorType,
                    message: errorMessage
                }
            },
            error: true
        };
        
        // Log error handling completion with error correlation ID
        logger.debug('Hello service error handling completed', {
            correlationId: correlationId,
            statusCode: statusCode,
            clientMessage: sanitizedMessage,
            errorType: errorType,
            totalServiceErrors: SERVICE_STATS.errorCount
        });
        
        // Return error response object for controller error handling
        return errorResponse;
        
    } catch (handlingError) {
        // Handle error handling process failures with basic fallback response
        logger.error('Error handling process failed', {
            originalError: error?.message,
            handlingError: handlingError.message,
            correlationId: requestContext?.correlationId
        });
        
        // Return basic error response as ultimate fallback
        return {
            statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            content: ERROR_MESSAGES.INTERNAL_ERROR,
            contentType: CONTENT_TYPES.TEXT_PLAIN,
            headers: {
                'Content-Type': CONTENT_TYPES.TEXT_PLAIN,
                'Content-Length': ERROR_MESSAGES.INTERNAL_ERROR.length,
                'X-Correlation-ID': requestContext?.correlationId || 'unknown',
                'X-Error-Type': 'error-handling-failure'
            },
            metadata: {
                correlationId: requestContext?.correlationId || 'unknown',
                timestamp: new Date().toISOString(),
                fallbackResponse: true
            },
            error: true
        };
    }
}

// =============================================================================
// STATISTICS AND MONITORING
// =============================================================================

/**
 * Returns comprehensive hello service statistics for monitoring, debugging, and operational insights.
 * This function provides detailed operational metrics including request counts, performance data, error rates, 
 * cache effectiveness, and service health indicators. It calculates derived metrics such as error rates, 
 * service uptime, and cache hit ratios for comprehensive service monitoring.
 * 
 * Service statistics include:
 * - Request count tracking with total processed requests and current request rate
 * - Error count and error rate calculation for service reliability monitoring
 * - Average response time calculation for performance analysis and optimization
 * - Cache effectiveness metrics including hit rate, miss rate, and cache utilization
 * - Service uptime calculation from initialization timestamp for availability tracking
 * - Active performance timer count for resource monitoring and memory usage analysis
 * - Application metadata and service version information for service identification
 * - Memory usage and resource utilization indicators for operational health assessment
 * 
 * @returns {Object} Service statistics object with request counts, performance metrics, error rates, and operational data
 * @throws {Error} Statistics generation errors are caught and result in error indication in response
 */
function getHelloServiceStats() {
    try {
        // Calculate service uptime since initialization
        const currentTime = Date.now();
        const serviceStartTime = SERVICE_STATS.serviceStartTime || currentTime;
        const uptimeMs = currentTime - serviceStartTime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        
        // Extract current SERVICE_STATS data (requestCount, errorCount, averageResponseTime)
        const requestCount = SERVICE_STATS.requestCount;
        const errorCount = SERVICE_STATS.errorCount;
        const averageResponseTime = SERVICE_STATS.averageResponseTime;
        
        // Calculate error rate percentage from total requests
        const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
        
        // Calculate requests per second based on uptime
        const requestsPerSecond = uptimeSeconds > 0 ? requestCount / uptimeSeconds : 0;
        
        // Include cache statistics (hit rate, size, TTL effectiveness)
        const cacheHitCount = SERVICE_STATS.cacheHitCount || 0;
        const cacheMissCount = SERVICE_STATS.cacheMissCount || 0;
        const totalCacheRequests = cacheHitCount + cacheMissCount;
        const cacheHitRate = totalCacheRequests > 0 ? (cacheHitCount / totalCacheRequests) * 100 : 0;
        
        // Calculate cache age and TTL information
        const cacheAge = HELLO_RESPONSE_CACHE.timestamp ? currentTime - HELLO_RESPONSE_CACHE.timestamp : null;
        const cacheValid = cacheAge !== null && cacheAge < HELLO_RESPONSE_CACHE.ttl;
        
        // Add performance metrics (average response time, request rate)
        const performanceMetrics = {
            averageResponseTime: averageResponseTime,
            requestsPerSecond: requestsPerSecond,
            totalRequests: requestCount,
            totalErrors: errorCount,
            errorRate: errorRate,
            fastestRequest: averageResponseTime, // Simplified for educational purposes
            slowestRequest: averageResponseTime * 2 // Estimated for demonstration
        };
        
        // Include application metadata and service version information
        const serviceMetadata = {
            applicationName: APPLICATION_METADATA.NAME,
            applicationVersion: APPLICATION_METADATA.VERSION,
            applicationDescription: APPLICATION_METADATA.DESCRIPTION,
            serviceStartTime: new Date(serviceStartTime).toISOString(),
            currentTime: new Date(currentTime).toISOString(),
            uptimeSeconds: uptimeSeconds,
            uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`
        };
        
        // Count active performance timers for resource monitoring
        const activeTimerCount = PERFORMANCE_TIMERS.size;
        const activeTimerIds = Array.from(PERFORMANCE_TIMERS.keys());
        
        // Calculate estimated memory usage
        const estimatedMemoryUsage = {
            activeTimers: activeTimerCount,
            cacheSize: HELLO_RESPONSE_CACHE.content ? HELLO_RESPONSE_CACHE.content.length : 0,
            estimatedBytes: (activeTimerCount * 64) + (HELLO_RESPONSE_CACHE.content?.length || 0)
        };
        
        // Create comprehensive statistics object with operational metrics
        const serviceStatistics = {
            // Core service metrics
            service: {
                status: 'operational',
                uptime: {
                    milliseconds: uptimeMs,
                    seconds: uptimeSeconds,
                    human: serviceMetadata.uptimeHuman
                },
                startTime: serviceMetadata.serviceStartTime,
                currentTime: serviceMetadata.currentTime,
                version: serviceMetadata.applicationVersion
            },
            
            // Request processing statistics
            requests: {
                total: requestCount,
                totalCounter: REQUEST_COUNTER,
                errors: errorCount,
                successful: requestCount - errorCount,
                errorRate: errorRate,
                requestsPerSecond: requestsPerSecond,
                lastRequestTime: SERVICE_STATS.lastRequestTime ? 
                    new Date(SERVICE_STATS.lastRequestTime).toISOString() : null
            },
            
            // Performance metrics
            performance: performanceMetrics,
            
            // Cache effectiveness statistics
            cache: {
                enabled: HELLO_CONFIG?.cacheTtl > 0,
                ttl: HELLO_RESPONSE_CACHE.ttl,
                hits: cacheHitCount,
                misses: cacheMissCount,
                hitRate: cacheHitRate,
                currentAge: cacheAge,
                isValid: cacheValid,
                hasContent: HELLO_RESPONSE_CACHE.content !== null
            },
            
            // Resource utilization
            resources: {
                activeTimers: activeTimerCount,
                activeTimerIds: activeTimerIds.slice(0, 10), // Limit to first 10 for readability
                estimatedMemoryUsage: estimatedMemoryUsage
            },
            
            // Configuration information
            configuration: {
                cacheTtl: HELLO_CONFIG?.cacheTtl || 300000,
                performanceTracking: HELLO_CONFIG?.performanceTracking !== false,
                responseContent: HELLO_CONFIG?.responseContent || 'Hello world',
                contentType: HELLO_CONFIG?.contentType || CONTENT_TYPES.TEXT_PLAIN
            },
            
            // Application metadata
            application: serviceMetadata,
            
            // Statistics metadata
            statistics: {
                generatedAt: new Date().toISOString(),
                generationTime: Date.now() - currentTime,
                statisticsVersion: '1.0.0',
                includesPredictions: false
            }
        };
        
        // Return service statistics for monitoring and performance analysis
        return Object.freeze(serviceStatistics);
        
    } catch (error) {
        // Handle statistics generation errors with fallback statistics
        logger.error('Failed to generate hello service statistics', {
            error: error.message,
            errorType: error.constructor.name,
            timestamp: new Date().toISOString()
        });
        
        // Return basic statistics with error indication
        return {
            service: {
                status: 'error',
                error: error.message
            },
            requests: {
                total: SERVICE_STATS.requestCount || 0,
                errors: SERVICE_STATS.errorCount || 0
            },
            statistics: {
                generatedAt: new Date().toISOString(),
                error: true,
                errorMessage: error.message
            }
        };
    }
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Utility function that clears hello service response cache for testing purposes or cache invalidation.
 * This function implements comprehensive cache and resource cleanup including response cache clearing, 
 * performance timer cleanup, statistics reset, and memory leak prevention. It provides a clean slate 
 * for testing scenarios and manual cache management operations.
 * 
 * Cache reset operations include:
 * - Response cache content clearing and timestamp reset to force fresh response generation
 * - Active performance timer cleanup in PERFORMANCE_TIMERS Map to prevent memory leaks
 * - Request counter reset to zero for fresh statistics tracking and baseline establishment
 * - Service statistics reset to initial state with zero counters for clean measurement
 * - Cache hit/miss counter reset for accurate cache effectiveness measurement
 * - Logging of cache reset operation with timestamp for operational audit trail
 * - Forced fresh response generation trigger on next hello request processing
 * 
 * @returns {void} No return value - clears HELLO_RESPONSE_CACHE and performance timers
 * @throws {Error} Cache reset errors are caught and logged but don't prevent operation completion
 */
function resetHelloServiceCache() {
    try {
        // Clear HELLO_RESPONSE_CACHE content and reset timestamp to 0
        HELLO_RESPONSE_CACHE.content = null;
        HELLO_RESPONSE_CACHE.contentType = CONTENT_TYPES.TEXT_PLAIN;
        HELLO_RESPONSE_CACHE.timestamp = 0;
        HELLO_RESPONSE_CACHE.ttl = HELLO_CONFIG?.cacheTtl || 300000;
        
        // Clear any active performance timers in PERFORMANCE_TIMERS Map
        const clearedTimerCount = PERFORMANCE_TIMERS.size;
        PERFORMANCE_TIMERS.clear();
        
        // Reset REQUEST_COUNTER to 0 for fresh statistics tracking
        REQUEST_COUNTER = 0;
        
        // Reset SERVICE_STATS object to initial state (zeros)
        const serviceStartTime = SERVICE_STATS.serviceStartTime || Date.now();
        SERVICE_STATS = {
            requestCount: 0,
            errorCount: 0,
            averageResponseTime: 0,
            lastRequestTime: 0,
            serviceStartTime: serviceStartTime,
            cacheHitCount: 0,
            cacheMissCount: 0
        };
        
        // Log cache reset operation using logger.debug() with timestamp
        logger.debug('Hello service cache and statistics reset completed', {
            timestamp: new Date().toISOString(),
            resetOperations: {
                cacheCleared: true,
                performanceTimersCleared: clearedTimerCount,
                requestCounterReset: true,
                statisticsReset: true
            },
            cacheConfig: {
                ttl: HELLO_RESPONSE_CACHE.ttl,
                contentType: HELLO_RESPONSE_CACHE.contentType
            }
        });
        
        // Force fresh response generation on next hello request
        logger.info('Hello service cache reset - next request will generate fresh response', {
            resetTimestamp: new Date().toISOString(),
            clearedTimers: clearedTimerCount,
            serviceReady: true
        });
        
    } catch (error) {
        // Handle cache reset errors gracefully - log error but continue operation
        logger.error('Hello service cache reset failed', {
            error: error.message,
            errorType: error.constructor.name,
            timestamp: new Date().toISOString(),
            partialResetPossible: true
        });
        
        // Attempt partial reset for critical components even if error occurred
        try {
            HELLO_RESPONSE_CACHE.content = null;
            HELLO_RESPONSE_CACHE.timestamp = 0;
            REQUEST_COUNTER = 0;
        } catch (partialResetError) {
            logger.error('Partial cache reset also failed', {
                error: partialResetError.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

/**
 * Internal function that validates hello service configuration for proper settings and threshold values.
 * This function implements comprehensive configuration validation including type checking, range validation, 
 * threshold verification, and boolean flag validation. It ensures that the hello service configuration 
 * is properly structured and contains valid values for reliable service operation.
 * 
 * Configuration validation includes:
 * - Hello endpoint enablement validation in configuration (features.helloEndpoint) with boolean checking
 * - Response cache TTL validation for positive and reasonable values (minimum 1000ms, maximum 1 hour)
 * - Response content configuration validation ensuring string type and non-empty content
 * - Performance tracking settings validation ensuring boolean values and proper flag configuration
 * - Logging level configuration validation for hello service operations and debug output
 * - Timeout values validation ensuring positive integers and reasonable operational thresholds
 * - Boolean configuration flags validation for proper true/false values without type coercion
 * - Detailed error collection and reporting for troubleshooting configuration issues
 * 
 * @param {Object} config - Configuration object containing hello service settings and operational parameters
 * @returns {Object} Configuration validation result with isValid boolean and validation errors array
 * @throws {Error} Configuration validation process errors are caught and included in validation result
 */
function validateHelloServiceConfiguration(config) {
    try {
        // Initialize validation result object with errors array
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            validatedConfig: {},
            timestamp: new Date().toISOString()
        };
        
        // Validate hello endpoint is enabled in configuration (features.helloEndpoint)
        const helloEndpointConfig = config?.features?.helloEndpoint;
        if (helloEndpointConfig === undefined) {
            validationResult.warnings.push({
                section: 'features.helloEndpoint',
                message: 'Hello endpoint configuration not found, using defaults',
                code: 'MISSING_HELLO_CONFIG'
            });
        } else if (typeof helloEndpointConfig !== 'object') {
            validationResult.errors.push({
                section: 'features.helloEndpoint',
                message: 'Hello endpoint configuration must be an object',
                code: 'INVALID_CONFIG_TYPE',
                actualType: typeof helloEndpointConfig
            });
        }
        
        // Extract hello configuration with defaults
        const helloConfig = helloEndpointConfig || {};
        
        // Check response cache TTL is positive and reasonable (minimum 1000ms, maximum 1 hour)
        const cacheTtl = helloConfig.cacheTtl;
        if (cacheTtl !== undefined) {
            if (typeof cacheTtl !== 'number') {
                validationResult.errors.push({
                    section: 'cacheTtl',
                    message: 'Cache TTL must be a number',
                    code: 'INVALID_TTL_TYPE',
                    actualType: typeof cacheTtl
                });
            } else if (cacheTtl < 1000) {
                validationResult.errors.push({
                    section: 'cacheTtl',
                    message: 'Cache TTL must be at least 1000ms (1 second)',
                    code: 'TTL_TOO_SMALL',
                    actualValue: cacheTtl,
                    minimumValue: 1000
                });
            } else if (cacheTtl > 3600000) {
                validationResult.errors.push({
                    section: 'cacheTtl',
                    message: 'Cache TTL must not exceed 3600000ms (1 hour)',
                    code: 'TTL_TOO_LARGE',
                    actualValue: cacheTtl,
                    maximumValue: 3600000
                });
            } else {
                validationResult.validatedConfig.cacheTtl = cacheTtl;
            }
        } else {
            validationResult.validatedConfig.cacheTtl = 300000; // Default 5 minutes
        }
        
        // Verify response content configuration is string and non-empty
        const responseContent = helloConfig.responseContent;
        if (responseContent !== undefined) {
            if (typeof responseContent !== 'string') {
                validationResult.errors.push({
                    section: 'responseContent',
                    message: 'Response content must be a string',
                    code: 'INVALID_CONTENT_TYPE',
                    actualType: typeof responseContent
                });
            } else if (responseContent.trim().length === 0) {
                validationResult.errors.push({
                    section: 'responseContent',
                    message: 'Response content cannot be empty',
                    code: 'EMPTY_CONTENT',
                    actualValue: responseContent
                });
            } else {
                validationResult.validatedConfig.responseContent = responseContent;
            }
        } else {
            validationResult.validatedConfig.responseContent = 'Hello world';
        }
        
        // Validate performance tracking settings are boolean values
        const performanceTracking = helloConfig.performanceTracking;
        if (performanceTracking !== undefined) {
            if (typeof performanceTracking !== 'boolean') {
                validationResult.errors.push({
                    section: 'performanceTracking',
                    message: 'Performance tracking setting must be a boolean',
                    code: 'INVALID_BOOLEAN_TYPE',
                    actualType: typeof performanceTracking,
                    actualValue: performanceTracking
                });
            } else {
                validationResult.validatedConfig.performanceTracking = performanceTracking;
            }
        } else {
            validationResult.validatedConfig.performanceTracking = true;
        }
        
        // Check logging level configuration is valid for hello service operations
        const loggingConfig = config?.logging;
        if (loggingConfig) {
            if (loggingConfig.level) {
                const validLevels = ['error', 'warn', 'info', 'debug'];
                if (!validLevels.includes(loggingConfig.level)) {
                    validationResult.errors.push({
                        section: 'logging.level',
                        message: 'Invalid logging level',
                        code: 'INVALID_LOG_LEVEL',
                        actualValue: loggingConfig.level,
                        validValues: validLevels
                    });
                }
            }
        }
        
        // Verify timeout values are positive integers
        const serverConfig = config?.server;
        if (serverConfig && serverConfig.timeout !== undefined) {
            if (typeof serverConfig.timeout !== 'number' || serverConfig.timeout <= 0) {
                validationResult.errors.push({
                    section: 'server.timeout',
                    message: 'Server timeout must be a positive number',
                    code: 'INVALID_TIMEOUT',
                    actualValue: serverConfig.timeout
                });
            }
        }
        
        // Validate boolean configuration flags have proper boolean values
        const booleanFields = ['includeAppMetadata', 'preGenerateResponse'];
        booleanFields.forEach(field => {
            if (helloConfig[field] !== undefined && typeof helloConfig[field] !== 'boolean') {
                validationResult.warnings.push({
                    section: field,
                    message: `${field} should be a boolean value`,
                    code: 'NON_BOOLEAN_FLAG',
                    actualValue: helloConfig[field],
                    actualType: typeof helloConfig[field]
                });
            }
        });
        
        // Set isValid flag to true if no validation errors found
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add validation summary
        validationResult.summary = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            validatedFields: Object.keys(validationResult.validatedConfig),
            configurationValid: validationResult.isValid
        };
        
        // Return validation result with detailed error information for debugging
        return validationResult;
        
    } catch (error) {
        // Handle configuration validation errors with comprehensive error context
        logger.error('Hello service configuration validation failed', {
            error: error.message,
            errorType: error.constructor.name,
            config: config,
            timestamp: new Date().toISOString()
        });
        
        return {
            isValid: false,
            errors: [{
                section: 'validation',
                message: 'Configuration validation process failed',
                code: 'VALIDATION_PROCESS_ERROR',
                error: error.message
            }],
            warnings: [],
            validatedConfig: {},
            summary: {
                totalErrors: 1,
                totalWarnings: 0,
                validatedFields: [],
                configurationValid: false
            },
            timestamp: new Date().toISOString()
        };
    }
}

// =============================================================================
// REQUEST CONTEXT UTILITIES
// =============================================================================

/**
 * Internal utility function that creates standardized request context objects for service processing.
 * This function implements request context standardization by extracting relevant information from 
 * Express.js request objects and creating consistent context objects for service layer processing. 
 * It includes request metadata extraction, correlation ID generation, and standardized field mapping.
 * 
 * Request context creation includes:
 * - HTTP method extraction from Express request object with normalization
 * - Request path extraction and normalization for consistent processing across different request formats
 * - Relevant headers extraction (Host, User-Agent, Accept) for context and client identification
 * - Unique correlation ID generation using crypto.randomUUID() for distributed request tracing
 * - Timestamp addition using Date.now() for request timing and performance measurement
 * - Client IP address extraction for logging, monitoring, and security analysis
 * - Query parameters extraction if present (none expected for hello endpoint simplicity)
 * - Standardized context object creation with all request metadata for service processing
 * 
 * @param {Object} expressRequest - Express.js request object containing HTTP request information
 * @returns {Object} Standardized request context object with method, path, headers, and metadata
 * @throws {Error} Context creation errors are caught and result in basic context with error indication
 */
function createRequestContext(expressRequest) {
    try {
        // Extract HTTP method from Express request object
        const method = expressRequest?.method || 'GET';
        
        // Get request path and normalize for consistent processing
        const path = expressRequest?.path || expressRequest?.url || '/hello';
        
        // Extract relevant headers (Host, User-Agent, Accept) for context
        const headers = expressRequest?.headers || {};
        const relevantHeaders = {
            'host': headers.host || headers.Host,
            'user-agent': headers['user-agent'] || headers['User-Agent'],
            'accept': headers.accept || headers.Accept,
            'content-type': headers['content-type'] || headers['Content-Type'],
            'x-forwarded-for': headers['x-forwarded-for'] || headers['X-Forwarded-For']
        };
        
        // Generate correlation ID using crypto.randomUUID() for tracing
        const correlationId = crypto.randomUUID();
        
        // Add timestamp using Date.now() for request timing
        const timestamp = new Date().toISOString();
        const timestampMs = Date.now();
        
        // Include client IP address for logging and monitoring
        const clientIp = expressRequest?.ip || 
                         expressRequest?.connection?.remoteAddress || 
                         expressRequest?.socket?.remoteAddress ||
                         headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         'unknown';
        
        // Extract query parameters if present (none expected for hello endpoint)
        const queryParams = expressRequest?.query || {};
        
        // Extract additional Express.js metadata
        const httpVersion = expressRequest?.httpVersion || '1.1';
        const secure = expressRequest?.secure || false;
        const protocol = secure ? 'https' : 'http';
        
        // Create standardized context object with all request metadata
        const requestContext = {
            // Core HTTP request information
            method: method,
            path: path,
            url: expressRequest?.originalUrl || expressRequest?.url || path,
            httpVersion: httpVersion,
            protocol: protocol,
            
            // Request headers and client information
            headers: relevantHeaders,
            clientIp: clientIp,
            userAgent: relevantHeaders['user-agent'] || 'unknown',
            
            // Timing and correlation
            correlationId: correlationId,
            timestamp: timestamp,
            timestampMs: timestampMs,
            
            // Additional metadata
            queryParams: queryParams,
            secure: secure,
            
            // Express.js specific metadata
            express: {
                baseUrl: expressRequest?.baseUrl || '',
                originalUrl: expressRequest?.originalUrl || path,
                params: expressRequest?.params || {},
                route: expressRequest?.route || null
            }
        };
        
        // Log request context creation for debugging
        logger.debug('Request context created successfully', {
            correlationId: correlationId,
            method: method,
            path: path,
            clientIp: clientIp,
            userAgent: relevantHeaders['user-agent'] || 'unknown',
            timestamp: timestamp
        });
        
        // Return request context object for service layer processing
        return requestContext;
        
    } catch (error) {
        // Handle context creation errors gracefully with basic fallback context
        logger.error('Failed to create request context', {
            error: error.message,
            errorType: error.constructor.name,
            expressRequest: expressRequest ? 'present' : 'missing',
            timestamp: new Date().toISOString()
        });
        
        // Return minimal context for continued operation
        const fallbackCorrelationId = crypto.randomUUID();
        return {
            method: expressRequest?.method || 'GET',
            path: expressRequest?.path || expressRequest?.url || '/hello',
            url: expressRequest?.originalUrl || expressRequest?.url || '/hello',
            headers: expressRequest?.headers || {},
            clientIp: 'unknown',
            userAgent: 'unknown',
            correlationId: fallbackCorrelationId,
            timestamp: new Date().toISOString(),
            timestampMs: Date.now(),
            queryParams: {},
            error: true,
            errorMessage: error.message
        };
    }
}

// =============================================================================
// SERVICE INITIALIZATION ON MODULE LOAD
// =============================================================================

// Initialize the hello service automatically when the module is loaded
// This ensures the service is ready for use as soon as the module is imported
initializeHelloService();

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Main hello service function for processing validated hello requests with business logic and response generation
    processHelloRequest,
    
    // Hello request validation function for ensuring proper request format and method validation
    validateHelloRequest,
    
    // Hello response generation function for creating 'Hello world' response content with proper formatting
    generateHelloWorldResponse,
    
    // Service statistics function for monitoring hello service performance and operational metrics
    getHelloServiceStats,
    
    // Utility function for hello service cache management and testing scenario support
    resetHelloServiceCache,
    
    // Request context factory function for creating standardized request objects from Express requests
    createRequestContext
};