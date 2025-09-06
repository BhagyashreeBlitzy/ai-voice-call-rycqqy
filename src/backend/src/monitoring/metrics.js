/**
 * Core Metrics Collection Module for Node.js Tutorial Application
 * 
 * This module provides comprehensive system performance monitoring, request tracking, and health metrics 
 * for the Node.js tutorial application. It implements educational-focused monitoring patterns while 
 * demonstrating production-ready observability practices using Node.js built-in performance APIs, 
 * process monitoring, and HTTP request statistics with Express.js 5.1.0 and Node.js 22.x LTS integration.
 * 
 * Key Features:
 * - High-resolution timing using Node.js Performance API for HTTP request processing
 * - System metrics collection including CPU usage, memory statistics, and V8 heap information
 * - Health check metrics integration with response time targets under 50ms
 * - Request lifecycle tracking with performance counters and error rate calculation
 * - Memory usage trend analysis with configurable history retention for leak detection
 * - Educational design prioritizing code clarity while maintaining production monitoring patterns
 * - Caching strategies for performance optimization with configurable TTL settings
 * - Comprehensive error handling with graceful degradation for monitoring system failures
 * 
 * Architecture:
 * - Event-driven metrics collection with lazy initialization and performance-optimized caching
 * - Integration with health service for comprehensive health check responses
 * - Request middleware integration for automatic HTTP request performance tracking
 * - Node.js 22.x LTS compatibility with enhanced performance optimizations and security
 * - Production-ready error handling with fallback metrics when collection APIs fail
 * 
 * Compatible with:
 * - Express.js 5.1.0 with automatic promise error handling and enhanced async/await support
 * - Node.js 22.11.0 LTS with Active LTS support, improved performance, and security enhancements
 * - Development, production, and test environments with environment-specific configuration
 * 
 * @author Node.js Tutorial Team
 * @version 1.0.0
 * @since 2024
 * @educational_focus Node.js performance monitoring, system resource tracking, and HTTP request metrics
 */

// =============================================================================
// EXTERNAL DEPENDENCIES - NODE.JS BUILT-IN MODULES
// =============================================================================

// Node.js operating system utilities for CPU information, memory data, platform details, and system load metrics
const os = require('os'); // Node.js Built-in

// Node.js process information for memory usage, CPU usage, uptime, and process health monitoring
const process = require('process'); // Node.js Built-in

// Node.js Performance API for high-resolution timing measurement and performance mark/measure operations
const { performance } = require('perf_hooks'); // Node.js Built-in

// Node.js V8 engine utilities for heap statistics, garbage collection metrics, and memory management information
const v8 = require('v8'); // Node.js Built-in

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

// Import logging utilities for metrics collection debugging, performance logging, and operational information
const { logger } = require('../utils/logger.js');

// Import configuration factory to access monitoring settings, metric collection intervals, and performance thresholds
const { getConfig } = require('../utils/config.js');

// Import environment constants for environment-specific metrics collection behavior and performance monitoring
const { 
    ENVIRONMENTS 
} = require('../utils/constants.js');

// Import HTTP status constants for response categorization in request metrics and error rate calculations
const { 
    HTTP_STATUS 
} = require('../utils/constants.js');

// Import application metadata constants for including application context in metrics and health check integration
const { 
    APPLICATION_METADATA 
} = require('../utils/constants.js');

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

/**
 * Cached metrics configuration from environment-specific settings
 * Prevents repeated configuration loading and improves performance
 * @type {Object|null}
 */
let METRICS_CONFIG = null;

/**
 * Application startup timestamp for uptime calculations
 * Set during metrics initialization for accurate application uptime measurement
 * @type {number}
 */
let METRICS_START_TIME = Date.now();

/**
 * Active request tracking with performance timers and metadata
 * Uses Map for O(1) operations with request ID as key and timing data as value
 * @type {Map<string, Object>}
 */
const REQUEST_METRICS = new Map();

/**
 * Cached system metrics with 30-second TTL for performance optimization
 * Prevents excessive OS API calls while maintaining reasonably fresh metrics data
 * @type {Object}
 */
let SYSTEM_METRICS_CACHE = { 
    data: null, 
    timestamp: 0, 
    ttl: 30000 
};

/**
 * Performance counters for comprehensive request and response tracking
 * Tracks cumulative metrics across application lifecycle
 * @type {Object}
 */
let PERFORMANCE_COUNTERS = { 
    requests: 0, 
    responses: 0, 
    errors: 0, 
    totalResponseTime: 0 
};

/**
 * Sliding window error tracking for real-time error rate calculation
 * Implements 5-minute sliding window for accurate error rate monitoring
 * @type {Object}
 */
let ERROR_RATE_TRACKER = { 
    windowStart: Date.now(), 
    errorCount: 0, 
    totalRequests: 0 
};

/**
 * Recent memory usage samples for trend analysis and memory leak detection
 * Limited to 100 samples for memory efficiency while providing sufficient history
 * @type {Array<Object>}
 */
let MEMORY_USAGE_HISTORY = [];

// =============================================================================
// CORE METRICS INITIALIZATION
// =============================================================================

/**
 * Initializes the metrics collection system with configuration and sets up performance tracking.
 * This function loads application configuration using getConfig() and caches monitoring settings,
 * records application startup time for uptime calculations, initializes performance counters with
 * zero values, sets up error rate tracking window with current timestamp, initializes memory usage
 * history array for trend tracking, configures system metrics cache with TTL and initial state,
 * and logs metrics system initialization completion with configuration details.
 * 
 * The initialization process includes:
 * - Configuration loading with error handling and fallback to default settings
 * - Performance counter initialization with structured tracking objects
 * - Error rate tracking setup with sliding window algorithm implementation
 * - Memory usage history array initialization for trend analysis
 * - System metrics cache configuration with TTL-based invalidation
 * - Comprehensive logging of initialization completion with operational details
 * 
 * This function implements graceful degradation - if configuration loading fails,
 * it continues operation with basic metrics collection to ensure application startup succeeds.
 * 
 * @returns {void} No return value - initializes metrics collection state and configuration
 */
function initializeMetrics() {
    try {
        // Load application configuration using getConfig() and cache in METRICS_CONFIG for performance
        const config = getConfig();
        METRICS_CONFIG = config.monitoring || {};
        
        // Record application startup time in METRICS_START_TIME for uptime calculations
        METRICS_START_TIME = Date.now();
        
        // Initialize performance counters with zero values for clean starting state
        PERFORMANCE_COUNTERS = {
            requests: 0,
            responses: 0,
            errors: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            requestsPerSecond: 0,
            errorRate: 0,
            activeRequests: 0
        };
        
        // Set up error rate tracking window with current timestamp for sliding window algorithm
        ERROR_RATE_TRACKER = {
            windowStart: Date.now(),
            errorCount: 0,
            totalRequests: 0,
            windowSizeMs: METRICS_CONFIG.error_tracking_window || 300000, // 5 minutes default
            lastErrorTime: null,
            consecutiveErrors: 0
        };
        
        // Initialize memory usage history array for trend tracking with size limit
        MEMORY_USAGE_HISTORY = [];
        
        // Configure system metrics cache with TTL and initial empty state
        SYSTEM_METRICS_CACHE = {
            data: null,
            timestamp: 0,
            ttl: METRICS_CONFIG.cache_ttl || 30000, // 30 seconds default
            hitCount: 0,
            missCount: 0
        };
        
        // Clear REQUEST_METRICS Map to ensure clean state
        REQUEST_METRICS.clear();
        
        // Log metrics system initialization completion with configuration details
        logger.info('Metrics collection system initialized successfully', {
            startTime: METRICS_START_TIME,
            environment: METRICS_CONFIG.environment || process.env.NODE_ENV,
            cacheTtl: SYSTEM_METRICS_CACHE.ttl,
            errorTrackingWindow: ERROR_RATE_TRACKER.windowSizeMs,
            nodeVersion: process.version,
            platform: process.platform
        });
        
    } catch (error) {
        // Handle initialization errors gracefully - continue with basic metrics collection
        logger.error('Failed to initialize metrics system, using fallback configuration', error);
        
        // Set safe fallback values for continued operation
        METRICS_CONFIG = {
            cache_ttl: 30000,
            error_tracking_window: 300000,
            memory_history_size: 100,
            metrics_enabled: true
        };
        
        METRICS_START_TIME = Date.now();
        PERFORMANCE_COUNTERS = { requests: 0, responses: 0, errors: 0, totalResponseTime: 0 };
        ERROR_RATE_TRACKER = { windowStart: Date.now(), errorCount: 0, totalRequests: 0 };
        MEMORY_USAGE_HISTORY = [];
        REQUEST_METRICS.clear();
    }
}

// =============================================================================
// UPTIME AND TIMING CALCULATIONS
// =============================================================================

