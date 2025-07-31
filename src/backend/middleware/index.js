/**
 * Centralized Middleware Barrel Export Module for Node.js Tutorial Application
 * 
 * This middleware index serves as the comprehensive entry point for all Express.js middleware
 * components in the Node.js tutorial application. Provides centralized access to request logging,
 * error handling, response formatting, and 404 not found middleware with complete middleware
 * orchestration, configuration management, and validation utilities.
 * 
 * Implements Express.js 5.1.0 middleware patterns with educational demonstration of middleware
 * organization, modular architecture design patterns, and comprehensive middleware pipeline
 * configuration for Node.js v22.x LTS runtime optimization and development best practices.
 * 
 * Serves as the single source of truth for middleware imports throughout the application
 * while providing factory functions for middleware stack creation, configuration validation,
 * and environment-specific middleware setup suitable for educational environments.
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import request logging middleware functions for HTTP request/response logging and monitoring
const {
    requestLoggerMiddleware,
    createRequestLogger,
    requestLogger
} = require('./requestLogger.js');

// Import comprehensive error handling middleware for centralized error processing and response generation
const {
    errorHandler,
    createErrorHandler,
    classifyError,
    handleAsyncErrors,
    extractErrorDetails,
    generateErrorId,
    logErrorEvent,
    createErrorContext,
    getDefaultErrorHandlerConfig
} = require('./errorHandler.js');

// Import response formatting utilities for standardized HTTP response structure and metadata enrichment
const {
    formatSuccessResponse,
    formatErrorResponse,
    createResponseMetadata,
    sanitizeErrorMessage,
    extractRequestContext,
    addResponseHeaders,
    validateResponseData,
    createResponseFactory
} = require('./responseHandler.js');

// Import 404 not found handler middleware for comprehensive missing route handling
const {
    notFoundHandler,
    createNotFoundHandler,
    logNotFoundRequest,
    create404Error,
    getDefaultNotFoundConfig
} = require('./notFoundHandler.js');

// Import logger factory for middleware logging and debugging operations
const { getLogger } = require('../utils/logger.js');

// Import application constants for consistent configuration and status codes
const {
    HTTP_STATUS,
    ERROR_MESSAGES,
    APPLICATION,
    ENVIRONMENT,
    LOGGING
} = require('../utils/constants.js');

// Import environment detection utilities for environment-specific middleware configuration
const {
    isDevelopmentEnvironment,
    isTestEnvironment,
    isProductionEnvironment,
    getEnvironmentType
} = require('../utils/environment.js');

// Initialize component-specific logger for middleware orchestration and configuration management
const logger = getLogger('MiddlewareIndex');

// Module identification constants for consistent identification across logging and metadata
const MIDDLEWARE_MODULE = 'MiddlewareIndex';
const MODULE_VERSION = '1.0.0';

/**
 * Configures and returns a collection of middleware functions with default or custom options
 * for Express.js application integration, providing comprehensive middleware setup for the
 * tutorial application with request logging, error handling, response formatting, and 404 handling.
 * 
 * @param {Object} options - Configuration options for middleware setup
 * @param {Object} options.requestLogger - Request logger middleware configuration options
 * @param {Object} options.errorHandler - Error handler middleware configuration options
 * @param {Object} options.responseHandler - Response handler configuration options
 * @param {Object} options.notFoundHandler - Not found handler configuration options
 * @param {boolean} options.enableAllMiddleware - Whether to enable all middleware components
 * @param {string} options.environment - Target environment for configuration
 * @returns {Object} Configured middleware collection with request logging, error handling, response formatting, and 404 handling middleware
 */
