import SalesOrderModal from "@/components/modals/SalesOrderModal";
import {
  checkReceiptNumberAction,
  createSalesOrderAction,
  getReceiptPrefixAction,
  getSalesOrderAction,
} from "@/server/actions/salesOrder.actions";
import { getCombinationsByIdsAction } from "@/server/actions/product.actions";
import { DRAFT_STORAGE_KEYS, saveDraft } from "@/lib/draftStorage";
import { ORDER_STATUS } from "@/constants";
import { useUIStore } from "@/stores/uiStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/server/actions/salesOrder.actions", () => ({
  createSalesOrderAction: vi.fn(),
  updateSalesOrderAction: vi.fn(),
  getSalesOrderAction: vi.fn(),
  getReceiptPrefixAction: vi.fn(),
  checkReceiptNumberAction: vi.fn(),
}));

vi.mock("@/server/actions/product.actions", () => ({
  getCombinationsByIdsAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock("@/lib/api-clients/productSearch", () => ({
  getMappedSearchProductCombinations: vi.fn().mockResolvedValue([]),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const conflict = {
  existing: {
    id: 9,
    orderDate: "2026-09-04T04:00:00.000Z",
    customerName: "Juan Cruz",
    totalAmount: "1250.00",
  },
  suggestion: "B2-0001",
};

describe("SalesOrderModal receipt number", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  const input = () =>
    document.querySelector<HTMLInputElement>('input[name="salesOrderNumber"]')!;

  const findButton = (label: string) =>
    Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === label,
    );

  const settle = () =>
    act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

  const open = async (order?: any) => {
    act(() => useUIStore.getState().setSalesOrderModalOpen(true, order));
    await act(async () => {
      root.render(<SalesOrderModal customers={[{ id: 1, name: "Acme" } as any]} />);
    });
    await settle();
  };

  const type = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input(),
        value,
      );
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  const typeAndLeave = async (value: string) => {
    await type(value);
    await act(async () => {
      input().dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    await settle();
  };

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getReceiptPrefixAction).mockResolvedValue({ success: true, data: "" });
    vi.mocked(checkReceiptNumberAction).mockResolvedValue({ success: true, data: conflict });
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

  it("shows the order already using the number and fixes it in one click", async () => {
    await open();
    await typeAndLeave("0001");

    expect(checkReceiptNumberAction).toHaveBeenCalledWith({
      receiptNumber: "0001",
      excludeId: undefined,
    });
    expect(document.body.textContent).toContain("Receipt No 0001 is already used");
    expect(document.body.textContent).toContain("Juan Cruz");
    expect(document.body.textContent).toContain("1,250.00");

    vi.mocked(checkReceiptNumberAction).mockResolvedValue({
      success: true,
      data: { existing: null, suggestion: null },
    });
    await act(async () => findButton("Use B2-0001")!.click());
    await settle();

    expect(input().value).toBe("B2-0001");
    expect(findButton("Use B2-0001")).toBeUndefined();
  });

  it("hides the message as soon as the number is changed", async () => {
    await open();
    await typeAndLeave("0001");
    await type("0002");

    expect(document.body.textContent).not.toContain("is already used");
  });

  it("ignores a late answer for a number that is no longer in the field", async () => {
    let answer!: (value: any) => void;
    vi.mocked(checkReceiptNumberAction).mockReturnValue(
      new Promise((resolve) => (answer = resolve)) as any,
    );
    await open();
    await typeAndLeave("0001");
    await type("0002");
    await act(async () => answer({ success: true, data: conflict }));

    expect(document.body.textContent).not.toContain("is already used");
  });

  it.each(["", "B2-"])("does not check '%s', which holds no receipt number", async (value) => {
    await open();
    await typeAndLeave(value);

    expect(checkReceiptNumberAction).not.toHaveBeenCalled();
  });

  it("keeps the typed number and the modal open when the check fails", async () => {
    vi.mocked(checkReceiptNumberAction).mockResolvedValue({ success: false, error: "DB down" });
    await open();
    await typeAndLeave("0001");

    expect(toast.error).toHaveBeenCalledWith("DB down");
    expect(input().value).toBe("0001");
    expect(useUIStore.getState().isSalesOrderModalOpen).toBe(true);
    expect(document.body.textContent).not.toContain("is already used");
  });

  it("prefills the current booklet code on a new order", async () => {
    vi.mocked(getReceiptPrefixAction).mockResolvedValue({ success: true, data: "B2-" });
    await open();

    expect(input().value).toBe("B2-");
  });

  it("leaves the field empty when the booklet code cannot be read", async () => {
    vi.mocked(getReceiptPrefixAction).mockResolvedValue({ success: false, error: "DB down" });
    await open();

    expect(toast.error).toHaveBeenCalledWith("DB down");
    expect(input().value).toBe("");
  });

  it("does not overwrite the number of an unsaved local draft", async () => {
    vi.mocked(getReceiptPrefixAction).mockResolvedValue({ success: true, data: "B2-" });
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, {
      salesOrderNumber: "0042",
      salesOrderItems: [],
    });
    await open();

    expect(input().value).toBe("0042");
  });

  it("does not prefill a saved draft and excludes it from its own check", async () => {
    const draft = {
      id: 55,
      status: ORDER_STATUS.DRAFT,
      salesOrderNumber: "0001",
      customerId: 1,
      salesOrderItems: [],
    };
    vi.mocked(getSalesOrderAction).mockResolvedValue({ success: true, data: draft });
    vi.mocked(checkReceiptNumberAction).mockResolvedValue({
      success: true,
      data: { existing: null, suggestion: null },
    });
    await open(draft);
    await typeAndLeave("0001");

    expect(getReceiptPrefixAction).not.toHaveBeenCalled();
    expect(checkReceiptNumberAction).toHaveBeenCalledWith({
      receiptNumber: "0001",
      excludeId: 55,
    });
    expect(document.body.textContent).not.toContain("is already used");
  });

  it("keeps the order open when the server rejects a duplicate on save", async () => {
    const error =
      "Receipt No 0001 is already used. If this is a new booklet, add its code, e.g. B2-0001.";
    vi.mocked(createSalesOrderAction).mockResolvedValue({ success: false, error });
    const combination = {
      id: 101,
      name: "Widget Pro",
      unit: "PCS",
      price: "120.00",
      inventory: { id: 10, combinationId: 101, quantity: "50" },
    };
    vi.mocked(getCombinationsByIdsAction).mockResolvedValueOnce({
      success: true,
      data: [combination as any],
    });
    saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, {
      salesOrderNumber: "0001",
      customerId: 1,
      orderDate: new Date(),
      modeOfPayment: "CASH",
      status: ORDER_STATUS.RECEIVED,
      salesOrderItems: [{ combinationId: 101, quantity: 1, discount: 0, combination }],
    });
    await open();
    await act(async () => findButton("Save Draft")!.click());
    await settle();

    expect(toast.error).toHaveBeenCalledWith(error);
    expect(toast.success).not.toHaveBeenCalled();
    expect(useUIStore.getState().isSalesOrderModalOpen).toBe(true);
    expect(input().value).toBe("0001");
    expect(localStorage.getItem(DRAFT_STORAGE_KEYS.SALES_ORDER)).not.toBeNull();
  });
});
