// Node.js built-in modules for process management and path resolution
const process = require('node:process'); // Built-in Node.js module
const path = require('node:path'); // Built-in Node.js module

// Child process module for spawning Jest as a separate process
const { spawn } = require('node:child_process');

// Jest testing framework v29.0.0 - Modern JavaScript testing framework
const jest = require('jest');

// Import Jest configuration from the parent directory
const jestConfig = require('../jest.config.js');

// Global variables for Jest CLI and configuration paths
// Resolved path to the Jest CLI executable (node_modules/.bin/jest or require('jest').run)
const JEST_CLI_PATH = path.resolve(__dirname, '..', 'node_modules', '.bin', 'jest');

// Resolved path to the Jest configuration file (../jest.config.js)
const JEST_CONFIG_PATH = path.resolve(__dirname, '..', 'jest.config.js');

/**
 * Executes the Jest test runner with the loaded configuration, ensuring all tests 
 * are run in the correct environment. Handles process exit codes for CI/CD compatibility.
 * 
 * This function serves as the main orchestration point for test execution, providing:
 * - Jest CLI process spawning with proper configuration
 * - Real-time stdout/stderr piping for immediate feedback
 * - Proper exit code handling for CI/CD pipeline integration
 * - Error handling for Jest execution failures
 * 
 * @returns {Promise<void>} Resolves when tests complete; process exits with appropriate code
 */
async function runJest() {
    try {
        // Log test execution start with configuration details
        console.log('[TEST] Starting Jest test runner...');
        console.log(`[TEST] Jest CLI Path: ${JEST_CLI_PATH}`);
        console.log(`[TEST] Jest Config Path: ${JEST_CONFIG_PATH}`);
        console.log(`[TEST] Test Environment: ${jestConfig.testEnvironment}`);
        console.log(`[TEST] Coverage Collection: ${jestConfig.collectCoverage}`);
        console.log('[TEST] ================================');
        
        // Resolve the path to the Jest CLI executable
        // Check if Jest CLI exists in node_modules/.bin, fallback to npx jest
        const fs = require('node:fs');
        let jestCommand;
        let jestArgs;
        
        if (fs.existsSync(JEST_CLI_PATH)) {
            // Use local Jest installation
            jestCommand = JEST_CLI_PATH;
            jestArgs = ['--config', JEST_CONFIG_PATH];
        } else {
            // Fallback to npx jest if local installation not found
            jestCommand = 'npx';
            jestArgs = ['jest', '--config', JEST_CONFIG_PATH];
        }
        
        // Add additional Jest options for CI/CD compatibility
        jestArgs.push('--verbose'); // Verbose output for detailed test results
        jestArgs.push('--no-cache'); // Disable cache to ensure clean test runs
        jestArgs.push('--forceExit'); // Force Jest to exit after tests complete
        
        // Add coverage options if coverage collection is enabled
        if (jestConfig.collectCoverage) {
            jestArgs.push('--coverage');
            jestArgs.push('--coverageDirectory', jestConfig.coverageDirectory);
        }
        
        // Log the command that will be executed
        console.log(`[TEST] Executing: ${jestCommand} ${jestArgs.join(' ')}`);
        console.log('[TEST] ================================');
        
        // Spawn a child process to run Jest with the configuration file
        const jestProcess = spawn(jestCommand, jestArgs, {
            // Use the current working directory as the Jest execution context
            cwd: path.resolve(__dirname, '..'),
            
            // Inherit environment variables from the parent process
            env: {
                ...process.env,
                // Ensure NODE_ENV is set to 'test' for proper test environment
                NODE_ENV: 'test',
                // Force color output for better readability
                FORCE_COLOR: '1'
            },
            
            // Configure stdio to pipe output to parent process
            stdio: 'pipe'
        });
        
        // Pipe stdout and stderr to the parent process for real-time test output
        // This ensures that test output is visible in both local and CI/CD environments
        jestProcess.stdout.on('data', (data) => {
            // Write Jest stdout to parent process stdout
            process.stdout.write(data);
        });
        
        jestProcess.stderr.on('data', (data) => {
            // Write Jest stderr to parent process stderr
            process.stderr.write(data);
        });
        
        // Handle Jest process errors (e.g., command not found, execution errors)
        jestProcess.on('error', (error) => {
            console.error('[TEST] Error occurred while spawning Jest process:', error.message);
            
            // Check for common error conditions and provide helpful messages
            if (error.code === 'ENOENT') {
                console.error('[TEST] Jest CLI not found. Please ensure Jest is installed:');
                console.error('[TEST] npm install --save-dev jest');
            } else {
                console.error('[TEST] Jest execution error:', error);
            }
            
            // Exit with error code 1 for CI/CD failure detection
            process.exit(1);
        });
        
        // Wait for the Jest process to exit and handle the exit code
        return new Promise((resolve, reject) => {
            jestProcess.on('close', (code) => {
                console.log('[TEST] ================================');
                console.log(`[TEST] Jest process exited with code: ${code}`);
                
                // If Jest exits with code 0, all tests passed successfully
                if (code === 0) {
                    console.log('[TEST] All tests passed successfully! 🎉');
                    console.log('[TEST] Test execution completed.');
                    
                    // Exit the script with code 0 (success) for CI/CD compatibility
                    process.exit(0);
                } else {
                    // If Jest exits with non-zero code, tests failed or encountered errors
                    console.error(`[TEST] Tests failed with exit code: ${code}`);
                    console.error('[TEST] Please review the test output above for details.');
                    
                    // Exit the script with the same code as Jest (failure) for CI/CD compatibility
                    process.exit(code);
                }
            });
        });
        
    } catch (error) {
        // If an error occurs while spawning or running Jest, log the error and exit with code 1
        console.error('[TEST] Unexpected error during test execution:', error.message);
        console.error('[TEST] Stack trace:', error.stack);
        
        // Exit with error code 1 for CI/CD failure detection
        process.exit(1);
    }
}

// Export the runJest function for potential import in other modules
// Main function to orchestrate test execution. Invoked when the script is run directly.
// Not typically imported elsewhere, but available for programmatic usage.
module.exports = {
    runJest
};

// Check if this script is being run directly (not imported)
// This allows the script to be executed via 'npm test' or 'node ./scripts/test.js'
if (require.main === module) {
    // Execute the test runner when script is run directly
    console.log('[TEST] Node.js Tutorial Backend Test Runner');
    console.log('[TEST] Test orchestration script starting...');
    
    // Run Jest with error handling for top-level execution
    runJest().catch((error) => {
        console.error('[TEST] Fatal error during test execution:', error);
        process.exit(1);
    });
}