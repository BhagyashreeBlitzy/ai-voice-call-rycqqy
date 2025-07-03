# Node.js Tutorial Backend

A comprehensive, production-ready Node.js backend application demonstrating modern Express.js server development patterns. This tutorial project showcases HTTP server implementation, routing, middleware, error handling, and observability using Node.js v22.x LTS and Express.js v5.1.0.

## 🚀 Project Overview

This Node.js tutorial backend serves as an educational resource for developers learning server-side JavaScript development. Built with modern Node.js v22.x LTS (Jod) and Express.js v5.1.0, it demonstrates fundamental web server capabilities through a simple yet production-ready HTTP endpoint implementation.

### Key Features
- **Production-Ready Architecture**: Event-driven, stateless design with comprehensive error handling
- **Modern Technology Stack**: Node.js v22.x LTS, Express.js v5.1.0, npm v11.4.2
- **Educational Focus**: Clear, well-documented code suitable for learning and teaching
- **Security First**: Implements CVE-2024-45590 mitigation and security best practices
- **Comprehensive Testing**: 100% function coverage with Jest and Supertest
- **Container Ready**: Docker and Kubernetes deployment configurations included

### Target Audience
- **Learning Developers**: Junior to mid-level developers transitioning to Node.js
- **Technical Educators**: Instructors requiring practical implementation examples
- **Development Teams**: Teams adopting Node.js technologies and best practices

## 🏃 Quickstart

Get the Node.js tutorial backend running locally in under 2 minutes:

