#!/bin/bash
# =============================================================================
# Node.js Tutorial Application - Docker Container Execution Orchestration Script
# =============================================================================
# Comprehensive Docker container execution orchestration script for the Node.js tutorial application
# that provides intelligent container lifecycle management with support for development and production
# deployment scenarios, environment configuration, port management, volume mounting, and health
# monitoring. Implements Docker best practices while maintaining educational clarity for learning
# containerized Node.js application deployment patterns with Express.js 5.1.0 and Node.js 22.x LTS.
#
# Features:
# - Development and production container execution modes with environment-specific optimizations
# - Docker Compose integration for multi-service orchestration and development workflows
# - Comprehensive health monitoring with application endpoint testing and container health checks
# - Container lifecycle management with graceful shutdown handling and cleanup operations
# - Environment configuration management with .env file loading and validation
# - Port management with conflict detection and automatic port binding configuration
# - Volume mounting support for development workflows with hot-reload and debugging capabilities
# - Educational guidance and troubleshooting information throughout the execution process
# - Integration with docker-build.sh for complete build-run workflow orchestration
# - Production-ready deployment patterns with security hardening and resource management
# - Container orchestration patterns demonstrating modern Docker deployment practices
# - Interactive debugging support with Node.js inspector port exposure and container access
#
# Usage Examples:
#   ./docker-run.sh                                          # Run production container with default settings
#   ./docker-run.sh --mode development                       # Run development container with hot-reload
#   ./docker-run.sh --mode compose                           # Use Docker Compose orchestration
#   ./docker-run.sh --port 8080 --detach                     # Run on port 8080 in background
#   ./docker-run.sh --interactive --mount-source             # Interactive development with source mounting
#   ./docker-run.sh --test --no-health-check                 # Run with functional testing, skip health checks
#
# Environment Variables:
#   IMAGE_NAME              Docker image name (default: nodejs-hello-tutorial)
#   IMAGE_TAG               Docker image tag (default: latest)
#   CONTAINER_NAME          Container name (default: nodejs-tutorial-container)
#   RUN_MODE                Execution mode: development|production|compose (default: production)
#   PORT                    Application port (default: 3000)
#   HOST_PORT               Host port mapping (default: PORT value)
#   NODE_ENV                Node.js environment (default: development)
#   DETACHED_MODE           Run in detached mode (default: false)
#   REMOVE_CONTAINER        Remove container after exit (default: true)
#   INTERACTIVE_MODE        Enable interactive terminal (default: false)
#   MOUNT_SOURCE            Mount source code for development (default: false)
#   ENV_FILE                Environment file path (default: .env)
#   NETWORK_NAME            Docker network name (default: nodejs-tutorial-network)
#   COMPOSE_FILE            Docker Compose file path (default: docker-compose.yml)
#   HEALTH_CHECK_ENABLED    Enable health check monitoring (default: true)
#   HEALTH_CHECK_TIMEOUT    Health check timeout seconds (default: 30)
#   MEMORY_LIMIT            Container memory limit (default: 512m)
#   CPU_LIMIT               Container CPU limit (default: 0.5)
#   LOG_DRIVER              Container logging driver (default: json-file)

set -euo pipefail

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================
# Script and project directory configuration with dynamic path resolution
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Container configuration with environment variable defaults and educational context
readonly IMAGE_NAME="${IMAGE_NAME:-nodejs-hello-tutorial}"
readonly IMAGE_TAG="${IMAGE_TAG:-latest}"
readonly CONTAINER_NAME="${CONTAINER_NAME:-nodejs-tutorial-container}"
readonly RUN_MODE="${RUN_MODE:-production}"
readonly PORT="${PORT:-3000}"
readonly HOST_PORT="${HOST_PORT:-${PORT}}"
readonly ENVIRONMENT="${NODE_ENV:-development}"

# Docker execution options and operational flags for container management
readonly DETACHED_MODE="${DETACHED_MODE:-false}"
readonly REMOVE_CONTAINER="${REMOVE_CONTAINER:-true}"
readonly INTERACTIVE_MODE="${INTERACTIVE_MODE:-false}"
readonly MOUNT_SOURCE="${MOUNT_SOURCE:-false}"
readonly ENV_FILE="${ENV_FILE:-.env}"
readonly NETWORK_NAME="${NETWORK_NAME:-nodejs-tutorial-network}"
readonly COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

# Health check and monitoring configuration for container reliability
readonly HEALTH_CHECK_ENABLED="${HEALTH_CHECK_ENABLED:-true}"
readonly HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"

# Resource limits and performance configuration for production deployment
readonly MEMORY_LIMIT="${MEMORY_LIMIT:-512m}"
readonly CPU_LIMIT="${CPU_LIMIT:-0.5}"
readonly LOG_DRIVER="${LOG_DRIVER:-json-file}"

# ANSI color codes for structured logging and educational output formatting
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_RESET='\033[0m'

# =============================================================================
# IMPORT SHARED UTILITIES FROM DOCKER-BUILD.SH
# =============================================================================
# Import logging and validation functions from docker-build.sh to maintain consistency
# and avoid code duplication while providing comprehensive error handling and user experience
readonly DOCKER_BUILD_SCRIPT="${SCRIPT_DIR}/docker-build.sh"

