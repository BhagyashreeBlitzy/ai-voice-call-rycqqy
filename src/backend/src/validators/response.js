/**
 * Comprehensive HTTP Response Validation Utility for Node.js Tutorial Application
 * 
 * This utility provides enterprise-grade HTTP response validation capabilities for the Node.js tutorial
 * application. Implements comprehensive validation functions for HTTP status codes, headers, content types,
 * and response body formatting while integrating seamlessly with Express.js 5.1.0 middleware patterns.
 * The implementation ensures responses meet API specifications, security requirements, and educational 
 * standards while demonstrating production-ready response validation patterns with tutorial simplicity.
 * 
 * Key Features:
 * - HTTP Response Status Code Validation with standard HTTP status code compliance and endpoint-specific requirements
 * - Response Header Validation with security header enforcement and content-type verification
 * - Response Body Validation with content format validation and sanitization capabilities
 * - Hello Endpoint Specialized Validation for '/hello' route with exact content matching
 * - Health Check Response Validation for health, readiness, and liveness endpoints with structured JSON validation
 * - Express.js 5.1.0 Middleware Integration with automatic response interception and validation
 * - Security Response Validation with information disclosure prevention and security header enforcement
 * - Performance Response Timing Validation with SLA compliance and response time monitoring
 * - Educational Design prioritizing code clarity while demonstrating production validation architectures
 * 
 * Architecture:
 * - Response validation pipeline with configurable validation rules and comprehensive error reporting
 * - Express.js middleware factory for automated response validation with request correlation
 * - Content sanitization engine with security-focused content processing and XSS prevention
 * - Performance monitoring integration with high-resolution timing and SLA validation
 * - Statistical tracking and monitoring with operational insights and validation metrics
 * - Memory-efficient operation with automatic cleanup and resource management
 * 
 * Compatible with:
 * - Express.js 5.1.0 with automatic promise error handling and enhanced middleware support
 * - Node.js 22.11.0 LTS with Active LTS support, improved performance, and security enhancements
 * - Validator.js 13.11.0 for advanced string validation and format checking
 * - Development, production, and test environments with environment-specific validation rules
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Response validation patterns, HTTP specification compliance, and middleware integration
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// Advanced string validation library for response content validation and format checking
const validator = require('validator'); // v13.11.0

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import structured logging functionality for response validation event logging, debugging, and security monitoring
const { 
    logger,
    createRequestLogger,
    startTimer,
    stopTimer
} = require('../utils/logger.js');

// Import configuration factory to access validation settings, security configurations, and environment-specific response validation rules
const { getConfig } = require('../utils/config.js');

// Import HTTP status code constants for response status validation and standardized status code checking
const { 
    HTTP_STATUS,
    CONTENT_TYPES,
    ROUTES,
    ERROR_MESSAGES,
    APPLICATION_METADATA
} = require('../utils/constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached validation configuration from environment settings
 * Prevents repeated configuration loading and improves response validation performance
 * @type {Object|null}
 */
let VALIDATION_CONFIG = null;

/**
 * Response validation statistics tracking for monitoring and operational insights
 * Tracks validation performance, success rates, and error patterns
 * @type {Object}
 */
let RESPONSE_VALIDATION_STATS = {
    total: 0,
    passed: 0,
    failed: 0,
    by_endpoint: {},
    by_status_code: {},
    by_content_type: {},
    performance_metrics: {
        average_validation_time: 0,
        slowest_validation: 0,
        fastest_validation: Infinity
    },
    security_violations: 0,
    sanitization_count: 0,
    timing_violations: 0
};

/**
 * Allowed HTTP status codes for tutorial endpoints based on application requirements
 * Restricts response status codes to educational and functional requirements
 * @type {Array<number>}
 */
const VALID_STATUS_CODES = [
    HTTP_STATUS.OK,                    // 200 - Success responses
    HTTP_STATUS.BAD_REQUEST,           // 400 - Client errors
    HTTP_STATUS.NOT_FOUND,             // 404 - Resource not found
    HTTP_STATUS.METHOD_NOT_ALLOWED,    // 405 - Method not allowed
    HTTP_STATUS.INTERNAL_SERVER_ERROR, // 500 - Server errors
    HTTP_STATUS.SERVICE_UNAVAILABLE    // 503 - Service unavailable
];

/**
 * Endpoint-specific response validation specifications with content and format requirements
 * Defines validation rules for each supported endpoint in the tutorial application
 * @type {Object}
 */
let ENDPOINT_RESPONSE_SPECS = {};

// =============================================================================
// RESPONSE VALIDATOR INITIALIZATION
// =============================================================================

/**
 * Initializes the response validation system by loading configuration and setting up endpoint-specific validation rules.
 * This function loads validation configuration using getConfig(), caches it in VALIDATION_CONFIG, initializes
 * RESPONSE_VALIDATION_STATS tracking object, configures VALID_STATUS_CODES array, sets up ENDPOINT_RESPONSE_SPECS
 * with endpoint-specific validation rules, and establishes response validation rule enforcement.
 * 
 * The initialization process includes:
 * - Configuration loading with error handling and fallback to default validation settings
 * - Statistics tracking initialization with performance metrics and validation counters
 * - Endpoint specification setup for /hello, /health, /readyz, and /livez endpoints
 * - Status code validation rules based on tutorial application HTTP requirements
 * - Security validation configuration with content sanitization and header enforcement
 * - Performance validation thresholds with SLA compliance monitoring
 * 
 * This function implements graceful degradation - if configuration loading fails,
 * it continues operation with safe default validation rules to ensure response validation succeeds.
 * 
 * @returns {void} No return value - initializes global response validation state and configuration
 */
function initializeResponseValidator() {
    try {
        // Load validation configuration using getConfig() and cache in VALIDATION_CONFIG for performance
        const config = getConfig();
        VALIDATION_CONFIG = config.validation || {};
        
        // Initialize response validation statistics tracking for monitoring and operational insights
        RESPONSE_VALIDATION_STATS = {
            total: 0,
            passed: 0,
            failed: 0,
            by_endpoint: {},
            by_status_code: {},
            by_content_type: {},
            performance_metrics: {
                average_validation_time: 0,
                slowest_validation: 0,
                fastest_validation: Infinity,
                total_validation_time: 0
            },
            security_violations: 0,
            sanitization_count: 0,
            timing_violations: 0,
            initialization_timestamp: new Date().toISOString()
        };
        
        // Configure endpoint-specific response validation specifications with content and format requirements
        ENDPOINT_RESPONSE_SPECS = {
            // Hello endpoint response specification - text/plain with "Hello world" content
            [ROUTES.HELLO]: {
                expectedStatusCodes: [HTTP_STATUS.OK],
                expectedContentType: CONTENT_TYPES.TEXT_PLAIN,
                expectedContent: 'Hello world',
                contentValidation: 'exact_match',
                securityHeaders: ['X-Content-Type-Options'],
                maxResponseTime: 50, // milliseconds
                contentLength: {
                    min: 11,
                    max: 11
                },
                encoding: 'utf-8',
                sanitization: {
                    required: false,
                    allowHtml: false,
                    allowScripts: false
                }
            },
            
            // General health check endpoint specification - application/json with status object
            [ROUTES.HEALTH]: {
                expectedStatusCodes: [HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE],
                expectedContentType: CONTENT_TYPES.APPLICATION_JSON,
                expectedContent: null,
                contentValidation: 'json_structure',
                requiredFields: ['status', 'timestamp'],
                securityHeaders: ['X-Content-Type-Options', 'Cache-Control'],
                maxResponseTime: 10, // milliseconds
                contentLength: {
                    min: 30,
                    max: 500
                },
                encoding: 'utf-8',
                sanitization: {
                    required: true,
                    allowHtml: false,
                    allowScripts: false
                }
            },
            
            // Kubernetes readiness probe endpoint specification
            [ROUTES.READINESS]: {
                expectedStatusCodes: [HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE],
                expectedContentType: CONTENT_TYPES.APPLICATION_JSON,
                expectedContent: null,
                contentValidation: 'json_structure',
                requiredFields: ['status'],
                securityHeaders: ['X-Content-Type-Options'],
                maxResponseTime: 10, // milliseconds
                contentLength: {
                    min: 15,
                    max: 200
                },
                encoding: 'utf-8',
                sanitization: {
                    required: true,
                    allowHtml: false,
                    allowScripts: false
                }
            },
            
            // Kubernetes liveness probe endpoint specification
            [ROUTES.LIVENESS]: {
                expectedStatusCodes: [HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE],
                expectedContentType: CONTENT_TYPES.APPLICATION_JSON,
                expectedContent: null,
                contentValidation: 'json_structure',
                requiredFields: ['status'],
                securityHeaders: ['X-Content-Type-Options'],
                maxResponseTime: 10, // milliseconds
                contentLength: {
                    min: 15,
                    max: 200
                },
                encoding: 'utf-8',
                sanitization: {
                    required: false,
                    allowHtml: false,
                    allowScripts: false
                }
            }
        };
        
        // Log response validator initialization with configuration summary and endpoint specifications
        logger.info('Response validator initialized successfully', {
            component: 'ResponseValidator',
            endpointsConfigured: Object.keys(ENDPOINT_RESPONSE_SPECS).length,
            validStatusCodes: VALID_STATUS_CODES,
            validationConfig: {
                securityValidation: VALIDATION_CONFIG.security_validation !== false,
                performanceValidation: VALIDATION_CONFIG.performance_validation !== false,
                contentSanitization: VALIDATION_CONFIG.content_sanitization !== false,
                headerValidation: VALIDATION_CONFIG.header_validation !== false
            },
            endpoints: Object.keys(ENDPOINT_RESPONSE_SPECS),
            initializationTimestamp: new Date().toISOString()
        });
        
    } catch (error) {
        // Handle initialization errors gracefully - continue with basic validation using safe defaults
        logger.error('Failed to initialize response validator, using default configuration', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            phase: 'initialization'
        });
        
        // Set safe fallback values for continued operation without configuration
        VALIDATION_CONFIG = {
            security_validation: true,
            performance_validation: true,
            content_sanitization: true,
            header_validation: true,
            strict_mode: false
        };
        
        // Initialize basic endpoint specifications for minimal functionality
        ENDPOINT_RESPONSE_SPECS = {
            [ROUTES.HELLO]: {
                expectedStatusCodes: [HTTP_STATUS.OK],
                expectedContentType: CONTENT_TYPES.TEXT_PLAIN,
                expectedContent: 'Hello world',
                maxResponseTime: 100
            }
        };
        
        // Ensure statistics tracking is initialized even in error case
        RESPONSE_VALIDATION_STATS = {
            total: 0,
            passed: 0,
            failed: 0,
            by_endpoint: {},
            by_status_code: {},
            by_content_type: {},
            performance_metrics: {
                average_validation_time: 0,
                slowest_validation: 0,
                fastest_validation: Infinity,
                total_validation_time: 0
            },
            security_violations: 0,
            sanitization_count: 0,
            timing_violations: 0,
            initialization_error: error.message,
            initialization_timestamp: new Date().toISOString()
        };
    }
}

// =============================================================================
// CORE RESPONSE VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates HTTP response status code against allowed status codes and endpoint-specific requirements.
 * This function checks if statusCode parameter is provided and is a valid number, validates statusCode
 * against VALID_STATUS_CODES array, checks endpoint-specific status code requirements, validates
 * status code against expected codes for specific endpoints, and creates comprehensive validation result.
 * 
 * The validation process includes:
 * - Status code type and value validation with numeric range checking
 * - VALID_STATUS_CODES array comparison for allowed status code enforcement
 * - Endpoint-specific status code requirement checking using ENDPOINT_RESPONSE_SPECS
 * - Hello endpoint validation requiring 200 OK for successful responses
 * - Health endpoint validation supporting 200 OK or 503 Service Unavailable
 * - Comprehensive validation result generation with detailed status information
 * 
 * @param {number} statusCode - HTTP status code to validate against allowed codes and endpoint requirements
 * @param {string} endpoint - Endpoint path for endpoint-specific validation rules application
 * @param {Object} context - Request context object containing additional validation information
 * @returns {Object} Status validation result with isValid boolean, validation details, and error information
 */
