# Core Terraform functionality for variable definitions
terraform {
  required_version = "~> 1.0"
}

variable "cluster_name" {
  type        = string
  description = "Name of the ElastiCache Redis cluster"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must start with a letter and only contain alphanumeric characters and hyphens"
  }
}

variable "node_type" {
  type        = string
  description = "Instance type for Redis nodes"
  default     = "cache.t3.medium"
}

variable "replica_count" {
  type        = number
  description = "Number of read replicas in the Redis cluster"
  default     = 2

  validation {
    condition     = var.replica_count >= 1 && var.replica_count <= 5
    error_message = "Replica count must be between 1 and 5"
  }
}

variable "port" {
  type        = number
  description = "Port number for Redis connections"
  default     = 6379
}

variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family"
  default     = "redis7.0"
}

variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window"
  default     = "sun:05:00-sun:09:00"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for ElastiCache deployment"
}

variable "security_group_ids" {
  type        = list(string)
  description = "List of security group IDs for ElastiCache cluster"
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all resources"
  default     = {}
}