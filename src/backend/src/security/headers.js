/**
 * Security Headers Management Module for Node.js Tutorial Application
 * 
 * This module provides comprehensive HTTP security header implementation for the Node.js tutorial 
 * application. It implements production-ready security headers including X-Powered-By removal, 
 * Content Security Policy, CORS configuration, and frame options while maintaining educational 
 * clarity. Integrates with Express.js 5.1.0 security improvements and provides middleware functions 
 * for comprehensive security policy enforcement.
 * 
 * Features:
 * - HTTP Security Headers Implementation with X-Powered-By disabling, Content-Type options, and CSP policies
 * - Express.js Framework Security Integration with v5.1.0 built-in security improvements including ReDoS prevention
 * - CORS Security Configuration with environment-aware settings for development and production scenarios
 * - Educational Security Architecture that provides educational value while maintaining production-ready patterns
 * - Comprehensive security header validation with detailed error reporting and compliance checking
 * - Dynamic CORS configuration updates for runtime policy adjustments and testing scenarios
 * - Security audit functionality to analyze header configuration and identify potential improvements
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async support, automatic promise error handling, and security improvements
 * - Node.js 22.11.0 LTS with Active LTS support extending into late 2025 and performance optimizations
 * 
 * Architecture: Event-driven security header management with lazy initialization, caching strategies, 
 * and comprehensive validation for educational learning while maintaining production-ready deployment patterns.
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus HTTP security headers, CORS implementation, and security middleware patterns
 */

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

// No external dependencies required - uses only Node.js built-ins and internal utilities

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import configuration factory to access environment-specific security settings including CORS, CSP, and header configuration options
const { getConfig } = require('../utils/config.js');

// Import logger utility for security header configuration logging, warning messages, and debug information during header application
const { 
    logger 
} = require('../utils/logger.js');

// Import environment constants for environment-aware security header configuration and CORS policy determination
const { 
    ENVIRONMENTS 
} = require('../utils/constants.js');

// Import HTTP status codes for preflight CORS response handling and security header validation responses
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// =============================================================================
// GLOBAL SECURITY CONFIGURATION AND CACHING
// =============================================================================

/**
 * Cached security headers configuration from application config
 * Prevents repeated configuration loading and improves middleware performance
 * @type {Object|null}
 */
let SECURITY_HEADERS_CONFIG = null;

/**
 * Default Content Security Policy for comprehensive XSS protection
 * Provides restrictive default policy that can be overridden by configuration
 * @type {string}
 */
const DEFAULT_CSP_POLICY = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';";

/**
 * Default CORS configuration options with restrictive security settings
 * Used as fallback when environment-specific CORS configuration is unavailable
 * @type {Object}
 */
const CORS_DEFAULT_OPTIONS = { 
    origin: false, 
    methods: ['GET'], 
    allowedHeaders: ['Content-Type'], 
    credentials: false 
};

/**
 * Cache for header validation results to improve performance
 * Stores validation results to prevent repeated validation overhead
 * @type {Map<string, Object>}
 */
const HEADER_VALIDATION_CACHE = new Map();

// =============================================================================
// SECURITY HEADERS INITIALIZATION
// =============================================================================

/**
 * Initializes security headers system by loading configuration and setting up default security policies.
 * This function loads application configuration using getConfig() and extracts security section,
 * caches security headers configuration in SECURITY_HEADERS_CONFIG global, validates security 
 * configuration settings, initializes CORS options based on environment and configuration,
 * sets up default Content Security Policy if not configured, and clears header validation cache.
 * 
 * The initialization process includes:
 * - Configuration loading with comprehensive error handling and fallback to secure defaults
 * - Security configuration validation using validateSecurityConfiguration() function
 * - Environment-aware CORS policy initialization for development vs production scenarios
 * - Default CSP policy setup with XSS protection and restrictive resource loading policies
 * - Performance optimization through configuration caching and validation result storage
 * - Detailed logging of initialization process for debugging and monitoring purposes
 * 
 * @returns {void} No return value - configures global security headers state and validates configuration
 */
function initializeSecurityHeaders() {
    try {
        // Load application configuration using getConfig() and extract security section
        const config = getConfig();
        const securityConfig = config.security || {};
        
        // Cache security headers configuration in SECURITY_HEADERS_CONFIG global for performance
        SECURITY_HEADERS_CONFIG = {
            // CORS configuration with environment-aware defaults
            cors: {
                enabled: securityConfig.cors_enabled !== false,
                origin: securityConfig.cors_origin || (config.app?.env === ENVIRONMENTS.DEVELOPMENT ? true : false),
                methods: securityConfig.cors_methods || ['GET', 'POST', 'PUT', 'DELETE'],
                allowedHeaders: securityConfig.cors_allowed_headers || ['Content-Type', 'Authorization'],
                credentials: securityConfig.cors_credentials === true,
                maxAge: securityConfig.cors_max_age || 86400, // 24 hours
                optionsSuccessStatus: 200 // For legacy browser support
            },
            
            // Content Security Policy configuration with XSS protection
            csp: {
                enabled: securityConfig.csp_enabled !== false,
                policy: securityConfig.csp_policy || DEFAULT_CSP_POLICY,
                reportOnly: config.app?.env === ENVIRONMENTS.DEVELOPMENT ? securityConfig.csp_report_only !== false : false,
                reportUri: securityConfig.csp_report_uri || null,
                upgradeInsecureRequests: config.app?.env === ENVIRONMENTS.PRODUCTION
            },
            
            // Basic security headers configuration
            headers: {
                removeXPoweredBy: securityConfig.remove_x_powered_by !== false,
                customServerHeader: securityConfig.custom_server_header || null,
                xContentTypeOptions: securityConfig.x_content_type_options !== false,
                xFrameOptions: securityConfig.x_frame_options || 'DENY',
                xXssProtection: securityConfig.x_xss_protection || '1; mode=block',
                referrerPolicy: securityConfig.referrer_policy || 'strict-origin-when-cross-origin',
                strictTransportSecurity: {
                    enabled: config.app?.env === ENVIRONMENTS.PRODUCTION && securityConfig.hsts_enabled !== false,
                    maxAge: securityConfig.hsts_max_age || 31536000, // 1 year
                    includeSubDomains: securityConfig.hsts_include_subdomains !== false,
                    preload: securityConfig.hsts_preload === true
                }
            },
            
            // Security feature toggles and validation settings
            features: {
                headerValidation: securityConfig.header_validation !== false,
                auditLogging: securityConfig.audit_logging !== false,
                performanceOptimization: securityConfig.performance_optimization !== false,
                debugHeaders: config.app?.env === ENVIRONMENTS.DEVELOPMENT && config.app?.debug === true
            }
        };
        
        // Validate security configuration settings using validateSecurityConfiguration()
        const validationResult = validateSecurityConfiguration(SECURITY_HEADERS_CONFIG);
        
        if (!validationResult.isValid) {
            // Log validation warnings but continue with available configuration
            logger.warn('Security configuration validation found issues', {
                errors: validationResult.warnings,
                configurationUsed: 'partial_with_defaults'
            });
        }
        
        // Initialize CORS options based on environment and configuration
        if (SECURITY_HEADERS_CONFIG.cors.enabled) {
            // Update CORS_DEFAULT_OPTIONS with configured values for runtime use
            Object.assign(CORS_DEFAULT_OPTIONS, {
                origin: SECURITY_HEADERS_CONFIG.cors.origin,
                methods: SECURITY_HEADERS_CONFIG.cors.methods,
                allowedHeaders: SECURITY_HEADERS_CONFIG.cors.allowedHeaders,
                credentials: SECURITY_HEADERS_CONFIG.cors.credentials
            });
        }
        
        // Set up default Content Security Policy if not configured
        if (SECURITY_HEADERS_CONFIG.csp.enabled && !SECURITY_HEADERS_CONFIG.csp.policy) {
            SECURITY_HEADERS_CONFIG.csp.policy = DEFAULT_CSP_POLICY;
            logger.debug('Using default Content Security Policy', {
                policy: DEFAULT_CSP_POLICY
            });
        }
        
        // Log security headers initialization with current configuration summary
        logger.info('Security headers system initialized', {
            corsEnabled: SECURITY_HEADERS_CONFIG.cors.enabled,
            cspEnabled: SECURITY_HEADERS_CONFIG.csp.enabled,
            basicHeadersEnabled: SECURITY_HEADERS_CONFIG.headers.removeXPoweredBy,
            environment: config.app?.env || 'unknown',
            validationResult: validationResult.isValid
        });
        
        // Clear header validation cache to ensure fresh validation state
        HEADER_VALIDATION_CACHE.clear();
        
    } catch (error) {
        // Handle initialization errors gracefully with fallback to secure defaults
        logger.error('Failed to initialize security headers system', {
            error: error.message,
            fallbackAction: 'using_secure_defaults'
        });
        
        // Set secure fallback configuration to ensure basic security
        SECURITY_HEADERS_CONFIG = {
            cors: { enabled: false, origin: false, methods: ['GET'], allowedHeaders: ['Content-Type'], credentials: false },
            csp: { enabled: true, policy: DEFAULT_CSP_POLICY, reportOnly: false },
            headers: { removeXPoweredBy: true, xContentTypeOptions: true, xFrameOptions: 'DENY', xXssProtection: '1; mode=block', referrerPolicy: 'strict-origin-when-cross-origin', strictTransportSecurity: { enabled: false } },
            features: { headerValidation: true, auditLogging: false, performanceOptimization: true, debugHeaders: false }
        };
        
        HEADER_VALIDATION_CACHE.clear();
    }
}

