/**
 * Configuration Barrel Module for Node.js Tutorial Application
 * 
 * This module serves as the centralized entry point for all application configuration,
 * consolidating environment, server, and logging configurations into a unified configuration
 * object. Provides configuration validation, summary generation, and configuration
 * management utilities while acting as the primary configuration interface for the
 * Node.js tutorial application.
 * 
 * Enables consistent configuration access across all application components while
 * maintaining separation of concerns between different configuration domains.
 * Implements comprehensive configuration management patterns including validation,
 * caching, reloading, and logger factory creation for educational demonstration.
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
    createEnvironmentConfig,
    reloadEnvironmentConfig,
    isEnvironmentConfigValid
} = require('./environment.js');

// Import server configuration including Express.js settings and connection management
const { 
    serverConfig,
    createServerConfig,
    validateServerConfig,
    createServerSummary,
    getHttpServerSettings,
    getExpressConfiguration,
    getConnectionConfig,
    getSecurityConfig,
    getPerformanceConfig
} = require('./server.js');

// Import logging configuration with level, format, and console output settings
const { 
    loggingConfig,
    createLoggerFactory,
    validateLoggingConfig,
    getEnvironmentLogLevel,
    createLoggingConfig
} = require('./logging.js');

// Import configuration management constants and metadata
const { 
    CONFIG,
    ERROR_MESSAGES
} = require('../utils/constants.js');

/**
 * Global configuration cache for performance optimization
 * Stores complete application configuration to avoid repeated processing
 * @type {Object|null}
 */
let configurationCache = new Map();

/**
 * Global configuration validation results cache
 * Prevents redundant validation operations during runtime
 * @type {Map<string, Object>}
 */
let configValidationResults = new Map();

/**
 * Configuration version for cache invalidation and compatibility
 * @type {string}
 */
let configurationVersion = CONFIG?.VERSION || '1.0.0';

/**
 * Logger instances cache to prevent duplicate logger creation
 * Maintains singleton pattern for component-specific loggers
 * @type {Map<string, Object>}
 */
const loggerInstancesCache = new Map();

/**
 * Creates and returns a comprehensive application configuration object by consolidating
 * environment, server, and logging configurations with validation and error handling.
 * Combines all configuration domains into a unified configuration interface.
 * 
 * @param {Object} options - Configuration creation options
 * @param {boolean} options.forceReload - Force reload configuration from environment
 * @param {boolean} options.validateConfig - Enable configuration validation
 * @param {boolean} options.includeMetadata - Include configuration metadata
 * @returns {Object} Complete application configuration object with environment, server, logging settings, and metadata
 */
