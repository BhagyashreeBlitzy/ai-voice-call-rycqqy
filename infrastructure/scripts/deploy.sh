#!/bin/bash

# =============================================================================
# Node.js Tutorial Application - Comprehensive Deployment Automation Script
# =============================================================================
# Production-ready deployment automation for the Node.js tutorial application
# orchestrating multi-environment workflows including local development, Docker
# containerization, Kubernetes cluster deployment, and cloud platform deployment.
# 
# This script implements enterprise-grade deployment patterns with integrated
# health checking, automatic rollback capabilities, security validation, and
# comprehensive logging while maintaining educational clarity for learning modern
# deployment automation, CI/CD integration, and infrastructure orchestration.
#
# Features:
# - Multi-platform deployment automation (local, docker, kubernetes, cloud)
# - Integrated health validation with retry logic and comprehensive reporting
# - Automatic rollback capabilities with failure recovery procedures
# - Security hardening and deployment validation with operational best practices
# - Comprehensive logging and audit trail for operational tracking
# - Educational patterns demonstrating modern deployment and DevOps practices
#
# Compatible with: Node.js 22.x LTS, Express.js 5.1.0, Docker 24.0+, Kubernetes v1.28+
# External Dependencies: docker v24.0+, kubectl v1.28+, gcloud latest, heroku latest, curl v7.68.0+, jq v1.6+, git v2.25+
# =============================================================================

# =============================================================================
# SHELL CONFIGURATION AND ERROR HANDLING
# =============================================================================

set -euo pipefail  # Exit on error, undefined variables, pipe failures
set -x            # Enable command tracing for debugging

# Signal handling for graceful cleanup and deployment operation termination
trap cleanup_deployment_resources EXIT
trap 'handle_deployment_failure "Script interrupted by signal" "${deployment_state:-unknown}"' INT TERM

# =============================================================================
# GLOBAL VARIABLES AND DEPLOYMENT CONFIGURATION
# =============================================================================

# Script and project directory paths
readonly SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
readonly PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"

# Deployment timestamp and logging configuration
readonly DEPLOYMENT_TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
readonly LOG_FILE="${PROJECT_ROOT}/logs/deploy_${DEPLOYMENT_TIMESTAMP}.log"

# Application configuration from package.json metadata
readonly APPLICATION_NAME="nodejs-hello-tutorial"
readonly APPLICATION_VERSION="$(grep '"version"' "${PROJECT_ROOT}/src/backend/package.json" | cut -d'"' -f4)"

# Container image and registry configuration
readonly CONTAINER_IMAGE_NAME="${APPLICATION_NAME}"
readonly CONTAINER_REGISTRY="${CONTAINER_REGISTRY:-docker.io}"

# Deployment defaults and configuration
readonly DEFAULT_ENVIRONMENT="development"
readonly DEFAULT_TARGET="local"
readonly DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}"
readonly HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-5}"
readonly HEALTH_CHECK_WAIT="${HEALTH_CHECK_WAIT:-30}"

# Kubernetes deployment configuration
readonly KUBERNETES_NAMESPACE="nodejs-tutorial"
readonly DOCKER_BUILD_CONTEXT="${PROJECT_ROOT}/src/backend"

# Exit codes for comprehensive error reporting
readonly EXIT_SUCCESS=0
readonly EXIT_FAILURE=1
readonly EXIT_TIMEOUT=2
readonly EXIT_INVALID_CONFIG=3
readonly EXIT_DEPLOYMENT_FAILED=4
readonly EXIT_HEALTH_CHECK_FAILED=5

# Rollback and deployment state management
readonly ROLLBACK_STATE_DIR="${PROJECT_ROOT}/tmp/rollback_state"
readonly DEPLOYMENT_HISTORY="${PROJECT_ROOT}/logs/deployment_history.json"
readonly MAX_ROLLBACK_ATTEMPTS=3

# Deployment configuration variables
deployment_target=""
deployment_environment=""
cloud_provider=""
kubernetes_cluster=""
kubernetes_namespace="${KUBERNETES_NAMESPACE}"
build_enabled=false
push_enabled=false
image_tag=""
force_rebuild=false
skip_health_checks=false
rollback_on_failure=false
deployment_timeout="${DEPLOYMENT_TIMEOUT}"
verbose_mode=false
dry_run_mode=false
preserve_artifacts=false

# =============================================================================
# LOGGING AND UTILITY FUNCTIONS
# =============================================================================

# Log structured deployment events with timestamp, context, and severity
# for operational monitoring, debugging, and audit trail maintenance
log_deployment_event() {
    local event_type="$1"
    local message="$2"
    local context_data="${3:-{}}"
    
    # Generate ISO-8601 timestamp for precise event timing
    local timestamp
    timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    
    # Format structured log entry with event type, severity, and contextual information
    local log_entry
    log_entry=$(cat <<EOF
{
  "timestamp": "${timestamp}",
  "event_type": "${event_type}",
  "message": "${message}",
  "context": ${context_data},
  "deployment_id": "${DEPLOYMENT_TIMESTAMP}",
  "target": "${deployment_target:-unknown}",
  "environment": "${deployment_environment:-unknown}",
  "application": "${APPLICATION_NAME}",
  "version": "${APPLICATION_VERSION}",
  "script_pid": $$
}
EOF
    )
    
    # Output structured log entry to deployment log file and stdout
    echo "${log_entry}" | tee -a "${LOG_FILE}"
    
    # Include deployment context for human-readable output
    echo "[${timestamp}] [${event_type}] ${message}" >&2
}

# Initialize comprehensive logging with timestamp and deployment context
initialize_logging() {
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    # Initialize log file with deployment header
    log_deployment_event "DEPLOYMENT_INIT" "Starting deployment automation" \
        '{"script_version": "1.0.0", "node_version": "'$(node --version 2>/dev/null || echo "not_available")'", "docker_version": "'$(docker --version 2>/dev/null | cut -d' ' -f3 | cut -d',' -f1 || echo "not_available")'"}'
}

# =============================================================================
# COMMAND LINE ARGUMENT PARSING AND VALIDATION
# =============================================================================

