/**
 * Development Environment Configuration File for Node.js Tutorial Application
 * 
 * Development-specific configuration that extends default settings with enhanced debugging capabilities,
 * detailed logging, relaxed security, and developer-friendly features optimized for local development workflow.
 * 
 * Features:
 * - Hot reloading support with file watching and automatic restart
 * - Verbose logging for detailed request/response tracking and debugging
 * - Relaxed security settings to prevent interference with development tools
 * - Enhanced error reporting with full stack traces and debugging information
 * - Development middleware stack optimized for Express.js 5.1.0
 * - Performance monitoring and memory usage tracking for optimization
 * - Educational considerations with detailed output for learning HTTP lifecycle
 * 
 * Compatible with:
 * - Express.js 5.1.0 with automatic promise error handling and ReDoS attack prevention
 * - Node.js 22.11.0 LTS with Active LTS support and enhanced performance features
 * - Chrome DevTools integration for debugging and performance analysis
 * 
 * Architecture: Event-driven development environment prioritizing developer productivity,
 * educational clarity, and comprehensive debugging capabilities while maintaining 
 * production-ready code structure for seamless environment promotion.
 */

// Import default configuration as foundation for development overrides
const { defaultConfig } = require('./default.js');

// Development environment constants and feature flags
const DEVELOPMENT_VERSION = '1.0.0-dev';
const DEVELOPMENT_NAMESPACE = 'nodejs-tutorial-dev';

// Environment variable extraction with development defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEBUG_MODE = process.env.DEBUG !== 'false'; // Default to true for development
const DEV_PORT = parseInt(process.env.PORT) || 3000;
const DEV_HOST = process.env.HOST || 'localhost';
const VERBOSE_LOGGING = process.env.VERBOSE !== 'false'; // Default to true for development

/**
 * Creates development configuration by merging default config with development-specific overrides
 * for enhanced debugging, verbose logging, and developer workflow optimizations.
 * 
 * Implements comprehensive development features including:
 * - Extended timeout values for debugging sessions and breakpoint inspection
 * - File watching with automatic server restart on code changes
 * - Permissive CORS configuration for cross-origin development and testing
 * - Detailed middleware execution logging and performance timing
 * - Enhanced error handling with full stack traces and source maps
 * - Memory leak detection and garbage collection monitoring
 * - Request tracing with unique correlation IDs for debugging
 * 
 * @param {Object} defaultConfig - Base configuration object from default.js
 * @returns {Object} Enhanced development configuration with debugging features and developer-friendly settings
 */