function validateResponseStatus(statusCode, endpoint, context = {}) {
    // Start performance timer for status validation measurement
    const validationStartTime = Date.now();
    
    try {
        // Initialize validation result object with comprehensive status information
        const validationResult = {
            isValid: false,
            validationType: 'status_code',
            endpoint: endpoint,
            statusCode: statusCode,
            errors: [],
            warnings: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                context: context
            }
        };

        // Check if statusCode parameter is provided and is a valid number
        if (statusCode === undefined || statusCode === null) {
            validationResult.errors.push({
                code: 'MISSING_STATUS_CODE',
                message: 'Status code is required for response validation',
                severity: 'error'
            });
            return validationResult;
        }

        if (typeof statusCode !== 'number' || isNaN(statusCode)) {
            validationResult.errors.push({
                code: 'INVALID_STATUS_CODE_TYPE',
                message: 'Status code must be a valid number',
                actualType: typeof statusCode,
                actualValue: statusCode,
                severity: 'error'
            });
            return validationResult;
        }

        // Validate statusCode against VALID_STATUS_CODES array for basic validation
        if (!VALID_STATUS_CODES.includes(statusCode)) {
            validationResult.errors.push({
                code: 'UNAUTHORIZED_STATUS_CODE',
                message: `Status code ${statusCode} is not allowed in tutorial application`,
                statusCode: statusCode,
                allowedCodes: VALID_STATUS_CODES,
                severity: 'error'
            });
            return validationResult;
        }

        // Check endpoint-specific status code requirements from ENDPOINT_RESPONSE_SPECS
        const endpointSpec = ENDPOINT_RESPONSE_SPECS[endpoint];
        if (endpointSpec && endpointSpec.expectedStatusCodes) {
            if (!endpointSpec.expectedStatusCodes.includes(statusCode)) {
                validationResult.errors.push({
                    code: 'ENDPOINT_STATUS_MISMATCH',
                    message: `Status code ${statusCode} not expected for endpoint ${endpoint}`,
                    statusCode: statusCode,
                    endpoint: endpoint,
                    expectedCodes: endpointSpec.expectedStatusCodes,
                    severity: 'error'
                });
                return validationResult;
            }
        }

        // Validate endpoint-specific status code requirements with detailed checking
        if (endpoint === ROUTES.HELLO) {
            // For hello endpoint, validate 200 OK for successful responses
            if (statusCode !== HTTP_STATUS.OK) {
                validationResult.warnings.push({
                    code: 'HELLO_STATUS_WARNING',
                    message: 'Hello endpoint typically returns 200 OK status',
                    statusCode: statusCode,
                    expectedStatus: HTTP_STATUS.OK,
                    severity: 'warning'
                });
            }
        } else if ([ROUTES.HEALTH, ROUTES.READINESS, ROUTES.LIVENESS].includes(endpoint)) {
            // For health endpoints, validate 200 OK or 503 Service Unavailable
            const healthStatuses = [HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE];
            if (!healthStatuses.includes(statusCode)) {
                validationResult.errors.push({
                    code: 'HEALTH_STATUS_INVALID',
                    message: 'Health endpoints should return 200 OK or 503 Service Unavailable',
                    statusCode: statusCode,
                    endpoint: endpoint,
                    expectedStatuses: healthStatuses,
                    severity: 'error'
                });
                return validationResult;
            }
        }

        // Set validation success if no errors were found
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add validation success metadata
        if (validationResult.isValid) {
            validationResult.metadata.statusValidation = {
                passed: true,
                statusCode: statusCode,
                endpoint: endpoint,
                validationRulesApplied: [
                    'type_validation',
                    'allowed_codes_validation',
                    endpointSpec ? 'endpoint_specific_validation' : null
                ].filter(Boolean)
            };
        }

        // Update RESPONSE_VALIDATION_STATS with status code validation attempt
        RESPONSE_VALIDATION_STATS.total += 1;
        if (validationResult.isValid) {
            RESPONSE_VALIDATION_STATS.passed += 1;
        } else {
            RESPONSE_VALIDATION_STATS.failed += 1;
        }

        // Update status code statistics tracking
        if (!RESPONSE_VALIDATION_STATS.by_status_code[statusCode]) {
            RESPONSE_VALIDATION_STATS.by_status_code[statusCode] = 0;
        }
        RESPONSE_VALIDATION_STATS.by_status_code[statusCode] += 1;

        // Update endpoint-specific statistics
        if (endpoint) {
            if (!RESPONSE_VALIDATION_STATS.by_endpoint[endpoint]) {
                RESPONSE_VALIDATION_STATS.by_endpoint[endpoint] = { total: 0, passed: 0, failed: 0 };
            }
            RESPONSE_VALIDATION_STATS.by_endpoint[endpoint].total += 1;
            if (validationResult.isValid) {
                RESPONSE_VALIDATION_STATS.by_endpoint[endpoint].passed += 1;
            } else {
                RESPONSE_VALIDATION_STATS.by_endpoint[endpoint].failed += 1;
            }
        }

        // Calculate validation performance time and update metrics
        const validationTime = Date.now() - validationStartTime;
        RESPONSE_VALIDATION_STATS.performance_metrics.total_validation_time += validationTime;
        RESPONSE_VALIDATION_STATS.performance_metrics.average_validation_time = 
            RESPONSE_VALIDATION_STATS.performance_metrics.total_validation_time / RESPONSE_VALIDATION_STATS.total;
        
        if (validationTime > RESPONSE_VALIDATION_STATS.performance_metrics.slowest_validation) {
            RESPONSE_VALIDATION_STATS.performance_metrics.slowest_validation = validationTime;
        }
        if (validationTime < RESPONSE_VALIDATION_STATS.performance_metrics.fastest_validation) {
            RESPONSE_VALIDATION_STATS.performance_metrics.fastest_validation = validationTime;
        }

        // Log validation result if debug logging enabled for development troubleshooting
        if (context.correlationId) {
            logger.debug('Response status validation completed', {
                component: 'ResponseValidator',
                validationType: 'status_code',
                endpoint: endpoint,
                statusCode: statusCode,
                isValid: validationResult.isValid,
                errorCount: validationResult.errors.length,
                warningCount: validationResult.warnings.length,
                validationTime: validationTime,
                correlationId: context.correlationId
            });
        }

        // Return comprehensive status code validation result object
        return validationResult;

    } catch (error) {
        // Handle status validation errors gracefully with detailed error information
        logger.error('Status code validation failed with exception', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            statusCode: statusCode,
            endpoint: endpoint,
            context: context
        });

        // Return error validation result for exception handling
        return {
            isValid: false,
            validationType: 'status_code',
            endpoint: endpoint,
            statusCode: statusCode,
            errors: [{
                code: 'VALIDATION_EXCEPTION',
                message: 'Status code validation failed due to internal error',
                error: error.message,
                severity: 'error'
            }],
            warnings: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                validationError: true,
                context: context
            }
        };
    }
}

/**
 * Validates HTTP response headers for proper format, required headers, and security headers.
 * This function checks if headers object is provided and properly formatted, validates Content-Type
 * header against expected content types for endpoint, checks for required security headers,
 * validates header values for proper format and security compliance, and creates comprehensive validation result.
 * 
 * The validation process includes:
 * - Headers object structure validation with type checking and null safety
 * - Content-Type header validation against endpoint-specific requirements
 * - Security header presence validation (X-Content-Type-Options, Cache-Control)
 * - Header value format validation and security compliance checking
 * - Information disclosure prevention in header values
 * - Custom header validation and dangerous header removal
 * 
 * @param {Object} headers - HTTP response headers object to validate for format and security compliance
 * @param {string} endpoint - Endpoint path for endpoint-specific header requirements
 * @param {Object} options - Validation options object containing security settings and validation rules
 * @returns {Object} Header validation result with validation status, corrected headers, and detailed errors
 */
function validateResponseHeaders(headers, endpoint, options = {}) {
    // Start performance timer for header validation measurement
    const validationStartTime = Date.now();
    
    try {
        // Initialize validation result object with comprehensive header information
        const validationResult = {
            isValid: false,
            validationType: 'response_headers',
            endpoint: endpoint,
            headers: headers,
            correctedHeaders: {},
            errors: [],
            warnings: [],
            securityIssues: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                options: options
            }
        };

        // Check if headers object is provided and properly formatted
        if (!headers || typeof headers !== 'object') {
            validationResult.errors.push({
                code: 'INVALID_HEADERS_OBJECT',
                message: 'Headers must be a valid object',
                actualType: typeof headers,
                actualValue: headers,
                severity: 'error'
            });
            return validationResult;
        }

        // Create corrected headers object for security and format corrections
        validationResult.correctedHeaders = { ...headers };

        // Validate Content-Type header against expected content types for endpoint
        const endpointSpec = ENDPOINT_RESPONSE_SPECS[endpoint];
        if (endpointSpec && endpointSpec.expectedContentType) {
            const contentType = headers['content-type'] || headers['Content-Type'];
            
            if (!contentType) {
                validationResult.errors.push({
                    code: 'MISSING_CONTENT_TYPE',
                    message: `Content-Type header is required for endpoint ${endpoint}`,
                    endpoint: endpoint,
                    expectedContentType: endpointSpec.expectedContentType,
                    severity: 'error'
                });
            } else {
                // Normalize content type for comparison (handle charset parameters)
                const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();
                const expectedContentType = endpointSpec.expectedContentType.split(';')[0].trim().toLowerCase();
                
                if (normalizedContentType !== expectedContentType) {
                    validationResult.errors.push({
                        code: 'CONTENT_TYPE_MISMATCH',
                        message: `Content-Type mismatch for endpoint ${endpoint}`,
                        actualContentType: contentType,
                        expectedContentType: endpointSpec.expectedContentType,
                        endpoint: endpoint,
                        severity: 'error'
                    });
                }
            }
        }

        // Check for required security headers (X-Content-Type-Options, etc.)
        const requiredSecurityHeaders = ['X-Content-Type-Options'];
        
        // Add additional security headers based on endpoint specification
        if (endpointSpec && endpointSpec.securityHeaders) {
            requiredSecurityHeaders.push(...endpointSpec.securityHeaders.filter(h => !requiredSecurityHeaders.includes(h)));
        }

        requiredSecurityHeaders.forEach(headerName => {
            const headerValue = headers[headerName] || headers[headerName.toLowerCase()];
            
            if (!headerValue) {
                validationResult.warnings.push({
                    code: 'MISSING_SECURITY_HEADER',
                    message: `Security header ${headerName} is recommended`,
                    headerName: headerName,
                    recommendedValue: headerName === 'X-Content-Type-Options' ? 'nosniff' : 'default_value',
                    severity: 'warning'
                });
                
                // Add missing security headers to corrected headers
                if (headerName === 'X-Content-Type-Options') {
                    validationResult.correctedHeaders[headerName] = 'nosniff';
                }
            } else {
                // Validate security header values
                if (headerName === 'X-Content-Type-Options' && headerValue !== 'nosniff') {
                    validationResult.warnings.push({
                        code: 'INVALID_SECURITY_HEADER_VALUE',
                        message: 'X-Content-Type-Options should be set to "nosniff"',
                        headerName: headerName,
                        actualValue: headerValue,
                        recommendedValue: 'nosniff',
                        severity: 'warning'
                    });
                    
                    // Correct the security header value
                    validationResult.correctedHeaders[headerName] = 'nosniff';
                }
            }
        });

        // Validate header values for proper format and security compliance
        Object.keys(headers).forEach(headerName => {
            const headerValue = headers[headerName];
            
            // Check for information disclosure in header values
            if (typeof headerValue === 'string') {
                // Check for potentially dangerous information disclosure
                const dangerousPatterns = [
                    /version\s*[:\=]\s*[\d\.]+/i,
                    /server\s*[:\=]\s*[^\s]+/i,
                    /powered.by/i,
                    /php\/[\d\.]+/i,
                    /apache\/[\d\.]+/i,
                    /nginx\/[\d\.]+/i
                ];
                
                dangerousPatterns.forEach(pattern => {
                    if (pattern.test(headerValue)) {
                        validationResult.securityIssues.push({
                            code: 'INFORMATION_DISCLOSURE',
                            message: `Header ${headerName} may disclose version information`,
                            headerName: headerName,
                            headerValue: headerValue,
                            pattern: pattern.toString(),
                            severity: 'security'
                        });
                        
                        RESPONSE_VALIDATION_STATS.security_violations += 1;
                    }
                });
                
                // Validate header value length to prevent oversized headers
                if (headerValue.length > 8192) {
                    validationResult.warnings.push({
                        code: 'OVERSIZED_HEADER',
                        message: `Header ${headerName} exceeds recommended length`,
                        headerName: headerName,
                        actualLength: headerValue.length,
                        maxLength: 8192,
                        severity: 'warning'
                    });
                }
            }
        });

        // Check for and remove potentially dangerous headers
        const dangerousHeaders = ['Server', 'X-Powered-By', 'X-AspNet-Version'];
        dangerousHeaders.forEach(headerName => {
            const lowerHeaderName = headerName.toLowerCase();
            
            if (headers[headerName] || headers[lowerHeaderName]) {
                validationResult.securityIssues.push({
                    code: 'DANGEROUS_HEADER_PRESENT',
                    message: `Potentially dangerous header ${headerName} detected`,
                    headerName: headerName,
                    headerValue: headers[headerName] || headers[lowerHeaderName],
                    severity: 'security'
                });
                
                // Remove dangerous headers from corrected headers
                delete validationResult.correctedHeaders[headerName];
                delete validationResult.correctedHeaders[lowerHeaderName];
                
                RESPONSE_VALIDATION_STATS.security_violations += 1;
            }
        });

        // Validate specific content type requirements based on endpoint
        if (endpoint === ROUTES.HELLO) {
            // For hello endpoint, validate Content-Type is text/plain
            const contentType = headers['content-type'] || headers['Content-Type'];
            if (contentType && !contentType.toLowerCase().includes('text/plain')) {
                validationResult.errors.push({
                    code: 'HELLO_CONTENT_TYPE_ERROR',
                    message: 'Hello endpoint must return text/plain content type',
                    actualContentType: contentType,
                    expectedContentType: CONTENT_TYPES.TEXT_PLAIN,
                    endpoint: endpoint,
                    severity: 'error'
                });
            }
        } else if ([ROUTES.HEALTH, ROUTES.READINESS, ROUTES.LIVENESS].includes(endpoint)) {
            // For health endpoints, validate Content-Type is application/json
            const contentType = headers['content-type'] || headers['Content-Type'];
            if (contentType && !contentType.toLowerCase().includes('application/json')) {
                validationResult.errors.push({
                    code: 'HEALTH_CONTENT_TYPE_ERROR',
                    message: 'Health endpoints must return application/json content type',
                    actualContentType: contentType,
                    expectedContentType: CONTENT_TYPES.APPLICATION_JSON,
                    endpoint: endpoint,
                    severity: 'error'
                });
            }
        }

        // Set validation success based on error count (warnings and security issues don't fail validation)
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add validation success metadata
        if (validationResult.isValid) {
            validationResult.metadata.headerValidation = {
                passed: true,
                endpoint: endpoint,
                securityHeadersAdded: Object.keys(validationResult.correctedHeaders).filter(h => !headers[h]).length,
                dangerousHeadersRemoved: dangerousHeaders.filter(h => headers[h] || headers[h.toLowerCase()]).length,
                validationRulesApplied: [
                    'structure_validation',
                    'content_type_validation',
                    'security_headers_validation',
                    'information_disclosure_check',
                    'dangerous_headers_check'
                ]
            };
        }

        // Update RESPONSE_VALIDATION_STATS with header validation results
        const validationTime = Date.now() - validationStartTime;
        RESPONSE_VALIDATION_STATS.performance_metrics.total_validation_time += validationTime;

        // Log header validation issues if debug logging enabled
        if (validationResult.securityIssues.length > 0 || validationResult.errors.length > 0) {
            logger.warn('Response header validation issues detected', {
                component: 'ResponseValidator',
                validationType: 'response_headers',
                endpoint: endpoint,
                errorCount: validationResult.errors.length,
                securityIssueCount: validationResult.securityIssues.length,
                warningCount: validationResult.warnings.length,
                correlationId: options.correlationId
            });
        }

        // Return comprehensive header validation result object
        return validationResult;

    } catch (error) {
        // Handle header validation errors gracefully with detailed error information
        logger.error('Response header validation failed with exception', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            endpoint: endpoint,
            headers: headers,
            options: options
        });

        // Return error validation result for exception handling
        return {
            isValid: false,
            validationType: 'response_headers',
            endpoint: endpoint,
            headers: headers,
            correctedHeaders: headers || {},
            errors: [{
                code: 'HEADER_VALIDATION_EXCEPTION',
                message: 'Header validation failed due to internal error',
                error: error.message,
                severity: 'error'
            }],
            warnings: [],
            securityIssues: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                validationError: true,
                options: options
            }
        };
    }
}

