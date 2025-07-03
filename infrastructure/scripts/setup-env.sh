#!/bin/bash

# Node.js Tutorial Backend Environment Setup Script
# 
# This script automates the setup and validation of environment variables for the Node.js tutorial backend.
# It ensures that all required environment variables are present and correctly formatted,
# validates Node.js version compatibility, and provides clear feedback for developers and CI/CD systems.
#
# Features:
# - Copies .env.example to .env if .env doesn't exist
# - Validates all required environment variables (PORT, NODE_ENV, REQUEST_TIMEOUT_MS)
# - Checks Node.js version against .nvmrc and package.json engines requirements
# - Provides detailed error messages and setup guidance
# - Supports both interactive and automated (CI/CD) usage
#
# Usage:
#   ./infrastructure/scripts/setup-env.sh [options]
#   
# Options:
#   --force, -f    Force overwrite existing .env file
#   --quiet, -q    Suppress informational messages (errors still shown)
#   --help, -h     Show this help message
#
# Exit codes:
#   0 = Success
#   1 = General error
#   2 = Node.js version incompatibility
#   3 = Environment variable validation failure
#   4 = Missing required files
#
# Author: Tutorial Development Team
# Version: 1.0.0

set -euo pipefail  # Exit on error, undefined variables, or pipe failures

# =============================================================================
# GLOBAL CONFIGURATION
# =============================================================================

# Project directory paths - these are relative to the project root
readonly BACKEND_DIR="src/backend"
readonly ENV_EXAMPLE="src/backend/.env.example"
readonly ENV_FILE="src/backend/.env"
readonly NVMRC_FILE="src/backend/.nvmrc"
readonly PKG_JSON="src/backend/package.json"

# Script configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_VERSION="1.0.0"

# Default option values
FORCE_OVERWRITE=false
QUIET_MODE=false

# Color codes for output formatting (disabled in non-interactive environments)
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
    readonly RED=$(tput setaf 1)
    readonly GREEN=$(tput setaf 2)
    readonly YELLOW=$(tput setaf 3)
    readonly BLUE=$(tput setaf 4)
    readonly BOLD=$(tput bold)
    readonly RESET=$(tput sgr0)
else
    readonly RED=""
    readonly GREEN=""
    readonly YELLOW=""
    readonly BLUE=""
    readonly BOLD=""
    readonly RESET=""
fi

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Print informational message (respects quiet mode)
print_info() {
    if [[ "$QUIET_MODE" != true ]]; then
        echo "${BLUE}[INFO]${RESET} $*"
    fi
}

# Print success message (always shown)
print_success() {
    echo "${GREEN}[SUCCESS]${RESET} $*"
}

# Print warning message (always shown)
print_warning() {
    echo "${YELLOW}[WARNING]${RESET} $*" >&2
}

# Print error message (always shown)
print_error() {
    echo "${RED}[ERROR]${RESET} $*" >&2
}

