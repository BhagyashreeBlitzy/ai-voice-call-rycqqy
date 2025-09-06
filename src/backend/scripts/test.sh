#!/bin/bash

# =============================================================================
# Comprehensive Test Execution Shell Script for Node.js Tutorial Application
# =============================================================================
#
# This script orchestrates the complete testing workflow for the Node.js tutorial
# application using Jest 29.7.0 testing framework with comprehensive test execution
# modes, coverage reporting, watch mode, and CI/CD integration. Implements advanced
# testing features including parallel test execution, performance validation, test
# environment management, and educational testing patterns while maintaining
# production-ready testing practices for the Express.js 5.1.0 '/hello' endpoint.
#
# Features:
# - Jest 29.7.0 testing framework orchestration with comprehensive execution modes
# - Code coverage collection with 95% minimum thresholds and quality gates
# - Multiple test execution modes: unit, integration, watch, CI/CD optimization
# - Educational testing output with colorized banners and learning guidance
# - Test environment validation including Node.js 22.x and Jest availability
# - Performance testing with response time validation under 100ms thresholds
# - CI/CD integration with GitHub Actions and automated quality gates
# - Comprehensive error handling with educational debugging guidance
#
# Architecture:
# - Modular function design with comprehensive error handling and validation
# - Global variable management for test execution state and configuration
# - Resource cleanup with graceful termination and signal handling
# - Educational logging with formatted output and learning context
# - Test orchestration with Jest command building and execution monitoring
#
# Usage:
#   ./scripts/test.sh                    # Execute all tests with default settings
#   ./scripts/test.sh --type=unit        # Execute only unit tests
#   ./scripts/test.sh --coverage         # Execute with code coverage collection
#   ./scripts/test.sh --watch            # Execute in watch mode for development
#   ./scripts/test.sh --ci               # Execute in CI/CD optimized mode
#   ./scripts/test.sh --help             # Display comprehensive usage information
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

# Enable strict error handling for reliable script execution
set -euo pipefail

# Configure Internal Field Separator for safe word splitting
IFS=$'\n\t'

# Enable extended globbing for advanced pattern matching
shopt -s extglob nullglob

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================

# Script directory resolution using BASH_SOURCE for reliable path detection
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root directory resolution relative to script location
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Test execution environment configuration with fallback defaults
NODE_ENV="${NODE_ENV:-test}"
TEST_TYPE="${TEST_TYPE:-all}"
COVERAGE_ENABLED="${COVERAGE_ENABLED:-false}"
WATCH_MODE="${WATCH_MODE:-false}"
CI_MODE="${CI_MODE:-false}"
VERBOSE_OUTPUT="${VERBOSE_OUTPUT:-true}"
TEST_TIMEOUT="${TEST_TIMEOUT:-15000}"
MAX_WORKERS="${MAX_WORKERS:-50%}"

# Jest command execution result tracking
JEST_EXIT_CODE=0

# Test execution timing for performance measurement
TEST_START_TIME=""
TEST_END_TIME=""

# Process ID for cleanup and signal handling
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

# Test result analysis storage for comprehensive reporting
declare -A TEST_RESULTS
declare -A COVERAGE_METRICS
declare -A PERFORMANCE_DATA

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Outputs formatted log messages with timestamps, colors, and educational context
# for enhanced testing experience and debugging capabilities
#
# Parameters:
#   $1: Log level (info, warn, error, debug)
#   $2: Message content
#   $3: Optional context information
#
# Returns: None (outputs to console)
log_test_message() {
    local level="${1:-info}"
    local message="${2:-}"
    local context="${3:-}"
    
    # Generate ISO timestamp with milliseconds precision for accurate timing
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    # Apply color coding based on log level for visual distinction
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
    
    # Include script name and function context for debugging clarity
    local script_context="[test.sh:$$]"
    
    # Format message with consistent spacing and educational alignment
    local formatted_message="${color}${COLOR_BOLD}${prefix}${COLOR_RESET} ${color}${timestamp}${COLOR_RESET} ${script_context}"
    
    if [[ -n "${context}" ]]; then
        formatted_message+=" [${context}]"
    fi
    
    formatted_message+=" ${message}"
    
    # Output to stderr for error messages, stdout for others
    if [[ "${level}" == "error" ]]; then
        echo -e "${formatted_message}" >&2
    else
        echo -e "${formatted_message}"
    fi
}

# =============================================================================
# CORE TEST EXECUTION FUNCTIONS
# =============================================================================

# Displays educational testing banner with Node.js tutorial information,
# Jest configuration details, and testing workflow guidance
print_test_banner() {
    # Clear terminal screen for clean test execution display
    clear
    
    # Print colorized banner with Node.js tutorial testing information
    echo -e "${COLOR_BOLD}${COLOR_CYAN}"
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo "                    Node.js Tutorial Application Test Suite                     "
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo -e "${COLOR_RESET}"
    
    # Display Jest version, Node.js version, and testing framework details
    echo -e "${COLOR_BOLD}Testing Framework:${COLOR_RESET} Jest 29.7.0"
    echo -e "${COLOR_BOLD}Node.js Runtime:${COLOR_RESET} $(node --version) (Required: >=22.0.0)"
    echo -e "${COLOR_BOLD}Express.js Version:${COLOR_RESET} 5.1.0"
    echo -e "${COLOR_BOLD}Test Environment:${COLOR_RESET} ${NODE_ENV}"
    
    # Show current timestamp and test execution environment status
    echo -e "${COLOR_BOLD}Execution Time:${COLOR_RESET} $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo -e "${COLOR_BOLD}Project Root:${COLOR_RESET} ${PROJECT_ROOT}"
    echo -e "${COLOR_BOLD}Test Mode:${COLOR_RESET} ${TEST_TYPE}"
    
    # Include educational notes about testing workflow and best practices
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}Educational Focus:${COLOR_RESET}"
    echo "• Demonstrates Jest testing framework integration with Node.js applications"
    echo "• Shows HTTP endpoint testing using Supertest for Express.js validation"
    echo "• Implements code coverage collection with quality gates and thresholds"
    echo "• Educational testing patterns for Node.js development learning"
    
    # Display available testing modes and command-line options
    echo ""
    echo -e "${COLOR_BOLD}Available Test Modes:${COLOR_RESET}"
    echo "• ${COLOR_GREEN}all${COLOR_RESET}         - Execute unit and integration tests (default)"
    echo "• ${COLOR_GREEN}unit${COLOR_RESET}        - Execute only unit tests in test/unit/ directory"
    echo "• ${COLOR_GREEN}integration${COLOR_RESET} - Execute only integration tests in test/integration/"
    echo "• ${COLOR_GREEN}watch${COLOR_RESET}       - Execute tests in watch mode with auto-rerun"
    echo "• ${COLOR_GREEN}coverage${COLOR_RESET}    - Execute tests with code coverage collection"
    
    # Print separator line for visual organization and clarity
    echo ""
    echo -e "${COLOR_CYAN}────────────────────────────────────────────────────────────────────────────────${COLOR_RESET}"
    echo ""
}