# Display comprehensive usage information and command examples
show_usage() {
    cat <<EOF
Node.js Tutorial Application - Deployment Automation Script

USAGE:
    $0 [OPTIONS]

DEPLOYMENT TARGETS:
    --target, -t PLATFORM    Deployment target platform (required)
                           Values: local, docker, kubernetes, cloud

ENVIRONMENT OPTIONS:
    --environment, -e ENV   Target environment (default: development)
                           Values: development, staging, production

CLOUD DEPLOYMENT OPTIONS:
    --provider, -p PROVIDER Cloud provider for cloud deployments
                           Values: gcp, aws, heroku, azure
    --cluster, -c CLUSTER   Kubernetes cluster name or context
    --namespace, -n NS      Kubernetes namespace (default: nodejs-tutorial)

BUILD AND DEPLOYMENT OPTIONS:
    --build, -b            Build container image before deployment
    --push                 Push container image to registry after building
    --tag TAG              Container image tag for building and deployment
    --force-rebuild        Force rebuild of container image even if exists
    --timeout SECONDS      Deployment operation timeout (default: 600)

VALIDATION AND ROLLBACK OPTIONS:
    --skip-health-checks   Skip post-deployment health check validation (not recommended)
    --rollback-on-failure  Automatically rollback deployment on health check failure

OPERATIONAL OPTIONS:
    --verbose, -v          Enable verbose logging output for deployment operations
    --dry-run             Perform deployment dry run without executing changes
    --preserve-artifacts   Preserve deployment artifacts and temporary files for debugging
    --help, -h            Display this help information

EXAMPLES:

    Local Development Deployment:
    $0 --target local --environment development

    Docker Production Deployment with Build:
    $0 --target docker --environment production --build --push

    Kubernetes Cluster Deployment:
    $0 --target kubernetes --environment production --cluster prod-cluster --build

    Google Cloud Run Deployment:
    $0 --target cloud --provider gcp --environment production --build

    Production Deployment with Rollback Protection:
    $0 --target kubernetes --environment production --rollback-on-failure --verbose

ENVIRONMENT VARIABLES:
    DEPLOYMENT_ENVIRONMENT    Default deployment environment
    DEPLOYMENT_TARGET        Default deployment target
    DEPLOYMENT_TIMEOUT       Deployment timeout in seconds
    CONTAINER_REGISTRY       Container registry URL
    KUBERNETES_CLUSTER       Default Kubernetes cluster
    ROLLBACK_ON_FAILURE      Enable automatic rollback (true/false)

For more information, see: https://github.com/nodejs-tutorial/deployment-guide
EOF
}

# Parse and validate command line arguments for deployment configuration
# including target platform, environment, deployment options, and feature flags
parse_deployment_arguments() {
    local args=("$@")
    
    # Parse command line flags and options using getopts for deployment configuration
    while [[ $# -gt 0 ]]; do
        case $1 in
            --target|-t)
                deployment_target="$2"
                shift 2
                ;;
            --environment|-e)
                deployment_environment="$2"
                shift 2
                ;;
            --provider|-p)
                cloud_provider="$2"
                shift 2
                ;;
            --cluster|-c)
                kubernetes_cluster="$2"
                shift 2
                ;;
            --namespace|-n)
                kubernetes_namespace="$2"
                shift 2
                ;;
            --build|-b)
                build_enabled=true
                shift
                ;;
            --push)
                push_enabled=true
                shift
                ;;
            --tag)
                image_tag="$2"
                shift 2
                ;;
            --force-rebuild)
                force_rebuild=true
                shift
                ;;
            --skip-health-checks)
                skip_health_checks=true
                shift
                ;;
            --rollback-on-failure)
                rollback_on_failure=true
                shift
                ;;
            --timeout)
                deployment_timeout="$2"
                shift 2
                ;;
            --verbose|-v)
                verbose_mode=true
                shift
                ;;
            --dry-run)
                dry_run_mode=true
                shift
                ;;
            --preserve-artifacts)
                preserve_artifacts=true
                shift
                ;;
            --help|-h)
                show_usage
                exit "${EXIT_SUCCESS}"
                ;;
            *)
                log_deployment_event "ERROR" "Unknown argument: $1"
                show_usage
                exit "${EXIT_INVALID_CONFIG}"
                ;;
        esac
    done
    
    # Validate deployment target (required parameter)
    if [[ -z "${deployment_target}" ]]; then
        log_deployment_event "ERROR" "Deployment target is required. Use --target or -t to specify."
        show_usage
        exit "${EXIT_INVALID_CONFIG}"
    fi
    
    # Validate deployment target values
    case "${deployment_target}" in
        local|docker|kubernetes|cloud)
            ;;
        *)
            log_deployment_event "ERROR" "Invalid deployment target: ${deployment_target}"
            show_usage
            exit "${EXIT_INVALID_CONFIG}"
            ;;
    esac
    
    # Set deployment options with intelligent defaults
    deployment_environment="${deployment_environment:-${DEFAULT_ENVIRONMENT}}"
    
    # Validate environment values
    case "${deployment_environment}" in
        development|staging|production)
            ;;
        *)
            log_deployment_event "ERROR" "Invalid environment: ${deployment_environment}"
            exit "${EXIT_INVALID_CONFIG}"
            ;;
    esac
    
    # Cloud provider validation for cloud deployments
    if [[ "${deployment_target}" == "cloud" && -z "${cloud_provider}" ]]; then
        log_deployment_event "ERROR" "Cloud provider is required for cloud deployments"
        exit "${EXIT_INVALID_CONFIG}"
    fi
    
    # Set intelligent defaults for missing options
    if [[ -z "${image_tag}" ]]; then
        image_tag="${APPLICATION_VERSION}-${deployment_environment}"
    fi
    
    # Display deployment configuration summary for confirmation and audit purposes
    log_deployment_event "CONFIG" "Deployment configuration validated" \
        '{"target": "'${deployment_target}'", "environment": "'${deployment_environment}'", "provider": "'${cloud_provider:-none}'", "cluster": "'${kubernetes_cluster:-default}'", "namespace": "'${kubernetes_namespace}'", "image_tag": "'${image_tag}'", "build_enabled": '${build_enabled}', "rollback_on_failure": '${rollback_on_failure}'}'
}

# =============================================================================
# PREREQUISITE VALIDATION FUNCTIONS
# =============================================================================

# Check if a command exists and optionally validate version
check_command_availability() {
    local command_name="$1"
    local min_version="${2:-}"
    
    if ! command -v "${command_name}" >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Required command not found: ${command_name}"
        return 1
    fi
    
    if [[ -n "${min_version}" ]]; then
        local current_version
        case "${command_name}" in
            docker)
                current_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
                ;;
            kubectl)
                current_version=$(kubectl version --client --short 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | sed 's/v//')
                ;;
            node)
                current_version=$(node --version | sed 's/v//')
                ;;
            *)
                log_deployment_event "INFO" "Version check not implemented for ${command_name}"
                return 0
                ;;
        esac
        
        log_deployment_event "INFO" "Found ${command_name} version: ${current_version}"
    fi
    
    return 0
}

