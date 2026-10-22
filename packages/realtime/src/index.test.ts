import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "./index.js";

describe("@parlivo/realtime", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@parlivo/realtime");
  });
});
