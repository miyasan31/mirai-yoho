import { Hono } from "hono";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { getConsultant } from "@/infrastructure/auth/require-role";
import { verifyEitherAuth } from "@/infrastructure/auth/verify-auth";
import {
  createCustomerRepository,
  createGetDashboardUseCase,
  createGetZoomSessionUseCase,
  createListAvailableSlotsUseCase,
  createListBookingsWithChargeEligibilityUseCase,
  createPaymentRepository,
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
    const authUser = await verifyEitherAuth(request);
    const consultant = getConsultant(authUser, organizationId);
    if (!consultant) {
      requirePermission(authUser, organizationId, "console.slots.read");
    }

    const requestedConsultantId = requestUrl.searchParams.get("consultantId");
    const consultantId = consultant ? authUser.authUid : requestedConsultantId;
    if (!consultantId) {
      return jsonError(400, "VALIDATION_ERROR", "consultantId is required");
    }
    const result = await createListAvailableSlotsUseCase().execute({
      organizationId,
      consultantId,
    });
    return noStoreJson({ slots: result.slots });
  }),
);

consoleListingRoutes.get(
  "/console/dashboard",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyEitherAuth(request);
    requirePermission(authUser, organizationId, "console.dashboard.read");
    const result = await createGetDashboardUseCase().execute({
      organizationId,
    });
    return noStoreJson(result);
  }),
);

const SESSION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

consoleListingRoutes.get(
  "/console/zoom-sessions",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyEitherAuth(request);
    requirePermission(authUser, organizationId, "console.bookings.read");

    const date = requestUrl.searchParams.get("date");
    if (date !== null && !SESSION_DATE_PATTERN.test(date)) {
      return jsonError(400, "VALIDATION_ERROR", "date must be YYYY-MM-DD");
    }

    const result = await createGetZoomSessionUseCase().execute({
      organizationId,
      sessionDate: date ?? undefined,
    });
    return noStoreJson(result);
  }),
);

consoleListingRoutes.get(
  "/console/bookings",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyEitherAuth(request);
    requirePermission(authUser, organizationId, "console.bookings.read");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const status = requestUrl.searchParams.get("status");
    const results =
      await createListBookingsWithChargeEligibilityUseCase().execute({
        organizationId,
        scope: { kind: "console", status },
        includeCustomers: false,
      });

    const bookingItems = sortByTimestampDesc(
      results.map(({ booking: b, eligibility }) => ({
        bookingId: b.getBookingId(),
        customerId: b.getCustomerId(),
        consultantId: b.getConsultantId(),
        usageSlotIds: [...b.getUsageSlotIds()],
        bufferSlotIds: [...b.getBufferSlotIds()],
        startsAt: b.getStartsAt().toISOString(),
        endsAt: b.getEndsAt().toISOString(),
        durationMinutes: b.getDurationMinutes(),
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
        pricePlanName: b.getPricePlanName() ?? null,
        pricePlanTotalJPY: b.getPricePlanTotalJPY() ?? null,
        createdAt: b.getCreatedAt().toISOString(),
        updatedAt: b.getUpdatedAt().toISOString(),
      })),
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
    const authUser = await verifyEitherAuth(request);
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
    const authUser = await verifyEitherAuth(request);
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
