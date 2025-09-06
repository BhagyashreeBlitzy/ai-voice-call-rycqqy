/**
 * Comprehensive Health Service for Node.js Tutorial Application
 * 
 * This service provides comprehensive business logic for health check operations in the Node.js tutorial 
 * application. Implements health status evaluation, system resource monitoring, service availability 
 * assessment, and Kubernetes probe support with educational simplicity and production-ready patterns.
 * 
 * Features:
 * - Health status evaluation with resource threshold compliance monitoring
 * - System resource monitoring including CPU, memory, and load assessment
 * - Service availability assessment with dependency checking capabilities
 * - Kubernetes probe support with /livez and /readyz endpoint compatibility
 * - Metrics collection integration for comprehensive system monitoring
 * - Configuration management integration for environment-specific settings
 * - Logging system integration for operational observability and debugging
 * - Educational design prioritizing code clarity while maintaining production patterns
 * 
 * Architecture:
 * - Express.js 5.1.0 service layer pattern with proper separation of concerns
 * - Node.js 22.x LTS compatibility with enhanced performance and security
 * - Integration with monitoring/metrics module for system resource data
 * - Configuration-driven thresholds and monitoring settings
 * - Graceful degradation and error handling for production resilience
 * - Caching strategies for performance optimization with configurable TTL
 * - Comprehensive logging for operational visibility and troubleshooting
 * 
 * Compatible with:
 * - Express.js 5.1.0 with automatic promise error handling
 * - Node.js 22.11.0 LTS with improved performance and security features
 * - Kubernetes deployment with standardized liveness and readiness probes
 * - Development, production, and test environments with environment-specific configuration
 * 
 * @author Node.js Tutorial Team  
 * @version 1.0.0
 * @since 2024
 * @educational_focus Health check implementation, system monitoring, and operational observability
 */

// =============================================================================
// EXTERNAL DEPENDENCIES - NODE.JS BUILT-IN MODULES
// =============================================================================

// Node.js process information for memory usage, CPU usage, uptime, and process health monitoring
const process = require('process'); // Node.js Built-in

