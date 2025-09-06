# Node.js Hello World Tutorial

> Educational Node.js application demonstrating fundamental web server concepts using Express.js 5.1.0 framework and Node.js 22.x LTS runtime

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![Express.js Version](https://img.shields.io/badge/express-5.1.0-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](coverage/)

## 🎯 Project Overview

This Node.js tutorial application provides a comprehensive learning experience for developers studying HTTP server fundamentals, Express.js framework integration, and modern JavaScript development practices. Built with **Node.js 22.11.0 LTS** and **Express.js 5.1.0**, the application demonstrates essential web development concepts through a simple yet production-ready HTTP endpoint.

### 🌟 Key Features

- **Single `/hello` HTTP endpoint** returning 'Hello world' response
- **Express.js 5.1.0** with enhanced async/await support and automatic promise error handling
- **Node.js 22.x LTS runtime** with improved performance and security features
- **Comprehensive middleware stack** including logging, security, and error handling
- **Production-ready architecture patterns** while maintaining educational simplicity
- **Complete test suite** with Jest and Supertest for HTTP endpoint testing
- **Docker containerization support** for consistent deployment across environments
- **Development tooling** with ESLint, Prettier, and Nodemon for enhanced productivity

### 📚 Educational Objectives

- Understanding Node.js HTTP server creation and Express.js framework integration
- Implementing REST API endpoints with proper HTTP method handling and status codes
- Configuring middleware architecture for logging, security, and error handling
- Writing comprehensive test suites for HTTP endpoints using Jest and Supertest
- Setting up development environments with modern Node.js development tooling
- Applying production deployment patterns including containerization and process management
- Following industry best practices for code quality, security, and performance optimization

## 📋 Prerequisites and Requirements

### System Requirements

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 22.11.0 LTS (minimum 18.x) | JavaScript runtime environment |
| **npm** | 11.5.2 or higher | Package management and script execution |
| **Git** | Latest stable | Version control and repository management |
| **curl** | Latest stable | API testing and health checks |

### Hardware Requirements

- **Operating System**: Linux, macOS, or Windows with Node.js support
- **Memory**: 512MB RAM minimum, 1GB recommended for development
- **Storage**: 100MB minimum, 500MB recommended with node_modules
- **Network**: Internet connection for package installation and tutorial resources

### Knowledge Prerequisites

- Basic JavaScript programming knowledge and ES2022+ syntax familiarity
- Understanding of HTTP protocol fundamentals including methods, status codes, and headers
- Command line interface familiarity for running npm commands and scripts
- Basic understanding of JSON format and REST API concepts
- Optional: Docker knowledge for containerization and deployment scenarios

## 🚀 Quick Start Guide

Get up and running in under 5 minutes:

### Installation Steps

1. **Clone the repository and navigate to backend directory**:
   ```bash
   git clone <repository-url>
   cd src/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Copy environment configuration**:
   ```bash
   cp .env.example .env
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Test the endpoint**:
   ```bash
   curl http://localhost:3000/hello
   # Expected response: "Hello world"
   ```

### Verification Commands

Run these commands to verify your setup:

```bash
# Check Node.js version (should show v22.x.x or higher)
node --version

# Check npm version (should show 11.x.x or higher)
npm --version

# Run test suite (should pass all tests successfully)
npm test

# Check code quality (should show no linting errors)
npm run lint
```

Your development server should now be running at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure and Architecture

### Directory Layout

```
src/backend/
├── src/                    # Application source code with modular organization
│   ├── app.js             # Main Express.js application configuration and middleware setup
│   ├── server.js          # HTTP server entry point with Node.js server creation and lifecycle management
│   ├── routes/            # Express.js router modules for endpoint organization and route handling
│   ├── controllers/       # Controller functions implementing business logic for route handlers
│   ├── services/          # Service layer for business logic and data processing
│   ├── middleware/        # Custom middleware for logging, security, error handling, and health checks
│   └── utils/             # Utility functions for configuration management, logging, and application constants
├── config/                # Environment-specific configuration files for development, production, and testing
│   ├── default.js         # Base application configuration
│   ├── development.js     # Development environment overrides
│   ├── production.js      # Production environment optimizations
│   └── test.js            # Test environment configuration
├── test/                  # Comprehensive test suites including unit tests and integration tests
│   ├── unit/              # Component-level tests for routes, controllers, middleware, and utilities
│   ├── integration/       # End-to-end HTTP endpoint testing with Supertest
│   ├── fixtures/          # Test data and mock objects for consistent test scenarios
│   └── helpers/           # Utility functions and setup code for test environment
├── docs/                  # Detailed documentation for API, development, deployment, and security practices
│   ├── api.md             # Comprehensive API documentation with examples
│   ├── development.md     # Development environment setup and workflow guide
│   └── deployment.md      # Production deployment and containerization guide
├── scripts/               # Build, deployment, and maintenance scripts for development workflow automation
└── package.json           # Project metadata, dependencies, and npm scripts
```

### Architecture Overview

The application implements an **event-driven architecture** leveraging Node.js single-threaded event loop for efficient I/O operations, Express.js middleware stack for request processing, and modular component organization for maintainability and educational clarity.

## 🔌 API Endpoints and Usage

### Main Application Endpoint

#### GET /hello

The primary tutorial endpoint demonstrating basic HTTP request/response patterns.

**Description**: Returns a simple "Hello world" greeting message  
**Method**: `GET`  
**Path**: `/hello`

**Response Format**:
- **Status Code**: `200 OK` for successful requests
- **Content-Type**: `text/plain` for simple text response format
- **Response Body**: `Hello world`

**Example Usage**:

```bash
# Basic request
curl http://localhost:3000/hello

# Verbose output showing headers
curl -v http://localhost:3000/hello

# Explicit GET method specification
curl -X GET http://localhost:3000/hello
```

**JavaScript Fetch Example**:
```javascript
fetch('http://localhost:3000/hello')
  .then(response => response.text())
  .then(data => console.log(data)); // "Hello world"
```

### Health Monitoring Endpoints

#### GET /health
**Description**: Basic server health status with uptime and configuration information

```bash
curl http://localhost:3000/health
```

**Response Example**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "system": {
    "nodeVersion": "v22.11.0",
    "platform": "linux"
  }
}
```

#### GET /livez
**Description**: Kubernetes-compatible liveness probe for container orchestration

```bash
curl http://localhost:3000/livez
```

#### GET /readyz
**Description**: Kubernetes-compatible readiness probe indicating server ready state

```bash
curl http://localhost:3000/readyz
```

### Error Responses

| Status Code | Description | Example Scenario |
|-------------|-------------|------------------|
| **404** | Not Found | Invalid paths other than /hello |
| **405** | Method Not Allowed | Non-GET methods on /hello endpoint |
| **500** | Internal Server Error | Unexpected server errors |

## 🛠 Development Environment and Workflow

### Available NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| **start** | `npm start` | Start production server with optimized settings |
| **dev** | `npm run dev` | Start development server with hot reloading using nodemon |
| **test** | `npm test` | Run complete test suite with Jest and Supertest |
| **test:watch** | `npm run test:watch` | Run tests in watch mode for continuous development |
| **test:coverage** | `npm run test:coverage` | Generate code coverage report with Istanbul |
| **lint** | `npm run lint` | Check code quality with ESLint standard configuration |
| **lint:fix** | `npm run lint:fix` | Automatically fix ESLint issues |
| **format** | `npm run format` | Format code with Prettier for consistent style |

### Development Setup Commands

```bash
# Install all dependencies including devDependencies
npm install

