import { type NextRequest, NextResponse } from "next/server";
import { DomainError } from "@/domain/shared/domain-error";
import { createCreateBookingUseCase } from "@/infrastructure/container";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slotId,
      startDatetime,
      endDatetime,
      clientName,
      clientEmail,
      clientPhone,
      consultantContent,
    } = body;
    const hasSlotId = typeof slotId === "string" && slotId.length > 0;
    const hasDateRange =
      typeof startDatetime === "string" &&
      startDatetime.length > 0 &&
      typeof endDatetime === "string" &&
      endDatetime.length > 0;

    if (!clientName || !clientEmail || !clientPhone) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "clientName, clientEmail, clientPhone are required",
        },
        { status: 400 },
      );
    }

    if (hasSlotId === hasDateRange) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message:
            "Provide either slotId or startDatetime and endDatetime, but not both",
        },
        { status: 400 },
      );
    }

    const useCase = createCreateBookingUseCase();
    const result = await useCase.execute({
      slotId: hasSlotId ? slotId : undefined,
      startDatetime: hasDateRange ? new Date(startDatetime) : undefined,
      endDatetime: hasDateRange ? new Date(endDatetime) : undefined,
      clientName,
      clientEmail,
      clientPhone,
      consultationContent: consultantContent,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      const status =
        error.message === "Slot is no longer available" ? 409 : 500;
      const code =
        error.message === "Slot is no longer available"
          ? "SLOT_UNAVAILABLE"
          : "INTERNAL_ERROR";
      return NextResponse.json({ code, message: error.message }, { status });
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
