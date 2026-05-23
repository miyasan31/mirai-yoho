import { NextResponse } from "next/server";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { withNoStore } from "../../cache-control";

export async function GET(request: Request) {
  try {
    const authUser = await verifyAuth(request);

    return withNoStore(
      NextResponse.json({
        uid: authUser.uid,
        memberships: authUser.memberships,
        currentOrganizationId: authUser.currentOrganizationId,
        currentDisplayName: authUser.currentDisplayName,
      }),
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return withNoStore(
        NextResponse.json(
          { code: error.code, message: error.message },
          { status: error.statusCode },
        ),
      );
    }

    return withNoStore(
      NextResponse.json(
        { code: "INTERNAL_ERROR", message: "Internal server error" },
        { status: 500 },
      ),
    );
  }
}
