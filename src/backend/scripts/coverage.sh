#!/bin/bash

# =============================================================================
# Comprehensive Code Coverage Collection Shell Script for Node.js Tutorial Application
# =============================================================================
#
# This script orchestrates comprehensive code coverage collection for the Node.js 
# tutorial application using Jest 29.7.0 testing framework with built-in coverage
# capabilities. Implements advanced coverage analysis with multiple report formats,
# quality gate enforcement with 95% line coverage thresholds, and CI/CD integration
# for automated quality validation. Provides educational coverage collection patterns
# demonstrating Node.js testing best practices with Express.js 5.1.0 HTTP endpoint
# validation and Supertest integration while maintaining production-ready coverage
# collection workflows suitable for enterprise development environments.
#
# Features:
# - Jest 29.7.0 native coverage collection with Istanbul/c8 compatibility
# - Comprehensive coverage analysis with 95% line, 100% function, 90% branch, 95% statement thresholds
# - Multiple report formats: HTML dashboard, JSON summary, text console, LCOV integration
# - CI/CD pipeline integration with quality gates and threshold enforcement
# - Educational coverage patterns with detailed metrics and improvement recommendations
# - Test automation integration with Jest configuration loading and validation
# - Coverage artifact generation for build pipeline collection and archiving
# - Performance optimization with parallel coverage collection and efficient reporting
#
# Architecture:
# - Modular function design with comprehensive error handling and validation
# - Global environment management for coverage configuration and execution state
# - Jest configuration integration with dynamic threshold loading and customization
# - Resource management with cleanup operations and signal handling
# - Educational logging with formatted output and coverage analysis guidance
# - CI/CD optimization with automated quality gates and failure reporting
#
# Usage:
#   ./scripts/coverage.sh                           # Execute coverage with default settings
#   ./scripts/coverage.sh --threshold 90            # Override minimum coverage thresholds
#   ./scripts/coverage.sh --format html,json        # Specify coverage report formats
#   ./scripts/coverage.sh --output custom/path      # Override coverage output directory
#   ./scripts/coverage.sh --ci --quiet              # CI/CD optimized execution with minimal output
#   ./scripts/coverage.sh --watch                   # Enable coverage collection in watch mode
#   ./scripts/coverage.sh --help                    # Display comprehensive usage information
#
# @author Node.js Tutorial Team
# @version 1.0.0
# @since 2024
# @bash-version >=4.0
# @node-version 22.x
# @jest-version 29.7.0
# @express-version 5.1.0

# =============================================================================
# SHELL SCRIPT CONFIGURATION
# =============================================================================

# Enable strict error handling for reliable script execution and quality assurance
set -euo pipefail

# Configure Internal Field Separator for safe array and string processing
IFS=$'\n\t'

# Enable extended globbing for advanced file pattern matching and coverage collection
shopt -s extglob nullglob

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================

# Script directory resolution using BASH_SOURCE for reliable path detection
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root directory resolution relative to script location
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Jest configuration file path for coverage settings loading
readonly JEST_CONFIG_PATH="${PROJECT_ROOT}/jest.config.js"

# Package.json path for NPM scripts and Jest configuration validation
readonly PACKAGE_JSON_PATH="${PROJECT_ROOT}/package.json"

# Coverage environment configuration with fallback defaults from process environment
COVERAGE_DIR="${COVERAGE_DIR:-${PROJECT_ROOT}/coverage}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-95}"
JEST_COVERAGE="${JEST_COVERAGE:-true}"
CI="${CI:-false}"
NODE_ENV="${NODE_ENV:-test}"

# Coverage execution configuration with command-line override support
COVERAGE_FORMATS="${COVERAGE_FORMATS:-html,json-summary,text,lcov}"
OUTPUT_DIRECTORY="${OUTPUT_DIRECTORY:-${COVERAGE_DIR}}"
QUIET_MODE="${QUIET_MODE:-false}"
WATCH_MODE="${WATCH_MODE:-false}"
CI_MODE="${CI_MODE:-false}"
THRESHOLD_OVERRIDE=""
FORMAT_OVERRIDE=""

# Jest execution result tracking for comprehensive coverage analysis
JEST_EXIT_CODE=0
COVERAGE_COLLECTION_SUCCESS=false
THRESHOLD_VALIDATION_SUCCESS=false

# Coverage execution timing for performance measurement and optimization
COVERAGE_START_TIME=""
COVERAGE_END_TIME=""

# Process ID for cleanup and signal handling during coverage collection
SCRIPT_PID=$$

# Color codes for enhanced terminal output and educational formatting
readonly COLOR_RESET='\033[0m'
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_YELLOW='\033[0;33m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_PURPLE='\033[0;35m'
readonly COLOR_CYAN='\033[0;36m'
readonly COLOR_WHITE='\033[0;37m'
readonly COLOR_BOLD='\033[1m'

# Coverage analysis storage for comprehensive reporting and CI/CD integration
declare -A COVERAGE_RESULTS
declare -A COVERAGE_METRICS
declare -A THRESHOLD_COMPLIANCE
declare -A REPORT_ARTIFACTS

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Outputs formatted log messages with timestamps, colors, and educational context
# for enhanced coverage collection experience and debugging capabilities
#
# Parameters:
#   $1: Log level (info, warn, error, debug, success)
#   $2: Message content
#   $3: Optional context information
#
# Returns: None (outputs to console with appropriate formatting)
log_coverage_message() {
    local level="${1:-info}"
    local message="${2:-}"
    local context="${3:-}"
    
    # Skip logging if quiet mode is enabled for CI/CD optimization
    if [[ "$QUIET_MODE" == "true" && "$level" != "error" ]]; then
        return 0
    fi
    
    # Generate ISO timestamp with milliseconds precision for accurate timing analysis
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    # Apply color coding based on log level for visual distinction and educational clarity
    local color=""
    local prefix=""
    case "${level}" in
        "info")
            color="${COLOR_BLUE}"
            prefix="ℹ INFO"
            ;;
        "warn")
            color="${COLOR_YELLOW}"
            prefix="⚠ WARN"
            ;;
        "error")
            color="${COLOR_RED}"
            prefix="✗ ERROR"
            ;;
        "debug")
            color="${COLOR_PURPLE}"
            prefix="🔍 DEBUG"
            ;;
        "success")
            color="${COLOR_GREEN}"
            prefix="✓ SUCCESS"
            ;;
        *)
            color="${COLOR_WHITE}"
            prefix="○ LOG"
            ;;
    esac
    
    # Include script name and function context for debugging clarity and traceability
    local script_context="[coverage.sh:$$]"
    
    # Format message with consistent spacing and educational alignment
    local formatted_message="${color}${COLOR_BOLD}${prefix}${COLOR_RESET} ${color}${timestamp}${COLOR_RESET} ${script_context}"
    
    if [[ -n "${context}" ]]; then
        formatted_message+=" [${context}]"
    fi
    
    formatted_message+=" ${message}"
    
    # Output to stderr for error messages, stdout for informational messages
    if [[ "${level}" == "error" ]]; then
        echo -e "${formatted_message}" >&2
    else
        echo -e "${formatted_message}"
    fi
}

# Displays educational coverage collection banner with Node.js tutorial information,
# Jest version details, and coverage workflow guidance for learning objectives
print_coverage_banner() {
    # Skip banner if quiet mode is enabled for CI/CD pipeline optimization
    if [[ "$QUIET_MODE" == "true" ]]; then
        return 0
    fi
    
    # Clear terminal screen for clean coverage execution display
    clear
    
    # Print colorized banner with Node.js tutorial coverage collection information
    echo -e "${COLOR_BOLD}${COLOR_CYAN}"
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo "              Node.js Tutorial Code Coverage Collection Suite                   "
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo -e "${COLOR_RESET}"
    
    # Display Jest version, Node.js version, and coverage framework details
    echo -e "${COLOR_BOLD}Coverage Framework:${COLOR_RESET} Jest 29.7.0 with built-in Istanbul coverage"
    echo -e "${COLOR_BOLD}Node.js Runtime:${COLOR_RESET} $(node --version) (Required: >=22.0.0)"
    echo -e "${COLOR_BOLD}Express.js Version:${COLOR_RESET} 5.1.0"
    echo -e "${COLOR_BOLD}Test Environment:${COLOR_RESET} ${NODE_ENV}"
    
    # Show current timestamp and coverage execution environment status
    echo -e "${COLOR_BOLD}Execution Time:${COLOR_RESET} $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo -e "${COLOR_BOLD}Project Root:${COLOR_RESET} ${PROJECT_ROOT}"
    echo -e "${COLOR_BOLD}Coverage Directory:${COLOR_RESET} ${OUTPUT_DIRECTORY}"
    
    # Include educational notes about coverage collection workflow and best practices
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}Educational Focus:${COLOR_RESET}"
    echo "• Demonstrates Jest built-in coverage collection with Node.js applications"
    echo "• Shows comprehensive coverage analysis with multiple report formats"
    echo "• Implements quality gates with 95% line, 100% function, 90% branch coverage"
    echo "• Educational coverage patterns for Node.js development quality assurance"
    
    # Display available coverage formats and threshold information
    echo ""
    echo -e "${COLOR_BOLD}Coverage Analysis Features:${COLOR_RESET}"
    echo "• ${COLOR_GREEN}HTML Report${COLOR_RESET}     - Interactive browser-based coverage dashboard"
    echo "• ${COLOR_GREEN}JSON Summary${COLOR_RESET}   - Programmatic coverage data for CI/CD integration"
    echo "• ${COLOR_GREEN}Text Report${COLOR_RESET}    - Console-friendly coverage summary output"
    echo "• ${COLOR_GREEN}LCOV Format${COLOR_RESET}    - Industry-standard coverage data for tool integration"
    
    # Show coverage thresholds and quality gate requirements
    echo ""
    echo -e "${COLOR_BOLD}Quality Gates (Thresholds):${COLOR_RESET}"
    echo "• ${COLOR_CYAN}Lines: 95%${COLOR_RESET}        • ${COLOR_CYAN}Functions: 100%${COLOR_RESET}"
    echo "• ${COLOR_CYAN}Branches: 90%${COLOR_RESET}     • ${COLOR_CYAN}Statements: 95%${COLOR_RESET}"
    
    # Print separator line for visual organization and clarity
    echo ""
    echo -e "${COLOR_CYAN}────────────────────────────────────────────────────────────────────────────────${COLOR_RESET}"
    echo ""
}

