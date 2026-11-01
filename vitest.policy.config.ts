import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", include: ["src/test/billing-*.test.ts", "src/test/membership-*.test.ts"], pool: "forks", maxWorkers: 1, fileParallelism: false }, resolve: { alias: { "@": path.resolve("src") } } });
