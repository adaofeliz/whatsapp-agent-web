import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

const JWT_EXPIRES_IN = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionPayload {
  authenticated: boolean;
  createdAt: number;
  [key: string]: unknown;
}

/**
 * Sign a JWT token with the session payload
 * @returns JWT token string
 */
export async function signToken(): Promise<string> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const payload: SessionPayload = {
    authenticated: true,
    createdAt: Date.now(),
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded session payload or null if invalid
 */
export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const env = getEnv();
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    const { payload } = await jwtVerify(token, secret);

    return payload as SessionPayload;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Get the session cookie configuration
 */
export function getSessionCookieConfig() {
  return {
    name: "session",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
