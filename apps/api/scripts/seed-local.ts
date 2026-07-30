/**
 * ローカルの Firestore エミュレーターに開発用のシードデータを一括投入する。
 *
 * 投入するもの:
 *   - organizations / settings（営業時間 05:00-04:00 + 例外日、ステータス 3 種、料金 5,000-20,000 円、会社情報）
 *   - roles（admin / operator）/ accounts（管理者 = 自分、招待中のオペレーター）
 *   - consultants（自分 + ダミー。1 人は非稼働）
 *   - price-plans（占い師ごとに 30 / 60 / 90 分）
 *   - slots（翌日から N 日分、10:00-17:00 の 15 分枠）
 *   - users / customers（apps/user の会員と顧客）
 *   - bookings / payments（確定・完了・キャンセル・仮予約の 4 状態 + 精算書用の先月分）
 *   - booking-ratings（完了済み予約への評価。console の占い師詳細で平均点・分布を確認できる）
 *   - appraisal-reports（鑑定書。発行済み 1 通 + 下書き 1 通）
 *   - coupons / user-coupons（初回登録特典 3 枚・90 日 / 誕生日 1 枚・30 日）
 *   - policy-revisions（利用者向け 3 種 + 占い師向け 2 種 × 旧版 / 現行の 2 版）
 *
 * Firebase Auth はエミュレートしないため、--admin / --consultant / --user には
 * **dev プロジェクトに実在する** Auth ユーザーのメールアドレスか UID を渡す。
 * このスクリプトは Auth を読むだけで、ユーザーの作成・変更は一切しない。
 *
 * 同じ引数で何度実行しても同じドキュメントを上書きするだけ（冪等）。
 *
 * Usage:
 *   pnpm dlx tsx --tsconfig apps/api/tsconfig.json --env-file=apps/api/.env.local apps/api/scripts/seed-local.ts \
 *     --admin <email|uid> [--consultant <email|uid>] [--user <email|uid>] \
 *     [--organization-id miraiyohou] [--organization-name ローカル組織] \
 *     [--consultant-name 占い師] [--days 7] [--consultants 4] [--customers 4]
 *
 * Example:
 *   make seed-local ADMIN=you@example.com
 */

