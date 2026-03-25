import { type NextRequest, NextResponse } from "next/server";
import { DomainError } from "@/domain/shared/domain-error";
import { createSetupPaymentUseCase } from "@/infrastructure/container";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();

    const { paymentMethodType } = body;
    if (paymentMethodType !== "card" && paymentMethodType !== "paypay") {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "paymentMethodType must be 'card' or 'paypay'",
        },
        { status: 400 },
      );
    }

    const useCase = createSetupPaymentUseCase();
    const result = await useCase.execute({ bookingId, paymentMethodType });

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
