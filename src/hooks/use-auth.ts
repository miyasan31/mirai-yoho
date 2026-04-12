"use client";

import {
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  OrganizationMembership,
  UserRole,
} from "@/infrastructure/auth/auth-types";
import { auth } from "@/lib/firebase";

export interface AuthState {
  user: User | null;
  token: string | null;
  memberships: OrganizationMembership[];
  currentOrganizationId: string | null;
  currentRole: UserRole | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    currentOrganizationId: string | null;
    currentRole: UserRole | null;
  }>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  setCurrentOrganizationId: (organizationId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncAuthContext = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setUser(null);
      setToken(null);
      setMemberships([]);
      setCurrentOrganizationIdState(null);
      return { memberships: [], currentOrganizationId: null };
    }

    const idTokenResult = await nextUser.getIdTokenResult();
    setUser(nextUser);
    setToken(idTokenResult.token);

    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${idTokenResult.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = "Failed to load auth context";

      try {
        const errorData = (await response.json()) as {
          code?: string;
          message?: string;
        };
        if (errorData.code === "NO_ROLE") {
          errorMessage =
            "このアカウントはまだ組織に所属していません。管理者に確認してください。";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // ignore JSON parse failures and keep the fallback message
      }

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as {
      memberships: OrganizationMembership[];
      currentOrganizationId: string | null;
    };

    setMemberships(data.memberships);
    setCurrentOrganizationIdState(data.currentOrganizationId);
    return data;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      await syncAuthContext(firebaseUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [syncAuthContext]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const data = await syncAuthContext(credential.user);
      const currentRole =
        data.memberships.find(
          (membership) =>
            membership.organizationId === data.currentOrganizationId,
        )?.role ?? null;

      return {
        currentOrganizationId: data.currentOrganizationId,
        currentRole,
      };
    },
    [syncAuthContext],
  );

  const setCurrentOrganizationId = useCallback(
    async (organizationId: string) => {
      if (!user || !token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/auth/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update current organization");
      }

      setCurrentOrganizationIdState(organizationId);
    },
    [user, token],
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error) {
      const authErrorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : null;
      if (authErrorCode === "auth/user-not-found") {
        return;
      }
      throw new Error(
        "メール送信に失敗しました。時間をおいて再度お試しください。",
      );
    }
  }, []);

  const currentRole =
    memberships.find(
      (membership) => membership.organizationId === currentOrganizationId,
    )?.role ?? null;

  return useMemo(
    () => ({
      user,
      token,
      memberships,
      currentOrganizationId,
      currentRole,
      role: currentRole,
      isLoading,
      signIn,
      sendPasswordResetEmail,
      setCurrentOrganizationId,
      signOut,
    }),
    [
      user,
      token,
      memberships,
      currentOrganizationId,
      currentRole,
      isLoading,
      signIn,
      sendPasswordResetEmail,
      setCurrentOrganizationId,
      signOut,
    ],
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
