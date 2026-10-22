import { decodeJwt } from "jose";
import { describe, expect, it } from "vitest";
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken, verifyAccessToken } from "./access-token.js";

const SECRET = "test-secret-test-secret-test-secret-0000";

describe("access tokens", () => {
  it("round-trips the user ID and expires after 15 minutes", async () => {
    const token = await signAccessToken("user-1", SECRET);
    expect(await verifyAccessToken(token, SECRET)).toBe("user-1");
    const claims = decodeJwt(token);
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(ACCESS_TOKEN_TTL_SECONDS);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signAccessToken("user-1", SECRET);
    expect(await verifyAccessToken(token, `${SECRET}-other`)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyAccessToken("not-a-jwt", SECRET)).toBeNull();
  });
});
