import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type SavedState = {
  organizationId?: string;
  params: Record<string, string | undefined>;
};

export function loadState(stateFile: string): SavedState {
  if (!existsSync(stateFile)) {
    return { params: {} };
  }
  const raw = JSON.parse(
    readFileSync(stateFile, "utf-8"),
  ) as Partial<SavedState>;
  return { ...raw, params: raw.params ?? {} };
}

export function saveState(stateFile: string, state: SavedState): void {
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}
