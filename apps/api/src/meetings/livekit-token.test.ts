import { decodeJwt, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { mintRoomToken, ROOM_TOKEN_TTL_SECONDS } from "./livekit-token.js";

const API_KEY = "devkey";
const API_SECRET = "parlivo-dev-secret-0123456789abcdef";

async function mint() {
  return mintRoomToken({
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    roomName: "abcdefghijkl",
    identity: "11111111-1111-4111-8111-111111111111",
    name: "Dev User",
    metadata: {
      participantId: "11111111-1111-4111-8111-111111111111",
      speakingLanguage: "de",
      listeningLanguage: "en",
    },
  });
}

describe("mintRoomToken", () => {
  it("is signed by the LiveKit API secret and issued by the API key", async () => {
    const token = await mint();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(API_SECRET));
    expect(payload.iss).toBe(API_KEY);
    expect(payload.sub).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("grants room-level join, publish and subscribe for this room only", async () => {
    const claims = decodeJwt(await mint());
    expect(claims["video"]).toEqual({
      room: "abcdefghijkl",
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
  });

  it("expires after one hour", async () => {
    const claims = decodeJwt(await mint());
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBe(ROOM_TOKEN_TTL_SECONDS);
    expect(ROOM_TOKEN_TTL_SECONDS).toBe(3600);
  });

  it("carries the display name and language metadata", async () => {
    const claims = decodeJwt(await mint());
    expect(claims["name"]).toBe("Dev User");
    expect(JSON.parse(String(claims["metadata"]))).toEqual({
      participantId: "11111111-1111-4111-8111-111111111111",
      speakingLanguage: "de",
      listeningLanguage: "en",
    });
  });
});
