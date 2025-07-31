/**
 * Comprehensive Health Check Script for Node.js Tutorial Application
 * 
 * This health check script provides comprehensive system health validation for the Node.js 
 * tutorial application. Implements health monitoring capabilities by checking server status, 
 * system resources, configuration validity, and application responsiveness. Supports both 
 * command-line execution and programmatic health checking with structured output and 
 * configurable health thresholds.
 * 
 * Features:
 * - System health monitoring (uptime, memory, CPU utilization)
 * - HTTP server health validation via endpoint testing
 * - Configuration integrity validation
 * - Express.js middleware for /health endpoint
 * - Command-line interface with formatted output
 * - Threshold-based pass/fail determination
 * - Educational demonstration of monitoring patterns
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import http module for health check HTTP client requests - Node.js built-in
const http = require('http');

// Import application configuration for health check validation and environment settings
const { 
    config,
    serverConfig,
    loggingConfig 
} = require('../config/index.js');

// Import logger factory function for creating component-specific logger with structured output
const { getLogger } = require('../utils/logger.js');

// Import HTTP status code constants for health check response formatting
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import application metadata constants for health check identification
const { 
    APPLICATION 
} = require('../utils/constants.js');

// Import route path constants for health check endpoint validation
const { 
    ROUTES 
} = require('../utils/constants.js');

// Import Node.js runtime information utility for system health reporting
const { 
    getNodeJSInfo,
    createEnvironmentSummary,
    isProductionEnvironment 
} = require('../utils/environment.js');

/**
 * Component-specific logger for health check operations with structured output
 * @type {Object}
 */
const logger = getLogger('health-check');

/**
 * Health check configuration from server configuration with fallback defaults
 * @type {Object}
 */
const healthConfig = config.server?.health || {};

/**
 * Default timeout for health check operations in milliseconds
 * @type {number}
 */
const checkTimeout = 5000;

/**
 * Performs comprehensive system health check including process uptime, memory usage, 
 * CPU utilization, and system resource availability with configurable thresholds.
 * Evaluates system metrics against health thresholds to determine overall system status.
 * 
 * @param {Object} options - Health check options and configuration parameters
 * @param {Object} options.thresholds - Custom health thresholds for system metrics
 * @param {boolean} options.includeDetailedMetrics - Include detailed system metrics in response
 * @returns {Object} System health status object with metrics, status, and detailed information
 */
