output "firebase_storage_bucket_name" {
  description = "Firebase default Cloud Storage bucket name."
  value       = google_storage_bucket.firebase_default.name
}
