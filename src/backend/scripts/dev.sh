#!/bin/bash

# ==============================================================================
# Node.js Tutorial Development Environment Startup Script
# ==============================================================================
#
# Comprehensive development environment orchestration script for the Node.js
# v22.11.0 LTS tutorial application using Express.js v5.1.0 framework.
#
# Features:
# - Complete environment validation and setup
# - Node.js 22.x LTS compatibility verification
# - Express.js 5.1.0 development server management
# - Nodemon v3.1.4 integration with hot reloading
# - Educational workflow with comprehensive logging
# - Port conflict detection and resolution
# - Dependency management and validation
# - Signal handling and graceful shutdown
# - Development-friendly error reporting
#
# Compatible with:
# - Bash 4.0+ (macOS, Linux, Windows WSL/Git Bash)
# - Node.js 22.11.0 LTS (minimum 22.0.0)
# - NPM 11.5.2 (minimum 10.0.0)
# - Express.js 5.1.0 with enhanced async/await support
# - Nodemon 3.1.4 with advanced file watching
#
# Usage:
#   ./scripts/dev.sh              # Start development server
#   npm run dev                   # Alternative via package.json script
#   DEBUG=true ./scripts/dev.sh   # Enable verbose debugging
#
# Educational Value:
# - Demonstrates Node.js development environment best practices
# - Shows comprehensive shell scripting for application lifecycle management
# - Illustrates port management and conflict resolution techniques
# - Provides production-ready development workflow patterns
#
# ==============================================================================

# Script metadata and global variables
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
readonly STARTUP_TIMESTAMP="$(date -Iseconds)"

# Default configuration constants
readonly DEFAULT_PORT=3000
readonly DEFAULT_HOST="localhost"
readonly DEFAULT_NODE_ENV="development"
readonly REQUIRED_NODE_VERSION="22"
readonly REQUIRED_NPM_VERSION="10"
readonly NODEMON_VERSION="3.1.4"
readonly EXPRESS_VERSION="5.1.0"

# Color codes for enhanced console output and educational clarity
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_YELLOW='\033[0;33m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_PURPLE='\033[0;35m'
readonly COLOR_CYAN='\033[0;36m'
readonly COLOR_WHITE='\033[0;37m'
readonly COLOR_BOLD='\033[1m'
readonly COLOR_RESET='\033[0m'

# Educational banner symbols and formatting
readonly BANNER_SYMBOL="🚀"
readonly SUCCESS_SYMBOL="✅"
readonly WARNING_SYMBOL="⚠️"
readonly ERROR_SYMBOL="❌"
readonly INFO_SYMBOL="ℹ️"
readonly DEBUG_SYMBOL="🐛"

# Environment and configuration variables
LOG_LEVEL="${LOG_LEVEL:-debug}"
DEBUG_MODE="${DEBUG:-true}"
VERBOSE_MODE="${VERBOSE:-true}"
WATCH_FILES="${WATCH_FILES:-true}"
HOT_RELOAD="${HOT_RELOAD:-true}"

# Process management variables
NODEMON_PID=""
SERVER_STARTED=false
CLEANUP_PERFORMED=false

# ==============================================================================
# LOGGING AND OUTPUT FUNCTIONS
# ==============================================================================

# Enhanced logging function with timestamps, colors, and educational context
log_development_message() {
    local level="$1"
    local message="$2"
    local context="${3:-main}"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S.%3N')"
    local color=""
    local symbol=""
    
    # Determine color and symbol based on log level for visual clarity
    case "${level}" in
        "error")
            color="${COLOR_RED}"
            symbol="${ERROR_SYMBOL}"
            ;;
        "warn")
            color="${COLOR_YELLOW}"
            symbol="${WARNING_SYMBOL}"
            ;;
        "info")
            color="${COLOR_GREEN}"
            symbol="${SUCCESS_SYMBOL}"
            ;;
        "debug")
            color="${COLOR_CYAN}"
            symbol="${DEBUG_SYMBOL}"
            ;;
        "trace")
            color="${COLOR_PURPLE}"
            symbol="${INFO_SYMBOL}"
            ;;
        *)
            color="${COLOR_WHITE}"
            symbol="${INFO_SYMBOL}"
            ;;
    esac
    
    # Educational formatted output with comprehensive context
    printf "${color}${COLOR_BOLD}[%s]${COLOR_RESET} ${color}%s %s${COLOR_RESET} ${COLOR_BOLD}[%s:%s]${COLOR_RESET} %s\n" \
        "${timestamp}" \
        "${symbol}" \
        "${level^^}" \
        "${SCRIPT_NAME}" \
        "${context}" \
        "${message}"
}

