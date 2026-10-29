import PriceManagerModal from "@/components/modals/PriceManagerModal";
import {
  getPriceHistoryAction,
  updateCombinationPriceAction,
} from "@/server/actions/product.actions";
import { useUIStore } from "@/stores/uiStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@/server/actions/product.actions", () => ({
  getPriceHistoryAction: vi.fn(),
  updateCombinationPriceAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("PriceManagerModal (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
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
    act(() => {
      useUIStore.setState({ isPriceModalOpen: false, editingPriceCombination: null });
    });
  });

  it("should render nothing when isPriceModalOpen is false", () => {
    act(() => {
      useUIStore.setState({ isPriceModalOpen: false, editingPriceCombination: null });
      root?.render(<PriceManagerModal />);
    });

    expect(container?.innerHTML).toBe("");
  });

  it("should display combination name, average price, current SRP, and call getPriceHistoryAction", async () => {
    const mockCombination = {
      id: 55,
      productId: 10,
      name: "Organic Coffee - 1KG Bag",
      unit: "BAG",
      price: "450.00",
      inventory: {
        averagePrice: "320.50",
        quantity: 25,
      },
    } as any;

    vi.mocked(getPriceHistoryAction).mockResolvedValue({
      data: [
        {
          id: 1,
          productId: 10,
          combinationId: 55,
          fromPrice: "400.00",
          toPrice: "450.00",
          changedAt: "2026-10-15T10:00:00.000Z",
          user: { id: 1, username: "manager1", name: "Manager One" },
        },
      ],
      meta: { total: 1, totalPages: 1, currentPage: 1 },
    } as any);

    await act(async () => {
      useUIStore.setState({
        isPriceModalOpen: true,
        editingPriceCombination: mockCombination,
      });
      root?.render(<PriceManagerModal />);
    });

    // Check header / info
    expect(document.body.textContent).toContain("Organic Coffee - 1KG Bag");
    expect(document.body.textContent).toContain("320.50"); // Average price
    expect(document.body.textContent).toContain("450.00"); // Current SRP
    expect(getPriceHistoryAction).toHaveBeenCalledWith({ combinationId: 55 });

    // Switch to History tab
    const historyTab = Array.from(
      document.querySelectorAll('[role="tab"], button'),
    ).find((el) => el.textContent?.includes("History")) as HTMLButtonElement | undefined;
    if (historyTab) {
      await act(async () => {
        historyTab.click();
      });
    }

    // Check history item rendered
    expect(document.body.textContent).toContain("400.00");
    expect(document.body.textContent).toContain("Manager One");
  });

  it("should submit new SRP, invoke updateCombinationPriceAction, and display success toast", async () => {
    const mockCombination = {
      id: 77,
      productId: 12,
      name: "Green Tea - Box of 20",
      unit: "BOX",
      price: "150.00",
      inventory: {
        averagePrice: "90.00",
        quantity: 10,
      },
    } as any;

    vi.mocked(getPriceHistoryAction).mockResolvedValue({
      data: [],
      meta: { total: 0, totalPages: 0, currentPage: 1 },
    } as any);

    vi.mocked(updateCombinationPriceAction).mockResolvedValue(true as any);

    await act(async () => {
      useUIStore.setState({
        isPriceModalOpen: true,
        editingPriceCombination: mockCombination,
      });
      root?.render(<PriceManagerModal />);
    });

    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeDefined();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(input, "175.50");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitBtn = Array.from(document.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Update SRP"),
    );
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn?.click();
    });

    expect(updateCombinationPriceAction).toHaveBeenCalledWith({
      combinationId: 77,
      price: 175.5,
    });
    expect(toast.success).toHaveBeenCalled();
  });
});
