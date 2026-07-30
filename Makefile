.PHONY: create-organization create-default-roles seed-local seed-slots delete-slots
.PHONY: auth-adc-organization-operator setup-secrets setup-secret
.PHONY: setup-secrets-from-env setup-secrets-from-env-fish
.PHONY: describe-secret access-secret check-secret-value
.PHONY: deploy-hosting deploy-api deploy-batch-worker deploy-all
.PHONY: deploy-hosting\:dev deploy-hosting\:prod
.PHONY: deploy-api\:dev deploy-api\:prod
.PHONY: deploy-batch-worker\:dev deploy-batch-worker\:prod
.PHONY: deploy-all\:dev deploy-all\:prod
.PHONY: auth-adc-organization-operator\:dev auth-adc-organization-operator\:prod
.PHONY: create-organization\:dev create-organization\:prod
.PHONY: create-default-roles\:dev create-default-roles\:prod
.PHONY: seed-slots\:dev seed-slots\:prod
.PHONY: delete-slots\:dev delete-slots\:prod
.PHONY: setup-secrets\:dev setup-secrets\:prod
.PHONY: setup-secret\:dev setup-secret\:prod
.PHONY: setup-secrets-from-env\:dev setup-secrets-from-env\:prod
.PHONY: setup-secrets-from-env-fish\:dev setup-secrets-from-env-fish\:prod
.PHONY: describe-secret\:dev describe-secret\:prod
.PHONY: access-secret\:dev access-secret\:prod
.PHONY: check-secret-value\:dev check-secret-value\:prod

ENV ?= local
# local は API サーバーと同じ apps/api/.env.local を使う（ルートに .env.local は置かない）
ifeq ($(ENV),local)
ENV_FILE = apps/api/.env.local
else
ENV_FILE = .env.$(ENV)
endif
PROJECT_DEV = mirai-yoho-dev
PROJECT_PROD = mirai-yoho

# ============================================================
# Scripts（引数が必要なコマンド）
# ============================================================

# Usage: make auth-adc-organization-operator PROJECT=<mirai-yoho-dev|mirai-yoho>
# Usage: make auth-adc-organization-operator:dev
# Usage: make auth-adc-organization-operator:prod
# Example: make auth-adc-organization-operator PROJECT=mirai-yoho-dev
auth-adc-organization-operator:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make auth-adc-organization-operator PROJECT=<project>" && exit 1)
	gcloud auth application-default login --impersonate-service-account=organization-operator@$(PROJECT).iam.gserviceaccount.com

# Usage: make create-organization ORGANIZATION_ID=<organizationId> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email> [ADMIN_NAME=<name>] [ENV=<local|dev|prod>]
# Usage: make create-organization:dev ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email> [ADMIN_NAME=<name>]
# Usage: make create-organization:prod ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email> [ADMIN_NAME=<name>]
# Example: make create-organization ORGANIZATION_ID=org-1 ORGANIZATION_NAME="Org 1" ADMIN_EMAIL=admin@example.com ADMIN_NAME="山田 太郎" ENV=prod
# ADMIN_NAME は任意。省略すると accounts.name が未設定になり、管理画面で後から設定する。
create-organization:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(ORGANIZATION_ID)" || (echo "Error: ORGANIZATION_ID is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email> [ADMIN_NAME=<name>]" && exit 1)
	@test -n "$(ORGANIZATION_NAME)" || (echo "Error: ORGANIZATION_NAME is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email> [ADMIN_NAME=<name>]" && exit 1)
	@test -n "$(ADMIN_EMAIL)" || (echo "Error: ADMIN_EMAIL is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email> [ADMIN_NAME=<name>]" && exit 1)
	pnpm dlx tsx --env-file=$(ENV_FILE) apps/api/scripts/create-organization.ts $(ORGANIZATION_ID) "$(ORGANIZATION_NAME)" $(ADMIN_EMAIL) "$(ADMIN_NAME)"

# Usage: make seed-local ADMIN=<email|uid> [CONSULTANT=<email|uid>] [APP_USER=<email|uid>]
#          [ORGANIZATION_ID=<id>] [ORGANIZATION_NAME=<name>] [CONSULTANT_NAME=<name>] [DAYS=<n>]
# Example: make seed-local ADMIN=you@example.com
# ローカルの Firestore エミュレーター（pnpm emulator）に、デモとして見せられる組織一式
# （組織・ロール・アカウント・占い師・料金プラン・空き枠・会員・顧客・予約・決済・
# 評価・鑑定書・クーポン・文書）を一括投入する。件数は固定で、各画面が必要とする状態を
# 1 件ずつ用意している。
# ENV=local 固定（エミュレーター以外には流せない）。
# ADMIN / CONSULTANT / APP_USER には dev プロジェクトに実在する Auth ユーザーを指定する。
# （user アプリ側の変数名を APP_USER にしているのは、USER がシェルの環境変数と衝突するため）
seed-local:
	@test -f "apps/api/.env.local" || (echo "Error: apps/api/.env.local not found" && exit 1)
	@test -n "$(ADMIN)" || (echo "Error: ADMIN is required. Usage: make seed-local ADMIN=<email|uid>" && exit 1)
	pnpm dlx tsx --tsconfig apps/api/tsconfig.json --env-file=apps/api/.env.local apps/api/scripts/seed-local.ts \
		--admin "$(ADMIN)" \
		$(if $(CONSULTANT),--consultant "$(CONSULTANT)",) \
		$(if $(APP_USER),--user "$(APP_USER)",) \
		$(if $(ORGANIZATION_ID),--organization-id "$(ORGANIZATION_ID)",) \
		$(if $(ORGANIZATION_NAME),--organization-name "$(ORGANIZATION_NAME)",) \
		$(if $(CONSULTANT_NAME),--consultant-name "$(CONSULTANT_NAME)",) \
		$(if $(DAYS),--days "$(DAYS)",)

