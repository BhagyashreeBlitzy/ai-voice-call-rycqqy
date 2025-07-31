/**
 * Server Startup Script for Node.js Tutorial Application
 * 
 * This script provides a clean command-line interface for starting the Node.js tutorial HTTP server.
 * Orchestrates the complete server initialization process by importing and utilizing the main server.js
 * functionality while providing enhanced startup logging, error handling, and operational feedback.
 * 
 * Acts as a wrapper around the core server startup logic with educational-focused output, environment
 * validation, and graceful error handling. Supports both programmatic invocation and direct command-line
 * execution for development workflows, demonstrating professional Node.js application startup patterns
 * with Express.js 5.1.0 and Node.js v22.x LTS integration.
 * 
 * Features:
 * - Educational banner display with application information and learning context
 * - Comprehensive environment validation with prerequisite checking
 * - Detailed startup logging with configuration summary and operational status
 * - Professional error handling with troubleshooting guidance and recovery steps
 * - Command-line argument parsing with flexible option processing
 * - Process signal handling for graceful shutdown and lifecycle management
 * - Both CLI and programmatic execution support for development workflows
 * 
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import main server startup and shutdown functions from core server module
const { startServer, stopServer } = require('../server.js');

// Import logger factory function for creating component-specific loggers with structured output
const { getLogger } = require('../utils/logger.js'); // Latest logger utilities

// Import application metadata constants for startup banner and identification
const { 
    APPLICATION, 
    ENVIRONMENT 
} = require('../utils/constants.js');

// Import centralized configuration system with validation and management utilities
const { 
    configuration, 
    validateConfiguration, 
    getConfigurationSummary 
} = require('../config/index.js');

// Initialize component-specific logger for startup script operations with educational context
const logger = getLogger('start-script');

// Global variables for startup state management and process lifecycle tracking
let startupStartTime = null;
let isStartupInProgress = false;
let shutdownHandlersRegistered = false;

/**
 * Displays educational banner with application information, Node.js version, and startup details
 * for development environment feedback and learning context including Express.js framework version
 * and tutorial-specific information for enhanced educational value.
 * 
 * @returns {void} Outputs formatted banner to console for visual startup confirmation
 */
function displayBanner() {
    try {
        logger.info('Displaying application startup banner with educational information');

        // Create formatted banner with application name, version, and description
        const bannerLines = [
            '========================================================================',
            `    ${APPLICATION.NAME} - ${APPLICATION.VERSION}`,
            '========================================================================',
            `    ${APPLICATION.DESCRIPTION}`,
            '',
            '    📚 Node.js Tutorial Application - Learning HTTP Server Development',
            '    🚀 Express.js 5.1.0 Framework with Node.js v22.x LTS Runtime',
            '',
            '    System Information:',
            `    • Node.js Version: ${process.version}`,
            `    • Platform: ${process.platform} (${process.arch})`,
            `    • Process ID: ${process.pid}`,
            `    • Environment: ${configuration.environment?.nodeEnv || 'development'}`,
            '',
            '    Startup Information:',
            `    • Server Host: ${configuration.environment?.host || 'localhost'}`,
            `    • Server Port: ${configuration.environment?.port || 3000}`,
            `    • Startup Time: ${new Date().toISOString()}`,
            `    • Log Level: ${configuration.environment?.logLevel || 'info'}`,
            '',
            '    Available Endpoints:',
            '    • GET /hello - Returns "Hello world" message',
            '',
            '    Educational Context:',
            '    • Demonstrates Node.js HTTP server creation and configuration',
            '    • Shows Express.js middleware integration and routing patterns',
            '    • Illustrates professional server startup and lifecycle management',
            '    • Provides examples of error handling and logging best practices',
            '',
            '    Usage Instructions:',
            '    • Visit http://localhost:3000/hello to test the server',
            '    • Press Ctrl+C to gracefully shutdown the server',
            '    • Check console logs for detailed operational information',
            '========================================================================'
        ];

        // Output banner lines to console for visual startup confirmation and educational context
        bannerLines.forEach(line => console.log(line));

        logger.debug('Educational startup banner displayed successfully', {
            applicationName: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            nodeVersion: process.version,
            environment: configuration.environment?.nodeEnv
        });

    } catch (error) {
        logger.error('Failed to display startup banner', {
            error: error.message,
            stack: error.stack
        });

        // Display minimal fallback banner if main banner fails
        console.log('========================================================================');
        console.log(`    ${APPLICATION.NAME} - Starting Server`);
        console.log('========================================================================');
    }
}

