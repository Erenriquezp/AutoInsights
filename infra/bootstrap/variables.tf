variable "region" {
  description = "AWS region for the state bucket and the app."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name, used in resource names and tags."
  type        = string
  default     = "autoinsights"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project))
    error_message = "Use 3-21 lowercase letters, digits or hyphens, starting with a letter."
  }
}

variable "budget_email" {
  description = "Email address that receives the budget alerts."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.budget_email))
    error_message = "budget_email must be an email address."
  }
}

variable "budget_limit_usd" {
  description = "Monthly cost budget in USD. The demo is designed to cost $0, so any charge is an alert."
  type        = number
  default     = 1

  validation {
    condition     = var.budget_limit_usd > 0
    error_message = "budget_limit_usd must be greater than 0."
  }
}

variable "state_version_retention_days" {
  description = "Days to keep old versions of the state file (a way back after a bad apply)."
  type        = number
  default     = 90
}
