import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "./index.js";

describe("@parlivo/i18n", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@parlivo/i18n");
  });
});
