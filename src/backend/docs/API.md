# Node.js Tutorial Application API Documentation

## Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Base URL and Configuration](#base-url-and-configuration)
- [Endpoints](#endpoints)
- [Request/Response Examples](#requestresponse-examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Client Integration Examples](#client-integration-examples)
- [Testing and Validation](#testing-and-validation)
- [Educational Content](#educational-content)
- [Troubleshooting](#troubleshooting)
- [Changelog and Versioning](#changelog-and-versioning)

## API Overview

### Introduction

Welcome to the **Node.js Tutorial Application API Documentation**. This comprehensive guide documents the HTTP API for a Node.js tutorial application that demonstrates fundamental web server concepts using Express.js 5.1.0 and Node.js v22.x LTS.

**Application Details:**
- **Name:** nodejs-tutorial-app
- **Version:** 1.0.0
- **API Version:** v1
- **Description:** Node.js Tutorial Application demonstrating HTTP server fundamentals with Express.js 5.1.0

### Educational Objectives

This API serves as a foundational learning resource for:
- **HTTP Server Fundamentals**: Understanding basic HTTP request/response cycles
- **Express.js Framework Usage**: Implementing web application frameworks with modern JavaScript
- **Node.js Development Patterns**: Demonstrating server-side JavaScript development
- **API Documentation Best Practices**: Learning comprehensive API documentation structure
- **Error Handling Strategies**: Implementing robust error handling in web applications

### Technology Stack

- **Runtime Environment**: Node.js v22.x LTS (Active LTS until October 2025)
- **Web Framework**: Express.js 5.1.0 (Latest stable release with security improvements)
- **HTTP Protocol**: HTTP/1.1 with keep-alive support
- **Response Format**: Plain text (Hello world endpoint)

## Authentication

### No Authentication Required

This tutorial application **does not require authentication** for accessing endpoints. All endpoints are publicly accessible for educational and demonstration purposes.

**Security Note**: In production environments, consider implementing appropriate authentication mechanisms such as:
- JWT (JSON Web Tokens) for stateless authentication
- OAuth 2.0 for third-party integration
- API keys for service-to-service communication
- Session-based authentication for web applications

## Base URL and Configuration

### Development Environment

**Base URL**: `http://localhost:3000`

### Environment Configuration

| Parameter | Default Value | Environment Variable | Description |
|-----------|---------------|---------------------|-------------|
| Port | 3000 | `PORT` | Server listening port |
| Host | localhost | `HOST` | Server binding address |
| Node Environment | development | `NODE_ENV` | Application environment |

### Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install express@5.1.0
   ```

2. **Start the Server**:
   ```bash
   npm start
   # or
   node src/backend/server.js
   ```

3. **Verify Server Status**:
   ```bash
   curl http://localhost:3000/hello
   ```

## Endpoints

### GET /hello

Returns a simple "Hello world" greeting message to demonstrate basic HTTP GET request handling.

#### Endpoint Specification

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/hello` |
| **Summary** | Returns Hello world greeting |
| **Description** | Simple endpoint demonstrating HTTP GET request handling in Express.js |
| **Content-Type** | text/plain |

#### Request Parameters

**Path Parameters**: None
**Query Parameters**: None  
**Request Headers**: No specific headers required

#### Request Body

Not applicable for GET requests.

#### Response Format

**Successful Response (200 OK)**:
```
Hello world
```

**Response Headers**:
```
Content-Type: text/plain; charset=utf-8
Content-Length: 11
X-Powered-By: Express (disabled for security)
Date: Sat, 07 Dec 2024 10:30:00 GMT
Connection: keep-alive
```

#### Status Codes

| Status Code | Description | Response Body |
|-------------|-------------|---------------|
| **200 OK** | Successful request | `Hello world` |
| **404 Not Found** | Endpoint not found | `{"error": {"status": 404, "message": "The requested route was not found on this server", "timestamp": "2024-12-07T10:30:00.000Z"}}` |
| **405 Method Not Allowed** | HTTP method not supported | `{"error": {"status": 405, "message": "The requested HTTP method is not allowed for this endpoint", "timestamp": "2024-12-07T10:30:00.000Z"}}` |
| **500 Internal Server Error** | Server processing error | `{"error": {"status": 500, "message": "An internal server error occurred. Please try again later.", "timestamp": "2024-12-07T10:30:00.000Z"}}` |

## Request/Response Examples

### cURL Examples

#### Successful Request
```bash
curl -X GET http://localhost:3000/hello
```

**Response**:
```
Hello world
```

#### Request with Headers
```bash
curl -X GET http://localhost:3000/hello \
  -H "Accept: text/plain" \
  -H "User-Agent: Tutorial-Client/1.0" \
  -v
```

#### Invalid Method Example
```bash
curl -X POST http://localhost:3000/hello
```

**Response**:
```json
{
  "error": {
    "status": 405,
    "message": "The requested HTTP method is not allowed for this endpoint",
    "timestamp": "2024-12-07T10:30:00.000Z"
  }
}
```

### JavaScript Fetch API

#### Basic Fetch Request
```javascript
fetch('http://localhost:3000/hello')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(data => {
    console.log('Response:', data); // "Hello world"
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

#### Async/Await Implementation
```javascript
async function fetchHelloMessage() {
  try {
    const response = await fetch('http://localhost:3000/hello');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const message = await response.text();
    console.log('Hello message:', message);
    return message;
  } catch (error) {
    console.error('Failed to fetch hello message:', error);
    throw error;
  }
}

// Usage
fetchHelloMessage();
```

### Node.js HTTP Client

#### Using Built-in HTTP Module
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/hello',
  method: 'GET',
  headers: {
    'Accept': 'text/plain',
    'User-Agent': 'Node.js-Tutorial-Client/1.0'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data); // "Hello world"
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();
```

#### Using Axios Library
```javascript
const axios = require('axios');

// Basic request
axios.get('http://localhost:3000/hello')
  .then(response => {
    console.log('Status:', response.status);
    console.log('Data:', response.data); // "Hello world"
    console.log('Headers:', response.headers);
  })
  .catch(error => {
    console.error('Request failed:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  });

// With async/await
async function getHelloMessage() {
  try {
    const response = await axios.get('http://localhost:3000/hello');
    return response.data;
  } catch (error) {
    console.error('Request error:', error.message);
    throw error;
  }
}
```

### Python Requests

```python
import requests
import json

# Basic request
try:
    response = requests.get('http://localhost:3000/hello')
    response.raise_for_status()  # Raise an exception for bad status codes
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")  # "Hello world"
    print(f"Headers: {dict(response.headers)}")
    
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")

# With error handling
def fetch_hello_message():
    try:
        response = requests.get(
            'http://localhost:3000/hello',
            headers={
                'Accept': 'text/plain',
                'User-Agent': 'Python-Tutorial-Client/1.0'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            return response.text
        else:
            print(f"Unexpected status code: {response.status_code}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("Failed to connect to the server")
    except requests.exceptions.Timeout:
        print("Request timed out")
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
    
    return None

# Usage
message = fetch_hello_message()
if message:
    print(f"Received: {message}")
```

## Error Handling

### Error Response Format

All error responses follow a consistent JSON structure:

```json
{
  "error": {
    "status": 404,
    "message": "The requested route was not found on this server",
    "timestamp": "2024-12-07T10:30:00.000Z",
    "path": "/invalid-endpoint",
    "method": "GET"
  }
}
```

### Error Scenarios

#### 404 Not Found
**Triggered when**: Requesting a non-existent endpoint

**Example Request**:
```bash
curl http://localhost:3000/invalid-endpoint
```

**Response**:
```json
{
  "error": {
    "status": 404,
    "message": "The requested route was not found on this server",
    "timestamp": "2024-12-07T10:30:00.000Z"
  }
}
```

#### 405 Method Not Allowed
**Triggered when**: Using an unsupported HTTP method

**Example Request**:
```bash
curl -X POST http://localhost:3000/hello
```

**Response**:
```json
{
  "error": {
    "status": 405,
    "message": "The requested HTTP method is not allowed for this endpoint",
    "timestamp": "2024-12-07T10:30:00.000Z"
  }
}
```

#### 500 Internal Server Error
**Triggered when**: Server encounters an unexpected error

**Response**:
```json
{
  "error": {
    "status": 500,
    "message": "An internal server error occurred. Please try again later.",
    "timestamp": "2024-12-07T10:30:00.000Z"
  }
}
```

### Error Handling Best Practices

1. **Always Check Status Codes**: Verify HTTP status codes before processing responses
2. **Handle Network Errors**: Implement timeout and connection error handling
3. **Parse Error Responses**: Extract error details from JSON error responses
4. **Implement Retry Logic**: Consider retrying failed requests with exponential backoff
5. **Log Error Details**: Maintain comprehensive error logs for debugging

## Rate Limiting

### Current Implementation

**Rate limiting is not implemented** in this tutorial application to maintain simplicity for educational purposes.

### Production Considerations

For production deployments, consider implementing:

- **Request Rate Limiting**: Limit requests per IP address (e.g., 100 requests/minute)
- **Burst Protection**: Handle sudden traffic spikes gracefully
- **API Key-Based Limits**: Different limits for different client types
- **Sliding Window Limits**: More sophisticated rate limiting algorithms

**Example Rate Limiting Implementation**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/hello', limiter);
```

## Client Integration Examples

### React.js Integration

```jsx
import React, { useState, useEffect } from 'react';

function HelloComponent() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHelloMessage = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/hello');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        setMessage(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHelloMessage();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Hello API Response</h1>
      <p>{message}</p>
    </div>
  );
}

export default HelloComponent;
```

### Vue.js Integration

```vue
<template>
  <div>
    <h1>Hello API Response</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <p v-else>{{ message }}</p>
    <button @click="refreshMessage">Refresh</button>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'HelloComponent',
  data() {
    return {
      message: '',
      loading: false,
      error: null
    };
  },
  async mounted() {
    await this.fetchHelloMessage();
  },
  methods: {
    async fetchHelloMessage() {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.get('http://localhost:3000/hello');
        this.message = response.data;
      } catch (error) {
        this.error = error.message;
        console.error('Failed to fetch hello message:', error);
      } finally {
        this.loading = false;
      }
    },
    async refreshMessage() {
      await this.fetchHelloMessage();
    }
  }
};
</script>
```

### Express.js Proxy Integration

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Proxy hello requests to tutorial API
app.use('/api/hello', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/hello': '/hello'
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({
      error: 'Proxy request failed'
    });
  }
}));

app.listen(8080, () => {
  console.log('Proxy server running on port 8080');
});
```

### Docker Integration

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/hello || exit 1

# Start application
CMD ["npm", "start"]
```

**Docker Compose Example**:
```yaml
version: '3.8'
services:
  nodejs-tutorial-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/hello"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Testing and Validation

### Manual Testing with cURL

```bash
# Test successful request
curl -v http://localhost:3000/hello

# Test with different methods
curl -X POST http://localhost:3000/hello
curl -X PUT http://localhost:3000/hello
curl -X DELETE http://localhost:3000/hello

# Test invalid endpoints
curl http://localhost:3000/invalid
curl http://localhost:3000/api/hello

# Test with custom headers
curl -H "Accept: application/json" http://localhost:3000/hello
curl -H "User-Agent: Test-Client/1.0" http://localhost:3000/hello
```

### Automated Testing Examples

#### Node.js Test Runner
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'http';
import request from 'supertest';
import app from '../src/backend/server.js';

describe('Hello API Endpoint', () => {
  test('should return Hello world for GET /hello', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200)
      .expect('Content-Type', /text\/plain/);
    
    assert.strictEqual(response.text, 'Hello world');
  });

  test('should return 405 for POST /hello', async () => {
    const response = await request(app)
      .post('/hello')
      .expect(405)
      .expect('Content-Type', /application\/json/);
    
    assert.strictEqual(response.body.error.status, 405);
  });

  test('should return 404 for invalid endpoints', async () => {
    const response = await request(app)
      .get('/invalid')
      .expect(404)
      .expect('Content-Type', /application\/json/);
    
    assert.strictEqual(response.body.error.status, 404);
  });
});
```

#### Performance Testing
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/backend/server.js';

test('should respond within 100ms', async () => {
  const startTime = Date.now();
  
  await request(app)
    .get('/hello')
    .expect(200);
  
  const responseTime = Date.now() - startTime;
  assert(responseTime < 100, `Response time ${responseTime}ms exceeds 100ms limit`);
});

test('should handle concurrent requests', async () => {
  const promises = Array(10).fill().map(() => 
    request(app).get('/hello').expect(200)
  );
  
  const responses = await Promise.all(promises);
  responses.forEach(response => {
    assert.strictEqual(response.text, 'Hello world');
  });
});
```

