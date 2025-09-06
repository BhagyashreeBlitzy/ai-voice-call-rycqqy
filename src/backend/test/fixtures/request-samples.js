/**
 * HTTP Request Fixtures for Node.js Tutorial Application Testing
 * 
 * This comprehensive fixtures file provides standardized HTTP request samples for testing
 * the Node.js tutorial application endpoints. Contains mock HTTP request objects, headers,
 * parameters, and configuration for hello endpoint, health check endpoints, error scenarios,
 * and performance testing scenarios.
 * 
 * Serves as centralized test data for request generation in unit tests, integration tests,
 * and API endpoint testing with Jest and Supertest frameworks, complementing response-samples.js
 * for complete HTTP testing coverage.
 * 
 * Features:
 * - Hello endpoint request testing with GET method validation
 * - HTTP method validation testing for all supported methods
 * - Health check request fixtures for /health, /livez, /readyz endpoints
 * - Jest testing framework support with Supertest HTTP client integration
 * - Express.js v5.1.0 framework request testing with router configuration
 * - Performance testing request configurations with timing and load parameters
 * - Error scenario request fixtures for comprehensive error handling testing
 * - Kubernetes probe compatibility for health check endpoints
 * - Request builder functions for dynamic test scenario generation
 * - Request validation and fixture management utilities
 * 
 * Compatible with:
 * - Jest v29.7.0 testing framework
 * - Supertest v7.1.4 HTTP testing library
 * - Express.js v5.1.0 web framework
 * - Node.js v22.11.0 LTS runtime
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import HTTP status codes for request fixture expected status codes and test validation scenarios
const {
    HTTP_STATUS: {
        OK,
        BAD_REQUEST,
        NOT_FOUND,
        METHOD_NOT_ALLOWED
    }
} = require('../../src/utils/constants.js');

// Import Content-Type header constants for proper HTTP request Accept and Content-Type header configuration
const {
    CONTENT_TYPES: {
        TEXT_PLAIN,
        APPLICATION_JSON
    }
} = require('../../src/utils/constants.js');

// Import route path constants for consistent endpoint URL generation in request fixtures and test scenarios
const {
    ROUTES: {
        HELLO,
        HEALTH,
        READINESS,
        LIVENESS
    }
} = require('../../src/utils/constants.js');

// Import HTTP method constants for request sample generation and method validation testing scenarios
const {
    HTTP_METHODS: {
        GET,
        POST,
        PUT,
        DELETE,
        OPTIONS
    }
} = require('../../src/utils/constants.js');

// Import server default configuration for generating complete test request URLs and timeout configurations in fixtures
const {
    SERVER_DEFAULTS: {
        PORT,
        HOST,
        TIMEOUT
    }
} = require('../../src/utils/constants.js');

// Import application metadata for constructing User-Agent headers and request identification in test fixtures
const {
    APPLICATION_METADATA: {
        NAME,
        VERSION
    }
} = require('../../src/utils/constants.js');

// =============================================================================
// GLOBAL VARIABLES
// =============================================================================

/**
 * Default timeout for HTTP requests in test scenarios (5 seconds)
 * @type {number}
 */
const DEFAULT_TEST_TIMEOUT = 5000;

/**
 * Standard User-Agent for test requests using application metadata
 * @type {string}
 */
const TEST_USER_AGENT = `${NAME}-Test/${VERSION}`;

/**
 * Base URL for constructing complete request URLs
 * @type {string}
 */
const BASE_TEST_URL = `http://${HOST}:${PORT}`;

/**
 * Counter for generating unique request correlation IDs
 * @type {number}
 */
let REQUEST_ID_COUNTER = 0;

/**
 * Consistent timestamp for request fixtures to ensure deterministic testing
 * @type {string}
 */
const TEST_REQUEST_TIMESTAMP = '2024-01-01T00:00:00.000Z';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates unique request correlation IDs for test request tracking, debugging, and performance analysis
 * @param {string} testContext - Test context prefix for correlation ID generation
 * @returns {string} Unique request ID with test context prefix and timestamp for correlation and tracking
 */
