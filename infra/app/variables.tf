variable "region" {
  description = "AWS region for the API and the frontend bucket (CloudFront itself is global)."
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

variable "environment" {
  description = "Deployment name. There is one public demo, so the default is prod."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging"], var.environment)
    error_message = "environment must be prod or staging."
  }
}

variable "api_package_path" {
  description = "Lambda zip built by `python -m serverless.build` in backend/."
  type        = string
  default     = "../../backend/build/lambda/api.zip"
}

variable "api_reserved_concurrency" {
  description = "Concurrent executions reserved for (and capping) the API; -1 leaves it unreserved. Check the account's concurrency quota first: AWS keeps 10 unreserved."
  type        = number
  default     = -1
}

variable "api_environment" {
  description = "Extra API settings (see .env.example), e.g. ASK_PER_DAY. Never put API keys here: they go to SSM."
  type        = map(string)
  default     = {}
}
