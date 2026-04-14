import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendProxyTarget =
  process.env.BACKEND_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": backendProxyTarget,
      "/auth": backendProxyTarget,
    },
  },
});
