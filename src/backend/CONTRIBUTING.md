# Contributing to the Node.js Tutorial Backend

## Introduction

Thank you for your interest in contributing to the backend of the Node.js tutorial application! This project aims to provide a clear, modern, and educational example of Node.js and Express fundamentals. We welcome contributions that improve code quality, documentation, testing, and educational value.

This tutorial application serves as a comprehensive learning resource demonstrating core Node.js concepts with Express 5.1.0 framework, designed to help developers understand modern server-side JavaScript development patterns and best practices.

## Code of Conduct

All contributors are expected to adhere to the project's Code of Conduct. Please be respectful and constructive in all interactions. We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, experience level, or technical expertise.

## How to Contribute

We welcome contributions from developers of all skill levels. Here's how you can get started:

### Getting Started

1. **Fork the repository** and create a new branch for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write clear, concise, and well-documented code** following the project's coding standards
   - Follow the established directory structure (`src/backend/`)
   - Use meaningful variable and function names
   - Include comments for complex logic
   - Ensure code is readable and maintainable

3. **Add or update tests** to cover your changes. Ensure all tests pass locally
   ```bash
   npm test
   ```

4. **Update documentation** as needed (README, API docs, etc.)
   - Update README.md if your changes affect usage
   - Add inline code comments for educational clarity
   - Update API documentation if endpoints are modified

5. **Run linting and formatting tools** before submitting
   ```bash
   npm run lint
   npm run format
   ```

6. **Submit a pull request** with a clear description of your changes and reference any related issues
   - Use descriptive PR titles
   - Include a detailed description of changes
   - Reference any related issues using `#issue-number`
   - Add screenshots or examples if applicable

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Resolve identified issues or problems
- **Feature enhancements**: Improve existing functionality
- **Documentation improvements**: Enhance clarity and completeness
- **Test coverage**: Add or improve test cases
- **Performance optimizations**: Improve application performance
- **Security enhancements**: Address security concerns
- **Educational content**: Improve learning value and examples

## Coding Standards

### Technology Stack

- **Language**: JavaScript (Node.js, ES2022+)
- **Framework**: Express 5.1.0
- **Runtime**: Node.js 22.x LTS (minimum Node.js 18+)
- **Package Manager**: npm 11.4.2+

### Style Guide

Follow the project's `.eslintrc.js` and `.prettierrc` for linting and formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Naming Conventions

- **Variables and Functions**: Use descriptive names in camelCase
  ```javascript
  const serverPort = 3000;
  const handleHelloRequest = (req, res) => { ... };
  ```

- **Classes**: Use PascalCase for class names
  ```javascript
  class RequestHandler { ... }
  ```

- **Constants**: Use UPPER_SNAKE_CASE for constants
  ```javascript
  const DEFAULT_PORT = 3000;
  const MAX_RETRIES = 3;
  ```

### File Structure

Organize code according to the `src/backend` directory structure:

```
src/backend/
├── routes/          # Route handlers
├── middleware/      # Express middleware
├── utils/           # Utility functions
├── config/          # Configuration files
├── tests/           # Test files
├── app.js           # Main application file
└── server.js        # Server startup file
```

### Code Quality Standards

- **Error Handling**: Implement proper error handling with Express 5's automatic promise rejection handling
- **Security**: Follow security best practices including input validation and error information hiding
- **Performance**: Optimize for Node.js event loop efficiency
- **Documentation**: Include JSDoc comments for functions and classes
- **Testing**: Maintain 90%+ code coverage with meaningful tests

## Commit Messages

Use clear, descriptive commit messages following the Conventional Commits format:

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(routes): add hello endpoint with proper error handling

Add GET /hello route that returns "Hello world" response.
Implements Express 5.1.0 route handler with automatic
promise rejection handling.

Closes #123

fix(middleware): correct response text formatting

Update response text to match specification requirements.
Ensures consistent "Hello world" response format.

docs(readme): update installation instructions

