import crypto from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { evaluateChargeEligibility } from "@/application/booking/charge-eligibility";
import { UpdateMemoUseCase } from "@/application/consultant/update-memo-use-case";
import { UpdateProfileUseCase } from "@/application/consultant/update-profile-use-case";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { BusinessHours } from "@/domain/organization-settings/business-hours";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import { DomainError } from "@/domain/shared/domain-error";
import { Slot } from "@/domain/slot/slot";
import { isValidSlotRange } from "@/domain/slot/slot-availability";
import { TimeRange } from "@/domain/slot/time-range";
import type { UserRole } from "@/infrastructure/auth/auth-types";
import {
  getOrganizationMembershipDocId,
  setUserDisplayName,
} from "@/infrastructure/auth/load-auth-context";
import { requireOrganizationRole } from "@/infrastructure/auth/require-organization-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createBatchChargeUseCase,
  createBookingRepository,
  createCancelBookingUseCase,
  createChargePaymentUseCase,
  createClientRepository,
  createConsultantRepository,
  createCreateBookingUseCase,
  createOrganizationSettingsRepository,
  createPaymentRepository,
  createSetupPaymentUseCase,
  createSlotRepository,
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
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { FirestoreConsultantRepository } from "@/infrastructure/firestore/firestore-consultant-repository";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import { HmacCancelTokenService } from "@/infrastructure/token/cancel-token-service";
import { chunkArray } from "@/lib/chunk-array";
import { deleteAdminUserWithAuthCleanup } from "./admin-user-deletion";
import {
  canUpdateDisplayNameTarget,
  isLastAdminSelfDemotion,
  validateAdminUserDeletionTarget,
} from "./admin-user-policy";
import { logUnexpectedPostError, mapApiError } from "./api-error-mapper";
import { withPublicCacheControl } from "./public-cache-control";

const MEMBERSHIP_COLLECTION = FIRESTORE_COLLECTIONS.organizationMemberships;
const USER_PREFERENCES_COLLECTION = FIRESTORE_COLLECTIONS.userPreferences;
const FIRESTORE_IN_QUERY_CHUNK_SIZE = 10;

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

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

function toBookingSettingsResponse(settings: OrganizationSettings) {
  return {
    consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
    businessHours: settings.getBusinessHours().toJSON(),
  };
}

function parseSlug(slug?: string[]) {
  return slug ?? [];
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

async function listOrganizationMemberships(organizationId: string) {
  const snapshot = await db
    .collection(MEMBERSHIP_COLLECTION)
    .where("organizationId", "==", organizationId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as {
      uid: string;
      organizationId: string;
      role: UserRole;
      status: string;
      createdAt?: Date;
    }),
  }));
}

async function getOrganizationMembership(
  organizationId: string,
  uid: string,
): Promise<{
  uid: string;
  organizationId: string;
  role: UserRole;
  status: string;
} | null> {
  const docId = getOrganizationMembershipDocId(organizationId, uid);
  const doc = await db.collection(MEMBERSHIP_COLLECTION).doc(docId).get();
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
  const displayNameByUid = new Map<string, string>();
  if (uniqueUids.length === 0) return displayNameByUid;

  const snapshots = await Promise.all(
    chunkArray(uniqueUids, FIRESTORE_IN_QUERY_CHUNK_SIZE).map((uidChunk) =>
      db
        .collection(USER_PREFERENCES_COLLECTION)
        .where(FieldPath.documentId(), "in", uidChunk)
        .get(),
    ),
  );

  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      const data = doc.data() as { displayName?: string };
      if (!data.displayName) continue;
      displayNameByUid.set(doc.id, data.displayName);
    }
  }

  return displayNameByUid;
}