function generateRequestId(testContext = 'test') {
    // Increment global REQUEST_ID_COUNTER for uniqueness
    REQUEST_ID_COUNTER++;
    
    // Create timestamp component for temporal tracking
    const timestamp = Date.now();
    
    // Combine testContext prefix with counter and timestamp
    const requestId = `${testContext}-${REQUEST_ID_COUNTER}-${timestamp}`;
    
    // Return formatted request correlation ID
    return requestId;
}

/**
 * Generates standardized HTTP headers for test requests with proper Accept, User-Agent, correlation, and security headers
 * @param {object} headerOptions - Configuration options for header generation
 * @returns {object} HTTP headers object with standard and custom headers for test request configuration
 */
function generateRequestHeaders(headerOptions = {}) {
    // Initialize headers object with common HTTP headers
    const headers = {
        'Accept': headerOptions.accept || TEXT_PLAIN,
        'User-Agent': headerOptions.userAgent || TEST_USER_AGENT,
        'X-Request-ID': headerOptions.requestId || generateRequestId('header'),
        'X-Test-Name': headerOptions.testName || 'unnamed-test',
        'X-Test-Suite': headerOptions.testSuite || 'request-fixtures',
        'X-Test-Timestamp': headerOptions.timestamp || TEST_REQUEST_TIMESTAMP
    };
    
    // Add Content-Type header if specified
    if (headerOptions.contentType) {
        headers['Content-Type'] = headerOptions.contentType;
    }
    
    // Configure security headers if required by headerOptions
    if (headerOptions.includeSecurityHeaders) {
        headers['X-Frame-Options'] = 'DENY';
        headers['X-Content-Type-Options'] = 'nosniff';
    }
    
    // Apply custom headers from headerOptions parameter
    if (headerOptions.customHeaders) {
        Object.assign(headers, headerOptions.customHeaders);
    }
    
    // Return complete headers object for request configuration
    return headers;
}

/**
 * Validates HTTP request fixture format and structure to ensure test compatibility and correctness
 * @param {object} requestFixture - Request fixture object to validate
 * @returns {object} Validation result with fixture status, format compliance, and any structural issues
 */
function validateRequestFixture(requestFixture) {
    const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        recommendations: []
    };
    
    // Validate request fixture has required method and path properties
    if (!requestFixture.method) {
        validationResult.isValid = false;
        validationResult.errors.push('Request fixture missing required method property');
    }
    
    if (!requestFixture.path) {
        validationResult.isValid = false;
        validationResult.errors.push('Request fixture missing required path property');
    }
    
    // Check headers object format and required HTTP headers
    if (requestFixture.headers && typeof requestFixture.headers !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Headers must be an object');
    }
    
    // Verify request method is valid HTTP verb from HTTP_METHODS
    const validMethods = [GET, POST, PUT, DELETE, OPTIONS, 'HEAD'];
    if (requestFixture.method && !validMethods.includes(requestFixture.method)) {
        validationResult.isValid = false;
        validationResult.errors.push(`Invalid HTTP method: ${requestFixture.method}`);
    }
    
    // Validate path format and route consistency with ROUTES constants
    if (requestFixture.path && !requestFixture.path.startsWith('/')) {
        validationResult.warnings.push('Path should start with forward slash');
    }
    
    // Check timeout values are within acceptable ranges
    if (requestFixture.timeout && (requestFixture.timeout < 100 || requestFixture.timeout > 30000)) {
        validationResult.warnings.push('Timeout should be between 100ms and 30 seconds');
    }
    
    // Return comprehensive validation result with recommendations
    if (validationResult.errors.length === 0 && validationResult.warnings.length === 0) {
        validationResult.recommendations.push('Request fixture validation passed successfully');
    }
    
    return validationResult;
}

/**
 * Resets request fixture state and counters to ensure test isolation and prevent fixture contamination between test suites
 */
function resetRequestFixtures() {
    // Reset REQUEST_ID_COUNTER to initial value
    REQUEST_ID_COUNTER = 0;
    
    // Log fixture reset completion for debugging
    console.log('Request fixtures state reset completed');
}