# Print educational banner with tutorial application information
print_banner() {
    local node_version="$(node --version 2>/dev/null || echo 'not installed')"
    local npm_version="$(npm --version 2>/dev/null || echo 'not installed')"
    local express_version="${EXPRESS_VERSION}"
    local nodemon_version="${NODEMON_VERSION}"
    
    clear
    echo ""
    printf "${COLOR_CYAN}${COLOR_BOLD}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    NODE.JS TUTORIAL DEVELOPMENT ENVIRONMENT                 ║"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  ${BANNER_SYMBOL} Application: Node.js Hello World Tutorial                              ║\n"
    printf "║  🎯 Purpose: Educational HTTP Server with Express.js Framework              ║\n"
    printf "║  📚 Learning: Node.js Fundamentals & Development Workflow                   ║\n"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  🔧 Node.js Version: %-20s Express.js: %-20s ║\n" "${node_version}" "v${express_version}"
    printf "║  📦 NPM Version: %-20s Nodemon: %-23s ║\n" "v${npm_version}" "v${nodemon_version}"
    printf "║  🌟 Environment: %-20s Timestamp: %-20s ║\n" "${DEFAULT_NODE_ENV}" "$(date '+%H:%M:%S')"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  🚀 Starting comprehensive development server with hot reloading...          ║\n"
    printf "║  🔥 Educational features: Verbose logging, debugging, port management        ║\n"
    printf "║  📖 Documentation: Complete HTTP lifecycle demonstration                     ║\n"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  💡 Development Commands:                                                    ║\n"
    printf "║     npm run dev          - Start development server                         ║\n"
    printf "║     npm run test         - Run comprehensive test suite                     ║\n"
    printf "║     npm run lint         - Code quality analysis                            ║\n"
    printf "║     Ctrl+C              - Graceful server shutdown                         ║\n"
    printf "║     rs + Enter          - Manual server restart                            ║\n"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    printf "${COLOR_RESET}\n"
    
    log_development_message "info" "Development environment initialization started" "banner"
    log_development_message "debug" "Script location: ${SCRIPT_DIR}" "banner"
    log_development_message "debug" "Project root: ${PROJECT_ROOT}" "banner"
    log_development_message "trace" "Startup timestamp: ${STARTUP_TIMESTAMP}" "banner"
}

# ==============================================================================
# ENVIRONMENT VALIDATION FUNCTIONS
# ==============================================================================

