/**
 * Test Fixture Module for HTTP Request Objects
 * 
 * This module provides predefined HTTP request objects, request data, and request factory functions 
 * for comprehensive testing of the Node.js tutorial application endpoints. Contains request fixtures 
 * for valid scenarios, invalid method testing, not found testing, and edge cases to support unit 
 * testing, integration testing, and end-to-end testing with SuperTest and Node.js built-in test runner.
 * 
 * Demonstrates proper HTTP request patterns and method validation for educational purposes while
 * supporting the Testing Strategy Implementation as defined in the technical specification.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import route constants, HTTP methods, and application metadata from centralized constants
const { ROUTES, HTTP_METHODS, APPLICATION } = require('../../utils/constants.js');

/**
 * Default User-Agent string for test requests using application version
 * Provides consistent identification for test request tracking and debugging
 * @type {string}
 */
const DEFAULT_USER_AGENT = `node-test-runner/${APPLICATION.VERSION}`;

/**
 * Test request ID prefix for unique request identification and correlation
 * Enables tracking of test requests across test execution cycles
 * @type {string}
 */
const TEST_REQUEST_ID_PREFIX = 'test-req-';

/**
 * Default Accept header for HTTP content negotiation testing
 * Supports text/plain response format with fallback to any content type
 * @type {string}
 */
const DEFAULT_ACCEPT_HEADER = 'text/plain, */*';

/**
 * Default request options for HTTP client configuration
 * Provides consistent timeout and redirect behavior for test reliability
 * @type {Object}
 */
const DEFAULT_REQUEST_OPTIONS = { timeout: 5000, followRedirect: false };

/**
 * Factory function that creates valid HTTP GET request objects for the /hello endpoint
 * with customizable headers, options, and metadata for testing successful request scenarios.
 * Supports comprehensive testing of the Hello Endpoint Implementation as specified in
 * Technical Specifications/Product Requirements/Feature Catalog.
 * 
 * @param {Object} options - Customizable request options and configuration
 * @param {Object} options.headers - Custom HTTP headers to include in request
 * @param {Object} options.metadata - Additional test metadata for request tracking
 * @param {number} options.timeout - Request timeout in milliseconds
 * @param {boolean} options.followRedirect - Whether to follow HTTP redirects
 * @returns {Object} HTTP request object configured for valid hello endpoint testing
 */
function createValidHelloRequest(options = {}) {
    // Set HTTP method to GET using HTTP_METHODS.GET constant for consistency
    const method = HTTP_METHODS.GET;
    
    // Set request path to /hello using ROUTES.HELLO constant from centralized configuration
    const path = ROUTES.HELLO;
    
    // Add default headers including User-Agent and Accept headers for proper HTTP communication
    const defaultHeaders = {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': DEFAULT_ACCEPT_HEADER,
        'Content-Type': 'text/plain'
    };
    
    // Merge provided options with default request configuration for flexibility
    const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };
    const requestOptions = { ...DEFAULT_REQUEST_OPTIONS, ...options };
    
    // Generate unique request ID for test correlation and debugging purposes
    const requestId = generateRequestId(TEST_REQUEST_ID_PREFIX);
    
    // Add test-specific metadata for request identification and tracking
    const testMetadata = {
        requestId,
        testType: 'valid-request',
        endpoint: path,
        method,
        timestamp: new Date().toISOString(),
        ...options.metadata
    };
    
    // Set timeout and other request options from configuration
    const finalOptions = {
        timeout: requestOptions.timeout,
        followRedirect: requestOptions.followRedirect,
        agent: false // Disable connection pooling for test isolation
    };
    
    // Return complete request object ready for SuperTest execution
    return {
        method,
        path,
        headers: mergedHeaders,
        options: finalOptions,
        metadata: testMetadata,
        // SuperTest-compatible format
        url: path,
        type: 'GET'
    };
}

/**
 * Factory function that creates HTTP request objects with invalid methods (POST, PUT, DELETE) 
 * for the /hello endpoint to test method validation and 405 error responses.
 * Supports HTTP Method Validation Testing as specified in Technical Specifications.
 * 
 * @param {string} method - HTTP method to use (POST, PUT, DELETE, PATCH)
 * @param {Object} options - Additional request configuration options
 * @param {Object} options.body - Request body data for methods that support it
 * @param {Object} options.headers - Custom HTTP headers
 * @returns {Object} HTTP request object with invalid method for method validation testing
 */
