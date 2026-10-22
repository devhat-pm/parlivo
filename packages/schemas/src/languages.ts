import { z } from "zod";

/** Launch languages (ARCHITECTURE.md section 1) plus Urdu, which ships as captions and text first. */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "pt", name: "Portuguese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "zh", name: "Mandarin" },
  { code: "ja", name: "Japanese" },
  { code: "it", name: "Italian" },
  { code: "ur", name: "Urdu" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

const codes = LANGUAGES.map((language) => language.code) as [LanguageCode, ...LanguageCode[]];

export const languageCodeSchema = z.enum(codes);
