import GoodReceiptModal from "@/components/modals/GoodReceiptModal";
import { clearDraft } from "@/lib/draftStorage";
import {
  createGoodReceiptAction,
  updateGoodReceiptAction,
} from "@/server/actions/goodReceipt.actions";
import { useUIStore } from "@/stores/uiStore";
import { ORDER_STATUS } from "@/constants";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh, back: vi.fn() }),
}));

vi.mock("@/server/actions/goodReceipt.actions", () => ({
  createGoodReceiptAction: vi.fn(),
  updateGoodReceiptAction: vi.fn(),
  getLastPurchasePricesAction: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/forms/ProductLookupInput", () => ({
  default: () => <div />,
}));

const validLine = {
  combinationId: 7,
  quantity: 2,
  purchasePrice: 100,
  discount: 0,
  discountNote: "",
  combination: null,
};

const validDraft = {
  supplierId: 3,
  referenceNo: "DDR-1",
  receiptDate: new Date("2026-11-01"),
  internalNotes: "",
  goodReceiptLines: [validLine],
};

vi.mock("@/lib/draftStorage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/draftStorage")>()),
  loadDraft: vi.fn(() => validDraft),
  saveDraft: vi.fn(),
  clearDraft: vi.fn(),
}));

const failure = { success: false as const, error: "Database unavailable" };

function clickButton(label: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Button "${label}" not found`);
  button.click();
}

describe("GoodReceiptModal when the save fails", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    act(() => useUIStore.getState().setGoodReceiptModalOpen(false));
  });

  it("keeps the purchase draft and the modal open when creating fails", async () => {
    vi.mocked(createGoodReceiptAction).mockResolvedValue(failure);
    act(() => useUIStore.getState().setGoodReceiptModalOpen(true, null));
    await act(async () => root.render(<GoodReceiptModal suppliers={[]} />));

    await act(async () => clickButton("Create Order"));

    expect(createGoodReceiptAction).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Database unavailable");
    expect(toast.success).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
    expect(useUIStore.getState().isGoodReceiptModalOpen).toBe(true);
  });

  it.each([["Receive Order"], ["Save Draft"]])(
    "does not report success or close when %s fails on an existing receipt",
    async (label) => {
      vi.mocked(updateGoodReceiptAction).mockResolvedValue(failure);
      act(() =>
        useUIStore.getState().setGoodReceiptModalOpen(true, {
          id: 42,
          status: ORDER_STATUS.DRAFT,
          ...validDraft,
        } as any),
      );
      await act(async () => root.render(<GoodReceiptModal suppliers={[]} />));

      await act(async () => clickButton(label));

      expect(updateGoodReceiptAction).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Database unavailable");
      expect(toast.success).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
      expect(useUIStore.getState().isGoodReceiptModalOpen).toBe(true);
    },
  );
});
