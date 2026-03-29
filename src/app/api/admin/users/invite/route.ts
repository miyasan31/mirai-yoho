import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { UserRole } from "@/infrastructure/auth/auth-types";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createConsultantRepository } from "@/infrastructure/container";
import {
  createUser,
  generatePasswordResetLink,
  setCustomClaims,
} from "@/infrastructure/firebase/firebase-auth-admin";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";

const VALID_ROLES: UserRole[] = ["super_admin", "operator", "consultant"];

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin");

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "email is required" },
        { status: 400 },
      );
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: `role must be one of: ${VALID_ROLES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const temporaryPassword = crypto.randomUUID();
    const uid = await createUser(email, temporaryPassword);

    await setCustomClaims(uid, { role });

    if (role === "consultant") {
      const repo = createConsultantRepository();
      const consultant = Consultant.create({
        consultantId: uid,
        profile: ConsultantProfile.create(uid, "", []),
        zoomRoomIds: [],
      });
      await repo.save(consultant);
    }

    const passwordResetLink = await generatePasswordResetLink(email);

    const emailService = new ResendEmailService();
    await emailService.sendInvitation({ email, role, passwordResetLink });

    return NextResponse.json({ uid }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "auth/email-already-exists"
    ) {
      return NextResponse.json(
        {
          code: "EMAIL_ALREADY_EXISTS",
          message: "このメールアドレスは既に登録されています",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
