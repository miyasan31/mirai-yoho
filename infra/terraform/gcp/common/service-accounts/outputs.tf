output "batch_scheduler_service_account_name" {
  description = "Cloud Scheduler service account resource name."
  value       = google_service_account.batch_scheduler.name
}

output "batch_scheduler_service_account_email" {
  description = "Cloud Scheduler service account email."
  value       = google_service_account.batch_scheduler.email
}

output "batch_worker_service_account_name" {
  description = "Cloud Run batch worker service account resource name."
  value       = google_service_account.batch_worker.name
}

output "batch_worker_service_account_email" {
  description = "Cloud Run batch worker service account email."
  value       = google_service_account.batch_worker.email
}

output "github_deployer_service_account_name" {
  description = "GitHub deployer service account resource name."
  value       = google_service_account.github_deployer.name
}

output "github_deployer_service_account_email" {
  description = "GitHub deployer service account email."
  value       = google_service_account.github_deployer.email
}

output "organization_operator_service_account_name" {
  description = "Organization operator service account resource name."
  value       = google_service_account.organization_operator.name
}

output "organization_operator_service_account_email" {
  description = "Organization operator service account email."
  value       = google_service_account.organization_operator.email
}

output "app_hosting_compute_service_account_email" {
  description = "Firebase App Hosting compute service account email."
  value       = google_service_account.app_hosting_compute.email
}
