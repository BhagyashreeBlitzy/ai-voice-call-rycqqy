---
name: Pull Request
about: Comprehensive pull request template for collaborative development of the Node.js tutorial application
title: 'Pull Request: [Brief description of changes]'
labels: ['needs-review', 'pending-ci']
assignees: []
---

<!-- =============================================================================
GitHub Pull Request Template for Node.js Tutorial Application
=============================================================================
This template provides structured format for collaborative development contributions
including Express.js 5.1.0 functionality enhancements, educational content improvements,
testing additions, Docker deployment updates, and CI/CD pipeline modifications.

Designed to ensure comprehensive review coverage, maintain educational quality,
support automated testing workflows, and integrate with code ownership patterns
while facilitating knowledge sharing among contributors at various skill levels.

Compatible with:
- Node.js 22.11.0 LTS and Express.js 5.1.0
- GitHub Actions CI/CD pipeline with quality gates
- CODEOWNERS automated reviewer assignment
- Jest testing framework with 95% coverage threshold
- ESLint code quality enforcement and security scanning

Educational Focus: This template supports learning-oriented development practices
and ensures changes maintain tutorial clarity and educational progression.
============================================================================= -->

# 📋 Pull Request: [Brief description of changes]

> **🎓 Educational Context**: This pull request contributes to the Node.js tutorial application that demonstrates HTTP server fundamentals using Express.js 5.1.0. Please ensure changes maintain tutorial clarity while supporting contributors at various skill levels.

## 📝 Summary

<!-- Provide a clear and concise description of what this pull request accomplishes -->

**Brief Description:**
[Describe the changes and their purpose in 1-2 sentences]

**Problem Solved:**
[Explain what problem this PR solves or what feature it adds]

**Educational Value:**
[Describe how these changes improve the learning experience or tutorial quality]

**Related Issues:**
- Closes #[issue_number]
- Related to #[issue_number]

## 🔄 Type of Change

<!-- Select the type of change this pull request introduces (check all that apply) -->

**Primary Change Type:**
- [ ] **🐛 Bug fix** (non-breaking change that fixes an issue)
- [ ] **✨ New feature** (non-breaking change that adds functionality)
- [ ] **💥 Breaking change** (fix or feature that would cause existing functionality to not work as expected)
- [ ] **📚 Documentation update** (changes to README, API docs, or tutorials)
- [ ] **🎓 Educational content** (improvements to learning materials or examples)
- [ ] **🧪 Testing** (adding missing tests or correcting existing tests)
- [ ] **♻️ Refactoring** (code changes that neither fix bugs nor add features)
- [ ] **⚙️ Infrastructure** (CI/CD, Docker, deployment configuration changes)
- [ ] **🔒 Security** (security patches, vulnerability fixes, or security enhancements)
- [ ] **📦 Dependencies** (updating dependencies or package versions)

