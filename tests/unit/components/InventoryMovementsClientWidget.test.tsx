import InventoryMovementsClientWidget from "@/components/widgets/InventoryMovementsClientWidget";
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
  usePathname: () => "/reports/inventory-movements",
}));
vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title }: { title: any }) => <div data-testid="page-header">{title}</div>,
}));



describe("InventoryMovementsClientWidget Alignment Tests", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
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

  const sampleMovements = [
    {
      id: 1,
      type: "IN",
      quantity: 50,
      costPerUnit: 12.5,
      totalCost: 625.0,
      referenceType: "GOOD_RECEIPT",
      referenceId: 101,
      referenceDate: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:05:00.000Z",
      combination: {
        id: 10,
        productId: 5,
        name: "Widget Pro Combo",
        unit: "PCS",
        product: { id: 5, name: "Widget Pro" },
      },
      user: { id: 1, name: "Admin User", username: "admin" },
      runningBalance: 50,
    },
    {
      id: 2,
      type: "OUT",
      quantity: -10,
      costPerUnit: 12.5,
      totalCost: -125.0,
      referenceType: "SALES_ORDER",
      referenceId: 202,
      referenceDate: "2026-03-02T11:00:00.000Z",
      updatedAt: "2026-03-02T11:15:00.000Z",
      combination: {
        id: 11,
        productId: 6,
        name: "Gadget Lite",
        unit: "BOX",
        deletedAt: "2026-03-05T00:00:00.000Z",
        product: { id: 6, name: "Gadget" },
      },
      user: { id: 2, name: "Staff User", username: "staff" },
      runningBalance: 40,
    },
  ];

  it("renders all aligned columns including Cost Per Unit, Total Cost, Balance, and directional styling", async () => {
    await act(async () => {
      root?.render(
        <InventoryMovementsClientWidget
          initialMovements={sampleMovements}
          meta={{ total: 2, totalPages: 1, currentPage: 1 }}
          summary={{
            inbound: { quantity: 50, value: 625 },
            outbound: { quantity: 10, value: 125 },
            net: { quantity: 40, value: 500 },
          }}
        />,
      );
    });

    const text = container?.textContent || "";

    // Column headers parity
    expect(text).toContain("Cost Per Unit");
    expect(text).toContain("Total Cost");
    expect(text).toContain("Updated At");
    expect(text).toContain("Quantity");
    expect(text).toContain("Balance");
    expect(text).toContain("Reference");

    // Values formatted in table with directional indicators
    expect(text).toContain("+50");
    expect(text).toContain("-10");
    expect(text).toContain("₱12.50");
    expect(text).toContain("+₱625.00");
    expect(text).toContain("-₱125.00");

    // Running balance parity
    expect(text).toContain("50");
    expect(text).toContain("40");

    // Directional CSS classes
    const positiveQty = container?.querySelector(".text-emerald-600");
    expect(positiveQty?.textContent).toContain("+50");
    const negativeQty = container?.querySelector(".text-rose-600");
    expect(negativeQty?.textContent).toContain("-10");

    // Summary cards parity
    expect(text).toContain("Inbound");
    expect(text).toContain("Outbound");
    expect(text).toContain("Net Stock Change");
    expect(text).toContain("Total Audited Records");
  });

  it("renders dynamic reference hyperlinks to Good Receipts and Sales Orders", async () => {
    await act(async () => {
      root?.render(
        <InventoryMovementsClientWidget
          initialMovements={sampleMovements}
          meta={{ total: 2, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    const links = Array.from(container?.querySelectorAll("a") || []);
    const grLink = links.find((a) => a.getAttribute("href") === "/good-receipts/101");
    const soLink = links.find((a) => a.getAttribute("href") === "/sales-orders/202");

    expect(grLink).toBeDefined();
    expect(soLink).toBeDefined();
  });

  it("disables row styling when combination is deleted", async () => {
    await act(async () => {
      root?.render(
        <InventoryMovementsClientWidget
          initialMovements={sampleMovements}
          meta={{ total: 2, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    const rows = container?.querySelectorAll("tbody tr");
    expect(rows?.length).toBe(2);

    // Second row has combination.deletedAt set, so it should have opacity-50 / pointer-events-none disabled styling
    const secondRow = rows?.[1];
    expect(
      secondRow?.classList.contains("opacity-50") ||
        secondRow?.classList.contains("pointer-events-none"),
    ).toBe(true);
  });

  it("handles search input with debouncing", async () => {
    vi.useFakeTimers();

    await act(async () => {
      root?.render(
        <InventoryMovementsClientWidget
          initialMovements={sampleMovements}
          meta={{ total: 2, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    const searchInput = container?.querySelector("input[placeholder*='Search']") as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(searchInput, "Widget");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Before 300ms debounce completes, mockReplace should not be called
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(mockReplace).not.toHaveBeenCalled();

    // Advance past 300ms debounce
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("q=Widget"),
      expect.objectContaining({ scroll: false }),
    );

    vi.useRealTimers();
  });
});
