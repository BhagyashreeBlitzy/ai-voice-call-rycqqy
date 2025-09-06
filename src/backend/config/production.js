/**
 * Production Environment Configuration for Node.js Tutorial Application
 * 
 * Production-hardened configuration that extends default settings with security enhancements,
 * performance optimizations, comprehensive monitoring, and operational features for deployment.
 * 
 * Features:
 * - Express.js 5.1.0 security improvements with ReDoS attack prevention
 * - Node.js 22.x LTS performance optimizations and security enhancements
 * - Production security policies including helmet.js, CORS restrictions, rate limiting
 * - Comprehensive monitoring with Prometheus metrics and health check endpoints
 * - Container deployment compatibility with 0.0.0.0 binding and graceful shutdown
 * - Production-optimized timeouts, connection pooling, and resource management
 * - Structured logging with JSON output for log aggregation systems
 * - Load balancer support with proxy trust and accurate client IP detection
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @requires Express.js ^5.1.0
 * @requires Node.js ^22.11.0 LTS
 */

// Import default configuration as foundation for production overrides
const defaultConfig = require('./default.js').defaultConfig;

// Import environment and security constants for production configuration
const { ENVIRONMENTS } = require('../src/utils/constants.js');

// Production environment variables with secure defaults
const NODE_ENV = process.env.NODE_ENV || 'production';
const PRODUCTION_PORT = process.env.PORT || process.env.PROD_PORT || 8080;
const PRODUCTION_HOST = process.env.HOST || process.env.PROD_HOST || '0.0.0.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'warn';
const TRUST_PROXY = process.env.TRUST_PROXY || 'true';
const ENABLE_METRICS = process.env.ENABLE_METRICS || 'true';
const SECURITY_LEVEL = 'strict';

/**
 * Creates production configuration by merging default config with production-specific
 * security hardening, performance optimizations, monitoring enhancements, and 
 * operational configurations for Express.js 5.1.0 and Node.js 22.x LTS deployment.
 * 
 * Implements comprehensive production features including:
 * - Zero-downtime deployment with graceful shutdown handling
 * - Container orchestration compatibility (Kubernetes, Docker Swarm)
 * - Load balancer integration with proxy trust configuration
 * - Production security policies with strict CSP and security headers
 * - Performance monitoring with response time tracking and resource metrics
 * - Error tracking and operational observability for incident response
 * 
 * @param {Object} baseConfig - Default configuration object to extend
 * @returns {Object} Complete production configuration with all enhancements applied
 */