Add Node.js 22.x LTS requirement and npm installation steps.
Include troubleshooting section for common setup issues.
```

## Testing Requirements

### Testing Framework

**Primary**: Jest for unit testing and integration testing
**HTTP Testing**: SuperTest for API endpoint testing

### Test Location

Place tests in `src/backend/tests/` following the structure of the codebase:

```
src/backend/tests/
├── routes/
│   └── hello.test.js
├── middleware/
│   └── errorHandler.test.js
├── utils/
│   └── helpers.test.js
└── integration/
    └── app.test.js
```

### Coverage Requirements

- **Target Coverage**: Strive for 90%+ code coverage
- **Mandatory Testing**: All new features and bugfixes must include appropriate tests
- **Test Types**: Unit tests, integration tests, and API endpoint tests

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- routes/hello.test.js
```

### Test Writing Guidelines

- **Test Structure**: Use descriptive test names and organize with `describe` and `it` blocks
- **Assertions**: Use Jest's built-in assertion methods
- **Mocking**: Use Jest mocking for external dependencies
- **HTTP Testing**: Use SuperTest for Express endpoint testing

Example test structure:
```javascript
describe('GET /hello', () => {
  it('should return "Hello world" with 200 status', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200);
    
    expect(response.text).toBe('Hello world');
  });
});
```

## Linting and Formatting

### Tools

- **ESLint**: Code linting and quality checks
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks

### Commands

```bash
# Check linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Requirements

- **All code must pass linting and formatting checks before review**
- **Pre-commit hooks**: Automatic linting and formatting on commit
- **CI/CD Integration**: Automated checks in GitHub Actions

### Configuration

The project uses:
- `.eslintrc.js` for ESLint configuration
- `.prettierrc` for Prettier configuration
- `.editorconfig` for editor settings

## Dependency Management

### Package Manager

**Primary**: npm (Node Package Manager)

### Adding Dependencies

```bash
# Production dependencies
npm install <package> --save

# Development dependencies
npm install <package> --save-dev
```

### Guidelines

- **Minimize Dependencies**: Avoid unnecessary dependencies
- **Version Management**: Use specific versions for production dependencies
- **Security**: Regular security audits and updates
- **Documentation**: Document why dependencies are needed

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit

# Fix security vulnerabilities
npm audit fix
```

### Lockfile Management

- **Commit `package-lock.json`** when dependencies are added or updated
- **Never commit `node_modules`** to version control
- **Use `npm ci`** for production builds

## Security Practices

### Vulnerability Checks

