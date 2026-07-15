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
      # ADMIN_APP_URL は Cloud Run env としては未使用だが、Secret 存続と IAM 維持のため
      # ここに残す（完全移行後に削除。詳細は firebase/main.tf のコメント参照）。
      "ADMIN_APP_URL",
      "CONSOLE_APP_URL",
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

resource "google_secret_manager_secret_iam_member" "batch_worker_can_read_secrets" {
  for_each = local.worker_secret_names

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.batch_worker_service_account_email}"
}

resource "google_cloud_run_v2_job" "batch" {
  for_each = local.batch_worker_jobs

  project  = var.project_id
  name     = each.value.name
  location = var.region

  template {
    template {
      service_account = var.batch_worker_service_account_email
      max_retries     = 3
      timeout         = "900s"

      containers {
        image = var.worker_image
        args  = [each.value.command]

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }

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

  depends_on = [google_secret_manager_secret_iam_member.batch_worker_can_read_secrets]

  # 稼働イメージはリリース時に GitHub Actions が `gcloud run jobs update` で差し替えるため、
  # terraform の管理対象から外す。初回作成時のみ var.worker_image を使用する。
  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_v2_job_iam_member" "scheduler_can_run_batch" {
  for_each = local.batch_worker_jobs

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.batch[each.key].name
  role     = var.scheduler_job_runner_role_name
  member   = "serviceAccount:${var.batch_scheduler_service_account_email}"
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
      service_account_email = var.batch_scheduler_service_account_email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }

  retry_config {
    retry_count = 3
  }

  depends_on = [google_cloud_run_v2_job_iam_member.scheduler_can_run_batch]
}
