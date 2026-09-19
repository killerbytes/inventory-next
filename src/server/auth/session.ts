import { cookies } from "next/headers";
import "server-only";

export const SESSION_COOKIE_NAME = "auth_session";

export interface SessionUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

/**
 * Retrieves the currently authenticated session user from HTTP-only cookies.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!cookie?.value) {
      if (process.env.NODE_ENV === "development") {
        return {
          id: 1,
          name: "Admin User",
          username: "admin",
          role: "ADMIN",
        };
      }
      return null;
    }

    let rawValue = cookie.value;
    try {
      rawValue = decodeURIComponent(rawValue);
    } catch {
      // Keep rawValue as is if not encoded
    }

    const parsed = JSON.parse(rawValue) as SessionUser;
    if (!parsed || !parsed.id || !parsed.username) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists an authenticated user session into a secure HTTP-only cookie.
 */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clears the authenticated session cookie upon logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
