import { parseTranslatedTrackName } from "./track-names.js";

/**
 * Phase 1 placeholder "translation" (the agent echoes each speaker's clauses). It counts as
 * every listening language until real translation replaces it.
 */
export const ECHO_LANGUAGE = "echo";

export interface RemoteTrackInfo {
  /** Track name as published. Translated tracks follow `translated-{speakerId}-{lang}`. */
  trackName: string;
  /** Identity of the participant that published the track (the agent, for translated tracks). */
  publisherIdentity: string;
}

export interface LocalListener {
  /** This participant's LiveKit identity (the Participant ID). */
  identity: string;
  listeningLanguage: string;
}

export type SubscriptionDecision =
  | { subscribe: true; kind: "original" | "translated" }
  | { subscribe: false; reason: "own-track" | "own-speech-translation" | "other-language" };

/**
 * Which remote tracks a participant subscribes to (ARCHITECTURE.md section 2):
 * - original tracks (camera, microphone, screen share) of every other participant;
 * - translated tracks only in the listener's chosen language (the phase 1 "echo" counts as
 *   every language);
 * - never a translation of the listener's own speech.
 * Whether original audio of other-language speakers plays at full, reduced or zero volume is
 * a playback setting, not a subscription rule.
 */
export function decideSubscription(
  track: RemoteTrackInfo,
  listener: LocalListener,
): SubscriptionDecision {
  if (track.publisherIdentity === listener.identity)
    return { subscribe: false, reason: "own-track" };
  const translated = parseTranslatedTrackName(track.trackName);
  if (!translated) return { subscribe: true, kind: "original" };
  if (translated.speakerId === listener.identity) {
    return { subscribe: false, reason: "own-speech-translation" };
  }
  if (translated.language !== ECHO_LANGUAGE && translated.language !== listener.listeningLanguage) {
    return { subscribe: false, reason: "other-language" };
  }
  return { subscribe: true, kind: "translated" };
}
