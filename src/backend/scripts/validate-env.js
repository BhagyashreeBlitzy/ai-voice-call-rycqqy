/**
 * Environment Validation Script for Node.js Tutorial Application
 * 
 * Comprehensive validation script that provides thorough validation of environment variables,
 * configuration settings, and system requirements for the Node.js tutorial application.
 * This script serves as a standalone utility for validating environment configuration before
 * application startup, ensuring all required environment variables are properly set, formatted,
 * and within acceptable ranges.
 * 
 * Supports Express.js 5.1.0 framework requirements and Node.js v22.x LTS runtime validation
 * with detailed error reporting, corrective guidance, and integration with CI/CD pipelines
 * through proper exit code handling.
 * 
 * Features:
 * - Comprehensive environment variable validation with constraint checking
 * - System requirements validation including Node.js version compatibility
 * - Application configuration validation with cross-domain dependency verification
 * - Detailed validation reporting with corrective recommendations
 * - Command-line interface with multiple output formats and verbosity levels
 * - Proper exit codes for automation and deployment pipeline integration
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import environment configuration and validation utilities
const { 
    validateEnvironment, 
    getEnvironmentInfo, 
    isEnvironmentConfigValid 
} = require('../config/environment.js');

// Import environment processing and analysis utilities
const { 
    validateEnvironmentVariables, 
    createEnvironmentSummary, 
    getEnvironmentType 
} = require('../utils/environment.js');

// Import validation framework and result handling
const { 
    ValidationResult, 
    validateConfiguration 
} = require('../utils/validator.js');

// Import logging utilities for comprehensive script logging
const { 
    getLogger 
} = require('../utils/logger.js');

// Import application constants including defaults and validation constraints
const { 
    ENVIRONMENT, 
    ERROR_MESSAGES 
} = require('../utils/constants.js');

// Import complete application configuration for comprehensive validation
const { 
    configuration 
} = require('../config/index.js');

// Global script logger for validation process logging and error reporting
const logger = getLogger('EnvironmentValidator');

// Global validation results cache for performance and result aggregation
const validationResults = new Map();

// Global validation options with detailed reporting and strict mode capabilities
const validationOptions = {
    detailed: true,
    strict: false,
    includeWarnings: true
};

/**
 * Validates all required environment variables for the application ensuring they are properly
 * set, formatted, and within acceptable ranges with detailed error reporting for missing or
 * invalid variables.
 * 
 * @param {Object} options - Validation options including strict mode and detailed reporting
 * @returns {ValidationResult} Validation result with success status, detailed errors for each invalid variable, and corrective guidance
 */
async function validateRequiredEnvironmentVariables(options = {}) {
    try {
        logger.info('Starting required environment variables validation');

        // Initialize ValidationResult instance to track validation outcomes
        const result = new ValidationResult();
        result.metadata.validationContext = 'required_environment_variables';
        result.metadata.startTime = new Date().toISOString();

        // Define required environment variables list including PORT, HOST, NODE_ENV, LOG_LEVEL
        const requiredVariables = ['PORT', 'HOST', 'NODE_ENV', 'LOG_LEVEL'];
        const validationDetails = {};

        // Validate each environment variable using validateEnvironmentVariables utility
        for (const variable of requiredVariables) {
            const value = process.env[variable];
            validationDetails[variable] = {
                value: value,
                isSet: value !== undefined,
                isEmpty: !value || value.trim() === ''
            };

            // Check if variable is set and not empty
            if (!validationDetails[variable].isSet || validationDetails[variable].isEmpty) {
                result.addError(
                    `Required environment variable ${variable} is not set or is empty`,
                    variable,
                    {
                        code: 'MISSING_REQUIRED_VARIABLE',
                        variable: variable,
                        currentValue: value,
                        corrective: `Set ${variable} environment variable with appropriate value`
                    }
                );
                continue;
            }

            // Variable-specific validation logic
            switch (variable) {
                case 'PORT':
                    // Check PORT variable is valid number within range 1-65535 using validation utilities
                    const port = parseInt(value, 10);
                    if (isNaN(port) || port < 1 || port > 65535) {
                        result.addError(
                            `Invalid PORT value: ${value}. Must be a number between 1 and 65535`,
                            'PORT',
                            {
                                code: 'INVALID_PORT_RANGE',
                                currentValue: value,
                                constraint: '1-65535',
                                corrective: `Set PORT to a valid port number (e.g., export PORT=3000)`
                            }
                        );
                    } else {
                        validationDetails[variable].parsedValue = port;
                        validationDetails[variable].isValid = true;
                    }
                    break;

                case 'HOST':
                    // Validate HOST variable is valid hostname, IP address, or localhost
                    const validHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
                    const isValidIP = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value);
                    const isValidHostname = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
                    
                    if (!validHosts.includes(value) && !isValidIP && !isValidHostname) {
                        result.addError(
                            `Invalid HOST value: ${value}. Must be a valid hostname, IP address, or localhost`,
                            'HOST',
                            {
                                code: 'INVALID_HOST_FORMAT',
                                currentValue: value,
                                validExamples: validHosts,
                                corrective: `Set HOST to a valid value (e.g., export HOST=localhost)`
                            }
                        );
                    } else {
                        validationDetails[variable].isValid = true;
                    }
                    break;

                case 'NODE_ENV':
                    // Verify NODE_ENV is one of supported environments (development, test, production)
                    if (!ENVIRONMENT.VALID_ENVIRONMENTS.includes(value)) {
                        result.addError(
                            `Invalid NODE_ENV value: ${value}. Must be one of: ${ENVIRONMENT.VALID_ENVIRONMENTS.join(', ')}`,
                            'NODE_ENV',
                            {
                                code: 'INVALID_NODE_ENV',
                                currentValue: value,
                                validValues: ENVIRONMENT.VALID_ENVIRONMENTS,
                                corrective: `Set NODE_ENV to a valid environment (e.g., export NODE_ENV=development)`
                            }
                        );
                    } else {
                        validationDetails[variable].isValid = true;
                    }
                    break;

                case 'LOG_LEVEL':
                    // Validate LOG_LEVEL is appropriate for current environment
                    const validLogLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
                    if (!validLogLevels.includes(value.toUpperCase())) {
                        result.addError(
                            `Invalid LOG_LEVEL value: ${value}. Must be one of: ${validLogLevels.join(', ')}`,
                            'LOG_LEVEL',
                            {
                                code: 'INVALID_LOG_LEVEL',
                                currentValue: value,
                                validValues: validLogLevels,
                                corrective: `Set LOG_LEVEL to a valid level (e.g., export LOG_LEVEL=INFO)`
                            }
                        );
                    } else {
                        validationDetails[variable].isValid = true;
                    }
                    break;
            }
        }

        // Collect all validation errors with specific field names and error details
        result.metadata.validationDetails = validationDetails;
        result.metadata.totalVariables = requiredVariables.length;
        result.metadata.validVariables = Object.values(validationDetails).filter(detail => detail.isValid).length;

        // Add corrective guidance for each validation error with examples
        if (result.hasErrors()) {
            result.metadata.correctiveActions = [
                'Review environment variable configuration',
                'Ensure all required variables are set with valid values',
                'Use .env file for local development',
                'Verify environment-specific constraints are met'
            ];
        }

        // Log validation progress and results using component logger
        const validCount = result.metadata.validVariables;
        const totalCount = result.metadata.totalVariables;
        logger.info(`Environment variables validation completed: ${validCount}/${totalCount} valid`);

        if (result.hasErrors()) {
            logger.error(`Environment variables validation failed with ${result.getErrors().length} errors`);
        }

        result.metadata.endTime = new Date().toISOString();
        
        // Return comprehensive ValidationResult with all validation outcomes
        return result;

    } catch (error) {
        logger.error(`Environment variables validation process failed: ${error.message}`);
        
        const errorResult = new ValidationResult(false, [{
            message: `Validation process error: ${error.message}`,
            field: 'validation_process',
            code: 'VALIDATION_PROCESS_ERROR',
            error: error.message
        }]);
        
        return errorResult;
    }
}