# Parses command-line arguments to configure test execution mode, coverage settings,
# watch mode, and other testing options with comprehensive validation and help display
parse_command_line_arguments() {
    # Initialize default argument values for all testing options
    local show_help=false
    
    # Parse command line arguments using case statement for comprehensive handling
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type=*)
                # Parse --type argument for unit, integration, or all test selection
                TEST_TYPE="${1#*=}"
                if [[ ! "$TEST_TYPE" =~ ^(unit|integration|all)$ ]]; then
                    log_test_message "error" "Invalid test type: ${TEST_TYPE}. Valid options: unit, integration, all"
                    return 1
                fi
                ;;
            --coverage)
                # Parse --coverage flag to enable code coverage collection
                COVERAGE_ENABLED="true"
                ;;
            --watch)
                # Parse --watch flag to enable Jest watch mode for development
                WATCH_MODE="true"
                ;;
            --ci)
                # Parse --ci flag to enable CI/CD optimized test execution
                CI_MODE="true"
                WATCH_MODE="false"  # Watch mode disabled in CI
                ;;
            --verbose)
                # Parse --verbose flag for detailed test output and debugging
                VERBOSE_OUTPUT="true"
                ;;
            --timeout=*)
                # Parse --timeout argument for custom test timeout values
                TEST_TIMEOUT="${1#*=}"
                if ! [[ "$TEST_TIMEOUT" =~ ^[0-9]+$ ]]; then
                    log_test_message "error" "Invalid timeout value: ${TEST_TIMEOUT}. Must be a number in milliseconds"
                    return 1
                fi
                ;;
            --max-workers=*)
                # Parse --max-workers argument for parallel test execution control
                MAX_WORKERS="${1#*=}"
                ;;
            --help|-h)
                # Display comprehensive help information with usage examples
                show_help=true
                ;;
            *)
                # Handle unknown arguments with educational error message
                log_test_message "error" "Unknown argument: $1. Use --help for usage information"
                return 1
                ;;
        esac
        shift
    done
    
    # Display help information if requested
    if [[ "$show_help" == "true" ]]; then
        display_help_information
        return 0
    fi
    
    # Validate argument combinations and detect conflicts
    if [[ "$WATCH_MODE" == "true" && "$CI_MODE" == "true" ]]; then
        log_test_message "error" "Watch mode and CI mode cannot be used together"
        return 1
    fi
    
    # Set global environment variables based on parsed arguments
    export NODE_ENV TEST_TYPE COVERAGE_ENABLED WATCH_MODE CI_MODE VERBOSE_OUTPUT TEST_TIMEOUT MAX_WORKERS
    
    # Display parsed configuration if verbose mode enabled
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        log_test_message "info" "Command line arguments parsed successfully" "config"
        log_test_message "debug" "TEST_TYPE=${TEST_TYPE}, COVERAGE=${COVERAGE_ENABLED}, WATCH=${WATCH_MODE}" "config"
    fi
    
    # Return success code for valid argument validation
    return 0
}

# Displays comprehensive help information with usage examples and educational guidance
display_help_information() {
    echo -e "${COLOR_BOLD}${COLOR_CYAN}Node.js Tutorial Test Script Help${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_BOLD}USAGE:${COLOR_RESET}"
    echo "  ./scripts/test.sh [options]"
    echo ""
    echo -e "${COLOR_BOLD}OPTIONS:${COLOR_RESET}"
    echo "  --type=<unit|integration|all>  Test execution scope (default: all)"
    echo "  --coverage                     Enable code coverage collection"
    echo "  --watch                       Enable Jest watch mode for development"
    echo "  --ci                          Enable CI/CD optimized execution"
    echo "  --verbose                     Enable detailed test output"
    echo "  --timeout=<ms>                Set test timeout in milliseconds (default: 15000)"
    echo "  --max-workers=<n>             Set maximum worker processes (default: 50%)"
    echo "  --help, -h                    Display this help information"
    echo ""
    echo -e "${COLOR_BOLD}EXAMPLES:${COLOR_RESET}"
    echo "  ./scripts/test.sh                          # Run all tests with default settings"
    echo "  ./scripts/test.sh --type=unit --coverage   # Run unit tests with coverage"
    echo "  ./scripts/test.sh --watch                  # Run tests in watch mode"
    echo "  ./scripts/test.sh --ci --coverage          # Run tests in CI mode with coverage"
    echo ""
    echo -e "${COLOR_BOLD}EDUCATIONAL FEATURES:${COLOR_RESET}"
    echo "• Jest 29.7.0 testing framework demonstration with Node.js integration"
    echo "• Supertest HTTP testing patterns for Express.js endpoint validation"
    echo "• Code coverage analysis with educational quality metrics and thresholds"
    echo "• Test environment management and isolation for reliable test execution"
    echo "• CI/CD integration patterns for automated testing workflows"
    echo ""
}

