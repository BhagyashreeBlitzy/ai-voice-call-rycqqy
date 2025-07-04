---
name: Bug Report
about: Create a report to help us improve the Node.js tutorial application
title: "[BUG] "
labels: ["bug", "triage"]
assignees: []
---

<!-- 
Thank you for contributing to the Node.js tutorial application! 

This template helps maintainers quickly understand, reproduce, and resolve bugs in our educational Node.js and Express tutorial. Please fill out each section thoughtfully to ensure we can provide the best possible learning experience.

Before submitting, please check the troubleshooting guide and existing issues to avoid duplicates.
-->

## Describe the Bug

### What is the problem?
<!-- A clear and concise description of what the bug is. Include both the observed behavior and what you expected to happen. -->

**Current Behavior:**
<!-- Describe what actually happens when the bug occurs -->

**Expected Behavior:**
<!-- Describe what should happen instead -->

**Impact on Learning Experience:**
<!-- How does this bug affect your ability to learn Node.js and Express concepts? -->

## To Reproduce

### Steps to reproduce the behavior:
<!-- Please provide detailed steps to reproduce the issue. Include code snippets, commands, or configuration changes if applicable. -->

1. **Environment Setup:**
   <!-- Describe your development environment setup -->

2. **Application State:**
   <!-- Describe the state of the application when the bug occurs -->

3. **Actions Taken:**
   <!-- List the exact steps you performed -->
   - Step 1: 
   - Step 2: 
   - Step 3: 

4. **Error Occurrence:**
   <!-- Describe when and how the error manifests -->

### Code Example (if applicable)
```javascript
// Include any relevant code snippets that reproduce the issue
```

### Command Line Steps (if applicable)
```bash
# Include any terminal commands that reproduce the issue
```

## Expected Behavior

### What should happen instead?
<!-- A clear and concise description of what you expected to happen, including: -->

**Correct Application Behavior:**
<!-- How should the application behave in this scenario? -->

**Educational Objectives:**
<!-- What Node.js/Express concepts should this demonstrate? -->

**Expected Response:**
<!-- For HTTP endpoint issues, what should the response be? -->

## Screenshots or Logs

### Visual Evidence
<!-- If applicable, add screenshots to help explain your problem -->

### Console Output
```
<!-- Include any relevant console output, error messages, or logs -->
```

### Network Requests (if applicable)
```
<!-- For HTTP-related issues, include request/response details -->
```

### Browser Developer Tools (if applicable)
```
<!-- Include any relevant browser console errors or network information -->
```

## Environment Information

### Please complete the following information:

**System Environment:**
- **Operating System:** [e.g. Ubuntu 22.04, Windows 11, macOS 14.5]
- **Architecture:** [e.g. x64, arm64]
- **Shell/Terminal:** [e.g. bash, zsh, PowerShell, Command Prompt]

**Node.js Environment:**
- **Node.js Version:** [e.g. 22.12.0] <!-- Run `node --version` -->
- **npm Version:** [e.g. 11.4.2] <!-- Run `npm --version` -->
- **Express Version:** [e.g. 5.1.0] <!-- Check package.json or run `npm list express` -->

**Application Configuration:**
- **Server Port:** [e.g. 3000, 8080, or environment variable]
- **Environment Variables:** [e.g. NODE_ENV=development, PORT=3000]
- **Package Manager:** [e.g. npm, yarn, pnpm]

**Development Tools:**
- **Text Editor/IDE:** [e.g. VS Code, WebStorm, Atom]
- **Browser:** [e.g. Chrome 120, Firefox 118, Safari 17] <!-- If applicable -->
- **Testing Tools:** [e.g. Postman, curl, browser] <!-- If applicable -->

## Error Analysis

### Error Classification
<!-- Help us categorize the issue by checking relevant boxes -->

**Error Type:**
- [ ] **HTTP Server Error** - Server fails to start or accept connections
- [ ] **Route Handler Error** - Issues with the /hello endpoint or routing
- [ ] **Response Generation Error** - Incorrect response format, status codes, or content
- [ ] **Performance Issue** - Response times > 50ms or resource usage problems
- [ ] **Environment Setup Error** - Node.js, npm, or Express installation/configuration issues
- [ ] **Documentation Error** - Incorrect or missing information in tutorials or comments
- [ ] **Dependency Issue** - Problems with Express 5.1.0 or other npm packages
- [ ] **Cross-platform Issue** - Behavior differs between operating systems

**Error Severity:**
- [ ] **Critical** - Application crashes, server won't start, or security vulnerability
- [ ] **High** - Major functionality broken, learning objectives compromised
- [ ] **Medium** - Feature partially working, workaround available
- [ ] **Low** - Minor issue, cosmetic problem, or documentation improvement

