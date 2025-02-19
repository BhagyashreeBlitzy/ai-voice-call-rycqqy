terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Main S3 bucket for storing audio recordings and binary data
resource "aws_s3_bucket" "main" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = merge(
    {
      Name               = var.bucket_name
      Environment        = var.environment
      Managed_by        = "terraform"
      Purpose           = "voice-agent-storage"
      SecurityLevel     = "high"
      DataClassification = "sensitive"
    },
    var.tags
  )
}

# Enable versioning for data protection and recovery
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Disabled"
  }
}

# Configure server-side encryption using AES-256
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Configure lifecycle rules for cost optimization and data management
resource "aws_s3_bucket_lifecycle_rule" "main" {
  bucket = aws_s3_bucket.main.id
  id      = "audio_lifecycle"
  enabled = true
  prefix  = "audio/"

  # Transition to IA storage class after specified days
  transition {
    days          = var.transition_to_ia_days
    storage_class = "STANDARD_IA"
  }

  # Move old versions to Glacier
  noncurrent_version_transition {
    days          = 30
    storage_class = "GLACIER"
  }

  # Delete objects after retention period
  expiration {
    days = var.retention_days
  }

  # Delete old versions after 90 days
  noncurrent_version_expiration {
    days = 90
  }
}

# Block all public access for enhanced security
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Output bucket attributes for other module configurations
output "bucket_id" {
  value       = aws_s3_bucket.main.id
  description = "The ID of the S3 bucket"
}

output "bucket_arn" {
  value       = aws_s3_bucket.main.arn
  description = "The ARN of the S3 bucket"
}

output "bucket_name" {
  value       = aws_s3_bucket.main.bucket
  description = "The name of the S3 bucket"
}

output "bucket_domain_name" {
  value       = aws_s3_bucket.main.bucket_domain_name
  description = "The domain name of the S3 bucket"
}