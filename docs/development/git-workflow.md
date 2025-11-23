# Git Workflow Guide

A comprehensive Git workflow guide for all contributors to the Node.js tutorial backend. This document provides step-by-step guidance on branching, committing, pull request management, code review, and integration with CI/CD pipelines. It ensures that all code changes are managed in a consistent, auditable, and collaborative manner while supporting educational clarity, rapid onboarding, and production-readiness.

## Table of Contents

1. [Clone and Setup](#1-clone-and-setup)
2. [Branching Strategy](#2-branching-strategy)
3. [Committing Changes](#3-committing-changes)
4. [Sync and Rebase](#4-sync-and-rebase)
5. [Pre-PR Checklist](#5-pre-pr-checklist)
6. [Pull Request Process](#6-pull-request-process)
7. [Code Review](#7-code-review)
8. [Merge and Cleanup](#8-merge-and-cleanup)
9. [Troubleshooting](#9-troubleshooting)
10. [References](#10-references)

## 1. Clone and Setup

### Step 1: Fork and Clone the Repository

```bash
# 1. Fork the repository on GitHub (click "Fork" button)
# 2. Clone your fork to your local machine
git clone https://github.com/YOUR_USERNAME/nodejs-tutorial-backend.git
cd nodejs-tutorial-backend/src/backend

# 3. Add the original repository as upstream
git remote add upstream https://github.com/ORIGINAL_OWNER/nodejs-tutorial-backend.git

# 4. Verify remotes are configured correctly
git remote -v
# Should show:
# origin    https://github.com/YOUR_USERNAME/nodejs-tutorial-backend.git (fetch)
# origin    https://github.com/YOUR_USERNAME/nodejs-tutorial-backend.git (push)
# upstream  https://github.com/ORIGINAL_OWNER/nodejs-tutorial-backend.git (fetch)
# upstream  https://github.com/ORIGINAL_OWNER/nodejs-tutorial-backend.git (push)
```

### Step 2: Environment Setup

Follow the comprehensive setup instructions from the [Getting Started Guide](getting-started.md):

```bash
# Verify Node.js version (v22.x LTS required)
node --version  # Should show v22.11.0 or higher

# Use correct Node.js version if using nvm
nvm use  # Uses version from .nvmrc file

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Verify setup by running the development server
npm run dev
```

**Prerequisites Reference**: See the [Clone and Install](getting-started.md#1-clone-and-install) section for detailed Node.js installation and environment setup instructions.

**Troubleshooting**: If you encounter issues, consult the [Troubleshooting](getting-started.md#8-troubleshooting) section in the Getting Started guide.

## 2. Branching Strategy

### Branch Naming Convention

All branches must follow the standardized naming convention:

```bash
# Feature branches (new functionality)
feature/short-description
feature/add-user-authentication
feature/implement-logging

# Bug fix branches (fixing issues)
bugfix/short-description
bugfix/fix-memory-leak
bugfix/correct-response-headers

# Chore branches (maintenance, refactoring, docs)
chore/short-description
chore/update-dependencies
chore/refactor-error-handling
```

### Creating a New Branch

**Always branch from the latest main branch:**

```bash
# 1. Ensure you're on main branch
git checkout main

# 2. Pull the latest changes from upstream
git pull upstream main

# 3. Create and switch to your new feature branch
git checkout -b feature/add-health-endpoint

# 4. Push the branch to your fork
git push -u origin feature/add-health-endpoint
```

### Branch Management Best Practices

- **Single Responsibility**: Each branch should address one specific feature, bug, or task
- **Descriptive Names**: Use clear, concise descriptions that explain the purpose
- **Regular Updates**: Keep branches up-to-date with main to avoid conflicts
- **Short-Lived**: Complete work quickly to minimize merge conflicts

## 3. Committing Changes

### Commit Message Format

Use clear, descriptive commit messages in imperative mood:

```bash
# Format: <type>: <subject>
# 
# <body> (optional)
# 
# <footer> (optional)

# Good examples:
git commit -m "feat: add health check endpoint with uptime metrics"
git commit -m "fix: resolve memory leak in request timeout handler"
git commit -m "docs: update API documentation for hello endpoint"
git commit -m "test: add integration tests for error handling middleware"

# With body and issue reference:
git commit -m "feat: implement request logging middleware

Add comprehensive request logging with:
- Request method, URL, and IP address
- Response status and duration
- Error context for failed requests

Closes #123"
```

### Commit Types

| Type | Description | Examples |
|------|-------------|----------|
| `feat` | New features | Add endpoints, middleware, utilities |
| `fix` | Bug fixes | Resolve errors, memory leaks, security issues |
| `docs` | Documentation | Update README, API docs, comments |
| `test` | Testing | Add tests, improve coverage |
| `refactor` | Code refactoring | Restructure code without functionality changes |
| `chore` | Maintenance | Update dependencies, configuration |
| `security` | Security improvements | Fix vulnerabilities, enhance protection |

### Making Atomic Commits

Make small, focused commits that represent a single logical change:

```bash
# Stage specific files for focused commits
git add controllers/helloController.js
git commit -m "feat: add hello controller with error handling"

git add routes/hello.js
git commit -m "feat: add hello route with validation middleware"

git add __tests__/unit/controllers/helloController.test.js
git commit -m "test: add unit tests for hello controller"

# Or stage and commit in one step
git commit -am "fix: correct response content-type header"
```

### Linking Issues

Reference related issues using GitHub keywords:

```bash
# Closing issues
git commit -m "fix: resolve port binding issue

Fixes #42"

# Referencing issues
git commit -m "feat: add input validation middleware

Related to #38, addresses security requirements"
```

## 4. Sync and Rebase

### Keeping Your Branch Up-to-Date

Regularly sync your feature branch with the latest main branch to avoid conflicts:

```bash
# 1. Fetch latest changes from upstream
git fetch upstream

# 2. Switch to main and update
git checkout main
git pull upstream main

# 3. Switch back to your feature branch
git checkout feature/your-branch-name

# 4. Rebase your changes onto the latest main
git rebase main

# 5. If conflicts occur, resolve them and continue
# Edit conflicted files, then:
git add .
git rebase --continue

# 6. Force-push your updated branch (required after rebase)
git push --force-with-lease origin feature/your-branch-name
```

### Handling Merge Conflicts

When conflicts occur during rebase:

```bash
# 1. View conflicted files
git status

# 2. Edit each conflicted file to resolve conflicts
# Look for conflict markers: <<<<<<<, =======, >>>>>>>
# Choose or merge the appropriate code

# 3. Stage resolved files
git add resolved-file.js

# 4. Continue the rebase
git rebase --continue

# 5. If you need to abort the rebase
git rebase --abort
```

### Interactive Rebase for Clean History

Clean up your commit history before submitting a pull request:

```bash
# Interactive rebase to squash/edit commits
git rebase -i HEAD~3  # Last 3 commits

# In the interactive editor:
# pick = use this commit
# squash = combine with previous commit
# edit = modify commit message
# drop = remove commit
```

## 5. Pre-PR Checklist

Before opening a pull request, ensure all quality gates are met:

### Code Quality Requirements

Run all quality checks locally to match CI pipeline requirements:

```bash
# 1. Lint code (must pass with zero errors)
npm run lint

# 2. Format code
npm run format

# 3. Run complete test suite with coverage
npm test

# 4. Check security vulnerabilities
npm audit

# 5. Verify Docker build (if applicable)
docker build -t nodejs-tutorial-backend .
```

### Code Standards Compliance

Verify your code follows the [Coding Standards](coding-standards.md):

- **ESLint Rules**: Code passes all linting rules without errors
- **Prettier Formatting**: Code is properly formatted
- **JSDoc Documentation**: All exported functions include complete documentation
- **Error Handling**: Uses centralized error utilities from `utils/errors.js`
- **Logging**: Uses centralized logger from `utils/logger.js`
- **Testing**: Maintains required coverage thresholds (90% lines, 100% functions, 80% branches)

### Testing Requirements

Ensure comprehensive testing coverage:

```bash
# Run tests with coverage report
npm run test:coverage

# Coverage thresholds (must meet all):
# - Lines: 90%
# - Functions: 100%
# - Branches: 80%
# - Statements: 90%

# Run specific test suites
npm run test:unit
npm run test:integration
```

**Reference**: See the [Code Quality and Testing](getting-started.md#7-code-quality-and-testing) section for detailed testing requirements.

### Documentation Updates

Update relevant documentation:

- **Code Comments**: Add JSDoc comments for new functions
- **API Documentation**: Update if adding/modifying endpoints
- **README**: Update if changing setup or usage instructions
- **Environment Variables**: Update `.env.example` if adding new configuration

## 6. Pull Request Process

### Creating a Pull Request

1. **Push your completed branch**:
   ```bash
   git push origin feature/your-branch-name
   ```

2. **Open pull request on GitHub**:
   - Navigate to your fork on GitHub
   - Click "Compare & pull request" or go to "Pull requests" → "New pull request"
   - Select base repository and branch (original repo's `main`)
   - Select compare repository and branch (your fork's feature branch)

3. **Use the PR template**: Complete all sections of the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md):
   - **PR Summary**: Clear description of changes
   - **Related Issues**: Link issues using keywords (Closes #, Fixes #)
   - **Pull Request Checklist**: Complete all required checkboxes
   - **Testing Performed**: Document manual and automated testing
   - **Documentation Updates**: List any documentation changes

### Required CI/CD Checks

All pull requests must pass the automated CI pipeline defined in [ci.yml](.github/workflows/ci.yml):

| Check | Description | Requirement |
|-------|-------------|-------------|
| **Tests** | Jest unit and integration tests | 100% pass rate |
| **Lint** | ESLint code quality checks | Zero errors |
| **Coverage** | Code coverage thresholds | 90%+ lines, 100% functions, 80%+ branches |
| **Security** | npm audit vulnerability scan | No high/critical vulnerabilities |
| **Docker** | Container build validation | Successful build and health check |

### Issue Linking

Use GitHub keywords to link pull requests to issues:

```markdown
<!-- In PR description -->
## Related Issues

- Closes #45
- Fixes #67
- Related to #89
```

**Issue Templates**: Reference appropriate issue templates:
- [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) for bug fixes
- [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) for new features

### Contributing Guidelines

Follow the project's [Contributing](README.md#contribution-and-support) guidelines:
- Follow coding standards and best practices
- Write comprehensive tests for new functionality
- Maintain backward compatibility unless explicitly breaking
- Provide clear documentation for changes

## 7. Code Review

### Review Process

All pull requests require code review before merging:

1. **Automated Checks**: CI pipeline must pass all quality gates
2. **Peer Review**: At least one approved review from a project maintainer
3. **Review Checklist**: Reviewers verify compliance with [Review Checklist](coding-standards.md#6-code-review-checklist)
4. **Final Approval**: Maintainer approval with merge authorization

### Reviewer Responsibilities

Code reviewers should verify:

- **Code Quality**: Follows project coding standards and patterns
- **Test Coverage**: Adequate test coverage for new functionality
- **Security**: No security vulnerabilities or information disclosure
- **Documentation**: Complete and accurate documentation
- **Educational Value**: Aligns with tutorial objectives and clarity

### Addressing Review Feedback

When reviewers request changes:

```bash
# 1. Make the requested changes
# Edit files based on feedback

# 2. Commit changes with descriptive messages
git add .
git commit -m "fix: address review feedback - improve error handling"

# 3. Push updates to your PR branch
git push origin feature/your-branch-name

# 4. Respond to review comments
# Reply to specific comments on GitHub explaining your changes
```

### Coding Standards Verification

Reviewers must verify compliance with [Coding Standards](coding-standards.md):
- **ESLint Configuration**: Code follows `.eslintrc.js` rules
- **Prettier Formatting**: Code follows `.prettierrc` formatting
- **JSDoc Documentation**: Functions include complete JSDoc comments
- **Error Handling**: Uses standardized error utilities
- **Testing Standards**: Tests follow Jest configuration and patterns

## 8. Merge and Cleanup

### Merge Strategy

The project uses **squash and merge** as the preferred strategy:

1. **Review Complete**: All CI checks pass and review approved
2. **Squash and Merge**: Combines all commits into a single commit
3. **Merge Message**: Use descriptive message following commit conventions
4. **Branch Deletion**: Feature branch is automatically deleted after merge

### Post-Merge Cleanup

After your pull request is merged:

```bash
# 1. Switch to main branch
git checkout main

# 2. Pull the latest changes including your merged code
git pull upstream main

# 3. Update your fork's main branch
git push origin main

# 4. Delete the merged feature branch locally
git branch -d feature/your-branch-name

# 5. Delete the remote branch (if not auto-deleted)
git push origin --delete feature/your-branch-name

# 6. Clean up any stale tracking branches
git remote prune origin
```

### Sync Fork with Upstream

Keep your fork synchronized with the original repository:

```bash
# Fetch all branches from upstream
git fetch upstream

# Merge upstream main into your local main
git checkout main
git merge upstream/main

# Push updates to your fork
git push origin main
```

### Branch Housekeeping

Regular maintenance of your local repository:

```bash
# View all local branches
git branch -a

# Delete merged local branches
git branch --merged main | grep -v "main" | xargs -n 1 git branch -d

# Clean up remote tracking branches
git remote prune origin

# View branch status
git status
```

## 9. Troubleshooting

### Common Git Issues

#### Merge Conflicts During Rebase

**Problem**: Conflicts when rebasing feature branch onto main

**Solution**:
```bash
# 1. View conflicted files
git status

# 2. Edit files to resolve conflicts
# Remove conflict markers: <<<<<<<, =======, >>>>>>>

# 3. Stage resolved files
git add resolved-file.js

# 4. Continue rebase
git rebase --continue

# 5. Force-push updated branch
git push --force-with-lease origin feature/your-branch-name
```

#### CI Pipeline Failures

**Problem**: GitHub Actions checks failing

**Solutions**:

1. **Test Failures**:
   ```bash
   # Run tests locally
   npm test
   
   # Fix failing tests and commit
   git add .
   git commit -m "fix: resolve test failures"
   git push origin feature/your-branch-name
   ```

2. **Lint Errors**:
   ```bash
   # Check and fix linting issues
   npm run lint
   npm run lint:fix
   
   # Commit fixes
   git add .
   git commit -m "fix: resolve linting errors"
   git push origin feature/your-branch-name
   ```

3. **Coverage Threshold Issues**:
   ```bash
   # Check current coverage
   npm run test:coverage
   
   # Add tests to meet thresholds
   # Commit additional tests
   ```

#### Out-of-Date Branch

**Problem**: Feature branch behind main, preventing merge

**Solution**:
```bash
# Update and rebase branch
git fetch upstream
git checkout main
git pull upstream main
git checkout feature/your-branch-name
git rebase main
git push --force-with-lease origin feature/your-branch-name
```

#### Accidental Commits to Main

**Problem**: Made commits directly to main branch

**Solution**:
```bash
# 1. Create a new feature branch with your changes
git checkout -b feature/fix-accidental-commits

# 2. Reset main to upstream
git checkout main
git reset --hard upstream/main
git push --force-with-lease origin main

# 3. Continue work on feature branch
git checkout feature/fix-accidental-commits
```

### Development Environment Issues

For development environment troubleshooting, refer to:
- [Common Issues and Solutions](getting-started.md#8-troubleshooting)
- [Performance Issues](getting-started.md#troubleshooting)
- [Getting Additional Help](getting-started.md#troubleshooting)

### Git Configuration Issues

#### Configure Git Identity

```bash
# Set your Git identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

#### SSH Key Setup

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add key to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub account
cat ~/.ssh/id_ed25519.pub
# Copy output and add to GitHub SSH keys
```

## 10. References

### Project Documentation

- **[Getting Started Guide](getting-started.md)** - Complete setup and environment configuration
- **[Coding Standards](coding-standards.md)** - Code style, documentation, and testing requirements
- **[API Documentation](../backend/docs/api.md)** - Complete API reference with examples
- **[Project README](../../README.md)** - Project overview and contribution guidelines
- **[Backend README](../backend/README.md)** - Backend-specific setup and contribution information

### Templates and Workflows

- **[Pull Request Template](../../.github/PULL_REQUEST_TEMPLATE.md)** - Complete PR submission checklist
- **[Bug Report Template](../../.github/ISSUE_TEMPLATE/bug_report.md)** - Issue template for reporting bugs
- **[Feature Request Template](../../.github/ISSUE_TEMPLATE/feature_request.md)** - Issue template for requesting features

### CI/CD Pipeline

- **[CI Workflow](../../.github/workflows/ci.yml)** - Continuous integration and quality validation
- **[CD Workflow](../../.github/workflows/cd.yml)** - Continuous deployment and release automation
- **[Backend Node.js Workflow](../backend/.github/workflows/node.yml)** - Backend-specific CI pipeline

### Configuration Files

- **[ESLint Configuration](../backend/.eslintrc.js)** - Code linting rules and standards
- **[Prettier Configuration](../backend/.prettierrc)** - Code formatting standards
- **[Jest Configuration](../backend/jest.config.js)** - Testing framework configuration
- **[Environment Variables](../backend/.env.example)** - Configuration options and examples

### External Resources

- **[Git Documentation](https://git-scm.com/doc)** - Official Git documentation and tutorials
- **[GitHub Flow](https://guides.github.com/introduction/flow/)** - GitHub's recommended workflow
- **[Conventional Commits](https://www.conventionalcommits.org/)** - Commit message conventions
- **[Node.js v22.x LTS Documentation](https://nodejs.org/docs/)** - Runtime environment reference
- **[Express.js v5.1.0 Documentation](https://expressjs.com/)** - Web framework documentation

### Quality Assurance

- **[Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)** - Security guidelines
- **[Jest Testing Framework](https://jestjs.io/docs/getting-started)** - Testing framework reference
- **[ESLint Rules Reference](https://eslint.org/docs/rules/)** - Linting rules documentation

### Community and Support

- **[GitHub Issues](https://github.com/tutorial/nodejs-tutorial-backend/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/tutorial/nodejs-tutorial-backend/discussions)** - Community discussions
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/nodejs+express)** - Technical questions and answers

---

## Workflow Summary

1. **[Clone and Setup](#1-clone-and-setup)**: Fork, clone, and configure your development environment
2. **[Branch](#2-branching-strategy)**: Create feature branches with descriptive names following conventions
3. **[Commit](#3-committing-changes)**: Make atomic commits with clear, descriptive messages
4. **[Sync](#4-sync-and-rebase)**: Keep branches updated with main using rebase
5. **[Test](#5-pre-pr-checklist)**: Verify all quality gates pass locally
6. **[PR](#6-pull-request-process)**: Submit pull requests using the complete template
7. **[Review](#7-code-review)**: Participate in thorough code review process
8. **[Merge](#8-merge-and-cleanup)**: Complete merge and cleanup process
9. **[Troubleshoot](#9-troubleshooting)**: Resolve common issues and seek help when needed

This workflow ensures that all code changes maintain high quality, security, and educational value while providing a smooth collaborative development experience for all contributors.

**Happy coding! 🚀**