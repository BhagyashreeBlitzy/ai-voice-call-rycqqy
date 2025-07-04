# Monitoring & Health Check

This directory contains the standalone health check script (`health-check.js`) for the Node.js tutorial application. It exposes a lightweight HTTP endpoint for infrastructure monitoring, container orchestration, and uptime checks, providing comprehensive system health information independent of the main application server.

## Overview

The health check subsystem implements a **standalone monitoring solution** that operates independently of the main Express application server. This design ensures that health checks can continue to function even if the primary application becomes unresponsive, making it ideal for use with Docker, Kubernetes, load balancers, and external monitoring systems.

**Key Design Principles:**
- **Independence**: Runs as a separate HTTP server from the main application
- **Lightweight**: Minimal resource usage and fast startup time
- **Comprehensive**: Provides detailed system health information including memory, uptime, and performance metrics
- **Production-Ready**: Includes proper error handling, logging, and graceful shutdown mechanisms
- **Standards-Compliant**: Returns structured JSON responses with appropriate HTTP status codes

## Features

### Core Capabilities
- **Cross-Platform Compatibility**: Supports Node.js 18+ on Windows, macOS, and Linux
- **Zero External Dependencies**: Uses only built-in Node.js modules (`http`, `os`, `process`)
- **Fast Startup**: Minimal overhead with sub-second startup time
- **Comprehensive Health Status**: Reports system metrics, memory usage, uptime, and environment information
- **Configurable**: Customizable port (default: 8080) and endpoint path (`/health`)
- **Extensible**: Easy to add custom health checks for databases, external services, or business logic

### Response Format
- **JSON Structure**: Structured health information with consistent schema
- **HTTP Status Codes**: 200 OK for healthy, 503 Service Unavailable for degraded
- **Detailed Metrics**: Process memory, system memory, uptime, load average, and platform information
- **Response Time Tracking**: Built-in performance monitoring with configurable thresholds

### Security Features
- **Input Validation**: Proper HTTP method and path validation
- **Error Handling**: Comprehensive error recovery and secure error responses
- **CORS Support**: Cross-origin request handling for development environments
- **Security Headers**: Appropriate caching and security headers

## Usage

### Basic Usage

To start the health check server:

```bash
node infrastructure/monitoring/health-check.js
```

The server will start on port 8080 and display detailed startup information:

```
=== Health Check Server Started ===
Port: 8080
Health Endpoint: /health
Environment: development
Node.js Version: v18.19.0
Process ID: 12345
Started at: 2024-01-15T10:30:00.000Z
===================================
```

### Custom Port Configuration

Set a custom port using the `HEALTH_PORT` environment variable:

```bash
# Linux/macOS
HEALTH_PORT=9090 node infrastructure/monitoring/health-check.js

# Windows
set HEALTH_PORT=9090 && node infrastructure/monitoring/health-check.js
```

### Testing the Health Endpoint

Once the server is running, test the health endpoint:

```bash
# Using curl
curl -X GET http://localhost:8080/health

# Using wget
wget -O - http://localhost:8080/health

# Using Node.js fetch (Node.js 18+)
fetch('http://localhost:8080/health').then(r => r.json()).then(console.log)
```

### Environment Integration

The health check server automatically detects the application environment using the `NODE_ENV` variable:

```bash
# Production environment
NODE_ENV=production HEALTH_PORT=8080 node infrastructure/monitoring/health-check.js

# Development environment (default)
node infrastructure/monitoring/health-check.js
```

## Integration with Docker and Kubernetes

### Docker Integration

#### Docker Compose Health Check

Add the following healthcheck configuration to your `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    environment:
      - NODE_ENV=production
      - HEALTH_PORT=8080
```

#### Dockerfile Health Check

Add a health check instruction to your Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000 8080

