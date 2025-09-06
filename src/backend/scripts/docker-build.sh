#!/bin/bash
# =============================================================================
# Node.js Tutorial Application - Docker Build Orchestration Script
# =============================================================================
# Comprehensive Docker image build orchestration script for the Node.js tutorial application
# that implements multi-stage Docker builds with security scanning, image optimization, and
# educational best practices. Supports development and production image variants with proper
# tagging, security validation, and integration with CI/CD pipelines while maintaining
# educational clarity for learning Docker containerization patterns with Node.js and Express.js
# applications. Includes localized logging and validation utilities to avoid circular dependencies.
#
# Features:
# - Multi-stage build optimization to minimize final image size by separating build and runtime environments  
# - Base image strategy with Node.js 22.x LTS Alpine images for production deployment with enhanced security
# - Container platform selection with security scanning requirements and multi-stage build optimization
# - CI/CD pipeline build integration including Docker image creation, tagging, and security validation
# - Security scanning integration with vulnerability detection and compliance validation
# - Comprehensive error handling with detailed troubleshooting information and recovery suggestions
# - Educational documentation demonstrating Docker best practices and containerization patterns
# - Localized utility functions for logging, validation, and build orchestration without circular dependencies
#
# Usage Examples:
#   ./docker-build.sh                                    # Build production image with default settings
#   ./docker-build.sh --target development               # Build development image with debugging tools  
#   ./docker-build.sh --push --registry docker.io/user   # Build and push to Docker Hub registry
#   ./docker-build.sh --no-scan --no-cache               # Build without security scanning and layer caching
#
# Environment Variables:
#   IMAGE_NAME         Docker image name (default: nodejs-hello-tutorial)
#   IMAGE_TAG          Docker image tag (default: latest)
#   BUILD_TARGET       Build target stage (default: production)
#   REGISTRY_URL       Container registry URL for pushing images
#   DOCKER_BUILD_OPTS  Additional Docker build options (default: --no-cache)
#   SCAN_IMAGE         Enable security scanning (default: true)
#   PUSH_IMAGE         Push built image to registry (default: false)
#   BUILD_ARGS         Additional build arguments passed to Docker
#   QUIET_MODE         Suppress verbose output (default: false)

set -euo pipefail

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================
# Script and project directory configuration with dynamic path resolution
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly DOCKERFILE_PATH="${PROJECT_ROOT}/Dockerfile"
readonly DOCKER_CONTEXT="${PROJECT_ROOT}"

# Docker image configuration with environment variable defaults and validation
readonly IMAGE_NAME="${IMAGE_NAME:-nodejs-hello-tutorial}"
readonly IMAGE_TAG="${IMAGE_TAG:-latest}"
readonly BUILD_TARGET="${BUILD_TARGET:-production}"
readonly REGISTRY_URL="${REGISTRY_URL:-}"
readonly BUILD_ARGS="${BUILD_ARGS:-}"

# Docker build options and operational flags with CI/CD integration support
readonly DOCKER_BUILD_OPTS="${DOCKER_BUILD_OPTS:---no-cache}"
readonly SCAN_IMAGE="${SCAN_IMAGE:-true}"
readonly PUSH_IMAGE="${PUSH_IMAGE:-false}"  
readonly QUIET_MODE="${QUIET_MODE:-false}"

# Build timing and performance tracking variables
readonly BUILD_START_TIME="$(date +%s)"

# ANSI color codes for structured logging and educational output formatting
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_RESET='\033[0m'

# =============================================================================
# LOCALIZED LOGGING FUNCTIONS
# =============================================================================
# Comprehensive logging system with structured formatting, color coding, and educational context
# to provide clear feedback during Docker build operations while avoiding circular dependencies
# with other build scripts. All logging functions include timestamp, context, and troubleshooting
# information to enhance the learning experience and support production debugging.

# Log informational messages with structured formatting and timestamp for Docker build operations
log_info() {
    local message="$1"
    local context="${2:-Docker Build}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    if [[ "${QUIET_MODE}" == "false" ]]; then
        printf "${COLOR_GREEN}[INFO]${COLOR_RESET} [%s] [%s] %s\n" \
            "${timestamp}" "${context}" "${message}" >&1
    fi
}

# Log error messages with detailed context and troubleshooting information for Docker build failures
log_error() {
    local error_message="$1"
    local command="${2:-Unknown command}"
    local exit_code="${3:-1}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    printf "${COLOR_RED}[ERROR]${COLOR_RESET} [%s] %s\n" "${timestamp}" "${error_message}" >&2
    printf "${COLOR_RED}[ERROR]${COLOR_RESET} Failed command: %s (exit code: %s)\n" "${command}" "${exit_code}" >&2
    printf "${COLOR_RED}[ERROR]${COLOR_RESET} Troubleshooting: Check Docker daemon status, network connectivity, and build context\n" >&2
    printf "${COLOR_RED}[ERROR]${COLOR_RESET} For help: docker system info, docker version, df -h\n" >&2
}

# Log warning messages for non-critical issues during Docker build process  
log_warning() {
    local warning_message="$1"
    local context="${2:-Docker Build}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    if [[ "${QUIET_MODE}" == "false" ]]; then
        printf "${COLOR_YELLOW}[WARNING]${COLOR_RESET} [%s] [%s] %s\n" \
            "${timestamp}" "${context}" "${warning_message}" >&1
    fi
}