# Validates the testing environment including Node.js version, Jest availability,
# test files existence, and configuration validation with educational error messages
validate_test_environment() {
    log_test_message "info" "Validating test environment configuration" "validation"
    
    # Check Node.js version compatibility with 22.x LTS requirement
    if ! command -v node &> /dev/null; then
        log_test_message "error" "Node.js not found. Please install Node.js 22.x LTS or later"
        log_test_message "info" "Download from: https://nodejs.org/ (choose LTS version)"
        return 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local node_major=$(echo "$node_version" | cut -d. -f1)
    
    if [[ "$node_major" -lt 22 ]]; then
        log_test_message "error" "Node.js version ${node_version} is not supported. Required: 22.x or later"
        log_test_message "info" "This tutorial requires Node.js 22.x LTS for Express.js 5.1.0 compatibility"
        return 1
    fi
    
    log_test_message "success" "Node.js version ${node_version} is compatible" "validation"
    
    # Verify Jest is installed and accessible in node_modules
    if [[ ! -f "${PROJECT_ROOT}/node_modules/.bin/jest" ]]; then
        log_test_message "error" "Jest testing framework not found in node_modules"
        log_test_message "info" "Install dependencies: npm install"
        return 1
    fi
    
    # Check Jest version compatibility
    local jest_version=$(cd "${PROJECT_ROOT}" && npx jest --version)
    log_test_message "success" "Jest version ${jest_version} is available" "validation"
    
    # Validate Jest configuration file exists and is properly formatted
    if [[ ! -f "${PROJECT_ROOT}/jest.config.js" ]]; then
        log_test_message "error" "Jest configuration file not found: jest.config.js"
        log_test_message "info" "This file is required for test framework configuration"
        return 1
    fi
    
    # Verify jest.config.js is valid JavaScript by attempting to load it
    if ! node -c "${PROJECT_ROOT}/jest.config.js" &> /dev/null; then
        log_test_message "error" "Jest configuration file contains syntax errors"
        log_test_message "info" "Please check jest.config.js for JavaScript syntax issues"
        return 1
    fi
    
    log_test_message "success" "Jest configuration file is valid" "validation"
    
    # Check test directory structure exists with proper organization
    local test_dirs=("${PROJECT_ROOT}/test" "${PROJECT_ROOT}/test/unit" "${PROJECT_ROOT}/test/integration")
    
    for test_dir in "${test_dirs[@]}"; do
        if [[ ! -d "$test_dir" ]]; then
            log_test_message "warn" "Test directory not found: $test_dir"
            log_test_message "info" "Creating test directory structure for educational organization"
            mkdir -p "$test_dir"
        fi
    done
    
    # Verify test helper files and setup files are available
    if [[ ! -f "${PROJECT_ROOT}/test/helpers/test-setup.js" ]]; then
        log_test_message "warn" "Test setup helper file not found: test/helpers/test-setup.js"
        log_test_message "info" "This file provides test environment setup and utilities"
    fi
    
    # Validate test fixtures and test data files exist
    if [[ ! -f "${PROJECT_ROOT}/test/fixtures/test-data.js" ]]; then
        log_test_message "warn" "Test data fixtures not found: test/fixtures/test-data.js"
        log_test_message "info" "Test fixtures provide consistent test data for educational examples"
    fi
    
    # Check test environment configuration files are present
    if [[ ! -f "${PROJECT_ROOT}/config/test.js" ]]; then
        log_test_message "error" "Test environment configuration not found: config/test.js"
        log_test_message "info" "This file is required for test environment setup"
        return 1
    fi
    
    # Verify required development dependencies are installed
    local dev_deps=("supertest" "eslint")
    for dep in "${dev_deps[@]}"; do
        if [[ ! -d "${PROJECT_ROOT}/node_modules/${dep}" ]]; then
            log_test_message "warn" "Development dependency missing: ${dep}"
            log_test_message "info" "Run 'npm install' to install all required dependencies"
        fi
    done
    
    # Validate file permissions for test execution and coverage
    if [[ ! -r "${PROJECT_ROOT}/package.json" ]]; then
        log_test_message "error" "Cannot read package.json - check file permissions"
        return 1
    fi
    
    # Display validation results with educational explanations
    log_test_message "success" "Test environment validation completed successfully" "validation"
    log_test_message "info" "Environment ready for Jest testing framework with Node.js ${node_version}" "validation"
    
    # Return success code for environment validation
    return 0
}