# Verify docker-build.sh exists for function imports
if [[ ! -f "${DOCKER_BUILD_SCRIPT}" ]]; then
    printf "${COLOR_RED}[ERROR]${COLOR_RESET} docker-build.sh not found at ${DOCKER_BUILD_SCRIPT}\n" >&2
    printf "${COLOR_RED}[ERROR]${COLOR_RESET} Required for shared logging and validation utilities\n" >&2
    exit 1
fi

# Source shared logging and validation functions from docker-build.sh
# shellcheck source=./docker-build.sh
source "${DOCKER_BUILD_SCRIPT}"

# =============================================================================
# CONTAINER RUN LOGGING FUNCTIONS
# =============================================================================
# Enhanced logging functions specific to Docker container execution with educational context
# and integration with shared utilities from docker-build.sh for consistent user experience

# Log informational messages with Docker run context and container management information
log_info() {
    local message="$1"
    local context="${2:-Docker Run}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    printf "${COLOR_GREEN}[DOCKER-RUN]${COLOR_RESET} [%s] [%s] %s\n" \
        "${timestamp}" "${context}" "${message}" >&1
    
    # Additional container context for educational purposes
    if [[ "${context}" == "Container Management" ]]; then
        printf "${COLOR_BLUE}[INFO]${COLOR_RESET} Container: %s | Mode: %s | Port: %s\n" \
            "${CONTAINER_NAME}" "${RUN_MODE}" "${HOST_PORT}" >&1
    fi
}

# Log error messages with detailed Docker run context and troubleshooting guidance
log_error() {
    local error_message="$1"
    local docker_command="${2:-Unknown command}"
    local exit_code="${3:-1}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    printf "${COLOR_RED}[DOCKER-RUN ERROR]${COLOR_RESET} [%s] %s\n" "${timestamp}" "${error_message}" >&2
    printf "${COLOR_RED}[DOCKER-RUN ERROR]${COLOR_RESET} Failed Docker command: %s (exit code: %s)\n" "${docker_command}" "${exit_code}" >&2
    printf "${COLOR_RED}[DOCKER-RUN ERROR]${COLOR_RESET} Troubleshooting: Check container status: docker ps -a | grep ${CONTAINER_NAME}\n" >&2
    printf "${COLOR_RED}[DOCKER-RUN ERROR]${COLOR_RESET} Container logs: docker logs ${CONTAINER_NAME}\n" >&2
    printf "${COLOR_RED}[DOCKER-RUN ERROR]${COLOR_RESET} Port conflicts: netstat -tulpn | grep ${HOST_PORT}\n" >&2
}

# Log warning messages for non-critical issues during Docker container execution
log_warning() {
    local warning_message="$1"
    local context="${2:-Docker Run}"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    printf "${COLOR_YELLOW}[DOCKER-RUN WARNING]${COLOR_RESET} [%s] [%s] %s\n" \
        "${timestamp}" "${context}" "${warning_message}" >&1
}

# =============================================================================
# USAGE AND HELP FUNCTIONS
# =============================================================================
# Comprehensive usage information and educational guidance for Docker container execution
# with examples, troubleshooting information, and learning objectives

