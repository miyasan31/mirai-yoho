import type { CapturedPage, CapturedSection, CaptureResult } from "./types.js";

const CSS = `
  :root {
    --page-fg: #1f1f21;
    --page-fg-muted: #66666b;
    --accent: #4b3bff;
    --accent-fg: #ffffff;
    --border: #e5e5ea;
    --surface: #ffffff;
    --surface-muted: #f7f7fa;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: var(--page-fg);
    font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic",
      "Meiryo", -apple-system, "Segoe UI", sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    background: var(--surface);
  }
  .page {
    page-break-after: always;
    padding: 16mm 15mm;
  }
  .page:last-child {
    page-break-after: auto;
  }
  .screen {
    display: flex;
    flex-direction: column;
    height: 265mm;
  }
  .screen__image-wrap {
    text-align: center;
    page-break-inside: avoid;
    margin-bottom: 5mm;
  }
  .cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 240mm;
    padding: 40mm 24mm;
  }
  .cover__eyebrow {
    color: var(--accent);
    font-size: 10pt;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-bottom: 12mm;
  }
  .cover__title {
    font-size: 32pt;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.25;
    margin: 0 0 6mm;
  }
  .cover__subtitle {
    font-size: 13pt;
    color: var(--page-fg-muted);
    margin: 0 0 24mm;
  }
  .cover__meta {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 12mm;
    row-gap: 3mm;
    font-size: 10pt;
    color: var(--page-fg-muted);
    padding-top: 8mm;
    border-top: 1px solid var(--border);
  }
  .cover__meta dt {
    font-weight: 600;
    color: var(--page-fg);
  }
  .cover__meta dd {
    margin: 0;
  }
  .toc {
    padding: 20mm 18mm;
  }
  .toc__title {
    font-size: 20pt;
    font-weight: 700;
    margin: 0 0 10mm;
    padding-bottom: 4mm;
    border-bottom: 2px solid var(--page-fg);
  }
  .toc__section {
    margin-bottom: 8mm;
  }
  .toc__section-title {
    font-size: 12pt;
    font-weight: 700;
    color: var(--accent);
    margin: 0 0 3mm;
  }
  .toc__list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .toc__item {
    display: flex;
    justify-content: space-between;
    padding: 2mm 0;
    border-bottom: 1px dotted var(--border);
    font-size: 11pt;
  }
  .toc__item-title {
    font-weight: 500;
  }
  .toc__item-meta {
    color: var(--page-fg-muted);
    font-size: 9pt;
  }
  .section-cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 200mm;
  }
  .section-cover__eyebrow {
    color: var(--accent);
    font-size: 10pt;
    letter-spacing: 0.16em;
    margin-bottom: 6mm;
  }
  .section-cover__title {
    font-size: 28pt;
    font-weight: 700;
    margin: 0 0 6mm;
  }
  .section-cover__hint {
    color: var(--page-fg-muted);
    font-size: 11pt;
    max-width: 140mm;
  }
  .screen__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4mm;
    padding-bottom: 2mm;
    margin-bottom: 3mm;
    border-bottom: 1.5px solid var(--page-fg);
  }
  .screen__eyebrow {
    color: var(--accent);
    font-size: 8pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0 0 1mm;
  }
  .screen__title {
    font-size: 16pt;
    font-weight: 700;
    margin: 0;
    line-height: 1.25;
  }
  .screen__id {
    color: var(--page-fg-muted);
    font-size: 8pt;
    font-family: "SF Mono", Menlo, monospace;
  }
  .screen__overview {
    font-size: 10pt;
    color: var(--page-fg);
    margin: 0 0 4mm;
    max-width: 160mm;
    line-height: 1.55;
  }
  .screen__image {
    position: relative;
    display: inline-block;
    max-width: 100%;
    vertical-align: top;
    border: 1px solid var(--border);
    border-radius: 2mm;
    overflow: hidden;
    background: var(--surface-muted);
    line-height: 0;
  }
  .screen__image img {
    display: block;
    max-width: 100%;
    max-height: 140mm;
    width: auto;
    height: auto;
  }
  .pin {
    position: absolute;
    width: 4mm;
    height: 4mm;
    margin-left: -2mm;
    margin-top: -2mm;
    background: var(--accent);
    color: var(--accent-fg);
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 6pt;
    border: 0.75px solid var(--accent-fg);
  }
  .annotations {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5mm 3mm;
  }
  .annotation {
    display: grid;
    grid-template-columns: 5mm 1fr;
    gap: 2.5mm;
    padding: 2mm 2.5mm;
    border: 1px solid var(--border);
    border-radius: 1.5mm;
    background: var(--surface-muted);
    align-items: start;
  }
  .annotation__n {
    width: 5mm;
    height: 5mm;
    background: var(--accent);
    color: var(--accent-fg);
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 7pt;
  }
  .annotation__title {
    font-weight: 700;
    font-size: 9.5pt;
    margin: 0 0 0.5mm;
    line-height: 1.3;
  }
  .annotation__body {
    font-size: 9pt;
    color: var(--page-fg);
    margin: 0;
    line-height: 1.45;
  }
  .annotation--unresolved .annotation__n {
    background: var(--page-fg-muted);
  }
`;

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPin(
  annotation: CapturedPage["annotations"][number],
  imageWidth: number,
  imageHeight: number,
): string {
  if (!annotation.box || imageWidth === 0 || imageHeight === 0) return "";
  const centerX = annotation.box.x + annotation.box.width / 2;
  const centerY = annotation.box.y + annotation.box.height / 2;
  const leftPct = (centerX / imageWidth) * 100;
  const topPct = (centerY / imageHeight) * 100;
  return `<span class="pin" style="left:${leftPct.toFixed(2)}%;top:${topPct.toFixed(2)}%">${annotation.n}</span>`;
}

