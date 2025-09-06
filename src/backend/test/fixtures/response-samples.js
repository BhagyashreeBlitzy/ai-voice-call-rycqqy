/**
 * Comprehensive HTTP Response Fixtures Module for Node.js Tutorial Application
 * 
 * This module provides standardized HTTP response samples for testing the Node.js tutorial 
 * application endpoints. Contains mock HTTP response objects, status codes, headers, body content,
 * and metadata for hello endpoint, health check endpoints, error scenarios, and performance 
 * testing validation. Serves as centralized test data for response validation in unit tests,
 * integration tests, and API endpoint testing with Jest and Supertest frameworks.
 * 
 * Supports Express.js 5.1.0 response patterns and Node.js 22.x LTS educational objectives
 * by providing comprehensive response fixtures that complement request-samples.js for complete 
 * HTTP testing coverage. Includes response builders, validation helpers, and performance testing
 * configurations for educational demonstration of testing best practices.
 * 
 * Features:
 * - Hello Endpoint Response Fixtures with proper status codes and content
 * - Health Check Response Samples for /health, /livez, and /readyz endpoints  
 * - HTTP Error Response Fixtures for 404, 405, 400, 500, and 503 scenarios
 * - Performance Testing Response Configurations with timing validation
 * - Response Builder Functions for dynamic fixture creation
 * - Response Validation Utilities for fixture integrity checking
 * - Concurrent Response Batch Generation for load testing
 * - Template-based Response Configuration System
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// No external dependencies - using only Node.js built-in modules for response fixtures

// =============================================================================
// INTERNAL IMPORTS
// =============================================================================

const {
    HTTP_STATUS,
    CONTENT_TYPES,
    ERROR_MESSAGES,
    APPLICATION_METADATA
} = require('../../src/utils/constants.js');

const {
    testConstants
} = require('./test-data.js');

// =============================================================================
// GLOBAL RESPONSE FIXTURE CONSTANTS
// =============================================================================

/**
 * Consistent timestamp for response fixtures and test data
 * Ensures deterministic test results and predictable response metadata
 * @type {string}
 */
const RESPONSE_TIMESTAMP = '2024-01-01T00:00:00.000Z';

/**
 * Counter for generating unique response correlation IDs
 * Incremented for each response fixture creation for tracking and debugging
 * @type {number}
 */
let RESPONSE_ID_COUNTER = 0;

/**
 * Standard Express.js response headers for consistent fixture formatting
 * Contains default headers that Express.js includes in HTTP responses
 * @type {object}
 */
const DEFAULT_RESPONSE_HEADERS = {
    'x-powered-by': 'Express',
    'connection': 'keep-alive'
};

/**
 * Static hello endpoint response content for consistency
 * Centralized content string for all hello endpoint response fixtures
 * @type {string}
 */
const HELLO_RESPONSE_CONTENT = 'Hello world';

/**
 * Server information for health responses and metadata
 * Provides application identification in health check and system responses
 * @type {object}
 */
const TEST_SERVER_INFO = {
    server: 'Node.js/Express.js Tutorial',
    nodeVersion: process.version
};

// =============================================================================
// RESPONSE BUILDER FUNCTIONS
// =============================================================================

/**
 * Creates standardized hello endpoint response fixture with proper status code, headers,
 * and 'Hello world' content. Provides complete HTTP response configuration with test
 * metadata for comprehensive response validation in unit and integration tests.
 * 
 * @param {object} responseOptions - Configuration options for customizing the hello response
 * @param {number} responseOptions.statusCode - Override default HTTP 200 OK status
 * @param {object} responseOptions.headers - Additional headers to merge with defaults
 * @param {string} responseOptions.content - Override default 'Hello world' content
 * @param {boolean} responseOptions.includeTimestamp - Include response timestamp metadata
 * @param {string} responseOptions.correlationId - Custom correlation ID for tracking
 * @returns {object} Complete HTTP response fixture with status, headers, body, and test metadata
 */
function createHelloResponse(responseOptions = {}) {
    // Initialize response fixture with HTTP_STATUS.OK (200) status code
    const statusCode = responseOptions.statusCode || HTTP_STATUS.OK;
    
    // Set Content-Type header to CONTENT_TYPES.TEXT_PLAIN for plain text response
    const baseHeaders = {
        'content-type': CONTENT_TYPES.TEXT_PLAIN,
        ...DEFAULT_RESPONSE_HEADERS
    };
    
    // Set response body to HELLO_RESPONSE_CONTENT ('Hello world')
    const responseBody = responseOptions.content || HELLO_RESPONSE_CONTENT;
    
    // Calculate Content-Length based on response body byte length
    const contentLength = Buffer.byteLength(responseBody, 'utf8').toString();
    baseHeaders['content-length'] = contentLength;
    
    // Add standard Express.js response headers from DEFAULT_RESPONSE_HEADERS
    const responseHeaders = {
        ...baseHeaders,
        ...responseOptions.headers
    };
    
    // Include response timestamp using RESPONSE_TIMESTAMP for consistency
    const timestamp = responseOptions.includeTimestamp !== false ? RESPONSE_TIMESTAMP : undefined;
    
    // Generate unique response correlation ID for tracking and debugging
    const correlationId = responseOptions.correlationId || generateResponseId('hello');
    
    // Add response timing for performance validation
    const responseTime = responseOptions.responseTime || Math.floor(Math.random() * testConstants.PERFORMANCE_THRESHOLDS.fast);
    
    // Apply responseOptions overrides for customized test scenarios
    const customMetadata = responseOptions.metadata || {};
    
    // Add test metadata including expected content and validation criteria
    const testMetadata = {
        expectedContent: responseBody,
        expectedContentType: CONTENT_TYPES.TEXT_PLAIN,
        expectedStatusCode: statusCode,
        validationCriteria: {
            contentMatch: 'exact',
            statusCodeMatch: 'exact',
            headerValidation: 'required',
            performanceThreshold: testConstants.PERFORMANCE_THRESHOLDS.fast
        },
        ...customMetadata
    };
    
    // Return complete response fixture object for test assertions
    return {
        statusCode,
        headers: responseHeaders,
        body: responseBody,
        timestamp,
        correlationId,
        responseTime,
        metadata: testMetadata,
        fixture: {
            type: 'hello_response',
            version: '1.0.0',
            createdAt: new Date().toISOString()
        }
    };
}

