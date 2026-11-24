import { CalendarDatePicker } from "@/components/common/CalendarDatePicker";
import InventoryMovementsClientWidget from "@/components/widgets/InventoryMovementsClientWidget";
import ProductDetailClientWidget from "@/components/widgets/ProductDetailClientWidget";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/reports/inventory-movements",
}));

vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title }: { title: any }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock("@/stores/uiStore", () => ({
  useUIStore: () => ({
    setCombinationModalOpen: vi.fn(),
    setProductModalOpen: vi.fn(),
    setBreakPackModalOpen: vi.fn(),
    setStockAdjustmentModalOpen: vi.fn(),
    setPriceModalOpen: vi.fn(),
    setVariantModalOpen: vi.fn(),
    setBarcodePrinterModalOpen: vi.fn(),
  }),
}));

describe("All Time Inventory Movements (Unit)", () => {
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
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
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

  it("should render placeholder 'All Time' in CalendarDatePicker when date.from is undefined", async () => {
    await act(async () => {
      root?.render(
        <CalendarDatePicker
          date={{ from: undefined, to: undefined }}
          placeholder="All Time"
          onDateSelect={vi.fn()}
        />,
      );
    });

    const trigger = container?.querySelector("button");
    expect(trigger?.textContent).toContain("All Time");
  });

  it("should render date picker with 'All Time' when InventoryMovementsClientWidget has allTime={true} and no date bounds", async () => {
    mockSearchParams = new URLSearchParams("ids=13&allTime=true");

    await act(async () => {
      root?.render(
        <InventoryMovementsClientWidget
          initialMovements={[]}
          allTime={true}
          startDate={undefined}
          endDate={undefined}
        />,
      );
    });

    const trigger = container?.querySelector("#date");
    expect(trigger?.textContent).toContain("All Time");
  });

  it("should navigate to /reports/inventory-movements with allTime=true when clicking the movements activity button on ProductDetail", async () => {
    const sampleProduct = {
      id: 6,
      name: "[Euroflex] Flexible",
      baseUnit: "RLS",
      category: { id: 3, name: "Hardware" },
      combinations: [
        {
          id: 13,
          productId: 6,
          name: "[Euroflex] Flexible - 1/2 x 50m",
          unit: "RLS",
          inventory: { quantity: 13, averagePrice: 234 },
        },
      ],
      variants: [],
    };

    const sampleMovements = [
      {
        id: 11768,
        type: "OUT",
        quantity: -1,
        costPerUnit: 234,
        totalCost: -234,
        referenceType: "SALES_ORDER",
        referenceId: 2740,
        combination: {
          id: 13,
          name: "[Euroflex] Flexible - 1/2 x 50m",
          unit: "RLS",
        },
        user: { name: "Admin" },
      },
    ];

    mockSearchParams = new URLSearchParams("tab=movements");

    await act(async () => {
      root?.render(
        <ProductDetailClientWidget
          product={sampleProduct as any}
          movements={sampleMovements}
        />,
      );
    });

    // Find the Activity button in movements table
    const buttons = container?.querySelectorAll("button");
    const activityBtn = Array.from(buttons || []).find((btn) =>
      btn.querySelector("svg") && btn.className.includes("text-primary")
    );

    expect(activityBtn).toBeDefined();
    if (activityBtn) {
      await act(async () => {
        activityBtn.click();
      });
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/reports/inventory-movements?ids=13&allTime=true"),
      );
    }
  });
});
