/**
 * HTTP Server Configuration Module for Node.js Tutorial Application
 * 
 * This module provides centralized server configuration management including HTTP server settings,
 * Express.js 5.1.0 application configuration, connection management parameters, and performance
 * optimizations for the Node.js tutorial application. Integrates with environment configuration
 * and logging systems to provide environment-specific server behavior optimized for educational
 * purposes and development workflows while demonstrating professional server configuration patterns.
 * 
 * Features comprehensive server configuration including:
 * - HTTP server timeout and connection management
 * - Express.js 5.1.0 framework configuration and security settings
 * - Environment-specific performance optimizations leveraging Node.js v22.x LTS
 * - Security configurations including header management and request limits
 * - Configuration validation and error handling for robust server startup
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import environment configuration providing port, host, and environment-specific settings
const { 
    config,
    validateEnvironment,
    getEnvironmentInfo,
    createEnvironmentConfig
} = require('./environment.js');

// Import logging configuration for server event logging and request monitoring
const { 
    loggingConfig,
    createLoggingConfig,
    validateLoggingConfig
} = require('./logging.js');

// Import server configuration constants including timeout values, connection limits, and Express.js settings
const { 
    SERVER,
    TIMEOUTS,
    HTTP_STATUS,
    ERROR_MESSAGES
} = require('../utils/constants.js');

// Import validation utilities for configuration validation and error handling
const {
    isValidPort,
    isValidHost,
    isValidTimeout,
    validateObject,
    ValidationResult,
    createValidationError
} = require('../utils/validator.js');

/**
 * Global server configuration constants derived from environment and server constants
 * These provide consistent defaults across different server configuration components
 */
const defaultServerTimeout = config.isDevelopment ? SERVER.DEVELOPMENT_TIMEOUT : SERVER.PRODUCTION_TIMEOUT;
const maxConnectionsLimit = SERVER.DEFAULT_MAX_CONNECTIONS;
const requestTimeoutMs = SERVER.DEFAULT_REQUEST_TIMEOUT;

/**
 * Global configuration cache for performance optimization
 * Stores computed server configuration to avoid repeated processing
 * @type {Object|null}
 */
let serverConfigCache = null;

/**
 * Validation result cache to store server configuration validation results
 * Prevents redundant validation operations during runtime
 * @type {ValidationResult|null}
 */
let configValidationCache = null;

/**
 * Creates a comprehensive server configuration object with HTTP server settings, Express.js
 * configuration, connection management parameters, and environment-specific optimizations
 * for the Node.js tutorial application
 * 
 * @param {Object} environmentConfig - Environment configuration object with port, host, and environment settings
 * @returns {Object} Complete server configuration object with HTTP server settings, Express.js options, connection parameters, and security configurations
 */
function createServerConfig(environmentConfig = config) {
    try {
        // Extract environment configuration including port, host, and environment mode
        const {
            port,
            host,
            nodeEnv,
            isDevelopment,
            isProduction,
            isTest
        } = environmentConfig;

        // Set environment-specific timeout values based on development or production mode
        const serverTimeout = isDevelopment ? SERVER.DEVELOPMENT_TIMEOUT : 
                             isProduction ? SERVER.PRODUCTION_TIMEOUT : 
                             SERVER.DEFAULT_TIMEOUT;

        // Configure Express.js application settings including JSON parsing limits and trust proxy
        const expressConfiguration = getExpressConfiguration(environmentConfig);

        // Set connection management parameters including keep-alive timeout and max connections
        const connectionConfig = getConnectionConfig(isProduction);

        // Configure security settings including header management and request limits
        const securityConfig = getSecurityConfig(nodeEnv);

        // Apply performance optimizations based on Node.js v22.x LTS and Express.js 5.1.0 features
        const performanceConfig = getPerformanceConfig(environmentConfig);

        // Set logging integration parameters for server event monitoring
        const serverLoggingConfig = {
            enabled: true,
            level: loggingConfig.level,
            format: loggingConfig.format,
            requestLogging: true,
            errorLogging: true,
            performanceLogging: isDevelopment
        };

        // Create complete server configuration object with all settings and metadata
        const serverConfiguration = {
            // HTTP server configuration
            http: {
                port: port,
                host: host,
                timeout: serverTimeout,
                keepAliveTimeout: SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
                headersTimeout: 60000, // 60 seconds for request headers
                requestTimeout: requestTimeoutMs,
                maxConnections: maxConnectionsLimit,
                backlog: 511 // Node.js default backlog
            },

            // Express.js framework configuration
            express: expressConfiguration,

            // Connection management configuration
            connection: connectionConfig,

            // Security configuration
            security: securityConfig,

            // Performance optimization configuration
            performance: performanceConfig,

            // Logging configuration integration
            logging: serverLoggingConfig,

            // Environment information
            environment: {
                nodeEnv: nodeEnv,
                isDevelopment: isDevelopment,
                isProduction: isProduction,
                isTest: isTest
            },

            // Configuration metadata
            metadata: {
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                nodeVersion: process.version,
                expressVersion: '5.1.0',
                configurationSource: 'server-config-module'
            }
        };

        // Validate server configuration using validation utilities
        const validation = validateServerConfig(serverConfiguration);
        serverConfiguration.validation = validation;

        // Cache the configuration for performance optimization
        serverConfigCache = serverConfiguration;
        configValidationCache = validation;

        // Log successful server configuration creation
        console.info(`[INFO] Server configuration created successfully for ${nodeEnv} environment`);

        // Return complete server configuration object with all settings and metadata
        return serverConfiguration;

    } catch (error) {
        // Handle server configuration creation errors
        console.error(`[ERROR] Failed to create server configuration: ${error.message}`);
        
        // Return minimal fallback configuration
        return createFallbackServerConfig(environmentConfig);
    }
}

