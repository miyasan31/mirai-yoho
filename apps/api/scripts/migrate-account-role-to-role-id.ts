import { FieldValue } from "firebase-admin/firestore";
import { db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

/**
 * accounts コレクションの `role` フィールドを `roleId` へリネームする。
 *
 *   role: "consultant"     -> roleId: "admin"（相談員ロールは廃止し、
 *                              相談員かどうかは consultants コレクションの
 *                              ドキュメント存在で判定するモデルに移行）
 *   role: "admin"/"operator"/<custom> -> roleId: 同じ値
 *
 * 冪等性: 既に roleId が入っているドキュメントはスキップする。
 *
 * ---- 実行モード ----
 *   デフォルト   : 実際に更新する
 *   --dry-run    : 更新せず、対象ドキュメントの現状をログ出力
 *
 * ---- 推奨手順 ----
 *   1. ドライラン: pnpm dlx tsx --env-file=.env.local apps/api/scripts/migrate-account-role-to-role-id.ts --dry-run
 *   2. 本実行:     pnpm dlx tsx --env-file=.env.local apps/api/scripts/migrate-account-role-to-role-id.ts
 *   3. 新コード（roleId / isConsultant ベース）をデプロイ
 */

const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;
const BATCH_DOC_SIZE = 200;
const dryRun = process.argv.includes("--dry-run");

interface AccountDocLegacy {
  role?: unknown;
  roleId?: unknown;
}

async function main(): Promise<void> {
  console.log(
    `Mode: ${dryRun ? "DRY-RUN (no writes)" : "APPLY (writes updates)"}`,
  );
  console.log(`Target collection: ${ACCOUNT_COLLECTION}`);

  const snapshot = await db.collection(ACCOUNT_COLLECTION).get();
  console.log(`Total documents in collection: ${snapshot.docs.length}`);

  if (snapshot.empty) {
    console.log(
      `No account documents found. If you expected data here, double-check the ` +
        `Firebase project (envServer.firebaseProjectId) that this run is bound to.`,
    );
    return;
  }

  let toMigrate = 0;
  let alreadyMigrated = 0;
  let neitherFieldSet = 0;
  let promotedConsultants = 0;
  const now = new Date();
  const targets: Array<{
    ref: FirebaseFirestore.DocumentReference;
    nextRoleId: string;
    legacyRole: string;
  }> = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as AccountDocLegacy;
    const legacyRole = data.role;
    const currentRoleId = data.roleId;

    if (typeof currentRoleId === "string" && currentRoleId.length > 0) {
      alreadyMigrated += 1;
      continue;
    }
    if (typeof legacyRole !== "string" || legacyRole.length === 0) {
      neitherFieldSet += 1;
      console.warn(
        `[skip] ${doc.id}: neither 'role' (string) nor 'roleId' is set. ` +
          `raw role=${JSON.stringify(legacyRole)} raw roleId=${JSON.stringify(currentRoleId)}`,
      );
      continue;
    }
    const nextRoleId = legacyRole === "consultant" ? "admin" : legacyRole;
    if (legacyRole === "consultant") {
      promotedConsultants += 1;
    }
    targets.push({ ref: doc.ref, nextRoleId, legacyRole });
    toMigrate += 1;
  }

  console.log("---");
  console.log(`Already migrated (roleId set): ${alreadyMigrated}`);
  console.log(`No role field:                 ${neitherFieldSet}`);
  console.log(`Planned migrations:            ${toMigrate}`);
  console.log(`  - consultant → admin:        ${promotedConsultants}`);

  if (targets.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  console.log("---");
  console.log("Sample of planned changes (first 5):");
  for (const target of targets.slice(0, 5)) {
    console.log(
      `  ${target.ref.id}: role="${target.legacyRole}" -> roleId="${target.nextRoleId}"`,
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
        roleId: target.nextRoleId,
        role: FieldValue.delete(),
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
}

main().catch((error) => {
  console.error("Failed to migrate account role → roleId", error);
  process.exit(1);
});
