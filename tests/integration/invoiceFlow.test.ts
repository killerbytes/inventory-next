// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sequelize from "@/server/db/sequelize";
import {
  Category,
  GoodReceipt,
  GoodReceiptLine,
  Invoice,
  InvoiceLine,
  Payment,
  PaymentApplication,
  Product,
  ProductCombination,
  ReturnTransaction,
  Supplier,
  User,
} from "@/server/models";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { paymentServerService } from "@/server/services/paymentServer.service";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { INVOICE_STATUS, ORDER_STATUS, ORDER_TYPE } from "@/types/definitions";

describe("Invoices Flow & Side Effects Integration Tests", () => {
  let testSupplier: Supplier;
  let testCategory: Category;
  let testProduct: Product;
  let testCombo: ProductCombination;
  let testUser: User;

  beforeAll(async () => {
    await sequelize.authenticate();

    testSupplier = await Supplier.create({
      name: `Supplier ${Date.now()}`,
      contact: "Test Contact",
      email: `supplier_${Date.now()}@example.com`,
    });

    testCategory = await Category.create({
      name: `Category ${Date.now()}`,
      order: 1,
    });

    testProduct = await Product.create({
      name: `Product ${Date.now()}`,
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    testCombo = await ProductCombination.create({
      name: "Test Combo",
      productId: testProduct.id,
      unit: "PCS",
      price: 100,
    });

    // Ensure a default user exists for changedBy foreign keys
    testUser = await User.findOne() || await User.create({
      name: "System Tester",
      username: `tester_${Date.now()}`,
      email: `tester_${Date.now()}@example.com`,
      password: "hashedpassword",
      role: "ADMIN",
    });
  });

  afterAll(async () => {
    if (testSupplier) {
      await PaymentApplication.destroy({ where: {}, force: true });
      await Payment.destroy({ where: { supplierId: testSupplier.id }, force: true });
      await InvoiceLine.destroy({ where: {}, force: true });
      await Invoice.destroy({ where: { supplierId: testSupplier.id }, force: true });
      await GoodReceiptLine.destroy({ where: {}, force: true });
      await GoodReceipt.destroy({ where: { supplierId: testSupplier.id }, force: true });
      await testSupplier.destroy({ force: true });
    }
    if (testCombo) await testCombo.destroy({ force: true });
    if (testProduct) await testProduct.destroy({ force: true });
    if (testCategory) await testCategory.destroy({ force: true });
  });

  it("creates an invoice in DRAFT state and preserves GoodReceipt status as RECEIVED", async () => {
    const gr = await GoodReceipt.create({
      supplierId: testSupplier.id,
      referenceNo: `GR-DRAFT-${Date.now()}`,
      totalAmount: 500,
      status: ORDER_STATUS.RECEIVED,
      receiptDate: new Date(),
    } as any);

    let createdInvoice: any = null;
    try {
      createdInvoice = await invoiceServerService.create(
        {
          supplierId: testSupplier.id,
          invoiceNumber: `INV-DRAFT-${Date.now()}`,
          invoiceDate: new Date(),
          dueDate: new Date(),
          status: INVOICE_STATUS.DRAFT,
          invoiceLines: [{ goodReceiptId: gr.id, amount: 500 }],
        },
        testUser.id
      );

      expect(createdInvoice).toBeDefined();
      expect(createdInvoice.status).toBe(INVOICE_STATUS.DRAFT);
      expect(Number(createdInvoice.totalAmount)).toBe(500);

      // Verify GoodReceipt is STILL RECEIVED (not completed yet)
      const refreshedGr = await GoodReceipt.findByPk(gr.id);
      expect(refreshedGr?.status).toBe(ORDER_STATUS.RECEIVED);
    } finally {
      if (createdInvoice) {
        await InvoiceLine.destroy({ where: { invoiceId: createdInvoice.id } });
        await Invoice.destroy({ where: { id: createdInvoice.id }, force: true });
      }
      await gr.destroy({ force: true });
    }
  });

  it("transitions linked GoodReceipt to COMPLETED atomically when Invoice is POSTED", async () => {
    const gr = await GoodReceipt.create({
      supplierId: testSupplier.id,
      referenceNo: `GR-POSTED-${Date.now()}`,
      totalAmount: 1000,
      status: ORDER_STATUS.RECEIVED,
      receiptDate: new Date(),
    } as any);

    let createdInvoice: any = null;
    try {
      createdInvoice = await invoiceServerService.create(
        {
          supplierId: testSupplier.id,
          invoiceNumber: `INV-POSTED-${Date.now()}`,
          invoiceDate: new Date(),
          dueDate: new Date(),
          status: INVOICE_STATUS.POSTED,
          invoiceLines: [{ goodReceiptId: gr.id, amount: 1000 }],
        },
        testUser.id
      );

      expect(createdInvoice).toBeDefined();
      expect(createdInvoice.status).toBe(INVOICE_STATUS.POSTED);

      // Verify GoodReceipt was atomically transitioned to COMPLETED
      const refreshedGr = await GoodReceipt.findByPk(gr.id);
      expect(refreshedGr?.status).toBe(ORDER_STATUS.COMPLETED);
    } finally {
      if (createdInvoice) {
        await InvoiceLine.destroy({ where: { invoiceId: createdInvoice.id } });
        await Invoice.destroy({ where: { id: createdInvoice.id }, force: true });
      }
      await gr.destroy({ force: true });
    }
  });

  it("enforces deletion guard: non-DRAFT invoice cannot be deleted", async () => {
    const gr = await GoodReceipt.create({
      supplierId: testSupplier.id,
      referenceNo: `GR-GUARD-${Date.now()}`,
      totalAmount: 600,
      status: ORDER_STATUS.RECEIVED,
      receiptDate: new Date(),
    } as any);

    let postedInvoice: any = null;
    try {
      postedInvoice = await invoiceServerService.create(
        {
          supplierId: testSupplier.id,
          invoiceNumber: `INV-GUARD-${Date.now()}`,
          invoiceDate: new Date(),
          dueDate: new Date(),
          status: INVOICE_STATUS.POSTED,
          invoiceLines: [{ goodReceiptId: gr.id, amount: 600 }],
        },
        testUser.id
      );

      // Attempting to delete POSTED invoice must reject
      await expect(invoiceServerService.delete(postedInvoice.id)).rejects.toThrow(
        "Invoice is not in a valid state"
      );
    } finally {
      if (postedInvoice) {
        // Manually revert to DRAFT to clean up
        await Invoice.update({ status: INVOICE_STATUS.DRAFT }, { where: { id: postedInvoice.id } });
        await invoiceServerService.delete(postedInvoice.id);
        await Invoice.destroy({ where: { id: postedInvoice.id }, force: true });
      }
      await gr.destroy({ force: true });
    }
  });

  it("applies payment, records amountRemaining, and transitions status to PARTIALLY_PAID then PAID", async () => {
    const gr = await GoodReceipt.create({
      supplierId: testSupplier.id,
      referenceNo: `GR-PAY-${Date.now()}`,
      totalAmount: 1000,
      status: ORDER_STATUS.RECEIVED,
      receiptDate: new Date(),
    } as any);

    let invoice: any = null;
    let payment1: any = null;
    let payment2: any = null;

    try {
      invoice = await invoiceServerService.create(
        {
          supplierId: testSupplier.id,
          invoiceNumber: `INV-PAY-${Date.now()}`,
          invoiceDate: new Date(),
          dueDate: new Date(),
          status: INVOICE_STATUS.POSTED,
          invoiceLines: [{ goodReceiptId: gr.id, amount: 1000 }],
        },
        testUser.id
      );

      // Step 1: Partial payment of 400
      payment1 = await paymentServerService.create(
        {
          supplierId: testSupplier.id,
          amount: 400,
          paymentMethod: "CHECK",
          referenceNo: "CHK-1001",
          applications: [{ invoiceId: invoice.id, amountApplied: 400 }],
        },
        testUser.id
      );

      expect(payment1).toBeDefined();
      const app1 = await PaymentApplication.findOne({
        where: { paymentId: payment1.id, invoiceId: invoice.id },
      });
      expect(app1).toBeDefined();
      expect(Number(app1?.amountApplied)).toBe(400);
      expect(Number(app1?.amountRemaining)).toBe(600);

      const partialInvoice = await Invoice.findByPk(invoice.id);
      expect(partialInvoice?.status).toBe(INVOICE_STATUS.PARTIALLY_PAID);

      // Step 2: Final payment of remaining 600
      payment2 = await paymentServerService.create(
        {
          supplierId: testSupplier.id,
          amount: 600,
          paymentMethod: "BANK_TRANSFER",
          referenceNo: "WIRE-2002",
          applications: [{ invoiceId: invoice.id, amountApplied: 600 }],
        },
        testUser.id
      );

      expect(payment2).toBeDefined();
      const app2 = await PaymentApplication.findOne({
        where: { paymentId: payment2.id, invoiceId: invoice.id },
      });
      expect(app2).toBeDefined();
      expect(Number(app2?.amountApplied)).toBe(600);
      expect(Number(app2?.amountRemaining)).toBe(0);

      const paidInvoice = await Invoice.findByPk(invoice.id);
      expect(paidInvoice?.status).toBe(INVOICE_STATUS.PAID);
    } finally {
      if (payment1) await Payment.destroy({ where: { id: payment1.id }, force: true });
      if (payment2) await Payment.destroy({ where: { id: payment2.id }, force: true });
      if (invoice) {
        await Invoice.update({ status: INVOICE_STATUS.DRAFT }, { where: { id: invoice.id } });
        await invoiceServerService.delete(invoice.id);
        await Invoice.destroy({ where: { id: invoice.id }, force: true });
      }
      await gr.destroy({ force: true });
    }
  });

  it("goodReceiptServerService.getBySupplierId filters RECEIVED status and calculates return deductions", async () => {
    const gr1 = await GoodReceipt.create({
      supplierId: testSupplier.id,
      referenceNo: `GR-SUPP-1-${Date.now()}`,
      totalAmount: 800,
      status: ORDER_STATUS.RECEIVED,
      receiptDate: new Date(),
    } as any);

    const gr2 = await GoodReceipt.create({
      supplierId: testSupplier.id,
      referenceNo: `GR-SUPP-2-${Date.now()}`,
      totalAmount: 300,
      status: ORDER_STATUS.DRAFT, // Not received, should be excluded when filtering RECEIVED
      receiptDate: new Date(),
    } as any);

    // Create a return transaction against gr1 deducting 100
    const returnTx = await ReturnTransaction.create({
      referenceId: gr1.id,
      sourceType: ORDER_TYPE.PURCHASE,
      totalReturnAmount: 100,
      totalExchangeAmount: 0,
      changedBy: testUser.id,
    } as any);

    try {
      // getBySupplierId will be called by GoodReceiptPickerModal
      const result: any = await (goodReceiptServerService as any).getBySupplierId(
        testSupplier.id,
        { status: ORDER_STATUS.RECEIVED }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      const ids = result.data.map((r: any) => r.id);
      expect(ids).toContain(gr1.id);
      expect(ids).not.toContain(gr2.id); // gr2 was DRAFT

      // Check summary or receipt data has return amount
      const targetGr = result.data.find((r: any) => r.id === gr1.id);
      expect(Number(targetGr.totalReturnAmount || 0)).toBe(100);
    } finally {
      if (returnTx) await returnTx.destroy({ force: true });
      await gr1.destroy({ force: true });
      await gr2.destroy({ force: true });
    }
  });
});
