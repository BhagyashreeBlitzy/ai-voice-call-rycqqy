# =============================================================================
# TERRAFORM OUTPUTS CONFIGURATION
# Node.js Tutorial Application - Google Cloud Platform Infrastructure
# =============================================================================
#
# This outputs file exposes critical infrastructure resource attributes and 
# connection information from provisioned Google Cloud Platform resources.
# Provides essential connectivity details, resource identifiers, and configuration
# parameters for GKE cluster access, network information, monitoring endpoints,
# and operational integration.
#
# Enables seamless integration with CI/CD pipelines, application deployment 
# workflows, and administrative operations by exposing cluster endpoints,
# authentication details, and resource metadata in structured format for
# automated consumption and manual reference.
#
# Terraform Version: >= 1.5
# Google Provider: ~> 5.0
# Educational Focus: Infrastructure visibility and operational integration
# =============================================================================

# =============================================================================
# PROJECT INFORMATION OUTPUTS
# =============================================================================

# Google Cloud Project information and configuration details for reference and integration purposes
# Includes project ID, region, environment classification, and resource organization metadata
output "project_information" {
  description = "Google Cloud Project information and configuration details for reference and integration purposes. Includes project ID, region, environment classification, and resource organization metadata."
  sensitive   = false
  value = {
    project_id    = var.project_id
    region        = var.region
    zone          = var.zone
    environment   = var.environment
    cluster_name  = local.cluster_name
    labels        = local.common_labels
  }
}

# =============================================================================
# GKE CLUSTER DETAILS OUTPUTS
# =============================================================================

# Complete GKE cluster connection and configuration information required for kubectl access
# Includes endpoint URL, authentication details, and cluster metadata essential for Kubernetes operations
output "gke_cluster_details" {
  description = "Complete GKE cluster connection and configuration information required for kubectl access, application deployment, and cluster administration. Includes endpoint URL, authentication details, and cluster metadata essential for Kubernetes operations."
  sensitive   = true
  value = {
    cluster_name                = google_container_cluster.nodejs_tutorial_cluster.name
    cluster_location            = google_container_cluster.nodejs_tutorial_cluster.location
    cluster_endpoint            = google_container_cluster.nodejs_tutorial_cluster.endpoint
    cluster_master_version      = google_container_cluster.nodejs_tutorial_cluster.master_version
    cluster_node_version        = google_container_cluster.nodejs_tutorial_cluster.node_version
    cluster_ca_certificate      = google_container_cluster.nodejs_tutorial_cluster.master_auth.0.cluster_ca_certificate
    cluster_self_link           = google_container_cluster.nodejs_tutorial_cluster.self_link
    cluster_services_ipv4_cidr  = google_container_cluster.nodejs_tutorial_cluster.services_ipv4_cidr
    cluster_ipv4_cidr          = google_container_cluster.nodejs_tutorial_cluster.cluster_ipv4_cidr
  }
}

# =============================================================================
# NODE POOL INFORMATION OUTPUTS
# =============================================================================

# GKE node pool configuration and status information including auto-scaling settings
# Provides visibility into cluster capacity and resource allocation
output "node_pool_information" {
  description = "GKE node pool configuration and status information including auto-scaling settings, machine specifications, and operational parameters. Provides visibility into cluster capacity and resource allocation."
  sensitive   = false
  value = {
    node_pool_name      = google_container_node_pool.nodejs_tutorial_nodes.name
    node_count          = google_container_node_pool.nodejs_tutorial_nodes.node_count
    machine_type        = google_container_node_pool.nodejs_tutorial_nodes.node_config.0.machine_type
    disk_size_gb        = google_container_node_pool.nodejs_tutorial_nodes.node_config.0.disk_size_gb
    disk_type           = google_container_node_pool.nodejs_tutorial_nodes.node_config.0.disk_type
    min_node_count      = google_container_node_pool.nodejs_tutorial_nodes.autoscaling.0.min_node_count
    max_node_count      = google_container_node_pool.nodejs_tutorial_nodes.autoscaling.0.max_node_count
    service_account     = google_container_node_pool.nodejs_tutorial_nodes.node_config.0.service_account
  }
}

# =============================================================================
# NETWORK CONFIGURATION OUTPUTS
# =============================================================================

