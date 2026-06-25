resource "google_artifact_registry_repository" "batch_worker" {
  project       = var.project_id
  location      = var.region
  repository_id = "batch-worker"
  description   = "Container images for Cloud Run batch workers"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old-worker-images"
    action = "DELETE"

    condition {
      tag_state = "ANY"
    }
  }

  cleanup_policies {
    id     = "keep-latest-ten-worker-images"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }
}
