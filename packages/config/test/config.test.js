import { describe, expect, it } from "vitest";
import base from "../eslint/base.js";
import react from "../eslint/react.js";
import prettier from "../prettier.json" with { type: "json" };

describe("@parlivo/config", () => {
  it("exports flat ESLint configs", () => {
    expect(Array.isArray(base)).toBe(true);
    expect(react.length).toBeGreaterThan(base.length);
  });

  it("exports a Prettier config", () => {
    expect(prettier.printWidth).toBe(100);
  });
});
