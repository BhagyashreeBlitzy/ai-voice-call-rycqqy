# Node.js Tutorial Backend

A comprehensive, educational Node.js backend application demonstrating modern Express 5.1.0 patterns, robust error handling, and industry best practices. This tutorial serves as the perfect starting point for learning server-side JavaScript development with Node.js and Express.

## 🎯 Project Overview

This tutorial backend provides a hands-on learning experience for Node.js fundamentals, featuring a single `/hello` endpoint that showcases essential web server concepts. Built with Express 5.1.0 and Node.js 22.x LTS, it demonstrates production-ready patterns while maintaining educational clarity.

### 🌟 Key Features

- **Modern Stack**: Node.js 22.x LTS + Express 5.1.0 with enhanced security
- **Educational Focus**: Beginner-friendly with extensive documentation and comments
- **Production Patterns**: Enterprise-grade error handling, logging, and security
- **Comprehensive Testing**: Jest and SuperTest with 90%+ code coverage
- **Robust Architecture**: Stateless design with graceful shutdown handling
- **Security First**: ReDoS protection, security headers, and threat model implementation

### 👥 Target Audience

- **Beginning Node.js developers** learning server-side fundamentals
- **Educational institutions** teaching web development
- **Development teams** onboarding to modern Node.js patterns
- **Technical mentors** seeking practical examples

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

```bash
# Node.js 18+ (22.x LTS recommended)
node --version  # Should be 18.x or higher

# npm 9+ (comes with Node.js)
npm --version   # Should be 9.x or higher
```

### Installation & Setup

1. **Clone and Install Dependencies**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd nodejs-tutorial-backend

   # Install dependencies
   npm install
   ```

2. **Start the Development Server**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

3. **Test the Endpoint**
   ```bash
   # Test the hello endpoint
   curl http://localhost:3000/hello

   # Expected response
   Hello world
   ```

### Environment Configuration

Create a `.env` file for custom configuration:

```bash
# Server configuration
PORT=3000
NODE_ENV=development
```

## 📡 API Overview

### Available Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/hello` | Returns a greeting message | `Hello world` |

### Example Usage

```bash
# Basic request
curl -i http://localhost:3000/hello

# Response
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 11

Hello world
```

### Error Handling

The API implements comprehensive error handling with standardized responses:

```bash
# Request to non-existent endpoint
curl http://localhost:3000/nonexistent

# Returns 404 with structured error response
{
  "success": false,
  "message": "Not Found",
  "code": "NOT_FOUND",
  "status": 404
}
```

For detailed API documentation, see [docs/api.md](src/backend/docs/api.md).

## 🏗️ Architecture Overview

### System Architecture

The application follows a **monolithic, stateless, event-driven architecture** optimized for educational clarity and modern development patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Client                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Node.js HTTP Server                          │
├─────────────────────────────────────────────────────────────┤
│                Express Application                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   Request   │ │   Routing   │ │     Error Handling      ││
│  │   Logger    │ │  Component  │ │     Middleware          ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **HTTP Server** | Request/response handling | Node.js HTTP module |
| **Express App** | Web framework and routing | Express 5.1.0 |
| **Route Handler** | Business logic for `/hello` | Express Router |
| **Error Middleware** | Centralized error management | Express error handling |
| **Logger** | Request/response monitoring | Custom logging utility |

### Design Principles

- **Single Responsibility**: Each component has a clear, focused purpose
- **Event-Driven**: Leverages Node.js event loop for high concurrency
- **Stateless**: No persistent state, enabling easy scaling
- **Security-First**: Built-in protection against common vulnerabilities

For detailed architecture documentation, see [docs/architecture.md](src/backend/docs/architecture.md).

## ⚙️ Setup & Configuration

For comprehensive setup instructions including environment configuration, development tools, and deployment options, see [docs/setup.md](src/backend/docs/setup.md).

### Development Environment

The application supports multiple development workflows:

```bash
# Development with auto-restart
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Application environment |

## 🧪 Testing & Quality Assurance

### Testing Framework

The application uses **Jest** and **SuperTest** for comprehensive testing:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Testing Categories

- **Unit Tests**: Individual function and component testing
- **Integration Tests**: HTTP endpoint testing with SuperTest
- **Error Handling Tests**: Comprehensive error scenario validation
- **Performance Tests**: Response time and resource usage validation

### Coverage Targets

- **Line Coverage**: 90%+ (achieved)
- **Function Coverage**: 100% (achieved)
- **Branch Coverage**: 80%+ (achieved)

### Example Test

```javascript
describe('GET /hello', () => {
  it('should return "Hello world" with 200 status', async () => {
    const response = await request(app).get('/hello');
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello world');
    expect(response.type).toBe('text/plain');
  });
});
```

For detailed testing documentation, see [docs/testing.md](src/backend/docs/testing.md).

## 🐛 Troubleshooting

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
# Solution: Upgrade to Node.js 18+ LTS
nvm install --lts
nvm use --lts
```

