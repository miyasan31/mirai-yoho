import { setLastOrganizationId } from "@/infrastructure/auth/load-auth-context";
import { getAccount } from "@/infrastructure/auth/require-role";
import { AuthError, verifyEitherAuth } from "@/infrastructure/auth/verify-auth";
import { withNoStore } from "../cache-control";

export async function PATCH(request: Request) {
  try {
    const authUser = await verifyEitherAuth(request);
    const body = (await request.json()) as { organizationId?: string };

    if (!body.organizationId) {
      return withNoStore(
        Response.json(
          { code: "VALIDATION_ERROR", message: "organizationId is required" },
          { status: 400 },
        ),
      );
    }

    if (!getAccount(authUser, body.organizationId)) {
      throw new AuthError(
        403,
        "FORBIDDEN",
        `User does not belong to organization '${body.organizationId}'`,
      );
    }

    await setLastOrganizationId(authUser.authUid, body.organizationId);

    return withNoStore(Response.json({ success: true }));
  } catch (error) {
    if (error instanceof AuthError) {
      return withNoStore(
        Response.json(
          { code: error.code, message: error.message },
          { status: error.statusCode },
        ),
      );
    }

    return withNoStore(
      Response.json(
        { code: "INTERNAL_ERROR", message: "Internal server error" },
        { status: 500 },
      ),
    );
  }
}