function checkSystemHealth(options = {}) {
    try {
        logger.info('Starting comprehensive system health check');

        // Get current process uptime using process.uptime() for availability tracking
        const uptimeSeconds = process.uptime();
        const uptimeFormatted = Math.round(uptimeSeconds);

        logger.debug(`Process uptime: ${uptimeFormatted} seconds`);

        // Collect memory usage statistics using process.memoryUsage() for resource monitoring
        const memoryUsage = process.memoryUsage();
        const memoryMetrics = {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // Resident Set Size in MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // Heap used in MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // Total heap in MB
            external: Math.round(memoryUsage.external / 1024 / 1024) // External memory in MB
        };

        logger.debug('Memory usage collected', memoryMetrics);

        // Get Node.js runtime information using getNodeJSInfo function
        const runtimeInfo = getNodeJSInfo();

        logger.debug('Node.js runtime information retrieved', { 
            version: runtimeInfo.node.version,
            platform: runtimeInfo.node.platform 
        });

        // Calculate system load and resource utilization metrics
        const systemMetrics = {
            uptime: {
                seconds: uptimeSeconds,
                formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${Math.floor(uptimeSeconds % 60)}s`
            },
            memory: memoryMetrics,
            runtime: {
                nodeVersion: runtimeInfo.node.version,
                platform: runtimeInfo.node.platform,
                architecture: runtimeInfo.node.architecture,
                processId: runtimeInfo.node.processId,
                v8Version: runtimeInfo.node.v8Version
            },
            timestamp: new Date().toISOString()
        };

        // Define default health thresholds for system metrics evaluation
        const defaultThresholds = {
            maxMemoryUsage: healthConfig.maxMemoryUsage || 100, // MB
            minUptime: healthConfig.minUptime || 10, // seconds
            maxResponseTime: healthConfig.maxResponseTime || 1000 // milliseconds
        };

        const thresholds = { ...defaultThresholds, ...options.thresholds };

        logger.debug('Health thresholds configured', thresholds);

        // Evaluate health thresholds against collected metrics
        const thresholdResults = {
            memoryUsage: {
                current: memoryMetrics.rss,
                threshold: thresholds.maxMemoryUsage,
                status: memoryMetrics.rss <= thresholds.maxMemoryUsage ? 'pass' : 'fail',
                message: `Memory usage: ${memoryMetrics.rss}MB (limit: ${thresholds.maxMemoryUsage}MB)`
            },
            uptime: {
                current: uptimeSeconds,
                threshold: thresholds.minUptime,
                status: uptimeSeconds >= thresholds.minUptime ? 'pass' : 'fail',
                message: `Uptime: ${uptimeFormatted}s (minimum: ${thresholds.minUptime}s)`
            }
        };

        // Determine overall system health status based on threshold evaluation
        const failedThresholds = Object.values(thresholdResults).filter(result => result.status === 'fail');
        const overallStatus = failedThresholds.length === 0 ? 'healthy' : 'unhealthy';

        logger.info(`System health check completed - Status: ${overallStatus}`, {
            failedThresholds: failedThresholds.length,
            totalThresholds: Object.keys(thresholdResults).length
        });

        // Generate system health summary with timestamps and status indicators
        const healthSummary = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: systemMetrics.uptime,
            memory: systemMetrics.memory,
            runtime: systemMetrics.runtime,
            thresholds: thresholdResults,
            failedChecks: failedThresholds.length,
            totalChecks: Object.keys(thresholdResults).length
        };

        // Include detailed metrics if requested in options
        if (options.includeDetailedMetrics) {
            healthSummary.detailedMetrics = {
                processInfo: {
                    cwd: process.cwd(),
                    execPath: process.execPath,
                    argv0: process.argv0
                },
                environmentVariables: {
                    NODE_ENV: process.env.NODE_ENV,
                    PORT: process.env.PORT,
                    HOST: process.env.HOST
                }
            };
        }

        // Return comprehensive system health object with detailed metrics
        return healthSummary;

    } catch (error) {
        logger.error('System health check failed', { error: error.message, stack: error.stack });

        // Return error status with diagnostic information
        return {
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            failedChecks: 1,
            totalChecks: 1
        };
    }
}

/**
 * Validates HTTP server health by performing local HTTP requests to the application 
 * endpoints and verifying response times and status codes. Tests server responsiveness
 * and endpoint availability through actual HTTP communication.
 * 
 * @param {Object} serverConfig - Server configuration object with host and port information
 * @param {Object} options - HTTP health check options and timeout settings
 * @returns {Promise<Object>} Server health status with response times, endpoint availability, and error details
 */
function checkServerHealth(serverConfig = {}, options = {}) {
    return new Promise((resolve) => {
        try {
            logger.info('Starting HTTP server health validation');

            // Extract server host and port from configuration for health check requests
            const host = serverConfig.http?.host || config.environment?.host || 'localhost';
            const port = serverConfig.http?.port || config.environment?.port || 3000;
            const timeout = options.timeout || checkTimeout;

            logger.debug('Server health check configuration', { host, port, timeout });

            // Create HTTP request options for health check endpoint validation
            const requestOptions = {
                hostname: host,
                port: port,
                path: '/hello',
                method: 'GET',
                timeout: timeout,
                headers: {
                    'User-Agent': `${APPLICATION.NAME}/${APPLICATION.VERSION} (health-check)`
                }
            };

            logger.debug('HTTP request options configured', requestOptions);

            const startTime = Date.now();

            // Perform HTTP GET request to /hello endpoint with timeout handling
            const request = http.request(requestOptions, (response) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                logger.debug('HTTP response received', { 
                    statusCode: response.statusCode, 
                    responseTime: `${responseTime}ms` 
                });

                let responseData = '';

                // Collect response data for content validation
                response.on('data', (chunk) => {
                    responseData += chunk;
                });

                response.on('end', () => {
                    try {
                        // Measure response time and validate response content against expected values
                        const isHealthy = response.statusCode === 200 && responseData.includes('Hello world');
                        const status = isHealthy ? 'healthy' : 'unhealthy';

                        logger.info(`Server health check completed - Status: ${status}`, {
                            statusCode: response.statusCode,
                            responseTime: `${responseTime}ms`,
                            responseContent: responseData.substring(0, 50)
                        });

                        // Compile server health results with response metrics and status
                        const healthResult = {
                            status: status,
                            timestamp: new Date().toISOString(),
                            endpoint: {
                                url: `http://${host}:${port}/hello`,
                                method: 'GET',
                                statusCode: response.statusCode,
                                responseTime: responseTime,
                                timeout: timeout
                            },
                            response: {
                                contentLength: responseData.length,
                                contentPreview: responseData.substring(0, 100),
                                headers: response.headers
                            },
                            validation: {
                                statusCodeValid: response.statusCode === 200,
                                contentValid: responseData.includes('Hello world'),
                                responseTimeAcceptable: responseTime < timeout
                            }
                        };

                        resolve(healthResult);

                    } catch (processError) {
                        logger.error('Error processing server health response', { 
                            error: processError.message 
                        });

                        resolve({
                            status: 'error',
                            timestamp: new Date().toISOString(),
                            error: `Response processing failed: ${processError.message}`,
                            endpoint: { url: `http://${host}:${port}/hello` }
                        });
                    }
                });
            });

            // Handle HTTP request errors and timeouts
            request.on('error', (error) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                logger.error('HTTP request failed', { 
                    error: error.message, 
                    responseTime: `${responseTime}ms` 
                });

                resolve({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    endpoint: {
                        url: `http://${host}:${port}/hello`,
                        method: 'GET',
                        responseTime: responseTime,
                        timeout: timeout
                    },
                    errorType: error.code || 'HTTP_REQUEST_ERROR'
                });
            });

            request.on('timeout', () => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                logger.warn('HTTP request timeout', { 
                    timeout: `${timeout}ms`, 
                    responseTime: `${responseTime}ms` 
                });

                request.destroy();

                resolve({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: `Request timeout after ${timeout}ms`,
                    endpoint: {
                        url: `http://${host}:${port}/hello`,
                        method: 'GET',
                        responseTime: responseTime,
                        timeout: timeout
                    },
                    errorType: 'TIMEOUT'
                });
            });

            // Send the HTTP request
            request.end();

        } catch (error) {
            logger.error('Server health check setup failed', { error: error.message });

            resolve({
                status: 'error',
                timestamp: new Date().toISOString(),
                error: `Health check setup failed: ${error.message}`,
                errorType: 'SETUP_ERROR'
            });
        }
    });
}

