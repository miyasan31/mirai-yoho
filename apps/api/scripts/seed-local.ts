/**
 * ローカルの Firestore エミュレーターに開発用のシードデータを一括投入する。
 *
 * 投入するもの:
 *   - organizations / settings（既定の相談者ステータス・営業時間・料金レンジ）
 *   - roles（admin / operator のシステムロール）
 *   - accounts（console にログインする管理者）
 *   - consultants（consultant にログインする占い師）
 *   - price-plans（30 / 60 / 90 分の 3 プラン）
 *   - slots（翌日から N 日分、10:00-17:00 の 15 分枠）
 *
 * Firebase Auth はエミュレートしないため、admin / consultant には
 * **dev プロジェクトに実在する** Auth ユーザーのメールアドレスか UID を渡す。
 * このスクリプトは Auth を読むだけで、ユーザーの作成・変更は一切しない。
 *
 * 同じ引数で何度実行しても同じドキュメントを上書きするだけ（slot も含めて冪等）。
 *
 * Usage:
 *   pnpm dlx tsx --env-file=apps/api/.env.local apps/api/scripts/seed-local.ts \
 *     --admin <email|uid> [--consultant <email|uid>] \
 *     [--organization-id local-org] [--organization-name ローカル組織] \
 *     [--consultant-name 占い師] [--days 7]
 *
 * Example:
 *   make seed-local ADMIN=you@example.com
 */

import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { Role } from "../src/domain/authorization/role";
import { Consultant } from "../src/domain/consultant/consultant";
import { ConsultantProfile } from "../src/domain/consultant/consultant-profile";
import { PricePlan } from "../src/domain/price-plan/price-plan";
import { DEFAULT_CONSULTANT_STATUS_ID } from "../src/domain/settings/consultant-status";
import { Settings } from "../src/domain/settings/settings";
import { Slot } from "../src/domain/slot/slot";
import { TimeRange } from "../src/domain/slot/time-range";
import { getAccountDocId } from "../src/infrastructure/firestore/firestore-account-repository";
import { app, db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { FirestoreConsultantRepository } from "../src/infrastructure/firestore/firestore-consultant-repository";
import { FirestorePricePlanRepository } from "../src/infrastructure/firestore/firestore-price-plan-repository";
import { getRoleDocId } from "../src/infrastructure/firestore/firestore-role-repository";
import { FirestoreSettingsRepository } from "../src/infrastructure/firestore/firestore-settings-repository";
import { FirestoreSlotRepository } from "../src/infrastructure/firestore/firestore-slot-repository";

const DEFAULT_ORGANIZATION_ID = "local-org";
const DEFAULT_ORGANIZATION_NAME = "ローカル組織";
const DEFAULT_CONSULTANT_NAME = "ローカル占い師";
const DEFAULT_DAYS = 7;
const SLOT_OPEN_HOUR = 10;
const SLOT_CLOSE_HOUR = 17;
const SLOT_UNIT_MINUTES = 15;

interface SeedArgs {
  organizationId: string;
  organizationName: string;
  admin: string;
  consultant: string;
  consultantName: string;
  days: number;
}

function parseArgs(argv: string[]): SeedArgs {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current.startsWith("--")) {
      args[current.slice(2)] = argv[i + 1] ?? "";
      i += 1;
    }
  }

  const admin = args.admin?.trim();
  if (!admin) {
    throw new Error(
      "--admin <email|uid> は必須です（console にログインする Auth ユーザー）",
    );
  }

  const days = Number(args.days ?? DEFAULT_DAYS);
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("--days は 1 以上の整数で指定してください");
  }

  return {
    organizationId: args["organization-id"]?.trim() || DEFAULT_ORGANIZATION_ID,
    organizationName:
      args["organization-name"]?.trim() || DEFAULT_ORGANIZATION_NAME,
    admin,
    consultant: args.consultant?.trim() || admin,
    consultantName: args["consultant-name"]?.trim() || DEFAULT_CONSULTANT_NAME,
    days,
  };
}

/**
 * メールアドレスなら dev プロジェクトの Auth から UID を引く。UID ならそのまま使う。
 * Auth はエミュレートしていないため、ここで参照するのは本物の Auth。
 */
async function resolveAuthUid(identity: string): Promise<string> {
  if (!identity.includes("@")) {
    return identity;
  }

  const userRecord = await getAuth(app)
    .getUserByEmail(identity)
    .catch(() => null);

  if (!userRecord) {
    throw new Error(
      `Auth ユーザーが見つかりません: ${identity}\n` +
        "dev プロジェクトに存在するメールアドレスを渡すか、UID を直接指定してください。",
    );
  }

  return userRecord.uid;
}

async function seedOrganization(args: SeedArgs): Promise<void> {
  const now = Timestamp.now();
  await db
    .collection(FIRESTORE_COLLECTIONS.organizations)
    .doc(args.organizationId)
    .set({
      organizationId: args.organizationId,
      name: args.organizationName,
      createdAt: now,
      updatedAt: now,
    });

  await new FirestoreSettingsRepository().save(
    Settings.createDefault(args.organizationId),
  );
}

async function seedRoles(organizationId: string): Promise<void> {
  const roles = [
    Role.createSystemAdmin(organizationId),
    Role.createSystemOperator(organizationId),
  ];

  for (const role of roles) {
    await db
      .collection(FIRESTORE_COLLECTIONS.roles)
      .doc(getRoleDocId(organizationId, role.getRoleId()))
      .set({
        organizationId: role.getOrganizationId(),
        roleId: role.getRoleId(),
        name: role.getName(),
        description: role.getDescription(),
        isSystem: role.getIsSystem(),
        createdAt: role.getCreatedAt(),
        updatedAt: role.getUpdatedAt(),
      });
  }
}

