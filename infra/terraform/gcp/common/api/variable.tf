variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Cloud Run region."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name for the API server."
  type        = string
  default     = "api"
}

variable "api_image" {
  description = "Artifact Registry image URI for the Cloud Run API server, tagged with the Git SHA."
  type        = string
}

variable "api_server_service_account_email" {
  description = "Cloud Run API server runtime service account email."
  type        = string
}

variable "min_instance_count" {
  description = "Minimum number of Cloud Run instances."
  type        = number
  default     = 0
}

variable "max_instance_count" {
  description = "Maximum number of Cloud Run instances."
  type        = number
  default     = 4
}

variable "api_custom_domain" {
  description = "Custom domain to map to the Cloud Run API service. Set to null to skip domain mapping (run.app URL only)."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition     = var.api_custom_domain == null || can(regex("^[a-z0-9][a-z0-9.-]*[a-z0-9]$", var.api_custom_domain))
    error_message = "api_custom_domain must be a valid lowercase domain name, or null."
  }
}
