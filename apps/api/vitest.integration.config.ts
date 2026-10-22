import { defineConfig } from "vitest/config";

// Needs the dev stack (pnpm dev:infra) with migrations and seed applied.
export default defineConfig({
  test: {
    include: ["src/**/*.int.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
