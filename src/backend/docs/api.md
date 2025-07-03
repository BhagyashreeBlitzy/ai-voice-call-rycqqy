# Node.js Tutorial Backend API Documentation

## API Overview

### Base Information
- **Base URL**: `http://localhost:3000`
- **API Version**: v1
- **Base Path**: `/`
- **Protocol**: HTTP/1.1
- **Content Types**: `text/plain`, `application/json`
- **Authentication**: None required
- **Architecture**: RESTful, stateless

### Framework Information
- **Runtime**: Node.js v22.x LTS (Jod)
- **Framework**: Express.js v5.1.0
- **Error Handling**: Centralized middleware with standardized responses
- **Logging**: Structured logging with request/response tracking
- **Security**: Standard HTTP security headers via Helmet.js

### General Usage Guidelines

This API follows RESTful principles and maintains a stateless architecture. Each request is independent and contains all necessary information for processing. The server does not maintain session state between requests.

**Key Characteristics:**
- **Stateless Design**: No persistent state between requests
- **Immediate Response**: All endpoints provide synchronous responses
- **Error Transparency**: Clear error messages for debugging and integration
- **Educational Focus**: Designed for learning Node.js and Express.js fundamentals

**Express.js Integration:**
The API leverages Express.js v5.1.0 features including:
- Automatic Promise error handling for async/await patterns
- Enhanced security through CVE-2024-45590 mitigation
- ReDoS protection via path-to-regexp v8.x
- Modular router architecture for maintainable code organization

---

## Endpoints

### GET /hello

Returns a simple "Hello world" greeting message.

#### Request
- **Method**: `GET`
- **Path**: `/hello`
- **Headers**: None required
- **Body**: None
- **Query Parameters**: None
- **Authentication**: None required

#### Response

**Success Response (200 OK)**
```http
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Date: Wed, 15 Jan 2025 10:30:00 GMT

Hello world
```

**Response Headers:**
- `Content-Type: text/plain` - Plain text response format
- `Content-Length: 11` - Response body length in bytes
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks

#### Error Responses

**Method Not Allowed (405)**
```http
HTTP/1.1 405 Method Not Allowed
Content-Type: application/json
Allow: GET

{
  "error": true,
  "message": "Method Not Allowed",
  "status": 405,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/hello"
}
```

