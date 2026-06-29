import crypto from "node:crypto";
import type { Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { type NextRequest, NextResponse } from "next/server";
import { evaluateChargeEligibility } from "@/application/booking/charge-eligibility";
import { MarkConsultantJoinedUseCase } from "@/application/consultant/mark-consultant-joined-use-case";
import { UpdateMemoUseCase } from "@/application/consultant/update-memo-use-case";
import { UpdateProfileUseCase } from "@/application/consultant/update-profile-use-case";
import { toConsultantPricePlanOutput } from "@/application/consultant-price-plan/create-consultant-price-plan-use-case";
import { AppError } from "@/application/shared/app-error";
import { envServer } from "@/config/env.server";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { createPricePlanSelectionId } from "@/domain/consultant-price-plan/consultant-price-plan";
import { BusinessHours } from "@/domain/organization-settings/business-hours";
import type { ConsultantRankProps } from "@/domain/organization-settings/consultant-rank";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import { DomainError } from "@/domain/shared/domain-error";
import { Slot } from "@/domain/slot/slot";
import { isValidSlotRange } from "@/domain/slot/slot-availability";
import { TimeRange } from "@/domain/slot/time-range";
import type { UserRole } from "@/infrastructure/auth/auth-types";
import {
  getOrganizationAccountDocId,
  setUserDisplayName,
} from "@/infrastructure/auth/load-auth-context";
import { requireOrganizationRole } from "@/infrastructure/auth/require-organization-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { verifyCloudSchedulerAuth } from "@/infrastructure/auth/verify-cloud-scheduler-auth";
import {
  createBatchChargeUseCase,
  createBookingRepository,
  createCancelBookingUseCase,
  createChargePaymentUseCase,
  createConsultantPricePlanRepository,
  createConsultantRepository,
  createCreateBookingUseCase,
  createCreateConsultantPricePlanUseCase,
  createCustomerRepository,
  createNotifyLateConsultantArrivalUseCase,
  createOrganizationSettingsRepository,
  createPaymentRepository,
  createSendConsultationReminderUseCase,
  createSetupPaymentUseCase,
  createSlotRepository,
  createUpdateConsultantPricePlanUseCase,
} from "@/infrastructure/container";
import {
  createUser,
  deleteUser,
  generatePasswordResetLink,
  getUser,
  getUserByEmail,
  getUsersByUids,
} from "@/infrastructure/firebase/firebase-auth-admin";
import { FirestoreBookingRepository } from "@/infrastructure/firestore/firestore-booking-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { FirestoreConsultantRepository } from "@/infrastructure/firestore/firestore-consultant-repository";
import { app, db } from "@/infrastructure/firestore/firestore-customer";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import { HmacBookingActionTokenService } from "@/infrastructure/token/booking-action-token-service";
import { HmacCancelTokenService } from "@/infrastructure/token/cancel-token-service";
import { chunkArray } from "@/lib/chunk-array";
import { withNoStore, withPublicShortCache } from "../../../cache-control";
import { deleteAdminUserWithAuthCleanup } from "./admin-user-deletion";
import {
  canUpdateDisplayNameTarget,
  isLastAdminSelfDemotion,
  validateAdminUserDeletionTarget,
} from "./admin-user-policy";
import { logUnexpectedPostError, mapApiError } from "./api-error-mapper";
import { validateCustomerBirthdate } from "./booking-birthdate-validation";

const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.organizationAccounts;
const FIRESTORE_IN_QUERY_CHUNK_SIZE = 10;
const BATCH_CHARGE_COOLDOWN_MS = 60 * 1000;
const BATCH_CONSULTATION_REMINDER_COOLDOWN_MS = 60 * 1000;
const BOOKING_ACTION_TOKEN_TTL_MS = 30 * 60 * 1000;
const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_UPLOAD_URL_TTL_MS = 10 * 60 * 1000;
const ALLOWED_AVATAR_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const AVATAR_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const batchChargeInProgressOrganizations = new Set<string>();
const batchChargeLastStartedAtByOrganization = new Map<string, number>();
const batchConsultationReminderInProgressOrganizations = new Set<string>();
const batchConsultationReminderLastStartedAtByOrganization = new Map<
  string,
  number
>();

type RouteContext = {
  params: Promise<{
    organizationId: string;
    slug?: string[];
  }>;
};

interface RequestErrorContext {
  endpoint?: string;
  organizationId?: string;
  consultantId?: string | null;
}

type SortBy = "createdAt" | "updatedAt";

interface PaginationParams {
  page: number;
  pageSize: 20 | 50 | 100;
}

interface PaginationMeta extends PaginationParams {
  total: number;
  totalPages: number;
}

interface ListQueryParams extends PaginationParams {
  sortBy: SortBy;
  sortOrder: "desc";
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

type BatchExecutionActor =
  | { type: "cloud-scheduler"; principal: string }
  | { type: "user"; principal: string };

async function authorizeBatchExecution(
  request: NextRequest,
  organizationId: string,
): Promise<BatchExecutionActor> {
  const schedulerPrincipal = await verifyCloudSchedulerAuth(request);
  if (schedulerPrincipal) {
    return {
      type: "cloud-scheduler",
      principal: schedulerPrincipal.serviceAccountEmail,
    };
  }

  const authUser = await verifyAuth(request);
  requireOrganizationRole(authUser, organizationId, "admin", "operator");
  return { type: "user", principal: authUser.uid };
}

function publicForbidden(message = "Invalid booking action request") {
  return jsonError(403, "FORBIDDEN", message);
}

function getAvatarObjectPath(params: {
  organizationId: string;
  consultantId: string;
  contentType: string;
}): string {
  const extension = AVATAR_EXTENSION_BY_CONTENT_TYPE[params.contentType];
  return `organizations/${params.organizationId}/consultants/${params.consultantId}/avatar.${extension}`;
}

function isAllowedAvatarObjectPath(params: {
  objectPath: string;
  organizationId: string;
  consultantId: string;
}): boolean {
  const prefix = `organizations/${params.organizationId}/consultants/${params.consultantId}/avatar.`;
  if (!params.objectPath.startsWith(prefix)) return false;
  const extension = params.objectPath.slice(prefix.length);
  return extension === "jpg" || extension === "png" || extension === "webp";
}

function toBookingSettingsResponse(settings: OrganizationSettings) {
  return {
    consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
    businessHours: settings.getBusinessHours().toJSON(),
    pricePlanRange: settings.getPricePlanRange().toJSON(),
  };
}

function toPublicPricePlanResponse(params: { name: string; totalJPY: number }) {
  return {
    selectionId: createPricePlanSelectionId(params),
    name: params.name,
    totalJPY: params.totalJPY,
  };
}

function toConsultantRanksResponse(settings: OrganizationSettings) {
  return {
    consultantRanks: settings.getConsultantRanks(),
    defaultConsultantRankId: settings.getDefaultConsultantRankId(),
  };
}

function resolveConsultantRank(
  settings: OrganizationSettings,
  rankId: string,
): ConsultantRankProps {
  return (
    settings.findConsultantRank(rankId) ??
    settings.findConsultantRank(settings.getDefaultConsultantRankId()) ??
    settings.getConsultantRanks()[0]
  );
}

function toConsultantRankResponse(rank: ConsultantRankProps) {
  return {
    rankId: rank.rankId,
    name: rank.name,
  };
}

function parseConsultantRanksBody(
  body: unknown,
): { ranks: ConsultantRankProps[]; defaultRankId: string } | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as {
    consultantRanks?: unknown;
    defaultConsultantRankId?: unknown;
  };
  if (
    !Array.isArray(payload.consultantRanks) ||
    typeof payload.defaultConsultantRankId !== "string"
  ) {
    return null;
  }
  const ranks = payload.consultantRanks.map((rank) => {
    if (!rank || typeof rank !== "object") {
      return { rankId: "", name: "" };
    }
    const source = rank as { rankId?: unknown; name?: unknown };
    return {
      rankId: typeof source.rankId === "string" ? source.rankId : "",
      name: typeof source.name === "string" ? source.name : "",
    };
  });
  return {
    ranks,
    defaultRankId: payload.defaultConsultantRankId,
  };
}

function parseSlug(slug?: string[]) {
  return slug ?? [];
}

function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationParams | null {
  const pageRaw = searchParams.get("page");
  const page = pageRaw ? Number(pageRaw) : 1;
  if (!Number.isInteger(page) || page < 1) {
    return null;
  }

  const pageSizeRaw = searchParams.get("pageSize");
  const pageSize = pageSizeRaw ? Number(pageSizeRaw) : 20;
  if (pageSize !== 20 && pageSize !== 50 && pageSize !== 100) {
    return null;
  }

  return {
    page,
    pageSize,
  };
}

function parseSortParams(searchParams: URLSearchParams): SortBy | null {
  const sortByRaw = searchParams.get("sortBy");
  if (!sortByRaw) return "createdAt";
  if (sortByRaw !== "createdAt" && sortByRaw !== "updatedAt") {
    return null;
  }
  return sortByRaw;
}

function parseListQueryParams(
  searchParams: URLSearchParams,
): ListQueryParams | null {
  const pagination = parsePaginationParams(searchParams);
  const sortBy = parseSortParams(searchParams);
  const sortOrderRaw = searchParams.get("sortOrder");
  if (!pagination || !sortBy) return null;
  if (sortOrderRaw && sortOrderRaw !== "desc") return null;
  return {
    ...pagination,
    sortBy,
    sortOrder: "desc",
  };
}

function paginateArray<T>(
  items: T[],
  params: PaginationParams,
): { items: T[]; pagination: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const currentPage = Math.min(params.page, totalPages);
  const start = (currentPage - 1) * params.pageSize;
  const end = start + params.pageSize;

  return {
    items: items.slice(start, end),
    pagination: {
      page: currentPage,
      pageSize: params.pageSize,
      total,
      totalPages,
    },
  };
}

function resolveTimestampForSort(value: Date | string | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortByTimestampDesc<
  T extends { createdAt?: Date | string; updatedAt?: Date | string },
>(items: T[], sortBy: SortBy): T[] {
  const sorted = [...items];
  sorted.sort((left, right) => {
    const leftValue = resolveTimestampForSort(left[sortBy]);
    const rightValue = resolveTimestampForSort(right[sortBy]);
    return rightValue - leftValue;
  });
  return sorted;
}

function isUserRole(role: unknown): role is UserRole {
  return role === "admin" || role === "operator" || role === "consultant";
}

function isAdminPanelUserRole(role: unknown): role is "admin" | "operator" {
  return role === "admin" || role === "operator";
}

function isFirestoreFailedPrecondition(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { code?: unknown; message?: unknown };
  const code = candidate.code;
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  return (
    code === 9 ||
    code === "9" ||
    code === "failed-precondition" ||
    code === "FAILED_PRECONDITION" ||
    message.includes("FAILED_PRECONDITION") ||
    message.includes("requires an index")
  );
}

function logAuthorizationFailure(params: {
  method: string;
  endpoint: string;
  organizationId?: string;
  errorCode: string;
  message: string;
}) {
  console.warn("Authorization failed", {
    category: "security",
    method: params.method,
    endpoint: params.endpoint,
    organizationId: params.organizationId ?? "unknown",
    errorCode: params.errorCode,
    message: params.message,
  });
}

function getBatchChargeRateLimitState(organizationId: string): {
  inProgress: boolean;
  retryAfterSeconds: number;
} {
  if (batchChargeInProgressOrganizations.has(organizationId)) {
    return { inProgress: true, retryAfterSeconds: 1 };
  }

  const lastStartedAt =
    batchChargeLastStartedAtByOrganization.get(organizationId);
  if (!lastStartedAt) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  const elapsedMs = Date.now() - lastStartedAt;
  if (elapsedMs >= BATCH_CHARGE_COOLDOWN_MS) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  return {
    inProgress: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((BATCH_CHARGE_COOLDOWN_MS - elapsedMs) / 1000),
    ),
  };
}

function getBatchConsultationReminderRateLimitState(organizationId: string): {
  inProgress: boolean;
  retryAfterSeconds: number;
} {
  if (batchConsultationReminderInProgressOrganizations.has(organizationId)) {
    return { inProgress: true, retryAfterSeconds: 1 };
  }

  const lastStartedAt =
    batchConsultationReminderLastStartedAtByOrganization.get(organizationId);
  if (!lastStartedAt) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  const elapsedMs = Date.now() - lastStartedAt;
  if (elapsedMs >= BATCH_CONSULTATION_REMINDER_COOLDOWN_MS) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  return {
    inProgress: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((BATCH_CONSULTATION_REMINDER_COOLDOWN_MS - elapsedMs) / 1000),
    ),
  };
}