# Display comprehensive usage information and available command-line options
usage() {
    cat << EOF
${COLOR_BLUE}Node.js Tutorial Docker Container Execution Orchestration Script${COLOR_RESET}

${COLOR_GREEN}DESCRIPTION${COLOR_RESET}
    Comprehensive Docker container execution orchestration for the Node.js tutorial application
    with intelligent lifecycle management, health monitoring, and educational best practices.
    Supports development, production, and Docker Compose deployment scenarios with Express.js 5.1.0
    and Node.js 22.x LTS runtime environment.

${COLOR_GREEN}USAGE${COLOR_RESET}
    $0 [OPTIONS]

${COLOR_GREEN}OPTIONS${COLOR_RESET}
    -h, --help              Display this comprehensive usage information
    -i, --image NAME        Specify Docker image name (default: ${IMAGE_NAME})
    -t, --tag TAG           Set image tag (default: ${IMAGE_TAG})
    -n, --name NAME         Set container name (default: ${CONTAINER_NAME})
    -m, --mode MODE         Set run mode: development|production|compose (default: ${RUN_MODE})
    -p, --port PORT         Set host port mapping (default: ${HOST_PORT})
    -d, --detach            Run container in detached mode
    -it, --interactive      Run container in interactive mode with terminal
    --mount-source          Mount source code for development (implies development mode)
    --env-file FILE         Specify environment file (default: ${ENV_FILE})
    --network NAME          Set Docker network name (default: ${NETWORK_NAME})
    --compose               Use Docker Compose for orchestration
    --no-remove             Keep container after exit
    --no-health-check       Disable health check monitoring
    --memory LIMIT          Set memory limit (default: ${MEMORY_LIMIT})
    --cpu LIMIT             Set CPU limit (default: ${CPU_LIMIT})
    --test                  Run functional tests after container start
    --clean                 Clean up existing containers before running

${COLOR_GREEN}ENVIRONMENT VARIABLES${COLOR_RESET}
    IMAGE_NAME              Docker image name (default: nodejs-hello-tutorial)
    IMAGE_TAG               Docker image tag (default: latest)
    CONTAINER_NAME          Container name (default: nodejs-tutorial-container)
    RUN_MODE                Execution mode (default: production)
    PORT                    Application port (default: 3000)
    HOST_PORT               Host port mapping (default: PORT value)
    NODE_ENV                Node.js environment (default: development)
    DETACHED_MODE           Run in detached mode (default: false)
    INTERACTIVE_MODE        Enable interactive terminal (default: false)
    MOUNT_SOURCE            Mount source code for development (default: false)
    HEALTH_CHECK_ENABLED    Enable health monitoring (default: true)
    MEMORY_LIMIT            Container memory limit (default: 512m)
    CPU_LIMIT               Container CPU limit (default: 0.5)

${COLOR_GREEN}RUN MODES${COLOR_RESET}
    development     Development mode with hot-reload, debugging, and development optimizations
                    - Source code volume mounting for live reload capabilities
                    - Node.js debugger port exposure (9229) for Chrome DevTools integration
                    - Interactive terminal and stdin for debugging sessions
                    - Development environment variables (NODE_ENV=development, DEBUG=true)
                    - Enhanced logging and error reporting for development workflow
                    - npm run dev command execution with nodemon for automatic restarts

    production      Production mode with security hardening and performance optimization
                    - Production environment variables (NODE_ENV=production)
                    - Security hardening with non-root user execution
                    - Resource limits and performance monitoring capabilities
                    - Health checks and restart policies for reliability
                    - Production logging configuration for monitoring integration
                    - npm start command execution for optimized production startup

    compose         Docker Compose orchestration for multi-service development environment
                    - Full service orchestration with docker-compose for complex deployments
                    - Network and volume management with service dependencies
                    - Service health checks and dependency coordination
                    - Environment-specific compose profiles for different deployment scenarios

${COLOR_GREEN}EXAMPLES${COLOR_RESET}
    # Run production container with default settings
    $0

    # Run development container with hot-reload and debugging
    $0 --mode development --interactive

    # Use Docker Compose for full orchestration
    $0 --mode compose

    # Run on custom port with detached mode
    $0 --port 8080 --detach

    # Development mode with source mounting and custom network
    $0 --mode development --mount-source --network my-dev-network

    # Production mode with resource limits and health monitoring
    $0 --mode production --memory 1g --cpu 1.0

    # Interactive debugging session with mounted source
    $0 --interactive --mount-source --no-remove

    # Clean existing containers and run with functional testing
    $0 --clean --test --mode production

${COLOR_GREEN}EDUCATIONAL FEATURES${COLOR_RESET}
    - Container lifecycle management demonstration with graceful shutdown handling
    - Health monitoring integration showing Docker health check patterns
    - Development workflow optimization with live code reloading and debugging
    - Production deployment patterns with security hardening and resource limits
    - Docker networking and volume management for multi-container applications
    - Container orchestration preparation for Kubernetes and Docker Swarm
    - Real-time feedback and troubleshooting guidance throughout execution

${COLOR_GREEN}TROUBLESHOOTING${COLOR_RESET}
    - Container won't start: Check image availability and port conflicts
    - Port already in use: Use --port to specify alternative port
    - Permission denied: Ensure Docker daemon is running and accessible
    - Health check failures: Verify application endpoints are responding
    - Out of memory: Adjust --memory limit or check container resource usage
    - Network issues: Verify Docker network configuration and connectivity

${COLOR_GREEN}INTEGRATION${COLOR_RESET}
    - Works with docker-build.sh for complete build-run workflow
    - Integrates with Docker Compose for multi-service development
    - Compatible with CI/CD pipelines for automated deployment
    - Supports Kubernetes deployment preparation and migration

For detailed documentation: https://docs.docker.com/engine/reference/run/
EOF
}

# =============================================================================
# ENVIRONMENT VALIDATION AND PREPARATION
# =============================================================================
# Comprehensive validation of Docker environment and container execution prerequisites
# with detailed error reporting and troubleshooting guidance for educational purposes

# Validate Docker environment and container execution prerequisites
validate_run_environment() {
    log_info "Validating Docker environment and container execution prerequisites" "Environment Check"
    
    # Use shared validation function from docker-build.sh for consistency
    if ! validate_docker_environment; then
        log_error "Docker environment validation failed" "validate_docker_environment" "1"
        return 1
    fi
    
    # Additional container run-specific validations
    log_info "Performing container execution specific validations" "Run Validation"
    
    # Check if specified network exists or can be created
    if [[ "${NETWORK_NAME}" != "bridge" && "${NETWORK_NAME}" != "host" ]]; then
        if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
            log_warning "Network '${NETWORK_NAME}' does not exist - will be created if needed" "Network Check"
        fi
    fi
    
    # Validate environment file if specified
    if [[ -n "${ENV_FILE}" && "${ENV_FILE}" != ".env" ]]; then
        if [[ ! -f "${PROJECT_ROOT}/${ENV_FILE}" ]]; then
            log_warning "Environment file '${ENV_FILE}' not found - using default configuration" "Environment File"
        else
            log_info "Environment file '${ENV_FILE}' found and will be loaded" "Environment File"
        fi
    fi
    
    # Check for Docker Compose if compose mode is selected
    if [[ "${RUN_MODE}" == "compose" ]]; then
        if ! command -v docker-compose >/dev/null 2>&1; then
            log_error "Docker Compose not found but required for compose mode" "docker-compose check" "1"
            return 1
        fi
        
        if [[ ! -f "${PROJECT_ROOT}/${COMPOSE_FILE}" ]]; then
            log_error "Docker Compose file '${COMPOSE_FILE}' not found" "compose file check" "1"
            return 1
        fi
    fi
    
    log_info "Docker environment validation completed successfully" "Environment Check"
    return 0
}

