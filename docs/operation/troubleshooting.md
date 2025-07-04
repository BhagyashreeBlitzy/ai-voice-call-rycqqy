# Node.js Tutorial Backend - Troubleshooting Guide

A comprehensive troubleshooting guide for the Node.js tutorial backend application using Express 5.1.0. This guide provides step-by-step solutions, diagnostic checklists, and root cause analysis for common setup, runtime, development, and deployment issues.

## Table of Contents

1. [Common Setup Issues](#1-common-setup-issues)
2. [Server Startup and Port Conflicts](#2-server-startup-and-port-conflicts)
3. [Dependency and Version Problems](#3-dependency-and-version-problems)
4. [Environment Variable and Configuration Issues](#4-environment-variable-and-configuration-issues)
5. [Runtime Errors and Error Handling](#5-runtime-errors-and-error-handling)
6. [Testing and CI/CD Failures](#6-testing-and-cicd-failures)
7. [API Endpoint and Response Issues](#7-api-endpoint-and-response-issues)
8. [Logging and Debugging](#8-logging-and-debugging)
9. [Deployment and Production Issues](#9-deployment-and-production-issues)
10. [Where to Get Help](#10-where-to-get-help)

---

## 1. Common Setup Issues

### 1.1 Node.js Version Compatibility

**Problem:** Application fails to start due to Node.js version incompatibility

**Symptoms:**
```bash
Error: This package requires Node.js version >=18.0.0
Node.js version 16.x is not supported
```

**Diagnostic Steps:**
1. Check your current Node.js version:
   ```bash
   node --version
   ```

2. Verify the required version in `package.json`:
   ```json
   {
     "engines": {
       "node": ">=18.0.0"
     }
   }
   ```

**Solutions:**

**Option 1: Upgrade Node.js to LTS (Recommended)**
```bash
# Using nvm (Node Version Manager)
nvm install --lts
nvm use --lts

# Verify installation
node --version  # Should show 18.x or higher
npm --version   # Should show compatible npm version
```

**Option 2: Install Specific Node.js Version**
```bash
# Install Node.js 22.x LTS (recommended for this tutorial)
nvm install 22
nvm use 22

# Make it default
nvm alias default 22
```

**Verification:**
```bash
# Confirm versions meet requirements
node --version    # Should be >=18.0.0
npm --version     # Should be >=9.0.0
```

### 1.2 npm Installation Failures

**Problem:** `npm install` fails with various errors

**Common Error Messages:**
```bash
# Network/registry issues
npm ERR! network timeout at https://registry.npmjs.org/
npm ERR! network This is a problem related to network connectivity

# Permission issues
npm ERR! Error: EACCES: permission denied

# Cache corruption
npm ERR! Unexpected end of JSON input while parsing near
```

**Diagnostic Steps:**
1. Check internet connectivity:
   ```bash
   npm ping
   ```

2. Verify npm registry configuration:
   ```bash
   npm config get registry
   # Should return: https://registry.npmjs.org/
   ```

3. Check npm cache status:
   ```bash
   npm cache verify
   ```

**Solutions:**

**For Network Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Reset npm registry
npm config set registry https://registry.npmjs.org/

# Try installation with verbose logging
npm install --verbose
```

**For Permission Issues:**
```bash
# Fix npm permissions (Unix/Linux/macOS)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Alternative: Use npx for global packages
npx nodemon instead of global installation
```

**For Cache Issues:**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
npm install
```

### 1.3 Missing Dependencies

**Problem:** Application fails to start due to missing required dependencies

**Symptoms:**
```bash
Error: Cannot find module 'express'
Error: Cannot find module './middleware/logger.js'
```

**Diagnostic Steps:**
1. Check if `node_modules` directory exists
2. Verify `package.json` integrity
3. Check for corrupted `package-lock.json`

**Solutions:**

**Complete Dependency Reinstallation:**
```bash
# Remove existing installations
rm -rf node_modules
rm package-lock.json

# Reinstall all dependencies
npm install

# Verify critical dependencies
npm list express
npm list jest
npm list supertest
```

**Verify Package.json Dependencies:**
```json
{
  "dependencies": {
    "express": "5.1.0",
    "body-parser": "^2.1.0",
    "dotenv": "^16.0.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "7.1.1",
    "nodemon": "latest"
  }
}
```

**Install Specific Dependencies:**
```bash
# Install production dependencies
npm install express@5.1.0 body-parser@^2.1.0

# Install development dependencies
npm install --save-dev jest@^29.0.0 supertest@7.1.1
```

---

## 2. Server Startup and Port Conflicts

### 2.1 Port Already in Use (EADDRINUSE)

**Problem:** Server fails to start because the port is already in use

**Error Message:**
```bash
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (net.js:1318:16)
```

**Diagnostic Steps:**

**Check Which Process is Using the Port:**
```bash
# On macOS/Linux
lsof -i :3000
netstat -tulpn | grep :3000

# On Windows
netstat -ano | findstr :3000
```

**Solutions:**

**Option 1: Kill the Process Using the Port**
```bash
# Find and kill process (replace PID with actual process ID)
lsof -i :3000
kill -9 [PID]

# Alternative: Kill all node processes
pkill -f node
```

**Option 2: Use a Different Port**
```bash
# Set PORT environment variable
export PORT=3001
npm start

# Or use .env file
echo "PORT=3001" > .env
npm start
```

**Option 3: Configure Port in Application**
Check `config/index.js` for port configuration:
```javascript
// Current port configuration logic
const PORT = getPort(); // Uses PORT environment variable or defaults to 3000

// Verify port validation
function validatePort(port) {
    return port >= 1024 && port <= 65535;
}
```

### 2.2 Permission Denied (EACCES)

**Problem:** Permission error when trying to bind to a port

**Error Message:**
```bash
Error: listen EACCES: permission denied 0.0.0.0:80
Error: listen EACCES: permission denied 0.0.0.0:443
```

**Cause:** Trying to use privileged ports (<1024) without proper permissions

**Solutions:**

**Use Non-Privileged Ports (Recommended):**
```bash
# Use ports 1024 and above
export PORT=3000
export PORT=8080
export PORT=4000
```

**For Development with Privileged Ports:**
```bash
# Run with sudo (not recommended for production)
sudo npm start

# Better: Use port forwarding
sudo iptables -t nat -A OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 3000
```

### 2.3 Invalid Port Configuration

**Problem:** Application fails due to invalid port values

**Diagnostic Steps:**
```bash
# Check current PORT environment variable
echo $PORT

# Verify port validation in config
node -e "console.log(require('./config/index.js').validatePort(process.env.PORT))"
```

**Solutions:**

**Set Valid Port:**
```bash
# Valid port range: 1024-65535
export PORT=3000
export PORT=8080

# Verify configuration
npm run start
```

**Check Config Validation:**
The application includes port validation in `config/index.js`:
```javascript
const VALID_PORT_RANGE = {
    min: 1024,
    max: 65535
};
```

---

## 3. Dependency and Version Problems

### 3.1 Express Version Mismatch

**Problem:** Incompatible Express version causing runtime errors

**Required Version:** Express 5.1.0 (as specified in `package.json`)

**Symptoms:**
```bash
Error: Cannot read property 'listen' of undefined
TypeError: app.use is not a function
Warning: express deprecated req.host
```

**Diagnostic Steps:**
```bash
# Check current Express version
npm list express

# Expected output:
# nodejs-tutorial-backend@1.0.0
# └── express@5.1.0
```

**Solutions:**

**Install Correct Express Version:**
```bash
# Remove existing Express installation
npm uninstall express

# Install specific version
npm install express@5.1.0

# Verify installation
npm list express
```

**Verify Express 5 Features:**
The application uses Express 5.1.0 features:
- Automatic promise rejection handling
- Enhanced security with ReDoS protection
- Updated path-to-regexp@8.x

### 3.2 Missing Development Dependencies

**Problem:** Development tools not working due to missing devDependencies

**Symptoms:**
```bash
# Testing fails
npm test
> jest command not found

# Linting fails
npm run lint
> eslint command not found

# Development server fails
npm run dev
> nodemon command not found
```

**Solutions:**

**Install All Development Dependencies:**
```bash
# Install all dependencies including devDependencies
npm install

# Or specifically install devDependencies
npm install --only=dev
```

**Verify DevDependencies Installation:**
```bash
# Check critical development tools
npm list jest
npm list supertest
npm list nodemon
npm list eslint
```

**Critical DevDependencies from Package.json:**
```json
{
  "devDependencies": {
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "supertest": "7.1.1",
    "nodemon": "latest",
    "prettier": "^3.2.5"
  }
}
```

### 3.3 Node.js and npm Version Compatibility

**Problem:** npm version incompatible with Node.js version

**Diagnostic Steps:**
```bash
# Check versions
node --version
npm --version

# Check npm compatibility
npm doctor
```

**Solutions:**

**Update npm to Compatible Version:**
```bash
# Update npm to latest compatible version
npm install -g npm@latest

# Or install specific version
npm install -g npm@11.4.2

# Verify
npm --version
```

**Version Compatibility Matrix:**
- Node.js 18.x → npm 8.x - 10.x
- Node.js 20.x → npm 9.x - 11.x
- Node.js 22.x → npm 11.x+ (recommended)

### 3.4 Package Lock File Issues

**Problem:** Inconsistent dependency resolution due to package-lock.json issues

**Symptoms:**
```bash
npm WARN using --force
npm WARN conflicts exist
Different versions installed than expected
```

**Solutions:**

**Clean Package Lock Resolution:**
```bash
# Delete lock file and node_modules
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall with fresh lock file
npm install

# Verify no conflicts
npm audit
```

---

## 4. Environment Variable and Configuration Issues

### 4.1 Missing or Invalid Environment Variables

**Problem:** Application fails due to environment configuration issues

**Key Environment Variables:**
- `NODE_ENV` - Application environment (development, production, test)
- `PORT` - Server port (default: 3000)

**Diagnostic Steps:**
```bash
# Check current environment variables
echo $NODE_ENV
echo $PORT

# List all environment variables
env | grep NODE
env | grep PORT
```

**Solutions:**

**Create .env File:**
```bash
# Create .env file in project root
cat > .env << EOF
NODE_ENV=development
PORT=3000
EOF
```

**Set Environment Variables:**
```bash
# Temporary (current session)
export NODE_ENV=development
export PORT=3000

# Permanent (add to shell profile)
echo 'export NODE_ENV=development' >> ~/.bashrc
echo 'export PORT=3000' >> ~/.bashrc
source ~/.bashrc
```

**Verify Configuration:**
```bash
# Check configuration using the app's config module
node -e "console.log(require('./config/index.js').getConfigInfo())"
```

### 4.2 Invalid NODE_ENV Values

**Problem:** Application behaves unexpectedly due to invalid NODE_ENV

**Valid Values:** development, production, test (as defined in `config/index.js`)

**Diagnostic Steps:**
```bash
# Check current NODE_ENV
echo $NODE_ENV

# Verify against valid environments
node -e "console.log(require('./config/index.js').VALID_ENVIRONMENTS)"
```

**Solutions:**

**Set Valid NODE_ENV:**
```bash
# For development
export NODE_ENV=development

# For testing
export NODE_ENV=test

# For production
export NODE_ENV=production
```

**Validation Function:**
The application includes environment validation in `config/index.js`:
```javascript
const VALID_ENVIRONMENTS = ['development', 'production', 'test'];

function getEnvironment() {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv && VALID_ENVIRONMENTS.includes(nodeEnv)) {
        return nodeEnv;
    }
    return 'development'; // Default fallback
}
```

### 4.3 Port Configuration Issues

**Problem:** Invalid port configuration causing startup failures

**Diagnostic Steps:**
```bash
# Check PORT value and validation
node -e "
const { validatePort, getPort } = require('./config/index.js');
const port = getPort();
console.log('Port:', port);
console.log('Valid:', validatePort(port));
"
```

**Solutions:**

**Set Valid Port:**
```bash
# Ports must be 1024-65535
export PORT=3000
export PORT=8080
export PORT=4000

# Verify
npm start
```

**Port Validation Rules:**
- Minimum: 1024 (avoid privileged ports)
- Maximum: 65535 (TCP port limit)
- Must be integer value
- Must not be in use by another process

---

## 5. Runtime Errors and Error Handling

### 5.1 Understanding Error Messages

**The application implements comprehensive error handling using Express 5.1.0's enhanced features:**

**Error Handling Architecture:**
- Global error handler middleware (`middleware/errorHandler.js`)
- Custom AppError types (`utils/errorTypes.js`)
- Automatic promise rejection forwarding (Express 5 feature)
- Structured error logging with request context

### 5.2 Common HTTP Error Responses

**404 Not Found:**
```bash
# Request to non-existent endpoint
curl http://localhost:3000/nonexistent

# Response:
{
  "success": false,
  "message": "Not Found",
  "code": "NOT_FOUND",
  "status": 404
}
```

**500 Internal Server Error:**
```bash
# Server-side error occurred
{
  "success": false,
  "message": "Internal server error",
  "code": "INTERNAL_ERROR",
  "status": 500
}
```

### 5.3 Debugging Runtime Errors

**Enable Debug Logging:**
```bash
# Start application with debug output
DEBUG=express:* npm start

# Or with environment variable
NODE_ENV=development DEBUG=* npm start
```

**Check Error Logs:**
The application logs errors with comprehensive context:
```bash
# Application logs include:
# - Error message and stack trace
# - Request context (method, URL, headers)
# - Timestamp and request ID
# - User agent and IP address
```

**Error Handler Integration:**
The global error handler in `middleware/errorHandler.js`:
- Catches all unhandled errors and promise rejections
- Logs errors with structured context
- Returns standardized error responses
- Prevents information disclosure in production

### 5.4 Express 5 Promise Handling

**Automatic Promise Rejection Handling:**
Express 5.1.0 automatically forwards rejected promises to the error handler:

```javascript
// No need for try/catch with Express 5
app.get('/async-route', async (req, res) => {
    // Any rejected promise is automatically caught
    throw new Error('This will be handled automatically');
});
```

**Manual Error Forwarding:**
```javascript
// For synchronous errors or custom handling
app.get('/manual-error', (req, res, next) => {
    try {
        riskyOperation();
    } catch (error) {
        next(error); // Forward to error handler
    }
});
```

---

## 6. Testing and CI/CD Failures

### 6.1 Test Execution Failures

**Problem:** Tests fail to run or execute properly

**Common Issues:**

**Jest Not Found:**
```bash
npm test
> jest: command not found
```

**Solution:**
```bash
# Install Jest as dev dependency
npm install --save-dev jest@^29.0.0

# Verify Jest configuration in package.json
npm test
```

**SuperTest Issues:**
```bash
# Missing SuperTest dependency
npm install --save-dev supertest@7.1.1

# Verify SuperTest version
npm list supertest
```

### 6.2 Port Conflicts in Tests

**Problem:** Tests fail due to port already in use

**Error Message:**
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

**Use Dynamic Port Allocation:**
```javascript
// In test files, use port 0 for dynamic allocation
describe('Server tests', () => {
    let server;
    
    beforeAll((done) => {
        const app = createApp();
        server = app.listen(0, done); // Port 0 = dynamic allocation
    });
    
    afterAll((done) => {
        server.close(done);
    });
});
```

**Set Test-Specific Port:**
```bash
# Use different port for testing
NODE_ENV=test PORT=3001 npm test
```

### 6.3 Test Coverage Issues

**Problem:** Coverage reports show low coverage or missing files

**Check Coverage Configuration:**
The Jest configuration in `package.json` includes:
```json
{
  "jest": {
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js"
    ]
  }
}
```

**Solutions:**

**Run Coverage Report:**
```bash
# Generate coverage report
npm run test:coverage

# View detailed coverage
open coverage/lcov-report/index.html
```

**Increase Test Coverage:**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/routes/hello.test.js
```

### 6.4 CI/CD Pipeline Failures

**Problem:** Tests pass locally but fail in CI/CD

**Common Causes:**
- Environment differences
- Missing environment variables
- Different Node.js versions
- Network timeouts

**Solutions:**

**Check CI Environment:**
```yaml
# GitHub Actions example
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22.x'
    cache: 'npm'

- name: Install dependencies
  run: npm ci

- name: Run tests
  run: npm test
  env:
    NODE_ENV: test
```

**Increase Test Timeouts:**
```javascript
// In Jest configuration
{
  "testTimeout": 10000  // 10 seconds for CI
}
```

---

## 7. API Endpoint and Response Issues

### 7.1 GET /hello Endpoint Problems

**Problem:** The main `/hello` endpoint not responding correctly

**Expected Behavior:**
```bash
# Correct request
curl -i http://localhost:3000/hello

# Expected response
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world
```

**Diagnostic Steps:**

**Check Server Status:**
```bash
# Verify server is running
curl -i http://localhost:3000/hello

# Check with verbose output
curl -v http://localhost:3000/hello
```

**Check Application Logs:**
```bash
# Start server with logging
npm start

# Look for request logs in console output
```

### 7.2 Incorrect Response Format

**Problem:** API returns unexpected response format

**Common Issues:**

**Wrong Content-Type:**
```bash
# If getting JSON instead of plain text
Content-Type: application/json

# Should be:
Content-Type: text/plain; charset=utf-8
```

**Verify Route Handler:**
Check the hello route implementation in your codebase matches the API documentation.

### 7.3 404 Errors for Valid Endpoints

**Problem:** GET /hello returns 404 instead of 200

**Diagnostic Steps:**

**Check Route Registration:**
```bash
# Verify routes are properly mounted
node -e "
const { createApp } = require('./app.js');
const app = createApp();
console.log('Routes registered:', app._router.stack.length);
"
```

**Check URL Path:**
```bash
# Ensure exact path match
curl http://localhost:3000/hello    # Correct
curl http://localhost:3000/Hello    # Wrong (case sensitive)
curl http://localhost:3000/hello/   # May be wrong depending on route config
```

### 7.4 Method Not Allowed (405) Errors

**Problem:** Wrong HTTP method used

**Correct Usage:**
```bash
# Correct: GET method
curl -X GET http://localhost:3000/hello

# Incorrect: Other methods
curl -X POST http://localhost:3000/hello    # Returns 405
curl -X PUT http://localhost:3000/hello     # Returns 405
```

**Response for Unsupported Methods:**
```json
{
  "success": false,
  "message": "Method Not Allowed",
  "code": "METHOD_NOT_ALLOWED",
  "status": 405
}
```

---

## 8. Logging and Debugging

### 8.1 Application Logging

**The application implements structured logging via `utils/logger.js`:**

**Log Levels:**
- `debug` - Detailed development information
- `info` - General application information  
- `warn` - Warning conditions
- `error` - Error conditions requiring attention

**Enable Debug Logging:**
```bash
# Start with debug output
DEBUG=* npm start

# Express-specific debugging
DEBUG=express:* npm start

# Application-specific debugging
NODE_ENV=development npm start
```

### 8.2 Request Logging

**The application logs all HTTP requests via middleware:**

**Request Log Format:**
```bash
# Example log output
[timestamp] INFO: HTTP Request - Method: GET, URL: /hello, IP: 127.0.0.1
[timestamp] INFO: HTTP Response - Status: 200, Time: 15ms
```

**Access Request Logs:**
```bash
# View real-time logs
npm start

# Save logs to file
npm start > app.log 2>&1
```

### 8.3 Error Logging

**Error Logging Features:**
- Comprehensive error context
- Stack traces (development only)
- Request information
- Timestamp and error classification

**View Error Logs:**
```bash
# Trigger an error for testing
curl http://localhost:3000/nonexistent

# Check logs for error details
# Look for ERROR level messages in console output
```

### 8.4 Debugging Techniques

**Node.js Inspector:**
```bash
# Start with Node.js debugger
node --inspect server.js

# Connect with Chrome DevTools
# Navigate to chrome://inspect
```

**Debug Mode:**
```bash
# Run tests in debug mode
npm run test:debug

# Debug specific test file
node --inspect-brk node_modules/.bin/jest --runInBand tests/routes/hello.test.js
```

**Add Custom Logging:**
```javascript
// Add temporary debug logging
console.log('Debug: Request received', req.method, req.url);
console.log('Debug: Response data', responseData);
```

---

## 9. Deployment and Production Issues

### 9.1 Production Environment Setup

**Environment Configuration:**
```bash
# Set production environment
export NODE_ENV=production

# Set production port
export PORT=3000

# Verify configuration
node -e "console.log(require('./config/index.js').getConfigInfo())"
```

**Production Dependencies:**
```bash
# Install only production dependencies
npm install --only=production

# Or use npm ci for consistent installs
npm ci --only=production
```

### 9.2 Process Management

**Production Process Management:**

**Option 1: PM2 (Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start server.js --name "nodejs-tutorial-backend"

# Monitor
pm2 status
pm2 logs nodejs-tutorial-backend
```

**Option 2: Systemd Service**
```bash
# Create systemd service file
sudo nano /etc/systemd/system/nodejs-tutorial.service

# Service content:
[Unit]
Description=Node.js Tutorial Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/app
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

### 9.3 Memory and Performance Issues

**Memory Monitoring:**
```bash
# Check memory usage
node -e "console.log(process.memoryUsage())"

# Monitor with htop or top
htop
```

**Performance Optimization:**
```bash
# Enable production optimizations
NODE_ENV=production npm start

# Monitor performance
npm install -g clinic
clinic doctor -- node server.js
```

### 9.4 Reverse Proxy Configuration

**Nginx Configuration Example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 9.5 Health Checks

**Basic Health Check:**
```bash
# Check if application is responding
curl -f http://localhost:3000/hello || exit 1

# Advanced health check
curl -f http://localhost:3000/health || exit 1
```

**Docker Health Check:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/hello || exit 1
```

---

## 10. Where to Get Help

### 10.1 Documentation Resources

**Project Documentation:**
- `docs/api.md` - Complete API reference with endpoints, error codes, and examples
- `docs/testing.md` - Comprehensive testing guide with setup, examples, and troubleshooting
- `README.md` - Project overview, setup instructions, and quick start guide
- `package.json` - Dependencies, scripts, and project metadata

**Technology Documentation:**
- [Node.js Official Documentation](https://nodejs.org/docs/) - Runtime environment and built-in modules
- [Express.js 5.x Guide](https://expressjs.com/en/5x/api.html) - Framework documentation for version 5
- [Jest Testing Framework](https://jestjs.io/docs/getting-started) - Testing framework documentation
- [npm Documentation](https://docs.npmjs.com/) - Package manager and registry

### 10.2 Common Error Resolution Steps

**Before Seeking Help, Try These Steps:**

1. **Check the Basics:**
   ```bash
   # Verify Node.js and npm versions
   node --version  # Should be >=18.0.0
   npm --version   # Should be >=9.0.0
   
   # Check if dependencies are installed
   npm list --depth=0
   ```

2. **Clear and Reinstall:**
   ```bash
   # Clean slate installation
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

3. **Check Configuration:**
   ```bash
   # Verify environment configuration
   echo "NODE_ENV: $NODE_ENV"
   echo "PORT: $PORT"
   
   # Test configuration loading
   node -e "console.log(require('./config/index.js').getConfigInfo())"
   ```

4. **Test Basic Functionality:**
   ```bash
   # Start the server
   npm start
   
   # Test the main endpoint
   curl http://localhost:3000/hello
   ```

### 10.3 Support Channels

**GitHub Repository:**
- **Issues**: Report bugs, request features, or ask questions
- **Discussions**: Community discussions and general questions
- **Pull Requests**: Contribute improvements or fixes

**Community Resources:**
- **Stack Overflow**: Tag questions with `nodejs`, `express`, and `jest`
- **Reddit**: r/node, r/javascript, r/webdev communities
- **Discord/Slack**: Various Node.js and web development communities

### 10.4 Reporting Issues

**When Reporting Issues, Include:**

1. **Environment Information:**
   ```bash
   # Gather system information
   node --version
   npm --version
   cat package.json
   echo "OS: $(uname -a)"
   ```

2. **Error Details:**
   - Complete error message and stack trace
   - Steps to reproduce the issue
   - Expected vs. actual behavior
   - Configuration files (sanitized)

3. **Debugging Information:**
   ```bash
   # Include debug output
   DEBUG=* npm start > debug.log 2>&1
   
   # Include test results
   npm test > test-results.log 2>&1
   ```

### 10.5 Contributing Guidelines

**Before Contributing:**
- Read the project's README and contributing guidelines
- Check existing issues to avoid duplicates
- Follow the established code style and patterns
- Include tests for new features or fixes
- Update documentation for API changes

**Code Style:**
- Follow ESLint configuration in `package.json`
- Use Prettier for code formatting
- Include comprehensive comments for educational value
- Maintain consistency with existing codebase

### 10.6 Educational Resources

**Learning Node.js and Express:**
- [Node.js Guides](https://nodejs.org/en/docs/guides/) - Official Node.js learning resources
- [Express.js Tutorial](https://expressjs.com/en/starter/installing.html) - Getting started with Express
- [MDN HTTP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP) - Understanding HTTP concepts

**Testing and Quality:**
- [Jest Documentation](https://jestjs.io/docs/getting-started) - JavaScript testing framework
- [SuperTest Guide](https://github.com/ladjs/supertest) - HTTP assertion library
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices) - Comprehensive testing guide

### 10.7 Emergency Troubleshooting

**Quick Recovery Steps:**

1. **Server Won't Start:**
   ```bash
   # Check for port conflicts
   lsof -i :3000
   kill -9 [PID]
   
   # Try different port
   PORT=3001 npm start
   ```

2. **Dependencies Broken:**
   ```bash
   # Nuclear option - fresh start
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

3. **Tests Failing:**
   ```bash
   # Run single test for debugging
   npm test -- --testNamePattern="hello endpoint"
   
   # Check test environment
   NODE_ENV=test npm test
   ```

4. **Production Issues:**
   ```bash
   # Check logs
   pm2 logs nodejs-tutorial-backend
   
   # Restart application
   pm2 restart nodejs-tutorial-backend
   ```

---

## Conclusion

This troubleshooting guide covers the most common issues encountered when working with the Node.js tutorial backend application. The application is designed to be educational and user-friendly, with comprehensive error handling and logging to help identify and resolve issues quickly.

**Key Takeaways:**
- Always verify Node.js version compatibility (>=18.0.0)
- Use the provided configuration utilities in `config/index.js`
- Leverage the comprehensive error handling in `middleware/errorHandler.js`
- Refer to `docs/api.md` and `docs/testing.md` for detailed guidance
- Clear and reinstall dependencies when in doubt
- Check logs for detailed error information

**Remember:** The application is built with Express 5.1.0 and modern Node.js features, providing enhanced error handling and security. Most issues can be resolved by following the diagnostic steps and solutions provided in this guide.

For issues not covered in this guide, please refer to the support channels and community resources listed above. The project maintainers and community are committed to helping users succeed with this educational application.

**Document Version:** 1.0.0  
**Last Updated:** January 2024  
**Compatible With:** Node.js 18+, Express 5.1.0, npm 9+