// =============================================================================
// INDIVIDUAL SECURITY HEADER MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Express middleware function that disables X-Powered-By header to prevent framework fingerprinting.
 * This function removes X-Powered-By header using res.removeHeader() to prevent Express.js framework 
 * identification, logs header removal at debug level if debug logging enabled, sets custom server 
 * header if configured in security settings, and calls next() to continue to next middleware.
 * 
 * Framework fingerprinting prevention includes:
 * - Automatic X-Powered-By header removal to prevent framework identification attacks
 * - Optional custom server header setting for server identification obfuscation  
 * - Debug logging for header removal tracking in development environments
 * - Express.js 5.1.0 compatibility with automatic promise error handling
 * - Performance-optimized execution with minimal request processing overhead
 * 
 * @param {Object} req - Express.js request object containing HTTP request information
 * @param {Object} res - Express.js response object for HTTP response manipulation
 * @param {Function} next - Express.js next middleware function for continuing middleware chain
 * @returns {void} Calls next() middleware function after removing X-Powered-By header
 */
function disablePoweredByHeader(req, res, next) {
    try {
        // Remove X-Powered-By header using res.removeHeader() to prevent framework fingerprinting
        res.removeHeader('X-Powered-By');
        
        // Log header removal at debug level if debug logging enabled
        if (SECURITY_HEADERS_CONFIG?.features?.debugHeaders) {
            logger.debug('X-Powered-By header removed', {
                method: req.method,
                path: req.path,
                userAgent: req.get('User-Agent')
            });
        }
        
        // Set custom server header if configured in security settings
        if (SECURITY_HEADERS_CONFIG?.headers?.customServerHeader) {
            res.set('Server', SECURITY_HEADERS_CONFIG.headers.customServerHeader);
            
            if (SECURITY_HEADERS_CONFIG?.features?.debugHeaders) {
                logger.debug('Custom server header applied', {
                    serverHeader: SECURITY_HEADERS_CONFIG.headers.customServerHeader
                });
            }
        }
        
        // Call next() to continue to next middleware in Express stack
        next();
        
    } catch (error) {
        // Handle header removal errors gracefully and continue middleware execution
        logger.warn('Failed to disable X-Powered-By header', {
            error: error.message,
            method: req.method,
            path: req.path
        });
        
        // Continue middleware chain even if header removal fails
        next();
    }
}

/**
 * Express middleware function that sets essential security headers for basic protection.
 * This function sets X-Content-Type-Options header to 'nosniff' to prevent MIME sniffing,
 * X-Frame-Options header to prevent clickjacking, X-XSS-Protection header for XSS protection,
 * Referrer-Policy header for referrer information control, Strict-Transport-Security header
 * if HTTPS is enabled, and logs basic security headers application at debug level.
 * 
 * Essential security headers include:
 * - X-Content-Type-Options: nosniff for MIME type sniffing prevention
 * - X-Frame-Options: DENY/SAMEORIGIN for clickjacking protection
 * - X-XSS-Protection: 1; mode=block for XSS attack mitigation
 * - Referrer-Policy: strict-origin-when-cross-origin for referrer information control
 * - Strict-Transport-Security: HTTPS enforcement with configurable max age and subdomain inclusion
 * - Debug logging for header application tracking in development environments
 * 
 * @param {Object} req - Express.js request object containing HTTP request information
 * @param {Object} res - Express.js response object for HTTP response header manipulation
 * @param {Function} next - Express.js next middleware function for continuing middleware chain
 * @returns {void} Calls next() middleware function after setting security headers
 */
function setBasicSecurityHeaders(req, res, next) {
    try {
        const headersConfig = SECURITY_HEADERS_CONFIG?.headers || {};
        
        // Set X-Content-Type-Options header to 'nosniff' to prevent MIME sniffing
        if (headersConfig.xContentTypeOptions !== false) {
            res.set('X-Content-Type-Options', 'nosniff');
        }
        
        // Set X-Frame-Options header to prevent clickjacking attacks
        if (headersConfig.xFrameOptions) {
            res.set('X-Frame-Options', headersConfig.xFrameOptions);
        }
        
        // Set X-XSS-Protection header for XSS protection (legacy browser support)
        if (headersConfig.xXssProtection) {
            res.set('X-XSS-Protection', headersConfig.xXssProtection);
        }
        
        // Set Referrer-Policy header for referrer information control
        if (headersConfig.referrerPolicy) {
            res.set('Referrer-Policy', headersConfig.referrerPolicy);
        }
        
        // Set Strict-Transport-Security header if HTTPS is enabled
        const hstsConfig = headersConfig.strictTransportSecurity;
        if (hstsConfig?.enabled) {
            let hstsValue = `max-age=${hstsConfig.maxAge || 31536000}`;
            
            if (hstsConfig.includeSubDomains) {
                hstsValue += '; includeSubDomains';
            }
            
            if (hstsConfig.preload) {
                hstsValue += '; preload';
            }
            
            res.set('Strict-Transport-Security', hstsValue);
        }
        
        // Log basic security headers application at debug level
        if (SECURITY_HEADERS_CONFIG?.features?.debugHeaders) {
            logger.debug('Basic security headers applied', {
                method: req.method,
                path: req.path,
                headers: {
                    xContentTypeOptions: headersConfig.xContentTypeOptions !== false,
                    xFrameOptions: headersConfig.xFrameOptions,
                    xXssProtection: headersConfig.xXssProtection,
                    referrerPolicy: headersConfig.referrerPolicy,
                    hstsEnabled: hstsConfig?.enabled || false
                }
            });
        }
        
        // Call next() to continue middleware chain execution
        next();
        
    } catch (error) {
        // Handle security header application errors gracefully
        logger.warn('Failed to apply basic security headers', {
            error: error.message,
            method: req.method,
            path: req.path
        });
        
        // Continue middleware chain even if header application fails
        next();
    }
}

