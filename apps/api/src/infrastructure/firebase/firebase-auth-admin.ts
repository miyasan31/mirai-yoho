import { getAuth, type UserRecord } from "firebase-admin/auth";
import { app } from "@/infrastructure/firestore/firestore-customer";
import { chunkArray } from "@/lib/chunk-array";

const auth = getAuth(app);
const AUTH_GET_USERS_CHUNK_SIZE = 100;

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

export async function getUsersByUids(
  uids: string[],
): Promise<Map<string, UserRecord>> {
  const uniqueUids = [...new Set(uids)];
  const userByUid = new Map<string, UserRecord>();
  if (uniqueUids.length === 0) return userByUid;

  for (const uidChunk of chunkArray(uniqueUids, AUTH_GET_USERS_CHUNK_SIZE)) {
    const result = await auth.getUsers(uidChunk.map((uid) => ({ uid })));
    for (const userRecord of result.users) {
      userByUid.set(userRecord.uid, userRecord);
    }
  }

  return userByUid;
}

export async function deleteUser(uid: string): Promise<void> {
  await auth.deleteUser(uid);
}

export async function disableUser(uid: string): Promise<void> {
  await auth.updateUser(uid, { disabled: true });
}