# Comprehensive environment validation including Node.js version, NPM, and project structure
validate_environment() {
    log_development_message "info" "Performing comprehensive environment validation..." "validation"
    
    # Change to project root directory for accurate validation
    cd "${PROJECT_ROOT}" || {
        log_development_message "error" "Cannot change to project root directory: ${PROJECT_ROOT}" "validation"
        return 1
    }
    
    # Validate Node.js installation and version compatibility
    log_development_message "debug" "Checking Node.js installation and version..." "validation"
    
    if ! command -v node >/dev/null 2>&1; then
        log_development_message "error" "Node.js is not installed. Please install Node.js ${REQUIRED_NODE_VERSION}.x LTS" "validation"
        log_development_message "info" "Download Node.js from: https://nodejs.org/en/download/" "validation"
        return 1
    fi
    
    local node_version
    node_version="$(node --version | sed 's/v//' | cut -d'.' -f1)"
    
    if [[ "${node_version}" -lt "${REQUIRED_NODE_VERSION}" ]]; then
        log_development_message "error" "Node.js version ${node_version}.x is not compatible. Requires Node.js ${REQUIRED_NODE_VERSION}.x LTS or higher" "validation"
        log_development_message "warn" "Current version: $(node --version), Required: v${REQUIRED_NODE_VERSION}.x LTS" "validation"
        log_development_message "info" "Educational Note: Node.js ${REQUIRED_NODE_VERSION}.x LTS provides enhanced performance and security features" "validation"
        return 1
    fi
    
    log_development_message "info" "Node.js version validation passed: $(node --version)" "validation"
    
    # Validate NPM package manager availability and version
    log_development_message "debug" "Checking NPM package manager installation..." "validation"
    
    if ! command -v npm >/dev/null 2>&1; then
        log_development_message "error" "NPM is not installed. NPM should be included with Node.js installation" "validation"
        log_development_message "info" "Educational Note: NPM is the Node.js package manager for dependency management" "validation"
        return 1
    fi
    
    local npm_version
    npm_version="$(npm --version | cut -d'.' -f1)"
    
    if [[ "${npm_version}" -lt "${REQUIRED_NPM_VERSION}" ]]; then
        log_development_message "warn" "NPM version $(npm --version) is below recommended version ${REQUIRED_NPM_VERSION}.x" "validation"
        log_development_message "info" "Consider upgrading: npm install -g npm@latest" "validation"
    else
        log_development_message "info" "NPM version validation passed: v$(npm --version)" "validation"
    fi
    
    # Validate project structure and essential files
    log_development_message "debug" "Validating project structure and configuration files..." "validation"
    
    local required_files=(
        "package.json"
        "nodemon.json"
        "src/server.js"
        ".env.example"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "${file}" ]]; then
            log_development_message "error" "Required file missing: ${file}" "validation"
            log_development_message "info" "Educational Note: ${file} is essential for Node.js development workflow" "validation"
            return 1
        fi
        log_development_message "trace" "Required file found: ${file}" "validation"
    done
    
    # Validate package.json structure and essential properties
    log_development_message "debug" "Validating package.json configuration..." "validation"
    
    if ! node -e "require('./package.json')" 2>/dev/null; then
        log_development_message "error" "package.json is not valid JSON" "validation"
        log_development_message "info" "Educational Note: package.json must contain valid JSON for NPM to process dependencies" "validation"
        return 1
    fi
    
    # Check for main entry point specification
    local main_entry
    main_entry="$(node -e "console.log(require('./package.json').main)" 2>/dev/null)"
    
    if [[ -z "${main_entry}" ]]; then
        log_development_message "warn" "No main entry point specified in package.json" "validation"
    elif [[ ! -f "${main_entry}" ]]; then
        log_development_message "error" "Main entry point file not found: ${main_entry}" "validation"
        return 1
    else
        log_development_message "trace" "Main entry point validated: ${main_entry}" "validation"
    fi
    
    # Validate scripts section for development workflow
    if ! node -e "require('./package.json').scripts.dev" >/dev/null 2>&1; then
        log_development_message "warn" "No 'dev' script defined in package.json" "validation"
        log_development_message "info" "Educational Note: 'dev' script typically starts the development server" "validation"
    fi
    
    log_development_message "info" "Environment validation completed successfully" "validation"
    log_development_message "debug" "All required components verified for development workflow" "validation"
    
    return 0
}

# ==============================================================================
# ENVIRONMENT SETUP FUNCTIONS
# ==============================================================================

