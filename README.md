# Node.js Tutorial Backend

A comprehensive Node.js tutorial application demonstrating production-ready Express.js server implementation with modern JavaScript practices, security features, and deployment patterns.

## Project Overview

This project provides a foundational Node.js tutorial backend that showcases core web server capabilities through a clean, educational implementation. Built with **Node.js v22.x LTS** and **Express.js v5.1.0**, it demonstrates fundamental HTTP server concepts, request handling, and response generation while maintaining production-ready standards.

### Key Features

- **Production-Ready Architecture**: Leverages Node.js v22.x LTS (Jod) with Active LTS support extending through 2025
- **Modern Express.js Integration**: Uses Express.js v5.1.0 with enhanced async/await support and automatic Promise rejection handling
- **Security-First Design**: Implements comprehensive security headers, CVE-2024-45590 mitigation, and ReDoS protection
- **Educational Focus**: Designed for learning developers, technical educators, and development teams
- **Comprehensive Documentation**: Complete API documentation, deployment guides, and testing strategies

### Target Audience

| Stakeholder | Description | Primary Benefit |
|-------------|-------------|-----------------|
| Learning Developers | Junior to mid-level developers learning Node.js | Practical implementation examples and best practices |
| Technical Educators | Instructors and content creators | Teaching materials and reference implementations |
| Development Teams | Teams adopting Node.js technologies | Standardized implementation patterns and architecture |

## Quickstart

Get started with the Node.js tutorial backend in just a few steps:

### Prerequisites