**Additional Classifications:**
- [ ] **🚀 Performance improvement** (optimizes application performance)
- [ ] **🎨 Code style/formatting** (changes that don't affect functionality)
- [ ] **🔧 Configuration change** (updates to config files or environment settings)
- [ ] **🌐 API change** (modifications to HTTP endpoints or responses)

## 💡 Motivation and Context

<!-- Explain the motivation for this change and provide context for reviewers -->

**Why is this change needed?**
[Provide detailed explanation of the motivation behind these changes]

**What problem does it solve?**
[Describe the specific issue being addressed]

**How does it improve the tutorial experience?**
[Explain improvements to the learning journey and educational value]

**Target audience considerations:**
[Mention skill level, learning objectives, or specific learner needs addressed]

**Node.js/Express.js best practices demonstrated:**
[Reference any patterns, practices, or concepts being taught]

## 🔍 Detailed Description

### 📦 Changes Made

<!-- List the specific changes made to the codebase -->

**Modified Files:**
- `src/backend/src/app.js`: [Brief description of changes]
- `src/backend/src/routes/hello.js`: [Brief description of changes]
- `src/backend/test/[test-file].test.js`: [Brief description of changes]
- `src/backend/package.json`: [Brief description of changes]

**New Files Added:**
- [List any new files and their purposes]

**Files Removed:**
- [List any files removed and justification]

**API Changes:**
- [Describe any changes to HTTP endpoints, request/response formats]

### 🛠️ Implementation Details

**Technical Approach:**
[Explain the technical approach taken and design decisions made]

**Node.js Patterns Used:**
[Describe specific Node.js patterns, features, or APIs utilized]

**Express.js 5.1.0 Features:**
[Mention any Express.js 5.1.0 specific features or improvements leveraged]

**Design Decisions:**
[Explain significant design choices and their rationale]

**Performance Considerations:**
[Describe any performance implications or optimizations]

**Security Considerations:**
[Mention security aspects addressed or security patterns implemented]

## 🧪 Testing

### ✅ Test Coverage

<!-- Describe the testing performed to validate these changes -->

**Unit Tests:**
- [ ] Unit tests added/updated for new functionality
- [ ] All new functions have corresponding unit tests
- [ ] Test coverage meets or exceeds 95% threshold
- [ ] Edge cases and error conditions covered

**Integration Tests:**
- [ ] Integration tests added/updated where appropriate
- [ ] End-to-end functionality validated
- [ ] HTTP endpoint testing with proper status codes
- [ ] Request/response validation implemented

**Test Framework Compliance:**
- [ ] Jest testing framework used correctly
- [ ] Supertest used for HTTP endpoint testing
- [ ] Test naming follows established conventions
- [ ] Test documentation includes purpose and scope

### 🔧 Manual Testing

**Testing Performed:**
[Describe manual testing steps taken to validate the changes]

```bash
# Example testing commands performed
npm install
npm start
curl http://localhost:3000/hello
# [Include actual testing steps performed]
```

**Testing Results:**
[Describe the results of manual testing]

**Edge Cases Tested:**
- [List specific edge cases and scenarios tested]

### 🌍 Testing Environment

**Environment Configuration:**
- [ ] Tested with Node.js 22.11.0 LTS
- [ ] Tested with Express.js 5.1.0
- [ ] Tested in Docker container environment
- [ ] Tested CI/CD pipeline execution locally
- [ ] Cross-platform compatibility verified (if applicable)

**Browser/Client Testing (if applicable):**
- [ ] Chrome/Chromium browser testing
- [ ] curl command-line testing  
- [ ] Postman/API client testing
- [ ] Mobile device testing (if relevant)

## 🔒 Security Considerations

<!-- Address any security implications of these changes -->

**Security Review Checklist:**
- [ ] No new security vulnerabilities introduced
- [ ] Dependencies scanned with `npm audit`
- [ ] Security best practices followed in implementation
- [ ] Input validation implemented where applicable
- [ ] Express.js 5.1.0 security features utilized appropriately
- [ ] No sensitive information exposed in code, logs, or responses
- [ ] HTTP security headers configured correctly
- [ ] Error handling doesn't leak sensitive information

**Dependency Security:**
[List any dependency updates and their security implications]

**Vulnerability Assessment:**
[Describe any security scanning performed and results]

**Security Patterns Implemented:**
[Mention specific security patterns or mitigations added]

**Compliance Considerations:**
[Address any compliance requirements or OWASP guideline adherence]

## 🎓 Educational Impact

<!-- Describe how these changes affect the tutorial's educational value -->

### 📚 Learning Objectives

**Concepts Demonstrated:**
[Describe the Node.js and Express.js concepts demonstrated by these changes]

**Skills Developed:**
[List the skills learners will develop through these changes]

**Learning Progression:**
[Explain how these changes fit into the overall learning journey]

**Difficulty Level:**
[Indicate the appropriate skill level: Beginner/Intermediate/Advanced]

**Prerequisites:**
[List any prerequisites learners should have before encountering these changes]

### 📖 Documentation Updates

**Documentation Changes:**
- [ ] README.md updated with relevant changes
- [ ] API documentation updated for new/modified endpoints
- [ ] Tutorial instructions updated if workflow changed
- [ ] Inline code comments added to complex sections
- [ ] Educational examples remain clear and accurate
- [ ] JSDoc comments added for functions and classes

**Learning Resources:**
- [ ] Code examples updated and verified
- [ ] Learning progression maintained
- [ ] Difficulty escalation appropriate
- [ ] Troubleshooting guides updated if needed

## ⚙️ Compatibility and Dependencies

<!-- Confirm compatibility and dependency management -->

**Runtime Compatibility:**
- [ ] Compatible with Node.js 22.11.0 LTS (minimum Node.js 18.x)
- [ ] Compatible with Express.js 5.1.0
- [ ] No breaking changes to existing API
- [ ] Backward compatibility maintained where possible
- [ ] Future compatibility considerations addressed

**Dependency Management:**
- [ ] Dependencies updated appropriately with security patches
- [ ] Package.json engines field accurate
- [ ] No conflicting dependency versions
- [ ] Development dependencies separated from production
- [ ] Package-lock.json updated and committed

**Infrastructure Compatibility:**
- [ ] Docker image builds successfully
- [ ] GitHub Actions CI/CD pipeline passes
- [ ] Container security scanning completed
- [ ] Multi-platform support verified (linux/amd64, linux/arm64)

### 📦 Dependency Changes

<!-- If applicable, list dependency updates with versions and justification -->

**Updated Dependencies:**
```json
{
  "dependency-name": "^new-version",
  "reason": "Security patch for CVE-XXXX-XXXX"
}
```

**New Dependencies:**
[List any new dependencies added, their purposes, and version justifications]

**Removed Dependencies:**
[List any dependencies removed and explanation for removal]

## ✅ Quality Assurance Checklist

<!-- Confirm that your pull request meets all requirements before submission -->

### 📋 General Requirements

**Code Quality:**
- [ ] I have read and followed the contributing guidelines
- [ ] My code follows the established coding standards (ESLint rules)
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] Variable and function names are descriptive and meaningful

**Testing Requirements:**
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Code coverage meets 95% threshold requirement
- [ ] All tests pass in the CI/CD pipeline
- [ ] Integration tests validate end-to-end functionality

### 🔍 Code Quality Standards

**Linting and Formatting:**
- [ ] Code passes ESLint with zero errors and warnings
- [ ] Code follows Prettier formatting standards
- [ ] No console.log statements left in production code
- [ ] Error handling is implemented appropriately
- [ ] HTTP status codes are used correctly

**Best Practices:**
- [ ] Functions and classes have appropriate JSDoc comments
- [ ] Code follows Node.js and Express.js best practices
- [ ] Modern JavaScript features used appropriately (ES2022+)
- [ ] Async/await patterns used correctly
- [ ] Proper error propagation and handling implemented

### 🧪 Testing Standards

**Test Quality:**
- [ ] Unit tests cover new functionality with 95%+ coverage
- [ ] Integration tests validate complete workflows
- [ ] HTTP endpoints tested with proper status codes and responses
- [ ] Error conditions and edge cases tested
- [ ] Test descriptions are clear and meaningful

**CI/CD Integration:**
- [ ] All GitHub Actions workflow jobs pass
- [ ] Security scanning completes without critical issues
- [ ] Docker image builds and runs correctly
- [ ] Quality gates pass all thresholds

### 📚 Documentation Standards

**Code Documentation:**
- [ ] README.md updated with relevant changes
- [ ] API documentation updated for endpoint changes
- [ ] Code comments explain complex logic and decisions
- [ ] JSDoc documentation complete for public interfaces

**Educational Documentation:**
- [ ] Educational examples updated if learning path changed
- [ ] Tutorial clarity maintained or improved
- [ ] Learning objectives clearly addressed
- [ ] CHANGELOG.md updated with notable changes

## 👥 Reviewer Guidance

<!-- Provide specific guidance for reviewers to focus their attention -->

### 🎯 Areas of Focus

**Critical Review Areas:**
[Highlight specific aspects requiring careful review attention]

**Complex Logic:**
[Point out areas with complex logic requiring thorough understanding]

**Educational Impact:**
[Identify educational aspects requiring specialized review]

**Security Considerations:**
[Highlight security-sensitive changes requiring security team attention]

### 🏷️ Automatic Team Assignment

Based on CODEOWNERS patterns, the following teams will be automatically assigned:

**For Backend Changes:**
- @nodejs-tutorial-team/backend-developers (automatic assignment)
- @nodejs-tutorial-team/senior-developers (for core app changes)

**For Security Changes:**
- @nodejs-tutorial-team/security-reviewers (for security-related modifications)

**For Infrastructure Changes:**
- @nodejs-tutorial-team/devops-engineers (for CI/CD and Docker changes)
- @nodejs-tutorial-team/platform-engineers (for configuration changes)

**For Documentation Changes:**
- @nodejs-tutorial-team/documentation-maintainers (for educational content)
- @nodejs-tutorial-team/technical-writers (for comprehensive doc updates)

**For Testing Changes:**
- @nodejs-tutorial-team/qa-engineers (for testing framework modifications)

### 🤝 Review Expectations

**Code Review Focus:**
- Functionality correctness and Node.js/Express.js best practices
- Educational value and tutorial clarity maintenance
- Security implications and vulnerability assessment
- Performance impact and scalability considerations

**Educational Review Focus:**
- Learning objective alignment and skill level appropriateness
- Tutorial progression and difficulty escalation
- Code example clarity and educational value
- Documentation accuracy and completeness

## 🔗 Related Issues and References

