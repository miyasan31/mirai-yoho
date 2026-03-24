import { getAuth } from "firebase-admin/auth";
import { app } from "@/infrastructure/firestore/firestore-client";

const auth = getAuth(app);

export async function verifyIdToken(token: string) {
  return auth.verifyIdToken(token);
}

export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>,
): Promise<void> {
  await auth.setCustomUserClaims(uid, claims);
}
