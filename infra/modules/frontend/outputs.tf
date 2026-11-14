output "bucket_name" {
  description = "Bucket that holds the dashboard build (upload with aws s3 sync)."
  value       = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  description = "CloudFront distribution id (for cache invalidations after an upload)."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN, the only caller the API accepts."
  value       = aws_cloudfront_distribution.site.arn
}

output "distribution_domain" {
  description = "Public host name of the demo (*.cloudfront.net)."
  value       = aws_cloudfront_distribution.site.domain_name
}
