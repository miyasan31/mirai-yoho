import { type NextRequest, NextResponse } from "next/server";
import { DomainError } from "@/domain/shared/domain-error";
import { createCancelBookingUseCase } from "@/infrastructure/container";
import { HmacCancelTokenService } from "@/infrastructure/token/cancel-token-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    const { cancelledBy, token } = body;

    if (!cancelledBy || !["client", "admin"].includes(cancelledBy)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "cancelledBy must be 'client' or 'admin'",
        },
        { status: 400 },
      );
    }

    if (cancelledBy === "client") {
      if (!token) {
        return NextResponse.json(
          { code: "MISSING_TOKEN", message: "Cancel token is required" },
          { status: 400 },
        );
      }
      const tokenService = new HmacCancelTokenService();
      const result = tokenService.verifyToken(token);
      if (!result || result.bookingId !== bookingId) {
        return NextResponse.json(
          { code: "INVALID_TOKEN", message: "Invalid cancel token" },
          { status: 400 },
        );
      }
    }

    const useCase = createCancelBookingUseCase();
    await useCase.execute({ bookingId, cancelledBy });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
