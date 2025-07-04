#!/usr/bin/env bash

# =============================================================================
# Node.js Tutorial Backend - Development Environment Setup Script
# =============================================================================
# 
# This script automates the setup of the local development environment for the
# Node.js tutorial backend application. It ensures all prerequisites are met,
# installs dependencies, configures environment variables, and provides clear
# guidance for starting development.
#
# Key Features:
# - Cross-platform compatibility (Linux/macOS/Windows WSL)
# - Idempotent and safe to re-run
# - Comprehensive prerequisite checking
# - Educational guidance and troubleshooting tips
# - Docker integration support
# - Robust error handling and validation
#
# Usage: bash infrastructure/scripts/setup.sh
# =============================================================================

# Shell options for robust error handling
set -euo pipefail

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================

# Determine project root directory based on script location
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly BACKEND_DIR="src/backend"
readonly ENV_FILE="src/backend/.env"
readonly ENV_EXAMPLE_FILE="src/backend/.env.example"

# Version requirements based on technical specification
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# MAIN SETUP FUNCTIONS
# =============================================================================

# Print welcome banner and setup overview
print_banner() {
    print_step "Starting Node.js Tutorial Backend Setup"
    
    cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                   Node.js Tutorial Backend Setup Script                     ║
║                                                                              ║
║    🚀 Express 5.1.0 | Node.js 22.x LTS | Educational Best Practices        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

EOF

    print_info "Welcome to the Node.js Tutorial Backend setup process!"
    print_info "This script will prepare your local development environment with:"
    echo
    echo "  📋 Prerequisites verification (Node.js 18+, npm 11.4.2+)"
    echo "  📦 Dependency installation (Express 5.1.0 and related packages)"
    echo "  ⚙️  Environment configuration (.env file setup)"
    echo "  🐳 Docker integration (optional containerized development)"
    echo "  📚 Developer guidance and troubleshooting tips"
    echo
    print_info "Setup will take approximately 2-3 minutes depending on your connection."
    print_info "The process is idempotent and safe to re-run if needed."
    echo
}