/**
 * Validates HTTP response body content against endpoint specifications and format requirements.
 * This function determines expected body format based on endpoint and content type, validates
 * body content against endpoint-specific requirements, checks body size limits, sanitizes body content,
 * and validates body content against format requirements.
 * 
 * The validation process includes:
 * - Body format determination based on endpoint specification and content type
 * - Hello endpoint validation requiring exactly 'Hello world' string content
 * - Health endpoint validation requiring valid JSON with required fields
 * - Text/plain content validation for proper encoding and character sets
 * - JSON content validation for proper structure and required properties
 * - Body size limit validation to prevent oversized responses
 * - Content sanitization to remove potentially dangerous elements
 * 
 * @param {any} body - Response body content to validate against endpoint specifications and format requirements
 * @param {string} contentType - Content-Type header value for format-specific validation rules
 * @param {string} endpoint - Endpoint path for endpoint-specific body validation requirements
 * @returns {Object} Body validation result with isValid flag, sanitized content, and detailed validation information
 */
function validateResponseBody(body, contentType, endpoint) {
    // Start performance timer for body validation measurement
    const validationStartTime = Date.now();
    
    try {
        // Initialize validation result object with comprehensive body information
        const validationResult = {
            isValid: false,
            validationType: 'response_body',
            endpoint: endpoint,
            contentType: contentType,
            originalBody: body,
            sanitizedBody: null,
            errors: [],
            warnings: [],
            sanitizationActions: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                bodySize: typeof body === 'string' ? body.length : JSON.stringify(body || '').length
            }
        };

        // Get endpoint specification for body validation requirements
        const endpointSpec = ENDPOINT_RESPONSE_SPECS[endpoint];
        
        // Determine expected body format based on endpoint and content type
        let expectedFormat = 'unknown';
        if (contentType) {
            if (contentType.includes('text/plain')) {
                expectedFormat = 'text';
            } else if (contentType.includes('application/json')) {
                expectedFormat = 'json';
            } else if (contentType.includes('text/html')) {
                expectedFormat = 'html';
            }
        }

        // Validate body size limits to prevent oversized responses
        const bodySize = validationResult.metadata.bodySize;
        if (endpointSpec && endpointSpec.contentLength) {
            if (bodySize < endpointSpec.contentLength.min || bodySize > endpointSpec.contentLength.max) {
                validationResult.errors.push({
                    code: 'BODY_SIZE_OUT_OF_RANGE',
                    message: `Response body size ${bodySize} is outside expected range`,
                    actualSize: bodySize,
                    expectedRange: endpointSpec.contentLength,
                    endpoint: endpoint,
                    severity: 'error'
                });
            }
        }

        // Validate endpoint-specific body content requirements
        if (endpoint === ROUTES.HELLO) {
            // For hello endpoint, validate body is exactly 'Hello world' string
            if (typeof body !== 'string') {
                validationResult.errors.push({
                    code: 'HELLO_BODY_TYPE_ERROR',
                    message: 'Hello endpoint body must be a string',
                    actualType: typeof body,
                    expectedType: 'string',
                    endpoint: endpoint,
                    severity: 'error'
                });
            } else if (body !== 'Hello world') {
                validationResult.errors.push({
                    code: 'HELLO_BODY_CONTENT_ERROR',
                    message: 'Hello endpoint must return exactly "Hello world"',
                    actualContent: body,
                    expectedContent: 'Hello world',
                    endpoint: endpoint,
                    severity: 'error'
                });
            } else {
                // Body is valid - no sanitization needed for exact match
                validationResult.sanitizedBody = body;
            }
        } else if ([ROUTES.HEALTH, ROUTES.READINESS, ROUTES.LIVENESS].includes(endpoint)) {
            // For health endpoints, validate body is valid JSON with required fields
            try {
                let parsedBody = body;
                
                // Parse JSON if body is string
                if (typeof body === 'string') {
                    parsedBody = JSON.parse(body);
                }
                
                // Validate required fields based on endpoint specification
                if (endpointSpec && endpointSpec.requiredFields) {
                    endpointSpec.requiredFields.forEach(field => {
                        if (parsedBody[field] === undefined) {
                            validationResult.errors.push({
                                code: 'MISSING_REQUIRED_FIELD',
                                message: `Required field '${field}' missing in health response`,
                                field: field,
                                requiredFields: endpointSpec.requiredFields,
                                actualFields: Object.keys(parsedBody),
                                endpoint: endpoint,
                                severity: 'error'
                            });
                        }
                    });
                }
                
                // Validate specific health field values
                if (parsedBody.status !== undefined) {
                    const validStatuses = ['ok', 'unhealthy', 'degraded'];
                    if (!validStatuses.includes(parsedBody.status)) {
                        validationResult.warnings.push({
                            code: 'INVALID_HEALTH_STATUS',
                            message: 'Health status should be one of: ok, unhealthy, degraded',
                            actualStatus: parsedBody.status,
                            validStatuses: validStatuses,
                            endpoint: endpoint,
                            severity: 'warning'
                        });
                    }
                }
                
                // Sanitize health response body
                const sanitizedHealthBody = sanitizeResponseContent(parsedBody, contentType, {
                    allowHtml: false,
                    allowScripts: false,
                    preserveStructure: true
                });
                
                validationResult.sanitizedBody = sanitizedHealthBody.sanitizedContent;
                if (sanitizedHealthBody.sanitizationActions.length > 0) {
                    validationResult.sanitizationActions.push(...sanitizedHealthBody.sanitizationActions);
                }
                
            } catch (parseError) {
                validationResult.errors.push({
                    code: 'INVALID_JSON_BODY',
                    message: 'Health endpoint body must be valid JSON',
                    parseError: parseError.message,
                    endpoint: endpoint,
                    severity: 'error'
                });
            }
        } else {
            // For unknown endpoints, perform generic content validation
            if (expectedFormat === 'json' && typeof body === 'string') {
                try {
                    JSON.parse(body);
                    validationResult.sanitizedBody = sanitizeResponseContent(body, contentType, {}).sanitizedContent;
                } catch (parseError) {
                    validationResult.errors.push({
                        code: 'INVALID_JSON_CONTENT',
                        message: 'Response body is not valid JSON',
                        parseError: parseError.message,
                        endpoint: endpoint,
                        severity: 'error'
                    });
                }
            } else {
                // Sanitize other content types
                const sanitizationResult = sanitizeResponseContent(body, contentType, {});
                validationResult.sanitizedBody = sanitizationResult.sanitizedContent;
                validationResult.sanitizationActions.push(...sanitizationResult.sanitizationActions);
            }
        }

        // Validate text/plain content for proper encoding and character sets
        if (expectedFormat === 'text' && typeof body === 'string') {
            // Check for proper UTF-8 encoding
            try {
                const buffer = Buffer.from(body, 'utf8');
                const decoded = buffer.toString('utf8');
                if (decoded !== body) {
                    validationResult.warnings.push({
                        code: 'ENCODING_MISMATCH',
                        message: 'Text content may have encoding issues',
                        endpoint: endpoint,
                        severity: 'warning'
                    });
                }
            } catch (encodingError) {
                validationResult.warnings.push({
                    code: 'ENCODING_VALIDATION_ERROR',
                    message: 'Could not validate text encoding',
                    error: encodingError.message,
                    endpoint: endpoint,
                    severity: 'warning'
                });
            }
            
            // Check for control characters that might cause issues
            if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(body)) {
                validationResult.warnings.push({
                    code: 'CONTROL_CHARACTERS_DETECTED',
                    message: 'Text content contains control characters',
                    endpoint: endpoint,
                    severity: 'warning'
                });
                
                // Sanitize control characters if not already sanitized
                if (!validationResult.sanitizedBody) {
                    validationResult.sanitizedBody = body.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                    validationResult.sanitizationActions.push({
                        action: 'control_characters_removed',
                        description: 'Removed control characters from text content'
                    });
                }
            }
        }

        // Set validation success based on error count
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add validation success metadata
        if (validationResult.isValid) {
            validationResult.metadata.bodyValidation = {
                passed: true,
                endpoint: endpoint,
                contentType: contentType,
                format: expectedFormat,
                sanitized: validationResult.sanitizationActions.length > 0,
                validationRulesApplied: [
                    'size_validation',
                    'format_validation',
                    endpointSpec ? 'endpoint_specific_validation' : null,
                    'encoding_validation',
                    'content_sanitization'
                ].filter(Boolean)
            };
        }

        // Update sanitization statistics if actions were taken
        if (validationResult.sanitizationActions.length > 0) {
            RESPONSE_VALIDATION_STATS.sanitization_count += 1;
        }

        // Calculate validation performance time and update metrics
        const validationTime = Date.now() - validationStartTime;
        RESPONSE_VALIDATION_STATS.performance_metrics.total_validation_time += validationTime;

        // Log body validation results if debug logging enabled for development troubleshooting
        logger.debug('Response body validation completed', {
            component: 'ResponseValidator',
            validationType: 'response_body',
            endpoint: endpoint,
            contentType: contentType,
            isValid: validationResult.isValid,
            bodySize: bodySize,
            sanitizationActions: validationResult.sanitizationActions.length,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            validationTime: validationTime
        });

        // Return comprehensive body validation result with sanitized content
        return validationResult;

    } catch (error) {
        // Handle body validation errors gracefully with detailed error information
        logger.error('Response body validation failed with exception', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            endpoint: endpoint,
            contentType: contentType,
            bodyType: typeof body
        });

        // Return error validation result for exception handling
        return {
            isValid: false,
            validationType: 'response_body',
            endpoint: endpoint,
            contentType: contentType,
            originalBody: body,
            sanitizedBody: null,
            errors: [{
                code: 'BODY_VALIDATION_EXCEPTION',
                message: 'Body validation failed due to internal error',
                error: error.message,
                severity: 'error'
            }],
            warnings: [],
            sanitizationActions: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                validationError: true
            }
        };
    }
}