/**
 * Validates application configuration integrity including environment variables, 
 * server settings, and configuration consistency checks. Ensures all required
 * configuration is present and valid for application operation.
 * 
 * @param {Object} options - Configuration validation options
 * @returns {Object} Configuration health status with validation results and any configuration issues
 */
function checkConfigurationHealth(options = {}) {
    try {
        logger.info('Starting configuration health validation');

        const validationResults = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            validations: {},
            errors: [],
            warnings: [],
            summary: {
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 0
            }
        };

        // Validate environment configuration using existing validation utilities
        logger.debug('Validating environment configuration');
        
        const environmentValidation = {
            port: {
                value: config.environment?.port,
                isValid: typeof config.environment?.port === 'number' && config.environment.port > 0 && config.environment.port <= 65535,
                message: config.environment?.port ? `Port ${config.environment.port} is valid` : 'Port configuration missing'
            },
            host: {
                value: config.environment?.host,
                isValid: typeof config.environment?.host === 'string' && config.environment.host.length > 0,
                message: config.environment?.host ? `Host ${config.environment.host} is valid` : 'Host configuration missing'
            },
            nodeEnv: {
                value: config.environment?.nodeEnv,
                isValid: ['development', 'production', 'test'].includes(config.environment?.nodeEnv),
                message: config.environment?.nodeEnv ? `Environment ${config.environment.nodeEnv} is valid` : 'NODE_ENV configuration missing'
            }
        };

        validationResults.validations.environment = environmentValidation;
        validationResults.summary.totalChecks += Object.keys(environmentValidation).length;
        validationResults.summary.passedChecks += Object.values(environmentValidation).filter(v => v.isValid).length;
        validationResults.summary.failedChecks += Object.values(environmentValidation).filter(v => !v.isValid).length;

        // Check server configuration parameters for completeness and validity
        logger.debug('Validating server configuration');

        const serverValidation = {
            httpConfig: {
                value: serverConfig?.http,
                isValid: serverConfig?.http && typeof serverConfig.http === 'object',
                message: serverConfig?.http ? 'HTTP server configuration is present' : 'HTTP server configuration missing'
            },
            expressConfig: {
                value: serverConfig?.express,
                isValid: serverConfig?.express && typeof serverConfig.express === 'object',
                message: serverConfig?.express ? 'Express configuration is present' : 'Express configuration missing'
            }
        };

        validationResults.validations.server = serverValidation;
        validationResults.summary.totalChecks += Object.keys(serverValidation).length;
        validationResults.summary.passedChecks += Object.values(serverValidation).filter(v => v.isValid).length;
        validationResults.summary.failedChecks += Object.values(serverValidation).filter(v => !v.isValid).length;

        // Verify logging configuration and accessibility
        logger.debug('Validating logging configuration');

        const loggingValidation = {
            logLevel: {
                value: loggingConfig?.level,
                isValid: ['error', 'warn', 'info', 'debug'].includes(loggingConfig?.level),
                message: loggingConfig?.level ? `Log level ${loggingConfig.level} is valid` : 'Log level configuration missing'
            },
            consoleConfig: {
                value: loggingConfig?.console,
                isValid: loggingConfig?.console && typeof loggingConfig.console === 'object',
                message: loggingConfig?.console ? 'Console logging configuration is present' : 'Console logging configuration missing'
            }
        };

        validationResults.validations.logging = loggingValidation;
        validationResults.summary.totalChecks += Object.keys(loggingValidation).length;
        validationResults.summary.passedChecks += Object.values(loggingValidation).filter(v => v.isValid).length;
        validationResults.summary.failedChecks += Object.values(loggingValidation).filter(v => !v.isValid).length;

        // Validate cross-configuration dependencies and consistency
        logger.debug('Validating cross-configuration dependencies');

        const crossValidation = {
            portConsistency: {
                value: `env:${config.environment?.port} vs server:${serverConfig?.http?.port}`,
                isValid: config.environment?.port === serverConfig?.http?.port,
                message: config.environment?.port === serverConfig?.http?.port ? 
                    'Port configuration is consistent' : 
                    'Port configuration mismatch between environment and server'
            }
        };

        validationResults.validations.crossValidation = crossValidation;
        validationResults.summary.totalChecks += Object.keys(crossValidation).length;
        validationResults.summary.passedChecks += Object.values(crossValidation).filter(v => v.isValid).length;
        validationResults.summary.failedChecks += Object.values(crossValidation).filter(v => !v.isValid).length;

        // Collect all validation errors and warnings
        const allValidations = [
            ...Object.values(environmentValidation),
            ...Object.values(serverValidation),
            ...Object.values(loggingValidation),
            ...Object.values(crossValidation)
        ];

        allValidations.forEach(validation => {
            if (!validation.isValid) {
                validationResults.errors.push(validation.message);
            }
        });

        // Determine overall configuration health status
        if (validationResults.summary.failedChecks > 0) {
            validationResults.status = 'unhealthy';
        }

        logger.info(`Configuration health check completed - Status: ${validationResults.status}`, {
            passedChecks: validationResults.summary.passedChecks,
            failedChecks: validationResults.summary.failedChecks,
            totalChecks: validationResults.summary.totalChecks
        });

        // Return configuration health object with validation summary and recommendations
        return validationResults;

    } catch (error) {
        logger.error('Configuration health check failed', { error: error.message });

        return {
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            summary: {
                totalChecks: 1,
                passedChecks: 0,
                failedChecks: 1
            }
        };
    }
}

