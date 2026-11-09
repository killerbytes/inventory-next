import SalesOrderModal from "@/components/modals/SalesOrderModal";
import { useUIStore } from "@/stores/uiStore";
import { DRAFT_STORAGE_KEYS, saveDraft } from "@/lib/draftStorage";
import { MODE_OF_PAYMENT, ORDER_STATUS } from "@/constants";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCombinationsByIdsAction } from "@/server/actions/product.actions";
import {
  createSalesOrderAction,
  getSalesOrderAction,
  updateSalesOrderAction,
} from "@/server/actions/salesOrder.actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

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
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const combination = {
  id: 101,
  productId: 1,
  name: "Widget Pro",
  unit: "PCS",
  price: "120.00",
  inventory: { id: 10, combinationId: 101, quantity: "50" },
};

const savedDraft = {
  id: 55,
  salesOrderNumber: "SO-DRAFT-055",
  customerId: 1,
  orderDate: "2026-11-01T00:00:00.000Z",
  modeOfPayment: MODE_OF_PAYMENT.CASH,
  status: ORDER_STATUS.DRAFT,
  isDelivery: false,
  totalAmount: 240,
  salesOrderItems: [
    { id: 900, combinationId: 101, quantity: "2", discount: "0", combination },
  ],
};

const clickButton = async (label: string) => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Button "${label}" not found`);
  await act(async () => {
    button.click();
  });
  // Let react-hook-form's async validation and the transition settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

describe("SalesOrderModal editing a saved DRAFT", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  const render = async () => {
    await act(async () => {
      root.render(<SalesOrderModal customers={[{ id: 1, name: "Customer Acme" } as any]} />);
    });
  };

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getCombinationsByIdsAction).mockResolvedValue({
      success: true,
      data: [combination as any],
    });
    vi.mocked(getSalesOrderAction).mockResolvedValue({
      success: true,
      data: savedDraft as any,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    act(() => useUIStore.getState().setSalesOrderModalOpen(false));
    localStorage.clear();
  });

  it("loads the saved draft instead of the local new-order draft", async () => {
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, {
      salesOrderNumber: "LOCAL-ONLY",
      salesOrderItems: [],
    });
    act(() => useUIStore.getState().setSalesOrderModalOpen(true, savedDraft as any));

    await render();

    expect(document.body.textContent).toContain("Edit Draft SO-DRAFT-055");
    expect(document.body.textContent).toContain("Widget Pro");
    expect(getCombinationsByIdsAction).toHaveBeenCalledWith([101]);
    const numberInput = document.querySelector<HTMLInputElement>('input[name="salesOrderNumber"]');
    expect(numberInput?.value).toBe("SO-DRAFT-055");
  });

  it("saves edits through updateSalesOrderAction, keeping line ids, instead of creating a duplicate", async () => {
    vi.mocked(updateSalesOrderAction).mockResolvedValue({ success: true, data: savedDraft as any });
    act(() => useUIStore.getState().setSalesOrderModalOpen(true, savedDraft as any));
    await render();

    await clickButton("Save Draft");

    expect(createSalesOrderAction).not.toHaveBeenCalled();
    expect(updateSalesOrderAction).toHaveBeenCalledTimes(1);
    const [id, payload] = vi.mocked(updateSalesOrderAction).mock.calls[0];
    expect(id).toBe(55);
    expect(payload.status).toBe(ORDER_STATUS.DRAFT);
    expect(payload.salesOrderItems[0]).toMatchObject({ id: 900, combinationId: 101, quantity: 2 });
    expect(payload.salesOrderItems[0]).not.toHaveProperty("combination");
  });

  it("receives the saved draft through updateSalesOrderAction with status RECEIVED", async () => {
    vi.mocked(updateSalesOrderAction).mockResolvedValue({ success: true, data: savedDraft as any });
    act(() => useUIStore.getState().setSalesOrderModalOpen(true, savedDraft as any));
    await render();

    await clickButton("Receive Sales Order");

    expect(createSalesOrderAction).not.toHaveBeenCalled();
    const [, payload] = vi.mocked(updateSalesOrderAction).mock.calls[0];
    expect(payload.status).toBe(ORDER_STATUS.RECEIVED);
  });

  it("switches a new order into edit mode after the first Save Draft so a second save does not duplicate it", async () => {
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, {
      salesOrderNumber: "SO-DRAFT-055",
      customerId: 1,
      orderDate: new Date(),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.DRAFT,
      isDelivery: false,
      salesOrderItems: [{ combinationId: 101, quantity: 2, discount: 0, combination }],
    });
    vi.mocked(createSalesOrderAction).mockResolvedValue({ success: true, data: savedDraft as any });
    vi.mocked(updateSalesOrderAction).mockResolvedValue({ success: true, data: savedDraft as any });
    act(() => useUIStore.getState().setSalesOrderModalOpen(true));
    await render();

    await clickButton("Save Draft");
    await clickButton("Save Draft");

    expect(createSalesOrderAction).toHaveBeenCalledTimes(1);
    expect(updateSalesOrderAction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateSalesOrderAction).mock.calls[0][0]).toBe(55);
    expect(useUIStore.getState().editingSalesOrder?.id).toBe(55);
  });
});
