// Import internal utilities for logging and error handling
const { logger } = require('../utils/logger.js');
const { AppError } = require('../utils/errors.js');

// Import Node.js built-in process module for environment variable access
const process = require('process'); // Built-in Node.js module

// Global configuration constants with sensible defaults for the HTTP server and Express.js app
// These constants provide fallback values when environment variables are not set or invalid

/**
 * Default port number for HTTP server binding
 * Standard development port that doesn't require elevated privileges (>1024)
 * Aligns with common Node.js development practices and tutorial expectations
 */
const DEFAULT_PORT = 3000;

/**
 * Default Node.js environment setting for development scenarios
 * Controls Express.js behavior, logging verbosity, and error handling patterns
 * Safe default that enables debugging features for educational purposes
 */
const DEFAULT_ENV = 'development';

/**
 * Default HTTP request timeout in milliseconds (30 seconds)
 * Prevents hanging connections and resource exhaustion in production deployments
 * Balances user experience with server resource protection
 */
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

/**
 * Array of valid Node.js environment values accepted by the application
 * Enforces strict environment validation to prevent configuration errors
 * Supports common deployment scenarios: development, production, and testing
 */
const VALID_ENVS = ['development', 'production', 'test'];

/**
 * Valid port number range [minimum, maximum] for HTTP server binding
 * Enforces IANA-compliant port selection avoiding system/privileged ports (<1024)
 * Prevents binding conflicts with well-known services and maintains security
 */
const PORT_RANGE = [1024, 65535];

/**
 * Resolves, validates, and returns the server configuration object for HTTP server and Express.js initialization
 * 
 * This function implements the Twelve-Factor App methodology by reading configuration from environment variables
 * with intelligent fallbacks and comprehensive validation. It ensures the server starts with correct parameters
 * and fails fast on misconfiguration to prevent undefined server state.
 * 
 * The function performs the following operations:
 * 1. Reads PORT, NODE_ENV, and REQUEST_TIMEOUT_MS from process.env
 * 2. Validates and parses each configuration value with type checking
 * 3. Applies sensible defaults with warning logs for missing values
 * 4. Enforces strict validation rules (port range, environment whitelist)
 * 5. Logs the resolved configuration for transparency and debugging
 * 6. Throws AppError for invalid configuration to fail fast
 * 
 * @returns {object} Server configuration object: { port: number, env: string, requestTimeoutMs: number }
 * @throws {AppError} When port is outside valid range or environment is invalid
 * 
 * @example
 * // Environment variables set: PORT=8080, NODE_ENV=production
 * const config = getServerConfig();
 * // Returns: { port: 8080, env: 'production', requestTimeoutMs: 30000 }
 * 
 * @example  
 * // No environment variables set - uses defaults with warnings
 * const config = getServerConfig();
 * // Returns: { port: 3000, env: 'development', requestTimeoutMs: 30000 }
 */
