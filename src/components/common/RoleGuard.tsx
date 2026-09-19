"use client";

import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types/definitions";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

/**
 * Checks if the current user's role is within allowed roles.
 */
export function hasRole(
  userRole: string | undefined,
  allowedRoles: UserRole[],
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as UserRole);
}

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render children based on the authenticated user's role.
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (
    !isAuthenticated ||
    !hasRole(user?.role.trim().toUpperCase(), allowedRoles)
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface ProtectedPageProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Page-level wrapper to protect routes and redirect unauthorized users to root '/'.
 */
export function ProtectedPage({ allowedRoles, children }: ProtectedPageProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (
      isAuthenticated &&
      !hasRole(user?.role.trim().toUpperCase(), allowedRoles)
    ) {
      router.replace("/");
    }
  }, [isAuthenticated, user?.role, allowedRoles, router]);

  if (
    !isAuthenticated ||
    !hasRole(user?.role.trim().toUpperCase(), allowedRoles)
  ) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center shadow-lg backdrop-blur-md">
          <h2 className="text-xl font-bold text-destructive">
            Access Restricted
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your role (
            <span className="font-semibold text-foreground">
              {user?.role || "Guest"}
            </span>
            ) does not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