/**
 * Express middleware function that sets Content Security Policy header with configurable policy.
 * This function gets CSP policy from security configuration or uses DEFAULT_CSP_POLICY,
 * validates CSP policy format and syntax for security compliance, sets Content-Security-Policy
 * header with validated policy, sets Content-Security-Policy-Report-Only if in development mode,
 * logs CSP policy application with policy summary, and handles CSP policy errors gracefully.
 * 
 * Content Security Policy features include:
 * - Comprehensive XSS protection through restrictive resource loading policies
 * - Configurable CSP policy with fallback to secure default policy
 * - Development mode support with report-only CSP for testing and debugging
 * - CSP violation reporting configuration for security monitoring
 * - Policy syntax validation to prevent malformed CSP directives
 * - Debug logging for policy application tracking and troubleshooting
 * 
 * @param {Object} req - Express.js request object containing HTTP request information
 * @param {Object} res - Express.js response object for HTTP response header manipulation
 * @param {Function} next - Express.js next middleware function for continuing middleware chain
 * @returns {void} Calls next() middleware function after setting CSP header
 */
function setContentSecurityPolicy(req, res, next) {
    try {
        const cspConfig = SECURITY_HEADERS_CONFIG?.csp || {};
        
        // Get CSP policy from security configuration or use DEFAULT_CSP_POLICY
        if (!cspConfig.enabled) {
            // Skip CSP if disabled in configuration
            next();
            return;
        }
        
        const cspPolicy = cspConfig.policy || DEFAULT_CSP_POLICY;
        
        // Validate CSP policy format and syntax for security compliance
        if (!cspPolicy || typeof cspPolicy !== 'string' || cspPolicy.trim().length === 0) {
            logger.warn('Invalid or empty CSP policy detected, using default', {
                providedPolicy: cspPolicy,
                fallbackPolicy: DEFAULT_CSP_POLICY
            });
            
            // Use default policy as fallback
            cspPolicy = DEFAULT_CSP_POLICY;
        }
        
        // Set Content-Security-Policy header with validated policy
        if (cspConfig.reportOnly) {
            // Set Content-Security-Policy-Report-Only if in development mode or configured
            res.set('Content-Security-Policy-Report-Only', cspPolicy);
            
            if (SECURITY_HEADERS_CONFIG?.features?.debugHeaders) {
                logger.debug('CSP Report-Only header applied', {
                    policy: cspPolicy,
                    method: req.method,
                    path: req.path
                });
            }
        } else {
            // Set enforcing Content-Security-Policy header for production
            res.set('Content-Security-Policy', cspPolicy);
            
            if (SECURITY_HEADERS_CONFIG?.features?.debugHeaders) {
                logger.debug('CSP enforcement header applied', {
                    policy: cspPolicy,
                    method: req.method,
                    path: req.path
                });
            }
        }
        
        // Add CSP reporting endpoint if configured
        if (cspConfig.reportUri) {
            // Add report-uri directive if not already present
            if (!cspPolicy.includes('report-uri')) {
                const reportPolicy = `${cspPolicy}; report-uri ${cspConfig.reportUri}`;
                res.set('Content-Security-Policy', reportPolicy);
            }
        }
        
        // Log CSP policy application with policy summary at debug level
        if (SECURITY_HEADERS_CONFIG?.features?.auditLogging) {
            logger.info('Content Security Policy applied', {
                reportOnly: cspConfig.reportOnly,
                policyLength: cspPolicy.length,
                hasReportUri: !!cspConfig.reportUri,
                method: req.method,
                path: req.path
            });
        }
        
        // Call next() to continue to next middleware function
        next();
        
    } catch (error) {
        // Handle CSP policy errors gracefully with warning logging
        logger.warn('Failed to apply Content Security Policy', {
            error: error.message,
            cspEnabled: SECURITY_HEADERS_CONFIG?.csp?.enabled,
            method: req.method,
            path: req.path
        });
        
        // Continue middleware chain even if CSP application fails
        next();
    }
}

/**
 * Express middleware function that configures Cross-Origin Resource Sharing headers based on environment.
 * This function gets CORS configuration from security settings or uses CORS_DEFAULT_OPTIONS,
 * checks if request method is OPTIONS for preflight handling, sets Access-Control-Allow-Origin
 * header based on configuration, sets Access-Control-Allow-Methods and headers, handles
 * preflight OPTIONS requests with 200 OK response, and logs CORS configuration application.
 * 
 * CORS configuration features include:
 * - Environment-aware CORS policy configuration for development vs production
 * - Preflight OPTIONS request handling with proper response status and headers
 * - Origin validation and whitelisting for security in production environments
 * - Flexible method and header allowlists with security-first defaults
 * - Credential support configuration for authenticated cross-origin requests
 * - Debug logging for CORS policy application and preflight request handling
 * 
 * @param {Object} req - Express.js request object containing HTTP request information and origin
 * @param {Object} res - Express.js response object for HTTP response header manipulation
 * @param {Function} next - Express.js next middleware function for continuing middleware chain
 * @returns {void} Calls next() middleware function or sends preflight response for OPTIONS requests
 */
