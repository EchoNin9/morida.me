# ------------------------------------------------------------------------------
# ACM certificate – single cert for morida.me + *.morida.me
# CloudFront requires us-east-1.
#
# DNS is managed in ClouDNS (not Route 53). The certificate will sit in
# PENDING_VALIDATION until the DNS validation CNAME records emitted by
# `acmValidationCnameNames` / `acmValidationCnameValues` outputs are added
# manually in ClouDNS.
# ------------------------------------------------------------------------------
resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = var.domain
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain}"
  ]

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  staging_aliases = [
    var.stagingDomain
  ]
  production_aliases = [
    var.domain,
    "www.${var.domain}"
  ]
}

# ------------------------------------------------------------------------------
# CloudFront distributions
# ------------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "staging" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Morida staging"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = local.staging_aliases

  origin {
    domain_name = aws_s3_bucket_website_configuration.websiteStaging.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.websiteStaging.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.websiteStaging.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_cloudfront_distribution" "production" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Morida production"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = local.production_aliases

  origin {
    domain_name = aws_s3_bucket_website_configuration.websiteProduction.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.websiteProduction.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.websiteProduction.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
