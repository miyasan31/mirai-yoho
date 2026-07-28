import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { loadAppConfig, parseCliArgs } from "./load-app.js";
import { appPaths, VIEWPORT } from "./paths.js";
import { renderHtml } from "./template.js";
import type { CaptureResult } from "./types.js";
import { validateAppConfig } from "./validate-config.js";

/**
 * 実スクリーンショットの代わりに置くプレースホルダ。
 * 画像の高さは CSS の max-height で頭打ちになるので、収まり判定には実画像と同じ条件になる。
 */
const PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWPORT.width}" height="${VIEWPORT.height * 2}"><rect width="100%" height="100%" fill="#e9e9ef"/></svg>`,
)}`;

/** .screen の固定高さ 265mm を px に直した値 */
const PAGE_LIMIT_PX = Math.round((265 * 96) / 25.4);

function buildPreviewResult(
  config: Awaited<ReturnType<typeof loadAppConfig>>,
): CaptureResult {
  return {
    appId: config.appId,
    appName: config.appName,
    audience: config.audience,
    env: "preview",
    baseUrl: "http://localhost",
    capturedAt: "1970-01-01T00:00:00.000Z",
    serviceMap: config.serviceMap,
    sections: config.sections.map((section) => ({
      id: section.id,
      title: section.title,
      pages: section.pages.map((page) => ({
        id: page.id,
        title: page.title,
        overview: page.overview,
        url: page.route,
        imagePath: PLACEHOLDER,
        imageWidth: VIEWPORT.width,
        imageHeight: VIEWPORT.height * 2,
        annotations: page.annotations.map((annotation) => ({
          ...annotation,
          box: { x: 0, y: 0, width: 1, height: 1 },
        })),
        relations: [...(page.relations ?? [])],
      })),
    })),
  };
}

async function main() {
  const { appId } = parseCliArgs();
  const config = await loadAppConfig(appId);
  validateAppConfig(config);

  const paths = appPaths(appId, "preview");
  mkdirSync(paths.outputDir, { recursive: true });
  writeFileSync(
    paths.htmlFile,
    renderHtml(buildPreviewResult(config)),
    "utf-8",
  );

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(paths.htmlFile).toString(), {
    waitUntil: "networkidle",
  });
  const overflowed = await page.evaluate((limit) => {
    const rows: { id: string; height: number }[] = [];
    for (const screen of document.querySelectorAll("section.screen")) {
      if (screen.scrollHeight <= limit + 1) continue;
      rows.push({
        id: screen.querySelector(".screen__id")?.textContent ?? "?",
        height: Math.round(screen.scrollHeight),
      });
    }
    return rows;
  }, PAGE_LIMIT_PX);
  await browser.close();

  console.log(`${paths.htmlFile}`);

  if (overflowed.length === 0) {
    console.log(`\n✅ 全画面が A4 1 ページに収まっています。`);
    return;
  }
  console.error(
    `\n❌ A4 1 ページ（${PAGE_LIMIT_PX}px）に収まらない画面があります。注釈か関連する動きを減らしてください。`,
  );
  for (const row of overflowed) {
    console.error(`   - ${row.id}: ${row.height}px`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
