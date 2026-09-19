"use client";

import React from "react";
import { useAuthStore } from "@/stores/authStore";
import { hasPermission, Permission } from "@/lib/rbac";

export interface PermissionGuardProps {
  /**
   * The granular permission or array of permissions required to render the children.
   */
  permission: Permission | Permission[];
  /**
   * Content to render when authorized.
   */
  children: React.ReactNode;
  /**
   * Optional fallback content rendered when permission is denied or user is unauthenticated.
   * Defaults to null.
   */
  fallback?: React.ReactNode;
  /**
   * When permission is an array, specifies whether all permissions are required (true)
   * or any single permission suffices (false). Defaults to true.
   */
  requireAll?: boolean;
}

/**
 * Client-side component to conditionally render children based on capability permissions.
 * Bridges Zustand auth state with the isomorphic RBAC matrix in @/lib/rbac.
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  requireAll = true,
}: PermissionGuardProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const isAuthorized = requireAll
    ? permissions.every((p) => hasPermission(user.role, p))
    : permissions.some((p) => hasPermission(user.role, p));

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default PermissionGuard;