function createConfiguration(options = {}) {
    try {
        // Check if configuration is cached and force reload is not requested
        const cacheKey = 'main-configuration';
        if (!options.forceReload && configurationCache.has(cacheKey)) {
            console.info('[INFO] Using cached application configuration');
            return configurationCache.get(cacheKey);
        }

        console.info('[INFO] Creating comprehensive application configuration');

        // Load environment configuration from environment.js module
        const environmentConfig = options.forceReload ? 
            reloadEnvironmentConfig(true) : 
            config;

        if (!environmentConfig) {
            throw new Error('Failed to load environment configuration');
        }

        // Load server configuration from server.js module using environment settings
        const serverConfiguration = createServerConfig(environmentConfig);

        if (!serverConfiguration) {
            throw new Error('Failed to load server configuration');
        }

        // Load logging configuration from logging.js module with environment-specific settings
        const loggingConfiguration = createLoggingConfig(
            environmentConfig.nodeEnv,
            {
                forceColors: environmentConfig.isDevelopment,
                timestampFormat: 'YYYY-MM-DDTHH:mm:ss.sssZ'
            }
        );

        if (!loggingConfiguration) {
            throw new Error('Failed to load logging configuration');
        }

        // Create unified configuration object combining all configuration domains
        const unifiedConfiguration = {
            // Environment configuration
            environment: {
                port: environmentConfig.port,
                host: environmentConfig.host,
                nodeEnv: environmentConfig.nodeEnv,
                logLevel: environmentConfig.logLevel,
                isProduction: environmentConfig.isProduction,
                isDevelopment: environmentConfig.isDevelopment,
                isTest: environmentConfig.isTest,
                timeout: environmentConfig.timeout,
                maxConnections: environmentConfig.maxConnections,
                keepAliveTimeout: environmentConfig.keepAliveTimeout,
                jsonLimit: environmentConfig.jsonLimit,
                verboseErrors: environmentConfig.verboseErrors,
                securityHeaders: environmentConfig.securityHeaders
            },

            // Server configuration
            server: {
                http: serverConfiguration.http,
                express: serverConfiguration.express,
                connection: serverConfiguration.connection,
                security: serverConfiguration.security,
                performance: serverConfiguration.performance,
                logging: serverConfiguration.logging,
                environment: serverConfiguration.environment
            },

            // Logging configuration
            logging: {
                level: loggingConfiguration.level,
                format: loggingConfiguration.format,
                console: loggingConfiguration.console,
                colors: loggingConfiguration.colors,
                environment: loggingConfiguration.environment
            }
        };

        // Add configuration metadata including version and creation timestamp
        if (options.includeMetadata !== false) {
            unifiedConfiguration.metadata = {
                version: configurationVersion,
                createdAt: new Date().toISOString(),
                environment: environmentConfig.nodeEnv,
                configurationSource: 'configuration-barrel-module',
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                processId: process.pid,
                components: {
                    environment: environmentConfig.metadata?.version || '1.0.0',
                    server: serverConfiguration.metadata?.version || '1.0.0',
                    logging: loggingConfiguration.metadata?.version || '1.0.0'
                }
            };
        }

        // Validate complete configuration using validation utilities
        let validationResult = null;
        if (options.validateConfig !== false) {
            validationResult = validateConfiguration(unifiedConfiguration);
            unifiedConfiguration.validation = validationResult;
        }

        // Cache configuration object for subsequent access and performance
        configurationCache.set(cacheKey, unifiedConfiguration);
        if (validationResult) {
            configValidationResults.set(cacheKey, validationResult);
        }

        // Log successful configuration creation
        const validationStatus = validationResult ? 
            (validationResult.isValid ? 'valid' : 'invalid') : 
            'not-validated';
        
        console.info(`[INFO] Application configuration created successfully - validation: ${validationStatus}`);

        // Return comprehensive application configuration object
        return unifiedConfiguration;

    } catch (error) {
        // Handle configuration creation errors gracefully
        console.error(`[ERROR] Failed to create application configuration: ${error.message}`);

        // Return minimal fallback configuration to ensure application can start
        const fallbackConfig = {
            environment: {
                port: 3000,
                host: 'localhost',
                nodeEnv: 'development',
                logLevel: 'info',
                isProduction: false,
                isDevelopment: true,
                isTest: false
            },
            server: {
                http: {
                    port: 3000,
                    host: 'localhost',
                    timeout: 30000,
                    keepAliveTimeout: 5000,
                    maxConnections: 100
                },
                express: {
                    bodyParser: {
                        json: { limit: '10mb' },
                        urlencoded: { limit: '10mb', extended: true }
                    },
                    security: { xPoweredBy: false }
                }
            },
            logging: {
                level: 'info',
                format: {
                    timestamp: 'YYYY-MM-DDTHH:mm:ss.sssZ',
                    console: '[{level}] {timestamp} - {component}: {message}',
                    colorize: true
                },
                console: { enabled: true, colors: true },
                colors: true
            },
            metadata: {
                version: configurationVersion,
                createdAt: new Date().toISOString(),
                environment: 'development',
                configurationError: error.message,
                fallbackConfiguration: true
            },
            validation: {
                isValid: false,
                errors: [`Configuration creation failed: ${error.message}`],
                warnings: ['Using fallback configuration']
            }
        };

        // Cache fallback configuration
        configurationCache.set('main-configuration', fallbackConfig);
        
        return fallbackConfig;
    }
}

