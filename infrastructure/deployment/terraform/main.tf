# =============================================================================
# TERRAFORM MAIN INFRASTRUCTURE CONFIGURATION
# Node.js Tutorial Application - Google Cloud Platform Infrastructure
# =============================================================================
#
# This Terraform configuration provisions complete Google Cloud Platform 
# infrastructure for the Node.js tutorial application, implementing production-ready
# cloud infrastructure including GKE cluster, VPC networking, container registry,
# monitoring, load balancing, and security hardening.
#
# Implements Infrastructure as Code (IaC) best practices with comprehensive 
# resource management, educational documentation, and support for multi-environment
# deployments while maintaining cost optimization and security compliance.
#
# Terraform Version: >= 1.5
# Google Provider: ~> 5.0  
# Kubernetes Provider: ~> 2.23
# Helm Provider: ~> 2.11
# Target Platform: Google Cloud Platform
# Educational Focus: Production-ready containerized Node.js applications
# =============================================================================

# =============================================================================
# TERRAFORM CONFIGURATION BLOCK
# =============================================================================

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    # Google Cloud Provider for GCP resource provisioning and management
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    
    # Kubernetes provider for cluster resource management and application deployment
    kubernetes = {
      source  = "hashicorp/kubernetes" 
      version = "~> 2.23"
    }
    
    # Helm provider for Kubernetes application package management and deployment
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  # Google Cloud Storage backend for Terraform state management
  # Provides secure, versioned, and collaborative state storage
  backend "gcs" {
    bucket   = "${var.project_id}-terraform-state"
    prefix   = "terraform/state"
    location = "US"
  }
}

# =============================================================================
# LOCAL VALUES CONFIGURATION
# =============================================================================

locals {
  # Cluster naming with environment prefix for unique identification
  cluster_name = "${var.cluster_name_prefix}-${var.environment}"
  
  # VPC network name following consistent naming convention
  network_name = "${var.cluster_name_prefix}-${var.environment}-vpc"
  
  # Subnet name for primary VPC subnet
  subnet_name = "${var.cluster_name_prefix}-${var.environment}-subnet"
  
  # Common labels for all resources supporting organization and cost tracking
  common_labels = merge(var.labels, {
    project     = var.project_id
    environment = var.environment
    application = "nodejs-hello-tutorial"
    managed-by  = "terraform"
    tutorial    = "true"
  })
  
  # Node tags for firewall rules and resource identification
  node_tags = ["gke-node", "${local.cluster_name}"]
}

# =============================================================================
# PROVIDER CONFIGURATIONS
# =============================================================================

# Google Cloud Provider configuration for GCP resource management
provider "google" {
  project     = var.project_id
  region      = var.region
  zone        = var.zone
  credentials = file(var.google_credentials_file)
}

# Kubernetes Provider configuration for cluster resource management
# Configured to connect to the GKE cluster after creation
provider "kubernetes" {
  host  = "https://${google_container_cluster.nodejs_tutorial_cluster.endpoint}"
  token = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(
    google_container_cluster.nodejs_tutorial_cluster.master_auth.0.cluster_ca_certificate,
  )
}

# Helm Provider configuration for Kubernetes application package management
provider "helm" {
  kubernetes {
    host  = "https://${google_container_cluster.nodejs_tutorial_cluster.endpoint}"
    token = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(
      google_container_cluster.nodejs_tutorial_cluster.master_auth.0.cluster_ca_certificate,
    )
  }
}

# =============================================================================
# DATA SOURCES
# =============================================================================

# Retrieve current Google Cloud authentication configuration
# Used for Kubernetes provider setup and service account access
data "google_client_config" "default" {}

# Get project metadata for resource labeling and billing configuration
data "google_project" "project" {
  project_id = var.project_id
}

# =============================================================================
# GOOGLE CLOUD STORAGE - TERRAFORM STATE BACKEND
# =============================================================================

# Google Cloud Storage bucket for Terraform state file backend
# Provides secure, versioned state storage for infrastructure automation
resource "google_storage_bucket" "terraform_state" {
  name          = "${var.project_id}-terraform-state"
  location      = "US"
  storage_class = "REGIONAL"
  force_destroy = false
  
  labels = local.common_labels

  # Enable versioning for state file history and rollback capabilities
  versioning {
    enabled = true
  }

  # Lifecycle management for cost optimization
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  # Uniform bucket-level access for consistent security model
  uniform_bucket_level_access = true

  # Public access prevention for security hardening
  public_access_prevention = "enforced"
}

