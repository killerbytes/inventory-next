import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import React from "react";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.MANAGE_SETTINGS);

  return <>{children}</>;
}