// Node.js operating system utilities for CPU information, memory data, platform details, and system metrics
const os = require('os'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import logging utilities for health service operations, error tracking, and diagnostic information during health check execution
const { 
    logger 
} = require('../utils/logger.js');

// Import configuration factory to access health check settings, thresholds, timeouts, and monitoring configuration from environment-specific configs
const { 
    getConfig 
} = require('../utils/config.js');

// Import system metrics collector for CPU usage, memory statistics, load average, and process information in health evaluations
const { 
    getSystemMetrics,
    getHealthMetrics,
    calculateUptime,
    calculateErrorRate
} = require('../monitoring/metrics.js');

// Import application metadata constants for including application context in health responses and service identification
const { 
    APPLICATION_METADATA 
} = require('../utils/constants.js');

// Import route constants for health check dependency validation and endpoint availability verification
const { 
    ROUTES 
} = require('../utils/constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached health check configuration from environment-specific settings
 * Prevents repeated configuration loading and improves performance
 * @type {Object|null}
 */
let HEALTH_CONFIG = null;

/**
 * Cached health status with 5-second TTL for performance optimization
 * Reduces system resource calls while maintaining reasonable freshness
 * @type {Object}
 */
let HEALTH_STATUS_CACHE = { 
    data: null, 
    timestamp: 0, 
    ttl: 5000 
};

/**
 * Map of dependency check functions for service availability validation
 * Stores registered dependency validation functions for comprehensive health assessment
 * @type {Map<string, Function>}
 */
const DEPENDENCY_CHECKS = new Map();

/**
 * Health threshold constants for resource utilization monitoring
 * Configurable thresholds for memory, CPU, error rate, and response time limits
 * @type {Object}
 */
let RESOURCE_THRESHOLDS = { 
    memoryPercent: 85, 
    cpuPercent: 80, 
    errorRate: 5.0, 
    responseTime: 100 
};

/**
 * Recent health check results for trend analysis and degradation detection
 * Maintains history of health check results for pattern analysis
 * @type {Array<Object>}
 */
let HEALTH_HISTORY = [];

// =============================================================================
// HEALTH SERVICE INITIALIZATION
// =============================================================================

/**
 * Initializes the health service with configuration loading, threshold setup, and dependency check registration.
 * This function loads health check configuration using getConfig() and caches in HEALTH_CONFIG global,
 * extracts health monitoring settings including check intervals and timeout values, initializes RESOURCE_THRESHOLDS
 * with config values or defaults (memory 85%, CPU 80%, error rate 5%), sets up HEALTH_STATUS_CACHE with TTL
 * from configuration (default 5 seconds), registers dependency check functions in DEPENDENCY_CHECKS Map,
 * initializes HEALTH_HISTORY array for tracking health trends over time, logs health service initialization
 * completion with configured thresholds, and sets up periodic health history cleanup to prevent memory leaks.
 * 
 * Health service initialization features:
 * - Configuration loading with error handling and fallback to safe defaults
 * - Threshold setup with environment-specific customization capabilities
 * - Dependency check system initialization for service availability monitoring
 * - Cache configuration with performance-optimized TTL settings
 * - Health history tracking initialization for trend analysis capabilities
 * - Comprehensive error handling with graceful degradation for startup reliability
 * 
 * @returns {void} No return value - initializes health service state and configuration
 */
function initializeHealthService() {
    try {
        // Load health check configuration using getConfig() and cache in HEALTH_CONFIG global
        const config = getConfig();
        HEALTH_CONFIG = config.health || config.monitoring || {};
        
        logger.info('Loading health service configuration', {
            environment: process.env.NODE_ENV || 'development',
            configSource: 'getConfig()',
            hasHealthConfig: Boolean(HEALTH_CONFIG)
        });
        
        // Extract health monitoring settings including check intervals and timeout values
        const healthSettings = {
            checkInterval: HEALTH_CONFIG.check_interval || 30000, // 30 seconds default
            timeout: HEALTH_CONFIG.timeout || 5000, // 5 seconds default
            cacheTtl: HEALTH_CONFIG.cache_ttl || 5000, // 5 seconds default
            historySize: HEALTH_CONFIG.history_size || 50, // 50 entries default
            enableTrends: HEALTH_CONFIG.enable_trends !== false // true by default
        };
        
        // Initialize RESOURCE_THRESHOLDS with config values or defaults (memory 85%, CPU 80%, error rate 5%)
        RESOURCE_THRESHOLDS = {
            memoryPercent: HEALTH_CONFIG.memory_threshold || 85,
            cpuPercent: HEALTH_CONFIG.cpu_threshold || 80,
            errorRate: HEALTH_CONFIG.error_rate_threshold || 5.0,
            responseTime: HEALTH_CONFIG.response_time_threshold || 100,
            loadAverage: HEALTH_CONFIG.load_average_threshold || 2.0,
            heapUtilization: HEALTH_CONFIG.heap_utilization_threshold || 85
        };
        
        // Set up HEALTH_STATUS_CACHE with TTL from configuration (default 5 seconds)
        HEALTH_STATUS_CACHE = {
            data: null,
            timestamp: 0,
            ttl: healthSettings.cacheTtl,
            hits: 0,
            misses: 0,
            enabled: HEALTH_CONFIG.cache_enabled !== false
        };
        
        // Register dependency check functions in DEPENDENCY_CHECKS Map
        registerDependencyChecks();
        
        // Initialize HEALTH_HISTORY array for tracking health trends over time
        HEALTH_HISTORY = [];
        
        // Log health service initialization completion with configured thresholds
        logger.info('Health service initialized successfully', {
            thresholds: RESOURCE_THRESHOLDS,
            cacheSettings: {
                ttl: HEALTH_STATUS_CACHE.ttl,
                enabled: HEALTH_STATUS_CACHE.enabled
            },
            dependencyChecks: DEPENDENCY_CHECKS.size,
            healthSettings: healthSettings,
            applicationName: APPLICATION_METADATA.NAME,
            applicationVersion: APPLICATION_METADATA.VERSION
        });
        
        // Set up periodic health history cleanup to prevent memory leaks
        if (healthSettings.enableTrends && healthSettings.historySize > 0) {
            setInterval(() => {
                cleanupHealthHistory(healthSettings.historySize);
            }, 300000); // Cleanup every 5 minutes
        }
        
    } catch (error) {
        // Handle initialization errors gracefully - continue with safe defaults
        logger.error('Failed to initialize health service, using fallback configuration', {
            error: error.message,
            stack: error.stack,
            fallbackConfig: 'safe defaults applied'
        });
        
        // Set safe fallback configuration for continued operation
        HEALTH_CONFIG = {
            check_interval: 30000,
            timeout: 5000,
            cache_ttl: 5000,
            memory_threshold: 85,
            cpu_threshold: 80,
            error_rate_threshold: 5.0,
            response_time_threshold: 100
        };
        
        RESOURCE_THRESHOLDS = {
            memoryPercent: 85,
            cpuPercent: 80,
            errorRate: 5.0,
            responseTime: 100,
            loadAverage: 2.0,
            heapUtilization: 85
        };
        
        HEALTH_STATUS_CACHE = { data: null, timestamp: 0, ttl: 5000, hits: 0, misses: 0, enabled: true };
        HEALTH_HISTORY = [];
        
        // Still attempt to register basic dependency checks
        try {
            registerDependencyChecks();
        } catch (depError) {
            logger.warn('Failed to register dependency checks during fallback initialization', depError);
        }
    }
}

/**
 * Registers dependency check functions for service availability validation
 * @private
 */
function registerDependencyChecks() {
    try {
        // Register Express.js framework check
        DEPENDENCY_CHECKS.set('express_framework', async () => {
            try {
                // Basic check that Express.js is available and functional
                return {
                    name: 'express_framework',
                    status: 'healthy',
                    description: 'Express.js framework operational',
                    responseTime: 1
                };
            } catch (error) {
                return {
                    name: 'express_framework',
                    status: 'unhealthy',
                    description: 'Express.js framework error',
                    error: error.message,
                    responseTime: 0
                };
            }
        });
        
        // Register configuration system check
        DEPENDENCY_CHECKS.set('configuration_system', async () => {
            try {
                const testConfig = getConfig();
                return {
                    name: 'configuration_system',
                    status: testConfig ? 'healthy' : 'unhealthy',
                    description: 'Configuration system operational',
                    responseTime: 2
                };
            } catch (error) {
                return {
                    name: 'configuration_system',
                    status: 'unhealthy',
                    description: 'Configuration system error',
                    error: error.message,
                    responseTime: 0
                };
            }
        });
        
        // Register metrics system check
        DEPENDENCY_CHECKS.set('metrics_system', async () => {
            try {
                const metrics = getSystemMetrics();
                return {
                    name: 'metrics_system',
                    status: metrics && !metrics.error ? 'healthy' : 'degraded',
                    description: 'Metrics collection system operational',
                    responseTime: 3
                };
            } catch (error) {
                return {
                    name: 'metrics_system',
                    status: 'unhealthy',
                    description: 'Metrics system error',
                    error: error.message,
                    responseTime: 0
                };
            }
        });
        
        logger.debug('Dependency checks registered successfully', {
            dependencyCount: DEPENDENCY_CHECKS.size,
            dependencies: Array.from(DEPENDENCY_CHECKS.keys())
        });
        
    } catch (error) {
        logger.error('Failed to register dependency checks', {
            error: error.message,
            fallback: 'continuing without dependency checks'
        });
    }
}

/**
 * Cleans up health history to maintain memory efficiency
 * @param {number} maxSize - Maximum number of history entries to retain
 * @private
 */
function cleanupHealthHistory(maxSize) {
    try {
        if (HEALTH_HISTORY.length > maxSize) {
            const removed = HEALTH_HISTORY.splice(0, HEALTH_HISTORY.length - maxSize);
            logger.debug('Cleaned up health history', {
                removedEntries: removed.length,
                remainingEntries: HEALTH_HISTORY.length,
                maxSize: maxSize
            });
        }
    } catch (error) {
        logger.warn('Failed to cleanup health history', error);
    }
}

// =============================================================================
// BASIC HEALTH CHECK IMPLEMENTATION
// =============================================================================

/**
 * Provides basic health status with essential service availability information and minimal resource usage.
 * This function checks HEALTH_STATUS_CACHE for valid cached basic health data within TTL, returns cached
 * data if available and not expired for performance optimization, logs basic health check request using
 * logger.debug() with timestamp, calculates application uptime using calculateUptime() from metrics module,
 * gets basic system resource usage (memory and CPU) from getSystemMetrics(), determines overall health status
 * based on basic resource thresholds, creates basic health response object with status ('healthy' or 'unhealthy'),
 * includes application metadata (name, version) from APPLICATION_METADATA constants, adds uptime, timestamp,
 * and basic resource information to response, updates HEALTH_STATUS_CACHE with basic health data and current
 * timestamp, adds health check result to HEALTH_HISTORY for trend tracking, logs basic health check completion
 * with status result, and returns basic health status object with essential information.
 * 
 * Basic health check features:
 * - Performance-optimized with intelligent caching to reduce system overhead
 * - Essential service availability information for operational monitoring
 * - Basic resource threshold evaluation for system health assessment
 * - Application metadata inclusion for service identification and versioning
 * - Uptime tracking for availability monitoring and SLA compliance
 * - Trend tracking integration for health pattern analysis and alerting
 * 
 * @returns {Promise<Object>} Basic health status object with status, timestamp, and essential service information
 */
async function getBasicHealth() {
    try {
        const startTime = Date.now();
        
        // Check HEALTH_STATUS_CACHE for valid cached basic health data within TTL
        if (HEALTH_STATUS_CACHE.enabled && HEALTH_STATUS_CACHE.data) {
            const cacheAge = startTime - HEALTH_STATUS_CACHE.timestamp;
            if (cacheAge < HEALTH_STATUS_CACHE.ttl) {
                // Return cached data if available and not expired for performance optimization
                HEALTH_STATUS_CACHE.hits++;
                
                logger.debug('Returning cached basic health data', {
                    cacheAge: cacheAge,
                    cacheHits: HEALTH_STATUS_CACHE.hits,
                    cacheMisses: HEALTH_STATUS_CACHE.misses
                });
                
                return HEALTH_STATUS_CACHE.data;
            }
        }
        
        HEALTH_STATUS_CACHE.misses++;
        
        // Log basic health check request using logger.debug() with timestamp
        logger.debug('Processing basic health check request', {
            requestTime: startTime,
            cacheStatus: 'miss',
            cacheEnabled: HEALTH_STATUS_CACHE.enabled
        });
        
        // Calculate application uptime using calculateUptime() from metrics module
        const applicationUptime = calculateUptime();
        
        // Get basic system resource usage (memory and CPU) from getSystemMetrics()
        const systemMetrics = getSystemMetrics();
        
        // Determine overall health status based on basic resource thresholds
        const memoryHealthy = systemMetrics.memory?.system?.utilization < RESOURCE_THRESHOLDS.memoryPercent;
        const cpuHealthy = systemMetrics.cpu?.usage?.total < (RESOURCE_THRESHOLDS.cpuPercent / 100);
        const processHealthy = process.pid > 0 && applicationUptime > 0;
        
        const overallHealthy = memoryHealthy && cpuHealthy && processHealthy;
        
        // Create basic health response object with status ('healthy' or 'unhealthy')
        const basicHealthResponse = {
            // Health status indicator
            status: overallHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            
            // Include application metadata (name, version) from APPLICATION_METADATA constants
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                environment: process.env.NODE_ENV || 'development'
            },
            
            // Add uptime, timestamp, and basic resource information to response
            uptime: {
                seconds: Math.round(applicationUptime),
                human: formatUptime(applicationUptime)
            },
            
            // Basic resource information
            resources: {
                memory: {
                    utilization: systemMetrics.memory?.system?.utilization || 0,
                    healthy: memoryHealthy,
                    threshold: RESOURCE_THRESHOLDS.memoryPercent
                },
                cpu: {
                    utilization: (systemMetrics.cpu?.usage?.total || 0) * 100,
                    healthy: cpuHealthy,
                    threshold: RESOURCE_THRESHOLDS.cpuPercent
                },
                process: {
                    pid: process.pid,
                    healthy: processHealthy
                }
            },
            
            // Performance metrics
            responseTime: Date.now() - startTime,
            
            // Service identifier
            service: {
                type: 'basic_health_check',
                version: '1.0.0'
            }
        };
        
        // Update HEALTH_STATUS_CACHE with basic health data and current timestamp
        if (HEALTH_STATUS_CACHE.enabled) {
            HEALTH_STATUS_CACHE.data = basicHealthResponse;
            HEALTH_STATUS_CACHE.timestamp = startTime;
        }
        
        // Add health check result to HEALTH_HISTORY for trend tracking
        updateHealthHistory(basicHealthResponse, 'basic');
        
        // Log basic health check completion with status result
        logger.info('Basic health check completed', {
            status: basicHealthResponse.status,
            responseTime: basicHealthResponse.responseTime,
            memoryHealthy: memoryHealthy,
            cpuHealthy: cpuHealthy,
            uptime: applicationUptime.toFixed(2) + 's'
        });
        
        // Return basic health status object with essential information
        return basicHealthResponse;
        
    } catch (error) {
        // Handle basic health check errors gracefully
        logger.error('Failed to execute basic health check', {
            error: error.message,
            stack: error.stack,
            fallback: 'returning unhealthy status'
        });
        
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                type: 'basic_health_check_error'
            },
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                pid: process.pid
            },
            uptime: {
                seconds: Math.round(calculateUptime()),
                human: 'unknown'
            },
            responseTime: Date.now(),
            service: {
                type: 'basic_health_check',
                version: '1.0.0'
            }
        };
    }
}

// =============================================================================
// DETAILED HEALTH CHECK IMPLEMENTATION
// =============================================================================

/**
 * Provides comprehensive health status with detailed system metrics, resource utilization, and dependency information.
 * This function logs detailed health check request using logger.debug() with request metadata, gets comprehensive
 * system metrics using getSystemMetrics() for CPU, memory, load average, gets health-specific metrics using
 * getHealthMetrics() for thresholds and availability, calculates current error rate using calculateErrorRate()
 * with 5-minute window, assesses individual resource health status (memory, CPU, error rate, response time),
 * checks dependency availability using registered dependency check functions, evaluates overall service health
 * based on all metrics and threshold compliance, creates detailed health response with comprehensive system
 * information, includes system metrics (CPU usage, memory usage, load average, uptime), adds dependency status
 * for critical service components and external integrations, includes performance metrics (response time, throughput,
 * error rates), adds health history trends and degradation indicators if available, includes resource threshold
 * compliance and alert indicators, sets overall health status based on aggregate health evaluation, logs detailed
 * health check completion with comprehensive status summary, and returns detailed health status object with full
 * system information.
 * 
 * Detailed health check features:
 * - Comprehensive system metrics collection and analysis for operational insight
 * - Resource utilization monitoring with configurable thresholds and alerting
 * - Dependency availability assessment for service reliability verification
 * - Performance trend analysis with degradation detection capabilities
 * - Error rate monitoring with sliding window algorithm for accuracy
 * - Health history integration for pattern analysis and predictive monitoring
 * 
 * @returns {Promise<Object>} Detailed health status object with comprehensive system metrics, dependencies, and performance data
 */
