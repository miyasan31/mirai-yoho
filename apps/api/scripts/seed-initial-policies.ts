/**
 * 各組織に初期の PolicyRevision（ユーザー向け 3 種 / 占い師向け 2 種）を投入する scaffold。
 *
 * 既に policy-revisions を持つ組織はスキップされる。initial markdown は
 * apps/api/scripts/seed-data/policy-*-initial.md から読む（差し替え可能）。
 *
 * Usage:
 *   pnpm dlx tsx --env-file=.env.local apps/api/scripts/seed-initial-policies.ts \
 *     [--version 2026-08-01] [--effective-from 2026-08-01T00:00:00+09:00] [--created-by seed] [--only-org <organizationId>]
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

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

interface PolicySeedInput {
  type:
    | "user_terms"
    | "user_cancellation_policy"
    | "user_privacy_policy"
    | "consultant_terms"
    | "consultant_privacy_policy";
  title: string;
  fileName: string;
}

const POLICY_INPUTS: PolicySeedInput[] = [
  {
    type: "user_terms",
    title: "利用規約",
    fileName: "policy-user-terms-initial.md",
  },
  {
    type: "user_cancellation_policy",
    title: "キャンセルポリシー",
    fileName: "policy-user-cancellation-policy-initial.md",
  },
  {
    type: "user_privacy_policy",
    title: "プライバシーポリシー",
    fileName: "policy-user-privacy-policy-initial.md",
  },
  {
    type: "consultant_terms",
    title: "占い師利用規約",
    fileName: "policy-consultant-terms-initial.md",
  },
  {
    type: "consultant_privacy_policy",
    title: "占い師プライバシーポリシー",
    fileName: "policy-consultant-privacy-policy-initial.md",
  },
];

async function readSeedMarkdown(fileName: string): Promise<string> {
  const filePath = path.resolve(
    process.cwd(),
    "apps/api/scripts/seed-data",
    fileName,
  );
  return fs.readFile(filePath, "utf8");
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        });

  const db = getFirestore(app);

  const organizationsSnap = parsed.onlyOrg
    ? await db
        .collection(FIRESTORE_COLLECTIONS.organizations)
        .doc(parsed.onlyOrg)
        .get()
    : null;

  const organizationIds: string[] = organizationsSnap
    ? organizationsSnap.exists
      ? [organizationsSnap.id]
      : []
    : (await db.collection(FIRESTORE_COLLECTIONS.organizations).get()).docs.map(
        (d) => d.id,
      );

  if (organizationIds.length === 0) {
    console.warn("対象組織なし。処理を終了します。");
    return;
  }

  const now = Timestamp.now();
  const effectiveFromTs = Timestamp.fromDate(parsed.effectiveFrom);

  const summary: Array<{
    organizationId: string;
    type: string;
    action: string;
  }> = [];

  for (const organizationId of organizationIds) {
    for (const input of POLICY_INPUTS) {
      const existingSnap = await db
        .collection(FIRESTORE_COLLECTIONS.policyRevisions)
        .where("organizationId", "==", organizationId)
        .where("type", "==", input.type)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        summary.push({
          organizationId,
          type: input.type,
          action: "skip (already exists)",
        });
        continue;
      }

      const body = await readSeedMarkdown(input.fileName);
      const revisionId = crypto.randomUUID();

      await db
        .collection(FIRESTORE_COLLECTIONS.policyRevisions)
        .doc(revisionId)
        .set({
          revisionId,
          organizationId,
          type: input.type,
          version: parsed.version,
          title: input.title,
          body,
          status: "published",
          effectiveFrom: effectiveFromTs,
          publishedAt: now,
          archivedAt: null,
          createdBy: parsed.createdBy,
          createdAt: now,
          updatedAt: now,
        });

      summary.push({
        organizationId,
        type: input.type,
        action: `created (revisionId=${revisionId})`,
      });
    }
  }

  console.log("Seed 完了:");
  for (const row of summary) {
    console.log(`  - ${row.organizationId} / ${row.type}: ${row.action}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