/**
 * Calculates application uptime in seconds from the recorded startup time.
 * This function gets current timestamp using Date.now(), calculates difference from
 * METRICS_START_TIME global, converts milliseconds to seconds for standard uptime format,
 * and returns calculated uptime with precision to milliseconds for accurate measurement.
 * 
 * Uptime calculation features:
 * - High-precision timing using millisecond-accurate timestamps
 * - Conversion to seconds with decimal precision for standard uptime reporting
 * - Consistent baseline using METRICS_START_TIME for accurate measurement
 * - Error handling for invalid start time scenarios
 * 
 * @returns {number} Application uptime in seconds since initialization with decimal precision
 */
function calculateUptime() {
    try {
        // Get current timestamp using Date.now() for precise current time
        const currentTime = Date.now();
        
        // Calculate difference from METRICS_START_TIME global for uptime measurement
        const uptimeMs = currentTime - METRICS_START_TIME;
        
        // Convert milliseconds to seconds for standard uptime format with precision
        const uptimeSeconds = uptimeMs / 1000;
        
        // Return calculated uptime with precision to milliseconds
        return Math.max(0, uptimeSeconds); // Ensure non-negative result
        
    } catch (error) {
        // Handle uptime calculation errors gracefully - log error and return 0
        logger.warn('Failed to calculate application uptime', {
            error: error.message,
            startTime: METRICS_START_TIME,
            currentTime: Date.now()
        });
        
        return 0;
    }
}

// =============================================================================
// SYSTEM METRICS COLLECTION
// =============================================================================

/**
 * Collects comprehensive system metrics including CPU, memory, load, and process information with caching for performance.
 * This function checks SYSTEM_METRICS_CACHE for valid cached data within TTL, returns cached metrics if available
 * and not expired, collects CPU usage information using os.cpus() and process.cpuUsage(), calculates CPU utilization
 * percentage from process CPU usage data, gathers memory statistics using process.memoryUsage() and os.totalmem()/freemem(),
 * gets system load average using os.loadavg(), collects V8 heap statistics using v8.getHeapStatistics(),
 * calculates memory usage percentages and trends, gets platform information, creates comprehensive system metrics object,
 * updates SYSTEM_METRICS_CACHE with new data and timestamp, and returns system metrics with performance and resource information.
 * 
 * System metrics collection includes:
 * - CPU usage percentage and load average monitoring with multi-core awareness
 * - Memory usage tracking with heap statistics and system memory information
 * - Process information including uptime, PID, and resource consumption
 * - Platform information for environment-specific monitoring and debugging
 * - V8 engine metrics including garbage collection and heap utilization
 * - Performance-optimized caching to reduce OS API call overhead
 * 
 * @returns {Object} System metrics object with CPU usage, memory statistics, load average, and process information
 */
function getSystemMetrics() {
    try {
        // Check SYSTEM_METRICS_CACHE for valid cached data within TTL
        const currentTime = Date.now();
        const cacheAge = currentTime - SYSTEM_METRICS_CACHE.timestamp;
        
        if (SYSTEM_METRICS_CACHE.data && cacheAge < SYSTEM_METRICS_CACHE.ttl) {
            // Return cached metrics if available and not expired for performance
            SYSTEM_METRICS_CACHE.hitCount++;
            
            logger.debug('Returning cached system metrics', {
                cacheAge: cacheAge,
                cacheHits: SYSTEM_METRICS_CACHE.hitCount,
                cacheMisses: SYSTEM_METRICS_CACHE.missCount
            });
            
            return SYSTEM_METRICS_CACHE.data;
        }
        
        SYSTEM_METRICS_CACHE.missCount++;
        
        // Collect CPU usage information using os.cpus() and process.cpuUsage()
        const cpus = os.cpus();
        const cpuUsage = process.cpuUsage();
        
        // Calculate CPU utilization percentage from process CPU usage data
        const cpuInfo = {
            count: cpus.length,
            model: cpus[0] ? cpus[0].model : 'Unknown',
            speed: cpus[0] ? cpus[0].speed : 0,
            usage: {
                user: cpuUsage.user / 1000000, // Convert microseconds to seconds
                system: cpuUsage.system / 1000000,
                total: (cpuUsage.user + cpuUsage.system) / 1000000
            },
            loadAverage: os.loadavg() // 1, 5, and 15 minute load averages
        };
        
        // Gather memory statistics using process.memoryUsage() and os.totalmem()/freemem()
        const processMemory = process.memoryUsage();
        const systemMemory = {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        };
        
        // Calculate memory usage percentages and trends
        const memoryInfo = {
            process: {
                rss: processMemory.rss, // Resident Set Size
                heapTotal: processMemory.heapTotal,
                heapUsed: processMemory.heapUsed,
                external: processMemory.external,
                arrayBuffers: processMemory.arrayBuffers,
                heapUtilization: (processMemory.heapUsed / processMemory.heapTotal) * 100
            },
            system: {
                total: systemMemory.total,
                free: systemMemory.free,
                used: systemMemory.used,
                utilization: (systemMemory.used / systemMemory.total) * 100
            }
        };
        
        // Collect V8 heap statistics using v8.getHeapStatistics()
        let v8Stats = null;
        try {
            v8Stats = v8.getHeapStatistics();
        } catch (v8Error) {
            logger.warn('Failed to collect V8 heap statistics', v8Error);
            v8Stats = {
                total_heap_size: 0,
                used_heap_size: 0,
                heap_size_limit: 0,
                malloced_memory: 0,
                peak_malloced_memory: 0
            };
        }
        
        // Get platform information using os.platform() and os.arch()
        const platformInfo = {
            platform: os.platform(),
            architecture: os.arch(),
            hostname: os.hostname(),
            release: os.release(),
            nodeVersion: process.version,
            pid: process.pid,
            uptime: process.uptime()
        };
        
        // Create comprehensive system metrics object with all collected information
        const systemMetrics = {
            timestamp: currentTime,
            cpu: cpuInfo,
            memory: memoryInfo,
            v8: {
                totalHeapSize: v8Stats.total_heap_size,
                usedHeapSize: v8Stats.used_heap_size,
                heapSizeLimit: v8Stats.heap_size_limit,
                mallocedMemory: v8Stats.malloced_memory,
                peakMallocedMemory: v8Stats.peak_malloced_memory,
                heapUtilization: v8Stats.total_heap_size > 0 ? 
                    (v8Stats.used_heap_size / v8Stats.total_heap_size) * 100 : 0
            },
            platform: platformInfo,
            uptime: calculateUptime(),
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                environment: process.env.NODE_ENV || 'development'
            }
        };
        
        // Update SYSTEM_METRICS_CACHE with new data and timestamp for future requests
        SYSTEM_METRICS_CACHE.data = systemMetrics;
        SYSTEM_METRICS_CACHE.timestamp = currentTime;
        
        logger.debug('Collected fresh system metrics', {
            cpuCount: cpuInfo.count,
            memoryUsage: memoryInfo.system.utilization.toFixed(2) + '%',
            heapUtilization: memoryInfo.process.heapUtilization.toFixed(2) + '%',
            uptime: systemMetrics.uptime.toFixed(2) + 's'
        });
        
        // Return system metrics with performance and resource information
        return systemMetrics;
        
    } catch (error) {
        // Handle system metrics collection errors gracefully with fallback data
        logger.error('Failed to collect system metrics, returning fallback data', error);
        
        // Return minimal fallback metrics to prevent application disruption
        return {
            timestamp: Date.now(),
            error: true,
            errorMessage: error.message,
            cpu: { count: 0, usage: { total: 0 }, loadAverage: [0, 0, 0] },
            memory: { 
                process: { rss: 0, heapTotal: 0, heapUsed: 0, heapUtilization: 0 },
                system: { total: 0, free: 0, used: 0, utilization: 0 }
            },
            v8: { totalHeapSize: 0, usedHeapSize: 0, heapUtilization: 0 },
            platform: { platform: process.platform, pid: process.pid },
            uptime: calculateUptime(),
            application: { name: APPLICATION_METADATA.NAME, version: APPLICATION_METADATA.VERSION }
        };
    }
}

// =============================================================================
// HEALTH METRICS INTEGRATION
// =============================================================================

/**
 * Provides health-specific metrics for health check integration including resource thresholds and service availability.
 * This function gets current system metrics using getSystemMetrics(), calculates current error rate from ERROR_RATE_TRACKER
 * data, determines memory usage threshold compliance, checks CPU usage against threshold, calculates average response time
 * from PERFORMANCE_COUNTERS, assesses system resource health status, includes uptime information using calculateUptime(),
 * adds request throughput and performance indicators, creates health-focused metrics object for health service integration,
 * and returns comprehensive health metrics with threshold compliance information.
 * 
 * Health metrics features:
 * - Resource threshold compliance monitoring with configurable limits
 * - Service availability indicators based on system resource utilization
 * - Performance trend analysis and degradation detection with historical comparison
 * - Memory leak detection through usage history analysis and trending
 * - Error rate monitoring with sliding window algorithm for accuracy
 * - Integration with health check endpoints for comprehensive service health reporting
 * 
 * @returns {Object} Health metrics object with resource usage, error rates, and service availability indicators
 */