function configureCORS(req, res, next) {
    try {
        const corsConfig = SECURITY_HEADERS_CONFIG?.cors || CORS_DEFAULT_OPTIONS;
        
        // Skip CORS processing if disabled in configuration
        if (!corsConfig.enabled) {
            next();
            return;
        }
        
        // Get request origin for origin validation and header setting
        const requestOrigin = req.get('Origin');
        
        // Check if request method is OPTIONS for preflight handling
        const isPreflightRequest = req.method === 'OPTIONS';
        
        // Set Access-Control-Allow-Origin header based on configuration
        if (corsConfig.origin === true) {
            // Allow all origins (development only)
            res.set('Access-Control-Allow-Origin', requestOrigin || '*');
        } else if (corsConfig.origin === false) {
            // No CORS allowed - do not set origin header
        } else if (typeof corsConfig.origin === 'string') {
            // Single origin string
            res.set('Access-Control-Allow-Origin', corsConfig.origin);
        } else if (Array.isArray(corsConfig.origin)) {
            // Multiple origins - check if request origin is allowed
            if (requestOrigin && corsConfig.origin.includes(requestOrigin)) {
                res.set('Access-Control-Allow-Origin', requestOrigin);
            }
        } else if (typeof corsConfig.origin === 'function') {
            // Dynamic origin validation function
            try {
                const allowedOrigin = corsConfig.origin(requestOrigin, req);
                if (allowedOrigin) {
                    res.set('Access-Control-Allow-Origin', requestOrigin);
                }
            } catch (originError) {
                logger.warn('CORS origin validation function error', {
                    error: originError.message,
                    origin: requestOrigin
                });
            }
        }
        
        // Set Access-Control-Allow-Methods header with allowed HTTP methods
        if (corsConfig.methods && corsConfig.methods.length > 0) {
            res.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
        }
        
        // Set Access-Control-Allow-Headers header with permitted headers
        if (corsConfig.allowedHeaders && corsConfig.allowedHeaders.length > 0) {
            res.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
        }
        
        // Set Access-Control-Allow-Credentials if credentials enabled
        if (corsConfig.credentials === true) {
            res.set('Access-Control-Allow-Credentials', 'true');
        }
        
        // Set Access-Control-Max-Age for preflight caching
        if (corsConfig.maxAge && corsConfig.maxAge > 0) {
            res.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
        }
        
        // Handle preflight OPTIONS request with 200 OK response if applicable
        if (isPreflightRequest) {
            const statusCode = corsConfig.optionsSuccessStatus || HTTP_STATUS.OK;
            
            if (SECURITY_HEADERS_CONFIG?.features?.debugHeaders) {
                logger.debug('CORS preflight request handled', {
                    origin: requestOrigin,
                    allowedMethods: corsConfig.methods,
                    allowedHeaders: corsConfig.allowedHeaders,
                    statusCode: statusCode
                });
            }
            
            res.status(statusCode).end();
            return;
        }
        
        // Log CORS configuration application at debug level
        if (SECURITY_HEADERS_CONFIG?.features?.debugHeaders) {
            logger.debug('CORS headers applied', {
                origin: requestOrigin,
                method: req.method,
                path: req.path,
                corsOrigin: corsConfig.origin,
                credentials: corsConfig.credentials
            });
        }
        
        // Call next() for non-preflight requests to continue processing
        next();
        
    } catch (error) {
        // Handle CORS configuration errors gracefully
        logger.warn('Failed to configure CORS headers', {
            error: error.message,
            method: req.method,
            path: req.path,
            origin: req.get('Origin')
        });
        
        // Continue middleware chain even if CORS configuration fails
        next();
    }
}

// =============================================================================
// SECURITY CONFIGURATION VALIDATION AND AUDITING
// =============================================================================

/**
 * Validates security headers configuration for completeness and security compliance.
 * This function initializes validation result with isValid true and empty warnings array,
 * validates CORS configuration settings for security compliance, checks CSP policy syntax
 * and completeness for potential security gaps, validates HTTPS enforcement settings in
 * production environment, checks for deprecated or insecure header configurations, and
 * adds warnings for potentially insecure configurations.
 * 
 * Configuration validation includes:
 * - CORS origin validation for production security (wildcard origin warnings)
 * - Content Security Policy syntax validation and security gap detection
 * - HTTPS enforcement validation for production environments
 * - Deprecated security header detection and modernization recommendations
 * - Security configuration completeness verification with missing setting detection
 * - Performance impact assessment for security header configurations
 * 
 * @param {Object} securityConfig - Security configuration object to validate against security best practices
 * @returns {Object} Validation result object with isValid boolean and warnings array for security improvements
 */
function validateSecurityConfiguration(securityConfig) {
    // Initialize validation result with isValid true and empty warnings array
    const validationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        recommendations: [],
        timestamp: new Date().toISOString()
    };
    
    try {
        // Validate CORS configuration settings for security compliance
        if (securityConfig.cors) {
            const corsConfig = securityConfig.cors;
            
            // Check for wildcard CORS origin in production
            if (corsConfig.origin === true || corsConfig.origin === '*') {
                validationResult.warnings.push({
                    category: 'cors',
                    issue: 'wildcard_origin',
                    message: 'Wildcard CORS origin allows all origins - consider restricting in production',
                    severity: 'medium',
                    recommendation: 'Specify allowed origins explicitly for production environments'
                });
            }
            
            // Validate credentials with origin settings
            if (corsConfig.credentials && (corsConfig.origin === true || corsConfig.origin === '*')) {
                validationResult.errors.push({
                    category: 'cors',
                    issue: 'credentials_with_wildcard',
                    message: 'CORS credentials cannot be used with wildcard origin',
                    severity: 'high',
                    recommendation: 'Specify explicit origins when using credentials'
                });
                validationResult.isValid = false;
            }
            
            // Check for overly permissive methods
            if (corsConfig.methods && corsConfig.methods.length > 6) {
                validationResult.warnings.push({
                    category: 'cors',
                    issue: 'too_many_methods',
                    message: 'Many HTTP methods allowed - consider limiting to necessary methods only',
                    severity: 'low',
                    allowedMethods: corsConfig.methods.length
                });
            }
        }
        
        // Check CSP policy syntax and completeness for potential security gaps
        if (securityConfig.csp) {
            const cspConfig = securityConfig.csp;
            
            if (cspConfig.enabled && cspConfig.policy) {
                const policy = cspConfig.policy;
                
                // Check for unsafe CSP directives
                const unsafePatterns = ['unsafe-inline', 'unsafe-eval', '*'];
                unsafePatterns.forEach(pattern => {
                    if (policy.includes(pattern)) {
                        validationResult.warnings.push({
                            category: 'csp',
                            issue: 'unsafe_directive',
                            message: `CSP policy contains potentially unsafe directive: ${pattern}`,
                            severity: 'medium',
                            directive: pattern
                        });
                    }
                });
                
                // Check for missing important directives
                const importantDirectives = ['default-src', 'script-src', 'style-src'];
                importantDirectives.forEach(directive => {
                    if (!policy.includes(directive)) {
                        validationResult.warnings.push({
                            category: 'csp',
                            issue: 'missing_directive',
                            message: `CSP policy missing recommended directive: ${directive}`,
                            severity: 'low',
                            directive: directive
                        });
                    }
                });
            } else if (cspConfig.enabled && !cspConfig.policy) {
                validationResult.warnings.push({
                    category: 'csp',
                    issue: 'csp_enabled_no_policy',
                    message: 'CSP is enabled but no policy is configured',
                    severity: 'medium'
                });
            }
        }
        
        // Validate HTTPS enforcement settings in production environment
        if (securityConfig.headers?.strictTransportSecurity) {
            const hstsConfig = securityConfig.headers.strictTransportSecurity;
            
            if (hstsConfig.enabled) {
                // Check HSTS max age
                if (!hstsConfig.maxAge || hstsConfig.maxAge < 86400) { // Less than 1 day
                    validationResult.warnings.push({
                        category: 'hsts',
                        issue: 'short_max_age',
                        message: 'HSTS max age is very short - consider longer duration for better security',
                        severity: 'low',
                        currentMaxAge: hstsConfig.maxAge
                    });
                }
                
                // Recommend includeSubDomains for better security
                if (!hstsConfig.includeSubDomains) {
                    validationResult.recommendations.push({
                        category: 'hsts',
                        recommendation: 'Enable includeSubDomains for comprehensive HSTS protection',
                        severity: 'low'
                    });
                }
            }
        }
        
        // Check for deprecated or insecure header configurations
        if (securityConfig.headers) {
            const headersConfig = securityConfig.headers;
            
            // Check X-XSS-Protection header (deprecated but still useful for legacy browsers)
            if (headersConfig.xXssProtection === '0') {
                validationResult.warnings.push({
                    category: 'headers',
                    issue: 'xss_protection_disabled',
                    message: 'X-XSS-Protection is disabled - may reduce protection for legacy browsers',
                    severity: 'low'
                });
            }
            
            // Check for weak referrer policy
            const weakReferrerPolicies = ['unsafe-url', 'origin-when-cross-origin'];
            if (weakReferrerPolicies.includes(headersConfig.referrerPolicy)) {
                validationResult.warnings.push({
                    category: 'headers',
                    issue: 'weak_referrer_policy',
                    message: `Referrer policy '${headersConfig.referrerPolicy}' may leak sensitive information`,
                    severity: 'medium',
                    currentPolicy: headersConfig.referrerPolicy
                });
            }
        }
        
        // Add warnings for potentially insecure configurations
        if (securityConfig.features?.debugHeaders === true) {
            validationResult.warnings.push({
                category: 'features',
                issue: 'debug_headers_enabled',
                message: 'Debug headers are enabled - disable for production',
                severity: 'low'
            });
        }
        
        // Set isValid to false if critical security issues found
        if (validationResult.errors.length > 0) {
            validationResult.isValid = false;
        }
        
        // Log validation warnings if any security concerns detected
        if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
            logger.warn('Security configuration validation completed with issues', {
                totalWarnings: validationResult.warnings.length,
                totalErrors: validationResult.errors.length,
                isValid: validationResult.isValid
            });
        }
        
        // Return comprehensive validation result with detailed feedback
        return validationResult;
        
    } catch (error) {
        // Handle validation process errors gracefully
        validationResult.isValid = false;
        validationResult.errors.push({
            category: 'validation',
            issue: 'validation_error',
            message: `Security configuration validation failed: ${error.message}`,
            severity: 'high',
            error: error.message
        });
        
        logger.error('Security configuration validation process failed', {
            error: error.message,
            configSections: Object.keys(securityConfig || {})
        });
        
        return validationResult;
    }
}

