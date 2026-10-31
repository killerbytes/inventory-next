import SalesOrderModal from "@/components/modals/SalesOrderModal";
import { useUIStore } from "@/stores/uiStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock server actions
vi.mock("@/server/actions/salesOrder.actions", () => ({
  createSalesOrderAction: vi.fn(),
}));

vi.mock("@/server/actions/product.actions", () => ({
  getCombinationsByIdsAction: vi.fn().mockResolvedValue([]),
}));

// Mock ProductLookupInput to set combination in line item
vi.mock("@/components/forms/ProductLookupInput", () => ({
  default: ({ onChange }: { onChange: (c: any) => void }) => (
    <button
      type="button"
      data-testid="mock-select-product"
      onClick={() =>
        onChange({
          id: 101,
          name: "Portland Cement 40kg",
          sku: "CEM-40KG",
          unit: "BAG",
          price: 250,
        })
      }
    >
      Select Product
    </button>
  ),
}));

describe("SalesOrderModal Quotation Print", () => {
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

    sessionStorage.clear();
    localStorage.clear();
    window.open = openSpy;
    openSpy.mockClear();
    vi.mocked(toast.error).mockClear();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    useUIStore.setState({ isSalesOrderModalOpen: true });
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

  const mockCustomers: any[] = [
    {
      id: 1,
      name: "Juan Dela Cruz",
      phone: "0917-111-2222",
      address: "Manila City",
    },
  ];

  it("warns with toast error and does not open window if no valid products are added", async () => {
    await act(async () => {
      root?.render(<SalesOrderModal customers={mockCustomers} />);
    });

    const printBtn = document.body.querySelector(
      "button[data-testid='print-order-btn']"
    ) as HTMLButtonElement;
    expect(printBtn).not.toBeNull();

    await act(async () => {
      printBtn.click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Please add at least one product before printing a quotation."
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("packages quotation data into storage and opens quotation print window when items exist", async () => {
    await act(async () => {
      root?.render(<SalesOrderModal customers={mockCustomers} />);
    });

    // Select a product in row 1
    const selectProductBtn = document.body.querySelector(
      "button[data-testid='mock-select-product']"
    ) as HTMLButtonElement;
    expect(selectProductBtn).not.toBeNull();

    await act(async () => {
      selectProductBtn.click();
    });

    const printBtn = document.body.querySelector(
      "button[data-testid='print-order-btn']"
    ) as HTMLButtonElement;

    await act(async () => {
      printBtn.click();
    });

    expect(openSpy).toHaveBeenCalledWith(
      "/sales-orders/quotation/print",
      "_blank"
    );

    const storedRaw = sessionStorage.getItem("quotation_print_data");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw!);

    expect(stored.isQuotation).toBe(true);
    expect(stored.salesOrderItems).toHaveLength(1);
    expect(stored.salesOrderItems[0].nameSnapshot).toBe("Portland Cement 40kg");
    expect(stored.salesOrderItems[0].purchasePrice).toBe(250);
  });
});
