# =============================================================================
# TERRAFORM VARIABLES CONFIGURATION
# Node.js Tutorial Application - Google Cloud Platform Infrastructure
# =============================================================================
# 
# This variables file defines comprehensive parameterized configuration for
# Google Cloud Platform infrastructure provisioning supporting the Node.js
# tutorial application. Variables are organized into logical groups for
# GKE cluster creation, VPC networking, security configuration, monitoring
# setup, and educational deployment scenarios.
#
# Terraform Version: >= 1.5
# Target Platform: Google Cloud Platform
# Educational Focus: Infrastructure as Code with security best practices
# =============================================================================

# =============================================================================
# GOOGLE CLOUD PLATFORM CONFIGURATION VARIABLES
# =============================================================================

variable "project_id" {
  type        = string
  description = "Google Cloud Project ID for resource provisioning and billing management. Must be globally unique across all Google Cloud projects and follow Google Cloud naming conventions (6-30 characters, lowercase letters, numbers, and hyphens). This project will contain all GKE cluster resources, networking, and monitoring components for the Node.js tutorial application."
  sensitive   = false

  validation {
    condition = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with lowercase letter, and contain only lowercase letters, numbers, and hyphens."
  }

  validation {
    condition = !can(regex("--", var.project_id))
    error_message = "Project ID cannot contain consecutive hyphens."
  }

  # Educational Notes: Choose descriptive project ID like 'my-nodejs-tutorial-dev' 
  # for easy identification and environment separation
}

variable "region" {
  type        = string
  description = "Google Cloud region for resource deployment and geographic distribution. Determines the primary location for GKE cluster master nodes, VPC networks, and regional services. Choose region based on user proximity, data residency requirements, and service availability. Regional deployment provides high availability within the region's availability zones."
  default     = "us-central1"
  sensitive   = false

  validation {
    condition = contains([
      "us-central1", "us-east1", "us-west1", 
      "europe-west1", "asia-northeast1", "australia-southeast1"
    ], var.region)
    error_message = "Region must be a valid Google Cloud region with GKE support."
  }

  # Educational Notes: us-central1 is cost-effective for learning; 
  # choose region closest to users for production
}

variable "zone" {
  type        = string
  description = "Google Cloud zone within the specified region for zonal resources and node placement. Used for single-zone resources and as primary zone for regional deployments. Must be within the specified region and support required machine types and services."
  default     = "us-central1-a"
  sensitive   = false

  validation {
    condition = can(regex("^[a-z]+-[a-z]+[0-9]+-[a-z]$", var.zone))
    error_message = "Zone must follow Google Cloud zone naming convention (e.g., us-central1-a)."
  }

  # Educational Notes: Zone should be within specified region; 
  # use -a zones for consistent availability
}

variable "google_credentials_file" {
  type        = string
  description = "Path to Google Cloud service account key file for Terraform authentication and resource provisioning. Should point to JSON service account key with required IAM permissions for GKE, Compute Engine, and networking resources. For production, consider using Google Application Default Credentials or Workload Identity Federation instead of service account keys."
  default     = "~/.config/gcloud/application_default_credentials.json"
  sensitive   = true

  validation {
    condition = can(regex("\\.(json)$", var.google_credentials_file))
    error_message = "Credentials file must be a JSON file."
  }

  # Educational Notes: Use gcloud auth application-default login for development,
  # service account keys for CI/CD
}

# =============================================================================
# ENVIRONMENT CONFIGURATION VARIABLES
# =============================================================================

variable "environment" {
  type        = string
  description = "Deployment environment identifier for resource labeling, naming, and configuration management. Supports environment-specific configuration, cost tracking, and operational procedures. Used in resource naming, labels, and conditional configuration throughout the infrastructure."
  default     = "development"
  sensitive   = false

  validation {
    condition = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }

  # Educational Notes: Use 'development' for learning, 'staging' for testing, 
  # 'production' for live applications
}

