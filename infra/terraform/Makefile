.PHONY: help setup-config create-state-bucket auth-adc init plan apply destroy clean reset validate fmt check-config

ENV ?= dev
REGION ?= asia-northeast1

ifeq ($(ENV),dev)
  PROJECT_ID := mirai-yoho-dev
  STATE_BUCKET := mirai-yoho-dev-terraform-state
else ifeq ($(ENV),prod)
  PROJECT_ID := mirai-yoho-prod
  STATE_BUCKET := mirai-yoho-prod-terraform-state
else
  $(error ENV must be dev or prod)
endif

TFVARS := $(ENV)/.tfvars
BACKEND := $(ENV)/.backend.hcl
TFVARS_EXAMPLE := $(ENV)/.tfvars.example
BACKEND_EXAMPLE := $(ENV)/.backend.hcl.example
TF_DATA_DIR := .terraform/$(ENV)

export TF_DATA_DIR

.DEFAULT_GOAL := help

help:
	@echo "Firebase and Cloud Scheduler Terraform (ENV=dev|prod, default: dev)"
	@echo ""
	@echo "初回セットアップ:"
	@echo "  make setup-config              example から tfvars / backend.hcl をコピー"
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
	@echo ""
	@echo "例:"
	@echo "  make setup-config ENV=dev"
	@echo "  make create-state-bucket ENV=dev"
	@echo "  make init ENV=dev && make plan ENV=dev"

check-config:
	@test -f "$(TFVARS)" || (echo "Error: $(TFVARS) が見つかりません。make setup-config ENV=$(ENV) を実行してください。" && exit 1)
	@test -f "$(BACKEND)" || (echo "Error: $(BACKEND) が見つかりません。make setup-config ENV=$(ENV) を実行してください。" && exit 1)

# Usage: make setup-config ENV=dev
setup-config:
	@test -f "$(TFVARS_EXAMPLE)" || (echo "Error: $(TFVARS_EXAMPLE) が見つかりません。" && exit 1)
	@test -f "$(BACKEND_EXAMPLE)" || (echo "Error: $(BACKEND_EXAMPLE) が見つかりません。" && exit 1)
	@if [ ! -f "$(TFVARS)" ]; then \
		cp "$(TFVARS_EXAMPLE)" "$(TFVARS)"; \
		echo "Created $(TFVARS)"; \
	else \
		echo "Skip: $(TFVARS) は既に存在します"; \
	fi
	@if [ ! -f "$(BACKEND)" ]; then \
		cp "$(BACKEND_EXAMPLE)" "$(BACKEND)"; \
		echo "Created $(BACKEND)"; \
	else \
		echo "Skip: $(BACKEND) は既に存在します"; \
	fi
	@echo "必要に応じて $(TFVARS) と $(BACKEND) の bucket / organization_ids を編集してください。"

# Usage: make create-state-bucket ENV=dev
create-state-bucket:
	gcloud storage buckets create "gs://$(STATE_BUCKET)" \
		--project="$(PROJECT_ID)" \
		--location="$(REGION)" \
		--uniform-bucket-level-access
	gcloud storage buckets update "gs://$(STATE_BUCKET)" --versioning
	@echo "Created gs://$(STATE_BUCKET)"
	@echo "$(BACKEND) の bucket が \"$(STATE_BUCKET)\" になっているか確認してください。"

# Usage: make auth-adc ENV=dev
auth-adc:
	gcloud auth application-default login
	gcloud auth application-default set-quota-project "$(PROJECT_ID)"

# Usage: make init ENV=dev
init: check-config
	terraform init -backend-config="$(BACKEND)"

# Usage: make plan ENV=dev
plan: check-config
	terraform plan -var-file="$(TFVARS)"

# Usage: make apply ENV=dev
apply: check-config
	terraform apply -var-file="$(TFVARS)"

# Usage: make destroy ENV=dev
destroy: check-config
	terraform destroy -var-file="$(TFVARS)"

validate: check-config
	terraform validate

fmt:
	terraform fmt -recursive .

clean:
	rm -rf .terraform terraform.tfstate terraform.tfstate.backup

# Usage: make reset ENV=dev
reset: clean init