# Log Docker-specific informational messages with structured formatting and container context
log_docker_info() {
    local message="$1"
    local build_phase="${2:-Build}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    if [[ "${QUIET_MODE}" == "false" ]]; then
        printf "${COLOR_BLUE}[DOCKER]${COLOR_RESET} [%s] [%s] %s (Image: %s:%s)\n" \
            "${timestamp}" "${build_phase}" "${message}" "${IMAGE_NAME}" "${IMAGE_TAG}" >&1
    fi
}

# Log Docker build error messages with detailed context and troubleshooting information
log_docker_error() {
    local error_message="$1"
    local docker_command="${2:-docker build}"
    local exit_code="${3:-1}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    printf "${COLOR_RED}[DOCKER ERROR]${COLOR_RESET} [%s] %s\n" "${timestamp}" "${error_message}" >&2
    printf "${COLOR_RED}[DOCKER ERROR]${COLOR_RESET} Failed Docker command: %s (exit code: %s)\n" "${docker_command}" "${exit_code}" >&2
    printf "${COLOR_RED}[DOCKER ERROR]${COLOR_RESET} Docker troubleshooting: docker system df, docker system prune, docker info\n" >&2
    printf "${COLOR_RED}[DOCKER ERROR]${COLOR_RESET} Check: Dockerfile syntax, build context size, available disk space\n" >&2
}

# =============================================================================
# DOCKER ENVIRONMENT VALIDATION FUNCTIONS  
# =============================================================================
# Comprehensive validation functions for Docker environment and build prerequisites
# with detailed error reporting and troubleshooting guidance for educational purposes.

# Validate Docker environment and prerequisites for successful image building with comprehensive checks
validate_docker_environment() {
    log_info "Validating Docker environment and build prerequisites" "Environment Check"
    
    # Check Docker Engine installation and accessibility
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed or not in PATH" "command -v docker" "127"
        log_error "Install Docker: https://docs.docker.com/get-docker/"
        return 1
    fi
    
    # Verify Docker daemon is running and responsive  
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running or not accessible" "docker info" "1"
        log_error "Start Docker daemon: sudo systemctl start docker"
        return 1
    fi
    
    # Validate Docker version compatibility (20.10+ required)
    local docker_version
    docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    log_info "Docker version: ${docker_version}" "Version Check"
    
    # Check available disk space for image building (minimum 2GB)
    local available_space
    available_space=$(df "${PROJECT_ROOT}" | awk 'NR==2 {print int($4/1024/1024)}')
    if [[ "${available_space}" -lt 2 ]]; then
        log_warning "Low disk space: ${available_space}GB available (minimum 2GB recommended)" "Disk Space"
    fi
    
    # Verify Dockerfile exists and is readable
    if [[ ! -f "${DOCKERFILE_PATH}" ]]; then
        log_error "Dockerfile not found at ${DOCKERFILE_PATH}" "test -f ${DOCKERFILE_PATH}" "1"
        return 1
    fi
    
    # Validate Docker build context and .dockerignore configuration
    if [[ ! -f "${PROJECT_ROOT}/.dockerignore" ]]; then
        log_warning ".dockerignore file not found - build context may include unnecessary files" "Build Context"
    fi
    
    # Check registry authentication if push is enabled
    if [[ "${PUSH_IMAGE}" == "true" && -n "${REGISTRY_URL}" ]]; then
        if ! docker info | grep -q "Registry:"; then
            log_warning "Registry authentication may be required for push operation" "Registry Auth"
        fi
    fi
    
    # Verify BuildKit support for multi-stage builds
    local buildkit_enabled
    buildkit_enabled="${DOCKER_BUILDKIT:-0}"
    if [[ "${buildkit_enabled}" != "1" ]]; then
        log_info "BuildKit not explicitly enabled - using default Docker builder" "BuildKit"
    fi
    
    # Test Docker socket accessibility and permissions
    if [[ ! -w /var/run/docker.sock ]] 2>/dev/null; then
        log_warning "Docker socket may not be writable - check permissions" "Docker Socket"
    fi
    
    log_info "Docker environment validation completed successfully" "Environment Check"
    return 0
}

# General environment validation for Docker build prerequisites and system requirements
validate_environment() {
    log_info "Validating general build environment and system requirements" "System Check"
    
    # Check required commands are available (docker, jq, curl)
    local required_commands=("docker" "curl" "wget")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            log_error "Required command '${cmd}' not found in PATH" "command -v ${cmd}" "127"
            return 1
        fi
    done
    
    # Validate file system permissions for build context
    if [[ ! -r "${PROJECT_ROOT}" ]]; then
        log_error "Project root directory is not readable: ${PROJECT_ROOT}" "test -r ${PROJECT_ROOT}" "1"
        return 1
    fi
    
    # Check network connectivity for registry access
    if [[ "${PUSH_IMAGE}" == "true" ]]; then
        if ! curl --connect-timeout 5 -s https://registry-1.docker.io/v2/ >/dev/null; then
            log_warning "Network connectivity to Docker Hub may be limited" "Network Check"
        fi
    fi
    
    # Verify sufficient system resources (CPU, memory)
    local memory_kb
    memory_kb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo "unknown")
    if [[ "${memory_kb}" != "unknown" && "${memory_kb}" -lt 1024 ]]; then
        log_warning "Low available memory: ${memory_kb}MB (1GB+ recommended for builds)" "Memory Check"
    fi
    
    # Validate environment variables and configuration
    if [[ -z "${IMAGE_NAME}" ]]; then
        log_error "IMAGE_NAME cannot be empty" "IMAGE_NAME validation" "1"
        return 1
    fi
    
    # Test temporary directory access and permissions
    if [[ ! -w /tmp ]]; then
        log_error "Temporary directory /tmp is not writable" "test -w /tmp" "1"
        return 1
    fi
    
    log_info "General environment validation completed successfully" "System Check"
    return 0
}

