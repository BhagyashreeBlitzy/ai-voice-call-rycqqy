// External dependencies
const { ESLint } = require('eslint'); // ^8.0.0 - Core ESLint engine for programmatic linting
const chalk = require('chalk'); // ^5.3.0 - Terminal string styling for colorized output
const path = require('node:path'); // builtin - Path utilities for file system operations
const process = require('node:process'); // builtin - Process control and environment variables

// Internal dependencies
const { Logger } = require('../utils/logger.js'); // Centralized logging system for structured output

// Global configuration constants
const LINT_TARGETS = ['src/**/*.js']; // Default linting targets for backend codebase
const ESLINT_CONFIG_PATH = 'src/backend/.eslintrc.js'; // Path to ESLint configuration file

// Initialize logger for structured output and error reporting
const logger = new Logger();

// Exit codes for different execution scenarios
const EXIT_CODES = {
    SUCCESS: 0,        // No errors found, linting passed
    LINT_ERRORS: 1,    // Linting errors found, build should fail
    FATAL_ERROR: 2     // Fatal error occurred, unable to complete linting
};

// ESLint severity levels for result processing
const SEVERITY_LEVELS = {
    OFF: 0,      // Rule is disabled
    WARN: 1,     // Warning level violation
    ERROR: 2     // Error level violation
};

/**
 * Runs ESLint on the specified codebase targets using the project's ESLint configuration.
 * Handles result formatting, logging, and process exit codes for automation and CI/CD integration.
 * Provides developer-friendly output with colorized reporting and structured logging.
 * 
 * @async
 * @param {string[]} targets - Array of file patterns to lint (e.g., ['src/**/*.js'])
 * @returns {Promise<void>} Resolves when linting is complete; rejects or exits process on fatal error
 * @throws {Error} Throws on fatal ESLint configuration or execution errors
 * 
 * @example
 * // Lint default targets
 * await runLint(['src/**/*.js']);
 * 
 * // Lint specific files
 * await runLint(['src/controllers/*.js', 'src/services/*.js']);
 * 
 * // Lint with custom configuration
 * await runLint(['src/**/*.js']);
 */
