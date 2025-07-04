// Node.js built-in process module for environment variable access
const process = require('process'); // Node.js 18.x+

// Global constants for configuration defaults and validation
const DEFAULT_PORT = 3000;
const VALID_PORT_RANGE = {
    min: 1024,
    max: 65535
};

// Valid environment values for application deployment
const VALID_ENVIRONMENTS = ['development', 'production', 'test'];

/**
 * Determines the current application environment based on NODE_ENV environment variable.
 * Provides a consistent way to identify the runtime environment across the application.
 * 
 * @returns {string} Current environment string (e.g., 'development', 'production', 'test')
 * @example
 * // NODE_ENV=production
 * const env = getEnvironment(); // Returns 'production'
 * 
 * // NODE_ENV not set
 * const env = getEnvironment(); // Returns 'development'
 */
function getEnvironment() {
    // Read NODE_ENV from process environment variables
    const nodeEnv = process.env.NODE_ENV;
    
    // Check if NODE_ENV is set and is one of the valid environment values
    if (nodeEnv && VALID_ENVIRONMENTS.includes(nodeEnv)) {
        return nodeEnv;
    }
    
    // Default to 'development' if NODE_ENV is not set or invalid
    return 'development';
}

/**
 * Validates that a given port number is an integer within the allowed range.
 * Ensures port values are safe and within the valid TCP port range.
 * 
 * @param {number} port - The port number to validate
 * @returns {boolean} True if the port is valid, false otherwise
 * @example
 * validatePort(3000); // Returns true
 * validatePort(80);   // Returns false (below minimum)
 * validatePort(70000); // Returns false (above maximum)
 */
function validatePort(port) {
    // Check if port is a number and is an integer
    if (typeof port !== 'number' || !Number.isInteger(port)) {
        return false;
    }
    
    // Check if port is within the valid range
    if (port >= VALID_PORT_RANGE.min && port <= VALID_PORT_RANGE.max) {
        return true;
    }
    
    return false;
}

/**
 * Determines the port number for the HTTP server.
 * Uses the PORT environment variable if set and valid, otherwise defaults to DEFAULT_PORT.
 * Includes comprehensive validation and error handling for production reliability.
 * 
 * @returns {number} Port number to be used by the server
 * @example
 * // PORT=8080
 * const port = getPort(); // Returns 8080
 * 
 * // PORT not set
 * const port = getPort(); // Returns 3000
 * 
 * // PORT=invalid
 * const port = getPort(); // Returns 3000 (default)
 */
function getPort() {
    // Read PORT from process environment variables
    const portEnv = process.env.PORT;
    
    // If PORT is set, attempt to parse it as an integer
    if (portEnv) {
        const parsedPort = parseInt(portEnv, 10);
        
        // Validate that the parsed port is a valid integer and within range
        if (validatePort(parsedPort)) {
            return parsedPort;
        }
        
        // Log warning for invalid port configuration (helpful for debugging)
        console.warn(`Invalid PORT environment variable: ${portEnv}. Using default port ${DEFAULT_PORT}.`);
    }
    
    // Return default port if PORT is not set or invalid
    return DEFAULT_PORT;
}

// Initialize configuration values on module load for consistent access
const ENVIRONMENT = getEnvironment();
const PORT = getPort();

// Configuration metadata for monitoring and observability
const CONFIG_METADATA = {
    initialized: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    defaultPort: DEFAULT_PORT,
    validPortRange: VALID_PORT_RANGE,
    validEnvironments: VALID_ENVIRONMENTS
};

/**
 * Retrieves comprehensive configuration information for monitoring and debugging.
 * Provides detailed runtime configuration state for observability purposes.
 * 
 * @returns {Object} Configuration metadata and current values
 * @example
 * const config = getConfigInfo();
 * console.log('App started with config:', config);
 */
function getConfigInfo() {
    return {
        environment: ENVIRONMENT,
        port: PORT,
        metadata: CONFIG_METADATA,
        environmentVariables: {
            NODE_ENV: process.env.NODE_ENV || 'not set',
            PORT: process.env.PORT || 'not set'
        }
    };
}

/**
 * Validates the current configuration state and reports any issues.
 * Useful for startup validation and health checks.
 * 
 * @returns {Object} Validation results with status and any warnings
 * @example
 * const validation = validateConfiguration();
 * if (!validation.isValid) {
 *     console.warn('Configuration warnings:', validation.warnings);
 * }
 */
function validateConfiguration() {
    const warnings = [];
    let isValid = true;
    
    // Check if running in production without explicit NODE_ENV
    if (ENVIRONMENT === 'development' && !process.env.NODE_ENV) {
        warnings.push('NODE_ENV not set, defaulting to development mode');
    }
    
    // Check if using default port in production
    if (ENVIRONMENT === 'production' && PORT === DEFAULT_PORT && !process.env.PORT) {
        warnings.push('Using default port in production, consider setting PORT environment variable');
    }
    
    // Validate port is in safe range
    if (!validatePort(PORT)) {
        warnings.push(`Port ${PORT} is outside recommended range (${VALID_PORT_RANGE.min}-${VALID_PORT_RANGE.max})`);
        isValid = false;
    }
    
    return {
        isValid,
        warnings,
        environment: ENVIRONMENT,
        port: PORT
    };
}

// Export configuration values and utility functions
module.exports = {
    // Primary configuration values
    ENVIRONMENT,
    PORT,
    
    // Utility functions for dynamic configuration access
    getEnvironment,
    getPort,
    
    // Validation and introspection functions
    validatePort,
    getConfigInfo,
    validateConfiguration,
    
    // Constants for external reference
    DEFAULT_PORT,
    VALID_PORT_RANGE,
    VALID_ENVIRONMENTS
};