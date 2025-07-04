# Node.js Tutorial Backend

A comprehensive educational Node.js backend application demonstrating modern server-side JavaScript development using Express 5.1.0, robust error handling, and production-ready best practices.

## Overview

This tutorial application serves as a practical learning resource for developers getting started with Node.js and Express.js. It implements a single `/hello` endpoint that returns "Hello world", showcasing fundamental concepts of HTTP server creation, middleware implementation, error handling, and security best practices.

**Key Features:**
- **Express 5.1.0 Integration**: Latest stable version with enhanced security features and automatic promise rejection handling
- **Modern Node.js Patterns**: Built for Node.js 18+ with contemporary JavaScript patterns and async/await support
- **Production-Ready Architecture**: Comprehensive error handling, logging, and security implementations
- **Educational Focus**: Extensive documentation and clear code structure for learning clarity
- **Security-First Design**: ReDoS attack prevention, secure error handling, and comprehensive threat model implementation

**Educational Objectives:**
- Understanding Node.js runtime environment and event-driven architecture
- Express.js framework fundamentals and middleware pipeline patterns
- HTTP request/response cycle mechanics and RESTful API design
- Error handling and logging best practices for production applications
- Security considerations in modern web application development

## Quick Start

### Prerequisites

- **Node.js**: Version 18.0.0 or higher (Node.js 22.x LTS recommended)
- **npm**: Version 11.4.2 or higher (comes bundled with Node.js)

Verify your installation:
```bash
node --version  # Should be 18.0.0+
npm --version   # Should be 11.4.2+
```

### Installation

1. **Clone the repository** (if using version control):
```bash
git clone <repository-url>
cd <project-name>/src/backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the server**:
```bash
# Production mode
npm start

# Development mode with auto-restart
npm run dev
```

### Test the Application

Once the server is running, test the endpoint:

**Using curl:**
```bash
curl http://localhost:3000/hello
# Expected response: Hello world
```

**Using a web browser:**
Navigate to `http://localhost:3000/hello` - you should see "Hello world"

The server runs on **port 3000** by default. You can customize the port by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

## API Summary

### Available Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/hello` | Returns a simple greeting message | `Hello world` |

### Example Request/Response

```bash
# Request
curl -i http://localhost:3000/hello

# Response
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world
```

### Error Handling

The application includes comprehensive error handling:

- **404 Not Found**: For undefined routes
- **500 Internal Server Error**: For unexpected server errors
- **Express 5.1.0 Features**: Automatic promise rejection handling

For detailed API documentation, see [docs/api.md](docs/api.md).

## Architecture Overview

### System Architecture

The application follows a **monolithic, stateless, event-driven architecture** built on Node.js's single-threaded event loop:

```
HTTP Client → Node.js HTTP Server → Express Application → Middleware Pipeline → Route Handler → Response
```

### Key Components

- **Node.js Runtime**: JavaScript execution environment with V8 engine and libuv
- **Express Application**: Web framework with middleware pipeline and routing
- **Request Logger**: Structured logging for all HTTP requests and responses
- **Route Handler**: Business logic for the `/hello` endpoint
- **Error Handler**: Global error handling with Express 5's automatic promise forwarding
- **Security Middleware**: HTTP security headers and ReDoS protection

### Technology Stack

- **Runtime**: Node.js 22.x LTS
- **Framework**: Express 5.1.0
- **Security**: path-to-regexp 8.x for ReDoS protection
- **Development**: nodemon for auto-restart during development
- **Testing**: Jest and SuperTest for comprehensive testing

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## Setup and Configuration

### Environment Variables

The application supports environment-based configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `NODE_ENV` | development | Application environment (development/production) |

### Configuration Files

- **package.json**: Project dependencies and scripts
- **server.js**: Server startup and process management
- **app.js**: Express application configuration and middleware
- **config/index.js**: Environment-based configuration management

For complete setup instructions, see [docs/setup.md](docs/setup.md).

## Testing and Quality Assurance

### Test Framework

The application uses **Jest** and **SuperTest** for comprehensive testing:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end HTTP endpoint testing
- **Error Handling Tests**: Error scenario validation

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The application maintains high test coverage across:
- Route handlers and middleware
- Error handling scenarios
- Configuration management
- Response formatting utilities

For detailed testing documentation, see [docs/testing.md](docs/testing.md).

