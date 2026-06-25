output "scheduler_job_runner_role_name" {
  description = "Custom role name allowed to run Cloud Run Jobs with overrides."
  value       = google_project_iam_custom_role.scheduler_job_runner.name
}

output "github_workload_identity_provider" {
  description = "Workload Identity Provider resource name for GitHub Actions."
  value       = google_iam_workload_identity_pool_provider.github.name
}