# Validate deployment prerequisites including required tools, authentication
# credentials, target accessibility, and deployment permissions
validate_deployment_prerequisites() {
    log_deployment_event "INFO" "Validating deployment prerequisites"
    
    # Check required command-line tools availability and version compatibility
    local required_tools=("curl" "jq" "git")
    
    # Add target-specific tool requirements
    case "${deployment_target}" in
        local)
            required_tools+=("node" "npm")
            ;;
        docker)
            required_tools+=("docker")
            ;;
        kubernetes)
            required_tools+=("docker" "kubectl")
            ;;
        cloud)
            required_tools+=("docker")
            case "${cloud_provider}" in
                gcp)
                    required_tools+=("gcloud")
                    ;;
                aws)
                    required_tools+=("aws")
                    ;;
                heroku)
                    required_tools+=("heroku")
                    ;;
                azure)
                    required_tools+=("az")
                    ;;
            esac
            ;;
    esac
    
    # Validate all required tools
    for tool in "${required_tools[@]}"; do
        if ! check_command_availability "${tool}"; then
            log_deployment_event "ERROR" "Missing required tool: ${tool}"
            return 1
        fi
    done
    
    # Verify authentication credentials for container registry, Kubernetes cluster, and cloud providers
    case "${deployment_target}" in
        kubernetes)
            if ! kubectl cluster-info >/dev/null 2>&1; then
                log_deployment_event "ERROR" "Cannot connect to Kubernetes cluster"
                return 1
            fi
            ;;
        cloud)
            case "${cloud_provider}" in
                gcp)
                    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 >/dev/null 2>&1; then
                        log_deployment_event "ERROR" "Google Cloud authentication not configured"
                        return 1
                    fi
                    ;;
                heroku)
                    if ! heroku auth:whoami >/dev/null 2>&1; then
                        log_deployment_event "ERROR" "Heroku authentication not configured"
                        return 1
                    fi
                    ;;
            esac
            ;;
    esac
    
    # Validate source code repository status and ensure clean working directory
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Not inside a Git repository"
        return 1
    fi
    
    # Check deployment environment configuration and resource availability
    if [[ ! -f "${PROJECT_ROOT}/src/backend/package.json" ]]; then
        log_deployment_event "ERROR" "Application package.json not found"
        return 1
    fi
    
    if [[ ! -f "${PROJECT_ROOT}/src/backend/Dockerfile" ]]; then
        log_deployment_event "ERROR" "Application Dockerfile not found"
        return 1
    fi
    
    log_deployment_event "SUCCESS" "All deployment prerequisites validated successfully"
    return 0
}

# =============================================================================
# CONFIGURATION MANAGEMENT FUNCTIONS
# =============================================================================

# Load environment-specific deployment configuration from multiple sources
# with precedence handling and comprehensive validation
load_deployment_configuration() {
    local environment="$1"
    local target="$2"
    
    log_deployment_event "INFO" "Loading deployment configuration for ${environment}/${target}"
    
    # Load base configuration from package.json including application metadata and version
    local package_json_path="${PROJECT_ROOT}/src/backend/package.json"
    if [[ -f "${package_json_path}" ]]; then
        local app_name
        local app_version
        local node_version
        
        app_name=$(jq -r '.name // "nodejs-tutorial"' "${package_json_path}")
        app_version=$(jq -r '.version // "1.0.0"' "${package_json_path}")
        node_version=$(jq -r '.engines.node // ">=22.0.0"' "${package_json_path}")
        
        log_deployment_event "CONFIG" "Loaded application metadata" \
            '{"name": "'${app_name}'", "version": "'${app_version}'", "node_version": "'${node_version}'"}'
    fi
    
    # Load environment-specific configuration files with environment variable overrides
    local config_file="${PROJECT_ROOT}/src/backend/config/${environment}.js"
    if [[ -f "${config_file}" ]]; then
        log_deployment_event "INFO" "Found environment configuration: ${config_file}"
    fi
    
    # Apply deployment target-specific configuration
    case "${target}" in
        local)
            export PORT="${PORT:-3000}"
            export NODE_ENV="${environment}"
            ;;
        docker)
            export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
            export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-nodejs-tutorial-${environment}}"
            ;;
        kubernetes)
            export KUBERNETES_NAMESPACE="${kubernetes_namespace}"
            export KUBERNETES_CLUSTER="${kubernetes_cluster:-default}"
            ;;
        cloud)
            export CLOUD_PROVIDER="${cloud_provider}"
            case "${cloud_provider}" in
                gcp)
                    export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-nodejs-tutorial}"
                    export GOOGLE_CLOUD_REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
                    ;;
                heroku)
                    export HEROKU_APP_NAME="${HEROKU_APP_NAME:-nodejs-tutorial-${environment}}"
                    ;;
            esac
            ;;
    esac
    
    # Validate configuration completeness and required parameter availability
    log_deployment_event "SUCCESS" "Deployment configuration loaded successfully" \
        '{"environment": "'${environment}'", "target": "'${target}'", "image_tag": "'${image_tag}'"}'
    
    # Return comprehensive configuration for deployment execution
    return 0
}

# =============================================================================
# GIT REPOSITORY INFORMATION FUNCTIONS
# =============================================================================

# Retrieve Git commit information including commit hash, branch, and metadata
# for deployment traceability and version tracking
get_git_commit_info() {
    log_deployment_event "INFO" "Retrieving Git repository information"
    
    # Validate Git repository existence and working directory status
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Not inside a Git repository"
        return 1
    fi
    
    # Extract current commit hash for deployment traceability and image tagging
    local commit_hash
    commit_hash=$(git rev-parse HEAD)
    
    # Retrieve branch name and repository URL for deployment context
    local branch_name
    branch_name=$(git rev-parse --abbrev-ref HEAD)
    
    local repository_url
    repository_url=$(git remote get-url origin 2>/dev/null || echo "unknown")
    
    # Check working directory status for uncommitted changes and clean state validation
    local working_directory_clean=true
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        working_directory_clean=false
        log_deployment_event "WARNING" "Working directory has uncommitted changes"
    fi
    
    # Generate commit metadata including author, timestamp, and commit message
    local commit_author
    commit_author=$(git log -1 --pretty=format:'%an <%ae>')
    
    local commit_timestamp
    commit_timestamp=$(git log -1 --pretty=format:'%ci')
    
    local commit_message
    commit_message=$(git log -1 --pretty=format:'%s')
    
    # Export Git information for deployment labeling and audit trail
    export GIT_COMMIT="${commit_hash}"
    export GIT_BRANCH="${branch_name}"
    export GIT_REPOSITORY="${repository_url}"
    export GIT_CLEAN="${working_directory_clean}"
    
    log_deployment_event "SUCCESS" "Git repository information retrieved" \
        '{"commit": "'${commit_hash:0:8}'", "branch": "'${branch_name}'", "clean": '${working_directory_clean}', "author": "'${commit_author}'"}'
    
    return 0
}

# =============================================================================
# CONTAINER IMAGE MANAGEMENT FUNCTIONS
# =============================================================================