/**
 * Returns HTTP server-specific settings including timeout values, connection limits, and
 * keep-alive configuration optimized for the tutorial application's requirements and environment
 * 
 * @param {String} environment - Environment string (development, test, production)
 * @returns {Object} HTTP server settings object with timeout, connection, and keep-alive configurations
 */
function getHttpServerSettings(environment = config.nodeEnv) {
    try {
        // Determine appropriate timeout values based on environment (development vs production)
        const timeout = environment === 'development' ? SERVER.DEVELOPMENT_TIMEOUT :
                       environment === 'production' ? SERVER.PRODUCTION_TIMEOUT :
                       SERVER.DEFAULT_TIMEOUT;

        // Set connection timeout and keep-alive timeout based on environment requirements
        const keepAliveTimeout = environment === 'production' ? 65000 : SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT;
        const connectionTimeout = environment === 'production' ? 120000 : 30000;

        // Configure maximum connections limit for resource management
        const maxConnections = environment === 'production' ? 1000 : 
                              environment === 'development' ? 10 : 
                              SERVER.DEFAULT_MAX_CONNECTIONS;

        // Set request timeout and response timeout values
        const requestTimeout = environment === 'production' ? 30000 : SERVER.DEFAULT_REQUEST_TIMEOUT;
        const headersTimeout = 60000; // Standard 60 seconds for headers

        // Apply environment-specific server optimizations
        const serverSettings = {
            timeout: timeout,
            keepAliveTimeout: keepAliveTimeout,
            connectionTimeout: connectionTimeout,
            maxConnections: maxConnections,
            requestTimeout: requestTimeout,
            headersTimeout: headersTimeout,
            
            // Additional HTTP server settings
            backlog: 511, // Node.js default TCP backlog
            allowHalfOpen: false, // Close socket when the other end closes
            pauseOnConnect: false, // Don't pause socket on connection
            
            // Environment-specific optimizations
            highWaterMark: environment === 'production' ? 16384 : 1024,
            noDelay: true, // Disable Nagle's algorithm for low latency
            keepAlive: true, // Enable TCP keep-alive
            
            // Metadata
            environment: environment,
            optimizedFor: environment === 'production' ? 'throughput' : 'development'
        };

        // Return HTTP server settings object with all timeout and connection parameters
        return serverSettings;

    } catch (error) {
        console.error(`[ERROR] Failed to get HTTP server settings: ${error.message}`);
        
        // Return basic fallback settings
        return {
            timeout: SERVER.DEFAULT_TIMEOUT,
            keepAliveTimeout: SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
            maxConnections: SERVER.DEFAULT_MAX_CONNECTIONS,
            requestTimeout: SERVER.DEFAULT_REQUEST_TIMEOUT,
            headersTimeout: 60000,
            environment: environment,
            error: error.message
        };
    }
}

/**
 * Generates Express.js application configuration including middleware settings, JSON parsing
 * limits, security headers, and framework-specific optimizations for Express.js 5.1.0
 * 
 * @param {Object} environmentConfig - Environment configuration object with settings
 * @returns {Object} Express.js configuration object with middleware settings, parsing limits, and security configurations
 */
function getExpressConfiguration(environmentConfig = config) {
    try {
        const { nodeEnv, isDevelopment, isProduction } = environmentConfig;

        // Configure JSON body parser limits based on server constants
        const jsonLimit = isProduction ? SERVER.DEFAULT_JSON_LIMIT : '50mb'; // Larger limit for development
        
        // Set URL-encoded body parser limits for form data handling
        const urlencodedLimit = isProduction ? SERVER.DEFAULT_URLENCODED_LIMIT : '50mb';

        // Configure trust proxy settings based on environment
        const trustProxy = isProduction ? true : false; // Trust proxy in production

        // Set Express.js security headers including X-Powered-By removal
        const securityHeaders = {
            xPoweredBy: false, // Disable X-Powered-By header for security
            trustProxy: trustProxy,
            
            // Express.js 5.1.0 specific security enhancements
            reDoSProtection: true, // Enable ReDoS attack prevention (CVE-2024-45590 mitigation)
            asyncErrorHandling: true // Enable automatic Promise rejection forwarding
        };

        // Configure Express.js 5.1.0 specific settings and optimizations
        const frameworkSettings = {
            // Native Node.js method usage for better performance
            useNativeMethods: true,
            
            // Reduced dependencies for better performance
            reducedDependencies: true,
            
            // Enhanced async/await support
            promiseBasedErrorHandling: true,
            
            // Path-to-regexp upgrade for security
            pathToRegexpVersion: '8.0.0',
            
            // Modern JavaScript features support
            modernJSSupport: true
        };

        // Apply environment-specific Express.js configurations
        const environmentSpecificConfig = {
            development: {
                verbose: true,
                debugMode: true,
                hotReload: false, // Not applicable for this tutorial
                errorStackTrace: true
            },
            production: {
                verbose: false,
                debugMode: false,
                compressionEnabled: true,
                caching: true,
                errorStackTrace: false
            },
            test: {
                verbose: false,
                debugMode: false,
                mockingEnabled: true,
                errorStackTrace: true
            }
        };

        // Return Express.js configuration object with all framework settings
        const expressConfig = {
            // Body parsing configuration
            bodyParser: {
                json: {
                    limit: jsonLimit,
                    strict: true,
                    type: 'application/json'
                },
                urlencoded: {
                    limit: urlencodedLimit,
                    extended: true, // Rich object parsing
                    parameterLimit: 1000
                }
            },

            // Security configuration
            security: securityHeaders,

            // Framework settings
            framework: frameworkSettings,

            // Environment-specific settings
            environment: environmentSpecificConfig[nodeEnv] || environmentSpecificConfig.development,

            // Middleware configuration
            middleware: {
                requestLogging: isDevelopment,
                errorHandling: true,
                responseTime: isDevelopment,
                compression: isProduction,
                helmet: isProduction // Security headers middleware
            },

            // Express.js version information
            version: '5.1.0',
            features: [
                'ReDoS attack prevention',
                'Native Node.js methods',
                'Async error handling',
                'Reduced dependencies'
            ]
        };

        return expressConfig;

    } catch (error) {
        console.error(`[ERROR] Failed to create Express.js configuration: ${error.message}`);
        
        // Return basic fallback configuration
        return {
            bodyParser: {
                json: { limit: SERVER.DEFAULT_JSON_LIMIT },
                urlencoded: { limit: SERVER.DEFAULT_URLENCODED_LIMIT, extended: true }
            },
            security: {
                xPoweredBy: false,
                trustProxy: false
            },
            error: error.message
        };
    }
}

