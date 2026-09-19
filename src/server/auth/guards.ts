import "server-only";
import { getSession, SessionUser } from "./session";
import { hasPermission, Permission } from "@/lib/rbac";
import { UserRole } from "@/types/definitions";
import { redirect } from "next/navigation";

/**
 * Requires an active authenticated session in Server Components.
 * Redirects to /login if no valid session cookie is present.
 */
export async function requireSession(redirectTo = "/login"): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

/**
 * Requires the authenticated user to possess a specific capability permission.
 * Redirects unauthenticated users to /login and unauthorized users to fallback (default: /).
 */
export async function requirePermission(
  permission: Permission,
  redirectTo = "/"
): Promise<SessionUser> {
  const session = await requireSession("/login");

  if (!hasPermission(session.role, permission)) {
    redirect(redirectTo);
  }

  return session;
}

/**
 * Requires the authenticated user to belong to one of the allowed system roles.
 * Redirects unauthenticated users to /login and unauthorized users to fallback (default: /).
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo = "/"
): Promise<SessionUser> {
  const session = await requireSession("/login");

  const normalizedRole = session.role?.trim().toUpperCase();
  const isAllowed = allowedRoles.some(
    (role) => role.toUpperCase() === normalizedRole
  );

  if (!isAllowed) {
    redirect(redirectTo);
  }

  return session;
}