# Set up development environment variables with fallback defaults
setup_environment_variables() {
    log_development_message "info" "Setting up development environment variables..." "env_setup"
    
    # Load .env file if it exists for custom configuration
    if [[ -f ".env" ]]; then
        log_development_message "debug" "Loading environment variables from .env file..." "env_setup"
        set -o allexport
        source ".env"
        set +o allexport
        log_development_message "trace" "Custom environment variables loaded from .env" "env_setup"
    else
        log_development_message "debug" "No .env file found, using defaults from .env.example" "env_setup"
        log_development_message "info" "Educational Note: Copy .env.example to .env for custom configuration" "env_setup"
    fi
    
    # Set Node.js environment with development default
    export NODE_ENV="${NODE_ENV:-${DEFAULT_NODE_ENV}}"
    log_development_message "trace" "NODE_ENV set to: ${NODE_ENV}" "env_setup"
    
    # Configure server port with environment override
    export PORT="${PORT:-${DEFAULT_PORT}}"
    log_development_message "trace" "PORT set to: ${PORT}" "env_setup"
    
    # Configure host binding address
    export HOST="${HOST:-${DEFAULT_HOST}}"
    log_development_message "trace" "HOST set to: ${HOST}" "env_setup"
    
    # Enable debug mode for comprehensive logging
    export DEBUG="${DEBUG:-${DEBUG_MODE}}"
    log_development_message "trace" "DEBUG set to: ${DEBUG}" "env_setup"
    
    # Set log level for development verbosity
    export LOG_LEVEL="${LOG_LEVEL:-debug}"
    log_development_message "trace" "LOG_LEVEL set to: ${LOG_LEVEL}" "env_setup"
    
    # Configure verbose mode for educational output
    export VERBOSE="${VERBOSE:-${VERBOSE_MODE}}"
    log_development_message "trace" "VERBOSE set to: ${VERBOSE}" "env_setup"
    
    # Development-specific Express.js configuration
    export EXPRESS_ENV="development"
    export EXPRESS_DEBUG="true"
    
    # Nodemon-specific environment variables
    export NODEMON_WATCH="${WATCH_FILES}"
    export NODEMON_DELAY="2000"
    export NODEMON_VERBOSE="true"
    
    # Performance monitoring configuration
    export ENABLE_PERFORMANCE_MONITORING="true"
    export MEMORY_MONITORING="true"
    
    # Educational development features
    export EDUCATIONAL_MODE="true"
    export DETAILED_LOGGING="true"
    export SHOW_STARTUP_INFO="true"
    
    log_development_message "info" "Environment variables configured for development" "env_setup"
    
    # Display loaded configuration for transparency
    if [[ "${DEBUG_MODE}" == "true" ]]; then
        log_development_message "debug" "Development Environment Configuration:" "env_setup"
        log_development_message "debug" "  NODE_ENV=${NODE_ENV}" "env_setup"
        log_development_message "debug" "  PORT=${PORT}" "env_setup"
        log_development_message "debug" "  HOST=${HOST}" "env_setup"
        log_development_message "debug" "  DEBUG=${DEBUG}" "env_setup"
        log_development_message "debug" "  LOG_LEVEL=${LOG_LEVEL}" "env_setup"
        log_development_message "debug" "  VERBOSE=${VERBOSE}" "env_setup"
    fi
}

# ==============================================================================
# PORT MANAGEMENT FUNCTIONS
# ==============================================================================

# Check port availability and suggest alternatives if port is in use
check_port_availability() {
    local port="${1:-${PORT}}"
    local host="${2:-${HOST}}"
    
    log_development_message "debug" "Checking port availability: ${host}:${port}" "port_check"
    
    # Test port availability using netstat or lsof depending on system
    if command -v lsof >/dev/null 2>&1; then
        # macOS and some Linux systems
        if lsof -Pi ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_development_message "warn" "Port ${port} is already in use" "port_check"
            
            # Identify the process using the port for educational purposes
            local process_info
            process_info="$(lsof -Pi ":${port}" -sTCP:LISTEN -F p,c,n 2>/dev/null | head -3)"
            
            if [[ -n "${process_info}" ]]; then
                log_development_message "info" "Process using port ${port}: ${process_info}" "port_check"
                log_development_message "info" "Educational Note: Use 'lsof -Pi :${port}' to identify port usage" "port_check"
            fi
            
            # Find next available port
            local alternative_port=$((port + 1))
            for ((i = 0; i < 10; i++)); do
                if ! lsof -Pi ":${alternative_port}" -sTCP:LISTEN -t >/dev/null 2>&1; then
                    log_development_message "info" "Alternative port available: ${alternative_port}" "port_check"
                    echo "${alternative_port}"
                    return 0
                fi
                alternative_port=$((alternative_port + 1))
            done
            
            log_development_message "error" "No alternative ports available in range ${port}-$((port + 10))" "port_check"
            return 1
        fi
    elif command -v netstat >/dev/null 2>&1; then
        # Linux systems with netstat
        if netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
            log_development_message "warn" "Port ${port} is already in use (detected via netstat)" "port_check"
            
            # Find alternative port using netstat
            local alternative_port=$((port + 1))
            for ((i = 0; i < 10; i++)); do
                if ! netstat -tlnp 2>/dev/null | grep -q ":${alternative_port} "; then
                    log_development_message "info" "Alternative port available: ${alternative_port}" "port_check"
                    echo "${alternative_port}"
                    return 0
                fi
                alternative_port=$((alternative_port + 1))
            done
            
            log_development_message "error" "No alternative ports available in range ${port}-$((port + 10))" "port_check"
            return 1
        fi
    else
        log_development_message "warn" "Cannot check port availability (lsof/netstat not available)" "port_check"
        log_development_message "info" "Proceeding with configured port: ${port}" "port_check"
    fi
    
    log_development_message "info" "Port ${port} is available for development server" "port_check"
    echo "${port}"
    return 0
}