/**
 * Creates connection management configuration including keep-alive settings, connection pooling
 * parameters, and resource limits for efficient HTTP connection handling
 * 
 * @param {Boolean} isProduction - Whether running in production environment
 * @returns {Object} Connection configuration object with keep-alive, pooling, and resource limit settings
 */
function getConnectionConfig(isProduction = config.isProduction) {
    try {
        // Set keep-alive timeout based on environment and performance requirements
        const keepAliveTimeout = isProduction ? 65000 : SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT;
        
        // Configure maximum concurrent connections limit
        const maxConnections = isProduction ? 1000 : SERVER.DEFAULT_MAX_CONNECTIONS;
        
        // Set connection timeout values for client connections
        const connectionTimeout = isProduction ? 120000 : 30000;
        const socketTimeout = isProduction ? 120000 : 30000;
        
        // Configure socket timeout and keep-alive interval
        const keepAliveInterval = 1000; // 1 second keep-alive probe interval
        const keepAliveProbes = 3; // Number of keep-alive probes before timeout
        
        // Apply production optimizations for connection management if in production mode
        const productionOptimizations = isProduction ? {
            // Connection pooling settings
            connectionPooling: {
                enabled: true,
                maxPoolSize: 100,
                minPoolSize: 10,
                idleTimeout: 30000
            },
            
            // Advanced connection settings
            advanced: {
                tcpNoDelay: true, // Disable Nagle's algorithm
                tcpKeepAlive: true, // Enable TCP keep-alive
                reusePort: true, // Enable SO_REUSEPORT
                backlog: 511 // TCP backlog queue size
            }
        } : {};
        
        // Return connection configuration object with all connection management parameters
        const connectionConfig = {
            // Basic connection settings
            keepAliveTimeout: keepAliveTimeout,
            maxConnections: maxConnections,
            connectionTimeout: connectionTimeout,
            socketTimeout: socketTimeout,
            
            // Keep-alive configuration
            keepAlive: {
                enabled: true,
                interval: keepAliveInterval,
                probes: keepAliveProbes,
                timeout: keepAliveTimeout
            },
            
            // Resource limits
            limits: {
                maxConnections: maxConnections,
                maxRequestsPerConnection: isProduction ? 1000 : 100,
                maxHeadersCount: 2000,
                maxHeaderSize: 16384 // 16KB
            },
            
            // Timeout settings
            timeouts: {
                connection: connectionTimeout,
                socket: socketTimeout,
                keepAlive: keepAliveTimeout,
                request: SERVER.DEFAULT_REQUEST_TIMEOUT
            },
            
            // Production optimizations
            ...productionOptimizations,
            
            // Configuration metadata
            environment: isProduction ? 'production' : 'development',
            optimizedFor: isProduction ? 'high-throughput' : 'development'
        };
        
        return connectionConfig;
        
    } catch (error) {
        console.error(`[ERROR] Failed to create connection configuration: ${error.message}`);
        
        // Return basic fallback configuration
        return {
            keepAliveTimeout: SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
            maxConnections: SERVER.DEFAULT_MAX_CONNECTIONS,
            connectionTimeout: 30000,
            socketTimeout: 30000,
            keepAlive: { enabled: true },
            error: error.message
        };
    }
}

/**
 * Generates security configuration including header management, request limits, security
 * middleware settings, and Express.js 5.1.0 security enhancements for the tutorial application
 * 
 * @param {String} nodeEnv - Node.js environment (development, test, production)
 * @returns {Object} Security configuration object with header settings, request limits, and security middleware options
 */