# =============================================================================
# VPC NETWORKING INFRASTRUCTURE  
# =============================================================================

# VPC network for GKE cluster and secure networking isolation
# Custom VPC provides complete control over network topology and security
resource "google_compute_network" "vpc" {
  name                    = local.network_name
  project                 = var.project_id
  auto_create_subnetworks = false
  mtu                     = 1460
  delete_default_routes_on_create = false
  
  description = "VPC network for ${local.cluster_name} GKE cluster and secure networking isolation"
}

# Primary subnet with secondary ranges for Kubernetes pod and service networking
# Demonstrates subnet design and secondary IP ranges for Kubernetes networking
resource "google_compute_subnetwork" "subnet" {
  name          = local.subnet_name
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  project       = var.project_id
  
  # Enable private Google access for private nodes to reach Google APIs
  private_ip_google_access = true
  
  description = "Primary subnet with secondary ranges for Kubernetes pod and service networking"

  # Secondary IP ranges for GKE pod and service networking
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pod_cidr_range
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.service_cidr_range
  }
}

# Cloud Router for NAT gateway and private cluster internet access
# Demonstrates routing concepts for private cluster connectivity
resource "google_compute_router" "router" {
  name    = "${local.cluster_name}-router"
  region  = var.region
  network = google_compute_network.vpc.id
  project = var.project_id
  
  description = "Cloud Router for NAT gateway and private cluster internet access"
}

# NAT gateway for outbound internet connectivity from private GKE nodes
# Shows NAT configuration for private cluster outbound connectivity
resource "google_compute_router_nat" "nat" {
  name                               = "${local.cluster_name}-nat"
  router                            = google_compute_router.router.name
  region                            = var.region
  project                           = var.project_id
  nat_ip_allocate_option            = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  # NAT logging configuration for troubleshooting and monitoring
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# =============================================================================
# FIREWALL RULES
# =============================================================================

# Firewall rule allowing ingress traffic to the cluster
# Network security configuration for cluster access
resource "google_compute_firewall" "allow_ingress" {
  name        = "${local.cluster_name}-allow-ingress"
  network     = google_compute_network.vpc.name
  project     = var.project_id
  description = "Allow HTTP and HTTPS traffic for ingress controller"
  direction   = "INGRESS"
  priority    = 1000

  # Allow HTTP, HTTPS, and Node.js application ports
  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080"]
  }

  # Allow traffic from all sources (restrict in production)
  source_ranges = ["0.0.0.0/0"]
  
  # Target GKE nodes with specific tags
  target_tags = local.node_tags
}

# =============================================================================
# STATIC IP ADDRESS
# =============================================================================

# Static external IP address for ingress load balancer
# Provides consistent external access point for the application
resource "google_compute_address" "nodejs_tutorial_ip" {
  name         = "${local.cluster_name}-external-ip"
  region       = var.region
  project      = var.project_id
  address_type = "EXTERNAL"
  
  description = "Static external IP address for ${local.cluster_name} ingress load balancer"
  
  labels = local.common_labels
}

# =============================================================================
# SERVICE ACCOUNT AND IAM CONFIGURATION
# =============================================================================

# Service account for GKE node authentication and authorization
# Implements principle of least privilege for cluster security
resource "google_service_account" "gke_nodes" {
  account_id   = "${local.cluster_name}-nodes-sa"
  display_name = "GKE Node Service Account for ${local.cluster_name}"
  project      = var.project_id
  description  = "Service account for GKE nodes with minimal required permissions"
}

# Grant monitoring permissions to GKE nodes for observability
# IAM role assignment for service account permissions
resource "google_project_iam_member" "gke_nodes_monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Grant logging permissions to GKE nodes for centralized logging
# Service account permission management for cloud logging
resource "google_project_iam_member" "gke_nodes_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Grant container registry access for pulling container images
resource "google_project_iam_member" "gke_nodes_registry_reader" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# =============================================================================
# GKE CLUSTER CONFIGURATION
# =============================================================================