# VPC network and subnet configuration details including IP addressing, routing, and security settings
# Essential for network integration, firewall configuration, and connectivity planning
output "network_configuration" {
  description = "VPC network and subnet configuration details including IP addressing, routing, and security settings. Essential for network integration, firewall configuration, and connectivity planning."
  sensitive   = false
  value = {
    vpc_name                    = google_compute_network.vpc.name
    vpc_self_link              = google_compute_network.vpc.self_link
    vpc_id                     = google_compute_network.vpc.id
    subnet_name                = google_compute_subnetwork.subnet.name
    subnet_self_link           = google_compute_subnetwork.subnet.self_link
    subnet_ip_cidr_range       = google_compute_subnetwork.subnet.ip_cidr_range
    subnet_secondary_ip_ranges = google_compute_subnetwork.subnet.secondary_ip_range
    static_ip_address          = google_compute_address.nodejs_tutorial_ip.address
    static_ip_name             = google_compute_address.nodejs_tutorial_ip.name
  }
}

# =============================================================================
# SERVICE ACCOUNT DETAILS OUTPUTS
# =============================================================================

# GKE service account information including email, unique ID, and display name
# Required for workload identity configuration and access control
output "service_account_details" {
  description = "GKE service account information including email, unique ID, and display name for IAM configuration and security management. Required for workload identity configuration and access control."
  sensitive   = false
  value = {
    service_account_email       = google_service_account.gke_nodes.email
    service_account_unique_id   = google_service_account.gke_nodes.unique_id
    service_account_name        = google_service_account.gke_nodes.name
    service_account_display_name = google_service_account.gke_nodes.display_name
  }
}

# =============================================================================
# KUBERNETES NAMESPACE INFORMATION OUTPUTS
# =============================================================================

# Kubernetes namespace configuration and metadata for application deployment organization
# Includes namespace name, labels, and creation timestamp for operational reference
output "kubernetes_namespace_info" {
  description = "Kubernetes namespace configuration and metadata for application deployment organization and resource isolation. Includes namespace name, labels, and creation timestamp for operational reference."
  sensitive   = false
  value = {
    namespace_name             = kubernetes_namespace.nodejs_tutorial.metadata.0.name
    namespace_labels           = kubernetes_namespace.nodejs_tutorial.metadata.0.labels
    namespace_uid              = kubernetes_namespace.nodejs_tutorial.metadata.0.uid
    namespace_resource_version = kubernetes_namespace.nodejs_tutorial.metadata.0.resource_version
  }
}

# =============================================================================
# STORAGE CONFIGURATION OUTPUTS
# =============================================================================

# Google Cloud Storage bucket information used for Terraform state backend
# Includes bucket name, location, and access details for state management operations
output "storage_configuration" {
  description = "Google Cloud Storage bucket information used for Terraform state backend and infrastructure configuration management. Includes bucket name, location, and access details for state management operations."
  sensitive   = false
  value = {
    state_bucket_name          = google_storage_bucket.terraform_state.name
    state_bucket_location      = google_storage_bucket.terraform_state.location
    state_bucket_storage_class = google_storage_bucket.terraform_state.storage_class
    state_bucket_url           = google_storage_bucket.terraform_state.url
    state_bucket_self_link     = google_storage_bucket.terraform_state.self_link
  }
}

# =============================================================================
# CONNECTION COMMANDS OUTPUTS
# =============================================================================

# Ready-to-use command line instructions for connecting to and managing the provisioned GKE cluster
# Includes kubectl configuration commands, cluster authentication, and common operational commands
output "connection_commands" {
  description = "Ready-to-use command line instructions for connecting to and managing the provisioned GKE cluster. Includes kubectl configuration commands, cluster authentication, and common operational commands for immediate use."
  sensitive   = false
  value = {
    configure_kubectl  = "gcloud container clusters get-credentials ${google_container_cluster.nodejs_tutorial_cluster.name} --region ${google_container_cluster.nodejs_tutorial_cluster.location} --project ${var.project_id}"
    view_cluster_info  = "kubectl cluster-info"
    view_nodes         = "kubectl get nodes -o wide"
    view_namespaces    = "kubectl get namespaces"
    switch_namespace   = "kubectl config set-context --current --namespace=${kubernetes_namespace.nodejs_tutorial.metadata.0.name}"
    dashboard_proxy    = "kubectl proxy --port=8001"
  }
}