/**
 * Creates health check endpoint response fixtures for /health, /livez, and /readyz endpoints
 * with JSON status data. Provides Kubernetes probe compatibility and comprehensive system
 * health information for monitoring and observability testing scenarios.
 * 
 * @param {string} healthType - Type of health check (health, livez, readyz)
 * @param {object} healthData - Health status data including system metrics and checks
 * @param {object} options - Additional configuration options for health response
 * @returns {object} Health check response fixture with JSON body and appropriate status code
 */
function createHealthResponse(healthType = 'health', healthData = {}, options = {}) {
    // Validate healthType parameter against supported health check types
    const validHealthTypes = ['health', 'livez', 'readyz'];
    if (!validHealthTypes.includes(healthType)) {
        throw new Error(`Invalid health type: ${healthType}. Must be one of: ${validHealthTypes.join(', ')}`);
    }
    
    // Set Content-Type header to CONTENT_TYPES.APPLICATION_JSON for JSON responses
    const baseHeaders = {
        'content-type': CONTENT_TYPES.APPLICATION_JSON,
        ...DEFAULT_RESPONSE_HEADERS
    };
    
    // Determine appropriate HTTP status code based on healthData.status
    const isHealthy = healthData.status !== 'error' && healthData.status !== 'unhealthy';
    const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    
    // Create health response body with status, timestamp, and application metadata
    const baseHealthData = {
        status: healthData.status || 'ok',
        timestamp: RESPONSE_TIMESTAMP,
        application: {
            name: APPLICATION_METADATA.NAME,
            version: APPLICATION_METADATA.VERSION,
            description: APPLICATION_METADATA.DESCRIPTION
        },
        server: TEST_SERVER_INFO
    };
    
    // Include system metrics in response body for detailed health checks
    if (healthType === 'health' || options.includeMetrics) {
        baseHealthData.system = {
            uptime: process.uptime ? process.uptime() : 0,
            memory: {
                used: process.memoryUsage ? process.memoryUsage().heapUsed : 50000000,
                total: process.memoryUsage ? process.memoryUsage().heapTotal : 100000000
            },
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version
        };
    }
    
    // Add Kubernetes probe compatibility headers for container orchestration
    if (healthType === 'livez' || healthType === 'readyz') {
        baseHeaders['x-kubernetes-probe'] = healthType;
        baseHealthData.probe = {
            type: healthType,
            interval: healthType === 'livez' ? 30 : 10,
            timeout: healthType === 'livez' ? 5 : 3
        };
    }
    
    // Include correlation ID and request tracking metadata
    const correlationId = generateResponseId(healthType);
    baseHeaders['x-correlation-id'] = correlationId;
    
    // Apply options parameter customizations for test scenario variations
    const responseBody = {
        ...baseHealthData,
        ...healthData
    };
    
    // Calculate JSON response Content-Length for proper HTTP formatting
    const bodyString = JSON.stringify(responseBody);
    baseHeaders['content-length'] = Buffer.byteLength(bodyString, 'utf8').toString();
    
    // Add additional headers from options
    const responseHeaders = {
        ...baseHeaders,
        ...options.headers
    };
    
    // Return complete health check response fixture with validation metadata
    return {
        statusCode,
        headers: responseHeaders,
        body: bodyString,
        data: responseBody,
        timestamp: RESPONSE_TIMESTAMP,
        correlationId,
        metadata: {
            healthType,
            expectedStatus: isHealthy ? 'healthy' : 'unhealthy',
            kubernetesCompatible: healthType === 'livez' || healthType === 'readyz',
            validationCriteria: {
                requiredFields: ['status', 'timestamp'],
                statusValues: ['ok', 'error', 'unhealthy'],
                contentType: 'application/json'
            }
        },
        fixture: {
            type: `${healthType}_response`,
            version: '1.0.0',
            createdAt: new Date().toISOString()
        }
    };
}

/**
 * Creates standardized error response fixtures for various HTTP error scenarios including
 * 404, 405, and 500 errors. Provides consistent error formatting with proper status codes,
 * error messages, and debugging information for comprehensive error testing scenarios.
 * 
 * @param {number} statusCode - HTTP error status code (400-599 range)
 * @param {string} errorMessage - Error message content or key from ERROR_MESSAGES
 * @param {object} errorOptions - Additional configuration for error response customization
 * @returns {object} Error response fixture with appropriate status code, error message, and headers
 */