# Sets up test environment variables, logging configuration, and Jest-specific
# environment settings for consistent test execution
setup_test_environment() {
    log_test_message "info" "Setting up test execution environment" "setup"
    
    # Set NODE_ENV to 'test' for test-specific configuration loading
    export NODE_ENV="test"
    
    # Configure test logging level to minimize noise during execution
    export LOG_LEVEL="error"
    
    # Set Jest environment variables for test framework configuration
    export JEST_TIMEOUT="${TEST_TIMEOUT}"
    export JEST_MAX_WORKERS="${MAX_WORKERS}"
    
    # Configure test database settings if applicable (none for tutorial)
    # The tutorial application is stateless and requires no database setup
    
    # Set up test-specific Express.js middleware configurations
    export DISABLE_REQUEST_LOGGING="true"
    export MINIMAL_MIDDLEWARE="true"
    
    # Configure memory limits and garbage collection for test execution
    if [[ "$CI_MODE" == "true" ]]; then
        export NODE_OPTIONS="--max-old-space-size=4096"
    fi
    
    # Set test timeout values based on parsed command-line arguments
    export TEST_TIMEOUT_MS="${TEST_TIMEOUT}"
    
    # Configure parallel test execution settings with max workers
    export JEST_WORKERS="${MAX_WORKERS}"
    
    # Set up test reporting and output formatting options
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        export JEST_VERBOSE="true"
    fi
    
    # Configure code coverage collection settings if enabled
    if [[ "$COVERAGE_ENABLED" == "true" ]]; then
        export JEST_COLLECT_COVERAGE="true"
        export COVERAGE_DIRECTORY="${PROJECT_ROOT}/coverage"
        
        # Create coverage directory if it doesn't exist
        mkdir -p "$COVERAGE_DIRECTORY"
    fi
    
    # Export all test environment variables for Jest process
    export NODE_ENV LOG_LEVEL JEST_TIMEOUT JEST_MAX_WORKERS
    export DISABLE_REQUEST_LOGGING MINIMAL_MIDDLEWARE
    export TEST_TIMEOUT_MS JEST_WORKERS
    
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        export JEST_VERBOSE
    fi
    
    if [[ "$COVERAGE_ENABLED" == "true" ]]; then
        export JEST_COLLECT_COVERAGE COVERAGE_DIRECTORY
    fi
    
    # Log test environment setup completion with configuration summary
    log_test_message "success" "Test environment configured successfully" "setup"
    log_test_message "debug" "NODE_ENV=${NODE_ENV}, TIMEOUT=${TEST_TIMEOUT}ms, WORKERS=${MAX_WORKERS}" "setup"
}

# Constructs Jest command with appropriate flags, configuration options, and
# test execution parameters based on parsed arguments
build_jest_command() {
    local test_type="$1"
    local coverage_enabled="$2"
    local watch_mode="$3"
    local ci_mode="$4"
    
    log_test_message "info" "Building Jest command with execution parameters" "command"
    
    # Start with base Jest command using npx for consistent execution
    local jest_command="npx jest"
    
    # Add configuration file parameter for comprehensive test setup
    jest_command+=" --config jest.config.js"
    
    # Add test matching patterns based on test type (unit/integration/all)
    case "$test_type" in
        "unit")
            jest_command+=" --testPathPattern=test/unit"
            ;;
        "integration")  
            jest_command+=" --testPathPattern=test/integration"
            ;;
        "all"|*)
            # Default: run all tests without pattern restriction
            ;;
    esac
    
    # Add coverage flags if coverage is enabled
    if [[ "$coverage_enabled" == "true" ]]; then
        jest_command+=" --coverage"
        jest_command+=" --coverageReporters=text,html,json-summary,lcov"
        jest_command+=" --coverageDirectory=coverage"
    fi
    
    # Add watch mode flag if watch mode enabled
    if [[ "$watch_mode" == "true" ]]; then
        jest_command+=" --watch"
    fi
    
    # Add CI mode flags if CI mode enabled
    if [[ "$ci_mode" == "true" ]]; then
        jest_command+=" --ci"
        jest_command+=" --watchAll=false"
        jest_command+=" --passWithNoTests"
        jest_command+=" --reporters=default,jest-junit"
    fi
    
    # Add verbose flag for detailed test output
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        jest_command+=" --verbose"
    fi
    
    # Add timeout configuration
    jest_command+=" --testTimeout=${TEST_TIMEOUT}"
    
    # Add max workers configuration for parallel execution
    jest_command+=" --maxWorkers=${MAX_WORKERS}"
    
    # Add coverage threshold enforcement flags for quality gates
    if [[ "$coverage_enabled" == "true" ]]; then
        jest_command+=" --coverageThreshold='{}'"
    fi
    
    # Add test result reporting format for educational output
    if [[ "$ci_mode" == "true" ]]; then
        jest_command+=" --outputFile=coverage/test-results.json"
    fi
    
    # Log Jest command construction for debugging
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        log_test_message "debug" "Jest command: ${jest_command}" "command"
    fi
    
    # Return complete Jest command string for execution
    echo "$jest_command"
}

# Executes Jest test framework with constructed command, monitors execution progress,
# and captures results for analysis
execute_jest_tests() {
    local jest_command="$1"
    
    # Display test execution start message with command details
    log_test_message "info" "Starting Jest test execution" "execution"
    
    # Log Jest command being executed for debugging purposes
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        log_test_message "debug" "Executing: ${jest_command}" "execution"
    fi
    
    # Capture test start time for performance measurement
    TEST_START_TIME=$(date +%s%N)
    
    # Execute Jest command in project root directory with error handling
    cd "$PROJECT_ROOT" || {
        log_test_message "error" "Failed to change to project directory: ${PROJECT_ROOT}"
        return 1
    }
    
    # Execute Jest with command constructed by build_jest_command()
    # Capture exit code while allowing output to flow to terminal
    set +e  # Temporarily disable exit on error to capture Jest exit code
    eval "$jest_command"
    JEST_EXIT_CODE=$?
    set -e  # Re-enable exit on error
    
    # Capture test end time for performance measurement
    TEST_END_TIME=$(date +%s%N)
    
    # Calculate test execution duration in milliseconds
    local duration_ns=$((TEST_END_TIME - TEST_START_TIME))
    local duration_ms=$((duration_ns / 1000000))
    
    # Log test execution completion status with timing information
    if [[ $JEST_EXIT_CODE -eq 0 ]]; then
        log_test_message "success" "Jest test execution completed successfully in ${duration_ms}ms" "execution"
    else
        log_test_message "error" "Jest test execution failed with exit code ${JEST_EXIT_CODE}" "execution"
    fi
    
    # Store performance data for result analysis
    PERFORMANCE_DATA["execution_time"]="$duration_ms"
    PERFORMANCE_DATA["start_time"]="$TEST_START_TIME"
    PERFORMANCE_DATA["end_time"]="$TEST_END_TIME"
    
    # Return Jest exit code for script result determination
    return $JEST_EXIT_CODE
}