## Troubleshooting and Support

### Common Issues

#### Port Already in Use
```bash
# Error: EADDRINUSE: address already in use :::3000
# Solution: Use a different port
PORT=3001 npm start
```

#### Node.js Version Compatibility
```bash
# Error: Node.js version not supported
# Solution: Upgrade to Node.js 18+
node --version
```

#### Module Not Found
```bash
# Error: Cannot find module 'express'
# Solution: Reinstall dependencies
npm install
```

### Debug Mode

Enable detailed logging for troubleshooting:
```bash
DEBUG=express:* npm start
```

### Getting Help

1. **Check the logs**: Monitor console output for error messages
2. **Review documentation**: See [docs/troubleshooting.md](docs/troubleshooting.md)
3. **Verify environment**: Ensure Node.js and npm versions are correct
4. **Test dependencies**: Run `npm audit` to check for issues

For comprehensive troubleshooting, see [docs/troubleshooting.md](docs/troubleshooting.md).

## Development Workflow

### Project Structure

```
src/backend/
├── server.js                 # Server startup and process management
├── app.js                    # Express application configuration
├── routes/
│   └── hello.js             # Hello endpoint implementation
├── middleware/
│   ├── logger.js            # Request logging middleware
│   └── errorHandler.js      # Global error handling
├── utils/
│   ├── errorTypes.js        # Custom error classes
│   └── responseFormatter.js # Response formatting utilities
├── config/
│   └── index.js            # Environment configuration
├── docs/                   # Documentation
└── tests/                  # Test files
```

### Development Scripts

```bash
npm start       # Start production server
npm run dev     # Start development server with auto-restart
npm test        # Run test suite
npm run lint    # Check code style
npm run format  # Format code with Prettier
```

## Contribution Guidelines

### How to Contribute

1. **Fork the repository** and create a feature branch
2. **Follow the code style** and existing patterns
3. **Write tests** for new features or bug fixes
4. **Update documentation** for any API changes
5. **Submit a pull request** with a clear description

### Code Standards

- **ES2022+ JavaScript**: Use modern JavaScript features
- **Express 5.1.0 Patterns**: Follow Express best practices
- **Security First**: Implement security considerations from the start
- **Educational Focus**: Maintain clarity for learning purposes

### Testing Requirements

- All new features must include tests
- Maintain or improve test coverage
- Test both success and error scenarios
- Include integration tests for API endpoints

### Documentation Standards

- Update README.md for user-facing changes
- Add inline comments for complex logic
- Update API documentation for endpoint changes
- Include examples in documentation

## License and Acknowledgments

### License

This project is licensed under the **MIT License**. See the LICENSE file for details.

### Acknowledgments

- **Node.js Foundation**: For the excellent JavaScript runtime
- **Express.js Team**: For the robust web framework
- **Open Source Community**: For the tools and libraries that make this possible

### Educational Use

This project is designed for educational purposes and serves as a foundation for learning Node.js and Express.js development. It demonstrates production-ready patterns while maintaining educational clarity.

## Links to Further Documentation

### Project Documentation

- **[API Documentation](docs/api.md)**: Complete API reference with examples
- **[Architecture Guide](docs/architecture.md)**: System design and component details
- **[Setup Instructions](docs/setup.md)**: Comprehensive installation and configuration guide
- **[Testing Guide](docs/testing.md)**: Testing strategy and best practices
- **[Troubleshooting](docs/troubleshooting.md)**: Common issues and solutions

### External Resources

- **[Node.js Official Documentation](https://nodejs.org/docs/)**: Complete Node.js reference
- **[Express.js Guide](https://expressjs.com/guide/)**: Express framework documentation
- **[npm Documentation](https://docs.npmjs.com/)**: Package management and scripts
- **[MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript)**: JavaScript language reference

### Learning Resources

- **[Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)**: Production best practices
- **[Express Security](https://expressjs.com/en/advanced/best-practice-security.html)**: Security best practices
- **[RESTful API Design](https://restfulapi.net/)**: REST API design principles

---

**Welcome to Node.js backend development!** This tutorial application provides a solid foundation for learning server-side JavaScript development with modern tools and best practices. Start with the Quick Start guide above, then explore the detailed documentation to deepen your understanding.

For questions, issues, or contributions, please refer to the project's issue tracker or discussion forums.

**Happy coding!** 🚀