# 既存の手動作成済み SPA カスタムドメインを Terraform 管理へ取り込む。
# #44 の初回 apply が create で 409（CD_ALREADY_EXISTS）になったため、import で吸収する。
# 3 ドメインとも Firebase 側で HOST_ACTIVE / OWNERSHIP_ACTIVE / 証明書有効な既存リソース。
# state へ取り込みが完了したら、このファイルは削除してよい（import ブロックは冪等な no-op）。
import {
  to = module.firebase.google_firebase_hosting_custom_domain.spa["user"]
  id = "projects/mirai-yoho-dev/sites/mirai-yoho-dev-user/customDomains/dev.user.miraiyohou.com"
}

import {
  to = module.firebase.google_firebase_hosting_custom_domain.spa["admin"]
  id = "projects/mirai-yoho-dev/sites/mirai-yoho-dev-admin/customDomains/dev.admin.console.miraiyohou.com"
}

import {
  to = module.firebase.google_firebase_hosting_custom_domain.spa["consultant"]
  id = "projects/mirai-yoho-dev/sites/mirai-yoho-dev-consultant/customDomains/dev.consultant.console.miraiyohou.com"
}
