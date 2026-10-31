import SalesOrderPrintWidget from "@/components/widgets/SalesOrderPrintWidget";
import { ORDER_STATUS } from "@/constants";
import { COMPANY_PROFILE } from "@/constants/company";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("SalesOrderPrintWidget Component", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  const printSpy = vi.fn();

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    window.print = printSpy;
    printSpy.mockClear();
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

  const mockOrder: any = {
    id: 42,
    salesOrderNumber: "SO-2026-0042",
    orderDate: new Date("2026-10-25T10:00:00Z"),
    status: ORDER_STATUS.COMPLETED,
    modeOfPayment: "CASH",
    isDelivery: true,
    deliveryDate: new Date("2026-10-26T14:00:00Z"),
    deliveryAddress: "77 Industrial Parkway, Pasig City",
    deliveryInstructions: "Call 30 mins before arrival",
    notes: "Leave at front desk",
    internalNotes: "TOP SECRET INTERNAL NOTE DO NOT PRINT",
    totalAmount: 1500,
    customer: {
      id: 5,
      name: "Acme Contracting Corp",
      phone: "0917-000-1111",
      address: "Building B, Pasig",
    },
    salesOrderItems: [
      {
        id: 101,
        combinationId: 1,
        quantity: 10,
        unit: "PCS",
        purchasePrice: 150,
        originalPrice: 150,
        discount: 0,
        totalAmount: 1500,
        nameSnapshot: "Standard Steel Rebar 10mm",
        skuSnapshot: "REBAR-10MM",
      },
    ],
    returnTransactions: [],
  };

  it("renders business header, customer info, order details and suppress internal notes", async () => {
    await act(async () => {
      root?.render(<SalesOrderPrintWidget order={mockOrder} autoPrint={false} />);
    });

    const text = container?.textContent || "";
    // Business header
    expect(text).toContain(COMPANY_PROFILE.name);
    expect(text).toContain(COMPANY_PROFILE.address);

    // Order info
    expect(text).toContain("SO-2026-0042");
    expect(text).toContain("Acme Contracting Corp");
    expect(text).toContain("0917-000-1111");
    expect(text).toContain("77 Industrial Parkway, Pasig City");
    expect(text).toContain("Leave at front desk");

    // Line items
    expect(text).toContain("Standard Steel Rebar 10mm");
    expect(text).toContain("10");

    // Suppression check: internalNotes must NOT be present
    expect(text).not.toContain("TOP SECRET INTERNAL NOTE DO NOT PRINT");

    // Acknowledgment & Signature blocks
    expect(text).toContain("Received in good order and condition");
    expect(text).toContain("Prepared By");
    expect(text).toContain("Received By");
  });

  it("handles cash customer fallback when customer is not set", async () => {
    const cashOrder: any = {
      ...mockOrder,
      customer: null,
      customerId: null,
      isDelivery: false,
      deliveryAddress: null,
    };

    await act(async () => {
      root?.render(<SalesOrderPrintWidget order={cashOrder} autoPrint={false} />);
    });

    const text = container?.textContent || "";
    expect(text).toContain("Cash Customer");
  });

  it("triggers window.print when clicking the Print button", async () => {
    await act(async () => {
      root?.render(<SalesOrderPrintWidget order={mockOrder} autoPrint={false} />);
    });

    const printButton = container?.querySelector(
      "button[data-testid='print-btn']"
    ) as HTMLButtonElement;
    expect(printButton).not.toBeNull();

    await act(async () => {
      printButton.click();
    });

    expect(printSpy).toHaveBeenCalled();
  });

  it("toggles to thermal receipt format", async () => {
    await act(async () => {
      root?.render(<SalesOrderPrintWidget order={mockOrder} autoPrint={false} />);
    });

    const thermalBtn = container?.querySelector(
      "button[data-testid='format-pos']"
    ) as HTMLButtonElement;
    expect(thermalBtn).not.toBeNull();

    await act(async () => {
      thermalBtn.click();
    });

    // Check that pos format container class or marker exists
    const posContainer = container?.querySelector("[data-format='pos']");
    expect(posContainer).not.toBeNull();
  });

  it("hides the Discount column when all items have zero discount", async () => {
    const zeroDiscountOrder: any = {
      ...mockOrder,
      salesOrderItems: [
        {
          id: 1,
          nameSnapshot: "Cement 40kg",
          quantity: 5,
          unit: "BAG",
          purchasePrice: 200,
          discount: 0,
          totalAmount: 1000,
        },
      ],
    };

    await act(async () => {
      root?.render(
        <SalesOrderPrintWidget order={zeroDiscountOrder} autoPrint={false} />
      );
    });

    const headers = Array.from(
      container?.querySelectorAll("table thead th") || []
    ).map((th) => th.textContent?.trim());
    expect(headers).not.toContain("Discount");
  });

  it("shows the Discount column when at least one item has a discount", async () => {
    const discountedOrder: any = {
      ...mockOrder,
      salesOrderItems: [
        {
          id: 1,
          nameSnapshot: "Cement 40kg",
          quantity: 5,
          unit: "BAG",
          purchasePrice: 200,
          discount: 50,
          totalAmount: 950,
        },
      ],
    };

    await act(async () => {
      root?.render(
        <SalesOrderPrintWidget order={discountedOrder} autoPrint={false} />
      );
    });

    const headers = Array.from(
      container?.querySelectorAll("table thead th") || []
    ).map((th) => th.textContent?.trim());
    expect(headers).toContain("Discount");
  });

  it("renders standard print preview container centered on screen with max-w-4xl, but print:w-full and print:max-w-none in print", async () => {
    await act(async () => {
      root?.render(<SalesOrderPrintWidget order={mockOrder} autoPrint={false} />);
    });

    const standardContainer = container?.querySelector("[data-format='standard']");
    expect(standardContainer).not.toBeNull();
    // On-screen: centered, not stretched
    expect(standardContainer?.className).toContain("max-w-4xl");
    // Print mode: full width, no max-width constraint
    expect(standardContainer?.className).toContain("print:w-full");
    expect(standardContainer?.className).toContain("print:max-w-none");

    const mainElement = container?.querySelector("main");
    // On-screen: flex justify-center
    expect(mainElement?.className).toContain("flex justify-center");
    // Print mode: print:block print:w-full
    expect(mainElement?.className).toContain("print:block");
    expect(mainElement?.className).toContain("print:w-full");
  });
});
