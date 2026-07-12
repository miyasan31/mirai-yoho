output "api_service_name" {
  description = "Cloud Run API service name."
  value       = google_cloud_run_v2_service.api.name
}

output "api_service_uri" {
  description = "Default run.app URL of the Cloud Run API service."
  value       = google_cloud_run_v2_service.api.uri
}

output "api_custom_domain_dns_records" {
  description = "DNS records to add in the external DNS provider (Xserver) to activate the Cloud Run API custom domain. Empty when no custom domain is configured."
  value       = try(google_cloud_run_domain_mapping.api[0].status[0].resource_records, [])
}
