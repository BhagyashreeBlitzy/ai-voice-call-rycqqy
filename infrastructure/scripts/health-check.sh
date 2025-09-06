#!/bin/bash

# =============================================================================
# COMPREHENSIVE HEALTH CHECK AUTOMATION SCRIPT FOR NODE.JS TUTORIAL APPLICATION
# =============================================================================
#
# This script performs comprehensive health check automation for the Node.js tutorial 
# application including HTTP endpoint validation, service availability monitoring, and 
# deployment verification across multiple environments. Implements retry logic, timeout 
# handling, and detailed reporting for health endpoints including /health, /livez, and 
# /readyz Kubernetes probes.
#
# Key Features:
# - Multi-endpoint health validation with comprehensive response analysis
# - Kubernetes-compatible probe testing with performance threshold validation  
# - Retry logic with exponential backoff and intelligent failure handling
# - Detailed reporting with structured logging and operational metrics
# - Environment-specific configuration with intelligent defaults
# - Integration with monitoring infrastructure and deployment automation
# - Educational clarity with production-ready patterns and best practices
#
# Health Endpoints Tested:
# - /health - Basic and detailed application health status with system metrics
# - /livez - Kubernetes liveness probe for container restart decision support  
# - /readyz - Kubernetes readiness probe for traffic routing decisions
# - Performance validation against 50ms response time targets
#
# Architecture:
# - Modular function design with clear separation of concerns
# - Configuration management with environment variable support
# - Comprehensive error handling with appropriate exit codes
# - Structured logging with correlation ID tracking for debugging
# - Integration points for CI/CD pipeline and monitoring systems
# - Educational examples demonstrating bash scripting best practices
#
# Compatible with:
# - Node.js 22.x LTS tutorial application with Express.js 5.1.0
# - Kubernetes health check requirements and Docker deployment
# - Prometheus monitoring integration and metrics collection
# - CI/CD pipeline automation and deployment verification workflows
#
# @author Node.js Tutorial Team  
# @version 1.0.0
# @educational_focus Health monitoring, bash scripting, operational automation

# =============================================================================
# GLOBAL VARIABLES AND CONFIGURATION
# =============================================================================

# Script directory and project root detection for portable execution
SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"

# Default configuration values with environment variable overrides
DEFAULT_BASE_URL="${BASE_URL:-http://localhost:3000}"
DEFAULT_TIMEOUT="${TIMEOUT:-30}"
DEFAULT_RETRIES="${RETRIES:-5}"
DEFAULT_RETRY_DELAY="${RETRY_DELAY:-5}"

# Current health check execution context
HEALTH_CHECK_TIMESTAMP="$(date +"%Y-%m-%d %H:%M:%S")"
LOG_FILE="${PROJECT_ROOT}/logs/health-check_$(date +"%Y%m%d_%H%M%S").log"

# Output configuration with environment overrides
VERBOSE="${VERBOSE:-false}"
QUIET="${QUIET:-false}"

# Exit codes for different failure scenarios
readonly EXIT_SUCCESS=0
readonly EXIT_FAILURE=1
readonly EXIT_TIMEOUT=2
readonly EXIT_CONNECTION_ERROR=3
readonly EXIT_INVALID_RESPONSE=4
readonly EXIT_CONFIG_ERROR=5

# Health check configuration variables (set by argument parsing)
BASE_URL=""
TIMEOUT=""
RETRIES=""
RETRY_DELAY=""
OUTPUT_FORMAT="text"
DETAILED_HEALTH=false
ENABLE_NOTIFICATIONS=false
NOTIFICATION_WEBHOOK=""

# =============================================================================
# LOGGING AND UTILITY FUNCTIONS
# =============================================================================

/**
 * Logs structured health check events with timestamp, context, and severity for 
 * operational monitoring and debugging support. Creates ISO-8601 timestamp for 
 * precise event timing, formats structured log entry with event type and severity,
 * includes health check context and performance metrics, outputs to both log file
 * and stdout based on verbosity, and integrates with external logging systems.
 */
log_health_event() {
    local event_type="$1"
    local message="$2"
    local context_data="${3:-{}}"
    
    # Generate ISO-8601 timestamp for precise event timing
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    # Format structured log entry with event type, severity, and context
    local log_entry="[$timestamp] [$event_type] $message"
    
    # Include health check context if provided
    if [[ "$context_data" != "{}" ]]; then
        log_entry="$log_entry | Context: $context_data"
    fi
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Output structured log entry to health check log file
    echo "$log_entry" >> "$LOG_FILE"
    
    # Display log entry to stdout based on verbosity configuration
    if [[ "$VERBOSE" == "true" ]] || [[ "$event_type" == "ERROR" ]] || [[ "$event_type" == "WARN" ]]; then
        if [[ "$QUIET" != "true" ]]; then
            echo "$log_entry" >&2
        fi
    fi
    
    # Debug logging for development environments
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo "[DEBUG] Event logged: $event_type - $message" >&2
    fi
}

/**
 * Displays comprehensive usage information including command syntax, options, 
 * examples, and configuration guidance for health check script. Shows script name 
 * and version information, command syntax and required parameters, lists all 
 * available command-line options with descriptions, provides usage examples for 
 * common health check scenarios, and includes troubleshooting tips.
 */
display_usage() {
    cat << 'EOF'
================================================================================
HEALTH CHECK AUTOMATION SCRIPT FOR NODE.JS TUTORIAL APPLICATION
================================================================================

SYNOPSIS:
    health-check.sh [OPTIONS] [BASE_URL]

DESCRIPTION:
    Comprehensive health check automation script for the Node.js tutorial
    application. Performs HTTP endpoint validation, service availability
    monitoring, and deployment verification with retry logic and detailed
    reporting.

OPTIONS:
    -u, --url URL           Target base URL for health checks
                           Default: http://localhost:3000
                           
    -t, --timeout SECONDS   Request timeout in seconds
                           Default: 30
                           
    -r, --retries COUNT     Maximum retry attempts for failed checks
                           Default: 5
                           
    -d, --delay SECONDS     Delay between retry attempts in seconds  
                           Default: 5
                           
    -f, --format FORMAT     Output format: text, json, html
                           Default: text
                           
    --detailed              Request detailed health information
                           
    --verbose               Enable verbose logging output
                           
    --quiet                 Suppress non-essential output
                           
    --webhook URL           Notification webhook endpoint
                           
    --help                  Display this help message

EXAMPLES:
    # Basic health check with default settings
    ./health-check.sh
    
    # Health check with custom URL and timeout
    ./health-check.sh -u http://api.example.com -t 60
    
    # Detailed health check with verbose output
    ./health-check.sh --detailed --verbose
    
    # Production health check with notification
    ./health-check.sh -u https://prod.api.com --webhook https://hooks.slack.com/...
    
    # CI/CD pipeline health validation
    ./health-check.sh --retries 10 --delay 3 --format json --quiet

ENDPOINTS TESTED:
    /health     - Application health status (basic and detailed)
    /livez      - Kubernetes liveness probe (sub-10ms target)
    /readyz     - Kubernetes readiness probe (sub-25ms target)

ENVIRONMENT VARIABLES:
    BASE_URL               Override default base URL
    TIMEOUT                Override default timeout
    RETRIES                Override default retry count
    RETRY_DELAY            Override default retry delay
    VERBOSE                Enable verbose output (true/false)
    QUIET                  Enable quiet mode (true/false)
    WEBHOOK_URL            Notification webhook endpoint

EXIT CODES:
    0   Success - All health checks passed
    1   Failure - One or more health checks failed
    2   Timeout - Health check requests timed out
    3   Connection Error - Network connectivity issues
    4   Invalid Response - Unexpected response format
    5   Configuration Error - Invalid script configuration

For more information, visit:
https://github.com/tutorial/nodejs-hello-tutorial

EOF
}

# =============================================================================
# CONFIGURATION AND ARGUMENT PARSING FUNCTIONS
# =============================================================================

/**
 * Parses and validates command line arguments for health check configuration 
 * including base URL, timeout, retry settings, and output options. Uses getopts 
 * for command line flag parsing, validates base URL format and accessibility,
 * sets timeout and retry configuration with bounds checking, configures output 
 * options including verbose and quiet modes, and validates health check endpoints.
 */
