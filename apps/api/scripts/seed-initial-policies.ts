/**
 * 各組織に初期の PolicyRevision（ユーザー向け 3 種 / 占い師向け 2 種）を投入する scaffold。
 *
 * 既に policy-revisions を持つ組織はスキップされる。initial markdown は
 * apps/api/scripts/seed-data/policy-*-initial.md から読む（差し替え可能）。
 * 投入処理そのものは seed-local.ts と共有する（./lib/seed-policies.ts）。
 *
 * Usage:
 *   pnpm dlx tsx --tsconfig apps/api/tsconfig.json --env-file=.env.local apps/api/scripts/seed-initial-policies.ts \
 *     [--version 2026-08-01] [--effective-from 2026-08-01T00:00:00+09:00] [--created-by seed] [--only-org <organizationId>]
 */

import { db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { seedPolicies } from "./lib/seed-policies";

interface ParsedArgs {
  version: string;
  effectiveFrom: Date;
  createdBy: string;
  onlyOrg: string | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    if (cur.startsWith("--")) {
      args[cur.slice(2)] = argv[i + 1] ?? "";
      i += 1;
    }
  }
  return {
    version: args.version ?? "2026-08-01",
    effectiveFrom: new Date(
      args["effective-from"] ?? "2026-08-01T00:00:00+09:00",
    ),
    createdBy: args["created-by"] ?? "seed",
    onlyOrg: args["only-org"] ?? null,
  };
}

async function resolveOrganizationIds(
  onlyOrg: string | null,
): Promise<string[]> {
  if (onlyOrg) {
    const doc = await db
      .collection(FIRESTORE_COLLECTIONS.organizations)
      .doc(onlyOrg)
      .get();
    return doc.exists ? [doc.id] : [];
  }

  const snapshot = await db
    .collection(FIRESTORE_COLLECTIONS.organizations)
    .get();
  return snapshot.docs.map((doc) => doc.id);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const organizationIds = await resolveOrganizationIds(parsed.onlyOrg);

  if (organizationIds.length === 0) {
    console.warn("対象組織なし。処理を終了します。");
    return;
  }

  const results = await seedPolicies({
    organizationIds,
    versions: [
      {
        version: parsed.version,
        effectiveFrom: parsed.effectiveFrom,
        status: "published",
      },
    ],
    createdBy: parsed.createdBy,
    // 初期投入なので、その種別の revision が既にあれば触らない
    skipMode: "type-exists",
  });

  console.log("Seed 完了:");
  for (const result of results) {
    const action =
      result.action === "created"
        ? `created (revisionId=${result.revisionId})`
        : "skip (already exists)";
    console.log(`  - ${result.organizationId} / ${result.type}: ${action}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