function getHealthMetrics() {
    try {
        // Get current system metrics using getSystemMetrics() for resource information
        const systemMetrics = getSystemMetrics();
        
        // Calculate current error rate from ERROR_RATE_TRACKER data using sliding window
        const currentErrorRate = calculateErrorRate(ERROR_RATE_TRACKER.windowSizeMs);
        
        // Determine memory usage threshold compliance (default 100MB for process RSS)
        const memoryThresholds = {
            processRssLimit: METRICS_CONFIG.memory_rss_limit || 104857600, // 100MB default
            heapUtilizationLimit: METRICS_CONFIG.heap_utilization_limit || 85, // 85% default
            systemMemoryLimit: METRICS_CONFIG.system_memory_limit || 90 // 90% default
        };
        
        const memoryHealth = {
            processRssHealthy: systemMetrics.memory.process.rss < memoryThresholds.processRssLimit,
            heapUtilizationHealthy: systemMetrics.memory.process.heapUtilization < memoryThresholds.heapUtilizationLimit,
            systemMemoryHealthy: systemMetrics.memory.system.utilization < memoryThresholds.systemMemoryLimit,
            processRssMB: Math.round(systemMetrics.memory.process.rss / 1048576),
            heapUtilization: systemMetrics.memory.process.heapUtilization,
            systemUtilization: systemMetrics.memory.system.utilization
        };
        
        // Check CPU usage against threshold (default 80%)
        const cpuThreshold = METRICS_CONFIG.cpu_usage_limit || 80;
        const cpuLoadThreshold = METRICS_CONFIG.cpu_load_threshold || 2.0;
        
        const cpuHealth = {
            usageHealthy: systemMetrics.cpu.usage.total < (cpuThreshold / 100),
            loadHealthy: systemMetrics.cpu.loadAverage[0] < cpuLoadThreshold,
            currentUsage: systemMetrics.cpu.usage.total * 100,
            loadAverage1Min: systemMetrics.cpu.loadAverage[0],
            loadAverage5Min: systemMetrics.cpu.loadAverage[1],
            loadAverage15Min: systemMetrics.cpu.loadAverage[2]
        };
        
        // Calculate average response time from PERFORMANCE_COUNTERS
        const averageResponseTime = PERFORMANCE_COUNTERS.responses > 0 ?
            PERFORMANCE_COUNTERS.totalResponseTime / PERFORMANCE_COUNTERS.responses : 0;
        
        // Performance thresholds for health assessment
        const performanceThresholds = {
            responseTimeLimit: METRICS_CONFIG.response_time_limit || 50, // 50ms default
            errorRateLimit: METRICS_CONFIG.error_rate_limit || 5, // 5% default
            requestRateLimit: METRICS_CONFIG.request_rate_limit || 1000 // 1000 req/min default
        };
        
        const performanceHealth = {
            responseTimeHealthy: averageResponseTime < performanceThresholds.responseTimeLimit,
            errorRateHealthy: currentErrorRate < performanceThresholds.errorRateLimit,
            averageResponseTime: Math.round(averageResponseTime * 100) / 100,
            currentErrorRate: Math.round(currentErrorRate * 100) / 100
        };
        
        // Assess system resource health status (healthy/degraded/unhealthy)
        const healthyComponents = [
            memoryHealth.processRssHealthy,
            memoryHealth.heapUtilizationHealthy,
            memoryHealth.systemMemoryHealthy,
            cpuHealth.usageHealthy,
            cpuHealth.loadHealthy,
            performanceHealth.responseTimeHealthy,
            performanceHealth.errorRateHealthy
        ];
        
        const healthyCount = healthyComponents.filter(Boolean).length;
        const totalComponents = healthyComponents.length;
        
        let overallHealthStatus;
        if (healthyCount === totalComponents) {
            overallHealthStatus = 'healthy';
        } else if (healthyCount >= totalComponents * 0.7) {
            overallHealthStatus = 'degraded';
        } else {
            overallHealthStatus = 'unhealthy';
        }
        
        // Include uptime information using calculateUptime()
        const currentUptime = calculateUptime();
        
        // Add request throughput and performance indicators
        const throughputMetrics = {
            totalRequests: PERFORMANCE_COUNTERS.requests,
            totalResponses: PERFORMANCE_COUNTERS.responses,
            totalErrors: PERFORMANCE_COUNTERS.errors,
            activeRequests: REQUEST_METRICS.size,
            requestsPerSecond: currentUptime > 0 ? PERFORMANCE_COUNTERS.requests / currentUptime : 0
        };
        
        // Create health-focused metrics object for health service integration
        const healthMetrics = {
            timestamp: Date.now(),
            status: overallHealthStatus,
            uptime: currentUptime,
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                environment: process.env.NODE_ENV || 'development',
                pid: process.pid
            },
            resources: {
                memory: memoryHealth,
                cpu: cpuHealth,
                thresholds: {
                    memory: memoryThresholds,
                    cpu: { usage: cpuThreshold, load: cpuLoadThreshold },
                    performance: performanceThresholds
                }
            },
            performance: {
                ...performanceHealth,
                throughput: throughputMetrics
            },
            health_summary: {
                overall: overallHealthStatus,
                components_healthy: healthyCount,
                components_total: totalComponents,
                health_percentage: Math.round((healthyCount / totalComponents) * 100)
            }
        };
        
        logger.debug('Generated health metrics', {
            status: overallHealthStatus,
            healthPercentage: healthMetrics.health_summary.health_percentage,
            memoryHealthy: memoryHealth.processRssHealthy,
            cpuHealthy: cpuHealth.usageHealthy,
            performanceHealthy: performanceHealth.responseTimeHealthy
        });
        
        // Return comprehensive health metrics with threshold compliance
        return healthMetrics;
        
    } catch (error) {
        // Handle health metrics generation errors gracefully with degraded health status
        logger.error('Failed to generate health metrics, returning degraded status', error);
        
        return {
            timestamp: Date.now(),
            status: 'unhealthy',
            error: true,
            errorMessage: error.message,
            uptime: calculateUptime(),
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                pid: process.pid
            },
            health_summary: {
                overall: 'unhealthy',
                components_healthy: 0,
                components_total: 1,
                health_percentage: 0
            }
        };
    }
}

// =============================================================================
// REQUEST METRICS AND PERFORMANCE TRACKING
// =============================================================================

/**
 * Provides HTTP request performance metrics including response times, throughput, and error statistics.
 * This function extracts performance data from PERFORMANCE_COUNTERS global, calculates average response time
 * from total response time and request count, computes requests per second based on uptime and total requests,
 * calculates error rate percentage from error count and total requests, gets current active requests count
 * from REQUEST_METRICS Map size, calculates response time percentiles if sample data available, includes HTTP
 * status code distribution from tracked requests, adds throughput metrics and performance trends, creates
 * comprehensive request performance metrics object, and returns request metrics with performance and error statistics.
 * 
 * Request metrics features:
 * - HTTP request response time measurement with high precision timing
 * - Request throughput calculation and performance trend analysis
 * - Error rate tracking with sliding window algorithm for accuracy
 * - Active request monitoring and concurrency tracking for load analysis
 * - Performance percentile calculation for response time distribution
 * - HTTP status code distribution analysis for error pattern identification
 * 
 * @returns {Object} Request metrics object with performance statistics, error rates, and throughput information
 */