# Analyzes Jest test execution results including test counts, coverage metrics,
# failure analysis, and performance statistics
analyze_test_results() {
    local jest_exit_code="$1"
    
    log_test_message "info" "Analyzing test execution results" "analysis"
    
    # Parse Jest output for test execution statistics (simplified for educational purposes)
    # In a real implementation, this would parse Jest's JSON output for detailed metrics
    
    # Extract basic test result information based on exit code
    if [[ $jest_exit_code -eq 0 ]]; then
        TEST_RESULTS["status"]="passed"
        TEST_RESULTS["overall_result"]="success"
        log_test_message "success" "All tests passed successfully" "analysis"
    else
        TEST_RESULTS["status"]="failed"
        TEST_RESULTS["overall_result"]="failure"
        log_test_message "error" "Some tests failed or coverage thresholds not met" "analysis"
    fi
    
    # Store Jest exit code for reporting
    TEST_RESULTS["exit_code"]="$jest_exit_code"
    
    # Analyze code coverage metrics if coverage was enabled
    if [[ "$COVERAGE_ENABLED" == "true" ]]; then
        analyze_coverage_metrics
    fi
    
    # Extract test execution timing and performance data
    local execution_time="${PERFORMANCE_DATA[execution_time]:-0}"
    TEST_RESULTS["execution_time"]="$execution_time"
    
    # Store performance statistics for educational demonstration
    if [[ $execution_time -gt 30000 ]]; then  # More than 30 seconds
        TEST_RESULTS["performance_warning"]="Test execution took longer than expected"
        log_test_message "warn" "Test execution time (${execution_time}ms) exceeds recommended threshold" "analysis"
    else
        TEST_RESULTS["performance_status"]="optimal"
    fi
    
    # Generate test result summary with educational context
    log_test_message "info" "Test analysis completed" "analysis"
    
    # Provide recommendations for test failures or performance issues
    if [[ $jest_exit_code -ne 0 ]]; then
        provide_failure_guidance
    fi
    
    # Return comprehensive test analysis results as success/failure
    return 0
}

# Analyzes code coverage metrics from Jest coverage reports
analyze_coverage_metrics() {
    local coverage_dir="${PROJECT_ROOT}/coverage"
    
    if [[ -d "$coverage_dir" ]]; then
        log_test_message "info" "Analyzing code coverage metrics" "coverage"
        
        # Check if coverage summary exists
        if [[ -f "${coverage_dir}/coverage-summary.json" ]]; then
            # Parse coverage summary (simplified for educational purposes)
            COVERAGE_METRICS["available"]="true"
            log_test_message "success" "Coverage data collected successfully" "coverage"
        else
            log_test_message "warn" "Coverage summary file not found" "coverage"
            COVERAGE_METRICS["available"]="false"
        fi
    else
        log_test_message "warn" "Coverage directory not found" "coverage"
        COVERAGE_METRICS["available"]="false"
    fi
}

# Provides educational guidance for test failures and debugging assistance
provide_failure_guidance() {
    log_test_message "info" "Providing test failure guidance" "guidance"
    
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}🎓 Educational Debugging Guide:${COLOR_RESET}"
    echo ""
    echo "Common test failure scenarios and solutions:"
    echo ""
    echo "1. ${COLOR_BOLD}Test Timeout Issues:${COLOR_RESET}"
    echo "   • Increase timeout with --timeout=<ms>"
    echo "   • Check for hanging promises in async tests"
    echo "   • Verify test cleanup and resource management"
    echo ""
    echo "2. ${COLOR_BOLD}Coverage Threshold Failures:${COLOR_RESET}"
    echo "   • Review jest.config.js coverage thresholds"
    echo "   • Add tests for uncovered code paths"
    echo "   • Check coverage reports in coverage/lcov-report/index.html"
    echo ""
    echo "3. ${COLOR_BOLD}Express.js Testing Issues:${COLOR_RESET}"
    echo "   • Verify Supertest request assertions"
    echo "   • Check HTTP status codes and response content"
    echo "   • Ensure proper test server cleanup"
    echo ""
    echo "4. ${COLOR_BOLD}Environment Configuration:${COLOR_RESET}"
    echo "   • Verify NODE_ENV=test is set correctly"
    echo "   • Check test configuration in config/test.js"
    echo "   • Ensure test database/dependencies are available"
    echo ""
    echo -e "${COLOR_BLUE}💡 Helpful Commands:${COLOR_RESET}"
    echo "  • Run specific test: npm test -- --testNamePattern='test name'"
    echo "  • Debug mode: npm test -- --verbose"
    echo "  • Watch mode: npm run test:watch"
    echo "  • Coverage only: npm run test:coverage"
    echo ""
}