function createErrorResponse(statusCode, errorMessage = '', errorOptions = {}) {
    // Validate statusCode parameter is valid HTTP error status (400-599 range)
    if (statusCode < 400 || statusCode > 599) {
        throw new Error(`Invalid error status code: ${statusCode}. Must be between 400-599.`);
    }
    
    // Set appropriate Content-Type header based on error response format
    const isJsonError = errorOptions.format === 'json' || statusCode >= 500;
    const contentType = isJsonError ? CONTENT_TYPES.APPLICATION_JSON : CONTENT_TYPES.TEXT_PLAIN;
    
    // Use provided errorMessage or default from ERROR_MESSAGES constants
    let finalErrorMessage = errorMessage;
    if (!errorMessage) {
        switch (statusCode) {
            case HTTP_STATUS.NOT_FOUND:
                finalErrorMessage = ERROR_MESSAGES.ROUTE_NOT_FOUND;
                break;
            case HTTP_STATUS.METHOD_NOT_ALLOWED:
                finalErrorMessage = ERROR_MESSAGES.METHOD_NOT_ALLOWED;
                break;
            case HTTP_STATUS.INTERNAL_SERVER_ERROR:
                finalErrorMessage = ERROR_MESSAGES.INTERNAL_ERROR;
                break;
            case HTTP_STATUS.SERVICE_UNAVAILABLE:
                finalErrorMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
                break;
            default:
                finalErrorMessage = 'An error occurred';
        }
    }
    
    // Create error response body with status code, message, and timestamp
    const errorResponseData = {
        error: finalErrorMessage,
        statusCode,
        timestamp: RESPONSE_TIMESTAMP,
        path: errorOptions.path || '/unknown',
        method: errorOptions.method || 'GET'
    };
    
    // Include error correlation ID for debugging and request tracking
    const correlationId = generateResponseId('error');
    
    // Add standard error response headers including security headers
    const baseHeaders = {
        'content-type': contentType,
        'x-correlation-id': correlationId,
        'x-error-code': statusCode.toString(),
        ...DEFAULT_RESPONSE_HEADERS
    };
    
    // Format response body based on content type
    let responseBody;
    if (isJsonError) {
        responseBody = JSON.stringify(errorResponseData);
    } else {
        responseBody = finalErrorMessage;
    }
    
    // Calculate response Content-Length for proper HTTP error formatting
    baseHeaders['content-length'] = Buffer.byteLength(responseBody, 'utf8').toString();
    
    // Apply errorOptions customizations for specific error scenarios
    const responseHeaders = {
        ...baseHeaders,
        ...errorOptions.headers
    };
    
    // Include error metadata for test assertion and validation
    const errorMetadata = {
        errorType: getErrorTypeFromStatus(statusCode),
        isClientError: statusCode >= 400 && statusCode < 500,
        isServerError: statusCode >= 500,
        validationCriteria: {
            statusCodeMatch: 'exact',
            errorMessagePresent: true,
            contentTypeMatch: 'exact',
            correlationIdPresent: true
        },
        debugInfo: {
            originalMessage: errorMessage,
            mappedMessage: finalErrorMessage,
            isDefaultMessage: !errorMessage
        }
    };
    
    // Return complete error response fixture with validation criteria
    return {
        statusCode,
        headers: responseHeaders,
        body: responseBody,
        data: isJsonError ? errorResponseData : { error: finalErrorMessage },
        timestamp: RESPONSE_TIMESTAMP,
        correlationId,
        metadata: errorMetadata,
        fixture: {
            type: 'error_response',
            version: '1.0.0',
            createdAt: new Date().toISOString()
        }
    };
}

/**
 * Generates standardized HTTP response headers with Content-Type, security headers,
 * and application-specific headers. Provides comprehensive header configuration for
 * different response types and testing scenarios with proper HTTP compliance.
 * 
 * @param {object} headerOptions - Configuration options for header customization
 * @param {string} headerOptions.contentType - Content-Type header value
 * @param {number} headerOptions.contentLength - Content-Length header value
 * @param {object} headerOptions.custom - Custom headers to include
 * @param {boolean} headerOptions.includeSecurityHeaders - Include security-related headers
 * @returns {object} HTTP response headers object with standard and custom headers
 */