function createInvalidMethodRequest(method, options = {}) {
    // Set HTTP method to provided method parameter (POST, PUT, DELETE, PATCH)
    const requestMethod = method || HTTP_METHODS.POST;
    
    // Set request path to /hello using ROUTES.HELLO constant for consistency
    const path = ROUTES.HELLO;
    
    // Add standard headers for invalid method request testing
    const defaultHeaders = {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': DEFAULT_ACCEPT_HEADER
    };
    
    // Add request body if method requires it (POST, PUT, PATCH)
    let requestBody = null;
    if ([HTTP_METHODS.POST, HTTP_METHODS.PUT, 'PATCH'].includes(requestMethod)) {
        requestBody = options.body || { message: 'test data' };
        defaultHeaders['Content-Type'] = 'application/json';
    }
    
    const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };
    
    // Generate unique request ID for invalid method test correlation
    const requestId = generateRequestId(TEST_REQUEST_ID_PREFIX);
    
    // Set test metadata for method validation scenario identification
    const testMetadata = {
        requestId,
        testType: 'invalid-method',
        endpoint: path,
        method: requestMethod,
        expectedStatus: 405, // Method Not Allowed
        timestamp: new Date().toISOString()
    };
    
    // Configure timeout and request options for invalid method testing
    const requestOptions = { ...DEFAULT_REQUEST_OPTIONS, ...options };
    
    // Return invalid method request object for 405 error testing
    return {
        method: requestMethod,
        path,
        headers: mergedHeaders,
        body: requestBody,
        options: requestOptions,
        metadata: testMetadata,
        // SuperTest-compatible format
        url: path,
        type: requestMethod,
        send: requestBody
    };
}

/**
 * Factory function that creates HTTP GET request objects for non-existent paths 
 * to test route matching and 404 Not Found error responses.
 * Supports Route Not Found Testing as specified in Technical Specifications.
 * 
 * @param {string} path - Non-existent path to request
 * @param {Object} options - Additional request configuration options
 * @returns {Object} HTTP request object for non-existent path to test 404 error handling
 */
function createNotFoundRequest(path, options = {}) {
    // Set HTTP method to GET using HTTP_METHODS.GET constant
    const method = HTTP_METHODS.GET;
    
    // Set request path to provided path parameter for 404 testing
    const requestPath = path || '/non-existent-endpoint';
    
    // Add standard headers for not found request testing
    const defaultHeaders = {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': DEFAULT_ACCEPT_HEADER
    };
    
    const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };
    
    // Generate unique request ID for not found test correlation
    const requestId = generateRequestId(TEST_REQUEST_ID_PREFIX);
    
    // Set test metadata for 404 error scenario identification
    const testMetadata = {
        requestId,
        testType: 'not-found',
        endpoint: requestPath,
        method,
        expectedStatus: 404, // Not Found
        timestamp: new Date().toISOString()
    };
    
    // Configure timeout and request options for not found testing
    const requestOptions = { ...DEFAULT_REQUEST_OPTIONS, ...options };
    
    // Add path validation context for debugging purposes
    const pathContext = {
        originalPath: requestPath,
        pathType: 'non-existent',
        validPaths: [ROUTES.HELLO, ROUTES.HEALTH]
    };
    
    // Return not found request object for 404 error testing
    return {
        method,
        path: requestPath,
        headers: mergedHeaders,
        options: requestOptions,
        metadata: { ...testMetadata, pathContext },
        // SuperTest-compatible format
        url: requestPath,
        type: method
    };
}

/**
 * Factory function that creates HTTP request objects with custom headers for testing 
 * header processing, content negotiation, and request metadata handling.
 * 
 * @param {string} method - HTTP method to use
 * @param {string} path - Request path
 * @param {Object} headers - Custom headers to include
 * @param {Object} options - Additional request options
 * @returns {Object} HTTP request object with custom headers for header processing testing
 */