# Print usage information
print_usage() {
    cat << EOF
${BOLD}Node.js Tutorial Backend Environment Setup${RESET}

${BOLD}USAGE:${RESET}
    $SCRIPT_NAME [options]

${BOLD}DESCRIPTION:${RESET}
    Automates the setup and validation of environment variables for the Node.js tutorial backend.
    Ensures reproducible development environments across different machines and CI/CD systems.

${BOLD}OPTIONS:${RESET}
    -f, --force     Force overwrite existing .env file
    -q, --quiet     Suppress informational messages (errors still shown)
    -h, --help      Show this help message

${BOLD}EXAMPLES:${RESET}
    $SCRIPT_NAME                    # Standard setup with prompts
    $SCRIPT_NAME --force            # Overwrite existing .env without prompting
    $SCRIPT_NAME --quiet            # Run silently for CI/CD environments

${BOLD}EXIT CODES:${RESET}
    0 = Success
    1 = General error
    2 = Node.js version incompatibility  
    3 = Environment variable validation failure
    4 = Missing required files

${BOLD}VERSION:${RESET} $SCRIPT_VERSION
EOF
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get the directory where this script is located
get_script_dir() {
    cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

# Get the project root directory (assumes script is in infrastructure/scripts/)
get_project_root() {
    local script_dir
    script_dir="$(get_script_dir)"
    # Navigate up from infrastructure/scripts/ to project root
    cd "$script_dir/../.." && pwd
}

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

# Check if all required files exist
check_required_files() {
    local project_root
    project_root="$(get_project_root)"
    
    print_info "Checking for required files..."
    
    local missing_files=()
    
    # Check for .env.example template file
    if [[ ! -f "$project_root/$ENV_EXAMPLE" ]]; then
        missing_files+=("$ENV_EXAMPLE")
    fi
    
    # Check for .nvmrc file
    if [[ ! -f "$project_root/$NVMRC_FILE" ]]; then
        missing_files+=("$NVMRC_FILE")
    fi
    
    # Check for package.json file
    if [[ ! -f "$project_root/$PKG_JSON" ]]; then
        missing_files+=("$PKG_JSON")
    fi
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            print_error "  - $file"
        done
        print_error "Please ensure you're running this script from the project root or that all required files exist."
        return 4
    fi
    
    print_info "All required files found."
    return 0
}

# =============================================================================
# ENVIRONMENT FILE MANAGEMENT
# =============================================================================

# Copy .env.example to .env if .env doesn't exist or if forced
copy_env_example() {
    local project_root
    project_root="$(get_project_root)"
    
    local env_example_path="$project_root/$ENV_EXAMPLE"
    local env_file_path="$project_root/$ENV_FILE"
    
    # Check if .env already exists
    if [[ -f "$env_file_path" ]]; then
        if [[ "$FORCE_OVERWRITE" != true ]]; then
            print_info ".env file already exists at: $env_file_path"
            
            # In interactive mode, ask user if they want to overwrite
            if [[ -t 0 ]] && [[ "$QUIET_MODE" != true ]]; then
                echo -n "Do you want to overwrite the existing .env file? [y/N]: "
                read -r response
                case "$response" in
                    [yY]|[yY][eE][sS])
                        print_info "Overwriting existing .env file..."
                        ;;
                    *)
                        print_info "Keeping existing .env file."
                        return 0
                        ;;
                esac
            else
                print_info "Use --force to overwrite existing .env file."
                return 0
            fi
        else
            print_info "Force mode enabled. Overwriting existing .env file..."
        fi
    fi
    
    # Copy .env.example to .env
    print_info "Copying $ENV_EXAMPLE to $ENV_FILE..."
    
    if ! cp "$env_example_path" "$env_file_path"; then
        print_error "Failed to copy $ENV_EXAMPLE to $ENV_FILE"
        return 1
    fi
    
    # Set secure permissions (owner read/write only)
    if ! chmod 600 "$env_file_path"; then
        print_warning "Failed to set secure permissions on .env file"
    else
        print_info "Set secure permissions (600) on .env file"
    fi
    
    print_success "Environment file created: $env_file_path"
    return 0
}

# =============================================================================
# ENVIRONMENT VARIABLE VALIDATION
# =============================================================================

# Validate that a value is a valid integer within a range
validate_integer() {
    local value="$1"
    local min="$2"
    local max="$3"
    local name="$4"
    
    # Check if value is a valid integer
    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        print_error "$name must be a positive integer, got: '$value'"
        return 1
    fi
    
    # Check if value is within range
    if [[ "$value" -lt "$min" ]] || [[ "$value" -gt "$max" ]]; then
        print_error "$name must be between $min and $max, got: $value"
        return 1
    fi
    
    return 0
}