parse_health_check_arguments() {
    local args=("$@")
    
    # Parse command line flags using getopts for health check options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--url)
                BASE_URL="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -r|--retries)
                RETRIES="$2"
                shift 2
                ;;
            -d|--delay)
                RETRY_DELAY="$2"
                shift 2
                ;;
            -f|--format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            --detailed)
                DETAILED_HEALTH=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --quiet)
                QUIET=true
                shift
                ;;
            --webhook)
                NOTIFICATION_WEBHOOK="$2"
                ENABLE_NOTIFICATIONS=true
                shift 2
                ;;
            --help|-h)
                display_usage
                exit "$EXIT_SUCCESS"
                ;;
            -*)
                log_health_event "ERROR" "Unknown option: $1"
                display_usage
                exit "$EXIT_CONFIG_ERROR"
                ;;
            *)
                # Treat as base URL if not already set
                if [[ -z "$BASE_URL" ]]; then
                    BASE_URL="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Set default values for missing or invalid options
    BASE_URL="${BASE_URL:-$DEFAULT_BASE_URL}"
    TIMEOUT="${TIMEOUT:-$DEFAULT_TIMEOUT}"
    RETRIES="${RETRIES:-$DEFAULT_RETRIES}"
    RETRY_DELAY="${RETRY_DELAY:-$DEFAULT_RETRY_DELAY}"
    
    # Validate base URL format and network accessibility
    if ! [[ "$BASE_URL" =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$ ]]; then
        log_health_event "ERROR" "Invalid base URL format: $BASE_URL"
        exit "$EXIT_CONFIG_ERROR"
    fi
    
    # Set timeout and retry configuration with bounds checking
    if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT" -lt 1 ]] || [[ "$TIMEOUT" -gt 300 ]]; then
        log_health_event "WARN" "Invalid timeout value: $TIMEOUT. Using default: $DEFAULT_TIMEOUT"
        TIMEOUT="$DEFAULT_TIMEOUT"
    fi
    
    if ! [[ "$RETRIES" =~ ^[0-9]+$ ]] || [[ "$RETRIES" -lt 0 ]] || [[ "$RETRIES" -gt 20 ]]; then
        log_health_event "WARN" "Invalid retry count: $RETRIES. Using default: $DEFAULT_RETRIES"
        RETRIES="$DEFAULT_RETRIES"
    fi
    
    if ! [[ "$RETRY_DELAY" =~ ^[0-9]+$ ]] || [[ "$RETRY_DELAY" -lt 1 ]] || [[ "$RETRY_DELAY" -gt 60 ]]; then
        log_health_event "WARN" "Invalid retry delay: $RETRY_DELAY. Using default: $DEFAULT_RETRY_DELAY"
        RETRY_DELAY="$DEFAULT_RETRY_DELAY"
    fi
    
    # Configure output options including verbose, quiet, and format settings
    case "$OUTPUT_FORMAT" in
        text|json|html)
            # Valid format
            ;;
        *)
            log_health_event "WARN" "Invalid output format: $OUTPUT_FORMAT. Using text format"
            OUTPUT_FORMAT="text"
            ;;
    esac
    
    # Display health check configuration summary for verification
    log_health_event "INFO" "Health check configuration initialized" \
        "{\"base_url\":\"$BASE_URL\",\"timeout\":$TIMEOUT,\"retries\":$RETRIES,\"delay\":$RETRY_DELAY,\"format\":\"$OUTPUT_FORMAT\",\"detailed\":$DETAILED_HEALTH}"
}

/**
 * Validates health check prerequisites including required tools, network 
 * connectivity, and application availability. Checks availability of required 
 * command-line tools (curl, jq, timeout), verifies network connectivity to target
 * application base URL, validates DNS resolution and port accessibility, tests
 * basic HTTP connectivity with minimal timeout, and verifies log directory access.
 */
validate_health_check_prerequisites() {
    log_health_event "INFO" "Validating health check prerequisites"
    
    # Check availability of required command-line tools (curl, jq, timeout)
    local required_tools=("curl" "jq" "timeout" "sleep" "date")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_health_event "ERROR" "Required tool not found: $tool"
            
            # Provide installation guidance for missing tools
            case "$tool" in
                curl)
                    echo "Install curl: sudo apt-get install curl (Ubuntu/Debian) or brew install curl (macOS)"
                    ;;
                jq)
                    echo "Install jq: sudo apt-get install jq (Ubuntu/Debian) or brew install jq (macOS)"
                    ;;
                timeout)
                    echo "Install coreutils: sudo apt-get install coreutils (Ubuntu/Debian)"
                    ;;
            esac
            
            return 1
        fi
    done
    
    # Verify network connectivity to target application base URL
    local host_port
    if [[ "$BASE_URL" =~ ^https?://([^/]+) ]]; then
        host_port="${BASH_REMATCH[1]}"
        
        # Extract hostname and port for connectivity testing
        local hostname="${host_port%:*}"
        local port="80"
        
        if [[ "$host_port" =~ :([0-9]+) ]]; then
            port="${BASH_REMATCH[1]}"
        elif [[ "$BASE_URL" =~ ^https:// ]]; then
            port="443"
        fi
        
        # Test basic HTTP connectivity with minimal timeout for responsiveness check
        log_health_event "INFO" "Testing network connectivity to $hostname:$port"
        
        if ! timeout 10 bash -c "</dev/tcp/$hostname/$port" 2>/dev/null; then
            log_health_event "ERROR" "Cannot establish network connection to $hostname:$port"
            return 1
        fi
        
        log_health_event "INFO" "Network connectivity confirmed to $hostname:$port"
    else
        log_health_event "ERROR" "Cannot parse hostname from base URL: $BASE_URL"
        return 1
    fi
    
    # Verify log directory accessibility and write permissions
    local log_dir
    log_dir="$(dirname "$LOG_FILE")"
    
    if ! mkdir -p "$log_dir" 2>/dev/null; then
        log_health_event "ERROR" "Cannot create log directory: $log_dir"
        return 1
    fi
    
    if ! touch "$LOG_FILE" 2>/dev/null; then
        log_health_event "ERROR" "Cannot write to log file: $LOG_FILE"
        return 1
    fi
    
    log_health_event "INFO" "All health check prerequisites validated successfully"
    return 0
}

/**
 * Loads health check configuration from multiple sources including environment 
 * variables, configuration files, and intelligent defaults. Loads base URL 
 * configuration from environment or uses localhost default, configures health 
 * check endpoints paths, sets timeout values with environment variable overrides,
 * configures retry logic with exponential backoff, and loads expected response 
 * formats and status codes.
 */
load_health_check_configuration() {
    log_health_event "INFO" "Loading health check configuration from multiple sources"
    
    # Load base URL configuration from environment or use localhost default
    if [[ -z "$BASE_URL" ]]; then
        BASE_URL="${BASE_URL:-$DEFAULT_BASE_URL}"
        log_health_event "INFO" "Using default base URL: $BASE_URL"
    fi
    
    # Configure health check endpoints paths (/health, /livez, /readyz)
    readonly HEALTH_ENDPOINT="/health"
    readonly LIVENESS_ENDPOINT="/livez"
    readonly READINESS_ENDPOINT="/readyz"
    
    # Set timeout values with environment variable overrides and bounds validation
    if [[ -z "$TIMEOUT" ]]; then
        TIMEOUT="${TIMEOUT:-$DEFAULT_TIMEOUT}"
    fi
    
    # Configure retry logic with exponential backoff and maximum attempt limits
    if [[ -z "$RETRIES" ]]; then
        RETRIES="${RETRIES:-$DEFAULT_RETRIES}"
    fi
    
    if [[ -z "$RETRY_DELAY" ]]; then
        RETRY_DELAY="${RETRY_DELAY:-$DEFAULT_RETRY_DELAY}"
    fi
    
    # Load expected response formats and status codes for validation
    readonly EXPECTED_SUCCESS_STATUS="200"
    readonly EXPECTED_UNAVAILABLE_STATUS="503"
    readonly EXPECTED_CONTENT_TYPE="application/json"
    
    # Configure logging levels and output formatting options
    readonly LOG_LEVEL="${LOG_LEVEL:-INFO}"
    
    # Application metadata from package.json for health check context
    readonly APP_NAME="nodejs-hello-tutorial"
    readonly APP_VERSION="1.0.0"
    
    # Performance thresholds for health endpoint validation
    readonly HEALTH_RESPONSE_THRESHOLD_MS=50
    readonly LIVENESS_RESPONSE_THRESHOLD_MS=10
    readonly READINESS_RESPONSE_THRESHOLD_MS=25
    
    log_health_event "INFO" "Health check configuration loaded successfully" \
        "{\"endpoints\":[\"$HEALTH_ENDPOINT\",\"$LIVENESS_ENDPOINT\",\"$READINESS_ENDPOINT\"],\"thresholds\":{\"health\":${HEALTH_RESPONSE_THRESHOLD_MS},\"liveness\":${LIVENESS_RESPONSE_THRESHOLD_MS},\"readiness\":${READINESS_RESPONSE_THRESHOLD_MS}}}"
}

# =============================================================================
# HEALTH CHECK IMPLEMENTATION FUNCTIONS
# =============================================================================

/**
 * Performs basic health endpoint validation by sending HTTP GET request to /health 
 * endpoint with response validation and performance measurement. Constructs health 
 * endpoint URL using base URL and /health path, sends HTTP GET request using curl 
 * with timeout and response capture, measures response time and validates against 
 * performance thresholds, parses JSON response and validates required fields.
 */
check_basic_health() {
    local base_url="$1"
    local timeout="$2"
    local correlation_id="health-$(date +%s)-$$"
    
    log_health_event "INFO" "Starting basic health check" \
        "{\"correlation_id\":\"$correlation_id\",\"url\":\"$base_url$HEALTH_ENDPOINT\",\"timeout\":$timeout}"
    
    # Construct health endpoint URL using base URL and /health path
    local health_url="$base_url$HEALTH_ENDPOINT"
    
    # Add detailed query parameter if requested
    if [[ "$DETAILED_HEALTH" == "true" ]]; then
        health_url="$health_url?detailed=true"
    fi
    
    # Measure response time and validate against performance thresholds (50ms target)
    local start_time
    start_time=$(date +%s%N)
    
    # Send HTTP GET request using curl with timeout and response capture
    local response_file
    response_file=$(mktemp)
    local headers_file
    headers_file=$(mktemp)
    
    local http_status
    http_status=$(curl -s -w "%{http_code}" \
        --max-time "$timeout" \
        --connect-timeout 10 \
        --retry 0 \
        --header "Accept: application/json" \
        --header "User-Agent: nodejs-tutorial-health-check/1.0.0" \
        --header "X-Correlation-ID: $correlation_id" \
        --output "$response_file" \
        --dump-header "$headers_file" \
        "$health_url")
    
    local curl_exit_code=$?
    local end_time
    end_time=$(date +%s%N)
    local response_time_ms
    response_time_ms=$(echo "scale=2; ($end_time - $start_time) / 1000000" | bc 2>/dev/null || echo "0")
    
    # Handle curl execution errors
    if [[ $curl_exit_code -ne 0 ]]; then
        cleanup_temp_files "$response_file" "$headers_file"
        case $curl_exit_code in
            7)  log_health_event "ERROR" "Failed to connect to health endpoint" \
                    "{\"correlation_id\":\"$correlation_id\",\"error\":\"connection_failed\",\"curl_code\":$curl_exit_code}"
                return "$EXIT_CONNECTION_ERROR" ;;
            28) log_health_event "ERROR" "Health check request timed out" \
                    "{\"correlation_id\":\"$correlation_id\",\"error\":\"timeout\",\"timeout\":$timeout}"
                return "$EXIT_TIMEOUT" ;;
            *)  log_health_event "ERROR" "Health check request failed" \
                    "{\"correlation_id\":\"$correlation_id\",\"error\":\"curl_error\",\"curl_code\":$curl_exit_code}"
                return "$EXIT_FAILURE" ;;
        esac
    fi
    
    # Verify HTTP status code is 200 OK for successful health indication
    if [[ "$http_status" != "200" ]]; then
        local response_content
        response_content=$(cat "$response_file" 2>/dev/null || echo "{}")
        
        log_health_event "ERROR" "Health check returned non-OK status" \
            "{\"correlation_id\":\"$correlation_id\",\"http_status\":$http_status,\"response_time\":$response_time_ms,\"response\":\"$(echo "$response_content" | tr '\n' ' ' | cut -c1-100)\"}"
        
        cleanup_temp_files "$response_file" "$headers_file"
        
        if [[ "$http_status" == "503" ]]; then
            return "$EXIT_CONNECTION_ERROR"
        else
            return "$EXIT_INVALID_RESPONSE"
        fi
    fi
    
    # Validate response content-type is application/json as expected
    local content_type
    content_type=$(grep -i "content-type:" "$headers_file" | cut -d: -f2 | tr -d ' \r\n' | head -1)
    
    if [[ ! "$content_type" =~ application/json ]]; then
        log_health_event "WARN" "Unexpected content-type in health response" \
            "{\"correlation_id\":\"$correlation_id\",\"expected\":\"application/json\",\"actual\":\"$content_type\"}"
    fi
    
    # Parse JSON response and validate required fields (status, timestamp)
    local response_json
    response_json=$(cat "$response_file")
    
    if ! echo "$response_json" | jq . >/dev/null 2>&1; then
        log_health_event "ERROR" "Health response is not valid JSON" \
            "{\"correlation_id\":\"$correlation_id\",\"response\":\"$(echo "$response_json" | cut -c1-100)\"}"
        cleanup_temp_files "$response_file" "$headers_file"
        return "$EXIT_INVALID_RESPONSE"
    fi
    
    # Extract health status and system information from response body
    local health_status
    health_status=$(echo "$response_json" | jq -r '.status // "unknown"')
    
    local app_name
    app_name=$(echo "$response_json" | jq -r '.application.name // "unknown"')
    
    local timestamp
    timestamp=$(echo "$response_json" | jq -r '.timestamp // ""')
    
    # Validate performance threshold compliance
    local performance_status="good"
    if (( $(echo "$response_time_ms > $HEALTH_RESPONSE_THRESHOLD_MS" | bc -l) )); then
        performance_status="slow"
        log_health_event "WARN" "Health check response time exceeded threshold" \
            "{\"correlation_id\":\"$correlation_id\",\"response_time\":$response_time_ms,\"threshold\":$HEALTH_RESPONSE_THRESHOLD_MS}"
    fi
    
    cleanup_temp_files "$response_file" "$headers_file"
    
    # Return comprehensive health check result with metrics and validation status
    log_health_event "INFO" "Basic health check completed successfully" \
        "{\"correlation_id\":\"$correlation_id\",\"status\":\"$health_status\",\"response_time\":$response_time_ms,\"performance\":\"$performance_status\",\"app\":\"$app_name\"}"
    
    # Create result object for caller
    echo "{\"status\":\"success\",\"health_status\":\"$health_status\",\"response_time\":$response_time_ms,\"performance\":\"$performance_status\",\"http_status\":$http_status,\"correlation_id\":\"$correlation_id\"}"
    
    return "$EXIT_SUCCESS"
}

