import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { withNoStore } from "../cache-control";

export async function GET(request: Request) {
  try {
    const authUser = await verifyAuth(request);

    return withNoStore(
      Response.json({
        uid: authUser.uid,
        accounts: authUser.accounts,
        currentOrganizationId: authUser.currentOrganizationId,
        currentDisplayName: authUser.currentDisplayName,
      }),
    );
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
