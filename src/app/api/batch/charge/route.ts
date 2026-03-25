import { NextResponse } from "next/server";
import { createBatchChargeUseCase } from "@/infrastructure/container";

export async function POST() {
  try {
    const useCase = createBatchChargeUseCase();
    const result = await useCase.execute();

    return NextResponse.json({
      chargedCount: result.chargedCount,
      completedCount: result.completedCount,
    });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