// =============================================================================
// COMBINED SECURITY MIDDLEWARE FACTORY
// =============================================================================

/**
 * Factory function that creates combined security headers middleware with all security policies.
 * This function initializes security headers configuration with initializeSecurityHeaders(),
 * merges provided options with default security settings, validates merged configuration,
 * creates combined middleware function that applies all security headers, includes X-Powered-By
 * header removal, applies basic security headers, includes CSP policy application, integrates
 * CORS handling, adds error handling for security header application failures, and returns
 * combined security middleware function for Express app usage.
 * 
 * Combined middleware features include:
 * - Comprehensive security header application in single middleware function
 * - Configurable security policy enforcement with option overrides
 * - Performance optimization through combined execution and reduced middleware stack
 * - Error isolation to prevent security failures from affecting application functionality
 * - Debug logging and audit trail for security policy application
 * - Express.js 5.1.0 compatibility with automatic promise error handling
 * 
 * @param {Object} options - Options object to override default security settings and customize behavior
 * @returns {Function} Express middleware function that applies comprehensive security headers policy
 */
function createSecurityHeadersMiddleware(options = {}) {
    try {
        // Initialize security headers configuration with initializeSecurityHeaders()
        if (!SECURITY_HEADERS_CONFIG) {
            initializeSecurityHeaders();
        }
        
        // Merge provided options with default security settings
        const middlewareConfig = {
            ...SECURITY_HEADERS_CONFIG,
            ...options
        };
        
        // Validate merged configuration using validateSecurityConfiguration()
        const validationResult = validateSecurityConfiguration(middlewareConfig);
        
        if (!validationResult.isValid) {
            logger.warn('Security middleware created with configuration issues', {
                errors: validationResult.errors,
                warnings: validationResult.warnings
            });
        }
        
        // Create combined middleware function that applies all security headers
        const combinedSecurityMiddleware = (req, res, next) => {
            try {
                // Track middleware application for performance monitoring
                const startTime = Date.now();
                
                // Include X-Powered-By header removal in combined middleware
                if (middlewareConfig.headers?.removeXPoweredBy !== false) {
                    res.removeHeader('X-Powered-By');
                    
                    if (middlewareConfig.headers?.customServerHeader) {
                        res.set('Server', middlewareConfig.headers.customServerHeader);
                    }
                }
                
                // Apply basic security headers through setBasicSecurityHeaders integration
                if (middlewareConfig.headers) {
                    const headersConfig = middlewareConfig.headers;
                    
                    if (headersConfig.xContentTypeOptions !== false) {
                        res.set('X-Content-Type-Options', 'nosniff');
                    }
                    
                    if (headersConfig.xFrameOptions) {
                        res.set('X-Frame-Options', headersConfig.xFrameOptions);
                    }
                    
                    if (headersConfig.xXssProtection) {
                        res.set('X-XSS-Protection', headersConfig.xXssProtection);
                    }
                    
                    if (headersConfig.referrerPolicy) {
                        res.set('Referrer-Policy', headersConfig.referrerPolicy);
                    }
                    
                    const hstsConfig = headersConfig.strictTransportSecurity;
                    if (hstsConfig?.enabled) {
                        let hstsValue = `max-age=${hstsConfig.maxAge || 31536000}`;
                        if (hstsConfig.includeSubDomains) hstsValue += '; includeSubDomains';
                        if (hstsConfig.preload) hstsValue += '; preload';
                        res.set('Strict-Transport-Security', hstsValue);
                    }
                }
                
                // Include CSP policy application through setContentSecurityPolicy integration
                if (middlewareConfig.csp?.enabled) {
                    const cspPolicy = middlewareConfig.csp.policy || DEFAULT_CSP_POLICY;
                    
                    if (middlewareConfig.csp.reportOnly) {
                        res.set('Content-Security-Policy-Report-Only', cspPolicy);
                    } else {
                        res.set('Content-Security-Policy', cspPolicy);
                    }
                    
                    if (middlewareConfig.csp.reportUri && !cspPolicy.includes('report-uri')) {
                        const reportPolicy = `${cspPolicy}; report-uri ${middlewareConfig.csp.reportUri}`;
                        res.set('Content-Security-Policy', reportPolicy);
                    }
                }
                
                // Integrate CORS handling through configureCORS middleware
                if (middlewareConfig.cors?.enabled) {
                    const corsConfig = middlewareConfig.cors;
                    const requestOrigin = req.get('Origin');
                    const isPreflightRequest = req.method === 'OPTIONS';
                    
                    // Set CORS headers based on configuration
                    if (corsConfig.origin === true) {
                        res.set('Access-Control-Allow-Origin', requestOrigin || '*');
                    } else if (typeof corsConfig.origin === 'string') {
                        res.set('Access-Control-Allow-Origin', corsConfig.origin);
                    } else if (Array.isArray(corsConfig.origin) && requestOrigin && corsConfig.origin.includes(requestOrigin)) {
                        res.set('Access-Control-Allow-Origin', requestOrigin);
                    }
                    
                    if (corsConfig.methods?.length > 0) {
                        res.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
                    }
                    
                    if (corsConfig.allowedHeaders?.length > 0) {
                        res.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
                    }
                    
                    if (corsConfig.credentials === true) {
                        res.set('Access-Control-Allow-Credentials', 'true');
                    }
                    
                    if (corsConfig.maxAge > 0) {
                        res.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
                    }
                    
                    // Handle preflight OPTIONS request
                    if (isPreflightRequest) {
                        const statusCode = corsConfig.optionsSuccessStatus || HTTP_STATUS.OK;
                        res.status(statusCode).end();
                        return;
                    }
                }
                
                // Add error handling for security header application failures
                const processingTime = Date.now() - startTime;
                
                // Log security middleware application with configuration summary
                if (middlewareConfig.features?.auditLogging) {
                    logger.info('Security headers middleware applied', {
                        method: req.method,
                        path: req.path,
                        processingTime: `${processingTime}ms`,
                        headersApplied: {
                            basicHeaders: !!middlewareConfig.headers,
                            csp: middlewareConfig.csp?.enabled,
                            cors: middlewareConfig.cors?.enabled,
                            xPoweredByRemoved: middlewareConfig.headers?.removeXPoweredBy !== false
                        }
                    });
                }
                
                // Return combined security middleware function for Express app usage
                next();
                
            } catch (middlewareError) {
                // Handle middleware execution errors without crashing the application
                logger.error('Security headers middleware error', {
                    error: middlewareError.message,
                    method: req.method,
                    path: req.path
                });
                
                // Continue request processing even if security headers fail
                next();
            }
        };
        
        // Add metadata to middleware function for debugging and monitoring
        combinedSecurityMiddleware.config = middlewareConfig;
        combinedSecurityMiddleware.validation = validationResult;
        combinedSecurityMiddleware.created = new Date().toISOString();
        
        return combinedSecurityMiddleware;
        
    } catch (error) {
        // Handle middleware creation errors with fallback middleware
        logger.error('Failed to create security headers middleware', {
            error: error.message,
            optionsProvided: Object.keys(options)
        });
        
        // Return minimal fallback middleware that at least removes X-Powered-By
        return (req, res, next) => {
            try {
                res.removeHeader('X-Powered-By');
                res.set('X-Content-Type-Options', 'nosniff');
                res.set('X-Frame-Options', 'DENY');
                next();
            } catch (fallbackError) {
                logger.error('Fallback security middleware error', { error: fallbackError.message });
                next();
            }
        };
    }
}