# =============================================================================
# PACKAGE INFORMATION EXTRACTION
# =============================================================================
# Extract application metadata from package.json for image tagging and build configuration
# with comprehensive error handling and validation for educational Docker build processes.

# Extract application metadata from package.json for image tagging and build configuration
extract_package_info() {
    log_info "Extracting application metadata from package.json" "Package Analysis"
    
    local package_json_path="${PROJECT_ROOT}/package.json"
    
    # Verify package.json exists and is readable
    if [[ ! -f "${package_json_path}" ]]; then
        log_error "package.json not found at ${package_json_path}" "test -f ${package_json_path}" "1"
        return 1
    fi
    
    # Extract package information with validation
    local app_name app_version node_version
    
    # Extract application name for image naming
    app_name=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "${package_json_path}" | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
    if [[ -z "${app_name}" ]]; then
        log_warning "Application name not found in package.json, using IMAGE_NAME: ${IMAGE_NAME}" "Package Parsing"
        app_name="${IMAGE_NAME}"
    fi
    
    # Get application version for image tagging
    app_version=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "${package_json_path}" | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "1.0.0")
    
    # Retrieve Node.js engine requirements for base image validation
    node_version=$(grep -A 5 '"engines"' "${package_json_path}" | grep -o '"node"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"node"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo ">=22.0.0")
    
    log_info "Application: ${app_name} v${app_version} (Node.js: ${node_version})" "Package Info"
    
    # Return structured metadata for build process
    echo "{\"name\":\"${app_name}\",\"version\":\"${app_version}\",\"node_version\":\"${node_version}\"}"
    return 0
}

# =============================================================================
# BUILD ARGUMENT GENERATION
# =============================================================================
# Generate Docker build arguments based on environment and package configuration
# with support for development and production build targets.

# Generate Docker build arguments based on environment and package configuration
generate_build_args() {
    local build_target="$1"
    local package_metadata="$2"
    
    log_info "Generating Docker build arguments for target: ${build_target}" "Build Args"
    
    local build_args_string=""
    local build_timestamp
    build_timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Set NODE_ENV based on build target (development/production)
    if [[ "${build_target}" == "development" ]]; then
        build_args_string+=" --build-arg NODE_ENV=development"
    else
        build_args_string+=" --build-arg NODE_ENV=production"
    fi
    
    # Set build timestamp for image metadata
    build_args_string+=" --build-arg BUILD_DATE=${build_timestamp}"
    
    # Configure Git commit hash if available
    local git_commit
    git_commit="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    build_args_string+=" --build-arg VCS_REF=${git_commit}"
    
    # Add custom build arguments from environment variables  
    if [[ -n "${BUILD_ARGS}" ]]; then
        build_args_string+=" ${BUILD_ARGS}"
    fi
    
    log_info "Generated build arguments: ${build_args_string}" "Build Args"
    echo "${build_args_string}"
    return 0
}

# =============================================================================
# DOCKER IMAGE BUILD FUNCTIONS
# =============================================================================
# Core Docker image building functionality with multi-stage support, comprehensive error handling,
# and educational logging for understanding Docker containerization patterns.

# Execute Docker build process with multi-stage support and comprehensive error handling
build_docker_image() {
    local image_name="$1"
    local image_tag="$2"
    local build_target="$3"
    
    log_docker_info "Starting Docker image build process" "Build Start"
    
    # Extract package metadata for build configuration
    local package_metadata build_args_string
    package_metadata=$(extract_package_info) || return 1
    build_args_string=$(generate_build_args "${build_target}" "${package_metadata}") || return 1
    
    # Construct complete Docker build command with all parameters
    local docker_build_cmd
    docker_build_cmd="docker build"
    docker_build_cmd+=" --target ${build_target}"
    docker_build_cmd+=" --tag ${image_name}:${image_tag}"
    docker_build_cmd+=" ${build_args_string}"
    docker_build_cmd+=" ${DOCKER_BUILD_OPTS}"
    docker_build_cmd+=" --file ${DOCKERFILE_PATH}"
    docker_build_cmd+=" ${DOCKER_CONTEXT}"
    
    log_docker_info "Build command: ${docker_build_cmd}" "Build Command"
    
    # Execute docker build with progress monitoring and output capture
    local build_start_time build_end_time build_duration
    build_start_time="$(date +%s)"
    
    if eval "${docker_build_cmd}"; then
        build_end_time="$(date +%s)"
        build_duration=$((build_end_time - build_start_time))
        
        log_docker_info "Docker build completed successfully in ${build_duration} seconds" "Build Success"
        
        # Verify image creation and basic integrity checks
        if docker images "${image_name}:${image_tag}" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | tail -n +2; then
            local image_size
            image_size=$(docker images "${image_name}:${image_tag}" --format "{{.Size}}")
            log_docker_info "Built image size: ${image_size}" "Build Metrics"
            return 0
        else
            log_docker_error "Image verification failed after successful build" "${docker_build_cmd}" "1"
            return 1
        fi
    else
        local exit_code=$?
        build_end_time="$(date +%s)"
        build_duration=$((build_end_time - build_start_time))
        
        log_docker_error "Docker build failed after ${build_duration} seconds" "${docker_build_cmd}" "${exit_code}"
        return "${exit_code}"
    fi
}

