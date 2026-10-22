import type { CaptionMessage } from "@parlivo/schemas";
import { describe, expect, it } from "vitest";
import { applyCaption } from "./caption-rail";

const base: CaptionMessage = {
  type: "caption",
  version: 1,
  speakerId: "anna",
  clauseId: "anna:1",
  language: "de",
  text: "Heute ist",
  isFinal: false,
  startMs: 0,
  endMs: 900,
};

describe("applyCaption", () => {
  it("replaces a partial with the final of the same clause", () => {
    const lines = applyCaption([base], {
      ...base,
      text: "Heute ist das Wetter schön.",
      isFinal: true,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ isFinal: true, text: "Heute ist das Wetter schön." });
  });

  it("ignores a partial that arrives after the final", () => {
    const final = { ...base, text: "Fertig.", isFinal: true };
    expect(applyCaption([final], { ...base, text: "Fer" })).toEqual([final]);
  });

  it("keeps the six most recent clauses in order", () => {
    let lines: CaptionMessage[] = [];
    for (let i = 1; i <= 8; i += 1) lines = applyCaption(lines, { ...base, clauseId: `anna:${i}` });
    expect(lines.map((line) => line.clauseId)).toEqual([
      "anna:3",
      "anna:4",
      "anna:5",
      "anna:6",
      "anna:7",
      "anna:8",
    ]);
  });
});
