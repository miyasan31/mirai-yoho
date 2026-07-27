import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { loadAppConfig, resolveAppId } from "./load-app.js";
import { appPaths, VIEWPORT } from "./paths.js";
import { loadState, saveState } from "./state.js";

async function main() {
  const appId = resolveAppId();
  const config = await loadAppConfig(appId);
  const paths = appPaths(appId);

  mkdirSync(paths.profileDir, { recursive: true });

  const loginUrl = `${config.baseUrl}${config.loginPath}`;

  console.log("");
  console.log("=".repeat(60));
  console.log(`${config.appName} マニュアル用ログインセッションを準備します`);
  console.log("=".repeat(60));
  console.log("");
  console.log(`URL: ${loginUrl}`);
  console.log("");
  console.log("ブラウザが開いたら手動でログインしてください。");
  console.log("ログイン完了を URL パターンで自動検知します。");
  console.log("");

  const context = await chromium.launchPersistentContext(paths.profileDir, {
    headless: false,
    viewport: VIEWPORT,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(loginUrl);

  await page.waitForURL(config.postLoginUrlPattern, { timeout: 5 * 60 * 1000 });

  const state = loadState(paths.stateFile);
  const finalUrl = page.url();
  if (config.extractOrganizationId) {
    const orgId = config.extractOrganizationId(finalUrl);
    if (orgId) state.organizationId = orgId;
  }
  saveState(paths.stateFile, state);

  console.log("");
  console.log("✅ ログインを検知しました。");
  if (state.organizationId) {
    console.log(`   organizationId: ${state.organizationId}`);
  }
  console.log("");
  console.log("次に以下を実行してください:");
  console.log(`   pnpm --filter manual capture ${appId}`);
  console.log("");

  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
