/**
 * Development Environment Startup Script for Node.js Tutorial Application
 *
 * Enhanced development environment script that provides comprehensive development features
 * including file watching, automatic restart capabilities, development-specific configuration,
 * enhanced logging, and debugging utilities. Orchestrates the development workflow by
 * integrating the Express.js application with development tools, environment validation,
 * and real-time feedback mechanisms.
 *
 * Designed for educational purposes to demonstrate professional Node.js development
 * practices with Express.js 5.1.0 and Node.js v22.x LTS, providing optimal development
 * experience for the /hello endpoint tutorial server with hot reload capabilities.
 *
 * Features:
 * - File watching with hot reload using chokidar v4.0.1
 * - Development-specific enhanced logging and debugging
 * - Graceful server restart with cache clearing
 * - Comprehensive environment validation and configuration display
 * - Educational development tips and guidance
 * - Process signal handling for clean shutdown
 *
 * @version 1.0.0
 * @author Node.js Tutorial Application
 * @license MIT
 */

// Import server lifecycle functions from main server module
const { startServer, stopServer } = require('../server.js'); // Main server functions

// Import Express.js application instance with development configuration access
const app = require('../app.js'); // Express.js application instance

// Import unified configuration system with development settings
const { 
    configuration, 
    validateConfiguration, 
    getConfigurationSummary 
} = require('../config/index.js'); // Configuration management

// Import enhanced logging system for development debugging
const { getLogger } = require('../utils/logger.js'); // Logger factory

// Import lifecycle management for coordinated startup and shutdown
const { LifecycleManager } = require('../lib/lifecycle.js'); // Application lifecycle

// Import environment utilities for development environment detection
const { 
    isDevelopmentEnvironment, 
    createEnvironmentSummary 
} = require('../utils/environment.js'); // Environment utilities

// Import application constants for metadata and configuration
const { APPLICATION } = require('../utils/constants.js'); // Application constants

// Import file watching library for hot reload functionality
const chokidar = require('chokidar'); // chokidar v4.0.1 - File system watcher

// Global development script logger with component-specific context
const logger = getLogger('dev-script');

// Global development server state management
let lifecycleManager = null;
let fileWatcher = null;
let serverInstance = null;
let isRestartInProgress = false;
let restartCount = 0;
let startTime = null;

/**
 * Main development server startup function that initializes the server with
 * development-specific features including file watching, enhanced logging,
 * and development configuration validation for optimal learning experience.
 *
 * @param {Object} options - Development server configuration options
 * @param {Object} options.config - Custom configuration overrides for development
 * @param {boolean} options.enableFileWatching - Enable file watching for hot reload (default: true)
 * @param {number} options.watchDebounceDelay - Debounce delay for file changes in ms (default: 500)
 * @param {Array<string>} options.watchPatterns - File patterns to watch for changes
 * @param {Array<string>} options.ignorePatterns - File patterns to ignore during watching
 * @returns {Promise<void>} Resolves when development server is started and file watching is enabled
 */
