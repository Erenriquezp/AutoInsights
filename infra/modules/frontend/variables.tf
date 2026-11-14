variable "name" {
  description = "Prefix for the bucket, the distribution's policies and its function."
  type        = string
}

variable "api_origin_domain" {
  description = "Host name of the API's Lambda Function URL, served under /api/*."
  type        = string
}

variable "price_class" {
  description = "CloudFront edge locations to use. PriceClass_100 (North America and Europe) is the cheapest."
  type        = string
  default     = "PriceClass_100"
}
