output "function_name" {
  description = "Name of the Lambda function."
  value       = aws_lambda_function.api.function_name
}

output "function_url" {
  description = "Function URL (rejects unsigned requests: use the CloudFront URL)."
  value       = aws_lambda_function_url.api.function_url
}

output "function_url_domain" {
  description = "Host name of the Function URL, the CloudFront origin for /api/*."
  value       = split("/", aws_lambda_function_url.api.function_url)[2]
}

output "ssm_parameter_names" {
  description = "Parameter for each hosted-model key, to set with aws ssm put-parameter --overwrite."
  value       = { for key, parameter in aws_ssm_parameter.key : key => parameter.name }
}
