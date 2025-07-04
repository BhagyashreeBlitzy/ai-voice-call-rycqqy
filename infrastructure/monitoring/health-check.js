// Node.js built-in modules for health check functionality
const http = require('node:http'); // Node.js 18.x+ built-in HTTP module
const os = require('node:os'); // Node.js 18.x+ built-in OS module
// process is globally available in Node.js 18.x+

// Internal configuration import for environment detection
const { ENVIRONMENT } = require('../../src/backend/config/index.js');

// Health check server configuration
const HEALTH_PORT = process.env.HEALTH_PORT || 8080;
const HEALTH_PATH = '/health';

// Health check thresholds and constants
const MEMORY_THRESHOLD_MB = 100; // Memory usage threshold in MB
const RESPONSE_TIME_THRESHOLD_MS = 100; // Response time threshold in ms
const UPTIME_MINIMUM_SECONDS = 1; // Minimum uptime to consider healthy

/**
 * Gathers and returns the current health status of the application and system.
 * Provides comprehensive health information including process uptime, memory usage,
 * environment details, and system metrics for monitoring and observability.
 * 
 * @returns {Object} Health status object with detailed system information
 * @example
 * const healthStatus = getHealthStatus();
 * console.log('Current health:', healthStatus);
 */
function getHealthStatus() {
    // Retrieve process uptime in seconds
    const uptimeSeconds = process.uptime();
    
    // Get detailed memory usage statistics
    const memoryUsage = process.memoryUsage();
    const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
    const usedMemoryMB = totalMemoryMB - freeMemoryMB;
    
    // Calculate memory usage percentages
    const processMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    // Get current timestamp in ISO format
    const timestamp = new Date().toISOString();
    
    // Determine health status based on system metrics
    const isHealthy = uptimeSeconds >= UPTIME_MINIMUM_SECONDS && 
                     processMemoryMB < MEMORY_THRESHOLD_MB;
    
    // Get system load average (Unix-like systems)
    const loadAverage = os.loadavg();
    
    // Get system platform information
    const platformInfo = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.version,
        pid: process.pid
    };
    
    // Construct comprehensive health status object
    const healthStatus = {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: timestamp,
        uptime: {
            seconds: uptimeSeconds,
            formatted: formatUptime(uptimeSeconds)
        },
        memory: {
            process: {
                rss: processMemoryMB,
                heapUsed: heapUsedMB,
                heapTotal: heapTotalMB,
                external: Math.round(memoryUsage.external / 1024 / 1024)
            },
            system: {
                total: totalMemoryMB,
                free: freeMemoryMB,
                used: usedMemoryMB,
                usage: Math.round((usedMemoryMB / totalMemoryMB) * 100)
            }
        },
        environment: ENVIRONMENT,
        system: {
            ...platformInfo,
            loadAverage: loadAverage.map(load => Math.round(load * 100) / 100),
            cpuCount: os.cpus().length
        },
        checks: {
            uptime: uptimeSeconds >= UPTIME_MINIMUM_SECONDS,
            memory: processMemoryMB < MEMORY_THRESHOLD_MB,
            environment: ['development', 'production', 'test'].includes(ENVIRONMENT)
        }
    };
    
    return healthStatus;
}

/**
 * Formats uptime seconds into a human-readable string.
 * Converts seconds into days, hours, minutes, and seconds format.
 * 
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * HTTP request handler for the health check endpoint.
 * Responds with 200 OK and health status JSON if healthy,
 * or 503 Service Unavailable if degraded.
 * Provides comprehensive error handling and CORS support.
 * 
 * @param {http.IncomingMessage} req - HTTP request object
 * @param {http.ServerResponse} res - HTTP response object
 * @returns {void} Sends JSON health status response with appropriate HTTP status code
 */
