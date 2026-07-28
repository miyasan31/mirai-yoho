import { useOrganizationIdFromRoute } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { fetchAuthMe } from "@mirai-yoho/console-core/lib/auth-me";
import { auth } from "@mirai-yoho/console-core/lib/firebase";
import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import { useQueryClient } from "@tanstack/react-query";
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
import { findDefaultOrganizationId } from "@/lib/organization-access";

export interface Account {
  organizationId: string;
  /** 所属組織の名前 */
  name: string;
  /** その組織でのアカウント表示名 */
  displayName: string | null;
  roleId: string;
  roleName: string;
  permissions: AuthorizationPermission[];
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  accounts: Account[];
  /** URL の organizationId。所属していない組織のときは null */
  currentOrganizationId: string | null;
  /** URL に組織がないときの遷移先（コンソールを開ける最古の組織） */
  defaultOrganizationId: string | null;
  currentDisplayName: string | null;
  currentRoleId: string | null;
  roleId: string | null;
  permissions: AuthorizationPermission[];
  hasPermission: (permission: AuthorizationPermission) => boolean;
  hasAnyPermission: (permissions: AuthorizationPermission[]) => boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<Account[]>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  refreshAuthContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

interface AuthMePayload {
  accounts: Account[];
}

export function useAuthState(): AuthState {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const routeOrganizationId = useOrganizationIdFromRoute();

  const syncAuthContext = useCallback(
    async (nextUser: User | null): Promise<AuthMePayload> => {
      if (!nextUser) {
        setUser(null);
        setToken(null);
        setAccounts([]);
        return { accounts: [] };
      }

      const idTokenResult = await nextUser.getIdTokenResult();
      setUser(nextUser);
      setToken(idTokenResult.token);

      const data = await fetchAuthMe(idTokenResult.token);

      setAccounts(data.accounts);
      return data;
    },
    [],
  );

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
      return data.accounts;
    },
    [syncAuthContext],
  );

  const refreshAuthContext = useCallback(async () => {
    await syncAuthContext(user);
  }, [syncAuthContext, user]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    queryClient.clear();
  }, [queryClient]);

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

  // URL の organizationId を正とする。所属していない組織を指している場合は
  // 権限なし（currentOrganizationId = null）として扱い、レイアウト側で 404 に落とす。
  const currentAccount = accounts.find(
    (account) => account.organizationId === routeOrganizationId,
  );
  const currentOrganizationId = currentAccount?.organizationId ?? null;
  const currentDisplayName = currentAccount?.displayName ?? null;
  const currentRoleId = currentAccount?.roleId ?? null;
  const permissions = currentAccount?.permissions ?? [];
  const defaultOrganizationId = findDefaultOrganizationId(accounts);

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
      defaultOrganizationId,
      currentDisplayName,
      currentRoleId,
      roleId: currentRoleId,
      permissions,
      hasPermission,
      hasAnyPermission,
      isLoading,
      signIn,
      sendPasswordResetEmail,
      refreshAuthContext,
      signOut,
    }),
    [
      user,
      token,
      accounts,
      currentOrganizationId,
      defaultOrganizationId,
      currentDisplayName,
      currentRoleId,
      permissions,
      hasPermission,
      hasAnyPermission,
      isLoading,
      signIn,
      sendPasswordResetEmail,
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
