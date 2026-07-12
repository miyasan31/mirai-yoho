# Firebase App Hosting 撤去（Cloud Run 移行後）。
# これらのリソースは state 上で deletion_policy = "PREVENT" / prevent_destroy が付いており、
# 単純な削除では terraform plan / apply が destroy に失敗する。そこで `removed` ブロック
# （lifecycle.destroy = false）で「Terraform 管理から外す（state から忘れる）だけ」にし、
# GCP 上の実リソースは doc/app-hosting-teardown.md の手順で手動削除する。
# state に存在しない環境では no-op。撤去完了後はこのファイルごと削除してよい。

removed {
  from = google_firebase_app_hosting_traffic.app
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_firebase_app_hosting_domain.custom
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_firebase_app_hosting_backend.app
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_developer_connect_git_repository_link.app
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_developer_connect_connection.github
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_firebase_web_app.app_hosting
  lifecycle {
    destroy = false
  }
}
