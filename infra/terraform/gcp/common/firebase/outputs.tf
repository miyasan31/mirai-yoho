output "firebase_storage_bucket_name" {
  description = "Firebase default Cloud Storage bucket name."
  value       = var.manage_firebase_storage_bucket ? google_storage_bucket.firebase_default[0].name : var.firebase_storage_bucket_name
}
