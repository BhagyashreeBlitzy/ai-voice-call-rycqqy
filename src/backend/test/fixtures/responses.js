/**
 * Test Fixture Module for HTTP Response Objects
 * 
 * This module provides predefined HTTP response objects, response data structures, 
 * and response factory functions for comprehensive testing of the Node.js tutorial 
 * application endpoints. Contains response fixtures for successful scenarios, error 
 * scenarios, validation testing, and edge cases to support unit testing, integration 
 * testing, and end-to-end testing with SuperTest and Node.js built-in test runner.
 * 
 * Demonstrates proper HTTP response patterns, status code handling, and response 
 * structure standardization for educational purposes in Express.js 5.1.0 applications.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import required constants from the constants module
const {
    HTTP_STATUS,
    RESPONSES,
    ERROR_MESSAGES,
    APPLICATION,
    ROUTES
} = require('../../utils/constants.js'); // Node.js v22.x LTS built-in modules

// Global constants for response fixture generation and testing
const DEFAULT_RESPONSE_TIMESTAMP = new Date().toISOString();
const TEST_RESPONSE_ID_PREFIX = 'test-res-';
const DEFAULT_RESPONSE_VERSION = APPLICATION.API_VERSION;
const RESPONSE_CONTENT_TYPE = 'application/json';

/**
 * Factory function that creates standardized success HTTP response objects with 
 * customizable data, status codes, and metadata for testing successful response 
 * scenarios and validation.
 * 
 * @param {any} data - Response data content (default: Hello world content)
 * @param {number} statusCode - HTTP status code (default: HTTP_STATUS.OK)
 * @param {object} metadata - Additional response metadata for customization
 * @returns {object} Standardized success response object with data, status, metadata, and response structure for testing
 */
function createSuccessResponse(data = null, statusCode = HTTP_STATUS.OK, metadata = {}) {
    // Set response data from provided data parameter or use default hello world content
    const responseData = data !== null ? data : RESPONSES.HELLO_WORLD;
    
    // Set HTTP status code from statusCode parameter or default to HTTP_STATUS.OK
    const status = statusCode || HTTP_STATUS.OK;
    
    // Generate unique response ID for test correlation and tracking
    const responseId = generateResponseId(TEST_RESPONSE_ID_PREFIX);
    
    // Add standardized response metadata including timestamp and correlation ID
    const responseMetadata = {
        timestamp: DEFAULT_RESPONSE_TIMESTAMP,
        correlationId: responseId,
        version: DEFAULT_RESPONSE_VERSION,
        // Include application information using APPLICATION constants for version and name
        application: {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            apiVersion: APPLICATION.API_VERSION
        },
        // Merge provided metadata with default response metadata for customization
        ...metadata
    };
    
    // Add response structure properties following standardized API response format
    const successResponse = {
        status: status,
        success: true,
        data: responseData,
        metadata: responseMetadata,
        headers: {
            'Content-Type': RESPONSE_CONTENT_TYPE,
            'X-API-Version': DEFAULT_RESPONSE_VERSION,
            'X-Response-ID': responseId
        },
        // Return complete success response object ready for response validation testing
        timestamp: DEFAULT_RESPONSE_TIMESTAMP
    };
    
    return successResponse;
}

/**
 * Factory function that creates standardized error HTTP response objects with error 
 * messages, status codes, and error metadata for testing error response scenarios 
 * and validation.
 * 
 * @param {string} errorMessage - Error message content (default: generic error)
 * @param {number} statusCode - HTTP status code (default: HTTP_STATUS.INTERNAL_SERVER_ERROR)
 * @param {object} errorDetails - Additional error context and details
 * @returns {object} Standardized error response object with error message, status, and error details for error testing
 */