/**
 * Validates Kubernetes liveness probe endpoint (/livez) for container restart 
 * decisions with optimized performance validation. Constructs liveness probe URL 
 * using base URL and /livez path, sends HTTP GET request with minimal timeout for 
 * fast probe response, measures response time and validates against sub-10ms target,
 * validates HTTP status code (200 OK for alive, 503 for restart needed).
 */
check_liveness_probe() {
    local base_url="$1"
    local timeout="$2"
    local correlation_id="liveness-$(date +%s)-$$"
    
    log_health_event "INFO" "Starting liveness probe check" \
        "{\"correlation_id\":\"$correlation_id\",\"url\":\"$base_url$LIVENESS_ENDPOINT\",\"timeout\":$timeout}"
    
    # Construct liveness probe URL using base URL and /livez path
    local liveness_url="$base_url$LIVENESS_ENDPOINT"
    
    # Measure response time and validate against sub-10ms target for Kubernetes efficiency
    local start_time
    start_time=$(date +%s%N)
    
    # Send HTTP GET request with minimal timeout for fast probe response
    local response_file
    response_file=$(mktemp)
    local headers_file
    headers_file=$(mktemp)
    
    local http_status
    http_status=$(curl -s -w "%{http_code}" \
        --max-time "$timeout" \
        --connect-timeout 5 \
        --retry 0 \
        --header "Accept: application/json" \
        --header "User-Agent: kubernetes-liveness-probe/1.0" \
        --header "X-Correlation-ID: $correlation_id" \
        --output "$response_file" \
        --dump-header "$headers_file" \
        "$liveness_url")
    
    local curl_exit_code=$?
    local end_time
    end_time=$(date +%s%N)
    local response_time_ms
    response_time_ms=$(echo "scale=2; ($end_time - $start_time) / 1000000" | bc 2>/dev/null || echo "0")
    
    # Handle curl execution errors with fast fallback
    if [[ $curl_exit_code -ne 0 ]]; then
        cleanup_temp_files "$response_file" "$headers_file"
        
        log_health_event "ERROR" "Liveness probe failed - application not responding" \
            "{\"correlation_id\":\"$correlation_id\",\"error\":\"probe_failed\",\"curl_code\":$curl_exit_code,\"action\":\"container_restart_recommended\"}"
        
        # Fast error response for liveness probe
        echo "{\"status\":\"error\",\"alive\":false,\"response_time\":$response_time_ms,\"action\":\"restart\",\"correlation_id\":\"$correlation_id\"}"
        return "$EXIT_CONNECTION_ERROR"
    fi
    
    # Validate HTTP status code (200 OK for alive, 503 Service Unavailable for dead)
    local alive=true
    local action="continue"
    
    if [[ "$http_status" != "200" ]]; then
        alive=false
        action="restart"
        
        log_health_event "WARN" "Liveness probe indicates unhealthy application" \
            "{\"correlation_id\":\"$correlation_id\",\"http_status\":$http_status,\"alive\":false,\"action\":\"restart\"}"
    fi
    
    # Parse minimal JSON response and extract liveness status information
    local response_json
    response_json=$(cat "$response_file" 2>/dev/null || echo '{"status":"unknown"}')
    
    local liveness_status
    liveness_status=$(echo "$response_json" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    
    # Performance warning if response time exceeds target
    local performance_status="excellent"
    if (( $(echo "$response_time_ms > $LIVENESS_RESPONSE_THRESHOLD_MS" | bc -l) )); then
        performance_status="slow"
        log_health_event "WARN" "Liveness probe response time exceeded Kubernetes target" \
            "{\"correlation_id\":\"$correlation_id\",\"response_time\":$response_time_ms,\"threshold\":$LIVENESS_RESPONSE_THRESHOLD_MS}"
    fi
    
    cleanup_temp_files "$response_file" "$headers_file"
    
    # Return liveness probe validation with restart recommendation if applicable
    log_health_event "INFO" "Liveness probe completed" \
        "{\"correlation_id\":\"$correlation_id\",\"alive\":$alive,\"status\":\"$liveness_status\",\"response_time\":$response_time_ms,\"action\":\"$action\"}"
    
    echo "{\"status\":\"success\",\"alive\":$alive,\"liveness_status\":\"$liveness_status\",\"response_time\":$response_time_ms,\"action\":\"$action\",\"performance\":\"$performance_status\",\"correlation_id\":\"$correlation_id\"}"
    
    if [[ "$alive" == "true" ]]; then
        return "$EXIT_SUCCESS"
    else
        return "$EXIT_CONNECTION_ERROR"
    fi
}

/**
 * Validates Kubernetes readiness probe endpoint (/readyz) for traffic routing 
 * decisions with dependency status evaluation. Constructs readiness probe URL 
 * using base URL and /readyz path, sends HTTP GET request with moderate timeout 
 * for comprehensive readiness evaluation, measures response time and validates 
 * against sub-25ms target, evaluates dependency health status and resource utilization.
 */
check_readiness_probe() {
    local base_url="$1"
    local timeout="$2"
    local correlation_id="readiness-$(date +%s)-$$"
    
    log_health_event "INFO" "Starting readiness probe check" \
        "{\"correlation_id\":\"$correlation_id\",\"url\":\"$base_url$READINESS_ENDPOINT\",\"timeout\":$timeout}"
    
    # Construct readiness probe URL using base URL and /readyz path
    local readiness_url="$base_url$READINESS_ENDPOINT"
    
    # Measure response time and validate against sub-25ms target for traffic routing efficiency
    local start_time
    start_time=$(date +%s%N)
    
    # Send HTTP GET request with moderate timeout for comprehensive readiness evaluation
    local response_file
    response_file=$(mktemp)
    local headers_file
    headers_file=$(mktemp)
    
    local http_status
    http_status=$(curl -s -w "%{http_code}" \
        --max-time "$timeout" \
        --connect-timeout 10 \
        --retry 0 \
        --header "Accept: application/json" \
        --header "User-Agent: kubernetes-readiness-probe/1.0" \
        --header "X-Correlation-ID: $correlation_id" \
        --output "$response_file" \
        --dump-header "$headers_file" \
        "$readiness_url")
    
    local curl_exit_code=$?
    local end_time
    end_time=$(date +%s%N)
    local response_time_ms
    response_time_ms=$(echo "scale=2; ($end_time - $start_time) / 1000000" | bc 2>/dev/null || echo "0")
    
    # Handle curl execution errors gracefully to prevent traffic routing disruption
    if [[ $curl_exit_code -ne 0 ]]; then
        cleanup_temp_files "$response_file" "$headers_file"
        
        log_health_event "ERROR" "Readiness probe failed - service not ready for traffic" \
            "{\"correlation_id\":\"$correlation_id\",\"error\":\"probe_failed\",\"curl_code\":$curl_exit_code,\"traffic_routing\":\"disabled\"}"
        
        echo "{\"status\":\"error\",\"ready\":false,\"response_time\":$response_time_ms,\"traffic_routing\":\"disabled\",\"correlation_id\":\"$correlation_id\"}"
        return "$EXIT_CONNECTION_ERROR"
    fi
    
    # Validate HTTP status code (200 OK if ready for traffic, 503 if not ready)
    local ready=true
    local traffic_routing="enabled"
    
    if [[ "$http_status" != "200" ]]; then
        ready=false
        traffic_routing="disabled"
        
        log_health_event "WARN" "Readiness probe indicates service not ready for traffic" \
            "{\"correlation_id\":\"$correlation_id\",\"http_status\":$http_status,\"ready\":false,\"traffic_routing\":\"disabled\"}"
    fi
    
    # Parse JSON response and extract readiness status with dependency information
    local response_json
    response_json=$(cat "$response_file" 2>/dev/null || echo '{"status":"unknown","dependencies":{}}')
    
    local readiness_status
    readiness_status=$(echo "$response_json" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    
    # Evaluate dependency health status and resource utilization from response
    local dependencies_info
    dependencies_info=$(echo "$response_json" | jq -r '.dependencies // {}' 2>/dev/null || echo '{}')
    
    local healthy_dependencies=0
    local total_dependencies=0
    
    if [[ "$dependencies_info" != "{}" ]]; then
        total_dependencies=$(echo "$dependencies_info" | jq 'length' 2>/dev/null || echo "0")
        healthy_dependencies=$(echo "$dependencies_info" | jq '[.[] | select(.status == "healthy")] | length' 2>/dev/null || echo "0")
    fi
    
    # Performance warning if response time exceeds target
    local performance_status="good"
    if (( $(echo "$response_time_ms > $READINESS_RESPONSE_THRESHOLD_MS" | bc -l) )); then
        performance_status="slow"
        log_health_event "WARN" "Readiness probe response time exceeded traffic routing target" \
            "{\"correlation_id\":\"$correlation_id\",\"response_time\":$response_time_ms,\"threshold\":$READINESS_RESPONSE_THRESHOLD_MS}"
    fi
    
    cleanup_temp_files "$response_file" "$headers_file"
    
    # Return readiness probe validation with traffic routing recommendation
    log_health_event "INFO" "Readiness probe completed" \
        "{\"correlation_id\":\"$correlation_id\",\"ready\":$ready,\"status\":\"$readiness_status\",\"response_time\":$response_time_ms,\"traffic_routing\":\"$traffic_routing\",\"dependencies\":{\"healthy\":$healthy_dependencies,\"total\":$total_dependencies}}"
    
    echo "{\"status\":\"success\",\"ready\":$ready,\"readiness_status\":\"$readiness_status\",\"response_time\":$response_time_ms,\"traffic_routing\":\"$traffic_routing\",\"dependencies\":{\"healthy\":$healthy_dependencies,\"total\":$total_dependencies},\"performance\":\"$performance_status\",\"correlation_id\":\"$correlation_id\"}"
    
    if [[ "$ready" == "true" ]]; then
        return "$EXIT_SUCCESS"
    else
        return "$EXIT_CONNECTION_ERROR"
    fi
}

/**
 * Performs detailed health validation by requesting comprehensive health information 
 * with system metrics and dependency status evaluation. Constructs detailed health 
 * URL with query parameter for comprehensive information, sends HTTP GET request to 
 * /health?detailed=true with extended timeout, parses detailed JSON response with 
 * system metrics and resource utilization, validates system resource health.
 */
check_detailed_health() {
    local base_url="$1"
    local timeout="$2"
    local correlation_id="detailed-health-$(date +%s)-$$"
    
    log_health_event "INFO" "Starting detailed health check" \
        "{\"correlation_id\":\"$correlation_id\",\"url\":\"$base_url$HEALTH_ENDPOINT?detailed=true\",\"timeout\":$timeout}"
    
    # Construct detailed health URL with query parameter for comprehensive information
    local detailed_health_url="$base_url$HEALTH_ENDPOINT?detailed=true"
    
    local start_time
    start_time=$(date +%s%N)
    
    # Send HTTP GET request to /health?detailed=true with extended timeout
    local response_file
    response_file=$(mktemp)
    local headers_file
    headers_file=$(mktemp)
    
    local http_status
    http_status=$(curl -s -w "%{http_code}" \
        --max-time "$timeout" \
        --connect-timeout 15 \
        --retry 0 \
        --header "Accept: application/json" \
        --header "User-Agent: nodejs-tutorial-detailed-health/1.0.0" \
        --header "X-Correlation-ID: $correlation_id" \
        --output "$response_file" \
        --dump-header "$headers_file" \
        "$detailed_health_url")
    
    local curl_exit_code=$?
    local end_time
    end_time=$(date +%s%N)
    local response_time_ms
    response_time_ms=$(echo "scale=2; ($end_time - $start_time) / 1000000" | bc 2>/dev/null || echo "0")
    
    if [[ $curl_exit_code -ne 0 ]] || [[ "$http_status" != "200" ]]; then
        cleanup_temp_files "$response_file" "$headers_file"
        
        log_health_event "ERROR" "Detailed health check failed" \
            "{\"correlation_id\":\"$correlation_id\",\"error\":\"detailed_health_failed\",\"curl_code\":$curl_exit_code,\"http_status\":$http_status}"
        
        echo "{\"status\":\"error\",\"detailed_health\":false,\"response_time\":$response_time_ms,\"correlation_id\":\"$correlation_id\"}"
        return "$EXIT_FAILURE"
    fi
    
    # Parse detailed JSON response with system metrics and resource utilization
    local response_json
    response_json=$(cat "$response_file")
    
    if ! echo "$response_json" | jq . >/dev/null 2>&1; then
        cleanup_temp_files "$response_file" "$headers_file"
        
        log_health_event "ERROR" "Detailed health response is not valid JSON"
        return "$EXIT_INVALID_RESPONSE"
    fi
    
    # Validate system resource health (memory usage, CPU utilization, uptime)
    local system_metrics
    system_metrics=$(echo "$response_json" | jq -r '.system // {}' 2>/dev/null || echo '{}')
    
    local memory_usage_mb
    memory_usage_mb=$(echo "$system_metrics" | jq -r '.memory.used_mb // 0' 2>/dev/null || echo "0")
    
    local cpu_usage_percent
    cpu_usage_percent=$(echo "$system_metrics" | jq -r '.cpu.usage_percent // 0' 2>/dev/null || echo "0")
    
    local uptime_seconds
    uptime_seconds=$(echo "$system_metrics" | jq -r '.uptime.seconds // 0' 2>/dev/null || echo "0")
    
    # Evaluate dependency status and external service connectivity
    local dependencies_status
    dependencies_status=$(echo "$response_json" | jq -r '.dependencies // {}' 2>/dev/null || echo '{}')
    
    # Check application performance metrics and error rates
    local performance_metrics
    performance_metrics=$(echo "$response_json" | jq -r '.performance // {}' 2>/dev/null || echo '{}')
    
    local error_rate
    error_rate=$(echo "$performance_metrics" | jq -r '.error_rate // 0' 2>/dev/null || echo "0")
    
    local avg_response_time
    avg_response_time=$(echo "$performance_metrics" | jq -r '.avg_response_time_ms // 0' 2>/dev/null || echo "0")
    
    cleanup_temp_files "$response_file" "$headers_file"
    
    # Return comprehensive health analysis with detailed system status and recommendations
    log_health_event "INFO" "Detailed health check completed" \
        "{\"correlation_id\":\"$correlation_id\",\"response_time\":$response_time_ms,\"system\":{\"memory_mb\":$memory_usage_mb,\"cpu_percent\":$cpu_usage_percent,\"uptime\":$uptime_seconds},\"performance\":{\"error_rate\":$error_rate,\"avg_response_ms\":$avg_response_time}}"
    
    echo "{\"status\":\"success\",\"detailed_health\":true,\"response_time\":$response_time_ms,\"system\":{\"memory_mb\":$memory_usage_mb,\"cpu_percent\":$cpu_usage_percent,\"uptime_seconds\":$uptime_seconds},\"performance\":{\"error_rate\":$error_rate,\"avg_response_time_ms\":$avg_response_time},\"correlation_id\":\"$correlation_id\"}"
    
    return "$EXIT_SUCCESS"
}

# =============================================================================
# RETRY LOGIC AND ERROR HANDLING FUNCTIONS
# =============================================================================

/**
 * Executes health check with retry logic, exponential backoff, and comprehensive 
 * error handling for reliable health validation. Initializes retry counter and 
 * result tracking, implements exponential backoff delay with jitter, executes 
 * specific health check function based on check type parameter, evaluates health 
 * check result and determines if retry is necessary.
 */
perform_health_check_with_retries() {
    local check_type="$1"
    local endpoint_url="$2"
    local max_retries="$3"
    local base_delay="$4"
    local correlation_id="retry-$(date +%s)-$$"
    
    log_health_event "INFO" "Starting health check with retry logic" \
        "{\"correlation_id\":\"$correlation_id\",\"check_type\":\"$check_type\",\"url\":\"$endpoint_url\",\"max_retries\":$max_retries,\"base_delay\":$base_delay}"
    
    local attempt=0
    local last_exit_code="$EXIT_FAILURE"
    local last_result="{\"status\":\"not_attempted\"}"
    
    # Loop through retry attempts with exponential backoff delay calculation
    while [[ $attempt -le $max_retries ]]; do
        attempt=$((attempt + 1))
        
        log_health_event "INFO" "Health check attempt $attempt of $((max_retries + 1))" \
            "{\"correlation_id\":\"$correlation_id\",\"attempt\":$attempt,\"check_type\":\"$check_type\"}"
        
        # Execute specific health check function based on check type parameter
        case "$check_type" in
            "health")
                last_result=$(check_basic_health "$endpoint_url" "$TIMEOUT")
                last_exit_code=$?
                ;;
            "liveness")
                last_result=$(check_liveness_probe "$endpoint_url" "$TIMEOUT")
                last_exit_code=$?
                ;;
            "readiness")
                last_result=$(check_readiness_probe "$endpoint_url" "$TIMEOUT")
                last_exit_code=$?
                ;;
            "detailed")
                last_result=$(check_detailed_health "$endpoint_url" "$TIMEOUT")
                last_exit_code=$?
                ;;
            *)
                log_health_event "ERROR" "Unknown health check type: $check_type"
                echo "{\"status\":\"error\",\"error\":\"unknown_check_type\",\"check_type\":\"$check_type\"}"
                return "$EXIT_CONFIG_ERROR"
                ;;
        esac
        
        # Evaluate health check result and determine if retry is necessary
        if [[ $last_exit_code -eq $EXIT_SUCCESS ]]; then
            log_health_event "INFO" "Health check succeeded on attempt $attempt" \
                "{\"correlation_id\":\"$correlation_id\",\"attempt\":$attempt,\"check_type\":\"$check_type\",\"result\":\"success\"}"
            
            echo "$last_result"
            return "$EXIT_SUCCESS"
        fi
        
        # Check if we should retry based on exit code
        case $last_exit_code in
            "$EXIT_CONNECTION_ERROR"|"$EXIT_TIMEOUT")
                # These errors are retry-worthy
                ;;
            "$EXIT_INVALID_RESPONSE")
                # Invalid responses might be temporary
                ;;
            "$EXIT_CONFIG_ERROR")
                # Configuration errors are not retry-worthy
                log_health_event "ERROR" "Configuration error - not retrying"
                echo "$last_result"
                return "$last_exit_code"
                ;;
            *)
                # Other errors might be retry-worthy
                ;;
        esac
        
        # Don't delay after the last attempt
        if [[ $attempt -le $max_retries ]]; then
            # Implement exponential backoff delay with jitter for distributed health checking
            local delay_seconds
            delay_seconds=$((base_delay * (2 ** (attempt - 1))))
            
            # Add jitter to prevent thundering herd
            local jitter
            jitter=$((RANDOM % base_delay + 1))
            delay_seconds=$((delay_seconds + jitter))
            
            # Cap maximum delay at 60 seconds
            if [[ $delay_seconds -gt 60 ]]; then
                delay_seconds=60
            fi
            
            log_health_event "INFO" "Health check failed, retrying in ${delay_seconds}s" \
                "{\"correlation_id\":\"$correlation_id\",\"attempt\":$attempt,\"exit_code\":$last_exit_code,\"delay\":$delay_seconds}"
            
            sleep "$delay_seconds"
        fi
    done
    
    # Handle maximum retry exhaustion with appropriate error status and reporting
    log_health_event "ERROR" "Health check failed after $((max_retries + 1)) attempts" \
        "{\"correlation_id\":\"$correlation_id\",\"check_type\":\"$check_type\",\"final_exit_code\":$last_exit_code,\"attempts\":$((max_retries + 1))}"
    
    # Return final health check result with retry statistics and outcome
    local final_result
    final_result=$(echo "$last_result" | jq --arg attempts "$((max_retries + 1))" --arg correlation_id "$correlation_id" '. + {retry_attempts: ($attempts | tonumber), final_correlation_id: $correlation_id}' 2>/dev/null || echo "$last_result")
    
    echo "$final_result"
    return "$last_exit_code"
}

