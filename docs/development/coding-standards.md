# Coding Standards and Style Guide

## 1. Introduction

This document defines the coding standards, style guide, documentation requirements, and testing expectations for all contributors to the Node.js tutorial backend project. These standards ensure code clarity, maintainability, and educational value by enforcing consistent JavaScript style, documentation practices, error handling, and test coverage.

### Purpose and Scope

The primary purpose of these coding standards is to:

- **Ensure Code Clarity and Maintainability**: Enforce consistent code style, documentation, and best practices essential for educational value and ease of understanding for learning developers
- **Support Educational Objectives**: Maintain simplicity and clarity that makes the codebase accessible to developers learning Node.js fundamentals
- **Align with Modern Standards**: Mandate ES2022+ JavaScript syntax and features, aligning with Node.js v22 LTS and Express.js v5.1.0 requirements
- **Provide Production-Ready Patterns**: Demonstrate industry best practices suitable for both learning and production environments

### Scope of Application

These standards apply to:
- All JavaScript source code in the `src/backend/` directory
- All test files in the `__tests__/` directory
- All configuration files (`.eslintrc.js`, `.prettierrc`, `jest.config.js`)
- All code contributions and pull requests
- All documentation and comments within the codebase

### Canonical Configuration Sources

The authoritative sources for automated enforcement of these standards are:
- **Linting**: `src/backend/.eslintrc.js` - Defines all ESLint rules and configurations
- **Formatting**: `src/backend/.prettierrc` - Defines all Prettier formatting rules
- **Testing**: `src/backend/jest.config.js` - Defines all Jest testing configurations and coverage thresholds
- **Dependencies**: `src/backend/package.json` - Defines all npm scripts and development tools

## 2. JavaScript Style and Formatting

### ES2022+ Modern JavaScript Standards

All code must use ES2022+ syntax and features, leveraging modern JavaScript capabilities available in Node.js v22 LTS:

- **Module Syntax**: Use ES6 import/export statements where supported
- **Async/Await**: Prefer async/await over Promise chains for better readability
- **Arrow Functions**: Use arrow functions for concise function expressions
- **Template Literals**: Use template literals for string interpolation
- **Destructuring**: Use destructuring assignment for cleaner variable extraction
- **Optional Chaining**: Use optional chaining (`?.`) and nullish coalescing (`??`) operators

### Code Formatting Rules

All code must be formatted according to Prettier configuration in `.prettierrc`:

| Rule | Value | Purpose |
|------|-------|---------|
| **Print Width** | 100 characters | Optimal line length for readability |
| **Tab Width** | 2 spaces | Consistent indentation |
| **Use Tabs** | false | Spaces for cross-platform compatibility |
| **Semicolons** | true | Explicit statement termination |
| **Single Quotes** | true | Consistent string quoting |
| **Trailing Commas** | "es5" | Trailing commas in objects and arrays |
| **Bracket Spacing** | true | Spaces inside object literals |
| **Arrow Parens** | "always" | Parentheses around arrow function parameters |
| **End of Line** | "lf" | Unix line endings for consistency |

### ESLint Configuration Compliance

All code must pass ESLint validation according to `.eslintrc.js` configuration:

#### Core Rules Enforcement
- **No Console Logs**: Use the centralized logger utility instead of `console.log()`
- **Node.js Compatibility**: Target Node.js v18+ for Express.js v5.1.0 compatibility
- **Import Resolution**: All imports must be resolvable and use proper file extensions
- **Modern Syntax**: Leverage ES2022+ features with proper environment configuration

#### Code Quality Standards
```javascript
// ✅ CORRECT - Using logger utility
const { logger } = require('./utils/logger.js');
logger.info('Server started successfully', { port: 3000 });

// ❌ INCORRECT - Direct console usage
console.log('Server started on port 3000');

// ✅ CORRECT - Modern async/await
async function handleRequest(req, res) {
  try {
    const result = await processRequest(req);
    res.json(result);
  } catch (error) {
    errorResponse(error, res, req);
  }
}

// ✅ CORRECT - ES2022+ destructuring and template literals
const { method, url, ip } = req;
logger.info(`${method} ${url} from ${ip}`);
```

