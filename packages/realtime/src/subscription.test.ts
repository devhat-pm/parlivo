import { describe, expect, it } from "vitest";
import { decideSubscription } from "./subscription.js";
import { parseTranslatedTrackName, translatedTrackName } from "./track-names.js";

const ME = "aaaaaaaa-1111-4111-8111-111111111111";
const ANNA = "bbbbbbbb-2222-4222-8222-222222222222";
const AGENT = "agent-room-1";
const me = { identity: ME, listeningLanguage: "en" };

describe("track names", () => {
  it("round-trips UUID speaker IDs that contain hyphens", () => {
    expect(parseTranslatedTrackName(translatedTrackName(ANNA, "de"))).toEqual({
      speakerId: ANNA,
      language: "de",
    });
  });

  it("returns null for original and malformed names", () => {
    expect(parseTranslatedTrackName("microphone")).toBeNull();
    expect(parseTranslatedTrackName("translated-")).toBeNull();
    expect(parseTranslatedTrackName("translated-abc")).toBeNull();
    expect(parseTranslatedTrackName("translated-abc-")).toBeNull();
  });
});

describe("decideSubscription", () => {
  it("subscribes to other participants' original audio, video and screen share", () => {
    for (const trackName of ["microphone", "camera", "screen_share", ""]) {
      expect(decideSubscription({ trackName, publisherIdentity: ANNA }, me)).toEqual({
        subscribe: true,
        kind: "original",
      });
    }
  });

  it("subscribes to another speaker's translation in my listening language", () => {
    const track = { trackName: translatedTrackName(ANNA, "en"), publisherIdentity: AGENT };
    expect(decideSubscription(track, me)).toEqual({ subscribe: true, kind: "translated" });
  });

  it("never subscribes to a translation of my own speech, even in my language", () => {
    for (const language of ["en", "de"]) {
      const track = { trackName: translatedTrackName(ME, language), publisherIdentity: AGENT };
      expect(decideSubscription(track, me)).toEqual({
        subscribe: false,
        reason: "own-speech-translation",
      });
    }
  });

  it("ignores translations into languages I did not choose", () => {
    const track = { trackName: translatedTrackName(ANNA, "de"), publisherIdentity: AGENT };
    expect(decideSubscription(track, me)).toEqual({ subscribe: false, reason: "other-language" });
  });

  it("follows a language switch", () => {
    const track = { trackName: translatedTrackName(ANNA, "de"), publisherIdentity: AGENT };
    expect(decideSubscription(track, { ...me, listeningLanguage: "de" }).subscribe).toBe(true);
  });

  it("never subscribes to its own published tracks", () => {
    expect(decideSubscription({ trackName: "camera", publisherIdentity: ME }, me)).toEqual({
      subscribe: false,
      reason: "own-track",
    });
  });
});