async function startDevelopmentServer(options = {}) {
    try {
        logger.info('Starting development server for Node.js tutorial application', {
            applicationName: APPLICATION.NAME,
            applicationVersion: APPLICATION.VERSION,
            developmentMode: true,
            nodeEnv: process.env.NODE_ENV || 'development'
        });

        // Validate development environment configuration using validateConfiguration function
        logger.info('Validating development environment configuration');
        const configValidation = validateConfiguration();
        if (!configValidation.isValid) {
            throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
        }

        // Create environment summary for development debugging and configuration verification
        logger.debug('Creating environment summary for development debugging');
        const environmentSummary = createEnvironmentSummary(configuration);
        logger.debug('Environment summary created', {
            configurationValid: environmentSummary.validation.isValid,
            environment: environmentSummary.environment.environmentType,
            nodeVersion: environmentSummary.runtime.node.version
        });

        // Initialize lifecycle manager with development-specific configuration and error handling
        logger.info('Initializing lifecycle manager for development environment');
        lifecycleManager = new LifecycleManager({
            ...configuration,
            ...options.config,
            developmentMode: true,
            enableEnhancedLogging: true
        });

        // Start main application server using startServer function with development enhancements
        logger.info('Starting main application server with development features');
        serverInstance = await startServer();
        startTime = new Date();

        // Setup file watching for automatic restart on code changes using setupFileWatcher
        if (options.enableFileWatching !== false) {
            logger.info('Setting up file watching for automatic restart capabilities');
            fileWatcher = setupFileWatcher({
                debounceDelay: options.watchDebounceDelay || 500,
                watchPatterns: options.watchPatterns,
                ignorePatterns: options.ignorePatterns
            });
        } else {
            logger.info('File watching disabled - manual restart required for code changes');
        }

        // Register development-specific shutdown handlers for clean restarts and debugging
        logger.debug('Registering development-specific shutdown handlers');
        registerDevelopmentShutdownHandlers();

        // Log successful development server startup with enhanced debugging information and URLs
        const serverAddress = serverInstance.address();
        logger.info('Development server startup completed successfully', {
            serverUrl: `http://${serverAddress.address}:${serverAddress.port}`,
            helloEndpoint: `http://${serverAddress.address}:${serverAddress.port}/hello`,
            startupTime: startTime.toISOString(),
            fileWatchingEnabled: Boolean(fileWatcher),
            developmentFeaturesEnabled: true
        });

        // Display development server ready message with available endpoints and development features
        displayDevelopmentInfo({
            serverAddress: serverAddress,
            applicationName: APPLICATION.NAME,
            applicationVersion: APPLICATION.VERSION,
            startTime: startTime,
            fileWatchingEnabled: Boolean(fileWatcher),
            environmentSummary: environmentSummary
        });

    } catch (error) {
        logger.error('Development server startup failed', {
            error: error.message,
            stack: error.stack
        });
        
        // Handle development startup errors with detailed error reporting and recovery suggestions
        await handleDevelopmentError(error, 'development-server-startup');
        throw error;
    }
}

/**
 * Configures file system watching for automatic server restart on code changes,
 * providing hot reload functionality for enhanced development workflow and learning experience.
 *
 * @param {Object} watchOptions - File watching configuration options
 * @param {number} watchOptions.debounceDelay - Debounce delay in milliseconds to prevent excessive restarts
 * @param {Array<string>} watchOptions.watchPatterns - Custom watch patterns for file monitoring
 * @param {Array<string>} watchOptions.ignorePatterns - Custom ignore patterns for file exclusion
 * @returns {Object} File watcher instance for monitoring code changes
 */
function setupFileWatcher(watchOptions = {}) {
    try {
        // Configure chokidar watcher with development-appropriate file patterns and ignore rules
        const defaultWatchPatterns = [
            'src/**/*.js',
            'config/**/*.js',
            'lib/**/*.js',
            'routes/**/*.js',
            'middleware/**/*.js',
            'services/**/*.js',
            'utils/**/*.js'
        ];

        const defaultIgnorePatterns = [
            'node_modules/**',
            'test/**',
            'coverage/**',
            'logs/**',
            '*.log',
            '.git/**',
            'dist/**',
            'build/**'
        ];

        // Set up watch patterns for JavaScript files, configuration files, and route definitions
        const watchPatterns = watchOptions.watchPatterns || defaultWatchPatterns;
        const ignorePatterns = watchOptions.ignorePatterns || defaultIgnorePatterns;

        logger.info('Configuring file watcher with patterns', {
            watchPatterns: watchPatterns,
            ignorePatterns: ignorePatterns,
            debounceDelay: watchOptions.debounceDelay
        });

        // Configure ignore patterns for node_modules, test files, and temporary files
        const watcher = chokidar.watch(watchPatterns, {
            ignored: ignorePatterns,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50
            }
        });

        // Set up debouncing to prevent excessive restarts on rapid file changes
        let restartTimeout = null;
        const debounceDelay = watchOptions.debounceDelay || 500;

        // Register file change event handler for triggering server restarts on code modifications
        watcher.on('change', (filePath) => {
            if (restartTimeout) {
                clearTimeout(restartTimeout);
            }
            restartTimeout = setTimeout(() => {
                handleFileChange(filePath, 'change');
            }, debounceDelay);
        });

        // Register file addition/deletion event handlers for comprehensive file system monitoring
        watcher.on('add', (filePath) => {
            if (restartTimeout) {
                clearTimeout(restartTimeout);
            }
            restartTimeout = setTimeout(() => {
                handleFileChange(filePath, 'add');
            }, debounceDelay);
        });

        watcher.on('unlink', (filePath) => {
            if (restartTimeout) {
                clearTimeout(restartTimeout);
            }
            restartTimeout = setTimeout(() => {
                handleFileChange(filePath, 'unlink');
            }, debounceDelay);
        });

        // Log file watcher initialization with watched directories and patterns
        watcher.on('ready', () => {
            const watchedPaths = watcher.getWatched();
            const watchedCount = Object.keys(watchedPaths).reduce((count, dir) => {
                return count + watchedPaths[dir].length;
            }, 0);

            logger.info('File watcher initialized and ready', {
                watchedDirectories: Object.keys(watchedPaths).length,
                watchedFiles: watchedCount,
                debounceDelay: debounceDelay
            });
        });

        // Handle file watcher errors with detailed logging
        watcher.on('error', (error) => {
            logger.error('File watcher error', {
                error: error.message,
                stack: error.stack
            });
        });

        // Return configured file watcher instance ready for development monitoring
        return watcher;

    } catch (error) {
        logger.error('Failed to setup file watcher', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`File watcher setup failed: ${error.message}`);
    }
}

