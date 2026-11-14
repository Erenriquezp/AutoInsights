variable "name" {
  description = "Name of the function and prefix of its log group, role and parameters."
  type        = string
}

variable "package_path" {
  description = "Path to the deployment zip built by `python -m serverless.build` in backend/."
  type        = string
}

variable "distribution_arn" {
  description = "ARN of the CloudFront distribution allowed to call the Function URL."
  type        = string
}

variable "memory_mb" {
  description = "Memory (and with it CPU) for the function, in MB."
  type        = number
  default     = 1024
}

variable "timeout_seconds" {
  description = "Function timeout. CloudFront waits 30 s for the origin by default."
  type        = number
  default     = 15

  validation {
    condition     = var.timeout_seconds >= 1 && var.timeout_seconds <= 30
    error_message = "timeout_seconds must be between 1 and 30 (the CloudFront origin timeout)."
  }
}

variable "reserved_concurrency" {
  description = "Concurrent executions reserved for (and capping) the function; -1 leaves it unreserved. New accounts may have too low a quota to reserve any."
  type        = number
  default     = -1
}

variable "log_retention_days" {
  description = "Days CloudWatch keeps the function logs."
  type        = number
  default     = 7
}

variable "environment" {
  description = "Extra environment variables for the API (see .env.example); they override the defaults set here."
  type        = map(string)
  default     = {}
}