# =============================================================================
# RESPONSE VALIDATION AND ANALYSIS FUNCTIONS
# =============================================================================

/**
 * Validates health endpoint response format including JSON structure, required 
 * fields, and data types for consistent health information. Parses JSON response 
 * and validates basic JSON structure integrity, verifies required fields exist 
 * for specific endpoint type, validates data types and value ranges for health 
 * status fields, checks timestamp format and recency.
 */
validate_response_format() {
    local response_body="$1"
    local endpoint_type="$2"
    local correlation_id="validate-$(date +%s)-$$"
    
    log_health_event "INFO" "Validating response format" \
        "{\"correlation_id\":\"$correlation_id\",\"endpoint_type\":\"$endpoint_type\"}"
    
    # Parse JSON response and validate basic JSON structure integrity
    if ! echo "$response_body" | jq . >/dev/null 2>&1; then
        log_health_event "ERROR" "Response is not valid JSON" \
            "{\"correlation_id\":\"$correlation_id\",\"endpoint_type\":\"$endpoint_type\"}"
        
        echo "{\"status\":\"error\",\"validation\":\"failed\",\"error\":\"invalid_json\",\"endpoint_type\":\"$endpoint_type\"}"
        return "$EXIT_INVALID_RESPONSE"
    fi
    
    # Verify required fields exist for specific endpoint type (health, liveness, readiness)
    local required_fields=()
    case "$endpoint_type" in
        "health")
            required_fields=("status" "timestamp")
            ;;
        "liveness")
            required_fields=("status" "alive")
            ;;
        "readiness")
            required_fields=("status" "ready")
            ;;
        *)
            log_health_event "WARN" "Unknown endpoint type for validation: $endpoint_type"
            ;;
    esac
    
    local missing_fields=()
    for field in "${required_fields[@]}"; do
        if ! echo "$response_body" | jq -e ".$field" >/dev/null 2>&1; then
            missing_fields+=("$field")
        fi
    done
    
    if [[ ${#missing_fields[@]} -gt 0 ]]; then
        log_health_event "ERROR" "Response missing required fields" \
            "{\"correlation_id\":\"$correlation_id\",\"endpoint_type\":\"$endpoint_type\",\"missing_fields\":[$(printf '"%s",' "${missing_fields[@]}" | sed 's/,$//')]]}"
        
        echo "{\"status\":\"error\",\"validation\":\"failed\",\"error\":\"missing_fields\",\"missing_fields\":[$(printf '"%s",' "${missing_fields[@]}" | sed 's/,$//')]}"
        return "$EXIT_INVALID_RESPONSE"
    fi
    
    # Validate data types and value ranges for health status fields
    local status
    status=$(echo "$response_body" | jq -r '.status // ""')
    
    local valid_statuses=("healthy" "unhealthy" "degraded" "ok" "error")
    local status_valid=false
    
    for valid_status in "${valid_statuses[@]}"; do
        if [[ "$status" == "$valid_status" ]]; then
            status_valid=true
            break
        fi
    done
    
    if [[ "$status_valid" != "true" ]]; then
        log_health_event "WARN" "Invalid status value in response" \
            "{\"correlation_id\":\"$correlation_id\",\"status\":\"$status\",\"valid_statuses\":[$(printf '"%s",' "${valid_statuses[@]}" | sed 's/,$//')]]}"
    fi
    
    # Check timestamp format and recency for health information currency
    if [[ "$endpoint_type" == "health" ]]; then
        local timestamp
        timestamp=$(echo "$response_body" | jq -r '.timestamp // ""')
        
        if [[ -n "$timestamp" ]]; then
            # Verify timestamp is recent (within last 5 minutes)
            local current_time
            current_time=$(date +%s)
            local response_time
            response_time=$(date -d "$timestamp" +%s 2>/dev/null || echo "0")
            local time_diff
            time_diff=$((current_time - response_time))
            
            if [[ $time_diff -gt 300 ]]; then # 5 minutes
                log_health_event "WARN" "Health response timestamp is not recent" \
                    "{\"correlation_id\":\"$correlation_id\",\"timestamp\":\"$timestamp\",\"age_seconds\":$time_diff}"
            fi
        fi
    fi
    
    # Verify application metadata presence (name, version) for context validation
    local app_name
    app_name=$(echo "$response_body" | jq -r '.application.name // ""' 2>/dev/null || echo "")
    
    if [[ -n "$app_name" && "$app_name" != "$APP_NAME" ]]; then
        log_health_event "WARN" "Unexpected application name in response" \
            "{\"correlation_id\":\"$correlation_id\",\"expected\":\"$APP_NAME\",\"actual\":\"$app_name\"}"
    fi
    
    # Return comprehensive format validation result with specific compliance details
    log_health_event "INFO" "Response format validation completed" \
        "{\"correlation_id\":\"$correlation_id\",\"endpoint_type\":\"$endpoint_type\",\"validation\":\"passed\"}"
    
    echo "{\"status\":\"success\",\"validation\":\"passed\",\"endpoint_type\":\"$endpoint_type\",\"response_status\":\"$status\"}"
    return "$EXIT_SUCCESS"
}

/**
 * Measures and validates health endpoint response performance including response 
 * time, throughput, and performance threshold compliance. Compares response time 
 * against endpoint-specific performance thresholds, evaluates response size and 
 * payload efficiency, calculates performance percentile ranking, determines 
 * performance compliance status for SLA monitoring.
 */
measure_response_performance() {
    local response_time_ms="$1"
    local endpoint_type="$2"
    local response_size_bytes="${3:-0}"
    local correlation_id="perf-$(date +%s)-$$"
    
    log_health_event "INFO" "Measuring response performance" \
        "{\"correlation_id\":\"$correlation_id\",\"endpoint_type\":\"$endpoint_type\",\"response_time\":$response_time_ms,\"size_bytes\":$response_size_bytes}"
    
    # Compare response time against endpoint-specific performance thresholds
    local threshold_ms
    local performance_rating
    local compliance_status
    
    case "$endpoint_type" in
        "health")
            threshold_ms="$HEALTH_RESPONSE_THRESHOLD_MS"
            ;;
        "liveness")
            threshold_ms="$LIVENESS_RESPONSE_THRESHOLD_MS"
            ;;
        "readiness")
            threshold_ms="$READINESS_RESPONSE_THRESHOLD_MS"
            ;;
        *)
            threshold_ms="50" # Default threshold
            ;;
    esac
    
    # Determine performance compliance status for SLA monitoring
    if (( $(echo "$response_time_ms <= $threshold_ms" | bc -l) )); then
        performance_rating="excellent"
        compliance_status="compliant"
    elif (( $(echo "$response_time_ms <= ($threshold_ms * 2)" | bc -l) )); then
        performance_rating="good"
        compliance_status="compliant"
    elif (( $(echo "$response_time_ms <= ($threshold_ms * 4)" | bc -l) )); then
        performance_rating="acceptable"
        compliance_status="degraded"
    else
        performance_rating="poor"
        compliance_status="non_compliant"
    fi
    
    # Evaluate response size and payload efficiency for network optimization
    local size_rating="unknown"
    if [[ $response_size_bytes -gt 0 ]]; then
        if [[ $response_size_bytes -lt 1024 ]]; then
            size_rating="optimal"
        elif [[ $response_size_bytes -lt 4096 ]]; then
            size_rating="good"
        elif [[ $response_size_bytes -lt 16384 ]]; then
            size_rating="acceptable"
        else
            size_rating="large"
        fi
    fi
    
    # Calculate performance percentile ranking based on baseline measurements
    local percentile_rank="unknown"
    if (( $(echo "$response_time_ms <= 10" | bc -l) )); then
        percentile_rank="p99"
    elif (( $(echo "$response_time_ms <= 25" | bc -l) )); then
        percentile_rank="p95"
    elif (( $(echo "$response_time_ms <= 50" | bc -l) )); then
        percentile_rank="p90"
    elif (( $(echo "$response_time_ms <= 100" | bc -l) )); then
        percentile_rank="p75"
    else
        percentile_rank="p50_or_below"
    fi
    
    # Generate performance recommendations for optimization opportunities
    local recommendations=()
    
    if [[ "$compliance_status" == "non_compliant" ]]; then
        recommendations+=("optimize_response_time")
    fi
    
    if [[ "$size_rating" == "large" ]]; then
        recommendations+=("reduce_payload_size")
    fi
    
    if [[ "$endpoint_type" == "liveness" && $(echo "$response_time_ms > 5" | bc -l) -eq 1 ]]; then
        recommendations+=("optimize_liveness_probe")
    fi
    
    # Create performance measurement report with detailed metrics and analysis
    log_health_event "INFO" "Performance measurement completed" \
        "{\"correlation_id\":\"$correlation_id\",\"endpoint_type\":\"$endpoint_type\",\"performance_rating\":\"$performance_rating\",\"compliance\":\"$compliance_status\",\"percentile\":\"$percentile_rank\"}"
    
    # Return performance evaluation with threshold compliance and improvement suggestions
    local recommendations_json="[]"
    if [[ ${#recommendations[@]} -gt 0 ]]; then
        recommendations_json="[$(printf '"%s",' "${recommendations[@]}" | sed 's/,$//')]"
    fi
    
    echo "{\"status\":\"success\",\"response_time_ms\":$response_time_ms,\"threshold_ms\":$threshold_ms,\"performance_rating\":\"$performance_rating\",\"compliance\":\"$compliance_status\",\"size_bytes\":$response_size_bytes,\"size_rating\":\"$size_rating\",\"percentile_rank\":\"$percentile_rank\",\"recommendations\":$recommendations_json}"
    
    return "$EXIT_SUCCESS"
}

# =============================================================================
# REPORTING AND NOTIFICATION FUNCTIONS
# =============================================================================

/**
 * Generates comprehensive health check report with executive summary, detailed 
 * results, performance metrics, and operational recommendations. Compiles health 
 * check results from all endpoint validations, generates executive summary with 
 * overall health status and key metrics, creates detailed endpoint analysis, 
 * includes performance metrics and SLA compliance analysis.
 */
generate_health_report() {
    local health_results="$1"
    local output_format="${2:-text}"
    local correlation_id="report-$(date +%s)-$$"
    
    log_health_event "INFO" "Generating comprehensive health check report" \
        "{\"correlation_id\":\"$correlation_id\",\"format\":\"$output_format\"}"
    
    # Create report timestamp and metadata
    local report_timestamp
    report_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local report_file="${PROJECT_ROOT}/logs/health-report_$(date +"%Y%m%d_%H%M%S").$output_format"
    
    # Ensure reports directory exists
    mkdir -p "$(dirname "$report_file")"
    
    # Parse health results (assuming JSON format)
    local overall_status="unknown"
    local total_checks=0
    local successful_checks=0
    local failed_checks=0
    local average_response_time=0
    
    if echo "$health_results" | jq . >/dev/null 2>&1; then
        total_checks=$(echo "$health_results" | jq '.checks | length' 2>/dev/null || echo "0")
        successful_checks=$(echo "$health_results" | jq '[.checks[] | select(.status == "success")] | length' 2>/dev/null || echo "0")
        failed_checks=$((total_checks - successful_checks))
        
        if [[ $failed_checks -eq 0 ]]; then
            overall_status="healthy"
        elif [[ $successful_checks -eq 0 ]]; then
            overall_status="unhealthy"
        else
            overall_status="degraded"
        fi
        
        # Calculate average response time
        local total_response_time
        total_response_time=$(echo "$health_results" | jq '[.checks[].response_time_ms] | add' 2>/dev/null || echo "0")
        if [[ $total_checks -gt 0 ]]; then
            average_response_time=$(echo "scale=2; $total_response_time / $total_checks" | bc 2>/dev/null || echo "0")
        fi
    fi
    
    # Generate report in requested format
    case "$output_format" in
        "json")
            generate_json_report "$report_file" "$health_results" "$overall_status" "$report_timestamp" "$correlation_id"
            ;;
        "html")
            generate_html_report "$report_file" "$health_results" "$overall_status" "$report_timestamp" "$correlation_id"
            ;;
        "text"|*)
            generate_text_report "$report_file" "$health_results" "$overall_status" "$report_timestamp" "$correlation_id"
            ;;
    esac
    
    local report_exit_code=$?
    
    if [[ $report_exit_code -eq 0 ]]; then
        log_health_event "INFO" "Health check report generated successfully" \
            "{\"correlation_id\":\"$correlation_id\",\"file\":\"$report_file\",\"format\":\"$output_format\",\"overall_status\":\"$overall_status\"}"
        
        echo "$report_file"
        return "$EXIT_SUCCESS"
    else
        log_health_event "ERROR" "Failed to generate health check report" \
            "{\"correlation_id\":\"$correlation_id\",\"format\":\"$output_format\"}"
        
        return "$EXIT_FAILURE"
    fi
}

