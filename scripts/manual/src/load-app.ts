import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { APPS_DIR } from "./paths.js";
import type { AppConfig, ResolvedApp } from "./types.js";

export type CliArgs = {
  appId: string;
  env: string | undefined;
};

export function parseCliArgs(): CliArgs {
  const appId = process.argv[2] ?? process.env.MANUAL_APP;
  const env = process.argv[3] ?? process.env.MANUAL_ENV;
  if (!appId) {
    console.error(
      "アプリ ID を指定してください（例: pnpm --filter manual login consultant [env]）",
    );
    process.exit(1);
  }
  return { appId, env };
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

export function resolveApp(config: AppConfig, envArg?: string): ResolvedApp {
  const env = envArg ?? config.defaultEnv;
  const envConfig = config.environments[env];
  if (!envConfig) {
    const available = Object.keys(config.environments).join(", ");
    throw new Error(
      `環境 "${env}" は ${config.appId} で未定義です。定義済み: ${available}`,
    );
  }
  const defaultOrgId = process.env.MANUAL_ORG_ID ?? envConfig.defaultOrgId;
  return { config, env, baseUrl: envConfig.baseUrl, defaultOrgId };
}
