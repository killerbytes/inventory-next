import SalesOrderModal from "@/components/modals/SalesOrderModal";
import { useUIStore } from "@/stores/uiStore";
import { DRAFT_STORAGE_KEYS, saveDraft } from "@/lib/draftStorage";
import { MODE_OF_PAYMENT, ORDER_STATUS } from "@/constants";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { getCombinationsByIdsAction } from "@/server/actions/product.actions";
import {
  createSalesOrderAction,
  getSalesOrderAction,
  updateSalesOrderAction,
} from "@/server/actions/salesOrder.actions";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/server/actions/salesOrder.actions", () => ({
  createSalesOrderAction: vi.fn(),
  updateSalesOrderAction: vi.fn(),
  getSalesOrderAction: vi.fn(),
}));

vi.mock("@/server/actions/product.actions", () => ({
  getCombinationsByIdsAction: vi.fn(),
}));

vi.mock("@/lib/api-clients/productSearch", () => ({
  getMappedSearchProductCombinations: vi.fn().mockResolvedValue([]),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("SalesOrderModal Draft Rehydration (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const clickButton = async (label: string) => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === label,
    );
    if (!button) throw new Error(`Button "${label}" not found`);
    await act(async () => {
      button.click();
    });
    // handleSubmit validates asynchronously before the transition runs.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  const renderModal = async () => {
    act(() => {
      useUIStore.getState().setSalesOrderModalOpen(true);
    });
    await act(async () => {
      root?.render(
        <SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />,
      );
    });
  };

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
      useUIStore.getState().setSalesOrderModalOpen(false);
    });
    localStorage.clear();
  });

  it("should rehydrate sales order draft items with the latest combination prices and inventory from server", async () => {
    // Arrange: Draft saved with stale price ($50) and stale inventory (5)
    const staleDraft = {
      salesOrderNumber: "SO-DRAFT-001",
      customerId: 1,
      orderDate: new Date("2026-09-01"),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.RECEIVED,
      isDelivery: false,
      deliveryDate: new Date("2026-09-02"),
      dueDate: new Date("2026-09-03"),
      salesOrderItems: [
        {
          combinationId: 101,
          quantity: 2,
          discount: 0,
          combination: {
            id: 101,
            name: "Widget Pro (Stale)",
            unit: "PCS",
            price: 50,
            inventory: {
              quantity: "5",
            },
          },
        },
      ],
    };
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, staleDraft);

    // Mock server returning fresh combination with updated price ($120) and fresh inventory (50)
    const freshCombination = {
      id: 101,
      productId: 1,
      name: "Widget Pro (Latest)",
      unit: "PCS",
      price: "120.00",
      inventory: {
        id: 10,
        combinationId: 101,
        quantity: "50",
      },
    };
    vi.mocked(getCombinationsByIdsAction).mockResolvedValue({
      success: true,
      data: [freshCombination as any],
    });

    // Act: Open modal and render
    act(() => {
      useUIStore.getState().setSalesOrderModalOpen(true);
    });

    await act(async () => {
      root?.render(<SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />);
    });

    // Assert
    expect(getCombinationsByIdsAction).toHaveBeenCalledWith([101]);
    // The rendered document should reflect the latest combination name and new total ($120 * 2 = $240)
    expect(document.body.textContent).toContain("Widget Pro (Latest)");
    expect(document.body.textContent).not.toContain("Widget Pro (Stale)");
  });

  it("should handle missing/deleted combination in draft gracefully and display warning", async () => {
    // Arrange: Draft referencing combination 999 which was deleted in DB
    const staleDraft = {
      salesOrderNumber: "SO-DRAFT-002",
      customerId: 1,
      orderDate: new Date(),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.RECEIVED,
      isDelivery: false,
      deliveryDate: new Date(),
      dueDate: new Date(),
      salesOrderItems: [
        {
          combinationId: 999,
          quantity: 1,
          discount: 0,
          combination: {
            id: 999,
            name: "Discontinued Product",
            unit: "PCS",
            price: 40,
            inventory: { quantity: "0" },
          },
        },
      ],
    };
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, staleDraft);

    // Server returns empty array because combo 999 is deleted
    vi.mocked(getCombinationsByIdsAction).mockResolvedValue({
      success: true,
      data: [],
    });

    // Act
    act(() => {
      useUIStore.getState().setSalesOrderModalOpen(true);
    });

    await act(async () => {
      root?.render(<SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />);
    });

    // Assert
    expect(getCombinationsByIdsAction).toHaveBeenCalledWith([999]);
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining("no longer available"),
    );
    expect(document.body.textContent).not.toContain("Discontinued Product");
  });

  it("should fallback to stored draft when getCombinationsByIdsAction fails", async () => {
    // Arrange: Draft with combination 101
    const draft = {
      salesOrderNumber: "SO-DRAFT-003",
      customerId: 1,
      orderDate: new Date(),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.RECEIVED,
      isDelivery: false,
      deliveryDate: new Date(),
      dueDate: new Date(),
      salesOrderItems: [
        {
          combinationId: 101,
          quantity: 1,
          discount: 0,
          combination: {
            id: 101,
            name: "Fallback Widget",
            unit: "PCS",
            price: 75,
            inventory: { quantity: "10" },
          },
        },
      ],
    };
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, draft);

    // Mock failure
    vi.mocked(getCombinationsByIdsAction).mockRejectedValue(new Error("Network disconnect"));

    // Act
    act(() => {
      useUIStore.getState().setSalesOrderModalOpen(true);
    });

    await act(async () => {
      root?.render(<SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />);
    });

    // Assert
    expect(getCombinationsByIdsAction).toHaveBeenCalledWith([101]);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to sync latest product data"),
    );
    // Should fallback and display stored widget name
    expect(document.body.textContent).toContain("Fallback Widget");
  });

  it("keeps every draft line when the product lookup returns a failure, instead of treating them as deleted", async () => {
    // Arrange: actions return { success: false } rather than throwing (session expired, DB down)
    const draft = {
      salesOrderNumber: "SO-DRAFT-005",
      customerId: 1,
      orderDate: new Date(),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.RECEIVED,
      isDelivery: false,
      deliveryDate: new Date(),
      dueDate: new Date(),
      salesOrderItems: [
        {
          combinationId: 101,
          quantity: 1,
          discount: 0,
          combination: {
            id: 101,
            name: "Kept Widget",
            unit: "PCS",
            price: 75,
            inventory: { quantity: "10" },
          },
        },
      ],
    };
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, draft);
    vi.mocked(getCombinationsByIdsAction).mockResolvedValue({
      success: false,
      error: "Unauthorized: Please sign in",
    });

    // Act
    act(() => {
      useUIStore.getState().setSalesOrderModalOpen(true);
    });
    await act(async () => {
      root?.render(<SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />);
    });

    // Assert
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Unauthorized: Please sign in"),
    );
    expect(document.body.textContent).toContain("Kept Widget");
  });

  it("should not call getCombinationsByIdsAction if draft has no valid combination IDs", async () => {
    // Arrange: Draft with no combination selected (combinationId: 0)
    const draft = {
      salesOrderNumber: "SO-DRAFT-004",
      customerId: 1,
      orderDate: new Date(),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.RECEIVED,
      isDelivery: false,
      deliveryDate: new Date(),
      dueDate: new Date(),
      salesOrderItems: [
        {
          combinationId: 0,
          quantity: 1,
          discount: 0,
        },
      ],
    };
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, draft);

    // Act
    act(() => {
      useUIStore.getState().setSalesOrderModalOpen(true);
    });

    await act(async () => {
      root?.render(<SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />);
    });

    // Assert: getCombinationsByIdsAction should not have been called
    expect(getCombinationsByIdsAction).not.toHaveBeenCalled();
  });
  describe("saving a draft more than once", () => {
    const savableDraft = {
      salesOrderNumber: "SO-DRAFT-REPEAT",
      customerId: 1,
      orderDate: new Date("2026-09-01"),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.RECEIVED,
      isDelivery: false,
      deliveryDate: new Date("2026-09-02"),
      dueDate: new Date("2026-09-03"),
      salesOrderItems: [{ combinationId: 101, quantity: 2, discount: 0 }],
    };
    const freshCombination = {
      id: 101,
      productId: 1,
      name: "Widget Pro",
      unit: "PCS",
      price: "120.00",
      inventory: { id: 10, combinationId: 101, quantity: "50" },
    };

    beforeEach(() => {
      saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, savableDraft);
      vi.mocked(getCombinationsByIdsAction).mockResolvedValue({
        success: true,
        data: [freshCombination as any],
      });
      vi.mocked(createSalesOrderAction).mockResolvedValue({
        success: true,
        data: { id: 55 },
      } as any);
      vi.mocked(updateSalesOrderAction).mockResolvedValue({
        success: true,
        data: { id: 55 },
      } as any);
    });

    it("updates the draft created by the first save instead of inserting a duplicate salesOrderNumber", async () => {
      await renderModal();

      await clickButton("Save Draft");
      await clickButton("Save Draft");

      expect(createSalesOrderAction).toHaveBeenCalledTimes(1);
      expect(updateSalesOrderAction).toHaveBeenCalledTimes(1);
      expect(updateSalesOrderAction).toHaveBeenCalledWith(
        55,
        expect.objectContaining({
          salesOrderNumber: "SO-DRAFT-REPEAT",
          status: ORDER_STATUS.DRAFT,
        }),
      );
    });

    it("promotes the saved draft to RECEIVED instead of creating a second order", async () => {
      await renderModal();

      await clickButton("Save Draft");
      // A saved draft is in edit mode, where the submit button receives it.
      await clickButton("Receive Sales Order");

      expect(createSalesOrderAction).toHaveBeenCalledTimes(1);
      expect(updateSalesOrderAction).toHaveBeenCalledWith(
        55,
        expect.objectContaining({ status: ORDER_STATUS.RECEIVED }),
      );
      expect(localStorage.getItem(DRAFT_STORAGE_KEYS.SALES_ORDER)).toBeNull();
    });

    it("drops the local copy after the first DB save so the database is the single source of truth", async () => {
      await renderModal();

      await clickButton("Save Draft");

      expect(localStorage.getItem(DRAFT_STORAGE_KEYS.SALES_ORDER)).toBeNull();
    });
  });

  describe("editing a draft stored in the database (another device)", () => {
    const dbDraft = {
      id: 77,
      status: ORDER_STATUS.DRAFT,
      salesOrderNumber: "SO-2026-11-0007",
      customerId: 1,
      orderDate: "2026-11-01T00:00:00.000Z",
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      isDelivery: false,
      notes: "Deliver after lunch",
      salesOrderItems: [
        {
          id: 1,
          combinationId: 101,
          quantity: "3",
          discount: "0",
          discountNote: null,
          combination: { id: 101, name: "Widget Pro", unit: "PCS", price: "100.00" },
        },
      ],
    };
    const freshCombination = {
      id: 101,
      productId: 1,
      name: "Widget Pro (Latest)",
      unit: "PCS",
      price: "120.00",
      inventory: { id: 10, combinationId: 101, quantity: "50" },
    };

    beforeEach(() => {
      vi.mocked(getCombinationsByIdsAction).mockResolvedValue({
        success: true,
        data: [freshCombination as any],
      });
      vi.mocked(updateSalesOrderAction).mockResolvedValue({
        success: true,
        data: { id: 77 },
      } as any);
    });

    const openDraft = async () => {
      act(() => {
        useUIStore
          .getState()
          .setSalesOrderModalOpen(true, { id: 77, status: ORDER_STATUS.DRAFT } as any);
      });
      await act(async () => {
        root?.render(
          <SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />,
        );
      });
    };

    it("loads the latest saved draft from the server rather than the list row or local storage", async () => {
      saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, {
        salesOrderNumber: "LOCAL-NEW-ORDER",
        salesOrderItems: [],
      });
      vi.mocked(getSalesOrderAction).mockResolvedValue({
        success: true,
        data: dbDraft,
      } as any);

      await openDraft();

      expect(getSalesOrderAction).toHaveBeenCalledWith(77);
      expect(document.body.textContent).toContain("Widget Pro (Latest)");
      expect(document.body.textContent).toContain("Deliver after lunch");
    });

    it("saves edits back to the same database record without creating a new order", async () => {
      vi.mocked(getSalesOrderAction).mockResolvedValue({
        success: true,
        data: dbDraft,
      } as any);

      await openDraft();
      await clickButton("Save Draft");

      expect(createSalesOrderAction).not.toHaveBeenCalled();
      expect(updateSalesOrderAction).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          salesOrderNumber: "SO-2026-11-0007",
          status: ORDER_STATUS.DRAFT,
          salesOrderItems: [
            expect.objectContaining({ combinationId: 101, quantity: 3 }),
          ],
        }),
      );
    });

    it("does not overwrite this device's unsaved new-order draft while editing a database draft", async () => {
      const localDraft = { salesOrderNumber: "LOCAL-NEW-ORDER", salesOrderItems: [] };
      saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, localDraft);
      vi.mocked(getSalesOrderAction).mockResolvedValue({
        success: true,
        data: dbDraft,
      } as any);

      await openDraft();
      await clickButton("Save Draft");

      expect(
        JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEYS.SALES_ORDER) || "{}")
          .salesOrderNumber,
      ).toBe("LOCAL-NEW-ORDER");
    });

    it("closes with an error when another device already submitted the draft", async () => {
      vi.mocked(getSalesOrderAction).mockResolvedValue({
        success: true,
        data: { ...dbDraft, status: ORDER_STATUS.RECEIVED },
      } as any);

      await openDraft();

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("no longer a draft"),
      );
      expect(useUIStore.getState().isSalesOrderModalOpen).toBe(false);
    });
  });
});
