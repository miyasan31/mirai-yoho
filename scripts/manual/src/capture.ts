import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import type { CaptureContext } from "./context.js";
import { loadAppConfig, resolveAppId } from "./load-app.js";
import { appPaths, VIEWPORT } from "./paths.js";
import { loadState, saveState } from "./state.js";
import type {
  Annotation,
  AppConfig,
  CapturedAnnotation,
  CapturedPage,
  CapturedSection,
  CaptureResult,
  PageDef,
} from "./types.js";

function buildUrl(
  baseUrl: string,
  route: string,
  params: Record<string, string | undefined>,
): string | null {
  let path = route;
  const placeholders = route.match(/\{([^}]+)\}/g) ?? [];
  for (const placeholder of placeholders) {
    const key = placeholder.slice(1, -1);
    const value = params[key];
    if (!value) return null;
    path = path.replaceAll(placeholder, encodeURIComponent(value));
  }
  return `${baseUrl}${path}`;
}

function pageIsSatisfied(
  def: PageDef,
  params: Record<string, string | undefined>,
): boolean {
  for (const key of def.requires ?? []) {
    if (!params[key]) return false;
  }
  return true;
}

async function captureAnnotationBox(
  page: Page,
  annotation: Annotation,
): Promise<CapturedAnnotation> {
  if (!annotation.selector) {
    return { ...annotation, box: null };
  }
  try {
    const locator = page.locator(annotation.selector).first();
    await locator.waitFor({ state: "visible", timeout: 1_500 });
    const box = await locator.boundingBox();
    return { ...annotation, box };
  } catch {
    return { ...annotation, box: null };
  }
}

async function capturePage(
  page: Page,
  def: PageDef,
  config: AppConfig,
  params: Record<string, string | undefined>,
  imagesDir: string,
): Promise<CapturedPage | null> {
  if (!pageIsSatisfied(def, params)) {
    console.warn(`- スキップ: ${def.id}（必要な params が不足）`);
    return null;
  }
  const url = buildUrl(config.baseUrl, def.route, params);
  if (!url) {
    console.warn(`- スキップ: ${def.id}（URL 構築失敗）`);
    return null;
  }

  console.log(`- 撮影: ${def.id} (${url})`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  if (def.waitForSelector) {
    try {
      await page.waitForSelector(def.waitForSelector, { timeout: 10_000 });
    } catch {
      console.warn(
        `  waitForSelector が見つかりません: ${def.waitForSelector}`,
      );
    }
  }
  await page
    .waitForLoadState("networkidle", { timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(500);

  const imageName = `${def.id}.png`;
  const imagePath = join(imagesDir, imageName);
  await page.screenshot({ path: imagePath, fullPage: true });

  const dims = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));

  const annotations: CapturedAnnotation[] = [];
  for (const annotation of def.annotations) {
    annotations.push(await captureAnnotationBox(page, annotation));
  }

  return {
    id: def.id,
    title: def.title,
    overview: def.overview,
    url,
    imagePath: `images/${imageName}`,
    imageWidth: dims.width,
    imageHeight: dims.height,
    annotations,
  };
}

async function main() {
  const appId = resolveAppId();
  const config = await loadAppConfig(appId);
  const paths = appPaths(appId);

  mkdirSync(paths.outputDir, { recursive: true });
  mkdirSync(paths.imagesDir, { recursive: true });

  const state = loadState(paths.stateFile);
  const params: Record<string, string | undefined> = {
    ...state.params,
    orgId: state.organizationId,
  };

  const context = await chromium.launchPersistentContext(paths.profileDir, {
    headless: true,
    viewport: VIEWPORT,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });

  const page = context.pages()[0] ?? (await context.newPage());

  if (config.resolveDynamicParams) {
    const ctx: CaptureContext = { page, baseUrl: config.baseUrl, params };
    const resolved = await config.resolveDynamicParams(ctx);
    Object.assign(params, resolved);
    state.params = { ...state.params, ...resolved };
    saveState(paths.stateFile, state);
  }

  const sections: CapturedSection[] = [];
  for (const sectionDef of config.sections) {
    const pages: CapturedPage[] = [];
    for (const pageDef of sectionDef.pages) {
      const captured = await capturePage(
        page,
        pageDef,
        config,
        params,
        paths.imagesDir,
      );
      if (captured) pages.push(captured);
    }
    if (pages.length > 0) {
      sections.push({ id: sectionDef.id, title: sectionDef.title, pages });
    }
  }

  const result: CaptureResult = {
    appId: config.appId,
    appName: config.appName,
    audience: config.audience,
    capturedAt: new Date().toISOString(),
    sections,
  };

  writeFileSync(
    paths.captureJson,
    `${JSON.stringify(result, null, 2)}\n`,
    "utf-8",
  );

  const totalPages = sections.reduce((sum, s) => sum + s.pages.length, 0);
  console.log(`\n✅ ${totalPages} 画面をキャプチャしました。`);
  console.log(`   ${paths.captureJson}`);

  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