# Helper function to generate text format report
generate_text_report() {
    local report_file="$1"
    local health_results="$2"
    local overall_status="$3"
    local report_timestamp="$4"
    local correlation_id="$5"
    
    cat > "$report_file" << EOF
================================================================================
HEALTH CHECK REPORT - NODE.JS TUTORIAL APPLICATION
================================================================================

Report Generated: $report_timestamp
Correlation ID: $correlation_id
Overall Status: $overall_status
Application: $APP_NAME v$APP_VERSION

================================================================================
EXECUTIVE SUMMARY
================================================================================

The health check assessment has been completed for the Node.js tutorial 
application. This report provides comprehensive analysis of all health 
endpoints including basic health status, Kubernetes liveness probes, 
and readiness probes.

Overall Assessment: $overall_status

================================================================================
ENDPOINT ANALYSIS
================================================================================

EOF

    # Add detailed endpoint results if available
    if echo "$health_results" | jq . >/dev/null 2>&1; then
        echo "$health_results" | jq -r '.checks[] | "Endpoint: " + (.endpoint // "unknown") + "\nStatus: " + (.status // "unknown") + "\nResponse Time: " + (.response_time_ms // 0 | tostring) + "ms\nDetails: " + (.details // "none") + "\n"' 2>/dev/null >> "$report_file" || true
    fi
    
    cat >> "$report_file" << EOF

================================================================================
RECOMMENDATIONS
================================================================================

1. Monitor response times to ensure they remain under performance thresholds
2. Review any failed health checks for operational issues
3. Consider implementing alerting for degraded health status
4. Regularly validate health check endpoints in production

Report Location: $report_file

EOF

    return 0
}

