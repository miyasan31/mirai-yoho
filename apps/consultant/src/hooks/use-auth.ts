import { envClient } from "@mirai-yoho/console-core/config/env.client";
import { auth } from "@mirai-yoho/console-core/lib/firebase";
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

export interface Consultant {
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  consultants: Consultant[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
  currentIsConsultant: boolean;
  isConsultant: boolean;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    currentOrganizationId: string | null;
    currentIsConsultant: boolean;
  }>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  setCurrentOrganizationId: (organizationId: string) => Promise<void>;
  refreshAuthContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

interface AuthMePayload {
  consultants: Consultant[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<
    string | null
  >(null);
  const [currentDisplayName, setCurrentDisplayName] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const syncAuthContext = useCallback(
    async (nextUser: User | null): Promise<AuthMePayload> => {
      if (!nextUser) {
        setUser(null);
        setToken(null);
        setConsultants([]);
        setCurrentOrganizationIdState(null);
        setCurrentDisplayName(null);
        return {
          consultants: [],
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

      const data = (await response.json()) as AuthMePayload;

      setConsultants(data.consultants ?? []);
      setCurrentOrganizationIdState(data.currentOrganizationId);
      setCurrentDisplayName(data.currentDisplayName);
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
      const currentConsultant = (data.consultants ?? []).find(
        (consultant) =>
          consultant.organizationId === data.currentOrganizationId,
      );

      return {
        currentOrganizationId: data.currentOrganizationId,
        currentIsConsultant: !!currentConsultant,
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

  const currentConsultant = consultants.find(
    (consultant) => consultant.organizationId === currentOrganizationId,
  );
  const currentIsConsultant = !!currentConsultant;

  return useMemo(
    () => ({
      user,
      token,
      consultants,
      currentOrganizationId,
      currentDisplayName,
      currentIsConsultant,
      isConsultant: currentIsConsultant,
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
      consultants,
      currentOrganizationId,
      currentDisplayName,
      currentIsConsultant,
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
