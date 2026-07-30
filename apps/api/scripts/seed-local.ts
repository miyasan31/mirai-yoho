/**
 * ローカルの Firestore エミュレーターにデモ組織のデータを一括投入する。
 *
 * 投入するデータは「デモとしてお客様に見せられる / 操作マニュアルの素材にできる」ことを基準に
 * 組み立てている。件数を増やすことではなく、各画面が必要とする状態を 1 つずつ満たすことを狙う:
 *
 *   - organizations / settings（営業時間・定休日・臨時休業、ステータス 3 段階、料金範囲、会社情報）
 *   - roles / accounts（システムロール 2 種 + カスタムロール 1 種、稼働中と招待中のアカウント）
 *   - consultants（稼働 3 名 + 休止 1 名。ステータスと得意分野をばらす）
 *   - price-plans（占い師ごとに 30 / 60 / 90 分。アーカイブ済みも 1 件）
 *   - slots（今日から N 日分。占い師ごとに担当時間帯が違う。定休日・臨時休業日は作らない）
 *   - users / customers（apps/user の会員と顧客。顧客メモ付き）
 *   - bookings / payments（今日 / 過去 / 未来 / 先月。4 ステータス + 課金待ち + 課金済みを網羅）
 *   - booking-ratings（5 / 4 / 3 / 2 点。未評価の完了予約も残す）
 *   - appraisal-reports（発行済み 2 通 + 下書き 1 通）
 *   - coupons / user-coupons（有効 2 種 + アーカイブ 1 種。未使用 / 使用済み / 期限切れ）
 *   - policy-revisions（5 種 × 3 版: アーカイブ / 公開中 / 下書き）
 *
 * Firebase Auth はエミュレートしないため、--admin / --consultant / --user には
 * **dev プロジェクトに実在する** Auth ユーザーのメールアドレスか UID を渡す。
 * このスクリプトは Auth を読むだけで、ユーザーの作成・変更は一切しない。
 *
 * 実行のたびに対象組織のドキュメントを削除してから投入し直すため、前回の残骸が
 * デモやマニュアルのスクリーンショットに混ざることはない（何度実行しても同じ状態になる）。
 *
 * Usage:
 *   pnpm dlx tsx --tsconfig apps/api/tsconfig.json --env-file=apps/api/.env.local apps/api/scripts/seed-local.ts \
 *     --admin <email|uid> [--consultant <email|uid>] [--user <email|uid>] \
 *     [--organization-id miraiyohou] [--organization-name みらい予報] \
 *     [--consultant-name 桜庭 静香] [--days 7]
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
import { type ChargeMethod, Payment } from "../src/domain/payment/payment";
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
const DEFAULT_ORGANIZATION_NAME = "みらい予報";
/** ログインに使う占い師の表示名。--consultant-name で差し替えられる */
const DEFAULT_CONSULTANT_NAME = "桜庭 静香";
const DEFAULT_DAYS = 7;

const SLOT_UNIT_MINUTES = 15;
const SLOT_UNIT_MS = SLOT_UNIT_MINUTES * 60 * 1000;
const BUFFER_SLOT_COUNT = 1;
const TAX_RATE = 0.1;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// 文書は 3 版入れる（アーカイブ / 公開中 / 下書き）。
// 施行日が未来だと findLatestPublished が空になり予約フローの同意チェックが通らないため、
// アーカイブと公開中はどちらも過去日にする（seed-initial-policies.ts の既定日とは別）
const ARCHIVED_POLICY_VERSION = "2025-07-01";
const POLICY_VERSION = "2026-01-01";
const DRAFT_POLICY_VERSION = "2026-10-01";
const ARCHIVED_POLICY_EFFECTIVE_FROM = `${ARCHIVED_POLICY_VERSION}T00:00:00+09:00`;
const POLICY_EFFECTIVE_FROM = `${POLICY_VERSION}T00:00:00+09:00`;
const DRAFT_POLICY_EFFECTIVE_FROM = `${DRAFT_POLICY_VERSION}T00:00:00+09:00`;
const POLICY_CREATED_BY = "運営事務局";

// 営業時間。曜日ごとの差と定休日を入れて、設定画面が一目で読めるようにする
const WEEKDAY_BUSINESS_HOURS = { startTime: "11:00", endTime: "22:00" };
const WEEKEND_BUSINESS_HOURS = { startTime: "10:00", endTime: "20:00" };
/** 定休日（火曜） */
const CLOSED_DAY_OF_WEEK = 2;
/** 臨時休業（実行日からの日数）。定休日と重なる場合は 1 日後ろにずらす */
const TEMPORARY_CLOSURE_DAY_OFFSET = 3;
// 料金設定の下限・上限。占い師が作れる税込金額の範囲
const PRICE_PLAN_RANGE = { minTotalJPY: 5000, maxTotalJPY: 20000 };

