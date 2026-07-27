import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function run(script: string): number {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", resolve(here, script), ...args],
    { stdio: "inherit" },
  );
  return result.status ?? 1;
}

const captureStatus = run("capture.ts");
if (captureStatus !== 0) process.exit(captureStatus);
process.exit(run("render.ts"));
