# Output definitions for AWS ElastiCache Redis cluster module
# Provider version: ~> 5.0

output "primary_endpoint" {
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  description = "Primary endpoint address for Redis cluster write operations"
  sensitive   = true # Endpoint information should be treated as sensitive
}

output "reader_endpoint" {
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
  description = "Reader endpoint address for Redis cluster read operations in multi-AZ deployments"
  sensitive   = true # Endpoint information should be treated as sensitive
}

output "port" {
  value       = aws_elasticache_replication_group.main.port
  description = "Port number for Redis cluster connections"
}

output "cluster_id" {
  value       = aws_elasticache_replication_group.main.id
  description = "Identifier of the ElastiCache Redis cluster for resource tracking"
}