import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { RoleGuard } from "@/components/common/RoleGuard";
import { AuthProvider } from "@/stores/authStore";
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

const mockCashierUser: UserData = {
  id: 2,
  name: "Cashier User",
  username: "cashier",
  email: "cashier@example.com",
  role: "CASHIER",
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("RoleGuard SSR & Hydration Parity", () => {
  it("renders protected content in SSR when user role matches allowedRoles", () => {
    const html = renderToString(
      <AuthProvider user={mockAdminUser}>
        <RoleGuard allowedRoles={["ADMIN"]}>
          <div id="admin-panel">Admin Panel</div>
        </RoleGuard>
      </AuthProvider>
    );

    expect(html).toContain('id="admin-panel"');
    expect(html).toContain("Admin Panel");
  });

  it("renders fallback in SSR when user role does not match allowedRoles", () => {
    const html = renderToString(
      <AuthProvider user={mockCashierUser} fallback={<div id="denied">Access Denied</div>}>
        <RoleGuard allowedRoles={["ADMIN"]}>
          <div id="admin-panel">Admin Panel</div>
        </RoleGuard>
      </AuthProvider>
    );

    expect(html).not.toContain('id="admin-panel"');
  });
});
