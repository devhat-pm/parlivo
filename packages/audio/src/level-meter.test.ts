import { describe, expect, it } from "vitest";
import { LEVEL_METER_PROCESSOR_NAME, LEVEL_METER_PROCESSOR_SOURCE, rms } from "./level-meter.js";

describe("rms", () => {
  it("is 0 for silence and empty blocks", () => {
    expect(rms(new Float32Array(128))).toBe(0);
    expect(rms(new Float32Array(0))).toBe(0);
  });

  it("is the amplitude for a constant signal and clamps at 1", () => {
    expect(rms(new Float32Array(128).fill(0.5))).toBeCloseTo(0.5);
    expect(rms(new Float32Array(128).fill(2))).toBe(1);
  });

  it("is amplitude / sqrt(2) for a full-cycle sine", () => {
    const samples = new Float32Array(128).map((_, i) => Math.sin((2 * Math.PI * i) / 128));
    expect(rms(samples)).toBeCloseTo(Math.SQRT1_2, 5);
  });
});

describe("processor source", () => {
  it("registers the named processor and embeds rms", () => {
    expect(LEVEL_METER_PROCESSOR_SOURCE).toContain(
      `registerProcessor(${JSON.stringify(LEVEL_METER_PROCESSOR_NAME)}`,
    );
    expect(LEVEL_METER_PROCESSOR_SOURCE).toContain("const rms = function rms");
  });
});
