import ReorderLevelsClientWidget from "@/components/widgets/ReorderLevelsClientWidget";
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
  usePathname: () => "/reports/reorder-levels",
}));

vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title }: { title: any }) => <div data-testid="page-header">{title}</div>,
}));

describe("ReorderLevelsClientWidget Component Tests", () => {
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

  it("renders reorder levels rows, columns, and low stock alert badge", async () => {
    const mockData = [
      {
        id: 1,
        quantity: 2,
        combinationId: 10,
        lastSoldAt: "2026-03-15T10:00:00.000Z",
        transactionCount: 4,
        combinations: {
          id: 10,
          name: "Hammer 500g",
          unit: "PCS",
          reorderLevel: 5,
          productId: 100,
        },
      },
      {
        id: 2,
        quantity: 0,
        combinationId: 11,
        lastSoldAt: "2026-03-10T12:00:00.000Z",
        transactionCount: 2,
        combinations: {
          id: 11,
          name: "Screwdriver Set",
          unit: "SET",
          reorderLevel: 10,
          productId: 101,
        },
      },
    ];

    await act(async () => {
      root?.render(
        <ReorderLevelsClientWidget
          initialData={mockData}
          meta={{
            total: 2,
            totalPages: 1,
            currentPage: 1,
          }}
        />
      );
    });

    // Check table headers
    expect(container?.textContent).toContain("Product Name");
    expect(container?.textContent).toContain("Reorder Level");
    expect(container?.textContent).toContain("Transactions");
    expect(container?.textContent).toContain("Current Stock");
    expect(container?.textContent).toContain("Last Sold");
    expect(container?.textContent).toContain("Alert Status");

    // Check combination names and units
    expect(container?.textContent).toContain("Hammer 500g");
    expect(container?.textContent).toContain("Screwdriver Set");
    expect(container?.textContent).toContain("PCS");
    expect(container?.textContent).toContain("SET");

    // Check badges
    expect(container?.textContent).toContain("Low Stock Alert");
    expect(container?.textContent).toContain("Out of Stock");

    // Check links to products
    const links = container?.querySelectorAll("a");
    const hrefs = Array.from(links || []).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/products/100");
    expect(hrefs).toContain("/products/101");
  });
});
