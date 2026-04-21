import { getApps, initializeApp } from "firebase/app";
import { envClient } from "@/config/env.client";

const firebaseConfig = {
  apiKey: envClient.firebaseApiKey,
  authDomain: envClient.firebaseAuthDomain,
  projectId: envClient.firebaseProjectId,
};

export const firebaseClientApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