# Start development server with hot reloading
npm run dev

# Run complete test suite
npm test

# Check code quality and automatically fix issues
npm run lint:fix

# Format code for consistent style
npm run format
```

### Development Features

- **Hot reloading** with nodemon for automatic server restart on file changes
- **Enhanced logging** in development mode with request/response details and timing
- **Relaxed security settings** for easier development and debugging workflows
- **Source maps** enabled for accurate debugging locations in development tools
- **Express.js development error handler** with detailed stack traces and HTML formatting

### Testing Workflow

#### Test Commands

```bash
# Run all tests (unit and integration)
npm test

# Run unit tests only for individual components
npm run test:unit

# Run integration tests for HTTP endpoints
npm run test:integration

# Run tests in watch mode for continuous development
npm run test:watch

# Generate code coverage report
npm run test:coverage
```

#### Test Structure

- **Unit Tests**: `test/unit/` - Component-level tests for routes, controllers, middleware, and utilities
- **Integration Tests**: `test/integration/` - End-to-end HTTP endpoint testing with Supertest
- **Test Fixtures**: `test/fixtures/` - Test data and mock objects for consistent test scenarios
- **Test Helpers**: `test/helpers/` - Utility functions and setup code for test environment

#### Coverage Requirements

The project maintains high code quality standards with minimum coverage requirements:

| Metric | Threshold |
|--------|-----------|
| **Lines** | 95% |
| **Functions** | 100% |
| **Branches** | 90% |
| **Statements** | 95% |

### Code Quality Standards

- **ESLint** with Standard JavaScript style guide for consistent code quality
- **Prettier** for automatic code formatting with standardized style configuration
- **Pre-commit hooks** with Husky and lint-staged for automatic linting and formatting
- **Minimum 95% code coverage** enforced by Jest configuration

## 🚀 Deployment Options and Production Setup

### Local Development Deployment

```bash
# Start production server with optimized settings
npm start

