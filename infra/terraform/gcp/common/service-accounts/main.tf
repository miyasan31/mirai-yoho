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

resource "google_service_account" "api_server" {
  project      = var.project_id
  account_id   = "api-server"
  display_name = "Cloud Run API server runtime"
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
