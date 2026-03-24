import { type NextRequest, NextResponse } from "next/server";
import { DomainError } from "@/domain/shared/domain-error";
import { createCreateBookingUseCase } from "@/infrastructure/container";

const AMOUNT_JPY = 5000;
const TAX_RATE = 0.1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotId, clientName, clientEmail, clientPhone, consultantContent } =
      body;

    if (!slotId || !clientName || !clientEmail || !clientPhone) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "slotId, clientName, clientEmail, clientPhone are required",
        },
        { status: 400 },
      );
    }

    const useCase = createCreateBookingUseCase();
    const result = await useCase.execute({
      slotId,
      clientName,
      clientEmail,
      clientPhone,
      amountJPY: AMOUNT_JPY,
      taxRate: TAX_RATE,
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
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