async function listOrganizationAccounts(organizationId: string) {
  const snapshot = await db
    .collection(ACCOUNT_COLLECTION)
    .where("organizationId", "==", organizationId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as {
      uid: string;
      organizationId: string;
      role: UserRole;
      status: string;
      createdAt?: Timestamp;
      updatedAt?: Timestamp;
    }),
  }));
}

async function getOrganizationAccount(
  organizationId: string,
  uid: string,
): Promise<{
  uid: string;
  organizationId: string;
  role: UserRole;
  status: string;
} | null> {
  const docId = getOrganizationAccountDocId(organizationId, uid);
  const doc = await db.collection(ACCOUNT_COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return doc.data() as {
    uid: string;
    organizationId: string;
    role: UserRole;
    status: string;
  };
}

async function getAdminOrOperatorDisplayNameMap(
  uids: string[],
): Promise<Map<string, string>> {
  const uniqueUids = [...new Set(uids)];
  const nameByUid = new Map<string, string>();
  if (uniqueUids.length === 0) return nameByUid;

  const snapshots = await Promise.all(
    chunkArray(uniqueUids, FIRESTORE_IN_QUERY_CHUNK_SIZE).map((uidChunk) =>
      db
        .collection(ACCOUNT_COLLECTION)
        .where("uid", "in", uidChunk)
        .where("status", "==", "active")
        .get(),
    ),
  );

  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      const data = doc.data() as { uid: string; name?: string };
      if (!data.name) continue;
      if (nameByUid.has(data.uid)) continue;
      nameByUid.set(data.uid, data.name);
    }
  }

  return nameByUid;
}

