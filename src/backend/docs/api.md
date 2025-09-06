# Node.js Tutorial API Documentation

## Overview

This API documentation serves as a comprehensive reference for the **Node.js Tutorial Application**, an educational HTTP server built with **Express.js 5.1.0** and **Node.js 22.11.0 LTS**. The application demonstrates fundamental web development concepts through practical examples, featuring a simple REST API with health monitoring capabilities.

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000`  
**Content Format:** RESTful HTTP API  
**Framework:** Express.js 5.1.0 with automatic promise error handling  

### Educational Objectives

- **HTTP Protocol Fundamentals**: Understanding request/response cycles, status codes, and headers
- **Express.js Patterns**: Route definition, middleware integration, and async/await handling
- **API Documentation**: Learning proper endpoint specification and client integration
- **Health Monitoring**: Implementing production-ready health check patterns
- **Error Handling**: Comprehensive error response patterns and HTTP status code usage

---

## Base Configuration

- **Server Address**: `localhost:3000`
- **Protocol**: HTTP/1.1
- **Timeout**: 30 seconds
- **Keep-Alive**: Enabled
- **Authentication**: None (educational simplicity)
- **Rate Limiting**: Not implemented
- **CORS**: Not configured (localhost development only)

---

## API Endpoints

### 1. Hello World Endpoint

#### GET /hello

The primary tutorial endpoint that demonstrates basic HTTP request/response patterns with Express.js.

**Summary**: Returns a simple "Hello world" greeting message  
**Purpose**: Educational demonstration of HTTP GET requests and plain text responses  

##### Request Specification

```http
GET /hello HTTP/1.1
Host: localhost:3000
Accept: text/plain
```

##### Request Parameters

- **Method**: `GET` (Required)
- **Path**: `/hello` (Fixed)
- **Query Parameters**: None
- **Request Body**: None
- **Headers**: 
  - `Accept: text/plain` (Optional, defaults to text/plain)

##### Response Specification

**Success Response (200 OK)**

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
X-Correlation-ID: hello-1703025600000-abc123
X-Controller: hello
X-Response-Time: 2

Hello world
```

**Response Headers:**
- `Content-Type`: `text/plain; charset=utf-8`
- `Content-Length`: `11`
- `X-Correlation-ID`: Unique request identifier for tracing
- `X-Controller`: Controller name for debugging
- `X-Response-Time`: Response time in milliseconds

##### Error Responses

**Method Not Allowed (405)**

Returned when using HTTP methods other than GET:

```http
HTTP/1.1 405 Method Not Allowed
Allow: GET
Content-Type: text/plain; charset=utf-8
X-Correlation-ID: hello-1703025600001-def456

The HTTP method is not allowed for this endpoint
```

**Internal Server Error (500)**

```json
{
  "error": {
    "type": "INTERNAL_SERVER_ERROR",
    "message": "An internal server error occurred while processing your request",
    "correlation_id": "hello-1703025600002-ghi789",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "controller": "helloController"
  }
}
```

##### Examples

**cURL Command**

```bash
curl http://localhost:3000/hello
```

**JavaScript Fetch API**

```javascript
fetch('http://localhost:3000/hello')
  .then(response => response.text())
  .then(data => console.log(data)); // "Hello world"
```

**Node.js HTTP Client**

```javascript
const http = require('http');

http.get('http://localhost:3000/hello', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data)); // "Hello world"
});
```

---

### 2. Health Check Endpoint

#### GET /health

Comprehensive application health status endpoint with optional detailed system metrics.

**Summary**: Returns application health status with system information  
**Purpose**: Application monitoring and operational visibility  

##### Request Specification

```http
GET /health HTTP/1.1
Host: localhost:3000
Accept: application/json
```

##### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `detailed` | boolean | No | `false` | Request detailed health information including system metrics |
| `format` | string | No | `json` | Response format (`json` or `text`) |
| `timeout` | integer | No | `5` | Health check timeout in seconds (1-30) |
| `include` | string | No | `""` | Comma-separated list: `metrics`, `system`, `performance` |

##### Response Specification