# =============================================================================
# COMMAND LINE ARGUMENT PARSING
# =============================================================================

# Parses command-line arguments to configure coverage execution mode, formats,
# thresholds, and other coverage options with comprehensive validation
parse_coverage_arguments() {
    # Initialize default argument values for all coverage options
    local show_help=false
    
    # Parse command line arguments using case statement for comprehensive handling
    while [[ $# -gt 0 ]]; do
        case $1 in
            --threshold)
                # Parse --threshold argument for minimum coverage percentage override
                if [[ -n "$2" && "$2" =~ ^[0-9]+$ && "$2" -ge 0 && "$2" -le 100 ]]; then
                    THRESHOLD_OVERRIDE="$2"
                    shift 2
                else
                    log_coverage_message "error" "Invalid threshold value. Must be 0-100"
                    return 1
                fi
                ;;
            --format)
                # Parse --format argument for coverage report format specification
                if [[ -n "$2" ]]; then
                    FORMAT_OVERRIDE="$2"
                    shift 2
                else
                    log_coverage_message "error" "Format option requires a value (html,json,text,lcov)"
                    return 1
                fi
                ;;
            --output)
                # Parse --output argument for custom coverage output directory
                if [[ -n "$2" ]]; then
                    OUTPUT_DIRECTORY="$2"
                    shift 2
                else
                    log_coverage_message "error" "Output option requires a directory path"
                    return 1
                fi
                ;;
            --quiet)
                # Parse --quiet flag for minimal output suitable for CI/CD execution
                QUIET_MODE="true"
                ;;
            --watch)
                # Parse --watch flag to enable coverage collection in watch mode
                WATCH_MODE="true"
                ;;
            --ci)
                # Parse --ci flag to enable CI/CD optimized coverage collection
                CI_MODE="true"
                CI="true"
                QUIET_MODE="true"  # CI mode implies quiet operation
                ;;
            --help|-h)
                # Display comprehensive help information with usage examples
                show_help=true
                ;;
            *)
                # Handle unknown arguments with educational error message
                log_coverage_message "error" "Unknown argument: $1. Use --help for usage information"
                return 1
                ;;
        esac
        
        # Handle case where we didn't shift in the case statement
        if [[ "$1" == "--quiet" || "$1" == "--watch" || "$1" == "--ci" || "$1" == "--help" || "$1" == "-h" ]]; then
            shift
        fi
    done
    
    # Display help information if requested
    if [[ "$show_help" == "true" ]]; then
        display_coverage_help
        return 0
    fi
    
    # Apply threshold override if specified
    if [[ -n "$THRESHOLD_OVERRIDE" ]]; then
        COVERAGE_THRESHOLD="$THRESHOLD_OVERRIDE"
    fi
    
    # Apply format override if specified with validation
    if [[ -n "$FORMAT_OVERRIDE" ]]; then
        # Validate format specification contains only supported formats
        if [[ "$FORMAT_OVERRIDE" =~ ^(html|json|json-summary|text|lcov)(,(html|json|json-summary|text|lcov))*$ ]]; then
            COVERAGE_FORMATS="$FORMAT_OVERRIDE"
        else
            log_coverage_message "error" "Invalid format specification. Use: html,json-summary,text,lcov"
            return 1
        fi
    fi
    
    # Validate argument combinations and detect conflicts
    if [[ "$WATCH_MODE" == "true" && "$CI_MODE" == "true" ]]; then
        log_coverage_message "error" "Watch mode and CI mode cannot be used together"
        return 1
    fi
    
    # Set global environment variables based on parsed arguments
    export NODE_ENV COVERAGE_DIR COVERAGE_THRESHOLD JEST_COVERAGE CI
    export OUTPUT_DIRECTORY COVERAGE_FORMATS QUIET_MODE WATCH_MODE CI_MODE
    
    # Display parsed configuration if verbose mode enabled
    if [[ "$QUIET_MODE" != "true" ]]; then
        log_coverage_message "info" "Coverage arguments parsed successfully" "config"
        log_coverage_message "debug" "THRESHOLD=${COVERAGE_THRESHOLD}, FORMATS=${COVERAGE_FORMATS}" "config"
    fi
    
    # Return success code for valid argument validation
    return 0
}

# Displays comprehensive help information with usage examples and educational guidance
display_coverage_help() {
    echo -e "${COLOR_BOLD}${COLOR_CYAN}Node.js Tutorial Coverage Collection Script Help${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_BOLD}USAGE:${COLOR_RESET}"
    echo "  ./scripts/coverage.sh [options]"
    echo ""
    echo -e "${COLOR_BOLD}OPTIONS:${COLOR_RESET}"
    echo "  --threshold <0-100>               Override minimum coverage threshold percentage"
    echo "  --format <formats>                Specify report formats: html,json-summary,text,lcov"
    echo "  --output <directory>              Override coverage output directory path"
    echo "  --quiet                          Minimize output for CI/CD pipeline execution"
    echo "  --watch                          Enable coverage collection in watch mode"
    echo "  --ci                             Enable CI-specific coverage reporting and validation"
    echo "  --help, -h                       Display this comprehensive help information"
    echo ""
    echo -e "${COLOR_BOLD}EXAMPLES:${COLOR_RESET}"
    echo "  ./scripts/coverage.sh                              # Default coverage collection"
    echo "  ./scripts/coverage.sh --threshold 90               # Lower threshold to 90%"
    echo "  ./scripts/coverage.sh --format html,json-summary   # HTML and JSON reports only"
    echo "  ./scripts/coverage.sh --output ./reports/coverage  # Custom output directory"
    echo "  ./scripts/coverage.sh --ci --quiet                 # CI/CD optimized execution"
    echo "  ./scripts/coverage.sh --watch                      # Watch mode for development"
    echo ""
    echo -e "${COLOR_BOLD}COVERAGE FORMATS:${COLOR_RESET}"
    echo "  html           - Interactive HTML dashboard with file-by-file analysis"
    echo "  json-summary   - JSON format summary for programmatic analysis"
    echo "  text           - Console-friendly text summary for logging"
    echo "  lcov           - LCOV format for external tool integration"
    echo ""
    echo -e "${COLOR_BOLD}QUALITY GATES:${COLOR_RESET}"
    echo "  Lines Coverage:      95% minimum (configurable with --threshold)"
    echo "  Function Coverage:   100% required for complete validation"
    echo "  Branch Coverage:     90% minimum for logical path validation"
    echo "  Statement Coverage:  95% minimum for comprehensive execution"
    echo ""
    echo -e "${COLOR_BOLD}EDUCATIONAL FEATURES:${COLOR_RESET}"
    echo "• Jest 29.7.0 built-in coverage collection with Istanbul compatibility"
    echo "• c8 native V8 coverage integration for enhanced analysis accuracy"
    echo "• Quality gate enforcement with configurable threshold validation"
    echo "• CI/CD integration with automated quality checks and reporting"
    echo "• Educational coverage patterns for Node.js development learning"
    echo ""
}

# =============================================================================
# COVERAGE ENVIRONMENT SETUP
# =============================================================================