async function handleGetPublicConsultants(organizationId: string) {
  const repo = createConsultantRepository();
  const [consultants, settings] = await Promise.all([
    repo.findAllActive(organizationId),
    createOrganizationSettingsRepository().findByOrganizationId(organizationId),
  ]);
  const resolvedSettings =
    settings ?? OrganizationSettings.createDefault(organizationId);

  return withNoStore(
    NextResponse.json({
      consultants: consultants.map((c) => {
        const rank = resolveConsultantRank(resolvedSettings, c.getRankId());
        return {
          consultantId: c.getConsultantId(),
          name: c.getProfile().getDisplayName(),
          specialties: [...c.getProfile().getSpecialties()],
          bio: c.getProfile().getBio(),
          imageUrl: c.getProfile().getImageUrl(),
          rank: toConsultantRankResponse(rank),
          isActive: c.getIsActive(),
        };
      }),
    }),
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const requestErrorContext: RequestErrorContext = {};
  try {
    const { organizationId, slug } = await context.params;
    const segments = parseSlug(slug);
    requestErrorContext.organizationId = organizationId;

    if (segments.length === 1 && segments[0] === "consultants") {
      return handleGetPublicConsultants(organizationId);
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "slots"
    ) {
      const authUser = await verifyAuth(request);
      const account = requireOrganizationRole(
        authUser,
        organizationId,
        "admin",
        "operator",
        "consultant",
      );

      const requestedConsultantId =
        request.nextUrl.searchParams.get("consultantId");
      const consultantId =
        account.role === "consultant" ? authUser.uid : requestedConsultantId;
      const repository = createSlotRepository();
      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);
      const businessHours = settings.getBusinessHours();

      if (consultantId) {
        const availableSlots = await repository.findAvailableByConsultantId(
          organizationId,
          consultantId,
        );
        const filteredSlots = availableSlots.filter((slot) =>
          businessHours.containsRange(
            slot.getTimeRange().getStartsAt(),
            slot.getTimeRange().getEndsAt(),
          ),
        );

        return withNoStore(
          NextResponse.json({
            slots: filteredSlots.map((s) => ({
              slotId: s.getSlotId(),
              consultantId: s.getConsultantId(),
              startsAt: s.getTimeRange().getStartsAt().toISOString(),
              endsAt: s.getTimeRange().getEndsAt().toISOString(),
              isAvailable: !s.getIsAvailable(),
            })),
          }),
        );
      }

      const aggregatedSlots = await repository.findAllAvailable(organizationId);
      const groupedSlots = new Map<
        string,
        { startsAt: string; endsAt: string }
      >();

      for (const slot of aggregatedSlots) {
        if (
          !businessHours.containsRange(
            slot.getTimeRange().getStartsAt(),
            slot.getTimeRange().getEndsAt(),
          )
        ) {
          continue;
        }
        const startsAt = slot.getTimeRange().getStartsAt().toISOString();
        const endsAt = slot.getTimeRange().getEndsAt().toISOString();
        const key = `${startsAt}_${endsAt}`;
        if (!groupedSlots.has(key)) {
          groupedSlots.set(key, { startsAt, endsAt });
        }
      }

      return withNoStore(
        NextResponse.json({
          aggregatedSlots: [...groupedSlots.values()],
        }),
      );
    }

    if (segments.length === 1 && segments[0] === "slots") {
      const consultantId = request.nextUrl.searchParams.get("consultantId");
      requestErrorContext.endpoint = "GET /organizations/:organizationId/slots";
      requestErrorContext.consultantId = consultantId;
      const repository = createSlotRepository();
      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);
      const businessHours = settings.getBusinessHours();

      if (consultantId) {
        const availableSlots = await repository.findAvailableByConsultantId(
          organizationId,
          consultantId,
        );
        const filteredSlots = availableSlots.filter((slot) =>
          businessHours.containsRange(
            slot.getTimeRange().getStartsAt(),
            slot.getTimeRange().getEndsAt(),
          ),
        );

        return withPublicShortCache(
          NextResponse.json({
            slots: filteredSlots.map((s) => ({
              slotId: s.getSlotId(),
              consultantId: s.getConsultantId(),
              startsAt: s.getTimeRange().getStartsAt().toISOString(),
              endsAt: s.getTimeRange().getEndsAt().toISOString(),
              isAvailable: !s.getIsAvailable(),
            })),
          }),
          "slots",
        );
      }

      const aggregatedSlots = await repository.findAllAvailable(organizationId);
      const groupedSlots = new Map<
        string,
        { startsAt: string; endsAt: string }
      >();

      for (const slot of aggregatedSlots) {
        if (
          !businessHours.containsRange(
            slot.getTimeRange().getStartsAt(),
            slot.getTimeRange().getEndsAt(),
          )
        ) {
          continue;
        }
        const startsAt = slot.getTimeRange().getStartsAt().toISOString();
        const endsAt = slot.getTimeRange().getEndsAt().toISOString();
        const key = `${startsAt}_${endsAt}`;
        if (!groupedSlots.has(key)) {
          groupedSlots.set(key, { startsAt, endsAt });
        }
      }

      return withPublicShortCache(
        NextResponse.json({
          aggregatedSlots: [...groupedSlots.values()],
        }),
        "slots",
      );
    }

    if (
      segments.length === 2 &&
      segments[0] === "settings" &&
      segments[1] === "public"
    ) {
      const repository = createOrganizationSettingsRepository();
      const settings =
        (await repository.findByOrganizationId(organizationId)) ??
        OrganizationSettings.createDefault(organizationId);

      return withPublicShortCache(
        NextResponse.json(toBookingSettingsResponse(settings)),
        "settings-public",
      );
    }

    if (
      segments.length === 2 &&
      segments[0] === "booking" &&
      segments[1] === "price-plans"
    ) {
      const slotId = request.nextUrl.searchParams.get("slotId");
      const startsAt = request.nextUrl.searchParams.get("startsAt");
      const endsAt = request.nextUrl.searchParams.get("endsAt");
      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);
      const pricePlanRange = settings.getPricePlanRange();
      const pricePlanRepository = createConsultantPricePlanRepository();

      if (slotId) {
        const slot = await createSlotRepository().findById(
          organizationId,
          slotId,
        );
        if (!slot) {
          return withPublicShortCache(
            NextResponse.json({ pricePlans: [] }),
            "booking-price-plans",
          );
        }
        const pricePlans = (
          await pricePlanRepository.findActiveByConsultantId(
            organizationId,
            slot.getConsultantId(),
          )
        )
          .filter((pricePlan) =>
            pricePlanRange.contains(pricePlan.getTotalJPY()),
          )
          .map((pricePlan) =>
            toPublicPricePlanResponse({
              name: pricePlan.getName(),
              totalJPY: pricePlan.getTotalJPY(),
            }),
          );

        return withPublicShortCache(
          NextResponse.json({ pricePlans }),
          "booking-price-plans",
        );
      }

      if (!startsAt || !endsAt) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "slotId or startsAt/endsAt is required",
        );
      }

      const slots = await createSlotRepository().findAvailableByTimeRange(
        organizationId,
        new Date(startsAt),
        new Date(endsAt),
      );
      const consultantIds = [
        ...new Set(slots.map((slot) => slot.getConsultantId())),
      ];
      const plansByConsultant = await Promise.all(
        consultantIds.map((consultantId) =>
          pricePlanRepository.findActiveByConsultantId(
            organizationId,
            consultantId,
          ),
        ),
      );
      const uniquePlans = new Map<string, { name: string; totalJPY: number }>();
      for (const plans of plansByConsultant) {
        for (const pricePlan of plans) {
          if (!pricePlanRange.contains(pricePlan.getTotalJPY())) continue;
          uniquePlans.set(pricePlan.getSelectionId(), {
            name: pricePlan.getName(),
            totalJPY: pricePlan.getTotalJPY(),
          });
        }
      }

      return withPublicShortCache(
        NextResponse.json({
          pricePlans: [...uniquePlans.values()].map(toPublicPricePlanResponse),
        }),
        "booking-price-plans",
      );
    }

    const authUser = await verifyAuth(request);
    const noStoreJson = <T>(payload: T, init?: ResponseInit): NextResponse<T> =>
      withNoStore(NextResponse.json(payload, init)) as NextResponse<T>;
    const noStoreError = (status: number, code: string, message: string) =>
      withNoStore(jsonError(status, code, message));

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "dashboard"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const [bookings, payments, customers, consultants] = await Promise.all([
        createBookingRepository().findAll(organizationId),
        createPaymentRepository().findAll(organizationId),
        createCustomerRepository().findAll(organizationId),
        createConsultantRepository().findAllActive(organizationId),
      ]);

      const totalRevenue = payments
        .filter((p) => p.getStatus().getValue() === "charged")
        .reduce((sum, p) => sum + p.getMoney().getTotalJPY(), 0);

      return noStoreJson({
        organizationId,
        totalBookings: bookings.length,
        totalPayments: payments.length,
        totalCustomers: customers.length,
        totalConsultants: consultants.length,
        totalRevenue,
        bookingsByStatus: {
          pending: bookings.filter(
            (b) => b.getStatus().getValue() === "pending",
          ).length,
          confirmed: bookings.filter(
            (b) => b.getStatus().getValue() === "confirmed",
          ).length,
          completed: bookings.filter(
            (b) => b.getStatus().getValue() === "completed",
          ).length,
          cancelled: bookings.filter(
            (b) => b.getStatus().getValue() === "cancelled",
          ).length,
        },
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "bookings"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const listQueryParams = parseListQueryParams(
        request.nextUrl.searchParams,
      );
      if (!listQueryParams) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "page must be >= 1, pageSize must be one of 20/50/100, and sortBy must be createdAt or updatedAt",
        );
      }
      const bookingRepo = createBookingRepository();
      const paymentRepo = createPaymentRepository();
      const status = request.nextUrl.searchParams.get("status");
      const bookings = status
        ? await bookingRepo.findByStatus(organizationId, status)
        : await bookingRepo.findAll(organizationId);
      const payments = await paymentRepo.findAll(organizationId);
      const paymentByBookingId = new Map(
        payments.map((payment) => [payment.getBookingId(), payment]),
      );

      const bookingItems = sortByTimestampDesc(
        bookings.map((b) => {
          const eligibility = evaluateChargeEligibility({
            booking: b,
            payment: paymentByBookingId.get(b.getBookingId()) ?? null,
          });
          return {
            bookingId: b.getBookingId(),
            customerId: b.getCustomerId(),
            consultantId: b.getConsultantId(),
            slotId: b.getSlotId(),
            startsAt: b.getStartsAt().toISOString(),
            status: b.getStatus().getValue(),
            joinUrl: b.getJoinUrl()?.getValue() ?? null,
            consultantJoinedAt:
              b.getConsultantJoinedAt()?.toISOString() ?? null,
            lateArrivalAlertSentAt:
              b.getLateArrivalAlertSentAt()?.toISOString() ?? null,
            consultantMemo: b.getConsultantMemo().getValue(),
            consultationContent: b.getConsultationContent() ?? null,
            chargeable: eligibility.chargeable,
            chargeDisabledReason: eligibility.reason,
            createdAt: b.getCreatedAt().toISOString(),
            updatedAt: b.getUpdatedAt().toISOString(),
          };
        }),
        listQueryParams.sortBy,
      );
      const { items, pagination } = paginateArray(
        bookingItems,
        listQueryParams,
      );

      return noStoreJson({
        bookings: items,
        pagination,
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "consultants"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const listQueryParams = parseListQueryParams(
        request.nextUrl.searchParams,
      );
      if (!listQueryParams) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "page must be >= 1, pageSize must be one of 20/50/100, and sortBy must be createdAt or updatedAt",
        );
      }
      const repo = createConsultantRepository();
      const [consultants, settings] = await Promise.all([
        repo.findAllActive(organizationId),
        createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        ),
      ]);
      const resolvedSettings =
        settings ?? OrganizationSettings.createDefault(organizationId);
      const userByUid = await getUsersByUids(
        consultants.map((consultant) => consultant.getConsultantId()),
      );

      const consultantsWithEmail = consultants.map((c) => {
        const userRecord = userByUid.get(c.getConsultantId()) ?? null;
        return {
          consultantId: c.getConsultantId(),
          email: userRecord?.email ?? "",
          name: c.getProfile().getDisplayName(),
          bio: c.getProfile().getBio(),
          phone: c.getProfile().getPhone(),
          imageUrl: c.getProfile().getImageUrl(),
          specialties: [...c.getProfile().getSpecialties()],
          zoomRoomIds: c.getZoomRoomIds(),
          rank: toConsultantRankResponse(
            resolveConsultantRank(resolvedSettings, c.getRankId()),
          ),
          isActive: c.getIsActive(),
          createdAt: c.getCreatedAt().toISOString(),
          updatedAt: c.getUpdatedAt().toISOString(),
        };
      });
      const sortedConsultants = sortByTimestampDesc(
        consultantsWithEmail,
        listQueryParams.sortBy,
      );
      const { items, pagination } = paginateArray(
        sortedConsultants,
        listQueryParams,
      );

      return noStoreJson({ consultants: items, pagination });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "customers"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const listQueryParams = parseListQueryParams(
        request.nextUrl.searchParams,
      );
      if (!listQueryParams) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "page must be >= 1, pageSize must be one of 20/50/100, and sortBy must be createdAt or updatedAt",
        );
      }
      const customers =
        await createCustomerRepository().findAll(organizationId);
      const sortedCustomers = sortByTimestampDesc(
        customers.map((c) => ({
          customerId: c.getCustomerId(),
          name: c.getName(),
          email: c.getEmail(),
          phone: c.getPhone(),
          memo: c.getNote() ?? null,
          createdAt: c.getCreatedAt().toISOString(),
          updatedAt: c.getUpdatedAt().toISOString(),
        })),
        listQueryParams.sortBy,
      );
      const { items, pagination } = paginateArray(
        sortedCustomers,
        listQueryParams,
      );
      return noStoreJson({
        customers: items,
        pagination,
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "payments"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const listQueryParams = parseListQueryParams(
        request.nextUrl.searchParams,
      );
      if (!listQueryParams) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "page must be >= 1, pageSize must be one of 20/50/100, and sortBy must be createdAt or updatedAt",
        );
      }
      const payments = await createPaymentRepository().findAll(organizationId);
      const sortedPayments = sortByTimestampDesc(
        payments.map((p) => ({
          paymentId: p.getPaymentId(),
          bookingId: p.getBookingId(),
          customerId: p.getCustomerId(),
          paymentStrategy: p.getPaymentStrategy().getValue(),
          stripePaymentIntentId: p.getStripePaymentIntentId() ?? null,
          stripeSetupIntentId: p.getStripeSetupIntentId() ?? null,
          stripePaymentMethodId: p.getStripePaymentMethodId() ?? null,
          amountJPY: p.getMoney().getAmountJPY(),
          taxAmountJPY: p.getMoney().getTaxAmountJPY(),
          totalJPY: p.getMoney().getTotalJPY(),
          status: p.getStatus().getValue(),
          chargeMethod: p.getChargeMethod() ?? null,
          createdAt: p.getCreatedAt().toISOString(),
          updatedAt: p.getUpdatedAt().toISOString(),
        })),
        listQueryParams.sortBy,
      );
      const { items, pagination } = paginateArray(
        sortedPayments,
        listQueryParams,
      );
      return noStoreJson({
        payments: items,
        pagination,
      });
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "settings" &&
      segments[2] === "booking"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const settings =
        await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        );
      const resolvedSettings =
        settings ?? OrganizationSettings.createDefault(organizationId);
      return noStoreJson(toBookingSettingsResponse(resolvedSettings));
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "settings" &&
      segments[2] === "consultant-ranks"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const settings =
        await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        );
      const resolvedSettings =
        settings ?? OrganizationSettings.createDefault(organizationId);
      return noStoreJson(toConsultantRanksResponse(resolvedSettings));
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "accounts"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const listQueryParams = parseListQueryParams(
        request.nextUrl.searchParams,
      );
      if (!listQueryParams) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "page must be >= 1, pageSize must be one of 20/50/100, and sortBy must be createdAt or updatedAt",
        );
      }
      const organizationAccounts = (
        await listOrganizationAccounts(organizationId)
      ).filter((account) => isAdminPanelUserRole(account.role));
      const accountUids = organizationAccounts.map((account) => account.uid);
      const [userByUid, nameByUid] = await Promise.all([
        getUsersByUids(accountUids),
        getAdminOrOperatorDisplayNameMap(accountUids),
      ]);

      const accounts = organizationAccounts.map((account) => {
        const userRecord = userByUid.get(account.uid) ?? null;
        const name = nameByUid.get(account.uid) ?? "";
        const createdAtDate = account.createdAt?.toDate() ?? new Date(0);
        const updatedAtDate = account.updatedAt?.toDate() ?? createdAtDate;

        return {
          uid: account.uid,
          email: userRecord?.email ?? "",
          name: name || userRecord?.email || "",
          role: account.role,
          status: account.status === "active" ? "registered" : "pending",
          createdAt: createdAtDate.toISOString(),
          updatedAt: updatedAtDate.toISOString(),
        };
      });
      const sortedAccounts = sortByTimestampDesc(
        accounts,
        listQueryParams.sortBy,
      );
      const { items, pagination } = paginateArray(
        sortedAccounts,
        listQueryParams,
      );

      return noStoreJson({ accounts: items, pagination });
    }

    if (
      segments.length === 2 &&
      segments[0] === "consultant" &&
      segments[1] === "bookings"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const listQueryParams = parseListQueryParams(
        request.nextUrl.searchParams,
      );
      if (!listQueryParams) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "page must be >= 1, pageSize must be one of 20/50/100, and sortBy must be createdAt or updatedAt",
        );
      }
      const bookingRepository = createBookingRepository();
      const paymentRepository = createPaymentRepository();
      const customerRepository = createCustomerRepository();
      const [bookings, payments] = await Promise.all([
        bookingRepository.findByConsultantId(organizationId, authUser.uid),
        paymentRepository.findAll(organizationId),
      ]);
      const paymentByBookingId = new Map(
        payments.map((payment) => [payment.getBookingId(), payment]),
      );
      const uniqueCustomerIds = [
        ...new Set(bookings.map((b) => b.getCustomerId())),
      ];
      const customers = await customerRepository.findByIds(
        organizationId,
        uniqueCustomerIds,
      );
      const customerById = new Map(
        customers.map(
          (customer) => [customer.getCustomerId(), customer] as const,
        ),
      );

      const bookingItems = sortByTimestampDesc(
        bookings.map((b) => {
          const eligibility = evaluateChargeEligibility({
            booking: b,
            payment: paymentByBookingId.get(b.getBookingId()) ?? null,
          });
          const customer = customerById.get(b.getCustomerId()) ?? null;

          return {
            bookingId: b.getBookingId(),
            customerId: b.getCustomerId(),
            consultantId: b.getConsultantId(),
            slotId: b.getSlotId(),
            startsAt: b.getStartsAt().toISOString(),
            status: b.getStatus().getValue(),
            joinUrl: b.getJoinUrl()?.getValue() ?? null,
            consultantJoinedAt:
              b.getConsultantJoinedAt()?.toISOString() ?? null,
            lateArrivalAlertSentAt:
              b.getLateArrivalAlertSentAt()?.toISOString() ?? null,
            consultantMemo: b.getConsultantMemo().getValue(),
            consultationContent: b.getConsultationContent() ?? null,
            chargeable: eligibility.chargeable,
            chargeDisabledReason: eligibility.reason,
            customer: customer
              ? {
                  customerId: customer.getCustomerId(),
                  name: customer.getName(),
                  email: customer.getEmail(),
                  phone: customer.getPhone(),
                  memo: customer.getNote() ?? null,
                }
              : null,
            createdAt: b.getCreatedAt().toISOString(),
            updatedAt: b.getUpdatedAt().toISOString(),
          };
        }),
        listQueryParams.sortBy,
      );
      const { items, pagination } = paginateArray(
        bookingItems,
        listQueryParams,
      );

      return noStoreJson({
        bookings: items,
        pagination,
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "consultant" &&
      segments[1] === "price-plans"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);
      const pricePlanRange = settings.getPricePlanRange();
      const pricePlans =
        await createConsultantPricePlanRepository().findByConsultantId(
          organizationId,
          authUser.uid,
        );

      return noStoreJson({
        pricePlans: pricePlans.map((pricePlan) =>
          toConsultantPricePlanOutput({
            pricePlan,
            isWithinCurrentRange: pricePlanRange.contains(
              pricePlan.getTotalJPY(),
            ),
          }),
        ),
        pricePlanRange: pricePlanRange.toJSON(),
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "consultant" &&
      segments[1] === "profile"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const consultant = await createConsultantRepository().findById(
        organizationId,
        authUser.uid,
      );

      if (!consultant) {
        const settings =
          (await createOrganizationSettingsRepository().findByOrganizationId(
            organizationId,
          )) ?? OrganizationSettings.createDefault(organizationId);
        const rank = resolveConsultantRank(
          settings,
          settings.getDefaultConsultantRankId(),
        );
        return noStoreJson({
          consultantId: authUser.uid,
          name: "",
          bio: "",
          phone: "",
          specialties: [],
          zoomRoomIds: [],
          rank: toConsultantRankResponse(rank),
          isActive: true,
        });
      }

      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);
      const profile = consultant.getProfile();
      const rank = resolveConsultantRank(settings, consultant.getRankId());
      return noStoreJson({
        consultantId: consultant.getConsultantId(),
        name: profile.getDisplayName(),
        bio: profile.getBio(),
        phone: profile.getPhone(),
        imageUrl: profile.getImageUrl(),
        specialties: [...profile.getSpecialties()],
        zoomRoomIds: consultant.getZoomRoomIds(),
        rank: toConsultantRankResponse(rank),
        isActive: consultant.getIsActive(),
      });
    }

    return noStoreError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 403) {
        logAuthorizationFailure({
          method: "GET",
          endpoint:
            requestErrorContext.endpoint ?? `GET ${request.nextUrl.pathname}`,
          organizationId: requestErrorContext.organizationId,
          errorCode: error.code,
          message: error.message,
        });
      }
      return withNoStore(
        jsonError(error.statusCode, error.code, error.message),
      );
    }
    if (isFirestoreFailedPrecondition(error)) {
      console.error("Firestore failed precondition on slots query", {
        endpoint: requestErrorContext.endpoint ?? request.nextUrl.pathname,
        organizationId: requestErrorContext.organizationId,
        consultantId: requestErrorContext.consultantId,
        error,
      });
      return withNoStore(
        jsonError(
          500,
          "FIRESTORE_INDEX_MISSING",
          "Required Firestore index is missing. Please deploy Firestore indexes.",
        ),
      );
    }
    return withNoStore(
      jsonError(500, "INTERNAL_ERROR", "Internal server error"),
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const postErrorContext = {
    endpoint: `POST ${request.nextUrl.pathname}`,
    organizationId: "unknown",
    segments: [] as string[],
  };

  try {
    const { organizationId, slug } = await context.params;
    const segments = parseSlug(slug);
    postErrorContext.organizationId = organizationId;
    postErrorContext.segments = segments;

    if (segments.length === 1 && segments[0] === "bookings") {
      const body = await request.json();
      const {
        slotId,
        startsAt,
        endsAt,
        customerName,
        customerEmail,
        customerPhone,
        customerBirthDate,
        consultantContent,
        selectionId,
      } = body;

      if (
        !customerName ||
        !customerEmail ||
        !customerPhone ||
        !customerBirthDate ||
        typeof selectionId !== "string" ||
        selectionId.length === 0
      ) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "customerName, customerEmail, customerPhone, customerBirthDate, selectionId are required",
        );
      }

      const birthDateValidation = validateCustomerBirthdate(customerBirthDate);
      if (!birthDateValidation.valid) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          birthDateValidation.errorMessage ?? "customerBirthDate is invalid",
        );
      }

      const useCase = createCreateBookingUseCase();
      const result = await useCase.execute({
        organizationId,
        slotId: typeof slotId === "string" ? slotId : undefined,
        startsAt: typeof startsAt === "string" ? new Date(startsAt) : undefined,
        endsAt: typeof endsAt === "string" ? new Date(endsAt) : undefined,
        customerName,
        customerEmail,
        customerPhone,
        customerBirthDate: customerBirthDate.trim(),
        consultationContent: consultantContent,
        selectionId,
      });

      const bookingActionToken =
        new HmacBookingActionTokenService().generateToken({
          bookingId: result.bookingId,
          organizationId,
          expiresAt: new Date(Date.now() + BOOKING_ACTION_TOKEN_TTL_MS),
        });

      return NextResponse.json(
        { ...result, bookingActionToken },
        { status: 201 },
      );
    }

    if (
      segments.length === 3 &&
      segments[0] === "bookings" &&
      segments[2] === "setup-payment"
    ) {
      const body = await request.json();
      if (
        body.paymentMethodType !== "card" &&
        body.paymentMethodType !== "paypay"
      ) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "paymentMethodType must be 'card' or 'paypay'",
        );
      }
      if (
        typeof body.bookingActionToken !== "string" ||
        body.bookingActionToken.length === 0
      ) {
        return publicForbidden();
      }

      const tokenPayload = new HmacBookingActionTokenService().verifyToken(
        body.bookingActionToken,
      );
      if (
        !tokenPayload ||
        tokenPayload.bookingId !== segments[1] ||
        tokenPayload.organizationId !== organizationId
      ) {
        return publicForbidden();
      }

      try {
        const result = await createSetupPaymentUseCase().execute({
          organizationId,
          bookingId: segments[1],
          paymentMethodType: body.paymentMethodType,
        });
        return NextResponse.json(result, { status: 201 });
      } catch (error) {
        if (
          error instanceof AppError &&
          (error.code === "BOOKING_NOT_FOUND" ||
            error.code === "PAYMENT_ALREADY_EXISTS")
        ) {
          return publicForbidden();
        }
        throw error;
      }
    }

    if (
      segments.length === 3 &&
      segments[0] === "bookings" &&
      segments[2] === "cancel"
    ) {
      const body = await request.json();
      const { cancelledBy, token } = body;

      if (!cancelledBy || !["customer", "admin"].includes(cancelledBy)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "cancelledBy must be 'customer' or 'admin'",
        );
      }

      if (cancelledBy === "customer") {
        if (!token) {
          return publicForbidden("Invalid booking cancellation request");
        }
        const tokenService = new HmacCancelTokenService();
        const result = tokenService.verifyToken(token);
        if (!result || result.bookingId !== segments[1]) {
          return publicForbidden("Invalid booking cancellation request");
        }
      } else {
        const authUser = await verifyAuth(request);
        requireOrganizationRole(authUser, organizationId, "admin", "operator");
      }

      await createCancelBookingUseCase().execute({
        organizationId,
        bookingId: segments[1],
        cancelledBy,
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 3 &&
      segments[0] === "bookings" &&
      segments[2] === "charge"
    ) {
      const authUser = await verifyAuth(request);
      requireOrganizationRole(authUser, organizationId, "admin", "operator");

      const body = await request.json();
      if (body.method !== "manual") {
        return jsonError(400, "VALIDATION_ERROR", "method must be 'manual'");
      }

      await createChargePaymentUseCase().execute({
        organizationId,
        bookingId: segments[1],
        method: "manual",
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "consultant" &&
      segments[1] === "bookings" &&
      segments[3] === "join"
    ) {
      const authUser = await verifyAuth(request);
      requireOrganizationRole(authUser, organizationId, "consultant");

      await new MarkConsultantJoinedUseCase(
        new FirestoreBookingRepository(),
      ).execute({
        organizationId,
        bookingId: segments[2],
        consultantId: authUser.uid,
        joinedAt: new Date(),
      });

      return NextResponse.json({ success: true });
    }

    if (segments.length === 1 && segments[0] === "slots") {
      const authUser = await verifyAuth(request);
      const account = requireOrganizationRole(
        authUser,
        organizationId,
        "admin",
        "operator",
        "consultant",
      );

      const body = await request.json();
      const { consultantId, startsAt, endsAt } = body;
      if (!consultantId || !startsAt || !endsAt) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultantId, startsAt, and endsAt are required",
        );
      }

      if (account.role === "consultant" && authUser.uid !== consultantId) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Consultants can only create their own slots",
        );
      }

      const slotId = crypto.randomUUID();
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      const repo = createSlotRepository();
      const existingSlots = await repo.findByConsultantId(
        organizationId,
        consultantId,
      );
      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);

      if (!isValidSlotRange(start, end)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "Slots must be exactly 30 minutes and aligned to 30-minute boundaries",
        );
      }

      const newTimeRange = TimeRange.create(start, end);
      if (!settings.getBusinessHours().containsRange(start, end)) {
        return jsonError(
          400,
          "SLOT_OUTSIDE_BUSINESS_HOURS",
          "The selected slot is outside business hours",
        );
      }
      const hasOverlap = existingSlots.some((existingSlot) =>
        existingSlot.getTimeRange().overlaps(newTimeRange),
      );
      if (hasOverlap) {
        return jsonError(
          400,
          "SLOT_CONFLICT",
          "The selected slot overlaps an existing slot",
        );
      }

      const slot = Slot.create({
        organizationId,
        slotId,
        consultantId,
        timeRange: newTimeRange,
      });
      await repo.save(slot);
      return NextResponse.json({ slotId }, { status: 201 });
    }

    if (
      segments.length === 2 &&
      segments[0] === "batch" &&
      segments[1] === "late-arrival-alerts"
    ) {
      const actor = await authorizeBatchExecution(request, organizationId);

      const startedAt = new Date();
      const result = await createNotifyLateConsultantArrivalUseCase().execute({
        organizationId,
        now: startedAt,
      });
      console.info("Late arrival alert batch completed", {
        category: "security-audit",
        endpoint: postErrorContext.endpoint,
        organizationId,
        actorType: actor.type,
        actorPrincipal: actor.principal,
        startedAt: startedAt.toISOString(),
        targetCount: result.targetCount,
        notifiedCount: result.notifiedCount,
        errorCount: result.errors.length,
        errors: result.errors,
      });

      return NextResponse.json(result);
    }

    const authUser = await verifyAuth(request);

    if (
      segments.length === 2 &&
      segments[0] === "consultant" &&
      segments[1] === "price-plans"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const body = await request.json();
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return jsonError(400, "VALIDATION_ERROR", "name is required");
      }
      if (!Number.isInteger(body.totalJPY)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "totalJPY must be an integer",
        );
      }

      const result = await createCreateConsultantPricePlanUseCase().execute({
        organizationId,
        consultantId: authUser.uid,
        name: body.name,
        totalJPY: body.totalJPY,
      });

      return NextResponse.json(result, { status: 201 });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "consultants"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const body = await request.json();
      const { consultantId, name, bio, specialties, phone, zoomRoomIds } = body;
      if (!consultantId || !name) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultantId and name are required",
        );
      }
      if (body.rankId !== undefined) {
        requireOrganizationRole(authUser, organizationId, "admin");
      }

      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);
      const rankId = body.rankId ?? settings.getDefaultConsultantRankId();
      if (typeof rankId !== "string" || !settings.findConsultantRank(rankId)) {
        return jsonError(400, "VALIDATION_ERROR", "rankId is invalid");
      }

      const consultant = Consultant.create({
        organizationId,
        consultantId,
        profile: ConsultantProfile.create(
          name,
          bio ?? "",
          specialties ?? [],
          phone ?? "",
        ),
        zoomRoomIds: zoomRoomIds ?? [],
        rankId,
      });

      await createConsultantRepository().save(consultant);
      return NextResponse.json({ consultantId }, { status: 201 });
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "accounts" &&
      segments[2] === "invite"
    ) {
      const actorAccount = requireOrganizationRole(
        authUser,
        organizationId,
        "admin",
        "operator",
      );
      const body = await request.json();
      const { email, role, name, phone } = body;

      if (!email || typeof email !== "string") {
        return jsonError(400, "VALIDATION_ERROR", "email is required");
      }
      if (!isUserRole(role)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "role must be one of: admin, operator, consultant",
        );
      }
      if (!name || typeof name !== "string") {
        return jsonError(400, "VALIDATION_ERROR", "name is required");
      }
      const normalizedDisplayName = name.trim();
      if (!normalizedDisplayName) {
        return jsonError(400, "VALIDATION_ERROR", "name must not be empty");
      }

      let uid: string;
      let userRecord = await getUserByEmail(email).catch(() => null);

      if (userRecord) {
        uid = userRecord.uid;
      } else {
        uid = await createUser(email, crypto.randomUUID());
        userRecord = await getUser(uid);
      }

      const accountId = getOrganizationAccountDocId(organizationId, uid);
      await db
        .collection(ACCOUNT_COLLECTION)
        .doc(accountId)
        .set(
          {
            uid,
            organizationId,
            role,
            status: userRecord.metadata.lastSignInTime ? "active" : "invited",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true },
        );

      if (role === "consultant") {
        const repo = createConsultantRepository();
        const existing = await repo.findById(organizationId, uid);
        if (!existing) {
          const settings =
            (await createOrganizationSettingsRepository().findByOrganizationId(
              organizationId,
            )) ?? OrganizationSettings.createDefault(organizationId);
          await repo.save(
            Consultant.create({
              organizationId,
              consultantId: uid,
              profile: ConsultantProfile.create(
                normalizedDisplayName,
                "",
                [],
                typeof phone === "string" ? phone.trim() : "",
              ),
              zoomRoomIds: [],
              rankId: settings.getDefaultConsultantRankId(),
            }),
          );
        }
      } else {
        await setUserDisplayName(uid, normalizedDisplayName);
      }

      const passwordResetLink = await generatePasswordResetLink(email);
      await new ResendEmailService().sendInvitation({
        email,
        role,
        passwordResetLink,
      });

      console.info("Admin account invited", {
        category: "security-audit",
        endpoint: postErrorContext.endpoint,
        organizationId,
        actorUid: authUser.uid,
        actorRole: actorAccount.role,
        targetEmail: email,
        targetRole: role,
        invitedAt: new Date().toISOString(),
      });

      return NextResponse.json({ uid }, { status: 201 });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "accounts" &&
      segments[3] === "resend-invite"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const userRecord = await getUser(segments[2]);
      const account = await getOrganizationAccount(organizationId, segments[2]);
      if (!account) {
        return jsonError(404, "NOT_FOUND", "Account not found");
      }
      if (!isAdminPanelUserRole(account.role)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultant must be managed from consultant management",
        );
      }

      if (!userRecord.email) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "アカウントにメールアドレスがありません",
        );
      }

      await new ResendEmailService().sendInvitation({
        email: userRecord.email,
        role: account.role,
        passwordResetLink: await generatePasswordResetLink(userRecord.email),
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "accounts" &&
      segments[3] === "reset-password"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const account = await getOrganizationAccount(organizationId, segments[2]);
      if (!account) {
        return jsonError(404, "NOT_FOUND", "Account not found");
      }
      if (!isAdminPanelUserRole(account.role)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultant must be managed from consultant management",
        );
      }
      const userRecord = await getUser(segments[2]);
      if (!userRecord.email) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "アカウントにメールアドレスがありません",
        );
      }

      await new ResendEmailService().sendPasswordReset({
        email: userRecord.email,
        passwordResetLink: await generatePasswordResetLink(userRecord.email),
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 3 &&
      segments[0] === "consultant" &&
      segments[1] === "profile" &&
      segments[2] === "avatar-upload-url"
    ) {
      const authUser = await verifyAuth(request);
      requireOrganizationRole(authUser, organizationId, "consultant");
      const body = await request.json();
      const contentType = body.contentType;
      const fileSize = body.fileSize;

      if (typeof contentType !== "string" || !contentType) {
        return jsonError(400, "VALIDATION_ERROR", "contentType is required");
      }
      if (!ALLOWED_AVATAR_CONTENT_TYPES.has(contentType)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "contentType must be one of image/jpeg, image/png, image/webp",
        );
      }
      if (typeof fileSize !== "number" || fileSize <= 0) {
        return jsonError(400, "VALIDATION_ERROR", "fileSize is required");
      }
      if (fileSize > AVATAR_MAX_FILE_SIZE) {
        return jsonError(400, "VALIDATION_ERROR", "fileSize exceeds 5MB limit");
      }

      const objectPath = getAvatarObjectPath({
        organizationId,
        consultantId: authUser.uid,
        contentType,
      });
      const bucketName = envServer.firebaseStorageBucket;
      const expiresAt = Date.now() + AVATAR_UPLOAD_URL_TTL_MS;
      const file = getStorage(app).bucket(bucketName).file(objectPath);
      const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: expiresAt,
        contentType,
      });

      return NextResponse.json({
        uploadUrl,
        objectPath,
        contentType,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    }

    if (
      segments.length === 3 &&
      segments[0] === "consultant" &&
      segments[1] === "profile" &&
      segments[2] === "avatar-publish"
    ) {
      const authUser = await verifyAuth(request);
      requireOrganizationRole(authUser, organizationId, "consultant");
      const body = await request.json();
      const objectPath = body.objectPath;

      if (typeof objectPath !== "string" || !objectPath) {
        return jsonError(400, "VALIDATION_ERROR", "objectPath is required");
      }

      if (
        !isAllowedAvatarObjectPath({
          objectPath,
          organizationId,
          consultantId: authUser.uid,
        })
      ) {
        return jsonError(400, "VALIDATION_ERROR", "invalid objectPath");
      }

      const bucketName = envServer.firebaseStorageBucket;
      const file = getStorage(app).bucket(bucketName).file(objectPath);
      const [exists] = await file.exists();
      if (!exists) {
        return jsonError(404, "NOT_FOUND", "avatar file not found");
      }

      await file.makePublic();

      return NextResponse.json({
        imageUrl: `https://storage.googleapis.com/${bucketName}/${objectPath}?v=${Date.now()}`,
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "batch" &&
      segments[1] === "charge"
    ) {
      const actor = await authorizeBatchExecution(request, organizationId);

      const rateLimitState = getBatchChargeRateLimitState(organizationId);
      if (rateLimitState.inProgress) {
        return jsonError(
          409,
          "BATCH_CHARGE_IN_PROGRESS",
          "Batch charge is already running for this organization",
        );
      }
      if (rateLimitState.retryAfterSeconds > 0) {
        return jsonError(
          429,
          "BATCH_CHARGE_RATE_LIMITED",
          `Batch charge can be retried after ${rateLimitState.retryAfterSeconds} seconds`,
        );
      }

      batchChargeInProgressOrganizations.add(organizationId);
      batchChargeLastStartedAtByOrganization.set(organizationId, Date.now());
      const startedAt = new Date();

      try {
        const result = await createBatchChargeUseCase().execute(organizationId);
        console.info("Batch charge completed", {
          category: "security-audit",
          endpoint: postErrorContext.endpoint,
          organizationId,
          actorType: actor.type,
          actorPrincipal: actor.principal,
          startedAt: startedAt.toISOString(),
          chargedCount: result.chargedCount,
          completedCount: result.completedCount,
          errorCount: result.errors.length,
          errors: result.errors,
        });
        return NextResponse.json({
          chargedCount: result.chargedCount,
          completedCount: result.completedCount,
        });
      } catch (error) {
        console.error("Batch charge failed", {
          category: "security-audit",
          endpoint: postErrorContext.endpoint,
          organizationId,
          actorType: actor.type,
          actorPrincipal: actor.principal,
          startedAt: startedAt.toISOString(),
          error,
        });
        throw error;
      } finally {
        batchChargeInProgressOrganizations.delete(organizationId);
      }
    }

    if (
      segments.length === 2 &&
      segments[0] === "batch" &&
      segments[1] === "consultation-reminders"
    ) {
      const actor = await authorizeBatchExecution(request, organizationId);

      const rateLimitState =
        getBatchConsultationReminderRateLimitState(organizationId);
      if (rateLimitState.inProgress) {
        return jsonError(
          409,
          "BATCH_CONSULTATION_REMINDER_IN_PROGRESS",
          "Batch consultation reminder is already running for this organization",
        );
      }
      if (rateLimitState.retryAfterSeconds > 0) {
        return jsonError(
          429,
          "BATCH_CONSULTATION_REMINDER_RATE_LIMITED",
          `Batch consultation reminder can be retried after ${rateLimitState.retryAfterSeconds} seconds`,
        );
      }

      batchConsultationReminderInProgressOrganizations.add(organizationId);
      batchConsultationReminderLastStartedAtByOrganization.set(
        organizationId,
        Date.now(),
      );
      const startedAt = new Date();

      try {
        const result =
          await createSendConsultationReminderUseCase().execute(organizationId);
        console.info("Batch consultation reminder completed", {
          category: "security-audit",
          endpoint: postErrorContext.endpoint,
          organizationId,
          actorType: actor.type,
          actorPrincipal: actor.principal,
          startedAt: startedAt.toISOString(),
          sentCount: result.sentCount,
          skippedCount: result.skippedCount,
          errorCount: result.errors.length,
          errors: result.errors,
        });
        return NextResponse.json({
          sentCount: result.sentCount,
          skippedCount: result.skippedCount,
        });
      } catch (error) {
        console.error("Batch consultation reminder failed", {
          category: "security-audit",
          endpoint: postErrorContext.endpoint,
          organizationId,
          actorType: actor.type,
          actorPrincipal: actor.principal,
          startedAt: startedAt.toISOString(),
          error,
        });
        throw error;
      } finally {
        batchConsultationReminderInProgressOrganizations.delete(organizationId);
      }
    }

    return jsonError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 403) {
        logAuthorizationFailure({
          method: "POST",
          endpoint: postErrorContext.endpoint,
          organizationId: postErrorContext.organizationId,
          errorCode: error.code,
          message: error.message,
        });
      }
      return jsonError(error.statusCode, error.code, error.message);
    }
    logUnexpectedPostError(error, postErrorContext);
    const mappedError = mapApiError(error);
    return jsonError(mappedError.status, mappedError.code, mappedError.message);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const patchErrorContext = {
    endpoint: `PATCH ${request.nextUrl.pathname}`,
    organizationId: "unknown",
  };

  try {
    const { organizationId, slug } = await context.params;
    const segments = parseSlug(slug);
    patchErrorContext.organizationId = organizationId;
    const authUser = await verifyAuth(request);

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "settings" &&
      segments[2] === "consultant-ranks"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin");
      const body = await request.json();
      const parsed = parseConsultantRanksBody(body);
      if (!parsed) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultantRanks and defaultConsultantRankId are required",
        );
      }

      const settingsRepository = createOrganizationSettingsRepository();
      const settings =
        (await settingsRepository.findByOrganizationId(organizationId)) ??
        OrganizationSettings.createDefault(organizationId);
      settings.updateConsultantRanks(parsed.ranks, parsed.defaultRankId);
      await settingsRepository.save(settings);

      const rankIds = new Set(
        settings.getConsultantRanks().map((rank) => rank.rankId),
      );
      const consultantRepository = createConsultantRepository();
      const consultants = await consultantRepository.findAll(organizationId);
      await Promise.all(
        consultants
          .filter((consultant) => !rankIds.has(consultant.getRankId()))
          .map((consultant) => {
            consultant.changeRank(settings.getDefaultConsultantRankId());
            return consultantRepository.save(consultant);
          }),
      );

      return NextResponse.json(toConsultantRanksResponse(settings));
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "settings" &&
      segments[2] === "booking"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin");
      const body = await request.json();
      if (typeof body.consultantSelectionEnabled !== "boolean") {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultantSelectionEnabled must be a boolean",
        );
      }

      const repository = createOrganizationSettingsRepository();
      const settings =
        (await repository.findByOrganizationId(organizationId)) ??
        OrganizationSettings.createDefault(organizationId);
      const nextBusinessHours = BusinessHours.create(
        (body.businessHours ??
          settings.getBusinessHours().toJSON()) as ReturnType<
          BusinessHours["toJSON"]
        >,
      );
      const nextPricePlanRange =
        body.pricePlanRange ?? settings.getPricePlanRange().toJSON();
      settings.updateConsultantSelectionEnabled(
        body.consultantSelectionEnabled,
      );
      settings.updateBusinessHours(nextBusinessHours.toJSON());
      settings.updatePricePlanRange(nextPricePlanRange);
      await repository.save(settings);

      const slotRepository = createSlotRepository();
      const now = new Date();
      const allSlots =
        await slotRepository.findByOrganizationId(organizationId);
      const removableSlotIds = allSlots
        .filter((slot) => {
          if (slot.getIsAvailable()) return false;
          if (slot.getTimeRange().getStartsAt() <= now) return false;
          return !nextBusinessHours.containsRange(
            slot.getTimeRange().getStartsAt(),
            slot.getTimeRange().getEndsAt(),
          );
        })
        .map((slot) => slot.getSlotId());
      await Promise.all(
        removableSlotIds.map((slotId) =>
          slotRepository.delete(organizationId, slotId),
        ),
      );

      return NextResponse.json(toBookingSettingsResponse(settings));
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "consultants"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const consultantId = segments[2];
      const body = await request.json();
      const repo = createConsultantRepository();
      const consultant = await repo.findById(organizationId, consultantId);
      if (!consultant) {
        return jsonError(404, "NOT_FOUND", "Consultant not found");
      }

      if (body.name) {
        consultant.updateProfile(
          ConsultantProfile.create(
            body.name,
            body.bio ?? consultant.getProfile().getBio(),
            body.specialties ?? [...consultant.getProfile().getSpecialties()],
            body.phone ?? consultant.getProfile().getPhone(),
            consultant.getProfile().getImageUrl(),
          ),
        );
      }

      if (body.zoomRoomIds) {
        consultant.assignZoomRooms(body.zoomRoomIds);
      }

      if (body.rankId !== undefined) {
        requireOrganizationRole(authUser, organizationId, "admin");
        const settings =
          (await createOrganizationSettingsRepository().findByOrganizationId(
            organizationId,
          )) ?? OrganizationSettings.createDefault(organizationId);
        if (
          typeof body.rankId !== "string" ||
          !settings.findConsultantRank(body.rankId)
        ) {
          return jsonError(400, "VALIDATION_ERROR", "rankId is invalid");
        }
        consultant.changeRank(body.rankId);
      }

      await repo.save(consultant);
      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 3 &&
      segments[0] === "consultant" &&
      segments[1] === "price-plans"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const body = await request.json();
      if (
        body.name !== undefined &&
        (typeof body.name !== "string" || body.name.trim().length === 0)
      ) {
        return jsonError(400, "VALIDATION_ERROR", "name is required");
      }
      if (body.restore !== undefined && typeof body.restore !== "boolean") {
        return jsonError(400, "VALIDATION_ERROR", "restore must be a boolean");
      }

      await createUpdateConsultantPricePlanUseCase().execute({
        organizationId,
        consultantId: authUser.uid,
        pricePlanId: segments[2],
        name: body.name,
        restore: body.restore,
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "accounts" &&
      segments[3] === "display-name"
    ) {
      const actorAccount = requireOrganizationRole(
        authUser,
        organizationId,
        "admin",
        "operator",
      );
      const body = await request.json();
      const account = await getOrganizationAccount(organizationId, segments[2]);

      if (!account) {
        return jsonError(404, "NOT_FOUND", "Account not found");
      }
      if (account.role === "consultant") {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultant display name must be updated from consultant profile",
        );
      }
      if (
        !canUpdateDisplayNameTarget(
          actorAccount.role,
          authUser.uid,
          segments[2],
        )
      ) {
        return jsonError(
          403,
          "FORBIDDEN",
          "operator can only update their own display name",
        );
      }
      if (!body.name || typeof body.name !== "string") {
        return jsonError(400, "VALIDATION_ERROR", "name is required");
      }

      const normalizedDisplayName = body.name.trim();
      if (!normalizedDisplayName) {
        return jsonError(400, "VALIDATION_ERROR", "name must not be empty");
      }

      await setUserDisplayName(segments[2], normalizedDisplayName);
      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "accounts" &&
      segments[3] === "role"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin");
      const body = await request.json();
      if (!isAdminPanelUserRole(body.role)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "role must be one of: admin, operator",
        );
      }
      const account = await getOrganizationAccount(organizationId, segments[2]);
      if (!account) {
        return jsonError(404, "NOT_FOUND", "Account not found");
      }
      if (!isAdminPanelUserRole(account.role)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultant must be managed from consultant management",
        );
      }
      const activeAdminCount = (
        await listOrganizationAccounts(organizationId)
      ).filter(
        (organizationAccount) =>
          organizationAccount.role === "admin" &&
          organizationAccount.status === "active",
      ).length;

      if (
        isLastAdminSelfDemotion({
          actorUid: authUser.uid,
          targetUid: segments[2],
          nextRole: body.role,
          activeAdminCount,
        })
      ) {
        return jsonError(
          400,
          "LAST_ADMIN_ROLE_CHANGE_FORBIDDEN",
          "最後の管理者は自分自身をオペレーターに変更できません",
        );
      }

      const accountId = getOrganizationAccountDocId(
        organizationId,
        segments[2],
      );
      await db.collection(ACCOUNT_COLLECTION).doc(accountId).set(
        {
          role: body.role,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "consultant" &&
      segments[1] === "bookings" &&
      segments[3] === "memo"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const body = await request.json();
      if (typeof body.memo !== "string") {
        return jsonError(400, "VALIDATION_ERROR", "memo is required");
      }

      await new UpdateMemoUseCase(new FirestoreBookingRepository()).execute({
        organizationId,
        bookingId: segments[2],
        consultantId: authUser.uid,
        memo: body.memo,
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 2 &&
      segments[0] === "consultant" &&
      segments[1] === "profile"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const body = await request.json();
      if (!body.name || !Array.isArray(body.specialties)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "name and specialties are required",
        );
      }

      await new UpdateProfileUseCase(
        new FirestoreConsultantRepository(),
      ).execute({
        organizationId,
        consultantId: authUser.uid,
        name: body.name,
        bio: body.bio ?? "",
        specialties: body.specialties,
        phone: body.phone ?? "",
        imageUrl: body.imageUrl,
      });

      return NextResponse.json({ success: true });
    }

    return jsonError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 403) {
        logAuthorizationFailure({
          method: "PATCH",
          endpoint: patchErrorContext.endpoint,
          organizationId: patchErrorContext.organizationId,
          errorCode: error.code,
          message: error.message,
        });
      }
      return jsonError(error.statusCode, error.code, error.message);
    }
    if (error instanceof DomainError) {
      return jsonError(400, error.code, error.message);
    }
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const deleteErrorContext = {
    endpoint: `DELETE ${request.nextUrl.pathname}`,
    organizationId: "unknown",
  };

  try {
    const { organizationId, slug } = await context.params;
    const segments = parseSlug(slug);
    deleteErrorContext.organizationId = organizationId;
    const authUser = await verifyAuth(request);

    if (segments.length === 2 && segments[0] === "slots") {
      const account = requireOrganizationRole(
        authUser,
        organizationId,
        "admin",
        "operator",
        "consultant",
      );
      const slotId = segments[1];
      const repo = createSlotRepository();
      const slot = await repo.findById(organizationId, slotId);
      if (!slot) {
        return jsonError(404, "NOT_FOUND", "Slot not found");
      }
      if (
        account.role === "consultant" &&
        slot.getConsultantId() !== authUser.uid
      ) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Consultants can only delete their own slots",
        );
      }
      await repo.delete(organizationId, slotId);
      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "consultants"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const repo = createConsultantRepository();
      const consultant = await repo.findById(organizationId, segments[2]);
      if (!consultant) {
        return jsonError(404, "NOT_FOUND", "Consultant not found");
      }
      consultant.deactivate();
      await repo.save(consultant);
      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 3 &&
      segments[0] === "consultant" &&
      segments[1] === "price-plans"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const pricePlan = await createConsultantPricePlanRepository().findById(
        organizationId,
        segments[2],
      );
      if (!pricePlan || pricePlan.getConsultantId() !== authUser.uid) {
        return jsonError(404, "PRICE_PLAN_NOT_FOUND", "Plan not found");
      }
      pricePlan.delete();
      await createConsultantPricePlanRepository().save(pricePlan);
      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "accounts"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin");
      const accountId = getOrganizationAccountDocId(
        organizationId,
        segments[2],
      );
      const account = await getOrganizationAccount(organizationId, segments[2]);
      if (!account) {
        return jsonError(404, "NOT_FOUND", "Account not found");
      }
      const deletionTargetValidation = validateAdminUserDeletionTarget(
        authUser.uid,
        segments[2],
        account.role,
      );
      if (!deletionTargetValidation.isAllowed) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          deletionTargetValidation.message ?? "Invalid user delete target",
        );
      }
      const accountDocRef = db.collection(ACCOUNT_COLLECTION).doc(accountId);
      const accountDoc = await accountDocRef.get();
      const accountData = accountDoc.data();
      if (!accountData) {
        return jsonError(404, "NOT_FOUND", "Account not found");
      }

      await deleteAdminUserWithAuthCleanup({
        uid: segments[2],
        accountData,
        countAccountsByUid: async (uid) => {
          const accounts = await db
            .collection(ACCOUNT_COLLECTION)
            .where("uid", "==", uid)
            .get();
          return accounts.size;
        },
        deleteAccount: async () => {
          await accountDocRef.delete();
        },
        restoreAccount: async (restorableAccountData) => {
          await accountDocRef.set(restorableAccountData);
        },
        deleteAuthUser: deleteUser,
      });

      return NextResponse.json({ success: true });
    }

    return jsonError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 403) {
        logAuthorizationFailure({
          method: "DELETE",
          endpoint: deleteErrorContext.endpoint,
          organizationId: deleteErrorContext.organizationId,
          errorCode: error.code,
          message: error.message,
        });
      }
      return jsonError(error.statusCode, error.code, error.message);
    }
    if (error instanceof DomainError) {
      return jsonError(400, error.code, error.message);
    }
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}