function renderScreen(screen: CapturedPage, sectionTitle: string): string {
  const pins = screen.annotations
    .map((a) => renderPin(a, screen.imageWidth, screen.imageHeight))
    .join("");
  const annotations = screen.annotations
    .map((a) => {
      const cls = a.box ? "annotation" : "annotation annotation--unresolved";
      return `
        <div class="${cls}">
          <div class="annotation__n">${a.n}</div>
          <div>
            <p class="annotation__title">${escapeHtml(a.title)}</p>
            <p class="annotation__body">${escapeHtml(a.description)}</p>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="page screen">
      <header class="screen__header">
        <div>
          <p class="screen__eyebrow">${escapeHtml(sectionTitle)}</p>
          <h2 class="screen__title">${escapeHtml(screen.title)}</h2>
        </div>
        <span class="screen__id">${escapeHtml(screen.id)}</span>
      </header>
      <p class="screen__overview">${escapeHtml(screen.overview)}</p>
      <div class="screen__image-wrap">
        <div class="screen__image">
          <img src="${escapeHtml(screen.imagePath)}" alt="${escapeHtml(screen.title)}" />
          ${pins}
        </div>
      </div>
      <div class="annotations">${annotations}</div>
    </section>
  `;
}

function renderSection(section: CapturedSection, index: number): string {
  const cover = `
    <section class="page section-cover">
      <p class="section-cover__eyebrow">SECTION ${String(index + 1).padStart(2, "0")}</p>
      <h2 class="section-cover__title">${escapeHtml(section.title)}</h2>
      <p class="section-cover__hint">${section.pages.length} 画面</p>
    </section>
  `;
  const pages = section.pages
    .map((p) => renderScreen(p, section.title))
    .join("");
  return `${cover}${pages}`;
}

function renderCover(result: CaptureResult): string {
  const date = result.capturedAt.slice(0, 10);
  return `
    <section class="page cover">
      <p class="cover__eyebrow">Operation Manual</p>
      <h1 class="cover__title">${escapeHtml(result.appName)}<br/>操作マニュアル</h1>
      <p class="cover__subtitle">${escapeHtml(result.audience)}向け</p>
      <dl class="cover__meta">
        <dt>アプリ</dt><dd>${escapeHtml(result.appId)}</dd>
        <dt>環境</dt><dd>${escapeHtml(result.env)} (${escapeHtml(result.baseUrl)})</dd>
        <dt>作成日</dt><dd>${escapeHtml(date)}</dd>
        <dt>画面数</dt><dd>${result.sections.reduce((s, sec) => s + sec.pages.length, 0)} 画面</dd>
      </dl>
    </section>
  `;
}

function renderToc(result: CaptureResult): string {
  const sections = result.sections
    .map((sec, i) => {
      const items = sec.pages
        .map(
          (p) => `
        <li class="toc__item">
          <span class="toc__item-title">${escapeHtml(p.title)}</span>
          <span class="toc__item-meta">${escapeHtml(p.id)}</span>
        </li>
      `,
        )
        .join("");
      return `
        <div class="toc__section">
          <p class="toc__section-title">${String(i + 1).padStart(2, "0")}. ${escapeHtml(sec.title)}</p>
          <ul class="toc__list">${items}</ul>
        </div>
      `;
    })
    .join("");
  return `
    <section class="page toc">
      <h2 class="toc__title">目次</h2>
      ${sections}
    </section>
  `;
}

export function renderHtml(result: CaptureResult): string {
  const cover = renderCover(result);
  const toc = renderToc(result);
  const sections = result.sections.map((s, i) => renderSection(s, i)).join("");
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(result.appName)} 操作マニュアル</title>
  <style>${CSS}</style>
</head>
<body>
  ${cover}
  ${toc}
  ${sections}
</body>
</html>`;
}