# Check if Docker image exists locally or attempt to pull from registry
check_image_availability() {
    local image_name_with_tag="$1"
    
    log_info "Checking Docker image availability: ${image_name_with_tag}" "Image Check"
    
    # Check if image exists locally
    if docker images "${image_name_with_tag}" --format "{{.Repository}}:{{.Tag}}" | grep -q "${image_name_with_tag}"; then
        local image_size
        image_size=$(docker images "${image_name_with_tag}" --format "{{.Size}}")
        log_info "Image found locally: ${image_name_with_tag} (${image_size})" "Image Check"
        return 0
    fi
    
    # Attempt to pull image from registry
    log_info "Image not found locally, attempting to pull from registry" "Image Pull"
    
    if docker pull "${image_name_with_tag}"; then
        log_info "Successfully pulled image: ${image_name_with_tag}" "Image Pull"
        return 0
    else
        log_error "Failed to pull image: ${image_name_with_tag}" "docker pull ${image_name_with_tag}" "$?"
        log_error "Build the image first using: ./docker-build.sh --image ${IMAGE_NAME} --tag ${IMAGE_TAG}"
        return 1
    fi
}

# Prepare container execution environment including networks, volumes, and configuration
prepare_environment() {
    log_info "Preparing container execution environment" "Environment Prep"
    
    # Create Docker network if it doesn't exist (unless using bridge or host)
    if [[ "${NETWORK_NAME}" != "bridge" && "${NETWORK_NAME}" != "host" ]]; then
        if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
            log_info "Creating Docker network: ${NETWORK_NAME}" "Network Creation"
            if docker network create "${NETWORK_NAME}"; then
                log_info "Successfully created network: ${NETWORK_NAME}" "Network Creation"
            else
                log_warning "Failed to create network, will use default bridge network" "Network Creation"
                NETWORK_NAME="bridge"
            fi
        else
            log_info "Using existing network: ${NETWORK_NAME}" "Network Check"
        fi
    fi
    
    # Load environment variables from .env file if present
    local env_file_path="${PROJECT_ROOT}/${ENV_FILE}"
    if [[ -f "${env_file_path}" ]]; then
        log_info "Loading environment variables from: ${env_file_path}" "Environment Loading"
        # Export variables for Docker run command
        set -a
        # shellcheck source=/dev/null
        source "${env_file_path}"
        set +a
    else
        log_info "No environment file found, using default configuration" "Environment Loading"
    fi
    
    # Validate port availability
    if netstat -tulpn 2>/dev/null | grep -q ":${HOST_PORT} "; then
        log_warning "Port ${HOST_PORT} appears to be in use" "Port Check"
        if [[ "${DETACHED_MODE}" == "false" ]]; then
            log_info "Will attempt to bind anyway - Docker will report if port is unavailable" "Port Check"
        fi
    else
        log_info "Port ${HOST_PORT} is available for binding" "Port Check"
    fi
    
    # Create log directories if needed
    if [[ ! -d "${PROJECT_ROOT}/logs" ]]; then
        mkdir -p "${PROJECT_ROOT}/logs" 2>/dev/null || true
    fi
    
    log_info "Environment preparation completed successfully" "Environment Prep"
    return 0
}

# =============================================================================
# DOCKER RUN COMMAND GENERATION
# =============================================================================
# Generate comprehensive Docker run commands with all appropriate flags, volumes,
# and configuration based on run mode and deployment scenario

# Generate Docker run command with all appropriate flags and configuration
generate_run_command() {
    local run_mode="$1"
    local image_name_with_tag="${IMAGE_NAME}:${IMAGE_TAG}"
    
    log_info "Generating Docker run command for mode: ${run_mode}" "Command Generation"
    
    # Start with base docker run command
    local docker_cmd="docker run"
    
    # Container naming and cleanup options
    docker_cmd+=" --name ${CONTAINER_NAME}"
    
    if [[ "${REMOVE_CONTAINER}" == "true" ]]; then
        docker_cmd+=" --rm"
    fi
    
    # Detached vs interactive mode
    if [[ "${DETACHED_MODE}" == "true" ]]; then
        docker_cmd+=" -d"
    elif [[ "${INTERACTIVE_MODE}" == "true" ]]; then
        docker_cmd+=" -it"
    fi
    
    # Port mapping for HTTP server access
    docker_cmd+=" -p ${HOST_PORT}:${PORT}"
    
    # Development mode specific configurations
    if [[ "${run_mode}" == "development" ]]; then
        # Expose Node.js debugger port for development
        docker_cmd+=" -p 9229:9229"
        
        # Mount source code for live reload if requested
        if [[ "${MOUNT_SOURCE}" == "true" ]]; then
            docker_cmd+=" -v ${PROJECT_ROOT}/src:/usr/src/app/src:cached"
            docker_cmd+=" -v ${PROJECT_ROOT}/config:/usr/src/app/config:cached"
        fi
        
        # Development environment variables
        docker_cmd+=" -e NODE_ENV=development"
        docker_cmd+=" -e DEBUG=*"
        docker_cmd+=" -e LOG_LEVEL=debug"
        docker_cmd+=" -e VERBOSE=true"
    else
        # Production environment variables
        docker_cmd+=" -e NODE_ENV=production"
        docker_cmd+=" -e LOG_LEVEL=warn"
    fi
    
    # Common environment variables
    docker_cmd+=" -e PORT=${PORT}"
    docker_cmd+=" -e HOST=0.0.0.0"
    
    # Load environment file if present
    local env_file_path="${PROJECT_ROOT}/${ENV_FILE}"
    if [[ -f "${env_file_path}" ]]; then
        docker_cmd+=" --env-file ${env_file_path}"
    fi
    
    # Resource limits
    if [[ -n "${MEMORY_LIMIT}" ]]; then
        docker_cmd+=" --memory ${MEMORY_LIMIT}"
    fi
    
    if [[ -n "${CPU_LIMIT}" ]]; then
        docker_cmd+=" --cpus ${CPU_LIMIT}"
    fi
    
    # Network configuration
    if [[ "${NETWORK_NAME}" != "bridge" ]]; then
        docker_cmd+=" --network ${NETWORK_NAME}"
    fi
    
    # Logging configuration
    docker_cmd+=" --log-driver ${LOG_DRIVER}"
    docker_cmd+=" --log-opt max-size=10m"
    docker_cmd+=" --log-opt max-file=3"
    
    # Health check configuration (if not disabled)
    if [[ "${HEALTH_CHECK_ENABLED}" == "true" ]]; then
        docker_cmd+=" --health-interval=30s"
        docker_cmd+=" --health-timeout=3s"
        docker_cmd+=" --health-start-period=5s"
        docker_cmd+=" --health-retries=3"
    fi
    
    # Add image name
    docker_cmd+=" ${image_name_with_tag}"
    
    log_info "Generated Docker run command: ${docker_cmd}" "Command Generation"
    echo "${docker_cmd}"
}

