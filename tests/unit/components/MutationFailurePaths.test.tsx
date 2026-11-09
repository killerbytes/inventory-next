import AddInvoicePaymentModal from "@/components/modals/AddInvoicePaymentModal";
import StockAdjustmentModal from "@/components/modals/StockAdjustmentModal";
import GoodReceiptDetailClientWidget from "@/components/widgets/GoodReceiptDetailClientWidget";
import { ORDER_STATUS } from "@/constants";
import { updateGoodReceiptAction } from "@/server/actions/goodReceipt.actions";
import { createStockAdjustmentAction } from "@/server/actions/inventory.actions";
import { createInvoicePaymentAction } from "@/server/actions/payment.actions";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server actions return { success: false } instead of throwing. These flows move
 * money or stock, so a failure must never be reported as a success.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh, back: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/server/actions/payment.actions", () => ({
  createInvoicePaymentAction: vi.fn(),
}));
vi.mock("@/server/actions/inventory.actions", () => ({
  createStockAdjustmentAction: vi.fn(),
}));
vi.mock("@/server/actions/goodReceipt.actions", () => ({
  cancelGoodReceiptAction: vi.fn(),
  updateGoodReceiptAction: vi.fn(),
  supplierReturnsAction: vi.fn(),
}));

const failure = { success: false as const, error: "Database unavailable" };

function clickButton(label: string | RegExp) {
  const button = Array.from(document.body.querySelectorAll("button")).find((b) => {
    const text = b.textContent?.trim() ?? "";
    return typeof label === "string" ? text === label : label.test(text);
  });
  if (!button) throw new Error(`Button "${label}" not found`);
  button.click();
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  // @ts-ignore
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  useAuthStore.setState({
    user: { id: 1, name: "Admin", username: "admin", role: "ADMIN" },
    isAuthenticated: true,
  } as any);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  act(() => {
    useUIStore.getState().setAddInvoicePaymentModalOpen(false);
    useUIStore.getState().setStockAdjustmentModalOpen(false);
  });
});

describe("failed mutations are reported as failures", () => {
  it("does not claim an invoice payment was recorded when saving it fails", async () => {
    vi.mocked(createInvoicePaymentAction).mockResolvedValue(failure);
    act(() => useUIStore.getState().setAddInvoicePaymentModalOpen(true));
    await act(async () =>
      root.render(
        <AddInvoicePaymentModal
          invoice={{ id: 5, supplierId: 3, invoiceNumber: "INV-5" }}
          remainingBalance={500}
        />,
      ),
    );

    await act(async () => clickButton(/^Apply /));

    expect(createInvoicePaymentAction).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Database unavailable");
    expect(toast.success).not.toHaveBeenCalled();
    expect(useUIStore.getState().isAddInvoicePaymentModalOpen).toBe(true);
  });

  it("does not claim a stock adjustment was recorded when saving it fails", async () => {
    vi.mocked(createStockAdjustmentAction).mockResolvedValue(failure);
    act(() =>
      useUIStore
        .getState()
        .setStockAdjustmentModalOpen(true, { id: 7, name: "Widget" } as any),
    );
    await act(async () => root.render(<StockAdjustmentModal />));

    await act(async () => clickButton("Save Adjustment"));

    expect(createStockAdjustmentAction).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Database unavailable");
    expect(toast.success).not.toHaveBeenCalled();
    expect(useUIStore.getState().isStockAdjustmentModalOpen).toBe(true);
  });

  it("keeps the receipt's real status when receiving the order fails", async () => {
    vi.mocked(updateGoodReceiptAction).mockResolvedValue(failure);
    await act(async () =>
      root.render(
        <GoodReceiptDetailClientWidget
          initialReceipt={
            {
              id: 42,
              status: ORDER_STATUS.DRAFT,
              referenceNo: "GR-42",
              receiptDate: new Date("2026-11-01"),
              totalAmount: 0,
              goodReceiptLines: [],
              returnTransactions: [],
            } as any
          }
        />,
      ),
    );

    await act(async () => clickButton("Receive Order"));

    expect(updateGoodReceiptAction).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Database unavailable");
    expect(toast.success).not.toHaveBeenCalled();
    // The button only shows while the receipt is not yet received.
    expect(() => clickButton("Receive Order")).not.toThrow();
  });
});