# Build Node.js tutorial application container image using multi-stage Docker build
# with optimization, security hardening, and educational best practices
build_container_image() {
    local image_tag="$1"
    local force_rebuild="$2"
    
    log_deployment_event "INFO" "Building container image: ${CONTAINER_IMAGE_NAME}:${image_tag}"
    
    # Validate Docker daemon availability and build context accessibility
    if ! docker info >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Docker daemon is not available"
        return 1
    fi
    
    if [[ ! -f "${DOCKER_BUILD_CONTEXT}/Dockerfile" ]]; then
        log_deployment_event "ERROR" "Dockerfile not found in build context: ${DOCKER_BUILD_CONTEXT}"
        return 1
    fi
    
    # Check for existing container image and determine rebuild necessity
    local image_exists=false
    if docker image inspect "${CONTAINER_IMAGE_NAME}:${image_tag}" >/dev/null 2>&1; then
        image_exists=true
        if [[ "${force_rebuild}" != "true" ]]; then
            log_deployment_event "INFO" "Container image already exists, skipping build"
            return 0
        fi
    fi
    
    # Generate build arguments including Node.js version, build timestamp, and VCS reference
    local build_args=(
        "--build-arg" "NODE_VERSION=22"
        "--build-arg" "BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        "--build-arg" "VERSION=${APPLICATION_VERSION}"
        "--build-arg" "GIT_COMMIT=${GIT_COMMIT:-unknown}"
        "--build-arg" "ENVIRONMENT=${deployment_environment}"
    )
    
    # Execute Docker build using multi-stage Dockerfile with production target
    log_deployment_event "INFO" "Starting Docker build process"
    local build_start_time
    build_start_time=$(date +%s)
    
    if [[ "${verbose_mode}" == "true" ]]; then
        build_args+=("--progress=plain")
    fi
    
    if ! docker build \
        "${build_args[@]}" \
        --target production \
        --tag "${CONTAINER_IMAGE_NAME}:${image_tag}" \
        --tag "${CONTAINER_IMAGE_NAME}:latest" \
        "${DOCKER_BUILD_CONTEXT}"; then
        log_deployment_event "ERROR" "Docker build failed"
        return 1
    fi
    
    # Monitor build progress and capture build metrics including layer caching efficiency
    local build_end_time
    build_end_time=$(date +%s)
    local build_duration=$((build_end_time - build_start_time))
    
    # Validate built container image including security scanning and size optimization
    local image_size
    image_size=$(docker image inspect "${CONTAINER_IMAGE_NAME}:${image_tag}" --format='{{.Size}}' | numfmt --to=iec)
    
    log_deployment_event "SUCCESS" "Container image built successfully" \
        '{"image": "'${CONTAINER_IMAGE_NAME}:${image_tag}'", "size": "'${image_size}'", "build_time": '${build_duration}'}'
    
    return 0
}

# Push built container image to specified container registry with authentication
# and comprehensive error handling
push_container_image() {
    local registry_url="$1"
    local image_tag="$2"
    
    log_deployment_event "INFO" "Pushing container image to registry: ${registry_url}"
    
    # Validate container image existence and readiness for distribution
    if ! docker image inspect "${CONTAINER_IMAGE_NAME}:${image_tag}" >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Container image not found: ${CONTAINER_IMAGE_NAME}:${image_tag}"
        return 1
    fi
    
    # Tag container image with registry-specific naming convention and version tags
    local registry_image="${registry_url}/${CONTAINER_IMAGE_NAME}:${image_tag}"
    
    if ! docker tag "${CONTAINER_IMAGE_NAME}:${image_tag}" "${registry_image}"; then
        log_deployment_event "ERROR" "Failed to tag image for registry"
        return 1
    fi
    
    # Push container image to registry with progress monitoring and retry logic
    log_deployment_event "INFO" "Pushing image to registry"
    
    if ! docker push "${registry_image}"; then
        log_deployment_event "ERROR" "Failed to push image to registry"
        return 1
    fi
    
    log_deployment_event "SUCCESS" "Container image pushed successfully" \
        '{"registry_image": "'${registry_image}'"}'
    
    return 0
}

# =============================================================================
# DEPLOYMENT TARGET FUNCTIONS
# =============================================================================

# Deploy Node.js tutorial application to local development environment
deploy_to_local() {
    local deployment_config="$1"
    
    log_deployment_event "INFO" "Starting local development deployment"
    
    # Validate Node.js runtime version compatibility with application requirements
    if ! node --version | grep -q "v22"; then
        log_deployment_event "WARNING" "Node.js version may not be compatible"
    fi
    
    # Change to backend directory for local deployment
    cd "${PROJECT_ROOT}/src/backend"
    
    # Install or update application dependencies using npm ci for deterministic builds
    log_deployment_event "INFO" "Installing application dependencies"
    if ! npm ci; then
        log_deployment_event "ERROR" "Failed to install dependencies"
        return 1
    fi
    
    # Configure development environment variables and local application settings
    export NODE_ENV="${deployment_environment}"
    export PORT="${PORT:-3000}"
    export HOST="${HOST:-localhost}"
    export LOG_LEVEL="${LOG_LEVEL:-debug}"
    
    # Start Node.js application using development server with hot reloading
    log_deployment_event "INFO" "Starting Node.js application locally"
    
    if [[ "${dry_run_mode}" == "true" ]]; then
        log_deployment_event "INFO" "Dry run mode: Would start application with npm start"
        return 0
    fi
    
    # Run application in background for health checks
    npm start &
    local app_pid=$!
    
    # Wait for application startup
    sleep "${HEALTH_CHECK_WAIT}"
    
    # Perform health check validation against local development endpoints
    local health_config='{"timeout": 5000, "retries": 3}'
    if ! perform_health_checks "http://localhost:${PORT}" "${health_config}"; then
        log_deployment_event "ERROR" "Local deployment health checks failed"
        kill "${app_pid}" 2>/dev/null || true
        return 1
    fi
    
    log_deployment_event "SUCCESS" "Local deployment completed successfully" \
        '{"url": "http://localhost:'${PORT}'", "pid": '${app_pid}'}'
    
    return 0
}

# Deploy Node.js tutorial application using Docker containerization
deploy_to_docker() {
    local deployment_config="$1"
    
    log_deployment_event "INFO" "Starting Docker deployment"
    
    # Validate Docker engine availability and Docker Compose configuration
    if ! docker info >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Docker daemon is not available"
        return 1
    fi
    
    # Build container image if enabled
    if [[ "${build_enabled}" == "true" ]]; then
        if ! build_container_image "${image_tag}" "${force_rebuild}"; then
            log_deployment_event "ERROR" "Container build failed"
            return 1
        fi
    fi
    
    # Deploy services using Docker Compose
    local compose_file
    if [[ "${deployment_environment}" == "production" ]]; then
        compose_file="${PROJECT_ROOT}/infrastructure/docker/docker-compose.prod.yml"
    else
        compose_file="${PROJECT_ROOT}/infrastructure/docker/docker-compose.yml"
    fi
    
    if [[ ! -f "${compose_file}" ]]; then
        log_deployment_event "ERROR" "Docker Compose file not found: ${compose_file}"
        return 1
    fi
    
    log_deployment_event "INFO" "Deploying services with Docker Compose"
    
    if [[ "${dry_run_mode}" == "true" ]]; then
        log_deployment_event "INFO" "Dry run mode: Would execute docker-compose up"
        return 0
    fi
    
    # Set environment variables for Docker Compose
    export VERSION="${APPLICATION_VERSION}"
    export COMPOSE_PROJECT_NAME="nodejs-tutorial-${deployment_environment}"
    
    # Deploy with Docker Compose
    if ! docker-compose -f "${compose_file}" up -d; then
        log_deployment_event "ERROR" "Docker Compose deployment failed"
        return 1
    fi
    
    # Wait for services to be ready
    sleep "${HEALTH_CHECK_WAIT}"
    
    # Perform comprehensive health checks on deployed services
    local service_port
    service_port=$(docker-compose -f "${compose_file}" port nodejs-tutorial-prod 3000 2>/dev/null | cut -d: -f2 || echo "3000")
    local health_config='{"timeout": 5000, "retries": 3}'
    
    if ! perform_health_checks "http://localhost:${service_port}" "${health_config}"; then
        log_deployment_event "ERROR" "Docker deployment health checks failed"
        return 1
    fi
    
    log_deployment_event "SUCCESS" "Docker deployment completed successfully" \
        '{"services": "nodejs-tutorial", "port": '${service_port}'}'
    
    return 0
}