# Initializes coverage collection environment with proper Node.js settings,
# validates coverage tools, and prepares output directories for coverage report generation
setup_coverage_environment() {
    log_coverage_message "info" "Initializing coverage collection environment" "setup"
    
    # Set NODE_ENV to 'test' for proper test environment configuration
    export NODE_ENV="test"
    
    # Validate Jest and coverage dependencies are installed and compatible
    if ! command -v node &> /dev/null; then
        log_coverage_message "error" "Node.js not found. Please install Node.js 22.x LTS or later"
        log_coverage_message "info" "Download from: https://nodejs.org/ (choose LTS version)"
        return 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local node_major=$(echo "$node_version" | cut -d. -f1)
    
    if [[ "$node_major" -lt 22 ]]; then
        log_coverage_message "error" "Node.js version ${node_version} not supported. Required: 22.x+"
        log_coverage_message "info" "Express.js 5.1.0 requires Node.js 22.x for optimal compatibility"
        return 1
    fi
    
    log_coverage_message "success" "Node.js version ${node_version} is compatible" "setup"
    
    # Verify Jest is installed and accessible in node_modules with coverage capabilities
    if [[ ! -f "${PROJECT_ROOT}/node_modules/.bin/jest" ]]; then
        log_coverage_message "error" "Jest testing framework not found in node_modules"
        log_coverage_message "info" "Install dependencies: npm install"
        return 1
    fi
    
    # Check Jest version compatibility and coverage support
    local jest_version
    if ! jest_version=$(cd "${PROJECT_ROOT}" && npx jest --version 2>/dev/null); then
        log_coverage_message "error" "Failed to determine Jest version - check Jest installation"
        return 1
    fi
    
    log_coverage_message "success" "Jest version ${jest_version} with coverage support available" "setup"
    
    # Create coverage output directory if it doesn't exist with proper permissions
    if [[ ! -d "$OUTPUT_DIRECTORY" ]]; then
        log_coverage_message "info" "Creating coverage output directory: ${OUTPUT_DIRECTORY}" "setup"
        if ! mkdir -p "$OUTPUT_DIRECTORY"; then
            log_coverage_message "error" "Failed to create coverage directory: ${OUTPUT_DIRECTORY}"
            return 1
        fi
    fi
    
    # Clear any existing coverage reports to ensure fresh analysis
    if [[ -d "$OUTPUT_DIRECTORY" && "$(ls -A "$OUTPUT_DIRECTORY" 2>/dev/null)" ]]; then
        log_coverage_message "info" "Clearing existing coverage reports for fresh analysis" "setup"
        rm -rf "${OUTPUT_DIRECTORY:?}"/*
    fi
    
    # Validate Jest configuration has proper coverage settings
    if [[ ! -f "$JEST_CONFIG_PATH" ]]; then
        log_coverage_message "error" "Jest configuration file not found: ${JEST_CONFIG_PATH}"
        log_coverage_message "info" "This file is required for coverage collection configuration"
        return 1
    fi
    
    # Verify jest.config.js is valid JavaScript by attempting to load it
    if ! node -c "$JEST_CONFIG_PATH" &> /dev/null; then
        log_coverage_message "error" "Jest configuration file contains syntax errors"
        log_coverage_message "info" "Please check ${JEST_CONFIG_PATH} for JavaScript syntax issues"
        return 1
    fi
    
    log_coverage_message "success" "Jest configuration file validated successfully" "setup"
    
    # Set up coverage environment variables for consistent reporting
    export COVERAGE_DIRECTORY="$OUTPUT_DIRECTORY"
    export JEST_COVERAGE="true"
    
    # Initialize coverage collection with proper source path inclusion patterns
    local coverage_patterns=(
        "src/**/*.js"
        "!src/**/*.test.js"
        "!src/**/*.spec.js"
        "!src/coverage/**"
        "!src/logs/**"
        "!src/tmp/**"
    )
    
    export COVERAGE_COLLECT_FROM=$(IFS=,; echo "${coverage_patterns[*]}")
    
    # Configure coverage exclusion patterns for node_modules and test files
    local exclusion_patterns=(
        "node_modules/**"
        "test/**"
        "coverage/**"
        "logs/**"
        "tmp/**"
        "**/*.config.js"
        "**/*.test.js"
        "**/*.spec.js"
    )
    
    export COVERAGE_PATH_IGNORE_PATTERNS=$(IFS=,; echo "${exclusion_patterns[*]}")
    
    # Validate source files exist for coverage collection
    local source_files=$(find "${PROJECT_ROOT}/src" -name "*.js" -not -path "*/test/*" -not -name "*.test.js" 2>/dev/null | wc -l)
    
    if [[ "$source_files" -eq 0 ]]; then
        log_coverage_message "warn" "No source files found for coverage collection in src/ directory"
        log_coverage_message "info" "Ensure source files exist with .js extension in src/ directory"
    else
        log_coverage_message "success" "Found ${source_files} source files for coverage analysis" "setup"
    fi
    
    # Set coverage collection timeout for large codebases
    export COVERAGE_TIMEOUT="30000"  # 30 seconds for coverage collection
    
    # Configure memory limits for coverage instrumentation
    if [[ "$CI_MODE" == "true" ]]; then
        export NODE_OPTIONS="--max-old-space-size=4096"  # 4GB limit for CI environments
    fi
    
    log_coverage_message "success" "Coverage environment setup completed successfully" "setup"
    
    # Return 0 for successful setup, 1 for configuration errors
    return 0
}

# =============================================================================
# COVERAGE COLLECTION EXECUTION
# =============================================================================

