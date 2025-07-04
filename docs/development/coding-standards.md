# Node.js Tutorial Backend - Coding Standards

## Table of Contents

1. [Introduction and Purpose](#1-introduction-and-purpose)
2. [Linting Standards (ESLint)](#2-linting-standards-eslint)
3. [Formatting Standards (Prettier)](#3-formatting-standards-prettier)
4. [Type-Checking Standards (TypeScript)](#4-type-checking-standards-typescript)
5. [Best Practices and Code Quality](#5-best-practices-and-code-quality)
6. [How to Fix Linting and Formatting Errors](#6-how-to-fix-linting-and-formatting-errors)
7. [References and Further Reading](#7-references-and-further-reading)

---

## 1. Introduction and Purpose

### 1.1 Welcome to Professional Node.js Development

This comprehensive coding standards document serves as the definitive guide for writing high-quality, maintainable, and consistent code in the Node.js tutorial backend project. Whether you're a beginning developer learning Node.js fundamentals or an experienced programmer contributing to this educational project, these standards ensure code quality, consistency, and educational clarity.

**Why These Standards Matter:**
- **Educational Value**: Clear, consistent code helps learners understand patterns and best practices
- **Maintainability**: Standardized code is easier to read, debug, and extend
- **Collaboration**: Consistent style reduces friction in code reviews and team development
- **Professional Preparation**: These standards reflect real-world industry practices

### 1.2 Project Context

**Technology Stack:**
- **Runtime**: Node.js 18+ (22.x LTS recommended)
- **Framework**: Express 5.1.0 with enhanced security features
- **Language**: JavaScript ES2022+ with modern async/await patterns
- **Testing**: Jest 29+ with SuperTest 7.1.1 for comprehensive testing

**Code Quality Tools:**
- **ESLint 8.0+**: Automated code quality and style checking
- **Prettier 3.2.5**: Consistent code formatting and style
- **TypeScript**: Optional type checking for enhanced developer experience
- **Jest**: Testing framework with built-in coverage reporting

### 1.3 How to Use This Document

This document is structured to provide:
1. **Immediate Reference**: Quick answers to common coding questions
2. **Educational Content**: Explanations of why certain patterns are preferred
3. **Practical Examples**: Real code examples from the project
4. **Tool Integration**: How to use automated tools to enforce standards

**For Beginners**: Start with the Best Practices section to understand the reasoning behind each standard.
**For Contributors**: Use the Quick Reference sections to verify your code meets project requirements.
**For Educators**: Reference the educational rationale provided throughout the document.

---

## 2. Linting Standards (ESLint)

### 2.1 ESLint Configuration Overview

Our ESLint configuration enforces code quality, consistency, and modern JavaScript best practices. The configuration is defined in `src/backend/.eslintrc.js` and integrates multiple rule sets for comprehensive code analysis.

**Core Configuration:**
```javascript
// Key ESLint settings from .eslintrc.js
{
  "env": {
    "node": true,        // Node.js global variables
    "es2022": true,      // ES2022 syntax support
    "jest": true         // Jest testing globals
  },
  "extends": [
    "eslint:recommended",           // ESLint core rules
    "plugin:node/recommended",      // Node.js best practices
    "plugin:promise/recommended",   // Promise/async best practices
    "plugin:import/recommended",    // ES6 import/export rules
    "prettier"                      // Prettier integration
  ]
}
```

**Why These Extensions Matter:**
- **eslint:recommended**: Catches common JavaScript errors and suspicious patterns
- **plugin:node/recommended**: Ensures Node.js compatibility and best practices
- **plugin:promise/recommended**: Promotes proper async/await and promise usage
- **plugin:import/recommended**: Enforces clean module organization
- **prettier**: Prevents conflicts between ESLint and Prettier formatting

### 2.2 Critical ESLint Rules

#### 2.2.1 Variable Usage and Declaration

**Rule: `no-unused-vars`**
```javascript
// ✅ Good - all variables are used
function processUser(user) {
  const { name, email } = user;
  return { formattedName: name.toUpperCase(), email };
}

// ❌ Bad - unused variable
function processUser(user) {
  const { name, email, age } = user; // age is unused
  return { formattedName: name.toUpperCase(), email };
}
```

**Rule: `no-undef`**
```javascript
// ✅ Good - all variables are defined
const express = require('express');
const app = express();

// ❌ Bad - undefined variable
const app = Express(); // Express is not defined
```

**Educational Note**: These rules catch common typos and unused code that can lead to bugs or confusion for learners.

#### 2.2.2 Console Usage Guidelines

**Rule: `no-console` (configured to allow specific methods)**
```javascript
// ✅ Good - allowed console methods
console.info('Server starting on port 3000');
console.warn('Deprecated API usage detected');
console.error('Database connection failed:', error);

// ❌ Bad - console.log not allowed in production code
console.log('Debug message'); // Use logger instead
```

**Why This Matters**: Proper logging practices are essential for production applications and help students learn professional debugging techniques.

#### 2.2.3 Node.js Compatibility

**Rule: `node/no-unsupported-features/es-syntax`**
```javascript
// Configuration enforces Node.js 18+ compatibility
{
  "node/no-unsupported-features/es-syntax": [
    "error", 
    { "version": ">=18.0.0" }
  ]
}
```

**Examples:**
```javascript
// ✅ Good - ES2022 features supported in Node.js 18+
const data = await fetchData(); // Top-level await
const config = { ...defaultConfig, ...userConfig }; // Spread operator
const result = array.at(-1); // Array.at() method

// ❌ Bad - features not supported in Node.js 18
// (This would be caught by the rule)
```

### 2.3 Promise and Async/Await Rules

#### 2.3.1 Promise Handling

**Rule: `promise/catch-or-return`**
```javascript
// ✅ Good - promise is properly handled
async function fetchUserData(userId) {
  try {
    const user = await database.getUser(userId);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user:', error);
    throw error;
  }
}

// ✅ Good - promise is returned
function fetchUserData(userId) {
  return database.getUser(userId)
    .catch(error => {
      logger.error('Failed to fetch user:', error);
      throw error;
    });
}

// ❌ Bad - promise not handled
function fetchUserData(userId) {
  database.getUser(userId); // No return, no catch
}
```

**Educational Value**: Express 5.1.0 automatically catches rejected promises, but proper promise handling is still a critical skill for Node.js developers.

#### 2.3.2 Express 5 Async Route Handling

```javascript
// ✅ Good - Express 5 automatically handles rejected promises
app.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  res.json(user);
});

// ✅ Good - explicit error handling still works
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});
```

### 2.4 Import/Export Organization

#### 2.4.1 Import Ordering

**Rule: `import/order`**
```javascript
// ✅ Good - imports are properly organized
// Built-in Node.js modules
const path = require('node:path');
const fs = require('node:fs');

// External npm packages
const express = require('express');
const bodyParser = require('body-parser');

// Internal project modules
const { Logger } = require('./utils/logger.js');
const { AppError } = require('./utils/errorTypes.js');

// Parent directory imports
const config = require('../config/index.js');

// Sibling file imports
const helloRoutes = require('./hello.js');
```

**Educational Benefit**: This organization makes it easy to understand project dependencies and promotes good software architecture.

#### 2.4.2 Import Validation

**Rule: `import/no-unresolved`**
```javascript
// ✅ Good - all imports resolve correctly
const express = require('express'); // External package
const logger = require('./utils/logger.js'); // Local file with extension

// ❌ Bad - import doesn't resolve
const missing = require('./nonexistent.js'); // File doesn't exist
const typo = require('expres'); // Typo in package name
```

### 2.5 Running ESLint

#### 2.5.1 Command Line Usage

```bash
# Run ESLint on all files
npm run lint

# Run ESLint with automatic fixing
npm run lint -- --fix

# Run ESLint on specific files
npx eslint src/routes/hello.js

# Run ESLint with detailed output
npm run lint -- --verbose
```

#### 2.5.2 IDE Integration

**VS Code Setup:**
1. Install the ESLint extension
2. Add to your settings.json:
```json
{
  "eslint.workingDirectories": ["src/backend"],
  "eslint.validate": ["javascript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**WebStorm/IntelliJ Setup:**
1. Enable ESLint in Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Set Configuration file to `src/backend/.eslintrc.js`

### 2.6 File-Specific Overrides

#### 2.6.1 Test Files

```javascript
// Test files have more lenient rules
{
  "files": ["**/tests/**/*.js", "**/*.test.js"],
  "rules": {
    "no-unused-expressions": "off",     // Allow assertions
    "node/no-unpublished-require": "off" // Allow test dependencies
  }
}
```

#### 2.6.2 Script Files

```javascript
// Build and utility scripts allow console usage
{
  "files": ["scripts/*.js"],
  "rules": {
    "no-console": "off"  // Console allowed in scripts
  }
}
```

---

## 3. Formatting Standards (Prettier)

### 3.1 Prettier Configuration

Prettier automatically formats code for consistency across the entire project. The configuration is defined in `src/backend/.prettierrc` and enforces our preferred code style.

**Core Configuration:**
```json
{
  "printWidth": 100,        // Line length limit
  "tabWidth": 2,            // 2 spaces for indentation
  "useTabs": false,         // Use spaces, not tabs
  "semi": true,             // Require semicolons
  "singleQuote": true,      // Use single quotes
  "trailingComma": "es5",   // Trailing commas where valid
  "bracketSpacing": true,   // Spaces in object literals
  "arrowParens": "always",  // Always parentheses around arrow function parameters
  "endOfLine": "lf"         // Unix line endings
}
```

### 3.2 Formatting Rules Explained

#### 3.2.1 Line Length and Wrapping

**Rule: `printWidth: 100`**
```javascript
// ✅ Good - within 100 characters
const user = { name: 'John Doe', email: 'john@example.com', age: 30 };

// ✅ Good - wrapped when exceeding 100 characters
const userWithLongProperties = {
  firstName: 'John',
  lastName: 'Doe',
  emailAddress: 'john.doe@example.com',
  phoneNumber: '+1-555-123-4567',
};

// ✅ Good - function parameters wrapped
function processUserData(
  userId,
  userData,
  validationOptions,
  processingContext
) {
  // Function body
}
```

**Why 100 Characters**: This width accommodates modern screen resolutions while remaining readable on smaller screens and when viewing code side-by-side.

#### 3.2.2 Indentation and Spacing

**Rule: `tabWidth: 2, useTabs: false`**
```javascript
// ✅ Good - 2 spaces for indentation
if (condition) {
  const result = processData();
  if (result.isValid) {
    return result.data;
  }
}

// ✅ Good - consistent indentation in objects
const config = {
  development: {
    database: {
      host: 'localhost',
      port: 5432,
    },
  },
  production: {
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
    },
  },
};
```

**Educational Benefit**: Consistent indentation helps students understand code structure and nesting levels.

#### 3.2.3 Quotes and Semicolons

**Rule: `singleQuote: true, semi: true`**
```javascript
// ✅ Good - single quotes and semicolons
const message = 'Hello world';
const config = { apiKey: 'secret-key' };

// ✅ Good - double quotes when necessary
const messageWithApostrophe = "It's a beautiful day";
const htmlString = '<div class="container">Content</div>';

// ✅ Good - semicolons required
const app = express();
const port = process.env.PORT || 3000;
```

**Why Single Quotes**: Reduces visual noise and aligns with Node.js community conventions.
**Why Semicolons**: Prevents automatic semicolon insertion (ASI) issues and makes code more explicit.

#### 3.2.4 Trailing Commas

**Rule: `trailingComma: "es5"`**
```javascript
// ✅ Good - trailing commas in objects and arrays
const user = {
  name: 'John',
  email: 'john@example.com',
  age: 30, // Trailing comma
};

const colors = [
  'red',
  'green',
  'blue', // Trailing comma
];

// ✅ Good - no trailing comma in function parameters (ES5 compatibility)
function processUser(name, email, age) {
  // Function body
}
```

**Benefits**: Trailing commas reduce diff noise in version control and make it easier to add new properties.

### 3.3 Object and Array Formatting

#### 3.3.1 Object Literal Spacing

**Rule: `bracketSpacing: true`**
```javascript
// ✅ Good - spaces inside object literals
const config = { port: 3000, host: 'localhost' };
const user = { name: 'John', age: 30 };

// ❌ Bad - no spaces (would be auto-fixed)
const config = {port: 3000, host: 'localhost'};
```

#### 3.3.2 Complex Object Formatting

```javascript
// ✅ Good - complex objects are formatted for readability
const serverConfig = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'tutorial',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
  },
};
```

### 3.4 Function Formatting

#### 3.4.1 Arrow Function Parameters

**Rule: `arrowParens: "always"`**
```javascript
// ✅ Good - always use parentheses
const processUser = (user) => {
  return { ...user, processed: true };
};

const getUserId = (user) => user.id;

// ✅ Good - multiple parameters
const createUser = (name, email) => {
  return { name, email, id: generateId() };
};
```

**Why Always Parentheses**: Consistency and easier modification when adding parameters.

#### 3.4.2 Function Declaration Formatting

```javascript
// ✅ Good - function declarations
function processUserData(userData, options) {
  const { name, email } = userData;
  const { validateEmail = true } = options;
  
  if (validateEmail && !isValidEmail(email)) {
    throw new AppError('Invalid email address', 400);
  }
  
  return {
    name: name.trim(),
    email: email.toLowerCase(),
    processed: true,
  };
}

// ✅ Good - async function formatting
async function fetchUserData(userId) {
  try {
    const user = await database.getUser(userId);
    const profile = await database.getUserProfile(userId);
    
    return {
      ...user,
      profile,
    };
  } catch (error) {
    logger.error('Failed to fetch user data:', error);
    throw error;
  }
}
```

### 3.5 Running Prettier

#### 3.5.1 Command Line Usage

```bash
# Format all files
npm run format

# Format specific files
npx prettier --write src/routes/hello.js

# Check formatting without fixing
npx prettier --check src/

# Format specific file types
npx prettier --write "src/**/*.js"
```

#### 3.5.2 IDE Integration

**VS Code Setup:**
1. Install the Prettier extension
2. Add to your settings.json:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "prettier.configPath": "src/backend/.prettierrc"
}
```

**WebStorm/IntelliJ Setup:**
1. Install Prettier plugin
2. Enable "On save" formatting in Preferences → Tools → Actions on Save

### 3.6 Prettier and ESLint Integration

The project uses `eslint-config-prettier` to disable ESLint rules that conflict with Prettier formatting:

```javascript
// In .eslintrc.js
{
  "extends": [
    "eslint:recommended",
    "plugin:node/recommended",
    "plugin:promise/recommended",
    "plugin:import/recommended",
    "prettier" // Must be last to override other configs
  ]
}
```

**Running Both Tools:**
```bash
# Recommended workflow
npm run lint    # Check code quality
npm run format  # Format code
npm run lint    # Verify no conflicts
```

---

## 4. Type-Checking Standards (TypeScript)

### 4.1 TypeScript Configuration Overview

While the project uses JavaScript, TypeScript is configured for optional type checking and enhanced IDE support. The configuration is in `src/backend/tsconfig.json` and provides type safety without compilation.

**Key Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2022",           // Match Node.js 18+ capabilities
    "module": "CommonJS",         // Node.js module system
    "lib": ["ES2022"],           // Available JavaScript features
    "allowJs": true,             // Allow JavaScript files
    "checkJs": false,            // Don't check JS files by default
    "noEmit": true,              // Type checking only, no compilation
    "strict": true,              // Enable all strict type checking
    "moduleResolution": "node",   // Node.js module resolution
    "esModuleInterop": true,     // Enable ES module interoperability
    "forceConsistentCasingInFileNames": true
  }
}
```

### 4.2 Type-Checking Benefits

#### 4.2.1 IDE Support

**Enhanced IntelliSense:**
- Autocomplete for Node.js APIs
- Parameter hints for Express methods
- Error detection before runtime
- Refactoring support

**Example Benefits:**
```javascript
// Without types - no autocomplete or error detection
const app = express();
app.get('/hello', (req, res) => {
  res.jason({ message: 'Hello' }); // Typo not caught
});

// With TypeScript definitions - IDE catches errors
const app = express();
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello' }); // IDE suggests correct method
});
```

#### 4.2.2 Type Definitions

**Installed Type Definitions:**
- `@types/node` - Node.js core APIs
- `@types/express` - Express.js framework
- `@types/jest` - Jest testing framework

```bash
# Install type definitions
npm install --save-dev @types/node @types/express @types/jest
```

### 4.3 Optional Type Annotations

#### 4.3.1 JSDoc Type Annotations

For enhanced documentation and type checking without TypeScript syntax:

```javascript
/**
 * Processes user data with validation and formatting
 * @param {Object} userData - The user data to process
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {number} userData.age - User's age
 * @param {Object} options - Processing options
 * @param {boolean} options.validateEmail - Whether to validate email
 * @returns {Object} Processed user data
 * @throws {AppError} When validation fails
 */