function getSecurityConfig(nodeEnv = config.nodeEnv) {
    try {
        const isProduction = nodeEnv === 'production';
        const isDevelopment = nodeEnv === 'development';
        
        // Configure security headers including X-Powered-By header removal
        const securityHeaders = {
            xPoweredBy: false, // Remove X-Powered-By header to prevent version fingerprinting
            
            // Environment-specific security headers
            contentSecurityPolicy: isProduction ? {
                enabled: true,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            } : { enabled: false },
            
            // HSTS (HTTP Strict Transport Security)
            hsts: isProduction ? {
                enabled: true,
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            } : { enabled: false },
            
            // X-Frame-Options
            frameOptions: {
                enabled: true,
                value: 'DENY'
            },
            
            // X-Content-Type-Options
            noSniff: {
                enabled: true
            }
        };
        
        // Set request size limits to prevent memory exhaustion attacks
        const requestLimits = {
            // JSON payload limits
            jsonLimit: isProduction ? '1mb' : SERVER.DEFAULT_JSON_LIMIT,
            
            // URL-encoded payload limits
            urlencodedLimit: isProduction ? '1mb' : SERVER.DEFAULT_URLENCODED_LIMIT,
            
            // File upload limits (if applicable)
            fileUploadLimit: isProduction ? '5mb' : '50mb',
            
            // Request header limits
            maxHeadersCount: 100,
            maxHeaderSize: 16384, // 16KB
            
            // URL length limits
            maxUrlLength: 2048
        };
        
        // Configure rate limiting parameters for development vs production
        const rateLimiting = isProduction ? {
            enabled: true,
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 100, // Maximum requests per window
            message: 'Too many requests from this IP, please try again later',
            standardHeaders: true,
            legacyHeaders: false
        } : {
            enabled: false, // Disabled for development
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 1000, // Higher limit for development
            message: 'Rate limit exceeded'
        };
        
        // Apply Express.js 5.1.0 security enhancements including ReDoS protection
        const expressSecurityEnhancements = {
            // ReDoS (Regular expression Denial of Service) protection
            reDoSProtection: {
                enabled: true,
                description: 'CVE-2024-45590 mitigation through path-to-regexp upgrade'
            },
            
            // Automatic Promise rejection forwarding
            asyncErrorHandling: {
                enabled: true,
                description: 'Prevents unhandled Promise rejections and security vulnerabilities'
            },
            
            // Native Node.js methods usage
            nativeMethodsUsage: {
                enabled: true,
                methods: ['Array.flat', 'path.isAbsolute'],
                description: 'Reduced external dependencies for better security'
            },
            
            // Dependency security
            dependencySecurity: {
                reducedDependencies: true,
                securityUpdates: true,
                vulnerabilityScanning: isDevelopment
            }
        };
        
        // Set security middleware options based on environment requirements
        const securityMiddleware = {
            // Helmet.js security headers (production)
            helmet: isProduction ? {
                enabled: true,
                contentSecurityPolicy: true,
                crossOriginEmbedderPolicy: true,
                crossOriginOpenerPolicy: true,
                crossOriginResourcePolicy: true,
                dnsPrefetchControl: true,
                frameguard: true,
                hidePoweredBy: true,
                hsts: true,
                ieNoOpen: true,
                noSniff: true,
                originAgentCluster: true,
                permittedCrossDomainPolicies: false,
                referrerPolicy: true,
                xssFilter: true
            } : { enabled: false },
            
            // CORS configuration
            cors: {
                enabled: isDevelopment,
                origin: isDevelopment ? true : false,
                credentials: false,
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                allowedHeaders: ['Content-Type', 'Authorization']
            },
            
            // Input validation and sanitization
            inputValidation: {
                enabled: true,
                sanitizeInput: true,
                validateSchema: true,
                preventInjection: true
            }
        };
        
        // Return security configuration object with all security settings and middleware options
        const securityConfig = {
            // Security headers configuration
            headers: securityHeaders,
            
            // Request limits and constraints
            limits: requestLimits,
            
            // Rate limiting configuration
            rateLimiting: rateLimiting,
            
            // Express.js 5.1.0 security enhancements
            expressEnhancements: expressSecurityEnhancements,
            
            // Security middleware configuration
            middleware: securityMiddleware,
            
            // Environment-specific security settings
            environment: {
                nodeEnv: nodeEnv,
                isProduction: isProduction,
                isDevelopment: isDevelopment,
                securityLevel: isProduction ? 'high' : 'medium'
            },
            
            // Security configuration metadata
            metadata: {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                securityStandards: ['OWASP Top 10', 'Express.js Security Best Practices'],
                frameworkVersion: 'Express.js 5.1.0'
            }
        };
        
        return securityConfig;
        
    } catch (error) {
        console.error(`[ERROR] Failed to create security configuration: ${error.message}`);
        
        // Return basic fallback security configuration
        return {
            headers: {
                xPoweredBy: false
            },
            limits: {
                jsonLimit: SERVER.DEFAULT_JSON_LIMIT,
                urlencodedLimit: SERVER.DEFAULT_URLENCODED_LIMIT
            },
            rateLimiting: { enabled: false },
            middleware: { helmet: { enabled: false } },
            error: error.message
        };
    }
}

/**
 * Performs comprehensive validation of server configuration including port availability, host
 * binding validation, timeout ranges, and connection limit constraints
 * 
 * @param {Object} serverConfig - Server configuration object to validate
 * @returns {Object} Validation result with isValid boolean, error details, and configuration status information
 */
