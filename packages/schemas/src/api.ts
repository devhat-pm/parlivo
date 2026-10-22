import { z } from "zod";
import { languageCodeSchema } from "./languages.js";

/** Contracts between apps/api and its clients. Validated on both sides. */

export const devLoginRequestSchema = z.strictObject({
  email: z.email().optional(),
});
export type DevLoginRequest = z.infer<typeof devLoginRequestSchema>;

export const devLoginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({ id: z.uuid(), email: z.email(), name: z.string() }),
});
export type DevLoginResponse = z.infer<typeof devLoginResponseSchema>;

export const createMeetingRequestSchema = z.strictObject({
  workspaceId: z.uuid().optional(),
  scheduledAt: z.iso.datetime().optional(),
});
export type CreateMeetingRequest = z.infer<typeof createMeetingRequestSchema>;

export const meetingSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  hostMemberId: z.uuid(),
  roomId: z.string().length(12),
  region: z.string(),
  scheduledAt: z.string().nullable(),
  languagesPresent: z.array(languageCodeSchema),
  recording: z.boolean(),
  status: z.enum(["scheduled", "live", "ended"]),
});
export type Meeting = z.infer<typeof meetingSchema>;

export const joinMeetingRequestSchema = z.strictObject({
  speakingLanguage: languageCodeSchema,
  listeningLanguage: languageCodeSchema,
});
export type JoinMeetingRequest = z.infer<typeof joinMeetingRequestSchema>;

/** LiveKit participant metadata, set in the room token. */
export const participantMetadataSchema = z.object({
  participantId: z.uuid(),
  speakingLanguage: languageCodeSchema,
  listeningLanguage: languageCodeSchema,
});
export type ParticipantMetadata = z.infer<typeof participantMetadataSchema>;

export const joinMeetingResponseSchema = z.object({
  participantId: z.uuid(),
  identity: z.string(),
  roomName: z.string(),
  serverUrl: z.string(),
  token: z.string(),
  expiresInSeconds: z.number().int().positive(),
});
export type JoinMeetingResponse = z.infer<typeof joinMeetingResponseSchema>;
