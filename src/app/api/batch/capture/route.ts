import { NextResponse } from "next/server";
import { createBatchCaptureUseCase } from "@/infrastructure/container";

export async function POST() {
  try {
    const useCase = createBatchCaptureUseCase();
    const result = await useCase.execute();

    return NextResponse.json({ capturedCount: result.capturedCount });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