function createErrorResponse(errorMessage = null, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorDetails = {}) {
    // Set error message from provided errorMessage parameter or use default error message
    const message = errorMessage || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    
    // Set HTTP status code from statusCode parameter or default to HTTP_STATUS.INTERNAL_SERVER_ERROR
    const status = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    
    // Generate unique error response ID for test correlation and analysis
    const responseId = generateResponseId(`${TEST_RESPONSE_ID_PREFIX}error-`);
    
    // Create error response structure with standardized error object format
    const errorResponse = {
        status: status,
        success: false,
        error: {
            message: message,
            code: status,
            type: getErrorTypeFromStatus(status),
            // Add error metadata including error type, timestamp, and correlation ID
            timestamp: DEFAULT_RESPONSE_TIMESTAMP,
            correlationId: responseId,
            // Include error details from errorDetails parameter with validation context
            details: errorDetails
        },
        // Add application context information for error tracking and debugging
        metadata: {
            application: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                apiVersion: APPLICATION.API_VERSION
            },
            timestamp: DEFAULT_RESPONSE_TIMESTAMP,
            correlationId: responseId
        },
        headers: {
            'Content-Type': RESPONSE_CONTENT_TYPE,
            'X-API-Version': DEFAULT_RESPONSE_VERSION,
            'X-Response-ID': responseId,
            'X-Error-Type': getErrorTypeFromStatus(status)
        }
    };
    
    // Return complete error response object ready for error response validation testing
    return errorResponse;
}

/**
 * Specialized factory function for creating hello endpoint success responses with 
 * Hello world content and proper response structure for hello endpoint testing.
 * 
 * @param {object} options - Customization options for hello response generation
 * @returns {object} Hello endpoint success response object with Hello world content and proper response metadata
 */
function createHelloSuccessResponse(options = {}) {
    // Use RESPONSES.HELLO_WORLD constant as response content for consistency
    // Set HTTP status code to HTTP_STATUS.OK for successful hello response
    const baseResponse = createSuccessResponse(RESPONSES.HELLO_WORLD, HTTP_STATUS.OK);
    
    // Add hello endpoint specific metadata including endpoint path and method
    const helloMetadata = {
        endpoint: ROUTES.HELLO,
        method: 'GET',
        // Include response generation timestamp and correlation information
        responseType: 'hello-success',
        // Apply options for customization while maintaining hello response structure
        ...options
    };
    
    // Add hello endpoint context for response validation and testing
    const helloResponse = {
        ...baseResponse,
        metadata: {
            ...baseResponse.metadata,
            ...helloMetadata
        },
        // Return hello success response object ready for endpoint response testing
        context: {
            endpoint: ROUTES.HELLO,
            operation: 'hello-world-response'
        }
    };
    
    return helloResponse;
}

/**
 * Factory function for creating 404 Not Found error response objects with route 
 * context and path information for route not found testing scenarios.
 * 
 * @param {string} requestedPath - The path that was requested but not found
 * @param {object} options - Additional customization options
 * @returns {object} 404 Not Found error response object with path information and route context for testing
 */
function createNotFoundResponse(requestedPath = '/unknown', options = {}) {
    // Use ERROR_MESSAGES.ROUTE_NOT_FOUND constant for consistent error message
    // Set HTTP status code to HTTP_STATUS.NOT_FOUND for 404 error responses
    const errorDetails = {
        // Add requested path information to error context for debugging
        requestedPath: requestedPath,
        // Include route matching context and available routes information
        availableRoutes: [ROUTES.HELLO, ROUTES.HEALTH],
        // Add route validation context for error analysis and testing
        routeValidation: 'path-not-found',
        ...options
    };
    
    // Generate error response with standardized 404 error structure
    const notFoundResponse = createErrorResponse(
        ERROR_MESSAGES.ROUTE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        errorDetails
    );
    
    // Return 404 error response object ready for route not found testing
    return notFoundResponse;
}

/**
 * Factory function for creating 405 Method Not Allowed error response objects with 
 * method context and allowed methods information for method validation testing.
 * 
 * @param {string} usedMethod - The HTTP method that was used but not allowed
 * @param {array} allowedMethods - Array of allowed HTTP methods for the endpoint
 * @param {object} options - Additional customization options
 * @returns {object} 405 Method Not Allowed error response object with method information and allowed methods list
 */