# Helper function to generate JSON format report
generate_json_report() {
    local report_file="$1"
    local health_results="$2"
    local overall_status="$3"
    local report_timestamp="$4"
    local correlation_id="$5"
    
    local json_report
    json_report=$(cat << EOF
{
    "report": {
        "timestamp": "$report_timestamp",
        "correlation_id": "$correlation_id",
        "overall_status": "$overall_status",
        "application": {
            "name": "$APP_NAME",
            "version": "$APP_VERSION"
        },
        "summary": {
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "average_response_time_ms": 0
        },
        "checks": [],
        "recommendations": [
            "Monitor response times to ensure they remain under performance thresholds",
            "Review any failed health checks for operational issues",
            "Consider implementing alerting for degraded health status"
        ]
    }
}
EOF
    )
    
    # Merge with actual health results if available
    if echo "$health_results" | jq . >/dev/null 2>&1; then
        json_report=$(echo "$json_report" | jq --argjson results "$health_results" '.report.checks = $results.checks // []' 2>/dev/null || echo "$json_report")
    fi
    
    echo "$json_report" > "$report_file"
    return 0
}

# Helper function to generate HTML format report
generate_html_report() {
    local report_file="$1"
    local health_results="$2"
    local overall_status="$3"
    local report_timestamp="$4"
    local correlation_id="$5"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Health Check Report - $APP_NAME</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .status-healthy { color: green; font-weight: bold; }
        .status-unhealthy { color: red; font-weight: bold; }
        .status-degraded { color: orange; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Health Check Report</h1>
        <p><strong>Application:</strong> $APP_NAME v$APP_VERSION</p>
        <p><strong>Generated:</strong> $report_timestamp</p>
        <p><strong>Overall Status:</strong> <span class="status-$overall_status">$overall_status</span></p>
        <p><strong>Correlation ID:</strong> $correlation_id</p>
    </div>
    
    <h2>Health Check Results</h2>
    <p>Detailed analysis of health endpoint validation results.</p>
    
    <h2>Recommendations</h2>
    <ul>
        <li>Monitor response times to ensure they remain under performance thresholds</li>
        <li>Review any failed health checks for operational issues</li>
        <li>Consider implementing alerting for degraded health status</li>
    </ul>
</body>
</html>
EOF

    return 0
}

/**
 * Sends health check notifications to configured endpoints including webhooks, 
 * monitoring systems, and alerting platforms with structured data. Checks for 
 * configured notification endpoints and authentication credentials, formats health 
 * status data for specific notification platform requirements, sends health status 
 * notification to webhook endpoints with retry logic.
 */
send_health_check_notification() {
    local health_status="$1"
    local notification_type="${2:-webhook}"
    local correlation_id="notify-$(date +%s)-$$"
    
    if [[ "$ENABLE_NOTIFICATIONS" != "true" ]]; then
        log_health_event "INFO" "Notifications disabled - skipping notification"
        return 0
    fi
    
    log_health_event "INFO" "Sending health check notification" \
        "{\"correlation_id\":\"$correlation_id\",\"type\":\"$notification_type\"}"
    
    # Check for configured notification endpoints and authentication credentials
    if [[ -z "$NOTIFICATION_WEBHOOK" ]]; then
        log_health_event "WARN" "No notification webhook configured" \
            "{\"correlation_id\":\"$correlation_id\"}"
        return 1
    fi
    
    # Format health status data for specific notification platform requirements
    local notification_payload
    notification_payload=$(cat << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
    "service": "$APP_NAME",
    "version": "$APP_VERSION",
    "correlation_id": "$correlation_id",
    "health_status": $health_status,
    "notification_type": "$notification_type",
    "source": "health-check-automation"
}
EOF
    )
    
    # Send health status notification to webhook endpoints with retry logic
    local notification_attempts=3
    local attempt=0
    local success=false
    
    while [[ $attempt -lt $notification_attempts && "$success" != "true" ]]; do
        attempt=$((attempt + 1))
        
        log_health_event "INFO" "Sending notification attempt $attempt" \
            "{\"correlation_id\":\"$correlation_id\",\"attempt\":$attempt,\"webhook\":\"${NOTIFICATION_WEBHOOK%/*}/***\"}"
        
        if curl -s --max-time 30 \
           --header "Content-Type: application/json" \
           --header "User-Agent: nodejs-tutorial-health-notifier/1.0.0" \
           --data "$notification_payload" \
           "$NOTIFICATION_WEBHOOK" >/dev/null 2>&1; then
            
            success=true
            log_health_event "INFO" "Notification sent successfully" \
                "{\"correlation_id\":\"$correlation_id\",\"attempt\":$attempt}"
        else
            log_health_event "WARN" "Notification attempt failed" \
                "{\"correlation_id\":\"$correlation_id\",\"attempt\":$attempt}"
            
            if [[ $attempt -lt $notification_attempts ]]; then
                sleep $((attempt * 2))
            fi
        fi
    done
    
    # Return notification success status with delivery confirmation details
    if [[ "$success" == "true" ]]; then
        return 0
    else
        log_health_event "ERROR" "Failed to send notification after $notification_attempts attempts" \
            "{\"correlation_id\":\"$correlation_id\"}"
        return 1
    fi
}