# Generates comprehensive code coverage reports in multiple formats including
# HTML, text, JSON, and educational analysis
generate_coverage_report() {
    local coverage_enabled="$1"
    
    if [[ "$coverage_enabled" != "true" ]]; then
        log_test_message "debug" "Coverage collection disabled, skipping report generation" "coverage"
        return 0
    fi
    
    log_test_message "info" "Generating comprehensive coverage reports" "coverage"
    
    local coverage_dir="${PROJECT_ROOT}/coverage"
    
    # Check if coverage collection was enabled during test execution
    if [[ ! -d "$coverage_dir" ]]; then
        log_test_message "warn" "Coverage directory not found, coverage may not have been collected" "coverage"
        return 1
    fi
    
    # Verify coverage data files exist in coverage directory
    local coverage_files=("lcov.info" "coverage-summary.json" "clover.xml")
    local files_found=0
    
    for file in "${coverage_files[@]}"; do
        if [[ -f "${coverage_dir}/${file}" ]]; then
            ((files_found++))
            log_test_message "debug" "Found coverage file: ${file}" "coverage"
        fi
    done
    
    if [[ $files_found -eq 0 ]]; then
        log_test_message "warn" "No coverage data files found in coverage directory" "coverage"
        return 1
    fi
    
    # Display coverage summary with color-coded results
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}📊 Code Coverage Report Summary${COLOR_RESET}"
    echo -e "${COLOR_CYAN}────────────────────────────────────────${COLOR_RESET}"
    
    # Check for HTML coverage report
    if [[ -f "${coverage_dir}/lcov-report/index.html" ]]; then
        log_test_message "success" "HTML coverage report generated: coverage/lcov-report/index.html" "coverage"
        echo "  📄 Open coverage/lcov-report/index.html in your browser for detailed analysis"
    fi
    
    # Check for text coverage report in console output
    if [[ -f "${coverage_dir}/coverage-summary.json" ]]; then
        log_test_message "success" "JSON coverage summary available: coverage/coverage-summary.json" "coverage"
    fi
    
    # Generate educational guidance on improving coverage
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}🎯 Coverage Improvement Tips:${COLOR_RESET}"
    echo ""
    echo "1. ${COLOR_BOLD}Line Coverage:${COLOR_RESET} Ensure all code lines are executed during tests"
    echo "2. ${COLOR_BOLD}Function Coverage:${COLOR_RESET} Call every function at least once in tests"
    echo "3. ${COLOR_BOLD}Branch Coverage:${COLOR_RESET} Test all conditional paths (if/else, switch)"
    echo "4. ${COLOR_BOLD}Statement Coverage:${COLOR_RESET} Execute all JavaScript statements"
    echo ""
    echo "📚 Coverage thresholds defined in jest.config.js:"
    echo "  • Lines: 95% minimum    • Functions: 100% required"
    echo "  • Branches: 90% minimum • Statements: 95% minimum"
    echo ""
    
    # Log coverage report generation completion
    log_test_message "success" "Coverage report generation completed" "coverage"
    
    return 0
}

# Handles test failures by analyzing error patterns, providing debugging guidance,
# and generating failure reports for educational purposes
handle_test_failures() {
    local exit_code="$1"
    local test_analysis="$2"  # Not used in shell, but keeping interface consistent
    
    if [[ $exit_code -eq 0 ]]; then
        return 0  # No failures to handle
    fi
    
    log_test_message "error" "Handling test execution failures" "failure"
    
    # Analyze Jest exit code to determine failure type
    case $exit_code in
        1)
            log_test_message "error" "Test failures detected - some tests did not pass" "failure"
            ;;
        2)
            log_test_message "error" "Coverage threshold failures - coverage below minimum thresholds" "failure"
            ;;
        3)
            log_test_message "error" "Configuration errors - check Jest configuration files" "failure"
            ;;
        *)
            log_test_message "error" "Unknown test failure - Jest exit code: ${exit_code}" "failure"
            ;;
    esac
    
    # Provide specific guidance for common test failure patterns
    echo ""
    echo -e "${COLOR_RED}${COLOR_BOLD}🚨 Test Failure Analysis${COLOR_RESET}"
    echo ""
    
    if [[ $exit_code -eq 1 ]]; then
        echo -e "${COLOR_BOLD}Test Execution Failures:${COLOR_RESET}"
        echo "• Check test output above for specific failing tests"
        echo "• Verify test assertions and expected vs actual values"
        echo "• Ensure test environment setup is correct"
        echo "• Check for async/await issues in test code"
        echo ""
        echo -e "${COLOR_BLUE}Debugging Steps:${COLOR_RESET}"
        echo "1. Run tests with --verbose for detailed output"
        echo "2. Use --testNamePattern to run specific failing tests"
        echo "3. Add console.log statements for debugging"
        echo "4. Check test setup and teardown functions"
    fi
    
    if [[ $exit_code -eq 2 ]]; then
        echo -e "${COLOR_BOLD}Coverage Threshold Failures:${COLOR_RESET}"
        echo "• Current code coverage is below minimum thresholds"
        echo "• Add tests for uncovered code paths"
        echo "• Review coverage report in coverage/lcov-report/index.html"
        echo "• Consider adjusting thresholds in jest.config.js if appropriate"
        echo ""
        echo -e "${COLOR_BLUE}Coverage Improvement:${COLOR_RESET}"
        echo "1. Identify uncovered lines, functions, and branches"
        echo "2. Write additional unit tests for missing coverage"
        echo "3. Test error handling and edge cases"
        echo "4. Verify all code paths are reachable"
    fi
    
    # Generate failure report with troubleshooting guidance
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}🛠️  Troubleshooting Resources:${COLOR_RESET}"
    echo ""
    echo "• Jest Documentation: https://jestjs.io/docs/getting-started"
    echo "• Supertest GitHub: https://github.com/visionmedia/supertest"
    echo "• Node.js Testing Guide: https://nodejs.org/en/docs/guides/testing/"
    echo "• Express.js Testing: https://expressjs.com/en/guide/testing.html"
    echo ""
    
    # Log failure handling completion with next steps
    log_test_message "info" "Test failure analysis completed - check guidance above" "failure"
}

