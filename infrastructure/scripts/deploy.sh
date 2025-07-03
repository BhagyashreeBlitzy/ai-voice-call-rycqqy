#!/usr/bin/env bash

# ==============================================================================
# Node.js Tutorial Backend - Automated Deployment Script
# ==============================================================================
# 
# This script orchestrates the build and deployment process for the Node.js
# tutorial backend application to production or cloud environments. It supports
# Docker-based, Compose-based, and cloud-native (Heroku, PaaS) workflows.
#
# The script ensures reproducible, secure, and production-ready deployment by
# integrating with the Dockerfile, docker-compose.prod.yml, and cloud manifests.
# It validates environment configuration, builds container images, runs tests,
# and deploys to the target platform with comprehensive logging and error handling.
#
# Features:
# - Multi-target deployment support (docker, compose, heroku, cloud)
# - Environment validation and configuration management
# - Pre-deployment testing and quality gates
# - Health check verification after deployment
# - Security best practices and non-root container execution
# - Production-ready logging and error handling
# - CI/CD pipeline integration ready
#
# Usage:
#   bash infrastructure/scripts/deploy.sh [docker|compose|heroku|cloud|auto]
#
# Examples:
#   bash infrastructure/scripts/deploy.sh docker     # Deploy using Docker
#   bash infrastructure/scripts/deploy.sh compose   # Deploy using Docker Compose
#   bash infrastructure/scripts/deploy.sh heroku    # Deploy to Heroku
#   bash infrastructure/scripts/deploy.sh cloud     # Deploy to cloud PaaS
#   bash infrastructure/scripts/deploy.sh auto      # Auto-detect deployment target
#   bash infrastructure/scripts/deploy.sh           # Auto-detect (default)
#
# Dependencies:
#   - Docker 20.10+ (for docker, compose, cloud deployments)
#   - Docker Compose v2.24+ (for compose deployments)
#   - Heroku CLI latest (for heroku deployments)
#   - Google Cloud SDK latest (for cloud deployments)
#   - Node.js 18+ (for testing)
#   - npm 8+ (for dependency management)
#
# Environment Variables:
#   DEPLOY_TARGET    - Override deployment target (docker|compose|heroku|cloud)
#   IMAGE_NAME       - Override container image name (default: nodejs-tutorial-backend)
#   SKIP_TESTS       - Skip pre-deployment tests (default: false)
#   SKIP_HEALTH      - Skip post-deployment health checks (default: false)
#   VERBOSE          - Enable verbose logging (default: false)
#   CI               - Enable CI/CD mode (default: false)
#
# ==============================================================================

# Strict error handling and script configuration
set -euo pipefail

# Enable debug mode if DEBUG environment variable is set
if [[ "${DEBUG:-}" == "true" ]]; then
    set -x
fi

# ==============================================================================
# GLOBAL CONFIGURATION AND CONSTANTS
# ==============================================================================

# Script metadata
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly BACKEND_DIR="${PROJECT_ROOT}/src/backend"

# Deployment configuration
readonly DEFAULT_IMAGE_NAME="nodejs-tutorial-backend"
readonly DEFAULT_IMAGE_TAG="latest"
readonly DEFAULT_PORT="3000"
readonly DEFAULT_TIMEOUT="30000"

# File paths
readonly DOCKERFILE_PATH="${BACKEND_DIR}/Dockerfile"
readonly COMPOSE_FILE="${PROJECT_ROOT}/infrastructure/docker/docker-compose.prod.yml"
readonly HEROKU_YML="${PROJECT_ROOT}/infrastructure/cloud/heroku.yml"
readonly CLOUD_MANIFEST="${PROJECT_ROOT}/infrastructure/cloud/app.yaml"
readonly ENV_EXAMPLE="${BACKEND_DIR}/.env.example"
readonly ENV_FILE="${BACKEND_DIR}/.env"
readonly PACKAGE_JSON="${BACKEND_DIR}/package.json"

# Global variables (can be overridden by environment variables)
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
IMAGE_NAME="${IMAGE_NAME:-$DEFAULT_IMAGE_NAME}"
IMAGE_TAG="${IMAGE_TAG:-$DEFAULT_IMAGE_TAG}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_HEALTH="${SKIP_HEALTH:-false}"
VERBOSE="${VERBOSE:-false}"
CI_MODE="${CI:-false}"

