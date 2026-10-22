import { describe, expect, it } from "vitest";
import { PACKAGE_NAME, parlivoTheme } from "./index.js";

describe("@parlivo/ui", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@parlivo/ui");
  });

  it("exposes an Ant Design theme", () => {
    expect(parlivoTheme.token?.fontFamily).toContain("Inter");
  });
});