/**
 * Performs comprehensive environment validation before server startup including Node.js version
 * checking, configuration validation, and prerequisite verification with detailed error reporting
 * and educational guidance for troubleshooting common setup issues.
 * 
 * @returns {Object} Validation result with isValid boolean, detailed errors array, and environment summary
 */
function validateStartupEnvironment() {
    try {
        logger.info('Starting comprehensive startup environment validation');

        // Initialize validation result object with detailed error tracking
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            environmentSummary: {},
            recommendations: []
        };

        // Check Node.js version compatibility with Express.js 5.1.0 requirements (v18+)
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
        
        if (majorVersion < 18) {
            validationResult.errors.push(
                `Node.js version ${nodeVersion} is not supported. Express.js 5.1.0 requires Node.js v18 or higher.`
            );
            validationResult.recommendations.push('Upgrade to Node.js v22.x LTS for optimal compatibility');
            validationResult.isValid = false;
        } else if (majorVersion < 22) {
            validationResult.warnings.push(
                `Node.js version ${nodeVersion} is supported but v22.x LTS is recommended for production use`
            );
        }

        // Validate application configuration using validateConfiguration function from config module
        const configValidation = validateConfiguration(configuration);
        if (!configValidation.isValid) {
            validationResult.errors.push(...configValidation.errors);
            validationResult.warnings.push(...configValidation.warnings);
            validationResult.isValid = false;
            validationResult.recommendations.push('Review configuration settings and environment variables');
        }

        // Check required environment variables and configuration completeness
        const requiredConfig = ['port', 'host', 'nodeEnv'];
        const missingConfig = requiredConfig.filter(key => !configuration.environment?.[key]);
        
        if (missingConfig.length > 0) {
            validationResult.warnings.push(
                `Missing environment configuration: ${missingConfig.join(', ')}. Using defaults.`
            );
        }

        // Verify port availability with basic port checking
        const targetPort = configuration.environment?.port || ENVIRONMENT.DEFAULT_PORT;
        if (targetPort < 1 || targetPort > 65535) {
            validationResult.errors.push(
                `Invalid port number: ${targetPort}. Port must be between 1 and 65535.`
            );
            validationResult.isValid = false;
        }

        // Test file system permissions for application directory access
        try {
            const fs = require('fs');
            const path = require('path');
            const appDir = path.resolve(__dirname, '../');
            
            fs.accessSync(appDir, fs.constants.R_OK);
            logger.debug('File system permissions validated successfully');
        } catch (fsError) {
            validationResult.warnings.push(
                'File system permission issues detected. Application may have limited functionality.'
            );
        }

        // Validate Express.js framework installation and compatibility
        try {
            const express = require('express');
            const expressVersion = require('express/package.json').version;
            
            if (!expressVersion.startsWith('5.')) {
                validationResult.warnings.push(
                    `Express.js version ${expressVersion} detected. Version 5.1.0 is recommended for this tutorial.`
                );
            }
            
            logger.debug('Express.js framework validation completed', {
                version: expressVersion,
                compatible: expressVersion.startsWith('5.')
            });
        } catch (expressError) {
            validationResult.errors.push(
                'Express.js framework is not installed or not accessible. Run "npm install" to install dependencies.'
            );
            validationResult.isValid = false;
        }

        // Compile environment summary with system information and configuration status
        validationResult.environmentSummary = {
            nodeVersion: process.version,
            platform: `${process.platform} (${process.arch})`,
            processId: process.pid,
            workingDirectory: process.cwd(),
            serverAddress: `http://${configuration.environment?.host || 'localhost'}:${targetPort}`,
            environment: configuration.environment?.nodeEnv || 'development',
            memoryUsage: process.memoryUsage(),
            uptime: Math.round(process.uptime())
        };

        // Add troubleshooting recommendations based on validation results
        if (validationResult.errors.length > 0) {
            validationResult.recommendations.push(
                'Review the startup errors above and ensure all prerequisites are met',
                'Check Node.js version compatibility and Express.js installation',
                'Verify environment variables and configuration settings'
            );
        }

        // Log validation completion with status summary
        const statusMessage = validationResult.isValid ? 'passed' : 'failed';
        logger.info(`Environment validation ${statusMessage}`, {
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            nodeVersion: process.version,
            targetPort: targetPort
        });

        // Return comprehensive validation result with detailed error information and recommendations
        return validationResult;

    } catch (error) {
        logger.error('Environment validation process failed', {
            error: error.message,
            stack: error.stack
        });

        return {
            isValid: false,
            errors: [`Environment validation failed: ${error.message}`],
            warnings: [],
            environmentSummary: {},
            recommendations: [
                'Check system configuration and Node.js installation',
                'Ensure all required dependencies are installed',
                'Review application configuration and environment settings'
            ]
        };
    }
}

