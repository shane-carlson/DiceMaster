import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  optimizeDeps: {
    exclude: ["manifold-3d"],
  },
  assetsInclude: ["**/*.wasm"],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
    env: {
      SCRYPT_N: "1024",
    },
  },
});