function processUserData(userData, options = {}) {
  const { name, email, age } = userData;
  const { validateEmail = true } = options;
  
  if (validateEmail && !isValidEmail(email)) {
    throw new AppError('Invalid email address', 400);
  }
  
  return {
    name: name.trim(),
    email: email.toLowerCase(),
    age,
    processed: true,
  };
}
```

#### 4.3.2 Express Route Type Safety

```javascript
/**
 * Hello world endpoint
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
async function helloHandler(req, res, next) {
  try {
    const message = 'Hello world';
    
    res.json({
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
```

### 4.4 Type-Checking Commands

#### 4.4.1 Running Type Checks

```bash
# Check all files
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/routes/hello.js

# Watch mode for continuous checking
npx tsc --noEmit --watch
```

#### 4.4.2 Type-Checking in CI/CD

```yaml
# In GitHub Actions workflow
- name: Run type checking
  run: npx tsc --noEmit
```

### 4.5 Compiler Options Explained

#### 4.5.1 Strict Type Checking

**`"strict": true`** enables:
- `noImplicitAny`: Variables must have explicit types
- `noImplicitReturns`: Functions must return on all code paths
- `noImplicitThis`: `this` must be explicitly typed
- `strictNullChecks`: Null and undefined are handled explicitly

#### 4.5.2 Module Resolution

**`"moduleResolution": "node"`** ensures:
- Node.js module resolution algorithm
- Proper handling of `node_modules`
- Support for `package.json` main field

#### 4.5.3 ES Module Interoperability

**`"esModuleInterop": true`** enables:
- Default imports from CommonJS modules
- Synthetic default imports
- Better compatibility between module systems

---

## 5. Best Practices and Code Quality

### 5.1 Modern JavaScript Patterns

#### 5.1.1 Async/Await Over Promises

**✅ Preferred Pattern:**
```javascript
// Modern async/await pattern
async function fetchUserData(userId) {
  try {
    const user = await database.getUser(userId);
    const profile = await database.getUserProfile(userId);
    
    return {
      ...user,
      profile,
    };
  } catch (error) {
    logger.error('Failed to fetch user data:', error);
    throw new AppError('User data unavailable', 503);
  }
}
```

**❌ Avoid Promise Chains:**
```javascript
// Avoid complex promise chains
function fetchUserData(userId) {
  return database.getUser(userId)
    .then(user => {
      return database.getUserProfile(userId)
        .then(profile => {
          return {
            ...user,
            profile,
          };
        });
    })
    .catch(error => {
      logger.error('Failed to fetch user data:', error);
      throw new AppError('User data unavailable', 503);
    });
}
```

#### 5.1.2 Destructuring and Spread Operators

**✅ Object Destructuring:**
```javascript
// Clean destructuring with defaults
function processUser({ name, email, age = 18 }) {
  return {
    displayName: name.toUpperCase(),
    email: email.toLowerCase(),
    isAdult: age >= 18,
  };
}

// Function parameters destructuring
function createUser({ name, email, ...additionalData }) {
  return {
    id: generateId(),
    name,
    email,
    ...additionalData,
    createdAt: new Date(),
  };
}
```

**✅ Array Destructuring:**
```javascript
// Clean array destructuring
const [first, second, ...rest] = items;
const [status, data] = await Promise.all([
  checkStatus(),
  fetchData(),
]);
```

#### 5.1.3 Template Literals

**✅ Template Literals for String Interpolation:**
```javascript
// Clean string interpolation
const logMessage = `User ${user.name} (${user.email}) logged in at ${new Date().toISOString()}`;

// Multi-line strings
const htmlResponse = `
  <div class="user-profile">
    <h1>Welcome, ${user.name}!</h1>
    <p>Email: ${user.email}</p>
  </div>
`;
```

### 5.2 Express 5.1.0 Specific Patterns

#### 5.2.1 Automatic Promise Rejection Handling

**✅ Leverage Express 5 Features:**
```javascript
// Express 5 automatically catches rejected promises
app.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  
  if (!user) {
    // This will be caught by error middleware
    throw new AppError('User not found', 404);
  }
  
  res.json(user);
});
```

#### 5.2.2 Secure Route Patterns

**✅ Use path-to-regexp 8.x Security Features:**
```javascript
// Secure route patterns (ReDoS protection)
app.get('/users/:id', validateUserId, async (req, res) => {
  // Use middleware for validation instead of complex regex
  const user = await userService.findById(req.params.id);
  res.json(user);
});

// Validation middleware
function validateUserId(req, res, next) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return next(new AppError('Invalid user ID format', 400));
  }
  next();
}
```

### 5.3 Error Handling Best Practices

#### 5.3.1 Custom Error Classes

**✅ Use AppError for Structured Errors:**
```javascript
// From utils/errorTypes.js
const { AppError } = require('./utils/errorTypes.js');

// Business logic errors
if (!user) {
  throw new AppError('User not found', 404, 'USER_NOT_FOUND');
}

// Validation errors
if (!isValidEmail(email)) {
  throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
}
```

#### 5.3.2 Comprehensive Error Handling

**✅ Middleware-Based Error Handling:**
```javascript
// In routes/hello.js
async function helloHandler(req, res, next) {
  try {
    const message = 'Hello world';
    
    res.json({
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Let error middleware handle it
    next(error);
  }
}
```

### 5.4 Code Organization and Structure

#### 5.4.1 Single Responsibility Principle

**✅ Focused Functions:**
```javascript
// Each function has a single responsibility
function validateUserData(userData) {
  const errors = [];
  
  if (!userData.name) errors.push('Name is required');
  if (!userData.email) errors.push('Email is required');
  if (!isValidEmail(userData.email)) errors.push('Invalid email format');
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

function formatUserData(userData) {
  return {
    name: userData.name.trim(),
    email: userData.email.toLowerCase(),
    displayName: userData.name.toUpperCase(),
  };
}

function processUser(userData) {
  const validation = validateUserData(userData);
  if (!validation.isValid) {
    throw new AppError('Invalid user data', 400, 'VALIDATION_ERROR', validation.errors);
  }
  
  return formatUserData(userData);
}
```

#### 5.4.2 Module Exports Organization

**✅ Clear Module Exports:**
```javascript
// utils/userHelpers.js
function validateUserData(userData) {
  // Implementation
}

function formatUserData(userData) {
  // Implementation
}

function processUser(userData) {
  // Implementation
}

// Export all functions
module.exports = {
  validateUserData,
  formatUserData,
  processUser,
};
```

### 5.5 Performance Considerations

#### 5.5.1 Efficient Promise Handling

**✅ Parallel Promise Execution:**
```javascript
// Execute promises in parallel when possible
async function getUserDashboard(userId) {
  const [user, profile, settings] = await Promise.all([
    userService.findById(userId),
    profileService.getProfile(userId),
    settingsService.getSettings(userId),
  ]);
  
  return {
    user,
    profile,
    settings,
  };
}
```

**❌ Avoid Sequential Execution:**
```javascript
// Avoid unnecessary sequential execution
async function getUserDashboard(userId) {
  const user = await userService.findById(userId);
  const profile = await profileService.getProfile(userId);
  const settings = await settingsService.getSettings(userId);
  
  return {
    user,
    profile,
    settings,
  };
}
```

#### 5.5.2 Memory Management

**✅ Proper Resource Management:**
```javascript
// Clean up resources properly
async function processLargeFile(filePath) {
  let fileHandle;
  
  try {
    fileHandle = await fs.open(filePath, 'r');
    const data = await fileHandle.readFile();
    return processData(data);
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}
```

### 5.6 Testing Best Practices

#### 5.6.1 Testable Code Structure

**✅ Dependency Injection:**
```javascript
// Testable function with dependency injection
function createUserService(database, logger) {
  return {
    async findById(id) {
      logger.debug('Finding user by ID:', id);
      return database.getUser(id);
    },
    
    async create(userData) {
      logger.info('Creating new user:', userData.email);
      return database.createUser(userData);
    },
  };
}

// Easy to test with mocks
const mockDatabase = { getUser: jest.fn(), createUser: jest.fn() };
const mockLogger = { debug: jest.fn(), info: jest.fn() };
const userService = createUserService(mockDatabase, mockLogger);
```

#### 5.6.2 Pure Functions

**✅ Pure Functions for Business Logic:**
```javascript
// Pure function - easy to test
function calculateUserAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  
  return age;
}

// Impure function - harder to test
function calculateCurrentUserAge(birthDate) {
  const today = new Date(); // Depends on current time
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  
  return age;
}
```

### 5.7 Documentation and Comments

#### 5.7.1 JSDoc Comments

**✅ Comprehensive Function Documentation:**
```javascript
/**
 * Processes user registration data with validation and formatting
 * 
 * @param {Object} userData - The user registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - User's password
 * @param {Object} options - Processing options
 * @param {boolean} options.sendWelcomeEmail - Whether to send welcome email
 * @param {boolean} options.validatePassword - Whether to validate password strength
 * @returns {Promise<Object>} Processed user object with generated ID
 * @throws {AppError} When validation fails or email is already registered
 * 
 * @example
 * const userData = {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   password: 'securePassword123'
 * };
 * 
 * const user = await processUserRegistration(userData, {
 *   sendWelcomeEmail: true,
 *   validatePassword: true
 * });
 */