**Basic Health Response (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "metadata": {
    "correlationId": "health-1703025600000-abc123",
    "responseTime": 15.25,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "endpoint": "/health",
    "detailed": false
  }
}
```

**Detailed Health Response (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "system": {
    "nodeVersion": "v22.11.0",
    "platform": "linux",
    "pid": 12345,
    "memoryUsage": {
      "rss": 45678912,
      "heapTotal": 12345678,
      "heapUsed": 8765432,
      "external": 1234567,
      "arrayBuffers": 123456
    },
    "cpuUsage": {
      "user": 123456,
      "system": 78912
    }
  },
  "performance": {
    "averageResponseTime": 12.5,
    "requestCount": 157,
    "successRate": 99.3,
    "errorRate": 0.7
  },
  "metadata": {
    "correlationId": "health-1703025600001-def456",
    "responseTime": 23.45,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "endpoint": "/health",
    "detailed": true
  }
}
```

##### Error Responses

**Service Unavailable (503)**

```json
{
  "success": false,
  "error": true,
  "status": "error",
  "message": "The service is temporarily unavailable. Please try again later",
  "correlationId": "health-1703025600002-ghi789",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "endpoint": "/health"
}
```

##### Examples

**Basic Health Check**

```bash
curl http://localhost:3000/health
```

**Detailed Health Check**

```bash
curl "http://localhost:3000/health?detailed=true&include=metrics,system"
```

**JavaScript with Error Handling**

```javascript
async function checkHealth(detailed = false) {
  try {
    const url = `http://localhost:3000/health${detailed ? '?detailed=true' : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('Health Status:', data.status);
      console.log('Uptime:', data.uptime, 'seconds');
      return data;
    } else {
      console.error('Health Check Failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Network Error:', error.message);
    return null;
  }
}

// Usage
checkHealth(true).then(health => {
  if (health) {
    console.log('System is healthy');
  }
});
```

---

### 3. Kubernetes Liveness Probe

#### GET /livez

Kubernetes-compatible liveness probe endpoint for container restart decisions.

**Summary**: Kubernetes liveness probe for container health monitoring  
**Purpose**: Container orchestration and automatic restart decisions  
**Target Response Time**: < 10ms  

##### Request Specification

```http
GET /livez HTTP/1.1
Host: localhost:3000
Accept: application/json
```

##### Response Specification

**Alive Response (200 OK)**

```json
{
  "status": "ok",
  "alive": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 3.25
}
```

**Dead Response (503 Service Unavailable)**

```json
{
  "status": "unhealthy",
  "alive": false,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 8.75
}
```

##### Kubernetes Integration

**Deployment Configuration Example**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: nodejs-tutorial
    image: nodejs-tutorial:1.0.0
    livenessProbe:
      httpGet:
        path: /livez
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3
```

##### Examples

```bash
# Basic liveness check
curl http://localhost:3000/livez

# With timing
curl -w "@curl-format.txt" http://localhost:3000/livez
```

---

### 4. Kubernetes Readiness Probe

#### GET /readyz

Kubernetes-compatible readiness probe endpoint for traffic routing decisions.

**Summary**: Kubernetes readiness probe for traffic routing control  
**Purpose**: Load balancer integration and traffic routing decisions  
**Target Response Time**: < 25ms  

##### Request Specification

```http
GET /readyz HTTP/1.1
Host: localhost:3000
Accept: application/json
```

##### Response Specification

**Ready Response (200 OK)**

```json
{
  "status": "ok",
  "ready": true,
  "dependencies": {
    "database": {
      "status": "healthy",
      "responseTime": 5.2
    },
    "cache": {
      "status": "healthy",
      "responseTime": 1.8
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 12.45
}
```

**Not Ready Response (503 Service Unavailable)**

```json
{
  "status": "unhealthy",
  "ready": false,
  "dependencies": {
    "database": {
      "status": "unhealthy",
      "responseTime": 5000.0,
      "error": "connection_timeout"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 18.75
}
```

##### Kubernetes Integration

**Service Configuration Example**