function getRequestMetrics() {
    try {
        // Extract performance data from PERFORMANCE_COUNTERS global
        const counters = { ...PERFORMANCE_COUNTERS };
        
        // Calculate average response time from total response time and request count
        const averageResponseTime = counters.responses > 0 ?
            counters.totalResponseTime / counters.responses : 0;
        
        // Compute requests per second based on uptime and total requests
        const uptime = calculateUptime();
        const requestsPerSecond = uptime > 0 ? counters.requests / uptime : 0;
        
        // Calculate error rate percentage from error count and total requests
        const errorRate = counters.requests > 0 ?
            (counters.errors / counters.requests) * 100 : 0;
        
        // Get current active requests count from REQUEST_METRICS Map size
        const activeRequests = REQUEST_METRICS.size;
        
        // Calculate response time percentiles if sample data available
        const responseTimeStats = calculateResponseTimeStats();
        
        // Include HTTP status code distribution from tracked requests
        const statusCodeDistribution = calculateStatusCodeDistribution();
        
        // Add throughput metrics and performance trends
        const throughputMetrics = {
            requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
            responsesPerSecond: uptime > 0 ? counters.responses / uptime : 0,
            errorsPerSecond: uptime > 0 ? counters.errors / uptime : 0,
            completionRate: counters.requests > 0 ? (counters.responses / counters.requests) * 100 : 0
        };
        
        // Create comprehensive request performance metrics object
        const requestMetrics = {
            timestamp: Date.now(),
            counters: {
                totalRequests: counters.requests,
                totalResponses: counters.responses,
                totalErrors: counters.errors,
                activeRequests: activeRequests
            },
            performance: {
                averageResponseTime: Math.round(averageResponseTime * 100) / 100,
                totalResponseTime: Math.round(counters.totalResponseTime * 100) / 100,
                errorRate: Math.round(errorRate * 100) / 100,
                ...responseTimeStats
            },
            throughput: throughputMetrics,
            distribution: {
                statusCodes: statusCodeDistribution,
                requestMethods: calculateMethodDistribution(),
                responseTimeRanges: calculateResponseTimeRanges()
            },
            uptime: uptime,
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                environment: process.env.NODE_ENV || 'development'
            }
        };
        
        logger.debug('Generated request metrics', {
            totalRequests: counters.requests,
            averageResponseTime: averageResponseTime.toFixed(2) + 'ms',
            errorRate: errorRate.toFixed(2) + '%',
            activeRequests: activeRequests,
            requestsPerSecond: requestsPerSecond.toFixed(2)
        });
        
        // Return request metrics with performance and error statistics
        return requestMetrics;
        
    } catch (error) {
        // Handle request metrics generation errors gracefully with fallback data
        logger.error('Failed to generate request metrics, returning fallback data', error);
        
        return {
            timestamp: Date.now(),
            error: true,
            errorMessage: error.message,
            counters: {
                totalRequests: PERFORMANCE_COUNTERS.requests || 0,
                totalResponses: PERFORMANCE_COUNTERS.responses || 0,
                totalErrors: PERFORMANCE_COUNTERS.errors || 0,
                activeRequests: REQUEST_METRICS.size
            },
            performance: {
                averageResponseTime: 0,
                errorRate: 0
            },
            throughput: {
                requestsPerSecond: 0,
                responsesPerSecond: 0,
                errorsPerSecond: 0
            },
            uptime: calculateUptime()
        };
    }
}

/**
 * Helper function to calculate response time statistics including percentiles
 * @returns {Object} Response time statistics with percentiles and distribution
 */
function calculateResponseTimeStats() {
    try {
        // Extract response times from active requests for statistical analysis
        const responseTimes = [];
        for (const [requestId, requestData] of REQUEST_METRICS) {
            if (requestData.responseTime && requestData.responseTime > 0) {
                responseTimes.push(requestData.responseTime);
            }
        }
        
        if (responseTimes.length === 0) {
            return {
                minResponseTime: 0,
                maxResponseTime: 0,
                p50ResponseTime: 0,
                p95ResponseTime: 0,
                p99ResponseTime: 0
            };
        }
        
        // Sort response times for percentile calculation
        responseTimes.sort((a, b) => a - b);
        
        const min = responseTimes[0];
        const max = responseTimes[responseTimes.length - 1];
        const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
        const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
        const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
        
        return {
            minResponseTime: Math.round(min * 100) / 100,
            maxResponseTime: Math.round(max * 100) / 100,
            p50ResponseTime: Math.round(p50 * 100) / 100,
            p95ResponseTime: Math.round(p95 * 100) / 100,
            p99ResponseTime: Math.round(p99 * 100) / 100,
            sampleSize: responseTimes.length
        };
        
    } catch (error) {
        logger.warn('Failed to calculate response time statistics', error);
        return { minResponseTime: 0, maxResponseTime: 0, p50ResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0 };
    }
}

/**
 * Helper function to calculate HTTP status code distribution
 * @returns {Object} Status code distribution with counts and percentages
 */
function calculateStatusCodeDistribution() {
    try {
        const statusCounts = {};
        let totalResponses = 0;
        
        for (const [requestId, requestData] of REQUEST_METRICS) {
            if (requestData.statusCode) {
                const statusCode = requestData.statusCode;
                statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1;
                totalResponses++;
            }
        }
        
        // Convert counts to percentages
        const distribution = {};
        for (const [statusCode, count] of Object.entries(statusCounts)) {
            distribution[statusCode] = {
                count: count,
                percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100 * 100) / 100 : 0
            };
        }
        
        return distribution;
        
    } catch (error) {
        logger.warn('Failed to calculate status code distribution', error);
        return {};
    }
}

/**
 * Helper function to calculate HTTP method distribution
 * @returns {Object} Method distribution with counts
 */
function calculateMethodDistribution() {
    try {
        const methodCounts = {};
        
        for (const [requestId, requestData] of REQUEST_METRICS) {
            if (requestData.method) {
                const method = requestData.method;
                methodCounts[method] = (methodCounts[method] || 0) + 1;
            }
        }
        
        return methodCounts;
        
    } catch (error) {
        logger.warn('Failed to calculate method distribution', error);
        return {};
    }
}

/**
 * Helper function to calculate response time ranges
 * @returns {Object} Response time range distribution
 */
function calculateResponseTimeRanges() {
    try {
        const ranges = {
            'under_10ms': 0,
            '10_50ms': 0,
            '50_100ms': 0,
            '100_500ms': 0,
            'over_500ms': 0
        };
        
        for (const [requestId, requestData] of REQUEST_METRICS) {
            if (requestData.responseTime && requestData.responseTime > 0) {
                const time = requestData.responseTime;
                if (time < 10) ranges['under_10ms']++;
                else if (time < 50) ranges['10_50ms']++;
                else if (time < 100) ranges['50_100ms']++;
                else if (time < 500) ranges['100_500ms']++;
                else ranges['over_500ms']++;
            }
        }
        
        return ranges;
        
    } catch (error) {
        logger.warn('Failed to calculate response time ranges', error);
        return { under_10ms: 0, '10_50ms': 0, '50_100ms': 0, '100_500ms': 0, over_500ms: 0 };
    }
}

// =============================================================================
// REQUEST LIFECYCLE TRACKING
// =============================================================================

/**
 * Initiates performance tracking for an HTTP request with unique identifier and timing information.
 * This function generates high-resolution start timestamp using performance.now(), creates request tracking object
 * with metadata and timing information, includes request method, path, IP address, and user agent in tracking data,
 * stores request tracking data in REQUEST_METRICS Map with requestId as key, increments total requests counter
 * in PERFORMANCE_COUNTERS, logs request start event if debug logging enabled, and updates error rate tracker
 * with new request in current window for sliding window algorithm.
 * 
 * Request tracking features:
 * - High-resolution timing using performance.now() for microsecond precision
 * - Comprehensive request metadata capture including method, path, and client information
 * - Efficient Map-based storage with O(1) operations for performance optimization
 * - Request correlation tracking for distributed system debugging
 * - Performance counter integration for cumulative statistics tracking
 * 
 * @param {string} requestId - Unique identifier for request tracking across middleware and handlers
 * @param {Object} requestMetadata - Request metadata object with method, path, IP, and headers information
 * @returns {void} No return value - stores request tracking data in REQUEST_METRICS Map
 */
function startRequestTracking(requestId, requestMetadata = {}) {
    try {
        // Generate high-resolution start timestamp using performance.now()
        const startTime = performance.now();
        const startTimestamp = Date.now();
        
        // Create request tracking object with metadata and timing information
        const requestTrackingData = {
            requestId: requestId,
            startTime: startTime,
            startTimestamp: startTimestamp,
            method: requestMetadata.method || 'UNKNOWN',
            path: requestMetadata.path || requestMetadata.url || '/',
            clientIp: requestMetadata.clientIp || requestMetadata.ip || 'unknown',
            userAgent: requestMetadata.userAgent || requestMetadata.headers?.['user-agent'] || 'unknown',
            contentLength: requestMetadata.contentLength || requestMetadata.headers?.['content-length'] || 0,
            httpVersion: requestMetadata.httpVersion || '1.1',
            correlationId: requestMetadata.correlationId || requestId,
            isActive: true,
            responseTime: null,
            statusCode: null,
            responseSize: null,
            error: null
        };
        
        // Store request tracking data in REQUEST_METRICS Map with requestId as key
        REQUEST_METRICS.set(requestId, requestTrackingData);
        
        // Increment total requests counter in PERFORMANCE_COUNTERS
        PERFORMANCE_COUNTERS.requests++;
        
        // Update error rate tracker with new request in current window
        ERROR_RATE_TRACKER.totalRequests++;
        
        // Log request start event if debug logging enabled
        logger.debug('Started request tracking', {
            requestId: requestId,
            method: requestTrackingData.method,
            path: requestTrackingData.path,
            clientIp: requestTrackingData.clientIp,
            activeRequests: REQUEST_METRICS.size,
            totalRequests: PERFORMANCE_COUNTERS.requests
        });
        
    } catch (error) {
        // Handle request tracking start errors gracefully - log error but don't disrupt request
        logger.error('Failed to start request tracking', {
            requestId: requestId,
            error: error.message,
            requestMetadata: requestMetadata
        });
        
        // Still increment request counter even if tracking fails
        PERFORMANCE_COUNTERS.requests++;
        ERROR_RATE_TRACKER.totalRequests++;
    }
}

