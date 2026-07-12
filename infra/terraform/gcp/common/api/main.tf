locals {
  # Cloud Run API サーバーがランタイムで参照する Secret Manager シークレット。
  # 実体は firebase モジュール（google_secret_manager_secret.app_hosting）で作成済みのものを参照する。
  api_secret_ids = toset([
    "API_URL",
    "USER_APP_URL",
    "ADMIN_APP_URL",
    "CANCEL_TOKEN_SECRET",
    "COUPON_WEBHOOK_SECRET",
    "CORS_ALLOWED_ORIGINS",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "INVOICE_REGISTRATION_NUMBER",
    "LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "ZOOM_ACCOUNT_ID",
    "ZOOM_CLIENT_ID",
    "ZOOM_CLIENT_SECRET",
    "ZOOM_HOST_USER_ID",
    "ZOOM_USER_OAUTH_CLIENT_ID",
    "ZOOM_USER_OAUTH_CLIENT_SECRET",
    "ZOOM_OAUTH_STATE_SECRET",
    "ZOOM_CREDENTIAL_ENCRYPTION_KEY",
  ])
}

resource "google_secret_manager_secret_iam_member" "api_can_read_secrets" {
  for_each = local.api_secret_ids

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_server_service_account_email}"
}

resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = var.service_name
  location = var.region

  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.api_server_service_account_email

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    containers {
      image = var.api_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      dynamic "env" {
        for_each = local.api_secret_ids
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

  depends_on = [google_secret_manager_secret_iam_member.api_can_read_secrets]

  # 稼働イメージはリリース時に GitHub Actions（deploy-api.yml）が
  # `gcloud run services update` で差し替えるため、terraform の管理対象から外す。
  # 初回作成時のみ var.api_image を使用する。
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# SPA（ブラウザ）や Stripe webhook からの外部アクセスを許可する。
# エンドポイントの認可はアプリ内で Firebase ID トークン検証により行う。
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# カスタムドメイン（例: dev.api.miraiyohou.com）。App Hosting からの切替時に設定する。
# 既定は null（run.app URL のみ）。DNS は外部（Xserver）管理のため、必要な DNS レコードは
# output（api_custom_domain_dns_records）で提示する運用（既存の App Hosting / SPA ドメインと同じ流儀）。
resource "google_cloud_run_domain_mapping" "api" {
  count = var.api_custom_domain == null ? 0 : 1

  project  = var.project_id
  location = var.region
  name     = var.api_custom_domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.api.name
  }
}