function configureMiddleware(options = {}) {
    try {
        logger.info('Configuring middleware collection', {
            hasOptions: Object.keys(options).length > 0,
            environment: options.environment || getEnvironmentType(),
            enableAllMiddleware: options.enableAllMiddleware !== false
        });

        // Extract middleware configuration options or apply default middleware settings
        const middlewareConfig = {
            requestLogger: options.requestLogger || {},
            errorHandler: options.errorHandler || {},
            responseHandler: options.responseHandler || {},
            notFoundHandler: options.notFoundHandler || {},
            enableAllMiddleware: options.enableAllMiddleware !== false,
            environment: options.environment || getEnvironmentType(),
            ...options
        };

        // Configure request logger middleware with appropriate logging level and format options
        const requestLoggerConfig = {
            logLevel: isDevelopmentEnvironment() ? 'debug' : 'info',
            includeRequestDetails: true,
            includeResponseTime: true,
            colorOutput: isDevelopmentEnvironment(),
            filterSensitiveHeaders: !isDevelopmentEnvironment(),
            ...middlewareConfig.requestLogger
        };

        const configuredRequestLogger = middlewareConfig.enableAllMiddleware ? 
            createRequestLogger(requestLoggerConfig) : null;

        // Configure error handler middleware with error classification and response formatting options
        const errorHandlerConfig = {
            includeStackTrace: isDevelopmentEnvironment(),
            sanitizeErrors: isProductionEnvironment(),
            logErrors: true,
            includeErrorId: true,
            enableAsyncErrorHandling: true,
            customErrorMessages: middlewareConfig.errorHandler.customErrorMessages || {},
            ...middlewareConfig.errorHandler
        };

        const configuredErrorHandler = middlewareConfig.enableAllMiddleware ?
            createErrorHandler(errorHandlerConfig) : null;

        // Configure response handler utilities with environment-specific formatting and metadata options
        const responseHandlerConfig = {
            includeDebugInfo: isDevelopmentEnvironment(),
            includeMetadata: true,
            sanitizeErrorMessages: isProductionEnvironment(),
            addStandardHeaders: true,
            enableResponseValidation: isDevelopmentEnvironment() || isTestEnvironment(),
            ...middlewareConfig.responseHandler
        };

        const responseFactory = createResponseFactory({
            componentName: 'TutorialApplication',
            defaultMetadata: {
                application: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                apiVersion: APPLICATION.API_VERSION
            },
            includeDebugInfo: responseHandlerConfig.includeDebugInfo,
            customHeaders: {
                'X-Tutorial-App': APPLICATION.NAME,
                'X-Tutorial-Version': APPLICATION.VERSION
            }
        });

        // Configure not found handler middleware with 404 error handling and logging options
        const notFoundHandlerConfig = {
            includeDebugInfo: isDevelopmentEnvironment(),
            includeRequestDetails: true,
            logLevel: 'warn',
            customErrorMessage: ERROR_MESSAGES.ROUTE_NOT_FOUND,
            enableResponseHelpers: true,
            includeSuggestions: isDevelopmentEnvironment(),
            ...middlewareConfig.notFoundHandler
        };

        const configured404Handler = middlewareConfig.enableAllMiddleware ?
            createNotFoundHandler(notFoundHandlerConfig) : null;

        // Create middleware collection object with all configured middleware functions
        const middlewareCollection = {
            // Request logging middleware
            requestLogger: configuredRequestLogger || requestLoggerMiddleware,
            requestLoggerMiddleware: configuredRequestLogger || requestLoggerMiddleware,
            createRequestLogger: createRequestLogger,

            // Error handling middleware
            errorHandler: configuredErrorHandler || errorHandler,
            createErrorHandler: createErrorHandler,
            handleAsyncErrors: handleAsyncErrors,
            classifyError: classifyError,
            extractErrorDetails: extractErrorDetails,
            generateErrorId: generateErrorId,
            logErrorEvent: logErrorEvent,
            createErrorContext: createErrorContext,
            getDefaultErrorHandlerConfig: getDefaultErrorHandlerConfig,

            // Response formatting utilities
            responseFactory: responseFactory,
            formatSuccessResponse: formatSuccessResponse,
            formatErrorResponse: formatErrorResponse,
            createResponseMetadata: createResponseMetadata,
            sanitizeErrorMessage: sanitizeErrorMessage,
            extractRequestContext: extractRequestContext,
            addResponseHeaders: addResponseHeaders,
            validateResponseData: validateResponseData,
            createResponseFactory: createResponseFactory,

            // 404 not found handling middleware
            notFoundHandler: configured404Handler || notFoundHandler,
            createNotFoundHandler: createNotFoundHandler,
            logNotFoundRequest: logNotFoundRequest,
            create404Error: create404Error,
            getDefaultNotFoundConfig: getDefaultNotFoundConfig,

            // Configuration and metadata
            configuration: middlewareConfig,
            environment: middlewareConfig.environment,
            version: MODULE_VERSION,
            configuredAt: new Date().toISOString()
        };

        // Log successful middleware configuration for monitoring and debugging
        logger.info('Middleware collection configured successfully', {
            totalMiddleware: Object.keys(middlewareCollection).length,
            environment: middlewareConfig.environment,
            requestLoggerEnabled: Boolean(configuredRequestLogger),
            errorHandlerEnabled: Boolean(configuredErrorHandler),
            notFoundHandlerEnabled: Boolean(configured404Handler),
            responseFactoryEnabled: Boolean(responseFactory)
        });

        // Return comprehensive middleware collection ready for Express.js application integration
        return middlewareCollection;

    } catch (error) {
        // Handle middleware configuration errors gracefully with fallback configuration
        logger.error('Error configuring middleware collection', {
            error: error.message,
            stack: error.stack,
            options: options
        });

        // Return minimal middleware collection if configuration fails
        return {
            requestLogger: requestLoggerMiddleware,
            errorHandler: errorHandler,
            notFoundHandler: notFoundHandler,
            responseFactory: null,
            configuration: options,
            error: 'Configuration failed',
            fallbackMode: true
        };
    }
}