/**
 * Handles file change events by performing graceful server restart with debouncing,
 * logging, and error handling to provide seamless development experience during code modifications.
 *
 * @param {string} filePath - Path of the file that changed
 * @param {string} changeType - Type of change ('change', 'add', 'unlink')
 * @returns {Promise<void>} Resolves when server restart is complete after file change
 */
async function handleFileChange(filePath, changeType) {
    try {
        // Check if restart is already in progress to prevent multiple simultaneous restarts
        if (isRestartInProgress) {
            logger.debug('Restart already in progress, ignoring file change', {
                filePath: filePath,
                changeType: changeType
            });
            return;
        }

        // Log file change detection with file path, change type, and timestamp
        logger.info('File change detected - initiating server restart', {
            filePath: filePath,
            changeType: changeType,
            timestamp: new Date().toISOString(),
            restartCount: restartCount + 1
        });

        // Set restart in progress flag to prevent concurrent restart attempts
        isRestartInProgress = true;
        const restartStartTime = Date.now();

        // Stop current server instance gracefully using stopServer function
        logger.info('Stopping current server instance for restart');
        if (serverInstance) {
            await stopServer();
            serverInstance = null;
        }

        // Clear require cache for changed modules to ensure fresh code loading
        logger.debug('Clearing require cache for fresh code loading');
        clearRequireCache([
            /^(?!.*node_modules).*\.js$/,  // Clear all .js files except node_modules
            filePath // Clear the specific changed file
        ]);

        // Wait for server shutdown completion before starting new instance
        await new Promise(resolve => setTimeout(resolve, 100));

        // Start new server instance using startDevelopmentServer with same configuration
        logger.info('Starting new server instance with updated code');
        serverInstance = await startServer();

        // Increment restart counter and log successful restart with timing information
        restartCount++;
        const restartDuration = Date.now() - restartStartTime;

        logger.info('Server restart completed successfully', {
            filePath: filePath,
            changeType: changeType,
            restartDuration: `${restartDuration}ms`,
            restartCount: restartCount,
            newServerAddress: serverInstance ? serverInstance.address() : null
        });

        // Clear restart in progress flag to allow future restarts
        isRestartInProgress = false;

    } catch (error) {
        // Handle restart errors with detailed logging and recovery
        isRestartInProgress = false;
        logger.error('Server restart failed after file change', {
            filePath: filePath,
            changeType: changeType,
            error: error.message,
            stack: error.stack,
            restartCount: restartCount
        });

        // Provide helpful error recovery guidance
        await handleDevelopmentError(error, 'file-change-restart');
        
        // Attempt to restart the original server if restart failed
        try {
            logger.info('Attempting to recover original server after restart failure');
            serverInstance = await startServer();
            logger.info('Successfully recovered original server');
        } catch (recoveryError) {
            logger.error('Failed to recover original server', {
                error: recoveryError.message
            });
            throw recoveryError;
        }
    }
}

/**
 * Performs graceful shutdown of the development server including file watcher cleanup,
 * server shutdown, and development resource cleanup with comprehensive logging.
 *
 * @param {number} exitCode - Process exit code (default: 0 for normal shutdown)
 * @returns {Promise<void>} Resolves when development server shutdown is complete
 */
