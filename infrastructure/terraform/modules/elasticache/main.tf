# AWS ElastiCache Redis Module for AI Voice Agent
# Provider version: ~> 5.0

terraform {
  required_version = "~> 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Subnet group for network isolation
resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.cluster_name}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for Redis cluster network isolation"
  tags        = var.tags
}

# Parameter group with optimized settings for session management
resource "aws_elasticache_parameter_group" "main" {
  family      = var.parameter_group_family
  name        = "${var.cluster_name}-params"
  description = "Custom parameters for AI Voice Agent Redis cluster"

  # Performance and behavior parameters
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"  # Evict least recently used keys with expiration set
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Enable keyspace notifications for expired events
  }

  parameter {
    name  = "timeout"
    value = "300"  # Connection timeout in seconds
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"  # TCP keepalive interval
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"  # Sample size for LRU eviction
  }

  tags = var.tags
}

# Redis replication group with enhanced security and high availability
resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = var.cluster_name
  description                   = "Redis cluster for AI Voice Agent session management"
  node_type                     = var.node_type
  num_cache_clusters           = var.replica_count + 1  # Primary + replicas
  port                         = var.port
  parameter_group_name         = aws_elasticache_parameter_group.main.name
  subnet_group_name            = aws_elasticache_subnet_group.main.name
  security_group_ids           = var.security_group_ids
  
  # High availability settings
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  
  # Engine configuration
  engine                      = "redis"
  engine_version              = "7.0"
  
  # Maintenance settings
  maintenance_window          = var.maintenance_window
  snapshot_retention_limit    = 7  # Keep backups for 7 days
  snapshot_window             = "03:00-05:00"  # Backup window
  
  # Security settings
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token_enabled         = true
  
  # Updates and notifications
  auto_minor_version_upgrade = true
  
  tags = var.tags
}

# Outputs for cluster access
output "primary_endpoint_address" {
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  description = "Primary endpoint for Redis cluster"
}

output "reader_endpoint_address" {
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
  description = "Reader endpoint for Redis cluster"
}

output "port" {
  value       = aws_elasticache_replication_group.main.port
  description = "Port number for Redis connections"
}

output "configuration_endpoint_address" {
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
  description = "Configuration endpoint for Redis cluster"
}

output "auth_token" {
  value       = aws_elasticache_replication_group.main.auth_token
  description = "Authentication token for Redis connections"
  sensitive   = true
}