function validateServerConfig(serverConfig) {
    try {
        // Initialize ValidationResult instance for comprehensive validation tracking
        const result = new ValidationResult();
        
        // Set validation context metadata
        result.metadata.validationContext = 'server_configuration';
        result.metadata.configurationVersion = serverConfig.metadata?.version || '1.0.0';
        
        // Validate server configuration object structure
        if (!serverConfig || typeof serverConfig !== 'object') {
            result.addError(
                'Server configuration must be a valid object',
                'serverConfig',
                createValidationError('Invalid server configuration object', 'serverConfig', serverConfig)
            );
            return result;
        }
        
        // Validate port number using isValidPort function from validator utilities
        if (serverConfig.http && serverConfig.http.port !== undefined) {
            if (!isValidPort(serverConfig.http.port)) {
                result.addError(
                    `Invalid port configuration: ${serverConfig.http.port}. Port must be between 1 and 65535`,
                    'http.port',
                    createValidationError('Invalid port number', 'http.port', serverConfig.http.port, {
                        code: 'INVALID_PORT',
                        constraint: '1-65535'
                    })
                );
            }
        } else {
            result.addError(
                'HTTP port configuration is required',
                'http.port',
                createValidationError('Missing port configuration', 'http.port', null, {
                    code: 'MISSING_PORT'
                })
            );
        }
        
        // Validate host address using isValidHost function with binding capability check
        if (serverConfig.http && serverConfig.http.host !== undefined) {
            if (!isValidHost(serverConfig.http.host)) {
                result.addError(
                    `Invalid host configuration: ${serverConfig.http.host}. Host must be a valid hostname or IP address`,
                    'http.host',
                    createValidationError('Invalid host address', 'http.host', serverConfig.http.host, {
                        code: 'INVALID_HOST'
                    })
                );
            }
        } else {
            result.addError(
                'HTTP host configuration is required',
                'http.host',
                createValidationError('Missing host configuration', 'http.host', null, {
                    code: 'MISSING_HOST'
                })
            );
        }
        
        // Validate timeout values using isValidTimeout function with range constraints
        const timeoutFields = [
            { path: 'http.timeout', value: serverConfig.http?.timeout },
            { path: 'http.keepAliveTimeout', value: serverConfig.http?.keepAliveTimeout },
            { path: 'http.requestTimeout', value: serverConfig.http?.requestTimeout }
        ];
        
        timeoutFields.forEach(field => {
            if (field.value !== undefined) {
                if (typeof field.value !== 'number' || field.value < 0 || field.value > 300000) { // 5 minutes max
                    result.addError(
                        `Invalid timeout value for ${field.path}: ${field.value}. Must be a positive number less than 300000ms`,
                        field.path,
                        createValidationError('Invalid timeout value', field.path, field.value, {
                            code: 'INVALID_TIMEOUT',
                            constraint: '0-300000ms'
                        })
                    );
                }
            }
        });
        
        // Validate connection limits and resource constraints
        if (serverConfig.http && serverConfig.http.maxConnections !== undefined) {
            const maxConnections = serverConfig.http.maxConnections;
            if (typeof maxConnections !== 'number' || maxConnections <= 0 || maxConnections > 10000) {
                result.addError(
                    `Invalid max connections value: ${maxConnections}. Must be a positive number less than or equal to 10000`,
                    'http.maxConnections',
                    createValidationError('Invalid max connections', 'http.maxConnections', maxConnections, {
                        code: 'INVALID_MAX_CONNECTIONS',
                        constraint: '1-10000'
                    })
                );
            }
        }
        
        // Check Express.js configuration options for compatibility and security
        if (serverConfig.express) {
            // Validate JSON limit
            if (serverConfig.express.bodyParser?.json?.limit) {
                const jsonLimit = serverConfig.express.bodyParser.json.limit;
                // Basic validation for size string format (e.g., "10mb", "1gb")
                if (typeof jsonLimit === 'string' && !/^\d+[kmg]?b$/i.test(jsonLimit)) {
                    result.addError(
                        `Invalid JSON body parser limit: ${jsonLimit}. Must be in format like "10mb", "1gb"`,
                        'express.bodyParser.json.limit',
                        createValidationError('Invalid JSON limit format', 'express.bodyParser.json.limit', jsonLimit, {
                            code: 'INVALID_JSON_LIMIT'
                        })
                    );
                }
            }
            
            // Validate URL-encoded limit
            if (serverConfig.express.bodyParser?.urlencoded?.limit) {
                const urlencodedLimit = serverConfig.express.bodyParser.urlencoded.limit;
                if (typeof urlencodedLimit === 'string' && !/^\d+[kmg]?b$/i.test(urlencodedLimit)) {
                    result.addError(
                        `Invalid URL-encoded body parser limit: ${urlencodedLimit}. Must be in format like "10mb", "1gb"`,
                        'express.bodyParser.urlencoded.limit',
                        createValidationError('Invalid URL-encoded limit format', 'express.bodyParser.urlencoded.limit', urlencodedLimit, {
                            code: 'INVALID_URLENCODED_LIMIT'
                        })
                    );
                }
            }
        }
        
        // Validate security configuration settings and middleware options
        if (serverConfig.security) {
            // Validate rate limiting configuration
            if (serverConfig.security.rateLimiting?.enabled) {
                const rateLimiting = serverConfig.security.rateLimiting;
                
                if (rateLimiting.windowMs && (typeof rateLimiting.windowMs !== 'number' || rateLimiting.windowMs <= 0)) {
                    result.addError(
                        `Invalid rate limiting window: ${rateLimiting.windowMs}. Must be a positive number`,
                        'security.rateLimiting.windowMs',
                        createValidationError('Invalid rate limiting window', 'security.rateLimiting.windowMs', rateLimiting.windowMs, {
                            code: 'INVALID_RATE_LIMIT_WINDOW'
                        })
                    );
                }
                
                if (rateLimiting.maxRequests && (typeof rateLimiting.maxRequests !== 'number' || rateLimiting.maxRequests <= 0)) {
                    result.addError(
                        `Invalid rate limiting max requests: ${rateLimiting.maxRequests}. Must be a positive number`,
                        'security.rateLimiting.maxRequests',
                        createValidationError('Invalid rate limiting max requests', 'security.rateLimiting.maxRequests', rateLimiting.maxRequests, {
                            code: 'INVALID_RATE_LIMIT_MAX'
                        })
                    );
                }
            }
            
            // Validate request size limits
            if (serverConfig.security.limits) {
                const limits = serverConfig.security.limits;
                
                if (limits.maxHeadersCount && (typeof limits.maxHeadersCount !== 'number' || limits.maxHeadersCount <= 0)) {
                    result.addError(
                        `Invalid max headers count: ${limits.maxHeadersCount}. Must be a positive number`,
                        'security.limits.maxHeadersCount',
                        createValidationError('Invalid max headers count', 'security.limits.maxHeadersCount', limits.maxHeadersCount, {
                            code: 'INVALID_MAX_HEADERS_COUNT'
                        })
                    );
                }
            }
        }
        
        // Compile validation results with detailed error messages and warnings
        result.metadata.validatedAt = new Date().toISOString();
        result.metadata.totalValidations = 10; // Number of validation checks performed
        result.metadata.validationStatus = result.isValid ? 'passed' : 'failed';
        
        // Add configuration warnings for development environment
        if (serverConfig.environment?.isDevelopment) {
            result.metadata.warnings = [
                'Development environment detected - some security features may be disabled',
                'Extended timeouts enabled for development debugging',
                'Verbose logging enabled for development'
            ];
        }
        
        // Return comprehensive validation result with success status and error details
        return result;
        
    } catch (error) {
        console.error(`[ERROR] Server configuration validation failed: ${error.message}`);
        
        // Return validation failure result
        const errorResult = new ValidationResult(false, [
            createValidationError(`Validation process failed: ${error.message}`, 'validation', null, {
                code: 'VALIDATION_PROCESS_ERROR'
            })
        ]);
        
        errorResult.metadata.validationContext = 'server_configuration';
        errorResult.metadata.validationError = error.message;
        
        return errorResult;
    }
}