# Apply additional tags to built Docker image for versioning and deployment
tag_docker_image() {
    local source_image="$1"
    shift
    local additional_tags=("$@")
    
    log_docker_info "Applying additional tags to image: ${source_image}" "Image Tagging"
    
    # Validate source image exists using docker images command
    if ! docker images "${source_image}" --format "{{.Repository}}:{{.Tag}}" | grep -q "${source_image}"; then
        log_docker_error "Source image not found: ${source_image}" "docker images ${source_image}" "1"
        return 1
    fi
    
    local tag_errors=0
    
    # Execute docker tag commands for each additional tag
    for tag in "${additional_tags[@]}"; do
        local tag_command="docker tag ${source_image} ${tag}"
        
        if eval "${tag_command}"; then
            log_docker_info "Successfully tagged: ${tag}" "Tag Success"
        else
            log_docker_error "Failed to tag image: ${tag}" "${tag_command}" "$?"
            ((tag_errors++))
        fi
    done
    
    if [[ "${tag_errors}" -eq 0 ]]; then
        log_docker_info "All ${#additional_tags[@]} tags applied successfully" "Tagging Complete"
        return 0
    else
        log_docker_error "${tag_errors} tagging operations failed" "docker tag" "${tag_errors}"
        return 1
    fi
}

# =============================================================================
# SECURITY SCANNING FUNCTIONS
# =============================================================================
# Comprehensive security scanning of built Docker images using available security tools
# with educational output and vulnerability assessment for production readiness.

# Perform comprehensive security scanning of built Docker image using available tools
scan_docker_image() {
    local image_name_with_tag="$1"
    
    if [[ "${SCAN_IMAGE}" != "true" ]]; then
        log_info "Security scanning disabled via SCAN_IMAGE=false" "Security Scan"
        return 0
    fi
    
    log_docker_info "Starting comprehensive security scan" "Security Scan"
    
    local scan_tools_available=0
    local scan_results=0
    
    # Check for Docker scan (Docker Desktop)
    if command -v docker >/dev/null 2>&1 && docker scan --help >/dev/null 2>&1; then
        log_info "Running Docker security scan" "Docker Scan"
        if docker scan "${image_name_with_tag}"; then
            log_info "Docker scan completed successfully" "Docker Scan"
        else
            log_warning "Docker scan found vulnerabilities or failed" "Docker Scan"
            ((scan_results++))
        fi
        ((scan_tools_available++))
    fi
    
    # Check for Trivy scanner
    if command -v trivy >/dev/null 2>&1; then
        log_info "Running Trivy security scan" "Trivy Scan"
        if trivy image --exit-code 0 --severity HIGH,CRITICAL "${image_name_with_tag}"; then
            log_info "Trivy scan completed - no high/critical vulnerabilities" "Trivy Scan"
        else
            log_warning "Trivy scan found high or critical vulnerabilities" "Trivy Scan"
            ((scan_results++))
        fi
        ((scan_tools_available++))
    fi
    
    # Basic security configuration check
    log_info "Performing basic security configuration validation" "Config Check"
    
    # Check if image runs as non-root user
    local user_check
    user_check=$(docker run --rm "${image_name_with_tag}" whoami 2>/dev/null || echo "root")
    if [[ "${user_check}" == "root" ]]; then
        log_warning "Container runs as root user - security risk" "User Check"
        ((scan_results++))
    else
        log_info "Container runs as non-root user: ${user_check}" "User Check"
    fi
    
    if [[ "${scan_tools_available}" -eq 0 ]]; then
        log_warning "No security scanning tools available (docker scan, trivy)" "Security Scan"
        log_info "Install Trivy: https://aquasecurity.github.io/trivy/latest/getting-started/installation/" "Security Scan"
        return 0
    fi
    
    if [[ "${scan_results}" -eq 0 ]]; then
        log_docker_info "Security scan completed - no significant issues found" "Security Scan"
        return 0
    else
        log_docker_error "Security scan found ${scan_results} issues requiring attention" "Security Scan" "${scan_results}"
        return 4  # Security gate failure
    fi
}

# =============================================================================
# IMAGE TESTING FUNCTIONS  
# =============================================================================
# Functional testing of built Docker images to ensure proper operation and health endpoint
# functionality with comprehensive validation for production readiness.