/**
 * Returns default middleware configuration object with environment-specific settings and
 * educational defaults for all middleware components in the tutorial application with
 * comprehensive configuration for logging, error handling, response formatting, and 404 handling.
 * 
 * @param {string} environment - Target environment override (development, test, production)
 * @returns {Object} Default middleware configuration with logging, error handling, response formatting, and 404 handling settings
 */
function getDefaultMiddlewareConfig(environment = null) {
    try {
        // Determine current environment using environment detection utilities
        const currentEnvironment = environment || getEnvironmentType();
        
        logger.debug('Creating default middleware configuration', {
            environment: currentEnvironment,
            isDevelopment: isDevelopmentEnvironment(),
            isTest: isTestEnvironment(),
            isProduction: isProductionEnvironment()
        });

        // Define default request logger configuration with appropriate logging levels and format settings
        const defaultRequestLoggerConfig = {
            logLevel: currentEnvironment === ENVIRONMENT.DEVELOPMENT ? 'debug' : 'info',
            includeRequestDetails: true,
            includeResponseTime: true,
            includeHeaders: currentEnvironment !== ENVIRONMENT.PRODUCTION,
            colorOutput: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
            filterSensitiveHeaders: currentEnvironment === ENVIRONMENT.PRODUCTION,
            formatOptions: {
                timestamp: true,
                method: true,
                url: true,
                statusCode: true,
                responseTime: true,
                userAgent: currentEnvironment !== ENVIRONMENT.PRODUCTION
            }
        };

        // Define default error handler configuration with error classification and response formatting options
        const defaultErrorHandlerConfig = {
            includeStackTrace: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
            sanitizeErrors: currentEnvironment === ENVIRONMENT.PRODUCTION,
            logErrors: true,
            logLevel: 'error',
            includeErrorId: true,
            enableAsyncErrorHandling: true,
            includeRequestContext: true,
            customErrorMessages: {
                [HTTP_STATUS.INTERNAL_SERVER_ERROR]: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                [HTTP_STATUS.NOT_FOUND]: ERROR_MESSAGES.ROUTE_NOT_FOUND,
                [HTTP_STATUS.METHOD_NOT_ALLOWED]: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
                [HTTP_STATUS.BAD_REQUEST]: ERROR_MESSAGES.BAD_REQUEST
            },
            errorClassification: {
                enableClassification: true,
                includeErrorType: true,
                includeSeverity: true,
                includeCategory: true
            }
        };

        // Define default response handler configuration with metadata enrichment and formatting options
        const defaultResponseHandlerConfig = {
            includeDebugInfo: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
            includeMetadata: true,
            sanitizeErrorMessages: currentEnvironment === ENVIRONMENT.PRODUCTION,
            addStandardHeaders: true,
            enableResponseValidation: currentEnvironment !== ENVIRONMENT.PRODUCTION,
            defaultMetadata: {
                application: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                apiVersion: APPLICATION.API_VERSION,
                environment: currentEnvironment
            },
            headerOptions: {
                includeCorrelationId: true,
                includeTimestamp: true,
                includeApiVersion: true,
                includeApplicationName: true,
                removeXPoweredBy: true
            },
            validationOptions: {
                validateResponseStructure: currentEnvironment !== ENVIRONMENT.PRODUCTION,
                validateDataTypes: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
                includeValidationMetadata: currentEnvironment === ENVIRONMENT.DEVELOPMENT
            }
        };

        // Define default not found handler configuration with 404 error handling and logging settings
        const defaultNotFoundHandlerConfig = {
            includeDebugInfo: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
            includeRequestDetails: true,
            logLevel: 'warn',
            customErrorMessage: ERROR_MESSAGES.ROUTE_NOT_FOUND,
            enableResponseHelpers: true,
            includeSuggestions: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
            includeAvailableRoutes: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
            educational: {
                provideExplanation: true,
                includeCommonCauses: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
                includeTroubleshootingTips: currentEnvironment === ENVIRONMENT.DEVELOPMENT
            }
        };

        // Apply environment-specific default settings based on current environment detection
        const environmentSpecificOptions = {
            development: {
                enableVerboseLogging: true,
                includePerformanceMetrics: true,
                enableDebugHeaders: true,
                logAllRequests: true
            },
            test: {
                enableVerboseLogging: false,
                includePerformanceMetrics: true,
                enableDebugHeaders: false,
                logAllRequests: false,
                suppressNonCriticalLogs: true
            },
            production: {
                enableVerboseLogging: false,
                includePerformanceMetrics: false,
                enableDebugHeaders: false,
                logAllRequests: false,
                optimizeForPerformance: true,
                sanitizeAllOutput: true
            }
        };

        const environmentOptions = environmentSpecificOptions[currentEnvironment] || environmentSpecificOptions.development;

        // Merge all middleware default configurations into comprehensive configuration object
        const completeDefaultConfig = {
            // Middleware component configurations
            requestLogger: defaultRequestLoggerConfig,
            errorHandler: defaultErrorHandlerConfig,
            responseHandler: defaultResponseHandlerConfig,
            notFoundHandler: defaultNotFoundHandlerConfig,

            // Global middleware settings
            enableAllMiddleware: true,
            environment: currentEnvironment,
            
            // Environment-specific options
            environmentOptions: environmentOptions,

            // Application metadata
            application: {
                name: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                apiVersion: APPLICATION.API_VERSION,
                description: APPLICATION.DESCRIPTION
            },

            // Configuration metadata
            metadata: {
                configVersion: MODULE_VERSION,
                createdAt: new Date().toISOString(),
                environment: currentEnvironment,
                configType: 'default'
            },

            // Performance and monitoring settings
            monitoring: {
                enableMetrics: currentEnvironment !== ENVIRONMENT.PRODUCTION,
                includeTimingData: true,
                trackMemoryUsage: currentEnvironment === ENVIRONMENT.DEVELOPMENT,
                enableHealthChecks: true
            }
        };

        // Log default configuration creation for debugging and monitoring
        logger.debug('Default middleware configuration created', {
            environment: currentEnvironment,
            configVersion: MODULE_VERSION,
            componentCount: Object.keys(completeDefaultConfig).length,
            enabledMiddleware: completeDefaultConfig.enableAllMiddleware
        });

        // Return complete default middleware configuration ready for application use
        return completeDefaultConfig;

    } catch (error) {
        // Handle configuration creation errors gracefully with minimal fallback configuration
        logger.error('Error creating default middleware configuration', {
            error: error.message,
            stack: error.stack,
            environment: environment
        });

        // Return minimal configuration if default creation fails
        return {
            requestLogger: { logLevel: 'info' },
            errorHandler: { includeStackTrace: false },
            responseHandler: { includeDebugInfo: false },
            notFoundHandler: { logLevel: 'warn' },
            enableAllMiddleware: true,
            environment: environment || 'development',
            error: 'Default configuration creation failed',
            fallbackMode: true
        };
    }
}