## Educational Content

### HTTP Protocol Concepts

#### Understanding HTTP GET Requests

The `/hello` endpoint demonstrates fundamental HTTP GET request concepts:

**Request Structure**:
```
GET /hello HTTP/1.1
Host: localhost:3000
Accept: text/plain
User-Agent: curl/7.68.0
```

**Response Structure**:
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11
Date: Sat, 07 Dec 2024 10:30:00 GMT
Connection: keep-alive

Hello world
```

#### Express.js Framework Patterns

**Route Definition**:
```javascript
const express = require('express');
const app = express();

// Simple route handler
app.get('/hello', (req, res) => {
  res.send('Hello world');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      status: 500,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});
```

#### Node.js Event-Driven Architecture

Node.js uses an event-driven, non-blocking I/O model that makes it ideal for building scalable web applications:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // Non-blocking request handling
  console.log(`${req.method} ${req.url}`);
  
  if (req.method === 'GET' && req.url === '/hello') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello world');
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: { status: 404, message: 'Not found' }
    }));
  }
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### RESTful API Design Principles

#### Resource-Based URLs
- **Good**: `/hello` (represents a greeting resource)
- **Avoid**: `/getHello` or `/sayHello` (verb-based)

#### HTTP Method Usage
- **GET**: Retrieve data (idempotent, safe)
- **POST**: Create resources (not idempotent)
- **PUT**: Update/replace resources (idempotent)
- **DELETE**: Remove resources (idempotent)

#### Status Code Best Practices
- **2xx**: Success responses
  - `200 OK`: Successful GET requests
  - `201 Created`: Successful resource creation
  - `204 No Content`: Successful action with no response body
- **4xx**: Client errors
  - `400 Bad Request`: Invalid request format
  - `404 Not Found`: Resource not found
  - `405 Method Not Allowed`: HTTP method not supported
- **5xx**: Server errors
  - `500 Internal Server Error`: Unexpected server error

### Performance Optimization

#### Express.js 5.1.0 Improvements
- **Security Enhancements**: CVE-2024-45590 mitigation
- **ReDoS Attack Prevention**: Regular expression optimization
- **Modern JavaScript Support**: Enhanced async/await error handling
- **Performance Optimizations**: Improved middleware processing

#### Node.js v22.x LTS Benefits
- **Long-term Support**: Security updates until October 2025
- **Performance Improvements**: V8 engine optimizations
- **Modern Language Features**: Latest JavaScript language support
- **Stability**: Production-ready with comprehensive testing

## Troubleshooting

### Common Issues and Solutions

#### Server Won't Start

**Problem**: `Error: listen EADDRINUSE :::3000`
**Solution**: Port 3000 is already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

**Problem**: `Error: Cannot find module 'express'`
**Solution**: Express.js not installed
```bash
npm install express@5.1.0
```

#### Request/Response Issues

**Problem**: `curl: (7) Failed to connect to localhost port 3000`
**Solution**: Server not running
```bash
# Start the server
npm start