// =============================================================================
// REQUEST BUILDER FUNCTIONS
// =============================================================================

/**
 * Creates standardized HTTP request configuration for hello endpoint testing with proper headers, method, and validation parameters
 * @param {object} requestOptions - Configuration options for request customization
 * @returns {object} Complete HTTP request configuration with method, path, headers, and test metadata
 */
function createHelloRequest(requestOptions = {}) {
    // Initialize request configuration with default values
    const requestConfig = {
        method: GET,
        path: HELLO,
        url: `${BASE_TEST_URL}${HELLO}`,
        timeout: requestOptions.timeout || DEFAULT_TEST_TIMEOUT,
        expectedStatus: OK
    };
    
    // Set Accept header to CONTENT_TYPES.TEXT_PLAIN for expected response
    // Add User-Agent header using TEST_USER_AGENT value
    // Include request correlation ID for tracking and debugging
    requestConfig.headers = generateRequestHeaders({
        accept: TEXT_PLAIN,
        userAgent: TEST_USER_AGENT,
        requestId: generateRequestId('hello'),
        testName: requestOptions.testName || 'hello-endpoint-test',
        testSuite: 'hello-endpoint',
        ...requestOptions.headers
    });
    
    // Add test metadata including description and expected behavior
    requestConfig.metadata = {
        description: 'HTTP GET request to /hello endpoint for Hello world response',
        expectedResponse: 'Hello world',
        testCategory: 'endpoint-validation',
        performanceThreshold: 50, // milliseconds
        ...requestOptions.metadata
    };
    
    // Apply custom requestOptions overrides and configurations
    Object.assign(requestConfig, requestOptions);
    
    // Return complete request configuration object
    return requestConfig;
}

/**
 * Creates HTTP request configurations for health check endpoints including basic health, liveness, and readiness probes
 * @param {string} healthType - Type of health check (health|livez|readyz)
 * @param {object} options - Configuration options for health check request
 * @returns {object} Health check request configuration with appropriate path and headers for specified health type
 */
function createHealthCheckRequest(healthType = 'health', options = {}) {
    // Validate healthType parameter against supported health check types
    const healthTypeMap = {
        health: HEALTH,
        livez: LIVENESS,
        readyz: READINESS
    };
    
    if (!healthTypeMap[healthType]) {
        throw new Error(`Unsupported health check type: ${healthType}. Supported types: health, livez, readyz`);
    }
    
    // Set appropriate endpoint path based on healthType
    const endpointPath = healthTypeMap[healthType];
    
    // Configure HTTP method to GET for all health endpoints
    const requestConfig = {
        method: GET,
        path: endpointPath,
        url: `${BASE_TEST_URL}${endpointPath}`,
        timeout: options.timeout || DEFAULT_TEST_TIMEOUT,
        expectedStatus: OK
    };
    
    // Set Accept header to APPLICATION_JSON for JSON response format
    // Add health check specific headers and metadata
    requestConfig.headers = generateRequestHeaders({
        accept: APPLICATION_JSON,
        requestId: generateRequestId(`health-${healthType}`),
        testName: options.testName || `${healthType}-check-test`,
        testSuite: 'health-checks',
        customHeaders: {
            'X-Health-Check-Type': healthType,
            ...(options.kubernetesProbe && {
                'User-Agent': 'kube-probe/1.0'
            })
        },
        ...options.headers
    });
    
    // Configure timeout settings for health probe requirements
    if (options.kubernetesProbe) {
        requestConfig.timeout = Math.min(requestConfig.timeout, 10000); // Kubernetes default timeout
        requestConfig.metadata = {
            probeType: healthType,
            kubernetesCompatible: true,
            ...options.metadata
        };
    }
    
    // Include health check metadata and expected response format
    requestConfig.metadata = {
        description: `Health check request for ${healthType} endpoint`,
        expectedResponse: { status: 'ok' },
        testCategory: 'health-monitoring',
        healthCheckType: healthType,
        ...requestConfig.metadata
    };
    
    // Apply options parameter customizations and overrides
    Object.assign(requestConfig, options);
    
    // Return health check request configuration object
    return requestConfig;
}