# Set environment for production optimizations
NODE_ENV=production npm start
```

**Recommended**: Use PM2 or similar process managers for production stability and process management.

### Docker Containerization

#### Build and Run Docker Image

```bash
# Build production Docker image
docker build -t nodejs-hello-tutorial:latest .

# Run container with port mapping
docker run -p 3000:3000 nodejs-hello-tutorial:latest

# Run with environment variables
docker run -p 3000:3000 -e NODE_ENV=production nodejs-hello-tutorial:latest
```

#### Docker Compose Development

```bash
# Start development environment
docker-compose up --build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d
```

The Docker implementation includes comprehensive security features:
- **Non-root execution**: Container runs as `node` user (uid 1000)
- **Read-only filesystem**: Root filesystem mounted read-only for security
- **Minimal base image**: Alpine Linux reduces attack surface (~40MB final size)
- **Multi-stage build**: Separate build and production stages for optimization

### Kubernetes Deployment

#### Deploy to Kubernetes Cluster

```bash
# Create namespace
kubectl apply -f infrastructure/deployment/kubernetes/namespace.yml

# Deploy application
kubectl apply -f infrastructure/deployment/kubernetes/deployment.yml

# Monitor rollout status
kubectl rollout status deployment/nodejs-tutorial --namespace=nodejs-tutorial

# Verify deployment
kubectl get pods -n nodejs-tutorial
```

#### Access the Application

```bash
# Port forward for local access
kubectl port-forward service/nodejs-tutorial-service 3000:3000 -n nodejs-tutorial

# Test endpoints
curl http://localhost:3000/hello
curl http://localhost:3000/health
```

**Kubernetes Features**:
- **High availability**: 3 replicas with anti-affinity rules
- **Rolling updates**: Zero-downtime deployment strategy  
- **Health monitoring**: Comprehensive liveness, readiness, and startup probes
- **Security context**: Restricted pod security with non-root execution
- **Resource management**: CPU and memory limits with requests

### Cloud Platform Deployment

#### Google Cloud Run

```bash
# Build and push to Google Container Registry
docker tag nodejs-hello-tutorial:latest gcr.io/YOUR_PROJECT_ID/nodejs-tutorial:latest
docker push gcr.io/YOUR_PROJECT_ID/nodejs-tutorial:latest

# Deploy to Cloud Run
gcloud run deploy nodejs-tutorial \
  --image gcr.io/YOUR_PROJECT_ID/nodejs-tutorial:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Heroku Platform

```bash
# Install Heroku CLI and login
heroku login

# Create app and deploy
heroku create nodejs-tutorial-app
heroku container:push web --app nodejs-tutorial-app
heroku container:release web --app nodejs-tutorial-app
```