/**
 * Validates system requirements including Node.js version compatibility, platform support,
 * and runtime environment prerequisites for proper application operation.
 * 
 * @param {Object} options - Validation options including compatibility checks and requirements
 * @returns {ValidationResult} Validation result with system compatibility status, version information, and requirement compliance details
 */
async function validateSystemRequirements(options = {}) {
    try {
        logger.info('Starting system requirements validation');

        // Initialize ValidationResult for system requirements validation tracking
        const result = new ValidationResult();
        result.metadata.validationContext = 'system_requirements';
        result.metadata.startTime = new Date().toISOString();

        // Get Node.js runtime information using getEnvironmentInfo utility
        const environmentInfo = getEnvironmentInfo();
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            npmVersion: null
        };

        try {
            // Check npm version if available
            const { execSync } = require('child_process');
            const npmVersionOutput = execSync('npm --version', { encoding: 'utf8' }).trim();
            systemInfo.npmVersion = npmVersionOutput;
        } catch (npmError) {
            logger.warn('Could not determine npm version');
        }

        // Validate Node.js version is v18 or higher for Express.js 5.0 compatibility
        const nodeVersionMatch = process.version.match(/^v(\d+)\.(\d+)\.(\d+)/);
        if (!nodeVersionMatch) {
            result.addError(
                `Unable to parse Node.js version: ${process.version}`,
                'nodeVersion',
                {
                    code: 'INVALID_NODE_VERSION_FORMAT',
                    currentVersion: process.version,
                    corrective: 'Ensure Node.js is properly installed'
                }
            );
        } else {
            const [, major, minor, patch] = nodeVersionMatch.map(Number);
            systemInfo.parsedVersion = { major, minor, patch };

            // Check minimum version requirement (Node.js 18+)
            if (major < 18) {
                result.addError(
                    `Node.js version ${process.version} is not supported. Minimum required version is v18.0.0 for Express.js 5.1.0 compatibility`,
                    'nodeVersion',
                    {
                        code: 'UNSUPPORTED_NODE_VERSION',
                        currentVersion: process.version,
                        minimumVersion: 'v18.0.0',
                        recommendedVersion: 'v22.x LTS',
                        corrective: 'Upgrade Node.js to v18.0.0 or higher. Recommended: Node.js v22.x LTS'
                    }
                );
            }

            // Check Node.js version is LTS for production stability requirements
            const isLTSVersion = major === 18 || major === 20 || major === 22;
            if (!isLTSVersion) {
                result.addError(
                    `Node.js version ${process.version} is not an LTS version. LTS versions are recommended for stability`,
                    'nodeVersionLTS',
                    {
                        code: 'NON_LTS_VERSION',
                        currentVersion: process.version,
                        recommendedVersions: ['v18.x LTS', 'v20.x LTS', 'v22.x LTS'],
                        corrective: 'Use Node.js LTS version for better stability and long-term support'
                    }
                );
            }

            // Add recommendation for Node.js v22.x LTS
            if (major < 22) {
                result.metadata.recommendations = result.metadata.recommendations || [];
                result.metadata.recommendations.push({
                    type: 'version_upgrade',
                    message: `Consider upgrading to Node.js v22.x LTS for 55% performance improvement and latest features`,
                    currentVersion: process.version,
                    recommendedVersion: 'v22.x LTS',
                    benefits: [
                        '55% performance improvement over Node.js v18.17.0',
                        'Enhanced V8 JavaScript engine (12.4)',
                        'Active LTS until October 2025',
                        'Better memory management and garbage collection'
                    ]
                });
            }
        }

        // Verify platform compatibility for cross-platform operation
        const supportedPlatforms = ['win32', 'darwin', 'linux'];
        if (!supportedPlatforms.includes(process.platform)) {
            result.addError(
                `Platform ${process.platform} may not be fully supported. Supported platforms: ${supportedPlatforms.join(', ')}`,
                'platform',
                {
                    code: 'UNSUPPORTED_PLATFORM',
                    currentPlatform: process.platform,
                    supportedPlatforms: supportedPlatforms,
                    corrective: 'Use a supported platform for guaranteed compatibility'
                }
            );
        }

        // Validate npm version compatibility for package management
        if (systemInfo.npmVersion) {
            const npmVersionMatch = systemInfo.npmVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
            if (npmVersionMatch) {
                const [, npmMajor] = npmVersionMatch.map(Number);
                if (npmMajor < 9) {
                    result.addError(
                        `npm version ${systemInfo.npmVersion} is outdated. Minimum recommended version is 9.0.0`,
                        'npmVersion',
                        {
                            code: 'OUTDATED_NPM_VERSION',
                            currentVersion: systemInfo.npmVersion,
                            minimumVersion: '9.0.0',
                            corrective: 'Update npm: npm install -g npm@latest'
                        }
                    );
                }
            }
        }

        // Check memory and system resources if applicable
        const memoryUsage = process.memoryUsage();
        const totalMemoryMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        
        if (totalMemoryMB < 256) {
            result.addError(
                `Available heap memory (${totalMemoryMB}MB) may be insufficient. Recommended minimum: 512MB`,
                'memory',
                {
                    code: 'INSUFFICIENT_MEMORY',
                    currentMemory: `${totalMemoryMB}MB`,
                    recommendedMemory: '512MB',
                    corrective: 'Ensure adequate memory is available for Node.js application'
                }
            );
        }

        // Verify Express.js framework compatibility with Node.js version
        const expressCompatible = systemInfo.parsedVersion && systemInfo.parsedVersion.major >= 18;
        if (!expressCompatible) {
            result.addError(
                `Express.js 5.1.0 requires Node.js v18.0.0 or higher. Current version: ${process.version}`,
                'expressCompatibility',
                {
                    code: 'EXPRESS_INCOMPATIBLE',
                    expressVersion: '5.1.0',
                    nodeVersion: process.version,
                    requiredNodeVersion: '>=18.0.0',
                    corrective: 'Upgrade Node.js to v18.0.0 or higher for Express.js 5.1.0 compatibility'
                }
            );
        }

        // Add warnings for non-LTS versions or deprecated configurations
        result.metadata.systemInfo = systemInfo;
        result.metadata.environmentInfo = environmentInfo;
        result.metadata.expressCompatibility = expressCompatible;

        // Log system requirement validation results using component logger
        const hasErrors = result.hasErrors();
        logger.info(`System requirements validation completed: ${hasErrors ? 'FAILED' : 'PASSED'}`);
        
        if (hasErrors) {
            logger.error(`System requirements validation failed with ${result.getErrors().length} errors`);
        }

        result.metadata.endTime = new Date().toISOString();

        // Return ValidationResult with system compatibility status and recommendations
        return result;

    } catch (error) {
        logger.error(`System requirements validation process failed: ${error.message}`);
        
        const errorResult = new ValidationResult(false, [{
            message: `System validation process error: ${error.message}`,
            field: 'system_validation',
            code: 'SYSTEM_VALIDATION_ERROR',
            error: error.message
        }]);
        
        return errorResult;
    }
}