# Install curl for health checks
RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "infrastructure/monitoring/health-check.js"]
```

### Kubernetes Integration

#### Liveness and Readiness Probes

Configure health checks in your Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-tutorial-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nodejs-tutorial
  template:
    metadata:
      labels:
        app: nodejs-tutorial
    spec:
      containers:
      - name: app
        image: nodejs-tutorial:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 8080
          name: health
        env:
        - name: NODE_ENV
          value: "production"
        - name: HEALTH_PORT
          value: "8080"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

#### Service Configuration

Create a service to expose the health check port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nodejs-tutorial-service
spec:
  selector:
    app: nodejs-tutorial
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: health
    port: 8080
    targetPort: 8080
  type: LoadBalancer
```

### Load Balancer Configuration

#### HAProxy Configuration

Configure HAProxy to use the health check endpoint:

```
backend nodejs_servers
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    server app1 192.168.1.10:3000 check port 8080 inter 30s
    server app2 192.168.1.11:3000 check port 8080 inter 30s
```

#### NGINX Configuration

Configure NGINX upstream health checks:

```nginx
upstream nodejs_backend {
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
}

server {
    listen 80;
    
    location /health {
        proxy_pass http://192.168.1.10:8080/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://nodejs_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Health Endpoint Specification

### Request Format
- **Method**: GET
- **Path**: `/health`
- **Headers**: None required
- **Body**: None

### Response Format

#### Healthy Response (200 OK)
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": {
    "seconds": 3661.234,
    "formatted": "1h 1m 1s"
  },
  "memory": {
    "process": {
      "rss": 45,
      "heapUsed": 23,
      "heapTotal": 35,
      "external": 2
    },
    "system": {
      "total": 16384,
      "free": 8192,
      "used": 8192,
      "usage": 50
    }
  },
  "environment": "production",
  "system": {
    "platform": "linux",
    "arch": "x64",
    "hostname": "app-server-01",
    "nodeVersion": "v18.19.0",
    "pid": 12345,
    "loadAverage": [0.5, 0.7, 0.8],
    "cpuCount": 4
  },
  "checks": {
    "uptime": true,
    "memory": true,
    "environment": true,
    "responseTime": true
  },
  "responseTime": 15
}
```

#### Degraded Response (503 Service Unavailable)
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": {
    "seconds": 0.5,
    "formatted": "0s"
  },
  "memory": {
    "process": {
      "rss": 120,
      "heapUsed": 95,
      "heapTotal": 105,
      "external": 8
    },
    "system": {
      "total": 16384,
      "free": 1024,
      "used": 15360,
      "usage": 94
    }
  },
  "environment": "production",
  "system": {
    "platform": "linux",
    "arch": "x64",
    "hostname": "app-server-01",
    "nodeVersion": "v18.19.0",
    "pid": 12345,
    "loadAverage": [2.5, 2.7, 2.8],
    "cpuCount": 4
  },
  "checks": {
    "uptime": false,
    "memory": false,
    "environment": true,
    "responseTime": true
  },
  "responseTime": 85
}
```

### Response Headers

All responses include the following headers:
- `Content-Type: application/json`
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`
- `X-Health-Check: true`
- `X-Response-Time: <time>ms`

### Error Responses

#### Method Not Allowed (405)
```json
{
  "error": "Method Not Allowed",
  "message": "Health check endpoint only supports GET requests"
}
```

#### Not Found (404)
```json
{
  "error": "Not Found",
  "message": "Health check endpoint available at /health"
}
```

#### Internal Server Error (500)
```json
{
  "status": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Internal Server Error",
  "message": "Health check handler encountered an error"
}
```

### Health Check Thresholds

The health check system uses the following thresholds to determine health status:

| Metric | Threshold | Impact |
|--------|-----------|--------|
| **Uptime** | ≥ 1 second | Must be running for at least 1 second |
| **Memory Usage** | < 100 MB | Process memory usage threshold |
| **Response Time** | < 100 ms | Health check response time threshold |
| **Environment** | Valid environment | Must be 'development', 'production', or 'test' |