#### Additional Cloud Options

- **AWS Elastic Beanstalk**: `eb deploy` with Node.js platform configuration
- **Digital Ocean App Platform**: Direct GitHub integration with Node.js runtime
- **Azure Container Instances**: Container-based deployment with Azure CLI

### Production Considerations

- **Enable HTTPS** with SSL/TLS certificates for secure communication
- **Configure reverse proxy** (nginx, Apache) for static file serving and load balancing
- **Implement process clustering** for multi-core CPU utilization
- **Set up monitoring and logging** for production operational visibility
- **Configure security headers and rate limiting** for protection against common attacks

## 🔧 Configuration and Environment Management

### Environment Configurations

The application uses environment-specific configuration files:

- **Development**: `config/development.js` - Enhanced logging, relaxed security, and debugging features
- **Production**: `config/production.js` - Optimized performance, enhanced security, and minimal logging
- **Test**: `config/test.js` - Isolated test environment with mock services and fast execution

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Runtime environment (development, production, test) |
| `PORT` | 3000 | HTTP server port |
| `HOST` | localhost | Server bind address |
| `LOG_LEVEL` | info | Logging verbosity (debug, info, warn, error) |
| `DEBUG` | false | Debug mode flag for enhanced development logging |

### Configuration Usage

Configurations are automatically loaded based on the `NODE_ENV` environment variable with fallback to development settings for local development.

```bash
# Start with specific environment
NODE_ENV=production PORT=8080 npm start

# Use environment file
cp .env.example .env
# Edit .env with your settings
npm start
```

## 📈 Performance Considerations and Optimization

### Node.js 22.x Performance Features

- **Node.js 22.x LTS** provides enhanced V8 engine performance with improved garbage collection
- **Event loop optimization** with efficient asynchronous I/O operations
- **Memory management** with automatic garbage collection and memory leak prevention
- **Stream processing improvements** for better throughput and reduced memory usage

### Express.js 5.1.0 Optimizations

- **Express.js 5.1.0 automatic promise error handling** reduces middleware overhead
- **Efficient routing** with optimized path matching and middleware composition
- **Response compression and caching strategies** for improved client performance
- **Static file serving optimization** with proper cache headers and ETags

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Response Time** | < 50ms | Hello endpoint under normal load |
| **Throughput** | 1000+ req/sec | Modern hardware capacity |
| **Memory Usage** | < 100MB | Baseline with efficient garbage collection |
| **Startup Time** | < 2 seconds | Development mode |

## 🔒 Security Features and Best Practices

### Built-in Security Features

- **Express.js 5.1.0** includes ReDoS attack prevention and security improvements
- **Security headers middleware** for XSS protection and content security policies
- **Input validation and sanitization** to prevent injection attacks
- **Rate limiting protection** against brute force and DoS attacks

### Security Recommendations

- **Regular dependency updates** with `npm audit` for vulnerability management
- **HTTPS enforcement** in production with proper SSL/TLS configuration
- **Environment variable management** for sensitive configuration data
- **Principle of least privilege** in deployment environments

### Docker Security Features

- **Container runs as non-root user** (uid 1000) for security
- **Read-only root filesystem** prevents runtime modifications
- **Dropped Linux capabilities** (`CAP_DROP: ALL`) reduces attack surface
- **No new privileges** security option prevents privilege escalation

## 🐛 Troubleshooting Common Issues

### Common Errors and Solutions

#### Port Already in Use
```bash
# Error: EADDRINUSE - Port 3000 already in use
# Solution: Use different port
PORT=3001 npm start

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

#### Node Version Compatibility
```bash
# Error: Express 5.0 requires Node.js 18+
# Solution: Upgrade Node.js to compatible version
node --version  # Should be v22.x.x or higher
```

#### Permission Denied
```bash
# Error: EACCES permission denied
# Solution: Use ports above 1024 or run with appropriate permissions
sudo npm start  # Not recommended
# Better: PORT=8080 npm start
```

#### Module Not Found
```bash
# Error: Cannot find module
# Solution: Install dependencies
npm install