async function processUserRegistration(userData, options = {}) {
  // Implementation
}
```

#### 5.7.2 Inline Comments

**✅ Explanatory Comments:**
```javascript
function processPayment(amount, currency) {
  // Convert to cents to avoid floating point precision issues
  const amountInCents = Math.round(amount * 100);
  
  // Validate minimum payment amount (50 cents)
  if (amountInCents < 50) {
    throw new AppError('Payment amount too small', 400);
  }
  
  // Use exponential backoff for payment processing
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await paymentGateway.process(amountInCents, currency);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}
```

---

## 6. How to Fix Linting and Formatting Errors

### 6.1 Common ESLint Error Resolution

#### 6.1.1 Unused Variables

**Error Message:**
```
'variableName' is defined but never used (no-unused-vars)
```

**Solutions:**
```javascript
// ❌ Problem
function processUser(user, settings) {
  const { name, email } = user;
  return { name }; // 'email' and 'settings' are unused
}

// ✅ Solution 1: Remove unused variables
function processUser(user) {
  const { name } = user;
  return { name };
}

// ✅ Solution 2: Use underscore prefix for intentionally unused
function processUser(user, _settings) {
  const { name, email: _email } = user;
  return { name };
}

// ✅ Solution 3: Use all variables
function processUser(user, settings) {
  const { name, email } = user;
  return { 
    name, 
    email: settings.normalizeEmail ? email.toLowerCase() : email 
  };
}
```

#### 6.1.2 Missing Imports

**Error Message:**
```
'express' is not defined (no-undef)
```

**Solutions:**
```javascript
// ❌ Problem
const app = express(); // express is not imported