# Color codes for output formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

# Logging functions with color support
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_debug() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${MAGENTA}[DEBUG]${NC} $*" >&2
    fi
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $*" >&2
}

# Print script usage information
print_usage() {
    cat << EOF
Usage: ${SCRIPT_NAME} [OPTIONS] [TARGET]

Automated deployment script for Node.js tutorial backend application.

TARGETS:
  docker      Deploy using Docker (single container)
  compose     Deploy using Docker Compose (production orchestration)
  heroku      Deploy to Heroku using heroku.yml
  cloud       Deploy to cloud PaaS using app.yaml
  auto        Auto-detect deployment target (default)

OPTIONS:
  -h, --help          Show this help message and exit
  -v, --verbose       Enable verbose logging
  --skip-tests        Skip pre-deployment tests
  --skip-health       Skip post-deployment health checks
  --image-name NAME   Override container image name (default: ${DEFAULT_IMAGE_NAME})
  --image-tag TAG     Override container image tag (default: ${DEFAULT_IMAGE_TAG})

ENVIRONMENT VARIABLES:
  DEPLOY_TARGET       Override deployment target
  IMAGE_NAME          Override container image name
  SKIP_TESTS          Skip pre-deployment tests (true/false)
  SKIP_HEALTH         Skip post-deployment health checks (true/false)
  VERBOSE             Enable verbose logging (true/false)
  CI                  Enable CI/CD mode (true/false)

EXAMPLES:
  ${SCRIPT_NAME} docker                    # Deploy using Docker
  ${SCRIPT_NAME} compose                   # Deploy using Docker Compose
  ${SCRIPT_NAME} heroku                    # Deploy to Heroku
  ${SCRIPT_NAME} cloud                     # Deploy to cloud PaaS
  ${SCRIPT_NAME} --verbose auto            # Auto-detect with verbose logging
  ${SCRIPT_NAME} --skip-tests docker       # Deploy with Docker, skip tests

EOF
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get the project name from package.json
get_project_name() {
    if [[ -f "${PACKAGE_JSON}" ]]; then
        local project_name
        project_name=$(grep -o '"name": *"[^"]*"' "${PACKAGE_JSON}" | grep -o '"[^"]*"$' | tr -d '"' 2>/dev/null || echo "")
        echo "${project_name:-$DEFAULT_IMAGE_NAME}"
    else
        echo "$DEFAULT_IMAGE_NAME"
    fi
}

# Check if we're running in a CI environment
is_ci_environment() {
    [[ "${CI_MODE}" == "true" ]] || [[ -n "${CI:-}" ]] || [[ -n "${GITHUB_ACTIONS:-}" ]] || [[ -n "${GITLAB_CI:-}" ]] || [[ -n "${JENKINS_URL:-}" ]]
}

# Wait for a service to be healthy
wait_for_health() {
    local url="$1"
    local timeout="${2:-60}"
    local interval="${3:-5}"
    local start_time
    start_time=$(date +%s)
    
    log_step "Waiting for service to be healthy at ${url}"
    
    while true; do
        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -ge $timeout ]]; then
            log_error "Health check timeout after ${timeout} seconds"
            return 1
        fi
        
        if curl -f -s --max-time 10 "${url}" >/dev/null 2>&1; then
            log_success "Service is healthy at ${url}"
            return 0
        fi
        
        log_debug "Health check failed, retrying in ${interval} seconds... (${elapsed}/${timeout}s)"
        sleep "$interval"
    done
}

# ==============================================================================
# VALIDATION FUNCTIONS
# ==============================================================================

# Validate that required tools are installed
validate_tools() {
    log_step "Validating required tools"
    
    local required_tools=("node" "npm" "docker" "curl" "grep" "sed" "awk")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command_exists "$tool"; then
            missing_tools+=("$tool")
        else
            log_debug "Found ${tool}: $(command -v "$tool")"
        fi
    done
    
    # Check deployment-specific tools
    case "${DEPLOY_TARGET}" in
        compose)
            if ! command_exists "docker-compose" && ! docker compose version >/dev/null 2>&1; then
                missing_tools+=("docker-compose")
            fi
            ;;
        heroku)
            if ! command_exists "heroku"; then
                missing_tools+=("heroku")
            fi
            ;;
        cloud)
            if ! command_exists "gcloud"; then
                missing_tools+=("gcloud")
            fi
            ;;
    esac
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools and try again"
        return 1
    fi
    
    log_success "All required tools are available"
    return 0
}