/**
 * Creates HTTP request configurations designed to trigger specific error scenarios for comprehensive error handling testing
 * @param {string} errorType - Type of error to trigger (404|405|400|timeout)
 * @param {object} errorConfig - Configuration for specific error scenario
 * @returns {object} Error test request configuration with parameters to trigger specified error scenario
 */
function createErrorTestRequest(errorType, errorConfig = {}) {
    let requestConfig = {};
    
    // Determine appropriate request configuration based on errorType
    switch (errorType) {
        case '404':
        case 'not-found':
            // Configure invalid route path for 404 Not Found testing
            requestConfig = {
                method: GET,
                path: '/nonexistent-endpoint',
                url: `${BASE_TEST_URL}/nonexistent-endpoint`,
                expectedStatus: NOT_FOUND
            };
            break;
            
        case '405':
        case 'method-not-allowed':
            // Set unsupported HTTP method for 405 Method Not Allowed testing
            requestConfig = {
                method: errorConfig.method || POST,
                path: HELLO,
                url: `${BASE_TEST_URL}${HELLO}`,
                expectedStatus: METHOD_NOT_ALLOWED
            };
            break;
            
        case '400':
        case 'bad-request':
            // Create malformed request parameters for 400 Bad Request testing
            requestConfig = {
                method: GET,
                path: HELLO,
                url: `${BASE_TEST_URL}${HELLO}`,
                expectedStatus: BAD_REQUEST,
                headers: {
                    'Content-Type': 'invalid-content-type'
                }
            };
            break;
            
        case 'timeout':
            // Configure request timeout for timeout error testing
            requestConfig = {
                method: GET,
                path: HELLO,
                url: `${BASE_TEST_URL}${HELLO}`,
                timeout: 1, // Very short timeout to trigger timeout error
                expectedError: 'timeout'
            };
            break;
            
        default:
            throw new Error(`Unsupported error type: ${errorType}`);
    }
    
    // Add standard headers with error test identification
    requestConfig.headers = {
        ...generateRequestHeaders({
            requestId: generateRequestId(`error-${errorType}`),
            testName: `error-${errorType}-test`,
            testSuite: 'error-handling'
        }),
        ...requestConfig.headers
    };
    
    // Include error test metadata and expected error information
    requestConfig.metadata = {
        description: `Error test request to trigger ${errorType} scenario`,
        errorType: errorType,
        testCategory: 'error-handling',
        expectedBehavior: `Should return ${requestConfig.expectedStatus || 'error'} response`,
        ...errorConfig.metadata
    };
    
    // Apply errorConfig customizations for specific error scenarios
    Object.assign(requestConfig, errorConfig);
    
    // Return error-triggering request configuration
    return requestConfig;
}

/**
 * Generates HTTP request configurations for performance testing including response time validation, load testing, and concurrency testing
 * @param {object} performanceConfig - Configuration for performance testing scenarios
 * @returns {Array} Array of request configurations for performance testing scenarios with timing and concurrency parameters
 */
function createPerformanceTestRequests(performanceConfig = {}) {
    const requests = [];
    
    // Create baseline performance request configuration
    const baselineRequest = createHelloRequest({
        testName: 'performance-baseline',
        metadata: {
            testCategory: 'performance-baseline',
            performanceThreshold: performanceConfig.responseTimeThreshold || 50
        }
    });
    requests.push(baselineRequest);
    
    // Generate multiple request variants for load testing
    const loadTestCount = performanceConfig.loadTestRequests || 50;
    for (let i = 0; i < loadTestCount; i++) {
        const loadTestRequest = createHelloRequest({
            testName: `load-test-${i}`,
            headers: {
                'X-Load-Test-Request': i.toString(),
                'X-Load-Test-Batch': performanceConfig.batchId || 'default'
            },
            metadata: {
                testCategory: 'load-testing',
                requestIndex: i,
                batchSize: loadTestCount
            }
        });
        requests.push(loadTestRequest);
    }
    
    // Configure concurrent request parameters for scalability testing
    if (performanceConfig.concurrentRequests) {
        const concurrentBatch = createConcurrentRequestBatch(
            baselineRequest,
            performanceConfig.concurrentRequests,
            {
                testName: 'concurrent-performance-test',
                metadata: { testCategory: 'concurrency-testing' }
            }
        );
        requests.push(...concurrentBatch);
    }
    
    // Create stress testing request configurations
    if (performanceConfig.stressTest) {
        const stressRequest = createHelloRequest({
            testName: 'stress-test',
            timeout: 100, // Shorter timeout for stress testing
            metadata: {
                testCategory: 'stress-testing',
                expectedHighLoad: true,
                stressLevel: performanceConfig.stressLevel || 'medium'
            }
        });
        requests.push(stressRequest);
    }
    
    // Return array of performance test request configurations
    return requests;
}

