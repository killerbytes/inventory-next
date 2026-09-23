import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createGoodReceipt,
  createInvoice,
  createProduct,
  createSupplier,
  createUser,
  createVariantType,
} from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createUser(0);
  await createCategory(0);
  await createCategory(1);
  await createProduct(0);
  await createProduct(1);
  await createVariantType(0);
  await createSupplier(0);
  await createCombination();
  await createGoodReceipt(0);
  await createGoodReceipt(1);
  await createGoodReceipt(2);

  const gr1 = await goodReceiptServerService.get(1);
  await goodReceiptServerService.update(1, {
    status: "RECEIVED",
    goodReceiptLines: (gr1 as any).goodReceiptLines.map((line: any) => ({
      combinationId: line.combinationId,
      quantity: line.quantity,
      purchasePrice: line.purchasePrice,
    })),
  });

  const gr2 = await goodReceiptServerService.get(2);
  await goodReceiptServerService.update(2, {
    status: "RECEIVED",
    goodReceiptLines: (gr2 as any).goodReceiptLines.map((line: any) => ({
      combinationId: line.combinationId,
      quantity: line.quantity,
      purchasePrice: line.purchasePrice,
    })),
  });

  const gr3 = await goodReceiptServerService.get(3);
  await goodReceiptServerService.update(3, {
    status: "RECEIVED",
    goodReceiptLines: (gr3 as any).goodReceiptLines.map((line: any) => ({
      combinationId: line.combinationId,
      quantity: line.quantity,
      purchasePrice: line.purchasePrice,
    })),
  });
});

describe("Invoice Service (Integration)", () => {
  it("should create and fetch an invoice", async () => {
    await createInvoice(1);
    const invoice = await invoiceServerService.get(1);

    expect(invoice?.invoiceNumber).toBe("TEST");
    expect(Number(invoice?.totalAmount)).toBe(300);
    expect(invoice?.status).toBe("DRAFT");
    expect(invoice?.supplierId).toBe(1);
    expect(invoice?.dueDate).toBeInstanceOf(Date);
    expect(invoice?.invoiceLines.length).toBe(2);
    expect(Number(invoice?.invoiceLines[0].amount)).toBe(100);
    expect(invoice?.invoiceLines[0].goodReceiptId).toBe(1);
  });

  it("should update an invoice", async () => {
    await createInvoice(1);
    const gr3 = { totalAmount: 123, id: 3 };

    const invoice = await invoiceServerService.get(1);

    await invoiceServerService.update(1, {
      notes: "Test Updated",
      invoiceLines: [
        ...invoice!.invoiceLines.map((item: any) => ({
          amount: Number(item.amount),
          goodReceiptId: item.goodReceiptId,
        })),
        { amount: gr3.totalAmount, goodReceiptId: gr3.id },
      ],
    } as any);

    const invoice2 = await invoiceServerService.get(1);

    expect(invoice2?.invoiceNumber).toBe("TEST");
    expect(Number(invoice2?.totalAmount)).toBe(423);
    expect(invoice2?.notes).toBe("Test Updated");
    expect(invoice2?.status).toBe("DRAFT");
    expect(invoice2?.invoiceLines.length).toBe(3);
    expect(Number(invoice2?.invoiceLines[2].amount)).toBe(gr3.totalAmount);
    expect(invoice2?.invoiceLines[2].goodReceiptId).toBe(gr3.id);
  });

  it("should create an invoices as POSTED", async () => {
    const lines = [
      {
        amount: 100,
        goodReceiptId: 1,
      },
      {
        amount: 200,
        goodReceiptId: 2,
      },
    ];

    await invoiceServerService.create({
      invoiceNumber: "TEST-POSTED",
      invoiceDate: new Date(),
      dueDate: new Date(),
      status: "POSTED",
      supplierId: 1,
      invoiceLines: lines,
    } as any, 1);

    const invoice = await invoiceServerService.get(1);
    expect(invoice?.status).toBe("POSTED");
  });

  it("should update an invoice to POSTED", async () => {
    await createInvoice(1);
    const invoice = await invoiceServerService.get(1);

    await invoiceServerService.update(1, {
      invoiceLines: invoice!.invoiceLines.map((item: any) => ({
        amount: Number(item.amount),
        goodReceiptId: item.goodReceiptId,
      })),
      status: "POSTED",
    } as any);

    const invoice2 = await invoiceServerService.get(1);
    const gr = await goodReceiptServerService.get(1);

    expect(gr?.status).toBe("COMPLETED");
    expect(invoice2?.invoiceNumber).toBe("TEST");
    expect(Number(invoice2?.totalAmount)).toBe(300);
    expect(invoice2?.status).toBe("POSTED");
    expect(invoice2?.invoiceLines.length).toBe(2);
  });

  it("should not allow deletion of invoice after it has been posted", async () => {
    await createInvoice(1);
    const invoice = await invoiceServerService.get(1);
    await invoiceServerService.update(1, {
      invoiceLines: invoice!.invoiceLines.map((item: any) => ({
        amount: Number(item.amount),
        goodReceiptId: item.goodReceiptId,
      })),
      status: "POSTED",
    } as any);

    await expect(invoiceServerService.delete(1)).rejects.toThrow(
      "Invoice is not in a valid state"
    );
  });

  it("should delete an invoice", async () => {
    await createInvoice(1);
    const deleted = await invoiceServerService.delete(1);
    expect(deleted.success).toBe(true);
  });

  it("should fetch all invoices", async () => {
    await createInvoice(1);
    const paginated = await invoiceServerService.getPaginated({});
    expect(paginated.data.length).toBe(1);
  });
});