variable "cluster_name_prefix" {
  type        = string
  description = "Prefix for GKE cluster name generation combined with environment for unique cluster identification. Final cluster name will be '{cluster_name_prefix}-{environment}'. Must follow Kubernetes cluster naming conventions and Google Cloud resource naming requirements."
  default     = "nodejs-tutorial"
  sensitive   = false

  validation {
    condition = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.cluster_name_prefix))
    error_message = "Cluster name prefix must contain only lowercase letters, numbers, and hyphens."
  }

  validation {
    condition = length(var.cluster_name_prefix) >= 3 && length(var.cluster_name_prefix) <= 30
    error_message = "Cluster name prefix must be 3-30 characters long."
  }

  # Educational Notes: Choose descriptive prefix like 'nodejs-tutorial' 
  # for clear resource identification
}

variable "labels" {
  type        = map(string)
  description = "Common labels applied to all infrastructure resources for organization, cost tracking, and operational management. Support consistent resource identification, billing attribution, and automated management processes across the infrastructure stack."
  default = {
    project      = "nodejs-hello-tutorial"
    application  = "hello-world"
    framework    = "express"
    language     = "nodejs"
    tutorial     = "true"
    managed-by   = "terraform"
  }
  sensitive = false

  validation {
    condition = length(var.labels) <= 64
    error_message = "Labels map cannot exceed 64 key-value pairs per Google Cloud limits."
  }

  # Educational Notes: Customize labels for cost tracking, team organization, 
  # and operational procedures
}

# =============================================================================
# GKE CLUSTER CONFIGURATION VARIABLES
# =============================================================================

variable "cluster_node_count" {
  type        = number
  description = "Initial number of worker nodes in the GKE cluster node pool for application workload execution. This is the starting node count that will be created immediately upon cluster deployment. Auto-scaling will adjust this number based on workload demands within the min/max node limits."
  default     = 2
  sensitive   = false

  validation {
    condition = var.cluster_node_count >= 1 && var.cluster_node_count <= 10
    error_message = "Initial node count must be between 1 and 10 nodes."
  }

  # Educational Notes: Start with 2 nodes for availability; 
  # 1 node sufficient for development learning
}

variable "cluster_min_nodes" {
  type        = number
  description = "Minimum number of nodes for cluster auto-scaling to maintain availability and handle baseline workload. Auto-scaler will never reduce node count below this value. Should ensure sufficient capacity for essential workloads and cluster operations even during low-demand periods."
  default     = 1
  sensitive   = false

  validation {
    condition = var.cluster_min_nodes >= 1 && var.cluster_min_nodes <= 5
    error_message = "Minimum node count must be between 1 and 5 nodes."
  }

  # Educational Notes: Set to 1 for cost efficiency; 
  # 2 or more for production high availability
}

variable "cluster_max_nodes" {
  type        = number
  description = "Maximum number of nodes for cluster auto-scaling to handle peak workload demands while controlling costs. Auto-scaler will never increase node count beyond this value. Should accommodate expected maximum load plus buffer for unexpected traffic spikes."
  default     = 5
  sensitive   = false

  validation {
    condition = var.cluster_max_nodes >= var.cluster_min_nodes && var.cluster_max_nodes <= 20
    error_message = "Maximum node count must be greater than or equal to minimum nodes and not exceed 20."
  }

  # Educational Notes: Set conservative limits for learning; 
  # adjust based on actual load testing for production
}

variable "node_machine_type" {
  type        = string
  description = "Google Compute Engine machine type for GKE worker nodes determining CPU, memory, and network performance characteristics. Choice impacts application performance, cost, and resource availability. Consider workload requirements, cost constraints, and regional availability when selecting machine type."
  default     = "e2-medium"
  sensitive   = false

  validation {
    condition = contains([
      "e2-micro", "e2-small", "e2-medium", "e2-standard-2", 
      "e2-standard-4", "n1-standard-1", "n1-standard-2"
    ], var.node_machine_type)
    error_message = "Machine type must be a supported Google Compute Engine instance type."
  }

  # Educational Notes: e2-micro cheapest for learning, e2-medium balanced for development,
  # larger types for production
}