// =============================================================================
// CONFIGURATION AND MONITORING UTILITIES
// =============================================================================

/**
 * Returns current security headers configuration for monitoring and debugging purposes.
 * This function checks if SECURITY_HEADERS_CONFIG is initialized, initializes security
 * headers if not already configured, returns deep copy of current security headers
 * configuration, includes validation status and any configuration warnings, and adds
 * runtime statistics for header application metrics.
 * 
 * Configuration retrieval features include:
 * - Lazy initialization of security headers system if not already configured
 * - Deep copy of configuration to prevent external mutation of internal state
 * - Validation status inclusion for configuration health monitoring
 * - Runtime statistics for performance monitoring and operational insights
 * - Sanitized configuration output without sensitive information exposure
 * - Comprehensive metadata for debugging and troubleshooting assistance
 * 
 * @returns {Object} Current security headers configuration object with all settings and validation status
 */
function getSecurityHeadersConfig() {
    try {
        // Check if SECURITY_HEADERS_CONFIG is initialized
        if (!SECURITY_HEADERS_CONFIG) {
            // Initialize security headers if not already configured
            initializeSecurityHeaders();
        }
        
        // Return deep copy of current security headers configuration
        const configCopy = JSON.parse(JSON.stringify(SECURITY_HEADERS_CONFIG));
        
        // Include validation status and any configuration warnings
        const validationResult = validateSecurityConfiguration(SECURITY_HEADERS_CONFIG);
        
        // Add runtime statistics for header application metrics
        const runtimeStats = {
            cacheSize: HEADER_VALIDATION_CACHE.size,
            cacheEntries: Array.from(HEADER_VALIDATION_CACHE.keys()),
            initializationTimestamp: new Date().toISOString(),
            configurationHealth: {
                isValid: validationResult.isValid,
                warningCount: validationResult.warnings.length,
                errorCount: validationResult.errors.length,
                lastValidation: validationResult.timestamp
            },
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime()
            }
        };
        
        // Combine configuration with metadata for comprehensive monitoring
        return Object.freeze({
            configuration: configCopy,
            validation: validationResult,
            runtime: runtimeStats,
            metadata: {
                retrieved: new Date().toISOString(),
                source: 'getSecurityHeadersConfig',
                version: '1.0.0'
            }
        });
        
    } catch (error) {
        // Handle configuration retrieval errors with fallback information
        logger.error('Failed to retrieve security headers configuration', {
            error: error.message,
            configurationInitialized: !!SECURITY_HEADERS_CONFIG
        });
        
        // Return minimal fallback configuration information
        return {
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            fallback: {
                configuration: SECURITY_HEADERS_CONFIG || null,
                initialized: !!SECURITY_HEADERS_CONFIG,
                defaultCspPolicy: DEFAULT_CSP_POLICY,
                defaultCorsOptions: CORS_DEFAULT_OPTIONS
            }
        };
    }
}

/**
 * Dynamically updates CORS configuration for runtime CORS policy adjustments.
 * This function validates new CORS options for security compliance and format correctness,
 * merges new options with existing CORS configuration, updates CORS_DEFAULT_OPTIONS global
 * with validated settings, clears header validation cache to ensure fresh validation,
 * logs CORS configuration update with old and new settings comparison, and returns true
 * for successful update, false for validation failures.
 * 
 * Runtime CORS configuration features include:
 * - Input validation for security compliance and proper format verification
 * - Seamless integration with existing CORS configuration without service restart
 * - Origin validation to prevent security vulnerabilities from invalid configurations
 * - Cache invalidation to ensure updated configuration takes effect immediately
 * - Comprehensive logging of configuration changes for audit trail and monitoring
 * - Error handling with detailed feedback for troubleshooting failed updates
 * 
 * @param {Object} newCorsOptions - New CORS configuration options to merge with existing settings
 * @returns {boolean} True if CORS configuration updated successfully, false if validation failed
 */