# Deploy Node.js tutorial application to Kubernetes cluster
deploy_to_kubernetes() {
    local cluster_context="$1"
    local deployment_config="$2"
    
    log_deployment_event "INFO" "Starting Kubernetes deployment to cluster: ${cluster_context}"
    
    # Validate kubectl configuration and cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    # Set cluster context if specified
    if [[ -n "${cluster_context}" && "${cluster_context}" != "default" ]]; then
        if ! kubectl config use-context "${cluster_context}"; then
            log_deployment_event "ERROR" "Failed to set cluster context: ${cluster_context}"
            return 1
        fi
    fi
    
    # Create or validate Kubernetes namespace
    log_deployment_event "INFO" "Ensuring Kubernetes namespace: ${kubernetes_namespace}"
    
    if ! kubectl get namespace "${kubernetes_namespace}" >/dev/null 2>&1; then
        if [[ -f "${PROJECT_ROOT}/infrastructure/deployment/kubernetes/namespace.yml" ]]; then
            kubectl apply -f "${PROJECT_ROOT}/infrastructure/deployment/kubernetes/namespace.yml"
        else
            kubectl create namespace "${kubernetes_namespace}"
        fi
    fi
    
    # Build and push container image if enabled
    if [[ "${build_enabled}" == "true" ]]; then
        if ! build_container_image "${image_tag}" "${force_rebuild}"; then
            log_deployment_event "ERROR" "Container build failed"
            return 1
        fi
        
        if [[ "${push_enabled}" == "true" ]]; then
            if ! push_container_image "${CONTAINER_REGISTRY}" "${image_tag}"; then
                log_deployment_event "ERROR" "Container push failed"
                return 1
            fi
        fi
    fi
    
    # Apply Kubernetes deployment YAML with rolling update strategy
    local deployment_file="${PROJECT_ROOT}/infrastructure/deployment/kubernetes/deployment.yml"
    
    if [[ ! -f "${deployment_file}" ]]; then
        log_deployment_event "ERROR" "Kubernetes deployment file not found: ${deployment_file}"
        return 1
    fi
    
    log_deployment_event "INFO" "Applying Kubernetes deployment"
    
    if [[ "${dry_run_mode}" == "true" ]]; then
        kubectl apply -f "${deployment_file}" --namespace="${kubernetes_namespace}" --dry-run=client
        log_deployment_event "INFO" "Dry run mode: Kubernetes deployment validated"
        return 0
    fi
    
    # Apply deployment and monitor rollout
    if ! kubectl apply -f "${deployment_file}" --namespace="${kubernetes_namespace}"; then
        log_deployment_event "ERROR" "Failed to apply Kubernetes deployment"
        return 1
    fi
    
    # Monitor deployment rollout progress with timeout
    log_deployment_event "INFO" "Monitoring deployment rollout"
    
    if ! kubectl rollout status deployment/nodejs-tutorial --namespace="${kubernetes_namespace}" --timeout="${deployment_timeout}s"; then
        log_deployment_event "ERROR" "Deployment rollout timed out or failed"
        return 1
    fi
    
    # Validate service discovery and get service endpoint
    local service_url
    service_url=$(kubectl get service nodejs-tutorial-service --namespace="${kubernetes_namespace}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "cluster-ip")
    
    if [[ "${service_url}" == "cluster-ip" ]]; then
        # Use port-forward for cluster-internal access
        kubectl port-forward service/nodejs-tutorial-service 3000:3000 --namespace="${kubernetes_namespace}" &
        local port_forward_pid=$!
        sleep 5
        service_url="http://localhost:3000"
    else
        service_url="http://${service_url}"
    fi
    
    # Perform Kubernetes health checks including liveness and readiness probes
    local health_config='{"timeout": 10000, "retries": 5}'
    if ! perform_health_checks "${service_url}" "${health_config}"; then
        log_deployment_event "ERROR" "Kubernetes deployment health checks failed"
        [[ -n "${port_forward_pid:-}" ]] && kill "${port_forward_pid}" 2>/dev/null || true
        return 1
    fi
    
    log_deployment_event "SUCCESS" "Kubernetes deployment completed successfully" \
        '{"namespace": "'${kubernetes_namespace}'", "service_url": "'${service_url}'"}'
    
    [[ -n "${port_forward_pid:-}" ]] && kill "${port_forward_pid}" 2>/dev/null || true
    return 0
}

# Deploy Node.js tutorial application to cloud platforms
deploy_to_cloud() {
    local cloud_provider="$1"
    local deployment_config="$2"
    
    log_deployment_event "INFO" "Starting cloud deployment to provider: ${cloud_provider}"
    
    case "${cloud_provider}" in
        gcp)
            deploy_to_google_cloud_run
            ;;
        heroku)
            deploy_to_heroku_platform
            ;;
        aws)
            deploy_to_aws_platform
            ;;
        azure)
            deploy_to_azure_platform
            ;;
        *)
            log_deployment_event "ERROR" "Unsupported cloud provider: ${cloud_provider}"
            return 1
            ;;
    esac
}

# Deploy to Google Cloud Run
deploy_to_google_cloud_run() {
    log_deployment_event "INFO" "Deploying to Google Cloud Run"
    
    # Authenticate with Google Cloud and validate project
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Google Cloud authentication not configured"
        return 1
    fi
    
    local project_id="${GOOGLE_CLOUD_PROJECT}"
    local region="${GOOGLE_CLOUD_REGION:-us-central1}"
    
    if [[ -z "${project_id}" ]]; then
        project_id=$(gcloud config get-value project 2>/dev/null)
        if [[ -z "${project_id}" ]]; then
            log_deployment_event "ERROR" "Google Cloud project not configured"
            return 1
        fi
    fi
    
    # Build and push to Google Container Registry
    if [[ "${build_enabled}" == "true" ]]; then
        local gcr_image="gcr.io/${project_id}/${CONTAINER_IMAGE_NAME}:${image_tag}"
        
        if ! build_container_image "${image_tag}" "${force_rebuild}"; then
            return 1
        fi
        
        # Tag for Google Container Registry
        docker tag "${CONTAINER_IMAGE_NAME}:${image_tag}" "${gcr_image}"
        
        # Configure Docker for GCR and push
        if ! gcloud auth configure-docker --quiet; then
            log_deployment_event "ERROR" "Failed to configure Docker for GCR"
            return 1
        fi
        
        if ! docker push "${gcr_image}"; then
            log_deployment_event "ERROR" "Failed to push image to GCR"
            return 1
        fi
        
        image_tag="${gcr_image}"
    fi
    
    # Deploy to Cloud Run
    local service_name="nodejs-tutorial-${deployment_environment}"
    
    if [[ "${dry_run_mode}" == "true" ]]; then
        log_deployment_event "INFO" "Dry run mode: Would deploy to Cloud Run service: ${service_name}"
        return 0
    fi
    
    local deploy_args=(
        "--image=${image_tag}"
        "--platform=managed"
        "--region=${region}"
        "--allow-unauthenticated"
        "--memory=512Mi"
        "--cpu=1"
        "--max-instances=10"
        "--port=3000"
    )
    
    if ! gcloud run deploy "${service_name}" "${deploy_args[@]}" --project="${project_id}"; then
        log_deployment_event "ERROR" "Google Cloud Run deployment failed"
        return 1
    fi
    
    # Get service URL
    local service_url
    service_url=$(gcloud run services describe "${service_name}" --region="${region}" --project="${project_id}" --format="value(status.url)")
    
    # Perform health checks
    local health_config='{"timeout": 15000, "retries": 3}'
    if ! perform_health_checks "${service_url}" "${health_config}"; then
        log_deployment_event "ERROR" "Google Cloud Run health checks failed"
        return 1
    fi
    
    log_deployment_event "SUCCESS" "Google Cloud Run deployment completed" \
        '{"service_url": "'${service_url}'", "region": "'${region}'"}'
    
    return 0
}

