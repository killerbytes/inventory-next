import { PermissionGuard } from "@/components/common/PermissionGuard";
import { PERMISSIONS } from "@/lib/rbac";
import { UserData } from "@/schemas";
import { AuthProvider } from "@/stores/authStore";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

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

const mockRegularUser: UserData = {
  id: 2,
  name: "Regular User",
  username: "user",
  email: "user@example.com",
  role: "USER",
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PermissionGuard SSR & Hydration Parity", () => {
  it("renders protected button in SSR renderToString when wrapped in AuthProvider with permitted user", () => {
    const html = renderToString(
      <AuthProvider user={mockAdminUser}>
        <PermissionGuard permission={PERMISSIONS.MANAGE_VARIANTS}>
          <button id="edit-variants-btn">Edit Variants</button>
        </PermissionGuard>
      </AuthProvider>,
    );

    expect(html).toContain('id="edit-variants-btn"');
    expect(html).toContain("Edit Variants");
  });

  it("does not render protected button in SSR renderToString when user lacks permission", () => {
    const html = renderToString(
      <AuthProvider user={mockRegularUser}>
        <PermissionGuard permission={PERMISSIONS.MANAGE_VARIANTS}>
          <button id="edit-variants-btn">Edit Variants</button>
        </PermissionGuard>
      </AuthProvider>,
    );

    expect(html).not.toContain('id="edit-variants-btn"');
  });

  it("renders fallback in SSR renderToString when user is unauthenticated", () => {
    const html = renderToString(
      <AuthProvider user={null}>
        <PermissionGuard
          permission={PERMISSIONS.MANAGE_VARIANTS}
          fallback={<span id="fallback-unauth">Login Required</span>}
        >
          <button id="edit-variants-btn">Edit Variants</button>
        </PermissionGuard>
      </AuthProvider>,
    );

    expect(html).toContain('id="fallback-unauth"');
    expect(html).not.toContain('id="edit-variants-btn"');
  });

  it("handles array permissions with requireAll=false when user matches one permission", () => {
    const html = renderToString(
      <AuthProvider user={mockRegularUser}>
        <PermissionGuard
          permission={[PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.MANAGE_PRODUCTS]}
          requireAll={false}
        >
          <span id="view-permitted">Can View</span>
        </PermissionGuard>
      </AuthProvider>,
    );

    expect(html).toContain('id="view-permitted"');
  });

  it("handles array permissions with requireAll=true when user lacks one permission", () => {
    const html = renderToString(
      <AuthProvider user={mockRegularUser}>
        <PermissionGuard
          permission={[PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.MANAGE_PRODUCTS]}
          requireAll={true}
        >
          <span id="manage-permitted">Can Manage</span>
        </PermissionGuard>
      </AuthProvider>,
    );

    expect(html).not.toContain('id="manage-permitted"');
  });
});
