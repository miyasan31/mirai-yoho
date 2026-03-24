import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createClientRepository } from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator");

    const repo = createClientRepository();
    const clients = await repo.findAll();

    return NextResponse.json({
      clients: clients.map((c) => ({
        clientId: c.getClientId(),
        name: c.getName(),
        email: c.getEmail(),
        phone: c.getPhone(),
        memo: c.getMemo() ?? null,
      })),
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
