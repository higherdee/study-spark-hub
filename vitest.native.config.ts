import { defineConfig } from "vitest/config";
import path from "node:path";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: [
      "src/test/native-web-pdf.test.ts",
      "src/test/pdf-workshop-flow.test.tsx",
      "src/test/app-cashout-flow.test.tsx",
    ],
    testTimeout: 60000,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
  resolve: { alias: { "@": path.resolve("src") } },
});