### File Organization Standards

- **Module Exports**: Use CommonJS `module.exports` for main application files
- **Import Order**: Group imports logically (Node.js built-ins, external packages, internal modules)
- **Function Organization**: Define functions before they are used, group related functions together
- **Constant Definitions**: Define constants at the top of files, use UPPER_SNAKE_CASE for module constants

## 3. Documentation Requirements

### JSDoc Documentation Standards

All exported functions, classes, and modules must include comprehensive JSDoc comments as enforced by ESLint JSDoc plugin rules:

#### Required JSDoc Tags
- `@description` - Detailed function/class description
- `@param {type} name - description` - All function parameters
- `@returns {type} description` - Return value description
- `@throws {type} description` - Thrown exceptions (where applicable)
- `@example` - Usage examples for complex functions

#### Documentation Examples

```javascript
/**
 * Normalizes any thrown error or value into an AppError instance for consistent downstream handling
 * Ensures all errors have a status and message, and strips sensitive details for security
 * 
 * @param {any} err - The error or value to normalize (can be Error, string, or any other type)
 * @returns {AppError} A standardized AppError instance with status, message, and safe details
 * @throws {TypeError} When unable to create a valid AppError instance
 * @example
 * // Normalize a standard Error
 * const normalizedError = normalizeError(new Error('Database connection failed'));
 * 
 * // Normalize a string message
 * const stringError = normalizeError('Invalid input provided');
 */
function normalizeError(err) {
  // Implementation details...
}

/**
 * Custom error class for application-specific errors with HTTP status support
 * Used for all operational errors and for propagating error details in a secure, standardized way
 * Extends the built-in Error class to maintain standard error behavior while adding HTTP-specific features
 * 
 * @example
 * // Create a client error
 * throw new AppError('Invalid request format', 400);
 * 
 * // Create a server error with details
 * throw new AppError('Database connection failed', 500, { database: 'primary' });
 */
class AppError extends Error {
  /**
   * Initializes the AppError with a message, HTTP status, and optional internal details
   * 
   * @param {string} message - The error message to be displayed or logged
   * @param {number} [status=500] - HTTP status code associated with this error
   * @param {object} [details] - Optional internal details for debugging (not exposed to client)
   */
  constructor(message, status = 500, details = null) {
    // Implementation details...
  }
}
```

### Comment Guidelines

- **Inline Comments**: Use sparingly, only for complex logic that isn't self-explanatory
- **Block Comments**: Use for major sections and algorithm explanations
- **TODO Comments**: Include issue tracking references for future improvements
- **Comment Maintenance**: Update comments when code changes to prevent documentation debt

## 4. Error Handling and Logging Standards

### Centralized Error Handling

All error handling must use the centralized error utilities from `src/backend/utils/errors.js`:

#### Required Error Patterns

```javascript
const { AppError, normalizeError, errorResponse } = require('./utils/errors.js');

// ✅ CORRECT - Using AppError for application errors
if (!isValidInput(data)) {
  throw new AppError('Invalid input format', 400, { field: 'email' });
}

// ✅ CORRECT - Normalizing caught errors
try {
  await externalApiCall();
} catch (error) {
  const normalizedError = normalizeError(error);
  throw normalizedError;
}

// ✅ CORRECT - Secure error responses
app.use((error, req, res, next) => {
  errorResponse(error, res, req);
});
```

#### Error Security Requirements

- **No Stack Trace Exposure**: Never expose stack traces to clients
- **Sensitive Data Protection**: Filter sensitive information from error responses
- **Consistent Error Format**: All error responses must use the `errorResponse` function
- **Internal Error Logging**: Log complete error details internally for debugging

### Centralized Logging Standards

All logging must use the centralized logger utility from `src/backend/utils/logger.js`:

#### Logging Levels and Usage

| Level | Purpose | Method | Output Stream |
|-------|---------|--------|---------------|
| **INFO** | General application information | `logger.info()` | stdout |
| **WARN** | Non-critical issues and warnings | `logger.warn()` | stderr |
| **ERROR** | Critical errors requiring attention | `logger.error()` | stderr |

#### Logging Implementation Examples

