import { jwtVerify, SignJWT } from "jose";

/** Access tokens live 15 minutes (ARCHITECTURE.md section 9). Refresh tokens arrive later. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ISSUER = "parlivo-api";
const AUDIENCE = "parlivo";

export async function signAccessToken(userId: string, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));
}

/** Returns the user ID, or null if the token is missing, malformed, expired or forged. */
export async function verifyAccessToken(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
