#!/bin/bash

# Node.js Tutorial Backend Infrastructure Backup Script
# 
# This script automates the backup of all critical infrastructure and configuration files
# for the Node.js tutorial backend, supporting disaster recovery, migration, and reproducible
# infrastructure management. It creates timestamped archives of essential deployment and 
# configuration artifacts that can be safely stored, versioned, or transferred.
#
# Features:
# - Backs up environment variable templates, package.json, Docker Compose files
# - Includes Kubernetes manifests (deployments, services, configmaps, secrets)
# - Creates compressed tar.gz archives with timestamps
# - Implements retention policy for old backup management
# - Supports both interactive and automated (CI/CD) usage
# - Follows security best practices for sensitive configuration handling
# - Preserves directory structure for easy restoration
#
# Security Considerations:
# - Backup archives containing secrets should be stored securely
# - Access to backup archives should be restricted
# - Consider encrypting backups if they contain sensitive data
# - Do not commit backup archives to version control
#
# Usage:
#   ./infrastructure/scripts/backup.sh [options]
#   
# Options:
#   --max-backups, -m N    Keep only the last N backup archives (default: 7)
#   --no-cleanup           Skip temporary directory cleanup after archiving
#   --setup-env            Run setup-env.sh before backup to ensure current environment
#   --quiet, -q            Suppress informational messages (errors still shown)
#   --help, -h             Show this help message
#
# Exit codes:
#   0 = Success
#   1 = General error
#   2 = File copy error
#   3 = Archive creation error
#   4 = Missing source files
#   5 = Setup environment error
#
# Author: Tutorial Development Team
# Version: 1.0.0
# Compatible with: Node.js v22.x LTS, Express.js v5.1.0

set -euo pipefail  # Exit on error, undefined variables, or pipe failures

# =============================================================================
# GLOBAL CONFIGURATION
# =============================================================================

# Backup configuration - relative paths from project root
readonly BACKUP_ROOT="./backups"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly BACKUP_DIR="./backups/backup_${TIMESTAMP}"
readonly ARCHIVE_NAME="infrastructure_backup_${TIMESTAMP}.tar.gz"

# Script metadata
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_DESCRIPTION="Node.js Tutorial Backend Infrastructure Backup"

# Files to backup - comprehensive list of critical infrastructure and configuration files
# These paths are relative to the project root and match the system architecture requirements
readonly -a FILES_TO_BACKUP=(
    # Environment and configuration templates
    "src/backend/.env.example"                                    # Canonical environment variable template
    "src/backend/package.json"                                    # Dependency and engine constraints for reproducible builds
    
    # Docker Compose configurations for container orchestration
    "infrastructure/docker/docker-compose.prod.yml"              # Production Docker Compose configuration
    "infrastructure/docker/docker-compose.dev.yml"               # Development Docker Compose configuration
    "src/backend/docker-compose.yml"                             # Default backend Compose file
    
    # Kubernetes deployment manifests for container orchestration
    "infrastructure/kubernetes/backend-deployment.yaml"          # Kubernetes Deployment manifest
    "infrastructure/kubernetes/backend-service.yaml"             # Kubernetes Service manifest
    "infrastructure/kubernetes/configmaps/backend-config.yaml"   # Kubernetes ConfigMap for backend configuration
    "infrastructure/kubernetes/secrets/backend-secrets.yaml"     # Kubernetes Secret manifest for sensitive configuration
)

# Default option values
DEFAULT_MAX_BACKUPS=7
KEEP_TEMP_DIR=false
RUN_SETUP_ENV=false
QUIET_MODE=false
MAX_BACKUPS=$DEFAULT_MAX_BACKUPS

# Color codes for output formatting (disabled in non-interactive environments)
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
    readonly RED=$(tput setaf 1)
    readonly GREEN=$(tput setaf 2)
    readonly YELLOW=$(tput setaf 3)
    readonly BLUE=$(tput setaf 4)
    readonly CYAN=$(tput setaf 6)
    readonly BOLD=$(tput bold)
    readonly RESET=$(tput sgr0)
else
    readonly RED=""
    readonly GREEN=""
    readonly YELLOW=""
    readonly BLUE=""
    readonly CYAN=""
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

# Print step header with enhanced formatting
print_step() {
    if [[ "$QUIET_MODE" != true ]]; then
        echo ""
        echo "${CYAN}${BOLD}=== $* ===${RESET}"
    fi
}