# Validate environment variables in .env file
validate_env_file() {
    local project_root
    project_root="$(get_project_root)"
    
    local env_file_path="$project_root/$ENV_FILE"
    
    if [[ ! -f "$env_file_path" ]]; then
        print_error ".env file not found at: $env_file_path"
        return 3
    fi
    
    print_info "Validating environment variables in .env file..."
    
    # Source the .env file to read variables
    # Use a subshell to avoid polluting current environment
    local env_vars
    if ! env_vars=$(grep -E '^[A-Z_]+=.*' "$env_file_path" 2>/dev/null); then
        print_warning "No environment variables found in .env file"
    fi
    
    # Extract individual variables (handle potential quotes and spaces)
    local port node_env timeout log_level
    port=$(grep -E '^PORT=' "$env_file_path" 2>/dev/null | cut -d'=' -f2- | sed 's/^["'"'"']\|["'"'"']$//g' | xargs)
    node_env=$(grep -E '^NODE_ENV=' "$env_file_path" 2>/dev/null | cut -d'=' -f2- | sed 's/^["'"'"']\|["'"'"']$//g' | xargs)
    timeout=$(grep -E '^REQUEST_TIMEOUT_MS=' "$env_file_path" 2>/dev/null | cut -d'=' -f2- | sed 's/^["'"'"']\|["'"'"']$//g' | xargs)
    log_level=$(grep -E '^LOG_LEVEL=' "$env_file_path" 2>/dev/null | cut -d'=' -f2- | sed 's/^["'"'"']\|["'"'"']$//g' | xargs)
    
    local validation_errors=0
    
    # Validate PORT (required)
    if [[ -z "$port" ]]; then
        print_error "PORT is required but not set in .env file"
        validation_errors=$((validation_errors + 1))
    else
        if ! validate_integer "$port" 1024 65535 "PORT"; then
            validation_errors=$((validation_errors + 1))
        else
            print_info "PORT validation passed: $port"
        fi
    fi
    
    # Validate NODE_ENV (required)
    if [[ -z "$node_env" ]]; then
        print_error "NODE_ENV is required but not set in .env file"
        validation_errors=$((validation_errors + 1))
    else
        case "$node_env" in
            development|production|test)
                print_info "NODE_ENV validation passed: $node_env"
                ;;
            *)
                print_error "NODE_ENV must be one of: development, production, test. Got: '$node_env'"
                validation_errors=$((validation_errors + 1))
                ;;
        esac
    fi
    
    # Validate REQUEST_TIMEOUT_MS (required)
    if [[ -z "$timeout" ]]; then
        print_error "REQUEST_TIMEOUT_MS is required but not set in .env file"
        validation_errors=$((validation_errors + 1))
    else
        if ! validate_integer "$timeout" 1000 300000 "REQUEST_TIMEOUT_MS"; then
            validation_errors=$((validation_errors + 1))
        else
            print_info "REQUEST_TIMEOUT_MS validation passed: $timeout"
        fi
    fi
    
    # Validate LOG_LEVEL (optional, but if set must be valid)
    if [[ -n "$log_level" ]]; then
        case "$log_level" in
            info|warn|error)
                print_info "LOG_LEVEL validation passed: $log_level"
                ;;
            *)
                print_warning "LOG_LEVEL should be one of: info, warn, error. Got: '$log_level'"
                ;;
        esac
    fi
    
    if [[ $validation_errors -gt 0 ]]; then
        print_error "Environment variable validation failed with $validation_errors error(s)"
        print_error "Please check your .env file and correct the invalid values"
        return 3
    fi
    
    print_success "All environment variables validated successfully"
    return 0
}

# =============================================================================
# NODE.JS VERSION CHECKING
# =============================================================================

# Parse semantic version string (e.g., "22.11.0") into major.minor.patch
parse_version() {
    local version="$1"
    # Remove 'v' prefix if present and extract major.minor.patch
    version="${version#v}"
    echo "$version" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+' || echo "$version"
}