function healthCheckHandler(req, res) {
    try {
        // Record request start time for response time calculation
        const requestStart = Date.now();
        
        // Validate request method and path
        if (req.method !== 'GET') {
            res.writeHead(405, { 
                'Content-Type': 'application/json',
                'Allow': 'GET'
            });
            res.end(JSON.stringify({
                error: 'Method Not Allowed',
                message: 'Health check endpoint only supports GET requests'
            }));
            return;
        }
        
        // Check if the request URL matches the health path
        if (req.url !== HEALTH_PATH) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Not Found',
                message: `Health check endpoint available at ${HEALTH_PATH}`
            }));
            return;
        }
        
        // Get comprehensive health status
        const healthStatus = getHealthStatus();
        
        // Calculate response time
        const responseTime = Date.now() - requestStart;
        healthStatus.responseTime = responseTime;
        
        // Determine HTTP status code based on health status
        let statusCode = 200;
        if (healthStatus.status === 'degraded') {
            statusCode = 503;
        } else if (responseTime > RESPONSE_TIME_THRESHOLD_MS) {
            statusCode = 503;
            healthStatus.status = 'degraded';
            healthStatus.checks.responseTime = false;
        } else {
            healthStatus.checks.responseTime = true;
        }
        
        // Set appropriate response headers
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Health-Check': 'true',
            'X-Response-Time': `${responseTime}ms`
        };
        
        // Add CORS headers for cross-origin requests
        if (req.headers.origin) {
            headers['Access-Control-Allow-Origin'] = req.headers.origin;
            headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
            headers['Access-Control-Allow-Headers'] = 'Content-Type';
        }
        
        // Send health status response
        res.writeHead(statusCode, headers);
        res.end(JSON.stringify(healthStatus, null, 2));
        
        // Log health check request for monitoring
        const logLevel = statusCode === 200 ? 'INFO' : 'WARN';
        console.log(`[${new Date().toISOString()}] ${logLevel}: Health check - Status: ${healthStatus.status}, Response time: ${responseTime}ms, Memory: ${healthStatus.memory.process.rss}MB`);
        
    } catch (error) {
        // Handle unexpected errors during health check processing
        console.error(`[${new Date().toISOString()}] ERROR: Health check handler error:`, error);
        
        // Send error response
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Internal Server Error',
            message: 'Health check handler encountered an error'
        }));
    }
}

/**
 * Starts the standalone HTTP server for the health check endpoint.
 * Creates a lightweight HTTP server independent of the main application
 * server, ensuring health checks can operate even if the main app is
 * unresponsive. Suitable for Docker, Kubernetes, and monitoring tools.
 * 
 * @returns {void} Starts the server and logs startup status
 */
function startHealthCheckServer() {
    try {
        // Create HTTP server with health check handler
        const server = http.createServer(healthCheckHandler);
        
        // Configure server timeout settings
        server.timeout = 30000; // 30 second timeout
        server.keepAliveTimeout = 5000; // 5 second keep-alive timeout
        server.headersTimeout = 10000; // 10 second headers timeout
        
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`[${new Date().toISOString()}] ERROR: Health check server port ${HEALTH_PORT} is already in use`);
                process.exit(1);
            } else if (error.code === 'EACCES') {
                console.error(`[${new Date().toISOString()}] ERROR: Insufficient permissions to bind to port ${HEALTH_PORT}`);
                process.exit(1);
            } else {
                console.error(`[${new Date().toISOString()}] ERROR: Health check server error:`, error);
                process.exit(1);
            }
        });
        
        // Handle client connection errors
        server.on('clientError', (err, socket) => {
            console.warn(`[${new Date().toISOString()}] WARN: Client connection error:`, err.message);
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        
        // Start listening on configured port
        server.listen(HEALTH_PORT, () => {
            const startupMessage = `
=== Health Check Server Started ===
Port: ${HEALTH_PORT}
Health Endpoint: ${HEALTH_PATH}
Environment: ${ENVIRONMENT}
Node.js Version: ${process.version}
Process ID: ${process.pid}
Started at: ${new Date().toISOString()}
===================================`;
            
            console.log(startupMessage);
            
            // Log initial health status
            const initialHealth = getHealthStatus();
            console.log(`[${new Date().toISOString()}] INFO: Initial health status: ${initialHealth.status}`);
        });
        
        // Handle graceful shutdown
        process.on('SIGTERM', () => {
            console.log(`[${new Date().toISOString()}] INFO: Received SIGTERM, shutting down health check server gracefully`);
            server.close(() => {
                console.log(`[${new Date().toISOString()}] INFO: Health check server shut down complete`);
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            console.log(`[${new Date().toISOString()}] INFO: Received SIGINT, shutting down health check server gracefully`);
            server.close(() => {
                console.log(`[${new Date().toISOString()}] INFO: Health check server shut down complete`);
                process.exit(0);
            });
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error(`[${new Date().toISOString()}] ERROR: Uncaught exception in health check server:`, error);
            process.exit(1);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error(`[${new Date().toISOString()}] ERROR: Unhandled promise rejection in health check server:`, reason);
            process.exit(1);
        });
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR: Failed to start health check server:`, error);
        process.exit(1);
    }
}

// Export the main entry point for the health check server
module.exports = {
    startHealthCheckServer,
    getHealthStatus,
    healthCheckHandler,
    HEALTH_PORT,
    HEALTH_PATH
};

// If this script is run directly, start the health check server
if (require.main === module) {
    startHealthCheckServer();
}