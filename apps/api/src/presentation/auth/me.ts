import { AuthError, verifyEitherAuth } from "@/infrastructure/auth/verify-auth";
import { withNoStore } from "../cache-control";

export async function GET(request: Request) {
  try {
    const authUser = await verifyEitherAuth(request);

    return withNoStore(
      Response.json({
        authUid: authUser.authUid,
        accounts: authUser.accounts,
        consultants: authUser.consultants,
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