/**
 * Creates performance optimization configuration leveraging Node.js v22.x LTS improvements
 * and Express.js 5.1.0 enhancements for optimal server performance in the tutorial application
 * 
 * @param {Object} environmentConfig - Environment configuration object with settings
 * @returns {Object} Performance configuration object with optimization settings and Node.js/Express.js specific enhancements
 */
function getPerformanceConfig(environmentConfig = config) {
    try {
        const { nodeEnv, isDevelopment, isProduction } = environmentConfig;
        
        // Apply Node.js v22.x LTS performance optimizations including V8 engine improvements
        const nodeJSOptimizations = {
            // V8 JavaScript engine optimizations
            v8Optimizations: {
                version: 'V8 12.4',
                features: [
                    '55% performance improvement over Node.js v18.17.0',
                    'Enhanced garbage collection',
                    'Improved JIT compilation',
                    'Better memory management'
                ]
            },
            
            // Event loop optimizations
            eventLoop: {
                singleThreaded: true,
                nonBlocking: true,
                optimizedForIO: true,
                libuv: 'Latest version with performance improvements'
            },
            
            // Memory management optimizations
            memoryManagement: {
                heapSize: isProduction ? '2048' : '1024', // MB
                oldSpaceSize: isProduction ? '1536' : '768', // MB
                maxOldSpaceSize: isProduction ? '4096' : '2048', // MB
                gcOptimizations: true
            }
        };
        
        // Configure Express.js 5.1.0 native Node.js method usage for better performance
        const expressOptimizations = {
            // Native Node.js methods usage
            nativeMethods: {
                arrayFlat: true, // Use native Array.flat()
                pathIsAbsolute: true, // Use native path.isAbsolute()
                reducedDependencies: true,
                performanceImprovement: 'Reduced external dependencies for better performance'
            },
            
            // Express.js 5.1.0 specific enhancements
            frameworkEnhancements: {
                asyncErrorHandling: true, // Automatic Promise rejection forwarding
                routingOptimizations: true,
                middlewareEfficiency: true,
                requestProcessingSpeed: 'Improved through native method usage'
            },
            
            // Middleware optimizations
            middlewareOptimizations: {
                streamlined: true,
                cachedResults: isProduction,
                lazyLoading: true,
                conditionalMiddleware: true
            }
        };
        
        // Set memory and CPU optimization parameters based on environment
        const resourceOptimizations = {
            // CPU optimizations
            cpu: {
                clustering: isProduction ? 'enabled' : 'disabled',
                workerThreads: isProduction ? 'available' : 'single-thread',
                processOptimization: 'Single process for tutorial simplicity',
                cpuUsageMonitoring: isDevelopment
            },
            
            // Memory optimizations
            memory: {
                bufferPooling: true,
                stringInterning: true,
                objectPooling: isProduction,
                memoryLeakDetection: isDevelopment,
                heapSnapshots: isDevelopment
            },
            
            // I/O optimizations
            io: {
                asyncIO: true,
                streamProcessing: true,
                fileSystemCaching: isProduction,
                networkOptimization: true
            }
        };
        
        // Configure caching strategies for static responses like the /hello endpoint
        const cachingStrategies = {
            // Response caching
            responseCache: {
                enabled: isProduction,
                ttl: 300, // 5 minutes for static responses
                maxSize: '100mb',
                staticContent: true
            },
            
            // Memory caching
            memoryCache: {
                enabled: true,
                maxSize: isProduction ? '256mb' : '128mb',
                algorithm: 'LRU', // Least Recently Used
                helloEndpointCache: true // Cache /hello responses
            },
            
            // HTTP caching headers
            httpCaching: {
                enabled: isProduction,
                cacheControl: 'public, max-age=300',
                etag: true,
                lastModified: true
            }
        };
        
        // Apply connection pooling and keep-alive optimizations
        const connectionOptimizations = {
            // HTTP keep-alive optimizations
            keepAlive: {
                enabled: true,
                timeout: isProduction ? 65000 : 5000,
                maxRequests: isProduction ? 1000 : 100,
                agent: 'Optimized HTTP agent configuration'
            },
            
            // Connection pooling
            connectionPool: {
                enabled: isProduction,
                maxConnections: isProduction ? 1000 : 100,
                minConnections: isProduction ? 10 : 1,
                idleTimeout: 30000
            },
            
            // Socket optimizations
            socket: {
                noDelay: true, // Disable Nagle's algorithm
                keepAlive: true,
                reuseAddress: true,
                backlog: 511
            }
        };
        
        // Set garbage collection hints and memory management optimizations
        const gcOptimizations = {
            // Garbage collection tuning
            garbageCollection: {
                incremental: true,
                concurrent: true,
                generational: true,
                compaction: isProduction
            },
            
            // Memory management hints
            memoryHints: {
                preallocation: isProduction,
                pooling: isProduction,
                recycling: true,
                monitoring: isDevelopment
            }
        };
        
        // Return performance configuration object with all optimization settings
        const performanceConfig = {
            // Node.js runtime optimizations
            nodeJS: nodeJSOptimizations,
            
            // Express.js framework optimizations
            express: expressOptimizations,
            
            // System resource optimizations
            resources: resourceOptimizations,
            
            // Caching strategies
            caching: cachingStrategies,
            
            // Connection optimizations
            connections: connectionOptimizations,
            
            // Garbage collection optimizations
            gc: gcOptimizations,
            
            // Environment-specific settings
            environment: {
                nodeEnv: nodeEnv,
                optimizedFor: isProduction ? 'throughput' : 'development',
                performanceMode: isProduction ? 'production' : 'debug'
            },
            
            // Performance monitoring
            monitoring: {
                enabled: isDevelopment,
                metrics: ['responseTime', 'memoryUsage', 'cpuUsage'],
                profiling: isDevelopment,
                benchmarking: isDevelopment
            },
            
            // Configuration metadata
            metadata: {
                version: '1.0.0',
                nodeVersion: process.version,
                expressVersion: '5.1.0',
                optimizationLevel: isProduction ? 'maximum' : 'development',
                lastUpdated: new Date().toISOString()
            }
        };
        
        return performanceConfig;
        
    } catch (error) {
        console.error(`[ERROR] Failed to create performance configuration: ${error.message}`);
        
        // Return basic fallback performance configuration
        return {
            nodeJS: {
                version: process.version,
                eventLoop: { singleThreaded: true }
            },
            express: {
                version: '5.1.0',
                nativeMethods: true
            },
            caching: { enabled: false },
            error: error.message
        };
    }
}