// =============================================================================
// SPECIALIZED ENDPOINT VALIDATION FUNCTIONS
// =============================================================================

/**
 * Comprehensive validation function for '/hello' endpoint responses with full response validation.
 * This function extracts status code, headers, and body from response object, validates response status
 * using validateResponseStatus(), validates response headers using validateResponseHeaders(),
 * validates response body using validateResponseBody(), and creates comprehensive validation result.
 * 
 * The validation process includes:
 * - Complete response object structure validation with null safety checking
 * - HTTP status code validation requiring 200 OK for successful hello responses
 * - Response header validation requiring text/plain Content-Type header
 * - Response body validation requiring exactly 'Hello world' string content
 * - Response timing validation if available for performance monitoring
 * - Response size validation against tutorial application requirements
 * - Information disclosure prevention in response content and headers
 * - Comprehensive validation result generation with detailed status information
 * 
 * @param {Object} response - Complete HTTP response object containing status, headers, and body
 * @param {Object} context - Request context containing correlation ID and additional validation information
 * @returns {Object} Complete hello response validation result with detailed validation status and error information
 */
function validateHelloResponse(response, context = {}) {
    // Start performance timer for hello response validation measurement
    const validationStartTime = Date.now();
    const timerId = `hello_validation_${context.correlationId || Date.now()}`;
    startTimer(timerId);
    
    try {
        // Initialize comprehensive validation result object
        const validationResult = {
            isValid: false,
            validationType: 'hello_response',
            endpoint: ROUTES.HELLO,
            response: response,
            subValidations: {},
            errors: [],
            warnings: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                correlationId: context.correlationId,
                context: context
            }
        };

        // Validate response object structure
        if (!response || typeof response !== 'object') {
            validationResult.errors.push({
                code: 'INVALID_RESPONSE_OBJECT',
                message: 'Response must be a valid object',
                actualType: typeof response,
                severity: 'error'
            });
            return validationResult;
        }

        // Extract status code, headers, and body from response object
        const statusCode = response.statusCode || response.status;
        const headers = response.headers || response.header || {};
        const body = response.body || response.text || response.data;

        // Validate response status using validateResponseStatus() for 200 OK requirement
        const statusValidation = validateResponseStatus(statusCode, ROUTES.HELLO, context);
        validationResult.subValidations.status = statusValidation;
        
        if (!statusValidation.isValid) {
            validationResult.errors.push(...statusValidation.errors.map(error => ({
                ...error,
                validationType: 'status_validation',
                component: 'hello_response'
            })));
        }

        // Validate response headers using validateResponseHeaders() for text/plain content type
        const headerValidation = validateResponseHeaders(headers, ROUTES.HELLO, { 
            correlationId: context.correlationId,
            strictMode: true
        });
        validationResult.subValidations.headers = headerValidation;
        
        if (!headerValidation.isValid) {
            validationResult.errors.push(...headerValidation.errors.map(error => ({
                ...error,
                validationType: 'header_validation',
                component: 'hello_response'
            })));
        }
        
        // Include security issues from header validation
        if (headerValidation.securityIssues && headerValidation.securityIssues.length > 0) {
            validationResult.warnings.push(...headerValidation.securityIssues.map(issue => ({
                ...issue,
                validationType: 'security_validation',
                component: 'hello_response'
            })));
        }

        // Validate response body using validateResponseBody() for 'Hello world' content
        const contentType = headers['content-type'] || headers['Content-Type'] || CONTENT_TYPES.TEXT_PLAIN;
        const bodyValidation = validateResponseBody(body, contentType, ROUTES.HELLO);
        validationResult.subValidations.body = bodyValidation;
        
        if (!bodyValidation.isValid) {
            validationResult.errors.push(...bodyValidation.errors.map(error => ({
                ...error,
                validationType: 'body_validation',
                component: 'hello_response'
            })));
        }

        // Check response timing if available for performance validation
        const responseTime = context.responseTime || response.responseTime;
        if (responseTime !== undefined) {
            const timingValidation = validateResponseTiming(responseTime, ROUTES.HELLO);
            validationResult.subValidations.timing = timingValidation;
            
            if (!timingValidation.isValid) {
                validationResult.warnings.push(...timingValidation.errors.map(error => ({
                    ...error,
                    validationType: 'timing_validation',
                    component: 'hello_response'
                })));
            }
        }

        // Validate response size meets tutorial application requirements
        const responseSize = typeof body === 'string' ? body.length : JSON.stringify(body || '').length;
        const endpointSpec = ENDPOINT_RESPONSE_SPECS[ROUTES.HELLO];
        
        if (endpointSpec && endpointSpec.contentLength) {
            if (responseSize < endpointSpec.contentLength.min || responseSize > endpointSpec.contentLength.max) {
                validationResult.errors.push({
                    code: 'HELLO_RESPONSE_SIZE_ERROR',
                    message: 'Hello response size does not meet requirements',
                    actualSize: responseSize,
                    expectedRange: endpointSpec.contentLength,
                    severity: 'error',
                    validationType: 'size_validation',
                    component: 'hello_response'
                });
            }
        }

        // Ensure no information disclosure in response content
        if (typeof body === 'string') {
            const sensitivePatterns = [
                /password/i,
                /secret/i,
                /token/i,
                /key/i,
                /internal/i,
                /debug/i,
                /error.*stack/i
            ];
            
            sensitivePatterns.forEach(pattern => {
                if (pattern.test(body)) {
                    validationResult.warnings.push({
                        code: 'POTENTIAL_INFORMATION_DISCLOSURE',
                        message: 'Response body may contain sensitive information',
                        pattern: pattern.toString(),
                        severity: 'security',
                        validationType: 'security_validation',
                        component: 'hello_response'
                    });
                    
                    RESPONSE_VALIDATION_STATS.security_violations += 1;
                }
            });
        }

        // Set overall validation success based on error count (warnings don't fail validation)
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add comprehensive validation metadata
        if (validationResult.isValid) {
            validationResult.metadata.helloValidation = {
                passed: true,
                statusCode: statusCode,
                contentType: contentType,
                bodySize: responseSize,
                subValidationsCount: Object.keys(validationResult.subValidations).length,
                validationRulesApplied: [
                    'response_structure_validation',
                    'status_code_validation',
                    'header_validation',
                    'body_content_validation',
                    responseTime ? 'timing_validation' : null,
                    'size_validation',
                    'security_validation'
                ].filter(Boolean)
            };
        }

        // Stop performance timer and calculate validation time
        const totalValidationTime = stopTimer(timerId);
        validationResult.metadata.validationTime = totalValidationTime;

        // Update RESPONSE_VALIDATION_STATS with hello response validation attempt
        RESPONSE_VALIDATION_STATS.total += 1;
        if (validationResult.isValid) {
            RESPONSE_VALIDATION_STATS.passed += 1;
        } else {
            RESPONSE_VALIDATION_STATS.failed += 1;
        }

        // Update endpoint-specific statistics
        if (!RESPONSE_VALIDATION_STATS.by_endpoint[ROUTES.HELLO]) {
            RESPONSE_VALIDATION_STATS.by_endpoint[ROUTES.HELLO] = { total: 0, passed: 0, failed: 0 };
        }
        RESPONSE_VALIDATION_STATS.by_endpoint[ROUTES.HELLO].total += 1;
        if (validationResult.isValid) {
            RESPONSE_VALIDATION_STATS.by_endpoint[ROUTES.HELLO].passed += 1;
        } else {
            RESPONSE_VALIDATION_STATS.by_endpoint[ROUTES.HELLO].failed += 1;
        }

        // Log complete response validation with correlation ID if available for request tracing
        logger.info('Hello response validation completed', {
            component: 'ResponseValidator',
            validationType: 'hello_response',
            endpoint: ROUTES.HELLO,
            isValid: validationResult.isValid,
            statusCode: statusCode,
            contentType: contentType,
            bodySize: responseSize,
            validationTime: totalValidationTime,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            correlationId: context.correlationId
        });

        // Return detailed validation result for middleware or logging use
        return validationResult;

    } catch (error) {
        // Handle hello response validation errors gracefully with comprehensive error information
        logger.error('Hello response validation failed with exception', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            endpoint: ROUTES.HELLO,
            context: context
        });

        // Stop timer if it was started
        stopTimer(timerId);

        // Return error validation result for exception handling
        return {
            isValid: false,
            validationType: 'hello_response',
            endpoint: ROUTES.HELLO,
            response: response,
            subValidations: {},
            errors: [{
                code: 'HELLO_VALIDATION_EXCEPTION',
                message: 'Hello response validation failed due to internal error',
                error: error.message,
                severity: 'error',
                validationType: 'exception_handling',
                component: 'hello_response'
            }],
            warnings: [],
            metadata: {
                validationTimestamp: new Date().toISOString(),
                validationError: true,
                correlationId: context.correlationId,
                context: context
            }
        };
    }
}

/**
 * Validation function for health check endpoint responses with health-specific validation requirements.
 * This function extracts status code, headers, and body from response object, validates status code supports
 * 200 OK or 503 Service Unavailable, validates Content-Type header is application/json, validates JSON body
 * contains required health check fields, and creates comprehensive health-specific validation result.
 * 
 * The validation process includes:
 * - Health response object structure validation with comprehensive error handling
 * - Status code validation supporting both healthy (200) and unhealthy (503) responses
 * - Content-Type header validation requiring application/json for structured health data
 * - JSON body validation with required health check fields (status, timestamp)
 * - Liveness check validation with minimal response format for performance optimization
 * - Readiness check validation with comprehensive status information
 * - Health response timing validation for operational SLA requirements
 * - Health-specific validation result generation optimized for monitoring systems
 * 
 * @param {Object} response - Health check HTTP response object containing status, headers, and health data
 * @param {string} healthType - Health check type (health, readiness, liveness) for specific validation rules
 * @returns {Object} Health response validation result with health-specific checks and monitoring optimization
 */
