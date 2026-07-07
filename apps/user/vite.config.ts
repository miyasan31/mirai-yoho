import { resolve } from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "styled-system": resolve(__dirname, "./styled-system"),
    },
  },
  server: {
    port: 5173,
  },
});
