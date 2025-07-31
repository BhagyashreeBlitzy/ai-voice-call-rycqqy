# Node.js Tutorial Application - HTTP Server with Express.js

[![Node.js Version](https://img.shields.io/badge/Node.js-v22.x%20LTS-green.svg)](https://nodejs.org/)
[![Express.js Version](https://img.shields.io/badge/Express.js-5.1.0-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Educational](https://img.shields.io/badge/Educational-Purpose-orange.svg)](#educational-objectives)

A comprehensive educational Node.js tutorial application demonstrating HTTP server fundamentals using Express.js 5.1.0 framework with Node.js v22.x LTS. This project provides hands-on learning experience for Node.js web development concepts through a simple `/hello` endpoint that returns "Hello world" response, serving as a foundation for understanding server-side JavaScript development.

## Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [Project Structure](#project-structure)
- [Learning Resources](#learning-resources)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Project Overview

### What You'll Learn

This tutorial application teaches fundamental Node.js concepts through practical implementation:

- **HTTP Server Creation**: Learn to build HTTP servers using Node.js and Express.js
- **Request-Response Cycle**: Understand how web requests are processed and responses generated
- **Express.js Framework**: Master the de facto standard web framework for Node.js
- **Modern JavaScript**: Practice ES6+ features in server-side development
- **Development Workflow**: Experience professional development practices and tools
- **Testing Strategies**: Implement comprehensive testing with Node.js built-in test runner

### Technical Features

- **Single Endpoint**: `/hello` GET endpoint returning "Hello world"
- **Express.js 5.1.0**: Latest stable version with security enhancements
- **Node.js v22.x LTS**: Active LTS support until October 2025
- **Modern Architecture**: Production-ready patterns in educational context
- **Comprehensive Logging**: Structured logging for learning and debugging
- **Error Handling**: Robust error handling and recovery mechanisms

### Educational Objectives

**Beginner Level:**
- Understand Node.js runtime and JavaScript on the server
- Learn HTTP fundamentals and client-server communication
- Explore Express.js framework basics and middleware concepts
- Practice environment configuration and development workflow

**Intermediate Level:**
- Study middleware patterns and request processing pipelines
- Learn testing strategies with Node.js built-in test runner
- Explore application architecture and component design
- Practice debugging and performance optimization techniques

**Advanced Level:**
- Understand production deployment considerations
- Learn security best practices and vulnerability management
- Explore integration patterns and API development
- Study monitoring, logging, and operational concerns

### Prerequisites

- **Node.js**: v18.0.0 or higher (v22.x LTS recommended)
- **npm**: v9.0.0 or higher (bundled with Node.js)
- **Basic JavaScript knowledge**: Understanding of JavaScript fundamentals
- **Command line familiarity**: Ability to use terminal/command prompt
- **Text editor**: Any modern code editor (VS Code recommended)

## Quick Start

Get up and running in under 2 minutes:

### 1. Clone Repository
```bash
git clone https://github.com/tutorial/nodejs-hello-tutorial.git
cd nodejs-hello-tutorial
```

### 2. Navigate to Backend
```bash
cd src/backend
```

### 3. Verify Node.js Version
```bash
node --version
# Expected: v18.0.0+ (v22.x LTS recommended)
npm --version
# Expected: v9.0.0+
```

### 4. Install Dependencies
```bash
npm install
# Installs Express.js 5.1.0 and development dependencies
```

### 5. Setup Environment
```bash
cp .env.example .env
# Creates environment configuration file
```

### 6. Start Development Server
```bash
npm run dev
# Server starts with file watching and auto-restart
```

### 7. Test the Application
```bash
# In another terminal window
curl http://localhost:3000/hello
# Expected response: "Hello world"
```

**🎉 Success!** Your Node.js tutorial server is now running at `http://localhost:3000`

### Verification Commands

```bash
# Validate environment setup
npm run validate

# Run comprehensive test suite
npm test

# Check application health
npm run health

# View server status
curl -v http://localhost:3000/hello
```

## Installation

### System Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Node.js** | v18.0.0 | v22.x LTS | Express.js 5.0 requires Node.js 18+ |
| **npm** | v9.0.0 | v11.4.2 | Bundled with Node.js installation |
| **RAM** | 512MB | 1GB | For dependencies and development |
| **Storage** | 500MB | 1GB | Including dependencies |
| **OS** | Any | Linux/macOS | Windows, Linux, macOS supported |

### Installation Methods

#### Method 1: Official Node.js Installer (Recommended)

**For Windows, macOS, and Linux:**

1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download **Node.js v22.x LTS** installer for your operating system
3. Run the installer and follow the setup wizard
4. Verify installation:
   ```bash
   node --version && npm --version
   ```
5. Expected output: `v22.x.x` and `v11.x.x` (or higher)

#### Method 2: Node Version Manager (NVM)

**For developers managing multiple Node.js versions:**

**Linux/macOS:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source profile
source ~/.bashrc

# Install Node.js 22.x LTS
nvm install 22
nvm use 22

# Verify installation
node --version
```

**Windows (nvm-windows):**
```powershell
# Download and install nvm-windows from:
# https://github.com/coreybutler/nvm-windows/releases

# Install Node.js 22.x
nvm install 22
nvm use 22

# Verify installation
node --version
```

#### Method 3: Package Managers

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS (Homebrew):**
```bash
brew install node@22
```

**Windows (Winget):**
```bash
winget install OpenJS.NodeJS
```

### Project Setup

After Node.js installation:

```bash
# Clone the repository
git clone https://github.com/tutorial/nodejs-hello-tutorial.git
cd nodejs-hello-tutorial/src/backend

# Install project dependencies
npm install

# Verify dependency installation
npm list --depth=0

# Create environment configuration
cp .env.example .env

# Validate setup
npm run validate

# Start development server
npm run dev
```

## Usage Examples

### HTTP Client Examples

#### cURL Commands

```bash
# Basic request
curl http://localhost:3000/hello

# Verbose output with headers
curl -v http://localhost:3000/hello

# With custom headers
curl -H "Accept: text/plain" \
     -H "User-Agent: Tutorial-Client/1.0" \
     http://localhost:3000/hello

# Test invalid methods
curl -X POST http://localhost:3000/hello
# Returns 405 Method Not Allowed
```

#### JavaScript Fetch API

```javascript
// Basic fetch request
fetch('http://localhost:3000/hello')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(data => {
    console.log('Response:', data); // "Hello world"
  })
  .catch(error => {
    console.error('Error:', error);
  });

// Async/await implementation
async function fetchHelloMessage() {
  try {
    const response = await fetch('http://localhost:3000/hello');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const message = await response.text();
    console.log('Hello message:', message);
    return message;
  } catch (error) {
    console.error('Failed to fetch hello message:', error);
    throw error;
  }
}

// Usage
fetchHelloMessage();
```

#### Node.js HTTP Client

```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/hello',
  method: 'GET',
  headers: {
    'Accept': 'text/plain',
    'User-Agent': 'Node.js-Tutorial-Client/1.0'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data); // "Hello world"
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();
```

### Browser Testing

Open your web browser and navigate to:
- **Direct Access**: `http://localhost:3000/hello`
- **Developer Tools**: Use Network tab to inspect request/response
- **Response**: You should see "Hello world" displayed

### Integration Examples

#### React Component

```jsx
import React, { useState, useEffect } from 'react';

function HelloComponent() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/hello')
      .then(response => response.text())
      .then(data => {
        setMessage(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>API Response</h1>
      <p>{message}</p>
    </div>
  );
}

export default HelloComponent;
```

#### Vue.js Component

```vue
<template>
  <div>
    <h1>API Response</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <p v-else>{{ message }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: '',
      loading: true,
      error: null
    };
  },
  async mounted() {
    try {
      const response = await fetch('/hello');
      this.message = await response.text();
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

## Project Structure

### Directory Overview

```
src/backend/
├── 📄 app.js                    # Express application configuration
├── 📄 server.js                 # HTTP server startup and lifecycle
├── 📄 package.json              # Project dependencies and scripts
├── 📄 .env.example              # Environment variables template
│
├── 📁 config/                   # Application configuration
│   ├── index.js                 # Configuration entry point
│   ├── environment.js           # Environment variable management
│   ├── server.js                # Server configuration
│   └── logging.js               # Logging configuration
│
├── 📁 controllers/              # Request handlers and business logic
│   ├── index.js                 # Controller exports
│   └── helloController.js       # Hello endpoint controller
│
├── 📁 routes/                   # Express.js route definitions
│   ├── index.js                 # Route entry point
│   └── hello.js                 # Hello endpoint routing
│
├── 📁 services/                 # Business logic services
│   └── helloService.js          # Hello service implementation
│
├── 📁 middleware/               # Express.js middleware
│   ├── index.js                 # Middleware exports
│   ├── errorHandler.js          # Error handling middleware
│   ├── requestLogger.js         # Request logging middleware
│   ├── responseHandler.js       # Response handling middleware
│   └── notFoundHandler.js       # 404 error handler
│
├── 📁 lib/                      # Core application libraries
│   ├── application.js           # Application core logic
│   ├── server.js                # Server management utilities
│   └── lifecycle.js             # Application lifecycle management
│
├── 📁 utils/                    # Utility functions and helpers
│   ├── constants.js             # Application constants
│   ├── environment.js           # Environment utilities
│   ├── logger.js                # Logging utilities
│   └── validator.js             # Validation functions
│
├── 📁 scripts/                  # Development and deployment scripts
│   ├── dev.js                   # Development server with hot reload
│   ├── test.js                  # Comprehensive test execution
│   ├── start.js                 # Production server startup
│   ├── health-check.js          # Health monitoring script
│   ├── validate-env.js          # Environment validation
│   └── test-coverage.js         # Code coverage analysis
│
├── 📁 test/                     # Test files and configurations
│   ├── setup/                   # Test setup and configuration
│   ├── helpers/                 # Test helper functions
│   └── fixtures/                # Test data and fixtures
│
└── 📁 docs/                     # Project documentation
    ├── 📄 API.md                # API endpoint documentation
    ├── 📄 ARCHITECTURE.md       # System architecture
    ├── 📄 DEVELOPMENT.md        # Development guide
    ├── 📄 TESTING.md            # Testing procedures
    └── 📄 DEPLOYMENT.md         # Deployment instructions
```

### Key Files Description

| File | Purpose | Key Features |
|------|---------|--------------|
| **app.js** | Express application setup | Middleware configuration, route registration |
| **server.js** | HTTP server initialization | Port binding, lifecycle management |
| **package.json** | Project configuration | Scripts, dependencies, metadata |
| **.env.example** | Environment template | Configuration documentation |
| **hello.js** | Hello endpoint route | GET `/hello` endpoint implementation |

### Configuration Files

- **.env.example**: Environment variables template with documentation
- **config/**: Centralized configuration management
- **package.json**: Project metadata, dependencies, and npm scripts

## Learning Resources

### Node.js Fundamentals

#### Core Concepts to Master

1. **Event-Driven Architecture**: Understanding Node.js event loop and non-blocking I/O
2. **Module System**: CommonJS modules and npm package management
3. **HTTP Server Creation**: Building servers with built-in `http` module
4. **Asynchronous Programming**: Promises, async/await, and callback patterns
5. **File System Operations**: Reading/writing files and directory management

#### Official Documentation

- **Node.js Documentation**: [https://nodejs.org/docs/](https://nodejs.org/docs/)
- **Node.js Guides**: [https://nodejs.org/en/guides/](https://nodejs.org/en/guides/)
- **Node.js API Reference**: [https://nodejs.org/api/](https://nodejs.org/api/)
- **Node.js Best Practices**: [https://github.com/goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices)

### Express.js Framework

#### Framework Concepts

1. **Middleware Pipeline**: Request processing chain and middleware order
2. **Routing**: URL pattern matching and route parameters
3. **Request/Response Objects**: HTTP request parsing and response generation
4. **Error Handling**: Centralized error processing and middleware
5. **Template Engines**: View rendering and dynamic content (advanced)

#### Express.js Resources

- **Official Website**: [https://expressjs.com/](https://expressjs.com/)
- **Getting Started**: [https://expressjs.com/en/starter/installing.html](https://expressjs.com/en/starter/installing.html)
- **API Reference**: [https://expressjs.com/en/4x/api.html](https://expressjs.com/en/4x/api.html)
- **Express.js Examples**: [https://github.com/expressjs/express/tree/master/examples](https://github.com/expressjs/express/tree/master/examples)

### HTTP Fundamentals

#### Key HTTP Concepts

1. **HTTP Methods**: GET, POST, PUT, DELETE and their appropriate usage
2. **Status Codes**: Understanding 2xx, 3xx, 4xx, 5xx response codes
3. **Headers**: Request/response headers and their significance
4. **Content Types**: MIME types and content negotiation
5. **RESTful Design**: API design principles and conventions

#### Learning Path Progression

**Week 1-2: Foundation**
- Set up Node.js development environment
- Understand JavaScript basics and ES6+ features
- Learn Node.js runtime and module system
- Create your first HTTP server

**Week 3-4: Express.js Basics**
- Install and configure Express.js
- Create routes and handle requests
- Implement middleware patterns
- Add error handling

**Week 5-6: Testing and Quality**
- Write tests using Node.js built-in test runner
- Implement request logging and monitoring
- Add input validation and security
- Practice debugging techniques

**Week 7-8: Advanced Concepts**
- Study application architecture patterns
- Learn about performance optimization
- Explore deployment strategies
- Understand production considerations

### Additional Resources

#### Testing Resources

- **Node.js Testing**: [https://nodejs.org/api/test.html](https://nodejs.org/api/test.html)
- **Assert Module**: [https://nodejs.org/api/assert.html](https://nodejs.org/api/assert.html)
- **Testing Best Practices**: [https://github.com/goldbergyoni/javascript-testing-best-practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

#### Community Resources

- **Node.js Community**: [https://nodejs.org/en/get-involved/](https://nodejs.org/en/get-involved/)
- **Express.js Community**: [https://expressjs.com/en/resources/community.html](https://expressjs.com/en/resources/community.html)
- **npm Registry**: [https://www.npmjs.com/](https://www.npmjs.com/)

## Development

### Development Environment Setup

#### Required Tools

- **Node.js v22.x LTS**: JavaScript runtime with Active LTS support
- **npm v11.4.2+**: Package manager bundled with Node.js
- **Git**: Version control system for project management
- **VS Code**: Recommended code editor with Node.js extensions

#### Development Workflow

```bash
# Start development server with file watching
npm run dev

# Run tests in watch mode
npm run test:watch

# Validate environment and configuration
npm run validate

# Check application health
npm run health
```

#### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start development server with file watching |
| **start** | `npm start` | Start production server |
| **test** | `npm test` | Run complete test suite |
| **test:unit** | `npm run test:unit` | Run unit tests only |
| **test:integration** | `npm run test:integration` | Run integration tests |
| **test:coverage** | `npm run test:coverage` | Run tests with coverage analysis |
| **validate** | `npm run validate` | Validate environment setup |
| **health** | `npm run health` | Check application health status |

### Development Features

#### File Watching and Hot Reload

The development server automatically restarts when files change:

- **Watched Files**: `**/*.js`, `**/*.json`, `**/*.md`
- **Ignored Files**: `node_modules/`, `logs/`, `coverage/`
- **Restart Time**: Typically < 1 second

#### Request Logging

Development server provides detailed request logging:

```
[2024-12-07T10:30:00.000Z] INFO: GET /hello - 200 OK (15ms)
[2024-12-07T10:30:05.000Z] INFO: POST /hello - 405 Method Not Allowed (3ms)
[2024-12-07T10:30:10.000Z] WARN: GET /invalid - 404 Not Found (1ms)
```

### Testing Strategy

#### Test Types

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test HTTP endpoints and middleware
- **End-to-End Tests**: Test complete request-response cycles

#### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test pattern
npm test -- --filter="hello"

# Run tests in verbose mode
npm test -- --verbose
```

### Code Quality

#### JavaScript Standards

- **ES6+ Features**: Modern JavaScript syntax and patterns
- **Async/await**: Preferred over callbacks for asynchronous operations
- **Error Handling**: Comprehensive try-catch blocks and error middleware
- **Code Documentation**: JSDoc comments for functions and modules

#### Best Practices

1. **Separation of Concerns**: Clear distinction between routes, controllers, and services
2. **Error Handling**: Consistent error handling patterns throughout
3. **Configuration Management**: Environment-based configuration
4. **Logging**: Structured logging for debugging and monitoring
5. **Testing**: Comprehensive test coverage for reliability

## API Documentation

### Base URL

```
http://localhost:3000
```

### Endpoints

#### GET /hello

Returns a simple greeting message demonstrating basic HTTP GET request handling.

**Request:**
```http
GET /hello HTTP/1.1
Host: localhost:3000
Accept: text/plain
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world
```

**Status Codes:**
- `200 OK`: Successful request
- `405 Method Not Allowed`: Non-GET method used
- `500 Internal Server Error`: Server error

### Error Responses

Error responses follow a consistent JSON format:

```json
{
  "error": {
    "status": 404,
    "message": "The requested route was not found on this server",
    "timestamp": "2024-12-07T10:30:00.000Z"
  }
}
```

### Client Examples

See [Usage Examples](#usage-examples) section for detailed client implementation examples.

For complete API documentation, see [src/backend/docs/API.md](src/backend/docs/API.md).

## Troubleshooting

### Common Issues

#### Port Already in Use

**Error**: `Error: listen EADDRINUSE :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -an | findstr :3000  # Windows

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### Dependencies Not Installed

**Error**: `Error: Cannot find module 'express'`

**Solution**:
```bash
# Install dependencies
npm install

# Verify installation
npm list express

# If corrupted, reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Node.js Version Issues

**Error**: `Error: Express 5.0 requires Node.js 18 or higher`

**Solution**:
```bash
# Check current version
node --version

# Upgrade using nvm
nvm install 22
nvm use 22

# Or download from nodejs.org
```

#### Configuration Issues

**Error**: Configuration validation failures

**Solution**:
```bash
# Validate current environment
npm run validate

# Check environment variables
cat .env

# Reset to defaults
cp .env.example .env
```

### Debug Mode

Enable detailed debugging:

```bash
# Debug all tutorial modules
DEBUG=tutorial:* npm run dev

# Debug specific components
DEBUG=tutorial:server npm run dev

# Debug Express.js framework
DEBUG=express:* npm run dev
```

### Health Checks

Verify application health:

```bash
# Basic health check
npm run health

# Manual endpoint test
curl -v http://localhost:3000/hello

# Check server status
curl -i http://localhost:3000/hello
```

### Getting Help

1. **Check Documentation**: Review [src/backend/docs/](src/backend/docs/) directory
2. **Search Issues**: Look through existing GitHub issues
3. **Create Issue**: Report bugs or request features
4. **Community Support**: Ask questions in discussions

## Contributing

We welcome contributions to improve this educational resource!

### Development Setup

```bash
# Fork the repository and clone your fork
git clone https://github.com/your-username/nodejs-hello-tutorial.git
cd nodejs-hello-tutorial/src/backend

# Install dependencies
npm install

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm test
npm run validate

# Commit changes
git commit -m "feat: add your feature description"

# Push and create pull request
git push origin feature/your-feature-name
```

### Contribution Guidelines

#### Code Style

- **JavaScript Standard Style**: 2-space indentation, semicolons
- **Clear Naming**: Descriptive variable and function names
- **Documentation**: JSDoc comments for public functions
- **Error Handling**: Comprehensive error handling patterns

#### Commit Messages

Follow [Conventional Commits](https://conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `test:` Adding or updating tests
- `refactor:` Code improvements

#### Pull Request Process

1. **Create Feature Branch**: Branch from main for new features
2. **Write Tests**: Add tests for new functionality
3. **Update Documentation**: Keep docs current with changes
4. **Test Thoroughly**: Ensure all tests pass
5. **Submit PR**: Provide clear description of changes

### Educational Contributions

This project particularly welcomes:

- **Tutorial Enhancements**: Improved learning explanations
- **Example Code**: Additional usage examples
- **Documentation**: Better educational content
- **Testing Examples**: More comprehensive test cases

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Educational Use

This project is specifically designed for educational purposes and learning Node.js development. You are free to:

- Use this code for learning and educational projects
- Modify and extend the functionality for practice
- Share with students and fellow developers
- Create derivative works for educational purposes

### Attribution

When using this project for educational purposes, please provide appropriate attribution:

```
Node.js Tutorial Application
Original work by [Tutorial Author]
Licensed under MIT License
```

---

## Project Information

- **Version**: 1.0.0
- **Node.js**: v22.x LTS (Active LTS until October 2025)
- **Express.js**: 5.1.0 (Latest stable with security improvements)
- **Last Updated**: December 2024
- **Maintained**: Yes, actively maintained for educational use

### Support

- **Documentation**: Comprehensive guides in `src/backend/docs/`
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and community support
- **Educational Support**: This project is designed to support learning and provides extensive documentation for educational use

**Happy Learning! 🚀**

---

*This README serves as the primary entry point for the Node.js Tutorial Application. For detailed development information, see [src/backend/docs/DEVELOPMENT.md](src/backend/docs/DEVELOPMENT.md). For API details, see [src/backend/docs/API.md](src/backend/docs/API.md).*