# Verify server is listening
curl http://localhost:3000/hello
```

**Problem**: Receiving HTML instead of plain text
**Solution**: Check Accept header
```bash
# Correct request
curl -H "Accept: text/plain" http://localhost:3000/hello
```

#### Performance Issues

**Problem**: Slow response times
**Solution**: Check server logs and monitor resource usage
```bash
# Monitor server performance
top -p $(pgrep node)

# Check response times
curl -w "@curl-format.txt" http://localhost:3000/hello
```

**curl-format.txt**:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### Development Environment Setup

#### Prerequisites Checklist
- [ ] Node.js v18+ installed (v22.x LTS recommended)
- [ ] npm or yarn package manager
- [ ] Text editor or IDE (VS Code recommended)
- [ ] Terminal/command line access
- [ ] curl or Postman for API testing

#### Installation Verification
```bash
# Verify Node.js version
node --version  # Should be v18+ (v22.x preferred)

# Verify npm version
npm --version

# Verify Express.js installation
npm list express
```

#### Environment Variables
```bash
# Development environment
export NODE_ENV=development
export PORT=3000
export HOST=localhost

# Debug mode (optional)
export DEBUG=express:*
```

### FAQ

**Q: Why does the API return plain text instead of JSON?**
A: The `/hello` endpoint is designed for simplicity and returns plain text to demonstrate basic HTTP responses. Production APIs typically return JSON.

**Q: Can I modify the response message?**
A: Yes, modify the response message in the route handler:
```javascript
app.get('/hello', (req, res) => {
  res.send('Custom greeting message');
});
```

**Q: How do I add authentication to the API?**
A: Authentication is beyond the tutorial scope, but you can add middleware:
```javascript
const authenticate = (req, res, next) => {
  // Authentication logic here
  next();
};