function createMethodNotAllowedResponse(usedMethod = 'POST', allowedMethods = ['GET'], options = {}) {
    // Use ERROR_MESSAGES.METHOD_NOT_ALLOWED constant for consistent error message
    // Set HTTP status code to HTTP_STATUS.METHOD_NOT_ALLOWED for 405 error responses
    const errorDetails = {
        // Add used method and allowed methods information to error context
        usedMethod: usedMethod,
        allowedMethods: allowedMethods,
        // Add method validation context for error analysis and testing
        methodValidation: 'method-not-allowed',
        ...options
    };
    
    // Generate error response with standardized 405 error structure
    const methodNotAllowedResponse = createErrorResponse(
        ERROR_MESSAGES.METHOD_NOT_ALLOWED,
        HTTP_STATUS.METHOD_NOT_ALLOWED,
        errorDetails
    );
    
    // Include Allow header information for HTTP response compatibility
    methodNotAllowedResponse.headers.Allow = allowedMethods.join(', ');
    
    // Return 405 error response object ready for method validation testing
    return methodNotAllowedResponse;
}

/**
 * Factory function for creating 500 Internal Server Error response objects with 
 * server context and error information for server error testing scenarios.
 * 
 * @param {object} errorContext - Server error context and state information
 * @param {object} options - Additional customization options
 * @returns {object} 500 Internal Server Error response object with server context and error details
 */
function createInternalServerErrorResponse(errorContext = {}, options = {}) {
    // Use ERROR_MESSAGES.INTERNAL_SERVER_ERROR constant for consistent error message
    // Set HTTP status code to HTTP_STATUS.INTERNAL_SERVER_ERROR for 500 error responses
    const errorDetails = {
        // Add server error context including error type and server state
        serverContext: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            // Include error details while sanitizing sensitive information for security
            ...errorContext
        },
        // Add server error context for error analysis and debugging
        errorType: 'internal-server-error',
        ...options
    };
    
    // Generate error response with standardized 500 error structure
    const internalErrorResponse = createErrorResponse(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        errorDetails
    );
    
    // Return 500 error response object ready for server error testing
    return internalErrorResponse;
}

/**
 * Factory function for creating HTTP response objects with custom headers for 
 * testing header processing, content negotiation, and response metadata handling.
 * 
 * @param {any} data - Response data content
 * @param {number} statusCode - HTTP status code
 * @param {object} headers - Custom headers to include in response
 * @param {object} options - Additional customization options
 * @returns {object} HTTP response object with custom headers for header processing testing
 */
function createResponseWithHeaders(data = RESPONSES.HELLO_WORLD, statusCode = HTTP_STATUS.OK, headers = {}, options = {}) {
    // Create base response object using provided data and status code
    const baseResponse = createSuccessResponse(data, statusCode, options);
    
    // Include standard HTTP headers like Content-Type and API version
    const standardHeaders = {
        'Content-Type': RESPONSE_CONTENT_TYPE,
        'X-API-Version': DEFAULT_RESPONSE_VERSION,
        'X-Response-ID': generateResponseId(TEST_RESPONSE_ID_PREFIX)
    };
    
    // Add custom headers from headers parameter to response object
    // Validate header names and values for proper HTTP format compliance
    const customHeaders = validateHeaders(headers);
    
    // Merge provided options with default response configuration
    const responseWithHeaders = {
        ...baseResponse,
        headers: {
            ...standardHeaders,
            ...customHeaders
        },
        // Add response headers context for header processing validation
        headerContext: {
            customHeadersCount: Object.keys(customHeaders).length,
            headerValidation: 'passed'
        }
    };
    
    // Return response object with complete header configuration for testing
    return responseWithHeaders;
}

/**
 * Factory function for creating HTTP response objects with specific body content 
 * for testing response body processing, content serialization, and response data validation.
 * 
 * @param {any} body - Response body content
 * @param {number} statusCode - HTTP status code
 * @param {object} options - Additional customization options
 * @returns {object} HTTP response object with body content for body processing testing
 */