function generateResponseHeaders(headerOptions = {}) {
    // Initialize headers object with standard HTTP response headers
    const standardHeaders = {
        ...DEFAULT_RESPONSE_HEADERS
    };
    
    // Set Content-Type header based on response content type from headerOptions
    if (headerOptions.contentType) {
        standardHeaders['content-type'] = headerOptions.contentType;
    }
    
    // Add Content-Length header for body size if content provided
    if (headerOptions.contentLength !== undefined) {
        standardHeaders['content-length'] = headerOptions.contentLength.toString();
    }
    
    // Include standard Express.js headers (X-Powered-By, Connection)
    // Already included in DEFAULT_RESPONSE_HEADERS
    
    // Add response timestamp headers (Date, X-Response-Time)
    const currentDate = new Date(RESPONSE_TIMESTAMP);
    standardHeaders['date'] = currentDate.toUTCString();
    
    if (headerOptions.responseTime) {
        standardHeaders['x-response-time'] = `${headerOptions.responseTime}ms`;
    }
    
    // Include correlation headers for request/response tracking
    const correlationId = headerOptions.correlationId || generateResponseId('headers');
    standardHeaders['x-correlation-id'] = correlationId;
    
    // Apply security headers if required by headerOptions
    if (headerOptions.includeSecurityHeaders) {
        standardHeaders['x-frame-options'] = 'DENY';
        standardHeaders['x-content-type-options'] = 'nosniff';
        standardHeaders['x-xss-protection'] = '1; mode=block';
        standardHeaders['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
    }
    
    // Add custom headers from headerOptions parameter overrides
    const customHeaders = headerOptions.custom || {};
    
    // Validate header format and values for HTTP compliance
    const finalHeaders = {
        ...standardHeaders,
        ...customHeaders
    };
    
    // Ensure all header values are strings for HTTP compliance
    Object.keys(finalHeaders).forEach(key => {
        if (typeof finalHeaders[key] !== 'string') {
            finalHeaders[key] = String(finalHeaders[key]);
        }
    });
    
    // Return complete headers object for response fixture configuration
    return finalHeaders;
}

/**
 * Creates response fixtures with performance metadata for response time validation and
 * performance testing scenarios. Enhances base response configurations with timing data,
 * performance thresholds, and validation criteria for educational performance testing.
 * 
 * @param {object} baseResponse - Base response configuration to enhance
 * @param {object} performanceData - Performance metrics and timing information
 * @returns {object} Response fixture enhanced with performance metrics and timing data
 */
function createPerformanceResponse(baseResponse, performanceData = {}) {
    // Extract base response structure from baseResponse parameter
    const enhancedResponse = {
        ...baseResponse
    };
    
    // Add performance timing metadata from performanceData
    const performanceMetrics = {
        responseTime: performanceData.responseTime || Math.floor(Math.random() * testConstants.PERFORMANCE_THRESHOLDS.acceptable),
        processingTime: performanceData.processingTime || Math.floor(Math.random() * 10),
        networkTime: performanceData.networkTime || Math.floor(Math.random() * 5),
        totalTime: 0 // Will be calculated
    };
    
    // Calculate total time from individual components
    performanceMetrics.totalTime = performanceMetrics.responseTime + performanceMetrics.processingTime + performanceMetrics.networkTime;
    
    // Include performance thresholds from testConstants.PERFORMANCE_THRESHOLDS
    const performanceThresholds = {
        fast: testConstants.PERFORMANCE_THRESHOLDS.fast,
        acceptable: testConstants.PERFORMANCE_THRESHOLDS.acceptable,
        slow: testConstants.PERFORMANCE_THRESHOLDS.slow
    };
    
    // Calculate performance validation criteria based on response time targets
    const performanceCategory = determinePerformanceCategory(performanceMetrics.totalTime, performanceThresholds);
    
    // Add performance headers to response headers
    if (!enhancedResponse.headers) {
        enhancedResponse.headers = {};
    }
    
    enhancedResponse.headers['x-response-time'] = `${performanceMetrics.responseTime}ms`;
    enhancedResponse.headers['x-processing-time'] = `${performanceMetrics.processingTime}ms`;
    enhancedResponse.headers['x-performance-category'] = performanceCategory;
    
    // Include memory usage and resource utilization data if available
    const resourceMetrics = {
        memoryUsage: process.memoryUsage ? process.memoryUsage() : {},
        cpuUsage: process.cpuUsage ? process.cpuUsage() : {},
        eventLoopUtilization: process.eventLoopUtilization ? process.eventLoopUtilization() : {}
    };
    
    // Configure performance test assertion criteria and thresholds
    const performanceValidation = {
        responseTimeThreshold: performanceThresholds[performanceCategory] || performanceThresholds.acceptable,
        performanceCategory,
        meetsThreshold: performanceMetrics.totalTime <= performanceThresholds.acceptable,
        exceedsSlowThreshold: performanceMetrics.totalTime > performanceThresholds.slow,
        validationCriteria: {
            responseTimeLimit: performanceThresholds.acceptable,
            performanceCategoryCheck: true,
            memoryUsageCheck: resourceMetrics.memoryUsage.heapUsed < 100 * 1024 * 1024 // 100MB
        }
    };
    
    // Add concurrency test metadata if response is for concurrent testing
    if (performanceData.concurrency) {
        performanceValidation.concurrency = {
            level: performanceData.concurrency.level || 1,
            batchId: performanceData.concurrency.batchId || generateResponseId('concurrent'),
            expectedDegradation: performanceData.concurrency.expectedDegradation || 1.2 // 20% degradation expected
        };
    }
    
    // Include performance benchmark data for regression testing
    const benchmarkData = {
        baselineResponseTime: testConstants.PERFORMANCE_THRESHOLDS.fast,
        regressionThreshold: testConstants.PERFORMANCE_THRESHOLDS.acceptable,
        improvementTarget: testConstants.PERFORMANCE_THRESHOLDS.fast * 0.8, // 20% improvement target
        historicalData: performanceData.historical || []
    };
    
    // Enhance response metadata with performance information
    enhancedResponse.metadata = {
        ...enhancedResponse.metadata,
        performance: {
            metrics: performanceMetrics,
            thresholds: performanceThresholds,
            validation: performanceValidation,
            resources: resourceMetrics,
            benchmark: benchmarkData
        }
    };
    
    // Add performance fixture type identifier
    enhancedResponse.fixture = {
        ...enhancedResponse.fixture,
        type: `performance_${enhancedResponse.fixture?.type || 'response'}`,
        performanceEnhanced: true
    };
    
    // Return enhanced response fixture with complete performance validation data
    return enhancedResponse;
}

/**
 * Generates unique response correlation IDs for test response tracking, debugging, and
 * performance analysis. Creates timestamp-based identifiers with response type prefixes
 * for easy identification in test logs and monitoring systems.
 * 
 * @param {string} responseType - Type of response for ID prefix (hello, health, error, etc.)
 * @returns {string} Unique response ID with response type prefix and timestamp for correlation
 */
function generateResponseId(responseType = 'response') {
    // Increment global RESPONSE_ID_COUNTER for uniqueness across responses
    RESPONSE_ID_COUNTER++;
    
    // Create timestamp component using Date.now() for temporal tracking
    const timestamp = Date.now();
    
    // Combine responseType prefix with counter and timestamp
    const responseId = `${responseType}-${RESPONSE_ID_COUNTER}-${timestamp}`;
    
    // Format as readable string for debugging and logging purposes
    return responseId;
}

/**
 * Validates HTTP response fixture format and structure to ensure test compatibility and
 * assertion accuracy. Performs comprehensive validation of status codes, headers, content,
 * and metadata to verify fixture integrity for testing frameworks.
 * 
 * @param {object} responseFixture - Response fixture object to validate
 * @returns {object} Validation result with fixture status, format compliance, and issues
 */
function validateResponseFixture(responseFixture) {
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        recommendations: [],
        validatedAt: new Date().toISOString()
    };
    
    // Validate response fixture has required status code property
    if (!responseFixture.hasOwnProperty('statusCode')) {
        validationResult.isValid = false;
        validationResult.errors.push('Missing required property: statusCode');
    } else if (typeof responseFixture.statusCode !== 'number') {
        validationResult.isValid = false;
        validationResult.errors.push('statusCode must be a number');
    }
    
    // Check headers object format and required HTTP response headers
    if (!responseFixture.hasOwnProperty('headers')) {
        validationResult.isValid = false;
        validationResult.errors.push('Missing required property: headers');
    } else if (typeof responseFixture.headers !== 'object' || responseFixture.headers === null) {
        validationResult.isValid = false;
        validationResult.errors.push('headers must be an object');
    }
    
    // Verify status code is valid HTTP status code (100-599 range)
    if (responseFixture.statusCode && (responseFixture.statusCode < 100 || responseFixture.statusCode > 599)) {
        validationResult.isValid = false;
        validationResult.errors.push(`Invalid HTTP status code: ${responseFixture.statusCode}`);
    }
    
    // Validate Content-Type header matches response body format
    if (responseFixture.headers && responseFixture.headers['content-type']) {
        const contentType = responseFixture.headers['content-type'];
        const hasBody = responseFixture.body !== undefined;
        
        if (hasBody && contentType.includes('application/json')) {
            // Check response body is appropriate for Content-Type (JSON)
            if (typeof responseFixture.body === 'string') {
                try {
                    JSON.parse(responseFixture.body);
                } catch (e) {
                    validationResult.isValid = false;
                    validationResult.errors.push('Response body is not valid JSON despite JSON Content-Type');
                }
            }
        } else if (hasBody && contentType.includes('text/plain')) {
            if (typeof responseFixture.body !== 'string') {
                validationResult.warnings.push('Response body should be string for text/plain Content-Type');
            }
        }
    } else if (responseFixture.headers) {
        validationResult.warnings.push('Missing Content-Type header');
    }
    
    // Verify timestamp formats and response metadata structure
    if (responseFixture.timestamp) {
        if (!Date.parse(responseFixture.timestamp)) {
            validationResult.warnings.push('Invalid timestamp format');
        }
    }
    
    // Validate correlation ID format and uniqueness requirements
    if (responseFixture.correlationId) {
        if (typeof responseFixture.correlationId !== 'string' || responseFixture.correlationId.length === 0) {
            validationResult.warnings.push('Correlation ID should be a non-empty string');
        }
    }
    
    // Check response fixture completeness for test assertion needs
    if (!responseFixture.metadata) {
        validationResult.recommendations.push('Consider adding metadata for enhanced test validation');
    }
    
    if (!responseFixture.fixture) {
        validationResult.recommendations.push('Consider adding fixture type information');
    }
    
    // Validate content-length header matches body size
    if (responseFixture.headers && responseFixture.headers['content-length'] && responseFixture.body) {
        const actualLength = Buffer.byteLength(responseFixture.body, 'utf8');
        const declaredLength = parseInt(responseFixture.headers['content-length']);
        
        if (actualLength !== declaredLength) {
            validationResult.isValid = false;
            validationResult.errors.push(`Content-Length mismatch: declared ${declaredLength}, actual ${actualLength}`);
        }
    }
    
    // Return comprehensive validation result with recommendations
    return validationResult;
}