function createDevelopmentConfig(defaultConfig) {
    // Initialize development-specific base configuration
    const developmentMeta = {
        ...defaultConfig.meta,
        version: DEVELOPMENT_VERSION,
        namespace: DEVELOPMENT_NAMESPACE,
        environment: 'development',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        expressVersion: '5.1.0',
        developmentFeatures: {
            hotReloading: true,
            verboseLogging: true,
            enhancedDebugging: true,
            relaxedSecurity: true,
            performanceMonitoring: true
        }
    };

    // Development HTTP server configuration with enhanced debugging and hot reload support
    const developmentServer = {
        ...defaultConfig.server,
        // Development port with environment variable override for flexibility
        port: DEV_PORT,
        
        // Localhost binding for development security and local accessibility
        host: DEV_HOST,
        
        // Extended timeout (60 seconds) for debugging sessions with breakpoints
        timeout: 60000,
        
        // Enhanced keep-alive configuration for development tools and debugging
        keepAlive: true,
        keepAliveTimeout: 65000,
        
        // Development-optimized connection queue for local testing
        backlog: 100,
        
        // Increased header size limit for development tools and debugging headers
        max_header_size: 32768,
        
        // Trust proxy disabled for local development security
        trust_proxy: false,
        
        // Development server identification for monitoring and debugging
        server_name: DEVELOPMENT_NAMESPACE,
        
        // File watching configuration for automatic restart on changes
        watch_files: process.env.WATCH_FILES !== 'false', // Default enabled
        watch_patterns: [
            'src/**/*.js',
            'config/**/*.js',
            'package.json'
        ],
        ignore_patterns: [
            'node_modules/**',
            '*.test.js',
            'test/**',
            'coverage/**',
            '.git/**'
        ],
        
        // Hot reload configuration for development workflow
        reload_on_change: process.env.HOT_RELOAD !== 'false', // Default enabled
        restart_delay: 1000, // 1 second delay to prevent rapid restarts
        
        // Enhanced debugging mode with detailed logging
        debug_mode: DEBUG_MODE,
        
        // Permissive CORS for development flexibility across different ports
        cors_origin: '*',
        
        // Development performance optimizations
        performance_optimizations: true,
        
        // Node.js 22.x LTS development features
        nodejs_features: {
            inspector_enabled: true,
            performance_hooks: true,
            async_hooks: true,
            experimental_features: true
        }
    };

    // Express.js development configuration with debugging middleware and enhanced error reporting
    const developmentApp = {
        ...defaultConfig.app,
        // Development application identifier
        name: DEVELOPMENT_NAMESPACE,
        
        // Development version with suffix for identification
        version: DEVELOPMENT_VERSION,
        
        // Environment explicitly set to development
        env: 'development',
        
        // Increased limits for development testing and debugging
        json_limit: '10mb',
        url_encoded_limit: '10mb',
        parameter_limit: 10000,
        
        // Development-friendly routing configuration
        case_sensitive_routing: false, // Flexible routing for development
        strict_routing: false, // Lenient trailing slash handling
        merge_params: false, // Predictable parameter behavior
        
        // Express.js 5.1.0 features optimized for development
        async_error_handling: true,
        enhanced_performance: true,
        automatic_promise_rejection_handling: true,
        
        // Development-specific middleware configuration
        trust_proxy: false, // Disabled for local development simplicity
        json_spaces: 2, // Pretty-printed JSON responses for readability
        
        // Enhanced error handling for development debugging
        detailed_errors: true,
        error_stack_traces: true,
        source_maps_enabled: true,
        
        // Request tracing for debugging and correlation
        request_tracing: {
            enabled: true,
            correlation_header: 'x-correlation-id',
            generate_ids: true
        },
        
        // Middleware execution logging for performance analysis
        middleware_logging: {
            enabled: true,
            timing: true,
            memory_usage: true
        },
        
        // View engine configuration disabled for API-only development
        view_engine: null,
        view_cache: false, // Disabled for immediate template changes
        
        // Static file serving enhanced for development
        static_options: {
            enabled: true,
            directory: 'public',
            max_age: 0, // No caching for immediate changes
            directory_listing: true, // Enable directory browsing
            dot_files: 'ignore'
        },
        
        // Development security considerations
        x_powered_by: false, // Hide Express.js information
        etag: 'weak' // Weak ETags for development flexibility
    };

    // Verbose development logging configuration with detailed request/response information
    const developmentLogging = {
        ...defaultConfig.logging,
        // Maximum verbosity for development debugging
        level: process.env.LOG_LEVEL || 'debug',
        
        // Colorized format for enhanced console readability
        format: 'colorized',
        colorize: true,
        
        // Detailed timestamps with milliseconds for precise timing
        timestamp: true,
        timestamp_format: 'YYYY-MM-DD HH:mm:ss.SSS',
        
        // Comprehensive HTTP request/response cycle logging
        request_logging: true,
        request_details: {
            method: true,
            url: true,
            headers: true,
            body: true,
            query_params: true,
            user_agent: true,
            ip_address: true
        },
        
        // Response logging with performance metrics
        response_logging: true,
        response_details: {
            status_code: true,
            headers: true,
            body: true,
            response_time: true,
            content_length: true
        },
        
        // Performance logging for optimization and learning
        performance_logging: true,
        performance_metrics: {
            response_time: true,
            memory_usage: true,
            cpu_usage: true,
            event_loop_lag: true,
            garbage_collection: true
        },
        
        // Complete error stack traces for debugging
        error_stack_trace: true,
        error_details: {
            full_stack: true,
            source_maps: true,
            context_lines: 5
        },
        
        // SQL logging enabled for future database integration
        sql_logging: false, // Not used in tutorial but prepared
        
        // Individual middleware execution timing
        middleware_logging: true,
        middleware_timing: true,
        
        // Memory usage monitoring for leak detection
        memory_usage: {
            enabled: true,
            interval: 30000, // Every 30 seconds
            heap_snapshot: false, // Disabled by default for performance
            gc_events: true
        },
        
        // Enhanced log levels for development
        levels: {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4 // Additional trace level for development
        },
        
        // Console transport with development enhancements
        console: {
            enabled: true,
            colorize: true,
            timestamp: true,
            prettyPrint: true,
            depth: null,
            showHidden: false
        },
        
        // File logging for persistent development logs
        file_logging: {
            enabled: process.env.FILE_LOGGING === 'true', // Opt-in
            filename: 'development.log',
            max_size: '10MB',
            max_files: 5,
            rotation: 'daily'
        }
    };

    // Relaxed security configuration for development workflow and debugging
    const developmentSecurity = {
        ...defaultConfig.security,
        // Basic framework information hiding maintained
        disable_x_powered_by: true,
        
        // Permissive CORS enabled for cross-origin development
        cors_enabled: true,
        cors_options: {
            origin: '*', // Allow all origins during development
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: ['*'],
            credentials: false,
            optionsSuccessStatus: 200
        },
        
        // Rate limiting disabled for unlimited development requests
        rate_limiting: false,
        
        // Security headers middleware disabled to prevent dev tool interference
        helmet_enabled: false,
        
        // HTTPS not required for local development
        https_required: false,
        
        // Relaxed Content Security Policy for development tools
        content_security_policy: false,
        
        // Express.js 5.1.0 security improvements maintained
        express_security_improvements: {
            redos_prevention: true,
            secure_regex_patterns: true,
            vulnerability_mitigations: true
        },
        
        // Relaxed input validation for development flexibility
        input_validation: {
            enabled: false, // Disabled for development ease
            max_request_size: '10mb', // Increased for testing
            sanitize_input: false,
            strict_validation: false
        },
        
        // Development-friendly security headers
        headers: {
            x_frame_options: 'SAMEORIGIN', // Less restrictive for development
            x_content_type_options: 'nosniff',
            referrer_policy: 'no-referrer-when-downgrade',
            x_xss_protection: '1; mode=block'
        },
        
        // Authentication bypass for development routes
        authentication_bypass: {
            enabled: true,
            development_routes: ['/dev', '/debug', '/test'],
            bypass_patterns: ['/health', '/metrics']
        },
        
        // Development secrets management
        secrets: {
            encryption_disabled: true, // For development simplicity
            debug_mode_secrets: true,
            expose_config: true // Allow configuration introspection
        }
    };

    // Enhanced development monitoring with debugging and performance analysis tools
    const developmentMonitoring = {
        ...defaultConfig.monitoring,
        // Health check endpoint with detailed system information
        health_check_path: '/health',
        health_check_detailed: true,
        
        // Kubernetes-compatible probes with development enhancements
        readiness_probe_path: '/readyz',
        readiness_probe_timeout: 10000, // Extended for debugging
        
        liveness_probe_path: '/livez',
        liveness_probe_timeout: 15000, // Extended timeout for debugging sessions
        
        // Basic metrics collection enabled for performance analysis
        metrics_enabled: true,
        metrics_endpoint: '/metrics',
        metrics_details: {
            system_metrics: true,
            application_metrics: true,
            custom_metrics: true,
            histogram_buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
        },
        
        // Detailed performance monitoring for optimization learning
        performance_monitoring: true,
        performance_details: {
            response_time_tracking: true,
            throughput_monitoring: true,
            error_rate_tracking: true,
            resource_utilization: true
        },
        
        // Memory monitoring with leak detection
        memory_monitoring: true,
        memory_details: {
            heap_usage: true,
            heap_snapshots: false, // Disabled by default for performance
            garbage_collection: true,
            memory_leaks: true,
            allocation_tracking: false // CPU intensive, opt-in
        },
        
        // Individual request lifecycle tracing
        request_tracing: true,
        request_tracing_details: {
            correlation_ids: true,
            timing_breakdown: true,
            middleware_execution: true,
            database_queries: false, // Not applicable for tutorial
            external_calls: false
        },
        
        // Additional debugging endpoints for development
        debug_endpoints: {
            enabled: true,
            config_endpoint: '/debug/config',
            metrics_endpoint: '/debug/metrics',
            memory_endpoint: '/debug/memory',
            routes_endpoint: '/debug/routes'
        },
        
        // Hot reload status monitoring
        hot_reload_status: {
            enabled: true,
            status_endpoint: '/debug/reload',
            file_watcher_status: true,
            last_reload_time: true
        },
        
        // Enhanced uptime tracking with detailed information
        uptime_tracking: true,
        uptime_details: {
            process_uptime: true,
            system_uptime: true,
            restart_count: true,
            crash_count: true
        },
        
        // Development-specific health checks
        health_check: {
            enabled: true,
            timeout: 10000, // Extended for debugging
            interval: 15000, // Less frequent for development
            detailed_response: true,
            include_system_info: true,
            include_dependencies: true
        }
    };

    // Development feature configuration with enhanced debugging and testing capabilities
    const developmentFeatures = {
        ...defaultConfig.features,
        // Hello endpoint enabled with detailed logging
        hello_endpoint: true,
        hello_endpoint_logging: true,
        hello_endpoint_metrics: true,
        
        // Enhanced health endpoints with comprehensive system information
        health_endpoints: true,
        health_endpoints_detailed: true,
        
        // Development static file serving with hot reload
        static_content: true,
        static_hot_reload: true,
        static_directory_listing: true,
        
        // Verbose error responses with complete stack traces
        error_handling: true,
        error_details: {
            stack_traces: true,
            source_maps: true,
            request_context: true,
            environment_info: true
        },
        
        // Additional development and testing routes
        development_routes: {
            enabled: true,
            debug_routes: true,
            test_routes: true,
            mock_routes: true
        },
        
        // Auto-generated API documentation for development
        api_documentation: {
            enabled: true,
            swagger_ui: false, // Not implemented in tutorial
            route_listing: true,
            endpoint_testing: true
        },
        
        // Enhanced request validation with detailed error messages
        request_validation: false, // Disabled for tutorial simplicity
        request_validation_details: {
            detailed_errors: true,
            schema_validation: false,
            type_coercion: true
        },
        
        // Response compression disabled for faster debugging
        response_compression: false,
        
        // All caching disabled for immediate development changes
        cache_disabled: true,
        cache_control_headers: {
            no_cache: true,
            no_store: true,
            must_revalidate: true
        },
        
        // CORS support enhanced for development
        cors_support: {
            enabled: true,
            origins: ['*'],
            methods: ['*'],
            headers: ['*'],
            credentials: false,
            preflight_continue: false
        },
        
        // Request/response logging with enhanced details
        request_response_logging: true,
        request_response_details: {
            request_body: true,
            response_body: true,
            headers: true,
            timing: true,
            correlation_id: true
        }
    };

    // Assemble the complete development configuration
    const developmentConfig = {
        // Metadata section with development information
        meta: Object.freeze(developmentMeta),
        
        // Server configuration optimized for development workflow
        server: Object.freeze(developmentServer),
        
        // Express.js application configuration with debugging enhancements
        app: Object.freeze(developmentApp),
        
        // Comprehensive logging configuration for debugging
        logging: Object.freeze(developmentLogging),
        
        // Relaxed security settings for development workflow
        security: Object.freeze(developmentSecurity),
        
        // Enhanced monitoring for performance analysis and debugging
        monitoring: Object.freeze(developmentMonitoring),
        
        // Feature configuration with development and testing enhancements
        features: Object.freeze(developmentFeatures),
        
        // Development-specific environment variables
        environment: Object.freeze({
            NODE_ENV: 'development',
            PORT: DEV_PORT,
            HOST: DEV_HOST,
            DEBUG: process.env.DEBUG || '*',
            LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
            VERBOSE: process.env.VERBOSE || 'true',
            WATCH_FILES: process.env.WATCH_FILES || 'true',
            HOT_RELOAD: process.env.HOT_RELOAD || 'true'
        }),
        
        // Development workflow optimizations
        development: Object.freeze({
            hot_reloading: {
                enabled: true,
                watch_paths: ['src/**/*.js', 'config/**/*.js'],
                ignore_paths: ['node_modules/**', 'test/**', 'coverage/**'],
                restart_delay: 1000,
                debounce_timeout: 100
            },
            debugging_features: {
                source_maps: true,
                inspector_enabled: true,
                break_on_sigint: true,
                detailed_stack_traces: true,
                performance_timeline: true
            },
            development_middleware: {
                morgan_logging: 'combined',
                error_handler: 'development',
                cors_middleware: true,
                body_parser_enhanced: true
            },
            performance_monitoring: {
                response_time_logging: true,
                memory_usage_tracking: true,
                event_loop_monitoring: true,
                garbage_collection_events: true
            }
        }),
        
        // Validation rules for development configuration
        validation: Object.freeze({
            ...defaultConfig.validation,
            development: {
                debug_mode: {
                    type: 'boolean',
                    required: false,
                    default: true
                },
                verbose_logging: {
                    type: 'boolean',
                    required: false,
                    default: true
                },
                hot_reload: {
                    type: 'boolean',
                    required: false,
                    default: true
                }
            }
        })
    };

    // Return immutable development configuration
    return Object.freeze(developmentConfig);
}

// Create the development configuration instance
const developmentConfig = createDevelopmentConfig(defaultConfig);

// Export development configuration with comprehensive module exports
module.exports = {
    // Primary development configuration export
    developmentConfig,
    
    // Individual section exports for modular access
    server: developmentConfig.server,
    app: developmentConfig.app,
    logging: developmentConfig.logging,
    security: developmentConfig.security,
    monitoring: developmentConfig.monitoring,
    features: developmentConfig.features,
    
    // Development-specific exports
    environment: developmentConfig.environment,
    development: developmentConfig.development,
    
    // Configuration factory function for dynamic development configuration
    createDevelopmentConfig,
    
    // Development constants and utilities
    DEVELOPMENT_VERSION,
    DEVELOPMENT_NAMESPACE,
    
    // Environment detection utilities
    isDevelopment: () => NODE_ENV === 'development',
    isDebugMode: () => DEBUG_MODE,
    isVerboseLogging: () => VERBOSE_LOGGING,
    
    // Configuration validation helper
    validateDevelopmentConfig: (config) => {
        const required = ['server', 'app', 'logging', 'security', 'monitoring', 'features'];
        return required.every(section => config[section] && typeof config[section] === 'object');
    }
};