# Getting Started with Node.js Tutorial Backend

A comprehensive guide for setting up, configuring, and running the Node.js tutorial backend. This guide provides step-by-step instructions for new developers to quickly get the Express.js v5.1.0 server running in development, production, and containerized environments.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js v22.x LTS (Jod)** - Required for compatibility with Express.js v5.1.0
- **npm v11.4.2+** - Package manager (included with Node.js)
- **Git** - For cloning the repository
- **Docker** (optional) - For containerized deployment
- **Docker Compose v2.24+** (optional) - For multi-container orchestration

## 1. Clone and Install

### Step 1: Install Node.js v22.x LTS

**Option A: Download from Official Website**
1. Visit [nodejs.org](https://nodejs.org/) and download Node.js v22.x LTS
2. Follow the installation instructions for your operating system
3. Verify installation:
   ```bash
   node --version  # Should show v22.11.0 or higher
   npm --version   # Should show v11.4.2 or higher
   ```

**Option B: Use Node Version Manager (nvm)**
1. Install nvm from [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm)
2. Install and use Node.js v22.11.0:
   ```bash
   nvm install 22.11.0
   nvm use 22.11.0
   nvm alias default 22.11.0
   ```

### Step 2: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd nodejs-tutorial-backend/src/backend

# Verify you're in the correct directory
ls -la  # Should see package.json, app.js, and other project files
```

### Step 3: Use Correct Node.js Version

The project includes a `.nvmrc` file that specifies the exact Node.js version:

```bash
# If using nvm, automatically use the correct version
nvm use
# Output: Found '/path/to/.nvmrc' with version <22.11.0>
# Output: Now using node v22.11.0 (npm v11.4.2)

# Verify the version matches project requirements
cat .nvmrc  # Shows: 22.11.0
```

### Step 4: Install Dependencies

```bash
# Install all dependencies (including development dependencies)
npm install

# Verify installation completed successfully
npm list --depth=0
```

**Expected output**: You should see all dependencies from `package.json` installed without errors, including:
- express@^5.1.0
- helmet@^7.0.0
- morgan@^1.10.0
- nodemon@^3.0.0 (dev dependency)
- jest@^29.0.0 (dev dependency)

## 2. Environment Configuration

### Step 1: Create Environment File

Copy the environment template and customize it for your local setup:

```bash
# Copy the template to create your local environment file
cp .env.example .env

# Verify the file was created
ls -la .env*
```

### Step 2: Configure Environment Variables

Open `.env` in your preferred editor and configure the following variables:

```bash
# ==============================================================================
# SERVER CONFIGURATION
# ==============================================================================

# The port the HTTP server will listen on
# Default: 3000 (standard development port)
PORT=3000

# The Node.js environment setting
# Valid values: development, production, test
# Default: development
NODE_ENV=development

# HTTP request timeout in milliseconds
# Default: 30000 (30 seconds)
REQUEST_TIMEOUT_MS=30000

# ==============================================================================
# LOGGING CONFIGURATION
# ==============================================================================

# Log level for the application logger
# Valid values: info, warn, error
# Default: info
LOG_LEVEL=info
```

### Step 3: Environment Variable Descriptions

| Variable | Purpose | Default | Valid Values |
|----------|---------|---------|--------------|
| `PORT` | HTTP server listening port | 3000 | 1024-65535 |
| `NODE_ENV` | Environment mode for Express.js | development | development, production, test |
| `REQUEST_TIMEOUT_MS` | Request timeout duration | 30000 | Positive integer (milliseconds) |
| `LOG_LEVEL` | Application logging verbosity | info | info, warn, error |

**Note**: The defaults in `.env.example` are optimized for local development. You typically don't need to change them unless you have port conflicts or specific requirements.

## 3. Development Workflow

### Step 1: Start Development Server

```bash
# Start the server in development mode with hot-reload
npm run dev
```

**Expected output**:
```
[nodemon] 3.0.2
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): app.js index.js config/ controllers/ routes/ middleware/ utils/
[nodemon] watching extensions: js,json
[nodemon] starting `node --experimental-specifier-resolution=node --trace-warnings app.js`
Server started successfully on port 3000
Environment: development
Process ID: 12345
```

### Step 2: Understanding Hot-Reload

The development server uses **nodemon** to automatically restart when you make changes:

- **Watched files**: All `.js` and `.json` files in source directories
- **Ignored files**: `node_modules/`, `*.test.js`, `coverage/`
- **Restart trigger**: Save any watched file to trigger automatic restart
- **Manual restart**: Type `rs` and press Enter in the terminal

**Configuration** (from `nodemon.json`):
```json
{
  "watch": ["app.js", "index.js", "config/", "controllers/", "routes/", "middleware/", "utils/"],
  "ext": "js,json",
  "ignore": ["node_modules/", "logs/", "coverage/", "__tests__/", "*.test.js"],
  "delay": "200"
}
```

### Step 3: Development Server Features

- **Automatic restarts** on file changes
- **Enhanced logging** with request details
- **Error stack traces** for debugging
- **Source map support** for better error reporting
- **Development middleware** for debugging

### Step 4: Stop Development Server

To stop the development server:
```bash
# Press Ctrl+C (Cmd+C on macOS) in the terminal
# Or type 'rs' followed by 'q' and Enter
```

## 4. Production Workflow

### Step 1: Configure Production Environment

Create a production environment configuration:

```bash
# Create production environment file (optional)
cp .env.example .env.production