function createResponseWithBody(body = RESPONSES.HELLO_WORLD, statusCode = HTTP_STATUS.OK, options = {}) {
    // Set response body using provided body parameter with proper content handling
    // Set HTTP status code from statusCode parameter or default to HTTP_STATUS.OK
    const responseId = generateResponseId(TEST_RESPONSE_ID_PREFIX);
    
    // Determine appropriate Content-Type header based on body content type
    const contentType = determineContentType(body);
    
    // Generate unique response ID for body processing test correlation
    const responseWithBody = {
        status: statusCode,
        success: statusCode >= 200 && statusCode < 300,
        body: body,
        // Add Content-Length information based on body size for HTTP compliance
        headers: {
            'Content-Type': contentType,
            'Content-Length': getContentLength(body),
            'X-API-Version': DEFAULT_RESPONSE_VERSION,
            'X-Response-ID': responseId
        },
        // Set response metadata for body processing scenario identification
        metadata: {
            timestamp: DEFAULT_RESPONSE_TIMESTAMP,
            correlationId: responseId,
            bodyType: typeof body,
            contentLength: getContentLength(body),
            application: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                apiVersion: APPLICATION.API_VERSION
            },
            ...options
        }
    };
    
    // Return response object with complete body configuration for testing
    return responseWithBody;
}

/**
 * Creates arrays of response objects for load testing, concurrent response testing, 
 * and bulk operation response validation scenarios with configurable response patterns.
 * 
 * @param {number} count - Number of responses to generate
 * @param {object} template - Template response object for bulk generation
 * @param {object} options - Customization options for bulk responses
 * @returns {array} Array of HTTP response objects for bulk response testing scenarios
 */
function createBulkResponses(count = 10, template = {}, options = {}) {
    // Create base response template from provided template parameter
    const baseTemplate = {
        ...createSuccessResponse(),
        ...template
    };
    
    const responses = [];
    
    // Generate array of specified count using provided count parameter
    for (let i = 0; i < count; i++) {
        // Create unique response ID for each response in bulk set
        const responseId = generateResponseId(`${TEST_RESPONSE_ID_PREFIX}bulk-${i}-`);
        
        // Apply variations to responses if specified in options parameter
        const variation = options.variation ? options.variation(i) : {};
        
        const bulkResponse = {
            ...baseTemplate,
            ...variation,
            // Add bulk test metadata to each response object for tracking
            metadata: {
                ...baseTemplate.metadata,
                bulkIndex: i,
                bulkTotal: count,
                bulkId: responseId,
                // Ensure each response has unique tracking information and correlation IDs
                correlationId: responseId,
                timestamp: new Date(Date.now() + i).toISOString() // Slight time offset for uniqueness
            },
            headers: {
                ...baseTemplate.headers,
                'X-Response-ID': responseId,
                'X-Bulk-Index': i.toString(),
                'X-Bulk-Total': count.toString()
            }
        };
        
        // Validate all responses meet HTTP format requirements and structure
        if (validateResponseObject(bulkResponse).isValid) {
            responses.push(bulkResponse);
        }
    }
    
    // Return array of configured response objects for bulk testing scenarios
    return responses;
}

/**
 * Generates unique response identifiers for test correlation, debugging, and response 
 * tracking across test scenarios and execution cycles.
 * 
 * @param {string} prefix - Prefix for the response identifier
 * @returns {string} Unique response identifier for test tracking and correlation
 */
function generateResponseId(prefix = TEST_RESPONSE_ID_PREFIX) {
    // Use provided prefix or default TEST_RESPONSE_ID_PREFIX constant
    // Generate timestamp-based unique identifier component for uniqueness
    const timestamp = Date.now().toString(36);
    
    // Add random component for uniqueness guarantee across parallel tests
    const random = Math.random().toString(36).substring(2, 8);
    
    // Format identifier for readability and parsing in test output
    // Ensure identifier meets HTTP header value requirements if used in headers
    const identifier = `${prefix}${timestamp}-${random}`;
    
    // Return complete unique response identifier string for test correlation
    return identifier;
}

/**
 * Validates HTTP response objects for proper structure, required properties, and 
 * HTTP specification compliance to ensure test fixture quality and response validation.
 * 
 * @param {object} responseObject - Response object to validate
 * @returns {object} Validation result with status and detailed validation information for response quality assurance
 */
