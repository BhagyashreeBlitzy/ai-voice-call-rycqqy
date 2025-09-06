# Node.js Hello World Tutorial

> Educational Express.js 5.1.0 application demonstrating fundamental HTTP server concepts

[![Node.js Version](https://img.shields.io/badge/node.js-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![Express.js Version](https://img.shields.io/badge/express-5.1.0-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/nodejs-tutorial/hello-world)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](https://github.com/nodejs-tutorial/hello-world)

A simple Node.js tutorial application that demonstrates fundamental HTTP server concepts using Express.js 5.1.0 framework with a single '/hello' endpoint returning 'Hello world' response. Designed for educational purposes to teach Node.js and Express.js basics while maintaining production-ready patterns.

## 📚 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Docker Deployment](#-docker-deployment)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## ✨ Features

### Core Features
- **Single `/hello` HTTP endpoint** demonstrating Express.js routing patterns
- **Express.js 5.1.0** with enhanced async/await support and automatic promise error handling
- **Node.js 22.x LTS compatibility** with latest performance improvements and security features
- **Comprehensive testing suite** using Jest v29.7.0 and Supertest for HTTP endpoint testing
- **Docker containerization** with multi-stage builds, security hardening, and production optimization
- **Production-ready patterns** including logging, error handling, security middleware, and monitoring
- **Educational code structure** with extensive documentation and inline comments for learning

### Technical Highlights
- **Event-driven architecture** leveraging Node.js non-blocking I/O for optimal performance
- **Middleware composition** for security headers, request validation, logging, and error handling
- **Health check endpoints** (`/health`, `/livez`, `/readyz`) for container orchestration and monitoring
- **Environment-based configuration** management with development and production optimizations
- **Code quality integration** with ESLint Standard configuration and Prettier formatting
- **CI/CD pipeline support** with automated testing, linting, and deployment workflows

## 📋 Prerequisites

### System Requirements
- **Node.js v22.0.0 or higher** (LTS recommended) - [Download Node.js](https://nodejs.org/)
- **npm v10.0.0 or higher** (included with Node.js)
- **Git** for source code management - [Install Git](https://git-scm.com/)
- **Docker** (optional, for containerized deployment) - [Get Docker](https://docs.docker.com/get-docker/)

### Development Tools
- **Code editor** with JavaScript support (Visual Studio Code recommended)
- **Terminal or command-line interface** for running commands
- **HTTP client** (curl, Postman, or web browser) for endpoint testing

## 🚀 Quick Start

Get the application running in under 2 minutes:

```bash
# Clone the repository
git clone https://github.com/nodejs-tutorial/hello-world.git

# Navigate to the project directory
cd hello-world/src/backend

# Install dependencies
npm install

# Start the application
npm start
```

### Verification Steps
1. **Open browser** to [http://localhost:3000/hello](http://localhost:3000/hello)
2. **Verify response** shows "Hello world"
3. **Check health endpoint** at [http://localhost:3000/health](http://localhost:3000/health)

## 📦 Installation

### Detailed Setup

#### 1. Repository Cloning
```bash
# Clone the repository with full history
git clone https://github.com/nodejs-tutorial/hello-world.git

# Navigate to the backend source directory
cd hello-world/src/backend

# Verify Node.js installation and version
node --version  # Should show v22.x.x or higher
npm --version   # Should show v10.x.x or higher
```

#### 2. Dependency Installation
```bash
# Install production and development dependencies
npm install

# Verify installation success
npm list --depth=0

# Optional: Install dependencies for production only
npm ci --only=production
```

#### 3. Environment Configuration
```bash
# Copy environment template (if available)
cp .env.example .env

# Edit environment variables (optional)
# Default values work for local development
```

#### 4. Installation Verification
```bash
# Run health check
npm run health

# Test installation with development server
npm run dev

# Verify endpoints are accessible
curl http://localhost:3000/hello
curl http://localhost:3000/health
```

### Alternative Installation Methods

#### Using Docker
```bash
# Build and run with Docker
docker build -t tutorial:latest .
docker run -p 3000:3000 tutorial:latest
```

#### Development with Live Reload
```bash
# Install with development dependencies
npm install

# Start with nodemon for auto-restart
npm run dev
```

## 🎯 Usage

### Basic Usage

#### Starting the Server
```bash
# Production mode
npm start

# Development mode with auto-restart
npm run dev

# The server will start on port 3000 by default
# Output: Server listening on port 3000
```

#### Accessing Endpoints
```bash
# Hello endpoint - returns "Hello world"
curl http://localhost:3000/hello

# Health check endpoint - returns JSON status
curl http://localhost:3000/health

# Browser access
# Open http://localhost:3000/hello in your web browser
```

#### Server Shutdown
- **Graceful shutdown**: Press `Ctrl+C` in the terminal
- **Force shutdown**: Press `Ctrl+C` twice for immediate termination
- **Docker**: `docker stop <container-id>`

### Development Usage

#### Available Scripts
```bash
# Start development server with auto-restart
npm run dev

# Run complete test suite with coverage
npm test

# Run tests in watch mode for continuous testing
npm run test:watch

# Generate code coverage report
npm run test:coverage

# Lint code for quality and consistency
npm run lint

# Fix automatically fixable linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port configuration |
| `HOST` | localhost | Server host binding |
| `NODE_ENV` | development | Environment setting (development, production, test) |

#### Setting Environment Variables
```bash
# Linux/macOS
export PORT=8080
export NODE_ENV=production

# Windows CMD
set PORT=8080
set NODE_ENV=production

# Windows PowerShell
$env:PORT = "8080"
$env:NODE_ENV = "production"
```

## 📖 API Documentation

### Hello Endpoint

#### `GET /hello`
Returns a simple "Hello world" message demonstrating basic HTTP endpoint implementation.

**Request:**
```bash
curl -X GET http://localhost:3000/hello
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11

Hello world
```

**Response Details:**
- **Status Code**: `200 OK`
- **Content-Type**: `text/plain`
- **Body**: `Hello world`

**Error Responses:**
- **404 Not Found**: Route does not exist
- **405 Method Not Allowed**: Non-GET requests to `/hello`
- **500 Internal Server Error**: Server configuration issues

### Health Endpoint

#### `GET /health`
Health check endpoint for monitoring and container orchestration.

**Request:**
```bash
curl -X GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "00:05:30",
  "version": "1.0.0"
}
```

**Usage:**
- **Container Health Checks**: Used by Docker health checks
- **Load Balancers**: Health verification for traffic routing  
- **Monitoring Systems**: Automated health monitoring
- **Kubernetes**: Liveness and readiness probes

## 🧪 Testing

### Test Framework
- **Jest v29.7.0**: Primary testing framework with built-in coverage and ES6+ support
- **Supertest**: HTTP endpoint testing for integration tests
- **Coverage Threshold**: 95% minimum code coverage requirement

### Running Tests

#### Basic Test Commands
```bash
# Run complete test suite
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode for development
npm run test:watch

# Run tests for CI/CD pipeline
npm run test:ci
```

#### Test Structure
```
test/
├── unit/          # Unit tests for individual functions
├── integration/   # Integration tests for HTTP endpoints
├── fixtures/      # Test data and mock objects
└── utils/         # Test utilities and helpers
```

### Test Examples

#### Unit Test Example
```javascript
// Test for hello endpoint controller
describe('Hello Controller', () => {
  test('should return hello world message', () => {
    const message = getHelloMessage();
    expect(message).toBe('Hello world');
  });
});
```

#### Integration Test Example
```javascript
// Test for HTTP endpoint
describe('GET /hello', () => {
  test('should respond with hello world', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200)
      .expect('Hello world');
  });
});
```

### Coverage Requirements
- **Lines**: 95% minimum coverage
- **Branches**: 90% minimum coverage  
- **Functions**: 100% coverage required
- **Statements**: 95% minimum coverage

## 🐳 Docker Deployment

### Dockerfile Features
- **Multi-stage builds** for optimized production images with minimal dependencies
- **Security hardening** with non-root user execution and Alpine Linux base
- **Health checks** using built-in `/health` endpoint for container orchestration
- **Build optimization** with strategic layer caching and dependency management

### Docker Commands

#### Development Build
```bash
# Build development image with all tools
docker build --target=build -t tutorial:dev .

# Run development container with volume mounting
docker run -p 3000:3000 -v $(pwd):/usr/src/app tutorial:dev
```

#### Production Build
```bash
# Build optimized production image
docker build --target=production -t tutorial:latest .

# Run production container
docker run -d -p 3000:3000 --name tutorial-app tutorial:latest

# View container logs
docker logs tutorial-app

# Check container health
docker inspect --format='{{.State.Health.Status}}' tutorial-app
```

### Docker Compose

#### Development Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  tutorial:
    build:
      context: .
      target: build
    ports:
      - "3000:3000"
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    environment:
      - NODE_ENV=development
```

#### Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  tutorial:
    build:
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

## 🛠 Development

### Project Structure
```
nodejs-hello-tutorial/
├── src/
│   └── backend/
│       ├── src/
│       │   ├── app.js              # Main Express application
│       │   ├── routes/             # Route handlers
│       │   │   ├── index.js        # Main router
│       │   │   ├── hello.js        # Hello endpoint routes  
│       │   │   └── health.js       # Health check routes
│       │   ├── controllers/        # Route controllers
│       │   ├── services/           # Business logic
│       │   ├── middleware/         # Custom middleware
│       │   └── utils/              # Utility functions
│       ├── test/                   # Test files
│       ├── config/                 # Configuration files
│       ├── bin/                    # Executable scripts
│       ├── package.json            # Dependencies and scripts
│       └── Dockerfile              # Container configuration
├── LICENSE                         # MIT License
└── README.md                       # This file
```

### Development Workflow

#### Code Quality Standards
- **ESLint** with Standard configuration for consistent code style
- **Prettier** for automatic code formatting
- **Git hooks** with pre-commit linting and testing
- **Conventional commits** for clear commit message standards

#### Development Commands
```bash
# Start development server with hot reload
npm run dev

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changes
npm run format:check

# Run tests continuously during development
npm run test:watch
```

### Debugging

#### Development Debugging
- **Enhanced error messages** and stack traces in development mode
- **Structured logging** with different levels for development and production
- **Request correlation IDs** for tracing requests through the system

#### VS Code Debugging
```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Launch Tutorial App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/backend/bin/www",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

#### Node.js Debugging
```bash
# Start with Node.js debugger
node --inspect src/server.js

# Start with debugger break on first line
node --inspect-brk src/server.js
```

## 🤝 Contributing

### Contribution Guidelines

#### Reporting Issues
- **Bug reports**: Use GitHub Issues with detailed reproduction steps
- **Feature requests**: Describe the use case and expected behavior
- **Questions**: Use GitHub Discussions for community support

#### Pull Request Process
1. **Fork** the repository to your GitHub account
2. **Create** a feature branch from `main`
3. **Make** changes following coding standards
4. **Add** tests for new functionality
5. **Run** tests and ensure all checks pass
6. **Submit** pull request with clear description

#### Development Setup for Contributors
```bash
# Fork and clone your fork
git clone https://github.com/yourusername/hello-world.git
cd hello-world

# Add upstream remote
git remote add upstream https://github.com/nodejs-tutorial/hello-world.git

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

### Code Standards
- **Testing**: All changes must include appropriate tests
- **Coverage**: Maintain 95%+ code coverage
- **Documentation**: Update documentation for user-facing changes
- **Commits**: Use conventional commit format
- **Code Style**: Follow ESLint and Prettier configurations

### Branch Naming Conventions
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Usage Rights
- ✅ **Commercial use** - Use in commercial projects
- ✅ **Modification** - Modify and distribute
- ✅ **Distribution** - Share with others
- ✅ **Private use** - Use in private projects

### Requirements
- **Copyright notice** must be retained in distributed copies
- **License notice** must be included with the software

### MIT License Summary
```
Copyright (c) 2024 Node.js Tutorial Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 💬 Support

### Documentation and Resources
- **[Node.js Official Documentation](https://nodejs.org/docs/)** - Complete Node.js reference
- **[Express.js 5.x Guide](https://expressjs.com/en/guide/)** - Express.js framework documentation
- **[Docker Documentation](https://docs.docker.com/)** - Container deployment guides
- **[Jest Testing Framework](https://jestjs.io/docs/getting-started)** - Testing framework documentation

### Community Support
- **[GitHub Issues](https://github.com/nodejs-tutorial/hello-world/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/nodejs-tutorial/hello-world/discussions)** - Questions and community support
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/node.js+express)** - Technical questions with `node.js` and `express` tags

### Educational Resources
- **Tutorial Progression**: This project serves as an introduction to Node.js development
- **Next Steps**: Consider exploring database integration, authentication, and advanced middleware
- **Best Practices**: Study the codebase for production-ready patterns and security considerations

### Getting Help
1. **Check existing issues** in the GitHub repository
2. **Search documentation** for common questions
3. **Create detailed issue** with reproduction steps if needed
4. **Join discussions** for broader questions and learning

---

**Happy coding! 🎉**

*This tutorial demonstrates fundamental Node.js and Express.js concepts while maintaining production-ready code quality. Use it as a foundation for learning web development with Node.js.*