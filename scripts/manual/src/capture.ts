import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import type { CaptureContext } from "./context.js";
import { loadAppConfig, parseCliArgs, resolveApp } from "./load-app.js";
import { appPaths, BROWSER_CHANNEL, VIEWPORT } from "./paths.js";
import { loadState, saveState } from "./state.js";
import type {
  Annotation,
  CapturedAnnotation,
  CapturedPage,
  CapturedSection,
  CaptureResult,
  PageDef,
  ResolvedApp,
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
    await locator.waitFor({ state: "visible", timeout: 5_000 });
    const box = await locator.boundingBox();
    return { ...annotation, box };
  } catch {
    return { ...annotation, box: null };
  }
}

async function capturePage(
  page: Page,
  def: PageDef,
  app: ResolvedApp,
  params: Record<string, string | undefined>,
  imagesDir: string,
): Promise<CapturedPage | null> {
  if (!pageIsSatisfied(def, params)) {
    console.warn(`- スキップ: ${def.id}（必要な params が不足）`);
    return null;
  }
  const url = buildUrl(app.baseUrl, def.route, params);
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
  const { appId, env: envArg } = parseCliArgs();
  const config = await loadAppConfig(appId);
  const app = resolveApp(config, envArg);
  const paths = appPaths(appId, app.env);

  mkdirSync(paths.outputDir, { recursive: true });
  mkdirSync(paths.imagesDir, { recursive: true });

  console.log(`env: ${app.env} (${app.baseUrl})`);

  const state = loadState(paths.stateFile);
  const orgId =
    process.env.MANUAL_ORG_ID ?? state.organizationId ?? app.defaultOrgId;
  const params: Record<string, string | undefined> = {
    ...state.params,
    orgId,
  };
  if (orgId) console.log(`orgId: ${orgId}`);

  const context = await chromium.launchPersistentContext(paths.profileDir, {
    headless: true,
    channel: BROWSER_CHANNEL,
    viewport: VIEWPORT,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });

  const page = context.pages()[0] ?? (await context.newPage());

  if (config.resolveDynamicParams) {
    const ctx: CaptureContext = { page, baseUrl: app.baseUrl, params };
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
        app,
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
    env: app.env,
    baseUrl: app.baseUrl,
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