function createProductionConfig(baseConfig) {
    // Production-optimized server configuration with container deployment support
    const productionServerConfig = {
        ...baseConfig.server,
        
        // Bind to all interfaces for container deployment and load balancer access
        host: PRODUCTION_HOST,
        
        // Standard production port with environment override capability
        port: parseInt(PRODUCTION_PORT, 10),
        
        // Production-optimized request timeout (15 seconds) for responsiveness
        timeout: 15000,
        
        // Extended keep-alive timeout for connection reuse optimization
        keepAliveTimeout: 65000,
        
        // Headers timeout slightly higher than keep-alive to prevent timeout issues
        headersTimeout: 66000,
        
        // Increased connection queue for high-traffic production scenarios
        backlog: 1024,
        
        // Enhanced maximum header size for production API usage
        max_header_size: 16384,
        
        // Enable proxy trust for load balancer deployment
        trust_proxy: TRUST_PROXY === 'true' ? 1 : false,
        
        // Production server identification
        server_name: 'nodejs-tutorial-prod',
        
        // Graceful shutdown timeout for zero-downtime deployments
        graceful_shutdown_timeout: 30000,
        
        // Single instance mode for tutorial application simplicity
        cluster_mode: false,
        
        // Node.js 22.x LTS performance optimizations enabled
        performance_optimizations: true
    };

    // Express.js 5.1.0 production application configuration with security enhancements
    const productionAppConfig = {
        ...baseConfig.app,
        
        // Production application identifier
        name: 'nodejs-tutorial-prod',
        
        // Set production environment
        env: ENVIRONMENTS.PRODUCTION,
        
        // Disable debugging in production for security and performance
        debug: false,
        
        // Trust first proxy for accurate client IP detection
        trust_proxy: 1,
        
        // Reduced JSON body size limit for security (100KB)
        json_limit: '100kb',
        
        // Reduced URL encoded body size limit for security (100KB)
        url_encoded_limit: '100kb',
        
        // Reduced parameter limit for security against parameter pollution
        parameter_limit: 100,
        
        // Strict case-sensitive routing for production consistency
        case_sensitive_routing: true,
        
        // Strict trailing slash handling for SEO and caching consistency
        strict_routing: true,
        
        // Disable parameter merging for predictable security behavior
        merge_params: false,
        
        // Enable view template caching for production performance
        view_cache: true,
        
        // Strong ETags for efficient HTTP caching optimization
        etag: 'strong',
        
        // Enable response compression for bandwidth optimization
        compression: true,
        
        // Express.js 5.1.0 automatic promise error handling enabled
        async_error_handling: true,
        
        // Express 5.x enhanced performance features enabled
        enhanced_performance: true
    };

    // Production logging configuration with structured output and minimal verbosity
    const productionLoggingConfig = {
        ...baseConfig.logging,
        
        // Production log level - warnings and errors only for performance
        level: LOG_LEVEL,
        
        // Structured JSON logging for log aggregation systems
        format: 'json',
        
        // No colors in production logs for clean parsing
        colorize: false,
        
        // ISO timestamps for accurate log correlation across services
        timestamp: true,
        
        // Disable request logging for performance in high-traffic scenarios
        request_logging: false,
        
        // Enable performance logging for production monitoring
        performance_logging: true,
        
        // Disable stack traces in production for security
        error_stack_trace: false,
        
        // Enable HTTP access logs for monitoring and compliance
        access_logs: true,
        
        // Enable error logs to stderr for monitoring system integration
        error_logs: true,
        
        // Production log rotation for disk space management
        log_rotation: true,
        
        // Maximum log file size before rotation (100MB)
        max_log_size: '100MB',
        
        // Maximum number of rotated log files to retain
        max_log_files: 10,
        
        // Enhanced logging levels for production
        levels: {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        },
        
        // Production console transport configuration
        console: {
            enabled: true,
            colorize: false,
            timestamp: true
        }
    };

    // Production security configuration with strict policies and comprehensive protection
    const productionSecurityConfig = {
        ...baseConfig.security,
        
        // Hide Express.js framework information for security
        disable_x_powered_by: true,
        
        // Enable CORS with strict production policies
        cors_enabled: true,
        
        // No wildcard CORS origins - explicit origins only
        cors_origin: false,
        
        // Credentials not allowed by default for security
        cors_credentials: false,
        
        // Enable rate limiting for DDoS protection
        rate_limiting: true,
        
        // 15-minute rate limiting window
        rate_limit_window: 900000,
        
        // Maximum 100 requests per window per IP
        rate_limit_max: 100,
        
        // Enable Helmet.js security headers middleware
        helmet_enabled: true,
        
        // HTTPS handled by reverse proxy/load balancer
        https_required: false,
        
        // Strict Content Security Policy enabled
        content_security_policy: true,
        
        // HTTP Strict Transport Security enabled
        hsts_enabled: true,
        
        // X-Content-Type-Options: nosniff enabled
        nosniff_enabled: true,
        
        // X-Frame-Options: DENY for clickjacking protection
        frame_options: 'DENY',
        
        // X-XSS-Protection header enabled
        xss_protection: true,
        
        // Enhanced Express.js 5.1.0 security improvements
        express_security_improvements: {
            redos_prevention: true,
            secure_regex_patterns: true,
            vulnerability_mitigations: true
        },
        
        // Production input validation enabled
        input_validation: {
            enabled: true,
            max_request_size: '100kb',
            sanitize_input: true
        },
        
        // Production security headers configuration
        headers: {
            x_frame_options: 'DENY',
            x_content_type_options: 'nosniff',
            referrer_policy: 'no-referrer',
            x_xss_protection: '1; mode=block',
            strict_transport_security: 'max-age=31536000; includeSubDomains'
        }
    };

    // Production monitoring configuration with comprehensive health checks and metrics
    const productionMonitoringConfig = {
        ...baseConfig.monitoring,
        
        // Kubernetes-compatible health check endpoint
        health_check_path: '/health',
        
        // Kubernetes readiness probe endpoint
        readiness_probe_path: '/readyz',
        
        // Kubernetes liveness probe endpoint  
        liveness_probe_path: '/livez',
        
        // Enable application metrics collection
        metrics_enabled: ENABLE_METRICS === 'true',
        
        // Enable Prometheus metrics endpoint for monitoring integration
        prometheus_metrics: true,
        
        // Enable comprehensive performance monitoring
        performance_monitoring: true,
        
        // Enable memory usage monitoring for capacity planning
        memory_monitoring: true,
        
        // Enable uptime tracking for SLA monitoring
        uptime_tracking: true,
        
        // Production health check timeout (5 seconds)
        health_check_timeout: 5000,
        
        // Prometheus metrics endpoint path
        metrics_path: '/metrics',
        
        // Enable error tracking for operational monitoring
        error_tracking: true,
        
        // Disable business metrics for tutorial simplicity
        business_metrics: false,
        
        // Enhanced health check configuration
        health_check: {
            enabled: true,
            timeout: 5000,
            interval: 30000,
            path: '/health'
        },
        
        // Production performance metrics configuration
        performance_metrics: {
            response_time_tracking: true,
            memory_usage_tracking: true,
            cpu_usage_tracking: true,
            request_count_tracking: true,
            error_rate_tracking: true
        }
    };

    // Production features configuration with operational capabilities enabled
    const productionFeaturesConfig = {
        ...baseConfig.features,
        
        // Enable primary /hello endpoint
        hello_endpoint: true,
        
        // Enable all health check endpoints for monitoring
        health_endpoints: true,
        
        // Disable static file serving in production for security
        static_content: false,
        
        // Enable production error handling middleware
        error_handling: true,
        
        // Enable request validation for security
        request_validation: true,
        
        // Enable response compression for performance
        response_compression: true,
        
        // Enable response caching for performance optimization
        caching_enabled: true,
        
        // Disable API versioning for tutorial simplicity
        api_versioning: false,
        
        // Enable graceful shutdown handling
        graceful_shutdown: true,
        
        // Disable cluster support for tutorial simplicity
        cluster_support: false,
        
        // Production CORS support configuration
        cors_support: {
            enabled: true,
            origins: [], // No wildcard - explicit origins required
            methods: ['GET', 'HEAD', 'OPTIONS'],
            credentials: false,
            optionsSuccessStatus: 200
        }
    };

    // Assemble complete production configuration object
    const productionConfig = {
        // Configuration metadata with production environment
        meta: {
            ...baseConfig.meta,
            environment: ENVIRONMENTS.PRODUCTION,
            timestamp: new Date().toISOString(),
            config_type: 'production',
            security_level: SECURITY_LEVEL
        },
        
        // Production server configuration
        server: Object.freeze(productionServerConfig),
        
        // Production Express.js application configuration
        app: Object.freeze(productionAppConfig),
        
        // Production logging configuration
        logging: Object.freeze(productionLoggingConfig),
        
        // Production security configuration
        security: Object.freeze(productionSecurityConfig),
        
        // Production monitoring configuration
        monitoring: Object.freeze(productionMonitoringConfig),
        
        // Production features configuration
        features: Object.freeze(productionFeaturesConfig),
        
        // Production-specific environment variables
        environment_variables: {
            NODE_ENV: ENVIRONMENTS.PRODUCTION,
            PORT: PRODUCTION_PORT,
            HOST: PRODUCTION_HOST,
            LOG_LEVEL: LOG_LEVEL,
            TRUST_PROXY: TRUST_PROXY,
            ENABLE_METRICS: ENABLE_METRICS,
            RATE_LIMIT_ENABLED: 'true',
            CSP_ENABLED: 'true',
            HELMET_ENABLED: 'true',
            COMPRESSION_ENABLED: 'true'
        },
        
        // Production optimization settings
        optimizations: {
            performance_tuning: {
                keep_alive_timeout: 65000,
                headers_timeout: 66000,
                request_timeout: 15000,
                compression_enabled: true,
                etag_generation: 'strong',
                view_caching: true
            },
            
            security_hardening: {
                helmet_enabled: true,
                csp_policy_strict: true,
                rate_limiting_enabled: true,
                cors_restricted: true,
                input_validation_enabled: true,
                error_sanitization: true
            },
            
            monitoring_enhancement: {
                prometheus_integration: true,
                health_checks_comprehensive: true,
                performance_metrics_enabled: true,
                memory_monitoring_enabled: true,
                error_tracking_enabled: true,
                uptime_tracking_enabled: true
            },
            
            operational_features: {
                graceful_shutdown_enabled: true,
                log_rotation_enabled: true,
                structured_logging: true,
                proxy_trust_enabled: TRUST_PROXY === 'true',
                container_deployment_ready: true
            }
        },
        
        // Production deployment configuration
        deployment: {
            container_deployment: {
                port_binding: '0.0.0.0',
                signal_handling: true,
                health_checks: true,
                resource_limits_aware: true,
                log_to_stdout: true
            },
            
            cloud_deployment: {
                platform_agnostic: true,
                load_balancer_compatible: true,
                auto_scaling_ready: true,
                monitoring_integration: true
            },
            
            reverse_proxy: {
                nginx_compatible: true,
                proxy_headers_trusted: TRUST_PROXY === 'true',
                ssl_termination_proxy: true,
                health_endpoints_exposed: true
            }
        }
    };

    // Freeze the entire configuration to prevent runtime mutations
    return Object.freeze(productionConfig);
}

// Create the production configuration instance
const productionConfig = createProductionConfig(defaultConfig);

// Export production configuration object
module.exports = {
    // Main production configuration export
    productionConfig,
    
    // Individual section exports for modular access
    server: productionConfig.server,
    app: productionConfig.app,
    logging: productionConfig.logging,
    security: productionConfig.security,
    monitoring: productionConfig.monitoring,
    features: productionConfig.features,
    
    // Production configuration factory function
    createProductionConfig,
    
    // Default export for compatibility
    default: productionConfig
};