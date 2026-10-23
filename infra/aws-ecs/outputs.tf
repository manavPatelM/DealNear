output "app_url" {
  description = "Public URL (HTTPS through CloudFront when enabled)."
  value       = local.public_url
}

output "alb_url" {
  description = "Direct load balancer URL (HTTP)."
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_repositories" {
  description = "One ECR repository per microservice."
  value       = { for k, r in aws_ecr_repository.service : k => r.repository_url }
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "rds_endpoints" {
  description = "One private PostgreSQL instance per microservice."
  value       = { for svc, db in aws_db_instance.service : svc => db.address }
}

output "secret_arn" {
  description = "Secrets Manager secret holding generated credentials."
  value       = aws_secretsmanager_secret.app.arn
}

output "admin_password_command" {
  description = "Prints the bootstrap admin password (keep it private)."
  value       = "aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.app.arn} --query SecretString --output text"
}

output "internal_alb" {
  description = "Private load balancer the microservices use to call each other."
  value       = aws_lb.internal.dns_name
}
