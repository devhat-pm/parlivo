import { describe, expect, it } from "vitest";
import { translationStatus } from "./translation-status";

describe("translationStatus", () => {
  it("waits for the agent, then is active, then reconnecting if it disappears", () => {
    expect(translationStatus(false, false)).toBe("waiting");
    expect(translationStatus(true, true)).toBe("active");
    expect(translationStatus(false, true)).toBe("reconnecting");
  });
});
