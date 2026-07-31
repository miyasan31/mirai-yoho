/**
 * 組織・初期管理者・初期設定・初期ポリシー（下書き）をまとめて作る。
 *
 * ポリシーは利用者向け 3 種 + 占い師向け 2 種を `draft` で作成する。本文は
 * apps/api/scripts/seed-data/policy-*-initial.md から読む。**draft のままでは
 * 顧客は予約できない**（予約フローは published な利用規約・キャンセルポリシーを要求する）ので、
 * 内容を確認してから運営コンソールの「利用規約・キャンセルポリシー」画面で公開する。
 *
 * Usage:
 *   pnpm dlx tsx --env-file=.env.local scripts/create-organization.ts \
 *     <organizationId> <name> <adminEmail> [adminName] [--policy-version 2026-08-01]
 */

import crypto from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { Role } from "../src/domain/authorization/role";
import { createDefaultConsultantStatuses } from "../src/domain/settings/consultant-status";
import { app, db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { getRoleDocId } from "../src/infrastructure/firestore/firestore-role-repository";
import {
  assertPolicySeedDataReadable,
  seedPolicies,
} from "./lib/seed-policies";

const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;
const ROLE_COLLECTION = FIRESTORE_COLLECTIONS.roles;
const SETTINGS_COLLECTION = FIRESTORE_COLLECTIONS.settings;

/** 版名の既定値は実行日（JST）。sv-SE ロケールは YYYY-MM-DD を返す */
function todayInJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );
}

/** 位置引数とオプション（--policy-version）を分けて取り出す */
function parseArgs(argv: string[]): {
  positionals: string[];
  policyVersion: string;
} {
  const positionals: string[] = [];
  let policyVersion = todayInJst();

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--policy-version") {
      policyVersion = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    positionals.push(argv[i]);
  }

  return { positionals, policyVersion };
}

async function main() {
  const { positionals, policyVersion } = parseArgs(process.argv.slice(2));
  const [organizationId, name, adminEmail, adminName] = positionals;

  if (!organizationId || !name || !adminEmail) {
    console.error(
      "Usage: pnpm dlx tsx --env-file=.env.local scripts/create-organization.ts <organizationId> <name> <adminEmail> [adminName] [--policy-version <version>]",
    );
    process.exit(1);
  }

  if (!policyVersion.trim()) {
    console.error("--policy-version requires a value");
    process.exit(1);
  }

  const normalizedAdminName = adminName?.trim() ? adminName.trim() : null;

  // 組織を作ってからポリシー本文が読めないと分かると、途中まで作られた組織が残る
  await assertPolicySeedDataReadable();

  const existingOrganization = await db
    .collection(ORGANIZATION_COLLECTION)
    .doc(organizationId)
    .get();

  if (existingOrganization.exists) {
    console.error(`Organization '${organizationId}' already exists`);
    process.exit(1);
  }

  const auth = getAuth(app);
  let userRecord = await auth.getUserByEmail(adminEmail).catch(() => null);
  const temporaryPassword = crypto.randomUUID();

  if (!userRecord) {
    userRecord = await auth.createUser({
      email: adminEmail,
      password: temporaryPassword,
    });
  }

  const now = Timestamp.now();
  const accountDocId = `${organizationId}_${userRecord.uid}`;
  const defaultConsultantStatuses = createDefaultConsultantStatuses();

  await db.collection(ORGANIZATION_COLLECTION).doc(organizationId).set({
    organizationId,
    name: name,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .collection(ACCOUNT_COLLECTION)
    .doc(accountDocId)
    .set({
      accountId: userRecord.uid,
      organizationId,
      roleId: "admin",
      status: userRecord.metadata.lastSignInTime ? "active" : "invited",
      name: normalizedAdminName,
      createdAt: now,
      updatedAt: now,
    });

  const systemRoles = [
    Role.createSystemAdmin(organizationId),
    Role.createSystemOperator(organizationId),
  ];
  for (const role of systemRoles) {
    await db
      .collection(ROLE_COLLECTION)
      .doc(getRoleDocId(organizationId, role.getRoleId()))
      .set({
        organizationId: role.getOrganizationId(),
        roleId: role.getRoleId(),
        name: role.getName(),
        description: role.getDescription(),
        isSystem: role.getIsSystem(),
        createdAt: now,
        updatedAt: now,
      });
  }

  await db.collection(SETTINGS_COLLECTION).doc(organizationId).set(
    {
      organizationId,
      consultantStatuses: defaultConsultantStatuses,
      defaultConsultantStatusId: defaultConsultantStatuses[0].statusId,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const policyResults = await seedPolicies({
    organizationIds: [organizationId],
    versions: [{ version: policyVersion, status: "draft" }],
    createdBy: userRecord.uid,
    skipMode: "type-exists",
  });

  const passwordResetLink = await auth.generatePasswordResetLink(adminEmail);

  console.log("Organization created successfully");
  console.log(`organizationId: ${organizationId}`);
  console.log(`name: ${name}`);
  console.log(`adminUid: ${userRecord.uid}`);
  console.log(`adminEmail: ${adminEmail}`);
  console.log(`adminName: ${normalizedAdminName ?? "(not set)"}`);
  console.log(`passwordResetLink: ${passwordResetLink}`);

  if (!userRecord.metadata.lastSignInTime) {
    console.log(`temporaryPassword: ${temporaryPassword}`);
  }

  console.log(`policyVersion: ${policyVersion}`);
  console.log("policyRevisions (draft):");
  for (const result of policyResults) {
    console.log(
      `  - ${result.type}: ${
        result.action === "created"
          ? `created (revisionId=${result.revisionId})`
          : "skipped (already exists)"
      }`,
    );
  }
  console.log(
    "ポリシーは下書きです。運営コンソールの「利用規約・キャンセルポリシー」画面で内容を確認し、公開してください（公開するまで顧客は予約できません）。",
  );
}

main().catch((error) => {
  console.error("Failed to create organization", error);
  process.exit(1);
});
