/** Translated tracks are named `translated-{speakerId}-{lang}` (ARCHITECTURE.md section 2). */
const PREFIX = "translated-";

export function translatedTrackName(speakerId: string, language: string): string {
  return `${PREFIX}${speakerId}-${language}`;
}

export interface TranslatedTrackRef {
  speakerId: string;
  language: string;
}

/**
 * Parse a translated track name, or return null for any other track. Speaker IDs may contain
 * hyphens (they are UUIDs), so the language is everything after the last hyphen.
 */
export function parseTranslatedTrackName(name: string): TranslatedTrackRef | null {
  if (!name.startsWith(PREFIX)) return null;
  const rest = name.slice(PREFIX.length);
  const split = rest.lastIndexOf("-");
  if (split <= 0 || split === rest.length - 1) return null;
  return { speakerId: rest.slice(0, split), language: rest.slice(split + 1) };
}