# Print usage information
print_usage() {
    cat << EOF
${BOLD}$SCRIPT_DESCRIPTION${RESET}

${BOLD}USAGE:${RESET}
    $SCRIPT_NAME [options]

${BOLD}DESCRIPTION:${RESET}
    Automates backup of all critical infrastructure and configuration files for the Node.js
    tutorial backend. Creates timestamped archives supporting disaster recovery, migration,
    and reproducible infrastructure management scenarios.

${BOLD}OPTIONS:${RESET}
    -m, --max-backups N    Keep only the last N backup archives (default: $DEFAULT_MAX_BACKUPS)
    --no-cleanup           Skip temporary directory cleanup after archiving
    --setup-env            Run setup-env.sh before backup to ensure current environment
    -q, --quiet            Suppress informational messages (errors still shown)
    -h, --help             Show this help message

${BOLD}EXAMPLES:${RESET}
    $SCRIPT_NAME                          # Standard backup with default retention
    $SCRIPT_NAME --max-backups 14         # Keep last 14 backups (2 weeks)
    $SCRIPT_NAME --setup-env --quiet      # Run env setup silently before backup
    $SCRIPT_NAME --no-cleanup             # Keep temporary directory for debugging

${BOLD}FILES BACKED UP:${RESET}
    Environment Templates:
      - src/backend/.env.example
      - src/backend/package.json
    
    Docker Configurations:
      - infrastructure/docker/docker-compose.prod.yml
      - infrastructure/docker/docker-compose.dev.yml
      - src/backend/docker-compose.yml
    
    Kubernetes Manifests:
      - infrastructure/kubernetes/backend-deployment.yaml
      - infrastructure/kubernetes/backend-service.yaml
      - infrastructure/kubernetes/configmaps/backend-config.yaml
      - infrastructure/kubernetes/secrets/backend-secrets.yaml

${BOLD}SECURITY NOTES:${RESET}
    - Backup archives may contain sensitive configuration data
    - Store backup archives in secure locations with restricted access
    - Consider encrypting archives containing secrets
    - Do not commit backup archives to version control systems

${BOLD}EXIT CODES:${RESET}
    0 = Success
    1 = General error
    2 = File copy error
    3 = Archive creation error
    4 = Missing source files
    5 = Setup environment error

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

# Validate required external tools are available
check_dependencies() {
    print_info "Checking required dependencies..."
    
    local missing_tools=()
    
    # Check for tar command (GNU coreutils 1.34+)
    if ! command_exists tar; then
        missing_tools+=("tar")
    fi
    
    # Check for date command (coreutils 8.32+)
    if ! command_exists date; then
        missing_tools+=("date")
    fi
    
    # Check for mkdir command (coreutils 8.32+)
    if ! command_exists mkdir; then
        missing_tools+=("mkdir")
    fi
    
    # Check for cp command (coreutils 8.32+)
    if ! command_exists cp; then
        missing_tools+=("cp")
    fi
    
    # Check for find command (findutils 4.7+) - optional for cleanup
    if ! command_exists find; then
        print_warning "find command not available - old backup cleanup will be limited"
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            print_error "  - $tool"
        done
        print_error "Please install missing tools and try again."
        return 1
    fi
    
    print_info "All required dependencies are available."
    return 0
}

# =============================================================================
# CORE BACKUP FUNCTIONS
# =============================================================================

# Check if all source files exist before starting backup
check_source_files() {
    print_info "Validating source files for backup..."
    
    local project_root
    project_root="$(get_project_root)"
    
    local missing_files=()
    local file_count=0
    
    for file in "${FILES_TO_BACKUP[@]}"; do
        local full_path="$project_root/$file"
        
        if [[ ! -f "$full_path" ]]; then
            missing_files+=("$file")
        else
            ((file_count++))
            print_info "  ✓ Found: $file"
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_error "Missing source files (backup will be incomplete):"
        for file in "${missing_files[@]}"; do
            print_error "  - $file"
        done
        
        print_warning "Found $file_count of ${#FILES_TO_BACKUP[@]} expected files"
        
        # In CI/CD or quiet mode, treat missing files as error
        if [[ ! -t 0 ]] || [[ "$QUIET_MODE" == true ]]; then
            print_error "Aborting backup due to missing critical files"
            return 4
        fi
        
        # In interactive mode, ask user if they want to continue
        echo -n "Continue with incomplete backup? [y/N]: "
        read -r response
        case "$response" in
            [yY]|[yY][eE][sS])
                print_warning "Continuing with incomplete backup..."
                ;;
            *)
                print_error "Backup aborted by user"
                return 4
                ;;
        esac
    else
        print_success "All $file_count source files found and accessible"
    fi
    
    return 0
}

