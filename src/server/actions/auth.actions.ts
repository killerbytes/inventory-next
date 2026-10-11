"use server";

import bcrypt from "bcrypt";
import { eq, and, isNull } from "drizzle-orm";
import { setSessionCookie } from "@/server/auth/session";
import { db } from "@/server/db/drizzle";
import { users } from "@/server/db/schema/users";

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

/**
 * Server action to authenticate user credentials against PostgreSQL users table via Drizzle.
 */
export async function loginAction(credentials: {
  username?: string;
  password?: string;
}): Promise<LoginResult> {
  const { username, password } = credentials;

  if (!username || !password) {
    return {
      success: false,
      error: "Username and password are required.",
    };
  }

  const user = await db.query.users.findFirst({
    where: (tbl, { eq, and, isNull }) =>
      and(eq(tbl.username, username.trim()), isNull(tbl.deletedAt)),
  });

  if (!user) {
    throw new Error("Invalid username or password");
  }

  if (!bcrypt.compareSync(password, user.password)) {
    throw new Error("Invalid username or password");
  }

  if (!user.isActive) {
    throw new Error("Account is inactive. Please contact an administrator.");
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role || "USER",
  };

  await setSessionCookie(sessionUser);

  return {
    success: true,
    user: sessionUser,
  };
}

