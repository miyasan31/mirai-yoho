provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "developerconnect.googleapis.com",
    "firebase.googleapis.com",
    "firebaseapphosting.googleapis.com",
    "firebaserules.googleapis.com",
    "firebasestorage.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "identitytoolkit.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sts.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "batch_worker" {
  project       = var.project_id
  location      = var.region
  repository_id = "batch-worker"
  description   = "Container images for Cloud Run batch workers"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old-worker-images"
    action = "DELETE"

    condition {
      tag_state = "ANY"
    }
  }

  cleanup_policies {
    id     = "keep-latest-ten-worker-images"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_service_account" "batch_scheduler" {
  project      = var.project_id
  account_id   = "batch-scheduler"
  display_name = "Cloud Scheduler batch invoker"
}

resource "google_service_account" "batch_worker" {
  project      = var.project_id
  account_id   = "batch-worker"
  display_name = "Cloud Run batch worker runtime"
}

resource "google_service_account" "github_deployer" {
  project      = var.project_id
  account_id   = "github-deployer"
  display_name = "GitHub Actions worker deployer"
}

resource "google_service_account_iam_member" "scheduler_can_mint_oidc_token" {
  service_account_id = google_service_account.batch_scheduler.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"

  depends_on = [google_project_service.required]
}

locals {
  worker_secret_names_by_command = {
    charge = toset([
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_PROJECT_ID",
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "STRIPE_SECRET_KEY",
    ])
    consultation-reminders = toset([
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_PROJECT_ID",
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
    ])
    late-arrival-alerts = toset([
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_PROJECT_ID",
      "LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL",
      "NEXT_PUBLIC_APP_URL",
    ])
  }

  worker_secret_names = toset(flatten(values(local.worker_secret_names_by_command)))

  batch_worker_jobs = {
    charge = {
      command = "charge"
      name    = "batch-charge"
    }
    consultation-reminders = {
      command = "consultation-reminders"
      name    = "batch-consultation-reminders"
    }
    late-arrival-alerts = {
      command = "late-arrival-alerts"
      name    = "batch-late-arrival-alerts"
    }
  }

  batch_jobs = {
    for job in flatten([
      for organization_id in var.organization_ids : [
        {
          key             = "${organization_id}-charge"
          organization_id = organization_id
          name            = "batch-charge-${organization_id}"
          command         = "charge"
          schedule        = "0 0 * * *"
        },
        {
          key             = "${organization_id}-consultation-reminders"
          organization_id = organization_id
          name            = "consultation-reminders-${organization_id}"
          command         = "consultation-reminders"
          schedule        = "*/15 * * * *"
        },
        {
          key             = "${organization_id}-late-arrival-alerts"
          organization_id = organization_id
          name            = "late-arrival-alerts-${organization_id}"
          command         = "late-arrival-alerts"
          schedule        = "*/30 * * * *"
        },
      ]
    ]) : job.key => job
  }
}

resource "google_project_iam_member" "batch_worker_roles" {
  for_each = toset([
    "roles/datastore.user",
    "roles/firebaseauth.admin",
    "roles/logging.logWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.batch_worker.email}"
}

resource "google_secret_manager_secret_iam_member" "batch_worker_can_read_secrets" {
  for_each = local.worker_secret_names

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.batch_worker.email}"
}

resource "google_cloud_run_v2_job" "batch" {
  for_each = local.batch_worker_jobs

  project  = var.project_id
  name     = each.value.name
  location = var.region

  template {
    template {
      service_account = google_service_account.batch_worker.email
      max_retries     = 3
      timeout         = "900s"

      containers {
        image = var.worker_image
        args  = [each.value.command]

        dynamic "env" {
          for_each = local.worker_secret_names_by_command[each.key]
          content {
            name = env.value
            value_source {
              secret_key_ref {
                secret  = env.value
                version = "latest"
              }
            }
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_project_iam_member.batch_worker_roles,
    google_secret_manager_secret_iam_member.batch_worker_can_read_secrets,
  ]
}

resource "google_project_iam_custom_role" "scheduler_job_runner" {
  project     = var.project_id
  role_id     = "schedulerJobRunner"
  title       = "Cloud Scheduler Job Runner"
  description = "Runs Cloud Run Jobs with the organization argument override."
  permissions = [
    "run.jobs.run",
    "run.jobs.runWithOverrides",
  ]
}

resource "google_cloud_run_v2_job_iam_member" "scheduler_can_run_batch" {
  for_each = local.batch_worker_jobs

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.batch[each.key].name
  role     = google_project_iam_custom_role.scheduler_job_runner.name
  member   = "serviceAccount:${google_service_account.batch_scheduler.email}"
}

resource "google_cloud_scheduler_job" "batch" {
  for_each = local.batch_jobs

  project     = var.project_id
  region      = var.region
  name        = each.value.name
  description = "${each.value.organization_id}: ${each.value.command} Cloud Run Job"
  schedule    = each.value.schedule
  time_zone   = "Asia/Tokyo"

  http_target {
    http_method = "POST"
    uri         = "https://run.googleapis.com/v2/projects/${var.project_id}/locations/${var.region}/jobs/${google_cloud_run_v2_job.batch[each.value.command].name}:run"
    headers     = { "Content-Type" = "application/json" }
    body = base64encode(jsonencode({
      overrides = {
        containerOverrides = [{
          args = [each.value.command, "--organization-id", each.value.organization_id]
        }]
      }
    }))

    oauth_token {
      service_account_email = google_service_account.batch_scheduler.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }

  retry_config {
    retry_count = 3
  }

  depends_on = [
    google_cloud_run_v2_job_iam_member.scheduler_can_run_batch,
    google_service_account_iam_member.scheduler_can_mint_oidc_token,
  ]
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions OIDC"
  attribute_condition                = "assertion.repository == 'miyasan31/mirai-yoho' && (assertion.ref == 'refs/heads/release/dev' || assertion.ref == 'refs/heads/release/prod')"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_can_impersonate_deployer" {
  service_account_id = google_service_account.github_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/miyasan31/mirai-yoho"
}

resource "google_project_iam_member" "github_deployer_roles" {
  for_each = toset([
    "roles/artifactregistry.writer",
    "roles/cloudbuild.builds.editor",
    "roles/datastore.owner",
    "roles/developerconnect.admin",
    "roles/firebase.admin",
    "roles/firebaseapphosting.admin",
    "roles/firebaserules.admin",
    "roles/iam.serviceAccountAdmin",
    "roles/identityplatform.admin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/run.admin",
    "roles/secretmanager.admin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/storage.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_service_account_iam_member" "github_can_deploy_worker" {
  service_account_id = google_service_account.batch_worker.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer.email}"
}