/**
 * Performs comprehensive validation of the complete application configuration including
 * environment, server, and logging configurations with cross-configuration dependency checking.
 * 
 * @param {Object} configOverrides - Configuration overrides for testing scenarios
 * @returns {ValidationResult} Comprehensive validation result with application configuration status, detailed errors, and configuration summary
 */
async function validateApplicationConfiguration(configOverrides = {}) {
    try {
        logger.info('Starting comprehensive application configuration validation');

        // Load complete application configuration from config/index.js
        let applicationConfig = configuration;
        
        // Apply configuration overrides if provided for testing scenarios
        if (Object.keys(configOverrides).length > 0) {
            logger.debug('Applying configuration overrides for testing');
            applicationConfig = { ...applicationConfig, ...configOverrides };
        }

        const result = new ValidationResult();
        result.metadata.validationContext = 'application_configuration';
        result.metadata.startTime = new Date().toISOString();

        // Validate environment configuration using validateEnvironment function
        logger.debug('Validating environment configuration');
        const environmentValidation = validateEnvironment(applicationConfig.environment || {});
        
        if (environmentValidation && !environmentValidation.isValid) {
            result.addError(
                'Environment configuration validation failed',
                'environment',
                {
                    code: 'ENVIRONMENT_CONFIG_INVALID',
                    details: environmentValidation.errors || [],
                    corrective: 'Review environment configuration settings'
                }
            );
        }

        // Validate server configuration including HTTP and Express.js settings
        logger.debug('Validating server configuration');
        if (!applicationConfig.server) {
            result.addError(
                'Server configuration is missing',
                'server',
                {
                    code: 'MISSING_SERVER_CONFIG',
                    corrective: 'Ensure server configuration is properly defined'
                }
            );
        } else {
            // Check HTTP server settings
            const httpConfig = applicationConfig.server.http;
            if (!httpConfig || !httpConfig.port || !httpConfig.host) {
                result.addError(
                    'HTTP server configuration is incomplete',
                    'server.http',
                    {
                        code: 'INCOMPLETE_HTTP_CONFIG',
                        missing: !httpConfig ? 'http config' : (!httpConfig.port ? 'port' : 'host'),
                        corrective: 'Define complete HTTP server configuration with port and host'
                    }
                );
            }

            // Check Express.js configuration
            const expressConfig = applicationConfig.server.express;
            if (!expressConfig) {
                result.addError(
                    'Express.js configuration is missing',
                    'server.express',
                    {
                        code: 'MISSING_EXPRESS_CONFIG',
                        corrective: 'Define Express.js configuration with body parser and security settings'
                    }
                );
            }
        }

        // Validate logging configuration with environment-specific requirements
        logger.debug('Validating logging configuration');
        if (!applicationConfig.logging) {
            result.addError(
                'Logging configuration is missing',
                'logging',
                {
                    code: 'MISSING_LOGGING_CONFIG',
                    corrective: 'Define logging configuration with level and format settings'
                }
            );
        } else {
            const loggingConfig = applicationConfig.logging;
            if (!loggingConfig.level) {
                result.addError(
                    'Logging level is not defined',
                    'logging.level',
                    {
                        code: 'MISSING_LOG_LEVEL',
                        corrective: 'Set logging level (ERROR, WARN, INFO, DEBUG)'
                    }
                );
            }
        }

        // Check cross-configuration dependencies and consistency
        logger.debug('Validating cross-configuration dependencies');
        const crossValidation = {
            portConsistency: false,
            logLevelConsistency: false,
            environmentModeConsistency: false
        };

        // Port consistency check
        if (applicationConfig.environment?.port && applicationConfig.server?.http?.port) {
            crossValidation.portConsistency = applicationConfig.environment.port === applicationConfig.server.http.port;
            if (!crossValidation.portConsistency) {
                result.addError(
                    `Port configuration mismatch: environment.port (${applicationConfig.environment.port}) !== server.http.port (${applicationConfig.server.http.port})`,
                    'crossConfig.port',
                    {
                        code: 'PORT_MISMATCH',
                        environmentPort: applicationConfig.environment.port,
                        serverPort: applicationConfig.server.http.port,
                        corrective: 'Ensure port configuration is consistent across environment and server settings'
                    }
                );
            }
        }

        // Log level consistency check
        if (applicationConfig.environment?.logLevel && applicationConfig.logging?.level) {
            crossValidation.logLevelConsistency = applicationConfig.environment.logLevel.toUpperCase() === applicationConfig.logging.level.toUpperCase();
            if (!crossValidation.logLevelConsistency) {
                result.addError(
                    `Log level mismatch: environment.logLevel (${applicationConfig.environment.logLevel}) !== logging.level (${applicationConfig.logging.level})`,
                    'crossConfig.logLevel',
                    {
                        code: 'LOG_LEVEL_MISMATCH',
                        environmentLogLevel: applicationConfig.environment.logLevel,
                        loggingLevel: applicationConfig.logging.level,
                        corrective: 'Ensure log level is consistent between environment and logging configuration'
                    }
                );
            }
        }

        // Verify configuration completeness and required property presence
        const requiredProperties = ['environment', 'server', 'logging'];
        const missingProperties = requiredProperties.filter(prop => !applicationConfig[prop]);
        
        if (missingProperties.length > 0) {
            result.addError(
                `Missing required configuration sections: ${missingProperties.join(', ')}`,
                'configuration',
                {
                    code: 'MISSING_CONFIG_SECTIONS',
                    missingProperties: missingProperties,
                    corrective: 'Ensure all required configuration sections are defined'
                }
            );
        }

        // Use validateConfiguration utility for comprehensive validation
        try {
            const comprehensiveValidation = validateConfiguration(applicationConfig);
            if (comprehensiveValidation && !comprehensiveValidation.isValid) {
                result.metadata.comprehensiveValidation = comprehensiveValidation;
                result.addError(
                    'Comprehensive configuration validation failed',
                    'comprehensive',
                    {
                        code: 'COMPREHENSIVE_VALIDATION_FAILED',
                        details: comprehensiveValidation.errors || [],
                        corrective: 'Review detailed validation results for specific issues'
                    }
                );
            }
        } catch (validationError) {
            logger.warn(`Comprehensive validation failed: ${validationError.message}`);
        }

        // Generate configuration summary using createEnvironmentSummary
        let configurationSummary = null;
        try {
            configurationSummary = createEnvironmentSummary(applicationConfig.environment || {});
        } catch (summaryError) {
            logger.warn(`Configuration summary generation failed: ${summaryError.message}`);
        }

        // Log validation progress and detailed results using component logger
        result.metadata.crossValidation = crossValidation;
        result.metadata.configurationSummary = configurationSummary;
        result.metadata.totalConfigSections = requiredProperties.length;
        result.metadata.validConfigSections = requiredProperties.length - missingProperties.length;

        // Cache validation results for subsequent quick checks
        validationResults.set('application_configuration', result);

        const hasErrors = result.hasErrors();
        logger.info(`Application configuration validation completed: ${hasErrors ? 'FAILED' : 'PASSED'}`);
        
        if (hasErrors) {
            logger.error(`Application configuration validation failed with ${result.getErrors().length} errors`);
        }

        result.metadata.endTime = new Date().toISOString();

        // Return ValidationResult with complete application configuration status
        return result;

    } catch (error) {
        logger.error(`Application configuration validation process failed: ${error.message}`);
        
        const errorResult = new ValidationResult(false, [{
            message: `Configuration validation process error: ${error.message}`,
            field: 'configuration_validation',
            code: 'CONFIG_VALIDATION_ERROR',
            error: error.message
        }]);
        
        return errorResult;
    }
}

