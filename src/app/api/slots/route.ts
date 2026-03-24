import { type NextRequest, NextResponse } from "next/server";
import { createSlotRepository } from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const consultantId = request.nextUrl.searchParams.get("consultantId");
    if (!consultantId) {
      return NextResponse.json(
        { code: "MISSING_PARAM", message: "consultantId is required" },
        { status: 400 },
      );
    }

    const repo = createSlotRepository();
    const slots = await repo.findAvailableByConsultantId(consultantId);

    return NextResponse.json({
      slots: slots.map((s) => ({
        slotId: s.getSlotId(),
        consultantId: s.getConsultantId(),
        startDatetime: s.getTimeRange().getStartAt().toISOString(),
        endDatetime: s.getTimeRange().getEndAt().toISOString(),
        isAvailable: !s.getIsReserved(),
      })),
    });
  } catch (_error) {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
