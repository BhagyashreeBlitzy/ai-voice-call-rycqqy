# Terraform outputs for EKS cluster module
# Provider version: hashicorp/terraform ~> 1.0

output "cluster_id" {
  description = "The EKS cluster identifier used for resource referencing and management"
  value       = aws_eks_cluster.main.id
  sensitive   = false
}

output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server, used for Kubernetes API access"
  value       = aws_eks_cluster.main.endpoint
  sensitive   = false
}

output "cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster for network access control"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  sensitive   = false
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required for secure cluster authentication and communication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_oidc_issuer_url" {
  description = "The URL of the OpenID Connect identity provider for IAM role and service mesh configuration"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
  sensitive   = false
}

output "node_groups" {
  description = "Map of node groups created and their configurations including instance types, scaling settings, and labels"
  value       = aws_eks_node_group.main
  sensitive   = false
}