async function stopDevelopmentServer(exitCode = 0) {
    try {
        // Log development server shutdown initiation with reason and exit code
        logger.info('Initiating development server shutdown', {
            exitCode: exitCode,
            uptime: startTime ? Date.now() - startTime.getTime() : null,
            restartCount: restartCount,
            shutdownTime: new Date().toISOString()
        });

        // Close file watcher to stop monitoring file changes during shutdown
        if (fileWatcher) {
            logger.info('Closing file watcher');
            await fileWatcher.close();
            fileWatcher = null;
            logger.debug('File watcher closed successfully');
        }

        // Stop lifecycle manager and perform graceful server shutdown using stopServer
        if (lifecycleManager) {
            logger.info('Stopping lifecycle manager');
            await lifecycleManager.stop();
            lifecycleManager = null;
        }

        // Stop server instance if still running
        if (serverInstance) {
            logger.info('Stopping server instance');
            await stopServer();
            serverInstance = null;
        }

        // Clean up development-specific resources and event listeners
        logger.debug('Cleaning up development-specific resources');
        
        // Clear require cache if needed for complete cleanup
        if (process.env.NODE_ENV === 'development') {
            logger.debug('Clearing require cache for development cleanup');
            // Selective cache clearing to avoid breaking system modules
        }

        // Log development session summary including uptime and restart count
        const sessionSummary = {
            uptime: startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0,
            restartCount: restartCount,
            exitCode: exitCode,
            shutdownReason: exitCode === 0 ? 'normal-shutdown' : 'error-shutdown'
        };

        logger.info('Development session summary', sessionSummary);

        // Log successful development server shutdown with cleanup confirmation
        logger.info('Development server shutdown completed successfully', {
            cleanupComplete: true,
            sessionSummary: sessionSummary
        });

        // Exit process with appropriate exit code if running as standalone script
        if (require.main === module) {
            process.exit(exitCode);
        }

    } catch (error) {
        logger.error('Development server shutdown failed', {
            error: error.message,
            stack: error.stack
        });
        
        // Force exit on shutdown failure
        if (require.main === module) {
            process.exit(1);
        }
        
        throw error;
    }
}

/**
 * Performs comprehensive validation of development environment including Node.js version,
 * dependencies, configuration, and development tools availability.
 *
 * @returns {Object} Validation result with success status, warnings, and configuration details
 */
function validateDevelopmentEnvironment() {
    try {
        logger.info('Performing comprehensive development environment validation');
        
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            details: {}
        };

        // Validate Node.js version meets minimum requirements (v18+) for Express.js 5.1.0 compatibility
        const nodeVersion = process.version;
        const nodeMajorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        validationResult.details.nodeVersion = nodeVersion;
        
        if (nodeMajorVersion < 18) {
            validationResult.isValid = false;
            validationResult.errors.push(`Node.js version ${nodeVersion} is not supported. Express.js 5.1.0 requires Node.js v18 or higher.`);
        } else if (nodeMajorVersion >= 22) {
            validationResult.details.nodeVersionStatus = 'recommended-lts';
        } else {
            validationResult.warnings.push(`Node.js version ${nodeVersion} is supported but v22.x LTS is recommended for optimal performance.`);
            validationResult.details.nodeVersionStatus = 'supported';
        }

        // Check for required development dependencies including chokidar for file watching
        try {
            const chokidarVersion = require('chokidar/package.json').version;
            validationResult.details.chokidarVersion = chokidarVersion;
            logger.debug('Chokidar file watcher available', { version: chokidarVersion });
        } catch (error) {
            validationResult.isValid = false;
            validationResult.errors.push('Chokidar file watcher dependency not found. Run: npm install chokidar@^4.0.1');
        }

        // Validate development environment configuration using configuration validation utilities
        const configValidation = validateConfiguration();
        validationResult.details.configurationValid = configValidation.isValid;
        
        if (!configValidation.isValid) {
            validationResult.warnings.push('Configuration validation issues detected');
            validationResult.details.configurationErrors = configValidation.errors;
        }

        // Check port availability for development server binding
        const port = configuration.server?.port || 3000;
        validationResult.details.port = port;
        
        if (port < 1024 && process.platform !== 'win32') {
            validationResult.warnings.push(`Port ${port} may require elevated privileges on Unix systems`);
        }

        // Verify file system permissions for file watching and temporary file creation
        const fs = require('fs');
        try {
            fs.accessSync(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
            validationResult.details.fileSystemPermissions = 'ok';
        } catch (error) {
            validationResult.warnings.push('File system permissions may be restricted for file watching');
            validationResult.details.fileSystemPermissions = 'limited';
        }

        // Validate development-specific environment variables and settings
        const developmentEnvValid = isDevelopmentEnvironment();
        validationResult.details.developmentEnvironment = developmentEnvValid;
        
        if (!developmentEnvValid) {
            validationResult.warnings.push('NODE_ENV is not set to development - some development features may be disabled');
        }

        // Check for development tools and utilities availability
        validationResult.details.developmentToolsAvailable = {
            fileWatcher: Boolean(fileWatcher),
            enhancedLogging: true,
            environmentValidation: true
        };

        // Return comprehensive validation result with detailed status and recommendations
        logger.info('Development environment validation completed', {
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length
        });

        return validationResult;

    } catch (error) {
        logger.error('Development environment validation failed', {
            error: error.message,
            stack: error.stack
        });
        
        return {
            isValid: false,
            errors: [`Validation process failed: ${error.message}`],
            warnings: [],
            details: {}
        };
    }
}

