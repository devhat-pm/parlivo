import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captionMessageSchema } from "./captions.js";

// The same documents are validated by the Python side (packages/schemas/python/tests).
const contract = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../contract/${name}`, import.meta.url), "utf8"));

describe("captionMessageSchema", () => {
  it.each(["caption-partial.json", "caption-final.json"])("accepts %s", (name) => {
    expect(captionMessageSchema.parse(contract(name))).toEqual(contract(name));
  });

  it("rejects negative times and missing fields", () => {
    const document = contract("caption-final.json") as Record<string, unknown>;
    expect(captionMessageSchema.safeParse({ ...document, startMs: -1 }).success).toBe(false);
    const withoutSpeaker = { ...document };
    delete withoutSpeaker["speakerId"];
    expect(captionMessageSchema.safeParse(withoutSpeaker).success).toBe(false);
  });
});
