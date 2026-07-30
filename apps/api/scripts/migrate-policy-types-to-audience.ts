import { db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

/**
 * policy-revisions / policy-agreements の `type` を、読者区分プレフィックス付きに
 * リネームする。
 *
 *   terms              -> user_terms
 *   cancellation_policy -> user_cancellation_policy
 *   privacy_policy      -> user_privacy_policy
 *
 * 分離前の 3 種別はいずれも利用者向けの文面だったため、すべて `user_*` に寄せる。
 * 占い師向けの `consultant_terms` / `consultant_privacy_policy` は本スクリプトでは
 * 作成せず、seed-initial-policies.ts か console の文書管理から新規に起版する。
 *
 * policy-agreements は subjectType を問わず一律にリネームする。占い師が旧・共通版に
 * 同意した記録も「その改訂に同意した」という事実は変わらないため、改訂側のリネームと
 * 揃えて参照整合性を保つ（占い師には移行後、占い師向け 2 種別の同意が改めて求められる）。
 *
 * 冪等性: 既に user_* / consultant_* になっているドキュメントはスキップする。
 *
 * ---- 実行モード ----
 *   デフォルト   : 実際に更新する
 *   --dry-run    : 更新せず、対象ドキュメントの現状をログ出力
 *
 * ---- 推奨手順 ----
 *   1. ドライラン: pnpm dlx tsx --env-file=.env.dev apps/api/scripts/migrate-policy-types-to-audience.ts --dry-run
 *   2. 本実行:     pnpm dlx tsx --env-file=.env.dev apps/api/scripts/migrate-policy-types-to-audience.ts
 *   3. 新コード（user_* / consultant_* を要求する API / SPA）をデプロイ
 *   4. 占い師向け初期版を起版:
 *        pnpm dlx tsx --env-file=.env.dev apps/api/scripts/seed-initial-policies.ts
 */

const BATCH_DOC_SIZE = 200;
const dryRun = process.argv.includes("--dry-run");

const TYPE_MAP: Record<string, string> = {
  terms: "user_terms",
  cancellation_policy: "user_cancellation_policy",
  privacy_policy: "user_privacy_policy",
};

const MIGRATED_TYPES = new Set([
  "user_terms",
  "user_cancellation_policy",
  "user_privacy_policy",
  "consultant_terms",
  "consultant_privacy_policy",
]);

interface MigrationTarget {
  ref: FirebaseFirestore.DocumentReference;
  before: string;
  after: string;
}

interface CollectionResult {
  collection: string;
  targets: MigrationTarget[];
  alreadyMigrated: number;
  unknown: string[];
}

async function planCollection(
  collection: string,
  withUpdatedAt: boolean,
): Promise<CollectionResult> {
  const snapshot = await db.collection(collection).get();
  console.log(`[${collection}] total documents: ${snapshot.docs.length}`);

  const targets: MigrationTarget[] = [];
  const unknown = new Set<string>();
  let alreadyMigrated = 0;

  for (const doc of snapshot.docs) {
    const raw = (doc.data() as { type?: unknown }).type;
    if (typeof raw !== "string") {
      unknown.add(String(raw));
      console.warn(`[warn] ${collection}/${doc.id}: type is not a string.`);
      continue;
    }
    if (MIGRATED_TYPES.has(raw)) {
      alreadyMigrated += 1;
      continue;
    }
    const mapped = TYPE_MAP[raw];
    if (!mapped) {
      unknown.add(raw);
      console.warn(
        `[warn] ${collection}/${doc.id}: unknown policy type "${raw}" — kept as-is.`,
      );
      continue;
    }
    targets.push({ ref: doc.ref, before: raw, after: mapped });
  }

  console.log(
    `[${collection}] already migrated: ${alreadyMigrated} / planned: ${targets.length}`,
  );

  if (!dryRun) {
    const now = new Date();
    for (let i = 0; i < targets.length; i += BATCH_DOC_SIZE) {
      const chunk = targets.slice(i, i + BATCH_DOC_SIZE);
      const batch = db.batch();
      for (const target of chunk) {
        // policy-agreements は記録専用・不変のため updatedAt を持たない
        batch.update(
          target.ref,
          withUpdatedAt
            ? { type: target.after, updatedAt: now }
            : { type: target.after },
        );
      }
      await batch.commit();
      console.log(
        `[${collection}] batch committed: ${Math.min(i + BATCH_DOC_SIZE, targets.length)}/${targets.length}`,
      );
    }
  }

  return {
    collection,
    targets,
    alreadyMigrated,
    unknown: [...unknown],
  };
}

async function main(): Promise<void> {
  console.log(
    `Mode: ${dryRun ? "DRY-RUN (no writes)" : "APPLY (writes updates)"}`,
  );

  const results: CollectionResult[] = [];
  results.push(
    await planCollection(FIRESTORE_COLLECTIONS.policyRevisions, true),
  );
  results.push(
    await planCollection(FIRESTORE_COLLECTIONS.policyAgreements, false),
  );

  console.log("---");
  for (const result of results) {
    const byType = new Map<string, number>();
    for (const target of result.targets) {
      byType.set(target.before, (byType.get(target.before) ?? 0) + 1);
    }
    const breakdown =
      [...byType.entries()]
        .map(([before, count]) => `${before}→${TYPE_MAP[before]}: ${count}`)
        .join(", ") || "none";
    console.log(`${result.collection}: ${breakdown}`);
    if (result.unknown.length > 0) {
      console.log(
        `${result.collection}: unknown types encountered: ${result.unknown.join(", ")}`,
      );
    }
  }

  if (dryRun) {
    console.log("---");
    console.log("Dry-run: no writes performed.");
    return;
  }

  const total = results.reduce((sum, r) => sum + r.targets.length, 0);
  console.log("---");
  console.log(`Migration complete. Updated ${total} documents.`);
}

main().catch((error) => {
  console.error("Failed to migrate policy types to audience-prefixed", error);
  process.exit(1);
});