# =============================================================================
# MONITORING ENDPOINTS OUTPUTS
# =============================================================================

# Google Cloud Console URLs and monitoring dashboard links for infrastructure observability
# Provides direct access to monitoring, logging, and administrative interfaces
output "monitoring_endpoints" {
  description = "Google Cloud Console URLs and monitoring dashboard links for infrastructure observability and operational management. Provides direct access to monitoring, logging, and administrative interfaces."
  sensitive   = false
  value = {
    gke_cluster_console = "https://console.cloud.google.com/kubernetes/clusters/details/${google_container_cluster.nodejs_tutorial_cluster.location}/${google_container_cluster.nodejs_tutorial_cluster.name}/details?project=${var.project_id}"
    workloads_console   = "https://console.cloud.google.com/kubernetes/workload/overview?project=${var.project_id}"
    monitoring_console  = "https://console.cloud.google.com/monitoring?project=${var.project_id}"
    logging_console     = "https://console.cloud.google.com/logs?project=${var.project_id}"
    compute_console     = "https://console.cloud.google.com/compute/instances?project=${var.project_id}"
    networking_console  = "https://console.cloud.google.com/networking/networks/list?project=${var.project_id}"
  }
}

# =============================================================================
# RESOURCE SUMMARY OUTPUTS
# =============================================================================

# Comprehensive summary of all provisioned infrastructure resources with counts and configuration overview
# Provides high-level infrastructure inventory for documentation and operational awareness
output "resource_summary" {
  description = "Comprehensive summary of all provisioned infrastructure resources with counts, types, and configuration overview. Provides high-level infrastructure inventory for documentation and operational awareness."
  sensitive   = false
  value = {
    total_resources_created   = "16"
    gke_clusters             = "1"
    node_pools               = "1"
    vpc_networks             = "1"
    subnets                  = "1"
    static_ips               = "1"
    service_accounts         = "1"
    iam_bindings             = "2"
    firewall_rules           = "1"
    storage_buckets          = "1"
    namespaces               = "1"
    estimated_monthly_cost   = "$150-$300 USD"
    resource_labels          = local.common_labels
    deployment_timestamp     = timestamp()
  }
}

# =============================================================================
# EDUCATIONAL METADATA AND DOCUMENTATION
# =============================================================================
#
# This Terraform outputs file demonstrates:
#
# 1. Infrastructure Resource Exposure Patterns:
#    - Comprehensive attribute extraction from provisioned resources
#    - Structured output organization for different operational use cases
#    - Sensitive output handling for security credentials
#    - Ready-to-use command generation for immediate operational value
#
# 2. Google Cloud Platform Integration:
#    - GKE cluster connection information for kubectl configuration
#    - Network topology details for security and connectivity planning
#    - Service account information for IAM and workload identity setup
#    - Console URLs for direct access to monitoring and management interfaces
#
# 3. Operational Excellence Patterns:
#    - Connection commands for immediate cluster access
#    - Monitoring endpoints for observability and troubleshooting
#    - Resource inventory for cost tracking and capacity planning
#    - Namespace information for application deployment targeting
#
# 4. CI/CD Integration Support:
#    - Cluster endpoint and authentication details for automated deployment
#    - Network configuration for load balancer and ingress setup
#    - Resource identifiers for integration with external automation tools
#    - Project information for environment-specific configuration
#
# 5. Security and Compliance:
#    - Sensitive output marking for cluster credentials and certificates
#    - Service account details for secure workload authentication
#    - Network configuration for security policy implementation
#    - Access control information for IAM configuration
#
# Learning Objectives:
# - Understand Terraform output syntax and value extraction from resources
# - Learn how to expose infrastructure attributes for external consumption
# - Practice organizing outputs for different operational use cases
# - Demonstrate integration patterns between Terraform and external systems
# - Apply output sensitivity and security considerations
# - Implement comprehensive infrastructure documentation through outputs
#
# Usage Examples:
#
# Access cluster details:
# terraform output gke_cluster_details
#
# Get kubectl configuration command:
# terraform output -json connection_commands | jq -r '.configure_kubectl'
#
# View all monitoring links:
# terraform output monitoring_endpoints
#
# Get network configuration for firewall rules:
# terraform output network_configuration
#
# =============================================================================