/**
 * Creates batch of identical HTTP requests for concurrent execution and load testing validation
 * @param {object} baseRequest - Base request configuration to replicate
 * @param {number} requestCount - Number of concurrent requests to generate
 * @param {object} batchOptions - Options for batch configuration
 * @returns {Array} Array of request configurations for concurrent execution with unique correlation IDs
 */
function createConcurrentRequestBatch(baseRequest, requestCount, batchOptions = {}) {
    // Validate baseRequest configuration for batch generation
    const validation = validateRequestFixture(baseRequest);
    if (!validation.isValid) {
        throw new Error(`Invalid base request: ${validation.errors.join(', ')}`);
    }
    
    // Create array to hold concurrent request configurations
    const requestBatch = [];
    
    // Generate specified number of request copies based on requestCount
    for (let i = 0; i < requestCount; i++) {
        // Create deep copy of base request
        const concurrentRequest = JSON.parse(JSON.stringify(baseRequest));
        
        // Assign unique correlation ID to each request for tracking
        concurrentRequest.headers = {
            ...concurrentRequest.headers,
            'X-Request-ID': generateRequestId(`concurrent-${i}`),
            'X-Concurrent-Index': i.toString(),
            'X-Concurrent-Batch-Size': requestCount.toString()
        };
        
        // Configure concurrent execution parameters from batchOptions
        concurrentRequest.metadata = {
            ...concurrentRequest.metadata,
            concurrentIndex: i,
            batchSize: requestCount,
            batchId: batchOptions.batchId || generateRequestId('batch'),
            testCategory: 'concurrent-execution',
            ...batchOptions.metadata
        };
        
        // Apply request variations if specified in batchOptions
        if (batchOptions.variations && batchOptions.variations[i]) {
            Object.assign(concurrentRequest, batchOptions.variations[i]);
        }
        
        requestBatch.push(concurrentRequest);
    }
    
    // Return array of concurrent request configurations
    return requestBatch;
}

/**
 * Creates HTTP request configuration from predefined templates with customization options for different test scenarios
 * @param {string} templateName - Name of the template to use (basic|health|error|performance)
 * @param {object} customizations - Customizations to apply to the template
 * @returns {object} Request configuration based on template with applied customizations and test-specific parameters
 */
function createRequestConfigFromTemplate(templateName, customizations = {}) {
    // Load predefined request template based on templateName
    let baseTemplate;
    
    switch (templateName) {
        case 'basic':
        case 'basicGet':
            baseTemplate = createHelloRequest();
            break;
            
        case 'health':
        case 'healthCheck':
            baseTemplate = createHealthCheckRequest('health');
            break;
            
        case 'error':
        case 'errorTest':
            baseTemplate = createErrorTestRequest('404');
            break;
            
        case 'performance':
        case 'performanceTest':
            baseTemplate = createHelloRequest({
                metadata: { testCategory: 'performance-testing' }
            });
            break;
            
        default:
            throw new Error(`Unknown template: ${templateName}`);
    }
    
    // Merge customizations object with template defaults
    const customizedRequest = {
        ...baseTemplate,
        ...customizations
    };
    
    // Merge headers separately to preserve both sets
    if (customizations.headers) {
        customizedRequest.headers = {
            ...baseTemplate.headers,
            ...customizations.headers
        };
    }
    
    // Merge metadata separately to preserve both sets
    if (customizations.metadata) {
        customizedRequest.metadata = {
            ...baseTemplate.metadata,
            ...customizations.metadata
        };
    }
    
    // Generate unique request ID for tracking
    customizedRequest.headers['X-Request-ID'] = generateRequestId('template');
    
    // Return complete customized request configuration
    return customizedRequest;
}