# Usage: make create-default-roles ORGANIZATION_ID=<organizationId> [ENV=<local|dev|prod>]
# Usage: make create-default-roles:dev ORGANIZATION_ID=<id>
# Usage: make create-default-roles:prod ORGANIZATION_ID=<id>
# Example: make create-default-roles ORGANIZATION_ID=org-1 ENV=prod
create-default-roles:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(ORGANIZATION_ID)" || (echo "Error: ORGANIZATION_ID is required. Usage: make create-default-roles ORGANIZATION_ID=<id>" && exit 1)
	pnpm dlx tsx --env-file=$(ENV_FILE) apps/api/scripts/create-default-roles.ts $(ORGANIZATION_ID)

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

# プロジェクトで使う Secret Manager シークレットの全集合（env ファイルから一括投入する対象）。
# Cloud Run API サーバーの参照集合（terraform の api_secret_ids / infra/terraform/gcp/common/api）と一致させる。
# batch worker が参照するキー（common/batch の worker_secret_names）はこの集合の部分集合なので、
# このリストを投入すれば worker 用シークレットも同じ実体が埋まる（シークレットは共有リソース）。
# 新しいシークレットを追加したら terraform の参照リストとこのリストの両方に追加する。
SECRET_KEYS = \
	API_URL \
	USER_APP_URL \
	CONSOLE_APP_URL \
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

# Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho>
# Usage: make setup-secrets:dev
# Usage: make setup-secrets:prod
# Example: make setup-secrets PROJECT=mirai-yoho-dev
setup-secrets:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho>" && exit 1)
	@for secret in $(SECRET_KEYS); do \
		echo "Enter value for $$secret (end with Ctrl-D):"; \
		gcloud secrets versions add $$secret --project $(PROJECT) --data-file=-; \
	done

# Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho> KEY=<OPENAI_API_KEY>
# Usage: make setup-secret:dev KEY=<SECRET_KEY>
# Usage: make setup-secret:prod KEY=<SECRET_KEY>
# Example: make setup-secret PROJECT=mirai-yoho-dev KEY=OPENAI_API_KEY
setup-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho> KEY=<SECRET_KEY>" && exit 1)
	@echo "Enter value for $(KEY) (end with Ctrl-D):"
	gcloud secrets versions add $(KEY) --project $(PROJECT) --data-file=-

# .env ファイルから Secret Manager へ全シークレット（$(SECRET_KEYS)）を一括投入する。
# API サーバー / batch worker が参照するシークレットはすべてこの集合の共有リソースなので、
# これ 1 本で両方まかなえる（IAM のアクセス範囲は terraform 側で個別にスコープする）。
# Usage: make setup-secrets-from-env PROJECT=<mirai-yoho-dev|mirai-yoho> [ENV=<local|dev|prod>]
# Usage: make setup-secrets-from-env:dev
# Usage: make setup-secrets-from-env:prod
# Required environment variables: SECRET_KEYS と同名の env を $(ENV_FILE) にすべて設定
setup-secrets-from-env:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secrets-from-env PROJECT=<mirai-yoho-dev|mirai-yoho>" && exit 1)
	@set -a; . "$(ENV_FILE)"; set +a; \
	for secret in $(SECRET_KEYS); do \
		value="$$(printenv $$secret)"; \
		if [ -z "$$value" ]; then \
			echo "Error: environment variable $$secret is required"; \
			exit 1; \
		fi; \
		printf '%s' "$$value" | gcloud secrets versions add $$secret --project "$(PROJECT)" --data-file=- >/dev/null; \
		echo "Added new version for $$secret"; \
	done

# Usage: make setup-secrets-from-env-fish PROJECT=<mirai-yoho-dev|mirai-yoho> [ENV=<local|dev|prod>]
# Usage: make setup-secrets-from-env-fish:dev
# Usage: make setup-secrets-from-env-fish:prod
setup-secrets-from-env-fish:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secrets-from-env-fish PROJECT=<mirai-yoho-dev|mirai-yoho>" && exit 1)
	PROJECT="$(PROJECT)" ENV_FILE="$(ENV_FILE)" SECRET_KEYS="$(SECRET_KEYS)" fish apps/api/scripts/setup-secrets-from-env.fish

