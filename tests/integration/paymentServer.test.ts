import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { paymentServerService } from "@/server/services/paymentServer.service";
import { PaymentApplication } from "@/server/models";
import sequelize from "@/server/db/sequelize";
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

  await createInvoice();
});

describe("Payment Service (Integration)", () => {
  it("should create and fetch a payment", async () => {
    await paymentServerService.create({
      supplierId: 1,
      paymentDate: new Date(),
      referenceNo: "CHECK#001",
      amount: 300,
      applications: [
        {
          invoiceId: 1,
          amountApplied: 70,
        },
        {
          invoiceId: 1,
          amountApplied: 10,
        },
      ],
    } as any, 1);

    const payment = await paymentServerService.get(1);

    expect(payment).not.toBeNull();
    expect(payment?.referenceNo).toBe("CHECK#001");
    expect(Number(payment?.amount)).toBe(300);
    expect(payment?.changedBy).toBe(1);

    const invoice = await invoiceServerService.get(1);
    expect(invoice?.status).toBe("PARTIALLY_PAID");
  });

  it("should create and fully paid a payment", async () => {
    await paymentServerService.create({
      supplierId: 1,
      paymentDate: new Date(),
      referenceNo: "CHECK#001",
      amount: 300,
      applications: [
        {
          invoiceId: 1,
          amountApplied: 300,
        },
      ],
    } as any, 1);

    const payment = await paymentServerService.get(1);

    expect(payment).not.toBeNull();
    expect(payment?.referenceNo).toBe("CHECK#001");
    expect(Number(payment?.amount)).toBe(300);
    expect(payment?.changedBy).toBe(1);

    const invoice = await invoiceServerService.get(1);
    expect(invoice?.status).toBe("PAID");
  });

  it("should filter payment applications by date range with timezone boundary safety", async () => {
    const payment = await paymentServerService.create({
      supplierId: 1,
      paymentDate: new Date(),
      referenceNo: "CHECK#002",
      amount: 100,
      applications: [
        {
          invoiceId: 1,
          amountApplied: 100,
        },
      ],
    } as any, 1);

    const applications = await PaymentApplication.findAll({ where: { paymentId: payment.id } });
    expect(applications.length).toBeGreaterThan(0);

    // Set application updatedAt to July 31st 10:00:00 Manila time
    await sequelize.query(
      `UPDATE "PaymentApplications" SET "updatedAt" = '2026-07-31 10:00:00+08' WHERE id = :id`,
      { replacements: { id: applications[0].id } },
    );

    // Query for July 2026
    const resJuly = await paymentServerService.getPaginated({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(resJuly.data.some((a: any) => a.id === applications[0].id)).toBe(true);

    // Query for August 2026 (should exclude)
    const resAugust = await paymentServerService.getPaginated({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(resAugust.data.some((a: any) => a.id === applications[0].id)).toBe(false);
  });
});
