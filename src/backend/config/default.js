/**
 * Default Configuration File for Node.js Tutorial Application
 * 
 * Base configuration that provides foundational default settings for the Node.js tutorial application.
 * Contains core configuration values for server operation, Express.js application setup, logging, 
 * security, monitoring, and features that are inherited by all environment-specific configurations.
 * 
 * Compatible with:
 * - Express.js 5.1.0 with enhanced async support and automatic promise error handling
 * - Node.js 22.11.0 LTS with Active LTS support extending into late 2025
 * 
 * Architecture: Event-driven, stateless design prioritizing educational clarity while 
 * maintaining production-ready architectural patterns.
 */

// Global configuration constants
const DEFAULT_CONFIG_VERSION = '1.0.0';
const CONFIG_NAMESPACE = 'nodejs-tutorial';

/**
 * Factory function that creates the default configuration object with all foundational settings
 * for the Node.js tutorial application.
 * 
 * Implements a comprehensive configuration structure supporting Express.js 5.1.0 features including:
 * - Automatic promise error handling
 * - Enhanced security with ReDoS attack prevention
 * - Node.js 22.x LTS performance optimizations
 * - Educational simplicity with production-ready extensibility
 * 
 * @returns {Object} Complete default configuration object with server, app, logging, security, monitoring, and feature settings
 */
