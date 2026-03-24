import { type NextRequest, NextResponse } from "next/server";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { DomainError } from "@/domain/shared/domain-error";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createConsultantRepository } from "@/infrastructure/container";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const { id: consultantId } = await params;
    const body = await request.json();

    const repo = createConsultantRepository();
    const consultant = await repo.findById(consultantId);
    if (!consultant) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Consultant not found" },
        { status: 404 },
      );
    }

    if (body.displayName) {
      consultant.updateProfile(
        ConsultantProfile.create(
          body.displayName,
          body.bio ?? consultant.getProfile().getBio(),
          body.specialties ?? [...consultant.getProfile().getSpecialties()],
        ),
      );
    }

    if (body.zoomRoomIds) {
      consultant.assignZoomRooms(body.zoomRoomIds);
    }

    await repo.save(consultant);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const { id: consultantId } = await params;

    const repo = createConsultantRepository();
    const consultant = await repo.findById(consultantId);
    if (!consultant) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Consultant not found" },
        { status: 404 },
      );
    }

    consultant.deactivate();
    await repo.save(consultant);

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