// ✅ Solution
const express = require('express');
const app = express();
```

#### 6.1.3 Promise Handling Issues

**Error Message:**
```
Expected to return a value at the end of arrow function (consistent-return)
```

**Solutions:**
```javascript
// ❌ Problem
const processUsers = async (users) => {
  if (!users.length) {
    return; // Inconsistent return
  }
  
  return users.map(user => processUser(user));
};

// ✅ Solution
const processUsers = async (users) => {
  if (!users.length) {
    return []; // Consistent return type
  }
  
  return users.map(user => processUser(user));
};
```

### 6.2 Automatic Fixing

#### 6.2.1 ESLint Auto-Fix

```bash
# Fix all auto-fixable issues
npm run lint -- --fix

# Fix specific file
npx eslint src/routes/hello.js --fix

# Preview fixes without applying
npx eslint src/routes/hello.js --fix-dry-run
```

#### 6.2.2 Prettier Auto-Format

```bash
# Format all files
npm run format

# Format specific file
npx prettier --write src/routes/hello.js

# Check formatting without fixing
npx prettier --check src/
```

### 6.3 IDE Integration for Real-Time Fixing

#### 6.3.1 VS Code Setup

**Settings for auto-fixing:**
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": ["src/backend"]
}
```

#### 6.3.2 JetBrains IDEs Setup

