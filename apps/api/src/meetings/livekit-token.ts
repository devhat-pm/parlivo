import type { ParticipantMetadata } from "@parlivo/schemas";
import { AccessToken } from "livekit-server-sdk";

export const ROOM_TOKEN_TTL_SECONDS = 60 * 60;

export interface RoomTokenInput {
  apiKey: string;
  apiSecret: string;
  roomName: string;
  identity: string;
  name: string;
  metadata: ParticipantMetadata;
}

/**
 * Mint a LiveKit room token with room-level grants only: join this room, publish and
 * subscribe. Per-track restrictions (translated tracks by language) are enforced later by
 * the translation agent through LiveKit's per-track subscription permissions.
 */
export async function mintRoomToken(input: RoomTokenInput): Promise<string> {
  const token = new AccessToken(input.apiKey, input.apiSecret, {
    identity: input.identity,
    name: input.name,
    metadata: JSON.stringify(input.metadata),
    ttl: ROOM_TOKEN_TTL_SECONDS,
  });
  token.addGrant({
    room: input.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  return token.toJwt();
}
