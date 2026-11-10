"use server";

import bcrypt from "bcrypt";
import { LoginCredentialsSchema } from "@/schemas/user.schema";
import { setSessionCookie, clearSessionCookie } from "@/server/auth/session";
import { db } from "@/server/db/drizzle";

const INVALID_CREDENTIALS = "Invalid username or password";

/**
 * A bcrypt hash (cost 10, same as real user hashes) of a random string no one knows.
 * Compared against when the username doesn't exist, so that path costs the same time.
 */
const DUMMY_HASH = "$2b$10$ofTSaqLmcseZdwrXRC43QeilTMBycSGF.aRufaqHj2EZt/PFuMQ0W";

export interface LoginResult {
  success: boolean;
  user?: {
    id: number;
    name: string;
    username: string;
    role: string;
  };
  error?: string;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

/**
 * Server action to authenticate user credentials against PostgreSQL users table via Drizzle.
 */
export async function loginAction(credentials: {
  username?: string;
  password?: string;
}): Promise<LoginResult> {
  // Failures are returned, never thrown: Next.js redacts thrown messages in production.
  const parsed = LoginCredentialsSchema.safeParse(credentials);
  if (!parsed.success) {
    return {
      success: false,
      error: "Username and password are required.",
    };
  }
  const { username, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: (tbl, { eq, and, isNull }) =>
      and(eq(tbl.username, username), isNull(tbl.deletedAt)),
  });

  // Always run one bcrypt comparison so an unknown username takes as long as a wrong
  // password; otherwise response time reveals which usernames exist.
  const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    return { success: false, error: INVALID_CREDENTIALS };
  }

  // Checked only after the password, so this message can't be used to probe accounts.
  if (!user.isActive) {
    return {
      success: false,
      error: "Account is inactive. Please contact an administrator.",
    };
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role || "USER",
  };

  await setSessionCookie(sessionUser, user.password);

  return {
    success: true,
    user: sessionUser,
  };
}

/**
 * Server action to invalidate and clear the authenticated user session cookie.
 */
export async function logoutAction(): Promise<LogoutResult> {
  try {
    await clearSessionCookie();
    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to logout",
    };
  }
}

