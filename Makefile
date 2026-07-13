.PHONY: create-organization create-default-organization-roles seed-slots delete-slots
.PHONY: auth-adc-organization-operator setup-secrets setup-secret
.PHONY: setup-api-secrets-from-env setup-api-secrets-from-env-fish setup-batch-worker-secrets
.PHONY: describe-secret access-secret check-secret-value
.PHONY: auth-adc-organization-operator\:dev auth-adc-organization-operator\:prod
.PHONY: create-organization\:dev create-organization\:prod
.PHONY: create-default-organization-roles\:dev create-default-organization-roles\:prod
.PHONY: seed-slots\:dev seed-slots\:prod
.PHONY: delete-slots\:dev delete-slots\:prod
.PHONY: setup-secrets\:dev setup-secrets\:prod
.PHONY: setup-secret\:dev setup-secret\:prod
.PHONY: setup-api-secrets-from-env\:dev setup-api-secrets-from-env\:prod
.PHONY: setup-api-secrets-from-env-fish\:dev setup-api-secrets-from-env-fish\:prod
.PHONY: setup-batch-worker-secrets\:dev setup-batch-worker-secrets\:prod
.PHONY: describe-secret\:dev describe-secret\:prod
.PHONY: access-secret\:dev access-secret\:prod
.PHONY: check-secret-value\:dev check-secret-value\:prod

ENV ?= local
ENV_FILE = .env.$(ENV)
PROJECT_DEV = mirai-yoho-dev
PROJECT_PROD = mirai-yoho-prod

# ============================================================
# Scripts（引数が必要なコマンド）
# ============================================================

# Usage: make auth-adc-organization-operator PROJECT=<mirai-yoho-dev|mirai-yoho-prod>
# Usage: make auth-adc-organization-operator:dev
# Usage: make auth-adc-organization-operator:prod
# Example: make auth-adc-organization-operator PROJECT=mirai-yoho-dev
auth-adc-organization-operator:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make auth-adc-organization-operator PROJECT=<project>" && exit 1)
	gcloud auth application-default login --impersonate-service-account=organization-operator@$(PROJECT).iam.gserviceaccount.com

# Usage: make create-organization ORGANIZATION_ID=<organizationId> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email> [ENV=<local|dev|prod>]
# Usage: make create-organization:dev ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>
# Usage: make create-organization:prod ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>
# Example: make create-organization ORGANIZATION_ID=org-1 ORGANIZATION_NAME="Org 1" ADMIN_EMAIL=admin@example.com ENV=prod
create-organization:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(ORGANIZATION_ID)" || (echo "Error: ORGANIZATION_ID is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>" && exit 1)
	@test -n "$(ORGANIZATION_NAME)" || (echo "Error: ORGANIZATION_NAME is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>" && exit 1)
	@test -n "$(ADMIN_EMAIL)" || (echo "Error: ADMIN_EMAIL is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>" && exit 1)
	pnpm dlx tsx --env-file=$(ENV_FILE) apps/api/scripts/create-organization.ts $(ORGANIZATION_ID) "$(ORGANIZATION_NAME)" $(ADMIN_EMAIL)

# Usage: make create-default-organization-roles ORGANIZATION_ID=<organizationId> [ENV=<local|dev|prod>]
# Usage: make create-default-organization-roles:dev ORGANIZATION_ID=<id>
# Usage: make create-default-organization-roles:prod ORGANIZATION_ID=<id>
# Example: make create-default-organization-roles ORGANIZATION_ID=org-1 ENV=prod
create-default-organization-roles:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(ORGANIZATION_ID)" || (echo "Error: ORGANIZATION_ID is required. Usage: make create-default-organization-roles ORGANIZATION_ID=<id>" && exit 1)
	pnpm dlx tsx --env-file=$(ENV_FILE) apps/api/scripts/create-default-organization-roles.ts $(ORGANIZATION_ID)