# =============================================================================
# CLEANUP AND RESOURCE MANAGEMENT FUNCTIONS
# =============================================================================

# Helper function to clean up temporary files
cleanup_temp_files() {
    for file in "$@"; do
        if [[ -f "$file" ]]; then
            rm -f "$file" 2>/dev/null || true
        fi
    done
}

/**
 * Cleans up temporary health check resources, maintains log retention policies, 
 * and optimizes storage usage for sustainable operations. Cleans up temporary 
 * health check files and response data, rotates health check logs based on 
 * retention policies, archives old health check reports, preserves current 
 * session logs if requested for debugging.
 */
cleanup_health_check_resources() {
    local preserve_logs="${1:-false}"
    local correlation_id="cleanup-$(date +%s)-$$"
    
    log_health_event "INFO" "Starting health check resource cleanup" \
        "{\"correlation_id\":\"$correlation_id\",\"preserve_logs\":\"$preserve_logs\"}"
    
    # Clean up temporary health check files and response data
    find /tmp -name "tmp.*" -user "$(whoami)" -mtime +1 -exec rm -f {} \; 2>/dev/null || true
    
    # Rotate health check logs based on retention policies
    local logs_dir
    logs_dir="$(dirname "$LOG_FILE")"
    
    if [[ -d "$logs_dir" ]]; then
        # Keep only last 30 days of logs unless preserve_logs is true
        if [[ "$preserve_logs" != "true" ]]; then
            find "$logs_dir" -name "health-check_*.log" -mtime +30 -exec rm -f {} \; 2>/dev/null || true
        fi
        
        # Archive old health check reports for historical analysis
        find "$logs_dir" -name "health-report_*" -mtime +7 -exec gzip {} \; 2>/dev/null || true
        find "$logs_dir" -name "health-report_*.gz" -mtime +30 -exec rm -f {} \; 2>/dev/null || true
    fi
    
    # Optimize log directory storage and remove expired entries
    local log_dir_size
    if command -v du >/dev/null 2>&1; then
        log_dir_size=$(du -sh "$logs_dir" 2>/dev/null | cut -f1 || echo "unknown")
        
        log_health_event "INFO" "Log directory size after cleanup: $log_dir_size" \
            "{\"correlation_id\":\"$correlation_id\",\"directory\":\"$logs_dir\",\"size\":\"$log_dir_size\"}"
    fi
    
    # Update health check statistics and operational metrics
    local cleanup_timestamp
    cleanup_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    log_health_event "INFO" "Resource cleanup completed successfully" \
        "{\"correlation_id\":\"$correlation_id\",\"timestamp\":\"$cleanup_timestamp\",\"preserve_logs\":\"$preserve_logs\"}"
}

