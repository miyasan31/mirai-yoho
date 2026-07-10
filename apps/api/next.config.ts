import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase App Hosting が起動用の server.js を生成できるようにする
  output: "standalone",
  // pnpm workspace のルートを file tracing のルートに固定する。
  // これにより standalone 出力が apps/api/.next/standalone/apps/api/server.js に
  // なり、apphosting.yaml の runCommand のパスと一致する。
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