# Validate environment configuration
validate_environment() {
    log_step "Validating environment configuration"
    
    # Check if .env file exists, create from example if not
    if [[ ! -f "${ENV_FILE}" ]]; then
        if [[ -f "${ENV_EXAMPLE}" ]]; then
            log_info "Creating .env file from .env.example"
            cp "${ENV_EXAMPLE}" "${ENV_FILE}"
        else
            log_warning ".env and .env.example files not found, using defaults"
        fi
    fi
    
    # Validate critical files exist
    local required_files=("${DOCKERFILE_PATH}" "${PACKAGE_JSON}")
    
    case "${DEPLOY_TARGET}" in
        compose)
            required_files+=("${COMPOSE_FILE}")
            ;;
        heroku)
            required_files+=("${HEROKU_YML}")
            ;;
        cloud)
            required_files+=("${CLOUD_MANIFEST}")
            ;;
    esac
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file not found: $file"
            return 1
        fi
        log_debug "Found required file: $file"
    done
    
    # Validate Node.js and npm versions
    local node_version npm_version
    node_version=$(node --version 2>/dev/null || echo "")
    npm_version=$(npm --version 2>/dev/null || echo "")
    
    if [[ -z "$node_version" ]]; then
        log_error "Node.js is not installed or not in PATH"
        return 1
    fi
    
    if [[ -z "$npm_version" ]]; then
        log_error "npm is not installed or not in PATH"
        return 1
    fi
    
    log_debug "Node.js version: $node_version"
    log_debug "npm version: $npm_version"
    
    # Validate Docker is running (if needed)
    if [[ "${DEPLOY_TARGET}" =~ ^(docker|compose|cloud)$ ]]; then
        if ! docker info >/dev/null 2>&1; then
            log_error "Docker is not running or not accessible"
            log_error "Please start Docker and ensure your user has permission to access it"
            return 1
        fi
        log_debug "Docker is running and accessible"
    fi
    
    log_success "Environment validation completed"
    return 0
}

# ==============================================================================
# TEST EXECUTION FUNCTIONS
# ==============================================================================

# Run pre-deployment tests
run_tests() {
    if [[ "${SKIP_TESTS}" == "true" ]]; then
        log_info "Skipping pre-deployment tests (SKIP_TESTS=true)"
        return 0
    fi
    
    log_step "Running pre-deployment tests"
    
    # Change to backend directory
    cd "${BACKEND_DIR}"
    
    # Install dependencies
    log_info "Installing dependencies"
    if ! npm ci --no-audit --prefer-offline; then
        log_error "Failed to install dependencies"
        return 1
    fi
    
    # Run tests
    log_info "Running test suite"
    if ! npm test; then
        log_error "Tests failed"
        return 1
    fi
    
    # Return to original directory
    cd - >/dev/null
    
    log_success "All tests passed"
    return 0
}

# ==============================================================================
# DEPLOYMENT FUNCTIONS
# ==============================================================================

# Deploy using Docker (single container)
deploy_docker() {
    log_step "Starting Docker deployment"
    
    local container_name="${IMAGE_NAME}-container"
    local full_image_name="${IMAGE_NAME}:${IMAGE_TAG}"
    
    # Stop and remove existing container if it exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_info "Stopping existing container: ${container_name}"
        docker stop "${container_name}" 2>/dev/null || true
        docker rm "${container_name}" 2>/dev/null || true
    fi
    
    # Build the Docker image
    log_info "Building Docker image: ${full_image_name}"
    if ! docker build -t "${full_image_name}" -f "${DOCKERFILE_PATH}" "${BACKEND_DIR}"; then
        log_error "Docker build failed"
        return 1
    fi
    
    # Run the container
    log_info "Starting container: ${container_name}"
    local docker_run_args=(
        "run" "-d"
        "--name" "${container_name}"
        "--restart" "unless-stopped"
        "-p" "${DEFAULT_PORT}:${DEFAULT_PORT}"
    )
    
    # Add environment file if it exists
    if [[ -f "${ENV_FILE}" ]]; then
        docker_run_args+=("--env-file" "${ENV_FILE}")
    fi
    
    # Add health check label
    docker_run_args+=("--label" "com.tutorial.health-check=http://localhost:${DEFAULT_PORT}/hello")
    
    # Add the image name
    docker_run_args+=("${full_image_name}")
    
    if ! docker "${docker_run_args[@]}"; then
        log_error "Failed to start container"
        return 1
    fi
    
    # Wait for container to be ready
    log_info "Waiting for container to be ready"
    sleep 10
    
    # Check container status
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_error "Container is not running"
        docker logs "${container_name}" 2>/dev/null || true
        return 1
    fi
    
    log_success "Docker deployment completed"
    log_info "Container name: ${container_name}"
    log_info "Access URL: http://localhost:${DEFAULT_PORT}/hello"
    
    # Run health check
    if [[ "${SKIP_HEALTH}" != "true" ]]; then
        wait_for_health "http://localhost:${DEFAULT_PORT}/hello" 60 5
    fi
    
    return 0
}