# Usage: make seed-slots ORGANIZATION_ID=<organizationId> CONSULTANT_ID=<consultantId> [ENV=<local|dev|prod>]
# Usage: make seed-slots:dev ORGANIZATION_ID=<id> CONSULTANT_ID=<id>
# Usage: make seed-slots:prod ORGANIZATION_ID=<id> CONSULTANT_ID=<id>
# Example: make seed-slots ORGANIZATION_ID=org-1 CONSULTANT_ID=KE1A6PuKhxUaGf2OfWDU3XsSYuw2 ENV=dev
seed-slots:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(ORGANIZATION_ID)" || (echo "Error: ORGANIZATION_ID is required. Usage: make seed-slots ORGANIZATION_ID=<id> CONSULTANT_ID=<id>" && exit 1)
	@test -n "$(CONSULTANT_ID)" || (echo "Error: CONSULTANT_ID is required. Usage: make seed-slots ORGANIZATION_ID=<id> CONSULTANT_ID=<id>" && exit 1)
	pnpm dlx tsx --env-file=$(ENV_FILE) apps/api/scripts/seed-slots.ts $(ORGANIZATION_ID) $(CONSULTANT_ID)

# Usage: make delete-slots [ENV=<local|dev|prod>]
# Usage: make delete-slots:dev
# Usage: make delete-slots:prod
delete-slots:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	pnpm dlx tsx --env-file=$(ENV_FILE) apps/api/scripts/delete-slots.ts

# ============================================================
# Secret Manager セットアップ（Cloud Run API / batch worker）
# ============================================================

# Cloud Run API サーバーがランタイムで参照するシークレット集合。
# terraform の api_secret_ids（infra/terraform/gcp/common/api）と一致させる。
API_SECRET_KEYS = \
	API_URL \
	USER_APP_URL \
	ADMIN_APP_URL \
	CORS_ALLOWED_ORIGINS \
	STRIPE_SECRET_KEY \
	STRIPE_WEBHOOK_SECRET \
	ZOOM_ACCOUNT_ID \
	ZOOM_CLIENT_ID \
	ZOOM_CLIENT_SECRET \
	ZOOM_HOST_USER_ID \
	ZOOM_USER_OAUTH_CLIENT_ID \
	ZOOM_USER_OAUTH_CLIENT_SECRET \
	ZOOM_OAUTH_STATE_SECRET \
	ZOOM_CREDENTIAL_ENCRYPTION_KEY \
	RESEND_API_KEY \
	FIREBASE_CLIENT_EMAIL \
	FIREBASE_PRIVATE_KEY \
	CANCEL_TOKEN_SECRET \
	COUPON_WEBHOOK_SECRET \
	RESEND_FROM_EMAIL \
	FIREBASE_PROJECT_ID \
	FIREBASE_STORAGE_BUCKET \
	LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL \
	INVOICE_REGISTRATION_NUMBER

BATCH_WORKER_SECRET_KEYS = \
	FIREBASE_CLIENT_EMAIL \
	FIREBASE_PRIVATE_KEY \
	FIREBASE_PROJECT_ID \
	RESEND_API_KEY \
	RESEND_FROM_EMAIL \
	STRIPE_SECRET_KEY \
	LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL \
	ADMIN_APP_URL

# Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>
# Usage: make setup-secrets:dev
# Usage: make setup-secrets:prod
# Example: make setup-secrets PROJECT=mirai-yoho-dev
setup-secrets:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>" && exit 1)
	@for secret in $(API_SECRET_KEYS); do \
		echo "Enter value for $$secret (end with Ctrl-D):"; \
		gcloud secrets versions add $$secret --project $(PROJECT) --data-file=-; \
	done

# Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<OPENAI_API_KEY>
# Usage: make setup-secret:dev KEY=<SECRET_KEY>
# Usage: make setup-secret:prod KEY=<SECRET_KEY>
# Example: make setup-secret PROJECT=mirai-yoho-dev KEY=OPENAI_API_KEY
setup-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>" && exit 1)
	@echo "Enter value for $(KEY) (end with Ctrl-D):"
	gcloud secrets versions add $(KEY) --project $(PROJECT) --data-file=-