app.get('/hello', authenticate, (req, res) => {
  res.send('Hello world');
});
```

**Q: Can I deploy this to production?**
A: This is a tutorial application. For production deployment, consider:
- Environment-based configuration
- Process management (PM2)
- Reverse proxy (Nginx)
- SSL/TLS certificates
- Monitoring and logging
- Security hardening

## Changelog and Versioning

### Version 1.0.0 (Current)

**Release Date**: December 7, 2024

**Features**:
- Initial release of Node.js tutorial API
- Single `/hello` endpoint with GET method support
- Express.js 5.1.0 framework integration
- Node.js v22.x LTS compatibility
- Comprehensive error handling
- Educational documentation and examples

**Technical Specifications**:
- HTTP/1.1 protocol support
- Plain text response format
- RESTful URL structure
- Standardized error response format
- Console-based logging

**Security**:
- Express.js 5.1.0 security improvements
- CVE-2024-45590 mitigation
- ReDoS attack prevention
- Secure default configuration

### Future Roadmap

#### Version 1.1.0 (Planned)
- Additional tutorial endpoints (`/health`, `/info`)
- JSON response format options
- Request logging middleware
- Performance metrics collection

#### Version 2.0.0 (Planned)
- Authentication and authorization
- Database integration examples
- Advanced error handling
- API versioning support
- OpenAPI/Swagger documentation

### Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **Major version** (X.0.0): Breaking changes
- **Minor version** (1.X.0): New features, backward compatible
- **Patch version** (1.0.X): Bug fixes, backward compatible

### Support and Maintenance

- **Current Version**: v1.0.0 (Active development)
- **LTS Support**: Following Node.js LTS schedule
- **Security Updates**: Applied as needed
- **Documentation Updates**: Maintained with each release

---

**Documentation Version**: 1.0.0  
**Last Updated**: December 7, 2024  
**API Version**: v1  
**Framework**: Express.js 5.1.0  
**Runtime**: Node.js v22.x LTS

For questions, issues, or contributions, please refer to the project repository or contact the development team.