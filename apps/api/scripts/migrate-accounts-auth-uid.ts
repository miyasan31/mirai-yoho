import { FieldValue } from "firebase-admin/firestore";
import { db } from "../src/infrastructure/firestore/firestore-client";

/**
 * accounts コレクションのフィールドリネーム移行: `uid` -> `authUid`
 *
 * Firebase Auth の uid を指すフィールド名を users コレクション（`authUid`）と
 * 統一するための移行。doc ID（`{organizationId}_{authUid}`）は変わらない。
 *
 * ---- 実行モード ----
 *   デフォルト          : `uid` を持つ doc に `authUid` を複製（`uid` は温存）。何度実行しても安全。
 *   --delete-source     : `authUid` 移行済みの doc から旧 `uid` フィールドを削除するだけ（複製はしない）。
 *
 * ---- 推奨手順（本番/dev 共通）----
 *   1. デプロイ直前の低トラフィック時に「複製」を実行:
 *        pnpm dlx tsx --env-file=.env.dev  apps/api/scripts/migrate-accounts-auth-uid.ts
 *   2. `authUid` を読み書きする新コードをデプロイ
 *   3. 動作確認後、旧フィールドを削除:
 *        pnpm dlx tsx --env-file=.env.dev  apps/api/scripts/migrate-accounts-auth-uid.ts --delete-source
 *
 * ※ 複製とデプロイの間に旧コードが作成した doc（`uid` のみ）は移行されない。
 *   低トラフィック時間帯に「複製→即デプロイ」する前提。心配なら手順1を直前に再実行する。
 */

const ACCOUNTS_COLLECTION = "accounts";
const BATCH_DOC_SIZE = 200;
const deleteSource = process.argv.includes("--delete-source");

async function copyUidToAuthUid(): Promise<void> {
  const snapshot = await db.collection(ACCOUNTS_COLLECTION).get();
  const targets = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return typeof data.uid === "string" && data.authUid === undefined;
  });
  if (targets.length === 0) {
    console.log("[copy] accounts: no documents to migrate. skip.");
    return;
  }

  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH_DOC_SIZE) {
    const docs = targets.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const doc of docs) {
      batch.update(doc.ref, { authUid: doc.data().uid });
    }
    await batch.commit();
    done += docs.length;
    console.log(`[copy] accounts uid -> authUid: ${done}/${targets.length}`);
  }
}

async function deleteLegacyUidField(): Promise<void> {
  const snapshot = await db.collection(ACCOUNTS_COLLECTION).get();
  const targets = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.uid !== undefined && typeof data.authUid === "string";
  });
  if (targets.length === 0) {
    console.log("[delete] accounts: no legacy uid fields. skip.");
    return;
  }

  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH_DOC_SIZE) {
    const docs = targets.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const doc of docs) {
      batch.update(doc.ref, { uid: FieldValue.delete() });
    }
    await batch.commit();
    done += docs.length;
    console.log(`[delete] accounts legacy uid: ${done}/${targets.length}`);
  }
}

async function main(): Promise<void> {
  if (deleteSource) {
    console.log("Mode: DELETE legacy `uid` field only (destructive).");
    await deleteLegacyUidField();
    console.log("Legacy field deletion completed.");
    return;
  }

  console.log(
    "Mode: COPY only (`uid` preserved). Re-run with --delete-source after deploy & verification.",
  );
  await copyUidToAuthUid();
  console.log("Copy completed.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