/**
 * Generates a comprehensive validation report including environment status, system requirements,
 * configuration validation results, and corrective recommendations for administrators and developers.
 * 
 * @param {ValidationResult} environmentValidation - Environment validation results
 * @param {ValidationResult} systemValidation - System requirements validation results  
 * @param {ValidationResult} configValidation - Configuration validation results
 * @param {Object} options - Report generation options including format and verbosity
 * @returns {Object} Comprehensive validation report with summary, detailed results, recommendations, and formatted output
 */
function generateValidationReport(environmentValidation, systemValidation, configValidation, options = {}) {
    try {
        logger.debug('Generating comprehensive validation report');

        // Create validation report structure with sections for each validation category
        const report = {
            summary: {
                overallStatus: 'UNKNOWN',
                timestamp: new Date().toISOString(),
                totalValidations: 3,
                passedValidations: 0,
                failedValidations: 0,
                totalErrors: 0,
                totalWarnings: 0
            },
            validations: {
                environment: {
                    status: 'UNKNOWN',
                    errors: [],
                    warnings: [],
                    details: null
                },
                system: {
                    status: 'UNKNOWN',
                    errors: [],
                    warnings: [],
                    details: null
                },
                configuration: {
                    status: 'UNKNOWN',
                    errors: [],
                    warnings: [],
                    details: null
                }
            },
            recommendations: [],
            correctiveActions: [],
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                environment: process.env.NODE_ENV || 'development'
            },
            metadata: {
                reportVersion: '1.0.0',
                generatedBy: 'validate-env.js',
                validationOptions: options
            }
        };

        // Include overall validation status summary with pass/fail indicators
        const validations = [environmentValidation, systemValidation, configValidation];
        const validationNames = ['environment', 'system', 'configuration'];

        validations.forEach((validation, index) => {
            const name = validationNames[index];
            const isValid = validation && !validation.hasErrors();
            
            report.validations[name].status = isValid ? 'PASSED' : 'FAILED';
            report.validations[name].errors = validation ? validation.getErrorMessages() : ['Validation not completed'];
            report.validations[name].details = validation ? validation.metadata : null;

            if (isValid) {
                report.summary.passedValidations++;
            } else {
                report.summary.failedValidations++;
                report.summary.totalErrors += validation ? validation.getErrors().length : 1;
            }
        });

        // Determine overall validation status
        report.summary.overallStatus = report.summary.failedValidations === 0 ? 'PASSED' : 'FAILED';

        // Add environment validation results with detailed error descriptions
        if (environmentValidation) {
            report.validations.environment.details = {
                validatedVariables: environmentValidation.metadata?.totalVariables || 0,
                validVariables: environmentValidation.metadata?.validVariables || 0,
                validationDetails: environmentValidation.metadata?.validationDetails || {}
            };
        }

        // Include system requirements validation with version compatibility details
        if (systemValidation) {
            report.validations.system.details = {
                systemInfo: systemValidation.metadata?.systemInfo || {},
                expressCompatibility: systemValidation.metadata?.expressCompatibility || false,
                recommendations: systemValidation.metadata?.recommendations || []
            };
        }

        // Add application configuration validation with cross-config dependency status
        if (configValidation) {
            report.validations.configuration.details = {
                configSections: configValidation.metadata?.totalConfigSections || 0,
                validSections: configValidation.metadata?.validConfigSections || 0,
                crossValidation: configValidation.metadata?.crossValidation || {},
                configurationSummary: configValidation.metadata?.configurationSummary || null
            };
        }

        // Generate corrective recommendations for each validation failure
        const allErrors = validations.reduce((acc, validation) => {
            if (validation && validation.hasErrors()) {
                acc.push(...validation.getErrors());
            }
            return acc;
        }, []);

        allErrors.forEach(error => {
            if (error.corrective) {
                report.correctiveActions.push({
                    field: error.field,
                    issue: error.message,
                    corrective: error.corrective,
                    code: error.code
                });
            }
        });

        // Include environment information and system details for context
        if (systemValidation && systemValidation.metadata) {
            report.systemInfo = {
                ...report.systemInfo,
                ...systemValidation.metadata.systemInfo,
                environmentInfo: systemValidation.metadata.environmentInfo
            };
        }

        // Generate general recommendations
        if (report.summary.overallStatus === 'FAILED') {
            report.recommendations.push(
                'Review all validation errors and apply corrective actions',
                'Ensure all required environment variables are properly set',
                'Verify system requirements meet minimum specifications',
                'Check configuration consistency across all domains'
            );
        }

        if (process.env.NODE_ENV === 'development') {
            report.recommendations.push(
                'Consider using .env file for environment variable management',
                'Enable verbose logging for detailed debugging information'
            );
        }

        // Add timestamps and validation metadata for audit trail
        report.metadata.validationDuration = {
            environment: environmentValidation?.metadata?.endTime && environmentValidation?.metadata?.startTime
                ? new Date(environmentValidation.metadata.endTime) - new Date(environmentValidation.metadata.startTime)
                : null,
            system: systemValidation?.metadata?.endTime && systemValidation?.metadata?.startTime
                ? new Date(systemValidation.metadata.endTime) - new Date(systemValidation.metadata.startTime)
                : null,
            configuration: configValidation?.metadata?.endTime && configValidation?.metadata?.startTime
                ? new Date(configValidation.metadata.endTime) - new Date(configValidation.metadata.startTime)
                : null
        };

        // Include severity levels for different types of validation issues
        report.severityBreakdown = {
            critical: allErrors.filter(e => e.code && e.code.includes('MISSING')).length,
            major: allErrors.filter(e => e.code && (e.code.includes('INVALID') || e.code.includes('MISMATCH'))).length,
            minor: allErrors.filter(e => e.code && e.code.includes('VERSION')).length
        };

        logger.debug(`Validation report generated: ${report.summary.overallStatus} with ${report.summary.totalErrors} errors`);

        // Return comprehensive validation report ready for display or logging
        return report;

    } catch (error) {
        logger.error(`Validation report generation failed: ${error.message}`);
        
        return {
            summary: {
                overallStatus: 'ERROR',
                timestamp: new Date().toISOString(),
                error: error.message
            },
            validations: {},
            recommendations: ['Fix validation report generation error before proceeding'],
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform
            },
            metadata: {
                reportError: error.message
            }
        };
    }
}