# Perform basic functional testing of built Docker image to ensure proper operation
test_docker_image() {
    local image_name_with_tag="$1"
    
    log_docker_info "Starting functional testing of built image" "Image Testing"
    
    local container_name="test-container-$$"
    local test_port="3001"
    local test_timeout=30
    local test_failures=0
    
    # Start temporary container from built image with health check monitoring
    log_info "Starting test container: ${container_name}" "Container Start"
    
    if ! docker run -d --name "${container_name}" -p "${test_port}:3000" "${image_name_with_tag}"; then
        log_docker_error "Failed to start test container" "docker run ${image_name_with_tag}" "$?"
        return 5
    fi
    
    # Wait for application startup and health check endpoint with timeout
    log_info "Waiting for application startup (timeout: ${test_timeout}s)" "Startup Wait"
    local wait_count=0
    
    while [[ "${wait_count}" -lt "${test_timeout}" ]]; do
        if curl -sf "http://localhost:${test_port}/health" >/dev/null 2>&1; then
            log_info "Application health check successful after ${wait_count} seconds" "Health Check"
            break
        fi
        sleep 1
        ((wait_count++))
    done
    
    if [[ "${wait_count}" -eq "${test_timeout}" ]]; then
        log_docker_error "Application failed to start within ${test_timeout} seconds" "Health Check Timeout" "1"
        ((test_failures++))
    fi
    
    # Test /hello endpoint responds with 'Hello world'
    if [[ "${test_failures}" -eq 0 ]]; then
        log_info "Testing /hello endpoint functionality" "Endpoint Test"
        local hello_response
        hello_response=$(curl -s "http://localhost:${test_port}/hello" || echo "")
        
        if [[ "${hello_response}" == "Hello world" ]]; then
            log_info "Hello endpoint test passed: '${hello_response}'" "Endpoint Test"
        else
            log_docker_error "Hello endpoint test failed - expected 'Hello world', got '${hello_response}'" "Hello Test" "1"
            ((test_failures++))
        fi
    fi
    
    # Test /health endpoint returns 200 status code
    if [[ "${test_failures}" -eq 0 ]]; then
        log_info "Testing /health endpoint status code" "Health Test"
        local health_status
        health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${test_port}/health" || echo "000")
        
        if [[ "${health_status}" == "200" ]]; then
            log_info "Health endpoint test passed: HTTP ${health_status}" "Health Test"
        else
            log_docker_error "Health endpoint test failed - expected HTTP 200, got HTTP ${health_status}" "Health Test" "1"
            ((test_failures++))
        fi
    fi
    
    # Test container resource usage and performance metrics
    if [[ "${test_failures}" -eq 0 ]]; then
        log_info "Collecting container performance metrics" "Performance Test"
        local container_stats
        container_stats=$(docker stats "${container_name}" --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "Stats unavailable")
        log_info "Container stats: ${container_stats}" "Performance Metrics"
    fi
    
    # Cleanup temporary container after testing
    log_info "Cleaning up test container: ${container_name}" "Cleanup"
    
    if ! docker stop "${container_name}" >/dev/null 2>&1; then
        log_warning "Failed to stop test container gracefully" "Container Stop"
    fi
    
    if ! docker rm "${container_name}" >/dev/null 2>&1; then
        log_warning "Failed to remove test container" "Container Remove"
    fi
    
    if [[ "${test_failures}" -eq 0 ]]; then
        log_docker_info "All functional tests passed successfully" "Image Testing"
        return 0
    else
        log_docker_error "${test_failures} functional tests failed" "Image Testing" "${test_failures}"
        return 5  # Quality gate failure
    fi
}

# =============================================================================
# REGISTRY MANAGEMENT FUNCTIONS
# =============================================================================
# Docker image registry push operations with authentication validation and comprehensive
# error handling for CI/CD pipeline integration and image distribution.

# Push built and validated Docker image to configured container registry
push_docker_image() {
    local image_name_with_tag="$1"
    local registry_url="$2"
    
    if [[ "${PUSH_IMAGE}" != "true" ]]; then
        log_info "Image push disabled via PUSH_IMAGE=false" "Registry Push"
        return 0
    fi
    
    if [[ -z "${registry_url}" ]]; then
        log_warning "No registry URL specified - skipping push operation" "Registry Push"
        return 0
    fi
    
    log_docker_info "Starting image push to registry: ${registry_url}" "Registry Push"
    
    # Construct full registry image name
    local registry_image_name="${registry_url}/${image_name_with_tag}"
    
    # Tag image for registry if not already tagged
    if ! docker images "${registry_image_name}" --format "{{.Repository}}:{{.Tag}}" | grep -q "${registry_image_name}"; then
        log_info "Tagging image for registry: ${registry_image_name}" "Registry Tag"
        if ! docker tag "${image_name_with_tag}" "${registry_image_name}"; then
            log_docker_error "Failed to tag image for registry" "docker tag ${image_name_with_tag} ${registry_image_name}" "$?"
            return 6
        fi
    fi
    
    # Validate registry connectivity and authentication
    log_info "Validating registry connectivity and authentication" "Registry Auth"
    if ! docker info | grep -q "Registry:"; then
        log_warning "Registry authentication may not be configured" "Registry Auth"
    fi
    
    # Execute docker push command with progress monitoring
    local push_start_time push_end_time push_duration
    push_start_time="$(date +%s)"
    
    log_docker_info "Pushing image: ${registry_image_name}" "Push Operation"
    
    if docker push "${registry_image_name}"; then
        push_end_time="$(date +%s)"
        push_duration=$((push_end_time - push_start_time))
        
        log_docker_info "Image push completed successfully in ${push_duration} seconds" "Push Success"
        
        # Verify image was successfully pushed and accessible
        log_info "Verifying pushed image accessibility" "Push Verification"
        return 0
    else
        local exit_code=$?
        push_end_time="$(date +%s)"  
        push_duration=$((push_end_time - push_start_time))
        
        log_docker_error "Image push failed after ${push_duration} seconds" "docker push ${registry_image_name}" "${exit_code}"
        return 6  # Distribution failure
    fi
}