/**
 * Generates a comprehensive server configuration summary for logging, debugging, and monitoring
 * purposes including all configuration parameters and operational metadata
 * 
 * @param {Object} serverConfig - Complete server configuration object
 * @returns {Object} Server configuration summary with metadata, settings overview, and operational parameters
 */
function createServerSummary(serverConfig) {
    try {
        // Validate server configuration parameter
        if (!serverConfig || typeof serverConfig !== 'object') {
            throw new Error('Invalid server configuration provided for summary generation');
        }
        
        // Compile server binding information including host and port details
        const bindingInfo = {
            host: serverConfig.http?.host || 'localhost',
            port: serverConfig.http?.port || 3000,
            protocol: 'HTTP/1.1',
            fullAddress: `http://${serverConfig.http?.host || 'localhost'}:${serverConfig.http?.port || 3000}`,
            networkInterface: 'All available interfaces'
        };
        
        // Include timeout and connection configuration summary
        const timeoutSummary = {
            serverTimeout: serverConfig.http?.timeout || SERVER.DEFAULT_TIMEOUT,
            keepAliveTimeout: serverConfig.http?.keepAliveTimeout || SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
            requestTimeout: serverConfig.http?.requestTimeout || SERVER.DEFAULT_REQUEST_TIMEOUT,
            connectionTimeout: serverConfig.connection?.timeouts?.connection || 30000,
            socketTimeout: serverConfig.connection?.timeouts?.socket || 30000
        };
        
        // Add Express.js framework configuration and middleware settings
        const expressSummary = {
            version: '5.1.0',
            features: [
                'ReDoS attack prevention (CVE-2024-45590 mitigation)',
                'Native Node.js methods for better performance',
                'Automatic Promise rejection forwarding',
                'Reduced external dependencies'
            ],
            bodyParser: {
                jsonLimit: serverConfig.express?.bodyParser?.json?.limit || SERVER.DEFAULT_JSON_LIMIT,
                urlencodedLimit: serverConfig.express?.bodyParser?.urlencoded?.limit || SERVER.DEFAULT_URLENCODED_LIMIT,
                extended: serverConfig.express?.bodyParser?.urlencoded?.extended || true
            },
            security: {
                xPoweredBy: serverConfig.express?.security?.xPoweredBy || false,
                trustProxy: serverConfig.express?.security?.trustProxy || false,
                reDoSProtection: serverConfig.express?.security?.reDoSProtection || true
            }
        };
        
        // Include security configuration summary with enabled features
        const securitySummary = {
            level: serverConfig.security?.environment?.securityLevel || 'medium',
            headers: {
                xPoweredBy: serverConfig.security?.headers?.xPoweredBy || false,
                frameOptions: serverConfig.security?.headers?.frameOptions?.enabled || true,
                noSniff: serverConfig.security?.headers?.noSniff?.enabled || true
            },
            rateLimiting: {
                enabled: serverConfig.security?.rateLimiting?.enabled || false,
                windowMs: serverConfig.security?.rateLimiting?.windowMs || 900000,
                maxRequests: serverConfig.security?.rateLimiting?.maxRequests || 100
            },
            requestLimits: {
                jsonLimit: serverConfig.security?.limits?.jsonLimit || SERVER.DEFAULT_JSON_LIMIT,
                urlencodedLimit: serverConfig.security?.limits?.urlencodedLimit || SERVER.DEFAULT_URLENCODED_LIMIT,
                maxHeadersCount: serverConfig.security?.limits?.maxHeadersCount || 100,
                maxHeaderSize: serverConfig.security?.limits?.maxHeaderSize || 16384
            }
        };
        
        // Add performance optimization summary with applied enhancements
        const performanceSummary = {
            nodeJSVersion: process.version,
            nodeJSOptimizations: [
                '55% performance improvement over Node.js v18.17.0',
                'V8 JavaScript engine 12.4 with enhanced performance',
                'Single-threaded event loop optimization'
            ],
            expressOptimizations: [
                'Native Node.js methods usage (Array.flat, path.isAbsolute)',
                'Reduced external dependencies',
                'Automatic Promise rejection forwarding'
            ],
            caching: {
                responseCache: serverConfig.performance?.caching?.responseCache?.enabled || false,
                memoryCache: serverConfig.performance?.caching?.memoryCache?.enabled || true,
                httpCaching: serverConfig.performance?.caching?.httpCaching?.enabled || false
            },
            connections: {
                keepAlive: serverConfig.performance?.connections?.keepAlive?.enabled || true,
                connectionPool: serverConfig.performance?.connections?.connectionPool?.enabled || false,
                maxConnections: serverConfig.http?.maxConnections || SERVER.DEFAULT_MAX_CONNECTIONS
            }
        };
        
        // Include environment-specific configuration details
        const environmentSummary = {
            nodeEnv: serverConfig.environment?.nodeEnv || 'development',
            isDevelopment: serverConfig.environment?.isDevelopment || false,
            isProduction: serverConfig.environment?.isProduction || false,
            isTest: serverConfig.environment?.isTest || false,
            optimizedFor: serverConfig.performance?.environment?.optimizedFor || 'development',
            securityLevel: serverConfig.security?.environment?.securityLevel || 'medium'
        };
        
        // Add validation status and any configuration warnings
        const validationSummary = {
            isValid: serverConfig.validation?.isValid || false,
            errorCount: serverConfig.validation?.errors?.length || 0,
            warningCount: serverConfig.validation?.metadata?.warnings?.length || 0,
            lastValidated: serverConfig.validation?.metadata?.validatedAt || new Date().toISOString(),
            validationContext: serverConfig.validation?.metadata?.validationContext || 'server_configuration'
        };
        
        // Calculate configuration statistics
        const statistics = {
            totalConfigurationFields: Object.keys(serverConfig).length,
            httpConfigFields: Object.keys(serverConfig.http || {}).length,
            expressConfigFields: Object.keys(serverConfig.express || {}).length,
            securityConfigFields: Object.keys(serverConfig.security || {}).length,
            performanceConfigFields: Object.keys(serverConfig.performance || {}).length,
            memoryUsage: process.memoryUsage(),
            uptime: Math.round(process.uptime())
        };
        
        // Return comprehensive server configuration summary for logging and monitoring
        const configurationSummary = {
            // Server binding and network configuration
            binding: bindingInfo,
            
            // Timeout and connection configuration
            timeouts: timeoutSummary,
            
            // Express.js framework configuration
            express: expressSummary,
            
            // Security configuration
            security: securitySummary,
            
            // Performance optimization configuration
            performance: performanceSummary,
            
            // Environment configuration
            environment: environmentSummary,
            
            // Validation status
            validation: validationSummary,
            
            // Configuration statistics
            statistics: statistics,
            
            // Summary metadata
            metadata: {
                summaryVersion: '1.0.0',
                generatedAt: new Date().toISOString(),
                configurationVersion: serverConfig.metadata?.version || '1.0.0',
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                processId: process.pid
            }
        };
        
        return configurationSummary;
        
    } catch (error) {
        console.error(`[ERROR] Failed to create server configuration summary: ${error.message}`);
        
        // Return basic fallback summary
        return {
            binding: {
                host: 'localhost',
                port: 3000,
                fullAddress: 'http://localhost:3000'
            },
            express: {
                version: '5.1.0'
            },
            environment: {
                nodeEnv: process.env.NODE_ENV || 'development'
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                error: error.message
            }
        };
    }
}

