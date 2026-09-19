"use client";

import { useAuthStore } from "@/stores/authStore";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * Custom hook to evaluate whether the currently logged-in user possesses
 * the requested capability permission or set of permissions.
 *
 * @param permission The required permission or array of permissions.
 * @param requireAll When an array is passed, requires all permissions if true (default), or at least one if false.
 * @returns boolean indicating if the active user is authorized.
 */
export function usePermission(
  permission: Permission | Permission[],
  requireAll = true
): boolean {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated || !user) {
    return false;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  return requireAll
    ? permissions.every((p) => hasPermission(user.role, p))
    : permissions.some((p) => hasPermission(user.role, p));
}

export default usePermission;
