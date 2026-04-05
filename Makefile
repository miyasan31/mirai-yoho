.PHONY: set-claims setup-firestore-collections create-organization seed-slots delete-slots deploy-firestore setup-secrets

# ============================================================
# Scripts（引数が必要なコマンド）
# ============================================================

# Usage: make set-claims UID=<uid> ROLE=<role>
# Example: make set-claims UID=abc123 ROLE=admin
set-claims:
	@test -n "$(UID)" || (echo "Error: UID is required. Usage: make set-claims UID=<uid> ROLE=<role>" && exit 1)
	@test -n "$(ROLE)" || (echo "Error: ROLE is required. Usage: make set-claims UID=<uid> ROLE=<role>" && exit 1)
	pnpm dlx tsx --env-file=.env.local scripts/set-custom-claims.ts $(UID) $(ROLE)

# Usage: make setup-firestore-collections
setup-firestore-collections:
	pnpm dlx tsx --env-file=.env.local scripts/setup-firestore-collections.ts

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
# Firebase Deploy（プロジェクト指定）
# ============================================================

# Usage: make deploy-firestore PROJECT=<dev|prod>
# Example: make deploy-firestore PROJECT=dev
deploy-firestore:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make deploy-firestore PROJECT=<dev|prod>" && exit 1)
	firebase deploy --only firestore:rules,firestore:indexes --project $(PROJECT)

# ============================================================
# Firebase App Hosting セットアップ
# ============================================================

# Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>
# Example: make setup-secrets PROJECT=mirai-yoho-dev
setup-secrets:
	@test -n "$(PROJECT)" || (echo "Error: PROJECT is required. Usage: make setup-secrets PROJECT=<mirai-yoho-dev|mirai-yoho-prod>" && exit 1)
	firebase apphosting:secrets:set STRIPE_SECRET_KEY --project $(PROJECT)
	firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET --project $(PROJECT)
	firebase apphosting:secrets:set ZOOM_ACCOUNT_ID --project $(PROJECT)
	firebase apphosting:secrets:set ZOOM_CLIENT_ID --project $(PROJECT)
	firebase apphosting:secrets:set ZOOM_CLIENT_SECRET --project $(PROJECT)
	firebase apphosting:secrets:set ZOOM_HOST_USER_ID --project $(PROJECT)
	firebase apphosting:secrets:set RESEND_API_KEY --project $(PROJECT)
	firebase apphosting:secrets:set FIREBASE_CLIENT_EMAIL --project $(PROJECT)
	firebase apphosting:secrets:set FIREBASE_PRIVATE_KEY --project $(PROJECT)
	firebase apphosting:secrets:set CANCEL_TOKEN_SECRET --project $(PROJECT)
