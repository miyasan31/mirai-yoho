import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createBookingRepository } from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const repo = createBookingRepository();

    const status = request.nextUrl.searchParams.get("status");
    const bookings = status
      ? await repo.findByStatus(status)
      : await repo.findAll();

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        bookingId: b.getBookingId(),
        clientId: b.getClientId(),
        consultantId: b.getConsultantId(),
        slotId: b.getSlotId(),
        startDatetime: b.getStartDatetime().toISOString(),
        status: b.getStatus().getValue(),
        zoomUrl: b.getZoomUrl()?.getValue() ?? null,
        consultantMemo: b.getConsultantMemo().getValue(),
        consultationContent: b.getConsultationContent() ?? null,
        stripePaymentIntentId: b.getStripePaymentIntentId() ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