1. **ESLint**: Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. **Prettier**: Preferences → Languages & Frameworks → JavaScript → Prettier
3. **Auto-fix**: Enable "Run eslint --fix on save"

### 6.4 Troubleshooting Common Issues

#### 6.4.1 ESLint Configuration Not Found

**Error:**
```
Cannot read config file: .eslintrc.js
```

**Solution:**
```bash
# Verify file exists
ls -la src/backend/.eslintrc.js

# Check file permissions
chmod 644 src/backend/.eslintrc.js

# Verify ESLint installation
npm ls eslint
```

#### 6.4.2 Prettier and ESLint Conflicts

**Error:**
```
Delete `⏎` (prettier/prettier)
```

**Solution:**
Ensure `prettier` is last in ESLint extends array:
```javascript
{
  "extends": [
    "eslint:recommended",
    "plugin:node/recommended",
    "prettier" // Must be last
  ]
}
```

#### 6.4.3 TypeScript Configuration Issues

**Error:**
```
Cannot find module 'typescript'
```

**Solution:**
```bash
# Install TypeScript
npm install --save-dev typescript

# Verify tsconfig.json exists
ls -la src/backend/tsconfig.json

# Run type checking
npx tsc --noEmit
```

### 6.5 Pre-commit Hooks

#### 6.5.1 Husky Setup

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky init
```

#### 6.5.2 Pre-commit Configuration

```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "src/**/*.js": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