# Deploy using Docker Compose
deploy_compose() {
    log_step "Starting Docker Compose deployment"
    
    local compose_cmd="docker-compose"
    
    # Check if we should use 'docker compose' (v2) instead of 'docker-compose'
    if docker compose version >/dev/null 2>&1; then
        compose_cmd="docker compose"
    fi
    
    # Change to the directory containing the compose file
    local compose_dir
    compose_dir=$(dirname "${COMPOSE_FILE}")
    cd "${compose_dir}"
    
    # Stop existing services
    log_info "Stopping existing services"
    "${compose_cmd}" -f "$(basename "${COMPOSE_FILE}")" down 2>/dev/null || true
    
    # Build and start services
    log_info "Building and starting services"
    if ! "${compose_cmd}" -f "$(basename "${COMPOSE_FILE}")" up --build -d; then
        log_error "Docker Compose deployment failed"
        return 1
    fi
    
    # Return to original directory
    cd - >/dev/null
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready"
    sleep 15
    
    # Check service status
    cd "${compose_dir}"
    if ! "${compose_cmd}" -f "$(basename "${COMPOSE_FILE}")" ps | grep -q "Up"; then
        log_error "Services are not running properly"
        "${compose_cmd}" -f "$(basename "${COMPOSE_FILE}")" logs
        return 1
    fi
    cd - >/dev/null
    
    log_success "Docker Compose deployment completed"
    log_info "Access URL: http://localhost:${DEFAULT_PORT}/hello"
    
    # Run health check
    if [[ "${SKIP_HEALTH}" != "true" ]]; then
        wait_for_health "http://localhost:${DEFAULT_PORT}/hello" 60 5
    fi
    
    return 0
}