```javascript
const { logger } = require('./utils/logger.js');

// ✅ CORRECT - Structured logging with metadata
logger.info('Server started successfully', {
  port: 3000,
  environment: process.env.NODE_ENV,
  nodeVersion: process.version
});

// ✅ CORRECT - Warning with context
logger.warn('Deprecated API endpoint accessed', {
  endpoint: '/old-api',
  userAgent: req.get('User-Agent'),
  ip: req.ip
});

// ✅ CORRECT - Error logging with request context
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  query: sanitizedQuery,
  timestamp: new Date().toISOString()
});

// ❌ INCORRECT - Direct console usage
console.log('Server started'); // Use logger.info() instead
console.error('Error occurred'); // Use logger.error() instead
```

#### Logging Security and Best Practices

- **No Sensitive Data**: Never log passwords, tokens, or personal information
- **Structured Metadata**: Include relevant context objects for debugging
- **Timestamp Consistency**: All log entries include ISO 8601 timestamps
- **Log Level Filtering**: Respect LOG_LEVEL environment variable configuration

## 5. Testing Standards and Coverage

### Jest Testing Framework Configuration

All tests must be written using Jest framework according to `jest.config.js` configuration:

#### Test Environment Setup
- **Test Environment**: Node.js (not browser/jsdom)
- **Setup Files**: Use `__tests__/setup.js` for logger stubbing and global test configuration
- **Test Pattern**: Place tests in `__tests__/**/*.test.js` files
- **Timeout**: Maximum 5 seconds per test to prevent hanging tests

### Code Coverage Requirements

All code must meet strict coverage thresholds as defined in Jest configuration:

| Coverage Type | Minimum Threshold | Purpose |
|---------------|-------------------|---------|
| **Branches** | 80% | Conditional logic testing |
| **Functions** | 100% | Complete function validation |
| **Lines** | 90% | Comprehensive code execution |
| **Statements** | 90% | Thorough statement coverage |

### Testing Implementation Patterns

#### Unit Testing with Supertest

```javascript
const request = require('supertest');
const app = require('../app.js');

describe('GET /hello', () => {
  it('should return 200 status code', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200);
  });

  it('should return Hello world message', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200);
    
    expect(response.text).toBe('Hello world');
  });

  it('should set correct content-type header', async () => {
    await request(app)
      .get('/hello')
      .expect('Content-Type', /text\/plain/);
  });
});
```

#### Error Handling Tests

```javascript
describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    await request(app)
      .get('/unknown-endpoint')
      .expect(404);
  });

  it('should return 405 for unsupported methods', async () => {
    await request(app)
      .post('/hello')
      .expect(405);
  });

  it('should not expose sensitive error details', async () => {
    const response = await request(app)
      .get('/error-endpoint')
      .expect(500);
    
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).toHaveProperty('error', true);
  });
});
```

### Test Organization and Best Practices

- **Test File Naming**: Use `.test.js` suffix for all test files
- **Describe Blocks**: Group related tests using descriptive `describe()` blocks
- **Test Independence**: Each test should run independently without shared state
- **Arrange-Act-Assert**: Follow AAA pattern for clear test structure
- **Test Data**: Use fixtures in `__tests__/fixtures/` for reusable test data

## 6. Code Review Checklist

### Pre-Review Requirements

Before submitting a pull request, ensure:

- [ ] **ESLint Passes**: Run `npm run lint` with zero errors
- [ ] **Prettier Formatting**: Run `npm run format:check` with no formatting issues
- [ ] **All Tests Pass**: Run `npm test` with 100% test success rate
- [ ] **Coverage Thresholds Met**: Coverage meets all minimum thresholds (80% branches, 100% functions, 90% lines/statements)
- [ ] **JSDoc Documentation**: All exported functions and classes include complete JSDoc comments

### Code Quality Verification

#### Style and Formatting
- [ ] Code follows ES2022+ syntax standards
- [ ] All formatting adheres to Prettier configuration
- [ ] No direct `console.log()` usage (use logger utility)
- [ ] Consistent variable naming (camelCase for variables, PascalCase for classes)
- [ ] Proper error handling using AppError and errorResponse

