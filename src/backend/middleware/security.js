// External dependencies for HTTP security headers and CORS policy
const helmet = require('helmet'); // helmet v7.0.0 - Applies comprehensive HTTP security headers
const cors = require('cors'); // cors v2.8.5 - Enables Cross-Origin Resource Sharing configuration

// Internal dependencies for logging security events
const { logger } = require('../utils/logger.js');

// Default helmet configuration with comprehensive security headers
// Implements industry-standard security practices as per OWASP recommendations
const DEFAULT_HELMET_OPTIONS = {
    // Content Security Policy - Controls resources the user agent is allowed to load
    contentSecurityPolicy: {
        useDefaults: true
    },
    // Cross-Origin Embedder Policy - Controls embedding of cross-origin resources
    crossOriginEmbedderPolicy: true,
    // Cross-Origin Opener Policy - Controls cross-origin window interactions
    crossOriginOpenerPolicy: true,
    // Cross-Origin Resource Policy - Controls cross-origin resource sharing
    crossOriginResourcePolicy: {
        policy: 'same-origin'
    },
    // DNS Prefetch Control - Controls browser DNS prefetching
    dnsPrefetchControl: true,
    // Expect-CT header for Certificate Transparency
    expectCt: true,
    // X-Frame-Options - Prevents clickjacking attacks
    frameguard: {
        action: 'deny'
    },
    // Hide X-Powered-By header to prevent server fingerprinting
    hidePoweredBy: true,
    // HTTP Strict Transport Security - Enforces secure connections
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true
    },
    // X-Download-Options for IE8+ to prevent file execution
    ieNoOpen: true,
    // X-Content-Type-Options - Prevents MIME type sniffing
    noSniff: true,
    // Origin-Agent-Cluster - Controls origin clustering for better isolation
    originAgentCluster: true,
    // X-Permitted-Cross-Domain-Policies - Controls Flash/PDF cross-domain policies
    permittedCrossDomainPolicies: true,
    // Referrer-Policy - Controls referrer information in requests
    referrerPolicy: {
        policy: 'no-referrer'
    },
    // X-XSS-Protection - Legacy XSS protection (deprecated but still useful)
    xssFilter: true
};

// Default CORS configuration for basic cross-origin access control
// Configured conservatively for security with minimal access by default
const DEFAULT_CORS_OPTIONS = {
    // Allow all origins for development/tutorial purposes
    origin: '*',
    // Only allow GET methods by default for security
    methods: ['GET'],
    // Return 204 for successful OPTIONS requests
    optionsSuccessStatus: 204
};

/**
 * Factory function that creates and returns an array of Express middleware functions
 * for applying comprehensive HTTP security headers and CORS policy.
 * 
 * This middleware is designed to be the first in the Express middleware stack,
 * ensuring all responses are protected before any other processing occurs.
 * 
 * @param {Object} [helmetOptions={}] - Optional helmet configuration overrides
 * @param {Object} [corsOptions={}] - Optional CORS configuration overrides
 * @returns {Array} Array of Express middleware functions [helmet, cors]
 */
function securityMiddleware(helmetOptions = {}, corsOptions = {}) {
    // Log security middleware initialization for observability
    logger.info('Initializing security middleware with helmet and CORS protection', {
        helmetOverrides: Object.keys(helmetOptions).length > 0 ? Object.keys(helmetOptions) : 'none',
        corsOverrides: Object.keys(corsOptions).length > 0 ? Object.keys(corsOptions) : 'none'
    });

    // Merge provided helmet options with secure defaults
    // Spread operator ensures user options override defaults while maintaining type safety
    const mergedHelmetOptions = {
        ...DEFAULT_HELMET_OPTIONS,
        ...helmetOptions
    };

    // Merge provided CORS options with secure defaults
    // Allows customization while maintaining security baseline
    const mergedCorsOptions = {
        ...DEFAULT_CORS_OPTIONS,
        ...corsOptions
    };

    // Log configuration warnings for potentially insecure overrides
    if (corsOptions.origin === '*' || mergedCorsOptions.origin === '*') {
        logger.warn('CORS configured to allow all origins - consider restricting in production', {
            currentOrigin: mergedCorsOptions.origin
        });
    }

    if (corsOptions.methods && Array.isArray(corsOptions.methods) && corsOptions.methods.length > 1) {
        logger.warn('CORS configured with multiple HTTP methods - ensure all methods are necessary', {
            allowedMethods: mergedCorsOptions.methods
        });
    }

    // Log successful security middleware configuration
    logger.info('Security middleware configured successfully', {
        helmetEnabled: true,
        corsEnabled: true,
        hstsMaxAge: mergedHelmetOptions.hsts.maxAge,
        corsOrigin: mergedCorsOptions.origin,
        allowedMethods: mergedCorsOptions.methods
    });

    // Create helmet middleware instance with merged configuration
    // Helmet applies comprehensive security headers to all responses
    const helmetMiddleware = helmet(mergedHelmetOptions);

    // Create CORS middleware instance with merged configuration
    // CORS handles cross-origin resource sharing policies
    const corsMiddleware = cors(mergedCorsOptions);

    // Return array of middleware functions for Express middleware stack
    // Order matters: helmet first for security headers, then CORS for cross-origin policy
    return [helmetMiddleware, corsMiddleware];
}

// Export the security middleware factory function for use in Express application
// Named export allows for clear import semantics and tree-shaking optimization
module.exports = {
    securityMiddleware
};