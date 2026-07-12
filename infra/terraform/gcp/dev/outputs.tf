output "batch_scheduler_service_account_email" {
  description = "Principal that Cloud Scheduler uses to invoke Cloud Run Jobs."
  value       = module.service_accounts.batch_scheduler_service_account_email
}

output "organization_operator_service_account_email" {
  description = "Service account used for local organization setup via impersonation."
  value       = module.service_accounts.organization_operator_service_account_email
}

output "scheduler_job_names" {
  description = "Cloud Scheduler job names keyed by organization and batch type."
  value       = module.batch.scheduler_job_names
}

output "batch_worker_job_names" {
  description = "Shared Cloud Run Job names keyed by batch command."
  value       = module.batch.batch_worker_job_names
}

output "github_workload_identity_provider" {
  description = "Workload Identity Provider resource name for GitHub Actions."
  value       = module.iam.github_workload_identity_provider
}

output "api_service_uri" {
  description = "Default run.app URL of the Cloud Run API service."
  value       = module.api.api_service_uri
}

output "api_custom_domain_dns_records" {
  description = "DNS records to add in Xserver DNS to activate the Cloud Run API custom domain (empty when api_custom_domain is null)."
  value       = module.api.api_custom_domain_dns_records
}

output "spa_hosting_custom_domain_dns_records_to_add" {
  description = "DNS records to add in Xserver DNS for the SPA (user/admin/consultant) Firebase Hosting custom domains."
  value       = module.firebase.spa_hosting_custom_domain_dns_records_to_add
}

output "spa_hosting_custom_domain_dns_records_to_remove" {
  description = "DNS records to remove from Xserver DNS for the SPA Firebase Hosting custom domains."
  value       = module.firebase.spa_hosting_custom_domain_dns_records_to_remove
}

output "spa_hosting_custom_domain_status" {
  description = "SPA Firebase Hosting custom domain host/ownership/certificate state, keyed by site."
  value       = module.firebase.spa_hosting_custom_domain_status
}
