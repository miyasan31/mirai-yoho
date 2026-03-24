import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createBookingRepository,
  createClientRepository,
  createConsultantRepository,
  createPaymentRepository,
} from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const [bookings, payments, clients, consultants] = await Promise.all([
      createBookingRepository().findAll(),
      createPaymentRepository().findAll(),
      createClientRepository().findAll(),
      createConsultantRepository().findAllActive(),
    ]);

    const totalRevenue = payments
      .filter((p) => p.getStatus().getValue() === "captured")
      .reduce((sum, p) => sum + p.getMoney().getTotalJPY(), 0);

    return NextResponse.json({
      totalBookings: bookings.length,
      totalPayments: payments.length,
      totalClients: clients.length,
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