# Deploy to Heroku
deploy_heroku() {
    log_step "Starting Heroku deployment"
    
    # Check if user is logged in to Heroku
    if ! heroku auth:whoami >/dev/null 2>&1; then
        log_error "Not logged in to Heroku"
        log_error "Please run 'heroku login' first"
        return 1
    fi
    
    local app_name="${IMAGE_NAME}"
    local heroku_user
    heroku_user=$(heroku auth:whoami 2>/dev/null || echo "unknown")
    
    log_info "Deploying to Heroku as user: ${heroku_user}"
    
    # Check if app exists, create if not
    if ! heroku apps:info "${app_name}" >/dev/null 2>&1; then
        log_info "Creating Heroku app: ${app_name}"
        if ! heroku create "${app_name}"; then
            log_error "Failed to create Heroku app"
            return 1
        fi
    else
        log_info "Using existing Heroku app: ${app_name}"
    fi
    
    # Change to project root for deployment
    cd "${PROJECT_ROOT}"
    
    # Check if this is a git repository
    if [[ ! -d ".git" ]]; then
        log_info "Initializing git repository"
        git init
        git add .
        git commit -m "Initial commit for Heroku deployment"
    fi
    
    # Add Heroku remote if not exists
    if ! git remote get-url heroku >/dev/null 2>&1; then
        log_info "Adding Heroku remote"
        heroku git:remote -a "${app_name}"
    fi
    
    # Set stack to heroku-22 (matches heroku.yml)
    log_info "Setting Heroku stack to heroku-22"
    heroku stack:set heroku-22 -a "${app_name}"
    
    # Deploy using git push
    log_info "Deploying to Heroku"
    if ! git push heroku HEAD:main --force; then
        log_error "Heroku deployment failed"
        return 1
    fi
    
    # Return to original directory
    cd - >/dev/null
    
    # Get the app URL
    local app_url
    app_url=$(heroku apps:info "${app_name}" --json | grep -o '"web_url":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
    
    if [[ -n "$app_url" ]]; then
        log_success "Heroku deployment completed"
        log_info "App URL: ${app_url}"
        log_info "Health check URL: ${app_url}hello"
        
        # Run health check
        if [[ "${SKIP_HEALTH}" != "true" ]]; then
            wait_for_health "${app_url}hello" 120 10
        fi
    else
        log_warning "Deployment completed but could not determine app URL"
    fi
    
    return 0
}

# Deploy to cloud PaaS
deploy_cloud() {
    log_step "Starting cloud deployment"
    
    # Check if gcloud is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1; then
        log_error "Not authenticated with Google Cloud"
        log_error "Please run 'gcloud auth login' first"
        return 1
    fi
    
    local project_id
    project_id=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [[ -z "$project_id" ]]; then
        log_error "Google Cloud project not set"
        log_error "Please run 'gcloud config set project YOUR_PROJECT_ID' first"
        return 1
    fi
    
    local service_name="${IMAGE_NAME}"
    local region="${GCLOUD_REGION:-us-central1}"
    local full_image_name="gcr.io/${project_id}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    log_info "Deploying to Google Cloud Run"
    log_info "Project: ${project_id}"
    log_info "Service: ${service_name}"
    log_info "Region: ${region}"
    
    # Enable required APIs
    log_info "Enabling Cloud Run API"
    gcloud services enable run.googleapis.com --project="${project_id}"
    
    # Build and push container image
    log_info "Building and pushing container image"
    if ! docker build -t "${full_image_name}" -f "${DOCKERFILE_PATH}" "${BACKEND_DIR}"; then
        log_error "Docker build failed"
        return 1
    fi
    
    if ! docker push "${full_image_name}"; then
        log_error "Docker push failed"
        return 1
    fi
    
    # Deploy to Cloud Run
    log_info "Deploying to Cloud Run"
    local deploy_args=(
        "run" "deploy" "${service_name}"
        "--image" "${full_image_name}"
        "--platform" "managed"
        "--region" "${region}"
        "--allow-unauthenticated"
        "--port" "${DEFAULT_PORT}"
        "--set-env-vars" "NODE_ENV=production,PORT=${DEFAULT_PORT},REQUEST_TIMEOUT_MS=${DEFAULT_TIMEOUT}"
        "--memory" "256Mi"
        "--cpu" "1"
        "--concurrency" "100"
        "--max-instances" "10"
        "--project" "${project_id}"
    )
    
    if ! gcloud "${deploy_args[@]}"; then
        log_error "Cloud Run deployment failed"
        return 1
    fi
    
    # Get the service URL
    local service_url
    service_url=$(gcloud run services describe "${service_name}" --region="${region}" --format="value(status.url)" 2>/dev/null || echo "")
    
    if [[ -n "$service_url" ]]; then
        log_success "Cloud deployment completed"
        log_info "Service URL: ${service_url}"
        log_info "Health check URL: ${service_url}/hello"
        
        # Run health check
        if [[ "${SKIP_HEALTH}" != "true" ]]; then
            wait_for_health "${service_url}/hello" 120 10
        fi
    else
        log_warning "Deployment completed but could not determine service URL"
    fi
    
    return 0
}

# ==============================================================================
# MAIN DEPLOYMENT LOGIC
# ==============================================================================

# Auto-detect deployment target
auto_detect_target() {
    log_step "Auto-detecting deployment target"
    
    # Check for specific indicators
    if [[ -n "${HEROKU_APP_NAME:-}" ]] || [[ -n "${DYNO:-}" ]]; then
        echo "heroku"
        return 0
    fi
    
    if [[ -n "${GOOGLE_CLOUD_PROJECT:-}" ]] || [[ -n "${GCLOUD_PROJECT:-}" ]]; then
        echo "cloud"
        return 0
    fi
    
    # Check for tool availability
    if command_exists "docker-compose" || docker compose version >/dev/null 2>&1; then
        if [[ -f "${COMPOSE_FILE}" ]]; then
            echo "compose"
            return 0
        fi
    fi
    
    if command_exists "docker"; then
        echo "docker"
        return 0
    fi
    
    log_error "Could not auto-detect deployment target"
    log_error "Please specify a target explicitly: docker, compose, heroku, or cloud"
    return 1
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --skip-health)
                SKIP_HEALTH="true"
                shift
                ;;
            --image-name)
                IMAGE_NAME="$2"
                shift 2
                ;;
            --image-tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            docker|compose|heroku|cloud|auto)
                DEPLOY_TARGET="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
}