/**
 * Completes request performance tracking, calculates metrics, and updates performance counters.
 * This function gets current high-resolution timestamp using performance.now(), retrieves request tracking data
 * from REQUEST_METRICS Map, calculates total response time by subtracting start time from current time, updates
 * request tracking data with completion information and metrics, increments response counter in PERFORMANCE_COUNTERS,
 * adds response time to total response time counter for average calculation, increments error counter if status code
 * indicates error (>=400), updates ERROR_RATE_TRACKER with error status if applicable, removes request tracking data
 * from REQUEST_METRICS Map to prevent memory leaks, logs request completion with performance metrics if debug enabled,
 * and returns complete request performance data object.
 * 
 * Request completion features:
 * - High-precision response time calculation using performance.now() for accurate measurement
 * - Automatic error detection based on HTTP status codes with error rate tracking
 * - Memory leak prevention through automatic request data cleanup
 * - Performance counter updates for cumulative statistics and averages
 * - Comprehensive performance data return for logging and monitoring integration
 * 
 * @param {string} requestId - Unique identifier for the request to complete and calculate performance metrics
 * @param {number} statusCode - HTTP response status code for error detection and categorization
 * @param {number} [responseSize=0] - Response body size in bytes for performance analysis
 * @returns {Object} Request performance data with timing, status, and metrics information
 */
function stopRequestTracking(requestId, statusCode, responseSize = 0) {
    try {
        // Get current high-resolution timestamp using performance.now()
        const endTime = performance.now();
        const endTimestamp = Date.now();
        
        // Retrieve request tracking data from REQUEST_METRICS Map
        const requestData = REQUEST_METRICS.get(requestId);
        
        if (!requestData) {
            logger.warn('Request tracking data not found for completion', {
                requestId: requestId,
                statusCode: statusCode,
                activeRequests: REQUEST_METRICS.size
            });
            
            // Still update counters even if tracking data is missing
            PERFORMANCE_COUNTERS.responses++;
            if (statusCode >= 400) {
                PERFORMANCE_COUNTERS.errors++;
                ERROR_RATE_TRACKER.errorCount++;
            }
            
            return {
                requestId: requestId,
                statusCode: statusCode,
                responseTime: 0,
                error: 'tracking_data_not_found'
            };
        }
        
        // Calculate total response time by subtracting start time from current time
        const responseTime = endTime - requestData.startTime;
        
        // Update request tracking data with completion information and metrics
        requestData.endTime = endTime;
        requestData.endTimestamp = endTimestamp;
        requestData.responseTime = responseTime;
        requestData.statusCode = statusCode;
        requestData.responseSize = responseSize;
        requestData.isActive = false;
        
        // Determine if this is an error response for error tracking
        const isError = statusCode >= 400;
        if (isError) {
            requestData.error = `HTTP_${statusCode}`;
        }
        
        // Increment response counter in PERFORMANCE_COUNTERS
        PERFORMANCE_COUNTERS.responses++;
        
        // Add response time to total response time counter for average calculation
        PERFORMANCE_COUNTERS.totalResponseTime += responseTime;
        
        // Increment error counter if status code indicates error (>=400)
        if (isError) {
            PERFORMANCE_COUNTERS.errors++;
            ERROR_RATE_TRACKER.errorCount++;
            ERROR_RATE_TRACKER.lastErrorTime = endTimestamp;
            
            // Track consecutive errors for health monitoring
            if (requestData.consecutiveErrors !== undefined) {
                ERROR_RATE_TRACKER.consecutiveErrors++;
            } else {
                ERROR_RATE_TRACKER.consecutiveErrors = 1;
            }
        } else {
            // Reset consecutive error count on successful response
            ERROR_RATE_TRACKER.consecutiveErrors = 0;
        }
        
        // Create complete performance data object for return
        const performanceData = {
            requestId: requestId,
            method: requestData.method,
            path: requestData.path,
            clientIp: requestData.clientIp,
            statusCode: statusCode,
            responseTime: Math.round(responseTime * 100) / 100,
            responseSize: responseSize,
            startTimestamp: requestData.startTimestamp,
            endTimestamp: endTimestamp,
            isError: isError,
            correlationId: requestData.correlationId
        };
        
        // Remove request tracking data from REQUEST_METRICS Map to prevent memory leaks
        REQUEST_METRICS.delete(requestId);
        
        // Log request completion with performance metrics if debug enabled
        logger.debug('Completed request tracking', {
            requestId: requestId,
            method: requestData.method,
            path: requestData.path,
            statusCode: statusCode,
            responseTime: performanceData.responseTime + 'ms',
            responseSize: responseSize + ' bytes',
            isError: isError,
            activeRequests: REQUEST_METRICS.size,
            totalResponses: PERFORMANCE_COUNTERS.responses
        });
        
        // Return complete request performance data object
        return performanceData;
        
    } catch (error) {
        // Handle request tracking completion errors gracefully
        logger.error('Failed to complete request tracking', {
            requestId: requestId,
            statusCode: statusCode,
            error: error.message
        });
        
        // Still update basic counters to maintain consistency
        PERFORMANCE_COUNTERS.responses++;
        if (statusCode >= 400) {
            PERFORMANCE_COUNTERS.errors++;
            ERROR_RATE_TRACKER.errorCount++;
        }
        
        // Clean up request data if it exists
        REQUEST_METRICS.delete(requestId);
        
        return {
            requestId: requestId,
            statusCode: statusCode,
            responseTime: 0,
            error: error.message
        };
    }
}

// =============================================================================
// MEMORY USAGE TRACKING
// =============================================================================

/**
 * Updates memory usage history for trend analysis and memory leak detection.
 * This function gets current memory usage using process.memoryUsage(), creates memory usage sample with timestamp
 * and usage data, adds new sample to MEMORY_USAGE_HISTORY array, limits history size to last 100 samples for
 * memory efficiency, removes oldest samples if history exceeds limit, calculates memory usage trend if sufficient
 * history available, and logs memory usage warnings if significant increase detected for proactive monitoring.
 * 
 * Memory usage tracking features:
 * - Comprehensive memory usage sampling including RSS, heap, and external memory
 * - Configurable history size limits for memory-efficient operation
 * - Trend analysis for proactive memory leak detection and monitoring
 * - Memory growth rate calculation for performance optimization insights
 * - Warning system for abnormal memory usage patterns and potential issues
 * 
 * @returns {void} No return value - updates MEMORY_USAGE_HISTORY array with latest sample
 */
function updateMemoryHistory() {
    try {
        // Get current memory usage using process.memoryUsage()
        const memoryUsage = process.memoryUsage();
        const currentTime = Date.now();
        
        // Create memory usage sample with timestamp and usage data
        const memorySample = {
            timestamp: currentTime,
            rss: memoryUsage.rss, // Resident Set Size
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
            heapUtilization: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        };
        
        // Add new sample to MEMORY_USAGE_HISTORY array
        MEMORY_USAGE_HISTORY.push(memorySample);
        
        // Limit history size to last 100 samples for memory efficiency
        const maxHistorySize = METRICS_CONFIG.memory_history_size || 100;
        if (MEMORY_USAGE_HISTORY.length > maxHistorySize) {
            // Remove oldest samples if history exceeds limit
            MEMORY_USAGE_HISTORY.shift();
        }
        
        // Calculate memory usage trend if sufficient history available (at least 10 samples)
        if (MEMORY_USAGE_HISTORY.length >= 10) {
            const trendAnalysis = calculateMemoryTrend();
            
            // Log memory usage warnings if significant increase detected
            if (trendAnalysis.growthRate > 5) { // More than 5% growth rate
                logger.warn('Potential memory leak detected - significant memory growth observed', {
                    currentRssMB: Math.round(memorySample.rss / 1048576),
                    currentHeapMB: Math.round(memorySample.heapUsed / 1048576),
                    heapUtilization: memorySample.heapUtilization.toFixed(2) + '%',
                    growthRate: trendAnalysis.growthRate.toFixed(2) + '%',
                    sampleCount: MEMORY_USAGE_HISTORY.length
                });
            }
        }
        
        logger.debug('Updated memory usage history', {
            currentRssMB: Math.round(memorySample.rss / 1048576),
            currentHeapMB: Math.round(memorySample.heapUsed / 1048576),
            heapUtilization: memorySample.heapUtilization.toFixed(2) + '%',
            historySize: MEMORY_USAGE_HISTORY.length,
            maxHistorySize: maxHistorySize
        });
        
    } catch (error) {
        // Handle memory history update errors gracefully
        logger.error('Failed to update memory usage history', error);
    }
}

/**
 * Helper function to calculate memory usage trends from history
 * @returns {Object} Memory trend analysis with growth rate and patterns
 */