async function runLint(targets = LINT_TARGETS) {
    try {
        // Step 1: Initialize logger and log linting start
        logger.info('Starting ESLint code quality check', {
            targets: targets,
            configPath: ESLINT_CONFIG_PATH,
            eslintVersion: require('eslint/package.json').version
        });

        // Step 2: Create ESLint instance with project configuration
        const eslint = new ESLint({
            configFile: path.resolve(ESLINT_CONFIG_PATH),
            useEslintrc: true,
            extensions: ['.js'],
            cache: true,
            cacheLocation: path.resolve('.eslintcache'),
            fix: false, // Don't auto-fix in lint script, separate fix script should handle this
            reportUnusedDisableDirectives: 'warn'
        });

        // Step 3: Validate ESLint configuration
        logger.debug('Validating ESLint configuration', {
            configPath: ESLINT_CONFIG_PATH,
            cacheEnabled: true
        });

        // Check if configuration file exists and is valid
        const configExists = await isValidESLintConfig(eslint);
        if (!configExists) {
            const errorMessage = `ESLint configuration file not found or invalid: ${ESLINT_CONFIG_PATH}`;
            logger.error(errorMessage, {
                configPath: ESLINT_CONFIG_PATH,
                workingDirectory: process.cwd()
            });
            process.exit(EXIT_CODES.FATAL_ERROR);
        }

        // Step 4: Run ESLint on specified targets
        logger.info('Running ESLint analysis on targets', {
            targetCount: targets.length,
            targets: targets
        });

        const results = await eslint.lintFiles(targets);

        // Step 5: Process and analyze results
        const { 
            totalFiles, 
            totalErrors, 
            totalWarnings, 
            errorFiles, 
            warningFiles 
        } = analyzeResults(results);

        logger.info('ESLint analysis completed', {
            totalFiles: totalFiles,
            totalErrors: totalErrors,
            totalWarnings: totalWarnings,
            errorFiles: errorFiles.length,
            warningFiles: warningFiles.length
        });

        // Step 6: Format and display results using ESLint's built-in formatter
        const formatter = await eslint.loadFormatter('stylish');
        const formattedResults = formatter.format(results);

        // Step 7: Log results with appropriate severity and colorization
        if (totalErrors > 0) {
            // Log error summary with red colorization
            const errorSummary = chalk.red.bold(`✖ ${totalErrors} error(s) found in ${errorFiles.length} file(s)`);
            console.log(errorSummary);
            
            // Log detailed formatted results
            if (formattedResults.trim()) {
                console.log(formattedResults);
            }

            // Log structured error information
            logger.error('ESLint errors found - build should fail', {
                totalErrors: totalErrors,
                errorFiles: errorFiles.map(file => ({
                    filePath: file.filePath,
                    errorCount: file.errorCount,
                    messages: file.messages.filter(msg => msg.severity === SEVERITY_LEVELS.ERROR)
                }))
            });

            // Exit with lint error code
            process.exit(EXIT_CODES.LINT_ERRORS);
        }

        if (totalWarnings > 0) {
            // Log warning summary with yellow colorization
            const warningSummary = chalk.yellow.bold(`⚠ ${totalWarnings} warning(s) found in ${warningFiles.length} file(s)`);
            console.log(warningSummary);
            
            // Log detailed formatted results
            if (formattedResults.trim()) {
                console.log(formattedResults);
            }

            // Log structured warning information
            logger.warn('ESLint warnings found - continuing with build', {
                totalWarnings: totalWarnings,
                warningFiles: warningFiles.map(file => ({
                    filePath: file.filePath,
                    warningCount: file.warningCount,
                    messages: file.messages.filter(msg => msg.severity === SEVERITY_LEVELS.WARN)
                }))
            });

            // Check if we should fail on warnings (CI/CD configuration)
            if (process.env.FAIL_ON_WARNINGS === 'true') {
                logger.error('Failing build due to FAIL_ON_WARNINGS=true configuration');
                process.exit(EXIT_CODES.LINT_ERRORS);
            }
        }

        // Step 8: Log success message if no errors or warnings
        if (totalErrors === 0 && totalWarnings === 0) {
            const successMessage = chalk.green.bold('✓ All files passed ESLint checks');
            console.log(successMessage);
            
            logger.info('ESLint check completed successfully - no issues found', {
                totalFiles: totalFiles,
                status: 'success'
            });
        }

        // Step 9: Exit with success code
        process.exit(EXIT_CODES.SUCCESS);

    } catch (error) {
        // Handle fatal errors (configuration issues, file system errors, etc.)
        const errorMessage = 'Fatal error occurred during ESLint execution';
        
        logger.error(errorMessage, {
            error: error.message,
            stack: error.stack,
            targets: targets,
            configPath: ESLINT_CONFIG_PATH
        });

        // Display user-friendly error message with colorization
        console.error(chalk.red.bold('✖ ESLint execution failed'));
        console.error(chalk.red(`Error: ${error.message}`));
        
        // Provide troubleshooting information
        console.error(chalk.gray('Troubleshooting:'));
        console.error(chalk.gray('- Check ESLint configuration file exists and is valid'));
        console.error(chalk.gray('- Verify file patterns match existing files'));
        console.error(chalk.gray('- Ensure all ESLint plugins are installed'));
        console.error(chalk.gray('- Check file permissions and disk space'));

        // Exit with fatal error code
        process.exit(EXIT_CODES.FATAL_ERROR);
    }
}

/**
 * Validates ESLint configuration and checks if it's accessible.
 * Provides early validation to prevent runtime configuration errors.
 * 
 * @async
 * @param {ESLint} eslint - ESLint instance to validate
 * @returns {Promise<boolean>} True if configuration is valid, false otherwise
 * @private
 */
async function isValidESLintConfig(eslint) {
    try {
        // Attempt to calculate configuration for a test file
        await eslint.calculateConfigForFile('test.js');
        return true;
    } catch (error) {
        logger.debug('ESLint configuration validation failed', {
            error: error.message,
            configPath: ESLINT_CONFIG_PATH
        });
        return false;
    }
}

