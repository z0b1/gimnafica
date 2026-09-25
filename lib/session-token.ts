import { SignJWT, jwtVerify } from "jose";

// Shared by proxy.ts and server code, so no "server-only" / next/headers here.
export const SESSION_COOKIE = "gimnafica_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET mora biti postavljen (bar 32 karaktera).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
