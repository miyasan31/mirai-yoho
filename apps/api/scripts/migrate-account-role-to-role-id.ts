import { FieldValue } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { db } from "../src/infrastructure/firestore/firestore-customer";

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
 * ---- 推奨手順 ----
 *   1. デプロイ直前の低トラフィック時に実行:
 *        pnpm dlx tsx --env-file=.env.local apps/api/scripts/migrate-account-role-to-role-id.ts
 *   2. 新コード（roleId / isConsultant ベース）をデプロイ
 */

const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;
const BATCH_DOC_SIZE = 200;

interface AccountDocLegacy {
  role?: string;
  roleId?: string;
}

async function main(): Promise<void> {
  const snapshot = await db.collection(ACCOUNT_COLLECTION).get();
  if (snapshot.empty) {
    console.log("No account documents found. Nothing to migrate.");
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let promotedConsultants = 0;
  const now = new Date();

  for (let i = 0; i < snapshot.docs.length; i += BATCH_DOC_SIZE) {
    const chunk = snapshot.docs.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      const data = doc.data() as AccountDocLegacy;
      if (typeof data.roleId === "string" && data.roleId.length > 0) {
        skipped += 1;
        continue;
      }
      const legacyRole = data.role;
      if (typeof legacyRole !== "string" || legacyRole.length === 0) {
        console.warn(
          `[migrate] ${doc.id}: neither 'role' nor 'roleId' is set. Skipping.`,
        );
        skipped += 1;
        continue;
      }
      const nextRoleId = legacyRole === "consultant" ? "admin" : legacyRole;
      if (legacyRole === "consultant") {
        promotedConsultants += 1;
      }
      batch.update(doc.ref, {
        roleId: nextRoleId,
        role: FieldValue.delete(),
        updatedAt: now,
      });
      migrated += 1;
    }
    await batch.commit();
    console.log(
      `[migrate] batch committed: ${Math.min(i + BATCH_DOC_SIZE, snapshot.docs.length)}/${snapshot.docs.length}`,
    );
  }

  console.log(`Total documents:   ${snapshot.docs.length}`);
  console.log(`Migrated:          ${migrated}`);
  console.log(`  - consultant→admin: ${promotedConsultants}`);
  console.log(`Skipped (already migrated / no role): ${skipped}`);
}

main().catch((error) => {
  console.error("Failed to migrate account role → roleId", error);
  process.exit(1);
});