// =============================================================================
// HELLO ENDPOINT REQUEST FIXTURES
// =============================================================================

/**
 * Hello endpoint request fixtures including valid GET request and invalid method requests
 * for comprehensive HTTP method validation testing
 */
const helloEndpointRequests = {
    /**
     * Valid GET request to /hello endpoint
     */
    validGetRequest: createHelloRequest({
        testName: 'valid-hello-get-request',
        metadata: {
            description: 'Standard GET request to /hello endpoint expecting Hello world response',
            testCategory: 'endpoint-validation',
            expectedResponse: 'Hello world'
        }
    }),
    
    /**
     * POST method request to /hello endpoint (should return 405)
     */
    postMethodRequest: createErrorTestRequest('405', {
        method: POST,
        testName: 'invalid-post-method',
        metadata: {
            description: 'POST request to /hello endpoint expecting 405 Method Not Allowed',
            testCategory: 'method-validation'
        }
    }),
    
    /**
     * PUT method request to /hello endpoint (should return 405)
     */
    putMethodRequest: createErrorTestRequest('405', {
        method: PUT,
        testName: 'invalid-put-method',
        metadata: {
            description: 'PUT request to /hello endpoint expecting 405 Method Not Allowed',
            testCategory: 'method-validation'
        }
    }),
    
    /**
     * DELETE method request to /hello endpoint (should return 405)
     */
    deleteMethodRequest: createErrorTestRequest('405', {
        method: DELETE,
        testName: 'invalid-delete-method',
        metadata: {
            description: 'DELETE request to /hello endpoint expecting 405 Method Not Allowed',
            testCategory: 'method-validation'
        }
    }),
    
    /**
     * OPTIONS method request to /hello endpoint
     */
    optionsMethodRequest: {
        method: OPTIONS,
        path: HELLO,
        url: `${BASE_TEST_URL}${HELLO}`,
        headers: generateRequestHeaders({
            requestId: generateRequestId('options'),
            testName: 'options-method-test',
            testSuite: 'method-validation'
        }),
        expectedStatus: 200, // or 405 depending on implementation
        metadata: {
            description: 'OPTIONS request to /hello endpoint for CORS preflight',
            testCategory: 'method-validation'
        }
    }
};

// =============================================================================
// HEALTH CHECK REQUEST FIXTURES
// =============================================================================

/**
 * Health check endpoint request fixtures for /health, /livez, and /readyz endpoints
 * with Kubernetes probe compatibility
 */
const healthCheckRequests = {
    /**
     * Basic health check request to /health endpoint
     */
    basicHealthRequest: createHealthCheckRequest('health', {
        testName: 'basic-health-check',
        metadata: {
            description: 'Basic health check request to /health endpoint',
            testCategory: 'health-monitoring'
        }
    }),
    
    /**
     * Kubernetes liveness probe request to /livez endpoint
     */
    livenessProbeRequest: createHealthCheckRequest('livez', {
        kubernetesProbe: true,
        timeout: 10000,
        testName: 'kubernetes-liveness-probe',
        metadata: {
            description: 'Kubernetes liveness probe request to /livez endpoint',
            testCategory: 'kubernetes-probes',
            probeType: 'liveness'
        }
    }),
    
    /**
     * Kubernetes readiness probe request to /readyz endpoint
     */
    readinessProbeRequest: createHealthCheckRequest('readyz', {
        kubernetesProbe: true,
        timeout: 10000,
        testName: 'kubernetes-readiness-probe',
        metadata: {
            description: 'Kubernetes readiness probe request to /readyz endpoint',
            testCategory: 'kubernetes-probes',
            probeType: 'readiness'
        }
    }),
    
    /**
     * Detailed health check request with extended timeout
     */
    detailedHealthRequest: createHealthCheckRequest('health', {
        timeout: 15000,
        testName: 'detailed-health-check',
        headers: {
            'X-Health-Detail-Level': 'detailed',
            'X-Include-System-Info': 'true'
        },
        metadata: {
            description: 'Detailed health check request with system information',
            testCategory: 'detailed-health-monitoring',
            includeSystemInfo: true
        }
    })
};