# =============================================================================
# CONTAINER EXECUTION FUNCTIONS
# =============================================================================
# Core container execution functions for different run modes with comprehensive
# monitoring, error handling, and educational guidance

# Execute Docker container in development mode with hot-reload and debugging
run_development_container() {
    local image_name_with_tag="$1"
    
    log_info "Starting development container with hot-reload and debugging capabilities" "Development Mode"
    log_info "Development features: source mounting, debugger port (9229), interactive terminal" "Development Mode"
    
    # Generate development-specific run command
    local run_command
    run_command=$(generate_run_command "development")
    
    # Execute the Docker run command
    log_info "Executing development container: ${run_command}" "Container Start"
    
    # Add educational context about development mode
    if [[ "${INTERACTIVE_MODE}" == "true" ]]; then
        log_info "Interactive mode enabled - you can access the container shell" "Development Mode"
        log_info "Access debugger: Chrome DevTools -> chrome://inspect -> localhost:9229" "Development Mode"
    fi
    
    if [[ "${MOUNT_SOURCE}" == "true" ]]; then
        log_info "Source code mounted - changes will trigger hot reload via nodemon" "Development Mode"
    fi
    
    # Execute the container
    if eval "${run_command}"; then
        log_info "Development container executed successfully" "Development Mode"
        return 0
    else
        local exit_code=$?
        log_error "Development container execution failed" "${run_command}" "${exit_code}"
        return "${exit_code}"
    fi
}

# Execute Docker container in production mode with security hardening
run_production_container() {
    local image_name_with_tag="$1"
    
    log_info "Starting production container with security hardening and performance optimization" "Production Mode"
    log_info "Production features: resource limits, health checks, security hardening" "Production Mode"
    
    # Generate production-specific run command
    local run_command
    run_command=$(generate_run_command "production")
    
    # Execute the Docker run command
    log_info "Executing production container: ${run_command}" "Container Start"
    
    # Add educational context about production mode
    log_info "Production mode: non-root execution, resource limits, health monitoring" "Production Mode"
    log_info "Monitor container: docker stats ${CONTAINER_NAME}" "Production Mode"
    
    # Execute the container
    if eval "${run_command}"; then
        log_info "Production container executed successfully" "Production Mode"
        return 0
    else
        local exit_code=$?
        log_error "Production container execution failed" "${run_command}" "${exit_code}"
        return "${exit_code}"
    fi
}

# Execute Docker Compose for development environment orchestration
run_compose_development() {
    log_info "Starting Docker Compose orchestration for development environment" "Compose Mode"
    
    local compose_file_path="${PROJECT_ROOT}/${COMPOSE_FILE}"
    
    # Validate Docker Compose file
    if ! docker-compose -f "${compose_file_path}" config >/dev/null 2>&1; then
        log_error "Docker Compose file validation failed" "docker-compose config" "1"
        return 1
    fi
    
    # Generate docker-compose command
    local compose_cmd="docker-compose -f ${compose_file_path}"
    
    if [[ "${DETACHED_MODE}" == "true" ]]; then
        compose_cmd+=" up -d"
    else
        compose_cmd+=" up"
    fi
    
    log_info "Executing Docker Compose: ${compose_cmd}" "Compose Execution"
    log_info "Compose features: service orchestration, network management, volume persistence" "Compose Mode"
    
    # Execute Docker Compose
    if eval "${compose_cmd}"; then
        log_info "Docker Compose executed successfully" "Compose Mode"
        log_info "Access services: docker-compose -f ${compose_file_path} ps" "Compose Mode"
        log_info "View logs: docker-compose -f ${compose_file_path} logs -f nodejs-tutorial-dev" "Compose Mode"
        return 0
    else
        local exit_code=$?
        log_error "Docker Compose execution failed" "${compose_cmd}" "${exit_code}"
        return "${exit_code}"
    fi
}

