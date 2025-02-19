# Output the complete database endpoint URL (host:port)
output "db_endpoint" {
  description = "Complete endpoint URL for database connections"
  value       = aws_db_instance.main.endpoint
}

# Output the database hostname
output "db_host" {
  description = "Hostname of the RDS instance"
  value       = aws_db_instance.main.address
}

# Output the database port number
output "db_port" {
  description = "Port number for database connections"
  value       = aws_db_instance.main.port
}

# Output the security group ID for the RDS instance
output "db_security_group_id" {
  description = "ID of the security group attached to the RDS instance"
  value       = aws_security_group.rds.id
}