// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/drizzle";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { paymentServerService } from "@/server/services/paymentServer.service";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { INVOICE_STATUS, ORDER_STATUS, ORDER_TYPE } from "@/constants";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createProduct,
  createSupplier,
  createUser,
} from "../utils/fixtures";

describe("Invoices Flow & Side Effects Integration Tests", () => {
  let testSupplier: any;
  let testCategory: any;
  let testProduct: any;
  let testCombo: any;
  let testUser: any;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    testUser = await createUser(0);
    testSupplier = await createSupplier(0);
    testCategory = await createCategory(0);
    testProduct = await createProduct(0);

    await createCombination(
      [
        {
          name: "Test Combo",
          unit: "PCS",
          price: 100,
          conversionFactor: 1,
          reorderLevel: 1,
          values: [],
        },
      ],
      testProduct.id,
      testUser.id,
    );
    const combos = await productCombinationServerService.getByProductId(testProduct.id);
    testCombo = combos.combinations[0];
  });

  const createReceivedReceipt = async (amount = 500) => {
    const qty = Math.max(1, Math.floor(amount / 50));
    const gr = await goodReceiptServerService.create(
      {
        supplierId: testSupplier.id,
        referenceNo: `GR-${Date.now()}`,
        receiptDate: new Date(),
        goodReceiptLines: [
          { combinationId: testCombo.id, quantity: qty, purchasePrice: 50 },
        ],
      },
      testUser.id,
    );
    await goodReceiptServerService.update(
      gr.id,
      {
        status: ORDER_STATUS.RECEIVED,
        goodReceiptLines: [
          { combinationId: testCombo.id, quantity: qty, purchasePrice: 50 },
        ],
      },
      testUser.id,
    );
    return gr;
  };

  it("creates an invoice in DRAFT state and preserves GoodReceipt status as RECEIVED", async () => {
    const gr = await createReceivedReceipt(500);

    const createdInvoice = await invoiceServerService.create(
      {
        supplierId: testSupplier.id,
        invoiceNumber: `INV-DRAFT-${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: INVOICE_STATUS.DRAFT,
        invoiceLines: [{ goodReceiptId: gr.id, amount: 500 }],
      },
      testUser.id,
    );

    expect(createdInvoice).toBeDefined();
    expect(createdInvoice.status).toBe(INVOICE_STATUS.DRAFT);
    expect(Number(createdInvoice.totalAmount)).toBe(500);

    // Verify GoodReceipt is STILL RECEIVED (not completed yet)
    const refreshedGr = await goodReceiptServerService.get(gr.id);
    expect(refreshedGr?.status).toBe(ORDER_STATUS.RECEIVED);
  });

  it("transitions linked GoodReceipt to COMPLETED atomically when Invoice is POSTED", async () => {
    const gr = await createReceivedReceipt(1000);

    const createdInvoice = await invoiceServerService.create(
      {
        supplierId: testSupplier.id,
        invoiceNumber: `INV-POSTED-${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: INVOICE_STATUS.POSTED,
        invoiceLines: [{ goodReceiptId: gr.id, amount: 1000 }],
      },
      testUser.id,
    );

    expect(createdInvoice).toBeDefined();
    expect(createdInvoice.status).toBe(INVOICE_STATUS.POSTED);

    // Verify GoodReceipt was atomically transitioned to COMPLETED
    const refreshedGr = await goodReceiptServerService.get(gr.id);
    expect(refreshedGr?.status).toBe(ORDER_STATUS.COMPLETED);
  });

  it("enforces deletion guard: non-DRAFT invoice cannot be deleted", async () => {
    const gr = await createReceivedReceipt(600);

    const postedInvoice = await invoiceServerService.create(
      {
        supplierId: testSupplier.id,
        invoiceNumber: `INV-GUARD-${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: INVOICE_STATUS.POSTED,
        invoiceLines: [{ goodReceiptId: gr.id, amount: 600 }],
      },
      testUser.id,
    );

    // Attempting to delete POSTED invoice must reject
    await expect(invoiceServerService.delete(postedInvoice.id)).rejects.toThrow(
      "Invoice is not in a valid state",
    );
  });

  it("applies payment, records amountRemaining, and transitions status to PARTIALLY_PAID then PAID", async () => {
    const gr = await createReceivedReceipt(1000);

    const invoice = await invoiceServerService.create(
      {
        supplierId: testSupplier.id,
        invoiceNumber: `INV-PAY-${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: INVOICE_STATUS.POSTED,
        invoiceLines: [{ goodReceiptId: gr.id, amount: 1000 }],
      },
      testUser.id,
    );

    // Step 1: Partial payment of 400
    const payment1 = await paymentServerService.create(
      {
        supplierId: testSupplier.id,
        amount: 400,
        paymentMethod: "CHECK",
        referenceNo: "CHK-1001",
        applications: [{ invoiceId: invoice.id, amountApplied: 400 }],
      },
      testUser.id,
    );

    expect(payment1).toBeDefined();
    const app1 = await db.query.paymentApplications.findFirst({
      where: (pa, { eq, and }) =>
        and(eq(pa.paymentId, payment1.id), eq(pa.invoiceId, invoice.id)),
    });
    expect(app1).toBeDefined();
    expect(Number(app1?.amountApplied)).toBe(400);
    expect(Number(app1?.amountRemaining)).toBe(600);

    const partialInvoice = await invoiceServerService.get(invoice.id);
    expect(partialInvoice?.status).toBe(INVOICE_STATUS.PARTIALLY_PAID);

    // Step 2: Final payment of remaining 600
    const payment2 = await paymentServerService.create(
      {
        supplierId: testSupplier.id,
        amount: 600,
        paymentMethod: "BANK_TRANSFER",
        referenceNo: "WIRE-2002",
        applications: [{ invoiceId: invoice.id, amountApplied: 600 }],
      },
      testUser.id,
    );

    expect(payment2).toBeDefined();
    const app2 = await db.query.paymentApplications.findFirst({
      where: (pa, { eq, and }) =>
        and(eq(pa.paymentId, payment2.id), eq(pa.invoiceId, invoice.id)),
    });
    expect(app2).toBeDefined();
    expect(Number(app2?.amountApplied)).toBe(600);
    expect(Number(app2?.amountRemaining)).toBe(0);

    const paidInvoice = await invoiceServerService.get(invoice.id);
    expect(paidInvoice?.status).toBe(INVOICE_STATUS.PAID);
  });

  it("goodReceiptServerService.getBySupplierId filters RECEIVED status and calculates return deductions", async () => {
    // 1. Receipt in RECEIVED status
    const gr1 = await createReceivedReceipt(800);

    // 2. Receipt in DRAFT status
    const gr2 = await goodReceiptServerService.create(
      {
        supplierId: testSupplier.id,
        referenceNo: `GR-DRAFT-${Date.now()}`,
        receiptDate: new Date(),
        goodReceiptLines: [
          { combinationId: testCombo.id, quantity: 2, purchasePrice: 50 },
        ],
      },
      testUser.id,
    );

    // 3. Process supplier return against gr1
    await goodReceiptServerService.supplierReturns(
      gr1.id,
      [{ combinationId: testCombo.id, quantity: 2 }],
      "Damaged goods",
    );

    // getBySupplierId will be called by GoodReceiptPickerModal
    const result: any = await (goodReceiptServerService as any).getBySupplierId(
      testSupplier.id,
      { status: ORDER_STATUS.RECEIVED },
    );

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    const ids = result.data.map((r: any) => r.id);
    expect(ids).toContain(gr1.id);
    expect(ids).not.toContain(gr2.id); // gr2 was DRAFT

    // Check target receipt has return deductions
    const targetGr = result.data.find((r: any) => r.id === gr1.id);
    expect(Number(targetGr.totalReturnAmount || 0)).toBe(100);
  });
});