# ==============================================================================
# DEPENDENCY MANAGEMENT FUNCTIONS
# ==============================================================================

# Ensure all development dependencies are installed and up-to-date
install_dependencies() {
    log_development_message "info" "Checking development dependencies..." "dependencies"
    
    # Check if node_modules exists and is populated
    if [[ ! -d "node_modules" ]] || [[ -z "$(ls -A node_modules 2>/dev/null)" ]]; then
        log_development_message "warn" "node_modules directory missing or empty" "dependencies"
        log_development_message "info" "Installing all dependencies..." "dependencies"
        
        # Perform clean installation using npm ci for deterministic builds
        if ! npm ci; then
            log_development_message "error" "Failed to install dependencies with npm ci" "dependencies"
            log_development_message "info" "Educational Note: npm ci provides faster, reliable, reproducible builds" "dependencies"
            log_development_message "info" "Attempting fallback installation with npm install..." "dependencies"
            
            if ! npm install; then
                log_development_message "error" "Failed to install dependencies with npm install" "dependencies"
                log_development_message "info" "Troubleshooting Steps:" "dependencies"
                log_development_message "info" "  1. Check internet connectivity" "dependencies"
                log_development_message "info" "  2. Clear npm cache: npm cache clean --force" "dependencies"
                log_development_message "info" "  3. Delete node_modules and package-lock.json, then retry" "dependencies"
                return 1
            fi
        fi
        
        log_development_message "info" "Dependencies installed successfully" "dependencies"
    else
        # Check if dependencies are up-to-date by comparing timestamps
        if [[ "package-lock.json" -nt "node_modules" ]]; then
            log_development_message "warn" "package-lock.json is newer than node_modules" "dependencies"
            log_development_message "info" "Updating dependencies to match lockfile..." "dependencies"
            
            if ! npm ci; then
                log_development_message "error" "Failed to update dependencies" "dependencies"
                return 1
            fi
            
            log_development_message "info" "Dependencies updated successfully" "dependencies"
        else
            log_development_message "debug" "Dependencies are up-to-date" "dependencies"
        fi
    fi
    
    # Validate critical development dependencies
    log_development_message "debug" "Validating critical development dependencies..." "dependencies"
    
    local critical_deps=(
        "express"
        "nodemon"
        "jest"
        "supertest"
    )
    
    for dep in "${critical_deps[@]}"; do
        if [[ ! -d "node_modules/${dep}" ]]; then
            log_development_message "error" "Critical dependency missing: ${dep}" "dependencies"
            log_development_message "info" "Installing missing dependency: ${dep}" "dependencies"
            
            if ! npm install "${dep}"; then
                log_development_message "error" "Failed to install ${dep}" "dependencies"
                return 1
            fi
        else
            local dep_version
            dep_version="$(node -e "console.log(require('./node_modules/${dep}/package.json').version)" 2>/dev/null || echo 'unknown')"
            log_development_message "trace" "Dependency verified: ${dep}@${dep_version}" "dependencies"
        fi
    done
    
    # Display dependency summary for educational purposes
    if [[ "${DEBUG_MODE}" == "true" ]]; then
        log_development_message "debug" "Development Dependencies Summary:" "dependencies"
        log_development_message "debug" "  Express.js: $(node -e "console.log(require('./node_modules/express/package.json').version)" 2>/dev/null || echo 'not found')" "dependencies"
        log_development_message "debug" "  Nodemon: $(node -e "console.log(require('./node_modules/nodemon/package.json').version)" 2>/dev/null || echo 'not found')" "dependencies"
        log_development_message "debug" "  Jest: $(node -e "console.log(require('./node_modules/jest/package.json').version)" 2>/dev/null || echo 'not found')" "dependencies"
        log_development_message "debug" "  Supertest: $(node -e "console.log(require('./node_modules/supertest/package.json').version)" 2>/dev/null || echo 'not found')" "dependencies"
    fi
    
    log_development_message "info" "All development dependencies are ready" "dependencies"
    return 0
}

