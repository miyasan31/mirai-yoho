import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { loadAppConfig, parseCliArgs, resolveApp } from "./load-app.js";
import { appPaths } from "./paths.js";
import { renderHtml } from "./template.js";
import type { CaptureResult } from "./types.js";
import { validateAppConfig } from "./validate-config.js";

async function main() {
  const { appId, env: envArg } = parseCliArgs();
  const config = await loadAppConfig(appId);
  validateAppConfig(config);
  const app = resolveApp(config, envArg);
  const paths = appPaths(appId, app.env);

  const raw = readFileSync(paths.captureJson, "utf-8");
  const result = JSON.parse(raw) as CaptureResult;

  const html = renderHtml(result);
  writeFileSync(paths.htmlFile, html, "utf-8");

  mkdirSync(dirname(paths.finalPdf), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(paths.htmlFile).toString(), {
    waitUntil: "networkidle",
  });
  await page.pdf({
    path: paths.finalPdf,
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });
  await browser.close();

  console.log(`\n✅ PDF を生成しました。`);
  console.log(`   ${paths.finalPdf}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