# Check for required tools and verify minimum versions
check_prerequisites() {
    print_step "Checking prerequisites and system requirements"
    
    local prerequisites_met=true
    
    # Check Node.js installation and version
    if command_exists node; then
        local node_version
        node_version=$(node --version 2>/dev/null)
        print_info "Found Node.js version: $node_version"
        
        if version_greater_equal "$node_version" "$NODE_MIN_VERSION"; then
            print_success "Node.js version meets requirements (>= $NODE_MIN_VERSION)"
        else
            print_error "Node.js version $node_version is below minimum requirement $NODE_MIN_VERSION"
            print_error "Please upgrade Node.js to version $NODE_MIN_VERSION or higher"
            prerequisites_met=false
        fi
    else
        print_error "Node.js is not installed or not in PATH"
        print_error "Please install Node.js version $NODE_MIN_VERSION or higher"
        prerequisites_met=false
    fi
    
    # Check npm installation and version
    if command_exists npm; then
        local npm_version
        npm_version=$(npm --version 2>/dev/null)
        print_info "Found npm version: $npm_version"
        
        if version_greater_equal "$npm_version" "$NPM_MIN_VERSION"; then
            print_success "npm version meets requirements (>= $NPM_MIN_VERSION)"
        else
            print_warning "npm version $npm_version is below recommended version $NPM_MIN_VERSION"
            print_warning "Consider upgrading npm with: npm install -g npm@latest"
        fi
    else
        print_error "npm is not installed or not in PATH"
        print_error "npm is typically bundled with Node.js. Please reinstall Node.js."
        prerequisites_met=false
    fi
    
    # Check optional Docker installation
    if command_exists docker; then
        local docker_version
        docker_version=$(docker --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
        print_info "Found Docker version: $docker_version"
        print_success "Docker is available for containerized development"
    else
        print_info "Docker is not installed (optional for containerized development)"
    fi
    
    # Check optional Docker Compose installation
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        local compose_version
        if command_exists docker-compose; then
            compose_version=$(docker-compose --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
        else
            compose_version=$(docker compose version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
        fi
        print_info "Found Docker Compose version: $compose_version"
        print_success "Docker Compose is available for service orchestration"
    else
        print_info "Docker Compose is not installed (optional for service orchestration)"
    fi
    
    # Verify project structure
    if [[ ! -f "$PROJECT_ROOT/$BACKEND_DIR/package.json" ]]; then
        print_error "package.json not found in $PROJECT_ROOT/$BACKEND_DIR"
        print_error "Please ensure you're running this script from the project root directory"
        prerequisites_met=false
    fi
    
    # Exit if prerequisites are not met
    if [[ "$prerequisites_met" == false ]]; then
        print_error "Prerequisites not met. Please address the issues above and re-run the setup."
        echo
        print_info "Installation guides:"
        print_info "  Node.js: https://nodejs.org/en/download/"
        print_info "  Docker: https://docs.docker.com/get-docker/"
        print_info "  Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "All prerequisites verified successfully!"
    echo
}

# Install npm dependencies for the backend
install_dependencies() {
    print_step "Installing project dependencies"
    
    # Change to backend directory
    cd "$PROJECT_ROOT/$BACKEND_DIR"
    
    # Check if node_modules exists and package-lock.json is newer
    if [[ -d "node_modules" && -f "package-lock.json" ]]; then
        print_info "Existing node_modules found, using npm ci for reproducible install"
        
        # Use npm ci for faster, reproducible installs
        if npm ci --silent --no-audit; then
            print_success "Dependencies installed successfully with npm ci"
        else
            print_warning "npm ci failed, falling back to npm install"
            
            # Remove node_modules and try npm install
            rm -rf node_modules
            if npm install --silent --no-audit; then
                print_success "Dependencies installed successfully with npm install"
            else
                print_error "Failed to install dependencies with both npm ci and npm install"
                print_error "Please check your internet connection and Node.js/npm versions"
                exit 1
            fi
        fi
    else
        print_info "No existing node_modules or package-lock.json, using npm install"
        
        # Use npm install for fresh installs
        if npm install --silent --no-audit; then
            print_success "Dependencies installed successfully with npm install"
        else
            print_error "Failed to install dependencies with npm install"
            print_error "Please check your internet connection and Node.js/npm versions"
            exit 1
        fi
    fi
    
    # Verify critical dependencies are installed
    if [[ -f "node_modules/express/package.json" ]]; then
        local express_version
        express_version=$(node -e "console.log(require('./node_modules/express/package.json').version)" 2>/dev/null)
        print_info "Express version installed: $express_version"
    fi
    
    # Return to project root
    cd "$PROJECT_ROOT"
    
    print_success "All dependencies installed and verified!"
    echo
}

# Set up environment file from template
setup_env_file() {
    print_step "Setting up environment configuration"
    
    # Check if .env file exists
    if [[ -f "$PROJECT_ROOT/$ENV_FILE" ]]; then
        print_info "Environment file already exists at $ENV_FILE"
        print_info "Validating existing configuration..."
        
        # Basic validation of existing .env file
        if grep -q "PORT=" "$PROJECT_ROOT/$ENV_FILE"; then
            local port_value
            port_value=$(grep "PORT=" "$PROJECT_ROOT/$ENV_FILE" | cut -d'=' -f2)
            if [[ "$port_value" =~ ^[0-9]+$ ]] && [[ "$port_value" -ge 1024 ]] && [[ "$port_value" -le 65535 ]]; then
                print_success "PORT configuration is valid: $port_value"
            else
                print_warning "PORT value may be invalid: $port_value"
                print_warning "Ensure PORT is between 1024-65535"
            fi
        else
            print_warning "PORT variable not found in .env file"
            print_warning "Default port 3000 will be used"
        fi
        
        if grep -q "ENVIRONMENT=" "$PROJECT_ROOT/$ENV_FILE"; then
            local env_value
            env_value=$(grep "ENVIRONMENT=" "$PROJECT_ROOT/$ENV_FILE" | cut -d'=' -f2)
            if [[ "$env_value" =~ ^(development|production|test)$ ]]; then
                print_success "ENVIRONMENT configuration is valid: $env_value"
            else
                print_warning "ENVIRONMENT value may be invalid: $env_value"
                print_warning "Valid values: development, production, test"
            fi
        else
            print_warning "ENVIRONMENT variable not found in .env file"
            print_warning "Default environment 'development' will be used"
        fi
        
    else
        # Check if .env.example exists
        if [[ -f "$PROJECT_ROOT/$ENV_EXAMPLE_FILE" ]]; then
            print_info "Creating .env file from .env.example template"
            
            # Copy .env.example to .env
            if cp "$PROJECT_ROOT/$ENV_EXAMPLE_FILE" "$PROJECT_ROOT/$ENV_FILE"; then
                print_success "Environment file created successfully at $ENV_FILE"
                print_info "Default configuration loaded from template"
                print_info "  PORT=3000 (HTTP server port)"
                print_info "  ENVIRONMENT=development (application environment)"
                print_info "  Additional monitoring and performance settings included"
            else
                print_error "Failed to create .env file from template"
                print_error "Please manually copy $ENV_EXAMPLE_FILE to $ENV_FILE"
                exit 1
            fi
        else
            print_error "Template file $ENV_EXAMPLE_FILE not found"
            print_error "Cannot create environment configuration automatically"
            print_error "Please create $ENV_FILE manually with required variables"
            exit 1
        fi
    fi
    
    print_success "Environment configuration completed!"
    echo
}

# Print instructions for manual steps and next actions
print_manual_steps() {
    print_step "Setup completed - Next steps and usage instructions"
    
    cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                              🎉 SETUP COMPLETE! 🎉                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

Your Node.js tutorial backend environment is ready for development!

EOF

    print_info "🚀 Starting the Development Server:"
    echo
    echo "  # Navigate to the backend directory"
    echo "  cd $BACKEND_DIR"
    echo
    echo "  # Start the server in production mode"
    echo "  npm start"
    echo
    echo "  # OR start with auto-restart for development"
    echo "  npm run dev"
    echo
    
    print_info "🧪 Testing the Application:"
    echo
    echo "  # Test the /hello endpoint with curl"
    echo "  curl http://localhost:3000/hello"
    echo
    echo "  # OR open in your web browser"
    echo "  http://localhost:3000/hello"
    echo
    echo "  # Expected response: Hello world"
    echo
    
    print_info "🔧 Additional Development Commands:"
    echo
    echo "  # Run the test suite"
    echo "  npm test"
    echo
    echo "  # Run code linting"
    echo "  npm run lint"
    echo
    echo "  # Format code with Prettier"
    echo "  npm run format"
    echo
    
    print_info "🐛 Troubleshooting:"
    echo
    echo "  # If port 3000 is in use, change the port:"
    echo "  PORT=8080 npm start"
    echo
    echo "  # For debugging, enable verbose logging:"
    echo "  DEBUG=express:* npm start"
    echo
    echo "  # Check application health:"
    echo "  curl -i http://localhost:3000/hello"
    echo
    
    print_info "📚 Documentation and Resources:"
    echo
    echo "  # Project documentation"
    echo "  - README.md: Complete project overview"
    echo "  - docs/setup.md: Detailed setup instructions"
    echo "  - docs/api.md: API documentation"
    echo "  - docs/troubleshooting.md: Common issues and solutions"
    echo
    echo "  # External resources"
    echo "  - Node.js Documentation: https://nodejs.org/docs/"
    echo "  - Express.js Guide: https://expressjs.com/guide/"
    echo "  - npm Documentation: https://docs.npmjs.com/"
    echo
}

# Offer Docker-based development options if available
offer_docker_option() {
    print_step "Docker containerization options"
    
    # Check if Docker and Docker Compose are available
    if command_exists docker && (command_exists docker-compose || docker compose version >/dev/null 2>&1); then
        print_info "🐳 Docker Containerized Development Available!"
        echo
        print_info "You can also run the application in containers for consistent development:"
        echo
        
        # Determine Docker Compose command
        local compose_cmd="docker-compose"
        if ! command_exists docker-compose && docker compose version >/dev/null 2>&1; then
            compose_cmd="docker compose"
        fi
        
        echo "  # Start the backend in a container"
        echo "  $compose_cmd -f infrastructure/docker/docker-compose.yml up --build"
        echo
        echo "  # Start in background (detached mode)"
        echo "  $compose_cmd -f infrastructure/docker/docker-compose.yml up -d --build"
        echo
        echo "  # View container logs"
        echo "  $compose_cmd -f infrastructure/docker/docker-compose.yml logs -f backend"
        echo
        echo "  # Stop the container"
        echo "  $compose_cmd -f infrastructure/docker/docker-compose.yml down"
        echo
        echo "  # Remove containers and volumes"
        echo "  $compose_cmd -f infrastructure/docker/docker-compose.yml down -v"
        echo
        
        print_info "🌟 Docker Development Benefits:"
        echo
        echo "  ✅ Consistent environment across different machines"
        echo "  ✅ Isolated dependencies and runtime environment"
        echo "  ✅ Easy cleanup and reset capabilities"
        echo "  ✅ Production-like environment for testing"
        echo "  ✅ Automatic port mapping and service discovery"
        echo
        
        print_info "📦 Container Features:"
        echo
        echo "  • Node.js 22.x LTS Alpine Linux base image"
        echo "  • Automatic dependency installation and caching"
        echo "  • Hot-reloading for development (volume mounting)"
        echo "  • Health checks and monitoring capabilities"
        echo "  • Security hardening with non-root user"
        echo "  • Optimized for both development and production"
        echo
        
        print_info "The containerized setup provides the same functionality as local development"
        print_info "but with additional isolation and consistency benefits."
        
    elif command_exists docker; then
        print_info "🐳 Docker is available, but Docker Compose is not installed"
        print_info "You can still use Docker for basic containerization:"
        echo
        echo "  # Build the container image"
        echo "  docker build -t nodejs-tutorial-backend -f infrastructure/docker/Dockerfile ."
        echo
        echo "  # Run the container"
        echo "  docker run -p 3000:3000 --env-file src/backend/.env nodejs-tutorial-backend"
        echo
        print_info "For full orchestration features, consider installing Docker Compose:"
        print_info "https://docs.docker.com/compose/install/"
        
    else
        print_info "🐳 Docker is not installed (optional for containerized development)"
        print_info "The application works perfectly with local Node.js development"
        print_info "For containerized development, you can install Docker later:"
        print_info "https://docs.docker.com/get-docker/"
    fi
    
    echo
}

# Main function - orchestrates the entire setup process
main() {
    # Print welcome banner and overview
    print_banner
    
    # Verify all prerequisites are met
    check_prerequisites
    
    # Install all npm dependencies
    install_dependencies
    
    # Set up environment configuration
    setup_env_file
    
    # Print manual steps and usage instructions
    print_manual_steps
    
    # Offer Docker-based development options
    offer_docker_option
    
    # Final success message
    print_success "🎉 Node.js Tutorial Backend setup completed successfully!"
    print_success "Your development environment is ready for learning and building!"
    echo
    print_info "Happy coding! 🚀"
    echo
    
    # Exit with success code
    exit 0
}

# =============================================================================
# ERROR HANDLING AND CLEANUP
# =============================================================================

# Error handler for unexpected failures
handle_error() {
    local exit_code=$?
    local line_number=$1
    
    print_error "An unexpected error occurred on line $line_number (exit code: $exit_code)"
    print_error "Setup process was interrupted. Please review the error above."
    echo
    print_info "💡 Troubleshooting tips:"
    print_info "  1. Ensure you have proper permissions to write files"
    print_info "  2. Check your internet connection for dependency downloads"
    print_info "  3. Verify Node.js and npm are properly installed"
    print_info "  4. Try running the script again - it's safe to re-run"
    print_info "  5. Check the project README.md for manual setup instructions"
    echo
    print_info "If the issue persists, please check the troubleshooting documentation:"
    print_info "docs/troubleshooting.md or src/backend/README.md"
    
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
    print_error "Expected files: src/backend/package.json"
    print_error "Please navigate to the project root and run: bash infrastructure/scripts/setup.sh"
    exit 1
fi

# Execute main setup function
main "$@"