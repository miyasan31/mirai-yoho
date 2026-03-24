import { type NextRequest, NextResponse } from "next/server";
import { UpdateProfileUseCase } from "@/application/consultant/update-profile-use-case";
import { DomainError } from "@/domain/shared/domain-error";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createConsultantRepository } from "@/infrastructure/container";
import { FirestoreConsultantRepository } from "@/infrastructure/firestore/firestore-consultant-repository";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "consultant");

    const repo = createConsultantRepository();
    const consultant = await repo.findById(authUser.uid);
    if (!consultant) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Consultant not found" },
        { status: 404 },
      );
    }

    const profile = consultant.getProfile();
    return NextResponse.json({
      consultantId: consultant.getConsultantId(),
      displayName: profile.getDisplayName(),
      bio: profile.getBio(),
      specialties: [...profile.getSpecialties()],
      zoomRoomIds: consultant.getZoomRoomIds(),
      isActive: consultant.getIsActive(),
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

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "consultant");

    const body = await request.json();
    const { displayName, bio, specialties } = body;

    if (!displayName || !Array.isArray(specialties)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "displayName and specialties are required",
        },
        { status: 400 },
      );
    }

    const useCase = new UpdateProfileUseCase(
      new FirestoreConsultantRepository(),
    );
    await useCase.execute({
      consultantId: authUser.uid,
      displayName,
      bio: bio ?? "",
      specialties,
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