/**
 * Creates ordered Express.js middleware stack array with proper middleware ordering for
 * request processing pipeline including logging, response handling, error handling, and
 * 404 handling with comprehensive middleware orchestration and configuration management.
 * 
 * @param {Object} middlewareConfig - Configuration object for middleware stack creation
 * @param {Object} middlewareConfig.requestLogger - Request logger middleware configuration
 * @param {Object} middlewareConfig.errorHandler - Error handler middleware configuration
 * @param {Object} middlewareConfig.responseHandler - Response handler configuration
 * @param {Object} middlewareConfig.notFoundHandler - Not found handler configuration
 * @param {Array} middlewareConfig.customMiddleware - Additional custom middleware to include
 * @returns {Array} Ordered array of Express.js middleware functions ready for application.use() integration
 */
function createMiddlewareStack(middlewareConfig = {}) {
    try {
        logger.info('Creating Express.js middleware stack', {
            hasConfig: Object.keys(middlewareConfig).length > 0,
            environment: middlewareConfig.environment || getEnvironmentType()
        });

        // Initialize middleware stack array with proper ordering for Express.js pipeline
        const middlewareStack = [];

        // Create request logger middleware using provided configuration or defaults
        const requestLoggerConfig = middlewareConfig.requestLogger || {};
        const requestLoggerInstance = middlewareConfig.enableRequestLogger !== false ?
            createRequestLogger(requestLoggerConfig) : null;

        if (requestLoggerInstance) {
            middlewareStack.push({
                name: 'requestLogger',
                middleware: requestLoggerInstance,
                order: 1,
                description: 'HTTP request/response logging middleware'
            });
            logger.debug('Added request logger middleware to stack');
        }

        // Add response header middleware for consistent HTTP response headers
        if (middlewareConfig.enableResponseHeaders !== false) {
            const responseHeadersMiddleware = (req, res, next) => {
                // Add standard response headers using addResponseHeaders utility
                try {
                    addResponseHeaders(res, {
                        correlationId: req.correlationId || generateErrorId(),
                        customHeaders: middlewareConfig.responseHandler?.customHeaders || {}
                    });
                } catch (error) {
                    logger.warn('Error adding response headers', { error: error.message });
                }
                next();
            };

            middlewareStack.push({
                name: 'responseHeaders',
                middleware: responseHeadersMiddleware,
                order: 2,
                description: 'Standard HTTP response headers middleware'
            });
            logger.debug('Added response headers middleware to stack');
        }

        // Add any additional custom middleware from configuration options
        if (middlewareConfig.customMiddleware && Array.isArray(middlewareConfig.customMiddleware)) {
            middlewareConfig.customMiddleware.forEach((customMw, index) => {
                if (typeof customMw === 'function') {
                    middlewareStack.push({
                        name: `custom-${index}`,
                        middleware: customMw,
                        order: 10 + index,
                        description: `Custom middleware ${index + 1}`
                    });
                    logger.debug(`Added custom middleware ${index + 1} to stack`);
                } else if (customMw && typeof customMw.middleware === 'function') {
                    middlewareStack.push({
                        name: customMw.name || `custom-${index}`,
                        middleware: customMw.middleware,
                        order: customMw.order || (10 + index),
                        description: customMw.description || `Custom middleware ${index + 1}`
                    });
                    logger.debug(`Added named custom middleware ${customMw.name} to stack`);
                }
            });
        }

        // Add not found handler middleware for 404 error handling of unmatched routes
        const notFoundConfig = middlewareConfig.notFoundHandler || {};
        const notFoundInstance = middlewareConfig.enableNotFoundHandler !== false ?
            createNotFoundHandler(notFoundConfig) : notFoundHandler;

        middlewareStack.push({
            name: 'notFoundHandler',
            middleware: notFoundInstance,
            order: 900,
            description: '404 Not Found error handling middleware'
        });
        logger.debug('Added not found handler middleware to stack');

        // Add error handler middleware as final middleware for comprehensive error processing
        const errorHandlerConfig = middlewareConfig.errorHandler || {};
        const errorHandlerInstance = middlewareConfig.enableErrorHandler !== false ?
            createErrorHandler(errorHandlerConfig) : errorHandler;

        middlewareStack.push({
            name: 'errorHandler',
            middleware: errorHandlerInstance,
            order: 1000,
            description: 'Comprehensive error processing middleware'
        });
        logger.debug('Added error handler middleware to stack');

        // Sort middleware stack by order to ensure proper Express.js middleware execution sequence
        middlewareStack.sort((a, b) => a.order - b.order);

        // Extract middleware functions from stack objects for Express.js application.use()
        const orderedMiddlewareArray = middlewareStack.map(stackItem => stackItem.middleware);

        // Log middleware stack creation completion with stack details
        logger.info('Middleware stack created successfully', {
            totalMiddleware: middlewareStack.length,
            middlewareNames: middlewareStack.map(item => item.name),
            environment: middlewareConfig.environment || getEnvironmentType(),
            stackOrder: middlewareStack.map(item => ({ name: item.name, order: item.order }))
        });

        // Add metadata to the middleware array for debugging and introspection
        orderedMiddlewareArray.stackMetadata = {
            totalMiddleware: middlewareStack.length,
            createdAt: new Date().toISOString(),
            configuration: middlewareConfig,
            middlewareDetails: middlewareStack,
            version: MODULE_VERSION
        };

        // Return ordered middleware stack array with proper Express.js middleware execution order
        return orderedMiddlewareArray;

    } catch (error) {
        // Handle middleware stack creation errors gracefully with minimal fallback stack
        logger.error('Error creating middleware stack', {
            error: error.message,
            stack: error.stack,
            middlewareConfig: middlewareConfig
        });

        // Return minimal middleware stack if creation fails
        const fallbackStack = [
            requestLoggerMiddleware,
            notFoundHandler,
            errorHandler
        ];

        fallbackStack.stackMetadata = {
            totalMiddleware: fallbackStack.length,
            createdAt: new Date().toISOString(),
            error: 'Stack creation failed',
            fallbackMode: true
        };

        return fallbackStack;
    }
}

