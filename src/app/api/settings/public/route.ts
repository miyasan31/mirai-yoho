import { NextResponse } from "next/server";
import { GetBookingSettingsUseCase } from "@/application/organization-settings/get-booking-settings-use-case";
import { createOrganizationSettingsRepository } from "@/infrastructure/container";

const DEFAULT_ORGANIZATION_ID = "default";

export async function GET() {
  try {
    const useCase = new GetBookingSettingsUseCase(
      createOrganizationSettingsRepository(),
    );
    const result = await useCase.execute({
      organizationId: DEFAULT_ORGANIZATION_ID,
    });

    return NextResponse.json({
      consultantSelectionEnabled: result.consultantSelectionEnabled,
    });
  } catch (_error) {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
