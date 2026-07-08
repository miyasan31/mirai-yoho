import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { envClient } from "../config/env.client";

const firebaseConfig = {
  apiKey: envClient.firebaseApiKey,
  authDomain: envClient.firebaseAuthDomain,
  projectId: envClient.firebaseProjectId,
};

export const firebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