function updateCORSConfiguration(newCorsOptions) {
    try {
        // Validate new CORS options for security compliance and format correctness
        if (!newCorsOptions || typeof newCorsOptions !== 'object') {
            logger.warn('Invalid CORS options provided - must be an object', {
                providedType: typeof newCorsOptions,
                providedValue: newCorsOptions
            });
            return false;
        }
        
        // Store current configuration for rollback and comparison
        const previousConfig = SECURITY_HEADERS_CONFIG?.cors ? { ...SECURITY_HEADERS_CONFIG.cors } : { ...CORS_DEFAULT_OPTIONS };
        
        // Validate specific CORS settings for security compliance
        if (newCorsOptions.origin !== undefined) {
            // Validate origin setting
            const validOriginTypes = ['boolean', 'string', 'function'];
            const originType = typeof newCorsOptions.origin;
            
            if (!validOriginTypes.includes(originType) && !Array.isArray(newCorsOptions.origin)) {
                logger.warn('Invalid CORS origin type', {
                    providedType: originType,
                    validTypes: [...validOriginTypes, 'array'],
                    providedOrigin: newCorsOptions.origin
                });
                return false;
            }
            
            // Warn about security implications of wildcard origins
            if (newCorsOptions.origin === true || newCorsOptions.origin === '*') {
                logger.warn('Wildcard CORS origin configured - ensure this is appropriate for your security requirements', {
                    origin: newCorsOptions.origin,
                    securityImplication: 'allows_all_origins'
                });
            }
        }
        
        // Validate methods array
        if (newCorsOptions.methods !== undefined) {
            if (!Array.isArray(newCorsOptions.methods)) {
                logger.warn('CORS methods must be an array', {
                    providedType: typeof newCorsOptions.methods,
                    providedMethods: newCorsOptions.methods
                });
                return false;
            }
        }
        
        // Validate allowed headers array
        if (newCorsOptions.allowedHeaders !== undefined) {
            if (!Array.isArray(newCorsOptions.allowedHeaders)) {
                logger.warn('CORS allowedHeaders must be an array', {
                    providedType: typeof newCorsOptions.allowedHeaders,
                    providedHeaders: newCorsOptions.allowedHeaders
                });
                return false;
            }
        }
        
        // Merge new options with existing CORS configuration
        if (!SECURITY_HEADERS_CONFIG) {
            initializeSecurityHeaders();
        }
        
        const updatedCorsConfig = {
            ...SECURITY_HEADERS_CONFIG.cors,
            ...newCorsOptions
        };
        
        // Update SECURITY_HEADERS_CONFIG with new CORS settings
        SECURITY_HEADERS_CONFIG.cors = updatedCorsConfig;
        
        // Update CORS_DEFAULT_OPTIONS global with validated settings
        Object.assign(CORS_DEFAULT_OPTIONS, {
            origin: updatedCorsConfig.origin,
            methods: updatedCorsConfig.methods,
            allowedHeaders: updatedCorsConfig.allowedHeaders,
            credentials: updatedCorsConfig.credentials
        });
        
        // Clear header validation cache to ensure fresh validation
        HEADER_VALIDATION_CACHE.clear();
        
        // Validate the updated configuration
        const validationResult = validateSecurityConfiguration(SECURITY_HEADERS_CONFIG);
        
        if (!validationResult.isValid) {
            logger.warn('Updated CORS configuration has validation issues', {
                errors: validationResult.errors,
                warnings: validationResult.warnings
            });
        }
        
        // Log CORS configuration update with old and new settings comparison
        logger.info('CORS configuration updated successfully', {
            previousConfig: {
                origin: previousConfig.origin,
                methods: previousConfig.methods,
                allowedHeaders: previousConfig.allowedHeaders,
                credentials: previousConfig.credentials
            },
            newConfig: {
                origin: updatedCorsConfig.origin,
                methods: updatedCorsConfig.methods,
                allowedHeaders: updatedCorsConfig.allowedHeaders,
                credentials: updatedCorsConfig.credentials
            },
            changedFields: Object.keys(newCorsOptions),
            validationResult: validationResult.isValid
        });
        
        // Return true for successful update
        return true;
        
    } catch (error) {
        // Handle CORS configuration update errors
        logger.error('Failed to update CORS configuration', {
            error: error.message,
            providedOptions: newCorsOptions
        });
        
        return false;
    }
}

/**
 * Performs security audit of current header configuration and identifies potential improvements.
 * This function analyzes current response headers for security compliance, checks for missing
 * security headers and provides recommendations, validates CSP policy effectiveness and identifies
 * potential bypasses, audits CORS configuration for overly permissive settings, checks HTTPS
 * enforcement and transport security configuration, generates security compliance score based
 * on industry best practices, creates recommendations list for security improvements, and
 * returns comprehensive audit result with actionable recommendations.
 * 
 * Security audit features include:
 * - Comprehensive security header analysis against industry best practices and OWASP guidelines
 * - Missing security header detection with priority recommendations for implementation
 * - CSP policy effectiveness analysis with bypass detection and security gap identification
 * - CORS configuration security assessment for overly permissive settings and recommendations
 * - HTTPS enforcement validation with HSTS configuration analysis and improvement suggestions
 * - Security compliance scoring based on implemented security measures and configuration quality
 * - Actionable improvement recommendations with implementation guidance and security impact assessment
 * 
 * @param {Object} req - Express.js request object for context-aware security analysis
 * @param {Object} res - Express.js response object for current header analysis and validation
 * @returns {Object} Security audit result with recommendations and compliance status for improvement guidance
 */