/**
 * Main validation function that orchestrates comprehensive environment validation including
 * required variables, system requirements, and application configuration with detailed
 * reporting and exit code handling.
 * 
 * @param {Object} options - Validation options including strict mode and output format
 * @returns {Object} Complete validation results with exit code, validation status, and comprehensive report
 */
async function runEnvironmentValidation(options = {}) {
    try {
        // Initialize validation process with logger and options configuration
        const startTime = new Date();
        logger.info('Initiating comprehensive environment validation process');
        logger.info(`Validation options: ${JSON.stringify(options)}`);

        const validationResults = {
            exitCode: 0,
            status: 'UNKNOWN',
            report: null,
            error: null,
            executionTime: null
        };

        // Log validation start message with script version and options
        logger.info('='.repeat(60));
        logger.info('Node.js Tutorial Application - Environment Validation');
        logger.info('Version: 1.0.0');
        logger.info(`Node.js: ${process.version}`);
        logger.info(`Platform: ${process.platform} ${process.arch}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('='.repeat(60));

        // Run required environment variables validation using validateRequiredEnvironmentVariables
        logger.info('Phase 1: Validating required environment variables...');
        const environmentValidation = await validateRequiredEnvironmentVariables(options);
        
        // Execute system requirements validation using validateSystemRequirements
        logger.info('Phase 2: Validating system requirements...');
        const systemValidation = await validateSystemRequirements(options);
        
        // Perform application configuration validation using validateApplicationConfiguration
        logger.info('Phase 3: Validating application configuration...');
        const configValidation = await validateApplicationConfiguration(options.configOverrides);

        // Determine overall validation status based on all validation results
        const hasEnvironmentErrors = environmentValidation.hasErrors();
        const hasSystemErrors = systemValidation.hasErrors();
        const hasConfigErrors = configValidation.hasErrors();
        const hasAnyErrors = hasEnvironmentErrors || hasSystemErrors || hasConfigErrors;

        // Generate comprehensive validation report using generateValidationReport
        logger.info('Phase 4: Generating validation report...');
        const validationReport = generateValidationReport(
            environmentValidation,
            systemValidation,
            configValidation,
            options
        );

        // Determine appropriate exit code based on validation outcomes
        let exitCode = 0; // SUCCESS
        if (hasAnyErrors) {
            if (options.strict || hasEnvironmentErrors || hasSystemErrors) {
                exitCode = 1; // VALIDATION_FAILED
            } else if (hasConfigErrors) {
                exitCode = 1; // VALIDATION_FAILED
            }
        }

        // Set validation status
        const status = hasAnyErrors ? 'FAILED' : 'PASSED';

        // Log validation completion with success or failure status
        const endTime = new Date();
        const executionTime = endTime - startTime;
        
        logger.info('='.repeat(60));
        logger.info(`Validation Status: ${status}`);
        logger.info(`Execution Time: ${executionTime}ms`);
        logger.info(`Exit Code: ${exitCode}`);
        logger.info('='.repeat(60));

        if (hasAnyErrors) {
            logger.error(`Validation completed with errors:`);
            logger.error(`- Environment errors: ${environmentValidation.getErrors().length}`);
            logger.error(`- System errors: ${systemValidation.getErrors().length}`);
            logger.error(`- Configuration errors: ${configValidation.getErrors().length}`);
        } else {
            logger.info('All validations passed successfully!');
        }

        // Cache validation results for subsequent script runs
        validationResults.exitCode = exitCode;
        validationResults.status = status;
        validationResults.report = validationReport;
        validationResults.executionTime = executionTime;

        // Cache individual validation results
        validationResults.set('environment_validation', environmentValidation);
        validationResults.set('system_validation', systemValidation);
        validationResults.set('configuration_validation', configValidation);
        validationResults.set('validation_report', validationReport);

        // Return complete validation results with exit code and status information
        return validationResults;

    } catch (error) {
        logger.error(`Environment validation process failed: ${error.message}`);
        logger.error(`Stack trace: ${error.stack}`);

        return {
            exitCode: 2, // SYSTEM_ERROR
            status: 'ERROR',
            report: {
                summary: {
                    overallStatus: 'ERROR',
                    timestamp: new Date().toISOString(),
                    error: error.message
                }
            },
            error: error.message,
            executionTime: null
        };
    }
}

/**
 * Displays a formatted validation summary to the console with color-coded results,
 * error counts, and quick overview of validation status for immediate feedback to developers.
 * 
 * @param {Object} validationReport - Complete validation report with summary and details
 * @param {Object} options - Display options including colors and verbosity
 * @returns {void} Outputs formatted validation summary to console
 */
function displayValidationSummary(validationReport, options = {}) {
    try {
        // Extract validation summary statistics from validation report
        const summary = validationReport.summary;
        const useColors = options.colors !== false && process.stdout.isTTY;

        // Color codes for output formatting
        const colors = useColors ? {
            green: '\x1b[32m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            bold: '\x1b[1m',
            reset: '\x1b[0m'
        } : {
            green: '', red: '', yellow: '', blue: '', bold: '', reset: ''
        };

        console.log('\n' + '='.repeat(80));
        console.log(`${colors.bold}ENVIRONMENT VALIDATION SUMMARY${colors.reset}`);
        console.log('='.repeat(80));

        // Format overall validation status with color coding (green/red)
        const statusColor = summary.overallStatus === 'PASSED' ? colors.green : colors.red;
        console.log(`${colors.bold}Overall Status:${colors.reset} ${statusColor}${summary.overallStatus}${colors.reset}`);
        console.log(`${colors.bold}Timestamp:${colors.reset} ${summary.timestamp}`);

        // Display environment validation status with error/warning counts
        console.log(`\n${colors.bold}Validation Results:${colors.reset}`);
        console.log(`├── Environment Variables: ${getStatusIndicator(validationReport.validations.environment.status, colors)}`);
        console.log(`├── System Requirements: ${getStatusIndicator(validationReport.validations.system.status, colors)}`);
        console.log(`└── Application Configuration: ${getStatusIndicator(validationReport.validations.configuration.status, colors)}`);

        // Show system requirements validation with compatibility status
        if (validationReport.systemInfo) {
            console.log(`\n${colors.bold}System Information:${colors.reset}`);
            console.log(`├── Node.js Version: ${colors.blue}${validationReport.systemInfo.nodeVersion}${colors.reset}`);
            console.log(`├── Platform: ${validationReport.systemInfo.platform} (${validationReport.systemInfo.architecture})`);
            console.log(`└── Environment: ${validationReport.systemInfo.environment}`);
        }

        // Include quick statistics summary with pass/fail counts
        console.log(`\n${colors.bold}Statistics:${colors.reset}`);
        console.log(`├── Total Validations: ${summary.totalValidations}`);
        console.log(`├── Passed: ${colors.green}${summary.passedValidations}${colors.reset}`);
        console.log(`├── Failed: ${colors.red}${summary.failedValidations}${colors.reset}`);
        console.log(`├── Total Errors: ${colors.red}${summary.totalErrors}${colors.reset}`);
        console.log(`└── Total Warnings: ${colors.yellow}${summary.totalWarnings}${colors.reset}`);

        // Add execution time and validation metadata for performance tracking
        if (validationReport.metadata && validationReport.metadata.validationDuration) {
            console.log(`\n${colors.bold}Performance:${colors.reset}`);
            const durations = validationReport.metadata.validationDuration;
            if (durations.environment) console.log(`├── Environment Validation: ${durations.environment}ms`);
            if (durations.system) console.log(`├── System Validation: ${durations.system}ms`);
            if (durations.configuration) console.log(`└── Configuration Validation: ${durations.configuration}ms`);
        }

        // Display corrective recommendations summary if validation failed
        if (summary.overallStatus === 'FAILED' && validationReport.recommendations.length > 0) {
            console.log(`\n${colors.bold}Quick Recommendations:${colors.reset}`);
            validationReport.recommendations.slice(0, 3).forEach((rec, index) => {
                const prefix = index === validationReport.recommendations.slice(0, 3).length - 1 ? '└──' : '├──';
                console.log(`${prefix} ${colors.yellow}${rec}${colors.reset}`);
            });
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error(`Failed to display validation summary: ${error.message}`);
    }
}

/**
 * Helper function to get status indicator with colors
 */
function getStatusIndicator(status, colors) {
    switch (status) {
        case 'PASSED':
            return `${colors.green}✓ PASSED${colors.reset}`;
        case 'FAILED':
            return `${colors.red}✗ FAILED${colors.reset}`;
        default:
            return `${colors.yellow}? UNKNOWN${colors.reset}`;
    }
}

/**
 * Displays detailed error information including specific field errors, validation rules
 * that failed, and corrective guidance for each validation failure to help developers
 * resolve configuration issues.
 * 
 * @param {ValidationResult} validationResult - Validation result with error details
 * @param {string} category - Validation category name for display
 * @param {Object} options - Display options including colors and verbosity
 * @returns {void} Outputs detailed error information to console with corrective guidance
 */
function displayDetailedErrors(validationResult, category, options = {}) {
    try {
        // Check if validation result contains errors using hasErrors method
        if (!validationResult.hasErrors()) {
            return; // No errors to display
        }

        const useColors = options.colors !== false && process.stdout.isTTY;
        const colors = useColors ? {
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            bold: '\x1b[1m',
            reset: '\x1b[0m'
        } : {
            red: '', yellow: '', blue: '', bold: '', reset: ''
        };

        // Extract detailed error information using getErrors method
        const errors = validationResult.getErrors();
        
        console.log(`\n${colors.bold}${category.toUpperCase()} VALIDATION ERRORS:${colors.reset}`);
        console.log('-'.repeat(60));

        // Group errors by field name and error type for organized display
        errors.forEach((error, index) => {
            const isLast = index === errors.length - 1;
            const prefix = isLast ? '└──' : '├──';
            
            // Format each error with field name, error message, and current value
            console.log(`${prefix} ${colors.red}Error ${index + 1}:${colors.reset}`);
            console.log(`    Field: ${colors.blue}${error.field}${colors.reset}`);
            console.log(`    Issue: ${error.message}`);
            
            // Include validation rule information that failed for context
            if (error.code) {
                console.log(`    Code: ${colors.yellow}${error.code}${colors.reset}`);
            }
            
            if (error.currentValue !== undefined) {
                console.log(`    Current Value: ${error.currentValue}`);
            }
            
            if (error.constraint) {
                console.log(`    Required: ${error.constraint}`);
            }
            
            // Add specific corrective guidance with examples for each error type
            if (error.corrective) {
                console.log(`    ${colors.bold}Corrective Action:${colors.reset} ${colors.yellow}${error.corrective}${colors.reset}`);
            }
            
            if (!isLast) {
                console.log('');
            }
        });

        console.log('-'.repeat(60));

    } catch (error) {
        console.error(`Failed to display detailed errors: ${error.message}`);
    }
}

/**
 * Handles script exit based on validation results including appropriate exit codes,
 * final logging, and cleanup operations for proper script termination and integration
 * with CI/CD pipelines.
 * 
 * @param {Object} validationResults - Complete validation results with exit code and status
 * @param {Object} options - Exit handling options
 * @returns {void} Exits script with appropriate exit code
 */
function handleValidationExit(validationResults, options = {}) {
    try {
        // Determine appropriate exit code based on validation results severity
        const exitCode = validationResults.exitCode || 0;
        const status = validationResults.status || 'UNKNOWN';

        // Log final validation status with exit code information
        logger.info(`Final validation status: ${status}`);
        logger.info(`Exit code: ${exitCode}`);
        
        // Display final summary message with validation outcome
        const useColors = options.colors !== false && process.stdout.isTTY;
        const colors = useColors ? {
            green: '\x1b[32m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            bold: '\x1b[1m',
            reset: '\x1b[0m'
        } : {
            green: '', red: '', yellow: '', blue: '', bold: '', reset: ''
        };

        console.log(`\n${colors.bold}Validation Complete${colors.reset}`);
        
        switch (exitCode) {
            case 0:
                console.log(`${colors.green}✓ All validations passed successfully!${colors.reset}`);
                console.log('Environment is ready for application startup.');
                break;
            case 1:
                console.log(`${colors.red}✗ Validation failed with configuration errors.${colors.reset}`);
                console.log('Please review and fix the reported issues before starting the application.');
                break;
            case 2:
                console.log(`${colors.red}✗ System error occurred during validation.${colors.reset}`);
                console.log('Please check the system configuration and try again.');
                break;
            default:
                console.log(`${colors.yellow}? Unknown validation status.${colors.reset}`);
                break;
        }

        // Clean up any temporary resources or cached validation data
        validationResults.clear();
        
        // Flush logger output to ensure all messages are displayed
        // Note: In production environments, you might want to ensure proper logger flushing
        
        // Set appropriate exit code: 0 for success, 1 for validation failures, 2 for system errors
        console.log(`\nExiting with code: ${exitCode}\n`);
        
        // Execute process.exit with determined exit code for proper script termination
        process.exit(exitCode);

    } catch (error) {
        console.error(`Error during exit handling: ${error.message}`);
        process.exit(2); // SYSTEM_ERROR
    }
}

/**
 * Main entry point function that parses command line arguments, configures validation options,
 * and orchestrates the complete environment validation process with proper error handling
 * and exit code management.
 * 
 * @returns {Promise<void>} Async function that completes environment validation and exits with appropriate code
 */
async function main() {
    try {
        // Parse command line arguments for validation options and flags
        const args = process.argv.slice(2);
        const parsedOptions = {
            verbose: false,
            strict: false,
            quiet: false,
            help: false,
            format: 'console',
            configFile: null,
            colors: process.stdout.isTTY
        };

        // Simple argument parsing
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            switch (arg) {
                case '-h':
                case '--help':
                    parsedOptions.help = true;
                    break;
                case '-v':
                case '--verbose':
                    parsedOptions.verbose = true;
                    break;
                case '-s':
                case '--strict':
                    parsedOptions.strict = true;
                    break;
                case '-q':
                case '--quiet':
                    parsedOptions.quiet = true;
                    break;
                case '-f':
                case '--format':
                    if (i + 1 < args.length) {
                        parsedOptions.format = args[++i];
                    }
                    break;
                case '-c':
                case '--config':
                    if (i + 1 < args.length) {
                        parsedOptions.configFile = args[++i];
                    }
                    break;
                case '--no-colors':
                    parsedOptions.colors = false;
                    break;
            }
        }

        // Display help information if requested
        if (parsedOptions.help) {
            displayHelp();
            process.exit(0);
            return;
        }

        // Configure validation options based on command line parameters
        const validationOptions = {
            ...validationOptions,
            strict: parsedOptions.strict,
            verbose: parsedOptions.verbose,
            quiet: parsedOptions.quiet,
            format: parsedOptions.format,
            colors: parsedOptions.colors
        };

        // Set up global error handling for uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error(`Uncaught exception: ${error.message}`);
            logger.error(`Stack trace: ${error.stack}`);
            console.error('A critical error occurred. Exiting with code 2.');
            process.exit(2);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error(`Unhandled rejection at ${promise}: ${reason}`);
            console.error('An unhandled promise rejection occurred. Exiting with code 2.');
            process.exit(2);
        });

        // Initialize logger with appropriate log level for validation script
        if (!parsedOptions.quiet) {
            logger.info('Node.js Tutorial Application - Environment Validation Script');
            logger.info(`Starting validation with options: ${JSON.stringify(validationOptions)}`);
        }

        // Execute runEnvironmentValidation with configured options
        const results = await runEnvironmentValidation(validationOptions);

        // Handle validation results and generate comprehensive report
        if (!parsedOptions.quiet) {
            if (parsedOptions.format === 'json') {
                console.log(JSON.stringify(results.report, null, 2));
            } else {
                // Display validation summary and detailed errors if present
                displayValidationSummary(results.report, validationOptions);
                
                if (results.report && results.report.summary.overallStatus === 'FAILED') {
                    // Display detailed errors for each failed validation category
                    const failedValidations = Object.entries(results.report.validations)
                        .filter(([_, validation]) => validation.status === 'FAILED');
                    
                    failedValidations.forEach(([category, validation]) => {
                        if (validation.errors.length > 0) {
                            const validationResult = validationResults.get(`${category}_validation`);
                            if (validationResult) {
                                displayDetailedErrors(validationResult, category, validationOptions);
                            }
                        }
                    });
                }
            }
        }

        // Handle script exit with appropriate exit code using handleValidationExit
        handleValidationExit(results, validationOptions);

    } catch (error) {
        // Catch and handle any unexpected errors with proper logging and exit codes
        logger.error(`Main process error: ${error.message}`);
        logger.error(`Stack trace: ${error.stack}`);
        
        console.error(`\nCritical error in validation script: ${error.message}`);
        console.error('Exiting with system error code.\n');
        
        process.exit(2); // SYSTEM_ERROR
    }
}

/**
 * Displays help information for the validation script
 */
function displayHelp() {
    console.log(`
Node.js Tutorial Application - Environment Validation Script

USAGE:
    node scripts/validate-env.js [options]

OPTIONS:
    -h, --help          Display this help information
    -v, --verbose       Enable verbose output with detailed information
    -s, --strict        Enable strict validation mode (warnings treated as errors)
    -q, --quiet         Suppress non-essential output, show only errors
    -f, --format        Output format: console (default), json, or summary
    -c, --config        Specify custom configuration file path
    --no-colors         Disable colored output

EXAMPLES:
    node scripts/validate-env.js                    # Basic validation
    node scripts/validate-env.js --verbose          # Verbose output
    node scripts/validate-env.js --strict           # Strict mode
    node scripts/validate-env.js --format json      # JSON output
    node scripts/validate-env.js --quiet            # Minimal output

EXIT CODES:
    0    Success - all validations passed
    1    Validation failed - configuration errors found
    2    System error - script execution failed
    3    Configuration error - invalid configuration
    4    Invalid arguments - command line argument error

For more information, visit: https://github.com/nodejs-tutorial-app
`);
}

// Export functions for programmatic use and testing
module.exports = {
    // Main validation function for programmatic use in other scripts or applications
    runEnvironmentValidation,
    
    // Environment variable validation utility for standalone use in configuration validation
    validateRequiredEnvironmentVariables,
    
    // System requirements validation utility for deployment and setup verification
    validateSystemRequirements,
    
    // Application configuration validation utility for comprehensive configuration checking
    validateApplicationConfiguration,
    
    // Validation report generation utility for creating formatted validation summaries
    generateValidationReport
};

// Execute main function if script is run directly (not imported as module)
if (require.main === module) {
    main().catch(error => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(2);
    });
}