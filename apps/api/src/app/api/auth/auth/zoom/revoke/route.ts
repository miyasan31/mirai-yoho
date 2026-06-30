import { NextResponse } from "next/server";
import { AppError } from "@/application/shared/app-error";
import { DomainError } from "@/domain/shared/domain-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import { createDisconnectZoomAccountUseCase } from "@/infrastructure/container";
import { withNoStore } from "../../../cache-control";

function jsonError(statusCode: number, code: string, message: string) {
  return withNoStore(
    NextResponse.json({ code, message }, { status: statusCode }),
  );
}

export async function POST(request: Request) {
  try {
    const { authUid } = await verifyCustomerAuth(request);
    await createDisconnectZoomAccountUseCase().execute({ authUid });
    return withNoStore(NextResponse.json({ ok: true }));
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.statusCode, error.code, error.message);
    }
    if (error instanceof AppError) {
      return jsonError(error.statusCode, error.code, error.message);
    }
    if (error instanceof DomainError) {
      return jsonError(400, error.code, error.message);
    }
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}
