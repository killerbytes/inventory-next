import { describe, expect, it, vi, beforeEach } from "vitest";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { db } from "@/server/db/drizzle";

describe("goodReceiptServerService.getBySupplierId Pagination (Unit)", () => {
  let capturedFindManyArgs: any = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    capturedFindManyArgs = null;

    vi.spyOn(db, "select").mockImplementation(() => ({
      from: () => ({
        where: async () => [{ total: "25" }],
      }),
    }) as any);

    (vi.spyOn(db.query.goodReceipts, "findMany") as any).mockImplementation(
      async (args: any) => {
        capturedFindManyArgs = args;
        return [];
      },
    );

    vi.spyOn(db.query.returnTransactions, "findMany").mockResolvedValue([]);
  });

  it("should calculate offset from page and limit correctly", async () => {
    const result = await goodReceiptServerService.getBySupplierId(1, {
      page: 2,
      limit: 10,
    });

    expect(capturedFindManyArgs.limit).toBe(10);
    expect(capturedFindManyArgs.offset).toBe(10);
    expect(result.pagination).toEqual({
      total: 25,
      totalPages: 3,
      currentPage: 2,
    });
  });

  it("should resolve page and keep offset when only offset and limit are provided", async () => {
    const result = await goodReceiptServerService.getBySupplierId(1, {
      offset: 20,
      limit: 10,
    });

    expect(capturedFindManyArgs.limit).toBe(10);
    expect(capturedFindManyArgs.offset).toBe(20);
    expect(result.pagination).toEqual({
      total: 25,
      totalPages: 3,
      currentPage: 3,
    });
  });

  it("should default to page 1 and offset 0 when params are empty", async () => {
    const result = await goodReceiptServerService.getBySupplierId(1, {});

    expect(capturedFindManyArgs.limit).toBe(25);
    expect(capturedFindManyArgs.offset).toBe(0);
    expect(result.pagination).toEqual({
      total: 25,
      totalPages: 1,
      currentPage: 1,
    });
  });
});
