# GCP Terraform

GCP / Firebase infrastructure is managed from environment-specific Terraform roots under this directory.

```text
infra/terraform/gcp/
├── common/   # Shared modules
├── dev/      # dev root module and environment config
└── prod/     # prod root module and environment config
```

## Usage

Run commands from `infra/terraform/gcp`.

```bash
make init ENV=dev
make plan ENV=dev
make apply ENV=dev
```

`plan` / `apply` derive `TF_VAR_api_image` and `TF_VAR_worker_image` from the HEAD commit SHA. Pass `SHA=<git-sha>` to target a different image, or export the variables yourself to override them.

`dev/.tfvars`, `dev/.backend.hcl`, `prod/.tfvars`, and `prod/.backend.hcl` are committed because they contain shared environment configuration for this repository. Secret values are not stored in Terraform variables.

## Bootstrap

The Terraform state bucket is created outside Terraform.

```bash
make create-state-bucket ENV=dev
make auth-adc ENV=dev
make init ENV=dev
```

For an empty project, create the Artifact Registry repository first, then build and push the worker image before applying all resources.

This step bypasses `make`, so export both required image variables yourself. They do not need to point at an existing image yet.

```bash
export TF_VAR_worker_image="asia-northeast1-docker.pkg.dev/mirai-yoho-dev/batch-worker/worker:bootstrap"
export TF_VAR_api_image="asia-northeast1-docker.pkg.dev/mirai-yoho-dev/api/api:bootstrap"
terraform -chdir=dev apply -var-file=".tfvars" \
  -target=module.artifact_registry.google_artifact_registry_repository.batch_worker
```