# ==============================================================================
# DEVELOPMENT SERVER FUNCTIONS
# ==============================================================================

# Display comprehensive development information before server startup
display_development_info() {
    log_development_message "info" "Development Server Configuration:" "server_info"
    
    printf "\n${COLOR_CYAN}${COLOR_BOLD}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                        DEVELOPMENT SERVER INFORMATION                       ║"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  🌐 Server URL: ${COLOR_WHITE}http://${HOST}:${PORT}${COLOR_CYAN}%-35s ║\n" ""
    printf "║  🎯 Main Endpoint: ${COLOR_WHITE}http://${HOST}:${PORT}/hello${COLOR_CYAN}%-28s ║\n" ""
    printf "║  💊 Health Check: ${COLOR_WHITE}http://${HOST}:${PORT}/health${COLOR_CYAN}%-27s ║\n" ""
    printf "║  🔍 Readiness: ${COLOR_WHITE}http://${HOST}:${PORT}/readyz${COLOR_CYAN}%-30s ║\n" ""
    printf "║  💗 Liveness: ${COLOR_WHITE}http://${HOST}:${PORT}/livez${COLOR_CYAN}%-31s ║\n" ""
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  🔥 Hot Reload: ${COLOR_WHITE}Enabled${COLOR_CYAN} - Files watched: ${COLOR_WHITE}src/, config/%-16s ${COLOR_CYAN}║\n" ""
    printf "║  📝 File Types: ${COLOR_WHITE}.js, .json, .mjs${COLOR_CYAN} - Ignored: ${COLOR_WHITE}test/, coverage/%-11s ${COLOR_CYAN}║\n" ""
    printf "║  ⏱️  Restart Delay: ${COLOR_WHITE}2 seconds${COLOR_CYAN} - Signal: ${COLOR_WHITE}SIGUSR2%-21s ${COLOR_CYAN}║\n" ""
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  🎮 Development Controls:                                                    ║\n"
    printf "║     ${COLOR_WHITE}rs + Enter${COLOR_CYAN}      - Manual restart server                         ║\n"
    printf "║     ${COLOR_WHITE}Ctrl + C${COLOR_CYAN}        - Graceful shutdown                             ║\n"
    printf "║     ${COLOR_WHITE}Ctrl + Z${COLOR_CYAN}        - Suspend process (use 'fg' to resume)          ║\n"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  📊 Monitoring Features:                                                     ║\n"
    printf "║     - Request/Response logging with timing information                       ║\n"
    printf "║     - Memory usage monitoring and leak detection                            ║\n"
    printf "║     - File change detection with detailed logging                           ║\n"
    printf "║     - Error tracking with full stack traces                                 ║\n"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  🎓 Educational Features:                                                    ║\n"
    printf "║     - HTTP request/response cycle demonstration                             ║\n"
    printf "║     - Express.js 5.1.0 middleware execution tracking                        ║\n"
    printf "║     - Node.js 22.x LTS performance monitoring                               ║\n"
    printf "║     - Development workflow best practices illustration                       ║\n"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    printf "${COLOR_RESET}\n"
    
    log_development_message "debug" "Server will start with nodemon for hot reloading" "server_info"
    log_development_message "debug" "Configuration loaded from nodemon.json and .env files" "server_info"
    log_development_message "trace" "Express.js ${EXPRESS_VERSION} with automatic promise error handling" "server_info"
    log_development_message "trace" "Node.js $(node --version) with enhanced performance features" "server_info"
}

