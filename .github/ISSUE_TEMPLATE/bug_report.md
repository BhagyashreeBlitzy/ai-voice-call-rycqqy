---
name: Bug Report
description: Report bugs and issues with the Node.js tutorial application
title: '[BUG] Brief description of the issue'
labels: ['bug', 'needs-triage', 'investigation-required']
assignees: []
body:
  - type: textarea
    id: bug-summary
    attributes:
      label: Bug Summary
      description: Provide a clear and concise description of the bug you encountered in the Node.js tutorial application.
      placeholder: 'Brief description of the bug. For example: "The /hello endpoint returns a 500 error instead of "Hello world" when accessed via GET request."'
      value: ''
    validations:
      required: true

  - type: checkboxes
    id: affected-component
    attributes:
      label: Affected Component
      description: Select which components of the tutorial application are affected by this bug (multiple selections allowed).
      options:
        - label: Hello Endpoint (/hello) - Main tutorial functionality
        - label: Health Check Endpoints (/health, /livez, /readyz) - Monitoring functionality
        - label: Express.js Framework Integration - Web framework issues
        - label: Node.js Runtime - JavaScript execution environment issues
        - label: HTTP Server - Basic server functionality
        - label: Testing Framework (Jest) - Unit and integration testing
        - label: HTTP Testing (Supertest) - API endpoint testing
        - label: Docker Configuration - Container deployment
        - label: CI/CD Pipeline - GitHub Actions workflows
        - label: Development Tools - ESLint, Prettier, Nodemon
        - label: Documentation - README, API docs, tutorials
        - label: Educational Content - Learning materials and examples
        - label: Security - Security headers, vulnerability issues
        - label: Infrastructure - Deployment, monitoring, configuration
    validations:
      required: true

  - type: dropdown
    id: severity-assessment
    attributes:
      label: Severity Assessment
      description: Assess the severity of this bug's impact on the tutorial application and learning experience.
      options:
        - Critical - Application doesn't start or core functionality completely broken
        - High - Major feature broken, significant educational impact
        - Medium - Feature partially broken, moderate educational impact
        - Low - Minor issue, minimal educational impact
    validations:
      required: true

  - type: textarea
    id: reproduction-steps
    attributes:
      label: Steps to Reproduce
      description: Provide detailed step-by-step instructions to reproduce the bug. Be specific and include all necessary details.
      placeholder: |
        1. Clone the repository
        2. Run `npm install` to install dependencies
        3. Start the server with `npm start`
        4. Send a GET request to http://localhost:3000/hello
        5. Observe the error response instead of expected "Hello world"
      value: ''
    validations:
      required: true

  - type: textarea
    id: expected-behavior
    attributes:
      label: Expected Behavior
      description: Describe what you expected to happen based on the tutorial documentation or normal application behavior.
      placeholder: 'Based on the tutorial documentation, when sending a GET request to /hello, the server should respond with HTTP 200 status and plain text "Hello world" content.'
      value: ''
    validations:
      required: true

  - type: textarea
    id: actual-behavior
    attributes:
      label: Actual Behavior
      description: Describe what actually happened when you encountered the bug. Include error messages, status codes, and any unexpected responses.
      placeholder: 'The server responded with HTTP 500 Internal Server Error and the following error message in the console: [include actual error message here]'
      value: ''
    validations:
      required: true

  - type: textarea
    id: environment-details
    attributes:
      label: Environment Details
      description: Provide detailed information about your environment where the bug occurred.
      placeholder: |
        **Operating System:** [e.g., macOS 14.2, Ubuntu 22.04, Windows 11]
        **Node.js Version:** [run `node --version`]
        **NPM Version:** [run `npm --version`]
        **Express.js Version:** [from package.json - should be 5.1.0]
        **Browser (if applicable):** [e.g., Chrome 120.0, N/A for server-side issues]
        **Docker Version (if using containers):** [run `docker --version`]
        **Additional Environment Info:** [any other relevant details]
      value: |
        **Operating System:** 
        **Node.js Version:** 
        **NPM Version:** 
        **Express.js Version:** 
        **Browser (if applicable):** 
        **Docker Version (if using containers):** 
        **Additional Environment Info:** 
    validations:
      required: true

  - type: textarea
    id: educational-impact-assessment
    attributes:
      label: Educational Impact Assessment
      description: Describe how this bug affects the educational value and learning experience for students using this tutorial.
      placeholder: |
        **Learning Objectives Affected:**
        - Understanding HTTP request/response cycle is impacted
        - Students cannot complete the basic "Hello world" example
        - Express.js framework concepts are not properly demonstrated

        **Student Experience Impact:**
        - Beginners may get discouraged by unexpected errors
        - Tutorial progression is blocked at step X
        - Confusion about expected vs actual behavior
      value: |
        **Learning Objectives Affected:**
        - 
        - 
        - 

        **Student Experience Impact:**
        - 
        - 
        - 
    validations:
      required: true

  - type: textarea
    id: error-logs-and-output
    attributes:
      label: Error Logs and Console Output
      description: Include relevant error messages, stack traces, console output, and any other diagnostic information.
      placeholder: |
        ```
        [Paste error messages, stack traces, or console output here]
        ```

        **Server Logs:**
        [Include server startup logs and error messages]

        **Browser Console (if applicable):**
        [Include any client-side error messages]

        **Test Output (if running tests):**
        [Include Jest test failures or error messages]
      value: |
        ```
        [Paste error messages, stack traces, or console output here]
        ```

        **Server Logs:**


        **Browser Console (if applicable):**


        **Test Output (if running tests):**

    validations:
      required: false

  - type: textarea
    id: screenshots-or-recordings
    attributes:
      label: Screenshots or Screen Recordings
      description: If applicable, add screenshots or screen recordings to help explain the problem. Drag and drop images directly into this text area.
      placeholder: |
        **Screenshots:**
        [Drag and drop images here or use the attachment feature]

        **Screen Recordings:**
        [Links to screen recordings or animated GIFs showing the issue]

        **Browser Developer Tools:**
        [Screenshots of Network tab, Console errors, etc.]
      value: |
        **Screenshots:**


        **Screen Recordings:**


        **Browser Developer Tools:**

    validations:
      required: false

  - type: textarea
    id: workaround-or-temporary-fix
    attributes:
      label: Workaround or Temporary Fix
      description: If you found a workaround or temporary fix for this issue, please describe it here. This can help other learners while a permanent fix is developed.
      placeholder: |
        **Temporary Workaround:**
        [Describe any steps that temporarily resolve the issue]

        **Alternative Approach:**
        [Any alternative methods that achieve the intended learning objectives]

        **Configuration Changes:**
        [Any configuration modifications that help avoid the issue]
      value: |
        **Temporary Workaround:**


        **Alternative Approach:**


        **Configuration Changes:**

    validations:
      required: false

  - type: textarea
    id: related-documentation
    attributes:
      label: Related Documentation and References
      description: Reference any documentation, tutorials, or external resources related to this bug.
      placeholder: |
        **Tutorial Documentation:**
        [Links to specific sections of the tutorial affected]

        **Node.js Documentation:**
        [Links to relevant Node.js documentation]

        **Express.js Documentation:**
        [Links to relevant Express.js documentation]

        **Related Issues:**
        [Links to similar issues or related bug reports]

        **External Resources:**
        [Stack Overflow posts, articles, or other resources related to this issue]
      value: |
        **Tutorial Documentation:**


        **Node.js Documentation:**


        **Express.js Documentation:**


        **Related Issues:**


        **External Resources:**

    validations:
      required: false

  - type: textarea
    id: testing-performed
    attributes:
      label: Testing and Debugging Performed
      description: Describe any testing or debugging steps you've already performed to investigate this issue.
      placeholder: |
        **Manual Testing:**
        - [ ] Verified issue occurs consistently
        - [ ] Tested with different HTTP clients (curl, browser, Postman)
        - [ ] Checked server logs for error messages
        - [ ] Verified environment configuration

        **Automated Testing:**
        - [ ] Ran `npm test` to check test suite status
        - [ ] Ran `npm run lint` to check code quality
        - [ ] Checked CI/CD pipeline status

        **Debugging Steps:**
        - [ ] Added console.log statements for debugging
        - [ ] Used Node.js debugger or IDE debugging tools
        - [ ] Checked network traffic and HTTP headers
        - [ ] Verified Docker container functionality (if applicable)
      value: |
        **Manual Testing:**
        - [ ] Verified issue occurs consistently
        - [ ] Tested with different HTTP clients (curl, browser, Postman)
        - [ ] Checked server logs for error messages
        - [ ] Verified environment configuration

        **Automated Testing:**
        - [ ] Ran `npm test` to check test suite status
        - [ ] Ran `npm run lint` to check code quality
        - [ ] Checked CI/CD pipeline status

        **Debugging Steps:**
        - [ ] Added console.log statements for debugging
        - [ ] Used Node.js debugger or IDE debugging tools
        - [ ] Checked network traffic and HTTP headers
        - [ ] Verified Docker container functionality (if applicable)
    validations:
      required: false

  - type: textarea
    id: suggested-priority
    attributes:
      label: Suggested Priority and Timeline
      description: Based on your assessment, suggest the priority level and any timing considerations for fixing this bug.
      placeholder: |
        **Suggested Priority:** [High/Medium/Low]

        **Reasoning:**
        [Why you believe this priority level is appropriate]

        **Timeline Considerations:**
        - Critical for students currently using the tutorial
        - Blocks learning progression for beginners
        - Affects upcoming educational workshops or courses
        - Related to security or stability concerns

        **Impact on Community:**
        [How this affects the broader learning community]
      value: |
        **Suggested Priority:** 

        **Reasoning:**


        **Timeline Considerations:**
        - 
        - 
        - 
        - 

        **Impact on Community:**

    validations:
      required: false

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: Add any additional context, information, or details that might be helpful for understanding and resolving this bug.
      placeholder: |
        **First Time Occurrence:**
        [Is this the first time you've encountered this issue?]

        **Frequency:**
        [How often does this issue occur? Always/Sometimes/Rarely]

        **Similar Issues:**
        [Have you seen similar problems in other parts of the tutorial?]

        **Community Reports:**
        [Have other students reported similar issues?]

        **System-Specific Details:**
        [Any unique aspects of your development environment]

        **Educational Context:**
        [How this fits into the overall learning journey]
      value: |
        **First Time Occurrence:**


        **Frequency:**


        **Similar Issues:**


        **Community Reports:**


        **System-Specific Details:**


        **Educational Context:**

    validations:
      required: false

  - type: markdown
    attributes:
      value: |
        ---
        
        ### 📋 Bug Report Checklist
        
        Before submitting this bug report, please ensure you have:
        
        - [ ] **Verified the issue** by reproducing it consistently
        - [ ] **Checked existing issues** to avoid duplicate reports
        - [ ] **Included complete environment details** with specific version numbers
        - [ ] **Provided clear reproduction steps** that others can follow
        - [ ] **Assessed educational impact** on learning objectives and student experience
        - [ ] **Included relevant logs and error messages** to help with diagnosis
        - [ ] **Used descriptive title** with [BUG] prefix for easy identification
        
        ### 🔄 Automatic Assignment
        
        This bug report will be automatically assigned to appropriate team members based on the affected components you selected:
        
        - **Hello Endpoint / Express.js Framework**: @nodejs-tutorial-team/backend-developers
        - **Node.js Runtime / HTTP Server**: @nodejs-tutorial-team/backend-developers @nodejs-tutorial-team/platform-engineers  
        - **Testing Framework**: @nodejs-tutorial-team/qa-engineers @nodejs-tutorial-team/backend-developers
        - **Docker Configuration**: @nodejs-tutorial-team/devops-engineers @nodejs-tutorial-team/platform-engineers
        - **CI/CD Pipeline**: @nodejs-tutorial-team/devops-engineers @nodejs-tutorial-team/ci-cd-specialists
        - **Documentation / Educational Content**: @nodejs-tutorial-team/documentation-maintainers @nodejs-tutorial-team/technical-writers
        - **Security Issues**: @nodejs-tutorial-team/security-reviewers
        - **Infrastructure**: @nodejs-tutorial-team/devops-engineers @nodejs-tutorial-team/sre-engineers
        
        ### 📚 Educational Focus
        
        This tutorial application is designed for educational purposes to demonstrate Node.js and Express.js fundamentals. Your bug report helps:
        
        - **Maintain learning quality** by ensuring tutorial content works as documented
        - **Support student success** by removing barriers to learning progression
        - **Improve educational content** through community feedback and issue identification
        - **Demonstrate debugging practices** for other contributors and learners
        
        ### 🚀 Next Steps
        
        After submission, this bug report will:
        
        1. **Trigger automated triage** with labels: `bug`, `needs-triage`, `investigation-required`
        2. **Initiate CI/CD validation** to reproduce and test potential fixes
        3. **Assign team members** based on affected components and CODEOWNERS patterns
        4. **Create documentation tasks** if educational content is impacted
        5. **Generate community notifications** for high-priority educational issues
        
        Thank you for contributing to the Node.js tutorial and helping improve the learning experience for developers worldwide! 🙏