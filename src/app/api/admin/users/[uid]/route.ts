import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createConsultantRepository } from "@/infrastructure/container";
import {
  deleteUser,
  getUser,
} from "@/infrastructure/firebase/firebase-auth-admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin");

    const { uid } = await params;

    if (uid === authUser.uid) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "自分自身は削除できません" },
        { status: 400 },
      );
    }

    const userRecord = await getUser(uid);
    const role = userRecord.customClaims?.role as string | undefined;

    if (role === "super_admin") {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "スーパー管理者は削除できません",
        },
        { status: 400 },
      );
    }

    if (role === "consultant") {
      const repo = createConsultantRepository();
      const consultant = await repo.findById(uid);
      if (consultant) {
        consultant.deactivate();
        await repo.save(consultant);
      }
    }

    await deleteUser(uid);

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
