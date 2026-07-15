output "firebase_storage_bucket_name" {
  description = "Firebase default Cloud Storage bucket name."
  value       = var.manage_firebase_storage_bucket ? google_storage_bucket.firebase_default[0].name : var.firebase_storage_bucket_name
}

output "runtime_secret_ids" {
  description = "Secret Manager シークレット ID の一覧。Cloud Run API / batch worker が env として参照するもの（externally-managed も含む全 union）。consumer は IAM binding と env mount にこれを使う。"
  value       = local.runtime_secret_ids
}

output "spa_hosting_custom_domain_dns_records_to_add" {
  description = "DNS records to add in the external DNS provider for the SPA Firebase Hosting custom domains (each entry includes its site key)."
  value       = local.spa_hosting_custom_domain_dns_records_to_add
}

output "spa_hosting_custom_domain_dns_records_to_remove" {
  description = "DNS records to remove from the external DNS provider for the SPA Firebase Hosting custom domains (each entry includes its site key)."
  value       = local.spa_hosting_custom_domain_dns_records_to_remove
}

output "spa_hosting_custom_domain_status" {
  description = "SPA Firebase Hosting custom domain host/ownership/certificate state, keyed by site."
  value = {
    for site, domain in google_firebase_hosting_custom_domain.spa : site => {
      host_state      = domain.host_state
      ownership_state = domain.ownership_state
      cert            = domain.cert
    }
  }
}
