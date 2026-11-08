import crypto from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import "server-only";
import { db } from "@/server/db/drizzle";

export const SESSION_COOKIE_NAME = "auth_session";

/** Absolute session lifetime; enforced inside the signed token, not just by the browser cookie. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: SESSION_SECRET environment variable is required in production.",
      );
    }
    return "inventory-next-secure-hmac-secret-key-32-bytes-minimum";
  }
  return secret;
}

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

/** Signed token contents. `pwf` ties the session to the password hash it was issued under. */
export interface SessionClaims extends SessionUser {
  iat: number;
  exp: number;
  pwf: string;
}

/** The subset of a `Users` row needed to decide whether a session is still valid. */
export interface SessionUserRow {
  id: number;
  name: string;
  username: string;
  role: string | null;
  password: string;
  isActive: boolean | null;
  deletedAt: Date | null;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payloadB64).digest("hex");
}

/**
 * Derives a non-reversible fingerprint of the stored password hash. Any password change
 * produces a new hash, so every session issued under the old password stops validating.
 */
function passwordFingerprint(passwordHash: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`pwf:${passwordHash}`)
    .digest("hex")
    .slice(0, 32);
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Signs a session for `user`, bound to the user's current password hash.
 * `issuedAtMs` exists so expiry can be tested deterministically.
 */
export function sealSession(
  user: SessionUser,
  passwordHash: string,
  issuedAtMs: number = Date.now(),
): string {
  const iat = Math.floor(issuedAtMs / 1000);
  const claims: SessionClaims = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    iat,
    exp: iat + SESSION_MAX_AGE_SECONDS,
    pwf: passwordFingerprint(passwordHash),
  };
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verifies signature and expiry and returns the claims. Returns null for tampered,
 * unsigned, malformed, expired, or pre-expiry (legacy) tokens.
 * This does not check the database; use `getSession` for that.
 */
export function unsealSession(token: string): SessionClaims | null {
  try {
    if (!token || typeof token !== "string") return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    if (!safeEqual(sign(payloadB64), signature)) return null;

    const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as SessionClaims;
    if (!claims?.id || !claims.username || !claims.role) return null;
    if (typeof claims.exp !== "number" || typeof claims.pwf !== "string") return null;
    if (claims.exp <= Math.floor(Date.now() / 1000)) return null;

    return claims;
  } catch {
    return null;
  }
}

/**
 * Decides whether verified claims still describe a live account. Rejects deleted,
 * deactivated, and password-changed users, and takes role/name from the DB row so
 * role changes apply on the next request instead of when the cookie expires.
 */
export function resolveSessionUser(
  claims: SessionClaims,
  row: SessionUserRow | null | undefined,
): SessionUser | null {
  if (!row || row.id !== claims.id) return null;
  if (row.deletedAt) return null;
  if (!row.isActive) return null;
  if (!safeEqual(passwordFingerprint(row.password), claims.pwf)) return null;

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role || "USER",
  };
}

/**
 * Retrieves the currently authenticated user, re-validated against the database.
 * Memoized per request so a page plus its actions cost a single primary-key lookup.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  if (activeTestSession) {
    return activeTestSession;
  }

  let rawValue: string | undefined;
  try {
    const cookieStore = await cookies();
    rawValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    return null;
  }
  if (!rawValue) return null;

  try {
    rawValue = decodeURIComponent(rawValue);
  } catch {
    // Keep rawValue as is if not encoded
  }

  const claims = unsealSession(rawValue);
  if (!claims) return null;

  const row = await db.query.users.findFirst({
    where: (tbl, { eq }) => eq(tbl.id, claims.id),
    columns: {
      id: true,
      name: true,
      username: true,
      role: true,
      password: true,
      isActive: true,
      deletedAt: true,
    },
  });

  return resolveSessionUser(claims, row);
});

/**
 * Persists an authenticated user session into a secure HTTP-only cookie.
 * `passwordHash` is the user's stored bcrypt hash; it is fingerprinted, never stored in the cookie.
 */
export async function setSessionCookie(user: SessionUser, passwordHash: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sealSession(user, passwordHash), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
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