/**
 * Validates middleware configuration object to ensure proper middleware setup and prevent
 * runtime errors from misconfiguration, with comprehensive validation rules for all
 * middleware components including request logging, error handling, response formatting, and 404 handling.
 * 
 * @param {Object} config - Middleware configuration object to validate
 * @param {Object} validationOptions - Additional validation options and rules
 * @returns {Object} Validation result with isValid boolean, validated configuration, and validation error details
 */
function validateMiddlewareConfig(config, validationOptions = {}) {
    try {
        logger.debug('Validating middleware configuration', {
            hasConfig: Boolean(config),
            configKeys: config ? Object.keys(config) : [],
            hasValidationOptions: Object.keys(validationOptions).length > 0
        });

        // Initialize validation result object with success tracking and error collection
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            validatedConfig: null,
            validationSummary: {}
        };

        // Validate middleware configuration structure and required properties for all middleware types
        if (!config || typeof config !== 'object') {
            validationResult.errors.push('Configuration must be a valid object');
            validationResult.isValid = false;
            return validationResult;
        }

        // Create deep copy of configuration for validation and sanitization
        const sanitizedConfig = JSON.parse(JSON.stringify(config));

        // Validate request logger configuration including logging levels and format options
        if (config.requestLogger) {
            const requestLoggerValidation = validateRequestLoggerConfig(config.requestLogger);
            if (!requestLoggerValidation.isValid) {
                validationResult.errors.push(...requestLoggerValidation.errors.map(err => `RequestLogger: ${err}`));
                validationResult.isValid = false;
            } else {
                sanitizedConfig.requestLogger = requestLoggerValidation.sanitizedConfig;
            }
            validationResult.validationSummary.requestLogger = requestLoggerValidation;
        }

        // Validate error handler configuration including error classification and response options
        if (config.errorHandler) {
            const errorHandlerValidation = validateErrorHandlerConfig(config.errorHandler);
            if (!errorHandlerValidation.isValid) {
                validationResult.errors.push(...errorHandlerValidation.errors.map(err => `ErrorHandler: ${err}`));
                validationResult.isValid = false;
            } else {
                sanitizedConfig.errorHandler = errorHandlerValidation.sanitizedConfig;
            }
            validationResult.validationSummary.errorHandler = errorHandlerValidation;
        }

        // Validate response handler configuration including formatting and metadata options
        if (config.responseHandler) {
            const responseHandlerValidation = validateResponseHandlerConfig(config.responseHandler);
            if (!responseHandlerValidation.isValid) {
                validationResult.errors.push(...responseHandlerValidation.errors.map(err => `ResponseHandler: ${err}`));
                validationResult.isValid = false;
            } else {
                sanitizedConfig.responseHandler = responseHandlerValidation.sanitizedConfig;
            }
            validationResult.validationSummary.responseHandler = responseHandlerValidation;
        }

        // Validate not found handler configuration including 404 error handling settings
        if (config.notFoundHandler) {
            const notFoundHandlerValidation = validateNotFoundHandlerConfig(config.notFoundHandler);
            if (!notFoundHandlerValidation.isValid) {
                validationResult.errors.push(...notFoundHandlerValidation.errors.map(err => `NotFoundHandler: ${err}`));
                validationResult.isValid = false;
            } else {
                sanitizedConfig.notFoundHandler = notFoundHandlerValidation.sanitizedConfig;
            }
            validationResult.validationSummary.notFoundHandler = notFoundHandlerValidation;
        }

        // Check for configuration conflicts and incompatible option combinations
        const conflictValidation = validateConfigurationConflicts(sanitizedConfig);
        if (!conflictValidation.isValid) {
            validationResult.errors.push(...conflictValidation.errors);
            validationResult.warnings.push(...conflictValidation.warnings);
            validationResult.isValid = false;
        }

        // Validate environment-specific configuration requirements
        if (config.environment) {
            const environmentValidation = validateEnvironmentConfig(config.environment);
            if (!environmentValidation.isValid) {
                validationResult.errors.push(...environmentValidation.errors.map(err => `Environment: ${err}`));
                validationResult.isValid = false;
            }
        }

        // Validate custom middleware array if provided
        if (config.customMiddleware) {
            const customMiddlewareValidation = validateCustomMiddleware(config.customMiddleware);
            if (!customMiddlewareValidation.isValid) {
                validationResult.errors.push(...customMiddlewareValidation.errors.map(err => `CustomMiddleware: ${err}`));
                validationResult.isValid = false;
            }
            validationResult.warnings.push(...customMiddlewareValidation.warnings);
        }

        // Set validated configuration object with sanitized and validated values
        validationResult.validatedConfig = sanitizedConfig;

        // Create comprehensive validation summary
        validationResult.validationSummary.overall = {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            isValid: validationResult.isValid,
            validatedAt: new Date().toISOString(),
            validationVersion: MODULE_VERSION
        };

        // Log validation completion with results summary
        logger.info('Middleware configuration validation completed', {
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            validatedComponents: Object.keys(validationResult.validationSummary)
        });

        // Return validation result with success status and validated configuration or error details
        return validationResult;

    } catch (error) {
        // Handle validation errors gracefully with comprehensive error reporting
        logger.error('Error during middleware configuration validation', {
            error: error.message,
            stack: error.stack,
            config: config
        });

        return {
            isValid: false,
            errors: [`Validation process failed: ${error.message}`],
            warnings: [],
            validatedConfig: null,
            validationSummary: {
                overall: {
                    totalErrors: 1,
                    totalWarnings: 0,
                    isValid: false,
                    validationError: error.message
                }
            }
        };
    }
}