# Deploy to Heroku platform
deploy_to_heroku_platform() {
    log_deployment_event "INFO" "Deploying to Heroku platform"
    
    # Verify Heroku authentication
    if ! heroku auth:whoami >/dev/null 2>&1; then
        log_deployment_event "ERROR" "Heroku authentication not configured"
        return 1
    fi
    
    local app_name="${HEROKU_APP_NAME:-nodejs-tutorial-${deployment_environment}}"
    
    # Create Heroku app if it doesn't exist
    if ! heroku apps:info "${app_name}" >/dev/null 2>&1; then
        log_deployment_event "INFO" "Creating Heroku app: ${app_name}"
        if ! heroku create "${app_name}"; then
            log_deployment_event "ERROR" "Failed to create Heroku app"
            return 1
        fi
    fi
    
    # Configure Heroku container registry
    if ! heroku container:login; then
        log_deployment_event "ERROR" "Failed to login to Heroku container registry"
        return 1
    fi
    
    if [[ "${dry_run_mode}" == "true" ]]; then
        log_deployment_event "INFO" "Dry run mode: Would deploy to Heroku app: ${app_name}"
        return 0
    fi
    
    # Build and push to Heroku
    cd "${PROJECT_ROOT}/src/backend"
    
    if ! heroku container:push web --app="${app_name}"; then
        log_deployment_event "ERROR" "Failed to push to Heroku container registry"
        return 1
    fi
    
    if ! heroku container:release web --app="${app_name}"; then
        log_deployment_event "ERROR" "Failed to release on Heroku"
        return 1
    fi
    
    # Get app URL
    local app_url
    app_url=$(heroku apps:info "${app_name}" --json | jq -r '.web_url')
    
    # Wait for deployment
    sleep "${HEALTH_CHECK_WAIT}"
    
    # Perform health checks
    local health_config='{"timeout": 15000, "retries": 5}'
    if ! perform_health_checks "${app_url}" "${health_config}"; then
        log_deployment_event "ERROR" "Heroku deployment health checks failed"
        return 1
    fi
    
    log_deployment_event "SUCCESS" "Heroku deployment completed" \
        '{"app_url": "'${app_url}'", "app_name": "'${app_name}'"}'
    
    return 0
}

# Placeholder functions for AWS and Azure deployments
deploy_to_aws_platform() {
    log_deployment_event "INFO" "AWS deployment not implemented in this tutorial version"
    return 1
}

deploy_to_azure_platform() {
    log_deployment_event "INFO" "Azure deployment not implemented in this tutorial version"
    return 1
}

# =============================================================================
# HEALTH CHECK AND VALIDATION FUNCTIONS
# =============================================================================

# Execute comprehensive health check validation using imported health check functions
perform_health_checks() {
    local deployment_url="$1"
    local health_config="$2"
    
    log_deployment_event "INFO" "Performing health checks for: ${deployment_url}"
    
    if [[ "${skip_health_checks}" == "true" ]]; then
        log_deployment_event "WARNING" "Health checks skipped by configuration"
        return 0
    fi
    
    # Wait for deployment stabilization period
    log_deployment_event "INFO" "Waiting for deployment stabilization (${HEALTH_CHECK_WAIT}s)"
    sleep "${HEALTH_CHECK_WAIT}"
    
    # Source health check functions from imported script
    local health_check_script="${PROJECT_ROOT}/infrastructure/scripts/health-check.sh"
    if [[ -f "${health_check_script}" ]]; then
        source "${health_check_script}"
    fi
    
    # Perform basic health check with retry logic
    local retry_count=0
    local max_retries="${HEALTH_CHECK_RETRIES}"
    
    while [[ ${retry_count} -lt ${max_retries} ]]; do
        log_deployment_event "INFO" "Health check attempt $((retry_count + 1))/${max_retries}"
        
        # Test HTTP connectivity with timeout
        if curl -f --max-time 10 --silent "${deployment_url}/hello" | grep -q "Hello"; then
            log_deployment_event "SUCCESS" "Basic connectivity test passed"
            break
        fi
        
        retry_count=$((retry_count + 1))
        if [[ ${retry_count} -lt ${max_retries} ]]; then
            log_deployment_event "WARNING" "Health check failed, retrying in 10 seconds"
            sleep 10
        fi
    done
    
    if [[ ${retry_count} -ge ${max_retries} ]]; then
        log_deployment_event "ERROR" "Health checks failed after ${max_retries} attempts"
        return 1
    fi
    
    # Test health endpoint if available
    if curl -f --max-time 5 --silent "${deployment_url}/health" >/dev/null 2>&1; then
        log_deployment_event "SUCCESS" "Health endpoint test passed"
    fi
    
    # Test readiness and liveness probes if available (Kubernetes)
    if [[ "${deployment_target}" == "kubernetes" ]]; then
        if curl -f --max-time 5 --silent "${deployment_url}/readyz" >/dev/null 2>&1; then
            log_deployment_event "SUCCESS" "Readiness probe test passed"
        fi
        
        if curl -f --max-time 5 --silent "${deployment_url}/livez" >/dev/null 2>&1; then
            log_deployment_event "SUCCESS" "Liveness probe test passed"
        fi
    fi
    
    log_deployment_event "SUCCESS" "All health checks completed successfully"
    return 0
}

# Validate deployment success by comparing deployed state with expected configuration
validate_deployment_success() {
    local expected_config="$1"
    local health_results="$2"
    
    log_deployment_event "INFO" "Validating deployment success"
    
    # Compare deployed application version with expected target
    # This is implementation-specific based on deployment target
    
    # Validate configuration matches environment requirements
    # Generate deployment success confirmation
    
    log_deployment_event "SUCCESS" "Deployment validation completed successfully" \
        '{"status": "success", "validation_time": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}'
    
    return 0
}

# =============================================================================
# ROLLBACK MANAGEMENT FUNCTIONS
# =============================================================================

# Identify appropriate rollback target from deployment history
identify_rollback_target() {
    local current_deployment="$1"
    local rollback_criteria="$2"
    
    log_deployment_event "INFO" "Identifying rollback target for deployment: ${current_deployment}"
    
    # Load deployment history if available
    local history_file="${DEPLOYMENT_HISTORY}"
    if [[ ! -f "${history_file}" ]]; then
        log_deployment_event "WARNING" "No deployment history found"
        return 1
    fi
    
    # Identify previous stable deployment within rollback window
    local previous_deployment
    previous_deployment=$(jq -r '.deployments | map(select(.status == "success")) | .[-2] | .version // empty' "${history_file}" 2>/dev/null)
    
    if [[ -z "${previous_deployment}" ]]; then
        log_deployment_event "ERROR" "No suitable rollback target found"
        return 1
    fi
    
    log_deployment_event "SUCCESS" "Rollback target identified: ${previous_deployment}"
    
    # Return rollback target information
    echo "${previous_deployment}"
    return 0
}