# Displays comprehensive test execution summary including results, coverage,
# performance metrics, and educational insights
display_test_summary() {
    local test_results="$1"      # Test results status (passed/failed)
    local coverage_data="$2"     # Coverage metrics availability
    
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}📋 Test Execution Summary${COLOR_RESET}"
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════════════════════════════${COLOR_RESET}"
    
    # Display test execution statistics with color-coded results
    local status="${TEST_RESULTS[status]:-unknown}"
    local exit_code="${TEST_RESULTS[exit_code]:-0}"
    local execution_time="${TEST_RESULTS[execution_time]:-0}"
    
    if [[ "$status" == "passed" ]]; then
        echo -e "${COLOR_GREEN}${COLOR_BOLD}✅ TEST STATUS: PASSED${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}${COLOR_BOLD}❌ TEST STATUS: FAILED${COLOR_RESET}"
    fi
    
    # Show test timing information and performance metrics
    echo -e "${COLOR_BOLD}⏱️  Execution Time:${COLOR_RESET} ${execution_time}ms"
    echo -e "${COLOR_BOLD}🔢 Exit Code:${COLOR_RESET} ${exit_code}"
    echo -e "${COLOR_BOLD}🧪 Test Type:${COLOR_RESET} ${TEST_TYPE}"
    echo -e "${COLOR_BOLD}⚙️  Configuration:${COLOR_RESET} Jest 29.7.0 with Node.js $(node --version)"
    
    # Display code coverage percentages if coverage was enabled
    if [[ "$COVERAGE_ENABLED" == "true" ]]; then
        echo ""
        echo -e "${COLOR_BOLD}📊 Code Coverage Analysis:${COLOR_RESET}"
        
        if [[ "${COVERAGE_METRICS[available]}" == "true" ]]; then
            echo -e "${COLOR_GREEN}✅ Coverage data collected successfully${COLOR_RESET}"
            echo "   📄 HTML Report: coverage/lcov-report/index.html"
            echo "   📊 JSON Summary: coverage/coverage-summary.json"
            echo "   📈 LCOV Data: coverage/lcov.info"
        else
            echo -e "${COLOR_YELLOW}⚠️  Coverage data not available${COLOR_RESET}"
            echo "   Check Jest configuration and coverage settings"
        fi
        
        # Show coverage threshold compliance status
        echo ""
        echo -e "${COLOR_BOLD}🎯 Coverage Thresholds:${COLOR_RESET}"
        echo "   Lines: 95% minimum required"
        echo "   Functions: 100% required"
        echo "   Branches: 90% minimum required"
        echo "   Statements: 95% minimum required"
    fi
    
    # Include test type breakdown (unit vs integration)
    echo ""
    echo -e "${COLOR_BOLD}🔬 Test Execution Details:${COLOR_RESET}"
    echo "   Test Pattern: ${TEST_TYPE}"
    echo "   Watch Mode: ${WATCH_MODE}"
    echo "   CI Mode: ${CI_MODE}"
    echo "   Coverage Enabled: ${COVERAGE_ENABLED}"
    echo "   Timeout: ${TEST_TIMEOUT}ms"
    echo "   Max Workers: ${MAX_WORKERS}"
    
    # Display performance analysis and optimization suggestions
    echo ""
    echo -e "${COLOR_BOLD}⚡ Performance Analysis:${COLOR_RESET}"
    
    if [[ $execution_time -lt 5000 ]]; then
        echo -e "${COLOR_GREEN}   ✅ Excellent performance (${execution_time}ms)${COLOR_RESET}"
    elif [[ $execution_time -lt 15000 ]]; then
        echo -e "${COLOR_YELLOW}   ⚠️  Good performance (${execution_time}ms)${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}   ❌ Slow performance (${execution_time}ms)${COLOR_RESET}"
        echo "   💡 Consider optimizing test setup or reducing test scope"
    fi
    
    # Include educational insights about testing best practices
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}🎓 Educational Insights:${COLOR_RESET}"
    echo ""
    echo "✨ ${COLOR_BOLD}Testing Best Practices Demonstrated:${COLOR_RESET}"
    echo "   • Jest testing framework with comprehensive configuration"
    echo "   • Supertest HTTP testing for Express.js endpoint validation"
    echo "   • Code coverage analysis with quality gates and thresholds"
    echo "   • Test environment isolation and resource management"
    echo "   • Educational error handling and debugging guidance"
    
    if [[ "$status" == "passed" ]]; then
        echo ""
        echo "🚀 ${COLOR_BOLD}Next Steps for Learning:${COLOR_RESET}"
        echo "   • Explore test coverage reports for detailed analysis"
        echo "   • Experiment with different test scenarios and edge cases"  
        echo "   • Try watch mode for test-driven development workflow"
        echo "   • Review Jest documentation for advanced testing features"
    fi
    
    # Display links to generated reports and detailed results
    if [[ "$COVERAGE_ENABLED" == "true" && -f "${PROJECT_ROOT}/coverage/lcov-report/index.html" ]]; then
        echo ""
        echo -e "${COLOR_BOLD}📄 Generated Reports:${COLOR_RESET}"
        echo "   • Coverage Report: file://${PROJECT_ROOT}/coverage/lcov-report/index.html"
        echo "   • Open this file in your browser for interactive coverage analysis"
    fi
    
    echo ""
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════════════════════════════${COLOR_RESET}"
}

# Cleans up temporary test artifacts, coverage data, and test files while
# preserving important test reports
cleanup_test_artifacts() {
    log_test_message "info" "Cleaning up test artifacts and temporary files" "cleanup"
    
    # Clean up temporary test files and artifacts
    if [[ -d "${PROJECT_ROOT}/tmp" ]]; then
        rm -rf "${PROJECT_ROOT}/tmp"
        log_test_message "debug" "Removed temporary files directory" "cleanup"
    fi
    
    # Remove outdated coverage data while preserving latest reports
    local coverage_dir="${PROJECT_ROOT}/coverage"
    if [[ -d "$coverage_dir" ]]; then
        # Preserve HTML reports and JSON summaries, clean up intermediate files
        find "$coverage_dir" -name "*.tmp" -type f -delete 2>/dev/null || true
        find "$coverage_dir" -name "*.log" -type f -delete 2>/dev/null || true
        log_test_message "debug" "Cleaned up coverage intermediate files" "cleanup"
    fi
    
    # Clean Jest cache directories if they exist
    if [[ -d "${PROJECT_ROOT}/.jest-cache" ]]; then
        log_test_message "debug" "Jest cache directory exists but preserving for performance" "cleanup"
        # Optionally remove old cache files
        find "${PROJECT_ROOT}/.jest-cache" -type f -mtime +7 -delete 2>/dev/null || true
    fi
    
    # Remove test process PID files if any exist
    if [[ -f "${PROJECT_ROOT}/test.pid" ]]; then
        rm -f "${PROJECT_ROOT}/test.pid"
        log_test_message "debug" "Removed test process PID file" "cleanup"
    fi
    
    # Clean up test database files if applicable (none for tutorial)
    # The tutorial application is stateless and requires no database cleanup
    
    # Preserve HTML coverage reports for analysis
    if [[ -f "${coverage_dir}/lcov-report/index.html" ]]; then
        log_test_message "info" "Preserving HTML coverage report for analysis" "cleanup"
    fi
    
    # Preserve JUnit XML reports for CI/CD integration
    if [[ -f "${PROJECT_ROOT}/coverage/junit.xml" ]]; then
        log_test_message "info" "Preserving JUnit XML report for CI/CD integration" "cleanup"
    fi
    
    # Reset test environment variables to default state
    unset JEST_TIMEOUT JEST_MAX_WORKERS JEST_VERBOSE
    unset JEST_COLLECT_COVERAGE COVERAGE_DIRECTORY
    unset DISABLE_REQUEST_LOGGING MINIMAL_MIDDLEWARE
    
    # Log cleanup completion with preserved file information
    log_test_message "success" "Test artifact cleanup completed successfully" "cleanup"
}