Always run security audits before submitting changes:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for high-severity vulnerabilities
npm audit --audit-level high
```

### Safe Coding Practices

- **No Secrets**: Do not commit secrets, credentials, or sensitive data
- **Environment Variables**: Use environment variables for configuration
- **Input Validation**: Validate all user inputs
- **Error Handling**: Implement proper error handling without information disclosure

### Security Configuration

```javascript
// Example secure configuration
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Never hardcode sensitive values
  secret: process.env.SECRET_KEY
};
```

### Review Requirements

- **Flag security issues** in your pull request description
- **Security testing**: Include security considerations in tests
- **Code review**: All changes undergo security review

## Issue Reporting

### Bug Reports

Use the GitHub issue template for bug reports. Include:

- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment details** (Node.js version, OS, etc.)
- **Error messages** or logs
- **Screenshots** if applicable

### Feature Requests

Use the feature request template and clearly describe:

- **Proposed feature** and its functionality
- **Educational value** and learning objectives
- **Use cases** and examples
- **Implementation suggestions** (if any)

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed

## Pull Request Process

### Submission Guidelines

1. **Open a pull request** against the `main` branch
2. **Fill out the PR template** completely
3. **Link related issues** using keywords (fixes #123, closes #456)
4. **Provide clear description** of changes and rationale

### Review Process

The PR will be reviewed by maintainers for:

- **Code clarity and maintainability**
- **Adherence to coding standards**
- **Adequate test coverage**
- **Documentation updates**
- **No security or dependency issues**

### Review Criteria

- ✅ Code follows project standards
- ✅ Tests pass and coverage is maintained
- ✅ Documentation is updated
- ✅ No security vulnerabilities
- ✅ Performance considerations addressed
- ✅ Educational value maintained

### Merge Policy

- **Only maintainers** may merge pull requests
- **All checks must pass** before merging
- **Squash merge** is preferred for feature branches
- **Merge commits** for important milestones

### Branch Protection

The `main` branch is protected with:
- Required status checks
- Required pull request reviews
- Dismiss stale reviews when new commits are pushed
- Require branches to be up to date before merging

## CI/CD Integration

### Continuous Integration

All pull requests are automatically tested via GitHub Actions:

**Workflow**: `.github/workflows/ci.yml`

The CI pipeline includes:
- **Node.js setup** (multiple versions: 18.x, 20.x, 22.x)
- **Dependency installation** with `npm ci`
- **Linting checks** with ESLint
- **Code formatting** verification with Prettier
- **Test execution** with Jest
- **Coverage reporting** with coverage thresholds
- **Security audit** with `npm audit`

### Security Analysis

**CodeQL Analysis**: `.github/workflows/codeql-analysis.yml`

Security analysis includes:
- **Static Application Security Testing (SAST)**
- **Vulnerability detection** in code
- **Dependency security scanning**
- **Security best practices validation**

### Status Checks

Required status checks for PR approval:
- ✅ Node.js CI (18.x, 20.x, 22.x)
- ✅ CodeQL Analysis
- ✅ Lint and Format Check
- ✅ Test Coverage (90%+ required)
- ✅ Security Audit

## Contact and Support

### Getting Help

For questions or support:

1. **GitHub Issues**: Create an issue for bugs or feature requests
2. **GitHub Discussions**: Use discussions for general questions
3. **Pull Request Comments**: Ask questions in PR comments
4. **Email**: Contact maintainers directly for sensitive issues

### Community Guidelines

- **Be respectful** and constructive in all interactions
- **Help others** learn and grow
- **Share knowledge** and best practices
- **Follow the code of conduct** at all times

### Maintainers

Current project maintainers:
- Review and merge pull requests
- Provide guidance on contributions
- Maintain project standards and direction
- Ensure educational value is preserved

## Educational Focus

### Learning Objectives

This project serves as an educational resource for:

- **Node.js Runtime Environment**: Understanding JavaScript execution outside the browser
- **Express Framework**: Web server creation and routing fundamentals
- **HTTP Protocol**: Request-response cycle mechanics
- **Asynchronous Programming**: Event-driven architecture patterns
- **Modern JavaScript**: ES2022+ features and best practices
- **Testing Strategies**: Unit testing and API testing with Jest and SuperTest
- **Security Practices**: Basic web application security concepts

### Contributing to Education

When contributing, consider:

- **Clarity**: Make code self-documenting and easy to understand
- **Comments**: Add educational comments explaining complex concepts
- **Examples**: Provide practical examples and use cases
- **Best Practices**: Demonstrate industry-standard approaches
- **Progression**: Maintain appropriate learning curve

## Resources

### Documentation

- [Node.js Official Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Jest Testing Framework](https://jestjs.io/)
- [SuperTest HTTP Testing](https://github.com/visionmedia/supertest)

### Learning Resources

- [MDN Web Docs - Server-side JavaScript](https://developer.mozilla.org/en-US/docs/Learn/Server-side)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Development Tools

- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js Extensions](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-node-azure-pack)
- [ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

Thank you for contributing to the Node.js tutorial backend! Your contributions help make this project a valuable learning resource for developers worldwide. Together, we can build a comprehensive, well-documented, and educational example of modern Node.js development.

For any questions or concerns, please don't hesitate to reach out through GitHub Issues or Discussions. Happy coding! 🚀