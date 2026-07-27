resource "google_firebaserules_ruleset" "firestore" {
  project = var.project_id

  source {
    files {
      name    = "firestore.rules"
      content = file(var.firestore_rules_path)
    }
  }
}

resource "google_firebaserules_release" "firestore" {
  project      = var.project_id
  name         = "cloud.firestore"
  # ruleset_name は ForceNew。format を変えると release 作り直しになるので、既存 state に合わせて
  # bare UUID (`google_firebaserules_ruleset.firestore.name`) のまま維持する。
  # storage 側はフルパス形式で state に入っているため、両者で書き方が揃わないが意図的。
  ruleset_name = google_firebaserules_ruleset.firestore.name
}

resource "google_firebaserules_ruleset" "storage" {
  project = var.project_id

  source {
    files {
      name    = "storage.rules"
      content = file(var.storage_rules_path)
    }
  }
}

resource "google_firebaserules_release" "storage" {
  project      = var.project_id
  name         = "firebase.storage/${var.storage_bucket_name}"
  ruleset_name = "projects/${var.project_id}/rulesets/${google_firebaserules_ruleset.storage.name}"
}
