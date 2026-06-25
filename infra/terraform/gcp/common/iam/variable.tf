variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "organization_operator_impersonators" {
  description = "IAM members allowed to impersonate the organization-operator service account."
  type        = set(string)
}

variable "batch_scheduler_service_account_name" {
  description = "Cloud Scheduler service account resource name."
  type        = string
}

variable "batch_scheduler_service_account_email" {
  description = "Cloud Scheduler service account email."
  type        = string
}

variable "batch_worker_service_account_name" {
  description = "Cloud Run batch worker service account resource name."
  type        = string
}

variable "batch_worker_service_account_email" {
  description = "Cloud Run batch worker service account email."
  type        = string
}

variable "github_deployer_service_account_name" {
  description = "GitHub deployer service account resource name."
  type        = string
}

variable "github_deployer_service_account_email" {
  description = "GitHub deployer service account email."
  type        = string
}

variable "organization_operator_service_account_name" {
  description = "Organization operator service account resource name."
  type        = string
}

variable "organization_operator_service_account_email" {
  description = "Organization operator service account email."
  type        = string
}

variable "app_hosting_compute_service_account_email" {
  description = "Firebase App Hosting compute service account email."
  type        = string
}
