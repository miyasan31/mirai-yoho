import { configureApiClient } from "@mirai-yoho/api-client/custom-fetch";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { envClient } from "@/config/env.client";
import { auth } from "@/lib/firebase";

export function setupApiClient(): void {
  configureApiClient({
    baseUrl: envClient.apiUrl,
    // 顧客が Firebase Auth（匿名 / Google）でログイン済みなら ID token を付与する
    getToken: async () => {
      const user = auth.currentUser;
      if (!user) return null;
      return user.getIdToken();
    },
    onForbiddenOrNotFound: () => {
      if (window.location.pathname !== "/404") {
        window.location.assign("/404");
      }
    },
    onError: (error) => {
      toaster.error({
        title: "エラー",
        description: error.message,
      });
    },
  });
}
