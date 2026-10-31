import SalesOrderPrintWidget from "@/components/widgets/SalesOrderPrintWidget";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("SalesOrderPrintWidget - Quotation Mode", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
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

  const mockQuotation: any = {
    isQuotation: true,
    salesOrderNumber: "QT-20261030-001",
    orderDate: new Date("2026-10-30T10:00:00Z"),
    modeOfPayment: "CASH",
    totalAmount: 1200,
    customer: {
      id: 2,
      name: "Sunrise Engineering",
      phone: "0918-999-8888",
      address: "Quezon City",
    },
    salesOrderItems: [
      {
        id: 1,
        nameSnapshot: "Plywood 1/2 Marine",
        skuSnapshot: "PLY-12MM",
        unit: "SHT",
        quantity: 2,
        purchasePrice: 600,
        discount: 0,
        totalAmount: 1200,
      },
    ],
    returnTransactions: [],
  };

  it("renders PRICE QUOTATION badge, quotation validity terms, and customer acceptance signature line", async () => {
    await act(async () => {
      root?.render(
        <SalesOrderPrintWidget order={mockQuotation} autoPrint={false} />
      );
    });

    const text = container?.textContent || "";
    // Document title & badge
    expect(text).toContain("PRICE QUOTATION");
    expect(text).toContain("QT-20261030-001");
    expect(text).toContain("Sunrise Engineering");

    // Line items
    expect(text).toContain("Plywood 1/2 Marine");

    // Quotation specific footer & terms
    expect(text).toContain("valid for 30 days");
    expect(text).toContain("Accepted By");
    expect(text).not.toContain("Received in good order and condition");
  });

  it("renders POS thermal quotation estimate format", async () => {
    await act(async () => {
      root?.render(
        <SalesOrderPrintWidget order={mockQuotation} autoPrint={false} />
      );
    });

    const thermalBtn = container?.querySelector(
      "button[data-testid='format-pos']"
    ) as HTMLButtonElement;
    expect(thermalBtn).not.toBeNull();

    await act(async () => {
      thermalBtn.click();
    });

    const text = container?.textContent || "";
    expect(text).toContain("QUOTATION:");
    expect(text).toContain("PRICE ESTIMATE");
  });
});