function createRequestWithHeaders(method, path, headers = {}, options = {}) {
    // Set HTTP method using provided method parameter
    const requestMethod = method || HTTP_METHODS.GET;
    
    // Set request path using provided path parameter
    const requestPath = path || ROUTES.HELLO;
    
    // Merge provided headers with default request headers
    const defaultHeaders = {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': DEFAULT_ACCEPT_HEADER
    };
    
    // Validate header names and values for proper HTTP format
    const validatedHeaders = {};
    Object.keys(headers).forEach(headerName => {
        if (typeof headerName === 'string' && headerName.trim() !== '') {
            const headerValue = headers[headerName];
            if (headerValue !== null && headerValue !== undefined) {
                validatedHeaders[headerName] = String(headerValue);
            }
        }
    });
    
    const mergedHeaders = { ...defaultHeaders, ...validatedHeaders };
    
    // Add test-specific headers for request identification
    mergedHeaders['X-Test-Request'] = 'true';
    mergedHeaders['X-Test-Type'] = 'header-testing';
    
    // Generate unique request ID for header test correlation
    const requestId = generateRequestId(TEST_REQUEST_ID_PREFIX);
    
    // Set test metadata for header processing scenario identification
    const testMetadata = {
        requestId,
        testType: 'header-testing',
        endpoint: requestPath,
        method: requestMethod,
        customHeaders: Object.keys(validatedHeaders),
        timestamp: new Date().toISOString()
    };
    
    // Return request object with complete header configuration
    return {
        method: requestMethod,
        path: requestPath,
        headers: mergedHeaders,
        options: { ...DEFAULT_REQUEST_OPTIONS, ...options },
        metadata: testMetadata,
        // SuperTest-compatible format
        url: requestPath,
        type: requestMethod,
        set: mergedHeaders
    };
}

/**
 * Generates unique request identifiers for test correlation, debugging, and request 
 * tracking across test scenarios and execution cycles.
 * 
 * @param {string} prefix - Prefix for the request identifier
 * @returns {string} Unique request identifier for test tracking and correlation
 */
function generateRequestId(prefix = TEST_REQUEST_ID_PREFIX) {
    // Use provided prefix or default TEST_REQUEST_ID_PREFIX
    const idPrefix = prefix || TEST_REQUEST_ID_PREFIX;
    
    // Generate timestamp-based unique identifier component
    const timestamp = Date.now();
    
    // Add random component for uniqueness guarantee
    const randomComponent = Math.random().toString(36).substring(2, 8);
    
    // Format identifier for readability and parsing
    const identifier = `${idPrefix}${timestamp}-${randomComponent}`;
    
    // Ensure identifier meets HTTP header value requirements (no spaces, valid characters)
    const sanitizedIdentifier = identifier.replace(/[^\w\-\.]/g, '-');
    
    // Return complete unique request identifier string
    return sanitizedIdentifier;
}

/**
 * Creates arrays of request objects for load testing, concurrent request testing, 
 * and bulk operation testing scenarios with configurable request patterns.
 * 
 * @param {number} count - Number of requests to generate
 * @param {Object} template - Base template for request generation
 * @param {Object} options - Configuration options for bulk request generation
 * @returns {Array} Array of HTTP request objects for bulk testing scenarios
 */
function createBulkRequests(count, template = {}, options = {}) {
    // Create base request template from provided template parameter
    const baseTemplate = {
        method: HTTP_METHODS.GET,
        path: ROUTES.HELLO,
        headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            'Accept': DEFAULT_ACCEPT_HEADER
        },
        ...template
    };
    
    // Generate array of specified count using provided count parameter
    const requests = [];
    const requestCount = Math.max(1, Math.min(count || 10, 1000)); // Limit to reasonable range
    
    for (let i = 0; i < requestCount; i++) {
        // Create unique request ID for each request in bulk set
        const requestId = generateRequestId(`${TEST_REQUEST_ID_PREFIX}bulk-${i}-`);
        
        // Apply variations to requests if specified in options
        const variation = options.variations ? options.variations[i % options.variations.length] : {};
        
        // Add bulk test metadata to each request object
        const bulkMetadata = {
            requestId,
            testType: 'bulk-testing',
            bulkIndex: i,
            bulkTotal: requestCount,
            timestamp: new Date().toISOString(),
            ...variation.metadata
        };
        
        // Ensure each request has unique tracking information
        const request = {
            ...baseTemplate,
            ...variation,
            headers: {
                ...baseTemplate.headers,
                ...variation.headers,
                'X-Bulk-Request': 'true',
                'X-Bulk-Index': i.toString(),
                'X-Request-ID': requestId
            },
            metadata: bulkMetadata,
            // SuperTest-compatible format
            url: variation.path || baseTemplate.path,
            type: variation.method || baseTemplate.method
        };
        
        // Validate all requests meet HTTP format requirements
        if (request.method && request.path) {
            requests.push(request);
        }
    }
    
    // Return array of configured request objects for bulk testing
    return requests;
}

/**
 * Creates HTTP request objects with request body data for testing POST, PUT, 
 * and other methods that include body content with proper content type handling.
 * 
 * @param {string} method - HTTP method (POST, PUT, PATCH)
 * @param {string} path - Request path
 * @param {any} body - Request body data
 * @param {Object} options - Additional request options
 * @returns {Object} HTTP request object with body content for body processing testing
 */
