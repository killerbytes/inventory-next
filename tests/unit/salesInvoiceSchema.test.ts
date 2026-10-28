import { describe, expect, it } from "vitest";
import {
  calculateStatementBalances,
  SalesInvoiceInputSchema,
  SalesInvoiceLineInputSchema,
} from "@/schemas/salesInvoice.schema";
import { INVOICE_STATUS } from "@/constants";

describe("SalesInvoice Schema & Calculation (Unit)", () => {
  it("should fail validation when customerId or invoiceDate is missing", () => {
    // Arrange
    const invalidInput = {
      notes: "Sample note",
      salesInvoiceLines: [],
    };

    // Act
    const result = SalesInvoiceInputSchema.safeParse(invalidInput);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should validate a proper sales invoice input with lines", () => {
    // Arrange
    const validInput = {
      customerId: 1,
      invoiceNumber: "SI-2026-10-0001",
      invoiceDate: new Date("2026-10-15"),
      dueDate: new Date("2026-10-30"),
      status: INVOICE_STATUS.DRAFT,
      previousBalance: 0,
      totalCharges: 5778,
      totalPayments: 0,
      amountDue: 5778,
      notes: "Acct Name: Jeffrey Bulanadi\nAcct No: 0104-4801-0027\nBank: BDO Unibank",
      salesInvoiceLines: [
        {
          salesOrderId: 101,
          orderDate: new Date("2026-10-10"),
          refNo: "7297810",
          description: "Order 7297810",
          charges: 1600,
          payments: 0,
          balance: 1600,
        },
        {
          salesOrderId: 102,
          orderDate: new Date("2026-10-15"),
          refNo: "5939702",
          description: "Order 5939702",
          charges: 880,
          payments: 0,
          balance: 2480,
        },
        {
          salesOrderId: 103,
          orderDate: new Date("2026-10-15"),
          refNo: "5939703",
          description: "Order 5939703",
          charges: 3298,
          payments: 0,
          balance: 5778,
        },
      ],
    };

    // Act
    const result = SalesInvoiceInputSchema.safeParse(validInput);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.salesInvoiceLines.length).toBe(3);
      expect(result.data.amountDue).toBe(5778);
    }
  });

  it("should accurately compute progressive running balances matching Statement of Account PDF", () => {
    // Arrange: Sample PDF data
    const previousBalance = 0;
    const rawLines = [
      {
        salesOrderId: 101,
        orderDate: new Date("2026-10-10"),
        refNo: "7297810",
        charges: 1600,
        payments: 0,
      },
      {
        salesOrderId: 102,
        orderDate: new Date("2026-10-15"),
        refNo: "5939702",
        charges: 880,
        payments: 0,
      },
      {
        salesOrderId: 103,
        orderDate: new Date("2026-10-15"),
        refNo: "5939703",
        charges: 3298,
        payments: 0,
      },
    ];

    // Act
    const calculated = calculateStatementBalances(rawLines, previousBalance);

    // Assert
    expect(calculated.lines[0].balance).toBe(1600);
    expect(calculated.lines[1].balance).toBe(2480);
    expect(calculated.lines[2].balance).toBe(5778);

    expect(calculated.totalCharges).toBe(5778);
    expect(calculated.totalPayments).toBe(0);
    expect(calculated.amountDue).toBe(5778);
  });

  it("should handle previous balance and payments in running balance calculations", () => {
    // Arrange
    const previousBalance = 500;
    const rawLines = [
      {
        salesOrderId: 201,
        orderDate: new Date("2026-10-01"),
        refNo: "SO-001",
        charges: 1000,
        payments: 200,
      },
      {
        salesOrderId: 202,
        orderDate: new Date("2026-10-05"),
        refNo: "SO-002",
        charges: 500,
        payments: 1000,
      },
    ];

    // Act
    const calculated = calculateStatementBalances(rawLines, previousBalance);

    // Assert:
    // Line 1: 500 (prev) + 1000 - 200 = 1300
    expect(calculated.lines[0].balance).toBe(1300);
    // Line 2: 1300 + 500 - 1000 = 800
    expect(calculated.lines[1].balance).toBe(800);

    expect(calculated.totalCharges).toBe(1500);
    expect(calculated.totalPayments).toBe(1200);
    expect(calculated.amountDue).toBe(800); // 500 + 1500 - 1200 = 800
  });
});
