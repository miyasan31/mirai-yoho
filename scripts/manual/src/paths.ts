import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = resolve(here, "..");
export const REPO_ROOT = resolve(ROOT_DIR, "..", "..");
export const APPS_DIR = resolve(ROOT_DIR, "apps");
export const MANUAL_DOC_DIR = resolve(REPO_ROOT, "doc", "manual");

export function appPaths(appId: string, env: string) {
  const workDir = resolve(ROOT_DIR, ".work", appId, env);
  const pdfName =
    env === "local" ? `${appId}-manual.pdf` : `${appId}-manual-${env}.pdf`;
  return {
    profileDir: resolve(workDir, "profile"),
    stateFile: resolve(workDir, "state.json"),
    outputDir: resolve(workDir, "output"),
    imagesDir: resolve(workDir, "output", "images"),
    captureJson: resolve(workDir, "output", "capture.json"),
    htmlFile: resolve(workDir, "output", "manual.html"),
    finalPdf: resolve(MANUAL_DOC_DIR, pdfName),
  };
}

export const VIEWPORT = { width: 1440, height: 900 } as const;
