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

variable "firebase_web_app_id" {
  description = "Firebase Web App ID used by App Hosting."
  type        = string
}

variable "firebase_web_app_display_name" {
  description = "Display name of the Firebase Web App."
  type        = string
}

variable "app_hosting_backend_id" {
  description = "Firebase App Hosting backend ID."
  type        = string
}

variable "app_hosting_location" {
  description = "Firebase App Hosting and Developer Connect location."
  type        = string
}

variable "developer_connect_connection_id" {
  description = "Developer Connect GitHub connection ID used by App Hosting."
  type        = string
}

variable "developer_connect_repository_link_id" {
  description = "Developer Connect Git repository link ID."
  type        = string
}

variable "developer_connect_oauth_token_secret_version" {
  description = "Existing Secret Manager version resource name used by Developer Connect to authorize GitHub."
  type        = string
}

variable "github_app_installation_id" {
  description = "Firebase GitHub App installation ID."
  type        = string
}

variable "authorized_domains" {
  description = "Domains allowed by Firebase Authentication for OAuth redirects."
  type        = set(string)
}
