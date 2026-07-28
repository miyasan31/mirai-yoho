import { db } from "../src/infrastructure/firestore/firestore-client";

/**
 * organization- プレフィックス削除に伴う Firestore コレクション移行。
 *
 *   organization-roles    -> roles
 *   organization-settings -> settings
 *   organization-accounts -> accounts
 *
 * doc ID は保持したままコピーする（複合キー `{organizationId}_{...}` / `organizationId` はそのまま）。
 *
 * ---- 実行モード ----
 *   デフォルト          : コピーのみ（旧コレクションは温存）。何度実行しても安全。
 *   --delete-source     : 旧コレクションを「削除するだけ」（コピーはしない）。
 *
 * ---- 推奨手順（本番/dev 共通）----
 *   1. デプロイ直前の低トラフィック時に「コピー」を実行:
 *        pnpm dlx tsx --env-file=.env.dev  apps/api/scripts/migrate-drop-organization-prefix.ts
 *   2. 新コレクション名（roles/settings/accounts）を読み書きする新コードをデプロイ
 *   3. 動作確認後、旧コレクションを削除:
 *        pnpm dlx tsx --env-file=.env.dev  apps/api/scripts/migrate-drop-organization-prefix.ts --delete-source
 *
 * ※ コピーとデプロイの間に旧コレクションへ書き込まれた分は移行されない。
 *   低トラフィック時間帯に「コピー→即デプロイ」する前提。心配なら手順1を直前に再実行する。
 *   （--delete-source は再コピーしないため、デプロイ後の新規書き込みを上書きしない）
 */

const MIGRATIONS = [
  { from: "organization-roles", to: "roles" },
  { from: "organization-settings", to: "settings" },
  { from: "organization-accounts", to: "accounts" },
] as const;

const BATCH_DOC_SIZE = 200;
const deleteSource = process.argv.includes("--delete-source");

async function copyCollection(from: string, to: string): Promise<void> {
  const snapshot = await db.collection(from).get();
  if (snapshot.empty) {
    console.log(`[copy] ${from}: no documents. skip.`);
    return;
  }

  let done = 0;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_DOC_SIZE) {
    const docs = snapshot.docs.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const doc of docs) {
      batch.set(db.collection(to).doc(doc.id), doc.data());
    }
    await batch.commit();
    done += docs.length;
    console.log(`[copy] ${from} -> ${to}: ${done}/${snapshot.docs.length}`);
  }
}

async function deleteCollection(name: string): Promise<void> {
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) {
    console.log(`[delete] ${name}: no documents. skip.`);
    return;
  }

  let done = 0;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_DOC_SIZE) {
    const docs = snapshot.docs.slice(i, i + BATCH_DOC_SIZE);
    const batch = db.batch();
    for (const doc of docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    done += docs.length;
    console.log(`[delete] ${name}: ${done}/${snapshot.docs.length}`);
  }
}

async function main(): Promise<void> {
  if (deleteSource) {
    console.log("Mode: DELETE source collections only (destructive).");
    for (const { from } of MIGRATIONS) {
      await deleteCollection(from);
    }
    console.log("Legacy collection deletion completed.");
    return;
  }

  console.log(
    "Mode: COPY only (source preserved). Re-run with --delete-source after deploy & verification.",
  );
  for (const { from, to } of MIGRATIONS) {
    await copyCollection(from, to);
  }
  console.log("Copy completed.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
