# ---------------------------------------------------------------------------------------------------------------------
# TERRAFORM BACKEND CONFIGURATION
# Configures S3 backend for state storage and DynamoDB for state locking
# Version: AWS Provider ~> 5.0
# ---------------------------------------------------------------------------------------------------------------------

terraform {
  backend "s3" {
    bucket         = "voice-agent-terraform-state-${var.environment}"
    key            = "terraform.tfstate"
    region         = "${var.aws_region}"
    encrypt        = true
    dynamodb_table = "voice-agent-terraform-locks-${var.environment}"
    acl            = "private"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# S3 BUCKET FOR TERRAFORM STATE
# Stores terraform state files with versioning and encryption enabled
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_s3_bucket" "terraform_state" {
  bucket = "voice-agent-terraform-state-${var.environment}"
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = {
    Name        = "Terraform State Storage"
    Environment = var.environment
    Purpose     = "Infrastructure State Management"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# DYNAMODB TABLE FOR STATE LOCKING
# Enables safe concurrent operations on terraform state
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "voice-agent-terraform-locks-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Terraform State Locking"
    Environment = var.environment
    Purpose     = "Infrastructure State Management"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# OUTPUTS
# Export resource names for reference in other terraform configurations
# ---------------------------------------------------------------------------------------------------------------------

output "terraform_state_bucket" {
  value       = aws_s3_bucket.terraform_state.bucket
  description = "Name of the S3 bucket storing Terraform state"
}

output "terraform_lock_table" {
  value       = aws_dynamodb_table.terraform_locks.name
  description = "Name of the DynamoDB table used for state locking"
}