# Edit production-specific values
# PORT=8080
# NODE_ENV=production
# REQUEST_TIMEOUT_MS=60000
# LOG_LEVEL=warn
```

### Step 2: Start Production Server

```bash
# Start the server in production mode
npm start
```

**Expected output**:
```
Server started successfully on port 3000
Environment: production
Process ID: 12345
Request timeout: 30000ms
Graceful shutdown handlers registered
```

### Step 3: Production Server Features

- **Optimized performance** with Express.js production settings
- **Reduced logging** to essential information only
- **Error handling** without exposing sensitive details
- **Graceful shutdown** handling for SIGTERM/SIGINT signals
- **Request timeout** protection against hanging connections

### Step 4: Production Monitoring

Monitor the production server using these commands:

```bash
# Check server process
ps aux | grep node

# Monitor system resources
top -p $(pgrep -f "node.*app.js")

# View server logs (if logging to file)
tail -f logs/application.log
```

### Step 5: Stop Production Server

```bash
# Graceful shutdown (recommended)
kill -TERM $(pgrep -f "node.*app.js")

# Or use Ctrl+C if running in foreground
```

## 5. Docker and Compose Workflow

### Step 1: Build Docker Image

```bash
# Build the Docker image
docker build -t nodejs-tutorial-backend .

# Verify the image was created
docker images | grep nodejs-tutorial-backend
```

### Step 2: Run Docker Container

**Option A: Basic container run**
```bash
# Run container with default settings
docker run -p 3000:3000 nodejs-tutorial-backend
```

**Option B: Run with environment variables**
```bash
# Run with custom environment variables
docker run -p 4000:4000 \
  -e PORT=4000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=warn \
  nodejs-tutorial-backend
```

**Option C: Run with environment file**
```bash
# Run using .env file
docker run -p 3000:3000 --env-file .env nodejs-tutorial-backend
```

### Step 3: Docker Compose Orchestration

**Start with Docker Compose**:
```bash
# Start all services defined in docker-compose.yml
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Start with build (rebuild image if needed)
docker-compose up --build
```

**Expected output**:
```
Creating network "tutorial-network" with driver "bridge"
Creating nodejs-tutorial-backend ... done
Attaching to nodejs-tutorial-backend
nodejs-tutorial-backend | Server started successfully on port 3000
nodejs-tutorial-backend | Environment: production
```

### Step 4: Docker Management Commands

```bash
# View running containers
docker-compose ps

# View container logs
docker-compose logs -f backend

# Execute commands in running container
docker-compose exec backend node -e "console.log('Health check')"

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Step 5: Docker Health Checks

The container includes built-in health monitoring:

```bash
# Check container health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect nodejs-tutorial-backend | grep -A 10 "Health"
```

## 6. Endpoint Validation

### Step 1: Test with Browser

1. Open your web browser
2. Navigate to: `http://localhost:3000/hello`
3. **Expected response**: Plain text "Hello world"
4. **Status code**: 200 OK

### Step 2: Test with cURL

```bash
# Basic GET request
curl http://localhost:3000/hello

# Expected output: Hello world

# Detailed request with headers
curl -v http://localhost:3000/hello

# Expected output includes:
# > GET /hello HTTP/1.1
# < HTTP/1.1 200 OK
# < Content-Type: text/plain; charset=utf-8
# Hello world
```

### Step 3: Test with HTTP Clients

**Using HTTPie** (if installed):
```bash
http GET localhost:3000/hello
```

**Using Postman**:
1. Create new GET request
2. URL: `http://localhost:3000/hello`
3. Send request
4. Verify 200 OK response with "Hello world" body

### Step 4: Test Error Scenarios

```bash
# Test 404 Not Found
curl http://localhost:3000/nonexistent
# Expected: 404 status with JSON error response

# Test 405 Method Not Allowed
curl -X POST http://localhost:3000/hello
# Expected: 405 status with allowed methods

# Test with invalid path
curl http://localhost:3000/hello/extra
# Expected: 404 status
```

### Step 5: Validate Response Headers

```bash
# Check security headers
curl -I http://localhost:3000/hello

# Expected security headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 0
```

## 7. Code Quality and Testing

### Step 1: Run Linting

```bash
# Check code quality with ESLint
npm run lint

# Fix auto-fixable linting issues
npm run lint:fix
```

**Expected output** (no issues):
```
✨ Your code looks great!
```

