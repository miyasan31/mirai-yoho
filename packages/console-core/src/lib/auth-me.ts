import type {
  AuthMe,
  AuthMeAccount,
  AuthMeConsultant,
} from "@mirai-yoho/api-client/schemas";
import { envClient } from "../config/env.client";

export type { AuthMe, AuthMeAccount, AuthMeConsultant };

/**
 * `GET /api/auth/me` を叩いて所属組織を取得する。
 *
 * 生成 hooks（customFetch）を経由しないのは、401 / 403 のグローバルハンドリング
 * （セッション切れイベントの発火・/404 へのリダイレクト）を認証ブートストラップ中に
 * 走らせたくないため。ここでは NO_ROLE を利用者向けの文言に差し替えて throw し、
 * 呼び出し側（各アプリの use-auth）がログイン画面で表示する。
 * 型は openapi から生成した AuthMe を使う。
 */
export async function fetchAuthMe(idToken: string): Promise<AuthMe> {
  const baseUrl = envClient.apiUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    throw new Error(await toAuthMeErrorMessage(response));
  }

  return (await response.json()) as AuthMe;
}

async function toAuthMeErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = (await response.json()) as {
      code?: string;
      message?: string;
    };
    if (errorData.code === "NO_ROLE") {
      return "このアカウントはまだ組織に所属していません。管理者に確認してください。";
    }
    if (errorData.message) {
      return errorData.message;
    }
  } catch {
    // JSON でない / パースできない場合はフォールバック文言を使う
  }
  return "Failed to load auth context";
}