import type { BusinessHoursProps } from "@mirai-yoho/shared/business-hours";
import type { SupportedDurationMinutes } from "@mirai-yoho/shared/slot-availability";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import {
  AppraisalReport,
  type AppraisalReportStatus,
} from "../src/domain/appraisal-report/appraisal-report";
import { AppraisalReportContent } from "../src/domain/appraisal-report/appraisal-report-content";
import { Role } from "../src/domain/authorization/role";
import { Booking } from "../src/domain/booking/booking";
import { BookingStatus } from "../src/domain/booking/booking-status";
import { CancelDeadline } from "../src/domain/booking/cancel-deadline";
import { ConsultantMemo } from "../src/domain/booking/consultant-memo";
import { ZoomUrl } from "../src/domain/booking/zoom-url";
import { BookingRating } from "../src/domain/booking-rating/booking-rating";
import { Consultant } from "../src/domain/consultant/consultant";
import { ConsultantProfile } from "../src/domain/consultant/consultant-profile";
import { Coupon } from "../src/domain/coupon/coupon";
import { Customer } from "../src/domain/customer/customer";
import { Money } from "../src/domain/payment/money";
import { Payment } from "../src/domain/payment/payment";
import { PaymentStatus } from "../src/domain/payment/payment-status";
import { PaymentStrategy } from "../src/domain/payment/payment-strategy";
import { PricePlan } from "../src/domain/price-plan/price-plan";
import { DEFAULT_CONSULTANT_STATUS_ID } from "../src/domain/settings/consultant-status";
import { Settings } from "../src/domain/settings/settings";
import { Slot } from "../src/domain/slot/slot";
import { TimeRange } from "../src/domain/slot/time-range";
import { BirthDate } from "../src/domain/user/birth-date";
import { User } from "../src/domain/user/user";
import { UserCoupon } from "../src/domain/user-coupon/user-coupon";
import { getAccountDocId } from "../src/infrastructure/firestore/firestore-account-repository";
import { FirestoreAppraisalReportRepository } from "../src/infrastructure/firestore/firestore-appraisal-report-repository";
import { FirestoreBookingRatingRepository } from "../src/infrastructure/firestore/firestore-booking-rating-repository";
import { FirestoreBookingRepository } from "../src/infrastructure/firestore/firestore-booking-repository";
import { app, db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { FirestoreConsultantRepository } from "../src/infrastructure/firestore/firestore-consultant-repository";
import { FirestoreCouponRepository } from "../src/infrastructure/firestore/firestore-coupon-repository";
import { FirestoreCustomerRepository } from "../src/infrastructure/firestore/firestore-customer-repository";
import { FirestorePaymentRepository } from "../src/infrastructure/firestore/firestore-payment-repository";
import { FirestorePricePlanRepository } from "../src/infrastructure/firestore/firestore-price-plan-repository";
import { getRoleDocId } from "../src/infrastructure/firestore/firestore-role-repository";
import { FirestoreSettingsRepository } from "../src/infrastructure/firestore/firestore-settings-repository";
import { FirestoreSlotRepository } from "../src/infrastructure/firestore/firestore-slot-repository";
import { FirestoreUserCouponRepository } from "../src/infrastructure/firestore/firestore-user-coupon-repository";
import { FirestoreUserRepository } from "../src/infrastructure/firestore/firestore-user-repository";
import { seedPolicies } from "./lib/seed-policies";

const DEFAULT_ORGANIZATION_ID = "miraiyohou";
const DEFAULT_ORGANIZATION_NAME = "ローカル組織";
const DEFAULT_CONSULTANT_NAME = "ローカル占い師";
const DEFAULT_DAYS = 7;
// 自分 + ダミー 3 人（稼働 2 / 非稼働 1）が既定
const DEFAULT_CONSULTANT_COUNT = 4;
const DEFAULT_CUSTOMER_COUNT = 4;

const SLOT_OPEN_HOUR = 10;
const SLOT_CLOSE_HOUR = 17;
const SLOT_UNIT_MINUTES = 15;
const SLOT_UNIT_MS = SLOT_UNIT_MINUTES * 60 * 1000;
const BUFFER_SLOT_COUNT = 1;
const TAX_RATE = 0.1;
const DAY_MS = 24 * 60 * 60 * 1000;
// 文書は 2 版入れる（旧版 = archived、現行 = published）。
// 施行日が未来だと findLatestPublished が空になり予約フローの同意チェックが通らないため、
// どちらも過去日にする（seed-initial-policies.ts の既定日とは別）
const OLD_POLICY_VERSION = "2025-07-01";
const POLICY_VERSION = "2026-01-01";
const OLD_POLICY_EFFECTIVE_FROM = `${OLD_POLICY_VERSION}T00:00:00+09:00`;
const POLICY_EFFECTIVE_FROM = `${POLICY_VERSION}T00:00:00+09:00`;

// 営業時間は毎日 05:00-04:00（翌日）。営業日は 05:00 起点なので 1 日ぶんに近い枠になる
const BUSINESS_HOURS_START_TIME = "05:00";
const BUSINESS_HOURS_END_TIME = "04:00";
// 例外日（休業）は実行日の 3 日後
const BUSINESS_HOURS_EXCEPTION_DAY_OFFSET = 3;
// 料金設定の下限・上限（画面の表記は 20,000 〜 5,000 だが、domain は min <= max）
const PRICE_PLAN_RANGE = { minTotalJPY: 5000, maxTotalJPY: 20000 };

// Low を既定にする。domain が statusId "standard" の存在を必須にしているため、
// Low に "standard" を割り当てる（DEFAULT_CONSULTANT_STATUS_ID）
const STATUS_ID_HIGH = "high";
const STATUS_ID_MIDDLE = "middle";
const STATUS_ID_LOW = DEFAULT_CONSULTANT_STATUS_ID;
// 料率は精算書のシステム利用料に使う。3 段階すべてを確認できるよう 40/35/30 を割り当てる
const CONSULTANT_STATUSES = [
  {
    statusId: STATUS_ID_HIGH,
    name: "ステータス Hight",
    settlementRatePercent: 40,
  },
  {
    statusId: STATUS_ID_MIDDLE,
    name: "ステータス Middle",
    settlementRatePercent: 35,
  },
  {
    statusId: STATUS_ID_LOW,
    name: "ステータス Low",
    settlementRatePercent: 30,
  },
];

// 精算書の宛先と、事務所を住所として利用する占い師の発行者住所に使う
const COMPANY_INFO = {
  companyName: "みらい予報株式会社",
  address: "〒473-0901 愛知県豊田市御幸本町2丁目205-8",
  officeAddress: "〒473-0901 愛知県豊田市御幸本町2丁目205-8",
};

interface SeedArgs {
  organizationId: string;
  organizationName: string;
  admin: string;
  consultant: string;
  user: string;
  consultantName: string;
  days: number;
  consultantCount: number;
  customerCount: number;
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  label: string,
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} は 1 以上の整数で指定してください`);
  }
  return parsed;
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

  return {
    organizationId: args["organization-id"]?.trim() || DEFAULT_ORGANIZATION_ID,
    organizationName:
      args["organization-name"]?.trim() || DEFAULT_ORGANIZATION_NAME,
    admin,
    consultant: args.consultant?.trim() || admin,
    user: args.user?.trim() || admin,
    consultantName: args["consultant-name"]?.trim() || DEFAULT_CONSULTANT_NAME,
    days: parsePositiveInt(args.days, DEFAULT_DAYS, "--days"),
    consultantCount: parsePositiveInt(
      args.consultants,
      DEFAULT_CONSULTANT_COUNT,
      "--consultants",
    ),
    customerCount: parsePositiveInt(
      args.customers,
      DEFAULT_CUSTOMER_COUNT,
      "--customers",
    ),
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

// ---------------------------------------------------------------------------
// シードの素材（占い師 / 料金プラン / 顧客）
// ---------------------------------------------------------------------------

interface ConsultantSeed {
  consultantId: string;
  name: string;
  bio: string;
  specialties: string[];
  statusId: string;
  isActive: boolean;
}

const DUMMY_CONSULTANTS = [
  {
    name: "星野 みちる",
    bio: "西洋占星術とタロットで、恋愛と対人関係のご相談を中心に承ります。",
    specialties: ["恋愛", "対人関係", "タロット"],
    statusId: STATUS_ID_HIGH,
    isActive: true,
  },
  {
    name: "月城 あかり",
    bio: "四柱推命をベースに、仕事とキャリアの転機を読み解きます。",
    specialties: ["仕事", "キャリア", "四柱推命"],
    statusId: STATUS_ID_MIDDLE,
    isActive: true,
  },
  {
    name: "日向 そら",
    bio: "現在は活動を休止しています（非稼働の表示確認用）。",
    specialties: ["家族"],
    statusId: STATUS_ID_LOW,
    isActive: false,
  },
];

function buildConsultantSeeds(
  args: SeedArgs,
  consultantUid: string,
): ConsultantSeed[] {
  const seeds: ConsultantSeed[] = [
    {
      consultantId: consultantUid,
      name: args.consultantName,
      bio: "ログイン確認用の占い師です。consultant アプリにこの UID でログインできます。",
      specialties: ["恋愛", "仕事"],
      statusId: STATUS_ID_LOW,
      isActive: true,
    },
  ];

  for (let index = 0; index < args.consultantCount - 1; index++) {
    const dummy = DUMMY_CONSULTANTS[index % DUMMY_CONSULTANTS.length];
    seeds.push({ consultantId: `seed-consultant-${index + 2}`, ...dummy });
  }

  return seeds;
}

interface PricePlanSeed {
  pricePlanId: string;
  name: string;
  totalJPY: number;
  durationMinutes: SupportedDurationMinutes;
}

const PRICE_PLAN_TEMPLATES: Array<{
  suffix: string;
  name: string;
  totalJPY: number;
  durationMinutes: SupportedDurationMinutes;
}> = [
  { suffix: "30", name: "お試し 30 分", totalJPY: 5000, durationMinutes: 30 },
  { suffix: "60", name: "じっくり 60 分", totalJPY: 9000, durationMinutes: 60 },
  {
    suffix: "90",
    name: "スペシャル 90 分",
    totalJPY: 13000,
    durationMinutes: 90,
  },
];

function buildPricePlanSeeds(
  organizationId: string,
  consultantId: string,
  index: number,
): PricePlanSeed[] {
  // 占い師ごとに金額をずらして、一覧の見え方に差を出す
  const priceOffset = index * 1000;
  return PRICE_PLAN_TEMPLATES.map((template) => ({
    pricePlanId: `${organizationId}_${consultantId}_plan-${template.suffix}`,
    name: template.name,
    totalJPY: template.totalJPY + priceOffset,
    durationMinutes: template.durationMinutes,
  }));
}

interface CustomerSeed {
  customerId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
}

const DUMMY_CUSTOMER_PROFILES = [
  { name: "佐藤 陽菜", birthDate: "1992-04-18" },
  { name: "田中 一郎", birthDate: "1985-11-03" },
  { name: "鈴木 美咲", birthDate: "1998-07-25" },
  { name: "高橋 健", birthDate: "1979-01-09" },
];

function buildCustomerSeeds(args: SeedArgs, userUid: string): CustomerSeed[] {
  const seeds: CustomerSeed[] = [
    {
      customerId: `${args.organizationId}_customer-1`,
      userId: userUid,
      name: "ローカル利用者",
      email: "local-user@example.com",
      phone: "090-1111-2222",
      birthDate: "1990-05-15",
    },
  ];

  for (let index = 0; index < args.customerCount - 1; index++) {
    const profile =
      DUMMY_CUSTOMER_PROFILES[index % DUMMY_CUSTOMER_PROFILES.length];
    const suffix = index + 2;
    seeds.push({
      customerId: `${args.organizationId}_customer-${suffix}`,
      userId: `seed-user-${suffix}`,
      name: profile.name,
      email: `customer${suffix}@example.com`,
      phone: `090-0000-${String(1000 + suffix).slice(-4)}`,
      birthDate: profile.birthDate,
    });
  }

  return seeds;
}

// ---------------------------------------------------------------------------
// 組織 / ロール / アカウント
// ---------------------------------------------------------------------------

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

  const settings = Settings.createDefault(args.organizationId);
  settings.updateBusinessHours(buildBusinessHours());
  settings.updateConsultantStatuses(CONSULTANT_STATUSES, STATUS_ID_LOW);
  settings.updatePricePlanRange(PRICE_PLAN_RANGE);
  settings.updateCompanyInfo(COMPANY_INFO);
  await new FirestoreSettingsRepository().save(settings);
}

/** 毎日 05:00-04:00 稼働。例外日として実行日の 3 日後を休業にする */
function buildBusinessHours(): BusinessHoursProps {
  const weekly = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    timeWindows: [
      {
        startTime: BUSINESS_HOURS_START_TIME,
        endTime: BUSINESS_HOURS_END_TIME,
      },
    ],
  }));

  const exceptionDate = new Date();
  exceptionDate.setDate(
    exceptionDate.getDate() + BUSINESS_HOURS_EXCEPTION_DAY_OFFSET,
  );
  const exceptionDay = toDateString(exceptionDate);

  return {
    weekly,
    includePublicHolidays: true,
    exceptions: [
      {
        startDate: exceptionDay,
        endDate: exceptionDay,
        isClosed: true,
        timeWindows: [],
      },
    ],
  };
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

async function seedAccounts(
  organizationId: string,
  adminUid: string,
): Promise<void> {
  const now = Timestamp.now();
  const accounts = [
    {
      accountId: adminUid,
      roleId: "admin",
      status: "active",
      name: "ローカル管理者",
    },
    // 招待中の行を 1 件作り、アカウント管理画面のステータス表示を確認できるようにする
    {
      accountId: "seed-operator",
      roleId: "operator",
      status: "invited",
      name: "ローカルオペレーター",
    },
  ];

  for (const account of accounts) {
    await db
      .collection(FIRESTORE_COLLECTIONS.accounts)
      .doc(getAccountDocId(organizationId, account.accountId))
      .set({
        organizationId,
        ...account,
        createdAt: now,
        updatedAt: now,
      });
  }
}

// ---------------------------------------------------------------------------
// 占い師 / 料金プラン / 空き枠
// ---------------------------------------------------------------------------

async function seedConsultants(
  organizationId: string,
  seeds: ConsultantSeed[],
): Promise<void> {
  const repository = new FirestoreConsultantRepository();

  for (const seed of seeds) {
    const consultant = Consultant.create({
      organizationId,
      consultantId: seed.consultantId,
      profile: ConsultantProfile.create(
        seed.name,
        seed.bio,
        seed.specialties,
        "090-0000-0000",
      ),
      statusId: seed.statusId,
    });
    if (!seed.isActive) {
      consultant.deactivate();
    }
    await repository.save(consultant);
  }
}

async function seedPricePlans(
  organizationId: string,
  seeds: ConsultantSeed[],
): Promise<number> {
  const repository = new FirestorePricePlanRepository();
  let count = 0;

  for (const [index, seed] of seeds.entries()) {
    for (const plan of buildPricePlanSeeds(
      organizationId,
      seed.consultantId,
      index,
    )) {
      await repository.save(
        PricePlan.create({
          organizationId,
          consultantId: seed.consultantId,
          ...plan,
        }),
      );
      count += 1;
    }
  }

  return count;
}

/** 再実行で重複しないように、開始時刻から決定的な ID を振る（本番は UUID） */
function toSlotId(
  organizationId: string,
  consultantId: string,
  startsAt: Date,
): string {
  return `${organizationId}_${consultantId}_${startsAt.toISOString()}`;
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
  seeds: ConsultantSeed[],
  days: number,
): Promise<number> {
  const repository = new FirestoreSlotRepository();
  const startTimes = createSlotStartTimes(days);
  let count = 0;

  for (const seed of seeds.filter((candidate) => candidate.isActive)) {
    for (const startsAt of startTimes) {
      const endsAt = new Date(startsAt.getTime() + SLOT_UNIT_MS);
      await repository.save(
        Slot.create({
          organizationId,
          slotId: toSlotId(organizationId, seed.consultantId, startsAt),
          consultantId: seed.consultantId,
          timeRange: TimeRange.create(startsAt, endsAt),
        }),
      );
      count += 1;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// 会員 / 顧客
// ---------------------------------------------------------------------------

async function seedUsersAndCustomers(
  organizationId: string,
  seeds: CustomerSeed[],
): Promise<void> {
  const userRepository = new FirestoreUserRepository();
  const customerRepository = new FirestoreCustomerRepository();
  const now = new Date();

  for (const seed of seeds) {
    await userRepository.save(
      User.createAnonymous({
        userId: seed.userId,
        authUid: seed.userId,
        displayName: seed.name,
        primaryEmail: seed.email,
        phoneNumber: seed.phone,
        birthDate: BirthDate.create(seed.birthDate, now),
      }),
    );

    await customerRepository.save(
      Customer.create({
        organizationId,
        customerId: seed.customerId,
        userId: seed.userId,
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        birthDate: seed.birthDate,
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// クーポン
// ---------------------------------------------------------------------------

const WELCOME_COUPON_NAME = "初回登録特典クーポン";
const WELCOME_COUPON_BATCH_SIZE = 3;
const WELCOME_COUPON_EXPIRES_IN_DAYS = 90;
const BIRTHDAY_COUPON_NAME = "誕生日クーポン";
const BIRTHDAY_COUPON_BATCH_SIZE = 1;
const BIRTHDAY_COUPON_EXPIRES_IN_DAYS = 30;

interface SeededCoupons {
  redeemedUserCouponId: string;
  welcomeCouponId: string;
  welcomeAmountJPY: number;
}

async function seedCoupons(
  organizationId: string,
  userId: string,
): Promise<SeededCoupons> {
  const couponRepository = new FirestoreCouponRepository();
  const userCouponRepository = new FirestoreUserCouponRepository();
  const now = new Date();

  const welcome = Coupon.create({
    organizationId,
    couponId: `${organizationId}_coupon-welcome`,
    type: "welcome",
    name: WELCOME_COUPON_NAME,
    amountJPY: 1000,
    batchSize: WELCOME_COUPON_BATCH_SIZE,
    expiresInDays: WELCOME_COUPON_EXPIRES_IN_DAYS,
  });
  const birthday = Coupon.create({
    organizationId,
    couponId: `${organizationId}_coupon-birthday`,
    type: "birthday",
    name: BIRTHDAY_COUPON_NAME,
    amountJPY: 2000,
    batchSize: BIRTHDAY_COUPON_BATCH_SIZE,
    expiresInDays: BIRTHDAY_COUPON_EXPIRES_IN_DAYS,
  });

  await couponRepository.save(welcome);
  await couponRepository.save(birthday);

  // 初回登録特典は 1 回の取得で batchSize 枚もらえる。1 枚は後段の予約で使用済みにするので、
  // 残りを未使用として発行する
  for (let index = 0; index < WELCOME_COUPON_BATCH_SIZE - 1; index++) {
    await userCouponRepository.save(
      UserCoupon.reconstruct({
        userCouponId: `${organizationId}_${userId}_welcome-unused-${index + 1}`,
        userId,
        couponId: welcome.getCouponId(),
        organizationId,
        amountJPY: welcome.getAmountJPY(),
        couponName: welcome.getName(),
        type: "welcome",
        receivedAt: now,
        expiresAt: new Date(
          now.getTime() + WELCOME_COUPON_EXPIRES_IN_DAYS * DAY_MS,
        ),
      }),
    );
  }

  // 期限切れ（誕生日クーポンは 1 枚・30 日）
  await userCouponRepository.save(
    UserCoupon.reconstruct({
      userCouponId: `${organizationId}_${userId}_birthday-expired`,
      userId,
      couponId: birthday.getCouponId(),
      organizationId,
      amountJPY: birthday.getAmountJPY(),
      couponName: birthday.getName(),
      type: "birthday",
      receivedAt: new Date(
        now.getTime() - (BIRTHDAY_COUPON_EXPIRES_IN_DAYS + 30) * DAY_MS,
      ),
      expiresAt: new Date(now.getTime() - 30 * DAY_MS),
    }),
  );

  // 使用済みは予約 ID が要るので、予約を作ってから書き込む
  return {
    redeemedUserCouponId: `${organizationId}_${userId}_welcome-redeemed`,
    welcomeCouponId: welcome.getCouponId(),
    welcomeAmountJPY: welcome.getAmountJPY(),
  };
}

async function seedRedeemedUserCoupon(params: {
  organizationId: string;
  userId: string;
  coupons: SeededCoupons;
  bookingId: string;
  redeemedAt: Date;
}): Promise<void> {
  await new FirestoreUserCouponRepository().save(
    UserCoupon.reconstruct({
      userCouponId: params.coupons.redeemedUserCouponId,
      userId: params.userId,
      couponId: params.coupons.welcomeCouponId,
      organizationId: params.organizationId,
      amountJPY: params.coupons.welcomeAmountJPY,
      couponName: WELCOME_COUPON_NAME,
      type: "welcome",
      receivedAt: new Date(params.redeemedAt.getTime() - 10 * DAY_MS),
      expiresAt: new Date(
        params.redeemedAt.getTime() +
          (WELCOME_COUPON_EXPIRES_IN_DAYS - 10) * DAY_MS,
      ),
      redeemedAt: params.redeemedAt,
      redeemedBookingId: params.bookingId,
    }),
  );
}

// ---------------------------------------------------------------------------
// 予約 / 決済
// ---------------------------------------------------------------------------

type SeedBookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface BookingScenarioBase {
  consultant: ConsultantSeed;
  customer: CustomerSeed;
  pricePlan: PricePlanSeed;
  status: SeedBookingStatus;
  withMemo?: boolean;
  withCoupon?: boolean;
  /** 完了済み予約に付ける評価。console の占い師詳細で確認する */
  rating?: { score: number; comment?: string };
  /** 鑑定書。未指定なら未作成。published のみ apps/user から見える */
  appraisalReport?: AppraisalReportStatus;
}

/**
 * 開始日時は「今日からの相対日数」か「絶対日時」のどちらかで指定する。
 * 精算書は既定で先月を集計するため、対象月を固定したいシナリオは startsAt を使う
 */
type BookingScenario = BookingScenarioBase &
  (
    | {
        /** 今日からの日数。負値は過去 */
        dayOffset: number;
        hour: number;
      }
    | { startsAt: Date }
  );

function toBookingStartsAt(dayOffset: number, hour: number): Date {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + dayOffset);
  startsAt.setHours(hour, 0, 0, 0);
  return startsAt;
}

function resolveScenarioStartsAt(scenario: BookingScenario): Date {
  return "startsAt" in scenario
    ? scenario.startsAt
    : toBookingStartsAt(scenario.dayOffset, scenario.hour);
}

/**
 * 先月の指定日・指定時刻を返す。
 * 精算書画面の既定が「先月」なので、実行日に関わらず必ず対象月に入るようにする。
 * 2 月でも存在するよう day は 28 以下で呼ぶこと。
 */
function toPreviousMonthStartsAt(day: number, hour: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, day, hour, 0, 0, 0);
}

function buildBookingScenarios(
  organizationId: string,
  consultants: ConsultantSeed[],
  customers: CustomerSeed[],
): BookingScenario[] {
  const plansOf = (consultant: ConsultantSeed) =>
    buildPricePlanSeeds(
      organizationId,
      consultant.consultantId,
      consultants.indexOf(consultant),
    );

  const activeConsultants = consultants.filter(
    (candidate) => candidate.isActive,
  );
  const own = activeConsultants[0];
  const ownPlans = plansOf(own);
  const customerAt = (index: number) => customers[index % customers.length];

  const scenarios: BookingScenario[] = [
    // 会員が「未評価」バッジと評価導線を確認するための完了済み予約（あえて評価を付けない）
    {
      consultant: own,
      customer: customerAt(0),
      pricePlan: ownPlans[1],
      dayOffset: -7,
      hour: 14,
      status: "completed",
      withMemo: true,
      withCoupon: true,
      appraisalReport: "published",
    },
    // 会員が「評価済み」バッジと読み取り専用表示を確認するための評価済み予約
    {
      consultant: own,
      customer: customerAt(0),
      pricePlan: ownPlans[0],
      dayOffset: -14,
      hour: 10,
      status: "completed",
      withMemo: true,
      rating: {
        score: 5,
        comment:
          "とても丁寧に話を聞いていただき、気持ちが軽くなりました。また相談したいです。",
      },
    },
    // console の占い師詳細で平均点とスコア分布が散らばって見えるようにする
    {
      consultant: own,
      customer: customerAt(1),
      pricePlan: ownPlans[0],
      dayOffset: -10,
      hour: 16,
      status: "completed",
      rating: { score: 4, comment: "的確なアドバイスをいただけました。" },
    },
    {
      consultant: own,
      customer: customerAt(2),
      pricePlan: ownPlans[1],
      dayOffset: -5,
      hour: 13,
      status: "completed",
      // 低評価もダッシュボード上で確認できるようにコメントなしで 1 件入れる
      rating: { score: 2 },
    },
    {
      consultant: own,
      customer: customerAt(1),
      pricePlan: ownPlans[0],
      dayOffset: -3,
      hour: 11,
      status: "cancelled",
    },
    // 鑑定書の下書き。apps/user には出ず、占い師の予約一覧でだけ「下書き」になる。
    // completed にしないのは、月初に実行したときこの予約が先月分に入って
    // 精算書の借受金を動かしてしまうため。鑑定書の発行条件は status ではなく
    // 「endsAt を過ぎている / 未キャンセル」なので confirmed のままでも作成できる
    {
      consultant: own,
      customer: customerAt(0),
      pricePlan: ownPlans[0],
      dayOffset: -1,
      hour: 10,
      status: "confirmed",
      withMemo: true,
      appraisalReport: "draft",
    },
    {
      consultant: own,
      customer: customerAt(0),
      pricePlan: ownPlans[0],
      dayOffset: 1,
      hour: 11,
      status: "confirmed",
    },
    {
      consultant: own,
      customer: customerAt(2),
      pricePlan: ownPlans[2],
      dayOffset: 2,
      hour: 15,
      status: "pending",
    },
  ];

  // 精算書（先月分）の明細用。既定の対象月が「先月」なので実行日に依存しない日付で固定する。
  // completed = charged だけが借受金に計上され、cancelled と confirmed は除外されることを確認できる
  scenarios.push(
    {
      consultant: own,
      customer: customerAt(0),
      pricePlan: ownPlans[0],
      startsAt: toPreviousMonthStartsAt(5, 11),
      status: "completed",
      withMemo: true,
    },
    {
      consultant: own,
      customer: customerAt(1),
      pricePlan: ownPlans[1],
      startsAt: toPreviousMonthStartsAt(12, 14),
      status: "completed",
      withMemo: true,
    },
    {
      consultant: own,
      customer: customerAt(2),
      pricePlan: ownPlans[2],
      startsAt: toPreviousMonthStartsAt(19, 16),
      status: "completed",
      withMemo: true,
    },
    // 以下 2 件は同じ先月でも精算対象外（キャンセル / 未課金）
    {
      consultant: own,
      customer: customerAt(3),
      pricePlan: ownPlans[0],
      startsAt: toPreviousMonthStartsAt(22, 13),
      status: "cancelled",
    },
    {
      consultant: own,
      customer: customerAt(0),
      pricePlan: ownPlans[1],
      startsAt: toPreviousMonthStartsAt(26, 10),
      status: "confirmed",
    },
  );

  for (const [index, consultant] of activeConsultants.slice(1).entries()) {
    const plans = plansOf(consultant);
    scenarios.push(
      {
        consultant,
        customer: customerAt(index + 1),
        pricePlan: plans[1],
        // 営業時間の例外日（休業）と重ならないよう 4 日後以降にする
        dayOffset: BUSINESS_HOURS_EXCEPTION_DAY_OFFSET + 1 + index,
        hour: 13,
        status: "confirmed",
      },
      {
        consultant,
        customer: customerAt(index + 2),
        pricePlan: plans[0],
        dayOffset: -(index + 2),
        hour: 16,
        status: "completed",
        withMemo: true,
        rating: {
          score: 3 + (index % 3),
          comment: "落ち着いて相談できました。",
        },
      },
    );
  }

  return scenarios;
}

/**
 * 予約が占有する枠（利用枠 + 後続のバッファ枠）を予約済みにする。
 * キャンセル済みの予約では空きに戻す。過去の枠は seedSlots が作らないのでここで作る。
 */
async function occupySlots(params: {
  organizationId: string;
  consultantId: string;
  startsAt: Date;
  durationMinutes: number;
  bookingId: string;
  release: boolean;
}): Promise<{ usageSlotIds: string[]; bufferSlotIds: string[] }> {
  const repository = new FirestoreSlotRepository();
  const usageCount = params.durationMinutes / SLOT_UNIT_MINUTES;
  const usageSlotIds: string[] = [];
  const bufferSlotIds: string[] = [];

  for (let index = 0; index < usageCount + BUFFER_SLOT_COUNT; index++) {
    const startsAt = new Date(params.startsAt.getTime() + index * SLOT_UNIT_MS);
    const endsAt = new Date(startsAt.getTime() + SLOT_UNIT_MS);
    const slotId = toSlotId(
      params.organizationId,
      params.consultantId,
      startsAt,
    );

    await repository.save(
      Slot.reconstruct({
        organizationId: params.organizationId,
        slotId,
        consultantId: params.consultantId,
        timeRange: TimeRange.reconstruct(startsAt, endsAt),
        bookingId: params.release ? undefined : params.bookingId,
        isAvailable: params.release,
      }),
    );

    if (index < usageCount) {
      usageSlotIds.push(slotId);
    } else {
      bufferSlotIds.push(slotId);
    }
  }

  return { usageSlotIds, bufferSlotIds };
}

function toPaymentStatus(status: SeedBookingStatus): string {
  if (status === "completed") return "charged";
  if (status === "cancelled") return "cancelled";
  if (status === "confirmed") return "setup_complete";
  return "setup_pending";
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Zoom URL / Stripe ID のダミー値を決定的に作るための簡易ハッシュ */
function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function seedBooking(
  organizationId: string,
  scenario: BookingScenario,
  coupons: SeededCoupons,
): Promise<string> {
  const startsAt = resolveScenarioStartsAt(scenario);
  const endsAt = new Date(
    startsAt.getTime() + scenario.pricePlan.durationMinutes * 60 * 1000,
  );
  // 再実行で重複しないように決定的な ID にする（本番は UUID）
  const bookingId = `${organizationId}_${scenario.consultant.consultantId}_${startsAt.toISOString()}`;

  const { usageSlotIds, bufferSlotIds } = await occupySlots({
    organizationId,
    consultantId: scenario.consultant.consultantId,
    startsAt,
    durationMinutes: scenario.pricePlan.durationMinutes,
    bookingId,
    release: scenario.status === "cancelled",
  });

  const totalJPY = scenario.pricePlan.totalJPY;
  const discountJPY = scenario.withCoupon ? coupons.welcomeAmountJPY : 0;
  const discountedTotalJPY = Math.max(0, totalJPY - discountJPY);

  const booking = Booking.reconstruct({
    organizationId,
    bookingId,
    customerId: scenario.customer.customerId,
    consultantId: scenario.consultant.consultantId,
    usageSlotIds,
    bufferSlotIds,
    startsAt,
    endsAt,
    durationMinutes: scenario.pricePlan.durationMinutes,
    status: BookingStatus.reconstruct(scenario.status),
    cancelDeadlineAt: CancelDeadline.create(startsAt),
    joinUrl:
      scenario.status === "pending"
        ? undefined
        : ZoomUrl.reconstruct(
            `https://example.zoom.us/j/${hashCode(bookingId)}`,
          ),
    consultantJoinedAt:
      scenario.status === "completed" ? new Date(startsAt) : undefined,
    consultantMemo: scenario.withMemo
      ? ConsultantMemo.reconstruct({
          customerName: scenario.customer.name,
          birthDate: scenario.customer.birthDate,
          appraisalDate: toDateString(startsAt),
          freeMemo: "ローカル確認用のメモです。鑑定結果の記録が表示されます。",
        })
      : ConsultantMemo.empty(),
    consultationContent:
      "ローカル確認用の相談内容です。今後のキャリアについて相談したいです。",
    pricePlanId: scenario.pricePlan.pricePlanId,
    pricePlanName: scenario.pricePlan.name,
    pricePlanTotalJPY: totalJPY,
    appliedUserCouponId: scenario.withCoupon
      ? coupons.redeemedUserCouponId
      : undefined,
    couponDiscountJPY: scenario.withCoupon ? discountJPY : undefined,
    discountedTotalJPY: scenario.withCoupon ? discountedTotalJPY : undefined,
    agreedTermsVersion: POLICY_VERSION,
    agreedCancellationPolicyVersion: POLICY_VERSION,
    agreedAt: new Date(startsAt.getTime() - DAY_MS),
    createdAt: new Date(startsAt.getTime() - 3 * DAY_MS),
    updatedAt: new Date(startsAt.getTime() - DAY_MS),
  });

  await new FirestoreBookingRepository().save(booking);

  await new FirestorePaymentRepository().save(
    Payment.reconstruct({
      organizationId,
      paymentId: `${bookingId}_payment`,
      bookingId,
      customerId: scenario.customer.customerId,
      money: Money.fromTaxIncluded(discountedTotalJPY, TAX_RATE),
      status: PaymentStatus.reconstruct(toPaymentStatus(scenario.status)),
      paymentStrategy: PaymentStrategy.reconstruct("deferred"),
      stripeSetupIntentId: `seti_seed_${hashCode(bookingId)}`,
      createdAt: new Date(startsAt.getTime() - 3 * DAY_MS),
      updatedAt: new Date(startsAt.getTime() - DAY_MS),
    }),
  );

  if (scenario.rating) {
    await seedBookingRating({
      organizationId,
      bookingId,
      scenario,
      startsAt,
      endsAt,
    });
  }

  return bookingId;
}