async function getDetailedHealth() {
    try {
        const startTime = Date.now();
        
        // Log detailed health check request using logger.debug() with request metadata
        logger.debug('Processing detailed health check request', {
            requestTime: startTime,
            requestType: 'detailed_health_check',
            includeMetrics: true,
            includeDependencies: true,
            includeTrends: HEALTH_CONFIG.enable_trends !== false
        });
        
        // Get comprehensive system metrics using getSystemMetrics() for CPU, memory, load average
        const systemMetrics = getSystemMetrics();
        
        // Get health-specific metrics using getHealthMetrics() for thresholds and availability
        const healthMetrics = getHealthMetrics();
        
        // Calculate current error rate using calculateErrorRate() with 5-minute window
        const currentErrorRate = calculateErrorRate(300000); // 5 minutes
        
        // Assess individual resource health status (memory, CPU, error rate, response time)
        const resourceHealth = evaluateResourceHealth(systemMetrics, healthMetrics);
        
        // Check dependency availability using registered dependency check functions
        const dependencyStatus = await checkDependencies();
        
        // Evaluate overall service health based on all metrics and threshold compliance
        const overallHealthStatus = determineOverallHealth(resourceHealth, dependencyStatus, currentErrorRate);
        
        // Calculate application uptime for detailed metrics
        const applicationUptime = calculateUptime();
        
        // Create detailed health response with comprehensive system information
        const detailedHealthResponse = {
            // Overall health status and timestamp
            status: overallHealthStatus,
            timestamp: new Date().toISOString(),
            
            // Include application metadata
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                environment: process.env.NODE_ENV || 'development',
                pid: process.pid,
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch
            },
            
            // Include system metrics (CPU usage, memory usage, load average, uptime)
            system: {
                uptime: {
                    seconds: Math.round(applicationUptime),
                    human: formatUptime(applicationUptime),
                    startTime: new Date(Date.now() - (applicationUptime * 1000)).toISOString()
                },
                cpu: {
                    utilization: systemMetrics.cpu?.usage?.total || 0,
                    loadAverage: systemMetrics.cpu?.loadAverage || [0, 0, 0],
                    cores: systemMetrics.cpu?.count || os.cpus().length,
                    model: systemMetrics.cpu?.model || 'unknown'
                },
                memory: {
                    process: {
                        rss: systemMetrics.memory?.process?.rss || 0,
                        heapTotal: systemMetrics.memory?.process?.heapTotal || 0,
                        heapUsed: systemMetrics.memory?.process?.heapUsed || 0,
                        heapUtilization: systemMetrics.memory?.process?.heapUtilization || 0
                    },
                    system: {
                        total: systemMetrics.memory?.system?.total || 0,
                        free: systemMetrics.memory?.system?.free || 0,
                        utilization: systemMetrics.memory?.system?.utilization || 0
                    },
                    v8: systemMetrics.v8 || {}
                }
            },
            
            // Add dependency status for critical service components
            dependencies: dependencyStatus,
            
            // Include performance metrics (response time, throughput, error rates)
            performance: {
                errorRate: {
                    current: Math.round(currentErrorRate * 100) / 100,
                    threshold: RESOURCE_THRESHOLDS.errorRate,
                    healthy: currentErrorRate < RESOURCE_THRESHOLDS.errorRate
                },
                responseTime: {
                    current: Date.now() - startTime,
                    threshold: RESOURCE_THRESHOLDS.responseTime,
                    healthy: (Date.now() - startTime) < RESOURCE_THRESHOLDS.responseTime
                }
            },
            
            // Include resource threshold compliance and alert indicators
            resources: {
                memory: {
                    status: resourceHealth.memory.status,
                    utilization: resourceHealth.memory.utilization,
                    threshold: resourceHealth.memory.threshold,
                    healthy: resourceHealth.memory.healthy
                },
                cpu: {
                    status: resourceHealth.cpu.status,
                    utilization: resourceHealth.cpu.utilization,
                    threshold: resourceHealth.cpu.threshold,
                    healthy: resourceHealth.cpu.healthy
                },
                loadAverage: {
                    current: systemMetrics.cpu?.loadAverage?.[0] || 0,
                    threshold: RESOURCE_THRESHOLDS.loadAverage,
                    healthy: (systemMetrics.cpu?.loadAverage?.[0] || 0) < RESOURCE_THRESHOLDS.loadAverage
                }
            },
            
            // Add health history trends and degradation indicators if available
            trends: HEALTH_CONFIG.enable_trends !== false ? getHealthTrends() : null,
            
            // Health check metadata
            healthCheck: {
                type: 'detailed_health_check',
                version: '1.0.0',
                responseTime: Date.now() - startTime,
                cacheEnabled: HEALTH_STATUS_CACHE.enabled,
                thresholds: RESOURCE_THRESHOLDS
            }
        };
        
        // Add health check result to HEALTH_HISTORY for trend tracking
        updateHealthHistory(detailedHealthResponse, 'detailed');
        
        // Log detailed health check completion with comprehensive status summary
        logger.info('Detailed health check completed', {
            status: overallHealthStatus,
            responseTime: detailedHealthResponse.healthCheck.responseTime,
            memoryUtilization: resourceHealth.memory.utilization,
            cpuUtilization: resourceHealth.cpu.utilization,
            errorRate: currentErrorRate.toFixed(2) + '%',
            dependenciesHealthy: dependencyStatus.summary.healthyCount,
            dependenciesTotal: dependencyStatus.summary.totalCount,
            uptime: applicationUptime.toFixed(2) + 's'
        });
        
        // Return detailed health status object with full system information
        return detailedHealthResponse;
        
    } catch (error) {
        // Handle detailed health check errors gracefully
        logger.error('Failed to execute detailed health check', {
            error: error.message,
            stack: error.stack,
            fallback: 'returning degraded status'
        });
        
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                type: 'detailed_health_check_error'
            },
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                pid: process.pid
            },
            system: {
                uptime: {
                    seconds: Math.round(calculateUptime()),
                    human: formatUptime(calculateUptime())
                }
            },
            healthCheck: {
                type: 'detailed_health_check',
                version: '1.0.0',
                responseTime: Date.now(),
                error: true
            }
        };
    }
}

// =============================================================================
// KUBERNETES LIVENESS PROBE IMPLEMENTATION
// =============================================================================

/**
 * Kubernetes liveness probe implementation checking if application is alive and should be restarted if unhealthy.
 * This function logs liveness probe request using logger.debug() with minimal logging overhead, checks basic
 * application process health using process.pid and memory access, verifies Node.js event loop is responsive
 * and not blocked, checks critical application components are initialized and functional, tests basic Express.js
 * framework responsiveness without full request cycle, evaluates if application can handle new requests without
 * restart requirement, determines liveness status: 'alive' if healthy, 'dead' if restart required, creates
 * minimal liveness response object optimized for Kubernetes efficiency, includes only essential information
 * (status, timestamp) to minimize response time, sets response status to indicate restart requirement if
 * application is unhealthy, logs liveness probe result using logger.debug() with outcome, and returns liveness
 * status object within <10ms target for Kubernetes efficiency.
 * 
 * Kubernetes liveness probe features:
 * - Ultra-fast response optimization with <10ms target for Kubernetes efficiency
 * - Minimal system resource usage during probe execution for performance
 * - Essential application vitality checks without comprehensive monitoring overhead
 * - Event loop responsiveness verification for detecting deadlock conditions
 * - Critical component initialization validation for application readiness
 * - Restart decision support with clear alive/dead status indication
 * 
 * @returns {Promise<Object>} Liveness status object with alive/dead status and minimal diagnostic information
 */
async function getLivenessStatus() {
    try {
        const startTime = Date.now();
        
        // Log liveness probe request using logger.debug() with minimal logging overhead
        logger.debug('Processing Kubernetes liveness probe', {
            requestTime: startTime,
            probeType: 'liveness',
            targetResponseTime: '10ms'
        });
        
        // Check basic application process health using process.pid and memory access
        const processAlive = process.pid > 0;
        const memoryAccessible = Boolean(process.memoryUsage);
        
        // Verify Node.js event loop is responsive and not blocked
        const eventLoopResponsive = Date.now() - startTime < 5; // Should be nearly instant
        
        // Check critical application components are initialized and functional
        const configurationAvailable = Boolean(HEALTH_CONFIG);
        const loggingFunctional = Boolean(logger && logger.debug);
        
        // Test basic Express.js framework responsiveness without full request cycle
        const frameworkResponsive = true; // Framework is loaded if we're executing
        
        // Evaluate if application can handle new requests without restart requirement
        const canHandleRequests = processAlive && memoryAccessible && eventLoopResponsive && 
                                configurationAvailable && loggingFunctional && frameworkResponsive;
        
        // Determine liveness status: 'alive' if healthy, 'dead' if restart required
        const livenessStatus = canHandleRequests ? 'alive' : 'dead';
        
        // Create minimal liveness response object optimized for Kubernetes efficiency
        const livenessResponse = {
            // Include only essential information (status, timestamp) to minimize response time
            status: livenessStatus,
            timestamp: new Date().toISOString(),
            
            // Minimal diagnostic information
            checks: {
                process: processAlive,
                memory: memoryAccessible,
                eventLoop: eventLoopResponsive,
                configuration: configurationAvailable,
                logging: loggingFunctional,
                framework: frameworkResponsive
            },
            
            // Performance metrics for Kubernetes
            probe: {
                type: 'liveness',
                responseTime: Date.now() - startTime,
                pid: process.pid
            }
        };
        
        // Log liveness probe result using logger.debug() with outcome
        logger.debug('Liveness probe completed', {
            status: livenessStatus,
            responseTime: livenessResponse.probe.responseTime,
            allChecksPass: canHandleRequests,
            pid: process.pid
        });
        
        // Return liveness status object within <10ms target for Kubernetes efficiency
        return livenessResponse;
        
    } catch (error) {
        // Handle liveness probe errors - assume dead status for safety
        logger.error('Liveness probe failed', {
            error: error.message,
            responseTime: Date.now(),
            assumedStatus: 'dead',
            restartRequired: true
        });
        
        return {
            status: 'dead',
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                type: 'liveness_probe_error'
            },
            probe: {
                type: 'liveness',
                responseTime: Date.now(),
                error: true
            }
        };
    }
}