# Usage: make describe-secret PROJECT=<mirai-yoho-dev|mirai-yoho> KEY=<SECRET_KEY>
# Usage: make describe-secret:dev KEY=<SECRET_KEY>
# Usage: make describe-secret:prod KEY=<SECRET_KEY>
describe-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make describe-secret PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make describe-secret PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	gcloud secrets describe $(KEY) --project $(PROJECT)

# Usage: make access-secret PROJECT=<mirai-yoho-dev|mirai-yoho> KEY=<SECRET_KEY[@version]>
# Usage: make access-secret:dev KEY=<SECRET_KEY[@version]>
# Usage: make access-secret:prod KEY=<SECRET_KEY[@version]>
# KEY は SECRET_KEY（latest）または SECRET_KEY@<version> を指定する
access-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make access-secret PROJECT=<project> KEY=<SECRET_KEY[@version]>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make access-secret PROJECT=<project> KEY=<SECRET_KEY[@version]>" && exit 1)
	@name="$(KEY)"; version="latest"; \
	case "$$name" in *@*) version="$${name#*@}"; name="$${name%@*}";; esac; \
	gcloud secrets versions access "$$version" --secret "$$name" --project $(PROJECT)

# Usage: make check-secret-value PROJECT=<mirai-yoho-dev|mirai-yoho> KEY=<SECRET_KEY>
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

create-default-roles\:dev:
	$(MAKE) create-default-roles ENV=dev ORGANIZATION_ID=$(ORGANIZATION_ID)

create-default-roles\:prod:
	$(MAKE) create-default-roles ENV=prod ORGANIZATION_ID=$(ORGANIZATION_ID)

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

setup-secrets-from-env\:dev:
	$(MAKE) setup-secrets-from-env ENV=dev PROJECT=$(PROJECT_DEV)

setup-secrets-from-env\:prod:
	$(MAKE) setup-secrets-from-env ENV=prod PROJECT=$(PROJECT_PROD)

setup-secrets-from-env-fish\:dev:
	$(MAKE) setup-secrets-from-env-fish ENV=dev PROJECT=$(PROJECT_DEV)

setup-secrets-from-env-fish\:prod:
	$(MAKE) setup-secrets-from-env-fish ENV=prod PROJECT=$(PROJECT_PROD)

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

# ============================================================
# ローカルからのデプロイ（.github/workflows/deploy-*.yml のローカル代替）
# ============================================================
# GitHub Actions のクレジット枯渇時に使用する。
# - hosting: pnpm でローカルビルド → firebase-tools でデプロイ（ローカル build 必須）
# - api / batch-worker: gcloud builds submit で Cloud Build 上でビルド（ローカルは gcloud のみ）
#
# 事前準備:
#   - gcloud auth login && gcloud auth application-default login（初回のみ）
#   - hosting は firebase-tools のログインが必要（初回のみ `pnpm dlx firebase-tools login`）
#   - .env.dev / .env.prod（hosting は VITE_* 一式、api / batch-worker は不要）

# Usage: make deploy-hosting ENV=<dev|prod>
# Usage: make deploy-hosting:dev / make deploy-hosting:prod
deploy-hosting:
	@test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be dev or prod" && exit 1)
	bash scripts/deploy/hosting.sh $(ENV)

deploy-hosting\:dev:
	$(MAKE) deploy-hosting ENV=dev

deploy-hosting\:prod:
	$(MAKE) deploy-hosting ENV=prod

# Usage: make deploy-api ENV=<dev|prod>
# Usage: make deploy-api:dev / make deploy-api:prod
deploy-api:
	@test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be dev or prod" && exit 1)
	bash scripts/deploy/api.sh $(ENV)

deploy-api\:dev:
	$(MAKE) deploy-api ENV=dev

deploy-api\:prod:
	$(MAKE) deploy-api ENV=prod

# Usage: make deploy-batch-worker ENV=<dev|prod>
# Usage: make deploy-batch-worker:dev / make deploy-batch-worker:prod
deploy-batch-worker:
	@test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be dev or prod" && exit 1)
	bash scripts/deploy/batch-worker.sh $(ENV)

deploy-batch-worker\:dev:
	$(MAKE) deploy-batch-worker ENV=dev

deploy-batch-worker\:prod:
	$(MAKE) deploy-batch-worker ENV=prod

# hosting → api → batch-worker の順で連続デプロイする
deploy-all\:dev:
	$(MAKE) deploy-hosting:dev
	$(MAKE) deploy-api:dev
	$(MAKE) deploy-batch-worker:dev

deploy-all\:prod:
	$(MAKE) deploy-hosting:prod
	$(MAKE) deploy-api:prod
	$(MAKE) deploy-batch-worker:prod