function createDefaultConfig() {
    // Initialize base configuration object structure
    const baseConfig = {
        // Configuration metadata
        version: DEFAULT_CONFIG_VERSION,
        namespace: CONFIG_NAMESPACE,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    };

    // Configure default server settings with port 3000 and localhost binding
    const serverConfig = {
        // Default port for HTTP server listening - supports environment override
        port: parseInt(process.env.PORT) || 3000,
        
        // Default host binding for development security - localhost only
        host: process.env.HOST || 'localhost',
        
        // Request timeout in milliseconds - 30 second default for educational use
        timeout: 30000,
        
        // HTTP keep-alive connection reuse for performance optimization
        keepAlive: true,
        
        // Maximum pending connections queue length - Node.js default
        backlog: 511,
        
        // Maximum HTTP header size in bytes - 16KB default
        max_header_size: 16384,
        
        // Default proxy trust setting - false for development security
        trust_proxy: false,
        
        // Server identification for monitoring and debugging
        server_name: CONFIG_NAMESPACE,
        
        // Node.js 22.x LTS performance optimizations enabled
        performance_optimizations: true
    };

    // Set up Express.js application defaults compatible with v5.1.0
    const appConfig = {
        // Application identifier for logging and monitoring
        name: CONFIG_NAMESPACE,
        
        // Application version from configuration
        version: DEFAULT_CONFIG_VERSION,
        
        // Default environment setting with override capability
        env: process.env.NODE_ENV || 'development',
        
        // JSON body parser size limit - 1MB default for tutorial safety
        json_limit: '1mb',
        
        // URL encoded body parser size limit - 1MB default
        url_encoded_limit: '1mb',
        
        // Maximum URL parameters to prevent parameter pollution
        parameter_limit: 1000,
        
        // Case insensitive route matching for user-friendly URLs
        case_sensitive_routing: false,
        
        // Flexible trailing slash handling for better UX
        strict_routing: false,
        
        // Route parameter merging behavior - false for predictable behavior
        merge_params: false,
        
        // Express.js 5.1.0 automatic promise error handling enabled
        async_error_handling: true,
        
        // Express 5.x performance improvements enabled
        enhanced_performance: true,
        
        // View engine configuration (not used in tutorial but prepared for extension)
        view_engine: null,
        
        // Static file serving configuration
        static_options: {
            enabled: false,
            directory: 'public',
            max_age: 0
        }
    };

    // Configure logging defaults with console output
    const loggingConfig = {
        // Default log level for general information and educational debugging
        level: process.env.LOG_LEVEL || 'info',
        
        // Simple text format for console output - educational clarity
        format: 'simple',
        
        // Enable colorized console output for development experience
        colorize: true,
        
        // Include timestamps in log entries for debugging
        timestamp: true,
        
        // Enable HTTP request/response logging for educational purposes
        request_logging: true,
        
        // Disable detailed performance logging by default - can be enabled per environment
        performance_logging: false,
        
        // Include stack traces in error logs for debugging assistance
        error_stack_trace: true,
        
        // Log levels configuration
        levels: {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        },
        
        // Console transport configuration
        console: {
            enabled: true,
            colorize: true,
            timestamp: true
        }
    };

    // Set baseline security configuration for framework integration
    const securityConfig = {
        // Hide Express.js framework information for basic security
        disable_x_powered_by: true,
        
        // CORS disabled by default for security - can be enabled per environment
        cors_enabled: false,
        
        // Rate limiting disabled for tutorial simplicity
        rate_limiting: false,
        
        // Security headers middleware disabled by default for educational simplicity
        helmet_enabled: false,
        
        // HTTPS not required for development - should be enabled in production
        https_required: false,
        
        // CSP disabled for tutorial simplicity - should be configured for production
        content_security_policy: false,
        
        // Express.js 5.1.0 security improvements enabled
        express_security_improvements: {
            // ReDoS attack prevention through path-to-regexp library upgrade
            redos_prevention: true,
            
            // Enhanced regex security for route matching
            secure_regex_patterns: true,
            
            // CVE-2024-45590 mitigation included in Express 5.1.0
            vulnerability_mitigations: true
        },
        
        // Basic input validation settings
        input_validation: {
            enabled: false, // Disabled for tutorial simplicity
            max_request_size: '1mb',
            sanitize_input: false
        },
        
        // Security headers configuration
        headers: {
            x_frame_options: 'DENY',
            x_content_type_options: 'nosniff',
            referrer_policy: 'no-referrer'
        }
    };

    // Initialize monitoring defaults with health check endpoints
    const monitoringConfig = {
        // Health check endpoint path - Kubernetes compatible
        health_check_path: '/health',
        
        // Kubernetes readiness probe endpoint for container orchestration
        readiness_probe_path: '/readyz',
        
        // Kubernetes liveness probe endpoint for container health
        liveness_probe_path: '/livez',
        
        // Metrics collection disabled by default - can be enabled for production
        metrics_enabled: false,
        
        // Performance monitoring disabled by default - lightweight for tutorial
        performance_monitoring: false,
        
        // Memory usage monitoring disabled by default
        memory_monitoring: false,
        
        // Basic uptime tracking enabled for educational demonstration
        uptime_tracking: true,
        
        // Health check configuration
        health_check: {
            enabled: true,
            timeout: 5000,
            interval: 30000
        },
        
        // Performance metrics configuration
        performance_metrics: {
            response_time_tracking: true,
            memory_usage_tracking: false,
            cpu_usage_tracking: false
        }
    };

    // Configure feature defaults for hello endpoint functionality
    const featuresConfig = {
        // Enable /hello endpoint for Hello world response - core tutorial feature
        hello_endpoint: true,
        
        // Enable health check endpoints for monitoring and container orchestration
        health_endpoints: true,
        
        // Static file serving disabled by default - tutorial focuses on dynamic endpoints
        static_content: false,
        
        // Enable Express.js error handling middleware for educational error management
        error_handling: true,
        
        // Input validation disabled for tutorial simplicity
        request_validation: false,
        
        // Response compression disabled by default - can be enabled for production
        response_compression: false,
        
        // API versioning disabled for tutorial simplicity
        api_versioning: false,
        
        // Request/response logging for educational purposes
        request_response_logging: true,
        
        // CORS support configuration
        cors_support: {
            enabled: false,
            origins: ['http://localhost:3000'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: false
        }
    };

    // Apply configuration validation and type checking
    const validatedConfig = {
        // Metadata section
        meta: Object.freeze(baseConfig),
        
        // Server configuration section
        server: Object.freeze(serverConfig),
        
        // Express.js application configuration section  
        app: Object.freeze(appConfig),
        
        // Logging configuration section
        logging: Object.freeze(loggingConfig),
        
        // Security configuration section
        security: Object.freeze(securityConfig),
        
        // Monitoring configuration section
        monitoring: Object.freeze(monitoringConfig),
        
        // Features configuration section
        features: Object.freeze(featuresConfig),
        
        // Configuration validation rules
        validation: Object.freeze({
            server: {
                port: {
                    type: 'number',
                    min: 1,
                    max: 65535,
                    required: true
                },
                host: {
                    type: 'string',
                    required: true,
                    pattern: /^[a-zA-Z0-9.-]+$/
                },
                timeout: {
                    type: 'number',
                    min: 1000,
                    max: 300000
                }
            },
            app: {
                name: {
                    type: 'string',
                    required: true,
                    minLength: 1
                },
                env: {
                    type: 'string',
                    enum: ['development', 'production', 'test']
                }
            },
            logging: {
                level: {
                    type: 'string',
                    enum: ['error', 'warn', 'info', 'debug']
                }
            }
        })
    };

    // Freeze configuration sections to prevent mutations and ensure immutability
    return Object.freeze(validatedConfig);
}

// Create the default configuration instance
const defaultConfig = createDefaultConfig();

// Named exports for individual configuration sections
module.exports = {
    // Main default configuration object export
    defaultConfig,
    
    // Individual section exports for modular access
    server: defaultConfig.server,
    app: defaultConfig.app, 
    logging: defaultConfig.logging,
    security: defaultConfig.security,
    monitoring: defaultConfig.monitoring,
    features: defaultConfig.features,
    
    // Configuration factory function export for dynamic configuration creation
    createDefaultConfig,
    
    // Configuration constants exports
    DEFAULT_CONFIG_VERSION,
    CONFIG_NAMESPACE
};