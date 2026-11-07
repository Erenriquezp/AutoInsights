output "state_bucket" {
  description = "Bucket that holds the app stack's state."
  value       = aws_s3_bucket.state.bucket
}

output "backend_config" {
  description = "Contents for infra/app/backend.hcl."
  value       = <<-EOT
    bucket = "${aws_s3_bucket.state.bucket}"
    region = "${var.region}"
  EOT
}

output "budget_name" {
  description = "Name of the monthly cost budget."
  value       = aws_budgets_budget.monthly.name
}