# Copy all files listed in FILES_TO_BACKUP to the backup directory, preserving directory structure
copy_files() {
    print_info "Copying files to backup directory..."
    
    local project_root
    project_root="$(get_project_root)"
    
    local copied_count=0
    local failed_count=0
    
    for file in "${FILES_TO_BACKUP[@]}"; do
        local source_path="$project_root/$file"
        local target_path="$project_root/$BACKUP_DIR/$file"
        local target_dir
        target_dir="$(dirname "$target_path")"
        
        # Skip if source file doesn't exist
        if [[ ! -f "$source_path" ]]; then
            print_warning "Skipping missing file: $file"
            ((failed_count++))
            continue
        fi
        
        # Create target directory if it doesn't exist
        if ! mkdir -p "$target_dir"; then
            print_error "Failed to create directory: $target_dir"
            ((failed_count++))
            continue
        fi
        
        # Copy file to backup directory
        if cp "$source_path" "$target_path"; then
            print_info "  ✓ Copied: $file"
            ((copied_count++))
        else
            print_error "  ✗ Failed to copy: $file"
            ((failed_count++))
        fi
    done
    
    if [[ $failed_count -gt 0 ]]; then
        print_warning "Copied $copied_count files, failed to copy $failed_count files"
        return 2
    else
        print_success "Successfully copied all $copied_count files to backup directory"
        return 0
    fi
}

# Create a compressed tar.gz archive of the backup directory
create_archive() {
    print_info "Creating compressed archive..."
    
    local project_root
    project_root="$(get_project_root)"
    
    local archive_path="$project_root/$BACKUP_ROOT/$ARCHIVE_NAME"
    local backup_dir_name
    backup_dir_name="$(basename "$BACKUP_DIR")"
    
    # Change to backup root directory for relative path archiving
    cd "$project_root/$BACKUP_ROOT" || {
        print_error "Failed to change to backup root directory: $project_root/$BACKUP_ROOT"
        return 3
    }
    
    # Create compressed archive using tar
    # Use gzip compression (-z) and verbose output (-v) for transparency
    if tar -czf "$ARCHIVE_NAME" "$backup_dir_name"; then
        # Get archive size for confirmation
        local archive_size
        if command_exists stat; then
            # Linux/GNU stat
            archive_size=$(stat -f%z "$ARCHIVE_NAME" 2>/dev/null || stat -c%s "$ARCHIVE_NAME" 2>/dev/null || echo "unknown")
        else
            archive_size="unknown"
        fi
        
        print_success "Archive created successfully:"
        print_info "  Location: $archive_path"
        print_info "  Size: $archive_size bytes"
        
        # Verify archive integrity
        if tar -tzf "$ARCHIVE_NAME" >/dev/null 2>&1; then
            print_info "  Integrity: Archive verified successfully"
        else
            print_warning "  Integrity: Archive verification failed"
        fi
        
        return 0
    else
        print_error "Failed to create archive: $archive_path"
        return 3
    fi
}

# Remove the temporary backup directory after archiving
cleanup() {
    if [[ "$KEEP_TEMP_DIR" == true ]]; then
        print_info "Skipping cleanup as requested - temporary directory preserved"
        return 0
    fi
    
    print_info "Cleaning up temporary backup directory..."
    
    local project_root
    project_root="$(get_project_root)"
    
    local backup_dir_path="$project_root/$BACKUP_DIR"
    
    if [[ -d "$backup_dir_path" ]]; then
        if rm -rf "$backup_dir_path"; then
            print_info "  ✓ Removed temporary directory: $backup_dir_path"
            return 0
        else
            print_error "Failed to remove temporary directory: $backup_dir_path"
            return 1
        fi
    else
        print_warning "Temporary directory not found: $backup_dir_path"
        return 0
    fi
}

