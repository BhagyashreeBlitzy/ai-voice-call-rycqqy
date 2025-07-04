#!/usr/bin/env bash

# =============================================================================
# Node.js Tutorial Backend - Deployment Automation Script
# =============================================================================
# 
# This script orchestrates the end-to-end deployment process for the Express 5.1.0
# application, supporting both containerized (Docker, Docker Compose, Kubernetes)
# and native Node.js environments. Automates build, configuration, environment
# validation, image creation, container orchestration, and deployment.
#
# Key Features:
# - Multi-environment deployment support (Docker, Compose, Kubernetes, Native)
# - Cross-platform compatibility (Linux, macOS, Windows/WSL)
# - Comprehensive prerequisite validation
# - Integration with setup.sh for environment preparation
# - Image tagging based on package.json version
# - Idempotent and safe to re-run operations
# - Educational clarity with extensive error handling
# - CI/CD pipeline integration support
#
# Usage:
#   ./deploy.sh --docker           # Build and run Docker container
#   ./deploy.sh --compose          # Use docker-compose for orchestration
#   ./deploy.sh --k8s              # Deploy to Kubernetes cluster
#   ./deploy.sh --native           # Run with native Node.js
#   ./deploy.sh --help             # Show usage information
#   ./deploy.sh --docker --tag 1.0.0  # Deploy with custom tag
#
# =============================================================================

# Shell options for robust error handling
set -euo pipefail

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================

# Project structure and path configuration
readonly PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
readonly BACKEND_DIR="$PROJECT_ROOT/src/backend"
readonly DOCKERFILE_PATH="$PROJECT_ROOT/infrastructure/docker/Dockerfile"
readonly COMPOSE_FILE="$PROJECT_ROOT/infrastructure/docker/docker-compose.yml"
readonly K8S_DEPLOYMENT="$PROJECT_ROOT/infrastructure/kubernetes/deployment.yaml"
readonly K8S_SERVICE="$PROJECT_ROOT/infrastructure/kubernetes/service.yaml"
readonly ENV_FILE="$BACKEND_DIR/.env"
readonly ENV_EXAMPLE_FILE="$BACKEND_DIR/.env.example"
readonly SETUP_SCRIPT="$PROJECT_ROOT/infrastructure/scripts/setup.sh"

# Application metadata from package.json
readonly APP_NAME="nodejs-tutorial-backend"
readonly PACKAGE_JSON="$BACKEND_DIR/package.json"

# Version requirements based on technical specifications
readonly DOCKER_MIN_VERSION="20.10"
readonly COMPOSE_MIN_VERSION="2.0"
readonly KUBECTL_MIN_VERSION="1.20"
readonly NODE_MIN_VERSION="18.0.0"
readonly NPM_MIN_VERSION="11.4.2"