**Internal Server Error (500)**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": true,
  "message": "Internal Server Error",
  "status": 500,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/hello"
}
```

#### Implementation Details

**Controller**: `src/backend/controllers/helloController.js`
- Implements comprehensive logging for request/response tracking
- Utilizes centralized error handling with proper error propagation
- Supports Express.js v5 async/await patterns with automatic error forwarding

**Router**: `src/backend/routes/hello.js`
- Modular router implementation using Express.js Router
- Designed for integration with the main API router
- Follows factory pattern for testability and configuration

**Request Processing Flow:**
1. Express.js receives HTTP request
2. Request routing through main API router
3. Hello router processes GET /hello requests
4. Hello controller executes business logic
5. Response generation with proper headers
6. Centralized logging and error handling

---

## Error Handling

### Error Propagation Model

The API implements a centralized error handling system that ensures consistent error responses across all endpoints. All errors are processed through a unified error middleware that normalizes error formats and prevents sensitive information disclosure.

#### Error Flow Architecture

```
Request → Route Handler → Controller → Error (if any) → Error Middleware → Client Response
```

**Error Propagation Features:**
- **Automatic Error Forwarding**: Express.js v5 automatically forwards rejected promises to error middleware
- **Error Normalization**: All errors are converted to standardized `AppError` instances
- **Secure Error Responses**: Stack traces and internal details are never exposed to clients
- **Comprehensive Logging**: Full error details logged internally for debugging
- **Request Context**: Error logs include request metadata for traceability

### Error Response Format

All API errors follow a consistent JSON response format:

```json
{
  "error": true,
  "message": "Human-readable error description",
  "status": 400,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/hello"
}
```

**Response Fields:**
- `error`: Always `true` for error responses
- `message`: Human-readable error description (sanitized for security)
- `status`: HTTP status code matching the response status
- `timestamp`: ISO 8601 timestamp of when the error occurred
- `path`: Request path where the error occurred (when available)

### HTTP Status Codes

| Status Code | Description | Use Case | Example |
|-------------|-------------|----------|---------|
| 400 | Bad Request | Invalid request format or parameters | Malformed headers, invalid JSON |
| 404 | Not Found | Resource or endpoint not found | `/invalid-path` |
| 405 | Method Not Allowed | HTTP method not supported for endpoint | `POST /hello` |
| 500 | Internal Server Error | Unexpected server-side error | Application exceptions, system errors |
| 503 | Service Unavailable | Server temporarily unavailable | Server overload, maintenance mode |

### Error Handling Implementation

**Error Middleware**: `src/backend/middleware/errorHandler.js`
- Centralized error processing for all routes
- Secure error response generation
- Request context logging for debugging
- Automatic error normalization

**Error Utilities**: `src/backend/utils/errors.js`
- `AppError` class for structured error creation
- `normalizeError()` function for error standardization
- `errorResponse()` function for secure response generation

**Security Considerations:**
- Stack traces never exposed to clients
- Error messages sanitized to prevent information disclosure
- Internal error details logged securely for debugging
- OWASP security guidelines followed for error handling

---

## Examples

### cURL Commands

#### Successful Request
```bash
curl -X GET http://localhost:3000/hello
```

**Response:**
```
Hello world
```

#### Request with Verbose Output
```bash
curl -v -X GET http://localhost:3000/hello
```

**Response:**
```
* Connected to localhost (127.0.0.1) port 3000 (#0)
> GET /hello HTTP/1.1
> Host: localhost:3000
> User-Agent: curl/7.68.0
> Accept: */*
> 
< HTTP/1.1 200 OK
< Content-Type: text/plain
< Content-Length: 11
< X-Content-Type-Options: nosniff
< X-Frame-Options: DENY
< Date: Wed, 15 Jan 2025 10:30:00 GMT
< 
Hello world
```

#### Invalid Method Request
```bash
curl -X POST http://localhost:3000/hello
```

**Response:**
```json
{
  "error": true,
  "message": "Method Not Allowed",
  "status": 405,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/hello"
}
```

#### Non-existent Endpoint
```bash
curl -X GET http://localhost:3000/invalid-path
```

**Response:**
```json
{
  "error": true,
  "message": "Not Found",
  "status": 404,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/invalid-path"
}
```

### HTTP Request Examples

#### Raw HTTP Request
```http
GET /hello HTTP/1.1
Host: localhost:3000
User-Agent: Mozilla/5.0 (compatible; API-Client/1.0)
Accept: text/plain
```

#### Raw HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Date: Wed, 15 Jan 2025 10:30:00 GMT

Hello world
```

### JavaScript Integration Examples

#### Using Fetch API
```javascript
// Basic request
fetch('http://localhost:3000/hello')
  .then(response => response.text())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));

// With error handling
async function callHelloEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/hello');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message}`);
    }
    
    const data = await response.text();
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

#### Using Axios
```javascript
// Basic request
axios.get('http://localhost:3000/hello')
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error.response?.data || error.message));

// With async/await
async function callHelloEndpoint() {
  try {
    const response = await axios.get('http://localhost:3000/hello');
    console.log('Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('HTTP Error:', error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
  }
}
```

### Testing Examples

#### Supertest (for integration testing)
```javascript
const request = require('supertest');
const app = require('../app');

describe('GET /hello', () => {
  it('should return 200 status', async () => {
    const response = await request(app).get('/hello');
    expect(response.status).toBe(200);
  });

  it('should return Hello world', async () => {
    const response = await request(app).get('/hello');
    expect(response.text).toBe('Hello world');
  });

  it('should have correct content-type', async () => {
    const response = await request(app).get('/hello');
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
  });
});
```

---

## Development and Integration Guidelines

### Local Development Setup

1. **Prerequisites**
   - Node.js v22.x LTS (Jod) or higher
   - npm v11.4.2 or higher

2. **Installation**
   ```bash
   npm install
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```

4. **Production Server**
   ```bash
   npm start
   ```

### API Client Integration

**Base URL Configuration:**
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

**Request Headers:**
```javascript
const defaultHeaders = {
  'Accept': 'text/plain',
  'User-Agent': 'YourApp/1.0.0'
};
```

**Error Handling Pattern:**
```javascript
function handleApiError(error) {
  if (error.response) {
    // Server responded with error status
    console.error('API Error:', error.response.data.message);
    return error.response.data;
  } else if (error.request) {
    // Request made but no response received
    console.error('Network Error: No response received');
    return { error: true, message: 'Network error' };
  } else {
    // Request setup error
    console.error('Request Error:', error.message);
    return { error: true, message: 'Request setup error' };
  }
}
```

### Monitoring and Observability

**Health Check Endpoint (Future Implementation):**
```http
GET /health
```

**Expected Response:**
```json
{
  "status": "OK",
  "uptime": 3600,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "memory": {
    "rss": 45231104,
    "heapTotal": 18874368,
    "heapUsed": 11234567
  }
}
```

### Security Considerations

**HTTP Headers:**
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection (when applicable)

**Input Validation:**
- All request parameters validated before processing
- Malformed requests rejected with appropriate error responses
- Rate limiting can be implemented for production use

**Error Information:**
- Stack traces never exposed in responses
- Internal error details logged securely
- Error messages sanitized to prevent information disclosure

---

## Changelog and Version History

### Version 1.0.0 (Current)
- Initial implementation of `/hello` endpoint
- Centralized error handling system
- Structured logging implementation
- Express.js v5.1.0 integration
- Node.js v22.x LTS support
- Security headers implementation
- Comprehensive API documentation

### Future Enhancements
- Health check endpoint implementation
- Request rate limiting
- Authentication middleware
- Additional API endpoints
- Database integration
- Caching layer
- Performance monitoring

---

## Support and Resources

### Documentation
- **System Architecture**: `docs/architecture.md`
- **Development Guide**: `docs/development.md`
- **Deployment Guide**: `docs/deployment.md`

### Source Code
- **Controllers**: `src/backend/controllers/`
- **Routes**: `src/backend/routes/`
- **Middleware**: `src/backend/middleware/`
- **Utilities**: `src/backend/utils/`

### Framework Documentation
- **Express.js v5**: [https://expressjs.com/](https://expressjs.com/)
- **Node.js v22 LTS**: [https://nodejs.org/](https://nodejs.org/)
- **npm**: [https://www.npmjs.com/](https://www.npmjs.com/)

### Community and Support
- **GitHub Repository**: [Project Repository URL]
- **Issue Tracker**: [Issues URL]
- **Discussions**: [Discussions URL]

---

*This documentation is automatically maintained and reflects the current state of the API implementation. For the most up-to-date information, please refer to the source code and test suites.*