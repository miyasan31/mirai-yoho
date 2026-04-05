import { NextResponse } from "next/server";
import { setLastOrganizationId } from "@/infrastructure/auth/load-auth-context";
import { getOrganizationMembership } from "@/infrastructure/auth/require-organization-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";

export async function PATCH(request: Request) {
  try {
    const authUser = await verifyAuth(request);
    const body = (await request.json()) as { organizationId?: string };

    if (!body.organizationId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "organizationId is required" },
        { status: 400 },
      );
    }

    if (!getOrganizationMembership(authUser, body.organizationId)) {
      throw new AuthError(
        403,
        "FORBIDDEN",
        `User does not belong to organization '${body.organizationId}'`,
      );
    }

    await setLastOrganizationId(authUser.uid, body.organizationId);

    return NextResponse.json({ success: true });
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
