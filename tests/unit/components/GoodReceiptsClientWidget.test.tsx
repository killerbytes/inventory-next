import GoodReceiptsClientWidget from "@/components/widgets/GoodReceiptsClientWidget";
import { ORDER_STATUS } from "@/types/definitions";
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

  it("should trigger sort filter update when clicking a sortable column header", async () => {
    await act(async () => {
      root?.render(
        <GoodReceiptsClientWidget
          initialRows={sampleRows as any}
          initialPagination={{ total: 1, totalPages: 1, currentPage: 1 }}
        />,
      );
    });

    // Find the header for Reference No or Supplier
    const headers = container?.querySelectorAll("th") || [];
    let referenceHeader: Element | null = null;
    headers.forEach((th) => {
      if (th.textContent?.includes("Reference")) {
        referenceHeader = th;
      }
    });

    expect(referenceHeader).not.toBeNull();

    const clickable = referenceHeader?.querySelector("span") || referenceHeader;
    await act(async () => {
      clickable?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockReplace).toHaveBeenCalled();
    const calledUrl = mockReplace.mock.calls[0][0];
    expect(calledUrl).toContain("sort=referenceNo");
  });
});