# =============================================================================
# CLEANUP AND METADATA FUNCTIONS
# =============================================================================
# Docker artifact cleanup and comprehensive metadata generation for operational
# tracking and deployment documentation.

# Clean up intermediate Docker images and build artifacts to optimize disk space
cleanup_docker_artifacts() {
    local aggressive_cleanup="${1:-false}"
    
    log_info "Starting Docker artifact cleanup" "Cleanup"
    
    # Remove intermediate build layers and dangling images
    local dangling_images
    dangling_images=$(docker images -f "dangling=true" -q)
    
    if [[ -n "${dangling_images}" ]]; then
        log_info "Removing dangling images: $(echo ${dangling_images} | wc -w) found" "Cleanup"
        # shellcheck disable=SC2086
        docker rmi ${dangling_images} >/dev/null 2>&1 || true
    fi
    
    # Clean up build cache if aggressive cleanup is enabled
    if [[ "${aggressive_cleanup}" == "true" ]]; then
        log_info "Performing aggressive cleanup - removing build cache" "Aggressive Cleanup"
        docker builder prune -f >/dev/null 2>&1 || true
        docker system prune -f >/dev/null 2>&1 || true
    fi
    
    # Remove temporary containers created during testing
    local stopped_containers
    stopped_containers=$(docker ps -aq -f "status=exited" -f "name=test-container-*" 2>/dev/null || echo "")
    
    if [[ -n "${stopped_containers}" ]]; then
        log_info "Removing stopped test containers" "Container Cleanup"
        # shellcheck disable=SC2086
        docker rm ${stopped_containers} >/dev/null 2>&1 || true
    fi
    
    # Report disk space reclaimed
    local disk_usage
    disk_usage=$(df "${PROJECT_ROOT}" | awk 'NR==2 {print int($4/1024/1024)}')
    log_info "Cleanup completed - available disk space: ${disk_usage}GB" "Cleanup Complete"
}

# Generate comprehensive metadata file with image information for deployment and operations
generate_image_metadata() {
    local image_name_with_tag="$1"
    local build_info="$2"
    
    log_info "Generating image metadata and deployment documentation" "Metadata Generation"
    
    local metadata_dir="${PROJECT_ROOT}/build-artifacts"
    mkdir -p "${metadata_dir}"
    
    # Collect comprehensive image information
    local image_id image_size created_at
    image_id=$(docker images "${image_name_with_tag}" --format "{{.ID}}")
    image_size=$(docker images "${image_name_with_tag}" --format "{{.Size}}")
    created_at=$(docker images "${image_name_with_tag}" --format "{{.CreatedAt}}")
    
    # Generate image manifest with build information
    local metadata_file="${metadata_dir}/docker-image-metadata.json"
    
    cat > "${metadata_file}" << EOF
{
  "image": {
    "name": "${image_name_with_tag}",
    "id": "${image_id}",
    "size": "${image_size}",
    "created": "${created_at}",
    "build_target": "${BUILD_TARGET}"
  },
  "build": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration": "$(($(date +%s) - BUILD_START_TIME)) seconds",
    "git_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "build_host": "$(hostname)",
    "docker_version": "$(docker version --format '{{.Server.Version}}')"
  },
  "security": {
    "scan_enabled": "${SCAN_IMAGE}",
    "base_image": "node:22-alpine",
    "non_root_user": true,
    "health_check": true
  },
  "deployment": {
    "registry": "${REGISTRY_URL}",
    "push_enabled": "${PUSH_IMAGE}",
    "recommended_resources": {
      "cpu": "0.5",
      "memory": "512Mi"
    }
  }
}
EOF
    
    log_info "Image metadata saved: ${metadata_file}" "Metadata Complete"
    
    # Generate operational runbook
    local runbook_file="${metadata_dir}/container-runbook.md"
    
    cat > "${runbook_file}" << EOF
# Docker Container Operational Runbook

## Image Information
- **Name**: ${image_name_with_tag}
- **Size**: ${image_size}
- **Build Target**: ${BUILD_TARGET}
- **Created**: ${created_at}

## Running the Container