function getServerConfig() {
    // Step 1: Read PORT, NODE_ENV, and REQUEST_TIMEOUT_MS from process.env
    // Environment variables are always strings, requiring parsing and validation
    const portEnv = process.env.PORT;
    const nodeEnv = process.env.NODE_ENV;
    const requestTimeoutEnv = process.env.REQUEST_TIMEOUT_MS;
    
    // Step 2: Parse PORT as integer; if not set or invalid, fallback to DEFAULT_PORT and log a warning
    let port;
    if (portEnv === undefined || portEnv === null || portEnv === '') {
        // PORT environment variable is not set - use default and log warning
        port = DEFAULT_PORT;
        logger.warn('PORT environment variable not set, using default port', { 
            defaultPort: DEFAULT_PORT,
            configSource: 'default fallback'
        });
    } else {
        // Attempt to parse PORT as integer with parseInt
        const parsedPort = parseInt(portEnv, 10);
        
        // Check if parsing resulted in a valid number (not NaN)
        if (isNaN(parsedPort)) {
            // PORT is set but not a valid number - use default and log warning
            port = DEFAULT_PORT;
            logger.warn('PORT environment variable is not a valid number, using default port', {
                providedValue: portEnv,
                defaultPort: DEFAULT_PORT,
                configSource: 'default fallback due to invalid value'
            });
        } else {
            // PORT was successfully parsed as integer
            port = parsedPort;
        }
    }
    
    // Step 3: Validate that PORT is within PORT_RANGE; if not, log error and throw AppError
    if (port < PORT_RANGE[0] || port > PORT_RANGE[1]) {
        // Port is outside valid range - this is a critical configuration error
        const errorMessage = `Port ${port} is outside valid range ${PORT_RANGE[0]}-${PORT_RANGE[1]}`;
        logger.error('Invalid port configuration detected', {
            providedPort: port,
            validRange: PORT_RANGE,
            originalValue: portEnv,
            errorType: 'configuration validation'
        });
        
        // Throw AppError to fail fast and prevent server startup with invalid configuration
        throw new AppError(errorMessage, 500, {
            configField: 'PORT',
            providedValue: port,
            validRange: PORT_RANGE
        });
    }
    
    // Step 4: Validate NODE_ENV against VALID_ENVS; if not set or invalid, fallback to DEFAULT_ENV and log a warning
    let env;
    if (nodeEnv === undefined || nodeEnv === null || nodeEnv === '') {
        // NODE_ENV environment variable is not set - use default and log warning
        env = DEFAULT_ENV;
        logger.warn('NODE_ENV environment variable not set, using default environment', {
            defaultEnv: DEFAULT_ENV,
            validEnvironments: VALID_ENVS,
            configSource: 'default fallback'
        });
    } else if (!VALID_ENVS.includes(nodeEnv)) {
        // NODE_ENV is set but not in the valid environments list - use default and log warning
        env = DEFAULT_ENV;
        logger.warn('NODE_ENV environment variable has invalid value, using default environment', {
            providedValue: nodeEnv,
            defaultEnv: DEFAULT_ENV,
            validEnvironments: VALID_ENVS,
            configSource: 'default fallback due to invalid value'
        });
    } else {
        // NODE_ENV is valid - use the provided value
        env = nodeEnv;
    }
    
    // Step 5: Parse REQUEST_TIMEOUT_MS as integer; if not set or invalid, fallback to DEFAULT_REQUEST_TIMEOUT_MS and log a warning
    let requestTimeoutMs;
    if (requestTimeoutEnv === undefined || requestTimeoutEnv === null || requestTimeoutEnv === '') {
        // REQUEST_TIMEOUT_MS environment variable is not set - use default and log warning
        requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS;
        logger.warn('REQUEST_TIMEOUT_MS environment variable not set, using default timeout', {
            defaultTimeout: DEFAULT_REQUEST_TIMEOUT_MS,
            configSource: 'default fallback'
        });
    } else {
        // Attempt to parse REQUEST_TIMEOUT_MS as integer with parseInt
        const parsedTimeout = parseInt(requestTimeoutEnv, 10);
        
        // Check if parsing resulted in a valid number (not NaN) and is positive
        if (isNaN(parsedTimeout) || parsedTimeout <= 0) {
            // REQUEST_TIMEOUT_MS is set but not a valid positive number - use default and log warning
            requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS;
            logger.warn('REQUEST_TIMEOUT_MS environment variable is not a valid positive number, using default timeout', {
                providedValue: requestTimeoutEnv,
                defaultTimeout: DEFAULT_REQUEST_TIMEOUT_MS,
                configSource: 'default fallback due to invalid value'
            });
        } else {
            // REQUEST_TIMEOUT_MS was successfully parsed as positive integer
            requestTimeoutMs = parsedTimeout;
        }
    }
    
    // Step 6: Log the resolved configuration using logger.info for transparency and debugging
    // This provides visibility into the final configuration values for operational monitoring
    logger.info('Server configuration resolved successfully', {
        resolvedConfig: {
            port: port,
            env: env,
            requestTimeoutMs: requestTimeoutMs
        },
        configSources: {
            port: portEnv ? 'environment variable' : 'default fallback',
            env: (nodeEnv && VALID_ENVS.includes(nodeEnv)) ? 'environment variable' : 'default fallback', 
            requestTimeoutMs: requestTimeoutEnv ? 'environment variable' : 'default fallback'
        },
        validationPassed: true
    });
    
    // Step 7: Return the configuration object: { port, env, requestTimeoutMs }
    // This object is used by app.js, index.js, and other entrypoints for consistent server initialization
    return {
        port: port,
        env: env,
        requestTimeoutMs: requestTimeoutMs
    };
}

// Export the configuration resolver function for use throughout the application
// Supports named import pattern and provides access to validated server configuration
module.exports = {
    getServerConfig
};