## Extending Health Checks

### Adding Custom Health Checks

To add additional health checks, modify the `getHealthStatus()` function in `health-check.js`:

```javascript
function getHealthStatus() {
    // ... existing code ...
    
    // Add custom database health check
    const databaseHealth = await checkDatabaseConnection();
    
    // Add custom external service health check
    const externalServiceHealth = await checkExternalService();
    
    // Update health status based on custom checks
    const isHealthy = uptimeSeconds >= UPTIME_MINIMUM_SECONDS && 
                     processMemoryMB < MEMORY_THRESHOLD_MB &&
                     databaseHealth.connected &&
                     externalServiceHealth.responsive;
    
    // Add custom check results to the response
    const healthStatus = {
        // ... existing properties ...
        checks: {
            uptime: uptimeSeconds >= UPTIME_MINIMUM_SECONDS,
            memory: processMemoryMB < MEMORY_THRESHOLD_MB,
            environment: ['development', 'production', 'test'].includes(ENVIRONMENT),
            database: databaseHealth.connected,
            externalService: externalServiceHealth.responsive
        },
        customChecks: {
            database: databaseHealth,
            externalService: externalServiceHealth
        }
    };
    
    return healthStatus;
}
```

### Example: Database Health Check

```javascript
/**
 * Checks database connectivity and response time
 * @returns {Promise<Object>} Database health status
 */
async function checkDatabaseConnection() {
    try {
        const startTime = Date.now();
        
        // Replace with your actual database connection check
        // const result = await db.query('SELECT 1');
        
        const responseTime = Date.now() - startTime;
        
        return {
            connected: true,
            responseTime: responseTime,
            status: 'healthy'
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message,
            status: 'unhealthy'
        };
    }
}
```

### Example: External Service Health Check

```javascript
/**
 * Checks external service availability
 * @returns {Promise<Object>} External service health status
 */
async function checkExternalService() {
    try {
        const startTime = Date.now();
        
        // Replace with your actual external service check
        // const response = await fetch('https://api.example.com/health');
        
        const responseTime = Date.now() - startTime;
        
        return {
            responsive: true,
            responseTime: responseTime,
            status: 'healthy'
        };
    } catch (error) {
        return {
            responsive: false,
            error: error.message,
            status: 'unhealthy'
        };
    }
}
```

## Best Practices

### Development Best Practices

1. **Keep Health Checks Lightweight**: Avoid heavy computations or blocking operations in health checks
2. **Use Appropriate Timeouts**: Set reasonable timeouts for external service checks
3. **Implement Graceful Degradation**: Distinguish between critical and non-critical health checks
4. **Monitor Health Check Performance**: Track health check response times and resource usage

### Production Deployment

1. **Run as Separate Process**: Start the health check server independently of the main application
2. **Use Process Managers**: Employ PM2, systemd, or similar tools to manage the health check process
3. **Configure Monitoring**: Set up monitoring alerts based on health check responses
4. **Implement Circuit Breakers**: Prevent cascading failures by implementing circuit breaker patterns

### Security Considerations

1. **Limit Information Exposure**: Avoid including sensitive information in health check responses
2. **Use Internal Networks**: Restrict health check endpoints to internal networks when possible
3. **Implement Rate Limiting**: Prevent abuse by implementing rate limiting on health check endpoints
4. **Monitor Access Logs**: Track health check endpoint access for security monitoring

### Performance Optimization

