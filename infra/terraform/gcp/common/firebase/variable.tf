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

variable "spa_hosting_custom_domains" {
  description = "Custom domains for the SPA Firebase Hosting sites, keyed by site (user / admin / consultant). Omit a key to skip custom domain management for that site."
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for site in keys(var.spa_hosting_custom_domains) : contains(["user", "admin", "consultant"], site)])
    error_message = "spa_hosting_custom_domains keys must be one of: user, admin, consultant."
  }

  validation {
    condition     = alltrue([for domain in values(var.spa_hosting_custom_domains) : can(regex("^[a-z0-9][a-z0-9.-]*[a-z0-9]$", domain))])
    error_message = "spa_hosting_custom_domains values must be valid lowercase domain names."
  }
}

