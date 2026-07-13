import { Hono } from "hono";
import { evaluateChargeEligibility } from "@/application/booking/charge-eligibility";
import { MarkConsultantJoinedUseCase } from "@/application/consultant/mark-consultant-joined-use-case";
import { UpdateMemoUseCase } from "@/application/consultant/update-memo-use-case";
import { requireRole } from "@/infrastructure/auth/require-role";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createBookingRepository,
  createCustomerRepository,
  createPaymentRepository,
} from "@/infrastructure/container";
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
    requireRole(authUser, organizationId, "consultant");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
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

consultantBookingRoutes.post(
  "/consultant/bookings/:bookingId/join",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");

    await new MarkConsultantJoinedUseCase(
      new FirestoreBookingRepository(),
    ).execute({
      organizationId,
      bookingId: param("bookingId"),
      consultantId: authUser.uid,
      joinedAt: new Date(),
    });

    return Response.json({ success: true });
  }),
);

consultantBookingRoutes.patch(
  "/consultant/bookings/:bookingId/memo",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
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
      consultantId: authUser.uid,
      customerName: body.customerName,
      birthDate: body.birthDate,
      appraisalDate: body.appraisalDate,
      freeMemo: body.freeMemo,
    });

    return Response.json({ success: true });
  }),
);