1. **Cache Health Status**: Cache health check results for a short period to reduce system load
2. **Use Async Operations**: Implement asynchronous health checks for better performance
3. **Optimize Resource Checks**: Use efficient methods for checking system resources
4. **Implement Health Check Hierarchies**: Use different health check levels for different monitoring needs

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
ERROR: Health check server port 8080 is already in use
```
**Solution**: Change the port using the `HEALTH_PORT` environment variable:
```bash
HEALTH_PORT=9090 node infrastructure/monitoring/health-check.js
```

#### Permission Denied
```bash
ERROR: Insufficient permissions to bind to port 8080
```
**Solution**: Use a port number above 1024 or run with elevated privileges:
```bash
HEALTH_PORT=8080 node infrastructure/monitoring/health-check.js
```

#### Health Check Not Responding
**Symptoms**: Health check endpoint returns no response or times out
**Troubleshooting Steps**:
1. Check if the health check server is running: `ps aux | grep health-check`
2. Verify the port is correct: `netstat -tlnp | grep 8080`
3. Check firewall settings: `sudo ufw status`
4. Review server logs for errors

#### High Memory Usage
**Symptoms**: Health check reports degraded status due to memory usage
**Troubleshooting Steps**:
1. Check current memory usage: `free -h`
2. Identify memory-consuming processes: `top -o %MEM`
3. Restart the application if memory usage is excessive
4. Review application code for memory leaks

#### Slow Response Times
**Symptoms**: Health check response times exceed thresholds
**Troubleshooting Steps**:
1. Check system load: `uptime`
2. Monitor CPU usage: `htop`
3. Check disk I/O: `iostat -x 1`
4. Review network connectivity

### Debugging Tools

#### Health Check Status
```bash
# Get detailed health status
curl -v http://localhost:8080/health | jq '.'

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/health
```

#### Process Monitoring
```bash
# Monitor health check process
ps aux | grep health-check

# Check process resource usage
top -p $(pgrep -f health-check)

# Monitor file descriptors
lsof -p $(pgrep -f health-check)
```

#### Network Diagnostics
```bash
# Check if port is listening
netstat -tlnp | grep 8080

# Test connectivity
telnet localhost 8080

# Check DNS resolution
nslookup localhost
```

### Log Analysis

The health check server provides detailed logging for troubleshooting:

```bash
# Monitor health check logs
tail -f /var/log/health-check.log

# Search for error patterns
grep -i error /var/log/health-check.log

# Analyze response times
grep "Response time" /var/log/health-check.log | awk '{print $NF}'
```

## References

### Related Documentation
- [API Documentation](../../src/backend/docs/api.md) - Complete API reference for the main application
- [Troubleshooting Guide](../../src/backend/docs/troubleshooting.md) - Comprehensive troubleshooting information
- [Configuration Guide](../../src/backend/config/README.md) - Application configuration details

### Docker and Containerization
- [Dockerfile](../docker/Dockerfile) - Container build configuration
- [Docker Compose](../docker/docker-compose.yml) - Multi-container deployment setup
- [Container Best Practices](../docker/README.md) - Docker deployment guidelines

### Kubernetes and Orchestration
- [Kubernetes Manifests](../k8s/) - Kubernetes deployment configurations
- [Helm Charts](../helm/) - Kubernetes package management
- [Monitoring Stack](../monitoring/k8s/) - Kubernetes monitoring setup

### External Resources
- [Node.js Health Checks](https://nodejs.org/en/docs/guides/simple-profiling/) - Official Node.js profiling and monitoring
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html) - Security and performance guidelines
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) - Kubernetes probe configuration
- [Docker Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck) - Docker health check documentation
- [Prometheus Monitoring](https://prometheus.io/docs/practices/monitoring/) - Monitoring best practices
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/) - Visualization and alerting

### Standards and Specifications
- [HTTP Status Codes](https://httpstatuses.com/) - HTTP response code reference
- [JSON Schema](https://json-schema.org/) - JSON data validation
- [OpenAPI Specification](https://swagger.io/specification/) - API documentation standard
- [Health Check Response Format](https://inadarei.github.io/rfc-healthcheck/) - Health check API specification

---

**Note**: This health check system is designed for educational and production use. For mission-critical applications, consider implementing additional monitoring solutions such as APM tools, distributed tracing, and comprehensive observability platforms.