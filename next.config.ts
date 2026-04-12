import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    authInterrupts: true,
  },
  reactCompiler: true,
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
