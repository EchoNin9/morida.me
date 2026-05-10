variable "awsRegion" {
  description = "AWS region for resources."
  type        = string
  default     = "us-east-1"
}

variable "githubOrgRepo" {
  description = "GitHub org/repo for OIDC trust (e.g. EchoNin9/morida.me)."
  type        = string
}

variable "terraformStateBucket" {
  description = "S3 bucket name for Terraform state."
  type        = string
  default     = "mo-aws-s3-terraform-state"
}

variable "terraformStateLockTable" {
  description = "DynamoDB table name for Terraform state locking."
  type        = string
  default     = "mo-terraform-state-lock"
}

variable "websiteStagingBucket" {
  description = "S3 bucket name for staging frontend."
  type        = string
  default     = "mo-website-staging"
}

variable "websiteProductionBucket" {
  description = "S3 bucket name for production frontend."
  type        = string
  default     = "mo-website-production"
}

variable "dynamoTableName" {
  description = "DynamoDB table name (single table for shows, media, updates, press, users, etc.)."
  type        = string
  default     = "mo-main"
}

variable "cognitoUserPoolName" {
  description = "Cognito User Pool name."
  type        = string
  default     = "mo-user-pool"
}

variable "cognitoAppClientName" {
  description = "Cognito User Pool App Client name (frontend)."
  type        = string
  default     = "mo-web"
}

variable "cognitoDomainPrefix" {
  description = "Cognito hosted UI domain prefix (e.g. mo-auth). Empty to skip domain."
  type        = string
  default     = "mo-auth"
}

variable "lambdaApiFunctionName" {
  description = "Lambda function name for the API handler."
  type        = string
  default     = "mo-api"
}

variable "apiGatewayName" {
  description = "API Gateway HTTP API name."
  type        = string
  default     = "mo-api"
}

variable "mediaBucketName" {
  description = "S3 bucket name for user uploads (audio, video, images). Must be passed in (no default to avoid hardcoding account ID)."
  type        = string
}

# ------------------------------------------------------------------------------
# Custom domain (CloudFront + ClouDNS — DNS is managed manually outside Terraform)
# ------------------------------------------------------------------------------
variable "domain" {
  description = "Primary domain (morida.me)."
  type        = string
  default     = "morida.me"
}

variable "stagingDomain" {
  description = "Full staging hostname (e.g. stage.morida.me)."
  type        = string
  default     = "stage.morida.me"
}
