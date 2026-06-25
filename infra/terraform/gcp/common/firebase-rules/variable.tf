variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "storage_bucket_name" {
  description = "Firebase default Cloud Storage bucket name."
  type        = string
}

variable "firestore_rules_path" {
  description = "Absolute path to firestore.rules."
  type        = string
}

variable "storage_rules_path" {
  description = "Absolute path to storage.rules."
  type        = string
}
