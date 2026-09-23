"use server";

import { setSessionCookie } from "@/server/auth/session";
import { User } from "@/server/models";

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
 * Server action to authenticate user credentials against PostgreSQL User model.
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

  const user = await User.scope("withPassword").findOne({
    where: { username: username.trim() },
  });

  if (!user) {
    throw new Error("Invalid username or password");
  }

  if (!User.validatePassword(password, user.password)) {
    throw new Error("Invalid username or password");
  }

  if (!user.isActive) {
    throw new Error("Account is inactive. Please contact an administrator.");
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  };

  await setSessionCookie(sessionUser);

  return {
    success: true,
    user: sessionUser,
  };
}
