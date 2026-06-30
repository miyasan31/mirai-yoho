output "firebase_storage_bucket_name" {
  description = "Firebase default Cloud Storage bucket name."
  value       = var.manage_firebase_storage_bucket ? google_storage_bucket.firebase_default[0].name : var.firebase_storage_bucket_name
}

output "app_hosting_custom_domain_dns_records_to_add" {
  description = "DNS records to add in the external DNS provider for Firebase App Hosting custom domain setup."
  value       = local.app_hosting_custom_domain_dns_records_to_add
}

output "app_hosting_custom_domain_dns_records_to_remove" {
  description = "DNS records to remove from the external DNS provider for Firebase App Hosting custom domain setup."
  value       = local.app_hosting_custom_domain_dns_records_to_remove
}

output "app_hosting_custom_domain_status" {
  description = "Firebase App Hosting custom domain status, including DNS issues and certificate state."
  value       = try(google_firebase_app_hosting_domain.custom[0].custom_domain_status, null)
}
