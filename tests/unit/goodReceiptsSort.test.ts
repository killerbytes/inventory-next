// @vitest-environment node
import { GoodReceipt, Supplier, User } from "@/server/models";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { ORDER_STATUS } from "@/types/definitions";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";
import { createUser } from "../utils/fixtures";

describe("Good Receipt Service - Sorting & Pagination", () => {
  let user0: User;
  let supplierA: Supplier;
  let supplierB: Supplier;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser();
    supplierA = await Supplier.create({
      name: "Alpha Supplies",
      phone: "1234567890",
      address: "123 Alpha Road",
    });
    supplierB = await Supplier.create({
      name: "Beta Logistics",
      phone: "0987654321",
      address: "456 Beta Avenue",
    });

    // Seed 3 good receipts with distinct receipt dates, reference numbers, amounts, and statuses
    await GoodReceipt.create({
      supplierId: supplierA.id,
      referenceNo: "GR-101",
      receiptDate: new Date("2026-09-01T10:00:00.000Z"),
      totalAmount: 100.0,
      status: ORDER_STATUS.RECEIVED,
    });

    await GoodReceipt.create({
      supplierId: supplierB.id,
      referenceNo: "GR-102",
      receiptDate: new Date("2026-09-02T10:00:00.000Z"),
      totalAmount: 300.0,
      status: ORDER_STATUS.COMPLETED,
    });

    await GoodReceipt.create({
      supplierId: supplierA.id,
      referenceNo: "GR-103",
      receiptDate: new Date("2026-09-03T10:00:00.000Z"),
      totalAmount: 200.0,
      status: ORDER_STATUS.POSTED,
    });
  });

  it("should sort by receiptDate DESC by default and return contract shape", async () => {
    const result = await goodReceiptServerService.getAll({});

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("pagination");
    expect(result).toHaveProperty("summary");

    expect(result.data).toHaveLength(3);
    expect(result.data[0].referenceNo).toBe("GR-103");
    expect(result.data[1].referenceNo).toBe("GR-102");
    expect(result.data[2].referenceNo).toBe("GR-101");
  });

  it("should sort by receiptDate ASC when specified", async () => {
    const result = await goodReceiptServerService.getAll({
      sort: "receiptDate",
      order: "ASC",
    });

    expect(result.data).toHaveLength(3);
    expect(result.data[0].referenceNo).toBe("GR-101");
    expect(result.data[1].referenceNo).toBe("GR-102");
    expect(result.data[2].referenceNo).toBe("GR-103");
  });

  it("should sort by referenceNo ASC and DESC", async () => {
    const ascResult = await goodReceiptServerService.getAll({
      sort: "referenceNo",
      order: "ASC",
    });
    expect(ascResult.data[0].referenceNo).toBe("GR-101");
    expect(ascResult.data[2].referenceNo).toBe("GR-103");

    const descResult = await goodReceiptServerService.getAll({
      sort: "referenceNo",
      order: "DESC",
    });
    expect(descResult.data[0].referenceNo).toBe("GR-103");
    expect(descResult.data[2].referenceNo).toBe("GR-101");
  });

  it("should sort by supplier.name association ASC and DESC", async () => {
    const ascResult = await goodReceiptServerService.getAll({
      sort: "supplier.name",
      order: "ASC",
    });
    expect(ascResult.data[0].supplier?.name).toBe("Alpha Supplies");
    expect(ascResult.data[2].supplier?.name).toBe("Beta Logistics");

    const descResult = await goodReceiptServerService.getAll({
      sort: "supplier.name",
      order: "DESC",
    });
    expect(descResult.data[0].supplier?.name).toBe("Beta Logistics");
  });

  it("should sort by totalAmount ASC and DESC", async () => {
    const ascResult = await goodReceiptServerService.getAll({
      sort: "totalAmount",
      order: "ASC",
    });
    expect(Number(ascResult.data[0].totalAmount)).toBe(100.0);
    expect(Number(ascResult.data[2].totalAmount)).toBe(300.0);

    const descResult = await goodReceiptServerService.getAll({
      sort: "totalAmount",
      order: "DESC",
    });
    expect(Number(descResult.data[0].totalAmount)).toBe(300.0);
    expect(Number(descResult.data[2].totalAmount)).toBe(100.0);
  });

  it("should sort by status ASC and DESC", async () => {
    const ascResult = await goodReceiptServerService.getAll({
      sort: "status",
      order: "ASC",
    });
    expect(ascResult.data[0].status).toBe(ORDER_STATUS.COMPLETED);

    const descResult = await goodReceiptServerService.getAll({
      sort: "status",
      order: "DESC",
    });
    expect(descResult.data[0].status).toBe(ORDER_STATUS.RECEIVED);
  });
});
