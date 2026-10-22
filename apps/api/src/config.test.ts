import { describe, expect, it } from "vitest";
import { DEFAULT_PORT, loadConfig, resolvePort } from "./config.js";

describe("resolvePort", () => {
  it("uses a valid PORT value", () => {
    expect(resolvePort("8080")).toBe(8080);
  });

  it("falls back to the default for missing or invalid values", () => {
    expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
    expect(resolvePort("abc")).toBe(DEFAULT_PORT);
    expect(resolvePort("-1")).toBe(DEFAULT_PORT);
  });
});

describe("loadConfig", () => {
  it("fills development defaults that match infra/dev", () => {
    const config = loadConfig({});
    expect(config.livekit).toEqual({
      url: "ws://localhost:7880",
      apiKey: "devkey",
      apiSecret: "parlivo-dev-secret-0123456789abcdef",
    });
    expect(config.devLoginEnabled).toBe(true);
    expect(config.corsOrigins).toContain("http://localhost:3000");
  });

  it("can switch dev login off outside production", () => {
    expect(loadConfig({ DEV_LOGIN_ENABLED: "false" }).devLoginEnabled).toBe(false);
  });

  it("uses no defaults in production and refuses to start without secrets", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow();
  });

  it("never enables dev login in production", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db/parlivo",
      JWT_SECRET: "x".repeat(32),
      LIVEKIT_URL: "wss://livekit.example",
      LIVEKIT_API_KEY: "key",
      LIVEKIT_API_SECRET: "y".repeat(32),
      CORS_ORIGINS: "https://app.parlivo.example",
      DEV_LOGIN_ENABLED: "true",
    });
    expect(config.devLoginEnabled).toBe(false);
  });
});