# GKE cluster for container orchestration and application deployment
# Comprehensive GKE cluster configuration demonstrating production-ready Kubernetes setup
resource "google_container_cluster" "nodejs_tutorial_cluster" {
  name     = local.cluster_name
  location = var.region
  project  = var.project_id
  
  # Kubernetes version configuration for compatibility and security
  min_master_version = var.kubernetes_version
  node_version      = var.kubernetes_version
  
  # Remove default node pool and create custom node pool separately
  remove_default_node_pool = true
  initial_node_count       = 1
  
  # Enable deletion protection for production environments (set to false for tutorial)
  deletion_protection = false
  
  description = "GKE cluster for ${local.cluster_name} Node.js tutorial application"

  # Network configuration for private cluster with custom VPC
  network    = google_compute_network.vpc.self_link
  subnetwork = google_compute_subnetwork.subnet.self_link

  # Private cluster configuration for enhanced security
  private_cluster_config {
    enable_private_nodes    = var.enable_private_nodes
    enable_private_endpoint = false
    master_ipv4_cidr_block = var.master_ipv4_cidr_block
  }

  # IP allocation policy for secondary ranges
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Cluster add-ons configuration
  addons_config {
    # HTTP load balancing for ingress controllers
    http_load_balancing {
      disabled = false
    }

    # Horizontal pod autoscaling for dynamic scaling
    horizontal_pod_autoscaling {
      disabled = false
    }

    # Network policy configuration for micro-segmentation
    network_policy_config {
      disabled = var.enable_network_policy ? false : true
    }

    # DNS cache for improved DNS resolution performance
    dns_cache_config {
      enabled = true
    }
  }

  # Workload Identity configuration for secure service account authentication
  dynamic "workload_identity_config" {
    for_each = var.enable_workload_identity ? [1] : []
    content {
      workload_pool = "${var.project_id}.svc.id.goog"
    }
  }

  # Monitoring configuration for comprehensive observability
  monitoring_config {
    enable_components = var.enable_monitoring ? [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "APISERVER",
      "CONTROLLER_MANAGER",
      "SCHEDULER"
    ] : []
  }

  # Logging configuration for centralized log collection
  logging_config {
    enable_components = var.enable_logging ? [
      "SYSTEM_COMPONENTS", 
      "WORKLOADS",
      "API_SERVER"
    ] : []
  }

  # Network policy configuration
  network_policy {
    enabled  = var.enable_network_policy
    provider = var.enable_network_policy ? "CALICO" : null
  }

  # Maintenance policy for automated cluster updates
  maintenance_policy {
    daily_maintenance_window {
      start_time = "04:00"
    }
  }

  # Resource labels for organization and cost tracking
  resource_labels = local.common_labels
}

# =============================================================================
# GKE NODE POOL CONFIGURATION
# =============================================================================

