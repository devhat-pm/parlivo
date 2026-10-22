import { describe, expect, it } from "vitest";
import { DEFAULT_PORT, resolvePort } from "./config.js";

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
