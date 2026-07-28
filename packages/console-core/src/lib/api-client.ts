import type { ApiResponseError } from "@mirai-yoho/api-client/custom-fetch";
import { configureApiClient } from "@mirai-yoho/api-client/custom-fetch";
import { envClient } from "../config/env.client";
import { auth } from "./firebase";

export const UNAUTHORIZED_EVENT_NAME = "auth:unauthorized";

export interface SetupApiClientOptions {
  /**
   * 401 / 403 / 404 以外のエラーをユーザーに見せる。
   * console-core は panda / UI 非依存にしておきたいので、トースト表示は
   * 各アプリから注入する。
   */
  onError: (error: ApiResponseError) => void;
}

export function setupApiClient({ onError }: SetupApiClientOptions): void {
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
    onError,
  });
}
