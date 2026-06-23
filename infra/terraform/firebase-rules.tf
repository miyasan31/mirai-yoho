resource "google_firebaserules_ruleset" "firestore" {
  project = var.project_id

  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../../firestore.rules")
    }
  }

  depends_on = [google_project_iam_member.github_deployer_roles]
}

resource "google_firebaserules_release" "firestore" {
  project      = var.project_id
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
}

resource "google_firebaserules_ruleset" "storage" {
  project = var.project_id

  source {
    files {
      name    = "storage.rules"
      content = file("${path.module}/../../storage.rules")
    }
  }

  depends_on = [google_project_iam_member.github_deployer_roles]
}

resource "google_firebaserules_release" "storage" {
  project      = var.project_id
  name         = "firebase.storage/${google_storage_bucket.firebase_default.name}"
  ruleset_name = google_firebaserules_ruleset.storage.name
}