#### Documentation and Comments
- [ ] JSDoc comments include all required tags (@param, @returns, @throws)
- [ ] Function descriptions are clear and educational
- [ ] Complex logic includes explanatory comments
- [ ] README and setup instructions are updated if necessary

#### Error Handling and Logging
- [ ] All errors use centralized error utilities
- [ ] No sensitive information in error responses
- [ ] Appropriate logging levels used (info, warn, error)
- [ ] Error responses follow standardized format

#### Testing and Coverage
- [ ] All new functions have corresponding unit tests
- [ ] Integration tests cover HTTP endpoint behavior
- [ ] Edge cases and error scenarios are tested
- [ ] Test descriptions are clear and specific

### Security Verification
- [ ] No hardcoded secrets or sensitive data
- [ ] Error responses don't expose internal details
- [ ] Input validation implemented where appropriate
- [ ] Dependencies are up-to-date and secure

### Performance Considerations
- [ ] No blocking operations in the event loop
- [ ] Proper async/await usage for asynchronous operations
- [ ] Memory usage patterns are efficient
- [ ] Response times meet performance targets (<100ms for /hello endpoint)

## 7. References and Configuration Files

### Core Configuration Files

#### ESLint Configuration
- **File**: `src/backend/.eslintrc.js`
- **Purpose**: Defines all linting rules, environments, parser options, plugins, and code style enforcement
- **Key Features**: ES2022+ support, Node.js rules, Jest integration, JSDoc enforcement, Prettier integration

#### Prettier Configuration
- **File**: `src/backend/.prettierrc`
- **Purpose**: Defines code formatting rules ensuring consistent style across all source files
- **Key Settings**: 100-character line width, 2-space indentation, single quotes, trailing commas, LF line endings

#### Jest Configuration
- **File**: `src/backend/jest.config.js`
- **Purpose**: Defines test runner settings, file matching patterns, and coverage requirements
- **Coverage Thresholds**: 80% branches, 100% functions, 90% lines/statements

### Utility Modules

#### Logger Utility
- **File**: `src/backend/utils/logger.js`
- **Purpose**: Centralized logging utility for all info, warn, and error logging
- **Features**: Structured logging, log level filtering, timestamp formatting, stdout/stderr routing

#### Error Handling Utility
- **File**: `src/backend/utils/errors.js`
- **Purpose**: Centralized error utility for custom error types, normalization, and secure error responses
- **Components**: AppError class, normalizeError function, errorResponse function

### Package Configuration

#### Package.json Scripts
- **File**: `src/backend/package.json`
- **Development Scripts**:
  - `npm run lint` - Run ESLint code quality checks
  - `npm run format` - Apply Prettier formatting
  - `npm test` - Execute Jest test suite with coverage
  - `npm run dev` - Start development server with nodemon

#### Dependencies and Versions
- **Node.js**: v18+ (recommended v22 LTS)
- **Express.js**: v5.1.0 (latest stable with security improvements)
- **ESLint**: ^8.0.0 with recommended plugins
- **Jest**: ^29.0.0 for testing framework
- **Prettier**: ^3.0.0 for code formatting

### External Documentation

- **Node.js LTS Documentation**: [nodejs.org/en/about/releases](https://nodejs.org/en/about/releases)
- **Express.js v5 Guide**: [expressjs.com/en/guide](https://expressjs.com/en/guide)
- **ESLint Rules Reference**: [eslint.org/docs/rules](https://eslint.org/docs/rules)
- **Jest Testing Framework**: [jestjs.io/docs/getting-started](https://jestjs.io/docs/getting-started)
- **Prettier Configuration**: [prettier.io/docs/en/configuration.html](https://prettier.io/docs/en/configuration.html)

### Compliance and Enforcement

These coding standards are enforced through:
- **Pre-commit Hooks**: ESLint and Prettier validation before commits
- **CI/CD Pipeline**: Automated linting, formatting, and test execution
- **Code Review Process**: Manual verification of standards compliance
- **Documentation Requirements**: JSDoc enforcement through ESLint rules

All contributors must familiarize themselves with these standards and ensure compliance before submitting contributions. The project maintainers reserve the right to reject pull requests that do not meet these coding standards.