# =============================================================================
# CONTAINER MONITORING AND HEALTH CHECK FUNCTIONS
# =============================================================================
# Comprehensive container health monitoring and application endpoint testing
# with real-time feedback and troubleshooting guidance

# Monitor container health status and provide real-time feedback
monitor_container_health() {
    local container_name="$1"
    local timeout_seconds="${2:-${HEALTH_CHECK_TIMEOUT}}"
    
    if [[ "${HEALTH_CHECK_ENABLED}" != "true" ]]; then
        log_info "Health check monitoring disabled" "Health Monitor"
        return 0
    fi
    
    log_info "Monitoring container health: ${container_name} (timeout: ${timeout_seconds}s)" "Health Monitor"
    
    local start_time
    start_time=$(date +%s)
    local current_time
    local elapsed_time=0
    
    # Wait for container to start and begin health checks
    while [[ ${elapsed_time} -lt ${timeout_seconds} ]]; do
        # Check if container is running
        if ! docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            log_error "Container ${container_name} is not running" "Health Monitor" "1"
            return 1
        fi
        
        # Check Docker health status if available
        local health_status
        health_status=$(docker inspect "${container_name}" --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")
        
        if [[ "${health_status}" == "healthy" ]]; then
            log_info "Container health check passed: ${health_status}" "Health Monitor"
            return 0
        elif [[ "${health_status}" == "unhealthy" ]]; then
            log_warning "Container health check failed: ${health_status}" "Health Monitor"
            # Continue monitoring in case it recovers
        elif [[ "${health_status}" == "starting" ]]; then
            log_info "Container health check starting..." "Health Monitor"
        fi
        
        # Test application endpoints directly
        if curl -sf "http://localhost:${HOST_PORT}/health" >/dev/null 2>&1; then
            log_info "Application health endpoint responding successfully" "Health Monitor"
            return 0
        fi
        
        sleep 2
        current_time=$(date +%s)
        elapsed_time=$((current_time - start_time))
        
        if [[ $((elapsed_time % 10)) -eq 0 ]]; then
            log_info "Health monitoring... ${elapsed_time}s elapsed" "Health Monitor"
        fi
    done
    
    log_error "Container health check timeout after ${timeout_seconds} seconds" "Health Monitor" "1"
    
    # Provide troubleshooting information
    log_info "Troubleshooting: Container status: $(docker ps --filter name=${container_name} --format 'table {{.Status}}')" "Health Monitor"
    log_info "Troubleshooting: Container logs: docker logs ${container_name}" "Health Monitor"
    
    return 1
}

# Perform basic functional testing of running container
test_container_functionality() {
    local container_name="$1"
    local port_number="${2:-${HOST_PORT}}"
    
    log_info "Performing functional tests on container: ${container_name}" "Container Testing"
    
    # Wait for application to be ready
    local max_wait=30
    local wait_count=0
    
    while [[ ${wait_count} -lt ${max_wait} ]]; do
        if curl -sf "http://localhost:${port_number}/health" >/dev/null 2>&1; then
            break
        fi
        sleep 1
        ((wait_count++))
    done
    
    if [[ ${wait_count} -eq ${max_wait} ]]; then
        log_error "Application failed to start within ${max_wait} seconds" "Container Testing" "1"
        return 1
    fi
    
    local test_failures=0
    
    # Test /health endpoint
    log_info "Testing /health endpoint..." "Endpoint Test"
    local health_status
    health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port_number}/health" 2>/dev/null || echo "000")
    
    if [[ "${health_status}" == "200" ]]; then
        log_info "✓ Health endpoint test passed (HTTP ${health_status})" "Endpoint Test"
    else
        log_error "✗ Health endpoint test failed (HTTP ${health_status})" "Endpoint Test" "1"
        ((test_failures++))
    fi
    
    # Test /hello endpoint
    log_info "Testing /hello endpoint..." "Endpoint Test"
    local hello_response
    hello_response=$(curl -s "http://localhost:${port_number}/hello" 2>/dev/null || echo "")
    
    if [[ "${hello_response}" == "Hello world" ]]; then
        log_info "✓ Hello endpoint test passed: '${hello_response}'" "Endpoint Test"
    else
        log_error "✗ Hello endpoint test failed - expected 'Hello world', got '${hello_response}'" "Endpoint Test" "1"
        ((test_failures++))
    fi
    
    # Test response headers
    log_info "Testing response headers..." "Header Test"
    local content_type
    content_type=$(curl -s -I "http://localhost:${port_number}/hello" | grep -i "content-type" | cut -d' ' -f2- | tr -d '\r\n' || echo "")
    
    if [[ "${content_type}" == *"text/plain"* ]]; then
        log_info "✓ Content-Type header test passed: ${content_type}" "Header Test"
    else
        log_warning "⚠ Content-Type header unexpected: ${content_type}" "Header Test"
    fi
    
    # Performance test
    log_info "Testing response performance..." "Performance Test"
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${port_number}/hello" 2>/dev/null || echo "999")
    response_time_ms=$(echo "${response_time} * 1000" | bc -l 2>/dev/null | cut -d. -f1)
    
    if [[ ${response_time_ms:-999} -lt 100 ]]; then
        log_info "✓ Performance test passed: ${response_time_ms}ms response time" "Performance Test"
    else
        log_warning "⚠ Slow response time: ${response_time_ms}ms" "Performance Test"
    fi
    
    if [[ ${test_failures} -eq 0 ]]; then
        log_info "All functional tests passed successfully" "Container Testing"
        return 0
    else
        log_error "${test_failures} functional tests failed" "Container Testing" "${test_failures}"
        return 1
    fi
}

