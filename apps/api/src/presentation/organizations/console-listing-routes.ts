import { Hono } from "hono";
import { evaluateChargeEligibility } from "@/application/booking/charge-eligibility";
import { Settings } from "@/domain/settings/settings";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createBookingRepository,
  createConsultantRepository,
  createCustomerRepository,
  createPaymentRepository,
  createSettingsRepository,
  createSlotRepository,
} from "@/infrastructure/container";
import {
  INVALID_LIST_QUERY_MESSAGE,
  paginateArray,
  parseListQueryParams,
  sortByTimestampDesc,
} from "./list-query";
import { getRoute, jsonError, noStoreJson } from "./route-handler";

export const consoleListingRoutes = new Hono();

consoleListingRoutes.get(
  "/console/slots",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    const account = authUser.accounts.find(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.status === "active",
    );
    if (!account) {
      throw new AuthError(
        403,
        "FORBIDDEN",
        `User does not belong to organization '${organizationId}'`,
      );
    }
    if (!account.isConsultant) {
      requirePermission(authUser, organizationId, "console.slots.read");
    }

    const requestedConsultantId = requestUrl.searchParams.get("consultantId");
    const consultantId = account.isConsultant
      ? authUser.authUid
      : requestedConsultantId;
    const repository = createSlotRepository();
    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);
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

      return noStoreJson({
        slots: filteredSlots.map((s) => ({
          slotId: s.getSlotId(),
          consultantId: s.getConsultantId(),
          startsAt: s.getTimeRange().getStartsAt().toISOString(),
          endsAt: s.getTimeRange().getEndsAt().toISOString(),
          isAvailable: !s.getIsAvailable(),
        })),
      });
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

    return noStoreJson({
      aggregatedSlots: [...groupedSlots.values()],
    });
  }),
);

consoleListingRoutes.get(
  "/console/dashboard",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.dashboard.read");
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
        pending: bookings.filter((b) => b.getStatus().getValue() === "pending")
          .length,
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
  }),
);

consoleListingRoutes.get(
  "/console/bookings",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.bookings.read");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const bookingRepo = createBookingRepository();
    const paymentRepo = createPaymentRepository();
    const status = requestUrl.searchParams.get("status");
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
          consultantJoinedAt: b.getConsultantJoinedAt()?.toISOString() ?? null,
          lateArrivalAlertSentAt:
            b.getLateArrivalAlertSentAt()?.toISOString() ?? null,
          consultantMemo: b.getConsultantMemo().getFreeMemo(),
          memoCustomerName: b.getConsultantMemo().getCustomerName(),
          memoBirthDate: b.getConsultantMemo().getBirthDate(),
          memoAppraisalDate: b.getConsultantMemo().getAppraisalDate(),
          consultationContent: b.getConsultationContent() ?? null,
          chargeable: eligibility.chargeable,
          chargeDisabledReason: eligibility.reason,
          createdAt: b.getCreatedAt().toISOString(),
          updatedAt: b.getUpdatedAt().toISOString(),
        };
      }),
      listQueryParams.sortBy,
    );
    const { items, pagination } = paginateArray(bookingItems, listQueryParams);

    return noStoreJson({
      bookings: items,
      pagination,
    });
  }),
);

consoleListingRoutes.get(
  "/console/customers",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.customers.read");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const customers = await createCustomerRepository().findAll(organizationId);
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
  }),
);

consoleListingRoutes.get(
  "/console/payments",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.payments.read");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
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
  }),
);