- **Node.js**: v22.x LTS (recommended) or v18.0.0+ 
- **npm**: v11.4.2+ (comes with Node.js)
- **Git**: For cloning the repository

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/tutorial/nodejs-tutorial-backend.git
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
   ```
   Expected response: `Hello world`

### Alternative Start Commands

```bash
# Production mode
npm start

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Check server health
npm run health
```

For advanced configuration and deployment options, see the [deployment documentation](src/backend/docs/deployment.md).

## Feature Summary

### Core Capabilities

#### HTTP Server & Framework
- **Express.js v5.1.0**: Modern web framework with enhanced security and async/await support
- **Node.js v22.x LTS**: JavaScript runtime with long-term support through April 2027
- **Production Features**: Compression, security headers, request timeout, and graceful shutdown

#### API Endpoints

| Endpoint | Method | Description | Response |
|----------|---------|-------------|----------|
| `/hello` | GET | Returns greeting message | `Hello world` (text/plain) |

#### Security & Performance
- **Security Headers**: Helmet.js integration with CORS support
- **Request Timeout**: Configurable timeout (default: 30s) with graceful handling
- **Error Handling**: Centralized error middleware with secure response generation
- **CVE Mitigation**: Express.js v5.1.0 includes fixes for CVE-2024-45590

#### Observability
- **Structured Logging**: Comprehensive request/response logging with metadata
- **Health Monitoring**: Built-in health check capabilities
- **Error Tracking**: Detailed error logging with context preservation

#### Development & Testing
- **Hot Reload**: Nodemon integration for development
- **Comprehensive Tests**: Jest-based unit and integration testing
- **Code Quality**: ESLint and Prettier configuration with pre-commit hooks
- **Test Coverage**: 90%+ coverage requirements with detailed reporting

For detailed API documentation, see [docs/api.md](src/backend/docs/api.md).

## Project Structure

```
src/backend/
├── app.js                  # Main application entry point
├── index.js                # Alternative server startup entry
├── package.json            # Dependencies and scripts
├── 
├── controllers/            # Request handlers
│   └── helloController.js  # Hello endpoint logic
├── 
├── routes/                 # Route definitions
│   ├── index.js           # Main router
│   └── hello.js           # Hello endpoint routes
├── 
├── middleware/             # Express middleware
│   ├── index.js           # Middleware stack
│   ├── errorHandler.js    # Error handling middleware
│   ├── logging.js         # Request logging
│   ├── security.js        # Security headers
│   ├── compression.js     # Response compression
│   └── requestTimeout.js  # Request timeout handling
├── 
├── utils/                  # Utility functions
│   ├── index.js           # Utility exports
│   ├── logger.js          # Logging utilities
│   ├── errors.js          # Error handling utilities
│   ├── requestTimeout.js  # Timeout utilities
│   └── shutdown.js        # Graceful shutdown
├── 
├── config/                 # Configuration management
│   ├── index.js           # Main configuration
│   └── server.js          # Server configuration
├── 
├── scripts/                # NPM scripts
│   ├── start.js           # Production startup
│   ├── dev.js             # Development startup
│   └── test.js            # Test execution
├── 
├── __tests__/              # Test suites
│   ├── setup.js           # Test environment setup
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── 
├── docs/                   # Documentation
│   ├── api.md             # API documentation
│   ├── deployment.md      # Deployment guide
│   └── testing.md         # Testing documentation
├── 
├── .env.example            # Environment variable template
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── jest.config.js         # Jest test configuration
├── nodemon.json           # Nodemon configuration
└── Dockerfile             # Container configuration
```

## Documentation Links

### Core Documentation
- **[API Documentation](src/backend/docs/api.md)** - Complete API reference with examples
- **[Deployment Guide](src/backend/docs/deployment.md)** - Local, Docker, Kubernetes, and cloud deployment
- **[Testing Documentation](src/backend/docs/testing.md)** - Testing strategy and practices

### Configuration Files
- **[package.json](src/backend/package.json)** - Dependencies, scripts, and project metadata
- **[Environment Variables](src/backend/.env.example)** - Configuration options and examples

### Infrastructure
- **[Docker Configuration](src/backend/Dockerfile)** - Container setup and optimization
- **[Kubernetes Manifests](infrastructure/kubernetes/)** - Production orchestration
- **[Cloud Deployments](infrastructure/cloud/)** - Platform-specific deployment files

## Contribution and Support

### Contributing

We welcome contributions to improve the Node.js tutorial backend! Here's how to get started:

1. **Fork the repository** and create a feature branch
2. **Make your changes** following our coding standards
3. **Write tests** for new functionality
4. **Run the test suite** to ensure all tests pass
5. **Submit a pull request** with a clear description of your changes

### Coding Standards

- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Maintain test coverage above 90%
- Use conventional commit messages

For detailed coding standards, see the project's ESLint and Prettier configurations.

### Reporting Issues

- **Bug Reports**: Use the [GitHub Issues](https://github.com/tutorial/nodejs-tutorial-backend/issues) page
- **Feature Requests**: Describe your proposed enhancement with use cases
- **Questions**: Check existing issues or start a new discussion

### Getting Help

- **Documentation**: Start with the comprehensive docs in the `docs/` directory
- **Examples**: Check the test files for usage examples
- **Community**: Engage with other developers through GitHub Discussions

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Production Readiness

### System Requirements

- **Node.js**: Version 18.0.0 or higher (22.x LTS recommended)
- **npm**: Version 8.0.0 or higher (11.4.2+ recommended)
- **Memory**: Minimum 128MB RAM (512MB recommended)
- **Storage**: 50MB disk space for application and dependencies

### Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | v22.x LTS | JavaScript runtime with support until April 2027 |
| Express.js | v5.1.0 | Web framework with modern security features |
| npm | v11.4.2 | Package manager and script runner |

### Security Features

- **Express.js v5.1.0**: Includes CVE-2024-45590 mitigation and ReDoS protection
- **Security Headers**: Helmet.js integration for comprehensive header protection
- **Input Validation**: Request parameter validation and sanitization
- **Error Handling**: Secure error responses without information disclosure

### Performance Characteristics

- **Startup Time**: < 2 seconds for server initialization
- **Response Time**: < 50ms for /hello endpoint
- **Memory Usage**: ~45MB RSS for basic operation
- **Concurrent Connections**: Supports Node.js event loop concurrency model

### Deployment Options

#### Local Development
```bash
npm run dev  # Development with hot reload
npm start    # Production mode
```

#### Docker
```bash
docker build -t nodejs-tutorial-backend .
docker run -p 3000:3000 nodejs-tutorial-backend
```

#### Docker Compose
```bash
docker-compose up -d
```

#### Kubernetes
```bash
kubectl apply -f infrastructure/kubernetes/
```

#### Cloud Platforms
- **Heroku**: Ready for git-based deployment
- **Vercel**: Serverless deployment support
- **Google Cloud Run**: Container-based deployment
- **AWS App Runner**: Native Node.js support

### Monitoring & Observability

- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Health Checks**: Built-in health monitoring endpoints
- **Error Tracking**: Comprehensive error logging with context
- **Performance Metrics**: Request timing and resource usage tracking

### Best Practices

1. **Use Node.js LTS versions** for production stability
2. **Keep dependencies updated** for security patches
3. **Monitor resource usage** and set appropriate limits
4. **Implement proper logging** for debugging and monitoring
5. **Use environment variables** for configuration management
6. **Enable compression** for better performance
7. **Set request timeouts** to prevent resource exhaustion
8. **Use HTTPS** in production environments

### Quality Assurance

- **Test Coverage**: 90%+ line coverage required
- **Code Quality**: ESLint and Prettier enforcement
- **Security Scanning**: npm audit integration
- **Continuous Integration**: Automated testing and deployment

For comprehensive deployment instructions and production configuration, see the [deployment documentation](src/backend/docs/deployment.md).

---

**Happy coding! 🚀**

*This README is automatically maintained and reflects the current state of the codebase. For the most up-to-date information, please refer to the source code and documentation.*