/**
 * 初期の PolicyRevision（利用者向け 3 種 + 占い師向け 2 種）を投入する共通処理。
 * create-organization.ts と seed-local.ts の両方から使う。
 *
 * 本文は apps/api/scripts/seed-data/policy-*-initial.md から読む（差し替え可能）。
 * 既に同じ組織・同じ type の revision がある場合は何もしない。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import type { PolicyRevisionStatus } from "../../src/domain/policy/policy-revision";
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

/**
 * 本文ファイルが全種類読めるか先に確かめる。組織作成のように後戻りできない書き込みの
 * 前に呼び、cwd 違いで「組織だけ作られてポリシーが無い」状態になるのを防ぐ。
 */
export async function assertPolicySeedDataReadable(): Promise<void> {
  for (const input of POLICY_INPUTS) {
    await readSeedMarkdown(input.fileName);
  }
}

export interface PolicyVersionInput {
  version: string;
  /** draft は施行日を持たない（公開時にコンソールで決める）ため省略できる */
  effectiveFrom?: Date;
  status: PolicyRevisionStatus;
  /** 本文の冒頭に足す注記。旧版・下書きを画面上で見分けられるようにする */
  note?: string;
  /** status が archived のときの archivedAt（未指定なら effectiveFrom を使う） */
  archivedAt?: Date;
}

export interface SeedPoliciesParams {
  organizationIds: string[];
  /** 古い版から順に並べる */
  versions: PolicyVersionInput[];
  createdBy: string;
  /**
   * - "type-exists": その種別の revision が 1 件でもあれば何もしない（初期投入向け）
   * - "version-exists": 同じ version が無ければ作る（改版履歴を作るローカルシード向け）
   */
  skipMode: "type-exists" | "version-exists";
}

export interface SeedPolicyResult {
  organizationId: string;
  type: PolicyType;
  version: string;
  action: "created" | "skipped";
  revisionId?: string;
}

function toBody(baseBody: string, note?: string): string {
  return note ? `> ${note}\n\n${baseBody}` : baseBody;
}

async function hasRevision(
  organizationId: string,
  type: PolicyType,
  version?: string,
): Promise<boolean> {
  let query = db
    .collection(FIRESTORE_COLLECTIONS.policyRevisions)
    .where("organizationId", "==", organizationId)
    .where("type", "==", type);
  if (version) {
    query = query.where("version", "==", version);
  }
  const snapshot = await query.limit(1).get();
  return !snapshot.empty;
}

export async function seedPolicies(
  params: SeedPoliciesParams,
): Promise<SeedPolicyResult[]> {
  const now = Timestamp.now();
  const results: SeedPolicyResult[] = [];

  for (const organizationId of params.organizationIds) {
    for (const input of POLICY_INPUTS) {
      const baseBody = await readSeedMarkdown(input.fileName);

      for (const versionInput of params.versions) {
        const skip = await hasRevision(
          organizationId,
          input.type,
          params.skipMode === "version-exists"
            ? versionInput.version
            : undefined,
        );

        if (skip) {
          results.push({
            organizationId,
            type: input.type,
            version: versionInput.version,
            action: "skipped",
          });
          continue;
        }

        const revisionId = crypto.randomUUID();
        const isDraft = versionInput.status === "draft";

        if (!isDraft && !versionInput.effectiveFrom) {
          throw new Error(
            `effectiveFrom is required for ${versionInput.status} revision (${input.type} / ${versionInput.version})`,
          );
        }

        // draft は PolicyRevision.create と同じ形（施行日・公開日なし、監査は実行時刻）で書く
        const effectiveFrom = versionInput.effectiveFrom
          ? Timestamp.fromDate(versionInput.effectiveFrom)
          : null;
        const archivedAt =
          versionInput.status === "archived" && versionInput.effectiveFrom
            ? Timestamp.fromDate(
                versionInput.archivedAt ?? versionInput.effectiveFrom,
              )
            : null;

        await db
          .collection(FIRESTORE_COLLECTIONS.policyRevisions)
          .doc(revisionId)
          .set({
            revisionId,
            organizationId,
            type: input.type,
            version: versionInput.version,
            title: input.title,
            body: toBody(baseBody, versionInput.note),
            status: versionInput.status,
            effectiveFrom: isDraft ? null : effectiveFrom,
            publishedAt: isDraft ? null : effectiveFrom,
            archivedAt,
            createdBy: params.createdBy,
            createdAt: isDraft ? now : effectiveFrom,
            updatedAt: isDraft ? now : effectiveFrom,
          });

        results.push({
          organizationId,
          type: input.type,
          version: versionInput.version,
          action: "created",
          revisionId,
        });
      }
    }
  }

  return results;
}