// Helper validation functions for individual middleware components

/**
 * Validates request logger configuration options
 * @param {Object} config - Request logger configuration to validate
 * @returns {Object} Validation result with sanitized configuration
 */
function validateRequestLoggerConfig(config) {
    const result = { isValid: true, errors: [], sanitizedConfig: { ...config } };
    
    if (config.logLevel && !['error', 'warn', 'info', 'debug'].includes(config.logLevel.toLowerCase())) {
        result.errors.push(`Invalid logLevel: ${config.logLevel}`);
        result.isValid = false;
    }
    
    if (config.includeRequestDetails !== undefined && typeof config.includeRequestDetails !== 'boolean') {
        result.sanitizedConfig.includeRequestDetails = Boolean(config.includeRequestDetails);
    }
    
    return result;
}

/**
 * Validates error handler configuration options
 * @param {Object} config - Error handler configuration to validate
 * @returns {Object} Validation result with sanitized configuration
 */
function validateErrorHandlerConfig(config) {
    const result = { isValid: true, errors: [], sanitizedConfig: { ...config } };
    
    if (config.includeStackTrace !== undefined && typeof config.includeStackTrace !== 'boolean') {
        result.sanitizedConfig.includeStackTrace = Boolean(config.includeStackTrace);
    }
    
    if (config.customErrorMessages && typeof config.customErrorMessages !== 'object') {
        result.errors.push('customErrorMessages must be an object');
        result.isValid = false;
    }
    
    return result;
}

