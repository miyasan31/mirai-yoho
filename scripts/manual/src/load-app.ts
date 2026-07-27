import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { APPS_DIR } from "./paths.js";
import type { AppConfig } from "./types.js";

export function resolveAppId(): string {
  const fromEnv = process.env.MANUAL_APP;
  const fromArg = process.argv[2];
  const appId = fromArg ?? fromEnv;
  if (!appId) {
    console.error(
      "アプリ ID を指定してください（例: pnpm --filter manual login consultant）",
    );
    process.exit(1);
  }
  return appId;
}

export async function loadAppConfig(appId: string): Promise<AppConfig> {
  const filePath = resolve(APPS_DIR, `${appId}.ts`);
  if (!existsSync(filePath)) {
    throw new Error(`アプリ設定が見つかりません: ${filePath}`);
  }
  const mod = (await import(filePath)) as { default: AppConfig };
  if (!mod.default) {
    throw new Error(
      `${filePath} は default export で AppConfig を返してください。`,
    );
  }
  return mod.default;
}
