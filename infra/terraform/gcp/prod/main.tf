locals {
  repo_root = abspath("${path.root}/../../../..")
}

module "project_services" {
  source = "../common/project-services"

  project_id = var.project_id
}

module "artifact_registry" {
  source = "../common/artifact-registry"

  project_id = var.project_id
  region     = var.region

  depends_on = [module.project_services]
}

module "service_accounts" {
  source = "../common/service-accounts"

  project_id = var.project_id
}

module "iam" {
  source = "../common/iam"

  project_id                                  = var.project_id
  organization_operator_impersonators         = var.organization_operator_impersonators
  batch_scheduler_service_account_name        = module.service_accounts.batch_scheduler_service_account_name
  batch_scheduler_service_account_email       = module.service_accounts.batch_scheduler_service_account_email
  batch_worker_service_account_name           = module.service_accounts.batch_worker_service_account_name
  batch_worker_service_account_email          = module.service_accounts.batch_worker_service_account_email
  api_server_service_account_name             = module.service_accounts.api_server_service_account_name
  api_server_service_account_email            = module.service_accounts.api_server_service_account_email
  github_deployer_service_account_name        = module.service_accounts.github_deployer_service_account_name
  github_deployer_service_account_email       = module.service_accounts.github_deployer_service_account_email
  organization_operator_service_account_name  = module.service_accounts.organization_operator_service_account_name
  organization_operator_service_account_email = module.service_accounts.organization_operator_service_account_email

  depends_on = [
    module.project_services,
    module.service_accounts,
  ]
}

module "batch" {
  source = "../common/batch"

  project_id                            = var.project_id
  region                                = var.region
  worker_image                          = var.worker_image
  organization_ids                      = var.organization_ids
  batch_scheduler_service_account_email = module.service_accounts.batch_scheduler_service_account_email
  batch_worker_service_account_email    = module.service_accounts.batch_worker_service_account_email
  scheduler_job_runner_role_name        = module.iam.scheduler_job_runner_role_name

  depends_on = [
    module.project_services,
    module.artifact_registry,
    module.firebase,
    module.iam,
  ]
}

module "api" {
  source = "../common/api"

  project_id                       = var.project_id
  region                           = var.region
  api_image                        = var.api_image
  api_server_service_account_email = module.service_accounts.api_server_service_account_email
  api_custom_domain                = var.api_custom_domain

  depends_on = [
    module.project_services,
    module.artifact_registry,
    module.firebase,
    module.iam,
  ]
}

module "firebase" {
  source = "../common/firebase"

  providers = {
    google      = google
    google-beta = google-beta
  }

  project_id                     = var.project_id
  firestore_location             = var.firestore_location
  firebase_storage_bucket_name   = var.firebase_storage_bucket_name
  manage_firebase_storage_bucket = var.manage_firebase_storage_bucket
  firebase_storage_location      = var.firebase_storage_location
  firebase_storage_cors_origins  = var.firebase_storage_cors_origins
  authorized_domains             = var.authorized_domains
  spa_hosting_custom_domains     = var.spa_hosting_custom_domains

  depends_on = [
    module.project_services,
    module.iam,
  ]
}

module "firebase_rules" {
  source = "../common/firebase-rules"

  project_id           = var.project_id
  storage_bucket_name  = module.firebase.firebase_storage_bucket_name
  firestore_rules_path = "${local.repo_root}/firestore.rules"
  storage_rules_path   = "${local.repo_root}/storage.rules"

  depends_on = [
    module.firebase,
    module.iam,
  ]
}
