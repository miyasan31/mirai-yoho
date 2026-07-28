import { useOrganizationIdFromRoute } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { fetchAuthMe } from "@mirai-yoho/console-core/lib/auth-me";
import { auth } from "@mirai-yoho/console-core/lib/firebase";
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

export interface Consultant {
  organizationId: string;
  /** 所属組織の名前 */
  name: string;
  /** その組織での相談員表示名 */
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  consultants: Consultant[];
  /** URL の organizationId。所属していない組織のときは null */
  currentOrganizationId: string | null;
  /** URL に組織がないときの遷移先（相談員として所属する最古の組織） */
  defaultOrganizationId: string | null;
  currentDisplayName: string | null;
  currentIsConsultant: boolean;
  isConsultant: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<Consultant[]>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  refreshAuthContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

interface AuthMePayload {
  consultants: Consultant[];
}

export function useAuthState(): AuthState {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const routeOrganizationId = useOrganizationIdFromRoute();

  const syncAuthContext = useCallback(
    async (nextUser: User | null): Promise<AuthMePayload> => {
      if (!nextUser) {
        setUser(null);
        setToken(null);
        setConsultants([]);
        return { consultants: [] };
      }

      const idTokenResult = await nextUser.getIdTokenResult();
      setUser(nextUser);
      setToken(idTokenResult.token);

      const data = await fetchAuthMe(idTokenResult.token);

      setConsultants(data.consultants ?? []);
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
      return data.consultants ?? [];
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
  // 相談員ではない扱いにして、レイアウト側で 404 に落とす。
  const currentConsultant = consultants.find(
    (consultant) => consultant.organizationId === routeOrganizationId,
  );
  const currentIsConsultant = !!currentConsultant;
  const currentOrganizationId = currentConsultant?.organizationId ?? null;
  const currentDisplayName = currentConsultant?.displayName ?? null;
  const defaultOrganizationId = findDefaultOrganizationId(consultants);

  return useMemo(
    () => ({
      user,
      token,
      consultants,
      currentOrganizationId,
      defaultOrganizationId,
      currentDisplayName,
      currentIsConsultant,
      isConsultant: currentIsConsultant,
      isLoading,
      signIn,
      sendPasswordResetEmail,
      refreshAuthContext,
      signOut,
    }),
    [
      user,
      token,
      consultants,
      currentOrganizationId,
      defaultOrganizationId,
      currentDisplayName,
      currentIsConsultant,
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
