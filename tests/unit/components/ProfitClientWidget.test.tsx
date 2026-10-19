import ProfitClientWidget from "@/components/widgets/ProfitClientWidget";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/reports/profit",
}));

vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title, description }: { title: any; description: any }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

describe("ProfitClientWidget Component (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockReplace.mockClear();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it("renders KPI cards and product combination table with formatted currency and links", async () => {
    const mockSummary = {
      totalSales: 10000,
      estimatedCost: 6000,
      netProfit: 4000,
      marginPercentage: "40.0",
    };

    const mockProducts = [
      {
        combinationId: 101,
        productId: 55,
        nameSnapshot: "Plywood 1/2 Marine",
        skuSnapshot: "PLY-12M",
        unit: "SHT",
        totalQuantity: 20,
        totalRevenue: 10000,
        totalCost: 6000,
        totalProfit: 4000,
        marginPercentage: "40.0",
      },
    ];

    await act(async () => {
      root?.render(
        <ProfitClientWidget
          initialSummary={mockSummary}
          initialProducts={mockProducts}
          meta={{
            total: 1,
            totalPages: 1,
            currentPage: 1,
          }}
        />,
      );
    });

    // Verify KPI summary cards
    expect(container?.textContent).toContain("Total Sales Revenue");
    expect(container?.textContent).toContain("₱10,000");
    expect(container?.textContent).toContain("Estimated COGS");
    expect(container?.textContent).toContain("₱6,000");
    expect(container?.textContent).toContain("Gross Net Profit");
    expect(container?.textContent).toContain("₱4,000");
    expect(container?.textContent).toContain("40.0%");

    // Verify combination table columns and data
    expect(container?.textContent).toContain("Plywood 1/2 Marine");
    expect(container?.textContent).toContain("PLY-12M");
    expect(container?.textContent).toContain("SHT");
    expect(container?.textContent).toContain("20");

    // Link to product detail
    const links = container?.querySelectorAll("a");
    const hrefs = Array.from(links || []).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/products/55");
  });
});