/**
 * Performs comprehensive validation of the complete application configuration by
 * validating environment, server, and logging configurations individually and
 * checking cross-configuration dependencies and consistency.
 * 
 * @param {Object} configuration - Complete application configuration object to validate
 * @returns {Object} Validation result with isValid boolean, detailed errors, warnings, and configuration status
 */
function validateConfiguration(configuration) {
    try {
        console.debug('[DEBUG] Starting comprehensive configuration validation');

        // Initialize comprehensive validation result
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            componentValidation: {},
            crossValidation: {},
            summary: {
                totalComponents: 0,
                validComponents: 0,
                invalidComponents: 0,
                totalErrors: 0,
                totalWarnings: 0
            }
        };

        // Validate environment configuration using validateEnvironment function
        if (configuration.environment) {
            console.debug('[DEBUG] Validating environment configuration');
            const envValidation = validateEnvironment(configuration.environment);
            validationResult.componentValidation.environment = envValidation;
            validationResult.summary.totalComponents++;

            if (envValidation.isValid) {
                validationResult.summary.validComponents++;
            } else {
                validationResult.summary.invalidComponents++;
                validationResult.isValid = false;
                validationResult.errors.push(...envValidation.errors);
            }

            if (envValidation.warnings && envValidation.warnings.length > 0) {
                validationResult.warnings.push(...envValidation.warnings);
            }

            validationResult.summary.totalErrors += envValidation.errors ? envValidation.errors.length : 0;
            validationResult.summary.totalWarnings += envValidation.warnings ? envValidation.warnings.length : 0;
        }

        // Validate server configuration using validateServerConfig function
        if (configuration.server) {
            console.debug('[DEBUG] Validating server configuration');
            const serverValidation = validateServerConfig(configuration.server);
            validationResult.componentValidation.server = serverValidation;
            validationResult.summary.totalComponents++;

            if (serverValidation.isValid) {
                validationResult.summary.validComponents++;
            } else {
                validationResult.summary.invalidComponents++;
                validationResult.isValid = false;
                validationResult.errors.push(...(serverValidation.errors || []));
            }

            if (serverValidation.warnings && serverValidation.warnings.length > 0) {
                validationResult.warnings.push(...serverValidation.warnings);
            }

            validationResult.summary.totalErrors += serverValidation.errors ? serverValidation.errors.length : 0;
            validationResult.summary.totalWarnings += serverValidation.warnings ? serverValidation.warnings.length : 0;
        }

        // Validate logging configuration using validateLoggingConfig function
        if (configuration.logging) {
            console.debug('[DEBUG] Validating logging configuration');
            const loggingValidation = validateLoggingConfig(configuration.logging);
            validationResult.componentValidation.logging = loggingValidation;
            validationResult.summary.totalComponents++;

            if (loggingValidation.isValid) {
                validationResult.summary.validComponents++;
            } else {
                validationResult.summary.invalidComponents++;
                validationResult.isValid = false;
                validationResult.errors.push(...(loggingValidation.errors || []));
            }

            if (loggingValidation.warnings && loggingValidation.warnings.length > 0) {
                validationResult.warnings.push(...loggingValidation.warnings);
            }

            validationResult.summary.totalErrors += loggingValidation.errors ? loggingValidation.errors.length : 0;
            validationResult.summary.totalWarnings += loggingValidation.warnings ? loggingValidation.warnings.length : 0;
        }

        // Check cross-configuration dependencies and consistency
        console.debug('[DEBUG] Validating cross-configuration dependencies');
        
        // Validate environment and server port consistency
        if (configuration.environment?.port && configuration.server?.http?.port) {
            if (configuration.environment.port !== configuration.server.http.port) {
                validationResult.crossValidation.portConsistency = {
                    isValid: false,
                    error: `Port mismatch: environment.port (${configuration.environment.port}) !== server.http.port (${configuration.server.http.port})`
                };
                validationResult.errors.push('Port configuration inconsistency between environment and server');
                validationResult.isValid = false;
                validationResult.summary.totalErrors++;
            } else {
                validationResult.crossValidation.portConsistency = { isValid: true };
            }
        }

        // Validate environment and logging level consistency
        if (configuration.environment?.logLevel && configuration.logging?.level) {
            if (configuration.environment.logLevel !== configuration.logging.level) {
                validationResult.crossValidation.logLevelConsistency = {
                    isValid: false,
                    warning: `Log level mismatch: environment.logLevel (${configuration.environment.logLevel}) !== logging.level (${configuration.logging.level})`
                };
                validationResult.warnings.push('Log level configuration inconsistency between environment and logging');
                validationResult.summary.totalWarnings++;
            } else {
                validationResult.crossValidation.logLevelConsistency = { isValid: true };
            }
        }

        // Verify configuration completeness and required property presence
        const requiredProperties = ['environment', 'server', 'logging'];
        const missingProperties = requiredProperties.filter(prop => !configuration[prop]);
        
        if (missingProperties.length > 0) {
            validationResult.errors.push(`Missing required configuration sections: ${missingProperties.join(', ')}`);
            validationResult.isValid = false;
            validationResult.summary.totalErrors++;
        }

        // Compile validation errors and warnings from all configuration domains
        validationResult.metadata = {
            validatedAt: new Date().toISOString(),
            validationVersion: configurationVersion,
            validationContext: 'complete-application-configuration',
            totalValidationChecks: validationResult.summary.totalComponents + Object.keys(validationResult.crossValidation).length,
            validationDuration: Date.now() // Placeholder for actual duration calculation
        };

        // Cache validation results for performance and subsequent checks
        configValidationResults.set('main-configuration-validation', validationResult);

        // Log validation completion
        const statusMessage = validationResult.isValid ? 'passed' : 'failed';
        console.info(`[INFO] Configuration validation ${statusMessage} - ${validationResult.summary.validComponents}/${validationResult.summary.totalComponents} components valid`);
        
        if (validationResult.summary.totalErrors > 0) {
            console.error(`[ERROR] Configuration validation found ${validationResult.summary.totalErrors} errors`);
        }
        
        if (validationResult.summary.totalWarnings > 0) {
            console.warn(`[WARN] Configuration validation found ${validationResult.summary.totalWarnings} warnings`);
        }

        // Return comprehensive validation result with detailed status information
        return validationResult;

    } catch (error) {
        // Handle validation process errors
        console.error(`[ERROR] Configuration validation failed: ${error.message}`);

        return {
            isValid: false,
            errors: [`Validation process failed: ${error.message}`],
            warnings: [],
            componentValidation: {},
            crossValidation: {},
            summary: {
                totalComponents: 0,
                validComponents: 0,
                invalidComponents: 0,
                totalErrors: 1,
                totalWarnings: 0
            },
            metadata: {
                validatedAt: new Date().toISOString(),
                validationVersion: configurationVersion,
                validationError: error.message
            }
        };
    }
}