### Step 2: Run Code Formatting

```bash
# Check code formatting with Prettier
npm run format:check

# Format code automatically
npm run format
```

### Step 3: Run Test Suite

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Expected test output**:
```
PASS __tests__/integration/app.integration.test.js
PASS __tests__/unit/controllers/helloController.test.js

Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        2.345 s
```

### Step 4: Coverage Requirements

The project maintains high code coverage standards:

| Metric | Target | Current |
|--------|--------|---------|
| Line Coverage | 90% | 95%+ |
| Function Coverage | 100% | 100% |
| Branch Coverage | 80% | 85%+ |
| Statement Coverage | 90% | 95%+ |

### Step 5: CI/CD Integration

```bash
# Run the complete CI pipeline locally
npm run lint
npm run format:check
npm run test:ci
npm audit
```

**All commands should pass** without errors for successful deployment.

## 8. Troubleshooting

### Common Issues and Solutions

#### Issue: Port Already in Use

**Symptoms**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions**:
```bash
# Option 1: Kill the process using the port
lsof -ti:3000 | xargs kill -9

# Option 2: Use a different port
PORT=3001 npm run dev

# Option 3: Find and stop the conflicting process
netstat -tulpn | grep 3000
```

#### Issue: Node.js Version Mismatch

**Symptoms**:
```
Node.js version v18.0.0 detected. Required: >=22.0.0
```

**Solutions**:
```bash
# Check current version
node --version

# Install correct version with nvm
nvm install 22.11.0
nvm use 22.11.0

# Or download from nodejs.org and reinstall
```

#### Issue: Missing Dependencies

**Symptoms**:
```
Error: Cannot find module 'express'
```

**Solutions**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Or update npm and retry
npm install -g npm@latest
npm install
```

#### Issue: Environment Variables Not Loading

**Symptoms**:
```
Server using default port 3000 (PORT env var not set)
```

**Solutions**:
```bash
# Verify .env file exists and has correct format
cat .env

# Check for syntax errors (no spaces around =)
# Correct: PORT=3000
# Incorrect: PORT = 3000

# Ensure .env is in the correct directory (src/backend/)
pwd  # Should show .../nodejs-tutorial-backend/src/backend
```

#### Issue: Docker Build Failures

**Symptoms**:
```
ERROR: failed to solve: process "/bin/sh -c npm ci" did not complete successfully
```

**Solutions**:
```bash
# Clear Docker cache and rebuild
docker system prune -f
docker build --no-cache -t nodejs-tutorial-backend .

# Check Docker disk space
docker system df

# Verify Dockerfile syntax
docker build --dry-run -t nodejs-tutorial-backend .
```

#### Issue: Tests Failing

**Symptoms**:
```
FAIL __tests__/integration/app.integration.test.js
Connection timeout
```

**Solutions**:
```bash
# Increase test timeout
export TEST_TIMEOUT=10000
npm test

# Run tests individually to isolate issues
npm test -- __tests__/unit/

# Clear Jest cache
npx jest --clearCache
```

### Performance Issues

#### Slow Response Times

**Diagnosis**:
```bash
# Check system resources
top
df -h

# Monitor Node.js process
node --prof app.js  # Enable profiling
```

**Solutions**:
- Increase system memory
- Check for memory leaks
- Optimize database queries (if applicable)
- Enable response compression

#### High Memory Usage

**Diagnosis**:
```bash
# Monitor memory usage
ps aux | grep node
node --inspect app.js  # Enable debugging
```

**Solutions**:
- Restart the server regularly
- Check for memory leaks in code
- Adjust garbage collection settings
- Monitor for circular references

### Getting Additional Help

#### Log Analysis

```bash
# Enable detailed logging
LOG_LEVEL=debug npm run dev

# Check system logs
tail -f /var/log/system.log  # macOS
journalctl -f  # Linux
```

#### Debug Mode

```bash
# Start in debug mode
node --inspect app.js

# Connect Chrome DevTools
# Open chrome://inspect in Chrome browser
```

#### Community Support

- **GitHub Issues**: [Repository Issues](https://github.com/tutorial/nodejs-tutorial-backend/issues)
- **Stack Overflow**: Tag questions with `nodejs`, `express`, `tutorial`
- **Node.js Documentation**: [nodejs.org/docs](https://nodejs.org/docs/)
- **Express.js Guide**: [expressjs.com](https://expressjs.com/)

---

## Next Steps

After successfully setting up the development environment:

1. **Explore the API**: Review [docs/api.md](../api.md) for complete endpoint documentation
2. **Learn Deployment**: Follow [docs/deployment.md](../deployment.md) for production deployment
3. **Understand Testing**: Study [docs/testing.md](../testing.md) for testing strategies
4. **Review Architecture**: Examine the codebase structure and patterns
5. **Contribute**: Consider contributing improvements or documentation updates

The Node.js tutorial backend is now ready for development, testing, and deployment across all supported environments.