**Reproducibility:**
- [ ] **Always** - Bug occurs every time with these steps
- [ ] **Often** - Bug occurs frequently but not always
- [ ] **Sometimes** - Bug occurs occasionally
- [ ] **Once** - Bug occurred only once so far

## Additional Context

### Troubleshooting Steps Already Tried
<!-- List what you've already attempted to resolve the issue -->

**Basic Troubleshooting:**
- [ ] Restarted the Node.js application
- [ ] Cleared npm cache (`npm cache clean --force`)
- [ ] Reinstalled dependencies (`rm -rf node_modules && npm install`)
- [ ] Checked for typos in code or configuration
- [ ] Verified Node.js and npm versions meet requirements

**Advanced Troubleshooting:**
- [ ] Tested with different Node.js versions
- [ ] Tested on different operating systems
- [ ] Checked for conflicting processes on the same port
- [ ] Reviewed server logs for additional error information
- [ ] Tested with minimal configuration/clean environment

### Related Issues or Changes
<!-- Any related issues, recent changes, or additional context -->

**Related Issues:**
<!-- Link to any related GitHub issues -->

**Recent Changes:**
<!-- Any recent modifications to code, configuration, or environment -->

**Additional Context:**
<!-- Any other context about the problem here -->

## Educational Context

### Learning Objectives Impact
<!-- How does this bug affect the educational value of the tutorial? -->

**Affected Learning Topics:**
- [ ] **HTTP Server Creation** - Understanding Node.js server fundamentals
- [ ] **Express Framework** - Learning Express.js basics and middleware
- [ ] **Request-Response Cycle** - Understanding HTTP communication
- [ ] **Error Handling** - Express 5 error handling patterns
- [ ] **Environment Configuration** - Server setup and configuration
- [ ] **API Development** - RESTful endpoint creation
- [ ] **Debugging Skills** - Troubleshooting Node.js applications

**Suggested Learning Impact:**
<!-- How should this bug fix contribute to the learning experience? -->

**Tutorial Section Affected:**
<!-- Which part of the tutorial is impacted by this bug? -->

## Success Criteria

### Definition of Bug Resolution
<!-- What would constitute a successful fix for this issue? -->

**Functional Requirements:**
- [ ] **Core Functionality Restored** - Application works as intended
- [ ] **Response Time Met** - GET /hello responds within 50ms
- [ ] **Cross-Platform Compatibility** - Works on Windows, macOS, and Linux
- [ ] **Express 5.1.0 Compliance** - Utilizes Express 5 features correctly
- [ ] **Error Handling** - Proper error responses for edge cases

**Educational Requirements:**
- [ ] **Learning Objectives Maintained** - Bug fix doesn't compromise educational value
- [ ] **Code Clarity** - Solution maintains readable, educational code
- [ ] **Documentation Updated** - Relevant documentation reflects any changes
- [ ] **Best Practices Demonstrated** - Fix showcases Node.js/Express best practices

**Technical Requirements:**
- [ ] **Performance Criteria** - Application meets performance thresholds
- [ ] **Memory Usage** - Memory consumption remains under 50MB baseline
- [ ] **Error Logging** - Appropriate error logging and handling
- [ ] **Security Compliance** - No security vulnerabilities introduced

## Community Guidelines

### Before Submitting
<!-- Please confirm you've followed our contribution guidelines -->

- [ ] **Troubleshooting Guide Checked** - Reviewed [troubleshooting documentation](../../docs/troubleshooting.md)
- [ ] **Duplicate Issues** - Searched existing issues to avoid duplicates
- [ ] **Security Issues** - For security vulnerabilities, followed [security policy](../../SECURITY.md)
- [ ] **Template Completion** - Filled out all relevant sections of this template

### For Maintainers
<!-- This section is for maintainer use during triage -->

**Triage Information:**
- **Priority:** <!-- High/Medium/Low -->
- **Assignee:** <!-- GitHub username -->
- **Milestone:** <!-- Version/release target -->
- **Labels:** <!-- Additional labels beyond bug/triage -->

**Resolution Tracking:**
- **Investigation Started:** <!-- Date -->
- **Root Cause Identified:** <!-- Date -->
- **Fix Implemented:** <!-- Date -->
- **Testing Completed:** <!-- Date -->

---

<!-- 
By submitting this bug report, you acknowledge that:
- This issue affects the Node.js tutorial application's educational objectives
- You've provided sufficient information for maintainers to investigate and reproduce
- You're willing to engage in constructive discussion about the resolution approach
- You understand this is an educational project focused on Node.js and Express fundamentals

Thank you for helping improve the Node.js tutorial application! 🚀

For urgent issues or questions, please check our troubleshooting guide or reach out to the maintainers.
-->