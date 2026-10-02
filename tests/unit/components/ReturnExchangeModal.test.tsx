import ReturnExchangeModal from "@/components/modals/ReturnExchangeModal";
import { useUIStore } from "@/stores/uiStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/server/actions/goodReceipt.actions", () => ({
  supplierReturnsAction: vi.fn(),
}));

const mockReturnExchangeAction = vi.fn();
vi.mock("@/server/actions/salesOrder.actions", () => ({
  returnExchangeAction: (...args: any[]) => mockReturnExchangeAction(...args),
}));

// Mock ProductLookupInput to easily trigger handleAddExchange
vi.mock("@/components/forms/ProductLookupInput", () => ({
  default: ({ onChange }: { onChange: (p: any) => void }) => (
    <button
      type="button"
      data-testid="mock-add-exchange-btn"
      onClick={() =>
        onChange({
          id: 999,
          name: "Mock Replacement Item",
          unit: "PCS",
          price: 150,
        })
      }
    >
      Add Exchange Item
    </button>
  ),
}));

describe("ReturnExchangeModal Component", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockReturnExchangeAction.mockReset();
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
      useUIStore.getState().setReturnExchangeModalOpen(false);
    });
  });

  it("should render exchange item and allow removal via handleRemoveExchange action button", async () => {
    // Arrange
    act(() => {
      useUIStore.getState().setReturnExchangeModalOpen(true);
    });

    await act(async () => {
      root?.render(
        <ReturnExchangeModal
          referenceId={123}
          salesOrder={true}
          returns={[]}
        />,
      );
    });

    // Verify modal is rendered in document.body (portal)
    expect(document.body.textContent).toContain("Replacement Items (Exchange)");

    // Act: Add an exchange item via the mocked ProductLookupInput
    const addBtn = document.body.querySelector(
      '[data-testid="mock-add-exchange-btn"]',
    ) as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();

    await act(async () => {
      addBtn?.click();
    });

    // Assert: Exchange item is displayed in the table
    expect(document.body.textContent).toContain("Mock Replacement Item");

    // Assert: Remove button exists for the exchange row
    const removeBtn = document.body.querySelector(
      'button[aria-label="Remove item"]',
    ) as HTMLButtonElement | null;
    expect(removeBtn).not.toBeNull();

    // Act: Click remove button to trigger handleRemoveExchange
    await act(async () => {
      removeBtn?.click();
    });

    // Assert: Exchange item is removed from table
    expect(document.body.textContent).not.toContain("Mock Replacement Item");
  });

  it("should calculate credit amount and total credit based on return quantity rather than delivered quantity", async () => {
    // Arrange
    const mockReturns = [
      {
        id: 1,
        goodReceiptId: 10,
        combinationId: 101,
        quantity: 5, // 5 delivered
        purchasePrice: 100, // ₱100 each
        discount: 0,
        unit: "PCS",
        nameSnapshot: "Widget Alpha",
        totalAmount: 500,
        skuSnapshot: "WGT-A",
      },
    ];

    act(() => {
      useUIStore.getState().setReturnExchangeModalOpen(true);
    });

    await act(async () => {
      root?.render(
        <ReturnExchangeModal
          referenceId={456}
          salesOrder={true}
          returns={mockReturns as any}
        />,
      );
    });

    // Assert: Initial credit amount with return quantity default (5)
    expect(document.body.textContent).toContain("Widget Alpha");
    expect(document.body.textContent).toContain("₱500.00");

    // Act: Update return quantity input from 5 to 2
    const qtyInput = document.body.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement | null;
    expect(qtyInput).not.toBeNull();

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(qtyInput, "2");
      qtyInput?.dispatchEvent(new Event("input", { bubbles: true }));
      qtyInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Assert: Credit amount should reflect return qty (2 * ₱100 = ₱200.00)
    expect(document.body.textContent).toContain("₱200.00");
    expect(document.body.textContent).toContain("Total Credit: ₱200.00");
  });

  it("should manage exchanges through useFieldArray and dynamically update debit on quantity change", async () => {
    // Arrange
    act(() => {
      useUIStore.getState().setReturnExchangeModalOpen(true);
    });

    await act(async () => {
      root?.render(
        <ReturnExchangeModal
          referenceId={789}
          salesOrder={true}
          returns={[]}
        />,
      );
    });

    // Add exchange item (price ₱150, initial qty 1)
    const addBtn = document.body.querySelector(
      '[data-testid="mock-add-exchange-btn"]',
    ) as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();

    await act(async () => {
      addBtn?.click();
    });

    expect(document.body.textContent).toContain("Total Debit: ₱150.00");

    // Find exchange quantity input
    const inputs = document.body.querySelectorAll('input[type="number"]');
    const exchangeQtyInput = inputs[inputs.length - 1] as HTMLInputElement;

    // Act: Change exchange quantity from 1 to 3
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(exchangeQtyInput, "3");
      exchangeQtyInput.dispatchEvent(new Event("input", { bubbles: true }));
      exchangeQtyInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Assert: Total Debit should reflect 3 * ₱150 = ₱450.00
    expect(document.body.textContent).toContain("Total Debit: ₱450.00");
  });
});
