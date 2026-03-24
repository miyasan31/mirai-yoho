import { type NextRequest, NextResponse } from "next/server";
import { UpdateMemoUseCase } from "@/application/consultant/update-memo-use-case";
import { DomainError } from "@/domain/shared/domain-error";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { FirestoreBookingRepository } from "@/infrastructure/firestore/firestore-booking-repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "consultant");

    const { id: bookingId } = await params;
    const body = await request.json();
    const { memo } = body;

    if (typeof memo !== "string") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "memo is required" },
        { status: 400 },
      );
    }

    const useCase = new UpdateMemoUseCase(new FirestoreBookingRepository());
    await useCase.execute({
      bookingId,
      consultantId: authUser.uid,
      memo,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
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
