# Output definitions for S3 bucket module
# Terraform version compatibility: ~> 1.0

# The unique identifier of the S3 bucket
output "bucket_id" {
  description = "The ID of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

# The Amazon Resource Name (ARN) of the S3 bucket
output "bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

# The name of the S3 bucket
output "bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket
}

# The domain name of the S3 bucket for constructing URLs
output "bucket_domain_name" {
  description = "The bucket domain name for S3 access"
  value       = aws_s3_bucket.main.bucket_domain_name
}