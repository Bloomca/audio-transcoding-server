import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "veles/jsx-dev-runtime": "veles/jsx-runtime",
    },
  },
  test: {
    pool: "forks",
    fileParallelism: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
