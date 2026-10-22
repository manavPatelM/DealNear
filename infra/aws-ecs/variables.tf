variable "region" {
  description = "AWS region (Learner Lab allows us-east-1 and us-west-2)."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name used in resource names."
  type        = string
  default     = "ecs"
}

variable "task_role_name" {
  description = "Existing IAM role used as both ECS task execution role and task role. Learner Lab provides LabRole and blocks creating roles."
  type        = string
  default     = "LabRole"
}

variable "image_tag" {
  description = "Image tag pushed to ECR by scripts/push-images.ps1."
  type        = string
  default     = "latest"
}

variable "db_instance_class" {
  description = "RDS instance size."
  type        = string
  default     = "db.t3.micro"
}

variable "admin_email" {
  description = "Bootstrap admin email (password is generated and stored in Secrets Manager)."
  type        = string
  default     = "admin@dealnear.local"
}

variable "enable_cloudfront" {
  description = "Put CloudFront in front of the ALB for an HTTPS URL. Off by default: AWS Academy Learner Lab denies cloudfront:CreateDistribution."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention per service."
  type        = number
  default     = 3
}
