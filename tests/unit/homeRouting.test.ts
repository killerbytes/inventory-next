import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/constants";
import { getHomeRoute, hasPermission, HOME_ROUTE_CANDIDATES } from "@/lib/rbac";
import { ROUTES } from "@/lib/routes";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/server/auth/session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/server/auth/session";
import { requirePermission, requireRole } from "@/server/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";

describe("getHomeRoute", () => {
  it("sends ADMIN to the dashboard", () => {
    expect(getHomeRoute(UserRole.ADMIN)).toBe(ROUTES.DASHBOARD);
  });

  it.each(Object.values(UserRole))(
    "sends %s to a page that role can actually open, so `/` can never loop",
    (role) => {
      const home = getHomeRoute(role);
      const candidate = HOME_ROUTE_CANDIDATES.find((c) => c.route === home);
      expect(candidate).toBeDefined();
      expect(hasPermission(role, candidate!.permission)).toBe(true);
    },
  );

  it.each([undefined, null, "", "NOT_A_ROLE"])(
    "sends an unknown role (%s) to the forbidden page instead of a guarded page",
    (role) => {
      expect(getHomeRoute(role)).toBe(ROUTES.FORBIDDEN);
    },
  );
});

describe("guards send denied users to /forbidden, never back to `/`", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ id: 7, name: "U", username: "u", role: "USER" });
  });

  it("requirePermission redirects a role lacking the permission to /forbidden", async () => {
    await expect(requirePermission(PERMISSIONS.MANAGE_USERS)).rejects.toThrow(
      `REDIRECT:${ROUTES.FORBIDDEN}`,
    );
  });

  it("requireRole redirects a role outside the allowed list to /forbidden", async () => {
    await expect(requireRole([UserRole.ADMIN])).rejects.toThrow(`REDIRECT:${ROUTES.FORBIDDEN}`);
  });

  it("requirePermission returns the session when the permission is held", async () => {
    await expect(requirePermission(PERMISSIONS.VIEW_PRODUCTS)).resolves.toMatchObject({ id: 7 });
  });

  it("still sends a signed-out visitor to /login", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(requirePermission(PERMISSIONS.VIEW_PRODUCTS)).rejects.toThrow("REDIRECT:/login");
  });
});