/**
 * 完了済み予約への評価を投入する。
 *
 * BookingRating は「提出後は編集不可」の仕様のため Repository が create() しか公開しておらず、
 * 2 回目以降の実行では ALREADY_EXISTS になる。シードは冪等であるべきなので、
 * 先に doc を消してから作り直す（存在しない doc の delete は no-op）。
 */
async function seedBookingRating(params: {
  organizationId: string;
  bookingId: string;
  scenario: BookingScenario;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  const { organizationId, bookingId, scenario, startsAt, endsAt } = params;
  if (!scenario.rating) return;

  await db
    .collection(FIRESTORE_COLLECTIONS.bookingRatings)
    .doc(bookingId)
    .delete();

  await new FirestoreBookingRatingRepository().create(
    BookingRating.create({
      organizationId,
      bookingId,
      consultantId: scenario.consultant.consultantId,
      customerId: scenario.customer.customerId,
      score: scenario.rating.score,
      comment: scenario.rating.comment,
      consultedAt: startsAt,
      // 鑑定終了の 1 時間後に評価したことにする
      ratedAt: new Date(endsAt.getTime() + 60 * 60 * 1000),
    }),
  );
}

// ---------------------------------------------------------------------------
// 鑑定書
// ---------------------------------------------------------------------------

async function seedAppraisalReport(
  organizationId: string,
  scenario: BookingScenario,
  bookingId: string,
): Promise<void> {
  const status = scenario.appraisalReport;
  if (!status) return;

  const startsAt = resolveScenarioStartsAt(scenario);
  // 鑑定の翌日に書き上げた想定
  const writtenAt = new Date(startsAt.getTime() + DAY_MS);
  const appraisalDate = toDateString(startsAt);
  const isPublished = status === "published";

  await new FirestoreAppraisalReportRepository().save(
    AppraisalReport.reconstruct({
      // 再実行で重複しないように決定的な ID にする（本番は UUID）
      reportId: `${bookingId}_report`,
      organizationId,
      bookingId,
      consultantId: scenario.consultant.consultantId,
      customerId: scenario.customer.customerId,
      content: AppraisalReportContent.reconstruct({
        title: `${appraisalDate} の鑑定書`,
        customerName: scenario.customer.name,
        birthDate: scenario.customer.birthDate,
        appraisalDate,
        theme: "今後のキャリアと転職のタイミングについて",
        currentSituation:
          "現在は現職に留まるか転職するかで迷われている時期です。周囲との比較で焦りが出やすい配置が出ています。",
        result: isPublished
          ? "秋以降に流れが大きく変わります。特に 10 月から 12 月にかけて新しい縁がつながりやすく、この時期の行動が来年の土台になります。"
          : "（下書き）秋以降に流れが変わる見込みです。ここから清書します。",
        luckyAction: isPublished
          ? "朝の散歩を習慣にし、月に一度は行ったことのない場所に足を運んでください。"
          : "",
        summary: isPublished
          ? "焦らず準備を進めることが、そのまま次の機会につながります。"
          : "",
      }),
      status,
      publishedAt: isPublished ? writtenAt : null,
      createdAt: writtenAt,
      updatedAt: writtenAt,
    }),
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

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
  const userUid =
    args.user === args.admin ? adminUid : await resolveAuthUid(args.user);

  const consultants = buildConsultantSeeds(args, consultantUid);
  const customers = buildCustomerSeeds(args, userUid);

  await seedOrganization(args);
  await seedRoles(args.organizationId);
  await seedAccounts(args.organizationId, adminUid);
  await seedConsultants(args.organizationId, consultants);
  const pricePlanCount = await seedPricePlans(args.organizationId, consultants);
  const slotCount = await seedSlots(
    args.organizationId,
    consultants,
    args.days,
  );
  await seedUsersAndCustomers(args.organizationId, customers);
  const coupons = await seedCoupons(args.organizationId, userUid);

  const scenarios = buildBookingScenarios(
    args.organizationId,
    consultants,
    customers,
  );
  const bookingIds: string[] = [];
  for (const scenario of scenarios) {
    const bookingId = await seedBooking(args.organizationId, scenario, coupons);
    bookingIds.push(bookingId);
    await seedAppraisalReport(args.organizationId, scenario, bookingId);
  }
  const publishedReportCount = scenarios.filter(
    (scenario) => scenario.appraisalReport === "published",
  ).length;
  const draftReportCount = scenarios.filter(
    (scenario) => scenario.appraisalReport === "draft",
  ).length;

  const ratedScenarioCount = scenarios.filter(
    (scenario) => scenario.rating,
  ).length;

  const couponScenarioIndex = scenarios.findIndex(
    (scenario) => scenario.withCoupon,
  );
  if (couponScenarioIndex >= 0) {
    const scenario = scenarios[couponScenarioIndex];
    await seedRedeemedUserCoupon({
      organizationId: args.organizationId,
      userId: userUid,
      coupons,
      bookingId: bookingIds[couponScenarioIndex],
      redeemedAt: resolveScenarioStartsAt(scenario),
    });
  }

  const policyResults = await seedPolicies({
    organizationIds: [args.organizationId],
    versions: [
      {
        version: OLD_POLICY_VERSION,
        effectiveFrom: new Date(OLD_POLICY_EFFECTIVE_FROM),
        status: "archived",
        archivedAt: new Date(POLICY_EFFECTIVE_FROM),
        note: `※ この版は旧版です（${POLICY_VERSION} 版に置き換えられました）。`,
      },
      {
        version: POLICY_VERSION,
        effectiveFrom: new Date(POLICY_EFFECTIVE_FROM),
        status: "published",
      },
    ],
    createdBy: "seed-local",
    // 改版履歴を作るので、同じ version が無ければ作る
    skipMode: "version-exists",
  });
  const createdPolicies = policyResults.filter(
    (result) => result.action === "created",
  ).length;

  console.log("シードデータを投入しました");
  console.log(`  organizationId: ${args.organizationId}`);
  console.log(`  organizationName: ${args.organizationName}`);
  console.log(`  adminUid: ${adminUid}`);
  console.log(`  consultantUid: ${consultantUid}`);
  console.log(`  userUid: ${userUid}`);
  const activeConsultantCount = consultants.filter(
    (consultant) => consultant.isActive,
  ).length;
  console.log(
    `  consultants: ${consultants.length}（稼働 ${activeConsultantCount} / 非稼働 ${consultants.length - activeConsultantCount}）`,
  );
  console.log(`  pricePlans: ${pricePlanCount}`);
  console.log(`  slots: ${slotCount}（翌日から ${args.days} 日分）`);
  console.log(`  customers: ${customers.length}`);
  console.log(
    `  bookings: ${bookingIds.length}（確定 / 完了 / キャンセル / 仮予約）`,
  );
  console.log(
    `  bookingRatings: ${ratedScenarioCount}（完了済み予約への評価。未評価の完了済み予約も 1 件残している）`,
  );
  console.log(
    `  appraisalReports: ${publishedReportCount + draftReportCount}（発行済み ${publishedReportCount} / 下書き ${draftReportCount}）`,
  );
  console.log(
    `  userCoupons: ${WELCOME_COUPON_BATCH_SIZE + BIRTHDAY_COUPON_BATCH_SIZE}（初回登録特典 ${WELCOME_COUPON_BATCH_SIZE} 枚: 未使用 ${WELCOME_COUPON_BATCH_SIZE - 1} / 使用済み 1、誕生日 ${BIRTHDAY_COUPON_BATCH_SIZE} 枚: 期限切れ）`,
  );
  console.log(
    `  policyRevisions: ${createdPolicies} 件作成、${policyResults.length - createdPolicies} 件は既存のまま（5 種 × 2 版: ${OLD_POLICY_VERSION} 旧版 / ${POLICY_VERSION} 現行）`,
  );
  console.log("");
  console.log("次の URL で確認できます:");
  console.log(`  console: http://localhost:3020/${args.organizationId}`);
  console.log(`  consultant: http://localhost:3030/${args.organizationId}`);
  console.log(`  user: http://localhost:3010/${args.organizationId}`);
}

main().catch((error) => {
  console.error("シードデータの投入に失敗しました:", error.message ?? error);
  process.exit(1);
});
