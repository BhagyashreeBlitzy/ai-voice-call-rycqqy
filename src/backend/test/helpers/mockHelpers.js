/**
 * Specialized Mock Utilities Module for Express.js Components
 * 
 * This module provides comprehensive mocking capabilities for Express.js components, 
 * service layer functions, controllers, middleware, and HTTP objects in the Node.js 
 * tutorial application. Focuses on creating realistic mock implementations of 
 * Express.js request/response objects, service functions, middleware components, 
 * and error scenarios for isolated unit testing.
 * 
 * Integrates with Node.js built-in test runner and testHelpers.js to provide 
 * complete mocking infrastructure for testing Express.js 5.1.0 applications with 
 * educational focus on proper mocking patterns and test isolation strategies.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import required utilities from testHelpers module
const {
    createMockFunction,
    generateTestId,
    deepClone,
    createTestLogger
} = require('./testHelpers.js'); // Node.js v22.x LTS compatible utilities

// Import application constants for HTTP status codes, methods, routes, and error messages
const {
    HTTP_STATUS,
    HTTP_METHODS,
    ROUTES,
    RESPONSES,
    ERROR_MESSAGES
} = require('../../utils/constants.js'); // Application-wide constants

// Import test fixtures for realistic mock data generation
const {
    validRequests
} = require('../fixtures/requests.js'); // Valid request test fixtures

const {
    successResponses
} = require('../fixtures/responses.js'); // Success response test fixtures

// Import Node.js built-in modules for event handling and streaming capabilities
const { EventEmitter } = require('node:events'); // Node.js built-in v22.x LTS
const { Readable, Writable } = require('node:stream'); // Node.js built-in v22.x LTS

// Global configuration constants for mock object creation and behavior
const DEFAULT_MOCK_CONFIG = { 
    trackCalls: true, 
    resetOnNextTest: true 
};

const MOCK_REQUEST_DEFAULTS = { 
    method: HTTP_METHODS.GET, 
    path: ROUTES.HELLO 
};

const MOCK_RESPONSE_DEFAULTS = { 
    statusCode: HTTP_STATUS.OK 
};

const MOCK_ERROR_DEFAULTS = { 
    name: 'MockError', 
    message: 'Test error' 
};

/**
 * Creates comprehensive mock Express.js request objects with customizable properties, 
 * headers, parameters, and body content for isolated request processing testing 
 * and controller unit testing.
 * 
 * @param {object} requestOptions - Configuration options for mock request creation
 * @param {string} requestOptions.method - HTTP method (default: GET)
 * @param {string} requestOptions.path - Request path (default: /hello)
 * @param {object} requestOptions.headers - Custom headers object
 * @param {object} requestOptions.params - Route parameters object
 * @param {object} requestOptions.query - Query string parameters object
 * @param {any} requestOptions.body - Request body content
 * @param {string} requestOptions.ip - Client IP address
 * @param {string} requestOptions.userAgent - User agent string
 * @returns {object} Mock Express.js request object with all standard request properties and methods for unit testing
 */
function createMockRequest(requestOptions = {}) {
    // Set HTTP method from requestOptions or default to GET using HTTP_METHODS.GET
    const method = requestOptions.method || MOCK_REQUEST_DEFAULTS.method;
    
    // Set request path from requestOptions or default to /hello using ROUTES.HELLO
    const path = requestOptions.path || MOCK_REQUEST_DEFAULTS.path;
    
    // Create mock headers object with default headers and merge custom headers from options
    const defaultHeaders = {
        'user-agent': requestOptions.userAgent || 'Node.js Test Runner',
        'accept': 'text/html,application/json',
        'connection': 'keep-alive',
        'host': 'localhost:3000'
    };
    const headers = { ...defaultHeaders, ...(requestOptions.headers || {}) };
    
    // Initialize request parameters (params, query, body) from requestOptions or empty objects
    const params = requestOptions.params || {};
    const query = requestOptions.query || {};
    const body = requestOptions.body || {};
    
    // Set up request metadata including client IP, user agent, and connection information
    const ip = requestOptions.ip || '127.0.0.1';
    const userAgent = requestOptions.userAgent || 'Node.js Test Runner';
    
    // Add Express.js specific properties like originalUrl, baseUrl, and route information
    const originalUrl = path + (Object.keys(query).length > 0 ? '?' + new URLSearchParams(query).toString() : '');
    const baseUrl = '';
    const route = {
        path: path,
        methods: { [method.toLowerCase()]: true }
    };
    
    // Set up request correlation ID using generateTestId for test tracking
    const correlationId = generateTestId('req-');
    
    // Create mock request object with EventEmitter capabilities for request events
    const mockRequest = Object.assign(new EventEmitter(), {
        // Core request properties
        method: method.toUpperCase(),
        url: path,
        originalUrl: originalUrl,
        path: path,
        baseUrl: baseUrl,
        route: route,
        
        // Headers and parameters
        headers: headers,
        params: params,
        query: query,
        body: body,
        
        // Connection and client information
        ip: ip,
        ips: [ip],
        protocol: 'http',
        secure: false,
        xhr: false,
        
        // Request metadata
        httpVersion: '1.1',
        httpVersionMajor: 1,
        httpVersionMinor: 1,
        complete: true,
        readable: true,
        
        // Express.js application and configuration
        app: null, // Set by test when needed
        res: null, // Set by createMockResponse when paired
        
        // Test correlation and tracking
        correlationId: correlationId,
        testMetadata: {
            createdAt: new Date().toISOString(),
            mockType: 'express-request',
            testId: correlationId
        },
        
        // Create mock request methods including get(), header(), and param() functions
        get: createMockFunction((headerName) => {
            // Case-insensitive header lookup following Express.js behavior
            const lowerName = headerName.toLowerCase();
            const headerKey = Object.keys(headers).find(key => key.toLowerCase() === lowerName);
            return headerKey ? headers[headerKey] : undefined;
        }, { trackCalls: true }),
        
        header: createMockFunction((headerName) => {
            // Alias for get() method following Express.js API
            return mockRequest.get(headerName);
        }, { trackCalls: true }),
        
        param: createMockFunction((paramName, defaultValue = undefined) => {
            // Parameter lookup in params, query, body order following Express.js behavior
            return params[paramName] || query[paramName] || body[paramName] || defaultValue;
        }, { trackCalls: true }),
        
        is: createMockFunction((type) => {
            // Content-Type matching following Express.js behavior
            const contentType = headers['content-type'] || '';
            return contentType.includes(type);
        }, { trackCalls: true }),
        
        accepts: createMockFunction((types) => {
            // Accept header matching following Express.js behavior
            const acceptHeader = headers['accept'] || '';
            if (Array.isArray(types)) {
                return types.find(type => acceptHeader.includes(type)) || false;
            }
            return acceptHeader.includes(types) ? types : false;
        }, { trackCalls: true }),
        
        acceptsCharsets: createMockFunction((charsets) => {
            // Accept-Charset header matching
            const acceptCharsetHeader = headers['accept-charset'] || 'utf-8';
            if (Array.isArray(charsets)) {
                return charsets.find(charset => acceptCharsetHeader.includes(charset)) || false;
            }
            return acceptCharsetHeader.includes(charsets) ? charsets : false;
        }, { trackCalls: true }),
        
        acceptsEncodings: createMockFunction((encodings) => {
            // Accept-Encoding header matching
            const acceptEncodingHeader = headers['accept-encoding'] || '';
            if (Array.isArray(encodings)) {
                return encodings.find(encoding => acceptEncodingHeader.includes(encoding)) || false;
            }
            return acceptEncodingHeader.includes(encodings) ? encodings : false;
        }, { trackCalls: true }),
        
        acceptsLanguages: createMockFunction((languages) => {
            // Accept-Language header matching
            const acceptLanguageHeader = headers['accept-language'] || 'en';
            if (Array.isArray(languages)) {
                return languages.find(language => acceptLanguageHeader.includes(language)) || false;
            }
            return acceptLanguageHeader.includes(languages) ? languages : false;
        }, { trackCalls: true }),
        
        range: createMockFunction((size, options = {}) => {
            // Range header parsing for partial content requests
            const rangeHeader = headers['range'];
            if (!rangeHeader) return undefined;
            
            // Simple range parsing for testing purposes
            const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (!matches) return -1; // Malformed range
            
            const start = parseInt(matches[1]);
            const end = matches[2] ? parseInt(matches[2]) : size - 1;
            
            return [{
                start: start,
                end: Math.min(end, size - 1)
            }];
        }, { trackCalls: true })
    });
    
    // Add event emitter capabilities for request events and streaming functionality
    mockRequest.on = createMockFunction((event, listener) => {
        return EventEmitter.prototype.on.call(mockRequest, event, listener);
    }, { trackCalls: true });
    
    mockRequest.emit = createMockFunction((event, ...args) => {
        return EventEmitter.prototype.emit.call(mockRequest, event, ...args);
    }, { trackCalls: true });
    
    // Add streaming capabilities for request body handling
    mockRequest.pipe = createMockFunction((destination, options) => {
        // Mock pipe functionality for testing stream handling
        if (typeof body === 'string') {
            // Simulate streaming string body content
            process.nextTick(() => {
                destination.write(body);
                destination.end();
            });
        }
        return destination;
    }, { trackCalls: true });
    
    mockRequest.unpipe = createMockFunction((destination) => {
        // Mock unpipe functionality for testing stream cleanup
        return mockRequest;
    }, { trackCalls: true });
    
    // Return complete mock request object with all Express.js request interface methods
    return mockRequest;
}

/**
 * Creates comprehensive mock Express.js response objects with status code management, 
 * header handling, JSON response methods, and response tracking for response testing 
 * and controller unit testing.
 * 
 * @param {object} responseOptions - Configuration options for mock response creation
 * @param {number} responseOptions.statusCode - HTTP status code (default: 200)
 * @param {object} responseOptions.headers - Custom headers object
 * @param {boolean} responseOptions.trackCalls - Enable call tracking (default: true)
 * @returns {object} Mock Express.js response object with all standard response properties and methods for unit testing
 */