# Delete old backup archives according to retention policy
prune_old_backups() {
    local max_backups="$1"
    
    print_info "Pruning old backups (keeping last $max_backups)..."
    
    local project_root
    project_root="$(get_project_root)"
    
    local backup_root_path="$project_root/$BACKUP_ROOT"
    
    if [[ ! -d "$backup_root_path" ]]; then
        print_info "Backup directory doesn't exist, nothing to prune"
        return 0
    fi
    
    # Find all backup archives and sort by modification time (oldest first)
    local backup_files
    if command_exists find; then
        # Use find for more reliable file discovery
        mapfile -t backup_files < <(find "$backup_root_path" -name "infrastructure_backup_*.tar.gz" -type f -printf "%T@ %p\n" | sort -n | cut -d' ' -f2- 2>/dev/null)
    else
        # Fallback to ls (less reliable but works without find)
        mapfile -t backup_files < <(ls -t "$backup_root_path"/infrastructure_backup_*.tar.gz 2>/dev/null | tac)
    fi
    
    local total_backups=${#backup_files[@]}
    
    if [[ $total_backups -eq 0 ]]; then
        print_info "No existing backup archives found"
        return 0
    fi
    
    print_info "Found $total_backups existing backup archives"
    
    if [[ $total_backups -le $max_backups ]]; then
        print_info "Retention policy satisfied (≤ $max_backups), no pruning needed"
        return 0
    fi
    
    # Calculate how many files to delete
    local files_to_delete=$((total_backups - max_backups))
    local deleted_count=0
    
    print_info "Deleting $files_to_delete old backup archives:"
    
    # Delete oldest files (keep the last max_backups)
    for ((i=0; i<files_to_delete; i++)); do
        local file_to_delete="${backup_files[i]}"
        local file_basename
        file_basename="$(basename "$file_to_delete")"
        
        if [[ -f "$file_to_delete" ]]; then
            if rm "$file_to_delete"; then
                print_info "  ✓ Deleted: $file_basename"
                ((deleted_count++))
            else
                print_error "  ✗ Failed to delete: $file_basename"
            fi
        else
            print_warning "  ⚠ File not found: $file_basename"
        fi
    done
    
    if [[ $deleted_count -eq $files_to_delete ]]; then
        print_success "Successfully pruned $deleted_count old backup archives"
    else
        print_warning "Pruned $deleted_count of $files_to_delete old backup archives"
    fi
    
    return 0
}

# =============================================================================
# ENVIRONMENT SETUP INTEGRATION
# =============================================================================

# Optionally run setup-env.sh to ensure environment is current before backup
run_setup_env() {
    if [[ "$RUN_SETUP_ENV" != true ]]; then
        return 0
    fi
    
    print_info "Running environment setup before backup..."
    
    local project_root
    project_root="$(get_project_root)"
    
    local setup_env_script="$project_root/infrastructure/scripts/setup-env.sh"
    
    if [[ ! -f "$setup_env_script" ]]; then
        print_error "Setup environment script not found: $setup_env_script"
        return 5
    fi
    
    if [[ ! -x "$setup_env_script" ]]; then
        print_warning "Setup environment script is not executable, making it executable..."
        chmod +x "$setup_env_script" || {
            print_error "Failed to make setup environment script executable"
            return 5
        }
    fi
    
    # Run setup-env.sh with appropriate options
    local setup_env_args=()
    if [[ "$QUIET_MODE" == true ]]; then
        setup_env_args+=("--quiet")
    fi
    
    if "$setup_env_script" "${setup_env_args[@]}"; then
        print_success "Environment setup completed successfully"
        return 0
    else
        local exit_code=$?
        print_error "Environment setup failed with exit code: $exit_code"
        return 5
    fi
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

# Main entrypoint for the backup script
main() {
    local project_root
    project_root="$(get_project_root)"
    
    print_step "$SCRIPT_DESCRIPTION v$SCRIPT_VERSION"
    print_info "Project root: $project_root"
    print_info "Backup timestamp: $TIMESTAMP"
    print_info "Archive name: $ARCHIVE_NAME"
    print_info ""
    
    # Step 1: Check dependencies
    print_step "Step 1: Checking Dependencies"
    if ! check_dependencies; then
        return 1
    fi
    
    # Step 2: Optionally run environment setup
    if [[ "$RUN_SETUP_ENV" == true ]]; then
        print_step "Step 2: Environment Setup"
        if ! run_setup_env; then
            return $?
        fi
    fi
    
    # Step 3: Create backup root directory
    print_step "Step $(( RUN_SETUP_ENV == true ? 3 : 2 )): Creating Backup Directory"
    local backup_root_path="$project_root/$BACKUP_ROOT"
    if ! mkdir -p "$backup_root_path"; then
        print_error "Failed to create backup root directory: $backup_root_path"
        return 1
    fi
    print_info "Backup root directory ready: $backup_root_path"
    
    # Step 4: Create timestamped backup directory
    local backup_dir_path="$project_root/$BACKUP_DIR"
    if ! mkdir -p "$backup_dir_path"; then
        print_error "Failed to create backup directory: $backup_dir_path"
        return 1
    fi
    print_info "Backup directory created: $backup_dir_path"
    
    # Step 5: Validate source files
    print_step "Step $(( RUN_SETUP_ENV == true ? 4 : 3 )): Validating Source Files"
    if ! check_source_files; then
        return $?
    fi
    
    # Step 6: Copy files to backup directory
    print_step "Step $(( RUN_SETUP_ENV == true ? 5 : 4 )): Copying Files"
    if ! copy_files; then
        # Clean up on failure
        rm -rf "$backup_dir_path" 2>/dev/null || true
        return $?
    fi
    
    # Step 7: Create compressed archive
    print_step "Step $(( RUN_SETUP_ENV == true ? 6 : 5 )): Creating Archive"
    if ! create_archive; then
        # Clean up on failure
        rm -rf "$backup_dir_path" 2>/dev/null || true
        return $?
    fi
    
    # Step 8: Clean up temporary directory
    print_step "Step $(( RUN_SETUP_ENV == true ? 7 : 6 )): Cleanup"
    if ! cleanup; then
        # Not critical - continue with backup completion
        print_warning "Cleanup failed, but backup archive was created successfully"
    fi
    
    # Step 9: Prune old backups
    print_step "Step $(( RUN_SETUP_ENV == true ? 8 : 7 )): Pruning Old Backups"
    if ! prune_old_backups "$MAX_BACKUPS"; then
        # Not critical - continue with backup completion
        print_warning "Old backup pruning failed, but current backup was created successfully"
    fi
    
    # Success! Provide completion summary
    print_step "Backup Completed Successfully"
    local archive_path="$project_root/$BACKUP_ROOT/$ARCHIVE_NAME"
    print_success "Infrastructure backup completed successfully!"
    print_info ""
    print_info "${BOLD}Backup Details:${RESET}"
    print_info "  Archive: $archive_path"
    print_info "  Timestamp: $TIMESTAMP"
    print_info "  Files backed up: ${#FILES_TO_BACKUP[@]} infrastructure components"
    print_info ""
    print_info "${BOLD}Next Steps:${RESET}"
    print_info "1. Store backup archive in secure location:"
    print_info "   ${CYAN}cp \"$archive_path\" /secure/backup/location/${RESET}"
    print_info ""
    print_info "2. Verify backup integrity:"
    print_info "   ${CYAN}tar -tzf \"$archive_path\" | head -20${RESET}"
    print_info ""
    print_info "3. Test restoration (in test environment):"
    print_info "   ${CYAN}tar -xzf \"$archive_path\" -C /test/restore/location/${RESET}"
    print_info ""
    print_info "${BOLD}Security Reminder:${RESET}"
    print_warning "This backup may contain sensitive configuration data"
    print_warning "Ensure secure storage and restricted access to backup archives"
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
            -m|--max-backups)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]] && [[ "$2" -gt 0 ]]; then
                    MAX_BACKUPS="$2"
                    shift 2
                else
                    print_error "Invalid value for --max-backups: ${2:-}. Must be a positive integer."
                    return 1
                fi
                ;;
            --no-cleanup)
                KEEP_TEMP_DIR=true
                shift
                ;;
            --setup-env)
                RUN_SETUP_ENV=true
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
                return 1
                ;;
            *)
                print_error "Unexpected argument: $1"
                print_error "Use --help for usage information"
                return 1
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
    if ! parse_arguments "$@"; then
        exit 1
    fi
    
    # Run main function and capture exit code
    main
    exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        print_error "Backup failed with exit code: $exit_code"
        print_info "Use --help for usage information"
        print_info ""
        print_info "${BOLD}Troubleshooting:${RESET}"
        case $exit_code in
            2)
                print_info "- Check file permissions and disk space"
                print_info "- Verify all source files exist and are readable"
                ;;
            3)
                print_info "- Check disk space in backup directory"
                print_info "- Verify tar command is available and functional"
                ;;
            4)
                print_info "- Ensure you're running from the correct project directory"
                print_info "- Check that all expected infrastructure files exist"
                ;;
            5)
                print_info "- Verify setup-env.sh script exists and is executable"
                print_info "- Check Node.js and npm versions compatibility"
                ;;
        esac
    fi
    
    exit $exit_code
fi