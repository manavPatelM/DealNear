output "public_ip" {
  description = "Elastic IP of the app server. Point your domain's A record here."
  value       = aws_eip.app.public_ip
}

output "app_url" {
  description = "Where the app is served once the boot script finishes (about 10-15 minutes)."
  value       = var.domain_name == "" ? "http://${aws_eip.app.public_ip}" : "https://${var.domain_name}"
}

output "instance_id" {
  description = "Use with: aws ssm start-session --target <instance_id>"
  value       = aws_instance.app.id
}

output "admin_password_command" {
  description = "Run inside a Session Manager shell to read the generated admin password."
  value       = "sudo grep ADMIN_BOOTSTRAP_PASSWORD /opt/dealnear/.env.prod"
}
