import type { Timestamp } from "firebase-admin/firestore";
import { AuthProvider, type AuthProviderId } from "@/domain/user/auth-provider";
import { BirthDate } from "@/domain/user/birth-date";
import { User, type UserStatus } from "@/domain/user/user";
import type { IUserRepository } from "@/domain/user/user-repository";
import { UserZoomConnection } from "@/domain/user/user-zoom-connection";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const USERS = FIRESTORE_COLLECTIONS.users;
const CREDENTIALS = FIRESTORE_COLLECTIONS.userZoomCredentials;

interface AuthProviderDoc {
  providerId: string;
  providerUid?: string;
  linkedAt: Timestamp | Date;
}

interface UserDoc {
  userId: string;
  authUid: string;
  authProviders: AuthProviderDoc[];
  displayName: string;
  primaryEmail?: string;
  birthDate: string;
  status: UserStatus;
  withdrawnAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

interface UserZoomCredentialDoc {
  userId: string;
  zoomUserId: string;
  zoomEmail: string;
  accessTokenCipher: string;
  refreshTokenCipher: string;
  accessTokenExpiresAt: Timestamp | Date;
  scopes: string[];
  connectedAt: Timestamp | Date;
  revokedAt?: Timestamp | Date;
}

function toDate(value: Timestamp | Date | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toRequiredDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

function toAuthProvider(doc: AuthProviderDoc): AuthProvider {
  return AuthProvider.reconstruct({
    providerId: doc.providerId as AuthProviderId,
    providerUid: doc.providerUid,
    linkedAt: toRequiredDate(doc.linkedAt),
  });
}

function fromAuthProvider(provider: AuthProvider): AuthProviderDoc {
  const providerUid = provider.getProviderUid();
  return {
    providerId: provider.getProviderId(),
    ...(providerUid !== undefined ? { providerUid } : {}),
    linkedAt: provider.getLinkedAt(),
  };
}

function toZoomConnection(doc: UserZoomCredentialDoc): UserZoomConnection {
  return UserZoomConnection.reconstruct({
    zoomUserId: doc.zoomUserId,
    zoomEmail: doc.zoomEmail,
    accessTokenCipher: doc.accessTokenCipher,
    refreshTokenCipher: doc.refreshTokenCipher,
    accessTokenExpiresAt: toRequiredDate(doc.accessTokenExpiresAt),
    scopes: doc.scopes,
    connectedAt: toRequiredDate(doc.connectedAt),
    revokedAt: toDate(doc.revokedAt),
  });
}

function fromZoomConnection(
  userId: string,
  connection: UserZoomConnection,
): UserZoomCredentialDoc {
  const revokedAt = connection.getRevokedAt();
  return {
    userId,
    zoomUserId: connection.getZoomUserId(),
    zoomEmail: connection.getZoomEmail(),
    accessTokenCipher: connection.getAccessTokenCipher(),
    refreshTokenCipher: connection.getRefreshTokenCipher(),
    accessTokenExpiresAt: connection.getAccessTokenExpiresAt(),
    scopes: connection.getScopes(),
    connectedAt: connection.getConnectedAt(),
    ...(revokedAt ? { revokedAt } : {}),
  };
}

async function loadZoomConnection(
  userId: string,
): Promise<UserZoomConnection | undefined> {
  const snapshot = await db.collection(CREDENTIALS).doc(userId).get();
  if (!snapshot.exists) return undefined;
  return toZoomConnection(snapshot.data() as UserZoomCredentialDoc);
}

async function toDomain(doc: UserDoc): Promise<User> {
  const zoomConnection = await loadZoomConnection(doc.userId);
  return User.reconstruct({
    userId: doc.userId,
    authUid: doc.authUid,
    authProviders: doc.authProviders.map(toAuthProvider),
    displayName: doc.displayName,
    primaryEmail: doc.primaryEmail,
    birthDate: BirthDate.reconstruct(doc.birthDate),
    zoomConnection,
    status: doc.status,
    withdrawnAt: toDate(doc.withdrawnAt),
    createdAt: toRequiredDate(doc.createdAt),
    updatedAt: toRequiredDate(doc.updatedAt),
  });
}

function toFirestore(user: User): UserDoc {
  const primaryEmail = user.getPrimaryEmail();
  const withdrawnAt = user.getWithdrawnAt();
  return {
    userId: user.getUserId(),
    authUid: user.getAuthUid(),
    authProviders: user.getAuthProviders().map(fromAuthProvider),
    displayName: user.getDisplayName(),
    ...(primaryEmail !== undefined ? { primaryEmail } : {}),
    birthDate: user.getBirthDate().getValue(),
    status: user.getStatus(),
    ...(withdrawnAt ? { withdrawnAt } : {}),
    createdAt: user.getCreatedAt(),
    updatedAt: user.getUpdatedAt(),
  };
}

export class FirestoreUserRepository implements IUserRepository {
  async findById(userId: string): Promise<User | null> {
    const doc = await db.collection(USERS).doc(userId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as UserDoc);
  }

  async findByAuthUid(authUid: string): Promise<User | null> {
    const snapshot = await db
      .collection(USERS)
      .where("authUid", "==", authUid)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as UserDoc);
  }

  async findByPrimaryEmail(email: string): Promise<User | null> {
    const snapshot = await db
      .collection(USERS)
      .where("primaryEmail", "==", email)
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as UserDoc);
  }

  async save(user: User): Promise<void> {
    const userId = user.getUserId();
    await db.collection(USERS).doc(userId).set(toFirestore(user));

    const connection = user.getZoomConnection();
    if (connection) {
      await db
        .collection(CREDENTIALS)
        .doc(userId)
        .set(fromZoomConnection(userId, connection));
    }
  }
}
