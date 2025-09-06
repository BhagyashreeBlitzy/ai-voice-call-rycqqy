# Node.js Tutorial Development Documentation

> Comprehensive development environment guide for Node.js 22.x LTS tutorial application with Express.js 5.1.0

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Development Scripts](#development-scripts)
- [Testing Guide](#testing-guide)
- [Debugging Procedures](#debugging-procedures)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Educational Content](#educational-content)

## Prerequisites

### System Requirements

| Requirement | Version | Download Link | Notes |
|-------------|---------|---------------|-------|
| **Node.js** | 22.11.0 LTS (Jod) | [nodejs.org](https://nodejs.org/en/download/) | Required minimum version |
| **NPM** | 11.5.2 | Included with Node.js | Package manager |
| **Git** | Latest | [git-scm.com](https://git-scm.com/downloads) | Version control |

### Operating System Support

- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **macOS**: 10.15+ (Catalina and newer)
- **Windows**: Windows 10+ with WSL2 recommended

### Development Tools (Recommended)

- **VS Code** with Node.js Extension Pack
- **Postman** or **curl** for API testing
- **Chrome DevTools** for debugging

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 1 core | 2+ cores |
| **Memory** | 512MB | 1GB+ |
| **Storage** | 100MB | 500MB+ |
| **Network** | 1Mbps | 10Mbps+ |

## Quick Start

Get up and running in under 5 minutes:

```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd src/backend

# 2. Install dependencies
npm install

# 3. Copy environment configuration
cp .env.example .env

# 4. Start development server
npm run dev

# 5. Test the application
curl http://localhost:3000/hello
# Expected response: "Hello world"
```

Your development server should now be running at [http://localhost:3000](http://localhost:3000)

## Detailed Setup

### Step 1: Environment Validation

Verify your system meets all requirements:

```bash
# Check Node.js version (must be 22.x or higher)
node --version
# Expected: v22.11.0 or higher

# Check NPM version
npm --version
# Expected: 11.5.2 or higher

# Verify npm registry access
npm ping
# Expected: npm PING ok
```

### Step 2: Project Setup

```bash
# Navigate to backend directory
cd src/backend

# Verify project structure
ls -la
# Expected files:
# - package.json
# - nodemon.json
# - .env.example
# - src/server.js
# - scripts/dev.sh

# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Environment Configuration

Create and customize your environment file:

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (optional)
nano .env  # or your preferred editor
```

Key environment variables:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Logging Configuration
LOG_LEVEL=debug
DEBUG=true
VERBOSE=true

# Development Features
HELLO_ENDPOINT=true
HEALTH_ENDPOINTS=true
```

### Step 4: Development Server Startup

**Option A: Using npm script (recommended)**
```bash
npm run dev
```

**Option B: Using development script directly**
```bash
./scripts/dev.sh
```

**Option C: Manual startup**
```bash
node src/server.js
```

### Step 5: Verify Installation

Test all endpoints:

```bash
# Test main endpoint
curl http://localhost:3000/hello
# Expected: Hello world

# Test health endpoints
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}

curl http://localhost:3000/livez
# Expected: {"status":"ok"}

curl http://localhost:3000/readyz
# Expected: {"status":"ok"}
```

## Development Scripts

### Available NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| **start** | `npm start` | Production server startup |
| **dev** | `npm run dev` | Development server with hot reload |
| **test** | `npm test` | Run complete test suite |
| **test:watch** | `npm run test:watch` | Run tests in watch mode |
| **test:coverage** | `npm run test:coverage` | Generate coverage reports |
| **lint** | `npm run lint` | Code quality analysis |
| **lint:fix** | `npm run lint:fix` | Auto-fix lint issues |
| **format** | `npm run format` | Format code with Prettier |

### Development Server Features

The development server (`npm run dev`) includes:

- **Hot Reloading**: Automatic restart on file changes
- **File Watching**: Monitors `src/`, `config/`, and root files
- **Verbose Logging**: Detailed request/response information
- **Port Management**: Automatic alternative port selection
- **Error Recovery**: Graceful error handling and recovery

### Development Script Configuration

The `scripts/dev.sh` script provides:

```bash
# Start development server with full logging
DEBUG=true ./scripts/dev.sh

# Start with custom port
PORT=4000 ./scripts/dev.sh

# Start with verbose output
VERBOSE=true ./scripts/dev.sh
```

### Nodemon Configuration

Nodemon watches these patterns (from `nodemon.json`):

```json
{
  "watch": ["src/", "config/", "bin/"],
  "ext": "js,json,mjs",
  "ignore": ["test/", "coverage/", "logs/"],
  "delay": 2000,
  "verbose": true
}
```

## Testing Guide

### Test Framework Overview

The project uses **Jest 29.7.0** for comprehensive testing:

- **Unit Tests**: Individual component testing
- **Integration Tests**: HTTP endpoint testing with Supertest
- **Coverage Analysis**: 95% minimum thresholds

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run tests for CI/CD
npm run test:ci
```

### Test Structure

```
test/
├── unit/                 # Unit tests
│   └── *.test.js
├── integration/          # Integration tests
│   └── *.test.js
├── helpers/             # Test utilities
│   └── test-setup.js
└── fixtures/            # Test data
    └── test-data.js
```

### Writing Tests

Example unit test:

```javascript
// test/unit/hello.test.js
const request = require('supertest');
const { app } = require('../../src/app.js');

describe('Hello Endpoint', () => {
  it('should respond with Hello world', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200)
      .expect('Content-Type', /text\/plain/);
    
    expect(response.text).toBe('Hello world');
  });
});
```

### Coverage Requirements

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| **Lines** | 95% | Code execution coverage |
| **Functions** | 100% | All functions tested |
| **Branches** | 90% | Conditional logic coverage |
| **Statements** | 95% | Statement execution coverage |

### Test Performance

- **Individual Test Timeout**: 15 seconds
- **Parallel Execution**: 50% of CPU cores
- **Memory Limit**: 1GB for test suite

## Debugging Procedures

### Console Debugging

Basic debugging with enhanced logging:

```javascript
// Enable debug mode in .env
DEBUG=true

// Use logger utility
const { logger } = require('./src/utils/logger.js');
logger.debug('Debug message', { context: 'user data' });
```

### Node.js Inspector

Start with Chrome DevTools integration:

```bash
# Start with inspector
node --inspect src/server.js

# Start with inspector break
node --inspect-brk src/server.js

# Connect via Chrome
# Open: chrome://inspect
```

### VS Code Debugging

Configure VS Code debugging in `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Node.js App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.js",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      },
      "runtimeVersion": "22",
      "console": "integratedTerminal"
    }
  ]
}
```

### Request/Response Debugging

Debug HTTP requests using built-in logging:

```bash
# Enable verbose logging
VERBOSE=true npm run dev

# Monitor specific request
curl -v http://localhost:3000/hello

# Check logs in terminal for:
# - Request method and path
# - Response status and timing
# - Error details and stack traces
```

### Memory Debugging

Monitor memory usage:

```bash
# Check memory usage
node --expose-gc src/server.js

# Use process monitoring
process.memoryUsage()
```

### Performance Debugging

Track performance metrics:

```javascript
const start = process.hrtime.bigint();
// ... your code ...
const duration = process.hrtime.bigint() - start;
console.log(`Execution time: ${duration / 1000000n}ms`);
```

## Project Structure

### Directory Overview

```
src/backend/
├── config/                 # Configuration files
│   ├── default.js         # Default configuration
│   ├── development.js     # Development overrides
│   └── production.js      # Production overrides
├── scripts/               # Development scripts
│   └── dev.sh            # Development server script
├── src/                   # Application source code
│   ├── app.js            # Express app configuration
│   ├── server.js         # HTTP server startup
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── routes/           # Route definitions
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
├── test/                  # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── helpers/          # Test utilities
│   └── fixtures/         # Test data
├── package.json          # Project dependencies
├── nodemon.json          # Nodemon configuration
├── jest.config.js        # Jest test configuration
└── .env.example          # Environment template
```

### Key Files Description

| File | Purpose | Educational Value |
|------|---------|------------------|
| `src/app.js` | Express app configuration | Middleware orchestration |
| `src/server.js` | HTTP server startup | Server lifecycle management |
| `scripts/dev.sh` | Development environment | Shell scripting best practices |
| `nodemon.json` | Hot reload configuration | Development tool setup |
| `jest.config.js` | Test configuration | Testing framework setup |

### Configuration Files

- **`config/default.js`**: Base application configuration
- **`config/development.js`**: Development-specific overrides
- **`config/production.js`**: Production-specific optimizations
- **`.env`**: Environment-specific variables

## Development Workflow

### Feature Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-endpoint
   ```

2. **Implement Feature**
   ```bash
   # Edit source files
   # Run development server
   npm run dev
   ```

3. **Write Tests**
   ```bash
   # Create test files
   # Run tests in watch mode
   npm run test:watch
   ```

4. **Validate Code Quality**
   ```bash
   # Run linting
   npm run lint
   
   # Format code
   npm run format
   
   # Run all tests
   npm test
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new endpoint"
   ```

### Code Quality Standards

**ESLint Configuration**
- Standard JavaScript style
- No unused variables
- Consistent naming conventions

**Prettier Configuration**
- 2-space indentation
- Single quotes
- Semicolons required

**Testing Standards**
- Test coverage ≥95%
- Descriptive test names
- Isolated test cases

### Development Controls

During development, use these controls:

| Action | Method | Purpose |
|--------|--------|---------|
| **Restart Server** | Type `rs` + Enter | Manual restart |
| **Stop Server** | Ctrl + C | Graceful shutdown |
| **Suspend Process** | Ctrl + Z | Suspend (use `fg` to resume) |
| **Force Stop** | Ctrl + C twice | Force termination |

## Troubleshooting

### Common Issues and Solutions

#### Port Already in Use

**Problem**: Error message "Port 3000 is already in use"

**Solution**:
```bash
# Option 1: Use different port
PORT=3001 npm run dev

# Option 2: Kill process using port
lsof -ti:3000 | xargs kill -9

# Option 3: Find and stop conflicting process
lsof -i :3000
```

#### Node Modules Issues

**Problem**: Module not found or dependency errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify Node.js version
node --version
```

#### Environment Variable Issues

**Problem**: Environment variables not loading

**Solution**:
```bash
# Verify .env file exists
ls -la .env

# Check .env syntax (no spaces around =)
# Correct: NODE_ENV=development
# Incorrect: NODE_ENV = development

# Restart development server
npm run dev
```

#### Test Failures

**Problem**: Tests failing unexpectedly

**Solution**:
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- test/unit/app.test.js

# Clear Jest cache
npm test -- --clearCache

# Check test environment
NODE_ENV=test npm test
```

#### Memory Issues

**Problem**: High memory usage or leaks

**Solution**:
```bash
# Monitor memory usage
node --max-old-space-size=1024 src/server.js

# Enable garbage collection logging
node --expose-gc --trace-gc src/server.js

# Restart development server
npm run dev
```

### Performance Issues

#### Slow Startup

**Causes and Solutions**:

1. **Large node_modules**
   ```bash
   # Clean dependencies
   npm prune
   npm dedupe
   ```

2. **File watching overhead**
   ```bash
   # Reduce watched files in nodemon.json
   # Add more ignore patterns
   ```

3. **Configuration loading**
   ```bash
   # Check config file complexity
   # Simplify development configuration
   ```

#### High CPU Usage

**Causes and Solutions**:

1. **File watcher issues**
   ```bash
   # Disable polling in nodemon.json
   "polling": false
   ```

2. **Infinite restart loops**
   ```bash
   # Check ignore patterns
   # Verify file permissions
   ```

### Getting Help

#### Log Analysis

Enable detailed logging for troubleshooting:

```bash
# Enable all debugging
DEBUG=* npm run dev

# Enable specific module debugging
DEBUG=express:* npm run dev

# Enable application debugging
LOG_LEVEL=debug npm run dev
```

#### System Information

Gather system information for support:

```bash
# Node.js version
node --version

# NPM version
npm --version

# Operating system
uname -a  # Linux/macOS
systeminfo  # Windows

# Project dependencies
npm list --depth=0
```

#### Health Check

Verify application health:

```bash
# Test all endpoints
curl http://localhost:3000/hello
curl http://localhost:3000/health
curl http://localhost:3000/livez
curl http://localhost:3000/readyz

# Check application stats
node -e "console.log(require('./src/app.js').getApplicationStats())"
```

## Educational Content

### Learning Objectives

By working with this development environment, you will learn:

1. **Node.js Fundamentals**
   - Event-driven architecture
   - NPM package management
   - Module system (CommonJS)
   - Environment variables

2. **Express.js Framework**
   - Middleware orchestration
   - Route definition and handling
   - Request/response lifecycle
   - Error handling patterns

3. **Development Tools**
   - Hot reloading with Nodemon
   - Testing with Jest and Supertest
   - Code quality with ESLint and Prettier
   - Debugging with Chrome DevTools

4. **Development Workflow**
   - Environment configuration
   - Dependency management
   - Test-driven development
   - Performance monitoring

### Key Concepts Covered

#### HTTP Server Fundamentals

```javascript
// Basic HTTP server creation
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello world');
});

server.listen(3000);
```

#### Express.js Middleware

```javascript
// Middleware execution order
app.use(express.json());        // 1. Parse JSON
app.use(loggingMiddleware);     // 2. Log requests
app.use(securityMiddleware);    // 3. Apply security
app.use('/', router);           // 4. Handle routes
app.use(errorHandler);          // 5. Handle errors
```

#### Asynchronous Programming

```javascript
// Express 5.1.0 automatic promise handling
app.get('/async', async (req, res) => {
  // Rejected promises automatically call next()
  const data = await someAsyncOperation();
  res.json(data);
});
```

#### Environment Configuration

```javascript
// Configuration management
const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
};
```

### Best Practices Demonstrated

1. **Security**: X-Powered-By header disabled, security middleware
2. **Performance**: Request caching, efficient middleware ordering
3. **Maintainability**: Modular code structure, comprehensive logging
4. **Testing**: High coverage requirements, integration testing
5. **Documentation**: Comprehensive inline comments, README files

### Next Steps

After mastering this development environment:

1. **Add Database Integration**: MongoDB, PostgreSQL, or SQLite
2. **Implement Authentication**: JWT, OAuth, or session-based
3. **Add API Documentation**: OpenAPI/Swagger integration
4. **Deploy to Cloud**: Docker containerization and cloud deployment
5. **Add Monitoring**: Application Performance Monitoring (APM)

### Additional Resources

- [Node.js Official Documentation](https://nodejs.org/en/docs/)
- [Express.js 5.x Guide](https://expressjs.com/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [NPM Documentation](https://docs.npmjs.com/)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)

---

## Support and Contribution

### Getting Support

1. **Check this documentation** for common issues and solutions
2. **Review the project README** for additional setup information
3. **Search existing issues** in the project repository
4. **Create a detailed issue** with system information and error logs

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the complete test suite
5. Submit a pull request with detailed description

---

*Last updated: Compatible with Node.js 22.11.0 LTS and Express.js 5.1.0*