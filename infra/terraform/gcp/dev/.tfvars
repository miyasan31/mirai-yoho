project_id       = "mirai-yoho-dev"
region           = "asia-northeast1"
organization_ids = ["mirai-yoho-dev"]

# Members allowed to impersonate organization-operator@PROJECT_ID.iam.gserviceaccount.com
# for local organization setup commands. Example: ["user:admin@example.com"]
organization_operator_impersonators = ["user:miyasan.dev@gmail.com"]

firestore_location             = "asia-northeast1"
firebase_storage_bucket_name   = "mirai-yoho-dev.firebasestorage.app"
manage_firebase_storage_bucket = true
firebase_storage_location      = "US-CENTRAL1"
firebase_storage_cors_origins = [
  "http://localhost:3000",
  "https://dev.user.miraiyohou.com",
  "https://dev.console.miraiyohou.com",
  "https://dev.consultant.miraiyohou.com",
]

# Cloud Run API のカスタムドメイン。null（既定）だと run.app URL のみで稼働する
# （api_service_uri output を参照）。切替手順は doc/api-cloud-run-migration.md を参照。
api_custom_domain = "dev.api.miraiyohou.com"

# SPA サイトのカスタムドメイン。
spa_hosting_custom_domains = {
  user       = "dev.user.miraiyohou.com"
  console    = "dev.console.miraiyohou.com"
  consultant = "dev.consultant.miraiyohou.com"
}

authorized_domains = [
  "localhost",
  "dev.user.miraiyohou.com",
  "dev.console.miraiyohou.com",
  "dev.consultant.miraiyohou.com",
]