# =============================================================================
# CONTAINER CLEANUP AND SIGNAL HANDLING
# =============================================================================
# Graceful container cleanup and signal handling for production reliability
# and development workflow optimization

# Clean up container resources including stopped containers and networks
cleanup_container() {
    local container_name="$1"
    local force_cleanup="${2:-false}"
    
    log_info "Cleaning up container resources: ${container_name}" "Cleanup"
    
    # Stop running container gracefully
    if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        log_info "Stopping running container: ${container_name}" "Container Stop"
        if docker stop "${container_name}" >/dev/null 2>&1; then
            log_info "Container stopped successfully" "Container Stop"
        else
            log_warning "Failed to stop container gracefully, forcing stop" "Container Stop"
            docker kill "${container_name}" >/dev/null 2>&1 || true
        fi
    fi
    
    # Remove container if it exists and removal is enabled
    if [[ "${REMOVE_CONTAINER}" == "true" || "${force_cleanup}" == "true" ]]; then
        if docker ps -a --format "{{.Names}}" | grep -q "^${container_name}$"; then
            log_info "Removing container: ${container_name}" "Container Remove"
            if docker rm "${container_name}" >/dev/null 2>&1; then
                log_info "Container removed successfully" "Container Remove"
            else
                log_warning "Failed to remove container" "Container Remove"
            fi
        fi
    fi
    
    # Clean up custom networks if no other containers are using them
    if [[ "${NETWORK_NAME}" != "bridge" && "${NETWORK_NAME}" != "host" ]]; then
        local network_containers
        network_containers=$(docker network inspect "${NETWORK_NAME}" --format='{{len .Containers}}' 2>/dev/null || echo "0")
        
        if [[ "${network_containers}" == "0" ]]; then
            log_info "Removing unused network: ${NETWORK_NAME}" "Network Cleanup"
            docker network rm "${NETWORK_NAME}" >/dev/null 2>&1 || true
        fi
    fi
    
    log_info "Container cleanup completed" "Cleanup"
}

# Handle interrupt signals for graceful container shutdown
handle_container_signals() {
    local container_name="$1"
    
    log_warning "Received interrupt signal - shutting down container gracefully" "Signal Handler"
    
    # Forward signal to running container
    if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        log_info "Forwarding shutdown signal to container: ${container_name}" "Signal Handler"
        docker kill --signal=SIGTERM "${container_name}" >/dev/null 2>&1 || true
        
        # Wait for graceful shutdown
        local wait_count=0
        while [[ ${wait_count} -lt 10 ]] && docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; do
            sleep 1
            ((wait_count++))
        done
        
        # Force kill if still running
        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            log_warning "Container did not stop gracefully, forcing termination" "Signal Handler"
            docker kill "${container_name}" >/dev/null 2>&1 || true
        fi
    fi
    
    cleanup_container "${container_name}" "true"
    log_info "Graceful shutdown completed" "Signal Handler"
}

# =============================================================================
# MAIN ORCHESTRATION FUNCTION
# =============================================================================
# Main orchestration function managing the complete Docker container execution
# process lifecycle with comprehensive error handling and educational guidance

