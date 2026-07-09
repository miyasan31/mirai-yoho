project_id       = "mirai-yoho-dev"
region           = "asia-northeast1"
app_base_url     = "https://dev.console.miraiyohou.com/"
organization_ids = ["mirai-yoho-dev"]

# Members allowed to impersonate organization-operator@PROJECT_ID.iam.gserviceaccount.com
# for local organization setup commands. Example: ["user:admin@example.com"]
organization_operator_impersonators = ["user:miyasan.dev@gmail.com"]

firestore_location           = "asia-northeast1"
firebase_storage_bucket_name = "mirai-yoho-dev.firebasestorage.app"
firebase_storage_location    = "US-EAST1"
firebase_storage_cors_origins = [
  "http://localhost:3000",
  "https://admin.dev.console.miraiyohou.com",
  "https://consultant.dev.console.miraiyohou.com",
  # 旧コンソール。カットオーバー完了後に削除。
  "https://dev.console.miraiyohou.com",
]

firebase_web_app_id           = "1:173156005504:web:478232d812edccae4cd865"
firebase_web_app_display_name = "未来予報"
app_hosting_backend_id        = "mirai-yoho"
app_hosting_location          = "asia-east1"
app_hosting_custom_domain     = "dev.api.miraiyohou.com"

developer_connect_connection_id              = "apphosting-github-conn-j9sh7s"
developer_connect_repository_link_id         = "miyasan31-mirai-yoho"
developer_connect_oauth_token_secret_version = "projects/mirai-yoho-dev/secrets/apphosting-github-conn-j9sh7s-github-oauthtoken-ac3d42/versions/latest"
github_app_installation_id                   = "121530488"

authorized_domains = [
  "admin.dev.console.miraiyohou.com",
  "consultant.dev.console.miraiyohou.com",
  # 旧コンソール。カットオーバー完了後に削除。
  "dev.console.miraiyohou.com",
  "localhost",
  "mirai-yoho--mirai-yoho-dev.asia-east1.hosted.app",
  "mirai-yoho-dev.firebaseapp.com",
  "mirai-yoho-dev.web.app",
]
