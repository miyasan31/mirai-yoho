variable "project_id" {
  description = "GCP project ID that hosts Firebase App Hosting and Cloud Scheduler."
  type        = string
}

variable "region" {
  description = "Cloud Scheduler region."
  type        = string
  default     = "asia-northeast1"
}

variable "worker_image" {
  description = "Artifact Registry image URI for Cloud Run batch workers, tagged with the Git SHA."
  type        = string

  validation {
    condition     = can(regex("^.+@sha256:.+$|^.+:.+$", var.worker_image))
    error_message = "worker_image must be a container image URI with a tag or digest."
  }
}

variable "api_image" {
  description = "Artifact Registry image URI for the Cloud Run API server, tagged with the Git SHA."
  type        = string

  validation {
    condition     = can(regex("^.+@sha256:.+$|^.+:.+$", var.api_image))
    error_message = "api_image must be a container image URI with a tag or digest."
  }
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

variable "organization_operator_impersonators" {
  description = "IAM members allowed to impersonate the organization-operator service account for local organization setup. Example: user:admin@example.com"
  type        = set(string)
  default     = []
}

variable "firestore_location" {
  description = "Location of the default Firestore Native database. This cannot be changed after creation."
  type        = string
}

variable "firebase_storage_bucket_name" {
  description = "Existing Firebase default Cloud Storage bucket name."
  type        = string
}

variable "manage_firebase_storage_bucket" {
  description = "Whether Terraform should create/manage the Firebase default Cloud Storage bucket."
  type        = bool
  default     = false
}

variable "firebase_storage_location" {
  description = "Location of the Firebase default Cloud Storage bucket. This cannot be changed after creation."
  type        = string
}

variable "firebase_storage_cors_origins" {
  description = "Origins permitted to upload to the Firebase Storage bucket with V4 signed URLs."
  type        = set(string)
}

variable "spa_hosting_custom_domains" {
  description = "Custom domains for the SPA Firebase Hosting sites, keyed by site (user / console / consultant). Omit a key to skip custom domain management for that site."
  type        = map(string)
  default     = {}
}

variable "authorized_domains" {
  description = "Domains allowed by Firebase Authentication for OAuth redirects."
  type        = set(string)
}
