.PHONY: set-claims auth-adc-organization-operator create-organization seed-slots delete-slots setup-secrets setup-secret list-apphosting-backends describe-secret access-secret check-secret-value check-public-build-secrets

# ============================================================
# Scripts（引数が必要なコマンド）
# ============================================================

# Usage: make set-claims UID=<uid> ROLE=<role>
# Example: make set-claims UID=abc123 ROLE=admin
set-claims:
	@test -n "$(UID)" || (echo "Error: UID is required. Usage: make set-claims UID=<uid> ROLE=<role>" && exit 1)
	@test -n "$(ROLE)" || (echo "Error: ROLE is required. Usage: make set-claims UID=<uid> ROLE=<role>" && exit 1)
	pnpm dlx tsx --env-file=.env.local scripts/set-custom-claims.ts $(UID) $(ROLE)

# Usage: make auth-adc-organization-operator PROJECT=<mirai-yoho-dev|mirai-yoho-prod>
# Example: make auth-adc-organization-operator PROJECT=mirai-yoho-dev
auth-adc-organization-operator:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make auth-adc-organization-operator PROJECT=<project>" && exit 1)
	gcloud auth application-default login --impersonate-service-account=organization-operator@$(PROJECT).iam.gserviceaccount.com

# Usage: make create-organization ORGANIZATION_ID=<organizationId> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>
# Example: make create-organization ORGANIZATION_ID=org-1 ORGANIZATION_NAME="Org 1" ADMIN_EMAIL=admin@example.com
create-organization:
	@test -n "$(ORGANIZATION_ID)" || (echo "Error: ORGANIZATION_ID is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>" && exit 1)
	@test -n "$(ORGANIZATION_NAME)" || (echo "Error: ORGANIZATION_NAME is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>" && exit 1)
	@test -n "$(ADMIN_EMAIL)" || (echo "Error: ADMIN_EMAIL is required. Usage: make create-organization ORGANIZATION_ID=<id> ORGANIZATION_NAME=<name> ADMIN_EMAIL=<email>" && exit 1)
	pnpm dlx tsx --env-file=.env.local scripts/create-organization.ts $(ORGANIZATION_ID) "$(ORGANIZATION_NAME)" $(ADMIN_EMAIL)

# Usage: make seed-slots ORGANIZATION_ID=<organizationId> CONSULTANT_ID=<consultantId>
# Example: make seed-slots ORGANIZATION_ID=org-1 CONSULTANT_ID=KE1A6PuKhxUaGf2OfWDU3XsSYuw2
seed-slots:
	@test -n "$(ORGANIZATION_ID)" || (echo "Error: ORGANIZATION_ID is required. Usage: make seed-slots ORGANIZATION_ID=<id> CONSULTANT_ID=<id>" && exit 1)
	@test -n "$(CONSULTANT_ID)" || (echo "Error: CONSULTANT_ID is required. Usage: make seed-slots ORGANIZATION_ID=<id> CONSULTANT_ID=<id>" && exit 1)
	pnpm dlx tsx --env-file=.env.local scripts/seed-slots.ts $(ORGANIZATION_ID) $(CONSULTANT_ID)

# Usage: make delete-slots
delete-slots:
	pnpm dlx tsx --env-file=.env.local scripts/delete-slots.ts

# ============================================================
# Firebase App Hosting セットアップ
# ============================================================

# apphosting.yaml と同じキーセット
APPHOSTING_SECRET_KEYS = \
	NEXT_PUBLIC_FIREBASE_API_KEY \
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
	NEXT_PUBLIC_FIREBASE_PROJECT_ID \
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
	NEXT_PUBLIC_APP_URL \
	STRIPE_SECRET_KEY \
	STRIPE_WEBHOOK_SECRET \
	ZOOM_ACCOUNT_ID \
	ZOOM_CLIENT_ID \
	ZOOM_CLIENT_SECRET \
	ZOOM_HOST_USER_ID \
	RESEND_API_KEY \
	FIREBASE_CLIENT_EMAIL \
	FIREBASE_PRIVATE_KEY \
	CANCEL_TOKEN_SECRET \
	RESEND_FROM_EMAIL \
	FIREBASE_PROJECT_ID \
	FIREBASE_STORAGE_BUCKET \
	LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL \
	INVOICE_REGISTRATION_NUMBER

