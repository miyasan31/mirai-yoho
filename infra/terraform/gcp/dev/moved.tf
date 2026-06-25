moved {
  from = google_project_service.required
  to   = module.project_services.google_project_service.required
}

moved {
  from = google_artifact_registry_repository.batch_worker
  to   = module.artifact_registry.google_artifact_registry_repository.batch_worker
}

moved {
  from = google_service_account.batch_scheduler
  to   = module.service_accounts.google_service_account.batch_scheduler
}

moved {
  from = google_service_account.batch_worker
  to   = module.service_accounts.google_service_account.batch_worker
}

moved {
  from = google_service_account.github_deployer
  to   = module.service_accounts.google_service_account.github_deployer
}

moved {
  from = google_service_account.organization_operator
  to   = module.service_accounts.google_service_account.organization_operator
}

moved {
  from = google_service_account.app_hosting_compute
  to   = module.service_accounts.google_service_account.app_hosting_compute
}

moved {
  from = google_service_account_iam_member.scheduler_can_mint_oidc_token
  to   = module.iam.google_service_account_iam_member.scheduler_can_mint_oidc_token
}

moved {
  from = google_project_iam_member.batch_worker_roles
  to   = module.iam.google_project_iam_member.batch_worker_roles
}

moved {
  from = google_project_iam_member.organization_operator_roles
  to   = module.iam.google_project_iam_member.organization_operator_roles
}

moved {
  from = google_service_account_iam_member.organization_operator_impersonators
  to   = module.iam.google_service_account_iam_member.organization_operator_impersonators
}

moved {
  from = google_project_iam_custom_role.scheduler_job_runner
  to   = module.iam.google_project_iam_custom_role.scheduler_job_runner
}

moved {
  from = google_iam_workload_identity_pool.github
  to   = module.iam.google_iam_workload_identity_pool.github
}

moved {
  from = google_iam_workload_identity_pool_provider.github
  to   = module.iam.google_iam_workload_identity_pool_provider.github
}

moved {
  from = google_service_account_iam_member.github_can_impersonate_deployer
  to   = module.iam.google_service_account_iam_member.github_can_impersonate_deployer
}

moved {
  from = google_project_iam_member.github_deployer_roles
  to   = module.iam.google_project_iam_member.github_deployer_roles
}

moved {
  from = google_service_account_iam_member.github_can_deploy_worker
  to   = module.iam.google_service_account_iam_member.github_can_deploy_worker
}

moved {
  from = google_project_iam_member.app_hosting_compute_roles
  to   = module.iam.google_project_iam_member.app_hosting_compute_roles
}

moved {
  from = google_secret_manager_secret_iam_member.batch_worker_can_read_secrets
  to   = module.batch.google_secret_manager_secret_iam_member.batch_worker_can_read_secrets
}

moved {
  from = google_cloud_run_v2_job.batch
  to   = module.batch.google_cloud_run_v2_job.batch
}

moved {
  from = google_cloud_run_v2_job_iam_member.scheduler_can_run_batch
  to   = module.batch.google_cloud_run_v2_job_iam_member.scheduler_can_run_batch
}

moved {
  from = google_cloud_scheduler_job.batch
  to   = module.batch.google_cloud_scheduler_job.batch
}

moved {
  from = google_firestore_database.default
  to   = module.firebase.google_firestore_database.default
}

moved {
  from = google_firestore_index.composite
  to   = module.firebase.google_firestore_index.composite
}

moved {
  from = google_storage_bucket.firebase_default
  to   = module.firebase.google_storage_bucket.firebase_default
}

moved {
  from = google_identity_platform_config.default
  to   = module.firebase.google_identity_platform_config.default
}

moved {
  from = google_firebase_web_app.app_hosting
  to   = module.firebase.google_firebase_web_app.app_hosting
}

moved {
  from = google_developer_connect_connection.github
  to   = module.firebase.google_developer_connect_connection.github
}

moved {
  from = google_developer_connect_git_repository_link.app
  to   = module.firebase.google_developer_connect_git_repository_link.app
}

moved {
  from = google_firebase_app_hosting_backend.app
  to   = module.firebase.google_firebase_app_hosting_backend.app
}

moved {
  from = google_firebase_app_hosting_traffic.app
  to   = module.firebase.google_firebase_app_hosting_traffic.app
}

moved {
  from = google_secret_manager_secret.app_hosting
  to   = module.firebase.google_secret_manager_secret.app_hosting
}

moved {
  from = google_secret_manager_secret_iam_member.app_hosting_can_read_secrets
  to   = module.firebase.google_secret_manager_secret_iam_member.app_hosting_can_read_secrets
}

moved {
  from = google_firebaserules_ruleset.firestore
  to   = module.firebase_rules.google_firebaserules_ruleset.firestore
}

moved {
  from = google_firebaserules_release.firestore
  to   = module.firebase_rules.google_firebaserules_release.firestore
}

moved {
  from = google_firebaserules_ruleset.storage
  to   = module.firebase_rules.google_firebaserules_ruleset.storage
}

moved {
  from = google_firebaserules_release.storage
  to   = module.firebase_rules.google_firebaserules_release.storage
}
