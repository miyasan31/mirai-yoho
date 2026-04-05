import { type NextRequest, NextResponse } from "next/server";
import { GetBookingSettingsUseCase } from "@/application/organization-settings/get-booking-settings-use-case";
import { UpdateBookingSettingsUseCase } from "@/application/organization-settings/update-booking-settings-use-case";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createOrganizationSettingsRepository } from "@/infrastructure/container";

const DEFAULT_ORGANIZATION_ID = "default";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const useCase = new GetBookingSettingsUseCase(
      createOrganizationSettingsRepository(),
    );
    const result = await useCase.execute({
      organizationId: DEFAULT_ORGANIZATION_ID,
    });

    return NextResponse.json({
      consultantSelectionEnabled: result.consultantSelectionEnabled,
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
    requireRole(authUser, "super_admin", "operator");

    const body = await request.json();
    if (typeof body.consultantSelectionEnabled !== "boolean") {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "consultantSelectionEnabled must be a boolean",
        },
        { status: 400 },
      );
    }

    const useCase = new UpdateBookingSettingsUseCase(
      createOrganizationSettingsRepository(),
    );
    const result = await useCase.execute({
      organizationId: DEFAULT_ORGANIZATION_ID,
      consultantSelectionEnabled: body.consultantSelectionEnabled,
    });

    return NextResponse.json({
      consultantSelectionEnabled: result.consultantSelectionEnabled,
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
