import { defineConfig, devices } from "@playwright/test";

// Phase 0 gate. Needs the dev stack (pnpm dev:infra), a migrated and seeded database, and
// built api and web apps; Playwright starts both servers (see tests/e2e/README.md).
// The web app runs on 3100 here so it never collides with another dev server on 3000.
const WEB_PORT = process.env["E2E_WEB_PORT"] ?? "3100";
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./specs",
  timeout: 60_000,
  workers: 1,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @parlivo/api start",
      url: `${API_URL}/health`,
      env: { CORS_ORIGINS: WEB_URL },
      cwd: "../..",
      reuseExistingServer: !process.env["CI"],
      timeout: 60_000,
    },
    {
      // STT in STT_MODE: cpu (tiny) in CI, mac (large-v3-turbo on Metal) on Apple Silicon.
      command: "uv run --locked parlivo-stt",
      url: "http://127.0.0.1:8300/healthz",
      cwd: "../../services/stt",
      env: { STT_MODE: process.env["STT_MODE"] ?? "cpu" },
      reuseExistingServer: !process.env["CI"],
      timeout: 300_000,
    },
    {
      // Translation agent with automatic restart (the crash test kills it).
      command: "bash scripts/run-agent.sh",
      url: "http://localhost:9464/metrics",
      cwd: "../..",
      reuseExistingServer: !process.env["CI"],
      timeout: 180_000,
    },
    {
      command: `pnpm --filter @parlivo/web exec next start -p ${WEB_PORT}`,
      url: WEB_URL,
      cwd: "../..",
      reuseExistingServer: !process.env["CI"],
      timeout: 60_000,
    },
  ],
});
