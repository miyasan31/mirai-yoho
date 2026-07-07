import { configureApiClient } from "@mirai-yoho/api-client/custom-fetch";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { envClient } from "@/config/env.client";

export function setupApiClient(): void {
  configureApiClient({
    baseUrl: envClient.apiUrl,
    // user アプリは公開ページのみで認証を持たない
    getToken: async () => null,
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
