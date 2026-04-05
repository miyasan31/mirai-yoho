import { getAuth, type UserRecord } from "firebase-admin/auth";
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

export async function createUser(
  email: string,
  password: string,
): Promise<string> {
  const userRecord = await auth.createUser({ email, password });
  return userRecord.uid;
}

export async function generatePasswordResetLink(
  email: string,
): Promise<string> {
  return auth.generatePasswordResetLink(email);
}

export async function getUser(uid: string): Promise<UserRecord> {
  return auth.getUser(uid);
}

export async function getUserByEmail(email: string): Promise<UserRecord> {
  return auth.getUserByEmail(email);
}

export async function listUsers(): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

export async function deleteUser(uid: string): Promise<void> {
  await auth.deleteUser(uid);
}
