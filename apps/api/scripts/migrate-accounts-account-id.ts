import { FieldValue } from "firebase-admin/firestore";
import { db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

/**
 * accounts コレクションのフィールドリネーム移行: `authUid` -> `accountId`
 *
 * accounts 集約の主識別子命名を他集約 (consultantId, roleId) に揃えるための移行。
 * 値は同じ Firebase Auth uid のまま。doc ID (`{organizationId}_{accountId}`) の形式も変わらない。
 *
 * ---- 実行モード ----
 *   --dry-run           : 対象件数を出力するのみ（書き込みなし）
 *   デフォルト          : `authUid` を持つ doc に `accountId` を複製（`authUid` は温存）。冪等。
 *   --delete-source     : `accountId` 移行済みの doc から旧 `authUid` フィールドを削除。
 *
 * ---- 推奨手順（本番/dev 共通）----
 *   1. ドライラン: pnpm dlx tsx --env-file=.env.dev  apps/api/scripts/migrate-accounts-account-id.ts --dry-run
 *   2. 複製:       pnpm dlx tsx --env-file=.env.dev  apps/api/scripts/migrate-accounts-account-id.ts
 *   3. `accountId` を読み書きする新コードをデプロイ
 *   4. 動作確認後、旧フィールド削除:
 *        pnpm dlx tsx --env-file=.env.dev  apps/api/scripts/migrate-accounts-account-id.ts --delete-source
 */

const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;
const BATCH_DOC_SIZE = 200;
const dryRun = process.argv.includes("--dry-run");
const deleteSource = process.argv.includes("--delete-source");

async function copyAuthUidToAccountId(): Promise<void> {
  const snapshot = await db.collection(ACCOUNT_COLLECTION).get();
  const targets = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return (
      typeof data.authUid === "string" && typeof data.accountId !== "string"
    );
  });

  console.log(`[copy] total docs: ${snapshot.docs.length}`);
  console.log(
    `[copy] targets (authUid set, accountId missing): ${targets.length}`,
  );

  if (targets.length === 0) {
    console.log("[copy] no documents to migrate. skip.");
    return;
  }

  if (dryRun) {
    console.log("[copy] Dry-run: no writes performed.");
    return;
  }

  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH_DOC_SIZE) {
    const docs = targets.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const doc of docs) {
      batch.update(doc.ref, { accountId: doc.data().authUid });
    }
    await batch.commit();
    done += docs.length;
    console.log(
      `[copy] accounts authUid -> accountId: ${done}/${targets.length}`,
    );
  }
}

async function deleteLegacyAuthUidField(): Promise<void> {
  const snapshot = await db.collection(ACCOUNT_COLLECTION).get();
  const targets = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.authUid !== undefined && typeof data.accountId === "string";
  });

  console.log(`[delete] total docs: ${snapshot.docs.length}`);
  console.log(`[delete] targets (both fields present): ${targets.length}`);

  if (targets.length === 0) {
    console.log("[delete] no legacy authUid fields. skip.");
    return;
  }

  if (dryRun) {
    console.log("[delete] Dry-run: no writes performed.");
    return;
  }

  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH_DOC_SIZE) {
    const docs = targets.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const doc of docs) {
      batch.update(doc.ref, { authUid: FieldValue.delete() });
    }
    await batch.commit();
    done += docs.length;
    console.log(`[delete] accounts legacy authUid: ${done}/${targets.length}`);
  }
}

async function main(): Promise<void> {
  console.log(`Mode: ${dryRun ? "DRY-RUN (no writes)" : "APPLY"}`);
  console.log(`Target collection: ${ACCOUNT_COLLECTION}`);

  if (deleteSource) {
    console.log("Operation: DELETE legacy `authUid` field.");
    await deleteLegacyAuthUidField();
    console.log("Legacy field deletion completed.");
    return;
  }

  console.log(
    "Operation: COPY only (`authUid` preserved). Re-run with --delete-source after deploy & verification.",
  );
  await copyAuthUidToAccountId();
  console.log("Copy completed.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
