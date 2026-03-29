import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  generatePasswordResetLink,
  getUser,
} from "@/infrastructure/firebase/firebase-auth-admin";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin");

    const { uid } = await params;
    const userRecord = await getUser(uid);

    if (!userRecord.email) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "ユーザーにメールアドレスがありません",
        },
        { status: 400 },
      );
    }

    const role = (userRecord.customClaims?.role as string) ?? "consultant";
    const passwordResetLink = await generatePasswordResetLink(userRecord.email);

    const emailService = new ResendEmailService();
    await emailService.sendInvitation({
      email: userRecord.email,
      role,
      passwordResetLink,
    });

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