/**
 * Creates HTTP response configuration from predefined templates with customization options
 * for different test scenarios. Provides template-based response generation with consistent
 * base configurations and flexible customization for various testing requirements.
 * 
 * @param {string} templateName - Name of template to use (hello, health, error, performance)
 * @param {object} customizations - Customization options to override template defaults
 * @returns {object} Response configuration based on template with applied customizations
 */
function createResponseFromTemplate(templateName, customizations = {}) {
    // Load predefined response template based on templateName
    const templates = {
        hello: {
            statusCode: HTTP_STATUS.OK,
            headers: {
                'content-type': CONTENT_TYPES.TEXT_PLAIN,
                ...DEFAULT_RESPONSE_HEADERS
            },
            body: HELLO_RESPONSE_CONTENT,
            metadata: {
                expectedContent: HELLO_RESPONSE_CONTENT,
                validationCriteria: {
                    contentMatch: 'exact',
                    statusCodeMatch: 'exact'
                }
            }
        },
        health: {
            statusCode: HTTP_STATUS.OK,
            headers: {
                'content-type': CONTENT_TYPES.APPLICATION_JSON,
                ...DEFAULT_RESPONSE_HEADERS
            },
            data: {
                status: 'ok',
                timestamp: RESPONSE_TIMESTAMP,
                application: APPLICATION_METADATA
            },
            metadata: {
                healthType: 'basic',
                kubernetesCompatible: false
            }
        },
        error: {
            statusCode: HTTP_STATUS.NOT_FOUND,
            headers: {
                'content-type': CONTENT_TYPES.APPLICATION_JSON,
                ...DEFAULT_RESPONSE_HEADERS
            },
            data: {
                error: ERROR_MESSAGES.ROUTE_NOT_FOUND,
                statusCode: HTTP_STATUS.NOT_FOUND,
                timestamp: RESPONSE_TIMESTAMP
            },
            metadata: {
                errorType: 'CLIENT_ERROR',
                isClientError: true
            }
        },
        performance: {
            statusCode: HTTP_STATUS.OK,
            headers: {
                'content-type': CONTENT_TYPES.TEXT_PLAIN,
                'x-response-time': '25ms',
                ...DEFAULT_RESPONSE_HEADERS
            },
            body: HELLO_RESPONSE_CONTENT,
            metadata: {
                performance: {
                    responseTime: 25,
                    category: 'fast'
                }
            }
        }
    };
    
    // Apply base template configuration
    const baseTemplate = templates[templateName];
    if (!baseTemplate) {
        throw new Error(`Unknown template: ${templateName}. Available templates: ${Object.keys(templates).join(', ')}`);
    }
    
    // Merge customizations object with template defaults
    const customizedResponse = {
        ...baseTemplate,
        statusCode: customizations.statusCode || baseTemplate.statusCode,
        headers: {
            ...baseTemplate.headers,
            ...customizations.headers
        },
        body: customizations.body !== undefined ? customizations.body : baseTemplate.body,
        data: customizations.data ? { ...baseTemplate.data, ...customizations.data } : baseTemplate.data,
        metadata: {
            ...baseTemplate.metadata,
            ...customizations.metadata
        }
    };
    
    // Generate JSON body if data object exists but no body
    if (customizedResponse.data && !customizedResponse.body) {
        customizedResponse.body = JSON.stringify(customizedResponse.data);
    }
    
    // Update content-length if body changed
    if (customizedResponse.body) {
        customizedResponse.headers['content-length'] = Buffer.byteLength(customizedResponse.body, 'utf8').toString();
    }
    
    // Validate customized configuration for HTTP compliance
    const validation = validateResponseFixture(customizedResponse);
    if (!validation.isValid) {
        throw new Error(`Template customization resulted in invalid response: ${validation.errors.join(', ')}`);
    }
    
    // Generate unique response correlation ID for tracking
    const correlationId = generateResponseId(`template-${templateName}`);
    customizedResponse.correlationId = correlationId;
    customizedResponse.headers['x-correlation-id'] = correlationId;
    
    // Add test metadata and description from template
    customizedResponse.fixture = {
        type: `template_${templateName}_response`,
        template: templateName,
        version: '1.0.0',
        createdAt: new Date().toISOString()
    };
    
    // Include assertion criteria and validation expectations
    if (!customizedResponse.metadata.validationCriteria) {
        customizedResponse.metadata.validationCriteria = {
            statusCodeMatch: 'exact',
            contentTypeMatch: 'exact',
            correlationIdPresent: true
        };
    }
    
    // Apply template-specific performance thresholds and timing
    if (templateName === 'performance' || customizations.includePerformance) {
        customizedResponse.metadata.performance = {
            thresholds: testConstants.PERFORMANCE_THRESHOLDS,
            expectedCategory: 'acceptable',
            ...customizedResponse.metadata.performance
        };
    }
    
    // Return complete customized response configuration for test use
    return customizedResponse;
}