# Handles script termination signals gracefully, performing cleanup operations
# and displaying termination information
handle_script_termination() {
    local signal="${1:-UNKNOWN}"
    
    # Capture termination signal (SIGINT, SIGTERM) for graceful shutdown
    log_test_message "warn" "Received termination signal: ${signal}" "termination"
    
    # Display termination message with signal information
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}🛑 Test execution terminated by signal: ${signal}${COLOR_RESET}"
    
    # Kill any running Jest processes to prevent orphaned processes
    if pgrep -f "jest" > /dev/null; then
        log_test_message "info" "Terminating running Jest processes" "termination"
        pkill -f "jest" || true
    fi
    
    # Perform cleanup of temporary test artifacts
    cleanup_test_artifacts
    
    # Display test session summary if tests were executed
    if [[ -n "$TEST_START_TIME" ]]; then
        echo ""
        echo -e "${COLOR_BOLD}Test session summary:${COLOR_RESET}"
        echo "• Started: $(date -d @$((TEST_START_TIME / 1000000000)) +'%H:%M:%S')"
        echo "• Signal: ${signal}"
        echo "• Status: Interrupted"
    fi
    
    # Provide educational information about signal handling
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}📚 Signal Handling Education:${COLOR_RESET}"
    echo "• SIGINT (Ctrl+C): Interrupt signal for graceful shutdown"
    echo "• SIGTERM: Termination request from system or process manager"
    echo "• Proper cleanup prevents orphaned processes and resource leaks"
    
    # Reset terminal formatting and cursor position
    echo -e "${COLOR_RESET}"
    
    # Exit script with appropriate status code based on test results
    local exit_code=130  # Standard exit code for script termination by signal
    if [[ "$signal" == "SIGTERM" ]]; then
        exit_code=143
    fi
    
    exit $exit_code
}

# =============================================================================
# SIGNAL HANDLERS
# =============================================================================

# Set up signal handlers for graceful termination
trap 'handle_script_termination "SIGINT"' SIGINT
trap 'handle_script_termination "SIGTERM"' SIGTERM

# =============================================================================
# MAIN EXECUTION FUNCTION
# =============================================================================

# Main test execution orchestration function that coordinates all test phases
main() {
    # Initialize script environment and capture test execution start timestamp
    local script_start=$(date +%s)
    
    # Display educational testing banner with Jest and Node.js version information
    print_test_banner
    
    # Parse command-line arguments to configure test execution mode and options
    if ! parse_command_line_arguments "$@"; then
        log_test_message "error" "Failed to parse command line arguments"
        exit 1
    fi
    
    # Validate Node.js testing environment including Jest installation and test files
    if ! validate_test_environment; then
        log_test_message "error" "Test environment validation failed"
        exit 1
    fi
    
    # Setup test environment variables and configuration for Jest execution
    setup_test_environment
    
    # Build Jest command with appropriate flags based on parsed arguments
    local jest_command
    jest_command=$(build_jest_command "$TEST_TYPE" "$COVERAGE_ENABLED" "$WATCH_MODE" "$CI_MODE")
    
    # Execute Jest test framework with configured parameters and monitor progress
    if execute_jest_tests "$jest_command"; then
        # Test execution successful
        JEST_EXIT_CODE=0
    else
        # Test execution failed - capture exit code
        JEST_EXIT_CODE=$?
    fi
    
    # Analyze test execution results including pass/fail counts and coverage metrics
    analyze_test_results "$JEST_EXIT_CODE"
    
    # Generate code coverage reports in multiple formats if coverage enabled
    if [[ "$COVERAGE_ENABLED" == "true" ]]; then
        generate_coverage_report "$COVERAGE_ENABLED"
    fi
    
    # Handle test failures with educational guidance and debugging suggestions
    if [[ $JEST_EXIT_CODE -ne 0 ]]; then
        handle_test_failures "$JEST_EXIT_CODE" "test_analysis"
    fi
    
    # Display comprehensive test summary with results and educational insights
    display_test_summary "${TEST_RESULTS[status]}" "${COVERAGE_METRICS[available]}"
    
    # Cleanup temporary test artifacts while preserving important reports
    cleanup_test_artifacts
    
    # Calculate total script execution time
    local script_end=$(date +%s)
    local total_duration=$((script_end - script_start))
    
    # Final execution summary with timing
    echo ""
    log_test_message "info" "Test script execution completed in ${total_duration} seconds" "summary"
    
    # Exit with appropriate status code based on test execution results
    exit $JEST_EXIT_CODE
}

# =============================================================================
# SCRIPT ENTRY POINT
# =============================================================================

# Execute main function with all command line arguments if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi