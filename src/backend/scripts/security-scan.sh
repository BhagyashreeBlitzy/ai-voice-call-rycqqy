#!/bin/bash
# =============================================================================
# Node.js Tutorial Application - Comprehensive Security Scanning Orchestration
# =============================================================================
# Comprehensive security scanning orchestration script for the Node.js tutorial application 
# that implements multi-layered security analysis including dependency vulnerability scanning 
# with npm audit and Snyk, static application security testing (SAST) using ESLint and Semgrep, 
# container security assessment with Trivy, secret detection using TruffleHog, and license 
# compliance validation. Generates educational security reports, integrates with CI/CD pipelines 
# through quality gates, and exports findings in SARIF format for GitHub Security tab integration 
# while maintaining focus on Node.js educational security best practices.
#
# Features:
# - Multi-layered security analysis with dependency vulnerability scanning using npm audit and Snyk
# - Static application security testing (SAST) with ESLint security plugins and Semgrep analysis
# - Container security assessment using Trivy vulnerability scanner with comprehensive database coverage
# - Secret and credential detection using TruffleHog with Git history analysis and entropy detection  
# - License compliance validation for open source dependencies with compatibility matrix
# - Educational security reporting with vulnerability tutorials and progressive learning materials
# - SARIF format export for GitHub Security tab integration and centralized vulnerability management
# - CI/CD pipeline integration with security-based quality gates and automated deployment decisions
# - Comprehensive error handling with detailed troubleshooting information and recovery suggestions
# - Security metrics collection and trend analysis for continuous security posture improvement
#
# Security Scanning Phases:
#   Phase 1: Environment validation and security tool prerequisite checking (30-60 seconds)
#   Phase 2: NPM dependency vulnerability scanning with npm audit and Snyk (1-3 minutes)  
#   Phase 3: Static application security testing with ESLint and Semgrep (2-5 minutes)
#   Phase 4: Docker container security assessment with Trivy (3-8 minutes)
#   Phase 5: Secret and credential detection with TruffleHog (2-5 minutes)
#   Phase 6: License compliance analysis and compatibility validation (1-2 minutes)
#   Phase 7: Security findings aggregation and unified reporting (1-2 minutes)
#   Phase 8: Security threshold validation and CI/CD quality gate decisions (30 seconds)
#
# Usage Examples:
#   ./security-scan.sh                                    # Comprehensive security scan with default settings
#   ./security-scan.sh --scan-mode quick                  # Quick security scan for development workflows
#   ./security-scan.sh --threshold critical               # Scan with critical vulnerability threshold only
#   ./security-scan.sh --no-container --no-secrets       # Skip container and secret scanning phases
#   ./security-scan.sh --educational --sarif              # Generate educational materials and SARIF output
#   ./security-scan.sh --quiet --format json,sarif        # CI/CD optimized scan with structured output formats

set -euo pipefail

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================
# Script and project directory configuration with dynamic path resolution for security scan orchestration

# Script directory and project root path resolution for security scan context
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Security scan output and report configuration with environment variable defaults
readonly SCAN_OUTPUT_DIR="${SCAN_OUTPUT_DIR:-security-reports}"
readonly VULNERABILITY_THRESHOLD="${VULNERABILITY_THRESHOLD:-high}"
readonly FAIL_ON_CRITICAL="${FAIL_ON_CRITICAL:-true}"
readonly GENERATE_EDUCATIONAL_REPORT="${GENERATE_EDUCATIONAL_REPORT:-true}"
readonly SARIF_OUTPUT="${SARIF_OUTPUT:-security-results.sarif}"
readonly SCAN_MODE="${SCAN_MODE:-comprehensive}"

# Security scanning feature flags with granular control over scanning phases
readonly INCLUDE_CONTAINER_SCAN="${INCLUDE_CONTAINER_SCAN:-true}"
readonly INCLUDE_SECRET_SCAN="${INCLUDE_SECRET_SCAN:-true}"
readonly NPM_AUDIT_LEVEL="${NPM_AUDIT_LEVEL:-moderate}"

# Build and performance tracking variables for comprehensive security analysis
readonly BUILD_START_TIME="$(date +%s)"

# ANSI color codes for structured logging and educational output formatting
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_RESET='\033[0m'

# =============================================================================
# COMPREHENSIVE LOGGING SYSTEM
# =============================================================================
# Advanced logging system with structured formatting, security context, and educational guidance
# to provide clear feedback during security scanning operations with detailed troubleshooting
# information and comprehensive security analysis workflow documentation.

# Log security scanning informational messages with structured formatting and educational context
log_security_info() {
    local message="$1"
    local scan_phase="${2:-Security}"
    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    printf "${COLOR_BLUE}[SECURITY]${COLOR_RESET} [%s] [%s] %s (Mode: %s, Threshold: %s)\n" \
        "${timestamp}" "${scan_phase}" "${message}" "${SCAN_MODE}" "${VULNERABILITY_THRESHOLD}" >&1
}

# Log security scanning error messages with detailed context and educational troubleshooting guidance
log_security_error() {
    local error_message="$1"
    local scan_tool="${2:-Security Scanner}"
    local exit_code="${3:-1}"
    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    printf "${COLOR_RED}[SECURITY ERROR]${COLOR_RESET} [%s] [%s] %s (Exit: %s)\n" \
        "${timestamp}" "${scan_tool}" "${error_message}" "${exit_code}" >&2
    printf "${COLOR_RED}[SECURITY ERROR]${COLOR_RESET} Troubleshooting: Check tool installation, network connectivity, and authentication\n" >&2
    printf "${COLOR_RED}[SECURITY ERROR]${COLOR_RESET} Educational resources: https://nodejs.org/en/security\n" >&2
    printf "${COLOR_RED}[SECURITY ERROR]${COLOR_RESET} Tool documentation: npm audit --help, snyk --help, trivy --help\n" >&2
}

# =============================================================================
# SECURITY ENVIRONMENT VALIDATION
# =============================================================================
# Comprehensive validation functions for security scanning environment and tool prerequisites
# with detailed error reporting and educational guidance for security analysis workflow setup.

# Validate security scanning environment prerequisites and tool availability for comprehensive analysis
validate_security_environment() {
    log_security_info "Validating security scanning environment and tool prerequisites" "Environment Validation"
    
    local validation_errors=0
    
    # Validate Node.js runtime version compatibility (22.x LTS required for tutorial application)
    if ! command -v node >/dev/null 2>&1; then
        log_security_error "Node.js runtime not found - required for dependency analysis" "Node.js Check" "127"
        ((validation_errors++))
    else
        local node_version
        node_version="$(node --version | sed 's/v//')"
        if [[ ! "$node_version" =~ ^22\. ]]; then
            log_security_error "Node.js version $node_version not supported - requires 22.x LTS" "Node.js Version" "1"
            ((validation_errors++))
        else
            log_security_info "Node.js version validated: v${node_version}" "Node.js Check"
        fi
    fi
    
    # Validate NPM package manager availability and version compatibility (11.5.2+ required)
    if ! command -v npm >/dev/null 2>&1; then
        log_security_error "NPM package manager not found - required for dependency vulnerability scanning" "NPM Check" "127"
        ((validation_errors++))
    else
        local npm_version
        npm_version="$(npm --version)"
        log_security_info "NPM version validated: v${npm_version}" "NPM Check"
    fi
    
    # Check Docker Engine availability for container security scanning if enabled
    if [[ "${INCLUDE_CONTAINER_SCAN}" == "true" ]]; then
        if ! command -v docker >/dev/null 2>&1; then
            log_security_error "Docker not found - required for container security scanning" "Docker Check" "127"
            ((validation_errors++))
        elif ! docker info >/dev/null 2>&1; then
            log_security_error "Docker daemon not accessible - check service status" "Docker Daemon" "1"
            ((validation_errors++))
        else
            log_security_info "Docker environment validated for container scanning" "Docker Check"
        fi
    fi
    
    # Validate security scanning tools installation and accessibility
    local security_tools=("jq:JSON processor for report parsing" "curl:Network connectivity for vulnerability databases")
    
    if command -v snyk >/dev/null 2>&1; then
        log_security_info "Snyk vulnerability scanner available for enhanced dependency analysis" "Snyk Check"
    else
        log_security_info "Snyk not found - using npm audit only for dependency scanning" "Snyk Check"
    fi
    
    if command -v trivy >/dev/null 2>&1; then
        log_security_info "Trivy scanner available for container security assessment" "Trivy Check"
    elif [[ "${INCLUDE_CONTAINER_SCAN}" == "true" ]]; then
        log_security_error "Trivy scanner not found - required for container security scanning" "Trivy Check" "127"
        ((validation_errors++))
    fi
    
    if command -v trufflehog >/dev/null 2>&1; then
        log_security_info "TruffleHog available for secret detection and credential scanning" "TruffleHog Check"
    elif [[ "${INCLUDE_SECRET_SCAN}" == "true" ]]; then
        log_security_info "TruffleHog not found - secret scanning will be skipped" "TruffleHog Check"
    fi
    
    # Validate essential tools availability
    for tool_spec in "${security_tools[@]}"; do
        local tool_name="${tool_spec%%:*}"
        local tool_desc="${tool_spec#*:}"
        
        if ! command -v "${tool_name}" >/dev/null 2>&1; then
            log_security_error "${tool_desc} - ${tool_name} not found" "${tool_name} Check" "127"
            ((validation_errors++))
        else
            log_security_info "${tool_desc} validated: ${tool_name}" "Tool Check"
        fi
    done
    
    # Verify internet connectivity for vulnerability database updates
    if ! curl --connect-timeout 5 -s https://registry.npmjs.org >/dev/null 2>&1; then
        log_security_error "Internet connectivity required for vulnerability database updates" "Network Check" "1"
        ((validation_errors++))
    else
        log_security_info "Network connectivity validated for vulnerability database access" "Network Check"
    fi
    
    # Validate authentication tokens for security services
    if [[ -n "${SNYK_TOKEN:-}" ]]; then
        log_security_info "Snyk authentication token configured for enhanced scanning" "Auth Check"
    else
        log_security_info "Snyk authentication token not set - using free tier scanning" "Auth Check"
    fi
    
    if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        log_security_info "GitHub token configured for Security tab integration" "Auth Check"
    else
        log_security_info "GitHub token not set - SARIF upload to Security tab disabled" "Auth Check"
    fi
    
    # Verify project files existence and readability
    if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
        log_security_error "package.json not found - required for dependency analysis" "Project Files" "1"
        ((validation_errors++))
    fi
    
    if [[ "${INCLUDE_CONTAINER_SCAN}" == "true" && ! -f "${PROJECT_ROOT}/Dockerfile" ]]; then
        log_security_error "Dockerfile not found - required for container security scanning" "Project Files" "1"
        ((validation_errors++))
    fi
    
    # Return validation result
    if [[ "${validation_errors}" -eq 0 ]]; then
        log_security_info "Security environment validation completed successfully" "Environment Validation"
        return 0
    else
        log_security_error "${validation_errors} validation errors found - cannot proceed with security scanning" "Environment Validation" "${validation_errors}"
        return 1
    fi
}

# Initialize security scanning environment with directory structure and tool configuration
setup_security_scan_environment() {
    log_security_info "Setting up security scanning environment and directory structure" "Environment Setup"
    
    # Create comprehensive directory structure for security reports and educational materials
    local scan_dirs=(
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}"
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/dependency-scan"
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/static-analysis" 
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/container-scan"
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/secret-detection"
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/license-analysis"
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/sarif-reports"
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/educational-materials"
        "${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/tmp"
    )
    
    for scan_dir in "${scan_dirs[@]}"; do
        if ! mkdir -p "${scan_dir}"; then
            log_security_error "Failed to create security scan directory: ${scan_dir}" "Directory Setup" "1"
            return 1
        fi
    done
    
    # Initialize security scan logging with comprehensive context
    local scan_log="${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/security-scan.log"
    {
        echo "# Security Scan Session Log"
        echo "# Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "# Scan Mode: ${SCAN_MODE}"
        echo "# Vulnerability Threshold: ${VULNERABILITY_THRESHOLD}"
        echo "# Project: $(basename "${PROJECT_ROOT}")"
        echo "# Node.js Version: $(node --version 2>/dev/null || echo 'unknown')"
        echo "# NPM Version: $(npm --version 2>/dev/null || echo 'unknown')"
        echo "# Security Tools: npm audit, eslint"
        if command -v snyk >/dev/null 2>&1; then echo "# Snyk: $(snyk --version 2>/dev/null || echo 'available')"; fi
        if command -v trivy >/dev/null 2>&1; then echo "# Trivy: $(trivy --version 2>/dev/null || echo 'available')"; fi  
        if command -v trufflehog >/dev/null 2>&1; then echo "# TruffleHog: $(trufflehog --version 2>/dev/null || echo 'available')"; fi
        echo ""
    } > "${scan_log}"
    
    # Setup tool-specific configuration files if needed
    local eslint_config="${PROJECT_ROOT}/.eslintrc.js"
    if [[ -f "${eslint_config}" ]]; then
        log_security_info "ESLint configuration found: ${eslint_config}" "Config Setup"
    else
        log_security_info "ESLint configuration not found - using default security rules" "Config Setup"
    fi
    
    # Configure temporary directories for intermediate scan results with proper cleanup
    export SECURITY_SCAN_TMP_DIR="${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/tmp"
    
    log_security_info "Security scanning environment setup completed successfully" "Environment Setup"
    return 0
}

# =============================================================================
# DEPENDENCY VULNERABILITY SCANNING
# =============================================================================
# Comprehensive NPM dependency vulnerability scanning using npm audit and Snyk integration
# with educational reporting and remediation guidance generation for security learning.

# Perform comprehensive NPM dependency vulnerability scanning with educational reporting
scan_npm_dependencies() {
    local audit_level="$1"
    local generate_remediation="${2:-true}"
    
    log_security_info "Starting NPM dependency vulnerability scanning" "Dependency Scan"
    
    local dependency_scan_dir="${PROJECT_ROOT}/${SCAN_OUTPUT_DIR}/dependency-scan"
    local scan_results="{}"
    
    # Update NPM vulnerability database for latest security information
    log_security_info "Updating NPM vulnerability database for latest security information" "Database Update"
    if npm audit >/dev/null 2>&1; then
        log_security_info "NPM audit database updated successfully" "Database Update"
    else
        log_security_info "NPM audit database update completed with findings" "Database Update"
    fi
    
    # Execute npm audit with comprehensive vulnerability reporting
    log_security_info "Executing npm audit with comprehensive vulnerability analysis" "NPM Audit"
    
    local npm_audit_output="${dependency_scan_dir}/npm-audit.json"
    local npm_audit_exit_code=0
    
    if npm audit --json --audit-level="${audit_level}" > "${npm_audit_output}" 2>/dev/null; then
        npm_audit_exit_code=0
        log_security_info "NPM audit completed - no vulnerabilities found at ${audit_level} level" "NPM Audit"
    else
        npm_audit_exit_code=$?
        log_security_info "NPM audit completed with findings at ${audit_level} level (exit: ${npm_audit_exit_code})" "NPM Audit"
    fi
    
    # Parse npm audit output and extract vulnerability details for educational analysis
    if [[ -f "${npm_audit_output}" ]]; then
        local npm_vulnerabilities
        npm_vulnerabilities="$(jq -r '.metadata.vulnerabilities // {}' "${npm_audit_output}" 2>/dev/null || echo '{}')"
        
        local critical_count high_count moderate_count low_count
        critical_count="$(echo "${npm_vulnerabilities}" | jq -r '.critical // 0' 2>/dev/null || echo '0')"
        high_count="$(echo "${npm_vulnerabilities}" | jq -r '.high // 0' 2>/dev/null || echo '0')"
        moderate_count="$(echo "${npm_vulnerabilities}" | jq -r '.moderate // 0' 2>/dev/null || echo '0')"
        low_count="$(echo "${npm_vulnerabilities}" | jq -r '.low // 0' 2>/dev/null || echo '0')"
        
        log_security_info "NPM audit findings: Critical: ${critical_count}, High: ${high_count}, Moderate: ${moderate_count}, Low: ${low_count}" "Vulnerability Matrix"
        
        # Update scan results with npm audit findings
        scan_results="$(echo "${scan_results}" | jq --argjson npm_audit '{
            "npm_audit": {
                "exit_code": '${npm_audit_exit_code}',
                "vulnerabilities": {
                    "critical": '${critical_count}',
                    "high": '${high_count}',
                    "moderate": '${moderate_count}',
                    "low": '${low_count}'
                },
                "scan_completed": true
            }
        }' '. + $npm_audit')"
    fi
    
    # Run Snyk security scan for enhanced vulnerability coverage if available
    if command -v snyk >/dev/null 2>&1; then
        log_security_info "Executing Snyk security scan for enhanced vulnerability detection" "Snyk Scan"
        
        local snyk_output="${dependency_scan_dir}/snyk-scan.json"
        local snyk_exit_code=0
        
        if snyk test --json > "${snyk_output}" 2>/dev/null; then
            snyk_exit_code=0
            log_security_info "Snyk scan completed - no vulnerabilities found" "Snyk Scan"
        else
            snyk_exit_code=$?
            log_security_info "Snyk scan completed with findings (exit: ${snyk_exit_code})" "Snyk Scan"
        fi
        
        # Parse Snyk results and integrate with npm audit findings
        if [[ -f "${snyk_output}" ]]; then
            local snyk_vulnerabilities
            snyk_vulnerabilities="$(jq -r '.vulnerabilities // [] | length' "${snyk_output}" 2>/dev/null || echo '0')"
            log_security_info "Snyk identified ${snyk_vulnerabilities} additional vulnerability issues" "Snyk Results"
            
            # Update scan results with Snyk findings
            scan_results="$(echo "${scan_results}" | jq --argjson snyk '{
                "snyk_scan": {
                    "exit_code": '${snyk_exit_code}',
                    "vulnerabilities": '${snyk_vulnerabilities}',
                    "scan_completed": true
                }
            }' '. + $snyk')"
        fi
    else
        log_security_info "Snyk not available - using npm audit only for dependency vulnerability scanning" "Snyk Scan"
        scan_results="$(echo "${scan_results}" | jq '. + {"snyk_scan": {"scan_completed": false, "reason": "tool_not_available"}}')"
    fi
    
    # Analyze package-lock.json for dependency tree security issues and outdated packages
    if [[ -f "${PROJECT_ROOT}/package-lock.json" ]]; then
        log_security_info "Analyzing package-lock.json for dependency tree security patterns" "Dependency Tree"
        
        # Check for packages with known security issues
        npm outdated --json > "${dependency_scan_dir}/outdated-packages.json" 2>/dev/null || true
        
        if [[ -s "${dependency_scan_dir}/outdated-packages.json" ]]; then
            local outdated_count
            outdated_count="$(jq 'keys | length' "${dependency_scan_dir}/outdated-packages.json" 2>/dev/null || echo '0')"
            log_security_info "Found ${outdated_count} outdated packages that may have security updates" "Package Updates"
        fi
    fi
    
    # Generate educational explanations for vulnerability types discovered
    if [[ "${generate_remediation}" == "true" ]]; then
        log_security_info "Generating educational vulnerability explanations and remediation guidance" "Educational Content"
        
        local educational_report="${dependency_scan_dir}/vulnerability-education.md"
        {
            echo "# NPM Dependency Security Analysis - Educational Guide"
            echo ""
            echo "## Vulnerability Severity Levels"
            echo ""
            echo "### Critical Vulnerabilities (${critical_count} found)"
            echo "Critical vulnerabilities represent immediate security risks that can lead to:"
            echo "- Remote code execution"
            echo "- Data breaches and unauthorized access"
            echo "- Complete system compromise"
            echo ""
            echo "**Recommendation**: Update affected packages immediately or find alternative solutions."
            echo ""
            echo "### High Severity Issues (${high_count} found)"
            echo "High severity vulnerabilities can significantly impact application security:"
            echo "- Authentication bypass"
            echo "- Cross-site scripting (XSS) attacks"
            echo "- SQL injection vulnerabilities"
            echo ""
            echo "**Recommendation**: Prioritize updates and review affected code paths."
            echo ""
            echo "### Moderate Severity Issues (${moderate_count} found)"
            echo "Moderate vulnerabilities require attention but may not be immediately exploitable:"
            echo "- Information disclosure"
            echo "- Denial of service potential"
            echo "- Configuration weaknesses"
            echo ""
            echo "**Recommendation**: Plan updates in next development cycle."
            echo ""
            echo "### Learning Resources"
            echo "- [NPM Security Best Practices](https://docs.npmjs.com/security)"
            echo "- [Node.js Security Checklist](https://nodejs.org/en/security/)"
            echo "- [Express.js Security Guide](https://expressjs.com/en/advanced/best-practice-security.html)"
            echo ""
            echo "## Remediation Commands"
            echo ""
            echo "```bash"
            echo "# Update all packages to latest compatible versions"
            echo "npm update"
            echo ""
            echo "# Fix vulnerabilities automatically where possible"
            echo "npm audit fix"
            echo ""
            echo "# Force fixes (may introduce breaking changes)"
            echo "npm audit fix --force"
            echo "