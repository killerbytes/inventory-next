import { describe, expect, it, vi, beforeEach } from "vitest";
import { salesInvoiceServerService } from "@/server/services/salesInvoiceServer.service";
import { db } from "@/server/db/drizzle";
import { INVOICE_STATUS } from "@/constants";

vi.mock("@/lib/sequence", () => ({
  getNextSequence: vi.fn().mockResolvedValue(1),
}));

describe("salesInvoiceServerService (Unit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fail creating an invoice when no sales order lines are provided", async () => {
    // Arrange
    const invalidInput: any = {
      customerId: 1,
      invoiceDate: new Date(),
      salesInvoiceLines: [],
    };

    // Act & Assert
    await expect(salesInvoiceServerService.create(invalidInput)).rejects.toThrow(
      /At least one sales order line is required/i
    );
  });

  it("should generate sequential invoice number and compute running balances on create", async () => {
    // Arrange
    const mockTx: any = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 42, invoiceNumber: "SI-2026-10-0001" }]),
        }),
      }),
      query: {
        salesInvoices: {
          findFirst: vi.fn().mockResolvedValue({
            id: 42,
            invoiceNumber: "SI-2026-10-0001",
            customerId: 1,
            totalCharges: "5778.00",
            amountDue: "5778.00",
            status: INVOICE_STATUS.DRAFT,
          }),
        },
      },
    };

    vi.spyOn(db, "transaction").mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    const input: any = {
      customerId: 1,
      invoiceDate: new Date("2026-10-15"),
      previousBalance: 0,
      salesInvoiceLines: [
        { salesOrderId: 1, refNo: "7297810", charges: 1600, payments: 0 },
        { salesOrderId: 2, refNo: "5939702", charges: 880, payments: 0 },
        { salesOrderId: 3, refNo: "5939703", charges: 3298, payments: 0 },
      ],
    };

    // Act
    const result = await salesInvoiceServerService.create(input);

    // Assert
    expect(result).toBeDefined();
    expect(mockTx.insert).toHaveBeenCalledTimes(2); // Invoices + InvoiceLines
  });

  it("should reject voiding an already void invoice", async () => {
    // Arrange
    const mockTx: any = {
      query: {
        salesInvoices: {
          findFirst: vi.fn().mockResolvedValue({
            id: 42,
            status: "VOID",
          }),
        },
      },
      update: vi.fn(),
    };

    vi.spyOn(db, "transaction").mockImplementation(async (cb: any) => cb(mockTx));

    // Act & Assert
    await expect(salesInvoiceServerService.voidInvoice(42)).rejects.toThrow(
      /Cannot void an invoice that is already VOID/i
    );
  });
});