/**
 * Generates a comprehensive configuration summary including environment settings,
 * server configuration, logging setup, and validation status for logging and
 * monitoring purposes.
 * 
 * @param {Object} configuration - Complete application configuration object
 * @returns {Object} Configuration summary with overview, settings, validation status, and metadata
 */
function getConfigurationSummary(configuration = null) {
    try {
        // Use provided configuration or get from cache
        const config = configuration || configurationCache.get('main-configuration') || createConfiguration();

        console.debug('[DEBUG] Generating comprehensive configuration summary');

        // Extract environment configuration summary including port, host, and environment mode
        const environmentSummary = {
            port: config.environment?.port || 3000,
            host: config.environment?.host || 'localhost',
            nodeEnv: config.environment?.nodeEnv || 'development',
            logLevel: config.environment?.logLevel || 'info',
            fullAddress: `http://${config.environment?.host || 'localhost'}:${config.environment?.port || 3000}`,
            environmentFlags: {
                isProduction: config.environment?.isProduction || false,
                isDevelopment: config.environment?.isDevelopment || true,
                isTest: config.environment?.isTest || false
            },
            performance: {
                timeout: config.environment?.timeout || 30000,
                maxConnections: config.environment?.maxConnections || 100,
                keepAliveTimeout: config.environment?.keepAliveTimeout || 5000
            }
        };

        // Generate server configuration summary using createServerSummary function
        const serverSummary = config.server ? createServerSummary(config.server) : {
            binding: { host: 'localhost', port: 3000 },
            express: { version: '5.1.0' },
            error: 'Server configuration not available'
        };

        // Create logging configuration summary with level and format information
        const loggingSummary = {
            level: config.logging?.level || 'info',
            format: {
                timestamp: config.logging?.format?.timestamp || 'YYYY-MM-DDTHH:mm:ss.sssZ',
                console: config.logging?.format?.console || '[{level}] {timestamp} - {component}: {message}',
                colorize: config.logging?.format?.colorize || false,
                verbose: config.logging?.format?.verbose || false
            },
            console: {
                enabled: config.logging?.console?.enabled !== false,
                colors: config.logging?.console?.colors || false,
                handleExceptions: config.logging?.console?.handleExceptions || true
            },
            environment: config.logging?.environment || 'development'
        };

        // Include configuration validation status and any warnings or errors
        const validationStatus = config.validation || configValidationResults.get('main-configuration-validation') || {
            isValid: false,
            errors: ['Validation not performed'],
            warnings: []
        };

        // Add system information and runtime environment details
        const systemInfo = {
            runtime: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                processId: process.pid,
                uptime: Math.round(process.uptime()),
                memoryUsage: process.memoryUsage()
            },
            environment: {
                workingDirectory: process.cwd(),
                executablePath: process.execPath,
                environmentVariables: {
                    NODE_ENV: process.env.NODE_ENV,
                    PORT: process.env.PORT,
                    HOST: process.env.HOST,
                    LOG_LEVEL: process.env.LOG_LEVEL
                }
            }
        };

        // Include configuration version and creation metadata
        const metadata = {
            version: config.metadata?.version || configurationVersion,
            createdAt: config.metadata?.createdAt || new Date().toISOString(),
            environment: config.metadata?.environment || 'development',
            configurationSource: config.metadata?.configurationSource || 'configuration-barrel-module',
            components: config.metadata?.components || {
                environment: '1.0.0',
                server: '1.0.0',
                logging: '1.0.0'
            },
            summaryGeneratedAt: new Date().toISOString()
        };

        // Calculate configuration statistics
        const statistics = {
            totalConfigurationKeys: countObjectKeys(config),
            environmentConfigKeys: countObjectKeys(config.environment),
            serverConfigKeys: countObjectKeys(config.server),
            loggingConfigKeys: countObjectKeys(config.logging),
            cacheEntries: configurationCache.size,
            validationCacheEntries: configValidationResults.size,
            loggerInstances: loggerInstancesCache.size
        };

        // Format summary for structured logging and monitoring display
        const configurationSummary = {
            // Overview section with key information
            overview: {
                application: 'Node.js Tutorial Application',
                version: metadata.version,
                environment: environmentSummary.nodeEnv,
                status: validationStatus.isValid ? 'healthy' : 'degraded',
                serverAddress: environmentSummary.fullAddress
            },

            // Environment configuration summary
            environment: environmentSummary,

            // Server configuration summary
            server: serverSummary,

            // Logging configuration summary
            logging: loggingSummary,

            // Validation status and results
            validation: {
                isValid: validationStatus.isValid,
                errorCount: validationStatus.errors ? validationStatus.errors.length : 0,
                warningCount: validationStatus.warnings ? validationStatus.warnings.length : 0,
                lastValidated: validationStatus.metadata?.validatedAt || 'Never',
                componentStatus: validationStatus.componentValidation ? {
                    environment: validationStatus.componentValidation.environment?.isValid || false,
                    server: validationStatus.componentValidation.server?.isValid || false,
                    logging: validationStatus.componentValidation.logging?.isValid || false
                } : {}
            },

            // System and runtime information
            system: systemInfo,

            // Configuration statistics
            statistics: statistics,

            // Metadata and versioning information
            metadata: metadata
        };

        console.debug('[DEBUG] Configuration summary generated successfully');

        // Return comprehensive configuration summary object
        return configurationSummary;

    } catch (error) {
        // Handle summary generation errors
        console.error(`[ERROR] Failed to generate configuration summary: ${error.message}`);

        return {
            overview: {
                application: 'Node.js Tutorial Application',
                version: configurationVersion,
                environment: 'unknown',
                status: 'error',
                serverAddress: 'http://localhost:3000'
            },
            error: error.message,
            metadata: {
                summaryGeneratedAt: new Date().toISOString(),
                summaryError: true
            }
        };
    }
}