# Colors for enhanced output readability
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Deployment mode flags
DEPLOY_DOCKER=false
DEPLOY_COMPOSE=false
DEPLOY_K8S=false
DEPLOY_NATIVE=false
CUSTOM_TAG=""
VERBOSE=false

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Print colored output with timestamp
print_info() {
    echo -e "${CYAN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Compare semantic versions
version_greater_equal() {
    local version1="$1"
    local version2="$2"
    
    # Handle version strings with 'v' prefix
    version1="${version1#v}"
    version2="${version2#v}"
    
    # Use sort to compare versions
    printf '%s\n%s\n' "$version1" "$version2" | sort -V -C
}

# Extract version from package.json
get_app_version() {
    if [[ -f "$PACKAGE_JSON" ]]; then
        if command_exists node; then
            node -e "console.log(require('$PACKAGE_JSON').version)" 2>/dev/null || echo "latest"
        else
            # Fallback to grep if node is not available
            grep -o '"version":[[:space:]]*"[^"]*"' "$PACKAGE_JSON" | cut -d'"' -f4 || echo "latest"
        fi
    else
        echo "latest"
    fi
}

# =============================================================================
# MAIN DEPLOYMENT FUNCTIONS
# =============================================================================

# Display usage instructions and supported options
print_usage() {
    cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                   Node.js Tutorial Backend Deployment                       ║
║                                                                              ║
║    🚀 Express 5.1.0 | Node.js 22.x LTS | Multi-Environment Support         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

DESCRIPTION:
    This script orchestrates the deployment of the Node.js tutorial backend
    application across multiple environments with comprehensive automation.

USAGE:
    ./deploy.sh [OPTIONS]

OPTIONS:
    --docker              Build and run as standalone Docker container
    --compose             Use Docker Compose for service orchestration
    --k8s                 Deploy to Kubernetes cluster
    --native              Run with native Node.js (no containers)
    --tag <version>       Specify custom image tag (default: from package.json)
    --verbose             Enable verbose output for debugging
    --help                Show this help message

EXAMPLES:
    ./deploy.sh --docker                    # Deploy with Docker
    ./deploy.sh --compose                   # Deploy with Docker Compose
    ./deploy.sh --k8s                       # Deploy to Kubernetes
    ./deploy.sh --native                    # Deploy with native Node.js
    ./deploy.sh --docker --tag 1.0.0       # Deploy with custom tag
    ./deploy.sh --compose --verbose         # Deploy with verbose logging

DEPLOYMENT MODES:

    🐳 Docker Container:
        - Builds optimized container image using Alpine Linux
        - Runs as standalone container with port mapping
        - Supports custom tagging and environment variables
        - Ideal for development and testing environments

    🐳 Docker Compose:
        - Orchestrates multi-container setup with networking
        - Provides volume mounting for development hot-reloading
        - Includes health checks and restart policies
        - Supports both development and production configurations

    ☸️  Kubernetes:
        - Deploys to Kubernetes cluster with proper manifests
        - Includes deployment, service, and ingress configurations
        - Supports rolling updates and horizontal pod autoscaling
        - Production-ready with security policies and resource limits

    🖥️  Native Node.js:
        - Runs directly on the host system without containers
        - Fastest startup time and minimal resource overhead
        - Ideal for development and environments without Docker
        - Uses npm scripts for process management

PREREQUISITES:
    - Node.js >= 18.0.0 (for native deployment)
    - npm >= 11.4.2 (for dependency management)
    - Docker >= 20.10 (for containerized deployments)
    - Docker Compose >= 2.0 (for service orchestration)
    - kubectl >= 1.20 (for Kubernetes deployment)

ENVIRONMENT PREPARATION:
    The script automatically runs setup.sh to ensure:
    - All prerequisites are installed and configured
    - Dependencies are installed via npm
    - Environment variables are properly configured
    - Docker images are built and ready for deployment

CONFIGURATION:
    Environment variables are loaded from:
    - .env file in the backend directory
    - .env.example as template and fallback
    - Command-line environment variable overrides

MONITORING AND HEALTH CHECKS:
    All deployment modes include:
    - Health check endpoints (/hello)
    - Application monitoring and logging
    - Graceful shutdown handling
    - Error recovery mechanisms

SECURITY FEATURES:
    - Non-root user execution in containers
    - Security headers and rate limiting
    - Environment variable validation
    - Secure image building with minimal attack surface

For more information, see:
    - README.md: Complete project documentation
    - docs/setup.md: Detailed setup instructions
    - docs/api.md: API documentation
    - docs/troubleshooting.md: Common issues and solutions

EOF
}

# Verify prerequisites for the specified deployment mode
check_prerequisites() {
    local mode="$1"
    print_step "Checking prerequisites for $mode deployment"
    
    local prerequisites_met=true
    
    # Common prerequisites for all modes
    if [[ ! -f "$PACKAGE_JSON" ]]; then
        print_error "package.json not found at $PACKAGE_JSON"
        print_error "Please ensure you're running this script from the project root"
        prerequisites_met=false
    fi
    
    if [[ ! -f "$SETUP_SCRIPT" ]]; then
        print_error "setup.sh not found at $SETUP_SCRIPT"
        print_error "Cannot prepare environment without setup script"
        prerequisites_met=false
    fi
    
    # Mode-specific prerequisite checks
    case "$mode" in
        "docker")
            if command_exists docker; then
                local docker_version
                docker_version=$(docker --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
                print_info "Found Docker version: $docker_version"
                
                if version_greater_equal "$docker_version" "$DOCKER_MIN_VERSION"; then
                    print_success "Docker version meets requirements (>= $DOCKER_MIN_VERSION)"
                else
                    print_error "Docker version $docker_version is below minimum requirement $DOCKER_MIN_VERSION"
                    prerequisites_met=false
                fi
                
                # Check if Dockerfile exists
                if [[ ! -f "$DOCKERFILE_PATH" ]]; then
                    print_error "Dockerfile not found at $DOCKERFILE_PATH"
                    prerequisites_met=false
                fi
            else
                print_error "Docker is not installed or not in PATH"
                print_error "Please install Docker >= $DOCKER_MIN_VERSION"
                prerequisites_met=false
            fi
            ;;
            
        "compose")
            # Check Docker first
            if command_exists docker; then
                local docker_version
                docker_version=$(docker --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
                if ! version_greater_equal "$docker_version" "$DOCKER_MIN_VERSION"; then
                    print_error "Docker version $docker_version is below minimum requirement $DOCKER_MIN_VERSION"
                    prerequisites_met=false
                fi
            else
                print_error "Docker is not installed (required for Docker Compose)"
                prerequisites_met=false
            fi
            
            # Check Docker Compose
            if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
                local compose_version
                if command_exists docker-compose; then
                    compose_version=$(docker-compose --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
                else
                    compose_version=$(docker compose version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
                fi
                print_info "Found Docker Compose version: $compose_version"
                
                if version_greater_equal "$compose_version" "$COMPOSE_MIN_VERSION"; then
                    print_success "Docker Compose version meets requirements (>= $COMPOSE_MIN_VERSION)"
                else
                    print_warning "Docker Compose version $compose_version is below recommended version $COMPOSE_MIN_VERSION"
                fi
            else
                print_error "Docker Compose is not installed or not in PATH"
                print_error "Please install Docker Compose >= $COMPOSE_MIN_VERSION"
                prerequisites_met=false
            fi
            
            # Check if docker-compose.yml exists
            if [[ ! -f "$COMPOSE_FILE" ]]; then
                print_error "docker-compose.yml not found at $COMPOSE_FILE"
                prerequisites_met=false
            fi
            ;;
            
        "k8s")
            # Check kubectl
            if command_exists kubectl; then
                local kubectl_version
                kubectl_version=$(kubectl version --client --short 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
                print_info "Found kubectl version: $kubectl_version"
                
                if version_greater_equal "$kubectl_version" "$KUBECTL_MIN_VERSION"; then
                    print_success "kubectl version meets requirements (>= $KUBECTL_MIN_VERSION)"
                else
                    print_error "kubectl version $kubectl_version is below minimum requirement $KUBECTL_MIN_VERSION"
                    prerequisites_met=false
                fi
                
                # Check cluster connectivity
                if kubectl cluster-info >/dev/null 2>&1; then
                    print_success "Kubernetes cluster is accessible"
                else
                    print_warning "Cannot connect to Kubernetes cluster"
                    print_warning "Please ensure kubectl is configured and cluster is accessible"
                fi
            else
                print_error "kubectl is not installed or not in PATH"
                print_error "Please install kubectl >= $KUBECTL_MIN_VERSION"
                prerequisites_met=false
            fi
            
            # Check if Kubernetes manifests exist
            if [[ ! -f "$K8S_DEPLOYMENT" ]]; then
                print_error "Kubernetes deployment manifest not found at $K8S_DEPLOYMENT"
                prerequisites_met=false
            fi
            
            if [[ ! -f "$K8S_SERVICE" ]]; then
                print_error "Kubernetes service manifest not found at $K8S_SERVICE"
                prerequisites_met=false
            fi
            ;;
            
        "native")
            # Check Node.js
            if command_exists node; then
                local node_version
                node_version=$(node --version 2>/dev/null)
                print_info "Found Node.js version: $node_version"
                
                if version_greater_equal "$node_version" "$NODE_MIN_VERSION"; then
                    print_success "Node.js version meets requirements (>= $NODE_MIN_VERSION)"
                else
                    print_error "Node.js version $node_version is below minimum requirement $NODE_MIN_VERSION"
                    prerequisites_met=false
                fi
            else
                print_error "Node.js is not installed or not in PATH"
                print_error "Please install Node.js >= $NODE_MIN_VERSION"
                prerequisites_met=false
            fi
            
            # Check npm
            if command_exists npm; then
                local npm_version
                npm_version=$(npm --version 2>/dev/null)
                print_info "Found npm version: $npm_version"
                
                if version_greater_equal "$npm_version" "$NPM_MIN_VERSION"; then
                    print_success "npm version meets requirements (>= $NPM_MIN_VERSION)"
                else
                    print_warning "npm version $npm_version is below recommended version $NPM_MIN_VERSION"
                fi
            else
                print_error "npm is not installed or not in PATH"
                prerequisites_met=false
            fi
            ;;
    esac
    
    if [[ "$prerequisites_met" == false ]]; then
        print_error "Prerequisites not met for $mode deployment"
        print_error "Please address the issues above and re-run the deployment"
        exit 1
    fi
    
    print_success "All prerequisites verified for $mode deployment"
}

# Prepare environment by running setup.sh
prepare_environment() {
    print_step "Preparing environment using setup.sh"
    
    if [[ ! -f "$SETUP_SCRIPT" ]]; then
        print_error "setup.sh not found at $SETUP_SCRIPT"
        print_error "Cannot prepare environment without setup script"
        exit 1
    fi
    
    # Make setup script executable
    chmod +x "$SETUP_SCRIPT"
    
    # Run setup script
    print_info "Running setup.sh to prepare environment..."
    if bash "$SETUP_SCRIPT"; then
        print_success "Environment preparation completed successfully"
    else
        print_error "Environment preparation failed"
        print_error "Please check the setup.sh output above for details"
        exit 1
    fi
}

# Build Docker image with specified tag
build_docker_image() {
    local image_tag="${1:-$(get_app_version)}"
    
    print_step "Building Docker image with tag: $image_tag"
    
    # Verify Dockerfile exists
    if [[ ! -f "$DOCKERFILE_PATH" ]]; then
        print_error "Dockerfile not found at $DOCKERFILE_PATH"
        exit 1
    fi
    
    # Build image from project root
    cd "$PROJECT_ROOT"
    
    print_info "Building Docker image: $APP_NAME:$image_tag"
    print_info "Using Dockerfile: $DOCKERFILE_PATH"
    print_info "Build context: $PROJECT_ROOT"
    
    # Build command with comprehensive options
    local build_args=""
    if [[ "$VERBOSE" == true ]]; then
        build_args="--progress=plain"
    fi
    
    if docker build $build_args \
        --tag "$APP_NAME:$image_tag" \
        --tag "$APP_NAME:latest" \
        --file "$DOCKERFILE_PATH" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --build-arg VERSION="$image_tag" \
        .; then
        print_success "Docker image built successfully: $APP_NAME:$image_tag"
        
        # Display image information
        print_info "Image details:"
        docker images "$APP_NAME:$image_tag" --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}\t{{.Size}}"
        
        return 0
    else
        print_error "Failed to build Docker image"
        print_error "Please check the Dockerfile and build context"
        exit 1
    fi
}

# Run Docker container with specified configuration
run_docker_container() {
    local image_tag="${1:-$(get_app_version)}"
    
    print_step "Running Docker container with image: $APP_NAME:$image_tag"
    
    # Verify image exists
    if ! docker images -q "$APP_NAME:$image_tag" | grep -q .; then
        print_warning "Image $APP_NAME:$image_tag not found, building it now..."
        build_docker_image "$image_tag"
    fi
    
    # Prepare environment file
    local env_file_option=""
    if [[ -f "$ENV_FILE" ]]; then
        env_file_option="--env-file $ENV_FILE"
        print_info "Using environment file: $ENV_FILE"
    else
        print_warning "Environment file not found at $ENV_FILE"
        print_warning "Using default environment variables"
    fi
    
    # Determine port configuration
    local port_mapping="3000:3000"
    if [[ -f "$ENV_FILE" ]] && grep -q "PORT=" "$ENV_FILE"; then
        local host_port
        host_port=$(grep "PORT=" "$ENV_FILE" | cut -d'=' -f2)
        port_mapping="$host_port:3000"
    fi
    
    # Stop existing container if running
    if docker ps -q --filter "name=$APP_NAME" | grep -q .; then
        print_info "Stopping existing container..."
        docker stop "$APP_NAME" >/dev/null 2>&1 || true
        docker rm "$APP_NAME" >/dev/null 2>&1 || true
    fi
    
    # Run container with comprehensive configuration
    print_info "Starting container with port mapping: $port_mapping"
    
    local container_id
    container_id=$(docker run -d \
        --name "$APP_NAME" \
        --restart unless-stopped \
        -p "$port_mapping" \
        $env_file_option \
        --health-cmd="curl -f http://localhost:3000/hello || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        --health-start-period=40s \
        --label "com.tutorial.service=backend" \
        --label "com.tutorial.deployment=docker" \
        --label "com.tutorial.version=$image_tag" \
        "$APP_NAME:$image_tag")
    
    if [[ -n "$container_id" ]]; then
        print_success "Container started successfully"
        print_info "Container ID: $container_id"
        print_info "Container name: $APP_NAME"
        
        # Wait for container to be ready
        print_info "Waiting for container to be ready..."
        local max_wait=60
        local wait_count=0
        
        while [[ $wait_count -lt $max_wait ]]; do
            if docker ps --filter "name=$APP_NAME" --filter "status=running" | grep -q "$APP_NAME"; then
                if curl -f "http://localhost:${port_mapping%:*}/hello" >/dev/null 2>&1; then
                    print_success "Container is ready and responding"
                    break
                fi
            fi
            sleep 2
            ((wait_count+=2))
        done
        
        if [[ $wait_count -ge $max_wait ]]; then
            print_warning "Container may not be fully ready yet"
            print_info "You can check the logs with: docker logs $APP_NAME"
        fi
        
        # Display access information
        print_info "🚀 Application is running!"
        print_info "   Access URL: http://localhost:${port_mapping%:*}/hello"
        print_info "   Container name: $APP_NAME"
        print_info "   Image: $APP_NAME:$image_tag"
        print_info ""
        print_info "Useful commands:"
        print_info "   View logs: docker logs -f $APP_NAME"
        print_info "   Check status: docker ps --filter name=$APP_NAME"
        print_info "   Stop container: docker stop $APP_NAME"
        print_info "   Remove container: docker rm $APP_NAME"
        
    else
        print_error "Failed to start container"
        print_error "Please check Docker logs and configuration"
        exit 1
    fi
}

# Deploy using Docker Compose
run_docker_compose() {
    print_step "Deploying with Docker Compose"
    
    # Verify docker-compose.yml exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        print_error "docker-compose.yml not found at $COMPOSE_FILE"
        exit 1
    fi
    
    # Determine Docker Compose command
    local compose_cmd="docker-compose"
    if ! command_exists docker-compose && docker compose version >/dev/null 2>&1; then
        compose_cmd="docker compose"
    fi
    
    # Change to project root for proper context
    cd "$PROJECT_ROOT"
    
    # Set environment variables for Docker Compose
    export COMPOSE_PROJECT_NAME="nodejs-tutorial"
    export COMPOSE_FILE="$COMPOSE_FILE"
    
    # Stop existing services
    print_info "Stopping existing services..."
    $compose_cmd -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    
    # Build and start services
    print_info "Building and starting services with Docker Compose..."
    
    local compose_args=""
    if [[ "$VERBOSE" == true ]]; then
        compose_args="--verbose"
    fi
    
    if $compose_cmd -f "$COMPOSE_FILE" up -d --build $compose_args; then
        print_success "Services started successfully with Docker Compose"
        
        # Wait for services to be ready
        print_info "Waiting for services to be ready..."
        local max_wait=60
        local wait_count=0
        
        while [[ $wait_count -lt $max_wait ]]; do
            if $compose_cmd -f "$COMPOSE_FILE" ps --filter "status=running" | grep -q "backend"; then
                if curl -f "http://localhost:3000/hello" >/dev/null 2>&1; then
                    print_success "Services are ready and responding"
                    break
                fi
            fi
            sleep 2
            ((wait_count+=2))
        done
        
        if [[ $wait_count -ge $max_wait ]]; then
            print_warning "Services may not be fully ready yet"
            print_info "You can check the logs with: $compose_cmd -f $COMPOSE_FILE logs -f"
        fi
        
        # Display service information
        print_info "🚀 Application is running with Docker Compose!"
        print_info "   Access URL: http://localhost:3000/hello"
        print_info "   Compose file: $COMPOSE_FILE"
        print_info ""
        print_info "Useful commands:"
        print_info "   View logs: $compose_cmd -f $COMPOSE_FILE logs -f backend"
        print_info "   Check status: $compose_cmd -f $COMPOSE_FILE ps"
        print_info "   Stop services: $compose_cmd -f $COMPOSE_FILE down"
        print_info "   Remove volumes: $compose_cmd -f $COMPOSE_FILE down -v"
        print_info "   Restart services: $compose_cmd -f $COMPOSE_FILE restart"
        
    else
        print_error "Failed to start services with Docker Compose"
        print_error "Please check the docker-compose.yml file and Docker daemon"
        exit 1
    fi
}

# Deploy to Kubernetes cluster
deploy_kubernetes() {
    print_step "Deploying to Kubernetes cluster"
    
    # Verify Kubernetes manifests exist
    if [[ ! -f "$K8S_DEPLOYMENT" ]]; then
        print_error "Kubernetes deployment manifest not found at $K8S_DEPLOYMENT"
        exit 1
    fi
    
    if [[ ! -f "$K8S_SERVICE" ]]; then
        print_error "Kubernetes service manifest not found at $K8S_SERVICE"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot connect to Kubernetes cluster"
        print_error "Please ensure kubectl is configured and cluster is accessible"
        exit 1
    fi
    
    print_info "Connected to Kubernetes cluster"
    kubectl cluster-info --context=$(kubectl config current-context)
    
    # Apply deployment manifest
    print_info "Applying Kubernetes deployment manifest..."
    if kubectl apply -f "$K8S_DEPLOYMENT"; then
        print_success "Deployment applied successfully"
    else
        print_error "Failed to apply deployment manifest"
        exit 1
    fi
    
    # Apply service manifest
    print_info "Applying Kubernetes service manifest..."
    if kubectl apply -f "$K8S_SERVICE"; then
        print_success "Service applied successfully"
    else
        print_error "Failed to apply service manifest"
        exit 1
    fi
    
    # Wait for deployment to be ready
    print_info "Waiting for deployment to be ready..."
    if kubectl wait --for=condition=available --timeout=300s deployment/nodejs-tutorial-backend; then
        print_success "Deployment is ready"
    else
        print_warning "Deployment may not be fully ready yet"
        print_info "You can check the status with: kubectl get deployment nodejs-tutorial-backend"
    fi
    
    # Display deployment information
    print_info "🚀 Application deployed to Kubernetes!"
    print_info ""
    print_info "Deployment information:"
    kubectl get deployment nodejs-tutorial-backend -o wide
    print_info ""
    print_info "Service information:"
    kubectl get service nodejs-tutorial-backend -o wide
    print_info ""
    print_info "Pod information:"
    kubectl get pods -l app=nodejs-tutorial-backend -o wide
    print_info ""
    print_info "Useful commands:"
    print_info "   View logs: kubectl logs -l app=nodejs-tutorial-backend -f"
    print_info "   Check status: kubectl get pods -l app=nodejs-tutorial-backend"
    print_info "   Port forward: kubectl port-forward service/nodejs-tutorial-backend 3000:3000"
    print_info "   Scale deployment: kubectl scale deployment nodejs-tutorial-backend --replicas=2"
    print_info "   Delete deployment: kubectl delete -f $K8S_DEPLOYMENT"
    print_info "   Delete service: kubectl delete -f $K8S_SERVICE"
    
    # Check if service is accessible
    local service_type
    service_type=$(kubectl get service nodejs-tutorial-backend -o jsonpath='{.spec.type}')
    
    if [[ "$service_type" == "LoadBalancer" ]]; then
        print_info "Service is exposed via LoadBalancer, checking external IP..."
        local external_ip
        external_ip=$(kubectl get service nodejs-tutorial-backend -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        
        if [[ -n "$external_ip" ]]; then
            print_info "   External access: http://$external_ip:3000/hello"
        else
            print_info "   External IP pending, use port-forward for now"
        fi
    else
        print_info "   Local access: kubectl port-forward service/nodejs-tutorial-backend 3000:3000"
        print_info "   Then visit: http://localhost:3000/hello"
    fi
}

# Run with native Node.js
run_native_node() {
    print_step "Running with native Node.js"
    
    # Change to backend directory
    cd "$BACKEND_DIR"
    
    # Verify package.json exists
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found in $BACKEND_DIR"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [[ ! -d "node_modules" ]]; then
        print_warning "node_modules not found, installing dependencies..."
        if npm install; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            exit 1
        fi
    fi
    
    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        print_warning ".env file not found, using default configuration"
        if [[ -f ".env.example" ]]; then
            print_info "Copying .env.example to .env"
            cp ".env.example" ".env"
        fi
    fi
    
    # Start the application
    print_info "Starting Node.js application..."
    print_info "Using start script from package.json"
    
    # Check if start script exists
    if npm run start --silent 2>/dev/null; then
        print_success "Application started successfully"
    else
        print_error "Failed to start application with npm start"
        print_info "Trying alternative start method..."
        
        # Try direct node execution
        if [[ -f "server.js" ]]; then
            print_info "Starting server.js directly..."
            node server.js
        elif [[ -f "app.js" ]]; then
            print_info "Starting app.js directly..."
            node app.js
        else
            print_error "Cannot find server.js or app.js to start the application"
            exit 1
        fi
    fi
}

# =============================================================================
# COMMAND LINE ARGUMENT PARSING
# =============================================================================

# Parse command line arguments
parse_arguments() {
    if [[ $# -eq 0 ]]; then
        print_usage
        exit 0
    fi
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                DEPLOY_DOCKER=true
                shift
                ;;
            --compose)
                DEPLOY_COMPOSE=true
                shift
                ;;
            --k8s)
                DEPLOY_K8S=true
                shift
                ;;
            --native)
                DEPLOY_NATIVE=true
                shift
                ;;
            --tag)
                if [[ -n "$2" ]] && [[ "$2" != --* ]]; then
                    CUSTOM_TAG="$2"
                    shift 2
                else
                    print_error "Option --tag requires a value"
                    exit 1
                fi
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                print_error "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Validate that at least one deployment mode is selected
    if [[ "$DEPLOY_DOCKER" == false && "$DEPLOY_COMPOSE" == false && "$DEPLOY_K8S" == false && "$DEPLOY_NATIVE" == false ]]; then
        print_error "No deployment mode specified"
        print_error "Please specify at least one deployment mode: --docker, --compose, --k8s, or --native"
        print_error "Use --help for usage information"
        exit 1
    fi
}

# =============================================================================
# MAIN EXECUTION FLOW
# =============================================================================

# Main function orchestrates the entire deployment process
main() {
    # Print welcome banner
    print_step "Starting Node.js Tutorial Backend deployment process"
    
    cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                   Node.js Tutorial Backend Deployment                       ║
║                                                                              ║
║    🚀 Express 5.1.0 | Node.js 22.x LTS | Multi-Environment Support         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

EOF
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Display deployment configuration
    print_info "Deployment configuration:"
    print_info "  Project root: $PROJECT_ROOT"
    print_info "  Backend directory: $BACKEND_DIR"
    print_info "  Application name: $APP_NAME"
    print_info "  Application version: $(get_app_version)"
    
    if [[ -n "$CUSTOM_TAG" ]]; then
        print_info "  Custom tag: $CUSTOM_TAG"
    fi
    
    if [[ "$VERBOSE" == true ]]; then
        print_info "  Verbose output: enabled"
    fi
    
    echo
    
    # Execute deployment modes in order
    if [[ "$DEPLOY_DOCKER" == true ]]; then
        print_step "Executing Docker deployment"
        check_prerequisites "docker"
        prepare_environment
        
        local tag="${CUSTOM_TAG:-$(get_app_version)}"
        build_docker_image "$tag"
        run_docker_container "$tag"
        
        print_success "Docker deployment completed successfully"
        echo
    fi
    
    if [[ "$DEPLOY_COMPOSE" == true ]]; then
        print_step "Executing Docker Compose deployment"
        check_prerequisites "compose"
        prepare_environment
        
        run_docker_compose
        
        print_success "Docker Compose deployment completed successfully"
        echo
    fi
    
    if [[ "$DEPLOY_K8S" == true ]]; then
        print_step "Executing Kubernetes deployment"
        check_prerequisites "k8s"
        prepare_environment
        
        deploy_kubernetes
        
        print_success "Kubernetes deployment completed successfully"
        echo
    fi
    
    if [[ "$DEPLOY_NATIVE" == true ]]; then
        print_step "Executing native Node.js deployment"
        check_prerequisites "native"
        prepare_environment
        
        run_native_node
        
        print_success "Native Node.js deployment completed successfully"
        echo
    fi
    
    # Final success message
    print_success "🎉 All requested deployments completed successfully!"
    print_info "Your Node.js tutorial backend is now deployed and ready for use!"
    echo
    print_info "Happy coding! 🚀"
}

# =============================================================================
# ERROR HANDLING AND CLEANUP
# =============================================================================

# Error handler for unexpected failures
handle_error() {
    local exit_code=$?
    local line_number=$1
    
    print_error "An unexpected error occurred on line $line_number (exit code: $exit_code)"
    print_error "Deployment process was interrupted"
    echo
    print_info "💡 Troubleshooting tips:"
    print_info "  1. Check prerequisites for your deployment mode"
    print_info "  2. Verify Docker daemon is running (for container deployments)"
    print_info "  3. Ensure kubectl is configured (for Kubernetes deployments)"
    print_info "  4. Check network connectivity and permissions"
    print_info "  5. Try running with --verbose for more detailed output"
    print_info "  6. Review the error messages above for specific issues"
    echo
    print_info "For more help, see:"
    print_info "  - docs/troubleshooting.md"
    print_info "  - README.md"
    print_info "  - Use --help for usage information"
    
    exit $exit_code
}

# Set up error trap
trap 'handle_error $LINENO' ERR

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Ensure script is run from the correct directory
if [[ ! -f "$PROJECT_ROOT/src/backend/package.json" ]]; then
    print_error "This script must be run from the project root directory"
    print_error "Current directory: $(pwd)"
    print_error "Expected structure: src/backend/package.json"
    print_error "Please navigate to the project root and run: ./infrastructure/scripts/deploy.sh"
    exit 1
fi

# Make script executable
chmod +x "$0"

# Execute main function with all arguments
main "$@"