<!-- Link to related issues, feature requests, or external resources -->

### 📋 Issue Resolution

**Closes Issues:**
- Closes #[issue_number] - [Brief description of resolved issue]
- Fixes #[issue_number] - [Brief description of bug fix]
- Resolves #[issue_number] - [Brief description of feature implementation]

**Related Issues:**
- Related to #[issue_number] - [Brief description of relationship]
- Depends on #[issue_number] - [Brief description of dependency]
- Blocks #[issue_number] - [Brief description of blocking relationship]

### 📖 External References

**Node.js Documentation:**
- [Node.js API Documentation](https://nodejs.org/api/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

**Express.js 5.1.0 Resources:**
- [Express.js 5.1.0 Release Notes](https://expressjs.com/en/changelog/5x.html#5.1.0)
- [Express.js Migration Guide](https://expressjs.com/en/guide/migrating-5.html)

**Educational Resources:**
[Link to relevant educational materials, tutorials, or learning resources]

**Security References:**
[Link to security advisories, CVE reports, or security documentation]

## 🚀 Deployment Considerations

<!-- Address any deployment-specific requirements or considerations -->

**Deployment Readiness:**
- [ ] Changes are backward compatible
- [ ] No database migrations required (tutorial uses no database)
- [ ] Environment variables documented if added or modified
- [ ] Docker image builds without errors or warnings
- [ ] Health check endpoints remain functional (/health, /livez, /readyz)
- [ ] No breaking changes to HTTP API contracts

**Deployment Requirements:**
[Document any special deployment instructions or requirements]

**Configuration Changes:**
[List any new environment variables or configuration options]

**Rollback Procedures:**
[Document rollback procedures if this change requires special handling]

**Performance Impact:**
[Describe any performance implications for production deployment]

---

## 🔄 Automation Integration

<!-- This section provides information about automated processes -->

### 🤖 GitHub Actions Integration

This pull request will trigger the comprehensive CI/CD pipeline:

**Automated Processes:**
- **Build and Test Matrix**: Node.js versions 18.x, 20.x, 22.x with unit, integration, and full test suites
- **Security Scanning**: npm audit, ESLint security rules, Docker image vulnerability scanning
- **Quality Gates**: Coverage threshold (95%), linting validation, formatting checks
- **Docker Build**: Multi-platform image building with security scanning
- **Quality Gate Evaluation**: Final approval decision based on all automated checks

**Required Status Checks:**
- ✅ Setup and Validation
- ✅ Build and Test Matrix (all Node.js versions)
- ✅ Security and Vulnerability Scanning
- ✅ Docker Build and Scan (for pushes)
- ✅ Quality Gate Evaluation

### 📊 Review Process

**Automatic Actions:**
- Reviewer assignment based on CODEOWNERS file patterns
- CI/CD pipeline execution with comprehensive testing
- Security vulnerability scanning and reporting
- Code coverage analysis and reporting
- Quality gate evaluation with pass/fail decision

**Manual Reviews Required:**
- Code owner approval for modified file patterns
- Security team review for security-related changes
- Documentation team review for educational content changes
- DevOps review for infrastructure and CI/CD changes

---

<!-- =============================================================================
TEMPLATE VALIDATION CHECKLIST
=============================================================================
Before submitting this pull request, ensure you have:

✅ **Completed all required sections** marked with validation requirements
✅ **Selected appropriate change types** and impact classifications  
✅ **Provided comprehensive testing details** including manual and automated tests
✅ **Addressed security considerations** appropriate to your changes
✅ **Assessed educational impact** for tutorial and learning materials
✅ **Verified compatibility** with Node.js 22.11.0 LTS and Express.js 5.1.0
✅ **Completed quality assurance checklists** for your change categories
✅ **Provided reviewer guidance** for effective code review
✅ **Linked related issues** and external documentation
✅ **Documented deployment considerations** and any special requirements

AUTOMATED VALIDATION:
🤖 This pull request will be validated by GitHub Actions CI/CD pipeline
🔒 Security scanning will be performed automatically
📊 Quality gates will evaluate test coverage, code quality, and security
🏷️  Team assignment will occur automatically based on CODEOWNERS patterns
📝 Quality gate results will be posted as comments automatically

EDUCATIONAL FOCUS REMINDER:
🎓 This tutorial serves learners at various skill levels
📚 Maintain clarity and educational progression in all changes
🌟 Support collaborative learning through comprehensive documentation
🚀 Demonstrate professional development practices through this PR process

Thank you for contributing to the Node.js tutorial community! 🙏
============================================================================= -->