/**
 * Reloads application configuration by clearing cache, re-importing configuration
 * modules, and revalidating the complete configuration setup.
 * 
 * @param {boolean} forceReload - Whether to force reload even if configuration appears unchanged
 * @returns {Object} Reloaded configuration object with updated settings and validation results
 */
function reloadConfiguration(forceReload = false) {
    try {
        console.info('[INFO] Initiating application configuration reload');

        // Check if force reload is requested or configuration refresh is needed
        if (!forceReload && configurationCache.has('main-configuration')) {
            const cachedConfig = configurationCache.get('main-configuration');
            const cacheAge = Date.now() - new Date(cachedConfig.metadata?.createdAt || 0).getTime();
            const maxCacheAge = 300000; // 5 minutes

            if (cacheAge < maxCacheAge) {
                console.info('[INFO] Configuration reload skipped - using recent cached configuration');
                return cachedConfig;
            }
        }

        // Clear configuration cache and validation result cache
        console.debug('[DEBUG] Clearing configuration and validation caches');
        configurationCache.clear();
        configValidationResults.clear();

        // Delete require cache for configuration modules to force re-import
        // Note: In a production environment, this would need more sophisticated cache management
        console.debug('[DEBUG] Clearing module require cache for configuration modules');
        
        // Re-import environment, server, and logging configuration modules
        // This is achieved by creating a new configuration with forceReload flag
        console.debug('[DEBUG] Re-importing configuration modules');
        
        // Create new configuration object with updated settings
        const reloadedConfiguration = createConfiguration({
            forceReload: true,
            validateConfig: true,
            includeMetadata: true
        });

        // Validate reloaded configuration using comprehensive validation
        const reloadValidation = validateConfiguration(reloadedConfiguration);

        // Update configuration cache with new configuration object
        configurationCache.set('main-configuration', reloadedConfiguration);
        configValidationResults.set('main-configuration-validation', reloadValidation);

        // Add reload metadata
        reloadedConfiguration.reloadMetadata = {
            reloadedAt: new Date().toISOString(),
            forceReload: forceReload,
            previousConfigurationCleared: true,
            validationStatus: reloadValidation.isValid ? 'valid' : 'invalid',
            reloadReason: forceReload ? 'force-reload-requested' : 'cache-expired'
        };

        // Log successful configuration reload
        const validationStatus = reloadValidation.isValid ? 'valid' : 'invalid';
        console.info(`[INFO] Configuration reloaded successfully - validation: ${validationStatus}`);

        if (!reloadValidation.isValid) {
            console.warn(`[WARN] Reloaded configuration has validation errors: ${reloadValidation.errors.length} errors found`);
        }

        // Return reloaded configuration with validation status
        return reloadedConfiguration;

    } catch (error) {
        // Handle configuration reload errors
        console.error(`[ERROR] Failed to reload application configuration: ${error.message}`);

        // Return existing configuration if available, otherwise create minimal fallback
        const existingConfig = configurationCache.get('main-configuration');
        if (existingConfig) {
            console.warn('[WARN] Using previous configuration due to reload failure');
            existingConfig.reloadMetadata = {
                reloadedAt: new Date().toISOString(),
                forceReload: forceReload,
                reloadError: error.message,
                usingPreviousConfig: true
            };
            return existingConfig;
        }

        // Create and return minimal fallback configuration
        console.warn('[WARN] Creating fallback configuration due to reload failure');
        return createConfiguration({ validateConfig: false });
    }
}