# Main orchestration function managing Docker container execution lifecycle
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
            -n|--name)
                CONTAINER_NAME="$2"
                shift 2
                ;;
            -m|--mode)
                RUN_MODE="$2"
                shift 2
                ;;
            -p|--port)
                HOST_PORT="$2"
                shift 2
                ;;
            -d|--detach)
                DETACHED_MODE="true"
                shift
                ;;
            -it|--interactive)
                INTERACTIVE_MODE="true"
                shift
                ;;
            --mount-source)
                MOUNT_SOURCE="true"
                RUN_MODE="development"  # Implies development mode
                shift
                ;;
            --env-file)
                ENV_FILE="$2"
                shift 2
                ;;
            --network)
                NETWORK_NAME="$2"
                shift 2
                ;;
            --compose)
                RUN_MODE="compose"
                shift
                ;;
            --no-remove)
                REMOVE_CONTAINER="false"
                shift
                ;;
            --no-health-check)
                HEALTH_CHECK_ENABLED="false"
                shift
                ;;
            --memory)
                MEMORY_LIMIT="$2"
                shift 2
                ;;
            --cpu)
                CPU_LIMIT="$2"
                shift 2
                ;;
            --test)
                TEST_CONTAINER="true"
                shift
                ;;
            --clean)
                CLEAN_EXISTING="true"
                shift
                ;;
            *)
                log_error "Unknown option: $1" "$0 $*" "1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Display execution configuration and educational information
    log_info "Starting Docker container execution orchestration for Node.js tutorial application" "Orchestration Start"
    log_info "Configuration: Image=${IMAGE_NAME}:${IMAGE_TAG}, Container=${CONTAINER_NAME}, Mode=${RUN_MODE}, Port=${HOST_PORT}" "Configuration"
    
    # Set up signal handlers for graceful shutdown
    trap "handle_container_signals ${CONTAINER_NAME}" SIGINT SIGTERM
    
    # Clean up existing containers if requested
    if [[ "${CLEAN_EXISTING}" == "true" ]]; then
        log_info "Cleaning up existing containers before starting" "Cleanup"
        cleanup_container "${CONTAINER_NAME}" "true"
    fi
    
    # Phase 1: Environment validation and prerequisites
    log_info "=== Phase 1: Environment Validation ===" "Phase 1"
    if ! validate_run_environment; then
        log_error "Environment validation failed" "validate_run_environment" "1"
        exit 1
    fi
    
    # Phase 2: Image availability check
    log_info "=== Phase 2: Image Availability Check ===" "Phase 2"
    local image_with_tag="${IMAGE_NAME}:${IMAGE_TAG}"
    if ! check_image_availability "${image_with_tag}"; then
        log_error "Docker image not available" "check_image_availability" "1"
        exit 1
    fi
    
    # Phase 3: Environment preparation
    log_info "=== Phase 3: Environment Preparation ===" "Phase 3"
    if ! prepare_environment; then
        log_error "Environment preparation failed" "prepare_environment" "1"
        exit 1
    fi
    
    # Phase 4: Container execution based on run mode
    log_info "=== Phase 4: Container Execution (${RUN_MODE} mode) ===" "Phase 4"
    case "${RUN_MODE}" in
        "development")
            if ! run_development_container "${image_with_tag}"; then
                log_error "Development container execution failed" "run_development_container" "2"
                exit 2
            fi
            ;;
        "production")
            if ! run_production_container "${image_with_tag}"; then
                log_error "Production container execution failed" "run_production_container" "2"
                exit 2
            fi
            ;;
        "compose")
            if ! run_compose_development; then
                log_error "Docker Compose execution failed" "run_compose_development" "2"
                exit 2
            fi
            ;;
        *)
            log_error "Invalid run mode: ${RUN_MODE}" "main" "1"
            usage
            exit 1
            ;;
    esac
    
    # Phase 5: Health monitoring (skip for compose mode)
    if [[ "${RUN_MODE}" != "compose" && "${DETACHED_MODE}" == "true" ]]; then
        log_info "=== Phase 5: Health Monitoring ===" "Phase 5"
        if ! monitor_container_health "${CONTAINER_NAME}" "${HEALTH_CHECK_TIMEOUT}"; then
            log_error "Container health monitoring failed" "monitor_container_health" "3"
            cleanup_container "${CONTAINER_NAME}" "true"
            exit 3
        fi
    fi
    
    # Phase 6: Functional testing (if enabled)
    if [[ "${TEST_CONTAINER}" == "true" && "${RUN_MODE}" != "compose" ]]; then
        log_info "=== Phase 6: Functional Testing ===" "Phase 6"
        if ! test_container_functionality "${CONTAINER_NAME}" "${HOST_PORT}"; then
            log_error "Container functional testing failed" "test_container_functionality" "4"
            cleanup_container "${CONTAINER_NAME}" "true"
            exit 4
        fi
    fi
    
    # Phase 7: Operational status and guidance
    log_info "=== Phase 7: Operational Status ===" "Phase 7"
    
    if [[ "${RUN_MODE}" == "compose" ]]; then
        log_info "Docker Compose orchestration completed successfully" "Success"
        log_info "Service access: http://localhost:${HOST_PORT}/hello" "Access Info"
        log_info "Health check: http://localhost:${HOST_PORT}/health" "Access Info"
        log_info "View logs: docker-compose -f ${PROJECT_ROOT}/${COMPOSE_FILE} logs -f nodejs-tutorial-dev" "Management"
        log_info "Stop services: docker-compose -f ${PROJECT_ROOT}/${COMPOSE_FILE} down" "Management"
    elif [[ "${DETACHED_MODE}" == "true" ]]; then
        log_info "Container running in background: ${CONTAINER_NAME}" "Success"
        log_info "Application access: http://localhost:${HOST_PORT}/hello" "Access Info"
        log_info "Health check: http://localhost:${HOST_PORT}/health" "Access Info"
        log_info "Container logs: docker logs -f ${CONTAINER_NAME}" "Management"
        log_info "Stop container: docker stop ${CONTAINER_NAME}" "Management"
        log_info "Container stats: docker stats ${CONTAINER_NAME}" "Monitoring"
    else
        log_info "Container execution completed successfully" "Success"
    fi
    
    # Educational summary
    log_info "Educational summary: Demonstrated ${RUN_MODE} container execution with Docker best practices" "Learning"
    log_info "Key concepts: Container lifecycle, health monitoring, environment configuration, network management" "Learning"
    
    log_info "Docker container orchestration completed successfully!" "Final Status"
    return 0
}

# =============================================================================
# SCRIPT EXECUTION ENTRY POINT
# =============================================================================
# Script execution with comprehensive error handling and cleanup

# Cleanup handler for script exit
cleanup_on_exit() {
    local exit_code=$?
    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Container orchestration terminated with exit code ${exit_code}" "Exit Handler" "${exit_code}"
        
        # Attempt cleanup if container name is set
        if [[ -n "${CONTAINER_NAME}" ]]; then
            cleanup_container "${CONTAINER_NAME}" "true" 2>/dev/null || true
        fi
    fi
}

# Set up exit handler
trap cleanup_on_exit EXIT

# Execute main function with all script arguments
main "$@"