# =============================================================================
# MAIN EXECUTION FUNCTION
# =============================================================================

/**
 * Main health check orchestration function that parses arguments, validates 
 * configuration, and executes comprehensive health validation workflow. Parses 
 * and validates command line arguments, initializes logging system with timestamp 
 * and health check context, validates health check prerequisites, loads health 
 * check configuration, executes basic health endpoint validation with retry logic.
 */
main() {
    local args=("$@")
    local start_time
    start_time=$(date +%s)
    
    # Parse and validate command line arguments for health check configuration
    parse_health_check_arguments "$@"
    
    # Initialize logging system with timestamp and health check context
    log_health_event "INFO" "Health check automation started" \
        "{\"timestamp\":\"$HEALTH_CHECK_TIMESTAMP\",\"base_url\":\"$BASE_URL\",\"timeout\":$TIMEOUT,\"retries\":$RETRIES}"
    
    # Validate health check prerequisites including network connectivity and tool availability
    if ! validate_health_check_prerequisites; then
        log_health_event "ERROR" "Health check prerequisites validation failed"
        exit "$EXIT_CONFIG_ERROR"
    fi
    
    # Load health check configuration from environment variables and defaults
    load_health_check_configuration
    
    # Initialize results tracking
    local overall_results='{"checks":[],"summary":{"start_time":"'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}}'
    local final_exit_code="$EXIT_SUCCESS"
    
    # Execute basic health endpoint validation with retry logic and timeout handling
    log_health_event "INFO" "Starting health endpoint validation"
    
    local health_result
    health_result=$(perform_health_check_with_retries "health" "$BASE_URL" "$RETRIES" "$RETRY_DELAY")
    local health_exit_code=$?
    
    # Add health check result to overall results
    overall_results=$(echo "$overall_results" | jq --argjson result "{\"endpoint\":\"health\",\"status\":\"$(if [[ $health_exit_code -eq 0 ]]; then echo "success"; else echo "failure"; fi)\",\"exit_code\":$health_exit_code,\"result\":$health_result}" '.checks += [$result]')
    
    if [[ $health_exit_code -ne 0 ]]; then
        final_exit_code="$health_exit_code"
    fi
    
    # Perform Kubernetes liveness and readiness probe validation
    log_health_event "INFO" "Starting Kubernetes probe validation"
    
    local liveness_result
    liveness_result=$(perform_health_check_with_retries "liveness" "$BASE_URL" "$RETRIES" "$RETRY_DELAY")
    local liveness_exit_code=$?
    
    overall_results=$(echo "$overall_results" | jq --argjson result "{\"endpoint\":\"liveness\",\"status\":\"$(if [[ $liveness_exit_code -eq 0 ]]; then echo "success"; else echo "failure"; fi)\",\"exit_code\":$liveness_exit_code,\"result\":$liveness_result}" '.checks += [$result]')
    
    if [[ $liveness_exit_code -ne 0 && $final_exit_code -eq 0 ]]; then
        final_exit_code="$liveness_exit_code"
    fi
    
    local readiness_result
    readiness_result=$(perform_health_check_with_retries "readiness" "$BASE_URL" "$RETRIES" "$RETRY_DELAY")
    local readiness_exit_code=$?
    
    overall_results=$(echo "$overall_results" | jq --argjson result "{\"endpoint\":\"readiness\",\"status\":\"$(if [[ $readiness_exit_code -eq 0 ]]; then echo "success"; else echo "failure"; fi)\",\"exit_code\":$readiness_exit_code,\"result\":$readiness_result}" '.checks += [$result]')
    
    if [[ $readiness_exit_code -ne 0 && $final_exit_code -eq 0 ]]; then
        final_exit_code="$readiness_exit_code"
    fi
    
    # Validate detailed health information and system metrics
    if [[ "$DETAILED_HEALTH" == "true" ]]; then
        log_health_event "INFO" "Starting detailed health validation"
        
        local detailed_result
        detailed_result=$(perform_health_check_with_retries "detailed" "$BASE_URL" "$RETRIES" "$RETRY_DELAY")
        local detailed_exit_code=$?
        
        overall_results=$(echo "$overall_results" | jq --argjson result "{\"endpoint\":\"detailed_health\",\"status\":\"$(if [[ $detailed_exit_code -eq 0 ]]; then echo "success"; else echo "failure"; fi)\",\"exit_code\":$detailed_exit_code,\"result\":$detailed_result}" '.checks += [$result]')
        
        if [[ $detailed_exit_code -ne 0 && $final_exit_code -eq 0 ]]; then
            final_exit_code="$detailed_exit_code"
        fi
    fi
    
    # Calculate execution time
    local end_time
    end_time=$(date +%s)
    local execution_time
    execution_time=$((end_time - start_time))
    
    # Update results summary
    overall_results=$(echo "$overall_results" | jq --arg end_time "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")" --arg duration "$execution_time" '.summary.end_time = $end_time | .summary.duration_seconds = ($duration | tonumber)')
    
    # Generate comprehensive health check report with status and metrics
    log_health_event "INFO" "Generating health check report"
    
    local report_file
    report_file=$(generate_health_report "$overall_results" "$OUTPUT_FORMAT")
    local report_exit_code=$?
    
    if [[ $report_exit_code -eq 0 ]]; then
        log_health_event "INFO" "Health check report generated: $report_file"
    else
        log_health_event "WARN" "Failed to generate health check report"
    fi
    
    # Send notifications if enabled
    if [[ "$ENABLE_NOTIFICATIONS" == "true" ]]; then
        send_health_check_notification "$overall_results" "webhook"
    fi
    
    # Log health check completion and exit with appropriate status code
    local final_status
    if [[ $final_exit_code -eq 0 ]]; then
        final_status="success"
    else
        final_status="failure"
    fi
    
    log_health_event "INFO" "Health check automation completed" \
        "{\"status\":\"$final_status\",\"exit_code\":$final_exit_code,\"duration_seconds\":$execution_time,\"report\":\"$(basename "$report_file" 2>/dev/null || echo "none")\"}"
    
    # Display summary to user
    if [[ "$QUIET" != "true" ]]; then
        echo
        echo "=================================================================================="
        echo "HEALTH CHECK SUMMARY"
        echo "=================================================================================="
        echo "Overall Status: $final_status"
        echo "Exit Code: $final_exit_code"
        echo "Duration: ${execution_time}s"
        echo "Report: $report_file"
        echo "Log File: $LOG_FILE"
        echo "=================================================================================="
        echo
    fi
    
    # Cleanup resources
    cleanup_health_check_resources "false"
    
    exit "$final_exit_code"
}

# Execute main function with all command line arguments if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

# Export functions for external use and testing
export -f check_basic_health
export -f check_liveness_probe
export -f check_readiness_probe
export -f perform_health_check_with_retries
export -f generate_health_report
export -f validate_response_format
export -f log_health_event