async function handleGetPublicConsultants(organizationId: string) {
  const repo = createConsultantRepository();
  const consultants = await repo.findAllActive(organizationId);

  return withPublicCacheControl(
    NextResponse.json({
      consultants: consultants.map((c) => ({
        consultantId: c.getConsultantId(),
        name: c.getProfile().getDisplayName(),
        specialties: [...c.getProfile().getSpecialties()],
        bio: c.getProfile().getBio(),
        isActive: c.getIsActive(),
      })),
    }),
    "consultants",
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
            slot.getTimeRange().getStartAt(),
            slot.getTimeRange().getEndAt(),
          ),
        );

        return withPublicCacheControl(
          NextResponse.json({
            slots: filteredSlots.map((s) => ({
              slotId: s.getSlotId(),
              consultantId: s.getConsultantId(),
              startDatetime: s.getTimeRange().getStartAt().toISOString(),
              endDatetime: s.getTimeRange().getEndAt().toISOString(),
              isAvailable: !s.getIsReserved(),
            })),
          }),
          "slots",
        );
      }

      const aggregatedSlots = await repository.findAllAvailable(organizationId);
      const groupedSlots = new Map<
        string,
        { startDatetime: string; endDatetime: string }
      >();

      for (const slot of aggregatedSlots) {
        if (
          !businessHours.containsRange(
            slot.getTimeRange().getStartAt(),
            slot.getTimeRange().getEndAt(),
          )
        ) {
          continue;
        }
        const startDatetime = slot.getTimeRange().getStartAt().toISOString();
        const endDatetime = slot.getTimeRange().getEndAt().toISOString();
        const key = `${startDatetime}_${endDatetime}`;
        if (!groupedSlots.has(key)) {
          groupedSlots.set(key, { startDatetime, endDatetime });
        }
      }

      return withPublicCacheControl(
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

      return withPublicCacheControl(
        NextResponse.json(toBookingSettingsResponse(settings)),
        "settings-public",
      );
    }

    const authUser = await verifyAuth(request);

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "dashboard"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const [bookings, payments, clients, consultants] = await Promise.all([
        createBookingRepository().findAll(organizationId),
        createPaymentRepository().findAll(organizationId),
        createClientRepository().findAll(organizationId),
        createConsultantRepository().findAllActive(organizationId),
      ]);

      const totalRevenue = payments
        .filter((p) => p.getStatus().getValue() === "charged")
        .reduce((sum, p) => sum + p.getMoney().getTotalJPY(), 0);

      return NextResponse.json({
        organizationId,
        totalBookings: bookings.length,
        totalPayments: payments.length,
        totalClients: clients.length,
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

      return NextResponse.json({
        bookings: bookings.map((b) => {
          const eligibility = evaluateChargeEligibility({
            booking: b,
            payment: paymentByBookingId.get(b.getBookingId()) ?? null,
          });
          return {
            bookingId: b.getBookingId(),
            clientId: b.getClientId(),
            consultantId: b.getConsultantId(),
            slotId: b.getSlotId(),
            startDatetime: b.getStartDatetime().toISOString(),
            status: b.getStatus().getValue(),
            zoomUrl: b.getZoomUrl()?.getValue() ?? null,
            consultantMemo: b.getConsultantMemo().getValue(),
            consultationContent: b.getConsultationContent() ?? null,
            chargeable: eligibility.chargeable,
            chargeDisabledReason: eligibility.reason,
          };
        }),
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "consultants"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const repo = createConsultantRepository();
      const consultants = await repo.findAllActive(organizationId);
      const userByUid = await getUsersByUids(
        consultants.map((consultant) => consultant.getConsultantId()),
      );

      const consultantsWithEmail = consultants.map((c) => {
        const userRecord = userByUid.get(c.getConsultantId()) ?? null;
        return {
          consultantId: c.getConsultantId(),
          email: userRecord?.email ?? "",
          displayName: c.getProfile().getDisplayName(),
          bio: c.getProfile().getBio(),
          specialties: [...c.getProfile().getSpecialties()],
          zoomRoomIds: c.getZoomRoomIds(),
          isActive: c.getIsActive(),
        };
      });

      return NextResponse.json({ consultants: consultantsWithEmail });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "clients"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const clients = await createClientRepository().findAll(organizationId);
      return NextResponse.json({
        clients: clients.map((c) => ({
          clientId: c.getClientId(),
          name: c.getName(),
          email: c.getEmail(),
          phone: c.getPhone(),
          memo: c.getMemo() ?? null,
        })),
      });
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "payments"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const payments = await createPaymentRepository().findAll(organizationId);
      return NextResponse.json({
        payments: payments.map((p) => ({
          paymentId: p.getPaymentId(),
          bookingId: p.getBookingId(),
          clientId: p.getClientId(),
          paymentStrategy: p.getPaymentStrategy().getValue(),
          stripePaymentIntentId: p.getStripePaymentIntentId() ?? null,
          stripeSetupIntentId: p.getStripeSetupIntentId() ?? null,
          stripePaymentMethodId: p.getStripePaymentMethodId() ?? null,
          amountJPY: p.getMoney().getAmountJPY(),
          taxAmountJPY: p.getMoney().getTaxAmountJPY(),
          totalJPY: p.getMoney().getTotalJPY(),
          status: p.getStatus().getValue(),
          chargeMethod: p.getChargeMethod() ?? null,
        })),
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
      return NextResponse.json(toBookingSettingsResponse(resolvedSettings));
    }

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "users"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const memberships = (
        await listOrganizationMemberships(organizationId)
      ).filter((membership) => isAdminPanelUserRole(membership.role));
      const memberUids = memberships.map((membership) => membership.uid);
      const [userByUid, displayNameByUid] = await Promise.all([
        getUsersByUids(memberUids),
        getAdminOrOperatorDisplayNameMap(memberUids),
      ]);

      const users = memberships.map((membership) => {
        const userRecord = userByUid.get(membership.uid) ?? null;
        const displayName = displayNameByUid.get(membership.uid) ?? "";

        return {
          uid: membership.uid,
          email: userRecord?.email ?? "",
          displayName: displayName || userRecord?.email || "",
          role: membership.role,
          status: membership.status === "active" ? "registered" : "pending",
        };
      });

      return NextResponse.json({ users });
    }

    if (
      segments.length === 2 &&
      segments[0] === "consultant" &&
      segments[1] === "bookings"
    ) {
      requireOrganizationRole(authUser, organizationId, "consultant");
      const bookingRepository = createBookingRepository();
      const paymentRepository = createPaymentRepository();
      const clientRepository = createClientRepository();
      const [bookings, payments] = await Promise.all([
        bookingRepository.findByConsultantId(organizationId, authUser.uid),
        paymentRepository.findAll(organizationId),
      ]);
      const paymentByBookingId = new Map(
        payments.map((payment) => [payment.getBookingId(), payment]),
      );
      const uniqueClientIds = [
        ...new Set(bookings.map((b) => b.getClientId())),
      ];
      const clients = await clientRepository.findByIds(
        organizationId,
        uniqueClientIds,
      );
      const clientById = new Map(
        clients.map((client) => [client.getClientId(), client] as const),
      );

      return NextResponse.json({
        bookings: bookings.map((b) => {
          const eligibility = evaluateChargeEligibility({
            booking: b,
            payment: paymentByBookingId.get(b.getBookingId()) ?? null,
          });
          const client = clientById.get(b.getClientId()) ?? null;

          return {
            bookingId: b.getBookingId(),
            clientId: b.getClientId(),
            consultantId: b.getConsultantId(),
            slotId: b.getSlotId(),
            startDatetime: b.getStartDatetime().toISOString(),
            status: b.getStatus().getValue(),
            zoomUrl: b.getZoomUrl()?.getValue() ?? null,
            consultantMemo: b.getConsultantMemo().getValue(),
            consultationContent: b.getConsultationContent() ?? null,
            chargeable: eligibility.chargeable,
            chargeDisabledReason: eligibility.reason,
            client: client
              ? {
                  clientId: client.getClientId(),
                  name: client.getName(),
                  email: client.getEmail(),
                  phone: client.getPhone(),
                  memo: client.getMemo() ?? null,
                }
              : null,
          };
        }),
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
        return NextResponse.json({
          consultantId: authUser.uid,
          displayName: "",
          bio: "",
          specialties: [],
          zoomRoomIds: [],
          isActive: true,
        });
      }

      const profile = consultant.getProfile();
      return NextResponse.json({
        consultantId: consultant.getConsultantId(),
        displayName: profile.getDisplayName(),
        bio: profile.getBio(),
        specialties: [...profile.getSpecialties()],
        zoomRoomIds: consultant.getZoomRoomIds(),
        isActive: consultant.getIsActive(),
      });
    }

    return jsonError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.statusCode, error.code, error.message);
    }
    if (isFirestoreFailedPrecondition(error)) {
      console.error("Firestore failed precondition on slots query", {
        endpoint: requestErrorContext.endpoint ?? request.nextUrl.pathname,
        organizationId: requestErrorContext.organizationId,
        consultantId: requestErrorContext.consultantId,
        error,
      });
      return jsonError(
        500,
        "FIRESTORE_INDEX_MISSING",
        "Required Firestore index is missing. Please deploy Firestore indexes.",
      );
    }
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
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
        startDatetime,
        endDatetime,
        clientName,
        clientEmail,
        clientPhone,
        consultantContent,
      } = body;

      if (!clientName || !clientEmail || !clientPhone) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "clientName, clientEmail, clientPhone are required",
        );
      }

      const useCase = createCreateBookingUseCase();
      const result = await useCase.execute({
        organizationId,
        slotId: typeof slotId === "string" ? slotId : undefined,
        startDatetime:
          typeof startDatetime === "string"
            ? new Date(startDatetime)
            : undefined,
        endDatetime:
          typeof endDatetime === "string" ? new Date(endDatetime) : undefined,
        clientName,
        clientEmail,
        clientPhone,
        consultationContent: consultantContent,
      });

      return NextResponse.json(result, { status: 201 });
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

      const result = await createSetupPaymentUseCase().execute({
        organizationId,
        bookingId: segments[1],
        paymentMethodType: body.paymentMethodType,
      });

      return NextResponse.json(result, { status: 201 });
    }

    if (
      segments.length === 3 &&
      segments[0] === "bookings" &&
      segments[2] === "cancel"
    ) {
      const body = await request.json();
      const { cancelledBy, token } = body;

      if (!cancelledBy || !["client", "admin"].includes(cancelledBy)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "cancelledBy must be 'client' or 'admin'",
        );
      }

      if (cancelledBy === "client") {
        if (!token) {
          return jsonError(400, "MISSING_TOKEN", "Cancel token is required");
        }
        const tokenService = new HmacCancelTokenService();
        const result = tokenService.verifyToken(token);
        if (!result || result.bookingId !== segments[1]) {
          return jsonError(400, "INVALID_TOKEN", "Invalid cancel token");
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

    if (segments.length === 1 && segments[0] === "slots") {
      const authUser = await verifyAuth(request);
      const membership = requireOrganizationRole(
        authUser,
        organizationId,
        "admin",
        "operator",
        "consultant",
      );

      const body = await request.json();
      const { consultantId, startDatetime, endDatetime } = body;
      if (!consultantId || !startDatetime || !endDatetime) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultantId, startDatetime, and endDatetime are required",
        );
      }

      if (membership.role === "consultant" && authUser.uid !== consultantId) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Consultants can only create their own slots",
        );
      }

      const slotId = crypto.randomUUID();
      const start = new Date(startDatetime);
      const end = new Date(endDatetime);
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

    const authUser = await verifyAuth(request);

    if (
      segments.length === 2 &&
      segments[0] === "admin" &&
      segments[1] === "consultants"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const body = await request.json();
      const { consultantId, displayName, bio, specialties, zoomRoomIds } = body;
      if (!consultantId || !displayName) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultantId and displayName are required",
        );
      }

      const consultant = Consultant.create({
        organizationId,
        consultantId,
        profile: ConsultantProfile.create(
          displayName,
          bio ?? "",
          specialties ?? [],
        ),
        zoomRoomIds: zoomRoomIds ?? [],
      });

      await createConsultantRepository().save(consultant);
      return NextResponse.json({ consultantId }, { status: 201 });
    }

    if (
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "users" &&
      segments[2] === "invite"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const body = await request.json();
      const { email, role, displayName } = body;

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
      if (!displayName || typeof displayName !== "string") {
        return jsonError(400, "VALIDATION_ERROR", "displayName is required");
      }
      const normalizedDisplayName = displayName.trim();
      if (!normalizedDisplayName) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "displayName must not be empty",
        );
      }

      let uid: string;
      let userRecord = await getUserByEmail(email).catch(() => null);

      if (userRecord) {
        uid = userRecord.uid;
      } else {
        uid = await createUser(email, crypto.randomUUID());
        userRecord = await getUser(uid);
      }

      const membershipId = getOrganizationMembershipDocId(organizationId, uid);
      await db
        .collection(MEMBERSHIP_COLLECTION)
        .doc(membershipId)
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
          await repo.save(
            Consultant.create({
              organizationId,
              consultantId: uid,
              profile: ConsultantProfile.create(normalizedDisplayName, "", []),
              zoomRoomIds: [],
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

      return NextResponse.json({ uid }, { status: 201 });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "users" &&
      segments[3] === "resend-invite"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const userRecord = await getUser(segments[2]);
      const membership = await getOrganizationMembership(
        organizationId,
        segments[2],
      );
      if (!membership) {
        return jsonError(404, "NOT_FOUND", "Membership not found");
      }
      if (!isAdminPanelUserRole(membership.role)) {
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
          "ユーザーにメールアドレスがありません",
        );
      }

      await new ResendEmailService().sendInvitation({
        email: userRecord.email,
        role: membership.role,
        passwordResetLink: await generatePasswordResetLink(userRecord.email),
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "users" &&
      segments[3] === "reset-password"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin", "operator");
      const membership = await getOrganizationMembership(
        organizationId,
        segments[2],
      );
      if (!membership) {
        return jsonError(404, "NOT_FOUND", "Membership not found");
      }
      if (!isAdminPanelUserRole(membership.role)) {
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
          "ユーザーにメールアドレスがありません",
        );
      }

      await new ResendEmailService().sendPasswordReset({
        email: userRecord.email,
        passwordResetLink: await generatePasswordResetLink(userRecord.email),
      });

      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 2 &&
      segments[0] === "batch" &&
      segments[1] === "charge"
    ) {
      const result = await createBatchChargeUseCase().execute(organizationId);
      return NextResponse.json({
        chargedCount: result.chargedCount,
        completedCount: result.completedCount,
      });
    }

    return jsonError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    logUnexpectedPostError(error, postErrorContext);
    const mappedError = mapApiError(error);
    return jsonError(mappedError.status, mappedError.code, mappedError.message);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { organizationId, slug } = await context.params;
    const segments = parseSlug(slug);
    const authUser = await verifyAuth(request);

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
      settings.updateConsultantSelectionEnabled(
        body.consultantSelectionEnabled,
      );
      settings.updateBusinessHours(nextBusinessHours.toJSON());
      await repository.save(settings);

      const slotRepository = createSlotRepository();
      const now = new Date();
      const allSlots =
        await slotRepository.findByOrganizationId(organizationId);
      const removableSlotIds = allSlots
        .filter((slot) => {
          if (slot.getIsReserved()) return false;
          if (slot.getTimeRange().getStartAt() <= now) return false;
          return !nextBusinessHours.containsRange(
            slot.getTimeRange().getStartAt(),
            slot.getTimeRange().getEndAt(),
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

      if (body.displayName) {
        consultant.updateProfile(
          ConsultantProfile.create(
            body.displayName,
            body.bio ?? consultant.getProfile().getBio(),
            body.specialties ?? [...consultant.getProfile().getSpecialties()],
          ),
        );
      }

      if (body.zoomRoomIds) {
        consultant.assignZoomRooms(body.zoomRoomIds);
      }

      await repo.save(consultant);
      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "users" &&
      segments[3] === "display-name"
    ) {
      const actorMembership = requireOrganizationRole(
        authUser,
        organizationId,
        "admin",
        "operator",
      );
      const body = await request.json();
      const membership = await getOrganizationMembership(
        organizationId,
        segments[2],
      );

      if (!membership) {
        return jsonError(404, "NOT_FOUND", "Membership not found");
      }
      if (membership.role === "consultant") {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultant display name must be updated from consultant profile",
        );
      }
      if (
        !canUpdateDisplayNameTarget(
          actorMembership.role,
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
      if (!body.displayName || typeof body.displayName !== "string") {
        return jsonError(400, "VALIDATION_ERROR", "displayName is required");
      }

      const normalizedDisplayName = body.displayName.trim();
      if (!normalizedDisplayName) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "displayName must not be empty",
        );
      }

      await setUserDisplayName(segments[2], normalizedDisplayName);
      return NextResponse.json({ success: true });
    }

    if (
      segments.length === 4 &&
      segments[0] === "admin" &&
      segments[1] === "users" &&
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
      const membership = await getOrganizationMembership(
        organizationId,
        segments[2],
      );
      if (!membership) {
        return jsonError(404, "NOT_FOUND", "Membership not found");
      }
      if (!isAdminPanelUserRole(membership.role)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "consultant must be managed from consultant management",
        );
      }
      const activeAdminCount = (
        await listOrganizationMemberships(organizationId)
      ).filter(
        (organizationMembership) =>
          organizationMembership.role === "admin" &&
          organizationMembership.status === "active",
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

      const membershipId = getOrganizationMembershipDocId(
        organizationId,
        segments[2],
      );
      await db.collection(MEMBERSHIP_COLLECTION).doc(membershipId).set(
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
      if (!body.displayName || !Array.isArray(body.specialties)) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "displayName and specialties are required",
        );
      }

      await new UpdateProfileUseCase(
        new FirestoreConsultantRepository(),
      ).execute({
        organizationId,
        consultantId: authUser.uid,
        displayName: body.displayName,
        bio: body.bio ?? "",
        specialties: body.specialties,
      });

      return NextResponse.json({ success: true });
    }

    return jsonError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.statusCode, error.code, error.message);
    }
    if (error instanceof DomainError) {
      return jsonError(400, error.code, error.message);
    }
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { organizationId, slug } = await context.params;
    const segments = parseSlug(slug);
    const authUser = await verifyAuth(request);

    if (segments.length === 2 && segments[0] === "slots") {
      const membership = requireOrganizationRole(
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
        membership.role === "consultant" &&
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
      segments[0] === "admin" &&
      segments[1] === "users"
    ) {
      requireOrganizationRole(authUser, organizationId, "admin");
      const membershipId = getOrganizationMembershipDocId(
        organizationId,
        segments[2],
      );
      const membership = await getOrganizationMembership(
        organizationId,
        segments[2],
      );
      if (!membership) {
        return jsonError(404, "NOT_FOUND", "Membership not found");
      }
      const deletionTargetValidation = validateAdminUserDeletionTarget(
        authUser.uid,
        segments[2],
        membership.role,
      );
      if (!deletionTargetValidation.isAllowed) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          deletionTargetValidation.message ?? "Invalid user delete target",
        );
      }
      const membershipDocRef = db
        .collection(MEMBERSHIP_COLLECTION)
        .doc(membershipId);
      const membershipDoc = await membershipDocRef.get();
      const membershipData = membershipDoc.data();
      if (!membershipData) {
        return jsonError(404, "NOT_FOUND", "Membership not found");
      }

      await deleteAdminUserWithAuthCleanup({
        uid: segments[2],
        membershipData,
        countMembershipsByUid: async (uid) => {
          const memberships = await db
            .collection(MEMBERSHIP_COLLECTION)
            .where("uid", "==", uid)
            .get();
          return memberships.size;
        },
        deleteMembership: async () => {
          await membershipDocRef.delete();
        },
        restoreMembership: async (restorableMembershipData) => {
          await membershipDocRef.set(restorableMembershipData);
        },
        deleteAuthUser: deleteUser,
      });

      return NextResponse.json({ success: true });
    }

    return jsonError(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.statusCode, error.code, error.message);
    }
    if (error instanceof DomainError) {
      return jsonError(400, error.code, error.message);
    }
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}
