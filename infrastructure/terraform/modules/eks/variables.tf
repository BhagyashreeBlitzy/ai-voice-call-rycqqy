# Terraform variables definition file for EKS module
# Version: hashicorp/terraform ~> 1.0

# Core cluster configuration
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"

  validation {
    condition     = length(var.cluster_name) > 0 && length(var.cluster_name) <= 100
    error_message = "Cluster name must be between 1 and 100 characters"
  }
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version to use for the EKS cluster"
  default     = "1.28"
}

# Networking configuration
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where EKS cluster will be created"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs where EKS nodes will be deployed"
}

# Node group configuration
variable "node_groups" {
  type = map(object({
    instance_types = list(string)
    desired_size   = number
    min_size      = number
    max_size      = number
    disk_size     = number
  }))
  description = "Map of node group configurations for the EKS cluster"
  default = {
    default = {
      instance_types = ["t3.medium"]
      desired_size   = 2
      min_size      = 1
      max_size      = 4
      disk_size     = 50
    }
  }
}

# Access configuration
variable "enable_private_access" {
  type        = bool
  description = "Enable private API server endpoint access"
  default     = true
}

variable "enable_public_access" {
  type        = bool
  description = "Enable public API server endpoint access"
  default     = false
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to access the EKS cluster"
  default     = []
}

# Logging configuration
variable "cluster_log_types" {
  type        = list(string)
  description = "List of EKS cluster log types to enable"
  default = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]
}

# Tagging configuration
variable "tags" {
  type        = map(string)
  description = "Additional tags for EKS cluster resources"
  default     = {}
}