function validateHealthResponse(response, healthType = 'health') {
    // Start performance timer for health response validation measurement
    const validationStartTime = Date.now();
    const timerId = `health_validation_${healthType}_${Date.now()}`;
    startTimer(timerId);
    
    try {
        // Determine endpoint path based on health type
        let endpoint = ROUTES.HEALTH;
        if (healthType === 'readiness') {
            endpoint = ROUTES.READINESS;
        } else if (healthType === 'liveness') {
            endpoint = ROUTES.LIVENESS;
        }

        // Initialize comprehensive health validation result object
        const validationResult = {
            isValid: false,
            validationType: 'health_response',
            healthType: healthType,
            endpoint: endpoint,
            response: response,
            subValidations: {},
            errors: [],
            warnings: [],
            healthStatus: null,
            metadata: {
                validationTimestamp: new Date().toISOString(),
                healthType: healthType,
                endpoint: endpoint
            }
        };

        // Validate response object structure with comprehensive error handling
        if (!response || typeof response !== 'object') {
            validationResult.errors.push({
                code: 'INVALID_HEALTH_RESPONSE_OBJECT',
                message: 'Health response must be a valid object',
                actualType: typeof response,
                healthType: healthType,
                severity: 'error'
            });
            return validationResult;
        }

        // Extract status code, headers, and body from response object
        const statusCode = response.statusCode || response.status;
        const headers = response.headers || response.header || {};
        const body = response.body || response.text || response.data;

        // Validate status code supports 200 OK or 503 Service Unavailable for health checks
        const statusValidation = validateResponseStatus(statusCode, endpoint, { healthType: healthType });
        validationResult.subValidations.status = statusValidation;
        
        if (!statusValidation.isValid) {
            validationResult.errors.push(...statusValidation.errors.map(error => ({
                ...error,
                validationType: 'status_validation',
                component: 'health_response',
                healthType: healthType
            })));
        }

        // Validate Content-Type header is application/json for health responses
        const headerValidation = validateResponseHeaders(headers, endpoint, { 
            healthType: healthType,
            strictMode: false // Health endpoints allow more flexibility
        });
        validationResult.subValidations.headers = headerValidation;
        
        if (!headerValidation.isValid) {
            validationResult.errors.push(...headerValidation.errors.map(error => ({
                ...error,
                validationType: 'header_validation',
                component: 'health_response',
                healthType: healthType
            })));
        }

        // Validate JSON body contains required health check fields (status, timestamp)
        const contentType = headers['content-type'] || headers['Content-Type'] || CONTENT_TYPES.APPLICATION_JSON;
        const bodyValidation = validateResponseBody(body, contentType, endpoint);
        validationResult.subValidations.body = bodyValidation;
        
        if (!bodyValidation.isValid) {
            validationResult.errors.push(...bodyValidation.errors.map(error => ({
                ...error,
                validationType: 'body_validation',
                component: 'health_response',
                healthType: healthType
            })));
        }

        // Parse and validate health-specific JSON structure
        try {
            let parsedBody = body;
            if (typeof body === 'string') {
                parsedBody = JSON.parse(body);
            }

            // Extract health status for validation result
            if (parsedBody && parsedBody.status) {
                validationResult.healthStatus = parsedBody.status;
            }

            // Validate health check type-specific requirements
            if (healthType === 'liveness') {
                // For liveness checks, validate minimal response format for performance
                const requiredLivenessFields = ['status'];
                const missingFields = requiredLivenessFields.filter(field => parsedBody[field] === undefined);
                
                if (missingFields.length > 0) {
                    validationResult.errors.push({
                        code: 'LIVENESS_MISSING_FIELDS',
                        message: 'Liveness check missing required fields',
                        missingFields: missingFields,
                        requiredFields: requiredLivenessFields,
                        healthType: healthType,
                        severity: 'error'
                    });
                }
            } else if (healthType === 'readiness') {
                // For readiness checks, validate comprehensive status information
                const requiredReadinessFields = ['status'];
                const recommendedReadinessFields = ['timestamp', 'checks'];
                
                const missingRequired = requiredReadinessFields.filter(field => parsedBody[field] === undefined);
                const missingRecommended = recommendedReadinessFields.filter(field => parsedBody[field] === undefined);
                
                if (missingRequired.length > 0) {
                    validationResult.errors.push({
                        code: 'READINESS_MISSING_REQUIRED_FIELDS',
                        message: 'Readiness check missing required fields',
                        missingFields: missingRequired,
                        requiredFields: requiredReadinessFields,
                        healthType: healthType,
                        severity: 'error'
                    });
                }
                
                if (missingRecommended.length > 0) {
                    validationResult.warnings.push({
                        code: 'READINESS_MISSING_RECOMMENDED_FIELDS',
                        message: 'Readiness check missing recommended fields',
                        missingFields: missingRecommended,
                        recommendedFields: recommendedReadinessFields,
                        healthType: healthType,
                        severity: 'warning'
                    });
                }
                
                // Validate readiness check sub-components if present
                if (parsedBody.checks && typeof parsedBody.checks === 'object') {
                    Object.keys(parsedBody.checks).forEach(checkName => {
                        const check = parsedBody.checks[checkName];
                        if (!check.status) {
                            validationResult.warnings.push({
                                code: 'READINESS_CHECK_MISSING_STATUS',
                                message: `Readiness sub-check '${checkName}' missing status`,
                                checkName: checkName,
                                healthType: healthType,
                                severity: 'warning'
                            });
                        }
                    });
                }
            } else {
                // For general health checks, validate standard health response format
                const requiredHealthFields = ['status', 'timestamp'];
                const missingFields = requiredHealthFields.filter(field => parsedBody[field] === undefined);
                
                if (missingFields.length > 0) {
                    validationResult.errors.push({
                        code: 'HEALTH_MISSING_FIELDS',
                        message: 'Health check missing required fields',
                        missingFields: missingFields,
                        requiredFields: requiredHealthFields,
                        healthType: healthType,
                        severity: 'error'
                    });
                }
            }

            // Validate health status value consistency
            if (parsedBody.status) {
                const validHealthStatuses = ['ok', 'unhealthy', 'degraded'];
                if (!validHealthStatuses.includes(parsedBody.status)) {
                    validationResult.warnings.push({
                        code: 'INVALID_HEALTH_STATUS_VALUE',
                        message: 'Health status should be one of: ok, unhealthy, degraded',
                        actualStatus: parsedBody.status,
                        validStatuses: validHealthStatuses,
                        healthType: healthType,
                        severity: 'warning'
                    });
                }

                // Validate status consistency with HTTP status code
                if (parsedBody.status === 'unhealthy' && statusCode === HTTP_STATUS.OK) {
                    validationResult.warnings.push({
                        code: 'STATUS_CODE_HEALTH_STATUS_MISMATCH',
                        message: 'HTTP status 200 with unhealthy status may be inconsistent',
                        httpStatus: statusCode,
                        healthStatus: parsedBody.status,
                        healthType: healthType,
                        severity: 'warning'
                    });
                }
            }

        } catch (parseError) {
            validationResult.errors.push({
                code: 'HEALTH_JSON_PARSE_ERROR',
                message: 'Health response body is not valid JSON',
                parseError: parseError.message,
                healthType: healthType,
                severity: 'error'
            });
        }

        // Validate health response timing for operational requirements
        const responseTime = response.responseTime;
        if (responseTime !== undefined) {
            const timingValidation = validateResponseTiming(responseTime, endpoint);
            validationResult.subValidations.timing = timingValidation;
            
            if (!timingValidation.isValid) {
                validationResult.warnings.push(...timingValidation.errors.map(error => ({
                    ...error,
                    validationType: 'timing_validation',
                    component: 'health_response',
                    healthType: healthType
                })));
            }
        }

        // Set overall validation success based on error count
        validationResult.isValid = validationResult.errors.length === 0;
        
        // Add health-specific validation metadata
        if (validationResult.isValid) {
            validationResult.metadata.healthValidation = {
                passed: true,
                healthType: healthType,
                endpoint: endpoint,
                statusCode: statusCode,
                healthStatus: validationResult.healthStatus,
                subValidationsCount: Object.keys(validationResult.subValidations).length,
                validationRulesApplied: [
                    'response_structure_validation',
                    'status_code_validation',
                    'header_validation',
                    'json_body_validation',
                    `${healthType}_specific_validation`,
                    responseTime ? 'timing_validation' : null
                ].filter(Boolean)
            };
        }

        // Stop performance timer and calculate validation time
        const totalValidationTime = stopTimer(timerId);
        validationResult.metadata.validationTime = totalValidationTime;

        // Update RESPONSE_VALIDATION_STATS with health response validation
        RESPONSE_VALIDATION_STATS.total += 1;
        if (validationResult.isValid) {
            RESPONSE_VALIDATION_STATS.passed += 1;
        } else {
            RESPONSE_VALIDATION_STATS.failed += 1;
        }

        // Update endpoint-specific statistics
        if (!RESPONSE_VALIDATION_STATS.by_endpoint[endpoint]) {
            RESPONSE_VALIDATION_STATS.by_endpoint[endpoint] = { total: 0, passed: 0, failed: 0 };
        }
        RESPONSE_VALIDATION_STATS.by_endpoint[endpoint].total += 1;
        if (validationResult.isValid) {
            RESPONSE_VALIDATION_STATS.by_endpoint[endpoint].passed += 1;
        } else {
            RESPONSE_VALIDATION_STATS.by_endpoint[endpoint].failed += 1;
        }

        // Log health response validation with health-specific context
        logger.info('Health response validation completed', {
            component: 'ResponseValidator',
            validationType: 'health_response',
            healthType: healthType,
            endpoint: endpoint,
            isValid: validationResult.isValid,
            statusCode: statusCode,
            healthStatus: validationResult.healthStatus,
            validationTime: totalValidationTime,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length
        });

        // Return validation result optimized for health check monitoring
        return validationResult;

    } catch (error) {
        // Handle health response validation errors gracefully with detailed error information
        logger.error('Health response validation failed with exception', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            healthType: healthType,
            endpoint: endpoint || ROUTES.HEALTH
        });

        // Stop timer if it was started
        stopTimer(timerId);

        // Return error validation result for exception handling
        return {
            isValid: false,
            validationType: 'health_response',
            healthType: healthType,
            endpoint: endpoint || ROUTES.HEALTH,
            response: response,
            subValidations: {},
            errors: [{
                code: 'HEALTH_VALIDATION_EXCEPTION',
                message: 'Health response validation failed due to internal error',
                error: error.message,
                healthType: healthType,
                severity: 'error',
                validationType: 'exception_handling',
                component: 'health_response'
            }],
            warnings: [],
            healthStatus: null,
            metadata: {
                validationTimestamp: new Date().toISOString(),
                validationError: true,
                healthType: healthType,
                endpoint: endpoint || ROUTES.HEALTH
            }
        };
    }
}

// =============================================================================
// EXPRESS.JS MIDDLEWARE INTEGRATION
// =============================================================================

/**
 * Express.js middleware factory that creates response validation middleware for intercepting and validating responses.
 * This function creates middleware function with Express (req, res, next) signature, intercepts res.send(), res.json(),
 * and res.end() methods, captures response status code, headers, and body before sending, applies endpoint-specific
 * validation, and integrates with Express 5.1.0 response processing patterns.
 * 
 * The middleware creation process includes:
 * - Express middleware function creation with proper (req, res, next) signature
 * - Response method interception using monkey-patching technique for res.send(), res.json(), res.end()
 * - Response data capture before transmission with status code, headers, and body extraction
 * - Endpoint-specific validation application using validateHelloResponse() and validateHealthResponse()
 * - Validation result logging and statistics updating with request correlation
 * - Response continuation allowing proper Express response flow
 * - Error handling with graceful degradation for validation failures
 * 
 * @param {string} endpoint - Endpoint path for endpoint-specific validation middleware configuration
 * @param {Object} validationOptions - Validation options object containing middleware configuration and validation rules
 * @returns {function} Express.js middleware function for response validation ready for app.use() integration
 */
