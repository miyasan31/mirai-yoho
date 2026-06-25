variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Cloud Scheduler and Cloud Run region."
  type        = string
}

variable "worker_image" {
  description = "Artifact Registry image URI for Cloud Run batch workers, tagged with the Git SHA."
  type        = string
}

variable "organization_ids" {
  description = "Organization IDs for which batch jobs are created."
  type        = set(string)
}

variable "batch_scheduler_service_account_email" {
  description = "Cloud Scheduler service account email."
  type        = string
}

variable "batch_worker_service_account_email" {
  description = "Cloud Run batch worker service account email."
  type        = string
}

variable "scheduler_job_runner_role_name" {
  description = "Custom role name allowed to run Cloud Run Jobs with overrides."
  type        = string
}
