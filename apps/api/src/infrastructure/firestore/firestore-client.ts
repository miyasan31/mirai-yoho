import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { envServer } from "@/config/env.server";

/**
 * FIRESTORE_EMULATOR_HOST が設定されていると firebase-admin の Firestore は
 * 自動でエミュレーターに接続する（Auth は本物のプロジェクトを使い続ける）。
 * 本番で設定されているとデータがどこにも保存されないため、起動時に落とす。
 */
function assertEmulatorUsage() {
  const emulatorHost = envServer.firestoreEmulatorHost;
  if (!emulatorHost) {
    return;
  }

  if (envServer.nodeEnv === "production") {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST must not be set when NODE_ENV=production",
    );
  }

  console.info(`[firestore] using emulator at ${emulatorHost}`);
}

function initializeFirebaseAdmin() {
  assertEmulatorUsage();

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
