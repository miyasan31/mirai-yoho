import { configureApiClient } from "@mirai-yoho/api-client/custom-fetch";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { envClient } from "../config/env.client";
import { auth } from "./firebase";

export const UNAUTHORIZED_EVENT_NAME = "auth:unauthorized";

export function setupApiClient(): void {
  configureApiClient({
    baseUrl: envClient.apiUrl,
    getToken: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }
      try {
        return await currentUser.getIdToken();
      } catch {
        return null;
      }
    },
    onUnauthorized: () => {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT_NAME));
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
