import path from "node:path";
import { defineConfig } from "vite";

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  root: path.resolve(__dirname, "src/client"),
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/transcode": apiTarget,
      "/status": apiTarget,
      "/download": apiTarget,
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: false,
  },
});
