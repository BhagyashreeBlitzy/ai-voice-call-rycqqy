# ---------------------------------------------------------------------------------------------------------------------
# AI VOICE AGENT INFRASTRUCTURE OUTPUTS
# Defines comprehensive output variables for infrastructure deployment
# Version: 1.0.0
# ---------------------------------------------------------------------------------------------------------------------

# ---------------------------------------------------------------------------------------------------------------------
# VPC OUTPUTS
# Network infrastructure details
# ---------------------------------------------------------------------------------------------------------------------
output "vpc_outputs" {
  description = "VPC configuration outputs"
  value = {
    vpc_id              = module.vpc.vpc_id
    vpc_cidr            = module.vpc.vpc_cidr
    private_subnets     = module.vpc.private_subnets
    public_subnets      = module.vpc.public_subnets
    availability_zones  = module.vpc.availability_zones
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# EKS CLUSTER OUTPUTS
# Kubernetes cluster access and configuration details
# ---------------------------------------------------------------------------------------------------------------------
output "eks_outputs" {
  description = "EKS cluster configuration outputs"
  value = {
    cluster_endpoint           = module.eks.cluster_endpoint
    cluster_name              = module.eks.cluster_name
    cluster_version           = module.eks.cluster_version
    cluster_security_group_id = module.eks.cluster_security_group_id
    node_groups              = module.eks.node_groups
  }
  sensitive = true
}

# ---------------------------------------------------------------------------------------------------------------------
# DATABASE OUTPUTS
# RDS PostgreSQL connection information
# ---------------------------------------------------------------------------------------------------------------------
output "database_outputs" {
  description = "RDS database configuration outputs"
  value = {
    endpoint              = module.rds.endpoint
    read_replica_endpoint = module.rds.read_replica_endpoint
    database_name         = module.rds.database_name
    port                 = module.rds.port
  }
  sensitive = true
}

# ---------------------------------------------------------------------------------------------------------------------
# REDIS OUTPUTS
# ElastiCache Redis connection information
# ---------------------------------------------------------------------------------------------------------------------
output "redis_outputs" {
  description = "ElastiCache Redis configuration outputs"
  value = {
    endpoint                = module.elasticache.endpoint
    reader_endpoint         = module.elasticache.reader_endpoint
    configuration_endpoint  = module.elasticache.configuration_endpoint
    port                   = module.elasticache.port
  }
  sensitive = true
}

# ---------------------------------------------------------------------------------------------------------------------
# STORAGE OUTPUTS
# S3 bucket configuration for audio storage
# ---------------------------------------------------------------------------------------------------------------------
output "storage_outputs" {
  description = "S3 storage configuration outputs"
  value = {
    bucket_name         = module.s3.bucket_name
    bucket_arn          = module.s3.bucket_arn
    bucket_region       = module.s3.bucket_region
    bucket_domain_name  = module.s3.bucket_domain_name
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# METADATA OUTPUTS
# Deployment environment information
# ---------------------------------------------------------------------------------------------------------------------
output "environment_metadata" {
  description = "Environment and deployment metadata"
  value = {
    environment = var.environment
    region      = var.aws_region
    project     = "ai-voice-agent"
    version     = "1.0.0"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# MONITORING OUTPUTS
# CloudWatch and monitoring configuration
# ---------------------------------------------------------------------------------------------------------------------
output "monitoring_outputs" {
  description = "Monitoring and logging configuration"
  value = {
    log_group_name     = "/aws/eks/${module.eks.cluster_name}/cluster"
    metrics_namespace  = "AIVoiceAgent"
  }
}