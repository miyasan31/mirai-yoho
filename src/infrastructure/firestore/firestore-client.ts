import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { envServer } from "@/config/env.server";

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (
    envServer.nodeEnv === "test" ||
    !envServer.hasFirebaseServiceAccountCredentials()
  ) {
    return initializeApp({
      projectId: envServer.firebaseProjectId ?? "test-project",
    });
  }

  return initializeApp({
    credential: cert({
      projectId: envServer.firebaseProjectId,
      clientEmail: envServer.firebaseClientEmail,
      privateKey: envServer.firebasePrivateKey,
    }),
  });
}

export const app = initializeFirebaseAdmin();
export const db = getFirestore(app);