# Main function
main() {
    local start_time
    start_time=$(date +%s)
    
    # Print banner
    cat << 'EOF'
==============================================================================
   Node.js Tutorial Backend - Automated Deployment Script
==============================================================================
EOF
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Auto-detect deployment target if not specified
    if [[ -z "${DEPLOY_TARGET}" ]] || [[ "${DEPLOY_TARGET}" == "auto" ]]; then
        if ! DEPLOY_TARGET=$(auto_detect_target); then
            exit 1
        fi
    fi
    
    # Update image name from package.json if available
    if [[ "${IMAGE_NAME}" == "${DEFAULT_IMAGE_NAME}" ]]; then
        IMAGE_NAME=$(get_project_name)
    fi
    
    log_info "Deployment Configuration:"
    log_info "  Target: ${DEPLOY_TARGET}"
    log_info "  Image: ${IMAGE_NAME}:${IMAGE_TAG}"
    log_info "  Skip Tests: ${SKIP_TESTS}"
    log_info "  Skip Health Check: ${SKIP_HEALTH}"
    log_info "  Verbose: ${VERBOSE}"
    log_info "  CI Mode: ${CI_MODE}"
    
    # Validate environment and tools
    if ! validate_tools; then
        exit 1
    fi
    
    if ! validate_environment; then
        exit 1
    fi
    
    # Run pre-deployment tests
    if ! run_tests; then
        exit 1
    fi
    
    # Execute deployment based on target
    case "${DEPLOY_TARGET}" in
        docker)
            if ! deploy_docker; then
                exit 1
            fi
            ;;
        compose)
            if ! deploy_compose; then
                exit 1
            fi
            ;;
        heroku)
            if ! deploy_heroku; then
                exit 1
            fi
            ;;
        cloud)
            if ! deploy_cloud; then
                exit 1
            fi
            ;;
        *)
            log_error "Invalid deployment target: ${DEPLOY_TARGET}"
            log_error "Valid targets: docker, compose, heroku, cloud"
            exit 1
            ;;
    esac
    
    # Calculate deployment time
    local end_time elapsed_time
    end_time=$(date +%s)
    elapsed_time=$((end_time - start_time))
    
    log_success "Deployment completed successfully in ${elapsed_time} seconds"
    log_info "Target: ${DEPLOY_TARGET}"
    log_info "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    # Print next steps
    case "${DEPLOY_TARGET}" in
        docker)
            log_info "Next steps:"
            log_info "  - Test: curl http://localhost:${DEFAULT_PORT}/hello"
            log_info "  - Logs: docker logs ${IMAGE_NAME}-container"
            log_info "  - Stop: docker stop ${IMAGE_NAME}-container"
            ;;
        compose)
            log_info "Next steps:"
            log_info "  - Test: curl http://localhost:${DEFAULT_PORT}/hello"
            log_info "  - Logs: docker-compose -f ${COMPOSE_FILE} logs"
            log_info "  - Stop: docker-compose -f ${COMPOSE_FILE} down"
            ;;
        heroku)
            log_info "Next steps:"
            log_info "  - Monitor: heroku logs --tail -a ${IMAGE_NAME}"
            log_info "  - Scale: heroku ps:scale web=1 -a ${IMAGE_NAME}"
            log_info "  - Info: heroku apps:info ${IMAGE_NAME}"
            ;;
        cloud)
            log_info "Next steps:"
            log_info "  - Monitor: gcloud run services describe ${IMAGE_NAME} --region=${GCLOUD_REGION:-us-central1}"
            log_info "  - Logs: gcloud run services logs tail ${IMAGE_NAME} --region=${GCLOUD_REGION:-us-central1}"
            log_info "  - Scale: gcloud run services update ${IMAGE_NAME} --max-instances=5"
            ;;
    esac
    
    return 0
}

# ==============================================================================
# SCRIPT EXECUTION
# ==============================================================================

# Trap signals for cleanup
trap 'log_error "Deployment interrupted"; exit 130' INT TERM

# Execute main function with all arguments
main "$@"