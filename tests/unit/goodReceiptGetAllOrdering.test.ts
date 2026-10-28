import { describe, expect, it, vi, beforeEach } from "vitest";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { db } from "@/server/db/drizzle";

describe("goodReceiptServerService.getAll OrderBy (Unit)", () => {
  let capturedFindManyArgs: any = null;

  const dummyTbl = {
    id: "col_id",
    supplierId: "col_supplierId",
    status: "col_status",
    receiptDate: "col_receiptDate",
    referenceNo: "col_referenceNo",
    totalAmount: "col_totalAmount",
    createdAt: "col_createdAt",
    updatedAt: "col_updatedAt",
  };

  const dummyOps = {
    asc: (col: any) => ({ col, dir: "asc" }),
    desc: (col: any) => ({ col, dir: "desc" }),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    capturedFindManyArgs = null;

    vi.spyOn(db, "select").mockImplementation(
      () =>
        ({
          from: () => ({
            where: async () => [],
          }),
        }) as any,
    );

    (vi.spyOn(db.query.goodReceipts, "findMany") as any).mockImplementation(
      async (args: any) => {
        capturedFindManyArgs = args;
        return [];
      },
    );
  });

  it("should sort by receiptDate DESC and also orderBy updatedAt DESC by default", async () => {
    // Arrange & Act
    await goodReceiptServerService.getAll({});

    // Assert
    expect(capturedFindManyArgs).toBeDefined();
    expect(typeof capturedFindManyArgs.orderBy).toBe("function");

    const orderResult = capturedFindManyArgs.orderBy(dummyTbl, dummyOps);
    expect(orderResult).toEqual([
      { col: dummyTbl.receiptDate, dir: "desc" },
      { col: dummyTbl.updatedAt, dir: "desc" },
    ]);
  });

  it("should sort by requested column and also orderBy updatedAt DESC", async () => {
    // Arrange & Act
    await goodReceiptServerService.getAll({
      sort: "status",
      order: "ASC",
    });

    // Assert
    const orderResult = capturedFindManyArgs.orderBy(dummyTbl, dummyOps);
    expect(orderResult).toEqual([
      { col: dummyTbl.status, dir: "asc" },
      { col: dummyTbl.updatedAt, dir: "desc" },
    ]);
  });

  it("should sort by updatedAt without duplicate secondary sort when sort is updatedAt", async () => {
    // Arrange & Act
    await goodReceiptServerService.getAll({
      sort: "updatedAt",
      order: "ASC",
    });

    // Assert
    const orderResult = capturedFindManyArgs.orderBy(dummyTbl, dummyOps);
    expect(orderResult).toEqual([
      { col: dummyTbl.updatedAt, dir: "asc" },
    ]);
  });
});