/**
 * Validates response handler configuration options
 * @param {Object} config - Response handler configuration to validate
 * @returns {Object} Validation result with sanitized configuration
 */
function validateResponseHandlerConfig(config) {
    const result = { isValid: true, errors: [], sanitizedConfig: { ...config } };
    
    if (config.includeDebugInfo !== undefined && typeof config.includeDebugInfo !== 'boolean') {
        result.sanitizedConfig.includeDebugInfo = Boolean(config.includeDebugInfo);
    }
    
    if (config.defaultMetadata && typeof config.defaultMetadata !== 'object') {
        result.errors.push('defaultMetadata must be an object');
        result.isValid = false;
    }
    
    return result;
}

/**
 * Validates not found handler configuration options
 * @param {Object} config - Not found handler configuration to validate
 * @returns {Object} Validation result with sanitized configuration
 */
function validateNotFoundHandlerConfig(config) {
    const result = { isValid: true, errors: [], sanitizedConfig: { ...config } };
    
    if (config.logLevel && !['error', 'warn', 'info', 'debug'].includes(config.logLevel.toLowerCase())) {
        result.errors.push(`Invalid logLevel: ${config.logLevel}`);
        result.isValid = false;
    }
    
    if (config.customErrorMessage && typeof config.customErrorMessage !== 'string') {
        result.errors.push('customErrorMessage must be a string');
        result.isValid = false;
    }
    
    return result;
}

/**
 * Validates configuration for conflicts and incompatible options
 * @param {Object} config - Complete configuration to check for conflicts
 * @returns {Object} Validation result with conflict analysis
 */
