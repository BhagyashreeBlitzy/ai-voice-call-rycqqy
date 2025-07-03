---
name: Bug Report
about: Report a bug or defect in the Node.js tutorial application
title: '[BUG] '
labels: bug, needs-triage
assignees: ''
---

# Bug Report

Thank you for taking the time to report a bug in our Node.js tutorial application. This template helps us collect all the necessary information to understand, reproduce, and resolve the issue efficiently.

## 🐛 Bug Summary

**Provide a clear and concise description of the bug:**
<!-- Example: The /hello endpoint returns a 500 error instead of "Hello world" -->

**What component/feature is affected?**
- [ ] HTTP Server (Node.js/Express.js)
- [ ] Hello Endpoint (`/hello`)
- [ ] Error Handling
- [ ] Request Timeout
- [ ] Security Headers
- [ ] Request Logging
- [ ] Response Compression
- [ ] Graceful Shutdown
- [ ] Development Tools (nodemon, ESLint, etc.)
- [ ] Testing (Jest, Supertest)
- [ ] Documentation
- [ ] Container/Deployment
- [ ] Other (please specify): ___________

## 🔄 Steps to Reproduce

**Please provide detailed steps to reproduce the issue:**

1. **Environment Setup:**
   ```bash
   # Include relevant setup commands
   npm install
   npm run dev
   ```

2. **Reproduction Steps:**
   ```bash
   # Step 1: 
   curl http://localhost:3000/hello
   
   # Step 2:
   # Add additional commands or actions
   ```

3. **Additional Context:**
   <!-- Any specific conditions, timing, or sequence required -->

## ✅ Expected Behavior

**What should happen?**
<!-- Example: The /hello endpoint should return "Hello world" with HTTP 200 status -->

**Reference Documentation:**
- [ ] Behavior is documented in [README.md](../../../src/backend/README.md)
- [ ] Behavior is documented in [API Documentation](../../../src/backend/docs/api.md)
- [ ] Behavior follows Express.js v5.1.0 standards
- [ ] Behavior follows Node.js v22.x LTS patterns

## ❌ Actual Behavior

**What actually happens?**
<!-- Include specific error messages, incorrect responses, or unexpected behavior -->

**Error Messages (if any):**
```
Paste any error messages, stack traces, or console output here
```

**HTTP Response Details (if applicable):**
```
Status Code: 
Headers: 
Body: 
```

## 🔧 Environment Details

**Please provide your environment information:**

**Node.js Environment:**
- **Node.js Version:** `node --version` → 
- **npm Version:** `npm --version` → 
- **Express.js Version:** (check package.json) → 
- **Operating System:** (Windows 10, macOS Big Sur, Ubuntu 20.04, etc.) → 

**Project Setup:**
- **Installation Method:** 
  - [ ] Git clone + npm install
  - [ ] Docker container
  - [ ] Downloaded archive
- **Configuration:** 
  - [ ] Default configuration
  - [ ] Custom environment variables
  - [ ] Modified package.json scripts

**Development Environment:**
- **Code Editor:** (VS Code, WebStorm, vim, etc.) → 
- **Terminal:** (Command Prompt, PowerShell, zsh, bash, etc.) → 
- **Package Manager:** (npm, yarn, pnpm) → 

**Container Environment (if applicable):**
- **Docker Version:** `docker --version` → 
- **Docker Compose Version:** `docker-compose --version` → 
- **Container Runtime:** (Docker Desktop, Podman, etc.) → 

## 📄 Logs and Stack Traces

**Console Output:**
```
Paste relevant console output, server logs, or error messages here
```

**Stack Trace (if available):**
```
Paste full stack trace here
```

**Request/Response Logs:**
```
Paste any relevant HTTP request/response logs here
```

## 📷 Screenshots and Additional Context

**Screenshots (if applicable):**
<!-- Drag and drop screenshots here, or use the following format: -->
<!-- ![Screenshot Description](URL) -->

**Additional Files or Context:**
<!-- Any additional files, configuration, or context that might help -->

## 🔗 Related Issues and Documentation

**Related Issues:**
- **Similar Issues:** #(issue number) - Brief description
- **Possible Duplicates:** #(issue number) - Brief description

**Related Pull Requests:**
- **Recent Changes:** #(PR number) - Brief description

**Relevant Documentation:**
- [ ] I have read the [README.md](../../../src/backend/README.md)
- [ ] I have checked the [API Documentation](../../../src/backend/docs/api.md)
- [ ] I have reviewed the [Deployment Guide](../../../src/backend/docs/deployment.md)
- [ ] I have examined the [Testing Documentation](../../../src/backend/docs/testing.md)

## 🧪 Testing and Validation

**Have you tested this issue?**
- [ ] Issue occurs consistently (every time)
- [ ] Issue occurs intermittently (sometimes)
- [ ] Issue occurs only under specific conditions

**Testing Commands Used:**
```bash
# Include any test commands you ran
npm test
npm run test:integration
curl commands, etc.
```

**Test Results:**
```
Include any relevant test output or results
```

## 💡 Suggested Solution (Optional)

**Do you have ideas for fixing this issue?**
<!-- This is optional, but helpful if you have insights -->

**Potential Root Cause:**
<!-- Your analysis of what might be causing the issue -->

**Proposed Changes:**
<!-- Any specific code changes or configuration adjustments you suggest -->

## 📋 Checklist

**Before submitting, please confirm:**
- [ ] I have searched existing issues to avoid duplicates
- [ ] I have provided all required environment details
- [ ] I have included steps to reproduce the issue
- [ ] I have tested with the latest version of the application
- [ ] I have reviewed the project documentation
- [ ] I have included relevant logs and error messages
- [ ] I have tested with default configuration (no custom changes)

## 🆘 Priority and Impact

**How does this issue affect you?**
- [ ] **Critical** - Application won't start or crashes
- [ ] **High** - Core functionality is broken
- [ ] **Medium** - Feature works but has issues
- [ ] **Low** - Minor issue or cosmetic problem

**Impact on Learning/Usage:**
- [ ] Blocks completing the tutorial
- [ ] Prevents understanding key concepts
- [ ] Affects development workflow
- [ ] Documentation or example issue

---

### 📚 Additional Resources

For more information and support:
- **Project Documentation:** [README.md](../../../src/backend/README.md)
- **API Reference:** [docs/api.md](../../../src/backend/docs/api.md)
- **Deployment Guide:** [docs/deployment.md](../../../src/backend/docs/deployment.md)
- **Testing Guide:** [docs/testing.md](../../../src/backend/docs/testing.md)
- **Node.js Documentation:** [https://nodejs.org/docs/](https://nodejs.org/docs/)
- **Express.js Documentation:** [https://expressjs.com/](https://expressjs.com/)

**Thank you for helping improve the Node.js tutorial application!** 🙏

Your detailed bug report helps us maintain a high-quality educational resource for the Node.js community.