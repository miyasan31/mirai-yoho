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

resource "google_service_account" "organization_operator" {
  project      = var.project_id
  account_id   = "organization-operator"
  display_name = "Organization setup operator"
}

resource "google_service_account" "app_hosting_compute" {
  project      = var.project_id
  account_id   = "firebase-app-hosting-compute"
  display_name = "Firebase App Hosting compute service account"
}