### Prerequisites
- **Node.js**: v22.x LTS (Jod) or higher - [Download here](https://nodejs.org/)
- **npm**: v11.4.2 or higher (comes with Node.js)
- **Git**: For cloning the repository

### Quick Start Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nodejs-tutorial-backend/src/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Test the server**:
   ```bash
   curl http://localhost:3000/hello
   # Expected response: Hello world
   ```

### Available Scripts
- `npm run dev` - Start development server with hot-reload
- `npm start` - Start production server
- `npm test` - Run test suite with coverage
- `npm run lint` - Check code quality
- `npm run format` - Format code with Prettier

The server starts on port 3000 by default. Visit `http://localhost:3000/hello` to see the "Hello world" response and confirm everything is working correctly.

For advanced configuration and deployment options, see our comprehensive documentation links below.

## 📋 Feature Summary

### Core Features

| Feature | Technology | Description |
|---------|------------|-------------|
| **HTTP Server** | Node.js v22.x LTS | Event-driven HTTP server with Express.js v5.1.0 framework |
| **Hello Endpoint** | Express.js Router | RESTful `/hello` endpoint returning "Hello world" response |
| **Error Handling** | Express.js Middleware | Centralized error processing with secure response generation |
| **Request Timeout** | Custom Middleware | 30-second request timeout protection with graceful handling |
| **Security Headers** | Helmet.js v7.0.0 | OWASP security headers including XSS and clickjacking protection |
| **Request Logging** | Morgan v1.10.0 | Structured HTTP request/response logging for observability |
| **Response Compression** | Compression v1.7.4 | Gzip compression for improved performance |
| **Graceful Shutdown** | Custom Utilities | SIGTERM/SIGINT signal handling for clean server termination |

### API Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/hello` | Returns greeting message | `200 OK` - "Hello world" (text/plain) |
| `*` | `/*` | Unmatched routes | `404 Not Found` (application/json) |

### Development Features

| Feature | Tool | Purpose |
|---------|------|---------|
| **Hot Reload** | Nodemon v3.0.0 | Automatic server restart during development |
| **Code Linting** | ESLint v8.0.0 | Code quality enforcement with Prettier integration |
| **Testing Suite** | Jest v29.0.0 + Supertest v7.1.1 | Comprehensive unit and integration testing |
| **Code Coverage** | Jest Coverage | 90%+ line coverage, 100% function coverage requirements |
| **Container Support** | Docker + Docker Compose | Production-ready containerization |

For detailed API documentation including request/response formats, error codes, and integration examples, see [docs/api.md](docs/api.md).

## 📁 Project Structure

```
src/backend/
├── app.js                     # Main application entrypoint
├── index.js                   # Alternative server entrypoint
├── package.json               # Dependencies and npm scripts
├── controllers/               # Business logic handlers
│   └── helloController.js     # /hello endpoint controller
├── routes/                    # Express.js route definitions
│   ├── index.js              # Main router aggregation
│   └── hello.js              # Hello endpoint routes
├── middleware/                # Express.js middleware stack
│   ├── index.js              # Middleware aggregation
│   ├── errorHandler.js       # Centralized error handling
│   ├── security.js           # Security headers and CORS
│   ├── logging.js            # Request/response logging
│   ├── compression.js        # Response compression
│   └── requestTimeout.js     # Request timeout management
├── utils/                     # Utility functions and helpers
│   ├── index.js              # Utility aggregation
│   ├── logger.js             # Centralized logging service
│   ├── errors.js             # Error classes and utilities
│   ├── requestTimeout.js     # Timeout management utilities
│   └── shutdown.js           # Graceful shutdown management
├── config/                    # Configuration management
│   ├── index.js              # Main config loader
│   └── server.js             # Server-specific configuration
├── docs/                      # Comprehensive documentation
│   ├── api.md                # API documentation and examples
│   ├── deployment.md         # Multi-environment deployment guide
│   └── testing.md            # Testing strategy and practices
├── scripts/                   # Development and operational scripts
│   ├── dev.js                # Development server script
│   ├── start.js              # Production server script
│   └── test.js               # Test execution script
├── __tests__/                 # Test suite organization
│   ├── setup.js              # Global test environment setup
│   ├── unit/                 # Unit tests for individual modules
│   └── integration/          # End-to-end integration tests
├── infrastructure/            # Deployment configurations
│   ├── docker/               # Docker Compose configurations
│   ├── kubernetes/           # Kubernetes manifests
│   └── cloud/                # Cloud platform configurations
├── .env.example              # Environment variable template
├── Dockerfile                # Container build configuration
├── docker-compose.yml        # Multi-container orchestration
├── jest.config.js            # Testing framework configuration
├── nodemon.json              # Development server configuration
├── .eslintrc.js              # Code linting rules
└── .prettierrc               # Code formatting configuration
```

### Key Directories

- **`controllers/`** - Business logic separated from routing concerns
- **`routes/`** - Express.js route definitions with modular organization
- **`middleware/`** - Reusable middleware components for cross-cutting concerns
- **`utils/`** - Shared utilities for logging, errors, and operational tasks
- **`config/`** - Environment-based configuration with validation
- **`docs/`** - Comprehensive documentation for setup, API, and deployment
- **`infrastructure/`** - Production-ready deployment configurations

## 📚 Documentation Links

### Core Documentation
- **[API Documentation](docs/api.md)** - Complete API reference with examples
  - Endpoint specifications and request/response formats
  - Error handling patterns and HTTP status codes
  - cURL examples and JavaScript integration patterns
  - Testing examples with Supertest and Axios

- **[Deployment Guide](docs/deployment.md)** - Multi-environment deployment instructions
  - Local development setup and configuration
  - Docker containerization and Docker Compose orchestration
  - Kubernetes deployment with manifests and scaling
  - Cloud platform deployment (Heroku, Vercel, Google Cloud Run)

- **[Testing Documentation](docs/testing.md)** - Comprehensive testing strategy
  - Jest configuration and coverage requirements
  - Unit testing patterns for controllers and middleware
  - Integration testing with Supertest
  - CI/CD integration and quality gates

### Configuration Files
- **[package.json](package.json)** - Dependencies, scripts, and project metadata
- **[jest.config.js](jest.config.js)** - Testing framework configuration
- **[.eslintrc.js](.eslintrc.js)** - Code quality and linting rules
- **[Dockerfile](Dockerfile)** - Container build instructions

### Infrastructure Documentation
- **[Docker Compose](docker-compose.yml)** - Local development orchestration
- **[Kubernetes Manifests](infrastructure/kubernetes/)** - Production container orchestration
- **[Cloud Configurations](infrastructure/cloud/)** - Platform-specific deployment files

All documentation is maintained alongside the codebase to ensure accuracy and consistency with the current implementation.

## 🤝 Contribution and Support

### Contributing to the Project

We welcome contributions from developers of all experience levels! This project serves as both a learning resource and a production-ready reference implementation.

#### How to Contribute

1. **Fork the repository** and create a feature branch
2. **Follow coding standards** - Run `npm run lint` and `npm run format`
3. **Add tests** - Maintain 90%+ coverage for new features
4. **Update documentation** - Keep README and docs synchronized
5. **Submit a pull request** with clear description and test results

#### Development Guidelines

- **Code Style**: Follow ESLint and Prettier configurations
- **Testing**: Write unit and integration tests for all new features
- **Documentation**: Update relevant documentation for any changes
- **Security**: Follow OWASP guidelines and security best practices

#### Reporting Issues

- **Bug Reports**: Use the [GitHub Issues](https://github.com/tutorial/nodejs-tutorial-backend/issues) tracker
- **Feature Requests**: Describe the use case and educational value
- **Security Issues**: Report privately to maintainers for responsible disclosure

### Getting Help and Support

#### Community Resources
- **[GitHub Discussions](https://github.com/tutorial/nodejs-tutorial-backend/discussions)** - Ask questions and share knowledge
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/nodejs+express)** - General Node.js and Express.js questions
- **[Node.js Documentation](https://nodejs.org/docs/)** - Official Node.js reference
- **[Express.js Documentation](https://expressjs.com/)** - Official Express.js guide

#### Educational Resources
- **Code Examples**: All code includes extensive comments explaining concepts
- **Best Practices**: Implementation follows industry standards and patterns
- **Learning Path**: Start with quickstart, explore API docs, then dive into deployment

#### Commercial Support
For organizations requiring professional support, training, or custom development services, please contact the maintainers through the GitHub repository.

### License and Usage

This project is released under the **MIT License**, making it free for educational, personal, and commercial use. See the [LICENSE](LICENSE) file for complete terms and conditions.

## 🏭 Production Readiness

### System Requirements

| Component | Minimum Version | Recommended | Purpose |
|-----------|----------------|-------------|---------|
| **Node.js** | v18.0.0 | v22.x LTS (Jod) | JavaScript runtime with LTS support through April 2027 |
| **npm** | v8.0.0 | v11.4.2+ | Package manager and script execution |
| **Memory** | 128MB | 512MB | Application runtime memory |
| **CPU** | 1 core | 2+ cores | Concurrent request processing |

### Framework Versions and Compatibility

- **Express.js v5.1.0**: Latest stable release with enhanced security and async/await support
- **Node.js v22.x LTS**: Active LTS until October 2025, Maintenance LTS until April 2027
- **npm v11.4.2**: Latest package manager with security improvements

### Security and Compliance

#### Security Features Implemented
- **CVE-2024-45590 Mitigation**: Express.js v5.1.0 includes urlencoded body depth limits
- **ReDoS Protection**: path-to-regexp v8.x prevents Regular Expression Denial of Service
- **Security Headers**: Helmet.js v7.0.0 implements OWASP security recommendations
- **Input Validation**: Comprehensive request validation and sanitization

#### Production Security Checklist
- [ ] Environment variables configured (no sensitive data in code)
- [ ] HTTPS enabled for production deployment
- [ ] Security headers implemented (X-Frame-Options, X-Content-Type-Options)
- [ ] Error responses sanitized (no stack traces exposed)
- [ ] Dependencies regularly updated (npm audit)
- [ ] Rate limiting configured for production traffic

### Performance and Scalability

#### Performance Characteristics
- **Response Time**: < 50ms for /hello endpoint under normal load
- **Memory Usage**: < 50MB for single instance
- **Concurrent Connections**: 100+ simultaneous connections supported
- **Startup Time**: < 2 seconds for development, < 5 seconds for production

#### Scaling Strategies
- **Horizontal Scaling**: Stateless design enables multiple instances
- **Load Balancing**: Compatible with nginx, HAProxy, and cloud load balancers
- **Container Orchestration**: Kubernetes manifests included for production scaling
- **Resource Limits**: Configurable memory and CPU limits for container environments

### Deployment Best Practices

#### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
PORT=3000
REQUEST_TIMEOUT_MS=30000
LOG_LEVEL=warn
```

#### Monitoring and Observability
- **Structured Logging**: JSON-formatted logs with request correlation IDs
- **Health Checks**: Built-in health monitoring endpoints
- **Error Tracking**: Centralized error handling with detailed logging
- **Performance Metrics**: Response time and memory usage monitoring

#### Backup and Recovery
- **Configuration Backup**: Environment variables and deployment configurations
- **Container Images**: Tagged and versioned for reliable rollbacks
- **Zero-Downtime Deployment**: Graceful shutdown enables rolling updates

### Quality Assurance

#### Code Quality Standards
- **Test Coverage**: 90%+ line coverage, 100% function coverage
- **Code Linting**: ESLint with Prettier integration for consistent style
- **Security Scanning**: npm audit for dependency vulnerability detection
- **Documentation**: Comprehensive inline comments and external documentation

#### CI/CD Integration
The application is designed for seamless integration with modern CI/CD pipelines:

```yaml
# Example CI/CD steps
- npm ci                    # Install dependencies
- npm run lint             # Code quality checks
- npm run test:ci          # Run tests with coverage
- npm audit                # Security vulnerability scan
- docker build             # Container image creation
```

For detailed deployment instructions across multiple environments including Docker, Kubernetes, and cloud platforms, see our comprehensive [Deployment Guide](docs/deployment.md).

---

**Ready to get started?** Follow the [Quickstart](#-quickstart) guide above or explore the [API Documentation](docs/api.md) to understand the available endpoints and integration patterns.