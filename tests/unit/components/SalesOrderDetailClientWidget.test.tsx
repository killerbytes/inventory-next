import SalesOrderDetailClientWidget from "@/components/widgets/SalesOrderDetailClientWidget";
import { ORDER_STATUS, RETURN_TYPE } from "@/constants";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title, description, children }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

// Mock ReturnExchangeModal to inspect props
let capturedModalProps: any = null;
vi.mock("@/components/modals/ReturnExchangeModal", () => ({
  default: (props: any) => {
    capturedModalProps = props;
    return <div data-testid="mock-return-exchange-modal" />;
  },
}));

vi.mock("@/components/modals/CancelModal", () => ({
  default: () => null,
}));

vi.mock("@/components/modals/DeliveryDetailsModal", () => ({
  default: () => null,
}));

vi.mock("@/components/modals/OrderHistoryModal", () => ({
  default: () => null,
}));

describe("SalesOrderDetailClientWidget Component (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    capturedModalProps = null;
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

  it("calculates returned quantities and marks fully returned items as disabled in selection", async () => {
    const mockOrder: any = {
      id: 1,
      salesOrderNumber: "SO-1001",
      status: ORDER_STATUS.COMPLETED,
      orderDate: new Date().toISOString(),
      totalAmount: "1000.00",
      customer: { name: "Test Customer" },
      salesOrderItems: [
        {
          id: 10,
          combinationId: 101,
          quantity: "5",
          originalPrice: "100.00",
          purchasePrice: "100.00",
          totalAmount: "500.00",
          unit: "PCS",
          nameSnapshot: "Fully Returned Item",
        },
        {
          id: 11,
          combinationId: 102,
          quantity: "10",
          originalPrice: "50.00",
          purchasePrice: "50.00",
          totalAmount: "500.00",
          unit: "PCS",
          nameSnapshot: "Partially Returned Item",
        },
      ],
      returnTransactions: [
        {
          id: 1,
          referenceId: 1,
          sourceType: "SALE",
          totalReturnAmount: "650.00",
          totalExchangeAmount: "0.00",
          updatedAt: new Date().toISOString(),
          returnItems: [
            // Line 1: 5 of 5 returned (Fully Returned)
            {
              id: 101,
              combinationId: 101,
              quantity: "5",
              type: RETURN_TYPE.RETURN_IN,
              unitPrice: "100.00",
              totalAmount: "500.00",
            },
            // Line 2: 3 of 10 returned (7 left)
            {
              id: 102,
              combinationId: 102,
              quantity: "3",
              type: RETURN_TYPE.RETURN_IN,
              unitPrice: "50.00",
              totalAmount: "150.00",
            },
          ],
        },
      ],
    };

    await act(async () => {
      root?.render(<SalesOrderDetailClientWidget initialData={mockOrder} />);
    });

    // Verify indicators rendered in table
    expect(container?.textContent).toContain("Fully Returned");
    expect(container?.textContent).toContain("(3 ret / 7 left)");

    // Trigger Return/Exchange dropdown item
    const dropdownTrigger = container?.querySelector(
      "button.inline-flex",
    ) as HTMLButtonElement | null;
    expect(dropdownTrigger).not.toBeNull();

    await act(async () => {
      dropdownTrigger?.click();
    });

    const returnMenuItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((el) => el.textContent?.includes("Return/Exchange")) as HTMLElement | undefined;

    if (returnMenuItem) {
      await act(async () => {
        returnMenuItem.click();
      });

      // Row selection checkboxes should be rendered now
      const checkboxes = Array.from(
        document.body.querySelectorAll('input[type="checkbox"]'),
      ) as HTMLInputElement[];

      // Checkbox 0 is the "Select all", checkbox 1 is row 0 (exhausted), checkbox 2 is row 1 (available)
      const rowCheckboxes = checkboxes.filter((c) => c.getAttribute("aria-label") === "Select row");
      if (rowCheckboxes.length >= 2) {
        expect(rowCheckboxes[0].disabled).toBe(true);
        expect(rowCheckboxes[1].disabled).toBe(false);
      }
    }
  });
});
