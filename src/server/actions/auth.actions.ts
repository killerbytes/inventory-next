"use server";

import { clearSessionCookie, setSessionCookie } from "@/server/auth/session";
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
  username: string;
  password: string;
}): Promise<LoginResult> {
  try {
    const { username, password } = credentials;
    if (!username || !password) {
      return { success: false, error: "Username and password are required" };
    }

    const user = await User.scope("withPassword").findOne({
      where: { username },
    });

    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }

    if (!User.validatePassword(password, user.password)) {
      return { success: false, error: "Invalid username or password" };
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role || "User",
    };

    await setSessionCookie(sessionUser);

    return {
      success: true,
      user: sessionUser,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Authentication failed",
    };
  }
}

/**
 * Server action for logging out.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    await clearSessionCookie();
  } catch (err) {
    console.error("Failed to clear session cookie:", err);
  }
  return { success: true };
}
