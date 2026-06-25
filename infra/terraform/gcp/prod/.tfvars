project_id       = "mirai-yoho-prod"
region           = "asia-northeast1"
app_base_url     = "https://console.miraiyohou.com/"
organization_ids = ["mirai-yoho-prod"]

# Members allowed to impersonate organization-operator@PROJECT_ID.iam.gserviceaccount.com
# for local organization setup commands. Example: ["user:admin@example.com"]
organization_operator_impersonators = ["user:miysan.dev@gmail.com"]

firestore_location           = "asia-northeast1"
firebase_storage_bucket_name = "mirai-yoho-prod.firebasestorage.app"
firebase_storage_location    = "US-EAST1"
firebase_storage_cors_origins = [
  "https://console.miraiyohou.com",
]

# Replace the placeholders after obtaining access to the existing prod project,
# then import the resources following doc/terraform-firebase-migration.md.
firebase_web_app_id           = "1:PROJECT_NUMBER:web:WEB_APP_ID"
firebase_web_app_display_name = "未来予報"
app_hosting_backend_id        = "mirai-yoho"
app_hosting_location          = "asia-east1"

developer_connect_connection_id              = "APP_HOSTING_CONNECTION_ID"
developer_connect_repository_link_id         = "miyasan31-mirai-yoho"
developer_connect_oauth_token_secret_version = "projects/mirai-yoho-prod/secrets/DEVELOPER_CONNECT_OAUTH_TOKEN/versions/latest"
github_app_installation_id                   = "GITHUB_APP_INSTALLATION_ID"

authorized_domains = [
  "console.miraiyohou.com",
  "mirai-yoho--mirai-yoho-prod.asia-east1.hosted.app",
  "mirai-yoho-prod.firebaseapp.com",
  "mirai-yoho-prod.web.app",
]
