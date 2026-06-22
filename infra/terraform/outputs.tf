output "batch_scheduler_service_account_email" {
  description = "Principal accepted by the application for Cloud Scheduler batch requests."
  value       = google_service_account.batch_scheduler.email
}

output "batch_job_names" {
  description = "Cloud Scheduler job names keyed by organization and batch type."
  value = {
    for key, job in google_cloud_scheduler_job.batch : key => job.name
  }
}
