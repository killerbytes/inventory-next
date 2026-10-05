import NoSalesClientWidget from "@/components/widgets/NoSalesClientWidget";
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
  usePathname: () => "/reports/no-sales",
}));

vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title }: { title: any }) => <div data-testid="page-header">{title}</div>,
}));

describe("NoSalesClientWidget Component Tests", () => {
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

  it("renders no sales rows, columns, and dead stock status badge", async () => {
    const mockData = [
      {
        id: 1,
        productId: 50,
        name: "Unsold Drill Bit 5mm",
        unit: "PCS",
        inventory: {
          quantity: 25,
        },
      },
    ];

    await act(async () => {
      root?.render(
        <NoSalesClientWidget
          initialProducts={mockData}
          meta={{
            total: 1,
            totalPages: 1,
            currentPage: 1,
          }}
        />
      );
    });

    // Check table headers
    expect(container?.textContent).toContain("Product Name");
    expect(container?.textContent).toContain("Current Stock");
    expect(container?.textContent).toContain("Movement Status");

    // Check row content
    expect(container?.textContent).toContain("Unsold Drill Bit 5mm");
    expect(container?.textContent).toContain("PCS");
    expect(container?.textContent).toContain("25");
    expect(container?.textContent).toContain("Dead Stock (No Sales)");

    // Check link to product
    const links = container?.querySelectorAll("a");
    const hrefs = Array.from(links || []).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/products/50");
  });
});