# Compare two semantic versions
# Returns: 0 if equal, 1 if first > second, 2 if first < second
compare_versions() {
    local version1="$1"
    local version2="$2"
    
    # Parse versions into arrays
    IFS='.' read -ra v1_parts <<< "$version1"
    IFS='.' read -ra v2_parts <<< "$version2"
    
    # Ensure both versions have 3 parts (major.minor.patch)
    while [[ ${#v1_parts[@]} -lt 3 ]]; do v1_parts+=(0); done
    while [[ ${#v2_parts[@]} -lt 3 ]]; do v2_parts+=(0); done
    
    # Compare each part
    for i in {0..2}; do
        if [[ ${v1_parts[i]} -gt ${v2_parts[i]} ]]; then
            return 1  # version1 > version2
        elif [[ ${v1_parts[i]} -lt ${v2_parts[i]} ]]; then
            return 2  # version1 < version2
        fi
    done
    
    return 0  # versions are equal
}

# Check if current Node.js version satisfies a range requirement (e.g., ">=18.0.0 <23.0.0")
check_version_range() {
    local current_version="$1"
    local range="$2"
    
    # Handle space-separated range (e.g., ">=18.0.0 <23.0.0")
    local range_parts
    IFS=' ' read -ra range_parts <<< "$range"
    
    for part in "${range_parts[@]}"; do
        if [[ "$part" =~ ^>=(.+)$ ]]; then
            local min_version="${BASH_REMATCH[1]}"
            compare_versions "$current_version" "$min_version"
            local result=$?
            if [[ $result -eq 2 ]]; then  # current < min
                return 1
            fi
        elif [[ "$part" =~ ^\<(.+)$ ]]; then
            local max_version="${BASH_REMATCH[1]}"
            compare_versions "$current_version" "$max_version"
            local result=$?
            if [[ $result -ne 2 ]]; then  # current >= max
                return 1
            fi
        elif [[ "$part" =~ ^\>(.+)$ ]]; then
            local min_version="${BASH_REMATCH[1]}"
            compare_versions "$current_version" "$min_version"
            local result=$?
            if [[ $result -ne 1 ]]; then  # current <= min
                return 1
            fi
        elif [[ "$part" =~ ^\<=(.+)$ ]]; then
            local max_version="${BASH_REMATCH[1]}"
            compare_versions "$current_version" "$max_version"
            local result=$?
            if [[ $result -eq 1 ]]; then  # current > max
                return 1
            fi
        elif [[ "$part" =~ ^\^(.+)$ ]]; then
            # Caret range (^1.2.3 := >=1.2.3 <2.0.0)
            local base_version="${BASH_REMATCH[1]}"
            IFS='.' read -ra base_parts <<< "$base_version"
            local next_major=$((base_parts[0] + 1))
            
            compare_versions "$current_version" "$base_version"
            local min_result=$?
            compare_versions "$current_version" "${next_major}.0.0"
            local max_result=$?
            
            if [[ $min_result -eq 2 ]] || [[ $max_result -ne 2 ]]; then
                return 1
            fi
        fi
    done
    
    return 0
}

# Check Node.js version compatibility
check_node_version() {
    local project_root
    project_root="$(get_project_root)"
    
    print_info "Checking Node.js version compatibility..."
    
    # Check if Node.js is installed
    if ! command_exists node; then
        print_error "Node.js is not installed or not in PATH"
        print_error "Please install Node.js and try again"
        return 2
    fi
    
    # Get current Node.js version
    local current_version
    current_version=$(node --version 2>/dev/null)
    if [[ $? -ne 0 ]]; then
        print_error "Failed to get Node.js version"
        return 2
    fi
    
    # Parse current version
    current_version=$(parse_version "$current_version")
    print_info "Current Node.js version: $current_version"
    
    # Read required version from .nvmrc
    local nvmrc_path="$project_root/$NVMRC_FILE"
    local required_version
    if [[ -f "$nvmrc_path" ]]; then
        required_version=$(cat "$nvmrc_path" | xargs)
        required_version=$(parse_version "$required_version")
        print_info "Required Node.js version (.nvmrc): $required_version"
        
        # Check exact version match with .nvmrc
        compare_versions "$current_version" "$required_version"
        local version_match=$?
        if [[ $version_match -ne 0 ]]; then
            print_warning "Current Node.js version ($current_version) does not match .nvmrc ($required_version)"
            print_warning "Consider using 'nvm use' to switch to the required version"
        else
            print_info "Node.js version matches .nvmrc requirement"
        fi
    else
        print_warning ".nvmrc file not found, skipping exact version check"
    fi
    
    # Read engine requirements from package.json
    local pkg_json_path="$project_root/$PKG_JSON"
    if [[ -f "$pkg_json_path" ]]; then
        # Extract Node.js engine requirement using basic parsing
        local engine_requirement
        engine_requirement=$(grep -A 3 '"engines"' "$pkg_json_path" | grep '"node"' | sed 's/.*"node"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        
        if [[ -n "$engine_requirement" ]]; then
            print_info "Package.json engines.node requirement: $engine_requirement"
            
            # Check if current version satisfies engine requirement
            if check_version_range "$current_version" "$engine_requirement"; then
                print_success "Node.js version satisfies package.json engines requirement"
            else
                print_error "Node.js version ($current_version) does not satisfy engines requirement ($engine_requirement)"
                print_error "Please upgrade or downgrade Node.js to a compatible version"
                return 2
            fi
        else
            print_warning "Could not parse Node.js engine requirement from package.json"
        fi
    else
        print_warning "package.json not found, skipping engine compatibility check"
    fi
    
    # Additional check for npm version if specified in engines
    if command_exists npm && [[ -f "$pkg_json_path" ]]; then
        local npm_requirement
        npm_requirement=$(grep -A 3 '"engines"' "$pkg_json_path" | grep '"npm"' | sed 's/.*"npm"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        
        if [[ -n "$npm_requirement" ]]; then
            local current_npm_version
            current_npm_version=$(npm --version 2>/dev/null)
            if [[ $? -eq 0 ]]; then
                current_npm_version=$(parse_version "$current_npm_version")
                print_info "Current npm version: $current_npm_version"
                print_info "Package.json engines.npm requirement: $npm_requirement"
                
                if check_version_range "$current_npm_version" "$npm_requirement"; then
                    print_success "npm version satisfies package.json engines requirement"
                else
                    print_warning "npm version ($current_npm_version) does not satisfy engines requirement ($npm_requirement)"
                    print_warning "Consider upgrading npm: npm install -g npm@latest"
                fi
            fi
        fi
    fi
    
    return 0
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

# Main function that orchestrates the entire setup process
main() {
    local project_root
    project_root="$(get_project_root)"
    
    print_info "Node.js Tutorial Backend Environment Setup v$SCRIPT_VERSION"
    print_info "Project root: $project_root"
    print_info ""
    
    # Step 1: Check for required files
    print_info "Step 1: Checking required files..."
    if ! check_required_files; then
        return $?
    fi
    print_info ""
    
    # Step 2: Copy .env.example to .env if needed
    print_info "Step 2: Setting up environment file..."
    if ! copy_env_example; then
        return $?
    fi
    print_info ""
    
    # Step 3: Validate environment variables
    print_info "Step 3: Validating environment variables..."
    if ! validate_env_file; then
        return $?
    fi
    print_info ""
    
    # Step 4: Check Node.js version compatibility
    print_info "Step 4: Checking Node.js version compatibility..."
    if ! check_node_version; then
        return $?
    fi
    print_info ""
    
    # Success! Provide next steps
    print_success "Environment setup completed successfully!"
    print_info ""
    print_info "${BOLD}Next steps:${RESET}"
    print_info "1. Review and customize your .env file if needed:"
    print_info "   ${BLUE}nano $project_root/$ENV_FILE${RESET}"
    print_info ""
    print_info "2. Install dependencies:"
    print_info "   ${BLUE}cd $project_root/$BACKEND_DIR && npm install${RESET}"
    print_info ""
    print_info "3. Start the development server:"
    print_info "   ${BLUE}cd $project_root/$BACKEND_DIR && npm run dev${RESET}"
    print_info ""
    print_info "4. Test the server:"
    print_info "   ${BLUE}curl http://localhost:$(grep -E '^PORT=' "$project_root/$ENV_FILE" | cut -d'=' -f2)/hello${RESET}"
    print_info ""
    
    return 0
}

# =============================================================================
# COMMAND LINE ARGUMENT PARSING
# =============================================================================

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--force)
                FORCE_OVERWRITE=true
                shift
                ;;
            -q|--quiet)
                QUIET_MODE=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            -*)
                print_error "Unknown option: $1"
                print_error "Use --help for usage information"
                exit 1
                ;;
            *)
                print_error "Unexpected argument: $1"
                print_error "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# SCRIPT ENTRY POINT
# =============================================================================

# Only run main if this script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Parse command line arguments
    parse_arguments "$@"
    
    # Run main function and exit with its return code
    main
    exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        print_error "Setup failed with exit code: $exit_code"
        print_info "Use --help for usage information"
    fi
    
    exit $exit_code
fi