/**
 * Logs comprehensive startup summary including configuration details, environment information,
 * and operational parameters for educational visibility and debugging support with structured
 * output format for development learning and troubleshooting assistance.
 * 
 * @param {Object} startupInfo - Startup information object with configuration and timing data
 * @returns {void} Outputs structured startup summary to logging system
 */
function logStartupSummary(startupInfo) {
    try {
        logger.info('Generating comprehensive startup summary for educational visibility');

        // Generate configuration summary using getConfigurationSummary function
        const configSummary = getConfigurationSummary(configuration);

        // Include environment details with port, host, and NODE_ENV information
        const environmentDetails = {
            serverAddress: `http://${configuration.environment?.host || 'localhost'}:${configuration.environment?.port || 3000}`,
            environment: configuration.environment?.nodeEnv || 'development',
            logLevel: configuration.environment?.logLevel || 'info',
            processId: process.pid,
            platform: `${process.platform} (${process.arch})`,
            nodeVersion: process.version
        };

        // Add server configuration including timeouts and connection settings
        const serverConfiguration = {
            port: configuration.server?.http?.port || 3000,
            host: configuration.server?.http?.host || 'localhost',
            timeout: configuration.server?.http?.timeout || 30000,
            keepAliveTimeout: configuration.server?.http?.keepAliveTimeout || 5000,
            maxConnections: configuration.server?.http?.maxConnections || 100
        };

        // Include application metadata and version information
        const applicationMetadata = {
            name: APPLICATION.NAME,
            version: APPLICATION.VERSION,
            description: APPLICATION.DESCRIPTION,
            expressVersion: require('express/package.json').version,
            startupTime: startupInfo.startupTime || new Date().toISOString()
        };

        // Add system information including platform and resource usage
        const systemInformation = {
            platform: process.platform,
            architecture: process.arch,
            nodeVersion: process.version,
            processId: process.pid,
            workingDirectory: process.cwd(),
            memoryUsage: process.memoryUsage(),
            uptime: Math.round(process.uptime())
        };

        // Include startup timing and performance metrics if available
        const performanceMetrics = {
            startupDuration: startupInfo.startupDuration || 'calculating...',
            configurationLoadTime: configSummary.metadata?.summaryGeneratedAt || 'unknown',
            validationTime: startupInfo.validationTime || 'unknown',
            serverInitializationTime: startupInfo.serverInitializationTime || 'pending'
        };

        // Create structured startup summary with educational context and operational information
        const startupSummary = {
            '📋 Application Information': applicationMetadata,
            '🌐 Environment Configuration': environmentDetails,
            '⚙️  Server Configuration': serverConfiguration,
            '💻 System Information': systemInformation,
            '📊 Performance Metrics': performanceMetrics,
            '🔧 Configuration Status': {
                configurationValid: configSummary.validation?.isValid || false,
                errorCount: configSummary.validation?.errorCount || 0,
                warningCount: configSummary.validation?.warningCount || 0
            }
        };

        // Log formatted startup summary with educational context and development guidance
        logger.info('=== Node.js Tutorial Application Startup Summary ===');
        
        Object.entries(startupSummary).forEach(([section, details]) => {
            logger.info(`${section}:`);
            Object.entries(details).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    logger.info(`  ${key}: ${JSON.stringify(value, null, 2)}`);
                } else {
                    logger.info(`  ${key}: ${value}`);
                }
            });
            logger.info(''); // Add spacing between sections
        });

        logger.info('=== Educational Learning Points ===');
        logger.info('• Server startup orchestration and lifecycle management');
        logger.info('• Configuration management and environment validation');
        logger.info('• Error handling patterns and troubleshooting procedures');
        logger.info('• Process signal handling and graceful shutdown procedures');
        logger.info('• Structured logging and monitoring integration');
        logger.info('================================================');

        logger.debug('Startup summary generated and logged successfully', {
            sectionsLogged: Object.keys(startupSummary).length,
            configurationValid: configSummary.validation?.isValid,
            startupTime: startupInfo.startupTime
        });

    } catch (error) {
        logger.error('Failed to generate startup summary', {
            error: error.message,
            stack: error.stack,
            startupInfo: startupInfo
        });

        // Log minimal startup information if summary generation fails
        logger.info('=== Minimal Startup Information ===');
        logger.info(`Application: ${APPLICATION.NAME} v${APPLICATION.VERSION}`);
        logger.info(`Node.js Version: ${process.version}`);
        logger.info(`Server Address: http://localhost:3000`);
        logger.info(`Process ID: ${process.pid}`);
        logger.info('====================================');
    }
}

