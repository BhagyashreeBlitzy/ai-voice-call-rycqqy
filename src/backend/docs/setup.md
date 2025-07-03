# Node.js Tutorial Backend - Setup and Installation Guide

A comprehensive setup and installation guide for the Node.js tutorial backend. This document provides step-by-step instructions for local development, environment configuration, dependency installation, running the server in development and production modes, Docker/container setup, and troubleshooting.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Development Workflow](#development-workflow)
4. [Production Workflow](#production-workflow)
5. [Docker and Containerization](#docker-and-containerization)
6. [Environment Variables](#environment-variables)
7. [Testing and Validation](#testing-and-validation)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the Node.js tutorial backend, ensure your development environment meets the following requirements:

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | v22.x LTS (Jod) | JavaScript runtime environment | [Download from nodejs.org](https://nodejs.org/) |
| **npm** | v11.4.2+ | Package manager (bundled with Node.js) | Included with Node.js installation |
| **Git** | Latest | Version control and repository cloning | [Download from git-scm.com](https://git-scm.com/) |

### System Requirements

- **Operating System**: macOS, Linux, or Windows 10/11
- **Memory**: Minimum 512MB RAM available
- **Disk Space**: 200MB for dependencies and application files
- **Network**: Internet connection for dependency installation

### Verify Installation

Confirm your environment is ready by checking software versions:

```bash
# Check Node.js version (should be v22.x)
node --version

# Check npm version (should be v11.4.2+)
npm --version

# Check Git installation
git --version
```

Expected output:
```
v22.11.0  # Or higher v22.x version
11.4.2    # Or higher version
git version 2.x.x
```

## Local Setup

### Step 1: Clone Repository

Clone the repository and navigate to the backend directory:

```bash
# Clone the repository
git clone <repository-url>
cd nodejs-tutorial-backend/src/backend

# Verify directory structure
ls -la
```

You should see the following key files and directories:
```
app.js              # Main application entrypoint
package.json        # Dependencies and scripts
.env.example       # Environment variable template
config/            # Configuration files
controllers/       # Business logic
routes/            # API routes
middleware/        # Express middleware
utils/             # Utility functions
```

### Step 2: Install Dependencies

Install all required dependencies using npm:

```bash
# Install production and development dependencies
npm install
```

This command installs packages defined in `package.json`:

**Production Dependencies:**
- `express@^5.1.0` - Web framework with security improvements
- `helmet@^7.0.0` - Security headers middleware
- `compression@^1.7.4` - Response compression
- `morgan@^1.10.0` - HTTP request logging
- `dotenv@^16.0.0` - Environment variable management

**Development Dependencies:**
- `nodemon@^3.0.0` - Development server with hot-reload
- `jest@^29.0.0` - Testing framework
- `supertest@^7.1.1` - HTTP testing library
- `eslint@^8.0.0` - Code linting and quality

Verify installation success:
```bash
# Check installed packages
npm list --depth=0

# Verify development tools
npx nodemon --version
npx jest --version
```

### Step 3: Environment Configuration

Create and configure your environment variables:

```bash
# Copy the environment template
cp .env.example .env

# Edit the environment file
nano .env  # or use your preferred editor
```

The `.env.example` file contains all supported environment variables with documentation:

```bash
# Server Configuration
PORT=3000                    # HTTP server port (1024-65535)
NODE_ENV=development         # Environment (development/production/test)
REQUEST_TIMEOUT_MS=30000     # Request timeout in milliseconds

# Logging Configuration
LOG_LEVEL=info              # Log level (info/warn/error)
```

**Default Configuration (no .env file needed):**
If you don't create a `.env` file, the application uses these defaults:
- `PORT=3000`
- `NODE_ENV=development`
- `REQUEST_TIMEOUT_MS=30000`
- `LOG_LEVEL=info`

The configuration system validates all values and provides detailed warnings for invalid settings.

### Step 4: Verify Setup

Test that everything is configured correctly:

```bash
# Run health check
npm run health

# Expected output: "Server health check"

# Check application structure
node -e "console.log('Setup verification:', require('./package.json').name)"

# Expected output: "Setup verification: nodejs-tutorial-backend"
```

## Development Workflow

### Starting Development Server

Start the development server with hot-reload capabilities:

```bash
# Start development server
npm run dev
```

This command:
1. Executes `scripts/dev.js` via nodemon
2. Enables automatic restart on file changes
3. Sets `NODE_ENV=development`
4. Provides detailed logging for debugging

**Expected output:**
```
[nodemon] starting `node scripts/dev.js`
[INFO] Starting development server initialization
[INFO] Server configuration loaded successfully
[INFO] Development server started successfully on port 3000
[INFO] Development server ready for requests
```

### Hot-Reload Configuration

The development server uses nodemon with the following configuration (`nodemon.json`):

```json
{
  "watch": ["app.js", "config/", "controllers/", "routes/", "middleware/", "utils/"],
  "ext": "js,json",
  "ignore": ["node_modules/", "logs/", "coverage/", "__tests__/"],
  "delay": "200",
  "verbose": true
}
```

**Watched files and directories:**
- Application files: `app.js`, `index.js`
- Source directories: `config/`, `controllers/`, `routes/`, `middleware/`, `utils/`
- File extensions: `.js`, `.json`

**Ignored directories:**
- `node_modules/` - Dependencies
- `coverage/` - Test coverage reports
- `__tests__/` - Test files
- `*.test.js` - Individual test files

### Development Features

**Automatic Restart:**
The server automatically restarts when you modify watched files:

```bash
# Modify a file
echo "// Updated at $(date)" >> controllers/helloController.js

# Watch the console for restart notification
[nodemon] restarting due to changes...
[nodemon] starting `node scripts/dev.js`
[INFO] Development server initialization complete
```

**Enhanced Logging:**
Development mode provides detailed logging for debugging:

```bash
# Example request logging
[INFO] New client connection established
[INFO] Processing GET /hello request
[INFO] Hello endpoint handler executing
[INFO] Response sent successfully
```

**Error Handling:**
Comprehensive error reporting with stack traces in development:

```bash
# Example error output
[ERROR] Development server error occurred
[ERROR] Error details: {
  "message": "Port 3000 is already in use",
  "code": "EADDRINUSE",
  "suggestion": "Try a different port or stop the process using port 3000"
}
```

### Testing During Development

Run tests while developing to ensure code quality:

```bash
# Run tests in watch mode
npm run test:watch

# Run specific test files
npx jest __tests__/unit/hello.test.js

# Run tests with coverage
npm run test:coverage
```

### Code Quality Checks

Maintain code quality during development:

```bash
# Check code style and quality
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changes
npm run format:check
```

## Production Workflow

### Starting Production Server

Start the server in production mode for deployment:

```bash
# Set production environment
export NODE_ENV=production

# Start production server
npm start
```

This command:
1. Executes `scripts/start.js` for optimized startup
2. Uses production-optimized Express.js settings
3. Implements proper error handling and logging
4. Configures graceful shutdown handling

**Expected output:**
```
[INFO] Starting Node.js tutorial backend server initialization
[INFO] Server configuration loaded and validated successfully
[INFO] HTTP server started successfully and ready to accept connections
[INFO] Server initialization completed successfully
```

### Production Environment Variables

Configure production-appropriate environment variables:

```bash
# Production environment settings
NODE_ENV=production
PORT=8080
REQUEST_TIMEOUT_MS=60000
LOG_LEVEL=warn
```

**Production optimizations enabled:**
- Express.js caches view templates
- Reduced error verbosity
- Optimized performance settings
- Enhanced security headers

### Production Validation

Verify the production server is running correctly:

```bash
# Test the hello endpoint
curl http://localhost:3000/hello

# Expected response: "Hello world"

# Check server health
curl http://localhost:3000/health

# Expected response: {"status":"OK","uptime":123.456,"timestamp":"2024-01-15T10:30:00.000Z"}

# Verify server process
ps aux | grep node

# Check server logs
tail -f logs/application.log  # if logging to file
```

### Performance Monitoring

Monitor production server performance:

```bash
# Check memory usage
node -e "console.log(process.memoryUsage())"

# Monitor response times
time curl http://localhost:3000/hello

# Check process uptime
node -e "console.log('Uptime:', process.uptime(), 'seconds')"
```

## Docker and Containerization

### Building Docker Image

Build the production-ready Docker image:

```bash
# Build the container image
docker build -t nodejs-tutorial-backend .

# Verify image creation
docker images | grep nodejs-tutorial-backend
```

The `Dockerfile` implements production best practices:
- Multi-stage build for optimized image size
- Node.js v22-alpine base image for security
- Non-root user execution
- Production-only dependencies
- Health check integration

### Running with Docker

Run the containerized application:

```bash
# Run with default settings
docker run -p 3000:3000 nodejs-tutorial-backend

# Run with custom environment variables
docker run -p 4000:4000 \
  -e PORT=4000 \
  -e NODE_ENV=production \
  -e REQUEST_TIMEOUT_MS=60000 \
  nodejs-tutorial-backend

# Run with environment file
docker run -p 3000:3000 --env-file .env nodejs-tutorial-backend

# Run in detached mode with name
docker run -d --name tutorial-backend -p 3000:3000 nodejs-tutorial-backend
```

### Docker Compose Orchestration

Use Docker Compose for local development and testing:

```bash
# Start services with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build --force-recreate
```

The `docker-compose.yml` configuration includes:
- Environment variable injection via `.env` file
- Health check monitoring
- Resource limits for container management
- Network isolation for security

### Container Health Checks

Monitor container health using built-in health checks:

```bash
# Check container health status
docker ps

# View health check logs
docker inspect tutorial-backend | grep -A 10 Health

# Manual health check
docker exec tutorial-backend node -e "
const http = require('http');
http.get('http://localhost:3000/hello', (res) => {
  console.log('Health check status:', res.statusCode);
});"
```

### Container Debugging

Debug containerized applications:

```bash
# Access container shell
docker exec -it tutorial-backend sh

# View container logs
docker logs tutorial-backend

# Monitor resource usage
docker stats tutorial-backend

# Inspect container configuration
docker inspect tutorial-backend
```

## Environment Variables

The application supports comprehensive environment variable configuration with validation and defaults.

### Core Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | integer | `3000` | HTTP server port (1024-65535) |
| `NODE_ENV` | string | `development` | Node.js environment (`development`/`production`/`test`) |
| `REQUEST_TIMEOUT_MS` | integer | `30000` | Request timeout in milliseconds |
| `LOG_LEVEL` | string | `info` | Logging level (`info`/`warn`/`error`) |

### Configuration Validation

The configuration system (`config/server.js`) provides comprehensive validation:

**Port Validation:**
```javascript
// Valid port range: 1024-65535
PORT=3000     // ✓ Valid
PORT=8080     // ✓ Valid  
PORT=80       // ✗ Invalid (below 1024)
PORT=99999    // ✗ Invalid (above 65535)
```

**Environment Validation:**
```javascript
// Valid environments
NODE_ENV=development  // ✓ Valid
NODE_ENV=production   // ✓ Valid
NODE_ENV=test         // ✓ Valid
NODE_ENV=staging      // ✗ Invalid (not supported)
```

**Timeout Validation:**
```javascript
// Valid timeout values
REQUEST_TIMEOUT_MS=30000  // ✓ Valid (30 seconds)
REQUEST_TIMEOUT_MS=60000  // ✓ Valid (60 seconds)
REQUEST_TIMEOUT_MS=-1     // ✗ Invalid (negative value)
REQUEST_TIMEOUT_MS=abc    // ✗ Invalid (not a number)
```

### Environment Examples

**Development Configuration:**
```bash
# .env for development
PORT=3000
NODE_ENV=development
REQUEST_TIMEOUT_MS=30000
LOG_LEVEL=info
```

**Production Configuration:**
```bash
# .env for production
PORT=8080
NODE_ENV=production
REQUEST_TIMEOUT_MS=60000
LOG_LEVEL=warn
```

**Testing Configuration:**
```bash
# .env for testing
PORT=3001
NODE_ENV=test
REQUEST_TIMEOUT_MS=10000
LOG_LEVEL=error
```

### Configuration Loading Process

The application loads configuration in this order:

1. **Environment Variables** - `process.env` values take highest precedence
2. **`.env` File** - Local environment file (if present)
3. **Default Values** - Built-in fallbacks with warnings

**Configuration Logging:**
```bash
# Example configuration output
[INFO] Server configuration resolved successfully
[INFO] Resolved configuration: {
  "port": 3000,
  "env": "development", 
  "requestTimeoutMs": 30000
}
[INFO] Configuration sources: {
  "port": "environment variable",
  "env": "default fallback",
  "requestTimeoutMs": "environment variable"
}
```

## Testing and Validation

### Running Tests

Execute the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode for development
npm run test:watch

# Run tests for CI/CD (no watch, coverage required)
npm run test:ci
```

**Test execution output:**
```bash
[TEST] Node.js Tutorial Backend Test Runner
[TEST] Jest CLI Path: /path/to/jest
[TEST] Test Environment: node
[TEST] Coverage Collection: true
[TEST] ================================

PASS __tests__/unit/hello.test.js
PASS __tests__/integration/app.test.js

Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
Coverage:    100% lines, 100% functions, 100% branches
```

### Test Configuration

Tests use Jest with the following configuration (`jest.config.js`):

```javascript
{
  testEnvironment: 'node',              // Node.js environment for backend testing
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],  // Test file patterns
  collectCoverage: true,                // Enable coverage collection
  coverageThreshold: {
    global: {
      branches: 80,     // 80% branch coverage required
      functions: 100,   // 100% function coverage required
      lines: 90,        // 90% line coverage required
      statements: 90    // 90% statement coverage required
    }
  }
}
```

### Application Health Validation

Validate the application is running correctly:

**1. Endpoint Testing:**
```bash
# Test the hello endpoint
curl -i http://localhost:3000/hello

# Expected response:
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world

# Test health endpoint
curl -i http://localhost:3000/health

# Expected response:
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "OK",
  "uptime": 123.456,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "memory": {
    "rss": 25165824,
    "heapTotal": 8192000,
    "heapUsed": 4567890
  }
}
```

**2. Server Process Validation:**
```bash
# Check if server is listening on the correct port
netstat -tlnp | grep 3000

# Expected output:
tcp6  0  0  :::3000  :::*  LISTEN  12345/node

# Check process information
ps aux | grep -E '(node|app\.js)'

# Verify server responds to requests
echo "GET /hello HTTP/1.1\r\nHost: localhost:3000\r\n\r\n" | nc localhost 3000
```

**3. Error Response Testing:**
```bash
# Test 404 error handling
curl -i http://localhost:3000/nonexistent

# Expected response:
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{
  "error": true,
  "message": "Not Found",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/nonexistent",
  "method": "GET"
}

# Test invalid method
curl -i -X POST http://localhost:3000/hello

# Expected response:
HTTP/1.1 405 Method Not Allowed
```

### Performance Validation

Test application performance characteristics:

**Response Time Testing:**
```bash
# Measure response time
time curl http://localhost:3000/hello

# Expected: real < 0.1s (100ms)

# Load testing with ab (Apache Bench)
ab -n 1000 -c 10 http://localhost:3000/hello

# Monitor response time statistics
```

**Memory Usage Monitoring:**
```bash
# Check memory usage during operation
node -e "
const http = require('http');
console.log('Initial memory:', process.memoryUsage());

// Make several requests
for (let i = 0; i < 100; i++) {
  http.get('http://localhost:3000/hello', () => {});
}

setTimeout(() => {
  console.log('After requests:', process.memoryUsage());
}, 5000);
"
```

## Troubleshooting

### Common Issues and Solutions

#### Port Already in Use

**Problem:** `Error: listen EADDRINUSE :::3000`

**Solutions:**
```bash
# Option 1: Find and stop the process using port 3000
lsof -i :3000
kill -9 <PID>

# Option 2: Use a different port
PORT=3001 npm run dev

# Option 3: Set port in environment file
echo "PORT=3001" >> .env
```

#### Node.js Version Issues

**Problem:** `Error: Node.js version incompatible`

**Solutions:**
```bash
# Check current Node.js version
node --version

# Install Node.js v22.x LTS
# Using nvm (recommended)
nvm install 22
nvm use 22

# Using direct download
# Visit https://nodejs.org/ and download v22.x LTS
```

#### npm Installation Failures

**Problem:** `npm install` fails with permission or network errors

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Fix permission issues (Unix/Linux/macOS)
sudo chown -R $(whoami) ~/.npm

# Use different registry if network issues
npm install --registry https://registry.npmmirror.com
```

#### Environment Variable Issues

**Problem:** Configuration not loading correctly

**Solutions:**
```bash
# Verify .env file exists and is readable
ls -la .env
cat .env

# Check environment variable loading
node -e "
require('dotenv').config();
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
"

# Test configuration loading
node -e "
const { getServerConfig } = require('./config/server.js');
console.log('Config:', getServerConfig());
"
```

#### Test Failures

**Problem:** Tests fail during execution

**Solutions:**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific failing test
npx jest __tests__/unit/hello.test.js --verbose

# Clear Jest cache
npx jest --clearCache
npm test

# Check test setup
node -e "
const config = require('./jest.config.js');
console.log('Jest config:', config);
"
```

#### Docker Issues

**Problem:** Docker build or run failures

**Solutions:**
```bash
# Check Docker installation
docker --version
docker compose --version

# Build with verbose output
docker build --no-cache -t nodejs-tutorial-backend .

# Check container logs
docker logs nodejs-tutorial-backend

# Debug container
docker run -it nodejs-tutorial-backend sh

# Check port conflicts
docker ps -a
docker stop $(docker ps -q)  # Stop all containers
```

### Performance Issues

#### Slow Response Times

**Diagnosis:**
```bash
# Measure response time
time curl http://localhost:3000/hello

# Check system resources
top
htop  # if available

# Monitor Node.js performance
node --prof app.js
# Generate profile: node --prof-process isolate-*.log
```

**Solutions:**
- Ensure adequate system resources (RAM, CPU)
- Check for resource-intensive processes
- Verify network connectivity
- Consider horizontal scaling for high load

#### Memory Leaks

**Diagnosis:**
```bash
# Monitor memory usage over time
node -e "
setInterval(() => {
  console.log(new Date(), process.memoryUsage());
}, 10000);
" &

# Make requests while monitoring
for i in {1..1000}; do curl http://localhost:3000/hello; done
```

**Solutions:**
- Restart the application if memory usage grows continuously
- Review application logs for error patterns
- Update to latest Node.js LTS version
- Consider container memory limits

### Getting Additional Help

#### Log Analysis

Enable detailed logging for troubleshooting:

```bash
# Set debug logging level
LOG_LEVEL=debug npm run dev

# Enable Node.js debugging
DEBUG=* npm run dev

# Monitor all application logs
tail -f /path/to/application.log
```

#### Community Resources

- **GitHub Issues**: [Project Issues](https://github.com/tutorial/nodejs-tutorial-backend/issues)
- **Stack Overflow**: Tag questions with `nodejs`, `express`, `tutorial`
- **Node.js Documentation**: [Official Docs](https://nodejs.org/docs/)
- **Express.js Documentation**: [Express Guide](https://expressjs.com/)

#### Reporting Bugs

When reporting issues, include:
1. Operating system and version
2. Node.js version (`node --version`)
3. npm version (`npm --version`)
4. Complete error messages and stack traces
5. Steps to reproduce the issue
6. Environment configuration (sanitized `.env` contents)

---

**Setup Complete!** You now have a fully configured Node.js tutorial backend ready for development and deployment. For API usage examples, see [docs/api.md](api.md). For deployment to production environments, see [docs/deployment.md](deployment.md).