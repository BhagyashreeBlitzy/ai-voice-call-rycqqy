# Contributing to Node.js Tutorial Application

Thank you for your interest in contributing to the Node.js tutorial application! This project is designed as an educational resource to help developers learn Node.js and Express fundamentals. We welcome contributions from everyone, especially beginners.

## Table of Contents

- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Code Style and Standards](#code-style-and-standards)
- [Testing Requirements](#testing-requirements)
- [Issue and Pull Request Process](#issue-and-pull-request-process)
- [Community and Code of Conduct](#community-and-code-of-conduct)
- [Security and Responsible Disclosure](#security-and-responsible-disclosure)
- [Resources](#resources)
- [Acknowledgements](#acknowledgements)

## Getting Started

This Node.js tutorial application demonstrates fundamental concepts of server-side JavaScript development using modern web technologies. The application leverages Node.js 22.x LTS and Express.js 5.1.0 to create a simple HTTP server with a single `/hello` endpoint that returns "Hello world" to HTTP clients.

### Prerequisites

Before contributing, ensure you have the following installed:

- **Node.js**: Version 22.x LTS (recommended) or Node.js 18+ (minimum required)
- **npm**: Version 11.4.2 or later (comes bundled with Node.js)
- **Git**: For version control

### Quick Setup

1. **Fork and Clone**: Fork the repository and clone your fork locally
2. **Install Dependencies**: Run `npm install` to install project dependencies
3. **Start Development Server**: Run `npm start` to start the application
4. **Verify Setup**: Visit `http://localhost:3000/hello` to see "Hello world"

## How to Contribute

We follow a standard Git workflow to ensure code quality and maintain project consistency:

### 1. Fork the Repository
Fork the repository and clone your fork locally:
```bash
git clone https://github.com/your-username/nodejs-tutorial-app.git
cd nodejs-tutorial-app
```

### 2. Create a Feature Branch
Create a new branch for your feature or bugfix using a descriptive name:
```bash
git checkout -b fix-hello-endpoint
# or
git checkout -b feature-add-health-check
```

### 3. Make Your Changes
Make your changes following the coding standards outlined in [docs/development/coding-standards.md](docs/development/coding-standards.md).

### 4. Write or Update Tests
Write or update tests as appropriate (see [docs/development/testing.md](docs/development/testing.md)).

### 5. Run Tests Locally
Ensure all tests pass before submitting:
```bash
npm test
```

### 6. Commit Your Changes
Commit your changes with clear, descriptive commit messages:
```bash
git add .
git commit -m "fix: correct hello endpoint response format"
```

### 7. Push and Create Pull Request
Push your branch to your fork and open a pull request (PR) against the main repository:
```bash
git push origin fix-hello-endpoint
```

### 8. Fill Out PR Template
Fill out the PR template, describing your changes and referencing any related issues.

## Code Style and Standards

We maintain consistent code quality through established coding standards. Please refer to [docs/development/coding-standards.md](docs/development/coding-standards.md) for complete details.

### Key Guidelines

- **Consistent Formatting**: Use consistent indentation and formatting (see `.eslintrc.js` and `.prettierrc`)
- **Clear Code**: Write clear, self-documenting code with comments where necessary
- **Naming Conventions**: Follow established naming conventions for files, variables, and functions
- **Minimal Dependencies**: Avoid introducing unnecessary dependencies

### Express.js 5.1.0 Specific Considerations

Our application uses Express.js 5.1.0, which includes important updates:

- **Security Enhancements**: Includes ReDoS attack prevention and CVE-2024-45590 mitigation
- **Promise Handling**: Automatic forwarding of rejected promises to error-handling middleware
- **Route Security**: Uses path-to-regexp 8.x for enhanced route pattern security
- **Node.js Compatibility**: Requires Node.js 18+ (Node.js 22.x LTS recommended)

### Code Quality Checklist

Before submitting your contribution, ensure:

- [ ] Code follows project formatting standards
- [ ] Functions and classes are properly documented
- [ ] Variable and function names are descriptive
- [ ] Error handling is implemented appropriately
- [ ] Security best practices are followed
- [ ] No unnecessary dependencies are introduced

## Testing Requirements

Testing is essential for maintaining code quality and ensuring the application works as expected. Please refer to [docs/development/testing.md](docs/development/testing.md) for complete testing guidelines.

### Testing Framework

We use **Jest** and **SuperTest** for testing:

- **Jest**: JavaScript testing framework with focus on simplicity
- **SuperTest**: HTTP testing library for Express applications

### Testing Requirements

- **New Features**: All new features must include appropriate tests
- **Bug Fixes**: All bug fixes must include tests to prevent regression
- **Test Coverage**: Test coverage should not decrease
- **Test Quality**: Tests should be clear, maintainable, and reliable

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode (development)
npm test -- --watch
```

### Test Categories

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test HTTP endpoints and request/response cycles
- **Error Handling Tests**: Test error scenarios and edge cases

### Example Test Structure

```javascript
// Basic endpoint test example
describe('GET /hello', () => {
  it('should return "Hello world"', async () => {
    const response = await request(app)
      .get('/hello')
      .expect(200)
      .expect('Content-Type', /text\/plain/);
    
    expect(response.text).toBe('Hello world');
  });
});
```

## Issue and Pull Request Process

We use structured processes to ensure effective collaboration and maintain code quality.

### Issue Reporting

When reporting issues, please:

- **Use Issue Templates**: Use the provided issue templates for bug reports and feature requests
- **Provide Clear Information**: Include clear steps to reproduce bugs, expected vs. actual behavior
- **Include Context**: Provide relevant logs, screenshots, or environment details
- **Be Specific**: Use descriptive titles and detailed descriptions

### Pull Request Guidelines

#### Before Submitting

- [ ] Reference related issues in your PR description (e.g., 'Closes #123')
- [ ] Describe the motivation and context for your changes
- [ ] Ensure your branch is up to date with the main branch
- [ ] Verify all tests pass locally
- [ ] Review your own code for quality and completeness

#### PR Requirements

- **Descriptive Title**: Use clear, descriptive PR titles
- **Detailed Description**: Explain what changes were made and why
- **Issue References**: Link to related issues using keywords like "Closes #123"
- **Test Coverage**: Include tests for new features or bug fixes
- **Documentation**: Update documentation if necessary

#### Review Process

- **Responsive Communication**: Be responsive to review feedback
- **Address Comments**: Make requested changes promptly
- **Discuss Concerns**: Engage in constructive discussion about feedback
- **Maintain Quality**: Ensure changes maintain code quality standards

### PR Template Checklist

When submitting a PR, ensure you've completed:

- [ ] PR title clearly describes the changes
- [ ] PR description explains the motivation and context
- [ ] Related issues are referenced
- [ ] Tests are included and passing
- [ ] Documentation is updated if needed
- [ ] Code follows project standards
- [ ] Changes are ready for review

## Community and Code of Conduct

We are committed to maintaining a welcoming, inclusive, and safe environment for all contributors. Please refer to [SECURITY.md](SECURITY.md) for our community standards and security reporting guidelines.

### Community Guidelines

- **Be Respectful**: Treat all community members with respect and courtesy
- **Be Inclusive**: Welcome contributors from all backgrounds and experience levels
- **Be Constructive**: Provide helpful feedback and constructive criticism
- **Be Patient**: Remember that this is an educational project, and many contributors may be beginners

### Supporting New Contributors

As an educational project, we especially encourage:

- **Beginner-Friendly Issues**: Look for issues labeled "good first issue"
- **Mentorship**: Experienced contributors helping newcomers
- **Educational Value**: Prioritizing learning opportunities over complex solutions
- **Documentation**: Clear documentation and examples for new contributors

### Communication Standards

- **Professional Tone**: Maintain professional and courteous communication
- **Constructive Feedback**: Provide specific, actionable feedback
- **Positive Environment**: Foster a positive learning environment
- **Inclusive Language**: Use inclusive language in all communications

## Security and Responsible Disclosure

Security is important, even for educational projects. Please report security issues responsibly.

### Security Reporting

- **Private Disclosure**: Do not disclose security vulnerabilities in public issues or PRs
- **Responsible Reporting**: Report security issues privately as described in [SECURITY.md](SECURITY.md)
- **Coordination**: Work with maintainers to coordinate disclosure and fixes

### Security Considerations

While this is an educational application, we follow security best practices:

- **Express.js 5.1.0 Security**: Leverages built-in security enhancements
- **Dependency Management**: Regular security audits using `npm audit`
- **ReDoS Protection**: Uses path-to-regexp 8.x for route pattern security
- **Error Handling**: Proper error handling to prevent information disclosure

### Security Review Process

- **Code Review**: All contributions undergo security review
- **Dependency Updates**: Regular updates to maintain security patches
- **Vulnerability Response**: Prompt response to security vulnerability reports
- **Educational Security**: Teaching security best practices through code examples

## Resources

### Documentation

- [README.md](README.md) - Project overview and setup instructions
- [docs/development/coding-standards.md](docs/development/coding-standards.md) - Coding standards and style guide
- [docs/development/testing.md](docs/development/testing.md) - Testing guidelines and best practices
- [docs/operation/troubleshooting.md](docs/operation/troubleshooting.md) - Troubleshooting guide
- [SECURITY.md](SECURITY.md) - Security policy and reporting guidelines

### Learning Resources

- **Node.js Official Documentation**: https://nodejs.org/docs/
- **Express.js Documentation**: https://expressjs.com/
- **Jest Testing Framework**: https://jestjs.io/
- **SuperTest HTTP Testing**: https://github.com/visionmedia/supertest
- **npm Package Manager**: https://docs.npmjs.com/

### Development Tools

- **Node.js 22.x LTS**: https://nodejs.org/
- **npm**: Package manager (included with Node.js)
- **Git**: Version control system
- **Visual Studio Code**: Recommended editor with Node.js extensions

### Community Resources

- **GitHub Discussions**: Project discussions and Q&A
- **Issue Tracker**: Bug reports and feature requests
- **Pull Requests**: Code contributions and reviews

## Acknowledgements

We appreciate all contributions, large or small. Your feedback and suggestions help improve this educational resource for everyone.

### Types of Contributions

- **Code Contributions**: Bug fixes, feature additions, improvements
- **Documentation**: Updates, corrections, and enhancements
- **Testing**: Test improvements and coverage increases
- **Issue Reporting**: Bug reports and feature suggestions
- **Code Review**: Reviewing and providing feedback on pull requests
- **Community Support**: Helping other contributors and users

### Recognition

- **Contributors**: All contributors are recognized in project documentation
- **Learning Impact**: Your contributions help developers learn Node.js and Express
- **Educational Value**: Contributions enhance the educational value of the project
- **Community Building**: Help build a supportive learning community

### Long-term Impact

This project serves as a foundation for learning Node.js and Express.js fundamentals. Your contributions help:

- **Improve Learning Experience**: Make the tutorial more effective for beginners
- **Demonstrate Best Practices**: Show modern Node.js development patterns
- **Build Community**: Create a welcoming environment for new developers
- **Advance Education**: Contribute to the broader developer education ecosystem

---

Thank you for contributing to the Node.js tutorial application. Together, we're building a valuable educational resource that helps developers learn and grow in their Node.js journey.

For questions about contributing, please open an issue or refer to our community guidelines. Happy coding! 🚀