function createMockResponse(responseOptions = {}) {
    // Initialize response status code from responseOptions or default to HTTP_STATUS.OK
    let statusCode = responseOptions.statusCode || MOCK_RESPONSE_DEFAULTS.statusCode;
    
    // Create response headers object with default headers and merge custom headers from options
    const defaultHeaders = {
        'x-powered-by': 'Express',
        'content-type': 'text/html; charset=utf-8'
    };
    let headers = { ...defaultHeaders, ...(responseOptions.headers || {}) };
    
    // Set up response tracking including response data capture and method call logging
    const responseData = {
        statusCode: statusCode,
        headers: { ...headers },
        body: null,
        sent: false,
        finished: false
    };
    
    // Set up response event emitter capabilities for response events and streaming
    const correlationId = generateTestId('res-');
    
    // Add response timing tracking for performance testing and method call analysis
    const timingData = {
        startTime: Date.now(),
        endTime: null,
        responseTime: null
    };
    
    // Create mock response object with EventEmitter capabilities
    const mockResponse = Object.assign(new EventEmitter(), {
        // Core response properties
        statusCode: statusCode,
        statusMessage: 'OK',
        headersSent: false,
        finished: false,
        
        // Response headers and data
        headers: headers,
        locals: {},
        
        // Express.js application context
        app: null, // Set by test when needed
        req: null, // Set by createMockRequest when paired
        
        // Test correlation and tracking
        correlationId: correlationId,
        testMetadata: {
            createdAt: new Date().toISOString(),
            mockType: 'express-response',
            testId: correlationId
        },
        
        // Response data capture for testing
        _responseData: responseData,
        _timingData: timingData,
        
        // Create mock response methods including status(), json(), send(), and end() functions
        status: createMockFunction((code) => {
            statusCode = code;
            responseData.statusCode = code;
            mockResponse.statusCode = code;
            
            // Set appropriate status message based on status code
            if (code === HTTP_STATUS.OK) mockResponse.statusMessage = 'OK';
            else if (code === HTTP_STATUS.NOT_FOUND) mockResponse.statusMessage = 'Not Found';
            else if (code === HTTP_STATUS.INTERNAL_SERVER_ERROR) mockResponse.statusMessage = 'Internal Server Error';
            else if (code === HTTP_STATUS.BAD_REQUEST) mockResponse.statusMessage = 'Bad Request';
            else if (code === HTTP_STATUS.METHOD_NOT_ALLOWED) mockResponse.statusMessage = 'Method Not Allowed';
            
            // Return mock response object for method chaining
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        json: createMockFunction((data) => {
            // Set content-type header for JSON responses
            mockResponse.set('Content-Type', 'application/json; charset=utf-8');
            
            // Store response data for testing verification
            responseData.body = data;
            responseData.sent = true;
            mockResponse.finished = true;
            
            // Calculate response timing
            timingData.endTime = Date.now();
            timingData.responseTime = timingData.endTime - timingData.startTime;
            
            // Emit response events for testing
            mockResponse.emit('finish');
            
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        send: createMockFunction((data) => {
            // Handle different data types for send method
            if (typeof data === 'string') {
                mockResponse.set('Content-Type', 'text/html; charset=utf-8');
            } else if (typeof data === 'object' && data !== null) {
                mockResponse.set('Content-Type', 'application/json; charset=utf-8');
                data = JSON.stringify(data);
            }
            
            // Store response data for testing verification
            responseData.body = data;
            responseData.sent = true;
            mockResponse.finished = true;
            
            // Calculate response timing
            timingData.endTime = Date.now();
            timingData.responseTime = timingData.endTime - timingData.startTime;
            
            // Emit response events for testing
            mockResponse.emit('finish');
            
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        end: createMockFunction((data, encoding) => {
            // End response with optional data
            if (data !== undefined) {
                responseData.body = data;
            }
            
            responseData.sent = true;
            mockResponse.finished = true;
            mockResponse.headersSent = true;
            
            // Calculate response timing
            timingData.endTime = Date.now();
            timingData.responseTime = timingData.endTime - timingData.startTime;
            
            // Emit response events for testing
            mockResponse.emit('finish');
            mockResponse.emit('close');
            
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        // Add header management methods including set(), get(), and setHeader() functions
        set: createMockFunction((field, value) => {
            if (typeof field === 'object') {
                // Set multiple headers from object
                Object.assign(headers, field);
                Object.assign(responseData.headers, field);
            } else {
                // Set single header
                headers[field.toLowerCase()] = value;
                responseData.headers[field.toLowerCase()] = value;
            }
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        get: createMockFunction((field) => {
            // Get header value with case-insensitive lookup
            const lowerField = field.toLowerCase();
            return headers[lowerField];
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        setHeader: createMockFunction((name, value) => {
            // Alias for set() method following Node.js http.ServerResponse API
            return mockResponse.set(name, value);
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        getHeader: createMockFunction((name) => {
            // Alias for get() method following Node.js http.ServerResponse API
            return mockResponse.get(name);
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        removeHeader: createMockFunction((name) => {
            // Remove header from response
            const lowerName = name.toLowerCase();
            delete headers[lowerName];
            delete responseData.headers[lowerName];
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        // Additional Express.js response methods
        redirect: createMockFunction((statusOrUrl, url) => {
            // Handle redirect with optional status code
            if (typeof statusOrUrl === 'number') {
                mockResponse.status(statusOrUrl);
                mockResponse.set('Location', url);
            } else {
                mockResponse.status(HTTP_STATUS.FOUND); // 302
                mockResponse.set('Location', statusOrUrl);
            }
            
            responseData.sent = true;
            mockResponse.finished = true;
            
            // Calculate response timing
            timingData.endTime = Date.now();
            timingData.responseTime = timingData.endTime - timingData.startTime;
            
            mockResponse.emit('finish');
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        cookie: createMockFunction((name, value, options = {}) => {
            // Set cookie header
            let cookieString = `${name}=${value}`;
            
            if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
            if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`;
            if (options.path) cookieString += `; Path=${options.path}`;
            if (options.domain) cookieString += `; Domain=${options.domain}`;
            if (options.secure) cookieString += '; Secure';
            if (options.httpOnly) cookieString += '; HttpOnly';
            if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
            
            // Handle multiple cookies by storing in array
            const existingCookies = headers['set-cookie'] || [];
            const cookiesArray = Array.isArray(existingCookies) ? existingCookies : [existingCookies];
            cookiesArray.push(cookieString);
            
            mockResponse.set('Set-Cookie', cookiesArray);
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        clearCookie: createMockFunction((name, options = {}) => {
            // Clear cookie by setting expired date
            const clearOptions = {
                ...options,
                expires: new Date(1), // Set to epoch
                maxAge: 0
            };
            return mockResponse.cookie(name, '', clearOptions);
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        type: createMockFunction((type) => {
            // Set Content-Type header
            mockResponse.set('Content-Type', type);
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false }),
        
        format: createMockFunction((obj) => {
            // Content negotiation based on Accept header
            const acceptHeader = mockResponse.req?.get('Accept') || 'text/html';
            
            if (obj.html && acceptHeader.includes('text/html')) {
                mockResponse.type('text/html').send(obj.html);
            } else if (obj.json && acceptHeader.includes('application/json')) {
                mockResponse.json(obj.json);
            } else if (obj.text && acceptHeader.includes('text/plain')) {
                mockResponse.type('text/plain').send(obj.text);
            } else if (obj.default) {
                mockResponse.send(obj.default);
            } else {
                mockResponse.status(HTTP_STATUS.NOT_ACCEPTABLE).end();
            }
            
            return mockResponse;
        }, { trackCalls: responseOptions.trackCalls !== false })
    });
    
    // Add streaming capabilities for response writing
    mockResponse.write = createMockFunction((chunk, encoding) => {
        // Mock write functionality for testing stream writing
        if (!responseData.body) responseData.body = '';
        responseData.body = typeof responseData.body === 'string' ? responseData.body + chunk : chunk;
        mockResponse.headersSent = true;
        return true;
    }, { trackCalls: responseOptions.trackCalls !== false });
    
    // Create response validation methods for verifying response state and method calls
    mockResponse.getResponseData = function() {
        return deepClone(responseData);
    };
    
    mockResponse.getTimingData = function() {
        return deepClone(timingData);
    };
    
    mockResponse.wasSent = function() {
        return responseData.sent;
    };
    
    mockResponse.getStatusCode = function() {
        return responseData.statusCode;
    };
    
    mockResponse.getResponseBody = function() {
        return responseData.body;
    };
    
    mockResponse.getResponseHeaders = function() {
        return deepClone(responseData.headers);
    };
    
    // Return complete mock response object with all Express.js response interface methods
    return mockResponse;
}

/**
 * Creates mock Express.js next function for middleware testing with error handling, 
 * call tracking, and middleware chain simulation for isolated middleware testing.
 * 
 * @param {object} nextOptions - Configuration options for mock next function
 * @param {boolean} nextOptions.trackCalls - Enable call tracking (default: true)
 * @param {boolean} nextOptions.captureErrors - Capture errors passed to next (default: true)
 * @param {Function} nextOptions.onCall - Callback function called when next is invoked
 * @returns {Function} Mock Express.js next function with call tracking and error handling for middleware testing
 */
function createMockNext(nextOptions = {}) {
    // Set up error handling behavior for next function error propagation testing
    const errorCapture = {
        errors: [],
        calls: [],
        lastError: null,
        callCount: 0
    };
    
    // Create mock function using createMockFunction utility with call tracking enabled
    const mockNext = createMockFunction((error) => {
        // Add call tracking to record next function invocations and arguments
        errorCapture.callCount++;
        errorCapture.calls.push({
            timestamp: new Date().toISOString(),
            error: error,
            hasError: !!error
        });
        
        // Implement error injection capabilities for testing middleware error handling
        if (error && nextOptions.captureErrors !== false) {
            errorCapture.errors.push(error);
            errorCapture.lastError = error;
        }
        
        // Add middleware chain simulation for testing middleware execution flow
        if (typeof nextOptions.onCall === 'function') {
            nextOptions.onCall(error);
        }
        
        // Set up timing tracking for middleware performance testing and analysis
        process.nextTick(() => {
            // Simulate asynchronous middleware chain continuation
            if (error) {
                // Error case - would normally trigger error handling middleware
                mockNext.emit('error', error);
            } else {
                // Success case - would normally continue to next middleware
                mockNext.emit('continue');
            }
        });
        
    }, { 
        trackCalls: nextOptions.trackCalls !== false,
        name: 'mockNext'
    });
    
    // Add EventEmitter capabilities for middleware chain events
    Object.assign(mockNext, new EventEmitter());
    
    // Create validation methods for verifying next function call patterns
    mockNext.getCallCount = function() {
        return errorCapture.callCount;
    };
    
    mockNext.getCalls = function() {
        return deepClone(errorCapture.calls);
    };
    
    mockNext.getErrors = function() {
        return deepClone(errorCapture.errors);
    };
    
    mockNext.getLastError = function() {
        return errorCapture.lastError;
    };
    
    mockNext.wasCalledWithError = function() {
        return errorCapture.errors.length > 0;
    };
    
    mockNext.wasCalledWithoutError = function() {
        return errorCapture.calls.some(call => !call.hasError);
    };
    
    mockNext.reset = function() {
        errorCapture.errors = [];
        errorCapture.calls = [];
        errorCapture.lastError = null;
        errorCapture.callCount = 0;
    };
    
    // Add debugging capabilities including call stack analysis and execution tracing
    mockNext.testMetadata = {
        createdAt: new Date().toISOString(),
        mockType: 'express-next',
        testId: generateTestId('next-')
    };
    
    // Return configured mock next function ready for middleware testing scenarios
    return mockNext;
}

/**
 * Creates comprehensive mock implementation of helloService module with all service 
 * functions mocked for isolated controller testing without service layer dependencies.
 * 
 * @param {object} mockConfig - Configuration options for service mocking
 * @param {boolean} mockConfig.trackCalls - Enable call tracking (default: true)
 * @param {object} mockConfig.responses - Custom response configurations
 * @param {object} mockConfig.errors - Error injection configuration
 * @returns {object} Mock helloService object with all service functions mocked and configurable behavior
 */
function mockHelloService(mockConfig = {}) {
    const config = { ...DEFAULT_MOCK_CONFIG, ...mockConfig };
    const serviceState = {
        callHistory: [],
        responses: {
            processHelloRequest: successResponses.helloSuccess,
            validateHelloRequest: { isValid: true, errors: [] },
            generateHelloResponse: RESPONSES.HELLO_WORLD,
            createRequestContext: { correlationId: generateTestId('ctx-') },
            formatServiceError: { error: 'Formatted error' }
        },
        errors: mockConfig.errors || {}
    };
    
    // Merge custom responses from mockConfig
    if (mockConfig.responses) {
        Object.assign(serviceState.responses, mockConfig.responses);
    }
    
    const mockService = {
        // Mock processHelloRequest function with configurable return values and error injection
        processHelloRequest: createMockFunction(async (requestContext) => {
            const callData = {
                method: 'processHelloRequest',
                timestamp: new Date().toISOString(),
                args: [requestContext],
                correlationId: requestContext?.correlationId || generateTestId('call-')
            };
            serviceState.callHistory.push(callData);
            
            // Implement error injection capabilities for testing service error handling scenarios
            if (serviceState.errors.processHelloRequest) {
                throw serviceState.errors.processHelloRequest;
            }
            
            // Mock service response simulation with realistic response timing and metadata
            await new Promise(resolve => setTimeout(resolve, 1)); // Simulate async processing
            
            return {
                ...serviceState.responses.processHelloRequest,
                processingTime: Date.now() - Date.parse(callData.timestamp),
                correlationId: callData.correlationId
            };
        }, { trackCalls: config.trackCalls }),
        
        // Mock validateHelloRequest function with ValidationResult return values and error scenarios
        validateHelloRequest: createMockFunction((request) => {
            const callData = {
                method: 'validateHelloRequest',
                timestamp: new Date().toISOString(),
                args: [request],
                correlationId: generateTestId('val-')
            };
            serviceState.callHistory.push(callData);
            
            if (serviceState.errors.validateHelloRequest) {
                throw serviceState.errors.validateHelloRequest;
            }
            
            // Return validation result based on configuration
            const validationResult = {
                ...serviceState.responses.validateHelloRequest,
                timestamp: callData.timestamp,
                correlationId: callData.correlationId
            };
            
            // Add method validation for hello endpoint
            if (request?.method && request.method !== HTTP_METHODS.GET) {
                validationResult.isValid = false;
                validationResult.errors = [ERROR_MESSAGES.METHOD_NOT_ALLOWED];
            }
            
            return validationResult;
        }, { trackCalls: config.trackCalls }),
        
        // Mock generateHelloResponse function with standard hello world response generation
        generateHelloResponse: createMockFunction((context) => {
            const callData = {
                method: 'generateHelloResponse',
                timestamp: new Date().toISOString(),
                args: [context],
                correlationId: context?.correlationId || generateTestId('gen-')
            };
            serviceState.callHistory.push(callData);
            
            if (serviceState.errors.generateHelloResponse) {
                throw serviceState.errors.generateHelloResponse;
            }
            
            return {
                data: serviceState.responses.generateHelloResponse,
                metadata: {
                    timestamp: callData.timestamp,
                    correlationId: callData.correlationId,
                    responseType: 'hello-world'
                }
            };
        }, { trackCalls: config.trackCalls }),
        
        // Mock createRequestContext function with service-specific context object creation
        createRequestContext: createMockFunction((req, res) => {
            const callData = {
                method: 'createRequestContext',
                timestamp: new Date().toISOString(),
                args: [req?.correlationId || 'unknown', res?.correlationId || 'unknown'],
                correlationId: generateTestId('ctx-')
            };
            serviceState.callHistory.push(callData);
            
            if (serviceState.errors.createRequestContext) {
                throw serviceState.errors.createRequestContext;
            }
            
            return {
                ...serviceState.responses.createRequestContext,
                request: {
                    method: req?.method || HTTP_METHODS.GET,
                    path: req?.path || ROUTES.HELLO,
                    headers: req?.headers || {},
                    correlationId: req?.correlationId || callData.correlationId
                },
                response: {
                    correlationId: res?.correlationId || callData.correlationId
                },
                service: {
                    name: 'helloService',
                    version: '1.0.0'
                },
                timestamp: callData.timestamp,
                correlationId: callData.correlationId
            };
        }, { trackCalls: config.trackCalls }),
        
        // Mock formatServiceError function with standardized error formatting for service errors
        formatServiceError: createMockFunction((error, context) => {
            const callData = {
                method: 'formatServiceError',
                timestamp: new Date().toISOString(),
                args: [error?.message || 'Unknown error', context?.correlationId || 'unknown'],
                correlationId: generateTestId('err-')
            };
            serviceState.callHistory.push(callData);
            
            if (serviceState.errors.formatServiceError) {
                throw serviceState.errors.formatServiceError;
            }
            
            return {
                error: {
                    message: error?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                    code: error?.code || 'SERVICE_ERROR',
                    timestamp: callData.timestamp,
                    correlationId: callData.correlationId,
                    service: 'helloService',
                    context: context || {}
                }
            };
        }, { trackCalls: config.trackCalls }),
        
        // Service behavior configuration methods for different testing scenarios
        setResponse: function(method, response) {
            if (serviceState.responses.hasOwnProperty(method)) {
                serviceState.responses[method] = response;
            }
        },
        
        setError: function(method, error) {
            serviceState.errors[method] = error;
        },
        
        clearError: function(method) {
            delete serviceState.errors[method];
        },
        
        getCallHistory: function() {
            return deepClone(serviceState.callHistory);
        },
        
        getCallCount: function(method) {
            if (method) {
                return serviceState.callHistory.filter(call => call.method === method).length;
            }
            return serviceState.callHistory.length;
        },
        
        reset: function() {
            serviceState.callHistory = [];
            serviceState.errors = {};
        },
        
        // Test metadata for debugging and verification
        testMetadata: {
            createdAt: new Date().toISOString(),
            mockType: 'hello-service',
            testId: generateTestId('svc-')
        }
    };
    
    // Return complete mock service object with all original service interface methods
    return mockService;
}

/**
 * Creates mock implementation of helloController module with all controller functions 
 * mocked for isolated route testing and service integration testing.
 * 
 * @param {object} mockConfig - Configuration options for controller mocking
 * @param {boolean} mockConfig.trackCalls - Enable call tracking (default: true)
 * @param {object} mockConfig.responses - Custom response configurations
 * @param {object} mockConfig.errors - Error injection configuration
 * @returns {object} Mock helloController object with all controller functions mocked and configurable behavior
 */
function mockHelloController(mockConfig = {}) {
    const config = { ...DEFAULT_MOCK_CONFIG, ...mockConfig };
    const controllerState = {
        callHistory: [],
        responses: {
            handleHelloRequest: { success: true, data: RESPONSES.HELLO_WORLD },
            validateRequestMethod: { isValid: true, method: HTTP_METHODS.GET },
            createRequestContext: { correlationId: generateTestId('ctrl-ctx-') },
            handleServiceResponse: { processed: true },
            handleControllerError: { handled: true }
        },
        errors: mockConfig.errors || {}
    };
    
    // Merge custom responses from mockConfig
    if (mockConfig.responses) {
        Object.assign(controllerState.responses, mockConfig.responses);
    }
    
    const mockController = {
        // Mock handleHelloRequest function with Express.js middleware signature and response handling
        handleHelloRequest: createMockFunction(async (req, res, next) => {
            const callData = {
                method: 'handleHelloRequest',
                timestamp: new Date().toISOString(),
                args: [req?.correlationId || 'unknown', res?.correlationId || 'unknown'],
                correlationId: generateTestId('handle-')
            };
            controllerState.callHistory.push(callData);
            
            // Implement error injection capabilities for testing controller error handling scenarios
            if (controllerState.errors.handleHelloRequest) {
                const error = controllerState.errors.handleHelloRequest;
                if (next) next(error);
                return;
            }
            
            try {
                // Mock controller response simulation with realistic response timing and status codes
                await new Promise(resolve => setTimeout(resolve, 1)); // Simulate async processing
                
                const responseData = {
                    ...controllerState.responses.handleHelloRequest,
                    timestamp: callData.timestamp,
                    correlationId: callData.correlationId
                };
                
                // Mock Express.js response methods
                if (res && typeof res.status === 'function') {
                    res.status(HTTP_STATUS.OK).json(responseData);
                }
                
            } catch (error) {
                if (next) next(error);
            }
        }, { trackCalls: config.trackCalls }),
        
        // Mock validateRequestMethod function with ValidationResult return values for method validation
        validateRequestMethod: createMockFunction((req) => {
            const callData = {
                method: 'validateRequestMethod',
                timestamp: new Date().toISOString(),
                args: [req?.method || 'unknown'],
                correlationId: generateTestId('validate-')
            };
            controllerState.callHistory.push(callData);
            
            if (controllerState.errors.validateRequestMethod) {
                throw controllerState.errors.validateRequestMethod;
            }
            
            const method = req?.method || HTTP_METHODS.GET;
            const isValidMethod = method === HTTP_METHODS.GET;
            
            return {
                isValid: isValidMethod,
                method: method,
                allowedMethods: [HTTP_METHODS.GET],
                error: isValidMethod ? null : ERROR_MESSAGES.METHOD_NOT_ALLOWED,
                timestamp: callData.timestamp,
                correlationId: callData.correlationId
            };
        }, { trackCalls: config.trackCalls }),
        
        // Mock createRequestContext function with controller-specific context object creation
        createRequestContext: createMockFunction((req, res) => {
            const callData = {
                method: 'createRequestContext',
                timestamp: new Date().toISOString(),
                args: [req?.correlationId || 'unknown', res?.correlationId || 'unknown'],
                correlationId: generateTestId('ctrl-ctx-')
            };
            controllerState.callHistory.push(callData);
            
            if (controllerState.errors.createRequestContext) {
                throw controllerState.errors.createRequestContext;
            }
            
            return {
                ...controllerState.responses.createRequestContext,
                request: {
                    method: req?.method || HTTP_METHODS.GET,
                    path: req?.path || ROUTES.HELLO,
                    headers: req?.headers || {},
                    correlationId: req?.correlationId || callData.correlationId
                },
                response: {
                    correlationId: res?.correlationId || callData.correlationId
                },
                controller: {
                    name: 'helloController',
                    version: '1.0.0'
                },
                timestamp: callData.timestamp,
                correlationId: callData.correlationId
            };
        }, { trackCalls: config.trackCalls }),
        
        // Mock handleServiceResponse function with response processing and HTTP response generation
        handleServiceResponse: createMockFunction((serviceResponse, res) => {
            const callData = {
                method: 'handleServiceResponse',
                timestamp: new Date().toISOString(),
                args: [serviceResponse?.correlationId || 'unknown', res?.correlationId || 'unknown'],
                correlationId: generateTestId('handle-svc-')
            };
            controllerState.callHistory.push(callData);
            
            if (controllerState.errors.handleServiceResponse) {
                throw controllerState.errors.handleServiceResponse;
            }
            
            // Process service response and generate HTTP response
            if (res && typeof res.status === 'function') {
                const statusCode = serviceResponse?.statusCode || HTTP_STATUS.OK;
                const responseData = {
                    ...controllerState.responses.handleServiceResponse,
                    data: serviceResponse?.data || RESPONSES.HELLO_WORLD,
                    timestamp: callData.timestamp,
                    correlationId: callData.correlationId
                };
                
                res.status(statusCode).json(responseData);
            }
            
            return {
                processed: true,
                timestamp: callData.timestamp,
                correlationId: callData.correlationId
            };
        }, { trackCalls: config.trackCalls }),
        
        // Mock handleControllerError function with error handling and Express.js error middleware
        handleControllerError: createMockFunction((error, req, res, next) => {
            const callData = {
                method: 'handleControllerError',
                timestamp: new Date().toISOString(),
                args: [error?.message || 'unknown', req?.correlationId || 'unknown'],
                correlationId: generateTestId('err-handle-')
            };
            controllerState.callHistory.push(callData);
            
            if (controllerState.errors.handleControllerError) {
                if (next) next(controllerState.errors.handleControllerError);
                return;
            }
            
            // Mock error response generation
            const errorResponse = {
                error: {
                    message: error?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                    code: error?.code || 'CONTROLLER_ERROR',
                    timestamp: callData.timestamp,
                    correlationId: callData.correlationId
                }
            };
            
            if (res && typeof res.status === 'function') {
                const statusCode = error?.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
                res.status(statusCode).json(errorResponse);
            }
            
            return {
                handled: true,
                timestamp: callData.timestamp,
                correlationId: callData.correlationId
            };
        }, { trackCalls: config.trackCalls }),
        
        // Controller behavior configuration methods for different testing scenarios
        setResponse: function(method, response) {
            if (controllerState.responses.hasOwnProperty(method)) {
                controllerState.responses[method] = response;
            }
        },
        
        setError: function(method, error) {
            controllerState.errors[method] = error;
        },
        
        clearError: function(method) {
            delete controllerState.errors[method];
        },
        
        getCallHistory: function() {
            return deepClone(controllerState.callHistory);
        },
        
        getCallCount: function(method) {
            if (method) {
                return controllerState.callHistory.filter(call => call.method === method).length;
            }
            return controllerState.callHistory.length;
        },
        
        reset: function() {
            controllerState.callHistory = [];
            controllerState.errors = {};
        },
        
        // Test metadata for debugging and verification
        testMetadata: {
            createdAt: new Date().toISOString(),
            mockType: 'hello-controller',
            testId: generateTestId('ctrl-')
        }
    };
    
    // Return complete mock controller object with all original controller interface methods
    return mockController;
}

/**
 * Creates mock implementations of middleware functions including errorHandler, 
 * requestLogger, and responseHandler for isolated middleware testing and pipeline testing.
 * 
 * @param {string} middlewareName - Name of middleware to mock (errorHandler, requestLogger, responseHandler)
 * @param {object} mockConfig - Configuration options for middleware mocking
 * @param {boolean} mockConfig.trackCalls - Enable call tracking (default: true)
 * @param {number} mockConfig.delay - Delay in milliseconds for async simulation
 * @param {object} mockConfig.errors - Error injection configuration
 * @returns {Function} Mock middleware function with Express.js middleware signature and configurable behavior
 */
function mockMiddleware(middlewareName, mockConfig = {}) {
    const config = { ...DEFAULT_MOCK_CONFIG, ...mockConfig };
    const middlewareState = {
        name: middlewareName,
        callHistory: [],
        delay: mockConfig.delay || 0,
        errors: mockConfig.errors || {},
        skipConditions: mockConfig.skipConditions || []
    };
    
    // Create base middleware function with Express.js (req, res, next) signature
    const mockMiddlewareFunction = createMockFunction(async (req, res, next) => {
        const callData = {
            middleware: middlewareName,
            timestamp: new Date().toISOString(),
            requestId: req?.correlationId || generateTestId('mw-req-'),
            responseId: res?.correlationId || generateTestId('mw-res-'),
            correlationId: generateTestId(`mw-${middlewareName}-`)
        };
        middlewareState.callHistory.push(callData);
        
        // Implement middleware skip functionality for testing conditional middleware execution
        const shouldSkip = middlewareState.skipConditions.some(condition => {
            if (typeof condition === 'function') {
                return condition(req, res);
            }
            return false;
        });
        
        if (shouldSkip) {
            callData.skipped = true;
            if (next) next();
            return;
        }
        
        // Set up error injection capabilities for testing middleware error handling
        if (middlewareState.errors[middlewareName]) {
            const error = middlewareState.errors[middlewareName];
            callData.error = error.message || 'Middleware error';
            if (next) next(error);
            return;
        }
        
        // Implement configurable delay simulation for testing middleware performance impact
        if (middlewareState.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, middlewareState.delay));
        }
        
        // Set up configurable behavior based on middlewareName parameter
        switch (middlewareName) {
            case 'errorHandler':
                // Error handling middleware - typically has (err, req, res, next) signature
                if (arguments.length === 4) {
                    const [err, req, res, next] = arguments;
                    callData.handledError = err?.message || 'Unknown error';
                    
                    // Mock error response generation
                    if (res && typeof res.status === 'function') {
                        const statusCode = err?.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
                        const errorResponse = {
                            error: {
                                message: err?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                                timestamp: callData.timestamp,
                                correlationId: callData.correlationId
                            }
                        };
                        res.status(statusCode).json(errorResponse);
                    }
                } else {
                    // Normal middleware call
                    if (next) next();
                }
                break;
                
            case 'requestLogger':
                // Request logging middleware
                if (req) {
                    callData.loggedRequest = {
                        method: req.method || 'UNKNOWN',
                        path: req.path || req.url || 'unknown',
                        userAgent: req.get ? req.get('User-Agent') : 'unknown',
                        timestamp: callData.timestamp
                    };
                }
                if (next) next();
                break;
                
            case 'responseHandler':
                // Response handling middleware
                if (res) {
                    callData.responseProcessing = {
                        statusCode: res.statusCode || 200,
                        headersSent: res.headersSent || false,
                        timestamp: callData.timestamp
                    };
                }
                if (next) next();
                break;
                
            default:
                // Generic middleware behavior
                callData.genericMiddleware = true;
                if (next) next();
                break;
        }
        
        callData.completed = true;
        
    }, { 
        trackCalls: config.trackCalls,
        name: `mockMiddleware_${middlewareName}`
    });
    
    // Add middleware-specific properties and methods
    mockMiddlewareFunction.middlewareName = middlewareName;
    mockMiddlewareFunction.testMetadata = {
        createdAt: new Date().toISOString(),
        mockType: 'express-middleware',
        testId: generateTestId(`mw-${middlewareName}-`)
    };
    
    // Add validation methods for verifying middleware behavior and side effects
    mockMiddlewareFunction.getCallHistory = function() {
        return deepClone(middlewareState.callHistory);
    };
    
    mockMiddlewareFunction.getCallCount = function() {
        return middlewareState.callHistory.length;
    };
    
    mockMiddlewareFunction.getLastCall = function() {
        return middlewareState.callHistory[middlewareState.callHistory.length - 1] || null;
    };
    
    mockMiddlewareFunction.wasSkipped = function() {
        return middlewareState.callHistory.some(call => call.skipped);
    };
    
    mockMiddlewareFunction.hadErrors = function() {
        return middlewareState.callHistory.some(call => call.error);
    };
    
    mockMiddlewareFunction.setDelay = function(delay) {
        middlewareState.delay = delay;
    };
    
    mockMiddlewareFunction.setError = function(error) {
        middlewareState.errors[middlewareName] = error;
    };
    
    mockMiddlewareFunction.clearError = function() {
        delete middlewareState.errors[middlewareName];
    };
    
    mockMiddlewareFunction.addSkipCondition = function(condition) {
        middlewareState.skipConditions.push(condition);
    };
    
    mockMiddlewareFunction.reset = function() {
        middlewareState.callHistory = [];
        middlewareState.errors = {};
        middlewareState.skipConditions = [];
        middlewareState.delay = 0;
    };
    
    // Return configured mock middleware function ready for middleware pipeline testing
    return mockMiddlewareFunction;
}

/**
 * Creates mock error objects with customizable properties, stack traces, and error 
 * types for comprehensive error handling testing and error scenario simulation.
 * 
 * @param {string} errorType - Type of error to create (ValidationError, ServiceError, etc.)
 * @param {object} errorOptions - Configuration options for error creation
 * @param {string} errorOptions.message - Error message (default: 'Test error')
 * @param {number} errorOptions.statusCode - HTTP status code for the error
 * @param {string} errorOptions.code - Error code identifier
 * @param {object} errorOptions.context - Additional error context
 * @returns {Error} Mock Error object with customizable properties and realistic error characteristics
 */
function createMockError(errorType = 'MockError', errorOptions = {}) {
    // Create base Error object with provided error message or default test error message
    const message = errorOptions.message || MOCK_ERROR_DEFAULTS.message;
    const mockError = new Error(message);
    
    // Set error type and name based on errorType parameter
    mockError.name = errorType;
    mockError.type = errorType;
    
    // Add custom error properties from errorOptions including error code and context
    if (errorOptions.statusCode) {
        mockError.statusCode = errorOptions.statusCode;
    }
    
    if (errorOptions.code) {
        mockError.code = errorOptions.code;
    }
    
    // Add error metadata including timestamp, correlation ID, and error classification
    mockError.timestamp = new Date().toISOString();
    mockError.correlationId = generateTestId(`err-${errorType.toLowerCase()}-`);
    
    // Set error classification based on type and status code
    if (errorOptions.statusCode) {
        if (errorOptions.statusCode >= 400 && errorOptions.statusCode < 500) {
            mockError.classification = 'client-error';
        } else if (errorOptions.statusCode >= 500) {
            mockError.classification = 'server-error';
        } else {
            mockError.classification = 'unknown';
        }
    } else {
        mockError.classification = 'application-error';
    }
    
    // Add error context and additional properties
    if (errorOptions.context) {
        mockError.context = deepClone(errorOptions.context);
    }
    
    // Generate realistic stack trace for error debugging and testing stack trace handling
    if (errorOptions.preserveStack !== true) {
        // Create a more realistic stack trace for testing
        const originalStack = mockError.stack;
        mockError.stack = `${mockError.name}: ${mockError.message}\n` +
            `    at createMockError (mockHelpers.js:1234:56)\n` +
            `    at Test.<anonymous> (test.js:789:12)\n` +
            `    at TestRunner.run (testRunner.js:345:67)\n`;
    }
    
    // Set up error serialization methods for testing error logging and transmission
    mockError.toJSON = function() {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            statusCode: this.statusCode,
            code: this.code,
            timestamp: this.timestamp,
            correlationId: this.correlationId,
            classification: this.classification,
            context: this.context
        };
    };
    
    // Add error comparison methods for testing error equality and matching
    mockError.equals = function(otherError) {
        return this.name === otherError.name && 
               this.message === otherError.message &&
               this.code === otherError.code;
    };
    
    // Implement error chaining capabilities for testing wrapped error scenarios
    if (errorOptions.cause) {
        mockError.cause = errorOptions.cause;
    }
    
    // Create error validation methods for verifying error properties and structure
    mockError.isClientError = function() {
        return this.classification === 'client-error';
    };
    
    mockError.isServerError = function() {
        return this.classification === 'server-error';
    };
    
    mockError.hasContext = function() {
        return !!this.context;
    };
    
    // Add specific error type behaviors
    switch (errorType) {
        case 'ValidationError':
            mockError.statusCode = mockError.statusCode || HTTP_STATUS.BAD_REQUEST;
            mockError.code = mockError.code || 'VALIDATION_FAILED';
            mockError.validationErrors = errorOptions.validationErrors || [];
            break;
            
        case 'ServiceError':
            mockError.statusCode = mockError.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
            mockError.code = mockError.code || 'SERVICE_ERROR';
            mockError.service = errorOptions.service || 'unknown-service';
            break;
            
        case 'NotFoundError':
            mockError.statusCode = HTTP_STATUS.NOT_FOUND;
            mockError.code = 'NOT_FOUND';
            mockError.resource = errorOptions.resource || 'unknown-resource';
            break;
            
        case 'MethodNotAllowedError':
            mockError.statusCode = HTTP_STATUS.METHOD_NOT_ALLOWED;
            mockError.code = 'METHOD_NOT_ALLOWED';
            mockError.allowedMethods = errorOptions.allowedMethods || [HTTP_METHODS.GET];
            break;
            
        default:
            // Generic error behavior
            break;
    }
    
    // Return complete mock error object ready for error handling testing scenarios
    return mockError;
}

/**
 * Injects errors into mock functions and objects for testing error handling, recovery 
 * mechanisms, and error propagation throughout the application layers.
 * 
 * @param {object} targetMock - The mock object to inject errors into
 * @param {string} methodName - Name of the method to inject errors into
 * @param {Error} error - Error object to inject
 * @param {object} injectionOptions - Configuration options for error injection
 * @param {string} injectionOptions.timing - When to inject error (immediate, delayed, conditional)
 * @param {number} injectionOptions.delay - Delay before error injection in milliseconds
 * @param {Function} injectionOptions.condition - Condition function for conditional error injection
 * @param {number} injectionOptions.callCount - Inject error on specific call count
 * @returns {void} Configures target mock to throw specified error when method is called
 */
function injectError(targetMock, methodName, error, injectionOptions = {}) {
    // Validate target mock object and method name for error injection capability
    if (!targetMock || typeof targetMock !== 'object') {
        throw new TypeError('targetMock must be a valid object');
    }
    
    if (!methodName || typeof methodName !== 'string') {
        throw new TypeError('methodName must be a valid string');
    }
    
    if (!error || !(error instanceof Error)) {
        throw new TypeError('error must be an Error object');
    }
    
    // Check if target method exists and is a function
    if (!targetMock[methodName] || typeof targetMock[methodName] !== 'function') {
        throw new Error(`Method ${methodName} does not exist on target mock or is not a function`);
    }
    
    // Store original method for restoration
    const originalMethod = targetMock[methodName];
    const injectionState = {
        originalMethod: originalMethod,
        error: error,
        options: injectionOptions,
        callCount: 0,
        injected: false,
        injectionHistory: []
    };
    
    // Configure target method to throw provided error on next invocation or based on options
    targetMock[methodName] = createMockFunction(function(...args) {
        injectionState.callCount++;
        
        const callData = {
            timestamp: new Date().toISOString(),
            callCount: injectionState.callCount,
            args: args,
            correlationId: generateTestId('inject-')
        };
        
        // Set up conditional error injection based on function parameters or call count
        let shouldInjectError = false;
        
        if (injectionOptions.timing === 'immediate' || !injectionOptions.timing) {
            shouldInjectError = true;
        } else if (injectionOptions.timing === 'conditional' && typeof injectionOptions.condition === 'function') {
            shouldInjectError = injectionOptions.condition(...args);
        } else if (injectionOptions.timing === 'callCount' && injectionOptions.callCount) {
            shouldInjectError = injectionState.callCount === injectionOptions.callCount;
        }
        
        // Add error injection tracking for debugging and test verification purposes
        callData.shouldInjectError = shouldInjectError;
        injectionState.injectionHistory.push(callData);
        
        if (shouldInjectError) {
            injectionState.injected = true;
            callData.errorInjected = true;
            
            // Set up error injection timing based on injectionOptions
            if (injectionOptions.delay && injectionOptions.delay > 0) {
                // Delayed error injection
                setTimeout(() => {
                    throw error;
                }, injectionOptions.delay);
            } else {
                // Immediate error injection
                throw error;
            }
        } else {
            // Call original method if error should not be injected
            callData.originalMethodCalled = true;
            return originalMethod.apply(this, args);
        }
        
    }, { 
        trackCalls: true,
        name: `injectedError_${methodName}`
    });
    
    // Add error injection management methods
    targetMock[methodName].getInjectionState = function() {
        return deepClone(injectionState);
    };
    
    targetMock[methodName].wasErrorInjected = function() {
        return injectionState.injected;
    };
    
    targetMock[methodName].getInjectionHistory = function() {
        return deepClone(injectionState.injectionHistory);
    };
    
    targetMock[methodName].clearErrorInjection = function() {
        // Restore original method
        targetMock[methodName] = injectionState.originalMethod;
    };
    
    targetMock[methodName].resetInjectionState = function() {
        injectionState.callCount = 0;
        injectionState.injected = false;
        injectionState.injectionHistory = [];
    };
    
    // Add metadata about error injection
    targetMock[methodName].errorInjectionMetadata = {
        targetMethod: methodName,
        errorType: error.name,
        errorMessage: error.message,
        injectionOptions: injectionOptions,
        injectedAt: new Date().toISOString(),
        testId: generateTestId('error-inject-')
    };
    
    // Configure error injection cleanup for automatic error injection removal
    if (injectionOptions.autoCleanup !== false) {
        // Clean up error injection after test completion
        process.nextTick(() => {
            // Allow current test to complete, then clean up if needed
            setTimeout(() => {
                if (targetMock[methodName] && targetMock[methodName].clearErrorInjection) {
                    // Auto-cleanup can be enabled by test framework integration
                }
            }, injectionOptions.autoCleanupDelay || 100);
        });
    }
}

/**
 * Creates mock request context objects for service layer testing with controller-specific 
 * metadata, request information, and processing context.
 * 
 * @param {object} contextOptions - Configuration options for request context creation
 * @param {object} contextOptions.request - Mock request object or request data
 * @param {object} contextOptions.response - Mock response object or response data
 * @param {string} contextOptions.correlationId - Correlation ID for request tracking
 * @param {object} contextOptions.metadata - Additional context metadata
 * @returns {object} Mock request context object with request data, metadata, and processing information
 */
function createMockRequestContext(contextOptions = {}) {
    // Create base request context with mock req and res objects from createMockRequest/Response
    const req = contextOptions.request || createMockRequest();
    const res = contextOptions.response || createMockResponse();
    
    // Set request correlation ID using generateTestId for request tracking and debugging
    const correlationId = contextOptions.correlationId || generateTestId('ctx-');
    
    // Add request metadata including method, path, headers, and client information
    const requestMetadata = {
        method: req.method || HTTP_METHODS.GET,
        path: req.path || req.url || ROUTES.HELLO,
        headers: req.headers || {},
        params: req.params || {},
        query: req.query || {},
        body: req.body || {},
        ip: req.ip || '127.0.0.1',
        userAgent: req.get ? req.get('User-Agent') : 'Node.js Test Runner'
    };
    
    // Add controller-specific context including controller name and processing flags
    const controllerContext = {
        name: contextOptions.controllerName || 'helloController',
        version: '1.0.0',
        action: contextOptions.action || 'handleRequest',
        startTime: Date.now()
    };
    
    // Set up request timing information including start time and processing duration
    const timingContext = {
        requestStartTime: Date.now(),
        processingStartTime: Date.now(),
        processingDuration: null,
        totalDuration: null
    };
    
    // Add validation context for service layer validation and error handling
    const validationContext = {
        validated: false,
        validationErrors: [],
        validationResult: null
    };
    
    // Include service processing flags and configuration options from contextOptions
    const serviceContext = {
        serviceName: contextOptions.serviceName || 'helloService',
        serviceVersion: '1.0.0',
        processingFlags: {
            skipValidation: contextOptions.skipValidation || false,
            enableCaching: contextOptions.enableCaching || false,
            enableLogging: contextOptions.enableLogging !== false
        }
    };
    
    // Set up error handling context with error recovery and propagation information
    const errorContext = {
        hasErrors: false,
        errors: [],
        errorRecoveryAttempts: 0,
        lastError: null
    };
    
    // Create complete mock request context ready for service layer testing
    const mockContext = {
        // Core context properties
        correlationId: correlationId,
        timestamp: new Date().toISOString(),
        
        // Request and response objects
        request: req,
        response: res,
        
        // Context metadata
        requestMetadata: requestMetadata,
        controllerContext: controllerContext,
        timingContext: timingContext,
        validationContext: validationContext,
        serviceContext: serviceContext,
        errorContext: errorContext,
        
        // Additional context from options
        metadata: contextOptions.metadata || {},
        
        // Context manipulation methods
        setValidationResult: function(result) {
            this.validationContext.validated = true;
            this.validationContext.validationResult = result;
            if (!result.isValid) {
                this.validationContext.validationErrors = result.errors || [];
            }
        },
        
        addError: function(error) {
            this.errorContext.hasErrors = true;
            this.errorContext.errors.push(error);
            this.errorContext.lastError = error;
        },
        
        clearErrors: function() {
            this.errorContext.hasErrors = false;
            this.errorContext.errors = [];
            this.errorContext.lastError = null;
        },
        
        updateTiming: function() {
            const now = Date.now();
            this.timingContext.processingDuration = now - this.timingContext.processingStartTime;
            this.timingContext.totalDuration = now - this.timingContext.requestStartTime;
        },
        
        // Create context validation methods for verifying context structure and content
        isValid: function() {
            return this.correlationId && 
                   this.request && 
                   this.response && 
                   this.requestMetadata;
        },
        
        hasValidationErrors: function() {
            return this.validationContext.validationErrors.length > 0;
        },
        
        hasProcessingErrors: function() {
            return this.errorContext.hasErrors;
        },
        
        getProcessingTime: function() {
            return this.timingContext.processingDuration;
        },
        
        getTotalTime: function() {
            return this.timingContext.totalDuration;
        },
        
        // Serialization methods
        toJSON: function() {
            return {
                correlationId: this.correlationId,
                timestamp: this.timestamp,
                requestMetadata: this.requestMetadata,
                controllerContext: this.controllerContext,
                timingContext: this.timingContext,
                validationContext: this.validationContext,
                serviceContext: this.serviceContext,
                errorContext: this.errorContext,
                metadata: this.metadata
            };
        },
        
        // Test metadata
        testMetadata: {
            createdAt: new Date().toISOString(),
            mockType: 'request-context',
            testId: correlationId
        }
    };
    
    // Return complete mock request context ready for service layer testing
    return mockContext;
}

/**
 * Creates mock service response objects with configurable data, status codes, and 
 * metadata for testing service layer responses and controller integration.
 * 
 * @param {any} responseData - Response data content (default: Hello world)
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {object} responseOptions - Configuration options for response creation
 * @param {object} responseOptions.metadata - Additional response metadata
 * @param {string} responseOptions.correlationId - Response correlation ID
 * @param {string} responseOptions.serviceName - Name of the service generating response
 * @returns {object} Mock service response object with data, status, metadata, and service information
 */
function createMockServiceResponse(responseData = null, statusCode = null, responseOptions = {}) {
    // Set response data from responseData parameter or default to RESPONSES.HELLO_WORLD
    const data = responseData !== null ? responseData : RESPONSES.HELLO_WORLD;
    
    // Set HTTP status code from statusCode parameter or default to HTTP_STATUS.OK
    const status = statusCode !== null ? statusCode : HTTP_STATUS.OK;
    
    // Add response correlation ID and request tracking information for debugging
    const correlationId = responseOptions.correlationId || generateTestId('svc-res-');
    
    // Create service response metadata including service name, version, and processing time
    const serviceMetadata = {
        serviceName: responseOptions.serviceName || 'helloService',
        serviceVersion: '1.0.0',
        processingTime: responseOptions.processingTime || Math.floor(Math.random() * 10) + 1,
        timestamp: new Date().toISOString(),
        correlationId: correlationId
    };
    
    // Set up response validation flags and processing indicators from responseOptions
    const validationFlags = {
        dataValidated: responseOptions.dataValidated !== false,
        statusValidated: responseOptions.statusValidated !== false,
        metadataComplete: responseOptions.metadataComplete !== false
    };
    
    // Add service-specific response properties including service context and metadata
    const serviceContext = {
        service: {
            name: serviceMetadata.serviceName,
            version: serviceMetadata.serviceVersion,
            instance: responseOptions.serviceInstance || `instance-${Math.floor(Math.random() * 1000)}`
        },
        request: {
            correlationId: responseOptions.requestCorrelationId || correlationId,
            timestamp: responseOptions.requestTimestamp || new Date().toISOString()
        }
    };
    
    // Create complete mock service response ready for controller and service testing
    const mockServiceResponse = {
        // Core response properties
        data: data,
        status: status,
        statusCode: status, // Alias for compatibility
        success: status >= 200 && status < 300,
        
        // Response metadata
        metadata: {
            ...serviceMetadata,
            ...responseOptions.metadata
        },
        
        // Service context
        service: serviceContext.service,
        request: serviceContext.request,
        
        // Validation flags
        validation: validationFlags,
        
        // Response timing
        timing: {
            processingTime: serviceMetadata.processingTime,
            timestamp: serviceMetadata.timestamp,
            correlationId: correlationId
        },
        
        // Create response serialization methods for testing response formatting
        toJSON: function() {
            return {
                data: this.data,
                status: this.status,
                success: this.success,
                metadata: this.metadata,
                service: this.service,
                request: this.request,
                timing: this.timing
            };
        },
        
        // Add response validation methods for verifying response structure and content
        isValid: function() {
            return this.data !== undefined && 
                   this.status >= 100 && 
                   this.status < 600 &&
                   this.metadata &&
                   this.metadata.correlationId;
        },
        
        isSuccess: function() {
            return this.success;
        },
        
        isError: function() {
            return !this.success;
        },
        
        hasData: function() {
            return this.data !== null && this.data !== undefined;
        },
        
        getProcessingTime: function() {
            return this.timing.processingTime;
        },
        
        // Set up response comparison methods for testing response equality and matching
        equals: function(otherResponse) {
            return this.data === otherResponse.data &&
                   this.status === otherResponse.status &&
                   this.metadata.correlationId === otherResponse.metadata.correlationId;
        },
        
        matches: function(expectedData, expectedStatus) {
            return this.data === expectedData && this.status === expectedStatus;
        },
        
        // Response transformation methods
        clone: function() {
            return createMockServiceResponse(
                deepClone(this.data),
                this.status,
                {
                    ...responseOptions,
                    metadata: deepClone(this.metadata),
                    correlationId: this.metadata.correlationId
                }
            );
        },
        
        withData: function(newData) {
            const cloned = this.clone();
            cloned.data = newData;
            return cloned;
        },
        
        withStatus: function(newStatus) {
            const cloned = this.clone();
            cloned.status = newStatus;
            cloned.statusCode = newStatus;
            cloned.success = newStatus >= 200 && newStatus < 300;
            return cloned;
        },
        
        // Test metadata
        testMetadata: {
            createdAt: new Date().toISOString(),
            mockType: 'service-response',
            testId: correlationId
        }
    };
    
    // Return complete mock service response ready for controller and service testing
    return mockServiceResponse;
}

/**
 * Simulates asynchronous operations with configurable delays, success/failure outcomes, 
 * and timing for testing async function behavior and error handling.
 * 
 * @param {Function} asyncFunction - Function to simulate (optional)
 * @param {object} simulationOptions - Configuration options for async simulation
 * @param {number} simulationOptions.delay - Delay in milliseconds (default: 10)
 * @param {number} simulationOptions.successRate - Success probability 0-1 (default: 1.0)
 * @param {any} simulationOptions.successValue - Value to resolve with on success
 * @param {Error} simulationOptions.errorValue - Error to reject with on failure
 * @param {Function} simulationOptions.progressCallback - Progress callback function
 * @returns {Promise<any>} Promise that simulates async operation with configurable timing and outcomes
 */
function simulateAsyncOperation(asyncFunction, simulationOptions = {}) {
    // Set up async operation delay from simulationOptions or default timing
    const delay = simulationOptions.delay || 10;
    
    // Configure success/failure outcome based on simulationOptions probability settings
    const successRate = simulationOptions.successRate !== undefined ? simulationOptions.successRate : 1.0;
    const successValue = simulationOptions.successValue !== undefined ? simulationOptions.successValue : 'Async operation completed';
    const errorValue = simulationOptions.errorValue || createMockError('AsyncError', { message: 'Async operation failed' });
    
    // Create operation metadata for tracking and debugging
    const operationId = generateTestId('async-op-');
    const startTime = Date.now();
    
    // Create promise that resolves or rejects based on simulation configuration
    return new Promise((resolve, reject) => {
        // Add timing simulation using setTimeout for realistic async behavior
        setTimeout(() => {
            const endTime = Date.now();
            const actualDelay = endTime - startTime;
            
            // Determine if operation should succeed based on success rate
            const shouldSucceed = Math.random() <= successRate;
            
            // Implement progress tracking and intermediate callbacks if specified in options
            if (typeof simulationOptions.progressCallback === 'function') {
                simulationOptions.progressCallback({
                    operationId: operationId,
                    progress: 1.0,
                    completed: true,
                    actualDelay: actualDelay,
                    success: shouldSucceed
                });
            }
            
            if (shouldSucceed) {
                // Success case
                let result = successValue;
                
                // If asyncFunction is provided, call it and use its result
                if (typeof asyncFunction === 'function') {
                    try {
                        result = asyncFunction();
                    } catch (error) {
                        // If provided function throws, that becomes our error
                        reject(error);
                        return;
                    }
                }
                
                // Add operation metadata to result if it's an object
                if (result && typeof result === 'object' && !Array.isArray(result)) {
                    result.operationMetadata = {
                        operationId: operationId,
                        actualDelay: actualDelay,
                        simulatedDelay: delay,
                        success: true,
                        timestamp: new Date().toISOString()
                    };
                }
                
                resolve(result);
            } else {
                // Failure case
                let error = errorValue;
                
                // If asyncFunction is provided and we want it to fail, call it in try-catch
                if (typeof asyncFunction === 'function') {
                    try {
                        asyncFunction();
                        // If function doesn't throw, create our own error
                        error = createMockError('SimulatedFailure', { message: 'Simulated async failure' });
                    } catch (thrownError) {
                        // Use the thrown error
                        error = thrownError;
                    }
                }
                
                // Add operation metadata to error
                if (error && typeof error === 'object') {
                    error.operationMetadata = {
                        operationId: operationId,
                        actualDelay: actualDelay,
                        simulatedDelay: delay,
                        success: false,
                        timestamp: new Date().toISOString()
                    };
                }
                
                reject(error);
            }
        }, delay);
        
        // Set up operation cancellation capabilities for testing async operation lifecycle
        if (simulationOptions.cancellable) {
            const timeoutId = setTimeout(() => {
                reject(createMockError('OperationCancelled', { message: 'Async operation cancelled' }));
            }, simulationOptions.cancelAfter || delay * 2);
            
            // Provide cancellation method
            resolve.cancel = function() {
                clearTimeout(timeoutId);
                reject(createMockError('OperationCancelled', { message: 'Async operation cancelled by user' }));
            };
        }
        
        // Add operation monitoring and logging for debugging async operation behavior
        if (simulationOptions.enableLogging) {
            console.log(`[ASYNC-SIM] Started operation ${operationId} with ${delay}ms delay`);
        }
    });
}

/**
 * Resets all mock objects, functions, and configurations to initial state for clean 
 * test execution and prevents test interference between test cases.
 * 
 * @returns {void} Resets all mock objects and clears call tracking data
 */
function resetAllMocks() {
    // Note: This is a placeholder implementation since we don't have a global registry
    // In a real implementation, this would iterate through all active mock objects
    
    // Log mock reset completion for debugging and test verification
    const resetId = generateTestId('reset-');
    const resetTimestamp = new Date().toISOString();
    
    console.info(`[MOCK-RESET] Mock reset operation ${resetId} completed at ${resetTimestamp}`);
    
    // Clear any global mock state if maintained
    if (global.mockHelpers && global.mockHelpers.activeMocks) {
        // Iterate through all active mock objects and functions registered in mock tracking
        for (const [mockId, mockObject] of global.mockHelpers.activeMocks.entries()) {
            if (mockObject && typeof mockObject.reset === 'function') {
                mockObject.reset();
            }
        }
        
        // Clear mock tracking registry
        global.mockHelpers.activeMocks.clear();
    }
    
    // Reset any environment modifications made by tests
    if (process.env.NODE_ENV === 'test') {
        // Reset test-specific environment variables if needed
    }
    
    // Clear any timers or intervals that might have been set by mocks
    // This would be implemented based on specific mock tracking needs
}

/**
 * Validates mock configuration objects for proper structure, required properties, 
 * and valid option values to ensure mock setup quality and prevent runtime errors.
 * 
 * @param {object} mockConfig - Mock configuration object to validate
 * @param {string} mockType - Type of mock being configured (request, response, service, etc.)
 * @returns {object} Validation result with status and detailed validation information for mock configuration quality
 */
function validateMockConfig(mockConfig, mockType) {
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        mockType: mockType,
        timestamp: new Date().toISOString(),
        validationId: generateTestId('val-')
    };
    
    // Validate mock configuration structure based on mockType parameter
    if (!mockConfig || typeof mockConfig !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Mock configuration must be a valid object');
        return validationResult;
    }
    
    // Check required configuration properties are present and properly formatted
    const commonRequiredFields = ['trackCalls'];
    const typeSpecificValidation = {
        'request': {
            optional: ['method', 'path', 'headers', 'params', 'query', 'body'],
            validMethods: Object.values(HTTP_METHODS),
            validPaths: [ROUTES.HELLO, ROUTES.HEALTH]
        },
        'response': {
            optional: ['statusCode', 'headers'],
            validStatusCodes: Object.values(HTTP_STATUS)
        },
        'service': {
            optional: ['responses', 'errors'],
            required: []
        },
        'middleware': {
            required: ['middlewareName'],
            optional: ['delay', 'errors', 'skipConditions']
        },
        'error': {
            required: ['errorType'],
            optional: ['message', 'statusCode', 'code', 'context']
        }
    };
    
    // Validate configuration option values are within acceptable ranges and formats
    if (mockConfig.trackCalls !== undefined && typeof mockConfig.trackCalls !== 'boolean') {
        validationResult.warnings.push('trackCalls should be a boolean value');
    }
    
    // Verify mock behavior settings are compatible with mock type requirements
    const typeConfig = typeSpecificValidation[mockType];
    if (typeConfig) {
        // Check required fields
        if (typeConfig.required) {
            typeConfig.required.forEach(field => {
                if (!(field in mockConfig)) {
                    validationResult.isValid = false;
                    validationResult.errors.push(`Required field '${field}' is missing for ${mockType} mock`);
                }
            });
        }
        
        // Validate type-specific options
        switch (mockType) {
            case 'request':
                if (mockConfig.method && !typeConfig.validMethods.includes(mockConfig.method)) {
                    validationResult.warnings.push(`Invalid HTTP method '${mockConfig.method}'. Valid methods: ${typeConfig.validMethods.join(', ')}`);
                }
                break;
                
            case 'response':
                if (mockConfig.statusCode && !typeConfig.validStatusCodes.includes(mockConfig.statusCode)) {
                    validationResult.warnings.push(`Invalid status code '${mockConfig.statusCode}'. Should be a valid HTTP status code.`);
                }
                break;
                
            case 'middleware':
                if (!mockConfig.middlewareName) {
                    validationResult.isValid = false;
                    validationResult.errors.push('middlewareName is required for middleware mock');
                }
                if (mockConfig.delay && (typeof mockConfig.delay !== 'number' || mockConfig.delay < 0)) {
                    validationResult.warnings.push('delay should be a positive number in milliseconds');
                }
                break;
                
            case 'error':
                if (!mockConfig.errorType) {
                    validationResult.isValid = false;
                    validationResult.errors.push('errorType is required for error mock');
                }
                if (mockConfig.statusCode && (mockConfig.statusCode < 100 || mockConfig.statusCode >= 600)) {
                    validationResult.warnings.push('statusCode should be a valid HTTP status code (100-599)');
                }
                break;
        }
    }
    
    // Check error injection configuration for valid error types and timing
    if (mockConfig.errors && typeof mockConfig.errors === 'object') {
        Object.keys(mockConfig.errors).forEach(errorKey => {
            const error = mockConfig.errors[errorKey];
            if (error && !(error instanceof Error) && typeof error !== 'object') {
                validationResult.warnings.push(`Error configuration for '${errorKey}' should be an Error object or error configuration object`);
            }
        });
    }
    
    // Validate call tracking settings and verification options
    if (mockConfig.resetOnNextTest !== undefined && typeof mockConfig.resetOnNextTest !== 'boolean') {
        validationResult.warnings.push('resetOnNextTest should be a boolean value');
    }
    
    // Check async simulation settings for valid timing and outcome configurations
    if (mockConfig.delay !== undefined) {
        if (typeof mockConfig.delay !== 'number' || mockConfig.delay < 0) {
            validationResult.warnings.push('delay should be a non-negative number');
        }
    }
    
    if (mockConfig.successRate !== undefined) {
        if (typeof mockConfig.successRate !== 'number' || mockConfig.successRate < 0 || mockConfig.successRate > 1) {
            validationResult.warnings.push('successRate should be a number between 0 and 1');
        }
    }
    
    // Verify middleware configuration options are compatible with Express.js requirements
    if (mockType === 'middleware' && mockConfig.skipConditions) {
        if (!Array.isArray(mockConfig.skipConditions)) {
            validationResult.warnings.push('skipConditions should be an array of functions');
        } else {
            mockConfig.skipConditions.forEach((condition, index) => {
                if (typeof condition !== 'function') {
                    validationResult.warnings.push(`skipCondition at index ${index} should be a function`);
                }
            });
        }
    }
    
    // Create comprehensive validation result with detailed feedback and recommendations
    validationResult.summary = {
        totalErrors: validationResult.errors.length,
        totalWarnings: validationResult.warnings.length,
        configFields: Object.keys(mockConfig).length,
        mockType: mockType
    };
    
    // Add recommendations based on validation results
    if (validationResult.warnings.length > 0) {
        validationResult.recommendations = [
            'Review configuration warnings to ensure optimal mock behavior',
            'Consider using default values for optional fields with warnings',
            'Validate configuration against mock type requirements'
        ];
    }
    
    if (validationResult.errors.length === 0 && validationResult.warnings.length === 0) {
        validationResult.recommendations = ['Mock configuration is valid and ready for use'];
    }
    
    // Return validation result object with success status and validation details
    return validationResult;
}

/**
 * Comprehensive mock management class that provides centralized mock creation, 
 * configuration, tracking, and cleanup for the Node.js tutorial application 
 * testing infrastructure. Manages mock lifecycle, tracks mock state, and 
 * provides advanced mock coordination for complex testing scenarios.
 */
class MockManager {
    /**
     * Initializes MockManager with configuration, creates test logger, and sets up 
     * mock tracking and management infrastructure for comprehensive mock lifecycle management.
     * 
     * @param {object} managerConfig - Configuration options for MockManager
     * @param {boolean} managerConfig.trackAllMocks - Enable tracking for all created mocks
     * @param {boolean} managerConfig.autoCleanup - Enable automatic cleanup after tests
     * @param {object} managerConfig.defaultMockConfig - Default configuration for all mocks
     * @param {Function} managerConfig.logger - Custom logger function
     */
    constructor(managerConfig = {}) {
        // Store manager configuration with mock management settings and options
        this.config = {
            trackAllMocks: true,
            autoCleanup: true,
            enableLogging: true,
            defaultMockConfig: DEFAULT_MOCK_CONFIG,
            ...managerConfig
        };
        
        // Create test logger using createTestLogger for mock management logging
        this.logger = managerConfig.logger || createTestLogger('MockManager');
        
        // Initialize Map for tracking active mocks with mock ID and state information
        this.activeMocks = new Map();
        
        // Initialize Map for storing mock configurations and behavior settings
        this.mockConfigurations = new Map();
        
        // Initialize Set for tracking cleanup tasks and mock lifecycle management
        this.cleanupTasks = new Set();
        
        // Generate unique manager ID using generateTestId for manager identification
        this.managerId = generateTestId('mock-mgr-');
        
        // Set up mock coordination infrastructure for complex mock scenarios
        this.mockCoordination = {
            requestResponsePairs: new Map(),
            serviceControllerMocks: new Map(),
            middlewareChains: new Map()
        };
        
        // Initialize mock validation and quality assurance systems
        this.qualityMetrics = {
            mocksCreated: 0,
            mocksActive: 0,
            mocksCleanedUp: 0,
            validationFailures: 0,
            createdAt: new Date().toISOString()
        };
        
        // Set up automatic cleanup if enabled
        if (this.config.autoCleanup) {
            process.on('exit', () => this.cleanup());
            process.on('SIGINT', () => this.cleanup());
            process.on('SIGTERM', () => this.cleanup());
        }
        
        // Log initialization
        if (this.config.enableLogging) {
            this.logger.info(`MockManager ${this.managerId} initialized with configuration:`, this.config);
        }
    }
    
    /**
     * Creates and registers mock Express.js request objects with the manager for 
     * automatic lifecycle management and cleanup.
     * 
     * @param {string} mockId - Unique identifier for the mock request
     * @param {object} requestOptions - Configuration options for request creation
     * @returns {object} Mock Express.js request object registered with manager for lifecycle management
     */
    createRequest(mockId, requestOptions = {}) {
        // Validate mockId
        if (!mockId || typeof mockId !== 'string') {
            throw new Error('mockId must be a non-empty string');
        }
        
        // Check if mockId already exists
        if (this.activeMocks.has(mockId)) {
            throw new Error(`Mock with ID '${mockId}' already exists`);
        }
        
        // Merge with default configuration
        const finalOptions = { ...this.config.defaultMockConfig, ...requestOptions };
        
        // Validate configuration
        const validation = validateMockConfig(finalOptions, 'request');
        if (!validation.isValid) {
            this.qualityMetrics.validationFailures++;
            throw new Error(`Invalid request configuration: ${validation.errors.join(', ')}`);
        }
        
        // Create mock request using createMockRequest with provided options
        const mockRequest = createMockRequest(finalOptions);
        
        // Register mock request in activeMocks Map with provided mockId
        this.activeMocks.set(mockId, {
            type: 'request',
            mock: mockRequest,
            createdAt: new Date().toISOString(),
            configuration: finalOptions
        });
        
        // Store request configuration in mockConfigurations for recreation if needed
        this.mockConfigurations.set(mockId, {
            type: 'request',
            options: finalOptions
        });
        
        // Add cleanup task for mock request reset and resource cleanup
        this.cleanupTasks.add(() => {
            if (mockRequest && typeof mockRequest.removeAllListeners === 'function') {
                mockRequest.removeAllListeners();
            }
            this.activeMocks.delete(mockId);
            this.mockConfigurations.delete(mockId);
        });
        
        // Set up request tracking and monitoring for debugging and verification
        mockRequest.managerId = this.managerId;
        mockRequest.mockId = mockId;
        
        // Update quality metrics
        this.qualityMetrics.mocksCreated++;
        this.qualityMetrics.mocksActive++;
        
        // Log mock request creation with manager context and configuration
        if (this.config.enableLogging) {
            this.logger.info(`Created mock request '${mockId}' with configuration:`, finalOptions);
        }
        
        // Return registered mock request ready for testing with manager lifecycle
        return mockRequest;
    }
    
    /**
     * Creates and registers mock Express.js response objects with the manager for 
     * automatic lifecycle management and response tracking.
     * 
     * @param {string} mockId - Unique identifier for the mock response
     * @param {object} responseOptions - Configuration options for response creation
     * @returns {object} Mock Express.js response object registered with manager for lifecycle management
     */
    createResponse(mockId, responseOptions = {}) {
        // Validate mockId
        if (!mockId || typeof mockId !== 'string') {
            throw new Error('mockId must be a non-empty string');
        }
        
        // Check if mockId already exists
        if (this.activeMocks.has(mockId)) {
            throw new Error(`Mock with ID '${mockId}' already exists`);
        }
        
        // Merge with default configuration
        const finalOptions = { ...this.config.defaultMockConfig, ...responseOptions };
        
        // Validate configuration
        const validation = validateMockConfig(finalOptions, 'response');
        if (!validation.isValid) {
            this.qualityMetrics.validationFailures++;
            throw new Error(`Invalid response configuration: ${validation.errors.join(', ')}`);
        }
        
        // Create mock response using createMockResponse with provided options
        const mockResponse = createMockResponse(finalOptions);
        
        // Register mock response in activeMocks Map with provided mockId
        this.activeMocks.set(mockId, {
            type: 'response',
            mock: mockResponse,
            createdAt: new Date().toISOString(),
            configuration: finalOptions
        });
        
        // Store response configuration in mockConfigurations for recreation if needed
        this.mockConfigurations.set(mockId, {
            type: 'response',
            options: finalOptions
        });
        
        // Add cleanup task for mock response reset and resource cleanup
        this.cleanupTasks.add(() => {
            if (mockResponse && typeof mockResponse.removeAllListeners === 'function') {
                mockResponse.removeAllListeners();
            }
            this.activeMocks.delete(mockId);
            this.mockConfigurations.delete(mockId);
        });
        
        // Set up response tracking and call monitoring for verification purposes
        mockResponse.managerId = this.managerId;
        mockResponse.mockId = mockId;
        
        // Update quality metrics
        this.qualityMetrics.mocksCreated++;
        this.qualityMetrics.mocksActive++;
        
        // Log mock response creation with manager context and configuration
        if (this.config.enableLogging) {
            this.logger.info(`Created mock response '${mockId}' with configuration:`, finalOptions);
        }
        
        // Return registered mock response ready for testing with manager lifecycle
        return mockResponse;
    }
    
    /**
     * Creates and registers mock service objects with configurable behavior and 
     * automatic lifecycle management through the mock manager.
     * 
     * @param {string} serviceName - Name of the service to mock (helloService)
     * @param {object} serviceConfig - Configuration options for service mocking
     * @returns {object} Mock service object registered with manager for lifecycle management and behavior configuration
     */
    createService(serviceName, serviceConfig = {}) {
        // Validate serviceName
        if (!serviceName || typeof serviceName !== 'string') {
            throw new Error('serviceName must be a non-empty string');
        }
        
        // Check if service mock already exists
        const mockId = `service-${serviceName}`;
        if (this.activeMocks.has(mockId)) {
            throw new Error(`Service mock '${serviceName}' already exists`);
        }
        
        // Merge with default configuration
        const finalConfig = { ...this.config.defaultMockConfig, ...serviceConfig };
        
        // Validate configuration
        const validation = validateMockConfig(finalConfig, 'service');
        if (!validation.isValid) {
            this.qualityMetrics.validationFailures++;
            throw new Error(`Invalid service configuration: ${validation.errors.join(', ')}`);
        }
        
        // Create mock service based on serviceName using appropriate mock service function
        let mockService;
        switch (serviceName) {
            case 'helloService':
                mockService = mockHelloService(finalConfig);
                break;
            default:
                throw new Error(`Unknown service name: ${serviceName}`);
        }
        
        // Configure service behavior and response patterns from serviceConfig
        if (serviceConfig.responses) {
            Object.keys(serviceConfig.responses).forEach(method => {
                if (typeof mockService.setResponse === 'function') {
                    mockService.setResponse(method, serviceConfig.responses[method]);
                }
            });
        }
        
        if (serviceConfig.errors) {
            Object.keys(serviceConfig.errors).forEach(method => {
                if (typeof mockService.setError === 'function') {
                    mockService.setError(method, serviceConfig.errors[method]);
                }
            });
        }
        
        // Register mock service in activeMocks Map with service name as key
        this.activeMocks.set(mockId, {
            type: 'service',
            serviceName: serviceName,
            mock: mockService,
            createdAt: new Date().toISOString(),
            configuration: finalConfig
        });
        
        // Store service configuration for reset and recreation capabilities
        this.mockConfigurations.set(mockId, {
            type: 'service',
            serviceName: serviceName,
            options: finalConfig
        });
        
        // Add cleanup task for service mock reset and state management
        this.cleanupTasks.add(() => {
            if (mockService && typeof mockService.reset === 'function') {
                mockService.reset();
            }
            this.activeMocks.delete(mockId);
            this.mockConfigurations.delete(mockId);
        });
        
        // Set up service call tracking and verification methods
        mockService.managerId = this.managerId;
        mockService.mockId = mockId;
        
        // Update quality metrics
        this.qualityMetrics.mocksCreated++;
        this.qualityMetrics.mocksActive++;
        
        // Log mock service creation with configuration and behavior settings
        if (this.config.enableLogging) {
            this.logger.info(`Created mock service '${serviceName}' with configuration:`, finalConfig);
        }
        
        // Return registered mock service ready for testing with manager oversight
        return mockService;
    }
    
    /**
     * Injects errors into multiple mock objects with coordinated error scenarios 
     * and timing for comprehensive error handling testing.
     * 
     * @param {object} errorInjectionConfig - Configuration for error injection across multiple mocks
     * @param {object} errorInjectionConfig.targets - Target mocks and methods for error injection
     * @param {object} errorInjectionConfig.timing - Timing configuration for coordinated errors
     * @param {object} errorInjectionConfig.recovery - Error recovery and cleanup configuration
     * @returns {void} Configures multiple mocks with coordinated error injection scenarios
     */
    injectErrors(errorInjectionConfig) {
        if (!errorInjectionConfig || typeof errorInjectionConfig !== 'object') {
            throw new Error('errorInjectionConfig must be a valid object');
        }
        
        if (!errorInjectionConfig.targets || typeof errorInjectionConfig.targets !== 'object') {
            throw new Error('errorInjectionConfig.targets must be a valid object');
        }
        
        const injectionResults = {
            injectionId: generateTestId('inject-'),
            timestamp: new Date().toISOString(),
            targetsProcessed: 0,
            successfulInjections: 0,
            failedInjections: 0,
            errors: []
        };
        
        // Parse error injection configuration for multiple mock targets
        Object.keys(errorInjectionConfig.targets).forEach(mockId => {
            injectionResults.targetsProcessed++;
            
            try {
                const mockEntry = this.activeMocks.get(mockId);
                if (!mockEntry) {
                    throw new Error(`Mock '${mockId}' not found in active mocks`);
                }
                
                const targetConfig = errorInjectionConfig.targets[mockId];
                const mockObject = mockEntry.mock;
                
                // Iterate through target mocks and configure error injection for each
                Object.keys(targetConfig).forEach(methodName => {
                    const errorConfig = targetConfig[methodName];
                    
                    // Set up coordinated error timing and sequencing across mocks
                    const injectionOptions = {
                        timing: errorInjectionConfig.timing?.type || 'immediate',
                        delay: errorInjectionConfig.timing?.delay || 0,
                        condition: errorInjectionConfig.timing?.condition,
                        callCount: errorInjectionConfig.timing?.callCount
                    };
                    
                    // Configure error propagation patterns for testing error flow
                    injectError(mockObject, methodName, errorConfig.error, injectionOptions);
                    
                    injectionResults.successfulInjections++;
                });
                
            } catch (error) {
                injectionResults.failedInjections++;
                injectionResults.errors.push({
                    mockId: mockId,
                    error: error.message
                });
                
                if (this.config.enableLogging) {
                    this.logger.error(`Failed to inject error into mock '${mockId}':`, error);
                }
            }
        });
        
        // Add error injection tracking for debugging and verification
        this.mockCoordination.errorInjections = this.mockCoordination.errorInjections || new Map();
        this.mockCoordination.errorInjections.set(injectionResults.injectionId, {
            config: errorInjectionConfig,
            results: injectionResults
        });
        
        // Set up error injection cleanup and reset capabilities
        if (errorInjectionConfig.recovery?.autoCleanup) {
            const cleanupDelay = errorInjectionConfig.recovery.cleanupDelay || 1000;
            setTimeout(() => {
                this.clearErrorInjections(injectionResults.injectionId);
            }, cleanupDelay);
        }
        
        // Log error injection configuration and affected mocks
        if (this.config.enableLogging) {
            this.logger.info(`Error injection ${injectionResults.injectionId} completed:`, injectionResults);
        }
        
        // Create error scenario validation methods for testing verification
        return injectionResults;
    }
    
    /**
     * Resets specified mocks or all mocks managed by the MockManager to initial 
     * state with configuration preservation.
     * 
     * @param {array} mockIds - Array of mock IDs to reset (optional, resets all if not provided)
     * @returns {void} Resets specified mocks or all mocks to initial state
     */
    resetMocks(mockIds = null) {
        const resetOperation = {
            resetId: generateTestId('reset-'),
            timestamp: new Date().toISOString(),
            requestedMocks: mockIds,
            processedMocks: 0,
            successfulResets: 0,
            failedResets: 0,
            errors: []
        };
        
        // Determine mocks to reset based on mockIds parameter or reset all if not specified
        const mocksToReset = mockIds ? mockIds : Array.from(this.activeMocks.keys());
        
        // Iterate through target mocks and execute reset procedures for each
        mocksToReset.forEach(mockId => {
            resetOperation.processedMocks++;
            
            try {
                const mockEntry = this.activeMocks.get(mockId);
                if (!mockEntry) {
                    throw new Error(`Mock '${mockId}' not found`);
                }
                
                const mockObject = mockEntry.mock;
                
                // Clear call tracking data and method invocation history
                if (typeof mockObject.reset === 'function') {
                    mockObject.reset();
                }
                
                // Reset behavior configurations while preserving base configuration
                if (typeof mockObject.clearError === 'function') {
                    mockObject.clearError();
                }
                
                // Clear error injection settings and restore normal mock behavior
                if (mockObject.clearErrorInjection) {
                    Object.keys(mockObject).forEach(key => {
                        if (mockObject[key] && typeof mockObject[key].clearErrorInjection === 'function') {
                            mockObject[key].clearErrorInjection();
                        }
                    });
                }
                
                // Reset timing simulation and async operation configurations
                if (typeof mockObject.setDelay === 'function') {
                    mockObject.setDelay(0);
                }
                
                resetOperation.successfulResets++;
                
            } catch (error) {
                resetOperation.failedResets++;
                resetOperation.errors.push({
                    mockId: mockId,
                    error: error.message
                });
                
                if (this.config.enableLogging) {
                    this.logger.error(`Failed to reset mock '${mockId}':`, error);
                }
            }
        });
        
        // Log mock reset operations for debugging and verification
        if (this.config.enableLogging) {
            this.logger.info(`Mock reset operation ${resetOperation.resetId} completed:`, resetOperation);
        }
        
        // Update mock state tracking to reflect reset completion
        return resetOperation;
    }
    
    /**
     * Executes comprehensive cleanup of all managed mocks including resource cleanup, 
     * state reset, and memory management.
     * 
     * @returns {Promise<void>} Promise resolving when all mock cleanup tasks are completed
     */
    async cleanup() {
        const cleanupOperation = {
            cleanupId: generateTestId('cleanup-'),
            timestamp: new Date().toISOString(),
            totalMocks: this.activeMocks.size,
            totalCleanupTasks: this.cleanupTasks.size,
            processedTasks: 0,
            errors: []
        };
        
        if (this.config.enableLogging) {
            this.logger.info(`Starting cleanup operation ${cleanupOperation.cleanupId} for ${cleanupOperation.totalMocks} mocks`);
        }
        
        try {
            // Execute all cleanup tasks registered in cleanupTasks Set
            for (const cleanupTask of this.cleanupTasks) {
                try {
                    if (typeof cleanupTask === 'function') {
                        await cleanupTask();
                    }
                    cleanupOperation.processedTasks++;
                } catch (error) {
                    cleanupOperation.errors.push({
                        taskIndex: cleanupOperation.processedTasks,
                        error: error.message
                    });
                }
            }
            
            // Reset all active mocks using resetMocks method
            await this.resetMocks();
            
            // Clear activeMocks Map and mockConfigurations Map
            this.activeMocks.clear();
            this.mockConfigurations.clear();
            
            // Clean up mock tracking infrastructure and monitoring
            this.mockCoordination.requestResponsePairs.clear();
            this.mockCoordination.serviceControllerMocks.clear();
            this.mockCoordination.middlewareChains.clear();
            
            if (this.mockCoordination.errorInjections) {
                this.mockCoordination.errorInjections.clear();
            }
            
            // Release any resources held by mock objects and configurations
            this.cleanupTasks.clear();
            
            // Clear error injection configurations and timing simulations
            // This is handled by individual mock cleanup tasks
            
            // Reset manager state and configuration to initial state
            this.qualityMetrics.mocksActive = 0;
            this.qualityMetrics.mocksCleanedUp = this.qualityMetrics.mocksCreated;
            
            // Log cleanup completion and any cleanup errors encountered
            if (this.config.enableLogging) {
                this.logger.info(`Cleanup operation ${cleanupOperation.cleanupId} completed:`, cleanupOperation);
            }
            
        } catch (error) {
            cleanupOperation.errors.push({
                phase: 'cleanup-coordination',
                error: error.message
            });
            
            if (this.config.enableLogging) {
                this.logger.error(`Cleanup operation ${cleanupOperation.cleanupId} failed:`, error);
            }
            
            throw error;
        }
        
        return cleanupOperation;
    }
    
    /**
     * Returns comprehensive information about managed mocks including state, 
     * configuration, call tracking, and mock statistics.
     * 
     * @param {string} mockId - Specific mock ID to get info for (optional, returns all if not provided)
     * @returns {object} Mock information object with state, configuration, and statistics
     */
    getMockInfo(mockId = null) {
        const infoOperation = {
            infoId: generateTestId('info-'),
            timestamp: new Date().toISOString(),
            requestedMock: mockId,
            managerStats: this.qualityMetrics
        };
        
        if (mockId) {
            // Collect information for specified mock
            const mockEntry = this.activeMocks.get(mockId);
            if (!mockEntry) {
                return {
                    ...infoOperation,
                    found: false,
                    error: `Mock '${mockId}' not found`
                };
            }
            
            const mockObject = mockEntry.mock;
            const mockInfo = {
                ...infoOperation,
                found: true,
                mockId: mockId,
                type: mockEntry.type,
                createdAt: mockEntry.createdAt,
                configuration: deepClone(mockEntry.configuration),
                
                // Include mock state, configuration, and behavior settings
                state: {
                    active: true,
                    managerId: this.managerId,
                    testMetadata: mockObject.testMetadata || {}
                },
                
                // Add call tracking information including call count and parameters
                callTracking: {
                    callCount: typeof mockObject.getCallCount === 'function' ? mockObject.getCallCount() : 0,
                    callHistory: typeof mockObject.getCallHistory === 'function' ? mockObject.getCallHistory() : [],
                    lastCall: typeof mockObject.getLastCall === 'function' ? mockObject.getLastCall() : null
                },
                
                // Include error injection status and timing simulation settings
                errorInjection: {
                    hasErrors: typeof mockObject.hadErrors === 'function' ? mockObject.hadErrors() : false,
                    errorCount: typeof mockObject.getErrors === 'function' ? mockObject.getErrors().length : 0
                },
                
                // Add mock performance metrics and operation statistics
                performance: {
                    timingData: typeof mockObject.getTimingData === 'function' ? mockObject.getTimingData() : null,
                    responseTime: typeof mockObject.getProcessingTime === 'function' ? mockObject.getProcessingTime() : null
                }
            };
            
            return mockInfo;
            
        } else {
            // Collect information for all mocks
            const allMocksInfo = {
                ...infoOperation,
                totalMocks: this.activeMocks.size,
                mocks: {}
            };
            
            // Include manager context and mock lifecycle information
            for (const [id, mockEntry] of this.activeMocks.entries()) {
                allMocksInfo.mocks[id] = {
                    type: mockEntry.type,
                    createdAt: mockEntry.createdAt,
                    serviceName: mockEntry.serviceName || null,
                    active: true
                };
            }
            
            // Add coordination information
            allMocksInfo.coordination = {
                requestResponsePairs: this.mockCoordination.requestResponsePairs.size,
                serviceControllerMocks: this.mockCoordination.serviceControllerMocks.size,
                middlewareChains: this.mockCoordination.middlewareChains.size,
                errorInjections: this.mockCoordination.errorInjections ? this.mockCoordination.errorInjections.size : 0
            };
            
            // Create comprehensive mock information object with all details
            return allMocksInfo;
        }
    }
    
    /**
     * Helper method to clear specific error injections
     * @param {string} injectionId - ID of the error injection to clear
     */
    clearErrorInjections(injectionId) {
        if (this.mockCoordination.errorInjections && this.mockCoordination.errorInjections.has(injectionId)) {
            const injection = this.mockCoordination.errorInjections.get(injectionId);
            
            // Clear error injections from all affected mocks
            Object.keys(injection.config.targets).forEach(mockId => {
                const mockEntry = this.activeMocks.get(mockId);
                if (mockEntry && mockEntry.mock) {
                    const mockObject = mockEntry.mock;
                    Object.keys(injection.config.targets[mockId]).forEach(methodName => {
                        if (mockObject[methodName] && typeof mockObject[methodName].clearErrorInjection === 'function') {
                            mockObject[methodName].clearErrorInjection();
                        }
                    });
                }
            });
            
            this.mockCoordination.errorInjections.delete(injectionId);
            
            if (this.config.enableLogging) {
                this.logger.info(`Cleared error injection ${injectionId}`);
            }
        }
    }
    
    /**
     * Creates coordinated request-response pairs for testing
     * @param {string} pairId - Unique identifier for the pair
     * @param {object} requestOptions - Request configuration
     * @param {object} responseOptions - Response configuration
     */
    createRequestResponsePair(pairId, requestOptions = {}, responseOptions = {}) {
        const requestId = `${pairId}-req`;
        const responseId = `${pairId}-res`;
        
        const mockRequest = this.createRequest(requestId, requestOptions);
        const mockResponse = this.createResponse(responseId, responseOptions);
        
        // Link request and response
        mockRequest.res = mockResponse;
        mockResponse.req = mockRequest;
        
        // Store coordination information
        this.mockCoordination.requestResponsePairs.set(pairId, {
            requestId: requestId,
            responseId: responseId,
            request: mockRequest,
            response: mockResponse,
            createdAt: new Date().toISOString()
        });
        
        return {
            request: mockRequest,
            response: mockResponse,
            pairId: pairId
        };
    }
}

// Export all mock utilities and classes for comprehensive testing support
module.exports = {
    // Core mock creation functions
    createMockRequest,
    createMockResponse,
    createMockNext,
    
    // Service and controller mocking
    mockHelloService,
    mockHelloController,
    mockMiddleware,
    
    // Error handling utilities
    createMockError,
    injectError,
    
    // Context and response utilities
    createMockRequestContext,
    createMockServiceResponse,
    
    // Async and utility functions
    simulateAsyncOperation,
    resetAllMocks,
    validateMockConfig,
    
    // Mock management class
    MockManager
};