// ステータスは精算書のシステム利用料率に効く。上位ほど料率が低い設計にして 3 段階を確認できるようにする。
// domain が statusId "standard" の存在を必須にしているため、標準に DEFAULT_CONSULTANT_STATUS_ID を割り当てる
const STATUS_ID_STANDARD = DEFAULT_CONSULTANT_STATUS_ID;
const STATUS_ID_SILVER = "silver";
const STATUS_ID_GOLD = "gold";
const CONSULTANT_STATUSES = [
  { statusId: STATUS_ID_STANDARD, name: "標準", settlementRatePercent: 30 },
  { statusId: STATUS_ID_SILVER, name: "シルバー", settlementRatePercent: 25 },
  { statusId: STATUS_ID_GOLD, name: "ゴールド", settlementRatePercent: 20 },
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
// 日付ユーティリティ
// ---------------------------------------------------------------------------

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 今日を 0 とした相対日の指定時刻を返す */
function at(dayOffset: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * 先月の指定日・指定時刻を返す。
 * 精算書画面の既定が「先月」なので、実行日に関わらず必ず対象月に入るようにする。
 * 2 月でも存在するよう day は 28 以下で呼ぶこと。
 */
function inPreviousMonth(day: number, hour: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, day, hour, 0, 0, 0);
}

/** 臨時休業日。定休日と重なると休みが 1 日に見えてしまうので後ろにずらす */
function resolveTemporaryClosureDate(): Date {
  const date = at(TEMPORARY_CLOSURE_DAY_OFFSET, 0);
  return date.getDay() === CLOSED_DAY_OF_WEEK
    ? at(TEMPORARY_CLOSURE_DAY_OFFSET + 1, 0)
    : date;
}

const TEMPORARY_CLOSURE_DAY = toDateString(resolveTemporaryClosureDate());

function isClosedDate(date: Date): boolean {
  return (
    date.getDay() === CLOSED_DAY_OF_WEEK ||
    toDateString(date) === TEMPORARY_CLOSURE_DAY
  );
}

/**
 * 指定日以降で最初の営業日の指定時刻を返す。
 * 実行日によって未来の予約が定休日・臨時休業日に落ちるのを避ける
 * （過去の予約は当時の営業日なので調整しない）。
 */
function atOpenDay(minDayOffset: number, hour: number, minute = 0): Date {
  for (
    let dayOffset = minDayOffset;
    dayOffset < minDayOffset + 7;
    dayOffset++
  ) {
    if (!isClosedDate(at(dayOffset, 0))) {
      return at(dayOffset, hour, minute);
    }
  }
  throw new Error("7 日以内に営業日が見つかりません（営業時間の設定を確認）");
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

// ---------------------------------------------------------------------------
// 占い師 / 料金プラン
// ---------------------------------------------------------------------------

interface PricePlanSeed {
  pricePlanId: string;
  name: string;
  totalJPY: number;
  durationMinutes: SupportedDurationMinutes;
  isArchived?: boolean;
}

/** 担当時間帯。営業時間の内側に収まるように定義する */
interface ShiftWindow {
  startHour: number;
  endHour: number;
}

interface ConsultantSeed {
  consultantId: string;
  name: string;
  bio: string;
  specialties: string[];
  phone: string;
  statusId: string;
  isActive: boolean;
  shift: ShiftWindow;
  pricePlans: PricePlanSeed[];
}

interface ConsultantTemplate {
  key: string;
  name: string;
  bio: string;
  specialties: string[];
  phone: string;
  statusId: string;
  isActive: boolean;
  shift: ShiftWindow;
  plans: Array<Omit<PricePlanSeed, "pricePlanId">>;
}

/**
 * 1 人目はログイン用（Auth の UID をそのまま consultantId に使う）。
 * 2 人目以降は Auth に存在しない UID なのでログインはできず、一覧・予約の表示確認用。
 * 担当時間帯は営業時間（平日 11:00-22:00 / 土日 10:00-20:00）の共通部分に収める。
 */
const CONSULTANT_TEMPLATES: ConsultantTemplate[] = [
  {
    key: "own",
    name: DEFAULT_CONSULTANT_NAME,
    bio: "タロットと西洋占星術を組み合わせ、恋愛・仕事の岐路にあるご相談を承ります。鑑定歴 12 年。結論を急がず、いま踏み出せる一歩まで一緒に整理します。",
    specialties: ["恋愛", "仕事", "タロット", "西洋占星術"],
    phone: "090-3412-8867",
    statusId: STATUS_ID_GOLD,
    isActive: true,
    shift: { startHour: 13, endHour: 19 },
    plans: [
      { name: "はじめての鑑定 30分", totalJPY: 6000, durationMinutes: 30 },
      { name: "じっくり相談 60分", totalJPY: 11000, durationMinutes: 60 },
      { name: "本格鑑定 90分", totalJPY: 15000, durationMinutes: 90 },
      // アーカイブ済みプラン。料金プラン画面の「状態」列と復元操作の確認用
      {
        name: "モニター鑑定 30分",
        totalJPY: 5000,
        durationMinutes: 30,
        isArchived: true,
      },
    ],
  },
  {
    key: "hoshino",
    name: "星野 みちる",
    bio: "西洋占星術とタロットで、恋愛と対人関係のご相談を中心に承ります。相手の気持ちや距離の取り方を、具体的な行動に落とし込んでお伝えします。",
    specialties: ["恋愛", "対人関係", "タロット"],
    phone: "080-2255-4109",
    statusId: STATUS_ID_SILVER,
    isActive: true,
    shift: { startHour: 11, endHour: 15 },
    plans: [
      { name: "お試し鑑定 30分", totalJPY: 5000, durationMinutes: 30 },
      { name: "恋愛相談 60分", totalJPY: 9000, durationMinutes: 60 },
      { name: "総合鑑定 90分", totalJPY: 13000, durationMinutes: 90 },
    ],
  },
  {
    key: "tsukishiro",
    name: "月城 あかり",
    bio: "四柱推命をベースに、仕事とキャリアの転機を読み解きます。転職・独立・職場の相性など、判断材料が欲しい場面のご相談を得意としています。",
    specialties: ["仕事", "キャリア", "四柱推命"],
    phone: "070-6688-3021",
    statusId: STATUS_ID_STANDARD,
    isActive: true,
    shift: { startHour: 17, endHour: 20 },
    plans: [
      { name: "キャリア相談 30分", totalJPY: 5500, durationMinutes: 30 },
      { name: "転機を読む 60分", totalJPY: 10000, durationMinutes: 60 },
    ],
  },
  {
    key: "hyuga",
    name: "日向 そら",
    bio: "家族・子育てのご相談を中心に承ってきました。現在は活動を休止しているため、予約サイトには掲載されません。",
    specialties: ["家族", "子育て"],
    phone: "090-7734-5512",
    statusId: STATUS_ID_STANDARD,
    isActive: false,
    shift: { startHour: 13, endHour: 17 },
    plans: [
      { name: "はじめての鑑定 30分", totalJPY: 5000, durationMinutes: 30 },
      { name: "じっくり相談 60分", totalJPY: 9000, durationMinutes: 60 },
    ],
  },
];

function buildConsultantSeeds(
  args: SeedArgs,
  consultantUid: string,
): ConsultantSeed[] {
  return CONSULTANT_TEMPLATES.map((template, index) => {
    const consultantId = index === 0 ? consultantUid : `demo-${template.key}`;
    return {
      consultantId,
      name: index === 0 ? args.consultantName : template.name,
      bio: template.bio,
      specialties: template.specialties,
      phone: template.phone,
      statusId: template.statusId,
      isActive: template.isActive,
      shift: template.shift,
      pricePlans: template.plans.map((plan, planIndex) => ({
        ...plan,
        pricePlanId: `${args.organizationId}_${consultantId}_plan-${planIndex + 1}`,
      })),
    };
  });
}

/** シナリオから料金プランを引く。相談時間で指定して、並び順の変更に影響されないようにする */
function planOf(
  consultant: ConsultantSeed,
  durationMinutes: SupportedDurationMinutes,
): PricePlanSeed {
  const plan = consultant.pricePlans.find(
    (candidate) =>
      candidate.durationMinutes === durationMinutes && !candidate.isArchived,
  );
  if (!plan) {
    throw new Error(
      `${consultant.name} に ${durationMinutes} 分のプランがありません`,
    );
  }
  return plan;
}

// ---------------------------------------------------------------------------
// 会員 / 顧客
// ---------------------------------------------------------------------------

interface CustomerSeed {
  customerId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  /** console の顧客管理「メモ」列。運用の申し送りを想定 */
  note?: string;
}

interface CustomerTemplate {
  key: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  note?: string;
}

/** 1 人目はログイン用（Auth の UID をそのまま userId に使う） */
const CUSTOMER_TEMPLATES: CustomerTemplate[] = [
  {
    key: "yui",
    name: "山本 結衣",
    email: "yui.yamamoto@example.com",
    phone: "090-1188-4520",
    birthDate: "1993-05-15",
    note: "リピーター。平日夜の枠を希望されることが多い。",
  },
  {
    key: "hina",
    name: "佐藤 陽菜",
    email: "hina.sato@example.com",
    phone: "080-4471-9032",
    birthDate: "1992-04-18",
    note: "初回はクーポン利用。次回は 60 分プランを検討中とのこと。",
  },
  {
    key: "ichiro",
    name: "田中 一郎",
    email: "ichiro.tanaka@example.com",
    phone: "070-2093-6614",
    birthDate: "1985-11-03",
  },
  {
    key: "misaki",
    name: "鈴木 美咲",
    email: "misaki.suzuki@example.com",
    phone: "090-5527-1348",
    birthDate: "1998-07-25",
    note: "開始時刻に遅れがち。前日にリマインドを送る運用にしている。",
  },
];

function buildCustomerSeeds(args: SeedArgs, userUid: string): CustomerSeed[] {
  return CUSTOMER_TEMPLATES.map((template, index) => ({
    customerId: `${args.organizationId}_customer-${template.key}`,
    userId: index === 0 ? userUid : `demo-user-${template.key}`,
    name: template.name,
    email: template.email,
    phone: template.phone,
    birthDate: template.birthDate,
    note: template.note,
  }));
}

// ---------------------------------------------------------------------------
// 既存データの掃除
// ---------------------------------------------------------------------------

/**
 * 対象組織のドキュメントを消してから投入し直す。
 *
 * 上書きだけだと、前回のシードで作った占い師・顧客・予約が孤児として残り、
 * デモやマニュアルのスクリーンショットに混ざってしまう。エミュレーター専用の
 * スクリプトなので、対象組織に限って毎回まっさらにする。
 *
 * users / user-zoom-credentials は組織に紐づかず、消すと Zoom 連携をやり直すことに
 * なるため対象外（どちらも管理画面には出ないので残っていても影響しない）。
 */
const PURGE_TARGET_COLLECTIONS = [
  FIRESTORE_COLLECTIONS.bookings,
  FIRESTORE_COLLECTIONS.bookingRatings,
  FIRESTORE_COLLECTIONS.payments,
  FIRESTORE_COLLECTIONS.slots,
  FIRESTORE_COLLECTIONS.customers,
  FIRESTORE_COLLECTIONS.consultants,
  FIRESTORE_COLLECTIONS.pricePlans,
  FIRESTORE_COLLECTIONS.accounts,
  FIRESTORE_COLLECTIONS.roles,
  FIRESTORE_COLLECTIONS.coupons,
  FIRESTORE_COLLECTIONS.userCoupons,
  FIRESTORE_COLLECTIONS.policyRevisions,
  FIRESTORE_COLLECTIONS.policyAgreements,
  FIRESTORE_COLLECTIONS.appraisalReports,
  FIRESTORE_COLLECTIONS.zoomSessions,
];

const PURGE_BATCH_SIZE = 400;

async function purgeOrganization(organizationId: string): Promise<number> {
  let deleted = 0;

  for (const collection of PURGE_TARGET_COLLECTIONS) {
    const snapshot = await db
      .collection(collection)
      .where("organizationId", "==", organizationId)
      .get();

    for (
      let index = 0;
      index < snapshot.docs.length;
      index += PURGE_BATCH_SIZE
    ) {
      const batch = db.batch();
      for (const doc of snapshot.docs.slice(index, index + PURGE_BATCH_SIZE)) {
        batch.delete(doc.ref);
      }
      await batch.commit();
    }
    deleted += snapshot.size;
  }

  return deleted;
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
  settings.updateConsultantStatuses(CONSULTANT_STATUSES, STATUS_ID_STANDARD);
  settings.updatePricePlanRange(PRICE_PLAN_RANGE);
  settings.updateCompanyInfo(COMPANY_INFO);
  await new FirestoreSettingsRepository().save(settings);
}

/** 平日 11:00-22:00 / 土日 10:00-20:00、火曜定休 + 臨時休業 1 日 */
function buildBusinessHours(): BusinessHoursProps {
  const weekly = Array.from({ length: 7 }, (_, dayOfWeek) => {
    if (dayOfWeek === CLOSED_DAY_OF_WEEK) {
      return { dayOfWeek, isClosed: true, timeWindows: [] };
    }
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return {
      dayOfWeek,
      isClosed: false,
      timeWindows: [
        isWeekend
          ? { ...WEEKEND_BUSINESS_HOURS }
          : { ...WEEKDAY_BUSINESS_HOURS },
      ],
    };
  });

  return {
    weekly,
    includePublicHolidays: true,
    exceptions: [
      {
        startDate: TEMPORARY_CLOSURE_DAY,
        endDate: TEMPORARY_CLOSURE_DAY,
        isClosed: true,
        timeWindows: [],
      },
    ],
  };
}

/** 権限を絞ったカスタムロール。権限管理画面に編集・削除できる行を 1 つ用意する */
const VIEWER_ROLE_ID = "viewer";

function buildRoles(organizationId: string): Role[] {
  return [
    Role.createSystemAdmin(organizationId),
    Role.createSystemOperator(organizationId),
    Role.create({
      organizationId,
      roleId: VIEWER_ROLE_ID,
      name: "閲覧のみ",
      description: "予約・決済・顧客の閲覧だけを許可する制限ロール",
      permissions: [
        "console.dashboard.read",
        "console.bookings.read",
        "console.payments.read",
        "console.customers.read",
        "console.consultants.read",
      ],
      isSystem: false,
    }),
  ];
}

async function seedRoles(organizationId: string): Promise<void> {
  for (const role of buildRoles(organizationId)) {
    await db
      .collection(FIRESTORE_COLLECTIONS.roles)
      .doc(getRoleDocId(organizationId, role.getRoleId()))
      .set({
        organizationId: role.getOrganizationId(),
        roleId: role.getRoleId(),
        name: role.getName(),
        description: role.getDescription(),
        // システムロールの権限はコード側が持つので、保存が要るのはカスタムロールだけ
        ...(role.getIsSystem() ? {} : { permissions: role.getPermissions() }),
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
      name: "大石 直樹",
    },
    // 招待中の行を 1 件作り、アカウント管理画面のステータス表示を確認できるようにする
    {
      accountId: "demo-account-operator",
      roleId: "operator",
      status: "invited",
      name: "中村 咲",
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
        seed.phone,
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
): Promise<{ active: number; archived: number }> {
  const repository = new FirestorePricePlanRepository();
  let active = 0;
  let archived = 0;

  for (const seed of seeds) {
    for (const plan of seed.pricePlans) {
      const pricePlan = PricePlan.create({
        organizationId,
        consultantId: seed.consultantId,
        pricePlanId: plan.pricePlanId,
        name: plan.name,
        totalJPY: plan.totalJPY,
        durationMinutes: plan.durationMinutes,
      });
      if (plan.isArchived) {
        pricePlan.archive();
        archived += 1;
      } else {
        active += 1;
      }
      await repository.save(pricePlan);
    }
  }

  return { active, archived };
}

/** 再実行で重複しないように、開始時刻から決定的な ID を振る（本番は UUID） */
function toSlotId(
  organizationId: string,
  consultantId: string,
  startsAt: Date,
): string {
  return `${organizationId}_${consultantId}_${startsAt.toISOString()}`;
}

/**
 * 占い師の担当時間帯ぶんの開始時刻を today..today+days-1 で作る。
 * 定休日・臨時休業日と、過ぎてしまった時刻は作らない
 * （営業時間外・過去の枠は予約サイトの候補に出ないため、あっても意味がない）
 */
function createSlotStartTimes(shift: ShiftWindow, days: number): Date[] {
  const startTimes: Date[] = [];
  const now = Date.now();

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    if (isClosedDate(at(dayOffset, 0))) continue;

    for (let hour = shift.startHour; hour < shift.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_UNIT_MINUTES) {
        const startsAt = at(dayOffset, hour, minute);
        if (startsAt.getTime() <= now) continue;
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
  let count = 0;

  for (const seed of seeds.filter((candidate) => candidate.isActive)) {
    for (const startsAt of createSlotStartTimes(seed.shift, days)) {
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
      Customer.reconstruct({
        organizationId,
        customerId: seed.customerId,
        userId: seed.userId,
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        birthDate: seed.birthDate,
        note: seed.note,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// クーポン
// ---------------------------------------------------------------------------

const WELCOME_COUPON_NAME = "新規会員登録クーポン";
const WELCOME_COUPON_AMOUNT_JPY = 1000;
const WELCOME_COUPON_BATCH_SIZE = 3;
const WELCOME_COUPON_EXPIRES_IN_DAYS = 90;
const BIRTHDAY_COUPON_NAME = "お誕生日クーポン";
const BIRTHDAY_COUPON_AMOUNT_JPY = 2000;
const BIRTHDAY_COUPON_BATCH_SIZE = 1;
const BIRTHDAY_COUPON_EXPIRES_IN_DAYS = 30;
const ARCHIVED_COUPON_NAME = "春の新生活応援クーポン";

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
    amountJPY: WELCOME_COUPON_AMOUNT_JPY,
    batchSize: WELCOME_COUPON_BATCH_SIZE,
    expiresInDays: WELCOME_COUPON_EXPIRES_IN_DAYS,
  });
  const birthday = Coupon.create({
    organizationId,
    couponId: `${organizationId}_coupon-birthday`,
    type: "birthday",
    name: BIRTHDAY_COUPON_NAME,
    amountJPY: BIRTHDAY_COUPON_AMOUNT_JPY,
    batchSize: BIRTHDAY_COUPON_BATCH_SIZE,
    expiresInDays: BIRTHDAY_COUPON_EXPIRES_IN_DAYS,
  });
  // 終了したキャンペーン。クーポン管理画面の「状態」列と復元操作の確認用。
  // 同じ種別で有効なクーポンは 1 つまでなので、アーカイブ済みとして入れる
  const archived = Coupon.create({
    organizationId,
    couponId: `${organizationId}_coupon-spring-campaign`,
    type: "welcome",
    name: ARCHIVED_COUPON_NAME,
    amountJPY: 1500,
    batchSize: 1,
    expiresInDays: 60,
  });
  archived.archive();

  await couponRepository.save(welcome);
  await couponRepository.save(birthday);
  await couponRepository.save(archived);

  // 新規会員登録クーポンは 1 回の取得で batchSize 枚もらえる。1 枚は後段の予約で使用済みにするので、
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

interface BookingScenario {
  consultant: ConsultantSeed;
  customer: CustomerSeed;
  pricePlan: PricePlanSeed;
  startsAt: Date;
  status: SeedBookingStatus;
  /** 予約時の相談内容。占い師の予約詳細・鑑定メモ画面に出る */
  consultationContent: string;
  /** 鑑定メモ。未指定なら未入力（ホームの「メモ未入力」件数に効く） */
  memo?: string;
  /** 占い師が Zoom に入室済みか。未指定なら completed のみ入室済み */
  joined?: boolean;
  /** カード登録済みか。未指定なら仮予約以外は登録済み */
  hasPaymentMethod?: boolean;
  /** 課金済みのときの課金経路。未指定なら自動（バッチ） */
  chargeMethod?: ChargeMethod;
  withCoupon?: boolean;
  /** 完了済み予約への評価。console の占い師詳細で平均点と分布を確認する */
  rating?: { score: number; comment?: string };
  /** 鑑定書。未指定なら未作成。published のみ apps/user から見える */
  appraisalReport?: AppraisalReportStatus;
  /** 同意した版。未指定なら現行版。旧版にするとポリシー更新後の予約として警告が出る */
  agreedPolicyVersion?: string;
}

/**
 * 予約シナリオ。件数を増やすのではなく、各画面が必要とする状態を 1 件ずつ用意する。
 *
 * - 今日: 占い師ホームの「次の予約」「今日の予約一覧」「メモ未入力」と console ホームの ToDo
 * - 過去: 評価の分布、鑑定書、課金待ち（要対応決済 / 課金ボタン）
 * - 未来: 24 時間以内の未処理予約。実行時刻によらず 1 件は入るよう今日の夕方と翌営業日に置く
 * - 先月: 精算書の明細（charged だけが計上され、cancelled は除外されることを確認できる）
 */
function buildBookingScenarios(
  consultants: ConsultantSeed[],
  customers: CustomerSeed[],
): BookingScenario[] {
  const [sakuraba, hoshino, tsukishiro] = consultants;
  const [yui, hina, ichiro, misaki] = customers;

  return [
    // --- 今日 ---------------------------------------------------------------
    {
      consultant: sakuraba,
      customer: yui,
      pricePlan: planOf(sakuraba, 60),
      startsAt: at(0, 13),
      status: "completed",
      consultationContent:
        "転職するか、いまの職場で続けるかを迷っています。判断の目安になる時期を知りたいです。",
      memo: "転職を検討中。9 月以降に動きが出やすい配置。焦らず情報収集を続けるよう助言。次回は結果報告の予定。",
      withCoupon: true,
      rating: {
        score: 5,
        comment:
          "とても丁寧に話を聞いていただき、気持ちが軽くなりました。また相談したいです。",
      },
      appraisalReport: "published",
    },
    {
      consultant: sakuraba,
      customer: hina,
      pricePlan: planOf(sakuraba, 30),
      startsAt: at(0, 15),
      status: "completed",
      consultationContent:
        "職場の人間関係で悩んでいます。距離の取り方を相談したいです。",
      // メモをあえて入れず、「メモ未入力」の件数と入力導線を確認できるようにする
      chargeMethod: "manual",
    },
    {
      consultant: sakuraba,
      customer: ichiro,
      pricePlan: planOf(sakuraba, 60),
      startsAt: at(0, 17),
      status: "confirmed",
      consultationContent:
        "独立を考えています。準備を始めるのに適した時期を知りたいです。",
      joined: false,
    },
    {
      consultant: sakuraba,
      customer: misaki,
      pricePlan: planOf(sakuraba, 30),
      startsAt: at(0, 18, 30),
      status: "pending",
      consultationContent: "来年の運勢を全体的に見ていただきたいです。",
    },

    // --- 過去 ---------------------------------------------------------------
    {
      // 開始済みの確定予約 + カード登録済み = 課金待ち。console の「要対応決済」と課金ボタンの確認用
      consultant: sakuraba,
      customer: yui,
      pricePlan: planOf(sakuraba, 60),
      startsAt: at(-1, 15),
      status: "confirmed",
      consultationContent:
        "パートナーとの今後について、来年までの流れを見ていただきたいです。",
      memo: "関係性は安定期。相手の仕事が落ち着く春以降に大きな話を進めるのが良いと伝えた。",
      joined: true,
      appraisalReport: "draft",
    },
    {
      consultant: sakuraba,
      customer: yui,
      pricePlan: planOf(sakuraba, 30),
      startsAt: at(-4, 14),
      status: "cancelled",
      consultationContent: "急な予定変更のため、日程を改めて取り直します。",
    },
    {
      consultant: sakuraba,
      customer: ichiro,
      pricePlan: planOf(sakuraba, 90),
      startsAt: at(-6, 16),
      status: "completed",
      consultationContent:
        "家族の進路について相談したいことがあります。時間を長めに取りたいです。",
      memo: "ご家族の進学について。本人の意思を尊重する方向で整理。来月あらためて相談予定。",
      rating: { score: 4, comment: "的確なアドバイスをいただけました。" },
    },
    {
      consultant: sakuraba,
      customer: misaki,
      pricePlan: planOf(sakuraba, 60),
      startsAt: at(-9, 13),
      status: "completed",
      consultationContent: "金運と、貯蓄の始めどきについて知りたいです。",
      memo: "金銭面の相談。固定費の見直しから着手する方向で合意。",
      chargeMethod: "manual",
      // コメントなしの低評価も入れて、評価の分布とコメント有無の表示を確認できるようにする
      rating: { score: 2 },
    },
    {
      // 未評価のまま残す完了予約。apps/user の「未評価」バッジと評価導線の確認用
      consultant: sakuraba,
      customer: yui,
      pricePlan: planOf(sakuraba, 30),
      startsAt: at(-13, 15),
      status: "completed",
      consultationContent:
        "新しい習い事を始めようか迷っています。向き不向きを見ていただきたいです。",
      memo: "新しい習い事について。まずは体験から始める方向で助言。",
      appraisalReport: "published",
    },

    // --- 未来 ---------------------------------------------------------------
    {
      consultant: sakuraba,
      customer: yui,
      pricePlan: planOf(sakuraba, 60),
      startsAt: atOpenDay(1, 14),
      status: "confirmed",
      consultationContent:
        "前回の鑑定のあとの状況を報告しつつ、次の一手を相談したいです。",
      // 旧版の規約に同意した予約。占い師側に「ポリシー更新後の予約です」の注意が出る
      agreedPolicyVersion: ARCHIVED_POLICY_VERSION,
    },

    // --- 先月（精算書の明細） -------------------------------------------------
    {
      consultant: sakuraba,
      customer: hina,
      pricePlan: planOf(sakuraba, 60),
      startsAt: inPreviousMonth(5, 13),
      status: "completed",
      consultationContent: "仕事の人間関係について相談したいです。",
      memo: "職場での立ち回りについて整理。無理に距離を詰めない方針で合意。",
    },
    {
      consultant: sakuraba,
      customer: ichiro,
      pricePlan: planOf(sakuraba, 90),
      startsAt: inPreviousMonth(12, 16),
      status: "completed",
      consultationContent: "今年後半の全体運を長めに見ていただきたいです。",
      memo: "下半期の流れを通しで鑑定。秋口の判断が要になると伝えた。",
      chargeMethod: "manual",
    },
    {
      consultant: sakuraba,
      customer: misaki,
      pricePlan: planOf(sakuraba, 30),
      startsAt: inPreviousMonth(19, 14),
      status: "completed",
      consultationContent: "引っ越しの時期について相談したいです。",
      memo: "引っ越し時期の相談。年内なら 11 月が動きやすいと助言。",
    },
    {
      // 同じ先月でも精算対象外（キャンセル）
      consultant: sakuraba,
      customer: yui,
      pricePlan: planOf(sakuraba, 60),
      startsAt: inPreviousMonth(22, 15),
      status: "cancelled",
      consultationContent: "体調不良のためキャンセルしました。",
    },

    // --- 他の占い師 ---------------------------------------------------------
    {
      consultant: hoshino,
      customer: hina,
      pricePlan: planOf(hoshino, 60),
      startsAt: atOpenDay(2, 11),
      status: "confirmed",
      consultationContent:
        "片思いの相手との距離の縮め方について相談したいです。",
    },
    {
      consultant: hoshino,
      customer: ichiro,
      pricePlan: planOf(hoshino, 30),
      startsAt: at(-5, 12),
      status: "completed",
      consultationContent: "職場の後輩との接し方に悩んでいます。",
      memo: "後輩との関係について。まずは聞く姿勢を意識する方向で助言。",
      rating: { score: 5, comment: "話しやすく、あっという間の 30 分でした。" },
    },
    {
      consultant: tsukishiro,
      customer: misaki,
      pricePlan: planOf(tsukishiro, 60),
      startsAt: atOpenDay(5, 18),
      status: "confirmed",
      consultationContent: "資格取得と転職のタイミングを相談したいです。",
    },
    {
      consultant: tsukishiro,
      customer: yui,
      pricePlan: planOf(tsukishiro, 30),
      startsAt: at(-7, 19),
      status: "completed",
      consultationContent: "部署異動の希望を出すか迷っています。",
      memo: "異動希望について。年度末の面談で切り出す方向で整理。",
      rating: { score: 3, comment: "落ち着いて相談できました。" },
    },
  ];
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

/**
 * Stripe の ID 群。課金済みなら PaymentIntent と課金経路まで埋めて、
 * 決済管理の「課金実行」列が「-」のままにならないようにする。
 * カード未登録（仮予約）だけ PaymentMethod を持たせず、課金できない状態を再現する。
 */
function buildStripeFields(scenario: BookingScenario, bookingId: string) {
  const suffix = hashCode(bookingId);
  const paymentStatus = toPaymentStatus(scenario.status);
  const hasPaymentMethod =
    scenario.hasPaymentMethod ?? paymentStatus !== "setup_pending";

  return {
    stripeSetupIntentId: `seti_demo_${suffix}`,
    stripePaymentMethodId: hasPaymentMethod ? `pm_demo_${suffix}` : undefined,
    stripePaymentIntentId:
      paymentStatus === "charged" ? `pi_demo_${suffix}` : undefined,
    chargeMethod:
      paymentStatus === "charged"
        ? (scenario.chargeMethod ?? "batch")
        : undefined,
  };
}

async function seedBooking(
  organizationId: string,
  scenario: BookingScenario,
  coupons: SeededCoupons,
): Promise<string> {
  const { startsAt } = scenario;
  const endsAt = new Date(
    startsAt.getTime() + scenario.pricePlan.durationMinutes * MINUTE_MS,
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
  const agreedVersion = scenario.agreedPolicyVersion ?? POLICY_VERSION;
  const joined = scenario.joined ?? scenario.status === "completed";

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
    consultantJoinedAt: joined ? new Date(startsAt) : undefined,
    consultantMemo: scenario.memo
      ? ConsultantMemo.reconstruct({
          customerName: scenario.customer.name,
          birthDate: scenario.customer.birthDate,
          appraisalDate: toDateString(startsAt),
          freeMemo: scenario.memo,
        })
      : ConsultantMemo.empty(),
    consultationContent: scenario.consultationContent,
    pricePlanId: scenario.pricePlan.pricePlanId,
    pricePlanName: scenario.pricePlan.name,
    pricePlanTotalJPY: totalJPY,
    appliedUserCouponId: scenario.withCoupon
      ? coupons.redeemedUserCouponId
      : undefined,
    couponDiscountJPY: scenario.withCoupon ? discountJPY : undefined,
    discountedTotalJPY: scenario.withCoupon ? discountedTotalJPY : undefined,
    agreedTermsVersion: agreedVersion,
    agreedCancellationPolicyVersion: agreedVersion,
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
      ...buildStripeFields(scenario, bookingId),
      createdAt: new Date(startsAt.getTime() - 3 * DAY_MS),
      updatedAt: new Date(startsAt.getTime() - DAY_MS),
    }),
  );

  if (scenario.rating) {
    await seedBookingRating({ organizationId, bookingId, scenario, endsAt });
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
  endsAt: Date;
}): Promise<void> {
  const { organizationId, bookingId, scenario, endsAt } = params;
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
      consultedAt: scenario.startsAt,
      // 鑑定終了の 1 時間後に評価したことにする
      ratedAt: new Date(endsAt.getTime() + HOUR_MS),
    }),
  );
}

// ---------------------------------------------------------------------------
// 鑑定書
// ---------------------------------------------------------------------------

/** 鑑定書の本文。相談内容に沿った文面にして、そのまま読める鑑定書にする */
const APPRAISAL_REPORT_CONTENTS: Record<
  AppraisalReportStatus,
  {
    theme: string;
    currentSituation: string;
    result: string;
    luckyAction: string;
    summary: string;
  }
> = {
  published: {
    theme: "今後のキャリアと転職のタイミングについて",
    currentSituation:
      "現職に留まるか転職するかで迷われている時期です。周囲との比較で焦りが出やすい配置が出ており、判断を急ぐほど選択肢が狭く見えやすくなっています。",
    result:
      "秋以降に流れが大きく変わります。特に 10 月から 12 月にかけて新しい縁がつながりやすく、この時期の行動が来年の土台になります。それまでは条件を絞り込みすぎず、情報を集める期間としてお使いください。",
    luckyAction:
      "朝の散歩を習慣にし、月に一度は行ったことのない場所に足を運んでください。人からの紹介が動きのきっかけになります。",
    summary:
      "焦らず準備を進めることが、そのまま次の機会につながります。秋の変化に備えて、いまは足場を固める時期です。",
  },
  draft: {
    theme: "パートナーとの今後について",
    currentSituation:
      "（下書き）関係は安定していますが、お互いに仕事の負荷が重なりやすい時期です。",
    result: "（下書き）春以降に落ち着きが出る見込みです。ここから清書します。",
    luckyAction: "",
    summary: "",
  },
};

async function seedAppraisalReport(
  organizationId: string,
  scenario: BookingScenario,
  bookingId: string,
): Promise<void> {
  const status = scenario.appraisalReport;
  if (!status) return;

  const { startsAt } = scenario;
  // 鑑定終了の 2 時間後に書き上げた想定
  const writtenAt = new Date(
    startsAt.getTime() +
      scenario.pricePlan.durationMinutes * MINUTE_MS +
      2 * HOUR_MS,
  );
  const appraisalDate = toDateString(startsAt);
  const content = APPRAISAL_REPORT_CONTENTS[status];

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
        ...content,
      }),
      status,
      publishedAt: status === "published" ? writtenAt : null,
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

  const purgedCount = await purgeOrganization(args.organizationId);
  await seedOrganization(args);
  await seedRoles(args.organizationId);
  await seedAccounts(args.organizationId, adminUid);
  await seedConsultants(args.organizationId, consultants);
  const pricePlanCounts = await seedPricePlans(
    args.organizationId,
    consultants,
  );
  const slotCount = await seedSlots(
    args.organizationId,
    consultants,
    args.days,
  );
  await seedUsersAndCustomers(args.organizationId, customers);
  const coupons = await seedCoupons(args.organizationId, userUid);

  const scenarios = buildBookingScenarios(consultants, customers);
  const bookingIds: string[] = [];
  for (const scenario of scenarios) {
    const bookingId = await seedBooking(args.organizationId, scenario, coupons);
    bookingIds.push(bookingId);
    await seedAppraisalReport(args.organizationId, scenario, bookingId);
  }

  const count = (predicate: (scenario: BookingScenario) => boolean) =>
    scenarios.filter(predicate).length;
  const publishedReportCount = count(
    (scenario) => scenario.appraisalReport === "published",
  );
  const draftReportCount = count(
    (scenario) => scenario.appraisalReport === "draft",
  );
  const ratedCount = count((scenario) => Boolean(scenario.rating));
  const todayString = toDateString(new Date());
  const todayBookingCount = count(
    (scenario) => toDateString(scenario.startsAt) === todayString,
  );

  const couponScenarioIndex = scenarios.findIndex(
    (scenario) => scenario.withCoupon,
  );
  if (couponScenarioIndex >= 0) {
    await seedRedeemedUserCoupon({
      organizationId: args.organizationId,
      userId: userUid,
      coupons,
      bookingId: bookingIds[couponScenarioIndex],
      redeemedAt: scenarios[couponScenarioIndex].startsAt,
    });
  }

  const policyResults = await seedPolicies({
    organizationIds: [args.organizationId],
    versions: [
      {
        version: ARCHIVED_POLICY_VERSION,
        effectiveFrom: new Date(ARCHIVED_POLICY_EFFECTIVE_FROM),
        status: "archived",
        archivedAt: new Date(POLICY_EFFECTIVE_FROM),
        note: `※ この版は旧版です（${POLICY_VERSION} 版に置き換えられました）。`,
      },
      {
        version: POLICY_VERSION,
        effectiveFrom: new Date(POLICY_EFFECTIVE_FROM),
        status: "published",
      },
      {
        version: DRAFT_POLICY_VERSION,
        effectiveFrom: new Date(DRAFT_POLICY_EFFECTIVE_FROM),
        status: "draft",
        note: `※ この版は下書きです（${DRAFT_POLICY_VERSION} 施行予定）。`,
      },
    ],
    createdBy: POLICY_CREATED_BY,
    // 改版履歴を作るので、同じ version が無ければ作る
    skipMode: "version-exists",
  });
  const createdPolicies = policyResults.filter(
    (result) => result.action === "created",
  ).length;

  const activeConsultantCount = consultants.filter(
    (consultant) => consultant.isActive,
  ).length;

  console.log("デモデータを投入しました");
  console.log(
    `  purged: ${purgedCount} 件（投入前に対象組織のドキュメントを削除）`,
  );
  console.log(`  organizationId: ${args.organizationId}`);
  console.log(`  organizationName: ${args.organizationName}`);
  console.log(`  adminUid: ${adminUid}`);
  console.log(`  consultantUid: ${consultantUid}`);
  console.log(`  userUid: ${userUid}`);
  console.log(
    `  consultants: ${consultants.length}（稼働 ${activeConsultantCount} / 休止 ${consultants.length - activeConsultantCount}）`,
  );
  console.log(
    `  pricePlans: ${pricePlanCounts.active + pricePlanCounts.archived}（有効 ${pricePlanCounts.active} / アーカイブ ${pricePlanCounts.archived}）`,
  );
  console.log(
    `  slots: ${slotCount}（今日から ${args.days} 日分。火曜定休と ${TEMPORARY_CLOSURE_DAY} の臨時休業を除く）`,
  );
  console.log(`  customers: ${customers.length}`);
  console.log(
    `  bookings: ${bookingIds.length}（確定 / 完了 / キャンセル / 仮予約。うち今日が ${todayBookingCount} 件）`,
  );
  console.log(
    `  bookingRatings: ${ratedCount}（5 / 4 / 3 / 2 点。未評価の完了予約も 1 件残している）`,
  );
  console.log(
    `  appraisalReports: ${publishedReportCount + draftReportCount}（発行済み ${publishedReportCount} / 下書き ${draftReportCount}）`,
  );
  console.log(
    `  userCoupons: ${WELCOME_COUPON_BATCH_SIZE + BIRTHDAY_COUPON_BATCH_SIZE}（${WELCOME_COUPON_NAME} ${WELCOME_COUPON_BATCH_SIZE} 枚: 未使用 ${WELCOME_COUPON_BATCH_SIZE - 1} / 使用済み 1、${BIRTHDAY_COUPON_NAME} ${BIRTHDAY_COUPON_BATCH_SIZE} 枚: 期限切れ）`,
  );
  console.log(
    `  policyRevisions: ${createdPolicies} 件作成、${policyResults.length - createdPolicies} 件は既存のまま（5 種 × 3 版: ${ARCHIVED_POLICY_VERSION} アーカイブ / ${POLICY_VERSION} 公開中 / ${DRAFT_POLICY_VERSION} 下書き）`,
  );
  console.log("");
  console.log("次の URL で確認できます:");
  console.log(`  console: http://localhost:3020/${args.organizationId}`);
  console.log(`  consultant: http://localhost:3030/${args.organizationId}`);
  console.log(`  user: http://localhost:3010/${args.organizationId}`);
}

main().catch((error) => {
  console.error("デモデータの投入に失敗しました:", error.message ?? error);
  process.exit(1);
});
