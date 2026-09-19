import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { usePermission } from "@/hooks/usePermission";
import { AuthProvider } from "@/stores/authStore";
import { PERMISSIONS } from "@/lib/rbac";
import { UserData } from "@/schemas";

const mockAdminUser: UserData = {
  id: 1,
  name: "Admin User",
  username: "admin",
  email: "admin@example.com",
  role: "ADMIN",
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function TestPermissionConsumer() {
  const canManage = usePermission(PERMISSIONS.MANAGE_VARIANTS);
  return <div id="permission-status">{canManage ? "AUTHORIZED" : "UNAUTHORIZED"}</div>;
}

describe("usePermission Hook SSR Parity", () => {
  it("returns true during SSR when user has permission", () => {
    const html = renderToString(
      <AuthProvider user={mockAdminUser}>
        <TestPermissionConsumer />
      </AuthProvider>
    );

    expect(html).toContain("AUTHORIZED");
    expect(html).not.toContain("UNAUTHORIZED");
  });

  it("returns false during SSR when user is null", () => {
    const html = renderToString(
      <AuthProvider user={null}>
        <TestPermissionConsumer />
      </AuthProvider>
    );

    expect(html).toContain("UNAUTHORIZED");
  });
});