function validateConfigurationConflicts(config) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    // Check for production environment with debug options enabled
    if (config.environment === 'production') {
        if (config.requestLogger?.includeRequestDetails === true) {
            result.warnings.push('includeRequestDetails enabled in production may expose sensitive information');
        }
        if (config.errorHandler?.includeStackTrace === true) {
            result.warnings.push('includeStackTrace enabled in production may expose internal details');
        }
    }
    
    return result;
}

/**
 * Validates environment-specific configuration
 * @param {string} environment - Environment to validate
 * @returns {Object} Validation result for environment
 */
function validateEnvironmentConfig(environment) {
    const result = { isValid: true, errors: [] };
    const validEnvironments = ['development', 'test', 'production'];
    
    if (!validEnvironments.includes(environment)) {
        result.errors.push(`Invalid environment: ${environment}. Must be one of: ${validEnvironments.join(', ')}`);
        result.isValid = false;
    }
    
    return result;
}

/**
 * Validates custom middleware array
 * @param {Array} customMiddleware - Array of custom middleware to validate
 * @returns {Object} Validation result for custom middleware
 */
function validateCustomMiddleware(customMiddleware) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    if (!Array.isArray(customMiddleware)) {
        result.errors.push('customMiddleware must be an array');
        result.isValid = false;
        return result;
    }
    
    customMiddleware.forEach((middleware, index) => {
        if (typeof middleware !== 'function' && 
            (!middleware || typeof middleware.middleware !== 'function')) {
            result.errors.push(`Custom middleware at index ${index} must be a function or have a middleware property`);
            result.isValid = false;
        }
    });
    
    return result;
}

// Create organized middleware object with grouped middleware functions for convenient access
const middleware = {
    // Request logging middleware group
    requestLogger: {
        middleware: requestLoggerMiddleware,
        create: createRequestLogger,
        alias: requestLogger
    },
    
    // Error handling middleware group
    errorHandler: {
        middleware: errorHandler,
        create: createErrorHandler,
        classify: classifyError,
        handleAsync: handleAsyncErrors,
        extractDetails: extractErrorDetails,
        generateId: generateErrorId,
        logEvent: logErrorEvent,
        createContext: createErrorContext,
        getDefaultConfig: getDefaultErrorHandlerConfig
    },
    
    // Not found handler middleware group
    notFoundHandler: {
        middleware: notFoundHandler,
        create: createNotFoundHandler,
        logRequest: logNotFoundRequest,
        createError: create404Error,
        getDefaultConfig: getDefaultNotFoundConfig
    },
    
    // Response handler utilities group
    responseHandler: {
        formatSuccess: formatSuccessResponse,
        formatError: formatErrorResponse,
        createMetadata: createResponseMetadata,
        sanitizeMessage: sanitizeErrorMessage,
        extractContext: extractRequestContext,
        addHeaders: addResponseHeaders,
        validateData: validateResponseData,
        createFactory: createResponseFactory
    }
};

// Export all middleware functions, utilities, and configuration functions
module.exports = {
    // Re-export all imported middleware functions for direct access
    
    // Request logging middleware exports
    requestLogger,
    requestLoggerMiddleware,
    createRequestLogger,
    
    // Error handling middleware exports
    errorHandler,
    createErrorHandler,
    classifyError,
    handleAsyncErrors,
    extractErrorDetails,
    generateErrorId,
    logErrorEvent,
    createErrorContext,
    getDefaultErrorHandlerConfig,
    
    // Response formatting utility exports
    formatSuccessResponse,
    formatErrorResponse,
    createResponseMetadata,
    sanitizeErrorMessage,
    extractRequestContext,
    addResponseHeaders,
    validateResponseData,
    createResponseFactory,
    
    // Not found handler middleware exports
    notFoundHandler,
    createNotFoundHandler,
    logNotFoundRequest,
    create404Error,
    getDefaultNotFoundConfig,
    
    // Organized middleware object with grouped middleware functions for convenient access and application integration
    middleware,
    
    // Configuration function for setting up middleware collection with custom options and environment-specific settings
    configureMiddleware,
    
    // Default configuration utility function for all middleware components with environment-appropriate settings
    getDefaultMiddlewareConfig,
    
    // Middleware stack creation utility for ordered Express.js middleware pipeline setup
    createMiddlewareStack,
    
    // Middleware configuration validation utility for ensuring proper middleware setup and preventing runtime errors
    validateMiddlewareConfig
};