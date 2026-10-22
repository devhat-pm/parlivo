import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  reporter: process.env["CI"] ? "github" : "list",
});
