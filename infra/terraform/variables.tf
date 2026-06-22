variable "project_id" {
  description = "GCP project ID that hosts Firebase App Hosting and Cloud Scheduler."
  type        = string
}

variable "region" {
  description = "Cloud Scheduler region."
  type        = string
  default     = "asia-northeast1"
}

variable "app_base_url" {
  description = "Public Firebase App Hosting URL used only by the retained manual batch APIs."
  type        = string

  validation {
    condition     = can(regex("^https://[^/]+(?:/.*)?$", var.app_base_url))
    error_message = "app_base_url must be an HTTPS URL."
  }
}

variable "worker_image" {
  description = "Artifact Registry image URI for Cloud Run batch workers, tagged with the Git SHA."
  type        = string

  validation {
    condition     = can(regex("^.+@sha256:.+$|^.+:.+$", var.worker_image))
    error_message = "worker_image must be a container image URI with a tag or digest."
  }
}

variable "organization_ids" {
  description = "Organization IDs for which batch jobs are created."
  type        = set(string)

  validation {
    condition = alltrue([
      for organization_id in var.organization_ids :
      can(regex("^[a-z0-9-]+$", organization_id))
    ])
    error_message = "organization_ids must contain only lowercase letters, digits, and hyphens."
  }
}