# GKE node pool with auto-scaling and management for container workloads
# Node pool configuration with scaling, management, and security features
resource "google_container_node_pool" "nodejs_tutorial_nodes" {
  name       = "${local.cluster_name}-nodes"
  cluster    = google_container_cluster.nodejs_tutorial_cluster.name
  location   = var.region
  project    = var.project_id
  version    = var.kubernetes_version
  
  # Initial node count for immediate availability
  initial_node_count = var.cluster_node_count

  # Node configuration for performance and security
  node_config {
    machine_type    = var.node_machine_type
    disk_size_gb    = var.node_disk_size_gb
    disk_type       = "pd-ssd"
    image_type      = "COS_CONTAINERD"
    service_account = google_service_account.gke_nodes.email
    
    # OAuth scopes for service account permissions
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    # Node labels for identification and scheduling
    labels = merge(local.common_labels, {
      node-pool = "default"
      role      = "worker"
    })
    
    # Node tags for firewall rules and network policies
    tags = local.node_tags

    # Workload Identity metadata configuration
    dynamic "workload_metadata_config" {
      for_each = var.enable_workload_identity ? [1] : []
      content {
        mode = "GKE_METADATA"
      }
    }

    # Security configuration
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  # Auto-scaling configuration for dynamic node management
  autoscaling {
    min_node_count = var.cluster_min_nodes
    max_node_count = var.cluster_max_nodes
  }

  # Node management configuration for automated maintenance
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  # Rolling update configuration to minimize disruption
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  # Lifecycle management to prevent accidental deletion
  lifecycle {
    ignore_changes = [initial_node_count]
  }

  depends_on = [google_container_cluster.nodejs_tutorial_cluster]
}

# =============================================================================
# KUBERNETES NAMESPACE CONFIGURATION
# =============================================================================

# Kubernetes namespace for application resource organization
# Namespace creation for resource isolation and organization
resource "kubernetes_namespace" "nodejs_tutorial" {
  metadata {
    name = "nodejs-tutorial"
    
    labels = merge(local.common_labels, {
      "tutorial.example.com/purpose" = "educational"
      "app.kubernetes.io/name"       = "nodejs-tutorial"
      "app.kubernetes.io/component"  = "namespace"
    })

    annotations = {
      "description" = "Namespace for Node.js tutorial application resources"
      "created-by"  = "terraform"
    }
  }

  depends_on = [
    google_container_cluster.nodejs_tutorial_cluster,
    google_container_node_pool.nodejs_tutorial_nodes
  ]
}

# =============================================================================
# MONITORING AND OBSERVABILITY
# =============================================================================

# Google Cloud Monitoring dashboard for application observability  
# Monitoring dashboard creation for infrastructure and application visibility
resource "google_monitoring_dashboard" "nodejs_tutorial_dashboard" {
  dashboard_json = jsonencode({
    displayName = "Node.js Tutorial Application Dashboard"
    mosaicLayout = {
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "GKE Cluster CPU Utilization"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_node\" resource.labels.cluster_name=\"${local.cluster_name}\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },
        {
          width  = 6  
          height = 4
          xPos   = 6
          widget = {
            title = "GKE Cluster Memory Utilization"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_node\" resource.labels.cluster_name=\"${local.cluster_name}\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },
        {
          width  = 12
          height = 4
          yPos   = 4
          widget = {
            title = "HTTP Request Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" resource.labels.cluster_name=\"${local.cluster_name}\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        }
      ]
    }
    labels = local.common_labels
  })
  
  project = var.project_id

  depends_on = [google_container_cluster.nodejs_tutorial_cluster]
}

# =============================================================================
# OUTPUTS FOR INTEGRATION
# =============================================================================

# Export infrastructure resources for outputs.tf to reference and expose connection details
output "cluster_endpoint" {
  description = "GKE cluster endpoint for kubectl configuration"
  value       = google_container_cluster.nodejs_tutorial_cluster.endpoint
  sensitive   = true
}

output "cluster_name" {
  description = "GKE cluster name for resource identification"
  value       = google_container_cluster.nodejs_tutorial_cluster.name
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate for TLS verification"
  value       = google_container_cluster.nodejs_tutorial_cluster.master_auth.0.cluster_ca_certificate
  sensitive   = true
}

output "vpc_network_name" {
  description = "VPC network name for network integration"
  value       = google_compute_network.vpc.name
}

output "subnet_name" {
  description = "Primary subnet name for additional resource placement"
  value       = google_compute_subnetwork.subnet.name
}

output "static_ip_address" {
  description = "Static external IP address for load balancer configuration"
  value       = google_compute_address.nodejs_tutorial_ip.address
}

output "node_service_account_email" {
  description = "GKE node service account email for IAM configuration"
  value       = google_service_account.gke_nodes.email
}

# =============================================================================
# EDUCATIONAL METADATA AND DOCUMENTATION
# =============================================================================
#
# This Terraform configuration demonstrates:
#
# 1. Infrastructure as Code (IaC) Patterns:
#    - Variable-driven configuration for multi-environment deployments
#    - Resource organization and dependency management
#    - State management with remote backend
#    - Provider version pinning for reproducible deployments
#
# 2. Google Cloud Platform Best Practices:
#    - VPC networking with custom subnets and secondary ranges
#    - Private GKE cluster with NAT gateway for security
#    - IAM service accounts with least-privilege permissions
#    - Comprehensive monitoring and logging integration
#
# 3. Kubernetes Infrastructure Patterns:
#    - GKE cluster with auto-scaling node pools
#    - Network policies for micro-segmentation
#    - Workload Identity for secure pod authentication
#    - Namespace organization for resource isolation
#
# 4. Security Hardening:
#    - Private cluster nodes with controlled egress
#    - Service account security with minimal permissions
#    - Firewall rules for controlled ingress traffic
#    - Secure boot and integrity monitoring on nodes
#
# 5. Operational Excellence:
#    - Comprehensive monitoring dashboard
#    - Centralized logging configuration
#    - Automated cluster maintenance policies
#    - Resource labeling for cost tracking and organization
#
# Learning Objectives:
# - Understand Terraform resource definition and dependency management
# - Learn Google Cloud Platform resource provisioning patterns
# - Practice GKE cluster configuration with security features
# - Implement VPC networking with subnets, routing, and NAT gateways
# - Configure IAM service accounts and role-based access control
# - Apply monitoring and observability for production readiness
# - Demonstrate infrastructure automation and GitOps workflows
#
# =============================================================================