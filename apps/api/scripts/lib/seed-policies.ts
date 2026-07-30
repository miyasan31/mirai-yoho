/**
 * 初期の PolicyRevision（利用者向け 3 種 + 占い師向け 2 種）を投入する共通処理。
 * seed-initial-policies.ts と seed-local.ts の両方から使う。
 *
 * 本文は apps/api/scripts/seed-data/policy-*-initial.md から読む（差し替え可能）。
 * 既に同じ組織・同じ type の revision がある場合は何もしない。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import type { PolicyType } from "../../src/domain/policy/policy-type";
import { db } from "../../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../../src/infrastructure/firestore/firestore-collections";

interface PolicySeedInput {
  type: PolicyType;
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

/** リポジトリルートからでも apps/api からでも実行できるように両方の相対パスを試す */
const SEED_DATA_DIR_CANDIDATES = [
  "apps/api/scripts/seed-data",
  "scripts/seed-data",
];

async function readSeedMarkdown(fileName: string): Promise<string> {
  for (const dir of SEED_DATA_DIR_CANDIDATES) {
    const filePath = path.resolve(process.cwd(), dir, fileName);
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      // 次の候補を試す
    }
  }
  throw new Error(
    `Seed markdown not found: ${fileName}（リポジトリルートか apps/api から実行してください）`,
  );
}

export interface SeedPoliciesParams {
  organizationIds: string[];
  version: string;
  effectiveFrom: Date;
  createdBy: string;
}

export interface SeedPolicyResult {
  organizationId: string;
  type: PolicyType;
  action: "created" | "skipped";
  revisionId?: string;
}

export async function seedPolicies(
  params: SeedPoliciesParams,
): Promise<SeedPolicyResult[]> {
  const now = Timestamp.now();
  const effectiveFromTs = Timestamp.fromDate(params.effectiveFrom);
  const results: SeedPolicyResult[] = [];

  for (const organizationId of params.organizationIds) {
    for (const input of POLICY_INPUTS) {
      const existing = await db
        .collection(FIRESTORE_COLLECTIONS.policyRevisions)
        .where("organizationId", "==", organizationId)
        .where("type", "==", input.type)
        .limit(1)
        .get();

      if (!existing.empty) {
        results.push({
          organizationId,
          type: input.type,
          action: "skipped",
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
          version: params.version,
          title: input.title,
          body,
          status: "published",
          effectiveFrom: effectiveFromTs,
          publishedAt: now,
          archivedAt: null,
          createdBy: params.createdBy,
          createdAt: now,
          updatedAt: now,
        });

      results.push({
        organizationId,
        type: input.type,
        action: "created",
        revisionId,
      });
    }
  }

  return results;
}
