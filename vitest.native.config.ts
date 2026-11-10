import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/native-web-pdf.test.ts"],
    testTimeout: 60000,
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
  },
  resolve: { alias: { "@": path.resolve("src") } },
});
