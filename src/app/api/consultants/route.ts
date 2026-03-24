import { NextResponse } from "next/server";
import { createConsultantRepository } from "@/infrastructure/container";

export async function GET() {
  try {
    const repo = createConsultantRepository();
    const consultants = await repo.findAllActive();

    return NextResponse.json({
      consultants: consultants.map((c) => ({
        consultantId: c.getConsultantId(),
        name: c.getProfile().getDisplayName(),
        specialties: [...c.getProfile().getSpecialties()],
        bio: c.getProfile().getBio(),
        isActive: c.getIsActive(),
      })),
    });
  } catch (_error) {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