# Start the development server using nodemon with comprehensive configuration
start_development_server() {
    local port="${1:-${PORT}}"
    local host="${2:-${HOST}}"
    
    log_development_message "info" "Starting development server on ${host}:${port}" "server_start"
    
    # Ensure we're in the project root directory
    cd "${PROJECT_ROOT}" || {
        log_development_message "error" "Cannot change to project root: ${PROJECT_ROOT}" "server_start"
        return 1
    }
    
    # Update PORT environment variable if it was changed due to conflicts
    export PORT="${port}"
    
    # Display development information before starting server
    display_development_info
    
    log_development_message "info" "Executing nodemon with comprehensive development configuration..." "server_start"
    log_development_message "debug" "Command: npx nodemon" "server_start"
    log_development_message "trace" "Working directory: $(pwd)" "server_start"
    log_development_message "trace" "Environment: NODE_ENV=${NODE_ENV}, PORT=${port}, HOST=${host}" "server_start"
    
    # Start nodemon with configuration from nodemon.json
    # Nodemon will handle file watching, automatic restarts, and development workflow
    exec npx nodemon
}

# ==============================================================================
# SIGNAL HANDLING AND CLEANUP FUNCTIONS
# ==============================================================================

# Handle script termination signals gracefully with cleanup and educational output
handle_script_termination() {
    local signal="${1:-SIGTERM}"
    
    # Prevent multiple cleanup executions
    if [[ "${CLEANUP_PERFORMED}" == "true" ]]; then
        return 0
    fi
    CLEANUP_PERFORMED=true
    
    log_development_message "warn" "Received termination signal: ${signal}" "cleanup"
    log_development_message "info" "Initiating graceful development server shutdown..." "cleanup"
    
    # Display termination information for educational purposes
    printf "\n${COLOR_YELLOW}${COLOR_BOLD}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          DEVELOPMENT SERVER SHUTDOWN                        ║"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    printf "║  🛑 Signal Received: %-20s Time: %-25s ║\n" "${signal}" "$(date '+%Y-%m-%d %H:%M:%S')"
    printf "║  ⏱️  Session Duration: %-18s PID: %-26s ║\n" "$(uptime -p 2>/dev/null || echo 'N/A')" "$$"
    printf "║  🔄 Performing graceful shutdown and cleanup...                             ║\n"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    printf "${COLOR_RESET}\n"
    
    # Stop nodemon process if running
    if [[ -n "${NODEMON_PID}" ]] && kill -0 "${NODEMON_PID}" 2>/dev/null; then
        log_development_message "debug" "Stopping nodemon process (PID: ${NODEMON_PID})" "cleanup"
        kill -TERM "${NODEMON_PID}" 2>/dev/null || true
        
        # Wait for graceful shutdown with timeout
        local timeout=10
        while [[ $timeout -gt 0 ]] && kill -0 "${NODEMON_PID}" 2>/dev/null; do
            sleep 1
            timeout=$((timeout - 1))
        done
        
        # Force kill if still running
        if kill -0 "${NODEMON_PID}" 2>/dev/null; then
            log_development_message "warn" "Force stopping nodemon process" "cleanup"
            kill -KILL "${NODEMON_PID}" 2>/dev/null || true
        fi
    fi
    
    # Clean up temporary files and artifacts
    log_development_message "debug" "Cleaning up temporary development files..." "cleanup"
    
    # Remove potential temporary files created during development
    find "${PROJECT_ROOT}" -name "*.tmp" -type f -delete 2>/dev/null || true
    find "${PROJECT_ROOT}" -name ".DS_Store" -type f -delete 2>/dev/null || true
    
    # Display development session summary
    if [[ "${SERVER_STARTED}" == "true" ]]; then
        log_development_message "info" "Development session completed successfully" "cleanup"
        log_development_message "debug" "Educational Note: Server ran with hot reloading and comprehensive monitoring" "cleanup"
    else
        log_development_message "warn" "Development session ended before server startup completed" "cleanup"
    fi
    
    # Educational information about signal handling
    log_development_message "trace" "Educational Note: Signal ${signal} demonstrates Node.js process lifecycle management" "cleanup"
    log_development_message "trace" "Production applications should implement similar graceful shutdown procedures" "cleanup"
    
    # Reset terminal formatting
    printf "${COLOR_RESET}"
    
    log_development_message "info" "Development environment shutdown completed" "cleanup"
    
    # Exit with appropriate code
    exit 0
}