function validateResponseObject(responseObject) {
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };
    
    // Validate response object has required properties (status, body, headers)
    if (!responseObject || typeof responseObject !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Response object must be a valid object');
        return validationResult;
    }
    
    // Check HTTP status code is valid and within acceptable range
    if (!responseObject.status || typeof responseObject.status !== 'number') {
        validationResult.isValid = false;
        validationResult.errors.push('Response must have a valid numeric status code');
    } else if (responseObject.status < 100 || responseObject.status >= 600) {
        validationResult.isValid = false;
        validationResult.errors.push('Status code must be between 100 and 599');
    }
    
    // Validate response body format and structure for JSON serialization
    if (responseObject.body !== undefined) {
        try {
            JSON.stringify(responseObject.body);
        } catch (error) {
            validationResult.warnings.push('Response body may not be JSON serializable');
        }
    }
    
    // Check headers follow HTTP header specification and naming conventions
    if (responseObject.headers && typeof responseObject.headers === 'object') {
        Object.keys(responseObject.headers).forEach(headerName => {
            if (!/^[a-zA-Z0-9\-_]+$/.test(headerName)) {
                validationResult.warnings.push(`Header name "${headerName}" may not comply with HTTP specification`);
            }
        });
    }
    
    // Validate response metadata is complete and properly formatted
    if (responseObject.metadata && typeof responseObject.metadata !== 'object') {
        validationResult.warnings.push('Response metadata should be an object');
    }
    
    // Verify response object structure meets API response standards
    const requiredFields = ['status'];
    requiredFields.forEach(field => {
        if (!(field in responseObject)) {
            validationResult.errors.push(`Missing required field: ${field}`);
            validationResult.isValid = false;
        }
    });
    
    // Check response can be properly serialized for HTTP transmission
    try {
        JSON.stringify(responseObject);
    } catch (error) {
        validationResult.isValid = false;
        validationResult.errors.push('Response object cannot be JSON serialized');
    }
    
    // Return comprehensive validation result object with detailed feedback
    return validationResult;
}

// Helper function to determine error type from HTTP status code
function getErrorTypeFromStatus(statusCode) {
    if (statusCode >= 400 && statusCode < 500) {
        return 'client-error';
    } else if (statusCode >= 500) {
        return 'server-error';
    }
    return 'unknown-error';
}

// Helper function to validate HTTP headers
function validateHeaders(headers) {
    const validHeaders = {};
    Object.keys(headers).forEach(key => {
        if (typeof key === 'string' && key.length > 0) {
            validHeaders[key] = String(headers[key]);
        }
    });
    return validHeaders;
}

// Helper function to determine content type based on body content
function determineContentType(body) {
    if (typeof body === 'string') {
        return 'text/plain';
    } else if (typeof body === 'object') {
        return 'application/json';
    }
    return 'application/octet-stream';
}

// Helper function to calculate content length
function getContentLength(body) {
    if (typeof body === 'string') {
        return body.length;
    } else if (typeof body === 'object') {
        return JSON.stringify(body).length;
    }
    return 0;
}

// Collection of successful HTTP response objects for success scenario testing and validation
const successResponses = {
    // Standard hello endpoint success response
    helloSuccess: createHelloSuccessResponse(),
    
    // Hello success response with additional metadata
    helloSuccessWithMetadata: createHelloSuccessResponse({
        requestSource: 'test-suite',
        testScenario: 'success-with-metadata'
    }),
    
    // Hello success response with custom headers
    helloSuccessWithHeaders: createResponseWithHeaders(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        {
            'X-Test-Header': 'success-scenario',
            'X-Custom-Value': 'hello-endpoint'
        }
    ),
    
    // Health endpoint success response
    healthSuccess: createSuccessResponse(
        { status: 'healthy', uptime: process.uptime() },
        HTTP_STATUS.OK,
        { endpoint: ROUTES.HEALTH }
    )
};

// Collection of error HTTP response objects for error scenario testing and validation
const errorResponses = {
    // 404 Not Found error response
    notFound: createNotFoundResponse('/nonexistent'),
    
    // 405 Method Not Allowed error response
    methodNotAllowed: createMethodNotAllowedResponse('POST', ['GET']),
    
    // 500 Internal Server Error response
    internalServerError: createInternalServerErrorResponse({
        errorSource: 'handler-exception',
        errorCode: 'HANDLER_ERROR'
    }),
    
    // 400 Bad Request error response
    badRequest: createErrorResponse(
        ERROR_MESSAGES.BAD_REQUEST,
        HTTP_STATUS.BAD_REQUEST,
        { validation: 'request-format-invalid' }
    )
};

