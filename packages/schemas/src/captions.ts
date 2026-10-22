import { z } from "zod";

/** LiveKit data-channel topic for caption messages from the translation agent. */
export const CAPTIONS_TOPIC = "captions";

/** Mirrors parlivo_schemas.captions.CaptionMessage (packages/schemas/python). */
export const captionMessageSchema = z.object({
  type: z.literal("caption"),
  version: z.literal(1),
  speakerId: z.string().min(1),
  clauseId: z.string().min(1),
  language: z.string().min(2),
  text: z.string(),
  isFinal: z.boolean(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
});
export type CaptionMessage = z.infer<typeof captionMessageSchema>;
