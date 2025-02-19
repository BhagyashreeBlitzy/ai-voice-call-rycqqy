# ---------------------------------------------------------------------------------------------------------------------
# ENVIRONMENT VARIABLES
# Define the deployment environment and region settings
# ---------------------------------------------------------------------------------------------------------------------
variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production"
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-west-2"
}

# ---------------------------------------------------------------------------------------------------------------------
# NETWORKING VARIABLES
# Define VPC and networking configuration
# ---------------------------------------------------------------------------------------------------------------------
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}

# ---------------------------------------------------------------------------------------------------------------------
# EKS CLUSTER VARIABLES
# Define Kubernetes cluster configuration
# ---------------------------------------------------------------------------------------------------------------------
variable "eks_cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
  default     = "voice-agent-cluster"
}

variable "eks_node_instance_type" {
  type        = string
  description = "Instance type for EKS worker nodes"
  default     = "t3.medium"
}

variable "eks_desired_capacity" {
  type        = number
  description = "Desired number of worker nodes"
  default     = 2
}

# ---------------------------------------------------------------------------------------------------------------------
# RDS VARIABLES
# Define PostgreSQL database configuration
# ---------------------------------------------------------------------------------------------------------------------
variable "rds_instance_class" {
  type        = string
  description = "Instance class for RDS PostgreSQL"
  default     = "db.t3.medium"
}

variable "rds_database_name" {
  type        = string
  description = "Name of the PostgreSQL database"
  default     = "voiceagent"
}

# ---------------------------------------------------------------------------------------------------------------------
# ELASTICACHE VARIABLES
# Define Redis cache configuration
# ---------------------------------------------------------------------------------------------------------------------
variable "elasticache_node_type" {
  type        = string
  description = "Node type for ElastiCache Redis cluster"
  default     = "cache.t3.medium"
}

variable "elasticache_num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the Redis cluster"
  default     = 2
}

# ---------------------------------------------------------------------------------------------------------------------
# S3 VARIABLES
# Define S3 storage configuration
# ---------------------------------------------------------------------------------------------------------------------
variable "s3_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for audio storage"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.s3_bucket_name))
    error_message = "S3 bucket name must be valid DNS-compliant name"
  }
}