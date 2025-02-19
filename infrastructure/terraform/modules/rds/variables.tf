# Core environment variable
variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production"
  }
}

# Network configuration variables
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where RDS instance will be deployed"
}

variable "database_subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs where RDS instance can be placed"
}

variable "eks_security_group_id" {
  type        = string
  description = "Security group ID of the EKS cluster for database access"
}

# Instance configuration variables
variable "instance_class" {
  type        = string
  description = "RDS instance class for PostgreSQL database"
  default     = "db.t3.medium"
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "15.3"
  validation {
    condition     = can(regex("^15\\.", var.engine_version))
    error_message = "PostgreSQL version must be 15.x"
  }
}

# Storage configuration variables
variable "allocated_storage" {
  type        = number
  description = "Allocated storage size in GB"
  default     = 20
  validation {
    condition     = var.allocated_storage >= 20
    error_message = "Allocated storage must be at least 20 GB"
  }
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage size in GB for autoscaling"
  default     = 50
}

# Database configuration variables
variable "database_name" {
  type        = string
  description = "Name of the PostgreSQL database"
  default     = "voiceagent"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores"
  }
}

variable "database_username" {
  type        = string
  description = "Master username for the database"
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_username))
    error_message = "Username must start with a letter and contain only alphanumeric characters and underscores"
  }
}

variable "database_password" {
  type        = string
  description = "Master password for the database"
  sensitive   = true
  validation {
    condition     = length(var.database_password) >= 16
    error_message = "Password must be at least 16 characters long"
  }
}

# High availability configuration variables
variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = false
}

# Backup configuration variables
variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days"
  }
}

variable "backup_window" {
  type        = string
  description = "Preferred backup window in UTC (HH:MM-HH:MM)"
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window in UTC (ddd:HH:MM-ddd:HH:MM)"
  default     = "Mon:04:00-Mon:05:00"
}

# Monitoring and protection variables
variable "performance_insights_enabled" {
  type        = bool
  description = "Enable Performance Insights for monitoring"
  default     = false
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection"
  default     = false
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}