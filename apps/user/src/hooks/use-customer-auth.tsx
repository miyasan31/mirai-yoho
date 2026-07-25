import { signupCustomer } from "@mirai-yoho/api-client/api/customer/customer";
import type { CustomerProfile } from "@mirai-yoho/api-client/schemas";
import { useQueryClient } from "@tanstack/react-query";
import {
  type User as FirebaseUser,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { envClient } from "@/config/env.client";
import { auth } from "@/lib/firebase";

export interface CustomerAuthState {
  user: FirebaseUser | null;
  token: string | null;
  profile: CustomerProfile | null;
  isSignedUp: boolean;
  isAnonymous: boolean;
  hasGoogleProvider: boolean;
  hasActiveZoomConnection: boolean;
  isLoading: boolean;
  signInAnonymously: () => Promise<FirebaseUser>;
  signInWithGoogle: () => Promise<FirebaseUser>;
  linkGoogleAccount: () => Promise<FirebaseUser>;
  signupOrLink: (params: {
    displayName: string;
    birthDate: string;
    primaryEmail?: string;
    providerUid?: string;
  }) => Promise<{ userId: string; isNew: boolean }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const CustomerAuthContext = createContext<CustomerAuthState | null>(
  null,
);

// 未登録（404）を「エラーではなく状態」として扱う必要があるため、
// グローバルの 404 ハンドリング（/404 リダイレクト）を持つ api-client は使わず直接 fetch する
async function fetchProfile(token: string): Promise<CustomerProfile | null> {
  const baseUrl = envClient.apiUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/customer/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load customer profile (${response.status})`);
  }
  return (await response.json()) as CustomerProfile;
}

export function useCustomerAuthState(): CustomerAuthState {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sync = useCallback(async (nextUser: FirebaseUser | null) => {
    if (!nextUser) {
      setUser(null);
      setToken(null);
      setProfile(null);
      return;
    }
    const idToken = await nextUser.getIdToken();
    setUser(nextUser);
    setToken(idToken);
    const nextProfile = await fetchProfile(idToken);
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        await sync(firebaseUser);
      } finally {
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, [sync]);

  const signInAnonymously = useCallback(async () => {
    const credential = await firebaseSignInAnonymously(auth);
    await sync(credential.user);
    return credential.user;
  }, [sync]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await sync(credential.user);
    return credential.user;
  }, [sync]);

  const linkGoogleAccount = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error("Not signed in");
    }
    const provider = new GoogleAuthProvider();
    const popupResult = await signInWithPopup(auth, provider);
    const googleCredential =
      GoogleAuthProvider.credentialFromResult(popupResult);
    if (!googleCredential) {
      throw new Error("Failed to obtain Google credential");
    }
    const linked = await linkWithCredential(auth.currentUser, googleCredential);
    await sync(linked.user);
    return linked.user;
  }, [sync]);

  const signupOrLink = useCallback(
    async (params: {
      displayName: string;
      birthDate: string;
      primaryEmail?: string;
      providerUid?: string;
    }) => {
      if (!user || !token) {
        throw new Error("Not signed in");
      }
      const response = await signupCustomer(params);
      const nextProfile = await fetchProfile(token);
      setProfile(nextProfile);
      return response.data;
    },
    [user, token],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const idToken = await user.getIdToken(true);
    setToken(idToken);
    const nextProfile = await fetchProfile(idToken);
    setProfile(nextProfile);
  }, [user]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    queryClient.clear();
  }, [queryClient]);

  const isAnonymous = user?.isAnonymous ?? false;
  const hasGoogleProvider =
    profile?.authProviders.some((p) => p.providerId === "google.com") ?? false;

  return useMemo(
    () => ({
      user,
      token,
      profile,
      isSignedUp: profile !== null,
      isAnonymous,
      hasGoogleProvider,
      hasActiveZoomConnection: profile?.hasActiveZoomConnection ?? false,
      isLoading,
      signInAnonymously,
      signInWithGoogle,
      linkGoogleAccount,
      signupOrLink,
      refreshProfile,
      signOut,
    }),
    [
      user,
      token,
      profile,
      isAnonymous,
      hasGoogleProvider,
      isLoading,
      signInAnonymously,
      signInWithGoogle,
      linkGoogleAccount,
      signupOrLink,
      refreshProfile,
      signOut,
    ],
  );
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const value = useCustomerAuthState();
  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthState {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error(
      "useCustomerAuth must be used within a CustomerAuthProvider",
    );
  }
  return context;
}