# Usage: make setup-api-secrets-from-env PROJECT=<mirai-yoho-dev|mirai-yoho-prod> [ENV=<local|dev|prod>]
# Usage: make setup-api-secrets-from-env:dev
# Usage: make setup-api-secrets-from-env:prod
# Required environment variables: API_SECRET_KEYS と同名の env を $(ENV_FILE) にすべて設定
setup-api-secrets-from-env:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-api-secrets-from-env PROJECT=<mirai-yoho-dev|mirai-yoho-prod>" && exit 1)
	@set -a; . "$(ENV_FILE)"; set +a; \
	for secret in $(API_SECRET_KEYS); do \
		value="$$(printenv $$secret)"; \
		if [ -z "$$value" ]; then \
			echo "Error: environment variable $$secret is required"; \
			exit 1; \
		fi; \
		printf '%s' "$$value" | gcloud secrets versions add $$secret --project "$(PROJECT)" --data-file=- >/dev/null; \
		echo "Added new version for $$secret"; \
	done

# Usage: make setup-api-secrets-from-env-fish PROJECT=<mirai-yoho-dev|mirai-yoho-prod> [ENV=<local|dev|prod>]
# Usage: make setup-api-secrets-from-env-fish:dev
# Usage: make setup-api-secrets-from-env-fish:prod
setup-api-secrets-from-env-fish:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-api-secrets-from-env-fish PROJECT=<mirai-yoho-dev|mirai-yoho-prod>" && exit 1)
	PROJECT="$(PROJECT)" ENV_FILE="$(ENV_FILE)" fish apps/api/scripts/setup-api-secrets-from-env.fish

# Usage: make setup-batch-worker-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod> [ENV=<local|dev|prod>]
# Usage: make setup-batch-worker-secrets:dev
# Usage: make setup-batch-worker-secrets:prod
# Required environment variables ($(ENV_FILE)):
# FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY FIREBASE_PROJECT_ID RESEND_API_KEY
# RESEND_FROM_EMAIL STRIPE_SECRET_KEY LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL NEXT_PUBLIC_APP_URL
setup-batch-worker-secrets:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-batch-worker-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>" && exit 1)
	@set -a; . "$(ENV_FILE)"; set +a; \
	for secret in $(BATCH_WORKER_SECRET_KEYS); do \
		value="$$(printenv $$secret)"; \
		if [ -z "$$value" ]; then \
			echo "Error: environment variable $$secret is required"; \
			exit 1; \
		fi; \
		printf '%s' "$$value" | gcloud secrets versions add $$secret --project "$(PROJECT)" --data-file=- >/dev/null; \
		echo "Added new version for $$secret"; \
	done

# Usage: make describe-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>
# Usage: make describe-secret:dev KEY=<SECRET_KEY>
# Usage: make describe-secret:prod KEY=<SECRET_KEY>
describe-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make describe-secret PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make describe-secret PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	gcloud secrets describe $(KEY) --project $(PROJECT)

# Usage: make access-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY[@version]>
# Usage: make access-secret:dev KEY=<SECRET_KEY[@version]>
# Usage: make access-secret:prod KEY=<SECRET_KEY[@version]>
# KEY は SECRET_KEY（latest）または SECRET_KEY@<version> を指定する
access-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make access-secret PROJECT=<project> KEY=<SECRET_KEY[@version]>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make access-secret PROJECT=<project> KEY=<SECRET_KEY[@version]>" && exit 1)
	@name="$(KEY)"; version="latest"; \
	case "$$name" in *@*) version="$${name#*@}"; name="$${name%@*}";; esac; \
	gcloud secrets versions access "$$version" --secret "$$name" --project $(PROJECT)

# Usage: make check-secret-value PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>
# Usage: make check-secret-value:dev KEY=<SECRET_KEY>
# Usage: make check-secret-value:prod KEY=<SECRET_KEY>
# 値は表示せず、空かどうかのみ確認する
check-secret-value:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make check-secret-value PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make check-secret-value PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	@value="$$(gcloud secrets versions access latest --secret $(KEY) --project $(PROJECT))"; \
	if [ -z "$$value" ]; then \
		echo "NG: $(KEY) latest is empty"; \
		exit 1; \
	else \
		echo "OK: $(KEY) latest length=$${#value}"; \
	fi

