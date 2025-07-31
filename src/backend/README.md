# Node.js Tutorial Application - Backend

Learn Node.js HTTP Server Fundamentals with Express.js 5.1.0

![Node.js Version](https://img.shields.io/badge/Node.js-22.x%20LTS-green) ![Express.js Version](https://img.shields.io/badge/Express.js-5.1.0-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

A comprehensive Node.js tutorial application demonstrating HTTP server fundamentals through a simple `/hello` endpoint. Built with Express.js 5.1.0 and Node.js v22.x LTS, this project showcases modern web development practices, professional project structure, and educational best practices for learning Node.js backend development.

## Table of Contents

- [About This Project](#about-this-project)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)
- [Learning Objectives](#learning-objectives)
- [Additional Resources](#additional-resources)
- [Contributing](#contributing)
- [License](#license)

## About This Project

This Node.js tutorial application serves as a comprehensive learning resource for understanding HTTP server fundamentals, Express.js framework usage, and modern Node.js development practices. The project demonstrates the creation of a simple but complete web server with a single `/hello` endpoint that returns "Hello world".

### Educational Goals

- **HTTP Server Fundamentals**: Learn how Node.js handles HTTP requests and responses
- **Express.js Framework**: Understand modern web framework usage and middleware patterns
- **Professional Architecture**: Explore modular project structure and separation of concerns
- **Development Workflow**: Establish modern development practices with testing and automation
- **Best Practices**: Implement security, error handling, and configuration management

### Why This Project?

Node.js® is a free, open-source, cross-platform JavaScript runtime environment that lets developers create servers, web apps, command line tools and scripts. This tutorial focuses on the essential concepts needed to build production-ready web applications while maintaining simplicity for educational purposes.

## Features

### Core Features

- **HTTP Server Fundamentals**: Complete Node.js HTTP server implementation with Express.js 5.1.0
- **Educational Focus**: Tutorial-driven approach with extensive documentation and learning objectives
- **Modern Stack**: Node.js v22.x LTS with latest Express.js security and performance improvements
- **Professional Structure**: Modular architecture with separated concerns and best practices
- **Development Tools**: Hot reload, file watching, and comprehensive testing with Node.js built-in test runner
- **Configuration Management**: Environment-based configuration with validation and documentation

### Technical Highlights

- **Express.js 5.1.0**: Latest stable release with async error handling and ReDoS protection
- **Node.js Built-in Test Runner**: No external test framework dependencies required
- **Comprehensive Middleware Stack**: Logging, error handling, and security headers
- **Environment Configuration**: Flexible configuration with validation and examples
- **Development Workflow**: npm scripts automation for all development tasks
- **Educational Documentation**: Learning objectives and troubleshooting guides included

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### System Requirements

- **Node.js v18+ (v22.x LTS recommended)**: JavaScript runtime environment
- **npm v9+ (bundled with Node.js)**: Package manager for dependency management
- **Git**: Version control system (optional but recommended)
- **Text editor or IDE**: For code development

### Verification Commands

Check your installed versions:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Verify Node.js LTS status
node -p "process.version"
```

### Installation Help

If you need to install or update Node.js:

- **Download**: Visit [nodejs.org](https://nodejs.org/) for official installers
- **Using nvm**: `nvm install 22 && nvm use 22` (recommended for version management)
- **Package managers**: `brew install node` (macOS) or `choco install nodejs` (Windows)

## Quick Start

Get the application running in under 2 minutes:

```bash
# Clone or navigate to the backend directory
cd src/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev

# Test the application
curl http://localhost:3000/hello
```

**Expected output**: `Hello world`

Your server is now running at `http://localhost:3000`

## Installation

### Step 1: Project Setup

Navigate to the backend directory:

```bash
cd src/backend
```

### Step 2: Install Dependencies

Install all required dependencies using npm:

```bash
npm install
```

This will install:
- **express@5.1.0**: Web framework for Node.js
- **supertest@^7.1.1**: HTTP testing library (dev dependency)
- **chokidar@^4.0.1**: File watching utility (dev dependency)

### Step 3: Environment Configuration

Copy the environment template and customize it:

```bash
# Copy the template
cp .env.example .env

# Edit configuration (optional)
nano .env  # or use your preferred editor
```

### Step 4: Validate Installation

Verify everything is set up correctly:

```bash
# Validate environment and dependencies
npm run validate

# Check application health
npm run health
```

### Step 5: Start the Server

Run the application:

```bash
# Start development server with hot reload
npm run dev

# Or start production server
npm start
```

## Configuration

The application uses environment variables for configuration. All settings are documented in the `.env.example` file.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port number (1-65535) |
| `HOST` | `localhost` | Server host address for binding |
| `NODE_ENV` | `development` | Environment mode (development, test, production) |
| `LOG_LEVEL` | `INFO` | Logging level (ERROR, WARN, INFO, DEBUG) |
| `APPLICATION_NAME` | `nodejs-hello-tutorial` | Application identifier |
| `APPLICATION_VERSION` | `1.0.0` | Application version |

### Configuration Examples

**Development Environment**:
```bash
NODE_ENV=development
LOG_LEVEL=DEBUG
HOST=localhost
PORT=3000
DEBUG=tutorial:*
```

**Production Environment**:
```bash
NODE_ENV=production
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=${PORT}  # From environment or process manager
```

**Testing Environment**:
```bash
NODE_ENV=test
LOG_LEVEL=ERROR
HOST=localhost
PORT=0  # Random available port
```

### Configuration Validation

The application includes built-in configuration validation:

```bash
# Validate current configuration
npm run validate

# Check for configuration issues
npm run health
```

## Usage

### API Documentation

#### Base URL
```
http://localhost:3000
```

#### Endpoints

##### GET /hello

Returns a simple greeting message.

**Request**:
```bash
curl http://localhost:3000/hello
```

**Response**:
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

Hello world
```

**Response Details**:
- **Status Code**: 200 OK
- **Content-Type**: text/html; charset=utf-8
- **Body**: `Hello world`

### Testing Examples

**Using curl**:
```bash
curl http://localhost:3000/hello
```

**Using wget**:
```bash
wget -qO- http://localhost:3000/hello
```

**Using browser**:
Navigate to: `http://localhost:3000/hello`

**Using Node.js fetch** (for testing):
```bash
node -e "fetch('http://localhost:3000/hello').then(r=>r.text()).then(console.log)"
```

**Using PowerShell** (Windows):
```powershell
Invoke-RestMethod -Uri http://localhost:3000/hello
```

### Server Information

The server provides additional endpoints for monitoring:

- **Health Check**: Built-in health monitoring capabilities
- **Application Info**: Metadata about the running application
- **Error Handling**: Comprehensive error responses with correlation IDs

## Development

### Development Server

Start the development server with hot reload and file watching:

```bash
npm run dev
```

Features of development server:
- **Hot Reload**: Automatic server restart on file changes
- **Enhanced Logging**: Detailed debug information
- **Error Details**: Complete stack traces and debugging info
- **Performance Monitoring**: Request timing and memory usage

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Make Code Changes**: Edit files in `src/` directory

3. **Test Changes**: Server automatically restarts, test with:
   ```bash
   curl http://localhost:3000/hello
   ```

4. **Run Tests**: Validate your changes:
   ```bash
   npm test
   ```

5. **Check Health**: Verify application status:
   ```bash
   npm run health
   ```

### File Watching

The development server uses `chokidar` for efficient file watching:

- **Automatic Restart**: Server restarts when source files change
- **Ignore Patterns**: Ignores `node_modules`, `.git`, and temporary files
- **Cross-Platform**: Works on Windows, macOS, and Linux

### Environment-Specific Features

**Development Mode**:
- Enhanced error messages with stack traces
- Detailed request logging
- Development security headers
- Hot reload capabilities

**Production Mode**:
- Optimized performance settings
- Security-focused headers
- Minimal logging output
- Memory usage optimization

## Testing

This project uses the **Node.js built-in test runner** (available in Node.js v18+) for comprehensive testing without external dependencies.

### Running Tests

**Complete Test Suite**:
```bash
npm test
```

**Unit Tests Only**:
```bash
npm run test:unit
```

**Integration Tests Only**:
```bash
npm run test:integration
```

**End-to-End Tests**:
```bash
npm run test:e2e
```

**Watch Mode** (runs tests automatically on file changes):
```bash
npm run test:watch
```

**With Code Coverage**:
```bash
npm run test:coverage
```

**All Tests with Coverage**:
```bash
npm run test:all
```

### Test Coverage

The application includes built-in code coverage reporting:

```bash
# Generate coverage report
npm run test:coverage

# View coverage in terminal
node --test --experimental-test-coverage

# Generate LCOV format for CI/CD
node --test --experimental-test-coverage --test-reporter=lcov
```

**Coverage Targets**:
- **Line Coverage**: 90%
- **Function Coverage**: 95%
- **Branch Coverage**: 85%
- **Statement Coverage**: 90%

### Test Structure

```
test/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for API endpoints
├── e2e/           # End-to-end tests for complete workflows
├── fixtures/      # Test data and mock objects
├── helpers/       # Test utilities and helper functions
└── setup/         # Test configuration and setup files
```

### Testing Best Practices

- **Descriptive Names**: Tests use clear, descriptive names
- **Isolation**: Each test runs independently
- **Fast Execution**: Tests complete quickly for rapid feedback
- **Comprehensive Coverage**: All critical paths are tested
- **Educational Value**: Tests demonstrate testing patterns

## Project Structure

```
src/backend/
├── package.json          # Project configuration and dependencies
├── app.js                # Express.js application setup
├── server.js             # HTTP server startup and lifecycle
├── .env.example          # Environment configuration template
├── .env                  # Local environment variables (create from .env.example)
├── .nvmrc                # Node.js version specification
├── README.md             # This documentation file
├── config/               # Application configuration modules
│   ├── index.js          # Unified configuration export
│   ├── environment.js    # Environment variable handling
│   ├── server.js         # Server configuration
│   └── logging.js        # Logging configuration
├── routes/               # Express.js route definitions
│   ├── index.js          # Route registry and exports
│   └── hello.js          # /hello endpoint implementation
├── controllers/          # Route handler business logic
│   ├── index.js          # Controller exports
│   └── helloController.js # Hello endpoint controller
├── middleware/           # Express.js middleware functions
│   ├── index.js          # Middleware exports
│   ├── requestLogger.js  # Request logging middleware
│   ├── responseHandler.js # Response handling middleware
│   ├── notFoundHandler.js # 404 error handling
│   └── errorHandler.js   # Error processing middleware
├── services/             # Business logic services
│   ├── index.js          # Service exports
│   └── helloService.js   # Hello world business logic
├── utils/                # Utility functions and helpers
│   ├── index.js          # Utility exports
│   ├── constants.js      # Application constants
│   ├── environment.js    # Environment utilities
│   ├── logger.js         # Logging utilities
│   └── validator.js      # Validation utilities
├── lib/                  # Core library components
│   ├── index.js          # Library exports
│   ├── application.js    # Application lifecycle
│   ├── server.js         # Server management
│   └── lifecycle.js      # Process lifecycle management
├── scripts/              # Development and deployment scripts
│   ├── start.js          # Production startup script
│   ├── dev.js            # Development server script
│   ├── test.js           # Test execution script
│   ├── test-watch.js     # Watch mode testing
│   ├── test-coverage.js  # Coverage analysis script
│   ├── health-check.js   # Health monitoring script
│   └── validate-env.js   # Environment validation
├── bin/                  # Executable files
│   ├── www               # Standard Node.js server executable
│   └── server            # Custom server executable
└── test/                 # Test suite organization
    ├── unit/             # Unit tests
    ├── integration/      # Integration tests
    ├── e2e/              # End-to-end tests
    ├── fixtures/         # Test data and fixtures
    ├── helpers/          # Test utilities and helpers
    └── setup/            # Test configuration and setup
```

### Component Explanations

- **config/**: Centralized configuration management with environment variable handling
- **routes/**: Express.js route definitions following RESTful patterns
- **controllers/**: Business logic handlers for HTTP requests
- **middleware/**: Express.js middleware for cross-cutting concerns
- **services/**: Core business logic separated from HTTP concerns
- **utils/**: Shared utilities, constants, and helper functions
- **lib/**: Core application infrastructure and lifecycle management
- **scripts/**: Development tools and automation scripts
- **test/**: Comprehensive test suite with unit, integration, and E2E tests

## Scripts Reference

### Development Scripts

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run dev` | Start development server with file watching and hot reload | Primary command for development workflow |
| `npm start` | Start production server with comprehensive error handling | Production deployment and testing |
| `npm run validate` | Validate environment configuration and system requirements | Pre-start validation and troubleshooting |
| `npm run health` | Perform application health check and status validation | Monitoring and operational verification |

### Testing Scripts

| Command | Description | Usage |
|---------|-------------|-------|
| `npm test` | Run complete test suite using Node.js built-in test runner | Comprehensive testing and quality assurance |
| `npm run test:watch` | Run tests in watch mode with automatic re-execution | Development testing with continuous feedback |
| `npm run test:coverage` | Run tests with code coverage analysis | Quality metrics and test completeness analysis |
| `npm run test:unit` | Run unit tests only | Focused testing of individual components |
| `npm run test:integration` | Run integration tests only | API endpoint and component integration testing |

### Utility Scripts

| Command | Description | Purpose |
|---------|-------------|---------|
| `npm run server` | Alternative server startup command | Server management and deployment |
| `npm run clean` | Clean temporary files and caches | Maintenance and troubleshooting |
| `npm run lint` | Code quality and style checking | Code quality assurance |
| `npm run build` | Prepare application for deployment | Build and optimization |

### Script Examples

**Development Workflow**:
```bash
# Start development
npm run dev

# In another terminal, run tests in watch mode
npm run test:watch

# Validate configuration
npm run validate

# Check application health
npm run health
```

**Production Deployment**:
```bash
# Validate environment
npm run validate

# Run complete test suite
npm test

# Start production server
npm start
```

## Troubleshooting

### Common Issues

#### Port 3000 already in use

**Symptoms**:
- `EADDRINUSE` error
- Server fails to start
- Port binding errors

**Solutions**:
1. **Change PORT in .env file**: 
   ```bash
   echo "PORT=3001" >> .env
   ```

2. **Kill process using port**:
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

3. **Use different port**:
   ```bash
   PORT=8080 npm run dev
   ```

**Prevention**: Use `npm run validate` to check port availability before starting.

#### Node.js version incompatibility

**Symptoms**:
- Syntax errors on startup
- Module not found errors
- Express.js compatibility issues

**Solutions**:
1. **Install Node.js v22.x LTS** from [nodejs.org](https://nodejs.org/)

2. **Use nvm for version management**:
   ```bash
   nvm install 22
   nvm use 22
   nvm alias default 22
   ```

3. **Verify version**:
   ```bash
   node --version  # Should show v22.x.x
   ```

**Prevention**: Check `.nvmrc` file and use `nvm use` for version consistency.

#### Environment configuration errors

**Symptoms**:
- Configuration validation failures
- Default values not working
- Missing environment variables

**Solutions**:
1. **Copy template**:
   ```bash
   cp .env.example .env
   ```

2. **Validate configuration**:
   ```bash
   npm run validate
   ```

3. **Check .env file syntax and values**:
   ```bash
   cat .env
   ```

**Prevention**: Use `.env.example` as template and validate before starting.

### Debugging Commands

```bash
# Check Node.js and npm versions
node --version && npm --version

# Validate environment configuration
npm run validate

# Check application health
npm run health

# Run tests for verification
npm test

# Check port availability
lsof -i :3000  # macOS/Linux
netstat -an | findstr :3000  # Windows

# View detailed logs
DEBUG=tutorial:* npm run dev

# Check memory usage
node -e "console.log(process.memoryUsage())"

# Verify Express.js installation
npm list express

# Check for security vulnerabilities
npm audit
```

### Getting Help

1. **Check the logs**: Most issues are logged with helpful error messages
2. **Run validation**: Use `npm run validate` to check configuration
3. **Check versions**: Ensure Node.js v18+ and compatible npm version
4. **Review documentation**: Check this README and inline code comments
5. **Test minimal setup**: Try running with default configuration

### Performance Issues

If experiencing performance issues:

```bash
# Check Node.js performance
node --prof app.js  # Run with profiling

# Monitor memory usage
npm run dev -- --inspect  # Enable inspector

# Check for memory leaks
node --trace-gc app.js
```

## Learning Objectives

### Primary Objectives

- **HTTP Server Fundamentals**: Understanding Node.js HTTP server creation, configuration, and lifecycle management
- **Express.js Framework**: Learning modern web framework usage, middleware patterns, and routing implementation
- **Environment Configuration**: Managing application configuration through environment variables and validation
- **Development Workflow**: Establishing professional development practices with testing, debugging, and automation
- **Project Architecture**: Implementing modular project structure with separation of concerns
- **Error Handling**: Applying comprehensive error handling patterns and graceful shutdown procedures

### Technical Skills Developed

Upon completion of this tutorial, you will understand:

1. **Creating HTTP servers** with Node.js and Express.js
2. **Implementing RESTful API endpoints** and routing patterns
3. **Managing application configuration** and environment variables
4. **Writing and executing tests** with Node.js built-in test runner
5. **Using npm scripts** for development workflow automation
6. **Implementing middleware patterns** for cross-cutting concerns
7. **Applying professional project structure** and architectural patterns
8. **Debugging Node.js applications** and handling production deployment

### Learning Progression Path

1. **Basic Setup**: Project initialization and environment configuration
2. **HTTP Fundamentals**: Understanding request-response cycles and server lifecycle
3. **Express.js Integration**: Framework setup, routing, and middleware implementation
4. **Testing and Quality**: Test-driven development and code coverage analysis
5. **Professional Practices**: Project structure, documentation, and deployment preparation
6. **Advanced Concepts**: Error handling, logging, monitoring, and production considerations

### Conceptual Understanding

This tutorial demonstrates:

- **Server-side JavaScript execution** with Node.js runtime
- **HTTP protocol implementation** for web communication
- **Middleware pattern application** for request processing
- **Modular architecture design** for maintainable applications
- **Configuration management** for multiple environments
- **Testing strategies** for reliable application development

### Next Steps

After completing this tutorial, consider exploring:

- **Database integration** with MongoDB, PostgreSQL, or MySQL
- **Authentication and authorization** with JWT or OAuth2
- **API documentation** with OpenAPI/Swagger
- **Production deployment** with Docker and cloud platforms
- **Advanced middleware** for security, caching, and rate limiting
- **Microservices architecture** and distributed systems
- **Real-time features** with WebSockets or Server-Sent Events

## Additional Resources

### Official Documentation

- **Node.js Documentation**: [nodejs.org/docs](https://nodejs.org/docs)
- **Express.js Guide**: [expressjs.com](https://expressjs.com/)
- **npm Documentation**: [docs.npmjs.com](https://docs.npmjs.com/)
- **Node.js Test Runner**: [Node.js Testing](https://nodejs.org/api/test.html)

### Learning Resources

- **Node.js Best Practices**: [GitHub - Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- **Express.js Tutorial**: [Express.js Tutorial](https://expressjs.com/en/starter/installing.html)
- **JavaScript Modules**: [MDN - JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- **HTTP Protocol**: [MDN - HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview)

### Advanced Topics

- **Node.js Security**: [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- **Performance Optimization**: [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- **Deployment Guides**: [Production Deployment](https://expressjs.com/en/advanced/best-practice-performance.html)
- **Testing Strategies**: [Node.js Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Community Resources

- **Node.js Community**: [nodejs.org/community](https://nodejs.org/community/)
- **Express.js Community**: [expressjs.com/community](https://expressjs.com/en/resources/community.html)
- **Stack Overflow**: Search for Node.js and Express.js questions
- **GitHub Discussions**: Join discussions on Node.js and Express.js repositories

### Tools and Extensions

- **Development Tools**: 
  - Visual Studio Code with Node.js extensions
  - Postman for API testing
  - Chrome DevTools for debugging
- **Process Managers**: PM2 for production deployment
- **Monitoring Tools**: New Relic, DataDog for production monitoring
- **Documentation Tools**: JSDoc for code documentation

## Contributing

We welcome contributions to improve this tutorial application! Here's how you can help:

### Ways to Contribute

- **Bug Reports**: Report issues or errors you encounter
- **Feature Suggestions**: Propose improvements or new educational features
- **Documentation**: Improve or expand the documentation
- **Code Improvements**: Enhance code quality, performance, or structure
- **Educational Content**: Add learning resources or explanations

### Contribution Guidelines

1. **Fork the Repository**: Create your own fork for development
2. **Create Feature Branch**: Use descriptive branch names
   ```bash
   git checkout -b feature/improve-error-handling
   ```
3. **Make Changes**: Implement your improvements
4. **Add Tests**: Ensure new code is tested
5. **Update Documentation**: Update README if needed
6. **Test Thoroughly**: Run all tests and validation
   ```bash
   npm test
   npm run validate
   ```
7. **Submit Pull Request**: Provide clear description of changes

### Development Standards

- **Code Style**: Follow existing code patterns and conventions
- **Testing**: Maintain or improve test coverage
- **Documentation**: Update documentation for any changes
- **Educational Value**: Ensure changes support learning objectives
- **Compatibility**: Maintain Node.js v18+ compatibility

### Educational Focus

When contributing, please consider:

- **Learning Objectives**: How does this change support education?
- **Complexity**: Keep complexity appropriate for tutorial level
- **Documentation**: Explain concepts for learning purposes
- **Examples**: Provide clear examples and use cases

## License

This project is licensed under the MIT License - see the details below:

```
MIT License

Copyright (c) 2024 Node.js Tutorial Application

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### License Benefits

- **Educational Use**: Free for learning and educational purposes
- **Commercial Use**: Free for commercial applications and derivatives
- **Modification**: Freely modify and adapt for your needs
- **Distribution**: Share and redistribute with attribution
- **Private Use**: Use privately without restrictions

### Attribution

While not required by the MIT license, attribution is appreciated:

```
Based on Node.js Tutorial Application
https://github.com/tutorial/nodejs-hello-tutorial
```

---

**Happy Learning!** 🚀

Start your Node.js journey with `npm run dev` and explore the world of server-side JavaScript development.

For questions, issues, or suggestions, please visit our repository or create an issue.

**Tutorial Application Version**: 1.0.0  
**Node.js Version**: v22.x LTS  
**Express.js Version**: 5.1.0  
**Last Updated**: 2024