/**
 * Main health check orchestration function that coordinates system, server, and 
 * configuration health checks with comprehensive reporting and status determination.
 * Executes all health check categories and aggregates results into unified report.
 * 
 * @param {Object} options - Health check execution options and configuration
 * @param {number} options.timeout - Overall health check timeout in milliseconds
 * @param {boolean} options.includeDetailedMetrics - Include detailed metrics in response
 * @returns {Promise<Object>} Complete health check results with overall status, individual check results, and summary
 */
async function performHealthCheck(options = {}) {
    try {
        // Initialize health check execution with timestamp and check ID
        const healthCheckId = `health-check-${Date.now()}`;
        const startTime = Date.now();

        logger.info('Starting comprehensive health check execution', { 
            healthCheckId, 
            options 
        });

        const healthCheckResults = {
            id: healthCheckId,
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: {},
            summary: {
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 0,
                executionTime: 0
            },
            metadata: {
                application: APPLICATION.NAME,
                version: APPLICATION.VERSION,
                environment: config.environment?.nodeEnv || 'development',
                executionEnvironment: {
                    isProduction: isProductionEnvironment(),
                    nodeVersion: process.version,
                    platform: process.platform
                }
            }
        };

        // Perform system health check using checkSystemHealth function
        logger.debug('Executing system health check');
        const systemHealth = checkSystemHealth(options);
        healthCheckResults.checks.system = systemHealth;
        healthCheckResults.summary.totalChecks++;

        if (systemHealth.status === 'healthy') {
            healthCheckResults.summary.passedChecks++;
        } else {
            healthCheckResults.summary.failedChecks++;
            healthCheckResults.status = 'unhealthy';
        }

        // Execute server health validation using checkServerHealth function
        logger.debug('Executing server health check');
        const serverHealth = await checkServerHealth(serverConfig, options);
        healthCheckResults.checks.server = serverHealth;
        healthCheckResults.summary.totalChecks++;

        if (serverHealth.status === 'healthy') {
            healthCheckResults.summary.passedChecks++;
        } else {
            healthCheckResults.summary.failedChecks++;
            healthCheckResults.status = 'unhealthy';
        }

        // Validate configuration health using checkConfigurationHealth function
        logger.debug('Executing configuration health check');
        const configHealth = checkConfigurationHealth(options);
        healthCheckResults.checks.configuration = configHealth;
        healthCheckResults.summary.totalChecks++;

        if (configHealth.status === 'healthy') {
            healthCheckResults.summary.passedChecks++;
        } else {
            healthCheckResults.summary.failedChecks++;
            healthCheckResults.status = 'unhealthy';
        }

        // Calculate health check execution time and performance metrics
        const endTime = Date.now();
        healthCheckResults.summary.executionTime = endTime - startTime;

        // Generate comprehensive health report with all check results
        const healthReport = {
            ...healthCheckResults,
            overallHealth: {
                status: healthCheckResults.status,
                score: Math.round((healthCheckResults.summary.passedChecks / healthCheckResults.summary.totalChecks) * 100),
                recommendation: healthCheckResults.status === 'healthy' ? 
                    'All health checks passed successfully' : 
                    'Some health checks failed - review individual check results'
            }
        };

        // Log health check completion and results summary
        logger.info('Health check execution completed', {
            healthCheckId,
            status: healthCheckResults.status,
            executionTime: `${healthCheckResults.summary.executionTime}ms`,
            passedChecks: healthCheckResults.summary.passedChecks,
            failedChecks: healthCheckResults.summary.failedChecks
        });

        // Return complete health check object with detailed status information
        return healthReport;

    } catch (error) {
        logger.error('Health check execution failed', { 
            error: error.message, 
            stack: error.stack 
        });

        // Return error health check result
        return {
            id: `health-check-error-${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error.message,
            checks: {},
            summary: {
                totalChecks: 1,
                passedChecks: 0,
                failedChecks: 1,
                executionTime: 0
            }
        };
    }
}

/**
 * Generates structured health report with formatted output suitable for console display,
 * logging, or API responses with customizable detail levels and presentation formats.
 * 
 * @param {Object} healthResults - Complete health check results object
 * @param {Object} formatOptions - Formatting options for output presentation
 * @param {string} formatOptions.format - Output format (json, console, summary)
 * @param {boolean} formatOptions.colors - Enable color coding for console output
 * @returns {Object} Formatted health report with summary, details, and presentation-ready output
 */
function generateHealthReport(healthResults, formatOptions = {}) {
    try {
        logger.debug('Generating formatted health report', { formatOptions });

        const defaultFormatOptions = {
            format: 'json',
            colors: false,
            includeDetails: true,
            includeMetadata: true
        };

        const options = { ...defaultFormatOptions, ...formatOptions };

        // Format health check results into structured report format
        const report = {
            summary: {
                status: healthResults.status || 'unknown',
                timestamp: healthResults.timestamp || new Date().toISOString(),
                executionTime: healthResults.summary?.executionTime || 0,
                totalChecks: healthResults.summary?.totalChecks || 0,
                passedChecks: healthResults.summary?.passedChecks || 0,
                failedChecks: healthResults.summary?.failedChecks || 0,
                healthScore: healthResults.overallHealth?.score || 0
            }
        };

        // Include detailed metrics and measurements for each health check category
        if (options.includeDetails && healthResults.checks) {
            report.details = {
                system: {
                    status: healthResults.checks.system?.status || 'unknown',
                    uptime: healthResults.checks.system?.uptime?.formatted || 'N/A',
                    memory: healthResults.checks.system?.memory || {},
                    failedChecks: healthResults.checks.system?.failedChecks || 0
                },
                server: {
                    status: healthResults.checks.server?.status || 'unknown',
                    endpoint: healthResults.checks.server?.endpoint || {},
                    responseTime: healthResults.checks.server?.endpoint?.responseTime || 0,
                    error: healthResults.checks.server?.error || null
                },
                configuration: {
                    status: healthResults.checks.configuration?.status || 'unknown',
                    passedChecks: healthResults.checks.configuration?.summary?.passedChecks || 0,
                    failedChecks: healthResults.checks.configuration?.summary?.failedChecks || 0,
                    errors: healthResults.checks.configuration?.errors || []
                }
            };
        }

        // Include recommendations and warnings based on health check results
        if (healthResults.overallHealth?.recommendation) {
            report.recommendations = [healthResults.overallHealth.recommendation];
        }

        // Add any configuration-specific warnings
        if (healthResults.checks?.configuration?.warnings?.length > 0) {
            report.warnings = healthResults.checks.configuration.warnings;
        }

        // Include application metadata if requested
        if (options.includeMetadata && healthResults.metadata) {
            report.metadata = {
                application: healthResults.metadata.application || APPLICATION.NAME,
                version: healthResults.metadata.version || APPLICATION.VERSION,
                environment: healthResults.metadata.environment || 'development',
                generatedAt: new Date().toISOString()
            };
        }

        // Apply formatting options for console display or JSON output
        let formattedOutput;

        switch (options.format) {
            case 'console':
                formattedOutput = formatConsoleOutput(report, options.colors);
                break;
            case 'summary':
                formattedOutput = formatSummaryOutput(report);
                break;
            case 'json':
            default:
                formattedOutput = report;
                break;
        }

        logger.debug('Health report generated successfully', { 
            format: options.format,
            includeDetails: options.includeDetails 
        });

        // Return formatted health report ready for display or transmission
        return {
            report: formattedOutput,
            format: options.format,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('Health report generation failed', { error: error.message });

        return {
            report: {
                status: 'error',
                error: 'Failed to generate health report',
                timestamp: new Date().toISOString()
            },
            format: 'error',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Creates Express.js middleware function for /health endpoint that performs health 
 * checks and returns JSON health status responses with appropriate HTTP status codes.
 * 
 * @param {Object} endpointOptions - Health endpoint configuration options
 * @param {number} endpointOptions.timeout - Health check timeout in milliseconds
 * @returns {Function} Express.js middleware function for health check endpoint handling
 */
function createHealthCheckEndpoint(endpointOptions = {}) {
    const defaultOptions = {
        timeout: checkTimeout,
        includeDetailedMetrics: false
    };

    const options = { ...defaultOptions, ...endpointOptions };

    logger.info('Creating health check endpoint middleware', { options });

    // Create Express.js middleware function with standard (req, res, next) signature
    return async function healthCheckHandler(req, res, next) {
        try {
            logger.info('Health check endpoint accessed', { 
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent') 
            });

            const startTime = Date.now();

            // Perform health check using performHealthCheck function within middleware
            const healthCheckResults = await performHealthCheck(options);

            const endTime = Date.now();
            const requestDuration = endTime - startTime;

            // Format health check results for HTTP response using generateHealthReport
            const healthReport = generateHealthReport(healthCheckResults, {
                format: 'json',
                includeDetails: true,
                includeMetadata: true
            });

            // Set appropriate HTTP status code based on overall health status
            const statusCode = healthCheckResults.status === 'healthy' ? 
                HTTP_STATUS.OK : 
                HTTP_STATUS.INTERNAL_SERVER_ERROR;

            // Set response headers including Content-Type and caching directives
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Health-Check-Duration': `${requestDuration}ms`,
                'X-Health-Check-Timestamp': new Date().toISOString()
            });

            // Add request-specific metadata to the health report
            const responsePayload = {
                ...healthReport.report,
                request: {
                    method: req.method,
                    url: req.url,
                    timestamp: new Date().toISOString(),
                    duration: requestDuration
                }
            };

            logger.info('Health check endpoint response sent', {
                statusCode,
                healthStatus: healthCheckResults.status,
                duration: `${requestDuration}ms`
            });

            // Send JSON response with health check results and appropriate status code
            res.status(statusCode).json(responsePayload);

        } catch (error) {
            logger.error('Health check endpoint error', { 
                error: error.message, 
                stack: error.stack 
            });

            // Handle health check errors with graceful error response
            const errorResponse = {
                status: 'error',
                error: 'Health check endpoint failed',
                message: error.message,
                timestamp: new Date().toISOString()
            };

            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
               .set('Content-Type', 'application/json')
               .json(errorResponse);

            // Call next middleware with error for Express.js error handling
            next(error);
        }
    };
}

/**
 * Command-line interface function for executing health checks with formatted console 
 * output, exit code handling, and detailed reporting for development and operations.
 * 
 * @param {Array<string>} args - Command-line arguments for health check options
 * @returns {Promise<void>} Completes health check execution with appropriate exit code
 */
async function runHealthCheckCLI(args = []) {
    try {
        // Parse command-line arguments for health check options and configuration
        const cliOptions = parseCliArguments(args);

        logger.info('Health check CLI execution started', { 
            args: args.length > 0 ? args : ['no-args'],
            options: cliOptions 
        });

        // Initialize logger with appropriate log level for CLI execution
        if (cliOptions.verbose) {
            logger.info('Verbose mode enabled for detailed health check output');
        }

        console.log(`\n🏥 ${APPLICATION.NAME} Health Check v${APPLICATION.VERSION}`);
        console.log('=' + '='.repeat(60));
        console.log(`Started at: ${new Date().toLocaleString()}`);
        console.log('');

        // Execute comprehensive health check using performHealthCheck function
        const healthCheckResults = await performHealthCheck({
            timeout: cliOptions.timeout || checkTimeout,
            includeDetailedMetrics: cliOptions.detailed || false
        });

        // Generate formatted health report for console display
        const healthReport = generateHealthReport(healthCheckResults, {
            format: 'console',
            colors: cliOptions.colors !== false,
            includeDetails: cliOptions.detailed,
            includeMetadata: true
        });

        // Output health check results to console with appropriate formatting
        console.log(healthReport.report);

        // Add execution summary
        console.log('\n' + '='.repeat(62));
        console.log(`Execution Summary:`);
        console.log(`  Status: ${healthCheckResults.status.toUpperCase()}`);
        console.log(`  Total Checks: ${healthCheckResults.summary.totalChecks}`);
        console.log(`  Passed: ${healthCheckResults.summary.passedChecks}`);
        console.log(`  Failed: ${healthCheckResults.summary.failedChecks}`);
        console.log(`  Execution Time: ${healthCheckResults.summary.executionTime}ms`);
        console.log(`Completed at: ${new Date().toLocaleString()}`);

        // Determine exit code based on overall health check status
        const exitCode = healthCheckResults.status === 'healthy' ? 0 : 1;

        // Log health check completion summary with execution time
        logger.info('Health check CLI execution completed', {
            status: healthCheckResults.status,
            exitCode,
            executionTime: `${healthCheckResults.summary.executionTime}ms`,
            passedChecks: healthCheckResults.summary.passedChecks,
            failedChecks: healthCheckResults.summary.failedChecks
        });

        // Exit process with appropriate exit code (0 for healthy, 1 for unhealthy)
        process.exit(exitCode);

    } catch (error) {
        logger.error('Health check CLI execution failed', { 
            error: error.message, 
            stack: error.stack 
        });

        console.error('\n❌ Health Check CLI Error');
        console.error(`Error: ${error.message}`);
        console.error(`Timestamp: ${new Date().toISOString()}`);

        // Exit with error code 1 for CLI execution failures
        process.exit(1);
    }
}

/**
 * Validates health check metrics against configurable thresholds for determining 
 * pass/fail status of individual health checks with detailed threshold comparison.
 * 
 * @param {Object} metrics - Health check metrics to validate
 * @param {Object} thresholds - Configurable thresholds for validation
 * @returns {Object} Threshold validation results with pass/fail status and threshold details
 */
function validateHealthThresholds(metrics, thresholds = {}) {
    try {
        logger.debug('Validating health metrics against thresholds', { metrics, thresholds });

        const defaultThresholds = {
            memory: {
                warning: 50, // MB
                critical: 100 // MB
            },
            responseTime: {
                warning: 500, // ms
                critical: 1000 // ms
            },
            uptime: {
                minimum: 10 // seconds
            },
            errorRate: {
                maximum: 5 // percentage
            }
        };

        const configuredThresholds = { ...defaultThresholds, ...thresholds };

        const validationResults = {
            isValid: true,
            results: {},
            summary: {
                totalThresholds: 0,
                passedThresholds: 0,
                failedThresholds: 0,
                warningThresholds: 0
            }
        };

        // Compare memory usage against configured memory threshold limits
        if (metrics.memory && configuredThresholds.memory) {
            const memoryUsage = metrics.memory.rss || metrics.memory.heapUsed || 0;
            const memoryValidation = {
                metric: 'memory',
                current: memoryUsage,
                thresholds: configuredThresholds.memory,
                status: 'pass'
            };

            if (memoryUsage >= configuredThresholds.memory.critical) {
                memoryValidation.status = 'fail';
                memoryValidation.level = 'critical';
                memoryValidation.message = `Memory usage ${memoryUsage}MB exceeds critical threshold ${configuredThresholds.memory.critical}MB`;
                validationResults.isValid = false;
                validationResults.summary.failedThresholds++;
            } else if (memoryUsage >= configuredThresholds.memory.warning) {
                memoryValidation.status = 'warning';
                memoryValidation.level = 'warning';
                memoryValidation.message = `Memory usage ${memoryUsage}MB exceeds warning threshold ${configuredThresholds.memory.warning}MB`;
                validationResults.summary.warningThresholds++;
            } else {
                memoryValidation.message = `Memory usage ${memoryUsage}MB is within acceptable limits`;
                validationResults.summary.passedThresholds++;
            }

            validationResults.results.memory = memoryValidation;
            validationResults.summary.totalThresholds++;
        }

        // Validate response times against acceptable response time thresholds
        if (metrics.responseTime !== undefined && configuredThresholds.responseTime) {
            const responseTime = metrics.responseTime;
            const responseTimeValidation = {
                metric: 'responseTime',
                current: responseTime,
                thresholds: configuredThresholds.responseTime,
                status: 'pass'
            };

            if (responseTime >= configuredThresholds.responseTime.critical) {
                responseTimeValidation.status = 'fail';
                responseTimeValidation.level = 'critical';
                responseTimeValidation.message = `Response time ${responseTime}ms exceeds critical threshold ${configuredThresholds.responseTime.critical}ms`;
                validationResults.isValid = false;
                validationResults.summary.failedThresholds++;
            } else if (responseTime >= configuredThresholds.responseTime.warning) {
                responseTimeValidation.status = 'warning';
                responseTimeValidation.level = 'warning';
                responseTimeValidation.message = `Response time ${responseTime}ms exceeds warning threshold ${configuredThresholds.responseTime.warning}ms`;
                validationResults.summary.warningThresholds++;
            } else {
                responseTimeValidation.message = `Response time ${responseTime}ms is acceptable`;
                validationResults.summary.passedThresholds++;
            }

            validationResults.results.responseTime = responseTimeValidation;
            validationResults.summary.totalThresholds++;
        }

        // Check uptime requirements against minimum uptime thresholds
        if (metrics.uptime !== undefined && configuredThresholds.uptime) {
            const uptime = metrics.uptime.seconds || metrics.uptime;
            const uptimeValidation = {
                metric: 'uptime',
                current: uptime,
                thresholds: configuredThresholds.uptime,
                status: uptime >= configuredThresholds.uptime.minimum ? 'pass' : 'fail'
            };

            if (uptimeValidation.status === 'pass') {
                uptimeValidation.message = `Uptime ${uptime}s meets minimum requirement ${configuredThresholds.uptime.minimum}s`;
                validationResults.summary.passedThresholds++;
            } else {
                uptimeValidation.message = `Uptime ${uptime}s below minimum requirement ${configuredThresholds.uptime.minimum}s`;
                validationResults.isValid = false;
                validationResults.summary.failedThresholds++;
            }

            validationResults.results.uptime = uptimeValidation;
            validationResults.summary.totalThresholds++;
        }

        // Generate threshold validation report with detailed comparison results
        const validationReport = {
            ...validationResults,
            timestamp: new Date().toISOString(),
            thresholds: configuredThresholds,
            recommendation: validationResults.isValid ? 
                'All metrics are within acceptable thresholds' : 
                'Some metrics exceed acceptable thresholds - review and take corrective action'
        };

        logger.debug('Threshold validation completed', {
            isValid: validationResults.isValid,
            passedThresholds: validationResults.summary.passedThresholds,
            failedThresholds: validationResults.summary.failedThresholds
        });

        // Return validation results with pass/fail status and recommendations
        return validationReport;

    } catch (error) {
        logger.error('Threshold validation failed', { error: error.message });

        return {
            isValid: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            results: {},
            summary: {
                totalThresholds: 0,
                passedThresholds: 0,
                failedThresholds: 1,
                warningThresholds: 0
            }
        };
    }
}

/**
 * Helper function to format console output with colors and structured layout
 * @param {Object} report - Health report to format
 * @param {boolean} useColors - Whether to use ANSI colors
 * @returns {string} Formatted console output
 */
function formatConsoleOutput(report, useColors = false) {
    const colors = useColors ? {
        green: '\x1b[32m',
        red: '\x1b[31m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        reset: '\x1b[0m'
    } : {
        green: '',
        red: '',
        yellow: '',
        blue: '',
        reset: ''
    };

    let output = '';

    // Status indicator
    const statusColor = report.summary.status === 'healthy' ? colors.green : colors.red;
    output += `${statusColor}Status: ${report.summary.status.toUpperCase()}${colors.reset}\n`;
    output += `Health Score: ${report.summary.healthScore}%\n`;
    output += `Execution Time: ${report.summary.executionTime}ms\n\n`;

    // Check details if available
    if (report.details) {
        output += `${colors.blue}System Health:${colors.reset}\n`;
        output += `  Status: ${report.details.system.status}\n`;
        output += `  Uptime: ${report.details.system.uptime}\n`;
        output += `  Memory RSS: ${report.details.system.memory.rss}MB\n\n`;

        output += `${colors.blue}Server Health:${colors.reset}\n`;
        output += `  Status: ${report.details.server.status}\n`;
        output += `  Response Time: ${report.details.server.responseTime}ms\n`;
        if (report.details.server.error) {
            output += `  ${colors.red}Error: ${report.details.server.error}${colors.reset}\n`;
        }
        output += '\n';

        output += `${colors.blue}Configuration Health:${colors.reset}\n`;
        output += `  Status: ${report.details.configuration.status}\n`;
        output += `  Passed Checks: ${report.details.configuration.passedChecks}\n`;
        output += `  Failed Checks: ${report.details.configuration.failedChecks}\n`;
    }

    return output;
}

/**
 * Helper function to format summary output for quick status display
 * @param {Object} report - Health report to format
 * @returns {string} Formatted summary output
 */
function formatSummaryOutput(report) {
    return `Health Status: ${report.summary.status.toUpperCase()} (${report.summary.healthScore}%) - ${report.summary.passedChecks}/${report.summary.totalChecks} checks passed in ${report.summary.executionTime}ms`;
}

/**
 * Helper function to parse CLI arguments
 * @param {Array<string>} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseCliArguments(args) {
    const options = {
        verbose: false,
        detailed: false,
        colors: true,
        timeout: checkTimeout
    };

    args.forEach((arg, index) => {
        switch (arg) {
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--detailed':
            case '-d':
                options.detailed = true;
                break;
            case '--no-colors':
                options.colors = false;
                break;
            case '--timeout':
            case '-t':
                if (args[index + 1] && !isNaN(args[index + 1])) {
                    options.timeout = parseInt(args[index + 1], 10);
                }
                break;
        }
    });

    return options;
}

// Export all health check functions for application use
module.exports = {
    // Main health check function for programmatic health status validation
    performHealthCheck,
    
    // Express.js middleware factory for /health endpoint implementation
    createHealthCheckEndpoint,
    
    // Command-line interface function for health check script execution
    runHealthCheckCLI,
    
    // System health validation utility function
    checkSystemHealth,
    
    // HTTP server health validation utility function
    checkServerHealth,
    
    // Health report formatting and generation utility
    generateHealthReport,
    
    // Configuration health validation utility function (not in original exports but useful)
    checkConfigurationHealth,
    
    // Threshold validation utility function
    validateHealthThresholds
};

// Check if this script is being run directly from command line
if (require.main === module) {
    // Execute CLI interface if script is run directly
    const args = process.argv.slice(2);
    runHealthCheckCLI(args).catch(error => {
        console.error('Health check CLI execution failed:', error.message);
        process.exit(1);
    });
}