# ============================================================
# Environment aliases (dev / prod)
# ============================================================

auth-adc-organization-operator\:dev:
	$(MAKE) auth-adc-organization-operator PROJECT=$(PROJECT_DEV)

auth-adc-organization-operator\:prod:
	$(MAKE) auth-adc-organization-operator PROJECT=$(PROJECT_PROD)

create-organization\:dev:
	$(MAKE) create-organization ENV=dev ORGANIZATION_ID=$(ORGANIZATION_ID) ORGANIZATION_NAME="$(ORGANIZATION_NAME)" ADMIN_EMAIL=$(ADMIN_EMAIL)

create-organization\:prod:
	$(MAKE) create-organization ENV=prod ORGANIZATION_ID=$(ORGANIZATION_ID) ORGANIZATION_NAME="$(ORGANIZATION_NAME)" ADMIN_EMAIL=$(ADMIN_EMAIL)

create-default-organization-roles\:dev:
	$(MAKE) create-default-organization-roles ENV=dev ORGANIZATION_ID=$(ORGANIZATION_ID)

create-default-organization-roles\:prod:
	$(MAKE) create-default-organization-roles ENV=prod ORGANIZATION_ID=$(ORGANIZATION_ID)

seed-slots\:dev:
	$(MAKE) seed-slots ENV=dev ORGANIZATION_ID=$(ORGANIZATION_ID) CONSULTANT_ID=$(CONSULTANT_ID)

seed-slots\:prod:
	$(MAKE) seed-slots ENV=prod ORGANIZATION_ID=$(ORGANIZATION_ID) CONSULTANT_ID=$(CONSULTANT_ID)

delete-slots\:dev:
	$(MAKE) delete-slots ENV=dev

delete-slots\:prod:
	$(MAKE) delete-slots ENV=prod

setup-secrets\:dev:
	$(MAKE) setup-secrets PROJECT=$(PROJECT_DEV)

setup-secrets\:prod:
	$(MAKE) setup-secrets PROJECT=$(PROJECT_PROD)

setup-secret\:dev:
	$(MAKE) setup-secret PROJECT=$(PROJECT_DEV) KEY=$(KEY)

setup-secret\:prod:
	$(MAKE) setup-secret PROJECT=$(PROJECT_PROD) KEY=$(KEY)

setup-api-secrets-from-env\:dev:
	$(MAKE) setup-api-secrets-from-env ENV=dev PROJECT=$(PROJECT_DEV)

setup-api-secrets-from-env\:prod:
	$(MAKE) setup-api-secrets-from-env ENV=prod PROJECT=$(PROJECT_PROD)

setup-api-secrets-from-env-fish\:dev:
	$(MAKE) setup-api-secrets-from-env-fish ENV=dev PROJECT=$(PROJECT_DEV)

setup-api-secrets-from-env-fish\:prod:
	$(MAKE) setup-api-secrets-from-env-fish ENV=prod PROJECT=$(PROJECT_PROD)

setup-batch-worker-secrets\:dev:
	$(MAKE) setup-batch-worker-secrets ENV=dev PROJECT=$(PROJECT_DEV)

setup-batch-worker-secrets\:prod:
	$(MAKE) setup-batch-worker-secrets ENV=prod PROJECT=$(PROJECT_PROD)

describe-secret\:dev:
	$(MAKE) describe-secret PROJECT=$(PROJECT_DEV) KEY=$(KEY)

describe-secret\:prod:
	$(MAKE) describe-secret PROJECT=$(PROJECT_PROD) KEY=$(KEY)

access-secret\:dev:
	$(MAKE) access-secret PROJECT=$(PROJECT_DEV) KEY=$(KEY)

access-secret\:prod:
	$(MAKE) access-secret PROJECT=$(PROJECT_PROD) KEY=$(KEY)

check-secret-value\:dev:
	$(MAKE) check-secret-value PROJECT=$(PROJECT_DEV) KEY=$(KEY)

check-secret-value\:prod:
	$(MAKE) check-secret-value PROJECT=$(PROJECT_PROD) KEY=$(KEY)
