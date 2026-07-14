import { FieldValue } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { db } from "../src/infrastructure/firestore/firestore-customer";

/**
 * roles コレクションの `permissions` 配列の要素を `admin.*` → `console.*` にリネームする。
 *
 * 例: "admin.dashboard.read" -> "console.dashboard.read"
 *
 * 冪等性: 既に console.* だけになっているドキュメントはスキップする。
 * 未知の admin.* サブキー（マップ表にない）は警告してスキップする。
 *
 * ---- 実行モード ----
 *   デフォルト   : 実際に更新する
 *   --dry-run    : 更新せず、対象ドキュメントの現状をログ出力
 *
 * ---- 推奨手順 ----
 *   1. ドライラン: pnpm dlx tsx --env-file=.env.dev apps/api/scripts/migrate-role-permissions-admin-to-console.ts --dry-run
 *   2. 本実行:     pnpm dlx tsx --env-file=.env.dev apps/api/scripts/migrate-role-permissions-admin-to-console.ts
 *   3. 新コード（console.* 権限を要求する API / SPA）をデプロイ
 */

const ROLES_COLLECTION = FIRESTORE_COLLECTIONS.roles;
const BATCH_DOC_SIZE = 200;
const dryRun = process.argv.includes("--dry-run");

const PERMISSION_MAP: Record<string, string> = {
  "admin.dashboard.read": "console.dashboard.read",
  "admin.bookings.read": "console.bookings.read",
  "admin.bookings.cancel": "console.bookings.cancel",
  "admin.payments.read": "console.payments.read",
  "admin.payments.charge": "console.payments.charge",
  "admin.customers.read": "console.customers.read",
  "admin.consultants.read": "console.consultants.read",
  "admin.consultants.manage": "console.consultants.manage",
  "admin.consultants.status.manage": "console.consultants.status.manage",
  "admin.slots.read": "console.slots.read",
  "admin.slots.manage": "console.slots.manage",
  "admin.settings.read": "console.settings.read",
  "admin.settings.manage": "console.settings.manage",
  "admin.accounts.read": "console.accounts.read",
  "admin.accounts.invite": "console.accounts.invite",
  "admin.accounts.display-name.manage": "console.accounts.display-name.manage",
  "admin.accounts.role.manage": "console.accounts.role.manage",
  "admin.accounts.delete": "console.accounts.delete",
  "admin.accounts.invite.resend": "console.accounts.invite.resend",
  "admin.accounts.password-reset": "console.accounts.password-reset",
  "admin.roles.read": "console.roles.read",
  "admin.roles.manage": "console.roles.manage",
};

interface RoleDoc {
  permissions?: unknown;
}

async function main(): Promise<void> {
  console.log(
    `Mode: ${dryRun ? "DRY-RUN (no writes)" : "APPLY (writes updates)"}`,
  );
  console.log(`Target collection: ${ROLES_COLLECTION}`);

  const snapshot = await db.collection(ROLES_COLLECTION).get();
  console.log(`Total documents in collection: ${snapshot.docs.length}`);

  if (snapshot.empty) {
    console.log(
      `No role documents found. Double-check envServer.firebaseProjectId.`,
    );
    return;
  }

  let alreadyMigrated = 0;
  let noPermissions = 0;
  const unknownAdminKeys = new Set<string>();
  const now = new Date();
  const targets: Array<{
    ref: FirebaseFirestore.DocumentReference;
    nextPermissions: string[];
    beforeSample: string[];
  }> = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as RoleDoc;
    const permissions = data.permissions;

    if (!Array.isArray(permissions)) {
      noPermissions += 1;
      continue;
    }

    let hasAdminPrefix = false;
    const next: string[] = [];
    for (const raw of permissions) {
      if (typeof raw !== "string") {
        next.push(raw as string);
        continue;
      }
      if (raw.startsWith("admin.")) {
        hasAdminPrefix = true;
        const mapped = PERMISSION_MAP[raw];
        if (mapped) {
          next.push(mapped);
        } else {
          unknownAdminKeys.add(raw);
          console.warn(
            `[warn] ${doc.id}: unknown admin.* permission "${raw}" — kept as-is.`,
          );
          next.push(raw);
        }
      } else {
        next.push(raw);
      }
    }

    if (!hasAdminPrefix) {
      alreadyMigrated += 1;
      continue;
    }

    targets.push({
      ref: doc.ref,
      nextPermissions: next,
      beforeSample: permissions.filter(
        (p): p is string => typeof p === "string" && p.startsWith("admin."),
      ),
    });
  }

  console.log("---");
  console.log(`Already migrated (no admin.*): ${alreadyMigrated}`);
  console.log(`No permissions field:          ${noPermissions}`);
  console.log(`Planned migrations:            ${targets.length}`);

  if (unknownAdminKeys.size > 0) {
    console.log(
      `Unknown admin.* keys encountered: ${[...unknownAdminKeys].join(", ")}`,
    );
  }

  if (targets.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  console.log("---");
  console.log("Sample of planned changes (first 5):");
  for (const target of targets.slice(0, 5)) {
    console.log(
      `  ${target.ref.id}: ${target.beforeSample.length} admin.* keys → console.*`,
    );
  }

  if (dryRun) {
    console.log("---");
    console.log("Dry-run: no writes performed.");
    return;
  }

  for (let i = 0; i < targets.length; i += BATCH_DOC_SIZE) {
    const chunk = targets.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const target of chunk) {
      batch.update(target.ref, {
        permissions: target.nextPermissions,
        updatedAt: now,
      });
    }
    await batch.commit();
    console.log(
      `[migrate] batch committed: ${Math.min(i + BATCH_DOC_SIZE, targets.length)}/${targets.length}`,
    );
  }

  console.log("---");
  console.log(`Migration complete. Updated ${targets.length} documents.`);
  // FieldValue import kept for future extension (currently unused directly).
  void FieldValue;
}

main().catch((error) => {
  console.error("Failed to migrate role permissions admin → console", error);
  process.exit(1);
});
