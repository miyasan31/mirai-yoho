import { getAuth } from "firebase/auth";
import { firebaseClientApp } from "@/infrastructure/firebase/firebase-client-config";

export const auth = getAuth(firebaseClientApp);
