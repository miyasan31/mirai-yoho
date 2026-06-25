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
