import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase App Hosting が起動用の server.js を生成できるようにする
  output: "standalone",
};

export default nextConfig;
