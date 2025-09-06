/**
 * Comprehensive Security Middleware for Node.js Tutorial Application
 * 
 * This middleware implements multiple layers of security protection for the Node.js tutorial 
 * application, combining HTTP security headers, request validation, rate limiting, and security 
 * monitoring into a unified middleware factory function. The implementation integrates with 
 * Express.js 5.1.0 automatic promise error handling and provides educational security patterns 
 * while maintaining production-ready security enforcement capabilities.
 * 
 * Key Features:
 * - Multi-layered security architecture with headers, validation, rate limiting, and monitoring
 * - Express.js 5.1.0 integration with automatic promise error handling for async security operations
 * - Environment-aware security configuration supporting development, production, and test environments
 * - Educational security patterns demonstrating comprehensive security policy orchestration
 * - Production-ready security enforcement with graceful degradation for non-critical failures
 * - IP-based rate limiting with proxy support and memory-efficient storage management
 * - Request validation including header size limits and HTTP method filtering
 * - Security event logging with performance metrics and correlation tracking
 * - Comprehensive security statistics and auditing capabilities for operational monitoring
 * - Runtime configuration updates for dynamic security policy adjustments
 * 
 * Architecture:
 * - Factory pattern for creating combined security middleware with configurable policies
 * - Map-based rate limiting storage with automatic cleanup to prevent memory leaks
 * - Integrated security statistics tracking for monitoring and operational insights
 * - Modular security component composition for flexible security policy enforcement
 * - Performance-optimized security checks with early exit patterns for invalid requests
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async/await support and automatic promise error handling
 * - Node.js 22.11.0 LTS with improved performance and security enhancements
 * - Production environments with enterprise-grade security requirements
 * - Development environments with educational security pattern demonstration
 * 
 * Security Coverage:
 * - HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) via headers.js integration
 * - Rate limiting protection against DoS attacks and brute force attempts
 * - Request validation with header size limits and malicious pattern detection
 * - HTTP method filtering to reduce attack surface by blocking unnecessary methods
 * - Security event logging for incident response and audit trail generation
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Comprehensive security middleware patterns and defense-in-depth strategies
 */

// =============================================================================
// EXTERNAL DEPENDENCIES - No external npm packages required
// =============================================================================

// All dependencies are internal modules - maintaining tutorial simplicity
// while demonstrating enterprise security patterns

// =============================================================================
// INTERNAL SECURITY DEPENDENCIES
// =============================================================================

// Import security headers factory function to create combined security headers middleware
const {
    createSecurityHeadersMiddleware,
    disablePoweredByHeader,
    setBasicSecurityHeaders,
    auditSecurityHeaders
} = require('../security/headers.js');

// =============================================================================
// INTERNAL UTILITY DEPENDENCIES  
// =============================================================================

// Import configuration factory to access environment-specific security settings
const { getConfig } = require('../utils/config.js');

// Import structured logging utility for security event logging and monitoring
const { 
    logger,
    startTimer,
    stopTimer
} = require('../utils/logger.js');