PUBLIC_BUILD_SECRET_KEYS = \
	NEXT_PUBLIC_FIREBASE_API_KEY \
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
	NEXT_PUBLIC_FIREBASE_PROJECT_ID \
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
	NEXT_PUBLIC_APP_URL

# Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>
# Example: make setup-secrets PROJECT=mirai-yoho-dev
setup-secrets:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>" && exit 1)
	@for secret in $(APPHOSTING_SECRET_KEYS); do \
		echo "Setting $$secret"; \
		firebase apphosting:secrets:set $$secret --project $(PROJECT); \
	done

# Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<OPENAI_API_KEY>
# Example: make setup-secret PROJECT=mirai-yoho-dev KEY=OPENAI_API_KEY
setup-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make setup-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>" && exit 1)
	firebase apphosting:secrets:set $(KEY) --project $(PROJECT)

# Usage: make grant-secret-access PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<OPENAI_API_KEY> BACKEND=<backendId>
# Usage: make grant-secret-access PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<OPENAI_API_KEY> EMAILS=<sa1@example.iam.gserviceaccount.com,sa2@example.iam.gserviceaccount.com>
# Secret Manager コンソールで作成した Secret を App Hosting から読めるようにする

# Usage: make grant-secrets-access-all PROJECT=<mirai-yoho-dev|mirai-yoho-prod> BACKEND=<backendId>

# Usage: make list-apphosting-backends PROJECT=<mirai-yoho-dev|mirai-yoho-prod>
list-apphosting-backends:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make list-apphosting-backends PROJECT=<project>" && exit 1)
	firebase apphosting:backends:list --project $(PROJECT)

# Usage: make describe-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>
describe-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make describe-secret PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make describe-secret PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	firebase apphosting:secrets:describe $(KEY) --project $(PROJECT)

# Usage: make access-secret PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY[@version]>
access-secret:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make access-secret PROJECT=<project> KEY=<SECRET_KEY[@version]>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make access-secret PROJECT=<project> KEY=<SECRET_KEY[@version]>" && exit 1)
	firebase apphosting:secrets:access $(KEY) --project $(PROJECT)

# Usage: make check-secret-value PROJECT=<mirai-yoho-dev|mirai-yoho-prod> KEY=<SECRET_KEY>
# 値は表示せず、空かどうかのみ確認する
check-secret-value:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make check-secret-value PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	@test -n "$(KEY)" || (echo "Error: KEY is required. Usage: make check-secret-value PROJECT=<project> KEY=<SECRET_KEY>" && exit 1)
	@value="$$(firebase apphosting:secrets:access $(KEY) --project $(PROJECT))"; \
	if [ -z "$$value" ]; then \
		echo "NG: $(KEY) latest is empty"; \
		exit 1; \
	else \
		echo "OK: $(KEY) latest length=$${#value}"; \
	fi

# Usage: make check-public-build-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>
# NEXT_PUBLIC_* 系の build 用 secret が空でないかを一括確認
check-public-build-secrets:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make check-public-build-secrets PROJECT=<project>" && exit 1)
	@for secret in $(PUBLIC_BUILD_SECRET_KEYS); do \
		value="$$(firebase apphosting:secrets:access $$secret --project $(PROJECT))"; \
		if [ -z "$$value" ]; then \
			echo "NG: $$secret latest is empty"; \
			exit 1; \
		else \
			echo "OK: $$secret latest length=$${#value}"; \
		fi; \
	done
