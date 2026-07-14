project_id       = "mirai-yoho-prod"
region           = "asia-northeast1"
organization_ids = ["mirai-yoho-prod"]

# Members allowed to impersonate organization-operator@PROJECT_ID.iam.gserviceaccount.com
# for local organization setup commands. Example: ["user:admin@example.com"]
organization_operator_impersonators = ["user:miyasan.dev@gmail.com"]

firestore_location           = "asia-northeast1"
firebase_storage_bucket_name = "mirai-yoho-prod.firebasestorage.app"
firebase_storage_location    = "US-EAST1"
firebase_storage_cors_origins = [
  "https://user.miraiyohou.com",
  "https://console.miraiyohou.com",
  "https://consultant.miraiyohou.com",
]

# Cloud Run API のカスタムドメイン。null（既定）だと run.app URL のみで稼働する
# （api_service_uri output を参照）。切替手順は doc/api-cloud-run-migration.md を参照。
api_custom_domain = "api.miraiyohou.com"

# SPA サイトのカスタムドメイン。
spa_hosting_custom_domains = {
  user       = "user.miraiyohou.com"
  console    = "console.miraiyohou.com"
  consultant = "consultant.miraiyohou.com"
}

authorized_domains = [
  "user.miraiyohou.com",
  "console.miraiyohou.com",
  "consultant.miraiyohou.com",
]
