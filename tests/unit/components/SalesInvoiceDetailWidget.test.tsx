import SalesInvoiceDetailClientWidget from "@/components/widgets/SalesInvoiceDetailClientWidget";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server/actions/salesInvoice.actions", () => ({
  postSalesInvoiceAction: vi.fn(),
  voidSalesInvoiceAction: vi.fn(),
}));

describe("SalesInvoiceDetailClientWidget Component (Unit)", () => {
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

  it("renders Statement of Account layout matching sample PDF data exactly", async () => {
    const mockInvoice = {
      id: 1,
      invoiceNumber: "SI-2026-10-0001",
      invoiceDate: "2026-10-15T00:00:00.000Z",
      status: "POSTED",
      previousBalance: "0.00",
      totalCharges: "5778.00",
      totalPayments: "0.00",
      amountDue: "5778.00",
      notes: "Acct. Name: Jeffrey Bulanadi\nAcct. No: 0104-4801-0027\nBank Name: BDO Unibank",
      customer: {
        id: 10,
        name: "Yumandag Builders",
        address: "Unit 411 Simacor Mansion Ramon Magsaysay Boulevard, Sta. Mesa Manila",
        phone: "0998-993-2008, 0916-192-5547",
      },
      salesInvoiceLines: [
        {
          id: 1,
          salesOrderId: 101,
          orderDate: "2026-10-10T00:00:00.000Z",
          refNo: "7297810",
          description: "Order 7297810",
          charges: "1600.00",
          payments: "0.00",
          balance: "1600.00",
        },
        {
          id: 2,
          salesOrderId: 102,
          orderDate: "2026-10-15T00:00:00.000Z",
          refNo: "5939702",
          description: "Order 5939702",
          charges: "880.00",
          payments: "0.00",
          balance: "2480.00",
        },
        {
          id: 3,
          salesOrderId: 103,
          orderDate: "2026-10-15T00:00:00.000Z",
          refNo: "5939703",
          description: "Order 5939703",
          charges: "3298.00",
          payments: "0.00",
          balance: "5778.00",
        },
      ],
    };

    await act(async () => {
      root?.render(<SalesInvoiceDetailClientWidget invoice={mockInvoice} />);
    });

    const text = container?.textContent || "";

    // Header Branding & Title
    expect(text).toContain("H. Concepcion Mini Hardware");
    expect(text).toContain("STATEMENT OF ACCOUNT");

    // Bill To & Customer Info
    expect(text).toContain("Yumandag Builders");
    expect(text).toContain("Unit 411 Simacor Mansion");
    expect(text).toContain("0998-993-2008");

    // Statement No
    expect(text).toContain("SI-2026-10-0001");

    // Financial Summary
    expect(text).toContain("Previous Balance");
    expect(text).toContain("Total Charges");
    expect(text).toContain("Total Payments");
    expect(text).toContain("Amount Due");

    // Line Items (Ref Nos)
    expect(text).toContain("7297810");
    expect(text).toContain("5939702");
    expect(text).toContain("5939703");

    // Bank Payment Notes
    expect(text).toContain("Jeffrey Bulanadi");
    expect(text).toContain("0104-4801-0027");
    expect(text).toContain("BDO Unibank");
  });
});
