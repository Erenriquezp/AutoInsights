output "url" {
  description = "Public URL of the demo."
  value       = "https://${module.frontend.distribution_domain}"
}

output "frontend_bucket" {
  description = "Bucket for the dashboard build (aws s3 sync frontend/dist s3://<bucket>)."
  value       = module.frontend.bucket_name
}

output "distribution_id" {
  description = "CloudFront distribution id, for invalidations after an upload."
  value       = module.frontend.distribution_id
}

output "api_function_name" {
  description = "Name of the API Lambda function (logs: /aws/lambda/<name>)."
  value       = module.api.function_name
}

output "ssm_parameters" {
  description = "Parameters to set with the real LLM keys (aws ssm put-parameter --overwrite)."
  value       = module.api.ssm_parameter_names
}