async function seedAdminAccount(
  organizationId: string,
  adminUid: string,
): Promise<void> {
  const now = Timestamp.now();
  await db
    .collection(FIRESTORE_COLLECTIONS.accounts)
    .doc(getAccountDocId(organizationId, adminUid))
    .set({
      organizationId,
      accountId: adminUid,
      roleId: "admin",
      status: "active",
      name: "ローカル管理者",
      createdAt: now,
      updatedAt: now,
    });
}

async function seedConsultant(
  args: SeedArgs,
  consultantUid: string,
): Promise<void> {
  await new FirestoreConsultantRepository().save(
    Consultant.create({
      organizationId: args.organizationId,
      consultantId: consultantUid,
      profile: ConsultantProfile.create(
        args.consultantName,
        "ローカル開発用のダミープロフィールです。",
        ["恋愛", "仕事"],
        "090-0000-0000",
      ),
      statusId: DEFAULT_CONSULTANT_STATUS_ID,
    }),
  );
}

const PRICE_PLAN_SEEDS = [
  { suffix: "30", name: "お試し 30 分", totalJPY: 5000, durationMinutes: 30 },
  { suffix: "60", name: "じっくり 60 分", totalJPY: 9000, durationMinutes: 60 },
  {
    suffix: "90",
    name: "スペシャル 90 分",
    totalJPY: 13000,
    durationMinutes: 90,
  },
] as const;

async function seedPricePlans(
  organizationId: string,
  consultantUid: string,
): Promise<number> {
  const repository = new FirestorePricePlanRepository();

  for (const seed of PRICE_PLAN_SEEDS) {
    await repository.save(
      PricePlan.create({
        organizationId,
        consultantId: consultantUid,
        // 再実行で重複しないように決定的な ID にする（本番は UUID）
        pricePlanId: `${organizationId}_${consultantUid}_plan-${seed.suffix}`,
        name: seed.name,
        totalJPY: seed.totalJPY,
        durationMinutes: seed.durationMinutes,
      }),
    );
  }

  return PRICE_PLAN_SEEDS.length;
}

function createSlotStartTimes(days: number): Date[] {
  const startTimes: Date[] = [];
  const today = new Date();

  for (let dayOffset = 1; dayOffset <= days; dayOffset++) {
    for (let hour = SLOT_OPEN_HOUR; hour < SLOT_CLOSE_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_UNIT_MINUTES) {
        const startsAt = new Date(today);
        startsAt.setDate(startsAt.getDate() + dayOffset);
        startsAt.setHours(hour, minute, 0, 0);
        startTimes.push(startsAt);
      }
    }
  }

  return startTimes;
}

async function seedSlots(
  organizationId: string,
  consultantUid: string,
  days: number,
): Promise<number> {
  const repository = new FirestoreSlotRepository();
  const startTimes = createSlotStartTimes(days);

  for (const startsAt of startTimes) {
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + SLOT_UNIT_MINUTES);

    await repository.save(
      Slot.create({
        organizationId,
        // 再実行で重複しないように開始時刻から決定的な ID にする（本番は UUID）
        slotId: `${organizationId}_${consultantUid}_${startsAt.toISOString()}`,
        consultantId: consultantUid,
        timeRange: TimeRange.create(startsAt, endsAt),
      }),
    );
  }

  return startTimes.length;
}

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST が未設定です。このスクリプトはエミュレーター専用です。\n" +
        "pnpm emulator を起動し、.env.local に FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 を設定してください。",
    );
  }

  const args = parseArgs(process.argv.slice(2));
  const adminUid = await resolveAuthUid(args.admin);
  const consultantUid =
    args.consultant === args.admin
      ? adminUid
      : await resolveAuthUid(args.consultant);

  await seedOrganization(args);
  await seedRoles(args.organizationId);
  await seedAdminAccount(args.organizationId, adminUid);
  await seedConsultant(args, consultantUid);
  const pricePlanCount = await seedPricePlans(
    args.organizationId,
    consultantUid,
  );
  const slotCount = await seedSlots(
    args.organizationId,
    consultantUid,
    args.days,
  );

  console.log("シードデータを投入しました");
  console.log(`  organizationId: ${args.organizationId}`);
  console.log(`  organizationName: ${args.organizationName}`);
  console.log(`  adminUid: ${adminUid}`);
  console.log(`  consultantUid: ${consultantUid}`);
  console.log(`  pricePlans: ${pricePlanCount}`);
  console.log(`  slots: ${slotCount}（翌日から ${args.days} 日分）`);
  console.log("");
  console.log("次の URL で確認できます:");
  console.log(`  console: http://localhost:3020/${args.organizationId}`);
  console.log(`  consultant: http://localhost:3030/${args.organizationId}`);
  console.log(`  user: http://localhost:3010/${args.organizationId}`);
  console.log("");
  console.log("利用規約・キャンセルポリシーも必要なら以下を実行してください:");
  console.log(
    "  pnpm dlx tsx --env-file=apps/api/.env.local apps/api/scripts/seed-initial-policies.ts --only-org " +
      args.organizationId,
  );
}

main().catch((error) => {
  console.error("シードデータの投入に失敗しました:", error.message ?? error);
  process.exit(1);
});