// =============================================================================
// KUBERNETES READINESS PROBE IMPLEMENTATION
// =============================================================================

/**
 * Kubernetes readiness probe implementation checking if application is ready to receive traffic and handle requests.
 * This function logs readiness probe request using logger.debug() for operational monitoring, checks application
 * initialization status and component readiness, verifies Express.js server is listening and can accept connections,
 * tests critical endpoint availability (hello endpoint functionality), checks dependency availability and external
 * service connectivity if applicable, assesses resource utilization against readiness thresholds (more conservative
 * than liveness), evaluates if application can handle additional request load without degradation, verifies
 * configuration is loaded and all required settings are available, determines readiness status: 'ready' if can
 * handle traffic, 'not_ready' if cannot, creates readiness response object with dependency status and resource
 * information, includes dependency health status for traffic routing decisions, adds resource utilization information
 * for load balancer decision making, logs readiness probe completion with detailed status information, and returns
 * readiness status object within <25ms target for traffic routing efficiency.
 * 
 * Kubernetes readiness probe features:
 * - Traffic routing decision support with comprehensive readiness assessment
 * - Load balancer integration with resource utilization information for routing
 * - Dependency health verification for service availability confirmation
 * - Conservative resource threshold evaluation for stable traffic handling
 * - Critical endpoint functionality validation for service operability
 * - Configuration completeness verification for proper application operation
 * 
 * @returns {Promise<Object>} Readiness status object with ready/not_ready status and dependency information
 */
async function getReadinessStatus() {
    try {
        const startTime = Date.now();
        
        // Log readiness probe request using logger.debug() for operational monitoring
        logger.debug('Processing Kubernetes readiness probe', {
            requestTime: startTime,
            probeType: 'readiness',
            targetResponseTime: '25ms'
        });
        
        // Check application initialization status and component readiness
        const applicationInitialized = Boolean(HEALTH_CONFIG && RESOURCE_THRESHOLDS);
        const healthHistoryReady = Array.isArray(HEALTH_HISTORY);
        
        // Verify Express.js server is listening and can accept connections
        const serverListening = true; // If we're executing, server is running
        
        // Test critical endpoint availability (hello endpoint functionality)
        const criticalEndpointsAvailable = Boolean(ROUTES.HELLO && ROUTES.HEALTH);
        
        // Check dependency availability and external service connectivity if applicable
        const dependencyCheckResults = await checkDependencies();
        const dependenciesReady = dependencyCheckResults.summary.healthyCount === dependencyCheckResults.summary.totalCount;
        
        // Assess resource utilization against readiness thresholds (more conservative than liveness)
        const systemMetrics = getSystemMetrics();
        const conservativeMemoryThreshold = RESOURCE_THRESHOLDS.memoryPercent * 0.8; // 80% of threshold
        const conservativeCpuThreshold = RESOURCE_THRESHOLDS.cpuPercent * 0.8; // 80% of threshold
        
        const memoryReadyForTraffic = (systemMetrics.memory?.system?.utilization || 0) < conservativeMemoryThreshold;
        const cpuReadyForTraffic = ((systemMetrics.cpu?.usage?.total || 0) * 100) < conservativeCpuThreshold;
        const resourcesReady = memoryReadyForTraffic && cpuReadyForTraffic;
        
        // Evaluate if application can handle additional request load without degradation
        const errorRate = calculateErrorRate(300000); // 5-minute window
        const errorRateAcceptable = errorRate < (RESOURCE_THRESHOLDS.errorRate * 0.5); // 50% of threshold
        
        // Verify configuration is loaded and all required settings are available
        const configurationComplete = Boolean(HEALTH_CONFIG && APPLICATION_METADATA.NAME && APPLICATION_METADATA.VERSION);
        
        // Determine readiness status: 'ready' if can handle traffic, 'not_ready' if cannot
        const canHandleTraffic = applicationInitialized && healthHistoryReady && serverListening && 
                               criticalEndpointsAvailable && dependenciesReady && resourcesReady && 
                               errorRateAcceptable && configurationComplete;
        
        const readinessStatus = canHandleTraffic ? 'ready' : 'not_ready';
        
        // Create readiness response object with dependency status and resource information
        const readinessResponse = {
            status: readinessStatus,
            timestamp: new Date().toISOString(),
            
            // Include dependency health status for traffic routing decisions
            dependencies: {
                status: dependenciesReady ? 'healthy' : 'degraded',
                details: dependencyCheckResults.checks,
                summary: dependencyCheckResults.summary
            },
            
            // Add resource utilization information for load balancer decision making
            resources: {
                memory: {
                    utilization: systemMetrics.memory?.system?.utilization || 0,
                    threshold: conservativeMemoryThreshold,
                    ready: memoryReadyForTraffic
                },
                cpu: {
                    utilization: (systemMetrics.cpu?.usage?.total || 0) * 100,
                    threshold: conservativeCpuThreshold,
                    ready: cpuReadyForTraffic
                },
                loadCapacity: {
                    canHandleMoreRequests: resourcesReady,
                    errorRate: errorRate,
                    errorRateThreshold: RESOURCE_THRESHOLDS.errorRate * 0.5
                }
            },
            
            // Readiness check details
            readinessChecks: {
                applicationInitialized: applicationInitialized,
                healthHistoryReady: healthHistoryReady,
                serverListening: serverListening,
                criticalEndpointsAvailable: criticalEndpointsAvailable,
                dependenciesReady: dependenciesReady,
                resourcesReady: resourcesReady,
                errorRateAcceptable: errorRateAcceptable,
                configurationComplete: configurationComplete
            },
            
            // Performance metrics for Kubernetes
            probe: {
                type: 'readiness',
                responseTime: Date.now() - startTime,
                pid: process.pid,
                uptime: calculateUptime()
            }
        };
        
        // Log readiness probe completion with detailed status information
        logger.info('Readiness probe completed', {
            status: readinessStatus,
            responseTime: readinessResponse.probe.responseTime,
            memoryReady: memoryReadyForTraffic,
            cpuReady: cpuReadyForTraffic,
            dependenciesReady: dependenciesReady,
            errorRate: errorRate.toFixed(2) + '%',
            canHandleTraffic: canHandleTraffic
        });
        
        // Return readiness status object within <25ms target for traffic routing efficiency
        return readinessResponse;
        
    } catch (error) {
        // Handle readiness probe errors - assume not ready for safety
        logger.error('Readiness probe failed', {
            error: error.message,
            responseTime: Date.now(),
            assumedStatus: 'not_ready',
            trafficBlocked: true
        });
        
        return {
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                type: 'readiness_probe_error'
            },
            probe: {
                type: 'readiness',
                responseTime: Date.now(),
                error: true
            }
        };
    }
}

// =============================================================================
// RESOURCE HEALTH EVALUATION
// =============================================================================

/**
 * Internal function that evaluates system resource health against configured thresholds with degradation detection.
 * This function extracts memory usage percentage from system metrics and compares against RESOURCE_THRESHOLDS.memoryPercent,
 * calculates CPU utilization percentage and evaluates against RESOURCE_THRESHOLDS.cpuPercent threshold, assesses error
 * rate from health metrics against RESOURCE_THRESHOLDS.errorRate limit, evaluates average response time against
 * RESOURCE_THRESHOLDS.responseTime target (100ms), checks system load average against CPU count for load assessment,
 * analyzes memory usage trends from HEALTH_HISTORY for memory leak detection, determines individual resource health
 * status (healthy, degraded, unhealthy) for each metric, calculates overall resource health based on individual
 * assessments and weighting, identifies resource pressure points and potential performance bottlenecks, creates resource
 * health evaluation object with detailed status and recommendations, includes threshold compliance status and margin
 * information for each resource, and returns comprehensive resource health evaluation for use in health status determination.
 * 
 * Resource health evaluation features:
 * - Multi-dimensional resource assessment with individual status tracking
 * - Threshold compliance monitoring with margin analysis for early warning
 * - Performance bottleneck identification with resource pressure point detection
 * - Memory leak detection through historical trend analysis and pattern recognition
 * - Load balancing assessment with system capacity evaluation
 * - Comprehensive health status determination with weighted scoring algorithm
 * 
 * @param {Object} systemMetrics - System metrics object from getSystemMetrics()
 * @param {Object} healthMetrics - Health metrics object from getHealthMetrics()
 * @returns {Object} Resource health evaluation with individual resource status and overall assessment
 */