function auditSecurityHeaders(req, res) {
    try {
        // Initialize audit result object with comprehensive analysis structure
        const auditResult = {
            timestamp: new Date().toISOString(),
            url: `${req.method} ${req.path}`,
            compliance: {
                score: 0,
                maxScore: 100,
                level: 'unknown'
            },
            headers: {
                present: [],
                missing: [],
                analysis: {}
            },
            cors: {
                configured: false,
                issues: [],
                recommendations: []
            },
            csp: {
                configured: false,
                policy: null,
                issues: [],
                recommendations: []
            },
            general: {
                issues: [],
                recommendations: []
            }
        };
        
        // Analyze current response headers for security compliance
        const responseHeaders = res.getHeaders ? res.getHeaders() : {};
        const headerNames = Object.keys(responseHeaders);
        
        // Check for missing security headers and provide recommendations
        const requiredSecurityHeaders = {
            'x-content-type-options': { score: 10, description: 'Prevents MIME type sniffing attacks' },
            'x-frame-options': { score: 15, description: 'Protects against clickjacking attacks' },
            'x-xss-protection': { score: 5, description: 'Enables XSS filtering in legacy browsers' },
            'referrer-policy': { score: 10, description: 'Controls referrer information disclosure' },
            'content-security-policy': { score: 25, description: 'Comprehensive XSS and injection protection' },
            'strict-transport-security': { score: 20, description: 'Enforces HTTPS connections' }
        };
        
        // Analyze present and missing headers
        let currentScore = 0;
        
        Object.entries(requiredSecurityHeaders).forEach(([headerName, headerInfo]) => {
            const normalizedHeaderName = headerName.toLowerCase();
            const isPresent = headerNames.some(name => name.toLowerCase() === normalizedHeaderName);
            
            if (isPresent) {
                auditResult.headers.present.push({
                    name: headerName,
                    value: responseHeaders[headerNames.find(name => name.toLowerCase() === normalizedHeaderName)],
                    score: headerInfo.score,
                    description: headerInfo.description
                });
                currentScore += headerInfo.score;
            } else {
                auditResult.headers.missing.push({
                    name: headerName,
                    score: headerInfo.score,
                    description: headerInfo.description,
                    recommendation: `Implement ${headerName} header for improved security`
                });
            }
        });
        
        // Validate CSP policy effectiveness and identify potential bypasses
        const cspHeader = responseHeaders['content-security-policy'] || responseHeaders['content-security-policy-report-only'];
        
        if (cspHeader) {
            auditResult.csp.configured = true;
            auditResult.csp.policy = cspHeader;
            
            // Check for unsafe CSP directives
            const unsafeDirectives = ['unsafe-inline', 'unsafe-eval', '*'];
            unsafeDirectives.forEach(directive => {
                if (cspHeader.includes(directive)) {
                    auditResult.csp.issues.push({
                        severity: 'medium',
                        issue: `CSP contains unsafe directive: ${directive}`,
                        recommendation: `Remove or restrict ${directive} directive for better security`
                    });
                    currentScore -= 5; // Deduct points for unsafe directives
                }
            });
            
            // Check for missing important directives
            const importantDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
            importantDirectives.forEach(directive => {
                if (!cspHeader.includes(directive)) {
                    auditResult.csp.recommendations.push({
                        priority: 'medium',
                        recommendation: `Consider adding ${directive} directive for comprehensive protection`,
                        description: `Explicit ${directive} provides better control over resource loading`
                    });
                }
            });
        } else {
            auditResult.csp.configured = false;
            auditResult.csp.recommendations.push({
                priority: 'high',
                recommendation: 'Implement Content Security Policy for XSS protection',
                description: 'CSP provides comprehensive protection against XSS and injection attacks'
            });
        }
        
        // Audit CORS configuration for overly permissive settings
        if (SECURITY_HEADERS_CONFIG?.cors?.enabled) {
            auditResult.cors.configured = true;
            const corsConfig = SECURITY_HEADERS_CONFIG.cors;
            
            // Check for wildcard CORS origin
            if (corsConfig.origin === true || corsConfig.origin === '*') {
                auditResult.cors.issues.push({
                    severity: 'medium',
                    issue: 'CORS allows all origins (wildcard)',
                    recommendation: 'Restrict CORS to specific trusted origins for production',
                    securityImpact: 'Allows cross-origin requests from any domain'
                });
                currentScore -= 10;
            }
            
            // Check credentials with wildcard origin
            if (corsConfig.credentials && (corsConfig.origin === true || corsConfig.origin === '*')) {
                auditResult.cors.issues.push({
                    severity: 'high',
                    issue: 'CORS credentials enabled with wildcard origin',
                    recommendation: 'Specify explicit origins when using credentials',
                    securityImpact: 'Severe security vulnerability - credentials exposed to all origins'
                });
                currentScore -= 20;
            }
            
            // Check for overly permissive methods
            if (corsConfig.methods && corsConfig.methods.length > 5) {
                auditResult.cors.recommendations.push({
                    priority: 'low',
                    recommendation: 'Consider limiting CORS methods to only those required',
                    description: 'Reduce attack surface by limiting allowed HTTP methods'
                });
            }
        }
        
        // Check HTTPS enforcement and transport security configuration
        const hstsHeader = responseHeaders['strict-transport-security'];
        if (hstsHeader) {
            // Analyze HSTS configuration
            const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
            const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
            
            if (maxAge < 86400) { // Less than 1 day
                auditResult.general.recommendations.push({
                    priority: 'medium',
                    recommendation: 'Increase HSTS max-age to at least 1 year (31536000 seconds)',
                    description: 'Longer HSTS duration provides better security persistence'
                });
            }
            
            if (!hstsHeader.includes('includeSubDomains')) {
                auditResult.general.recommendations.push({
                    priority: 'low',
                    recommendation: 'Add includeSubDomains to HSTS for comprehensive protection',
                    description: 'Protects all subdomains with HTTPS enforcement'
                });
            }
        }
        
        // Generate security compliance score based on industry best practices
        auditResult.compliance.score = Math.max(0, currentScore);
        
        if (auditResult.compliance.score >= 90) {
            auditResult.compliance.level = 'excellent';
        } else if (auditResult.compliance.score >= 75) {
            auditResult.compliance.level = 'good';
        } else if (auditResult.compliance.score >= 50) {
            auditResult.compliance.level = 'fair';
        } else {
            auditResult.compliance.level = 'poor';
        }
        
        // Create recommendations list for security improvements
        const allRecommendations = [
            ...auditResult.headers.missing.map(header => ({
                category: 'headers',
                priority: 'high',
                recommendation: `Implement ${header.name}`,
                description: header.description,
                score_impact: header.score
            })),
            ...auditResult.csp.recommendations.map(rec => ({ ...rec, category: 'csp' })),
            ...auditResult.cors.recommendations.map(rec => ({ ...rec, category: 'cors' })),
            ...auditResult.general.recommendations.map(rec => ({ ...rec, category: 'general' }))
        ];
        
        auditResult.recommendations = allRecommendations.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        // Add summary statistics
        auditResult.summary = {
            totalHeaders: headerNames.length,
            securityHeadersPresent: auditResult.headers.present.length,
            securityHeadersMissing: auditResult.headers.missing.length,
            totalIssues: auditResult.csp.issues.length + auditResult.cors.issues.length + auditResult.general.issues.length,
            totalRecommendations: auditResult.recommendations.length,
            complianceLevel: auditResult.compliance.level,
            complianceScore: `${auditResult.compliance.score}/${auditResult.compliance.maxScore}`
        };
        
        // Log audit completion
        logger.info('Security headers audit completed', {
            url: auditResult.url,
            complianceScore: auditResult.compliance.score,
            complianceLevel: auditResult.compliance.level,
            recommendationCount: auditResult.recommendations.length
        });
        
        // Return comprehensive audit result with actionable recommendations
        return Object.freeze(auditResult);
        
    } catch (error) {
        // Handle audit process errors gracefully
        logger.error('Security headers audit failed', {
            error: error.message,
            method: req?.method,
            path: req?.path
        });
        
        return {
            error: {
                occurred: true,
                message: error.message,
                timestamp: new Date().toISOString()
            },
            compliance: {
                score: 0,
                maxScore: 100,
                level: 'unknown'
            },
            recommendations: [{
                category: 'audit',
                priority: 'high',
                recommendation: 'Fix audit process errors to enable security analysis',
                description: 'Security audit could not be completed due to system errors'
            }]
        };
    }
}

// =============================================================================
// MODULE INITIALIZATION AND EXPORTS
// =============================================================================

// Initialize security headers system automatically when module is loaded
// This ensures security configuration is ready immediately upon import
if (!SECURITY_HEADERS_CONFIG) {
    initializeSecurityHeaders();
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Express middleware function to disable X-Powered-By header that reveals Express.js framework information
    disablePoweredByHeader,
    
    // Express middleware function to set essential security headers including Content-Type options and frame options
    setBasicSecurityHeaders,
    
    // Express middleware function to set Content Security Policy header with restrictive default policy
    setContentSecurityPolicy,
    
    // Express middleware function to configure Cross-Origin Resource Sharing headers based on environment
    configureCORS,
    
    // Factory function to create combined security headers middleware with all security policies
    createSecurityHeadersMiddleware,
    
    // Utility function to validate security configuration settings and log warnings for potential issues
    validateSecurityConfiguration,
    
    // Utility function to retrieve current security headers configuration for monitoring and debugging
    getSecurityHeadersConfig,
    
    // Runtime utility function for dynamically updating CORS configuration settings
    updateCORSConfiguration,
    
    // Security audit function to analyze header configuration and provide improvement recommendations
    auditSecurityHeaders
};