#### Missing Dependencies
```bash
# Error: Cannot find module 'express'
# Solution: Install dependencies
npm install
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable Express debug logging
DEBUG=express:* npm start

# Enable application debug logging
NODE_ENV=development npm start
```

### Health Check

Verify the application is running correctly:

```bash
# Check server health
curl http://localhost:3000/hello

# Expected: "Hello world" with 200 status
```

For comprehensive troubleshooting guidance, see [docs/troubleshooting.md](src/backend/docs/troubleshooting.md).

## 🤝 Contributing

We welcome contributions from developers of all skill levels! This project serves as an educational resource, and contributions help improve the learning experience for everyone.

### How to Contribute

1. **Fork the repository** and create a feature branch
2. **Follow the code style** using our ESLint and Prettier configuration
3. **Add tests** for new features or bug fixes
4. **Update documentation** to reflect your changes
5. **Submit a pull request** with a clear description

### Development Workflow

```bash
# 1. Set up development environment
npm install
npm run dev

# 2. Make your changes
# Follow existing patterns and add tests

# 3. Validate your changes
npm run lint      # Check code style
npm test          # Run test suite
npm run format    # Format code

# 4. Commit and push
git add .
git commit -m "Description of changes"
git push origin feature-branch
```

### Code Style

- **ESLint**: Enforces consistent code style and catches common errors
- **Prettier**: Automatically formats code for consistency
- **JSDoc**: Document functions and classes with comprehensive comments
- **Testing**: Maintain 90%+ test coverage for all new code

### Reporting Issues

- **Bug Reports**: Use GitHub Issues with detailed reproduction steps
- **Feature Requests**: Describe the educational value and use case
- **Questions**: Use GitHub Discussions for general questions

## 📚 Learning Resources

### Educational Documentation

- **[API Documentation](src/backend/docs/api.md)**: Complete API reference and examples
- **[Architecture Guide](src/backend/docs/architecture.md)**: System design and component details
- **[Setup Instructions](src/backend/docs/setup.md)**: Detailed installation and configuration
- **[Testing Guide](src/backend/docs/testing.md)**: Testing strategies and best practices
- **[Troubleshooting](src/backend/docs/troubleshooting.md)**: Common issues and solutions

### External Resources

- **[Node.js Official Documentation](https://nodejs.org/docs/)**: Core Node.js concepts
- **[Express.js Guide](https://expressjs.com/guide/)**: Express framework documentation
- **[JavaScript MDN](https://developer.mozilla.org/JavaScript)**: JavaScript language reference
- **[HTTP Protocol](https://developer.mozilla.org/HTTP)**: HTTP protocol fundamentals

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

The MIT License permits use, modification, and distribution for both personal and commercial purposes, making this tutorial freely available for educational use.

## 🙏 Acknowledgments

### Technology Credits

- **[Node.js](https://nodejs.org/)**: JavaScript runtime environment
- **[Express.js](https://expressjs.com/)**: Web application framework
- **[Jest](https://jestjs.io/)**: Testing framework
- **[SuperTest](https://github.com/visionmedia/supertest)**: HTTP assertion library

### Educational Support

This tutorial is designed to support:
- **Individual learners** exploring Node.js development
- **Educational institutions** teaching web development
- **Development teams** adopting modern Node.js patterns
- **Open source community** contributing to educational resources

### Community

Special thanks to the Node.js and Express.js communities for creating robust, educational-friendly tools and maintaining comprehensive documentation that makes learning server-side JavaScript accessible to developers worldwide.

---

## 📖 Quick Reference

### Essential Commands

```bash
# Development
npm run dev          # Start development server
npm test             # Run test suite
npm run lint         # Check code style

# Production
npm start            # Start production server
npm run test:coverage # Coverage report

# Maintenance
npm audit            # Security audit
npm update           # Update dependencies
```

### Project Structure

```
src/backend/
├── app.js              # Express application configuration
├── server.js           # HTTP server startup
├── routes/             # API route handlers
├── middleware/         # Custom middleware
├── utils/              # Utility functions
├── config/             # Configuration management
├── docs/               # Documentation
└── tests/              # Test files
```

### Performance Targets

- **Response Time**: < 50ms for `/hello` endpoint
- **Memory Usage**: < 50MB baseline
- **Startup Time**: < 2 seconds
- **Test Coverage**: 90%+ across all metrics

---

**Ready to start learning?** Follow the [Quick Start](#-quick-start) guide above, then explore the comprehensive documentation in the `docs/` directory. Happy coding! 🚀

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Node.js**: 22.x LTS  
**Express**: 5.1.0