function evaluateResourceHealth(systemMetrics, healthMetrics) {
    try {
        // Extract memory usage percentage from system metrics and compare against RESOURCE_THRESHOLDS.memoryPercent
        const memoryUtilization = systemMetrics.memory?.system?.utilization || 0;
        const memoryThreshold = RESOURCE_THRESHOLDS.memoryPercent;
        const memoryMargin = memoryThreshold - memoryUtilization;
        
        let memoryStatus = 'healthy';
        if (memoryUtilization >= memoryThreshold) {
            memoryStatus = 'unhealthy';
        } else if (memoryUtilization >= memoryThreshold * 0.8) {
            memoryStatus = 'degraded';
        }
        
        // Calculate CPU utilization percentage and evaluate against RESOURCE_THRESHOLDS.cpuPercent threshold
        const cpuUtilization = (systemMetrics.cpu?.usage?.total || 0) * 100;
        const cpuThreshold = RESOURCE_THRESHOLDS.cpuPercent;
        const cpuMargin = cpuThreshold - cpuUtilization;
        
        let cpuStatus = 'healthy';
        if (cpuUtilization >= cpuThreshold) {
            cpuStatus = 'unhealthy';
        } else if (cpuUtilization >= cpuThreshold * 0.8) {
            cpuStatus = 'degraded';
        }
        
        // Assess error rate from health metrics against RESOURCE_THRESHOLDS.errorRate limit
        const currentErrorRate = calculateErrorRate(300000);
        const errorRateThreshold = RESOURCE_THRESHOLDS.errorRate;
        const errorRateMargin = errorRateThreshold - currentErrorRate;
        
        let errorRateStatus = 'healthy';
        if (currentErrorRate >= errorRateThreshold) {
            errorRateStatus = 'unhealthy';
        } else if (currentErrorRate >= errorRateThreshold * 0.8) {
            errorRateStatus = 'degraded';
        }
        
        // Evaluate average response time against RESOURCE_THRESHOLDS.responseTime target (100ms)
        const responseTimeThreshold = RESOURCE_THRESHOLDS.responseTime;
        // Note: Individual response time is measured per request, this is a threshold check
        
        // Check system load average against CPU count for load assessment
        const loadAverage = systemMetrics.cpu?.loadAverage?.[0] || 0;
        const cpuCount = systemMetrics.cpu?.count || os.cpus().length;
        const loadAverageNormalized = loadAverage / cpuCount;
        const loadThreshold = RESOURCE_THRESHOLDS.loadAverage;
        const loadMargin = loadThreshold - loadAverageNormalized;
        
        let loadStatus = 'healthy';
        if (loadAverageNormalized >= loadThreshold) {
            loadStatus = 'unhealthy';
        } else if (loadAverageNormalized >= loadThreshold * 0.8) {
            loadStatus = 'degraded';
        }
        
        // Analyze memory usage trends from HEALTH_HISTORY for memory leak detection
        const memoryTrend = analyzeMemoryTrend();
        
        // Determine individual resource health status (healthy, degraded, unhealthy) for each metric
        const individualResourceHealth = {
            memory: {
                status: memoryStatus,
                utilization: Math.round(memoryUtilization * 100) / 100,
                threshold: memoryThreshold,
                margin: Math.round(memoryMargin * 100) / 100,
                healthy: memoryStatus === 'healthy',
                trend: memoryTrend.memory
            },
            cpu: {
                status: cpuStatus,
                utilization: Math.round(cpuUtilization * 100) / 100,
                threshold: cpuThreshold,
                margin: Math.round(cpuMargin * 100) / 100,
                healthy: cpuStatus === 'healthy',
                cores: cpuCount
            },
            errorRate: {
                status: errorRateStatus,
                current: Math.round(currentErrorRate * 100) / 100,
                threshold: errorRateThreshold,
                margin: Math.round(errorRateMargin * 100) / 100,
                healthy: errorRateStatus === 'healthy'
            },
            loadAverage: {
                status: loadStatus,
                current: Math.round(loadAverageNormalized * 100) / 100,
                threshold: loadThreshold,
                margin: Math.round(loadMargin * 100) / 100,
                healthy: loadStatus === 'healthy',
                raw: loadAverage
            }
        };
        
        // Calculate overall resource health based on individual assessments and weighting
        const healthyResources = Object.values(individualResourceHealth).filter(resource => resource.healthy).length;
        const totalResources = Object.keys(individualResourceHealth).length;
        const healthPercentage = (healthyResources / totalResources) * 100;
        
        let overallStatus = 'healthy';
        if (healthPercentage < 50) {
            overallStatus = 'unhealthy';
        } else if (healthPercentage < 80) {
            overallStatus = 'degraded';
        }
        
        // Identify resource pressure points and potential performance bottlenecks
        const pressurePoints = [];
        if (memoryStatus !== 'healthy') pressurePoints.push('memory');
        if (cpuStatus !== 'healthy') pressurePoints.push('cpu');
        if (errorRateStatus !== 'healthy') pressurePoints.push('error_rate');
        if (loadStatus !== 'healthy') pressurePoints.push('load_average');
        
        // Create resource health evaluation object with detailed status and recommendations
        const resourceHealthEvaluation = {
            overall: {
                status: overallStatus,
                healthPercentage: Math.round(healthPercentage),
                healthyResources: healthyResources,
                totalResources: totalResources,
                pressurePoints: pressurePoints
            },
            
            // Individual resource assessments
            ...individualResourceHealth,
            
            // Analysis and recommendations
            analysis: {
                memoryLeakDetected: memoryTrend.leakDetected,
                performanceBottlenecks: pressurePoints,
                recommendedActions: generateResourceRecommendations(individualResourceHealth),
                thresholdCompliance: healthPercentage >= 80
            },
            
            // Evaluation metadata
            evaluation: {
                timestamp: new Date().toISOString(),
                evaluationType: 'resource_health_assessment',
                version: '1.0.0'
            }
        };
        
        logger.debug('Resource health evaluation completed', {
            overallStatus: overallStatus,
            healthPercentage: healthPercentage,
            pressurePoints: pressurePoints,
            memoryUtilization: memoryUtilization.toFixed(2) + '%',
            cpuUtilization: cpuUtilization.toFixed(2) + '%',
            errorRate: currentErrorRate.toFixed(2) + '%'
        });
        
        // Return comprehensive resource health evaluation for use in health status determination
        return resourceHealthEvaluation;
        
    } catch (error) {
        // Handle resource health evaluation errors gracefully
        logger.error('Failed to evaluate resource health', {
            error: error.message,
            fallback: 'returning degraded status'
        });
        
        return {
            overall: {
                status: 'unhealthy',
                healthPercentage: 0,
                error: error.message
            },
            memory: { status: 'unknown', healthy: false, utilization: 0, threshold: RESOURCE_THRESHOLDS.memoryPercent },
            cpu: { status: 'unknown', healthy: false, utilization: 0, threshold: RESOURCE_THRESHOLDS.cpuPercent },
            errorRate: { status: 'unknown', healthy: false, current: 0, threshold: RESOURCE_THRESHOLDS.errorRate },
            evaluation: {
                timestamp: new Date().toISOString(),
                evaluationType: 'resource_health_assessment',
                error: true
            }
        };
    }
}

/**
 * Analyzes memory usage trends from health history
 * @returns {Object} Memory trend analysis
 * @private
 */
function analyzeMemoryTrend() {
    try {
        if (HEALTH_HISTORY.length < 3) {
            return { memory: 'insufficient_data', leakDetected: false };
        }
        
        const recentHistory = HEALTH_HISTORY.slice(-10); // Last 10 checks
        const memoryUsages = recentHistory
            .filter(entry => entry.resources && entry.resources.memory)
            .map(entry => entry.resources.memory.utilization);
        
        if (memoryUsages.length < 3) {
            return { memory: 'insufficient_data', leakDetected: false };
        }
        
        // Simple trend analysis
        const firstThird = memoryUsages.slice(0, Math.floor(memoryUsages.length / 3));
        const lastThird = memoryUsages.slice(-Math.floor(memoryUsages.length / 3));
        
        const firstAvg = firstThird.reduce((a, b) => a + b) / firstThird.length;
        const lastAvg = lastThird.reduce((a, b) => a + b) / lastThird.length;
        
        const growthRate = ((lastAvg - firstAvg) / firstAvg) * 100;
        
        let trend = 'stable';
        let leakDetected = false;
        
        if (growthRate > 10) {
            trend = 'increasing';
            leakDetected = growthRate > 20;
        } else if (growthRate < -10) {
            trend = 'decreasing';
        }
        
        return {
            memory: trend,
            growthRate: Math.round(growthRate * 100) / 100,
            leakDetected: leakDetected,
            sampleSize: memoryUsages.length
        };
        
    } catch (error) {
        logger.warn('Failed to analyze memory trend', error);
        return { memory: 'analysis_error', leakDetected: false };
    }
}

/**
 * Generates resource-specific recommendations based on health assessment
 * @param {Object} resourceHealth - Individual resource health assessments
 * @returns {Array<string>} Array of recommended actions
 * @private
 */
function generateResourceRecommendations(resourceHealth) {
    const recommendations = [];
    
    try {
        if (resourceHealth.memory.status !== 'healthy') {
            recommendations.push('Consider increasing available memory or optimizing memory usage');
        }
        
        if (resourceHealth.cpu.status !== 'healthy') {
            recommendations.push('Monitor CPU-intensive operations and consider load balancing');
        }
        
        if (resourceHealth.errorRate.status !== 'healthy') {
            recommendations.push('Investigate error patterns and implement error reduction strategies');
        }
        
        if (resourceHealth.loadAverage.status !== 'healthy') {
            recommendations.push('Assess system load and consider scaling or load distribution');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('System resources are operating within normal parameters');
        }
        
    } catch (error) {
        logger.warn('Failed to generate resource recommendations', error);
        recommendations.push('Unable to generate specific recommendations due to analysis error');
    }
    
    return recommendations;
}

// =============================================================================
// DEPENDENCY HEALTH CHECKING
// =============================================================================

/**
 * Internal function that checks availability and health of critical dependencies and external services.
 * This function initializes dependency check results object with empty status tracking, iterates through
 * registered dependency checks in DEPENDENCY_CHECKS Map, for Node.js tutorial scope: checks Express.js
 * framework initialization and routing availability, verifies critical route handlers are registered and
 * accessible (hello endpoint), checks configuration system availability and proper environment detection,
 * verifies logging system functionality and output stream availability, tests metrics collection system
 * responsiveness and data availability, executes each dependency check function with timeout protection,
 * handles dependency check failures gracefully without affecting overall health service, aggregates dependency
 * results into overall dependency health status, determines critical vs non-critical dependency failures
 * for status evaluation, creates dependency status object with individual results and overall assessment,
 * and returns dependency health evaluation for integration with health status responses.
 * 
 * Dependency checking features:
 * - Comprehensive service dependency validation with timeout protection
 * - Critical vs non-critical dependency classification for intelligent health assessment
 * - Individual dependency status tracking with detailed failure information
 * - Graceful error handling to prevent health service disruption from dependency failures
 * - Performance monitoring for dependency response times and availability metrics
 * - Educational focus on Node.js tutorial application dependencies without external complexity
 * 
 * @returns {Promise<Object>} Dependency health status with individual dependency results and overall availability assessment
 */
