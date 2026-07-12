.PHONY: help check-env create-state-bucket auth-adc init plan apply destroy validate fmt clean reset print-api-image

ENV ?= dev
REGION ?= asia-northeast1
SHA ?= $(shell git rev-parse HEAD 2>/dev/null)
TF_PLAN_FLAGS ?=
TF_APPLY_FLAGS ?=

ifeq ($(ENV),dev)
  PROJECT_ID := mirai-yoho-dev
  STATE_BUCKET := mirai-yoho-dev-terraform-state
else ifeq ($(ENV),prod)
  PROJECT_ID := mirai-yoho-prod
  STATE_BUCKET := mirai-yoho-prod-terraform-state
else
  $(error ENV must be dev or prod)
endif

TF_DIR := $(ENV)
TFVARS := .tfvars
BACKEND := .backend.hcl

.DEFAULT_GOAL := help

help:
	@echo "GCP Terraform (ENV=dev|prod, default: dev)"
	@echo ""
	@echo "初回セットアップ:"
	@echo "  make create-state-bucket       GCS state バケットを作成（Terraform 外の1回限り）"
	@echo "  make auth-adc                    ADC ログイン + quota project 設定"
	@echo "  make init                        terraform init"
	@echo ""
	@echo "日常運用:"
	@echo "  make plan                        変更内容を確認（TF_VAR_worker_image の指定が必要）"
	@echo "  make apply                       インフラを適用"
	@echo "  make destroy                     インフラを削除"
	@echo ""
	@echo "その他:"
	@echo "  make validate                    設定ファイルの検証"
	@echo "  make fmt                         terraform fmt"
	@echo "  make clean                       ローカルの .terraform / state を削除"
	@echo "  make reset                       clean + init（やり直し）"
	@echo "  make print-api-image             TF_VAR_api_image=<image URI> を出力（Git SHA タグ）"
	@echo ""
	@echo "例:"
	@echo "  make create-state-bucket ENV=dev"
	@echo "  make init ENV=dev && make plan ENV=dev"
	@echo "  export \$$(make print-api-image ENV=dev) && make plan ENV=dev"

check-env:
	@test -d "$(TF_DIR)" || (echo "Error: $(TF_DIR) が見つかりません。ENV は dev または prod を指定してください。" && exit 1)
	@test -f "$(TF_DIR)/$(TFVARS)" || (echo "Error: $(TF_DIR)/$(TFVARS) が見つかりません。" && exit 1)
	@test -f "$(TF_DIR)/$(BACKEND)" || (echo "Error: $(TF_DIR)/$(BACKEND) が見つかりません。" && exit 1)

# Usage: make create-state-bucket ENV=dev
create-state-bucket:
	gcloud storage buckets create "gs://$(STATE_BUCKET)" \
		--project="$(PROJECT_ID)" \
		--location="$(REGION)" \
		--uniform-bucket-level-access
	gcloud storage buckets update "gs://$(STATE_BUCKET)" --versioning
	@echo "Created gs://$(STATE_BUCKET)"
	@echo "$(TF_DIR)/$(BACKEND) の bucket が \"$(STATE_BUCKET)\" になっているか確認してください。"

# Usage: make auth-adc ENV=dev
auth-adc:
	gcloud auth application-default login
	gcloud auth application-default set-quota-project "$(PROJECT_ID)"

# Usage: make init ENV=dev
init: check-env
	terraform -chdir="$(TF_DIR)" init -backend-config="$(BACKEND)"

# Usage: make print-api-image ENV=dev [SHA=<git-sha>]
# TF_VAR_api_image で使う Artifact Registry の API イメージ URI を出力する。
# SHA を省略すると HEAD のコミット SHA を使う（deploy-api.yml の IMAGE_TAG=github.sha と同じ形式）。
print-api-image:
	@echo $(REGION)-docker.pkg.dev/$(PROJECT_ID)/api/api:$(SHA)

# Usage: make plan ENV=dev
plan: check-env
	terraform -chdir="$(TF_DIR)" plan $(TF_PLAN_FLAGS) -var-file="$(TFVARS)"

# Usage: make apply ENV=dev
apply: check-env
	terraform -chdir="$(TF_DIR)" apply $(TF_APPLY_FLAGS) -var-file="$(TFVARS)"

# Usage: make destroy ENV=dev
destroy: check-env
	terraform -chdir="$(TF_DIR)" destroy -var-file="$(TFVARS)"

validate: check-env
	terraform -chdir="$(TF_DIR)" validate

fmt:
	terraform fmt -recursive .

clean:
	rm -rf dev/.terraform dev/terraform.tfstate dev/terraform.tfstate.backup
	rm -rf prod/.terraform prod/terraform.tfstate prod/terraform.tfstate.backup

# Usage: make reset ENV=dev
reset: clean init
