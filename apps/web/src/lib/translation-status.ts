export type TranslationStatus = "waiting" | "active" | "reconnecting";

/**
 * The translation agent joins every room. Once it has been seen, its absence means it is
 * being re-dispatched after a crash; original audio keeps playing meanwhile (section 4).
 */
export function translationStatus(agentPresent: boolean, agentSeen: boolean): TranslationStatus {
  if (agentPresent) return "active";
  return agentSeen ? "reconnecting" : "waiting";
}