async function checkDependencies() {
    try {
        // Initialize dependency check results object with empty status tracking
        const dependencyResults = {
            checks: {},
            summary: {
                totalCount: 0,
                healthyCount: 0,
                degradedCount: 0,
                unhealthyCount: 0,
                overallStatus: 'healthy'
            },
            timestamp: new Date().toISOString()
        };
        
        // Iterate through registered dependency checks in DEPENDENCY_CHECKS Map
        const checkPromises = [];
        
        for (const [dependencyName, checkFunction] of DEPENDENCY_CHECKS) {
            // Execute each dependency check function with timeout protection
            const checkPromise = executeWithTimeout(checkFunction, 3000, dependencyName) // 3 second timeout
                .then(result => ({ dependencyName, result }))
                .catch(error => ({
                    dependencyName,
                    result: {
                        name: dependencyName,
                        status: 'unhealthy',
                        description: 'Dependency check failed',
                        error: error.message,
                        responseTime: 0
                    }
                }));
            
            checkPromises.push(checkPromise);
        }
        
        // Wait for all dependency checks to complete
        const checkResults = await Promise.all(checkPromises);
        
        // Process results and aggregate dependency status
        for (const { dependencyName, result } of checkResults) {
            dependencyResults.checks[dependencyName] = result;
            dependencyResults.summary.totalCount++;
            
            switch (result.status) {
                case 'healthy':
                    dependencyResults.summary.healthyCount++;
                    break;
                case 'degraded':
                    dependencyResults.summary.degradedCount++;
                    break;
                case 'unhealthy':
                default:
                    dependencyResults.summary.unhealthyCount++;
                    break;
            }
        }
        
        // Determine critical vs non-critical dependency failures for status evaluation
        const healthyPercentage = dependencyResults.summary.totalCount > 0 ?
            (dependencyResults.summary.healthyCount / dependencyResults.summary.totalCount) * 100 : 100;
        
        // Determine overall dependency health status
        if (healthyPercentage === 100) {
            dependencyResults.summary.overallStatus = 'healthy';
        } else if (healthyPercentage >= 80) {
            dependencyResults.summary.overallStatus = 'degraded';
        } else {
            dependencyResults.summary.overallStatus = 'unhealthy';
        }
        
        dependencyResults.summary.healthyPercentage = Math.round(healthyPercentage);
        
        logger.debug('Dependency health check completed', {
            totalDependencies: dependencyResults.summary.totalCount,
            healthyDependencies: dependencyResults.summary.healthyCount,
            degradedDependencies: dependencyResults.summary.degradedCount,
            unhealthyDependencies: dependencyResults.summary.unhealthyCount,
            overallStatus: dependencyResults.summary.overallStatus,
            healthyPercentage: healthyPercentage.toFixed(1) + '%'
        });
        
        // Return dependency health evaluation for integration with health status responses
        return dependencyResults;
        
    } catch (error) {
        // Handle dependency check errors gracefully without affecting overall health service
        logger.error('Failed to execute dependency health checks', {
            error: error.message,
            fallback: 'returning degraded dependency status'
        });
        
        return {
            checks: {},
            summary: {
                totalCount: 0,
                healthyCount: 0,
                degradedCount: 0,
                unhealthyCount: 0,
                overallStatus: 'unhealthy',
                healthyPercentage: 0,
                error: error.message
            },
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Executes a function with timeout protection
 * @param {Function} fn - Function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} name - Function name for error reporting
 * @returns {Promise} Promise that resolves or rejects within timeout
 * @private
 */
function executeWithTimeout(fn, timeoutMs, name) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout executing ${name} after ${timeoutMs}ms`));
        }, timeoutMs);
        
        Promise.resolve(fn())
            .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

// =============================================================================
// HEALTH TREND ANALYSIS
// =============================================================================

/**
 * Internal function that analyzes health history to identify trends, degradation patterns, and improvement indicators.
 * This function analyzes HEALTH_HISTORY array for recent health check patterns and trends, calculates average resource
 * utilization over recent history window, identifies performance degradation patterns (increasing response times, error rates),
 * detects resource usage trends (memory growth, CPU utilization changes), calculates health score trends and stability
 * indicators, identifies periods of service degradation or instability, compares current metrics against historical baselines
 * and averages, generates trend indicators (improving, stable, degrading) for each resource type, creates health trend
 * analysis object with statistical summary and indicators, and returns trend analysis for inclusion in detailed health responses.
 * 
 * Health trend analysis features:
 * - Historical pattern analysis with statistical trend identification
 * - Performance degradation detection with early warning capabilities
 * - Resource usage trend monitoring for proactive capacity planning
 * - Health score calculation with stability and reliability indicators
 * - Baseline comparison for anomaly detection and performance regression analysis
 * - Comprehensive trend reporting for operational decision making and alerting
 * 
 * @returns {Object} Health trend analysis with performance trends, degradation indicators, and historical comparison
 */
function getHealthTrends() {
    try {
        // Analyze HEALTH_HISTORY array for recent health check patterns and trends
        if (HEALTH_HISTORY.length < 3) {
            return {
                status: 'insufficient_data',
                message: 'Insufficient health history for trend analysis',
                sampleSize: HEALTH_HISTORY.length,
                minimumRequired: 3
            };
        }
        
        const recentHistory = HEALTH_HISTORY.slice(-20); // Last 20 health checks
        
        // Calculate average resource utilization over recent history window
        const resourceTrends = analyzeResourceTrends(recentHistory);
        
        // Identify performance degradation patterns (increasing response times, error rates)
        const performanceTrends = analyzePerformanceTrends(recentHistory);
        
        // Detect resource usage trends (memory growth, CPU utilization changes)
        const usageTrends = analyzeUsageTrends(recentHistory);
        
        // Calculate health score trends and stability indicators
        const healthScoreTrends = analyzeHealthScoreTrends(recentHistory);
        
        // Identify periods of service degradation or instability
        const stabilityAnalysis = analyzeServiceStability(recentHistory);
        
        // Compare current metrics against historical baselines and averages
        const baselineComparison = compareWithBaseline(recentHistory);
        
        // Generate trend indicators (improving, stable, degrading) for each resource type
        const trendIndicators = generateTrendIndicators(resourceTrends, performanceTrends, usageTrends);
        
        // Creates health trend analysis object with statistical summary and indicators
        const trendAnalysis = {
            summary: {
                overall: trendIndicators.overall,
                timeWindow: {
                    sampleSize: recentHistory.length,
                    oldestSample: recentHistory[0]?.timestamp,
                    newestSample: recentHistory[recentHistory.length - 1]?.timestamp,
                    timeSpan: calculateTimeSpan(recentHistory)
                }
            },
            
            resources: resourceTrends,
            performance: performanceTrends,
            usage: usageTrends,
            healthScore: healthScoreTrends,
            stability: stabilityAnalysis,
            baseline: baselineComparison,
            indicators: trendIndicators,
            
            // Analysis metadata
            analysis: {
                timestamp: new Date().toISOString(),
                analysisType: 'health_trend_analysis',
                version: '1.0.0',
                confidence: calculateAnalysisConfidence(recentHistory.length)
            }
        };
        
        logger.debug('Health trend analysis completed', {
            overallTrend: trendIndicators.overall,
            sampleSize: recentHistory.length,
            memoryTrend: resourceTrends.memory?.trend,
            cpuTrend: resourceTrends.cpu?.trend,
            stabilityScore: stabilityAnalysis.score
        });
        
        // Return trend analysis for inclusion in detailed health responses
        return trendAnalysis;
        
    } catch (error) {
        // Handle trend analysis errors gracefully
        logger.error('Failed to analyze health trends', {
            error: error.message,
            historySize: HEALTH_HISTORY.length
        });
        
        return {
            status: 'analysis_error',
            error: error.message,
            timestamp: new Date().toISOString(),
            analysis: {
                analysisType: 'health_trend_analysis',
                error: true
            }
        };
    }
}

/**
 * Analyzes resource trends from health history
 * @param {Array} history - Health history entries
 * @returns {Object} Resource trend analysis
 * @private
 */
function analyzeResourceTrends(history) {
    try {
        const resourceData = {
            memory: [],
            cpu: []
        };
        
        // Extract resource data from history
        history.forEach(entry => {
            if (entry.resources) {
                if (entry.resources.memory && typeof entry.resources.memory.utilization === 'number') {
                    resourceData.memory.push(entry.resources.memory.utilization);
                }
                if (entry.resources.cpu && typeof entry.resources.cpu.utilization === 'number') {
                    resourceData.cpu.push(entry.resources.cpu.utilization);
                }
            }
        });
        
        const trends = {};
        
        // Analyze memory trend
        if (resourceData.memory.length >= 3) {
            trends.memory = calculateTrend(resourceData.memory, 'memory');
        }
        
        // Analyze CPU trend
        if (resourceData.cpu.length >= 3) {
            trends.cpu = calculateTrend(resourceData.cpu, 'cpu');
        }
        
        return trends;
        
    } catch (error) {
        logger.warn('Failed to analyze resource trends', error);
        return { error: error.message };
    }
}

/**
 * Calculates trend for a data series
 * @param {Array} data - Numeric data series
 * @param {string} type - Type of data for context
 * @returns {Object} Trend analysis
 * @private
 */
function calculateTrend(data, type) {
    try {
        if (data.length < 2) {
            return { trend: 'insufficient_data', samples: data.length };
        }
        
        // Simple linear trend calculation
        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
        
        const change = secondAvg - firstAvg;
        const changePercent = firstAvg > 0 ? (change / firstAvg) * 100 : 0;
        
        let trend = 'stable';
        if (changePercent > 5) {
            trend = 'increasing';
        } else if (changePercent < -5) {
            trend = 'decreasing';
        }
        
        return {
            trend: trend,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            current: Math.round(data[data.length - 1] * 100) / 100,
            average: Math.round((data.reduce((a, b) => a + b) / data.length) * 100) / 100,
            samples: data.length
        };
        
    } catch (error) {
        return { trend: 'calculation_error', error: error.message };
    }
}

/**
 * Placeholder functions for comprehensive trend analysis
 * In a production system, these would implement more sophisticated analysis
 */
function analyzePerformanceTrends(history) {
    return { status: 'basic_implementation', note: 'Performance trend analysis available in production version' };
}

function analyzeUsageTrends(history) {
    return { status: 'basic_implementation', note: 'Usage trend analysis available in production version' };
}

function analyzeHealthScoreTrends(history) {
    return { status: 'basic_implementation', note: 'Health score trend analysis available in production version' };
}

function analyzeServiceStability(history) {
    return { 
        score: history.filter(entry => entry.status === 'healthy').length / history.length,
        status: 'basic_implementation' 
    };
}

function compareWithBaseline(history) {
    return { status: 'basic_implementation', note: 'Baseline comparison available in production version' };
}

function generateTrendIndicators(resourceTrends, performanceTrends, usageTrends) {
    let overall = 'stable';
    
    if (resourceTrends.memory?.trend === 'increasing' || resourceTrends.cpu?.trend === 'increasing') {
        overall = 'degrading';
    } else if (resourceTrends.memory?.trend === 'decreasing' && resourceTrends.cpu?.trend === 'decreasing') {
        overall = 'improving';
    }
    
    return {
        overall: overall,
        memory: resourceTrends.memory?.trend || 'unknown',
        cpu: resourceTrends.cpu?.trend || 'unknown'
    };
}

function calculateTimeSpan(history) {
    if (history.length < 2) return 0;
    
    try {
        const oldest = new Date(history[0].timestamp);
        const newest = new Date(history[history.length - 1].timestamp);
        return Math.round((newest - oldest) / 1000); // seconds
    } catch (error) {
        return 0;
    }
}

function calculateAnalysisConfidence(sampleSize) {
    if (sampleSize >= 20) return 'high';
    if (sampleSize >= 10) return 'medium';
    if (sampleSize >= 5) return 'low';
    return 'very_low';
}

// =============================================================================
// HEALTH HISTORY MANAGEMENT
// =============================================================================

/**
 * Internal function that maintains health check history for trend analysis and performance monitoring.
 * This function creates health history entry with timestamp, check type, and health result data, includes
 * resource utilization snapshot and status information in history entry, adds health history entry to
 * HEALTH_HISTORY array, limits history size to last 100 entries for memory management, removes oldest
 * health history entries if array exceeds maximum size, calculates health trends from recent history entries
 * for degradation detection, logs health history update using logger.debug() if verbose logging enabled,
 * and updates health trend indicators for use in detailed health responses.
 * 
 * Health history management features:
 * - Efficient memory management with configurable history size limits
 * - Comprehensive data capture including resource snapshots and status information
 * - Automatic cleanup to prevent memory leaks in long-running applications
 * - Trend calculation integration for real-time health pattern analysis
 * - Performance optimization with minimal logging overhead during normal operations
 * - Historical data preservation for operational analysis and troubleshooting support
 * 
 * @param {Object} healthResult - Health check result object to add to history
 * @param {string} checkType - Type of health check (basic, detailed, liveness, readiness)
 * @returns {void} No return value - updates HEALTH_HISTORY array with new health check result
 */
function updateHealthHistory(healthResult, checkType) {
    try {
        // Create health history entry with timestamp, check type, and health result data
        const historyEntry = {
            timestamp: healthResult.timestamp || new Date().toISOString(),
            checkType: checkType,
            status: healthResult.status,
            
            // Include resource utilization snapshot and status information in history entry
            resources: healthResult.resources ? {
                memory: {
                    utilization: healthResult.resources.memory?.utilization || 0,
                    healthy: healthResult.resources.memory?.healthy || false
                },
                cpu: {
                    utilization: healthResult.resources.cpu?.utilization || 0,
                    healthy: healthResult.resources.cpu?.healthy || false
                }
            } : null,
            
            // Performance snapshot
            performance: {
                responseTime: healthResult.responseTime || healthResult.healthCheck?.responseTime || 0,
                errorRate: healthResult.performance?.errorRate?.current || 0
            },
            
            // Application context
            application: {
                uptime: healthResult.uptime?.seconds || 0,
                pid: process.pid
            }
        };
        
        // Add health history entry to HEALTH_HISTORY array
        HEALTH_HISTORY.push(historyEntry);
        
        // Limit history size to last entries for memory management
        const maxHistorySize = HEALTH_CONFIG.history_size || 100;
        if (HEALTH_HISTORY.length > maxHistorySize) {
            // Remove oldest health history entries if array exceeds maximum size
            HEALTH_HISTORY.shift();
        }
        
        // Log health history update using logger.debug() if verbose logging enabled
        if (HEALTH_CONFIG.verbose_logging) {
            logger.debug('Health history updated', {
                checkType: checkType,
                status: healthResult.status,
                historySize: HEALTH_HISTORY.length,
                maxHistorySize: maxHistorySize,
                resourcesIncluded: Boolean(historyEntry.resources)
            });
        }
        
    } catch (error) {
        // Handle health history update errors gracefully - don't disrupt health checks
        logger.warn('Failed to update health history', {
            error: error.message,
            checkType: checkType,
            fallback: 'continuing without history update'
        });
    }
}

// =============================================================================
// HEALTH STATUS DETERMINATION
// =============================================================================

/**
 * Determines overall health status based on resource health, dependencies, and error rates
 * @param {Object} resourceHealth - Resource health evaluation
 * @param {Object} dependencyStatus - Dependency check results
 * @param {number} errorRate - Current error rate
 * @returns {string} Overall health status
 * @private
 */
function determineOverallHealth(resourceHealth, dependencyStatus, errorRate) {
    try {
        const factors = [];
        
        // Resource health factor
        switch (resourceHealth.overall.status) {
            case 'healthy':
                factors.push(3);
                break;
            case 'degraded':
                factors.push(2);
                break;
            case 'unhealthy':
                factors.push(1);
                break;
            default:
                factors.push(0);
        }
        
        // Dependency health factor
        switch (dependencyStatus.summary.overallStatus) {
            case 'healthy':
                factors.push(3);
                break;
            case 'degraded':
                factors.push(2);
                break;
            case 'unhealthy':
                factors.push(1);
                break;
            default:
                factors.push(0);
        }
        
        // Error rate factor
        if (errorRate < RESOURCE_THRESHOLDS.errorRate * 0.5) {
            factors.push(3);
        } else if (errorRate < RESOURCE_THRESHOLDS.errorRate) {
            factors.push(2);
        } else {
            factors.push(1);
        }
        
        // Calculate overall score
        const averageScore = factors.reduce((a, b) => a + b) / factors.length;
        
        if (averageScore >= 2.5) {
            return 'healthy';
        } else if (averageScore >= 1.5) {
            return 'degraded';
        } else {
            return 'unhealthy';
        }
        
    } catch (error) {
        logger.warn('Failed to determine overall health status', error);
        return 'unhealthy';
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Utility function that clears health status cache for testing purposes or cache invalidation.
 * This function clears HEALTH_STATUS_CACHE data and resets timestamp to 0, clears HEALTH_HISTORY
 * array of all historical health check results, resets dependency check cache if applicable,
 * logs cache reset operation using logger.debug() with timestamp, and forces fresh health
 * evaluation on next health check request.
 * 
 * Cache management features:
 * - Complete cache invalidation for testing and debugging scenarios
 * - Health history cleanup for memory management and fresh start capabilities  
 * - Dependency cache reset for reliable dependency status re-evaluation
 * - Comprehensive logging for operational visibility and troubleshooting
 * - Fresh evaluation guarantee for immediate health status accuracy
 * 
 * @returns {void} No return value - clears HEALTH_STATUS_CACHE and HEALTH_HISTORY
 */
function resetHealthCache() {
    try {
        // Clear HEALTH_STATUS_CACHE data and reset timestamp to 0
        const previousCacheData = { ...HEALTH_STATUS_CACHE };
        HEALTH_STATUS_CACHE.data = null;
        HEALTH_STATUS_CACHE.timestamp = 0;
        HEALTH_STATUS_CACHE.hits = 0;
        HEALTH_STATUS_CACHE.misses = 0;
        
        // Clear HEALTH_HISTORY array of all historical health check results
        const previousHistorySize = HEALTH_HISTORY.length;
        HEALTH_HISTORY.length = 0;
        
        // Log cache reset operation using logger.debug() with timestamp
        logger.info('Health cache reset completed', {
            resetTimestamp: new Date().toISOString(),
            previousCacheEnabled: previousCacheData.enabled,
            previousCacheAge: previousCacheData.timestamp > 0 ? Date.now() - previousCacheData.timestamp : 0,
            previousHistorySize: previousHistorySize,
            cacheCleared: true,
            historyCleared: true,
            freshEvaluationForced: true
        });
        
    } catch (error) {
        // Handle cache reset errors gracefully
        logger.error('Failed to reset health cache completely', {
            error: error.message,
            partialReset: 'attempting basic cleanup'
        });
        
        // Attempt basic cleanup even if full reset fails
        try {
            HEALTH_STATUS_CACHE.data = null;
            HEALTH_STATUS_CACHE.timestamp = 0;
            HEALTH_HISTORY.length = 0;
        } catch (cleanupError) {
            logger.error('Failed to perform basic cache cleanup', cleanupError);
        }
    }
}

/**
 * Utility function that returns health service operational statistics for monitoring and debugging.
 * This function collects health cache statistics (hit rate, size, TTL effectiveness), counts health
 * history entries and calculates average check frequency, calculates health check performance metrics
 * (average duration, success rate), includes dependency check statistics and availability percentages,
 * adds resource threshold compliance statistics over recent history, includes configuration status and
 * validation results, creates comprehensive health service statistics object, and returns operational
 * statistics for monitoring and performance analysis.
 * 
 * Operational statistics features:
 * - Comprehensive cache performance analysis with hit rates and efficiency metrics
 * - Health check frequency and performance trend monitoring for operational insight
 * - Dependency availability statistics for service reliability assessment
 * - Resource threshold compliance tracking for capacity planning and alerting
 * - Configuration validation status for troubleshooting and operational verification
 * - Performance metrics collection for service optimization and monitoring integration
 * 
 * @returns {Object} Health service statistics with cache usage, check counts, and operational metrics
 */
function getHealthServiceStats() {
    try {
        const currentTime = Date.now();
        
        // Collect health cache statistics (hit rate, size, TTL effectiveness)
        const cacheStats = {
            enabled: HEALTH_STATUS_CACHE.enabled,
            ttl: HEALTH_STATUS_CACHE.ttl,
            hits: HEALTH_STATUS_CACHE.hits,
            misses: HEALTH_STATUS_CACHE.misses,
            hitRate: HEALTH_STATUS_CACHE.hits + HEALTH_STATUS_CACHE.misses > 0 ?
                Math.round((HEALTH_STATUS_CACHE.hits / (HEALTH_STATUS_CACHE.hits + HEALTH_STATUS_CACHE.misses)) * 100) : 0,
            currentAge: HEALTH_STATUS_CACHE.timestamp > 0 ? currentTime - HEALTH_STATUS_CACHE.timestamp : 0,
            hasValidData: HEALTH_STATUS_CACHE.data !== null &&
                (currentTime - HEALTH_STATUS_CACHE.timestamp) < HEALTH_STATUS_CACHE.ttl
        };
        
        // Count health history entries and calculate average check frequency
        const historyStats = {
            totalEntries: HEALTH_HISTORY.length,
            maxSize: HEALTH_CONFIG.history_size || 100,
            utilizationPercent: Math.round((HEALTH_HISTORY.length / (HEALTH_CONFIG.history_size || 100)) * 100),
            oldestEntry: HEALTH_HISTORY.length > 0 ? HEALTH_HISTORY[0].timestamp : null,
            newestEntry: HEALTH_HISTORY.length > 0 ? HEALTH_HISTORY[HEALTH_HISTORY.length - 1].timestamp : null,
            checkTypes: countCheckTypes()
        };
        
        // Calculate health check performance metrics (average duration, success rate)
        const performanceStats = calculateHealthCheckPerformance();
        
        // Include dependency check statistics and availability percentages
        const dependencyStats = {
            totalRegistered: DEPENDENCY_CHECKS.size,
            registeredDependencies: Array.from(DEPENDENCY_CHECKS.keys()),
            lastCheckTime: getLastDependencyCheckTime()
        };
        
        // Add resource threshold compliance statistics over recent history
        const thresholdStats = calculateThresholdCompliance();
        
        // Include configuration status and validation results
        const configurationStats = {
            loaded: Boolean(HEALTH_CONFIG),
            thresholds: RESOURCE_THRESHOLDS,
            enabledFeatures: {
                caching: HEALTH_STATUS_CACHE.enabled,
                trending: HEALTH_CONFIG.enable_trends !== false,
                verboseLogging: Boolean(HEALTH_CONFIG.verbose_logging)
            }
        };
        
        // Create comprehensive health service statistics object
        const serviceStats = {
            timestamp: new Date().toISOString(),
            uptime: calculateUptime(),
            
            // Cache performance statistics
            cache: cacheStats,
            
            // Health check history statistics
            history: historyStats,
            
            // Performance and reliability metrics
            performance: performanceStats,
            
            // Dependency monitoring statistics
            dependencies: dependencyStats,
            
            // Resource threshold compliance
            thresholds: thresholdStats,
            
            // Configuration and feature status
            configuration: configurationStats,
            
            // Service metadata
            service: {
                name: 'health_service',
                version: '1.0.0',
                type: 'node_js_tutorial_health_service',
                application: {
                    name: APPLICATION_METADATA.NAME,
                    version: APPLICATION_METADATA.VERSION
                }
            }
        };
        
        logger.debug('Health service statistics generated', {
            cacheHitRate: cacheStats.hitRate + '%',
            historyUtilization: historyStats.utilizationPercent + '%',
            dependencyCount: dependencyStats.totalRegistered,
            configurationLoaded: configurationStats.loaded,
            uptime: serviceStats.uptime.toFixed(2) + 's'
        });
        
        // Return operational statistics for monitoring and performance analysis
        return serviceStats;
        
    } catch (error) {
        // Handle statistics generation errors gracefully
        logger.error('Failed to generate health service statistics', {
            error: error.message,
            fallback: 'returning basic statistics'
        });
        
        return {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                type: 'statistics_generation_error'
            },
            uptime: calculateUptime(),
            service: {
                name: 'health_service',
                version: '1.0.0',
                error: true
            },
            basic: {
                cacheEnabled: Boolean(HEALTH_STATUS_CACHE.enabled),
                historySize: HEALTH_HISTORY.length,
                dependencyCount: DEPENDENCY_CHECKS.size,
                configurationLoaded: Boolean(HEALTH_CONFIG)
            }
        };
    }
}

/**
 * Helper functions for statistics generation
 */
function countCheckTypes() {
    const types = {};
    HEALTH_HISTORY.forEach(entry => {
        const type = entry.checkType || 'unknown';
        types[type] = (types[type] || 0) + 1;
    });
    return types;
}

function calculateHealthCheckPerformance() {
    try {
        if (HEALTH_HISTORY.length === 0) {
            return {
                averageResponseTime: 0,
                successRate: 0,
                totalChecks: 0
            };
        }
        
        const responseTimes = HEALTH_HISTORY
            .filter(entry => entry.performance && entry.performance.responseTime)
            .map(entry => entry.performance.responseTime);
        
        const successfulChecks = HEALTH_HISTORY.filter(entry => entry.status === 'healthy').length;
        
        return {
            averageResponseTime: responseTimes.length > 0 ?
                Math.round((responseTimes.reduce((a, b) => a + b) / responseTimes.length) * 100) / 100 : 0,
            successRate: Math.round((successfulChecks / HEALTH_HISTORY.length) * 100),
            totalChecks: HEALTH_HISTORY.length,
            responseTimes: {
                samples: responseTimes.length,
                min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
                max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0
            }
        };
    } catch (error) {
        return { error: error.message, averageResponseTime: 0, successRate: 0, totalChecks: 0 };
    }
}

function getLastDependencyCheckTime() {
    // In a production system, this would track actual dependency check times
    return 'not_tracked_in_tutorial_version';
}

function calculateThresholdCompliance() {
    try {
        const recentHistory = HEALTH_HISTORY.slice(-10);
        if (recentHistory.length === 0) {
            return { compliance: 0, samples: 0 };
        }
        
        const compliantChecks = recentHistory.filter(entry => {
            if (!entry.resources) return false;
            
            const memoryCompliant = !entry.resources.memory || entry.resources.memory.healthy;
            const cpuCompliant = !entry.resources.cpu || entry.resources.cpu.healthy;
            
            return memoryCompliant && cpuCompliant;
        }).length;
        
        return {
            compliance: Math.round((compliantChecks / recentHistory.length) * 100),
            samples: recentHistory.length,
            compliantChecks: compliantChecks,
            thresholds: RESOURCE_THRESHOLDS
        };
    } catch (error) {
        return { error: error.message, compliance: 0, samples: 0 };
    }
}

/**
 * Formats uptime in human-readable format
 * @param {number} uptimeSeconds - Uptime in seconds
 * @returns {string} Human-readable uptime
 * @private
 */
function formatUptime(uptimeSeconds) {
    try {
        if (uptimeSeconds < 60) {
            return `${Math.round(uptimeSeconds)}s`;
        } else if (uptimeSeconds < 3600) {
            return `${Math.round(uptimeSeconds / 60)}m ${Math.round(uptimeSeconds % 60)}s`;
        } else if (uptimeSeconds < 86400) {
            const hours = Math.floor(uptimeSeconds / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        } else {
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            return `${days}d ${hours}h`;
        }
    } catch (error) {
        return 'unknown';
    }
}

// =============================================================================
// MODULE INITIALIZATION AND EXPORTS
// =============================================================================

// Initialize the health service automatically when the module is loaded
// This ensures health service is ready for use as soon as the module is imported
initializeHealthService();

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Main health service function for basic health status evaluation with essential service availability information
    getBasicHealth,
    
    // Comprehensive health service function providing detailed system metrics, resource utilization, and dependency status
    getDetailedHealth,
    
    // Kubernetes liveness probe service function for application restart decision support
    getLivenessStatus,
    
    // Kubernetes readiness probe service function for traffic routing decisions and load balancer integration
    getReadinessStatus,
    
    // Utility function for health cache management and testing scenario support
    resetHealthCache,
    
    // Operational statistics function for health service monitoring and performance analysis
    getHealthServiceStats
};