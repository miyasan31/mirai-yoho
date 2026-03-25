import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createPaymentRepository } from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const repo = createPaymentRepository();
    const payments = await repo.findAll();

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