/**
 * Displays comprehensive development server information including endpoints, configuration,
 * development features, and helpful development tips for enhanced learning experience.
 *
 * @param {Object} serverInfo - Server information object with configuration and runtime details
 * @returns {void} Outputs formatted development information to console
 */
function displayDevelopmentInfo(serverInfo) {
    try {
        const { serverAddress, applicationName, applicationVersion, startTime, fileWatchingEnabled, environmentSummary } = serverInfo;
        
        // Display application banner with name, version, and development mode indicator
        console.log('\n' + '='.repeat(80));
        console.log(`🚀 ${applicationName} v${applicationVersion} - DEVELOPMENT MODE`);
        console.log('='.repeat(80));
        
        // Show server configuration including port, host, and environment settings
        console.log('\n📊 SERVER CONFIGURATION:');
        console.log(`   • Server URL: http://${serverAddress.address}:${serverAddress.port}`);
        console.log(`   • Environment: ${environmentSummary.environment.environmentType}`);
        console.log(`   • Node.js Version: ${environmentSummary.runtime.node.version}`);
        console.log(`   • Platform: ${environmentSummary.runtime.node.platform}-${environmentSummary.runtime.node.architecture}`);
        
        // List available endpoints with full URLs for easy testing
        console.log('\n🌐 AVAILABLE ENDPOINTS:');
        console.log(`   • Hello Endpoint: http://${serverAddress.address}:${serverAddress.port}/hello`);
        console.log(`   • Health Check: http://${serverAddress.address}:${serverAddress.port}/health (if available)`);
        
        // Display development features including file watching, auto-restart, and debugging options
        console.log('\n🔧 DEVELOPMENT FEATURES:');
        console.log(`   • File Watching: ${fileWatchingEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log(`   • Auto-restart: ${fileWatchingEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log('   • Enhanced Logging: ✅ ENABLED');
        console.log('   • Development Debugging: ✅ ENABLED');
        
        // Show helpful development tips including testing commands and debugging techniques
        console.log('\n💡 DEVELOPMENT TIPS:');
        console.log('   • Test the server: curl http://localhost:' + serverAddress.port + '/hello');
        console.log('   • Browser test: Open http://localhost:' + serverAddress.port + '/hello in your browser');
        console.log('   • File changes will automatically restart the server');
        console.log('   • Press Ctrl+C to stop the development server');
        console.log('   • Check logs for detailed request/response information');
        
        // Include Node.js and Express.js version information for educational reference
        console.log('\n📚 TECHNOLOGY STACK:');
        console.log(`   • Node.js: ${process.version} (${process.platform})`);
        console.log('   • Express.js: 5.1.0 (latest stable)');
        console.log('   • File Watcher: chokidar v4.0.1');
        
        // Display file watching status and monitored directories for developer awareness
        if (fileWatchingEnabled) {
            console.log('\n👀 FILE WATCHING:');
            console.log('   • Monitoring: src/, config/, lib/, routes/, middleware/, services/, utils/');
            console.log('   • Ignoring: node_modules/, test/, coverage/, logs/, .git/');
            console.log('   • Debounce: 500ms (prevents excessive restarts)');
        }
        
        // Show development server ready message with clear instructions for getting started
        console.log('\n🎉 DEVELOPMENT SERVER READY!');
        console.log(`   Started at: ${startTime.toLocaleString()}`);
        console.log('   Happy coding! 🚀\n');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        logger.error('Failed to display development information', {
            error: error.message
        });
        
        // Fallback minimal display
        console.log('\n🚀 Development Server Started');
        console.log(`Server running on: http://localhost:${serverInfo.serverAddress?.port || 3000}`);
        console.log('Press Ctrl+C to stop\n');
    }
}

/**
 * Configures enhanced logging for development environment with detailed request logging,
 * error reporting, and development-specific debugging information.
 *
 * @param {Object} loggingConfig - Logging configuration options for development environment
 * @returns {void} Configures development logging with enhanced verbosity and debugging
 */
function setupDevelopmentLogging(loggingConfig = {}) {
    try {
        // Set log level to DEBUG for comprehensive development debugging information
        if (process.env.LOG_LEVEL !== 'debug') {
            process.env.LOG_LEVEL = 'debug';
            logger.info('Log level set to DEBUG for development environment');
        }

        // Enable colored console output for better readability in development terminal
        if (!process.env.FORCE_COLOR) {
            process.env.FORCE_COLOR = '1';
        }

        // Configure request logging middleware for detailed HTTP request information
        logger.debug('Development logging configuration applied', {
            logLevel: 'debug',
            coloredOutput: true,
            enhancedDebugging: true,
            requestLogging: true
        });

        // Log development logging configuration confirmation with active settings
        logger.info('Development logging setup completed', {
            logLevel: process.env.LOG_LEVEL,
            colorOutput: Boolean(process.env.FORCE_COLOR),
            developmentMode: true
        });

    } catch (error) {
        logger.error('Failed to setup development logging', {
            error: error.message
        });
    }
}

/**
 * Handles development-specific errors with enhanced error reporting, stack traces,
 * debugging information, and recovery suggestions for improved learning experience.
 *
 * @param {Error} error - Error object to handle with development-specific processing
 * @param {string} context - Context information describing where the error occurred
 * @returns {void} Logs detailed error information and provides recovery guidance
 */
async function handleDevelopmentError(error, context) {
    try {
        // Log detailed error information including error message, stack trace, and context
        logger.error('Development error encountered', {
            error: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform
        });

        // Include system information and development environment details in error report
        const systemInfo = {
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cwd: process.cwd(),
            pid: process.pid
        };

        logger.debug('System information at error time', systemInfo);

        // Provide debugging suggestions and common solutions for typical development errors
        console.log('\n🔥 DEVELOPMENT ERROR DETECTED');
        console.log('━'.repeat(60));
        console.log(`Context: ${context}`);
        console.log(`Error: ${error.message}`);
        
        // Provide context-specific debugging suggestions
        const debuggingSuggestions = getDebuggingsuggestions(error, context);
        if (debuggingSuggestions.length > 0) {
            console.log('\n💡 DEBUGGING SUGGESTIONS:');
            debuggingSuggestions.forEach((suggestion, index) => {
                console.log(`   ${index + 1}. ${suggestion}`);
            });
        }

        // Include links to documentation and educational resources for error resolution
        console.log('\n📚 HELPFUL RESOURCES:');
        console.log('   • Node.js Documentation: https://nodejs.org/docs/');
        console.log('   • Express.js Guide: https://expressjs.com/guide/');
        console.log('   • NPM Troubleshooting: https://docs.npmjs.com/troubleshooting');
        
        console.log('\n' + '━'.repeat(60) + '\n');

    } catch (loggingError) {
        // Fallback error handling if main error handler fails
        console.error('Failed to handle development error:', loggingError.message);
        console.error('Original error:', error.message);
    }
}

/**
 * Gets context-specific debugging suggestions based on error type and context.
 *
 * @param {Error} error - The error that occurred
 * @param {string} context - Context where the error occurred
 * @returns {Array<string>} Array of debugging suggestions
 */
function getDebuggingsuggestions(error, context) {
    const suggestions = [];
    
    switch (context) {
        case 'development-server-startup':
            suggestions.push('Check if port is already in use: netstat -an | grep :3000');
            suggestions.push('Verify Node.js version: node --version (requires v18+)');
            suggestions.push('Check dependencies: npm list');
            break;
            
        case 'file-change-restart':
            suggestions.push('Check file permissions in the project directory');
            suggestions.push('Verify file watcher patterns are not too broad');
            suggestions.push('Try manual restart: Ctrl+C then npm run dev');
            break;
            
        default:
            suggestions.push('Check the full error stack trace above');
            suggestions.push('Verify all dependencies are installed: npm install');
            suggestions.push('Check Node.js and npm versions compatibility');
    }
    
    return suggestions;
}

/**
 * Clears the Node.js require cache for specified modules to ensure fresh code loading
 * during development restarts and hot reload functionality.
 *
 * @param {Array<RegExp|string>} modulePatterns - Patterns to match modules for cache clearing
 * @returns {void} Clears require cache for specified modules
 */
function clearRequireCache(modulePatterns = []) {
    try {
        let clearedCount = 0;
        
        // Iterate through require cache entries to find modules matching specified patterns
        Object.keys(require.cache).forEach(moduleId => {
            // Delete cache entries for application modules but preserve node_modules cache
            const shouldClear = modulePatterns.some(pattern => {
                if (pattern instanceof RegExp) {
                    return pattern.test(moduleId);
                }
                return moduleId.includes(pattern);
            });
            
            if (shouldClear && !moduleId.includes('node_modules')) {
                delete require.cache[moduleId];
                clearedCount++;
                logger.debug('Cleared from require cache', { moduleId });
            }
        });

        // Log cache clearing operations with module names for development debugging
        logger.debug('Require cache clearing completed', {
            clearedModules: clearedCount,
            totalCacheSize: Object.keys(require.cache).length
        });

    } catch (error) {
        logger.error('Failed to clear require cache', {
            error: error.message
        });
    }
}

/**
 * Registers development-specific shutdown handlers for clean process termination.
 */
function registerDevelopmentShutdownHandlers() {
    // Register process signal handlers for graceful development server shutdown
    const shutdownHandler = (signal) => {
        logger.info('Shutdown signal received in development mode', { signal });
        
        stopDevelopmentServer(0).catch(error => {
            logger.error('Error during shutdown', { error: error.message });
            process.exit(1);
        });
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
    process.on('SIGQUIT', shutdownHandler);

    // Handle uncaught exceptions in development
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception in development server', {
            error: error.message,
            stack: error.stack
        });
        
        handleDevelopmentError(error, 'uncaught-exception').then(() => {
            stopDevelopmentServer(1);
        });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled promise rejection in development server', {
            reason: reason,
            promise: promise
        });
        
        const error = reason instanceof Error ? reason : new Error(String(reason));
        handleDevelopmentError(error, 'unhandled-rejection').then(() => {
            stopDevelopmentServer(1);
        });
    });
}

