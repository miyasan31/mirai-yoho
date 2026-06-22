provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {}

resource "google_project_service" "cloud_scheduler" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam_credentials" {
  project            = var.project_id
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "batch_scheduler" {
  project      = var.project_id
  account_id   = "batch-scheduler"
  display_name = "Cloud Scheduler batch invoker"
}

resource "google_service_account_iam_member" "scheduler_can_mint_oidc_token" {
  service_account_id = google_service_account.batch_scheduler.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"

  depends_on = [
    google_project_service.cloud_scheduler,
    google_project_service.iam_credentials,
  ]
}

locals {
  app_base_url = trimsuffix(var.app_base_url, "/")
  batch_jobs = {
    for job in flatten([
      for organization_id in var.organization_ids : [
        {
          key             = "${organization_id}-charge"
          organization_id = organization_id
          name            = "batch-charge-${organization_id}"
          path            = "batch/charge"
          schedule        = "0 0 * * *"
        },
        {
          key             = "${organization_id}-consultation-reminders"
          organization_id = organization_id
          name            = "consultation-reminders-${organization_id}"
          path            = "batch/consultation-reminders"
          schedule        = "* * * * *"
        },
        {
          key             = "${organization_id}-late-arrival-alerts"
          organization_id = organization_id
          name            = "late-arrival-alerts-${organization_id}"
          path            = "batch/late-arrival-alerts"
          schedule        = "* * * * *"
        },
      ]
    ]) : job.key => job
  }
}

resource "google_cloud_scheduler_job" "batch" {
  for_each = local.batch_jobs

  project     = var.project_id
  region      = var.region
  name        = each.value.name
  description = "${each.value.organization_id}: ${each.value.path}"
  schedule    = each.value.schedule
  time_zone   = "Asia/Tokyo"

  http_target {
    http_method = "POST"
    uri         = "${local.app_base_url}/api/organizations/${each.value.organization_id}/${each.value.path}"

    oidc_token {
      service_account_email = google_service_account.batch_scheduler.email
      audience              = local.app_base_url
    }
  }

  retry_config {
    retry_count = 3
  }

  depends_on = [
    google_project_service.cloud_scheduler,
    google_service_account_iam_member.scheduler_can_mint_oidc_token,
  ]
}
