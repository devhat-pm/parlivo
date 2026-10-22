import { describe, expect, it } from "vitest";
import { SITE_NAME, TAGLINE } from "./site";

describe("site metadata", () => {
  it("names the product", () => {
    expect(SITE_NAME).toBe("Parlivo");
    expect(TAGLINE.length).toBeGreaterThan(0);
  });
});