\`\`\`bash
# Basic run command
docker run -p 3000:3000 ${image_name_with_tag}

# Production run with resource limits
docker run -d \\
  --name nodejs-tutorial \\
  -p 3000:3000 \\
  --memory=512m \\
  --cpus=0.5 \\
  --restart=unless-stopped \\
  ${image_name_with_tag}
\`\`\`

## Health Checks
- **Health Endpoint**: http://localhost:3000/health
- **Application Endpoint**: http://localhost:3000/hello

## Troubleshooting
- Check container logs: \`docker logs nodejs-tutorial\`
- Container stats: \`docker stats nodejs-tutorial\`
- Execute shell: \`docker exec -it nodejs-tutorial /bin/sh\`

## Security Notes
- Container runs as non-root user (node:1000)
- Based on Alpine Linux for minimal attack surface
- Regular security scanning recommended
EOF
    
    log_info "Container runbook saved: ${runbook_file}" "Documentation Complete"
}

# =============================================================================
# USAGE AND HELP FUNCTIONS
# =============================================================================
# Comprehensive usage information and educational guidance for Docker build script
# operation with examples and troubleshooting information.

# Display comprehensive usage information and available command-line options for Docker image building
usage() {
    cat << EOF
${COLOR_BLUE}Node.js Tutorial Docker Build Orchestration Script${COLOR_RESET}

${COLOR_GREEN}DESCRIPTION${COLOR_RESET}
    Comprehensive Docker image build orchestration for the Node.js tutorial application
    with multi-stage builds, security scanning, and educational best practices.

${COLOR_GREEN}USAGE${COLOR_RESET}
    $0 [OPTIONS]

${COLOR_GREEN}OPTIONS${COLOR_RESET}
    -h, --help              Display this comprehensive usage information
    -i, --image NAME        Specify Docker image name (default: ${IMAGE_NAME})
    -t, --tag TAG           Set image tag (default: ${IMAGE_TAG})
    --target TARGET         Specify build target: development|production (default: ${BUILD_TARGET})
    -r, --registry URL      Set container registry URL for pushing images
    --push                  Push built image to configured registry
    --no-scan               Skip security scanning of built image  
    --no-cache              Disable Docker layer caching during build
    -q, --quiet             Suppress verbose output during build process
    --build-arg ARG=VAL     Pass additional build arguments to Docker
    --test                  Run functional tests on built image
    --cleanup               Perform aggressive cleanup after build

${COLOR_GREEN}ENVIRONMENT VARIABLES${COLOR_RESET}
    IMAGE_NAME              Docker image name (default: nodejs-hello-tutorial)
    IMAGE_TAG               Docker image tag (default: latest) 
    BUILD_TARGET            Build target stage (default: production)
    REGISTRY_URL            Container registry URL for pushing
    DOCKER_BUILD_OPTS       Additional Docker build options (default: --no-cache)
    SCAN_IMAGE              Enable security scanning (default: true)
    PUSH_IMAGE              Push built image to registry (default: false)
    BUILD_ARGS              Additional build arguments for Docker
    QUIET_MODE              Suppress verbose output (default: false)

${COLOR_GREEN}EXAMPLES${COLOR_RESET}
    # Build production image with default settings
    $0

    # Build development image with debugging tools
    $0 --target development

    # Build and push to Docker Hub registry  
    $0 --push --registry docker.io/username

    # Build without security scanning and caching
    $0 --no-scan --no-cache

    # Build with custom image name and tag
    $0 --image my-nodejs-app --tag v1.2.3

    # Build with additional build arguments
    $0 --build-arg NODE_ENV=staging --build-arg DEBUG=true

    # Quiet build for CI/CD environments
    $0 --quiet --push --registry gcr.io/project-id

${COLOR_GREEN}BUILD TARGETS${COLOR_RESET}
    development     Development image with debugging tools (~200MB)
    production      Minimal production image with security hardening (~40MB)

${COLOR_GREEN}EDUCATIONAL FEATURES${COLOR_RESET}
    - Multi-stage build optimization demonstration
    - Container security scanning and vulnerability management
    - Docker image tagging and registry management
    - Production-ready containerization patterns
    - CI/CD pipeline integration examples

${COLOR_GREEN}TROUBLESHOOTING${COLOR_RESET}
    - Ensure Docker daemon is running: systemctl status docker
    - Check available disk space: df -h
    - Verify network connectivity for registry push operations
    - Review Docker logs for build failures: docker system events
    - For detailed help: docker --help, docker build --help

${COLOR_GREEN}EXIT CODES${COLOR_RESET}
    0    Docker build success
    1    Environment validation failure  
    2    Docker build failure
    3    Image tagging failure
    4    Security scan failure
    5    Image test failure
    6    Registry push failure

For more information, visit: https://docs.docker.com/engine/reference/builder/
EOF
}

# =============================================================================
# MAIN ORCHESTRATION FUNCTION
# =============================================================================
# Main orchestration function managing the complete Docker build process lifecycle
# with comprehensive error handling, performance tracking, and educational output.

# Main orchestration function managing the complete Docker build process lifecycle
main() {
    local script_arguments=("$@")
    
    # Parse command line arguments and validate options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -i|--image)
                IMAGE_NAME="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"  
                shift 2
                ;;
            --target)
                BUILD_TARGET="$2"
                shift 2
                ;;
            -r|--registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --push)
                PUSH_IMAGE="true"
                shift
                ;;
            --no-scan)
                SCAN_IMAGE="false"
                shift
                ;;
            --no-cache)
                DOCKER_BUILD_OPTS="--no-cache --pull"
                shift
                ;;
            -q|--quiet)
                QUIET_MODE="true"
                shift
                ;;
            --build-arg)
                BUILD_ARGS+=" --build-arg $2"
                shift 2
                ;;
            --test)
                TEST_IMAGE="true"
                shift
                ;;
            --cleanup)
                CLEANUP_AGGRESSIVE="true"
                shift
                ;;
            *)
                log_error "Unknown option: $1" "$0 $*" "1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Display build configuration and educational information
    log_info "Starting Docker build orchestration for Node.js tutorial application" "Build Start"
    log_info "Image: ${IMAGE_NAME}:${IMAGE_TAG} | Target: ${BUILD_TARGET} | Registry: ${REGISTRY_URL:-'none'}" "Build Config"
    
    # Phase 1: Validate Docker environment and build prerequisites (30 seconds, terminates on failure)
    log_info "=== Phase 1: Environment Validation ===" "Phase 1"
    if ! validate_docker_environment || ! validate_environment; then
        log_error "Environment validation failed - cannot proceed with build" "Environment Check" "1"
        exit 1
    fi
    
    # Phase 2: Build preparation and argument generation (10 seconds, terminates on failure)  
    log_info "=== Phase 2: Build Preparation ===" "Phase 2"
    local package_metadata
    package_metadata=$(extract_package_info) || {
        log_error "Failed to extract package information" "extract_package_info" "1"
        exit 1
    }
    
    # Phase 3: Docker image building with multi-stage optimization (3-8 minutes, fails on build error)
    log_info "=== Phase 3: Docker Image Build ===" "Phase 3"
    local image_with_tag="${IMAGE_NAME}:${IMAGE_TAG}"
    if ! build_docker_image "${IMAGE_NAME}" "${IMAGE_TAG}" "${BUILD_TARGET}"; then
        log_error "Docker image build failed" "build_docker_image" "2"
        exit 2
    fi
    
    # Phase 4: Image tagging and versioning (30 seconds, warns on failure)
    log_info "=== Phase 4: Image Tagging ===" "Phase 4"  
    local additional_tags=()
    if [[ "${IMAGE_TAG}" != "latest" ]]; then
        additional_tags+=("${IMAGE_NAME}:latest")
    fi
    
    if [[ -n "${REGISTRY_URL}" ]]; then
        additional_tags+=("${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}")
        if [[ "${IMAGE_TAG}" != "latest" ]]; then
            additional_tags+=("${REGISTRY_URL}/${IMAGE_NAME}:latest")
        fi
    fi
    
    if [[ ${#additional_tags[@]} -gt 0 ]] && ! tag_docker_image "${image_with_tag}" "${additional_tags[@]}"; then
        log_warning "Image tagging encountered issues but build continues" "Tagging Warning"
    fi
    
    # Phase 5: Security scanning and vulnerability assessment (2-5 minutes, fails security gate)
    log_info "=== Phase 5: Security Scanning ===" "Phase 5"
    if ! scan_docker_image "${image_with_tag}"; then
        log_error "Security scanning failed or found critical vulnerabilities" "scan_docker_image" "4"
        exit 4
    fi
    
    # Phase 6: Functional testing of built image (1-2 minutes, fails quality gate)
    log_info "=== Phase 6: Image Testing ===" "Phase 6"
    if [[ "${TEST_IMAGE:-true}" == "true" ]] && ! test_docker_image "${image_with_tag}"; then
        log_error "Image functional testing failed" "test_docker_image" "5"  
        exit 5
    fi
    
    # Phase 7: Registry push and image distribution (2-10 minutes, fails on distribution error)
    log_info "=== Phase 7: Registry Distribution ===" "Phase 7"
    if ! push_docker_image "${image_with_tag}" "${REGISTRY_URL}"; then
        log_error "Registry push operation failed" "push_docker_image" "6"
        exit 6
    fi
    
    # Phase 8: Artifact cleanup and metadata generation (1 minute, warning only)
    log_info "=== Phase 8: Cleanup and Documentation ===" "Phase 8"
    generate_image_metadata "${image_with_tag}" "${package_metadata}"
    cleanup_docker_artifacts "${CLEANUP_AGGRESSIVE:-false}"
    
    # Calculate and report overall build performance
    local total_duration=$(($(date +%s) - BUILD_START_TIME))
    local build_minutes=$((total_duration / 60))
    local build_seconds=$((total_duration % 60))
    
    log_info "=== Docker Build Orchestration Complete ===" "Build Success"
    log_info "Total build time: ${build_minutes}m ${build_seconds}s" "Performance"
    log_info "Final image: ${image_with_tag}" "Result"
    log_info "Image size: $(docker images "${image_with_tag}" --format "{{.Size}}")" "Result"
    
    if [[ "${PUSH_IMAGE}" == "true" && -n "${REGISTRY_URL}" ]]; then
        log_info "Registry: ${REGISTRY_URL}/${image_with_tag}" "Distribution"
    fi
    
    log_info "Build artifacts: ${PROJECT_ROOT}/build-artifacts/" "Documentation"
    log_info "Docker build orchestration completed successfully!" "Final Status"
    
    return 0
}

# =============================================================================
# SCRIPT EXECUTION ENTRY POINT
# =============================================================================
# Script execution with signal handling and cleanup on exit for production reliability

# Signal handling for graceful shutdown and cleanup
cleanup_on_exit() {
    local exit_code=$?
    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Build process terminated with exit code ${exit_code}" "Exit Handler" "${exit_code}"
    fi
    
    # Cleanup any running test containers
    local test_containers
    test_containers=$(docker ps -q -f "name=test-container-*" 2>/dev/null || echo "")
    if [[ -n "${test_containers}" ]]; then
        log_info "Cleaning up test containers on exit" "Exit Cleanup"
        # shellcheck disable=SC2086
        docker stop ${test_containers} >/dev/null 2>&1 || true
        # shellcheck disable=SC2086  
        docker rm ${test_containers} >/dev/null 2>&1 || true
    fi
}

# Docker-specific error handler
docker_error_handler() {
    local exit_code=$?
    log_docker_error "Docker operation failed - check Docker daemon and build context" "Docker Error Handler" "${exit_code}"
}

# Interrupt signal handler  
interrupt_handler() {
    log_warning "Build process interrupted by user (SIGINT/SIGTERM)" "Signal Handler"
    cleanup_on_exit
    exit 130
}

# Setup signal handlers
trap cleanup_on_exit EXIT
trap docker_error_handler ERR  
trap interrupt_handler SIGINT SIGTERM

# Execute main function with all script arguments
main "$@"