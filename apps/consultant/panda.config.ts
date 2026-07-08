import { miraiYohoPreset } from "@mirai-yoho/ui/preset";
import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,
  shorthands: true,
  minify: false,
  jsxFramework: "react",
  outdir: "styled-system",
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda", miraiYohoPreset],
  include: [
    "./src/**/*.{ts,tsx,js,jsx}",
    "../../packages/ui/src/**/*.{ts,tsx,js,jsx}",
  ],
  exclude: [],
});