```yaml
apiVersion: v1
kind: Service
spec:
  selector:
    app: nodejs-tutorial
  ports:
  - port: 3000
---
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: nodejs-tutorial
    readinessProbe:
      httpGet:
        path: /readyz
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3
```

---

## Global Error Responses

### Common HTTP Status Codes

| Status Code | Status Text | Description | Example Scenario |
|-------------|-------------|-------------|------------------|
| 200 | OK | Request successful | Successful GET /hello |
| 400 | Bad Request | Invalid request format | Malformed query parameters |
| 404 | Not Found | Route not found | GET /unknown-endpoint |
| 405 | Method Not Allowed | HTTP method not supported | POST /hello |
| 500 | Internal Server Error | Unexpected server error | Application crash |
| 503 | Service Unavailable | Service temporarily down | Health check failure |

### Error Response Format

**Standard Error Response Structure**

```json
{
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "correlation_id": "request-1703025600000-abc123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "endpoint": "/api/endpoint"
  },
  "debugging_info": {
    "error_name": "ValidationError",
    "request_method": "POST",
    "request_path": "/hello"
  }
}
```

### Route Not Found (404)

```json
{
  "error": {
    "type": "ROUTE_NOT_FOUND",
    "message": "The requested route was not found on this server",
    "correlation_id": "unknown-1703025600000-abc123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Development and Testing

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode  
npm start

# With environment variables
NODE_ENV=development PORT=3000 npm start
```

### Testing Endpoints

**Complete Test Suite**

```bash
#!/bin/bash
# test-api.sh

echo "Testing Hello Endpoint..."
curl -i http://localhost:3000/hello
echo -e "\n"

echo "Testing Method Not Allowed..."
curl -i -X POST http://localhost:3000/hello
echo -e "\n"

echo "Testing Basic Health..."
curl -i http://localhost:3000/health
echo -e "\n"

echo "Testing Detailed Health..."
curl -i "http://localhost:3000/health?detailed=true"
echo -e "\n"

echo "Testing Liveness Probe..."
curl -i http://localhost:3000/livez
echo -e "\n"

echo "Testing Readiness Probe..."
curl -i http://localhost:3000/readyz
echo -e "\n"

echo "Testing 404 Not Found..."
curl -i http://localhost:3000/nonexistent
echo -e "\n"
```

### Performance Testing

```bash
# Basic load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/hello

# Health endpoint performance
ab -n 500 -c 5 http://localhost:3000/health

# Kubernetes probe performance
ab -n 1000 -c 20 http://localhost:3000/livez
```

---

## Implementation Notes

### Express.js 5.1.0 Features

- **Automatic Promise Error Handling**: Async route handlers automatically catch promise rejections
- **Enhanced Security**: Built-in security improvements and vulnerability fixes
- **Performance Optimizations**: Improved routing performance and memory usage
- **Better TypeScript Support**: Enhanced type definitions and IntelliSense

### Request Processing Flow

1. **Request Reception**: Express.js receives HTTP request
2. **Correlation ID Generation**: Unique ID created for request tracking
3. **Middleware Pipeline**: Security, logging, and validation middleware
4. **Controller Execution**: Business logic processing with service layer
5. **Response Generation**: HTTP response formatting with proper headers
6. **Performance Logging**: Response time and operational metrics recording

### Educational Patterns Demonstrated

- **Separation of Concerns**: Routes → Controllers → Services architecture
- **Error Handling**: Comprehensive error processing with proper HTTP status codes
- **Logging**: Structured logging with correlation IDs and performance metrics
- **Health Monitoring**: Production-ready health check implementation
- **HTTP Protocol**: Proper use of status codes, headers, and content types

---

## Conclusion

This API documentation provides a comprehensive reference for the Node.js Tutorial Application, demonstrating fundamental web development concepts through practical implementation. The application serves as an educational foundation for learning Node.js, Express.js, and REST API development patterns while incorporating production-ready practices like health monitoring and proper error handling.

For additional learning resources and extended functionality, refer to the source code in the `src/` directory and the comprehensive inline documentation provided throughout the codebase.

---

**Documentation Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Maintained By**: Node.js Tutorial Team  
**License**: Educational Use