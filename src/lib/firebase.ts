import { getAuth } from "firebase/auth";
import { firebaseCustomerApp } from "@/infrastructure/firebase/firebase-customer-config";

export const auth = getAuth(firebaseCustomerApp);