function createRequestWithBody(method, path, body, options = {}) {
    // Set HTTP method using provided method parameter
    const requestMethod = method || HTTP_METHODS.POST;
    
    // Set request path using provided path parameter
    const requestPath = path || ROUTES.HELLO;
    
    // Set request body using provided body parameter
    const requestBody = body;
    
    // Determine appropriate Content-Type header based on body type
    let contentType = 'application/json';
    if (typeof requestBody === 'string') {
        contentType = 'text/plain';
    } else if (requestBody instanceof FormData) {
        contentType = 'multipart/form-data';
    } else if (requestBody instanceof URLSearchParams) {
        contentType = 'application/x-www-form-urlencoded';
    }
    
    // Add Content-Length header based on body size
    const bodyString = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    const contentLength = Buffer.byteLength(bodyString, 'utf8');
    
    const defaultHeaders = {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': DEFAULT_ACCEPT_HEADER,
        'Content-Type': contentType,
        'Content-Length': contentLength.toString()
    };
    
    const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };
    
    // Generate unique request ID for body test correlation
    const requestId = generateRequestId(TEST_REQUEST_ID_PREFIX);
    
    // Set test metadata for body processing scenario identification
    const testMetadata = {
        requestId,
        testType: 'body-testing',
        endpoint: requestPath,
        method: requestMethod,
        bodyType: typeof requestBody,
        contentType,
        contentLength,
        timestamp: new Date().toISOString()
    };
    
    // Return request object with complete body configuration
    return {
        method: requestMethod,
        path: requestPath,
        headers: mergedHeaders,
        body: requestBody,
        options: { ...DEFAULT_REQUEST_OPTIONS, ...options },
        metadata: testMetadata,
        // SuperTest-compatible format
        url: requestPath,
        type: requestMethod,
        send: requestBody
    };
}

/**
 * Validates HTTP request objects for proper structure, required properties, 
 * and HTTP specification compliance to ensure test fixture quality.
 * 
 * @param {Object} requestObject - HTTP request object to validate
 * @returns {Object} Validation result with status and detailed validation information
 */
function validateRequestObject(requestObject) {
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        details: {}
    };
    
    // Validate request object has required properties (method, path)
    if (!requestObject || typeof requestObject !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Request object must be a valid object');
        return validationResult;
    }
    
    // Check HTTP method is valid and supported
    const validMethods = [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.DELETE, 'PATCH'];
    if (!requestObject.method || !validMethods.includes(requestObject.method)) {
        validationResult.isValid = false;
        validationResult.errors.push(`Invalid or missing HTTP method: ${requestObject.method}`);
    }
    
    // Validate request path format and structure
    if (!requestObject.path || typeof requestObject.path !== 'string' || !requestObject.path.startsWith('/')) {
        validationResult.isValid = false;
        validationResult.errors.push(`Invalid or missing request path: ${requestObject.path}`);
    }
    
    // Check headers follow HTTP header specification
    if (requestObject.headers) {
        if (typeof requestObject.headers !== 'object') {
            validationResult.isValid = false;
            validationResult.errors.push('Headers must be an object');
        } else {
            Object.keys(requestObject.headers).forEach(headerName => {
                if (typeof headerName !== 'string' || headerName.trim() === '') {
                    validationResult.warnings.push(`Invalid header name: ${headerName}`);
                }
            });
        }
    }
    
    // Validate body content if present
    if (requestObject.body !== undefined && requestObject.body !== null) {
        if ([HTTP_METHODS.GET, HTTP_METHODS.DELETE].includes(requestObject.method)) {
            validationResult.warnings.push(`Body present for ${requestObject.method} request`);
        }
        validationResult.details.hasBody = true;
        validationResult.details.bodyType = typeof requestObject.body;
    }
    
    // Verify request options are properly formatted
    if (requestObject.options && typeof requestObject.options !== 'object') {
        validationResult.warnings.push('Request options should be an object');
    }
    
    // Check test metadata is complete and valid
    if (requestObject.metadata) {
        if (!requestObject.metadata.requestId) {
            validationResult.warnings.push('Missing request ID in metadata');
        }
        if (!requestObject.metadata.testType) {
            validationResult.warnings.push('Missing test type in metadata');
        }
    }
    
    // Return comprehensive validation result object
    validationResult.details.method = requestObject.method;
    validationResult.details.path = requestObject.path;
    validationResult.details.hasHeaders = !!requestObject.headers;
    validationResult.details.hasMetadata = !!requestObject.metadata;
    
    return validationResult;
}