/**
 * Handles server startup errors with comprehensive error logging, user-friendly error messages,
 * troubleshooting guidance, and appropriate exit procedures for educational error handling
 * demonstration with detailed recovery instructions and common solution suggestions.
 * 
 * @param {Error} error - Error object containing startup failure information
 * @param {Object} context - Additional context information about the startup failure
 * @returns {void} Logs error details and terminates process with appropriate exit code
 */
function handleStartupError(error, context = {}) {
    try {
        logger.error('=== Server Startup Error Detected ===');
        logger.error('A critical error occurred during server startup. Please review the information below:');

        // Log detailed error information including stack trace and context
        logger.error('Error Details:', {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString()
        });

        // Categorize error type for targeted troubleshooting guidance
        let errorCategory = 'Unknown';
        let troubleshootingSteps = [];

        if (error.code === 'EADDRINUSE') {
            errorCategory = 'Port Binding Error';
            troubleshootingSteps = [
                `Port ${context.port || 3000} is already in use by another process`,
                'Try using a different port with --port option or PORT environment variable',
                'Check for other running servers with: lsof -i :3000 (macOS/Linux) or netstat -ano | findstr :3000 (Windows)',
                'Kill existing process or restart your system if necessary'
            ];
        } else if (error.code === 'EACCES') {
            errorCategory = 'Permission Error';
            troubleshootingSteps = [
                'Insufficient permissions to bind to the specified port',
                'Ports below 1024 require administrator/root privileges',
                'Use a port number above 1024 or run with elevated permissions',
                'Check file system permissions for application directory'
            ];
        } else if (error.message.includes('configuration')) {
            errorCategory = 'Configuration Error';
            troubleshootingSteps = [
                'Invalid or missing configuration detected',
                'Check environment variables: NODE_ENV, PORT, HOST, LOG_LEVEL',
                'Verify configuration files in config/ directory',
                'Ensure all required dependencies are installed with: npm install'
            ];
        } else if (error.message.includes('Express') || error.message.includes('express')) {
            errorCategory = 'Framework Error';
            troubleshootingSteps = [
                'Express.js framework initialization failed',
                'Verify Express.js 5.1.0 is installed: npm list express',
                'Reinstall dependencies: npm install',
                'Check for Node.js version compatibility (requires v18+)'
            ];
        } else {
            errorCategory = 'System Error';
            troubleshootingSteps = [
                'An unexpected system error occurred during startup',
                'Check system resources and available memory',
                'Verify Node.js installation and version compatibility',
                'Review application logs for additional error details'
            ];
        }

        // Provide user-friendly error explanation and category-specific guidance
        logger.error(`Error Category: ${errorCategory}`);
        logger.error('Troubleshooting Steps:');
        troubleshootingSteps.forEach((step, index) => {
            logger.error(`  ${index + 1}. ${step}`);
        });

        // Include common solutions and next steps for error resolution
        logger.error('');
        logger.error('Common Solutions:');
        logger.error('  • Restart the application after addressing the issue above');
        logger.error('  • Check the Node.js Tutorial documentation for setup guidance');
        logger.error('  • Verify system requirements: Node.js v22.x LTS, Express.js 5.1.0');
        logger.error('  • Ensure all dependencies are installed: npm install');
        logger.error('  • Try running with different configuration: node start.js --port 3001');

        // Log system state and configuration details for debugging assistance
        logger.error('');
        logger.error('System State Information:');
        logger.error('  Node.js Version:', process.version);
        logger.error('  Platform:', `${process.platform} (${process.arch})`);
        logger.error('  Working Directory:', process.cwd());
        logger.error('  Process ID:', process.pid);
        logger.error('  Memory Usage:', JSON.stringify(process.memoryUsage(), null, 2));

        // Add educational context about error handling and recovery
        logger.error('');
        logger.error('=== Educational Context ===');
        logger.error('This error demonstrates important concepts in Node.js server development:');
        logger.error('• Proper error handling and user feedback in server applications');
        logger.error('• Common startup issues and their resolution strategies');
        logger.error('• System resource management and port binding procedures');
        logger.error('• Configuration validation and environment setup best practices');
        logger.error('==========================');

        // Attempt graceful cleanup if server partially started
        if (context.serverPartiallyStarted) {
            logger.info('Attempting graceful cleanup of partially started server...');
            try {
                if (typeof stopServer === 'function') {
                    await stopServer();
                    logger.info('Server cleanup completed successfully');
                }
            } catch (cleanupError) {
                logger.error('Server cleanup failed:', cleanupError.message);
            }
        }

    } catch (errorHandlingError) {
        // Fallback error handling if primary error handler fails
        console.error('Critical Error: Error handler itself failed');
        console.error('Original Error:', error.message);
        console.error('Error Handler Error:', errorHandlingError.message);
    } finally {
        // Clear startup progress flag
        isStartupInProgress = false;

        // Exit process with appropriate error code for CI/CD integration
        logger.error('Server startup failed. Exiting process with error code 1.');
        process.exit(1);
    }
}

