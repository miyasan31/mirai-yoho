import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createSlotRepository } from "@/infrastructure/container";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator", "consultant");

    const { slotId } = await params;
    const repo = createSlotRepository();
    const slot = await repo.findById(slotId);

    if (!slot) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Slot not found" },
        { status: 404 },
      );
    }

    if (
      authUser.role === "consultant" &&
      authUser.uid !== slot.getConsultantId()
    ) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Consultants can only delete their own slots",
        },
        { status: 403 },
      );
    }

    if (slot.getIsReserved()) {
      return NextResponse.json(
        {
          code: "SLOT_ALREADY_RESERVED",
          message: "Reserved slots cannot be deleted",
        },
        { status: 400 },
      );
    }

    await repo.delete(slotId);

    return NextResponse.json({ success: true });
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
