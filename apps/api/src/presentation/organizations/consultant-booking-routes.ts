import { Hono } from "hono";
import { MarkConsultantJoinedUseCase } from "@/application/consultant/mark-consultant-joined-use-case";
import { UpdateMemoUseCase } from "@/application/consultant/update-memo-use-case";
import { requireConsultant } from "@/infrastructure/auth/require-role";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createListBookingsWithChargeEligibilityUseCase } from "@/infrastructure/container";
import { FirestoreBookingRepository } from "@/infrastructure/firestore/firestore-booking-repository";
import {
  INVALID_LIST_QUERY_MESSAGE,
  paginateArray,
  parseListQueryParams,
  sortByTimestampDesc,
} from "./list-query";
import {
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

export const consultantBookingRoutes = new Hono();

consultantBookingRoutes.get(
  "/consultant/bookings",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requireConsultant(authUser, organizationId);
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const results =
      await createListBookingsWithChargeEligibilityUseCase().execute({
        organizationId,
        scope: { kind: "consultant", consultantId: authUser.authUid },
        includeCustomers: true,
      });
    const bookingItems = sortByTimestampDesc(
      results.map(({ booking: b, eligibility, customer }) => ({
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

consultantBookingRoutes.post(
  "/consultant/bookings/:bookingId/join",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireConsultant(authUser, organizationId);

    await new MarkConsultantJoinedUseCase(
      new FirestoreBookingRepository(),
    ).execute({
      organizationId,
      bookingId: param("bookingId"),
      consultantId: authUser.authUid,
      joinedAt: new Date(),
    });

    return Response.json({ success: true });
  }),
);

consultantBookingRoutes.patch(
  "/consultant/bookings/:bookingId/memo",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireConsultant(authUser, organizationId);
    const body = await request.json();
    if (
      typeof body.customerName !== "string" ||
      typeof body.birthDate !== "string" ||
      typeof body.appraisalDate !== "string" ||
      typeof body.freeMemo !== "string"
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "customerName, birthDate, appraisalDate and freeMemo are required",
      );
    }

    await new UpdateMemoUseCase(new FirestoreBookingRepository()).execute({
      organizationId,
      bookingId: param("bookingId"),
      consultantId: authUser.authUid,
      customerName: body.customerName,
      birthDate: body.birthDate,
      appraisalDate: body.appraisalDate,
      freeMemo: body.freeMemo,
    });

    return Response.json({ success: true });
  }),
);