// Collection of hello endpoint specific response objects for hello endpoint testing
const helloResponses = {
    // Standard hello world response
    standardHello: createHelloSuccessResponse(),
    
    // Hello response with timestamp
    helloWithTimestamp: createHelloSuccessResponse({
        includeTimestamp: true,
        responseTime: Date.now()
    }),
    
    // Hello response with metadata
    helloWithMetadata: createHelloSuccessResponse({
        endpoint: ROUTES.HELLO,
        method: 'GET',
        version: APPLICATION.API_VERSION
    }),
    
    // Hello response with headers
    helloWithHeaders: createResponseWithHeaders(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        {
            'X-Hello-Version': '1.0',
            'X-Response-Type': 'hello-world'
        }
    )
};

// Collection of response objects for response structure validation testing
const validationResponses = {
    // Response with valid structure
    validStructure: createSuccessResponse(RESPONSES.HELLO_WORLD, HTTP_STATUS.OK),
    
    // Response with valid metadata
    validMetadata: createSuccessResponse(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        {
            validation: 'metadata-complete',
            structure: 'valid-format'
        }
    ),
    
    // Response with valid headers
    validHeaders: createResponseWithHeaders(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        {
            'Content-Type': 'text/plain',
            'X-Validation': 'headers-valid'
        }
    ),
    
    // Response with valid content
    validContent: createResponseWithBody(
        { message: RESPONSES.HELLO_WORLD, valid: true },
        HTTP_STATUS.OK
    )
};

// Collection of edge case response objects for boundary testing and robustness validation
const edgeCaseResponses = {
    // Response with empty body
    emptyBody: createResponseWithBody('', HTTP_STATUS.OK),
    
    // Large response for testing payload limits
    largeResponse: createResponseWithBody(
        'x'.repeat(1000), // 1KB response
        HTTP_STATUS.OK
    ),
    
    // Response with unicode content
    unicodeContent: createResponseWithBody(
        'Hello 世界! 🌍 Ñiño café résumé',
        HTTP_STATUS.OK
    ),
    
    // Response with special characters
    specialCharacters: createResponseWithBody(
        'Special chars: !@#$%^&*()_+-=[]{}|;\':",./<>?',
        HTTP_STATUS.OK
    )
};

// Collection of response objects with various headers for header processing testing
const headerTestResponses = {
    // Response with content type header
    withContentType: createResponseWithHeaders(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        { 'Content-Type': 'text/plain; charset=utf-8' }
    ),
    
    // Response with custom headers
    withCustomHeaders: createResponseWithHeaders(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        {
            'X-Custom-Header': 'test-value',
            'X-Request-ID': 'req-12345',
            'X-Processing-Time': '25ms'
        }
    ),
    
    // Response with API version header
    withApiVersion: createResponseWithHeaders(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        { 'X-API-Version': APPLICATION.API_VERSION }
    ),
    
    // Response with correlation ID header
    withCorrelationId: createResponseWithHeaders(
        RESPONSES.HELLO_WORLD,
        HTTP_STATUS.OK,
        { 'X-Correlation-ID': generateResponseId('corr-') }
    )
};

// Export all response collections and factory functions for comprehensive testing support
module.exports = {
    // Response collections for organized testing scenarios
    successResponses,
    errorResponses,
    helloResponses,
    validationResponses,
    edgeCaseResponses,
    headerTestResponses,
    
    // Factory functions for dynamic response creation
    createSuccessResponse,
    createErrorResponse,
    createHelloSuccessResponse,
    createNotFoundResponse,
    createMethodNotAllowedResponse,
    createInternalServerErrorResponse,
    createResponseWithHeaders,
    createResponseWithBody,
    createBulkResponses,
    
    // Utility functions for response management and validation
    generateResponseId,
    validateResponseObject
};