variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name used in resource names and tags."
  type        = string
  default     = "demo"
}

variable "instance_type" {
  description = "EC2 size. 4 GiB RAM (t3.medium) is the minimum for four JVM services, PostgreSQL, and image builds."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_gb" {
  description = "Root EBS volume size; holds Docker images and the PostgreSQL data volume."
  type        = number
  default     = 30
}

variable "repo_url" {
  description = "Git URL the instance clones. A private repository needs a URL with a read-only token."
  type        = string
  default     = "https://github.com/manavPatelM/DealNear.git"
}

variable "repo_branch" {
  description = "Branch to deploy."
  type        = string
  default     = "main"
}

variable "domain_name" {
  description = "Optional domain (e.g. deals.example.com) whose DNS A record you point at the Elastic IP. Empty serves plain HTTP on the IP."
  type        = string
  default     = ""
}

variable "admin_email" {
  description = "Email for the bootstrap admin account (the password is generated on the instance)."
  type        = string
  default     = "admin@dealnear.local"
}

variable "budget_email" {
  description = "Optional email for a monthly cost alert. Empty skips the budget."
  type        = string
  default     = ""
}

variable "monthly_budget_usd" {
  description = "Monthly budget amount that triggers the alert at 80% actual and 100% forecast."
  type        = number
  default     = 50
}
