import crypto from "crypto";
import { cookies } from "next/headers";
import "server-only";

export const SESSION_COOKIE_NAME = "auth_session";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: SESSION_SECRET environment variable is required in production.",
      );
    }
    return "inventory-next-secure-hmac-secret-key-32-bytes-minimum";
  }
  return secret;
}

const SESSION_SECRET = getSessionSecret();

let activeTestSession: SessionUser | null = null;

/**
 * Sets an in-memory session user for testing environments where HTTP headers are decoupled.
 */
export function setTestSession(user: SessionUser | null): void {
  activeTestSession = user;
}

export interface SessionUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

/**
 * Digitally signs and encodes a session payload into a tamper-resistant token.
 */
export function sealSession(user: SessionUser): string {
  const payloadB64 = Buffer.from(JSON.stringify(user)).toString("base64url");
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(payloadB64);
  const signature = hmac.digest("hex");
  return `${payloadB64}.${signature}`;
}

/**
 * Validates the cryptographic signature and decodes the session user payload.
 * Returns null if the token is tampered, unsigned, or malformed.
 */
export function unsealSession(token: string): SessionUser | null {
  try {
    if (!token || typeof token !== "string") return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const hmac = crypto.createHmac("sha256", SESSION_SECRET);
    hmac.update(payloadB64);
    const expectedSignature = hmac.digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const actualBuffer = Buffer.from(signature, "utf-8");

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      return null;
    }

    const json = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as SessionUser;
    if (!parsed || !parsed.id || !parsed.username || !parsed.role) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated session user from HTTP-only cookies.
 */
export async function getSession(): Promise<SessionUser | null> {
  if (activeTestSession) {
    return activeTestSession;
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!cookie?.value) {
      return null;
    }

    let rawValue = cookie.value;
    try {
      rawValue = decodeURIComponent(rawValue);
    } catch {
      // Keep rawValue as is if not encoded
    }

    return unsealSession(rawValue);
  } catch {
    return null;
  }
}

/**
 * Persists an authenticated user session into a secure HTTP-only cookie.
 */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sealed = sealSession(user);
    cookieStore.set(SESSION_COOKIE_NAME, sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {
    // Graceful fallback in non-request environments
  }
}

/**
 * Clears the authenticated session cookie upon logout.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Graceful fallback in non-request environments
  }
}