/**
 * Quick validation check to determine if the current application configuration
 * is valid and ready for application startup and operation.
 * 
 * @returns {boolean} True if configuration is valid and ready for use, false otherwise
 */
function isConfigurationValid() {
    try {
        // Check if configuration has been loaded and cached
        if (!configurationCache.has('main-configuration')) {
            console.debug('[DEBUG] Configuration not loaded - attempting to create configuration');
            createConfiguration({ validateConfig: true });
        }

        // Verify no critical validation errors exist in cached validation results
        const validationResult = configValidationResults.get('main-configuration-validation');
        if (!validationResult) {
            console.debug('[DEBUG] Validation cache empty - performing quick validation');
            const config = configurationCache.get('main-configuration');
            if (config) {
                const quickValidation = validateConfiguration(config);
                return quickValidation.isValid;
            }
            return false;
        }

        // Confirm all required configuration domains are present and valid
        const config = configurationCache.get('main-configuration');
        const hasRequiredSections = config && 
                                   config.environment && 
                                   config.server && 
                                   config.logging;

        const hasValidValidation = validationResult && validationResult.isValid;

        // Check cross-configuration dependencies and consistency
        const crossConfigValid = !validationResult.crossValidation || 
                                Object.values(validationResult.crossValidation).every(
                                    validation => validation.isValid !== false
                                );

        // Verify configuration version compatibility
        const configVersion = config?.metadata?.version;
        const versionCompatible = !configVersion || configVersion === configurationVersion;

        // Return boolean indicating overall configuration validity status
        const isValid = hasRequiredSections && hasValidValidation && crossConfigValid && versionCompatible;

        // Log validation check result
        if (isValid) {
            console.debug('[DEBUG] Configuration is valid and ready for use');
        } else {
            console.warn(`[WARN] Configuration validation failed - sections: ${hasRequiredSections}, validation: ${hasValidValidation}, cross-config: ${crossConfigValid}, version: ${versionCompatible}`);
        }

        return isValid;

    } catch (error) {
        // Handle validation check errors
        console.error(`[ERROR] Configuration validity check failed: ${error.message}`);
        return false;
    }
}

