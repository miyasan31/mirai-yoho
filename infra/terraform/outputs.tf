output "batch_scheduler_service_account_email" {
  description = "Principal that Cloud Scheduler uses to invoke Cloud Run Jobs."
  value       = google_service_account.batch_scheduler.email
}

output "organization_operator_service_account_email" {
  description = "Service account used for local organization setup via impersonation."
  value       = google_service_account.organization_operator.email
}

output "scheduler_job_names" {
  description = "Cloud Scheduler job names keyed by organization and batch type."
  value = {
    for key, job in google_cloud_scheduler_job.batch : key => job.name
  }
}

output "batch_worker_job_names" {
  description = "Shared Cloud Run Job names keyed by batch command."
  value = {
    for command, job in google_cloud_run_v2_job.batch : command => job.name
  }
}

output "github_workload_identity_provider" {
  description = "Workload Identity Provider resource name for GitHub Actions."
  value       = google_iam_workload_identity_pool_provider.github.name
}
