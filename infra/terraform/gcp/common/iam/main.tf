data "google_project" "current" {
  project_id = var.project_id
}

locals {
  cloud_build_default_service_account_email = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_service_account_iam_member" "scheduler_can_mint_oidc_token" {
  service_account_id = var.batch_scheduler_service_account_name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "batch_worker_roles" {
  for_each = toset([
    "roles/datastore.user",
    "roles/firebaseauth.admin",
    "roles/logging.logWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${var.batch_worker_service_account_email}"
}

resource "google_project_iam_member" "api_server_roles" {
  for_each = toset([
    "roles/datastore.user",
    "roles/firebaseauth.admin",
    "roles/logging.logWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${var.api_server_service_account_email}"
}

resource "google_project_iam_member" "organization_operator_roles" {
  for_each = toset([
    "roles/datastore.user",
    "roles/firebaseauth.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${var.organization_operator_service_account_email}"
}

resource "google_service_account_iam_member" "organization_operator_impersonators" {
  for_each = var.organization_operator_impersonators

  service_account_id = var.organization_operator_service_account_name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = each.value
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
  # main: apply（push: main）、release/*: アプリデプロイ、refs/pull/*: PR の terraform plan
  # NOTE: GCP 側の改行正規化による perpetual diff を避けるため単一行で記述する
  attribute_condition = "assertion.repository == 'miyasan31/mirai-yoho' && (assertion.ref == 'refs/heads/main' || assertion.ref == 'refs/heads/release/dev' || assertion.ref == 'refs/heads/release/prod' || assertion.ref.startsWith('refs/pull/'))"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_can_impersonate_deployer" {
  service_account_id = var.github_deployer_service_account_name
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
    "roles/viewer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${var.github_deployer_service_account_email}"
}

resource "google_service_account_iam_member" "github_can_deploy_worker" {
  service_account_id = var.batch_worker_service_account_name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.github_deployer_service_account_email}"
}

resource "google_service_account_iam_member" "github_can_deploy_api" {
  service_account_id = var.api_server_service_account_name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.github_deployer_service_account_email}"
}

resource "google_service_account_iam_member" "github_can_run_cloud_build" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${local.cloud_build_default_service_account_email}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.github_deployer_service_account_email}"
}

resource "google_service_account_iam_member" "github_can_act_as_app_hosting_compute" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.app_hosting_compute_service_account_email}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.github_deployer_service_account_email}"
}

resource "google_project_iam_member" "app_hosting_compute_roles" {
  for_each = toset([
    "roles/developerconnect.readTokenAccessor",
    "roles/firebase.sdkAdminServiceAgent",
    "roles/firebaseapphosting.computeRunner",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${var.app_hosting_compute_service_account_email}"
}