function calculateMemoryTrend() {
    try {
        if (MEMORY_USAGE_HISTORY.length < 2) {
            return { growthRate: 0, trend: 'insufficient_data' };
        }
        
        const recent = MEMORY_USAGE_HISTORY.slice(-10); // Last 10 samples
        const oldest = recent[0];
        const newest = recent[recent.length - 1];
        
        // Calculate growth rate for RSS (Resident Set Size)
        const rssGrowthRate = oldest.rss > 0 ? 
            ((newest.rss - oldest.rss) / oldest.rss) * 100 : 0;
        
        // Calculate growth rate for heap usage
        const heapGrowthRate = oldest.heapUsed > 0 ? 
            ((newest.heapUsed - oldest.heapUsed) / oldest.heapUsed) * 100 : 0;
        
        // Determine trend direction
        let trend = 'stable';
        if (rssGrowthRate > 2 || heapGrowthRate > 2) {
            trend = 'increasing';
        } else if (rssGrowthRate < -2 || heapGrowthRate < -2) {
            trend = 'decreasing';
        }
        
        return {
            growthRate: Math.max(rssGrowthRate, heapGrowthRate),
            rssGrowthRate: rssGrowthRate,
            heapGrowthRate: heapGrowthRate,
            trend: trend,
            sampleCount: recent.length,
            timeSpan: newest.timestamp - oldest.timestamp
        };
        
    } catch (error) {
        logger.warn('Failed to calculate memory trend', error);
        return { growthRate: 0, trend: 'calculation_error' };
    }
}

// =============================================================================
// ERROR RATE CALCULATION
// =============================================================================

/**
 * Calculates current error rate using sliding window approach for accurate real-time monitoring.
 * This function gets current timestamp for window calculation, checks if current window has expired based on
 * windowSizeMs parameter, resets error rate tracker if window expired, calculates error rate percentage from
 * errorCount and totalRequests, handles division by zero for new applications with no requests, and returns
 * error rate as percentage value between 0 and 100 for monitoring and alerting systems.
 * 
 * Error rate calculation features:
 * - Sliding window algorithm for accurate real-time error rate monitoring
 * - Configurable window size for different monitoring requirements and use cases
 * - Automatic window reset and rolling calculation for continuous monitoring
 * - Division by zero protection for applications with no request history
 * - Percentage-based return value for standardized monitoring integration
 * 
 * @param {number} [windowSizeMs=300000] - Sliding window size in milliseconds (default 5 minutes)
 * @returns {number} Current error rate as percentage (0-100) within the specified time window
 */
function calculateErrorRate(windowSizeMs = 300000) {
    try {
        // Get current timestamp for window calculation
        const currentTime = Date.now();
        
        // Check if current window has expired based on windowSizeMs parameter
        const windowAge = currentTime - ERROR_RATE_TRACKER.windowStart;
        
        if (windowAge >= windowSizeMs) {
            // Reset error rate tracker if window expired for sliding window behavior
            ERROR_RATE_TRACKER.windowStart = currentTime;
            ERROR_RATE_TRACKER.errorCount = 0;
            ERROR_RATE_TRACKER.totalRequests = 0;
            
            logger.debug('Reset error rate tracking window', {
                newWindowStart: currentTime,
                windowSizeMs: windowSizeMs,
                previousWindowAge: windowAge
            });
            
            return 0; // No errors in new window
        }
        
        // Calculate error rate percentage from errorCount and totalRequests
        const errorRate = ERROR_RATE_TRACKER.totalRequests > 0 ?
            (ERROR_RATE_TRACKER.errorCount / ERROR_RATE_TRACKER.totalRequests) * 100 : 0;
        
        logger.debug('Calculated error rate', {
            errorCount: ERROR_RATE_TRACKER.errorCount,
            totalRequests: ERROR_RATE_TRACKER.totalRequests,
            errorRate: errorRate.toFixed(2) + '%',
            windowAge: windowAge,
            windowSize: windowSizeMs
        });
        
        // Return error rate as percentage value between 0 and 100
        return Math.max(0, Math.min(100, errorRate));
        
    } catch (error) {
        // Handle error rate calculation errors gracefully
        logger.error('Failed to calculate error rate', {
            error: error.message,
            windowSizeMs: windowSizeMs,
            errorTracker: ERROR_RATE_TRACKER
        });
        
        return 0; // Return 0% error rate as fallback
    }
}

// =============================================================================
// COMPREHENSIVE PERFORMANCE SNAPSHOT
// =============================================================================

/**
 * Creates a comprehensive performance snapshot combining all metrics for monitoring and debugging.
 * This function collects system metrics using getSystemMetrics(), gets request performance metrics using
 * getRequestMetrics(), gathers health-specific metrics using getHealthMetrics(), calculates current error rate
 * using calculateErrorRate(), includes application uptime using calculateUptime(), adds memory usage trends from
 * MEMORY_USAGE_HISTORY, includes performance counters and active request count, creates timestamp for snapshot
 * creation time, combines all metrics into comprehensive snapshot object, and returns complete performance snapshot
 * for monitoring systems integration and operational dashboards.
 * 
 * Performance snapshot features:
 * - Comprehensive metrics aggregation from all monitoring subsystems
 * - Real-time performance data with timestamp for accurate trend analysis
 * - System, application, and request-level metrics integration for complete visibility
 * - Memory usage trends and leak detection indicators for proactive monitoring
 * - Error rate and health status integration for operational alerting
 * - Performance counter summaries for cumulative statistics and reporting
 * 
 * @returns {Object} Complete performance snapshot with system, request, and health metrics
 */
function getPerformanceSnapshot() {
    try {
        const snapshotTimestamp = Date.now();
        
        // Collect system metrics using getSystemMetrics()
        const systemMetrics = getSystemMetrics();
        
        // Get request performance metrics using getRequestMetrics()
        const requestMetrics = getRequestMetrics();
        
        // Gather health-specific metrics using getHealthMetrics()
        const healthMetrics = getHealthMetrics();
        
        // Calculate current error rate using calculateErrorRate()
        const currentErrorRate = calculateErrorRate(ERROR_RATE_TRACKER.windowSizeMs);
        
        // Include application uptime using calculateUptime()
        const applicationUptime = calculateUptime();
        
        // Add memory usage trends from MEMORY_USAGE_HISTORY
        const memoryTrend = MEMORY_USAGE_HISTORY.length > 0 ? 
            calculateMemoryTrend() : { growthRate: 0, trend: 'no_data' };
        
        // Include performance counters and active request count
        const currentCounters = { ...PERFORMANCE_COUNTERS };
        const activeRequestCount = REQUEST_METRICS.size;
        
        // Create comprehensive snapshot object combining all metrics
        const performanceSnapshot = {
            // Snapshot metadata
            timestamp: snapshotTimestamp,
            uptime: applicationUptime,
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                pid: process.pid
            },
            
            // System-level metrics
            system: {
                cpu: systemMetrics.cpu,
                memory: systemMetrics.memory,
                v8: systemMetrics.v8,
                platform: systemMetrics.platform
            },
            
            // Request and response metrics
            requests: {
                counters: {
                    ...currentCounters,
                    activeRequests: activeRequestCount
                },
                performance: requestMetrics.performance,
                throughput: requestMetrics.throughput,
                distribution: requestMetrics.distribution
            },
            
            // Health and availability metrics
            health: {
                status: healthMetrics.status,
                resources: healthMetrics.resources,
                performance: healthMetrics.performance,
                summary: healthMetrics.health_summary
            },
            
            // Error tracking and rates
            errors: {
                currentErrorRate: Math.round(currentErrorRate * 100) / 100,
                errorTracker: {
                    windowStart: ERROR_RATE_TRACKER.windowStart,
                    windowSizeMs: ERROR_RATE_TRACKER.windowSizeMs,
                    errorCount: ERROR_RATE_TRACKER.errorCount,
                    totalRequests: ERROR_RATE_TRACKER.totalRequests,
                    lastErrorTime: ERROR_RATE_TRACKER.lastErrorTime,
                    consecutiveErrors: ERROR_RATE_TRACKER.consecutiveErrors
                }
            },
            
            // Memory usage trends and analysis
            memory: {
                current: systemMetrics.memory.process,
                trend: memoryTrend,
                history: {
                    samples: MEMORY_USAGE_HISTORY.length,
                    maxSamples: METRICS_CONFIG.memory_history_size || 100,
                    oldestSample: MEMORY_USAGE_HISTORY.length > 0 ? MEMORY_USAGE_HISTORY[0].timestamp : null,
                    newestSample: MEMORY_USAGE_HISTORY.length > 0 ? 
                        MEMORY_USAGE_HISTORY[MEMORY_USAGE_HISTORY.length - 1].timestamp : null
                }
            },
            
            // Cache and performance statistics
            cache: {
                systemMetrics: {
                    hits: SYSTEM_METRICS_CACHE.hitCount,
                    misses: SYSTEM_METRICS_CACHE.missCount,
                    hitRate: SYSTEM_METRICS_CACHE.hitCount + SYSTEM_METRICS_CACHE.missCount > 0 ?
                        (SYSTEM_METRICS_CACHE.hitCount / (SYSTEM_METRICS_CACHE.hitCount + SYSTEM_METRICS_CACHE.missCount)) * 100 : 0,
                    ttl: SYSTEM_METRICS_CACHE.ttl,
                    lastUpdate: SYSTEM_METRICS_CACHE.timestamp
                }
            },
            
            // Configuration and operational info
            configuration: {
                metricsEnabled: METRICS_CONFIG.metrics_enabled !== false,
                cacheTtl: SYSTEM_METRICS_CACHE.ttl,
                errorTrackingWindow: ERROR_RATE_TRACKER.windowSizeMs,
                memoryHistorySize: METRICS_CONFIG.memory_history_size || 100
            }
        };
        
        logger.info('Generated comprehensive performance snapshot', {
            timestamp: snapshotTimestamp,
            systemStatus: healthMetrics.status,
            totalRequests: currentCounters.requests,
            totalErrors: currentCounters.errors,
            errorRate: currentErrorRate.toFixed(2) + '%',
            memoryUsageMB: Math.round(systemMetrics.memory.process.rss / 1048576),
            uptime: applicationUptime.toFixed(2) + 's'
        });
        
        // Return complete performance snapshot for monitoring systems
        return performanceSnapshot;
        
    } catch (error) {
        // Handle performance snapshot generation errors gracefully
        logger.error('Failed to generate performance snapshot, returning minimal data', error);
        
        return {
            timestamp: Date.now(),
            error: true,
            errorMessage: error.message,
            uptime: calculateUptime(),
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                pid: process.pid
            },
            requests: {
                counters: PERFORMANCE_COUNTERS,
                activeRequests: REQUEST_METRICS.size
            },
            health: {
                status: 'unhealthy',
                errorMessage: 'Failed to generate performance snapshot'
            }
        };
    }
}