/**
 * Configures Node.js process event handlers for graceful shutdown, signal handling, and error
 * management with educational demonstration of process lifecycle management including SIGTERM,
 * SIGINT, and uncaught exception handling for professional server operation.
 * 
 * @returns {void} Sets up process event listeners for application lifecycle management
 */
function setupProcessHandlers() {
    try {
        // Prevent duplicate handler registration
        if (shutdownHandlersRegistered) {
            logger.debug('Process handlers already registered, skipping duplicate registration');
            return;
        }

        logger.info('Setting up Node.js process event handlers for graceful lifecycle management');

        // Register SIGTERM signal handler for graceful shutdown initiation (process termination request)
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM signal received - initiating graceful server shutdown');
            try {
                if (typeof stopServer === 'function') {
                    await stopServer();
                    logger.info('Server stopped gracefully via SIGTERM');
                }
            } catch (error) {
                logger.error('Error during SIGTERM shutdown:', error.message);
            }
            process.exit(0);
        });

        // Register SIGINT signal handler for development interrupt handling (Ctrl+C)
        process.on('SIGINT', async () => {
            logger.info('SIGINT signal received (Ctrl+C) - shutting down server gracefully');
            try {
                if (typeof stopServer === 'function') {
                    await stopServer();
                    logger.info('Server stopped gracefully via SIGINT (Ctrl+C)');
                }
            } catch (error) {
                logger.error('Error during SIGINT shutdown:', error.message);
            }
            process.exit(0);
        });

        // Register SIGUSR2 signal handler for nodemon restart compatibility (development tool support)
        process.on('SIGUSR2', async () => {
            logger.info('SIGUSR2 signal received - preparing for nodemon restart');
            try {
                if (typeof stopServer === 'function') {
                    await stopServer();
                    logger.info('Server stopped for nodemon restart');
                }
            } catch (error) {
                logger.error('Error during SIGUSR2 restart:', error.message);
            }
            process.kill(process.pid, 'SIGUSR2');
        });

        // Set up uncaughtException handler for unhandled synchronous errors
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception detected - this indicates a programming error:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            logger.error('Educational Note: Uncaught exceptions should be avoided through proper error handling');
            logger.error('Consider using try-catch blocks and proper error handling middleware');
            
            // Attempt graceful shutdown
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Set up unhandledRejection handler for unhandled Promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Promise Rejection detected:', {
                reason: reason,
                promise: promise,
                timestamp: new Date().toISOString()
            });
            
            logger.error('Educational Note: Always handle Promise rejections with .catch() or try-catch in async functions');
            
            // For educational purposes, log but don't crash on unhandled rejections
            // In production, you might want to crash and restart
        });

        // Configure process exit handler for final cleanup procedures
        process.on('exit', (code) => {
            const exitMessage = code === 0 ? 'Server shutdown completed successfully' : `Server process exiting with error code ${code}`;
            logger.info('Process exit handler triggered:', {
                exitCode: code,
                message: exitMessage,
                uptime: Math.round(process.uptime()),
                timestamp: new Date().toISOString()
            });
        });

        // Set shutdownHandlersRegistered flag to prevent duplicate registration
        shutdownHandlersRegistered = true;

        // Log process handler registration completion with signal handling configuration
        logger.info('Process event handlers registered successfully', {
            sigterm: true,
            sigint: true,
            sigusr2: true,
            uncaughtException: true,
            unhandledRejection: true,
            processExit: true
        });

        // Educational logging about process lifecycle management
        logger.debug('Educational Context: Process handlers enable graceful server lifecycle management');
        logger.debug('• SIGTERM: Graceful shutdown for production deployment');
        logger.debug('• SIGINT: Development interrupt handling (Ctrl+C)');
        logger.debug('• SIGUSR2: Nodemon restart compatibility for development');
        logger.debug('• uncaughtException: Safety net for unhandled synchronous errors');
        logger.debug('• unhandledRejection: Promise rejection handling for async errors');

    } catch (error) {
        logger.error('Failed to setup process handlers', {
            error: error.message,
            stack: error.stack
        });

        // Set up minimal signal handlers if full setup fails
        process.on('SIGINT', () => {
            console.log('\nServer interrupted - shutting down');
            process.exit(0);
        });
    }
}