/**
 * Creates batch of response fixtures for concurrent request testing with consistent content
 * and unique tracking IDs. Generates multiple response configurations for load testing and
 * concurrent request validation with proper correlation tracking.
 * 
 * @param {object} baseResponse - Base response configuration to replicate
 * @param {number} responseCount - Number of response fixtures to generate
 * @param {object} batchOptions - Configuration options for batch generation
 * @returns {array} Array of response configurations for concurrent testing with unique IDs
 */
function createConcurrentResponseBatch(baseResponse, responseCount = 10, batchOptions = {}) {
    // Validate baseResponse configuration for batch generation
    const validation = validateResponseFixture(baseResponse);
    if (!validation.isValid) {
        throw new Error(`Invalid base response for batch generation: ${validation.errors.join(', ')}`);
    }
    
    // Create array to hold concurrent response fixtures
    const responseBatch = [];
    const batchId = generateResponseId('concurrent-batch');
    
    // Generate specified number of response copies based on responseCount
    for (let i = 0; i < responseCount; i++) {
        const responseFixture = {
            ...baseResponse,
            headers: { ...baseResponse.headers },
            metadata: { ...baseResponse.metadata }
        };
        
        // Assign unique correlation ID to each response for tracking
        const uniqueCorrelationId = generateResponseId(`concurrent-${i}`);
        responseFixture.correlationId = uniqueCorrelationId;
        responseFixture.headers['x-correlation-id'] = uniqueCorrelationId;
        responseFixture.headers['x-batch-id'] = batchId;
        responseFixture.headers['x-batch-index'] = i.toString();
        
        // Configure batch-specific timing and performance expectations
        if (batchOptions.simulateVariance) {
            const baseResponseTime = baseResponse.metadata?.performance?.responseTime || testConstants.PERFORMANCE_THRESHOLDS.fast;
            const variance = Math.floor(Math.random() * 20) - 10; // ±10ms variance
            const adjustedTime = Math.max(1, baseResponseTime + variance);
            
            responseFixture.headers['x-response-time'] = `${adjustedTime}ms`;
            if (responseFixture.metadata.performance) {
                responseFixture.metadata.performance.responseTime = adjustedTime;
            }
        }
        
        // Apply response variations if specified in batchOptions
        if (batchOptions.variations && batchOptions.variations.length > 0) {
            const variationIndex = i % batchOptions.variations.length;
            const variation = batchOptions.variations[variationIndex];
            
            // Apply variation customizations
            Object.keys(variation).forEach(key => {
                if (key === 'headers') {
                    responseFixture.headers = { ...responseFixture.headers, ...variation.headers };
                } else if (key === 'metadata') {
                    responseFixture.metadata = { ...responseFixture.metadata, ...variation.metadata };
                } else {
                    responseFixture[key] = variation[key];
                }
            });
        }
        
        // Include batch metadata for result aggregation and analysis
        responseFixture.metadata.batch = {
            batchId,
            batchSize: responseCount,
            batchIndex: i,
            generatedAt: new Date().toISOString(),
            batchOptions: { ...batchOptions }
        };
        
        // Set consistent content across all responses for validation
        // Content remains consistent unless variations are applied
        
        // Update fixture type for batch responses
        responseFixture.fixture = {
            ...responseFixture.fixture,
            type: `concurrent_batch_response`,
            batchId,
            batchIndex: i
        };
        
        responseBatch.push(responseFixture);
    }
    
    // Return array of concurrent response fixtures for test execution
    return responseBatch;
}

/**
 * Resets response fixture state and counters to ensure test isolation and prevent
 * fixture contamination between test suites. Clears global state and reinitializes
 * counters for clean test execution environments.
 */
