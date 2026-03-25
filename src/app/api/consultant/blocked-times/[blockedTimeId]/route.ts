import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createBlockedTimeRepository } from "@/infrastructure/container";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ blockedTimeId: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "consultant");

    const { blockedTimeId } = await params;

    const repo = createBlockedTimeRepository();
    await repo.delete(blockedTimeId);

    return NextResponse.json({ ok: true });
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
