import GoodReceiptsClientWidget from "@/components/widgets/GoodReceiptsClientWidget";
import { ORDER_STATUS } from "@/constants";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/good-receipts",
}));

vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title, children }: { title: any; children: any }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/modals/GoodReceiptModal", () => ({
  default: () => <div data-testid="good-receipt-modal" />,
}));

describe("GoodReceiptsClientWidget - Column Sorting", () => {
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

  const sampleRows = [
    {
      id: 1,
      supplierId: 10,
      status: ORDER_STATUS.RECEIVED,
      receiptDate: "2026-09-01T10:00:00.000Z",
      referenceNo: "GR-001",
      totalAmount: 1500,
      supplier: { id: 10, name: "Acme Supplies" },
      goodReceiptStatusHistory: [],
    },
  ];

  it("should render sortable headers for ID, Supplier, Status, Receipt Date, Reference, and Total Amount", async () => {
    await act(async () => {
      root?.render(
        <GoodReceiptsClientWidget
          initialRows={sampleRows as any}
          initialPagination={{ total: 1, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    const text = container?.textContent || "";
    expect(text).toContain("ID");
    expect(text).toContain("Supplier");
    expect(text).toContain("Status");
    expect(text).toContain("Receipt Date");
    expect(text).toContain("Reference");
    expect(text).toContain("Total Amount");
  });

  it("should render DateRangePicker with commitOnClose enabled", async () => {
    await act(async () => {
      root?.render(
        <GoodReceiptsClientWidget
          initialRows={sampleRows as any}
          initialPagination={{ total: 1, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    const trigger = container?.querySelector("#date");
    expect(trigger).toBeTruthy();
  });

  it("debounces search input changes before updating URL filters", async () => {
    vi.useFakeTimers();

    await act(async () => {
      root?.render(
        <GoodReceiptsClientWidget
          initialRows={sampleRows as any}
          initialPagination={{ total: 1, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    const searchInput = container?.querySelector(
      'input[placeholder="Search by ID, Reference"]',
    ) as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    mockReplace.mockClear();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(searchInput, "GR-001");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // At 100ms (before 300ms debounce window), mockReplace should NOT have been called
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(mockReplace).not.toHaveBeenCalled();

    // After advancing past 300ms debounce delay, mockReplace should be called with query
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(mockReplace).toHaveBeenCalledWith(
      "/good-receipts?page=1&limit=25&q=GR-001&sort=receiptDate&order=DESC",
      {
        scroll: false,
      },
    );

    vi.useRealTimers();
  });

  it("clears search query immediately when clear button is clicked", async () => {
    vi.useFakeTimers();

    await act(async () => {
      root?.render(
        <GoodReceiptsClientWidget
          initialRows={sampleRows as any}
          initialPagination={{ total: 1, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    const searchInput = container?.querySelector(
      'input[placeholder="Search by ID, Reference"]',
    ) as HTMLInputElement;

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(searchInput, "GR-001");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    mockReplace.mockClear();

    const clearButton = container?.querySelector(
      'button[aria-label="Clear search"], button[title="Clear search"], button[aria-label="Clear"], button[title="Clear"], button[aria-label="Copy"], button[title="Copy"]',
    ) as HTMLButtonElement;
    expect(clearButton).not.toBeNull();

    await act(async () => {
      clearButton.click();
    });

    expect(mockReplace).toHaveBeenCalledWith(
      "/good-receipts?page=1&limit=25&sort=receiptDate&order=DESC",
      {
        scroll: false,
      },
    );
    expect(searchInput.value).toBe("");

    vi.useRealTimers();
  });
});