/**
 * Main startup execution function that orchestrates the complete server startup process with
 * validation, initialization, error handling, and success confirmation for the Node.js tutorial
 * application including educational feedback and comprehensive operational status reporting.
 * 
 * @param {Object} options - Startup execution options including port, host, and configuration
 * @returns {Promise} Resolves when server startup is complete with server information
 */
async function executeStartup(options = {}) {
    try {
        // Set startup in progress flag and record startup start time for performance tracking
        startupStartTime = Date.now();
        isStartupInProgress = true;

        logger.info('=== Node.js Tutorial Server Startup Initiated ===', {
            options: options,
            startTime: new Date(startupStartTime).toISOString(),
            processId: process.pid
        });

        // Display application banner with educational information and system details
        displayBanner();

        // Validate startup environment and configuration completeness with detailed error reporting
        const validationResult = validateStartupEnvironment();
        const validationTime = Date.now();

        if (!validationResult.isValid) {
            const validationError = new Error('Environment validation failed');
            validationError.details = validationResult.errors;
            
            await handleStartupError(validationError, {
                category: 'Environment Validation',
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                recommendations: validationResult.recommendations
            });
            return; // This line won't be reached as handleStartupError exits the process
        }

        // Log validation warnings if present
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            logger.warn('Environment validation completed with warnings:', {
                warnings: validationResult.warnings,
                recommendations: validationResult.recommendations
            });
        }

        // Log startup summary with configuration and environment details
        logStartupSummary({
            startupTime: new Date(startupStartTime).toISOString(),
            validationTime: Date.now() - validationTime,
            options: options
        });

        // Set up process handlers for graceful shutdown and signal management
        setupProcessHandlers();

        // Execute main server startup using startServer function from server.js
        logger.info('Initiating main server startup sequence...');
        const serverInitStart = Date.now();
        
        const serverInfo = await startServer({
            port: options.port || configuration.environment?.port || ENVIRONMENT.DEFAULT_PORT,
            host: options.host || configuration.environment?.host || ENVIRONMENT.DEFAULT_HOST,
            ...options
        });

        const serverInitTime = Date.now() - serverInitStart;

        // Handle startup success with confirmation logging and ready state indication
        const totalStartupTime = Date.now() - startupStartTime;
        
        logger.info('=== Server Startup Completed Successfully ===', {
            serverInfo: serverInfo,
            timing: {
                totalStartupTime: `${totalStartupTime}ms`,
                validationTime: `${validationTime - startupStartTime}ms`,
                serverInitTime: `${serverInitTime}ms`
            },
            serverAddress: `http://${serverInfo.host || 'localhost'}:${serverInfo.port || 3000}`,
            status: 'ready'
        });

        // Educational success message with next steps and learning guidance
        logger.info('🎉 Congratulations! Your Node.js tutorial server is now running successfully!');
        logger.info('📚 Educational Next Steps:');
        logger.info(`   • Visit http://${serverInfo.host || 'localhost'}:${serverInfo.port || 3000}/hello to test your server`);
        logger.info('   • Observe the request logs in the console to understand HTTP request handling');
        logger.info('   • Try modifying the /hello response in the route handler');
        logger.info('   • Press Ctrl+C to practice graceful server shutdown');
        logger.info('   • Experiment with different ports using --port option');

        // Clear startup in progress flag and return startup confirmation with server details
        isStartupInProgress = false;

        return {
            success: true,
            serverInfo: serverInfo,
            startupTime: totalStartupTime,
            validationResult: validationResult,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        // Handle startup errors with comprehensive error handling and cleanup
        logger.error('Server startup sequence failed', {
            error: error.message,
            stack: error.stack,
            options: options,
            startupDuration: startupStartTime ? Date.now() - startupStartTime : 'unknown'
        });

        await handleStartupError(error, {
            phase: 'startup-execution',
            options: options,
            serverPartiallyStarted: isStartupInProgress
        });

        // This return won't be reached as handleStartupError exits the process
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Parses command-line arguments and environment variables to create startup options object
 * with validation and default value application for flexible script execution including
 * port configuration, host binding, and environment mode selection.
 * 
 * @returns {Object} Startup options object with parsed command-line arguments and environment settings
 */
function getStartupOptions() {
    try {
        logger.debug('Parsing command-line arguments and environment variables');

        // Parse command-line arguments using process.argv with proper argument extraction
        const args = process.argv.slice(2); // Remove 'node' and script path
        const options = {};

        // Extract port, host, and environment options from command-line arguments
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const nextArg = args[i + 1];

            switch (arg) {
                case '--port':
                case '-p':
                    if (nextArg && !nextArg.startsWith('--')) {
                        options.port = parseInt(nextArg);
                        i++; // Skip next arg as it's the value
                    }
                    break;

                case '--host':
                case '-h':
                    if (nextArg && !nextArg.startsWith('--')) {
                        options.host = nextArg;
                        i++; // Skip next arg as it's the value
                    }
                    break;

                case '--env':
                case '-e':
                    if (nextArg && !nextArg.startsWith('--')) {
                        options.environment = nextArg;
                        i++; // Skip next arg as it's the value
                    }
                    break;

                case '--help':
                    options.showHelp = true;
                    break;

                case '--verbose':
                case '-v':
                    options.verbose = true;
                    break;

                default:
                    // Log unknown arguments for debugging
                    if (arg.startsWith('--')) {
                        logger.warn(`Unknown command-line argument: ${arg}`);
                    }
                    break;
            }
        }

        // Apply environment variable overrides for configuration with type conversion
        if (process.env.PORT && !options.port) {
            const envPort = parseInt(process.env.PORT);
            if (!isNaN(envPort)) {
                options.port = envPort;
            }
        }

        if (process.env.HOST && !options.host) {
            options.host = process.env.HOST;
        }

        if (process.env.NODE_ENV && !options.environment) {
            options.environment = process.env.NODE_ENV;
        }

        // Set default values for missing options using ENVIRONMENT constants
        options.port = options.port || ENVIRONMENT.DEFAULT_PORT || 3000;
        options.host = options.host || ENVIRONMENT.DEFAULT_HOST || 'localhost';
        options.environment = options.environment || 'development';

        // Validate option types and value ranges with error checking
        if (options.port && (isNaN(options.port) || options.port < 1 || options.port > 65535)) {
            logger.warn(`Invalid port number: ${options.port}. Using default: 3000`);
            options.port = 3000;
        }

        if (options.host && typeof options.host !== 'string') {
            logger.warn(`Invalid host value: ${options.host}. Using default: localhost`);
            options.host = 'localhost';
        }

        // Log parsed options for debugging and educational visibility
        logger.debug('Startup options parsed successfully', {
            port: options.port,
            host: options.host,
            environment: options.environment,
            verbose: options.verbose,
            showHelp: options.showHelp,
            hasCommandLineArgs: args.length > 0
        });

        // Return structured startup options object with all parsed and validated settings
        return options;

    } catch (error) {
        logger.error('Failed to parse startup options', {
            error: error.message,
            args: process.argv,
            stack: error.stack
        });

        // Return default options if parsing fails
        return {
            port: ENVIRONMENT.DEFAULT_PORT || 3000,
            host: ENVIRONMENT.DEFAULT_HOST || 'localhost',
            environment: 'development',
            parseError: error.message
        };
    }
}

/**
 * Displays command-line usage information and available options for the start script with
 * educational context and examples for development workflow guidance including common usage
 * patterns and troubleshooting information for Node.js learning objectives.
 * 
 * @returns {void} Outputs usage information to console
 */
function displayUsageInformation() {
    try {
        logger.info('Displaying command-line usage information and examples');

        // Display script usage syntax and available command-line options
        const usageInfo = [
            '',
            '========================================================================',
            '    Node.js Tutorial Server - Command Line Usage',
            '========================================================================',
            '',
            'USAGE:',
            '    node src/backend/scripts/start.js [options]',
            '',
            'OPTIONS:',
            '    --port, -p <number>     Server port (default: 3000)',
            '    --host, -h <string>     Server host (default: localhost)',
            '    --env, -e <string>      Environment mode (development|production|test)',
            '    --verbose, -v           Enable verbose logging',
            '    --help                  Display this help information',
            '',
            'EXAMPLES:',
            '    node src/backend/scripts/start.js',
            '        Start server with default settings (localhost:3000)',
            '',
            '    node src/backend/scripts/start.js --port 8080',
            '        Start server on port 8080',
            '',
            '    node src/backend/scripts/start.js --host 0.0.0.0 --port 3001',
            '        Start server on all interfaces, port 3001',
            '',
            '    node src/backend/scripts/start.js --env production --port 80',
            '        Start server in production mode on port 80',
            '',
            'ENVIRONMENT VARIABLES:',
            '    PORT            Override server port',
            '    HOST            Override server host',
            '    NODE_ENV        Set environment mode (development|production|test)',
            '    LOG_LEVEL       Set logging level (error|warn|info|debug)',
            '',
            'ENVIRONMENT EXAMPLES:',
            '    PORT=8080 node src/backend/scripts/start.js',
            '    NODE_ENV=production PORT=3001 node src/backend/scripts/start.js',
            '',
            'TROUBLESHOOTING:',
            '    • Port already in use: Try a different port with --port option',
            '    • Permission denied: Use port > 1024 or run with elevated privileges',
            '    • Command not found: Ensure you\'re in the project root directory',
            '    • Module not found: Run "npm install" to install dependencies',
            '',
            'EDUCATIONAL CONTEXT:',
            '    This script demonstrates professional Node.js server startup patterns:',
            '    • Command-line argument parsing and validation',
            '    • Environment variable configuration management',
            '    • Comprehensive error handling and user feedback',
            '    • Process lifecycle management and graceful shutdown',
            '    • Educational logging for development learning',
            '',
            'LEARNING OBJECTIVES:',
            '    • Understanding Node.js script execution and CLI interfaces',
            '    • Configuration management in server applications',
            '    • Error handling patterns and troubleshooting procedures',
            '    • Process management and signal handling in Node.js',
            '',
            'NEXT STEPS:',
            '    • Visit http://localhost:3000/hello after starting the server',
            '    • Experiment with different port and host configurations',
            '    • Review the server logs to understand HTTP request processing',
            '    • Practice graceful shutdown with Ctrl+C',
            '',
            'DOCUMENTATION:',
            '    • Node.js Documentation: https://nodejs.org/en/docs/',
            '    • Express.js Guide: https://expressjs.com/en/guide/',
            '    • HTTP Server Tutorial: Check project README.md',
            '========================================================================',
            ''
        ];

        // Output usage information with educational formatting and clear structure
        usageInfo.forEach(line => console.log(line));

        logger.debug('Usage information displayed successfully', {
            linesDisplayed: usageInfo.length,
            includesExamples: true,
            includesTroubleshooting: true,
            includesEducationalContext: true
        });

    } catch (error) {
        logger.error('Failed to display usage information', {
            error: error.message,
            stack: error.stack
        });

        // Display minimal usage information if full display fails
        console.log('Usage: node src/backend/scripts/start.js [--port <number>] [--host <string>] [--help]');
        console.log('Example: node src/backend/scripts/start.js --port 8080');
        console.log('Use --help for detailed usage information');
    }
}

/**
 * Main entry point function that handles command-line argument parsing, startup option processing,
 * and orchestrates the complete server startup sequence with comprehensive error handling for both
 * programmatic and CLI usage including help display and educational guidance.
 * 
 * @returns {Promise} Resolves when application startup is complete or rejects with startup errors
 */
async function main() {
    try {
        logger.info('Node.js Tutorial Server startup script initiated', {
            processId: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            arguments: process.argv
        });

        // Parse startup options from command-line arguments and environment variables
        const options = getStartupOptions();

        // Check for help flag and display usage information if requested
        if (options.showHelp) {
            displayUsageInformation();
            process.exit(0);
        }

        // Validate parsed options and apply defaults where necessary
        if (options.parseError) {
            logger.warn('Startup options parsing encountered errors, using defaults', {
                parseError: options.parseError,
                optionsUsed: options
            });
        }

        // Execute startup sequence using executeStartup function with parsed options
        logger.info('Executing server startup sequence with processed options', {
            port: options.port,
            host: options.host,
            environment: options.environment,
            verbose: options.verbose
        });

        const startupResult = await executeStartup(options);

        // Handle successful startup with confirmation and ready state logging
        if (startupResult && startupResult.success) {
            logger.info('Application startup completed successfully', {
                serverAddress: `http://${options.host}:${options.port}`,
                startupTime: startupResult.startupTime,
                status: 'ready-for-requests'
            });

            // Return Promise resolved with startup confirmation for programmatic usage
            return {
                success: true,
                message: 'Server started successfully',
                server: startupResult.serverInfo,
                options: options,
                timestamp: new Date().toISOString()
            };
        } else {
            throw new Error('Startup sequence completed but server is not ready');
        }

    } catch (error) {
        // Handle startup errors with comprehensive error handling and process exit
        logger.error('Main startup function failed', {
            error: error.message,
            stack: error.stack,
            processId: process.pid
        });

        // Use handleStartupError for consistent error handling and educational feedback
        await handleStartupError(error, {
            phase: 'main-entry-point',
            context: 'CLI execution or programmatic invocation'
        });

        // This return won't be reached as handleStartupError exits the process
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Execute main function only if script is run directly (not imported as module)
if (require.main === module) {
    // Run main function with proper error handling for CLI execution
    main().catch(error => {
        console.error('Critical startup failure:', error.message);
        process.exit(1);
    });
}

// Export functions for programmatic usage and testing purposes
module.exports = {
    // Main startup execution function for programmatic server startup with options and error handling
    executeStartup,
    
    // Environment validation utility function for startup prerequisite checking
    validateStartupEnvironment,
    
    // Startup options parser for command-line arguments and environment variables
    getStartupOptions,
    
    // Educational banner display function for development environment feedback
    displayBanner
};