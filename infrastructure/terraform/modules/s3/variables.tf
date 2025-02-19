# Variable definitions for S3 bucket configuration
# Terraform version compatibility: ~> 1.0

variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket for storing audio recordings and binary data"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be lowercase alphanumeric with hyphens"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g., dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "retention_days" {
  type        = number
  description = "Number of days to retain audio recordings before deletion"
  default     = 90

  validation {
    condition     = var.retention_days >= 1 && var.retention_days <= 365
    error_message = "Retention days must be between 1 and 365"
  }
}

variable "enable_versioning" {
  type        = bool
  description = "Enable versioning for the S3 bucket"
  default     = true
}

variable "enable_encryption" {
  type        = bool
  description = "Enable server-side encryption for the S3 bucket"
  default     = true
}

variable "transition_to_ia_days" {
  type        = number
  description = "Number of days before transitioning objects to Infrequent Access storage class"
  default     = 30

  validation {
    condition     = var.transition_to_ia_days >= 30
    error_message = "Transition to IA must be at least 30 days"
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to the S3 bucket"
  default     = {}
}