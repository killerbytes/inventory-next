import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";

const { requirePermission, getSummary } = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getSummary: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({ requirePermission }));
vi.mock("@/server/services", () => ({ dashboardServerService: { getSummary } }));
vi.mock("@/components/layout/PageHeader", () => ({ default: () => null }));
vi.mock("@/components/widgets/DashboardClientWidget", () => ({ default: () => null }));

import DashboardPage from "@/app/(dashboard)/dashboard/page";
import DashboardClientWidget from "@/components/widgets/DashboardClientWidget";
import { PERMISSIONS } from "@/lib/rbac";

function findWidgetProps(node: any): any {
  if (!isValidElement(node)) return undefined;
  if (node.type === DashboardClientWidget) return node.props;
  const children = (node.props as any)?.children;
  for (const child of [].concat(children ?? [])) {
    const found = findWidgetProps(child);
    if (found) return found;
  }
  return undefined;
}

describe("DashboardPage (Server Component)", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    getSummary.mockReset();
  });

  it("hands the widget the plain summary, not an ActionResult wrapper", async () => {
    const summary = { todaySales: { totalAmount: 1500, count: 3, percentageChange: 50 } };
    getSummary.mockResolvedValue(summary);

    const tree = await DashboardPage();

    expect(findWidgetProps(tree)).toEqual({ initialData: summary });
  });

  it("requires VIEW_REPORTS before querying so unauthorized users never load metrics", async () => {
    requirePermission.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(requirePermission).toHaveBeenCalledWith(PERMISSIONS.VIEW_REPORTS);
    expect(getSummary).not.toHaveBeenCalled();
  });
});
