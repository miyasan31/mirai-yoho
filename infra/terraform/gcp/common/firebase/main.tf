locals {
  # Cloud Run API サーバー / batch worker がランタイムで env として参照する Secret Manager シークレット一覧。
  # このモジュールでシークレット実体を作成し、consumer 側（common/api, common/batch）は
  # runtime_secret_ids output を受け取って IAM binding + env mount を行う。
  runtime_secret_ids = toset([
    "API_URL",
    "USER_APP_URL",
    "CONSOLE_APP_URL",
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

  # runtime_secret_ids のうち operator が手動で gcloud に作成・投入するため
  # terraform 管理から外すもの。過去には ADMIN_APP_URL もこの扱いだった。
  externally_managed_secret_ids = toset([
    "CONSOLE_APP_URL",
  ])

  # このモジュールが実体を作成する（= terraform apply で create される）シークレット。
  terraform_managed_secret_ids = setsubtract(local.runtime_secret_ids, local.externally_managed_secret_ids)

  # SPA サイトのカスタムドメイン用。site キー（user/console/consultant）→ site_id。
  spa_hosting_site_ids = {
    user       = google_firebase_hosting_site.user_spa.site_id
    console    = google_firebase_hosting_site.console_spa.site_id
    consultant = google_firebase_hosting_site.consultant_spa.site_id
  }

  spa_hosting_custom_domain_dns_records_to_add = flatten([
    for site, domain in google_firebase_hosting_custom_domain.spa : [
      for update in domain.required_dns_updates : [
        for desired in update.desired : [
          for record in desired.records : {
            site          = site
            custom_domain = domain.custom_domain
            domain_name   = record.domain_name
            xserver_name  = trimsuffix(record.domain_name, ".")
            type          = record.type
            value         = record.rdata
            action        = record.required_action
          }
          if record.required_action == "ADD"
        ]
      ]
    ]
  ])

  spa_hosting_custom_domain_dns_records_to_remove = flatten([
    for site, domain in google_firebase_hosting_custom_domain.spa : [
      for update in domain.required_dns_updates : [
        for discovered in update.discovered : [
          for record in discovered.records : {
            site          = site
            custom_domain = domain.custom_domain
            domain_name   = record.domain_name
            xserver_name  = trimsuffix(record.domain_name, ".")
            type          = record.type
            value         = record.rdata
            action        = record.required_action
          }
          if record.required_action == "REMOVE"
        ]
      ]
    ]
  ])
}

resource "google_firestore_database" "default" {
  project                 = var.project_id
  name                    = "(default)"
  location_id             = var.firestore_location
  type                    = "FIRESTORE_NATIVE"
  concurrency_mode        = "PESSIMISTIC"
  delete_protection_state = "DELETE_PROTECTION_ENABLED"
  deletion_policy         = "ABANDON"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_firestore_index" "composite" {
  for_each = {
    slots-by-consultant-reserved-start = {
      collection = "slots"
      fields = [
        ["organizationId", "ASCENDING"],
        ["consultantId", "ASCENDING"],
        ["isAvailable", "ASCENDING"],
        ["startsAt", "ASCENDING"],
      ]
    }
    slots-by-consultant-start = {
      collection = "slots"
      fields = [
        ["organizationId", "ASCENDING"],
        ["consultantId", "ASCENDING"],
        ["startsAt", "ASCENDING"],
      ]
    }
    slots-by-reserved-start = {
      collection = "slots"
      fields = [
        ["organizationId", "ASCENDING"],
        ["isAvailable", "ASCENDING"],
        ["startsAt", "ASCENDING"],
      ]
    }
    slots-by-start = {
      collection = "slots"
      fields = [
        ["organizationId", "ASCENDING"],
        ["startsAt", "ASCENDING"],
      ]
    }
    price-plans-by-status = {
      collection = "price-plans"
      fields = [
        ["organizationId", "ASCENDING"],
        ["consultantId", "ASCENDING"],
        ["status", "ASCENDING"],
      ]
    }
    price-plans-by-name-price = {
      collection = "price-plans"
      fields = [
        ["organizationId", "ASCENDING"],
        ["consultantId", "ASCENDING"],
        ["normalizedName", "ASCENDING"],
        ["totalJPY", "ASCENDING"],
      ]
    }
  }

  project     = var.project_id
  database    = google_firestore_database.default.name
  collection  = each.value.collection
  query_scope = "COLLECTION"

  dynamic "fields" {
    for_each = each.value.fields

    content {
      field_path = fields.value[0]
      order      = fields.value[1]
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket" "firebase_default" {
  count = var.manage_firebase_storage_bucket ? 1 : 0

  project                     = var.project_id
  name                        = var.firebase_storage_bucket_name
  location                    = var.firebase_storage_location
  storage_class               = "STANDARD"
  force_destroy               = false
  uniform_bucket_level_access = false
  public_access_prevention    = "inherited"

  cors {
    origin          = sort(tolist(var.firebase_storage_cors_origins))
    method          = ["PUT", "GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "x-goog-resumable"]
    max_age_seconds = 3600
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_identity_platform_config" "default" {
  project            = var.project_id
  authorized_domains = sort(tolist(var.authorized_domains))

  sign_in {
    email {
      enabled           = true
      password_required = true
    }

    anonymous {
      enabled = true
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_firebase_hosting_site" "user_spa" {
  provider = google-beta
  project  = var.project_id
  site_id  = "${var.project_id}-user"
}

resource "google_firebase_hosting_site" "console_spa" {
  provider = google-beta
  project  = var.project_id
  site_id  = "${var.project_id}-console"
}

resource "google_firebase_hosting_site" "consultant_spa" {
  provider = google-beta
  project  = var.project_id
  site_id  = "${var.project_id}-consultant"
}

# NOTE: 旧 `${project}-admin` サイトは `${project}-console` へ再統合されたため廃止。
# 旧サイトはカットオーバー完了後に手動削除する（Firebase Console もしくは
# `firebase hosting:sites:delete`）。state 上は `moved` block で console_spa へ
# 引き継ぐが、`site_id` が ForceNew のため実質は destroy + create となる。

# SPA サイトのカスタムドメイン。App Hosting（api）と同じく Terraform で管理する。
# DNS は外部（Xserver）管理のため、apply では検証を待たず（wait_dns_verification = false）、
# 追加すべきレコードを output で提示する運用（App Hosting のドメインと同じ流儀）。
resource "google_firebase_hosting_custom_domain" "spa" {
  for_each = var.spa_hosting_custom_domains

  provider      = google-beta
  project       = var.project_id
  site_id       = local.spa_hosting_site_ids[each.key]
  custom_domain = each.value
  # 既存の手動作成ドメインは PROJECT_GROUPED で作られているため実態に合わせる（import 後の差分回避）。
  cert_preference       = "PROJECT_GROUPED"
  wait_dns_verification = false
}

# Cloud Run API サーバー（common/api）と batch worker（common/batch）がランタイムで参照する
# Secret Manager シークレットの実体。App Hosting 撤去後も現役のため保持する。
# リソース名 "app_hosting" は state / moved ブロックとの互換のため据え置き。
resource "google_secret_manager_secret" "app_hosting" {
  for_each = local.terraform_managed_secret_ids

  project             = var.project_id
  secret_id           = each.value
  deletion_protection = true

  replication {
    auto {}
  }
}

