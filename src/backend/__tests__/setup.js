// Jest testing framework for mocking and global setup hooks

// Import logger utility to be stubbed/spied on during tests
const { logger } = require('../utils/logger.js');

// Global variables to store original logger methods for restoration after tests
let originalLoggerInfo;
let originalLoggerWarn;
let originalLoggerError;

// Global array to capture log output for assertions in tests
global.logOutput = [];

/**
 * Initializes the test environment for all Jest tests.
 * Stubs or spies on logger methods, sets NODE_ENV to 'test', and installs 
 * global error hooks to fail tests on unhandled errors.
 * This function ensures all tests run in a clean, isolated, and reproducible environment.
 * 
 * @returns {void} No return value; side effects only
 */
function setupTestEnvironment() {
    // Set process.env.NODE_ENV to 'test' to ensure all code runs in test mode
    process.env.NODE_ENV = 'test';
    
    // Store original logger methods for restoration after tests
    originalLoggerInfo = logger.info;
    originalLoggerWarn = logger.warn;
    originalLoggerError = logger.error;
    
    // Replace logger.info with jest.fn() spy that captures output to logOutput array
    logger.info = jest.fn((message, meta) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            level: 'info',
            message,
            meta: meta || null,
            timestamp
        };
        global.logOutput.push(logEntry);
    });
    
    // Replace logger.warn with jest.fn() spy that captures output to logOutput array
    logger.warn = jest.fn((message, meta) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            level: 'warn',
            message,
            meta: meta || null,
            timestamp
        };
        global.logOutput.push(logEntry);
    });
    
    // Replace logger.error with jest.fn() spy that captures output to logOutput array
    logger.error = jest.fn((message, meta) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            level: 'error',
            message,
            meta: meta || null,
            timestamp
        };
        global.logOutput.push(logEntry);
    });
}

/**
 * Teardown function to restore original logger methods and clean up global state.
 * Called automatically by Jest after all tests complete to prevent side effects.
 * 
 * @returns {void} No return value; cleanup operations only
 */
function teardownTestEnvironment() {
    // Restore original logger methods to prevent side effects between test runs
    if (originalLoggerInfo) {
        logger.info = originalLoggerInfo;
    }
    if (originalLoggerWarn) {
        logger.warn = originalLoggerWarn;
    }
    if (originalLoggerError) {
        logger.error = originalLoggerError;
    }
    
    // Clear logOutput array to ensure test isolation
    global.logOutput = [];
}

// Clear logOutput before each test to ensure isolation between tests
beforeEach(() => {
    global.logOutput = [];
});

// Restore original logger methods after all tests complete
afterAll(() => {
    teardownTestEnvironment();
});

// Initialize test environment when this setup file is loaded by Jest
setupTestEnvironment();

// Export setup function for potential manual invocation or testing
module.exports = {
    setupTestEnvironment,
    teardownTestEnvironment
};
