import SalesOrderDetailClientWidget from "@/components/widgets/SalesOrderDetailClientWidget";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ORDER_STATUS } from "@/constants";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock server action
vi.mock("@/server/actions/salesOrder.actions", () => ({
  cancelSalesOrderAction: vi.fn(),
}));

describe("SalesOrderDetailClientWidget Print Action", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  const openSpy = vi.fn();

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
    window.open = openSpy;
    openSpy.mockClear();
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

  const mockOrder: any = {
    id: 123,
    salesOrderNumber: "SO-2026-0123",
    status: ORDER_STATUS.COMPLETED,
    orderDate: new Date("2026-10-20"),
    totalAmount: 500,
    salesOrderItems: [],
    returnTransactions: [],
  };

  it("renders a print action button that opens the print window", async () => {
    await act(async () => {
      root?.render(
        <SidebarProvider>
          <SalesOrderDetailClientWidget initialData={mockOrder} />
        </SidebarProvider>
      );
    });

    const printBtn = container?.querySelector(
      "button[data-testid='print-order-btn']"
    ) as HTMLButtonElement;
    expect(printBtn).not.toBeNull();

    await act(async () => {
      printBtn.click();
    });

    expect(openSpy).toHaveBeenCalledWith("/sales-orders/123/print", "_blank");
  });
});
