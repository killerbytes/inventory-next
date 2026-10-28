import PendingOrderForm from "@/components/forms/PendingOrderForm";
import { GoodReceiptFormSchema, GoodReceiptModalForm } from "@/schemas/goodReceipt.schema";
import { useUIStore } from "@/stores/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useFieldArray, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLastPurchasePricesAction } from "@/server/actions/goodReceipt.actions";

vi.mock("@/server/actions/goodReceipt.actions", () => ({
  getLastPurchasePricesAction: vi.fn(),
  createGoodReceiptAction: vi.fn(),
  updateGoodReceiptAction: vi.fn(),
}));

function TestFormWrapper({
  initialLines,
  supplierId = 1,
}: {
  initialLines: any[];
  supplierId?: number;
}) {
  const form = useForm<GoodReceiptModalForm>({
    resolver: zodResolver(GoodReceiptFormSchema),
    defaultValues: {
      referenceNo: "TEST-REF-100",
      receiptDate: new Date(),
      supplierId,
      internalNotes: "",
      goodReceiptLines: initialLines,
    },
  });

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: "goodReceiptLines",
  });

  return (
    <PendingOrderForm
      form={form}
      suppliers={[{ id: 1, name: "Supplier One" } as any]}
      fields={fields as any}
      remove={remove}
    />
  );
}

describe("PendingOrderForm Last Purchase Price (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    useUIStore.getState().setGoodReceiptModalOpen(false, null);
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
    useUIStore.getState().setGoodReceiptModalOpen(false, null);
  });

  it("should render Last Price as a clickable button below the input and update purchasePrice when clicked", async () => {
    vi.mocked(getLastPurchasePricesAction).mockResolvedValue({
      101: {
        combinationId: 101,
        lastPrice: 125,
        receiptDate: new Date("2026-06-01"),
        supplierId: 1,
        isSupplierMatch: true,
      },
    } as any);

    const initialLines = [
      {
        combinationId: 101,
        quantity: 5,
        purchasePrice: 0,
        discount: 0,
        discountNote: "",
        combination: { id: 101, name: "Widget A", unit: "BOX" },
      },
    ];

    await act(async () => {
      root?.render(<TestFormWrapper initialLines={initialLines} supplierId={1} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const priceInput = container?.querySelector(
      "input[name='goodReceiptLines.0.purchasePrice']",
    ) as HTMLInputElement | null;
    expect(priceInput).toBeTruthy();
    expect(priceInput?.value).toBe("₱0.00");

    const lastPriceBtn = container?.querySelector(
      "button[data-last-price]",
    ) as HTMLButtonElement | null;
    expect(lastPriceBtn).toBeTruthy();
    expect(lastPriceBtn?.textContent).toContain("Last:");
    expect(lastPriceBtn?.textContent).toContain("125");

    await act(async () => {
      lastPriceBtn?.click();
    });

    expect(priceInput?.value).toBe("₱125.00");
  });

  it("should pass excludeGoodReceiptId to getLastPurchasePricesAction when editing a good receipt", async () => {
    useUIStore.getState().setGoodReceiptModalOpen(true, { id: 42, referenceNo: "GR-42" } as any);

    vi.mocked(getLastPurchasePricesAction).mockResolvedValue({
      101: {
        combinationId: 101,
        lastPrice: 95,
        receiptDate: new Date("2026-04-01"),
        supplierId: 1,
        isSupplierMatch: true,
      },
    } as any);

    const initialLines = [
      {
        combinationId: 101,
        quantity: 1,
        purchasePrice: 120, // Current price in receipt 42
        discount: 0,
        discountNote: "",
        combination: { id: 101, name: "Widget A", unit: "BOX" },
      },
    ];

    await act(async () => {
      root?.render(<TestFormWrapper initialLines={initialLines} supplierId={1} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getLastPurchasePricesAction).toHaveBeenCalledWith(
      expect.objectContaining({
        combinationIds: [101],
        excludeGoodReceiptId: 42,
      }),
    );

    expect(container?.textContent).toContain("95");
  });

  it("should render 'Last: —' when combination has no previous purchase price", async () => {
    vi.mocked(getLastPurchasePricesAction).mockResolvedValue({} as any);

    const initialLines = [
      {
        combinationId: 999,
        quantity: 2,
        purchasePrice: 50,
        discount: 0,
        discountNote: "",
        combination: { id: 999, name: "New Product", unit: "PCS" },
      },
    ];

    await act(async () => {
      root?.render(<TestFormWrapper initialLines={initialLines} supplierId={1} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container?.textContent).toContain("Last: —");
  });
});