function createResponseValidationMiddleware(endpoint, validationOptions = {}) {
    try {
        // Log middleware creation for monitoring and debugging
        logger.debug('Creating response validation middleware', {
            component: 'ResponseValidator',
            middleware: 'response_validation',
            endpoint: endpoint,
            options: validationOptions
        });

        // Return Express.js middleware function with proper signature
        return function responseValidationMiddleware(req, res, next) {
            try {
                // Generate correlation ID for request tracing across validation pipeline
                const correlationId = req.correlationId || 
                                    req.headers['x-correlation-id'] || 
                                    `resp_val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Create request logger for correlated logging throughout validation process
                const requestLogger = createRequestLogger(correlationId, {
                    method: req.method,
                    path: req.path || req.url,
                    endpoint: endpoint,
                    userAgent: req.headers['user-agent']
                });

                // Store original response methods for interception and restoration
                const originalSend = res.send.bind(res);
                const originalJson = res.json.bind(res);
                const originalEnd = res.end.bind(res);

                // Start response timing for performance validation
                const responseStartTime = Date.now();
                const responseTimerId = `response_${correlationId}`;
                startTimer(responseTimerId);

                // Intercept res.send() method to capture response data before transmission
                res.send = function(body) {
                    try {
                        // Capture response timing for performance validation
                        const responseTime = stopTimer(responseTimerId);
                        
                        // Extract response data for validation
                        const responseData = {
                            statusCode: res.statusCode,
                            headers: res.getHeaders ? res.getHeaders() : res._headers || {},
                            body: body,
                            responseTime: responseTime
                        };

                        // Create context for validation with correlation and timing information
                        const validationContext = {
                            correlationId: correlationId,
                            responseTime: responseTime,
                            method: req.method,
                            path: req.path || req.url,
                            endpoint: endpoint
                        };

                        // Apply endpoint-specific validation using appropriate validator
                        let validationResult;
                        if (endpoint === ROUTES.HELLO) {
                            validationResult = validateHelloResponse(responseData, validationContext);
                        } else if ([ROUTES.HEALTH, ROUTES.READINESS, ROUTES.LIVENESS].includes(endpoint)) {
                            const healthType = endpoint === ROUTES.READINESS ? 'readiness' : 
                                             endpoint === ROUTES.LIVENESS ? 'liveness' : 'health';
                            validationResult = validateHealthResponse(responseData, healthType);
                        } else {
                            // Generic response validation for other endpoints
                            validationResult = {
                                isValid: true,
                                validationType: 'generic_response',
                                endpoint: endpoint,
                                warnings: [],
                                metadata: {
                                    message: 'Generic validation applied - no specific rules for endpoint',
                                    endpoint: endpoint,
                                    validationTimestamp: new Date().toISOString()
                                }
                            };
                        }

                        // Log validation results with request correlation for monitoring and debugging
                        if (validationResult.isValid) {
                            requestLogger.info('Response validation passed', {
                                component: 'ResponseValidationMiddleware',
                                endpoint: endpoint,
                                statusCode: res.statusCode,
                                validationType: validationResult.validationType,
                                responseTime: responseTime,
                                warningCount: validationResult.warnings ? validationResult.warnings.length : 0,
                                correlationId: correlationId
                            });
                        } else {
                            requestLogger.warn('Response validation failed', {
                                component: 'ResponseValidationMiddleware',
                                endpoint: endpoint,
                                statusCode: res.statusCode,
                                validationType: validationResult.validationType,
                                responseTime: responseTime,
                                errorCount: validationResult.errors ? validationResult.errors.length : 0,
                                errors: validationResult.errors,
                                correlationId: correlationId
                            });

                            // Update failed validation statistics
                            RESPONSE_VALIDATION_STATS.failed += 1;
                        }

                        // Update validation statistics with middleware-specific tracking
                        RESPONSE_VALIDATION_STATS.total += 1;
                        if (validationResult.isValid) {
                            RESPONSE_VALIDATION_STATS.passed += 1;
                        }

                        // Allow response to continue if validation passes or if not in strict mode
                        const allowContinue = validationResult.isValid || !validationOptions.strictMode;
                        
                        if (allowContinue) {
                            // Continue with original response transmission
                            return originalSend(body);
                        } else {
                            // In strict mode, block response and return validation error
                            requestLogger.error('Response blocked due to validation failure in strict mode', {
                                component: 'ResponseValidationMiddleware',
                                endpoint: endpoint,
                                validationResult: validationResult,
                                strictMode: validationOptions.strictMode,
                                correlationId: correlationId
                            });

                            // Return validation error response
                            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR);
                            return originalJson({
                                error: ERROR_MESSAGES.INTERNAL_ERROR,
                                correlationId: correlationId,
                                validationError: true,
                                timestamp: new Date().toISOString()
                            });
                        }

                    } catch (validationError) {
                        // Handle validation errors gracefully - log error but allow response to continue
                        requestLogger.error('Response validation middleware encountered error', {
                            error: validationError.message,
                            errorType: validationError.constructor.name,
                            component: 'ResponseValidationMiddleware',
                            endpoint: endpoint,
                            correlationId: correlationId
                        });

                        // Continue with original response to prevent middleware from breaking application
                        return originalSend(body);
                    }
                };

                // Intercept res.json() method to capture JSON response data
                res.json = function(obj) {
                    try {
                        // Convert JSON object to string for consistent body handling
                        const jsonBody = typeof obj === 'string' ? obj : JSON.stringify(obj);
                        
                        // Set appropriate content type for JSON responses
                        if (!res.get('Content-Type')) {
                            res.set('Content-Type', CONTENT_TYPES.APPLICATION_JSON);
                        }
                        
                        // Use intercepted send method for validation
                        return res.send(jsonBody);
                        
                    } catch (jsonError) {
                        // Handle JSON serialization errors gracefully
                        requestLogger.error('JSON response serialization error in validation middleware', {
                            error: jsonError.message,
                            errorType: jsonError.constructor.name,
                            component: 'ResponseValidationMiddleware',
                            endpoint: endpoint,
                            correlationId: correlationId
                        });

                        // Fall back to original json method
                        return originalJson(obj);
                    }
                };

                // Intercept res.end() method for responses without explicit body
                res.end = function(chunk, encoding) {
                    try {
                        // If chunk is provided, validate it as response body
                        if (chunk !== undefined) {
                            return res.send(chunk);
                        } else {
                            // For responses without body, perform minimal validation
                            const responseTime = stopTimer(responseTimerId);
                            
                            requestLogger.debug('Response ended without body - minimal validation applied', {
                                component: 'ResponseValidationMiddleware',
                                endpoint: endpoint,
                                statusCode: res.statusCode,
                                responseTime: responseTime,
                                correlationId: correlationId
                            });

                            // Continue with original end method
                            return originalEnd.call(this, chunk, encoding);
                        }
                        
                    } catch (endError) {
                        // Handle end method errors gracefully
                        requestLogger.error('Response end method error in validation middleware', {
                            error: endError.message,
                            errorType: endError.constructor.name,
                            component: 'ResponseValidationMiddleware',
                            endpoint: endpoint,
                            correlationId: correlationId
                        });

                        // Fall back to original end method
                        return originalEnd.call(this, chunk, encoding);
                    }
                };

                // Continue to next middleware in Express pipeline
                next();

            } catch (middlewareError) {
                // Handle middleware initialization errors gracefully
                logger.error('Response validation middleware initialization error', {
                    error: middlewareError.message,
                    errorType: middlewareError.constructor.name,
                    component: 'ResponseValidationMiddleware',
                    endpoint: endpoint,
                    path: req.path || req.url
                });

                // Continue to next middleware to prevent application disruption
                next();
            }
        };

    } catch (factoryError) {
        // Handle middleware factory errors by returning pass-through middleware
        logger.error('Response validation middleware factory error', {
            error: factoryError.message,
            errorType: factoryError.constructor.name,
            component: 'ResponseValidator',
            endpoint: endpoint,
            validationOptions: validationOptions
        });

        // Return minimal pass-through middleware that doesn't interfere with responses
        return function passthroughResponseMiddleware(req, res, next) {
            logger.warn('Using pass-through response validation middleware due to factory error', {
                component: 'ResponseValidator',
                endpoint: endpoint,
                path: req.path || req.url
            });
            next();
        };
    }
}

// =============================================================================
// CONTENT SANITIZATION AND SECURITY
// =============================================================================

/**
 * Sanitizes response content to prevent information disclosure and ensure proper formatting.
 * This function applies content-type specific sanitization rules, removes potentially sensitive information,
 * applies content length limits, escapes potentially dangerous characters, validates content against
 * endpoint-specific format requirements, and creates sanitized content object.
 * 
 * The sanitization process includes:
 * - Content-type specific sanitization rules application for text/plain and application/json
 * - Sensitive information removal with pattern-based detection and redaction
 * - Content length limit enforcement to prevent oversized responses
 * - Dangerous character escaping for security protection against XSS attacks
 * - Endpoint-specific format requirement validation and enforcement
 * - Control character removal and encoding normalization for proper text formatting
 * - JSON structure sanitization with recursive object cleaning
 * 
 * @param {any} content - Response content to sanitize for security and information disclosure prevention
 * @param {string} contentType - Content-Type header value for format-specific sanitization rules
 * @param {Object} sanitizationRules - Sanitization rules object containing security settings and content policies
 * @returns {any} Sanitized response content safe for client transmission with sanitization action log
 */
function sanitizeResponseContent(content, contentType, sanitizationRules = {}) {
    try {
        // Initialize sanitization result object with action tracking
        const sanitizationResult = {
            sanitizedContent: content,
            sanitizationActions: [],
            originalSize: 0,
            sanitizedSize: 0,
            securityIssuesFound: [],
            metadata: {
                contentType: contentType,
                sanitizationTimestamp: new Date().toISOString(),
                rules: sanitizationRules
            }
        };

        // Calculate original content size for tracking
        sanitizationResult.originalSize = typeof content === 'string' ? 
                                         content.length : 
                                         JSON.stringify(content || '').length;

        // Return early if content is null or undefined
        if (content === null || content === undefined) {
            sanitizationResult.sanitizedContent = content;
            sanitizationResult.sanitizedSize = 0;
            return sanitizationResult;
        }

        // Apply content-type specific sanitization rules
        if (contentType && contentType.includes('text/plain')) {
            // Sanitize plain text content
            sanitizationResult.sanitizedContent = sanitizeTextContent(
                content, 
                sanitizationRules, 
                sanitizationResult.sanitizationActions
            );
        } else if (contentType && contentType.includes('application/json')) {
            // Sanitize JSON content
            sanitizationResult.sanitizedContent = sanitizeJsonContent(
                content, 
                sanitizationRules, 
                sanitizationResult.sanitizationActions
            );
        } else {
            // Generic content sanitization for other content types
            sanitizationResult.sanitizedContent = sanitizeGenericContent(
                content, 
                sanitizationRules, 
                sanitizationResult.sanitizationActions
            );
        }

        // Apply content length limits to prevent oversized responses
        const maxContentLength = sanitizationRules.maxLength || 1024 * 1024; // 1MB default
        if (sanitizationResult.sanitizedContent && 
            typeof sanitizationResult.sanitizedContent === 'string' && 
            sanitizationResult.sanitizedContent.length > maxContentLength) {
            
            sanitizationResult.sanitizedContent = sanitizationResult.sanitizedContent.substring(0, maxContentLength);
            sanitizationResult.sanitizationActions.push({
                action: 'content_truncated',
                description: `Content truncated to ${maxContentLength} characters`,
                originalLength: sanitizationResult.originalSize,
                newLength: maxContentLength
            });
        }

        // Remove potentially sensitive information from response content
        if (typeof sanitizationResult.sanitizedContent === 'string') {
            const sensitivePatterns = [
                { pattern: /password["\s]*[:=]["\s]*[^"\s,}]+/gi, replacement: 'password":"[REDACTED]"', name: 'password' },
                { pattern: /token["\s]*[:=]["\s]*[^"\s,}]+/gi, replacement: 'token":"[REDACTED]"', name: 'token' },
                { pattern: /secret["\s]*[:=]["\s]*[^"\s,}]+/gi, replacement: 'secret":"[REDACTED]"', name: 'secret' },
                { pattern: /key["\s]*[:=]["\s]*[^"\s,}]+/gi, replacement: 'key":"[REDACTED]"', name: 'api_key' },
                { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, replacement: '[EMAIL_REDACTED]', name: 'email' }
            ];

            sensitivePatterns.forEach(({ pattern, replacement, name }) => {
                if (pattern.test(sanitizationResult.sanitizedContent)) {
                    sanitizationResult.sanitizedContent = sanitizationResult.sanitizedContent.replace(pattern, replacement);
                    sanitizationResult.sanitizationActions.push({
                        action: 'sensitive_data_redacted',
                        description: `Redacted ${name} information`,
                        pattern: name
                    });
                    sanitizationResult.securityIssuesFound.push(name);
                }
            });
        }

        // Validate content against endpoint-specific format requirements
        if (sanitizationRules.preserveStructure === true && typeof content === 'object') {
            // For structured content, ensure required fields are preserved
            const originalKeys = Object.keys(content || {});
            const sanitizedKeys = Object.keys(sanitizationResult.sanitizedContent || {});
            
            const missingKeys = originalKeys.filter(key => !sanitizedKeys.includes(key));
            if (missingKeys.length > 0) {
                sanitizationResult.sanitizationActions.push({
                    action: 'structure_modified',
                    description: 'Some object keys were removed during sanitization',
                    removedKeys: missingKeys
                });
            }
        }

        // Calculate sanitized content size for comparison
        sanitizationResult.sanitizedSize = typeof sanitizationResult.sanitizedContent === 'string' ? 
                                          sanitizationResult.sanitizedContent.length : 
                                          JSON.stringify(sanitizationResult.sanitizedContent || '').length;

        // Update global sanitization statistics
        if (sanitizationResult.sanitizationActions.length > 0) {
            RESPONSE_VALIDATION_STATS.sanitization_count += 1;
            
            if (sanitizationResult.securityIssuesFound.length > 0) {
                RESPONSE_VALIDATION_STATS.security_violations += sanitizationResult.securityIssuesFound.length;
            }
        }

        // Log sanitization actions if significant changes were made
        if (sanitizationResult.sanitizationActions.length > 0) {
            logger.info('Content sanitization performed', {
                component: 'ResponseValidator',
                contentType: contentType,
                originalSize: sanitizationResult.originalSize,
                sanitizedSize: sanitizationResult.sanitizedSize,
                actionsCount: sanitizationResult.sanitizationActions.length,
                securityIssuesFound: sanitizationResult.securityIssuesFound.length,
                actions: sanitizationResult.sanitizationActions.map(a => a.action)
            });
        }

        // Return sanitized content object with comprehensive action log
        return sanitizationResult;

    } catch (error) {
        // Handle sanitization errors gracefully - return original content with error log
        logger.error('Content sanitization failed', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            contentType: contentType,
            contentSize: typeof content === 'string' ? content.length : 'unknown'
        });

        // Return original content with error information
        return {
            sanitizedContent: content,
            sanitizationActions: [{
                action: 'sanitization_failed',
                description: 'Sanitization process failed, returning original content',
                error: error.message
            }],
            originalSize: typeof content === 'string' ? content.length : 0,
            sanitizedSize: typeof content === 'string' ? content.length : 0,
            securityIssuesFound: [],
            metadata: {
                contentType: contentType,
                sanitizationTimestamp: new Date().toISOString(),
                sanitizationError: true,
                rules: sanitizationRules
            }
        };
    }
}

/**
 * Sanitizes plain text content for security and formatting compliance.
 * @param {string} content - Plain text content to sanitize
 * @param {Object} rules - Sanitization rules for text content
 * @param {Array} actions - Array to collect sanitization actions
 * @returns {string} Sanitized text content
 */
function sanitizeTextContent(content, rules, actions) {
    if (typeof content !== 'string') {
        return String(content || '');
    }

    let sanitizedText = content;

    // Remove or replace control characters
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(sanitizedText)) {
        sanitizedText = sanitizedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        actions.push({
            action: 'control_characters_removed',
            description: 'Removed control characters from text content'
        });
    }

    // Normalize whitespace if required
    if (rules.normalizeWhitespace !== false) {
        const originalWhitespaceCount = (sanitizedText.match(/\s+/g) || []).length;
        sanitizedText = sanitizedText.replace(/\s+/g, ' ').trim();
        const newWhitespaceCount = (sanitizedText.match(/\s+/g) || []).length;
        
        if (originalWhitespaceCount !== newWhitespaceCount) {
            actions.push({
                action: 'whitespace_normalized',
                description: 'Normalized whitespace in text content'
            });
        }
    }

    // Remove HTML if not allowed
    if (rules.allowHtml === false && /<[^>]*>/g.test(sanitizedText)) {
        sanitizedText = sanitizedText.replace(/<[^>]*>/g, '');
        actions.push({
            action: 'html_tags_removed',
            description: 'Removed HTML tags from text content'
        });
    }

    return sanitizedText;
}

/**
 * Sanitizes JSON content for security and structure compliance.
 * @param {any} content - JSON content to sanitize
 * @param {Object} rules - Sanitization rules for JSON content
 * @param {Array} actions - Array to collect sanitization actions
 * @returns {any} Sanitized JSON content
 */
function sanitizeJsonContent(content, rules, actions) {
    try {
        let jsonContent = content;
        
        // Parse string JSON if necessary
        if (typeof content === 'string') {
            jsonContent = JSON.parse(content);
        }

        // Recursively sanitize object properties
        const sanitizedJson = sanitizeJsonObject(jsonContent, rules, actions, 0);
        
        // Convert back to string if original was string
        return typeof content === 'string' ? JSON.stringify(sanitizedJson) : sanitizedJson;
        
    } catch (parseError) {
        actions.push({
            action: 'json_parse_failed',
            description: 'Failed to parse JSON content, treating as string',
            error: parseError.message
        });
        
        // Fall back to string sanitization
        return sanitizeTextContent(String(content), rules, actions);
    }
}

/**
 * Recursively sanitizes JSON objects.
 * @param {any} obj - JSON object to sanitize
 * @param {Object} rules - Sanitization rules
 * @param {Array} actions - Array to collect sanitization actions
 * @param {number} depth - Current recursion depth
 * @returns {any} Sanitized JSON object
 */
function sanitizeJsonObject(obj, rules, actions, depth) {
    // Prevent deep recursion
    if (depth > 10) {
        actions.push({
            action: 'deep_recursion_stopped',
            description: 'Stopped sanitization due to deep object nesting'
        });
        return obj;
    }

    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeJsonObject(item, rules, actions, depth + 1));
    }

    const sanitizedObj = {};
    
    Object.keys(obj).forEach(key => {
        // Sanitize property names
        let sanitizedKey = key;
        if (rules.allowScripts === false && /script|javascript|eval|function/i.test(key)) {
            sanitizedKey = key.replace(/script|javascript|eval|function/gi, '[SCRIPT_REDACTED]');
            actions.push({
                action: 'dangerous_property_name_sanitized',
                description: `Sanitized potentially dangerous property name: ${key}`
            });
        }

        // Recursively sanitize property values
        const value = obj[key];
        let sanitizedValue = value;

        if (typeof value === 'string') {
            sanitizedValue = sanitizeTextContent(value, rules, actions);
        } else if (typeof value === 'object') {
            sanitizedValue = sanitizeJsonObject(value, rules, actions, depth + 1);
        }

        sanitizedObj[sanitizedKey] = sanitizedValue;
    });

    return sanitizedObj;
}

/**
 * Sanitizes generic content for unknown content types.
 * @param {any} content - Generic content to sanitize
 * @param {Object} rules - Sanitization rules
 * @param {Array} actions - Array to collect sanitization actions
 * @returns {any} Sanitized generic content
 */
function sanitizeGenericContent(content, rules, actions) {
    if (typeof content === 'string') {
        return sanitizeTextContent(content, rules, actions);
    }
    
    if (typeof content === 'object' && content !== null) {
        try {
            return sanitizeJsonObject(content, rules, actions, 0);
        } catch (error) {
            actions.push({
                action: 'generic_sanitization_failed',
                description: 'Failed to sanitize object content',
                error: error.message
            });
            return content;
        }
    }
    
    return content;
}

// =============================================================================
// PERFORMANCE VALIDATION
// =============================================================================

/**
 * Validates response generation timing against performance requirements and SLA thresholds.
 * This function checks response time against endpoint-specific SLA requirements, validates response time
 * against performance thresholds, creates performance validation result, logs performance warnings,
 * updates performance statistics, and returns timing validation result.
 * 
 * The timing validation process includes:
 * - Response time validation against endpoint-specific SLA requirements and thresholds
 * - Hello endpoint performance validation with 50ms target response time
 * - Health endpoint performance validation with 10ms target response time
 * - Performance threshold comparison with warning and critical level detection
 * - Performance statistics updating for monitoring dashboard integration
 * - SLA compliance tracking with violation detection and alerting
 * - Performance trend analysis for operational monitoring and optimization
 * 
 * @param {number} responseTime - Response time in milliseconds to validate against performance requirements
 * @param {string} endpoint - Endpoint path for endpoint-specific performance threshold application
 * @returns {Object} Response timing validation result with performance metrics and SLA compliance information
 */
function validateResponseTiming(responseTime, endpoint) {
    try {
        // Initialize timing validation result object
        const timingResult = {
            isValid: false,
            validationType: 'response_timing',
            endpoint: endpoint,
            responseTime: responseTime,
            errors: [],
            warnings: [],
            performanceMetrics: {},
            metadata: {
                validationTimestamp: new Date().toISOString(),
                endpoint: endpoint
            }
        };

        // Validate response time parameter
        if (typeof responseTime !== 'number' || responseTime < 0) {
            timingResult.errors.push({
                code: 'INVALID_RESPONSE_TIME',
                message: 'Response time must be a non-negative number',
                actualValue: responseTime,
                actualType: typeof responseTime,
                severity: 'error'
            });
            return timingResult;
        }

        // Get endpoint-specific performance requirements
        const endpointSpec = ENDPOINT_RESPONSE_SPECS[endpoint];
        let maxResponseTime = 100; // Default maximum response time in milliseconds
        
        if (endpointSpec && endpointSpec.maxResponseTime) {
            maxResponseTime = endpointSpec.maxResponseTime;
        }

        // Define performance thresholds based on endpoint requirements
        const performanceThresholds = {
            excellent: maxResponseTime * 0.25,  // 25% of max time
            good: maxResponseTime * 0.5,        // 50% of max time
            acceptable: maxResponseTime * 0.75,  // 75% of max time
            warning: maxResponseTime,           // At max time limit
            critical: maxResponseTime * 1.5     // 150% of max time (SLA violation)
        };

        // Evaluate response time against performance thresholds
        let performanceLevel = 'critical';
        if (responseTime <= performanceThresholds.excellent) {
            performanceLevel = 'excellent';
        } else if (responseTime <= performanceThresholds.good) {
            performanceLevel = 'good';
        } else if (responseTime <= performanceThresholds.acceptable) {
            performanceLevel = 'acceptable';
        } else if (responseTime <= performanceThresholds.warning) {
            performanceLevel = 'warning';
        }

        // Add performance level to metrics
        timingResult.performanceMetrics = {
            responseTime: responseTime,
            maxAllowedTime: maxResponseTime,
            performanceLevel: performanceLevel,
            thresholds: performanceThresholds,
            slaCompliant: responseTime <= maxResponseTime
        };

        // Check response time against endpoint-specific SLA requirements
        if (endpoint === ROUTES.HELLO) {
            // For hello endpoint, validate response time is under 50ms target
            if (responseTime > 50) {
                if (responseTime > 100) {
                    timingResult.errors.push({
                        code: 'HELLO_RESPONSE_TIME_CRITICAL',
                        message: 'Hello endpoint response time exceeds critical threshold',
                        responseTime: responseTime,
                        threshold: 100,
                        endpoint: endpoint,
                        severity: 'error'
                    });
                } else {
                    timingResult.warnings.push({
                        code: 'HELLO_RESPONSE_TIME_SLOW',
                        message: 'Hello endpoint response time exceeds target',
                        responseTime: responseTime,
                        target: 50,
                        endpoint: endpoint,
                        severity: 'warning'
                    });
                }
            }
        } else if ([ROUTES.HEALTH, ROUTES.READINESS, ROUTES.LIVENESS].includes(endpoint)) {
            // For health endpoints, validate response time is under 10ms target
            if (responseTime > 10) {
                if (responseTime > 50) {
                    timingResult.errors.push({
                        code: 'HEALTH_RESPONSE_TIME_CRITICAL',
                        message: 'Health endpoint response time exceeds critical threshold',
                        responseTime: responseTime,
                        threshold: 50,
                        endpoint: endpoint,
                        severity: 'error'
                    });
                } else {
                    timingResult.warnings.push({
                        code: 'HEALTH_RESPONSE_TIME_SLOW',
                        message: 'Health endpoint response time exceeds target',
                        responseTime: responseTime,
                        target: 10,
                        endpoint: endpoint,
                        severity: 'warning'
                    });
                }
            }
        }

        // Set validation success based on SLA compliance
        timingResult.isValid = timingResult.performanceMetrics.slaCompliant && timingResult.errors.length === 0;

        // Update global timing violation statistics
        if (!timingResult.performanceMetrics.slaCompliant) {
            RESPONSE_VALIDATION_STATS.timing_violations += 1;
        }

        // Log performance warnings if response time exceeds thresholds
        if (performanceLevel === 'warning' || performanceLevel === 'critical') {
            logger.warn('Response timing validation detected performance issue', {
                component: 'ResponseValidator',
                validationType: 'response_timing',
                endpoint: endpoint,
                responseTime: responseTime,
                performanceLevel: performanceLevel,
                maxAllowedTime: maxResponseTime,
                slaCompliant: timingResult.performanceMetrics.slaCompliant
            });
        }

        // Update performance statistics for monitoring dashboards
        const currentStats = RESPONSE_VALIDATION_STATS.performance_metrics;
        
        // Update timing statistics
        if (responseTime > currentStats.slowest_validation) {
            currentStats.slowest_validation = responseTime;
        }
        if (responseTime < currentStats.fastest_validation) {
            currentStats.fastest_validation = responseTime;
        }

        // Add timing validation metadata
        timingResult.metadata.timingValidation = {
            performanceLevel: performanceLevel,
            slaCompliant: timingResult.performanceMetrics.slaCompliant,
            thresholdExceeded: responseTime > maxResponseTime,
            validationRulesApplied: [
                'response_time_validation',
                'performance_level_assessment',
                'sla_compliance_check',
                `${endpoint.replace('/', '')}_specific_timing`
            ]
        };

        // Return timing validation result for operational monitoring
        return timingResult;

    } catch (error) {
        // Handle timing validation errors gracefully
        logger.error('Response timing validation failed', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            responseTime: responseTime,
            endpoint: endpoint
        });

        // Return error validation result
        return {
            isValid: false,
            validationType: 'response_timing',
            endpoint: endpoint,
            responseTime: responseTime,
            errors: [{
                code: 'TIMING_VALIDATION_EXCEPTION',
                message: 'Timing validation failed due to internal error',
                error: error.message,
                severity: 'error'
            }],
            warnings: [],
            performanceMetrics: {},
            metadata: {
                validationTimestamp: new Date().toISOString(),
                validationError: true,
                endpoint: endpoint
            }
        };
    }
}

// =============================================================================
// STATISTICS AND MONITORING
// =============================================================================

/**
 * Returns response validation statistics for monitoring and operational insights.
 * This function returns current RESPONSE_VALIDATION_STATS object, calculates validation success rate,
 * includes breakdown of validation failures, adds validation performance metrics, includes endpoint-specific
 * validation statistics, and returns comprehensive statistics object.
 * 
 * The statistics generation includes:
 * - Overall validation statistics with total, passed, and failed validation counts
 * - Success rate calculation with percentage and trend analysis
 * - Endpoint-specific breakdown with individual success rates and error patterns
 * - Error type analysis with categorization and frequency tracking
 * - Performance metrics with timing analysis and SLA compliance rates
 * - Security violation tracking with threat pattern identification
 * - Content sanitization statistics with action frequency and security improvements
 * - Real-time monitoring data optimized for dashboard integration
 * 
 * @returns {Object} Response validation statistics including success rates, error types, performance metrics, and operational insights
 */
function getResponseValidationStats() {
    try {
        // Calculate validation success rate from passed/total ratios
        const totalValidations = RESPONSE_VALIDATION_STATS.total;
        const passedValidations = RESPONSE_VALIDATION_STATS.passed;
        const failedValidations = RESPONSE_VALIDATION_STATS.failed;
        
        const successRate = totalValidations > 0 ? (passedValidations / totalValidations * 100) : 0;
        const failureRate = totalValidations > 0 ? (failedValidations / totalValidations * 100) : 0;

        // Calculate endpoint-specific success rates and statistics
        const endpointStats = {};
        Object.keys(RESPONSE_VALIDATION_STATS.by_endpoint).forEach(endpoint => {
            const endpointData = RESPONSE_VALIDATION_STATS.by_endpoint[endpoint];
            endpointStats[endpoint] = {
                ...endpointData,
                successRate: endpointData.total > 0 ? (endpointData.passed / endpointData.total * 100) : 0,
                failureRate: endpointData.total > 0 ? (endpointData.failed / endpointData.total * 100) : 0
            };
        });

        // Calculate content type distribution statistics
        const contentTypeStats = {};
        Object.keys(RESPONSE_VALIDATION_STATS.by_content_type).forEach(contentType => {
            const count = RESPONSE_VALIDATION_STATS.by_content_type[contentType];
            contentTypeStats[contentType] = {
                count: count,
                percentage: totalValidations > 0 ? (count / totalValidations * 100) : 0
            };
        });

        // Calculate performance metrics and SLA compliance
        const performanceMetrics = {
            ...RESPONSE_VALIDATION_STATS.performance_metrics,
            validationsPerformed: totalValidations,
            slaCompliance: {
                totalViolations: RESPONSE_VALIDATION_STATS.timing_violations,
                complianceRate: totalValidations > 0 ? 
                              ((totalValidations - RESPONSE_VALIDATION_STATS.timing_violations) / totalValidations * 100) : 100
            }
        };

        // Calculate security metrics and threat analysis
        const securityMetrics = {
            totalViolations: RESPONSE_VALIDATION_STATS.security_violations,
            violationRate: totalValidations > 0 ? (RESPONSE_VALIDATION_STATS.security_violations / totalValidations * 100) : 0,
            contentSanitized: RESPONSE_VALIDATION_STATS.sanitization_count,
            sanitizationRate: totalValidations > 0 ? (RESPONSE_VALIDATION_STATS.sanitization_count / totalValidations * 100) : 0
        };

        // Create comprehensive statistics object with operational metrics
        const comprehensiveStats = {
            // Overall validation statistics
            overview: {
                total: totalValidations,
                passed: passedValidations,
                failed: failedValidations,
                successRate: parseFloat(successRate.toFixed(2)),
                failureRate: parseFloat(failureRate.toFixed(2))
            },

            // Endpoint-specific validation breakdown
            endpoints: endpointStats,

            // Content type distribution analysis
            contentTypes: contentTypeStats,

            // HTTP status code distribution
            statusCodes: { ...RESPONSE_VALIDATION_STATS.by_status_code },

            // Performance and timing metrics
            performance: performanceMetrics,

            // Security and sanitization metrics
            security: securityMetrics,

            // System health and operational status
            system: {
                validatorInitialized: VALIDATION_CONFIG !== null,
                endpointsConfigured: Object.keys(ENDPOINT_RESPONSE_SPECS).length,
                validationConfigLoaded: VALIDATION_CONFIG !== null,
                initializationTimestamp: RESPONSE_VALIDATION_STATS.initialization_timestamp || null,
                uptime: RESPONSE_VALIDATION_STATS.initialization_timestamp ? 
                       Date.now() - new Date(RESPONSE_VALIDATION_STATS.initialization_timestamp).getTime() : null
            },

            // Real-time monitoring data
            monitoring: {
                timestamp: new Date().toISOString(),
                validationsLastHour: totalValidations, // Simplified for tutorial
                trendAnalysis: {
                    successTrend: successRate > 95 ? 'excellent' : successRate > 80 ? 'good' : 'needs_attention',
                    performanceTrend: performanceMetrics.average_validation_time < 10 ? 'excellent' : 
                                     performanceMetrics.average_validation_time < 50 ? 'good' : 'needs_attention',
                    securityTrend: securityMetrics.violationRate < 1 ? 'excellent' : 
                                  securityMetrics.violationRate < 5 ? 'acceptable' : 'concerning'
                },
                alerts: generateStatsAlerts(successRate, performanceMetrics, securityMetrics)
            },

            // Metadata for statistics context
            metadata: {
                statisticsVersion: '1.0.0',
                generationTimestamp: new Date().toISOString(),
                dataRetentionPeriod: 'session', // For tutorial simplicity
                metricsCollectionStarted: RESPONSE_VALIDATION_STATS.initialization_timestamp
            }
        };

        // Log statistics access for monitoring
        logger.debug('Response validation statistics accessed', {
            component: 'ResponseValidator',
            totalValidations: totalValidations,
            successRate: successRate,
            endpointCount: Object.keys(endpointStats).length,
            timestamp: new Date().toISOString()
        });

        // Return comprehensive statistics object for monitoring dashboards
        return Object.freeze(comprehensiveStats);

    } catch (error) {
        // Handle statistics generation errors gracefully
        logger.error('Failed to generate response validation statistics', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator'
        });

        // Return minimal fallback statistics
        return {
            overview: {
                total: RESPONSE_VALIDATION_STATS.total || 0,
                passed: RESPONSE_VALIDATION_STATS.passed || 0,
                failed: RESPONSE_VALIDATION_STATS.failed || 0,
                successRate: 0,
                failureRate: 0
            },
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            metadata: {
                statisticsVersion: '1.0.0',
                generationTimestamp: new Date().toISOString(),
                fallbackMode: true
            }
        };
    }
}

/**
 * Generates alert conditions based on validation statistics.
 * @param {number} successRate - Current validation success rate
 * @param {Object} performanceMetrics - Performance metrics object
 * @param {Object} securityMetrics - Security metrics object
 * @returns {Array} Array of alert objects with severity and messages
 */
function generateStatsAlerts(successRate, performanceMetrics, securityMetrics) {
    const alerts = [];

    // Success rate alerts
    if (successRate < 90) {
        alerts.push({
            type: 'success_rate',
            severity: successRate < 70 ? 'critical' : 'warning',
            message: `Validation success rate (${successRate.toFixed(1)}%) is below acceptable threshold`,
            threshold: 90,
            actualValue: successRate
        });
    }

    // Performance alerts
    if (performanceMetrics.average_validation_time > 100) {
        alerts.push({
            type: 'performance',
            severity: performanceMetrics.average_validation_time > 500 ? 'critical' : 'warning',
            message: `Average validation time (${performanceMetrics.average_validation_time.toFixed(2)}ms) exceeds threshold`,
            threshold: 100,
            actualValue: performanceMetrics.average_validation_time
        });
    }

    // Security alerts
    if (securityMetrics.violationRate > 5) {
        alerts.push({
            type: 'security',
            severity: securityMetrics.violationRate > 10 ? 'critical' : 'warning',
            message: `Security violation rate (${securityMetrics.violationRate.toFixed(1)}%) exceeds acceptable threshold`,
            threshold: 5,
            actualValue: securityMetrics.violationRate
        });
    }

    return alerts;
}

/**
 * Resets response validation statistics for testing or operational monitoring reset.
 * This function resets RESPONSE_VALIDATION_STATS counters, clears endpoint-specific validation statistics,
 * resets validation timing and performance metrics, logs statistics reset event, and maintains
 * validation configuration and rules unchanged.
 * 
 * The statistics reset process includes:
 * - Complete validation counter reset with total, passed, and failed counts
 * - Endpoint-specific statistics clearing with individual endpoint data removal
 * - Content type and status code distribution reset for fresh tracking
 * - Performance metrics reset with timing statistics initialization
 * - Security metrics reset with violation and sanitization counters
 * - Reset event logging with timestamp and operational context
 * - Configuration preservation to maintain validation rule integrity
 * 
 * @returns {void} No return value - resets global response validation statistics and performance tracking
 */
function resetResponseValidationStats() {
    try {
        // Store previous statistics for logging purposes
        const previousTotal = RESPONSE_VALIDATION_STATS.total;
        const previousPassed = RESPONSE_VALIDATION_STATS.passed;
        const previousFailed = RESPONSE_VALIDATION_STATS.failed;

        // Reset RESPONSE_VALIDATION_STATS counters to zero
        RESPONSE_VALIDATION_STATS.total = 0;
        RESPONSE_VALIDATION_STATS.passed = 0;
        RESPONSE_VALIDATION_STATS.failed = 0;

        // Clear endpoint-specific validation statistics
        RESPONSE_VALIDATION_STATS.by_endpoint = {};

        // Clear status code and content type distribution tracking
        RESPONSE_VALIDATION_STATS.by_status_code = {};
        RESPONSE_VALIDATION_STATS.by_content_type = {};

        // Reset validation timing and performance metrics
        RESPONSE_VALIDATION_STATS.performance_metrics = {
            average_validation_time: 0,
            slowest_validation: 0,
            fastest_validation: Infinity,
            total_validation_time: 0
        };

        // Reset security and sanitization counters
        RESPONSE_VALIDATION_STATS.security_violations = 0;
        RESPONSE_VALIDATION_STATS.sanitization_count = 0;
        RESPONSE_VALIDATION_STATS.timing_violations = 0;

        // Update reset metadata
        RESPONSE_VALIDATION_STATS.last_reset_timestamp = new Date().toISOString();
        RESPONSE_VALIDATION_STATS.reset_count = (RESPONSE_VALIDATION_STATS.reset_count || 0) + 1;

        // Log statistics reset event with timestamp and previous values
        logger.info('Response validation statistics reset', {
            component: 'ResponseValidator',
            resetTimestamp: new Date().toISOString(),
            previousStats: {
                total: previousTotal,
                passed: previousPassed,
                failed: previousFailed
            },
            resetCount: RESPONSE_VALIDATION_STATS.reset_count,
            configurationPreserved: VALIDATION_CONFIG !== null,
            endpointSpecsPreserved: Object.keys(ENDPOINT_RESPONSE_SPECS).length
        });

    } catch (error) {
        // Handle statistics reset errors gracefully
        logger.error('Failed to reset response validation statistics', {
            error: error.message,
            errorType: error.constructor.name,
            component: 'ResponseValidator',
            resetTimestamp: new Date().toISOString()
        });

        // Attempt partial reset to ensure system continues functioning
        try {
            RESPONSE_VALIDATION_STATS.total = 0;
            RESPONSE_VALIDATION_STATS.passed = 0;
            RESPONSE_VALIDATION_STATS.failed = 0;
            RESPONSE_VALIDATION_STATS.last_reset_timestamp = new Date().toISOString();
            RESPONSE_VALIDATION_STATS.partial_reset = true;
        } catch (partialResetError) {
            logger.error('Partial statistics reset also failed', {
                error: partialResetError.message,
                component: 'ResponseValidator'
            });
        }
    }
}

// =============================================================================
// RESPONSE VALIDATOR OBJECT AND EXPORTS
// =============================================================================

/**
 * Main response validator object providing unified access to all response validation functions.
 * This object exposes comprehensive response validation functionality with consistent interface
 * for status, header, and body validation, plus specialized endpoint validation and middleware integration.
 * 
 * @type {Object}
 */
const responseValidator = Object.freeze({
    // Specialized endpoint validation methods
    validateHello: validateHelloResponse,
    validateHealth: validateHealthResponse,
    
    // Express.js middleware factory for automated response validation
    createMiddleware: createResponseValidationMiddleware,
    
    // Statistics and monitoring utilities
    getStats: getResponseValidationStats,
    
    // Content sanitization utility for security and format compliance
    sanitizeContent: sanitizeResponseContent
});

// Initialize the response validator system when the module is loaded
// This ensures the validator is ready for use as soon as the module is imported
initializeResponseValidator();

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Primary validation functions for individual response components
    validateHelloResponse,
    validateHealthResponse,
    createResponseValidationMiddleware,
    validateResponseStatus,
    validateResponseHeaders,
    validateResponseBody,
    sanitizeResponseContent,
    getResponseValidationStats,
    
    // Main response validator object providing unified access to all validation functions
    responseValidator
};