// =============================================================================
// ERROR TRIGGERING REQUEST FIXTURES
// =============================================================================

/**
 * Request fixtures designed to trigger specific error scenarios for comprehensive
 * error handling testing and validation
 */
const errorTriggeringRequests = {
    /**
     * Request to nonexistent endpoint (404 Not Found)
     */
    notFoundRequest: createErrorTestRequest('404', {
        testName: 'route-not-found',
        metadata: {
            description: 'Request to nonexistent endpoint expecting 404 Not Found',
            testCategory: 'error-handling'
        }
    }),
    
    /**
     * Array of method not allowed requests for different HTTP methods
     */
    methodNotAllowedRequests: [
        createErrorTestRequest('405', {
            method: POST,
            testName: 'post-method-not-allowed'
        }),
        createErrorTestRequest('405', {
            method: PUT,
            testName: 'put-method-not-allowed'
        }),
        createErrorTestRequest('405', {
            method: DELETE,
            testName: 'delete-method-not-allowed'
        })
    ],
    
    /**
     * Array of bad request scenarios for various malformed requests
     */
    badRequestScenarios: [
        createErrorTestRequest('400', {
            testName: 'invalid-content-type',
            headers: { 'Content-Type': 'invalid/content-type' }
        }),
        {
            method: GET,
            path: HELLO,
            url: `${BASE_TEST_URL}${HELLO}?invalid=query%ZZ`,
            headers: generateRequestHeaders({
                testName: 'malformed-query-string'
            }),
            expectedStatus: BAD_REQUEST,
            metadata: {
                description: 'Request with malformed query string',
                testCategory: 'error-handling'
            }
        }
    ],
    
    /**
     * Request configuration to trigger timeout error
     */
    timeoutRequest: createErrorTestRequest('timeout', {
        testName: 'request-timeout-test',
        metadata: {
            description: 'Request configured to trigger timeout error',
            testCategory: 'timeout-handling'
        }
    })
};

// =============================================================================
// PERFORMANCE TEST REQUEST FIXTURES
// =============================================================================

/**
 * Performance testing request configurations including response time validation,
 * load testing, and concurrent request handling
 */
const performanceTestRequests = {
    /**
     * Response time validation request
     */
    responseTimeTest: createHelloRequest({
        testName: 'response-time-validation',
        metadata: {
            description: 'Request for response time performance validation',
            testCategory: 'performance-testing',
            performanceThreshold: 50,
            measureResponseTime: true
        }
    }),
    
    /**
     * Array of load testing requests
     */
    loadTestRequests: createPerformanceTestRequests({
        loadTestRequests: 25,
        batchId: generateRequestId('load-test'),
        responseTimeThreshold: 100
    }),
    
    /**
     * Concurrent request batch for scalability testing
     */
    concurrentTestBatch: createConcurrentRequestBatch(
        createHelloRequest({
            testName: 'concurrent-base-request'
        }),
        10,
        {
            batchId: generateRequestId('concurrent'),
            metadata: {
                testCategory: 'concurrent-testing',
                expectedConcurrentExecution: true
            }
        }
    ),
    
    /**
     * Stress test configuration
     */
    stressTestConfig: {
        method: GET,
        path: HELLO,
        url: `${BASE_TEST_URL}${HELLO}`,
        headers: generateRequestHeaders({
            testName: 'stress-test-config',
            testSuite: 'stress-testing'
        }),
        timeout: 50, // Short timeout for stress conditions
        expectedStatus: OK,
        metadata: {
            description: 'Stress test configuration with short timeout',
            testCategory: 'stress-testing',
            stressLevel: 'high',
            performanceThreshold: 25
        }
    }
};

