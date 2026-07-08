import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
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
import { envClient } from "@/config/env.client";
import type { OrganizationAccount } from "@/lib/auth-types";
import { auth } from "@/lib/firebase";

export interface AuthState {
  user: User | null;
  token: string | null;
  accounts: OrganizationAccount[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
  currentRole: string | null;
  role: string | null;
  permissions: AuthorizationPermission[];
  hasPermission: (permission: AuthorizationPermission) => boolean;
  hasAnyPermission: (permissions: AuthorizationPermission[]) => boolean;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    currentOrganizationId: string | null;
    currentRole: string | null;
  }>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  setCurrentOrganizationId: (organizationId: string) => Promise<void>;
  refreshAuthContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<OrganizationAccount[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<
    string | null
  >(null);
  const [currentDisplayName, setCurrentDisplayName] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const syncAuthContext = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setUser(null);
      setToken(null);
      setAccounts([]);
      setCurrentOrganizationIdState(null);
      setCurrentDisplayName(null);
      return {
        accounts: [],
        currentOrganizationId: null,
        currentDisplayName: null,
      };
    }

    const idTokenResult = await nextUser.getIdTokenResult();
    setUser(nextUser);
    setToken(idTokenResult.token);

    const response = await fetch(`${envClient.apiUrl}/api/auth/me`, {
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
      accounts: OrganizationAccount[];
      currentOrganizationId: string | null;
      currentDisplayName: string | null;
    };

    setAccounts(data.accounts);
    setCurrentOrganizationIdState(data.currentOrganizationId);
    setCurrentDisplayName(data.currentDisplayName);
    return data;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        await syncAuthContext(firebaseUser);
      } catch (error) {
        console.error("Failed to sync auth context:", error);
      } finally {
        setIsLoading(false);
      }
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
        data.accounts.find(
          (account) => account.organizationId === data.currentOrganizationId,
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

      const response = await fetch(
        `${envClient.apiUrl}/api/auth/organization`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ organizationId }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update current organization");
      }

      setCurrentOrganizationIdState(organizationId);
    },
    [user, token],
  );

  const refreshAuthContext = useCallback(async () => {
    await syncAuthContext(user);
  }, [syncAuthContext, user]);

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
    accounts.find((account) => account.organizationId === currentOrganizationId)
      ?.role ?? null;
  const permissions =
    accounts.find((account) => account.organizationId === currentOrganizationId)
      ?.permissions ?? [];

  const hasPermission = useCallback(
    (permission: AuthorizationPermission) => permissions.includes(permission),
    [permissions],
  );
  const hasAnyPermission = useCallback(
    (targetPermissions: AuthorizationPermission[]) =>
      targetPermissions.some((permission) => permissions.includes(permission)),
    [permissions],
  );

  return useMemo(
    () => ({
      user,
      token,
      accounts,
      currentOrganizationId,
      currentDisplayName,
      currentRole,
      role: currentRole,
      permissions,
      hasPermission,
      hasAnyPermission,
      isLoading,
      signIn,
      sendPasswordResetEmail,
      setCurrentOrganizationId,
      refreshAuthContext,
      signOut,
    }),
    [
      user,
      token,
      accounts,
      currentOrganizationId,
      currentDisplayName,
      currentRole,
      permissions,
      hasPermission,
      hasAnyPermission,
      isLoading,
      signIn,
      sendPasswordResetEmail,
      setCurrentOrganizationId,
      refreshAuthContext,
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