/**
 * Main entry point for the development script that orchestrates the complete development
 * server startup with validation, configuration, and enhanced development features for
 * optimal learning experience.
 *
 * @returns {Promise<void>} Resolves when development server is fully initialized and ready
 */
async function main() {
    try {
        // Set NODE_ENV to development if not already set for development-specific behavior
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = 'development';
            logger.info('NODE_ENV set to development for development-specific features');
        }

        // Validate development environment and dependencies using validateDevelopmentEnvironment
        logger.info('Validating development environment and dependencies');
        const environmentValidation = validateDevelopmentEnvironment();
        
        if (!environmentValidation.isValid) {
            logger.error('Development environment validation failed', {
                errors: environmentValidation.errors
            });
            
            console.log('\n❌ DEVELOPMENT ENVIRONMENT VALIDATION FAILED');
            console.log('━'.repeat(60));
            environmentValidation.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
            console.log('━'.repeat(60) + '\n');
            
            process.exit(1);
        }

        if (environmentValidation.warnings.length > 0) {
            logger.warn('Development environment validation warnings', {
                warnings: environmentValidation.warnings
            });
        }

        // Setup development-specific logging configuration for enhanced debugging
        setupDevelopmentLogging();

        // Display development information and helpful tips for getting started
        logger.info('Development environment validated successfully - starting server');

        // Start development server with file watching and auto-restart capabilities
        await startDevelopmentServer({
            enableFileWatching: true,
            watchDebounceDelay: 500
        });

        // Confirm successful development server initialization and display ready message
        logger.info('Development script initialization completed successfully');

    } catch (error) {
        // Handle development startup errors with detailed error reporting and recovery suggestions
        logger.error('Development script initialization failed', {
            error: error.message,
            stack: error.stack
        });
        
        await handleDevelopmentError(error, 'development-script-main');
        process.exit(1);
    }
}

// Export development functions for programmatic use
module.exports = {
    startDevelopmentServer,
    stopDevelopmentServer,
    setupFileWatcher,
    validateDevelopmentEnvironment
};

// Execute main function if script is run directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error in development script:', error.message);
        process.exit(1);
    });
}