locals {
  app_hosting_secret_ids = toset([
    "CANCEL_TOKEN_SECRET",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "INVOICE_REGISTRATION_NUMBER",
    "LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "ZOOM_ACCOUNT_ID",
    "ZOOM_CLIENT_ID",
    "ZOOM_CLIENT_SECRET",
    "ZOOM_HOST_USER_ID",
  ])

  app_hosting_build_secret_accessor_members = toset([
    "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com",
    "serviceAccount:service-${data.google_project.current.number}@gcp-sa-firebaseapphosting.iam.gserviceaccount.com",
  ])

  app_hosting_secret_viewer_members = toset(concat(
    [
      "serviceAccount:${var.app_hosting_compute_service_account_email}",
    ],
    tolist(local.app_hosting_build_secret_accessor_members),
  ))
}

data "google_project" "current" {
  project_id = var.project_id
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

resource "google_firebase_web_app" "app_hosting" {
  provider        = google-beta
  project         = var.project_id
  display_name    = var.firebase_web_app_display_name
  deletion_policy = "PREVENT"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_developer_connect_connection" "github" {
  project       = var.project_id
  location      = var.app_hosting_location
  connection_id = var.developer_connect_connection_id

  github_config {
    github_app          = "FIREBASE"
    app_installation_id = var.github_app_installation_id

    authorizer_credential {
      oauth_token_secret_version = var.developer_connect_oauth_token_secret_version
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_developer_connect_git_repository_link" "app" {
  project                = var.project_id
  location               = var.app_hosting_location
  git_repository_link_id = var.developer_connect_repository_link_id
  parent_connection      = var.developer_connect_connection_id
  clone_uri              = "https://github.com/miyasan31/mirai-yoho.git"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_firebase_app_hosting_backend" "app" {
  project          = var.project_id
  location         = var.app_hosting_location
  backend_id       = var.app_hosting_backend_id
  app_id           = google_firebase_web_app.app_hosting.app_id
  service_account  = var.app_hosting_compute_service_account_email
  serving_locality = "GLOBAL_ACCESS"
  environment      = var.project_id == "mirai-yoho-dev" ? "dev" : "prod"
  deletion_policy  = "PREVENT"

  codebase {
    repository     = google_developer_connect_git_repository_link.app.name
    root_directory = "/"
  }
}

resource "google_firebase_app_hosting_traffic" "app" {
  project  = var.project_id
  location = var.app_hosting_location
  backend  = google_firebase_app_hosting_backend.app.backend_id

  rollout_policy {
    codebase_branch = var.project_id == "mirai-yoho-dev" ? "release/dev" : "release/prod"
    disabled        = false
  }

  depends_on = [google_firebase_app_hosting_backend.app]
}

resource "google_secret_manager_secret" "app_hosting" {
  for_each = local.app_hosting_secret_ids

  project             = var.project_id
  secret_id           = each.value
  deletion_protection = true

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "app_hosting_can_read_secrets" {
  for_each = local.app_hosting_secret_ids

  project   = var.project_id
  secret_id = google_secret_manager_secret.app_hosting[each.value].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.app_hosting_compute_service_account_email}"
}

resource "google_secret_manager_secret_iam_member" "app_hosting_build_can_read_secrets" {
  for_each = {
    for pair in setproduct(local.app_hosting_secret_ids, local.app_hosting_build_secret_accessor_members) :
    "${pair[0]}:${pair[1]}" => {
      secret_id = pair[0]
      member    = pair[1]
    }
  }

  project   = var.project_id
  secret_id = google_secret_manager_secret.app_hosting[each.value.secret_id].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = each.value.member
}

resource "google_secret_manager_secret_iam_member" "app_hosting_can_view_secret_versions" {
  for_each = {
    for pair in setproduct(local.app_hosting_secret_ids, local.app_hosting_secret_viewer_members) :
    "${pair[0]}:${pair[1]}" => {
      secret_id = pair[0]
      member    = pair[1]
    }
  }

  project   = var.project_id
  secret_id = google_secret_manager_secret.app_hosting[each.value.secret_id].secret_id
  role      = "roles/secretmanager.viewer"
  member    = each.value.member
}
