import { NextResponse } from "next/server";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";

export async function GET(request: Request) {
  try {
    const authUser = await verifyAuth(request);

    return NextResponse.json({
      uid: authUser.uid,
      memberships: authUser.memberships,
      currentOrganizationId: authUser.currentOrganizationId,
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