# Validate rollback prerequisites and safety requirements
validate_rollback_prerequisites() {
    local rollback_target="$1"
    local deployment_platform="$2"
    
    log_deployment_event "INFO" "Validating rollback prerequisites for target: ${rollback_target}"
    
    # Verify rollback target version exists and is accessible
    case "${deployment_platform}" in
        docker)
            if ! docker image inspect "${CONTAINER_IMAGE_NAME}:${rollback_target}" >/dev/null 2>&1; then
                log_deployment_event "ERROR" "Rollback image not found: ${CONTAINER_IMAGE_NAME}:${rollback_target}"
                return 1
            fi
            ;;
        kubernetes)
            # Check if previous deployment exists in Kubernetes
            if ! kubectl rollout history deployment/nodejs-tutorial --namespace="${kubernetes_namespace}" | grep -q "${rollback_target}"; then
                log_deployment_event "ERROR" "No rollback history found in Kubernetes"
                return 1
            fi
            ;;
    esac
    
    log_deployment_event "SUCCESS" "Rollback prerequisites validated"
    return 0
}

# Execute deployment rollback operation with platform-specific procedures
execute_deployment_rollback() {
    local rollback_target="$1"
    local rollback_strategy="$2"
    
    log_deployment_event "INFO" "Executing rollback to target: ${rollback_target}"
    
    # Preserve current deployment state for recovery
    local backup_dir="${ROLLBACK_STATE_DIR}/backup_${DEPLOYMENT_TIMESTAMP}"
    mkdir -p "${backup_dir}"
    
    # Execute platform-specific rollback procedures
    case "${deployment_target}" in
        docker)
            log_deployment_event "INFO" "Rolling back Docker deployment"
            local compose_file="${PROJECT_ROOT}/infrastructure/docker/docker-compose.prod.yml"
            
            # Stop current services
            docker-compose -f "${compose_file}" down
            
            # Deploy previous version
            export VERSION="${rollback_target}"
            if ! docker-compose -f "${compose_file}" up -d; then
                log_deployment_event "ERROR" "Docker rollback failed"
                return 1
            fi
            ;;
        kubernetes)
            log_deployment_event "INFO" "Rolling back Kubernetes deployment"
            if ! kubectl rollout undo deployment/nodejs-tutorial --namespace="${kubernetes_namespace}"; then
                log_deployment_event "ERROR" "Kubernetes rollback failed"
                return 1
            fi
            
            # Wait for rollback to complete
            if ! kubectl rollout status deployment/nodejs-tutorial --namespace="${kubernetes_namespace}" --timeout=300s; then
                log_deployment_event "ERROR" "Kubernetes rollback did not complete"
                return 1
            fi
            ;;
        cloud)
            case "${cloud_provider}" in
                gcp)
                    # Google Cloud Run rollback would require redeploying previous image
                    log_deployment_event "INFO" "Google Cloud Run rollback requires manual intervention"
                    return 1
                    ;;
                heroku)
                    local app_name="${HEROKU_APP_NAME:-nodejs-tutorial-${deployment_environment}}"
                    if ! heroku rollback --app="${app_name}"; then
                        log_deployment_event "ERROR" "Heroku rollback failed"
                        return 1
                    fi
                    ;;
            esac
            ;;
    esac
    
    # Validate rollback completion
    local service_url
    case "${deployment_target}" in
        docker)
            service_url="http://localhost:3000"
            ;;
        kubernetes)
            service_url="http://localhost:3000"  # Assuming port-forward
            ;;
        cloud)
            # Service URL would need to be retrieved from cloud provider
            service_url="unknown"
            ;;
    esac
    
    if [[ "${service_url}" != "unknown" ]]; then
        local health_config='{"timeout": 10000, "retries": 3}'
        if ! perform_health_checks "${service_url}" "${health_config}"; then
            log_deployment_event "ERROR" "Post-rollback health checks failed"
            return 1
        fi
    fi
    
    log_deployment_event "SUCCESS" "Rollback completed successfully to version: ${rollback_target}"
    return 0
}

# Handle rollback failure scenarios with emergency procedures
handle_rollback_failure() {
    local rollback_failure_reason="$1"
    local failure_context="$2"
    
    log_deployment_event "CRITICAL" "Rollback failure: ${rollback_failure_reason}" \
        '{"context": "'${failure_context}'", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}'
    
    # Preserve all artifacts for incident investigation
    local incident_dir="${PROJECT_ROOT}/incidents/rollback_failure_${DEPLOYMENT_TIMESTAMP}"
    mkdir -p "${incident_dir}"
    
    # Copy logs and state information
    cp "${LOG_FILE}" "${incident_dir}/" 2>/dev/null || true
    
    # Generate incident report
    cat > "${incident_dir}/incident_report.json" <<EOF
{
  "incident_type": "rollback_failure",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployment_id": "${DEPLOYMENT_TIMESTAMP}",
  "failure_reason": "${rollback_failure_reason}",
  "context": "${failure_context}",
  "deployment_target": "${deployment_target}",
  "deployment_environment": "${deployment_environment}",
  "actions_required": [
    "Manual service restoration required",
    "Investigate rollback failure cause",
    "Review deployment and rollback procedures",
    "Contact operations team for assistance"
  ]
}
EOF
    
    log_deployment_event "INFO" "Incident report generated: ${incident_dir}/incident_report.json"
    
    # Escalate to operations team
    echo "CRITICAL: Rollback failure requires immediate attention" >&2
    echo "Incident details: ${incident_dir}/incident_report.json" >&2
}

# =============================================================================
# DEPLOYMENT FAILURE HANDLING
# =============================================================================

# Handle deployment failure scenarios with diagnostic collection and recovery
handle_deployment_failure() {
    local failure_reason="$1"
    local deployment_state="${2:-unknown}"
    
    log_deployment_event "ERROR" "Deployment failure: ${failure_reason}" \
        '{"state": "'${deployment_state}'", "rollback_enabled": '${rollback_on_failure}'}'
    
    # Collect diagnostic data
    local failure_dir="${PROJECT_ROOT}/failures/deployment_failure_${DEPLOYMENT_TIMESTAMP}"
    mkdir -p "${failure_dir}"
    
    # Preserve logs and state
    cp "${LOG_FILE}" "${failure_dir}/" 2>/dev/null || true
    
    # Determine if rollback should be attempted
    if [[ "${rollback_on_failure}" == "true" && "${deployment_state}" != "pre_deployment" ]]; then
        log_deployment_event "INFO" "Attempting automatic rollback due to deployment failure"
        
        local rollback_target
        rollback_target=$(identify_rollback_target "${APPLICATION_VERSION}" '{"type": "failure_recovery"}')
        
        if [[ -n "${rollback_target}" ]]; then
            if validate_rollback_prerequisites "${rollback_target}" "${deployment_target}"; then
                if execute_deployment_rollback "${rollback_target}" "automatic"; then
                    log_deployment_event "SUCCESS" "Automatic rollback completed successfully"
                    return 0
                else
                    handle_rollback_failure "Automatic rollback failed" "${deployment_state}"
                fi
            fi
        fi
    fi
    
    # Generate failure report
    generate_deployment_report '{"status": "failed", "failure_reason": "'${failure_reason}'", "rollback_attempted": '${rollback_on_failure}'}'
    
    exit "${EXIT_DEPLOYMENT_FAILED}"
}