function resetResponseFixtures() {
    // Reset RESPONSE_ID_COUNTER to initial value for fresh ID generation
    RESPONSE_ID_COUNTER = 0;
    
    // Clear any cached response configurations and templates
    // No cached data currently, but placeholder for future caching
    
    // Reset performance measurement state and timing data
    if (global.performanceCache) {
        global.performanceCache = {};
    }
    
    // Clear response correlation tracking data
    if (global.correlationTracker) {
        global.correlationTracker = new Set();
    }
    
    // Reset global response fixture variables to initial state
    // All global variables are constants, so no reset needed
    
    // Log fixture reset completion for debugging and test isolation verification
    console.debug(`Response fixtures reset completed at ${new Date().toISOString()}, counter reset to 0`);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determines performance category based on response time and thresholds
 * @param {number} responseTime - Response time in milliseconds
 * @param {object} thresholds - Performance thresholds object
 * @returns {string} Performance category (fast, acceptable, slow)
 */
function determinePerformanceCategory(responseTime, thresholds) {
    if (responseTime <= thresholds.fast) return 'fast';
    if (responseTime <= thresholds.acceptable) return 'acceptable';
    return 'slow';
}

/**
 * Maps HTTP status code to error type string
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error type classification
 */
function getErrorTypeFromStatus(statusCode) {
    if (statusCode >= 400 && statusCode < 500) return 'CLIENT_ERROR';
    if (statusCode >= 500) return 'SERVER_ERROR';
    return 'UNKNOWN_ERROR';
}

// =============================================================================
// RESPONSE FIXTURE COLLECTIONS
// =============================================================================

/**
 * Hello endpoint response fixtures including successful 200 OK responses with
 * 'Hello world' content and proper headers for comprehensive hello endpoint testing
 */
const helloEndpointResponses = {
    /**
     * Standard valid GET response for hello endpoint with proper headers and content
     */
    validGetResponse: createHelloResponse({
        includeTimestamp: true,
        headers: {
            'x-test-type': 'hello-valid'
        },
        metadata: {
            testScenario: 'valid_hello_request',
            expectedAssertions: ['statusCode', 'contentType', 'body']
        }
    }),

    /**
     * Success response optimized for performance testing with timing metadata
     */
    successResponse: createHelloResponse({
        responseTime: testConstants.PERFORMANCE_THRESHOLDS.fast - 5,
        headers: {
            'x-test-type': 'hello-success',
            'x-performance-test': 'true'
        },
        metadata: {
            testScenario: 'hello_success_case',
            performanceOptimized: true
        }
    }),

    /**
     * Performance validation response with specific timing requirements
     */
    performanceValidationResponse: createPerformanceResponse(
        createHelloResponse(),
        {
            responseTime: testConstants.PERFORMANCE_THRESHOLDS.acceptable - 10,
            processingTime: 5,
            networkTime: 2
        }
    ),

    /**
     * Concurrent test response for load testing scenarios
     */
    concurrentTestResponse: createHelloResponse({
        headers: {
            'x-test-type': 'hello-concurrent',
            'x-concurrent-safe': 'true'
        },
        metadata: {
            testScenario: 'concurrent_hello_requests',
            concurrencyLevel: 'high'
        }
    })
};

/**
 * Health check endpoint response fixtures for /health, /livez, and /readyz with
 * JSON status data and Kubernetes probe compatibility
 */
const healthCheckResponses = {
    /**
     * Basic health response with minimal system information
     */
    basicHealthResponse: createHealthResponse('health', {
        status: 'ok',
        uptime: 3600 // 1 hour uptime
    }, {
        includeMetrics: false
    }),

    /**
     * Detailed health response with comprehensive system metrics
     */
    detailedHealthResponse: createHealthResponse('health', {
        status: 'ok',
        uptime: 86400, // 24 hours uptime
        checks: {
            database: 'not_applicable',
            cache: 'not_applicable',
            external_apis: 'not_applicable'
        }
    }, {
        includeMetrics: true,
        headers: {
            'x-health-check': 'detailed'
        }
    }),

    /**
     * Kubernetes liveness probe response
     */
    livenessProbeResponse: createHealthResponse('livez', {
        status: 'ok',
        checks: {
            process: 'healthy',
            eventLoop: 'healthy'
        }
    }),

    /**
     * Kubernetes readiness probe response  
     */
    readinessProbeResponse: createHealthResponse('readyz', {
        status: 'ok',
        ready: true,
        checks: {
            server: 'ready',
            routes: 'ready',
            application: 'ready'
        }
    }),

    /**
     * Unhealthy service response for failure testing
     */
    unhealthyResponse: createHealthResponse('health', {
        status: 'error',
        error: 'Service degraded',
        checks: {
            server: 'unhealthy',
            memory: 'high_usage'
        }
    }, {
        headers: {
            'x-service-status': 'degraded'
        }
    })
};

/**
 * Error response fixtures for HTTP error scenarios including 404, 405, 400, 500,
 * and 503 status codes with proper error messages and headers
 */
const errorResponses = {
    /**
     * 404 Not Found response for invalid routes
     */
    notFoundResponse: createErrorResponse(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.ROUTE_NOT_FOUND,
        {
            format: 'json',
            path: '/invalid-path',
            method: 'GET',
            headers: {
                'x-error-type': 'route_not_found'
            }
        }
    ),

    /**
     * 405 Method Not Allowed response for unsupported HTTP methods
     */
    methodNotAllowedResponse: createErrorResponse(
        HTTP_STATUS.METHOD_NOT_ALLOWED,
        ERROR_MESSAGES.METHOD_NOT_ALLOWED,
        {
            format: 'json',
            path: '/hello',
            method: 'POST',
            headers: {
                'x-error-type': 'method_not_allowed',
                'allow': 'GET'
            }
        }
    ),

    /**
     * 400 Bad Request response for malformed requests
     */
    badRequestResponse: createErrorResponse(
        HTTP_STATUS.BAD_REQUEST,
        'Bad request format or invalid parameters',
        {
            format: 'json',
            headers: {
                'x-error-type': 'bad_request'
            }
        }
    ),

    /**
     * 500 Internal Server Error response for server failures
     */
    internalServerErrorResponse: createErrorResponse(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_ERROR,
        {
            format: 'json',
            headers: {
                'x-error-type': 'internal_server_error'
            }
        }
    ),

    /**
     * 503 Service Unavailable response for service outages
     */
    serviceUnavailableResponse: createErrorResponse(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        ERROR_MESSAGES.SERVICE_UNAVAILABLE,
        {
            format: 'json',
            headers: {
                'x-error-type': 'service_unavailable',
                'retry-after': '300'
            }
        }
    )
};

/**
 * Performance testing response configurations including response time validation,
 * load testing, and concurrent response handling
 */
const performanceTestResponses = {
    /**
     * Response time test configuration with fast response expectation
     */
    responseTimeTestResponse: createPerformanceResponse(
        createHelloResponse(),
        {
            responseTime: testConstants.PERFORMANCE_THRESHOLDS.fast,
            processingTime: 3,
            networkTime: 1
        }
    ),

    /**
     * Load testing response configurations for multiple concurrent requests
     */
    loadTestResponses: Array.from({ length: 20 }, (_, index) =>
        createPerformanceResponse(
            createHelloResponse({
                headers: {
                    'x-load-test-index': index.toString()
                }
            }),
            {
                responseTime: testConstants.PERFORMANCE_THRESHOLDS.acceptable + (index * 2),
                processingTime: 5 + Math.floor(index / 4),
                concurrency: { level: 20, batchId: 'load-test-batch' }
            }
        )
    ),

    /**
     * Concurrent test batch for high-concurrency scenarios
     */
    concurrentTestBatch: createConcurrentResponseBatch(
        createHelloResponse(),
        15,
        {
            simulateVariance: true,
            variations: [
                { metadata: { variation: 'fast' } },
                { metadata: { variation: 'normal' } },
                { metadata: { variation: 'slow' } }
            ]
        }
    ),

    /**
     * Stress test response for maximum load scenarios
     */
    stressTestResponse: createPerformanceResponse(
        createHelloResponse({
            headers: {
                'x-stress-test': 'true'
            }
        }),
        {
            responseTime: testConstants.PERFORMANCE_THRESHOLDS.slow - 5,
            processingTime: 15,
            networkTime: 8,
            concurrency: { level: 50, expectedDegradation: 2.0 }
        }
    )
};

/**
 * Response fixture templates for different response scenarios providing consistent
 * base configurations with customization options
 */
const responseTemplates = {
    /**
     * Basic success response template for 200 OK scenarios
     */
    basicSuccessTemplate: {
        statusCode: HTTP_STATUS.OK,
        headers: generateResponseHeaders({
            contentType: CONTENT_TYPES.TEXT_PLAIN
        }),
        body: HELLO_RESPONSE_CONTENT,
        timestamp: RESPONSE_TIMESTAMP,
        metadata: {
            template: 'basic_success',
            customizable: ['body', 'headers', 'metadata']
        }
    },

    /**
     * Health check response template for monitoring endpoints
     */
    healthCheckTemplate: {
        statusCode: HTTP_STATUS.OK,
        headers: generateResponseHeaders({
            contentType: CONTENT_TYPES.APPLICATION_JSON
        }),
        data: {
            status: 'ok',
            timestamp: RESPONSE_TIMESTAMP,
            application: APPLICATION_METADATA
        },
        metadata: {
            template: 'health_check',
            customizable: ['data.status', 'data.checks', 'headers']
        }
    },

    /**
     * Error response template for error scenarios
     */
    errorResponseTemplate: {
        statusCode: HTTP_STATUS.NOT_FOUND,
        headers: generateResponseHeaders({
            contentType: CONTENT_TYPES.APPLICATION_JSON
        }),
        data: {
            error: 'Resource not found',
            statusCode: HTTP_STATUS.NOT_FOUND,
            timestamp: RESPONSE_TIMESTAMP
        },
        metadata: {
            template: 'error_response',
            customizable: ['statusCode', 'data.error', 'data.details']
        }
    },

    /**
     * Performance testing template with timing metadata
     */
    performanceTemplate: {
        statusCode: HTTP_STATUS.OK,
        headers: generateResponseHeaders({
            contentType: CONTENT_TYPES.TEXT_PLAIN,
            responseTime: testConstants.PERFORMANCE_THRESHOLDS.fast
        }),
        body: HELLO_RESPONSE_CONTENT,
        metadata: {
            template: 'performance',
            performance: {
                category: 'fast',
                thresholds: testConstants.PERFORMANCE_THRESHOLDS
            },
            customizable: ['performance.responseTime', 'performance.category']
        }
    }
};

/**
 * Response builder functions for dynamically creating HTTP response configurations
 * with customization options and validation
 */
const responseBuilders = {
    createHelloResponse,
    createHealthResponse,
    createErrorResponse,
    createPerformanceResponse,
    createConcurrentResponseBatch
};

/**
 * Helper utilities for response configuration management, validation, and state
 * management in test environments
 */
const responseHelpers = {
    generateResponseHeaders,
    generateResponseId,
    validateResponseFixture,
    createResponseFromTemplate,
    resetResponseFixtures
};

/**
 * Predefined HTTP response header configurations for different response types and
 * testing scenarios with proper Content-Type and security headers
 */
const commonResponseHeaders = {
    /**
     * Standard headers for typical HTTP responses
     */
    standardHeaders: generateResponseHeaders({
        contentType: CONTENT_TYPES.TEXT_PLAIN,
        includeSecurityHeaders: false
    }),

    /**
     * Hello endpoint specific headers with plain text content
     */
    helloEndpointHeaders: generateResponseHeaders({
        contentType: CONTENT_TYPES.TEXT_PLAIN,
        contentLength: Buffer.byteLength(HELLO_RESPONSE_CONTENT, 'utf8'),
        custom: {
            'x-endpoint': 'hello'
        }
    }),

    /**
     * Health check headers with JSON content type
     */
    healthCheckHeaders: generateResponseHeaders({
        contentType: CONTENT_TYPES.APPLICATION_JSON,
        includeSecurityHeaders: false,
        custom: {
            'x-health-check': 'true'
        }
    }),

    /**
     * Performance testing headers with timing information
     */
    performanceTestHeaders: generateResponseHeaders({
        contentType: CONTENT_TYPES.TEXT_PLAIN,
        responseTime: testConstants.PERFORMANCE_THRESHOLDS.fast,
        custom: {
            'x-performance-test': 'true'
        }
    }),

    /**
     * Error response headers with JSON error format
     */
    errorResponseHeaders: generateResponseHeaders({
        contentType: CONTENT_TYPES.APPLICATION_JSON,
        includeSecurityHeaders: true,
        custom: {
            'x-error-response': 'true'
        }
    })
};

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Export hello endpoint response fixtures
    helloEndpointResponses,
    
    // Export health check response fixtures
    healthCheckResponses,
    
    // Export error response fixtures
    errorResponses,
    
    // Export performance testing response configurations
    performanceTestResponses,
    
    // Export response templates for base configurations
    responseTemplates,
    
    // Export response builder functions
    responseBuilders,
    
    // Export response helper utilities
    responseHelpers,
    
    // Export common response header configurations
    commonResponseHeaders
};