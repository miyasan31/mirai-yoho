import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { listUsers } from "@/infrastructure/firebase/firebase-auth-admin";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin");

    const userRecords = await listUsers();

    const users = userRecords.map((record) => ({
      uid: record.uid,
      email: record.email ?? "",
      role: (record.customClaims?.role as string | undefined) ?? "consultant",
      status: record.metadata.lastSignInTime ? "registered" : "pending",
    }));

    return NextResponse.json({ users });
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