// Collection of valid HTTP request objects for successful endpoint testing scenarios
const validRequests = {
    // Basic GET request to /hello endpoint
    helloGet: createValidHelloRequest(),
    
    // GET request to /hello with custom headers
    helloGetWithHeaders: createRequestWithHeaders(HTTP_METHODS.GET, ROUTES.HELLO, {
        'Accept': 'text/plain',
        'X-Custom-Header': 'test-value'
    }),
    
    // GET request to /hello with specific User-Agent
    helloGetWithUserAgent: createRequestWithHeaders(HTTP_METHODS.GET, ROUTES.HELLO, {
        'User-Agent': `${APPLICATION.NAME}/${APPLICATION.VERSION} (test-client)`
    }),
    
    // GET request to /health endpoint (if available)
    healthGet: createValidHelloRequest({ 
        metadata: { testType: 'health-check' } 
    })
};

// Update health request to use correct path
validRequests.healthGet.path = ROUTES.HEALTH;
validRequests.healthGet.url = ROUTES.HEALTH;

// Collection of invalid method HTTP request objects for method validation error testing
const invalidRequests = {
    // POST request to /hello (should return 405)
    helloPost: createInvalidMethodRequest(HTTP_METHODS.POST),
    
    // PUT request to /hello (should return 405)
    helloPut: createInvalidMethodRequest(HTTP_METHODS.PUT),
    
    // DELETE request to /hello (should return 405)
    helloDelete: createInvalidMethodRequest(HTTP_METHODS.DELETE),
    
    // PATCH request to /hello (should return 405)
    helloPatch: createInvalidMethodRequest('PATCH')
};

// Collection of HTTP request objects for 404 Not Found error scenario testing
const notFoundRequests = {
    // Request to completely invalid path
    invalidPath: createNotFoundRequest('/invalid-path'),
    
    // Request to non-existent endpoint
    nonExistentEndpoint: createNotFoundRequest('/api/nonexistent'),
    
    // Request to /hello with trailing slash (path sensitivity test)
    helloWithTrailingSlash: createNotFoundRequest('/hello/'),
    
    // Request to similar but incorrect path
    similarPath: createNotFoundRequest('/hello-world')
};

// Collection of edge case HTTP request objects for boundary testing and robustness validation
const edgeCaseRequests = {
    // Request with no custom headers (minimal headers)
    emptyHeaders: createRequestWithHeaders(HTTP_METHODS.GET, ROUTES.HELLO, {}),
    
    // Request with very long path
    longPath: createNotFoundRequest('/' + 'a'.repeat(1000)),
    
    // Request with Unicode characters in path
    unicodePath: createNotFoundRequest('/hello/测试'),
    
    // Request with special characters in path
    specialCharacters: createNotFoundRequest('/hello?param=value&test=1')
};

// Collection of HTTP request objects with various headers for header processing testing
const headerTestRequests = {
    // Request with Accept header negotiation
    withAcceptHeader: createRequestWithHeaders(HTTP_METHODS.GET, ROUTES.HELLO, {
        'Accept': 'text/plain, application/json, */*'
    }),
    
    // Request with custom User-Agent
    withUserAgent: createRequestWithHeaders(HTTP_METHODS.GET, ROUTES.HELLO, {
        'User-Agent': 'TestClient/1.0 (Educational Testing)'
    }),
    
    // Request with multiple custom headers
    withCustomHeaders: createRequestWithHeaders(HTTP_METHODS.GET, ROUTES.HELLO, {
        'X-Test-Name': 'header-processing-test',
        'X-Test-Version': '1.0',
        'X-Request-Source': 'automated-test'
    }),
    
    // Request with common HTTP headers
    withMultipleHeaders: createRequestWithHeaders(HTTP_METHODS.GET, ROUTES.HELLO, {
        'Accept': 'text/plain',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    })
};

// Export all fixture objects and factory functions for comprehensive testing support
module.exports = {
    // Request collections for different test scenarios
    validRequests,
    invalidRequests,
    notFoundRequests,
    edgeCaseRequests,
    headerTestRequests,
    
    // Factory functions for dynamic request creation
    createValidHelloRequest,
    createInvalidMethodRequest,
    createNotFoundRequest,
    createRequestWithHeaders,
    createRequestWithBody,
    createBulkRequests,
    
    // Utility functions for request management
    generateRequestId,
    validateRequestObject,
    
    // Global constants for consistent testing
    DEFAULT_USER_AGENT,
    TEST_REQUEST_ID_PREFIX,
    DEFAULT_ACCEPT_HEADER,
    DEFAULT_REQUEST_OPTIONS
};