### 6.6 CI/CD Integration

#### 6.6.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format -- --check
      - run: npx tsc --noEmit
```

---

## 7. References and Further Reading

### 7.1 Configuration Files Reference

**Project Configuration Files:**
- **`.eslintrc.js`**: Complete ESLint configuration with rules, plugins, and overrides
- **`.prettierrc`**: Prettier formatting rules and options
- **`tsconfig.json`**: TypeScript configuration for type checking
- **`package.json`**: Dependencies, scripts, and tool configurations

### 7.2 Tool Documentation

#### 7.2.1 ESLint Resources

**Official Documentation:**
- **ESLint User Guide**: https://eslint.org/docs/user-guide/
- **ESLint Rules**: https://eslint.org/docs/rules/
- **ESLint Configuration**: https://eslint.org/docs/user-guide/configuring/

**Plugin Documentation:**
- **eslint-plugin-node**: https://github.com/mysticatea/eslint-plugin-node
- **eslint-plugin-promise**: https://github.com/xjamundx/eslint-plugin-promise
- **eslint-plugin-import**: https://github.com/import-js/eslint-plugin-import

#### 7.2.2 Prettier Resources

**Official Documentation:**
- **Prettier Options**: https://prettier.io/docs/en/options.html
- **Prettier Configuration**: https://prettier.io/docs/en/configuration.html
- **Prettier CLI**: https://prettier.io/docs/en/cli.html

#### 7.2.3 TypeScript Resources

**Official Documentation:**
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **TSConfig Reference**: https://www.typescriptlang.org/tsconfig/
- **Type Definitions**: https://www.typescriptlang.org/dt/

### 7.3 Express.js and Node.js Best Practices

#### 7.3.1 Express.js Resources

**Official Documentation:**
- **Express 5.x Guide**: https://expressjs.com/en/guide/
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html
- **Express Error Handling**: https://expressjs.com/en/guide/error-handling.html

#### 7.3.2 Node.js Resources

**Official Documentation:**
- **Node.js Guides**: https://nodejs.org/en/docs/guides/
- **Node.js API Reference**: https://nodejs.org/api/
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

### 7.4 Testing and Quality Assurance

#### 7.4.1 Jest Resources

**Official Documentation:**
- **Jest Documentation**: https://jestjs.io/docs/
- **Jest Configuration**: https://jestjs.io/docs/configuration
- **Jest CLI**: https://jestjs.io/docs/cli

#### 7.4.2 SuperTest Resources

**Documentation:**
- **SuperTest GitHub**: https://github.com/ladjs/supertest
- **SuperTest API**: https://github.com/ladjs/supertest#api

### 7.5 Related Project Documentation

#### 7.5.1 Internal Documentation

**Project Documentation:**
- **`README.md`**: Project overview, setup instructions, and getting started guide
- **`docs/api.md`**: Complete API documentation with examples
- **`docs/testing.md`**: Comprehensive testing guide and best practices
- **`docs/troubleshooting.md`**: Common issues and solutions

#### 7.5.2 Architecture Documentation

**System Design:**
- **`docs/architecture.md`**: System architecture and component design
- **`docs/setup.md`**: Detailed setup and configuration instructions
- **`docs/deployment.md`**: Deployment strategies and production considerations

### 7.6 Learning Resources

#### 7.6.1 JavaScript and Node.js

**Books:**
- "Node.js Design Patterns" by Mario Casciaro
- "JavaScript: The Good Parts" by Douglas Crockford
- "Effective JavaScript" by David Herman

**Online Resources:**
- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **Node.js Learn**: https://nodejs.org/en/learn/
- **JavaScript.info**: https://javascript.info/

#### 7.6.2 Code Quality and Best Practices

**Resources:**
- **Clean Code**: Principles and practices for writing maintainable code
- **Airbnb JavaScript Style Guide**: https://github.com/airbnb/javascript
- **Google JavaScript Style Guide**: https://google.github.io/styleguide/jsguide.html

### 7.7 Community and Support

#### 7.7.1 Stack Overflow Tags

**Relevant Tags:**
- `node.js` - Node.js specific questions
- `express` - Express.js framework questions
- `eslint` - ESLint configuration and rules
- `prettier` - Code formatting questions
- `javascript` - General JavaScript questions

#### 7.7.2 GitHub Communities

**Repositories:**
- **Node.js**: https://github.com/nodejs/node
- **Express**: https://github.com/expressjs/express
- **ESLint**: https://github.com/eslint/eslint
- **Prettier**: https://github.com/prettier/prettier

### 7.8 Tools and IDE Extensions

#### 7.8.1 VS Code Extensions

**Recommended Extensions:**
- **ESLint**: Microsoft ESLint extension
- **Prettier**: Prettier Code Formatter
- **JavaScript (ES6) code snippets**: Useful code snippets
- **Node.js Modules Intellisense**: Auto-complete for Node.js modules

#### 7.8.2 Other IDEs

**WebStorm/IntelliJ:**
- Built-in ESLint and Prettier support
- Node.js debugging capabilities
- Advanced refactoring tools

**Sublime Text:**
- SublimeLinter-eslint plugin
- JsPrettier plugin
- Node.js build systems

---

## Quick Reference

### Command Summary

```bash
# Development workflow
npm run dev        # Start development server
npm run lint       # Run ESLint checks
npm run format     # Format code with Prettier
npm test          # Run test suite
npx tsc --noEmit   # Run type checking

