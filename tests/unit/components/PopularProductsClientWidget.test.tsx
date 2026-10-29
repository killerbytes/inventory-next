import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PopularProductsClientWidget from "@/components/widgets/PopularProductsClientWidget";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/reports/popular-products",
}));

// Mock PageHeader
vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title, description }: { title: any; description: any }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

// Mock CalendarDatePicker
let mockOnDateSelectTrigger: ((range: any) => void) | null = null;
vi.mock("@/components/common/CalendarDatePicker", () => ({
  CalendarDatePicker: ({ date, onDateSelect }: any) => {
    mockOnDateSelectTrigger = onDateSelect;
    return (
      <div data-testid="date-range-picker-mock">
        <button
          data-testid="trigger-complete-range"
          onClick={() =>
            onDateSelect?.({
              from: new Date("2026-10-01T00:00:00Z"),
              to: new Date("2026-10-15T00:00:00Z"),
            })
          }
        >
          Select Complete Range
        </button>
        <button
          data-testid="trigger-partial-range"
          onClick={() =>
            onDateSelect?.({
              from: new Date("2026-10-01T00:00:00Z"),
              to: undefined,
            })
          }
        >
          Select Start Only
        </button>
        <button
          data-testid="trigger-clear-range"
          onClick={() =>
            onDateSelect?.({
              from: undefined,
              to: undefined,
            })
          }
        >
          Clear Selection
        </button>
      </div>
    );
  },
}));

describe("PopularProductsClientWidget (Unit)", () => {
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
    mockOnDateSelectTrigger = null;
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

  const mockProducts = [
    {
      combinationId: 1,
      name: "Widget Pro",
      transactionCount: 42,
      combination: {
        id: 1,
        productId: 10,
        name: "Widget Pro Combo",
        unit: "PCS",
      },
    },
  ];

  const mockPagination = {
    total: 1,
    totalPages: 1,
    currentPage: 1,
  };

  it("renders product data and ranking properly", async () => {
    await act(async () => {
      root?.render(
        <PopularProductsClientWidget
          initialProducts={mockProducts}
          initialPagination={mockPagination}
          startDate="2026-10-01"
          endDate="2026-10-31"
        />,
      );
    });

    expect(container?.textContent).toContain("Popular Products");
    expect(container?.textContent).toContain("Widget Pro Combo");
    expect(container?.textContent).toContain("42");
    expect(container?.textContent).toContain("#1");
  });

  it("updates URL filters with formatted dates and without receiptDate pollution when complete range is selected", async () => {
    await act(async () => {
      root?.render(
        <PopularProductsClientWidget
          initialProducts={mockProducts}
          initialPagination={mockPagination}
          startDate="2026-10-01"
          endDate="2026-10-31"
        />,
      );
    });

    const completeRangeBtn = container?.querySelector(
      '[data-testid="trigger-complete-range"]',
    ) as HTMLButtonElement;
    expect(completeRangeBtn).toBeTruthy();

    await act(async () => {
      completeRangeBtn.click();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const calledUrl = mockReplace.mock.calls[0][0];
    expect(calledUrl).toContain("startDate=2026-10-01");
    expect(calledUrl).toContain("endDate=2026-10-15");
    expect(calledUrl).toContain("page=1");
    // Crucial: Must NOT contain foreign sort from Good Receipts
    expect(calledUrl).not.toContain("receiptDate");
  });

  it("does not trigger filter update when only start date is selected (partial range)", async () => {
    await act(async () => {
      root?.render(
        <PopularProductsClientWidget
          initialProducts={mockProducts}
          initialPagination={mockPagination}
          startDate="2026-10-01"
          endDate="2026-10-31"
        />,
      );
    });

    const partialBtn = container?.querySelector(
      '[data-testid="trigger-partial-range"]',
    ) as HTMLButtonElement;
    expect(partialBtn).toBeTruthy();

    await act(async () => {
      partialBtn.click();
    });

    // Should NOT commit partial dates to URL
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("clears startDate and endDate query params when date range is cleared", async () => {
    await act(async () => {
      root?.render(
        <PopularProductsClientWidget
          initialProducts={mockProducts}
          initialPagination={mockPagination}
          startDate="2026-10-01"
          endDate="2026-10-31"
        />,
      );
    });

    const clearBtn = container?.querySelector(
      '[data-testid="trigger-clear-range"]',
    ) as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();

    await act(async () => {
      clearBtn.click();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const calledUrl = mockReplace.mock.calls[0][0];
    expect(calledUrl).not.toContain("startDate=");
    expect(calledUrl).not.toContain("endDate=");
    expect(calledUrl).not.toContain("receiptDate");
  });

  it("updates page filter when pager interaction triggers pagination filter change", async () => {
    const multiPagePagination = {
      total: 50,
      totalPages: 2,
      currentPage: 1,
    };

    await act(async () => {
      root?.render(
        <PopularProductsClientWidget
          initialProducts={mockProducts}
          initialPagination={multiPagePagination}
          startDate="2026-10-01"
          endDate="2026-10-31"
        />,
      );
    });

    const nextBtn = container?.querySelector('button[aria-label="Next page"], button[title="Next page"]') as HTMLButtonElement;
    if (nextBtn) {
      await act(async () => {
        nextBtn.click();
      });
      expect(mockReplace).toHaveBeenCalled();
      const calledUrl = mockReplace.mock.calls[0][0];
      expect(calledUrl).toContain("page=2");
    }
  });
});