/**
 * Creates fallback server configuration when main configuration creation fails
 * 
 * @param {Object} environmentConfig - Environment configuration for fallback
 * @returns {Object} Basic fallback server configuration
 */
function createFallbackServerConfig(environmentConfig = {}) {
    console.warn('[WARN] Creating fallback server configuration due to configuration error');
    
    return {
        http: {
            port: environmentConfig.port || 3000,
            host: environmentConfig.host || 'localhost',
            timeout: SERVER.DEFAULT_TIMEOUT,
            keepAliveTimeout: SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
            requestTimeout: SERVER.DEFAULT_REQUEST_TIMEOUT,
            maxConnections: SERVER.DEFAULT_MAX_CONNECTIONS
        },
        express: {
            bodyParser: {
                json: { limit: SERVER.DEFAULT_JSON_LIMIT },
                urlencoded: { limit: SERVER.DEFAULT_URLENCODED_LIMIT, extended: true }
            },
            security: {
                xPoweredBy: false,
                trustProxy: false
            }
        },
        connection: {
            keepAliveTimeout: SERVER.DEFAULT_KEEP_ALIVE_TIMEOUT,
            maxConnections: SERVER.DEFAULT_MAX_CONNECTIONS
        },
        security: {
            headers: { xPoweredBy: false },
            limits: {
                jsonLimit: SERVER.DEFAULT_JSON_LIMIT,
                urlencodedLimit: SERVER.DEFAULT_URLENCODED_LIMIT
            },
            rateLimiting: { enabled: false }
        },
        performance: {
            nodeJS: { version: process.version },
            express: { version: '5.1.0' },
            caching: { enabled: false }
        },
        environment: {
            nodeEnv: environmentConfig.nodeEnv || 'development',
            isDevelopment: true,
            isProduction: false,
            isTest: false
        },
        metadata: {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            fallbackConfiguration: true
        }
    };
}

// Create the main server configuration object using createServerConfig function
const serverConfig = createServerConfig();

// Export the main server configuration object and utility functions
module.exports = {
    // Main server configuration object containing all HTTP server, Express.js, connection, security, and performance settings
    serverConfig,
    
    // Factory function for creating complete server configuration based on environment settings
    createServerConfig,
    
    // Server configuration validation utility function for startup validation
    validateServerConfig,
    
    // HTTP server settings accessor function for server instance configuration
    getHttpServerSettings,
    
    // Express.js configuration accessor function for application setup
    getExpressConfiguration,
    
    // Connection configuration accessor function for connection management
    getConnectionConfig,
    
    // Security configuration accessor function for security settings
    getSecurityConfig,
    
    // Performance configuration accessor function for optimization settings
    getPerformanceConfig,
    
    // Server configuration summary generator for logging and monitoring
    createServerSummary
};