# Auto-fixing
npm run lint -- --fix          # Fix ESLint issues
npm run format                  # Format all files
npx prettier --write file.js    # Format specific file

# Verification
npm run lint -- --verbose      # Detailed lint output
npm run format -- --check      # Check formatting
npm run test:coverage          # Run tests with coverage
```

### Style Quick Reference

```javascript
// Formatting preferences
const config = {
  quotes: 'single',           // Use single quotes
  semicolons: true,           // Always use semicolons
  indentation: 2,             // 2 spaces
  lineWidth: 100,             // Max 100 characters
  trailingCommas: 'es5',      // Trailing commas in objects/arrays
};

// Naming conventions
const variableName = 'camelCase';
const CONSTANT_NAME = 'UPPER_CASE';
const ClassName = 'PascalCase';
const functionName = 'camelCase';

// Import organization
const fs = require('node:fs');           // Node.js built-ins
const express = require('express');      // External packages
const { logger } = require('./utils');   // Internal modules
```

---

This comprehensive coding standards document ensures consistency, quality, and educational value across the Node.js tutorial backend project. Following these standards will result in maintainable, readable, and professional code that serves as an excellent learning resource for developers at all levels.

For questions or clarifications about these standards, please refer to the troubleshooting guide or reach out to the project maintainers.

**Document Version**: 1.0.0  
**Last Updated**: January 2024  
**Next Review**: April 2024