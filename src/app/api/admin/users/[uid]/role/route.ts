import { type NextRequest, NextResponse } from "next/server";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { UserRole } from "@/infrastructure/auth/auth-types";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createConsultantRepository } from "@/infrastructure/container";
import { setCustomClaims } from "@/infrastructure/firebase/firebase-auth-admin";

const VALID_ROLES: UserRole[] = ["super_admin", "operator", "consultant"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin");

    const { uid } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: `role must be one of: ${VALID_ROLES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    await setCustomClaims(uid, { role });

    if (role === "consultant") {
      const repo = createConsultantRepository();
      const existing = await repo.findById(uid);
      if (!existing) {
        const consultant = Consultant.create({
          consultantId: uid,
          profile: ConsultantProfile.create(uid, "", []),
          zoomRoomIds: [],
        });
        await repo.save(consultant);
      }
    }

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
