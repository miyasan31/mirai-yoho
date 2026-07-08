import { defineConfig } from "@pandacss/dev";
import { miraiYohoPreset } from "./panda.preset";

// このパッケージ単体の型チェック用に styled-system を生成する設定。
// CSS の抽出・生成は各アプリ（apps/user, apps/admin, apps/consultant）の panda.config.ts が行う。
export default defineConfig({
  preflight: true,
  shorthands: true,
  minify: false,
  jsxFramework: "react",
  outdir: "styled-system",
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda", miraiYohoPreset],
  include: ["./src/**/*.{ts,tsx,js,jsx}"],
  exclude: [],
});
