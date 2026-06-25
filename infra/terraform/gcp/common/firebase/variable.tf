variable "project_id" {
  description = "GCP project ID."
  type        = string
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

variable "authorized_domains" {
  description = "Domains allowed by Firebase Authentication for OAuth redirects."
  type        = set(string)
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

  validation {
    condition     = can(regex("^projects/[^/]+/secrets/[^/]+/versions/[^/]+$", var.developer_connect_oauth_token_secret_version))
    error_message = "developer_connect_oauth_token_secret_version must be in the format projects/<project>/secrets/<secret>/versions/<version>."
  }
}

variable "github_app_installation_id" {
  description = "Firebase GitHub App installation ID."
  type        = string
}

variable "app_hosting_compute_service_account_email" {
  description = "Firebase App Hosting compute service account email."
  type        = string
}