/**
 * Utility function to safely retrieve specific configuration values using dot notation
 * paths with fallback defaults and type validation.
 * 
 * @param {string} path - Dot notation path to configuration value (e.g., 'environment.port')
 * @param {any} defaultValue - Default value to return if path does not exist
 * @returns {any} Configuration value at specified path or default value if not found
 */
function getConfigurationValue(path, defaultValue = null) {
    try {
        // Get current configuration from cache or create new one
        const config = configurationCache.get('main-configuration') || createConfiguration();

        // Parse dot notation path into property access chain
        const pathSegments = path.split('.');
        
        // Navigate configuration object following the specified path
        let currentValue = config;
        for (const segment of pathSegments) {
            if (currentValue && typeof currentValue === 'object' && segment in currentValue) {
                currentValue = currentValue[segment];
            } else {
                // Return default value if path does not exist or value is invalid
                console.debug(`[DEBUG] Configuration path '${path}' not found, using default value`);
                return defaultValue;
            }
        }

        // Handle array and object path navigation safely
        if (currentValue === null || currentValue === undefined) {
            console.debug(`[DEBUG] Configuration path '${path}' contains null/undefined value, using default`);
            return defaultValue;
        }

        // Return configuration value if path exists and value is valid
        console.debug(`[DEBUG] Retrieved configuration value for path '${path}'`);
        return currentValue;

    } catch (error) {
        // Handle path navigation errors
        console.error(`[ERROR] Failed to get configuration value for path '${path}': ${error.message}`);
        
        // Provide type-safe access to nested configuration properties
        return defaultValue;
    }
}