# Executes Jest test suite with comprehensive coverage collection enabled,
# generating detailed coverage analysis for all source files with threshold validation
execute_coverage_collection() {
    local coverage_options="${1:-{}}"
    
    log_coverage_message "info" "Executing Jest test suite with comprehensive coverage collection" "execution"
    
    # Capture coverage collection start time for performance measurement
    COVERAGE_START_TIME=$(date +%s%N)
    
    # Build Jest command with coverage flags and configuration
    local jest_command="npx jest"
    
    # Add configuration file parameter for coverage settings
    jest_command+=" --config ${JEST_CONFIG_PATH}"
    
    # Execute Jest with --coverage flag for comprehensive coverage analysis
    jest_command+=" --coverage"
    
    # Collect coverage from src/**/*.js files excluding test files and coverage directory
    jest_command+=" --collectCoverageFrom=\"src/**/*.js\""
    jest_command+=" --collectCoverageFrom=\"!src/**/*.test.js\""
    jest_command+=" --collectCoverageFrom=\"!src/**/*.spec.js\""
    jest_command+=" --collectCoverageFrom=\"!src/coverage/**\""
    
    # Generate coverage reports in multiple formats: HTML, JSON, text, LCOV
    IFS=',' read -ra FORMAT_ARRAY <<< "$COVERAGE_FORMATS"
    local reporter_list=""
    for format in "${FORMAT_ARRAY[@]}"; do
        case "$format" in
            "html")
                reporter_list+="html,"
                ;;
            "json"|"json-summary")
                reporter_list+="json-summary,"
                ;;
            "text")
                reporter_list+="text,"
                ;;
            "lcov")
                reporter_list+="lcov,"
                ;;
        esac
    done
    
    # Remove trailing comma from reporter list
    reporter_list=${reporter_list%,}
    
    if [[ -n "$reporter_list" ]]; then
        jest_command+=" --coverageReporters=${reporter_list}"
    fi
    
    # Set coverage output directory
    jest_command+=" --coverageDirectory=${OUTPUT_DIRECTORY}"
    
    # Apply coverage thresholds: 95% lines, 100% functions, 90% branches, 95% statements
    # Note: Jest will read thresholds from jest.config.js, but we can override if needed
    if [[ -n "$THRESHOLD_OVERRIDE" ]]; then
        jest_command+=" --coverageThreshold='{\"global\":{\"lines\":${THRESHOLD_OVERRIDE},\"functions\":100,\"branches\":90,\"statements\":${THRESHOLD_OVERRIDE}}}'"
    fi
    
    # Add CI/CD specific flags if CI mode is enabled
    if [[ "$CI_MODE" == "true" ]]; then
        jest_command+=" --ci"
        jest_command+=" --watchAll=false"
        jest_command+=" --passWithNoTests"
    fi
    
    # Add watch mode flag if watch mode enabled
    if [[ "$WATCH_MODE" == "true" ]]; then
        jest_command+=" --watch"
    fi
    
    # Configure test execution timeout
    jest_command+=" --testTimeout=15000"
    
    # Configure parallel execution for performance
    jest_command+=" --maxWorkers=50%"
    
    # Add verbose output unless quiet mode is enabled
    if [[ "$QUIET_MODE" != "true" ]]; then
        jest_command+=" --verbose"
    fi
    
    # Log Jest command being executed for debugging purposes
    if [[ "$QUIET_MODE" != "true" ]]; then
        log_coverage_message "debug" "Executing: ${jest_command}" "execution"
    fi
    
    # Execute Jest command in project root directory with error handling
    cd "$PROJECT_ROOT" || {
        log_coverage_message "error" "Failed to change to project directory: ${PROJECT_ROOT}"
        return 1
    }
    
    # Execute Jest with coverage collection, capturing exit code
    set +e  # Temporarily disable exit on error to capture Jest exit code
    eval "$jest_command"
    JEST_EXIT_CODE=$?
    set -e  # Re-enable exit on error
    
    # Capture coverage collection end time for performance measurement
    COVERAGE_END_TIME=$(date +%s%N)
    
    # Calculate coverage collection duration in milliseconds
    local duration_ns=$((COVERAGE_END_TIME - COVERAGE_START_TIME))
    local duration_ms=$((duration_ns / 1000000))
    
    # Analyze Jest exit code to determine coverage collection success
    if [[ $JEST_EXIT_CODE -eq 0 ]]; then
        COVERAGE_COLLECTION_SUCCESS=true
        log_coverage_message "success" "Coverage collection completed successfully in ${duration_ms}ms" "execution"
        
        # Validate coverage meets defined quality thresholds from Jest configuration
        validate_coverage_thresholds "{}"
        
    elif [[ $JEST_EXIT_CODE -eq 1 ]]; then
        COVERAGE_COLLECTION_SUCCESS=false
        log_coverage_message "error" "Test failures detected during coverage collection" "execution"
        log_coverage_message "info" "Fix failing tests before coverage analysis can complete" "execution"
        
    elif [[ $JEST_EXIT_CODE -eq 2 ]]; then
        COVERAGE_COLLECTION_SUCCESS=true  # Coverage collected but thresholds not met
        THRESHOLD_VALIDATION_SUCCESS=false
        log_coverage_message "warn" "Coverage collected but thresholds not met" "execution"
        
    else
        COVERAGE_COLLECTION_SUCCESS=false
        log_coverage_message "error" "Coverage collection failed with exit code ${JEST_EXIT_CODE}" "execution"
    fi
    
    # Generate detailed coverage summary with file-by-file breakdown
    if [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" ]]; then
        log_coverage_message "info" "Generating detailed coverage metrics analysis" "execution"
        
        # Store coverage execution results for reporting
        COVERAGE_RESULTS["collection_success"]="$COVERAGE_COLLECTION_SUCCESS"
        COVERAGE_RESULTS["execution_time"]="$duration_ms"
        COVERAGE_RESULTS["jest_exit_code"]="$JEST_EXIT_CODE"
        COVERAGE_RESULTS["formats_generated"]="$COVERAGE_FORMATS"
        COVERAGE_RESULTS["output_directory"]="$OUTPUT_DIRECTORY"
    fi
    
    # Create coverage badges and metrics for CI/CD pipeline integration
    if [[ "$CI_MODE" == "true" && "$COVERAGE_COLLECTION_SUCCESS" == "true" ]]; then
        generate_ci_cd_reports "{}"
    fi
    
    # Return 0 for successful coverage with thresholds met, 1 for threshold failures
    if [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" && "$THRESHOLD_VALIDATION_SUCCESS" != "false" ]]; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# COVERAGE REPORT GENERATION
# =============================================================================

# Generates comprehensive coverage reports in multiple formats including HTML dashboard,
# JSON data, text summary, and LCOV format for different integration needs
generate_coverage_reports() {
    local report_options="${1:-{}}"
    
    log_coverage_message "info" "Generating comprehensive coverage reports in multiple formats" "reports"
    
    # Verify coverage data exists before generating reports
    if [[ ! -d "$OUTPUT_DIRECTORY" ]]; then
        log_coverage_message "error" "Coverage output directory not found: ${OUTPUT_DIRECTORY}"
        return 1
    fi
    
    # Check for coverage data files generated by Jest
    local coverage_data_files=(
        "${OUTPUT_DIRECTORY}/lcov.info"
        "${OUTPUT_DIRECTORY}/coverage-final.json"
        "${OUTPUT_DIRECTORY}/coverage-summary.json"
    )
    
    local data_files_found=0
    for file in "${coverage_data_files[@]}"; do
        if [[ -f "$file" ]]; then
            ((data_files_found++))
        fi
    done
    
    if [[ $data_files_found -eq 0 ]]; then
        log_coverage_message "warn" "No coverage data files found - coverage may not have been collected"
        log_coverage_message "info" "Run coverage collection first to generate coverage data"
        return 1
    fi
    
    log_coverage_message "success" "Found ${data_files_found} coverage data files for report generation" "reports"
    
    # Generate HTML coverage report with detailed file view and line-by-line analysis
    if [[ "$COVERAGE_FORMATS" == *"html"* ]]; then
        if [[ -d "${OUTPUT_DIRECTORY}/lcov-report" ]]; then
            log_coverage_message "success" "HTML coverage report generated successfully" "reports"
            REPORT_ARTIFACTS["html_report"]="${OUTPUT_DIRECTORY}/lcov-report/index.html"
            
            # Validate HTML report contains expected content
            if [[ -f "${OUTPUT_DIRECTORY}/lcov-report/index.html" ]]; then
                local html_size=$(stat -f%z "${OUTPUT_DIRECTORY}/lcov-report/index.html" 2>/dev/null || stat -c%s "${OUTPUT_DIRECTORY}/lcov-report/index.html" 2>/dev/null)
                if [[ $html_size -gt 1000 ]]; then
                    log_coverage_message "success" "HTML report contains comprehensive coverage data (${html_size} bytes)" "reports"
                else
                    log_coverage_message "warn" "HTML report may be incomplete (${html_size} bytes)" "reports"
                fi
            fi
        else
            log_coverage_message "warn" "HTML coverage report directory not found" "reports"
        fi
    fi
    
    # Create JSON summary report for programmatic analysis and CI/CD integration
    if [[ "$COVERAGE_FORMATS" == *"json"* ]]; then
        if [[ -f "${OUTPUT_DIRECTORY}/coverage-summary.json" ]]; then
            log_coverage_message "success" "JSON summary report generated successfully" "reports"
            REPORT_ARTIFACTS["json_summary"]="${OUTPUT_DIRECTORY}/coverage-summary.json"
            
            # Parse JSON summary to extract coverage percentages
            if command -v jq &> /dev/null && [[ -f "${OUTPUT_DIRECTORY}/coverage-summary.json" ]]; then
                local total_lines=$(jq -r '.total.lines.pct' "${OUTPUT_DIRECTORY}/coverage-summary.json" 2>/dev/null || echo "N/A")
                local total_functions=$(jq -r '.total.functions.pct' "${OUTPUT_DIRECTORY}/coverage-summary.json" 2>/dev/null || echo "N/A")
                local total_branches=$(jq -r '.total.branches.pct' "${OUTPUT_DIRECTORY}/coverage-summary.json" 2>/dev/null || echo "N/A")
                local total_statements=$(jq -r '.total.statements.pct' "${OUTPUT_DIRECTORY}/coverage-summary.json" 2>/dev/null || echo "N/A")
                
                if [[ "$total_lines" != "N/A" ]]; then
                    COVERAGE_METRICS["lines_pct"]="$total_lines"
                    COVERAGE_METRICS["functions_pct"]="$total_functions"
                    COVERAGE_METRICS["branches_pct"]="$total_branches"
                    COVERAGE_METRICS["statements_pct"]="$total_statements"
                    
                    log_coverage_message "info" "Coverage metrics: Lines=${total_lines}%, Functions=${total_functions}%, Branches=${total_branches}%, Statements=${total_statements}%" "reports"
                fi
            fi
        else
            log_coverage_message "warn" "JSON summary report not found" "reports"
        fi
    fi
    
    # Generate text-based coverage summary for console output and logging
    if [[ "$COVERAGE_FORMATS" == *"text"* ]]; then
        # Text output is typically displayed during Jest execution
        log_coverage_message "success" "Text coverage summary displayed during test execution" "reports"
        REPORT_ARTIFACTS["text_summary"]="console_output"
    fi
    
    # Create LCOV format report for integration with external coverage tools
    if [[ "$COVERAGE_FORMATS" == *"lcov"* ]]; then
        if [[ -f "${OUTPUT_DIRECTORY}/lcov.info" ]]; then
            log_coverage_message "success" "LCOV format report generated successfully" "reports"
            REPORT_ARTIFACTS["lcov_report"]="${OUTPUT_DIRECTORY}/lcov.info"
            
            # Validate LCOV file contains coverage data
            local lcov_size=$(stat -f%z "${OUTPUT_DIRECTORY}/lcov.info" 2>/dev/null || stat -c%s "${OUTPUT_DIRECTORY}/lcov.info" 2>/dev/null)
            if [[ $lcov_size -gt 100 ]]; then
                log_coverage_message "success" "LCOV report contains coverage data (${lcov_size} bytes)" "reports"
            else
                log_coverage_message "warn" "LCOV report may be incomplete (${lcov_size} bytes)" "reports"
            fi
        else
            log_coverage_message "warn" "LCOV format report not found" "reports"
        fi
    fi
    
    # Generate coverage badge with percentage and color-coded status
    if command -v node &> /dev/null && [[ -f "${OUTPUT_DIRECTORY}/coverage-summary.json" ]]; then
        generate_coverage_badge
    fi
    
    # Create historical coverage trend data if previous reports exist
    if [[ -f "${PROJECT_ROOT}/.coverage-history.json" ]]; then
        update_coverage_history
    else
        initialize_coverage_history
    fi
    
    # Archive coverage reports with timestamp for historical comparison
    local timestamp=$(date -u +"%Y%m%d_%H%M%S")
    local archive_dir="${OUTPUT_DIRECTORY}/archives"
    
    if [[ "$CI_MODE" != "true" ]]; then  # Skip archiving in CI mode to save space
        mkdir -p "$archive_dir"
        if [[ -f "${OUTPUT_DIRECTORY}/coverage-summary.json" ]]; then
            cp "${OUTPUT_DIRECTORY}/coverage-summary.json" "${archive_dir}/coverage-summary_${timestamp}.json"
            log_coverage_message "success" "Coverage report archived for historical comparison" "reports"
        fi
    fi
    
    # Generate coverage metrics for monitoring and alerting systems
    generate_coverage_metrics_file
    
    log_coverage_message "success" "Coverage report generation completed successfully" "reports"
    
    # Return 0 for successful report generation, 1 for generation errors
    return 0
}

# Generates a visual coverage badge for README and documentation
generate_coverage_badge() {
    if [[ -f "${OUTPUT_DIRECTORY}/coverage-summary.json" ]] && command -v node &> /dev/null; then
        # Simple badge generation (would use badge-maker or similar in production)
        local lines_pct="${COVERAGE_METRICS[lines_pct]:-0}"
        local badge_color="red"
        
        if [[ $(echo "$lines_pct >= 95" | bc 2>/dev/null || echo "0") -eq 1 ]]; then
            badge_color="brightgreen"
        elif [[ $(echo "$lines_pct >= 80" | bc 2>/dev/null || echo "0") -eq 1 ]]; then
            badge_color="yellow"
        elif [[ $(echo "$lines_pct >= 60" | bc 2>/dev/null || echo "0") -eq 1 ]]; then
            badge_color="orange"
        fi
        
        # Create simple badge data file
        echo "{\"schemaVersion\":1,\"label\":\"coverage\",\"message\":\"${lines_pct}%\",\"color\":\"${badge_color}\"}" > "${OUTPUT_DIRECTORY}/coverage-badge.json"
        REPORT_ARTIFACTS["coverage_badge"]="${OUTPUT_DIRECTORY}/coverage-badge.json"
        
        log_coverage_message "success" "Coverage badge generated with ${lines_pct}% coverage" "reports"
    fi
}

# Updates or initializes coverage history for trend analysis
update_coverage_history() {
    local history_file="${PROJECT_ROOT}/.coverage-history.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [[ -n "${COVERAGE_METRICS[lines_pct]}" ]]; then
        local history_entry="{\"timestamp\":\"${timestamp}\",\"lines\":${COVERAGE_METRICS[lines_pct]},\"functions\":${COVERAGE_METRICS[functions_pct]},\"branches\":${COVERAGE_METRICS[branches_pct]},\"statements\":${COVERAGE_METRICS[statements_pct]}}"
        
        if [[ -f "$history_file" ]]; then
            # Append to existing history (simplified implementation)
            log_coverage_message "info" "Updated coverage history with current metrics" "reports"
        else
            # Create new history file
            echo "[${history_entry}]" > "$history_file"
            log_coverage_message "info" "Initialized coverage history tracking" "reports"
        fi
    fi
}

# Initialize coverage history tracking
initialize_coverage_history() {
    update_coverage_history
}

# Generates coverage metrics file for monitoring systems
generate_coverage_metrics_file() {
    local metrics_file="${OUTPUT_DIRECTORY}/coverage-metrics.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$metrics_file" << EOF
{
  "timestamp": "${timestamp}",
  "metrics": {
    "lines": {
      "percentage": ${COVERAGE_METRICS[lines_pct]:-0},
      "threshold": 95,
      "status": "$([ "${COVERAGE_METRICS[lines_pct]:-0}" -ge 95 ] 2>/dev/null && echo "pass" || echo "fail")"
    },
    "functions": {
      "percentage": ${COVERAGE_METRICS[functions_pct]:-0},
      "threshold": 100,
      "status": "$([ "${COVERAGE_METRICS[functions_pct]:-0}" -eq 100 ] 2>/dev/null && echo "pass" || echo "fail")"
    },
    "branches": {
      "percentage": ${COVERAGE_METRICS[branches_pct]:-0},
      "threshold": 90,
      "status": "$([ "${COVERAGE_METRICS[branches_pct]:-0}" -ge 90 ] 2>/dev/null && echo "pass" || echo "fail")"
    },
    "statements": {
      "percentage": ${COVERAGE_METRICS[statements_pct]:-0},
      "threshold": 95,
      "status": "$([ "${COVERAGE_METRICS[statements_pct]:-0}" -ge 95 ] 2>/dev/null && echo "pass" || echo "fail")"
    }
  },
  "execution": {
    "duration_ms": ${COVERAGE_RESULTS[execution_time]:-0},
    "jest_exit_code": ${COVERAGE_RESULTS[jest_exit_code]:-0},
    "collection_success": ${COVERAGE_COLLECTION_SUCCESS}
  }
}
EOF
    
    REPORT_ARTIFACTS["metrics_file"]="$metrics_file"
    log_coverage_message "success" "Coverage metrics file generated for monitoring integration" "reports"
}

# =============================================================================
# COVERAGE THRESHOLD VALIDATION
# =============================================================================

# Validates collected coverage metrics against defined quality thresholds and
# generates detailed threshold compliance reports for CI/CD quality gates
validate_coverage_thresholds() {
    local threshold_config="${1:-{}}"
    
    log_coverage_message "info" "Validating coverage metrics against quality thresholds" "validation"
    
    # Load coverage thresholds from Jest configuration: 95% lines, 100% functions, 90% branches, 95% statements
    local lines_threshold="${COVERAGE_THRESHOLD}"
    local functions_threshold="100"
    local branches_threshold="90"
    local statements_threshold="${COVERAGE_THRESHOLD}"
    
    # Override thresholds if custom configuration provided
    if [[ -n "$THRESHOLD_OVERRIDE" ]]; then
        lines_threshold="$THRESHOLD_OVERRIDE"
        statements_threshold="$THRESHOLD_OVERRIDE"
    fi
    
    log_coverage_message "info" "Using thresholds: Lines=${lines_threshold}%, Functions=${functions_threshold}%, Branches=${branches_threshold}%, Statements=${statements_threshold}%" "validation"
    
    # Parse coverage results JSON for detailed metrics analysis
    local coverage_summary="${OUTPUT_DIRECTORY}/coverage-summary.json"
    
    if [[ ! -f "$coverage_summary" ]]; then
        log_coverage_message "error" "Coverage summary file not found: ${coverage_summary}"
        log_coverage_message "info" "Run coverage collection first to generate coverage data"
        return 1
    fi
    
    # Initialize threshold compliance tracking
    local thresholds_met=true
    local failing_thresholds=()
    
    # Compare actual coverage percentages against defined thresholds
    if command -v jq &> /dev/null; then
        # Use jq for precise JSON parsing
        local actual_lines=$(jq -r '.total.lines.pct // 0' "$coverage_summary")
        local actual_functions=$(jq -r '.total.functions.pct // 0' "$coverage_summary")
        local actual_branches=$(jq -r '.total.branches.pct // 0' "$coverage_summary")
        local actual_statements=$(jq -r '.total.statements.pct // 0' "$coverage_summary")
        
        # Validate line coverage threshold
        if [[ $(echo "$actual_lines < $lines_threshold" | bc 2>/dev/null || echo "1") -eq 1 ]]; then
            thresholds_met=false
            failing_thresholds+=("lines: ${actual_lines}% < ${lines_threshold}%")
            THRESHOLD_COMPLIANCE["lines"]="fail"
        else
            THRESHOLD_COMPLIANCE["lines"]="pass"
        fi
        
        # Validate function coverage threshold
        if [[ $(echo "$actual_functions < $functions_threshold" | bc 2>/dev/null || echo "1") -eq 1 ]]; then
            thresholds_met=false
            failing_thresholds+=("functions: ${actual_functions}% < ${functions_threshold}%")
            THRESHOLD_COMPLIANCE["functions"]="fail"
        else
            THRESHOLD_COMPLIANCE["functions"]="pass"
        fi
        
        # Validate branch coverage threshold
        if [[ $(echo "$actual_branches < $branches_threshold" | bc 2>/dev/null || echo "1") -eq 1 ]]; then
            thresholds_met=false
            failing_thresholds+=("branches: ${actual_branches}% < ${branches_threshold}%")
            THRESHOLD_COMPLIANCE["branches"]="fail"
        else
            THRESHOLD_COMPLIANCE["branches"]="pass"
        fi
        
        # Validate statement coverage threshold
        if [[ $(echo "$actual_statements < $statements_threshold" | bc 2>/dev/null || echo "1") -eq 1 ]]; then
            thresholds_met=false
            failing_thresholds+=("statements: ${actual_statements}% < ${statements_threshold}%")
            THRESHOLD_COMPLIANCE["statements"]="fail"
        else
            THRESHOLD_COMPLIANCE["statements"]="pass"
        fi
        
        # Store actual coverage metrics for reporting
        COVERAGE_METRICS["lines_pct"]="$actual_lines"
        COVERAGE_METRICS["functions_pct"]="$actual_functions"
        COVERAGE_METRICS["branches_pct"]="$actual_branches"
        COVERAGE_METRICS["statements_pct"]="$actual_statements"
        
    else
        log_coverage_message "warn" "jq not available - using simplified threshold validation" "validation"
        # Fallback to simple grep-based parsing (less precise)
        thresholds_met=false  # Conservative approach when precise parsing unavailable
    fi
    
    # Generate detailed threshold compliance report with pass/fail status
    if [[ "$thresholds_met" == "true" ]]; then
        THRESHOLD_VALIDATION_SUCCESS=true
        log_coverage_message "success" "All coverage thresholds met successfully" "validation"
        log_coverage_message "info" "Lines: ${COVERAGE_METRICS[lines_pct]}%, Functions: ${COVERAGE_METRICS[functions_pct]}%, Branches: ${COVERAGE_METRICS[branches_pct]}%, Statements: ${COVERAGE_METRICS[statements_pct]}%" "validation"
        
        # Generate threshold compliance success report
        generate_threshold_compliance_report "pass"
        
    else
        THRESHOLD_VALIDATION_SUCCESS=false
        log_coverage_message "error" "Coverage thresholds not met - quality gate failure" "validation"
        
        # Identify specific files or functions that failed coverage requirements
        for threshold_failure in "${failing_thresholds[@]}"; do
            log_coverage_message "error" "Threshold violation: ${threshold_failure}" "validation"
        done
        
        # Create actionable recommendations for improving coverage
        generate_coverage_improvement_recommendations
        
        # Generate threshold compliance failure report
        generate_threshold_compliance_report "fail"
    fi
    
    # Update CI/CD quality gate status based on threshold compliance
    if [[ "$CI_MODE" == "true" ]]; then
        update_ci_quality_gate_status "$thresholds_met"
    fi
    
    # Return 0 for all thresholds met, 1 for threshold violations
    if [[ "$THRESHOLD_VALIDATION_SUCCESS" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

# Generates detailed threshold compliance report for CI/CD integration
generate_threshold_compliance_report() {
    local status="$1"
    local report_file="${OUTPUT_DIRECTORY}/threshold-compliance.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$report_file" << EOF
{
  "timestamp": "${timestamp}",
  "overall_status": "${status}",
  "thresholds": {
    "lines": {
      "actual": ${COVERAGE_METRICS[lines_pct]:-0},
      "threshold": ${COVERAGE_THRESHOLD},
      "status": "${THRESHOLD_COMPLIANCE[lines]:-unknown}"
    },
    "functions": {
      "actual": ${COVERAGE_METRICS[functions_pct]:-0},
      "threshold": 100,
      "status": "${THRESHOLD_COMPLIANCE[functions]:-unknown}"
    },
    "branches": {
      "actual": ${COVERAGE_METRICS[branches_pct]:-0},
      "threshold": 90,
      "status": "${THRESHOLD_COMPLIANCE[branches]:-unknown}"
    },
    "statements": {
      "actual": ${COVERAGE_METRICS[statements_pct]:-0},
      "threshold": ${COVERAGE_THRESHOLD},
      "status": "${THRESHOLD_COMPLIANCE[statements]:-unknown}"
    }
  }
}
EOF
    
    REPORT_ARTIFACTS["threshold_report"]="$report_file"
    log_coverage_message "success" "Threshold compliance report generated" "validation"
}

# Provides recommendations for improving code coverage
generate_coverage_improvement_recommendations() {
    log_coverage_message "info" "Generating coverage improvement recommendations" "validation"
    
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}📈 Coverage Improvement Recommendations:${COLOR_RESET}"
    echo ""
    
    if [[ "${THRESHOLD_COMPLIANCE[lines]}" == "fail" ]]; then
        echo "🔍 ${COLOR_BOLD}Line Coverage Improvement:${COLOR_RESET}"
        echo "   • Add tests for uncovered lines in your source files"
        echo "   • Review HTML coverage report to identify specific uncovered lines"
        echo "   • Focus on error handling paths and edge cases"
    fi
    
    if [[ "${THRESHOLD_COMPLIANCE[functions]}" == "fail" ]]; then
        echo "🔍 ${COLOR_BOLD}Function Coverage Improvement:${COLOR_RESET}"
        echo "   • Ensure every function is called at least once in tests"
        echo "   • Add unit tests for utility functions and helper methods"
        echo "   • Test both exported and internal functions"
    fi
    
    if [[ "${THRESHOLD_COMPLIANCE[branches]}" == "fail" ]]; then
        echo "🔍 ${COLOR_BOLD}Branch Coverage Improvement:${COLOR_RESET}"
        echo "   • Test all conditional branches (if/else, switch cases)"
        echo "   • Add tests for both true and false conditions"
        echo "   • Cover error handling branches and exception paths"
    fi
    
    if [[ "${THRESHOLD_COMPLIANCE[statements]}" == "fail" ]]; then
        echo "🔍 ${COLOR_BOLD}Statement Coverage Improvement:${COLOR_RESET}"
        echo "   • Ensure all code statements are executed during tests"
        echo "   • Remove unreachable code or add tests to reach it"
        echo "   • Test initialization and cleanup code paths"
    fi
    
    echo ""
    echo "💡 ${COLOR_BOLD}Testing Best Practices:${COLOR_RESET}"
    echo "   • Open coverage/lcov-report/index.html for detailed analysis"
    echo "   • Use 'npm run test:watch' for test-driven development"
    echo "   • Focus on testing business logic and critical paths first"
    echo "   • Consider edge cases and error conditions in your tests"
    echo ""
}

# Updates CI/CD quality gate status based on coverage compliance
update_ci_quality_gate_status() {
    local thresholds_met="$1"
    
    if [[ "$thresholds_met" == "true" ]]; then
        echo "COVERAGE_QUALITY_GATE=PASS" >> "$GITHUB_ENV" 2>/dev/null || true
        log_coverage_message "success" "CI/CD quality gate status updated: PASS" "validation"
    else
        echo "COVERAGE_QUALITY_GATE=FAIL" >> "$GITHUB_ENV" 2>/dev/null || true
        log_coverage_message "error" "CI/CD quality gate status updated: FAIL" "validation"
    fi
}

# =============================================================================
# COVERAGE ARTIFACT CLEANUP
# =============================================================================

# Manages coverage report artifacts including cleanup of temporary files,
# archiving of reports, and preparation for CI/CD artifact collection
cleanup_coverage_artifacts() {
    local preserve_reports="${1:-true}"
    
    log_coverage_message "info" "Managing coverage artifacts and cleanup operations" "cleanup"
    
    # Preserve coverage reports in coverage/ directory for CI/CD artifacts
    if [[ "$preserve_reports" == "true" ]]; then
        log_coverage_message "info" "Preserving coverage reports for CI/CD artifact collection" "cleanup"
        
        # Ensure important coverage files are preserved
        local preserved_files=(
            "${OUTPUT_DIRECTORY}/coverage-summary.json"
            "${OUTPUT_DIRECTORY}/lcov.info"
            "${OUTPUT_DIRECTORY}/lcov-report/index.html"
            "${OUTPUT_DIRECTORY}/threshold-compliance.json"
            "${OUTPUT_DIRECTORY}/coverage-metrics.json"
        )
        
        for file in "${preserved_files[@]}"; do
            if [[ -f "$file" ]]; then
                log_coverage_message "debug" "Preserving coverage artifact: ${file}" "cleanup"
            fi
        done
    fi
    
    # Clean up temporary coverage collection files and intermediate data
    local temp_cleanup_patterns=(
        "${PROJECT_ROOT}/tmp/coverage-*"
        "${PROJECT_ROOT}/.nyc_output"
        "${PROJECT_ROOT}/.coverage_cache"
        "${OUTPUT_DIRECTORY}/*.tmp"
        "${OUTPUT_DIRECTORY}/*.temp"
    )
    
    for pattern in "${temp_cleanup_patterns[@]}"; do
        if ls $pattern &> /dev/null; then
            rm -rf $pattern
            log_coverage_message "debug" "Cleaned up temporary files: ${pattern}" "cleanup"
        fi
    done
    
    # Archive coverage reports with timestamp for historical tracking
    if [[ "$preserve_reports" == "true" && "$CI_MODE" != "true" ]]; then
        local archive_timestamp=$(date -u +"%Y%m%d_%H%M%S")
        local archive_dir="${OUTPUT_DIRECTORY}/historical"
        
        mkdir -p "$archive_dir"
        
        if [[ -f "${OUTPUT_DIRECTORY}/coverage-summary.json" ]]; then
            cp "${OUTPUT_DIRECTORY}/coverage-summary.json" "${archive_dir}/summary_${archive_timestamp}.json"
            log_coverage_message "success" "Coverage report archived for historical comparison" "cleanup"
        fi
    fi
    
    # Generate coverage summary file for quick reference
    local summary_file="${OUTPUT_DIRECTORY}/COVERAGE_SUMMARY.md"
    generate_coverage_summary_file "$summary_file"
    
    # Clean up Jest cache files if not needed for subsequent runs
    if [[ -d "${PROJECT_ROOT}/.jest-cache" && "$preserve_reports" != "true" ]]; then
        # Only clean old cache files, preserve recent ones for performance
        find "${PROJECT_ROOT}/.jest-cache" -type f -mtime +1 -delete 2>/dev/null || true
        log_coverage_message "debug" "Cleaned up old Jest cache files" "cleanup"
    fi
    
    # Compress large coverage reports to save storage space in CI environments
    if [[ "$CI_MODE" == "true" && -d "${OUTPUT_DIRECTORY}/lcov-report" ]]; then
        if command -v tar &> /dev/null; then
            tar -czf "${OUTPUT_DIRECTORY}/lcov-report.tar.gz" -C "$OUTPUT_DIRECTORY" lcov-report/
            rm -rf "${OUTPUT_DIRECTORY}/lcov-report"
            log_coverage_message "info" "Compressed HTML coverage report for CI storage optimization" "cleanup"
        fi
    fi
    
    # Log cleanup completion with preserved artifact locations
    log_coverage_message "success" "Coverage artifact cleanup completed successfully" "cleanup"
    
    if [[ "$preserve_reports" == "true" ]]; then
        log_coverage_message "info" "Preserved artifacts location: ${OUTPUT_DIRECTORY}" "cleanup"
    fi
    
    # Return 0 for successful cleanup, 1 for cleanup errors
    return 0
}

# Generates a markdown summary file for quick coverage reference
generate_coverage_summary_file() {
    local summary_file="$1"
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    
    cat > "$summary_file" << EOF
# Coverage Summary Report

**Generated:** ${timestamp}
**Project:** Node.js Tutorial Application
**Framework:** Jest 29.7.0

## Coverage Metrics

| Metric | Actual | Threshold | Status |
|--------|--------|-----------|--------|
| Lines | ${COVERAGE_METRICS[lines_pct]:-N/A}% | ${COVERAGE_THRESHOLD}% | ${THRESHOLD_COMPLIANCE[lines]:-unknown} |
| Functions | ${COVERAGE_METRICS[functions_pct]:-N/A}% | 100% | ${THRESHOLD_COMPLIANCE[functions]:-unknown} |
| Branches | ${COVERAGE_METRICS[branches_pct]:-N/A}% | 90% | ${THRESHOLD_COMPLIANCE[branches]:-unknown} |
| Statements | ${COVERAGE_METRICS[statements_pct]:-N/A}% | ${COVERAGE_THRESHOLD}% | ${THRESHOLD_COMPLIANCE[statements]:-unknown} |

## Report Artifacts

EOF
    
    for artifact_type in "${!REPORT_ARTIFACTS[@]}"; do
        echo "- **${artifact_type}:** \`${REPORT_ARTIFACTS[$artifact_type]}\`" >> "$summary_file"
    done
    
    cat >> "$summary_file" << EOF

## Execution Details

- **Duration:** ${COVERAGE_RESULTS[execution_time]:-N/A}ms
- **Jest Exit Code:** ${COVERAGE_RESULTS[jest_exit_code]:-N/A}
- **Collection Success:** ${COVERAGE_COLLECTION_SUCCESS}
- **Threshold Validation:** ${THRESHOLD_VALIDATION_SUCCESS}

## Next Steps

1. Review HTML coverage report for detailed analysis
2. Address any failing coverage thresholds
3. Add tests for uncovered code paths
4. Maintain coverage levels above minimum thresholds

EOF
    
    log_coverage_message "success" "Coverage summary markdown generated: ${summary_file}" "cleanup"
}

# =============================================================================
# CI/CD INTEGRATION
# =============================================================================

# Generates CI/CD-specific coverage reports and metrics for pipeline integration
# including JUnit-compatible XML and JSON artifacts
generate_ci_cd_reports() {
    local ci_options="${1:-{}}"
    
    if [[ "$CI_MODE" != "true" ]]; then
        log_coverage_message "debug" "CI mode not enabled, skipping CI/CD report generation" "ci"
        return 0
    fi
    
    log_coverage_message "info" "Generating CI/CD-specific coverage reports and metrics" "ci"
    
    # Generate coverage summary in JSON format for CI/CD pipeline consumption
    local ci_summary_file="${OUTPUT_DIRECTORY}/ci-coverage-summary.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$ci_summary_file" << EOF
{
  "timestamp": "${timestamp}",
  "pipeline": {
    "build_id": "${BUILD_ID:-unknown}",
    "commit_sha": "${GITHUB_SHA:-${GIT_COMMIT:-unknown}}",
    "branch": "${GITHUB_REF_NAME:-${GIT_BRANCH:-unknown}}"
  },
  "coverage": {
    "lines": ${COVERAGE_METRICS[lines_pct]:-0},
    "functions": ${COVERAGE_METRICS[functions_pct]:-0},
    "branches": ${COVERAGE_METRICS[branches_pct]:-0},
    "statements": ${COVERAGE_METRICS[statements_pct]:-0}
  },
  "thresholds": {
    "lines": ${COVERAGE_THRESHOLD},
    "functions": 100,
    "branches": 90,
    "statements": ${COVERAGE_THRESHOLD}
  },
  "compliance": {
    "lines": "${THRESHOLD_COMPLIANCE[lines]:-unknown}",
    "functions": "${THRESHOLD_COMPLIANCE[functions]:-unknown}",
    "branches": "${THRESHOLD_COMPLIANCE[branches]:-unknown}",
    "statements": "${THRESHOLD_COMPLIANCE[statements]:-unknown}",
    "overall": "${THRESHOLD_VALIDATION_SUCCESS}"
  },
  "execution": {
    "duration_ms": ${COVERAGE_RESULTS[execution_time]:-0},
    "jest_exit_code": ${COVERAGE_RESULTS[jest_exit_code]:-0}
  }
}
EOF
    
    REPORT_ARTIFACTS["ci_summary"]="$ci_summary_file"
    log_coverage_message "success" "CI/CD coverage summary generated" "ci"
    
    # Create coverage metrics file with key performance indicators
    local kpi_file="${OUTPUT_DIRECTORY}/coverage-kpis.json"
    cat > "$kpi_file" << EOF
{
  "kpis": {
    "coverage_score": $(echo "scale=2; (${COVERAGE_METRICS[lines_pct]:-0} + ${COVERAGE_METRICS[functions_pct]:-0} + ${COVERAGE_METRICS[branches_pct]:-0} + ${COVERAGE_METRICS[statements_pct]:-0}) / 4" | bc 2>/dev/null || echo "0"),
    "threshold_compliance_rate": $(echo "scale=2; $(echo ${THRESHOLD_COMPLIANCE[@]} | tr ' ' '\n' | grep -c "pass" 2>/dev/null || echo "0") / 4 * 100" | bc 2>/dev/null || echo "0"),
    "quality_gate_status": "${THRESHOLD_VALIDATION_SUCCESS}",
    "execution_performance": "$([ "${COVERAGE_RESULTS[execution_time]:-30000}" -lt 30000 ] 2>/dev/null && echo "good" || echo "needs_improvement")"
  }
}
EOF
    
    REPORT_ARTIFACTS["kpi_metrics"]="$kpi_file"
    
    # Generate coverage trend data comparing against previous builds
    generate_coverage_trend_data
    
    # Create coverage status badges for README and documentation
    generate_ci_coverage_badges
    
    # Generate threshold compliance report for quality gate decisions
    # (Already generated in validate_coverage_thresholds)
    
    # Create actionable coverage improvement recommendations
    local recommendations_file="${OUTPUT_DIRECTORY}/coverage-recommendations.json"
    generate_ci_recommendations "$recommendations_file"
    
    # Generate coverage artifacts list for CI/CD artifact collection
    local artifacts_list="${OUTPUT_DIRECTORY}/coverage-artifacts.json"
    cat > "$artifacts_list" << EOF
{
  "artifacts": [
$(for artifact in "${!REPORT_ARTIFACTS[@]}"; do
    echo "    {\"type\": \"$artifact\", \"path\": \"${REPORT_ARTIFACTS[$artifact]}\"},"
done | sed '$s/,$//')
  ]
}
EOF
    
    REPORT_ARTIFACTS["artifacts_list"]="$artifacts_list"
    
    log_coverage_message "success" "CI/CD report generation completed" "ci"
    
    # Return 0 for successful CI/CD report generation, 1 for errors
    return 0
}

# Generates coverage trend analysis for CI/CD pipelines
generate_coverage_trend_data() {
    local trend_file="${OUTPUT_DIRECTORY}/coverage-trend.json"
    local current_coverage="${COVERAGE_METRICS[lines_pct]:-0}"
    local previous_coverage="0"
    
    # Try to get previous coverage from environment or file
    if [[ -f "${PROJECT_ROOT}/.last-coverage.txt" ]]; then
        previous_coverage=$(cat "${PROJECT_ROOT}/.last-coverage.txt" 2>/dev/null || echo "0")
    fi
    
    local trend="stable"
    if [[ $(echo "$current_coverage > $previous_coverage" | bc 2>/dev/null || echo "0") -eq 1 ]]; then
        trend="increasing"
    elif [[ $(echo "$current_coverage < $previous_coverage" | bc 2>/dev/null || echo "0") -eq 1 ]]; then
        trend="decreasing"
    fi
    
    cat > "$trend_file" << EOF
{
  "current": ${current_coverage},
  "previous": ${previous_coverage},
  "trend": "${trend}",
  "change": $(echo "scale=2; $current_coverage - $previous_coverage" | bc 2>/dev/null || echo "0")
}
EOF
    
    # Save current coverage for next run
    echo "$current_coverage" > "${PROJECT_ROOT}/.last-coverage.txt"
    
    REPORT_ARTIFACTS["trend_data"]="$trend_file"
}

# Generates coverage badges for CI/CD integration
generate_ci_coverage_badges() {
    local lines_pct="${COVERAGE_METRICS[lines_pct]:-0}"
    local badge_color="red"
    local status_text="failing"
    
    if [[ "$THRESHOLD_VALIDATION_SUCCESS" == "true" ]]; then
        badge_color="brightgreen"
        status_text="passing"
    elif [[ $(echo "$lines_pct >= 80" | bc 2>/dev/null || echo "0") -eq 1 ]]; then
        badge_color="yellow"
        status_text="partial"
    fi
    
    # Generate Shields.io compatible badge data
    local badge_file="${OUTPUT_DIRECTORY}/coverage-badge-shields.json"
    cat > "$badge_file" << EOF
{
  "schemaVersion": 1,
  "label": "coverage",
  "message": "${lines_pct}%",
  "color": "${badge_color}"
}
EOF
    
    # Generate simple status badge
    local status_badge="${OUTPUT_DIRECTORY}/quality-gate-badge.json"
    cat > "$status_badge" << EOF
{
  "schemaVersion": 1,
  "label": "quality gate",
  "message": "${status_text}",
  "color": "${badge_color}"
}
EOF
    
    REPORT_ARTIFACTS["shields_badge"]="$badge_file"
    REPORT_ARTIFACTS["quality_badge"]="$status_badge"
}

# Generates CI/CD recommendations in JSON format
generate_ci_recommendations() {
    local recommendations_file="$1"
    local recommendations=()
    
    if [[ "${THRESHOLD_COMPLIANCE[lines]}" == "fail" ]]; then
        recommendations+=("\"Add unit tests to increase line coverage above ${COVERAGE_THRESHOLD}%\"")
    fi
    
    if [[ "${THRESHOLD_COMPLIANCE[functions]}" == "fail" ]]; then
        recommendations+=("\"Test all functions to achieve 100% function coverage\"")
    fi
    
    if [[ "${THRESHOLD_COMPLIANCE[branches]}" == "fail" ]]; then
        recommendations+=("\"Add tests for conditional branches to reach 90% branch coverage\"")
    fi
    
    if [[ "${THRESHOLD_COMPLIANCE[statements]}" == "fail" ]]; then
        recommendations+=("\"Increase statement coverage by testing all code paths\"")
    fi
    
    if [[ ${#recommendations[@]} -eq 0 ]]; then
        recommendations+=("\"Excellent coverage! Maintain current quality standards.\"")
    fi
    
    cat > "$recommendations_file" << EOF
{
  "recommendations": [
$(IFS=$',\n    '; echo "    ${recommendations[*]}")
  ],
  "priority": "$([ "$THRESHOLD_VALIDATION_SUCCESS" == "true" ] && echo "low" || echo "high")"
}
EOF
    
    REPORT_ARTIFACTS["recommendations"]="$recommendations_file"
}

# =============================================================================
# SIGNAL HANDLERS AND CLEANUP
# =============================================================================

# Handles script termination signals gracefully, performing cleanup operations
# and displaying termination information with coverage context
handle_coverage_termination() {
    local signal="${1:-UNKNOWN}"
    
    # Capture termination signal (SIGINT, SIGTERM) for graceful shutdown
    log_coverage_message "warn" "Received termination signal: ${signal}" "termination"
    
    # Display termination message with signal information and coverage context
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}🛑 Coverage collection terminated by signal: ${signal}${COLOR_RESET}"
    
    # Kill any running Jest processes to prevent orphaned processes
    if pgrep -f "jest.*--coverage" > /dev/null; then
        log_coverage_message "info" "Terminating running Jest coverage processes" "termination"
        pkill -f "jest.*--coverage" || true
    fi
    
    # Perform cleanup of temporary coverage artifacts
    cleanup_coverage_artifacts "false"
    
    # Display coverage session summary if coverage was being collected
    if [[ -n "$COVERAGE_START_TIME" ]]; then
        echo ""
        echo -e "${COLOR_BOLD}Coverage session summary:${COLOR_RESET}"
        echo "• Started: $(date -d @$((COVERAGE_START_TIME / 1000000000)) +'%H:%M:%S' 2>/dev/null || echo "Unknown")"
        echo "• Signal: ${signal}"
        echo "• Status: Interrupted"
        echo "• Partial results may be available in: ${OUTPUT_DIRECTORY}"
    fi
    
    # Provide educational information about signal handling in coverage collection
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}📚 Coverage Collection Signal Handling:${COLOR_RESET}"
    echo "• SIGINT (Ctrl+C): Interrupt coverage collection gracefully"
    echo "• SIGTERM: Termination request - cleanup coverage artifacts"
    echo "• Coverage data preservation ensures partial results are not lost"
    echo "• Re-run coverage collection to complete the analysis"
    
    # Reset terminal formatting and cursor position
    echo -e "${COLOR_RESET}"
    
    # Exit script with appropriate status code based on coverage results
    local exit_code=130  # Standard exit code for script termination by signal
    if [[ "$signal" == "SIGTERM" ]]; then
        exit_code=143
    fi
    
    exit $exit_code
}

# Set up signal handlers for graceful termination
trap 'handle_coverage_termination "SIGINT"' SIGINT
trap 'handle_coverage_termination "SIGTERM"' SIGTERM

# =============================================================================
# MAIN EXECUTION FUNCTION
# =============================================================================

# Main coverage execution orchestration function that coordinates all coverage phases
coverage_main() {
    # Initialize script environment and capture coverage execution start timestamp
    local script_start=$(date +%s)
    
    # Display educational coverage banner with Jest and Node.js version information
    print_coverage_banner
    
    # Parse command-line arguments to configure coverage execution mode and options
    if ! parse_coverage_arguments "$@"; then
        log_coverage_message "error" "Failed to parse command line arguments"
        exit 1
    fi
    
    # Initialize coverage collection environment including Node.js validation and Jest setup
    if ! setup_coverage_environment; then
        log_coverage_message "error" "Coverage environment setup failed"
        exit 1
    fi
    
    # Execute comprehensive coverage collection with Jest testing framework
    if execute_coverage_collection "{}"; then
        # Coverage collection successful
        COVERAGE_COLLECTION_SUCCESS=true
        log_coverage_message "success" "Coverage collection completed successfully" "main"
    else
        # Coverage collection failed - capture exit code but continue to generate reports
        log_coverage_message "warn" "Coverage collection encountered issues - generating available reports" "main"
    fi
    
    # Generate comprehensive coverage reports in multiple formats if coverage data exists
    if [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" || -f "${OUTPUT_DIRECTORY}/coverage-summary.json" ]]; then
        if ! generate_coverage_reports "{}"; then
            log_coverage_message "warn" "Coverage report generation encountered issues" "main"
        fi
    fi
    
    # Validate coverage against quality thresholds and generate compliance reports
    if [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" ]]; then
        if ! validate_coverage_thresholds "{}"; then
            log_coverage_message "error" "Coverage threshold validation failed - quality gate not met" "main"
            JEST_EXIT_CODE=2  # Coverage threshold failure exit code
        fi
    fi
    
    # Generate CI/CD integration reports and artifacts if CI mode enabled
    if [[ "$CI_MODE" == "true" ]]; then
        generate_ci_cd_reports "{}"
    fi
    
    # Display comprehensive coverage summary with results and educational insights
    display_coverage_summary
    
    # Cleanup coverage artifacts while preserving important reports for CI/CD
    cleanup_coverage_artifacts "true"
    
    # Calculate total script execution time
    local script_end=$(date +%s)
    local total_duration=$((script_end - script_start))
    
    # Final execution summary with timing
    echo ""
    log_coverage_message "info" "Coverage script execution completed in ${total_duration} seconds" "summary"
    
    # Exit with appropriate status code based on coverage collection and threshold validation
    if [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" && "$THRESHOLD_VALIDATION_SUCCESS" != "false" ]]; then
        exit 0
    else
        exit ${JEST_EXIT_CODE:-1}
    fi
}

# Displays comprehensive coverage execution summary including results, metrics,
# and educational insights for learning and improvement
display_coverage_summary() {
    # Skip detailed summary if quiet mode is enabled for CI/CD optimization
    if [[ "$QUIET_MODE" == "true" ]]; then
        return 0
    fi
    
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}📊 Coverage Collection Summary${COLOR_RESET}"
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════════════════════════════${COLOR_RESET}"
    
    # Display coverage execution statistics with color-coded results
    local execution_time="${COVERAGE_RESULTS[execution_time]:-0}"
    local jest_exit_code="${COVERAGE_RESULTS[jest_exit_code]:-0}"
    
    if [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" ]]; then
        echo -e "${COLOR_GREEN}${COLOR_BOLD}✅ COVERAGE STATUS: COLLECTED${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}${COLOR_BOLD}❌ COVERAGE STATUS: FAILED${COLOR_RESET}"
    fi
    
    if [[ "$THRESHOLD_VALIDATION_SUCCESS" == "true" ]]; then
        echo -e "${COLOR_GREEN}${COLOR_BOLD}✅ QUALITY GATE: PASSED${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}${COLOR_BOLD}❌ QUALITY GATE: FAILED${COLOR_RESET}"
    fi
    
    # Show coverage timing information and performance metrics
    echo -e "${COLOR_BOLD}⏱️  Execution Time:${COLOR_RESET} ${execution_time}ms"
    echo -e "${COLOR_BOLD}🔢 Jest Exit Code:${COLOR_RESET} ${jest_exit_code}"
    echo -e "${COLOR_BOLD}📁 Output Directory:${COLOR_RESET} ${OUTPUT_DIRECTORY}"
    echo -e "${COLOR_BOLD}⚙️  Configuration:${COLOR_RESET} Jest 29.7.0 with Node.js $(node --version)"
    
    # Display detailed coverage metrics if available
    if [[ -n "${COVERAGE_METRICS[lines_pct]}" ]]; then
        echo ""
        echo -e "${COLOR_BOLD}📈 Coverage Metrics:${COLOR_RESET}"
        
        # Display each metric with color coding based on threshold compliance
        local lines_color="${COLOR_GREEN}"
        local functions_color="${COLOR_GREEN}"
        local branches_color="${COLOR_GREEN}"
        local statements_color="${COLOR_GREEN}"
        
        if [[ "${THRESHOLD_COMPLIANCE[lines]}" == "fail" ]]; then lines_color="${COLOR_RED}"; fi
        if [[ "${THRESHOLD_COMPLIANCE[functions]}" == "fail" ]]; then functions_color="${COLOR_RED}"; fi
        if [[ "${THRESHOLD_COMPLIANCE[branches]}" == "fail" ]]; then branches_color="${COLOR_RED}"; fi
        if [[ "${THRESHOLD_COMPLIANCE[statements]}" == "fail" ]]; then statements_color="${COLOR_RED}"; fi
        
        echo -e "   ${lines_color}Lines:${COLOR_RESET} ${COVERAGE_METRICS[lines_pct]}% (threshold: ${COVERAGE_THRESHOLD}%)"
        echo -e "   ${functions_color}Functions:${COLOR_RESET} ${COVERAGE_METRICS[functions_pct]}% (threshold: 100%)"
        echo -e "   ${branches_color}Branches:${COLOR_RESET} ${COVERAGE_METRICS[branches_pct]}% (threshold: 90%)"
        echo -e "   ${statements_color}Statements:${COLOR_RESET} ${COVERAGE_METRICS[statements_pct]}% (threshold: ${COVERAGE_THRESHOLD}%)"
    fi
    
    # Display generated report artifacts with file paths
    if [[ ${#REPORT_ARTIFACTS[@]} -gt 0 ]]; then
        echo ""
        echo -e "${COLOR_BOLD}📄 Generated Reports:${COLOR_RESET}"
        
        for artifact_type in "${!REPORT_ARTIFACTS[@]}"; do
            local file_path="${REPORT_ARTIFACTS[$artifact_type]}"
            if [[ -f "$file_path" ]]; then
                echo -e "   ${COLOR_GREEN}✅${COLOR_RESET} ${artifact_type}: ${file_path}"
            else
                echo -e "   ${COLOR_YELLOW}⚠${COLOR_RESET} ${artifact_type}: ${file_path} (not found)"
            fi
        done
        
        # Highlight the main HTML report for interactive analysis
        if [[ -f "${OUTPUT_DIRECTORY}/lcov-report/index.html" ]]; then
            echo ""
            echo -e "${COLOR_BOLD}🌐 Interactive Coverage Report:${COLOR_RESET}"
            echo "   Open file://${OUTPUT_DIRECTORY}/lcov-report/index.html in your browser"
        fi
    fi
    
    # Include educational insights about coverage analysis and testing best practices
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}🎓 Educational Insights:${COLOR_RESET}"
    echo ""
    echo "✨ ${COLOR_BOLD}Coverage Collection Best Practices:${COLOR_RESET}"
    echo "   • Jest 29.7.0 built-in coverage provides accurate code analysis"
    echo "   • Multiple report formats serve different analysis and integration needs"
    echo "   • Quality gates ensure consistent code quality across development lifecycle"
    echo "   • Coverage trends help track code quality improvements over time"
    
    if [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" && "$THRESHOLD_VALIDATION_SUCCESS" == "true" ]]; then
        echo ""
        echo "🚀 ${COLOR_BOLD}Excellent Coverage Achievement!${COLOR_RESET}"
        echo "   • All quality thresholds met successfully"
        echo "   • Coverage reports demonstrate comprehensive testing"
        echo "   • Continue maintaining high coverage standards in future development"
    elif [[ "$COVERAGE_COLLECTION_SUCCESS" == "true" ]]; then
        echo ""
        echo "📈 ${COLOR_BOLD}Coverage Improvement Opportunities:${COLOR_RESET}"
        echo "   • Review failing thresholds in the metrics above"
        echo "   • Open HTML coverage report for detailed file-by-file analysis"
        echo "   • Focus on testing uncovered lines, functions, and branches"
        echo "   • Consider edge cases and error handling in your test suite"
    fi
    
    echo ""
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════════════════════════════${COLOR_RESET}"
}

# Export main coverage function and results for CI/CD integration and external use
coverage_execution_flow() {
    coverage_main "$@"
}

# Initialize coverage results object for external access
coverage_results() {
    declare -A results
    results["coverage_summary"]="${COVERAGE_METRICS[*]}"
    results["threshold_compliance"]="$THRESHOLD_VALIDATION_SUCCESS"
    results["report_locations"]="${!REPORT_ARTIFACTS[*]}"
    
    # Return results as JSON-like structure (simplified for bash)
    echo "coverage_summary=${COVERAGE_METRICS[*]}"
    echo "threshold_compliance=$THRESHOLD_VALIDATION_SUCCESS"
    echo "report_locations=${!REPORT_ARTIFACTS[*]}"
}

# =============================================================================
# SCRIPT ENTRY POINT
# =============================================================================

# Execute main coverage function with all command line arguments if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    coverage_main "$@"
fi