/**
 * Analyzes ESLint results to extract summary statistics and categorize issues.
 * Provides detailed metrics for reporting and decision-making.
 * 
 * @param {Object[]} results - ESLint results array
 * @returns {Object} Analysis summary with counts and categorized files
 * @private
 */
function analyzeResults(results) {
    let totalFiles = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    const errorFiles = [];
    const warningFiles = [];

    for (const result of results) {
        totalFiles++;
        
        // Count errors and warnings for this file
        let fileErrors = 0;
        let fileWarnings = 0;

        for (const message of result.messages) {
            if (message.severity === SEVERITY_LEVELS.ERROR) {
                fileErrors++;
                totalErrors++;
            } else if (message.severity === SEVERITY_LEVELS.WARN) {
                fileWarnings++;
                totalWarnings++;
            }
        }

        // Categorize files by issue type
        if (fileErrors > 0) {
            errorFiles.push({
                filePath: result.filePath,
                errorCount: fileErrors,
                warningCount: fileWarnings,
                messages: result.messages
            });
        } else if (fileWarnings > 0) {
            warningFiles.push({
                filePath: result.filePath,
                warningCount: fileWarnings,
                messages: result.messages
            });
        }
    }

    return {
        totalFiles,
        totalErrors,
        totalWarnings,
        errorFiles,
        warningFiles
    };
}

/**
 * Provides formatted summary of linting results for logging and reporting.
 * Used internally for structured logging and external reporting.
 * 
 * @param {Object} analysis - Results analysis from analyzeResults
 * @returns {string} Formatted summary text
 * @private
 */
function formatSummary(analysis) {
    const { totalFiles, totalErrors, totalWarnings } = analysis;
    
    let summary = `Linted ${totalFiles} file(s)`;
    
    if (totalErrors > 0) {
        summary += `, ${totalErrors} error(s)`;
    }
    
    if (totalWarnings > 0) {
        summary += `, ${totalWarnings} warning(s)`;
    }
    
    if (totalErrors === 0 && totalWarnings === 0) {
        summary += ', no issues found';
    }
    
    return summary;
}

/**
 * Handles process termination signals gracefully.
 * Ensures proper cleanup and logging before exit.
 * 
 * @param {string} signal - Signal name (SIGINT, SIGTERM, etc.)
 * @private
 */
function handleProcessSignal(signal) {
    logger.warn(`Received ${signal} signal - terminating ESLint process`, {
        signal: signal,
        pid: process.pid
    });
    
    console.log(chalk.yellow(`\n⚠ ESLint process interrupted by ${signal}`));
    process.exit(EXIT_CODES.FATAL_ERROR);
}

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => handleProcessSignal('SIGINT'));
process.on('SIGTERM', () => handleProcessSignal('SIGTERM'));

// Handle uncaught exceptions to prevent silent failures
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in lint script', {
        error: error.message,
        stack: error.stack,
        pid: process.pid
    });
    
    console.error(chalk.red.bold('✖ Uncaught exception occurred'));
    console.error(chalk.red(`Error: ${error.message}`));
    
    process.exit(EXIT_CODES.FATAL_ERROR);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection in lint script', {
        reason: reason,
        promise: promise,
        pid: process.pid
    });
    
    console.error(chalk.red.bold('✖ Unhandled promise rejection'));
    console.error(chalk.red(`Reason: ${reason}`));
    
    process.exit(EXIT_CODES.FATAL_ERROR);
});

// If script is run directly (not imported), execute with default targets
if (require.main === module) {
    const targets = process.argv.slice(2);
    const lintTargets = targets.length > 0 ? targets : LINT_TARGETS;
    
    logger.info('ESLint script started', {
        targets: lintTargets,
        args: process.argv,
        cwd: process.cwd(),
        nodeVersion: process.version
    });
    
    runLint(lintTargets).catch((error) => {
        logger.error('Failed to run lint script', {
            error: error.message,
            stack: error.stack
        });
        process.exit(EXIT_CODES.FATAL_ERROR);
    });
}

// Export for use in other modules and testing
module.exports = {
    runLint,
    EXIT_CODES,
    LINT_TARGETS,
    ESLINT_CONFIG_PATH
};