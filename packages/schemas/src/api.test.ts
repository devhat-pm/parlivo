import { describe, expect, it } from "vitest";
import {
  createMeetingRequestSchema,
  joinMeetingRequestSchema,
  languageCodeSchema,
  LANGUAGES,
} from "./index.js";

describe("languages", () => {
  it("covers the 10 launch languages plus Urdu", () => {
    expect(LANGUAGES).toHaveLength(11);
    expect(languageCodeSchema.parse("ur")).toBe("ur");
    expect(languageCodeSchema.safeParse("xx").success).toBe(false);
  });
});

describe("joinMeetingRequestSchema", () => {
  it("accepts two supported languages", () => {
    expect(
      joinMeetingRequestSchema.parse({ speakingLanguage: "de", listeningLanguage: "en" }),
    ).toEqual({ speakingLanguage: "de", listeningLanguage: "en" });
  });

  it("rejects unknown languages, missing fields and extra keys", () => {
    expect(joinMeetingRequestSchema.safeParse({ speakingLanguage: "de" }).success).toBe(false);
    expect(
      joinMeetingRequestSchema.safeParse({ speakingLanguage: "de", listeningLanguage: "xx" })
        .success,
    ).toBe(false);
    expect(
      joinMeetingRequestSchema.safeParse({
        speakingLanguage: "de",
        listeningLanguage: "en",
        admin: true,
      }).success,
    ).toBe(false);
  });
});

describe("createMeetingRequestSchema", () => {
  it("accepts an empty body and rejects a bad workspace id", () => {
    expect(createMeetingRequestSchema.parse({})).toEqual({});
    expect(createMeetingRequestSchema.safeParse({ workspaceId: "nope" }).success).toBe(false);
  });
});