/**
 * Creates a component-specific logger instance using the application's logging
 * configuration and logger factory.
 * 
 * @param {string} componentName - Name of the component requesting the logger
 * @returns {Object} Configured logger instance for the specified component
 */
function createLoggerInstance(componentName) {
    try {
        // Check if logger instance already exists for this component
        if (loggerInstancesCache.has(componentName)) {
            console.debug(`[DEBUG] Using cached logger instance for component '${componentName}'`);
            return loggerInstancesCache.get(componentName);
        }

        // Get current logging configuration from application configuration
        const config = configurationCache.get('main-configuration') || createConfiguration();
        const loggingConfiguration = config.logging || loggingConfig;

        // Create logger factory using createLoggerFactory function
        const loggerFactory = createLoggerFactory(loggingConfiguration);

        // Generate component-specific logger with provided component name
        const logger = loggerFactory(componentName);

        // Configure logger with application logging settings and format
        // (The logger factory handles this internally)

        // Cache logger instance for component to prevent duplicate creation
        loggerInstancesCache.set(componentName, logger);

        console.debug(`[DEBUG] Created new logger instance for component '${componentName}'`);

        // Return configured logger instance ready for component use
        return logger;

    } catch (error) {
        // Handle logger creation errors
        console.error(`[ERROR] Failed to create logger instance for component '${componentName}': ${error.message}`);

        // Return basic fallback logger
        const fallbackLogger = {
            error: (message, meta = {}) => console.error(`[ERROR] ${componentName}: ${message}`, meta),
            warn: (message, meta = {}) => console.warn(`[WARN] ${componentName}: ${message}`, meta),
            info: (message, meta = {}) => console.info(`[INFO] ${componentName}: ${message}`, meta),
            debug: (message, meta = {}) => console.debug(`[DEBUG] ${componentName}: ${message}`, meta)
        };

        // Cache fallback logger
        loggerInstancesCache.set(componentName, fallbackLogger);

        return fallbackLogger;
    }
}

/**
 * Helper function to count object keys recursively for configuration statistics
 * @param {Object} obj - Object to count keys for
 * @returns {number} Total number of keys in object and nested objects
 */
function countObjectKeys(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    
    let count = 0;
    for (const key in obj) {
        count++;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            count += countObjectKeys(obj[key]);
        }
    }
    return count;
}

// Create the main configuration object with all configuration domains consolidated
const configuration = createConfiguration({
    validateConfig: true,
    includeMetadata: true
});

// Export the main application configuration object and utility functions
module.exports = {
    // Main application configuration object with all configuration domains consolidated
    configuration,
    
    // Configuration factory function for creating complete application configuration
    createConfiguration,
    
    // Configuration validation utility function for comprehensive validation
    validateConfiguration,
    
    // Configuration summary generator for logging and monitoring
    getConfigurationSummary,
    
    // Configuration reload utility for runtime configuration updates
    reloadConfiguration,
    
    // Quick configuration validation check utility
    isConfigurationValid,
    
    // Safe configuration value accessor with dot notation and defaults
    getConfigurationValue,
    
    // Logger instance factory for component-specific logging
    createLoggerInstance,

    // Re-exported environment configuration for backward compatibility and convenience
    config: configuration.environment,
    
    // Re-exported server configuration for direct server setup access
    serverConfig: configuration.server,
    
    // Re-exported logging configuration for direct logger setup access
    loggingConfig: configuration.logging
};