# Clear cache if needed
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Debugging Tips

- **Enable debug logging**: `DEBUG=* npm run dev` for detailed information
- **Use Node.js built-in inspector**: `node --inspect src/server.js` for debugging
- **Check server health**: `curl http://localhost:3000/health` endpoint
- **Review logs**: Development mode provides detailed request/response tracing

## 📚 Educational Resources and Next Steps

### Concepts Covered

- **Node.js HTTP server fundamentals** and Express.js framework integration
- **REST API design patterns** with proper HTTP method usage and status codes
- **Middleware architecture** and request/response processing pipeline
- **Asynchronous JavaScript programming** with promises and async/await
- **Testing strategies** for HTTP endpoints with unit and integration tests
- **Modern JavaScript development workflow** with linting, formatting, and automation

### Next Learning Steps

1. **Add database integration** with MongoDB or PostgreSQL for data persistence
2. **Implement user authentication and authorization** with JWT or OAuth
3. **Create additional REST endpoints** for CRUD operations and resource management
4. **Add real-time features** with WebSocket connections and server-sent events
5. **Implement advanced middleware** for caching, rate limiting, and API documentation
6. **Explore microservices architecture** and container orchestration with Kubernetes

### Additional Learning Resources

- [Node.js Official Documentation](https://nodejs.org/docs/) - Comprehensive Node.js reference
- [Express.js Guide](https://expressjs.com/guide/) - Complete Express.js framework guide
- [JavaScript.info](https://javascript.info/) - Modern JavaScript concepts and patterns
- [REST API Design Best Practices](https://restfulapi.net/) - Industry standards and conventions
- [Docker Documentation](https://docs.docker.com/) - Containerization and deployment guide

## 🤝 Contributing Guidelines

### Contribution Process

1. **Fork the repository** and create feature branch for contributions
2. **Follow existing code style** and conventions with ESLint and Prettier
3. **Write comprehensive tests** for new features and maintain coverage requirements
4. **Update documentation** for any API changes or new functionality
5. **Submit pull request** with clear description of changes and testing performed

### Development Standards

- **Follow semantic versioning** for releases and dependency management
- **Maintain backwards compatibility** where possible for educational continuity
- **Include educational comments** and documentation for learning purposes
- **Test all changes** across supported Node.js versions and environments

### Code Quality Requirements

- **ESLint compliance** with Standard JavaScript style guide
- **Prettier formatting** for consistent code style
- **95% minimum test coverage** for all new code
- **Comprehensive documentation** for new features and APIs

## 📄 License and Support Information

### License

**MIT License** - Free to use, modify, and distribute for educational and commercial purposes. See [LICENSE](LICENSE) file for complete terms.

### Support Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support  
- **Documentation**: Comprehensive guides in `docs/` directory
- **Code Comments**: Inline documentation throughout the codebase

### Acknowledgments

- **Node.js community** for runtime environment and ecosystem
- **Express.js team** for web framework and middleware architecture
- **Jest and Supertest communities** for testing framework and HTTP testing utilities
- **Educational technology community** for feedback and suggestions

## 📊 Project Metadata

**Version**: 1.0.0  
**Node.js**: 22.11.0 LTS (minimum 18.x)  
**Express.js**: 5.1.0  
**License**: MIT  
**Maintained By**: Node.js Tutorial Team

### Repository Information

- **Homepage**: [Project Repository](https://github.com/tutorial/nodejs-hello-tutorial#readme)
- **Issues**: [Bug Reports and Features](https://github.com/tutorial/nodejs-hello-tutorial/issues)
- **Repository**: [Source Code](https://github.com/tutorial/nodejs-hello-tutorial.git)

### Keywords

`nodejs`, `express`, `tutorial`, `http-server`, `educational`, `javascript`, `backend`, `web-development`

---

**Get started today**: Follow the [Quick Start Guide](#-quick-start-guide) above to begin your Node.js learning journey!

*Last Updated: Compatible with Node.js 22.11.0 LTS and Express.js 5.1.0*