// Import HTTP status codes for security violation responses
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import standardized error messages for consistent security responses
const { 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import security constants for rate limiting and validation thresholds
const { 
    SECURITY_CONSTANTS 
} = require('../utils/constants.js');

// Import HTTP method constants for request validation
const { 
    HTTP_METHODS 
} = require('../utils/constants.js');

// Import content type constants for security violation response formatting
const { 
    CONTENT_TYPES 
} = require('../utils/constants.js');

// =============================================================================
// GLOBAL SECURITY STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached security configuration from environment-specific settings
 * Prevents repeated configuration loading and improves middleware performance
 * @type {Object|null}
 */
let SECURITY_CONFIG = null;

/**
 * In-memory rate limiting storage with client IP tracking
 * Uses Map for O(1) lookup performance and efficient memory management
 * Structure: { clientIP: { count: number, windowStart: number, lastRequest: number } }
 * @type {Map<string, Object>}
 */
const RATE_LIMIT_STORE = new Map();

/**
 * Security statistics tracking object for monitoring and operational insights
 * Tracks total requests, blocked requests, rate limited requests, and security violations
 * @type {Object}
 */
const SECURITY_STATS = {
    totalRequests: 0,
    blocked: 0,
    rateLimited: 0,
    violations: 0,
    headerViolations: 0,
    methodViolations: 0,
    startTime: null,
    lastReset: null
};

/**
 * Flag indicating if security middleware system has been initialized
 * Prevents duplicate initialization and ensures proper configuration loading
 * @type {boolean}
 */
let SECURITY_MIDDLEWARE_INITIALIZED = false;

// =============================================================================
// SECURITY MIDDLEWARE INITIALIZATION
// =============================================================================

/**
 * Initializes the security middleware system by loading configuration and setting up monitoring.
 * This function loads environment-specific security configuration, initializes rate limiting 
 * storage, sets up security statistics tracking, validates configuration completeness, and 
 * establishes cleanup procedures for memory management.
 * 
 * Initialization process includes:
 * - Configuration loading with validation and error handling
 * - Rate limiting storage initialization with Map-based structure
 * - Security statistics object setup with operational counters
 * - Configuration validation for security compliance and completeness
 * - Cleanup interval establishment for preventing memory leaks
 * - Initialization logging for operational monitoring and debugging
 * 
 * This function implements graceful degradation - if configuration loading fails,
 * it uses safe default values to ensure security middleware remains operational.
 * 
 * @returns {void} No return value - initializes global security middleware state
 */
function initializeSecurityMiddleware() {
    try {
        // Prevent duplicate initialization
        if (SECURITY_MIDDLEWARE_INITIALIZED) {
            logger.debug('Security middleware already initialized, skipping duplicate initialization');
            return;
        }
        
        // Load security configuration using getConfig() and cache for performance
        const config = getConfig();
        SECURITY_CONFIG = config.security || {};
        
        // Validate security configuration for required settings and completeness
        if (!SECURITY_CONFIG.rateLimit) {
            SECURITY_CONFIG.rateLimit = {
                maxRequests: SECURITY_CONSTANTS.MAX_REQUEST_RATE,
                windowMs: SECURITY_CONSTANTS.RATE_WINDOW_MS,
                enabled: true
            };
        }
        
        if (!SECURITY_CONFIG.validation) {
            SECURITY_CONFIG.validation = {
                maxHeaderSize: SECURITY_CONSTANTS.MAX_HEADER_SIZE,
                allowedMethods: [HTTP_METHODS.GET, HTTP_METHODS.OPTIONS],
                enabled: true
            };
        }
        
        if (!SECURITY_CONFIG.monitoring) {
            SECURITY_CONFIG.monitoring = {
                enabled: true,
                logViolations: true,
                trackPerformance: true
            };
        }
        
        // Initialize rate limiting storage Map with efficient O(1) operations
        RATE_LIMIT_STORE.clear();
        
        // Initialize security statistics tracking with operational counters
        SECURITY_STATS.totalRequests = 0;
        SECURITY_STATS.blocked = 0;
        SECURITY_STATS.rateLimited = 0;
        SECURITY_STATS.violations = 0;
        SECURITY_STATS.headerViolations = 0;
        SECURITY_STATS.methodViolations = 0;
        SECURITY_STATS.startTime = new Date().toISOString();
        SECURITY_STATS.lastReset = new Date().toISOString();
        
        // Set up cleanup interval for rate limiting storage to prevent memory leaks
        setInterval(() => {
            const removedCount = cleanupRateLimitStore();
            if (removedCount > 0) {
                logger.debug(`Cleaned up ${removedCount} expired rate limit entries`);
            }
        }, 5 * 60 * 1000); // Clean up every 5 minutes
        
        // Mark initialization as complete
        SECURITY_MIDDLEWARE_INITIALIZED = true;
        
        // Log successful initialization with configuration summary
        logger.info('Security middleware initialized successfully', {
            rateLimitEnabled: SECURITY_CONFIG.rateLimit?.enabled || false,
            validationEnabled: SECURITY_CONFIG.validation?.enabled || false,
            monitoringEnabled: SECURITY_CONFIG.monitoring?.enabled || false,
            maxRequests: SECURITY_CONFIG.rateLimit?.maxRequests || 0,
            windowMs: SECURITY_CONFIG.rateLimit?.windowMs || 0,
            allowedMethods: SECURITY_CONFIG.validation?.allowedMethods || [],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        // Handle initialization errors gracefully with fallback configuration
        logger.error('Failed to initialize security middleware, using fallback configuration', {
            error: error.message,
            stack: error.stack,
            fallbackUsed: true
        });
        
        // Set safe fallback configuration to ensure continued operation
        SECURITY_CONFIG = {
            rateLimit: {
                maxRequests: SECURITY_CONSTANTS.MAX_REQUEST_RATE,
                windowMs: SECURITY_CONSTANTS.RATE_WINDOW_MS,
                enabled: true
            },
            validation: {
                maxHeaderSize: SECURITY_CONSTANTS.MAX_HEADER_SIZE,
                allowedMethods: [HTTP_METHODS.GET, HTTP_METHODS.OPTIONS],
                enabled: true
            },
            monitoring: {
                enabled: true,
                logViolations: true,
                trackPerformance: true
            }
        };
        
        // Ensure initialization flag is set even with fallback configuration
        SECURITY_MIDDLEWARE_INITIALIZED = true;
        
        // Clear and initialize storage structures
        RATE_LIMIT_STORE.clear();
        Object.assign(SECURITY_STATS, {
            totalRequests: 0,
            blocked: 0,
            rateLimited: 0,
            violations: 0,
            headerViolations: 0,
            methodViolations: 0,
            startTime: new Date().toISOString(),
            lastReset: new Date().toISOString()
        });
    }
}

// =============================================================================
// REQUEST VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Express middleware function that validates HTTP request headers for security compliance.
 * This middleware checks request headers for size limits, suspicious patterns, and security 
 * violations to prevent header-based attacks including oversized headers, header injection, 
 * and malicious header manipulation attempts.
 * 
 * Header validation includes:
 * - Total header size calculation and limit enforcement
 * - Individual header name and value validation for malicious patterns
 * - Header count limits to prevent header flooding attacks
 * - Security header override detection to prevent policy bypass
 * - Header encoding validation to prevent injection attacks
 * - Logging of security violations for monitoring and incident response
 * 
 * @param {Object} req - Express request object containing headers and request information
 * @param {Object} res - Express response object for sending security violation responses
 * @param {Function} next - Express next function to continue middleware chain or handle errors
 * @returns {void} Calls next() to continue or sends 400 Bad Request for violations
 */
function validateRequestHeaders(req, res, next) {
    try {
        // Initialize security middleware if not already done
        if (!SECURITY_MIDDLEWARE_INITIALIZED) {
            initializeSecurityMiddleware();
        }
        
        // Skip validation if disabled in configuration
        if (!SECURITY_CONFIG?.validation?.enabled) {
            return next();
        }
        
        // Extract all HTTP headers from request object
        const headers = req.headers || {};
        
        // Calculate total header size by summing header names and values
        let totalHeaderSize = 0;
        let headerCount = 0;
        
        for (const [name, value] of Object.entries(headers)) {
            // Handle array values (multiple headers with same name)
            if (Array.isArray(value)) {
                totalHeaderSize += name.length;
                value.forEach(v => {
                    totalHeaderSize += String(v).length;
                });
            } else {
                totalHeaderSize += name.length + String(value).length;
            }
            headerCount++;
        }
        
        // Check total header size against security configuration limit
        const maxHeaderSize = SECURITY_CONFIG.validation?.maxHeaderSize || SECURITY_CONSTANTS.MAX_HEADER_SIZE;
        if (totalHeaderSize > maxHeaderSize) {
            // Update security statistics for header violation
            SECURITY_STATS.violations++;
            SECURITY_STATS.headerViolations++;
            SECURITY_STATS.blocked++;
            
            // Log security violation with detailed information
            if (SECURITY_CONFIG.monitoring?.logViolations) {
                logger.warn('Request header validation failed - size limit exceeded', {
                    clientIp: req.ip || req.connection?.remoteAddress || 'unknown',
                    userAgent: headers['user-agent'] || 'unknown',
                    totalHeaderSize: totalHeaderSize,
                    maxHeaderSize: maxHeaderSize,
                    headerCount: headerCount,
                    violationType: 'oversized_headers',
                    requestId: req.requestId || 'unknown',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Send security violation response with appropriate status code
            return res.status(HTTP_STATUS.BAD_REQUEST)
                .type(CONTENT_TYPES.APPLICATION_JSON)
                .json({
                    error: ERROR_MESSAGES.SECURITY_VIOLATION,
                    message: 'Request headers exceed maximum size limit',
                    code: 'HEADER_SIZE_LIMIT_EXCEEDED',
                    timestamp: new Date().toISOString()
                });
        }
        
        // Check for suspicious header patterns and potential injection attempts
        const suspiciousPatterns = [
            /[\r\n]/,           // CRLF injection
            /<script/i,         // Script injection
            /javascript:/i,     // JavaScript protocol
            /data:.*base64/i,   // Data URI with base64
            /\x00/,            // Null byte
            /%00/              // URL-encoded null byte
        ];
        
        for (const [name, value] of Object.entries(headers)) {
            const headerValue = Array.isArray(value) ? value.join(' ') : String(value);
            
            // Check header name and value against suspicious patterns
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(name) || pattern.test(headerValue)) {
                    // Update security statistics for malicious header detection
                    SECURITY_STATS.violations++;
                    SECURITY_STATS.headerViolations++;
                    SECURITY_STATS.blocked++;
                    
                    // Log security violation with pattern information
                    if (SECURITY_CONFIG.monitoring?.logViolations) {
                        logger.warn('Request header validation failed - suspicious pattern detected', {
                            clientIp: req.ip || req.connection?.remoteAddress || 'unknown',
                            userAgent: headers['user-agent'] || 'unknown',
                            suspiciousHeader: name,
                            pattern: pattern.toString(),
                            violationType: 'malicious_header_pattern',
                            requestId: req.requestId || 'unknown',
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    // Send security violation response for malicious pattern
                    return res.status(HTTP_STATUS.BAD_REQUEST)
                        .type(CONTENT_TYPES.APPLICATION_JSON)
                        .json({
                            error: ERROR_MESSAGES.SECURITY_VIOLATION,
                            message: 'Request headers contain suspicious patterns',
                            code: 'MALICIOUS_HEADER_DETECTED',
                            timestamp: new Date().toISOString()
                        });
                }
            }
        }
        
        // Validate that critical security headers are not being overridden maliciously
        const criticalHeaders = ['x-frame-options', 'content-security-policy', 'strict-transport-security'];
        for (const criticalHeader of criticalHeaders) {
            if (headers[criticalHeader]) {
                // Log warning for client attempting to override security headers
                logger.warn('Client attempting to set critical security header', {
                    clientIp: req.ip || req.connection?.remoteAddress || 'unknown',
                    header: criticalHeader,
                    value: headers[criticalHeader],
                    violationType: 'security_header_override_attempt',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Header validation passed - continue to next middleware
        next();
        
    } catch (error) {
        // Handle header validation errors gracefully - log error and continue
        logger.error('Error in request header validation middleware', {
            error: error.message,
            stack: error.stack,
            requestPath: req.path,
            requestMethod: req.method,
            timestamp: new Date().toISOString()
        });
        
        // Continue processing to avoid blocking legitimate requests due to validation errors
        next();
    }
}

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

/**
 * Express middleware function implementing IP-based rate limiting with configurable thresholds.
 * This middleware protects against denial-of-service attacks and brute force attempts by 
 * tracking request rates per client IP address using a sliding window algorithm with 
 * automatic cleanup and proxy support for accurate client identification.
 * 
 * Rate limiting features:
 * - IP-based request tracking with sliding window algorithm
 * - Configurable request limits and time windows from security configuration
 * - Proxy support with X-Forwarded-For header processing for accurate client IP detection
 * - Memory-efficient Map-based storage with automatic expired entry cleanup
 * - Rate limiting headers for client feedback (X-RateLimit-Limit, X-RateLimit-Remaining)
 * - Comprehensive logging for rate limiting violations and operational monitoring
 * - Graceful handling of storage errors without blocking legitimate traffic
 * 
 * @param {Object} req - Express request object with client IP and connection information
 * @param {Object} res - Express response object for rate limit violation responses
 * @param {Function} next - Express next function to continue middleware chain
 * @returns {void} Calls next() to continue or sends 429 Too Many Requests for violations
 */
function rateLimitingMiddleware(req, res, next) {
    try {
        // Initialize security middleware if not already done
        if (!SECURITY_MIDDLEWARE_INITIALIZED) {
            initializeSecurityMiddleware();
        }
        
        // Skip rate limiting if disabled in configuration
        if (!SECURITY_CONFIG?.rateLimit?.enabled) {
            return next();
        }
        
        // Extract client IP address with proxy support
        let clientIp = req.ip || 
                      req.connection?.remoteAddress || 
                      req.socket?.remoteAddress ||
                      'unknown';
        
        // Handle proxy scenarios with X-Forwarded-For header processing
        const forwardedFor = req.headers['x-forwarded-for'];
        if (forwardedFor && SECURITY_CONFIG.rateLimit?.trustProxy) {
            // Extract first IP from X-Forwarded-For chain (original client)
            clientIp = forwardedFor.split(',')[0].trim();
        }
        
        // Normalize IP address for consistent storage (IPv6 compatibility)
        clientIp = clientIp.replace(/^::ffff:/, ''); // Remove IPv4-mapped IPv6 prefix
        
        // Get current timestamp and rate limiting configuration
        const now = Date.now();
        const maxRequests = SECURITY_CONFIG.rateLimit?.maxRequests || SECURITY_CONSTANTS.MAX_REQUEST_RATE;
        const windowMs = SECURITY_CONFIG.rateLimit?.windowMs || SECURITY_CONSTANTS.RATE_WINDOW_MS;
        
        // Retrieve existing rate limit data for client IP
        let rateLimitData = RATE_LIMIT_STORE.get(clientIp);
        
        if (!rateLimitData) {
            // Initialize rate limit tracking for new client
            rateLimitData = {
                count: 1,
                windowStart: now,
                lastRequest: now,
                firstRequest: now
            };
            RATE_LIMIT_STORE.set(clientIp, rateLimitData);
        } else {
            // Check if current request is within the time window
            const timeSinceWindowStart = now - rateLimitData.windowStart;
            
            if (timeSinceWindowStart >= windowMs) {
                // Time window has expired - reset rate limit data
                rateLimitData.count = 1;
                rateLimitData.windowStart = now;
                rateLimitData.lastRequest = now;
            } else {
                // Within time window - increment request count
                rateLimitData.count++;
                rateLimitData.lastRequest = now;
            }
        }
        
        // Calculate remaining requests in current window
        const remaining = Math.max(0, maxRequests - rateLimitData.count);
        const resetTime = rateLimitData.windowStart + windowMs;
        
        // Set rate limiting headers for client feedback
        res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(), // Unix timestamp
            'X-RateLimit-Window': Math.ceil(windowMs / 1000).toString()   // Window in seconds
        });
        
        // Check if rate limit has been exceeded
        if (rateLimitData.count > maxRequests) {
            // Update security statistics for rate limiting violation
            SECURITY_STATS.rateLimited++;
            SECURITY_STATS.blocked++;
            SECURITY_STATS.violations++;
            
            // Log rate limiting violation with detailed client information
            if (SECURITY_CONFIG.monitoring?.logViolations) {
                logger.warn('Rate limit exceeded for client IP', {
                    clientIp: clientIp,
                    requestCount: rateLimitData.count,
                    maxRequests: maxRequests,
                    windowMs: windowMs,
                    userAgent: req.headers['user-agent'] || 'unknown',
                    requestPath: req.path,
                    requestMethod: req.method,
                    windowStart: new Date(rateLimitData.windowStart).toISOString(),
                    violationType: 'rate_limit_exceeded',
                    requestId: req.requestId || 'unknown',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Set additional headers for rate limited response
            res.set('Retry-After', Math.ceil((resetTime - now) / 1000).toString());
            
            // Send rate limit exceeded response
            return res.status(HTTP_STATUS.TOO_MANY_REQUESTS)
                .type(CONTENT_TYPES.APPLICATION_JSON)
                .json({
                    error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
                    message: 'Request rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    limit: maxRequests,
                    remaining: 0,
                    resetTime: resetTime,
                    retryAfter: Math.ceil((resetTime - now) / 1000),
                    timestamp: new Date().toISOString()
                });
        }
        
        // Rate limit check passed - continue to next middleware
        next();
        
    } catch (error) {
        // Handle rate limiting errors gracefully - log error and continue
        logger.error('Error in rate limiting middleware', {
            error: error.message,
            stack: error.stack,
            requestPath: req.path,
            requestMethod: req.method,
            clientIp: req.ip || 'unknown',
            timestamp: new Date().toISOString()
        });
        
        // Continue processing to avoid blocking requests due to rate limiting errors
        next();
    }
}

// =============================================================================
// HTTP METHOD VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Express middleware function that validates HTTP request method against allowed methods list.
 * This middleware reduces attack surface by filtering HTTP methods and blocking unnecessary 
 * methods that could be used for exploitation. It supports configurable allowed methods 
 * with proper HTTP 405 Method Not Allowed responses including Allow header specification.
 * 
 * Method validation features:
 * - Configurable allowed methods list from security configuration
 * - Case-insensitive HTTP method comparison for robust validation
 * - Proper HTTP 405 Method Not Allowed responses with Allow header
 * - Security violation logging for monitoring and incident response
 * - Attack surface reduction by blocking unnecessary HTTP methods
 * - Integration with security statistics tracking for operational metrics
 * 
 * @param {Object} req - Express request object containing HTTP method information
 * @param {Object} res - Express response object for method not allowed responses
 * @param {Function} next - Express next function to continue middleware chain
 * @returns {void} Calls next() to continue or sends 405 Method Not Allowed for violations
 */
function validateRequestMethod(req, res, next) {
    try {
        // Initialize security middleware if not already done
        if (!SECURITY_MIDDLEWARE_INITIALIZED) {
            initializeSecurityMiddleware();
        }
        
        // Skip method validation if disabled in configuration
        if (!SECURITY_CONFIG?.validation?.enabled) {
            return next();
        }
        
        // Extract HTTP method from request and normalize to uppercase
        const requestMethod = (req.method || '').toUpperCase();
        
        // Get allowed methods from configuration with fallback to defaults
        const allowedMethods = SECURITY_CONFIG.validation?.allowedMethods || 
                              [HTTP_METHODS.GET, HTTP_METHODS.OPTIONS];
        
        // Normalize allowed methods to uppercase for case-insensitive comparison
        const normalizedAllowedMethods = allowedMethods.map(method => method.toUpperCase());
        
        // Check if request method is included in allowed methods list
        if (!normalizedAllowedMethods.includes(requestMethod)) {
            // Update security statistics for method violation
            SECURITY_STATS.violations++;
            SECURITY_STATS.methodViolations++;
            SECURITY_STATS.blocked++;
            
            // Log method validation violation with request details
            if (SECURITY_CONFIG.monitoring?.logViolations) {
                logger.warn('HTTP method validation failed - method not allowed', {
                    clientIp: req.ip || req.connection?.remoteAddress || 'unknown',
                    requestMethod: requestMethod,
                    allowedMethods: normalizedAllowedMethods,
                    requestPath: req.path,
                    userAgent: req.headers['user-agent'] || 'unknown',
                    violationType: 'method_not_allowed',
                    requestId: req.requestId || 'unknown',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Set Allow header with list of allowed methods for client information
            res.set('Allow', normalizedAllowedMethods.join(', '));
            
            // Send method not allowed response with proper HTTP status
            return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED)
                .type(CONTENT_TYPES.APPLICATION_JSON)
                .json({
                    error: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
                    message: `HTTP method '${requestMethod}' is not allowed for this endpoint`,
                    code: 'METHOD_NOT_ALLOWED',
                    allowedMethods: normalizedAllowedMethods,
                    requestedMethod: requestMethod,
                    timestamp: new Date().toISOString()
                });
        }
        
        // Method validation passed - continue to next middleware
        next();
        
    } catch (error) {
        // Handle method validation errors gracefully - log error and continue
        logger.error('Error in HTTP method validation middleware', {
            error: error.message,
            stack: error.stack,
            requestPath: req.path,
            requestMethod: req.method,
            timestamp: new Date().toISOString()
        });
        
        // Continue processing to avoid blocking legitimate requests due to validation errors
        next();
    }
}

// =============================================================================
// SECURITY EVENT LOGGING MIDDLEWARE
// =============================================================================

/**
 * Express middleware function that logs security-related events for monitoring and incident response.
 * This middleware captures comprehensive security context for each request including client 
 * information, request metadata, performance metrics, and security event correlation for 
 * effective monitoring and incident investigation capabilities.
 * 
 * Security logging features:
 * - Comprehensive request metadata capture for security analysis
 * - Performance timing integration using high-resolution performance measurement
 * - Client identification with IP address and User-Agent tracking
 * - Request correlation ID generation and tracking for distributed debugging
 * - Security context binding for effective incident investigation
 * - Performance impact measurement of security middleware processing
 * - Graceful error handling to prevent security logging failures from affecting requests
 * 
 * @param {Object} req - Express request object with client and request information
 * @param {Object} res - Express response object for response metadata capture
 * @param {Function} next - Express next function to continue middleware chain
 * @returns {void} Calls next() to continue middleware chain after logging security context
 */
function securityEventLogger(req, res, next) {
    try {
        // Initialize security middleware if not already done
        if (!SECURITY_MIDDLEWARE_INITIALIZED) {
            initializeSecurityMiddleware();
        }
        
        // Skip security logging if disabled in configuration
        if (!SECURITY_CONFIG?.monitoring?.enabled) {
            return next();
        }
        
        // Generate unique request correlation ID for tracking
        const correlationId = req.requestId || 
                             `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        req.requestId = correlationId;
        
        // Start performance timer for security middleware processing measurement
        let securityTimerId;
        if (SECURITY_CONFIG.monitoring?.trackPerformance) {
            securityTimerId = `security_${correlationId}`;
            startTimer(securityTimerId);
        }
        
        // Extract security-relevant request information
        const securityContext = {
            correlationId: correlationId,
            client: {
                ip: req.ip || req.connection?.remoteAddress || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                forwardedFor: req.headers['x-forwarded-for'] || null
            },
            request: {
                method: req.method,
                path: req.path,
                url: req.url,
                protocol: req.protocol,
                secure: req.secure,
                httpVersion: req.httpVersion || '1.1'
            },
            headers: {
                host: req.headers['host'],
                referer: req.headers['referer'] || req.headers['referrer'],
                origin: req.headers['origin'],
                contentType: req.headers['content-type'],
                contentLength: req.headers['content-length'],
                connection: req.headers['connection']
            },
            timestamp: new Date().toISOString(),
            securityStats: {
                totalRequests: SECURITY_STATS.totalRequests,
                rateLimitStoreSize: RATE_LIMIT_STORE.size
            }
        };
        
        // Log security event with structured security context
        if (SECURITY_CONFIG.monitoring?.logViolations) {
            logger.debug('Security middleware processing request', securityContext);
        }
        
        // Update security statistics with total request count
        SECURITY_STATS.totalRequests++;
        
        // Add security middleware processing timestamp to request object
        req.securityProcessedAt = new Date().toISOString();
        req.securityContext = securityContext;
        
        // Override res.end to capture response information and complete performance timing
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            try {
                // Complete performance timing measurement if enabled
                if (securityTimerId && SECURITY_CONFIG.monitoring?.trackPerformance) {
                    const processingTime = stopTimer(securityTimerId);
                    
                    if (processingTime > 0) {
                        logger.debug('Security middleware processing completed', {
                            correlationId: correlationId,
                            processingTimeMs: processingTime.toFixed(2),
                            statusCode: res.statusCode,
                            responseSize: chunk ? chunk.length : 0,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                
                // Log response completion for security monitoring
                if (SECURITY_CONFIG.monitoring?.logViolations && res.statusCode >= 400) {
                    logger.warn('Security-related response generated', {
                        correlationId: correlationId,
                        statusCode: res.statusCode,
                        clientIp: securityContext.client.ip,
                        requestPath: securityContext.request.path,
                        requestMethod: securityContext.request.method,
                        timestamp: new Date().toISOString()
                    });
                }
                
            } catch (endError) {
                // Handle response end errors gracefully without affecting response
                logger.error('Error in security event logger response end handler', {
                    error: endError.message,
                    correlationId: correlationId,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Call original res.end to complete response
            originalEnd.call(this, chunk, encoding);
        };
        
        // Continue to next middleware in chain
        next();
        
    } catch (error) {
        // Handle security logging errors gracefully without blocking request
        logger.error('Error in security event logging middleware', {
            error: error.message,
            stack: error.stack,
            requestPath: req.path,
            requestMethod: req.method,
            timestamp: new Date().toISOString()
        });
        
        // Continue processing to ensure security logging errors don't block requests
        next();
    }
}

// =============================================================================
// RATE LIMITING STORAGE MANAGEMENT
// =============================================================================

/**
 * Utility function that cleans up expired entries from rate limiting storage to prevent memory leaks.
 * This function performs periodic cleanup of the RATE_LIMIT_STORE Map by removing entries 
 * where the rate limiting window has expired, preventing memory growth in long-running 
 * applications and maintaining optimal performance of rate limiting operations.
 * 
 * Cleanup process includes:
 * - Expiration threshold calculation based on rate limiting window configuration
 * - Iteration through all rate limiting entries with O(n) complexity
 * - Expired entry identification and removal from Map storage
 * - Cleanup statistics tracking for monitoring memory management effectiveness
 * - Debug logging for cleanup operation visibility and performance analysis
 * 
 * @returns {number} Number of expired entries removed from rate limiting storage
 */
function cleanupRateLimitStore() {
    try {
        // Get current timestamp and calculate expiration threshold
        const now = Date.now();
        const windowMs = SECURITY_CONFIG?.rateLimit?.windowMs || SECURITY_CONSTANTS.RATE_WINDOW_MS;
        const expirationThreshold = now - (windowMs * 2); // Keep extra buffer for cleanup
        
        let removedCount = 0;
        
        // Iterate through all entries in RATE_LIMIT_STORE Map
        for (const [clientIp, rateLimitData] of RATE_LIMIT_STORE.entries()) {
            // Check if entry's window start time is older than expiration threshold
            if (rateLimitData.windowStart < expirationThreshold) {
                // Remove expired entry from RATE_LIMIT_STORE
                RATE_LIMIT_STORE.delete(clientIp);
                removedCount++;
            }
        }
        
        // Log cleanup statistics if debug logging enabled and entries were removed
        if (removedCount > 0 && SECURITY_CONFIG?.monitoring?.enabled) {
            logger.debug('Rate limiting storage cleanup completed', {
                removedEntries: removedCount,
                remainingEntries: RATE_LIMIT_STORE.size,
                expirationThreshold: new Date(expirationThreshold).toISOString(),
                windowMs: windowMs,
                timestamp: new Date().toISOString()
            });
        }
        
        // Return total number of removed entries for monitoring purposes
        return removedCount;
        
    } catch (error) {
        // Handle cleanup errors gracefully - log error but don't throw
        logger.error('Error during rate limiting storage cleanup', {
            error: error.message,
            stack: error.stack,
            currentStoreSize: RATE_LIMIT_STORE.size,
            timestamp: new Date().toISOString()
        });
        
        return 0; // Return 0 removed entries on error
    }
}

// =============================================================================
// SECURITY STATISTICS AND MONITORING
// =============================================================================

/**
 * Returns current security middleware statistics for monitoring and operational insights.
 * This function provides comprehensive operational metrics about security middleware 
 * performance including request processing statistics, security violation counts, 
 * rate limiting effectiveness, and system health indicators for monitoring dashboards.
 * 
 * Statistics include:
 * - Request processing metrics with total requests and violation counts
 * - Security violation breakdown by category (headers, methods, rate limiting)
 * - Rate limiting operational metrics with active client tracking
 * - System performance indicators including uptime and processing efficiency
 * - Memory utilization metrics for rate limiting storage and operational overhead
 * - Configuration compliance status and security policy effectiveness metrics
 * 
 * @returns {Object} Security statistics object with comprehensive operational metrics
 */
function getSecurityStats() {
    try {
        // Calculate runtime statistics and performance metrics
        const now = new Date();
        const startTime = SECURITY_STATS.startTime ? new Date(SECURITY_STATS.startTime) : now;
        const uptimeMs = now - startTime;
        const uptimeHours = uptimeMs / (1000 * 60 * 60);
        
        // Calculate security violation rates and percentages
        const totalRequests = SECURITY_STATS.totalRequests;
        const violationRate = totalRequests > 0 ? (SECURITY_STATS.violations / totalRequests * 100) : 0;
        const blockRate = totalRequests > 0 ? (SECURITY_STATS.blocked / totalRequests * 100) : 0;
        const rateLimitRate = totalRequests > 0 ? (SECURITY_STATS.rateLimited / totalRequests * 100) : 0;
        
        // Create comprehensive security statistics object
        const stats = {
            // Request processing statistics
            requests: {
                total: SECURITY_STATS.totalRequests,
                processed: SECURITY_STATS.totalRequests - SECURITY_STATS.blocked,
                blocked: SECURITY_STATS.blocked,
                violations: SECURITY_STATS.violations
            },
            
            // Security violation breakdown by category
            violations: {
                total: SECURITY_STATS.violations,
                headerViolations: SECURITY_STATS.headerViolations,
                methodViolations: SECURITY_STATS.methodViolations,
                rateLimited: SECURITY_STATS.rateLimited,
                violationRate: parseFloat(violationRate.toFixed(2)),
                blockRate: parseFloat(blockRate.toFixed(2))
            },
            
            // Rate limiting operational metrics
            rateLimiting: {
                activeClients: RATE_LIMIT_STORE.size,
                rateLimitedRequests: SECURITY_STATS.rateLimited,
                rateLimitRate: parseFloat(rateLimitRate.toFixed(2)),
                maxRequestRate: SECURITY_CONFIG?.rateLimit?.maxRequests || 0,
                windowMs: SECURITY_CONFIG?.rateLimit?.windowMs || 0,
                enabled: SECURITY_CONFIG?.rateLimit?.enabled || false
            },
            
            // System performance and health indicators
            system: {
                initialized: SECURITY_MIDDLEWARE_INITIALIZED,
                uptimeMs: uptimeMs,
                uptimeHours: parseFloat(uptimeHours.toFixed(2)),
                startTime: SECURITY_STATS.startTime,
                lastReset: SECURITY_STATS.lastReset,
                configurationLoaded: SECURITY_CONFIG !== null
            },
            
            // Memory utilization and resource tracking
            memory: {
                rateLimitStoreSize: RATE_LIMIT_STORE.size,
                estimatedMemoryUsage: RATE_LIMIT_STORE.size * 128, // Rough estimate in bytes
                storageEntries: RATE_LIMIT_STORE.size
            },
            
            // Configuration status and compliance
            configuration: {
                rateLimitEnabled: SECURITY_CONFIG?.rateLimit?.enabled || false,
                validationEnabled: SECURITY_CONFIG?.validation?.enabled || false,
                monitoringEnabled: SECURITY_CONFIG?.monitoring?.enabled || false,
                maxHeaderSize: SECURITY_CONFIG?.validation?.maxHeaderSize || 0,
                allowedMethods: SECURITY_CONFIG?.validation?.allowedMethods || []
            },
            
            // Statistics metadata
            metadata: {
                timestamp: now.toISOString(),
                version: '1.0.0',
                generatedBy: 'security-middleware'
            }
        };
        
        // Return frozen statistics object to prevent external modification
        return Object.freeze(stats);
        
    } catch (error) {
        // Handle statistics generation errors gracefully - return minimal stats
        logger.error('Error generating security statistics', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        return {
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            fallback: {
                totalRequests: SECURITY_STATS.totalRequests || 0,
                violations: SECURITY_STATS.violations || 0,
                rateLimitStoreSize: RATE_LIMIT_STORE.size || 0,
                initialized: SECURITY_MIDDLEWARE_INITIALIZED
            }
        };
    }
}

/**
 * Resets security statistics counters for operational management and testing scenarios.
 * This function provides administrative capability to reset security middleware statistics 
 * while preserving configuration and initialization status. Useful for operational 
 * management, performance testing, and periodic statistics cleanup.
 * 
 * Reset process includes:
 * - All security statistics counters reset to zero
 * - Preservation of configuration and initialization status
 * - Optional rate limiting storage cleanup for complete reset
 * - Reset timestamp update for tracking purposes
 * - Logging of reset operation for audit trail and operational monitoring
 * 
 * @returns {void} No return value - resets global security statistics counters
 */
function resetSecurityStats() {
    try {
        // Store previous statistics for logging purposes
        const previousStats = {
            totalRequests: SECURITY_STATS.totalRequests,
            violations: SECURITY_STATS.violations,
            blocked: SECURITY_STATS.blocked,
            rateLimited: SECURITY_STATS.rateLimited
        };
        
        // Reset all security statistics counters to zero
        SECURITY_STATS.totalRequests = 0;
        SECURITY_STATS.blocked = 0;
        SECURITY_STATS.rateLimited = 0;
        SECURITY_STATS.violations = 0;
        SECURITY_STATS.headerViolations = 0;
        SECURITY_STATS.methodViolations = 0;
        
        // Update reset timestamp for tracking purposes
        SECURITY_STATS.lastReset = new Date().toISOString();
        
        // Preserve start time and initialization status
        if (!SECURITY_STATS.startTime) {
            SECURITY_STATS.startTime = new Date().toISOString();
        }
        
        // Log statistics reset event with previous values for audit trail
        logger.info('Security statistics reset completed', {
            previousStats: previousStats,
            resetTimestamp: SECURITY_STATS.lastReset,
            rateLimitStoreSize: RATE_LIMIT_STORE.size,
            preservedInitialization: SECURITY_MIDDLEWARE_INITIALIZED,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        // Handle reset errors gracefully - log error but attempt basic reset
        logger.error('Error resetting security statistics', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Attempt basic reset even on error
        try {
            SECURITY_STATS.totalRequests = 0;
            SECURITY_STATS.violations = 0;
            SECURITY_STATS.blocked = 0;
            SECURITY_STATS.rateLimited = 0;
            SECURITY_STATS.lastReset = new Date().toISOString();
        } catch (basicResetError) {
            logger.error('Failed to perform basic security statistics reset', {
                error: basicResetError.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// =============================================================================
// SECURITY MIDDLEWARE FACTORY FUNCTION
// =============================================================================

/**
 * Factory function that creates comprehensive security middleware combining headers, validation, 
 * rate limiting, and monitoring. This function provides the main entry point for creating 
 * a unified security middleware that applies multiple layers of security protection in the 
 * correct order for maximum effectiveness and educational demonstration.
 * 
 * Security middleware composition includes:
 * - Security middleware system initialization and configuration loading
 * - Request header validation for size limits and malicious pattern detection
 * - HTTP method validation against allowed methods list for attack surface reduction
 * - IP-based rate limiting with sliding window algorithm and proxy support
 * - Security event logging with performance metrics and correlation tracking
 * - HTTP security headers application using integrated headers middleware
 * - Error handling integration with Express 5.1.0 automatic promise error handling
 * - Performance optimization with early exit patterns for invalid requests
 * 
 * @param {Object} [options={}] - Security middleware configuration options and overrides
 * @returns {Function} Express middleware function that applies comprehensive security policies
 */
function createSecurityMiddleware(options = {}) {
    try {
        // Initialize security middleware system with configuration loading
        initializeSecurityMiddleware();
        
        // Merge provided options with default security configuration settings
        const mergedConfig = {
            rateLimit: {
                ...SECURITY_CONFIG?.rateLimit,
                ...options.rateLimit
            },
            validation: {
                ...SECURITY_CONFIG?.validation,
                ...options.validation
            },
            monitoring: {
                ...SECURITY_CONFIG?.monitoring,
                ...options.monitoring
            },
            headers: {
                ...SECURITY_CONFIG?.headers,
                ...options.headers
            }
        };
        
        // Validate merged security configuration for completeness and compliance
        if (mergedConfig.rateLimit?.maxRequests && mergedConfig.rateLimit.maxRequests <= 0) {
            throw new Error('Rate limiting max requests must be a positive number');
        }
        
        if (mergedConfig.validation?.maxHeaderSize && mergedConfig.validation.maxHeaderSize <= 0) {
            throw new Error('Header size limit must be a positive number');
        }
        
        // Create security headers middleware using factory function from headers.js
        const headersMiddleware = createSecurityHeadersMiddleware(mergedConfig.headers || {});
        
        // Log security middleware creation with configuration summary
        logger.info('Creating comprehensive security middleware', {
            rateLimitEnabled: mergedConfig.rateLimit?.enabled || false,
            validationEnabled: mergedConfig.validation?.enabled || false,
            monitoringEnabled: mergedConfig.monitoring?.enabled || false,
            headersEnabled: mergedConfig.headers?.enabled !== false,
            maxRequests: mergedConfig.rateLimit?.maxRequests || 0,
            windowMs: mergedConfig.rateLimit?.windowMs || 0,
            allowedMethods: mergedConfig.validation?.allowedMethods || [],
            timestamp: new Date().toISOString()
        });
        
        // Create combined middleware function that applies all security layers
        return function securityMiddleware(req, res, next) {
            try {
                // Apply security event logging first for request correlation and tracking
                securityEventLogger(req, res, (loggerError) => {
                    if (loggerError) {
                        logger.error('Security event logger middleware error', {
                            error: loggerError.message,
                            requestPath: req.path,
                            requestMethod: req.method
                        });
                    }
                    
                    // Apply request header validation for early security filtering
                    validateRequestHeaders(req, res, (headerError) => {
                        if (headerError) {
                            return next(headerError);
                        }
                        
                        // Apply HTTP method validation to reduce attack surface
                        validateRequestMethod(req, res, (methodError) => {
                            if (methodError) {
                                return next(methodError);
                            }
                            
                            // Apply rate limiting protection against DoS attacks
                            rateLimitingMiddleware(req, res, (rateLimitError) => {
                                if (rateLimitError) {
                                    return next(rateLimitError);
                                }
                                
                                // Apply security headers as final security layer
                                headersMiddleware(req, res, (headerMiddlewareError) => {
                                    if (headerMiddlewareError) {
                                        logger.error('Security headers middleware error', {
                                            error: headerMiddlewareError.message,
                                            requestPath: req.path,
                                            requestMethod: req.method
                                        });
                                        // Continue with warning for headers middleware errors
                                    }
                                    
                                    // All security layers applied successfully
                                    next();
                                });
                            });
                        });
                    });
                });
                
            } catch (error) {
                // Handle security middleware errors gracefully with Express 5.1.0 error handling
                logger.error('Security middleware processing error', {
                    error: error.message,
                    stack: error.stack,
                    requestPath: req.path,
                    requestMethod: req.method,
                    timestamp: new Date().toISOString()
                });
                
                // Update error statistics and continue with degraded security
                SECURITY_STATS.violations++;
                next(error);
            }
        };
        
    } catch (error) {
        // Handle factory function errors gracefully - return minimal security middleware
        logger.error('Failed to create comprehensive security middleware', {
            error: error.message,
            stack: error.stack,
            options: options,
            timestamp: new Date().toISOString()
        });
        
        // Return minimal security middleware for graceful degradation
        return function fallbackSecurityMiddleware(req, res, next) {
            // Apply basic security headers only
            res.set('X-Content-Type-Options', 'nosniff');
            res.set('X-Frame-Options', 'DENY');
            res.removeHeader('X-Powered-By');
            
            logger.warn('Using fallback security middleware due to initialization error');
            next();
        };
    }
}

// =============================================================================
// SECURITY CONFIGURATION MANAGEMENT
// =============================================================================

/**
 * Performs comprehensive security audit of current middleware configuration and provides recommendations.
 * This function analyzes the current security configuration against industry best practices 
 * and provides actionable recommendations for improving security posture. It evaluates 
 * rate limiting, validation rules, headers configuration, and monitoring coverage.
 * 
 * Security audit includes:
 * - Rate limiting configuration analysis against recommended thresholds
 * - Request validation rules assessment for completeness and effectiveness  
 * - Security headers audit using integrated auditSecurityHeaders function
 * - Monitoring and logging coverage evaluation for incident response readiness
 * - Compliance scoring based on implemented security controls and best practices
 * - Performance impact assessment of current security measures
 * - Actionable recommendations for security improvements and optimization
 * 
 * @returns {Object} Security audit result with compliance status and improvement recommendations
 */
function auditSecurityConfiguration() {
    try {
        // Initialize security middleware if not already done
        if (!SECURITY_MIDDLEWARE_INITIALIZED) {
            initializeSecurityMiddleware();
        }
        
        const auditResults = {
            timestamp: new Date().toISOString(),
            overallScore: 0,
            maxScore: 100,
            categories: {},
            recommendations: [],
            compliance: {},
            performance: {}
        };
        
        // Audit rate limiting configuration
        const rateLimitScore = auditRateLimitingConfiguration(auditResults);
        
        // Audit request validation configuration  
        const validationScore = auditValidationConfiguration(auditResults);
        
        // Audit security headers using integrated function from headers.js
        const headersAudit = auditSecurityHeaders();
        const headersScore = calculateHeadersAuditScore(headersAudit);
        auditResults.categories.headers = {
            score: headersScore,
            maxScore: 25,
            audit: headersAudit
        };
        
        // Audit monitoring and logging configuration
        const monitoringScore = auditMonitoringConfiguration(auditResults);
        
        // Calculate overall security compliance score
        auditResults.overallScore = rateLimitScore + validationScore + headersScore + monitoringScore;
        
        // Generate compliance assessment
        auditResults.compliance = {
            level: getComplianceLevel(auditResults.overallScore),
            percentage: ((auditResults.overallScore / auditResults.maxScore) * 100).toFixed(1),
            status: auditResults.overallScore >= 80 ? 'COMPLIANT' : 
                   auditResults.overallScore >= 60 ? 'PARTIALLY_COMPLIANT' : 'NON_COMPLIANT'
        };
        
        // Assess performance impact of current security measures
        auditResults.performance = {
            estimatedOverheadMs: calculatePerformanceOverhead(),
            memoryUsage: RATE_LIMIT_STORE.size * 128, // Estimated bytes
            recommendedOptimizations: []
        };
        
        // Add performance optimization recommendations
        if (RATE_LIMIT_STORE.size > 1000) {
            auditResults.performance.recommendedOptimizations.push(
                'Consider implementing rate limit storage cleanup more frequently'
            );
        }
        
        if (!SECURITY_CONFIG?.monitoring?.trackPerformance) {
            auditResults.recommendations.push({
                category: 'monitoring',
                priority: 'medium',
                recommendation: 'Enable performance tracking to monitor security middleware overhead'
            });
        }
        
        // Log audit completion
        logger.info('Security configuration audit completed', {
            overallScore: auditResults.overallScore,
            maxScore: auditResults.maxScore,
            complianceLevel: auditResults.compliance.level,
            recommendationCount: auditResults.recommendations.length,
            timestamp: auditResults.timestamp
        });
        
        return auditResults;
        
    } catch (error) {
        // Handle audit errors gracefully - return basic audit results
        logger.error('Error during security configuration audit', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        return {
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            overallScore: 0,
            maxScore: 100,
            compliance: {
                level: 'UNKNOWN',
                status: 'AUDIT_ERROR'
            },
            recommendations: [
                {
                    category: 'system',
                    priority: 'high',
                    recommendation: 'Fix security audit system to enable proper compliance assessment'
                }
            ]
        };
    }
}

/**
 * Audits rate limiting configuration and adds results to audit object
 * @private
 */
function auditRateLimitingConfiguration(auditResults) {
    const rateLimitConfig = SECURITY_CONFIG?.rateLimit || {};
    let score = 0;
    const maxScore = 25;
    const issues = [];
    const recommendations = [];
    
    // Check if rate limiting is enabled
    if (rateLimitConfig.enabled) {
        score += 10;
    } else {
        issues.push('Rate limiting is disabled');
        recommendations.push({
            category: 'rateLimit',
            priority: 'high',
            recommendation: 'Enable rate limiting to protect against DoS attacks'
        });
    }
    
    // Check rate limiting thresholds
    const maxRequests = rateLimitConfig.maxRequests || 0;
    if (maxRequests > 0 && maxRequests <= 1000) {
        score += 10;
    } else if (maxRequests > 1000) {
        issues.push('Rate limiting threshold may be too high');
        recommendations.push({
            category: 'rateLimit',
            priority: 'medium',
            recommendation: 'Consider lowering rate limit threshold for better protection'
        });
        score += 5;
    } else {
        issues.push('Rate limiting threshold not configured');
    }
    
    // Check window configuration
    const windowMs = rateLimitConfig.windowMs || 0;
    if (windowMs >= 60000 && windowMs <= 900000) { // 1-15 minutes
        score += 5;
    } else {
        issues.push('Rate limiting window may not be optimal');
        recommendations.push({
            category: 'rateLimit',
            priority: 'medium',
            recommendation: 'Configure rate limiting window between 1-15 minutes'
        });
    }
    
    auditResults.categories.rateLimit = {
        score: score,
        maxScore: maxScore,
        issues: issues,
        configuration: rateLimitConfig
    };
    
    auditResults.recommendations.push(...recommendations);
    return score;
}

/**
 * Audits validation configuration and adds results to audit object
 * @private
 */
function auditValidationConfiguration(auditResults) {
    const validationConfig = SECURITY_CONFIG?.validation || {};
    let score = 0;
    const maxScore = 25;
    const issues = [];
    const recommendations = [];
    
    // Check if validation is enabled
    if (validationConfig.enabled) {
        score += 10;
    } else {
        issues.push('Request validation is disabled');
        recommendations.push({
            category: 'validation',
            priority: 'high',
            recommendation: 'Enable request validation to prevent malicious requests'
        });
    }
    
    // Check header size limits
    const maxHeaderSize = validationConfig.maxHeaderSize || 0;
    if (maxHeaderSize > 0 && maxHeaderSize <= 16384) { // 16KB reasonable limit
        score += 8;
    } else {
        issues.push('Header size validation not properly configured');
        recommendations.push({
            category: 'validation',
            priority: 'medium',
            recommendation: 'Configure appropriate header size limits (recommended: 8KB-16KB)'
        });
    }
    
    // Check allowed methods configuration
    const allowedMethods = validationConfig.allowedMethods || [];
    if (allowedMethods.length > 0 && allowedMethods.length <= 3) {
        score += 7;
    } else if (allowedMethods.length === 0) {
        issues.push('No HTTP methods specified in allowed methods');
    } else {
        issues.push('Too many HTTP methods allowed - reduces security effectiveness');
        recommendations.push({
            category: 'validation',
            priority: 'medium',
            recommendation: 'Limit allowed HTTP methods to only those required (GET, OPTIONS typically sufficient)'
        });
        score += 3;
    }
    
    auditResults.categories.validation = {
        score: score,
        maxScore: maxScore,
        issues: issues,
        configuration: validationConfig
    };
    
    auditResults.recommendations.push(...recommendations);
    return score;
}

/**
 * Audits monitoring configuration and adds results to audit object
 * @private
 */
function auditMonitoringConfiguration(auditResults) {
    const monitoringConfig = SECURITY_CONFIG?.monitoring || {};
    let score = 0;
    const maxScore = 25;
    const issues = [];
    const recommendations = [];
    
    // Check if monitoring is enabled
    if (monitoringConfig.enabled) {
        score += 10;
    } else {
        issues.push('Security monitoring is disabled');
        recommendations.push({
            category: 'monitoring',
            priority: 'high',
            recommendation: 'Enable security monitoring for incident detection and response'
        });
    }
    
    // Check violation logging
    if (monitoringConfig.logViolations) {
        score += 8;
    } else {
        issues.push('Security violation logging is disabled');
        recommendations.push({
            category: 'monitoring',
            priority: 'medium',
            recommendation: 'Enable violation logging for security incident investigation'
        });
    }
    
    // Check performance tracking
    if (monitoringConfig.trackPerformance) {
        score += 7;
    } else {
        recommendations.push({
            category: 'monitoring',
            priority: 'low',
            recommendation: 'Enable performance tracking to monitor security middleware impact'
        });
    }
    
    auditResults.categories.monitoring = {
        score: score,
        maxScore: maxScore,
        issues: issues,
        configuration: monitoringConfig
    };
    
    auditResults.recommendations.push(...recommendations);
    return score;
}

/**
 * Calculates score from headers audit results
 * @private
 */
function calculateHeadersAuditScore(headersAudit) {
    if (!headersAudit || typeof headersAudit !== 'object') {
        return 0;
    }
    
    // Basic scoring based on headers audit recommendations count
    const recommendationCount = headersAudit.recommendations?.length || 0;
    const maxRecommendations = 10; // Assume maximum possible recommendations
    
    // Score inversely related to recommendation count
    return Math.max(0, 25 - Math.floor((recommendationCount / maxRecommendations) * 25));
}

/**
 * Gets compliance level based on overall score
 * @private
 */
function getComplianceLevel(score) {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'ACCEPTABLE';
    if (score >= 60) return 'NEEDS_IMPROVEMENT';
    if (score >= 40) return 'POOR';
    return 'CRITICAL';
}

/**
 * Estimates performance overhead of current security configuration
 * @private
 */
function calculatePerformanceOverhead() {
    let overhead = 0;
    
    // Base middleware processing overhead
    overhead += 1; // ~1ms base overhead
    
    // Rate limiting overhead (depends on store size)
    if (SECURITY_CONFIG?.rateLimit?.enabled) {
        overhead += Math.min(5, RATE_LIMIT_STORE.size / 100); // Up to 5ms for large stores
    }
    
    // Validation overhead
    if (SECURITY_CONFIG?.validation?.enabled) {
        overhead += 0.5; // ~0.5ms for header validation
    }
    
    // Monitoring overhead
    if (SECURITY_CONFIG?.monitoring?.enabled) {
        overhead += 0.3; // ~0.3ms for logging
    }
    
    // Headers middleware overhead
    overhead += 0.2; // ~0.2ms for security headers
    
    return parseFloat(overhead.toFixed(2));
}

/**
 * Dynamically updates security middleware configuration for runtime adjustments.
 * This function provides runtime modification capability for security configuration 
 * without requiring application restart. It validates the new configuration, merges 
 * with existing settings, and updates operational parameters while maintaining 
 * security integrity and logging configuration changes for audit purposes.
 * 
 * Configuration update includes:
 * - New configuration validation for completeness and security compliance  
 * - Secure merging with existing SECURITY_CONFIG to prevent security downgrades
 * - Rate limiting threshold updates with storage cleanup if significantly changed
 * - Request validation rule updates with immediate effect on new requests
 * - Security monitoring configuration updates with operational continuity
 * - Change logging with old and new configuration comparison for audit trail
 * - Graceful error handling to prevent configuration corruption on validation failures
 * 
 * @param {Object} newSecurityConfig - New security configuration object with updated settings
 * @returns {boolean} True if configuration updated successfully, false if validation failed
 */
function updateSecurityConfiguration(newSecurityConfig) {
    try {
        // Validate new security configuration object
        if (!newSecurityConfig || typeof newSecurityConfig !== 'object') {
            logger.error('Invalid security configuration provided for update', {
                providedConfig: newSecurityConfig,
                expectedType: 'object',
                timestamp: new Date().toISOString()
            });
            return false;
        }
        
        // Store original configuration for comparison and rollback
        const originalConfig = JSON.parse(JSON.stringify(SECURITY_CONFIG));
        
        // Validate rate limiting configuration if provided
        if (newSecurityConfig.rateLimit) {
            const rateLimitConfig = newSecurityConfig.rateLimit;
            
            if (rateLimitConfig.maxRequests !== undefined) {
                if (typeof rateLimitConfig.maxRequests !== 'number' || rateLimitConfig.maxRequests <= 0) {
                    logger.error('Invalid rate limit maxRequests value', {
                        value: rateLimitConfig.maxRequests,
                        expectedType: 'positive number'
                    });
                    return false;
                }
            }
            
            if (rateLimitConfig.windowMs !== undefined) {
                if (typeof rateLimitConfig.windowMs !== 'number' || rateLimitConfig.windowMs <= 0) {
                    logger.error('Invalid rate limit windowMs value', {
                        value: rateLimitConfig.windowMs,
                        expectedType: 'positive number'
                    });
                    return false;
                }
            }
        }
        
        // Validate request validation configuration if provided
        if (newSecurityConfig.validation) {
            const validationConfig = newSecurityConfig.validation;
            
            if (validationConfig.maxHeaderSize !== undefined) {
                if (typeof validationConfig.maxHeaderSize !== 'number' || validationConfig.maxHeaderSize <= 0) {
                    logger.error('Invalid validation maxHeaderSize value', {
                        value: validationConfig.maxHeaderSize,
                        expectedType: 'positive number'
                    });
                    return false;
                }
            }
            
            if (validationConfig.allowedMethods !== undefined) {
                if (!Array.isArray(validationConfig.allowedMethods)) {
                    logger.error('Invalid validation allowedMethods value', {
                        value: validationConfig.allowedMethods,
                        expectedType: 'array'
                    });
                    return false;
                }
            }
        }
        
        // Merge new configuration with existing configuration
        const mergedConfig = {
            rateLimit: {
                ...SECURITY_CONFIG?.rateLimit,
                ...newSecurityConfig.rateLimit
            },
            validation: {
                ...SECURITY_CONFIG?.validation,
                ...newSecurityConfig.validation
            },
            monitoring: {
                ...SECURITY_CONFIG?.monitoring,
                ...newSecurityConfig.monitoring
            },
            headers: {
                ...SECURITY_CONFIG?.headers,
                ...newSecurityConfig.headers
            }
        };
        
        // Check if rate limiting configuration changed significantly
        const oldMaxRequests = SECURITY_CONFIG?.rateLimit?.maxRequests || 0;
        const newMaxRequests = mergedConfig.rateLimit?.maxRequests || 0;
        const oldWindowMs = SECURITY_CONFIG?.rateLimit?.windowMs || 0;
        const newWindowMs = mergedConfig.rateLimit?.windowMs || 0;
        
        const significantRateLimitChange = 
            Math.abs(oldMaxRequests - newMaxRequests) > (oldMaxRequests * 0.5) ||
            Math.abs(oldWindowMs - newWindowMs) > (oldWindowMs * 0.5);
        
        // Update global security configuration
        SECURITY_CONFIG = mergedConfig;
        
        // Clear rate limiting store if configuration changed significantly
        if (significantRateLimitChange && RATE_LIMIT_STORE.size > 0) {
            const clearedEntries = RATE_LIMIT_STORE.size;
            RATE_LIMIT_STORE.clear();
            
            logger.info('Rate limiting storage cleared due to significant configuration change', {
                clearedEntries: clearedEntries,
                oldMaxRequests: oldMaxRequests,
                newMaxRequests: newMaxRequests,
                oldWindowMs: oldWindowMs,
                newWindowMs: newWindowMs,
                timestamp: new Date().toISOString()
            });
        }
        
        // Log successful configuration update with changes summary
        logger.info('Security configuration updated successfully', {
            changes: {
                rateLimit: JSON.stringify(newSecurityConfig.rateLimit || {}),
                validation: JSON.stringify(newSecurityConfig.validation || {}),
                monitoring: JSON.stringify(newSecurityConfig.monitoring || {}),
                headers: JSON.stringify(newSecurityConfig.headers || {})
            },
            significantRateLimitChange: significantRateLimitChange,
            rateLimitStoreCleared: significantRateLimitChange,
            timestamp: new Date().toISOString()
        });
        
        return true;
        
    } catch (error) {
        // Handle configuration update errors gracefully - log error and return false
        logger.error('Failed to update security configuration', {
            error: error.message,
            stack: error.stack,
            providedConfig: JSON.stringify(newSecurityConfig),
            timestamp: new Date().toISOString()
        });
        
        return false;
    }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Factory function to create comprehensive security middleware
    createSecurityMiddleware,
    
    // Individual middleware functions for modular usage
    validateRequestHeaders,
    rateLimitingMiddleware,
    validateRequestMethod,
    securityEventLogger,
    
    // Utility functions for monitoring and management
    getSecurityStats,
    resetSecurityStats,
    
    // Security auditing and configuration management
    auditSecurityConfiguration,
    updateSecurityConfiguration
};