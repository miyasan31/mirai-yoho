import { type NextRequest, NextResponse } from "next/server";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { DomainError } from "@/domain/shared/domain-error";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createConsultantRepository } from "@/infrastructure/container";
import { getUser } from "@/infrastructure/firebase/firebase-auth-admin";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const repo = createConsultantRepository();
    const consultants = await repo.findAllActive();

    const consultantsWithEmail = await Promise.all(
      consultants.map(async (c) => {
        const uid = c.getConsultantId();
        const userRecord = await getUser(uid).catch(() => null);
        return {
          consultantId: uid,
          email: userRecord?.email ?? "",
          displayName: c.getProfile().getDisplayName(),
          bio: c.getProfile().getBio(),
          specialties: [...c.getProfile().getSpecialties()],
          zoomRoomIds: c.getZoomRoomIds(),
          isActive: c.getIsActive(),
        };
      }),
    );

    return NextResponse.json({ consultants: consultantsWithEmail });
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

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const body = await request.json();
    const { consultantId, displayName, bio, specialties, zoomRoomIds } = body;

    if (!consultantId || !displayName) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "consultantId and displayName are required",
        },
        { status: 400 },
      );
    }

    const consultant = Consultant.create({
      consultantId,
      profile: ConsultantProfile.create(
        displayName,
        bio ?? "",
        specialties ?? [],
      ),
      zoomRoomIds: zoomRoomIds ?? [],
    });

    const repo = createConsultantRepository();
    await repo.save(consultant);

    return NextResponse.json({ consultantId }, { status: 201 });
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