# ==============================================================================
# MAIN EXECUTION FLOW
# ==============================================================================

# Set up signal handlers for graceful shutdown
trap 'handle_script_termination SIGINT' SIGINT
trap 'handle_script_termination SIGTERM' SIGTERM
trap 'handle_script_termination SIGHUP' SIGHUP

# Main execution function orchestrating the complete development workflow
main() {
    local exit_code=0
    
    # Initialize development environment with educational banner
    print_banner
    
    # Comprehensive environment validation
    if ! validate_environment; then
        log_development_message "error" "Environment validation failed. Cannot start development server." "main"
        log_development_message "info" "Please resolve the above issues and retry" "main"
        exit 1
    fi
    
    # Set up development environment variables
    setup_environment_variables
    
    # Check port availability and resolve conflicts
    log_development_message "info" "Checking port availability and resolving conflicts..." "main"
    local available_port
    available_port="$(check_port_availability "${PORT}" "${HOST}")"
    
    if [[ $? -ne 0 ]]; then
        log_development_message "error" "Cannot find available port for development server" "main"
        log_development_message "info" "Please check port usage and try again" "main"
        exit 1
    fi
    
    if [[ "${available_port}" != "${PORT}" ]]; then
        log_development_message "warn" "Using alternative port: ${available_port} (requested: ${PORT})" "main"
        PORT="${available_port}"
    fi
    
    # Install and validate development dependencies
    if ! install_dependencies; then
        log_development_message "error" "Dependency installation failed. Cannot start development server." "main"
        log_development_message "info" "Please resolve dependency issues and retry" "main"
        exit 1
    fi
    
    # Final pre-startup validation
    log_development_message "info" "Performing final pre-startup validation..." "main"
    log_development_message "debug" "Server configuration: ${HOST}:${PORT}" "main"
    log_development_message "debug" "Node.js version: $(node --version)" "main"
    log_development_message "debug" "NPM version: v$(npm --version)" "main"
    log_development_message "debug" "Working directory: $(pwd)" "main"
    
    # Mark server as starting for cleanup tracking
    SERVER_STARTED=true
    
    # Start the development server (this will exec nodemon and replace the process)
    log_development_message "info" "All validations passed. Starting development server..." "main"
    log_development_message "info" "Educational Note: The development server will now start with hot reloading enabled" "main"
    
    # This will replace the current process with nodemon
    start_development_server "${PORT}" "${HOST}"
    
    # This point should not be reached as start_development_server uses exec
    log_development_message "error" "Development server failed to start" "main"
    exit 1
}

# Execute main function with all arguments passed to the script
main "$@"

# ==============================================================================
# END OF DEVELOPMENT STARTUP SCRIPT
# ==============================================================================
#
# This comprehensive development script provides:
#
# 1. Complete environment validation for Node.js 22.x LTS and Express.js 5.1.0
# 2. Intelligent port management with conflict detection and resolution
# 3. Automated dependency installation and validation
# 4. Hot reloading through nodemon with comprehensive file watching
# 5. Educational logging and debugging information throughout
# 6. Graceful signal handling and cleanup procedures
# 7. Production-ready development workflow patterns
# 8. Comprehensive error handling with helpful troubleshooting guidance
#
# Educational Value:
# - Demonstrates comprehensive Node.js development environment setup
# - Shows shell scripting best practices for application lifecycle management
# - Illustrates modern development workflow with hot reloading and monitoring
# - Provides foundation for understanding production deployment procedures
#
# The script serves as both a functional development tool and an educational
# resource for learning Node.js development workflow best practices.
# ==============================================================================