// =============================================================================
// REQUEST TEMPLATES
// =============================================================================

/**
 * Request configuration templates for different test scenarios providing
 * consistent base configurations with customization options
 */
const requestTemplates = {
    /**
     * Basic GET request template
     */
    basicGetTemplate: {
        method: GET,
        timeout: DEFAULT_TEST_TIMEOUT,
        headers: generateRequestHeaders(),
        metadata: {
            templateType: 'basic-get',
            testCategory: 'template-based'
        }
    },
    
    /**
     * Health check request template
     */
    healthCheckTemplate: {
        method: GET,
        timeout: DEFAULT_TEST_TIMEOUT,
        headers: generateRequestHeaders({
            accept: APPLICATION_JSON
        }),
        expectedStatus: OK,
        metadata: {
            templateType: 'health-check',
            testCategory: 'health-monitoring'
        }
    },
    
    /**
     * Error test request template
     */
    errorTestTemplate: {
        method: GET,
        timeout: DEFAULT_TEST_TIMEOUT,
        headers: generateRequestHeaders(),
        metadata: {
            templateType: 'error-test',
            testCategory: 'error-handling'
        }
    },
    
    /**
     * Performance test request template
     */
    performanceTemplate: {
        method: GET,
        path: HELLO,
        url: `${BASE_TEST_URL}${HELLO}`,
        timeout: DEFAULT_TEST_TIMEOUT,
        headers: generateRequestHeaders(),
        expectedStatus: OK,
        metadata: {
            templateType: 'performance-test',
            testCategory: 'performance-testing',
            performanceThreshold: 50
        }
    }
};

// =============================================================================
// COMMON REQUEST HEADERS
// =============================================================================

/**
 * Predefined HTTP header configurations for different request types and testing scenarios
 * with proper Content-Type and Accept headers
 */
const commonRequestHeaders = {
    /**
     * Standard headers for basic HTTP requests
     */
    standardHeaders: generateRequestHeaders({
        accept: TEXT_PLAIN,
        testSuite: 'standard-requests'
    }),
    
    /**
     * Headers optimized for hello endpoint requests
     */
    helloEndpointHeaders: generateRequestHeaders({
        accept: TEXT_PLAIN,
        testSuite: 'hello-endpoint',
        customHeaders: {
            'X-Expected-Response': 'Hello world',
            'X-Endpoint-Type': 'text-response'
        }
    }),
    
    /**
     * Headers for health check requests
     */
    healthCheckHeaders: generateRequestHeaders({
        accept: APPLICATION_JSON,
        testSuite: 'health-checks',
        customHeaders: {
            'X-Health-Check': 'true',
            'X-Expected-Format': 'json'
        }
    }),
    
    /**
     * Headers for performance testing scenarios
     */
    performanceTestHeaders: generateRequestHeaders({
        testSuite: 'performance-testing',
        customHeaders: {
            'X-Performance-Test': 'true',
            'X-Measure-Timing': 'true'
        }
    })
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Hello endpoint request fixtures with valid and invalid method requests
    helloEndpointRequests,
    
    // Health check endpoint request fixtures for monitoring and Kubernetes probes
    healthCheckRequests,
    
    // Error triggering request fixtures for comprehensive error handling testing
    errorTriggeringRequests,
    
    // Performance testing request configurations with timing and load parameters
    performanceTestRequests,
    
    // Request configuration templates for different test scenarios
    requestTemplates,
    
    // Request builder functions for dynamic test scenario generation
    requestBuilders: {
        createHelloRequest,
        createHealthCheckRequest,
        createErrorTestRequest,
        createPerformanceTestRequests,
        createConcurrentRequestBatch
    },
    
    // Helper utilities for request configuration management and validation
    requestHelpers: {
        generateRequestHeaders,
        generateRequestId,
        validateRequestFixture,
        createRequestConfigFromTemplate,
        resetRequestFixtures
    },
    
    // Predefined HTTP header configurations for different request types
    commonRequestHeaders
};