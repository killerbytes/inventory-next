import PendingOrderForm from "@/components/forms/PendingOrderForm";
import { getLastPurchasePricesAction } from "@/server/actions/goodReceipt.actions";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/server/actions/goodReceipt.actions", () => ({
  getLastPurchasePricesAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// The lookup does its own data fetching; it is irrelevant to last-price display.
vi.mock("@/components/forms/ProductLookupInput", () => ({
  default: ({ onChange }: { onChange: (value: any) => void }) => (
    <button
      type="button"
      data-testid="pick-product"
      onClick={() => onChange({ id: 9, unit: "pcs" })}
    />
  ),
}));

const existingLine = {
  combinationId: 7,
  combination: { id: 7, unit: "pcs" },
  quantity: 2,
  purchasePrice: 100,
  discount: 0,
  discountNote: "",
};

const emptyLine = {
  combinationId: undefined,
  combination: undefined,
  quantity: 1,
  purchasePrice: 0,
  discount: 0,
  discountNote: "",
};

function Harness({ lines = [existingLine] }: { lines?: any[] }) {
  const form = useForm<any>({
    defaultValues: {
      supplierId: 3,
      receiptDate: new Date("2026-11-01"),
      referenceNo: "",
      internalNotes: "",
      goodReceiptLines: lines,
    },
  });
  const { fields, remove } = useFieldArray({
    control: form.control,
    name: "goodReceiptLines",
  });
  return (
    <PendingOrderForm
      form={form}
      suppliers={[]}
      fields={fields as any}
      remove={remove}
    />
  );
}

describe("PendingOrderForm last purchase price", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.mocked(getLastPurchasePricesAction).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows the last price for lines that already exist when the form opens", async () => {
    vi.mocked(getLastPurchasePricesAction).mockResolvedValue({
      success: true,
      data: {
        7: {
          combinationId: 7,
          lastPrice: 85,
          receiptDate: new Date("2026-10-01"),
          supplierId: 3,
          isSupplierMatch: true,
        },
      },
    });

    await act(async () => {
      root.render(<Harness />);
    });

    const button = container.querySelector("[data-last-price]");
    expect(button?.getAttribute("data-last-price")).toBe("85");
  });

  it("reports a failed lookup to the user instead of failing silently", async () => {
    vi.mocked(getLastPurchasePricesAction).mockResolvedValue({
      success: false,
      error: "Forbidden: You do not have permission to perform this action",
    });

    await act(async () => {
      root.render(<Harness />);
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Forbidden: You do not have permission to perform this action",
    );
    expect(container.querySelector("[data-last-price]")).toBeNull();
  });

  it("fetches the last price when a product is picked on a new line", async () => {
    vi.mocked(getLastPurchasePricesAction).mockResolvedValue({
      success: true,
      data: {
        9: {
          combinationId: 9,
          lastPrice: 42,
          receiptDate: new Date("2026-10-01"),
          supplierId: 3,
          isSupplierMatch: true,
        },
      },
    });

    await act(async () => {
      root.render(<Harness lines={[emptyLine]} />);
    });
    expect(getLastPurchasePricesAction).not.toHaveBeenCalled();

    await act(async () => {
      (container.querySelector("[data-testid=pick-product]") as HTMLElement).click();
    });

    expect(getLastPurchasePricesAction).toHaveBeenCalledWith(
      expect.objectContaining({ combinationIds: [9] }),
    );
    expect(
      container.querySelector("[data-last-price]")?.getAttribute("data-last-price"),
    ).toBe("42");
  });
});