// =============================================================================
// METRICS SYSTEM UTILITIES
// =============================================================================

/**
 * Resets all performance counters and metrics for testing purposes or periodic reset requirements.
 * This function clears REQUEST_METRICS Map of all active request tracking data, resets PERFORMANCE_COUNTERS
 * to initial zero values, resets ERROR_RATE_TRACKER with current timestamp and zero counts, clears MEMORY_USAGE_HISTORY
 * array, invalidates SYSTEM_METRICS_CACHE to force fresh collection, logs metrics reset event with timestamp,
 * and preserves METRICS_START_TIME to maintain uptime continuity for accurate application lifetime tracking.
 * 
 * Metrics reset features:
 * - Complete performance counter reset for clean statistical baseline
 * - Memory leak prevention through comprehensive data structure cleanup
 * - Error tracking reset with new sliding window initialization
 * - Cache invalidation for fresh metrics collection on next request
 * - Uptime preservation for continuous application lifetime tracking
 * - Comprehensive logging for operational visibility and debugging
 * 
 * @returns {void} No return value - resets all metrics tracking data to initial state
 */
function resetMetrics() {
    try {
        const resetTimestamp = Date.now();
        
        // Clear REQUEST_METRICS Map of all active request tracking data
        const activeRequestCount = REQUEST_METRICS.size;
        REQUEST_METRICS.clear();
        
        // Reset PERFORMANCE_COUNTERS to initial zero values
        const previousCounters = { ...PERFORMANCE_COUNTERS };
        PERFORMANCE_COUNTERS = {
            requests: 0,
            responses: 0,
            errors: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            requestsPerSecond: 0,
            errorRate: 0,
            activeRequests: 0
        };
        
        // Reset ERROR_RATE_TRACKER with current timestamp and zero counts
        const previousErrorTracker = { ...ERROR_RATE_TRACKER };
        ERROR_RATE_TRACKER = {
            windowStart: resetTimestamp,
            errorCount: 0,
            totalRequests: 0,
            windowSizeMs: METRICS_CONFIG.error_tracking_window || 300000,
            lastErrorTime: null,
            consecutiveErrors: 0
        };
        
        // Clear MEMORY_USAGE_HISTORY array
        const previousHistorySize = MEMORY_USAGE_HISTORY.length;
        MEMORY_USAGE_HISTORY = [];
        
        // Invalidate SYSTEM_METRICS_CACHE to force fresh collection
        SYSTEM_METRICS_CACHE.data = null;
        SYSTEM_METRICS_CACHE.timestamp = 0;
        SYSTEM_METRICS_CACHE.hitCount = 0;
        SYSTEM_METRICS_CACHE.missCount = 0;
        
        // Log metrics reset event with timestamp and previous state information
        logger.info('Metrics system reset completed', {
            resetTimestamp: resetTimestamp,
            previousState: {
                activeRequests: activeRequestCount,
                totalRequests: previousCounters.requests,
                totalResponses: previousCounters.responses,
                totalErrors: previousCounters.errors,
                errorCount: previousErrorTracker.errorCount,
                memoryHistorySize: previousHistorySize
            },
            newState: {
                allCountersZero: true,
                activeRequests: 0,
                errorTrackerReset: true,
                cacheInvalidated: true,
                memoryHistoryCleared: true
            },
            // Preserve METRICS_START_TIME to maintain uptime continuity
            uptimePreserved: true,
            metricsStartTime: METRICS_START_TIME
        });
        
    } catch (error) {
        // Handle metrics reset errors gracefully - log error but attempt to continue
        logger.error('Failed to reset metrics system completely', error);
        
        // Attempt partial reset to maintain system stability
        try {
            REQUEST_METRICS.clear();
            PERFORMANCE_COUNTERS = { requests: 0, responses: 0, errors: 0, totalResponseTime: 0 };
            ERROR_RATE_TRACKER = { windowStart: Date.now(), errorCount: 0, totalRequests: 0 };
            MEMORY_USAGE_HISTORY = [];
            SYSTEM_METRICS_CACHE.data = null;
            
            logger.warn('Completed partial metrics reset after error');
        } catch (partialResetError) {
            logger.error('Failed to complete even partial metrics reset', partialResetError);
        }
    }
}

/**
 * Returns current metrics configuration for monitoring and debugging purposes.
 * This function gets current configuration using getConfig() if not cached, extracts monitoring configuration
 * section, includes metrics collection intervals and cache TTL settings, adds performance thresholds and alert
 * limits, includes environment-specific monitoring behavior settings, and returns comprehensive metrics
 * configuration object for operational visibility, debugging assistance, and system monitoring integration.
 * 
 * Configuration retrieval features:
 * - Lazy configuration loading with caching for performance optimization
 * - Comprehensive monitoring settings including intervals, thresholds, and limits
 * - Environment-specific configuration visibility for debugging and troubleshooting
 * - Cache settings and performance optimization parameters for tuning
 * - Security-conscious configuration exposure without sensitive information
 * 
 * @returns {Object} Metrics configuration object with collection settings, thresholds, and operational parameters
 */
function getMetricsConfiguration() {
    try {
        // Get current configuration using getConfig() if not cached
        if (!METRICS_CONFIG) {
            const config = getConfig();
            METRICS_CONFIG = config.monitoring || {};
        }
        
        // Extract monitoring configuration section and create comprehensive config object
        const metricsConfiguration = {
            // Basic metrics collection settings
            enabled: METRICS_CONFIG.metrics_enabled !== false,
            environment: process.env.NODE_ENV || 'development',
            
            // Cache and performance settings
            cache: {
                systemMetricsTtl: SYSTEM_METRICS_CACHE.ttl,
                systemMetricsHits: SYSTEM_METRICS_CACHE.hitCount,
                systemMetricsMisses: SYSTEM_METRICS_CACHE.missCount,
                hitRate: SYSTEM_METRICS_CACHE.hitCount + SYSTEM_METRICS_CACHE.missCount > 0 ?
                    Math.round(((SYSTEM_METRICS_CACHE.hitCount / (SYSTEM_METRICS_CACHE.hitCount + SYSTEM_METRICS_CACHE.missCount)) * 100) * 100) / 100 : 0
            },
            
            // Error tracking configuration
            errorTracking: {
                windowSizeMs: ERROR_RATE_TRACKER.windowSizeMs,
                currentWindowStart: ERROR_RATE_TRACKER.windowStart,
                windowAge: Date.now() - ERROR_RATE_TRACKER.windowStart
            },
            
            // Memory monitoring settings
            memory: {
                historySize: METRICS_CONFIG.memory_history_size || 100,
                currentHistorySize: MEMORY_USAGE_HISTORY.length,
                historyUtilization: MEMORY_USAGE_HISTORY.length / (METRICS_CONFIG.memory_history_size || 100) * 100
            },
            
            // Performance thresholds and limits
            thresholds: {
                memoryRssLimit: METRICS_CONFIG.memory_rss_limit || 104857600,
                heapUtilizationLimit: METRICS_CONFIG.heap_utilization_limit || 85,
                systemMemoryLimit: METRICS_CONFIG.system_memory_limit || 90,
                cpuUsageLimit: METRICS_CONFIG.cpu_usage_limit || 80,
                cpuLoadThreshold: METRICS_CONFIG.cpu_load_threshold || 2.0,
                responseTimeLimit: METRICS_CONFIG.response_time_limit || 50,
                errorRateLimit: METRICS_CONFIG.error_rate_limit || 5
            },
            
            // Health check configuration
            healthCheck: {
                path: METRICS_CONFIG.health_check_path || '/health',
                timeout: METRICS_CONFIG.health_check_timeout || 5000,
                interval: METRICS_CONFIG.health_check_interval || 30000
            },
            
            // Application metadata
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                startTime: METRICS_START_TIME,
                uptime: calculateUptime(),
                nodeVersion: process.version,
                platform: process.platform,
                pid: process.pid
            },
            
            // Current metrics status
            status: {
                initialized: METRICS_CONFIG !== null,
                requestTrackingActive: REQUEST_METRICS.size > 0,
                memoryHistoryActive: MEMORY_USAGE_HISTORY.length > 0,
                systemMetricsCacheValid: SYSTEM_METRICS_CACHE.data !== null &&
                    (Date.now() - SYSTEM_METRICS_CACHE.timestamp) < SYSTEM_METRICS_CACHE.ttl,
                lastConfigurationLoad: Date.now()
            }
        };
        
        logger.debug('Retrieved metrics configuration', {
            enabled: metricsConfiguration.enabled,
            cacheHitRate: metricsConfiguration.cache.hitRate + '%',
            memoryHistorySize: metricsConfiguration.memory.currentHistorySize,
            errorWindowAge: metricsConfiguration.errorTracking.windowAge
        });
        
        // Return comprehensive metrics configuration object
        return metricsConfiguration;
        
    } catch (error) {
        // Handle configuration retrieval errors gracefully
        logger.error('Failed to retrieve metrics configuration', error);
        
        return {
            enabled: false,
            error: true,
            errorMessage: error.message,
            timestamp: Date.now(),
            fallback: true,
            application: {
                name: APPLICATION_METADATA.NAME,
                version: APPLICATION_METADATA.VERSION,
                pid: process.pid
            }
        };
    }
}

