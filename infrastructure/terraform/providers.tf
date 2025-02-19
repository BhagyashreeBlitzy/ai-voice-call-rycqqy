# ---------------------------------------------------------------------------------------------------------------------
# TERRAFORM CONFIGURATION
# Defines required providers and versions for infrastructure deployment
# ---------------------------------------------------------------------------------------------------------------------
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# AWS PROVIDER CONFIGURATION
# Primary cloud provider with security and tagging controls
# ---------------------------------------------------------------------------------------------------------------------
provider "aws" {
  region = var.aws_region

  # Comprehensive resource tagging strategy
  default_tags {
    tags = {
      Project             = "AI Voice Agent"
      Environment         = var.environment
      ManagedBy          = "Terraform"
      Owner              = "DevOps"
      SecurityLevel      = "High"
      DataClassification = "Sensitive"
    }
  }

  # Security controls
  allowed_account_ids = [var.aws_account_id]
  max_retries        = 5

  # Cross-account role assumption for secure access
  assume_role {
    role_arn     = var.terraform_role_arn
    session_name = "TerraformSession"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# KUBERNETES PROVIDER CONFIGURATION
# EKS cluster management with secure authentication
# ---------------------------------------------------------------------------------------------------------------------
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      var.eks_cluster_name
    ]
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# HELM PROVIDER CONFIGURATION
# Kubernetes package management with secure repository access
# ---------------------------------------------------------------------------------------------------------------------
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        var.eks_cluster_name
      ]
    }
  }

  registry {
    url      = var.helm_repository_url
    username = var.helm_repository_username
    password = var.helm_repository_password
  }
}