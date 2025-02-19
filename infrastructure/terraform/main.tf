# ---------------------------------------------------------------------------------------------------------------------
# AI VOICE AGENT INFRASTRUCTURE
# Main Terraform configuration for cloud infrastructure deployment
# Version: 1.0.0
# ---------------------------------------------------------------------------------------------------------------------

# ---------------------------------------------------------------------------------------------------------------------
# DATA SOURCES
# Retrieve AWS availability zones for multi-AZ deployment
# ---------------------------------------------------------------------------------------------------------------------
data "aws_availability_zones" "available" {
  state = "available"
}

# ---------------------------------------------------------------------------------------------------------------------
# LOCALS
# Define common tags and configurations
# ---------------------------------------------------------------------------------------------------------------------
locals {
  common_tags = {
    Environment      = var.environment
    Project         = "ai-voice-agent"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceLevel = "standard"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# VPC
# Enhanced VPC with multi-AZ support and security features
# ---------------------------------------------------------------------------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "voice-agent-vpc"
  cidr = var.vpc_cidr

  azs             = data.aws_availability_zones.available.names
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_vpn_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_flow_log        = true
  flow_log_destination_type = "cloud-watch-logs"

  tags = local.common_tags
}

# ---------------------------------------------------------------------------------------------------------------------
# EKS CLUSTER
# Kubernetes cluster with enhanced security and monitoring
# ---------------------------------------------------------------------------------------------------------------------
module "eks" {
  source = "./modules/eks"

  cluster_name    = var.eks_cluster_name
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  enable_encryption = true
  enable_logging    = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  node_groups = {
    main = {
      desired_capacity = 3
      min_capacity    = 2
      max_capacity    = 10
      instance_types  = ["t3.large"]
      capacity_type   = "ON_DEMAND"
    }
  }

  tags = local.common_tags
}

# ---------------------------------------------------------------------------------------------------------------------
# RDS DATABASE
# PostgreSQL database with multi-AZ and enhanced security
# ---------------------------------------------------------------------------------------------------------------------
module "rds" {
  source = "./modules/rds"

  identifier     = "voice-agent-db"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.large"

  allocated_storage     = 100
  max_allocated_storage = 1000
  multi_az             = true

  backup_retention_period      = 7
  deletion_protection         = true
  performance_insights_enabled = true
  storage_encrypted           = true
  monitoring_interval         = 60

  vpc_security_group_ids = [module.vpc.default_security_group_id]
  subnet_ids             = module.vpc.private_subnets

  tags = local.common_tags
}

# ---------------------------------------------------------------------------------------------------------------------
# ELASTICACHE
# Redis cluster with encryption and high availability
# ---------------------------------------------------------------------------------------------------------------------
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id     = "voice-agent-cache"
  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.t3.medium"

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  subnet_group_name = module.vpc.elasticache_subnet_group_name
  security_group_ids = [module.vpc.default_security_group_id]

  tags = local.common_tags
}

# ---------------------------------------------------------------------------------------------------------------------
# S3 STORAGE
# Secure object storage with versioning and lifecycle policies
# ---------------------------------------------------------------------------------------------------------------------
module "s3" {
  source = "./modules/s3"

  bucket_name         = var.s3_bucket_name
  versioning_enabled  = true
  encryption_enabled  = true
  block_public_access = true

  lifecycle_rules = [
    {
      enabled              = true
      transition_to_glacier = 90
      expiration           = 365
    }
  ]

  tags = local.common_tags
}

# ---------------------------------------------------------------------------------------------------------------------
# OUTPUTS
# Export resource identifiers for other configurations
# ---------------------------------------------------------------------------------------------------------------------
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "database_endpoint" {
  description = "Endpoint for RDS database"
  value       = module.rds.endpoint
  sensitive   = true
}