/**
 * Evaluates overall metrics system health and identifies potential issues.
 * This function checks if REQUEST_METRICS Map size is within reasonable limits, validates PERFORMANCE_COUNTERS
 * for consistency and reasonable values, verifies SYSTEM_METRICS_CACHE is updating properly, checks memory usage
 * history for concerning trends, validates error rate tracking window is functioning, and returns true if all
 * metrics systems are healthy, false otherwise for operational monitoring and health check integration.
 * 
 * Metrics health evaluation features:
 * - Comprehensive system health validation across all metrics subsystems
 * - Resource utilization monitoring for memory leak and performance issue detection
 * - Cache system health validation for performance optimization verification
 * - Error tracking system validation for monitoring system integrity
 * - Performance counter consistency checking for data integrity assurance
 * 
 * @returns {boolean} True if metrics system is operating normally, false if issues detected
 */
function isMetricsHealthy() {
    try {
        const healthChecks = [];
        const currentTime = Date.now();
        
        // Check if REQUEST_METRICS Map size is within reasonable limits (prevent memory leaks)
        const maxActiveRequests = METRICS_CONFIG.max_active_requests || 10000;
        const activeRequestsHealthy = REQUEST_METRICS.size < maxActiveRequests;
        healthChecks.push({
            name: 'active_requests_limit',
            healthy: activeRequestsHealthy,
            current: REQUEST_METRICS.size,
            limit: maxActiveRequests
        });
        
        // Validate PERFORMANCE_COUNTERS for consistency and reasonable values
        const countersConsistent = 
            PERFORMANCE_COUNTERS.requests >= PERFORMANCE_COUNTERS.responses &&
            PERFORMANCE_COUNTERS.responses >= 0 &&
            PERFORMANCE_COUNTERS.errors >= 0 &&
            PERFORMANCE_COUNTERS.errors <= PERFORMANCE_COUNTERS.requests &&
            PERFORMANCE_COUNTERS.totalResponseTime >= 0;
        
        healthChecks.push({
            name: 'performance_counters_consistency',
            healthy: countersConsistent,
            counters: PERFORMANCE_COUNTERS
        });
        
        // Verify SYSTEM_METRICS_CACHE is updating properly
        const cacheAge = currentTime - SYSTEM_METRICS_CACHE.timestamp;
        const maxCacheAge = SYSTEM_METRICS_CACHE.ttl * 2; // Allow 2x TTL for cache staleness
        const cacheHealthy = SYSTEM_METRICS_CACHE.data === null || cacheAge < maxCacheAge;
        
        healthChecks.push({
            name: 'system_metrics_cache',
            healthy: cacheHealthy,
            cacheAge: cacheAge,
            maxAge: maxCacheAge,
            hasData: SYSTEM_METRICS_CACHE.data !== null
        });
        
        // Check memory usage history for concerning trends
        const memoryHistorySize = MEMORY_USAGE_HISTORY.length;
        const maxMemoryHistory = METRICS_CONFIG.memory_history_size || 100;
        const memoryHistoryHealthy = memoryHistorySize <= maxMemoryHistory;
        
        let memoryTrendHealthy = true;
        if (memoryHistorySize >= 10) {
            const trend = calculateMemoryTrend();
            memoryTrendHealthy = trend.growthRate < 10; // Less than 10% growth rate
        }
        
        healthChecks.push({
            name: 'memory_history',
            healthy: memoryHistoryHealthy && memoryTrendHealthy,
            historySize: memoryHistorySize,
            maxSize: maxMemoryHistory,
            trendHealthy: memoryTrendHealthy
        });
        
        // Validate error rate tracking window is functioning
        const errorWindowAge = currentTime - ERROR_RATE_TRACKER.windowStart;
        const errorTrackingHealthy = 
            ERROR_RATE_TRACKER.errorCount >= 0 &&
            ERROR_RATE_TRACKER.totalRequests >= 0 &&
            ERROR_RATE_TRACKER.errorCount <= ERROR_RATE_TRACKER.totalRequests &&
            errorWindowAge >= 0;
        
        healthChecks.push({
            name: 'error_rate_tracking',
            healthy: errorTrackingHealthy,
            errorCount: ERROR_RATE_TRACKER.errorCount,
            totalRequests: ERROR_RATE_TRACKER.totalRequests,
            windowAge: errorWindowAge
        });
        
        // Check for any stale request tracking data (requests older than 5 minutes)
        const staleRequestThreshold = 300000; // 5 minutes
        let staleRequestCount = 0;
        
        for (const [requestId, requestData] of REQUEST_METRICS) {
            const requestAge = currentTime - requestData.startTimestamp;
            if (requestAge > staleRequestThreshold) {
                staleRequestCount++;
            }
        }
        
        const staleRequestsHealthy = staleRequestCount < 10; // Allow up to 10 stale requests
        healthChecks.push({
            name: 'stale_requests',
            healthy: staleRequestsHealthy,
            staleCount: staleRequestCount,
            threshold: staleRequestThreshold
        });
        
        // Calculate overall health status
        const healthyChecks = healthChecks.filter(check => check.healthy);
        const overallHealthy = healthyChecks.length === healthChecks.length;
        
        logger.debug('Evaluated metrics system health', {
            overallHealthy: overallHealthy,
            totalChecks: healthChecks.length,
            healthyChecks: healthyChecks.length,
            unhealthyChecks: healthChecks.filter(check => !check.healthy).map(check => check.name)
        });
        
        // Return true if all metrics systems are healthy, false otherwise
        return overallHealthy;
        
    } catch (error) {
        // Handle health evaluation errors - assume unhealthy state
        logger.error('Failed to evaluate metrics system health', error);
        return false;
    }
}

// =============================================================================
// MODULE INITIALIZATION AND EXPORTS
// =============================================================================

// Initialize the metrics collection system automatically when the module is loaded
// This ensures metrics are ready for use as soon as the module is imported
initializeMetrics();

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    // Primary function for collecting comprehensive system performance metrics including CPU, memory, and process information
    getSystemMetrics,
    
    // Health check integration function providing health-specific metrics and resource threshold compliance
    getHealthMetrics,
    
    // HTTP request performance metrics function for throughput, response time, and error rate monitoring
    getRequestMetrics,
    
    // Request lifecycle tracking function for initiating performance measurement of HTTP requests
    startRequestTracking,
    
    // Request lifecycle completion function for calculating performance metrics and updating counters
    stopRequestTracking,
    
    // Comprehensive performance snapshot function combining all metrics for monitoring dashboards
    getPerformanceSnapshot,
    
    // Uptime calculation utility for application availability monitoring
    calculateUptime,
    
    // Error rate calculation function using sliding window approach for real-time monitoring
    calculateErrorRate,
    
    // Metrics reset utility function for testing and periodic metrics cleanup
    resetMetrics,
    
    // Metrics system health validation function for internal monitoring
    isMetricsHealthy
};