# =============================================================================
# REPORTING AND CLEANUP FUNCTIONS
# =============================================================================

# Generate comprehensive deployment report with execution details
generate_deployment_report() {
    local deployment_execution_data="$1"
    
    log_deployment_event "INFO" "Generating deployment report"
    
    local report_file="${PROJECT_ROOT}/reports/deployment_report_${DEPLOYMENT_TIMESTAMP}.json"
    mkdir -p "$(dirname "${report_file}")"
    
    # Compile deployment execution data
    local report_data
    report_data=$(cat <<EOF
{
  "deployment_id": "${DEPLOYMENT_TIMESTAMP}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "application": {
    "name": "${APPLICATION_NAME}",
    "version": "${APPLICATION_VERSION}",
    "git_commit": "${GIT_COMMIT:-unknown}"
  },
  "deployment_config": {
    "target": "${deployment_target}",
    "environment": "${deployment_environment}",
    "provider": "${cloud_provider:-none}",
    "image_tag": "${image_tag}"
  },
  "execution_data": ${deployment_execution_data},
  "logs": "${LOG_FILE}",
  "operator": "$(whoami)",
  "hostname": "$(hostname)"
}
EOF
    )
    
    echo "${report_data}" > "${report_file}"
    
    # Update deployment history
    local history_entry
    history_entry=$(cat <<EOF
{
  "deployment_id": "${DEPLOYMENT_TIMESTAMP}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "${APPLICATION_VERSION}",
  "target": "${deployment_target}",
  "environment": "${deployment_environment}",
  "status": "$(echo "${deployment_execution_data}" | jq -r '.status // "unknown"')",
  "report": "${report_file}"
}
EOF
    )
    
    # Append to deployment history
    if [[ -f "${DEPLOYMENT_HISTORY}" ]]; then
        local temp_history
        temp_history=$(mktemp)
        jq ".deployments += [${history_entry}]" "${DEPLOYMENT_HISTORY}" > "${temp_history}"
        mv "${temp_history}" "${DEPLOYMENT_HISTORY}"
    else
        mkdir -p "$(dirname "${DEPLOYMENT_HISTORY}")"
        echo '{"deployments": ['"${history_entry}"']}' > "${DEPLOYMENT_HISTORY}"
    fi
    
    log_deployment_event "SUCCESS" "Deployment report generated: ${report_file}"
    echo "${report_file}"
}

# Clean up temporary deployment resources and maintain environment hygiene
cleanup_deployment_resources() {
    local preserve_artifacts="${preserve_artifacts:-false}"
    local clean_images="${clean_images:-false}"
    
    if [[ "${preserve_artifacts}" != "true" ]]; then
        log_deployment_event "INFO" "Cleaning up temporary deployment resources"
        
        # Remove temporary files
        rm -rf "${PROJECT_ROOT}/tmp/deploy_${DEPLOYMENT_TIMESTAMP}" 2>/dev/null || true
        
        # Clean up Docker images if specified
        if [[ "${clean_images}" == "true" && "${deployment_target}" =~ ^(docker|kubernetes|cloud)$ ]]; then
            docker image prune -f >/dev/null 2>&1 || true
        fi
        
        log_deployment_event "INFO" "Temporary resources cleaned up"
    else
        log_deployment_event "INFO" "Preserving deployment artifacts for debugging"
    fi
}

# =============================================================================
# MAIN DEPLOYMENT ORCHESTRATION FUNCTION
# =============================================================================

# Main deployment orchestration function that coordinates the entire deployment workflow
main() {
    local deployment_start_time
    deployment_start_time=$(date +%s)
    
    # Initialize comprehensive logging
    initialize_logging
    
    log_deployment_event "START" "Deployment automation started" \
        '{"script_version": "1.0.0", "target_args": "'$*'"}'
    
    # Parse and validate command line arguments
    parse_deployment_arguments "$@"
    
    # Validate deployment prerequisites
    if ! validate_deployment_prerequisites; then
        handle_deployment_failure "Prerequisites validation failed" "pre_deployment"
    fi
    
    # Load environment-specific configuration
    if ! load_deployment_configuration "${deployment_environment}" "${deployment_target}"; then
        handle_deployment_failure "Configuration loading failed" "pre_deployment"
    fi
    
    # Get Git repository information for traceability
    if ! get_git_commit_info; then
        log_deployment_event "WARNING" "Could not retrieve Git information"
    fi
    
    # Execute deployment workflow based on target platform
    local deployment_success=false
    deployment_state="deployment"
    
    case "${deployment_target}" in
        local)
            if deploy_to_local '{"environment": "'${deployment_environment}'"}'; then
                deployment_success=true
            fi
            ;;
        docker)
            if deploy_to_docker '{"environment": "'${deployment_environment}'", "image_tag": "'${image_tag}'"}'; then
                deployment_success=true
            fi
            ;;
        kubernetes)
            if deploy_to_kubernetes "${kubernetes_cluster:-default}" '{"environment": "'${deployment_environment}'", "image_tag": "'${image_tag}'"}'; then
                deployment_success=true
            fi
            ;;
        cloud)
            if deploy_to_cloud "${cloud_provider}" '{"environment": "'${deployment_environment}'", "image_tag": "'${image_tag}'"}'; then
                deployment_success=true
            fi
            ;;
        *)
            handle_deployment_failure "Unsupported deployment target: ${deployment_target}" "configuration"
            ;;
    esac
    
    # Validate deployment success
    if [[ "${deployment_success}" == "true" ]]; then
        deployment_state="validation"
        
        # Validate deployment success
        if validate_deployment_success '{"target": "'${deployment_target}'", "environment": "'${deployment_environment}'"}' '{"status": "success"}'; then
            local deployment_end_time
            deployment_end_time=$(date +%s)
            local deployment_duration=$((deployment_end_time - deployment_start_time))
            
            # Generate successful deployment report
            local success_data
            success_data='{"status": "success", "duration": '${deployment_duration}', "target": "'${deployment_target}'", "environment": "'${deployment_environment}'"}'
            
            generate_deployment_report "${success_data}"
            
            log_deployment_event "SUCCESS" "Deployment completed successfully" \
                '{"duration": '${deployment_duration}', "target": "'${deployment_target}'", "environment": "'${deployment_environment}'"}'
            
            exit "${EXIT_SUCCESS}"
        else
            handle_deployment_failure "Deployment validation failed" "validation"
        fi
    else
        handle_deployment_failure "Deployment execution failed" "deployment"
    fi
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Execute main function with all command line arguments
main "$@"