variable "node_disk_size_gb" {
  type        = number
  description = "Boot disk size in GB for each GKE worker node for container images, system files, and temporary storage. Larger disks support more container images and temporary data but increase costs. Consider container image sizes and application temporary storage requirements."
  default     = 50
  sensitive   = false

  validation {
    condition = var.node_disk_size_gb >= 30 && var.node_disk_size_gb <= 200
    error_message = "Node disk size must be between 30GB and 200GB."
  }

  # Educational Notes: 30GB minimum for GKE; 50GB recommended for multiple container images;
  # 100GB+ for production
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for GKE cluster master and node compatibility. Should use supported GKE release channel versions for security updates and feature availability. Regular version updates recommended for security patches and new features."
  default     = "1.28"
  sensitive   = false

  validation {
    condition = can(regex("^1\\.(2[6-9]|[3-9][0-9])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.26 or higher and supported by GKE."
  }

  # Educational Notes: Use recent stable version (1.28+) for latest features; 
  # check GKE release notes for compatibility
}

# =============================================================================
# NETWORK CONFIGURATION VARIABLES
# =============================================================================

variable "master_ipv4_cidr_block" {
  type        = string
  description = "RFC 1918 private IP range for GKE master nodes in private clusters. Must be /28 range and not overlap with VPC or pod/service IP ranges. Used for private cluster master endpoint access and communication with worker nodes."
  default     = "172.16.0.32/28"
  sensitive   = false

  validation {
    condition = can(regex("^(10|172\\.16|192\\.168)\\.", var.master_ipv4_cidr_block))
    error_message = "Master CIDR must be in RFC 1918 private range (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)."
  }

  validation {
    condition = can(regex("/28$", var.master_ipv4_cidr_block))
    error_message = "Master CIDR must be a /28 network."
  }

  # Educational Notes: Required for private clusters; 
  # use non-overlapping RFC 1918 range
}

variable "pod_cidr_range" {
  type        = string
  description = "IP CIDR range for Kubernetes pod networking within the cluster. Secondary IP range for pod-to-pod communication and internal cluster networking. Must not overlap with VPC primary subnet or service CIDR ranges. Size determines maximum pod capacity."
  default     = "10.1.0.0/16"
  sensitive   = false

  validation {
    condition = can(regex("^10\\.", var.pod_cidr_range))
    error_message = "Pod CIDR should use 10.0.0.0/8 private range for consistency."
  }

  validation {
    condition = can(regex("/(1[6-9]|2[0-4])$", var.pod_cidr_range))
    error_message = "Pod CIDR must be between /16 and /24 for adequate pod capacity."
  }

  # Educational Notes: /16 provides 65,536 IPs; 
  # adjust size based on expected pod count
}

variable "service_cidr_range" {
  type        = string
  description = "IP CIDR range for Kubernetes service networking and cluster-internal load balancing. Used for ClusterIP services and internal service discovery. Must not overlap with VPC subnet or pod CIDR ranges. Smaller range acceptable as fewer services than pods."
  default     = "10.2.0.0/16"
  sensitive   = false

  validation {
    condition = can(regex("^10\\.", var.service_cidr_range))
    error_message = "Service CIDR should use 10.0.0.0/8 private range for consistency."
  }

  validation {
    condition = can(regex("/(1[6-9]|2[0-4])$", var.service_cidr_range))
    error_message = "Service CIDR must be between /16 and /24."
  }

  # Educational Notes: /16 provides ample service IPs; 
  # typically fewer services than pods
}

# =============================================================================
# SECURITY CONFIGURATION VARIABLES
# =============================================================================

variable "enable_private_nodes" {
  type        = bool
  description = "Enable private IP-only worker nodes for enhanced security by preventing direct internet access to cluster nodes. Private nodes communicate through NAT gateway for outbound internet access. Recommended for production environments to reduce attack surface and improve security posture."
  default     = true
  sensitive   = false

  # Educational Notes: Set false for development simplicity; 
  # true for production security
}

variable "enable_network_policy" {
  type        = bool
  description = "Enable Kubernetes network policies for pod-to-pod communication control and micro-segmentation. Provides fine-grained network security controls within the cluster. Requires network policy controller and adds complexity but improves security isolation."
  default     = false
  sensitive   = false

  # Educational Notes: Disable for learning simplicity; 
  # enable for production micro-segmentation
}

variable "enable_workload_identity" {
  type        = bool
  description = "Enable Google Cloud Workload Identity for secure service account authentication from Kubernetes pods to Google Cloud services. Eliminates need for service account keys in containers. Recommended security best practice for production deployments."
  default     = true
  sensitive   = false

  # Educational Notes: Recommended for security; 
  # demonstrates modern authentication patterns
}

# =============================================================================
# OBSERVABILITY CONFIGURATION VARIABLES  
# =============================================================================

variable "enable_monitoring" {
  type        = bool
  description = "Enable Google Cloud Monitoring integration for GKE cluster and application observability. Provides comprehensive metrics collection, alerting, and dashboard capabilities. Essential for production environments and operational visibility."
  default     = true
  sensitive   = false

  # Educational Notes: Recommended for learning monitoring concepts; 
  # essential for production operations
}

variable "enable_logging" {
  type        = bool
  description = "Enable Google Cloud Logging integration for centralized log collection from GKE cluster components and applications. Provides log aggregation, analysis, and retention capabilities. Critical for debugging and operational monitoring."
  default     = true
  sensitive   = false

  # Educational Notes: Highly recommended for troubleshooting; 
  # essential for production log management
}

# =============================================================================
# VARIABLE GROUPS AND EDUCATIONAL METADATA
# =============================================================================
# 
# Variable Organization:
# 
# Google Cloud Configuration Group:
# - project_id, region, zone, google_credentials_file
# Purpose: Establish GCP project context and authentication
#
# Environment Configuration Group:  
# - environment, cluster_name_prefix, labels
# Purpose: Support multi-environment deployment and resource organization
#
# Cluster Configuration Group:
# - cluster_node_count, cluster_min_nodes, cluster_max_nodes, 
#   node_machine_type, node_disk_size_gb, kubernetes_version
# Purpose: Define cluster capacity, performance, and Kubernetes version
#
# Network Configuration Group:
# - master_ipv4_cidr_block, pod_cidr_range, service_cidr_range  
# Purpose: Configure cluster networking topology and IP management
#
# Security Configuration Group:
# - enable_private_nodes, enable_network_policy, enable_workload_identity
# Purpose: Implement security best practices and defense-in-depth
#
# Observability Configuration Group:
# - enable_monitoring, enable_logging
# Purpose: Enable comprehensive observability and operational monitoring
#
# =============================================================================
# USAGE EXAMPLES AND BEST PRACTICES
# =============================================================================
#
# Development Environment Example:
# terraform apply -var="environment=development" \
#                 -var="cluster_min_nodes=1" \
#                 -var="cluster_max_nodes=3" \
#                 -var="node_machine_type=e2-small"
#
# Production Environment Example:  
# terraform apply -var="environment=production" \
#                 -var="cluster_min_nodes=2" \
#                 -var="cluster_max_nodes=10" \
#                 -var="node_machine_type=e2-standard-2" \
#                 -var="enable_private_nodes=true" \
#                 -var="enable_network_policy=true"
#
# Cost Optimization Tips:
# - Use e2-micro or e2-small machine types for development
# - Set conservative min/max node counts for learning environments  
# - Choose regions close to users to minimize egress costs
# - Enable monitoring/logging selectively based on requirements
#
# Security Hardening:
# - Always enable private_nodes for production
# - Consider enabling network_policy for micro-segmentation
# - Use workload_identity instead of service account keys
# - Regularly rotate credentials and update cluster versions
#
# =============================================================================